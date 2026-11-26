import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword, performDummyVerification } from '../utils/password.js';
import {
  hashToken,
  generateRandomToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountLockoutEmail,
} from './email.service.js';
import { logger } from '../config/logger.js';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Register new customer
 */
export async function registerCustomer({ email, password, name, phone }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    // If account was soft-deleted or exists, reject generic or existing
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    error.errorCode = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const passwordHash = await hashPassword(password);

  // Transaction: Create user, email token, empty cart, empty wishlist
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        role: 'CUSTOMER',
        isEmailVerified: false,
        cart: { create: {} },
        wishlist: { create: {} },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      }
    });

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await tx.emailVerificationToken.create({
      data: {
        tokenHash,
        userId: newUser.id,
        expiresAt,
      }
    });

    return { newUser, rawToken };
  });

  // Dispatch verification email in background
  sendVerificationEmail(user.newUser.email, user.rawToken, user.newUser.name).catch(err => {
    logger.error({ err, userId: user.newUser.id }, 'Background email send failed');
  });

  return user.newUser;
}

/**
 * Login user with rate limiting and progressive lockout protection
 */
export async function authenticateUser({ email, password, totpCode, backupCode, ipAddress, userAgent }) {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Auto-seed admin user if configured in env and does not exist in DB yet
  if (!user && env.ADMIN_EMAIL && normalizedEmail === env.ADMIN_EMAIL.trim().toLowerCase()) {
    const initialAdminHash = await hashPassword(env.ADMIN_PASSWORD || password);
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: initialAdminHash,
        name: 'Store Owner',
        role: 'ADMIN',
        isEmailVerified: true,
        cart: { create: {} },
        wishlist: { create: {} },
      },
    });
  }

  // Timing attack defense: if user not found, perform dummy hash verification
  if (!user || user.isDeleted) {
    await performDummyVerification(password);
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.errorCode = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Check account suspension
  if (user.isBlocked) {
    const error = new Error('Account suspended. Please contact customer support.');
    error.statusCode = 403;
    error.errorCode = 'ACCOUNT_SUSPENDED';
    throw error;
  }

  // Check customer lockout (only for CUSTOMER role; ADMIN uses progressive delay)
  const now = new Date();
  if (user.role !== 'ADMIN' && user.lockUntil && user.lockUntil > now) {
    const remainingMinutes = Math.ceil((user.lockUntil.getTime() - now.getTime()) / (60 * 1000));
    const error = new Error(`Account temporarily locked due to excessive failed attempts. Try again in ${remainingMinutes} minute(s).`);
    error.statusCode = 429;
    error.errorCode = 'ACCOUNT_LOCKED';
    throw error;
  }

  // Verify password: bring up hashed password and compare
  let isValidPassword = false;
  if (user.role === 'ADMIN') {
    const hashedPassword = user.passwordHash;
    isValidPassword = await verifyPassword(hashedPassword, password);

    // If database hash didn't match but password matches env.ADMIN_PASSWORD, synchronize hash
    if (!isValidPassword && env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD) {
      const synchronizedHash = await hashPassword(env.ADMIN_PASSWORD);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: synchronizedHash },
      });
      isValidPassword = true;
    }
  } else {
    isValidPassword = await verifyPassword(user.passwordHash, password);
  }

  if (!isValidPassword) {
    const attempts = user.failedLoginAttempts + 1;

    if (user.role === 'ADMIN') {
      // ADMIN: Progressive artificial delay + email alert, NO hard lockout so owner is never locked out
      const delayMs = Math.min(attempts * 1000, 5000);
      await new Promise(r => setTimeout(r, delayMs));

      if (attempts >= 3) {
        sendAccountLockoutEmail(user.email).catch(() => {});
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts },
      });

      // Audit log failed admin attempt
      await prisma.auditLog.create({
        data: {
          adminId: user.id,
          action: 'ADMIN_LOGIN_FAILURE',
          targetType: 'User',
          targetId: user.id,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          details: { failedAttempts: attempts },
        },
      }).catch(() => {});
    } else {
      // CUSTOMER: Standard progressive lockout after 5 attempts
      let lockUntil = null;
      if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        // Only send lockout email on the exact threshold attempt to avoid email spamming
        if (attempts === MAX_FAILED_LOGIN_ATTEMPTS) {
          sendAccountLockoutEmail(user.email).catch(() => {});
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockUntil,
        },
      });
    }

    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.errorCode = 'INVALID_CREDENTIALS';
    error.failedAttempts = attempts;
    error.captchaRequired = attempts >= 3;
    throw error;
  }

  // Enforce email verification before allowing customer login
  if (user.role !== 'ADMIN' && !user.isEmailVerified) {
    const error = new Error('Please verify your email address before signing in. Check your inbox for the activation link.');
    error.statusCode = 403;
    error.errorCode = 'EMAIL_NOT_VERIFIED';
    throw error;
  }

  // Handle Admin 2FA Verification
  if (user.role === 'ADMIN') {
    if (!user.twoFactorEnabled && (env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production')) {
      // Issue a limited enrollment-only session (10m expiry) that can only access 2FA setup & enable
      const enrollmentToken = signAccessToken(
        { sub: user.id, email: user.email, role: 'ADMIN', scope: '2FA_ENROLLMENT_ONLY' },
        '10m'
      );
      return {
        twoFactorEnrollmentRequired: true,
        enrollmentToken,
        token: enrollmentToken,
        expiresIn: 600,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }

    if (user.twoFactorEnabled) {
      const { verify2FACode, verifyAndConsumeBackupCode } = await import('./twoFactor.service.js');

      if (!totpCode && !backupCode) {
        return {
          twoFactorRequired: true,
          user: {
            id: user.id,
            email: user.email,
          },
        };
      }

      let is2FAValid = false;
      let authMethod = 'TOTP';

      if (totpCode) {
        is2FAValid = verify2FACode(user.twoFactorSecret, totpCode);
      } else if (backupCode) {
        is2FAValid = await verifyAndConsumeBackupCode(user.id, backupCode);
        authMethod = 'BACKUP_CODE';
      }

      if (!is2FAValid) {
        await prisma.auditLog.create({
          data: {
            adminId: user.id,
            action: 'ADMIN_2FA_FAILURE',
            targetType: 'User',
            targetId: user.id,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            details: { method: authMethod },
          },
        }).catch(() => {});

        const error = new Error('Invalid 2FA verification code.');
        error.statusCode = 401;
        error.errorCode = 'INVALID_2FA_CODE';
        throw error;
      }

      await prisma.auditLog.create({
        data: {
          adminId: user.id,
          action: 'ADMIN_2FA_SUCCESS',
          targetType: 'User',
          targetId: user.id,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          details: { method: authMethod },
        },
      }).catch(() => {});
    }
  }

  // Audit log successful admin login
  if (user.role === 'ADMIN') {
    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: 'ADMIN_LOGIN_SUCCESS',
        targetType: 'User',
        targetId: user.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    }).catch(() => {});
  }

  // Password is valid - reset failed attempts
  if (user.failedLoginAttempts > 0 || user.lockUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });
  }

  // Generate tokens
  const tokenFamily = crypto.randomUUID();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshTokenString = signRefreshToken({
    sub: user.id,
    family: tokenFamily,
  });

  const tokenHash = hashToken(refreshTokenString);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      family: tokenFamily,
      expiresAt,
    }
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
    accessToken,
    refreshTokenString,
  };
}

/**
 * Rotate Refresh Token with Token Family Reuse Detection
 */
export async function rotateRefreshToken(tokenString) {
  if (!tokenString) {
    const error = new Error('Refresh token missing.');
    error.statusCode = 401;
    error.errorCode = 'TOKEN_MISSING';
    throw error;
  }

  const payload = verifyRefreshToken(tokenString);
  if (!payload || !payload.sub || !payload.family) {
    const error = new Error('Invalid or expired refresh token.');
    error.statusCode = 401;
    error.errorCode = 'TOKEN_INVALID';
    throw error;
  }

  const incomingHash = hashToken(tokenString);

  // Look up stored token
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: incomingHash },
    include: { user: true },
  });

  // REUSE DETECTION:
  // If the token was not found or is marked revoked, another party may have stolen the token!
  // Invalidate the entire token family immediately.
  if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
    logger.warn({ family: payload.family, userId: payload.sub }, 'CRITICAL_SECURITY: Refresh token reuse detected! Invalidating entire family.');
    await prisma.refreshToken.updateMany({
      where: { family: payload.family },
      data: { isRevoked: true },
    });
    const error = new Error('Security violation: Refresh token reuse detected. Please log in again.');
    error.statusCode = 401;
    error.errorCode = 'TOKEN_REUSE_DETECTED';
    throw error;
  }

  if (storedToken.user.isBlocked || storedToken.user.isDeleted) {
    const error = new Error('Account inactive or deleted.');
    error.statusCode = 401;
    error.errorCode = 'ACCOUNT_INACTIVE';
    throw error;
  }

  // Revoke the old token (single-use)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  // Issue new pair in the same token family
  const newAccessToken = signAccessToken({
    sub: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role,
  });

  const newRefreshTokenString = signRefreshToken({
    sub: storedToken.user.id,
    family: storedToken.family,
  });

  const newHash = hashToken(newRefreshTokenString);
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash: newHash,
      userId: storedToken.user.id,
      family: storedToken.family,
      expiresAt: newExpiresAt,
    }
  });

  return {
    accessToken: newAccessToken,
    refreshTokenString: newRefreshTokenString,
    user: {
      id: storedToken.user.id,
      email: storedToken.user.email,
      name: storedToken.user.name,
      role: storedToken.user.role,
      isEmailVerified: storedToken.user.isEmailVerified,
    }
  };
}

/**
 * Logout user by revoking refresh token
 */
export async function logoutUser(tokenString) {
  if (!tokenString) return;
  const tokenHash = hashToken(tokenString);
  try {
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (record) {
      await prisma.refreshToken.updateMany({
        where: { family: record.family },
        data: { isRevoked: true },
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error during logout token revocation');
  }
}

/**
 * Verify Email with signed single-use token
 */
export async function verifyEmailToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    const error = new Error('Invalid or expired verification link.');
    error.statusCode = 400;
    error.errorCode = 'INVALID_VERIFICATION_TOKEN';
    throw error;
  }

  if (record.isUsed) {
    if (record.user?.isEmailVerified) {
      return { email: record.user.email, alreadyVerified: true };
    }
    const error = new Error('Invalid or expired verification link.');
    error.statusCode = 400;
    error.errorCode = 'INVALID_VERIFICATION_TOKEN';
    throw error;
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { isUsed: true },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    }),
  ]);

  return { email: record.user.email };
}

/**
 * Request Password Reset
 */
export async function requestPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Always return generic success to prevent email enumeration
  if (!user || user.isDeleted || user.isBlocked) {
    return { success: true };
  }

  // Invalidate any older unused reset tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, isUsed: false },
    data: { isUsed: true },
  });

  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    }
  });

  sendPasswordResetEmail(user.email, rawToken).catch(err => {
    logger.error({ err, userId: user.id }, 'Password reset email failed');
  });

  return { success: true };
}

/**
 * Reset password using token
 */
export async function executePasswordReset(rawToken, newPassword) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.isUsed || record.expiresAt < new Date()) {
    const error = new Error('Invalid or expired password reset link.');
    error.statusCode = 400;
    error.errorCode = 'INVALID_RESET_TOKEN';
    throw error;
  }

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { isUsed: true },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: newHash,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    }),
    // Invalidate all active sessions
    prisma.refreshToken.updateMany({
      where: { userId: record.userId },
      data: { isRevoked: true },
    }),
  ]);

  return { success: true };
}

/**
 * Change password for authenticated user
 */
export async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const isValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isValid) {
    const error = new Error('Current password does not match.');
    error.statusCode = 400;
    error.errorCode = 'INVALID_CURRENT_PASSWORD';
    throw error;
  }

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    }),
    prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    }),
  ]);

  return { success: true };
}

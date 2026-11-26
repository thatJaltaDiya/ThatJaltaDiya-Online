import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { hashToken } from '../utils/tokens.js';

/**
 * Generate a new TOTP 2FA Secret, QR code, and single-use backup codes
 */
export async function generate2FASetup(userEmail) {
  const secret = generateSecret();
  const appName = env.ADMIN_2FA_APP_NAME || 'That Jalta Diya';
  const otpAuthUrl = generateURI({
    label: userEmail,
    issuer: appName,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

  // Generate 8 random backup codes (format: XXXX-XXXX)
  const plainBackupCodes = [];
  const hashedBackupCodes = [];

  for (let i = 0; i < 8; i++) {
    const code = `${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    plainBackupCodes.push(code);
    hashedBackupCodes.push(hashToken(code));
  }

  return {
    secret,
    otpAuthUrl,
    qrCodeDataUrl,
    plainBackupCodes,
    hashedBackupCodes,
  };
}

/**
 * Generate enrollment helper for tests and admin flows
 */
export async function generateTwoFactorEnrollment(userId, userEmail) {
  const setup = await generate2FASetup(userEmail);
  return {
    secret: setup.secret,
    otpauthUrl: setup.otpAuthUrl,
    qrCodeDataUrl: setup.qrCodeDataUrl,
    backupCodes: setup.plainBackupCodes,
  };
}

/**
 * Generate a 6-digit TOTP code for testing/mock purposes
 */
export function generateTotpCode(secret) {
  return generateSync({ secret });
}

/**
 * Verify a 6-digit TOTP code against a secret
 */
export function verify2FACode(secret, token) {
  if (!secret || !token) return false;
  try {
    const result = verifySync({
      token: String(token).trim(),
      secret,
      tolerance: 1, // allow 1 step (30s) drift
    });
    return result && result.valid === true;
  } catch {
    return false;
  }
}

/**
 * Confirm 2FA enrollment for an admin user
 */
export async function confirmTwoFactorEnrollment(userId, secret, token, backupCodes) {
  const isValid = verify2FACode(secret, token);
  if (!isValid) return false;

  const hashedCodes = (backupCodes || []).map(code => hashToken(String(code).trim().toUpperCase()));

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorBackupCodes: hashedCodes,
    },
  });

  return true;
}

/**
 * Verify admin 2FA input (either TOTP code or single-use backup code)
 */
export async function verifyAdmin2FA(userId, code) {
  if (!userId || !code) return { valid: false };

  const cleanCode = String(code).trim();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, twoFactorSecret: true, twoFactorBackupCodes: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled) return { valid: false };

  // 1. Try TOTP if code is 6 digits
  if (/^\d{6}$/.test(cleanCode)) {
    if (user.twoFactorSecret && verify2FACode(user.twoFactorSecret, cleanCode)) {
      return { valid: true, isBackupCode: false };
    }
  }

  // 2. Try single-use backup code
  const codeHash = hashToken(cleanCode.toUpperCase());
  if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.includes(codeHash)) {
    const updatedCodes = user.twoFactorBackupCodes.filter(c => c !== codeHash);
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: updatedCodes },
    });
    return { valid: true, isBackupCode: true };
  }

  return { valid: false };
}

/**
 * Verify and consume a single-use backup code
 */
export async function verifyAndConsumeBackupCode(userId, submittedCode) {
  const cleanCode = String(submittedCode).trim().toUpperCase();
  const codeHash = hashToken(cleanCode);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, twoFactorBackupCodes: true },
  });

  if (!user || !user.twoFactorBackupCodes || user.twoFactorBackupCodes.length === 0) {
    return false;
  }

  const codeIndex = user.twoFactorBackupCodes.indexOf(codeHash);
  if (codeIndex === -1) {
    return false;
  }

  // Remove used backup code from array (single-use guarantee)
  const updatedCodes = [...user.twoFactorBackupCodes];
  updatedCodes.splice(codeIndex, 1);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorBackupCodes: updatedCodes },
  });

  return true;
}

/**
 * Calculate progressive delay in milliseconds based on failed login attempts
 * Replaces hard lockout for admin with progressive delay:
 * 0 attempts = 0ms
 * 1 attempt = 1000ms
 * 2 attempts = 2000ms
 * 3 attempts = 4000ms
 * 4 attempts = 8000ms
 * 5+ attempts = 16000ms (capped)
 */
export function calculateProgressiveDelay(failedAttempts) {
  if (!failedAttempts || failedAttempts <= 0) return 0;
  const delayMs = Math.min(1000 * Math.pow(2, failedAttempts - 1), 16000);
  return delayMs;
}

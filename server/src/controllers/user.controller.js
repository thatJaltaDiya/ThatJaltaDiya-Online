import { prisma } from '../config/prisma.js';
import { apiSuccess, apiError } from '../utils/response.js';
import * as authService from '../services/auth.service.js';
import * as otpService from '../services/otp.service.js';

export async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        addresses: {
          orderBy: { createdAt: 'desc' },
        },
      }
    });

    return apiSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name.trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isEmailVerified: true,
      }
    });

    return apiSuccess(res, { user: updated }, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
}

export async function changePhoneWithOtp(req, res, next) {
  try {
    const { phone, otpCode } = req.body;
    // Verify OTP first
    const verification = await otpService.verifyOtp({
      identifier: phone,
      purpose: 'PHONE_VERIFY',
      code: otpCode,
    });

    if (!verification.valid) {
      return apiError(res, 'Invalid or expired phone verification code.', 400, 'INVALID_OTP');
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        phone: phone.trim(),
        isPhoneVerified: true,
      },
      select: {
        id: true,
        phone: true,
        isPhoneVerified: true,
      }
    });

    return apiSuccess(res, updated, 'Phone number updated and verified.');
  } catch (error) {
    next(error);
  }
}

export async function changeEmailWithOtp(req, res, next) {
  try {
    const { newEmail, otpCode } = req.body;
    const normalizedEmail = newEmail.trim().toLowerCase();

    // Verify existing email doesn't collide
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing && existing.id !== req.user.id) {
      return apiError(res, 'An account with this email address already exists.', 409, 'EMAIL_COLLISION');
    }

    const verification = await otpService.verifyOtp({
      identifier: normalizedEmail,
      purpose: 'EMAIL_CHANGE',
      code: otpCode,
    });

    if (!verification.valid) {
      return apiError(res, 'Invalid or expired email verification code.', 400, 'INVALID_OTP');
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        email: normalizedEmail,
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      }
    });

    return apiSuccess(res, updated, 'Email address updated and verified.');
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changeUserPassword(req.user.id, currentPassword, newPassword);
    return apiSuccess(res, null, 'Password updated successfully. Other active sessions have been invalidated.');
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    // Soft delete
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isDeleted: true,
        email: `deleted_${Date.now()}_${req.user.email}`,
      }
    });

    // Invalidate refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id },
      data: { isRevoked: true },
    });

    return apiSuccess(res, null, 'Account has been deleted.');
  } catch (error) {
    next(error);
  }
}

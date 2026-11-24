import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { hashToken } from '../utils/tokens.js';
import { logger } from '../config/logger.js';
import { sendEmail } from './email.service.js';

const OTP_EXPIRY_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;

/**
 * Generate 6-digit numeric OTP code
 */
function generate6DigitOtp() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Request OTP generation and send via stub / email
 */
export async function requestOtp({ identifier, purpose, ipAddress }) {
  const normalizedId = identifier.trim().toLowerCase();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  // Check hourly rate limit
  const recentCount = await prisma.otpRequest.count({
    where: {
      identifier: normalizedId,
      purpose,
      createdAt: { gte: oneHourAgo },
    }
  });

  if (recentCount >= MAX_SENDS_PER_HOUR) {
    throw new Error('OTP_RATE_LIMIT_EXCEEDED');
  }

  // Check 60-second cooldown
  const lastRequest = await prisma.otpRequest.findFirst({
    where: {
      identifier: normalizedId,
      purpose,
      createdAt: { gte: oneMinuteAgo },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (lastRequest) {
    throw new Error('OTP_COOLDOWN_ACTIVE');
  }

  const rawOtp = generate6DigitOtp();
  const codeHash = hashToken(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpRequest.create({
    data: {
      identifier: normalizedId,
      purpose,
      codeHash,
      expiresAt,
      ipAddress,
    }
  });

  // Pluggable dispatch: if identifier looks like email, send email; if phone, log/SMS adapter
  if (normalizedId.includes('@')) {
    await sendEmail({
      to: normalizedId,
      subject: `Your Verification Code: ${rawOtp} - That Jalta Diya`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; border: 1px solid #2D0C1E; border-radius: 12px; background: #FFFBF5;">
          <h3>Verification Code</h3>
          <p>Your one-time verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 6px; color: #FF3366;">${rawOtp}</h1>
          <p>This code expires in 5 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });
  } else {
    // Phone SMS adapter stub (logs to console in development)
    logger.info({ phone: normalizedId, otp: rawOtp, purpose }, 'SMS_OTP_DISPATCH_STUB: 6-digit code delivered');
  }

  return { success: true, expiresInSeconds: OTP_EXPIRY_MINUTES * 60 };
}

/**
 * Verify submitted OTP code
 */
export async function verifyOtp({ identifier, purpose, code }) {
  const normalizedId = identifier.trim().toLowerCase();
  const inputHash = hashToken(String(code).trim());

  const record = await prisma.otpRequest.findFirst({
    where: {
      identifier: normalizedId,
      purpose,
      isVerified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return { valid: false, error: 'EXPIRED_OR_NOT_FOUND' };
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { valid: false, error: 'MAX_ATTEMPTS_EXCEEDED' };
  }

  if (record.codeHash !== inputHash) {
    await prisma.otpRequest.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false, error: 'INVALID_CODE', remainingAttempts: MAX_VERIFY_ATTEMPTS - (record.attempts + 1) };
  }

  // Mark verified
  await prisma.otpRequest.update({
    where: { id: record.id },
    data: { isVerified: true },
  });

  return { valid: true };
}

import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import {
  registerLimiter,
  loginLimiter,
  loginIpLimiter,
  loginAccountLimiter,
  passwordResetLimiter,
  otpSendLimiter,
  otpSendIpLimiter,
} from '../middleware/rateLimiter.js';
import { requireTurnstile, verifyTurnstileToken } from '../middleware/turnstile.js';
import { csrfProtection } from '../middleware/csrf.js';
import { getClientIp } from '../utils/ip.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { apiError } from '../utils/response.js';
import * as v from '../validators/auth.validators.js';

const router = Router();

/**
 * Middleware: Enforces Turnstile on login if user is ADMIN or has >= 3 failed attempts
 */
const loginTurnstileGuard = async (req, res, next) => {
  // In non-production environments with ALLOW_TEST_CAPTCHA enabled, bypass for offline/local development
  if (env.NODE_ENV !== 'production' && env.ALLOW_TEST_CAPTCHA) {
    return next();
  }

  const email = (req.body?.email || '').trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always require Turnstile for ADMIN role or if account has >= 3 failed attempts
  const isTurnstileRequired = user && (user.role === 'ADMIN' || user.failedLoginAttempts >= 3);

  if (isTurnstileRequired) {
    const token =
      req.body?.turnstileToken ||
      req.headers['cf-turnstile-response'] ||
      req.headers['x-turnstile-token'];

    if (!token) {
      return apiError(
        res,
        'Security verification required. Please complete the CAPTCHA.',
        400,
        'CAPTCHA_REQUIRED'
      );
    }

    const clientIp = getClientIp(req);
    const valid = await verifyTurnstileToken(token, clientIp);
    if (!valid) {
      return apiError(
        res,
        'Security verification failed. Please try again.',
        403,
        'CAPTCHA_FAILED'
      );
    }
  }

  next();
};

// Registration: requireTurnstile + registerLimiter
router.post(
  '/register',
  registerLimiter,
  validate({ body: v.registerSchema }),
  requireTurnstile('turnstileToken'),
  authController.register
);

// Login: multi-tier limiters (IP aggregate, account independent, IP+account) + conditional Turnstile guard
router.post(
  '/login',
  loginIpLimiter,
  loginAccountLimiter,
  loginLimiter,
  validate({ body: v.loginSchema }),
  loginTurnstileGuard,
  authController.login
);

// Token Refresh (Cookie based with CSRF check)
router.post(
  '/refresh',
  csrfProtection,
  authController.refresh
);

// Logout
router.post(
  '/logout',
  csrfProtection,
  authController.logout
);

// Email Verification
router.post(
  '/verify-email',
  validate({ body: v.verifyEmailSchema }),
  authController.verifyEmail
);

// Password Reset Request
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate({ body: v.forgotPasswordSchema }),
  requireTurnstile('turnstileToken'),
  authController.forgotPassword
);

// Password Reset Confirmation
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate({ body: v.resetPasswordSchema }),
  requireTurnstile('turnstileToken'),
  authController.resetPassword
);

// OTP Request (IP throttling + account throttling + Turnstile)
router.post(
  '/otp/send',
  otpSendIpLimiter,
  otpSendLimiter,
  validate({ body: v.sendOtpSchema }),
  requireTurnstile('turnstileToken'),
  authController.sendOtp
);

// OTP Verification
router.post(
  '/otp/verify',
  validate({ body: v.verifyOtpSchema }),
  authController.verifyOtp
);

export default router;

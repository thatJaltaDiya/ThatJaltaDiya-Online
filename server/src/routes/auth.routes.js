import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, otpSendLimiter } from '../middleware/rateLimiter.js';
import { requireTurnstile } from '../middleware/turnstile.js';
import { csrfProtection } from '../middleware/csrf.js';
import * as v from '../validators/auth.validators.js';

const router = Router();

// Registration
router.post(
  '/register',
  authLimiter,
  validate({ body: v.registerSchema }),
  requireTurnstile('turnstileToken'),
  authController.register
);

// Login (Strict rate limiting + progressive lockout)
router.post(
  '/login',
  authLimiter,
  validate({ body: v.loginSchema }),
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
  authLimiter,
  validate({ body: v.forgotPasswordSchema }),
  requireTurnstile('turnstileToken'),
  authController.forgotPassword
);

// Password Reset Confirmation
router.post(
  '/reset-password',
  authLimiter,
  validate({ body: v.resetPasswordSchema }),
  authController.resetPassword
);

// OTP Request (phone/email throttling)
router.post(
  '/otp/send',
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

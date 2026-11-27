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
import { csrfProtection } from '../middleware/csrf.js';
import * as v from '../validators/auth.validators.js';

const router = Router();

// Registration: registerLimiter
router.post(
  '/register',
  registerLimiter,
  validate({ body: v.registerSchema }),
  authController.register
);

// Login: multi-tier limiters (IP aggregate, account independent, IP+account)
router.post(
  '/login',
  loginIpLimiter,
  loginAccountLimiter,
  loginLimiter,
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
  passwordResetLimiter,
  validate({ body: v.forgotPasswordSchema }),
  authController.forgotPassword
);

// Password Reset Confirmation
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate({ body: v.resetPasswordSchema }),
  authController.resetPassword
);

// OTP Request (IP throttling + account throttling)
router.post(
  '/otp/send',
  otpSendIpLimiter,
  otpSendLimiter,
  validate({ body: v.sendOtpSchema }),
  authController.sendOtp
);

// OTP Verification
router.post(
  '/otp/verify',
  validate({ body: v.verifyOtpSchema }),
  authController.verifyOtp
);

export default router;

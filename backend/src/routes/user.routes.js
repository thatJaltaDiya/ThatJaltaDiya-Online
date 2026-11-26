import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import * as v from '../validators/user.validators.js';

const router = Router();

// Profile operations
router.get('/profile', requireAuth, userController.getProfile);

router.patch(
  '/profile',
  requireAuth,
  writeLimiter,
  validate({ body: v.updateProfileSchema }),
  userController.updateProfile
);

router.post(
  '/change-email',
  requireAuth,
  writeLimiter,
  validate({ body: v.changeEmailSchema }),
  userController.changeEmailWithOtp
);

router.post(
  '/change-password',
  requireAuth,
  writeLimiter,
  validate({ body: v.changePasswordUserSchema }),
  userController.changePassword
);

router.delete(
  '/account',
  requireAuth,
  writeLimiter,
  userController.deleteAccount
);

export default router;

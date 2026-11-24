import { Router } from 'express';
import * as contactController from '../controllers/contact.controller.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { requireTurnstile } from '../middleware/turnstile.js';
import * as v from '../validators/commerce.validators.js';

const router = Router();

router.post(
  '/',
  writeLimiter,
  validate({ body: v.contactMessageSchema }),
  requireTurnstile('turnstileToken'),
  contactController.submit
);

export default router;

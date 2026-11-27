import { Router } from 'express';
import * as contactController from '../controllers/contact.controller.js';
import { validate } from '../middleware/validate.js';
import { contactLimiter } from '../middleware/rateLimiter.js';
import * as v from '../validators/commerce.validators.js';

const router = Router();

router.post(
  '/',
  contactLimiter,
  validate({ body: v.contactMessageSchema }),
  contactController.submit
);

export default router;

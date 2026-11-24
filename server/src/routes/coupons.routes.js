import { Router } from 'express';
import * as couponsController from '../controllers/coupons.controller.js';
import { validate } from '../middleware/validate.js';
import * as v from '../validators/commerce.validators.js';

const router = Router();

router.post('/validate', validate({ body: v.validateCouponSchema }), couponsController.validate);

export default router;

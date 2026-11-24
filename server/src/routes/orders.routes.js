import { Router } from 'express';
import * as ordersController from '../controllers/orders.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import * as v from '../validators/commerce.validators.js';

const router = Router();

router.use(requireAuth);

router.post('/', writeLimiter, validate({ body: v.createOrderSchema }), ordersController.createOrder);
router.get('/', ordersController.listOrders);
router.get('/:orderId', ordersController.getOrder);
router.post('/:orderId/cancel', writeLimiter, ordersController.cancelOrder);

export default router;

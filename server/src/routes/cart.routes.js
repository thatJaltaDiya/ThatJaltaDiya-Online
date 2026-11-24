import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as v from '../validators/commerce.validators.js';

const router = Router();

router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, validate({ body: v.addToCartSchema }), cartController.addToCart);
router.patch('/items/:cartItemId', optionalAuth, validate({ body: v.updateCartItemSchema }), cartController.updateCartItem);
router.delete('/items/:cartItemId', optionalAuth, cartController.removeFromCart);
router.post('/merge', requireAuth, cartController.mergeGuestCart);

export default router;

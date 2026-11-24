import * as cartService from '../services/cart.service.js';
import { apiSuccess } from '../utils/response.js';

export async function getCart(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const guestId = req.query.guestId || null;
    const cart = await cartService.getOrCreateCart({ userId, guestId });
    return apiSuccess(res, cart);
  } catch (error) {
    next(error);
  }
}

export async function addToCart(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const { productId, variantId, quantity, guestId } = req.body;
    const cart = await cartService.addToCart({
      userId,
      guestId,
      productId,
      variantId,
      quantity,
    });
    return apiSuccess(res, cart, 'Item added to cart.');
  } catch (error) {
    next(error);
  }
}

export async function updateCartItem(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const { cartItemId } = req.params;
    const { quantity, guestId } = req.body;
    const cart = await cartService.updateCartItem({
      userId,
      guestId,
      cartItemId,
      quantity,
    });
    return apiSuccess(res, cart, 'Cart updated.');
  } catch (error) {
    next(error);
  }
}

export async function removeFromCart(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const { cartItemId } = req.params;
    const guestId = req.query.guestId || null;
    const cart = await cartService.removeFromCart({
      userId,
      guestId,
      cartItemId,
    });
    return apiSuccess(res, cart, 'Item removed from cart.');
  } catch (error) {
    next(error);
  }
}

export async function mergeGuestCart(req, res, next) {
  try {
    const userId = req.user.id;
    const { guestId } = req.body;
    await cartService.mergeGuestCart(userId, guestId);
    const cart = await cartService.getOrCreateCart({ userId });
    return apiSuccess(res, cart, 'Guest cart merged.');
  } catch (error) {
    next(error);
  }
}

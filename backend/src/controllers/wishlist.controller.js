import * as wishlistService from '../services/wishlist.service.js';
import { apiSuccess } from '../utils/response.js';

export async function getWishlist(req, res, next) {
  try {
    const items = await wishlistService.getWishlist(req.user.id);
    return apiSuccess(res, items);
  } catch (error) {
    next(error);
  }
}

export async function toggleWishlist(req, res, next) {
  try {
    const { productId } = req.params;
    const result = await wishlistService.toggleWishlist(req.user.id, productId);
    return apiSuccess(res, result, result.isWishlisted ? 'Added to wishlist' : 'Removed from wishlist');
  } catch (error) {
    next(error);
  }
}

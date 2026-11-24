import * as couponService from '../services/coupon.service.js';
import { apiSuccess } from '../utils/response.js';

export async function validate(req, res, next) {
  try {
    const { code, subtotal } = req.body;
    const result = await couponService.validateCoupon(code, subtotal);
    return apiSuccess(res, {
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
      discountAmount: result.discountPaise,
    }, 'Coupon applied successfully!');
  } catch (error) {
    next(error);
  }
}

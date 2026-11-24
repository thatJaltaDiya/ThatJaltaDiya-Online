import { prisma } from '../config/prisma.js';

export async function validateCoupon(code, subtotalPaise) {
  if (!code) return null;

  const normalizedCode = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon || !coupon.isActive) {
    const error = new Error('Invalid or inactive coupon code.');
    error.statusCode = 400;
    error.errorCode = 'INVALID_COUPON';
    throw error;
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    const error = new Error('This coupon is not active yet.');
    error.statusCode = 400;
    error.errorCode = 'COUPON_NOT_STARTED';
    throw error;
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    const error = new Error('This coupon has expired.');
    error.statusCode = 400;
    error.errorCode = 'COUPON_EXPIRED';
    throw error;
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    const error = new Error('Coupon usage limit reached.');
    error.statusCode = 400;
    error.errorCode = 'COUPON_LIMIT_REACHED';
    throw error;
  }

  if (subtotalPaise < coupon.minOrderValue) {
    const minAmount = (coupon.minOrderValue / 100).toFixed(2);
    const error = new Error(`Order minimum of ₹${minAmount} required to use coupon ${normalizedCode}.`);
    error.statusCode = 400;
    error.errorCode = 'COUPON_MIN_ORDER_NOT_MET';
    throw error;
  }

  // Calculate discount amount in paise
  let discountPaise = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discountPaise = Math.round((subtotalPaise * coupon.discountValue) / 100);
    if (coupon.maxDiscount && discountPaise > coupon.maxDiscount) {
      discountPaise = coupon.maxDiscount;
    }
  } else {
    // FLAT discount
    discountPaise = Math.min(coupon.discountValue, subtotalPaise);
  }

  return {
    coupon,
    discountPaise,
  };
}

export async function listCoupons() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createCoupon(data) {
  return prisma.coupon.create({
    data: {
      ...data,
      code: data.code.trim().toUpperCase(),
    },
  });
}

export async function updateCoupon(id, data) {
  return prisma.coupon.update({
    where: { id },
    data: {
      ...data,
      code: data.code ? data.code.trim().toUpperCase() : undefined,
    },
  });
}

export async function deleteCoupon(id) {
  return prisma.coupon.delete({ where: { id } });
}

import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { validateCoupon } from './coupon.service.js';
import { getSiteSettings } from './siteSetting.service.js';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from './email.service.js';
import { logger } from '../config/logger.js';

/**
 * Generate human-readable order number, e.g. TJD-202611-8492
 */
function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const randomSuffix = crypto.randomInt(1000, 9999);
  return `TJD-${dateStr}-${randomSuffix}`;
}

/**
 * Place Order with:
 * - Idempotency key replay protection
 * - Server-side recalculation of prices, stock, and coupon
 * - Atomic stock decrements in a Prisma transaction preventing overselling
 * - Product snapshotting
 * - Mandatory email verification check
 */
export async function createOrder({
  user,
  idempotencyKey,
  shippingAddressId,
  shippingAddressSnapshot = null,
  couponCode = null,
  notes = null,
  giftMessage = null,
  paymentMethod = 'TEST',
  ipAddress = null,
  userAgent = null,
}) {
  // 1. Mandatory Email Verification requirement
  if (!user.isEmailVerified) {
    const error = new Error('Please verify your email address before placing an order.');
    error.statusCode = 403;
    error.errorCode = 'EMAIL_NOT_VERIFIED';
    throw error;
  }

  // 2. Idempotency Key check: Replay protection
  if (!idempotencyKey) {
    const error = new Error('Idempotency-Key header is required.');
    error.statusCode = 400;
    error.errorCode = 'IDEMPOTENCY_KEY_REQUIRED';
    throw error;
  }

  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey },
    include: { items: true },
  });

  if (existingOrder) {
    logger.info({ orderNumber: existingOrder.orderNumber, idempotencyKey }, 'Idempotent order replay detected, returning existing order.');
    return existingOrder;
  }

  // 3. Resolve shipping address
  let addressToStore = shippingAddressSnapshot;
  if (!addressToStore && shippingAddressId) {
    const userAddr = await prisma.address.findFirst({
      where: { id: shippingAddressId, userId: user.id },
    });
    if (!userAddr) {
      const error = new Error('Shipping address not found.');
      error.statusCode = 404;
      throw error;
    }
    addressToStore = {
      recipientName: userAddr.recipientName,
      phone: userAddr.phone,
      street: userAddr.street,
      apartment: userAddr.apartment,
      city: userAddr.city,
      state: userAddr.state,
      postalCode: userAddr.postalCode,
      country: userAddr.country,
    };
  }

  if (!addressToStore) {
    const error = new Error('A valid shipping address is required.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Fetch Cart
  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          },
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    const error = new Error('Your cart is empty.');
    error.statusCode = 400;
    error.errorCode = 'CART_EMPTY';
    throw error;
  }

  // 5. Server-side price recalculation & stock pre-check
  let subtotal = 0;
  const preparedItems = [];
  let containsDemoProduct = false;

  for (const item of cart.items) {
    const product = item.product;
    const variant = item.variant;

    if (!product.isActive || product.deletedAt) {
      const error = new Error(`"${product.name}" is no longer available.`);
      error.statusCode = 400;
      throw error;
    }

    if (product.isDemo) {
      containsDemoProduct = true;
    }

    const availableStock = variant ? variant.stock : product.stock;
    if (availableStock < item.quantity) {
      const error = new Error(`Insufficient stock for "${product.name}". Only ${availableStock} left.`);
      error.statusCode = 400;
      error.errorCode = 'INSUFFICIENT_STOCK';
      throw error;
    }

    const unitPrice = variant ? variant.price : product.price;
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;

    preparedItems.push({
      productId: product.id,
      variantId: variant ? variant.id : null,
      productName: product.name,
      productSku: variant ? variant.sku : product.sku,
      price: unitPrice,
      quantity: item.quantity,
      image: product.images[0]?.url || null,
      selectedOptions: variant ? variant.options : null,
    });
  }

  // 6. Validate Coupon
  let discount = 0;
  let validatedCoupon = null;
  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, subtotal);
    discount = couponResult.discountPaise;
    validatedCoupon = couponResult.coupon;
  }

  // 7. Calculate Shipping Fee from Store Settings
  const settings = await getSiteSettings();
  let shippingFee = settings.shippingFee;
  if (subtotal >= settings.freeShippingThreshold) {
    shippingFee = 0;
  }

  const total = Math.max(0, subtotal - discount + shippingFee);

  // 8. Execute Atomic Transaction:
  // Decrement stocks conditionally, create order, create snapshot items, clear cart, increment coupon usage
  const order = await prisma.$transaction(async (tx) => {
    // Atomic stock deduction for each item
    for (const item of preparedItems) {
      if (item.variantId) {
        // Atomic conditional update on variant
        const updatedVariant = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (updatedVariant.count === 0) {
          throw new Error(`Race condition: Stock depleted for variant "${item.productSku}".`);
        }

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            change: -item.quantity,
            reason: 'ORDER_PLACED',
            note: `Deducted for order`,
          },
        });
      } else {
        // Atomic conditional update on product
        const updatedProduct = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (updatedProduct.count === 0) {
          throw new Error(`Race condition: Stock depleted for product "${item.productName}".`);
        }

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            change: -item.quantity,
            reason: 'ORDER_PLACED',
            note: `Deducted for order`,
          },
        });
      }
    }

    // Increment coupon usage count
    if (validatedCoupon) {
      await tx.coupon.update({
        where: { id: validatedCoupon.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Determine initial payment status
    // In development with ALLOW_UNPAID_TEST_ORDERS=true, test orders can be marked PAID or PENDING
    const initialPaymentStatus = (env.ALLOW_UNPAID_TEST_ORDERS && paymentMethod === 'TEST') ? 'PAID' : 'PENDING';
    const initialOrderStatus = initialPaymentStatus === 'PAID' ? 'CONFIRMED' : 'PENDING';

    const orderNumber = generateOrderNumber();

    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: user.id,
        idempotencyKey,
        status: initialOrderStatus,
        paymentStatus: initialPaymentStatus,
        paymentMethod,
        subtotal,
        discount,
        shippingFee,
        total,
        couponCode: validatedCoupon?.code || null,
        notes: notes ? notes.trim() : null,
        giftMessage: giftMessage ? giftMessage.trim() : null,
        shippingAddress: addressToStore,
        ipAddress,
        userAgent,
        isDemo: containsDemoProduct,
        items: {
          create: preparedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Clear cart items
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return newOrder;
  });

  // Background dispatch confirmation email
  sendOrderConfirmationEmail(user.email, order).catch(err => {
    logger.error({ err, orderId: order.id }, 'Order confirmation email failed');
  });

  return order;
}

/**
 * Cancel order by customer (only allowed when status is PENDING or CONFIRMED)
 */
export async function cancelOrderByCustomer(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });

  if (!order) {
    const error = new Error('Order not found.');
    error.statusCode = 404;
    throw error;
  }

  if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
    const error = new Error(`Order cannot be cancelled in "${order.status}" status.`);
    error.statusCode = 400;
    error.errorCode = 'CANNOT_CANCEL_ORDER';
    throw error;
  }

  // Restore inventory in transaction
  return prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      } else if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.stockLog.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          change: item.quantity,
          reason: 'ORDER_CANCELLED',
          note: `Restocked after order cancellation #${order.orderNumber}`,
        },
      });
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
      },
    });
  });
}

/**
 * List orders for customer
 */
export async function listUserOrders(userId) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
    },
  });
}

/**
 * Get single order details with ownership verification
 */
export async function getOrderById(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });

  if (!order) {
    const error = new Error('Order not found.');
    error.statusCode = 404;
    throw error;
  }

  return order;
}

/**
 * Admin: List all orders with filters
 */
export async function listAdminOrders({ status, search, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    const query = search.trim();
    where.OR = [
      { orderNumber: { contains: query, mode: 'insensitive' } },
      { user: { email: { contains: query, mode: 'insensitive' } } },
      { user: { name: { contains: query, mode: 'insensitive' } } },
      { trackingNumber: { contains: query, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Admin: Update order status & courier details
 */
export async function updateOrderStatus(orderId, { status, trackingNumber, courier, internalNotes }) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, items: true },
  });

  if (!order) {
    const error = new Error('Order not found.');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
  if (courier !== undefined) updateData.courier = courier;
  if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: { items: true },
  });

  // Notify customer on status update
  if (status && status !== order.status) {
    sendOrderStatusUpdateEmail(order.user.email, updatedOrder).catch(() => {});
  }

  return updatedOrder;
}

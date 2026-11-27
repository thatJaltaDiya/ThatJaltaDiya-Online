import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { validateCoupon } from './coupon.service.js';
import { getSiteSettings } from './siteSetting.service.js';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from './email.service.js';
import { orderMutex } from '../utils/mutex.js';
import { logger } from '../config/logger.js';

export const ALLOWED_ORDER_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'DELIVERED', 'CANCELLED'],
  PROCESSING: ['DELIVERED', 'SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['REFUNDED', 'RETURNED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * Whitelist customer-facing order fields.
 * Never leaks internalNotes, ipAddress, userAgent, or idempotencyKey to customers.
 */
export function serializeCustomerOrder(order) {
  if (!order) return null;
  if (Array.isArray(order)) {
    return order.map(serializeCustomerOrder);
  }

  const {
    internalNotes: _internalNotes,
    ipAddress: _ipAddress,
    userAgent: _userAgent,
    idempotencyKey: _idempotencyKey,
    ...customerFacing
  } = order;

  return customerFacing;
}

/**
 * Generate human-readable order number with at least 8 alphanumeric random chars,
 * e.g. TJD-202611-A8F291C4
 */
export function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 alphanumeric characters
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
  const lockKey = `order:user:${user.id}`;

  return orderMutex.withLock(lockKey, { timeoutMs: 5000, ttlMs: 15000 }, async () => {
    // 1. Mandatory Email Verification requirement
    if (!user.isEmailVerified) {
      const error = new Error('Please verify your email address before placing an order.');
      error.statusCode = 403;
      error.errorCode = 'EMAIL_NOT_VERIFIED';
      throw error;
    }

    // 2. Idempotency Key check: Replay protection & cross-user isolation
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
    if (existingOrder.userId !== user.id) {
      const error = new Error('Idempotency key collision from another user.');
      error.statusCode = 409;
      error.errorCode = 'IDEMPOTENCY_KEY_COLLISION';
      throw error;
    }
    logger.info({ orderNumber: existingOrder.orderNumber, idempotencyKey }, 'Idempotent order replay detected, returning existing order.');
    existingOrder.isReplay = true;
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

  // Pre-validate coupon before transaction (if provided)
  let prevalidatedCoupon = null;
  if (couponCode) {
    // Basic format check
    prevalidatedCoupon = couponCode.trim().toUpperCase();
  }

  // 4. Execute whole-transaction retry loop for orderNumber collisions (max 5 attempts)
  for (let attempt = 1; attempt <= 5; attempt++) {
    const candidateOrderNumber = generateOrderNumber();
    try {
      const order = await prisma.$transaction(async (tx) => {
        // Re-read cart inside transaction for double-submit prevention
        const cart = await tx.cart.findUnique({
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

        // Consume/empty cart immediately within the transaction to prevent double checkouts
        const deletedCart = await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        if (deletedCart.count === 0) {
          const error = new Error('Your cart is empty.');
          error.statusCode = 400;
          error.errorCode = 'CART_EMPTY';
          throw error;
        }

        // Price recalculation & stock pre-check
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

        // Atomic coupon validation and deduction under user row lock
        let discount = 0;
        let couponToStore = null;

        if (prevalidatedCoupon) {
          // Lock user row FOR UPDATE to serialize concurrent checkouts by this user
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;

          const couponResult = await validateCoupon(prevalidatedCoupon, subtotal);
          discount = couponResult.discountPaise;
          const c = couponResult.coupon;
          couponToStore = c.code;

          // Enforce per-user coupon limit atomically using CouponRedemption table
          const existingUses = await tx.couponRedemption.count({
            where: {
              couponId: c.id,
              userId: user.id,
            },
          });
          const perUserLimit = c.perUserLimit || 1;
          if (existingUses >= perUserLimit) {
            const error = new Error(`You have already reached the usage limit for coupon ${c.code}.`);
            error.statusCode = 400;
            error.errorCode = 'COUPON_USER_LIMIT_REACHED';
            throw error;
          }

          // Enforce atomic global usage limit
          if (c.usageLimit) {
            const couponUpdate = await tx.coupon.updateMany({
              where: {
                id: c.id,
                isActive: true,
                usageCount: { lt: c.usageLimit },
              },
              data: { usageCount: { increment: 1 } },
            });

            if (couponUpdate.count === 0) {
              const error = new Error('Coupon usage limit reached.');
              error.statusCode = 400;
              error.errorCode = 'COUPON_LIMIT_REACHED';
              throw error;
            }
          } else {
            await tx.coupon.update({
              where: { id: c.id },
              data: { usageCount: { increment: 1 } },
            });
          }
        }

        // Shipping fee calculation
        const settings = await getSiteSettings();
        let shippingFee = settings.shippingFee;
        if (subtotal >= settings.freeShippingThreshold) {
          shippingFee = 0;
        }

        const total = Math.max(0, subtotal - discount + shippingFee);

        // Atomic stock deductions
        for (const item of preparedItems) {
          if (item.variantId) {
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
                note: 'Deducted for order',
              },
            });
          } else {
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
                note: 'Deducted for order',
              },
            });
          }
        }

        // Payment status calculation
        const initialPaymentStatus = (env.ALLOW_UNPAID_TEST_ORDERS && paymentMethod === 'TEST') ? 'PAID' : 'PENDING';
        const initialOrderStatus = initialPaymentStatus === 'PAID' ? 'CONFIRMED' : 'PENDING';

        const expiryMinutes = env.UNPAID_ORDER_EXPIRY_MINUTES || 30;
        const paymentExpiresAt = initialPaymentStatus === 'PENDING'
          ? new Date(Date.now() + expiryMinutes * 60 * 1000)
          : null;

        // Create order with candidate order number
        const createdOrder = await tx.order.create({
          data: {
            orderNumber: candidateOrderNumber,
            userId: user.id,
            idempotencyKey,
            status: initialOrderStatus,
            paymentStatus: initialPaymentStatus,
            paymentMethod,
            paymentExpiresAt,
            subtotal,
            discount,
            shippingFee,
            total,
            couponCode: couponToStore,
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

        // Record coupon redemption atomically
        if (couponToStore) {
          const couponRecord = await tx.coupon.findUnique({ where: { code: couponToStore } });
          if (couponRecord) {
            await tx.couponRedemption.create({
              data: {
                couponId: couponRecord.id,
                userId: user.id,
                orderId: createdOrder.id,
              },
            });
          }
        }

        return createdOrder;
      }, {
        maxWait: 5000,
        timeout: 10000,
      });

      // Await confirmation email so serverless runtimes don't freeze mid-SMTP
      try {
        await sendOrderConfirmationEmail(user.email, order);
      } catch (err) {
        logger.error({ err, orderId: order.id }, 'Order confirmation email failed');
      }

      return order;
    } catch (err) {
      // Distinguish P2002 errors:
      // orderNumber -> retry whole transaction up to 5 attempts
      // idempotencyKey -> replay handling (never retry as orderNumber collision)
      if (err.code === 'P2002') {
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target.join(' ')
          : String(err.meta?.target || '');

        if (target.includes('orderNumber')) {
          if (attempt < 5) {
            logger.warn({ attempt, candidateOrderNumber }, 'Order number collision encountered. Retrying transaction with fresh order number.');
            continue;
          }
          throw err;
        }

        if (target.includes('idempotencyKey')) {
          const racedOrder = await prisma.order.findUnique({
            where: { idempotencyKey },
            include: { items: true },
          });
          if (racedOrder) {
            if (racedOrder.userId === user.id) {
              logger.info({ orderNumber: racedOrder.orderNumber, idempotencyKey }, 'Raced idempotent order returned.');
              racedOrder.isReplay = true;
              return racedOrder;
            }
            const collisionErr = new Error('Idempotency key collision from another user.');
            collisionErr.statusCode = 409;
            collisionErr.errorCode = 'IDEMPOTENCY_KEY_COLLISION';
            throw collisionErr;
          }
        }
      }
      throw err;
    }
  }
  });
}

/**
 * Cancel order by customer (only allowed when status is PENDING or CONFIRMED)
 */
export async function cancelOrderByCustomer(userId, orderId) {
  const cancelCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Restore inventory in transaction with double-cancel safety via atomic updateMany
  return prisma.$transaction(async (tx) => {
    // Atomic update first: only updates if status is PENDING/CONFIRMED and placed within 24 hours
    const updateResult = await tx.order.updateMany({
      where: {
        id: orderId,
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        createdAt: { gte: cancelCutoff },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    if (updateResult.count === 0) {
      const existing = await tx.order.findFirst({
        where: { id: orderId, userId },
      });
      if (!existing) {
        const error = new Error('Order not found.');
        error.statusCode = 404;
        throw error;
      }
      if (['PENDING', 'CONFIRMED'].includes(existing.status) && existing.createdAt < cancelCutoff) {
        const error = new Error('Orders can only be cancelled within 24 hours of placement.');
        error.statusCode = 400;
        error.errorCode = 'CANCEL_WINDOW_EXPIRED';
        throw error;
      }
      const error = new Error(`Order cannot be cancelled in "${existing.status}" status.`);
      error.statusCode = 400;
      error.errorCode = 'CANNOT_CANCEL_ORDER';
      throw error;
    }

    // Proceed to restock only when count === 1
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

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

    return order;
  }, {
    maxWait: 5000,
    timeout: 10000,
  });
}

/**
 * Scheduled cleanup of abandoned unpaid orders.
 * Automatically restocks inventory and cancels orders when paymentExpiresAt is reached.
 */
export async function cleanupExpiredUnpaidOrders() {
  const now = new Date();
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentExpiresAt: { lte: now },
    },
    include: { items: true },
    take: 50,
  });

  if (expiredOrders.length === 0) {
    return { cancelledCount: 0 };
  }

  logger.info({ count: expiredOrders.length }, 'Processing expired unpaid order cancellation & restock');
  let cancelledCount = 0;

  for (const order of expiredOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        // Run updateMany first with status condition
        const updateResult = await tx.order.updateMany({
          where: {
            id: order.id,
            status: 'PENDING',
            paymentStatus: 'PENDING',
          },
          data: {
            status: 'CANCELLED',
            internalNotes: 'Automatically cancelled due to payment expiration.',
          },
        });

        // Proceed to restock only when count === 1
        if (updateResult.count !== 1) {
          return;
        }

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
              reason: 'UNPAID_ORDER_EXPIRED',
              note: `Restocked automatically after unpaid order timeout #${order.orderNumber}`,
            },
          });
        }
        cancelledCount++;
      }, {
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (err) {
      logger.error({ err, orderId: order.id }, 'Failed to process expired order cancellation');
    }
  }

  return { cancelledCount };
}

/**
 * Payment confirmation path:
 * Conditional on order still being PENDING.
 * If order is already cancelled or expired, handle late payment by setting paymentStatus: 'REFUND_REQUIRED'
 * and logging for admin refund.
 */
export async function markOrderPaid(orderId, paymentDetails = {}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true },
    });

    if (!order) {
      const error = new Error('Order not found.');
      error.statusCode = 404;
      throw error;
    }

    if (order.status === 'PENDING') {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          action: 'ORDER_PAID',
          targetType: 'Order',
          targetId: orderId,
          details: { paymentDetails, previousStatus: order.status },
        },
      });

      return updatedOrder;
    }

    // Late payment received for non-pending order (e.g. cancelled/expired)
    const updatedNotes = [
      order.internalNotes,
      `[LATE_PAYMENT] Payment confirmed for cancelled/expired order on ${new Date().toISOString()}. Payment ID: ${paymentDetails.paymentId || 'N/A'}. Action: Marked REFUND_REQUIRED.`,
    ].filter(Boolean).join('\n');

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'REFUND_REQUIRED',
        internalNotes: updatedNotes,
      },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: {
        action: 'ORDER_LATE_PAYMENT_REFUND_FLAGGED',
        targetType: 'Order',
        targetId: orderId,
        details: {
          paymentDetails,
          orderStatus: order.status,
          note: 'Payment received after order was cancelled/expired. Flagged for admin refund.',
        },
      },
    });

    logger.warn({ orderId, orderNumber: order.orderNumber, status: order.status }, 'Late payment received for non-pending order. Marked REFUND_REQUIRED.');
    return updatedOrder;
  }, {
    maxWait: 5000,
    timeout: 10000,
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
export async function listAdminOrders({ status, paymentStatus, search, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {};

  if (status) {
    where.status = status;
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
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

  const [orders, total, refundRequiredCount] = await Promise.all([
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
    prisma.order.count({ where: { paymentStatus: 'REFUND_REQUIRED' } }),
  ]);

  return {
    orders,
    refundRequiredCount,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Admin: Mark order as REFUNDED and log to AuditLog
 */
export async function markOrderRefunded(orderId, adminId, reason = 'Admin processed refund') {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      const error = new Error('Order not found.');
      error.statusCode = 404;
      throw error;
    }

    const updatedNotes = [
      order.internalNotes,
      `[REFUND_PROCESSED] Refund confirmed by admin on ${new Date().toISOString()}. Reason: ${reason}`,
    ].filter(Boolean).join('\n');

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'REFUNDED',
        internalNotes: updatedNotes,
      },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: {
        adminId: adminId || null,
        action: 'ADMIN_ORDER_MARKED_REFUNDED',
        targetType: 'Order',
        targetId: order.id,
        details: {
          previousPaymentStatus: order.paymentStatus,
          orderStatus: order.status,
          reason,
        },
      },
    });

    logger.info({ orderId, orderNumber: order.orderNumber, adminId }, 'Order marked REFUNDED by admin.');
    return updatedOrder;
  }, {
    maxWait: 5000,
    timeout: 10000,
  });
}

/**
 * Admin: Update order status & courier details
 */
export async function updateOrderStatus(orderId, { status, trackingNumber, courier, internalNotes }, adminId = null) {
  let statusChanged = false;
  let customerEmail = null;

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true },
    });

    if (!order) {
      const error = new Error('Order not found.');
      error.statusCode = 404;
      throw error;
    }

    statusChanged = Boolean(status && status !== order.status);
    customerEmail = order.user?.email || null;

    // Validate state transitions
    if (status && status !== order.status) {
      const allowedNext = ALLOWED_ORDER_TRANSITIONS[order.status] || [];
      if (!allowedNext.includes(status)) {
        const error = new Error(`Cannot transition order from "${order.status}" to "${status}".`);
        error.statusCode = 400;
        error.errorCode = 'INVALID_ORDER_TRANSITION';
        throw error;
      }

      // If transition to CANCELLED, restock inventory exactly like customer cancellation
      if (status === 'CANCELLED') {
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
              reason: 'ADMIN_ORDER_CANCELLED',
              note: `Restocked after admin cancellation #${order.orderNumber}`,
              adminId: adminId || null,
            },
          });
        }
      }
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (courier !== undefined) updateData.courier = courier;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
      include: { items: true, user: true },
    });

    // Log admin status changes to AuditLog
    await tx.auditLog.create({
      data: {
        adminId: adminId || null,
        action: 'ADMIN_ORDER_STATUS_UPDATE',
        targetType: 'Order',
        targetId: order.id,
        details: {
          fromStatus: order.status,
          toStatus: status || order.status,
          trackingNumber,
          courier,
        },
      },
    });

    return updatedOrder;
  }, {
    maxWait: 5000,
    timeout: 10000,
  });

  // Notify customer outside transaction and await so serverless runtimes complete delivery
  if (statusChanged && customerEmail) {
    try {
      await sendOrderStatusUpdateEmail(customerEmail, updatedOrder);
    } catch (err) {
      logger.error({ err, orderId: updatedOrder.id, userEmail: customerEmail }, 'Failed to dispatch order status update email');
    }
  }

  return updatedOrder;
}

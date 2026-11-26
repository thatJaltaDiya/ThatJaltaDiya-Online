import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { paymentProvider } from '../services/payment/PaymentProvider.js';
import { apiSuccess, apiError } from '../utils/response.js';
import { logger } from '../config/logger.js';

const router = Router();

const createRazorpayOrderSchema = z.object({
  orderId: z.string().uuid('Valid orderId is required'),
}).strict();

const verifyRazorpayPaymentSchema = z.object({
  orderId: z.string().uuid('Valid orderId is required'),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
}).strict();

/**
 * Public payment configuration status (never exposes secrets)
 */
router.get('/config', (_req, res) => {
  return apiSuccess(res, {
    gateway: 'razorpay',
    enabled: paymentProvider.isConfigured(),
    keyId: paymentProvider.isConfigured() ? env.RAZORPAY_KEY_ID : null,
  });
});

/**
 * Create a Razorpay order for a pending user order
 */
router.post(
  '/razorpay/order',
  requireAuth,
  writeLimiter,
  validate({ body: createRazorpayOrderSchema }),
  async (req, res, next) => {
    try {
      const { orderId } = req.body;
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: req.user.id },
      });

      if (!order) {
        return apiError(res, 'Order not found.', 404, 'ORDER_NOT_FOUND');
      }
      if (order.paymentStatus === 'PAID') {
        return apiError(res, 'This order is already paid.', 400, 'ORDER_ALREADY_PAID');
      }
      if (order.status === 'CANCELLED') {
        return apiError(res, 'Cannot pay for a cancelled order.', 400, 'ORDER_CANCELLED');
      }

      const { rawOrder, ...intent } = await paymentProvider.createPaymentIntent(order);

      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { razorpayOrderId: intent.razorpayOrderId },
        }),
        prisma.payment.create({
          data: {
            orderId: order.id,
            razorpayOrderId: intent.razorpayOrderId,
            amount: intent.amount,
            currency: intent.currency || 'INR',
            status: 'PENDING',
            gateway: 'razorpay',
            payload: rawOrder || intent,
          },
        }),
      ]);

      return apiSuccess(res, intent, 'Razorpay order initialized.');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Verify Razorpay checkout signature, record in payments table, and mark order PAID + CONFIRMED
 */
router.post(
  '/razorpay/verify',
  requireAuth,
  writeLimiter,
  validate({ body: verifyRazorpayPaymentSchema }),
  async (req, res, next) => {
    try {
      const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: req.user.id },
      });

      if (!order) {
        return apiError(res, 'Order not found.', 404, 'ORDER_NOT_FOUND');
      }

      const verification = await paymentProvider.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!verification.isVerified) {
        logger.warn({ orderId, userId: req.user.id, razorpay_order_id }, 'Razorpay signature verification failed');
        return apiError(res, 'Payment signature verification failed.', 400, 'PAYMENT_VERIFICATION_FAILED');
      }

      const razorpayDetails = await paymentProvider.fetchPaymentDetails(razorpay_payment_id);
      const paymentPayload = {
        callback: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        },
        ...(razorpayDetails ? { payment: razorpayDetails } : {}),
      };

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const existingPayment = await tx.payment.findFirst({
          where: { orderId: order.id, razorpayOrderId: razorpay_order_id },
        });

        if (existingPayment) {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              transactionId: verification.transactionId,
              status: 'PAID',
              payload: paymentPayload,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              transactionId: verification.transactionId,
              razorpayOrderId: razorpay_order_id,
              amount: order.total,
              currency: 'INR',
              status: 'PAID',
              gateway: 'razorpay',
              payload: paymentPayload,
            },
          });
        }

        return tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
            paymentMethod: 'RAZORPAY',
            paymentId: verification.transactionId,
            razorpayOrderId: razorpay_order_id,
            paymentExpiresAt: null,
          },
          include: { items: true, payments: true },
        });
      });

      logger.info(
        { orderId: order.id, orderNumber: order.orderNumber, paymentId: verification.transactionId },
        'Razorpay payment verified and saved to payments table'
      );

      return apiSuccess(res, updatedOrder, 'Payment verified successfully.');
    } catch (err) {
      next(err);
    }
  }
);

export default router;

import { Router } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { paymentProvider } from '../services/payment/PaymentProvider.js';
import { sendOrderConfirmationEmail } from '../services/email.service.js';
import { apiSuccess, apiError } from '../utils/response.js';

const router = Router();

/**
 * Shared Razorpay webhook handler for payment.captured, order.paid, payment.failed, refund.processed
 */
async function handleRazorpayWebhook(req, res, next) {
  try {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      return apiError(res, 'Webhook secret is not configured.', 503, 'WEBHOOK_NOT_CONFIGURED');
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature || !paymentProvider.verifyWebhookSignature(req.body, signature)) {
      logger.warn('Razorpay webhook signature verification failed');
      return apiError(res, 'Invalid webhook signature.', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    let eventPayload;
    try {
      const rawText = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
      eventPayload = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    } catch {
      return apiError(res, 'Invalid webhook JSON payload.', 400, 'INVALID_JSON');
    }

    const eventType = eventPayload?.event;
    const paymentEntity = eventPayload?.payload?.payment?.entity || null;
    const orderEntity = eventPayload?.payload?.order?.entity || null;
    const refundEntity = eventPayload?.payload?.refund?.entity || null;

    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id || null;
    const paymentId = paymentEntity?.id || refundEntity?.payment_id || null;
    const orderIdFromNotes = paymentEntity?.notes?.orderId || orderEntity?.notes?.orderId || null;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      let confirmedOrder = null;
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
            ...(orderIdFromNotes ? [{ id: orderIdFromNotes }] : []),
          ],
        },
        include: { user: { select: { email: true } } },
      });

      if (!order) {
        logger.warn({ eventType, razorpayOrderId, orderIdFromNotes }, 'Razorpay webhook order not found');
        return apiSuccess(res, { received: true, matched: false }, 'Webhook acknowledged.');
      }

      if (typeof paymentEntity?.amount === 'number' && paymentEntity.amount !== order.total) {
        logger.error(
          { orderId: order.id, expected: order.total, received: paymentEntity.amount },
          'Razorpay webhook amount mismatch'
        );
        return apiError(res, 'Payment amount mismatch.', 400, 'AMOUNT_MISMATCH');
      }

      await prisma.$transaction(async (tx) => {
        const existingPayment = await tx.payment.findFirst({
          where: {
            OR: [
              ...(paymentId ? [{ transactionId: paymentId }] : []),
              ...(razorpayOrderId ? [{ orderId: order.id, razorpayOrderId }] : []),
            ],
          },
        });

        if (existingPayment) {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              transactionId: paymentId || existingPayment.transactionId,
              razorpayOrderId: razorpayOrderId || existingPayment.razorpayOrderId,
              status: 'PAID',
              payload: eventPayload,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              transactionId: paymentId,
              razorpayOrderId,
              amount: order.total,
              currency: paymentEntity?.currency || 'INR',
              status: 'PAID',
              gateway: 'razorpay',
              payload: eventPayload,
            },
          });
        }

        confirmedOrder = null;
        const claim = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING', paymentStatus: { not: 'PAID' } },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            paymentMethod: 'RAZORPAY',
            paymentId: paymentId || order.paymentId,
            razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
            paymentExpiresAt: null,
          },
        });

        if (claim.count === 1) {
          confirmedOrder = await tx.order.findUnique({
            where: { id: order.id },
            include: { items: true },
          });
        } else if (order.paymentStatus !== 'PAID') {
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              paymentMethod: 'RAZORPAY',
              paymentId: paymentId || order.paymentId,
              razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
              paymentExpiresAt: null,
            },
          });
        }
      });

      logger.info({ eventType, orderId: order.id, paymentId, razorpayOrderId }, 'Razorpay webhook processed as PAID');

      if (confirmedOrder?.status === 'CONFIRMED' && order.user?.email) {
        try {
          await sendOrderConfirmationEmail(order.user.email, confirmedOrder);
        } catch (err) {
          logger.error({ err, orderId: order.id }, 'Order confirmation email failed after webhook');
        }
      }
    } else if (eventType === 'payment.failed') {
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
            ...(orderIdFromNotes ? [{ id: orderIdFromNotes }] : []),
          ],
        },
      });

      if (order && order.paymentStatus !== 'PAID') {
        await prisma.$transaction(async (tx) => {
          const existingPayment = await tx.payment.findFirst({
            where: {
              OR: [
                ...(paymentId ? [{ transactionId: paymentId }] : []),
                ...(razorpayOrderId ? [{ orderId: order.id, razorpayOrderId }] : []),
              ],
            },
          });

          if (existingPayment) {
            await tx.payment.update({
              where: { id: existingPayment.id },
              data: {
                transactionId: paymentId || existingPayment.transactionId,
                status: 'FAILED',
                payload: eventPayload,
              },
            });
          } else {
            await tx.payment.create({
              data: {
                orderId: order.id,
                transactionId: paymentId,
                razorpayOrderId,
                amount: order.total,
                currency: paymentEntity?.currency || 'INR',
                status: 'FAILED',
                gateway: 'razorpay',
                payload: eventPayload,
              },
            });
          }

          if (order.paymentStatus === 'PENDING') {
            await tx.order.update({
              where: { id: order.id },
              data: { paymentStatus: 'FAILED' },
            });
          }
        });

        logger.warn({ eventType, orderId: order.id, paymentId, razorpayOrderId }, 'Razorpay webhook processed as FAILED');
      }
    } else if (eventType === 'refund.processed' && paymentId) {
      const order = await prisma.order.findFirst({
        where: { paymentId },
      });

      if (order && typeof refundEntity?.amount === 'number' && refundEntity.amount >= order.total) {
        await prisma.$transaction([
          prisma.payment.updateMany({
            where: { orderId: order.id, transactionId: paymentId },
            data: { status: 'REFUNDED', payload: eventPayload },
          }),
          prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'REFUNDED',
              status: order.status === 'CANCELLED' || order.status === 'RETURNED' ? 'REFUNDED' : order.status,
            },
          }),
        ]);
        logger.info({ eventType, orderId: order.id, paymentId }, 'Razorpay webhook processed as REFUNDED');
      }
    }

    return apiSuccess(res, { received: true, event: eventType || null }, 'Webhook processed.');
  } catch (err) {
    next(err);
  }
}

router.post('/payment', handleRazorpayWebhook);
router.post('/razorpay', handleRazorpayWebhook);

export default router;

import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

export class NotImplementedError extends Error {
  constructor(message = 'PaymentProvider method not implemented') {
    super(message);
    this.name = 'NotImplementedError';
    this.statusCode = 501;
    this.errorCode = 'PAYMENT_GATEWAY_NOT_CONFIGURED';
  }
}

export class PaymentProvider {
  isConfigured() {
    return false;
  }

  async createPaymentIntent(_order) {
    throw new NotImplementedError(
      'Payment gateway is not configured. In development, ALLOW_UNPAID_TEST_ORDERS=true permits test checkout.'
    );
  }

  async verifyPayment(_payload) {
    throw new NotImplementedError('Payment verification adapter is not configured.');
  }

  async handleWebhook(_req) {
    throw new NotImplementedError('Payment webhook handler is not configured.');
  }
}

function timingSafeHexEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export class RazorpayProvider extends PaymentProvider {
  isConfigured() {
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  }

  #getClient() {
    if (!this.isConfigured()) {
      throw new NotImplementedError(
        'Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.'
      );
    }
    return new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create a Razorpay order for an existing store Order (amount in paise).
   */
  async createPaymentIntent(order) {
    const client = this.#getClient();
    const utf8Receipt = Buffer.from(String(order.orderNumber), 'utf8').toString('utf8').slice(0, 40);

    const rzpOrder = await client.orders.create({
      amount: order.total,
      currency: 'INR',
      receipt: utf8Receipt,
      notes: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    return {
      gateway: 'razorpay',
      keyId: env.RAZORPAY_KEY_ID,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      orderNumber: order.orderNumber,
      rawOrder: rzpOrder,
    };
  }

  /**
   * Fetch full payment details from Razorpay (best-effort)
   */
  async fetchPaymentDetails(paymentId) {
    try {
      const client = this.#getClient();
      return await client.payments.fetch(paymentId);
    } catch {
      return null;
    }
  }

  /**
   * Fetch all payment attempts for a Razorpay order ID
   */
  async fetchOrderPayments(razorpayOrderId) {
    try {
      const client = this.#getClient();
      const res = await client.orders.fetchPayments(razorpayOrderId);
      return res?.items || [];
    } catch {
      return [];
    }
  }

  /**
   * Verify Razorpay checkout callback HMAC-SHA256 signature.
   */
  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!this.isConfigured()) {
      throw new NotImplementedError(
        'Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.'
      );
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { isVerified: false, transactionId: null };
    }

    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isVerified = timingSafeHexEquals(expectedSignature, razorpay_signature);
    return {
      isVerified,
      transactionId: isVerified ? razorpay_payment_id : null,
    };
  }

  /**
   * Verify Razorpay webhook X-Razorpay-Signature against exact raw request body.
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) {
      return false;
    }

    const bodyBuffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {}), 'utf8');

    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(bodyBuffer)
      .digest('hex');

    return timingSafeHexEquals(expectedSignature, String(signature).trim());
  }
}

export const paymentProvider = new RazorpayProvider();

/**
 * Reconcile pending Razorpay payments by querying Razorpay API using transactionId / razorpayOrderId.
 * Marks captured payments as PAID + CONFIRMED and failed attempts as FAILED.
 */
export async function reconcilePendingRazorpayPayments() {
  if (!paymentProvider.isConfigured()) {
    return { checked: 0, updated: 0 };
  }

  const pendingPayments = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      gateway: 'razorpay',
      OR: [
        { transactionId: { not: null } },
        { razorpayOrderId: { not: null } },
      ],
    },
    include: { order: true },
    take: 50,
  });

  if (pendingPayments.length === 0) {
    return { checked: 0, updated: 0 };
  }

  let updated = 0;

  for (const payment of pendingPayments) {
    try {
      let attempts = [];
      if (payment.transactionId) {
        const single = await paymentProvider.fetchPaymentDetails(payment.transactionId);
        if (single) attempts = [single];
      } else if (payment.razorpayOrderId) {
        attempts = await paymentProvider.fetchOrderPayments(payment.razorpayOrderId);
      }

      if (attempts.length === 0) continue;

      const captured = attempts.find((p) => p.status === 'captured');
      if (captured) {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              transactionId: captured.id,
              payload: { reconciledPayment: captured },
            },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: 'PAID',
              status: payment.order?.status === 'PENDING' ? 'CONFIRMED' : payment.order?.status,
              paymentMethod: 'RAZORPAY',
              paymentId: captured.id,
              razorpayOrderId: payment.razorpayOrderId,
              paymentExpiresAt: null,
            },
          }),
        ]);
        updated++;
        logger.info(
          { orderId: payment.orderId, transactionId: captured.id, razorpayOrderId: payment.razorpayOrderId },
          'Reconciled pending Razorpay payment as PAID'
        );
      } else if (attempts.every((p) => p.status === 'failed')) {
        const latestFailed = attempts[attempts.length - 1];
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'FAILED',
              transactionId: latestFailed.id,
              payload: { reconciledPayments: attempts },
            },
          }),
          prisma.order.updateMany({
            where: { id: payment.orderId, paymentStatus: 'PENDING' },
            data: { paymentStatus: 'FAILED' },
          }),
        ]);
        updated++;
        logger.warn(
          { orderId: payment.orderId, transactionId: latestFailed.id, razorpayOrderId: payment.razorpayOrderId },
          'Reconciled pending Razorpay payment as FAILED'
        );
      }
    } catch (err) {
      logger.error({ err, paymentId: payment.id }, 'Error reconciling pending Razorpay payment');
    }
  }

  return { checked: pendingPayments.length, updated };
}

/**
 * Payment Provider Interface & Stub Implementation
 * In accordance with Section 9 of Project Brief:
 * "Do NOT implement any payment gateway. Instead create a PaymentProvider interface/adapter with methods
 * like createPaymentIntent(order), verifyPayment(payload), and handleWebhook(req) with a stub implementation."
 */

export class NotImplementedError extends Error {
  constructor(message = 'PaymentProvider method not implemented') {
    super(message);
    this.name = 'NotImplementedError';
    this.statusCode = 501;
    this.errorCode = 'PAYMENT_GATEWAY_NOT_CONFIGURED';
  }
}

export class PaymentProvider {
  /**
   * Create payment intent with external gateway (e.g. Razorpay, Stripe, Cashfree)
   * @param {Object} order - Order record
   * @returns {Promise<{ clientSecret: string, orderId: string, amount: number }>}
   */
  async createPaymentIntent(_order) {
    throw new NotImplementedError(
      'Payment gateway is not integrated yet. In development, ALLOW_UNPAID_TEST_ORDERS=true permits test checkout.'
    );
  }

  /**
   * Verify signature or payment status after redirect/modal completion
   * @param {Object} payload - Verification payload from gateway
   * @returns {Promise<{ isVerified: boolean, transactionId: string }>}
   */
  async verifyPayment(_payload) {
    throw new NotImplementedError('Payment verification adapter is not configured.');
  }

  /**
   * Handle asynchronous webhook events from payment gateway
   * @param {Object} req - Express request with raw body and signature header
   * @returns {Promise<{ received: boolean, eventType: string }>}
   */
  async handleWebhook(_req) {
    throw new NotImplementedError('Payment webhook handler is not configured.');
  }
}

export const paymentProvider = new PaymentProvider();

import { Router } from 'express';
import { apiSuccess } from '../utils/response.js';

const router = Router();

/**
 * Placeholder webhook endpoint for Payment Gateways
 *
 * NOTE FOR PRODUCTION PAYMENT GATEWAY INTEGRATION:
 * 1. Webhooks from providers like Stripe or Razorpay require the raw, unparsed request body
 *    to compute and verify cryptographic HMAC signatures (e.g. stripe-signature, X-Razorpay-Signature).
 * 2. Configure Express to preserve `req.rawBody` for this route, or mount this route before `express.json()`.
 * 3. Never trust client-submitted transaction results without webhook verification.
 * 4. Update the order's `paymentStatus` to PAID only after successful signature validation.
 */
router.post('/payment', async (req, res) => {
  // TODO: PAYMENT INTEGRATION - Verify gateway signature and process event
  // const signature = req.headers['x-razorpay-signature'] || req.headers['stripe-signature'];
  // const event = paymentProvider.handleWebhook(req);

  return apiSuccess(
    res,
    { received: true },
    'Payment webhook received (placeholder stub).'
  );
});

export default router;

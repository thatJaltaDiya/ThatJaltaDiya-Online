import { Router } from 'express';
import { apiSuccess } from '../utils/response.js';

const router = Router();

router.post('/payment', async (_req, res) => {
  return apiSuccess(
    res,
    { received: true },
    'Payment webhook received (placeholder stub).'
  );
});

export default router;

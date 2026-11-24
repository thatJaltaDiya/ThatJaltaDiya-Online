import { Router } from 'express';
import * as addressesController from '../controllers/addresses.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import * as v from '../validators/commerce.validators.js';

const router = Router();

router.use(requireAuth);

router.get('/', addressesController.list);
router.post('/', writeLimiter, validate({ body: v.createAddressSchema }), addressesController.create);
router.patch('/:addressId', writeLimiter, validate({ body: v.updateAddressSchema }), addressesController.update);
router.delete('/:addressId', writeLimiter, addressesController.remove);
router.patch('/:addressId/default', writeLimiter, addressesController.setDefault);

export default router;

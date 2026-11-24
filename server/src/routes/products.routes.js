import { Router } from 'express';
import * as productsController from '../controllers/products.controller.js';
import { validate } from '../middleware/validate.js';
import * as v from '../validators/commerce.validators.js';

const router = Router();

router.get('/', validate({ query: v.listProductsQuerySchema }), productsController.list);
router.get('/:slug', productsController.getBySlug);

export default router;

import * as productService from '../services/product.service.js';
import { apiSuccess } from '../utils/response.js';

export async function list(req, res, next) {
  try {
    const result = await productService.listProducts({
      categorySlug: req.query.category,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      sort: req.query.sort,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      isFeatured: req.query.isFeatured,
      isBestseller: req.query.isBestseller,
      isNew: req.query.isNew,
    });
    return apiSuccess(res, result.products, 'Products retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
}

export async function getBySlug(req, res, next) {
  try {
    const result = await productService.getProductBySlug(req.params.slug);
    return apiSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

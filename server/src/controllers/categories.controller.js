import * as categoryService from '../services/category.service.js';
import { apiSuccess } from '../utils/response.js';

export async function list(req, res, next) {
  try {
    const categories = await categoryService.listCategories();
    return apiSuccess(res, categories);
  } catch (error) {
    next(error);
  }
}

export async function getBySlug(req, res, next) {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    return apiSuccess(res, category);
  } catch (error) {
    next(error);
  }
}

import { apiError } from '../utils/response.js';

/**
 * Reusable Zod validation middleware for body, query, and params.
 * Enforces schema validation and rejects unknown fields.
 *
 * @param {Object} schemas - { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 */
export function validate(schemas = {}) {
  return async (req, res, next) => {
    try {
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        req.params = parsedParams;
      }

      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        req.query = parsedQuery;
      }

      if (schemas.body) {
        const parsedBody = await schemas.body.parseAsync(req.body);
        req.body = parsedBody;
      }

      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const fieldErrors = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        const primaryMessage = fieldErrors[0]?.message || 'Validation failed. Please verify your inputs.';
        return apiError(
          res,
          primaryMessage,
          400,
          'VALIDATION_ERROR',
          fieldErrors
        );
      }
      next(err);
    }
  };
}

import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { apiError } from '../utils/response.js';

export function errorHandler(err, req, res, _next) {
  const requestId = res.locals?.requestId || 'req-' + Date.now();

  // Log error with pino
  logger.error({
    err,
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.headers['cf-connecting-ip'] || req.ip,
  }, 'Unhandled request error');

  // Specific common errors
  if (err.name === 'UnauthorizedError' || err.code === 'UNAUTHORIZED') {
    return apiError(res, 'Authentication required', 401, 'UNAUTHORIZED');
  }

  if (err.code === 'EBADCSRFTOKEN') {
    return apiError(res, 'Invalid CSRF token', 403, 'CSRF_INVALID');
  }

  if (err.type === 'entity.too.large') {
    return apiError(res, 'Payload too large. Max limit is 10kb.', 413, 'PAYLOAD_TOO_LARGE');
  }

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    if (err.code === 'P2002') {
      const target = err.meta?.target ? ` (${Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target})` : '';
      return apiError(res, `A record with this identifier already exists${target}.`, 409, 'DUPLICATE_RESOURCE');
    }
    if (err.code === 'P2025') {
      return apiError(res, 'Resource not found.', 404, 'NOT_FOUND');
    }
  }

  // Production response: never leak stack or internal details
  const message = env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred. Please contact support with the requestId if the issue persists.'
    : (err.message || 'Internal server error');

  return apiError(
    res,
    message,
    err.statusCode || 500,
    err.errorCode || 'INTERNAL_SERVER_ERROR',
    env.NODE_ENV !== 'production' ? { stack: err.stack } : null
  );
}

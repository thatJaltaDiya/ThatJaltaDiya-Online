import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { apiError } from '../utils/response.js';

export function errorHandler(err, req, res, _next) {
  const requestId = res.locals?.requestId || 'req-' + Date.now();

  // Log full error details securely with Winston logger
  logger.error({
    err,
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.headers['cf-connecting-ip'] || req.ip,
  }, 'Unhandled request error');

  // 1. Malformed JSON / Request Body Parsing Errors
  if (
    (err instanceof SyntaxError && err.status === 400 && 'body' in err) ||
    err.type === 'entity.parse.failed' ||
    (err.message && err.message.toLowerCase().includes('json'))
  ) {
    return apiError(
      res,
      'Invalid request payload. Please verify your submitted data.',
      400,
      'INVALID_PAYLOAD'
    );
  }

  // 2. Payload too large
  if (err.type === 'entity.too.large' || err.status === 413) {
    return apiError(res, 'Payload too large. Max limit is 10kb.', 413, 'PAYLOAD_TOO_LARGE');
  }

  // 3. CORS Policy Rejection
  if (err.errorCode === 'CORS_FORBIDDEN' || (err.message && err.message.startsWith('CORS policy rejection'))) {
    return apiError(res, 'Origin not permitted by CORS policy.', 403, 'CORS_FORBIDDEN');
  }

  // 4. Authentication & Invalid Credentials
  if (
    err.errorCode === 'INVALID_CREDENTIALS' ||
    (err.message && (
      err.message.toLowerCase().includes('invalid email or password') ||
      err.message.toLowerCase().includes('invalid credentials')
    ))
  ) {
    return apiError(
      res,
      'Invalid credentials. Please verify your email and password.',
      401,
      'INVALID_CREDENTIALS'
    );
  }

  // 5. General Unauthorized / Missing Token
  if (err.name === 'UnauthorizedError' || err.code === 'UNAUTHORIZED' || err.statusCode === 401) {
    return apiError(res, err.message || 'Authentication required.', 401, err.errorCode || 'UNAUTHORIZED');
  }

  // 6. CSRF Token Validation
  if (err.code === 'EBADCSRFTOKEN' || err.errorCode === 'CSRF_INVALID') {
    return apiError(res, 'Invalid or expired CSRF token.', 403, 'CSRF_INVALID');
  }

  // 7. JWT Token Validation Errors
  if (err.name === 'JsonWebTokenError') {
    return apiError(res, 'Invalid authentication token.', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return apiError(res, 'Authentication token has expired. Please sign in again.', 401, 'TOKEN_EXPIRED');
  }

  // 8. Prisma / Database Errors
  if (err.code && err.code.startsWith('P')) {
    if (err.code === 'P2002') {
      const target = err.meta?.target ? ` (${Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target})` : '';
      return apiError(res, `A record with this identifier already exists${target}.`, 409, 'DUPLICATE_RESOURCE');
    }
    if (err.code === 'P2025') {
      return apiError(res, 'The requested resource was not found.', 404, 'NOT_FOUND');
    }
    return apiError(res, 'Database operation could not be completed. Please check your data.', 400, 'DATABASE_ERROR');
  }

  // 9. Client Errors (4xx) with existing safe message
  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 400 && statusCode < 500) {
    return apiError(
      res,
      err.message || 'Invalid request.',
      statusCode,
      err.errorCode || 'BAD_REQUEST'
    );
  }

  // 10. Production 500 error response: never leak internal stack or technical details
  const message = env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred. Please contact support with the requestId if the issue persists.'
    : (err.message || 'Internal server error');

  return apiError(
    res,
    message,
    statusCode,
    err.errorCode || 'INTERNAL_SERVER_ERROR',
    env.NODE_ENV !== 'production' ? { stack: err.stack, requestId } : null
  );
}

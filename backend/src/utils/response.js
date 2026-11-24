/**
 * Standardized API Response utilities
 */

export function apiSuccess(res, data = null, message = 'Success', statusCode = 200, meta = undefined) {
  const payload = {
    success: true,
    message,
    data,
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

export function apiError(res, message = 'An error occurred', statusCode = 500, errorCode = 'INTERNAL_ERROR', errors = null) {
  const payload = {
    success: false,
    error: {
      code: errorCode,
      message,
    }
  };
  if (errors) {
    payload.error.details = errors;
  }
  if (res.locals?.requestId) {
    payload.error.requestId = res.locals.requestId;
  }
  return res.status(statusCode).json(payload);
}

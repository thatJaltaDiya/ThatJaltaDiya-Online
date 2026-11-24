import { apiError } from '../utils/response.js';

/**
 * CSRF Protection Middleware
 * Protects against cross-site request forgery when using cookie-based refresh tokens.
 * Verifies custom header 'x-requested-with' or 'x-csrf-token' on non-GET/HEAD/OPTIONS requests.
 */
export function csrfProtection(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // If request has cookie or authorization header, ensure it originated from trusted client
  const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'];

  // Check if header is present
  if (!customHeader && req.cookies?.refreshToken) {
    return apiError(res, 'CSRF verification failed. Missing expected custom request header.', 403, 'CSRF_DETECTED');
  }

  next();
}

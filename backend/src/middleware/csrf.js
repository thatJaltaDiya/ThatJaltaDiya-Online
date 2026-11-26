import crypto from 'crypto';
import { apiError } from '../utils/response.js';

/**
 * Double-Submit CSRF Protection Middleware
 * Protects cookie-authenticated state-changing routes (/refresh, /logout)
 * Compares httpOnly-false cookie 'csrfToken' with request header 'x-csrf-token' using timingSafeEqual.
 */
export function csrfProtection(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Only enforce when client is presenting a non-empty auth cookie
  const rawRefreshToken = req.cookies?.refreshToken || req.signedCookies?.refreshToken;
  const hasRefreshToken = Boolean(
    rawRefreshToken && rawRefreshToken !== 'undefined' && rawRefreshToken !== 'null'
  );
  if (!hasRefreshToken) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken || req.signedCookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return apiError(
      res,
      'CSRF token missing. Security verification failed.',
      403,
      'CSRF_TOKEN_MISSING'
    );
  }

  const cookieBuf = Buffer.from(String(cookieToken).trim(), 'utf-8');
  const headerBuf = Buffer.from(String(headerToken).trim(), 'utf-8');

  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    return apiError(
      res,
      'CSRF token mismatch. Security verification failed.',
      403,
      'CSRF_TOKEN_MISMATCH'
    );
  }

  next();
}

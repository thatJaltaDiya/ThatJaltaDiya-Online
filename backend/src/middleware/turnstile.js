import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { apiError } from '../utils/response.js';
import { getClientIp } from '../utils/ip.js';

/**
 * Verify Cloudflare Turnstile token with FAIL-CLOSED semantics.
 * In production:
 * - Missing token -> REJECT
 * - Network error / timeout -> REJECT (Fail-closed)
 * - Cloudflare outcome.success !== true -> REJECT
 */
export async function verifyTurnstileToken(token, remoteIp) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return false;
  }

  // Allowed ONLY in non-production environments with explicit test flag
  if (env.NODE_ENV !== 'production' && env.ALLOW_TEST_CAPTCHA) {
    if (token === '1x0000000000000000000000000000000AA' || token === 'dummy-test-token') {
      return true;
    }
  }

  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    logger.error('Turnstile verification failed: missing TURNSTILE_SECRET_KEY');
    return false; // Fail closed
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token.trim());
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error({ status: response.status }, 'Turnstile API non-200 response');
      return false; // Fail closed
    }

    const outcome = await response.json();
    if (outcome.success !== true) {
      return false;
    }

    // In production, enforce hostname validation if TURNSTILE_ALLOWED_HOSTNAMES is configured
    if (env.NODE_ENV === 'production' && env.TURNSTILE_ALLOWED_HOSTNAMES && env.TURNSTILE_ALLOWED_HOSTNAMES.length > 0) {
      const tokenHost = (outcome.hostname || '').toLowerCase();
      const isAllowed = env.TURNSTILE_ALLOWED_HOSTNAMES.includes(tokenHost);
      if (!isAllowed) {
        logger.warn({ tokenHost, allowedHostnames: env.TURNSTILE_ALLOWED_HOSTNAMES }, 'Turnstile hostname verification mismatch');
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error({ err: error.message }, 'Turnstile siteverify network error - failing closed');
    return false; // Fail closed
  }
}

/**
 * Middleware requiring Turnstile verification on a route.
 */
export function requireTurnstile(fieldName = 'turnstileToken') {
  return async (req, res, next) => {
    // In non-production environments with ALLOW_TEST_CAPTCHA enabled, bypass for offline/local development
    if (env.NODE_ENV !== 'production' && env.ALLOW_TEST_CAPTCHA) {
      return next();
    }

    const token =
      req.body?.[fieldName] ||
      req.headers['cf-turnstile-response'] ||
      req.headers['x-turnstile-token'];

    if (!token) {
      return apiError(
        res,
        'Security verification required. Please complete the CAPTCHA.',
        400,
        'CAPTCHA_REQUIRED'
      );
    }

    const clientIp = getClientIp(req);
    const isValid = await verifyTurnstileToken(token, clientIp);

    if (!isValid) {
      return apiError(
        res,
        'Security verification failed. Please refresh and try again.',
        403,
        'CAPTCHA_FAILED'
      );
    }

    next();
  };
}

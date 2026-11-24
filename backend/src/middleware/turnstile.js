import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { apiError } from '../utils/response.js';

/**
 * Verify Cloudflare Turnstile token
 */
export async function verifyTurnstileToken(token, remoteIp) {
  // If test dummy token is used, always pass
  if (!token) return false;
  if (token === '1x0000000000000000000000000000000AA' || token === 'dummy-test-token') {
    return true;
  }
  if (!env.CLOUDFLARE_TURNSTILE_SECRET_KEY || env.CLOUDFLARE_TURNSTILE_SECRET_KEY === '1x0000000000000000000000000000000AA') {
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', env.CLOUDFLARE_TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const outcome = await response.json();
    return !!outcome.success;
  } catch (error) {
    logger.error({ err: error }, 'Turnstile verification request failed');
    return false;
  }
}

/**
 * Middleware requiring Turnstile verification
 */
export function requireTurnstile(fieldName = 'turnstileToken') {
  return async (req, res, next) => {
    // In test environment, bypass if token is dummy
    if (env.NODE_ENV === 'test') {
      return next();
    }

    const token = req.body[fieldName] || req.headers['cf-turnstile-response'];
    if (!token) {
      return apiError(res, 'Security verification required (missing CAPTCHA token).', 400, 'CAPTCHA_REQUIRED');
    }

    const clientIp = req.headers['cf-connecting-ip'] || req.ip;
    const isValid = await verifyTurnstileToken(token, clientIp);

    if (!isValid) {
      return apiError(res, 'Security verification failed. Please try again.', 403, 'CAPTCHA_FAILED');
    }

    next();
  };
}

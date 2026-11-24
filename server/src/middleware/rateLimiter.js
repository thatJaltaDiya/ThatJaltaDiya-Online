import rateLimit from 'express-rate-limit';
import { apiError } from '../utils/response.js';

// Global limiter: 100 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return apiError(res, 'Too many requests, please slow down.', 429, 'RATE_LIMIT_EXCEEDED');
  },
});

// Strict auth limiter: 10 requests per 15 minutes per IP for sensitive auth operations
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return apiError(res, 'Too many attempts. Please try again after 15 minutes.', 429, 'AUTH_RATE_LIMIT_EXCEEDED');
  },
});

// Mutation / Write limiter: 40 requests per minute per IP
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return apiError(res, 'Too many actions, please slow down.', 429, 'WRITE_RATE_LIMIT_EXCEEDED');
  },
});

// OTP send limiter: 3 requests per hour
export const otpSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return apiError(res, 'Too many OTP requests. Please wait an hour before requesting again.', 429, 'OTP_LIMIT_EXCEEDED');
  },
});

import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { apiError } from '../utils/response.js';
import { getClientIp, getIpSubnetKey } from '../utils/ip.js';

/**
 * Safely normalize, length-cap, and hash identifier for rate limiter keys.
 * Uses String() first; never throws on non-string input.
 */
export function normalizeAndHashIdentifier(input) {
  try {
    const str = String(input ?? '').trim().toLowerCase().slice(0, 255);
    if (!str) return 'anonymous';
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 32);
  } catch {
    return 'anonymous';
  }
}

// Global API limiter: 100 requests per minute per IP/subnet (skips catalog and public settings paths)
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  skip: (req) => {
    const url = req.originalUrl || req.url || '';
    return (
      url.startsWith('/api/v1/products') ||
      url.startsWith('/api/v1/categories') ||
      url.startsWith('/api/v1/settings') ||
      url === '/sitemap.xml' ||
      url === '/healthz' ||
      url === '/readyz'
    );
  },
  handler: (_req, res) => {
    return apiError(res, 'Too many requests, please slow down.', 429, 'RATE_LIMIT_EXCEEDED');
  },
});

// Public read-only catalog limiter: 300 requests per minute per IP/subnet
export const catalogLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  handler: (_req, res) => {
    return apiError(res, 'Too many requests, please slow down.', 429, 'CATALOG_RATE_LIMIT_EXCEEDED');
  },
});

/**
 * 1. Login Limiter keyed on IP subnet + normalized email.
 * Ensures shared mobile carrier / office NAT IPs do not lock out unrelated users.
 * Skips successful logins so genuine users can log in repeatedly.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ipKey = getIpSubnetKey(getClientIp(req));
    const hashedEmail = normalizeAndHashIdentifier(req.body?.email);
    return `${ipKey}:${hashedEmail}`;
  },
  handler: (_req, res) => {
    return apiError(
      res,
      'Too many failed login attempts for this account from your connection. Please wait 15 minutes or reset your password.',
      429,
      'LOGIN_RATE_LIMIT_EXCEEDED'
    );
  },
});

/**
 * 2. Per-IP Aggregate Login Limiter (e.g. 30 failed attempts / 15 min per IP subnet)
 * Protects against credential stuffing distributed across multiple accounts from one IP or IPv6 subnet.
 */
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  handler: (_req, res) => {
    return apiError(
      res,
      'Too many failed login attempts from this network. Please wait 15 minutes before trying again.',
      429,
      'IP_LOGIN_RATE_LIMIT_EXCEEDED'
    );
  },
});

/**
 * 3. Per-Account Limiter independent of IP (e.g. 10 failed attempts / 15 min across all IPs)
 * Protects an individual account against distributed brute-force attacks across proxy botnets.
 */
export const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `account:${normalizeAndHashIdentifier(req.body?.email)}`;
  },
  handler: (_req, res) => {
    return apiError(
      res,
      'Too many failed login attempts for this account. Please wait 15 minutes or use password recovery.',
      429,
      'ACCOUNT_LOGIN_RATE_LIMIT_EXCEEDED'
    );
  },
});

// Strict registration limiter: 5 per hour per IP/subnet in production; relaxed in dev/test
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 5 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  handler: (_req, res) => {
    return apiError(res, 'Registration rate limit reached. Please try again later.', 429, 'REGISTER_RATE_LIMIT_EXCEEDED');
  },
});

// Password reset request limiter: 3 requests per hour per IP/subnet
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  handler: (_req, res) => {
    return apiError(res, 'Too many password reset requests. Please check your inbox or wait an hour.', 429, 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED');
  },
});

// Per-IP OTP send limiter: 5 requests per hour per IP/subnet
export const otpSendIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  handler: (_req, res) => {
    return apiError(res, 'Too many OTP requests from your connection. Please wait an hour before requesting again.', 429, 'IP_OTP_LIMIT_EXCEEDED');
  },
});

// OTP send limiter: 3 requests per hour per Identifier
export const otpSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const rawId = req.body?.identifier || req.body?.phone || req.body?.email;
    return `otp:${normalizeAndHashIdentifier(rawId)}`;
  },
  handler: (_req, res) => {
    return apiError(res, 'Too many OTP requests for this account. Please wait an hour before requesting again.', 429, 'OTP_LIMIT_EXCEEDED');
  },
});

// Sitemap limiter: 30 requests per minute per IP/subnet
export const sitemapLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  handler: (_req, res) => {
    return apiError(res, 'Sitemap rate limit reached, please slow down.', 429, 'SITEMAP_RATE_LIMIT_EXCEEDED');
  },
});

// Order creation limiter: 10 requests per minute per IP/subnet
export const orderCreationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  handler: (_req, res) => {
    return apiError(res, 'Order creation limit reached. Please wait a moment before trying again.', 429, 'ORDER_RATE_LIMIT_EXCEEDED');
  },
});

// Contact message limiter: 5 requests per 15 minutes per IP/subnet
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  handler: (_req, res) => {
    return apiError(res, 'Too many contact messages sent. Please wait before submitting another message.', 429, 'CONTACT_RATE_LIMIT_EXCEEDED');
  },
});

// Generic write / mutation limiter: 40 requests per minute per IP/subnet
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpSubnetKey(getClientIp(req)),
  handler: (_req, res) => {
    return apiError(res, 'Too many actions, please slow down.', 429, 'WRITE_RATE_LIMIT_EXCEEDED');
  },
});

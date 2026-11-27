import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),

  // Database: Neon Postgres
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // Client CORS and Proxy
  CLIENT_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173')
    .transform(origins => origins.split(',').map(o => o.trim()).filter(Boolean)),
  TRUST_PROXY: z.string().default('1'),

  // Authentication & Session
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters in development'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters in development'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters in development'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),

  // Storage: Neon Object Storage (S3-compatible) or Local Dev Adapter
  STORAGE_ENDPOINT: z.string().optional().default(process.env.AWS_ENDPOINT_URL_S3 || ''),
  STORAGE_REGION: z.string().default(process.env.AWS_REGION || 'ap-southeast-1'),
  STORAGE_ACCESS_KEY_ID: z.string().optional().default(process.env.AWS_ACCESS_KEY_ID || ''),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional().default(process.env.AWS_SECRET_ACCESS_KEY || ''),
  STORAGE_BUCKET: z.string().default('uploads'),
  STORAGE_PUBLIC_BASE_URL: z.string().optional().default(''),
  STORAGE_FORCE_PATH_STYLE: z.string().optional().default('true')
    .transform(v => v !== 'false'),

  // Order Testing & Expiry
  ALLOW_UNPAID_TEST_ORDERS: z.string().optional().default('false')
    .transform(v => v === 'true'),
  ENABLE_UNPAID_ORDER_EXPIRY: z.string().optional().default('true')
    .transform(v => v !== 'false'),
  UNPAID_ORDER_EXPIRY_MINUTES: z.coerce.number().default(30),

  // Payment: Razorpay
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),

  // Email: Nodemailer (SMTP / Resend)
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('That Jalta Diya <hello@thatjaltadiya.com>'),

  // Admin Credentials & Settings
  ADMIN_EMAIL: z.string().default('admin@thatjaltadiya.com'),
  ADMIN_PASSWORD: z.string().default('Admin@ThatJaltaDiya2026!'),

  // Observability
  SENTRY_DSN: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('CRITICAL: Environment variable validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

/**
 * Pure function to resolve cookie SameSite attribute.
 * Requirements:
 * - 'strict' when explicit or when frontend and backend/cookie domain match same-site
 * - 'lax' fallback
 * - 'none' only allowed when secure=true; throws / refuses 'none' without Secure
 */
export function resolveCookieSameSite({ cookieSameSite, cookieDomain, clientOrigins = [], backendUrl = '', secure = false }) {
  if (cookieSameSite) {
    const val = String(cookieSameSite).toLowerCase().trim();
    if (val === 'none') {
      if (!secure) {
        throw new Error('COOKIE_SAMESITE=none is invalid without secure=true (SameSite=None requires Secure).');
      }
      return 'none';
    }
    if (val === 'strict' || val === 'lax') {
      return val;
    }
  }

  // Auto-detect based on cookieDomain if configured
  if (cookieDomain) {
    const cleanDomain = cookieDomain.startsWith('.') ? cookieDomain.slice(1).toLowerCase() : cookieDomain.toLowerCase();
    const origins = Array.isArray(clientOrigins) ? clientOrigins : [clientOrigins].filter(Boolean);
    const isSameSite = origins.length > 0 && origins.every(o => {
      try {
        const h = new URL(o).hostname.toLowerCase();
        return h === cleanDomain || h.endsWith('.' + cleanDomain);
      } catch {
        return false;
      }
    });
    return isSameSite ? 'strict' : 'lax';
  }

  // Auto-detect based on backendUrl and clientOrigins matching
  if (backendUrl && Array.isArray(clientOrigins) && clientOrigins.length > 0) {
    try {
      const bHost = new URL(backendUrl).hostname.toLowerCase();
      const matchAll = clientOrigins.every(o => {
        try {
          const fHost = new URL(o).hostname.toLowerCase();
          return fHost === bHost;
        } catch {
          return false;
        }
      });
      if (matchAll) return 'strict';
    } catch {
      // fallback to lax
    }
  }

  return 'lax';
}

// Ensure test environment runs strictly against local database
if (env.NODE_ENV === 'test') {
  try {
    const dbUrl = new URL(env.DATABASE_URL);
    const host = dbUrl.hostname.toLowerCase();
    const allowedLocalHosts = ['localhost', '127.0.0.1', '::1', 'host.docker.internal'];
    if (!allowedLocalHosts.includes(host) && !host.endsWith('.local')) {
      console.error(`FATAL: Refusing to run tests against non-local database host "${host}". Test environment requires a local PostgreSQL instance.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('FATAL: Invalid DATABASE_URL in test environment:', err.message);
    process.exit(1);
  }
}

// Resolve COOKIE_SAMESITE dynamically
env.COOKIE_SAMESITE = resolveCookieSameSite({
  cookieSameSite: env.COOKIE_SAMESITE,
  cookieDomain: env.COOKIE_DOMAIN,
  clientOrigins: env.CLIENT_ORIGINS,
  secure: env.NODE_ENV === 'production',
});

/**
 * Fail-Closed Production Security Guards
 */
if (env.NODE_ENV === 'production') {
  const errors = [];

  if (env.ALLOW_UNPAID_TEST_ORDERS) {
    errors.push('ALLOW_UNPAID_TEST_ORDERS cannot be true in production');
  }

  if (env.JWT_ACCESS_SECRET.length < 64) {
    errors.push('JWT_ACCESS_SECRET must be at least 64 random characters in production');
  }

  if (env.JWT_REFRESH_SECRET.length < 64) {
    errors.push('JWT_REFRESH_SECRET must be at least 64 random characters in production');
  }

  if (env.COOKIE_SECRET.length < 32) {
    errors.push('COOKIE_SECRET must be at least 32 random characters in production');
  }

  // SameSite=none must always be paired with Secure (HTTPS) in production
  if (env.COOKIE_SAMESITE === 'none') {
    const hasInsecureOrigin = env.CLIENT_ORIGINS.some(o => !o.startsWith('https://'));
    if (hasInsecureOrigin) {
      errors.push('COOKIE_SAMESITE=none requires HTTPS (Secure) origins in production');
    }
  }

  // Storage must be configured in production
  if (!env.STORAGE_ENDPOINT || !env.STORAGE_ACCESS_KEY_ID || !env.STORAGE_SECRET_ACCESS_KEY || !env.STORAGE_PUBLIC_BASE_URL) {
    errors.push('All STORAGE_* variables (STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_PUBLIC_BASE_URL) are mandatory in production');
  }

  // Origins must be HTTPS in production
  const hasInsecureOrigin = env.CLIENT_ORIGINS.some(o => !o.startsWith('https://'));
  if (hasInsecureOrigin) {
    errors.push('CLIENT_ORIGINS must only contain HTTPS URLs in production');
  }

  // Email service must be configured
  const hasEmail = (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) || env.RESEND_API_KEY;
  if (!hasEmail) {
    errors.push('Email service (SMTP or Resend) must be configured in production for customer verification');
  }

  if (errors.length > 0) {
    console.error('FATAL PRODUCTION CONFIGURATION REFUSED:');
    errors.forEach(e => console.error(`  - ❌ ${e}`));
    process.exit(1);
  }
}

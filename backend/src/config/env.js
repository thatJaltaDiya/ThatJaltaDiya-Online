import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173')
    .transform(origins => origins.split(',').map(o => o.trim()).filter(Boolean)),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),
  CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().default('1x0000000000000000000000000000000AA'),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('product-images'),
  ALLOW_UNPAID_TEST_ORDERS: z.string().optional().default('false')
    .transform(v => v === 'true'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('That Jalta Diya <hello@thatjaltadiya.com>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('CRITICAL: Environment variable validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

// Production safeguards
if (env.NODE_ENV === 'production') {
  if (env.ALLOW_UNPAID_TEST_ORDERS) {
    console.error('FATAL SECURITY VIOLATION: ALLOW_UNPAID_TEST_ORDERS cannot be true in production!');
    process.exit(1);
  }
  if (env.JWT_ACCESS_SECRET.length < 64) {
    console.error('FATAL SECURITY VIOLATION: JWT_ACCESS_SECRET must be at least 64 random bytes in production!');
    process.exit(1);
  }
  if (env.JWT_REFRESH_SECRET.length < 64) {
    console.error('FATAL SECURITY VIOLATION: JWT_REFRESH_SECRET must be at least 64 random bytes in production!');
    process.exit(1);
  }
}

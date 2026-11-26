import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { env } from './env.js';

/**
 * Configure PrismaClient for Neon PostgreSQL:
 * - Neon compute scales to zero on idle; cold starts can take 500ms - 2s
 * - Handles transient P1001 connection drops with retry-with-backoff
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ] : [
      { emit: 'event', level: 'error' },
    ],
  });
};

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

if (env.NODE_ENV === 'development') {
  prisma.$on('error', (e) => {
    logger.error({ err: e }, 'Prisma error event');
  });
}

/**
 * Helper to execute Prisma queries with automatic retry on Neon cold-start/idle wakeups.
 * Catches P1001 (Can't reach database server) and connection reset errors.
 */
export async function withNeonRetry(queryFn, maxRetries = 3, initialDelayMs = 400) {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      return await queryFn();
    } catch (err) {
      attempt++;
      const isConnectionError =
        err.code === 'P1001' || // Can't reach database server
        err.code === 'P1002' || // Database server reached but timed out
        err.message?.includes('Connection terminated') ||
        err.message?.includes('Connection closed') ||
        err.message?.includes('connect ETIMEDOUT') ||
        err.message?.includes('connect ECONNREFUSED');

      if (isConnectionError && attempt < maxRetries) {
        logger.warn(
          { attempt, maxRetries, delay, errCode: err.code, msg: err.message },
          'Neon compute warming up or transient DB connection drop; retrying with backoff...'
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
}

/**
 * Startup database readiness verification with backoff.
 * Returns true if DB is responsive, or false if unreachable after max attempts.
 */
export async function verifyDatabaseReadiness(maxRetries = 5, initialDelayMs = 500) {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, attempts: attempt };
    } catch (err) {
      if (attempt === maxRetries) {
        logger.error({ err }, 'Failed to connect to Neon database after maximum retries');
        return { ok: false, error: err.message, attempts: attempt };
      }
      logger.warn(
        { attempt, maxRetries, delay, err: err.message },
        'Waiting for Neon database compute to wake up...'
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return { ok: false, error: 'Database connection timed out' };
}

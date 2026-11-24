import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { env } from './env.js';

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

import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`✨ That Jalta Diya API server running on port ${PORT} in [${env.NODE_ENV}] mode`);
});

// Graceful Shutdown
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forcefully shutting down due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception encountered');
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection encountered');
  shutdown('UNHANDLED_REJECTION');
});

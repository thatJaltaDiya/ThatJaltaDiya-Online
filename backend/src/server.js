import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { cleanupExpiredUnpaidOrders } from './services/order.service.js';
import { paymentProvider, reconcilePendingRazorpayPayments } from './services/payment/PaymentProvider.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`✨ That Jalta Diya API server running on port ${PORT} in [${env.NODE_ENV}] mode`);
});

// Background interval to cancel abandoned unpaid orders after UNPAID_ORDER_EXPIRY_MINUTES (30 min)
let unpaidOrderExpiryInterval = null;
if (env.ENABLE_UNPAID_ORDER_EXPIRY && env.NODE_ENV !== 'test') {
  unpaidOrderExpiryInterval = setInterval(() => {
    cleanupExpiredUnpaidOrders().catch((err) => {
      logger.error({ err }, 'Scheduled unpaid order expiry cleanup failed');
    });
  }, 5 * 60 * 1000); // Check every 5 minutes
}

// Background interval to reconcile pending Razorpay payments every 15 minutes
let paymentReconcileInterval = null;
if (env.NODE_ENV !== 'test' && paymentProvider.isConfigured()) {
  paymentReconcileInterval = setInterval(() => {
    reconcilePendingRazorpayPayments().catch((err) => {
      logger.error({ err }, 'Scheduled Razorpay payment reconciliation failed');
    });
  }, 15 * 60 * 1000); // Check every 15 minutes
}

// Graceful Shutdown
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  if (unpaidOrderExpiryInterval) {
    clearInterval(unpaidOrderExpiryInterval);
  }
  if (paymentReconcileInterval) {
    clearInterval(paymentReconcileInterval);
  }
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

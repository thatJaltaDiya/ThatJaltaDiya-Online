import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getPublicSiteSettings } from './services/siteSetting.service.js';
import { apiSuccess } from './utils/response.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import productsRoutes from './routes/products.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import cartRoutes from './routes/cart.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import addressesRoutes from './routes/addresses.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import couponsRoutes from './routes/coupons.routes.js';
import contactRoutes from './routes/contact.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';
import adminRoutes from './routes/admin/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Trust proxy for rate limiting & secure cookies behind Cloudflare / reverse proxy
app.set('trust proxy', 1);

// Disable X-Powered-By
app.disable('x-powered-by');

// Request ID tracking
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  res.locals.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Helmet Security Headers & Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        frameSrc: ['https://challenges.cloudflare.com'],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: env.NODE_ENV === 'production' ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    } : false,
  })
);

// Strict CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.CLIENT_ORIGINS.includes(origin) || env.CLIENT_ORIGINS.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy rejection: Origin ${origin} not permitted`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Idempotency-Key',
      'cf-turnstile-response'
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  })
);

// HTTP Parameter Pollution Protection
app.use(hpp());

// Response Compression
app.use(compression());

// Body Parsers with tight limits (10kb default)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Signed Cookie Parser
app.use(cookieParser(env.COOKIE_SECRET));

// Global Rate Limiter
app.use('/api/', globalLimiter);

// Development static uploads fallback
if (env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads-dev')));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// Public store settings
app.get(['/api/v1/settings', '/api/v1/settings/public'], async (req, res, next) => {
  try {
    const settings = await getPublicSiteSettings();
    return apiSuccess(res, settings);
  } catch (err) {
    next(err);
  }
});

// Public customer testimonials
app.get('/api/v1/testimonials', async (req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    return apiSuccess(res, testimonials);
  } catch (err) {
    next(err);
  }
});

// Mount V1 API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/addresses', addressesRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/coupons', couponsRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/webhooks', webhooksRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
      requestId: res.locals.requestId,
    }
  });
});

// Centralized error handling middleware
app.use(errorHandler);

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import hpp from "hpp";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import {
  globalLimiter,
  catalogLimiter,
  sitemapLimiter,
} from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { getPublicSiteSettings } from "./services/siteSetting.service.js";
import { getStorageAdapter } from "./services/storage.service.js";
import { apiSuccess } from "./utils/response.js";

// Import Route Handlers
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import productsRoutes from "./routes/products.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import addressesRoutes from "./routes/addresses.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import couponsRoutes from "./routes/coupons.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Trust proxy for rate limiting & secure cookies behind Cloudflare / reverse proxy
const trustProxyHops = isNaN(Number(env.TRUST_PROXY))
  ? env.TRUST_PROXY
  : Number(env.TRUST_PROXY);
app.set("trust proxy", trustProxyHops);

// Disable X-Powered-By
app.disable("x-powered-by");

// Production HTTPS redirection (exempting /healthz and /readyz for cloud probes)
if (env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.path === "/healthz" || req.path === "/readyz") {
      return next();
    }
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    if (proto !== "https") {
      const host = req.headers.host;
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    next();
  });
}

// Request ID tracking
app.use((req, res, next) => {
  const reqId = req.headers["x-request-id"] || crypto.randomUUID();
  res.locals.requestId = reqId;
  res.setHeader("X-Request-Id", reqId);
  next();
});

// Configure CSP image origins (only allow storage public base origin, self, data, blob)
const allowedImgSrc = ["'self'", "data:", "blob:"];
if (env.STORAGE_PUBLIC_BASE_URL) {
  try {
    const parsedOrigin = new URL(env.STORAGE_PUBLIC_BASE_URL).origin;
    allowedImgSrc.push(parsedOrigin);
  } catch {
    // fallback if relative URL
  }
}
if (env.NODE_ENV !== "production") {
  allowedImgSrc.push("https:");
}

// Helmet Security Headers & Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://checkout.razorpay.com",
        ],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: allowedImgSrc,
        frameSrc: [
          "https://api.razorpay.com",
          "https://checkout.razorpay.com",
        ],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts:
      env.NODE_ENV === "production"
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
  }),
);

// Strict CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        env.CLIENT_ORIGINS.includes(origin) ||
        env.CLIENT_ORIGINS.includes("*")
      ) {
        return callback(null, true);
      }
      const err = new Error(
        `CORS policy rejection: Origin ${origin} not permitted`,
      );
      err.statusCode = 403;
      err.errorCode = "CORS_FORBIDDEN";
      return callback(err, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
      "Idempotency-Key",
      ...(env.NODE_ENV === "test" ? ["x-test-client-ip"] : []),
    ],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86400,
  }),
);

// HTTP Parameter Pollution Protection
app.use(hpp());

// Response Compression
app.use(compression());

// Body Parsers: Raw body for signed payment webhooks; 200kb for admin; 10kb default
app.use("/api/v1/webhooks", express.raw({ type: "application/json", limit: "256kb" }));
app.use("/api/v1/admin", express.json({ limit: "200kb" }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Signed Cookie Parser
app.use(cookieParser(env.COOKIE_SECRET));

// Health Checks
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/readyz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready", database: "connected" });
  } catch {
    res
      .status(503)
      .json({ status: "not_ready", error: "Database service unavailable" });
  }
});

// Legacy health check alias
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// Dynamic XML Sitemap (Cached for 10 minutes with rate limiter)
let cachedSitemapXml = null;
let cachedSitemapTime = 0;
const SITEMAP_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

app.get("/sitemap.xml", sitemapLimiter, async (_req, res, next) => {
  try {
    const now = Date.now();
    if (cachedSitemapXml && now - cachedSitemapTime < SITEMAP_CACHE_DURATION) {
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=600, s-maxage=600");
      res.setHeader("X-Cache", "HIT");
      return res.status(200).send(cachedSitemapXml);
    }

    const baseUrl = env.CLIENT_ORIGINS[0] || "https://thatjaltadiya.com";
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const staticRoutes = [
      "",
      "/shop",
      "/about",
      "/contact",
      "/faq",
      "/shipping-policy",
      "/replacement-policy",
      "/privacy-policy",
      "/terms",
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const route of staticRoutes) {
      xml += `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${route === "" ? "1.0" : "0.8"}</priority>\n  </url>\n`;
    }

    for (const cat of categories) {
      xml += `  <url>\n    <loc>${baseUrl}/shop?category=${cat.slug}</loc>\n    <lastmod>${cat.updatedAt.toISOString().slice(0, 10)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    for (const prod of products) {
      xml += `  <url>\n    <loc>${baseUrl}/products/${prod.slug}</loc>\n    <lastmod>${prod.updatedAt.toISOString().slice(0, 10)}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    }

    xml += `</urlset>`;
    cachedSitemapXml = xml;
    cachedSitemapTime = now;
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=600");
    res.setHeader("X-Cache", "MISS");
    return res.status(200).send(xml);
  } catch (err) {
    next(err);
  }
});

// Rate Limiting: Catalog endpoints get 300/min; general endpoints get 100/min
app.use("/api/v1/products", catalogLimiter);
app.use("/api/v1/categories", catalogLimiter);
app.use(["/api/v1/settings", "/api/v1/settings/public"], catalogLimiter);

// Skip globalLimiter for catalog and public settings paths
app.use("/api/", (req, res, next) => {
  const p = req.path;
  if (
    p.startsWith("/v1/products") ||
    p.startsWith("/v1/categories") ||
    p.startsWith("/v1/settings")
  ) {
    return next();
  }
  return globalLimiter(req, res, next);
});

// Development static uploads fallback
if (env.NODE_ENV !== "production") {
  app.use("/uploads", express.static(path.join(__dirname, "../uploads-dev")));
}

// Public store settings
app.get(
  ["/api/v1/settings", "/api/v1/settings/public"],
  async (_req, res, next) => {
    try {
      const settings = await getPublicSiteSettings();
      return apiSuccess(res, settings);
    } catch (err) {
      next(err);
    }
  },
);

// Public customer testimonials
app.get("/api/v1/testimonials", async (_req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    return apiSuccess(res, testimonials);
  } catch (err) {
    next(err);
  }
});

// Mount V1 API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/products", productsRoutes);
app.use("/api/v1/categories", categoriesRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/addresses", addressesRoutes);
app.use("/api/v1/orders", ordersRoutes);
app.use("/api/v1/coupons", couponsRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/webhooks", webhooksRoutes);
app.use("/api/v1/admin", adminRoutes);

// Serve uploaded images from Neon Object Storage (or local fallback)
app.get("/api/v1/uploads/:key", async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_KEY", message: "Invalid file key." },
      });
    }

    const storage = getStorageAdapter();
    if (typeof storage.getObject === "function") {
      const obj = await storage.getObject(key);
      res.setHeader("Content-Type", obj.contentType);
      res.setHeader("Cache-Control", obj.cacheControl);
      return res.status(200).send(obj.body);
    }

    return res.sendFile(path.join(__dirname, "../uploads-dev", key));
  } catch (err) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Image not found." },
      });
    }
    next(err);
  }
});

// 404 handler for undefined API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
      requestId: res.locals.requestId,
    },
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;

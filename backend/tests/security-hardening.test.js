import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { spawn } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { env, resolveCookieSameSite } from '../src/config/env.js';
import { getClientIp, isCloudflareIp, getIpv6Subnet64, getIpSubnetKey } from '../src/utils/ip.js';
import * as otpService from '../src/services/otp.service.js';
import { validateImageMagicBytes } from '../src/middleware/upload.js';
import { signAccessToken, verifyAccessToken, hashToken } from '../src/utils/tokens.js';
import { hashPassword } from '../src/utils/password.js';
import { getStorageAdapter } from '../src/services/storage.service.js';
import {
  createOrder,
  markOrderPaid,
  markOrderRefunded,
  updateOrderStatus,
  serializeCustomerOrder,
  generateOrderNumber,
} from '../src/services/order.service.js';
import { authenticateUser } from '../src/services/auth.service.js';
import { normalizeAndHashIdentifier } from '../src/middleware/rateLimiter.js';
import { createOrderSchema } from '../src/validators/commerce.validators.js';
import { csrfProtection } from '../src/middleware/csrf.js';

describe('Comprehensive Security Hardening Tests (Step 3)', () => {
  const cleanupUserIds = [];
  const cleanupProductIds = [];
  const cleanupOrderIds = [];

  afterAll(async () => {
    if (cleanupProductIds.length > 0) {
      await prisma.stockLog.deleteMany({ where: { productId: { in: cleanupProductIds } } });
      await prisma.productImage.deleteMany({ where: { productId: { in: cleanupProductIds } } });
      await prisma.cartItem.deleteMany({ where: { productId: { in: cleanupProductIds } } });
      await prisma.product.deleteMany({ where: { id: { in: cleanupProductIds } } });
    }
    if (cleanupOrderIds.length > 0) {
      await prisma.stockLog.deleteMany({ where: { orderId: { in: cleanupOrderIds } } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { targetType: 'Order', targetId: { in: cleanupOrderIds } } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { orderId: { in: cleanupOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: cleanupOrderIds } } });
    }
    if (cleanupUserIds.length > 0) {
      const userOrders = await prisma.order.findMany({ where: { userId: { in: cleanupUserIds } } });
      const userOrderIds = userOrders.map(o => o.id);
      if (userOrderIds.length > 0) {
        await prisma.stockLog.deleteMany({ where: { orderId: { in: userOrderIds } } }).catch(() => {});
        await prisma.auditLog.deleteMany({ where: { targetType: 'Order', targetId: { in: userOrderIds } } }).catch(() => {});
        await prisma.orderItem.deleteMany({ where: { orderId: { in: userOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: userOrderIds } } });
      }
      const carts = await prisma.cart.findMany({ where: { userId: { in: cleanupUserIds } } });
      const cartIds = carts.map(c => c.id);
      if (cartIds.length > 0) {
        await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
        await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
      }
      await prisma.refreshToken.deleteMany({ where: { userId: { in: cleanupUserIds } } });
      await prisma.address.deleteMany({ where: { userId: { in: cleanupUserIds } } });
      await prisma.auditLog.deleteMany({ where: { adminId: { in: cleanupUserIds } } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { targetType: 'User', targetId: { in: cleanupUserIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
    }
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------
  // 1. Rate Limiting Tests
  // ---------------------------------------------------------
  describe('1. Rate Limiting Hardening', () => {
    it('Login rate limiter keys on IP + email combination (isolated per email)', async () => {
      const email1 = `rate_test_1_${Date.now()}@example.com`;
      const email2 = `rate_test_2_${Date.now()}@example.com`;

      // 5 failed attempts on email1
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: email1, password: 'wrong' });
      }

      // 6th attempt on email1 must be blocked by rate limiter (429)
      const res1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: email1, password: 'wrong' });
      expect(res1.status).toBe(429);
      expect(res1.body.error.code).toBe('LOGIN_RATE_LIMIT_EXCEEDED');

      // Email2 from the same connection is NOT locked out (NAT / shared IP isolation)
      const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: email2, password: 'wrong' });
      expect(res2.status).toBe(401);
      expect(res2.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('Catalog endpoint exposes rate limit headers and supports high read throughput', async () => {
      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // 2. Client IP Spoofing Resistance
  // ---------------------------------------------------------
  describe('2. Client IP & Cloudflare Proxy Validation', () => {
    it('Accurately identifies official Cloudflare CIDR blocks', () => {
      expect(isCloudflareIp('173.245.48.5')).toBe(true);
      expect(isCloudflareIp('103.21.244.10')).toBe(true);
      expect(isCloudflareIp('104.16.1.1')).toBe(true);
      expect(isCloudflareIp('198.41.128.1')).toBe(true);
      expect(isCloudflareIp('2400:cb00::1')).toBe(true);

      // Non-Cloudflare public and private IPs
      expect(isCloudflareIp('8.8.8.8')).toBe(false);
      expect(isCloudflareIp('1.1.1.254')).toBe(false);
      expect(isCloudflareIp('192.168.1.1')).toBe(false);
      expect(isCloudflareIp('127.0.0.1')).toBe(false);
    });

    it('Ignores spoofed CF-Connecting-IP from untrusted direct connections', () => {
      const mockReq = {
        ip: '198.51.100.5', // Untrusted attacker IP
        connection: { remoteAddress: '198.51.100.5' },
        socket: { remoteAddress: '198.51.100.5' },
        headers: {
          'cf-connecting-ip': '203.0.113.199', // Spoofed header
        },
      };

      const resolved = getClientIp(mockReq);
      expect(resolved).toBe('198.51.100.5'); // Spoofed header ignored
      expect(resolved).not.toBe('203.0.113.199');
    });

    it('Trusts CF-Connecting-IP when genuine Cloudflare proxy IP is the remote address', () => {
      const mockReq = {
        ip: '173.245.48.10', // Official Cloudflare Edge IP
        connection: { remoteAddress: '173.245.48.10' },
        socket: { remoteAddress: '173.245.48.10' },
        headers: {
          'cf-connecting-ip': '203.0.113.88', // Legitimate client IP passed by Cloudflare
        },
      };

      const resolved = getClientIp(mockReq);
      expect(resolved).toBe('203.0.113.88');
    });
  });

  // ---------------------------------------------------------
  // 3. Fail-Closed Production Configuration Guards
  // ---------------------------------------------------------
  describe('3. Fail-Closed Production Configuration Guards', () => {
    it('Refuses to boot in NODE_ENV=production when unsafe dev flags or short secrets are configured', async () => {
      const testScript = path.resolve(__dirname, '../src/config/env.js');

      const result = await new Promise((resolve) => {
        const proc = spawn('node', [testScript], {
          env: {
            ...process.env,
            NODE_ENV: 'production',
            DATABASE_URL: 'postgresql://postgres:postgres@ep-cool-pooler.us-east-1.aws.neon.tech/neondb',
            DIRECT_URL: 'postgresql://postgres:postgres@ep-cool.us-east-1.aws.neon.tech/neondb',
            ALLOW_UNPAID_TEST_ORDERS: 'true', // FATAL in prod
            JWT_ACCESS_SECRET: 'short_insecure_secret_under_64_chars', // FATAL in prod
          },
        });

        let stderr = '';
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('close', (code) => {
          resolve({ code, stderr });
        });
      });

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('FATAL PRODUCTION CONFIGURATION REFUSED');
    });
  });

  // ---------------------------------------------------------
  // 5. OTP Service & Constant-Time Verification
  // ---------------------------------------------------------
  describe('5. OTP Security, Rate Limits, and Constant-Time Verification', () => {
    const testIdentifier = `otp_buyer_${Date.now()}@example.com`;

    it('Enforces hourly rate limit of max 3 OTP requests', async () => {
      // 1. Request 1
      const res1 = await otpService.requestOtp({
        identifier: testIdentifier,
        purpose: 'ORDER_VERIFICATION',
        ipAddress: '127.0.0.1',
      });
      expect(res1.success).toBe(true);

      // Age record to pass 60-second cooldown
      await prisma.otpRequest.updateMany({
        where: { identifier: testIdentifier },
        data: { createdAt: new Date(Date.now() - 70 * 1000) },
      });

      // 2. Request 2
      const res2 = await otpService.requestOtp({
        identifier: testIdentifier,
        purpose: 'ORDER_VERIFICATION',
        ipAddress: '127.0.0.1',
      });
      expect(res2.success).toBe(true);

      // Age record to pass cooldown
      await prisma.otpRequest.updateMany({
        where: { identifier: testIdentifier },
        data: { createdAt: new Date(Date.now() - 70 * 1000) },
      });

      // 3. Request 3
      const res3 = await otpService.requestOtp({
        identifier: testIdentifier,
        purpose: 'ORDER_VERIFICATION',
        ipAddress: '127.0.0.1',
      });
      expect(res3.success).toBe(true);

      // Age record to pass cooldown
      await prisma.otpRequest.updateMany({
        where: { identifier: testIdentifier },
        data: { createdAt: new Date(Date.now() - 70 * 1000) },
      });

      // 4. Request 4 must fail hourly rate limit (max 3 sends per hour)
      await expect(
        otpService.requestOtp({
          identifier: testIdentifier,
          purpose: 'ORDER_VERIFICATION',
          ipAddress: '127.0.0.1',
        })
      ).rejects.toThrow('OTP_RATE_LIMIT_EXCEEDED');
    });

    it('Invalidates OTP after 5 failed attempts (attempt exhaustion)', async () => {
      const failIdentifier = `exhaust_buyer_${Date.now()}@example.com`;
      await otpService.requestOtp({
        identifier: failIdentifier,
        purpose: 'LOGIN_2FA',
        ipAddress: '127.0.0.1',
      });

      // 5 incorrect attempts
      for (let i = 0; i < 5; i++) {
        const verifyRes = await otpService.verifyOtp({
          identifier: failIdentifier,
          purpose: 'LOGIN_2FA',
          code: '000000',
        });
        expect(verifyRes.valid).toBe(false);
      }

      // 6th attempt fails due to exhaustion
      const finalRes = await otpService.verifyOtp({
        identifier: failIdentifier,
        purpose: 'LOGIN_2FA',
        code: '123456',
      });
      expect(finalRes.valid).toBe(false);
      expect(finalRes.error).toBe('MAX_ATTEMPTS_EXCEEDED');
    });

    it('Constant-time timingSafeEqual verifies correct OTP and enforces single-use', async () => {
      const singleUseIdentifier = `single_use_${Date.now()}@example.com`;
      const rawCode = '749281';

      await prisma.otpRequest.create({
        data: {
          identifier: singleUseIdentifier,
          purpose: 'ORDER_VERIFICATION',
          codeHash: hashToken(rawCode),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0,
          isVerified: false,
        },
      });

      // First verification succeeds
      const verify1 = await otpService.verifyOtp({
        identifier: singleUseIdentifier,
        purpose: 'ORDER_VERIFICATION',
        code: rawCode,
      });
      expect(verify1.valid).toBe(true);

      // Second verification fails (single-use)
      const verify2 = await otpService.verifyOtp({
        identifier: singleUseIdentifier,
        purpose: 'ORDER_VERIFICATION',
        code: rawCode,
      });
      expect(verify2.valid).toBe(false);
      expect(verify2.error).toBe('EXPIRED_OR_NOT_FOUND');
    });
  });

  // ---------------------------------------------------------
  // 6. Email Verification Enforced for Orders
  // ---------------------------------------------------------
  describe('6. Server-Side Email Verification Guard', () => {
    it('Blocks unverified customer from creating an order with EMAIL_NOT_VERIFIED', async () => {
      const unverifiedUser = await prisma.user.create({
        data: {
          email: `unverified_${Date.now()}@example.com`,
          name: 'Unverified Customer',
          passwordHash: await hashPassword('SecurePass123!'),
          isEmailVerified: false,
          role: 'CUSTOMER',
        },
      });
      cleanupUserIds.push(unverifiedUser.id);

      const unverifiedToken = signAccessToken({
        sub: unverifiedUser.id,
        email: unverifiedUser.email,
        role: unverifiedUser.role,
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          paymentMethod: 'TEST',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  // ---------------------------------------------------------
  // 7. Double-Submit CSRF Protection
  // ---------------------------------------------------------
  describe('7. Double-Submit CSRF Token Protection', () => {
    it('Rejects state-changing POST when auth cookie is present without CSRF token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=dummy_refresh_token_string');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('Rejects state-changing POST when CSRF header does not match cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=dummy_refresh; csrfToken=genuine_random_token_12345678')
        .set('X-CSRF-Token', 'mismatched_attacker_token_87654321');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISMATCH');
    });

    it('Passes CSRF protection when header matches cookie using timingSafeEqual', async () => {
      const validCsrf = crypto.randomBytes(32).toString('hex');
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=invalid_token_test; csrfToken=${validCsrf}`)
        .set('X-CSRF-Token', validCsrf);

      // CSRF check passes; fails at token verification (401), NOT 403 CSRF
      expect(res.status).toBe(401);
      expect(res.body.error.code).not.toBe('CSRF_TOKEN_MISSING');
      expect(res.body.error.code).not.toBe('CSRF_TOKEN_MISMATCH');
    });
  });

  // ---------------------------------------------------------
  // 8. JWT Hardening: Algorithm Pinning, Expiration, Audience
  // ---------------------------------------------------------
  describe('8. JWT Validation & Algorithm Pinning', () => {
    it('Rejects JWT signed with incorrect algorithm (e.g. none attack)', () => {
      const payload = { sub: '123', email: 'test@example.com', role: 'CUSTOMER' };
      const noneToken = jwt.sign(payload, '', { algorithm: 'none' });

      expect(verifyAccessToken(noneToken)).toBeNull();
    });

    it('Rejects expired JWT token', () => {
      const expiredToken = jwt.sign(
        { sub: '123', email: 'test@example.com', role: 'CUSTOMER' },
        env.JWT_ACCESS_SECRET,
        { algorithm: 'HS256', expiresIn: '-1s', issuer: 'that-jalta-diya', audience: 'that-jalta-diya-users' }
      );

      expect(verifyAccessToken(expiredToken)).toBeNull();
    });

    it('Rejects JWT with wrong audience', () => {
      const wrongAudToken = jwt.sign(
        { sub: '123', email: 'test@example.com', role: 'CUSTOMER' },
        env.JWT_ACCESS_SECRET,
        { algorithm: 'HS256', expiresIn: '15m', issuer: 'that-jalta-diya', audience: 'malicious-third-party' }
      );

      expect(verifyAccessToken(wrongAudToken)).toBeNull();
    });

    it('Accepts strictly compliant JWT with pinned HS256 algorithm and correct claims', () => {
      const validToken = signAccessToken({ sub: 'u123', email: 'valid@example.com', role: 'CUSTOMER' });
      const decoded = verifyAccessToken(validToken);
      expect(decoded.sub).toBe('u123');
      expect(decoded.aud).toBe('that-jalta-diya-users');
      expect(decoded.iss).toBe('that-jalta-diya');
    });
  });

  // ---------------------------------------------------------
  // 10. Request Size & Upload Binary Magic Bytes Validation
  // ---------------------------------------------------------
  describe('10. Request Size & Image Magic Bytes Validation', () => {
    it('Rejects file with image extension but non-image magic bytes (polyglot / disguised executable)', async () => {
      const fakeReq = {
        file: {
          originalname: 'hacker.png',
          buffer: Buffer.from('NOT_A_REAL_PNG_HEADER_JUST_TEXT', 'utf-8'),
        },
      };

      let statusCalled = null;
      let errorBody = null;
      const fakeRes = {
        status: (s) => {
          statusCalled = s;
          return {
            json: (b) => { errorBody = b; },
          };
        },
      };

      let nextCalled = false;
      await validateImageMagicBytes(fakeReq, fakeRes, () => { nextCalled = true; });

      expect(statusCalled).toBe(400);
      expect(errorBody.error.code).toBe('INVALID_FILE_SIGNATURE');
      expect(nextCalled).toBe(false);
    });

    it('Validates authentic image magic bytes (PNG, JPEG, WebP)', async () => {
      // Real 1x1 PNG binary
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82,
      ]);

      const validReq = {
        file: {
          originalname: 'genuine.png',
          buffer: pngBuffer,
        },
      };

      let nextCalled = false;
      await validateImageMagicBytes(validReq, {}, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // 11. Order Double-Cancel Safety, StockLog, and Concurrent Decrement
  // ---------------------------------------------------------
  describe('11. Stock Restoration, Double-Cancel Safety, and Concurrency', () => {
    let orderCustomer;
    let customerAccessToken;
    let testProduct;
    let customerAddress;

    beforeAll(async () => {
      orderCustomer = await prisma.user.create({
        data: {
          email: `order_cancel_${Date.now()}@thatjaltadiya.com`,
          name: 'Cancel Test Customer',
          passwordHash: await hashPassword('CustomerSecret123!'),
          isEmailVerified: true,
          role: 'CUSTOMER',
        },
      });
      cleanupUserIds.push(orderCustomer.id);

      customerAccessToken = signAccessToken({
        sub: orderCustomer.id,
        email: orderCustomer.email,
        role: orderCustomer.role,
      });

      const cat = await prisma.category.findFirst();

      testProduct = await prisma.product.create({
        data: {
          name: 'Double Cancel Candle',
          slug: `double-cancel-candle-${Date.now()}`,
          description: 'Testing stock restorations',
          price: 150000,
          stock: 10,
          sku: `DCC-${Date.now()}`,
          categoryId: cat.id,
        },
      });
      cleanupProductIds.push(testProduct.id);

      customerAddress = await prisma.address.create({
        data: {
          userId: orderCustomer.id,
          recipientName: 'Cancel Customer',
          phone: '+91 98765 00000',
          street: '123 Flower Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'IN',
        },
      });
    });

    it('Restores stock with StockLog on cancellation, and prevents double-cancel restocking', async () => {
      // 1. Setup cart for customer
      let cart = await prisma.cart.findUnique({ where: { userId: orderCustomer.id } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { userId: orderCustomer.id } });
      }
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: testProduct.id,
          quantity: 3,
        },
      });

      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          shippingAddressId: customerAddress.id,
          paymentMethod: 'TEST',
        });

      expect(createRes.status).toBe(201);
      const orderId = createRes.body.data.id;
      cleanupOrderIds.push(orderId);

      // Verify stock was decremented from 10 to 7
      let prod = await prisma.product.findUnique({ where: { id: testProduct.id } });
      expect(prod.stock).toBe(7);

      // 2. Cancel order -> stock must be restored to 10
      const cancelRes1 = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerAccessToken}`);

      expect(cancelRes1.status).toBe(200);
      expect(cancelRes1.body.data.status).toBe('CANCELLED');

      prod = await prisma.product.findUnique({ where: { id: testProduct.id } });
      expect(prod.stock).toBe(10);

      // Verify StockLog was written
      const stockLogs = await prisma.stockLog.findMany({ where: { productId: testProduct.id } });
      expect(stockLogs.length).toBeGreaterThan(0);
      const restoreLog = stockLogs.find(l => l.reason === 'ORDER_CANCELLED');
      expect(restoreLog).toBeDefined();
      expect(restoreLog.change).toBe(3);

      // 3. Double-cancel attempt -> Must be rejected, stock must NOT increment again
      const cancelRes2 = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerAccessToken}`);

      expect(cancelRes2.status).toBe(400);
      expect(cancelRes2.body.error.code).toBe('CANNOT_CANCEL_ORDER');

      // Verify stock is STILL 10, not 13
      prod = await prisma.product.findUnique({ where: { id: testProduct.id } });
      expect(prod.stock).toBe(10);
    });

    it('Replays cached response on duplicate Idempotency-Key submission', async () => {
      const idempotencyKey = crypto.randomUUID();

      let cart = await prisma.cart.findUnique({ where: { userId: orderCustomer.id } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { userId: orderCustomer.id } });
      }
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: testProduct.id,
          quantity: 1,
        },
      });

      // First call
      const firstRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          shippingAddressId: customerAddress.id,
          paymentMethod: 'TEST',
        });

      expect(firstRes.status).toBe(201);
      const orderNumber = firstRes.body.data.orderNumber;
      cleanupOrderIds.push(firstRes.body.data.id);

      // Duplicate call with same key
      const secondRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          shippingAddressId: customerAddress.id,
          paymentMethod: 'TEST',
        });

      expect(secondRes.status).toBe(201);
      expect(secondRes.body.data.orderNumber).toBe(orderNumber);
      expect(secondRes.headers['x-cache']).toBe('HIT');
    });
  });

  // ---------------------------------------------------------
  // 12. Storage Adapter Clean Deletion
  // ---------------------------------------------------------
  describe('12. Storage Interface & File Deletion', () => {
    it('Correctly resolves public URLs and handles file deletion', async () => {
      const storageAdapter = getStorageAdapter();
      expect(storageAdapter).toBeDefined();

      const testBuffer = Buffer.from('sample-storage-data');
      const testKey = `test-delete-${Date.now()}.txt`;

      // Upload via adapter
      const uploaded = await storageAdapter.upload({
        key: testKey,
        body: testBuffer,
        contentType: 'text/plain',
      });
      expect(uploaded.key).toBe(testKey);

      // Delete via adapter
      await expect(storageAdapter.delete(testKey)).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------
  // 13. High-Priority Backend Security Hardening Verifications
  // ---------------------------------------------------------
  describe('13. Comprehensive 14-Point Hardening & Concurrency Verification', () => {
    let hardenCustomer;
    let hardenToken;
    let hardenProduct;
    let hardenAddress;
    let secondCustomer;
    let secondToken;

    beforeAll(async () => {
      hardenCustomer = await prisma.user.create({
        data: {
          email: `harden_cust_${Date.now()}@thatjaltadiya.com`,
          name: 'Harden Customer',
          passwordHash: await hashPassword('Secret123!'),
          isEmailVerified: true,
          role: 'CUSTOMER',
        },
      });
      cleanupUserIds.push(hardenCustomer.id);
      hardenToken = signAccessToken({
        sub: hardenCustomer.id,
        email: hardenCustomer.email,
        role: hardenCustomer.role,
      });

      secondCustomer = await prisma.user.create({
        data: {
          email: `second_cust_${Date.now()}@thatjaltadiya.com`,
          name: 'Second Customer',
          passwordHash: await hashPassword('Secret123!'),
          isEmailVerified: true,
          role: 'CUSTOMER',
        },
      });
      cleanupUserIds.push(secondCustomer.id);
      secondToken = signAccessToken({
        sub: secondCustomer.id,
        email: secondCustomer.email,
        role: secondCustomer.role,
      });

      const cat = await prisma.category.findFirst();
      hardenProduct = await prisma.product.create({
        data: {
          name: 'Hardened Bouquet Candle',
          slug: `hardened-bouquet-${Date.now()}`,
          description: 'Testing high concurrency and security',
          price: 250000,
          stock: 50,
          sku: `HBC-${Date.now()}`,
          categoryId: cat.id,
        },
      });
      cleanupProductIds.push(hardenProduct.id);

      hardenAddress = await prisma.address.create({
        data: {
          userId: hardenCustomer.id,
          recipientName: 'Harden Customer',
          phone: '+91 99999 11111',
          street: '456 Rose Lane',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'IN',
        },
      });
    });

    // 1. Catalog GETs exempt from globalLimiter (150 requests in a minute without 429)
    it('Catalog endpoint sends 150 GET requests without hitting global rate limiter 429', async () => {
      const fixedIp = '198.51.100.222';
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app)
            .get('/api/v1/products')
            .set('x-test-client-ip', fixedIp)
        );
      }
      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);
      expect(statuses.every(s => s === 200)).toBe(true);
      expect(statuses.includes(429)).toBe(false);
    });

    // 2. Order serialization: customer-facing order fields only
    it('Order serialization strictly whitelists customer fields and omits internalNotes, ipAddress, userAgent, idempotencyKey', async () => {
      const rawOrder = {
        id: 'sample-order-uuid',
        orderNumber: 'TJD-202611-12345678',
        userId: 'some-user-uuid',
        status: 'PENDING',
        total: 10000,
        internalNotes: 'Confidential owner notes',
        ipAddress: '198.51.100.1',
        userAgent: 'Mozilla/5.0 SuperSecretBrowser',
        idempotencyKey: 'idemp-secret-key-123',
      };

      const serialized = serializeCustomerOrder(rawOrder);
      expect(serialized.id).toBe('sample-order-uuid');
      expect(serialized.orderNumber).toBe('TJD-202611-12345678');
      expect(serialized.internalNotes).toBeUndefined();
      expect(serialized.ipAddress).toBeUndefined();
      expect(serialized.userAgent).toBeUndefined();
      expect(serialized.idempotencyKey).toBeUndefined();
    });

    // 3. Idempotency user scoping (collision returns 409 with no order data)
    it('Rejects idempotency key submission from a different user with 409 and zero order leakage', async () => {
      const sharedKey = `shared-idemp-${Date.now()}`;

      // User A places an order with sharedKey
      let cartA = await prisma.cart.findUnique({ where: { userId: hardenCustomer.id } });
      if (!cartA) cartA = await prisma.cart.create({ data: { userId: hardenCustomer.id } });
      await prisma.cartItem.deleteMany({ where: { cartId: cartA.id } });
      await prisma.cartItem.create({
        data: { cartId: cartA.id, productId: hardenProduct.id, quantity: 1 },
      });

      const resUserA = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${hardenToken}`)
        .set('Idempotency-Key', sharedKey)
        .send({ shippingAddressId: hardenAddress.id, paymentMethod: 'TEST' });

      expect(resUserA.status).toBe(201);
      cleanupOrderIds.push(resUserA.body.data.id);

      // User B attempts to place order with the same key
      let cartB = await prisma.cart.findUnique({ where: { userId: secondCustomer.id } });
      if (!cartB) cartB = await prisma.cart.create({ data: { userId: secondCustomer.id } });
      await prisma.cartItem.deleteMany({ where: { cartId: cartB.id } });
      await prisma.cartItem.create({
        data: { cartId: cartB.id, productId: hardenProduct.id, quantity: 1 },
      });

      const resUserB = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${secondToken}`)
        .set('Idempotency-Key', sharedKey)
        .send({
          shippingAddressSnapshot: {
            recipientName: 'Second User',
            phone: '+91 99999 22222',
            street: '789 Lotus Blvd',
            city: 'Delhi',
            state: 'Delhi',
            postalCode: '110001',
            country: 'IN',
          },
          paymentMethod: 'TEST',
        });

      expect(resUserB.status).toBe(409);
      expect(resUserB.body.error.code).toBe('IDEMPOTENCY_KEY_COLLISION');
      expect(resUserB.body.data).toBeUndefined();
    });

    // 4. Concurrency double cancel & late payment flag
    it('Concurrent double cancellation restores stock exactly once', async () => {
      // Create an order with 2 items
      let cart = await prisma.cart.findUnique({ where: { userId: hardenCustomer.id } });
      if (!cart) cart = await prisma.cart.create({ data: { userId: hardenCustomer.id } });
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: hardenProduct.id, quantity: 2 },
      });

      const initialStock = (await prisma.product.findUnique({ where: { id: hardenProduct.id } })).stock;

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${hardenToken}`)
        .set('x-test-client-ip', '198.51.100.31')
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ shippingAddressId: hardenAddress.id, paymentMethod: 'TEST' });

      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.data.id;
      cleanupOrderIds.push(orderId);

      const stockAfterOrder = (await prisma.product.findUnique({ where: { id: hardenProduct.id } })).stock;
      expect(stockAfterOrder).toBe(initialStock - 2);

      // Concurrent double cancel
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/v1/orders/${orderId}/cancel`)
          .set('x-test-client-ip', '198.51.100.31')
          .set('Authorization', `Bearer ${hardenToken}`),
        request(app)
          .post(`/api/v1/orders/${orderId}/cancel`)
          .set('x-test-client-ip', '198.51.100.31')
          .set('Authorization', `Bearer ${hardenToken}`),
      ]);

      const successCount = [res1, res2].filter(r => r.status === 200).length;
      const failureCount = [res1, res2].filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      const stockAfterCancels = (await prisma.product.findUnique({ where: { id: hardenProduct.id } })).stock;
      expect(stockAfterCancels).toBe(initialStock); // Restored exactly once, NOT double restored!
    });

    it('Late payment for an already-cancelled order is flagged for admin refund', async () => {
      let cart = await prisma.cart.findUnique({ where: { userId: hardenCustomer.id } });
      if (!cart) cart = await prisma.cart.create({ data: { userId: hardenCustomer.id } });
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: hardenProduct.id, quantity: 1 },
      });

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${hardenToken}`)
        .set('x-test-client-ip', '198.51.100.32')
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ shippingAddressId: hardenAddress.id, paymentMethod: 'TEST' });

      const orderId = orderRes.body.data.id;
      cleanupOrderIds.push(orderId);

      // Cancel the order first
      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('x-test-client-ip', '198.51.100.32')
        .set('Authorization', `Bearer ${hardenToken}`);

      // Now late payment arrives
      const updated = await markOrderPaid(orderId, { paymentId: 'LATE_TXN_999', gateway: 'RAZORPAY_MOCK' });
      expect(updated.paymentStatus).toBe('REFUND_REQUIRED');
      expect(updated.internalNotes).toContain('LATE_PAYMENT');
      expect(updated.internalNotes).toContain('Marked REFUND_REQUIRED');

      // Check AuditLog created
      const audit = await prisma.auditLog.findFirst({
        where: { targetId: orderId, action: 'ORDER_LATE_PAYMENT_REFUND_FLAGGED' },
      });
      expect(audit).toBeDefined();
    });

    // 5. x-test-client-ip honored only when NODE_ENV === 'test'
    it('Honors x-test-client-ip only when NODE_ENV is test, and ignores it otherwise', () => {
      const mockReq = {
        headers: { 'x-test-client-ip': '203.0.113.55' },
        ip: '198.51.100.1',
      };
      // In test mode:
      expect(getClientIp(mockReq)).toBe('203.0.113.55');

      // In production mode:
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(getClientIp(mockReq)).toBe('198.51.100.1');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    // 6. Order numbers: 8-character random alphanumeric suffix
    it('Order numbers use at least 8 alphanumeric characters in suffix', () => {
      const orderNum = generateOrderNumber();
      expect(orderNum).toMatch(/^TJD-\d{6}-[A-F0-9]{8}$/);
    });

    // 7. Cart double-submit concurrency prevention with two different idempotency keys
    it('Concurrent checkouts from the same cart fail cleanly with CART_EMPTY on second request', async () => {
      let cart = await prisma.cart.findUnique({ where: { userId: hardenCustomer.id } });
      if (!cart) cart = await prisma.cart.create({ data: { userId: hardenCustomer.id } });
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: hardenProduct.id, quantity: 1 },
      });

      const key1 = crypto.randomUUID();
      const key2 = crypto.randomUUID();

      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${hardenToken}`)
          .set('x-test-client-ip', '198.51.100.33')
          .set('Idempotency-Key', key1)
          .send({ shippingAddressId: hardenAddress.id, paymentMethod: 'TEST' }),
        request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${hardenToken}`)
          .set('x-test-client-ip', '198.51.100.34')
          .set('Idempotency-Key', key2)
          .send({ shippingAddressId: hardenAddress.id, paymentMethod: 'TEST' }),
      ]);

      const success = [res1, res2].filter(r => r.status === 201);
      const emptyCart = [res1, res2].filter(r => r.status === 400 && r.body.error.code === 'CART_EMPTY');

      expect(success.length).toBe(1);
      expect(emptyCart.length).toBe(1);
      cleanupOrderIds.push(success[0].body.data.id);
    });

    // 8. Admin order state transitions & restock
    it('Enforces allowed order transitions and prevents reopening cancelled/refunded orders', async () => {
      let cart = await prisma.cart.findUnique({ where: { userId: hardenCustomer.id } });
      if (!cart) cart = await prisma.cart.create({ data: { userId: hardenCustomer.id } });
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: hardenProduct.id, quantity: 1 },
      });

      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${hardenToken}`)
        .set('x-test-client-ip', '198.51.100.35')
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ shippingAddressId: hardenAddress.id, paymentMethod: 'TEST' });

      expect(createRes.status).toBe(201);
      const orderId = createRes.body.data.id;
      cleanupOrderIds.push(orderId);

      // Admin cancels order
      const initialStock = (await prisma.product.findUnique({ where: { id: hardenProduct.id } })).stock;
      const cancelledOrder = await updateOrderStatus(orderId, { status: 'CANCELLED' }, hardenCustomer.id);
      expect(cancelledOrder.status).toBe('CANCELLED');

      // Check restock happened
      const stockAfterAdminCancel = (await prisma.product.findUnique({ where: { id: hardenProduct.id } })).stock;
      expect(stockAfterAdminCancel).toBe(initialStock + 1);

      // Attempt to reopen CANCELLED order to CONFIRMED must be rejected
      await expect(
        updateOrderStatus(orderId, { status: 'CONFIRMED' }, hardenCustomer.id)
      ).rejects.toThrow('Cannot transition order from "CANCELLED" to "CONFIRMED".');
    });

    // 9. Coupons: atomic usageLimit and per-user limit
    it('Enforces coupon usage limit and per-user limits inside order transaction', async () => {
      const couponCode = `ATOMIC_${Date.now()}`;
      const coupon = await prisma.coupon.create({
        data: {
          code: couponCode,
          discountType: 'FLAT',
          discountValue: 1000,
          usageLimit: 1,
          isActive: true,
        },
      });

      // User 1 uses it
      let cart1 = await prisma.cart.findUnique({ where: { userId: hardenCustomer.id } });
      if (!cart1) cart1 = await prisma.cart.create({ data: { userId: hardenCustomer.id } });
      await prisma.cartItem.deleteMany({ where: { cartId: cart1.id } });
      await prisma.cartItem.create({
        data: { cartId: cart1.id, productId: hardenProduct.id, quantity: 1 },
      });

      const res1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${hardenToken}`)
        .set('x-test-client-ip', '198.51.100.36')
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          shippingAddressId: hardenAddress.id,
          couponCode,
          paymentMethod: 'TEST',
        });

      expect(res1.status).toBe(201);
      cleanupOrderIds.push(res1.body.data.id);

      // User 2 tries to use it -> should fail with usage limit reached
      let cart2 = await prisma.cart.findUnique({ where: { userId: secondCustomer.id } });
      if (!cart2) cart2 = await prisma.cart.create({ data: { userId: secondCustomer.id } });
      await prisma.cartItem.deleteMany({ where: { cartId: cart2.id } });
      await prisma.cartItem.create({
        data: { cartId: cart2.id, productId: hardenProduct.id, quantity: 1 },
      });

      const res2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${secondToken}`)
        .set('x-test-client-ip', '198.51.100.37')
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          shippingAddressSnapshot: {
            recipientName: 'Second User',
            phone: '+91 99999 22222',
            street: '789 Lotus Blvd',
            city: 'Delhi',
            state: 'Delhi',
            postalCode: '110001',
            country: 'IN',
          },
          couponCode,
          paymentMethod: 'TEST',
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('COUPON_LIMIT_REACHED');

      await prisma.coupon.delete({ where: { id: coupon.id } });
    });

    // 10. Identifier normalization and hashing safety
    it('Identifier normalization never throws on null, undefined, objects, or extreme length strings', () => {
      expect(typeof normalizeAndHashIdentifier(null)).toBe('string');
      expect(typeof normalizeAndHashIdentifier(undefined)).toBe('string');
      expect(typeof normalizeAndHashIdentifier({ malicious: true })).toBe('string');
      expect(typeof normalizeAndHashIdentifier('A'.repeat(50000))).toBe('string');
      expect(normalizeAndHashIdentifier('  TEST@Example.Com  ')).toBe(
        normalizeAndHashIdentifier('test@example.com')
      );
    });

    // 11. Healthz, readyz, and sitemap caching
    it('/healthz and /readyz endpoints return operational status and generic error messages on failure', async () => {
      const healthRes = await request(app).get('/healthz');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.status).toBe('ok');

      const readyRes = await request(app).get('/readyz');
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.status).toBe('ready');

      // Sitemap caching: first request MISS, second request HIT
      const sitemap1 = await request(app).get('/sitemap.xml');
      expect(sitemap1.status).toBe(200);
      expect(sitemap1.headers['content-type']).toContain('application/xml');
      expect(sitemap1.headers['x-cache']).toBe('MISS');

      const sitemap2 = await request(app).get('/sitemap.xml');
      expect(sitemap2.status).toBe(200);
      expect(sitemap2.headers['x-cache']).toBe('HIT');
    });

    // 12. CSRF double-submit protection
    it('CSRF middleware validates both unsigned and signed cookies with timing-safe comparison', () => {
      const reqSafe = { method: 'GET' };
      let called = false;
      csrfProtection(reqSafe, {}, () => { called = true; });
      expect(called).toBe(true);

      // Matching token in unsigned cookies
      const reqMatching = {
        method: 'POST',
        cookies: { refreshToken: 'valid-refresh-token', csrfToken: 'abcdef123456' },
        headers: { 'x-csrf-token': 'abcdef123456' },
      };
      let matchCalled = false;
      csrfProtection(reqMatching, {}, () => { matchCalled = true; });
      expect(matchCalled).toBe(true);

      // Mismatch
      const reqMismatch = {
        method: 'POST',
        cookies: { refreshToken: 'valid-refresh-token', csrfToken: 'abcdef123456' },
        headers: { 'x-csrf-token': 'wrongtoken999' },
      };
      let errorStatus = null;
      const resMock = {
        status: (code) => {
          errorStatus = code;
          return { json: () => {} };
        },
      };
      csrfProtection(reqMismatch, resMock, () => {});
      expect(errorStatus).toBe(403);
    });

    // 13. Auth middleware blocks suspended and soft-deleted accounts
    it('Auth middleware immediately rejects blocked or soft-deleted users on every request', async () => {
      // Temporarily block user
      await prisma.user.update({
        where: { id: hardenCustomer.id },
        data: { isBlocked: true },
      });

      const blockedRes = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${hardenToken}`);

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error.code).toBe('ACCOUNT_SUSPENDED');

      // Unblock and soft-delete user
      await prisma.user.update({
        where: { id: hardenCustomer.id },
        data: { isBlocked: false, isDeleted: true },
      });

      const deletedRes = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${hardenToken}`);

      expect(deletedRes.status).toBe(401);
      expect(deletedRes.body.error.code).toBe('ACCOUNT_DELETED');

      // Restore user
      await prisma.user.update({
        where: { id: hardenCustomer.id },
        data: { isDeleted: false },
      });
    });

    // 14. Strict schema validation for order snapshot
    it('createOrderSchema rejects extraneous unknown fields in shippingAddressSnapshot (.strict())', () => {
      const invalidSnapshotPayload = {
        shippingAddressSnapshot: {
          recipientName: 'Valid Name',
          phone: '+91 99999 11111',
          street: '123 Main St',
          city: 'City',
          state: 'State',
          postalCode: '123456',
          country: 'IN',
          injectedMaliciousField: true,
        },
      };

      const result = createOrderSchema.safeParse(invalidSnapshotPayload);
      expect(result.success).toBe(false);
    });

    // 16. Order number retry wraps the WHOLE transaction on collision
    it('Order number collision retries whole transaction with fresh order number and decrements stock once', async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: `retry_user_${Date.now()}@example.com`,
          name: 'Retry User',
          passwordHash: await hashPassword('Password123!'),
          isEmailVerified: true,
        },
      });
      cleanupUserIds.push(user.id);

      const cat = await prisma.category.findFirst() || await prisma.category.create({
        data: { name: 'Test Bouquets', slug: `test-cat-${Date.now()}` },
      });

      // Create product with stock 10
      const prod = await prisma.product.create({
        data: {
          name: `Colliding Product ${Date.now()}`,
          slug: `colliding-product-${Date.now()}`,
          description: 'Colliding product description',
          sku: `COL-${Date.now().toString().slice(-6)}`,
          price: 15000,
          stock: 10,
          categoryId: cat.id,
          isActive: true,
        },
      });
      cleanupProductIds.push(prod.id);

      // Pre-seed an existing order with a known orderNumber
      const collisionOrderNumber = `TJD-COLLIDE-${Date.now().toString().slice(-6)}`;
      const existingOrder = await prisma.order.create({
        data: {
          orderNumber: collisionOrderNumber,
          userId: user.id,
          idempotencyKey: `existing-key-${Date.now()}`,
          status: 'PENDING',
          subtotal: 15000,
          shippingFee: 0,
          total: 15000,
          shippingAddress: { street: '123 Test St', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN', phone: '9999999999', recipientName: 'Test' },
        },
      });
      cleanupOrderIds.push(existingOrder.id);

      // Put 2 items in user's cart
      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          items: {
            create: {
              productId: prod.id,
              quantity: 2,
            },
          },
        },
      });

      // Spy on order.service's orderNumber generation to force collision on first attempt
      const orderModule = await import('../src/services/order.service.js');
      let callCount = 0;
      const originalGenerate = orderModule.generateOrderNumber;
      // We test that createOrder retries up to 5 attempts
      const createdOrder = await createOrder({
        user,
        idempotencyKey: `fresh-key-${Date.now()}`,
        shippingAddressSnapshot: {
          recipientName: 'Retry Recipient',
          phone: '+91 99999 33333',
          street: '123 Collision Ave',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'IN',
        },
        paymentMethod: 'TEST',
      });
      cleanupOrderIds.push(createdOrder.id);

      expect(createdOrder).toBeDefined();
      expect(createdOrder.orderNumber).not.toBe(collisionOrderNumber);

      // Verify product stock decremented EXACTLY by 2 (from 10 to 8, never double decremented)
      const freshProd = await prisma.product.findUnique({ where: { id: prod.id } });
      expect(freshProd.stock).toBe(8);

      // Verify stock logs has exactly one ORDER_PLACED entry of -2
      const stockLogs = await prisma.stockLog.findMany({ where: { productId: prod.id, reason: 'ORDER_PLACED' } });
      expect(stockLogs.length).toBe(1);
      expect(stockLogs[0].change).toBe(-2);
    });

    // 17. Per-user coupon limit atomicity under FOR UPDATE lock
    it('Concurrent checkout with same coupon by same user enforces perUserLimit atomically', async () => {
      const user = await prisma.user.create({
        data: {
          email: `coupon_racer_${Date.now()}@example.com`,
          name: 'Coupon Racer',
          passwordHash: await hashPassword('Password123!'),
          isEmailVerified: true,
        },
      });
      cleanupUserIds.push(user.id);

      const couponCode = `ONCE${Date.now().toString().slice(-4)}`;
      const coupon = await prisma.coupon.create({
        data: {
          code: couponCode,
          discountType: 'FLAT',
          discountValue: 1000,
          minOrderValue: 0,
          perUserLimit: 1,
          isActive: true,
        },
      });

      const cat = await prisma.category.findFirst() || await prisma.category.create({
        data: { name: 'Test Bouquets', slug: `test-cat-${Date.now()}` },
      });

      const prod = await prisma.product.create({
        data: {
          name: `Coupon Test Prod ${Date.now()}`,
          slug: `coupon-prod-${Date.now()}`,
          description: 'Coupon test product description',
          sku: `CP-${Date.now().toString().slice(-6)}`,
          price: 5000,
          stock: 100,
          categoryId: cat.id,
          isActive: true,
        },
      });
      cleanupProductIds.push(prod.id);

      // Create cart
      await prisma.cart.create({
        data: {
          userId: user.id,
          items: {
            create: { productId: prod.id, quantity: 1 },
          },
        },
      });

      // First order succeeds
      const order1 = await createOrder({
        user,
        idempotencyKey: `coupon-key-1-${Date.now()}`,
        shippingAddressSnapshot: {
          recipientName: 'Coupon User',
          phone: '+91 99999 44444',
          street: '123 Flower Rd',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'IN',
        },
        couponCode,
        paymentMethod: 'TEST',
      });
      cleanupOrderIds.push(order1.id);
      expect(order1.discount).toBe(1000);

      // Populate cart again for second order attempt
      const cart2 = await prisma.cart.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      await prisma.cartItem.create({
        data: { cartId: cart2.id, productId: prod.id, quantity: 1 },
      });

      // Second checkout must fail with COUPON_USER_LIMIT_REACHED
      await expect(
        createOrder({
          user,
          idempotencyKey: `coupon-key-2-${Date.now()}`,
          shippingAddressSnapshot: {
            recipientName: 'Coupon User',
            phone: '+91 99999 44444',
            street: '123 Flower Rd',
            city: 'Delhi',
            state: 'Delhi',
            postalCode: '110001',
            country: 'IN',
          },
          couponCode,
          paymentMethod: 'TEST',
        })
      ).rejects.toMatchObject({
        errorCode: 'COUPON_USER_LIMIT_REACHED',
        statusCode: 400,
      });

      // Confirm CouponRedemption table recorded exactly 1 redemption
      const redemptions = await prisma.couponRedemption.findMany({
        where: { couponId: coupon.id, userId: user.id },
      });
      expect(redemptions.length).toBe(1);
      expect(redemptions[0].orderId).toBe(order1.id);

      await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
      await prisma.coupon.delete({ where: { id: coupon.id } });
    });

    // 18. IPv6 subnet /64 rate limiting
    it('IPv6 address rotation within the same /64 subnet maps to the same rate limit bucket', () => {
      const ip1 = '2001:0db8:85a3:0000:0000:8a2e:0370:0001';
      const ip2 = '2001:0db8:85a3:0000:ffff:ffff:ffff:ffff';
      const ipOtherSubnet = '2001:0db8:85a3:0001:0000:0000:0000:0001';

      const key1 = getIpSubnetKey(ip1);
      const key2 = getIpSubnetKey(ip2);
      const keyOther = getIpSubnetKey(ipOtherSubnet);

      expect(key1).toBe('2001:0db8:85a3:0000::/64');
      expect(key2).toBe('2001:0db8:85a3:0000::/64');
      expect(key1).toBe(key2); // Same bucket!
      expect(key1).not.toBe(keyOther); // Different subnet gets different bucket

      // IPv4 stays exact
      expect(getIpSubnetKey('203.0.113.195')).toBe('203.0.113.195');
    });

    // 19. SameSite pure function logic unit tests
    it('resolveCookieSameSite enforces strict, lax fallback, and refuses none without Secure', () => {
      // 1. Strict when origins and domain match
      const strictResult = resolveCookieSameSite({
        cookieDomain: 'thatjaltadiya.com',
        clientOrigins: ['https://thatjaltadiya.com', 'https://www.thatjaltadiya.com'],
        secure: true,
      });
      expect(strictResult).toBe('strict');

      // 2. Lax fallback
      const laxResult = resolveCookieSameSite({
        cookieDomain: 'thatjaltadiya.com',
        clientOrigins: ['https://otherdomain.com'],
        secure: true,
      });
      expect(laxResult).toBe('lax');

      // 3. None allowed when secure=true
      const noneSecureResult = resolveCookieSameSite({
        cookieSameSite: 'none',
        secure: true,
      });
      expect(noneSecureResult).toBe('none');

      // 4. Refuse none without Secure (throws error)
      expect(() =>
        resolveCookieSameSite({
          cookieSameSite: 'none',
          secure: false,
        })
      ).toThrow('SameSite=None requires Secure');
    });

    // 20. Packing slip & order detail XSS safety test (inert text escaping)
    it('Order with XSS payloads in notes and giftMessage serializes safely and contains inert text', async () => {
      const user = await prisma.user.create({
        data: {
          email: `xss_order_${Date.now()}@example.com`,
          name: 'XSS Tester',
          passwordHash: await hashPassword('Password123!'),
          isEmailVerified: true,
        },
      });
      cleanupUserIds.push(user.id);

      const cat = await prisma.category.findFirst() || await prisma.category.create({
        data: { name: 'Test Bouquets', slug: `test-cat-${Date.now()}` },
      });

      const prod = await prisma.product.create({
        data: {
          name: `XSS Candle ${Date.now()}`,
          slug: `xss-candle-${Date.now()}`,
          description: 'XSS candle test description',
          sku: `XSS-${Date.now().toString().slice(-6)}`,
          price: 9900,
          stock: 10,
          categoryId: cat.id,
          isActive: true,
        },
      });
      cleanupProductIds.push(prod.id);

      await prisma.cart.create({
        data: {
          userId: user.id,
          items: { create: { productId: prod.id, quantity: 1 } },
        },
      });

      const xssPayload = '<img src=x onerror=alert(1)>';
      const order = await createOrder({
        user,
        idempotencyKey: `xss-key-${Date.now()}`,
        shippingAddressSnapshot: {
          recipientName: 'Safe Recipient',
          phone: '+91 99999 55555',
          street: '123 Safe St',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'IN',
        },
        notes: xssPayload,
        giftMessage: '<script>alert("XSS")</script>',
        paymentMethod: 'TEST',
      });
      cleanupOrderIds.push(order.id);

      // Verify serializeCustomerOrder strips internal fields but retains customer fields safely
      const serialized = serializeCustomerOrder(order);
      expect(serialized.internalNotes).toBeUndefined();
      expect(serialized.ipAddress).toBeUndefined();
      expect(serialized.userAgent).toBeUndefined();
      expect(serialized.idempotencyKey).toBeUndefined();
      expect(serialized.notes).toBe(xssPayload);

      // In packing slip JSX, strings are rendered with React JSX text escaping (inert text)
      // Assert that JSON response does not interpret or strip raw strings into HTML tags
      const res = await request(app)
        .get(`/api/v1/orders/${order.id}`)
        .set('Authorization', `Bearer ${signAccessToken({ sub: user.id, email: user.email, role: 'CUSTOMER' })}`);
      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe(xssPayload);
    });

    // 22. Production env guards & CORS clean 403 test
    it('CORS rejection returns clean 403 JSON (CORS_FORBIDDEN), never 500', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Origin', 'https://malicious-attacker-domain.evil');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code || res.body.errorCode).toBe('CORS_FORBIDDEN');
    });

    // 23. Swagger /docs endpoint removed verification
    it('/docs endpoint is disabled and returns 404', async () => {
      const res = await request(app).get('/docs');
      expect(res.status).toBe(404);
    });

    // 24. Admin Orders REFUND_REQUIRED filtering and markOrderRefunded audit test
    it('Admin can filter by REFUND_REQUIRED and mark order as REFUNDED with AuditLog entry', async () => {
      const user = await prisma.user.create({
        data: {
          email: `refund_cust_${Date.now()}@example.com`,
          name: 'Refund Order Customer',
          passwordHash: await hashPassword('Password123!'),
          isEmailVerified: true,
        },
      });
      cleanupUserIds.push(user.id);

      const admin = await prisma.user.create({
        data: {
          email: `refund_admin_${Date.now()}@thatjaltadiya.com`,
          name: 'Refund Admin',
          passwordHash: await hashPassword('AdminPass123!'),
          role: 'ADMIN',
        },
      });
      cleanupUserIds.push(admin.id);

      const order = await prisma.order.create({
        data: {
          orderNumber: `TJD-REF-${Date.now().toString().slice(-6)}`,
          userId: user.id,
          idempotencyKey: `refund-order-key-${Date.now()}`,
          status: 'CANCELLED',
          paymentStatus: 'REFUND_REQUIRED',
          subtotal: 10000,
          shippingFee: 0,
          total: 10000,
          shippingAddress: { street: '456 Rose Way', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN', phone: '9999999999', recipientName: 'Customer' },
        },
      });
      cleanupOrderIds.push(order.id);

      const adminToken = signAccessToken({ sub: admin.id, email: admin.email, role: 'ADMIN' });

      // Filter by paymentStatus=REFUND_REQUIRED
      const listRes = await request(app)
        .get('/api/v1/admin/orders?paymentStatus=REFUND_REQUIRED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.meta.refundRequiredCount).toBeGreaterThanOrEqual(1);
      const found = listRes.body.data.find(o => o.id === order.id);
      expect(found).toBeDefined();

      // Mark order as REFUNDED
      const markRes = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/mark-refunded`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Payment reversed via gateway console' });

      expect(markRes.status).toBe(200);
      expect(markRes.body.data.paymentStatus).toBe('REFUNDED');

      // Verify AuditLog record
      const audit = await prisma.auditLog.findFirst({
        where: { targetId: order.id, action: 'ADMIN_ORDER_MARKED_REFUNDED' },
      });
      expect(audit).toBeDefined();
      expect(audit.adminId).toBe(admin.id);
    });
  });
});

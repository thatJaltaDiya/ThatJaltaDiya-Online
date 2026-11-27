import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { env } from '../src/config/env.js';
import { TimedMutex } from '../src/utils/mutex.js';
import { hashPassword, verifyPassword } from '../src/utils/password.js';
import { ALLOWED_ORDER_TRANSITIONS } from '../src/services/order.service.js';

describe('Timed Mutex, Admin Login & Local Delivery Order Tests', () => {
  beforeAll(async () => {
    // Test suite setup
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Time-Based Mutex Lock Unit Tests', () => {
    it('acquires and releases a lock for a key', async () => {
      const mutex = new TimedMutex();
      const lockId = await mutex.acquire('test:key:1', { timeoutMs: 1000, ttlMs: 5000 });
      expect(lockId).toBeDefined();
      expect(mutex.isLocked('test:key:1')).toBe(true);

      const released = mutex.release('test:key:1', lockId);
      expect(released).toBe(true);
      expect(mutex.isLocked('test:key:1')).toBe(false);
    });

    it('blocks second concurrent acquire until first is released', async () => {
      const mutex = new TimedMutex();
      const order = [];

      const task1 = mutex.withLock('user:123', { timeoutMs: 2000 }, async () => {
        order.push('task1-start');
        await new Promise((r) => setTimeout(r, 100));
        order.push('task1-end');
      });

      const task2 = mutex.withLock('user:123', { timeoutMs: 2000 }, async () => {
        order.push('task2-start');
        order.push('task2-end');
      });

      await Promise.all([task1, task2]);

      expect(order).toEqual(['task1-start', 'task1-end', 'task2-start', 'task2-end']);
    });

    it('rejects with 429 ORDER_IN_PROGRESS when acquire timeout expires', async () => {
      const mutex = new TimedMutex();

      // Acquire lock with long TTL
      const lockId = await mutex.acquire('user:slow', { timeoutMs: 1000, ttlMs: 10000 });

      // Second acquire with very short timeout should time out
      let caughtError = null;
      try {
        await mutex.acquire('user:slow', { timeoutMs: 100, ttlMs: 5000 });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.statusCode).toBe(429);
      expect(caughtError.errorCode).toBe('ORDER_IN_PROGRESS');

      mutex.release('user:slow', lockId);
    });

    it('auto-releases lock when TTL expires without manual release', async () => {
      const mutex = new TimedMutex();

      // Lock with tiny TTL
      await mutex.acquire('user:short-ttl', { timeoutMs: 500, ttlMs: 50 });
      expect(mutex.isLocked('user:short-ttl')).toBe(true);

      // Wait for TTL to pass
      await new Promise((r) => setTimeout(r, 80));

      expect(mutex.isLocked('user:short-ttl')).toBe(false);

      // Should be able to acquire again immediately
      const newLockId = await mutex.acquire('user:short-ttl', { timeoutMs: 500, ttlMs: 5000 });
      expect(newLockId).toBeDefined();
      mutex.release('user:short-ttl', newLockId);
    });
  });

  describe('2. Admin Login with Env Password and Hashed Comparison', () => {
    it('authenticates admin using env-configured password, comparing with hashed password', async () => {
      const adminEmail = env.ADMIN_EMAIL || 'admin@thatjaltadiya.com';
      const adminPass = env.ADMIN_PASSWORD || 'Admin@ThatJaltaDiya2026!';

      // Ensure admin exists in DB with hashed password
      const hashedPassword = await hashPassword(adminPass);
      await prisma.user.upsert({
        where: { email: adminEmail.toLowerCase() },
        update: { passwordHash: hashedPassword, role: 'ADMIN', isEmailVerified: true },
        create: {
          email: adminEmail.toLowerCase(),
          passwordHash: hashedPassword,
          name: 'Store Owner',
          role: 'ADMIN',
          isEmailVerified: true,
        },
      });

      // Confirm verifyPassword validates input against stored hash
      const isValid = await verifyPassword(hashedPassword, adminPass);
      expect(isValid).toBe(true);

      // Call login endpoint
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPass,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.accessToken).toBeDefined();

      // Verify admin token can access admin dashboard
      const dashRes = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`);

      expect(dashRes.status).toBe(200);
      expect(dashRes.body.success).toBe(true);
      expect(dashRes.body.data).toHaveProperty('totalRevenue');
      expect(dashRes.body.data).toHaveProperty('totalOrders');
      expect(dashRes.body.data).toHaveProperty('salesChart');
    });

    it('rejects admin login with incorrect password', async () => {
      const adminEmail = env.ADMIN_EMAIL || 'admin@thatjaltadiya.com';

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: 'CompletelyWrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Local Delivery Status Transitions (No Delivery Agents)', () => {
    it('allows direct transition from CONFIRMED to DELIVERED for local hand delivery', () => {
      expect(ALLOWED_ORDER_TRANSITIONS.CONFIRMED).toContain('DELIVERED');
      expect(ALLOWED_ORDER_TRANSITIONS.PROCESSING).toContain('DELIVERED');
    });
  });
});

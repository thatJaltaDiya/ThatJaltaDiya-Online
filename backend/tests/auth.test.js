import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Phase 2: Authentication & Security Foundation Tests', () => {
  const testUser = {
    email: `test_buyer_${Date.now()}@example.com`,
    password: 'BuyerSecurePassword123!',
    name: 'Aesthetic Buyer',
    turnstileToken: 'dummy-test-token',
  };

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({
      where: {
        email: { in: [testUser.email, 'another_buyer@example.com'] },
      },
    });
    await prisma.$disconnect();
  });

  it('Health check endpoint returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('Rejects registration with unknown fields (Zod strict validation)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...testUser,
        role: 'ADMIN', // malicious mass assignment attempt
        unknownField: 'hack',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Rejects registration with weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'weakpass@example.com',
        password: 'weak',
        name: 'Weak Pass',
        turnstileToken: 'dummy-test-token',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Registers customer successfully with clean payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.user.isEmailVerified).toBe(false);
  });

  it('Prevents duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('Enforces progressive lockout after 5 failed login attempts', async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    // 6th attempt should hit account lockout (429)
    const lockedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password, // even with correct password
      });

    expect(lockedRes.status).toBe(429);
    expect(lockedRes.body.error.code).toBe('ACCOUNT_LOCKED');

    // Reset lock in DB for subsequent tests
    await prisma.user.update({
      where: { email: testUser.email },
      data: { failedLoginAttempts: 0, lockUntil: null, isEmailVerified: true },
    });
  });

  let authAccessToken = '';
  let authRefreshTokenCookie = '';

  it('Authenticates valid user and returns in-memory access token + httpOnly refresh cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);

    // Verify Set-Cookie header contains refreshToken with HttpOnly and SameSite=Strict
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Strict');

    authAccessToken = res.body.data.accessToken;
    authRefreshTokenCookie = refreshCookie.split(';')[0];
  });

  it('Rotates refresh token and returns new tokens (preventing token reuse)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', authRefreshTokenCookie)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.accessToken).not.toBe(authAccessToken);

    const newCookies = res.headers['set-cookie'];
    const newRefreshCookie = newCookies.find(c => c.startsWith('refreshToken='));
    expect(newRefreshCookie).toBeDefined();

    // Test token reuse: Attempting to use the OLD revoked token must trigger family invalidation
    const reuseAttempt = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', authRefreshTokenCookie)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(reuseAttempt.status).toBe(401);
    expect(reuseAttempt.body.error.code).toBe('TOKEN_REUSE_DETECTED');
  });

  it('Accesses authenticated user profile with Bearer token', async () => {
    // Sign in fresh to get a valid token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.name).toBe(testUser.name);
  });

  it('Blocks unauthenticated requests to protected profile', async () => {
    const res = await request(app).get('/api/v1/user/profile');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

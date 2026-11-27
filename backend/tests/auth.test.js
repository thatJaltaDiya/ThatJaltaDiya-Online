import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/password.js';

describe('Phase 2: Authentication & Security Foundation Tests', () => {
  const testUser = {
    email: `test_buyer_${Date.now()}@example.com`,
    password: 'BuyerSecurePassword123!',
    name: 'Aesthetic Buyer',
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

  let authAccessToken = '';
  let authRefreshTokenCookie = '';
  let authCsrfTokenCookie = '';
  let authCsrfTokenValue = '';

  it('Enforces progressive lockout after 5 failed login attempts', async () => {
    const lockoutEmail = 'lockout-user@thatjaltadiya.com';
    await prisma.user.create({
      data: {
        email: lockoutEmail,
        passwordHash: await hashPassword('CorrectPass123!'),
        name: 'Lockout Test User',
        isEmailVerified: true,
      },
    });

    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: lockoutEmail,
          password: 'WrongPassword123!',
        });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    // 6th attempt should hit rate limit or account lockout (429)
    const lockedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: lockoutEmail,
        password: 'CorrectPass123!',
      });

    expect(lockedRes.status).toBe(429);
    expect(['ACCOUNT_LOCKED', 'LOGIN_RATE_LIMIT_EXCEEDED']).toContain(lockedRes.body.error.code);

    // Clean up lockout user
    await prisma.user.delete({ where: { email: lockoutEmail } });
  });

  it('Rejects login for unverified email and authenticates once verified', async () => {
    const unverifiedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });
    expect(unverifiedRes.status).toBe(403);
    expect(unverifiedRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');

    await prisma.user.update({
      where: { email: testUser.email },
      data: { isEmailVerified: true },
    });

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

    // Verify Set-Cookie header contains refreshToken with HttpOnly and SameSite=Strict/Lax
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');

    const csrfCookie = cookies.find(c => c.startsWith('csrfToken='));
    expect(csrfCookie).toBeDefined();

    authAccessToken = res.body.data.accessToken;
    authRefreshTokenCookie = refreshCookie.split(';')[0];
    authCsrfTokenCookie = csrfCookie.split(';')[0];
    authCsrfTokenValue = authCsrfTokenCookie.split('=')[1];
  });

  it('Rotates refresh token and returns new tokens (preventing token reuse)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${authRefreshTokenCookie}; ${authCsrfTokenCookie}`)
      .set('X-CSRF-Token', authCsrfTokenValue)
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
      .set('Cookie', `${authRefreshTokenCookie}; ${authCsrfTokenCookie}`)
      .set('X-CSRF-Token', authCsrfTokenValue)
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

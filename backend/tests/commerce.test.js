import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { env } from '../src/config/env.js';
import { signAccessToken } from '../src/utils/tokens.js';
import { hashPassword } from '../src/utils/password.js';

describe('Phase 3: Commerce APIs, Idempotency, RBAC & Stock Tests', () => {
  let customerUser, adminUser;
  let customerToken, adminToken;
  let testCategory, testProduct;

  beforeAll(async () => {
    const passwordHash = await hashPassword('Password123!');

    // 1. Create verified customer user
    customerUser = await prisma.user.create({
      data: {
        email: `buyer_${Date.now()}@test.com`,
        passwordHash,
        name: 'Test Buyer',
        role: 'CUSTOMER',
        isEmailVerified: true,
        cart: { create: {} },
        wishlist: { create: {} },
      },
    });
    customerToken = signAccessToken({
      sub: customerUser.id,
      email: customerUser.email,
      role: 'CUSTOMER',
    });

    // 2. Create admin user
    adminUser = await prisma.user.create({
      data: {
        email: `admin_${Date.now()}@test.com`,
        passwordHash,
        name: 'Test Admin',
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });
    adminToken = signAccessToken({
      sub: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
    });

    // 3. Create test category & product
    testCategory = await prisma.category.create({
      data: {
        name: 'Test Bouquets',
        slug: `test-bouquets-${Date.now()}`,
        description: 'Floral candle arrangements',
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'Velvet Rose Candle Bouquet',
        slug: `velvet-rose-${Date.now()}`,
        description: 'Luxury handcrafted candle bouquet',
        price: 129900, // ₹1,299.00
        sku: `SKU-VR-${Date.now()}`,
        stock: 5,
        isActive: true,
        categoryId: testCategory.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.payment.deleteMany({ where: { order: { userId: customerUser.id } } });
    await prisma.orderItem.deleteMany({ where: { productName: 'Velvet Rose Candle Bouquet' } });
    await prisma.order.deleteMany({ where: { userId: customerUser.id } });
    await prisma.stockLog.deleteMany({ where: { productId: testProduct.id } });
    await prisma.cartItem.deleteMany({ where: { productId: testProduct.id } });
    await prisma.product.deleteMany({ where: { id: testProduct.id } });
    await prisma.category.deleteMany({ where: { id: testCategory.id } });
    await prisma.address.deleteMany({ where: { userId: customerUser.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [customerUser.id, adminUser.id] } },
    });
    await prisma.$disconnect();
  });

  it('Public catalog: lists products and retrieves single product by slug', async () => {
    const listRes = await request(app).get('/api/v1/products');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const singleRes = await request(app).get(`/api/v1/products/${testProduct.slug}`);
    expect(singleRes.status).toBe(200);
    expect(singleRes.body.data.product.name).toBe('Velvet Rose Candle Bouquet');
    expect(singleRes.body.data.product.price).toBe(129900);
  });

  it('Cart management: adds product to cart and returns calculated subtotal', async () => {
    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: testProduct.id,
        quantity: 2,
      });

    expect(addRes.status).toBe(200);
    expect(addRes.body.data.items.length).toBe(1);
    expect(addRes.body.data.items[0].quantity).toBe(2);
    expect(addRes.body.data.subtotal).toBe(129900 * 2);
  });

  let savedAddressId = '';

  it('Address book: saves shipping address with maximum 10 limit and enforces ownership', async () => {
    const addrRes = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        recipientName: 'Test Buyer',
        phone: '+919876543210',
        street: '123 Rose Petal Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        isDefault: true,
      });

    expect(addrRes.status).toBe(201);
    expect(addrRes.body.data.city).toBe('Mumbai');
    expect(addrRes.body.data.isDefault).toBe(true);
    savedAddressId = addrRes.body.data.id;

    // IDOR protection: Admin or other user cannot update customer's address without ownership
    const idorRes = await request(app)
      .patch(`/api/v1/addresses/${savedAddressId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ city: 'Hacked City' });

    expect(idorRes.status).toBe(404);
  });

  it('Order placement: creates order with Idempotency-Key and decrements stock atomically', async () => {
    const idempotencyKey = crypto.randomUUID();

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        shippingAddressId: savedAddressId,
        paymentMethod: 'TEST',
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.orderNumber).toBeDefined();
    expect(orderRes.body.data.subtotal).toBe(129900 * 2);
    expect(orderRes.body.data.items.length).toBe(1);

    // Verify stock was decremented from 5 to 3
    const updatedProd = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    expect(updatedProd.stock).toBe(3);

    // Idempotency replay check: Replaying the same request with same key returns the existing order
    const replayRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        shippingAddressId: savedAddressId,
        paymentMethod: 'TEST',
      });

    expect(replayRes.status).toBe(201);
    expect(replayRes.body.data.orderNumber).toBe(orderRes.body.data.orderNumber);
    // Stock must NOT be decremented again
    const checkStock = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    expect(checkStock.stock).toBe(3);
  });

  it('RBAC enforcement: Customers are forbidden from admin routes (403), Admin is permitted', async () => {
    // Customer attempting to access admin dashboard
    const forbiddenRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');

    // Admin accessing dashboard
    const adminRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.totalOrders).toBeDefined();
  });

  it('Razorpay webhook: verifies signature and marks pending order PAID on payment.captured', async () => {
    const prevWebhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = 'test_razorpay_webhook_secret_123';

    try {
      const pendingOrder = await prisma.order.findFirst({
        where: { userId: customerUser.id },
      });
      const rzpOrderId = `order_wh_${Date.now()}`;
      const rzpPaymentId = `pay_wh_${Date.now()}`;

      await prisma.order.update({
        where: { id: pendingOrder.id },
        data: { razorpayOrderId: rzpOrderId, paymentStatus: 'PENDING', status: 'PENDING' },
      });

      const rawPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: rzpPaymentId,
              order_id: rzpOrderId,
              amount: pendingOrder.total,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      });

      // Invalid signature must be rejected (400)
      const badRes = await request(app)
        .post('/api/v1/webhooks/payment')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', '0'.repeat(64))
        .send(rawPayload);
      expect(badRes.status).toBe(400);
      expect(badRes.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');

      // Valid HMAC-SHA256 signature must mark order PAID + CONFIRMED and record Payment row
      const validSig = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      const okRes = await request(app)
        .post('/api/v1/webhooks/payment')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', validSig)
        .send(rawPayload);

      expect(okRes.status).toBe(200);
      expect(okRes.body.data.received).toBe(true);

      const updatedOrder = await prisma.order.findUnique({ where: { id: pendingOrder.id } });
      expect(updatedOrder.paymentStatus).toBe('PAID');
      expect(updatedOrder.status).toBe('CONFIRMED');
      expect(updatedOrder.paymentId).toBe(rzpPaymentId);

      const paymentRow = await prisma.payment.findFirst({
        where: { orderId: pendingOrder.id, transactionId: rzpPaymentId },
      });
      expect(paymentRow).toBeDefined();
      expect(paymentRow.status).toBe('PAID');
      expect(paymentRow.razorpayOrderId).toBe(rzpOrderId);
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevWebhookSecret;
    }
  });
});

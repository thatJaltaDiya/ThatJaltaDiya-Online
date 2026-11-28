import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';

const { sendOrderReplacementRequestEmailMock, actualSendOrderReplacement } = vi.hoisted(() => ({
  sendOrderReplacementRequestEmailMock: vi.fn(),
  actualSendOrderReplacement: { fn: null },
}));

vi.mock('../src/services/email.service.js', async (importOriginal) => {
  const actual = await importOriginal();
  actualSendOrderReplacement.fn = actual.sendOrderReplacementRequestEmail;
  sendOrderReplacementRequestEmailMock.mockImplementation((args) => actual.sendOrderReplacementRequestEmail(args));
  return {
    ...actual,
    sendOrderReplacementRequestEmail: sendOrderReplacementRequestEmailMock,
  };
});

import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signAccessToken } from '../src/utils/tokens.js';
import { hashPassword } from '../src/utils/password.js';

describe('Order Replacement Policy & Email Flow', () => {
  let customerUser;
  let adminUser;
  let customerToken;
  let adminToken;
  let testCategory;
  let testProduct;
  let savedAddress;
  const createdOrderIds = [];

  beforeAll(async () => {
    const passwordHash = await hashPassword('Password123!');
    customerUser = await prisma.user.create({
      data: {
        email: `replace_buyer_${Date.now()}@test.com`,
        passwordHash,
        name: 'Aarav Mehta',
        phone: '+919876543210',
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

    adminUser = await prisma.user.create({
      data: {
        email: `replace_admin_${Date.now()}@test.com`,
        passwordHash,
        name: 'Replace Admin',
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });
    adminToken = signAccessToken({
      sub: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
    });

    testCategory = await prisma.category.create({
      data: {
        name: `Replace Cat ${Date.now()}`,
        slug: `replace-cat-${Date.now()}`,
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'Golden Rose Bouquet Candle',
        slug: `golden-rose-${Date.now()}`,
        description: 'Handcrafted candle',
        price: 129900,
        sku: `RPL-${Date.now()}`,
        stock: 5,
        categoryId: testCategory.id,
      },
    });

    savedAddress = await prisma.address.create({
      data: {
        userId: customerUser.id,
        recipientName: 'Aarav Mehta',
        phone: '+919876543210',
        street: '42 Lotus Enclave',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'IN',
        isDefault: true,
      },
    });
  });

  afterAll(async () => {
    try {
      if (createdOrderIds.length > 0) {
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }
      if (savedAddress) await prisma.address.delete({ where: { id: savedAddress.id } });
      if (testProduct) await prisma.product.delete({ where: { id: testProduct.id } });
      if (testCategory) await prisma.category.delete({ where: { id: testCategory.id } });
      if (customerUser) await prisma.user.delete({ where: { id: customerUser.id } });
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } });
    } catch {
      // ignore cleanup errors
    }
  });

  it('rejects replacement before delivery and emails admin with full details after delivery', async () => {
    const cart = await prisma.cart.findUnique({ where: { userId: customerUser.id } });
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId: testProduct.id, quantity: 1 },
    });

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ shippingAddressId: savedAddress.id, paymentMethod: 'TEST' });

    expect(createRes.status).toBe(201);
    const order = createRes.body.data;
    createdOrderIds.push(order.id);
    expect(order.replacementRequested).toBe(false);

    // 1. Cancel endpoint must no longer exist (404)
    const cancelRes = await request(app)
      .post(`/api/v1/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(cancelRes.status).toBe(404);

    // 2. Replace before DELIVERED must fail cleanly (400) without sending email
    sendOrderReplacementRequestEmailMock.mockClear();
    const earlyReplaceRes = await request(app)
      .post(`/api/v1/orders/${order.id}/replace`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(earlyReplaceRes.status).toBe(400);
    expect(earlyReplaceRes.body.error.code).toBe('REPLACEMENT_NOT_DELIVERED');
    expect(sendOrderReplacementRequestEmailMock).not.toHaveBeenCalled();

    // 3. Deliver the order -> Replace succeeds, sends email to admin with product + customer details
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED' },
    });

    const replaceRes = await request(app)
      .post(`/api/v1/orders/${order.id}/replace`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(replaceRes.status).toBe(200);
    expect(replaceRes.body.data.replacementRequested).toBe(true);
    expect(replaceRes.body.data.internalNotes).toBeUndefined();
    expect(sendOrderReplacementRequestEmailMock).toHaveBeenCalledTimes(1);

    const callArg = sendOrderReplacementRequestEmailMock.mock.calls[0][0];
    expect(callArg.user.name).toBe('Aarav Mehta');
    expect(callArg.user.phone).toBe('+919876543210');
    expect(callArg.user.email).toBe(customerUser.email);
    expect(callArg.order.items[0].productId).toBe(testProduct.id);
    expect(callArg.order.items[0].productName).toBe('Golden Rose Bouquet Candle');
    expect(callArg.order.shippingAddress.street).toBe('42 Lotus Enclave');

    // 4. Duplicate replacement click must be rejected without sending a second email
    const dupRes = await request(app)
      .post(`/api/v1/orders/${order.id}/replace`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error.code).toBe('REPLACEMENT_ALREADY_REQUESTED');
    expect(sendOrderReplacementRequestEmailMock).toHaveBeenCalledTimes(1);

    // 5. Replacement request appears in Admin Dashboard metrics
    const dashRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashRes.status).toBe(200);
    expect(Array.isArray(dashRes.body.data.replacementRequests)).toBe(true);
    expect(dashRes.body.data.replacementRequests.some((r) => r.id === order.id)).toBe(true);
  });
});

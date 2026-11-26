import { prisma } from '../../config/prisma.js';
import { apiSuccess } from '../../utils/response.js';
import * as productService from '../../services/product.service.js';
import * as categoryService from '../../services/category.service.js';
import * as orderService from '../../services/order.service.js';
import * as couponService from '../../services/coupon.service.js';
import * as siteSettingService from '../../services/siteSetting.service.js';
import * as contactService from '../../services/contact.service.js';
import * as demoService from '../../services/demo.service.js';
import { processAndStoreImage } from '../../services/storage.service.js';
import { logAdminAction } from '../../middleware/audit.js';

/**
 * Dashboard Metrics
 */
export async function getDashboard(req, res, next) {
  try {
    const [
      totalOrders,
      pendingOrders,
      revenueResult,
      lowStockProducts,
      recentOrders,
      demoStatus,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'PAID' },
      }),
      prisma.product.findMany({
        where: {
          stock: { lte: 5 },
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, name: true, sku: true, stock: true },
        take: 10,
      }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      demoService.checkDemoDataStatus(),
    ]);

    // Simple 7-day revenue aggregation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pastOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        paymentStatus: 'PAID',
      },
      select: { createdAt: true, total: true },
    });

    const dailySales = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailySales[key] = 0;
    }

    pastOrders.forEach(o => {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (dailySales[key] !== undefined) {
        dailySales[key] += o.total;
      }
    });

    const salesChart = Object.keys(dailySales)
      .sort()
      .map(date => ({ date, amount: dailySales[date] }));

    return apiSuccess(res, {
      totalOrders,
      pendingOrders,
      totalRevenue: revenueResult._sum.total || 0,
      lowStockProducts,
      recentOrders,
      salesChart,
      demoStatus,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Product Management
 */
export async function listProducts(req, res, next) {
  try {
    const result = await productService.listProducts({
      ...req.query,
      includeInactive: true,
    });
    return apiSuccess(res, result.products, 'Products retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body, req.body.images || []);
    await logAdminAction({
      adminId: req.user.id,
      action: 'PRODUCT_CREATE',
      targetType: 'Product',
      targetId: product.id,
      details: { name: product.name, sku: product.sku },
      req,
    });
    return apiSuccess(res, product, 'Product created successfully.', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    await logAdminAction({
      adminId: req.user.id,
      action: 'PRODUCT_UPDATE',
      targetType: 'Product',
      targetId: product.id,
      details: req.body,
      req,
    });
    return apiSuccess(res, product, 'Product updated successfully.');
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    await productService.softDeleteProduct(req.params.id);
    await logAdminAction({
      adminId: req.user.id,
      action: 'PRODUCT_DELETE',
      targetType: 'Product',
      targetId: req.params.id,
      req,
    });
    return apiSuccess(res, null, 'Product deleted.');
  } catch (error) {
    next(error);
  }
}

export async function duplicateProduct(req, res, next) {
  try {
    const duplicated = await productService.duplicateProduct(req.params.id);
    await logAdminAction({
      adminId: req.user.id,
      action: 'PRODUCT_DUPLICATE',
      targetType: 'Product',
      targetId: duplicated.id,
      req,
    });
    return apiSuccess(res, duplicated, 'Product duplicated successfully as draft.', 201);
  } catch (error) {
    next(error);
  }
}

export async function uploadImages(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return apiSuccess(res, [], 'No files uploaded');
    }

    const uploaded = await Promise.all(
      req.files.map(file => processAndStoreImage(file.buffer, file.originalname))
    );

    return apiSuccess(res, uploaded, 'Images uploaded and processed successfully.');
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const { productId, variantId, change, reason, note } = req.body;
    const result = await productService.adjustStock(
      productId,
      variantId,
      change,
      reason,
      note,
      req.user.id
    );

    await logAdminAction({
      adminId: req.user.id,
      action: 'STOCK_ADJUST',
      targetType: 'Product',
      targetId: productId,
      details: { change, reason, note },
      req,
    });

    return apiSuccess(res, result, 'Stock updated successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * Category Management
 */
export async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    await logAdminAction({
      adminId: req.user.id,
      action: 'CATEGORY_CREATE',
      targetType: 'Category',
      targetId: category.id,
      req,
    });
    return apiSuccess(res, category, 'Category created.', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    await logAdminAction({
      adminId: req.user.id,
      action: 'CATEGORY_UPDATE',
      targetType: 'Category',
      targetId: category.id,
      req,
    });
    return apiSuccess(res, category, 'Category updated.');
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    await categoryService.deleteCategory(req.params.id);
    await logAdminAction({
      adminId: req.user.id,
      action: 'CATEGORY_DELETE',
      targetType: 'Category',
      targetId: req.params.id,
      req,
    });
    return apiSuccess(res, null, 'Category deleted.');
  } catch (error) {
    next(error);
  }
}

/**
 * Order Management
 */
export async function listOrders(req, res, next) {
  try {
    const result = await orderService.listAdminOrders(req.query);
    return apiSuccess(res, result.orders, 'Orders retrieved', 200, {
      ...result.pagination,
      refundRequiredCount: result.refundRequiredCount,
    });
  } catch (error) {
    next(error);
  }
}

export async function markOrderRefunded(req, res, next) {
  try {
    const orderId = req.params.id;
    const reason = req.body?.reason || 'Admin processed refund';
    const order = await orderService.markOrderRefunded(orderId, req.user?.id, reason);
    return apiSuccess(res, order, 'Order successfully marked as refunded.');
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        items: true,
      },
    });
    if (!order) {
      return apiSuccess(res, null, 'Order not found', 404);
    }
    return apiSuccess(res, order);
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body, req.user?.id);
    await logAdminAction({
      adminId: req.user.id,
      action: 'ORDER_STATUS_UPDATE',
      targetType: 'Order',
      targetId: order.id,
      details: req.body,
      req,
    });
    return apiSuccess(res, order, 'Order status updated.');
  } catch (error) {
    next(error);
  }
}

/**
 * Customers Management
 */
export async function listCustomers(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isBlocked: true,
          isEmailVerified: true,
          createdAt: true,
          _count: {
            select: { orders: true },
          },
          orders: {
            where: { paymentStatus: 'PAID' },
            select: { total: true },
          },
        },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);

    const enriched = customers.map(c => ({
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      isBlocked: c.isBlocked,
      isEmailVerified: c.isEmailVerified,
      createdAt: c.createdAt,
      orderCount: c._count.orders,
      totalSpent: c.orders.reduce((sum, o) => sum + o.total, 0),
    }));

    return apiSuccess(res, enriched, 'Customers retrieved', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleBlockCustomer(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user || user.role === 'ADMIN') {
      return apiSuccess(res, null, 'Customer not found or invalid target', 404);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isBlocked: !user.isBlocked },
      select: { id: true, email: true, isBlocked: true },
    });

    await logAdminAction({
      adminId: req.user.id,
      action: updated.isBlocked ? 'CUSTOMER_BLOCK' : 'CUSTOMER_UNBLOCK',
      targetType: 'User',
      targetId: updated.id,
      req,
    });

    return apiSuccess(
      res,
      updated,
      updated.isBlocked ? 'Customer blocked.' : 'Customer unblocked.'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Coupon Management
 */
export async function listCoupons(req, res, next) {
  try {
    const coupons = await couponService.listCoupons();
    return apiSuccess(res, coupons);
  } catch (error) {
    next(error);
  }
}

export async function createCoupon(req, res, next) {
  try {
    const coupon = await couponService.createCoupon(req.body);
    await logAdminAction({
      adminId: req.user.id,
      action: 'COUPON_CREATE',
      targetType: 'Coupon',
      targetId: coupon.id,
      req,
    });
    return apiSuccess(res, coupon, 'Coupon created.', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCoupon(req, res, next) {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    await logAdminAction({
      adminId: req.user.id,
      action: 'COUPON_UPDATE',
      targetType: 'Coupon',
      targetId: coupon.id,
      req,
    });
    return apiSuccess(res, coupon, 'Coupon updated.');
  } catch (error) {
    next(error);
  }
}

export async function deleteCoupon(req, res, next) {
  try {
    await couponService.deleteCoupon(req.params.id);
    await logAdminAction({
      adminId: req.user.id,
      action: 'COUPON_DELETE',
      targetType: 'Coupon',
      targetId: req.params.id,
      req,
    });
    return apiSuccess(res, null, 'Coupon deleted.');
  } catch (error) {
    next(error);
  }
}

/**
 * Site Settings
 */
export async function getSettings(req, res, next) {
  try {
    const settings = await siteSettingService.getSiteSettings();
    return apiSuccess(res, settings);
  } catch (error) {
    next(error);
  }
}

export async function updateSetting(req, res, next) {
  try {
    const { key, value, isPublic } = req.body;
    const setting = await siteSettingService.updateSiteSetting(key, value, isPublic);
    await logAdminAction({
      adminId: req.user.id,
      action: 'SETTING_UPDATE',
      targetType: 'SiteSetting',
      targetId: key,
      details: { value },
      req,
    });
    return apiSuccess(res, setting, 'Setting updated.');
  } catch (error) {
    next(error);
  }
}

/**
 * Demo Data Cleanup ("Delete all demo data")
 */
export async function getDemoStatus(req, res, next) {
  try {
    const status = await demoService.checkDemoDataStatus();
    return apiSuccess(res, status);
  } catch (error) {
    next(error);
  }
}

export async function cleanupDemoData(req, res, next) {
  try {
    const result = await demoService.deleteAllDemoData(req.user.id);
    await logAdminAction({
      adminId: req.user.id,
      action: 'DEMO_DATA_CLEANUP',
      targetType: 'DemoData',
      details: result,
      req,
    });
    return apiSuccess(res, result, 'All demo products, categories, and images have been deleted.');
  } catch (error) {
    next(error);
  }
}

/**
 * Contact Inbox
 */
export async function listContactMessages(req, res, next) {
  try {
    const result = await contactService.listContactMessages({
      isRead: req.query.isRead !== undefined ? req.query.isRead === 'true' : null,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    return apiSuccess(res, result.messages, 'Messages retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
}

export async function markContactMessageRead(req, res, next) {
  try {
    const message = await contactService.markMessageRead(req.params.id, req.body.isRead ?? true);
    return apiSuccess(res, message, 'Message updated.');
  } catch (error) {
    next(error);
  }
}

/**
 * Audit Logs
 */
export async function listAuditLogs(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          admin: { select: { email: true, name: true } },
        },
      }),
      prisma.auditLog.count(),
    ]);

    return apiSuccess(res, logs, 'Audit logs retrieved', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin 2FA Management
 */
export async function setup2FA(req, res, next) {
  try {
    const { generate2FASetup } = await import('../../services/twoFactor.service.js');
    const setup = await generate2FASetup(req.user.email);
    return apiSuccess(res, {
      secret: setup.secret,
      qrCodeDataUrl: setup.qrCodeDataUrl,
      plainBackupCodes: setup.plainBackupCodes,
    }, '2FA setup generated. Please scan QR code and confirm with a 6-digit code.');
  } catch (error) {
    next(error);
  }
}

export async function enable2FA(req, res, next) {
  try {
    const { secret, token, plainBackupCodes } = req.body;
    const { verify2FACode } = await import('../../services/twoFactor.service.js');
    const { hashToken } = await import('../../utils/tokens.js');

    const isValid = verify2FACode(secret, token);
    if (!isValid) {
      return apiError(res, 'Invalid 2FA code. Please ensure your authenticator app is synced.', 400, 'INVALID_2FA_TOKEN');
    }

    const hashedCodes = Array.isArray(plainBackupCodes)
      ? plainBackupCodes.map(c => hashToken(String(c).trim().toUpperCase()))
      : [];

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: hashedCodes,
      },
    });

    await logAdminAction({
      adminId: req.user.id,
      action: 'ADMIN_2FA_ENABLED',
      targetType: 'User',
      targetId: req.user.id,
      req,
    });

    const crypto = await import('crypto');
    const { signAccessToken, signRefreshToken, hashToken: hashRefreshToken } = await import('../../utils/tokens.js');
    const { getRefreshCookieOptions, getCsrfCookieOptions } = await import('../auth.controller.js');

    const accessToken = signAccessToken({
      sub: req.user.id,
      email: req.user.email,
      role: 'ADMIN',
    });

    const tokenFamily = crypto.randomUUID();
    const refreshTokenString = signRefreshToken({
      sub: req.user.id,
      family: tokenFamily,
    });

    await prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(refreshTokenString),
        userId: req.user.id,
        family: tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('refreshToken', refreshTokenString, getRefreshCookieOptions());
    res.cookie('csrfToken', csrfToken, getCsrfCookieOptions());

    return apiSuccess(
      res,
      {
        twoFactorEnabled: true,
        token: accessToken,
        accessToken,
        csrfToken,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          isEmailVerified: req.user.isEmailVerified,
        },
      },
      'Two-factor authentication successfully enabled.'
    );
  } catch (error) {
    next(error);
  }
}

export async function disable2FA(req, res, next) {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const { verify2FACode } = await import('../../services/twoFactor.service.js');

    const isValid = verify2FACode(user.twoFactorSecret, token);
    if (!isValid) {
      return apiError(res, 'Invalid 2FA code. Verification required to disable 2FA.', 400, 'INVALID_2FA_TOKEN');
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    await logAdminAction({
      adminId: req.user.id,
      action: 'ADMIN_2FA_DISABLED',
      targetType: 'User',
      targetId: req.user.id,
      req,
    });

    return apiSuccess(res, { twoFactorEnabled: false }, 'Two-factor authentication disabled.');
  } catch (error) {
    next(error);
  }
}

import { Router } from 'express';
import * as adminController from '../../controllers/admin/admin.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { upload, handleUploadErrors, validateImageMagicBytes } from '../../middleware/upload.js';
import * as v from '../../validators/admin.validators.js';

const router = Router();

// Protect ALL admin routes with Auth + Role ADMIN
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Products
router.get('/products', adminController.listProducts);
router.post('/products', validate({ body: v.createProductAdminSchema }), adminController.createProduct);
router.patch('/products/:id', validate({ body: v.updateProductAdminSchema }), adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/products/:id/duplicate', adminController.duplicateProduct);
router.post(
  '/products/upload-images',
  upload.array('images', 8),
  handleUploadErrors,
  validateImageMagicBytes,
  adminController.uploadImages
);
router.post('/products/adjust-stock', validate({ body: v.adjustStockAdminSchema }), adminController.adjustStock);

// Categories
router.post('/categories', validate({ body: v.createCategoryAdminSchema }), adminController.createCategory);
router.patch('/categories/:id', validate({ body: v.updateCategoryAdminSchema }), adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Orders
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', adminController.getOrder);
router.patch('/orders/:id/status', validate({ body: v.updateOrderStatusAdminSchema }), adminController.updateOrderStatus);
router.post('/orders/:id/mark-refunded', adminController.markOrderRefunded);

// Customers
router.get('/customers', adminController.listCustomers);
router.patch('/customers/:id/toggle-block', adminController.toggleBlockCustomer);

// Coupons
router.get('/coupons', adminController.listCoupons);
router.post('/coupons', validate({ body: v.createCouponAdminSchema }), adminController.createCoupon);
router.patch('/coupons/:id', validate({ body: v.updateCouponAdminSchema }), adminController.updateCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

// Site Settings
router.get('/settings', adminController.getSettings);
router.patch('/settings', validate({ body: v.updateSiteSettingAdminSchema }), adminController.updateSetting);

// Danger Zone: Demo Data Management
router.get('/demo-status', adminController.getDemoStatus);
router.post('/demo-cleanup', adminController.cleanupDemoData);

// Contact Messages Inbox
router.get('/contact-messages', adminController.listContactMessages);
router.patch('/contact-messages/:id', adminController.markContactMessageRead);

// Audit Trail
router.get('/audit-logs', adminController.listAuditLogs);

export default router;

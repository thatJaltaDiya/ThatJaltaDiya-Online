import { z } from 'zod';

export const createProductAdminSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().max(200).optional(),
  description: z.string().min(5),
  shortDescription: z.string().max(300).optional().nullable(),
  price: z.number().int().positive('Price must be positive in paise'),
  compareAtPrice: z.number().int().positive().optional().nullable(),
  costPrice: z.number().int().positive().optional().nullable(),
  sku: z.string().min(2).max(50),
  stock: z.number().int().nonnegative().default(0),
  isLowStockAlert: z.boolean().optional().default(true),
  lowStockThreshold: z.number().int().nonnegative().optional().default(5),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  isBestseller: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  categoryId: z.string().uuid(),
  images: z.array(z.object({
    url: z.string(),
    altText: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).optional().default([]),
}).strict();

export const updateProductAdminSchema = createProductAdminSchema.partial().strict();

export const adjustStockAdminSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  change: z.number().int(),
  reason: z.string().min(2).max(100),
  note: z.string().max(255).optional().nullable(),
}).strict();

export const createCategoryAdminSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().optional().nullable(),
}).strict();

export const updateCategoryAdminSchema = createCategoryAdminSchema.partial().strict();

export const updateOrderStatusAdminSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  trackingNumber: z.string().max(100).optional().nullable(),
  courier: z.string().max(100).optional().nullable(),
  internalNotes: z.string().max(1000).optional().nullable(),
}).strict();

export const createCouponAdminSchema = z.object({
  code: z.string().min(3).max(30),
  description: z.string().max(255).optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FLAT']),
  discountValue: z.number().int().positive(),
  minOrderValue: z.number().int().nonnegative().default(0),
  maxDiscount: z.number().int().positive().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
}).strict();

export const updateCouponAdminSchema = createCouponAdminSchema.partial().strict();

export const updateSiteSettingAdminSchema = z.object({
  key: z.string().min(2).max(100),
  value: z.any(),
  isPublic: z.boolean().optional().default(true),
}).strict();

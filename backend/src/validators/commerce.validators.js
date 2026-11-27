import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  category: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popularity', 'name_asc']).optional().default('newest'),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  isFeatured: z.preprocess(v => v === 'true' ? true : v === 'false' ? false : undefined, z.boolean().optional()),
  isBestseller: z.preprocess(v => v === 'true' ? true : v === 'false' ? false : undefined, z.boolean().optional()),
  isNew: z.preprocess(v => v === 'true' ? true : v === 'false' ? false : undefined, z.boolean().optional()),
}).strict();

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(50).default(1),
  guestId: z.string().uuid().optional(),
}).strict();

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(50),
  guestId: z.string().uuid().optional(),
}).strict();

export const createAddressSchema = z.object({
  recipientName: z.string().min(2).max(100),
  phone: z.string().regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number').max(15),
  street: z.string().min(3).max(255),
  apartment: z.string().max(100).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
  country: z.string().max(100).optional().default('IN'),
  isDefault: z.boolean().optional().default(false),
}).strict();

export const updateAddressSchema = createAddressSchema.partial().strict();

export const createOrderSchema = z.object({
  shippingAddressId: z.string().uuid().optional(),
  shippingAddressSnapshot: z.object({
    recipientName: z.string().min(2, 'Recipient name must be at least 2 characters').max(100),
    phone: z.string().regex(/^[0-9+ -]{10,20}$/, 'Please enter a valid 10–15 digit phone number').max(20),
    street: z.string().min(3, 'Street address must be at least 3 characters').max(255),
    apartment: z.string().max(100).optional().nullable(),
    city: z.string().min(2, 'City must be at least 2 characters').max(100),
    state: z.string().min(2, 'State must be at least 2 characters').max(100),
    postalCode: z.string().min(3, 'Postal / PIN code must be at least 3 characters').max(20),
    country: z.string().max(100).default('IN'),
  }).strict().optional(),
  couponCode: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  giftMessage: z.string().max(300).optional().nullable(),
  paymentMethod: z.enum(['TEST', 'RAZORPAY', 'CARD', 'UPI', 'NETBANKING', 'COD']).default('TEST'),
}).strict();

export const validateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.number().int().nonnegative(),
}).strict();

export const contactMessageSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  subject: z.string().max(200).optional(),
  message: z.string().min(10).max(2000),
}).strict();

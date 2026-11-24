import { z } from 'zod';

// Disallow common weak passwords
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '12345678', 'qwertyuiop', 'admin123', 'welcome123',
  'letmein1', 'secret123', 'iloveyou', 'princess', 'football', 'monkey123'
]);

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .refine(val => !COMMON_PASSWORDS.has(val.toLowerCase()), {
    message: 'Password is too common or easily guessable. Please choose a stronger password.',
  });

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255).transform(e => e.trim().toLowerCase()),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  phone: z.string().regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number format').optional(),
  turnstileToken: z.string().optional(),
}).strict();

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255).transform(e => e.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required').max(128),
  turnstileToken: z.string().optional(),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255).transform(e => e.trim().toLowerCase()),
  turnstileToken: z.string().optional(),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: passwordSchema,
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).strict();

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Verification token is required'),
}).strict();

export const resendVerificationSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255).transform(e => e.trim().toLowerCase()),
  turnstileToken: z.string().optional(),
}).strict();

export const sendOtpSchema = z.object({
  identifier: z.string().min(3).max(255),
  purpose: z.enum(['PHONE_VERIFY', 'EMAIL_CHANGE', 'LOGIN']),
  turnstileToken: z.string().optional(),
}).strict();

export const verifyOtpSchema = z.object({
  identifier: z.string().min(3).max(255),
  purpose: z.enum(['PHONE_VERIFY', 'EMAIL_CHANGE', 'LOGIN']),
  code: z.string().length(6, 'OTP must be 6 digits'),
}).strict();

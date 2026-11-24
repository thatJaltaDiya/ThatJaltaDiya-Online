import { z } from 'zod';
import { passwordSchema } from './auth.validators.js';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
}).strict();

export const changePhoneSchema = z.object({
  phone: z.string().regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number format'),
  otpCode: z.string().length(6, 'Verification code must be 6 digits'),
}).strict();

export const changeEmailSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address').max(255),
  otpCode: z.string().length(6, 'Verification code must be 6 digits'),
}).strict();

export const changePasswordUserSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).strict();

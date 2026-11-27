import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter = null;

const smtpHost = env.SMTP_HOST ? env.SMTP_HOST.trim() : '';
const smtpUser = env.SMTP_USER ? env.SMTP_USER.trim() : '';
const smtpPass = env.SMTP_PASS ? env.SMTP_PASS.trim() : '';
const resendApiKey = env.RESEND_API_KEY ? env.RESEND_API_KEY.trim() : '';

if (env.NODE_ENV !== 'test' && smtpHost && smtpUser) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Send an email using configured SMTP, Resend API, or development stub
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!transporter && env.NODE_ENV !== 'test' && resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [to],
          subject,
          html,
          ...(text ? { text } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `Resend API error (${res.status})`);
      }
      logger.info({ messageId: data.id, to, subject }, 'Email sent successfully via Resend');
      return data;
    } catch (error) {
      logger.error({ err: error, to, subject }, 'Failed to deliver email via Resend');
      throw error;
    }
  }

  if (!transporter) {
    logger.info({ to, subject }, 'EMAIL_DEV_STUB: Email sent via mock console transporter');
    if (env.NODE_ENV === 'development') {
      logger.debug({ html: html?.slice(0, 300) }, 'EMAIL_CONTENT_PREVIEW');
    }
    return { messageId: 'mock-' + Date.now() };
  }

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text: text || '',
      html,
    });
    logger.info({ messageId: info.messageId, to, subject }, 'Email sent successfully');
    return info;
  } catch (error) {
    logger.error({ err: error, to, subject }, 'Failed to deliver email');
    throw error;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendVerificationEmail(to, token, name) {
  const safeName = escapeHtml(name || 'there');
  const verifyUrl = `${env.CLIENT_ORIGINS[0]}/verify-email?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #2D0C1E; border-radius: 12px; background-color: #FFFBF5; color: #2D0C1E;">
      <h2 style="font-family: serif; color: #FF3366; margin-top: 0;">Welcome to That Jalta Diya! 🕯️✨</h2>
      <p>Hello ${safeName},</p>
      <p>Thank you for joining our boutique! Please verify your email address to activate your account and start ordering handcrafted candle bouquets.</p>
      <div style="margin: 32px 0;">
        <a href="${verifyUrl}" style="background-color: #FF3366; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: bold; border: 2px solid #2D0C1E; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="font-size: 13px; color: #666;">If you didn't create an account, you can safely ignore this email.</p>
      <p style="font-size: 12px; color: #999;">Or copy-paste this link: ${verifyUrl}</p>
    </div>
  `;
  return sendEmail({ to, subject: 'Verify your email - That Jalta Diya', html });
}

export async function sendPasswordResetEmail(to, token) {
  const resetUrl = `${env.CLIENT_ORIGINS[0]}/reset-password?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #2D0C1E; border-radius: 12px; background-color: #FFFBF5; color: #2D0C1E;">
      <h2 style="font-family: serif; color: #FF3366; margin-top: 0;">Password Reset Request</h2>
      <p>We received a request to reset your password for your That Jalta Diya account.</p>
      <div style="margin: 32px 0;">
        <a href="${resetUrl}" style="background-color: #2D0C1E; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: bold; border: 2px solid #FF3366; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #666;">This link expires in 1 hour. If you did not request this, please change your password immediately.</p>
    </div>
  `;
  return sendEmail({ to, subject: 'Reset your password - That Jalta Diya', html });
}

export async function sendAccountLockoutEmail(to) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #FF3366; border-radius: 12px; background-color: #FFF5F7; color: #2D0C1E;">
      <h2 style="color: #FF3366;">Security Alert: Account Activity Notice</h2>
      <p>We detected multiple failed login attempts on your That Jalta Diya account.</p>
      <p>For your protection, further login attempts are throttled with progressive delays.</p>
      <p>If this wasn't you, we recommend resetting your password immediately.</p>
    </div>
  `;
  return sendEmail({ to, subject: 'Security Alert: Account Security Notice - That Jalta Diya', html });
}

export async function sendOrderConfirmationEmail(to, order) {
  const safeOrderNumber = escapeHtml(order.orderNumber);
  const formattedTotal = (order.total / 100).toFixed(2);
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #2D0C1E; border-radius: 12px; background-color: #FFFBF5; color: #2D0C1E;">
      <h2 style="font-family: serif; color: #FF3366;">Thank you for your order! 🎉</h2>
      <p>Your order <strong>#${safeOrderNumber}</strong> has been received and is being prepared.</p>
      <p><strong>Total Amount:</strong> ₹${formattedTotal}</p>
      <p>You can track your order status in your account dashboard at any time.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Order Confirmed #${safeOrderNumber} - That Jalta Diya`, html });
}

export async function sendOrderStatusUpdateEmail(to, order) {
  const safeOrderNumber = escapeHtml(order.orderNumber);
  const safeStatus = escapeHtml(order.status);
  const safeTracking = escapeHtml(order.trackingNumber || '');
  const safeCourier = escapeHtml(order.courier || 'Courier');
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #2D0C1E; border-radius: 12px; background-color: #FFFBF5; color: #2D0C1E;">
      <h2 style="font-family: serif; color: #FF3366;">Order Status Update</h2>
      <p>Your order <strong>#${safeOrderNumber}</strong> status is now: <strong style="color: #FF3366;">${safeStatus}</strong></p>
      ${safeTracking ? `<p>Tracking Number: <strong>${safeTracking}</strong> (${safeCourier})</p>` : ''}
    </div>
  `;
  return sendEmail({ to, subject: `Update on Order #${safeOrderNumber}: ${safeStatus}`, html });
}

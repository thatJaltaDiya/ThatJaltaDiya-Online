import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

/**
 * Log admin action to the AuditLog table
 */
export async function logAdminAction({
  adminId,
  action,
  targetType,
  targetId = null,
  details = null,
  req = null,
}) {
  try {
    const ipAddress = req ? (req.headers['cf-connecting-ip'] || req.ip) : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    await prisma.auditLog.create({
      data: {
        adminId: adminId || null,
        action,
        targetType,
        targetId: targetId ? String(targetId) : null,
        details: details || {},
        ipAddress: ipAddress ? String(ipAddress) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
      }
    });
  } catch (err) {
    logger.error({ err, action, targetType, targetId }, 'Failed to record audit log');
  }
}

import { verifyAccessToken } from '../utils/tokens.js';
import { prisma } from '../config/prisma.js';
import { apiError } from '../utils/response.js';

/**
 * Authentication Middleware: Validates Bearer access token and attaches req.user
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return apiError(res, 'Authentication required. Please sign in.', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload || !payload.sub) {
    return apiError(res, 'Invalid or expired access token.', 401, 'TOKEN_EXPIRED');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isBlocked: true,
        isDeleted: true,
      }
    });

    if (!user || user.isDeleted) {
      return apiError(res, 'User account no longer exists.', 401, 'ACCOUNT_DELETED');
    }

    if (user.isBlocked) {
      return apiError(res, 'Your account has been suspended. Please contact support.', 403, 'ACCOUNT_SUSPENDED');
    }

    req.user = user;
    req.user.scope = payload.scope || null;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional Authentication: Attaches req.user if a valid token is present, otherwise proceeds
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload || !payload.sub) {
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isBlocked: true,
        isDeleted: true,
      }
    });

    if (user && !user.isDeleted && !user.isBlocked) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
}

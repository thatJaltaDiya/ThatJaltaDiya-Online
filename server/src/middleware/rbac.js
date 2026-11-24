import { apiError } from '../utils/response.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles 
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return apiError(res, 'Authentication required.', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return apiError(res, 'Forbidden: Insufficient administrative privileges.', 403, 'FORBIDDEN');
    }

    next();
  };
}

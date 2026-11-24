import { env } from '../config/env.js';
import { apiSuccess, apiError } from '../utils/response.js';
import * as authService from '../services/auth.service.js';
import * as otpService from '../services/otp.service.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
};

export async function register(req, res, next) {
  try {
    const user = await authService.registerCustomer(req.body);
    return apiSuccess(
      res,
      { user },
      'Registration successful. Please check your email to verify your account.',
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const ipAddress = req.headers['cf-connecting-ip'] || req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await authService.authenticateUser({
      ...req.body,
      ipAddress,
      userAgent,
    });

    res.cookie('refreshToken', result.refreshTokenString, REFRESH_COOKIE_OPTIONS);

    return apiSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'Welcome back!'
    );
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const tokenString = req.cookies?.refreshToken;
    if (!tokenString) {
      return apiError(res, 'Session expired. Please sign in.', 401, 'TOKEN_MISSING');
    }

    const result = await authService.rotateRefreshToken(tokenString);

    res.cookie('refreshToken', result.refreshTokenString, REFRESH_COOKIE_OPTIONS);

    return apiSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'Token refreshed successfully'
    );
  } catch (error) {
    res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const tokenString = req.cookies?.refreshToken;
    if (tokenString) {
      await authService.logoutUser(tokenString);
    }
    res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
    return apiSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const result = await authService.verifyEmailToken(req.body.token);
    return apiSuccess(res, result, 'Email verified successfully! You can now place orders.');
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    await authService.requestPasswordReset(req.body.email);
    return apiSuccess(
      res,
      null,
      'If an account exists with that email, a password reset link has been dispatched.'
    );
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    await authService.executePasswordReset(req.body.token, req.body.password);
    return apiSuccess(res, null, 'Password reset successful. Please sign in with your new password.');
  } catch (error) {
    next(error);
  }
}

export async function sendOtp(req, res, next) {
  try {
    const ipAddress = req.headers['cf-connecting-ip'] || req.ip;
    const result = await otpService.requestOtp({
      ...req.body,
      ipAddress,
    });
    return apiSuccess(res, result, 'Verification code sent.');
  } catch (error) {
    if (error.message === 'OTP_RATE_LIMIT_EXCEEDED') {
      return apiError(res, 'Too many requests. Please wait before requesting another code.', 429, 'OTP_RATE_LIMIT_EXCEEDED');
    }
    if (error.message === 'OTP_COOLDOWN_ACTIVE') {
      return apiError(res, 'Please wait 60 seconds before requesting a new code.', 429, 'OTP_COOLDOWN');
    }
    next(error);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const result = await otpService.verifyOtp(req.body);
    if (!result.valid) {
      return apiError(
        res,
        result.error === 'MAX_ATTEMPTS_EXCEEDED'
          ? 'Too many incorrect attempts. Please request a new code.'
          : 'Invalid or expired verification code.',
        400,
        result.error || 'INVALID_OTP'
      );
    }
    return apiSuccess(res, null, 'Code verified successfully.');
  } catch (error) {
    next(error);
  }
}

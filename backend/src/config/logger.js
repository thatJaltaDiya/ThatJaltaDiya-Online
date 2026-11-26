import winston from 'winston';
import { env } from './env.js';

// Sensitive keys to automatically redact across all log payloads
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'refreshtoken',
  'accesstoken',
  'token',
  'secret',
  'totpcode',
  'backupcode',
  'otpcode',
  'cardnumber',
  'cvv',
  'authorization',
  'cookie',
  'apikey',
]);

/**
 * Recursively sanitize objects to prevent accidental credential leakage in logs
 */
function redactInPlace(obj, seen = new WeakSet()) {
  if (!obj || typeof obj !== 'object') return;
  if (seen.has(obj)) return;
  seen.add(obj);

  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      obj[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      redactInPlace(obj[key], seen);
    }
  }
}

const redactFormat = winston.format((info) => {
  redactInPlace(info);
  return info;
});

function serializeError(err) {
  if (!(err instanceof Error)) return err;
  return {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
  };
}

const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

// Formats based on environment
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  redactFormat(),
  winston.format.json()
);

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  redactFormat(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaEntries = Object.entries(meta).filter(([k]) => typeof k === 'string');
    const metaStr = metaEntries.length > 0 ? ' ' + JSON.stringify(Object.fromEntries(metaEntries)) : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const baseWinstonLogger = winston.createLogger({
  level: isTest ? 'silent' : (isProduction ? 'info' : 'debug'),
  silent: isTest,
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      silent: isTest,
    }),
  ],
});

/**
 * Universal wrapper around Winston logger ensuring full backward compatibility:
 * - Supports Pino style: logger.info({ meta }, 'message')
 * - Supports Winston style: logger.info('message', { meta })
 * - Supports Error objects: logger.error(err, 'message') or logger.error({ err }, 'message')
 * - Supports logger.fatal(...) mapping to error level
 */
function createWinstonProxy(w) {
  const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
  const proxy = {};

  for (const lvl of levels) {
    const targetLevel = lvl === 'fatal' ? 'error' : lvl;
    proxy[lvl] = function (first, second, ...rest) {
      if (isTest) return; // Fast-path in tests

      let message = '';
      let meta = {};

      if (first instanceof Error) {
        message = typeof second === 'string' ? second : first.message;
        meta.err = serializeError(first);
      } else if (typeof first === 'object' && first !== null) {
        message = typeof second === 'string' ? second : (first.message || '');
        meta = { ...first };
        if (first.err instanceof Error) {
          meta.err = serializeError(first.err);
        }
      } else if (typeof first === 'string') {
        message = first;
        if (typeof second === 'object' && second !== null) {
          meta = { ...second };
          if (second.err instanceof Error) {
            meta.err = serializeError(second.err);
          }
        }
      } else {
        message = String(first || '');
      }

      w.log(targetLevel, message, meta);
    };
  }

  proxy.child = (bindings = {}) => createWinstonProxy(w.child(bindings));
  proxy.winston = w;

  return proxy;
}

export const logger = createWinstonProxy(baseWinstonLogger);

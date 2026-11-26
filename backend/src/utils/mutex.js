import crypto from 'crypto';
import { logger } from '../config/logger.js';

/**
 * Time-based Mutex implementation.
 * Ensures mutual exclusion for a given resource key (e.g. order placement per user or cart)
 * with both:
 * 1. An acquisition timeout: how long a concurrent caller will wait before timing out (429/409).
 * 2. An auto-release TTL: locks automatically expire after TTL to prevent permanent deadlocks.
 */
export class TimedMutex {
  constructor() {
    this.locks = new Map();
  }

  /**
   * Acquire a lock for a key.
   * @param {string} key - Unique resource key (e.g. `order:user:${userId}`)
   * @param {object} options
   * @param {number} options.timeoutMs - Maximum time to wait in queue before aborting (default: 5000ms)
   * @param {number} options.ttlMs - Maximum lock hold time before automatic release (default: 15000ms)
   * @returns {Promise<string>} lockId token
   */
  async acquire(key, { timeoutMs = 5000, ttlMs = 15000 } = {}) {
    const startTime = Date.now();
    const lockId = crypto.randomUUID();

    const tryAcquire = () => {
      const existing = this.locks.get(key);
      const now = Date.now();

      // If lock does not exist or has already expired, acquire it
      if (!existing || existing.expiresAt <= now) {
        if (existing?.timer) {
          clearTimeout(existing.timer);
        }

        const timer = setTimeout(() => {
          this.forceRelease(key, lockId);
        }, ttlMs);

        if (timer.unref) {
          timer.unref();
        }

        this.locks.set(key, {
          lockId,
          acquiredAt: now,
          expiresAt: now + ttlMs,
          timer,
        });

        return true;
      }
      return false;
    };

    if (tryAcquire()) {
      return lockId;
    }

    // Wait until lock becomes free or timeoutMs expires
    return new Promise((resolve, reject) => {
      let settled = false;

      const checkInterval = setInterval(() => {
        if (tryAcquire()) {
          cleanup();
          settled = true;
          return resolve(lockId);
        }

        if (Date.now() - startTime >= timeoutMs) {
          cleanup();
          settled = true;
          const error = new Error('An order is currently being processed for your account. Please wait a moment.');
          error.statusCode = 429;
          error.errorCode = 'ORDER_IN_PROGRESS';
          return reject(error);
        }
      }, 50);

      const timeoutTimer = setTimeout(() => {
        if (!settled) {
          cleanup();
          settled = true;
          const error = new Error('An order is currently being processed for your account. Please wait a moment.');
          error.statusCode = 429;
          error.errorCode = 'ORDER_IN_PROGRESS';
          return reject(error);
        }
      }, timeoutMs);

      const cleanup = () => {
        clearInterval(checkInterval);
        clearTimeout(timeoutTimer);
      };
    });
  }

  /**
   * Release a previously acquired lock safely (verifies lockId ownership).
   * @param {string} key
   * @param {string} lockId
   * @returns {boolean}
   */
  release(key, lockId) {
    const existing = this.locks.get(key);
    if (existing && existing.lockId === lockId) {
      if (existing.timer) {
        clearTimeout(existing.timer);
      }
      this.locks.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Internal force release when TTL expires.
   */
  forceRelease(key, lockId) {
    const existing = this.locks.get(key);
    if (existing && existing.lockId === lockId) {
      logger.warn({ key, lockId }, 'Timed mutex lock auto-released due to TTL expiration');
      this.locks.delete(key);
    }
  }

  /**
   * Check if a key is currently locked.
   * @param {string} key
   * @returns {boolean}
   */
  isLocked(key) {
    const existing = this.locks.get(key);
    if (!existing) return false;
    if (existing.expiresAt <= Date.now()) {
      this.locks.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Execute an async function within a timed mutex lock.
   * Guarantees safe release even on error or rejection.
   * @param {string} key
   * @param {object|Function} optionsOrFn
   * @param {Function} [maybeFn]
   */
  async withLock(key, optionsOrFn, maybeFn) {
    const options = typeof optionsOrFn === 'function' ? {} : (optionsOrFn || {});
    const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn;

    if (typeof fn !== 'function') {
      throw new TypeError('withLock requires a function to execute');
    }

    const lockId = await this.acquire(key, options);
    try {
      return await fn();
    } finally {
      this.release(key, lockId);
    }
  }
}

export const orderMutex = new TimedMutex();

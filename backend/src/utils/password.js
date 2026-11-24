import argon2 from 'argon2';
import crypto from 'crypto';

// Dummy hash used to mitigate timing attacks when a user does not exist
// Generated using identical argon2id parameters
let DUMMY_HASH = null;
const getDummyHash = async () => {
  if (!DUMMY_HASH) {
    DUMMY_HASH = await argon2.hash('DummyPassword123!', {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }
  return DUMMY_HASH;
};

// Initialize dummy hash
getDummyHash().catch(() => {});

/**
 * Hash password with argon2id
 */
export async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify password against argon2id hash
 */
export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Perform a dummy verification to prevent user enumeration via timing attacks
 */
export async function performDummyVerification(password) {
  const dummy = await getDummyHash();
  try {
    await argon2.verify(dummy, password);
  } catch {
    // ignore
  }
  return false;
}

/**
 * Constant-time string equality check
 */
export function timingSafeEqualStrings(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Constant time dummy compare
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

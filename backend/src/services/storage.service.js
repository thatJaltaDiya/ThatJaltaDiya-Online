import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { S3StorageAdapter } from './storage/S3StorageAdapter.js';
import { LocalStorageAdapter } from './storage/LocalStorageAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEV_UPLOADS_DIR = path.join(__dirname, '../../uploads-dev');

let currentAdapter = null;

/**
 * Get or initialize the active storage adapter.
 */
export function getStorageAdapter() {
  if (currentAdapter) return currentAdapter;

  const hasS3Config =
    Boolean(env.STORAGE_ENDPOINT) &&
    Boolean(env.STORAGE_ACCESS_KEY_ID) &&
    Boolean(env.STORAGE_SECRET_ACCESS_KEY);

  if (env.NODE_ENV === 'production' || hasS3Config) {
    if (!hasS3Config) {
      throw new Error(
        'FATAL: Neon Object Storage configuration (STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY) is required in production.'
      );
    }
    logger.info('Initializing production S3/Neon Object Storage adapter');
    currentAdapter = new S3StorageAdapter({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      bucket: env.STORAGE_BUCKET,
      publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    });
    return currentAdapter;
  }

  // Development and test fallback
  logger.info({ dir: DEV_UPLOADS_DIR }, 'Using LocalStorageAdapter in development mode');
  currentAdapter = new LocalStorageAdapter(DEV_UPLOADS_DIR);
  return currentAdapter;
}

/**
 * Override adapter for testing (e.g. mocked storage adapter in tests).
 */
export function setStorageAdapter(adapter) {
  currentAdapter = adapter;
}

/**
 * Reset storage adapter instance.
 */
export function resetStorageAdapter() {
  currentAdapter = null;
}

/**
 * Process uploaded image buffer with sharp:
 * - Strips all EXIF metadata and malicious embedded payloads
 * - Converts to optimized WebP
 * - Generates responsive sizes (large 1200px, medium 600px, thumb 250px)
 * - Uploads using active storage adapter
 */
export async function processAndStoreImage(fileBuffer, _originalName = 'image.jpg') {
  const fileId = crypto.randomUUID();
  const storage = getStorageAdapter();

  // Process variants using sharp
  const sharpPipeline = sharp(fileBuffer).rotate();

  const [largeBuffer, mediumBuffer, thumbBuffer] = await Promise.all([
    sharpPipeline
      .clone()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer(),
    sharpPipeline
      .clone()
      .resize({ width: 600, height: 600, fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer(),
    sharpPipeline
      .clone()
      .resize({ width: 250, height: 250, fit: 'cover' })
      .webp({ quality: 75 })
      .toBuffer(),
  ]);

  const largeKey = `${fileId}-lg.webp`;
  const mediumKey = `${fileId}-md.webp`;
  const thumbKey = `${fileId}-th.webp`;

  const [largeRes, mediumRes, thumbRes] = await Promise.all([
    storage.upload({
      key: largeKey,
      body: largeBuffer,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    }),
    storage.upload({
      key: mediumKey,
      body: mediumBuffer,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    }),
    storage.upload({
      key: thumbKey,
      body: thumbBuffer,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    }),
  ]);

  return {
    url: mediumRes.url,
    largeUrl: largeRes.url,
    mediumUrl: mediumRes.url,
    thumbUrl: thumbRes.url,
    storageKey: mediumKey,
    largeKey,
    mediumKey,
    thumbKey,
    isLocal: storage instanceof LocalStorageAdapter,
  };
}

/**
 * Delete image file(s) from active storage adapter.
 */
export async function deleteImageFile(keyOrUrl) {
  if (!keyOrUrl) return false;
  const storage = getStorageAdapter();
  // If it's a URL or path, extract the key filename
  let key = keyOrUrl;
  if (key.includes('/')) {
    key = path.basename(key);
  }
  return await storage.delete(key);
}

/**
 * Delete multiple image files from active storage adapter.
 */
export async function deleteImageFiles(keysOrUrls) {
  if (!Array.isArray(keysOrUrls) || keysOrUrls.length === 0) return 0;
  const storage = getStorageAdapter();
  const keys = keysOrUrls.map((item) => (item.includes('/') ? path.basename(item) : item));
  return await storage.deleteMany(keys);
}

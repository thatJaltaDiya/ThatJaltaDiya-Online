import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEV_UPLOADS_DIR = path.join(__dirname, '../../uploads-dev');

// Ensure dev uploads directory exists
if (!existsSync(DEV_UPLOADS_DIR)) {
  mkdirSync(DEV_UPLOADS_DIR, { recursive: true });
}

/**
 * Process uploaded image buffer with sharp:
 * - Strips all EXIF metadata and malicious payloads
 * - Converts to optimized WebP
 * - Generates responsive sizes (large 1200px, medium 600px, thumb 250px)
 * - Uploads to Supabase Storage or falls back to server/uploads-dev/
 */
export async function processAndStoreImage(fileBuffer, _originalName = 'image.jpg') {
  const fileId = crypto.randomUUID();
  const baseName = `${fileId}`;

  // Process variants using sharp
  const sharpPipeline = sharp(fileBuffer).rotate(); // auto-rotate based on EXIF before stripping

  const [largeBuffer, mediumBuffer, thumbBuffer] = await Promise.all([
    sharpPipeline.clone()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer(),
    sharpPipeline.clone()
      .resize({ width: 600, height: 600, fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer(),
    sharpPipeline.clone()
      .resize({ width: 250, height: 250, fit: 'cover' })
      .webp({ quality: 75 })
      .toBuffer(),
  ]);

  // If Supabase Storage is configured in env
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const uploadToSupabase = async (buffer, filename) => {
        const uploadUrl = `${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_STORAGE_BUCKET}/${filename}`;
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'image/webp',
            'x-upsert': 'true',
          },
          body: buffer,
        });
        if (!res.ok) {
          throw new Error(`Supabase upload error: ${res.statusText}`);
        }
        return `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${filename}`;
      };

      const [largeUrl, mediumUrl, thumbUrl] = await Promise.all([
        uploadToSupabase(largeBuffer, `${baseName}-lg.webp`),
        uploadToSupabase(mediumBuffer, `${baseName}-md.webp`),
        uploadToSupabase(thumbBuffer, `${baseName}-th.webp`),
      ]);

      return {
        url: mediumUrl,
        largeUrl,
        mediumUrl,
        thumbUrl,
        isLocal: false,
      };
    } catch (err) {
      logger.warn({ err }, 'Supabase storage upload failed, falling back to local dev storage');
    }
  }

  // Local development storage fallback
  const largeFile = `${baseName}-lg.webp`;
  const mediumFile = `${baseName}-md.webp`;
  const thumbFile = `${baseName}-th.webp`;

  await Promise.all([
    fs.writeFile(path.join(DEV_UPLOADS_DIR, largeFile), largeBuffer),
    fs.writeFile(path.join(DEV_UPLOADS_DIR, mediumFile), mediumBuffer),
    fs.writeFile(path.join(DEV_UPLOADS_DIR, thumbFile), thumbBuffer),
  ]);

  return {
    url: `/uploads/${mediumFile}`,
    largeUrl: `/uploads/${largeFile}`,
    mediumUrl: `/uploads/${mediumFile}`,
    thumbUrl: `/uploads/${thumbFile}`,
    isLocal: true,
  };
}

/**
 * Delete image file (local dev or Supabase)
 */
export async function deleteImageFile(imageUrl) {
  if (!imageUrl) return;
  try {
    if (imageUrl.startsWith('/uploads/')) {
      const filename = path.basename(imageUrl);
      const filePath = path.join(DEV_UPLOADS_DIR, filename);
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }
    }
  } catch (err) {
    logger.error({ err, imageUrl }, 'Failed to delete image file');
  }
}

import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { apiError } from '../utils/response.js';

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max per file
    files: 8,                  // max 8 images per upload
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error('Invalid file format. Only JPEG, PNG, and WebP images are permitted.');
      error.statusCode = 400;
      error.errorCode = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    cb(null, true);
  },
});

/**
 * Validates real magic numbers (file signature) of uploaded files in memory
 * to prevent disguised non-image files (e.g. polyglots or renamed .exe / .html)
 */
export async function validateImageMagicBytes(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files || files.length === 0) return next();

  for (const file of files) {
    if (!file.buffer) continue;
    const detected = await fileTypeFromBuffer(file.buffer);

    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      return apiError(
        res,
        `File "${file.originalname}" is not a legitimate image. Binary signature mismatch (detected: ${detected?.mime || 'unknown'}).`,
        400,
        'INVALID_FILE_SIGNATURE'
      );
    }
  }

  next();
}

export function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return apiError(res, 'File too large. Maximum size is 5MB.', 400, 'FILE_TOO_LARGE');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return apiError(res, 'Too many files. Maximum is 8 files at once.', 400, 'TOO_MANY_FILES');
    }
    return apiError(res, err.message, 400, 'UPLOAD_ERROR');
  }
  next(err);
}

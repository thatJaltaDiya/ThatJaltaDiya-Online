import multer from 'multer';
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

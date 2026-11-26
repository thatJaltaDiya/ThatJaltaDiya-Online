import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { StorageInterface } from './StorageInterface.js';
import { logger } from '../../config/logger.js';

/**
 * Local Storage Adapter strictly for development and testing.
 * Writes to backend/uploads-dev/.
 */
export class LocalStorageAdapter extends StorageInterface {
  constructor(uploadsDir) {
    super();
    this.uploadsDir = uploadsDir;
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  getPublicUrl(key) {
    if (!key) return '';
    return `/uploads/${key}`;
  }

  async upload({ key, body }) {
    const filePath = path.join(this.uploadsDir, key);
    await fs.writeFile(filePath, body);
    return {
      key,
      url: this.getPublicUrl(key),
    };
  }

  async delete(key) {
    if (!key) return false;
    const cleanKey = path.basename(key);
    const filePath = path.join(this.uploadsDir, cleanKey);
    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }
      return true;
    } catch (err) {
      logger.error({ err, key }, 'Failed to delete local file');
      return false;
    }
  }

  async deleteMany(keys) {
    if (!Array.isArray(keys)) return 0;
    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) count++;
    }
    return count;
  }
}

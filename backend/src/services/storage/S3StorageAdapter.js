import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { StorageInterface } from './StorageInterface.js';
import { logger } from '../../config/logger.js';

/**
 * Generic S3 Storage Adapter compatible with:
 * - Neon Object Storage
 * - Cloudflare R2
 * - AWS S3
 */
export class S3StorageAdapter extends StorageInterface {
  constructor(config) {
    super();
    this.bucket = config.bucket;
    this.publicBaseUrl = (config.publicBaseUrl || '').replace(/\/$/, '');

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle !== false, // Neon requires path-style addressing
    });
  }

  /**
   * Execute an S3 command with exponential backoff on 503 SlowDown / throttling.
   */
  async _executeWithBackoff(commandFn, maxRetries = 4, initialDelayMs = 250) {
    let delay = initialDelayMs;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await commandFn();
      } catch (err) {
        const isThrottled =
          err.$metadata?.httpStatusCode === 503 ||
          err.name === 'SlowDown' ||
          err.name === 'ThrottlingException' ||
          err.code === 'SlowDown';

        if (isThrottled && attempt < maxRetries) {
          logger.warn(
            { attempt, maxRetries, delay, err: err.name },
            'S3 Storage 503 SlowDown received; retrying with backoff...'
          );
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        } else {
          throw err;
        }
      }
    }
  }

  getPublicUrl(key) {
    if (!key) return '';
    if (this.publicBaseUrl && !this.publicBaseUrl.includes('.storage.')) {
      return `${this.publicBaseUrl}/${key}`;
    }
    return `/api/v1/uploads/${key}`;
  }

  async getObject(key) {
    if (!key) return null;
    const response = await this._executeWithBackoff(async () => {
      return await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    });
    const bytes = await response.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: response.ContentType || 'application/octet-stream',
      cacheControl: response.CacheControl || 'public, max-age=31536000, immutable',
    };
  }

  async upload({ key, body, contentType, cacheControl = 'public, max-age=31536000, immutable' }) {
    await this._executeWithBackoff(async () => {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      });
      return await this.client.send(command);
    });

    return {
      key,
      url: this.getPublicUrl(key),
    };
  }

  async delete(key) {
    if (!key) return false;
    try {
      await this._executeWithBackoff(async () => {
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        return await this.client.send(command);
      });
      return true;
    } catch (err) {
      logger.error({ err, key }, 'Failed to delete object from S3 storage');
      return false;
    }
  }

  async deleteMany(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return 0;
    let deletedCount = 0;
    // Neon supports DeleteObject individually; loop with concurrent limit
    const batchSize = 10;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const results = await Promise.all(batch.map((k) => this.delete(k)));
      deletedCount += results.filter(Boolean).length;
    }
    return deletedCount;
  }

  async exists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  async list(prefix = '', maxKeys = 100) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });
    const res = await this.client.send(command);
    return res.Contents || [];
  }
}

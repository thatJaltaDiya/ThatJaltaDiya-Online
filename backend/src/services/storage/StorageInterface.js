/**
 * Storage Interface defining the contract for file storage adapters.
 */
export class StorageInterface {
  /**
   * Upload a file buffer to storage.
   * @param {Object} params
   * @param {string} params.key - Unique object storage key (e.g. "p-123-lg.webp")
   * @param {Buffer} params.body - File buffer
   * @param {string} params.contentType - MIME type (e.g. "image/webp")
   * @param {string} [params.cacheControl] - Cache-Control header
   * @returns {Promise<{ key: string, url: string }>}
   */
  async upload({ key: _key, body: _body, contentType: _contentType, cacheControl: _cacheControl }) {
    throw new Error('upload() must be implemented by storage adapter');
  }

  /**
   * Delete a single object by key.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async delete(_key) {
    throw new Error('delete() must be implemented by storage adapter');
  }

  /**
   * Delete multiple objects by keys.
   * @param {string[]} keys
   * @returns {Promise<number>} Number of successfully deleted objects
   */
  async deleteMany(_keys) {
    throw new Error('deleteMany() must be implemented by storage adapter');
  }

  /**
   * Get the publicly accessible CDN URL for an object key.
   * @param {string} key
   * @returns {string}
   */
  getPublicUrl(_key) {
    throw new Error('getPublicUrl() must be implemented by storage adapter');
  }
}

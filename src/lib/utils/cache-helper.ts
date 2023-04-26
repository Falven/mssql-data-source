import crypto from 'crypto';

import type { KeyValueCache } from '@apollo/utils.keyvaluecache';

export class CacheHelper<T> {
  /**
   * Constructs a new CacheHelper instance.
   * @param _cache The cache to be used for storing and retrieving T
   */
  constructor(private readonly _cache: KeyValueCache<T>) {}

  /**
   * Returns the hash of the given key using the SHA1 algorithm.
   * This is used to generate unique cache keys for storing T.
   *
   * @param key The string to be hashed
   * @returns The hashed key as a base64 string
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha1').update(key).digest('base64');
  }

  /**
   * Attempts to retrieve the cached T for the given key.
   * @param keyToHash The key to be hashed and used to lookup the cached T
   * @returns The cached T if it exists, otherwise undefined
   */
  public async tryGetFromCache(keyToHash: string): Promise<T | undefined> {
    const key = this.hashKey(keyToHash);
    return await this._cache.get(key);
  }

  /**
   * Caches the given T using the given key.
   * @param keyToHash The key to be hashed and used to store the T
   * @param result The result to be cached
   */
  public async addToCache(keyToHash: string, obj: T): Promise<void> {
    const key = this.hashKey(keyToHash);
    await this._cache.set(key, obj);
  }
}

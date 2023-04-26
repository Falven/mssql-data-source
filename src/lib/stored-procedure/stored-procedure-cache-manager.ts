import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';

import { CacheHelper } from '../utils';

/**
 * A class that manages the global cache for stored procedures.
 */
export class StoredProcedureCacheManager {
  private static _globalCache: CacheHelper<object>;

  private static get defaultCache(): InMemoryLRUCache<object> {
    return new InMemoryLRUCache<object>({
      // Default TTL is 3600000 ms or 1 hour.
      ttl: 60 * 60 * 1000,
      ttlAutopurge: false,
    });
  }

  private static get globalCache(): CacheHelper<object> {
    if (this._globalCache === undefined) {
      this._globalCache = new CacheHelper(StoredProcedureCacheManager.defaultCache);
    }
    return this._globalCache;
  }

  /**
   * Attempts to retrieve the cached object from the global cache for the given key.
   * @param keyToHash The key to be hashed and used to lookup the cached object
   * @returns The cached object if it exists, otherwise undefined
   */
  public async tryGetFromCache(keyToHash: string): Promise<object | undefined> {
    return await StoredProcedureCacheManager.globalCache.tryGetFromCache(keyToHash);
  }

  /**
   * Caches the given result in the global cache using the given key.
   * @param keyToHash The key to be hashed and used to store the result
   * @param result The result to be cached
   */
  public async addToCache(keyToHash: string, result: object): Promise<void> {
    await StoredProcedureCacheManager.globalCache.addToCache(keyToHash, result);
  }
}

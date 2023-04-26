import { InMemoryLRUCache, type KeyValueCache } from '@apollo/utils.keyvaluecache';
import { ConnectionPool } from 'mssql/msnodesqlv8';

import type { MSSQLConfig } from '../types';

import { CacheHelper } from '.';

/**
 * Whether the given config is a string or not.
 * @param config - The config to check
 * @returns Whether the config is a string or not
 */
export const isConfigString = (config: MSSQLConfig): config is string => {
  return typeof config === 'string';
};

/**
 * A class for managing the global connection pool caches for the Query and Mutation data sources.
 */
export class ConnectionManager {
  private static _globalQueryPoolCache: CacheHelper<ConnectionPool> | undefined;
  private static _globalMutationPoolCache: CacheHelper<ConnectionPool> | undefined;

  /**
   * Constructs a new ConnectionManager instance.
   * @param {MSSQLConfig} _queryConfig The config to be used for the Query data source
   * @param {MSSQLConfig} _mutationConfig The config to be used for the Mutation data source
   */
  constructor(
    private readonly _queryConfig: MSSQLConfig,
    private readonly _mutationConfig: MSSQLConfig,
  ) {}

  /**
   * Returns the global connection pool cache for the Query data source.
   */
  public get queryConnectionPool(): Promise<ConnectionPool> {
    return this.getConnectionPool(this._queryConfig, ConnectionManager.globalQueryPoolCache);
  }

  /**
   * Returns the global connection pool cache for the Mutation data source.
   */
  public get mutationConnectionPool(): Promise<ConnectionPool> {
    return this.getConnectionPool(this._mutationConfig, ConnectionManager.globalMutationPoolCache);
  }

  private static get defaultConnectionPoolCacheOptions(): KeyValueCache<ConnectionPool> {
    return new InMemoryLRUCache({
      // Default TTL is 360000 ms or 1 hour.
      ttl: 60 * 60 * 1000,
      ttlAutopurge: false,
      // Default max size is 1000.
      maxSize: 1000,
    });
  }

  private static get globalQueryPoolCache(): CacheHelper<ConnectionPool> {
    if (this._globalQueryPoolCache === undefined) {
      this._globalQueryPoolCache = new CacheHelper(
        ConnectionManager.defaultConnectionPoolCacheOptions,
      );
    }
    return this._globalQueryPoolCache;
  }

  private static get globalMutationPoolCache(): CacheHelper<ConnectionPool> {
    if (this._globalMutationPoolCache === undefined) {
      this._globalMutationPoolCache = new CacheHelper<ConnectionPool>(
        ConnectionManager.defaultConnectionPoolCacheOptions,
      );
    }
    return this._globalMutationPoolCache;
  }

  private static createConnectionPool(config: MSSQLConfig): ConnectionPool {
    return isConfigString(config) ? new ConnectionPool(config) : new ConnectionPool(config);
  }

  private async getConnectionPool(
    config: MSSQLConfig,
    cacheHelper: CacheHelper<ConnectionPool>,
  ): Promise<ConnectionPool> {
    const keyToHash = isConfigString(config) ? config : JSON.stringify(config);
    let connectionPool = await cacheHelper.tryGetFromCache(keyToHash);
    if (connectionPool === undefined) {
      connectionPool = ConnectionManager.createConnectionPool(config);
      await cacheHelper.addToCache(keyToHash, connectionPool);
    }
    return connectionPool;
  }
}

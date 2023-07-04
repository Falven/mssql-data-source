import { ConnectionPool } from 'mssql';

import type { MSSQLConfig } from '../types';

/**
 * Whether the given config is a string or not.
 * @param config - The config to check
 * @returns Whether the config is a string or not
 */
export const isConfigString = (config: MSSQLConfig): config is string => {
  return typeof config === 'string';
};

/**
 * A class for managing the global connection pools for the Query and Mutation data sources.
 */
export class ConnectionManager {
  private static _queryConfig: MSSQLConfig;
  private static _mutationConfig: MSSQLConfig;
  private static _globalQueryPool: ConnectionPool | undefined;
  private static _globalMutationPool: ConnectionPool | undefined;

  /**
   * Constructs a new ConnectionManager instance.
   * @param {MSSQLConfig} queryConfig The config to be used for the Query data source
   * @param {MSSQLConfig} mutationConfig The config to be used for the Mutation data source
   */
  constructor(queryConfig: MSSQLConfig, mutationConfig: MSSQLConfig) {
    if (ConnectionManager._queryConfig === undefined) {
      ConnectionManager._queryConfig = queryConfig;
    }
    if (ConnectionManager._mutationConfig === undefined) {
      ConnectionManager._mutationConfig = mutationConfig;
    }
  }

  /**
   * Returns the global query connection pool.
   */
  public get queryConnectionPool(): ConnectionPool {
    if (ConnectionManager._globalQueryPool === undefined) {
      ConnectionManager._globalQueryPool = this.createConnectionPool(
        ConnectionManager._queryConfig,
      );
    }
    return ConnectionManager._globalQueryPool;
  }

  /**
   * Returns the global mutation connection pool.
   */
  public get mutationConnectionPool(): ConnectionPool {
    if (ConnectionManager._globalMutationPool === undefined) {
      ConnectionManager._globalMutationPool = this.createConnectionPool(
        ConnectionManager._mutationConfig,
      );
    }
    return ConnectionManager._globalMutationPool;
  }

  private createConnectionPool(config: MSSQLConfig): ConnectionPool {
    return isConfigString(config) ? new ConnectionPool(config) : new ConnectionPool(config);
  }
}

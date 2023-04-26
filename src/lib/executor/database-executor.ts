import { performance } from 'perf_hooks';

import { type ConnectionPool, Request } from 'mssql/msnodesqlv8';

import type { ILogger, IDatabaseExecutor } from '../types';
import { logPerformance } from '../logging';
import { type ConnectionManager } from '../utils';

/**
 * @class
 * @implements {IDatabaseExecutor}
 */
export class DatabaseExecutor implements IDatabaseExecutor {
  constructor(private readonly _connectionManager: ConnectionManager) {}

  /**
   * @inheritdoc
   */
  public async executeQueryRequest<T>(
    requestFn: (request: Request) => Promise<T>,
    logger: ILogger,
  ): Promise<T> {
    return await this.executeRequest(
      this._connectionManager.queryConnectionPool,
      requestFn,
      logger,
    );
  }

  /**
   * @inheritdoc
   */
  public async executeMutationRequest<T>(
    requestFn: (request: Request) => Promise<T>,
    logger: ILogger,
  ): Promise<T> {
    return await this.executeRequest(
      this._connectionManager.mutationConnectionPool,
      requestFn,
      logger,
    );
  }

  /**
   * Executes the given request function with a new Request instance
   * using the appropriate ConnectionPool for the resolver type.
   * This method ensures the ConnectionPool is connected before
   * invoking the request function.
   *
   * @param {Promise<ConnectionPool>} connectionPool The function to be executed to get the ConnectionPool
   * @param {(request: Request): Promise<T>} requestFn The function to be executed with the new Request instance
   * @returns The result of the request function
   */
  private async executeRequest<T>(
    connectionPool: ConnectionPool,
    requestFn: (request: Request) => Promise<T>,
    logger: ILogger,
  ): Promise<T> {
    const startTime = performance.now();
    if (!connectionPool.connected) {
      await connectionPool.connect();
    }
    logPerformance(logger, 'connect', startTime);

    return await requestFn(new Request(connectionPool));
  }
}

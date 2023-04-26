import { performance } from 'perf_hooks';

import { type ConnectionPool, Request } from 'mssql/msnodesqlv8';

import type { ILogger } from '../types';
import { logPerformance } from '../logging';
import { type ConnectionManager } from '../utils';

export class DatabaseExecutor {
  constructor(private readonly _connectionManager: ConnectionManager) {}

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
    connectionPool: Promise<ConnectionPool>,
    requestFn: (request: Request) => Promise<T>,
    logger: ILogger,
  ): Promise<T> {
    let startTime = performance.now();
    const resolvedConnectionPool = await connectionPool;
    logPerformance(logger, 'getQueryConnectionPool', startTime);

    startTime = performance.now();
    if (!resolvedConnectionPool.connected) {
      await resolvedConnectionPool.connect();
    }
    logPerformance(logger, 'connect', startTime);

    const result = requestFn(new Request(resolvedConnectionPool));
    return await result;
  }

  /**
   * Executes the given request function for a query operation
   * with a new Request instance using the appropriate ConnectionPool.
   *
   * @param {(request: Request) => Promise<T>} requestFn The function to be executed with the new Request instance
   * @param {ILogger} logger The logger to use for logging
   * @returns The result of the Query request function
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
   * Executes the given request function for a mutation operation
   * with a new Request instance using the appropriate ConnectionPool.
   *
   * @param {(request: Request) => Promise<T>} requestFn The function to be executed with the new Request instance
   * @param {ILogger} logger The logger to use for logging
   * @returns The result of the Mutation request function
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
}

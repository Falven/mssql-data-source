import type { ConnectionPool, Request } from 'mssql/msnodesqlv8';

import type { ConnectionManager } from '../utils';

import type { ILogger } from '.';

export interface IDatabaseExecutor {
  constructor: (_connectionManager: ConnectionManager) => IDatabaseExecutor;

  /**
   * Executes the given request function with a new Request instance
   * using the appropriate ConnectionPool for the resolver type.
   * This method ensures the ConnectionPool is connected before
   * invoking the request function.
   *
   * @param {Promise<ConnectionPool>} connectionPool The function to be executed to get the ConnectionPool
   * @param {(request: Request) => Promise<T>} requestFn The function to be executed with the new Request instance
   * @returns The result of the request function
   */
  executeRequest: <T>(
    connectionPool: Promise<ConnectionPool>,
    requestFn: (request: Request) => Promise<T>,
    logger: ILogger,
  ) => Promise<T>;

  /**
   * Executes the given request function for a query operation
   * with a new Request instance using the appropriate ConnectionPool.
   *
   * @param {(request: Request) => Promise<T>} requestFn The function to be executed with the new Request instance
   * @param {ILogger} logger The logger to use for logging
   * @returns The result of the Query request function
   */
  executeQueryRequest: <T>(
    requestFn: (request: Request) => Promise<T>,
    logger: ILogger,
  ) => Promise<T>;

  /**
   * Executes the given request function for a mutation operation
   * with a new Request instance using the appropriate ConnectionPool.
   *
   * @param {(request: Request) => Promise<T>} requestFn The function to be executed with the new Request instance
   * @param {ILogger} logger The logger to use for logging
   * @returns The result of the Mutation request function
   */
  executeMutationRequest: <T>(
    requestFn: (request: Request) => Promise<T>,
    logger: ILogger,
  ) => Promise<T>;
}

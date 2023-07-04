import type { Request } from 'mssql';

import type { ILogger } from '.';

export interface IDatabaseExecutor {
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

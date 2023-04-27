import type { Request } from 'mssql/msnodesqlv8';

import { DevConsoleLogger, logExecutionBegin, logExecutionEnd, logSafely } from '../logging';
import { DatabaseExecutor } from '../executor';
import { ConnectionManager } from '../utils';
import {
  StoredProcedureManager,
  StoredProcedureCacheManager,
  StoredProcedureMetadataManager,
} from '../stored-procedure';
import type { MSSQLOptions, ILogger, IResolverProcedureResult, InputParameters } from '../types';

/**
 * A GraphQL DataSource backed by a Microsoft SQL Server database.
 * Maintains separate caching for Query and Mutation operations.
 * Maintains a global connection pool cache to reuse connections.
 */
export class MSSQLDataSource {
  private readonly _queryOptions: MSSQLOptions;
  private readonly _mutationOptions: MSSQLOptions;

  private readonly _queryLogger: ILogger;
  private readonly _mutationLogger: ILogger;

  private readonly _connectionManager: ConnectionManager;
  private readonly _databaseExecutor: DatabaseExecutor;
  private readonly _storedProcedureMetadataManager: StoredProcedureMetadataManager;
  private readonly _storedProcedureCacheManager: StoredProcedureCacheManager;
  private readonly _storedProcedureManager: StoredProcedureManager;

  /**
   * Creates a new MSSQLDataSource with the given options.
   * @param queryOptions The options for Query operations
   * @param mutationOptions The options for Mutation operations
   */
  constructor(
    queryOptions: MSSQLOptions = MSSQLDataSource.defaultOptions,
    mutationOptions: MSSQLOptions = MSSQLDataSource.defaultOptions,
  ) {
    this._queryOptions = queryOptions;
    this._mutationOptions = mutationOptions;

    const defaultOptions = MSSQLDataSource.defaultOptions;
    this._queryLogger =
      queryOptions.logger !== undefined ? queryOptions.logger : (defaultOptions.logger as ILogger);
    this._mutationLogger =
      mutationOptions.logger !== undefined
        ? mutationOptions.logger
        : (defaultOptions.logger as ILogger);

    this._connectionManager = new ConnectionManager(
      this._queryOptions.config,
      this._mutationOptions.config,
    );

    this._databaseExecutor = new DatabaseExecutor(this._connectionManager);

    this._storedProcedureMetadataManager = new StoredProcedureMetadataManager(
      this._databaseExecutor,
    );

    this._storedProcedureCacheManager = new StoredProcedureCacheManager();

    this._storedProcedureManager = new StoredProcedureManager(
      this._storedProcedureCacheManager,
      this._storedProcedureMetadataManager,
    );
  }

  /**
   * Executes a stored procedure for a Query operation with the provided input parameters, and returns the result.
   * @template T - This type parameter represents the type of the value returned by the resolver procedure.
   * @param {string} storedProcedureName - The name of the stored procedure to execute.
   * @param {StoredProcedureInput} input - The input parameters for the stored procedure.
   * @returns A Promise that resolves to the result of the stored procedure execution.
   */
  public async executeStoredProcedureQuery<T>(
    storedProcedureName: string,
    input: InputParameters,
  ): Promise<IResolverProcedureResult<T>> {
    const startTime = performance.now();
    const logger = this._queryLogger;

    logExecutionBegin(logger, `Stored Procedure Query ${storedProcedureName} with inputs`, input);

    const result = await this._databaseExecutor.executeQueryRequest(
      async (request: Request): Promise<IResolverProcedureResult<T>> =>
        await this._storedProcedureManager.executeStoredProcedure<T>(
          storedProcedureName,
          input,
          request,
          logger,
        ),
      logger,
    );

    logExecutionEnd(logger, `Stored Procedure Query ${storedProcedureName}`, startTime);
    logSafely(logger, 'info', `------------------`);

    return result;
  }

  /**
   * Executes a stored procedure for a Mutation operation with the provided input parameters, and returns the result.
   * @template T - This type parameter represents the type of the value returned by the resolver procedure.
   * @param {string} storedProcedureName - The name of the stored procedure to execute.
   * @param {StoredProcedureInput} input - The input parameters for the stored procedure.
   * @returns A Promise that resolves to the result of the stored procedure execution.
   */
  public async executeStoredProcedureMutation<T>(
    storedProcedureName: string,
    input: InputParameters,
  ): Promise<IResolverProcedureResult<T>> {
    const startTime = performance.now();
    const logger = this._mutationLogger;
    logExecutionBegin(logger, `Stored Procedure Mutation ${storedProcedureName}`, input);
    const result = await this._databaseExecutor.executeMutationRequest(
      async (request: Request): Promise<IResolverProcedureResult<T>> =>
        await this._storedProcedureManager.executeStoredProcedure(
          storedProcedureName,
          input,
          request,
          logger,
        ),
      logger,
    );
    logExecutionEnd(logger, `Stored Procedure Mutation ${storedProcedureName}`, startTime);
    return result;
  }

  /**
   * Default options for the Query and Mutation global connection pool cache.
   */
  private static get defaultOptions(): MSSQLOptions {
    return {
      config: {
        user: '',
        password: '',
        server: '',
        database: '',
      },
      logger: new DevConsoleLogger(),
    };
  }
}

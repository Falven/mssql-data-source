import { camelCase, mapKeys } from 'lodash';
import {
  type Request,
  type IProcedureResult,
  type IResult,
  type IRecordSet,
} from 'mssql/msnodesqlv8';

import {
  type DriverType,
  type PreparedStoredProcedureParameter,
  ParameterMode,
  type StoredProcedureSchema,
  type StoredProcedureParameter,
  type ILogger,
  type InputParameters,
} from '../types';
import { mapDbTypeToDriverType } from '../utils';
import { logExecutionBegin, logPerformance, logSafely } from '../logging';
import {
  type StoredProcedureCacheManager,
  type StoredProcedureMetadataManager,
} from '../stored-procedure';
import { type IResolverProcedureResult } from '../types/i-resolver-procedure-result';

/**
 * StoredProcedureManager provides methods to interact
 * with a Microsoft SQL Server database for managing stored procedures.
 */
export class StoredProcedureManager {
  /**
   * Creates a new instance of StoredProcedureManager.
   */
  constructor(
    private readonly _storedProcedureCacheManager: StoredProcedureCacheManager,
    private readonly _storedProcedureMetadataManager: StoredProcedureMetadataManager,
  ) {}

  /**
   * Executes a stored procedure with the provided input parameters, and returns the result.
   * @template TVal - The type of records in the result set.
   * @template TRet - The type of the result object to be returned.
   * @param {string} storedProcedureName - The name of the stored procedure to execute.
   * @param {StoredProcedureInput} input - The input parameters for the stored procedure.
   * @param {Request} request - The request to execute the stored procedure.
   * @param {ILogger} logger - The logger to use for logging.
   * @returns A Promise that resolves to the result of the stored procedure execution.
   */
  public async executeStoredProcedure<T>(
    storedProcedureName: string,
    input: InputParameters,
    request: Request,
    logger: ILogger,
  ): Promise<IResolverProcedureResult<T>> {
    let startTime = performance.now();
    let schema = (await this._storedProcedureCacheManager.tryGetFromCache(storedProcedureName)) as
      | IResult<StoredProcedureSchema>
      | undefined;
    if (schema === undefined) {
      logSafely(
        logger,
        'info',
        // Yellow
        `\x1b[33mCache miss occurred while retrieving the cached schema for ${storedProcedureName}\x1b[0m`,
      );
      schema = await this._storedProcedureMetadataManager.getStoredProcedureParameterSchema(
        storedProcedureName,
        logger,
      );
      await this._storedProcedureCacheManager.addToCache(storedProcedureName, schema);
    } else {
      logSafely(
        logger,
        'info',
        // Green
        `\x1b[32mCache hit occurred while retrieving the cached schema for ${storedProcedureName}\x1b[0m`,
      );
    }
    logPerformance(logger, 'getStoredProcedureParameterSchema', startTime);

    startTime = performance.now();
    const storedProcedureParameters =
      this._storedProcedureMetadataManager.parseStoredProcedureParameters(
        storedProcedureName,
        schema,
      );
    logPerformance(logger, 'parseStoredProcedureParameters', startTime);

    startTime = performance.now();
    const preparedRequest = this.prepareStoredProcedureRequest(
      storedProcedureParameters,
      input,
      request,
    );
    logPerformance(logger, 'prepareStoredProcedureRequest', startTime);

    startTime = performance.now();
    logExecutionBegin(
      logger,
      `Stored Procedure ${storedProcedureName} with parameters`,
      preparedRequest.parameters,
      // Green
      '32m',
    );
    const result = await preparedRequest.execute(storedProcedureName);

    startTime = performance.now();
    const preparedResult = this.prepareStoredProcedureResult(result);
    logPerformance(logger, 'prepareStoredProcedureResult', startTime);

    return preparedResult;
  }

  private prepareParameters(
    storedProcedureParameters: IterableIterator<StoredProcedureParameter>,
    input: InputParameters,
  ): Map<string, PreparedStoredProcedureParameter> {
    // We want to use the inferred DB Stored Procedure schema as the source of truth.
    const preparedParameters = new Map<string, PreparedStoredProcedureParameter>();
    for (const spParameter of storedProcedureParameters) {
      const { name, type, length, precision, scale, ...rest } = spParameter;
      const parameterName = name.slice(1);
      // Let's use the parameter name in lowercase as the lookup key.
      preparedParameters.set(parameterName.toLowerCase(), {
        name: parameterName,
        type: mapDbTypeToDriverType({
          type,
          length,
          precision,
          scale,
        }) as DriverType,
        value: undefined,
        ...rest,
      });
    }

    // Populate our input values into the request parameters.
    const inputParameters = input as Record<string, unknown>;
    for (const inputParameterKey in inputParameters) {
      const preparedParameter = preparedParameters.get(inputParameterKey.toLowerCase());
      if (preparedParameter != null) {
        preparedParameter.value = inputParameters[inputParameterKey];
      }
      // We don't care about provided input parameters that are missing in the Stored Procedure definition.
    }

    return preparedParameters;
  }

  private getMissingRequiredParameters(
    parameters: Map<string, PreparedStoredProcedureParameter>,
  ): PreparedStoredProcedureParameter[] {
    // Check what required parameters are missing.
    const missingRequiredParameters = [];
    for (const parameter of parameters.values()) {
      // If they have a default value they can be ommitted from the request.
      if (parameter.defaultValue === undefined && parameter.value === undefined) {
        missingRequiredParameters.push(parameter);
      }
    }
    return missingRequiredParameters;
  }

  private addParametersToRequest(
    parameters: Map<string, PreparedStoredProcedureParameter>,
    request: Request,
  ): Request {
    const preparedRequest = request;
    for (const parameter of parameters.values()) {
      const { name, type, mode, value, defaultValue } = parameter;
      if (defaultValue !== undefined && value === undefined) {
        continue;
      }

      const modeEnum = mode;
      if (modeEnum === ParameterMode.IN) {
        preparedRequest.input(name, type, value);
      } else if (modeEnum === ParameterMode.INOUT) {
        preparedRequest.output(name, type, value);
      } else {
        throw new Error(`Unknown parameter mode: ${mode}`);
      }
    }
    return preparedRequest;
  }

  /**
   * Prepares the stored procedure request.
   * @param {IterableIterator<StoredProcedureParameter>} storedProcedureParameters - The stored procedure parameters.
   * @param {StoredProcedureInput} input - The input object.
   * @param {Request} request - The request object.
   * @returns A prepared request object.
   */
  private prepareStoredProcedureRequest(
    storedProcedureParameters: IterableIterator<StoredProcedureParameter>,
    input: InputParameters,
    request: Request,
  ): Request {
    const parameters = this.prepareParameters(storedProcedureParameters, input);

    const missingRequiredParameters = this.getMissingRequiredParameters(parameters);
    const missingLength = missingRequiredParameters.length;
    if (missingLength > 0) {
      throw new Error(
        `Missing ${missingLength} required parameters: ${missingRequiredParameters.join(', ')}.`,
      );
    }

    const preparedRequest = this.addParametersToRequest(parameters, request);

    return preparedRequest;
  }

  /**
   * Prepares the stored procedure result into a GraphQL result object.
   * @param {IProcedureResult} result - The stored procedure result.
   * @returns {IResolverProcedureResult} A prepared GraphQL result object.
   */
  private prepareStoredProcedureResult<T extends Record<string, unknown>>(
    result: IProcedureResult<T>,
  ): IResolverProcedureResult<T> {
    const resultSets = result.recordsets.map((recordset: IRecordSet<Record<string, unknown>>) => {
      return recordset.map((record: Record<string, unknown>) =>
        mapKeys(record, (_value: unknown, key: string) => camelCase(key)),
      );
    });
    const output = mapKeys(result.output, (_value, key) => camelCase(key));

    const preparedResult = {
      returnValue: result.returnValue,
      resultSets: resultSets as unknown as T[][],
      rowsAffected: result.rowsAffected,
      ...output,
    };
    return preparedResult;
  }
}

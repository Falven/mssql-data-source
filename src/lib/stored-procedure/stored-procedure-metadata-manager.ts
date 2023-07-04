import { type IResult, type Request } from 'mssql';

import type { StoredProcedureParameter, StoredProcedureSchema, ILogger } from '../types';
import { type DatabaseExecutor } from '../executor';
import { convertSqlValueToJsValue } from '../utils';

/**
 * A manager for stored procedure metadata.
 * Handles the retrieval and caching of stored procedure metadata.
 */
export class StoredProcedureMetadataManager {
  /**
   * Regular expression to extract MSSQL stored procedure names.
   * See https://regex101.com/r/cMsTyT/1 for this regex.
   */
  private static readonly storedProcedureNameRegex =
    /((?:(?:\[([\w\s]+)\]|(\w+))\.)?(?:\[([\w\s]+)\]|(\w+))\.(?:\[([\w\s]+)\]|(\w+)))/i;

  /**
   * Matches any comments from the Stored Procedure definition.
   * See https://regex101.com/r/dxA7n0/1 for this regex.
   */
  private static readonly commentRegex = /(?:\s*-{2}.+\s*$)|(?:\/\*([\s\S]*?)\*\/)/gm;

  /**
   * Matches the parameters from the Stored Procedure definition.
   * See https://regex101.com/r/4TaTky/1 for this regex.
   */
  private static readonly parameterSectionRegex =
    /(?<=(?:CREATE|ALTER)\s+PROCEDURE)\s+((?:(?:\[([\w\s]+)\]|(\w+))\.)?(?:\[([\w\s]+)\]|(\w+))\.(?:\[([\w\s]+)\]|(\w+)))(.*?)(?=(?:AS|FOR\s+REPLICATION)[^\w])/is;

  /**
   * See https://regex101.com/r/iMEaLb/1 for this regex.
   * Match the individual parameters in the Parameter Definition.
   */
  private static readonly parameterDefinitionRegex = /(@[\w]+)\s+([^\s]+)\s*=\s*([^, ]*),?/gi;

  constructor(private readonly _databaseExecutor: DatabaseExecutor) {}

  /**
   * Parses the stored procedure parameter schema into a StoredProcedureParameter array.
   * @param {string} storedProcedureName - The name of the stored procedure to retrieve the parameter schema for.
   * @returns A Promise that resolves to the result of the stored procedure execution.
   */
  public async getStoredProcedureParameterSchema(
    storedProcedureName: string,
    logger: ILogger,
  ): Promise<IResult<StoredProcedureSchema>> {
    return await this._databaseExecutor.executeQueryRequest(async (request: Request) => {
      // Remove square bracket notation if any, and split into schema and name.
      const schemaAndName = storedProcedureName.replace(/\[|\]/g, '').split('.');
      const result = await request.query<StoredProcedureSchema>(
        'SELECT ' +
          'PARAMETER_NAME as name, ' +
          'DATA_TYPE as type, ' +
          'PARAMETER_MODE as mode, ' +
          'CHARACTER_MAXIMUM_LENGTH length, ' +
          'NUMERIC_PRECISION as precision, ' +
          'NUMERIC_SCALE as scale ' +
          'FROM INFORMATION_SCHEMA.PARAMETERS ' +
          `WHERE SPECIFIC_SCHEMA = '${schemaAndName[0]}' AND SPECIFIC_NAME = '${schemaAndName[1]}';
            SELECT OBJECT_DEFINITION(OBJECT_ID('${storedProcedureName}')) AS storedProcedureDefinition;`,
      );

      const recordSetLength = result.recordsets.length as number;
      if (recordSetLength < 1 || recordSetLength > 2) {
        throw new Error(
          `Could not retrieve stored procedure parameter schema from Database for stored procedure ${storedProcedureName}.`,
        );
      }

      if (recordSetLength !== 2 || result.recordsets[1].length !== 1) {
        throw new Error(
          `Could not retrieve stored procedure definition from Database for stored procedure ${storedProcedureName}.`,
        );
      }

      return result;
    }, logger);
  }

  /**
   * Parses the stored procedure parameter schema into a StoredProcedureParameter array.
   * @param {string} storedProcedureName - The name of the stored procedure to parse the parameter schema for.
   * @param {IResult<StoredProcedureSchema>} schemaResult - The result of the stored procedure parameter schema query.
   * @returns A StoredProcedureParameter array.
   */
  public parseStoredProcedureParameters(
    storedProcedureName: string,
    schemaResult: IResult<StoredProcedureSchema>,
  ): IterableIterator<StoredProcedureParameter> {
    const parameterSchemaMap: Map<string, StoredProcedureParameter> =
      schemaResult.recordsets[0].reduce(
        (parameterMap: Map<string, StoredProcedureParameter>, item: StoredProcedureParameter) => {
          parameterMap.set(item.name, item);
          return parameterMap;
        },
        new Map<string, StoredProcedureParameter>(),
      );

    const storedProcedureDefinition = schemaResult.recordsets[1][0].storedProcedureDefinition;

    const commentStrippedStoredProcedureDefinition = storedProcedureDefinition.replace(
      StoredProcedureMetadataManager.commentRegex,
      '',
    );
    if (commentStrippedStoredProcedureDefinition === '') {
      throw new Error(
        `Could not parse stored procedure comments from definition for stored procedure ${storedProcedureName}.`,
      );
    }

    const parameterSection = commentStrippedStoredProcedureDefinition.match(
      StoredProcedureMetadataManager.parameterSectionRegex,
    );
    if (parameterSection === null || parameterSection.length !== 9) {
      throw new Error(
        `Could not parse stored procedure parameters from definition for stored procedure ${storedProcedureName}.`,
      );
    }

    const parameterDefinition = parameterSection[8];

    let parameterDefinitionMatch;
    while (
      (parameterDefinitionMatch =
        StoredProcedureMetadataManager.parameterDefinitionRegex.exec(parameterDefinition)) !== null
    ) {
      const name = parameterDefinitionMatch[1];
      const type = parameterDefinitionMatch[2];
      const defaultValue = parameterDefinitionMatch[3];
      const parameter = parameterSchemaMap.get(name);
      if (parameter !== undefined) {
        parameter.defaultValue = convertSqlValueToJsValue(defaultValue, type);
      }
    }

    return parameterSchemaMap.values();
  }
}

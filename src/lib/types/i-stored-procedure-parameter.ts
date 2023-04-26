import type { ParameterMode } from '.';

/**
 * Represents a subset of used metadata for an MSSQL stored procedure parameter.
 * @property {string} name - The name of the parameter. Begins with @.
 * @property {string} type - The MSSQL data type of the parameter.
 * @property {ParameterMode} mode - The MSSQL mode of the parameter. Either 'IN', 'INOUT' or 'UNKNOWN'.
 * @property {unknown} defaultValue - The default value of the parameter, if any, or undefined.
 * @property {number} length - The length of character-based parameters, or undefined.
 * @property {number} precision - The precision of floating point parameters, or undefined.
 * @property {number} scale - The scale of floating point parameters, or undefined.
 */
export interface StoredProcedureParameter {
  name: string;
  type: string;
  mode: ParameterMode;
  defaultValue?: unknown;
  length?: number;
  precision?: number;
  scale?: number;
}

/**
 * In Microsoft SQL Server, parameters are either input/IN parameters
 * (by default, when no keyword is specified) or input-output/INOUT (using the OUTPUT keyword).
 * Unknown parameter modes are not supported.
 * @enum IN - Represents an input parameter
 * @enum INOUT - Represents an input-output parameter
 * @enum UNKNOWN - Represents an unknown parameter
 */
export enum ParameterMode {
  IN = 'IN',
  OUT = 'OUT',
  INOUT = 'INOUT',
}

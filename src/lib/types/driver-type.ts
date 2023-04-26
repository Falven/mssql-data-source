import type { ISqlType } from 'mssql/msnodesqlv8';

/**
 * Driver types that can be used to specify the type of a stored procedure parameter.
 */
export type DriverType = (() => ISqlType) | ISqlType;

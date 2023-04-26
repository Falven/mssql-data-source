import type { config } from 'mssql/msnodesqlv8';

/**
 * Represents a configuration object for a MSSQL database.
 * Can be an mssql config or Connection String.
 */
export type MSSQLConfig = config | string;

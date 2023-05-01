import type { StoredProcedureParameter, DriverType } from '.';

/**
 * Final parameters that will be passed to the stored procedure request.
 */
export type PreparedStoredProcedureParameter = Omit<StoredProcedureParameter, 'type'> & {
  type: DriverType;
  value?: unknown;
};

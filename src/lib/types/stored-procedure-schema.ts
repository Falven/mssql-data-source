import type { StoredProcedureParameter } from '.';

/**
 * Represents the result of a stored procedure execution.
 */
export type StoredProcedureSchema = [
  StoredProcedureParameter,
  {
    storedProcedureDefinition: string;
  },
];

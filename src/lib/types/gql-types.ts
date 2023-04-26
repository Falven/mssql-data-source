/** GraphQL Types */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends Record<string, unknown>> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };

/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** The Byte scalar type represents non-fractional whole numeric values. Byte can represent values between 0 and 255. */
  Byte: any;
  ByteArray: any;
  /** The DateTime scalar represents an ISO-8601 compliant date time type. */
  DateTime: any;
  /** The built-in Decimal scalar type. */
  Decimal: any;
  /** The Long scalar type represents non-fractional signed whole 64-bit numeric values. Long can represent values between -(2^63) and 2^63 - 1. */
  Long: any;
  /** The Short scalar type represents non-fractional signed whole 16-bit numeric values. Short can represent values between -(2^15) and 2^15 - 1. */
  Short: any;
  /** IEEE 754 32 bit float */
  Single: any;
}

export enum OrderBy {
  Asc = 'ASC',
  Desc = 'DESC',
}

/** The input arguments for executing Filterable, Sortable aned Paginated stored procedures. */
export interface StoredProcedureInput {
  filterColumnName?: InputMaybe<Scalars['String']>;
  filterColumnType?: InputMaybe<Scalars['String']>;
  filterColumnValue?: InputMaybe<Scalars['String']>;
  page?: InputMaybe<Scalars['Int']>;
  pageCount?: InputMaybe<Scalars['Int']>;
  pageSize?: InputMaybe<Scalars['Int']>;
  quickFilterValue?: InputMaybe<Scalars['String']>;
  sortColumnName?: InputMaybe<Scalars['String']>;
  sortOrder?: InputMaybe<OrderBy>;
}

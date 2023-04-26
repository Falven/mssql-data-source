import {
  type ISqlTypeFactory,
  type ISqlTypeFactoryWithLength,
  type ISqlTypeFactoryWithNoParams,
  type ISqlTypeFactoryWithPrecisionScale,
  type ISqlTypeFactoryWithScale,
  type ISqlTypeFactoryWithTvpType,
  type ISqlTypeWithLength,
  type ISqlTypeWithNoParams,
  type ISqlTypeWithPrecisionScale,
  type ISqlTypeWithScale,
  type ISqlTypeWithTvpType,
  TYPES,
} from 'mssql/msnodesqlv8';

import type { StoredProcedureParameter } from '../types';

type TypeFactory<T> = T extends ISqlTypeFactoryWithNoParams
  ? () => ISqlTypeWithNoParams
  : T extends ISqlTypeFactoryWithLength
  ? (length?: number) => ISqlTypeWithLength
  : T extends ISqlTypeFactoryWithScale
  ? (scale?: number) => ISqlTypeWithScale
  : T extends ISqlTypeFactoryWithPrecisionScale
  ? (precision?: number, scale?: number) => ISqlTypeWithPrecisionScale
  : T extends ISqlTypeFactoryWithTvpType
  ? (tvpType?: unknown) => ISqlTypeWithTvpType
  : never;

type TypesType = typeof TYPES;
type TypesKey = keyof TypesType;
type IndexableTypes = {
  [K in TypesKey]: TypeFactory<TypesType[K]>;
};

function isSqlTypeFactoryWithNoParams(
  factoryObject: ISqlTypeFactory,
): factoryObject is ISqlTypeFactoryWithNoParams {
  return (
    factoryObject !== undefined &&
    !('length' in factoryObject) &&
    !('scale' in factoryObject) &&
    !('precision' in factoryObject) &&
    !('tvpType' in factoryObject)
  );
}

function isSqlTypeFactoryWithLength(
  factoryObject: ISqlTypeFactory,
): factoryObject is ISqlTypeFactoryWithLength {
  return factoryObject !== undefined && 'length' in factoryObject;
}

function isSqlTypeFactoryWithScale(
  factoryObject: ISqlTypeFactory,
): factoryObject is ISqlTypeFactoryWithScale {
  return factoryObject !== undefined && 'scale' in factoryObject;
}

function isSqlTypeFactoryWithPrecisionScale(
  factoryObject: ISqlTypeFactory,
): factoryObject is ISqlTypeFactoryWithPrecisionScale {
  return factoryObject !== undefined && 'precision' in factoryObject && 'scale' in factoryObject;
}

function isSqlTypeFactoryWithTvpType(
  factoryObject: ISqlTypeFactory,
): factoryObject is ISqlTypeFactoryWithTvpType {
  return factoryObject !== undefined && 'tvpType' in factoryObject;
}

const findPropertyCaseInsensitive = (obj: object, propertyName: string): string | null => {
  const lowercasePropertyName = propertyName.toLowerCase();
  for (const key in obj) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      key.toLowerCase() === lowercasePropertyName
    ) {
      return key;
    }
  }
  return null;
};

export const mapDbTypeToDriverType = ({
  type,
  length,
  precision,
  scale,
}: Pick<StoredProcedureParameter, 'type' | 'length' | 'precision' | 'scale'>): ISqlTypeFactory => {
  const types: IndexableTypes = TYPES;
  const property = findPropertyCaseInsensitive(types, type);
  if (property !== null) {
    const typeFactory = types[property as TypesKey];
    if (isSqlTypeFactoryWithNoParams(typeFactory)) {
      return typeFactory();
    } else if (isSqlTypeFactoryWithLength(typeFactory)) {
      return (typeFactory as ISqlTypeFactoryWithLength)(length);
    } else if (isSqlTypeFactoryWithScale(typeFactory)) {
      return (typeFactory as ISqlTypeFactoryWithScale)(scale);
    } else if (isSqlTypeFactoryWithPrecisionScale(typeFactory)) {
      return (typeFactory as ISqlTypeFactoryWithPrecisionScale)(precision, scale);
    } else if (isSqlTypeFactoryWithTvpType(typeFactory)) {
      return TYPES.NVarChar();
    } else {
      throw new Error(`Unknown SQL Type ${type}.`);
    }
  }
  return TYPES.NVarChar();
};

type SqlValue = string | number | boolean | Date | Buffer;

const isStringOrNumber = (value: SqlValue): value is string | number => {
  return typeof value === 'string' || typeof value === 'number';
};

const isDate = (value: SqlValue): value is Date => {
  return value instanceof Date;
};

const isType = (sqlType: string, typePrefixes: string[]): boolean => {
  return typePrefixes.some((prefix) => sqlType.startsWith(prefix));
};

export const convertSqlValueToJsValue = (value: SqlValue, sqlType: string): unknown => {
  if (value === 'NULL') {
    return null;
  }

  const lowerCaseSqlType = sqlType.toLowerCase();

  if (
    isType(lowerCaseSqlType, [
      'varchar',
      'nvarchar',
      'char',
      'nchar',
      'text',
      'ntext',
      'xml',
      'uniqueidentifier',
    ])
  ) {
    return String(value);
  }

  if (
    isType(lowerCaseSqlType, [
      'int',
      'smallint',
      'tinyint',
      'bigint',
      'decimal',
      'numeric',
      'float',
      'real',
      'money',
      'smallmoney',
    ])
  ) {
    return Number(value);
  }

  if (isType(lowerCaseSqlType, ['bit'])) {
    return Boolean(value);
  }

  if (isType(lowerCaseSqlType, ['date', 'datetime', 'datetime2', 'smalldatetime', 'time'])) {
    if (isStringOrNumber(value) || isDate(value)) {
      return new Date(value);
    }
    throw new Error('Cannot create a Date from a boolean value.');
  }

  if (isType(lowerCaseSqlType, ['binary', 'varbinary', 'image'])) {
    return Buffer.from(value as Buffer);
  }

  if (isType(lowerCaseSqlType, ['rowversion', 'timestamp'])) {
    return Buffer.from(value as Buffer);
  }

  if (isType(lowerCaseSqlType, ['hierarchyid', 'geometry', 'geography'])) {
    return value;
  }

  if (isType(lowerCaseSqlType, ['tvp'])) {
    throw new Error('TVPs are not supported.');
  }

  if (isType(lowerCaseSqlType, ['udt'])) {
    throw new Error('UDTs are not supported.');
  }

  throw new Error(`Unsupported SQL type: ${sqlType}`);
};

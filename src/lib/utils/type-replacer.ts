export const replacer = (key: string, value: any): unknown => {
  if (typeof value === 'bigint') {
    return { __type: 'BigInt', value: value.toString() };
  } else if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() };
  } else if (value instanceof Map) {
    return { __type: 'Map', value: Array.from(value.entries()) };
  } else if (value instanceof Set) {
    return { __type: 'Set', value: Array.from(value.values()) };
  } else if (value instanceof RegExp) {
    return { __type: 'RegExp', value: value.toString() };
  } else if (value instanceof Buffer) {
    return { __type: 'Buffer', value: value.toString('base64') };
  } else {
    return value;
  }
};

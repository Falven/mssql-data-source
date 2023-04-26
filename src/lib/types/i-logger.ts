import type { info } from 'console';

/**
 * A logger that can be used to log messages with different
 * levels of severity for the MSSQLDataSource.
 * @property {Function} [info] - Logs an informational message
 * @property {Function} [log] - Logs a debug message
 * @property {Function} [warn] - Logs a warning message
 * @property {Function} [error] - Logs an error message
 * @property {Function} [trace] - Logs a stack trace
 * @property {Function} [performance] - Logs performance information
 */
export interface ILogger {
  info?: typeof console.info;
  log?: typeof console.log;
  warn?: typeof console.warn;
  error?: typeof console.error;
  trace?: typeof console.trace;
  performance?: typeof info;
}

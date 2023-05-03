import type { ILogger } from '../types';

/**
 * A logger that logs messages to the console.
 */
export class DevConsoleLogger implements ILogger {
  private readonly _isDev: boolean;

  /**
   * Creates a new instance of the ConsoleLogger class.
   */
  constructor() {
    this._isDev = process.env.NODE_ENV !== 'production';
  }

  /**
   * Logs an informational message to the console.
   * @param {unknown} message The message to log
   * @param {unknown[]} optionalParams Optional parameters to log
   */
  info(message?: unknown, ...optionalParams: unknown[]): void {
    if (this._isDev) {
      console.info(message, ...optionalParams);
    }
  }

  /**
   * Logs an error message to the console.
   * @param {unknown} message The message to log
   * @param {unknown[]} optionalParams Optional parameters to log
   */
  error(message?: unknown, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  }
}

import { performance } from 'perf_hooks';

import type { ILogger } from '../types';

/**
 * Logs a message using the logger for the given resolver type and method.
 *
 * @param logger The logger to be used
 * @param method The logger method to be used (info, log, warn, error, trace)
 * @param args The arguments to be passed to the logger method
 */
export const logSafely = (logger: ILogger, method: keyof ILogger, ...args: unknown[]): void => {
  if (method !== undefined) {
    const loggingMethod = logger[method];
    if (loggingMethod !== undefined) {
      loggingMethod.bind(logger)(...args);
    }
  }
};

/**
 * Calculates and logs the elapsed time using the given startTime for the specified method name.
 *
 * @param logger The logger to be used
 * @param methodName The method that was executed to be logged
 * @param startTime The start time of the method execution
 */
export const logPerformance = (logger: ILogger, methodName: string, startTime: number): void => {
  const elapsedTime = (performance.now() - startTime).toFixed(2);
  logSafely(
    logger,
    'info',
    `\x1b[34mExecution time for ${methodName}: ${elapsedTime} milliseconds.\x1b[0m`,
  );
};

/**
 * Logs the beginning of a function execution including arguments.
 *
 * @param {ILogger} logger The logger to be used
 * @param {string} fnName The object that was executed to be logged
 * @param {object} fnInput The input to be logged
 */
export const logExecutionBegin = (logger: ILogger, fnName: string, fnInput: object): void => {
  logSafely(
    logger,
    'info',
    `\x1b[32mBegin executing ${fnName} with inputs: ${JSON.stringify(fnInput, null, 0)}\x1b[0m`,
  );
};

/**
 * Logs the end of a function execution including elapsed time.
 *
 * @param {ILogger} logger The logger to be used
 * @param {string} fnName The object that was executed to be logged
 * @param {number} fnStartTime The start time of the method execution
 */
export const logExecutionEnd = (logger: ILogger, fnName: string, fnStartTime: number): void => {
  const elapsedTime = (performance.now() - fnStartTime).toFixed(2);
  logSafely(
    logger,
    'info',
    `\x1b[32mEnd execution of ${fnName} completed in ${elapsedTime}ms\x1b[0m`,
  );
};

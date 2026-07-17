'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// Timeout — Async function wrapper with AbortController-based cancellation
//
// Prevents runaway operations from blocking the event loop. The underlying
// AbortController signal can be passed to fetch(), database drivers, or any
// API that supports the standard AbortSignal pattern.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Preset timeout constants (milliseconds) ─────────────────────────────────
/** @type {number} Timeout for external API calls (payment gateways, shipping, etc.) */
const EXTERNAL_API_TIMEOUT = 10_000;

/** @type {number} Timeout for database queries */
const DB_QUERY_TIMEOUT = 5_000;

/** @type {number} Timeout for Redis operations */
const REDIS_TIMEOUT = 2_000;

/** @type {number} Timeout for internal service-to-service calls */
const INTERNAL_SERVICE_TIMEOUT = 3_000;

/**
 * Error thrown when an operation exceeds its allowed time budget.
 * @extends Error
 */
class TimeoutError extends Error {
  /**
   * @param {string} [message='Operation timed out'] - Human-readable description.
   * @param {number} [timeoutMs]                     - The timeout value that was exceeded.
   */
  constructor(message = 'Operation timed out', timeoutMs) {
    super(message);
    this.name = 'TimeoutError';
    this.code = 'OPERATION_TIMEOUT';
    /** @type {number|undefined} The timeout that was exceeded, in milliseconds. */
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Wrap an async function with a timeout. If the function does not resolve
 * within `timeoutMs`, a {@link TimeoutError} is thrown and the AbortController
 * is signalled so cooperative cancellation can occur.
 *
 * The wrapped function receives an `AbortSignal` as its first argument. Pass
 * this signal to `fetch()`, Sequelize queries, or any AbortSignal-aware API
 * so the underlying I/O is cancelled cleanly when the timeout fires.
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} fn
 *   The async function to execute. Receives an `AbortSignal` for cooperative
 *   cancellation. You may also pass a function that ignores the signal.
 * @param {number}  [timeoutMs=10000]
 *   Maximum time in milliseconds to wait for `fn` to resolve.
 * @param {string}  [timeoutMessage]
 *   Custom error message for the TimeoutError.
 * @returns {Promise<T>} The resolved value of `fn`.
 * @throws {TimeoutError} If `fn` does not resolve within `timeoutMs`.
 *
 * @example
 *   // Basic usage
 *   const data = await withTimeout(
 *     () => fetch('https://api.example.com/data'),
 *     5000,
 *     'External API did not respond'
 *   );
 *
 * @example
 *   // Using the AbortSignal for cooperative cancellation
 *   const result = await withTimeout(
 *     (signal) => fetch('https://api.ghn.vn/shipping', { signal }),
 *     EXTERNAL_API_TIMEOUT,
 *   );
 */
async function withTimeout(fn, timeoutMs = EXTERNAL_API_TIMEOUT, timeoutMessage) {
  if (typeof fn !== 'function') {
    throw new TypeError('withTimeout: first argument must be a function');
  }
  if (timeoutMs <= 0) {
    throw new RangeError('withTimeout: timeoutMs must be a positive number');
  }

  const controller = new AbortController();
  const { signal } = controller;

  const message =
    timeoutMessage || `Operation timed out after ${timeoutMs}ms`;

  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(message, timeoutMs));
    }, timeoutMs);
  });

  try {
    // Race the actual work against the timeout
    const result = await Promise.race([
      fn(signal),
      timeoutPromise,
    ]);
    return result;
  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────────
    // Always clear the timer to prevent leaks, regardless of outcome.
    clearTimeout(timer);

    // Abort the controller if the function resolved before the timeout
    // so any lingering signal listeners are cleaned up.
    if (!signal.aborted) {
      controller.abort();
    }
  }
}

module.exports = {
  withTimeout,
  TimeoutError,
  EXTERNAL_API_TIMEOUT,
  DB_QUERY_TIMEOUT,
  REDIS_TIMEOUT,
  INTERNAL_SERVICE_TIMEOUT,
};

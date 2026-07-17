'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// Retry — Exponential backoff with jitter for transient failure recovery
//
// Wraps any async function with automatic retry logic. Useful for network
// calls, database operations, and any I/O that can fail transiently.
//
// Formula:  delay = min(baseDelay × 2^attempt + jitter, maxDelay)
// Jitter:   random(0, 1) × baseDelay  (decorrelated jitter)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} RetryOptions
 * @property {number}   [maxRetries=3]        - Maximum number of retry attempts (0 = no retries).
 * @property {number}   [baseDelay=1000]      - Base delay in milliseconds before the first retry.
 * @property {number}   [maxDelay=30000]      - Upper cap for the computed delay.
 * @property {boolean}  [jitter=true]         - Whether to add random jitter to prevent thundering herd.
 * @property {Array<Function|string>} [retryableErrors=[]] - Error classes or error `code` strings
 *   that should trigger a retry. If empty, ALL errors are retried.
 * @property {Function} [onRetry]             - Optional callback `(error, attempt, delayMs) => void`
 *   invoked before each retry sleep.
 * @property {string}   [label]               - Human-readable label for log messages.
 */

/**
 * Wrap an async function with automatic retry + exponential backoff.
 *
 * @template T
 * @param {() => Promise<T>} fn        - The async function to execute.
 * @param {RetryOptions}     [options]  - Retry configuration.
 * @returns {Promise<T>} The resolved value of `fn`.
 * @throws {Error} The last error encountered after all retries are exhausted.
 *
 * @example
 *   // Basic usage — retries up to 3 times
 *   const data = await withRetry(() => fetchFromExternalAPI(params));
 *
 * @example
 *   // Only retry on specific error codes
 *   const row = await withRetry(
 *     () => db.query(sql),
 *     {
 *       maxRetries: 5,
 *       retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'SequelizeConnectionError'],
 *       label: 'db-query',
 *     }
 *   );
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1_000,
    maxDelay = 30_000,
    jitter = true,
    retryableErrors = [],
    onRetry,
    label = 'withRetry',
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // ── Check if we've exhausted retries ──────────────────────────────────
      if (attempt >= maxRetries) {
        break;
      }

      // ── Check if the error is retryable ───────────────────────────────────
      if (!_isRetryable(error, retryableErrors)) {
        break;
      }

      // ── Compute delay with exponential backoff ────────────────────────────
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitterMs = jitter ? Math.random() * baseDelay : 0;
      const delayMs = Math.min(exponentialDelay + jitterMs, maxDelay);

      // ── Log the retry ─────────────────────────────────────────────────────
      const nextAttempt = attempt + 1;
      console.warn(
        `[Retry] "${label}" attempt ${nextAttempt}/${maxRetries} ` +
        `after ${Math.round(delayMs)}ms — ${error.message || error.code || 'Unknown error'}`
      );

      // ── Invoke optional callback ──────────────────────────────────────────
      if (typeof onRetry === 'function') {
        try {
          onRetry(error, nextAttempt, delayMs);
        } catch (_) {
          // Never let the onRetry callback break the retry loop
        }
      }

      // ── Sleep ─────────────────────────────────────────────────────────────
      await _sleep(delayMs);
    }
  }

  // All retries exhausted — throw the last error with retry context
  if (lastError) {
    lastError.retryExhausted = true;
    lastError.retryAttempts = maxRetries;
    lastError.retryLabel = label;
  }
  throw lastError;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Determine whether an error should trigger a retry.
 *
 * @private
 * @param {Error}                    error           - The caught error.
 * @param {Array<Function|string>}   retryableErrors - Allowed error classes or code strings.
 * @returns {boolean}
 */
function _isRetryable(error, retryableErrors) {
  // If no filter is specified, ALL errors are retryable
  if (!retryableErrors || retryableErrors.length === 0) {
    return true;
  }

  return retryableErrors.some((matcher) => {
    // Match by error class (e.g. TypeError, SyntaxError)
    if (typeof matcher === 'function') {
      return error instanceof matcher;
    }
    // Match by error.code string (e.g. 'ECONNRESET', 'ETIMEDOUT')
    if (typeof matcher === 'string') {
      return (
        error.code === matcher ||
        error.name === matcher ||
        (error.constructor && error.constructor.name === matcher)
      );
    }
    return false;
  });
}

/**
 * Promise-based sleep.
 * @private
 * @param {number} ms
 * @returns {Promise<void>}
 */
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { withRetry };

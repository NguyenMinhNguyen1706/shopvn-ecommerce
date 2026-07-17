'use strict';

const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════════════════════
// Circuit Breaker — Resilience pattern for external service calls
// Prevents cascading failures by short-circuiting requests to failing services.
//
// States:
//   CLOSED    → Normal operation, requests pass through
//   OPEN      → Service is failing, requests are rejected immediately
//   HALF_OPEN → Testing if service recovered, limited requests allowed
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @readonly
 * @enum {string}
 */
const State = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

/**
 * Error thrown when the circuit breaker is in OPEN state and rejects a request.
 * @extends Error
 */
class CircuitBreakerOpenError extends Error {
  /**
   * @param {string} name - The circuit breaker instance name.
   * @param {number} remainingMs - Milliseconds until the circuit transitions to HALF_OPEN.
   */
  constructor(name, remainingMs) {
    super(`Circuit breaker "${name}" is OPEN. Retry after ${Math.ceil(remainingMs / 1000)}s.`);
    this.name = 'CircuitBreakerOpenError';
    this.code = 'CIRCUIT_BREAKER_OPEN';
    this.circuitName = name;
    this.remainingMs = remainingMs;
  }
}

/**
 * @typedef {Object} CircuitBreakerOptions
 * @property {number}  [failureThreshold=5]      - Consecutive failures before opening the circuit.
 * @property {number}  [resetTimeout=30000]       - Milliseconds to wait before moving from OPEN → HALF_OPEN.
 * @property {number}  [halfOpenMaxRequests=3]    - Max concurrent probe requests allowed in HALF_OPEN state.
 * @property {number}  [successThreshold=2]       - Successes in HALF_OPEN before closing the circuit.
 * @property {Function} [isFailure]               - Optional predicate `(error) => boolean` to classify failures.
 */

/**
 * Generic circuit breaker that wraps async functions with failure detection
 * and automatic recovery probing.
 *
 * @extends EventEmitter
 *
 * @example
 *   const cb = new CircuitBreaker('payment-api', { failureThreshold: 3 });
 *   const result = await cb.execute(() => paymentClient.charge(order));
 *
 * @fires CircuitBreaker#stateChange
 * @fires CircuitBreaker#success
 * @fires CircuitBreaker#failure
 */
class CircuitBreaker extends EventEmitter {
  /**
   * @param {string}               name    - Human-readable name used in logs and errors.
   * @param {CircuitBreakerOptions} [options={}]
   */
  constructor(name, options = {}) {
    super();

    /** @type {string} */
    this.name = name;

    /** @type {number} */
    this.failureThreshold = options.failureThreshold ?? 5;

    /** @type {number} */
    this.resetTimeout = options.resetTimeout ?? 30_000;

    /** @type {number} */
    this.halfOpenMaxRequests = options.halfOpenMaxRequests ?? 3;

    /** @type {number} */
    this.successThreshold = options.successThreshold ?? 2;

    /** @type {Function} */
    this._isFailure = options.isFailure ?? (() => true);

    // ── Internal state ────────────────────────────────────────────────────────
    /** @private */ this._state = State.CLOSED;
    /** @private */ this._failureCount = 0;
    /** @private */ this._successCount = 0;
    /** @private */ this._halfOpenRequests = 0;
    /** @private */ this._lastFailureTime = null;
    /** @private */ this._nextAttempt = 0;
  }

  // ── Public getters ──────────────────────────────────────────────────────────

  /** @returns {string} Current state of the circuit breaker. */
  get state() {
    return this._state;
  }

  /** @returns {number} Consecutive failure count in the current window. */
  get failureCount() {
    return this._failureCount;
  }

  /** @returns {number} Consecutive success count (relevant in HALF_OPEN). */
  get successCount() {
    return this._successCount;
  }

  /** @returns {Date|null} Timestamp of the last recorded failure. */
  get lastFailureTime() {
    return this._lastFailureTime;
  }

  /** @returns {boolean} Whether the circuit is allowing requests through. */
  get isAvailable() {
    if (this._state === State.CLOSED) return true;
    if (this._state === State.HALF_OPEN) return this._halfOpenRequests < this.halfOpenMaxRequests;
    // OPEN — check if resetTimeout has elapsed
    return Date.now() >= this._nextAttempt;
  }

  // ── Core method ─────────────────────────────────────────────────────────────

  /**
   * Execute an async function through the circuit breaker.
   *
   * - **CLOSED**: passes the call through; tracks failures.
   * - **OPEN**: rejects immediately with {@link CircuitBreakerOpenError}.
   * - **HALF_OPEN**: allows up to `halfOpenMaxRequests` probes.
   *
   * @template T
   * @param {() => Promise<T>} fn - The async function to protect.
   * @returns {Promise<T>} The result of `fn` if successful.
   * @throws {CircuitBreakerOpenError} If the circuit is OPEN and the reset timeout has not elapsed.
   * @throws {Error} The original error from `fn` after recording the failure.
   */
  async execute(fn) {
    // ── OPEN gate ───────────────────────────────────────────────────────────
    if (this._state === State.OPEN) {
      if (Date.now() < this._nextAttempt) {
        throw new CircuitBreakerOpenError(this.name, this._nextAttempt - Date.now());
      }
      // Reset timeout elapsed → transition to HALF_OPEN
      this._transitionTo(State.HALF_OPEN);
    }

    // ── HALF_OPEN gate ──────────────────────────────────────────────────────
    if (this._state === State.HALF_OPEN) {
      if (this._halfOpenRequests >= this.halfOpenMaxRequests) {
        throw new CircuitBreakerOpenError(this.name, this.resetTimeout);
      }
      this._halfOpenRequests++;
    }

    // ── Execute the wrapped function ────────────────────────────────────────
    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      if (this._isFailure(error)) {
        this._onFailure(error);
      }
      throw error;
    }
  }

  /**
   * Manually reset the circuit breaker to CLOSED state.
   * Useful for admin interventions or testing.
   */
  reset() {
    this._failureCount = 0;
    this._successCount = 0;
    this._halfOpenRequests = 0;
    this._lastFailureTime = null;
    this._nextAttempt = 0;
    this._transitionTo(State.CLOSED);
  }

  /**
   * Returns a snapshot of the circuit breaker's internal state for monitoring.
   * @returns {{ name: string, state: string, failureCount: number, successCount: number, lastFailureTime: Date|null }}
   */
  toJSON() {
    return {
      name: this.name,
      state: this._state,
      failureCount: this._failureCount,
      successCount: this._successCount,
      halfOpenRequests: this._halfOpenRequests,
      lastFailureTime: this._lastFailureTime,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Record a successful execution.
   * @private
   */
  _onSuccess() {
    this.emit('success', { name: this.name, state: this._state });

    if (this._state === State.HALF_OPEN) {
      this._successCount++;
      if (this._successCount >= this.successThreshold) {
        // Enough consecutive successes → close the circuit
        this._failureCount = 0;
        this._successCount = 0;
        this._halfOpenRequests = 0;
        this._transitionTo(State.CLOSED);
      }
    } else {
      // CLOSED state — reset failure counter on any success
      this._failureCount = 0;
      this._successCount++;
    }
  }

  /**
   * Record a failed execution.
   * @private
   * @param {Error} error
   */
  _onFailure(error) {
    this._failureCount++;
    this._lastFailureTime = new Date();
    this.emit('failure', { name: this.name, state: this._state, error });

    if (this._state === State.HALF_OPEN) {
      // Any failure in HALF_OPEN → back to OPEN
      this._successCount = 0;
      this._halfOpenRequests = 0;
      this._openCircuit();
    } else if (this._failureCount >= this.failureThreshold) {
      this._openCircuit();
    }
  }

  /**
   * Transition the circuit to OPEN and schedule the reset timeout.
   * @private
   */
  _openCircuit() {
    this._nextAttempt = Date.now() + this.resetTimeout;
    this._transitionTo(State.OPEN);
  }

  /**
   * Set the internal state and emit a `stateChange` event if the state changed.
   * @private
   * @param {string} newState
   */
  _transitionTo(newState) {
    if (this._state === newState) return;
    const previousState = this._state;
    this._state = newState;

    /**
     * @event CircuitBreaker#stateChange
     * @type {{ name: string, from: string, to: string, timestamp: Date }}
     */
    this.emit('stateChange', {
      name: this.name,
      from: previousState,
      to: newState,
      timestamp: new Date(),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory — Named circuit breaker instances with singleton registry
// ═══════════════════════════════════════════════════════════════════════════════

/** @type {Map<string, CircuitBreaker>} */
const _registry = new Map();

/**
 * Create or retrieve a named circuit breaker instance.
 *
 * Subsequent calls with the same `name` return the existing instance so that
 * all call-sites share the same failure counters and state.
 *
 * @param {string}               name    - Unique identifier (e.g. "ghn-api", "redis").
 * @param {CircuitBreakerOptions} [options={}]
 * @returns {CircuitBreaker}
 *
 * @example
 *   const ghnBreaker = createCircuitBreaker('ghn-api', { failureThreshold: 3 });
 *   const data = await ghnBreaker.execute(() => ghnClient.getShippingFee(params));
 */
function createCircuitBreaker(name, options = {}) {
  if (_registry.has(name)) {
    return _registry.get(name);
  }

  const breaker = new CircuitBreaker(name, options);

  // Default logging for state transitions
  breaker.on('stateChange', ({ from, to, timestamp }) => {
    const level = to === State.OPEN ? 'error' : 'info';
    const logFn = console[level] || console.log;
    logFn(
      `[CircuitBreaker] "${name}" ${from} → ${to} at ${timestamp.toISOString()}`
    );
  });

  _registry.set(name, breaker);
  return breaker;
}

/**
 * Get all registered circuit breaker instances (for health-check endpoints).
 * @returns {Map<string, CircuitBreaker>}
 */
function getRegistry() {
  return _registry;
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerOpenError,
  State,
  createCircuitBreaker,
  getRegistry,
};

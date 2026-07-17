'use strict';

const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════════
// Distributed Lock — Redis-based mutual exclusion for multi-instance deployments
//
// Uses the single-node Redlock pattern (SET NX PX + Lua release) which is safe
// for a single Redis instance / Sentinel setup. For true multi-master Redlock
// across independent Redis nodes, use the `redlock` npm package.
//
// Gracefully degrades: if Redis is down, the lock is "acquired" locally so the
// application keeps running (at the cost of no cross-instance mutual exclusion).
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lua script for atomic release.
 * Only deletes the key if its value matches the caller's lockId, preventing
 * one process from releasing another process's lock.
 * @private
 */
const RELEASE_LUA = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

/**
 * @typedef {Object} LockHandle
 * @property {string}   lockId    - The unique value stored in Redis for this lock.
 * @property {string}   lockName  - The Redis key used for the lock.
 * @property {Function} release   - Call to release the lock. Safe to call multiple times.
 * @property {boolean}  acquired  - Whether the lock was actually acquired in Redis (false = degraded mode).
 */

/**
 * @typedef {Object} WithLockOptions
 * @property {number} [ttlMs=10000]     - Lock time-to-live in milliseconds (auto-expires as safety net).
 * @property {number} [retryDelay=200]  - Delay between acquisition retries in milliseconds.
 * @property {number} [maxRetries=10]   - Maximum number of acquisition attempts.
 */

/**
 * Get the Redis client lazily to avoid circular-dependency issues at module
 * load time (the redis module connects asynchronously).
 *
 * @private
 * @returns {{ redisClient: import('redis').RedisClientType } | null}
 */
function _getRedis() {
  try {
    return require('../config/redis');
  } catch {
    return null;
  }
}

/**
 * Check whether the Redis client is connected and usable.
 * @private
 * @param {import('redis').RedisClientType} client
 * @returns {boolean}
 */
function _isRedisReady(client) {
  return client && client.isReady === true;
}

/**
 * Build the full Redis key for a lock.
 * @private
 * @param {string} lockName
 * @returns {string}
 */
function _lockKey(lockName) {
  return `lock:${lockName}`;
}

/**
 * Acquire a distributed lock in Redis.
 *
 * Uses `SET key lockId NX PX ttlMs` (atomic set-if-not-exists with expiry).
 * Returns a handle with a `release()` method that uses a Lua script to ensure
 * only the owner can release the lock.
 *
 * @param {string} lockName - Logical lock name (prefixed with `lock:` in Redis).
 * @param {number} [ttlMs=10000] - Time-to-live in milliseconds.
 * @returns {Promise<LockHandle|null>} Lock handle, or `null` if the lock is already held.
 *
 * @example
 *   const lock = await acquireLock('order:checkout:12345', 5000);
 *   if (!lock) throw new Error('Could not acquire lock');
 *   try {
 *     await processCheckout(orderId);
 *   } finally {
 *     await lock.release();
 *   }
 */
async function acquireLock(lockName, ttlMs = 10_000) {
  const redis = _getRedis();
  const client = redis && redis.redisClient;
  const key = _lockKey(lockName);
  const lockId = crypto.randomUUID();

  // ── Graceful degradation ────────────────────────────────────────────────
  if (!_isRedisReady(client)) {
    console.warn(
      `[DistributedLock] Redis unavailable — lock "${lockName}" acquired locally (no cross-instance safety)`
    );
    return _createDegradedHandle(lockName, lockId);
  }

  try {
    // SET key lockId NX PX ttlMs  →  returns 'OK' if set, null if key exists
    const result = await client.set(key, lockId, {
      NX: true,
      PX: ttlMs,
    });

    if (result !== 'OK') {
      // Lock is held by another process
      return null;
    }

    let released = false;

    return {
      lockId,
      lockName,
      acquired: true,

      /**
       * Release the lock atomically. Safe to call multiple times.
       * @returns {Promise<boolean>} `true` if the lock was successfully released.
       */
      async release() {
        if (released) return false;
        released = true;
        try {
          if (!_isRedisReady(client)) return false;
          const res = await client.eval(RELEASE_LUA, {
            keys: [key],
            arguments: [lockId],
          });
          return res === 1;
        } catch (err) {
          console.error(`[DistributedLock] Failed to release "${lockName}":`, err.message);
          return false;
        }
      },
    };
  } catch (err) {
    console.error(`[DistributedLock] Failed to acquire "${lockName}":`, err.message);
    // Degrade gracefully — return a local-only handle
    return _createDegradedHandle(lockName, lockId);
  }
}

/**
 * Execute a function while holding a distributed lock.
 *
 * Handles acquisition, retry, execution, and release automatically.
 * If the lock cannot be acquired after `maxRetries`, the error is thrown.
 *
 * @template T
 * @param {string}           lockName - Logical lock name.
 * @param {() => Promise<T>} fn       - The protected function to execute.
 * @param {WithLockOptions}  [options={}]
 * @returns {Promise<T>} The return value of `fn`.
 * @throws {Error} If the lock cannot be acquired after all retries.
 *
 * @example
 *   const result = await withLock('inventory:sku-42', async () => {
 *     const stock = await getStock('sku-42');
 *     if (stock < 1) throw new Error('Out of stock');
 *     await decrementStock('sku-42');
 *     return { success: true };
 *   }, { ttlMs: 5000 });
 */
async function withLock(lockName, fn, options = {}) {
  const { ttlMs = 10_000, retryDelay = 200, maxRetries = 10 } = options;

  let lock = null;

  // ── Retry acquisition loop ────────────────────────────────────────────────
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lock = await acquireLock(lockName, ttlMs);
    if (lock) break;

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  if (!lock) {
    const err = new Error(
      `[DistributedLock] Could not acquire lock "${lockName}" after ${maxRetries + 1} attempts`
    );
    err.code = 'LOCK_ACQUISITION_FAILED';
    err.lockName = lockName;
    throw err;
  }

  // ── Execute under lock ────────────────────────────────────────────────────
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}

// ── Private helpers ─────────────────────────────────────────────────────────

/**
 * Create a degraded (local-only) lock handle when Redis is unavailable.
 * @private
 * @param {string} lockName
 * @param {string} lockId
 * @returns {LockHandle}
 */
function _createDegradedHandle(lockName, lockId) {
  return {
    lockId,
    lockName,
    acquired: false,
    async release() {
      return true;
    },
  };
}

module.exports = {
  acquireLock,
  withLock,
};

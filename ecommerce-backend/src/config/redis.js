const redis = require('redis');

// ═══════════════════════════════════════════════════════════════════════════════
// Redis Configuration — Enhanced for 1M users
// Concepts: Caching, Cache Invalidation (tag-based), Distributed Locks,
//           Connection Pooling, Graceful Degradation
// ═══════════════════════════════════════════════════════════════════════════════

const logger = console;

const redisClient = redis.createClient({
  url: process.env.REDIS_URL
    || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB) || 0,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        logger.error('Redis: max reconnect attempts reached, giving up');
        return false;
      }
      // Exponential backoff with cap — Concept: Exponential Backoff
      return Math.min(retries * 200, 5000);
    },
    connectTimeout: 10000,
  },
});

// Track connection state
let isConnected = false;

redisClient.on('connect', () => {
  isConnected = true;
  logger.info('✓ Redis connected successfully');
});

redisClient.on('error', (err) => {
  isConnected = false;
  logger.error('Redis error:', err.message);
});

redisClient.on('end', () => {
  isConnected = false;
});

// Connect (non-blocking — if Redis is down, the app still starts)
redisClient.connect().catch((err) => {
  logger.error('Redis initial connection failed:', err.message);
  logger.info('⚠ App will run without cache (Redis unavailable)');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Utilities — Enhanced with Tag-based Invalidation
// Concept: Cache Invalidation — replaces SCAN-based delPattern with O(N) tag sets
// ═══════════════════════════════════════════════════════════════════════════════

const cacheUtils = {
  /**
   * Set cache with TTL and optional tags for group invalidation
   * @param {string} key - Cache key
   * @param {*} value - Value to cache (will be JSON serialized)
   * @param {number} ttl - Time to live in seconds (default 3600)
   * @param {string[]} tags - Optional tags for group invalidation
   */
  async set(key, value, ttl = 3600, tags = []) {
    if (!isConnected) return null;
    try {
      const pipeline = redisClient.multi();
      pipeline.setEx(key, ttl, JSON.stringify(value));

      // Register key under each tag — Concept: Cache Invalidation (tag-based)
      for (const tag of tags) {
        const tagKey = `cache:tag:${tag}`;
        pipeline.sAdd(tagKey, key);
        // Tag set expires slightly after max TTL to auto-cleanup
        pipeline.expire(tagKey, ttl + 60);
      }

      await pipeline.exec();
      return 'OK';
    } catch (err) {
      logger.error('Redis SET error:', err.message);
      return null;
    }
  },

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {*} Parsed value or null
   */
  async get(key) {
    if (!isConnected) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error('Redis GET error:', err.message);
      return null;
    }
  },

  /**
   * Delete cache by exact key
   * @param {string} key - Cache key to delete
   */
  async del(key) {
    if (!isConnected) return null;
    try {
      return await redisClient.del(key);
    } catch (err) {
      logger.error('Redis DEL error:', err.message);
      return null;
    }
  },

  /**
   * Invalidate all cache keys under a tag — O(N) where N = keys in tag
   * Replaces the old SCAN-based delPattern which was O(full keyspace)
   * Concept: Cache Invalidation
   * @param {string} tag - Tag name to invalidate
   */
  async invalidateTag(tag) {
    if (!isConnected) return 0;
    try {
      const tagKey = `cache:tag:${tag}`;
      const keys = await redisClient.sMembers(tagKey);
      if (keys.length > 0) {
        const pipeline = redisClient.multi();
        pipeline.del(keys);
        pipeline.del(tagKey);
        await pipeline.exec();
        return keys.length;
      }
      return 0;
    } catch (err) {
      logger.error('Redis INVALIDATE_TAG error:', err.message);
      return 0;
    }
  },

  /**
   * @deprecated Use invalidateTag() instead. Kept for backward compatibility.
   * Delete by pattern using SCAN — O(full keyspace), avoid in production!
   */
  async delPattern(pattern) {
    if (!isConnected) return 0;
    try {
      const keys = [];
      for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);
      }
      if (keys.length > 0) {
        return await redisClient.del(keys);
      }
      return 0;
    } catch (err) {
      logger.error('Redis DEL_PATTERN error:', err.message);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!isConnected) return false;
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (err) {
      logger.error('Redis EXISTS error:', err.message);
      return false;
    }
  },

  /**
   * Increment counter (for rate limiting)
   * Concept: Rate Limiting
   */
  async incr(key, ttl = 3600) {
    if (!isConnected) return -1;  // ← CHANGED: return -1 instead of 0 to support fail-closed rate limiting
    try {
      const count = await redisClient.incr(key);
      await redisClient.expire(key, ttl);
      return count;
    } catch (err) {
      logger.error('Redis INCR error:', err.message);
      return -1;  // ← fail-closed: caller should treat -1 as "unable to check, block request"
    }
  },

  /**
   * Check if Redis is connected
   */
  isReady() {
    return isConnected;
  },

  // ── Token Blacklist — Concept: JWT Rotation ──────────────────────────────
  /**
   * Add JWT token to blacklist (for logout/rotation)
   * @param {string} jti - JWT ID or token hash
   * @param {number} ttlSeconds - TTL matching remaining token lifetime
   */
  async blacklistToken(jti, ttlSeconds) {
    if (!isConnected) return null;
    try {
      return await redisClient.setEx(`blacklist:${jti}`, ttlSeconds, '1');
    } catch (err) {
      logger.error('Redis BLACKLIST error:', err.message);
      return null;
    }
  },

  /**
   * Check if token is blacklisted
   * @param {string} jti - JWT ID or token hash
   * @returns {boolean}
   */
  async isBlacklisted(jti) {
    if (!isConnected) return false;
    try {
      const result = await redisClient.exists(`blacklist:${jti}`);
      return result === 1;
    } catch (err) {
      logger.error('Redis BLACKLIST_CHECK error:', err.message);
      return false;
    }
  },
};

module.exports = {
  redisClient,
  cacheUtils,
};

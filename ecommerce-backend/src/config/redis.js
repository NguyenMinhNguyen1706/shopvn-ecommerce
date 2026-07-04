const redis = require('redis');
const logger = console;

// Redis client configuration (redis v6 API)
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
    || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB) || 0,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: max reconnect attempts reached, giving up');
        return false;
      }
      return Math.min(retries * 100, 3000);
    }
  }
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

// Utility functions for cache operations
const cacheUtils = {
  // Set cache with TTL
  async set(key, value, ttl = 3600) {
    if (!isConnected) return null;
    try {
      return await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (err) {
      logger.error('Redis SET error:', err.message);
      return null;
    }
  },

  // Get cache
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

  // Delete cache
  async del(key) {
    if (!isConnected) return null;
    try {
      return await redisClient.del(key);
    } catch (err) {
      logger.error('Redis DEL error:', err.message);
      return null;
    }
  },

  // Delete by pattern
  async delPattern(pattern) {
    if (!isConnected) return 0;
    try {
      const keys = [];
      for await (const key of redisClient.scanIterator({ MATCH: pattern })) {
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

  // Check if key exists
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

  // Increment counter
  async incr(key, ttl = 3600) {
    if (!isConnected) return 0;
    try {
      const count = await redisClient.incr(key);
      await redisClient.expire(key, ttl);
      return count;
    } catch (err) {
      logger.error('Redis INCR error:', err.message);
      return 0;
    }
  }
};

module.exports = {
  redisClient,
  cacheUtils
};

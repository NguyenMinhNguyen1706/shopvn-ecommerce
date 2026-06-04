const redis = require('redis');
const logger = console;

// Redis client configuration
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  database: process.env.REDIS_DB || 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('connect', () => {
  logger.info('✓ Redis connected successfully');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

// Utility functions for cache operations
const cacheUtils = {
  // Set cache with TTL
  set: (key, value, ttl = 3600) => {
    return new Promise((resolve, reject) => {
      redisClient.setex(key, ttl, JSON.stringify(value), (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    });
  },

  // Get cache
  get: (key) => {
    return new Promise((resolve, reject) => {
      redisClient.get(key, (err, data) => {
        if (err) reject(err);
        else resolve(data ? JSON.parse(data) : null);
      });
    });
  },

  // Delete cache
  del: (key) => {
    return new Promise((resolve, reject) => {
      redisClient.del(key, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    });
  },

  // Delete by pattern
  delPattern: (pattern) => {
    return new Promise((resolve, reject) => {
      redisClient.keys(pattern, (err, keys) => {
        if (err) reject(err);
        if (keys.length > 0) {
          redisClient.del(keys, (err, reply) => {
            if (err) reject(err);
            else resolve(reply);
          });
        } else {
          resolve(0);
        }
      });
    });
  },

  // Check if key exists
  exists: (key) => {
    return new Promise((resolve, reject) => {
      redisClient.exists(key, (err, reply) => {
        if (err) reject(err);
        else resolve(reply === 1);
      });
    });
  },

  // Increment counter
  incr: (key, ttl = 3600) => {
    return new Promise((resolve, reject) => {
      redisClient.incr(key, (err, count) => {
        if (err) reject(err);
        else {
          // Set TTL only for new keys
          redisClient.expire(key, ttl, (expireErr) => {
            if (expireErr) reject(expireErr);
            else resolve(count);
          });
        }
      });
    });
  }
};

module.exports = {
  redisClient,
  cacheUtils
};


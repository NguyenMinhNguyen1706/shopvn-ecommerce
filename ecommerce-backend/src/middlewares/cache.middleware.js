const { cacheUtils } = require('../config/redis');
const logger = console;

/**
 * Cache Middleware
 * Implements caching layer between Express routes and MongoDB
 * Dramatically improves performance for frequently accessed data
 */

/**
 * Generic cache middleware factory
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Function to generate cache key from request
 */
const cacheMiddleware = (ttl = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key
      const cacheKey = keyGenerator ? keyGenerator(req) : req.originalUrl;

      // Try to get from cache
      const cachedData = await cacheUtils.get(cacheKey);

      if (cachedData) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Cache miss - continue to controller
      res.set('X-Cache', 'MISS');

      // Override json() to cache response
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        // Cache successful responses (status 200)
        if (res.statusCode === 200 && data.success !== false) {
          cacheUtils.set(cacheKey, data, ttl).catch(err => {
            logger.warn(`Cache set error: ${err.message}`);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error.message);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Specific cache middleware for product list
 */
const productListCache = cacheMiddleware(3600, (req) => {
  // Include query parameters in cache key
  const { page = 1, limit = 20, category = '', search = '' } = req.query;
  return `products:list:${category}:${search}:${page}:${limit}`;
});

/**
 * Specific cache middleware for product details
 */
const productDetailCache = cacheMiddleware(1800, (req) => {
  return `product:${req.params.id}`;
});

/**
 * Specific cache middleware for categories
 */
const categoriesCache = cacheMiddleware(3600, () => {
  return 'categories:list:all';
});

/**
 * Specific cache middleware for trending products
 */
const trendingProductsCache = cacheMiddleware(1800, () => {
  return 'products:trending';
});

/**
 * Specific cache middleware for promotions
 */
const promotionsCache = cacheMiddleware(300, () => {
  return 'promotions:active';
});

/**
 * Clear cache utility
 * Used when data is updated
 */
const clearCache = {
  /**
   * Clear product related caches
   */
  products: async () => {
    await cacheUtils.delPattern('products:*');
    logger.info('✓ Cleared products cache');
  },

  /**
   * Clear specific product cache
   */
  product: async (productId) => {
    await cacheUtils.del(`product:${productId}`);
    await cacheUtils.delPattern(`products:*`);
    logger.info(`✓ Cleared cache for product ${productId}`);
  },

  /**
   * Clear categories cache
   */
  categories: async () => {
    await cacheUtils.del('categories:list:all');
    logger.info('✓ Cleared categories cache');
  },

  /**
   * Clear promotions cache
   */
  promotions: async () => {
    await cacheUtils.del('promotions:active');
    logger.info('✓ Cleared promotions cache');
  },

  /**
   * Clear cart for specific user
   */
  userCart: async (userId) => {
    await cacheUtils.del(`cart:${userId}`);
    logger.info(`✓ Cleared cart cache for user ${userId}`);
  },

  /**
   * Clear all cache
   */
  all: async () => {
    await cacheUtils.delPattern('*');
    logger.warn('✓ Cleared ALL cache');
  }
};

module.exports = {
  cacheMiddleware,
  productListCache,
  productDetailCache,
  categoriesCache,
  trendingProductsCache,
  promotionsCache,
  clearCache
};


const { cacheUtils } = require('../config/redis');
const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'CacheMiddleware' }, process.env.LOG_LEVEL || 'info');

/**
 * Cache Middleware with Tag-based Invalidation
 * Concepts: Caching, Cache Invalidation, Edge Caching
 */

/**
 * Generic cache middleware factory
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Function to generate cache key from request
 * @param {string[]|Function} tags - Cache tags for group invalidation
 */
const cacheMiddleware = (ttl = 3600, keyGenerator = null, tags = []) => {
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
        res.set('Cache-Control', `public, max-age=${ttl}`);
        return res.json(cachedData);
      }

      // Cache miss
      res.set('X-Cache', 'MISS');

      // Intercept json() to cache response
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        if (res.statusCode === 200 && data && data.success !== false) {
          // Resolve tags if it is a function
          const resolvedTags = typeof tags === 'function' ? tags(req) : tags;

          cacheUtils.set(cacheKey, data, ttl, resolvedTags).catch(err => {
            logger.warn({ err }, 'Cache set error');
          });
          res.set('Cache-Control', `public, max-age=${ttl}`);
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error({ err: error }, 'Cache middleware error');
      next();
    }
  };
};

function stableQueryKey(query) {
  return Object.keys(query || {})
    .sort()
    .map((key) => {
      const value = Array.isArray(query[key]) ? query[key].join(',') : query[key];
      return `${key}:${value ?? ''}`;
    })
    .join('|') || 'all';
}

/**
 * Cache product list (tag: 'products')
 */
const productListCache = cacheMiddleware(
  3600,
  (req) => `products:list:${stableQueryKey(req.query)}`,
  ['products']
);

/**
 * Cache product details (tags: ['products', 'product_:id'])
 */
const productDetailCache = cacheMiddleware(
  1800,
  (req) => `product:${req.params.id}`,
  (req) => ['products', `product_${req.params.id}`]
);

/**
 * Cache categories (tag: 'categories')
 */
const categoriesCache = cacheMiddleware(
  3600,
  () => 'categories:list:all',
  ['categories']
);

/**
 * Cache trending products (tag: 'products')
 */
const trendingProductsCache = cacheMiddleware(
  1800,
  () => 'products:trending',
  ['products']
);

/**
 * Cache active promotions (tag: 'promotions')
 */
const promotionsCache = cacheMiddleware(
  300,
  () => 'promotions:active',
  ['promotions']
);

/**
 * Cache product reviews (tag: 'reviews_product_:productId')
 */
const reviewsCache = cacheMiddleware(
  1800,
  (req) => `reviews:product:${req.params.productId}`,
  (req) => [`reviews_product_${req.params.productId}`]
);

/**
 * Clear cache utility (Tag-based invalidation - O(N) instead of O(keyspace))
 * Concept: Cache Invalidation
 */
const clearCache = {
  productReviews: async (productId) => {
    await cacheUtils.invalidateTag(`reviews_product_${productId}`);
    logger.info(`✓ Invalidated reviews cache for product ${productId}`);
  },

  products: async () => {
    await cacheUtils.invalidateTag('products');
    logger.info('✓ Invalidated products cache group');
  },

  product: async (productId) => {
    // Invalidate product group + specific product details
    await Promise.all([
      cacheUtils.invalidateTag('products'),
      cacheUtils.invalidateTag(`product_${productId}`)
    ]);
    logger.info(`✓ Invalidated cache for product ${productId}`);
  },

  categories: async () => {
    await cacheUtils.invalidateTag('categories');
    logger.info('✓ Invalidated categories cache group');
  },

  promotions: async () => {
    await cacheUtils.invalidateTag('promotions');
    logger.info('✓ Invalidated promotions cache group');
  },

  userCart: async (userId) => {
    await cacheUtils.del(`cart:${userId}`);
    logger.info(`✓ Cleared cart cache for user ${userId}`);
  },

  all: async () => {
    // Use clear keys iteration for safety
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
  reviewsCache,
  clearCache
};

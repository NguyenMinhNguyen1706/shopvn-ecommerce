const { cacheUtils } = require('../config/redis');

/**
 * Idempotency Middleware
 * Concepts: Idempotency, Retries, API Resilience
 * Prevents processing duplicate POST/PUT/PATCH requests (e.g. payment retries)
 */
function idempotency(options = {}) {
  const ttl = options.ttl || 86400; // default 24 hours in seconds

  return async (req, res, next) => {
    // Only apply to mutations (POST, PUT, PATCH)
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    const key = req.headers['idempotency-key'];
    if (!key) {
      return next(); // skip if no idempotency key provided
    }

    // Standardize idempotency cache key
    const cacheKey = `idempotency:${key}`;

    try {
      // Check if this key has already been processed
      const cachedResponse = await cacheUtils.get(cacheKey);

      if (cachedResponse) {
        res.set('X-Cache-Idempotence', 'HIT');
        res.set('Content-Type', cachedResponse.headers['content-type'] || 'application/json');
        return res.status(cachedResponse.statusCode).send(cachedResponse.body);
      }

      // Intercept res.send / res.json to capture response
      const originalSend = res.send.bind(res);
      res.send = function (body) {
        // Cache only successful/safe responses (exclude 5xx server errors, we want retries for those)
        if (res.statusCode >= 200 && res.statusCode < 500) {
          const responseToCache = {
            statusCode: res.statusCode,
            body: body,
            headers: {
              'content-type': res.get('content-type')
            }
          };
          cacheUtils.set(cacheKey, responseToCache, ttl).catch(err => {
            console.error('[Idempotency] Failed to cache response:', err.message);
          });
        }
        return originalSend(body);
      };

      next();
    } catch (err) {
      console.error('[Idempotency] Middleware error, skipping checks:', err.message);
      next(); // fail-open: allow request to process if idempotency layer fails
    }
  };
}

module.exports = idempotency;

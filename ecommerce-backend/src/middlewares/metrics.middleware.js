let metrics;
try {
  metrics = require('../config/metrics');
} catch (err) {
  // Graceful fallback if metrics configuration fails to load
  console.warn('[MetricsMiddleware] metrics config not loaded, skipping metric collection');
}

/**
 * Normalize paths to avoid high cardinality in Prometheus metrics
 * e.g., `/api/v1/products/42` -> `/api/v1/products/:id`
 */
function normalizePath(path) {
  return path
    .split('?')[0] // remove query params
    .replace(/\/\d+(?=\/|$)/g, '/:id') // replace numbers in path with :id
    .replace(/\/[\w-]{36}(?=\/|$)/g, '/:id') // replace UUIDs with :id
    .replace(/\/reviews\/product\/.+$/g, '/reviews/product/:productId'); // normalize review endpoints
}

/**
 * HTTP metrics instrumentation middleware
 * Concepts: Metrics, Observability, SLIs, Latency
 */
function httpMetrics(req, res, next) {
  // Skip metrics collection if metrics module failed or endpoint is internal
  if (!metrics || ['/health', '/ready', '/metrics'].includes(req.path)) {
    return next();
  }

  // Increment active connections
  if (metrics.activeConnections) {
    metrics.activeConnections.inc();
  }

  const startHrTime = process.hrtime.bigint();

  res.on('finish', () => {
    // Decrement active connections
    if (metrics.activeConnections) {
      metrics.activeConnections.dec();
    }

    const endHrTime = process.hrtime.bigint();
    // Convert duration from nanoseconds to seconds
    const durationSeconds = Number(endHrTime - startHrTime) / 1000000000;

    const method = req.method;
    const path = normalizePath(req.baseUrl + req.path);
    const statusCode = res.statusCode;

    // Record metrics
    if (metrics.httpRequestsTotal) {
      metrics.httpRequestsTotal.inc({
        method,
        route: path,
        status_code: statusCode,
      });
    }

    if (metrics.httpRequestDurationSeconds) {
      metrics.httpRequestDurationSeconds.observe(
        { method, route: path },
        durationSeconds
      );
    }
  });

  next();
}

module.exports = httpMetrics;

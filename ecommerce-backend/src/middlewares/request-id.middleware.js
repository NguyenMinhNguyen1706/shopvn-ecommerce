const crypto = require('crypto');

/**
 * Request ID middleware (Correlation ID)
 * Concepts: Distributed Tracing, Logging
 * Ensures every incoming request has a unique identifier
 */
function requestIdMiddleware(req, res, next) {
  // Check for existing Request-ID header (from Nginx, Cloudflare or Gateway)
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  // Attach to request object for downstream usage
  req.requestId = requestId;

  // Set response header
  res.set('X-Request-ID', requestId);

  next();
}

module.exports = requestIdMiddleware;

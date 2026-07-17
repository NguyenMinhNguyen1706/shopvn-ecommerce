const crypto = require('crypto');
const { cacheUtils } = require('../config/redis');

// ═══════════════════════════════════════════════════════════════════════════════
// Security Middleware — Enhanced for 1M users
// Concepts: Rate Limiting (fail-closed), DDoS Protection, WAF,
//           CORS hardening, Webhook Security, SSRF Prevention
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));

  // Use a fixed-length comparison to prevent length oracle
  if (leftBuffer.length !== rightBuffer.length) {
    // Compare against self to keep constant time, then return false
    crypto.timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Build a rate limit key from request info
 * Uses sliding window (bucket-based) approach
 */
function buildRateLimitKey(req, prefix, windowSeconds) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));

  return `rate:${prefix}:${ip}:${bucket}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limiting — FAIL-CLOSED when Redis is down
// Concept: Rate Limiting, DDoS Protection
//
// CRITICAL FIX: Old code returned 0 on Redis error → all requests passed through
// New code returns -1 on error → rate limiting BLOCKS when Redis is unavailable
// This prevents DDoS attacks from bypassing rate limits during Redis outages
// ═══════════════════════════════════════════════════════════════════════════════

function apiRateLimit(options = {}) {
  const windowSeconds = Number(options.windowSeconds || process.env.API_RATE_LIMIT_WINDOW_SECONDS || 60);
  const max = Number(options.max || process.env.API_RATE_LIMIT_MAX || 300);
  const prefix = options.prefix || 'api';
  const failOpen = options.failOpen ?? process.env.NODE_ENV !== 'production';

  return async (req, res, next) => {
    if (!max || max < 1) {
      return next();
    }

    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    try {
      const key = buildRateLimitKey(req, prefix, windowSeconds);
      const count = await cacheUtils.incr(key, windowSeconds);

      // Fail-closed: if Redis returned -1 (error/down), block by default
      // Concept: DDoS Protection — don't let traffic through when we can't count
      if (count === -1 && !failOpen) {
        res.set('Retry-After', '30');
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable. Please try again later.',
        });
      }

      if (count > max) {
        // Set standard rate limit headers
        res.set('Retry-After', String(windowSeconds));
        res.set('X-RateLimit-Limit', String(max));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + windowSeconds));
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
        });
      }

      // Set rate limit info headers for clients
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', String(Math.max(0, max - count)));
    } catch (error) {
      // If rate limiting check fails entirely, fail-closed by default
      if (!failOpen) {
        console.warn('[RateLimit] Redis error, blocking request (fail-closed):', error.message);
        res.set('Retry-After', '30');
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable.',
        });
      }
      console.warn('[RateLimit] Redis error, allowing request (fail-open):', error.message);
    }

    return next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Per-User Rate Limiting — for authenticated endpoints
// Concept: Rate Limiting per user identity (not just IP)
// ═══════════════════════════════════════════════════════════════════════════════

function userRateLimit(options = {}) {
  const windowSeconds = Number(options.windowSeconds || 60);
  const max = Number(options.max || 100);
  const prefix = options.prefix || 'user';

  return async (req, res, next) => {
    if (!req.user?.id) return next(); // no user = skip (use IP-based limit)

    try {
      const key = `rate:${prefix}:${req.user.id}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
      const count = await cacheUtils.incr(key, windowSeconds);

      if (count === -1) {
        return next(); // fail-open for per-user (IP limit is fail-closed)
      }

      if (count > max) {
        res.set('Retry-After', String(windowSeconds));
        return res.status(429).json({
          success: false,
          message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
        });
      }
    } catch (error) {
      console.warn('[UserRateLimit] skipped:', error.message);
    }

    return next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Webhook Security — HMAC Signature Verification
// Concept: WAF, Webhook Security
// ═══════════════════════════════════════════════════════════════════════════════

function verifyHmacSignature(req, secret, signatureHeader) {
  const signature = req.get(signatureHeader);
  if (!signature) return false;

  const normalizedSignature = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature;
  const payload = JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return safeCompare(normalizedSignature, expected);
}

function requireWebhookSecret(options = {}) {
  const secretHeader = options.secretHeader || 'x-webhook-secret';
  const signatureHeader = options.signatureHeader || 'x-webhook-signature';

  return (req, res, next) => {
    const secret = process.env.WEBHOOK_SHARED_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          message: 'Webhook secret is not configured.',
        });
      }

      console.warn('[Webhook] WEBHOOK_SHARED_SECRET is not set; allowing unsigned webhook in non-production.');
      return next();
    }

    const providedSecret = req.get(secretHeader);
    if (providedSecret && safeCompare(providedSecret, secret)) {
      return next();
    }

    if (verifyHmacSignature(req, secret, signatureHeader)) {
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid webhook signature.',
    });
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Security Headers — Enhanced
// Concept: XSS, CSRF, WAF
// ═══════════════════════════════════════════════════════════════════════════════

function securityHeaders() {
  return (req, res, next) => {
    // Prevent MIME type sniffing — XSS prevention
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Control referrer information leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Restrict browser features
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Content Security Policy — prevent XSS
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
    // Strict Transport Security — force HTTPS
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  };
}

module.exports = {
  apiRateLimit,
  userRateLimit,
  requireWebhookSecret,
  securityHeaders,
};

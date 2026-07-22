require('dotenv').config({ quiet: true });

// ═══════════════════════════════════════════════════════════════════════════════
// ✨ NEW 2026: Validate critical secrets at startup
// ═══════════════════════════════════════════════════════════════════════════════
const { validateSecrets } = require('./src/config/secrets');
validateSecrets(); // Throws and aborts startup if required envs are missing

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const compression = require('compression');
const sequelize  = require('./src/config/database');

// ── Observability & Infrastructure imports ────────────────────────────────────
const { logger } = require('./src/config/logger');
const { redisClient } = require('./src/config/redis');
const { apiRateLimit } = require('./src/middlewares/security.middleware');
const metrics = require('./src/config/metrics');

// Middleware imports
const requestId = require('./src/middlewares/request-id.middleware');
const { backpressure } = require('./src/middlewares/backpressure.middleware');
const idempotency = require('./src/middlewares/idempotency.middleware');
const httpMetrics = require('./src/middlewares/metrics.middleware');
const { securityHeaders } = require('./src/middlewares/security.middleware');
const { sanitize } = require('./src/middlewares/validation.middleware');

// Models
require('./src/models/Order');
require('./src/models/OrderItem');
require('./src/models/Review');
require('./src/models/MasterInventory');
require('./src/models/InventoryTransaction');
require('./src/models/LoyaltyPoints');
require('./src/models/ActionPlan');

const app = express();
app.set('trust proxy', 1);

let startupDatabaseReady = false;
let startupDatabaseError = null;

function getAllowedOrigins() {
  const origins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    ...(process.env.CORS_ORIGINS || '').split(','),
  ]
    .map(origin => origin && origin.trim())
    .filter(Boolean);

  return [...new Set(origins)];
}

// ── Infrastructure Middleware ──────────────────────────────────────────────────
app.use(requestId); // Attach X-Request-ID early for tracing
app.use(httpMetrics); // HTTP instrumentation for Prometheus
app.use(backpressure()); // Overload protection (CPU/memory/concurrency)
app.use(compression()); // GZIP compression

// Security Headers (CSP, XSS, HSTS)
app.use(securityHeaders());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = getAllowedOrigins();
app.use(cors({
  origin(origin, callback) {
    // CORS is a browser policy; health checks, webhooks and server clients may omit Origin.
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const error = new Error('Origin is not allowed by CORS.');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
}));

// ── Logging ───────────────────────────────────────────────────────────────────
// Structured Morgan logs that pipe into our Pinot logger
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info({ type: 'http_log' }, message.trim())
  }
}));

// ── Body Parsing & Idempotency ────────────────────────────────────────────────
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT || '2mb' }));
app.use(sanitize); // Body/query/params are available only after parsers run.
app.use(idempotency()); // Idempotency keys for mutations

// ── Swagger Docs ──────────────────────────────────────────────────────────────
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'ShopVN API Docs',
}));

// ── Prometheus Metrics Endpoint ────────────────────────────────────────────────
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics.serialize());
});

// ── Routes ───────────────────────────────────────────────────────────────────
const authRoutes    = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const cartRoutes    = require('./src/routes/cart.routes');
const orderRoutes   = require('./src/routes/order.routes');
const adminRoutes   = require('./src/routes/admin.routes');
const uploadRoutes  = require('./src/routes/upload.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const reviewRoutes  = require('./src/routes/review.routes');

// Shipping, webhooks, wms, chatbot
const shippingRoutes = require('./src/routes/shipping.routes');
const webhooksRoutes = require('./src/routes/webhooks.routes');
const wmsRoutes = require('./src/routes/wms.routes');
const chatbotRoutes = require('./src/routes/chatbot.routes');

// Rate limiting for API requests
app.use('/api', apiRateLimit());

// Mount API version 1 routes - Concept: API Versioning
app.use('/api/v1/auth',     authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart',     cartRoutes);
app.use('/api/v1/orders',   orderRoutes);
app.use('/api/v1/admin',    adminRoutes);
app.use('/api/v1/upload',   uploadRoutes);
app.use('/api/v1/payment',  paymentRoutes);
app.use('/api/v1/reviews',  reviewRoutes);
app.use('/api/v1/shipping', shippingRoutes);
app.use('/api/v1/webhooks', webhooksRoutes);
app.use('/api/v1/wms',      wmsRoutes);
app.use('/api/v1/chatbot',  chatbotRoutes);

// Backward compatibility redirect /api -> /api/v1
app.use(/^\/api\/(.*)/, (req, res) => {
  const targetPath = req.originalUrl.replace('/api/', '/api/v1/');
  res.redirect(307, targetPath);
});

// Health & Readiness Probes
app.get('/health', (req, res) => {
  res.json({
    status:    'OK',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV
  });
});

app.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    const isRedisReady = redisClient.isReady === true;
    if (!startupDatabaseReady) {
      return res.status(503).json({
        status: 'starting',
        database: 'connected',
        redis: isRedisReady ? 'connected' : 'disconnected',
        message: startupDatabaseError ? 'Database initialization failed' : 'Database initialization is still running',
        timestamp: new Date().toISOString(),
      });
    }
    if (!isRedisReady) {
      return res.status(503).json({
        status: 'not_ready',
        database: 'connected',
        redis: 'disconnected',
        message: 'Redis readiness check failed',
        timestamp: new Date().toISOString(),
      });
    }


    res.json({
      status: 'ready',
      database: 'connected',
      redis: isRedisReady ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      message: 'Database readiness check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// ── 404 & Global error handlers ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Không tìm thấy tài nguyên.',
    requestId: req.requestId
  });
});
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, requestId: req.requestId }, 'Request processing error');

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const exposeMessage = status < 500 || process.env.NODE_ENV !== 'production';

  res.status(status).json({
    success: false,
    message: exposeMessage ? (err.message || 'Internal Server Error') : 'Đã xảy ra lỗi máy chủ.',
    requestId: req.requestId
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

function envFlag(name, defaultValue = true) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

async function withDatabaseBootstrapLock(task) {
  const lockId = Number(process.env.DB_BOOTSTRAP_LOCK_ID || 20260704);

  await sequelize.query('SELECT pg_advisory_lock(:lockId)', {
    replacements: { lockId },
  });

  try {
    await task();
  } finally {
    await sequelize.query('SELECT pg_advisory_unlock(:lockId)', {
      replacements: { lockId },
    });
  }
}

async function runDatabaseBootstrap() {
  const syncOnStartup = envFlag('DB_SYNC_ON_STARTUP', false); // Default false for CLI migrations
  const seedOnStartup = envFlag('SEED_ON_STARTUP', true);
  const ensureInventoryOnStartup = envFlag('ENSURE_INVENTORY_ON_STARTUP', true);

  if (!syncOnStartup && !seedOnStartup && !ensureInventoryOnStartup) {
    logger.info('[DB] Startup bootstrap disabled');
    return;
  }

  await withDatabaseBootstrapLock(async () => {
    if (syncOnStartup) {
      logger.warn('[DB] DB_SYNC_ON_STARTUP is enabled, running sync...');
      await sequelize.sync();
    }

    const productService = require('./src/services/product.service');
    if (seedOnStartup) {
      await productService.seedIfEmpty();
    }

    if (ensureInventoryOnStartup) {
      await productService.ensureMasterInventory();
    }
  });
}

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('[DB] Connected');

    await runDatabaseBootstrap();

    startupDatabaseReady = true;
    startupDatabaseError = null;
    logger.info('[DB] Initialization complete');
  } catch (err) {
    startupDatabaseReady = false;
    startupDatabaseError = err;
    logger.error({ err }, '[DB] Initialization failed');
  }
}

const server = app.listen(PORT, () => {
  logger.info(`[App] Server running at http://localhost:${PORT}`);
  initializeDatabase();
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
// Concept: Graceful Shutdown, Production Operations
async function gracefulShutdown(signal) {
  logger.warn(`[App] Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop accepting new connections
  server.close(async () => {
    logger.info('[App] HTTP server closed. Draining active connections...');

    try {
      // 2. Close database connection pool
      await sequelize.close();
      logger.info('[App] Database connection pool closed.');

      // 3. Close Redis connection
      await redisClient.quit();
      logger.info('[App] Redis connection closed.');

      logger.info('[App] Graceful shutdown complete. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, '[App] Error during graceful shutdown');
      process.exit(1);
    }
  });

  // Force exit after 10s if connections fail to drain
  setTimeout(() => {
    logger.fatal('[App] Graceful shutdown timed out. Force exiting...');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

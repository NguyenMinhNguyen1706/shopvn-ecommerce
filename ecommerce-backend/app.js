require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const compression = require('compression');
const sequelize  = require('./src/config/database');

// ═══════════════════════════════════════════════════════════════════════════════
// ✨ NEW 2026: Initialize Redis caching layer
// ═══════════════════════════════════════════════════════════════════════════════
const { redisClient, cacheUtils } = require('./src/config/redis');

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

// ── Performance Middleware ────────────────────────────────────────────────────
// GZIP compression - reduces response size by ~60%
app.use(compression());
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = getAllowedOrigins();
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan('dev'));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Swagger Docs ──────────────────────────────────────────────────────────────
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'ShopVN API Docs',
}));

// ── Routes ───────────────────────────────────────────────────────────────────
const authRoutes    = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const cartRoutes    = require('./src/routes/cart.routes');
const orderRoutes   = require('./src/routes/order.routes');
const adminRoutes   = require('./src/routes/admin.routes');
const uploadRoutes  = require('./src/routes/upload.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const reviewRoutes  = require('./src/routes/review.routes');

// ✨ NEW 2026: Shipping routes (GHN/GHTK integration)
const shippingRoutes = require('./src/routes/shipping.routes');
const webhooksRoutes = require('./src/routes/webhooks.routes');
const wmsRoutes = require('./src/routes/wms.routes');
const chatbotRoutes = require('./src/routes/chatbot.routes');

// ✨ NEW 2026: Cache middleware for product list
const { productListCache, categoriesCache, trendingProductsCache } = require('./src/middlewares/cache.middleware');

app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/payment',  paymentRoutes);
app.use('/api/reviews',  reviewRoutes);

// ✨ NEW 2026: Shipping routes
app.use('/api/shipping', shippingRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/wms', wmsRoutes);
app.use('/api/chatbot', chatbotRoutes);

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
    if (!startupDatabaseReady) {
      return res.status(503).json({
        status: 'starting',
        database: 'connected',
        redis: redisClient.isReady ? 'connected' : 'disconnected',
        message: startupDatabaseError ? startupDatabaseError.message : 'Database initialization is still running',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      status: 'ready',
      database: 'connected',
      redis: redisClient.isReady ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('\x1b[31m[ERROR]\x1b[0m', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('\x1b[32m✅ Database connected\x1b[0m');

    await sequelize.sync();

    const productService = require('./src/services/product.service');
    await productService.seedIfEmpty();
    await productService.ensureMasterInventory();

    startupDatabaseReady = true;
    startupDatabaseError = null;
    console.log('\x1b[32m✅ Database initialization complete\x1b[0m');
  } catch (err) {
    startupDatabaseReady = false;
    startupDatabaseError = err;
    console.error('\x1b[31m❌ Cannot connect to database:\x1b[0m', err.message);
  }
}

app.listen(PORT, () => {
  console.log(`\x1b[32m🚀 Server running → http://localhost:${PORT}\x1b[0m`);
  initializeDatabase();
});








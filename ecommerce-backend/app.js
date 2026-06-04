require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const sequelize  = require('./src/config/database');
require('./src/models/Order');
require('./src/models/OrderItem');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/payment',  paymentRoutes);

app.get('/health', (req, res) => {
  res.json({
    status:    'OK',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  });
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

sequelize
  .authenticate()
  .then(() => {
    console.log('\x1b[32m✅ Database connected\x1b[0m');
    return sequelize.sync({ alter: true });
  })
  .then(async () => {
    // Seed sản phẩm mẫu nếu DB trống
    const productService = require('./src/services/product.service');
    await productService.seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`\x1b[32m🚀 Server running → http://localhost:${PORT}\x1b[0m`);
    });
  })
  .catch((err) => {
    console.error('\x1b[31m❌ Cannot connect to database:\x1b[0m', err.message);
    process.exit(1);
  });

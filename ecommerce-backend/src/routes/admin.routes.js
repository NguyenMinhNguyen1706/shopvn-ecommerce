const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');
const Joi = require('joi');

// Tất cả admin routes đều cần login + role admin
router.use(authenticate, authorize('admin'));

// ── Products CRUD ─────────────────────────────────────────────────────────────
router.get('/products', adminController.getProducts);

router.post('/products',
  validate(schemas.createProduct),
  adminController.createProduct
);

router.put('/products/:id',
  validate(schemas.updateProduct),
  adminController.updateProduct
);

router.delete('/products/:id', adminController.deleteProduct);

// ── Orders management ─────────────────────────────────────────────────────────
router.get('/orders', adminController.getOrders);

router.patch('/orders/:id/status',
  validate(schemas.updateOrderStatus),
  adminController.updateOrderStatus
);

// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get('/stats', adminController.getStats);

// ── Action Plans ──────────────────────────────────────────────────────────────
router.get('/action-plan', adminController.getLatestActionPlan);

router.get('/action-plans/history', adminController.getActionPlanHistory);

router.post('/action-plan', adminController.createOrUpdateActionPlan);

router.patch('/action-plan/:clientPlanId/tasks/:taskId',
  validate(Joi.object({
    status: Joi.string().valid('todo', 'doing', 'done').required()
  })),
  adminController.updateActionPlanTask
);

module.exports = router;

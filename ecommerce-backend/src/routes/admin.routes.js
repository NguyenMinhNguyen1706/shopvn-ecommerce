const router     = require('express').Router();
const Product    = require('../models/Product');
const Order      = require('../models/Order');
const OrderItem  = require('../models/OrderItem');
const User       = require('../models/User');
const ActionPlan = require('../models/ActionPlan');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Tất cả admin routes đều cần login + role admin
router.use(authenticate, authorize('admin'));

// ── Products CRUD ─────────────────────────────────────────────────────────────

router.get('/products', asyncHandler(async (req, res) => {
  const products = await Product.findAll({ order: [['id', 'ASC']] });
  res.json({ success: true, products });
}));

router.post('/products', asyncHandler(async (req, res) => {
  const { name, description, price, oldPrice,
          category, icon, stock, featured, isNew } = req.body;

  if (!name || !price || !category || stock === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu thông tin bắt buộc: name, price, category, stock.',
    });
  }

  const product = await Product.create({
    name, description, price, oldPrice,
    category, icon, stock, featured, isNew,
  });
  res.status(201).json({ success: true, product });
}));

router.put('/products/:id', asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
  }
  await product.update(req.body);
  res.json({ success: true, product });
}));

router.delete('/products/:id', asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
  }
  await product.destroy();
  res.json({ success: true, message: 'Đã xóa sản phẩm.' });
}));

// ── Orders management ─────────────────────────────────────────────────────────

router.get('/orders', asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    include: [
      { model: OrderItem, as: 'items' },
      { model: User, attributes: ['id', 'name', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, orders });
}));

router.patch('/orders/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending','processing','shipping','delivered','cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status không hợp lệ. Phải là: ${validStatuses.join(', ')}`,
    });
  }

  const order = await Order.findByPk(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
  }

  await order.update({ status });
  res.json({ success: true, order });
}));

// ── Dashboard stats ───────────────────────────────────────────────────────────

router.get('/stats', asyncHandler(async (req, res) => {
  const { Op } = require('sequelize');

  const [
    totalOrders,
    totalProducts,
    totalUsers,
    pendingOrders,
    revenueResult,
  ] = await Promise.all([
    Order.count(),
    Product.count(),
    User.count(),
    Order.count({ where: { status: 'pending' } }),
    Order.findAll({
      where:      { status: 'delivered' },
      attributes: ['total'],
    }),
  ]);

  const revenue = revenueResult.reduce((sum, o) => sum + Number(o.total), 0);

  res.json({
    success: true,
    stats: { totalOrders, totalProducts, totalUsers, pendingOrders, revenue },
  });
}));

// Action Center persistence

function summarizeActionPlan(plan) {
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
  return {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(task => task.status === 'done').length,
    p1Tasks: tasks.filter(task => task.priority === 'P1').length,
  };
}

function serializeActionPlan(record) {
  if (!record) return null;
  return {
    ...record.payload,
    serverId: record.id,
    syncedAt: record.updatedAt,
  };
}

router.get('/action-plan', asyncHandler(async (req, res) => {
  const record = await ActionPlan.findOne({ order: [['generatedAt', 'DESC']] });
  res.json({ success: true, plan: serializeActionPlan(record) });
}));

router.get('/action-plans/history', asyncHandler(async (req, res) => {
  const records = await ActionPlan.findAll({
    order: [['generatedAt', 'DESC']],
    limit: 12,
  });
  res.json({ success: true, plans: records.map(serializeActionPlan) });
}));

router.post('/action-plan', asyncHandler(async (req, res) => {
  const plan = req.body?.plan || req.body;
  if (!plan || !plan.id || !Array.isArray(plan.tasks)) {
    return res.status(400).json({
      success: false,
      message: 'Action plan khong hop le: can id va tasks.',
    });
  }

  const summary = summarizeActionPlan(plan);
  const [record] = await ActionPlan.upsert({
    clientPlanId: String(plan.id),
    generatedAt: plan.generatedAt ? new Date(plan.generatedAt) : new Date(),
    filenameBase: plan.filenameBase || `shopvn-action-plan-${new Date().toISOString().slice(0, 10)}`,
    briefingId: plan.briefingId || null,
    sourceSnapshotId: plan.sourceSnapshotId || null,
    ...summary,
    payload: plan,
  }, { returning: true });

  const savedRecord = record || await ActionPlan.findOne({ where: { clientPlanId: String(plan.id) } });
  res.status(201).json({ success: true, plan: serializeActionPlan(savedRecord) });
}));

router.patch('/action-plan/:clientPlanId/tasks/:taskId', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['todo', 'doing', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status khong hop le. Phai la: ${validStatuses.join(', ')}`,
    });
  }

  const record = await ActionPlan.findOne({ where: { clientPlanId: req.params.clientPlanId } });
  if (!record) {
    return res.status(404).json({ success: false, message: 'Khong tim thay action plan.' });
  }

  const plan = { ...record.payload };
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
  const task = tasks.find(item => String(item.id) === req.params.taskId);
  if (!task) {
    return res.status(404).json({ success: false, message: 'Khong tim thay task.' });
  }

  task.status = status;
  task.updatedAt = new Date().toISOString();
  plan.tasks = tasks;

  await record.update({
    ...summarizeActionPlan(plan),
    payload: plan,
  });

  res.json({ success: true, plan: serializeActionPlan(record) });
}));

module.exports = router;

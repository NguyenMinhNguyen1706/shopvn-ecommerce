const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const User = require('../models/User');
const ActionPlan = require('../models/ActionPlan');
const { clearCache } = require('../middlewares/cache.middleware');

// ── Admin business services ──────────────────────────────────────────────────
// Concepts: Query Optimization, Clean Architecture

async function getProducts() {
  return Product.findAll({ order: [['id', 'ASC']] });
}

async function createProduct(data) {
  const product = await Product.create(data);
  await Promise.all([
    clearCache.product(product.id),
    clearCache.categories(),
  ]);
  return product;
}

async function updateProduct(id, data) {
  const product = await Product.findByPk(id);
  if (!product) {
    const err = new Error('Không tìm thấy sản phẩm.');
    err.status = 404;
    throw err;
  }
  await product.update(data);
  await Promise.all([
    clearCache.product(product.id),
    clearCache.categories(),
  ]);
  return product;
}

async function deleteProduct(id) {
  const product = await Product.findByPk(id);
  if (!product) {
    const err = new Error('Không tìm thấy sản phẩm.');
    err.status = 404;
    throw err;
  }
  const productId = product.id;
  await product.destroy();
  await Promise.all([
    clearCache.product(productId),
    clearCache.categories(),
  ]);
}

async function getOrders() {
  return Order.findAll({
    include: [
      { model: OrderItem, as: 'items' },
      { model: User, attributes: ['id', 'name', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
  });
}

async function updateOrderStatus(id, status) {
  const order = await Order.findByPk(id);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.status = 404;
    throw err;
  }
  await order.update({ status });
  return order;
}

/**
 * Get dashboard stats — OPTIMIZED to prevent out of memory errors
 * Concept: Query Optimization — replaced memory loading with SQL aggregate sum
 */
async function getStats() {
  const [
    totalOrders,
    totalProducts,
    totalUsers,
    pendingOrders,
    revenue, // Directly compute sum in PostgreSQL
  ] = await Promise.all([
    Order.count(),
    Product.count(),
    User.count(),
    Order.count({ where: { status: 'pending' } }),
    Order.sum('total', { where: { status: 'delivered' } }), // ← was Order.findAll(), now Order.sum()
  ]);

  return {
    totalOrders,
    totalProducts,
    totalUsers,
    pendingOrders,
    revenue: Number(revenue || 0),
  };
}

// ── Action Plan helper logic ──────────────────────────────────────────────────

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

async function getLatestActionPlan() {
  const record = await ActionPlan.findOne({ order: [['generatedAt', 'DESC']] });
  return serializeActionPlan(record);
}

async function getActionPlanHistory() {
  const records = await ActionPlan.findAll({
    order: [['generatedAt', 'DESC']],
    limit: 12,
  });
  return records.map(serializeActionPlan);
}

async function createOrUpdateActionPlan(plan) {
  if (!plan || !plan.id || !Array.isArray(plan.tasks)) {
    const err = new Error('Action plan khong hop le: can id va tasks.');
    err.status = 400;
    throw err;
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
  return serializeActionPlan(savedRecord);
}

async function updateActionPlanTask(clientPlanId, taskId, status) {
  const record = await ActionPlan.findOne({ where: { clientPlanId } });
  if (!record) {
    const err = new Error('Khong tim thay action plan.');
    err.status = 404;
    throw err;
  }

  const plan = { ...record.payload };
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
  const task = tasks.find(item => String(item.id) === taskId);
  if (!task) {
    const err = new Error('Khong tim thay task.');
    err.status = 404;
    throw err;
  }

  task.status = status;
  task.updatedAt = new Date().toISOString();
  plan.tasks = tasks;

  await record.update({
    ...summarizeActionPlan(plan),
    payload: plan,
  });

  return serializeActionPlan(record);
}

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
  getStats,
  getLatestActionPlan,
  getActionPlanHistory,
  createOrUpdateActionPlan,
  updateActionPlanTask
};

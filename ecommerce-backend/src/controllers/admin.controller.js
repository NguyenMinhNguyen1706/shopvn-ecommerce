const adminService = require('../services/admin.service');

// ── Wrapper tránh try/catch lặp lại ──────────────────────────────────────────
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Products CRUD ─────────────────────────────────────────────────────────────

const getProducts = asyncHandler(async (req, res) => {
  const products = await adminService.getProducts();
  res.json({ success: true, products });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await adminService.createProduct(req.body);
  res.status(201).json({ success: true, product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await adminService.updateProduct(req.params.id, req.body);
  res.json({ success: true, product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  await adminService.deleteProduct(req.params.id);
  res.json({ success: true, message: 'Đã xóa sản phẩm.' });
});

// ── Orders management ─────────────────────────────────────────────────────────

const getOrders = asyncHandler(async (req, res) => {
  const orders = await adminService.getOrders();
  res.json({ success: true, orders });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await adminService.updateOrderStatus(req.params.id, status);
  res.json({ success: true, order });
});

// ── Dashboard stats ───────────────────────────────────────────────────────────

const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats();
  res.json({ success: true, stats });
});

// ── Action Plans ──────────────────────────────────────────────────────────────

const getLatestActionPlan = asyncHandler(async (req, res) => {
  const plan = await adminService.getLatestActionPlan();
  res.json({ success: true, plan });
});

const getActionPlanHistory = asyncHandler(async (req, res) => {
  const plans = await adminService.getActionPlanHistory();
  res.json({ success: true, plans });
});

const createOrUpdateActionPlan = asyncHandler(async (req, res) => {
  const plan = req.body?.plan || req.body;
  const savedPlan = await adminService.createOrUpdateActionPlan(plan);
  res.status(201).json({ success: true, plan: savedPlan });
});

const updateActionPlanTask = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const plan = await adminService.updateActionPlanTask(
    req.params.clientPlanId,
    req.params.taskId,
    status
  );
  res.json({ success: true, plan });
});

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

const cartService = require('../services/cart.service');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getCart = asyncHandler(async (req, res) => {
  const data = await cartService.getCart(req.user.id);
  res.json({ success: true, ...data });
});

const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) {
    return res.status(400).json({ success: false, message: 'Thiếu productId.' });
  }
  const item = await cartService.addItem(req.user.id, productId, quantity || 1);
  res.status(201).json({ success: true, item });
});

const updateItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ.' });
  }
  const item = await cartService.updateItem(req.user.id, req.params.id, quantity);
  res.json({ success: true, item });
});

const removeItem = asyncHandler(async (req, res) => {
  await cartService.removeItem(req.user.id, req.params.id);
  res.json({ success: true, message: 'Đã xóa khỏi giỏ hàng.' });
});

const syncCart = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Danh sách sản phẩm không hợp lệ.' });
  }
  await cartService.syncCart(req.user.id, items);
  res.json({ success: true, message: 'Đồng bộ giỏ hàng thành công.' });
});

module.exports = { getCart, addItem, updateItem, removeItem, syncCart };

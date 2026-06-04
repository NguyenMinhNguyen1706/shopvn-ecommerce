const CartItem = require('../models/CartItem');
const Product  = require('../models/Product');

// ── Get cart của user ─────────────────────────────────────────────────────────

async function getCart(userId) {
  const items = await CartItem.findAll({
    where:   { userId },
    include: [{ model: Product, as: 'product' }],
    order:   [['createdAt', 'ASC']],
  });

  // Tính tổng tiền
  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.product.price) * item.quantity;
  }, 0);

  return { items, subtotal };
}

// ── Add item vào cart ─────────────────────────────────────────────────────────

async function addItem(userId, productId, quantity = 1) {
  // Kiểm tra sản phẩm tồn tại
  const product = await Product.findByPk(productId);
  if (!product) {
    const err = new Error('Sản phẩm không tồn tại.');
    err.status = 404;
    throw err;
  }

  // Kiểm tra tồn kho
  if (product.stock < quantity) {
    const err = new Error(`Chỉ còn ${product.stock} sản phẩm trong kho.`);
    err.status = 400;
    throw err;
  }

  // Nếu đã có trong cart → cộng thêm số lượng
  const existing = await CartItem.findOne({ where: { userId, productId } });
  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > product.stock) {
      const err = new Error(`Chỉ còn ${product.stock} sản phẩm trong kho.`);
      err.status = 400;
      throw err;
    }
    await existing.update({ quantity: newQty });
    return existing;
  }

  // Chưa có → tạo mới
  return CartItem.create({ userId, productId, quantity });
}

// ── Update quantity ───────────────────────────────────────────────────────────

async function updateItem(userId, itemId, quantity) {
  const item = await CartItem.findOne({ where: { id: itemId, userId } });
  if (!item) {
    const err = new Error('Không tìm thấy sản phẩm trong giỏ hàng.');
    err.status = 404;
    throw err;
  }

  // Kiểm tra tồn kho
  const product = await Product.findByPk(item.productId);
  if (quantity > product.stock) {
    const err = new Error(`Chỉ còn ${product.stock} sản phẩm trong kho.`);
    err.status = 400;
    throw err;
  }

  await item.update({ quantity });
  return item;
}

// ── Remove item ───────────────────────────────────────────────────────────────

async function removeItem(userId, itemId) {
  const item = await CartItem.findOne({ where: { id: itemId, userId } });
  if (!item) {
    const err = new Error('Không tìm thấy sản phẩm trong giỏ hàng.');
    err.status = 404;
    throw err;
  }
  await item.destroy();
}

// ── Clear cart ────────────────────────────────────────────────────────────────

async function clearCart(userId) {
  await CartItem.destroy({ where: { userId } });
}

async function syncCart(userId, items) {
  // Clear cart first
  await CartItem.destroy({ where: { userId } });
  
  // Add new items
  for (const item of items) {
    const product = await Product.findByPk(item.id);
    if (product) {
      const qty = Math.min(item.quantity, product.stock);
      if (qty > 0) {
        await CartItem.create({ userId, productId: item.id, quantity: qty });
      }
    }
  }
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, syncCart };

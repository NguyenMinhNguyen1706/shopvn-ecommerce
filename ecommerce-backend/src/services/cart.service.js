const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const sequelize = require('../config/database');

const MAX_CART_QUANTITY = 99;

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizePositiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 1) {
    throw httpError(`${label} không hợp lệ.`, 400);
  }
  return normalized;
}

function normalizeQuantity(value) {
  const quantity = normalizePositiveInteger(value, 'Số lượng');
  if (quantity > MAX_CART_QUANTITY) {
    throw httpError(`Số lượng tối đa là ${MAX_CART_QUANTITY}.`, 400);
  }
  return quantity;
}

function ensureAvailableStock(product, quantity) {
  const stock = Number(product.stock);
  if (!Number.isFinite(stock) || stock < quantity) {
    throw httpError(`Chỉ còn ${Math.max(0, stock || 0)} sản phẩm trong kho.`, 400);
  }
}

async function getCart(userId) {
  const items = await CartItem.findAll({
    where: { userId },
    include: [{ model: Product, as: 'product' }],
    order: [['createdAt', 'ASC']]
  });

  const subtotal = items.reduce((sum, item) => {
    if (!item.product) return sum;
    return sum + Number(item.product.price) * item.quantity;
  }, 0);

  return { items, subtotal };
}

async function addItem(userId, productId, quantity = 1) {
  const normalizedProductId = normalizePositiveInteger(productId, 'Sản phẩm');
  const normalizedQuantity = normalizeQuantity(quantity);
  const product = await Product.findByPk(normalizedProductId);

  if (!product) throw httpError('Sản phẩm không tồn tại.', 404);
  ensureAvailableStock(product, normalizedQuantity);

  const existing = await CartItem.findOne({
    where: { userId, productId: normalizedProductId }
  });

  if (existing) {
    const newQuantity = existing.quantity + normalizedQuantity;
    normalizeQuantity(newQuantity);
    ensureAvailableStock(product, newQuantity);
    await existing.update({ quantity: newQuantity });
    return existing;
  }

  return CartItem.create({
    userId,
    productId: normalizedProductId,
    quantity: normalizedQuantity
  });
}

async function updateItem(userId, itemId, quantity) {
  const normalizedItemId = normalizePositiveInteger(itemId, 'Dòng giỏ hàng');
  const normalizedQuantity = normalizeQuantity(quantity);
  const item = await CartItem.findOne({ where: { id: normalizedItemId, userId } });

  if (!item) throw httpError('Không tìm thấy sản phẩm trong giỏ hàng.', 404);

  const product = await Product.findByPk(item.productId);
  if (!product) throw httpError('Sản phẩm không còn tồn tại.', 404);
  ensureAvailableStock(product, normalizedQuantity);

  await item.update({ quantity: normalizedQuantity });
  return item;
}

async function removeItem(userId, itemId) {
  const normalizedItemId = normalizePositiveInteger(itemId, 'Dòng giỏ hàng');
  const item = await CartItem.findOne({ where: { id: normalizedItemId, userId } });
  if (!item) throw httpError('Không tìm thấy sản phẩm trong giỏ hàng.', 404);
  await item.destroy();
}

async function clearCart(userId) {
  await CartItem.destroy({ where: { userId } });
}

async function syncCart(userId, items) {
  return sequelize.transaction(async transaction => {
    const normalizedItems = (items || []).map(item => ({
      id: normalizePositiveInteger(item.id, 'Sản phẩm'),
      quantity: normalizeQuantity(item.quantity)
    }));
    const productIds = normalizedItems.map(item => item.id);
    const uniqueProductIds = [...new Set(productIds)];

    if (uniqueProductIds.length !== productIds.length) {
      throw httpError('Giỏ hàng chứa sản phẩm trùng lặp.', 400);
    }

    const products = uniqueProductIds.length
      ? await Product.findAll({ where: { id: uniqueProductIds }, transaction })
      : [];
    const productMap = new Map(products.map(product => [Number(product.id), product]));

    if (productMap.size !== uniqueProductIds.length) {
      throw httpError('Một hoặc nhiều sản phẩm không còn tồn tại.', 400);
    }

    const itemsToCreate = normalizedItems.map(item => {
      const product = productMap.get(item.id);
      try {
        ensureAvailableStock(product, item.quantity);
      } catch (error) {
        throw httpError(`Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm.`, 400);
      }
      return { userId, productId: item.id, quantity: item.quantity };
    });

    await CartItem.destroy({ where: { userId }, transaction });
    if (itemsToCreate.length) {
      await CartItem.bulkCreate(itemsToCreate, { transaction });
    }
  });
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, syncCart };

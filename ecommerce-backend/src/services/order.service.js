const sequelize = require('../config/database');
const Order     = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product   = require('../models/Product');
const CartItem  = require('../models/CartItem');
const OMSService = require('./oms.service');

// ── Voucher list (mock — sau này lưu DB) ──────────────────────────────────────
const VOUCHERS = {
  'SHOPVN50': { discount: 50000,  type: 'fixed' },
  'SAVE10':   { discount: 0.10,   type: 'percent' },
};

const SHIPPING_THRESHOLD = 500000;
const SHIPPING_FEE       = 30000;

function calcShipping(subtotal) {
  return subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

function applyVoucher(subtotal, code) {
  if (!code) return 0;
  const voucher = VOUCHERS[code.toUpperCase()];
  if (!voucher) {
    const err = new Error('Mã voucher không hợp lệ.');
    err.status = 400;
    throw err;
  }
  return voucher.type === 'fixed'
    ? voucher.discount
    : Math.floor(subtotal * voucher.discount);
}

const { withRetry } = require('../lib/retry');
const { Transaction } = require('sequelize');

// ── Create order (dùng DB Transaction + Retry trên Deadlock) ───────────────────
// Concept: Race Conditions, Deadlocks, Retries, Distributed Transactions

async function createOrder(userId, {
  shippingName,
  shippingPhone,
  shippingAddress,
  paymentMethod = 'cod',
  voucherCode,
  note,
}) {
  return withRetry(async () => {
    // Bắt đầu transaction với isolation level cao nhất để chống Race Condition tuyệt đối
    const t = await sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });

    try {
      // 1. Lấy giỏ hàng hiện tại
      const cartItems = await CartItem.findAll({
        where:   { userId },
        include: [{ model: Product, as: 'product' }],
        transaction: t,
      });

      if (cartItems.length === 0) {
        const err = new Error('Giỏ hàng trống, không thể đặt hàng.');
        err.status = 400;
        throw err;
      }

      // 2. Kiểm tra tồn kho + lock row (SELECT FOR UPDATE)
      for (const item of cartItems) {
        const product = await Product.findOne({
          where: { id: item.productId },
          lock:  t.LOCK.UPDATE, // pessimistic lock
          transaction: t,
        });

        if (!product || product.stock < item.quantity) {
          const err = new Error(
            `Sản phẩm "${item.product.name}" không đủ hàng. Còn ${product?.stock || 0}.`
          );
          err.status = 400;
          throw err;
        }
      }

      // 3. Tính tiền
      const subtotal   = cartItems.reduce(
        (sum, i) => sum + Number(i.product.price) * i.quantity, 0
      );
      const shipping   = calcShipping(subtotal);
      const discount   = applyVoucher(subtotal, voucherCode);
      const total      = subtotal + shipping - discount;

      // 4. Tạo Order
      const order = await Order.create({
        userId,
        shippingName,
        shippingPhone,
        shippingAddress,
        subtotal,
        shippingFee: shipping,
        discount,
        total,
        paymentMethod,
        voucherCode:   voucherCode || null,
        note:          note || null,
        status:        'pending',
        paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'unpaid',
      }, { transaction: t });

      // 5. Tạo OrderItems + trừ tồn kho + giữ kho trong WMS (OMSService)
      const omsItems = [];
      for (const item of cartItems) {
        await OrderItem.create({
          orderId:     order.id,
          productId:   item.productId,
          productName: item.product.name,
          productIcon: item.product.icon,
          price:       item.product.price,
          quantity:    item.quantity,
          subtotal:    Number(item.product.price) * item.quantity,
        }, { transaction: t });

        // Trừ tồn kho
        await Product.decrement('stock', {
          by:          item.quantity,
          where:       { id: item.productId },
          transaction: t,
        });

        omsItems.push({
          productId: item.productId,
          quantity: item.quantity
        });
      }

      // Giữ kho trong WMS
      await OMSService.reserveStock(omsItems, order.id, t);

      // 6. Xóa giỏ hàng
      await CartItem.destroy({ where: { userId }, transaction: t });

      // 7. Commit — tất cả thành công
      await t.commit();

      // Load lại order với items để trả về
      return Order.findByPk(order.id, {
        include: [{ model: OrderItem, as: 'items' }],
      });

    } catch (err) {
      // Có lỗi → rollback toàn bộ
      await t.rollback();
      throw err;
    }
  }, {
    maxRetries: 3,
    baseDelay: 200,
    retryableErrors: [
      'SequelizeConnectionError',
      'SequelizeDatabaseError', // includes serialization failure / deadlock error codes
      '40001', // PostgreSQL serialization_failure code
      '40P01'  // PostgreSQL deadlock_detected code
    ],
    label: 'createOrder-transaction'
  });
}

// ── Get orders của user ───────────────────────────────────────────────────────

async function getUserOrders(userId) {
  return Order.findAll({
    where:   { userId },
    include: [{ model: OrderItem, as: 'items' }],
    order:   [['createdAt', 'DESC']],
  });
}

// ── Get order by ID ───────────────────────────────────────────────────────────

async function getOrderById(orderId, userId) {
  const order = await Order.findOne({
    where:   { id: orderId, userId },
    include: [{ model: OrderItem, as: 'items' }],
  });

  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.status = 404;
    throw err;
  }
  return order;
}

// ── Cancel order ──────────────────────────────────────────────────────────────

async function cancelOrder(orderId, userId) {
  const order = await Order.findOne({ where: { id: orderId, userId } });

  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.status = 404;
    throw err;
  }
  if (order.status !== 'pending') {
    const err = new Error('Chỉ có thể hủy đơn hàng đang chờ xác nhận.');
    err.status = 400;
    throw err;
  }

  // Hoàn tồn kho
  const t = await sequelize.transaction();
  try {
    const items = await OrderItem.findAll({ where: { orderId }, transaction: t });
    const omsItems = [];
    for (const item of items) {
      await Product.increment('stock', {
        by:          item.quantity,
        where:       { id: item.productId },
        transaction: t,
      });
      omsItems.push({
        productId: item.productId,
        quantity: item.quantity
      });
    }

    // Giải phóng kho WMS
    await OMSService.releaseReservedStock(orderId, omsItems, t);

    await order.update({ status: 'cancelled' }, { transaction: t });
    await t.commit();
    return order;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
};

const sequelize = require('../config/database');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const OMSService = require('./oms.service');
const LoyaltyService = require('./loyalty.service');

class PaymentFinalizationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PaymentFinalizationError';
    this.code = code;
  }
}

const normalizeVnd = value => {
  const amount = Math.round(Number(value));
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new PaymentFinalizationError('INVALID_AMOUNT', 'Số tiền thanh toán không hợp lệ.');
  }
  return amount;
};

const finalizePayment = async ({
  orderId,
  amount,
  paymentMethod,
  transactionRef
}) => sequelize.transaction(async transaction => {
  const order = await Order.findByPk(orderId, {
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!order) {
    throw new PaymentFinalizationError('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
  }

  const receivedAmount = normalizeVnd(amount);
  const expectedAmount = normalizeVnd(order.total);
  if (receivedAmount !== expectedAmount) {
    throw new PaymentFinalizationError('AMOUNT_MISMATCH', 'Số tiền thanh toán không khớp.');
  }

  if (order.paymentStatus === 'paid') {
    return { order, alreadyPaid: true };
  }

  if (order.status === 'cancelled') {
    throw new PaymentFinalizationError('ORDER_CANCELLED', 'Đơn hàng đã bị hủy.');
  }

  const items = await OrderItem.findAll({
    where: { orderId: order.id },
    transaction
  });

  await order.update({
    paymentStatus: 'paid',
    paymentMethod,
    status: 'processing',
    vnpayTxnRef: String(transactionRef || '').slice(0, 100) || null
  }, { transaction });

  await OMSService.commitReservedStock(
    order.id,
    items.map(item => ({ productId: item.productId, quantity: item.quantity })),
    transaction
  );
  await LoyaltyService.addPointsFromOrder(order.userId, expectedAmount, transaction);

  return { order, alreadyPaid: false };
});

module.exports = {
  finalizePayment,
  normalizeVnd,
  PaymentFinalizationError
};

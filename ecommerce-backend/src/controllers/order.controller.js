const orderService = require('../services/order.service');
const EmailService = require('../services/email.service');
const { enqueueOrderConfirmationEmail } = require('../queues/background.queue');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const createOrder = asyncHandler(async (req, res) => {
  const { shippingName, shippingPhone, shippingAddress,
          paymentMethod, voucherCode, note } = req.body;

  if (!shippingName || !shippingPhone || !shippingAddress) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ thông tin giao hàng.',
    });
  }

  const order = await orderService.createOrder(req.user.id, {
    shippingName, shippingPhone, shippingAddress,
    paymentMethod, voucherCode, note,
  });

  // Gửi email xác nhận bất đồng bộ (Non-blocking)
  const orderData = order.toJSON ? order.toJSON() : order;
  const { logger } = require('../config/logger');
  try {
    await enqueueOrderConfirmationEmail(req.user.email, orderData);
  } catch (err) {
    logger.error({ err, orderId: orderData.id }, '[Queue Order Email Error]');
    setImmediate(async () => {
      try {
        await EmailService.sendOrderConfirmation(req.user.email, orderData);
      } catch (fallbackErr) {
        logger.error({ err: fallbackErr, orderId: orderData.id }, '[Fallback Order Email Error]');
      }
    });
  }

  res.status(201).json({ success: true, order });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getUserOrders(req.user.id);
  res.json({ success: true, orders });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user.id);
  res.json({ success: true, order });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user.id);
  res.json({ success: true, message: 'Đơn hàng đã được hủy.', order });
});

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder };

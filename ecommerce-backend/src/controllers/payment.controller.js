const vnpayService = require('../services/vnpay.service');
const { zalopayService, momoService } = require('../services/payment.service');
const { payosService } = require('../services/payos.service');
const {
  finalizePayment,
  PaymentFinalizationError
} = require('../services/payment-finalization.service');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = console;

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getFrontendUrl = () => {
  const value = String(process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  if (!value) throw new Error('FRONTEND_URL is not configured.');
  return value;
};

const ordersRedirect = params => {
  const query = new URLSearchParams(params);
  return `${getFrontendUrl()}/orders.html?${query.toString()}`;
};

const findOwnedOrder = (orderId, userId, options = {}) => Order.findOne({
  where: { id: orderId, userId },
  ...options
});

const getPayableOrderError = order => {
  if (!order) return { status: 404, message: 'Không tìm thấy đơn hàng.' };
  if (order.paymentStatus === 'paid') {
    return { status: 400, message: 'Đơn hàng đã được thanh toán.' };
  }
  if (order.status === 'cancelled') {
    return { status: 400, message: 'Đơn hàng đã bị hủy.' };
  }
  return null;
};

const sendPayableOrderError = (res, error) => res
  .status(error.status)
  .json({ success: false, message: error.message });

const createVnpayUrl = asyncHandler(async (req, res) => {
  const { orderId, bankCode } = req.body;
  const order = await findOwnedOrder(orderId, req.user.id);
  const orderError = getPayableOrderError(order);
  if (orderError) return sendPayableOrderError(res, orderError);

  const paymentUrl = vnpayService.createPaymentUrl(req, {
    orderId: order.id,
    amount: Number(order.total),
    orderInfo: `Thanh toan don hang #${order.id} - ShopVN`,
    bankCode
  });

  return res.json({ success: true, paymentUrl });
});

const vnpayReturn = asyncHandler(async (req, res) => {
  const result = vnpayService.processReturn(req.query);
  if (!result.success) {
    return res.redirect(ordersRedirect({ payment: 'failed' }));
  }

  try {
    await finalizePayment({
      orderId: result.orderId,
      amount: result.amount,
      paymentMethod: 'vnpay',
      transactionRef: result.txnRef
    });
    return res.redirect(ordersRedirect({ payment: 'success', orderId: result.orderId }));
  } catch (error) {
    logger.error('VNPay return finalization failed:', error.message);
    return res.redirect(ordersRedirect({ payment: 'failed' }));
  }
});

const vnpayIpn = asyncHandler(async (req, res) => {
  const result = vnpayService.processIpn(req.query);
  if (!result.valid) return res.json(result.response);
  if (!result.success) return res.json(result.response);

  try {
    const finalization = await finalizePayment({
      orderId: result.orderId,
      amount: result.amount,
      paymentMethod: 'vnpay',
      transactionRef: result.txnRef
    });
    if (finalization.alreadyPaid) {
      return res.json({ RspCode: '02', Message: 'Order already confirmed' });
    }
    return res.json(result.response);
  } catch (error) {
    logger.error('VNPay IPN error:', error.message);
    if (error instanceof PaymentFinalizationError) {
      if (error.code === 'ORDER_NOT_FOUND') {
        return res.json({ RspCode: '01', Message: 'Order not found' });
      }
      if (error.code === 'AMOUNT_MISMATCH') {
        return res.json({ RspCode: '04', Message: 'Invalid amount' });
      }
      if (error.code === 'ORDER_CANCELLED') {
        return res.json({ RspCode: '02', Message: 'Order already cancelled' });
      }
    }
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

const createZaloPayment = asyncHandler(async (req, res) => {
  const order = await findOwnedOrder(req.body.orderId, req.user.id);
  const orderError = getPayableOrderError(order);
  if (orderError) return sendPayableOrderError(res, orderError);

  try {
    const paymentResult = await zalopayService.createPaymentUrl({
      orderId: order.id,
      amount: Number(order.total),
      userId: order.userId,
      returnUrl: ordersRedirect({ payment: 'pending', orderId: order.id }),
      description: `Thanh toán đơn hàng #${order.id}`
    });
    return res.json({
      success: true,
      data: {
        paymentUrl: paymentResult.paymentUrl,
        appTransId: paymentResult.appTransId,
        amount: paymentResult.amount
      }
    });
  } catch (error) {
    logger.error('ZaloPay payment creation failed:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Không thể tạo yêu cầu thanh toán ZaloPay.'
    });
  }
});

const createMomoPayment = asyncHandler(async (req, res) => {
  const order = await findOwnedOrder(req.body.orderId, req.user.id);
  const orderError = getPayableOrderError(order);
  if (orderError) return sendPayableOrderError(res, orderError);

  try {
    const paymentResult = await momoService.createPaymentUrl({
      orderId: order.id,
      amount: Number(order.total),
      returnUrl: ordersRedirect({ payment: 'pending', orderId: order.id }),
      description: `Thanh toán đơn hàng #${order.id}`
    });
    return res.json({
      success: true,
      data: {
        paymentUrl: paymentResult.paymentUrl,
        requestId: paymentResult.requestId,
        amount: paymentResult.amount
      }
    });
  } catch (error) {
    logger.error('MoMo payment creation failed:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Không thể tạo yêu cầu thanh toán MoMo.'
    });
  }
});

const createBankTransferPayment = asyncHandler(async (req, res) => {
  const order = await findOwnedOrder(req.body.orderId, req.user.id, {
    include: [{ model: User }]
  });
  const orderError = getPayableOrderError(order);
  if (orderError) return sendPayableOrderError(res, orderError);

  try {
    const paymentResult = await payosService.createPaymentRequest({
      orderId: order.id,
      amount: Number(order.total),
      description: `DH${order.id}`,
      returnUrl: ordersRedirect({ payment: 'pending', orderId: order.id }),
      cancelUrl: ordersRedirect({ payment: 'cancelled', orderId: order.id }),
      buyerName: order.shippingName,
      buyerEmail: order.User?.email,
      buyerPhone: order.shippingPhone
    });

    await order.update({
      paymentMethod: 'bank_transfer',
      vnpayTxnRef: String(paymentResult.paymentId)
    });

    return res.json({
      success: true,
      data: {
        paymentId: paymentResult.paymentId,
        qrCode: paymentResult.qrCode,
        checkoutUrl: paymentResult.checkoutUrl,
        amount: paymentResult.amount,
        orderId: order.id
      }
    });
  } catch (error) {
    logger.error('PayOS payment creation failed:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Không thể tạo mã thanh toán chuyển khoản.'
    });
  }
});

const zalopayWebhook = asyncHandler(async (req, res) => {
  const verification = zalopayService.verifyWebhook(req.body);
  if (!verification.valid) {
    return res.json({ return_code: -1, return_message: 'invalid signature' });
  }

  try {
    await finalizePayment({
      orderId: verification.orderId,
      amount: verification.amount,
      paymentMethod: 'zalopay',
      transactionRef: verification.transactionId || verification.appTransId
    });
    return res.json({ return_code: 1, return_message: 'success' });
  } catch (error) {
    logger.error('ZaloPay webhook error:', error.message);
    const invalidData = error instanceof PaymentFinalizationError
      && ['ORDER_NOT_FOUND', 'AMOUNT_MISMATCH', 'ORDER_CANCELLED'].includes(error.code);
    return res.json({
      return_code: invalidData ? -1 : 0,
      return_message: invalidData ? 'invalid payment data' : 'temporary error'
    });
  }
});

const momoWebhook = asyncHandler(async (req, res) => {
  const verification = momoService.verifyWebhook(req.body);
  if (!verification.valid) return res.status(400).end();
  if (!verification.success) return res.status(204).end();

  try {
    await finalizePayment({
      orderId: verification.orderId,
      amount: verification.amount,
      paymentMethod: 'momo',
      transactionRef: verification.transId
    });
    return res.status(204).end();
  } catch (error) {
    logger.error('MoMo webhook error:', error.message);
    if (error instanceof PaymentFinalizationError) return res.status(400).end();
    return res.status(500).end();
  }
});

const payosWebhook = asyncHandler(async (req, res) => {
  const verification = payosService.verifyWebhookSignature(req.body);
  if (!verification.valid) return res.status(401).json({ success: false });

  const notification = payosService.parseWebhookNotification(verification);
  if (notification.status !== 'PAID') return res.json({ success: true });

  try {
    await finalizePayment({
      orderId: notification.orderId,
      amount: notification.amount,
      paymentMethod: 'bank_transfer',
      transactionRef: notification.transactionId
    });
    return res.json({ success: true });
  } catch (error) {
    logger.error('PayOS webhook error:', error.message);
    if (error instanceof PaymentFinalizationError) {
      return res.status(400).json({ success: false });
    }
    return res.status(500).json({ success: false });
  }
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  const order = await findOwnedOrder(req.params.orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
  }

  return res.json({
    success: true,
    data: {
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      amount: Number(order.total),
      paymentDate: order.updatedAt
    }
  });
});

module.exports = {
  createVnpayUrl,
  vnpayReturn,
  vnpayIpn,
  createZaloPayment,
  createMomoPayment,
  createBankTransferPayment,
  zalopayWebhook,
  momoWebhook,
  payosWebhook,
  getPaymentStatus
};

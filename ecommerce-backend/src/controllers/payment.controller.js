const vnpayService = require('../services/vnpay.service');
const Order        = require('../models/Order');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Tạo URL thanh toán VNPay ──────────────────────────────────────────────────

const createVnpayUrl = asyncHandler(async (req, res) => {
  const { orderId, bankCode } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'Thiếu orderId.' });
  }

  // Kiểm tra order tồn tại và thuộc về user đang login
  const order = await Order.findOne({
    where: { id: orderId, userId: req.user.id },
  });

  if (!order) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
  }
  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán.' });
  }
  if (order.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Đơn hàng đã bị hủy.' });
  }

  const paymentUrl = vnpayService.createPaymentUrl(req, {
    orderId:   order.id,
    amount:    Number(order.total),
    orderInfo: `Thanh toan don hang #${order.id} - ShopVN`,
    bankCode,
  });

  res.json({ success: true, paymentUrl });
});

// ── Return URL — VNPay redirect user về ──────────────────────────────────────

const vnpayReturn = asyncHandler(async (req, res) => {
  const result = vnpayService.processReturn(req.query);

  if (!result.success) {
    // Redirect về frontend với thông báo lỗi
    return res.redirect(
      `${process.env.FRONTEND_URL}/orders.html?payment=failed&message=${encodeURIComponent(result.message)}`
    );
  }

  // Cập nhật trạng thái đơn hàng
  const order = await Order.findByPk(result.orderId);
  if (order && order.paymentStatus !== 'paid') {
    await order.update({
      paymentStatus: 'paid',
      status:        'processing', // tự động chuyển sang đang xử lý
      vnpayTxnRef:   result.txnRef,
      vnpayBankCode: result.bankCode,
    });
  }

  // Redirect về frontend trang đơn hàng
  res.redirect(
    `${process.env.FRONTEND_URL}/orders.html?payment=success&orderId=${result.orderId}`
  );
});

// ── IPN URL — VNPay gọi server-to-server ─────────────────────────────────────

const vnpayIpn = asyncHandler(async (req, res) => {
  const result = vnpayService.processIpn(req.query);

  // Luôn trả về response cho VNPay trước
  // (VNPay timeout nhanh — không được delay)
  if (!result.valid) {
    return res.json(result.response);
  }

  try {
    const order = await Order.findByPk(result.orderId);

    if (!order) {
      return res.json({ RspCode: '01', Message: 'Order not found' });
    }

    // Kiểm tra số tiền khớp
    if (Number(order.total) !== result.amount) {
      return res.json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // Tránh xử lý IPN trùng lặp
    if (order.paymentStatus === 'paid') {
      return res.json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    if (result.success) {
      await order.update({
        paymentStatus: 'paid',
        status:        'processing',
        vnpayTxnRef:   result.txnRef,
      });
    } else {
      // Thanh toán thất bại — giữ nguyên trạng thái pending
      console.log(`[VNPay IPN] Order #${result.orderId} payment failed`);
    }

    res.json(result.response);

  } catch (err) {
    console.error('[VNPay IPN Error]', err.message);
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

module.exports = { createVnpayUrl, vnpayReturn, vnpayIpn };

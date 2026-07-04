const vnpayService = require('../services/vnpay.service');
const Order        = require('../models/Order');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// â”€â”€ Táº¡o URL thanh toÃ¡n VNPay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createVnpayUrl = asyncHandler(async (req, res) => {
  const { orderId, bankCode } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'Thiáº¿u orderId.' });
  }

  // Kiá»ƒm tra order tá»“n táº¡i vÃ  thuá»™c vá» user Ä‘ang login
  const order = await Order.findOne({
    where: { id: orderId, userId: req.user.id },
  });

  if (!order) {
    return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng.' });
  }
  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, message: 'ÄÆ¡n hÃ ng Ä‘Ã£ Ä‘Æ°á»£c thanh toÃ¡n.' });
  }
  if (order.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'ÄÆ¡n hÃ ng Ä‘Ã£ bá»‹ há»§y.' });
  }

  const paymentUrl = vnpayService.createPaymentUrl(req, {
    orderId:   order.id,
    amount:    Number(order.total),
    orderInfo: `Thanh toan don hang #${order.id} - ShopVN`,
    bankCode,
  });

  res.json({ success: true, paymentUrl });
});

// â”€â”€ Return URL â€” VNPay redirect user vá» â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const vnpayReturn = asyncHandler(async (req, res) => {
  const result = vnpayService.processReturn(req.query);

  if (!result.success) {
    // Redirect vá» frontend vá»›i thÃ´ng bÃ¡o lá»—i
    return res.redirect(
      `${process.env.FRONTEND_URL}/orders.html?payment=failed&message=${encodeURIComponent(result.message)}`
    );
  }

  // Cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng
  const order = await Order.findByPk(result.orderId);
  if (order && order.paymentStatus !== 'paid') {
    await order.update({
      paymentStatus: 'paid',
      status:        'processing', // tá»± Ä‘á»™ng chuyá»ƒn sang Ä‘ang xá»­ lÃ½
      vnpayTxnRef:   result.txnRef,
      vnpayBankCode: result.bankCode,
    });
  }

  // Redirect vá» frontend trang Ä‘Æ¡n hÃ ng
  res.redirect(
    `${process.env.FRONTEND_URL}/orders.html?payment=success&orderId=${result.orderId}`
  );
});

// â”€â”€ IPN URL â€” VNPay gá»i server-to-server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const vnpayIpn = asyncHandler(async (req, res) => {
  const result = vnpayService.processIpn(req.query);

  // LuÃ´n tráº£ vá» response cho VNPay trÆ°á»›c
  // (VNPay timeout nhanh â€” khÃ´ng Ä‘Æ°á»£c delay)
  if (!result.valid) {
    return res.json(result.response);
  }

  try {
    const order = await Order.findByPk(result.orderId);

    if (!order) {
      return res.json({ RspCode: '01', Message: 'Order not found' });
    }

    // Kiá»ƒm tra sá»‘ tiá»n khá»›p
    if (Number(order.total) !== result.amount) {
      return res.json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // TrÃ¡nh xá»­ lÃ½ IPN trÃ¹ng láº·p
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
      // Thanh toÃ¡n tháº¥t báº¡i â€” giá»¯ nguyÃªn tráº¡ng thÃ¡i pending
      console.log(`[VNPay IPN] Order #${result.orderId} payment failed`);
    }

    res.json(result.response);

  } catch (err) {
    console.error('[VNPay IPN Error]', err.message);
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// âœ¨ NEW 2026 PAYMENT METHODS: ZaloPay, MoMo, PayOS (Bank Transfer)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const { zalopayService, momoService } = require('../services/payment.service');
const { payosService } = require('../services/payos.service');
const OMSService = require('../services/oms.service');
const LoyaltyService = require('../services/loyalty.service');
const OrderItem = require('../models/OrderItem');
const User = require('../models/User');
const sequelize = require('../config/database');
const logger = console;

/**
 * ZaloPay - Create payment URL
 */
const createZaloPayment = asyncHandler(async (req, res) => {
  const { orderId, returnUrl } = req.body;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: orderId'
    });
  }

  try {
    const order = await Order.findOne({
      where: { id: orderId, userId: req.user.id },
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is cancelled.' });
    }
    const paymentResult = await zalopayService.createPaymentUrl({
      orderId: orderId,
      amount: Number(order.total),
      userId: order.userId,
      returnUrl: returnUrl || `${process.env.FRONTEND_URL}/checkout/return`,
      description: `Thanh toÃ¡n Ä‘Æ¡n hÃ ng #${orderId}`
    });

    res.json({
      success: true,
      data: {
        paymentUrl: paymentResult.paymentUrl,
        appTransId: paymentResult.appTransId,
        amount: paymentResult.amount
      }
    });
  } catch (error) {
    logger.error('ZaloPay payment creation failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Táº¡o yÃªu cáº§u thanh toÃ¡n tháº¥t báº¡i',
      error: error.message
    });
  }
});

/**
 * MoMo - Create payment URL
 */
const createMomoPayment = asyncHandler(async (req, res) => {
  const { orderId, returnUrl } = req.body;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: orderId'
    });
  }

  try {
    const order = await Order.findOne({
      where: { id: orderId, userId: req.user.id },
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is cancelled.' });
    }
    const paymentResult = await momoService.createPaymentUrl({
      orderId: orderId,
      amount: Number(order.total),
      userId: order.userId,
      returnUrl: returnUrl || `${process.env.FRONTEND_URL}/checkout/return`,
      description: `Thanh toÃ¡n Ä‘Æ¡n hÃ ng #${orderId}`
    });

    res.json({
      success: true,
      data: {
        paymentUrl: paymentResult.paymentUrl,
        requestId: paymentResult.requestId,
        amount: paymentResult.amount
      }
    });
  } catch (error) {
    logger.error('MoMo payment creation failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Táº¡o yÃªu cáº§u thanh toÃ¡n tháº¥t báº¡i'
    });
  }
});

/**
 * PayOS - Create VietQR payment request (Bank Transfer)
 * AUTO-RECONCILIATION: Zero-touch payment confirmation via webhook
 */
const createBankTransferPayment = asyncHandler(async (req, res) => {
  const { orderId, returnUrl } = req.body;

  try {
    const order = await Order.findOne({
      where: { id: orderId, userId: req.user.id },
      include: [{ model: User }]
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is cancelled.' });
    }
    const paymentResult = await payosService.createPaymentRequest({
      orderId: orderId,
      amount: Math.round(Number(order.total)),
      description: `Thanh toÃ¡n Ä‘Æ¡n hÃ ng #${orderId}`,
      returnUrl: returnUrl || `${process.env.FRONTEND_URL}/orders/${orderId}`,
      buyerName: order.shippingName || 'Customer',
      buyerEmail: order.User ? order.User.email : 'customer@shopvn.com',
      buyerPhone: order.shippingPhone
    });

    // Save payment reference to order
    order.paymentMethod = 'bank_transfer';
    order.vnpayTxnRef = String(paymentResult.paymentId);
    await order.save();

    res.json({
      success: true,
      data: {
        paymentId: paymentResult.paymentId,
        qrCode: paymentResult.qrCode,
        checkoutUrl: paymentResult.checkoutUrl,
        amount: paymentResult.amount,
        orderId: orderId
      }
    });
  } catch (error) {
    logger.error('PayOS payment creation failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Táº¡o mÃ£ QR tháº¥t báº¡i'
    });
  }
});

/**
 * ZaloPay Webhook Callback
 */
const zalopayWebhook = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const webhookData = req.body;
    const verification = zalopayService.verifyWebhook(webhookData);

    if (!verification.valid) {
      logger.warn('Invalid ZaloPay webhook signature');
      await t.rollback();
      return res.status(400).json({ success: false });
    }

    const { appTransId } = verification;
    const orderId = appTransId.split('_')[1];

    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t
    });

    if (!order) {
      logger.warn(`Order #${orderId} not found for ZaloPay webhook`);
      await t.rollback();
      return res.status(404).json({ success: false });
    }

    if (order.paymentStatus !== 'paid') {
      // 1. Cáº­p nháº­t tráº¡ng thÃ¡i Order
      await order.update({
        paymentStatus: 'paid',
        paymentMethod: 'zalopay',
        status: 'processing',
        vnpayTxnRef: appTransId
      }, { transaction: t });

      // 2. Commit Reserved Stock trong WMS
      const items = order.items || [];
      const omsItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));
      await OMSService.commitReservedStock(orderId, omsItems, t);

      // 3. Cá»™ng Ä‘iá»ƒm Loyalty cho user
      await LoyaltyService.addPointsFromOrder(order.userId, Number(order.total), t);

      logger.info(`âœ“ ZaloPay payment completed for order ${orderId}`);
    }

    await t.commit();
    res.json({ success: true });
  } catch (error) {
    await t.rollback();
    logger.error('ZaloPay webhook error:', error.message);
    res.status(500).json({ success: false });
  }
});

/**
 * MoMo Webhook Callback
 */
const momoWebhook = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const webhookData = req.body;
    const verification = momoService.verifyWebhook(webhookData);

    if (!verification.valid) {
      logger.warn('Invalid MoMo webhook signature');
      await t.rollback();
      return res.status(400).json({ success: false });
    }

    const { orderId, success, transId } = verification;

    if (success) {
      const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'items' }],
        transaction: t
      });

      if (!order) {
        logger.warn(`Order #${orderId} not found for MoMo webhook`);
        await t.rollback();
        return res.status(404).json({ success: false });
      }

      if (order.paymentStatus !== 'paid') {
        // 1. Cáº­p nháº­t tráº¡ng thÃ¡i Order
        await order.update({
          paymentStatus: 'paid',
          paymentMethod: 'momo',
          status: 'processing',
          vnpayTxnRef: transId
        }, { transaction: t });

        // 2. Commit Reserved Stock trong WMS
        const items = order.items || [];
        const omsItems = items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }));
        await OMSService.commitReservedStock(orderId, omsItems, t);

        // 3. Cá»™ng Ä‘iá»ƒm Loyalty cho user
        await LoyaltyService.addPointsFromOrder(order.userId, Number(order.total), t);

        logger.info(`âœ“ MoMo payment completed for order ${orderId}`);
      }
    }

    await t.commit();
    res.json({ success: true });
  } catch (error) {
    await t.rollback();
    logger.error('MoMo webhook error:', error.message);
    res.status(500).json({ success: false });
  }
});

/**
 * PayOS Webhook Callback - AUTO-RECONCILIATION
 * CRITICAL: Verify checksum to prevent spoofing attacks
 * This is the zero-touch automation that replaces manual reconciliation
 */
const payosWebhook = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const webhookData = req.body;
    const verification = payosService.verifyWebhookSignature(webhookData);

    if (!verification.valid) {
      logger.warn('Invalid PayOS webhook signature - POTENTIAL ATTACK');
      await t.rollback();
      return res.status(401).json({ success: false });
    }

    const notification = payosService.parseWebhookNotification(verification);
    const { orderId, amount, status, transactionId, paidAt } = notification;

    if (status === 'PAID') {
      const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'items' }],
        transaction: t
      });

      if (!order) {
        logger.warn(`Order #${orderId} not found for PayOS webhook`);
        await t.rollback();
        return res.status(404).json({ success: false });
      }

      if (order.paymentStatus !== 'paid') {
        // 1. Cáº­p nháº­t tráº¡ng thÃ¡i Order
        await order.update({
          paymentStatus: 'paid',
          paymentMethod: 'bank_transfer',
          status: 'processing',
          vnpayTxnRef: transactionId
        }, { transaction: t });

        // 2. Commit Reserved Stock trong WMS
        const items = order.items || [];
        const omsItems = items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }));
        await OMSService.commitReservedStock(orderId, omsItems, t);

        // 3. Cá»™ng Ä‘iá»ƒm Loyalty cho user
        await LoyaltyService.addPointsFromOrder(order.userId, Number(order.total), t);

        logger.info(`âœ“ PayOS auto-reconciled for order ${orderId} (1-3 seconds)`);
      }
    }

    await t.commit();
    res.json({ success: true });
  } catch (error) {
    await t.rollback();
    logger.error('PayOS webhook error:', error.message);
    res.status(500).json({ success: true }); // Still respond with success to prevent retries from PayOS
  }
});

/**
 * Get payment status
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({
    where: { id: orderId, userId: req.user.id },
  });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng'
    });
  }

  res.json({
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
  // VNPay (existing)
  createVnpayUrl,
  vnpayReturn,
  vnpayIpn,

  // New payment methods 2026
  createZaloPayment,
  createMomoPayment,
  createBankTransferPayment,
  zalopayWebhook,
  momoWebhook,
  payosWebhook,
  getPaymentStatus
};


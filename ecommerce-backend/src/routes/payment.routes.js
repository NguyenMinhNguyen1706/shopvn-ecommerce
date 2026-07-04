const router            = require('express').Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const rateLimit      = require('express-rate-limit');

// Protect payment creation endpoints from DDoS and invoice spamming
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                 // 15 requests per 15 minutes
  message: {
    success: false,
    message: 'Bạn đã thực hiện quá nhiều yêu cầu thanh toán. Vui lòng thử lại sau 15 phút.'
  }
});

// ══════════════════════════════════════════════════════════════════════
// ✓ EXISTING: VNPay
// ══════════════════════════════════════════════════════════════════════
router.post('/vnpay/create', authenticate, paymentLimiter, paymentController.createVnpayUrl);
router.get('/vnpay/return', paymentController.vnpayReturn);
router.get('/vnpay/ipn', paymentController.vnpayIpn);

// ══════════════════════════════════════════════════════════════════════
// ✨ NEW 2026: ZaloPay
// ══════════════════════════════════════════════════════════════════════
router.post('/zalopay/create', authenticate, paymentLimiter, paymentController.createZaloPayment);
router.post('/webhooks/zalopay/callback', paymentController.zalopayWebhook);

// ══════════════════════════════════════════════════════════════════════
// ✨ NEW 2026: MoMo
// ══════════════════════════════════════════════════════════════════════
router.post('/momo/create', authenticate, paymentLimiter, paymentController.createMomoPayment);
router.post('/webhooks/momo/callback', paymentController.momoWebhook);

// ══════════════════════════════════════════════════════════════════════
// ✨ NEW 2026: PayOS - VietQR Bank Transfer (AUTO-RECONCILIATION)
// ══════════════════════════════════════════════════════════════════════
router.post('/bank-transfer/create', authenticate, paymentLimiter, paymentController.createBankTransferPayment);
router.post('/webhooks/payos/callback', paymentController.payosWebhook);

// ══════════════════════════════════════════════════════════════════════
// Shared Endpoints
// ══════════════════════════════════════════════════════════════════════
router.get('/status/:orderId', authenticate, paymentController.getPaymentStatus);

module.exports = router;

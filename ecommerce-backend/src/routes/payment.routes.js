const router            = require('express').Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, authenticateToken }  = require('../middlewares/auth.middleware');

// ══════════════════════════════════════════════════════════════════════
// ✓ EXISTING: VNPay
// ══════════════════════════════════════════════════════════════════════
router.post('/vnpay/create', authenticate, paymentController.createVnpayUrl);
router.get('/vnpay/return', paymentController.vnpayReturn);
router.get('/vnpay/ipn', paymentController.vnpayIpn);

// ══════════════════════════════════════════════════════════════════════
// ✨ NEW 2026: ZaloPay
// ══════════════════════════════════════════════════════════════════════
router.post('/zalopay/create', authenticateToken || authenticate, paymentController.createZaloPayment);
router.post('/webhooks/zalopay/callback', paymentController.zalopayWebhook);

// ══════════════════════════════════════════════════════════════════════
// ✨ NEW 2026: MoMo
// ══════════════════════════════════════════════════════════════════════
router.post('/momo/create', authenticateToken || authenticate, paymentController.createMomoPayment);
router.post('/webhooks/momo/callback', paymentController.momoWebhook);

// ══════════════════════════════════════════════════════════════════════
// ✨ NEW 2026: PayOS - VietQR Bank Transfer (AUTO-RECONCILIATION)
// ══════════════════════════════════════════════════════════════════════
router.post('/bank-transfer/create', authenticateToken || authenticate, paymentController.createBankTransferPayment);
router.post('/webhooks/payos/callback', paymentController.payosWebhook);

// ══════════════════════════════════════════════════════════════════════
// Shared Endpoints
// ══════════════════════════════════════════════════════════════════════
router.get('/status/:orderId', authenticateToken || authenticate, paymentController.getPaymentStatus);

module.exports = router;

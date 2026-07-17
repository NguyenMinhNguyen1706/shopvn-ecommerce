const router            = require('express').Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { requireWebhookIP } = require('../middlewares/webhook-security.middleware');
const Joi = require('joi');
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

const createPaymentSchema = Joi.object({
  orderId: Joi.number().integer().required()
});

// ── VNPay ─────────────────────────────────────────────────────────────
router.post('/vnpay/create', authenticate, paymentLimiter, validate(createPaymentSchema), paymentController.createVnpayUrl);
router.get('/vnpay/return', paymentController.vnpayReturn);
router.get('/vnpay/ipn', requireWebhookIP('vnpay'), paymentController.vnpayIpn);

// ── ZaloPay ───────────────────────────────────────────────────────────
router.post('/zalopay/create', authenticate, paymentLimiter, validate(createPaymentSchema), paymentController.createZaloPayment);
router.post('/webhooks/zalopay/callback', requireWebhookIP('zalopay'), paymentController.zalopayWebhook);

// ── MoMo ──────────────────────────────────────────────────────────────
router.post('/momo/create', authenticate, paymentLimiter, validate(createPaymentSchema), paymentController.createMomoPayment);
router.post('/webhooks/momo/callback', requireWebhookIP('momo'), paymentController.momoWebhook);

// ── PayOS - VietQR Bank Transfer ──────────────────────────────────────
router.post('/bank-transfer/create', authenticate, paymentLimiter, validate(createPaymentSchema), paymentController.createBankTransferPayment);
router.post('/webhooks/payos/callback', requireWebhookIP('payos'), paymentController.payosWebhook);

// Shared Endpoints
router.get('/status/:orderId', authenticate, paymentController.getPaymentStatus);

module.exports = router;

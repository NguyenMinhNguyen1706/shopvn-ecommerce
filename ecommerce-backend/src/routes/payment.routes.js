const router = require('express').Router();
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { requireWebhookIP } = require('../middlewares/webhook-security.middleware');

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều yêu cầu thanh toán. Vui lòng thử lại sau 15 phút.'
  }
});

const createPaymentSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  bankCode: Joi.string().pattern(/^[A-Z0-9]{2,20}$/).optional()
});

router.post(
  '/vnpay/create',
  authenticate,
  paymentLimiter,
  validate(createPaymentSchema),
  paymentController.createVnpayUrl
);
router.get('/vnpay/return', paymentController.vnpayReturn);
router.get('/vnpay/ipn', requireWebhookIP('vnpay'), paymentController.vnpayIpn);

router.post(
  '/zalopay/create',
  authenticate,
  paymentLimiter,
  validate(createPaymentSchema),
  paymentController.createZaloPayment
);
router.post(
  '/webhooks/zalopay/callback',
  requireWebhookIP('zalopay'),
  paymentController.zalopayWebhook
);

router.post(
  '/momo/create',
  authenticate,
  paymentLimiter,
  validate(createPaymentSchema),
  paymentController.createMomoPayment
);
router.post(
  '/webhooks/momo/callback',
  requireWebhookIP('momo'),
  paymentController.momoWebhook
);

router.post(
  '/bank-transfer/create',
  authenticate,
  paymentLimiter,
  validate(createPaymentSchema),
  paymentController.createBankTransferPayment
);
router.post(
  '/webhooks/payos/callback',
  requireWebhookIP('payos'),
  paymentController.payosWebhook
);

router.get('/status/:orderId', authenticate, paymentController.getPaymentStatus);

module.exports = router;

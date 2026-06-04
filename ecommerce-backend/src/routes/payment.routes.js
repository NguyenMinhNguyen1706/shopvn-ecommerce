const router            = require('express').Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate }  = require('../middlewares/auth.middleware');

// Tạo URL thanh toán — cần login
router.post('/vnpay/create', authenticate, paymentController.createVnpayUrl);

// Return URL — VNPay redirect user về (không cần auth — VNPay gọi)
router.get('/vnpay/return', paymentController.vnpayReturn);

// IPN URL — VNPay gọi server-to-server (không cần auth)
router.get('/vnpay/ipn', paymentController.vnpayIpn);

module.exports = router;

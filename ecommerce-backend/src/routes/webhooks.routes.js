const express = require('express');
const router = express.Router();
const shopeeController = require('../controllers/shopee.controller');
const tiktokController = require('../controllers/tiktok.controller');
const { requireWebhookSecret } = require('../middlewares/security.middleware');

// MOCK: Giả lập endpoint nhận webhook
router.post('/shopee', requireWebhookSecret(), shopeeController.handleWebhook);
router.post('/tiktok', requireWebhookSecret(), tiktokController.handleWebhook);

module.exports = router;

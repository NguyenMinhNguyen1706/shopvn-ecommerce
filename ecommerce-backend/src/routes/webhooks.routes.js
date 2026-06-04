const express = require('express');
const router = express.Router();
const shopeeController = require('../controllers/shopee.controller');
const tiktokController = require('../controllers/tiktok.controller');

// MOCK: Giả lập endpoint nhận webhook
router.post('/shopee', shopeeController.handleWebhook);
router.post('/tiktok', tiktokController.handleWebhook);

module.exports = router;

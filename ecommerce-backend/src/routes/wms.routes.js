const express = require('express');
const router = express.Router();
const wmsController = require('../controllers/wms.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Endpoint tạo barcode cho Order
router.get('/barcode/:orderId', authenticate, wmsController.generateBarcode);

module.exports = router;

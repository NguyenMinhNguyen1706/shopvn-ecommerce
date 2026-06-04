const express = require('express');
const router = express.Router();
const wmsController = require('../controllers/wms.controller');

// Endpoint tạo barcode cho Order
router.get('/barcode/:orderId', wmsController.generateBarcode);

module.exports = router;

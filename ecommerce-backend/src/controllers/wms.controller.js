const bwipjs = require('bwip-js');
const Order = require('../models/Order');

const generateBarcode = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Bỏ qua check Order DB để test Barcode

    // Tạo mã vạch chuẩn Code128 với tiền tố SHOPVN
    const text = `SHOPVN-${orderId}`;
    
    bwipjs.toBuffer({
      bcid:        'code128',       // Barcode type
      text:        text,            // Text to encode
      scale:       3,               // 3x scaling factor
      height:      10,              // Bar height, in millimeters
      includetext: true,            // Show human-readable text
      textxalign:  'center',        // Always good to set this
    }, function (err, png) {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      } else {
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': png.length
        });
        res.end(png);
      }
    });

  } catch (error) {
    console.error('[WMS Barcode Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateBarcode
};


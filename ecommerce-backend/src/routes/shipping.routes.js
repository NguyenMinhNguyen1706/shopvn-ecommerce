const express = require('express');
const router = express.Router();
const { shippingService } = require('../services/shipping.service');
const logger = console;

/**
 * Shipping Routes
 * Real-time integration with GHN (Giao Hàng Nhanh)
 */

/**
 * GET /api/shipping/provinces
 * Get all provinces in Vietnam
 * Cached for 24 hours
 */
router.get('/provinces', async (req, res) => {
  try {
    const provinces = await shippingService.getProvinces();
    res.json({
      success: true,
      data: provinces
    });
  } catch (error) {
    logger.error('Get provinces error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách tỉnh/thành phố'
    });
  }
});

/**
 * GET /api/shipping/districts/:provinceId
 * Get districts by province
 */
router.get('/districts/:provinceId', async (req, res) => {
  try {
    const { provinceId } = req.params;
    const districts = await shippingService.getDistricts(parseInt(provinceId));
    
    res.json({
      success: true,
      data: districts
    });
  } catch (error) {
    logger.error('Get districts error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách quận/huyện'
    });
  }
});

/**
 * GET /api/shipping/wards/:districtId
 * Get wards by district
 */
router.get('/wards/:districtId', async (req, res) => {
  try {
    const { districtId } = req.params;
    const wards = await shippingService.getWards(parseInt(districtId));
    
    res.json({
      success: true,
      data: wards
    });
  } catch (error) {
    logger.error('Get wards error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách phường/xã'
    });
  }
});

/**
 * POST /api/shipping/calculate
 * Calculate shipping cost in real-time
 * Called during checkout to show accurate shipping prices
 * 
 * Body:
 * {
 *   toDistrictId: number,
 *   toWardId: number,
 *   weight: number (grams),
 *   serviceType: 2 (standard, 2-3 days) or 1 (fast, 1 day)
 * }
 */
router.post('/calculate', async (req, res) => {
  try {
    const { toDistrictId, toWardId, weight, serviceType = 2 } = req.body;

    if (!toDistrictId || !toWardId || !weight) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: toDistrictId, toWardId, weight'
      });
    }

    const shippingCost = await shippingService.calculateShippingCost({
      toDistrictId,
      toWardId,
      weight,
      serviceType
    });

    res.json({
      success: true,
      data: shippingCost
    });
  } catch (error) {
    logger.error('Calculate shipping error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Không thể tính phí vận chuyển'
    });
  }
});

/**
 * POST /api/shipping/create-order
 * Create shipping order after payment confirmation
 * Generates tracking number automatically
 * 
 * Body:
 * {
 *   orderId: string,
 *   customerName: string,
 *   customerPhone: string,
 *   toDistrictId: number,
 *   toWardId: number,
 *   toAddress: string,
 *   itemsWeight: number,
 *   itemsValue: number,
 *   cod: number (if COD),
 *   items: array
 * }
 */
router.post('/create-order', async (req, res) => {
  try {
    const {
      orderId,
      customerName,
      customerPhone,
      customerEmail,
      toDistrictId,
      toWardId,
      toAddress,
      itemsWeight,
      itemsValue,
      cod,
      items
    } = req.body;

    if (!orderId || !customerName || !toDistrictId || !toWardId || !toAddress) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin giao hàng bắt buộc'
      });
    }

    const result = await shippingService.createShippingOrder({
      orderId,
      customerName,
      customerPhone,
      customerEmail,
      toDistrictId,
      toWardId,
      toAddress,
      itemsWeight,
      itemsValue,
      cod,
      items
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Create shipping order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo đơn giao hàng'
    });
  }
});

/**
 * GET /api/shipping/track/:orderCode
 * Get tracking status for an order
 */
router.get('/track/:orderCode', async (req, res) => {
  try {
    const { orderCode } = req.params;
    
    const trackingStatus = await shippingService.getTrackingStatus(orderCode);
    
    res.json({
      success: true,
      data: trackingStatus
    });
  } catch (error) {
    logger.error('Get tracking status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy thông tin vận chuyển'
    });
  }
});

module.exports = router;


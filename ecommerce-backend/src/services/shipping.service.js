const axios = require('axios');
const logger = console;

/**
 * Shipping Service
 * Integrates with GHN (Giao Hàng Nhanh) for real-time shipping calculations
 */
const shippingService = {
  // GHN API Configuration
  GHN_API_BASE_URL: process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn/shiip/public-api',
  GHN_SHOP_ID: process.env.GHN_SHOP_ID,
  GHN_TOKEN: process.env.GHN_TOKEN,

  // Cache for provinces/districts/wards (update daily)
  provincesCache: null,
  districtsCache: {},
  wardsCache: {},

  /**
   * Get all provinces in Vietnam
   * Cached for performance
   */
  getProvinces: async () => {
    try {
      // Return cache if exists
      if (shippingService.provincesCache) {
        return shippingService.provincesCache;
      }

      const response = await axios.get(`${shippingService.GHN_API_BASE_URL}/master/province`, {
        headers: {
          'token': shippingService.GHN_TOKEN
        }
      });

      if (response.data.code === 200) {
        // Cache for 24 hours
        shippingService.provincesCache = response.data.data;
        logger.info(`✓ Loaded ${response.data.data.length} provinces from GHN`);
        return response.data.data;
      } else {
        throw new Error(`GHN error: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Shipping getProvinces error:', error.message);
      throw error;
    }
  },

  /**
   * Get districts by province ID
   */
  getDistricts: async (provinceId) => {
    try {
      // Check cache
      if (shippingService.districtsCache[provinceId]) {
        return shippingService.districtsCache[provinceId];
      }

      const response = await axios.get(
        `${shippingService.GHN_API_BASE_URL}/master/district`,
        {
          params: { province_id: provinceId },
          headers: { 'token': shippingService.GHN_TOKEN }
        }
      );

      if (response.data.code === 200) {
        // Cache districts for this province
        shippingService.districtsCache[provinceId] = response.data.data;
        logger.info(`✓ Loaded ${response.data.data.length} districts for province ${provinceId}`);
        return response.data.data;
      } else {
        throw new Error(`GHN error: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Shipping getDistricts error:', error.message);
      throw error;
    }
  },

  /**
   * Get wards by district ID
   */
  getWards: async (districtId) => {
    try {
      // Check cache
      if (shippingService.wardsCache[districtId]) {
        return shippingService.wardsCache[districtId];
      }

      const response = await axios.get(
        `${shippingService.GHN_API_BASE_URL}/master/ward`,
        {
          params: { district_id: districtId },
          headers: { 'token': shippingService.GHN_TOKEN }
        }
      );

      if (response.data.code === 200) {
        // Cache wards for this district
        shippingService.wardsCache[districtId] = response.data.data;
        logger.info(`✓ Loaded ${response.data.data.length} wards for district ${districtId}`);
        return response.data.data;
      } else {
        throw new Error(`GHN error: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Shipping getWards error:', error.message);
      throw error;
    }
  },

  /**
   * Calculate shipping cost
   * This is called during checkout to show real-time shipping prices
   */
  calculateShippingCost: async (shippingData) => {
    try {
      const {
        toDistrictId,
        toWardId,
        weight, // in grams
        value, // declared value for insurance
        serviceType = 2 // 2 = Standard (2-3 days), 1 = Fast (1 day)
      } = shippingData;

      const payload = {
        from_district_id: shippingService.getShopDistrictId(), // Your warehouse district
        to_district_id: toDistrictId,
        to_ward_id: toWardId,
        height: 10,
        length: 20,
        width: 30,
        weight: Math.max(weight, 100), // Minimum 100g
        service_type_id: serviceType,
        service_id: null
      };

      const response = await axios.post(
        `${shippingService.GHN_API_BASE_URL}/v2/shipping-order/fee`,
        payload,
        {
          headers: {
            'token': shippingService.GHN_TOKEN,
            'shop_id': shippingService.GHN_SHOP_ID
          }
        }
      );

      if (response.data.code === 200) {
        const { total, service_fee, insurance_fee } = response.data.data;

        logger.info(`✓ Calculated shipping: ${total} VND for ${toDistrictId}`);

        return {
          success: true,
          shippingCost: total,
          serviceFee: service_fee,
          insuranceFee: insurance_fee || 0,
          currency: 'VND',
          estimated_delivery: '2-3 days' // Based on service type
        };
      } else {
        throw new Error(`GHN error: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Shipping calculateShippingCost error:', error.message);
      throw error;
    }
  },

  /**
   * Create shipping order (after payment confirmed)
   * Generates tracking number
   */
  createShippingOrder: async (orderData) => {
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
        cod, // Cash on delivery amount (0 if prepaid)
        items // Array of { name, quantity, price }
      } = orderData;

      const payload = {
        shop_id: shippingService.GHN_SHOP_ID,
        from_name: process.env.SHOP_NAME || 'E-Commerce Store',
        from_phone: process.env.SHOP_PHONE,
        from_address: process.env.SHOP_ADDRESS,
        from_ward_id: process.env.SHOP_WARD_ID,
        from_district_id: process.env.SHOP_DISTRICT_ID,
        to_name: customerName,
        to_phone: customerPhone,
        to_email: customerEmail,
        to_address: toAddress,
        to_ward_id: toWardId,
        to_district_id: toDistrictId,
        weight: Math.max(itemsWeight, 100),
        length: 20,
        width: 30,
        height: 10,
        insurance_value: itemsValue,
        service_type_id: 2, // Standard service
        cod_amount: cod || 0, // Amount customer must pay on delivery
        required_note: 'CHOXEMHANGKHONGTHU', // Customer can inspect before paying
        client_order_code: orderId,
        items: items
      };

      const response = await axios.post(
        `${shippingService.GHN_API_BASE_URL}/v2/shipping-order/create`,
        payload,
        {
          headers: {
            'token': shippingService.GHN_TOKEN,
            'shop_id': shippingService.GHN_SHOP_ID
          }
        }
      );

      if (response.data.code === 200) {
        const { order_code, sort_code, expected_delivery_time } = response.data.data;

        logger.info(`✓ Shipping order created: ${order_code}`);

        return {
          success: true,
          trackingNumber: sort_code,
          orderCode: order_code,
          expectedDeliveryTime: expected_delivery_time,
          carrier: 'GHN'
        };
      } else {
        throw new Error(`GHN error: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Shipping createShippingOrder error:', error.message);
      throw error;
    }
  },

  /**
   * Get tracking status
   */
  getTrackingStatus: async (orderCode) => {
    try {
      const response = await axios.post(
        `${shippingService.GHN_API_BASE_URL}/v2/shipping-order/detail`,
        { order_code: orderCode },
        {
          headers: {
            'token': shippingService.GHN_TOKEN,
            'shop_id': shippingService.GHN_SHOP_ID
          }
        }
      );

      if (response.data.code === 200) {
        const order = response.data.data;
        return {
          trackingNumber: order.sort_code,
          status: order.status, // See GHN status codes
          status_text: order.status_text,
          updated_at: order.updated_date,
          expected_delivery: order.expected_delivery_time
        };
      } else {
        throw new Error(`GHN error: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Shipping getTrackingStatus error:', error.message);
      throw error;
    }
  },

  /**
   * Get your shop's default location
   */
  getShopDistrictId: () => {
    return parseInt(process.env.SHOP_DISTRICT_ID) || 1; // Default to Hoan Kiem, Ha Noi
  },

  /**
   * Clear caches (run daily)
   */
  clearCaches: () => {
    shippingService.provincesCache = null;
    shippingService.districtsCache = {};
    shippingService.wardsCache = {};
    logger.info('✓ Shipping caches cleared');
  }
};

module.exports = {
  shippingService
};


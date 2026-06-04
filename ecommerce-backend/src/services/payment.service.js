const axios = require('axios');
const crypto = require('crypto');
const logger = console;

/**
 * ZaloPay Payment Service
 * Handles all ZaloPay payment operations
 */
const zalopayService = {
  // ZaloPay API endpoints
  API_BASE_URL: process.env.ZALOPAY_API_URL || 'https://sandbox.zalopay.com.vn/api/v2',
  APP_ID: process.env.ZALOPAY_APP_ID,
  KEY1: process.env.ZALOPAY_KEY1,
  KEY2: process.env.ZALOPAY_KEY2,

  /**
   * Create payment request
   * @param {Object} paymentData - { amount, returnUrl, description, orderId, userId }
   */
  createPaymentUrl: async (paymentData) => {
    try {
      const { amount, returnUrl, description, orderId, userId } = paymentData;

      // Prepare request data
      const appTransId = `${new Date().getTime()}_${orderId}`;
      const transData = JSON.stringify({
        appid: zalopayService.APP_ID,
        apptransid: appTransId,
        appuser: userId,
        amount: Math.round(amount * 100), // in cents
        apptime: Math.floor(Date.now() / 1000),
        embeddata: JSON.stringify({ redirecturl: returnUrl }),
        item: '[]',
        description: description || 'Payment for order',
        bankcode: ''
      });

      // Create Mac (signature)
      const mac = crypto
        .createHmac('sha256', zalopayService.KEY1)
        .update(transData)
        .digest('hex');

      // Call ZaloPay API
      const response = await axios.post(`${zalopayService.API_BASE_URL}/create`, {
        data: transData,
        mac: mac
      });

      if (response.data.returncode === 1) {
        logger.info(`✓ ZaloPay payment URL created: ${appTransId}`);
        return {
          success: true,
          paymentUrl: response.data.orderurl,
          appTransId: appTransId,
          amount: amount
        };
      } else {
        throw new Error(`ZaloPay API error: ${response.data.returnmessage}`);
      }
    } catch (error) {
      logger.error('ZaloPay createPaymentUrl error:', error.message);
      throw error;
    }
  },

  /**
   * Verify payment callback (webhook)
   * @param {Object} webhookData - Data from ZaloPay callback
   */
  verifyWebhook: (webhookData) => {
    try {
      const { data, mac } = webhookData;
      
      // Recreate signature
      const computedMac = crypto
        .createHmac('sha256', zalopayService.KEY2)
        .update(data)
        .digest('hex');

      // Verify signature
      if (computedMac !== mac) {
        logger.warn('ZaloPay webhook signature verification failed');
        return { valid: false, reason: 'Invalid signature' };
      }

      // Parse and validate data
      const paymentData = JSON.parse(data);
      
      return {
        valid: true,
        appTransId: paymentData.apptransid,
        amount: paymentData.amount / 100, // convert from cents
        returncode: paymentData.returncode,
        orderId: paymentData.appuser
      };
    } catch (error) {
      logger.error('ZaloPay webhook verification error:', error.message);
      return { valid: false, reason: error.message };
    }
  },

  /**
   * Query payment status
   */
  queryPaymentStatus: async (appTransId) => {
    try {
      const data = `${zalopayService.APP_ID}|${appTransId}|${zalopayService.KEY1}`;
      const mac = crypto.createHmac('sha256', zalopayService.KEY1).update(data).digest('hex');

      const response = await axios.post(
        `${zalopayService.API_BASE_URL}/query`,
        { appid: zalopayService.APP_ID, apptransid: appTransId, mac: mac }
      );

      return response.data;
    } catch (error) {
      logger.error('ZaloPay query status error:', error.message);
      throw error;
    }
  }
};

/**
 * MoMo Payment Service
 * Handles all MoMo payment operations
 */
const momoService = {
  API_BASE_URL: process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v3/gateway/api',
  PARTNER_CODE: process.env.MOMO_PARTNER_CODE,
  ACCESS_KEY: process.env.MOMO_ACCESS_KEY,
  SECRET_KEY: process.env.MOMO_SECRET_KEY,

  /**
   * Create payment request
   */
  createPaymentUrl: async (paymentData) => {
    try {
      const { amount, orderId, userId, returnUrl, description } = paymentData;

      const requestId = `${Date.now()}_${orderId}`;
      const requestType = 'captureWallet';

      // Prepare signature data
      const signatureString = `accessKey=${momoService.ACCESS_KEY}&amount=${amount}&extraData=&ipnUrl=&notifyUrl=&orderId=${orderId}&orderInfo=${description}&partnerCode=${momoService.PARTNER_CODE}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;

      // Create signature (HMAC SHA256)
      const signature = crypto
        .createHmac('sha256', momoService.SECRET_KEY)
        .update(signatureString)
        .digest('hex');

      // Call MoMo API
      const response = await axios.post(`${momoService.API_BASE_URL}/create`, {
        partnerCode: momoService.PARTNER_CODE,
        partnerName: 'E-Commerce Store',
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: description || 'Payment for order',
        redirectUrl: returnUrl,
        ipnUrl: process.env.MOMO_IPN_URL || `${process.env.BACKEND_URL}/webhooks/momo`,
        requestType: requestType,
        autoCapture: true,
        lang: 'vi',
        signature: signature
      });

      if (response.data.resultCode === 0) {
        logger.info(`✓ MoMo payment URL created: ${requestId}`);
        return {
          success: true,
          paymentUrl: response.data.payUrl,
          requestId: requestId,
          amount: amount
        };
      } else {
        throw new Error(`MoMo API error: ${response.data.resultMessage}`);
      }
    } catch (error) {
      logger.error('MoMo createPaymentUrl error:', error.message);
      throw error;
    }
  },

  /**
   * Verify payment webhook callback
   */
  verifyWebhook: (webhookData) => {
    try {
      const { orderId, amount, transId, resultCode, message, signature } = webhookData;

      // Reconstruct signature
      const signatureString = `accessKey=${momoService.ACCESS_KEY}&amount=${amount}&orderId=${orderId}&partnerCode=${momoService.PARTNER_CODE}&requestId=${webhookData.requestId}&transId=${transId}`;

      const computedSignature = crypto
        .createHmac('sha256', momoService.SECRET_KEY)
        .update(signatureString)
        .digest('hex');

      if (computedSignature !== signature) {
        logger.warn('MoMo webhook signature verification failed');
        return { valid: false, reason: 'Invalid signature' };
      }

      return {
        valid: true,
        orderId: orderId,
        transId: transId,
        amount: amount,
        resultCode: resultCode,
        success: resultCode === 0
      };
    } catch (error) {
      logger.error('MoMo webhook verification error:', error.message);
      return { valid: false, reason: error.message };
    }
  },

  /**
   * Query transaction status
   */
  queryTransaction: async (orderId, requestId) => {
    try {
      const signatureString = `accessKey=${momoService.ACCESS_KEY}&orderId=${orderId}&partnerCode=${momoService.PARTNER_CODE}&requestId=${requestId}`;

      const signature = crypto
        .createHmac('sha256', momoService.SECRET_KEY)
        .update(signatureString)
        .digest('hex');

      const response = await axios.post(`${momoService.API_BASE_URL}/querystatusbyorderid`, {
        partnerCode: momoService.PARTNER_CODE,
        requestId: requestId,
        orderId: orderId,
        signature: signature,
        lang: 'vi'
      });

      return response.data;
    } catch (error) {
      logger.error('MoMo query transaction error:', error.message);
      throw error;
    }
  }
};

module.exports = {
  zalopayService,
  momoService
};


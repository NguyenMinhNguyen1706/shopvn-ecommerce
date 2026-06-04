const axios = require('axios');
const crypto = require('crypto');
const logger = console;

/**
 * PayOS Service
 * Handles VietQR code generation and payment reconciliation
 * Supports auto-reconciliation via webhook
 */
const payosService = {
  API_BASE_URL: process.env.PAYOS_API_URL || 'https://api.payos.vn/v1',
  CLIENT_ID: process.env.PAYOS_CLIENT_ID,
  API_KEY: process.env.PAYOS_API_KEY,
  CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY,

  /**
   * Create VietQR code request
   * @param {Object} paymentData - { orderId, amount, description, returnUrl, expiredAt }
   */
  createPaymentRequest: async (paymentData) => {
    try {
      const {
        orderId,
        amount,
        description,
        returnUrl,
        expiredAt,
        buyerName,
        buyerEmail,
        buyerPhone
      } = paymentData;

      const payload = {
        orderCode: orderId,
        amount: Math.round(amount), // Amount in VND
        description: description || `Payment for order ${orderId}`,
        returnUrl: returnUrl || `${process.env.FRONTEND_URL}/orders/${orderId}`,
        expiredAt: expiredAt || Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        buyerName: buyerName,
        buyerEmail: buyerEmail,
        buyerPhone: buyerPhone
      };

      // Call PayOS API with authentication
      const response = await axios.post(
        `${payosService.API_BASE_URL}/payment-requests`,
        payload,
        {
          headers: {
            'x-client-id': payosService.CLIENT_ID,
            'x-api-key': payosService.API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.data) {
        const { id, qrCode, checkoutUrl } = response.data.data;
        logger.info(`✓ PayOS QR code generated: ${id}`);

        return {
          success: true,
          paymentId: id,
          qrCode: qrCode, // Data URL for QR code image
          checkoutUrl: checkoutUrl, // Web checkout link
          amount: amount,
          orderId: orderId
        };
      } else {
        throw new Error(`PayOS API error: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('PayOS createPaymentRequest error:', error.message);
      throw error;
    }
  },

  /**
   * Verify webhook signature (checksum)
   * CRITICAL: Prevent spoofing attacks by verifying webhook authenticity
   */
  verifyWebhookSignature: (webhookData) => {
    try {
      const { data, signature } = webhookData;

      // Create HMAC-SHA256 signature
      const computedSignature = crypto
        .createHmac('sha256', payosService.CHECKSUM_KEY)
        .update(JSON.stringify(data))
        .digest('hex');

      if (computedSignature !== signature) {
        logger.warn('PayOS webhook signature verification failed');
        return { valid: false, reason: 'Invalid signature' };
      }

      return { valid: true, data: data };
    } catch (error) {
      logger.error('PayOS signature verification error:', error.message);
      return { valid: false, reason: error.message };
    }
  },

  /**
   * Get payment request details
   */
  getPaymentRequest: async (paymentId) => {
    try {
      const response = await axios.get(
        `${payosService.API_BASE_URL}/payment-requests/${paymentId}`,
        {
          headers: {
            'x-client-id': payosService.CLIENT_ID,
            'x-api-key': payosService.API_KEY
          }
        }
      );

      return response.data.data;
    } catch (error) {
      logger.error('PayOS getPaymentRequest error:', error.message);
      throw error;
    }
  },

  /**
   * Cancel payment request
   */
  cancelPaymentRequest: async (paymentId) => {
    try {
      const response = await axios.post(
        `${payosService.API_BASE_URL}/payment-requests/${paymentId}/cancel`,
        {},
        {
          headers: {
            'x-client-id': payosService.CLIENT_ID,
            'x-api-key': payosService.API_KEY
          }
        }
      );

      logger.info(`✓ PayOS payment cancelled: ${paymentId}`);
      return response.data.data;
    } catch (error) {
      logger.error('PayOS cancelPaymentRequest error:', error.message);
      throw error;
    }
  },

  /**
   * Webhook notification payload structure
   * This is received when customer completes bank transfer
   */
  parseWebhookNotification: (webhookPayload) => {
    const { data } = webhookPayload;

    return {
      paymentId: data.id,
      orderId: data.orderCode,
      amount: data.amount,
      transactionId: data.transactionId,
      status: data.status, // "PAID", "PENDING", "CANCELLED", "EXPIRED"
      paidAt: data.paidAt,
      reference: data.reference // Bank transfer reference number
    };
  }
};

module.exports = {
  payosService
};


const axios = require('axios');
const crypto = require('crypto');
const logger = console;

const stripTrailingSlash = value => String(value || '').replace(/\/+$/, '');

const requireSetting = (name, value) => {
  if (!value) throw new Error(`Missing payment configuration: ${name}`);
  return value;
};

const timingSafeEqualHex = (expected, received) => {
  if (!/^[a-f0-9]{64}$/i.test(String(expected)) || !/^[a-f0-9]{64}$/i.test(String(received))) {
    return false;
  }
  const expectedBuffer = Buffer.from(String(expected), 'hex');
  const receivedBuffer = Buffer.from(String(received), 'hex');
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const sortNestedValue = value => {
  if (Array.isArray(value)) return value.map(sortNestedValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = sortNestedValue(value[key]);
      return result;
    }, {});
  }
  return value;
};

const stringifySignatureValue = value => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(sortNestedValue(value));
  }
  return String(value);
};

const buildCanonicalData = data => Object.keys(data || {})
  .sort()
  .map(key => `${key}=${stringifySignatureValue(data[key])}`)
  .join('&');

const signData = (data, checksumKey) => crypto
  .createHmac('sha256', requireSetting('PAYOS_CHECKSUM_KEY', checksumKey))
  .update(buildCanonicalData(data), 'utf8')
  .digest('hex');

const paymentHeaders = service => ({
  'x-client-id': requireSetting('PAYOS_CLIENT_ID', service.CLIENT_ID),
  'x-api-key': requireSetting('PAYOS_API_KEY', service.API_KEY),
  'Content-Type': 'application/json'
});

/**
 * PayOS Service
 * Protocol reference: https://payos.vn/docs/api/
 */
const payosService = {
  API_BASE_URL: stripTrailingSlash(process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn/v2'),
  CLIENT_ID: process.env.PAYOS_CLIENT_ID,
  API_KEY: process.env.PAYOS_API_KEY,
  CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY,

  createPaymentRequest: async paymentData => {
    const {
      orderId,
      amount,
      description,
      returnUrl,
      cancelUrl,
      expiredAt,
      buyerName,
      buyerEmail,
      buyerPhone
    } = paymentData;
    const orderCode = Number(orderId);
    const vndAmount = Math.round(Number(amount));
    if (!Number.isSafeInteger(orderCode) || orderCode <= 0) {
      throw new Error('PayOS orderCode must be a positive integer.');
    }
    if (!Number.isSafeInteger(vndAmount) || vndAmount <= 0) {
      throw new Error('PayOS amount must be a positive VND integer.');
    }

    const frontendUrl = stripTrailingSlash(requireSetting('FRONTEND_URL', process.env.FRONTEND_URL));
    const normalizedDescription = String(description || `DH${orderCode}`).slice(0, 25);
    const signatureData = {
      amount: vndAmount,
      cancelUrl: cancelUrl || `${frontendUrl}/orders.html?payment=cancelled&orderId=${orderCode}`,
      description: normalizedDescription,
      orderCode,
      returnUrl: returnUrl || `${frontendUrl}/orders.html?payment=success&orderId=${orderCode}`
    };
    const payload = {
      orderCode,
      amount: vndAmount,
      description: normalizedDescription,
      cancelUrl: signatureData.cancelUrl,
      returnUrl: signatureData.returnUrl,
      expiredAt: expiredAt || Math.floor(Date.now() / 1000) + 3600,
      signature: signData(signatureData, payosService.CHECKSUM_KEY)
    };
    if (buyerName) payload.buyerName = buyerName;
    if (buyerEmail) payload.buyerEmail = buyerEmail;
    if (buyerPhone) payload.buyerPhone = buyerPhone;

    try {
      const response = await axios.post(
        `${payosService.API_BASE_URL}/payment-requests`,
        payload,
        { headers: paymentHeaders(payosService) }
      );

      if (String(response.data.code) !== '00' || !response.data.data?.checkoutUrl) {
        throw new Error(`PayOS rejected the request: ${response.data.desc || 'unknown error'}`);
      }

      const { paymentLinkId, id, qrCode, checkoutUrl } = response.data.data;
      logger.info(`PayOS QR code generated: ${paymentLinkId || id}`);
      return {
        success: true,
        paymentId: paymentLinkId || id,
        qrCode,
        checkoutUrl,
        amount: vndAmount,
        orderId: orderCode
      };
    } catch (error) {
      logger.error('PayOS createPaymentRequest error:', error.message);
      throw error;
    }
  },

  verifyWebhookSignature: webhookData => {
    try {
      const { data, signature } = webhookData || {};
      if (!data || typeof data !== 'object' || typeof signature !== 'string') {
        return { valid: false, reason: 'Missing webhook data or signature' };
      }
      const computedSignature = signData(data, payosService.CHECKSUM_KEY);
      if (!timingSafeEqualHex(computedSignature, signature)) {
        logger.warn('PayOS webhook signature verification failed');
        return { valid: false, reason: 'Invalid signature' };
      }
      return { valid: true, data };
    } catch (error) {
      logger.error('PayOS signature verification error:', error.message);
      return { valid: false, reason: 'Invalid webhook payload' };
    }
  },

  getPaymentRequest: async paymentId => {
    try {
      const response = await axios.get(
        `${payosService.API_BASE_URL}/payment-requests/${encodeURIComponent(paymentId)}`,
        { headers: paymentHeaders(payosService) }
      );
      return response.data.data;
    } catch (error) {
      logger.error('PayOS getPaymentRequest error:', error.message);
      throw error;
    }
  },

  cancelPaymentRequest: async (paymentId, cancellationReason = 'User requested cancellation') => {
    try {
      const response = await axios.post(
        `${payosService.API_BASE_URL}/payment-requests/${encodeURIComponent(paymentId)}/cancel`,
        { cancellationReason },
        { headers: paymentHeaders(payosService) }
      );
      logger.info(`PayOS payment cancelled: ${paymentId}`);
      return response.data.data;
    } catch (error) {
      logger.error('PayOS cancelPaymentRequest error:', error.message);
      throw error;
    }
  },

  parseWebhookNotification: webhookPayload => {
    const { data = {} } = webhookPayload || {};
    return {
      paymentId: data.paymentLinkId,
      orderId: data.orderCode,
      amount: Number(data.amount),
      transactionId: data.reference,
      status: String(data.code) === '00' ? 'PAID' : 'FAILED',
      paidAt: data.transactionDateTime,
      reference: data.reference
    };
  }
};

module.exports = {
  payosService,
  payosServiceInternals: {
    buildCanonicalData,
    signData,
    timingSafeEqualHex
  }
};

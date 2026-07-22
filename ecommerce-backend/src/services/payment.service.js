const axios = require('axios');
const crypto = require('crypto');
const logger = console;

const stripTrailingSlash = value => String(value || '').replace(/\/+$/, '');

const requireSetting = (name, value) => {
  if (!value) {
    throw new Error(`Missing payment configuration: ${name}`);
  }
  return value;
};

const toVndAmount = value => {
  const amount = Math.round(Number(value));
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('Payment amount must be a positive VND integer.');
  }
  return amount;
};

const hmacSha256 = (key, payload) => crypto
  .createHmac('sha256', requireSetting('HMAC key', key))
  .update(String(payload), 'utf8')
  .digest('hex');

const timingSafeEqualHex = (expected, received) => {
  if (!/^[a-f0-9]{64}$/i.test(String(expected)) || !/^[a-f0-9]{64}$/i.test(String(received))) {
    return false;
  }

  const expectedBuffer = Buffer.from(String(expected), 'hex');
  const receivedBuffer = Buffer.from(String(received), 'hex');
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const getVietnamDatePrefix = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const value = type => parts.find(part => part.type === type)?.value;
  return `${value('year')}${value('month')}${value('day')}`;
};

const buildCallbackUrl = (explicitUrl, path) => {
  if (explicitUrl) return explicitUrl;
  const backendUrl = stripTrailingSlash(requireSetting('BACKEND_URL', process.env.BACKEND_URL));
  return `${backendUrl}${path}`;
};

const toFormBody = payload => {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => body.append(key, String(value ?? '')));
  return body;
};

/**
 * ZaloPay Payment Service
 * Protocol reference: https://docs.zalopay.vn/docs/specs/order-create/
 */
const zalopayService = {
  API_BASE_URL: stripTrailingSlash(process.env.ZALOPAY_API_URL || 'https://sb-openapi.zalopay.vn'),
  APP_ID: process.env.ZALOPAY_APP_ID,
  KEY1: process.env.ZALOPAY_KEY1,
  KEY2: process.env.ZALOPAY_KEY2,

  createPaymentUrl: async paymentData => {
    const { amount, returnUrl, description, orderId, userId } = paymentData;
    const appId = requireSetting('ZALOPAY_APP_ID', zalopayService.APP_ID);
    const appTransId = `${getVietnamDatePrefix()}_${orderId}`;
    const appTime = Date.now();
    const vndAmount = toVndAmount(amount);
    const item = '[]';
    const embedData = JSON.stringify({ redirecturl: returnUrl, orderId: String(orderId) });
    const payload = {
      app_id: appId,
      app_user: String(userId),
      app_trans_id: appTransId,
      app_time: appTime,
      amount: vndAmount,
      item,
      embed_data: embedData,
      description: description || `Thanh toan don hang ${orderId}`,
      bank_code: '',
      callback_url: buildCallbackUrl(
        process.env.ZALOPAY_CALLBACK_URL,
        '/api/v1/payment/webhooks/zalopay/callback'
      )
    };
    const macInput = [
      payload.app_id,
      payload.app_trans_id,
      payload.app_user,
      payload.amount,
      payload.app_time,
      payload.embed_data,
      payload.item
    ].join('|');
    payload.mac = hmacSha256(requireSetting('ZALOPAY_KEY1', zalopayService.KEY1), macInput);

    try {
      const response = await axios.post(
        `${zalopayService.API_BASE_URL}/v2/create`,
        toFormBody(payload),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (Number(response.data.return_code) !== 1 || !response.data.order_url) {
        throw new Error(`ZaloPay rejected the request: ${response.data.return_message || 'unknown error'}`);
      }

      logger.info(`ZaloPay payment URL created: ${appTransId}`);
      return {
        success: true,
        paymentUrl: response.data.order_url,
        appTransId,
        amount: vndAmount
      };
    } catch (error) {
      logger.error('ZaloPay createPaymentUrl error:', error.message);
      throw error;
    }
  },

  verifyWebhook: webhookData => {
    try {
      const { data, mac } = webhookData || {};
      if (typeof data !== 'string' || typeof mac !== 'string') {
        return { valid: false, reason: 'Missing callback data or signature' };
      }

      const computedMac = hmacSha256(
        requireSetting('ZALOPAY_KEY2', zalopayService.KEY2),
        data
      );
      if (!timingSafeEqualHex(computedMac, mac)) {
        logger.warn('ZaloPay webhook signature verification failed');
        return { valid: false, reason: 'Invalid signature' };
      }

      const paymentData = JSON.parse(data);
      const appTransId = String(paymentData.app_trans_id || '');
      let embedData = {};
      try {
        embedData = JSON.parse(paymentData.embed_data || '{}');
      } catch (_error) {
        embedData = {};
      }
      const separatorIndex = appTransId.indexOf('_');
      const orderId = embedData.orderId
        || (separatorIndex >= 0 ? appTransId.slice(separatorIndex + 1) : '');

      return {
        valid: Boolean(appTransId && orderId),
        appTransId,
        orderId: String(orderId),
        userId: paymentData.app_user,
        amount: toVndAmount(paymentData.amount),
        transactionId: paymentData.zp_trans_id
      };
    } catch (error) {
      logger.error('ZaloPay webhook verification error:', error.message);
      return { valid: false, reason: 'Invalid callback payload' };
    }
  },

  queryPaymentStatus: async appTransId => {
    const appId = requireSetting('ZALOPAY_APP_ID', zalopayService.APP_ID);
    const macInput = `${appId}|${appTransId}|${requireSetting('ZALOPAY_KEY1', zalopayService.KEY1)}`;
    const payload = {
      app_id: appId,
      app_trans_id: appTransId,
      mac: hmacSha256(zalopayService.KEY1, macInput)
    };

    try {
      const response = await axios.post(
        `${zalopayService.API_BASE_URL}/v2/query`,
        toFormBody(payload),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return response.data;
    } catch (error) {
      logger.error('ZaloPay query status error:', error.message);
      throw error;
    }
  }
};

const MOMO_CALLBACK_FIELDS = [
  'accessKey',
  'amount',
  'extraData',
  'message',
  'orderId',
  'orderInfo',
  'orderType',
  'partnerCode',
  'payType',
  'requestId',
  'responseTime',
  'resultCode',
  'transId'
];

/**
 * MoMo Payment Service
 * Protocol reference: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/
 */
const momoService = {
  API_BASE_URL: stripTrailingSlash(process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api'),
  PARTNER_CODE: process.env.MOMO_PARTNER_CODE,
  ACCESS_KEY: process.env.MOMO_ACCESS_KEY,
  SECRET_KEY: process.env.MOMO_SECRET_KEY,

  createPaymentUrl: async paymentData => {
    const { amount, orderId, returnUrl, description } = paymentData;
    const partnerCode = requireSetting('MOMO_PARTNER_CODE', momoService.PARTNER_CODE);
    const accessKey = requireSetting('MOMO_ACCESS_KEY', momoService.ACCESS_KEY);
    const secretKey = requireSetting('MOMO_SECRET_KEY', momoService.SECRET_KEY);
    const vndAmount = toVndAmount(amount);
    const normalizedOrderId = String(orderId);
    const requestId = `shopvn-${normalizedOrderId}`;
    const requestType = 'captureWallet';
    const orderInfo = description || `Thanh toan don hang ${normalizedOrderId}`;
    const redirectUrl = requireSetting('MoMo redirect URL', returnUrl);
    const ipnUrl = buildCallbackUrl(
      process.env.MOMO_IPN_URL,
      '/api/v1/payment/webhooks/momo/callback'
    );
    const extraData = '';
    const signatureString = [
      `accessKey=${accessKey}`,
      `amount=${vndAmount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${normalizedOrderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`
    ].join('&');
    const signature = hmacSha256(secretKey, signatureString);

    try {
      const response = await axios.post(`${momoService.API_BASE_URL}/create`, {
        partnerCode,
        partnerName: 'ShopVN',
        requestId,
        amount: vndAmount,
        orderId: normalizedOrderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        requestType,
        autoCapture: true,
        lang: 'vi',
        extraData,
        signature
      });

      if (Number(response.data.resultCode) !== 0 || !response.data.payUrl) {
        throw new Error(`MoMo rejected the request: ${response.data.message || 'unknown error'}`);
      }

      logger.info(`MoMo payment URL created: ${requestId}`);
      return {
        success: true,
        paymentUrl: response.data.payUrl,
        requestId,
        amount: vndAmount
      };
    } catch (error) {
      logger.error('MoMo createPaymentUrl error:', error.message);
      throw error;
    }
  },

  verifyWebhook: webhookData => {
    try {
      const payload = webhookData || {};
      const partnerCode = requireSetting('MOMO_PARTNER_CODE', momoService.PARTNER_CODE);
      if (String(payload.partnerCode || '') !== String(partnerCode)) {
        return { valid: false, reason: 'Invalid partner code' };
      }

      const signatureString = MOMO_CALLBACK_FIELDS
        .map(field => `${field}=${field === 'accessKey' ? momoService.ACCESS_KEY : payload[field] ?? ''}`)
        .join('&');
      const computedSignature = hmacSha256(
        requireSetting('MOMO_SECRET_KEY', momoService.SECRET_KEY),
        signatureString
      );

      if (!timingSafeEqualHex(computedSignature, payload.signature)) {
        logger.warn('MoMo webhook signature verification failed');
        return { valid: false, reason: 'Invalid signature' };
      }

      return {
        valid: true,
        orderId: String(payload.orderId),
        transId: payload.transId,
        amount: toVndAmount(payload.amount),
        resultCode: Number(payload.resultCode),
        success: Number(payload.resultCode) === 0
      };
    } catch (error) {
      logger.error('MoMo webhook verification error:', error.message);
      return { valid: false, reason: 'Invalid callback payload' };
    }
  },

  queryTransaction: async (orderId, requestId = `shopvn-${orderId}`) => {
    const partnerCode = requireSetting('MOMO_PARTNER_CODE', momoService.PARTNER_CODE);
    const accessKey = requireSetting('MOMO_ACCESS_KEY', momoService.ACCESS_KEY);
    const signatureString = [
      `accessKey=${accessKey}`,
      `orderId=${orderId}`,
      `partnerCode=${partnerCode}`,
      `requestId=${requestId}`
    ].join('&');
    const signature = hmacSha256(
      requireSetting('MOMO_SECRET_KEY', momoService.SECRET_KEY),
      signatureString
    );

    try {
      const response = await axios.post(`${momoService.API_BASE_URL}/query`, {
        partnerCode,
        requestId,
        orderId: String(orderId),
        signature,
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
  momoService,
  paymentServiceInternals: {
    getVietnamDatePrefix,
    hmacSha256,
    timingSafeEqualHex,
    toVndAmount
  }
};

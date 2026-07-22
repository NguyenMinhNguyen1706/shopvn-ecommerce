const crypto = require('crypto');

jest.mock('axios');
const axios = require('axios');

process.env.BACKEND_URL = 'https://api.shopvn.test';
process.env.FRONTEND_URL = 'https://shopvn.test';
process.env.ZALOPAY_APP_ID = '2554';
process.env.ZALOPAY_KEY1 = 'zalopay-key-1';
process.env.ZALOPAY_KEY2 = 'zalopay-key-2';
process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER';
process.env.MOMO_ACCESS_KEY = 'momo-access';
process.env.MOMO_SECRET_KEY = 'momo-secret';
process.env.PAYOS_CLIENT_ID = 'payos-client';
process.env.PAYOS_API_KEY = 'payos-api-key';
process.env.PAYOS_CHECKSUM_KEY = 'payos-checksum';

const { zalopayService, momoService } = require('../../src/services/payment.service');
const {
  payosService,
  payosServiceInternals
} = require('../../src/services/payos.service');

const hmac = (key, value) => crypto
  .createHmac('sha256', key)
  .update(String(value), 'utf8')
  .digest('hex');

describe('ZaloPay service contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a v2 form request using VND and the documented MAC input', async () => {
    axios.post.mockResolvedValue({
      data: { return_code: 1, order_url: 'https://zalopay.test/pay/42' }
    });

    const result = await zalopayService.createPaymentUrl({
      amount: 150000,
      returnUrl: 'https://shopvn.test/orders.html',
      description: 'Thanh toan don 42',
      orderId: 42,
      userId: 7
    });

    const [url, form] = axios.post.mock.calls[0];
    const payload = Object.fromEntries(form.entries());
    const macInput = [
      payload.app_id,
      payload.app_trans_id,
      payload.app_user,
      payload.amount,
      payload.app_time,
      payload.embed_data,
      payload.item
    ].join('|');

    expect(url).toBe('https://sb-openapi.zalopay.vn/v2/create');
    expect(payload.app_trans_id).toMatch(/^\d{6}_42$/);
    expect(payload.amount).toBe('150000');
    expect(payload.app_time).toMatch(/^\d{13}$/);
    expect(payload.callback_url).toBe(
      'https://api.shopvn.test/api/v1/payment/webhooks/zalopay/callback'
    );
    expect(payload.mac).toBe(hmac(process.env.ZALOPAY_KEY1, macInput));
    expect(result.amount).toBe(150000);
  });

  test('verifies the raw callback signature and keeps the amount in VND', () => {
    const data = JSON.stringify({
      app_trans_id: '260722_42',
      app_user: '7',
      amount: 150000,
      embed_data: JSON.stringify({ orderId: '42' }),
      zp_trans_id: 991122
    });
    const signature = hmac(process.env.ZALOPAY_KEY2, data);

    expect(zalopayService.verifyWebhook({ data, mac: signature })).toEqual(
      expect.objectContaining({
        valid: true,
        orderId: '42',
        amount: 150000,
        transactionId: 991122
      })
    );
    expect(zalopayService.verifyWebhook({ data: `${data} `, mac: signature }).valid).toBe(false);
  });
});

describe('MoMo service contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a v2 captureWallet request with the documented signature fields', async () => {
    axios.post.mockResolvedValue({
      data: { resultCode: 0, payUrl: 'https://momo.test/pay/42' }
    });

    await momoService.createPaymentUrl({
      amount: 150000,
      orderId: 42,
      returnUrl: 'https://shopvn.test/orders.html',
      description: 'Thanh toan don 42'
    });

    const [url, payload] = axios.post.mock.calls[0];
    const signatureInput = [
      `accessKey=${process.env.MOMO_ACCESS_KEY}`,
      'amount=150000',
      'extraData=',
      'ipnUrl=https://api.shopvn.test/api/v1/payment/webhooks/momo/callback',
      'orderId=42',
      'orderInfo=Thanh toan don 42',
      `partnerCode=${process.env.MOMO_PARTNER_CODE}`,
      'redirectUrl=https://shopvn.test/orders.html',
      'requestId=shopvn-42',
      'requestType=captureWallet'
    ].join('&');

    expect(url).toBe('https://test-payment.momo.vn/v2/gateway/api/create');
    expect(payload.ipnUrl).toContain('/api/v1/payment/webhooks/momo/callback');
    expect(payload.signature).toBe(hmac(process.env.MOMO_SECRET_KEY, signatureInput));
    expect(payload).not.toHaveProperty('notifyUrl');
  });

  test('verifies all documented notification fields', () => {
    const payload = {
      amount: 150000,
      extraData: '',
      message: 'Successful.',
      orderId: '42',
      orderInfo: 'Thanh toan don 42',
      orderType: 'momo_wallet',
      partnerCode: process.env.MOMO_PARTNER_CODE,
      payType: 'qr',
      requestId: 'shopvn-42',
      responseTime: 1784700000000,
      resultCode: 0,
      transId: 123456
    };
    const signatureInput = [
      `accessKey=${process.env.MOMO_ACCESS_KEY}`,
      `amount=${payload.amount}`,
      'extraData=',
      `message=${payload.message}`,
      `orderId=${payload.orderId}`,
      `orderInfo=${payload.orderInfo}`,
      `orderType=${payload.orderType}`,
      `partnerCode=${payload.partnerCode}`,
      `payType=${payload.payType}`,
      `requestId=${payload.requestId}`,
      `responseTime=${payload.responseTime}`,
      `resultCode=${payload.resultCode}`,
      `transId=${payload.transId}`
    ].join('&');
    payload.signature = hmac(process.env.MOMO_SECRET_KEY, signatureInput);

    expect(momoService.verifyWebhook(payload)).toEqual(
      expect.objectContaining({ valid: true, success: true, orderId: '42', amount: 150000 })
    );
    expect(momoService.verifyWebhook({ ...payload, amount: 150001 }).valid).toBe(false);
  });
});

describe('PayOS service contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sorts webhook data deterministically, including nested values', () => {
    expect(payosServiceInternals.buildCanonicalData({
      z: 'last',
      items: [{ z: 2, a: 1 }],
      empty: null,
      a: { b: 2, a: 1 }
    })).toBe('a={"a":1,"b":2}&empty=&items=[{"a":1,"z":2}]&z=last');
  });

  test('signs create-payment-link data and verifies webhook tampering', async () => {
    axios.post.mockResolvedValue({
      data: {
        code: '00',
        data: {
          paymentLinkId: 'pay-42',
          qrCode: 'qr-data',
          checkoutUrl: 'https://pay.payos.vn/web/pay-42'
        }
      }
    });

    await payosService.createPaymentRequest({
      orderId: 42,
      amount: 150000,
      description: 'DH42'
    });

    const [url, payload] = axios.post.mock.calls[0];
    const signatureData = {
      amount: payload.amount,
      cancelUrl: payload.cancelUrl,
      description: payload.description,
      orderCode: payload.orderCode,
      returnUrl: payload.returnUrl
    };
    expect(url).toBe('https://api-merchant.payos.vn/v2/payment-requests');
    expect(payload.signature).toBe(
      payosServiceInternals.signData(signatureData, process.env.PAYOS_CHECKSUM_KEY)
    );

    const data = { orderCode: 42, amount: 150000, code: '00', reference: 'TX42' };
    const signature = payosServiceInternals.signData(data, process.env.PAYOS_CHECKSUM_KEY);
    expect(payosService.verifyWebhookSignature({ data, signature }).valid).toBe(true);
    expect(payosService.verifyWebhookSignature({
      data: { ...data, amount: 150001 },
      signature
    }).valid).toBe(false);
  });
});

/**
 * Helper: tạo VNPay response params hợp lệ để dùng trong test
 * Tách ra file riêng để tái sử dụng giữa các test case
 */
const crypto = require('crypto');
const qs     = require('qs');

const TEST_SECRET = 'TEST_HASH_SECRET_FOR_JEST';

/**
 * Tạo chữ ký HMAC-SHA512 — copy logic từ vnpay.service.js
 * để test độc lập, không import service
 */
function signParams(params, secret = TEST_SECRET) {
  const sortedKeys = Object.keys(params).sort();
  const signData   = sortedKeys
    .filter(k => params[k] !== '' && params[k] != null)
    .map(k => `${k}=${params[k]}`)
    .join('&');

  return crypto
    .createHmac('sha512', secret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
}

/**
 * Tạo params Return URL mô phỏng VNPay gửi về
 */
function makeReturnParams({
  orderId      = 1,
  amount       = 15990000,
  responseCode = '00',
  bankCode     = 'NCB',
  secret       = TEST_SECRET,
} = {}) {
  const txnRef = `${orderId}-1700000000000`;
  const params = {
    vnp_Amount:      amount * 100,
    vnp_BankCode:    bankCode,
    vnp_BankTranNo:  'VNP123456',
    vnp_CardType:    'ATM',
    vnp_OrderInfo:   `Thanh toan don hang #${orderId}`,
    vnp_PayDate:     '20241215120000',
    vnp_ResponseCode: responseCode,
    vnp_TmnCode:     'TEST_TMN',
    vnp_TransactionNo: '12345678',
    vnp_TransactionStatus: responseCode,
    vnp_TxnRef:      txnRef,
  };

  params.vnp_SecureHash = signParams(params, secret);
  return params;
}

/**
 * Tạo params IPN mô phỏng VNPay gọi server
 */
function makeIpnParams({
  orderId      = 1,
  amount       = 15990000,
  responseCode = '00',
  secret       = TEST_SECRET,
} = {}) {
  return makeReturnParams({ orderId, amount, responseCode, secret });
}

module.exports = { signParams, makeReturnParams, makeIpnParams, TEST_SECRET };

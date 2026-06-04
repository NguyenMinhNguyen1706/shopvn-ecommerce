const crypto  = require('crypto');
const qs      = require('qs');
const vnpConfig = require('../config/vnpay');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format ngày giờ theo chuẩn VNPay: YYYYMMDDHHmmss
 */
function formatDate(date) {
  const pad = n => String(n).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

/**
 * Lấy IP thật của client (qua proxy/nginx)
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

/**
 * Tạo chữ ký HMAC-SHA512
 * VNPay yêu cầu sort params theo alphabet trước khi ký
 */
function createSignature(params, secretKey) {
  // Sort theo key alphabet
  const sortedKeys = Object.keys(params).sort();
  const signData   = sortedKeys
    .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .map(key => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
}

/**
 * Verify chữ ký từ VNPay response
 */
function verifySignature(params, secretKey) {
  const { vnp_SecureHash, ...rest } = params;

  // Xóa các key không tham gia ký
  delete rest.vnp_SecureHashType;

  const expectedHash = createSignature(rest, secretKey);
  return expectedHash === vnp_SecureHash;
}

// ── Tạo URL thanh toán ────────────────────────────────────────────────────────

function createPaymentUrl(req, { orderId, amount, orderInfo, bankCode }) {
  const now       = new Date();
  // Thêm 15 phút — thời gian user hoàn thành thanh toán
  const expireDate = new Date(now.getTime() + 15 * 60 * 1000);

  // VNPay yêu cầu amount * 100 (đơn vị: đồng → VNPay nhân thêm 100)
  const vnpAmount = amount * 100;

  const params = {
    vnp_Version:     vnpConfig.version,
    vnp_Command:     vnpConfig.command,
    vnp_TmnCode:     vnpConfig.tmnCode,
    vnp_Amount:      vnpAmount,
    vnp_CurrCode:    vnpConfig.currCode,
    vnp_TxnRef:      `${orderId}-${Date.now()}`, // unique per transaction
    vnp_OrderInfo:   orderInfo || `Thanh toan don hang #${orderId}`,
    vnp_OrderType:   'other',
    vnp_Locale:      vnpConfig.locale,
    vnp_ReturnUrl:   vnpConfig.returnUrl,
    vnp_IpAddr:      getClientIp(req),
    vnp_CreateDate:  formatDate(now),
    vnp_ExpireDate:  formatDate(expireDate),
  };

  // Thêm bankCode nếu user chọn ngân hàng cụ thể
  if (bankCode) params.vnp_BankCode = bankCode;

  // Tạo chữ ký
  params.vnp_SecureHash = createSignature(params, vnpConfig.hashSecret);

  // Build URL
  const paymentUrl = `${vnpConfig.url}?${qs.stringify(params)}`;
  return paymentUrl;
}

// ── Xử lý Return URL (user được redirect về) ─────────────────────────────────

function processReturn(queryParams) {
  const isValid = verifySignature(queryParams, vnpConfig.hashSecret);

  if (!isValid) {
    return { success: false, message: 'Chữ ký không hợp lệ.' };
  }

  const responseCode = queryParams.vnp_ResponseCode;
  const txnRef       = queryParams.vnp_TxnRef;
  const amount       = parseInt(queryParams.vnp_Amount) / 100;
  const orderId      = txnRef.split('-')[0]; // lấy orderId từ txnRef

  if (responseCode === '00') {
    return {
      success:    true,
      orderId:    parseInt(orderId),
      amount,
      txnRef,
      bankCode:   queryParams.vnp_BankCode,
      bankTranNo: queryParams.vnp_BankTranNo,
      cardType:   queryParams.vnp_CardType,
      payDate:    queryParams.vnp_PayDate,
      message:    'Thanh toán thành công.',
    };
  }

  // Map mã lỗi VNPay → message tiếng Việt
  const errorMessages = {
    '07': 'Trừ tiền thành công nhưng giao dịch bị nghi ngờ gian lận.',
    '09': 'Thẻ/tài khoản chưa đăng ký dịch vụ InternetBanking.',
    '10': 'Xác thực thông tin thẻ/tài khoản quá 3 lần.',
    '11': 'Đã hết hạn chờ thanh toán.',
    '12': 'Thẻ/tài khoản bị khóa.',
    '13': 'Sai mật khẩu OTP.',
    '24': 'Khách hàng hủy giao dịch.',
    '51': 'Tài khoản không đủ số dư.',
    '65': 'Tài khoản vượt hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng đang bảo trì.',
    '79': 'Sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Lỗi không xác định.',
  };

  return {
    success:  false,
    orderId:  parseInt(orderId),
    code:     responseCode,
    message:  errorMessages[responseCode] || 'Thanh toán thất bại.',
  };
}

// ── Xử lý IPN (VNPay gọi server-to-server) ───────────────────────────────────

function processIpn(queryParams) {
  const isValid = verifySignature(queryParams, vnpConfig.hashSecret);

  if (!isValid) {
    // VNPay yêu cầu trả về JSON cụ thể này khi chữ ký sai
    return {
      valid:    false,
      response: { RspCode: '97', Message: 'Invalid signature' },
    };
  }

  const responseCode = queryParams.vnp_ResponseCode;
  const txnRef       = queryParams.vnp_TxnRef;
  const orderId      = parseInt(txnRef.split('-')[0]);
  const amount       = parseInt(queryParams.vnp_Amount) / 100;
  const success      = responseCode === '00';

  return {
    valid:   true,
    success,
    orderId,
    amount,
    txnRef,
    // Response trả về VNPay để confirm đã nhận IPN
    response: { RspCode: '00', Message: 'Confirm Success' },
  };
}

module.exports = {
  createPaymentUrl,
  processReturn,
  processIpn,
};

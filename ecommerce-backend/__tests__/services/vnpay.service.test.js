/**
 * Unit Tests — vnpay.service.js
 *
 * Nguyên tắc test ở đây:
 * 1. Mỗi test chỉ test 1 hành vi cụ thể
 * 2. Không gọi API thật, không cần kết nối mạng
 * 3. Mock env variables để kiểm soát input
 */

const { signParams, makeReturnParams, makeIpnParams, TEST_SECRET }
  = require('../helpers/vnpay.helper');

// ── Mock env trước khi require service ───────────────────────────────────────
// Jest hoists jest.mock() lên đầu file — nhưng với env thì set trực tiếp
process.env.VNPAY_TMN_CODE    = 'TEST_TMN';
process.env.VNPAY_HASH_SECRET = TEST_SECRET;
process.env.VNPAY_URL         = 'https://pay.vnpay.vn/vpcpay.html';
process.env.VNPAY_RETURN_URL  = 'http://localhost:3000/api/payment/vnpay/return';
process.env.VNPAY_IPN_URL     = 'http://localhost:3000/api/payment/vnpay/ipn';

const vnpayService = require('../../src/services/vnpay.service');

// ── Mock request object ───────────────────────────────────────────────────────
const mockReq = {
  headers:    {},
  connection: { remoteAddress: '127.0.0.1' },
  socket:     { remoteAddress: '127.0.0.1' },
};

// ════════════════════════════════════════════════════════════════════════════
// 1. createPaymentUrl
// ════════════════════════════════════════════════════════════════════════════

describe('createPaymentUrl', () => {

  test('trả về URL bắt đầu bằng VNPAY_URL', () => {
    const url = vnpayService.createPaymentUrl(mockReq, {
      orderId:   1,
      amount:    15990000,
      orderInfo: 'Test order',
    });

    expect(url).toMatch(/^https:\/\/pay\.vnpay\.vn\/vpcpay\.html/);
  });

  test('URL chứa đủ params bắt buộc', () => {
    const url = vnpayService.createPaymentUrl(mockReq, {
      orderId: 1,
      amount:  15990000,
    });

    expect(url).toContain('vnp_Version=2.1.0');
    expect(url).toContain('vnp_Command=pay');
    expect(url).toContain('vnp_TmnCode=TEST_TMN');
    expect(url).toContain('vnp_CurrCode=VND');
    expect(url).toContain('vnp_Locale=vn');
    expect(url).toContain('vnp_SecureHash=');
  });

  test('amount được nhân 100 đúng cách', () => {
    const amount = 15990000;
    const url    = vnpayService.createPaymentUrl(mockReq, { orderId: 1, amount });

    // URL encode nên search bằng cách parse
    const urlObj    = new URL(url);
    const vnpAmount = urlObj.searchParams.get('vnp_Amount');
    expect(Number(vnpAmount)).toBe(amount * 100);
  });

  test('vnp_TxnRef chứa orderId', () => {
    const orderId = 42;
    const url     = vnpayService.createPaymentUrl(mockReq, { orderId, amount: 500000 });

    const urlObj = new URL(url);
    const txnRef = urlObj.searchParams.get('vnp_TxnRef');
    expect(txnRef).toMatch(new RegExp(`^${orderId}-`));
  });

  test('URL có vnp_SecureHash hợp lệ (có thể verify lại)', () => {
    const url    = vnpayService.createPaymentUrl(mockReq, { orderId: 1, amount: 100000 });
    const urlObj = new URL(url);

    // Lấy tất cả params trừ SecureHash
    const params = {};
    urlObj.searchParams.forEach((v, k) => { params[k] = v; });
    const { vnp_SecureHash, ...rest } = params;

    // Tính lại chữ ký
    const expectedHash = signParams(rest, TEST_SECRET);
    expect(vnp_SecureHash).toBe(expectedHash);
  });

  test('thêm vnp_BankCode nếu được truyền vào', () => {
    const url = vnpayService.createPaymentUrl(mockReq, {
      orderId:  1,
      amount:   100000,
      bankCode: 'NCB',
    });

    expect(url).toContain('vnp_BankCode=NCB');
  });

  test('không có vnp_BankCode nếu không truyền', () => {
    const url = vnpayService.createPaymentUrl(mockReq, {
      orderId: 1,
      amount:  100000,
    });

    const urlObj = new URL(url);
    expect(urlObj.searchParams.has('vnp_BankCode')).toBe(false);
  });

  test('vnp_ExpireDate sau vnp_CreateDate đúng 15 phút', () => {
    const url    = vnpayService.createPaymentUrl(mockReq, { orderId: 1, amount: 100000 });
    const urlObj = new URL(url);

    const createDate = urlObj.searchParams.get('vnp_CreateDate');
    const expireDate = urlObj.searchParams.get('vnp_ExpireDate');

    // Parse format YYYYMMDDHHmmss
    const parseDate = str => new Date(
      `${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}T` +
      `${str.slice(8,10)}:${str.slice(10,12)}:${str.slice(12,14)}`
    );

    const diff = parseDate(expireDate) - parseDate(createDate);
    expect(diff).toBe(15 * 60 * 1000); // đúng 15 phút
  });

});

// ════════════════════════════════════════════════════════════════════════════
// 2. processReturn
// ════════════════════════════════════════════════════════════════════════════

describe('processReturn', () => {

  // ── Happy path ──────────────────────────────────────────────────────────

  test('chữ ký đúng + ResponseCode 00 → success = true', () => {
    const params = makeReturnParams({ orderId: 1, amount: 15990000 });
    const result = vnpayService.processReturn(params);

    expect(result.success).toBe(true);
    expect(result.orderId).toBe(1);
    expect(result.amount).toBe(15990000);
    expect(result.message).toContain('thành công');
  });

  test('trả về đúng orderId từ txnRef', () => {
    const params = makeReturnParams({ orderId: 99 });
    const result = vnpayService.processReturn(params);

    expect(result.orderId).toBe(99);
  });

  test('trả về amount đã chia 100', () => {
    const params = makeReturnParams({ amount: 890000 });
    const result = vnpayService.processReturn(params);

    expect(result.amount).toBe(890000); // không phải 89000000
  });

  test('trả về bankCode và txnRef', () => {
    const params = makeReturnParams({ bankCode: 'VCB' });
    const result = vnpayService.processReturn(params);

    expect(result.bankCode).toBe('VCB');
    expect(result.txnRef).toBeDefined();
  });

  // ── Error codes ──────────────────────────────────────────────────────────

  const errorCodes = [
    { code: '07', keyword: 'nghi ngờ' },
    { code: '09', keyword: 'chưa đăng ký' },
    { code: '10', keyword: 'quá 3 lần' },
    { code: '13', keyword: 'otp' },
    { code: '79', keyword: 'quá số lần' },
    { code: '24', keyword: 'hủy' },
    { code: '51', keyword: 'số dư' },
    { code: '11', keyword: 'hết hạn' },
    { code: '12', keyword: 'khóa' },
    { code: '65', keyword: 'hạn mức' },
    { code: '75', keyword: 'bảo trì' },
    { code: '99', keyword: 'xác định' },
  ];

  errorCodes.forEach(({ code, keyword }) => {
    test(`ResponseCode ${code} → success = false, message chứa "${keyword}"`, () => {
      const params = makeReturnParams({ responseCode: code });
      const result = vnpayService.processReturn(params);

      expect(result.success).toBe(false);
      expect(result.message.toLowerCase()).toContain(keyword);
    });
  });

  test('ResponseCode không có trong map → message mặc định "thất bại"', () => {
    const params = makeReturnParams({ responseCode: '88' }); // code lạ
    const result = vnpayService.processReturn(params);

    expect(result.success).toBe(false);
    expect(result.message).toBeTruthy();
  });

  // ── Chữ ký ──────────────────────────────────────────────────────────────

  test('chữ ký sai → success = false, không xử lý tiếp', () => {
    const params = makeReturnParams({ responseCode: '00' });
    // Tamper chữ ký
    params.vnp_SecureHash = params.vnp_SecureHash.replace('a', 'b');

    const result = vnpayService.processReturn(params);
    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain('chữ ký');
  });

  test('chữ ký sai dù ResponseCode = 00 → vẫn reject', () => {
    const params = {
      ...makeReturnParams({ responseCode: '00' }),
      vnp_SecureHash: 'totally_fake_hash',
    };

    const result = vnpayService.processReturn(params);
    expect(result.success).toBe(false);
  });

  test('thiếu vnp_SecureHash → reject', () => {
    const params = makeReturnParams();
    delete params.vnp_SecureHash;

    const result = vnpayService.processReturn(params);
    expect(result.success).toBe(false);
  });

  test('params bị tamper sau khi ký → chữ ký không khớp', () => {
    const params = makeReturnParams({ amount: 15990000, responseCode: '00' });
    // Hacker cố tình đổi amount sau khi có chữ ký
    params.vnp_Amount = '100'; // thay đổi amount

    const result = vnpayService.processReturn(params);
    expect(result.success).toBe(false);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// 3. processIpn
// ════════════════════════════════════════════════════════════════════════════

describe('processIpn', () => {

  // ── Happy path ──────────────────────────────────────────────────────────

  test('chữ ký đúng + ResponseCode 00 → valid + success', () => {
    const params = makeIpnParams({ orderId: 5, amount: 3290000 });
    const result = vnpayService.processIpn(params);

    expect(result.valid).toBe(true);
    expect(result.success).toBe(true);
    expect(result.orderId).toBe(5);
    expect(result.amount).toBe(3290000);
  });

  test('response trả về VNPay phải là { RspCode: "00" } khi thành công', () => {
    const params = makeIpnParams();
    const result = vnpayService.processIpn(params);

    expect(result.response).toEqual({ RspCode: '00', Message: 'Confirm Success' });
  });

  test('chữ ký đúng + ResponseCode != 00 → valid nhưng success = false', () => {
    const params = makeIpnParams({ responseCode: '24' });
    const result = vnpayService.processIpn(params);

    expect(result.valid).toBe(true);
    expect(result.success).toBe(false);
  });

  test('trả về đúng amount sau khi chia 100', () => {
    const params = makeIpnParams({ amount: 6490000 });
    const result = vnpayService.processIpn(params);

    expect(result.amount).toBe(6490000);
  });

  // ── Chữ ký sai ───────────────────────────────────────────────────────────

  test('chữ ký sai → valid = false, response RspCode = 97', () => {
    const params = makeIpnParams();
    params.vnp_SecureHash = 'invalid_hash';

    const result = vnpayService.processIpn(params);

    expect(result.valid).toBe(false);
    expect(result.response.RspCode).toBe('97');
  });

  test('chữ ký sai → không trả về orderId hay amount', () => {
    const params = makeIpnParams();
    params.vnp_SecureHash = 'fake';

    const result = vnpayService.processIpn(params);

    expect(result.orderId).toBeUndefined();
    expect(result.amount).toBeUndefined();
  });

  test('params bị tamper → chữ ký không khớp → RspCode 97', () => {
    const params = makeIpnParams({ amount: 15990000 });
    params.vnp_Amount = '100'; // tamper

    const result = vnpayService.processIpn(params);
    expect(result.response.RspCode).toBe('97');
  });

  // ── Consistency ───────────────────────────────────────────────────────────

  test('IPN và Return xử lý cùng 1 transaction → kết quả nhất quán', () => {
    const params  = makeReturnParams({ orderId: 7, amount: 890000 });
    const ipnResult    = vnpayService.processIpn(params);
    const returnResult = vnpayService.processReturn(params);

    // Cả 2 phải đồng ý về trạng thái thành công
    expect(ipnResult.success).toBe(returnResult.success);
    expect(ipnResult.orderId).toBe(returnResult.orderId);
    expect(ipnResult.amount).toBe(returnResult.amount);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// 4. Edge cases
// ════════════════════════════════════════════════════════════════════════════

describe('Edge cases', () => {

  test('amount = 0 → URL vẫn tạo được (validation là tầng controller)', () => {
    const url = vnpayService.createPaymentUrl(mockReq, { orderId: 1, amount: 0 });
    const urlObj = new URL(url);

    expect(urlObj.searchParams.get('vnp_Amount')).toBe('0');
  });

  test('orderId rất lớn → txnRef vẫn chứa đúng orderId', () => {
    const orderId = 999999;
    const url     = vnpayService.createPaymentUrl(mockReq, { orderId, amount: 100000 });
    const urlObj  = new URL(url);
    const txnRef  = urlObj.searchParams.get('vnp_TxnRef');

    expect(txnRef.startsWith(`${orderId}-`)).toBe(true);
  });

  test('orderInfo có ký tự đặc biệt → URL encode đúng', () => {
    const url = vnpayService.createPaymentUrl(mockReq, {
      orderId:   1,
      amount:    100000,
      orderInfo: 'Thanh toán đơn hàng #1 — ShopVN',
    });

    expect(url).toBeTruthy(); // không throw
    expect(url).toContain('vnp_OrderInfo=');
  });

  test('2 lần tạo URL cùng orderId → vnp_TxnRef khác nhau (timestamp)', async () => {
    const opts = { orderId: 1, amount: 100000 };

    const url1 = vnpayService.createPaymentUrl(mockReq, opts);
    // Delay nhỏ để timestamp khác
    await new Promise(r => setTimeout(r, 5));
    const url2 = vnpayService.createPaymentUrl(mockReq, opts);

    const txnRef1 = new URL(url1).searchParams.get('vnp_TxnRef');
    const txnRef2 = new URL(url2).searchParams.get('vnp_TxnRef');

    expect(txnRef1).not.toBe(txnRef2);
  });

});

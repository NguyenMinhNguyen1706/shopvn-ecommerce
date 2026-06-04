module.exports = {
  tmnCode:    process.env.VNPAY_TMN_CODE,
  hashSecret: process.env.VNPAY_HASH_SECRET,
  url:        process.env.VNPAY_URL,
  returnUrl:  process.env.VNPAY_RETURN_URL,
  ipnUrl:     process.env.VNPAY_IPN_URL,
  version:    '2.1.0',
  command:    'pay',
  currCode:   'VND',
  locale:     'vn',
};

const REQUIRED_AUTH_SECRETS = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

const OPTIONAL_SECRETS = [
  'REDIS_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'GHN_TOKEN',
  'GHN_SHOP_ID',
  'VNPAY_TMN_CODE',
  'VNPAY_HASH_SECRET',
  'ZALOPAY_APP_ID',
  'ZALOPAY_KEY1',
  'ZALOPAY_KEY2',
  'MOMO_PARTNER_CODE',
  'MOMO_ACCESS_KEY',
  'MOMO_SECRET_KEY',
  'PAYOS_CLIENT_ID',
  'PAYOS_API_KEY',
  'PAYOS_CHECKSUM_KEY',
  'GEMINI_API_KEY',
  'SMTP_HOST',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM'
];

function validateSecrets() {
  const missing = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production';

  if (!process.env.DATABASE_URL) {
    const databaseVariables = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missingDatabaseVariables = databaseVariables.filter(name => !process.env[name]);
    if (missingDatabaseVariables.length) {
      missing.push(
        `DATABASE_URL hoặc đầy đủ các biến: ${missingDatabaseVariables.join(', ')}`
      );
    }
  }

  const missingAuthVariables = REQUIRED_AUTH_SECRETS.filter(name => !process.env[name]);
  if (missingAuthVariables.length) {
    missing.push(`AUTH thiếu: ${missingAuthVariables.join(', ')}`);
  }

  if (isProduction && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    missing.push('JWT_SECRET phải có ít nhất 32 ký tự trong production');
  }
  if (isProduction && process.env.JWT_REFRESH_SECRET
    && process.env.JWT_REFRESH_SECRET.length < 32) {
    missing.push('JWT_REFRESH_SECRET phải có ít nhất 32 ký tự trong production');
  }
  if (process.env.JWT_SECRET
    && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    missing.push('JWT_SECRET và JWT_REFRESH_SECRET phải khác nhau');
  }

  if (isProduction && !process.env.WEBHOOK_SHARED_SECRET) {
    missing.push('WEBHOOK_SHARED_SECRET cho webhook marketplace');
  }
  if (isProduction && process.env.WEBHOOK_SHARED_SECRET?.length < 32) {
    missing.push('WEBHOOK_SHARED_SECRET phải có ít nhất 32 ký tự trong production');
  }
  if (isProduction && !process.env.FRONTEND_URL) {
    missing.push('FRONTEND_URL');
  }

  OPTIONAL_SECRETS.forEach(name => {
    if (!process.env[name]) warnings.push(name);
  });

  if (missing.length) {
    const errorMessage = `Thiếu cấu hình bắt buộc:\n- ${missing.join('\n- ')}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (isProduction && warnings.length) {
    console.warn(
      `Các tích hợp tùy chọn chưa được cấu hình và sẽ không hoạt động:\n- ${warnings.join('\n- ')}`
    );
  }
}

function getSecret(name, defaultValue = undefined) {
  return process.env[name] === undefined ? defaultValue : process.env[name];
}

module.exports = {
  validateSecrets,
  getSecret
};

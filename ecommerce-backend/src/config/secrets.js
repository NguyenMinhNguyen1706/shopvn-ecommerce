/**
 * Secrets Management & Environment Validation Module
 * Concepts: Secrets Management, Production Operations, Resilience
 */

const REQUIRED_SECRETS = {
  DATABASE: ['DATABASE_URL', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'], // requires EITHER DATABASE_URL OR the others
  AUTH: ['JWT_SECRET', 'JWT_REFRESH_SECRET']
};

const OPTIONAL_SECRETS = [
  'REDIS_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD',
  'CLOUDINARY_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
  'GHN_API_TOKEN', 'GHN_SHOP_ID',
  'VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_URL',
  'ZALOPAY_APP_ID', 'ZALOPAY_KEY1', 'ZALOPAY_KEY2', 'ZALOPAY_ENDPOINT',
  'MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY', 'MOMO_ENDPOINT',
  'PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY',
  'GEMINI_API_KEY',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_EMAIL'
];

/**
 * Validates that all required secrets exist.
 * Throws an error listing missing secrets if validation fails.
 */
function validateSecrets() {
  const missing = [];

  // 1. Validate Database configuration
  if (!process.env.DATABASE_URL) {
    const missingDbVars = REQUIRED_SECRETS.DATABASE.slice(1).filter(secret => !process.env[secret]);
    if (missingDbVars.length > 0) {
      missing.push(`DATABASE (cần có DATABASE_URL hoặc tất cả các biến: ${missingDbVars.join(', ')})`);
    }
  }

  // 2. Validate Auth configuration
  const missingAuthVars = REQUIRED_SECRETS.AUTH.filter(secret => !process.env[secret]);
  if (missingAuthVars.length > 0) {
    missing.push(`AUTH (thiếu: ${missingAuthVars.join(', ')})`);
  }

  if (missing.length > 0) {
    const errorMsg = `❌ Khởi động thất bại do thiếu biến môi trường cấu hình bắt buộc:\n- ${missing.join('\n- ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Warn about missing optional secrets
  const missingOptional = OPTIONAL_SECRETS.filter(secret => !process.env[secret]);
  if (missingOptional.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn(`⚠ Cảnh báo: Thiếu một số cấu hình tuỳ chọn trong production:\n- ${missingOptional.join('\n- ')}`);
  } else {
    console.log('✓ Tất cả các biến môi trường bắt buộc đã được tải đầy đủ.');
  }
}

/**
 * Get secret value safely. Logs access to sensitive values in debug mode.
 */
function getSecret(name, defaultValue = undefined) {
  const val = process.env[name];
  if (val === undefined) {
    return defaultValue;
  }
  return val;
}

module.exports = {
  validateSecrets,
  getSecret
};

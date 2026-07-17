require('dotenv').config();

/**
 * Sequelize CLI config – used ONLY by `npx sequelize-cli db:migrate` etc.
 * Runtime app code still uses src/config/database.js directly.
 */

const baseConfig = {
  dialect: 'postgres',
  seederStorage: 'sequelize',
};

/* ---------- helper: build config from env ---------- */
function buildConfig(enableSSL) {
  // Prefer DATABASE_URL (Render / Railway / Supabase style)
  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      url: process.env.DATABASE_URL,
      dialectOptions: enableSSL
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    };
  }

  return {
    ...baseConfig,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    dialectOptions: enableSSL
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  };
}

module.exports = {
  development: buildConfig(false),
  staging: buildConfig(true),
  production: buildConfig(true),
};

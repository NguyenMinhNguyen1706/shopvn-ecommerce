const { Sequelize } = require('sequelize');

let sequelize;

const commonOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development'
    ? (msg) => console.log(`\x1b[36m[SQL]\x1b[0m ${msg}`)
    : false,
  pool: {
    max:     5,   // tối đa 5 connection đồng thời
    min:     0,
    acquire: 30000,
    idle:    10000,
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
      ? {
          require: true,
          rejectUnauthorized: false
        }
      : false
  }
};

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, commonOptions);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    String(process.env.DB_PASSWORD),
    {
      host:    process.env.DB_HOST,
      port:    process.env.DB_PORT,
      ...commonOptions
    }
  );
}

module.exports = sequelize;

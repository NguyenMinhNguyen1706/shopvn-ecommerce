require('dotenv').config();

const fs = require('fs');
const path = require('path');
const sequelize = require('../src/config/database');

require('../src/models/User');
require('../src/models/Product');
require('../src/models/CartItem');
require('../src/models/Order');
require('../src/models/OrderItem');
require('../src/models/Review');
require('../src/models/MasterInventory');
require('../src/models/InventoryTransaction');
require('../src/models/LoyaltyPoints');
require('../src/models/ActionPlan');

const BACKUP_SCHEMA_VERSION = 1;
const MODEL_ORDER = [
  'User',
  'Product',
  'CartItem',
  'Order',
  'OrderItem',
  'Review',
  'LoyaltyPoints',
  'MasterInventory',
  'InventoryTransaction',
  'ActionPlan'
];

function createBackupPath() {
  const timestamp = new Date().toISOString()
    .replace('T', '_')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
  return path.join(__dirname, '../backups', `backup_${timestamp}.json`);
}

function removeActiveSessions(modelName, rows) {
  if (modelName !== 'User') return rows;
  return rows.map(row => ({ ...row, refreshToken: null }));
}

async function backup() {
  const backupFilePath = createBackupPath();
  const backupDir = path.dirname(backupFilePath);

  console.log('ShopVN database backup');
  console.warn('Lưu ý: file backup chứa dữ liệu cá nhân và password hash. Không commit hoặc chia sẻ file này.');

  try {
    await sequelize.authenticate();

    const models = {};
    for (const modelName of MODEL_ORDER) {
      const model = sequelize.models[modelName];
      if (!model) {
        throw new Error(`Model chưa được đăng ký: ${modelName}`);
      }

      const rows = await model.findAll({ raw: true });
      models[modelName] = removeActiveSessions(modelName, rows);
      console.log(`${modelName}: ${rows.length} bản ghi`);
    }

    const payload = {
      metadata: {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        application: 'ShopVN',
        containsSensitiveData: true,
        refreshTokensRemoved: true
      },
      models
    };

    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(backupFilePath, JSON.stringify(payload, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx'
    });

    console.log(`Sao lưu hoàn tất: ${backupFilePath}`);
  } catch (error) {
    console.error(`Sao lưu thất bại: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

backup();

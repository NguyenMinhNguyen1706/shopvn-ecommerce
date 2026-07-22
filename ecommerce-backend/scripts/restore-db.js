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
const DELETE_ORDER = [
  'InventoryTransaction',
  'MasterInventory',
  'LoyaltyPoints',
  'Review',
  'OrderItem',
  'Order',
  'CartItem',
  'ActionPlan',
  'Product',
  'User'
];
const INSERT_ORDER = [
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

function validateBackup(payload) {
  if (!payload || payload.metadata?.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(`File backup phải dùng schemaVersion ${BACKUP_SCHEMA_VERSION}.`);
  }
  if (!payload.models || typeof payload.models !== 'object') {
    throw new Error('File backup không có trường models hợp lệ.');
  }
}

async function restore() {
  const backupFileArg = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  const confirmed = process.argv.includes('--confirm') || process.env.RESTORE_CONFIRM === 'true';
  const productionAllowed = process.env.RESTORE_ALLOW_PRODUCTION === 'true';

  if (!backupFileArg) {
    console.error('Thiếu đường dẫn file backup.');
    console.error('Cách dùng: npm run db:restore -- backups/backup_YYYY-MM-DD_HH-mm-ss.json --confirm');
    process.exitCode = 1;
    return;
  }
  if (!confirmed) {
    console.error('Restore sẽ xóa dữ liệu hiện tại. Chạy lại với --confirm sau khi đã kiểm tra file backup.');
    process.exitCode = 1;
    return;
  }
  if (process.env.NODE_ENV === 'production' && !productionAllowed) {
    console.error('Restore production bị khóa. Chỉ mở khi có runbook và RESTORE_ALLOW_PRODUCTION=true.');
    process.exitCode = 1;
    return;
  }

  const filePath = path.resolve(backupFileArg);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    console.error(`Không tìm thấy file backup: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  try {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    validateBackup(payload);
    await sequelize.authenticate();

    await sequelize.transaction(async transaction => {
      for (const modelName of DELETE_ORDER) {
        const model = sequelize.models[modelName];
        if (!model) throw new Error(`Model chưa được đăng ký: ${modelName}`);
        await model.destroy({ where: {}, transaction, cascade: true });
      }

      for (const modelName of INSERT_ORDER) {
        const model = sequelize.models[modelName];
        const rows = payload.models[modelName];
        if (!Array.isArray(rows)) {
          throw new Error(`Dữ liệu model không hợp lệ: ${modelName}`);
        }
        if (rows.length) {
          await model.bulkCreate(rows, {
            transaction,
            validate: true,
            ignoreDuplicates: false
          });
        }
      }
    });

    console.log(`Khôi phục hoàn tất từ: ${filePath}`);
  } catch (error) {
    console.error(`Khôi phục thất bại: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

restore();

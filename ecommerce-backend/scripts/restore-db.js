const fs = require('fs');
const path = require('path');
const sequelize = require('../src/config/database');

// Import all models to ensure they are registered in sequelize
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const CartItem = require('../src/models/CartItem');
const Order = require('../src/models/Order');
const OrderItem = require('../src/models/OrderItem');
const Review = require('../src/models/Review');
const MasterInventory = require('../src/models/MasterInventory');
const InventoryTransaction = require('../src/models/InventoryTransaction');
const LoyaltyPoints = require('../src/models/LoyaltyPoints');

async function restore() {
  console.log('\n=========================================');
  console.log('📦 SHOPVN - BẮT ĐẦU KHÔI PHỤC CƠ SỞ DỮ LIỆU');
  console.log('=========================================\n');

  const backupFileArg = process.argv[2];
  if (!backupFileArg) {
    console.error('❌ LỖI: Thiếu đường dẫn tới file backup JSON.');
    console.log('\nHướng dẫn sử dụng:');
    console.log('   npm run db:restore <đường_dẫn_file_backup>');
    console.log('Ví dụ:');
    console.log('   npm run db:restore backups/backup_2026-06-15_09-57-21.json\n');
    return;
  }

  const filePath = path.resolve(backupFileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ LỖI: Không tìm thấy file backup tại đường dẫn: ${filePath}\n`);
    return;
  }

  try {
    // Kiểm tra kết nối
    await sequelize.authenticate();
    console.log('✅ Kết nối cơ sở dữ liệu thành công.');
    
    // Đọc file backup
    const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const models = sequelize.models;

    // Thứ tự xóa dữ liệu (từ bảng con có nhiều FK đến bảng cha để tránh vi phạm khóa ngoại)
    const orderOfDelete = [
      'InventoryTransaction', 
      'MasterInventory', 
      'LoyaltyPoints', 
      'Review', 
      'OrderItem', 
      'Order', 
      'CartItem', 
      'Product', 
      'User'
    ];

    // Thứ tự thêm dữ liệu (từ bảng cha ít FK đến bảng con để đảm bảo ràng buộc)
    const orderOfInsert = [
      'User', 
      'Product', 
      'CartItem', 
      'Order', 
      'OrderItem', 
      'Review', 
      'LoyaltyPoints', 
      'MasterInventory', 
      'InventoryTransaction'
    ];

    const t = await sequelize.transaction();
    
    try {
      console.log('\n🧹 Bước 1: Xóa dữ liệu cũ trong database...');
      for (const modelName of orderOfDelete) {
        if (models[modelName]) {
          console.log(`   - Đang làm sạch bảng: ${models[modelName].tableName}...`);
          // Xóa tất cả các bản ghi
          await models[modelName].destroy({ 
            where: {}, 
            transaction: t, 
            cascade: true 
          });
        }
      }

      console.log('\n📥 Bước 2: Khôi phục dữ liệu từ file backup...');
      for (const modelName of orderOfInsert) {
        const rows = backupData[modelName];
        if (models[modelName] && rows) {
          if (rows.length > 0) {
            console.log(`   + Đang nạp ${rows.length} bản ghi vào bảng: ${models[modelName].tableName}...`);
            // Chèn dữ liệu hàng loạt
            await models[modelName].bulkCreate(rows, { 
              transaction: t, 
              validate: true,
              ignoreDuplicates: false
            });
          } else {
            console.log(`   + Bảng [${modelName}] trống trong file backup.`);
          }
        }
      }

      await t.commit();
      
      console.log('\n=========================================');
      console.log('🎉 QUÁ TRÌNH KHÔI PHỤC HOÀN TẤT THÀNH CÔNG!');
      console.log(`📄 Dữ liệu được khôi phục từ: ${filePath}`);
      console.log('=========================================\n');

    } catch (err) {
      await t.rollback();
      throw err;
    }

  } catch (error) {
    console.error('\n❌ QUÁ TRÌNH KHÔI PHỤC THẤT BẠI:');
    console.error(error.message);
    console.log('\n💡 LƯU Ý:');
    console.log('Nếu xảy ra lỗi ràng buộc khóa ngoại, hãy kiểm tra tính toàn vẹn của dữ liệu trong file backup.\n');
  } finally {
    await sequelize.close();
  }
}

restore();

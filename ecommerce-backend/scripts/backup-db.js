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

async function backup() {
  console.log('\n=========================================');
  console.log('📦 SHOPVN - BẮT ĐẦU SAO LƯU CƠ SỞ DỮ LIỆU');
  console.log('=========================================\n');
  
  try {
    // Kiểm tra kết nối
    await sequelize.authenticate();
    console.log('✅ Kết nối cơ sở dữ liệu thành công.');
    console.log('⏳ Đang đọc cấu trúc bảng và trích xuất dữ liệu...\n');
    
    const backupData = {};
    const models = sequelize.models;
    
    // Các bảng cần sao lưu theo thứ tự logic
    const modelKeys = Object.keys(models);
    
    for (const modelName of modelKeys) {
      const model = models[modelName];
      console.log(`🔹 Bảng [${modelName}] (tên vật lý: ${model.tableName}):`);
      
      const rows = await model.findAll({ raw: true });
      backupData[modelName] = rows;
      console.log(`   ✓ Trích xuất thành công: ${rows.length} bản ghi.`);
    }

    // Tạo thư mục backups nếu chưa có
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Lưu vào file JSON với định dạng thời gian
    const timestamp = new Date().toISOString()
      .replace(/T/, '_')
      .replace(/\..+/, '')
      .replace(/[:]/g, '-');
      
    const backupFileName = `backup_${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);
    
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
    
    console.log('\n=========================================');
    console.log('🎉 QUÁ TRÌNH SAO LƯU HOÀN TẤT THÀNH CÔNG!');
    console.log(`📁 Thư mục lưu trữ: ${backupDir}`);
    console.log(`📄 Tên file: ${backupFileName}`);
    console.log('=========================================\n');
    
  } catch (error) {
    console.error('\n❌ QUÁ TRÌNH SAO LƯU THẤT BẠI:');
    console.error(error.message);
    console.log('\n💡 HƯỚNG DẪN KHẮC PHỤC:');
    console.log('1. Hãy chắc chắn rằng máy chủ PostgreSQL đang hoạt động.');
    console.log('2. Nếu bạn sử dụng Docker, chạy lệnh sau để khởi động container DB:');
    console.log('   docker compose up -d db');
    console.log('3. Hãy kiểm tra lại cấu hình DB trong file `.env` (DB_HOST, DB_USER, DB_PASSWORD, v.v.).\n');
  } finally {
    await sequelize.close();
  }
}

backup();

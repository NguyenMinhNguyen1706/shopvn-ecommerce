const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const MasterInventory = sequelize.define('MasterInventory', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  productId: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key:   'id'
    }
  },
  warehouseId: {
    type:         DataTypes.STRING(50),
    allowNull:    false,
    defaultValue: 'MAIN_WH',
  },
  availableStock: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    comment:      'Sẵn sàng để bán (đã trừ đi lượng giữ chỗ)'
  },
  reservedStock: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    comment:      'Đã khách bỏ vào giỏ và ấn Checkout nhưng chưa thanh toán'
  },
  lockedStock: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    comment:      'Khoá do lý do khác (đang trả hàng, hư hỏng...)'
  }
}, {
  tableName:  'master_inventories',
  timestamps: true,
});

const Product = require('./Product');
MasterInventory.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(MasterInventory, { foreignKey: 'productId' });

module.exports = MasterInventory;


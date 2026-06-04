const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const InventoryTransaction = sequelize.define('InventoryTransaction', {
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
  type: {
    type:      DataTypes.ENUM('IN', 'OUT', 'RESERVE', 'RELEASE_RESERVE', 'LOCK', 'UNLOCK'),
    allowNull: false,
  },
  quantity: {
    type:      DataTypes.INTEGER,
    allowNull: false,
  },
  referenceId: {
    type:      DataTypes.STRING(100),
    allowNull: true,
    comment:   'Order ID hoặc Webhook ID làm chứng từ'
  },
  channel: {
    type:         DataTypes.STRING(50),
    defaultValue: 'WEBSITE',
    comment:      'Nguồn gốc: WEBSITE, SHOPEE, TIKTOK, LAZADA'
  },
  note: {
    type:      DataTypes.STRING(255),
    allowNull: true,
  }
}, {
  tableName:  'inventory_transactions',
  timestamps: true,
  updatedAt:  false, // Audit log thường chỉ cần createdAt
});

const Product = require('./Product');
InventoryTransaction.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(InventoryTransaction, { foreignKey: 'productId' });

module.exports = InventoryTransaction;


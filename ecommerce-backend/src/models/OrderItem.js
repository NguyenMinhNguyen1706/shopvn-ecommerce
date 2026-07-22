const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');
const Order         = require('./Order');
const Product       = require('./Product');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  orderId: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'orders', key: 'id' },
  },
  productId: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'products', key: 'id' },
  },
  // Snapshot thông tin sản phẩm tại thời điểm đặt
  // → tránh bị ảnh hưởng khi admin sửa giá sau
  productName: {
    type:      DataTypes.STRING(200),
    allowNull: false,
  },
  productIcon: {
    type:         DataTypes.STRING(10),
    defaultValue: '📦',
  },
  price: {
    type:      DataTypes.BIGINT,
    allowNull: false,
  },
  quantity: {
    type:      DataTypes.INTEGER,
    allowNull: false,
  },
  subtotal: {
    type:      DataTypes.BIGINT,
    allowNull: false,
  },
}, {
  tableName:  'order_items',
  timestamps: true,
});

Order.hasMany(OrderItem,    { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order,  { foreignKey: 'orderId' });
OrderItem.belongsTo(Product,{ foreignKey: 'productId', as: 'product' });

module.exports = OrderItem;

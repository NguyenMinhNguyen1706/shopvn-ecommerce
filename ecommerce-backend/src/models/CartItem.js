const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');
const User          = require('./User');
const Product       = require('./Product');

const CartItem = sequelize.define('CartItem', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  userId: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  productId: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'products', key: 'id' },
  },
  quantity: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 1,
    validate:     { min: 1 },
  },
}, {
  tableName:  'cart_items',
  timestamps: true,
});

// ── Associations ──────────────────────────────────────────────────────────────
CartItem.belongsTo(User,    { foreignKey: 'userId' });
CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

module.exports = CartItem;

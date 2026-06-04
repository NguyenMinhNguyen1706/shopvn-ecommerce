const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  name: {
    type:      DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type:      DataTypes.BIGINT,        // lưu VNĐ dạng integer, tránh float
    allowNull: false,
  },
  oldPrice: {
    type:         DataTypes.BIGINT,
    allowNull:    true,
    defaultValue: null,
  },
  category: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  icon: {
    type:         DataTypes.STRING(10), // emoji icon
    allowNull:    true,
    defaultValue: '📦',
  },
  imageUrl: {
    type:      DataTypes.TEXT,
    allowNull: true,
    comment:   'URL ảnh sản phẩm trên Cloudinary',
  },
  stock: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
  },
  featured: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isNew: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName:  'products',
  timestamps: true,
});

module.exports = Product;

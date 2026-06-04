const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type:      DataTypes.STRING(150),
    allowNull: false,
    unique:    true,
    validate:  { isEmail: true },
  },
  phone: {
    type:      DataTypes.STRING(15),
    allowNull: true,
  },
  password: {
    type:      DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type:         DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  refreshToken: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName:  'users',
  timestamps: true,           // tự tạo createdAt, updatedAt
  // Không bao giờ trả password ra ngoài khi toJSON()
  defaultScope: {
    attributes: { exclude: ['password', 'refreshToken'] },
  },
  scopes: {
    withPassword: { attributes: {} }, // lấy toàn bộ khi cần
  },
});

module.exports = User;

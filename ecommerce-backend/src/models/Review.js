const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');
const User          = require('./User');
const Product       = require('./Product');

const Review = sequelize.define('Review', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  userId: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'users', key: 'id' },
  },
  productId: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'products', key: 'id' },
  },
  rating: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type:      DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName:  'reviews',
  timestamps: true,
});

Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Review, { foreignKey: 'userId' });

Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews' });

module.exports = Review;

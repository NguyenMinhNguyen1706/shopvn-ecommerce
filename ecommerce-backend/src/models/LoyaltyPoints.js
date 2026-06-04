const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const LoyaltyPoints = sequelize.define('LoyaltyPoints', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  userId: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key:   'id'
    }
  },
  points: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    comment:      'Điểm thưởng hiện có'
  },
  tier: {
    type:         DataTypes.ENUM('SILVER', 'GOLD', 'DIAMOND'),
    allowNull:    false,
    defaultValue: 'SILVER'
  },
  totalSpent: {
    type:         DataTypes.BIGINT,
    allowNull:    false,
    defaultValue: 0,
    comment:      'Tổng tiền đã chi tiêu (để xét hạng)'
  }
}, {
  tableName:  'loyalty_points',
  timestamps: true,
});

const User = require('./User');
LoyaltyPoints.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(LoyaltyPoints, { foreignKey: 'userId' });

module.exports = LoyaltyPoints;


const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActionPlan = sequelize.define('ActionPlan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  clientPlanId: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
  },
  generatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  filenameBase: {
    type: DataTypes.STRING(160),
    allowNull: false,
  },
  briefingId: {
    type: DataTypes.STRING(160),
    allowNull: true,
  },
  sourceSnapshotId: {
    type: DataTypes.STRING(160),
    allowNull: true,
  },
  totalTasks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  completedTasks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  p1Tasks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
}, {
  tableName: 'action_plans',
  timestamps: true,
});

module.exports = ActionPlan;

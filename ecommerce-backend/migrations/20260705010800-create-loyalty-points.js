'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loyalty_points', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Điểm thưởng hiện có',
      },
      tier: {
        type: Sequelize.ENUM('SILVER', 'GOLD', 'DIAMOND'),
        allowNull: false,
        defaultValue: 'SILVER',
      },
      totalSpent: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Tổng tiền đã chi tiêu (để xét hạng)',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // One loyalty record per user
    await queryInterface.addIndex('loyalty_points', ['userId'], {
      name: 'idx_loyalty_points_user_id',
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('loyalty_points');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_loyalty_points_tier";');
  },
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('action_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      clientPlanId: {
        type: Sequelize.STRING(120),
        allowNull: false,
        unique: true,
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      filenameBase: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      briefingId: {
        type: Sequelize.STRING(160),
        allowNull: true,
      },
      sourceSnapshotId: {
        type: Sequelize.STRING(160),
        allowNull: true,
      },
      totalTasks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      completedTasks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      p1Tasks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
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

    // Index for looking up plans by clientPlanId (unique already adds one, but explicit for clarity)
    await queryInterface.addIndex('action_plans', ['clientPlanId'], {
      name: 'idx_action_plans_client_plan_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('action_plans');
  },
};

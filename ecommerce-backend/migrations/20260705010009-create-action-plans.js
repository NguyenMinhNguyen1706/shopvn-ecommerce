module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('action_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      clientPlanId: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      filenameBase: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      briefingId: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      sourceSnapshotId: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      totalTasks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      completedTasks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      p1Tasks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('action_plans', ['clientPlanId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('action_plans');
  }
};

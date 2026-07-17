module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('loyalty_points', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      tier: {
        type: Sequelize.ENUM('SILVER', 'GOLD', 'DIAMOND'),
        defaultValue: 'SILVER'
      },
      totalSpent: {
        type: Sequelize.BIGINT,
        defaultValue: 0
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

    await queryInterface.addIndex('loyalty_points', ['userId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('loyalty_points');
  }
};

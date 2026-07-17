module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('IN', 'OUT', 'RESERVE', 'RELEASE_RESERVE', 'LOCK', 'UNLOCK'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      referenceId: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      channel: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      note: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('inventory_transactions', ['productId']);
    await queryInterface.addIndex('inventory_transactions', ['type']);
    await queryInterface.addIndex('inventory_transactions', ['referenceId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('inventory_transactions');
  }
};

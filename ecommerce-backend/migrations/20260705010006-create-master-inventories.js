module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_inventories', {
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
      warehouseId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'MAIN_WH'
      },
      availableStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      reservedStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lockedStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
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

    await queryInterface.addIndex('master_inventories', ['productId', 'warehouseId'], { unique: true });
    await queryInterface.addIndex('master_inventories', ['productId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('master_inventories');
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add version column for optimistic locking to key transactional tables
    await queryInterface.addColumn('products', 'version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('orders', 'version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('master_inventories', 'version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('products', 'version');
    await queryInterface.removeColumn('orders', 'version');
    await queryInterface.removeColumn('master_inventories', 'version');
  }
};

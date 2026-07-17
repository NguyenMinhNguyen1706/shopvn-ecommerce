module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      price: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      oldPrice: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      icon: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: '📦'
      },
      imageUrl: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      isNew: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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

    await queryInterface.addIndex('products', ['category']);
    await queryInterface.addIndex('products', ['featured']);
    await queryInterface.addIndex('products', ['isNew']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('products');
  }
};

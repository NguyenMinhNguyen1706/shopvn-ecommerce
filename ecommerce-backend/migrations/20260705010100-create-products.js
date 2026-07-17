'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      oldPrice: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      icon: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: '📦',
      },
      imageUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'URL ảnh sản phẩm trên Cloudinary',
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isNew: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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

    // Indexes for frequent queries
    await queryInterface.addIndex('products', ['category'], {
      name: 'idx_products_category',
    });
    await queryInterface.addIndex('products', ['featured'], {
      name: 'idx_products_featured',
    });
    await queryInterface.addIndex('products', ['isNew'], {
      name: 'idx_products_is_new',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('products');
  },
};

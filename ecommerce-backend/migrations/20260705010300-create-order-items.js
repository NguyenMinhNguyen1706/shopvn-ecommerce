'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: true, // null if product deleted later
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      productName: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      productIcon: {
        type: Sequelize.STRING(10),
        defaultValue: '📦',
      },
      price: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      subtotal: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      // Note: timestamps: false in model — no createdAt/updatedAt
    });

    // Indexes for order item lookups
    await queryInterface.addIndex('order_items', ['orderId'], {
      name: 'idx_order_items_order_id',
    });
    await queryInterface.addIndex('order_items', ['productId'], {
      name: 'idx_order_items_product_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('order_items');
  },
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('inventory_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('IN', 'OUT', 'RESERVE', 'RELEASE_RESERVE', 'LOCK', 'UNLOCK'),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      referenceId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Order ID hoặc Webhook ID làm chứng từ',
      },
      channel: {
        type: Sequelize.STRING(50),
        defaultValue: 'WEBSITE',
        comment: 'Nguồn gốc: WEBSITE, SHOPEE, TIKTOK, LAZADA',
      },
      note: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      // updatedAt: false in model — only createdAt
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Indexes for audit log queries
    await queryInterface.addIndex('inventory_transactions', ['productId'], {
      name: 'idx_inventory_transactions_product_id',
    });
    await queryInterface.addIndex('inventory_transactions', ['type'], {
      name: 'idx_inventory_transactions_type',
    });
    await queryInterface.addIndex('inventory_transactions', ['referenceId'], {
      name: 'idx_inventory_transactions_reference_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('inventory_transactions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_inventory_transactions_type";');
  },
};

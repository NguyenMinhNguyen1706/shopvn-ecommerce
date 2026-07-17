'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_inventories', {
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
      warehouseId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'MAIN_WH',
      },
      availableStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Sẵn sàng để bán (đã trừ đi lượng giữ chỗ)',
      },
      reservedStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Đã khách bỏ vào giỏ và ấn Checkout nhưng chưa thanh toán',
      },
      lockedStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Khoá do lý do khác (đang trả hàng, hư hỏng...)',
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

    // Composite unique: one inventory row per product+warehouse
    await queryInterface.addIndex('master_inventories', ['productId', 'warehouseId'], {
      name: 'idx_master_inventories_product_warehouse',
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_inventories');
  },
};

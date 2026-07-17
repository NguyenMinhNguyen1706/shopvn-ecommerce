'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      shippingName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      shippingPhone: {
        type: Sequelize.STRING(15),
        allowNull: false,
      },
      shippingAddress: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      subtotal: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      shippingFee: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 30000,
      },
      discount: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
      },
      total: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'shipping', 'delivered', 'cancelled'),
        defaultValue: 'pending',
      },
      paymentMethod: {
        type: Sequelize.STRING(50),
        defaultValue: 'cod',
      },
      paymentStatus: {
        type: Sequelize.ENUM('unpaid', 'paid', 'refunded'),
        defaultValue: 'unpaid',
      },
      vnpayTxnRef: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Mã giao dịch VNPay',
      },
      vnpayBankCode: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Ngân hàng thanh toán',
      },
      voucherCode: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // Indexes for order queries
    await queryInterface.addIndex('orders', ['userId'], {
      name: 'idx_orders_user_id',
    });
    await queryInterface.addIndex('orders', ['status'], {
      name: 'idx_orders_status',
    });
    await queryInterface.addIndex('orders', ['paymentStatus'], {
      name: 'idx_orders_payment_status',
    });
    await queryInterface.addIndex('orders', ['createdAt'], {
      name: 'idx_orders_created_at',
    });
    await queryInterface.addIndex('orders', ['vnpayTxnRef'], {
      name: 'idx_orders_vnpay_txn_ref',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orders');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_paymentStatus";');
  },
};

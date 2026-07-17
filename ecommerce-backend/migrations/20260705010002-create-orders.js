module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      shippingName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      shippingPhone: {
        type: Sequelize.STRING(15),
        allowNull: false
      },
      shippingAddress: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      subtotal: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      shippingFee: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 30000
      },
      discount: {
        type: Sequelize.BIGINT,
        defaultValue: 0
      },
      total: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'shipping', 'delivered', 'cancelled'),
        defaultValue: 'pending'
      },
      paymentMethod: {
        type: Sequelize.STRING(50),
        defaultValue: 'cod'
      },
      paymentStatus: {
        type: Sequelize.ENUM('unpaid', 'paid', 'refunded'),
        defaultValue: 'unpaid'
      },
      vnpayTxnRef: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      vnpayBankCode: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      voucherCode: {
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

    await queryInterface.addIndex('orders', ['userId']);
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('orders', ['paymentStatus']);
    await queryInterface.addIndex('orders', ['vnpayTxnRef']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('orders');
  }
};

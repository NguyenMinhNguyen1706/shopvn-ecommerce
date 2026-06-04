const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');
const User          = require('./User');

const Order = sequelize.define('Order', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  userId: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'users', key: 'id' },
  },
  // Thông tin giao hàng — snapshot tại thời điểm đặt
  shippingName: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  shippingPhone: {
    type:      DataTypes.STRING(15),
    allowNull: false,
  },
  shippingAddress: {
    type:      DataTypes.TEXT,
    allowNull: false,
  },
  // Tiền
  subtotal: {
    type:      DataTypes.BIGINT,
    allowNull: false,
  },
  shippingFee: {
    type:         DataTypes.BIGINT,
    allowNull:    false,
    defaultValue: 30000,
  },
  discount: {
    type:         DataTypes.BIGINT,
    defaultValue: 0,
  },
  total: {
    type:      DataTypes.BIGINT,
    allowNull: false,
  },
  // Trạng thái đơn hàng
  status: {
    type: DataTypes.ENUM(
      'pending',    // chờ xác nhận
      'processing', // đang xử lý
      'shipping',   // đang giao
      'delivered',  // đã giao
      'cancelled'   // đã hủy
    ),
    defaultValue: 'pending',
  },
  // Thanh toán
  paymentMethod: {
    type:         DataTypes.STRING(50),
    defaultValue: 'cod',
  },
  paymentStatus: {
    type:         DataTypes.ENUM('unpaid', 'paid', 'refunded'),
    defaultValue: 'unpaid',
  },
  vnpayTxnRef: {
    type:      DataTypes.STRING(100),
    allowNull: true,
    comment:   'Mã giao dịch VNPay',
  },
  vnpayBankCode: {
    type:      DataTypes.STRING(20),
    allowNull: true,
    comment:   'Ngân hàng thanh toán',
  },
  // Voucher
  voucherCode: {
    type:      DataTypes.STRING(50),
    allowNull: true,
  },
  note: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName:  'orders',
  timestamps: true,
});

Order.belongsTo(User, { foreignKey: 'userId' });

module.exports = Order;

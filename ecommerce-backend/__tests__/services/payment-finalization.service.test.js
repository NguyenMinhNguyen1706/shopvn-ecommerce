jest.mock('../../src/config/database', () => ({
  transaction: jest.fn()
}));
jest.mock('../../src/models/Order', () => ({
  findByPk: jest.fn()
}));
jest.mock('../../src/models/OrderItem', () => ({
  findAll: jest.fn()
}));
jest.mock('../../src/services/oms.service', () => ({
  commitReservedStock: jest.fn()
}));
jest.mock('../../src/services/loyalty.service', () => ({
  addPointsFromOrder: jest.fn()
}));

const sequelize = require('../../src/config/database');
const Order = require('../../src/models/Order');
const OrderItem = require('../../src/models/OrderItem');
const OMSService = require('../../src/services/oms.service');
const LoyaltyService = require('../../src/services/loyalty.service');
const {
  finalizePayment,
  PaymentFinalizationError
} = require('../../src/services/payment-finalization.service');

describe('payment finalization service', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(callback => callback(transaction));
  });

  test('locks and finalizes an order exactly once', async () => {
    const order = {
      id: 42,
      userId: 7,
      total: '150000',
      paymentStatus: 'pending',
      status: 'pending',
      update: jest.fn().mockResolvedValue(undefined)
    };
    Order.findByPk.mockResolvedValue(order);
    OrderItem.findAll.mockResolvedValue([
      { productId: 10, quantity: 2 },
      { productId: 11, quantity: 1 }
    ]);

    const result = await finalizePayment({
      orderId: 42,
      amount: 150000,
      paymentMethod: 'momo',
      transactionRef: 'TX-42'
    });

    expect(Order.findByPk).toHaveBeenCalledWith(42, {
      transaction,
      lock: 'UPDATE'
    });
    expect(order.update).toHaveBeenCalledWith({
      paymentStatus: 'paid',
      paymentMethod: 'momo',
      status: 'processing',
      vnpayTxnRef: 'TX-42'
    }, { transaction });
    expect(OMSService.commitReservedStock).toHaveBeenCalledWith(42, [
      { productId: 10, quantity: 2 },
      { productId: 11, quantity: 1 }
    ], transaction);
    expect(LoyaltyService.addPointsFromOrder).toHaveBeenCalledWith(7, 150000, transaction);
    expect(result.alreadyPaid).toBe(false);
  });

  test('treats a repeated provider callback as idempotent', async () => {
    Order.findByPk.mockResolvedValue({
      id: 42,
      total: 150000,
      paymentStatus: 'paid',
      status: 'processing'
    });

    const result = await finalizePayment({
      orderId: 42,
      amount: 150000,
      paymentMethod: 'payos',
      transactionRef: 'TX-42'
    });

    expect(result.alreadyPaid).toBe(true);
    expect(OrderItem.findAll).not.toHaveBeenCalled();
    expect(OMSService.commitReservedStock).not.toHaveBeenCalled();
    expect(LoyaltyService.addPointsFromOrder).not.toHaveBeenCalled();
  });

  test('rejects a signed callback when its amount differs from the order', async () => {
    Order.findByPk.mockResolvedValue({
      id: 42,
      total: 150000,
      paymentStatus: 'pending',
      status: 'pending'
    });

    await expect(finalizePayment({
      orderId: 42,
      amount: 149999,
      paymentMethod: 'zalopay',
      transactionRef: 'TX-42'
    })).rejects.toMatchObject({
      name: PaymentFinalizationError.name,
      code: 'AMOUNT_MISMATCH'
    });
    expect(OrderItem.findAll).not.toHaveBeenCalled();
  });

  test('does not revive a cancelled order', async () => {
    Order.findByPk.mockResolvedValue({
      id: 42,
      total: 150000,
      paymentStatus: 'pending',
      status: 'cancelled'
    });

    await expect(finalizePayment({
      orderId: 42,
      amount: 150000,
      paymentMethod: 'momo',
      transactionRef: 'TX-42'
    })).rejects.toMatchObject({ code: 'ORDER_CANCELLED' });
    expect(OrderItem.findAll).not.toHaveBeenCalled();
  });
});

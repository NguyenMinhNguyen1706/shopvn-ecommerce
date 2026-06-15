const { createOrder, cancelOrder } = require('../../src/services/order.service');
const Order = require('../../src/models/Order');
const OrderItem = require('../../src/models/OrderItem');
const Product = require('../../src/models/Product');
const CartItem = require('../../src/models/CartItem');
const OMSService = require('../../src/services/oms.service');
const sequelize = require('../../src/config/database');

jest.mock('../../src/models/Order', () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../../src/models/OrderItem', () => ({
  create: jest.fn(),
  findAll: jest.fn()
}));

jest.mock('../../src/models/Product', () => ({
  findOne: jest.fn(),
  decrement: jest.fn(),
  increment: jest.fn()
}));

jest.mock('../../src/models/CartItem', () => ({
  findAll: jest.fn(),
  destroy: jest.fn()
}));

jest.mock('../../src/services/oms.service', () => ({
  reserveStock: jest.fn(),
  releaseReservedStock: jest.fn()
}));

jest.mock('../../src/config/database', () => {
  const mockTxn = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: jest.fn(),
    rollback: jest.fn()
  };
  return {
    transaction: jest.fn(() => mockTxn),
    LOCK: { UPDATE: 'UPDATE' }
  };
});

describe('OrderService WMS Integration tests', () => {
  let mockTxn;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTxn = sequelize.transaction();
  });

  test('createOrder should reserve stock in WMS and commit transaction', async () => {
    const mockCartItems = [
      {
        productId: 101,
        quantity: 2,
        product: { id: 101, name: 'Sản phẩm Test', price: 100000, stock: 10 }
      }
    ];

    CartItem.findAll.mockResolvedValue(mockCartItems);
    Product.findOne.mockResolvedValue({ id: 101, stock: 10 });
    Order.create.mockResolvedValue({ id: 500, total: 200000 });
    OrderItem.create.mockResolvedValue({});
    Product.decrement.mockResolvedValue({});
    OMSService.reserveStock.mockResolvedValue(true);
    CartItem.destroy.mockResolvedValue({});
    Order.findByPk.mockResolvedValue({ id: 500, items: [] });

    const result = await createOrder(1, {
      shippingName: 'Nguyen Van A',
      shippingPhone: '0987654321',
      shippingAddress: 'Hanoi',
      paymentMethod: 'cod'
    });

    expect(result).toBeDefined();
    expect(CartItem.findAll).toHaveBeenCalledWith({
      where: { userId: 1 },
      include: expect.any(Array),
      transaction: mockTxn
    });
    expect(OMSService.reserveStock).toHaveBeenCalledWith(
      [{ productId: 101, quantity: 2 }],
      500,
      mockTxn
    );
    expect(CartItem.destroy).toHaveBeenCalledWith({
      where: { userId: 1 },
      transaction: mockTxn
    });
    expect(mockTxn.commit).toHaveBeenCalled();
    expect(mockTxn.rollback).not.toHaveBeenCalled();
  });

  test('cancelOrder should release reserved stock in WMS and commit transaction', async () => {
    const mockOrder = {
      id: 500,
      status: 'pending',
      update: jest.fn().mockResolvedValue(true)
    };

    Order.findOne.mockResolvedValue(mockOrder);
    OrderItem.findAll.mockResolvedValue([
      { productId: 101, quantity: 2 }
    ]);
    Product.increment.mockResolvedValue({});
    OMSService.releaseReservedStock.mockResolvedValue(true);

    const result = await cancelOrder(500, 1);

    expect(result).toBe(mockOrder);
    expect(OMSService.releaseReservedStock).toHaveBeenCalledWith(
      500,
      [{ productId: 101, quantity: 2 }],
      mockTxn
    );
    expect(mockOrder.update).toHaveBeenCalledWith(
      { status: 'cancelled' },
      { transaction: mockTxn }
    );
    expect(mockTxn.commit).toHaveBeenCalled();
    expect(mockTxn.rollback).not.toHaveBeenCalled();
  });
});

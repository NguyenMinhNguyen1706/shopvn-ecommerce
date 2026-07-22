jest.mock('../../src/config/database', () => ({
  transaction: jest.fn()
}));
jest.mock('../../src/models/CartItem', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
  bulkCreate: jest.fn()
}));
jest.mock('../../src/models/Product', () => ({
  findByPk: jest.fn(),
  findAll: jest.fn()
}));

const sequelize = require('../../src/config/database');
const CartItem = require('../../src/models/CartItem');
const Product = require('../../src/models/Product');
const cartService = require('../../src/services/cart.service');

describe('cart service', () => {
  const transaction = { id: 'cart-transaction' };

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(callback => callback(transaction));
  });

  test('adds to the existing row without creating a duplicate', async () => {
    const existing = { quantity: 1, update: jest.fn().mockResolvedValue(undefined) };
    Product.findByPk.mockResolvedValue({ id: 10, stock: 5 });
    CartItem.findOne.mockResolvedValue(existing);

    const result = await cartService.addItem(7, 10, 2);

    expect(existing.update).toHaveBeenCalledWith({ quantity: 3 });
    expect(CartItem.create).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });

  test('rejects a quantity that exceeds current stock', async () => {
    Product.findByPk.mockResolvedValue({ id: 10, stock: 2 });

    await expect(cartService.addItem(7, 10, 3)).rejects.toMatchObject({ status: 400 });
    expect(CartItem.findOne).not.toHaveBeenCalled();
  });

  test('rejects duplicate products during guest cart synchronization', async () => {
    await expect(cartService.syncCart(7, [
      { id: 10, quantity: 1 },
      { id: 10, quantity: 2 }
    ])).rejects.toMatchObject({ status: 400 });

    expect(Product.findAll).not.toHaveBeenCalled();
    expect(CartItem.destroy).not.toHaveBeenCalled();
  });

  test('does not erase the current cart when a product is missing', async () => {
    Product.findAll.mockResolvedValue([{ id: 10, name: 'Laptop', stock: 4 }]);

    await expect(cartService.syncCart(7, [
      { id: 10, quantity: 1 },
      { id: 11, quantity: 1 }
    ])).rejects.toMatchObject({ status: 400 });

    expect(CartItem.destroy).not.toHaveBeenCalled();
  });

  test('replaces the cart atomically after every item is validated', async () => {
    Product.findAll.mockResolvedValue([
      { id: 10, name: 'Laptop', stock: 4 },
      { id: 11, name: 'Mouse', stock: 10 }
    ]);

    await cartService.syncCart(7, [
      { id: 10, quantity: 2 },
      { id: 11, quantity: 3 }
    ]);

    expect(CartItem.destroy).toHaveBeenCalledWith({ where: { userId: 7 }, transaction });
    expect(CartItem.bulkCreate).toHaveBeenCalledWith([
      { userId: 7, productId: 10, quantity: 2 },
      { userId: 7, productId: 11, quantity: 3 }
    ], { transaction });
  });
});

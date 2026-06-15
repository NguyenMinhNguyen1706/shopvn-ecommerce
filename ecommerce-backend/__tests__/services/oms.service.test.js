const OMSService = require('../../src/services/oms.service');
const MasterInventory = require('../../src/models/MasterInventory');
const InventoryTransaction = require('../../src/models/InventoryTransaction');
const sequelize = require('../../src/config/database');

jest.mock('../../src/models/MasterInventory', () => {
  return {
    findOne: jest.fn()
  };
});

jest.mock('../../src/models/InventoryTransaction', () => {
  return {
    create: jest.fn()
  };
});

jest.mock('../../src/config/database', () => {
  return {
    transaction: jest.fn()
  };
});

describe('OMSService Transaction propagation tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reserveStock should use parent transaction if provided', async () => {
    const parentTxn = { commit: jest.fn(), rollback: jest.fn() };
    const mockInv = {
      availableStock: 10,
      reservedStock: 0,
      save: jest.fn()
    };

    MasterInventory.findOne.mockResolvedValue(mockInv);
    InventoryTransaction.create.mockResolvedValue({});

    const items = [{ productId: 1, quantity: 2 }];
    const result = await OMSService.reserveStock(items, 123, parentTxn);

    expect(result).toBe(true);
    expect(MasterInventory.findOne).toHaveBeenCalledWith({
      where: { productId: 1, warehouseId: 'MAIN_WH' },
      transaction: parentTxn
    });
    expect(mockInv.save).toHaveBeenCalledWith({ transaction: parentTxn });
    expect(InventoryTransaction.create).toHaveBeenCalledWith(
      expect.any(Object),
      { transaction: parentTxn }
    );
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(parentTxn.commit).not.toHaveBeenCalled();
    expect(parentTxn.rollback).not.toHaveBeenCalled();
  });

  test('reserveStock should create, commit, and close transaction if parent transaction is NOT provided', async () => {
    const mockTxn = { commit: jest.fn(), rollback: jest.fn() };
    sequelize.transaction.mockResolvedValue(mockTxn);

    const mockInv = {
      availableStock: 10,
      reservedStock: 0,
      save: jest.fn()
    };

    MasterInventory.findOne.mockResolvedValue(mockInv);
    InventoryTransaction.create.mockResolvedValue({});

    const items = [{ productId: 1, quantity: 2 }];
    const result = await OMSService.reserveStock(items, 123);

    expect(result).toBe(true);
    expect(sequelize.transaction).toHaveBeenCalled();
    expect(MasterInventory.findOne).toHaveBeenCalledWith({
      where: { productId: 1, warehouseId: 'MAIN_WH' },
      transaction: mockTxn
    });
    expect(mockTxn.commit).toHaveBeenCalled();
    expect(mockTxn.rollback).not.toHaveBeenCalled();
  });
});

const LoyaltyService = require('../../src/services/loyalty.service');
const LoyaltyPoints = require('../../src/models/LoyaltyPoints');
const sequelize = require('../../src/config/database');

jest.mock('../../src/models/LoyaltyPoints', () => {
  return {
    findOne: jest.fn(),
    create: jest.fn()
  };
});

jest.mock('../../src/config/database', () => {
  return {
    transaction: jest.fn()
  };
});

describe('LoyaltyService Transaction propagation tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('addPointsFromOrder should use parent transaction if provided', async () => {
    const parentTxn = { commit: jest.fn(), rollback: jest.fn() };
    const mockLp = {
      points: 10,
      totalSpent: 1000000,
      save: jest.fn()
    };

    LoyaltyPoints.findOne.mockResolvedValue(mockLp);

    const result = await LoyaltyService.addPointsFromOrder(1, 500000, parentTxn);

    expect(result).toBe(mockLp);
    expect(LoyaltyPoints.findOne).toHaveBeenCalledWith({
      where: { userId: 1 },
      transaction: parentTxn
    });
    expect(mockLp.save).toHaveBeenCalledWith({ transaction: parentTxn });
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(parentTxn.commit).not.toHaveBeenCalled();
    expect(parentTxn.rollback).not.toHaveBeenCalled();
  });

  test('addPointsFromOrder should create, commit, and close transaction if parent transaction is NOT provided', async () => {
    const mockTxn = { commit: jest.fn(), rollback: jest.fn() };
    sequelize.transaction.mockResolvedValue(mockTxn);

    const mockLp = {
      points: 10,
      totalSpent: 1000000,
      save: jest.fn()
    };

    LoyaltyPoints.findOne.mockResolvedValue(mockLp);

    const result = await LoyaltyService.addPointsFromOrder(1, 500000);

    expect(result).toBe(mockLp);
    expect(sequelize.transaction).toHaveBeenCalled();
    expect(LoyaltyPoints.findOne).toHaveBeenCalledWith({
      where: { userId: 1 },
      transaction: mockTxn
    });
    expect(mockTxn.commit).toHaveBeenCalled();
    expect(mockTxn.rollback).not.toHaveBeenCalled();
  });
});

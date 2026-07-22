const OrderItem = require('../../src/models/OrderItem');

describe('OrderItem model', () => {
  test('matches required foreign key and timestamp columns from the migration', () => {
    expect(OrderItem.rawAttributes.productId.allowNull).toBe(false);
    expect(OrderItem.options.timestamps).toBe(true);
    expect(OrderItem.rawAttributes.createdAt).toBeDefined();
    expect(OrderItem.rawAttributes.updatedAt).toBeDefined();
  });
});

afterAll(async () => OrderItem.sequelize.close());

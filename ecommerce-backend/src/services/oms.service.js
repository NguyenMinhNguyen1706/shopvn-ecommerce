const MasterInventory = require('../models/MasterInventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const sequelize = require('../config/database');

class OMSService {
  /**
   * Giữ kho tạm thời (khi khách checkout nhưng chưa thanh toán)
   */
  static async reserveStock(items, orderId) {
    const t = await sequelize.transaction();
    try {
      for (const item of items) {
        const inv = await MasterInventory.findOne({
          where: { productId: item.productId, warehouseId: 'MAIN_WH' },
          transaction: t
        });

        if (!inv || inv.availableStock < item.quantity) {
          throw new Error(`Sản phẩm ID ${item.productId} không đủ tồn kho`);
        }

        inv.availableStock -= item.quantity;
        inv.reservedStock += item.quantity;
        await inv.save({ transaction: t });

        await InventoryTransaction.create({
          productId: item.productId,
          type: 'RESERVE',
          quantity: item.quantity,
          referenceId: `ORDER_${orderId}`,
          note: 'Khách hàng đặt lệnh Checkout'
        }, { transaction: t });
      }
      await t.commit();
      return true;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Khách hàng đã thanh toán thành công -> trừ vĩnh viễn
   */
  static async commitReservedStock(orderId, items) {
    const t = await sequelize.transaction();
    try {
      for (const item of items) {
        const inv = await MasterInventory.findOne({
          where: { productId: item.productId, warehouseId: 'MAIN_WH' },
          transaction: t
        });

        if (inv) {
          inv.reservedStock -= item.quantity;
          // Có thể trừ âm nếu lỗi đồng bộ, nhưng đây là flow lí tưởng
          await inv.save({ transaction: t });

          await InventoryTransaction.create({
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            referenceId: `ORDER_${orderId}`,
            note: 'Đơn hàng thanh toán thành công'
          }, { transaction: t });
        }
      }
      await t.commit();
      return true;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Huỷ đơn -> trả lại kho
   */
  static async releaseReservedStock(orderId, items) {
    const t = await sequelize.transaction();
    try {
      for (const item of items) {
        const inv = await MasterInventory.findOne({
          where: { productId: item.productId, warehouseId: 'MAIN_WH' },
          transaction: t
        });

        if (inv) {
          inv.reservedStock -= item.quantity;
          inv.availableStock += item.quantity;
          await inv.save({ transaction: t });

          await InventoryTransaction.create({
            productId: item.productId,
            type: 'RELEASE_RESERVE',
            quantity: item.quantity,
            referenceId: `ORDER_${orderId}`,
            note: 'Huỷ đơn hàng chưa thanh toán'
          }, { transaction: t });
        }
      }
      await t.commit();
      return true;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = OMSService;

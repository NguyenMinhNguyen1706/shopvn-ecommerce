const MasterInventory = require('../models/MasterInventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const sequelize = require('../config/database');

class OMSService {
  /**
   * Giữ kho tạm thời (khi khách checkout nhưng chưa thanh toán)
   */
  static async reserveStock(items, orderId, parentTxn = null) {
    const t = parentTxn || await sequelize.transaction();
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
      if (!parentTxn) await t.commit();
      return true;
    } catch (error) {
      if (!parentTxn) await t.rollback();
      throw error;
    }
  }

  /**
   * Khách hàng đã thanh toán thành công -> trừ vĩnh viễn
   */
  static async commitReservedStock(orderId, items, parentTxn = null) {
    const t = parentTxn || await sequelize.transaction();
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
      if (!parentTxn) await t.commit();
      return true;
    } catch (error) {
      if (!parentTxn) await t.rollback();
      throw error;
    }
  }

  /**
   * Huỷ đơn -> trả lại kho
   */
  static async releaseReservedStock(orderId, items, parentTxn = null) {
    const t = parentTxn || await sequelize.transaction();
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
      if (!parentTxn) await t.commit();
      return true;
    } catch (error) {
      if (!parentTxn) await t.rollback();
      throw error;
    }
  }
}

module.exports = OMSService;

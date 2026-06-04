const MasterInventory = require('../models/MasterInventory');
const Product = require('../models/Product');
const sequelize = require('../config/database');

class InventoryService {
  /**
   * Đồng bộ từ MasterInventory ra bảng Product.stock
   * (Vì nhiều tính năng cũ trên web vẫn đang get .stock)
   */
  static async syncToWebsite(productId) {
    const t = await sequelize.transaction();
    try {
      const inv = await MasterInventory.findOne({ where: { productId, warehouseId: 'MAIN_WH' }, transaction: t });
      if (inv) {
        await Product.update(
          { stock: inv.availableStock },
          { where: { id: productId }, transaction: t }
        );
      }
      await t.commit();
      return true;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Mock: Gửi webhook/API sang Shopee/TikTok để đồng bộ số lượng
   */
  static async syncToExternalChannels(productId, availableStock) {
    console.log(`[Inventory Sync] Đang đồng bộ SP ${productId} tới Shopee (Tồn mới: ${availableStock})`);
    console.log(`[Inventory Sync] Đang đồng bộ SP ${productId} tới TikTok (Tồn mới: ${availableStock})`);
    // Ở môi trường thực tế, đây sẽ là call axios tới OpenAPI của Shopee/TikTok
    return true;
  }
}

module.exports = InventoryService;

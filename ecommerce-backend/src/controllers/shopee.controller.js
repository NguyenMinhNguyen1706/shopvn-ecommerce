const MasterInventory = require('../models/MasterInventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const InventoryService = require('../services/inventory.service');
const sequelize = require('../config/database');

const handleWebhook = async (req, res) => {
  try {
    const { eventType, data } = req.body;
    
    if (eventType === 'ORDER_CREATED') {
      const { orderId, items } = data; // { orderId: 'SHP123', items: [{ productId: 1, quantity: 2 }] }
      
      const t = await sequelize.transaction();
      try {
        for (const item of items) {
          const inv = await MasterInventory.findOne({ where: { productId: item.productId, warehouseId: 'MAIN_WH' }, transaction: t });
          if (inv) {
            inv.availableStock -= item.quantity;
            await inv.save({ transaction: t });

            await InventoryTransaction.create({
              productId: item.productId,
              type: 'OUT',
              quantity: item.quantity,
              referenceId: `SHP_${orderId}`,
              channel: 'SHOPEE',
              note: 'Đơn hàng mới từ Shopee'
            }, { transaction: t });
          }
        }
        await t.commit();

        // Sync về website
        for (const item of items) {
          await InventoryService.syncToWebsite(item.productId);
        }

      } catch (err) {
        await t.rollback();
        throw err;
      }
    }

    res.json({ success: true, message: 'Shopee webhook processed' });
  } catch (error) {
    console.error('[Shopee Webhook Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  handleWebhook
};

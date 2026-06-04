const Product = require('../models/Product');
const OrderItem = require('../models/OrderItem');
const { Op } = require('sequelize');

class RecommendationService {
  /**
   * Khách hàng khác cũng mua (Cross-sell)
   * Tìm các Order chứa productId truyền vào, xem những order đó còn mua sản phẩm nào khác
   */
  static async getCrossSell(productId, limit = 4) {
    try {
      // Tìm các OrderID chứa sản phẩm này
      const orderItems = await OrderItem.findAll({
        where: { productId },
        attributes: ['orderId']
      });

      if (!orderItems.length) return [];

      const orderIds = orderItems.map(item => item.orderId);

      // Tìm các sản phẩm khác trong cùng OrderID
      const relatedItems = await OrderItem.findAll({
        where: {
          orderId: { [Op.in]: orderIds },
          productId: { [Op.ne]: productId }
        },
        attributes: ['productId']
      });

      if (!relatedItems.length) return [];

      // Tính toán độ phổ biến
      const freq = {};
      relatedItems.forEach(item => {
        freq[item.productId] = (freq[item.productId] || 0) + 1;
      });

      // Sắp xếp ID theo số lần xuất hiện giảm dần
      const sortedIds = Object.keys(freq)
        .sort((a, b) => freq[b] - freq[a])
        .slice(0, limit)
        .map(id => parseInt(id, 10));

      if (!sortedIds.length) return [];

      // Lấy thông tin chi tiết
      return await Product.findAll({
        where: { id: { [Op.in]: sortedIds } }
      });
    } catch (error) {
      console.error('[Recommendation Error]', error);
      return [];
    }
  }

  /**
   * Sản phẩm nổi bật (Trending now)
   */
  static async getTrending(limit = 4) {
    return await Product.findAll({
      where: { featured: true },
      order: [['createdAt', 'DESC']],
      limit
    });
  }
}

module.exports = RecommendationService;

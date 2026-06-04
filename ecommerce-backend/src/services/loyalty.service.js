const LoyaltyPoints = require('../models/LoyaltyPoints');
const sequelize = require('../config/database');

class LoyaltyService {
  /**
   * Cộng điểm cho user khi đơn hàng hoàn thành
   * Cứ 100k = 1 điểm
   */
  static async addPointsFromOrder(userId, orderTotal) {
    const t = await sequelize.transaction();
    try {
      const pointsEarned = Math.floor(orderTotal / 100000);
      
      let lp = await LoyaltyPoints.findOne({ where: { userId }, transaction: t });
      
      if (!lp) {
        lp = await LoyaltyPoints.create({
          userId,
          points: pointsEarned,
          totalSpent: orderTotal,
          tier: 'SILVER'
        }, { transaction: t });
      } else {
        lp.points += pointsEarned;
        lp.totalSpent = parseInt(lp.totalSpent) + parseInt(orderTotal);
        
        // Xét thăng hạng
        if (lp.totalSpent >= 20000000) {
          lp.tier = 'DIAMOND';
        } else if (lp.totalSpent >= 5000000) {
          lp.tier = 'GOLD';
        }
        
        await lp.save({ transaction: t });
      }

      await t.commit();
      return lp;
    } catch (error) {
      await t.rollback();
      console.error('[Loyalty Service Error]', error);
      throw error;
    }
  }

  static async getUserPoints(userId) {
    const lp = await LoyaltyPoints.findOne({ where: { userId } });
    return lp || { points: 0, tier: 'SILVER', totalSpent: 0 };
  }
}

module.exports = LoyaltyService;

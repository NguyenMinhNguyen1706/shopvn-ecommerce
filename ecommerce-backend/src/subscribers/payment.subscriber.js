const eventBus = require('../lib/event-bus');
const Order = require('../models/Order');
const loyaltyService = require('../services/loyalty.service');
const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'PaymentSubscriber' }, process.env.LOG_LEVEL || 'info');

/**
 * Payment Subscriber listening to payment events
 * Concepts: Event-Driven Architecture, Pub/Sub, Eventual Consistency
 */

eventBus.subscribe('payment.success', async ({ orderId, paymentDetails }) => {
  logger.info({ orderId }, `Event [payment.success] received`);

  try {
    // 1. Fetch order
    const order = await Order.findByPk(orderId);
    if (!order) {
      logger.error({ orderId }, `Order not found for successful payment`);
      return;
    }

    // 2. Update payment status in database
    await order.update({
      paymentStatus: 'paid',
      status: 'processing' // move order status to processing
    });
    logger.info({ orderId }, `Order status updated to processing/paid`);

    // 3. Add loyalty points asynchronously (Eventual Consistency)
    // Concept: Eventual Consistency, Distributed Transactions
    try {
      await loyaltyService.addPointsFromOrder(order.userId, order.total);
      logger.info({ orderId, userId: order.userId }, `Loyalty points added for order`);
    } catch (loyaltyErr) {
      logger.error({ err: loyaltyErr, orderId }, `Failed to credit loyalty points for order`);
    }

    // 4. Trigger shipping registration or notify admin via WebSocket
    eventBus.publish('order.processing', { order });

  } catch (err) {
    logger.error({ err, orderId }, `Failed to process [payment.success] events`);
  }
});

module.exports = {};

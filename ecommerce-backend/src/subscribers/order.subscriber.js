const eventBus = require('../lib/event-bus');
const { enqueueOrderConfirmationEmail } = require('../queues/background.queue');
const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'OrderSubscriber' }, process.env.LOG_LEVEL || 'info');

/**
 * Order Subscriber listening to domain events
 * Concepts: Event-Driven Architecture, Pub/Sub
 */

// Subscribe to order.created
eventBus.subscribe('order.created', async ({ order, user }) => {
  logger.info({ orderId: order.id, userId: user.id }, `Event [order.created] received`);

  try {
    // 1. Enqueue email background job
    const orderData = order.toJSON ? order.toJSON() : order;
    await enqueueOrderConfirmationEmail(user.email, orderData);
    logger.info({ orderId: order.id }, `Order confirmation email job queued`);
  } catch (err) {
    logger.error({ err, orderId: order.id }, `Failed to handle [order.created] subscriber logic`);
  }
});

// Subscribe to order.cancelled
eventBus.subscribe('order.cancelled', async ({ order }) => {
  logger.info({ orderId: order.id }, `Event [order.cancelled] received`);
  // Handle inventory release / restocking notifications offline if needed
});

module.exports = {};

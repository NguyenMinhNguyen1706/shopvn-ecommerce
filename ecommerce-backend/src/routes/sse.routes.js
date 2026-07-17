const router = require('express').Router();
const eventBus = require('../lib/event-bus');
const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'SSERoutes' }, process.env.LOG_LEVEL || 'info');

/**
 * Server-Sent Events (SSE) Route for Real-time Order Tracking
 * Concepts: Server-Sent Events, Long Polling, Real-time
 */

router.get('/orders/:orderId/track', (req, res) => {
  const { orderId } = req.params;

  // Set headers for SSE connection
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*'
  });

  // Send initial ping/connection check
  res.write(`data: ${JSON.stringify({ connected: true, orderId, timestamp: new Date().toISOString() })}\n\n`);

  // Event handler for order updates
  const orderUpdateHandler = (eventData) => {
    if (String(eventData.orderId) === String(orderId)) {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    }
  };

  // Subscribe to internal event bus
  eventBus.subscribe('order.status_changed', orderUpdateHandler);
  logger.info({ orderId }, `SSE Connection opened for order tracking`);

  // Client connection closed
  req.on('close', () => {
    eventBus.off('order.status_changed', orderUpdateHandler);
    logger.info({ orderId }, `SSE Connection closed for order tracking`);
  });
});

module.exports = router;

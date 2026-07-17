const { Server } = require('socket.io');
const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'WebSocket' }, process.env.LOG_LEVEL || 'info');

let io;

/**
 * Initialize Socket.IO Server integrated with Express Server
 * Concepts: WebSockets, Real-time Architecture, Pub/Sub
 */
function initializeWebSocket(server) {
  try {
    io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Namespace for Orders tracking
    const orderNamespace = io.of('/orders');
    
    orderNamespace.on('connection', (socket) => {
      logger.info({ socketId: socket.id }, 'Client connected to order namespace');

      // Join room for specific order ID
      socket.on('join_order_tracking', (orderId) => {
        socket.join(`order:${orderId}`);
        logger.info({ socketId: socket.id, orderId }, `Client joined tracking room`);
      });

      socket.on('leave_order_tracking', (orderId) => {
        socket.leave(`order:${orderId}`);
        logger.info({ socketId: socket.id, orderId }, `Client left tracking room`);
      });

      socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'Client disconnected from order namespace');
      });
    });

    logger.info('✓ Socket.IO WebSockets server initialized successfully');
    return io;
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Socket.IO server');
  }
}

/**
 * Broadcast order status updates to clients in the room
 */
function broadcastOrderUpdate(orderId, status, trackingInfo = {}) {
  if (!io) return;
  
  logger.info({ orderId, status }, `Broadcasting order update`);
  io.of('/orders').to(`order:${orderId}`).emit('order_status_updated', {
    orderId,
    status,
    trackingInfo,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  initializeWebSocket,
  broadcastOrderUpdate
};

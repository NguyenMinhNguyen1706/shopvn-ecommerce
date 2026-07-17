const { Logger } = require('../config/logger');
const { apiRateLimit } = require('../middlewares/security.middleware');
const requestId = require('../middlewares/request-id.middleware');

const logger = new Logger({ component: 'APIGateway' }, process.env.LOG_LEVEL || 'info');

/**
 * Central API Gateway Middleware Engine
 * Concepts: API Gateways, Reverse Proxies, Rate Limiting, Distributed Tracing
 */
function gateway() {
  return (req, res, next) => {
    logger.info(
      {
        method: req.method,
        path: req.path,
        requestId: req.requestId,
        ip: req.ip
      },
      `Gateway Routing Request`
    );

    // Dynamic routing or auth interception can be performed here
    next();
  };
}

module.exports = {
  gatewayMiddleware: [
    requestId,      // 1. Assign Correlation ID
    apiRateLimit(), // 2. Apply Rate Limiting
    gateway()       // 3. Log and route
  ]
};

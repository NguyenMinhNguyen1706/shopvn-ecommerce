const sequelize = require('../../src/config/database');
const { Logger } = require('../../src/config/logger');

const logger = new Logger({ component: 'ChaosEngineering' }, process.env.LOG_LEVEL || 'info');

/**
 * Chaos Engineering Script: Simulate DB Failures / Network Partition
 * Concepts: Chaos Engineering, Network Partitions, Failover, Disaster Recovery
 */
async function simulateDbFailure() {
  logger.warn('☠ [Chaos] Simulating Database Partition / Outage...');

  try {
    // Break the connection pool by executing heavy locking or closing connection manager
    await sequelize.close();
    logger.fatal('☠ [Chaos] Database Connection Pool Closed. App should return 503 / Health Check should fail.');
  } catch (err) {
    logger.error({ err }, 'Failed to simulate DB failure');
  }
}

simulateDbFailure();

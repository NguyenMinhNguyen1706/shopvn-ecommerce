const { Queue } = require('bullmq');
const { getBullMQConnection } = require('../config/bullmq');
const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'CronJobs' }, process.env.LOG_LEVEL || 'info');
const CRON_QUEUE_NAME = 'cron-jobs';

let cronQueue;

function getCronQueue() {
  if (!cronQueue) {
    cronQueue = new Queue(CRON_QUEUE_NAME, {
      connection: getBullMQConnection()
    });
  }
  return cronQueue;
}

/**
 * Initialize repeatable scheduled jobs
 * Concepts: Cron Jobs, Background Workers
 */
async function initializeCronJobs() {
  const queue = getCronQueue();

  try {
    // Clear old repeatable jobs first
    const oldJobs = await queue.getRepeatableJobs();
    for (const job of oldJobs) {
      await queue.removeRepeatableByKey(job.key);
    }

    // 1. Cleanup expired carts (Daily at 02:00)
    await queue.add(
      'cleanup.expired_carts',
      {},
      {
        repeat: { pattern: '0 2 * * *' } // standard cron: 2:00 AM daily
      }
    );

    // 2. Expire pending orders (Every 5 minutes)
    await queue.add(
      'orders.expire_pending',
      {},
      {
        repeat: { pattern: '*/5 * * * *' } // every 5 minutes
      }
    );

    // 3. Clear blacklisted expired tokens (Hourly)
    await queue.add(
      'auth.cleanup_blacklist',
      {},
      {
        repeat: { pattern: '0 * * * *' } // hourly
      }
    );

    logger.info('✓ Repeatable Cron Jobs initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize cron jobs');
  }
}

module.exports = {
  initializeCronJobs,
  CRON_QUEUE_NAME
};

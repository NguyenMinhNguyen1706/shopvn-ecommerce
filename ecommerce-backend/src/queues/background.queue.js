const { Queue } = require('bullmq');
const { getBullMQConnection } = require('../config/bullmq');

const BACKGROUND_QUEUE_NAME = 'background-jobs';

let backgroundQueue;

function getBackgroundQueue() {
  if (!backgroundQueue) {
    backgroundQueue = new Queue(BACKGROUND_QUEUE_NAME, {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        attempts: Number(process.env.QUEUE_JOB_ATTEMPTS || 3),
        backoff: {
          type: 'exponential',
          delay: Number(process.env.QUEUE_JOB_BACKOFF_MS || 5000),
        },
        removeOnComplete: {
          age: Number(process.env.QUEUE_REMOVE_COMPLETE_AGE_SECONDS || 86400),
          count: Number(process.env.QUEUE_REMOVE_COMPLETE_COUNT || 1000),
        },
        removeOnFail: {
          age: Number(process.env.QUEUE_REMOVE_FAIL_AGE_SECONDS || 604800),
          count: Number(process.env.QUEUE_REMOVE_FAIL_COUNT || 5000),
        },
      },
    });
  }

  return backgroundQueue;
}

async function enqueueOrderConfirmationEmail(userEmail, orderData) {
  const orderId = orderData?.id;
  return getBackgroundQueue().add(
    'order.confirmation_email',
    { userEmail, orderData },
    orderId ? { jobId: `order-confirmation-email-${orderId}` } : undefined
  );
}

async function closeBackgroundQueue() {
  if (backgroundQueue) {
    await backgroundQueue.close();
    backgroundQueue = null;
  }
}

module.exports = {
  BACKGROUND_QUEUE_NAME,
  getBackgroundQueue,
  enqueueOrderConfirmationEmail,
  closeBackgroundQueue,
};

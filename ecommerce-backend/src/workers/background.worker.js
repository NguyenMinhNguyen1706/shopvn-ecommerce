require('dotenv').config();

const { Worker, Queue } = require('bullmq');
const { getBullMQConnection } = require('../config/bullmq');
const { BACKGROUND_QUEUE_NAME } = require('../queues/background.queue');
const EmailService = require('../services/email.service');
const { logger } = require('../config/logger');

// ── Dead Letter Queue (DLQ) Definition ────────────────────────────────────────
// Concept: Dead Letter Queues, Message Queues, Observability

const DLQ_QUEUE_NAME = 'dead-letter-queue';
let dlqQueue;

function getDLQQueue() {
  if (!dlqQueue) {
    dlqQueue = new Queue(DLQ_QUEUE_NAME, {
      connection: getBullMQConnection()
    });
  }
  return dlqQueue;
}

async function processJob(job) {
  switch (job.name) {
    case 'order.confirmation_email': {
      const { userEmail, orderData } = job.data || {};
      if (!userEmail || !orderData) {
        throw new Error('Missing order confirmation email payload');
      }
      await EmailService.sendOrderConfirmation(userEmail, orderData);
      return { sent: true, orderId: orderData.id };
    }
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}

const worker = new Worker(BACKGROUND_QUEUE_NAME, processJob, {
  connection: getBullMQConnection({ worker: true }),
  concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, jobName: job.name }, `[Worker] Job completed successfully`);
});

worker.on('failed', async (job, error) => {
  logger.error(
    { jobId: job?.id, jobName: job?.name, attemptsMade: job?.attemptsMade, err: error },
    `[Worker] Job attempt failed`
  );

  // If job has exhausted all retries, move it to Dead Letter Queue (DLQ)
  // Concept: Dead Letter Queues, Alerting
  if (job && job.attemptsMade >= (job.opts?.attempts || 3)) {
    try {
      const dlq = getDLQQueue();
      await dlq.add(
        `failed.${job.name}`,
        {
          originalJobId: job.id,
          name: job.name,
          data: job.data,
          failedReason: error.message,
          failedAt: new Date().toISOString()
        },
        { jobId: `dlq-${job.id}` }
      );
      logger.error(
        { jobId: job.id, jobName: job.name, dlqName: DLQ_QUEUE_NAME },
        `[Worker] Job permanently failed. Moved to Dead Letter Queue.`
      );
    } catch (dlqErr) {
      logger.fatal(
        { err: dlqErr, originalJobId: job.id },
        `[Worker] Critical error: Failed to move job to Dead Letter Queue`
      );
    }
  }
});

worker.on('error', (error) => {
  logger.error({ err: error }, '[Worker] Worker connection error');
});

async function shutdown(signal) {
  logger.warn(`[Worker] Received ${signal}, shutting down...`);
  await worker.close();
  if (dlqQueue) {
    await dlqQueue.close();
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

logger.info(`🚀 [Worker] Listening on queue "${BACKGROUND_QUEUE_NAME}"`);

const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'PerformanceMonitor' }, process.env.LOG_LEVEL || 'info');

/**
 * Performance Monitoring Middleware
 * Concepts: Latency, Throughput, P99 Latency, Tail Latency
 * Measures execution time of requests and alerts when P99 / tail latency thresholds are breached.
 */

// Local sliding window for latency tracking (in-memory, simple queue)
const LATENCY_WINDOW_SIZE = 1000;
const latencyRecords = new Map(); // route -> array of durations (seconds)

function recordLatency(route, durationSeconds) {
  if (!latencyRecords.has(route)) {
    latencyRecords.set(route, []);
  }

  const records = latencyRecords.get(route);
  records.push(durationSeconds);

  if (records.length > LATENCY_WINDOW_SIZE) {
    records.shift(); // remove oldest
  }
}

/**
 * Calculate percentiles for a route
 */
function getPercentiles(route) {
  const records = latencyRecords.get(route);
  if (!records || records.length === 0) return null;

  const sorted = [...records].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    count: len,
    p50: sorted[Math.floor(len * 0.50)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)], // P99 Latency
    max: sorted[len - 1] // Tail Latency
  };
}

function performanceMonitor(options = {}) {
  const p99ThresholdSeconds = options.p99ThresholdSeconds || 1.0; // alert if P99 > 1s
  const tailThresholdSeconds = options.tailThresholdSeconds || 3.0; // alert if max latency > 3s

  return (req, res, next) => {
    const start = process.hrtime.bigint();
    const route = `${req.method} ${req.baseUrl}${req.path}`;

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationSeconds = Number(end - start) / 1_000_000_000;

      // Skip health / metrics routes
      if (['/health', '/ready', '/metrics'].includes(req.path)) {
        return;
      }

      recordLatency(route, durationSeconds);

      // Analyze percentiles
      const stats = getPercentiles(route);
      if (stats && stats.count >= 10) { // check after gathering some data
        // Trigger structured warnings for tail latencies
        if (stats.p99 > p99ThresholdSeconds) {
          logger.warn(
            { route, stats, threshold: p99ThresholdSeconds },
            `[PerfAlert] P99 Latency threshold exceeded`
          );
        }

        if (durationSeconds > tailThresholdSeconds) {
          logger.error(
            { route, durationSeconds, stats, threshold: tailThresholdSeconds },
            `[PerfAlert] Tail Latency spike detected`
          );
        }
      }
    });

    next();
  };
}

module.exports = {
  performanceMonitor,
  getPercentiles
};

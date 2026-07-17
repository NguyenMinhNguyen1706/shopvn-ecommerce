/**
 * Backpressure & Overload Protection Middleware
 * Concepts: Backpressure, Memory Leaks, Garbage Collection, Resilience
 * Protects the Express app from crashing under heavy load
 */

let activeRequests = 0;
let eventLoopLag = 0;

// Measure Event Loop Lag continuously
// We run a small timer and calculate how delayed it is due to CPU blocking
setInterval(() => {
  const start = Date.now();
  setTimeout(() => {
    const delay = Date.now() - start - 50; // expected 50ms
    eventLoopLag = Math.max(0, delay);
  }, 50);
}, 500).unref();

function getLoadMetrics() {
  const memory = process.memoryUsage();
  return {
    activeRequests,
    eventLoopLagMs: eventLoopLag,
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
    rssMb: Math.round(memory.rss / 1024 / 1024),
  };
}

function backpressure(options = {}) {
  const maxLag = options.maxEventLoopLagMs || Number(process.env.MAX_EVENT_LOOP_LAG_MS || 300); // 300ms
  const maxRequests = options.maxConcurrentRequests || Number(process.env.MAX_CONCURRENT_REQUESTS || 1000);
  const maxMemoryPercent = options.maxMemoryPercent || 90; // 90% of heap limits

  return (req, res, next) => {
    const metrics = getLoadMetrics();

    // Check Memory threshold (rough estimate of heap usage vs default limits or Node memory constraints)
    // Node.js default heap limit is around 1.4GB (V8 default on 64-bit systems) or process.env.NODE_OPTIONS max-old-space-size
    const v8 = require('v8');
    const heapStats = v8.getHeapStatistics();
    const heapLimit = heapStats.heap_size_limit;
    const currentHeapUsed = heapStats.used_heap_size;
    const memoryPercent = (currentHeapUsed / heapLimit) * 100;

    // Overload checks
    if (metrics.eventLoopLagMs > maxLag) {
      res.set('Retry-After', '10');
      return res.status(503).json({
        success: false,
        message: 'Hệ thống đang quá tải CPU. Vui lòng thử lại sau.',
        load: process.env.NODE_ENV === 'development' ? metrics : undefined
      });
    }

    if (activeRequests > maxRequests) {
      res.set('Retry-After', '5');
      return res.status(503).json({
        success: false,
        message: 'Hệ thống nhận quá nhiều yêu cầu đồng thời. Vui lòng thử lại sau.',
        load: process.env.NODE_ENV === 'development' ? metrics : undefined
      });
    }

    if (memoryPercent > maxMemoryPercent) {
      res.set('Retry-After', '30');
      return res.status(503).json({
        success: false,
        message: 'Hệ thống đang quá tải bộ nhớ. Vui lòng thử lại sau.',
        load: process.env.NODE_ENV === 'development' ? metrics : undefined
      });
    }

    // Track active request count
    activeRequests++;
    res.on('finish', () => {
      activeRequests = Math.max(0, activeRequests - 1);
    });

    next();
  };
}

module.exports = {
  backpressure,
  getLoadMetrics
};

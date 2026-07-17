const axios = require('axios');
const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'MonotonicClock' }, process.env.LOG_LEVEL || 'info');

/**
 * NTP-aware Monotonic Clock Helper
 * Concepts: Clock Skew, Network Partitions, Latency
 * Measures clock offset between local system time and reference time to prevent clock skew issues.
 */

let systemTimeOffsetMs = 0;

/**
 * Synchronize local clock offset with a global time provider (NTP HTTP equivalent)
 */
async function syncClockOffset() {
  try {
    const start = Date.now();
    // Use WorldTimeAPI or public NTP servers to fetch high-precision time
    const response = await axios.get('https://worldtimeapi.org/api/timezone/Etc/UTC', { timeout: 3000 });
    const latencyMs = Date.now() - start;
    
    const referenceTimeMs = new Date(response.data.utc_datetime).getTime();
    const expectedLocalTimeMs = referenceTimeMs + (latencyMs / 2);
    
    systemTimeOffsetMs = expectedLocalTimeMs - Date.now();

    if (Math.abs(systemTimeOffsetMs) > 1000) {
      logger.warn(
        { offsetMs: systemTimeOffsetMs },
        `[ClockSkew] System clock skew detected! Corrected offset applied.`
      );
    } else {
      logger.info({ offsetMs: systemTimeOffsetMs }, `[ClockSkew] Clock sync completed.`);
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to sync clock offset, falling back to local time');
  }
}

// Periodically sync clock every 1 hour
setInterval(() => {
  syncClockOffset();
}, 3600000).unref();

// Run initial sync
syncClockOffset();

/**
 * Get current synchronized timestamp
 */
function getCorrectedTime() {
  return new Date(Date.now() + systemTimeOffsetMs);
}

/**
 * Get current time in milliseconds with system offset applied
 */
function getCorrectedTimeMs() {
  return Date.now() + systemTimeOffsetMs;
}

module.exports = {
  syncClockOffset,
  getCorrectedTime,
  getCorrectedTimeMs
};

const { featureFlags } = require('../../src/lib/feature-flags');
const { Logger } = require('../../src/config/logger');

const logger = new Logger({ component: 'ChaosEngineering' }, process.env.LOG_LEVEL || 'info');

/**
 * Chaos Engineering Script: Artificial Latency Injection
 * Concepts: Chaos Engineering, Latency, Tail Latency
 * Dynamically toggles latency injection on critical endpoints via Feature Flags / Redis configuration.
 */

async function runChaosSimulation() {
  logger.warn('☠ [Chaos] Simulating latency injection...');

  // Set the feature flag config in Redis
  const flagConfig = {
    enabled: true,
    percentage: 50, // 50% of requests will experience latency
    latencyMs: 3000 // inject 3 seconds delay
  };

  await featureFlags.setFlag('inject_artificial_latency', flagConfig);
  logger.warn({ flagConfig }, '☠ [Chaos] Latency injection flag active in Redis.');
}

runChaosSimulation();

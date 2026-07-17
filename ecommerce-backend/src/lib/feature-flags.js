const { cacheUtils } = require('../config/redis');

/**
 * Redis-backed Feature Flags System
 * Concepts: Feature Flags, Canary Releases, Continuous Deployment, Resilience
 */

const DEFAULT_FLAGS = {
  maintenance_mode: false,
  enable_websockets: false,
  enable_ai_chatbot: true,
  new_checkout_flow: false
};

class FeatureFlags {
  constructor() {
    this.localCache = new Map();
    this.lastCacheUpdateTime = 0;
    this.cacheTtlMs = 60000; // 60 seconds local cache TTL to avoid Redis query overhead
  }

  /**
   * Simple hash function to deterministically distribute users for canary rollouts
   * @returns {number} 0-99
   */
  _hashUserId(userId, flagName) {
    if (!userId) return 0;
    const str = String(userId) + flagName;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Check if a feature flag is enabled for the given context
   * @param {string} flagName
   * @param {Object} context - Optional user context, e.g. { userId }
   */
  async isEnabled(flagName, context = {}) {
    const config = await this.getFlag(flagName);
    if (!config) return false;

    // 1. Boolean check
    if (typeof config === 'boolean') {
      return config;
    }

    // 2. Object config check (percentage, user list)
    if (typeof config === 'object' && config !== null) {
      // Check Whitelist/User List
      if (context.userId && Array.isArray(config.users)) {
        if (config.users.includes(context.userId) || config.users.includes(String(context.userId))) {
          return true;
        }
      }

      // Check Percentage Rollout (Canary releases) — Concept: Canary Releases
      if (context.userId && typeof config.percentage === 'number') {
        const bucket = this._hashUserId(context.userId, flagName);
        return bucket < config.percentage;
      }

      return !!config.enabled;
    }

    return false;
  }

  /**
   * Get flag configuration from local cache or Redis
   */
  async getFlag(flagName) {
    const now = Date.now();
    
    // Return from memory cache if valid
    if (now - this.lastCacheUpdateTime < this.cacheTtlMs && this.localCache.has(flagName)) {
      return this.localCache.get(flagName);
    }

    try {
      const redisKey = `flags:${flagName}`;
      const config = await cacheUtils.get(redisKey);
      
      if (config !== null && config !== undefined) {
        this.localCache.set(flagName, config);
        this.lastCacheUpdateTime = now;
        return config;
      }
    } catch (err) {
      console.error(`[FeatureFlags] Redis error for flag ${flagName}, using defaults:`, err.message);
    }

    // Fallback to defaults
    const fallback = DEFAULT_FLAGS[flagName] !== undefined ? DEFAULT_FLAGS[flagName] : false;
    this.localCache.set(flagName, fallback);
    return fallback;
  }

  /**
   * Set flag configuration (Redis + invalidate local cache)
   */
  async setFlag(flagName, config) {
    try {
      const redisKey = `flags:${flagName}`;
      await cacheUtils.set(redisKey, config, 0); // No expiration (permanent flag)
      this.localCache.delete(flagName); // invalidate local cache
      this.lastCacheUpdateTime = 0; // force reload next time
      return true;
    } catch (err) {
      console.error(`[FeatureFlags] Set flag ${flagName} error:`, err.message);
      return false;
    }
  }
}

const featureFlags = new FeatureFlags();

module.exports = {
  featureFlags,
  isEnabled: (flag, ctx) => featureFlags.isEnabled(flag, ctx),
  getFlag: (flag) => featureFlags.getFlag(flag),
  setFlag: (flag, cfg) => featureFlags.setFlag(flag, cfg)
};

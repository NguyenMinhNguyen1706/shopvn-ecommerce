const { EventEmitter } = require('events');
const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'EventBus' }, process.env.LOG_LEVEL || 'info');

/**
 * Global Event Bus using Pub/Sub pattern
 * Concepts: Pub/Sub, Event-Driven Architecture
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase limit for listeners
    this.setMaxListeners(50);
  }

  /**
   * Publish an event
   * @param {string} eventName
   * @param {*} payload
   */
  publish(eventName, payload) {
    logger.debug({ eventName, payload }, `Publishing event`);
    this.emit(eventName, payload);
  }

  /**
   * Subscribe to an event
   * @param {string} eventName
   * @param {Function} handler
   */
  subscribe(eventName, handler) {
    logger.debug({ eventName }, `Subscribing to event`);
    this.on(eventName, handler);
  }
}

const eventBus = new EventBus();

module.exports = eventBus;

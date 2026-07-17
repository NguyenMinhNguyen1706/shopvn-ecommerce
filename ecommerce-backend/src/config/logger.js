const os = require('os');

/**
 * Custom Structured JSON Logger
 * Concepts: Logging, Observability
 * Replaces console.log with fast structured logging compatible with Pino API
 */

const LOG_LEVELS = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10
};

const LOG_LEVEL_NAMES = {
  60: 'FATAL',
  50: 'ERROR',
  40: 'WARN ',
  30: 'INFO ',
  20: 'DEBUG',
  10: 'TRACE'
};

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'creditcard', 'ssn', 'refreshtoken'];

/**
 * Deep clone and redact sensitive fields
 */
function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redact);
  }

  const cloned = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.includes(lowerKey)) {
      cloned[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      cloned[key] = redact(obj[key]);
    } else {
      cloned[key] = obj[key];
    }
  }
  return cloned;
}

class Logger {
  constructor(context = {}, minLevel = 'info') {
    this.context = context;
    this.minLevelValue = LOG_LEVELS[minLevel] || 30;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.pid = process.pid;
    this.hostname = os.hostname();
  }

  child(bindings = {}) {
    return new Logger({ ...this.context, ...bindings }, process.env.LOG_LEVEL || 'info');
  }

  _log(levelName, obj, msg) {
    const levelValue = LOG_LEVELS[levelName];
    if (levelValue < this.minLevelValue) return;

    let logData = {};
    let message = msg;

    if (typeof obj === 'string') {
      message = obj;
    } else if (obj instanceof Error) {
      logData = {
        err: {
          message: obj.message,
          stack: obj.stack,
          type: obj.constructor.name
        }
      };
    } else if (typeof obj === 'object' && obj !== null) {
      logData = redact(obj);
    }

    const timestamp = new Date().toISOString();

    if (this.isProduction) {
      // Production: Structured JSON
      const entry = {
        level: levelValue,
        time: timestamp,
        pid: this.pid,
        hostname: this.hostname,
        ...this.context,
        ...logData,
        msg: message
      };
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      // Development: Pretty Print
      const colorMap = {
        60: '\x1b[41m\x1b[30m', // red bg
        50: '\x1b[31m',         // red
        40: '\x1b[33m',         // yellow
        30: '\x1b[32m',         // green
        20: '\x1b[36m',         // cyan
        10: '\x1b[35m'          // magenta
      };
      const reset = '\x1b[0m';
      const levelStr = LOG_LEVEL_NAMES[levelValue] || 'INFO';
      const color = colorMap[levelValue] || '';
      
      const extraData = Object.keys(logData).length > 0 
        ? ` ${JSON.stringify(logData)}` 
        : '';
      const contextData = Object.keys(this.context).length > 0
        ? ` (context: ${JSON.stringify(this.context)})`
        : '';

      console.log(`[${timestamp}] ${color}${levelStr}${reset}:${extraData}${contextData} ${message || ''}`);
    }
  }

  trace(obj, msg) { this._log('trace', obj, msg); }
  debug(obj, msg) { this._log('debug', obj, msg); }
  info(obj, msg) { this._log('info', obj, msg); }
  warn(obj, msg) { this._log('warn', obj, msg); }
  error(obj, msg) { this._log('error', obj, msg); }
  fatal(obj, msg) { this._log('fatal', obj, msg); }
}

const logger = new Logger({}, process.env.LOG_LEVEL || 'info');

module.exports = {
  logger,
  Logger
};

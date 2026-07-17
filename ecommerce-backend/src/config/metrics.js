/**
 * Prometheus-compatible metrics registry (lightweight, zero external dependencies)
 * Concepts: Metrics, Monitoring, SLIs, Observability
 */

class Counter {
  constructor(name, help, labelNames = []) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.values = new Map(); // key: JSON.stringify(labels) -> value: number
  }

  inc(labels = {}, value = 1) {
    if (value < 0) return;
    const key = this._getLabelKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  _getLabelKey(labels) {
    // Sort labels to ensure stable map keys
    const sorted = {};
    Object.keys(labels).sort().forEach(k => {
      sorted[k] = String(labels[k]);
    });
    return JSON.stringify(sorted);
  }

  serialize() {
    let output = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n`;
    for (const [keyStr, val] of this.values.entries()) {
      const labels = JSON.parse(keyStr);
      const labelParts = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
      const labelStr = labelParts.length > 0 ? `{${labelParts.join(',')}}` : '';
      output += `${this.name}${labelStr} ${val}\n`;
    }
    return output;
  }
}

class Gauge {
  constructor(name, help, labelNames = []) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.values = new Map();
  }

  set(labels = {}, value) {
    const key = this._getLabelKey(labels);
    this.values.set(key, value);
  }

  inc(labels = {}, value = 1) {
    const key = this._getLabelKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  dec(labels = {}, value = 1) {
    const key = this._getLabelKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current - value);
  }

  _getLabelKey(labels) {
    const sorted = {};
    Object.keys(labels).sort().forEach(k => {
      sorted[k] = String(labels[k]);
    });
    return JSON.stringify(sorted);
  }

  serialize() {
    let output = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} gauge\n`;
    for (const [keyStr, val] of this.values.entries()) {
      const labels = JSON.parse(keyStr);
      const labelParts = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
      const labelStr = labelParts.length > 0 ? `{${labelParts.join(',')}}` : '';
      output += `${this.name}${labelStr} ${val}\n`;
    }
    return output;
  }
}

class Histogram {
  constructor(name, help, labelNames = [], buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.buckets = [...buckets, Infinity];
    this.values = new Map(); // key: JSON.stringify(labels) -> value: { sum, count, bucketCounts }
  }

  observe(labels = {}, value) {
    const key = this._getLabelKey(labels);
    let stats = this.values.get(key);

    if (!stats) {
      stats = {
        sum: 0,
        count: 0,
        bucketCounts: new Array(this.buckets.length).fill(0)
      };
      this.values.set(key, stats);
    }

    stats.sum += value;
    stats.count += 1;

    for (let i = 0; i < this.buckets.length; i++) {
      if (value <= this.buckets[i]) {
        stats.bucketCounts[i] += 1;
      }
    }
  }

  _getLabelKey(labels) {
    const sorted = {};
    Object.keys(labels).sort().forEach(k => {
      sorted[k] = String(labels[k]);
    });
    return JSON.stringify(sorted);
  }

  serialize() {
    let output = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} histogram\n`;

    for (const [keyStr, stats] of this.values.entries()) {
      const labels = JSON.parse(keyStr);
      const labelParts = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);

      // Write bucket values
      for (let i = 0; i < this.buckets.length; i++) {
        const le = this.buckets[i] === Infinity ? '+Inf' : this.buckets[i];
        const bucketLabels = [...labelParts, `le="${le}"`].join(',');
        output += `${this.name}_bucket{${bucketLabels}} ${stats.bucketCounts[i]}\n`;
      }

      // Write sum and count
      const baseLabelStr = labelParts.length > 0 ? `{${labelParts.join(',')}}` : '';
      output += `${this.name}_sum${baseLabelStr} ${stats.sum}\n`;
      output += `${this.name}_count${baseLabelStr} ${stats.count}\n`;
    }

    return output;
  }
}

class Registry {
  constructor() {
    this.metrics = [];
  }

  register(metric) {
    this.metrics.push(metric);
  }

  serialize() {
    let output = '';
    for (const metric of this.metrics) {
      output += metric.serialize() + '\n';
    }
    return output;
  }
}

const registry = new Registry();

// Define pre-defined metrics
const httpRequestsTotal = new Counter('http_requests_total', 'Total number of HTTP requests processed', ['method', 'route', 'status_code']);
const httpRequestDurationSeconds = new Histogram('http_request_duration_seconds', 'HTTP request latency in seconds', ['method', 'route']);
const activeConnections = new Gauge('active_connections', 'Number of active HTTP connections');
const dbQueryDurationSeconds = new Histogram('db_query_duration_seconds', 'Database query duration in seconds');
const redisOperationsTotal = new Counter('redis_operations_total', 'Total number of Redis operations', ['operation', 'result']);
const cacheHitsTotal = new Counter('cache_hits_total', 'Total number of cache hits');
const cacheMissesTotal = new Counter('cache_misses_total', 'Total number of cache misses');
const queueJobsTotal = new Counter('queue_jobs_total', 'Total number of queue jobs processed', ['queue', 'status']);

registry.register(httpRequestsTotal);
registry.register(httpRequestDurationSeconds);
registry.register(activeConnections);
registry.register(dbQueryDurationSeconds);
registry.register(redisOperationsTotal);
registry.register(cacheHitsTotal);
registry.register(cacheMissesTotal);
registry.register(queueJobsTotal);

module.exports = {
  registry,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  activeConnections,
  dbQueryDurationSeconds,
  redisOperationsTotal,
  cacheHitsTotal,
  cacheMissesTotal,
  queueJobsTotal,
  serialize: () => registry.serialize()
};

const { Sequelize } = require('sequelize');

// ═══════════════════════════════════════════════════════════════════════════════
// Database Configuration — Optimized for 1M users
// Concepts: Connection Pooling, Read Replicas, Query Timeouts
// ═══════════════════════════════════════════════════════════════════════════════

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = {
  max:     Number(process.env.DB_POOL_MAX || 20),      // ← was 5, now 20 for scale
  min:     Number(process.env.DB_POOL_MIN || 2),       // keep 2 warm connections
  acquire: Number(process.env.DB_POOL_ACQUIRE || 60000), // 60s acquire timeout
  idle:    Number(process.env.DB_POOL_IDLE || 10000),    // 10s idle before release
  evict:   Number(process.env.DB_POOL_EVICT || 30000),   // check idle every 30s
};

const dialectOptions = {
  ssl: isProduction || process.env.DB_SSL === 'true'
    ? { require: true, rejectUnauthorized: false }
    : false,
  // Statement timeout: kill queries running longer than 30s
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT || 30000),
  idle_in_transaction_session_timeout: Number(process.env.DB_IDLE_TX_TIMEOUT || 60000),
};

const commonOptions = {
  dialect: 'postgres',
  logging: isProduction
    ? false
    : (msg) => console.log(`\x1b[36m[SQL]\x1b[0m ${msg}`),
  pool: poolConfig,
  dialectOptions,
  // Optimistic locking support
  define: {
    version: false, // will be enabled per-model after migration
  },
  // Retry on transient connection errors
  retry: {
    max: 3,
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /ECONNRESET/,
      /ETIMEDOUT/,
    ],
  },
  benchmark: !isProduction, // log query duration in dev
};

// ── Read Replica Support ──────────────────────────────────────────────────────
// When DB_REPLICA_URL is set, read queries go to replica, writes go to primary
// Concept: Read Replicas, Replication

let sequelize;

if (process.env.DB_REPLICA_URL && isProduction) {
  // Production with read replica
  const primaryUrl = process.env.DATABASE_URL;
  const replicaUrl = process.env.DB_REPLICA_URL;

  sequelize = new Sequelize({
    ...commonOptions,
    replication: {
      read: [{ url: replicaUrl }],
      write: { url: primaryUrl },
    },
  });
} else if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, commonOptions);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    String(process.env.DB_PASSWORD),
    {
      host:    process.env.DB_HOST,
      port:    process.env.DB_PORT,
      ...commonOptions,
    }
  );
}

// ── Pool Event Monitoring ─────────────────────────────────────────────────────

if (sequelize.connectionManager?.pool) {
  const pool = sequelize.connectionManager.pool;

  pool.on && pool.on('acquire', () => {
    // Track in metrics when available
  });

  pool.on && pool.on('release', () => {
    // Track in metrics when available
  });
}

module.exports = sequelize;

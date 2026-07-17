function parseRedisUrl(url) {
  const parsed = new URL(url);
  const dbFromPath = parsed.pathname && parsed.pathname !== '/'
    ? Number(parsed.pathname.slice(1))
    : undefined;

  const options = {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: Number.isInteger(dbFromPath) ? dbFromPath : undefined,
  };

  if (parsed.protocol === 'rediss:') {
    options.tls = {};
  }

  return options;
}

function getBullMQConnection(options = {}) {
  const connection = process.env.REDIS_URL
    ? parseRedisUrl(process.env.REDIS_URL)
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
      };

  if (options.worker) {
    connection.maxRetriesPerRequest = null;
  }

  connection.connectTimeout = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 10000);
  return connection;
}

module.exports = {
  getBullMQConnection,
};

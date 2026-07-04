const { performance } = require('node:perf_hooks');

const target = process.env.LOAD_TEST_TARGET || 'http://127.0.0.1:3000';
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 20);
const requests = Number(process.env.LOAD_TEST_REQUESTS || 200);
const paths = (process.env.LOAD_TEST_PATHS || '/health,/ready,/api/products')
  .split(',')
  .map(path => path.trim())
  .filter(Boolean);

const results = [];

async function hit(path) {
  const started = performance.now();
  try {
    const response = await fetch(`${target}${path}`, {
      headers: { accept: 'application/json' },
    });
    await response.arrayBuffer();
    results.push({
      ok: response.ok,
      status: response.status,
      path,
      ms: performance.now() - started,
    });
  } catch (error) {
    results.push({
      ok: false,
      status: 0,
      path,
      ms: performance.now() - started,
      error: error.message,
    });
  }
}

async function worker(id) {
  for (let i = id; i < requests; i += concurrency) {
    await hit(paths[i % paths.length]);
  }
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function main() {
  console.log(`Load test target: ${target}`);
  console.log(`Requests: ${requests}, concurrency: ${concurrency}, paths: ${paths.join(', ')}`);

  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index)));
  const durationSec = (performance.now() - started) / 1000;

  const latencies = results.map(item => item.ms);
  const failed = results.filter(item => !item.ok);
  const byStatus = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const summary = {
    total: results.length,
    failed: failed.length,
    successRate: `${(((results.length - failed.length) / results.length) * 100).toFixed(2)}%`,
    requestsPerSecond: Number((results.length / durationSec).toFixed(2)),
    p50Ms: Number(percentile(latencies, 50).toFixed(2)),
    p95Ms: Number(percentile(latencies, 95).toFixed(2)),
    p99Ms: Number(percentile(latencies, 99).toFixed(2)),
    byStatus,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failed.length) {
    console.log('Sample failures:');
    console.log(JSON.stringify(failed.slice(0, 5), null, 2));
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

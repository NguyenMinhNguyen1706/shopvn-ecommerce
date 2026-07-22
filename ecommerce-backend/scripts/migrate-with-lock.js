require('dotenv').config({ quiet: true });

const { spawn } = require('child_process');
const sequelize = require('../src/config/database');

const lockId = Number(process.env.DB_MIGRATION_LOCK_ID || 20260722);

const runCliMigration = () => new Promise((resolve, reject) => {
  const cliPath = require.resolve('sequelize-cli/lib/sequelize');
  const child = spawn(process.execPath, [cliPath, 'db:migrate'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit'
  });

  child.once('error', reject);
  child.once('exit', code => {
    if (code === 0) resolve();
    else reject(new Error(`sequelize-cli exited with code ${code}`));
  });
});

async function main() {
  if (!Number.isSafeInteger(lockId)) {
    throw new Error('DB_MIGRATION_LOCK_ID must be an integer.');
  }

  await sequelize.authenticate();
  await sequelize.query('SELECT pg_advisory_lock(:lockId)', {
    replacements: { lockId }
  });

  try {
    await runCliMigration();
  } finally {
    await sequelize.query('SELECT pg_advisory_unlock(:lockId)', {
      replacements: { lockId }
    });
    await sequelize.close();
  }
}

main().catch(async error => {
  console.error('[Migration]', error.message);
  try {
    await sequelize.close();
  } catch (_closeError) {
    // The original migration error is the actionable failure.
  }
  process.exitCode = 1;
});

// Entrypoint: load config, migrate, listen, and run the hourly retention pass.

import { buildApp, logger } from './app.js';
import { loadConfig } from './config.js';
import { createPool, migrate, pruneExpired } from './db.js';
import { DIAGNOSTICS_RETENTION_DAYS, RETENTION_PASS_MS } from './limits.js';

const config = loadConfig();
const db = createPool(config.databaseUrl, (err) => app.log.error({ event: 'db_connection_lost', err: err.message }, 'a database connection was lost; the pool reconnects on the next query'));
const app = buildApp({ db, config, now: () => new Date(), logger: logger(config.logLevel) });

await migrate(db, (m) => app.log.info({ event: 'migrate' }, m));
await app.listen({ port: config.port, host: config.host });

async function retentionPass(): Promise<void> {
  try {
    const deleted = await pruneExpired(db, DIAGNOSTICS_RETENTION_DAYS);
    app.log.info({ event: 'retention_pass', ...deleted }, 'retention pass');
  } catch (e) {
    app.log.error({ event: 'retention_pass_failed', err: e instanceof Error ? e.message : String(e) }, 'retention pass failed; it runs again next hour');
  }
}
void retentionPass();
const timer = setInterval(() => void retentionPass(), RETENTION_PASS_MS);

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.once(sig, () => {
    app.log.info({ event: 'shutdown', signal: sig }, 'shutting down');
    clearInterval(timer);
    void app.close()
      .then(() => db.end())
      .catch((e) => app.log.error({ err: e, event: 'shutdown_failed' }, 'a shutdown step failed; exiting anyway'))
      .finally(() => process.exit(0));
  });
}

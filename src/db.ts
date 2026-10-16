// The Postgres pool and the migration runner.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PG_CONNECT_TIMEOUT_MS, PG_STATEMENT_TIMEOUT_MS } from './limits.js';

export type Db = pg.Pool;

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
// Any constant; it only has to be the same in every process that migrates.
const MIGRATE_LOCK_KEY = 7_342_001;

export function createPool(databaseUrl: string, onError: (err: Error) => void = () => {}): Db {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    statement_timeout: PG_STATEMENT_TIMEOUT_MS,
    connectionTimeoutMillis: PG_CONNECT_TIMEOUT_MS,
  });
  // An idle connection that drops is replaced on the next query; without a
  // listener it would end the process.
  pool.on('error', onError);
  return pool;
}

/** Apply migrations/*.sql in name order, each once, each in a transaction. */
export async function migrate(db: Db, log: (msg: string) => void = () => {}): Promise<void> {
  const client = await db.connect();
  try {
    await client.query('SET statement_timeout = 0');
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATE_LOCK_KEY]);
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if ((await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file])).rowCount) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`applied migration ${file}`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${file} failed and was rolled back: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATE_LOCK_KEY]).catch(() => {});
    await client.query('RESET statement_timeout').catch(() => {});
    client.release();
  }
}

/** The hourly retention pass: reports past their retention and closed
 *  rate-limit windows. Returns what it deleted, for the log line. */
export async function pruneExpired(db: Db, retentionDays: number): Promise<{ diagnostics: number; rateLimitWindows: number }> {
  const d = await db.query("DELETE FROM diagnostics WHERE received_at < now() - make_interval(days => $1)", [retentionDays]);
  const w = await db.query('DELETE FROM rate_limit_windows WHERE window_end <= now()');
  return { diagnostics: d.rowCount ?? 0, rateLimitWindows: w.rowCount ?? 0 };
}

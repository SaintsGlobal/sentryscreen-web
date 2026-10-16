// Fixed-window rate limits kept in Postgres (rate_limit_windows), so a restart
// or deploy does not start every window over. One upsert per hit; a window
// restarts in place once it has closed, and the hourly pass deletes closed ones.

import { createHash } from 'node:crypto';
import type { Db } from './db.js';
import { LIMITS, type LimitName } from './limits.js';

export type LimitVerdict = {
  allowed: boolean;
  name: LimitName;
  configured: number;
  window_s: number;
  observed: number;
  retry_after_s: number;
};

export class DbRateLimiter {
  readonly limit: number;
  readonly windowMs: number;

  /** `limit` overrides the default in LIMITS (from config). */
  constructor(private readonly db: Db, readonly name: LimitName, limit?: number) {
    this.limit = limit ?? LIMITS[name].limit;
    this.windowMs = LIMITS[name].window_s * 1000;
  }

  /** Count one request against `key` and say whether it is within the limit. */
  async hit(key: string, now = Date.now()): Promise<LimitVerdict> {
    const keyHash = createHash('sha256').update(`${this.name}\0${key}`).digest('hex');
    const start = new Date(now);
    const end = new Date(now + this.windowMs);
    const r = await this.db.query<{ count: number; window_end: Date }>(
      `INSERT INTO rate_limit_windows AS w (bucket, key_hash, window_start, window_end, count) VALUES ($1, $2, $3, $4, 1)
       ON CONFLICT (bucket, key_hash) DO UPDATE SET
         window_start = CASE WHEN w.window_end <= $3 THEN $3 ELSE w.window_start END,
         window_end   = CASE WHEN w.window_end <= $3 THEN $4 ELSE w.window_end END,
         count        = CASE WHEN w.window_end <= $3 THEN 1 ELSE w.count + 1 END
       RETURNING count, window_end`,
      [this.name, keyHash, start, end]);
    const row = r.rows[0]!;
    return {
      allowed: row.count <= this.limit,
      name: this.name,
      configured: this.limit,
      window_s: this.windowMs / 1000,
      observed: row.count,
      retry_after_s: Math.max(1, Math.ceil((row.window_end.getTime() - now) / 1000)),
    };
  }
}

/** The 429 body: the limit's name, configured value, window, observed count,
 *  and where to change it. */
export function rateLimitBody(v: LimitVerdict) {
  return {
    error: 'rate_limited',
    limit: v.name,
    configured: v.configured,
    window_s: v.window_s,
    observed: v.observed,
    retry_after_s: v.retry_after_s,
    fix: `src/limits.ts LIMITS ${v.name}; README "Environment" lists the overrides`,
  };
}

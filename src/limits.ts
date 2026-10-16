// Every limit this server enforces, in one place. A refusal names the limit,
// its configured value and the observed value (src/ratelimit.ts rateLimitBody,
// the 413 body in src/app.ts).

const HOUR_S = 3600;

export const LIMITS = {
  // POST /v1/diagnostics per client IP (an IPv6 client's /64). Checked first,
  // before the body is validated. DIAGNOSTICS_LIMIT_PER_IP_HOUR overrides it.
  diagnostics_per_ip: { limit: 60, window_s: HOUR_S },
  // One bucket for every caller: the cap nobody can re-key by changing
  // address. Bounds table growth (with DIAGNOSTICS_BODY_BYTES and
  // DIAGNOSTICS_RETENTION_DAYS). DIAGNOSTICS_LIMIT_GLOBAL_HOUR overrides it.
  diagnostics_global: { limit: 120, window_s: HOUR_S },
  // GET /admin/diagnostics[/:id] per IP, checked before the bearer token, so
  // guessing the token is slow as well as hopeless.
  admin_diagnostics_per_ip: { limit: 120, window_s: HOUR_S },
} as const;

export type LimitName = keyof typeof LIMITS;

// POST /v1/diagnostics body budget, after gunzip: 1.5× the client's 256 KiB
// report budget, so a report at the client's limit still fits with its envelope.
export const DIAGNOSTICS_BODY_BYTES = 393_216;
// Every other route's body budget (none of them takes a body).
export const SMALL_BODY_BYTES = 4096;
// GET /admin/diagnostics `limit` ceiling; the default page is a quarter of it.
export const DIAGNOSTICS_LIST_MAX = 200;
// Reports are deleted 90 days after they arrive (the site's privacy page says
// the same).
export const DIAGNOSTICS_RETENTION_DAYS = 90;
// How often the retention pass runs.
export const RETENTION_PASS_MS = 3_600_000;
// Postgres deadlines: a handler query finishes in well under a millisecond, so
// 5 s only ever trips on a database that is not answering.
export const PG_STATEMENT_TIMEOUT_MS = 5_000;
export const PG_CONNECT_TIMEOUT_MS = 5_000;
// ADMIN_TOKEN minimum length; `openssl rand -base64 32` gives 44 characters.
export const ADMIN_TOKEN_MIN_CHARS = 32;

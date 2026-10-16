-- The whole schema: diagnostic reports and the rate-limit windows that guard
-- POST /v1/diagnostics. An open-source deployment starts from an empty database.

-- One row per report the Mac owner approved and sent. The report is built on
-- the Mac from an allowlist and redacted there; it never holds screen content,
-- images, detections, window titles or application names. `received_at` is the
-- retention clock (DIAGNOSTICS_RETENTION_DAYS, src/limits.ts); `created_at` is
-- the client's clock; `bytes` is the body size after gunzip.
CREATE TABLE diagnostics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  machine_id  uuid NOT NULL,
  app_version text NOT NULL,
  app_build   integer NOT NULL,
  os_version  text NOT NULL,
  arch        text NOT NULL,
  channel     text NOT NULL,
  reason      text NOT NULL CHECK (reason = 'manual'),
  created_at  timestamptz NOT NULL,
  bytes       integer NOT NULL,
  report      jsonb NOT NULL
);
CREATE INDEX diagnostics_received ON diagnostics (received_at);

-- Fixed-window rate limits (src/ratelimit.ts). `key_hash` is SHA-256 of the
-- bucket and the key (an IP or IPv6 /64, or 'all'), so no address
-- is stored in clear. Closed windows are deleted by the hourly pass.
CREATE TABLE rate_limit_windows (
  bucket       text NOT NULL,
  key_hash     text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end   timestamptz NOT NULL,
  count        integer NOT NULL CHECK (count >= 1),
  PRIMARY KEY (bucket, key_hash)
);
CREATE INDEX rate_limit_windows_end ON rate_limit_windows (window_end);

// Configuration from the environment. Names and defaults: README "Environment".
// A bad value stops the process at boot with the variable's name.

import { ADMIN_TOKEN_MIN_CHARS, LIMITS } from './limits.js';

export type Config = {
  port: number;
  host: string;
  databaseUrl: string;
  adminToken: string;
  /** Proxy hops in front of this server whose X-Forwarded-For entry is
   *  trusted; 0 = use the socket address. Production is 2 (Cloudflare, then
   *  Railway's edge); 1 would see Cloudflare's address (README "Environment"). */
  trustProxyHops: number;
  logLevel: string;
  diagnosticsLimitPerIpHour: number;
  diagnosticsLimitGlobalHour: number;
};

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`${name} is required (README "Environment")`);
  return v;
}

function nonNegativeInt(env: NodeJS.ProcessEnv, name: string, fallback: number, min = 0): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d{1,9}$/.test(raw) || Number(raw) < min) throw new Error(`${name} must be an integer >= ${min}, got "${raw}"`);
  return Number(raw);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const adminToken = required(env, 'ADMIN_TOKEN');
  if (adminToken.length < ADMIN_TOKEN_MIN_CHARS) {
    throw new Error(`ADMIN_TOKEN must be at least ${ADMIN_TOKEN_MIN_CHARS} characters (got ${adminToken.length}); generate one with: openssl rand -base64 32`);
  }
  return {
    port: nonNegativeInt(env, 'PORT', 3000),
    host: env.LISTEN_HOST || '0.0.0.0',
    databaseUrl: required(env, 'DATABASE_URL'),
    adminToken,
    trustProxyHops: nonNegativeInt(env, 'TRUST_PROXY', 0),
    logLevel: env.LOG_LEVEL || 'info',
    diagnosticsLimitPerIpHour: nonNegativeInt(env, 'DIAGNOSTICS_LIMIT_PER_IP_HOUR', LIMITS.diagnostics_per_ip.limit, 1),
    diagnosticsLimitGlobalHour: nonNegativeInt(env, 'DIAGNOSTICS_LIMIT_GLOBAL_HOUR', LIMITS.diagnostics_global.limit, 1),
  };
}

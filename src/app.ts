// The Fastify app. buildApp() takes its dependencies explicitly.

import type { ServerOptions } from 'node:http';
import { isIP } from 'node:net';
import Fastify, { type FastifyBaseLogger, type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { registerDiagnostics } from './diagnostics.js';
import { DIAGNOSTICS_BODY_BYTES, SMALL_BODY_BYTES } from './limits.js';
import { ValidationError } from './validate.js';

export type Deps = {
  db: Db;
  config: Config;
  now: () => Date;
  logger?: FastifyBaseLogger | FastifyServerOptions['logger'];
};

declare module 'fastify' {
  interface FastifyContextConfig {
    bodyBudget?: 'SMALL_BODY_BYTES' | 'DIAGNOSTICS_BODY_BYTES';
  }
  interface FastifyRequest {
    /** The per-IP rate-limit key (`limitKey`). */
    clientIp: string;
  }
}

const BODY_BUDGETS = { SMALL_BODY_BYTES, DIAGNOSTICS_BODY_BYTES };

/** Logs carry the method and path only: never a query string, a body, or the
 *  authorization header. */
export function logger(level: string): FastifyServerOptions['logger'] {
  return {
    level,
    redact: { paths: ['req.headers.authorization'], remove: true },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, path: (req.url ?? '').split('?')[0] };
      },
    },
  };
}

/** The per-IP limit key: an IPv4 address as is, an IPv6 address as its /64
 *  (one household's whole prefix), an IPv4-mapped IPv6 address as its IPv4. */
export function limitKey(ip: string): string {
  if (isIP(ip) !== 6) return ip;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1]!;
  const norm = new URL(`http://[${ip.split('%')[0]}]`).hostname.slice(1, -1);
  const [head, tail = ''] = norm.split('::');
  const left = head ? head.split(':') : [];
  const right = norm.includes('::') && tail ? tail.split(':') : [];
  const groups = norm.includes('::') ? [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right] : left;
  return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':') + '::/64';
}

/** Node's strict HTTP/1.1 parser, pinned even if --insecure-http-parser is set
 *  (request smuggling). */
const STRICT_HTTP: ServerOptions = { insecureHTTPParser: false };

export function buildApp(deps: Deps): FastifyInstance {
  const hops = deps.config.trustProxyHops;
  const app = Fastify({
    logger: deps.logger ?? false,
    trustProxy: hops > 0 ? (_addr: string, hop: number) => hop < hops : false,
    bodyLimit: SMALL_BODY_BYTES,
    http: STRICT_HTTP,
  });

  app.decorateRequest('clientIp', '');
  app.addHook('onRequest', async (req) => {
    req.clientIp = limitKey(req.ip);
  });
  app.addHook('onSend', async (_req, reply) => {
    if (!reply.hasHeader('x-content-type-options')) reply.header('x-content-type-options', 'nosniff');
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ValidationError) {
      return reply.code(400).send({ error: 'bad_request', field: err.field, reason: err.reason });
    }
    const e = err as { statusCode?: number; code?: string; observed?: number };
    if (e.code === 'FST_ERR_CTP_BODY_TOO_LARGE' || e.statusCode === 413) {
      const budget = req.routeOptions.config.bodyBudget ?? 'SMALL_BODY_BYTES';
      return reply.code(413).send({
        error: 'body_too_large',
        budget,
        configured: BODY_BUDGETS[budget],
        observed: typeof e.observed === 'number' ? e.observed : Number(req.headers['content-length'] ?? -1),
        fix: 'src/limits.ts',
      });
    }
    if (e.code === 'FST_ERR_CTP_INVALID_JSON_BODY' || e.code === 'FST_ERR_CTP_EMPTY_JSON_BODY' || e.statusCode === 415) {
      return reply.code(400).send({ error: 'bad_request', field: 'body', reason: 'invalid JSON' });
    }
    if (e.code === 'FST_ERR_CTP_INVALID_CONTENT_LENGTH') {
      return reply.code(400).send({ error: 'bad_request', field: 'body', reason: 'not valid UTF-8 JSON (body length did not match Content-Length)' });
    }
    // Any other client error Fastify raised keeps its 4xx.
    if (e.code?.startsWith('FST_') && typeof e.statusCode === 'number' && e.statusCode >= 400 && e.statusCode < 500) {
      return reply.code(e.statusCode).send({ error: 'bad_request', code: e.code });
    }
    req.log.error({ err, event: 'unhandled_error' }, 'unhandled error');
    return reply.code(500).send({ error: 'internal' });
  });

  // Process up and database reachable.
  app.get('/health', async (req, reply) => {
    try {
      await deps.db.query('SELECT 1');
      return { ok: true, db: true };
    } catch (e) {
      req.log.error({ event: 'health_db_unreachable', err: e instanceof Error ? e.message : String(e) }, 'health: database unreachable');
      return reply.code(503).send({ ok: false, db: false });
    }
  });

  registerDiagnostics(app, deps);
  return app;
}

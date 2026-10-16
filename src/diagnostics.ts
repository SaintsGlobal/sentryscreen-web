// Diagnostic reports.
//
//   POST /v1/diagnostics          one report the Mac owner reviewed and chose to
//                                 send; JSON, optionally gzip-encoded. Answers
//                                 200 {ok:true, stored:true, id}.
//   GET  /admin/diagnostics       newest first, without report bodies
//                                 (?since=<iso>&limit=<n ≤ DIAGNOSTICS_LIST_MAX>)
//   GET  /admin/diagnostics/:id   one report in full
//
// The report is built on the Mac from an allowlist and redacted there; this
// server validates the envelope, stores the report as it came, and calls out
// to nothing.
//
// gzip: Fastify does not read Content-Encoding, so this route installs its own
// application/json parser inside an encapsulated plugin (every other route
// keeps the default). The inflated size is bounded twice: the gzip trailer's
// declared size is checked before inflating, and zlib's maxOutputLength
// enforces the same budget if the trailer lies. Both are the 413 that names
// DIAGNOSTICS_BODY_BYTES (src/app.ts).

import { timingSafeEqual } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Deps } from './app.js';
import { DIAGNOSTICS_BODY_BYTES, DIAGNOSTICS_LIST_MAX } from './limits.js';
import { DbRateLimiter, rateLimitBody } from './ratelimit.js';
import { asObject, int, MACOS_RE, oneOf, rejectUnknownFields, str, UUID_RE, ValidationError, VERSION_RE } from './validate.js';

const FIELDS = ['machine_id', 'app_version', 'app_build', 'os_version', 'arch', 'channel', 'reason', 'created_at', 'report'] as const;
const REASONS = ['manual'] as const;
const LIST_COLUMNS = 'id, received_at, machine_id, app_version, app_build, os_version, arch, channel, reason, created_at, bytes';

/** The parsed body and its size after inflation (the `bytes` column). */
type ParsedBody = { json: unknown; bytes: number };

/** A body over DIAGNOSTICS_BODY_BYTES once inflated; `observed` is the
 *  inflated size, which the 413 reports instead of Content-Length. */
export class InflatedBodyTooLarge extends Error {
  readonly statusCode = 413;
  constructor(readonly observed: number) {
    super(`inflated body ${observed} B over DIAGNOSTICS_BODY_BYTES ${DIAGNOSTICS_BODY_BYTES}`);
    this.name = 'InflatedBodyTooLarge';
  }
}

function parseDiagnosticsBody(encoding: string | undefined, raw: Buffer): ParsedBody {
  let body = raw;
  if (encoding !== undefined && encoding !== 'identity') {
    if (encoding !== 'gzip') throw new ValidationError('content-encoding', 'must be gzip or absent');
    // gzip magic first: the last four bytes of a non-gzip body are not a size.
    if (raw.length < 18 || raw[0] !== 0x1f || raw[1] !== 0x8b) throw new ValidationError('body', 'invalid gzip');
    // RFC 1952 ISIZE: the inflated length, little-endian, in the last 4 bytes.
    const declared = raw.readUInt32LE(raw.length - 4);
    if (declared > DIAGNOSTICS_BODY_BYTES) throw new InflatedBodyTooLarge(declared);
    try {
      body = gunzipSync(raw, { maxOutputLength: DIAGNOSTICS_BODY_BYTES });
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_BUFFER_TOO_LARGE') throw new InflatedBodyTooLarge(DIAGNOSTICS_BODY_BYTES + 1);
      throw new ValidationError('body', 'invalid gzip');
    }
  }
  if (body.length === 0) throw new ValidationError('body', 'invalid JSON');
  try {
    return { json: JSON.parse(body.toString('utf8')), bytes: body.length };
  } catch {
    throw new ValidationError('body', 'invalid JSON');
  }
}

function bearerOk(header: string | undefined, token: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice(7));
  const want = Buffer.from(token);
  return given.length === want.length && timingSafeEqual(given, want);
}

export function registerDiagnostics(app: FastifyInstance, deps: Deps): void {
  const perIp = new DbRateLimiter(deps.db, 'diagnostics_per_ip', deps.config.diagnosticsLimitPerIpHour);
  const global = new DbRateLimiter(deps.db, 'diagnostics_global', deps.config.diagnosticsLimitGlobalHour);
  const adminPerIp = new DbRateLimiter(deps.db, 'admin_diagnostics_per_ip');

  void app.register(async (sub) => {
    sub.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req: FastifyRequest, raw: Buffer, done) => {
      try {
        done(null, parseDiagnosticsBody(req.headers['content-encoding'], raw));
      } catch (e) {
        done(e as Error, undefined);
      }
    });

    sub.post('/v1/diagnostics', { bodyLimit: DIAGNOSTICS_BODY_BYTES, config: { bodyBudget: 'DIAGNOSTICS_BODY_BYTES' } }, async (req, reply) => {
      const now = deps.now();
      const nowMs = now.getTime();
      const ipVerdict = await perIp.hit(req.clientIp, nowMs);
      if (!ipVerdict.allowed) return reply.code(429).header('retry-after', ipVerdict.retry_after_s).send(rateLimitBody(ipVerdict));

      const { json, bytes } = req.body as ParsedBody;
      const body = asObject(json);
      rejectUnknownFields(body, FIELDS);
      const machineId = str(body, 'machine_id', UUID_RE, 36).toLowerCase();
      const appVersion = str(body, 'app_version', VERSION_RE, 32);
      const appBuild = int(body, 'app_build', 0, 2_147_483_647);
      const osVersion = str(body, 'os_version', MACOS_RE, 7);
      const arch = oneOf(body, 'arch', ['arm64', 'x86_64']);
      const channel = oneOf(body, 'channel', ['stable', 'dev']);
      const reason = oneOf(body, 'reason', REASONS);
      // Unix seconds from the client's clock, up to 2100-01-01: a parser guard.
      const createdAt = int(body, 'created_at', 0, 4_102_444_800);
      const report = body.report;
      if (!report || typeof report !== 'object' || Array.isArray(report)) throw new ValidationError('report', 'must be a JSON object');

      // After validation, so a body that is not a report cannot spend the
      // global budget.
      const v = await global.hit('all', nowMs);
      if (!v.allowed) {
        req.log.warn({ event: 'diagnostics_rate_limited', limit: v.name, configured: v.configured, observed: v.observed }, 'diagnostics: rate limited');
        return reply.code(429).header('retry-after', v.retry_after_s).send(rateLimitBody(v));
      }

      const r = await deps.db.query<{ id: string }>(
        `INSERT INTO diagnostics (received_at, machine_id, app_version, app_build, os_version, arch, channel, reason, created_at, bytes, report)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9), $10, $11) RETURNING id`,
        [now, machineId, appVersion, appBuild, osVersion, arch, channel, reason, createdAt, bytes, JSON.stringify(report)],
      );
      const id = r.rows[0]!.id;
      req.log.info({ event: 'diagnostics_received', reason, machine_id8: machineId.slice(0, 8), app_build: appBuild, bytes }, 'diagnostics received');
      return reply.send({ ok: true, stored: true, id });
    });
  });

  const adminGate = async (req: FastifyRequest, reply: FastifyReply): Promise<boolean> => {
    const v = await adminPerIp.hit(req.clientIp, deps.now().getTime());
    if (!v.allowed) {
      await reply.code(429).header('retry-after', v.retry_after_s).send(rateLimitBody(v));
      return false;
    }
    if (!bearerOk(req.headers.authorization, deps.config.adminToken)) {
      req.log.warn({ event: 'admin_unauthorized' }, 'admin/diagnostics: bad or missing bearer token');
      await reply.code(401).send({ error: 'unauthorized' });
      return false;
    }
    return true;
  };

  app.get<{ Querystring: Record<string, unknown> }>('/admin/diagnostics', async (req, reply) => {
    if (!(await adminGate(req, reply))) return;
    const q = req.query;
    rejectUnknownFields(q, ['since', 'limit']);
    let since: Date | null = null;
    if (q.since !== undefined) {
      const ms = typeof q.since === 'string' ? Date.parse(q.since) : NaN;
      if (Number.isNaN(ms)) throw new ValidationError('since', 'must be an ISO 8601 timestamp');
      since = new Date(ms);
    }
    let limit = DIAGNOSTICS_LIST_MAX / 4;
    if (q.limit !== undefined) {
      const n = typeof q.limit === 'string' && /^\d{1,6}$/.test(q.limit) ? Number(q.limit) : NaN;
      if (!Number.isInteger(n) || n < 1) throw new ValidationError('limit', 'must be a positive integer');
      if (n > DIAGNOSTICS_LIST_MAX) {
        throw new ValidationError('limit', `over budget DIAGNOSTICS_LIST_MAX: configured ${DIAGNOSTICS_LIST_MAX}, observed ${n}; page with since=<received_at of the last row>`);
      }
      limit = n;
    }
    const rows = since
      ? (await deps.db.query(`SELECT ${LIST_COLUMNS} FROM diagnostics WHERE received_at >= $1 ORDER BY received_at DESC LIMIT $2`, [since, limit])).rows
      : (await deps.db.query(`SELECT ${LIST_COLUMNS} FROM diagnostics ORDER BY received_at DESC LIMIT $1`, [limit])).rows;
    return reply.send({ count: rows.length, limit, since: since?.toISOString() ?? null, reports: rows });
  });

  app.get<{ Params: { id: string } }>('/admin/diagnostics/:id', async (req, reply) => {
    if (!(await adminGate(req, reply))) return;
    const id = req.params.id;
    if (!UUID_RE.test(id)) throw new ValidationError('id', 'invalid');
    const row = (await deps.db.query(`SELECT ${LIST_COLUMNS}, report FROM diagnostics WHERE id = $1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return reply.send(row);
  });
}

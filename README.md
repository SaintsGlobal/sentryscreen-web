# SentryScreen web

The website and the diagnostics receiver for
[SentryScreen](https://github.com/SaintsGlobal/sentryscreen), a free,
open-source macOS app that covers explicit images on screen, on device.

- `site/`: the static public website (plain HTML and CSS, no build step).
- `src/`: a small Node server that receives diagnostic reports a Mac owner
  chooses to send, and lets the operator read them.
- `docs/`: site and design rules (`SITE.md`, `DESIGN.md`).

## The server

| Route | Who | What |
|---|---|---|
| `GET /health` | anyone | `200 {"ok":true,"db":true}` when the process is up and Postgres answers, `503` otherwise |
| `POST /v1/diagnostics` | the app | stores one report; answers `200 {"ok":true,"stored":true,"id":"<uuid>"}` |
| `GET /admin/diagnostics` | operator | newest reports first, without bodies; `?since=<ISO 8601>&limit=<1..200>` (default 50) |
| `GET /admin/diagnostics/:id` | operator | one report in full |

Admin routes take `Authorization: Bearer $ADMIN_TOKEN`:

```bash
curl -A "" -H "authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/admin/diagnostics
```

### Report envelope

`POST /v1/diagnostics`, `Content-Type: application/json`, optionally
`Content-Encoding: gzip`. Fields (any other field is a `400` naming it):

| Field | Rule |
|---|---|
| `machine_id` | UUID, a random report number made fresh for each report |
| `app_version` | `[0-9A-Za-z.+-]`, up to 32 chars |
| `app_build` | integer ≥ 0 |
| `os_version` | `major.minor` |
| `arch` | `arm64` or `x86_64` |
| `channel` | `stable` or `dev` |
| `reason` | `manual` |
| `created_at` | Unix seconds, client clock |
| `report` | JSON object, stored as sent |

Refusals name what failed: `400 {"error":"bad_request","field","reason"}`,
`413 {"error":"body_too_large","budget","configured","observed"}` (384 KiB after
gunzip), and `429 {"error":"rate_limited","limit","configured","window_s","observed","retry_after_s"}`
with a `Retry-After` header. Rate limits (`src/limits.ts`): 60 per IP per hour
(an IPv6 client counts by /64) and 120 per hour for the whole server. A flood
can fill the global limit and delay real reports for up to an hour, which is
acceptable at this volume.

### Diagnostics privacy contract

- The app sends a report only after the Mac owner has reviewed it and
  explicitly approved sending it. Nothing is sent automatically, and the app
  sends no `User-Agent` header.
- The app builds the report from an allowlist and redacts it on the Mac. It
  never contains screen content, images, detections, window titles or
  application names.
- The send is one-way: the server stores the report and answers with an id.
  It calls out to nothing and sends nothing back to the app.
- Reports are deleted 90 days after they arrive, by an hourly pass. Closed
  rate-limit windows are deleted by the same pass; their keys are stored only
  as SHA-256 hashes.
- Logs carry the method, path, reason, the first 8 characters of the machine
  id, the app build and the size: never a query string, a body, a report or
  the authorization header.

## Run locally

Needs Node 22.6+ and Postgres 14+.

```bash
npm install
createdb sentryscreen
cp .env.example .env              # set DATABASE_URL and ADMIN_TOKEN
set -a; . ./.env; set +a
npm run dev                       # migrates, then listens on PORT
curl -A "" http://localhost:3000/health
```

`npm run typecheck` checks the code; `npm run build && npm start` runs the
compiled server. The `Dockerfile` builds a production image.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | required | Postgres connection string |
| `ADMIN_TOKEN` | required | bearer for `/admin/*`, at least 32 characters (`openssl rand -base64 32`) |
| `PORT` | `3000` | listen port |
| `LISTEN_HOST` | `0.0.0.0` | listen address |
| `TRUST_PROXY` | `0` | reverse-proxy hops whose `X-Forwarded-For` entry is trusted for the client IP; `0` uses the socket address. Production is `2`: Cloudflare proxies `api.sentry-screen.com` (`server: cloudflare`, `cf-ray`) in front of Railway's edge, so the client is two hops back; `1` would rate-limit by Cloudflare's address |
| `LOG_LEVEL` | `info` | pino log level |
| `DIAGNOSTICS_LIMIT_PER_IP_HOUR` | `60` | rate-limit override |
| `DIAGNOSTICS_LIMIT_GLOBAL_HOUR` | `120` | rate-limit override |

The schema is `migrations/001_init.sql`, applied at startup (and by
`npm run migrate`).

## License

GNU Affero General Public License v3.0 (`LICENSE`). If you run a modified
version of this server for others, the AGPL requires you to offer them its
source.

# CLAUDE.md

Guidance for contributors and coding agents. `README.md` has the routes,
environment and privacy contract.

- Keep it small. The server does three things: `/health`, receive diagnostic
  reports, and the bearer-token admin read. Do not add features that are not
  essential; delete what nothing depends on.
- The diagnostics wire format, limits and responses are a contract with the
  app (README "Report envelope"). Change them only together with the app.
- Privacy: never store or log a license key, query string, body, report or
  authorization header. The server calls out to nothing.
- No `User-Agent`: our scripts and curl calls send none (`curl -A ""`).
- Every limit lives in `src/limits.ts` and its refusal names the limit, the
  configured value and the observed value.
- Schema changes are new files in `migrations/`, applied in name order.
- Check: `npm run typecheck`.
- `site/` is static HTML and CSS with no third-party scripts or analytics.
- License: AGPL-3.0.

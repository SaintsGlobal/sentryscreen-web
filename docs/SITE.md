# SentryScreen site

The public website: plain static HTML and one hand-written stylesheet. No
build step, no framework, no third-party scripts, fonts or analytics, and
every page works without JavaScript. Design rules: `DESIGN.md`.

## Files

```
site/                  the Cloudflare Pages output directory; everything here is public
  index.html           home: what it does, setup, limits, download, questions
  privacy/index.html   privacy statement (diagnostic reports, what the server keeps)
  support/index.html   GitHub Issues, diagnostic reports, the support address
  404.html             served by Pages for unknown paths
  styles.css           the whole stylesheet
  theme.js             paper room / night room switch (every page, in <head>)
  menu.js              closes the mobile Menu on Escape, outside click or a followed link
  hero.js              the hero room's motion and pause control (home)
  demos.js             runs the "What it does" loops while on screen (home)
  support.js           shows the support address on request (support)
  art/  fonts/  favicon.svg
  _headers             CSP (this origin only), nosniff, no referrer, HSTS
  _redirects           removed pages → the nearest page that still exists
  robots.txt  sitemap.xml  .well-known/security.txt
design/                generators for the drawings and colour tokens (not deployed)
site-check/            stamp-assets.sh and a small link/asset check (not deployed)
```

Downloads and release notes live on GitHub Releases
(`https://github.com/SaintsGlobal/sentryscreen/releases`); the site only links
there.

## Editing

- After changing `styles.css` or any `site/*.js`: `bash site-check/stamp-assets.sh`
  (adds `?v=<hash>` so browsers never pair new HTML with an old asset).
- After changing a drawing or a colour: `node design/build-hero.mjs` and
  `node design/build-figures.mjs`, then stamp. Edit the generators, never the
  generated regions (`hero-scene`, `theme`, `fig:*`).
- The privacy page must match what the app sends and what the server keeps
  (`src/limits.ts` `DIAGNOSTICS_RETENTION_DAYS`).

## Preview locally

```bash
bash site-check/check.sh
cd site && python3 -m http.server 8080    # then open http://localhost:8080/
```

The local server does not apply `_headers` or `_redirects`.

## Deploy (manual)

Cloudflare Pages project with no Git integration; output directory `site`, no
build command. From a clean checkout of `main`:

```bash
bash site-check/check.sh
WRANGLER_SEND_METRICS=false npx --yes wrangler@4 pages deploy site \
  --project-name <pages-project> --branch main --commit-hash "$(git rev-parse HEAD)"
```

Deploying and DNS are maintainer steps.

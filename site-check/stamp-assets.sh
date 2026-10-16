#!/usr/bin/env bash
# Stamp every stylesheet/script reference in site/**/*.html with ?v=<hash of
# the file> so a changed asset gets a new URL. Cloudflare serves Pages assets
# with max-age=14400 whatever _headers says, so without the stamp a browser
# can pair new HTML with an old stylesheet. Run after editing styles.css or
# any site/*.js.
set -euo pipefail
cd "$(dirname "$0")/../site"
for asset in *.css *.js; do
  v=$(md5 -q "$asset" 2>/dev/null || md5sum "$asset" | cut -c1-32); v=${v:0:8}
  find . -name '*.html' -print0 | xargs -0 perl -pi -e "s{\"/\Q$asset\E(\\?v=[0-9a-f]{8})?\"}{\"/$asset?v=$v\"}g"
done
echo "stamp-assets: done"

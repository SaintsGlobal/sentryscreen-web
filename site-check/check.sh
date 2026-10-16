#!/usr/bin/env bash
# A small sanity check for site/: every local link and asset exists, every
# asset stamp is current (run stamp-assets.sh to fix), and no page loads
# anything from another origin.  bash site-check/check.sh
set -u
cd "$(dirname "$0")/../site" || exit 2
fail=0
for page in $(find . -name '*.html'); do
  for ref in $(grep -oE '(href|src)="/[^"#]*' "$page" | sed -E 's/^(href|src)="//'); do
    path=${ref%%\?*}
    case "$path" in */) path="${path}index.html" ;; esac
    [ -e ".$path" ] || grep -qE "^${ref%%\?*}[[:space:]]" _redirects || { echo "FAIL $page: $ref not found"; fail=1; }
    case "$ref" in *.css\?v=*|*.js\?v=*)
      v=$(md5 -q ".$path" 2>/dev/null || md5sum ".$path" | cut -c1-32)
      [ "${ref##*v=}" = "${v:0:8}" ] || { echo "FAIL $page: $ref stamp is stale (site-check/stamp-assets.sh)"; fail=1; } ;;
    *.css|*.js) echo "FAIL $page: $ref has no ?v= stamp (site-check/stamp-assets.sh)"; fail=1 ;;
    esac
  done
  # rel="canonical" names this page's own address; it loads nothing.
  if grep -E '<(script|link)[^>]+(src|href)="https?://' "$page" | grep -qv 'rel="canonical"'; then
    echo "FAIL $page: loads a script or stylesheet from another origin"; fail=1
  fi
done
[ "$fail" = 0 ] && echo "site-check: ok"
exit "$fail"

#!/usr/bin/env bash
# Renders design/og.html with headless Chrome into the link-preview image
# (site/og/sentryscreen-og.jpg, 1200x630) and the home-screen icon
# (site/apple-touch-icon.png, 180x180, and favicon.ico from it). macOS; run after a drawing changes.
#   bash design/build-og.sh
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
PORT=${PORT:-8139}
tmp=$(mktemp -d)
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
server=$!
trap 'kill "$server"; rm -rf "$tmp"' EXIT
sleep 1
shot() { # url size out
  "$CHROME" --headless=new --hide-scrollbars --virtual-time-budget=3000 \
    --window-size="$2" --screenshot="$3" "$1" 2>/dev/null
}
mkdir -p site/og
shot "http://127.0.0.1:$PORT/design/og.html" 1200,630 "$tmp/og.png"
sips -s format jpeg -s formatOptions 85 "$tmp/og.png" --out site/og/sentryscreen-og.jpg >/dev/null
shot "http://127.0.0.1:$PORT/design/og.html#icon" 180,180 "$PWD/site/apple-touch-icon.png"
# /favicon.ico: what chat apps and old browsers ask for without reading the page.
sips -z 32 32 -s format ico site/apple-touch-icon.png --out site/favicon.ico >/dev/null
# WhatsApp drops previews over about 300 KB.
size=$(stat -f %z site/og/sentryscreen-og.jpg)
[ "$size" -lt 300000 ] || { echo "og image is $size B, over the 300000 B budget (design/build-og.sh)"; exit 1; }
echo "og: $size B; icon: $(stat -f %z site/apple-touch-icon.png) B"

// The home page hero: a hand-inked living room with the Detector (Lantern,
// chosen 2026-09-27) standing by the desk, and the site's colour
// tokens.
//
//   node design/build-hero.mjs
//
// Rewrites two generated regions in site/ (there is still no site build step:
// the output is committed, like the ?v= stamps of site-check/stamp-assets.sh):
//   site/index.html  between <!-- hero-scene:start --> and <!-- hero-scene:end -->
//   site/styles.css  between / * theme:start * / and / * theme:end * /: the
//                    interface tokens (design/theme.mjs) and the drawing
//                    palette (design/palette.mjs), for the paper room and the
//                    night room
// Run it after changing this file, theme.mjs, detector.mjs, ink.mjs or
// palette.mjs, then site-check/stamp-assets.sh and site-check/check.sh.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setBoil, setPrecision, ink, blob, inkLine, inkPoly, roundP, ellP, arcP, rectP, star4, g, tr, num, pathD } from "./ink.mjs";
import { lantern, kid, defs } from "./detector.mjs";
import { DAY, NIGHT, ROOM_DAY, ROOM_NIGHT, ROOM_NAMES, PAINT_NAMES } from "./palette.mjs";
import { UI_DAY, UI_NIGHT, themeCss, nightRule } from "./theme.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, "..", "site");
mkdirSync(join(site, "art"), { recursive: true });

// ---------------------------------------------------------------- the room (drawn on 0 0 900 640)
// The wall/floor seam is at y = 520; everything below it stands on the floor,
// in front of the wall. The wall itself is CSS (the sparkle wallpaper: the
// frame's background under 900 px, the hero's own wall from 900 px); the
// floor is drawn here. The picture shows y 40-640 (VIEW), so the curtain rail
// sits just inside the top edge.
const VIEW = "0 40 900 600";

// The floor runs FLOOR_RUN units past both sides of the picture. From 900 px
// the room is not framed (styles.css .hero-scene): the floor shows outside
// the picture, under the hero copy, and the hero clips it at the window's
// edges. Under 900 px the frame clips it.
// Receipt (2026-09-27, derived from the layout): the longest run needed is
// left of the room, about 1300 units at 2560 px wide and 1900 at 3840 px
// (room capped at 60rem, copy 38rem, gap 3rem), and about 1150 at 1440 px
// with 200% text (measured: the room 632 px wide at x 808). 2400 covers
// windows up to about 5000 px wide; past that the wall would show at the
// floor's far ends.
const FLOOR_RUN = 2400;

function floor() {
  const L = -10 - FLOOR_RUN, R = 910 + FLOOR_RUN, W = R - L;
  let s = `<rect class="k-wood" x="${L}" y="520" width="${W}" height="130"/>`;
  s += `<rect class="k-wood-light" x="${L}" y="520" width="${W}" height="16"/>`;
  // Outside the picture the plank joints repeat as a pattern (one 180-unit
  // period of the three rows) and the long lines go on coarser (a point every
  // 180 units), so the run costs a few KB, not tens.
  let joints = "";
  [[70, 568], [160, 600], [20, 632]].forEach(([x, y], i) => {
    joints += inkLine(x, y - 566, x + 1, y - 538, { lw: 2.6, seed: 1860 + i, stroke: "l-wood-dark" });
  });
  s += `<pattern id="room-joints" patternUnits="userSpaceOnUse" x="0" y="536" width="180" height="96">${joints}</pattern>`;
  s += `<rect fill="url(#room-joints)" x="${L}" y="536" width="${FLOOR_RUN}" height="96"/>`;
  s += `<rect fill="url(#room-joints)" x="910" y="536" width="${FLOOR_RUN}" height="96"/>`;
  s += run(inkLine(-10, 536, 910, 537, { lw: 3.5, seed: 1790 }), L, R);
  [568, 600, 632].forEach((y, i) => {
    s += run(inkLine(-10, y, 910, y + (i - 1) * 1.2, { lw: 3, seed: 1800 + i, stroke: "l-wood-dark" }), L, R);
    [[70, 250, 430, 610, 790], [160, 340, 520, 700, 880], [20, 200, 380, 560, 740]][i].forEach((x, j) => {
      s += inkLine(x, y - 30, x + 1, y - 2, { lw: 2.6, seed: 1810 + i * 5 + j, stroke: "l-wood-dark" });
    });
  });
  s += run(inkLine(-10, 520, 910, 520, { lw: 5, seed: 1791 }), L, R);
  return s;
}

// A floor line inside the picture, carried on to x = L on the left and x = R
// on the right: each of its strokes (ink() draws two) gets a coarse, gently
// wobbling path that starts exactly where that stroke ends, so the joins at
// the picture's edges do not step.
function run(line, L, R) {
  let out = line;
  for (const [, attrs, d] of line.matchAll(/<path ([^>]*?)d="([^"]+)"\/>/g)) {
    const start = d.match(/^M(-?[\d.]+) (-?[\d.]+)/).slice(1).map(Number);
    const end = d.match(/L(-?[\d.]+) (-?[\d.]+)$/).slice(1).map(Number);
    const wob = (x0, y0, x1, sd) => {
      const n = Math.ceil(Math.abs(x1 - x0) / 180), pts = [[x0, y0]];
      for (let k = 1; k <= n; k++) pts.push([x0 + ((x1 - x0) * k) / n, y0 + (k < n ? Math.sin(k * 2.3 + sd) * 1.1 : 0)]);
      return `<path ${attrs}d="${pathD(pts, false)}"/>`;
    };
    out += wob(start[0], start[1], L, 0.7) + wob(end[0], end[1], R, 1.9);
  }
  return out;
}

function windowWithCurtains() {
  let s = "";
  // the glass: day sky or night sky, clipped to the pane
  const glass = rectP(96, 96, 178, 208);
  s += `<clipPath id="room-glass">${ink(glass, { fill: "sky", lw: 0, seed: 1001 }).replace(/class="[^"]*"/, "")}</clipPath>`;
  s += ink(rectP(80, 80, 210, 240), { fill: "wood-light", lw: 6, seed: 1000, step: 40 });
  s += g(
    g(`<rect class="k-sky" x="80" y="80" width="220" height="240"/>` +
      `<circle class="k-sun" cx="236" cy="138" r="18"/>` +
      ink(ellP(140, 176, 30, 12, 14), { fill: "cloud", lw: 0, seed: 1002 }) + ink(ellP(162, 166, 22, 12, 12), { fill: "cloud", lw: 0, seed: 1003 }) +
      ink(ellP(226, 250, 26, 10, 12), { fill: "cloud", lw: 0, seed: 1004 }), `class="day-only"`) +
    g(`<rect class="k-night-sky" x="80" y="80" width="220" height="240"/>` +
      `<path class="k-moon" d="M246 118a26 26 0 1 0 14 44a21 21 0 1 1 -14 -44z"/>` +
      star4(128, 132, 7, "moon", 0.2) + star4(170, 226, 5, "moon", -0.2) + star4(122, 262, 4, "moon") + star4(214, 280, 6, "moon", 0.3), `class="night-only"`),
    `clip-path="url(#room-glass)"`);
  s += ink(glass, { lw: 4, seed: 1001 });
  s += ink(rectP(180, 96, 10, 208), { fill: "wood-light", lw: 3.5, seed: 1005, step: 40 });
  s += ink(rectP(96, 195, 178, 10), { fill: "wood-light", lw: 3.5, seed: 1006, step: 40 });
  s += ink(roundP(64, 316, 242, 16, 4), { fill: "wood", lw: 5, seed: 1007, step: 40 });
  // curtains, tied back, on a rail
  const left = [[50, 64], [122, 64], [128, 170], [104, 238], [124, 336], [64, 346], [52, 240], [58, 150]];
  const right = left.map(([x, y]) => [370 - x, y]);
  [left, right].forEach((c, i) => {
    s += ink(c, { fill: "maroon", lw: 5, seed: 1010 + i * 7, step: 30 });
    const sd = i ? -1 : 1, x0 = i ? 370 - 70 : 70;
    s += inkPoly([[x0, 70], [x0 + sd * 4, 160], [x0 - sd * 4, 230]], { lw: 2.5, seed: 1011 + i * 7, stroke: "l-maroon-dark" });
    s += inkPoly([[x0 + sd * 24, 70], [x0 + sd * 30, 150], [x0 + sd * 18, 232]], { lw: 2.5, seed: 1012 + i * 7, stroke: "l-maroon-dark" });
    s += ink(roundP(i ? 238 : 94, 230, 38, 14, 6), { fill: "mustard", lw: 3.5, seed: 1013 + i * 7, step: 12 });
  });
  s += inkLine(36, 60, 334, 60, { lw: 6, seed: 1030 });
  s += ink(ellP(34, 60, 8, 8, 10), { fill: "wood-dark", lw: 3.5, seed: 1031 }) + ink(ellP(336, 60, 8, 8, 10), { fill: "wood-dark", lw: 3.5, seed: 1032 });
  return s;
}

function pictureFrame(x, y, w, h) {
  let s = "";
  s += inkLine(x + w * 0.3, y, x + w / 2, y - 34, { lw: 2.5, seed: 1103 }) + inkLine(x + w * 0.7, y, x + w / 2, y - 34, { lw: 2.5, seed: 1104 });
  s += `<circle class="k-ink" cx="${x + w / 2}" cy="${y - 34}" r="4.5"/>`;
  s += ink(rectP(x, y, w, h), { fill: "frame", lw: 6, seed: 1100, step: 40 });
  s += `<clipPath id="room-pic">${ink(rectP(x + 14, y + 14, w - 28, h - 28), { fill: "sky", lw: 0, seed: 1101 }).replace(/class="[^"]*"/, "")}</clipPath>`;
  s += g(`<rect class="k-sky" x="${x}" y="${y}" width="${w}" height="${h}"/><circle class="k-sun" cx="${x + w * 0.7}" cy="${y + h * 0.38}" r="${h * 0.12}"/>` +
    ink([[x, y + h * 0.75], [x + w * 0.3, y + h * 0.5], [x + w * 0.55, y + h * 0.7], [x + w * 0.8, y + h * 0.54], [x + w, y + h * 0.7], [x + w, y + h], [x, y + h]], { fill: "sage", lw: 3, seed: 1102 }),
  `clip-path="url(#room-pic)"`);
  s += ink(rectP(x + 14, y + 14, w - 28, h - 28), { lw: 4, seed: 1101 });
  return s;
}

function lampLight() {
  // night only: the pool of lamplight on the wall and the desk
  return g(`<ellipse class="room-light" cx="352" cy="330" rx="330" ry="250" fill="url(#room-light)"/>` +
    `<path class="room-cone" d="M318 318L386 318L450 398L254 398Z" fill="url(#room-cone)"/>`, `class="night-only"`);
}

function tableLamp() {
  let s = "";
  s += ink(ellP(352, 396, 30, 7, 14), { fill: "wood-dark", lw: 4, seed: 1200 });
  s += inkLine(352, 392, 352, 316, { lw: 6, seed: 1201 });
  s += ink(ellP(352, 318, 36, 6, 14), { fill: "shade-in", lw: 3, seed: 1202 });
  s += ink([[314, 316], [390, 316], [374, 258], [330, 258]], { fill: "shade", lw: 5, seed: 1203, step: 20 });
  s += inkLine(330, 290, 374, 290, { lw: 2.5, seed: 1204, stroke: "l-maroon-dark" });
  return s;
}

function desk() {
  let s = "";
  s += `<ellipse class="k-shadow" cx="330" cy="566" rx="26" ry="6"/><ellipse class="k-shadow" cx="744" cy="566" rx="26" ry="6"/>`;
  s += ink(rectP(318, 418, 22, 146), { fill: "wood", lw: 5, seed: 1300, step: 40 });
  s += ink(rectP(732, 418, 22, 146), { fill: "wood", lw: 5, seed: 1301, step: 40 });
  s += ink(rectP(600, 418, 132, 56), { fill: "wood-dark", lw: 5, seed: 1302, step: 40 });
  s += ink(roundP(652, 440, 28, 10, 4), { fill: "wood-light", lw: 3, seed: 1303, step: 12 });
  s += ink(roundP(296, 396, 482, 24, 5), { fill: "wood", lw: 6, seed: 1304, step: 44 });
  return s;
}

function monitor() {
  let s = "";
  s += g(`<ellipse class="room-glow" cx="514" cy="284" rx="190" ry="140" fill="url(#room-light)"/>`, `class="night-only"`);
  s += ink(ellP(514, 396, 56, 7, 16), { fill: "bezel", lw: 4, seed: 1400 });
  s += ink(rectP(498, 360, 32, 36), { fill: "bezel", lw: 4, seed: 1401, step: 20 });
  s += ink(roundP(390, 194, 248, 174, 12), { fill: "bezel", lw: 6, seed: 1402, step: 40 });
  s += ink(roundP(404, 208, 220, 142, 5), { fill: "screen", lw: 4, seed: 1403, step: 40 });
  // a page in a browser: a bar with three dots, lines of text, two pictures,
  // one of them under the cover (the product's own slab and words)
  s += `<rect class="k-bar" x="406" y="210" width="216" height="15"/>`;
  [0, 1, 2].forEach((i) => { s += `<circle class="k-${["terracotta", "mustard", "shield"][i]}" cx="${417 + i * 10}" cy="217.5" r="3.2"/>`; });
  s += inkLine(404, 226, 624, 226, { lw: 3, seed: 1404 });
  [[420, 238, 70], [420, 250, 56], [420, 262, 64]].forEach(([x, y, w], i) => { s += `<rect class="k-bar" x="${x}" y="${y}" width="${w}" height="6" rx="3"/>`; });
  s += ink(rectP(420, 276, 80, 56), { fill: "tile-2", lw: 3, seed: 1405, step: 30 });
  s += ink([[420, 320], [446, 300], [466, 314], [484, 302], [500, 314], [500, 332], [420, 332]], { fill: "sage", lw: 0, seed: 1406 });
  s += ink(rectP(514, 238, 96, 64), { fill: "cover", lw: 3.5, seed: 1407, step: 30 });
  s += `<text class="t-cover" x="562" y="274" text-anchor="middle">Content blocked</text>`;
  [[514, 312, 90], [514, 324, 70], [514, 336, 82]].forEach(([x, y, w]) => { s += `<rect class="k-bar" x="${x}" y="${y}" width="${w}" height="6" rx="3"/>`; });
  return s;
}

function stoolAndKid() {
  let s = "";
  s += `<ellipse class="k-shadow" cx="206" cy="574" rx="66" ry="8"/>`;
  s += inkLine(166, 468, 150, 572, { lw: 5, seed: 1500 }) + inkLine(246, 468, 262, 572, { lw: 5, seed: 1501 });
  s += inkLine(192, 468, 188, 562, { lw: 4.5, seed: 1502 }) + inkLine(220, 468, 224, 562, { lw: 4.5, seed: 1503 });
  s += inkLine(158, 526, 254, 526, { lw: 4, seed: 1504 });
  s += ink(roundP(148, 452, 116, 18, 8), { fill: "seat", lw: 5, seed: 1505, step: 30 });
  s += `<g ${tr(206, 452 + 36 * 0.9, 0.9)}>${kid({ look: 1 })}</g>`;
  return s;
}

function plant(x, y, sc) {
  let leaves = "";
  const L = [[-0.9, 1.0, "green"], [0.9, 1.0, "green"], [-0.55, 1.25, "sage"], [0.5, 1.3, "sage"], [-0.2, 1.45, "green"], [0.15, 1.5, "sage"], [-1.25, 0.8, "sage"], [1.2, 0.85, "sage"]];
  L.forEach(([a, l, c], i) => {
    const ang = -Math.PI / 2 + a * 0.75, len = 120 * l * sc;
    const bx = x, by = y - 110 * sc, tx = bx + Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
    leaves += inkLine(bx, by, (bx + tx) / 2, (by + ty) / 2, { lw: 3, seed: 1600 + i, bend: 6 });
    leaves += ink(ellP((bx + tx) / 2 + Math.cos(ang) * len * 0.18, (by + ty) / 2 + Math.sin(ang) * len * 0.18, len * 0.42, 20 * sc, 14, ang), { fill: c, lw: 4, seed: 1620 + i });
  });
  let s = `<ellipse class="k-shadow" cx="${x}" cy="${y + 2}" rx="${62 * sc}" ry="8"/>`;
  s += g(leaves, `class="room-leaves"`);
  s += ink([[x - 62 * sc, y - 118 * sc], [x + 62 * sc, y - 118 * sc], [x + 48 * sc, y], [x - 48 * sc, y]], { fill: "pot", lw: 5, seed: 1640 });
  s += ink(rectP(x - 70 * sc, y - 132 * sc, 140 * sc, 26 * sc), { fill: "pot-rim", lw: 5, seed: 1641 });
  return s;
}

function rug(cx, cy, rx, ry) {
  let s = ink(ellP(cx, cy, rx, ry, 34), { fill: "rug", lw: 5, seed: 1700 });
  s += ink(ellP(cx, cy, rx * 0.8, ry * 0.7, 30), { lw: 2.5, seed: 1701, stroke: "l-rug-shade" });
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    if (Math.abs(Math.cos(a)) < 0.6) continue; // fringe on the two ends only
    s += inkLine(x, y, x + Math.cos(a) * 14, y + Math.sin(a) * 6, { lw: 2.5, seed: 1710 + i });
  }
  return s;
}

function detectorFrames() {
  let frames = "";
  for (let b = 0; b < 3; b++) {
    setBoil(b);
    frames += `<g>${lantern({ pose: "neutral", P: "hero", id: `a${b}`, hero: true })}</g>`;
  }
  setBoil(0);
  return `<ellipse class="k-shadow" cx="728" cy="604" rx="112" ry="11"/>` +
    `<g ${tr(728, 602, 1.28)}><g class="det"><g class="det-boil">${frames}</g></g></g>`;
}

function wallSparkles() {
  return [[836, 262, 10, 0.2], [868, 318, 6, -0.3], [610, 318, 7, 0.1], [262, 40, 6, 0.3]].map(([x, y, s, r]) => star4(x, y, s, "mustard", r, "sparkle")).join("");
}

setBoil(0);
setPrecision(0);
const roomDefs = `<defs>
<radialGradient id="room-light"><stop offset="0" class="st-light" stop-opacity="1"/><stop offset=".55" class="st-light" stop-opacity=".45"/><stop offset="1" class="st-light" stop-opacity="0"/></radialGradient>
<linearGradient id="room-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="st-light" stop-opacity=".9"/><stop offset="1" class="st-light" stop-opacity=".25"/></linearGradient>
</defs>`;

// Composition: the window and the kid on the left, the desk with the lamp
// and the Mac in the middle, and the Detector standing on the floor in front
// of the desk's right end, the largest thing in the room.
const svg = `<svg class="ink-art scene-art" viewBox="${VIEW}" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">` +
  defs("hero") + roomDefs + floor() +
  g(lampLight(), tr(-50, 0)) + g(windowWithCurtains(), tr(-34, 6)) + pictureFrame(604, 156, 128, 96) + wallSparkles() +
  rug(470, 598, 340, 30) + plant(46, 600, 0.5) + g(stoolAndKid(), tr(-36, 0)) + g(desk() + tableLamp() + monitor(), tr(-50, 0)) +
  detectorFrames() + `</svg>`;

// ---------------------------------------------------------------- art files (site/art/)
// Masks are black shapes: styles.css paints them with a token colour through
// mask-image, so one file serves the paper room and the night room.
const black = (m) => m.replace(/class="[^"]*"/g, 'fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round"');
const solid = (m) => m.replace(/class="[^"]*"/g, 'fill="#000"');
function writeArt(name, body) { writeFileSync(join(site, "art", name), body + "\n"); }

// The wallpaper: 4-point sparkles on a 148 px repeat (two rows, offset), as in v2.
{
  let st = "";
  const gap = 74;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const k = r * 97 + c + 3, x = c * gap + (r % 2 ? gap / 2 : 0) + 18, y = r * gap + gap / 2;
    st += star4(x + (Math.sin(k * 3.1) * 6), y + (Math.cos(k * 1.7) * 6), 6.5 + (k % 3), "x", (Math.sin(k) * 0.4));
  }
  writeArt("stars.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="148" height="148" viewBox="0 0 148 148">${solid(st)}</svg>`);
}
// The swash under the hero's key word: one brush stroke.
writeArt("swash.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="24" viewBox="0 0 240 24" preserveAspectRatio="none">${black(inkPoly([[6, 15], [60, 11], [130, 13], [190, 9], [234, 12]], { lw: 8, seed: 1900, amp: 1.2, step: 30 }))}</svg>`);
// Paper grain: warm fractal noise, laid over the room with multiply.
writeArt("grain.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .55 0 0 0 0 .45 0 0 0 0 .33 0 0 0 .55 0"/></filter><rect width="220" height="220" filter="url(#n)"/></svg>`);

// ---------------------------------------------------------------- write the two regions
function replaceRegion(file, start, end, body) {
  const src = readFileSync(file, "utf8");
  const a = src.indexOf(start), b = src.indexOf(end);
  if (a < 0 || b < a) throw new Error(`build-hero: markers ${start} … ${end} not found in ${file}`);
  writeFileSync(file, src.slice(0, a + start.length) + body + src.slice(b));
}

// One token map per room: the interface (theme.mjs) and the drawing palette
// (palette.mjs, as --c-<name>), so the paper/night switch is one block each.
const STROKES = ["glow", "ink", "terracotta", "maroon", "mustard", "mustard-dark", "green", "green-deep", "navy-deep", "teal-deep", "steam", "maroon-dark", "rug-shade", "wood-dark"];
const paint = (P, R, maroonDark) => ({
  "ink-line": P["ink-line"],
  ...Object.fromEntries(PAINT_NAMES.map((n) => [`c-${n}`, P[n]])),
  ...Object.fromEntries(["halo", "halo-green", "beacon"].map((n) => [`c-${n}`, P[n]])),
  ...Object.fromEntries(ROOM_NAMES.map((n) => [`c-${n}`, R[n]])),
  "c-maroon-dark": maroonDark,
});
const TOK_DAY = { ...UI_DAY, ...paint(DAY, ROOM_DAY, "#5f221f") };
const TOK_NIGHT = { ...UI_NIGHT, ...paint(NIGHT, ROOM_NIGHT, "#4a1a17") };

const css = `
/* Generated by design/build-hero.mjs from design/theme.mjs (interface tokens)
   and design/palette.mjs (the drawing palette, docs/DESIGN.md "Drawings"). Do not
   edit by hand. The paper room is the default; the night room applies when
   the reader chose it (theme.js sets data-theme="dark") or when the system is
   dark and the reader did not choose the paper room. */
${themeCss(TOK_DAY, TOK_NIGHT)}
.ink-art .s { stroke: var(--ink-line); stroke-linecap: round; stroke-linejoin: round; }
.ink-art .nf { fill: none; }
${[...PAINT_NAMES, ...ROOM_NAMES].map((n) => `.ink-art .k-${n} { fill: var(--c-${n}); }`).join("\n")}
${STROKES.map((n) => `.ink-art .l-${n} { stroke: var(--c-${n}); }`).join("\n")}
.ink-art .l-ink { stroke: var(--ink-line); }
.ink-art .mark-line { stroke: var(--ink); }
.ink-art .st-halo { stop-color: var(--c-halo); }
.ink-art .st-halo-green { stop-color: var(--c-halo-green); }
.ink-art .st-beacon { stop-color: var(--c-beacon); }
.ink-art .st-light { stop-color: var(--c-light); }
.ink-art .halo { opacity: 0.35; }
.ink-art .halo-strong { opacity: 0.75; }
.ink-art .night-only { display: none; }
${nightRule(".ink-art .halo", "opacity: 1;")}${nightRule(".ink-art .day-only", "display: none;")}${nightRule(".ink-art .night-only", "display: inline;")}`;

replaceRegion(join(site, "index.html"), "<!-- hero-scene:start -->", "<!-- hero-scene:end -->", "\n" + svg + "\n");
replaceRegion(join(site, "styles.css"), "/* theme:start */", "/* theme:end */", css);
console.log(`build-hero: scene ${(svg.length / 1024).toFixed(1)} KB`);

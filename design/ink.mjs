// Hand-inked drawing for SVG: the v2 marketing animations' canvas technique
// ported to SVG strings, so the site can inline the drawings and colour them from CSS.
//
// A shape is a list of points. ink() densifies it, jitters every point by a
// seeded amount, and traces a midpoint-quadratic path through the result, then
// strokes it twice: a full line and a thinner, slightly offset second pass,
// which gives the uneven weight of a brush line. The jitter depends on BOIL,
// so drawing the same shape with boil 0, 1 and 2 gives three hand-redrawn
// versions of it ("line boil"; the site cycles them for motion).
//
// Colours are classes, never literal values: k-<name> fills from
// var(--c-<name>) and .s strokes in var(--ink-line). site/styles.css defines
// them for the paper room and the night room; the sheet pages define them in
// their own <style>.

let BOIL = 0;
export const setBoil = (b) => { BOIL = b; };

export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const jit = (seed, i) => (hash(seed * 13.37 + i * 7.77 + BOIL * 101.3) - 0.5) * 2;
export const lerp = (a, b, p) => a + (b - a) * p;
// Decimal places in the path data: 1 for the sheets, 0 for the site (the hero
// draws at 0.5–0.8 of these units, so a whole unit is under a pixel).
let PREC = 10;
export const setPrecision = (digits) => { PREC = Math.pow(10, digits); };
const n1 = (v) => (Math.round(v * PREC) / PREC).toString();
const w1 = (v) => (Math.round(v * 10) / 10).toString(); // stroke widths keep one decimal

function densify(pts, closed, step) {
  const out = [], n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(d / step));
    for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

export function pathD(p, closed) {
  const n = p.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const P = (q) => n1(q[0]) + " " + n1(q[1]);
  let d;
  if (closed) {
    d = "M" + P(mid(p[n - 1], p[0]));
    for (let i = 0; i < n; i++) d += "Q" + P(p[i]) + " " + P(mid(p[i], p[(i + 1) % n]));
    return d + "Z";
  }
  d = "M" + P(p[0]);
  for (let i = 1; i < n - 1; i++) d += "Q" + P(p[i]) + " " + P(mid(p[i], p[i + 1]));
  return d + "L" + P(p[n - 1]);
}

function wobble(pts, closed, seed, amp, step) {
  return densify(pts, closed, step).map((p, i) => [p[0] + jit(seed, i * 2) * amp, p[1] + jit(seed, i * 2 + 1) * amp]);
}

// Fill (class k-<fill>) and hand-ink a shape. cls adds classes to the fill path
// (animation hooks); lw 0 draws the fill alone.
export function ink(pts, o = {}) {
  const { fill = null, lw = 5, closed = true, seed = 1, amp = 1.6, step = 34, cls = "", stroke = "" } = o;
  const d = pathD(wobble(pts, closed, seed, amp, step), closed);
  let out = "";
  const sc = stroke ? "s " + stroke : "s";
  if (fill && closed) {
    out += `<path class="k-${fill}${cls ? " " + cls : ""}${lw > 0 ? " " + sc : ""}"${lw > 0 ? ` stroke-width="${w1(lw)}"` : ""} d="${d}"/>`;
  } else if (lw > 0) {
    out += `<path class="${sc} nf${cls ? " " + cls : ""}" stroke-width="${w1(lw)}" d="${d}"/>`;
  }
  if (lw > 0) {
    const q = pathD(wobble(pts, closed, seed + 0.5, amp * 0.8, step * 1.3), closed);
    out += `<path class="${sc} nf" stroke-width="${w1(lw * 0.45)}" d="${q}"/>`;
  }
  return out;
}

// A fill with no outline (shading, glows).
export function blob(pts, fill, o = {}) { return ink(pts, { ...o, fill, lw: 0 }); }

export function inkLine(x1, y1, x2, y2, o = {}) {
  const { bend = 0, lw = 5, seed = 1, amp = 1.2, stroke = "" } = o;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  return ink([[x1, y1], [mx + nx * bend, my + ny * bend], [x2, y2]], { closed: false, lw, seed, amp, step: 22, stroke });
}

// A polyline in ink (arms with an elbow, handles, motion marks).
export function inkPoly(pts, o = {}) {
  const { lw = 5, seed = 1, amp = 1.2, step = 22, stroke = "" } = o;
  return ink(pts, { closed: false, lw, seed, amp, step, stroke });
}

// A thick coloured limb with an ink edge: an ink stroke with a colour stroke on
// top (sleeves, scarf tails).
export function limb(pts, colour, o = {}) {
  const { w = 12, edge = 3.5, seed = 1, amp = 1, step = 18 } = o;
  const d = pathD(wobble(pts, false, seed, amp, step), false);
  return `<path class="s nf" stroke-width="${w1(w + edge * 2)}" d="${d}"/><path class="nf l-${colour}" stroke-width="${w1(w)}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;
}

export const rectP = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// Rounded rectangle; r is one radius or [top-left, top-right, bottom-right, bottom-left].
export function roundP(x, y, w, h, r) {
  const [a, b, c, d] = Array.isArray(r) ? r : [r, r, r, r];
  const pts = [], k = 5;
  const corner = (cx, cy, rr, a0) => { for (let i = 0; i <= k; i++) { const t = a0 + (i / k) * Math.PI / 2; pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]); } };
  corner(x + w - b, y + b, b, -Math.PI / 2);
  corner(x + w - c, y + h - c, c, 0);
  corner(x + d, y + h - d, d, Math.PI / 2);
  corner(x + a, y + a, a, Math.PI);
  return pts;
}

export function ellP(cx, cy, rx, ry, n = 22, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

// Points along an arc (for smiles, handles, happy eyes).
export function arcP(cx, cy, r, a0, a1, n = 8) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = lerp(a0, a1, i / n); pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); }
  return pts;
}

// The 4-point sparkle of the v2 wallpaper (no outline, like the original).
export function star4(x, y, s, fill, rot = 0, cls = "") {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? s * 0.3 : s, t = (i / 8) * Math.PI * 2 - Math.PI / 2 + rot;
    pts.push(n1(x + Math.cos(t) * r) + " " + n1(y + Math.sin(t) * r));
  }
  return `<path class="k-${fill}${cls ? " " + cls : ""}" d="M${pts.join("L")}Z"/>`;
}

// Plain SVG helpers.
export const g = (inner, attrs = "") => `<g${attrs ? " " + attrs : ""}>${inner}</g>`;
export const tr = (x, y, s = 1, rot = 0) => `transform="translate(${n1(x)} ${n1(y)})${rot ? ` rotate(${n1(rot)})` : ""}${s !== 1 ? ` scale(${Math.round(s * 1000) / 1000})` : ""}"`;
export const num = n1;

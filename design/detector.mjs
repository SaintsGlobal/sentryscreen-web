// The Detector: three candidate designs (A, B, C) for the character that
// stands for SentryScreen's on-device detector, each in four poses.
// Every drawing is a pure function of its options and the boil frame, drawn
// with feet at y = 0 and the body centred on x = 0, about 200 units tall.
//
// What all three keep from the v2 guardian (reference 2026-09-27): a
// boxy body, two glowing cream eyes, stick limbs with round ends, and the
// thick wobbly brown ink line. B and C also wear the v2 guardian's green
// shield with a check; Lantern (A, the one the site uses) no longer does
// (2026-09-28).

import { ink, blob, inkLine, inkPoly, limb, roundP, ellP, arcP, rectP, star4, g, tr, num, hash } from "./ink.mjs";

export const POSES = ["neutral", "wave", "alert", "clear"];
export const POSE_LABEL = { neutral: "Neutral", wave: "Waving hello", alert: "Alert: spotted something", clear: "All clear" };

export const VARIANTS = {
  A: { name: "Lantern", tagline: "The calm night-watch: steady, gentle, always on." },
  B: { name: "Beacon", tagline: "The eager little robot: earnest, bouncy, on duty." },
  C: { name: "Cardigan", tagline: "The cosy guardian: warm, unhurried, keeps the porch light on." },
};

// ---------------------------------------------------------------- shared parts

// Shared <defs>: the eye halo and the lamp glow. Colours come from classes.
export function defs(prefix = "ss") {
  return `<defs>
<radialGradient id="${prefix}-halo"><stop offset="0" class="st-halo" stop-opacity=".9"/><stop offset=".45" class="st-halo" stop-opacity=".35"/><stop offset="1" class="st-halo" stop-opacity="0"/></radialGradient>
<radialGradient id="${prefix}-halo-green"><stop offset="0" class="st-halo-green" stop-opacity=".8"/><stop offset="1" class="st-halo-green" stop-opacity="0"/></radialGradient>
<radialGradient id="${prefix}-beacon"><stop offset="0" class="st-beacon" stop-opacity=".95"/><stop offset=".5" class="st-beacon" stop-opacity=".35"/><stop offset="1" class="st-beacon" stop-opacity="0"/></radialGradient>
</defs>`;
}

const halo = (cx, cy, rx, ry, P, strong = false, kind = "halo") =>
  `<ellipse class="halo${strong ? " halo-strong" : ""}" cx="${num(cx)}" cy="${num(cy)}" rx="${num(rx)}" ry="${num(ry)}" fill="url(#${P}-${kind})"/>`;

// The green shield with a cream check (Beacon's badge, Cardigan's brooch).
function shield(x, y, s, seed) {
  const pts = [[0, -11], [9, -7.5], [9, 0], [7, 5.6], [3.6, 9.3], [0, 11.5], [-3.6, 9.3], [-7, 5.6], [-9, 0], [-9, -7.5]].map(([a, b]) => [x + a * s, y + b * s]);
  return ink(pts, { fill: "shield", lw: 2.6 * s * 0.75, seed, amp: 0.5 * s, step: 6 * s }) +
    inkPoly([[x - 4 * s, y + 0.5 * s], [x - 1 * s, y + 3.6 * s], [x + 4.4 * s, y - 3.2 * s]], { lw: 2.3 * s, seed: seed + 1, amp: 0.2 * s, step: 4 * s, stroke: "l-glow" });
}

// Glowing eyes: "open" rounded rects, "wide" when alert, "happy" arcs; blink
// 0..1 closes the rects.
function eyes(cx, cy, dx, o) {
  const { mood = "open", w = 20, h = 26, r = 4, P, seed, blink = 0 } = o;
  let out = "";
  [-1, 1].forEach((sd, i) => {
    const x = cx + sd * dx;
    if (mood === "happy") {
      out += inkPoly(arcP(x, cy + 8, 12, Math.PI * 1.12, Math.PI * 1.88, 8), { lw: 6.5, seed: seed + i, amp: 0.5, step: 6, stroke: "l-glow glow-line" });
    } else {
      const ww = mood === "wide" ? w * 1.2 : w, hh = (mood === "wide" ? h * 1.3 : h) * (1 - 0.9 * blink);
      out += `<rect class="k-glow eye" x="${num(x - ww / 2)}" y="${num(cy - hh / 2)}" width="${num(ww)}" height="${num(hh)}" rx="${num(Math.min(r, ww / 2, hh / 2))}"/>`;
    }
  });
  return out;
}

function eyeHalos(cx, cy, dx, mood, P, size = 1) {
  const strong = mood === "wide";
  const k = (strong ? 1.45 : 1) * size;
  return halo(cx - dx, cy, 30 * k, 34 * k, P, strong) + halo(cx + dx, cy, 30 * k, 34 * k, P, strong);
}

function mouth(x, y, kind, seed, colour = "l-glow") {
  if (kind === "smile") return inkPoly(arcP(x, y - 9, 12, Math.PI * 0.22, Math.PI * 0.78, 8), { lw: 4.5, seed, amp: 0.4, step: 6, stroke: colour });
  if (kind === "grin") {
    const fill = colour === "l-glow" ? "glow" : "ink";
    const pts = arcP(x, y - 6, 15, 0, Math.PI, 10);
    return ink(pts, { fill, lw: 0, seed, amp: 0.3, step: 5 });
  }
  if (kind === "o") return `<ellipse class="k-${colour === "l-glow" ? "glow" : "ink"}" cx="${num(x)}" cy="${num(y)}" rx="6" ry="7.5"/>`;
  if (kind === "big") return inkPoly(arcP(x, y - 14, 17, Math.PI * 0.18, Math.PI * 0.82, 10), { lw: 5, seed, amp: 0.4, step: 6, stroke: colour });
  return "";
}

// Two stick legs with round dark feet; feet [[dx, lift], [dx, lift]] moves
// each foot (a walk).
function legs(xs, y0, y1, seed, o = {}) {
  const { foot = "ink", fw = 13, fh = 6.5, feet = [[0, 0], [0, 0]] } = o;
  let out = "";
  xs.forEach((lx, i) => {
    const sd = lx < 0 ? -1 : 1, [dx, lift] = feet[i];
    out += inkLine(lx, y0, lx + dx, y1 - 4 - lift, { lw: 5, seed: seed + i });
    out += ink(ellP(lx + dx + sd * 5, y1 - 4 - lift, fw, fh, 12), { fill: foot, lw: 3.5, seed: seed + 3 + i });
  });
  return out;
}

// A stick arm from the shoulder through optional elbows to a round hand.
function arm(pts, hand, seed, o = {}) {
  const { r = 11, lw = 5 } = o;
  const e = pts[pts.length - 1];
  return inkPoly(pts, { lw, seed, amp: 0.9 }) + ink(ellP(e[0], e[1], r, r, 12), { fill: hand, lw: 4, seed: seed + 2 });
}

// Little motion arcs beside a waving hand.
function waveMarks(x, y, seed) {
  return inkPoly(arcP(x, y, 22, -Math.PI * 0.95, -Math.PI * 0.6, 5), { lw: 3.5, seed, amp: 0.4, step: 5 }) +
    inkPoly(arcP(x, y, 34, -Math.PI * 0.9, -Math.PI * 0.62, 5), { lw: 3.5, seed: seed + 1, amp: 0.4, step: 5 }) +
    inkPoly(arcP(x, y, 22, -Math.PI * 0.4, -Math.PI * 0.05, 5), { lw: 3.5, seed: seed + 2, amp: 0.4, step: 5 });
}

// The "!" of noticing: a hand-drawn exclamation in mustard with an ink edge.
function bang(x, y, seed) {
  return ink([[x - 6, y - 30], [x + 6, y - 30], [x + 3, y - 4], [x - 3, y - 4]], { fill: "mustard", lw: 3.5, seed, amp: 0.5, step: 8 }) +
    ink(ellP(x, y + 6, 5, 5, 8), { fill: "mustard", lw: 3.5, seed: seed + 1, amp: 0.4 });
}

function sparkles(list) {
  return list.map(([x, y, s, rot]) => star4(x, y, s, "mustard", rot || 0, "sparkle")).join("");
}

// A small hand lantern hanging from (x, y): bail, cap, glowing glass, base.
// glow 0..1 widens its halo (1 is the alert pose's raised lamp).
function handLantern(x, y, glow, P, seed) {
  const t = y + 12, r = 34 + 12 * glow;
  return inkPoly(arcP(x, t, 11, Math.PI * 1.05, Math.PI * 1.95, 8), { lw: 3.5, seed, amp: 0.4, step: 5 }) +
    halo(x, t + 30, r, r, P, glow > 0.5) +
    ink([[x - 12, t + 8], [x - 7, t], [x + 7, t], [x + 12, t + 8]], { fill: "ink", lw: 3, seed: seed + 1, amp: 0.4, step: 6 }) +
    ink(roundP(x - 11, t + 8, 22, 30, 5), { fill: "glow", lw: 3.5, seed: seed + 2, amp: 0.5, step: 8 }) +
    inkLine(x - 11, t + 23, x + 11, t + 23, { lw: 2, seed: seed + 3 }) + inkLine(x, t + 9, x, t + 37, { lw: 2, seed: seed + 4 }) +
    ink(roundP(x - 14, t + 37, 28, 8, 3), { fill: "ink", lw: 3, seed: seed + 5, amp: 0.4, step: 6 });
}

// ---------------------------------------------------------------- A: Lantern
// The night-watch: round shoulders, lantern-warm eyes, and a little hand
// lantern it carries on its rounds. The closest to the v2 guardian, so it is
// the site's stand-in.

// Lantern's body in its own units: feet at y 0, shoulders (sx, sy) where the
// arms start, the eye line ey. Exported for the films, which pose his arms.
export const LANTERN_BODY = (() => {
  const bw = 124, bh = 136, legLen = 40, top = -(legLen + bh);
  return { bw, bh, legLen, top, bot: -legLen, sx: bw / 2 - 4, sy: top + bh * 0.56, ey: top + bh * 0.34 };
})();

// Every option but pose, P, id and hero defaults to what the pose draws; the
// films (the app repo's marketing/animations/v2, which vendors this file)
// set them frame by frame:
//   arms      [left, right], each a point list from its shoulder to the hand
//   lamp      [x, y] where the hand lantern hangs from, or null for none
//   lampGlow  0..1, the lamp's halo (1 = alert)
//   mood      "open" | "wide" | "happy";  mouth "smile" | "grin" | "o" | "big"
//   blink     0..1;  feet [[dx, lift], [dx, lift]] (a walk)
//   bang      x of the "!" above his head, or null;  sparkles true | false
//   marks     [x, y, side] wave marks beside a hand (side -1 mirrors them), or null
export function lantern(o = {}) {
  // hero: the site's animated stand-in. The right arm is drawn hanging from
  // the shoulder inside .det-arm (styles.css raises and waves it), the eyes sit
  // in .det-eyes (blinks) and the wave marks in .det-marks.
  const { pose = "neutral", P = "ss", id = "a", hero = false } = o;
  const { bw, bh, top, bot, sx, sy, ey } = LANTERN_BODY, seed = 11;
  const body = roundP(-bw / 2, top, bw, bh, [40, 40, 14, 14]);
  const {
    arms = {
      neutral: [[[-sx, sy], [-80, -66]], [[sx, sy], [84, -38]]],
      wave: [[[-sx, sy], [-80, -66]], [[sx, sy], [96, -150], [104, -196]]],
      alert: [[[-sx, sy], [-96, -112], [-88, -146]], [[sx, sy], [100, -150], [96, -196]]],
      clear: [[[-sx, sy], [-96, -80], [-62, -58]], [[sx, sy], [96, -80], [62, -58]]],
    }[pose],
    // the hand lantern: carried low, held up high when alert, set down when all is clear
    lamp = pose === "alert" ? [96, -189] : pose === "clear" ? [-104, -44] : [-80, -59],
    lampGlow = pose === "alert" ? 1 : 0,
    mood = pose === "alert" ? "wide" : pose === "clear" ? "happy" : "open",
    mouth: mouthKind = pose === "wave" ? "grin" : pose === "alert" ? "o" : pose === "clear" ? "big" : "smile",
    blink = 0, feet = [[0, 0], [0, 0]],
    bang: bangX = pose === "alert" ? -40 : null,
    sparkles: sparkly = pose === "clear",
    marks = pose === "wave" ? [104, -196, 1] : null,
  } = o;
  let back = "", front = "";

  // lamp, arms and legs are drawn before the body so they tuck behind it
  if (lamp) back += handLantern(lamp[0], lamp[1], lampGlow, P, seed + 120);
  arms.forEach((pts, i) => {
    if (hero && i === 1) back += `<g transform="translate(${num(sx)} ${num(sy)})"><g class="det-arm">${arm([[0, 0], [26, 62]], "navy", seed + 55)}</g></g>`;
    else back += arm(pts, "navy", seed + 50 + i * 5);
  });
  back += legs([-27, 27], bot - 2, 0, seed + 40, { feet });
  if (marks) back += marks[2] < 0 ? `<g transform="translate(${num(marks[0])} ${num(marks[1])}) scale(-1 1)">${waveMarks(0, 0, seed + 80)}</g>` : waveMarks(marks[0], marks[1], seed + 80);
  if (hero) back += `<g class="det-marks">${waveMarks(sx + 41, sy - 54, seed + 80)}</g>`;

  // body with the lighter shoulder band, clipped to the wobbly outline
  const clip = `${P}-${id}-clip`;
  const bodyFill = ink(body, { fill: "navy", lw: 0, seed });
  front += `<clipPath id="${clip}">${bodyFill.replace(/class="[^"]*"/, "")}</clipPath>`;
  front += bodyFill;
  front += g(`<rect class="k-navy-light" x="-80" y="${top - 10}" width="160" height="${num(bh * 0.2 + 10)}"/>` +
    inkLine(-70, top + bh * 0.2, 70, top + bh * 0.2, { lw: 3, seed: seed + 9, stroke: "l-navy-deep" }), `clip-path="url(#${clip})"`);
  front += eyeHalos(0, ey, 26, mood, P, 1.05);
  front += ink(body, { lw: 6, seed });
  front += hero ? `<g transform="translate(0 ${num(ey)})"><g class="det-eyes">${eyes(0, 0, 26, { mood, w: 22, h: 28, r: 5, P, seed: seed + 60 })}</g></g>`
    : eyes(0, ey, 26, { mood, w: 22, h: 28, r: 5, P, seed: seed + 60, blink });
  front += mouth(0, top + bh * 0.62, mouthKind, seed + 70);
  // no chest badge: the green check-shield was retired from Lantern
  // (2026-09-28); Beacon and Cardigan keep theirs
  if (bangX != null) front += bang(bangX, top - 26, seed + 95);
  if (sparkly) front += sparkles([[-92, -150, 9, 0.2], [96, -176, 7, -0.1], [104, -120, 5, 0.4]]);
  return back + front;
}

// Lantern's face alone: the site's mark and favicon (2026-09-27: the
// mark is Lantern if it reads small). Drawn in a 32 x 32 box: the round-
// shouldered body, the two lantern-warm eyes and the smile, with a thin wobble
// so it stays hand-inked at 16 px without going fuzzy.
export function lanternFace(o = {}) {
  const { seed = 71 } = o;
  const body = roundP(4.5, 3.5, 23, 25.5, [10, 10, 3.5, 3.5]);
  let s = ink(body, { fill: "navy", lw: 0, seed, amp: 0.3, step: 6 });
  s += ink(body, { lw: 2.4, seed, amp: 0.3, step: 6, stroke: "mark-line" });
  [10.6, 17.6].forEach((x) => { s += `<rect class="k-glow" x="${x}" y="10.5" width="3.8" height="6.2" rx="1.3"/>`; });
  s += inkPoly(arcP(16, 17.2, 4.6, Math.PI * 0.25, Math.PI * 0.75, 6), { lw: 1.7, seed: seed + 3, amp: 0.12, step: 3, stroke: "l-glow" });
  return s;
}

// ---------------------------------------------------------------- B: Beacon
// A chunky little robot-sentry: squat and wide, a visor for a face, an antenna
// with a beacon, bolts and chunky boots.
export function beacon(o = {}) {
  const { pose = "neutral", P = "ss", id = "b" } = o;
  const bw = 152, bh = 112, legLen = 30, top = -(legLen + bh), bot = -legLen, seed = 211;
  const body = roundP(-bw / 2, top, bw, bh, 12);
  const sy = top + bh * 0.52, sx = bw / 2 - 4;
  const ey = top + 34, mood = pose === "alert" ? "wide" : pose === "clear" ? "happy" : "open";
  let back = "", front = "";

  const armsFor = {
    neutral: [[[-sx, sy], [-100, -38]], [[sx, sy], [100, -38]]],
    wave: [[[-sx, sy], [-100, -38]], [[sx, sy], [112, -150], [118, -192]]],
    alert: [[[-sx, sy], [-114, -130], [-118, -172]], [[sx, sy], [114, -130], [118, -172]]],
    clear: [[[-sx, sy], [-100, -38]], [[sx, sy], [116, -76], [110, -126]]],
  }[pose];
  armsFor.forEach((pts, i) => { back += arm(pts, "navy", seed + 50 + i * 5, { r: 13, lw: 6.5 }); });
  // all clear: a little green signal flag
  if (pose === "clear") {
    back += inkLine(110, -112, 112, -200, { lw: 4, seed: seed + 57 });
    back += ink([[112, -198], [142, -187], [112, -174]], { fill: "shield", lw: 4, seed: seed + 58, amp: 0.8, step: 10 });
  }
  if (pose === "wave") back += waveMarks(118, -192, seed + 80);

  // stubby legs and boots
  [-36, 36].forEach((lx, i) => {
    back += ink(rectP(lx - 9, bot - 4, 18, 22), { fill: "navy-light", lw: 4, seed: seed + 40 + i, step: 12 });
    back += ink(roundP(lx - 24, -18, 48, 18, [9, 9, 4, 4]), { fill: "navy", lw: 4.5, seed: seed + 44 + i, step: 14 });
  });

  // antenna and beacon
  const by = top - 36, lit = pose === "alert" ? "beacon-on" : pose === "clear" ? "shield" : "mustard";
  back += inkLine(0, top + 2, 2, by + 10, { lw: 5, seed: seed + 30 });
  back += ink(roundP(-12, top - 8, 24, 12, 4), { fill: "navy-light", lw: 3.5, seed: seed + 31, step: 10 });
  if (pose === "alert") {
    back += halo(2, by, 40, 40, P, true, "beacon");
    [[-1, -1], [1, -1], [-1.3, 0.2], [1.3, 0.2]].forEach(([dx, dy], i) => { back += inkLine(2 + dx * 20, by + dy * 20, 2 + dx * 32, by + dy * 32, { lw: 3.5, seed: seed + 33 + i }); });
  }
  if (pose === "clear") back += halo(2, by, 30, 30, P, false, "halo-green");
  if (pose === "wave") back += inkPoly(arcP(2, by, 20, -Math.PI * 0.85, -Math.PI * 0.55, 4), { lw: 3, seed: seed + 38 }) + inkPoly(arcP(2, by, 20, -Math.PI * 0.45, -Math.PI * 0.15, 4), { lw: 3, seed: seed + 39 });
  back += ink(ellP(2, by, 12, 12, 12), { fill: lit, lw: 4, seed: seed + 32 });

  // ear bolts
  [-1, 1].forEach((sd, i) => { back += ink(roundP(sd > 0 ? bw / 2 - 4 : -bw / 2 - 10, ey - 12, 14, 24, 4), { fill: "navy-light", lw: 4, seed: seed + 20 + i, step: 10 }); });

  front += ink(body, { fill: "teal", lw: 0, seed });
  const clip = `${P}-${id}-clip`;
  front += `<clipPath id="${clip}">${ink(body, { fill: "teal", lw: 0, seed }).replace(/class="[^"]*"/, "")}</clipPath>`;
  front += g(`<rect class="k-teal-dark" x="-90" y="${num(bot - bh * 0.2)}" width="180" height="${num(bh * 0.2 + 10)}"/>` +
    inkLine(-80, bot - bh * 0.2, 80, bot - bh * 0.2, { lw: 3, seed: seed + 9, stroke: "l-teal-deep" }), `clip-path="url(#${clip})"`);
  front += ink(body, { lw: 6, seed });
  // visor
  front += ink(roundP(-58, top + 12, 116, 46, 16), { fill: "navy", lw: 4.5, seed: seed + 5, step: 20 });
  front += eyeHalos(0, ey, 26, mood, P, 0.8);
  front += eyes(0, ey, 26, { mood, w: 18, h: 22, r: 9, P, seed: seed + 60 });
  // rivets
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], i) => {
    front += `<circle class="k-ink" cx="${num(a * (bw / 2 - 11))}" cy="${num(b < 0 ? top + 10 : bot - 10)}" r="3.4"/>`;
  });
  front += mouth(0, top + 76, pose === "wave" ? "grin" : pose === "alert" ? "o" : pose === "clear" ? "grin" : "smile", seed + 70, "l-ink");
  front += shield(36, top + 82, 1.1, seed + 90);
  if (pose === "alert") front += bang(-78, top - 30, seed + 95);
  if (pose === "clear") front += sparkles([[-104, -170, 8, 0.2], [-86, -120, 5, -0.2], [52, -196, 6, 0.3]]);
  return back + front;
}

// ---------------------------------------------------------------- C: Cardigan
// A soft, cosy guardian: knitted beanie with a pompom, a striped scarf, a
// cardigan with buttons and the shield worn as a brooch, mittens.
export function cardigan(o = {}) {
  const { pose = "neutral", P = "ss", id = "c" } = o;
  const bw = 130, bh = 160, legLen = 28, top = -(legLen + bh), bot = -legLen, seed = 411;
  const body = roundP(-bw / 2, top, bw, bh, [30, 30, 26, 26]);
  const sy = top + bh * 0.68, sx = bw / 2 - 6;
  const ey = top + bh * 0.34, mood = pose === "alert" ? "wide" : pose === "clear" ? "happy" : "open";
  const y0 = top + bh * 0.63; // the scarf line
  let back = "", front = "";

  const armsFor = {
    neutral: [[[-sx, sy], [-80, -60], [-84, -40]], [[sx, sy], [80, -60], [84, -40]]],
    wave: [[[-sx, sy], [-80, -60], [-84, -40]], [[sx, sy], [98, -118], [100, -172]]],
    alert: [[[-sx, sy], [-96, -110], [-92, -142]], [[sx, sy], [96, -110], [92, -142]]],
    clear: [[[-sx, sy], [-74, -70], [-22, -76]], [[sx, sy], [74, -70], [22, -76]]],
  }[pose];
  // sleeves in the cardigan colour, mittens in mustard
  armsFor.forEach((pts, i) => {
    back += limb(pts, "maroon", { w: 13, edge: 3.2, seed: seed + 50 + i * 5 });
    const e = pts[pts.length - 1];
    if (pose !== "clear") back += ink(ellP(e[0], e[1], 12, 12, 12), { fill: "mustard", lw: 4, seed: seed + 52 + i * 5 });
  });
  if (pose === "wave") back += waveMarks(100, -172, seed + 80);
  back += legs([-28, 28], bot - 2, 0, seed + 40, { foot: "terracotta", fw: 15, fh: 7.5 });

  // body: navy face, cardigan below the scarf with a V of navy at the neck
  const clip = `${P}-${id}-clip`;
  front += `<clipPath id="${clip}">${ink(body, { fill: "navy", lw: 0, seed }).replace(/class="[^"]*"/, "")}</clipPath>`;
  front += ink(body, { fill: "navy", lw: 0, seed });
  const cardi = [[-80, y0], [-16, y0], [0, y0 + 36], [16, y0], [80, y0], [80, bot + 10], [-80, bot + 10]];
  front += g(ink(cardi, { fill: "maroon", lw: 3.5, seed: seed + 3, step: 16 }) +
    inkLine(0, y0 + 36, 0, bot, { lw: 3, seed: seed + 4 }), `clip-path="url(#${clip})"`);
  [y0 + 45, y0 + 55].forEach((by, i) => { front += ink(ellP(-8, by, 3.6, 3.6, 8), { fill: "mustard", lw: 2, seed: seed + 5 + i, amp: 0.3 }); });
  front += eyeHalos(0, ey, 26, mood, P, 0.95);
  front += ink(body, { lw: 6, seed });
  front += eyes(0, ey, 26, { mood, w: 21, h: 25, r: 9, P, seed: seed + 60 });
  // rosy cheeks
  [-1, 1].forEach((sd) => { front += `<ellipse class="k-cheek" cx="${sd * 44}" cy="${num(ey + 16)}" rx="8" ry="4.5"/>`; });
  front += mouth(0, ey + 23, pose === "wave" ? "grin" : pose === "alert" ? "o" : pose === "clear" ? "big" : "smile", seed + 70);

  // scarf: a band, a knot, two striped tails
  const flick = pose === "alert" ? 1 : 0;
  front += ink(roundP(-bw / 2 - 4, y0 - 12, bw + 8, 22, 10), { fill: "mustard", lw: 4.5, seed: seed + 20, step: 18 });
  for (let i = 0; i < 6; i++) { const x = -bw / 2 + 12 + i * 22; front += inkLine(x, y0 - 10, x + 4, y0 + 8, { lw: 5, seed: seed + 21 + i, stroke: "l-terracotta" }); }
  const t1 = flick ? [[-34, y0 + 4], [-60, y0 + 22], [-92, y0 + 16]] : [[-34, y0 + 4], [-40, y0 + 34], [-36, y0 + 62]];
  const t2 = flick ? [[-30, y0 + 6], [-52, y0 + 34], [-80, y0 + 40]] : [[-30, y0 + 6], [-24, y0 + 36], [-22, y0 + 58]];
  front += limb(t2, "mustard-dark", { w: 15, edge: 3.2, seed: seed + 30 }) + limb(t1, "mustard", { w: 16, edge: 3.2, seed: seed + 31 });
  const tip = t1[2];
  for (let i = -1; i <= 1; i++) front += inkLine(tip[0] + i * 5, tip[1] + 6, tip[0] + i * 6, tip[1] + 14, { lw: 2.6, seed: seed + 33 + i });
  front += ink(ellP(-32, y0 + 2, 11, 9, 10), { fill: "mustard-dark", lw: 4, seed: seed + 36 });

  // the shield as a brooch on the cardigan
  front += shield(34, y0 + 42, 1.15, seed + 90);

  // beanie with a folded brim and a pompom
  front += ink(roundP(-bw / 2 + 4, top - 30, bw - 8, 56, [44, 44, 6, 6]), { fill: "sage", lw: 5, seed: seed + 10, step: 22 });
  for (let i = 0; i < 5; i++) { const x = -40 + i * 20; front += inkLine(x, top - 14 + Math.abs(i - 2) * -2, x, top + 12, { lw: 2.5, seed: seed + 11 + i, stroke: "l-green" }); }
  front += ink(roundP(-bw / 2 - 2, top + 8, bw + 4, 22, 9), { fill: "green", lw: 5, seed: seed + 16, step: 20 });
  for (let i = 0; i < 9; i++) { const x = -54 + i * 13.5; front += inkLine(x, top + 12, x, top + 26, { lw: 2.2, seed: seed + 17 + i, stroke: "l-green-deep" }); }
  const pom = ellP(0, top - 34, 15, 14, 18).map(([x, y], i) => [x + (i % 2 ? 0 : (x > 0 ? 2.5 : -2.5)), y + (i % 2 ? 0 : (y > top - 34 ? 2.5 : -2.5))]);
  front += ink(pom, { fill: "cream", lw: 4.5, seed: seed + 27, step: 6, amp: 1.2 });

  if (pose === "clear") {
    // a mug of cocoa, held in both mittens
    front += inkPoly([[-2, -104], [-6, -114], [0, -124], [-4, -134]], { lw: 3, seed: seed + 100, stroke: "l-steam" }) +
      inkPoly([[10, -102], [6, -112], [12, -122], [8, -132]], { lw: 3, seed: seed + 101, stroke: "l-steam" });
    front += inkPoly(arcP(20, -78, 10, -Math.PI * 0.5, Math.PI * 0.5, 8), { lw: 5, seed: seed + 102 });
    front += ink(roundP(-18, -98, 38, 38, [4, 4, 9, 9]), { fill: "cream", lw: 4.5, seed: seed + 103, step: 12 });
    front += ink(roundP(-14, -93, 30, 7, 3), { fill: "cocoa", lw: 0, seed: seed + 104, step: 10 });
    front += ink(ellP(-22, -74, 12, 12, 12), { fill: "mustard", lw: 4, seed: seed + 105 }) + ink(ellP(24, -72, 12, 12, 12), { fill: "mustard", lw: 4, seed: seed + 106 });
    front += sparkles([[-92, -176, 8, 0.2], [96, -150, 6, -0.3], [-104, -110, 5, 0.1]]);
  }
  if (pose === "alert") front += bang(78, top - 34, seed + 95);
  return back + front;
}

export const DRAW = { A: lantern, B: beacon, C: cardigan };

// ---------------------------------------------------------------- the kid (hero)
// A child from the v2 cast (orange block, purple jumper, spiky hair), sitting.
export function kid(o = {}) {
  const { seed = 601, look = 1 } = o;
  const bw = 104, bh = 118, top = -bh - 36, split = 0.52, bot = -36;
  let out = "";
  // legs over the stool edge, feet dangling forward
  [-1, 1].forEach((sd, i) => {
    const lx = sd * 24;
    out += inkPoly([[lx, bot - 4], [lx + sd * 4, -8]], { lw: 5, seed: seed + 40 + i });
    out += ink(ellP(lx + sd * 8, -6, 13, 6.5, 12), { fill: "ink", lw: 3.5, seed: seed + 42 + i });
  });
  // arms resting on the knees
  [-1, 1].forEach((sd, i) => {
    out += inkPoly([[sd * (bw / 2 - 4), top + bh * 0.62], [sd * (bw / 2 + 12), bot - 10], [sd * 30, bot + 4]], { lw: 5, seed: seed + 50 + i });
    out += ink(ellP(sd * 30, bot + 4, 10, 10, 10), { fill: "skin", lw: 4, seed: seed + 52 + i });
  });
  const body = roundP(-bw / 2, top, bw, bh, 10);
  out += ink(body, { fill: "purple", lw: 0, seed });
  out += ink(roundP(-bw / 2, top, bw, bh * split, [10, 10, 0, 0]), { fill: "skin", lw: 0, seed: seed + 1, amp: 0.4 });
  out += inkLine(-bw / 2 + 2, top + bh * split, bw / 2 - 2, top + bh * split, { lw: 4.5, seed: seed + 3 });
  out += ink(body, { lw: 6, seed });
  // spiky hair
  const n = 5, x0 = -bw * 0.42, x1 = bw * 0.42, pts = [[x0, top + 10]];
  for (let i = 0; i <= n * 2; i++) { const f = i / (n * 2); pts.push([x0 + (x1 - x0) * f, top + (i % 2 ? 6 : -22 - hash(seed + i) * 9)]); }
  pts.push([x1, top + 10]);
  out += ink(pts, { fill: "hair", lw: 4.5, seed: seed + 5, step: 18 });
  // face, looking toward the screen
  const fy = top + bh * split * 0.55, fx = look * 8;
  [-1, 1].forEach((sd) => { out += `<circle class="k-ink" cx="${num(fx + sd * 18)}" cy="${num(fy)}" r="6"/>`; });
  out += inkPoly(arcP(fx, fy + 6, 11, Math.PI * 0.2, Math.PI * 0.8, 8), { lw: 4, seed: seed + 7, amp: 0.3, step: 5 });
  return out;
}

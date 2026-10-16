// The small drawings outside the hero: the mark (Lantern's face, in every
// header and footer), the favicon, and Lantern figures on the support and 404
// pages.
//
//   node design/build-figures.mjs
//
// Every site/**/*.html is scanned for placeholders of the form
//   <!-- fig:NAME -->…<!-- /fig -->
// and what sits between them is replaced with the drawing NAME:
//   mark                 Lantern's face, 32 x 32 (the wordmark's mark)
//   lantern-<pose>       Lantern standing, pose neutral | wave | alert | clear
// It also writes site/favicon.svg (the mark in literal colours, with its own
// dark-scheme outline).
// Colours are classes (styles.css "theme" region); run it after changing
// detector.mjs or ink.mjs, then site-check/stamp-assets.sh and check.sh.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setBoil, setPrecision } from "./ink.mjs";
import { lantern, lanternFace, defs, POSES, POSE_LABEL } from "./detector.mjs";
import { DAY } from "./palette.mjs";
import { UI_DAY, UI_NIGHT } from "./theme.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, "..", "site");

setBoil(0);
setPrecision(1);
const face = lanternFace();

export const MARK_SVG = `<svg class="ink-art mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${face}</svg>`;

// A standing figure: feet at y 0, about 262 units tall with the raised arm.
export function figure(pose) {
  const P = `fig-${pose}`;
  return `<svg class="ink-art figure" viewBox="-150 -262 300 282" aria-hidden="true" focusable="false">${defs(P)}` +
    `<ellipse class="k-shadow" cx="0" cy="2" rx="96" ry="9"/>${lantern({ pose, P, id: P })}</svg>`;
}

// The mark with literal colours, for places with no stylesheet (the favicon,
// the brand PNGs, the server's pages build their own from the same drawing).
export function literalMark() {
  const fills = { navy: DAY.navy, glow: DAY.glow };
  return face
    .replace(/class="k-(navy|glow)"/g, (_, n) => `fill="${fills[n]}"`)
    .replace(/class="s mark-line nf"/g, `class="o" fill="none" stroke-linecap="round" stroke-linejoin="round"`)
    .replace(/class="s l-glow nf"/g, `fill="none" stroke="${DAY.glow}" stroke-linecap="round"`);
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.o{stroke:${UI_DAY.ink}}@media (prefers-color-scheme:dark){.o{stroke:${UI_NIGHT.ink}}}</style>${literalMark()}</svg>\n`;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return n.endsWith(".html") ? [p] : [];
  });
}

const draw = (name) => {
  if (name === "mark") return MARK_SVG;
  const m = /^lantern-(\w+)$/.exec(name);
  if (m && POSES.includes(m[1])) return figure(m[1]);
  throw new Error(`build-figures: unknown figure "${name}"`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let count = 0;
  for (const file of htmlFiles(site)) {
    const src = readFileSync(file, "utf8");
    const out = src.replace(/<!-- fig:([\w-]+) -->[\s\S]*?<!-- \/fig -->/g, (_, name) => { count++; return `<!-- fig:${name} -->${draw(name)}<!-- /fig -->`; });
    if (out !== src) writeFileSync(file, out);
  }
  writeFileSync(join(site, "favicon.svg"), FAVICON);
  console.log(`build-figures: ${count} figures, favicon.svg`);
}
export { POSE_LABEL };

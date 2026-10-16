// The interface colour tokens: the paper room (light) and the night room
// (dark). docs/DESIGN.md "Palette" documents them; this file is their one source.
//
// design/build-hero.mjs writes them into site/styles.css (the "theme" region)
// and design/build-server-assets.mjs into src/page-assets.ts, so the site and
// the server's own pages share one palette. Change a value here, run both
// generators, then site-check/stamp-assets.sh.
//
// Contrast (WCAG AA, measured 2026-09-27, stage 1): paper room --ink 12.7:1 on
// the wall, --ink-2 9.1, --muted 5.4 on the band, --accent 5.6 on the band,
// --focus 4.7, --danger 5.2, --ok 4.6, ink on the mustard button 7.2. Night
// room --ink 13.0:1 on the wall, --muted 6.6, --accent 8.8, --focus 7.4,
// --danger 8.0, --ok 9.4, --control-border 8.4, ink on the mustard button 8.0.

export const UI_DAY = {
  wall: "#f0e2c4",
  paper: "#f6ecd5",
  "paper-2": "#ecdcbb",
  slip: "#fbf5e6",
  "slip-ink": "#2b1d16",
  ink: "#2b1d16",
  "ink-2": "#4a3326",
  muted: "#6b5140",
  line: "rgba(43, 29, 22, 0.2)",
  "line-strong": "rgba(43, 29, 22, 0.45)",
  "control-border": "#2b1d16",
  accent: "#8e3b22",
  "accent-hover": "#6f2c18",
  "accent-soft": "#f1dcb4",
  focus: "#2458c6",
  danger: "#a3311e",
  ok: "#3d6b30",
  star: "rgba(74, 51, 38, 0.22)",
  vignette: "rgba(60, 30, 10, 0.14)",
  "grain-blend": "multiply",
  "grain-opacity": "0.45",
  "btn-shadow": "#2b1d16",
  "btn-tint": "rgba(43, 29, 22, 0.06)",
  "btn-tint-active": "rgba(43, 29, 22, 0.11)",
  "primary-bg": "#d6a53a",
  "primary-hover": "#e3b44d",
  "primary-ink": "#2b1d16",
  // the cover: the footer and the yearly plan (docs/DESIGN.md "Surfaces")
  cover: "#2b1d16",
  "cover-ink": "#f6ecd5",
  "cover-muted": "rgba(246, 236, 213, 0.72)",
  "cover-line": "rgba(246, 236, 213, 0.16)",
  "cover-border": "rgba(246, 236, 213, 0.5)",
  "cover-focus": "#86b0ff",
  "plan-best-border": "#2b1d16",
};

export const UI_NIGHT = {
  ...UI_DAY,
  wall: "#2a1f18",
  paper: "#1f1712",
  "paper-2": "#261c16",
  slip: "#e9dcc0",
  ink: "#f3e6cc",
  "ink-2": "#dccbaa",
  muted: "#b8a384",
  line: "rgba(243, 230, 204, 0.16)",
  "line-strong": "rgba(243, 230, 204, 0.35)",
  "control-border": "#cdb994",
  accent: "#e9b949",
  "accent-hover": "#f3cb6a",
  "accent-soft": "#3a2b1c",
  focus: "#86b0ff",
  danger: "#ff9d8a",
  ok: "#8fd69a",
  star: "rgba(255, 222, 160, 0.14)",
  vignette: "rgba(0, 0, 0, 0.4)",
  "grain-blend": "soft-light",
  "grain-opacity": "0.5",
  "btn-shadow": "rgba(0, 0, 0, 0.55)",
  "btn-tint": "rgba(243, 230, 204, 0.08)",
  "btn-tint-active": "rgba(243, 230, 204, 0.14)",
  "primary-bg": "#e2ae45",
  "primary-hover": "#efbf5c",
  cover: "#140d09",
  "plan-best-border": "rgba(233, 185, 73, 0.55)",
};

// The browser chrome colour (<meta name="theme-color">): the wall.
export const THEME_COLOR = { light: UI_DAY.wall, dark: UI_NIGHT.wall };

const decl = (p, names, indent) => names.map((n) => `${indent}--${n}: ${p[n]};`).join("\n");

// The three blocks every page needs: the paper room on :root, and the night
// room for a reader who chose it (data-theme="dark", set by theme.js) or whose
// system is dark and who did not choose the paper room. Plain CSS cannot share
// one declaration block between a media query and a selector, so the night
// block is written twice, from one source, here.
//   extra: { day: [[name, value]...], night: [[name, value]...] } more tokens.
export function themeCss(DAY, NIGHT, extra = { day: [], night: [] }) {
  const names = Object.keys(DAY);
  const changed = names.filter((n) => DAY[n] !== NIGHT[n]);
  const x = (list, indent) => list.map(([n, v]) => `${indent}--${n}: ${v};`).join("\n");
  const day = decl(DAY, names, "  ") + (extra.day.length ? "\n" + x(extra.day, "  ") : "");
  const night = (indent) => decl(NIGHT, changed, indent) + (extra.night.length ? "\n" + x(extra.night, indent) : "");
  return `:root {\n  color-scheme: light;\n${day}\n}\n` +
    `:root[data-theme="dark"] {\n  color-scheme: dark;\n${night("  ")}\n}\n` +
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;\n${night("    ")}\n  }\n}\n`;
}

// The same switch for rules that are not tokens (which drawing layers show at
// night): `nightRule(".ink-art .day-only", "display: none;")`.
export function nightRule(sel, body) {
  const list = sel.split(",").map((s) => s.trim());
  return `${list.map((s) => `:root[data-theme="dark"] ${s}`).join(",\n")} { ${body} }\n` +
    `@media (prefers-color-scheme: dark) {\n  ${list.map((s) => `:root:not([data-theme="light"]) ${s}`).join(",\n  ")} { ${body} }\n}\n`;
}

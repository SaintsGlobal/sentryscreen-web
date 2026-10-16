// The drawing palette, as CSS for pages outside site/ (the character sheets
// and the standalone SVGs). site/styles.css carries the same values as
// tokens (docs/DESIGN.md "Palette"); change them together.

export const DAY = {
  "ink-line": "#2b1d16",
  navy: "#262a3b", "navy-light": "#353b54", "navy-deep": "#1b1e2b",
  glow: "#fff7dc", ink: "#2b1d16", shield: "#5f9a4c",
  mustard: "#d6a53a", "mustard-dark": "#b0842a",
  teal: "#7f9c94", "teal-dark": "#66827b", "teal-deep": "#4d6660", "beacon-on": "#ffd24d",
  maroon: "#81302b", terracotta: "#c0603f", sage: "#95a67d", green: "#566f48", "green-deep": "#40573a",
  cream: "#f6ecd5", cocoa: "#6b3f26", cheek: "rgba(214, 110, 90, 0.75)", steam: "rgba(43, 29, 22, 0.45)",
  skin: "#e3955a", purple: "#6c4f82", hair: "#5a3a28",
  halo: "#ffe7a8", "halo-green": "#9fdc8a", beacon: "#ffcf4a",
};

// The night room: lamp-lit, so painted things darken a little and warm up,
// and everything that glows glows more.
export const NIGHT = {
  ...DAY,
  "ink-line": "#140d09",
  navy: "#232639", "navy-light": "#30354b",
  mustard: "#c9973a", "mustard-dark": "#9f7527",
  teal: "#6f8981", "teal-dark": "#58716a",
  maroon: "#74302a", terracotta: "#ad5638", sage: "#83926c", green: "#4c6340",
  cream: "#e6d6b4", skin: "#d08650", purple: "#5f4673", hair: "#4a3022",
  steam: "rgba(246, 236, 213, 0.55)",
  halo: "#ffd98a",
};

const NAMES = Object.keys(DAY).filter((k) => !k.startsWith("halo") && k !== "beacon" && k !== "ink-line");

export function vars(p) { return Object.entries(p).map(([k, v]) => `--c-${k}:${v};`).join("") + `--ink-line:${p["ink-line"]};`; }

// Class rules: k-<name> fills, l-<name> strokes, s = the ink line.
export const CLASS_CSS =
  ".s{stroke:var(--ink-line);stroke-linecap:round;stroke-linejoin:round}.nf{fill:none}" +
  NAMES.map((n) => `.k-${n}{fill:var(--c-${n})}`).join("") +
  NAMES.map((n) => `.l-${n}{stroke:var(--c-${n})}`).join("") +
  ".l-ink{stroke:var(--ink-line)}.st-halo{stop-color:var(--c-halo)}.st-halo-green{stop-color:var(--c-halo-green)}.st-beacon{stop-color:var(--c-beacon)}" +
  ".halo{opacity:.35}.halo-strong{opacity:.75}.night .halo{opacity:1}";

// The living room (the home page hero). Same rule: painted things darken and
// warm up at night, lit things (the screen, the lamp, the moon) stay bright.
export const ROOM_DAY = {
  wood: "#a0663a", "wood-dark": "#7a4a28", "wood-light": "#b57a48",
  bezel: "#d9cdb4", screen: "#fbf5e6", bar: "#ddcfb2", tile: "#cdbd9c", "tile-2": "#b9cdbf",
  cover: "#1d1714", "cover-ink": "#f3e6cc",
  sky: "#b9cdbf", cloud: "#fbf5e6", sun: "#d6a53a", "night-sky": "#2c3552", moon: "#f3e6c0",
  rug: "#eee4cf", "rug-shade": "#ddd0b5", pot: "#c0603f", "pot-rim": "#d9782f",
  shade: "#c0603f", "shade-in": "#e9a15d", seat: "#d6a53a", frame: "#b57a48",
  shadow: "rgba(43, 29, 22, 0.16)", light: "rgba(255, 214, 140, 0)",
  // the room's own wall inside the hero frame, a shade deeper than the page's
  "room-wall": "#ead6ae",
};
export const ROOM_NIGHT = {
  ...ROOM_DAY,
  wood: "#7d5030", "wood-dark": "#5c3820", "wood-light": "#8d5c36",
  bezel: "#a89b83", screen: "#f7eed8", bar: "#d6c6a6", tile: "#c2b08d",
  rug: "#b9ac93", "rug-shade": "#a79a81", pot: "#9c4e33", "pot-rim": "#b5642a",
  shade: "#d9783f", "shade-in": "#ffd28a", seat: "#b5893a", frame: "#8d5c36",
  shadow: "rgba(0, 0, 0, 0.3)", light: "rgba(255, 205, 128, 0.42)",
  "room-wall": "#34261c",
};

export const ROOM_NAMES = Object.keys(ROOM_DAY);
export const PAINT_NAMES = NAMES;

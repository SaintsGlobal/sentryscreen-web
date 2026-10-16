# SentryScreen site design

The rules for `site/`. Every
colour, font size, spacing value and corner radius in `site/styles.css` comes
from a token defined here. This file sits in `docs/`, not in
`site/`, because everything in `site/` is published (SITE.md).

## The direction

Every page wears the hand-inked cartoon style of the v2 marketing animations:
paper and brown ink, one
hand-lettered face, inked controls, and Lantern, the Detector character.
Three page kinds share it:

- **The home page**: the drawn living room in the hero, then paper sections.
  On a computer screen the hero is one scene: the copy and the room share the
  wall and stand on the same floor ("Hero" under Components).
- **Interior pages** (Support, 404): a short wall at the top
  (`.page-head`) with the page's h1 on the sparkle wallpaper and Lantern
  standing on its bottom line, then paper.
- **Reading pages** (Privacy): the calm legal
  variant (`body.legal-page`, `.prose`). The same paper and ink and the
  lettered h1, and nothing else drawn: h2s in the sans over a rule, a 40rem
  measure, 1.7 leading. Legal text is read, not browsed.
All drawings are generated, never hand-edited: `design/ink.mjs` (the line),
`design/detector.mjs` (the characters), `design/palette.mjs` (their colours),
`design/build-hero.mjs` (the room, written into `index.html`, the theme region
of `styles.css`, and the tiles in `site/art/`), `design/build-figures.mjs`
and `design/build-figures.mjs` (the mark, the standing figures,
`favicon.svg`). `design/detector.mjs` is Lantern's one source. SITE.md has
the commands.

## Where the values live

| Source | What | Written into |
|---|---|---|
| `design/theme.mjs` | the interface colour tokens, both rooms | `styles.css` theme region (by `build-hero.mjs`) |
| `design/palette.mjs` | the drawing paints, both rooms | the same theme region, as `--c-<name>` |
| `site/styles.css` `:root` | type, spacing, radii, the ink edge, motion, layout | hand-written |

Change a colour in `design/theme.mjs`, run `node design/build-hero.mjs`, then
`site-check/stamp-assets.sh`.

## The two rooms

**Paper room** (light): a warm cream wall with a faint sparkle wallpaper and
paper grain, a wooden floor, dark brown ink. Reads like a page from a picture
book, in daylight.

**Night room** (dark): the same room after dark, lit by the desk lamp: the
wall goes to warm brown, the ink to cream, the window shows the moon, a pool
of lamplight glows behind the desk, and the Detector's eyes glow brighter.
Warm and dim, never black and never blue; the only cool colour is the night
sky in the window.

The two rooms share every drawing; only the tokens change.

**Which room shows.** The paper room tokens sit on `:root`. The night room
applies when the reader chose it (`<html data-theme="dark">`) or when the
system is dark and the reader did not choose the paper room
(`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`).
`design/theme.mjs` `themeCss()` writes both night blocks from one list, and
`nightRule()` does the same for the few non-token rules (which drawing layers
show at night).

**The switch** (`site/theme.js`, the `.theme-toggle` button):

- `theme.js` is the only script in `<head>`, loaded without `defer` before
  the stylesheet, so a saved choice is on `<html>` before first paint; the
  page never flashes the other room. It is first-party (`script-src 'self'`),
  never inline.
- The choice lives in `localStorage` under `sentry-theme` (`light` or
  `dark`), read and written inside try/catch; with storage blocked the choice
  lasts for the page. No choice means the page follows the system, live.
- The button is a real `<button>` with `aria-pressed` ("Dark mode", pressed
  in the night room). It sits right of the nav links from 900 px, and as a
  labelled row in the mobile menu below that.
- Without script, `.needs-js` things (the toggle) are hidden and the page
  follows the system. `theme.js` also sets `.has-js`, which hides
  `.no-js-only` fallbacks.
- It updates the `theme-color` metas to the room's `--wall`.
## Surfaces

A component takes its colours from the surface it sits on, and no component
picks its own colours.

| Surface | Where | Background | Text |
|---|---|---|---|
| **wall** | the hero room, `.page-head`, the sticky header | `--wall` (+ sparkles, grain) | `--ink`, `--ink-2` |
| **paper** | the page | `--paper` | `--ink`, `--ink-2`, `--muted` |
| **band** | every other home section | `--paper-2` | same as paper |
| **slip** | inputs, the Pause control | `--slip` | `--slip-ink` |
| **cover** | the footer, the first download card | `--cover` | `--cover-ink`, `--cover-muted` |

Every surface sets the same local tokens, and `.btn`, links, inputs and the
focus ring read them. They are declared once on `:root` (a custom property
that refers to another is resolved where it is declared, and `:root` is where
the room's colours change); `.site-footer` and `.plan-best` redeclare them
for the cover.

| Local token | Wall, paper, band | Cover |
|---|---|---|
| `--btn-ink` | `--ink` | `--cover-ink` |
| `--btn-border` | `--control-border` | `--cover-border` |
| `--link` | `--accent` | `--cover-ink` |
| `--focus-ring` | `--focus` | `--cover-focus` |
| `--surface` | `--paper` | `--cover` |

## Palette

Interface tokens, `design/theme.mjs`:

| Token | Paper | Night | Use |
|---|---|---|---|
| `--wall` | `#f0e2c4` | `#2a1f18` | the wall surfaces, `theme-color` |
| `--paper` | `#f6ecd5` | `#1f1712` | the page |
| `--paper-2` | `#ecdcbb` | `#261c16` | bands |
| `--slip` / `--slip-ink` | `#fbf5e6` / `#2b1d16` | `#e9dcc0` / `#2b1d16` | paper slips: inputs, the Pause control |
| `--ink` | `#2b1d16` | `#f3e6cc` | headings, body |
| `--ink-2` | `#4a3326` | `#dccbaa` | secondary text |
| `--muted` | `#6b5140` | `#b8a384` | captions, labels |
| `--line` / `--line-strong` | ink at 20% / 45% | cream at 16% / 35% | dividers, the legal h2 rule |
| `--control-border` | `#2b1d16` | `#cdb994` | ink edges of secondary buttons, cards, panels, the toggle |
| `--accent` / `--accent-hover` | `#8e3b22` / `#6f2c18` | `#e9b949` / `#f3cb6a` | eyebrows, links (brick by day, lamp gold at night) |
| `--accent-soft` | `#f1dcb4` | `#3a2b1c` | callout fill |
| `--primary-bg` / `--primary-hover` / `--primary-ink` | `#d6a53a` / `#e3b44d` / `#2b1d16` | `#e2ae45` / `#efbf5c` / `#2b1d16` | the one primary button (mustard) |
| `--btn-shadow` | `#2b1d16` | black at 55% | the offset shadow; also the primary button's edge |
| `--btn-tint` / `--btn-tint-active` | ink at 6% / 11% | cream at 8% / 14% | secondary hover / pressed fill |
| `--focus` | `#2458c6` | `#86b0ff` | focus ring |
| `--danger` / `--ok` | `#a3311e` / `#3d6b30` | `#ff9d8a` / `#8fd69a` | form messages |
| `--star` | brown at 22% | lamp yellow at 14% | the wallpaper sparkles |
| `--vignette` | brown at 14% | black at 40% | the wall's darkened edges |
| `--grain-blend` / `--grain-opacity` | multiply / 0.45 | soft-light / 0.5 | the paper grain |
| `--cover` | `#2b1d16` | `#140d09` | the footer, the first download card |
| `--cover-ink` / `--cover-muted` / `--cover-line` | `#f6ecd5` / 72% / 16% | same | text and rules on cover |
| `--cover-border` / `--cover-focus` | cream at 50% / `#86b0ff` | same | control edges and focus on cover |
| `--plan-best-border` | `#2b1d16` | gold at 55% | the first download card's edge (cover on the night paper needs it) |

**Where the accent is allowed:** eyebrows, links and callouts. List bullets and disclosure marks use `--muted` or
`--ink-2`; step numbers have their own rule ("Step numbers" under
Components). None of them is ever mustard.

**Drawing palette** (`design/palette.mjs`, generated into `styles.css` as
`--c-<name>`): the painted colours of the v2 animations, a small set of
earthy paints: navy (the Detector's body), glow cream (its eyes), shield
green (the success icon and the window dot in the hero; Lantern wears no
shield), mustard, teal, maroon, terracotta, sage, wood browns, the room wall,
cream, and the ink line `#2b1d16` (night `#140d09`, `--ink-line`). At night
painted things darken a little and warm up, lit things (the screen, the lamp,
the moon, the eyes) stay bright. Drawings never use interface tokens, and the
interface never uses drawing colours, with two exceptions: the `.swash`
underline is `--c-mustard`, and the `.page-head` bottom rule is `--ink-line`.

**Illustration colours are exempt.** The four demo desks (`.demo-*`) draw a
Mac in its own colours (window chrome, dock icons, chat bubbles, the picture
block). They are pictures, not interface, so they keep literal values, and
their sizes are in container units so they scale with the picture.

**The `theme-color` metas copy tokens.** A `<meta>` cannot read a CSS
variable, so every page carries literal copies of `--wall` (`#f0e2c4` /
`#2a1f18`), and `theme.js` carries them too (`site-check/theme.test.mjs`
checks they match `design/theme.mjs`).

## Ink line and grain

- **The line** is the v2 brush: each shape's points are densified, jittered
  by a seeded amount and traced as smooth curves, then stroked twice (a full
  line and a thinner, slightly offset second pass), which gives the uneven
  weight of a brush pen. Outer outlines are 5–6 units, inner detail 2.5–4.
  Every drawn shape has an ink outline; only glows, shading and the
  wallpaper sparkles have none.
- **Fills are flat**, with at most one darker shading shape. No gradients on
  objects; radial gradients are only for light (eye halos, the lamp).
- **Grain**: one 220 px feTurbulence tile (`art/grain.svg`) over the wall,
  multiply by day, soft-light at night.
- **Interface ink**: inked controls and panels have a `--edge` (3 px) border,
  an irregular radius (`--r-ink` for buttons and cards, `--r-ink-sm` for
  small things), and a hard offset shadow with no blur: `--lift` (3 × 4 px),
  `--lift-hover` (4 × 5), `--lift-press` (1 × 1) and `--lift-panel` (5 × 6,
  cards, the menu). Nothing else on the page has a shadow.
- **Which edge colour.** Secondary buttons, cards, panels, the toggle and
  inputs on paper use `--btn-border` (`--control-border`), which holds 3:1 in
  both rooms. The primary button's edge and every shadow are `--btn-shadow`:
  at night that is a dark shadow, and a near-black edge on the night paper
  would fail 3:1 for anything but the mustard button, whose fill already
  marks it.

## Type

Two faces, and a mono for code only:

- **Lettering**, `--display`: Shantell Sans Bold, self-hosted
  (`site/fonts/`, SIL OFL 1.1; SITE.md "Fonts"), falling back to Chalkboard
  SE. Only at weight 700 and only for: h1, h2, card h3s, step
  numbers, the disclosure `+`, the wordmark and the primary button. Never for
  running text, labels or anything under `--fs-lead`.
- **Body**: the system sans (`--body`), for everything else, including the
  eyebrow (bold, uppercase, letter-spaced) and the legal pages' h2s.
- **Mono** (`--mono`): code and the privacy inventory only.

All sizes are in rem, so they follow the reader's browser text size.

| Token | Size | Use |
|---|---|---|
| `--fs-xs` | 0.8rem | card name, table head, meta line |
| `--fs-sm` | 0.9rem | labels, notes, the eyebrow, the Pause control |
| `--fs-base` | 1rem | buttons, nav, short card text, legal h3, step numbers |
| `--fs-body` | 1.0625rem, 1.125rem ≥900 px | running text, FAQ questions |
| `--fs-lead` | 1.15rem | lede, the primary button's lettering |
| `--fs-h3` | 1.2rem | h3, the wordmark, legal h2 |
| `--fs-h2-sm` | clamp(1.5rem, 2.6vw, 1.9rem) | smaller h2 (footer, support headings) |
| `--fs-h2` | clamp(1.75rem, 3vw, 2.5rem) | section h2 |
| `--fs-h1-page` | clamp(1.9rem, 3vw + 1rem, 3rem) | h1 on interior and reading pages |
| `--fs-h1-letter` | clamp(2.1rem, 2.2vw + 1rem, 3.2rem) | the hero statement (three lines from 1024 to 1920 px, four on a phone) |
| `--fs-glyph` | 1.5rem | the disclosure `+` |

An h3 is always larger than body text and bold. Nothing uses a size between
the steps above. Headings and long links break anywhere rather than overflow
at large text sizes.

## Spacing

One scale. Margins, paddings and gaps use only these values.

| Token | rem | px at 16 |
|---|---|---|
| `--space-1` | 0.25 | 4 |
| `--space-2` | 0.5 | 8 |
| `--space-3` | 0.75 | 12 |
| `--space-4` | 1 | 16 |
| `--space-5` | 1.5 | 24 |
| `--space-6` | 2 | 32 |
| `--space-7` | 2.5 | 40 |
| `--space-8` | 3 | 48 |
| `--space-9` | 4 | 64 |
| `--space-10` | 6 | 96 |

Section padding is `--section-pad`, clamp(4rem, 8vw, 7rem). The side gutter
is `--gutter`, 1.25rem, and 2.5rem from 900 px wide.

Sizes that are not spacing: `--control-h` 3rem (buttons, inputs, menu rows),
`--header-h` 4.25rem, `--tap-min` 44px, `--wrap` 76rem. Text measures:
`--measure` 36rem, `--measure-legal` 40rem; the few column widths (38rem
hero copy and 60rem hero room from 900 px, 48rem reading column) stay as
written at their one use.

## Radii

| Token | Value | Use |
|---|---|---|
| `--r-ink` | 14/18/12/20 px, hand-cut | buttons, cards, panels, the hero frame (under 900 px), videos |
| `--r-ink-sm` | 10/14/9/12 px, hand-cut | inputs, the toggle, the Pause slip, the skip link |
| `--r-xs` | 3px | focus ring, list markers |
| `--r-md` | 10px | callouts |
| `--r-pill` | 999px | the chip |

`--r-sm` and `--r-lg` remain for plain (uninked) shapes; prefer the ink radii.

## Components

**Buttons.** Every button is inked (`--edge`, `--r-ink`, `--lift`) and at
least 48 px tall (`--control-h`), except the small size (`.btn-sm` in the
header), which is at least 44 px
(`--tap-min`). The same three kinds on every page:

- **Primary** (`.btn .btn-primary`): mustard `--primary-bg`, lettering at
  `--fs-lead` in `--primary-ink`, a `--btn-shadow` edge. One per page, for
  the action that page exists for: the home hero's "Download"; on every
  other page the header's "Download" (to GitHub Releases), so the Support
  and 404 pages' own main actions are strong buttons.
- **Strong** (`.btn .btn-strong`): a neutral fill (`--btn-ink` behind the
  surface colour). The first choice inside a group (the first download
  card) and the main action on
  Support and 404. Never mustard.
- **Secondary** (`.btn`): transparent, `--btn-border` edge, `--btn-ink`
  text.
- Sizes: `.btn-lg` (the hero's Download), `.btn-sm` (the header).

States, the same for every kind:

| State | Look |
|---|---|
| hover | lifts 1 px, `--lift-hover`; secondary fills `--btn-tint`, filled buttons take their hover fill |
| pressed (`:active`) | pushed into the paper: moves 2 × 3 px, `--lift-press`; secondary fills `--btn-tint-active` |
| focus (`:focus-visible`) | 3 px `--focus-ring` outline, 3 px offset |
| disabled (`:disabled`, `[aria-disabled=true]`) | no lift, no shadow, 55% opacity, `not-allowed` cursor |

**Button words.** Say what the reader gets: "Download", "Source on GitHub",
"Open an issue".

**Cards** (`.plan`, `.card`, `.demo`):
`--paper` (or the illustration), an `--edge` `--control-border` border,
`--r-ink`, `--lift-panel`. Never a `--btn-shadow` edge: at night that is
near black on the night wall (about 1.2:1) and the card loses its edge. The
first download card (`.plan-best`) is `--cover` with `--plan-best-border`.

**Step numbers** (the setup steps and "How to check a Mac"): the numeral in the lettering (`--display`, 700, at
`--fs-base`) in `--ink-2`, centred in a 28 px circle (1.75rem on web pages,
so it grows with the text size) filled with `--paper-2`, with a 2 px
`--line` edge. No mustard, no ink edge, no shadow.

**The theme toggle** (`.theme-toggle`): a 44 px `--r-ink-sm` square with a
sun or moon drawn in `currentColor`, its ink edge showing on hover and focus;
`aria-pressed` as above. In the
mobile menu it is a full-width row with its label ("Dark mode") and a small
switch.

**Header** (`.site-header`): sticky, on `--wall`, with a 3 px `--btn-shadow`
rule under it. The mark and wordmark, the nav links (a Menu disclosure under
900 px), the theme toggle, and on every page but the home page a small
primary button. The header and footer are identical on every site page
(they are written by the same template), except that the home page has
no header button.

**Footer** (`.site-footer`, cover): the mark and wordmark, the links Support
· Privacy · Source code · Releases · License (AGPL-3.0), then the company block
("SentryScreen, LLC", the street address, city). No mail link.

**Disclosures** (setup steps, FAQ, the mobile menu): one `+` in lettering
that turns 45° when open. The whole summary row is at least 44 px tall. On
hover the question turns `--link`. The opened body fades in.

**Menu panel** (under 900 px): a `--paper` card with the ink edge and
`--lift-panel`.

**Page head** (`.page-head`): the wall with sparkles, the h1 and lede, and
where the page has him, Lantern (`.page-figure`, 11rem wide, 15rem from
620 px) standing on the bottom rule.

**The support address** is never a `mailto:` link. On the Support
page it is assembled by `support.js` after "Show email" is pressed, with a
spelled-out no-script fallback ("support at sentry-screen dot com"). Legal
pages state it as plain text, because a legal notice must name a contact.

**Callouts** (`.callout`): a 4 px `--accent` left rule on `--accent-soft`,
`--r-md` on the right corners. Reading pages only.

**Links** outside running text (footer, nav, standalone lines) are at least
44 px tall. Links inside a sentence stay inline (the WCAG 2.5.8 inline
exception).

**The swash**: one brush-stroke underline, under "covered" in the hero h1.
One per page, never on a link.

**Hero** (`.hero`, home page): the wall, then the assurances on paper. The
room is one drawing (`design/build-hero.mjs`) that brings its own floor.

- **From 900 px it is one scene, never a card beside the text.** The wall
  (sparkles, grain, vignette) runs the full width of the window; the copy
  stands on its left (a 38rem column from the page's left edge) and the room
  on its right, unframed, running on to the window's right edge (up to
  60rem wide). The drawing's floor runs out of the room to both edges of the
  window, under the copy, and the wall's bottom edge is the floor's; the
  copy always ends above the floor (an empty grid cell as tall as the floor,
  2/15 of the room's width, sits under it). The grain lies over the drawing
  and under the copy, so the two read as one surface.
- **Under 900 px** the room sits under the copy in its inked frame (edge to
  edge and cropped from the left on phones, 3:2 with the hand-cut corner and
  `--lift-panel` from 620 px), the frame's background the wallpaper.
- Text is never set on the drawing: nothing of the copy overlaps the room or
  the floor.

**Pause control** (`.motion-toggle`): a small paper slip in the scene's top
right corner (the frame's under 900 px; from 900 px the wall's, level with
the top of the copy and clear of the drawing), the icon (two bars, or a
triangle when paused) and the word "Pause" / "Play"; the icon alone under
620 px, its name kept for screen readers ("Pause animation"). At least
44 × 44 px.

## The Detector (mascot rules)

The Detector stands for the detector on the Mac: a boxy friend with glowing
eyes and a small hand lantern. **A, Lantern** was chosen (2026-09-27); B
and C are retired from the site. Lantern's chest is plain: the green
check-shield badge of the first sheets was removed (2026-09-28), so
nothing is drawn there. It must read as fun, friendly and trustworthy, never
creepy.

- **Its eyes are soft**: rounded glowing cream shapes, sometimes happy
  arcs; never red, never slits, never pupils that track, never a "scanning"
  beam. Alert means the eyes brighten and a "!" appears, not anger.
- **It never watches the child.** It faces the reader or the room, stands
  beside the desk, never behind the chair or over the child's shoulder, and
  never looks into the screen. The cover does the work; the Detector does not
  peer at what it covered.
- **Nothing suggestive, anywhere**: covered pictures are plain slabs with
  "Content blocked", the picture under a cover is never drawn, and no pose,
  gesture or prop can be misread.
- **One Detector per view**, at most, and never smaller than about 120 px
  tall, so its face reads. Never cropped through the face.
- **Poses**: neutral, waving hello, alert (spotted something), all clear.
  Use the pose that fits the message; alert only next to copy about a cover
  landing, never as decoration.
- **Where he stands: only where something starts or succeeds.** The hero
  room and Support (waving). Never on a failure or error page. **The 404 is the one exception** (neutral pose): a lost reader,
  not bad news, and he points the way home.
- **Not a spinner, not an error icon.**
- **The mark is the one exception** to both "not a logo" and "one per view":
  Lantern's face alone, 32 × 32 units (`lanternFace()`), is the wordmark's
  mark in the header and footer, and the favicon. It is
  a face, not a figure, so it does not count as a Detector in the view.

## Motion

Drawn motion lives only in the hero room (SVG plus CSS), with no audio. It
starts only when `hero.js` adds `.is-animated` inside
`prefers-reduced-motion: no-preference`; otherwise, and with script off, the
room is a still drawing and the Pause control is hidden. Figures outside the
hero are still.

| What | Timing | Why |
|---|---|---|
| line boil | 3 drawings, 0.5 s cycle (6 a second) | the v2 animations' hand-redrawn shimmer |
| bob | 3.2 s ease-in-out, 3 px | breathing, reads as alive, not busy |
| blink | every 5.2 s, 0.1 s | friendly, avoids a fixed stare |
| wave | once every 9 s, three swings, then rests | a hello, not a loop the eye must follow |
| leaf sway / lamplight | 6 s / 4 s, small | the room is lived in |

The Pause control stops all of it (`animation-play-state`), and the room
pauses by itself while off screen.

Interface motion:

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120ms | button lift and press, colour |
| `--dur` | 200ms | disclosure marks, reveals, the menu panel |
| `--ease` | cubic-bezier(.2, .7, .2, 1) | everything |

Under `prefers-reduced-motion: reduce` every transition and animation is off;
the room is still, and the demo desks show their covered frame.

## Fixed sizes outside the scale

Deliberately literal, not tokens. Each is the size of a drawn object, not
spacing or type, and none should be reused elsewhere:

| Where | Value | Why |
|---|---|---|
| `.mark` | 30px square | Lantern's face beside the wordmark; drawn on a 32-unit grid like `favicon.svg` |
| `.theme-icon` | 22px square | the sun / moon glyph inside a 44 px button |
| `.nav-menu summary::before` | 16 × 12px | the three-line menu glyph |
| `.motion-icon` | 10 × 12px | the Pause bars / Play triangle |
| `.skip:focus` | `z-index: 30` | above the sticky header (20) and the menu panel (10) |

## Breakpoints

Media queries cannot read custom properties, so these are written as numbers.
Use only these.

| Name | Width | What changes |
|---|---|---|
| sm | 620px | the two download cards sit side by side; the hero room gets its inked 3:2 frame (until lg); the page head puts Lantern beside the h1; the Pause control shows its word |
| md | 760px | demos, limits, assurances and the footer go to two or three columns |
| lg | 900px | 18 px body, wide gutter, the nav links and toggle replace the Menu, the hero becomes one scene (the frame goes, the room stands beside the copy on one wall and floor), rail-and-body sections, the support grid |

## Contrast (WCAG AA)

Computed 2026-09-27 from the token values in `design/theme.mjs` (WCAG 2
relative luminance; translucent tokens composited over the surface).

| Pair | Paper | Night |
|---|---|---|
| `--ink` on `--wall` | 12.7:1 | 13.0:1 |
| `--ink-2` on `--wall` | 9.1:1 | 10.1:1 |
| `--muted` on `--paper-2` (worst surface) | 5.4:1 | 6.8:1 |
| `--accent` (links) on `--paper-2` | 5.5:1 | 9.1:1 |
| `--focus` on `--paper-2` | 4.7:1 | 7.7:1 |
| `--danger` / `--ok` on `--paper-2` | 5.1:1 / 4.6:1 | 8.3:1 / 9.7:1 |
| `--primary-ink` on `--primary-bg` | 7.2:1 | 8.0:1 |
| `--slip-ink` on `--slip` | 15.0:1 | 12.0:1 |
| `--control-border` on `--wall` / `--paper-2` (3:1 needed) | 12.7 / 12.0:1 | 8.4 / 8.7:1 |
| `--cover-ink` / `--cover-muted` on `--cover` | 13.9 / 7.8:1 | 16.4 / 8.7:1 |
| `--cover-border` / `--cover-focus` on `--cover` | 4.5 / 7.5:1 | 4.7 / 8.9:1 |
| `--plan-best-border` on `--paper` | 13.9:1 | 3.8:1 |

The mustard button against the paper wall is only 1.8:1, so its 3 px ink
edge is what marks the control's boundary; keep the edge. Text is never set
on the drawing.

## Accessibility floor

- Text contrast of at least 4.5:1, and 3:1 for control edges, on every surface
  in both rooms.
- Tap targets of at least 44 × 44 px (`--tap-min`) outside running text.
- Every control can be reached and used with the keyboard, and shows the focus
  ring; the toggle and Download are real buttons or links, with their
  state in `aria-pressed` / `aria-expanded`.
- Every page works without script: the room follows the system and the support
  address is spelled out.
- At 200% text size, and at 320 px wide, nothing scrolls sideways.

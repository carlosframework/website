---
name: CARLOS Framework Site
description: An evidence-first architecture site — drawn letterforms, hairline rules, and one accent per page.
colors:
  bg: "#fbfbfd"
  bg-sunk: "#f2f3f7"
  surface: "#ffffff"
  ink: "#0c1015"
  ink-2: "#3c4757"
  muted: "#667385"
  rule: "rgba(12, 16, 21, 0.11)"
  rule-soft: "rgba(12, 16, 21, 0.06)"
  accent-teal: "#067a68"
  accent-teal-deep: "#04564a"
  accent-teal-soft: "rgba(6, 122, 104, 0.10)"
  accent-blue: "#0d5f88"
  accent-blue-deep: "#094761"
  accent-blue-soft: "rgba(13, 95, 136, 0.10)"
  on-accent: "#ffffff"
  sig-s: "#667385"
  sig-a: "#067a68"
  sig-b: "#8a5a12"
  sig-c: "#b03f29"
typography:
  display:
    fontFamily: "Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif"
    fontSize: "clamp(2.5rem, 6.4vw, 4.75rem)"
    fontWeight: 700
    lineHeight: 1.015
    letterSpacing: "-0.038em"
  headline:
    fontFamily: "Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif"
    fontSize: "clamp(1.7rem, 3.3vw, 2.4rem)"
    fontWeight: 680
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif"
    fontSize: "1.075rem"
    fontWeight: 680
    lineHeight: 1.3
    letterSpacing: "-0.012em"
  lede:
    fontFamily: "Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif"
    fontSize: "clamp(1.1rem, 2.1vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace"
    fontSize: "0.775rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0.06em"
    fontFeature: "tabular-nums"
  figure:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif-condensed, Inter, Roboto, Arial, sans-serif"
    fontSize: "clamp(2.5rem, 5.5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.035em"
    fontFeature: "tabular-nums"
rounded:
  hair: "1.5px"
  focus: "3px"
  chip: "4px"
  btn: "7px"
  card: "10px"
  figure: "11px"
  pill: "99px"
spacing:
  gap: "clamp(1rem, 2.2vw, 1.5rem)"
  bay: "clamp(3.75rem, 8vw, 7rem)"
  letter-bay: "clamp(3rem, 6vw, 5rem)"
  head: "clamp(2.25rem, 4.5vw, 3.25rem)"
  gutter: "clamp(1.15rem, 4vw, 2.5rem)"
  wrap: "72rem"
  prose: "40rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-teal}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.btn}"
    padding: "0.72rem 1.35rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-teal-deep}"
    textColor: "{colors.on-accent}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.btn}"
    padding: "0.72rem 1.35rem"
  button-ghost-hover:
    textColor: "{colors.accent-teal}"
  card-route:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.card}"
    padding: "1.4rem 1.45rem 1.5rem"
  card-route-lead:
    backgroundColor: "{colors.accent-teal-soft}"
    rounded: "{rounded.card}"
  card-week:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.figure}"
    padding: "1.4rem 1.5rem 1.5rem"
  chip-tag:
    backgroundColor: "transparent"
    textColor: "{colors.sig-a}"
    rounded: "{rounded.chip}"
    padding: "0.16rem 0.42rem"
  code-inline:
    backgroundColor: "{colors.accent-teal-soft}"
    textColor: "{colors.accent-teal-deep}"
    rounded: "{rounded.chip}"
    padding: "0.12em 0.36em"
  note-robot:
    backgroundColor: "{colors.bg-sunk}"
    textColor: "{colors.muted}"
    rounded: "8px"
    padding: "0.7rem 0.95rem"
---

# Design System: CARLOS Framework Site

## Overview

**Creative North Star: "The Annunciator Panel"**

This is an instrument face, not a brochure. Every claim on these pages arrives
attached to the machinery that produces it, and the visual system is built to
make that pairing legible: a heading, a hairline, and a mono receipt line
underneath. Nothing glows to seem important. The pages read exciting, modern
and assertive — deliberately not the warm paper-and-serif world rastrillo.org
already owns.

The whole world ships under the constraints of the architecture it describes:
one hand-written stylesheet, no build step, no JavaScript, no fetched fonts.
That constraint is the source of the system's most distinctive decision — the
six CARLOS letter marks and the wordmark are *drawn* as inline SVG paths on a
shared construction grid, because no installed stack carries a condensed
industrial capital everywhere. Editing a mark means editing path geometry, not
a `font-family`.

Structure is carried by rules, not by boxes. Sections are separated by a
one-pixel hairline and a generous bay of vertical space; list items inside a
section are separated by an even softer hairline. Cards exist, but only four
things in the entire build are cards, and each earned it. Light and dark are
both first-class: every token has a value in each, and the near-black ground
(#0a0c10) is as much the house as the paper white.

**Key Characteristics:**
- Drawn letterforms on a 100x140 grid; no display face anywhere
- One accent per page, teal on `/`, blue on `/platform/` — siblings, never identical
- Hairline rules as the primary divider; cards as an exception that must be argued for
- A four-step signal ramp that only ever encodes app trust class
- Exactly one authored motion moment on the whole site
- Mono reserved for data, identifiers and measurement — never for prose

## Colors

A near-neutral cool grey ground carrying a single saturated accent per page,
plus a four-step signal ramp that is never decorative.

### Primary
- **Sealed Teal** (`#067a68` light / `#2fd4ac` dark): the accent for `/`
  (the framework page). It appears on links, the `.rise` word in the hero
  headline, the primary button, the drawn letter glyphs, the lit hours in the
  week calendar, receipt mechanism labels, inline code, and the focus ring.
- **Substrate Blue** (`#0d5f88` light / `#59bfe8` dark): the accent for
  `/platform/`, declared in a small inline `:root` block on that page only and
  overriding the same four accent tokens. Identical roles, different hue.
- **Accent Deep** (`#04564a` teal / `#094761` blue): hover state of the primary
  button and the colour of inline code in light mode.
- **Accent Soft** (10% light / 13% dark alpha of the accent): the tint behind
  inline code, the lead route card, the final promotion stop, the dependency
  parts, and fleet table row hover.

### Tertiary — the signal ramp
Four hues that encode app trust class and nothing else, keyed off `data-g`.
- **Signal S — Blind Grey** (`#667385` / `#8a94a6`): nothing to see.
- **Signal A — Sealed Teal** (`#067a68` / `#2fd4ac`): host-blind.
- **Signal B — Sealed Amber** (`#8a5a12` / `#f0b34a`): sealed.
- **Signal C — Sighted Coral** (`#b03f29` / `#ff7f60`): sighted.

### Neutral
- **Paper** (`#fbfbfd` light / `#0a0c10` dark): the page ground; also the
  `theme-color` meta value for each scheme.
- **Sunk** (`#f2f3f7` / `#06080b`): recessed fills — unused calendar cells,
  table caption, promotion stops, the authorship note.
- **Surface** (`#ffffff` / `#111621`): the only lifted fill; the four cards.
- **Ink** (`#0c1015` / `#e9edf4`): headings and primary body text.
- **Ink 2** (`#3c4757` / `#b3bdcc`): the reading voice of secondary prose —
  ledger bodies, attribute bodies, ledes.
- **Muted** (`#667385` / `#7f8b9d`): mono data labels, receipts, captions,
  footer, nav at rest.
- **Rule** (11% ink / 12% paper) and **Rule Soft** (6% / 7%): the two hairline
  weights — Rule between sections and around cards, Rule Soft between items
  inside a section.

### Named Rules
**The Sibling Accent Rule.** A page declares exactly one accent, as four tokens
(`--accent`, `--accent-deep`, `--accent-soft`, `--on-accent`) in a small inline
`:root` block. Sibling pages must be visibly related and never identical. A page
never mixes two accents.

**The Signal Reservation Rule.** `--sig-s/a/b/c` encode app trust class only.
They may not be borrowed for emphasis, charts, status pills, or decoration. If a
surface needs amber or coral for any other reason, it does not get them.

**The Two Hairlines Rule.** There are exactly two divider weights. `--rule`
separates sections and outlines cards; `--rule-soft` separates items within a
section. A third weight is a sign the hierarchy is wrong.

## Typography

**Display Font:** none — the Neo-Grotesque sans carries display duty
**Body Font:** Neo-Grotesque from Modern Font Stacks (Inter, Roboto, Helvetica
Neue, Arial Nova, Nimbus Sans, Arial)
**Figure Font:** Industrial from Modern Font Stacks (Bahnschrift, DIN Alternate,
Franklin Gothic Medium, Nimbus Sans Narrow), numerals and short figures only
**Label/Mono Font:** Monospace Code (ui-monospace, Cascadia Code, Source Code
Pro, Menlo, Consolas, DejaVu Sans Mono)

**Character:** One tight, machine-neutral grotesque doing everything from
4.75rem headline to 0.88rem note, kept assertive by negative tracking that
increases with size (-0.038em at display, normal at body). Mono is the only
second voice, and it only ever speaks numbers and names.

### Hierarchy
- **Display** (700, `clamp(2.5rem, 6.4vw, 4.75rem)`, 1.015, -0.038em): the hero
  headline, capped at 17ch so it breaks into three or four short assertive lines.
- **Headline** (680, `clamp(1.7rem, 3.3vw, 2.4rem)`, 1.12, -0.03em): section
  headings and letter-plate headings (the plate variant reduces to
  `clamp(1.5rem, 3vw, 2rem)`).
- **Title** (680, 1.075rem, 1.3, -0.012em): attribute headings; the ledger's
  entry heading steps up to `clamp(1.15rem, 2.2vw, 1.4rem)`.
- **Lede / Standfirst** (400, `clamp(1.1rem, 2.1vw, 1.3rem)` / `clamp(1.05rem,
  1.9vw, 1.2rem)`, 1.55, ink-2): the paragraph directly under a display or
  headline, capped at 46rem.
- **Body** (400, 1.0625rem, 1.65): all prose, `text-wrap: pretty`, capped at
  36rem in ledger and attribute columns (40rem in trust-class descriptions,
  34rem in the fleet table's what column) to hold 65–75ch inside the 72rem wrap.
- **Label** (mono, 0.775rem, 0.06em, tabular numerals, muted): the `.data`
  measurement line, calendar day names, table captions and column heads
  (uppercase at 0.755rem/0.08em), the promotion rail's stop names and SHAs.
- **Figure** (Industrial, 700, `clamp(2.5rem, 5.5vw, 3.75rem)`, 0.95, tabular):
  the platform page's multipliers only, with a mono uppercase unit beneath.

### Named Rules
**The Drawn Letter Rule.** The six CARLOS letters and the wordmark are inline
SVG paths on a shared 100x140 construction grid, cropped by `viewBox="11 11 78
118"` (wordmark `11 11 518 118`, letters advanced 88 units apart). One stroke
weight per context — 21 for the section plates, 18 for the wordmark — with
`stroke-linecap: butt` (`square` on the wordmark), `stroke-linejoin: miter`,
`stroke: currentColor` and `fill: none`, so a mark inherits its colour from the
accent. Changing a mark means editing path geometry. Never substitute a
`font-family` for a mark, and never introduce a fetched display face to imitate
one.

**The Mono Is Data Rule.** `--font-mono` is for measurements, identifiers,
hostnames, SHAs, grades, units and column heads. It is never used for prose and
never worn as a "technical" costume. Its companion: any number that is a
measurement sets in `font-variant-numeric: tabular-nums`.

**The Progressive Figure Rule.** `--font-stencil` (Industrial) is an
enhancement, not a dependency: it appears only on numerals and short figures,
and its last fallback is `var(--font-sans)`. A surface must read correctly when
that stack resolves to nothing special.

**The Zero Fetch Rule.** The site binds to no fetched font and no JavaScript.
Every face is a Modern Font Stacks system stack. A design that needs a webfont
is a design this site does not ship.

## Layout

A single 72rem wrap (`--wrap`) centred inside a fluid page gutter
(`clamp(1.15rem, 4vw, 2.5rem)`), with all structure expressed as full-width
sections separated by a hairline and a bay of `clamp(3.75rem, 8vw, 7rem)`
(`--bay`). Letter sections carry their own slightly tighter bay of
`clamp(3rem, 6vw, 5rem)` inside `.wrap` instead of on the section, so a plate
and its list share one bay rather than two. Section heads get more air below
(`clamp(2.25rem, 4.5vw, 3.25rem)`) than the content needs above.

Content is built from asymmetric two-column grids that collapse to one column
below their own breakpoint — never a global breakpoint set:
- hero body 1fr + 27rem at ≥64rem (headline column and the week figure)
- letter sections 22rem + 1fr at ≥60rem, with the plate `position: sticky` at
  2.5rem so the letter holds the rail while its attributes scroll
- ledger entries 15rem + 1fr at ≥48rem, heading spanning both rows
- trust classes 4.5rem + 12rem + 1fr at ≥46rem, baseline-aligned
- run-it routes three equal columns at ≥52rem
- supporting pairs two equal columns at ≥48rem
- the fleet table becomes stacked blocks below 46rem (head row hidden)
- the week calendar halves to 12 hours below 26rem; actions become full-measure
  stacked buttons at the same width

Rhythm comes from two spacing tokens (`--gap` for grid gutters, `--bay` for
vertical section rhythm) plus local values in the 0.3–1.6rem range. Prose
measure is the real layout constraint: 36rem in the ledger and attribute
columns, 40rem in trust-class descriptions, 34rem in the fleet's description
column, 46rem for ledes and standfirsts.

Browser chrome is themed from the same palette rather than left default:
`::selection` paints accent-on-`--on-accent`; the scrollbar is thin and
rule-coloured in both `scrollbar-color` and `::-webkit-scrollbar` (11px thumb,
99px radius, 3px `--bg` inset border, muted on hover); `:focus-visible` is a
2px accent outline at 3px offset with a 3px radius; links carry a 1px underline
at 0.18em offset that thickens to 2px on hover.

### Named Rules
**The Rule-Not-Box Rule.** Sections and list items are divided by a hairline and
space. Reach for a border-boxed container only when the content is genuinely a
discrete object; four exist on the whole site.

**The Own Breakpoint Rule.** Each pattern declares the width at which its own
content stops working (26rem, 34rem, 46rem, 48rem, 52rem, 60rem, 64rem). There
is no device-named breakpoint scale, and new patterns should not invent one.

## Elevation & Depth

Depth is overwhelmingly tonal and linear: a hairline rule and a change of
ground (`--bg` → `--bg-sunk` → `--surface`) do nearly all the work. Two soft
ambient shadows exist and are used sparingly, always paired with a surface
change, and always in the "resting low / responding high" pattern. Both are
re-tuned for dark mode (deeper, blacker, longer) rather than reused.

### Shadow Vocabulary
- **Resting lift** (`--shadow-1`: `0 1px 2px rgba(12,16,21,0.05), 0 4px 12px
  -5px rgba(12,16,21,0.12)`): the primary button, the week figure, the
  promotion rail — objects that sit slightly above the page at rest.
- **Responding lift** (`--shadow-2`: `0 2px 4px rgba(12,16,21,0.05), 0 22px
  44px -22px rgba(12,16,21,0.25)`): the hover state of the primary button and
  the route cards only.
- **Inset hairline** (`inset 0 0 0 1px var(--rule-soft)`): the unused calendar
  cells — a drawn edge on a recessed fill, not a shadow.

### Named Rules
**The Flat-Until-It-Responds Rule.** Surfaces are flat at rest unless they are
one of the four cards. Shadow escalates only from `--shadow-1` to `--shadow-2`,
and only on hover. There is no third shadow and no shadow on text, icons or
rules.

## Shapes

Rectilinear with a small, consistent softening. Radii climb with the size of
the object: 1.5px on a calendar hour, 3px on the focus ring, 4px on inline code
and tags, 7px on buttons and promotion stops, 9–11px on cards and the fleet
table (which uses `overflow: hidden` so its rows clip to the corner), and 99px
only on the scrollbar thumb. Nothing is a circle; nothing is fully square
except the drawn letterforms, whose miter joins and butt caps are the site's
one hard-edged geometry.

Borders are 1px and either `--rule` (object edge) or `--rule-soft` (item
divider); the accent border marks a chosen thing (lead route card, dependency
parts, hovered route card). One dashed border exists, and it is semantic: a
fleet tag with no declared trust class sets `border-style: dashed`, which is
how the system says "undeclared" without saying "error".

## Components

### Buttons
- **Shape:** softly rounded rectangle (7px), 1px transparent border so the
  ghost variant swaps colour without shifting layout
- **Primary:** accent fill, `--on-accent` text, resting lift shadow, 0.72rem
  1.35rem padding, 600 weight at 0.975rem
- **Ghost:** surface fill, ink text, rule border
- **Hover:** primary deepens to `--accent-deep` and rises 1px to the responding
  shadow; ghost swaps border and text to the accent and rises 1px. Both use a
  140ms `cubic-bezier(.2,.7,.3,1)` transition, return to 0 on `:active`, and
  drop transform and transition entirely under `prefers-reduced-motion: reduce`
- **Layout:** buttons sit in an `.actions` row with 0.75rem gap; below 26rem the
  row becomes a single-column grid with centred labels

### Cards / Containers
Only four things are cards, and each is a discrete object rather than a slice of
the page: the three run-it route cards, the week figure, the fleet table and the
promotion rail.
- **Corner style:** 10px (route, rail, fleet), 11px (week)
- **Background:** `--surface`; the lead route and the final promotion stop use
  `--accent-soft`
- **Border:** 1px `--rule`; the lead route uses 1px accent
- **Shadow:** resting lift on the week and rail; route cards are flat until
  hover, where they take the accent border, the responding shadow, and a 2px rise
- **Internal padding:** ~1.4rem

### Navigation
The masthead is a single baseline-aligned flex row: the drawn wordmark at
1.15rem height on the left, section links pushed right by `margin-left: auto`,
0.875rem, undecorated, muted at rest, ink on hover, accent when
`[aria-current]`. It wraps rather than collapsing — there is no menu button and
no mobile drawer. The wordmark tints to the accent on hover.

### List Items (the ledger and the attribute list)
The site's most-repeated pattern and its real structural unit: a title, a body
capped at 36rem, and — in the ledger — a mono `receipt` line whose `mechanism:`
label sets in accent mono at 600. Items are separated by `--rule-soft` with the
first item's border and top padding removed, so a list starts flush with its
heading.

### Trust Class Row
A three-column baseline-aligned row keyed by `data-g`, which sets a local `--g`
from the signal ramp. The grade sets in mono at 1.15rem/700 in its signal
colour (and `white-space: nowrap`, because "A-public" is wider than one
character); the name in 620 ink; the description in ink-2 at 40rem, with a mono
muted "who" line under it. The fleet table's tags reuse the same `data-g` → `--g`
mechanism as a 0.72rem mono chip with a `currentColor` border.

### The Week Figure (signature)
Seven rows of twenty-four square cells on a `auto repeat(24, 1fr)` grid with a
3px gap: unused hours are `--bg-sunk` with an inset hairline, used hours are
solid accent. It is exposed to assistive technology as a single `role="img"`
with a full descriptive label, not as 168 elements. Below 26rem the grid halves
to twelve columns and the day label takes its own full-width row.

### The Promotion Rail (signature)
A wrapping flex row of equal-basis stops on `--bg-sunk` at 7px radius, each
carrying a mono name and a mono accent SHA, joined by muted arrow glyphs that
disappear below 34rem; the final stop takes `--accent-soft` plus a 1px accent
outline, and a full-width mono footer line closes the rail.

### Motion
One authored moment on the entire site: the week calendar's used hours arrive
in sequence on load — `@keyframes wake` scales each lit cell from 0.5 through a
1.35 overshoot to 1 while its fill goes from sunk to accent, over 560ms on
`cubic-bezier(.16,1,.3,1)`, staggered by `calc(var(--i) * 48ms + 320ms)` from an
inline index. It uses `animation-fill-mode: backwards` from a state that is
already visible, and the whole block is nested inside
`@media (prefers-reduced-motion: no-preference)`, so a reduced-motion visitor
sees the finished grid immediately rather than an empty one. Everything else
that moves is a 140–160ms hover response.

## Do's and Don'ts

### Do:
- **Do** divide with hairlines and space first; a card must be a discrete object
  you can name, not a way to group paragraphs.
- **Do** declare a page's accent as the four accent tokens in a small inline
  `:root` block covering both colour schemes, and give every new token a light
  and a dark value.
- **Do** attach every claim to its mechanism — the ledger's mono `receipt` line
  is the system's way of saying "check this".
- **Do** set measurements, identifiers, grades, hosts, SHAs and column heads in
  mono with tabular numerals.
- **Do** draw new letterforms as inline SVG on the 100x140 grid at the existing
  stroke weight, caps and joins, with `stroke: currentColor` and `fill: none`.
- **Do** cap prose at 34–40rem inside the 72rem wrap so lines land at 65–75
  characters.
- **Do** let each pattern choose the width at which its own content breaks.
- **Do** theme the surfaces you did not draw: selection, scrollbar, focus ring,
  underline offset.
- **Do** gate any animation behind `prefers-reduced-motion: no-preference` and
  make the un-animated state the complete one.

### Don't:
- **Don't** use the signal ramp (`--sig-s/a/b/c`) for anything but app trust
  class.
- **Don't** fetch a font or add JavaScript; the site ships under the same rules
  as the architecture it describes.
- **Don't** set a letter mark or the wordmark in a typeface, and don't add a
  display face — the drawn marks are the display voice.
- **Don't** put prose in mono, or use mono to make a passage look technical.
- **Don't** add a third shadow, a third hairline weight, or a shadow on text,
  icons or rules.
- **Don't** mix two accents on one page, or use the sibling page's accent as a
  secondary colour.
- **Don't** add a second animated moment; the waking week is the site's one
  piece of motion.
- **Don't** introduce a device-named breakpoint scale or a global grid; the
  patterns carry their own.

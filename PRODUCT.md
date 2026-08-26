# 🤖 Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, one per page (confirmed 2026-08-05):

- `/` (index) — developers evaluating whether to build on or adopt the CARLOS
  architecture: people who read 11factor.org, run their own infrastructure, and
  judge a framework by its claims-to-evidence ratio.
- `/platform/` — teams and customers deciding whether to ship their apps on the
  hosted CARLOS platform.

## Product Purpose

The site exists to win adoption, and each page has a concrete success action:

- index → the visitor starts building on the model, beginning with the
  [Claude Code skill](https://github.com/carlosframework/skills). That is the
  hero's primary action; everything else on the page is subordinate to it.
- /platform/ → the visitor gets started at platform.carlosframework.com, or
  takes the hosted route at carloku.com.

## Positioning

Claims a neighboring framework could not truthfully copy:

- A falsifiable security claim: publish the entire database and what leaks is
  metadata, never content. The whole architecture is shaped around this test.
- Extraction, not invention: the shapes were pulled from five real systems that
  each rebuilt them independently.
- Ownership that is testable: one static binary plus a bucket plus DNS is the
  complete dependency list; handing someone the binary hands them the product.
- Every multiplier on /platform/ ships with a "receipt" naming the mechanism
  that produces it.

## Operating Context

The site runs on the CARLOS flagship itself — it is the homepage for the thing
it is deployed on. GitHub Pages was retired 2026-08-05; pushing to `main` no
longer publishes. Deploying is the same `ship` / `promote` sequence any CARLOS
app uses (recipe in AGENTS.md). Source is public at
github.com/carlosframework/website. Note that `carlosframework/platform` is a
PRIVATE repo and must never be linked from the site.

Pages: `/` (framework), `/platform/` (the platform, and the engine under
carloku.com), `/rastrillo/` (a redirect stub — Rastrillo's real site is
rastrillo.org).

## Capabilities and Constraints

- Static pages sharing one plain local stylesheet (`site.css`); no build step,
  no dependencies, no JavaScript, no fetched fonts, no analytics. Binding.
- Accuracy rules (see AGENTS.md, they outrank prose): the five source repos are
  private and never linked; never overclaim the framework's maturity; CARLOS is
  an application architecture, not an operating system; "Cost-efficient" and
  "Available" are two separate claims; the name is CARLOS, one S. Every
  technical claim must trace to the code.
- Light and dark themes via `prefers-color-scheme`; both must keep working.

## Brand Commitments

- AI authorship is always visibly marked 🤖 (factor X practiced on itself).
  Person-emoji-marked blocks are certified human and off-limits to LLM edits.
- House style (redesigned 2026-08-19; see AGENTS.md for the full record).
  CARLOS reads exciting, modern and assertive — deliberately NOT the warm
  paper-and-serif world rastrillo.org already owns. Type from Modern Font
  Stacks: Neo-Grotesque voice, Monospace Code for data and identifiers only.
  The six letter marks and the wordmark are drawn as inline SVG, not set in a
  face. Hairline rules divide; a card has to earn being a card.
- Accents: index teal (`#067a68` light / `#2fd4ac` dark); /platform/ blue
  (`#0d5f88` / `#59bfe8`). Sibling pages, visibly related, never identical.
- A four-step signal ramp (`--sig-s/a/b/c`) encodes app trust class and
  nothing else. Never reuse those hues decoratively.
- No Eleven branding beyond footer credit links.
- Tito is always "Tito" (never "Tito Go"), listed as a deliberate adopter, not
  an extraction source; it does not count toward the "5 systems" stat.

## Evidence on Hand

- Five extraction sources: Eleven Messenger, Keymail, Woodstar, Slopbox, Kass.
- Real production tenants for /platform/ (an event-ticketing company and a
  training platform); claims trace to the platform repo.
- The homepage's "Running on CARLOS today" table is evidence, not marketing:
  every row was verified live by its `X-Carlos-Version` header on 2026-08-19.
  Re-verify before changing it. Eleven Messenger and Slopbox are extraction
  SOURCES and carry no header — they must never be listed as adopters.
- App trust classes (S / A1 / A2 / A-public / B / C) come from
  `docs/superpowers/specs/2026-08-12-app-trust-classes-design.md`, merged to
  platform `main` as 59d2d43 (PR #231).
- No og:image asset exists (confirmed gap 2026-08-05, STILL OPEN at the
  2026-08-19 redesign). Do not fabricate one; add the meta tags only when a
  real 1200×630 image lands in the repo. Until then a shared link renders as a
  bare title on every surface.
- The fleet table's caption carries a hand-stamped verification date. A
  hand-dated claim rots silently: re-run the curl sweep and re-stamp it in the
  same commit as any deploy that touches that section.

## Product Principles

1. Fewer claims, all checkable — every number names its mechanism.
2. The site practices what the product preaches: lean, no build step, source
   worth reading.
3. Honesty about maturity is a feature, not a caveat ("Extracted, not
   invented").
4. AI authorship is disclosed, visibly, always.

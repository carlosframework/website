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
  [Claude Code skill](https://github.com/carlosframework/skills).
- /platform/ → the visitor gets started at platform.carlosframework.com.

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

Static site on GitHub Pages from `main` (root), custom domain
carlosframework.com via `CNAME`; pushing to `main` publishes. Sibling site of
11factor.org (house style inherited from it). Source is public at
github.com/carlosframework/website.

## Capabilities and Constraints

- Static pages sharing one plain local stylesheet (`site.css`); no build step,
  no dependencies, no JavaScript, no fetched fonts, no analytics. Binding.
- Accuracy rules (see CLAUDE.md, they outrank prose): the five source repos are
  private and never linked; never overclaim the framework's maturity; CARLOS is
  an application architecture, not an operating system; "Cost-efficient" and
  "Available" are two separate claims; the name is CARLOS, one S. Every
  technical claim must trace to the code.
- Light and dark themes via `prefers-color-scheme`; both must keep working.

## Brand Commitments

- AI authorship is always visibly marked 🤖 (factor X practiced on itself).
  Person-emoji-marked blocks are certified human and off-limits to LLM edits.
- House style from 11factor: Charter/Georgia serif, a single accent per page,
  `--max: 42rem` measure, hairline rules, an italic epigraph under each h2.
- Accents: index teal (`#0d6e63` light / `#4cc3ae` dark); /platform/ blue
  (`#0f5e85` / `#5db8dd`). Sibling pages, visibly related, never identical.
- No Eleven branding beyond footer credit links.
- Tito is always "Tito" (never "Tito Go"), listed as a deliberate adopter, not
  an extraction source; it does not count toward the "5 systems" stat.

## Evidence on Hand

- Five extraction sources: Eleven Messenger, Keymail, Woodstar, Slopbox, Kass.
- Real production tenants for /platform/ (an event-ticketing company and a
  training platform); claims trace to the platform repo.
- No og:image asset exists (confirmed gap, 2026-08-05). Do not fabricate one;
  add the meta tags only when a real 1200×630 image lands in the repo.

## Product Principles

1. Fewer claims, all checkable — every number names its mechanism.
2. The site practices what the product preaches: lean, no build step, source
   worth reading.
3. Honesty about maturity is a feature, not a caveat ("Extracted, not
   invented").
4. AI authorship is disclosed, visibly, always.

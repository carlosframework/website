# 🤖 CLAUDE.md

Working notes for anyone (human or agent) changing this repo.

## What this is

The website for **CARLOS** — *Cost-efficient, Available, Replicated,
Lightweight, Open, Secure* — the architecture being extracted from Eleven Messenger,
Keymail, Woodstar, Slopbox and Kass. The site is a single static
`index.html`: no build step, no dependencies, no JavaScript. Keep it that way;
a framework whose first claim is "lightweight, no build step" does not get to
ship a bundler on its own homepage.

## The one rule: AI authorship is always marked (🤖 / 👨)

This repo practices factor X on itself. Every piece of prose carries an
authorship marker so a reader — human or agent — can tell who wrote what, and
so a human can fence text off from AI rewriting.

- **🤖 — written by an LLM.** Always **visible**, immediately before the
  heading, paragraph, or section it applies to. A 🤖 on a heading **cascades**:
  it marks that heading and everything beneath it, down to the next marker of
  the same-or-higher level or a human-certified block. One 🤖 on a document's
  top heading marks the whole document. On the website, the marker must render
  visibly on the page — never hide it in a comment.
- **No marker — ambiguous.** Could be either. Never *assume* AI authorship;
  when you genuinely don't know, leave it unmarked.
- **A person emoji (👨 / 👤 / 🧑 …) — certified human, off-limits.** The text
  was written or vetted by a person. **An LLM must not rewrite, rephrase,
  condense, or delete it.** You may add new 🤖 prose nearby, but the human's
  words are fixed. In HTML/Markdown the person marker may hide in a comment
  (`<!-- 👨 -->`) so it doesn't render; the 🤖 marker must **never** be hidden.

Baseline: **everything in this repo was AI-written unless a block carries a
person marker.**

## Conventions

- **One page, zero dependencies.** No frameworks, no fonts fetched from
  anywhere, no analytics, no JavaScript.
- **Light and dark** via `prefers-color-scheme` — keep both working when
  touching styles.
- **House style is inherited from [11factor](https://11factor.org)**: Charter/
  Georgia serif, a single accent colour, `--max: 42rem` measure, sections
  separated by hairline rules, an italic epigraph under each `h2`. CARLOS's
  accent is teal (`#0d6e63` light, `#4cc3ae` dark) so the two sites are
  visibly siblings and not the same site.
- **No Eleven branding.** CARLOS is separate from Eleven Messenger — informed
  by building it. Eleven and 11factor get credit links in the footer, and no
  more.

## Accuracy rules (these matter more than the prose)

- **The five source repos are private.** Never link to them from the site;
  the links would 404 for every visitor. Name the products, not the repos.
- **Don't overclaim the framework's maturity.** The components described exist
  inside the applications they were pulled from, not as an adoptable library.
  The "Where it came from" section says so on purpose — keep it honest as the
  work progresses, and update it when extraction actually lands.
- **CARLOS is not an operating system.** It is an application architecture, and
  the expansion ends in "Open, Secure" for exactly that reason — an earlier
  draft read "Operating System", which overclaimed.
- **C and A are two separate claims.** The expansion is "Cost-efficient,
  Available" — six letters, six promises. It replaced "Continuously Available"
  (July 2026) because cost-efficiency is the novel claim and deserved its own
  letter; "Cheap" was considered and rejected for its low-quality connotation.
  Don't recombine them in a drive-by edit.
- **The name is CARLOS, one S.** "CARLOSS" (…Open, Secure, Software) was
  considered for the OSS ending and rejected: the double letter invites typos
  forever, "Software" only earns its place via the pun, and the org, domain and
  `internal/carlos` package are all already correct. Don't relitigate it in a
  drive-by edit.
- Every technical claim on the page is traceable to `internal/carlos` and the
  `CLAUDE.md` files of the five source projects. If you change a claim, check
  it against the code rather than against the previous copy.

## Deploying

GitHub Pages from `main` (root), custom domain `carlosframework.com` via
`CNAME`. Pushing to `main` publishes.

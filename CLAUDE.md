# 🤖 CLAUDE.md

Working notes for anyone (human or agent) changing this repo.

## What this is

The website for **CARLOS** — *Cost-efficient, Available, Replicated,
Lightweight, Open, Secure* — the architecture being extracted from Eleven Messenger,
Keymail, Woodstar, Slopbox and Kass. Tito (always "Tito", never "Tito Go")
is adopting CARLOS deliberately and is listed on the site as an adopter,
not an extraction source — it doesn't count toward the "5 systems" stat. The site is static pages
(`index.html`, `platform/index.html`) sharing one plain stylesheet
(`site.css`): no build step, no dependencies, no JavaScript. Keep it that way;
a framework whose first claim is "lightweight, no build step" does not get to
ship a bundler on its own homepage. Durable product context for design tooling
lives in `PRODUCT.md`.

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

- **Static pages, zero dependencies.** No frameworks, no fonts fetched from
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

**The live apex, `carlosframework.com`, moved off GitHub Pages onto the
CARLOS flagship itself on 2026-08-02** — the site now runs on the thing
it's the homepage for. Pushing to `main` no longer publishes it; deploying
is the same `ship`/`promote`/`add` sequence any CARLOS app uses:

```
carlos ship -app carlosframework -kind static -version <sha> .
carlos promote -app carlosframework <sha> canary/rehearsal
carlos add -app carlosframework -kind static -channel canary/rehearsal carlosframework.com
```

(Still on `canary/rehearsal`, not `stable` — same reason Kass's real
cutover used it: `stable` bakes 72h on a box's *first* sighting of a
channel head, which would have meant 72h of downtime for a
never-before-served route. A future `stable` flip is optional cleanup,
not required — mirrors Kass's own still-pending flip.)

`www.carlosframework.com` still runs on GitHub Pages, deliberately
untouched — it's the rollback path. To roll back the apex: delete its
`A` record (`99.81.104.219`) in the `carlosframework.com` DNSimple zone
(account 285) and recreate the four GitHub Pages `A` records
(`185.199.108-111.153`) and four `AAAA` records
(`2606:50c0:8000-8003::153`) — GitHub Pages was never disabled, so this
takes effect the moment DNS propagates.

The repo itself is still the source of truth and still builds via
GitHub Pages (for `www` and as a live fallback build) — `CNAME` and
`.nojekyll` stay as they are.

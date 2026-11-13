# 🤖 AGENTS.md

Working notes for anyone (human or agent) changing this repo. This is the
canonical agent-instructions file — keep it current here, not in a
tool-specific file. (Claude Code reads it via the `CLAUDE.md` pointer.)

## What this is

The website for **CARLOS** — *Cost-efficient, Available, Replicated,
Lightweight, Open, Secure* — the architecture being extracted from Eleven Messenger,
Keymail, Woodstar, Slopbox and Kass. Tito (always "Tito", never "Tito Go")
is adopting CARLOS deliberately and is listed on the site as an adopter,
not an extraction source — it doesn't count toward the "5 systems" stat. The pages are static and the
stylesheet (`site.css`) is plain: what a visitor downloads is HTML and CSS,
with local scripts for clipboard controls and the Attributes sidebar, and no
third-party runtime resources. JavaScript elsewhere follows PRODUCT.md's rule
(2026-11-06): only where it meaningfully improves the experience, only as
progressive enhancement on a page that works and reads without it, as small
local files with no dependencies and no bundlers. The clipboard controls and
the Attributes sidebar enhancement are examples; the Get started pathways use
native radios. (The footer AI disclaimer is gone: see Paul's 2026-11-07 ruling
below.)
Durable product context for design tooling lives in
`PRODUCT.md`.

`index.html`, `platform/index.html` and the 2026-09 pages (`letters/`,
`apps/`, `trust/`, `attributes/`) are written by hand;
each is an `addPassthroughCopy` entry in `eleventy.config.js`.

🤖 `hack/build-start.mjs` preserves the homepage and `src/start/index.html` when
the demo is disabled. When enabled, it replaces the marked homepage hero and
body (`start-demo:hero`, `start-demo:body`) with the approved 2026-11-12 rework,
rendered from `src/_includes/home-hero.njk` and `home-body.njk` with copy from
`src/_data/start-copy.json` (key `home.<review id>`), and it
generates `/start/index.html` and `/start/index.md` from `src/start/agent.md`.
It does this before shared footer injection. The build publishes only
the starter archive, manifest and source listing. Raw starter files, config and
claim fixtures remain private build inputs.

Every user-facing string on those pages passed a copy review (the indexes and
results are archived under `copy-review/done/`); rewrite copy only through
another review. `/docs` does: its pages come from markdown through Eleventy, the
same pipeline rastrillo.org uses, run here before you ship rather than on
anyone's browser. A dozen docs pages sharing a sidebar are not something you
hand-maintain as HTML, and the served site keeps every promise in the paragraph
above. See "Building the docs" below.

## Authorship in repository prose (🤖 / 👨)

🤖 Paul’s 2026-11-07 ruling: the website has no robot markers, in-page AI
authorship lines or footer AI disclaimer. Do not re-add the disclaimer, its
button, fallback, script, styles or build injection. This supersedes the
2026-09-24 exception and 2026-10-22 footer disclosure rule.

The following markers apply to repository prose. Human-certified blocks
remain protected wherever they appear.

- **🤖 — written by an LLM.** Always **visible**, immediately before the
  heading, paragraph, or section it applies to. A 🤖 on a heading **cascades**:
  it marks that heading and everything beneath it, down to the next marker of
  the same-or-higher level or a human-certified block. One 🤖 on a document's
  top heading marks the whole document. Do not add these markers to the website.
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

- **JavaScript only as progressive enhancement** (PRODUCT.md, 2026-11-06): where it
  meaningfully improves the experience, on a page that works and reads without it,
  as small local files. Today that is the clipboard controls, the Attributes
  sidebar, the docs navigation, search and stepper (`src/docs-nav.js`,
  `src/docs-search.js`, `src/docs-stepper.js`) and, on the enabled-demo homepage,
  `src/home/theme.js` (Auto, Light or
  Dark, remembered in localStorage; loaded first in `<head>`, without defer, so
  there is no flash of the wrong theme), `src/home/hero.js` (the rotating word), `src/home/hero-bg.js` (the hero's
  WebGL2 background: Fable's 3D meadow Q1, day in light and night in dark;
  0.4 resolution, DPR capped at 1.5, 30 fps, a slow device gets half the
  blades then a smaller picture; stopped off screen, in a hidden tab, by the
  replay's Pause and under reduced motion, where it draws one still frame;
  without WebGL2 the CSS gradient stays), `src/home/figures.js` (the "What you get" figures
  count up once in view, over the real text, which is all that screen readers,
  no-JS and reduced motion get)
  and `src/home/stacks.js` (the interactive stacks, with a Pause control; they
  move only while the script says so). `src/home/` is copied by
  `hack/build-start.mjs` into enabled builds only. Homepage colours use
  `light-dark()`; in light, green is for links and accents only. The stacks load Matter.js
  0.20 (MIT, served from `/home/` with its license header and
  `matter-0.20.0.LICENSE.txt`) in idle time once the section nears the
  viewport, never under reduced motion. Both are decorative: without them the
  page reads the same. Visible text uses curly quotes in the source strings.
  No frameworks, remotely fetched fonts or analytics. The footer links are
  shared through `src/_includes/footer.html` and
  `hack/add-footer.mjs`; page placeholders retain docs source provenance.
  The `/docs` build is a devDependency
  that runs at authoring time; `_site/` is gitignored and never committed.
- **Light and dark** via `prefers-color-scheme` — keep both working when
  touching styles.
- **House style (redesigned 2026-08-19).** The site used to inherit 11factor's
  Charter/Georgia serif, `--max: 42rem` measure and italic epigraphs. It no
  longer does. Paul's brief was that CARLOS should read "exciting, modern and
  assertive", and rastrillo.org already owns the family's warm paper-and-serif
  world (its own "account book" design) — carlosframework.com must not be a
  second, weaker version of that. The world now is:
  - **Type from [Modern Font Stacks](https://modernfontstacks.com)**, so real
    character with nothing fetched. Neo-Grotesque carries the voice; Monospace
    Code carries data, identifiers and measurement, and nothing else (mono as a
    costume for "technical" prose is a regression, not a style).
  - **Letter marks are drawn**, as inline SVG on a 100×140 grid at one stroke
    weight (`.glyph`, `.wordmark` in `site.css`). No installed stack carries a
    condensed industrial capital everywhere, so the six CARLOS letters are
    geometry, not type. Edit the paths, not a font-family.
  - **Measures**: `--wrap: 72rem`, `--prose: 40rem`, body copy capped near 36rem
    so it stays inside a 65–75ch line.
  - **Accents**: index teal (`#067a68` light / `#2fd4ac` dark), platform blue
    (`#0d5f88` / `#59bfe8`). Sibling pages, visibly related, never identical.
  - **Hairline rules divide; nothing is a card unless being a card is a choice.**
    Cards are for the three run-it routes and the two exhibits, not for page
    structure.
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

## Building the docs

`/docs` is built from markdown that lives in the **platform** repo at
`docs/site/`, where its Go tests gate it against the CLI it documents and it
changes in the same pull request as the code. `hack/sync-docs.mjs` vendors that
corpus into this repo so the build is self-contained.

**Nothing under `src/docs/` or `src/_data/docs*.json` is edited here.**
`sync-docs.mjs` wipes and rewrites all of it — an edit made here is discarded
on the next sync, silently, and the site then disagrees with the repo that
gates it. Fix the source in the platform repo instead. (Every file the script
writes carries a `"//"` generated-by notice saying so in the file itself.)

```
npm install
node hack/sync-docs.mjs ~/github.com/carlosframework/platform
npm run check          # builds, then checks links, ids and the anchor rule
npm run serve          # localhost:8080
```

`node hack/sync-docs.mjs <checkout> --check` reports whether the vendored copy
is behind that checkout, and writes nothing — that is the read-only form to
run before assuming the site is current.

`npm run check` is `eleventy` followed by `hack/check-docs.mjs`, which reads
`_site/` after the build: every nav entry has a built page and a built `.md`
twin, every internal `/docs` href resolves to a built file and to a real
`id="…"` when it carries a fragment, and `slugify` in `eleventy.config.js`
agrees with Go's `internal/docsite.Anchor` on every case in
`src/_data/docsanchors.json`. That last one is why the fixture is vendored
rather than retyped: both languages assert against one artifact, so a heading
whose fragment the Go gate accepted cannot 404 in a browser because the two
slug rules drifted.

## Publishing the agent skills (`/.well-known/agent-skills/`)

The site publishes the CARLOS skills for agent discovery, per the
[Agent Skills Discovery draft](https://github.com/cloudflare/agent-skills-discovery-rfc):
`/.well-known/agent-skills/index.json` lists each skill with a sha256
digest, and each `SKILL.md` (plus its `references/`) is served beside it.
`/llms.txt` points agents at the index and at every docs page's `.md`
twin, and is generated from `docsnav.json` and the index so it cannot
drift from either.

The skills live in **carlosframework/skills**, where they are authored
and released as the Claude Code plugin. `hack/sync-skills.mjs` vendors
the platform-facing ones (`getting-started`, `building-carlos-apps` —
deliberately not `delegate`, which is generic operator tooling) into
this repo so the build is self-contained.

**Nothing under `src/well-known/` is edited here.** The sync wipes and
rewrites it, and the index digests pin the served bytes to the skills
repo's bytes — a local edit either gets discarded on the next sync or
ships a digest mismatch, which spec-following consumers treat as
tampering and refuse. Fix the source in the skills repo instead.

```
node hack/sync-skills.mjs ~/github.com/carlosframework/skills
node hack/sync-skills.mjs ~/github.com/carlosframework/skills --check   # verify, write nothing
```

`npm run check` also runs `hack/check-skills.mjs` over `_site/` after
the build: every index entry's url has a built file whose bytes hash to
the entry's digest, every served SKILL.md's frontmatter parses as strict
YAML (unique keys, via the `yaml` dev dependency) and names the same
name and description as the index, every relative link inside a served `SKILL.md`
resolves, and every carlosframework.com link in `llms.txt` points at a
built file.

## Deploying

🤖 `npm run check` includes the start checks. Regenerate test baselines with `npm run update:start-baselines` when the homepage or agent source changes.

🤖 The demo journey defaults off. See README for the explicit origin inputs.
Before public activation, bind the claim fixture to merged handlers.
Verify the platform's demo protection and claim-by-email changes in
`docs/superpowers/plans/2026-11-04-agent-start-demo-2-edge-protections.md` and
`docs/superpowers/plans/2026-11-04-agent-start-demo-3-claim.md`. Also verify
the platform's Accept-header negotiation change in
`docs/superpowers/plans/2026-11-04-static-markdown-twins.md` on the serving
edges. Website builds do not enable console admission or claim support.

Use the console API and the `carlos` CLI. Do not use bucket-mode credentials,
AWS commands or on-box operations for website releases. The registered app is
`carlosframework` in account `ops` on `https://console.carloku.com`.
The apex, `www` and `carlosframework.bab.oncarlos.com` currently use
`canary/rehearsal`. Inspect routes and channels before deploying; do not change
account placement as part of a site release.

Changes land through a reviewed PR, then ship from a clean export of the merged
commit. Never ship the repository tree: only the built `_site/` directory.
Keep scratch on disk under `$TMPDIR` or `~/.cache`, not the shared `/tmp` RAM disk.

```sh
release_sha=$(git rev-parse --short HEAD)
release_dir=$(mktemp -d "$HOME/.cache/carlos-website-ship.XXXXXX")
git archive HEAD | tar -x -C "$release_dir"
cd "$release_dir"
npm ci
npm run check
node hack/cache-bust.mjs "$release_sha"
carlos deploy --console https://console.carloku.com --account ops \
  --app carlosframework --kind static --channel canary/rehearsal \
  --version "$release_sha" --no-prompt _site
```

The cache-busting script versions every local stylesheet and script in every
built HTML page, including the generated docs and the clipboard/sidebar
scripts. Verify no `?v=0"` remains before shipping. It is safe to run again.

Check `X-Carlos-Version` and the changed content on all three hosts. Verify
`/docs/` specifically: the homepage can look correct even if docs were omitted.
Use `carlos channels` to confirm the promoted version. Record the previous
version before deploying so it can be promoted again if verification fails.
Remove the clean export and stop any local verification server afterward.

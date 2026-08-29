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
with no JavaScript and nothing fetched from anywhere. Keep it that way — a
framework whose first claim is "lightweight" does not get to ship a bundler to
its own readers. Durable product context for design tooling lives in
`PRODUCT.md`.

`index.html` and `platform/index.html` are still written by hand and have no
build step. `/docs` does: its pages come from markdown through Eleventy, the
same pipeline rastrillo.org uses, run here before you ship rather than on
anyone's browser. A dozen docs pages sharing a sidebar are not something you
hand-maintain as HTML, and the served site keeps every promise in the paragraph
above. See "Building the docs" below.

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

- **Nothing runs in the browser.** No frameworks, no fonts fetched from
  anywhere, no analytics, no JavaScript. The `/docs` build is a devDependency
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
the entry's digest, every relative link inside a served `SKILL.md`
resolves, and every carlosframework.com link in `llms.txt` points at a
built file.

## Deploying

**The live apex, `carlosframework.com`, moved off GitHub Pages onto the
CARLOS flagship itself on 2026-08-02** — the site now runs on the thing
it's the homepage for. Pushing to `main` no longer publishes it; deploying
is the same `ship`/`promote` sequence any CARLOS app uses — with one
difference this repo did not use to have. **There is a build step now, so
what ships is `_site/`, never the repo tree.** A tree ship has no `_site/`
in it: it would publish `index.html` buried under `src/`, no built pages,
and no `/docs` at all.

```
SHA=$(git rev-parse --short HEAD)     # the sha you are shipping

# 1. Clean export. Never ship a working checkout — PackDir packs every
#    regular file it sees, including .git and .claude/.
rm -rf /tmp/website-ship && mkdir -p /tmp/website-ship
git archive "$SHA" --prefix=export/ | tar -x -C /tmp/website-ship
cd /tmp/website-ship/export

# 2. Build, and gate the rendered output. `check` runs eleventy, then
#    hack/check-docs.mjs over what it produced.
npm ci
npm run check

# 3. Cache-bust BOTH stylesheets across every built page — see Caching
#    below; this is not optional.
find _site -name '*.html' -exec sed -i "s/\.css?v=0\"/.css?v=$SHA\"/g" {} +
grep -rn '?v=0"' _site && echo "STALE TOKEN — do not ship" || echo "cache-bust ok"

# 4. Ship the BUILT OUTPUT, then promote.
export AWS_PROFILE=keymail AWS_REGION=eu-west-1 \
       CARLOS_DEPLOYMENT_BUCKET=carlos-flagship-271376211898
carlos ship --app carlosframework --kind static --version "$SHA" _site
CARLOS_RELEASE_KEY=$(aws ssm get-parameter --name /carlos/release-key \
  --with-decryption --query Parameter.Value --output text) \
  carlos promote --app carlosframework "$SHA" canary/rehearsal
```

Both the `sed` and the `grep` end at the closing quote on purpose. A sha
beginning with `0` — `008f73e` — makes `?v=008f73e` contain the literal
substring `?v=0`, so an unanchored verification grep calls every freshly
bumped file stale, and an unanchored `sed` run twice appends the sha twice.
Anchoring on `"` fixes both and makes step 3 idempotent.

The env matters: without `CARLOS_DEPLOYMENT_BUCKET` the CLI goes through
the console API, where this app was never registered, and fails with
"not found". This is bucket mode — the same flow as `ship-app.sh` /
`promote-app.sh` in `carlosframework/platform-infrastructure`, which are
the canonical copies. Routes (`carlos add`) are registry-mode: they run
on the flagship box itself (instance `i-092c0c1eea75723cb`, via SSM;
env comes from `/etc/carlos/host.env`, binary at `/opt/carlos/carlos`).

(Still on `canary/rehearsal`, not `stable` — same reason Kass's real
cutover used it: `stable` bakes 72h on a box's *first* sighting of a
channel head, which would have meant 72h of downtime for a
never-before-served route. A future `stable` flip is optional cleanup,
not required — mirrors Kass's own still-pending flip.)

**GitHub Pages is retired (2026-08-05).** `www.carlosframework.com` is a
CARLOS route on the same app and channel as the apex; its DNS `A` record
points at the flagship (`99.81.104.219`) in the `carlosframework.com`
DNSimple zone (account 285), same as the apex. `CNAME` and `.nojekyll`
are gone from the repo and Pages is disabled on the GitHub repo.

Rollback is a pointer move, like any CARLOS app: promote the previous
good sha back onto `canary/rehearsal` and the edge picks it up (see
convergence speed below; `carlos channels --app carlosframework` to see
what's on the channel). Pages is no longer a fallback; don't resurrect it
in a drive-by fix.

**Caching: the edge sends no `Cache-Control` and no `ETag` on this static
route — only `Last-Modified`** (confirmed live 2026-08-19). Browsers therefore
apply HEURISTIC caching, roughly 10% of the age since `Last-Modified`, so a
returning visitor can hold a stale page for days. This bit us the day the
redesign shipped: one browser served the whole old page, another served the NEW
html against the OLD `site.css`, which renders the drawn wordmark as giant
black shapes and the type as the retired serif.

Two defences live in the repo, and neither is the real fix. (These are
*defences*, numbered separately from the deploy steps above — don't read a
number here as a step number there.)

1. Every inline SVG carries `width`, `height`, `fill` and `stroke` as
   PRESENTATION ATTRIBUTES, not only CSS, so a missing or stale stylesheet
   degrades to a correctly-sized outlined mark rather than a black blob.
2. The stylesheets are linked as `site.css?v=0` — and, on the docs pages,
   `docs.css?v=0` as well. **Bump both tokens on every deploy**, across every
   generated page, so new HTML never pairs with an old cached stylesheet.
   That is step 3 of the deploy sequence above; it walks `_site` with `find`
   rather than naming files, because the pages are generated now and an
   enumerated list goes stale the moment a page is added.

The real fix is server-side `Cache-Control` on static routes: platform issue
**carlosframework/platform#234**. Until it lands, **defence 2 — which is
step 3 of the deploy sequence above, the `find … sed` — is a required part of
deploying this site.** (Deploy step 2 is `npm ci && npm run check`; this
sentence used to say "step 2" and pointed 2am operators at the wrong one.)

**Convergence is now seconds, not minutes (CARLOS platform PR #108, live
2026-08-08).** A promote is picked up by the edge within ~2s.

**Static routes DO carry `X-Carlos-Version` (platform#112, corrected here
2026-08-19).** This note used to say the opposite. Verified live on
2026-08-19: carlosframework.com, platform.carlosframework.com, rastrillo.org
and carloku.com all answer with the header. The homepage's "Running on CARLOS
today" table cites it as evidence, so keep this straight. (Alias hosts are the
real exception — a minted alias serves 200 with no version header by design.)
Verify by header, or by content — and verify `/docs` **specifically**, because
the landing page looks right whether or not the built docs made it into the
artifact:

```
# by header — --resolve so a stale DNS answer cannot satisfy it. The IP is
# the flagship, the same address the apex and www A records point at above.
curl -sI --resolve carlosframework.com:443:99.81.104.219 \
  https://carlosframework.com/docs/ | grep -i x-carlos-version

# by content
curl -s https://carlosframework.com/ | grep -i "<something from the change>"
curl -s https://carlosframework.com/docs/ | grep -i "the cli"
curl -s https://carlosframework.com/docs/ | grep -o 'docs\.css?v=[^"]*'
```

`-I` is fine for the version header, but it sends a HEAD, and HEAD is excluded
from edge compression — anything about `Content-Encoding` needs a GET.

or by pointer: `carlos channels --app carlosframework` should show the new
sha promoted.

`carlos deploy --app carlosframework --kind static --version "$SHA" _site`
ships and promotes in one command, but its wait-until-serving watch doesn't yet
cover instance-less static apps like this one (same platform#112) — for this
site, the `ship`/`promote` pair above IS the deploy; convergence is still
seconds. The operator pinfra `ship-app.sh` / `promote-app.sh` scripts remain
the documented default. **Whichever of the three you use, the directory
argument is `_site` of a built, cache-busted clean export** — steps 1 to 3
above are not optional in any of them.

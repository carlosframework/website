# 🤖 CARLOS — carlosframework.com

**C**ontinuously **A**vailable, **R**eplicated, **L**ightweight, **O**pen, **S**ecure.

An architecture for software that is cheap enough to leave running forever,
small enough to understand, sealed so tightly the operator is not a party to
it, and yours to run. Extracted — not designed — from five systems that kept
rebuilding the same shape.

The hand-written pages — [`src/index.html`](src/index.html), `src/platform/`,
`src/rastrillo/` — ship as plain HTML and CSS: no build step, no dependencies, and JavaScript
only as progressive enhancement on a page that works without it. The
framework's own rules apply to its website. `/docs` is the
one exception: a dozen reference pages sharing a sidebar go through Eleventy
(see `AGENTS.md`), so that part of the repo does have a devDependency and a
build step, run before you ship rather than in anyone's browser.

🤖 Eleventy builds the site into `_site/` and injects the shared footer.
Builds with the demo on (the default) generate `/start/index.html` and
`/start/index.md` from one agent source, publish the pinned starter, and
give the homepage its demo hero and sections, whose scripts are progressive
enhancements like the rest (see `AGENTS.md`).

🤖 A plain `npm run build` is the production site: the demo is on, with the
production origins
[https://carlosframework.com](https://carlosframework.com) (site),
[https://console.carloku.com](https://console.carloku.com) (console) and
[https://console.carloku.com/](https://console.carloku.com/) (account URL).
Each can be overridden for a development preview with
`CARLOS_START_SITE_ORIGIN`, `CARLOS_START_CONSOLE_ORIGIN` and
`CARLOS_START_ACCOUNT_URL`; an unset account URL follows the console origin.
Origins must use HTTPS, and the account URL must use the console origin.
`CARLOS_START_API_ORIGIN` is optional and defaults to the console origin.
`CARLOS_START_DEMO=0` turns the demo off and builds the old homepage and
`/start`, for development only; `CARLOS_START_DEMO` accepts only unset, `1` or `0`.
(The default used to be off, and a plain build twice shipped the old homepage.)
🤖 If set, `CARLOS_START_API_ORIGIN` must equal the console's `CARLOS_DEMO_API_ORIGIN`.
🤖 Set `CARLOS_START_CLAIM=off` for a
development-only mode with no claim instructions.

🤖 Normal enablement requires a
merged producer SHA and `producerMerged: true`. With `CARLOS_START_DEMO=0`, builds
preserve the original pages and remove stale anonymous downloads and Markdown.
Run `npm run check` with `STARTER_SCRATCH` set to an on-disk scratch directory.

**The rule for adding a page:** if a URL on carlosframework.com should return
it, the file goes under `src/` — either as Eleventy build input, or as a raw
file with a matching `addPassthroughCopy` entry in `eleventy.config.js` if it
must ship byte-identical (`eleventy.config.js` reads from `src/`, so anything
outside it is invisible to the build, not intentionally skipped). Everything
under `src/docs/` and every `src/_data/docs*.json` file is vendored from the
platform repo by `hack/sync-docs.mjs` and says so with a `"//"` key at the top
of each JSON file — edit `docs/site/` in `carlosframework/platform` instead;
a hand edit here is silently overwritten on the next sync.

## The letters

| | |
|---|---|
| **C**ontinuously **A**vailable | Always there when someone knocks; not running when nobody does |
| **R**eplicated | The box is disposable; the data is not |
| **L**ightweight | One static binary, database compiled in, no build step |
| **O**pen | Source-available, forkable, and actually runnable by the person who depends on it |
| **S**ecure | The server holds only ciphertext it cannot open |

**S** is last in the acronym and first in the architecture — every other letter
is shaped around it. The rule it stands for: **if the server is compromised,
the attacker gets nothing.**

## Status

Early. The router, the activator, the parking lease and the object store exist
and are under test, but they live inside the applications they were pulled
from. Extracting them into something a stranger can adopt is the current work.
The site says so.

## Authorship: the 🤖 rule

Paul’s 2026-11-07 ruling removes robot markers, in-page AI authorship lines
and the footer AI disclaimer from the website. Do not restore them. Repository
prose still uses authorship markers; human-certified blocks remain protected.
See [`AGENTS.md`](AGENTS.md) for the rule.

## Provenance

Written by an LLM (Claude), on the ideas, instruction, and editing of humans.
CARLOS keeps the promises set out in [The Eleven Factors](https://11factor.org),
and is informed by building [Eleven](https://elevenmessenger.com).

## Deploying

🤖 Publish only the built `_site/` directory from a clean export of a reviewed,
merged commit. Use the console API and CLI recipe in [`AGENTS.md`](AGENTS.md).
Public demo activation requires the platform's Accept-header negotiation change
on the serving edges, in
`docs/superpowers/plans/2026-11-04-static-markdown-twins.md`. It also requires
the demo protection and claim-by-email changes in
`docs/superpowers/plans/2026-11-04-agent-start-demo-2-edge-protections.md` and
`docs/superpowers/plans/2026-11-04-agent-start-demo-3-claim.md` to be merged,
enabled and verified. Accept negotiation serves HTML or Markdown based on the
`Accept` header. The full HTML instructions remain visible. Keep the previous
static version for rollback. Verify live acceptance separately from the local
build checks.

## License

[MIT](LICENSE). Copy it, fork it, argue with it.

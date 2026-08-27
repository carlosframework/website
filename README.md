# 🤖 CARLOS — carlosframework.com

**C**ontinuously **A**vailable, **R**eplicated, **L**ightweight, **O**pen, **S**ecure.

An architecture for software that is cheap enough to leave running forever,
small enough to understand, sealed so tightly the operator is not a party to
it, and yours to run. Extracted — not designed — from five systems that kept
rebuilding the same shape.

The hand-written pages — [`src/index.html`](src/index.html), `src/platform/`,
`src/rastrillo/` — ship as plain HTML and CSS: no build step, no dependencies,
no JavaScript. The framework's own rules apply to its website. `/docs` is the
one exception: a dozen reference pages sharing a sidebar go through Eleventy
(see `AGENTS.md`), so that part of the repo does have a devDependency and a
build step, run before you ship rather than in anyone's browser.

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

Everything in this repo written by an AI carries a **visible 🤖 marker** — on
the page, in this README, at the top of every prose file. That is factor X
applied to the project itself: AI-written words are always disclosed, never
passed off as human. The full rule (including the human-certification markers
that AI must not touch) is in [`AGENTS.md`](AGENTS.md).

## Provenance

Written by an LLM (Claude), on the ideas, instruction, and editing of humans.
CARLOS keeps the promises set out in [The Eleven Factors](https://11factor.org),
and is informed by building [Eleven](https://elevenmessenger.com).

## Deploying

The apex runs on the CARLOS flagship as a static app, not GitHub Pages
(retired 2026-08-05) — pushing to `main` does not publish it. Deploying is
`ship`/`promote` via the operator pinfra scripts — that pair IS the
deploy for this static, instance-less app; `carlos deploy`'s
wait-until-serving watch doesn't cover it yet (platform#112). Convergence
is seconds; verify by content (STATIC routes don't carry
`X-Carlos-Version`) or with `carlos channels --app carlosframework`. Full
details, env, and rollback are in [`AGENTS.md`](AGENTS.md).

## License

[MIT](LICENSE). Copy it, fork it, argue with it.

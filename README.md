# 🤖 CARLOS — carlosframework.com

**C**ontinuously **A**vailable, **R**eplicated, **L**ightweight, **O**pen, **S**ecure.

An architecture for software that is cheap enough to leave running forever,
small enough to understand, sealed so tightly the operator is not a party to
it, and yours to run. Extracted — not designed — from five systems that kept
rebuilding the same shape.

🤖 Eleventy builds the site into `_site/`, with shared footer and disclosure
injection. Enabled demo builds generate `/start/index.html` and
`/start/index.md` from one agent source and publish the pinned starter.
The browser uses local disclosure, clipboard and Attributes sidebar scripts.

🤖 The demo journey defaults off. To build it, set `CARLOS_START_DEMO=1` and
explicitly set `CARLOS_START_SITE_ORIGIN`, `CARLOS_START_CONSOLE_ORIGIN` and
`CARLOS_START_ACCOUNT_URL`. Production defaults are
[https://carlosframework.com](https://carlosframework.com),
[https://console.carloku.com](https://console.carloku.com) and
[https://console.carloku.com/](https://console.carloku.com/), respectively;
enabled builds still require all three. Origins must use HTTPS, and the
account URL must use the console origin.

🤖 The claim contract is unmerged. An enabled build refuses it unless you also
set `CARLOS_START_CLAIM_DRAFT=1` for a development preview. That preview marks
claiming unavailable. Normal enablement requires a merged producer SHA and
`producerMerged: true`. Unset demo builds preserve the original pages and
remove stale anonymous downloads and Markdown. Run `npm run check:start` with
`STARTER_SCRATCH` set to an on-disk scratch directory, then `npm run check`.

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

🤖 Publish only built `_site/` from a clean export of a reviewed, merged commit,
using the console API and CLI recipe in [`AGENTS.md`](AGENTS.md). Public demo
activation also requires Plan A on the serving edges and Plans 2 and 3 merged,
enabled and verified. Plan A negotiates HTML/Markdown by Accept; the full HTML
instructions remain visible. Keep the previous static version for rollback.
Live acceptance is separate from the local build checks.

## License

[MIT](LICENSE). Copy it, fork it, argue with it.

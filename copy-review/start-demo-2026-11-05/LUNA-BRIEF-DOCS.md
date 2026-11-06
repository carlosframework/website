# 🤖 Copy pass brief (delta): website maintainer docs for the /start demo

You are reviewing documentation prose in a website repository (README.md, PRODUCT.md, AGENTS.md). Paul, the owner, delegated this review to you. Readers are the website's maintainers, human or AI agent. The passages are new; each starts with a 🤖 marker, which must stay.

Context: the website can now build an optional demo journey. With `CARLOS_START_DEMO=1` the build generates `/start/index.html` and its Markdown twin `/start/index.md` from one agent-instruction source, swaps the homepage hero for a "paste this line into your coding agent" invitation, and publishes a pinned starter app archive. Without the switch the homepage and /start build exactly as before. The platform's edge serves the Markdown twin when a request's `Accept` header prefers Markdown ("Plan A", a platform change, platform plan `docs/superpowers/plans/2026-11-04-static-markdown-twins.md`). "Plans 2 and 3" are the platform's demo protection and claim-by-email changes (platform plans `docs/superpowers/plans/2026-11-04-agent-start-demo-2-*.md` and `...-3-claim.md`). Claiming is not merged in the platform yet, so the website's claim fixture is a draft.

## House rules

- Plain, modest words. Short sentences. No marketing tone.
- No em dashes or en dashes used as dashes. Use a full stop and a new sentence.
- Keep commands, environment variables, file paths, URLs and code exactly as they are.
- Name internal plans so a maintainer can find them (a path is fine); do not leave bare jargon like "Plan A" unexplained.
- Neutral examples only.

## Facts that must stay true

Everything stated in the passages below is accurate as of this branch. Keep every fact; do not add new ones.

## Output

Do not edit any file. Answer with one markdown table `| ID | new | why |`, one row per passage in order, `unchanged` when you keep it. Then a short **Flags** list. Nothing else.

## Passages

### docs.1 (AGENTS.md)

🤖 `hack/build-start.mjs` preserves the original homepage and `src/start/index.html`
when disabled. Enabled builds replace the marked hero region and generate the
start HTML/Markdown twins from `src/start/agent.md`, before footer/disclosure
injection. Only the starter archive, manifest and source listing are published;
raw starter files, config and claim fixtures stay private build inputs.


### docs.2 (AGENTS.md)

🤖 The demo journey defaults off. See README for explicit origin inputs and the
development-only draft claim override. Do not release that override publicly.
Before public activation, bind the claim fixture to merged handlers, verify
Plans 2 and 3, and verify Plan A's Accept negotiation on the serving edges.
Website builds do not enable console admission or claim support.


### docs.3 (PRODUCT.md)

- 🤖 index → when the demo journey is enabled, the visitor copies one line to
  their coding agent and tries a small public app for 24 hours. Larger projects
  and existing apps use the account path. Disabled builds retain the existing
  hero and setup page.


### docs.4 (README.md)

🤖 Eleventy builds the site into `_site/`, with shared footer and disclosure
injection. Enabled demo builds generate `/start/index.html` and
`/start/index.md` from one agent source and publish the pinned starter.
The browser uses local disclosure, clipboard and Attributes sidebar scripts.


### docs.5 (README.md)

🤖 The demo journey defaults off. To build it, set `CARLOS_START_DEMO=1` and
explicitly set `CARLOS_START_SITE_ORIGIN`, `CARLOS_START_CONSOLE_ORIGIN` and
`CARLOS_START_ACCOUNT_URL`. Production defaults are
[https://carlosframework.com](https://carlosframework.com),
[https://console.carloku.com](https://console.carloku.com) and
[https://console.carloku.com/](https://console.carloku.com/), respectively;
enabled builds still require all three. Origins must use HTTPS, and the
account URL must use the console origin.


### docs.6 (README.md)

🤖 The claim contract is unmerged. An enabled build refuses it unless you also
set `CARLOS_START_CLAIM_DRAFT=1` for a development preview. That preview marks
claiming unavailable. Normal enablement requires a merged producer SHA and
`producerMerged: true`. Unset demo builds preserve the original pages and
remove stale anonymous downloads and Markdown. Run `npm run check:start` with
`STARTER_SCRATCH` set to an on-disk scratch directory, then `npm run check`.


### docs.7 (README.md)

🤖 Publish only built `_site/` from a clean export of a reviewed, merged commit,
using the console API and CLI recipe in [`AGENTS.md`](AGENTS.md). Public demo
activation also requires Plan A on the serving edges and Plans 2 and 3 merged,
enabled and verified. Plan A negotiates HTML/Markdown by Accept; the full HTML
instructions remain visible. Keep the previous static version for rollback.
Live acceptance is separate from the local build checks.


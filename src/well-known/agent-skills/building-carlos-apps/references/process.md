# 🤖 CARLOS working conventions

How the family builds. These conventions exist because each was learned the
hard way at least once; the incident is noted where it names the rule.

## Repo documents

- **CLAUDE.md** — "how we build and the decisions we've committed to."
  Written before the code (factor V: the intent is the system — the code
  should have to argue with something). Opens with the one rule. Contains:
  settled decisions (dated, attributed, with rejected alternatives),
  named laws, the workflow, and a "Deliberately not built yet" list with the
  trigger for each deferral.
- **README.md** — user-facing: what it is, run it, honest trade-offs.
- **DESIGN.md** — the spec, what gets built. **PLAN.md** — why it is shaped
  this way, the roadmap.
- **docs/** — design records and briefs, written *before* the build
  ("Brainstormed with Paul; decisions recorded here"), each with a Status
  line (`built` / `approved design — not yet built`), annotated in place
  when built. The doc's decisions are binding: if one proves wrong in
  practice, stop and flag it in the PR rather than redesigning.

## Git and PR playbook

- **Worktree per session, always.** Multiple sessions (agents and humans)
  are active at once; the main checkout's uncommitted state belongs to
  another session. Never build in the main checkout — reading it is fine,
  writing is not.
- Feature branch → small focused PR → squash-merge
  (`gh pr merge --squash --delete-branch`). Never commit to main. Deploy
  only merged main. Branch / commit / PR / merge / deploy **only when
  asked**.
- Commit subjects are area-prefixed prose that says why (`web: the front
  door is a homepage — pitch left, sign-in right`; `auth: delete the
  recovery passphrase, root and branch`). Comment the why, not the what.
- Every commit carries `Co-Authored-By: Claude <model>
  <noreply@anthropic.com>`; the human is the author of record.

## Canaries

- **Every session gets its own canary; review happens on a deployed canary,
  never on localhost.** (Adopted after two sessions sharing a dev host
  produced an evening outage.) Local stacks are for automated drives only.
- On the platform, a canary is a channel: promote to `canary/<slug>` (a
  per-session dead-end rung, zero bake) and the canary host serves it at
  `<canary>.<app>.<sqid>.<domain>` — same rule, no box. Off-platform,
  canaries multiplex onto the devbox: own port/state/unit/TLS at
  `<branch>.<dev-host>`. Shared hosts (`prod`, the plain dev host) only ever
  carry main builds — enforced by the deploy path, not memory.
- Report the complete clickable canary URL in **every** reply while
  iterating, with a short list of what to test. The human clicks through
  mid-flight; never make them scroll back for the URL.
- Tear your canary down when the branch merges. Never echo claim links or
  secrets into the session — the prompt ledger publishes what gets typed.

## Testing

The layers, in order:

1. **`go test ./...`, `go vet ./...`, `gofmt -l .` — all clean, always.**
   Nothing lands untested; a bug fix carries its regression test. When
   gating on a test run, never pipe it — a pipe eats the exit code (a red
   suite once merged and deployed exactly this way). A guard belongs
   *inside* the test binary, never in a shell step around it — a guard a
   shell step can satisfy is a guard a shell step can be wrong about
   (one browser-required check went silently unrun for weeks).
2. **Prefer a parsing test to a browser for anything computable from
   source.** Contrast ratios computed from the token file's declarations
   (WCAG AA, both themes, no browser); network reachability rules parsed
   from the served JS; performance fixes shipped with an `EXPLAIN QUERY
   PLAN` assertion over the *exported production query string* so the
   test cannot drift from the real SQL. When a rule needs an exception,
   the allowlist entry pins the exact occurrence count, not just the
   file — a new call site inside an exempted file must still fail.
3. **JS logic DOM-free under `node --test`**, wired into `go test` via a
   small `jstest_test.go`, so one command runs everything. `node --check`
   alone is not enough — it parses as CommonJS and swallows ES-module errors
   that crash Safari; check a `.mjs` copy and load it in a real engine.
4. **uidump — dump, don't drive** (the seapointish pattern, adopted by
   the platform console). An env-gated test (`UIDUMP_DIR` set, else
   skipped) boots the real handler in-process over `httptest`, seeds a
   fixture world rich enough that every state has a subject, signs in,
   GETs every named screen, and writes each response body to disk with
   asset paths rewritten relative so the files stand alone. An agent
   then screenshots the static files directly with headless Chrome
   (`--headless --screenshot=…`), re-shooting dark mode by stamping the
   theme attribute and mobile at a narrow window. Near-zero cost, zero
   flake, works on a display-less box; adding a screen is one map entry
   — and **"add your screen to the dump" is a checklist line in every
   plan**, or coverage rots. It renders HTML+CSS only and asserts
   nothing itself: it is the visual-review gate, not the invariant gate.
5. **Browser drives are for the residue** that needs a JS engine and
   real layout geometry — enhancement-script behaviour, popover sizing,
   overflow, theme resolution — env-gated, with assertions written as
   the named bug class they caught. Playwright, or chromedp for
   pure-Go. Passkey flows run in Chromium — the virtual authenticator
   is a CDP feature; a separate passkey-free smoke runs in WebKit,
   Safari's engine, because it breaks first. Loud on purpose: fail on
   any console error, page error, or failed request, and junk-scan
   every view for `undefined`, `null`, `[object Object]`, `NaN` — the
   bug class that renders perfectly and says nothing (a stray `null`
   *text node* included: native `append()` stringifies one). A skip is
   not a pass: report executed-vs-skipped.
6. **The merciless greps** (server-blind apps): end-to-end tests that grep
   raw SQLite bytes *and* S3 objects for plaintext content and names.
7. **After every deploy: the console check in WebKit** against the live
   host (the keymail rule) — a JS syntax error takes the whole client down
   and only a real engine sees it; WebKit specifically, because it is the
   strictest engine and Safari users hit it first.
8. **Security scan** (Aikido) before ending a work cycle; triage every
   finding; never publish over an untriaged one.

Simulation suites are the spec for convergence-critical engines (sync,
progression): any behaviour change changes the suite first. Golden vectors
pin multi-language implementations (see blueprint.md).

## Ending a session

Every session ends through the committed `/end-session` gate. The shape:

1. Clean tree — nothing uncommitted, nothing unpushed, no orphan worktrees.
2. Gates green: build, vet, gofmt, tests (unpiped), browser drives with
   executed-vs-skipped counts.
3. Security scan clean or triaged.
4. Ledgers accrued (below), reviewed word-by-word for secrets before
   publishing — never publish text you haven't read; when unsure, redact
   with an annotated `⟦redacted: category⟧` and say what and why.
5. Deploy state reported; canaries torn down or handed over.
6. A handoff report: PRs, clickable canary URLs with what to verify, open
   threads, and what was deliberately not done.

## Ledgers and transparency

The family practices radical operational transparency on a public status
site: **prompt registry** (every human prompt behind the code, whole and in
order, credentials redacted in place), **carbon tally** (token spend →
CO₂e bands, plus the boxes' share), **contributors** (humans and AI models
on one metric, from git trailers), roadmap and milestones written in member
language — what changed for a member, never how the boxes are run. Ledger
updates ship exactly like code: commit → PR → deploy. No hostnames, no
account IDs, no third-party personal data in anything published.

## AI authorship (factor X)

- Machine-authored text is marked **🤖** wherever it surfaces — visible,
  immediately before the heading or block it covers; a marker on a heading
  cascades. Never hide the 🤖 in a comment.
- A person marker (👨/👤/🧑) certifies human text: an LLM must not rewrite,
  rephrase, condense, or delete it. No marker means ambiguous — never claim
  human authorship for unmarked text.
- Disclosure extends to product: AI features are opt-in, never required,
  always disclosed, and every path works with the AI switched off — this is
  a hard constraint, not an aspiration. Nothing assumes AI stays cheap.
- Uncompiled or unverifiable code is marked (`// UNVERIFIED: written without
  an iOS toolchain`) and kept in separate commits.

## Working with the human

Patterns visible across every prompt history, useful calibration for agents:

- Directives are terse ("go", "merge", "Deploy!", "keep going until it's
  done"). Long autonomous runs are normal; write the design doc, then build
  until there's something live to click.
- Bug reports arrive as lived user experience from the live product, in
  product language. Reproduce on a canary, fix, and ask "is this flow being
  tested?" — because that question is coming.
- Product shape is given, parameters are left open ("allows edits for what,
  5 minutes? 2 minutes?") — make the judgement call and flag it.
- Sibling apps are the design vocabulary ("like Eleven's home server",
  "Woodstar's shape, copied on purpose"). Check the sibling before
  inventing.
- Calm UI: red is for danger only, no toasts, no nerdspeak in the default
  flow, buttons stay where the thumb is, feedback is inline and honest.

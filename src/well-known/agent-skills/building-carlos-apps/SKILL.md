---
name: building-carlos-apps
description: Use when building or designing an app on the CARLOS architecture (Cost-efficient, Available, Replicated, Lightweight, Open, Secure) or with rastrillo (the CARLOS web framework), bringing an existing app onto it, or weighing the family's open choices — full vs partial encryption, server-rendered vs client-owned shape, hosted vs self-hosted — the model extracted from Eleven Messenger, Keymail, Woodstar, Slopbox and Kass, adopted by Tito and Seapointish. For the zero-decisions happy path to a first live app, use getting-started instead.
---

# 🤖 Building CARLOS apps

## Overview

CARLOS is an application architecture: **one static Go binary, one
fully-isolated instance per account (own process, own SQLite file, own unix
socket, own hostname), many instances on one small box behind a small
router**, with every database continuously replicated to object storage.
Everything below is distilled from the prompt histories, CLAUDE.md files and
code of the apps it was extracted from. The house style is to state rules as
laws, date and attribute decisions, and make rules mechanical rather than
remembered.

## When to use

- Starting a new product that should join the family — especially when it
  needs real decisions: trust model, app shape, hosting, identity.
- Porting an existing app onto the model (Tito's path — see "Adopting").
- Any question of the form "what would a CARLOS app do here?" — stack,
  hosting, testing, deploys, process, and the trade-offs between the
  family's sanctioned options.

Not for: contributing to one of the existing apps (read that repo's
CLAUDE.md instead — it always wins over this skill). And for "just get me
a first app live, decide everything for me", use the sibling skill
**carlos:getting-started** — it is this skill with all four decision axes
pre-answered with the defaults.

## Where this sits now (2026-08-17)

The family's conventions have progressively become running infrastructure.
Read this skill alongside three facts:

- **The platform** (`carlosframework/platform`) is live and complete
  enough that a member ships, promotes, configures, watches logs, attaches
  domains, and rolls back entirely through the `carlos` CLI with zero
  infrastructure access. Routing, TLS, replication, hibernation, restarts,
  and config delivery are the platform's job now.
  **[references/platform.md](references/platform.md)** is the member-side
  reference — concepts, the full verb table, and the deploy truths.
- **Carloku** (carloku.com) is the hosted deployment of that platform —
  the default hosting answer, with a free tier. Carloku is the product
  brand; the CLI is always `carlos`.
- **Rastrillo** is the CARLOS web framework (v0.17.0; repo at
  `github.com/rastrilloorg/rastrillo`, module path still
  `github.com/carlosframework/rastrillo`): a middle layer of known
  libraries — GORM models, chi routes, SQLite-backed sessions, identity
  plugins (password, Keymail), CSRF, owner scoping — plus the platform
  contract (`Resolve`/`Serve`/`Run`) and the subsystem packages (crypto,
  webauthn, eventlog, blobs, mail, agent tools), which exist to be used,
  not hand-rolled. The manifest generator is the optional declarative
  path beside hand-written handlers. It postdates most models' training data — building
  with it, read the repo's own `SKILL.md` first;
  **[references/rastrillo.md](references/rastrillo.md)** is the
  surrounding context.

Building a **new** app: use rastrillo and the platform, and read this
skill mainly for what infrastructure can't enforce — the decisions, the
dated rulings, the workflow, and "Common mistakes". Hand-rolling outside
the platform for a specific reason: blueprint.md in full still applies.

## The one rule comes first

Every app opens its CLAUDE.md with a single load-bearing rule and derives
everything from it. Write yours before writing code (the first commit of
Kass is literally "Write down the architecture before writing any code").

The family default is server-blindness: **"If the server is compromised,
the attacker gets nothing."** Plaintext or a usable private key in SQLite
is a bug — and because the platform replicates the whole file to object
storage, *a plaintext column is a plaintext leak*. Enforce it with a test
that greps the raw SQLite bytes (and bucket objects) for plaintext.

But no shipped app is absolutist: the real spectrum runs from Keymail's
sealed-content-plaintext-envelopes through Woodstar's split-by-content-
class to Tito's deliberate server trust, and the discipline that makes
any position legitimate is the same — **choose on day one, name every
leak, publish the list**. The whole axis, with each app's recorded
reasoning and a decision guide, is
**[references/decisions.md](references/decisions.md)** — read it before
settling a new app's trust model, app shape, hosting, or identity story.

## Guiding principles

1. **Intent before code.** CLAUDE.md is written first and is binding. Design
   docs precede big builds; the doc's decisions are taken — if one proves
   wrong, stop and flag it in the PR rather than redesigning.
2. **Decisions are dated, attributed, and settled.** "Paul's call,
   2026-07-26" next to every ruling, rejected alternatives recorded beside
   it, under a heading like "Settled decisions (don't relitigate casually)".
3. **Built to outlive AI.** Human legibility beats AI convenience. Never add
   machinery only an LLM can drive; operational knowledge lives in scripts
   and docs in the repo, never solely in prompts or agent memory. "No LLM
   cookbooks": ops run through a command, never reconstructed from prose —
   a script drifts loudly, a document drifts silently.
4. **Rules are mechanical, not remembered.** The module-size cap is a test.
   Contrast ratios are computed from the token file by a test. A guard a
   shell step can satisfy is a guard a shell step can be wrong about — put
   guards inside the test binary. Generated configs are marked GENERATED
   and regenerated on a timer, never hand-edited.
5. **Blast radius is the unit of design.** One process + one DB per account:
   a panic takes down one person. The corollary cuts both ways: strict
   validation belongs where its blast radius is one request, not one fleet
   (a shared package that panics at init once 502'd every process at once).
6. **Defer until earned, with the trigger written down.** Keep a
   "Deliberately not built yet" section. And ship a thing *off* rather
   than untested when the only real proof needs infrastructure you don't
   have yet.
7. **Don't diverge gratuitously from the family.** Shared shape is what
   makes components extractable; a local improvement to shared code is a
   debt to upstream, noted as such.
8. **Honesty over polish.** Publish trade-offs plainly ("Honest trade-offs
   — read before trusting it"), never overclaim maturity, and don't let
   the UI lie: an uncertain state is a sentence, never a fabricated number,
   and a claim about a person ("you earned your rest") has to be true.
9. **Every deviation from the one rule is enumerated**, justified, and
   published — never hidden.

## The eleven factors

CARLOS is the architecture; the values under it are **the eleven factors**
([11factor.org](https://11factor.org) is the canonical text — link to it,
don't copy it). Sibling repos cite factors **by number**, so know the names:

I. Trust no one · II. Let kids play · III. Encrypt everything ·
IV. Great design is for everyone · V. Intent is the system ·
VI. Built by humanity, owned by humanity · VII. Self-hosting is a right ·
VIII. Many small things · IX. Inefficient builds efficient ·
X. Humans come first · XI. Centralised infrastructure is glue.

The ones the family invokes operationally:

- **III — Encrypt everything** → the one rule: server-blind by default;
  deviations are legitimate under the deviation rule, not violations.
- **V — Intent is the system** → CLAUDE.md and design docs before code;
  "the code should have to argue with something."
- **VI — Built by humanity, owned by humanity** → open source; private
  until it works is allowed, but "factor VI is not optional, only
  deferred."
- **VII — Self-hosting is a right** → self-hosting is first-class, never a
  degraded tier; hosted convenience (Carloku) is the product, never the
  software.
- **VIII — Many small things** → instance-per-account, scale by adding
  instances, not replicas of one.
- **X — Humans come first** → AI is "a guest with a name tag": opt-in,
  never required, always disclosed (🤖 marking), and every path works with
  the AI switched off. The strongest form is Kass's: the AI is an ordinary
  member whose code never runs inside the server process, and whose
  conclusions land as proposals into human review, never as direct writes.

## Quick reference — the shape

| Concern | The CARLOS answer |
|---|---|
| Language | Go, one static binary, `CGO_ENABLED=0`, thin `main.go` dispatch |
| Dependencies | Stdlib first; "adding a dependency is a decision, not a default"; hand-roll small clients over SDKs; a scoped exception is dated and does not extend to its neighbours |
| Storage | `modernc.org/sqlite`, WAL, one DB per instance, additive-only migrations — automatic on rastrillo |
| Quantities | Integer cents, integer grams — "a float never touches an amount" |
| Frontend | Two shapes, chosen deliberately: `server` (server-rendered, zero-JS baseline — the default) or `client` (Woodstar's shape) — see decisions.md §2 |
| JS discipline | 300-line module cap enforced by test, ratchet-down only; VanJS (vendored) the one sanctioned reactive dependency |
| Routing, TLS, replication, hibernation, restarts | The platform's job — see platform.md; hand-rolled only off-platform (blueprint.md) |
| Outbound email | `carlos email enable` — the platform mints the sending identity, publishes DKIM/SPF/DMARC, delivers SMTP credentials as env; never run an MTA or hold a cloud mail key — platform.md |
| Scheduled work | `carlos schedule set` declares it; the app's part is a POST handler guarded by `carlos.Tick` — the instance is asleep, so never an in-process cron — platform.md |
| Hosting | Carloku hosted (default) / customer fleets / self-hosted platform — decisions.md §3 |
| Deploys | `carlos deploy`: ship + promote + watch `X-Carlos-Version` until live; verify against the thing you changed with the binary you built |
| Identity | "Sign in with Keymail" / passkeys+PRF / magic link+TOTP by trust model — decisions.md §4 |
| Trust | Server-blind by default; the spectrum and its named softenings — decisions.md §1 |
| UI stance | Hide the machinery: no hostnames, keys, or crypto vocabulary in the default flow — "no nerdspeak"; calm UI, red for danger only, no toasts |
| Process | Worktree per session; branch → PR → squash-merge; review on a deployed canary, never localhost |
| Authorship | 🤖/👨 markers, `Co-Authored-By: Claude …` trailers, published prompt + carbon ledgers |

## Details

- **[references/decisions.md](references/decisions.md)** — the four axes:
  trust model, app shape, hosting, identity — each with the family's real
  positions, recorded reasons, and a decision guide.
- **[references/platform.md](references/platform.md)** — the platform
  member-side: concepts (accounts, releases, channels, instances,
  hibernation), the `carlos` CLI verb table, sending email (SMTP
  credentials, DKIM/DMARC alignment, the credential-propagation trap),
  scheduled work (the tick contract, idempotency, one-shot timers),
  deploy truths, self-hosting.
- **[references/rastrillo.md](references/rastrillo.md)** — building an
  app with rastrillo: the middle-layer shape, where the authoritative
  SKILL.md lives, the safety rules, and the declarative manifest path.
- **[references/blueprint.md](references/blueprint.md)** — the technical
  blueprint the platform automated: the carlos core, storage rules,
  crypto conventions, box setup. The reference for self-hosting outside
  the platform and for understanding what it does on your behalf.
- **[references/process.md](references/process.md)** — working
  conventions: repo docs, git/PR workflow, canaries, the test layers
  (including the uidump pattern), `/end-session`, ledgers and
  AI-authorship marking.

## Adopting CARLOS in an existing app (Tito's path)

1. Restate the model in your first commit and at the top of README and
   CLAUDE.md.
2. Deploy onto the platform (hosted or self-hosted) rather than porting
   the router/replication machinery — that is what it is for. Only when
   the app must run somewhere the platform can't: take the core into
   `internal/carlos`, kept close to blueprint.md's shape so it can be
   swapped for the platform later.
3. Adopt the conventions alongside (worktrees, PR playbook, canaries,
   additive migrations, zero-JS-first).
4. List every deferred component with its trigger; list every deliberate
   departure with its reason.
5. Fixes you make to shared-shape code are candidates to upstream — record
   them.

## Common mistakes

| Mistake | Reality |
|---|---|
| Adding a framework/bundler "just for this screen" | The no-build-step rule is load-bearing (auditability, longevity). One more ES module, one concern. |
| Choosing the client shape because it feels modern | The client shape is for client-held keys, live channels, and server-blind state — and it must self-impose the discipline the server shape gets free (decisions.md §2). |
| Hand-rolling a router, certs, Litestream, or restart machinery | The platform's job. An app on the platform is a binary on a unix socket (`--socket`/`--db`; there is no `$PORT`). |
| Growing the biggest file/package | A new concern gets a new small module or package — never more growth of the biggest one. |
| Destructive migration "to clean up" | Migrations are additive-only. New code over an old DB must always be safe. Never delete data to update. |
| Trusting a backup that exists | "A backup you've never restored is a hope, not a backup." (Platform-run for platform apps; your job off-platform.) |
| Verifying a deploy with a 200 | An app-shell route 200s for any build ever shipped. Only `X-Carlos-Version` on the canonical host, after the watch, is proof — and minted alias hosts carry no version header by design. |
| Treating a promote as a deploy | Until the process cycles, the old binary serves. Platform-known units cycle automatically; hibernating tenants wake into the new build; a bespoke unit stays old until something restarts it. |
| Reviewing on localhost | Review happens on a deployed canary, always. Shared hosts only ever run merged main. |
| Skipping the post-deploy browser check | A JS syntax error takes the whole client down and only a real engine sees it (the keymail rule). |
| Relitigating a settled decision in a drive-by | Settled decisions change with new facts, dated and attributed — not casually. |
| A retired stack left owning DNS or deploy paths | It can silently undo a cutover (a legacy apply once reverted a live A record). Move the records; delete the verb that can report success while changing nothing. |

---
name: building-carlos-apps
description: Use when building a new app on the CARLOS architecture (Cost-efficient, Available, Replicated, Lightweight, Open, Secure) or bringing an existing app onto it — the model extracted from Eleven Messenger, Keymail, Woodstar, Slopbox and Kass, adopted by Tito — and you need the family's principles, stack, infrastructure shape, and working conventions without reading the source apps.
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

- Starting a new product that should join the family.
- Porting an existing app onto the model (Tito's path — see "Adopting" below).
- Any question of the form "what would a CARLOS app do here?" — stack,
  hosting, testing, deploys, process.

Not for: contributing to one of the existing apps (read that repo's CLAUDE.md
instead — it always wins over this skill).

## The one rule comes first

Every app opens its CLAUDE.md with a single load-bearing rule and derives
everything from it. Write yours before writing code (the first commit of Kass
is literally "Write down the architecture before writing any code").

The family default is server-blindness: **"If the server is compromised, the
attacker gets nothing."** Plaintext or a usable private key in SQLite is a bug
— and because Litestream ships the whole file to S3, *a plaintext column is a
plaintext leak*. Enforce it with a test that greps the raw SQLite bytes (and
S3 objects) for plaintext.

The exception proves it is a decision, not a dogma: Tito deliberately chose
server-side trust because a six-person support team must be able to
`SELECT email FROM auth_users` ("Vicky's rule": every decision is weighed by
the support load it creates — prefer the boring thing that can't page
anyone). Pick your trust model explicitly, on day one, and record why.

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
   cookbooks": ops run through a command (`ops deploy`, `ops doctor`), never
   reconstructed from prose — a script drifts loudly, a document drifts
   silently.
4. **Rules are mechanical, not remembered.** The module-size cap is a test.
   The "only main deploys to shared hosts" rule is the deploy script building
   `origin/main` in a throwaway worktree. Generated configs are marked
   GENERATED and regenerated on a timer, never hand-edited.
5. **Blast radius is the unit of design.** One process + one DB per account:
   a panic takes down one person, and systemd restarts it.
6. **Defer until earned, with the trigger written down.** Hibernation waits
   for idle-cost numbers; mesh waits for a second box; wildcard DNS-01 certs
   wait for ~50 new certs/week. Keep a "Deliberately not built yet" section.
7. **Don't diverge gratuitously from the family.** Shared shape is what
   makes components extractable; a local improvement to shared code is a debt
   to upstream, noted as such.
8. **Honesty over polish.** Publish trade-offs plainly ("Honest trade-offs —
   read before trusting it"), never invent an escrow or overclaim maturity,
   and don't let the UI lie (estimates that "neither flap nor lie").
9. **Every deviation from the one rule is enumerated**, justified, and
   published — never hidden.

## Quick reference — the shape

| Concern | The CARLOS answer |
|---|---|
| Language | Go, one static binary, `CGO_ENABLED=0`, thin `main.go` dispatch |
| Dependencies | Stdlib first; "adding a dependency is a decision, not a default"; hand-roll small clients (SigV4 is ~a page of HMACs) over SDKs |
| Storage | `modernc.org/sqlite`, WAL, one DB per instance, additive-only migrations |
| Quantities | Integer cents, integer grams — "a float never touches an amount" |
| Frontend | Server-rendered HTML first; vanilla ES modules, no framework, no bundler, no build step; `go:embed` |
| JS discipline | 300-line module cap enforced by test, ratchet-down only — "we are not doing shell.js again" |
| Routing | `internal/carlos`: SQLite registry (host → unix socket) + TLS router; the route table IS the ACME allowlist |
| Replication | Litestream WAL → S3 for every DB; restore drills on a timer |
| Hosting | One or two tiny ARM boxes (t4g.nano/micro or one Hetzner box); no containers, no k8s, no LB, no managed DB |
| IaC | OpenTofu (`tofu`, never Terraform) |
| Deploys | Build exact `origin/main` in a throwaway worktree, scp, `systemctl restart`, verify `/api/version` == sha on every socket |
| Identity | Passkeys (WebAuthn, PRF extension) or magic link + TOTP; tokens stored hashed, never logged |
| Process | Worktree per session; branch → PR → squash-merge; canary per session, review never on localhost |
| Authorship | 🤖/👨 markers, `Co-Authored-By: Claude …` trailers, published prompt + carbon ledgers |

## Details

- **[references/blueprint.md](references/blueprint.md)** — the technical and
  infrastructure blueprint: the carlos core, storage rules and known SQLite
  fixes, crypto conventions, deploy and box setup, security defaults.
- **[references/process.md](references/process.md)** — working conventions:
  repo docs, git/PR workflow, canaries, the test layers, `/end-session`,
  ledgers and AI-authorship marking.

## Adopting CARLOS in an existing app (Tito's path)

1. Restate the model in your first commit and at the top of README and
   CLAUDE.md.
2. Take the core now — router, registry, cert handling — into a package
   named `internal/carlos`, kept deliberately close to the source shape so it
   can be swapped for the extracted component later.
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
| Growing the biggest file/package | A new concern gets a new small module or package — never more growth of the biggest one. |
| Destructive migration "to clean up" | Migrations are additive-only. New code over an old DB must always be safe. Never delete data to update. |
| Trusting a backup that exists | "A backup you've never restored is a hope, not a backup." Restore-verify on a timer. |
| Reviewing on localhost | Review happens on a deployed canary, always. Shared hosts only ever run merged main. |
| Skipping the post-deploy browser check | A JS syntax error takes the whole client down and only a real engine sees it (the keymail rule). |
| Deploying a branch to a shared host | The deploy path must make this impossible, not discouraged. |
| Relitigating a settled decision in a drive-by | Settled decisions change with new facts, dated and attributed — not casually. |

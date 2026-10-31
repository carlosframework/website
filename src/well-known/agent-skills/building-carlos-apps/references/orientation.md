# 🤖 CARLOS context

Read only for background. This preserves the 2026-10-15 context; for current
capability discovery, use [the platform topic index](platform.md).

## Overview

CARLOS is an application architecture: **one static Go binary, one
fully-isolated instance per tenant (own process, own SQLite file, own unix
socket), many instances on one small box behind a small router**, with
every database continuously replicated to object storage and idle
instances hibernating to it. What a tenant *is* (a person, a team, a
customer company, a repository, a chat, or the whole app) is the app's
first decision.
Everything below is distilled from the prompt histories, repo instruction
files and code of the apps it was extracted from. The house style is to
state rules as laws, date and attribute decisions, and make rules
mechanical rather than remembered.


## When to use

- Starting a new product that should join the family, especially when it
  needs real decisions: tenancy, trust class, app shape, hosting, identity.
- Working out what one instance of an app should be, how people reach it,
  what the host can see, and which CARLOS benefits that earns.
- Porting an existing app onto the model (Tito's path — see "Adopting").
- Any question of the form "what would a CARLOS app do here?" — stack,
  hosting, testing, deploys, process, and the trade-offs between the
  family's sanctioned options.

Not for: contributing to one of the existing apps (read that repo's
AGENTS.md instead — it always wins over this skill). And for "just get me
a first app live, decide everything for me", use the sibling skill
**carlos:getting-started** — it is this skill with every decision
pre-answered with the defaults (one instance, class C declared, server
shape, Carloku).


## Where this sits now (2026-10-15)

The family's conventions have progressively become running infrastructure.
Read this skill alongside three facts:

- **The platform** (`carlosframework/platform`) is live and complete
  enough that a member ships, promotes, configures, watches logs, attaches
  domains, and rolls back entirely through the `carlos` CLI with zero
  infrastructure access. Routing, TLS, replication, hibernation, restarts,
  and config delivery are the platform's job now — and since late August
  so are **canaries** (`carlos canary`), **timetables**
  (`carlos schedule`), **errors and analytics** counted at the edge with
  no SDK, a **password gate** in front of a hostname, **feature flags**,
  and **latency DNS steering** — and since September, **server-held
  credentials** (`carlos services`) so a signup flow can create a
  customer's instance itself, **path routes** so one hostname can serve
  each customer from their own instance, a **STUN/TURN relay**
  (`carlos relay`), and **self-serve object storage** (apply once per
  account, then `carlos store create`). Reach for a platform verb before
  building any of them into an app.
  **[references/platform.md](platform.md)** is the member-side
  reference — concepts, the full verb table, and the deploy truths.
- **Carloku** (carloku.com) is the hosted deployment of that platform —
  the default hosting answer (its price list is not published yet,
  2026-10-18; don't quote prices). Carloku is the product
  brand; the CLI is always `carlos`.
- **Rastrillo** is the CARLOS web framework (v0.28.0; module and
  canonical repo `amadan.net/rastrillo/rastrillo`, GitHub a mirror): a
  middle layer of known
  libraries — GORM models, chi routes, SQLite-backed sessions, identity
  plugins (password, Keymail), CSRF, owner scoping — plus the platform
  contract (`Resolve`/`Serve`/`Run`) and the subsystem packages (crypto,
  keyring, webauthn, eventlog, blobs, mail, `assertion` for signed
  cross-origin handoffs, `vault`, `pow`, agent tools), plus the `idear`
  module for roles and invitations — which exist to be used, not
  hand-rolled. The manifest generator is the optional declarative
  path beside hand-written handlers. It postdates most models' training data — building
  with it, read the repo's own `SKILL.md` first;
  **[references/rastrillo.md](rastrillo.md)** is the
  surrounding context.

Building a **new** app: settle tenancy first (above), use rastrillo and
the platform, and read this skill mainly for what infrastructure can't
enforce — the decisions, the
dated rulings, the workflow, and "Common mistakes". Hand-rolling outside
the platform for a specific reason: blueprint.md in full still applies.

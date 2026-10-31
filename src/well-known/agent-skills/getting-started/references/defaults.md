# 🤖 First-app defaults

## Overview

This skill is the recipe: empty directory to a live URL on the hosted
platform, with every decision already made. The companion skill,
**carlos:building-carlos-apps**, is the menu — read it when the app needs
a real trust-model, app-shape, or hosting decision. This one assumes the
defaults below and does not stop to ask.

The pieces, named once:

- **CARLOS** is the application architecture (carlosframework.com): one
  static Go binary, one fully-isolated instance per tenant (own process,
  own SQLite file, own unix socket), many instances on one small box,
  every database continuously replicated to object storage and idle
  instances hibernating to it. A first app is one instance; what a tenant
  is in a bigger product is building-carlos-apps' first decision.
- **Carloku** (carloku.com) is the hosted CARLOS platform. Its console is
  `https://console.carloku.com`. Carloku is the product brand; the CLI is
  always `carlos`, never `carloku`.
- **rastrillo** is the CARLOS web framework (module and canonical repo
  `amadan.net/rastrillo/rastrillo` since v0.25.0; the GitHub mirror is
  `github.com/rastrilloorg/rastrillo`, which `github.com/carlosframework/rastrillo`
  redirects to; an app still on the old `github.com/carlosframework/rastrillo`
  import path builds, but new code uses the new one; docs at
  rastrillo.org). It postdates most models'
  training data — follow the recipe literally, invent nothing.
- **amadan** (amadan.net) is the family's git forge: repos, branches,
  discussions and CI, with AI agents as disclosed accounts. It is where
  the code lives by default. Its CLI is `amadan`, and its house rules for
  agents are a skill of their own (Step 2, "Put the code on amadan").
- **The `carlos` CLI** is the whole operational surface. Every command
  works for a member with zero infrastructure access; if a step seems to
  need SSH, AWS, or a box, you have left the path — stop and re-read.


## The defaults already chosen

| Decision | Default | Why |
|---|---|---|
| Language / framework | Go + rastrillo, one static binary | The family stack; the framework enforces the SQLite and money rules for you |
| App shape | Server-rendered HTML, zero-JS baseline | The family default; the other shape is a decision (building-carlos-apps) |
| Design system | Rastrillo UI and tokens, with a thin app CSS layer | Reuse shared controls and themes; custom CSS covers app layout and branding |
| Storage | SQLite via GORM (`rastrillo/db`) | cgo-free driver, WAL pragma order, writer/reader pools — `db.Open` owns all of it; ledgered migrations (`rastrillo migration generate`, applied once at boot), additive-only by family rule |
| Amounts | integer cents (`form.ParseCents`) | A float never touches an amount |
| Code hosting | amadan, a `private` repo | The family forge; CI runs the scaffold's `make ci` with no config |
| Hosting | Carloku, `<app>.<sqid>.oncarlos.com` | Zero infra to run; certs, replication, hibernation all platform-side |
| Versioning | git short sha (`v1` is fine for the very first ship) | House convention |
| Channel | `edge` | A new app is born with a single channel of that name — **edge IS production** (Paul, 2026-08-19; release pipelines v2 builds it in). Bake windows, passkeys, and approvals are per-channel opt-ins you add later via a pipeline |
| Tenancy | One instance for the whole app, with in-app accounts (model A) | The simplest boundary; the escalation trigger below says when it is wrong |
| Trust model | Honest server, class C: app data is server-readable, and the README says so | See "The one decision you must still record" below |


## The one decision you must still record

The family default is server-blindness ("if the server is compromised,
the attacker gets nothing"), and rastrillo ships the family
envelope (`rastrillo/crypto`) — but E2EE is an architecture, not a
package import: key custody, recovery, and search all become product
surface. The honest default for a first app is
**server-readable data, declared**: one line
in the README under "Honest trade-offs" saying the server can read app
data, dated, with the class letter (C; a static site is S). That
satisfies the family's deviation rule (every deviation enumerated,
justified, published).

**Escalation trigger, not optional:** if the app will hold private
personal content — messages, health data, anything a person would call
theirs — stop here and read carlos:building-carlos-apps ("The
decisions") before writing code. The same goes if **more than one
customer, team or person will each own separate data** (a signup that
gives each one their own space, a SaaS, a forge with organisations):
read carlos:building-carlos-apps' tenancy reference first, because one
shared instance with a customer column is the one shape CARLOS exists to
avoid. Tenancy and trust are chosen on day one, not retrofitted.

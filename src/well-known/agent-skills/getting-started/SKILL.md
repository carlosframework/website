---
name: getting-started
description: Use when someone wants a new app on CARLOS built and live with minimum decisions — "start a CARLOS app", "put this on carloku", a first deploy to an oncarlos.com URL, or when an agent needs the family's default stack (rastrillo + the carlos CLI) as a recipe rather than a menu. Not for weighing trust models, app shapes, or hosting options — that is building-carlos-apps.
---

# 🤖 Getting started on CARLOS

## Overview

This skill is the recipe: empty directory to a live URL on the hosted
platform, with every decision already made. The companion skill,
**carlos:building-carlos-apps**, is the menu — read it when the app needs
a real trust-model, app-shape, or hosting decision. This one assumes the
defaults below and does not stop to ask.

The pieces, named once:

- **CARLOS** is the application architecture (carlosframework.com): one
  static Go binary, one fully-isolated instance per account (own process,
  own SQLite file, own unix socket, own hostname), many instances on one
  small box, every database continuously replicated to object storage.
- **Carloku** (carloku.com) is the hosted CARLOS platform. Its console is
  `https://console.carloku.com`. Carloku is the product brand; the CLI is
  always `carlos`, never `carloku`.
- **rastrillo** is the CARLOS web framework (repo lives at
  `github.com/rastrilloorg/rastrillo`; the module path is still
  `github.com/carlosframework/rastrillo`). It postdates most models'
  training data — follow the recipe literally, invent nothing.
- **The `carlos` CLI** is the whole operational surface. Every command
  works for a member with zero infrastructure access; if a step seems to
  need SSH, AWS, or a box, you have left the path — stop and re-read.

## The defaults already chosen

| Decision | Default | Why |
|---|---|---|
| Language / framework | Go + rastrillo, one static binary | The family stack; the framework enforces the SQLite and money rules for you |
| App shape | Server-rendered HTML, zero-JS baseline | The family default; the other shape is a decision (building-carlos-apps) |
| Storage | SQLite via GORM (`rastrillo/db`) | cgo-free driver, WAL pragma order, writer/reader pools — `db.Open` owns all of it; migrations via `AutoMigrate`, additive-only |
| Amounts | integer cents (`form.ParseCents`) | A float never touches an amount |
| Hosting | Carloku, `<app>.<sqid>.oncarlos.com` | Zero infra to run; certs, replication, hibernation all platform-side |
| Versioning | git short sha (`v1` is fine for the very first ship) | House convention |
| Channel | `edge` | A new app is born with a single channel of that name — **edge IS production** (Paul, 2026-08-19; release pipelines v2 builds it in). Bake windows, passkeys, and approvals are per-channel opt-ins you add later via a pipeline |
| Trust model | Honest server: app data is server-readable, and the README says so | See "The one decision you must still record" below |

## The one decision you must still record

The family default is server-blindness ("if the server is compromised,
the attacker gets nothing"), and rastrillo ships the family
envelope (`rastrillo/crypto`) — but E2EE is an architecture, not a
package import: key custody, recovery, and search all become product
surface. The honest default for a first app is
**server-readable data, declared**: one line
in the README under "Honest trade-offs" saying the server can read app
data, dated. That satisfies the family's deviation rule (every deviation
enumerated, justified, published).

**Escalation trigger, not optional:** if the app will hold private
personal content — messages, health data, anything a person would call
theirs — stop here and read carlos:building-carlos-apps ("The
decisions") before writing code. Trust models are chosen on day one,
not retrofitted.

## Step 0 — install and sign in

```sh
brew install carlosframework/tap/carlos
# no brew: one static binary from github.com/carlosframework/releases —
# put it on your PATH, done. Keep it fresh later with: carlos update
```

Create an account at `https://console.carloku.com` (passkey sign-in
through Keymail — no password), then connect the terminal:

```sh
carlos auth login -console https://console.carloku.com
```

The CLI prints a short code; approve it in the signed-in browser. Skip
this and nothing breaks — the first command that needs a login offers to
run it right there. `carlos auth whoami` shows who you are and your
account's **sqid** (a short public id like `bdf` — it appears in your
app's hostname; it is not a secret).

## Step 1 — claim the app

```sh
carlos apps create -app myapp
```

App names are unique per account, not globally. With exactly one app in
the account, later commands infer `-app`; passing it explicitly is never
wrong.

**Static site?** You are nearly done — skip to "The static path" below.

## Step 2 — the five-file rastrillo app

**Read rastrillo's `SKILL.md` first** (repo root of
`github.com/rastrilloorg/rastrillo`, or
`$(go env GOMODCACHE)/github.com/carlosframework/rastrillo@<version>/SKILL.md`
once the module is downloaded). It is the app story in ~15KB — the file
to follow literally instead of framework source. The worked reference
is `examples/notes`.

```sh
go install github.com/carlosframework/rastrillo/cmd/rastrillo@latest
rastrillo new myapp && cd myapp && go mod tidy && go test ./...
```

The scaffold is SKILL.md's five-file shape, tests passing before you
write a line:

```
internal/myapp/models.go     plain GORM structs
internal/myapp/app.go        AutoMigrate, sessions, identity plugin, chi router
internal/myapp/handlers.go   the owner-scoped CRUD
internal/myapp/render.go     embedded templates, flash/session-aware pages
cmd/myapp/main.go            Resolve -> db.Open -> App -> Serve
```

The gate, before every commit:

```sh
CGO_ENABLED=0 go build ./... && go vet ./... && go test ./...
```

The three rules that keep the app safe (SKILL.md has the full set):
every query touching user-owned rows goes through `scope.Owned` —
reads AND writes, transactions included (a row that isn't yours 404s,
never 403s); never bind a request body onto a GORM model (explicit
`map[string]any` + `.Select` allowlist); sessions/CSRF are defaults
you opt out of, not machinery you assemble. Accounts come from an
identity plugin — the family default is `auth` (magic-link email that
auto-upgrades to sign-in-with-Keymail when the address has a claimed
inbox; works for every address), with `password` (email+password,
rate-limited) as the classic alternative — and either one is a few
lines in `app.go`; guard routes with `sess.Require`.

(The manifest generator — `rastrillo new`, `manifest/*.toml`,
`rastrillo generate` — is the optional declarative path: declare a
resource once and its store, screens, and locale keys are generated;
`scope = "user"` (v0.11.0+) owner-filters the generated queries for
user-owned resources. Mix declared and hand-written resources freely.
building-carlos-apps' `references/rastrillo.md` covers it.)

`rastrillo.Resolve` + `Serve` speak the platform's process contract —
your binary accepts `--socket <path> --db <path>` and serves
`GET /healthz` and `GET /api/version`. **There is no `$PORT`**;
instances listen on unix sockets the platform hands them. Do not
hand-roll flag parsing.

## Step 3 — first deploy

Provision the instance (once), build for the boxes, deploy:

```sh
carlos instances enable -app myapp          # opt-in; console pins your <sqid> domain
carlos instances create -app myapp -host myapp.<sqid>.oncarlos.com -channel edge
# substitute your real sqid (carlos auth whoami shows it) — the host is typed in full;
# -channel edge is deliberate: the instance-create default is still stable, but a
# new app's one channel — the one carlos deploy lands on — is edge

GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build \
  -ldflags "-X github.com/carlosframework/rastrillo.BuildVersion=$(git rev-parse --short HEAD)" \
  -o myapp-linux-arm64 ./cmd/myapp

carlos deploy -app myapp ./myapp-linux-arm64
```

The platform's boxes are **linux/arm64** — build exactly that, statically
(`CGO_ENABLED=0`; cgo is why the framework uses `modernc.org/sqlite`).

`carlos deploy` is ship + promote + watch in one motion: it uploads an
immutable release, promotes it to your app's entry channel (`edge` —
for a fresh app, edge is production; the old three-rung ladder is now
an opt-in pipeline), then polls until the URL's `X-Carlos-Version`
header reports the shipped build, and prints `live https://…`. On first
run it offers to remember the artifact path in `.carlos/config`
(commit that file); after that, releasing is just `carlos deploy`, no
arguments.

### The static path

No instance, no binary — deploy the directory:

```sh
carlos deploy -app myapp -kind static -host myapp.<sqid>.oncarlos.com ./public
```

`-host` is required on the **first** static deploy and only that one: a
static app has no instance record yet, so there is nothing to resolve the
host and channel from. That deploy attaches the host and writes the
record; afterwards `carlos deploy` from the project dir resolves both on
its own. Omitting `-host` on a first deploy is a refusal, not a default.

## Step 4 — verify like the family does

The deploy's own `live` line is the primary proof. To re-verify by hand:

```sh
curl -sI https://myapp.<sqid>.oncarlos.com | grep -i x-carlos-version
carlos channels -app myapp     # what each channel currently serves
carlos logs -app myapp -f      # merged app + platform timeline, no box access
```

Two traps, both paid for:

- **A 200 is not a verification.** An app-shell route happily serves any
  build ever shipped; only the `X-Carlos-Version` header (stamped after
  the instance actually restarted) is proof. Verify against the thing you
  changed, with the binary you built.
- **Hibernation is the story, not a bug.** Idle instances doze; the first
  request wakes them. A session in flight keeps the old binary until its
  instance idles — that is the bake working, not a deploy that failed.

## Iterating

| Want | Command |
|---|---|
| Release again | `carlos deploy` (zero-arg, from the project dir) |
| Config var | `carlos env set -app myapp KEY=value` (converges in seconds) |
| Secret | `carlos secrets set -app myapp KEY=value` (sealed, never printed) |
| Tail logs | `carlos logs -app myapp -f` |
| Bounce the process | `carlos restart -app myapp` |
| Undo a release | `carlos rollback -app myapp edge` |
| List releases | `carlos releases -app myapp` |
| Custom domain | `carlos domains attach -app myapp www.example.com` — it tells you the DNS records to create; certs are automatic once DNS points at the platform |

Everything above is a console-mediated write that boxes converge within
seconds. There is no restart-by-SSH, no cert ceremony, no Litestream
config: routing, TLS, replication, restore drills, hibernation, and
restarts are the platform's job. If you find yourself hand-rolling any
of those, stop — you are rebuilding the platform under your app.

## Conventions that still bind you

The platform mechanized the infrastructure, not the discipline:

- The gate (`CGO_ENABLED=0 go build ./...`, `go vet ./...`,
  `go test ./...`) green before every commit; add
  `rastrillo generate --check` only if the app declares manifest
  resources.
- Migrations are additive-only — new code over an old DB must always be
  safe. Never delete data to update.
- Zero-JS first; when JS is earned, small ES modules, no bundler, no
  build step, 300-line cap.
- Worktree per session, on a branch, with regular commits pushed as you
  go. Squash-merge to main only once the work is done, a human has
  approved it, and CI is green; deploy only what merged. Commit trailers
  mark AI authorship (🤖 / `Co-Authored-By`).

The full working conventions are building-carlos-apps'
`references/process.md`.

## Common mistakes

| Mistake | Reality |
|---|---|
| Reading `$PORT` and calling `http.ListenAndServe` | The contract is `--socket <path> --db <path>` on a unix socket. `rastrillo.Resolve`+`Serve` handle it; hand-rolled servers must too. |
| Building for the local machine | Boxes are linux/arm64. `GOOS=linux GOARCH=arm64 CGO_ENABLED=0`, always. |
| A bare `First(&x, id)` on a user-owned row | Every such query goes through `scope.Owned` — reads, writes, and transactions alike. The isolation test suite in `examples/notes` is the regression guard to copy. |
| Binding a form onto a GORM model | Mass assignment. Explicit `map[string]any` + `.Select` allowlist, per SKILL.md. |
| Hand-rolling a router, certs, or Litestream | Platform's job. Your app is one binary on one socket. |
| Verifying with a 200 or a cached DNS answer | Only `X-Carlos-Version` is proof, on the canonical host, after the deploy watch. |
| Waiting for an SSH step that never comes | Every step is a `carlos` command. A step that needs box access is a wrong turn (or a product gap to file — not a workaround to build). |
| Destructive migration "to clean up" | Additive-only, forever. |
| Skipping the trade-offs line in the README | The trust default is legitimate only when declared. One dated line. |

## When to leave this skill

The moment the app needs a choice — end-to-end or partial encryption, a
feed/real-time client shape, self-hosting, fleets of your own boxes — or a
capability this recipe skips, such as sending email (`carlos email enable`)
or work that has to happen on a clock (`carlos schedule set` — an idle
instance cannot run its own timer), both in platform.md — switch to **carlos:building-carlos-apps**. It holds the decision axes,
the family evidence for each option, and the deeper references this
recipe deliberately skips.

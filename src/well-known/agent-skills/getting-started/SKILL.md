---
name: getting-started
description: Use when someone wants a new app on CARLOS built and live with minimum decisions — "start a CARLOS app", "put this on carloku", a first deploy to an oncarlos.com URL, code hosted on amadan, or when an agent needs the family's default stack (rastrillo, amadan, the carlos CLI) as a recipe rather than a menu. Not for weighing trust models, app shapes, or hosting options — that is building-carlos-apps.
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

## What the person does, once

An agent can do everything below except these. Ask for them up front, in
one message, rather than discovering them one at a time:

1. **A Keymail identity** (keymail.dev). Carloku and amadan both sign in
   through it; there are no passwords.
2. **Sign in to the Carloku console** (`https://console.carloku.com`).
   That first sign-in is the account.
3. **Approve the `carlos auth login` code** in that browser (Step 0).
4. **On amadan:** sign in, claim a namespace, and create the agent's
   account and token with `amadan agent create`. An agent never works
   as its operator.
5. **Start an amadan CI runner** on a machine they control (`amadan
   runner`), before the first push. amadan runs no runners itself.
6. **DNS**, only for a custom domain: the record `carlos domains attach`
   prints.
7. **Approve anything billable.** There is no public Carloku price list
   yet (2026-10-18), so check with the person before object storage,
   email sending, or a schedule that keeps an instance awake.

## Step 0 — install and sign in

Go **1.25 or newer** (rastrillo's `go.mod` says `go 1.25.0`). Then the
three CLIs:

```sh
brew install carlosframework/tap/carlos
# no brew (Linux): the static binary, checked against the release's sums
curl -fsSLO https://github.com/carlosframework/releases/releases/latest/download/carlos-linux-amd64
curl -fsSLO https://github.com/carlosframework/releases/releases/latest/download/SHA256SUMS.txt
sha256sum --ignore-missing -c SHA256SUMS.txt
install -m 0755 carlos-linux-amd64 ~/.local/bin/carlos   # any dir on PATH; no sudo needed
# (arm64: carlos-linux-arm64; macOS: carlos-darwin-<arch>)

go install amadan.net/rastrillo/rastrillo/cmd/rastrillo@latest
go install amadan.net/amadan/amadan/cmd/amadan@latest
```

Keep `carlos` fresh with `carlos update` (it needs a terminal; otherwise
repeat the download).

Create an account at `https://console.carloku.com` (passkey sign-in
through Keymail — no password), then connect the terminal:

```sh
carlos auth login --console https://console.carloku.com
```

Flags are written `--flag` (`-a`, `-c`, `-e`, `-v` are the short forms);
the single-dash spellings still parse. The CLI prints a short code;
approve it in the signed-in browser. Skip
this and nothing breaks — the first command that needs a login offers to
run it right there. `carlos auth whoami` shows who you are and your
account's **sqid** (a short public id like `bdf` — it appears in your
app's hostname; it is not a secret).

## Step 1 — claim the app

```sh
carlos apps create --app myapp
```

App names are unique per account, not globally. With exactly one app in
the account, later commands infer `--app`; passing it explicitly is never
wrong.

**Static site?** You are nearly done — skip to "The static path" below.

## Step 2 — the rastrillo app

**Read rastrillo's `SKILL.md` first**, in full. From the web it is at
`https://raw.githubusercontent.com/rastrilloorg/rastrillo/main/SKILL.md`
(the mirror of `amadan.net/rastrillo/rastrillo`); once the module is
downloaded it is
`$(go env GOMODCACHE)/amadan.net/rastrillo/rastrillo@<version>/SKILL.md`,
which matches the version you build against. It is the app story, the
file to follow literally instead of framework source; the topic docs
are at `https://rastrillo.org/docs/`, each also served as markdown
(`/docs/<page>.md`). The worked reference is `examples/notes`.

```sh
go install amadan.net/rastrillo/rastrillo/cmd/rastrillo@latest
rastrillo new myapp && cd myapp && go mod tidy && go test ./...
```

The scaffold is SKILL.md's shape (five files plus `migrations.go`),
tests passing before you write a line:

```
internal/myapp/models.go     plain GORM structs
internal/myapp/migrations.go Schema and BootSchema; `rastrillo migration generate` writes the SQL
internal/myapp/app.go        migrate.Apply, sessions, identity plugin, chi router
internal/myapp/handlers.go   the owner-scoped CRUD
internal/myapp/render.go     embedded templates, flash/session-aware pages
cmd/myapp/main.go            Resolve -> db.Open -> App -> Serve
```

The gate, before every commit, is the scaffold's own `Makefile`:

```sh
make ci        # vet, gofmt, staticcheck, govulncheck, gitleaks, tests, budgets, migration check
```

After changing a model, run `rastrillo migration generate` and read the
SQL before committing; never edit a shipped migration.

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

For the screens, use Rastrillo's `ui` partials and its attribute
vocabulary (`<form rst-form>`, `rst-btn="primary"` — not classes), and
no `style` attributes or `<style>` blocks: the baseline CSP drops them
silently. Load
its vendored `tokens.css` before a small app stylesheet; use that layer for
app layout, token overrides and components Rastrillo does not provide.
Read [the design-system guidance](../building-carlos-apps/references/rastrillo.md#design-system-and-app-css)
before writing templates or CSS, and follow the docs for the app's installed
Rastrillo version. Keep shared controls and their interaction states intact.

### Put the code on amadan

Load amadan's house rules for agents before the first command there:
`amadan agent skill -install`, or read
`https://amadan.net/docs/-/agent-skill.md`. They cover posting as the
agent account (never the operator's), the session block every write
carries, and the worktree-and-branch habit. Work as that account, with
`AMADAN_HOME` pointing at the credentials the person minted.

```sh
amadan repo create <ns>/myapp -tier private    # tiers: amadan.net/docs/tiers
git init -b main && git add -A && git commit -m "Scaffold myapp"
git remote add origin https://amadan.net/<ns>/myapp
git push -u origin main                        # a private repo takes the token as the git password
```

That first push of the scaffold is the one commit straight to main.
After it, every change starts with
`amadan start <branch> -prompt - -summary "..."`: worktree, branch,
your git identity, push and description in one step. On amadan the
branch **is** the pull request; there is no separate step to open one.

CI needs no config: the runner runs the scaffold's `make ci`
(`.amadan/ci.d/` if you want named steps; amadan.net/docs/ci). **The
person's runner must already be up** (`amadan runner`) when you push,
or no job is ever queued and nothing says so.

Deploying stays a command you run (Step 3). If the person wants CI to
deploy, that is a `deploy`-role service credential (building-carlos-apps,
platform.md) placed in the environment of a runner that serves only this
repo: an amadan job sees its runner's environment (bar `AMADAN_*`), so a shared runner
would hand the credential to every repo it serves.

## Step 3 — first deploy

Provision the instance (once), build for the boxes, deploy:

```sh
carlos instances enable --app myapp          # opt-in; console pins your <sqid> domain
carlos instances create --app myapp --host myapp.<sqid>.oncarlos.com --channel edge
# substitute your real sqid (carlos auth whoami shows it) — the host is typed in full.
# --channel is optional since 2026-08-31 (a first instance follows the app's pipeline
# entry, not stable), and naming it explicitly is never wrong.

GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build \
  -ldflags "-X amadan.net/rastrillo/rastrillo.BuildVersion=$(git rev-parse --short HEAD)" \
  -o myapp-linux-arm64 ./cmd/myapp

carlos deploy --app myapp --message "Publish the first working app" ./myapp-linux-arm64
```

Agents pass `--message` on deploys and other mutations that support it. Describe
what is being changed in one concise sentence; the Activity entry records the
version and target separately. Do not wait for the interactive prompt during an
automated run. See [Activity descriptions](../building-carlos-apps/references/platform.md#describe-changes-in-activity).

The platform's boxes are **linux/arm64** — build exactly that, statically
(`CGO_ENABLED=0`; cgo is why the framework uses `modernc.org/sqlite`).

`carlos deploy` is ship + promote + watch in one motion: it uploads an
immutable release, promotes it to your app's entry channel (`edge` —
for a fresh app, edge is production; the old three-rung ladder is now
an opt-in pipeline), then follows the rollout box by box (on Carloku;
elsewhere it watches the URL) until the new build serves, and prints `live https://…`. Set `carlos apps build-probe
--app myapp /api/version` once so it asks the process which build it
runs rather than trusting the `X-Carlos-Version` header. On first
run it offers to remember the artifact path in `.carlos/config`
(commit that file); after that, releasing is just `carlos deploy`, no
arguments.

### The static path

No instance, no binary — deploy the directory:

```sh
carlos deploy --app myapp --kind static --host myapp.<sqid>.oncarlos.com ./public
```

`--host` is required on the **first** static deploy and only that one: a
static app has no instance record yet, so there is nothing to resolve the
host and channel from. That deploy attaches the host and writes the
record; afterwards `carlos deploy` from the project dir resolves both on
its own. Omitting `--host` on a first deploy is a refusal, not a default.

**Do not run `carlos instances enable` or `create` here.** "No instance"
is literal: a static site is served by the edge straight off the channel
pointer, with no process to start and nothing to wake. Step 3's recipe is
for binaries, and following it for a site builds a route that succeeds at
every step and then fails every wake. This one command is the whole
deploy.

## Step 4 — verify like the family does

The deploy's own `live` line is the primary proof. To re-verify by hand:

```sh
curl -sI https://myapp.<sqid>.oncarlos.com | grep -i x-carlos-version
carlos channels --app myapp     # what each channel currently serves
carlos logs --app myapp -f      # merged app + platform timeline, no box access
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
| Release again | `carlos deploy --message "Fix invoice rounding"` (from the project dir) |
| Config var | `carlos env set --app myapp --message "Update the app setting" KEY=value` (converges in seconds) |
| Secret | `carlos secrets set --app myapp KEY=value` (sealed, never printed) |
| Tail logs | `carlos logs --app myapp -f` |
| Bounce the process | `carlos restart --app myapp --message "Restart after changing configuration"` |
| Undo a release | `carlos rollback --app myapp edge` |
| List releases | `carlos releases --app myapp` |
| Custom domain | `carlos domains attach --app myapp www.example.com` — it tells you the DNS records to create; certs are automatic once DNS points at the platform |
| Review a branch | `carlos canary --app myapp ./myapp-linux-arm64` — a branch-only channel and URL that cannot disturb production. If the app carries config, pass `--environment`, or the canary host serves GETs and fails every form |
| Who is visiting | `carlos analytics --app myapp --set-count edge`, then `--range 7d` — counted at the edge: no JavaScript, no cookie, no stored IP, so don't add an analytics script |
| What is breaking | `carlos errors --app myapp --since 24h` — your `error` log lines, grouped, no wiring at all. The 502/503/504s the edge saw are `carlos availability --app myapp` |
| Keep it private | `carlos gate set --app myapp` — one shared password in front of the hostname, for a prototype nobody should read yet |
| Feature switch | `carlos features set --app myapp beta-ui=v2` — the platform serves it, only your app reads it, and it lands with no restart |

Everything above is a console-mediated write that boxes converge within
seconds. There is no restart-by-SSH, no cert ceremony, no Litestream
config: routing, TLS, replication, restore drills, hibernation, and
restarts are the platform's job. If you find yourself hand-rolling any
of those, stop — you are rebuilding the platform under your app.

## Conventions that still bind you

The platform mechanized the infrastructure, not the discipline:

- The gate (`make ci`) green before every commit, with `CGO_ENABLED=0`
  builds throughout; add `rastrillo generate --check` to it only if the
  app declares manifest resources.
- Migrations are additive-only — new code over an old DB must always be
  safe. Never delete data to update.
- Zero-JS first; when JS is earned, small ES modules, no bundler, no
  build step, 300-line cap.
- Worktree per session, on a branch, with regular commits pushed as you
  go. Merge to main only once the work is done, a human has
  approved it, and CI is green (on amadan, `amadan branch merge`: a merge
  commit, or one commit with `-squash`; never squash by hand, which
  amadan shows as a deleted branch) — until the repo has CI there is no green
  to wait for, so done + approved is the gate, and standing up CI (the
  same gate as above, run for you) is early work rather than a
  prerequisite nobody can meet. Deploy only what merged. Commit trailers
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
instance cannot run its own timer), both in platform.md, or **a product
where each customer gets their own instance** (a signup flow that
creates instances, one domain split by path) — switch to **carlos:building-carlos-apps**. It starts with tenancy (what
one instance is, the user models, the trust classes, and the benefits
each earns), then holds the decision axes,
the family evidence for each option, and the deeper references this
recipe deliberately skips.

# 🤖 Building an app with rastrillo

The CARLOS web framework. **Module and canonical repo:
`amadan.net/rastrillo/rastrillo`** (GitHub's `rastrilloorg/rastrillo` is a
mirror; an app still on the old `github.com/carlosframework/rastrillo`
path is frozen at v0.23.0, and a current `rastrillo doctor` prints the
migration). Assume nothing here is in your training data, and don't
trust a version number remembered from this file: read the version the
app builds against.

**The authoritative authoring doc is `SKILL.md` at the repo root. Read
it before writing any app code**, then the `skill/<topic>.md` its index
names before each piece of work. Read the copy for the app's own version:
`$(go list -m -f '{{.Dir}}' amadan.net/rastrillo/rastrillo)/SKILL.md`,
with `CHANGELOG.md` beside it for what changed and each release's upgrade
steps. Any page either cites is `curl -s
https://rastrillo.org/docs/<page>.md`. This file is only the surrounding
context SKILL.md assumes; where they disagree, SKILL.md wins.

## What rastrillo is now

A middle layer, not a full-stack framework. You write GORM models or
plain SQL, actions on a route table (the `action` package, over chi: an
action is `func (app *App) home(visit *action.Visit)`), and
`html/template` pages. The framework supplies what is hard to get right
twice: the database opener, migrations, sessions and sign-in, CSRF, owner
scoping, form helpers, the design system, and the platform contract.
SKILL.md's index names every package; this map only says which family
serves which CARLOS choice (tenancy.md has the choices):

| CARLOS choice | Rastrillo's side | Read |
|---|---|---|
| One team per instance (model A, or each tenant of B) | `db`, `migrate`, `sessions`, a sign-in plugin (`auth`, `password`, `oidc`), `scope` | SKILL.md, `skill/data.md`, `skill/signin.md` |
| Roles and invitations inside an instance | the separate `amadan.net/rastrillo/idear` module | `skill/data.md` "Roles and teams" |
| A home or hub that creates tenant instances | `provision`, tested with `provisiontest` | `skill/data.md`, `docs/site/reference/provision.md` |
| Tenants under `/<slug>` on one origin (model C) | `basepath` (`Options.BasePath`) | `skill/data.md` |
| A central app with no database | `objrec`; `auth.Config{Records, Pepper, Signed}`, with `Blind` to keep only an address's HMAC; `sessions.Signed` | `skill/signin.md`, `docs/site/reference/objrec.md` |
| Handing a person from one origin to another | `assertion` | `docs/site/reference/assertion.md` |
| Server-blind apps | `crypto`, `keyring`, `vault`, `webauthn`, `passkey` | `docs/site/reference/` |
| Work a person watches, or work on a clock | `jobs`, `background`, `carlos` (the platform's tick) | `skill/background.md` |
| Files | `blobs` (the object store, never disk) | `skill/data.md` |
| An API and agents acting for a person | `api`, `mcp`, `apitoken` | `skill/api.md`, `skill/mcp.md` |
| Live regions | `live` | `skill/live.md` |
| The platform contract | `Resolve` + `Serve`: activation, `/healthz`, `/api/version`, SIGTERM drain, security headers | SKILL.md "App shape" |

Client kits are separate modules, each with its own `SKILL.md`:
`amadan.net/rastrillo/pwa`, `amadan.net/rastrillo/native` and
`amadan.net/rastrillo/aviso` (Web Push). Use each module path verbatim.

## The ten-minute path

```sh
go install amadan.net/rastrillo/rastrillo/cmd/rastrillo@latest
rastrillo new --auth=magic myapp && cd myapp && go mod tidy && go test ./...
make ci        # the gate
```

Leave out `--auth=magic` only for an app nobody signs in to. The scaffold
compiles, passes and serves before you write a line, so never hand-write
any of it; its `AGENTS.md` says where each piece is. Its `Makefile`'s
**`ci` target is the gate**, on a Go release pinned by `GOTOOLCHAIN`:
vet, gofmt, staticcheck, govulncheck, gitleaks, the size and code budgets
(`make code`), `make routes`, the tests and timings, `perf`, `migration
check` and `generate --check`. After editing templates, run `rastrillo
generate` and commit `rastrillo_templates_gen.go`; `generate --check`
fails until you do (`skill/tooling.md`). `--theme` and `--shell` pick the
look, and both land as app-owned files. `CGO_ENABLED=0` throughout: a
cgo SQLite driver sneaking in is a bug.

## The rules that keep the app safe

Tenancy is the platform's, not the schema's: a CARLOS app instance serves
one team, and a product with many teams gives each its own instance.
Isolation is a process and a file, never a `WHERE` clause; owner scoping
separates the users *within* one instance. SKILL.md carries the rest
(owner scoping, mass assignment, sessions, migrations) and its checklist
before calling an app done.

## Screens and design

Before the first screen, ask the operator how polished the app should be
and for its personality, as Rastrillo's `skill/screens.md` "Before the
first screen" says: the design system is the base the operator's
personality goes on, not the finished look. Then build with
`skill/design.md` (the `rst-` vocabulary, tokens, themes, the thin app
stylesheet) and `skill/partials.md`. An explicit design brief or an
existing app's design system can justify another foundation; name that
choice rather than silently replacing the default.

JavaScript: build each screen from links and forms, then enhance it with
small vanilla scripts as freely as the product needs, ES modules, an
import map under a CSP hash, and esbuild through `go run` when the graph
outgrows that (`skill/scripts.md`).

Apps that already use manifests are covered by Rastrillo's
`skill/tooling.md`; don't start new work on them.

## Learn from

1. Rastrillo's topic index in SKILL.md, one topic per piece of work.
2. The chat tour, `tour/chat` in the repository (rastrillo.org/tour): a
   signed-in app built step by step from `rastrillo new --auth=magic`.
3. `examples/notes` in the repository (not in the published module):
   read it only for what the topics do not cover.

## Not built yet

SAML sign-in and `rastrillo new --model home|hub` do not exist. Check the
CHANGELOG's Unreleased section for anything newer, wait for a release and
its upgrade steps, and never build against main.

## Releasing

`make release` builds the binary for the target (linux/arm64 unless you
set `RELEASE_GOARCH`), stamps `git describe` into `rastrillo.BuildVersion`
so `/api/version` names the build, refuses a dirty tree, and prints the
`carlos ship` line to run. Check the target host's architecture before
you ship.

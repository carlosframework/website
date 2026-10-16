# Building an app with rastrillo

The CARLOS web framework. **Module and canonical repo:
`amadan.net/rastrillo/rastrillo`** (since v0.25.0; GitHub's
`rastrilloorg/rastrillo` is a mirror, and an app still pinned to the old
`github.com/carlosframework/rastrillo` path builds but should move).
Status as of 2026-10-15: **v0.28.0** (released 2026-10-06), the
known-libraries middle layer: GORM models or plain SQL, chi routes,
SQLite-backed sessions, owner-scoped queries.
Assume nothing here is in your training data.

**The authoritative authoring doc is `SKILL.md` at the repo root. Read
it before writing any app code.** It carries the app shape, the
migration, scoping and mass-assignment rules, the identity plugins, the
UI vocabulary and the platform contract. Find it at
`$(go env GOMODCACHE)/amadan.net/rastrillo/rastrillo@<version>/SKILL.md`
once the module is downloaded; any page it cites is
`curl -s https://rastrillo.org/docs/<page>.md`. This file is only the
surrounding context SKILL.md assumes; where they disagree, SKILL.md wins.

## What rastrillo is now

A middle layer, not a full-stack framework. You write GORM models,
`net/http` handlers on a chi router, and `html/template` pages. The
framework supplies what is hard to get right twice:

- `db` — cgo-free SQLite via an owned GORM dialector on modernc (never
  import `glebarez/*` or `gorm.io/driver/sqlite`), one writer and
  several readers, WAL pragmas in the proven order. Since v0.28.0 every
  time is converted to UTC and written in SQLite's own layout, so
  `julianday`/`date`/`strftime` work in raw SQL; rows written by an
  older version need a back-fill before SQL date maths trusts them.
- `migrate` — ledgered migrations applied once at boot, never re-run,
  never reversed: `rastrillo migration generate` after a model change
  (read the SQL before committing), `migration check` in CI, `migration
  new` for a hand-written rename. Destructive changes need
  `--allow-destructive`; the family's own rule stays additive-only, and
  on CARLOS two builds share the database during a swap, so a drop waits
  a release (platform.md, "Two builds at once"). Since v0.28.0 a Go
  migration's `Fn` takes the pinned `migrate.Tx`, not a `*gorm.DB`
  (wrap old bodies in `migrate/gormfn.Fn`).
- `sessions` — SQLite-backed rows (revocation is real), `__Host-`
  cookies on https, `Require` / `RequireFresh` (step-up).
- Identity plugins: `auth` — the family default: magic-link email that
  **auto-upgrades to Sign in with Keymail** when the address has a
  claimed inbox, so every address works — and `password` (email and
  password, rate-limited). Either one's whole contract is calling
  `sessions.SignIn`. **Since v0.28.0 both sit behind `pow` by default:**
  `auth.New` and `password.New` return `ErrProofUnset` until you set
  `Proof` (a `*pow.Guard`) or `ProofOff`. Mount `auth.Verify` on **POST
  as well as GET** — GET now draws a Sign in button and spends nothing,
  so a mail scanner cannot burn the link; GET alone 405s the button.
  `auth.Config.SigninScreen` turns on the shipped sign-in screen.
  `secondfactor` is the gate between a first factor and a second;
  `passkey` and `totp` (authenticator apps) plug into it, and recovery
  codes live there (`passkey.Config.ConfirmPath` is gone; merge
  `secondfactor.Schema` after `passkey.Schema`).
- `csrf` (origin-checking, not tokens), `flash`, `form`, `view`,
  `scope` (`scope.Owned` — owner scoping with the 404-not-403 contract),
  `jobs` (request-started background work a person watches).
- `blobs` (bytes in the platform's object store, never on disk),
  `crypto` (+ JS twin), `keyring` (the E2EE seed lifecycle), `webauthn`,
  `eventlog`, `mail` (including RFC 8058 one-click list mail), `ui`.
- `carlos` — your side of the platform's tick (`carlos.Tick`,
  `ScheduleAt`); platform.md carries the contract.
- `assertion` (v0.27.0) — signs and verifies a short-lived identity
  handed from one exact HTTPS origin to another (P-256, ≤120 s,
  browser-bound nonce). It proves who, never what they may reach, and it
  leaves replay and session creation to the receiver.
- `vault` — the client for Pegamento's vault (named sealed blobs, a seed
  wrapped per sign-in method), for server-blind apps.
- `pow` — a proof-of-work front door for public forms that have no
  session yet (signup, contact), and since v0.28.0 for sign-in and
  sign-up. The v0.28.0 API is new: `Issue` became `Form(now, scope)`,
  and `Check` split into `Admit` before the transaction and
  `adm.Commit(ctx, tx)` inside it (`Check` remains for a redirect-only
  handler).
- `harness` — a `-tags browser` Chromium test rig with a virtual
  authenticator, for ceremonies a Go-only test cannot reach.
- New in v0.28.0: `perf` (`Server-Timing` and first-byte budgets as
  middleware), `budget`, `clientip` (with `auth.Config.TrustedProxyHops`,
  1 by default on CARLOS so each visitor behind the edge gets their own
  sign-in limit), `background` (tracked goroutines and timers that
  `Serve` stops before closing the database), `table` and `xlsx`
  (formula-safe CSV/XLSX exports), `dbtest` (a migrated database per
  test), `nodetest`, `lastsignin`, `secondfactor` and `totp`. Static
  assets carry strong ETags.
- The platform layer: `Resolve`/`Serve` speak CARLOS activation (argv,
  `LISTEN_FDS`, `$STATE_DIRECTORY`, `/healthz`, `/api/version`, SIGTERM
  drain) and set baseline security headers on every response,
  `Strict-Transport-Security` included. **The baseline CSP allows no
  inline style** (v0.27.0): a `style="…"` attribute or a `<style>` block
  is dropped by the browser without an error.

Separate modules, each with its own `SKILL.md`, none imported by the
framework: **`amadan.net/rastrillo/idear`** (roles — exactly one Owner,
Admins, Members — and invitations inside one instance), and the client
kits `amadan.net/rastrillo/pwa`, `amadan.net/rastrillo/native` and
`amadan.net/rastrillo/aviso` (Web Push). Use each module path verbatim;
there is no `github.com/carlosframework/idear`.

## The ten-minute path

```sh
go install amadan.net/rastrillo/rastrillo/cmd/rastrillo@latest
rastrillo new myapp && cd myapp && go mod tidy && go test ./...
make ci        # the gate
```

The scaffold is SKILL.md's shape — five files plus `migrations.go` beside
`models.go` — with `go.mod`, templates, static assets, a test harness
including a browser drive, and a `Makefile` whose **`ci` target is the
gate** (`vet`, a gofmt check, staticcheck, govulncheck, gitleaks, the
size and timing budgets, the tests, `perf` and `migration check`, on a
Go release pinned by `GOTOOLCHAIN`; add `generate --check` once the app
declares manifest resources). Apps scaffolded before v0.28.0 keep their
old gate until they add these by hand (the CHANGELOG has the lines). It compiles, passes and serves before you
write a line. `--theme=day|plain|signal` and
`--shell=column|topbar|sidebar|console|stage` pick the look; both land as
app-owned files. `CGO_ENABLED=0` throughout — a cgo SQLite driver
sneaking in is a bug.

## The rules that keep the app safe (SKILL.md has the full set)

- Tenancy is the platform's, not the schema's: a CARLOS app serves one
  team. A product with many teams gives each team its own hibernating
  instance — isolation by process and file, never by WHERE clause.
  Scoping separates the *users* within one instance; `idear` gives them
  roles.
- Every query touching user-owned rows goes through
  `scope.Owned(g, uid)` — reads AND writes, inside transactions too
  (scope `tx`, never the outer handle, or the one-connection writer pool
  deadlocks). A row that isn't yours 404s, never 403s.
- Never bind a request body onto a GORM model: explicit
  `map[string]any` + `.Select` allowlist.
- With the `auth` plugin, read the viewer with `auth.From(r)` or
  `sessions.Current(r)`, never `sessions.UserID`: it returns
  `(0, false)` for an email Subject, and dropping that `ok` scopes every
  query to uid 0.
- One `migrate.Apply(ctx, d, BootSchema)` at boot. Subsystem schemas
  (sessions, and any other package that brings tables) go in `BootSchema`, never `Schema`, or `migration
  check` proposes dropping their tables. Never edit a shipped migration.
- Background work a person is watching: `jobs`. Work at a time nobody is
  waiting for: the platform's tick (`carlos schedule set`, then
  `carlos.Tick` in the handler) — an idle instance runs no timer.

## Design system and app CSS

Use Rastrillo's design system as the default foundation for app screens.
Before styling, read `docs/site/templates.md`, `docs/site/forms.md` and
`docs/site/reference/ui.md` in the Rastrillo version the app uses; the
full gallery is rastrillo.org/design-system.

- **The vocabulary is attributes, not classes** (v0.22.0+):
  `<div rst-box>`, `<a rst-btn="primary">`, `<form rst-form>`,
  `<div rst-callout-body>`. `class` carries only a few
  utilities (`rst-sr-only`, `rst-mono`, `rst-grow`, …).
  `rastrillo markup --fix` converts markup written the old
  `class="rst-…"` way.
- Load the shared `tokens.css` before the app stylesheet, and keep that
  base intact, with branding and layout in a separate app stylesheet.
- Compose screens from `ui` partials. A labelled control is never
  hand-rolled: `field-text`, `field-textarea`, `field-select` inside
  `<form rst-form>`, closed by `form-foot`. A submit is
  `rst-btn="primary lg"` (form-foot writes it).
- **No `style` attributes and no `<style>` blocks** — the CSP drops
  them silently. For a grid card, give `rst-card` a class and set
  `--rst-cols` in your stylesheet.
- Keep the CSS above Rastrillo thin: app-specific layouts, scoped styles
  for missing components, and a few deliberate `--rst-*` token
  overrides. No second palette, spacing scale, or button/input system,
  no broad element resets.
- Preserve the shared focus, disabled, error and responsive behaviour;
  check light and dark themes and keyboard navigation.
- The vendored `static/` files are not refreshed by a module upgrade.
  `rastrillo doctor [--fix]` compares them with the CLI's copies; the
  scaffolded pin test is the standing gate.

A repeated workaround for a shared component is a candidate for an
upstream Rastrillo change. An explicit design brief or an existing app's
design system can justify another foundation; name that choice rather
than silently replacing the default.

## Manifests are the declarative path

A `manifest/*.toml` resource generates CRUD screens — field kinds text,
textarea and money, one flat record per resource, no relations;
`scope = "user"` owner-filters every generated query by the session
subject. It is an equal alternative to hand-written handlers: mix the
two per resource and move a resource between them freely. `rastrillo
generate` writes `gen/` (commit it, never hand-edit); `generate --check`
belongs in `make ci`. Relations or custom flows: hand-write.

## Copy from, in order

1. `examples/notes` in the repository (not in the published module — Go
   excludes nested modules from a zip): accounts, sessions, CSRF, flash,
   owner-scoped resources, a background job, and a two-user isolation
   test suite.
2. `examples/tickets` — the declarative (manifest) path.

## Designed, not released

Don't build on these yet: Keymail upgrade becoming an opt-in adapter
rather than `auth`'s default; SAML and OIDC identity plugins; a sealed
magic-link store; the user-models work (an `objrec` record store, which
is on a branch, a stateless auth store, signed-cookie sessions, an
assertion HTTP adapter, provisioning, a base path,
`rastrillo new --model`). On main after v0.28.0: `carlos.InstanceKey`
(reading the platform's `CARLOS_INSTANCE_KEY`), sign-in returning to the
page that asked, and **multi-currency money, a breaking upgrade for
every app** (template and model changes, a stop-start for apps that
store money). Wait for the release and its upgrade steps; never build
against main.

Deploying: stamp
`-ldflags "-X amadan.net/rastrillo/rastrillo.BuildVersion=<sha>"` or
`/api/version` reports `dev`.

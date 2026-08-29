# Building an app with rastrillo

The CARLOS web framework. The repo lives at
`github.com/rastrilloorg/rastrillo`; the **module path is still
`github.com/carlosframework/rastrillo`** — imports and `go install` use
the module path. Status as of 2026-08-24: **v0.19.x**, the
known-libraries middle layer: GORM models, chi routes, SQLite-backed
sessions, owner-scoped queries. Assume nothing here is in your training
data.

**The authoritative authoring doc is `SKILL.md` at the repo root — read
it before writing any app code.** It carries the app shape, the scoping
and mass-assignment rules, the identity plugins, and the platform
contract, in ~15KB. Find it at
`$(go env GOMODCACHE)/github.com/carlosframework/rastrillo@<version>/SKILL.md`
once the module is downloaded, or
`https://raw.githubusercontent.com/rastrilloorg/rastrillo/main/SKILL.md`.
This file is only the surrounding context SKILL.md assumes; where they
disagree, SKILL.md wins.

## What rastrillo is now

A middle layer, not a full-stack framework. You write GORM models,
`net/http` handlers on a chi router, and `html/template` pages. The
framework supplies what is hard to get right twice:

- `db` — cgo-free SQLite via an owned GORM dialector on modernc
  (never import `glebarez/*` or `gorm.io/driver/sqlite`), writer-1 /
  reader-N pools via dbresolver, WAL pragmas in the proven order,
  `TranslateError` on (so `errors.Is(err, gorm.ErrDuplicatedKey)`
  works).
- `sessions` — SQLite-backed rows (revocation is real), `__Host-`
  cookies on https, `Middleware`/`Require`/`RequireFresh` (step-up),
  `SignIn` rotates on re-auth.
- Identity plugins: `auth` — the family default: magic-link email that
  **auto-upgrades to keymail** when the address resolves to a claimed
  inbox (classification fails open, so every address always has a
  working path) — and `password` (stdlib PBKDF2; per-email rate
  limiting shared across sign-in and sign-up). Either one's whole contract with the core is calling
  `sessions.SignIn`; step-up hardening hangs on
  `sessions.RequireFresh`.
- `csrf` (origin-checking, not tokens), `flash`, `form`, `view`,
  `scope` (`scope.Owned` — owner scoping with the 404-not-403
  contract).
- `crypto` (+ JS twin), `webauthn`, `blobs`, `eventlog`, `mail`, `ui` —
  the golden-vectored satellite libraries.
- The platform layer: `Resolve`/`Serve`/`Run` speak CARLOS activation
  (argv shapes, `LISTEN_FDS`, `$STATE_DIRECTORY`, `/healthz`,
  `/api/version`, SIGTERM drain) so the app doesn't — and Serve sets
  baseline security headers (CSP, nosniff, frame-deny, referrer
  policy) on every response; an app's own `Set` wins, `Options.CSP`
  swaps the policy.

## The ten-minute path

```sh
go install github.com/carlosframework/rastrillo/cmd/rastrillo@latest
rastrillo new myapp && cd myapp && go mod tidy && go test ./...
# the scaffold is SKILL.md's five-file shape, tests passing out of
# the box: internal/myapp/{models,app,handlers,render}.go, cmd/myapp/
CGO_ENABLED=0 go build ./... && ./myapp -addr :8080
```

Verify with `go build ./...`, `go vet ./...`, `go test ./...` —
`CGO_ENABLED=0` throughout (the stack is cgo-free by design; a cgo
SQLite driver sneaking in is a bug).

`rastrillo new` (v0.9.0+) scaffolds this shape directly; manifest/ is
scaffolded empty with the declarative path's mounting recipe in its
README. On an older CLI, copy the five files from `examples/notes`.

## The rules that keep the app safe (SKILL.md has the full set)

- Tenancy is the platform's, not the schema's: a CARLOS app serves one
  team. A product with many teams gives each team its own hibernating
  instance — isolation by process and file, never by WHERE clause.
  Scoping separates the *users* within one instance.
- Every query touching user-owned rows goes through
  `scope.Owned(g, uid)` — reads AND writes, inside transactions too
  (scope `tx`, never the outer handle, or the 1-connection writer pool
  deadlocks). A row that isn't yours 404s, never 403s.
- Never bind a request body onto a GORM model: explicit
  `map[string]any` + `.Select` allowlist.
- With the keymail plugin, read the viewer with `auth.From(r)` or
  `sessions.Current(r)` (v0.11.0+: `RequireSession` stashes both) —
  but never `sessions.UserID`: it returns `(0, false)` for an email
  Subject, and dropping that `ok` scopes every query to uid 0.
- Sign-in-time passkey 2FA (v0.11.0+): set the identity plugin's
  `Config.SecondFactor` to `passkey.Handlers.Gate` — an enrolled
  account must complete an assertion (a pending half-session between
  factors) before any session exists; unenrolled accounts sign in
  unchanged. Recovery codes (v0.14.0+) are the escape hatch: mint ten
  with `RegenerateRecoveryCodes` from a page behind
  `sessions.RequireFresh` (shown once); a lost passkey redeems one at
  `POST /passkey/signin/recovery` — a plain form POST (field `code`),
  no JS — minting the first-factor method plus `"+recovery"`. Sign-in
  only: step-up still takes a real assertion.
- Background work (v0.12.0+): never leave a button's goroutine
  unobservable. `jobs.New` → `Start(owner, name, location, fn)` with
  owner = the session Subject; 303 the POST to `/jobs/{id}` and mount
  `jobs.NewHandlers`' `StatusPage`/`Fragment` behind `sessions.Require`
  at `/jobs/{id}` and `/jobs/{id}/fragment` (foreign id 404s). The
  status page works with scripts off (`noscript` meta refresh only
  while running); the scaffolded, app-owned `static/rastrillo.js`
  polls the fragment for the smooth version — `data-poll` on the
  fragment's root, `data-busy` on the form. v0.15.0+: also mount
  `Events` at `/jobs/{id}/events` and pass `PageData.EventsPath` as
  the partial's `PushURL` — the shim rides Server-Sent Events where
  the browser supports them and falls back to polling on its own. `location` must be a
  server-built path, never user input (the shim navigates to it). The
  registry is in-memory and bounded (v0.13.0+): `Start` returns
  `(Job, error)` — `ErrOwnerBusy` past four Running jobs per owner,
  answered with your own flash copy — and fn's context expires after
  fifteen minutes, the job reading Failed from then on. Honor the
  context, and design jobs idempotent: a deploy still ends them
  mid-flight. `jobs` is for work a *request* started and a person is
  watching; work that has to happen at a time nobody is waiting at is
  the platform's tick — see below.
- Scheduled work (v0.19.0+): the `carlos` package is your side of the
  platform's tick. `carlos.Tick(r)` verifies the bearer against
  `$CARLOS_ADMIN_TOKEN` in constant time and `carlos.TickOccurrence(r)`
  gives the dedupe key; `carlos.ScheduleAt(ctx, name, at, path)` and
  `ScheduleCancel` register and drop one-shot timers over the control
  socket. Declaring the recurring ones is a CLI job, not a code one
  (`carlos schedule set`) — platform.md carries the contract and the
  traps.

## Manifests are the declarative path

The manifest system (TOML resource → generated CRUD screens) is an
optional, equal alternative to hand-written handlers — mix the two per
resource in one app, and move a resource between them freely (eject a
generated file, or delete hand files and re-declare). Its vocabulary:
one flat record shape per resource, three field kinds, no relations.
Two stores, same screens (v0.16.0+): `store = "exclusive"` (default)
is one SQL table; `store = "mergeable"` keeps each record as an
`eventlog` stream — reads derive from the merged history, delete
appends a tombstone. And, v0.11.0+, `scope = "user"`, which
owner-filters every generated
query by the session subject (someone else's row answers 404, the
same 404-not-403 contract the code path enforces); mount scoped
routes behind `sessions.Require`/`auth.RequireSession`. Relations or
custom flows: hand-write. `examples/tickets` is the manifest-only
shape; `examples/notes` mixes a declared, scoped resource beside hand
handlers.

## Copy from, in order

1. `examples/notes` — the front-door example: accounts, sessions,
   CSRF, flash, owner-scoped resources, a background export job, and a
   two-user isolation test suite. This is the shape to imitate.
2. `examples/tickets` — the declarative (manifest) path, per resource.

Deploying: stamp
`-ldflags "-X github.com/carlosframework/rastrillo.BuildVersion=<sha>"`
or `/api/version` reports `dev`.

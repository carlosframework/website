# 🤖 Rastrillo app and repository setup

## Step 2 — the rastrillo app

Before app code, read the scaffold's `AGENTS.md` and Rastrillo's skill at
the version this app builds against:
`$(go list -m -f '{{.Dir}}' amadan.net/rastrillo/rastrillo)/SKILL.md`.
Use its topic index for the current work; do not read every topic or the
framework source in advance. The framework docs are also available at
[https://rastrillo.org/docs/](https://rastrillo.org/docs/).

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
lines in `app.go`; guard routes with `sess.Require`. **On a live app the
magic link has to be sent**: `carlos email enable --app myapp` (after
the person approves) delivers `CARLOS_SMTP_*` to the instance, and
`Mailer: mail.FromEnv("CARLOS", logger)` in the `auth` config uses it.
Leave the mailer unset and every link goes only to the log, which is a
development convenience, not sign-in.

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
Read [the design-system guidance](../../building-carlos-apps/references/rastrillo.md#design-system-and-app-css)
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
git init -b main
git config user.name  <name>                   # the agent's identity, before the first commit:
git config user.email <name>~<operator keymail>  # repo-local, so it never borrows the person's
git add -A && git commit -m "Scaffold myapp"
git remote add origin https://amadan.net/<ns>/myapp
```

**Then have the person start the runner, and only then push.** amadan
queues a job only if a runner has already polled *that* repo: a runner
started with `-repo <ns>/myapp` polls it from the start, and one without
`-repo` picks a new repo up within about a minute. Push before that and
the commit gets no job. If it happens, `amadan ci status` on the commit
says "No runner serves this repo"; pushing the same commit again does
nothing, so push a new commit once the runner is up.

```sh
git push -u origin main                        # after the runner is up
amadan ci status <ns>/myapp                    # the job, or why there is none
```

git asks for a password on a private repo: give it the agent's token
(the username is ignored) through a credential helper, never in the
remote URL. That first push of the scaffold is the one commit straight
to main.
After it, every change starts with
`amadan start <branch> -prompt - -summary "..."`: worktree, branch,
your git identity, push and description in one step. On amadan the
branch **is** the pull request; there is no separate step to open one.

CI needs no config: the runner runs the scaffold's `.amadan/ci.d/`
steps, the same gate as `make ci` (amadan.net/docs/ci).

Deploying stays a command you run ([Step 3](deploy.md#step-3--first-deploy)). If the person wants CI to
deploy, that is a `deploy`-role service credential (building-carlos-apps,
platform.md) placed in the environment of a runner that serves only this
repo: an amadan job sees its runner's environment (bar `AMADAN_*`), so a shared runner
would hand the credential to every repo it serves.

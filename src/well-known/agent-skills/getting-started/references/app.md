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
rastrillo new --auth=magic myapp && cd myapp && go mod tidy && go test ./...
```

`--auth=magic` gives the app sign-in by emailed link from its first
commit: proof of work in front of it, a sign-in screen, rows owned by
the signed-in address, and tests that sign in for you. Leave it out only
for an app nobody signs in to. The scaffold compiles, passes its tests
and serves before you write a line, so never hand-write any of it; its
`AGENTS.md` says where each piece is.

The gate, before every commit, is the scaffold's own `Makefile`:

```sh
make ci        # vet, gofmt, staticcheck, govulncheck, gitleaks, budgets, routes, tests, perf, migration and generate checks
```

After changing a model, run `rastrillo migration generate` and read the
SQL before committing; never edit a shipped migration. After editing
templates, run `rastrillo generate` and commit
`rastrillo_templates_gen.go`, or `make ci` fails.

Tenancy is an instance, never a `WHERE` clause: a product with many
customers gives each its own instance, and owner scoping separates the
people within one. The rest of the safety rules are in SKILL.md, with
the checklist to run before calling the app done. Owned pages sit
behind `app.auth.RequireSession`.

**On a live app the magic link has to be sent.** The scaffold builds its
mailer from `MYAPP_SMTP_HOST`, `MYAPP_SMTP_FROM` and the rest
(`mail.FromEnv("MYAPP", logger)` in `cmd/myapp/main.go`); until they are
set, every link goes only to the log, which is a development
convenience, not sign-in. On a CARLOS platform,
`carlos email enable --app myapp --env-prefix MYAPP_SMTP` (after the
person approves) delivers exactly those names. On another host, set them
from the person's SMTP provider.

`rastrillo.Resolve` + `Serve` speak the platform's process contract —
your binary accepts `--socket <path> --db <path>` and serves
`GET /healthz` and `GET /api/version`. **There is no `$PORT`**;
on the platform, instances listen on unix sockets it hands them, and
elsewhere `-addr host:port` serves on an address you choose. Do not
hand-roll flag parsing.

Before the first screen, ask the person how polished the app should be
and for its personality (Rastrillo's `skill/screens.md`, "Before the
first screen"): the design system is the base their personality goes
on, not the finished look. Then follow `skill/design.md` for the screens
and stylesheet. Build each screen from links and forms, and enhance it
with small scripts as freely as the product needs (`skill/scripts.md`).

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

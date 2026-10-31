# 🤖 Platform responsibilities and concepts

Read only when the current task requires a platform concept; do not load this as first-build background.

## What the platform owns (never hand-roll these)

- **Routing and TLS** — the edge is the only process on :443; the route
  table doubles as the ACME allowlist; per-host certs auto-obtained and
  renewed, including customer domains and (via ACME delegation) wildcards.
- **Replication** — Litestream on every instance database, run by the
  platform's host agent; restore drills are the platform's job too. A
  hibernating route's rung is tunable (`stream` — the default, about once
  a second — / `batched`, five minutes / `daily`), a loss-window trade an
  operator makes on a large, rarely-written database.
- **Hibernation** — provisioned instances doze when idle and wake on
  request; live and default-on, not a future feature. Cents-per-month
  idle cost is the platform's economic story.
- **Process supervision and restarts** — instances are converged from
  bucket records; `carlos restart` cycles them in seconds, console-side.
- **Config delivery** — `carlos env` / `carlos secrets` writes converge
  onto boxes within seconds (a serial bump, 2s poll). No ssh-delivered
  EnvironmentFiles.
- **Deploy verification** — `carlos deploy` follows the rollout box by
  box where boxes report it (they do on Carloku), and otherwise watches
  the URL: the app's build probe if it declares one
  (`carlos apps build-probe`), else the `X-Carlos-Version` header, which
  the edge stamps from the route row the moment adoption lands, whether
  or not the process has restarted yet.
- **Outbound email** — the platform mints a sending identity on a domain,
  publishes DKIM/SPF/DMARC where it controls the zone, and delivers working
  SMTP credentials as config. Apps never hold an AWS key and nobody runs an
  MTA. See [email](email.md) when needed.
- **Scheduled work** — the platform keeps the clock: a declared schedule
  POSTs a tick to a path in your app at the time it is due, waking a
  hibernating instance to run it. No in-app scheduler, no cron line on a
  box. See [schedules](schedule.md) when needed.
- **Errors, availability and analytics** — the edge and the log stream
  feed all three, with no SDK, no JavaScript, no cookie and no stored IP.
  Errors and availability collect from the day an app ships; analytics is
  opt-in. See [observability](observe.md) when needed.
- **Password gate** — `carlos gate` puts one shared password in front of
  an app's hostnames, enforced at the edge ahead of the cache and the
  activator, so the app behind it never sees the cookie. A curtain over a
  hostname, not accounts for the app's own users.
- **DNS steering** — `carlos steering ... latency` opts a host into a
  latency record per armed edge so the nearest one answers. A static site
  on a platform hostname is steered from creation without asking; a
  custom domain is not, because its DNS is yours.


## Concepts

- **Account** — the tenancy unit. Public short id (**sqid**, e.g. three
  letters) appears in default hostnames; it is not a secret. Roles are
  owner/member. `carlos auth whoami` shows yours.
- **App** — named per account (not globally). Claimed with
  `carlos apps create`; deleted apps sit in a 30-day trash.
- **Release** — immutable, content-addressed, produced by the ship half
  of `carlos deploy` (or by `carlos ship` on its own).
  Kinds: `binary` (default) and `static`. Versions are free-form; git
  short sha is the house convention.
- **Channels and pipelines** (release pipelines v2, live 2026-08-22) —
  **a new app is born with one channel, named `edge` by default**
  (renameable at creation): that is its production, and `carlos deploy`
  lands on it. Multi-channel ceremony is opt-in: a console-mediated
  **pipeline** declares an ordered channel list (names are app-defined;
  promotion onto channel N must come from N−1; the first is the entry
  channel) with per-channel, default-permissive policy — `bake`
  duration, `passkey` step-up, `promote_approvals`, and
  `change_approvals` (which also guards editing/removing the channel
  and fast-tracking through its bake). `canary/<slug>` stays a reserved
  platform namespace outside any pipeline: always allowed, zero bake,
  per-session dead ends. Apps with no pipeline keep the legacy frozen
  ladder (`edge → beta → stable`, holds 0/24h/72h, unconditional
  passkey on stable — reaching stable cuts a semver tag). `--hotfix`, the
  bake bypass, is an operator act on the direct-bucket path only: the
  console refuses it by name, so a member never has it. Box-side, bake
  changes **ratchet**: a shorter window is honoured only after the previously-known window has elapsed
  once on the box's own clock, so a compromised console session cannot
  collapse a hold and ship in the same hour.
- **Production flag** — legacy: superseded by per-channel pipeline rules
  for pipelined apps, still honoured by legacy boxes/apps. Its sharp
  edge is recorded: a stable promote plus the console's default-checked
  safety delay once left a hibernating app unwakeable for days —
  ceremony belongs on channels you chose, not on defaults.
- **Instance** — one account's running process for an app on a host.
  Declared console-side (`carlos instances enable` once per app, then
  `instances create --host …`); a box reconciler mints the actual route.
  Exec-backed and hibernating by default. The process contract is
  `<bin> --socket <path> --db <path>` on a unix socket — there is no
  `$PORT` — and every instance serves `GET /healthz` and
  `GET /api/version`. Every exec child is handed `CARLOS_HOST`, its
  hostname exactly as `carlos instances list` shows it — **read it, never
  the socket's file name**, which says nothing about the host on an
  isolated box — and `CARLOS_REGION`, the placement code of the box it
  runs on (`ie`, `au`, …), so an app that wants to know where it is can
  read it rather than guess. Since v0.26.0 the platform also writes a
  `CARLOS_INSTANCE_KEY` into the instance's own env before its first
  start: a per-instance secret key for sealing the instance's own data.
  It is not an API token and opens no platform door. On a box that has
  isolated its instances (v0.25.0), each instance runs in a box of its
  own: its own directory and namespaces, seeing only its own app's build,
  under a memory ceiling set from the staged manifest plus CPU and IO
  limits, and
  with **no access to loopback or private addresses on the box** except
  its DNS resolver — so an app cannot reach a sibling over `127.0.0.1`,
  and one that grows past its tier is OOM-killed and restarted rather
  than allowed to take the box's other tenants with it. On such a box the
  working directory is the instance's data directory, the one its
  database is in, so a relative path like `./data/blobs` lands beside
  the database. **A static site has no
  instance** — the edge serves it off the channel pointer, and giving one
  an instance produces a route that can never wake ([static deployment](release.md#deploying-a-static-site)).
- **Config environments (bundles)** — `carlos env` / `carlos secrets`
  write the app's **default** bundle; `--environment <name>` writes a
  named one, layered on top of the default when config is materialized.
  A route is *bound* to a bundle, and on a provisioned route that binding
  lives in the instance record: `carlos instances create --environment`
  at birth, `carlos instances set-environment` afterwards. (The box-local
  `carlos route --environment` is reverted by the reconciler within
  seconds and refuses such a row by name.) `carlos env environments`
  lists an app's bundles, and `carlos restart --environment <name>`
  cycles exactly the routes that read one.
- **Canary** — `carlos canary` stands a second instance beside production
  on a channel and hostname belonging to one branch: `canary/<slug>` and
  `<slug>-<app>.<sqid>.<domain>` (one label since v0.24.0, so slug and
  app together are at most 63 characters), the slug defaulting to the git
  branch. Promotion into a canary is never refused and costs no rung — canary
  channels sit outside every pipeline, so a build that has ridden one
  still enters the pipeline fresh. Seven-day lease, refreshed on every
  re-promote. It is a URL, not a traffic split.
- **Service credential** — a bearer token a *server* holds rather than a
  person: a CI job that ships, a signup flow that creates an instance per
  customer. `carlos services create --role <r> --app <app> <name>` mints
  one; reach is fixed at mint and bound to one account and (with `--app`)
  one app. Roles differ by operation; `run` and `team` are covered in [runtime](runtime.md). Other roles include: `deploy` (for CI: ships, and promotes
  or rolls back only the rungs named at mint —
  `services create --role deploy --app <app> --rungs canary,edge ci`,
  never `stable`, and only `canary/<name>` channels on an app that
  declares a pipeline; no hotfix, no app creation, so a new app's first deploy
  still needs a person; CI sets `CARLOS_SERVICE_TOKEN` and
  `CARLOS_CONSOLE` and runs `carlos deploy` as usual), `publish` (ship
  releases), `instance` (create, delete, repoint and move the app's
  instances, attach its domains, write its path routes, read its logs,
  errors and analytics), `operate`, and `admin` (which includes minting
  store IAM users — a real handover). No role can run
  `carlos instances enable` or mint another credential. [Provisioning instances](instances.md).
- **Path routes** — one hostname split by its first path segment:
  `example.com/acme` served by one route, `example.com/globex` by another,
  everything else by the hostname's own route. A prefix *points at* an
  existing route and borrows its channel, config, hibernation and billing;
  it defines nothing of its own. [Path routes](instances.md#one-hostname-many-instances).
- **`.carlos/config`** — two layers, global `~/.carlos/config` and
  per-project `./.carlos/config` (committed; nearest wins walking up).
  Holds console, account, app, kind, artifact — the reason zero-argument
  `carlos deploy` works — and optionally named `destinations`, one per
  console or app a checkout deploys to, picked with `-d <name>` on any
  verb that takes `--console` (`carlos config destinations` edits them). Project values are honored only when the file's
  console matches the session's, so a committed config cannot silently
  redirect someone else's credentials.
- **Default addresses** — `<app>.<sqid>.<apps-domain>` (on the hosted
  platform, `oncarlos.com`); canary form `<canary>-<app>.<sqid>.<domain>`.
  Minted **alias** hosts intentionally carry no `X-Carlos-Version` —
  verify on the canonical host.

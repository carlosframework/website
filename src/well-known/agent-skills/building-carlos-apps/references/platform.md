# 🤖 The CARLOS platform, member-side

What `carlosframework/platform` does for an app, and the `carlos` CLI
surface a member drives it with. Everything here works with **zero
infrastructure access** — no SSH, no AWS console, no box commands. That is
a design law, not a convenience: every command is built for a user who has
nothing but the CLI and a browser. If a task seems to need a box, either
you are self-hosting and operating the platform itself, or you have found
a product gap to file — never a workaround to build.

Snapshot date 2026-10-15, describing what Carloku serves: platform
v0.27.3, released 2026-10-14. Verbs are stable, flag details evolve — trust
`carlos <verb> -h` over this file, and remember a CLI can offer a flag the
console you are talking to has switched off or does not have yet
("Switched off, or not released" at the end). The CLI ships for macOS/Linux (brew,
apt, static binaries) and Windows (client-only zip — no self-replace,
`carlos update` defers to a fresh download).

**Flags are written `--flag`.** Single-dash forms still parse and always
will, but as of 2026-08-27 the documented face of every verb is the
double dash, and the aliases are `-a` (`--app`), `-c` (`--console`), `-e`
(`--environment`), `-v` (`--version`). Three flags turn up nearly
everywhere and are not repeated below: `--app`, `--account` (or
`--account-id` when you want a sqid matched as a sqid and nothing else),
and `--console`, which you need only when this terminal is logged in to
more than one deployment.

## Start with `carlos auth whoami`

Before concluding you cannot reach a CARLOS deployment, run it:

```
carlos auth whoami                              # the default console
carlos auth whoami --console https://<console>  # a specific one
```

It prints the identity, the terminal's label, the expiry, and every
account with its sqid — which is also where you find the sqid your app's
hostname needs.

This is first because the obvious check is the misleading one. An agent's
instinct is to `curl` the console and read the answer: the console will
`302` you to a login page every time, because a browser session is not
what the CLI holds. That redirect says nothing about whether you have
access, and reading it as "no access" has already cost one session an
afternoon and ended in a filed issue. **The CLI's credential is the only
thing that answers the question.**

Same for the deployment's identity: a self-hosted console is not
`carloku.com`, and the console origin and the apps domain are different
hostnames (Tito's are `carlos.tito.io` and `platform.tito.io`). If a
project commits a `.carlos/config`, that names the console it belongs to;
otherwise `--console` does.

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
  MTA. See "Sending email" below.
- **Scheduled work** — the platform keeps the clock: a declared schedule
  POSTs a tick to a path in your app at the time it is due, waking a
  hibernating instance to run it. No in-app scheduler, no cron line on a
  box. See "Scheduled work" below.
- **Errors, availability and analytics** — the edge and the log stream
  feed all three, with no SDK, no JavaScript, no cookie and no stored IP.
  Errors and availability collect from the day an app ships; analytics is
  opt-in. See "Watching an app" below.
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
  an instance produces a route that can never wake ("Deploying a static
  site" below).
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
  one app. Roles, narrowest first: `deploy` (for CI: ships, and promotes
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
  `carlos instances enable` or mint another credential. "Provisioning
  instances from your own app" below.
- **Path routes** — one hostname split by its first path segment:
  `example.com/acme` served by one route, `example.com/globex` by another,
  everything else by the hostname's own route. A prefix *points at* an
  existing route and borrows its channel, config, hibernation and billing;
  it defines nothing of its own. "One hostname, many instances" below.
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

## Describe changes in Activity

Agents pass `--message` explicitly for `ship`, `deploy`, `promote`,
`rollback`, `restart`, `instances create`, `instances delete`, `features set`,
`env set`, `env unset`, and `env exec-delivery`.
Use a concise sentence describing the intended change or why it is needed:
`carlos deploy --message "Fix invitation links after an email address changes"`.
The console records the exact action, version, channel, or instance separately;
repeating only a commit hash or "deploy app" adds no useful context. Do not
invent an outcome you have not verified, or include secrets or config values.

Messages are optional, one line, at most 240 Unicode characters. They are
separate from release labels and release notes. Interactive CLI commands ask
for a description by default; an empty answer skips it. Noninteractive commands
do not prompt. `--no-prompt` suppresses the question for a command, and
`"message_prompt": "off"` in `.carlos/config` disables prompts by default.
Agents should still supply `--message` when
prompts are disabled. Explicit `--message` still applies with `--no-prompt` or
config suppression. `deploy` asks once and uses the same description for its
ship and promote steps.

## The member CLI

| Verb | What it does |
|---|---|
| `carlos auth login\|whoami\|logout\|default` | Device-code login (approve in any signed-in browser); identity + memberships; per-project default console |
| `carlos apps create\|list\|place\|set\|build-probe\|delete\|restore` | Claim an app (a name whose platform address is already held is refused, and `tmp-` names are reserved); `list` every app, the Trash included; place it on a customer fleet; `set --swap overlap\|hold` and `--swap-concurrency` choose how its instances take a new build ("Two builds at once"); `build-probe /api/version` makes `deploy` ask the process which build it runs rather than trust the header — worth setting on anything you deploy often; trash/restore |
| `carlos deploy` | **Release new code — reach for this one.** ship + promote + watch until the new build serves; zero-arg with a saved project config, `-d <name>` for a named destination. Follows the rollout box by box and names a box where the build failed. `--channel` to land somewhere other than the entry channel (a canary); `--swap hold` for a release that cannot run beside its predecessor. Also the WHOLE story for a static site: `--kind static --host <h> <dir>` declares the route as well as shipping it ("Deploying a static site") |
| `carlos ship` | The ship half alone: publish a release *without* releasing it (`--kind binary\|static`, `--version`, `--notes`); refuses a Go binary whose main package differs from the app's last release unless you pass `--program-change` (deploy has no such flag: ship, then promote); rate-limited per app (~2/minute — a 429 carries `Retry-After`) |
| `carlos promote` | The promote half alone: move an **already-shipped** version onto a channel — a ladder step or a re-point, not how you release new code. The channel is positional, and optional when the app has only one. `--retry` re-tries a build that failed on some box, once you have fixed what it depended on. (`--hotfix` is refused by the console: an operator's direct-bucket act) |
| `carlos canary` | Deploy onto a branch-only channel + hostname, waiting on the canary URL's own `X-Carlos-Version`; `ls` / `rm`. **Reach for `--environment`** if the app carries config — see "Standing a canary beside production" |
| `carlos rollback` | Point a channel back at an earlier version |
| `carlos pipeline` | Show or shape the app's release channels; `init --template edge-production\|full-ladder` replaces the single default channel with a starter pipeline |
| `carlos channels` / `carlos releases` | What each channel serves / every shipped version; `releases retention` prunes old ones |
| `carlos version target` | The semver family ships auto-increment under |
| `carlos env` / `carlos secrets` | Plain vars / sealed secrets, layered per environment; `env sync` forces convergence; `secrets genkey` mints keypairs locally |
| `carlos instances enable\|create\|list\|delete\|set-upstreams\|set-channel\|set-environment\|set\|update\|retry\|door-key` | Opt an app in (`enable --private-storage` gives every later instance its own environment and bucket); declare/inspect/remove instances; reorder or remove upstreams (**adding** an upstream address is operator-only since v0.25.0); move a route onto another channel or config bundle. `list` shows INSTALLED and SERVING builds and a REASON when they differ; `retry <host>` clears a failed build's hold on one instance; `set <host> --updates manual\|--pin <build>` and `update <host>` steer how one instance takes builds; `create --role replica --region <r>` makes a replica near buyers, holding a one-way copy of the live instance's data (the live instance names allowed regions with `--replicas` at its own create); `door-key` manages keys for the edge-local door, which a box operator must turn on. `--health running\|asleep\|not-responding` narrows a listing, which is usually what you want when something is wrong. For **binaries only** — a static site needs none of these, and `carlos deploy` declares what it does need |
| `carlos restart` | Cycle an app's processes — no version or config change. `--host` narrows to one route, `--environment` to every route reading that bundle (the request that follows a `secrets set`), `--dry-run` prints the set. Sleeping instances are left asleep |
| `carlos routes` | The app's routes through the console: upstream, channel, config environment, replication rung. It reads the console's own box, and says so on a multi-box fleet |
| `carlos steering` | `latency` opts a host into a per-edge latency DNS record; `off` returns it to one static answer. Shared-pool instances only in v1 |
| `carlos features set\|list` | The app's own feature flags — the platform stores and serves them, only the app interprets them. Lands on the instance's next `deployment`-block poll: no restart, no env edit, no box file. `key=` clears |
| `carlos gate set\|list\|clear` | One shared password in front of the app's hostnames, custom domains included. `set` reads stdin when `--password` is absent; changing or clearing signs every visitor out |
| `carlos errors` | One row per distinct error, newest first — `error`-tagged log lines plus the 500s the app itself answered, no wiring at all. `--fp <fingerprint>` expands a group; `--set-level warn` widens what counts |
| `carlos availability` | Every 502, 503 and 504 the edge saw (the instance could not answer), grouped by cause, plus failed wakes and exits; one outage is one row. `--fp` expands a cause to each request. The Availability tab beside Errors |
| `carlos analytics` | Page views, daily visitors, bytes, top pages/referers/events, counted at the edge. `--set-count edge` turns it on; `--range today\|7d\|30d` |
| `carlos logs` | Merged app + platform + edge timeline (`-f` follows, `--grep`, `--since`) — no box access |
| `carlos db pull\|query` | A read-only copy of an instance's database, restored from its replica on your machine; the live one is never touched. `--at <RFC 3339 time>` reads it as it was then (sleeping instances keep seven days of history). `--instance` when the app has several |
| `carlos geo <address>` | What the `X-Carlos-Geo-*` headers would say for any address, with the credit the database requires |
| `carlos sidecars enable\|create\|ls\|wake\|logs\|rm` | A process the platform runs for the app with no socket, hostname or DNS: a bot holding a connection out, a worker. Woken only by its schedule or `wake` |
| `carlos config destinations` | Name the places one checkout deploys to in `.carlos/config`; `-d <name>` picks one |
| `carlos domains attach\|detach\|verify\|list\|paths` | `attach --app <a> '*.<parent>'` (quoted) gives every instance a name `<label>.<parent>` with no per-instance claim; `<parent>` must be attached first and a `*` DNS record must point at the deployment. `verify` finds the TXT record a deployment that requires domain proof asks for. `paths <host>` prints the hostname's published path-route map (written through the API — "One hostname, many instances"). Claim customer hostnames (`--wildcard`, `--catchall`); prints the DNS records to create; certs follow automatically. Since 2026-08-27 the platform orders and renews those certs itself, and `list` joins the fleet's readings sweep, so DNS state, certificate expiry and delegation are readable from the terminal — a certificate the platform has given up on now says so instead of sitting pending forever |
| `carlos store apply\|create\|status\|rotate\|scan` | Object storage. **Once per account, first:** an owner runs `store apply --account <a> --note "<why>"` and a deployment operator approves it — until then `create` has nothing to provision into, and `status` says the account is unapproved or pending. After approval `create` is the whole member workflow (unlimited stores, usage metered); `--environment <e>` gives one config bundle its own bucket and credential; credentials arrive as env; `rotate` is two-phase (`--finish` retires the old key). `scan` is opt-in virus scanning over the bucket's objects (`request`/`status` are yours, `grant`/`revoke`/`sweep`/`enforce` a deployment operator's) — and a scanner cannot read ciphertext, so a client-encrypted store is marked not applicable rather than given a coverage claim |
| `carlos email enable\|status\|test\|domains\|events\|credentials\|rotate` | Declare sending; provision a verified domain (`domains rm` frees one); SMTP credentials arrive as env; `events` shows what became of each message for 30 days, `events push --path` posts them to the app, signed (`pause`/`resume` are a deployment operator's) |
| `carlos relay enable\|status\|disable` | The platform's own STUN/TURN relay for an app's WebRTC calls. `enable` delivers `CARLOS_RELAY` (base64 JSON: per-region ICE URLs, a key, a username suffix) and the app mints a TURN credential per call from the key; `status` shows issue, pickup and per-region health. `enable` refuses, with a sentence, on a deployment that runs no relay. Never run coturn or buy a TURN service |
| `carlos services create\|ls\|rotate\|revoke` | Server-held credentials (`--role deploy\|publish\|instance\|operate\|service\|admin`, `--app` to bind one app, `--rungs` for `deploy`); the secret prints once; `rotate` refuses the old secret on its next call, `revoke` stops the credential outright |
| `carlos schedule ls\|set\|rm\|run` | Declare recurring work per app (`--every 6h` or `--cron "0 8 * * *"` → a `POST` to a path your app serves); `ls` shows next/last per instance; `run` fires one now |
| `carlos ledger append\|publish\|verify` | Open hash-chained per-app ledgers (the transparency machinery) |
| `carlos accounts create\|list\|migrate` | Mint/list accounts; move an app between them. An account is *your* tenancy on the platform — never create one per customer of your app (customers are instances: "Provisioning instances from your own app") |
| `carlos skills` | List the deployment's published agent skills (`/.well-known/agent-skills/index.json`) and fetch one, digest-verified, to stdout |
| `carlos fleets create\|add-box\|rotate-token\|…` | Bring-your-own-boxes fleets that dial the console |
| `carlos update` | Update the CLI binary itself (signature-verified; defers to brew/apt) |
| `carlos vet` | Check a release against the platform contract |

Box-side verbs exist (`edge`, `agent`, `adopt`, `route`, `add`, `ops`,
`bootstrap`) but they are the *operator's* surface for running a platform
deployment — a member never types them, and an agent reaching for them on
a member task has taken a wrong turn.

## Provisioning instances from your own app

A product where every customer gets their own instance creates those
instances itself, at signup, through the same console API the CLI uses.
Nothing here needs a box, and nothing here is a workaround:

1. **A person enables the app once** — `carlos instances enable --app
   <tenant-app>`. This writes the manifest that bounds which domain, pool
   and regions any instance may be created in, and no credential can do
   it. Add `--private-storage` and every instance created afterwards
   gets a config environment named after its host's first label with an
   object store bound to it, provisioned by the ordinary create call (the
   account needs an approved `store apply` first, and nothing is torn
   down when an instance is deleted).
2. **Mint the credential** — `carlos services create --role instance --app
   <tenant-app> signup`. Store it with `carlos secrets set` on the app
   that runs signup, **never on the tenant app itself**: every tenant
   instance would then hold a token able to delete its siblings.
3. **Create on signup** — `POST /api/cli/apps/<account>/<tenant-app>/instances`
   with `Authorization: Bearer <credential>` and a JSON body; `host` is
   required (one DNS label plus the manifest's domain), `region`,
   `channel`, `environment` and `message` (the Activity description) are
   optional. The console writes the
   record and announces it, and a box mints the route within seconds.
4. **Wait for the real thing** before sending the person there: poll
   `https://<host>/api/version` for a 200 (a sub-500 answer is not
   evidence), behind a zero-JS "getting your space ready" page that
   refreshes itself.

Give every label a random suffix (`<slug>-<6 random base32 chars>`, the
label being the host's first DNS segment). That makes a collision with
somebody else's instance a first-call event, so the one retry below can
read its 409 without guessing.

The answers to handle, from the apps that run this:

| Status | Meaning | Do |
|---|---|---|
| `201` | Created | Wait for `/api/version`, then hand off |
| `409` | That host already exists (or a sibling app owns the label) | Never treat it as yours: pick a new label. On a *retry of your own timed-out call*, a 409 means the first call worked |
| `429` | The credential's own rate limit (it is separate from any person's, so a signup burst never starves your promotes) | Show a sentence and a retry; never loop |
| `502` / timeout | The console could not complete the write | Retry once with the **same** host |
| `400` | Bad body, or a host that is not one label plus the manifest's domain | A bug on your side; fail loudly |
| `401` / `404` | Bad credential, or the wrong account or app (every miss is the same 404) | A configuration bug; fail loudly |

Also on the same credential: `GET .../instances` (list), `GET`, `PATCH`
(reorder or remove addrs, set the probe — adding an upstream address is
operator-only since v0.25.0) and `DELETE .../instances/<host>`, and
`POST/PUT .../domains` for customer hostnames. **Deleting an instance
removes its record, never its data** — the parked database and blobs are
left in place on purpose, and the call is idempotent.

**The known gap:** the `instance` role is app-wide. One credential can
create, delete or move *every* instance of the app, not only the ones it
made. That is why it lives on the signup app alone, and why a signup app
compromise must be named in your published trade-offs. A narrower,
create-only credential is a filed platform request — do not build your own
token broker around it.

## One hostname, many instances

Path routes let one hostname — your product's own domain — serve each
customer from their own instance, so `example.com/acme` and
`example.com/globex` are two processes and two databases behind one
address. The hostname's own route keeps everything else (`/`, sign-in,
marketing).

- The hostname must be one the app holds: `carlos domains attach --app
  <hub-app> example.com` first.
- The map is written **whole** through the API, by a person or by the
  hub app's `instance`/`publish` credential:
  `PUT /api/cli/apps/<account>/<hub-app>/domains/example.com/paths` with
  `{"paths": {"acme": "acme.<tenant-domain>", "globex": "globex.<tenant-domain>"}}`.
  Keys are one bare path segment (no slash); values are hostnames of
  existing routes. Publish the full map from your own records every time —
  a lost delta desyncs silently, a whole republish repairs. `{"paths": {}}`
  clears it; a body without the `paths` wrapper is refused, so a typo can
  never wipe the map.
- **Targets must belong to the same account** (they may be another app of
  that account — a hub app pointing at tenant-app instances is the
  intended shape).
- **Targets must live on the same box as the hostname's own route.** A
  target homed elsewhere is silently ignored and its prefix falls through
  to the hostname's route. That caps a path-routed product at one box
  today; cross-box path targets are a filed platform request.
- A write goes live in about five seconds. `carlos domains paths --app
  <hub-app> example.com` prints what was published; `carlos routes`
  shows what the box actually applied.
- The upstream receives the original path (`/acme/...`) unchanged, and the
  target route is what is billed, versioned and woken.
- **One hostname is one browser origin.** Cookies, storage and script
  are shared across every prefix, so every tenant's pages can act on the
  hub's session. That is fine while every tenant runs your app's code; if
  tenants serve HTML their own customers wrote, give each tenant its own
  hostname instead.

## Deploying a static site

A static site is one command, and the command is the same one binaries use:

```
carlos apps create --app mysite
carlos deploy --app mysite --kind static --host mysite.<sqid>.oncarlos.com ./site
```

That ships the directory as an immutable release, promotes it to the app's
entry channel, declares the route, and watches the URL until
`X-Carlos-Version` reports the build. Nothing else is needed — not
`carlos instances enable`, not `carlos instances create`, not a separate
`carlos domains attach`.

`--host` is required on the **first** static deploy and only that one. A
static app has no instance record yet, so there is nothing to resolve the
host from; that deploy writes the record, and afterwards plain `carlos
deploy` resolves host and channel by itself. Give it a custom domain and
the deploy attaches that too, printing the DNS records to publish.

Expect the URL to take up to a minute after `promoted` prints. A static
route trusts its resolved channel pointer for about 60 seconds, so the old
page can outlive the promote by that long — `carlos deploy` already waits
past one such window, and says so while it waits.

### A static site has no instance, and must not be given one

**This is the trap.** The verbs read like the binary recipe — enable an
app for instances, create one, point it at a channel — and every step
succeeds. The result cannot work.

A static site is served by the edge straight off the channel pointer:
there is no process, nothing hibernates, nothing wakes. An **instance** is
a process the platform execs. A static release's manifest carries a site
tarball and no build for any box's architecture, so an instance route on
that channel finds nothing to run and fails every wake, permanently.

Older platform builds reported that failure as *"nothing is promoted for
this instance's channel"* — while `carlos channels` showed the promote
sitting right there. Both statements were true and neither named the
problem, which is the shape of the route, not the state of the channel.
Current builds name it and refuse the create; if you meet the old message,
this is what it means.

The way out, on an app already in that state:

```
carlos instances delete --app mysite --host mysite.<sqid>.oncarlos.com
carlos instances create --app mysite --host mysite.<sqid>.oncarlos.com --kind static --channel <ch>
```

The already-shipped release needs no re-ship — a static route reads the
channel pointer, so the site serves within seconds of the record landing.

### Channels belong to the app, not to the platform

A new app is born with **one** channel, `edge` by default, and that one
channel is its production. More are opt-in, declared by a pipeline, and
named whatever the app calls them.

So do not guess a channel name from the `canary → edge → beta → stable`
ladder in `--help`: that is the frozen legacy ladder an app inherits only
when it declares no pipeline. `carlos channels` lists what this app
actually has and `carlos pipeline` shows the order. `carlos promote
<version>` with no channel resolves it when the app has one, and names the
app's real channels when it has several.

## Standing a canary beside production

Review happens on a deployed canary, never on localhost, and one command
does it:

```
carlos canary --app jam ./jam
```

The name defaults to the slugified git branch, so branch `new-queue`
gives channel `canary/new-queue` and host
`new-queue-jam.<sqid>.oncarlos.com`. An explicit `--name` is validated
rather than quietly repaired, because the same string has to serve as
both a channel segment and part of a hostname label: lowercase letters,
digits, dashes, and at most 63 characters with the app name. `carlos canary ls` shows each canary's host, what it serves,
which config bundle it is bound to and what is left of its seven-day
lease; `rm` deletes the instance record and the host stops being served.
The channel lapses on its own.

**If the app carries config, pass `--environment`.** This is the trap,
and it is worth stating in full because the failure looks like an app
bug. Config in CARLOS is per-app, so a canary with no bundle of its own
serves the app's *default* bundle — where every origin-shaped value names
the app's **main** host. Anything keyed to that single scalar refuses
requests on the canary hostname: the `Origin` header the app compares
against, magic-link and callback URLs, a WebAuthn RP ID, the cookie
`Secure` flag. The result is a canary that serves every GET perfectly and
fails every form submission. Write the bundle first, then bind it:

```
carlos env --app jam --environment jam-canary JAM_ORIGIN=https://new-queue-jam.<sqid>.oncarlos.com
carlos canary --app jam --environment jam-canary ./jam
```

The same applies to any second instance standing beside a live one, not
just a canary — `carlos instances create --environment`, or
`carlos instances set-environment` on a route that already exists,
followed by a restart to pick the values up.

## Watching an app: errors, availability and analytics

All three read from the terminal or the app's dashboard tabs. **Errors
and availability collect from the day the app ships** — nothing to turn
on. **Analytics is off
until you switch it on** (a deliberate ruling, 2026-09-07: counting
visitors is the app's call, not the platform's).

```
carlos errors --app hello --since 24h
carlos availability --app hello --since 24h
carlos analytics --app hello --set-count edge
carlos analytics --app hello --range 7d
```

`carlos errors` needs no wiring at all: it groups `error`-tagged log
lines (or `warn` too, with `--set-level warn`) together with the 500s
the app itself answered, one row per distinct error with a count and a
location. `--fp <fingerprint>` expands one group to its occurrences.

`carlos availability` (since v0.22.0) holds what used to sit in errors:
every 502, 503 and 504 the edge saw, meaning the instance could not
answer, grouped by cause (refused, closed mid-request, timed out, no box
connected, or the app's own 503), with failed wakes and exits beside
them. One outage is one row however many pages it hit; `--fp` expands a
cause to each request and path. A visitor who gives up after five
seconds or more without response headers is filed as an outage, so an
endpoint that holds its headers by design, like a long poll, shows a
standing row there, and that row is expected.

`carlos analytics` counts at the edge as it serves the app: page views,
daily visitors, bytes served, top pages, top referers, named events —
**no JavaScript, no cookie, no stored IP**, which is why an app on CARLOS
has no business reaching for a third-party analytics script. Visitors are
a sketch, so a multi-day total is daily visitors summed rather than a
deduplicated unique count. The switch is per-app or account-wide.
Where the deployment publishes a GeoIP database, page views are counted
by country too.

Neither replaces `carlos logs`, still the merged app + platform + edge
timeline (`-f`, `--grep`, `--since`, `--stream app`, `--host`) with no
box access.

## Sending email

The platform issues SMTP credentials. An app declares that it sends, the
console provisions an SES identity for a domain, publishes the DNS records
where it controls the zone, and delivers working credentials as config. The
app never holds a cloud key and nobody runs an MTA.

One command does the whole walk — declare, provision the domain, wait for
verification, deliver:

```
carlos email enable --app <app>
```

The identity defaults to the app's **own host**
(`<app>.<sqid>.oncarlos.com`), so the signing domain matches the domain of
the links inside the mail. Credentials arrive as env —
`CARLOS_SMTP_HOST`, `_PORT`, `_USER`, `_PASS`, `_FROM`. Transport is
submission on 587 with STARTTLS. `--env-prefix MAILER` renames the whole set
to `MAILER_HOST`, `MAILER_PORT`, and so on, for an app that already reads
its own names.

For a customer's own domain:

```
carlos email enable --app <app> --domain mail.example.com
```

On the platform domain CARLOS publishes the records itself and verification
is usually seconds. On a custom domain it prints the record set for the
zone's owner to publish, then polls until SES confirms it (`--timeout`,
default 10m; a gave-up wait exits non-zero and names what SES is still
waiting for). `carlos email domains add` is the same provisioning step on
its own, for adding a second sending domain to an app that already sends.

The record set a customer has to publish is always these five, for
`<domain>` and the region the identity was first verified in:

| Name | Type | Value |
|---|---|---|
| `<token>._domainkey.<domain>` × 3 | CNAME | `<token>.dkim.amazonses.com` |
| `mail-<region>.<domain>` | MX | `10 feedback-smtp.<region>.amazonses.com` |
| `mail-<region>.<domain>` | TXT | `v=spf1 include:amazonses.com ~all` |
| `_dmarc.<domain>` | TXT | `v=DMARC1; p=none; adkim=s; aspf=s` (plus `rua=` if the deployment sets one) |

The SPF record sits on the MAIL FROM subdomain rather than the identity
domain because that is the domain SPF is checked against.

**The published DMARC policy is `p=none`**, deliberately: a tenant whose
very first send is rejected by its own DMARC record learns nothing useful
from the failure. There is no `carlos email` verb that changes it. On a
custom domain the zone is the customer's, so they can tighten it themselves
whenever they choose — read the DKIM note below first.

Then:

| Verb | What it does |
|---|---|
| `carlos email status --app <app>` | What is declared, which domains verified, what was delivered |
| `carlos email test --app <app> --to me@example.com` | Sends a REAL message through a throwaway credential, then revokes it |
| `carlos email credentials create\|list\|revoke` | Standalone credentials for something not running on CARLOS; the password is shown **once** |
| `carlos email rotate --app <app> [--finish]` | Two-phase key rotation — new key delivered, then the old one retired |

### Three things that will bite

- **A freshly minted credential does not work for the first minute or
  two.** SES's SMTP endpoint does not see a new IAM access key
  immediately, and the symptom is `535 Authentication Credentials Invalid`
  — which reads exactly like a wrong password and is not one. Wait and
  retry. An app's first sends straight after `enable` hit this too, so do
  not diagnose a broken credential from the first minute of logs.
  **A 535 that outlasts a few minutes is a different problem** and is worth
  treating as real: check the key is still `Active` and not paused
  (`carlos email status`), and that the password was derived for the same
  region as the SMTP host — the derivation is region-scoped, so a
  credential minted for one region never authenticates against another's
  endpoint.
- **DMARC alignment rests on DKIM alone.** Records are published with
  `adkim=s; aspf=s`, and that strictness is what stops one tenant's
  signature authenticating another tenant's From address on a shared
  domain. SPF authenticates but does **not** align: the envelope sender is
  a region-qualified subdomain (`mail-<region>.<domain>`), which strict
  alignment treats as a different domain. DMARC therefore passes on the
  DKIM rail only. That is normal for SES — but it means DKIM is the single
  rail, so never turn off DKIM signing on a sending identity. If a customer
  tightens their own zone to `p=reject`, that is safe but unforgiving: a
  DKIM CNAME later dropped from their zone stops being a downgrade and
  becomes total delivery failure.
- **The MAIL FROM subdomain carries its region forever.** It is fixed at
  the first verification (`mail-eu-west-1.<domain>`). On a custom domain
  that record lives in the customer's zone — the one record CARLOS cannot
  republish for them — so moving regions later means going back to the
  customer for a DNS change.

## Scheduled work

The platform keeps the clock. A hibernating instance cannot run an
in-process timer, so recurring work is declared from outside the app and
delivered as a **tick**: a `POST` to a path you declared, at the time it
is due, waking the instance first and holding it awake while your handler
runs. Nothing else crosses the boundary — no payload, no job state, no
queue. Live 2026-08-24.

Declare it with the CLI, not in code:

```
carlos schedule set --app <app> --name sync      --every 6h         --path /jobs/sync
carlos schedule set --app <app> --name reminders --cron "0 8 * * *" --path /jobs/reminders
```

`--every` is a Go duration, whole minutes, 1m to 30d. `--cron` is five UTC
fields (`min hour dom month dow`, with `*`, `n`, `a-b`, `*/n`, `a,b`) —
no names, no `@daily`, no seconds. Names are
`^[a-z0-9][a-z0-9-]{0,31}$`, at most 20 per app. `carlos schedule ls`
prints the declaration and then what each instance reports (`next`,
`last`, `last_status`); `run` requests an out-of-band fire on top of the
normal rhythm; `rm` removes the declaration. The verbs say **recorded**
and **requested**, never "fired": they write one console object, and each
box acts on it within seconds.

The app's whole part is a handler on that path:

```go
// POST /jobs/sync
func handleSync(w http.ResponseWriter, r *http.Request) {
	if !carlos.Tick(r) {           // amadan.net/rastrillo/rastrillo/carlos
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	if occ, ok := carlos.TickOccurrence(r); ok && alreadyDone(occ) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err := syncer.RunOnce(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError) // 5xx = retry
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

`carlos.Tick` is the constant-time compare of the bearer against
`$CARLOS_ADMIN_TOKEN`, which the platform mints into the instance's
environment; use it rather than hand-rolling the check. A tick arrives on
an ordinary public route, so a tick nobody authenticated is an internet
request to that path — and the `X-Carlos-*` headers are not evidence,
anyone can set those. The status is your whole reply: **2xx** done,
**5xx** retry with backoff (five attempts, 1m doubling to 15m, then the
schedule advances), **4xx** don't bother.

One-shots are the app's own call, over the control socket the agent binds
before your process starts:

```go
err := carlos.ScheduleAt(ctx, "remind-"+id, when, "/jobs/remind")  // carlos.ScheduleCancel drops it
```

Same tick, same handler, same name namespace as declared schedules (a
collision returns `ErrDeclaredSchedule`). Up to 400 days ahead, 1000
pending per host. Reach for one only when the work genuinely has a
specific time; a daily schedule whose handler asks its own database
"what falls today?" beats one timer per row.

### Things that bite

- **Do the work inside the request.** The instance is held awake for
  exactly as long as the request is open (30-minute ceiling) and the idle
  clock starts the moment you return. Reply 202 and finish in a goroutine
  and that goroutine gets hibernated mid-job.
- **Dedupe on `X-Carlos-Schedule-At`** — unix seconds, read it with
  `carlos.TickOccurrence`. It is the instant the delivery is *for*, so
  every retry of one failed occurrence carries the same value, as does a
  redelivery after a box crash or a deploy that cut a long job. Never key
  on the wall clock: a retry twenty minutes later is the same occurrence.
  Keep `Tick` as the guard — a request with no occurrence header means
  "no dedupe key, run it", which is what your own "Sync now" button looks
  like.
- **A 4xx is never retried.** A path with no handler, or a handler that
  refuses a token it cannot see, records `app refused` and the schedule
  advances to its next occurrence. That failure is quiet — `next` still
  moves, so `ls` reads like a success. Check `last_status`.
- **An instance running since before the platform roll refuses its own
  ticks.** The token is minted at spawn, so a process older than the roll
  has no `$CARLOS_ADMIN_TOKEN`, `Tick` is always false, and
  `carlos.ScheduleAt` returns `ErrUnauthorized`. `carlos restart` clears
  it; nothing else does.
- **A schedule tighter than the idle window keeps the instance resident,
  and residency is billed.** Since 2026-08-31 a tick no longer stamps
  activity, but the sweeper deliberately will not put a host to sleep
  when its next tick is due sooner than the idle window (15 minutes by
  default) — staying awake is genuinely cheaper than a wake/sleep cycle
  per tick, each of which is a full SQLite checkpoint-and-restore. So a
  5-minute schedule against a 15-minute window never sleeps and accrues
  instance-hours around the clock; an hourly one sleeps about three
  quarters of each hour. `carlos schedule ls` and `set` now say so in one
  line rather than leaving it to be found on a bill. The platform warns
  and never refuses: a tight schedule is a legitimate thing to want.
- **Unit-backed instances are not delivered to** in this release — `ls`
  says `unsupported` against them. Exec-backed instances (the default)
  and sidecars work.
- **Once-timers outlive the process.** They live in the box registry, so
  a restart loses none, and re-asserting them at boot is safe because a
  repeated name replaces rather than adds. Off-platform there is no
  control socket at all: `ScheduleAt` returns `ErrNotOnCarlos`, which
  boot code should treat as "skip", not as a failure.

## Two builds at once

Since v0.26.0, where the deployment has switched it on (Carloku did on
2026-10-14; the v0.27.3 default is off, and then a build is taken by
restart and `deploy` watches the URL instead of each box's rollout), a
new build reaching an awake instance starts beside the old one and takes over once it passes
its health check, so no request waits (`--swap overlap`, the default).
For a few seconds both builds run against the same database and the same
scheduled work, and the new build's migrations run while the old one
still serves. That makes two rules part of every release:

- **Migrations stay additive across two consecutive releases.** Add a
  column, table or index in one release; drop the old one in a later
  release, once no running build reads it. A rename is an add now and a
  drop later.
- **Schedule names stay the same across the two builds**
  (`carlos schedule`).

A release that cannot follow them ships with `--swap hold` on
`carlos deploy` or `carlos ship`: each instance stops before its new
build starts, and requests wait a few seconds for it.
`carlos apps set <app> --swap hold` makes that the app's rule, and
`--swap-concurrency` is how many instances on one box swap at once,
after the first has stayed up for ten seconds. If a build fails on a box,
that box stops rolling it out, its other instances stay on the build they
were serving, and `carlos deploy` names the failure and exits non-zero;
`carlos instances list` shows it under REASON. Fix the cause, then
`carlos promote --retry <version> <channel>` (every box) or
`carlos instances retry <host>` (one instance).

## Visitor location headers

On a deployment that publishes a GeoIP database (since v0.25.1),
every request the edge passes to an app carries the visitor's rough
location: `X-Carlos-Geo-Country` (ISO 3166-1, `IE`),
`X-Carlos-Geo-Subdivision` (ISO 3166-2, only some databases),
`X-Carlos-Geo-Lat` / `-Lon` (two decimals: an area, not a position) and
`X-Carlos-Geo-Source` (which database answered). Any of them can be
missing: treat that as unknown, never as an error. The edge strips any a
visitor sends, so the values are always the platform's. A cached page
that differs by country sends `Vary: X-Carlos-Geo-Country`; never vary on
the coordinates.

**An app that shows a visitor anything worked out from these headers
must credit the database `X-Carlos-Geo-Source` names** — `DBIP-…`:
"IP Geolocation by DB-IP", linked to https://db-ip.com; `GeoLite2-…`:
"This product includes GeoLite2 data created by MaxMind, available from
https://www.maxmind.com". For an address that is not the current
request (a log line, a webhook), `carlos geo <address> --app <a>`, or
from an app `GET /api/cli/apps/<account>/<app>/geo?ip=<address>`, at
most 60 a minute. That call needs an `instance`-role token, which is
app-wide (it can also create, repoint and delete every sibling
instance), so make it only from a central app that already holds one;
never deliver that token to a tenant app's instances just to look up an
address. Tenant instances use the request headers.

## Deploy truths (each paid for at least once)

- **`carlos deploy` is the release motion**: ship, promote to the entry
  channel (or the channel the app's instances follow), then follow each
  box's rollout (or, where a box does not report one, watch the URL)
  until the shipped build is serving. "Held for bake" on a
  channel that declares one is the system working, not failing.
- **A promote is not a deploy** until the process cycles. An awake
  instance starts the new build within seconds of its box adopting it
  (beside the old one where two builds at once is on), an asleep one
  takes it on its next request, and unit-stamped routes are restarted.
  A bespoke long-running unit
  outside the platform's knowledge stays old until *something* restarts
  it — know which of the three your app is.
- **Verify against the thing you changed, with the binary you built.**
  A 200 is not proof: an app-shell route returns 200 HTML for
  `/api/version` and will happily "verify" any build ever shipped. The
  proof is the build the process itself reports: set
  `carlos apps build-probe`, or read `X-Carlos-Version` on the canonical
  host knowing the edge stamps it before the process has cycled; stale
  DNS and stale local binaries have both produced false "verified"
  reports.
- **Review on a canary, not on localhost.** `carlos canary` cannot
  disturb production: its channel sits outside every pipeline and its
  hostname is the branch's own. Bring a config bundle with it if the app
  has one.
- **When CI ships for you, verify by ancestry, not equality** — a PR
  merging behind yours cancels your run and ships a commit *containing*
  yours.
- **Stamp your build version.** For rastrillo apps,
  `-ldflags "-X amadan.net/rastrillo/rastrillo.BuildVersion=<sha>"`
  — or every release's `/api/version` reports `dev`.

## Switched off, or not released

Released, switched off on Carloku — the CLI has the flag, the console
declines or ignores it, and nothing should be built to stand in for
them: app residency (`--region` on `apps create`, `deploy` and `canary`
since v0.23.0; the console starts the app in its home region and says
so), instance moves (`carlos move`, v0.26.0; it sends nothing), and
temporary static sites (`deploy --temporary` / `--ttl`, `apps ttl|keep`,
v0.25.1). Names starting `tmp-` are reserved whether or not temporary
sites are on.

Merged after v0.27.3, not released: `carlos run` (one command of your
app against one instance) and seeded instances
(`instances create --from`, `instances import`). Not built: an
instance-bound token in place of the app-wide `instance` role, a
create-only provisioning role, and cross-box path targets. Check
`carlos <verb> -h` against the console and wait.

## Self-hosting the platform

The platform is the same software members deploy onto: a self-hosted
deployment (Tito's path) runs its own console, boxes, and bucket in its
own cloud account, and its members use the identical `carlos` CLI pointed
at that console. Operating it is real work — box provisioning, the
adopt/restart cadence, platform rolls — and it is the one context where
box verbs and cloud access are legitimate. Commit a `.carlos/config`
naming the deployment's console so sessions cannot fall back to the wrong
one; the CLI's account default is not your account (`ops` exists on every
deployment and is empty — a `not found` against it once cost an hour of
confident wrong diagnosis).

The deployment's own binary is a channel like any app's:
`carlos system update --channel canary|stable` promotes a release, and
every box on that channel fetches it, verifies it against the signed
pointer, installs it, restarts its edge, and rolls itself back if the new
one does not come up and stay up. `carlos system status` shows each box's
running build and last apply outcome; `carlos system rollback` undoes it;
`--spread 10m` staggers a stable roll. The console is an app — update it
with `carlos deploy --app console`. Owner of the ops account only.

For the underlying machinery — registry, router, replication, hibernation
internals — see blueprint.md, which is the reference for what the
platform does on your behalf and for hand-rolling outside it.

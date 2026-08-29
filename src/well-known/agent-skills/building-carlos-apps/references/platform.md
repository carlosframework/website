# 🤖 The CARLOS platform, member-side

What `carlosframework/platform` does for an app, and the `carlos` CLI
surface a member drives it with. Everything here works with **zero
infrastructure access** — no SSH, no AWS console, no box commands. That is
a design law, not a convenience: every command is built for a user who has
nothing but the CLI and a browser. If a task seems to need a box, either
you are self-hosting and operating the platform itself, or you have found
a product gap to file — never a workaround to build.

Snapshot date 2026-08-24; verbs are stable, flag details evolve — trust
`carlos <verb> -h` over this file. The CLI ships for macOS/Linux (brew,
apt, static binaries) and Windows (client-only zip — no self-replace,
`carlos update` defers to a fresh download).

## What the platform owns (never hand-roll these)

- **Routing and TLS** — the edge is the only process on :443; the route
  table doubles as the ACME allowlist; per-host certs auto-obtained and
  renewed, including customer domains and (via ACME delegation) wildcards.
- **Replication** — Litestream on every instance database, run by the
  platform's host agent; restore drills are the platform's job too.
- **Hibernation** — provisioned instances doze when idle and wake on
  request; live and default-on, not a future feature. Cents-per-month
  idle cost is the platform's economic story.
- **Process supervision and restarts** — instances are converged from
  bucket records; `carlos restart` cycles them in seconds, console-side.
- **Config delivery** — `carlos env` / `carlos secrets` writes converge
  onto boxes within seconds (a serial bump, 2s poll). No ssh-delivered
  EnvironmentFiles.
- **Deploy verification** — the edge stamps `X-Carlos-Version` per
  versioned route (only after the instance actually restarted);
  `carlos deploy` watches it.
- **Outbound email** — the platform mints a sending identity on a domain,
  publishes DKIM/SPF/DMARC where it controls the zone, and delivers working
  SMTP credentials as config. Apps never hold an AWS key and nobody runs an
  MTA. See "Sending email" below.
- **Scheduled work** — the platform keeps the clock: a declared schedule
  POSTs a tick to a path in your app at the time it is due, waking a
  hibernating instance to run it. No in-app scheduler, no cron line on a
  box. See "Scheduled work" below.

## Concepts

- **Account** — the tenancy unit. Public short id (**sqid**, e.g. three
  letters) appears in default hostnames; it is not a secret. Roles are
  owner/member. `carlos auth whoami` shows yours.
- **App** — named per account (not globally). Claimed with
  `carlos apps create`; deleted apps sit in a 30-day trash.
- **Release** — immutable, content-addressed, produced by `carlos ship`.
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
  passkey on stable — reaching stable cuts a semver tag; `-hotfix`
  bypasses, recorded). Box-side, bake changes **ratchet**: a shorter
  window is honoured only after the previously-known window has elapsed
  once on the box's own clock, so a compromised console session cannot
  collapse a hold and ship in the same hour.
- **Production flag** — legacy: superseded by per-channel pipeline rules
  for pipelined apps, still honoured by legacy boxes/apps. Its sharp
  edge is recorded: a stable promote plus the console's default-checked
  safety delay once left a hibernating app unwakeable for days —
  ceremony belongs on channels you chose, not on defaults.
- **Instance** — one account's running process for an app on a host.
  Declared console-side (`carlos instances enable` once per app, then
  `instances create -host …`); a box reconciler mints the actual route.
  Exec-backed and hibernating by default. The process contract is
  `<bin> --socket <path> --db <path>` on a unix socket — there is no
  `$PORT` — and every instance serves `GET /healthz` and
  `GET /api/version`.
- **`.carlos/config`** — two layers, global `~/.carlos/config` and
  per-project `./.carlos/config` (committed; nearest wins walking up).
  Holds console, account, app, kind, artifact — the reason zero-argument
  `carlos deploy` works. Project values are honored only when the file's
  console matches the session's, so a committed config cannot silently
  redirect someone else's credentials.
- **Default addresses** — `<app>.<sqid>.<apps-domain>` (on the hosted
  platform, `oncarlos.com`); canary form `<canary>.<app>.<sqid>.<domain>`.
  Minted **alias** hosts intentionally carry no `X-Carlos-Version` —
  verify on the canonical host.

## The member CLI

| Verb | What it does |
|---|---|
| `carlos auth login\|whoami\|logout\|default` | Device-code login (approve in any signed-in browser); identity + memberships; per-project default console |
| `carlos apps create\|place\|delete\|restore` | Claim an app; place it on a customer fleet; trash/restore |
| `carlos ship` | Publish an immutable release (`-kind binary\|static`, `-version`, `-notes`); rate-limited per app (~2/minute — a 429 carries `Retry-After`) |
| `carlos promote` | Move a version up the ladder (`-hotfix` to bypass, recorded) |
| `carlos deploy` | ship + promote + watch `X-Carlos-Version` until live — the one-command release; zero-arg with a saved project config |
| `carlos rollback` | Point a channel back at an earlier version |
| `carlos pipeline` | Show or shape the app's release channels; `init -template edge-production\|full-ladder` replaces the single default channel with a starter pipeline |
| `carlos channels` / `carlos releases` | What each channel serves / every shipped version; `releases retention` prunes old ones |
| `carlos version target` | The semver family ships auto-increment under |
| `carlos env` / `carlos secrets` | Plain vars / sealed secrets, layered per environment; `env sync` forces convergence; `secrets genkey` mints keypairs locally |
| `carlos instances enable\|create\|list\|delete\|set-upstreams` | Opt an app in; declare/inspect/remove instances; repoint upstreams |
| `carlos restart` | Cycle an app's processes — no version or config change |
| `carlos logs` | Merged app + platform + edge timeline (`-f` follows, `-grep`, `-since`) — no box access |
| `carlos domains attach\|detach\|list` | Claim customer hostnames (`-wildcard`, `-catchall`); prints the DNS records to create; certs follow automatically |
| `carlos store create\|status\|rotate` | Declare object storage; credentials arrive as env; member-driven key rotation |
| `carlos email enable\|status\|test\|domains\|credentials\|rotate` | Declare sending; provision a verified domain; SMTP credentials arrive as env (`pause`/`resume` are a deployment operator's) |
| `carlos schedule ls\|set\|rm\|run` | Declare recurring work per app (`-every 6h` or `-cron "0 8 * * *"` → a `POST` to a path your app serves); `ls` shows next/last per instance; `run` fires one now |
| `carlos ledger append\|publish\|verify` | Open hash-chained per-app ledgers (the transparency machinery) |
| `carlos accounts create\|list\|migrate` | Mint/list accounts; move an app between them |
| `carlos fleets create\|add-box\|rotate-token\|…` | Bring-your-own-boxes fleets that dial the console |
| `carlos update` | Update the CLI binary itself (signature-verified; defers to brew/apt) |
| `carlos vet` | Check a release against the platform contract |

Box-side verbs exist (`edge`, `agent`, `adopt`, `route`, `add`, `ops`,
`bootstrap`) but they are the *operator's* surface for running a platform
deployment — a member never types them, and an agent reaching for them on
a member task has taken a wrong turn.

## Sending email

The platform issues SMTP credentials. An app declares that it sends, the
console provisions an SES identity for a domain, publishes the DNS records
where it controls the zone, and delivers working credentials as config. The
app never holds a cloud key and nobody runs an MTA.

One command does the whole walk — declare, provision the domain, wait for
verification, deliver:

```
carlos email enable -app <app>
```

The identity defaults to the app's **own host**
(`<app>.<sqid>.oncarlos.com`), so the signing domain matches the domain of
the links inside the mail. Credentials arrive as env —
`CARLOS_SMTP_HOST`, `_PORT`, `_USER`, `_PASS`, `_FROM`. Transport is
submission on 587 with STARTTLS. `-env-prefix MAILER` renames the whole set
to `MAILER_HOST`, `MAILER_PORT`, and so on, for an app that already reads
its own names.

For a customer's own domain:

```
carlos email enable -app <app> -domain mail.example.com
```

On the platform domain CARLOS publishes the records itself and verification
is usually seconds. On a custom domain it prints the record set for the
zone's owner to publish, then polls until SES confirms it (`-timeout`,
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
| `carlos email status -app <app>` | What is declared, which domains verified, what was delivered |
| `carlos email test -app <app> -to me@example.com` | Sends a REAL message through a throwaway credential, then revokes it |
| `carlos email credentials create\|list\|revoke` | Standalone credentials for something not running on CARLOS; the password is shown **once** |
| `carlos email rotate -app <app> [-finish]` | Two-phase key rotation — new key delivered, then the old one retired |

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
carlos schedule set -app <app> -name sync      -every 6h         -path /jobs/sync
carlos schedule set -app <app> -name reminders -cron "0 8 * * *" -path /jobs/reminders
```

`-every` is a Go duration, whole minutes, 1m to 30d. `-cron` is five UTC
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
	if !carlos.Tick(r) {           // github.com/carlosframework/rastrillo/carlos
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
- **Unit-backed instances are not delivered to** in this release — `ls`
  says `unsupported` against them. Exec-backed instances (the default)
  and sidecars work.
- **Once-timers outlive the process.** They live in the box registry, so
  a restart loses none, and re-asserting them at boot is safe because a
  repeated name replaces rather than adds. Off-platform there is no
  control socket at all: `ScheduleAt` returns `ErrNotOnCarlos`, which
  boot code should treat as "skip", not as a failure.

## Deploy truths (each paid for at least once)

- **`carlos deploy` is the release motion**: ship, promote to the entry
  channel (or the channel the app's instances follow), then watch the URL
  until the header reports the shipped build. "Held for bake" on a
  channel that declares one is the system working, not failing.
- **A promote is not a deploy** until the process cycles. The platform
  restarts unit-stamped routes and wakes hibernating tenants into the new
  build (a session in flight keeps the old binary until its instance
  idles — that is the bake, not a failure). A bespoke long-running unit
  outside the platform's knowledge stays old until *something* restarts
  it — know which of the three your app is.
- **Verify against the thing you changed, with the binary you built.**
  A 200 is not proof: an app-shell route returns 200 HTML for
  `/api/version` and will happily "verify" any build ever shipped. The
  `X-Carlos-Version` header on the canonical host is the proof; stale
  DNS and stale local binaries have both produced false "verified"
  reports.
- **When CI ships for you, verify by ancestry, not equality** — a PR
  merging behind yours cancels your run and ships a commit *containing*
  yours.
- **Stamp your build version.** For rastrillo apps,
  `-ldflags "-X github.com/carlosframework/rastrillo.BuildVersion=<sha>"`
  — or every release's `/api/version` reports `dev`.

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

For the underlying machinery — registry, router, replication, hibernation
internals — see blueprint.md, which is the reference for what the
platform does on your behalf and for hand-rolling outside it.

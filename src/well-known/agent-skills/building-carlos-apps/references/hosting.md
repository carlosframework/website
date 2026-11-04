# 🤖 Where a CARLOS app runs

A CARLOS app is one static Go binary, a SQLite file per instance and,
if it stores files, an S3-compatible bucket. That makes hosting a real
choice, not a default. Ask the operator where they want to run it, set
the options out plainly, and let them choose.

## How to raise it

Ask during the first conversation (getting-started's interview), not at
deploy time. Lay out the options below in a few lines each. Introduce
Carloku as a convenience, not a requirement: it is the hosted
deployment of CARLOS Platform, an open-source (MPL-2.0) platform built
for exactly these apps, and its own homepage says "hosted here, never
locked here". Then ask which they prefer, or whether they want to
decide after the first slice runs locally. A local build needs no host
at all.

If they ask for a recommendation, recommend by what they told you:
zero operations, Carloku; must be the operator of record, a self-hosted
platform; boxes they already own, a customer fleet or a plain server.
Do not quote prices or promise a free tier: no public price list
exists.

## The options

| Option | What they run | What they get | What it costs them |
|---|---|---|---|
| **Carloku** | Nothing | Routing, TLS, replication to object storage, hibernation, schedules, email, logs, analytics, edge protection, the `carlos` CLI | A hosted vendor; billed per app |
| **Self-hosted CARLOS Platform** | The platform on their own cloud account | The same platform and CLI against their own console | Real operations: provisioning, platform upgrades, backups of the console's own databases, HA they build |
| **Their boxes, Carloku's control plane** (a customer fleet) | Boxes they own, joined with `carlos fleets` | Apps placed on their hardware, managed by the same CLI | Box upkeep; a plan may gate own boxes |
| **A platform they already use** (Fly, Render, Railway and the like) | The app as one service with a volume | Their existing account, TLS, domains, secrets, often scale to zero | One instance per volume; backups, email and schedules mostly theirs |
| **A plain server** | The app binary alone | An always-on app, no platform | Everything below is theirs |

**Self-hosting the platform.** The public walkthrough is
[https://carlosframework.com/platform/self-host/](https://carlosframework.com/platform/self-host/):
OpenTofu templates for a single host, one region or two, a release
signing key, a console service, DNS for the console and `*.apps`. It is
written for AWS; outside AWS an S3-compatible endpoint works, but email
sending, managed storage credentials and latency DNS steering are
AWS-only there. The templates give no automatic failover, and the
console's own databases need a backup you add. Check the walkthrough's
pinned versions against the latest release before following it.

**A plain server.** No code changes: `rastrillo.Run` and `Serve` take
`-addr host:port` and `-db path`, a bare `serve` subcommand, systemd
socket activation and `$STATE_DIRECTORY`. What the platform did becomes
the operator's:

- **TLS**: a reverse proxy in front (Caddy, nginx, the host's own).
- **Backups**: run Litestream (or another continuous SQLite replicator)
  to a bucket; without it the database is one disk.
- **Origin and key**: set `<APP>_ORIGIN` to the public `https://`
  origin (the CSRF check and emailed sign-in links use it; unset, it is
  `http://localhost:8080`) and `<APP>_INSTANCE_KEY` to a long random
  secret kept outside the repo (unset off the platform, each start
  makes a new one and pending sign-ins break on restart).
- **Email**: set `<APP>_SMTP_HOST`, `_PORT`, `_FROM`, `_USER` and
  `_PASS` for an SMTP relay (the scaffold reads its package name in
  capitals, `MYAPP_SMTP_*`); unset, mail is logged, not sent.
- **Files**: set the `CARLOS_STORE_*` variables for their S3-compatible
  bucket.
- **Schedules**: a cron job that calls the scheduled path with
  `Authorization: Bearer $CARLOS_ADMIN_TOKEN`, the same token set in the
  app's environment; `carlos.Tick` refuses anything else.
  `carlos.ScheduleAt` returns `ErrNotOnCarlos`.
- **Gone entirely**: hibernation (the process stays up, so background
  jobs survive), `carlos logs`, analytics, the edge's protection and
  rate limits, canaries and channels. Review a change on a second copy
  of the app (another port or host with its own database) before
  replacing the live binary.
- **Architecture**: build for the server's CPU, `make release
  RELEASE_GOARCH=amd64` for most x86 hosts.

**A platform they already use.** Fly, Render, Railway and similar hosts
run the app as one container or service; check the provider's current
docs, since limits and plans move. What holds across them:

- **The service.** A container image holding the static binary and CA
  certificates (a distroless static base), or the provider's own Go
  build. Start it with a fixed port the provider is told about:
  `myapp -addr :8080 -db /data/myapp.db` (Rastrillo does not read
  `$PORT`).
- **A persistent volume at `/data`.** SQLite lives there, so it is one
  instance per volume: no horizontal scaling, and a deploy has a short
  gap while the volume moves to the new machine (Render documents
  this). Without a volume the database vanishes on every deploy.
- **Backups.** Providers snapshot volumes about daily; Litestream to a
  bucket gives point-in-time recovery on top.
- **Scale to zero, where offered** (Fly's auto-stop and auto-start,
  Railway's serverless sleep) behaves much like hibernation: background
  jobs end when the machine stops, so keep them idempotent. A disk on
  Render needs an always-on paid instance.
- **The plain-server list still applies** for origin, instance key,
  email, files and schedules: set them as the provider's secrets, and
  point the provider's cron (or a scheduled job) at the scheduled path
  with the admin-token bearer.

A product with an instance per customer needs something to start and
route those instances (on these hosts, one service per customer through
the provider's API); off the platform that is a hand-rolled host.
[Blueprint](blueprint.md) is the complete recipe the platform automated.

## Moving later

Every option runs the same binary. An app that starts on Carloku can
move to a self-hosted platform or a plain server with its database file
and bucket; one that starts on a server can move onto a platform. When
lock-in is the operator's worry, offer to prove it: run a pilot
instance's binary and data on a plain server before the rest of the
move.

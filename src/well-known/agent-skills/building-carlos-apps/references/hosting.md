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

Show what the platform includes, so they compare like for like: the
list below is what Carloku or a self-hosted CARLOS Platform does with
no work from them, and every item it holds is something an off-platform
option makes theirs to build or go without. Say it plainly, without
selling: the list makes the case on its own.

Always ask whether they already run something else: a platform account,
a Kubernetes cluster, a server. Anything that runs one container with a
persistent volume can run the app, and what they already operate often
beats a new account.

If they ask for a recommendation, recommend by what they told you:
zero operations, Carloku; must be the operator of record, a self-hosted
platform; something they already run, that; boxes they already own, a
customer fleet or a plain server.
Do not quote prices or promise a free tier: no public price list
exists.

## What CARLOS Platform does for you

Out of the box, through the `carlos` CLI and console:

- **Deploys without downtime.** `carlos deploy` ships, promotes and
  waits until the new build serves; on an awake instance the new build
  starts beside the old one and takes over within seconds. Channels,
  pipelines, `carlos canary` (a branch's own host and channel) and
  `carlos rollback`.
- **Instances, per customer if you want.** Create, move and delete
  instances from the CLI or from your own app (Rastrillo's `provision`),
  each with its own process, database and hostname; path routes under a
  hub; regions; fleets of boxes you own.
- **Sleep and wake.** Idle instances hibernate and wake on the next
  request, adding no instance-hours while asleep. An open live page does
  not keep one awake: the edge holds marked event streams while it
  sleeps, which Rastrillo's live pages use from v0.33.0.
- **Backups and restore.** Every database replicates continuously to
  object storage; `carlos db` restores a copy to your machine without
  touching the live one.
- **Uploads.** `carlos store` gives an app an S3-compatible bucket with
  presigned uploads, and virus scanning where the deployment runs it.
- **Email.** `carlos email enable` sets up a verified sending domain and
  hands the app its SMTP credentials.
- **Schedules and background work.** `carlos schedule` wakes the app on
  a clock; `carlos sidecars` runs a process with no request behind it;
  `carlos run` and `carlos console` run a command as an instance.
- **Domains and TLS.** Certificates issued and renewed, custom domains
  attached (and bought, where the deployment offers it), a password gate
  for prototypes.
- **Watching it.** `carlos logs`, `errors` and `availability` with no
  wiring, `analytics` counted at the edge (no JavaScript, no cookie, no
  stored IP), edge protection that blocks known attack paths, per-app
  rate limits.
- **More, when needed.** A PDF service, a TURN relay for WebRTC calls,
  interactive sessions, rootfs apps for software that is not one
  binary.

Check the deployment's own docs for which optional services it runs
(storage, scanning, PDFs, buying domains), and never enable a billable
one without the operator's approval.

## The options

| Option | What they run | What they get | What it costs them |
|---|---|---|---|
| **Carloku** | Nothing | Everything in the list above, run for them | A hosted vendor; billed per app |
| **Self-hosted CARLOS Platform** | The platform on their own cloud account | The same platform and CLI against their own console | Real operations: provisioning, platform upgrades, backups of the console's own databases, HA they build |
| **Their boxes, Carloku's control plane** (a customer fleet) | Boxes they own, joined with `carlos fleets` | Apps placed on their hardware, managed by the same CLI | Box upkeep; a plan may gate own boxes |
| **A platform they already use** (Fly, Render, Railway, a self-hosted Miren, and the like) | The app as one service with a volume | Their existing account or servers, TLS, domains, secrets, often scale to zero | One instance per volume; backups, email and schedules mostly theirs |
| **Their Kubernetes cluster** | One pod with a volume | Their existing cluster, ingress, secrets and CronJobs | Everything in the plain-server list, as manifests |
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
socket activation, `$STATE_DIRECTORY` and, from v0.33.0, `$PORT`.
Rastrillo's own guide, `docs/site/hosting-elsewhere.md` in the
installed module (v0.33.0 and later), has a systemd unit, a Caddy file,
Litestream and a container image. What the platform did becomes
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

**A platform they already use.** Fly, Render, Railway, Miren (a
self-hosted, Apache-2.0 container platform for your own Linux servers)
and similar hosts run the app as one container or service; check the provider's current
docs, since limits and plans move. What holds across them:

- **The service.** A container image holding the static binary and CA
  certificates (a distroless static base), or the provider's own Go
  build. Start it as `myapp -db /data/myapp.db`: from rastrillo
  v0.33.0 an app given no `-addr` listens on `$PORT`, which these
  platforms set. An older app, or a platform that sets no `$PORT`,
  takes `-addr :8080` and the provider is told that port.
- **A persistent volume at `/data`.** SQLite lives there, so it is one
  instance per volume: no horizontal scaling, and a deploy has a short
  gap while the volume moves to the new machine (Render documents
  this). Without a volume the database vanishes on every deploy.
- **Backups.** Providers snapshot volumes about daily; Litestream to a
  bucket gives point-in-time recovery on top.
- **Scale to zero, where offered** (Fly's auto-stop and auto-start,
  Railway's serverless sleep) behaves much like hibernation: background
  jobs end when the machine stops, so keep them idempotent. A disk on
  Render needs an always-on paid instance, and a Miren service with a
  disk runs a fixed single instance.
- **Miren specifics.** `miren deploy` builds from a `Dockerfile.miren`
  or detects Go. In `.miren/app.toml`, give the web service `mode =
  "fixed"`, `num_instances = 1` and a `[[services.web.disks]]` at
  `/data`, or use the `miren-sqlite` addon and start the app with `-db
  $SQLITE_PATH`. Its scheduled `[tasks]` cannot reach a disk, so a task
  calls the app's scheduled path over HTTP with the admin-token bearer.
- **The plain-server list still applies** for origin, instance key,
  email, files and schedules: set them as the provider's secrets, and
  point the provider's cron (or a scheduled job) at the scheduled path
  with the admin-token bearer.

**Their Kubernetes cluster.** The app is a StatefulSet (or a Deployment
with the `Recreate` strategy) of exactly one replica, so two pods never
open the same database:

- the container as above, `-addr :8080 -db /data/myapp.db`, with a
  `ReadWriteOnce` PersistentVolumeClaim at `/data`;
- a Service and an Ingress, with their TLS (cert-manager or the
  cluster's own);
- Secrets for the origin, instance key, SMTP and bucket variables in
  the plain-server list, and a long random `CARLOS_ADMIN_TOKEN`;
- a CronJob per schedule that calls the scheduled path with that
  token as the bearer;
- Litestream as a sidecar replicating `/data` to a bucket, since a
  volume snapshot alone is not point-in-time recovery.

A deploy restarts the one pod, a short gap. There is no scale to zero
without extra machinery (KEDA, Knative), and none is needed.

A product with an instance per customer needs something to start and
route those instances (on these hosts, one service per customer through
the provider's API; on Kubernetes, one StatefulSet per customer through
an operator or the cluster API); off the platform that is a hand-rolled host.
[Blueprint](blueprint.md) is the complete recipe the platform automated.

## Moving later

Every option runs the same binary. An app that starts on Carloku can
move to a self-hosted platform or a plain server with its database file
and bucket; one that starts on a server can move onto a platform. When
lock-in is the operator's worry, offer to prove it: run a pilot
instance's binary and data on a plain server before the rest of the
move.

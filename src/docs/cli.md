# The CLI

`carlos` is one binary that plays three roles, picked by the first word you
type. Most days you are in the first role: you have an app, and you want it
running somewhere. The second is for people who stand a deployment up and
administer it. The third is what systemd starts on a box.

Run `carlos help` for the same grouping at the terminal, and
`carlos <command> -h` for a command's own flags. This page says what each
command is for and when you would reach for it. It does not list every flag,
because `-h` already does.

Three flags turn up almost everywhere, and the sections below do not repeat
them. `--app` names the app (`-a` for short). `--account` names the account it belongs to, or
`--account-id` when you want a sqid matched as a sqid and nothing else; leave
both off if you belong to exactly one account. `--console` picks which
logged-in console to act through, and you need it only when this terminal is
logged in to more than one deployment.

Most app commands work two ways. Signed in with `carlos auth login`, they go
through a console's API, which is how someone with no box access and no cloud
credentials gets their work done. With `CARLOS_DEPLOYMENT_BUCKET` or
`CARLOS_DEPLOYMENT_DIR` set, they write to the bucket directly. That is the
operator's path. Where a command only works one way, its section says so.

## Your apps

Everything from claiming a name to watching a deploy land. None of it needs
access to a box, a cloud console, or the deployment's bucket; that is a rule
the platform holds itself to, and a command that broke it would be a bug.

### carlos auth

Logs this terminal in to a console. `carlos auth login` prints a short code
that you approve in a browser already signed in to that console, and the
browser does not have to be on this machine, so this works over SSH. The
token lands in `~/.carlos/credentials` at mode 0600, one entry per console,
so a laptop can hold credentials for the flagship and your own deployment at
once.

```sh
carlos auth login
carlos auth whoami
```

Do not do this on a box. A box has no browser and no human, and the
long-lived token you would leave behind is a standing credential nobody is
watching; pass `--owner <address>` to
[carlos accounts](/docs/cli#carlos-accounts) instead. `carlos auth default`
shows the console this machine talks to by default, and sets it when you give
it a URL. With `--project` it writes `./.carlos/config`, which you can commit
so a checkout pins its own deployment.

### carlos apps

Claims an app name, moves an app onto a customer fleet, and deletes or
restores one. Creating goes through the same door the console's New app form
uses, so a name that form would refuse is refused here too.

```sh
carlos apps create --app hello
```

`carlos apps delete` moves an app to the Trash. Every route drops, custom
domains included, the name stays reserved, and you have thirty days to
`carlos apps restore` it. Restoring brings back releases, channels and the
production flag exactly as they were, but no routes at all — not even the
platform apex — so plan on adding those again. Delete is refused while the
app is flagged production; clear the flag first.

`--place fleet/<name>` at create, or `carlos apps place --target fleet/<name>`
later, puts the app's routes and instances on a fleet your account owns.
`--target ""` brings them back to platform-served. `--target` is mandatory even
in that empty spelling: leaving it off is a usage error, never a silent
clear.

### carlos ship

Publishes a release. The artifact is hashed, stored under its content
address, and recorded in a manifest that never changes afterwards. Shipping
does not change what anything serves — for that, see
[carlos promote](/docs/cli#carlos-promote).

```sh
carlos ship --app hello --label "fixing modals" ./hello
```

`--version` is optional once the app has a version target set, and leaving it
off is the point of having one: ship mints the next iteration under it. Use
`--kind static` with a directory to ship a site instead of a binary. `--label`
is one line for humans and shows up in `carlos releases` and in the console,
so write it for the person doing a rollback at 2am.

### carlos promote

Points a channel at a version you have already shipped. The ladder is
`canary → edge → beta → stable`: beta is entered from edge and stable from
beta, so "it was signed off on beta" means something, and reaching stable
cuts the release's semver tag. Channels named `canary/<something>` are never
refused, because that is what the fleet itself runs on.

```sh
carlos promote --app hello a1b2c3d edge
```

Promoting the same version twice succeeds and does nothing. `--hotfix` skips
the ladder and is an operator act: it works on the direct-bucket path only,
and the console refuses it by name, so the flag never quietly does nothing.

### carlos deploy

Ship, promote, and then wait until the app's URL actually serves the new
build. It watches the `X-Carlos-Version` header on the live host and does not
report success until that header names what you shipped, over a 2xx. Reach
for this one by default; ship and promote separately when you want the gap
between them.

```sh
carlos deploy --app hello ./hello
```

Signed-in only. With saved project defaults you can run `carlos deploy` with
no arguments and no questions. A first run at a terminal fills the blanks by
asking. If your account owns no apps yet, it offers to claim one named after
the directory you are in, through the same door as `carlos apps create`. It
then asks which artifact to ship, works out from what you point it at whether
that is a binary or a site, and offers to save both answers as the project's
defaults. With neither arguments nor defaults and no terminal to ask at — CI,
usually — it refuses instead of guessing. `--channel` overrides the channel it
picks (normally the one the app's instances already follow), and `--host`
scopes the watch to a single instance. A static site needs that second flag,
having no instances to resolve a channel from.

```sh
carlos deploy --app website --kind static --host www.example.com ./dist
```

### carlos restart

Cycles an app's processes with no new version and no config change. This is
the answer to a wedged instance.

```sh
carlos restart --app hello
```

It reports the restart as *requested*, which is the honest word: the console
touches one small object and every box serving the app notices within
seconds. Long-running tenants come back within seconds. Exec-backed instances
stop within seconds and respawn on their next request, which for an idle app
may be a while. Nothing is stuck: the instance comes back with the next
request that needs it. Hibernating instances are left asleep.

### carlos schedule

Gives an app a timetable. A schedule is a time and a path: at each fire the
app's own instance gets a POST at that path, so the work is a route your app
already serves rather than a separate worker. The sub-verbs are `ls`, `set`,
`rm` and `run`.

```sh
carlos schedule set --app hello --name nightly --every 6h --path /jobs/nightly
```

`--every` takes whole minutes, from `1m` up to `720h`; `--cron` takes a
five-field expression instead, and you give one or the other, never both.
`carlos schedule ls` prints the declared schedules alongside what each
instance reports it will do next and what it did last. `carlos schedule run
--app hello --name nightly` asks for one out-of-band run on top of the normal
timetable, and every instance fires within about fifteen seconds.

The wording is deliberate: `set` records, `rm` removes, `run` requests. The
console writes one small object and every box serving the app notices on its
own within seconds; nothing is pushed at a box. The write itself wakes
nothing, and a hibernating instance is woken by its own runner when a tick
falls due. Schedules need a logged-in console; there is no direct-bucket
form.

### carlos rollback

Points a channel back at the version it was serving before.

```sh
carlos rollback --app hello stable
```

### carlos channels

What each of the app's channels is serving right now, with the tag if the
release earned one at stable.

```sh
carlos channels --app hello
```

### carlos pipeline

Shows an app's release channels and the rules for moving a version through
them, and shapes that ladder. Bare `carlos pipeline` is the `show` verb: the
channels in order, plus any change still waiting on confirmations. `init`,
`add`, `set` and `remove` edit it.

```sh
carlos pipeline init --app hello --template edge-production
```

Two starter templates exist, `edge-production` and `full-ladder`. After
that, `--bake <dur>` holds a version for a while before the channel may adopt
it, and `--passkey`, `--promote-approvals N` and `--change-approvals N` set how
much human agreement a promotion into the channel, or an edit to the channel
itself, has to collect. `set` leaves any rule flag you did not type exactly
as it was, so two people shaping different rules do not overwrite each other.

A fresh app has one channel, `edge`, and prints as a single line rather than
a one-row table. Shaping a pipeline wants a logged-in console: there is no
bucket-direct editor for it. Promoting and rolling back are unaffected and
work in either mode.

### carlos releases

Every version shipped, newest first, with the label its author typed and the
tag it earned. Channels answer "what is running"; this answers "what is there
to run".

```sh
carlos releases --app hello
```

There is one sub-verb. `carlos releases retention --keep 20` sets an ambient
prune policy, and `--dry-run` shows you what it would remove before you commit
to it. The safety list always wins over the number: channel pointers,
rollback history, tagged releases, anything inside the bake window, and each
box's own adopted versions are never pruned, so nothing promoted or recent
disappears by policy. `--off` goes back to keeping everything.

### carlos version

`carlos version` prints the build id of the binary in front of you. It is the
first thing to check when a command behaves unlike this page describes.

`carlos version target` is a separate thing wearing the same word: it sets
the semver your ships count iterations under, so `carlos ship` can mint the
next one for you.

```sh
carlos version target --app hello 0.5.0
```

### carlos env

Plain per-app config vars: `set`, `unset`, `list`.

```sh
carlos env set --app hello LOG_LEVEL=debug
```

Values land in the app's default bundle. `--environment <name>` writes a named
bundle instead, layered on top of the default when config is materialized,
and `carlos route --environment` is what binds a route to one.
`carlos env environments --app hello` lists the bundle names an app has.

### carlos secrets

The same shape as `carlos env`, sealed. `list` prints key names and never
values.

```sh
carlos secrets set --app hello STRIPE_KEY=sk_live_example
```

Sealing uses a public key; the private half lives on the box that decrypts
them and never leaves it, in either mode. `carlos secrets genkey` mints the
pair, and it is always local to your terminal.

### carlos instances

An app's instances are the places it actually runs. `carlos instances enable`
is the app's opt-in to provisioning, and until it is set the API refuses to
create anything. After that, `create`, `list`, `delete` and `set-upstreams`
work on records through the console, and the box's reconcile pass turns a
record into a live route.

```sh
carlos instances enable --app hello
carlos instances list --app hello
```

`--health <slug>` narrows the listing to one state: `running`, `asleep`,
`not-responding` and the rest. That is usually what you want when something
is wrong.

Typed on a box with no sub-verb, `carlos instances` does something different:
it lists that box's own registry routes, backing and owning unit included.
Off the box, [carlos routes](/docs/cli#carlos-routes) answers the same
question through the console.

### carlos steering

Decides whether one instance's DNS answer varies by where the request comes
from. `latency` opts the host into a Route53 latency record per armed edge,
so the nearest one answers; `off` clears the opt-in and returns the host to
the single static answer every requester shares.

```sh
carlos steering --app hello --host hello.example.com latency
```

The opt-in is recorded immediately and reaches the box's registry row at the
next converge tick, but no DNS answer changes until the deployment itself
has armed its Route53 steering converger. In v1 only instances on the shared
pool can be steered; a pool-scoped route is refused, and the refusal names
that as the reason.

### carlos routes

The app's routes on this deployment: where each one sends traffic, which
channel it follows, and which config environment it is bound to. That last
column is the one worth knowing about, because it decides which sealed
secrets the route's process is delivered.

```sh
carlos routes --app hello
```

It reads the console's own box, so on a multi-box fleet a short answer is not
necessarily a complete one. The command says so every time it prints.

### carlos domains

Attaches a customer's own hostname to one of the app's routes, detaches it,
or lists what is claimed.

```sh
carlos domains attach --app hello www.example.com
```

`--route` picks which route to point at, and you can leave it off when the app
has exactly one instance record. The hostname comes live on the box owning
that route at its next domains pass, certificate and all. The `list` verb
joins the claims to the fleet's own readings sweep, so DNS state, certificate
expiry and delegation are readable without leaving the terminal.

### carlos features

Sets or lists an app's own feature flags — switches the app defines, the
platform stores and serves, and nobody but the app interprets.

```sh
carlos features set --app titogo sandbox=on
carlos features list --app titogo
```

Keys and values are the app's vocabulary (`sandbox=on`, `beta-ui=v2`); the
platform never reads them. `key=` with nothing after the equals clears a key.
The app finds the map on the `deployment` block its instance token already
fetches beside `managed_domains`, so a change lands on its next poll — no
restart, no environment edit, no root-owned file on an edge box. Setting is
an admin-role write and every change is audited under the app's Activity;
the app's own instance credential can read the flags but never set them.

### carlos logs

The app's own stdout and stderr, merged with the platform's events about it:
wakes, restarts, and failures with the reason. A site served from files has
no app stream, but its platform events still show up.

```sh
carlos logs --app hello --since 1h -f
```

`-f` follows, polling every two seconds until you interrupt it. `--grep` takes
an RE2 pattern, `--stream app` drops the platform commentary, and `--host`
narrows to one instance.

### carlos store

Object storage for an app. `create` declares that the app wants a bucket,
which is a request and not a provision — nothing exists in any cloud account
until an operator runs `grant`. `status` shows what is declared, granted and
delivered, including a rotation that stopped half way.

```sh
carlos store create --app hello
carlos store status --app hello
```

`carlos store rotate` mints a fresh credential and leaves the old one live
until you run it again with `--finish`, so the app has a window to pick the
new one up. Rotating, declaring and reading status are member verbs and want
nothing but your bearer token. `grant` is the one that spends money in the
deployment's own cloud account, so it also wants an address on
`CARLOS_STORE_OPERATORS`; that check runs after the account gate, so a
stranger still meets the same 404 as everyone else rather than a 403 that
would confirm the app exists.

### carlos email

Tenant email sending. `carlos email enable` is the whole path in one
command: it declares the From address the app sends as, ensures a sending
domain, waits for SES to verify it, and delivers SMTP credentials to the app
as env vars under a prefix — `CARLOS_SMTP` unless `--env-prefix` names
another.

```sh
carlos email enable --app hello
carlos email test --app hello --to you@example.com
```

On a custom domain, `enable` prints the DNS records to publish and then
keeps polling until SES confirms them, giving up after ten minutes unless
`--timeout` says otherwise; a wait that gives up exits non-zero and names what
SES never confirmed. `carlos email domains add` is that same half on its own,
for a second domain on an app already declared.

`carlos email test` sends a real message and reports what SES said about it.
It sends through a throwaway standalone credential it mints and revokes
around the send, so it never needs the delivered credential's password, and
it proves that mail leaves the building rather than that the console believes
it should.

`status` shows every domain's per-region verification state, the day's count
against the cap, and whether sending is paused. `credentials create` mints a
standalone SMTP credential for something not running on CARLOS — a laptop, a
cron box — printed once on that command's output and nowhere else. `rotate`
mints a fresh delivered credential and leaves the old one live until you run
it again with `--finish`. `pause` and `resume` are operator verbs. None of it
has a direct-bucket form; all of it wants a logged-in console.

### carlos ledger

Append-only hash-chained ledgers an app can publish. `append` adds one JSON
entry to a chain, `head` prints that chain's current head, `list` shows the
app's ledgers and what it publishes, and `publish` decides which of them are
served publicly.

```sh
carlos ledger append --app hello carbon entry.json
```

`blob` uploads files to a chain as content-addressed blobs and prints each
one's sha, so an entry can point at it. Uploads are create-only and capped at
4 MB a file, and re-uploading identical bytes does nothing.

Ledgers have no direct-bucket mode at all: every sub-verb except `verify`
goes through the console, because a contributor's machine is never given
bucket credentials. `carlos ledger verify` walks a published chain over plain
HTTPS and re-hashes every entry. It needs no credentials at all: anybody can
check a ledger you publish, including you, from a machine that has never been
logged in.

### carlos vet

Checks a shipped release against the platform contract before anyone promotes
it. The manifest has to exist and parse, and every artifact's stored bytes
have to match the sha256 and size it claims.

```sh
carlos vet --app hello --version a1b2c3d --boot
```

`--boot` goes further and runs the binary: it must accept `-socket <path>`,
serve HTTP on that socket, and answer `GET /healthz` with a 200 within ten
seconds. That is the entire app contract, and this is the cheapest place to
find out you have broken it.

### carlos update

Replaces the `carlos` binary on your workstation with the latest published
release, checking the signed checksums before it swaps anything. Where a
package manager owns the install, it prints the `brew` or `apt` command
instead of fighting it.

```sh
carlos update
```

It refuses to run as root, and refuses on a box: box binaries are rolled by
the platform, and a self-updating box would fight that machinery. `-y` skips
the confirmation, though it still wants a terminal.

## Your deployment

The verbs for the person who owns the boxes. Some of these run against a
console like the app commands above; others open a box's registry directly
and only make sense while you are standing on it.

### carlos bootstrap

Prepares a host to be a CARLOS box: the service user, the data directories,
the systemd units. Run it once per host, as root.

```sh
carlos bootstrap
```

`--root <dir>` writes the files into a staging directory instead, creating no
users and running no systemctl, so you can read what it would do before it
does it. `--offcloud` is for a box outside EC2, where credentials come from a
staged 0600 file instead of an instance profile.

### carlos accounts

Accounts are the tenancy primitive: apps, fleets, credentials and bucket
prefixes all hang off one. `create` mints an account and prints the sqid
every object underneath it is keyed by.

```sh
carlos accounts create --name acme --owner someone@example.com
```

`--owner` is the path for a box or a CI job, where there is no browser to log
in with. It needs no identity of its own and takes precedence over any
logged-in one.

`carlos accounts migrate` copies an app's objects to an account-qualified
prefix and re-stamps its routes. Run it with `--dry-run` first; it prints the
plan and touches nothing.

### carlos fleets

A fleet is a group of remote boxes an account owns, dialing in to this
console over a channel named `<fleet>/<label>`. Create one against the
customer's own data bucket, then register each box.

```sh
carlos fleets create --bucket acme-data acme
carlos fleets add-box acme pi-1
```

The box's bearer token prints exactly once, at `add-box`. The console keeps
only its hash, so losing that output means `rotate-token`; a second `add-box`
will only refuse the label. Put it straight into the box's credential store.

Rotation is not revocation. A fresh token refuses the box's next dial-in with
the old one, but it does not evict a channel the box is already holding. If a
credential may be compromised, `detach-box` is the command that actually
stops it.

### carlos services

Credentials a server holds rather than a person: a CI job that ships, a
sidecar that reads instances. Reach is fixed at mint, so adding you to
another account later does not widen it, and it has its own rate-limit budget.

```sh
carlos services create --role publish --app hello ci-shipper
```

Pick the narrowest role that works. `publish` ships releases, `instance` is
what a box-side reader wants, `operate` administers, and `admin` includes
`store grant`, which mints a path-scoped IAM user; treat that one as a real
handover. `--app` binds the credential to one app, which also means it cannot
create apps.

The secret prints once, same as a fleet token, and the same distinction
applies at the other end: `rotate` refuses the credential's next call with
the old secret, `revoke` stops it whatever secret it holds.

### carlos add

Writes a route straight into a box's registry: this hostname, served by this
app, following this channel. It is the box-local, operator-side counterpart
to an instance record.

```sh
carlos add --app hello --socket /run/hello.sock hello.example.com
```

`--channel` sets what the route follows, `--kind` picks instance, service or
static, and `--addr` takes a TCP upstream where the app is not a socket
tenant. `--unit console.service` names the systemd unit that owns the route's
process, which is what lets adoption cycle it; leave it off for an ordinary
exec child.

### carlos remove

Drops one of this box's routes. It stops routing the hostname and never
touches the instance's database.

```sh
carlos remove hello.example.com
```

### carlos route

Changes one thing about a route that already exists. Each axis is its own
operation and the command refuses to combine them, because a capability grant
and a repoint are different acts with different safety rails, and a command
that did both would commit them together.

```sh
carlos route --host hello.example.com --channel edge
```

`--channel` and `--environment` repoint, and those two may be given together.
`--grant` and `--revoke` change a capability. `--hibernate` lets the route sleep
when idle. `--backing` and `--unit` are two answers to one question — who owns
this route's process — so the command will not let you write both.

Repointing the channel is the half to be careful with. Adoption converges a
route onto whatever its channel currently points at, so moving the channel
changes what production serves on the next pass; the command resolves the
target pointer first and refuses a version change unless you pass
`--allow-version-change`; `--dry-run` runs the same rails and prints the plan
without writing. And once a route is `Provisioned`, its channel and
environment belong to its instance record: `carlos route` refuses both axes
on such a row and names the record, because the reconciler would revert you
within seconds anyway.

### carlos release-keygen

Mints the deployment's root signing key, or a scoped key that can sign only
certain rungs of the ladder.

```sh
carlos release-keygen --scope canary,edge --name builder
```

With no flags it prints a fresh root pair: the key goes into your secret
manager, the public half into host config. With `--scope` it prints a key and
a grant. The grant carries no secret material but has to travel with the key,
because a scoped key on its own signs pointers nothing will accept. Only the
root key can mint a grant, which is what stops a scoped key widening itself.

### carlos economics

Records one month's AWS bill so the console's economics dashboard has a real
number to divide by.

```sh
carlos economics bill --month 2026-08 --total 412.55 --line AmazonEC2=55.00
```

Operator only, and the console answers everyone else with the same bare 404
it gives an unknown route. A "not found" here almost always means your
account lacks the fleet-operator bit, not that you typed the path wrong.

`carlos economics backhaul` shows what serving through region edges costs
the platform this period: the part of each account's egress that was
backhauled from its home box, priced at the rate card's inter-region
$/GB and absorbed — it appears in nobody's bill.

```sh
carlos economics backhaul --period mtd
```

### carlos status

`--live` prints what every box in the fleet last reported about itself:
release, tunnel state, memory, load, free disk. A box that has stopped
reporting shows as UNREACHABLE with how long it has been dark, and none of
its stale readings.

```sh
carlos status --live
```

`--dry-run <dir>` is the self-hoster's leak check. It builds a throwaway fleet
stuffed with fixture secrets, runs it through the real publish path into a
scratch directory, reads every published object back, and fails if any
fixture escaped. Run it before you ever point this binary at a real bucket.
Neither mode publishes anything: the public status page is written by each
box's own agent tick.

## On the host

These are what systemd starts. You will rarely type them, but knowing what
they do explains most of what happens between a promote and a URL changing.

### carlos edge

The front door. TLS and ACME, and the proxy that maps a hostname to whatever
is serving it. One per box, started by `carlos-edge.service`.

```sh
carlos edge --dev --http :8080
```

`--dev` serves plain HTTP with no TLS or ACME, which is how you run it on a
laptop. `--fallback` redirects unknown hostnames somewhere (an apex marketing
site, usually) instead of returning the plain 404.

### carlos agent

Edge, the hibernation activator, release adoption and the status tick, in one
process per host. This is what a box actually runs; `carlos edge` alone is
the proxy without any of the rest.

### carlos adopt

One release-adoption pass: read each route's channel, resolve what that
channel points at, fetch it if the box does not have it, and swap the
symlink. The hourly timer runs this verb.

```sh
carlos adopt
```

Adoption swaps a symlink, and on its own it does not restart anything. A
long-running unit keeps serving the old build until something cycles it, and
a hibernating tenant picks the new one up when it next wakes — so the order
that works is promote, then adopt, then restart. A route that names its
owning unit is the exception: adoption cycles that one itself, and rolls the
adoption back if the restart fails, so the version header never claims a
build the process is not serving.

`--restart-only` and `--config-only` are the narrower passes the agent asks a
root-side unit to run for it, since the agent can request a pass but cannot
write to `/etc` or restart units itself.

### carlos ops

Box operations, run by a timer or by an operator standing on the box.
`litestream` regenerates the replication config from the registry and the
data directory, printing `changed` or `unchanged` so the caller knows whether
to restart replication. `restore-verify` restores every configured replica
from S3 and integrity-checks it. `hibernate-verify` does the same drill for
the replicas the config does not name — hibernating instances, whose
replication belongs to the activator — and publishes a per-host verdict to
the deployment bucket so you can read it off-box.

```sh
carlos ops restore-verify
```

## Everything else

`carlos help` belongs to all three roles above; `carlos canary` belongs
to none of them yet.

### carlos help

Prints the command list, grouped the way this page is. It goes to stdout and
exits 0, so `carlos help | less` works. A bare `carlos` with no arguments
prints the same text on stderr and exits 2, because that one is a mistake.

### carlos canary

Reserved, and not implemented: typing it exits with `not implemented`.
Canary releases today are ordinary channels named `canary/<something>`,
promoted with [carlos promote](/docs/cli#carlos-promote) like any other rung.

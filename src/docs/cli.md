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

## Describing changes

Add a short description to a mutation with `--message`. Commands sent through the console record it alongside the exact Activity operation and target.

```sh
carlos deploy --message "Fix invoice total rounding" ./app-linux-arm64
```

This applies to `ship`, `deploy`, `promote`, `rollback`, `restart`, `instances create`, `instances delete`, `features set`, `env set`, `env unset`, and `env exec-delivery`. A `deploy` command uses one description for both `ship` and `promote`.

In an interactive terminal, these commands ask for a description by default. Automation never receives a prompt. `restart --dry-run` also never prompts. Use `--no-prompt` to skip the question. To disable the default prompt, add this to `.carlos/config`:

```json
{"message_prompt":"off"}
```

An explicit `--message` still works with either setting. An empty description is valid. Messages must be valid UTF-8, contain no control characters such as line breaks or tabs, and be no longer than 240 Unicode characters. Never include secrets.

Release `--label` and release notes describe the release separately from a mutation message.

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
so a checkout pins its own deployment. With `-d <name>` it shows or sets the
console of one [destination](/docs/cli#deploying-one-checkout-to-several-places).

### carlos config

Edits `.carlos/config` for you, so you never have to hand-edit its JSON.
`carlos config destinations` manages the named places that
[carlos deploy](/docs/cli#carlos-deploy) and every other command reach with
`-d <name>`:

```sh
carlos config destinations add production --console https://carlos.example.com --app shop
carlos config destinations add partner --console https://carlos.example.org --app shop
carlos config destinations
carlos config destinations default partner
carlos config destinations set partner --account me@example.org
carlos config destinations rename partner eu
carlos config destinations remove eu
```

`add` takes `--console`, `--account`, `--app`, `--kind`, `--artifact` and
`--target`, and `--default` makes the new destination the default. `set`
changes the same keys on an existing destination, and an empty value
(`--app ""`) removes a key. `list`, which is also what the bare command does,
marks the destination used when none is named with `*`.

Each verb edits the nearest `.carlos/config` in this directory or above it,
and creates `./.carlos/config` when there is none. `--global` edits
`~/.carlos/config` instead. `add` warns when this machine is not logged in to
the destination's console, and still writes the destination, so you can set
up a console before you log in to it.

These commands never let a file quietly start deploying somewhere new. If the
file already names a console, account or app at the top, adding the first
destination moves those keys into a destination of their own, which becomes
the default. At a terminal, `add` asks what to call it; elsewhere you name it
with `--from-current <name>`. When a second destination is added, the first
one is recorded as the default. Removing the default is refused while more
than one other destination remains.

### carlos apps

Claims an app name, moves an app onto a customer fleet, and deletes or
restores one. Creating goes through the same door the console's New app form
uses, so a name that form would refuse is refused here too.

```sh
carlos apps create --app hello
```

`--region <code>` sets the region the app's instances start in. Without it,
the console picks the region nearest you from your timezone, and the command
prints one line saying which and why:

```sh
carlos apps create --app hello --region uk
```

A name is also refused when its platform apex, `<app>.<account>.<apps
domain>`, is already taken: by another app's instance, even one in the Trash,
or by any route there at all. The new app would otherwise never get an address
of its own. Renaming an app, or moving it to another account, is checked the
same way. The error names whatever holds the address. Remove that instance
first, or pick another name.

`carlos apps delete` moves an app to the Trash. Every route drops, custom
domains included, the name stays reserved, and you have thirty days to
`carlos apps restore` it, or three for a temporary app. Restoring brings back
releases, channels and the production flag exactly as they were, but no
routes at all, not even the platform apex, so plan on adding those again.
A temporary app is different: its instance records are kept in the Trash, so
its hosts put its routes back on their next pass after a restore, with nothing
to add by hand. Delete is refused while the app is flagged production. Clear
the flag first.

`--place fleet/<name>` at create, or `carlos apps place --target fleet/<name>`
later, puts the app's routes and instances on a fleet your account owns.
`--target ""` brings them back to platform-served. `--target` is mandatory even
in that empty spelling: leaving it off is a usage error, never a silent
clear.

Two more flags are stamped at claim time. `--control-plane` marks the app as
the control plane, after which it refuses trash, purge, rename and transfer,
and refuses a service credential's promote — owner only. `--build-probe /path`
names a path whose response body carries the running build, `/healthz` serving
`ok abc1234` being the shape; [carlos deploy](/docs/cli#carlos-deploy) then
polls that instead of the `X-Carlos-Version` header, which the edge stamps from
the route row and which therefore reports the new build before the process has
actually restarted. Both are checked against what the console echoes back, so a
write that silently failed is an error rather than a quiet lie.

`carlos apps build-probe` sets that same probe on an app that already exists,
which is the common case: most apps were claimed before anyone thought about
it.

```sh
carlos apps build-probe --app docs /api/version
```

Pass `-` instead of a path to clear it and go back to watching the header. It
is worth setting on anything you deploy often. Without it, a green deploy tells
you the release was adopted, not that the process running the old one ever
restarted — and those look identical from outside.

A temporary app is one `carlos deploy --temporary` created. When its time is
up it moves to the Trash, and it is purged 3 days later instead of 30.
`carlos apps ttl` moves its expiry, anywhere from an hour to 30 days from now.
`carlos apps keep` makes it permanent, and it keeps its `tmp-` name.

```sh
carlos apps list
carlos apps ttl --app tmp-docs 5d
carlos apps keep --app tmp-docs
```

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

Points a channel at a version you have already shipped.

**Channels belong to the app, not to the platform.** A new app is born with
one channel — `edge` by default — and that one channel is its production.
More channels are opt-in, declared by a pipeline, and named whatever the app
calls them. So there is no universal ladder to memorise: `carlos channels`
lists what this app has, and `carlos pipeline` shows the order promotion must
follow through them.

Leave the channel off and an app with one channel promotes onto it. An app
with several says so, and names them, rather than guessing:

```sh
carlos promote --app hello a1b2c3d          # the app's one channel
carlos promote --app hello a1b2c3d edge     # or name it
```

An app that declares no pipeline keeps the frozen legacy ladder,
`canary → edge → beta → stable` — beta entered from edge and stable from
beta, so "it was signed off on beta" means something, and reaching stable
cuts the release's semver tag. Channels named `canary/<something>` are never
refused, because that is what the fleet itself runs on.

Promoting the same version twice succeeds and does nothing. `--hotfix` skips
the ladder and is an operator act: it works on the direct-bucket path only,
and the console refuses it by name, so the flag never quietly does nothing.

### carlos deploy

Ship, promote, and then wait until the app's URL actually serves the new
build. Reach for this one by default; ship and promote separately when you
want the gap between them.

What it watches is worth knowing, because the two answers differ. If the app
declares a build probe, deploy asks the app's own process which build it is
running, and `live` means the process cycled. If it does not, deploy watches
the `X-Carlos-Version` header — and the edge stamps that from the route row
the moment adoption moves the symlink, whether or not anything restarted. So
a probe-less deploy can print `live` over a process still running the old
binary, and it says so while it waits. Set one with
[carlos apps build-probe](/docs/cli#carlos-apps); it is a single command per
app.

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

When `carlos deploy` creates your first app, it sends your timezone so the
console can pick the region nearest you, and prints the choice. `--region
<code>` chooses instead. On an app that already exists, `--region` must
match the app's region, or deploy stops before shipping anything.

`--temporary` creates a new app for a static site that cleans up after
itself. It is named `tmp-` plus six random letters and digits, or
`tmp-<name>` with `--app <name>`, and lives 7 days unless `--ttl` says
otherwise (1h to 30d). `--ttl` on its own implies `--temporary`. A temporary
app is served only at its own platform address, so `--host` and
`--kind binary` are refused with it, and an account holds at most 20 of them.

```sh
carlos deploy --temporary --ttl 3d ./dist
```

#### Deploying one checkout to several places

When one project deploys to more than one console, or as more than one app,
name each place in `.carlos/config` under `destinations` and pick one with
`--destination` (`-d` for short):

```json
{
  "default": "production",
  "artifact": "./bin/server",
  "destinations": {
    "production": {"console": "https://carlos.example.com", "account": "me@example.com", "app": "shop"},
    "partner": {"console": "https://carlos.example.org", "app": "shop", "target": "linux-amd64"}
  }
}
```

```sh
carlos deploy -d partner
carlos logs -d partner
```

Each destination takes the same keys as the top of the file, and any key it
leaves out comes from the top of the file. Here both destinations ship
`./bin/server`. Every command that takes `--console` also takes
`--destination`, and `CARLOS_DESTINATION` does the same job for a whole
shell. With no destination named, the file's `default` applies. A file with
only one destination needs no default. A file with several destinations and
no default refuses to guess, and so does a destination name that no config
file defines. Saved answers go into the destination you are using.
[carlos config destinations](/docs/cli#carlos-config) adds, changes and
removes destinations, so you don't need to edit the file yourself.
`--target` is unrelated: it names the platform (GOOS-GOARCH) a binary was
built for.

### carlos canary

Deploy onto a host and a channel belonging to this branch alone, so nothing
the app already serves changes. It creates the canary's instance record if
it needs to, ships, promotes, and then waits on the canary URL's own
`X-Carlos-Version` — the same proof [carlos deploy](/docs/cli#carlos-deploy)
demands, pointed somewhere that cannot disturb production.

```sh
carlos canary --app jam ./jam
```

The name defaults to the current git branch, slugified; `--name` overrides
it. A branch called `new-queue` gives you the channel `canary/new-queue` and
the host `new-queue-jam.<your account>.<apps domain>`. Since the same string
has to be both a channel segment and a hostname label, an explicit `--name`
is checked rather than quietly repaired — lowercase letters, digits and
dashes. The name and the app share one hostname label, so together they can be at most 63 characters.

`--region <code>` places a new canary in that region (default: the app's
region). It is refused for an existing canary in another region, and for an
app that runs on one of your fleets.

Promotion into a canary is never refused, on any app, from any rung. Nor
does a canary cost you a rung: canary channels sit outside every pipeline, so
a build that has been on one still enters the pipeline as a fresh build.
Canary, then promote to your entry channel, and the ladder is untouched.

**If your app carries config, reach for `--environment`.** A canary is a
second instance standing alongside a live one, and config in CARLOS is
per-app: with no bundle of its own the canary serves the app's default one,
where every origin-shaped value names the app's *main* host. Anything keyed
to that single scalar — the `Origin` header the app compares against,
magic-link URLs, a WebAuthn RP ID, the cookie `Secure` flag — refuses
requests on the canary host, so the canary serves GETs perfectly and fails
every form submission. The verb says so when you leave the flag off.

```sh
carlos env --app jam --environment jam-canary JAM_ORIGIN=https://new-queue-jam.bab.oncarlos.com
carlos canary --app jam --environment jam-canary ./jam
```

```sh
carlos canary ls --app jam
carlos canary rm --app jam --name new-queue
```

`ls` shows each canary's host, what it is serving, which config bundle it is
bound to, and what is left of its seven-day lease — refreshed every time you re-promote, so an active canary
never expires and a forgotten one starts saying so. `rm` deletes the
instance record: the host stops being served and the process goes away. The
channel itself remains, followed by nothing, and lapses at the end of its
lease; there is no pointer to delete.

One thing this is not: traffic splitting. A canary is a URL, not a
percentage of production traffic on the app's own hostname.

### carlos restart

Cycles running processes with no new version and no config change. This is
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

#### Restarting less than the whole app

An app is not always a small thing. One app can own a relay, a router, a
tunnel and every customer instance — so "restart the app" can mean cycling all
of production to pick up one credential that reached one route. Two flags
narrow it:

```sh
carlos restart --app titogo --host bill.example.com
carlos restart --app titogo --environment relay
```

`--host` cycles exactly that route. `--environment` cycles every route reading
that named config bundle, which is the one to reach for after a
[carlos secrets set](/docs/cli#carlos-secrets) or
[carlos env set](/docs/cli#carlos-env) on the same `--environment`: a bundle is
delivered to an environment, so "restart what reads this" is the request that
follows it.

Both narrowed forms print the routes they addressed — host, environment, the
unit that owns the process where there is one, and which of them were asleep
and so left alone. `--app` on its own still prints the single line it always
has; `--dry-run` is how you see its set.

```sh
carlos restart --app titogo --environment relay --dry-run
```

A dry run resolves the selector, names every route it would cycle, and stops
there. Nothing is written and nothing restarts.

Precedence, when you give both: `--host` wins, but only after the console
checks that the host really does read that environment. If it does not, the
command refuses rather than picking one — one of the two flags is a typo, and
this is not a verb to guess on. A selector that matches nothing is refused the
same way, and the refusal lists the hosts or environments the app actually
has. Nothing is ever widened back to the whole app.

Two limits worth knowing. The console resolves the selector against its own
box's registry, and it refuses a selector nothing there matches — so on a
multi-box fleet you can only ask for a `--host` or an `--environment` that at
least one route on the console's own box reads, and the printed set is what
that box can see. A request it does accept is a bucket object every box
converges on, and each box applies the same selector to its own routes; those
other routes are cycled without appearing in the list. And a console or a box
that predates these flags does not understand a narrowed request: the console
answers that it has no such door, and a box that has not been rolled yet simply
does nothing. Neither one turns it into a restart of everything.

### carlos db

Reads a copy of an instance's database. The platform keeps a replica of
every sleeping instance's database. This command restores that replica on
your machine. It never touches the live database.

```sh
carlos db pull --app hello --out hello.db
carlos db query --app hello --sql "SELECT count(*) FROM users"
```

`pull` saves the copy at the path you give with `--out`. The path must not
exist yet, and the file is readable only by you. `query` restores a fresh
copy, runs one query against it, and prints the rows to stdout with a header
row, separated by tabs. The copy is deleted when the query finishes.

Both say how recent the copy is: the last transaction it holds, and when
that transaction was written. A sleeping instance's copy is as recent as its
last sync before it went to sleep. A busy instance can be ahead of its copy.

The copy is read-only. A query that tries to change it fails with SQLite's
own error, `attempt to write a readonly database`. That is on purpose.
Changing a copy would change nothing on the instance, and a command that
seemed to succeed would say otherwise.

If the app has more than one instance, name one with `--instance`. Only
instances that sleep have a replica. An instance on your own fleet, in
another region, or in a pool cannot be read this way, and the command says
which.

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
bundle instead, layered on top of the default when config is materialized.
`carlos env environments --app hello` lists the bundle names an app has.

Binding a route to a bundle is a different verb depending on the route.
[carlos instances set-environment](/docs/cli#carlos-instances) is the one to
reach for: on a provisioned route the binding lives in the instance record,
and the reconciler converges the row from that record every pass — so
`carlos route --environment`, the box-local operator form, is reverted within
seconds and refuses such a row by name. `carlos instances create` takes
`--environment` too, which is how a route is born on the right bundle rather
than moved onto it.

Some routes are ones carlos proxies to without owning the process behind them.
Setting config for one of those writes the file and stops there. The program
carries on with the old values until its own supervisor restarts it. `set` and
`unset` say so, naming the routes it applies to, and say when they could not
work it out rather than staying quiet about it.

### carlos secrets

The same shape as `carlos env`, sealed. `list` prints key names and never
values.

```sh
carlos secrets set --app hello STRIPE_KEY=sk_live_example
```

Sealing uses a public key; the private half lives on the box that decrypts
them and never leaves it, in either mode. `carlos secrets genkey` mints the
pair, and it is always local to your terminal.

An empty value is refused rather than stored. A command substitution that
produced nothing looks exactly like a real value at the point you type it, and
a stored empty secret usually surfaces much later as a feature quietly not
working. Use `carlos env set` for a value that is meant to be empty.

### carlos instances

An app's instances are the places it actually runs. `carlos instances enable`
is the app's opt-in to provisioning, and until it is set the API refuses to
create anything. After that, `create`, `list`, `delete`, `set-upstreams`,
`set-channel` and `set-environment` work on records through the console, and
the box's reconcile pass turns a record into a live route. A password in
front of an instance's hostname is `carlos gate`.

An instance may sit at any free label under the account's platform domain,
but not at another app's platform apex. That is refused while the other app
is live and while it is in the Trash, since restoring it would bring the
clash back.

`--addr` on `create`, and `set-upstreams`, point an instance at TCP backends
of its own. Only a platform operator can set them, because the edge reaches
those addresses from inside the platform. If an instance already has
backends, you can still keep them, remove one, or change its other
settings; you cannot add a new one.

```sh
carlos instances enable --app hello
carlos instances list --app hello
```

`--health <slug>` narrows the listing to one state: `running`, `asleep`,
`not-responding` and the rest. That is usually what you want when something
is wrong.

The `DB` column is the size of each instance's SQLite database on disk,
including its write-ahead log, as its box last measured it. Boxes measure
every few minutes, and asleep instances are measured too. A dash means no box
has measured it: the instance is not running anywhere yet, it has not created
its database, or it keeps its data somewhere CARLOS does not manage.

`--environment <e>` on `create`, and `set-environment` on a route that
already exists, bind one instance to one of the app's named config bundles.
This matters most for a route standing **alongside** a live one. Config is
per-app, so a second instance inherits the default bundle, and for anything
the app keys off a single origin — the `Origin` header it compares against,
magic-link URLs, a WebAuthn RP ID, the cookie `Secure` flag — that bundle
names the *other* host. The result is a host that serves every GET perfectly
and refuses every POST. Write the bundle with `carlos env --environment`,
bind it here, then restart the instance to pick the values up.

```sh
carlos instances set-environment --app jam --host new-queue-jam.bab.oncarlos.com --environment jam-canary
```

Without `--region`, a new instance starts in the app's region. An instance in a fleet starts where the fleet runs, and a pooled, static or replica instance starts in the home region.

An instance can also be an account's **replica**: a second instance of the
same app, holding a one-way mirror of the live instance's data, placed near
the buyers so a sale does not wait on the home region.
`carlos instances create --app jam --host checkout-uk.jam.bab.oncarlos.com
--region uk --role replica` provisions one. It needs `--region`: the replica
lives where you place it, and only the box carrying that placement mints it.
The live instance's own record names where replicas are wanted —
`--replicas ie,uk` on its create — and that is what publishes the placement
to the edge: the account's public hosts become servable in those regions,
with DNS latency routing still pointing buyers at the home. A replica never
holds the account's authoritative data, and until a batch of orders drains
home it holds order data in its own region — so the placement set is an
explicit decision on the home's record, never a default.

#### Storage of its own, for every instance

`--private-storage` on `enable` is one declaration that changes what every
later `create` does. The app says, once, that each of its instances gets a
config environment of its own with an object store bound to it — and from
then on `carlos instances create` derives the environment from the host's
first label, provisions that environment's bucket and IAM user, and delivers
the coordinates into the bundle the new instance reads. No `store create`, no
operator, no second command.

```sh
carlos instances enable --app jam --private-storage
carlos instances create --app jam --host acme.jam.bab.oncarlos.com
#   created instance acme.jam.bab.oncarlos.com (channel stable, environment acme)
#     private storage: bucket carlos-bab-jam-acme
```

This is the shape for a managed product with one instance per customer, and
the split is the point: declaring the policy is a signed-in person's act that
no service credential can perform, while spending it is the ordinary create
door an `instance`-role credential already reaches. So a public signup path
provisions a tenant's bucket without ever holding the power to create one.

Three things to know before you turn it on:

- The account needs an **approved storage entitlement** (`carlos store
  apply`) and the deployment needs object storage configured. `enable`
  refuses the policy rather than letting it fail once per signup.
- The host's first label becomes the environment name, so it must be a legal
  one: lowercase letters, digits and hyphens, at most 32 characters, and not
  `default`. A label that cannot name a store is refused at `create`, before
  anything is written.
- **Nothing is ever torn down automatically.** Deleting an instance leaves
  its bucket, exactly as it already leaves the parked database. `carlos store
  status --app <a>` lists every store the app has, which is where an
  abandoned one is visible; destroying it is the console's own action, behind
  the typed bucket name and a passkey.

An app may have at most 1000 environment stores by default; a deployment sets
its own limit with `CARLOS_STORE_MAX_PER_APP`. The limit exists because each
store is an IAM user as well as a bucket, and AWS allows 5,000 IAM users per
account — so it bounds one app, not the deployment. Five apps at the default
would reach that quota between them.

`--private-storage=false` turns the policy off. Instances created before it
keep the bindings and buckets they already have.

**The edge-local door.** Some apps run their own processes on a box beside their instances: a router that serves many customers under one domain, a relay, a sync loop. Dialling each instance's socket directly stops working when an instance sleeps, moves to another box, or changes where its socket lives. The edge-local door is one socket those processes dial instead, wherever the instance is.

```sh
carlos instances door-key create --app hello --label router
curl --unix-socket /run/carlos/edge-local.sock \
  -H 'X-Carlos-Door-Key: cdk1.…' https://acme.hello.bab.oncarlos.com/
```

The door handles a request the way the edge handles one from the internet. It wakes a sleeping instance, forwards to the box that holds a moved one, and applies the password gate. It only reaches the key's own app. Any other host answers as unknown.

The door believes no visitor address the caller sends. To your instance, a door request looks like one the box itself made to the public URL: it carries the box's public address, over `https`. If your app needs the visitor's address, have your process send it in a header your app signs and checks itself.

The door is off until a box sets `CARLOS_EDGE_DOOR=/run/carlos/edge-local.sock` and its agent restarts, and the calling process's user must be enrolled with `carlos bootstrap --socket-consumer <user>`. A revoked key stops working within 30 seconds, or within 10 minutes on a box that cannot reach the bucket. A key's record the console has not re-signed for 72 hours stops working too, so a console that stays down that long closes the door.

Typed on a box with no sub-verb, `carlos instances` does something different:
it lists that box's own registry routes, backing and owning unit included.
Off the box, [carlos routes](/docs/cli#carlos-routes) answers the same
question through the console.

### carlos sidecars

A sidecar is a member that nothing can dial: a process the platform runs for
your app that binds no socket, has no hostname, and never appears in DNS or
at the edge. It is for the work that has no request behind it — a bot that
holds a connection out to somewhere else, a worker that wakes on a schedule,
anything an inbound URL would be the wrong shape for.

`carlos sidecars enable` is the app's opt-in, and it is where the policy
lives: `--args` is the argv the platform execs your release binary with, and
it is app-wide rather than per-sidecar, because it is a property of what your
current release can be asked to do. One binary runs every sidecar, and each
child learns which one it is from `CARLOS_SIDECAR_NAME` in its environment.

```sh
carlos sidecars enable --app eleven --args 'bot run'
carlos sidecars create --app eleven bot-acme
carlos sidecars ls --app eleven
```

Sidecars hibernate by default, and a sleeping one has only two ways back up:
its own schedule, or `carlos sidecars wake`. Nothing can dial it awake, which
is the difference that matters when you are reasoning about one — an instance
that goes to sleep is woken by its next request, and a sidecar has no next
request. `--no-hibernate` on `enable` makes the app's sidecars always-on
instead: the record exists, so the process runs.

```sh
carlos sidecars wake --app eleven bot-acme
carlos sidecars logs --app eleven bot-acme
carlos sidecars rm --app eleven bot-acme
```

`--idle` and `--max-run` on `enable` are the two ceilings. `--idle` (default
5m) is how long a hibernating sidecar may sit with nothing to do before it is
stopped; `--max-run` (default 1h) bounds a single run whether or not anything
is happening, which is the guard against a worker wedged in a reconnect loop.

`--placement no-inbound` restricts an app's sidecars to boxes that have
declared they serve no inbound traffic at all. The box declares it and the
record asks for it, independently and on purpose: one is a fact about the
network, the other a requirement of the work. Where they disagree the more
restrictive reading wins.

Because a sidecar has no URL, there is no `X-Carlos-Version` header to read
it back from, so `carlos sidecars ls` shows the version a sidecar reported
for itself against the version its channel points at. One that has never
reported reads as unknown rather than as current.

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

A **static site on a platform hostname is steered from the moment it is
created** — you do not have to ask. Static is the one kind every edge can
serve on its own, straight from the channel pointer, so there is no reason
for one edge to answer for all of them. `off` turns it back off if you want
a single answer, and nothing re-applies the default to a host that already
exists. Custom domains are not steered for you, because their DNS is yours:
point them at the steering hostname the app's Settings page names.

### carlos routes

The app's routes on this deployment: where each one sends traffic, which
channel it follows, which config environment it is bound to, and how often
its database is replicated off the box. The environment column is the one
worth knowing about, because it decides which sealed secrets the route's
process is delivered. The replication column reads `default` until somebody
sets a rung with `carlos route --replication`; the default syncs on every
change.

```sh
carlos routes --app hello
```

It reads the console's own box, so on a multi-box fleet a short answer is not
necessarily a complete one. The command says so every time it prints.

Its `DB` column is each route's SQLite database size, the same figure as in
[carlos instances](/docs/cli#carlos-instances).

### carlos domains

Attaches a customer's own hostname to one of the app's routes, detaches it,
or lists what is claimed.

```sh
carlos domains attach --app hello www.example.com
```

`--route` picks which route to point at, and you can leave it off when the app
has exactly one instance record. The `list` verb joins the claims to the
fleet's own readings sweep, so DNS state, certificate expiry and delegation
are readable without leaving the terminal. The hostname comes live on the
box owning its route at its next domains pass, certificate and all.

On a deployment that sets `CONSOLE_DOMAIN_PROOF=true`, a hostname is not
served until you prove you control it. `attach` reserves the name and prints
a TXT record to add, at `_carlos-challenge.<hostname>`. Once the record is
there, run:

```sh
carlos domains verify --app hello www.example.com
```

If the record is already in place when you attach, `attach` verifies it
straight away. Until then the name stays in the `unverified` state, and a
reservation nobody proves lapses after seven days. Someone who does prove
control can take it over sooner. Names under your own account's platform
domain need no record. `--channel` on `verify` is only needed when the
hostname will be the app's first route and the app follows more than one
channel.

The console always refuses its own hostname, and names under another
account's platform domain (`<their-account>.<apps-domain>`). By default it
accepts every other name, including names under the console's domain and
under the apps domain. That fits a self-hosted deployment, where one person
owns the whole zone. A deployment that hosts apps for other people sets
`CONSOLE_RESERVE_PLATFORM_DOMAINS=true` on the console. Then the console also
refuses every name under the apps domain and under its own hostname, because
those names belong to the operator and not to a tenant.

On a platform hostname, an app can set cookies for its own hostname or for
its own account's platform domain (`<your-account>.<apps-domain>`), so your
apps can share a cookie. Browsers would otherwise let an app set a cookie
for the whole apps domain, and every other account's apps would get it. So
when a cookie's `Domain` names anything wider, or another account, the edge
removes the `Domain` and the cookie only goes back to the hostname that set
it. Custom domains are left as they are.

#### One name per instance: `*.<parent>`

For an app with instances, attaching `*.<parent>` gives every instance a
name under your own domain. An instance at `acme.bab.oncarlos.com` then also
answers at `acme.example.com`. The label is the first part of the
instance's own hostname.

```sh
carlos domains attach --app teams example.com --route www.bab.oncarlos.com
carlos domains attach --app teams '*.example.com'
carlos domains list --app teams
```

- **Create the instance, get the name.** A new instance gets its name with
  no further call, and a deleted one loses it.
- **Prerequisites.** `<parent>` itself must already be attached to an app in
  the same account. Any app will do; a static site is common. A wildcard DNS
  record (`*`) for `<parent>` must point at this deployment.
- **Who can attach it.** Only a signed-in person can attach or detach a
  catch-all, never the app's own token. Quote the star, or your shell
  expands it.
- **What wins over it.** A hostname that has its own claim always wins over
  the catch-all, so `www.example.com` can still go to a different app.
- **What it reserves.** While the catch-all is attached, no other account
  can claim the name of one of your instances. Publish the TXT record
  `_carlos-catchall.<parent>` = `carlos-catchall-account=<your account
  sqid>` and it reserves **every** `<label>.<parent>`, so a new team's name
  is safe before the team exists. `carlos domains list` shows which,
  `reserves:all` or `reserves:instances`, and names the record when it is
  missing.
- **In `list`.** The catch-all shows as `per-instance` / `instances`, and
  each name the fleet is serving follows it, marked `via *.example.com`.

Each name gets its own certificate, as any attached hostname does. Let's
Encrypt limits how many new certificates one domain gets in a week. An app
expecting many new instances a week should also enable `--wildcard` on
`<parent>`'s own claim, so one certificate covers every name.

```sh
carlos domains detach --app teams '*.example.com'
```

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

### carlos gate

Puts one shared password in front of an app's hostnames — for a static site
or a prototype that should not be world-readable. Visitors see a plain page
asking for the password and stay signed in for a week; the app behind it
never sees the cookie.

```sh
carlos gate set --app site
carlos gate list --app site
carlos gate clear --app site
```

`set` reads the password from `--password` or, without it, one line from
stdin, so it need not land in your shell history. Without `--host` the
change applies to every instance of the app; name one to narrow it. Changing
or clearing the password signs every visitor out at once. Custom domains
attached to the app are gated along with the platform hostname. This is a
curtain in front of the whole hostname, not accounts for the app's own
users; an app with real sign-in keeps doing that itself.

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

### carlos errors

One row per distinct error, newest first, with how many times it happened
in the window and where. Two sources need no wiring at all: log lines the
app tagged `error` (or `warn`, if you set the level) and 500s the app
answered through the edge. Server-side and browser hooks come later. A 502,
503 or 504 is not here: it says the instance could not answer, not that the
request failed, and `carlos availability` has it.

```sh
carlos errors --app hello --since 24h
carlos errors --app hello --fp 3f2a9c1b5e7d0a4c
carlos errors --app hello --set-level warn
```

`--fp` expands one group to its occurrences. `--level warn` widens a single
read without changing the setting; `--set-level` changes it for the app.
The same view is the Errors tab on the app's dashboard.

### carlos availability

The requests an app's instances could not answer — every 502, 503 and 504
the edge saw — grouped by cause rather than by page: the instance refused
the connection (down, or mid-restart), closed it mid-request, timed out, no
box of the fleet was connected, or the app answered 503 itself. One outage
is one row however many pages it hit, and a scanner probing forty paths of
a dead instance is one row too. The platform's own events about the
instance — failed wakes and exits — are listed beside them.

```sh
carlos availability --app hello --since 24h
carlos availability --app hello --fp 3f2a9c1b5e7d0a4c
```

`--fp` expands one cause to its occurrences, each with the path it was
asking for. A request whose visitor left within five seconds is not
counted; one who gave up after waiting longer is, as an outage.
Records the edge filed before causes were recorded are grouped under
"cause not recorded". The same view is the Availability tab beside Errors.

### carlos analytics

Page views, daily visitors, bytes served, top pages, top referers and named
events, counted at the edge as it serves your app: no JavaScript, no cookie,
no stored IP. Off until you turn it on, for one app or for the whole account.

```sh
carlos analytics --app hello --set-count edge
carlos analytics --app hello --range 7d
```

`--range` is `today`, `7d` or `30d`; multi-day visitor totals are daily
visitors summed. The same view is the Analytics tab on the app's dashboard,
and the switch is on the Settings tab too.

When the deployment has a GeoIP database, page views are also counted by
country. A visitor the database could not place counts as `unknown`. The
Analytics tab credits the database the counts came from.

### Headers your app receives

On a deployment with a GeoIP database, every request the edge passes to your
app carries the visitor's rough location:

| Header | Value |
|---|---|
| `X-Carlos-Geo-Country` | the country, as an ISO 3166-1 code such as `IE` |
| `X-Carlos-Geo-Subdivision` | the state or province, as an ISO 3166-2 code such as `US-WA`. Only some databases have these |
| `X-Carlos-Geo-Lat`, `X-Carlos-Geo-Lon` | a point, to two decimal places |
| `X-Carlos-Geo-Source` | which database answered, such as `DBIP-City-Lite` |

Any of them can be missing. They are all missing when the deployment has no
database, when the database has no answer for the address, and on calls
through the edge-local door, where the caller is a server rather than a
visitor. Treat a missing header as "unknown", never as an error.

The point is an area, not a position. These databases place an address to
the right city at best, and often only to a region or a country.

The edge removes any `X-Carlos-Geo-` header a visitor sends, so the values
your app sees are always the platform's. The visitor's address is still in
`X-Forwarded-For` if you need it.

If you cache a page that differs by country, send `Vary:
X-Carlos-Geo-Country`. The edge keeps at most eight variants of one URL, so a
page with visitors from many countries will be served from cache less often.
Don't vary on the coordinates: almost every visitor would get their own
variant.

**Credit the database.** If your app shows visitors anything worked out from
these headers, it must credit the database `X-Carlos-Geo-Source` names:

- `DBIP-…`: "IP Geolocation by DB-IP", linked to https://db-ip.com
- `GeoLite2-…`: "This product includes GeoLite2 data created by MaxMind,
  available from https://www.maxmind.com"

### carlos geo

```sh
carlos geo 81.2.69.142 --app hello
carlos geo 81.2.69.142 --app hello --json
```

The same answer the `X-Carlos-Geo-` headers carry, for an address that is
not the current request: one from a log, a batch job or a webhook. It prints
the country, subdivision, point and source, and the credit the database
requires. An address the database can't place says so. Apps call the same
door with their instance token:
`GET /api/cli/apps/<account>/<app>/geo?ip=<address>`, at most 60 a minute.

### carlos store

Object storage for an app. An account owner applies once, and a deployment
operator approves the account. After approval, `create` is the whole member
workflow: it declares the store and provisions it when the deployment has an
object-storage backend. Approval allows unlimited stores, with usage metered;
the deployment's cloud account and its cloud provider's soft bucket quota remain
the practical ceiling.

```sh
carlos store apply --account bac --note "backups for the service"
carlos store approvals
carlos store approve --account bac
carlos store create --app hello
carlos store status --app hello
```

`apply` is for an account owner. `approvals`, `approve` and `decline` are
deployment-operator commands. `decline` requires a reason:

```sh
carlos store decline --account bac --reason "storage is not available for this deployment"
```

An owner may apply again after a decline. Declining an already approved account
stops new automatic provisioning but does not tear down existing buckets or
credentials. `carlos store grant` remains the per-app operator override for an
unapproved account, for adopting an existing bucket with `--bucket`, and for
repairing a store after approval is withdrawn.

`status` adds an account line when it has never applied, is pending or has been
declined. An approved account needs no extra line. It then shows the app's
declaration and provisioning state. A human
account member may see the decline reason; the CLI does not print the
application note. Tenant-facing responses withhold the deciding operator's
address. Machine credentials receive state without the note or reason, while
operator views can show the application details they need to decide.

If provisioning fails after `create` has declared the store, run `create` again
to resume provisioning. A bucket name can remain unavailable for a short time
after the cloud provider destroys it; during that destroy/re-create window,
retry after the provider releases the name. `status` shows an incomplete store
so you can tell this from an undeclared store.

Once the store is provisioned, `status` also shows how big the bucket is. That
figure comes from a sweep the console runs once a day, so it carries the date
it was measured and can be up to a day old. Sizing a bucket means listing
every object in it, and `status` does not do that on each call. A fresh store
reads "not measured yet" until the next sweep.

#### A store for one environment

A store normally belongs to the app: one bucket, one credential, delivered
into the app's default config bundle, and every instance of the app reads it.
`--environment` declares a store that belongs to one named config bundle
instead — its own bucket, its own credential, delivered into that bundle, so
only the instances bound to it can reach it. An instance gets a bucket of its
own by being the only instance bound to its environment.

```sh
carlos env set --app hello --environment acme APP_ORIGIN=https://acme.example.com
carlos instances create --app hello --host acme.bab.oncarlos.com --channel edge --environment acme
carlos domains attach --app hello --route acme.bab.oncarlos.com acme.example.com
carlos store create --app hello --environment acme
carlos store status --app hello --environment acme
```

The instance sits at a free label under the account's platform domain; the
customer's own hostname is attached to it afterwards. `--route` is required
on `domains attach` once an app has more than one instance — the console
refuses to guess which one a hostname belongs to.

`create`, `status`, `grant` and `rotate` all take `--environment`, and each
acts on that store alone. Without it they act on the app's own store, exactly
as they always have — nothing about an app with no environment stores changes.

`carlos store status --app hello` also names every environment this app has a
store for. Tearing a store down is always an explicit act, so an environment
nobody uses keeps its bucket and keeps billing until someone destroys it;
this line is where you see one.

Two instances bound to the same environment share its store, the same way
they share its config. That is visible rather than refused: `status` names
the environment a store belongs to.

`carlos store rotate` mints a fresh credential and leaves the old one live
until you run it again with `--finish`, so the app has a window to pick the
new one up. Rotating, declaring and reading status are member verbs and want
nothing but your bearer token. `grant` requires membership in the account and a
deployment-operator address on `CARLOS_STORE_OPERATORS`; a non-member still
receives the same 404 as everyone else. `approvals`, `approve` and `decline`
require both the fleet-operator role and that allowlist entry, but the operator
does not need membership in the account being reviewed.

#### carlos store scan

Virus scanning over the objects in an app's store. **Off by default and
opt-in**: a deployment that sets nothing has no engine and runs no sweep. The
verbs that need an engine — `grant`, `sweep`, `enforce on` — refuse with a
sentence naming the variable that would wire one up. The rest keep working
without one, deliberately; see below.

```sh
carlos store scan request --app hello --plaintext
carlos store scan status --app hello
```

`request` is the member's verb, and it takes an attestation you cannot skip:
either `--plaintext` or `--client-encrypted`. **A scanner cannot read
ciphertext.** If your app encrypts objects before uploading them — which is
the default posture across this family of platforms — then no engine can say
anything about their contents, and a result claiming they are clean would be a
true-looking sentence about bytes nobody examined. Attesting
`--client-encrypted` records that honestly: the store is marked not
applicable, no sweep runs, and `status` says so instead of showing coverage.
There is no default answer because neither one is safe to guess.

The remaining verbs belong to a deployment operator on
`CARLOS_STORE_OPERATORS`, the same list `carlos store grant` uses:

| verb | what it does |
| --- | --- |
| `grant --app <a>` | turn the engine on for this store |
| `revoke --app <a>` | turn it off, and clear enforcement |
| `sweep --app <a>` | run one budget of scanning now, instead of waiting for the hourly pass |
| `enforce --app <a> on` | deny the app's own credentials read access to any object the engine tagged infected |
| `enforce --app <a> off` | lift that denial |

`revoke` and `enforce off` work even when no engine is configured. That is
deliberate: unsetting the engine on a deployment with an enforcing store would
otherwise leave the denial in place with no way to clear it.

**What `status` will and will not claim.** The coverage line always names two
numbers — how many objects were scanned, and how many were not. They are not
complements. An object too large to stream past the engine was never judged at
all, and a bucket full of them could report zero infections while nothing had
actually been looked at. An archive that expands past the engine's limits is counted as not scanned, the same as an object too large to stream. A sweep still in progress says so and says which
numbers are stale; a first sweep that has not finished claims no coverage at
all. Signature-database age is printed, and called out when it is old, because
a clean verdict from three-month-old definitions is a weaker claim than a
fresh one. The engine's database version is reported as what it is **now** —
a verdict is kept for as long as an object's bytes do not change, so a store
that has been quiet for months can show full coverage made up entirely of older
judgements. `status` prints how many verdicts this sweep actually reached and
how many it carried forward, so the two are never confused.

**Enabled is not enforcing.** With scanning on but enforcement off, infected
objects are recorded and still readable. `carlos store status` says which of
the two you have.

The operator side is six environment variables on the console. Setting `CARLOS_CLAMD_ADDR` wires an engine. It does not switch scanning on. The switch is `carlos system antivirus enable`.

| variable | default | meaning |
| --- | --- | --- |
| `CARLOS_CLAMD_ADDR` | unset | where to reach `clamd`: `host:port`, or a socket path beginning `/`. Unset means no scanning at all. A [scanner host](https://github.com/carlosframework/platform/tree/main/infra/modules/scanner-host) module output gives you this value. |
| `CARLOS_SCAN_TAG_KEY` | unset | required once an address is set, and the console refuses to boot without it. It signs every verdict, so keep it: without it, stored verdicts cannot be verified. |
| `CARLOS_CLAMD_MAX_BYTES` | 25 MiB | objects larger than this are recorded as skipped without being fetched. Set it equal to `clamd`'s own `StreamMaxLength`. |
| `CARLOS_CLAMD_MAX_SIG_AGE` | 168h | how old the signature database may get before `scan status` warns |
| `CARLOS_STORE_SCAN_BUDGET` | 60s | how much scanning one app gets per hourly tick |
| `CARLOS_STORE_SCAN_INTERVAL` | 24h | the floor before a *completed* sweep is run again. A sweep still in progress ignores it. That is how a bucket bigger than one budget ever finishes. |

`CARLOS_CLAMD_SOCKET` is still accepted as another name for `CARLOS_CLAMD_ADDR`. `CARLOS_STORE_SCANNER=clamav` is deprecated: it still wires the default socket `/run/clamav/clamd.ctl` and seeds the switch once, and the console logs a warning on every boot while it is set. `CARLOS_SCAN_TAG_KEY_PREVIOUS` is optional and holds the old key while you rotate.

The budget arithmetic is worth stating rather than discovering. An hourly tick
at 60s is 24 minutes of scanning per app per day; at a few hundred objects a
minute over `clamd`'s INSTREAM, a million-object bucket takes months, not days.
The default is honest for small and medium stores. A deployment with large ones
raises the budget or shortens the tick, and `scan status` says when a sweep has
spanned more than one tick rather than implying its numbers are current.

Setting `CARLOS_CLAMD_ADDR` without `CARLOS_STORE_BACKEND` is refused at boot. A scanner with no object stores to scan is a misconfiguration, and one loud failure beats a pass that silently finds nothing forever.

Wiring an engine is not the same as switching scanning on. The deployment-wide
switch is `carlos system antivirus` — see [carlos system](#carlos-system).

### carlos relay

A STUN and TURN relay the platform runs for your app's WebRTC calls, so a
browser can find its public address and, when two networks cannot reach
each other directly, relay through the deployment instead of a third party.

```sh
carlos relay enable --app meet
carlos relay status --app meet
```

`enable` turns it on for one app and delivers `CARLOS_RELAY` to the app's
config: a base64-wrapped JSON list of regions, each with its ICE server URLs,
a key and a username suffix. The app mints a TURN credential per call from
the key (see the relay design spec, §2). `status` shows what was issued,
which routes have picked it up, and the health of each region's relay,
none of which needs box access. `disable` removes it; every allocation the
app holds ends on the relays' next authority read, within a minute.
`adopted --host <route>` is how a member tells the platform that a
TCP-address route it restarted by hand now runs the new key — `status` names
the routes waiting on that, since they are the one shape this platform
cannot restart for you. `rotate --region <r>` is the operator's verb after
staging a new master; `keygen` prints one. After a rotation, `status` names
any master that is retiring and the time it may be dropped, box by box, since
a region is done with a key only once every relay there has stopped loading
it. `serve` is the unit's entry point and not a thing to run by hand.

`keygen` prints one line — a key id, a key, and `-` for "no retirement date"
— for a region's master key. Stage that line in `/etc/carlos/relay-masters`
on the region's boxes, mode 0640, root-owned, group `carlos`. The console
needs the same key in a different shape: set its
`CARLOS_RELAY_MASTERS_<REGION>` secret to `<kid>:<key>[,<kid>:<key>]`, the
list form being what a rotation needs while two masters are live. The region
name is uppercased with hyphens as underscores, since variable names refuse
hyphens. The key is printed once and stored nowhere by this command. Adding
a master to that secret issues nothing on its own — `rotate` is what moves
the region onto it, and it refuses until every live relay there reports the
new key id, so a rotation cannot mint credentials nothing can verify.

Know what that console copy exposes before you stage it. The console holds
every region's master as sealed config so it can derive an app's keys.
Sealed config is decryptable on every host, so a compromised host can read
every region's master and, with a master, mint credentials for any app in
that region, present and future, until the operator rotates. Per-region
masters mean a relay box holds only its own region's, and rotating one
region recovers that region.

Four console variables turn the relay on for a deployment.
`CARLOS_RELAY_REGIONS` is a comma-separated list of the regions that run
one, in the order an app hands them to the browser; unset means this
deployment has no relay, and `enable` refuses with a sentence naming the
variable. `CARLOS_RELAY_OPERATORS` is the addresses allowed to run
`rotate`. `CARLOS_RELAY_MASTERS_<REGION>` carries the masters themselves as
`<kid>:<key>[,<kid>:<key>]`, the region uppercased with hyphens as
underscores. `CARLOS_PLATFORM_DOMAIN` is the domain under which
`relay.<region>.` resolves; unset, it defaults to the apps domain with its
first label dropped, which is an inference to verify against your own DNS
rather than assume. The rest is infrastructure: the `A` record for
`relay.<region>.<domain>` and the security group's `relay = true` are staged
in the deployment's Terraform, region by region. Arm platform boxes only —
a fleet box is the customer's own hardware, and a master staged there mints
credentials for every app in the region.

`serve` is what `carlos-relay.service` execs. The unit only starts on a box
that has a masters file, so a box with no key never listens; a box with one
answers STUN to anyone and TURN to credentials an enabled app minted. It
reads its configuration from `/etc/carlos/host.env`:
`CARLOS_RELAY_PUBLIC_IP` (the address it advertises, when IMDS cannot say),
`CARLOS_RELAY_DENY_CIDRS` (peer ranges it refuses, on top of the private
ones it always refuses), `CARLOS_AWS_REGION`, `CARLOS_RELAY_MASTERS_PATH`,
and the `CARLOS_RELAY_LIMIT_*` family.

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

A sending domain can be claimed by exactly one CARLOS account at a time. A
claim that is never verified lapses after seven days, and then another
account can add the domain. If the domain already has an SES identity that
CARLOS did not create for your account, `domains add` refuses it and tells
you which TXT record to publish (at `_carlos-mail.<domain>`) to prove you
control the domain. Once that record is there, add the domain again. CARLOS
sends with an identity adopted this way but never deletes it.

`carlos email domains rm --app hello example.com` is the way back out. A
domain one app holds is unavailable to everybody else until something
releases it. `rm` is that something: it stops the app sending from the domain and, when it was
the last app using it, releases the claim so another account can add and verify
the domain, and deletes the SES identity if CARLOS created it for you. It refuses while the domain is
where the app's own From address sits — move that first with `carlos email
enable --app hello --from <addr>`. A custom domain's DNS records are yours,
so `rm` prints them rather than deleting them: the DKIM CNAMEs are dead with
the identity, while the MX, SPF and DMARC records stay correct if you ever
add the domain back.

`carlos email test` sends a real message and reports what SES said about it.
It sends through a throwaway standalone credential it mints and revokes
around the send, so it never needs the delivered credential's password, and
it proves that mail leaves the building rather than that the console believes
it should. The message is `multipart/alternative`, a plain-text part and an
HTML part, which is the shape most app mail takes. Your app can send any MIME
message it builds over the delivered SMTP credential: plain text, HTML,
multipart, attachments. Nothing on the platform side reads or rewrites the
body.

`status` shows every domain's per-region verification state, the day's count
against the cap, and whether sending is paused.

`events` is what happened to each message: delivered, bounced, complained
about or delayed, newest first, with what the receiving server said — the
line that tells you whether a bounce was a mistyped address or a full
mailbox. `--message` narrows it to one message by the id SES gave it when it
was sent, `--to` to one recipient, and `--since` to a window. Events are kept
for 30 days. Where SES names the credential that sent a message, its events
belong to that app alone, so two apps sharing a sending domain do not see
each other's recipients; where it does not, they go to every app on the
domain, as the day's counts always have.

```sh
carlos email events --app hello --since 24h
carlos email events --app hello --to guest@example.com
```

`events push` tells the app itself. Give it a path and the console POSTs each
delivery, bounce, complaint, rejection and delay SES attributes to the app, as
JSON, to that path on the app's own platform host
(`https://<app>.<account>.<apps domain><path>`), retrying on a widening
schedule for about a day when the app does not answer 2xx. Redirects are not
followed. Only events SES attributed to the app's own sending credential are
sent, so an app is never handed another app's recipients. An app behind
`carlos gate` cannot receive them.

```sh
carlos email events push --app hello --path /mail/events
carlos restart --app hello
carlos email events push --app hello
```

Turning it on delivers `CARLOS_MAIL_EVENTS_KEY` into the app's config — an
Ed25519 public key, standard base64 — which the app reads after a restart.
Every delivery carries a `Carlos-Signature: t=<unix seconds>,ed25519=<base64>`
header over the bytes `carlos-mail-event`, a newline, the `t` value, a newline,
and the request body exactly as received. An app should refuse a signature
that does not verify, a `t` more than five minutes from its own clock, and a
body whose `account` and `app` do not name the host the request arrived on —
`<app>.<account>.` — since the key is the deployment's, not the app's. The
body's `id` is the same on every retry of one event. Bare, `events push` shows
where events go and how delivery has been going; `--off` stops it and takes the
key back out. While an app is in the trash, what was queued for it is given
up on and new events are dropped, not held for a restore. An app that accepts
nothing for a day — every attempt answered with anything but 2xx — has its push
suspended: what is waiting is given up on, nothing new is queued, and `events
push` says so. Running `events push --path` again turns it back on.

`credentials create` mints a standalone SMTP credential for something not running on CARLOS — a laptop, a
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

### carlos skills

The platform publishes its agent skills at
`/.well-known/agent-skills/index.json`, per the [Agent Skills Discovery
draft](https://github.com/cloudflare/agent-skills-discovery-rfc). `carlos
skills` lists what is published; `carlos skills <name>` fetches one, checks
its sha256 digest against what the index claims, and prints the SKILL.md to
stdout — a mismatch means corruption or tampering, and the command refuses
to print it.

```sh
carlos skills
carlos skills getting-started > SKILL.md
```

`-index <url>` points it at another deployment's index, for a self-hosted
site or a test.

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
sidecar that reads instances, an app that mints an instance per customer at
signup. Reach is fixed at mint, so adding you to another account later does
not widen it, and it has its own rate-limit budget.

```sh
carlos services create --role deploy --app hello --rungs canary,edge ci-shipper
```

Pick the narrowest role that works. `publish` ships releases and manages the app; `instance`
provisions an app's instances — create, delete, upstreams and moves, plus its
domains and logs — which is the role a self-serve signup path wants; `operate`
administers; and `admin` includes `store grant`, which mints a path-scoped IAM
user, so treat that one as a real handover. `--app` binds the credential to
one app, which also means it cannot create apps.

`deploy` is for a CI pipeline: it ships, and promotes or rolls back only
the rungs named with `--rungs` (`canary`, `edge`, `beta`; never `stable`).
It must name one app and cannot hotfix. If the app has a pipeline, it may
move `canary/<name>` channels only. CI reads it from
`CARLOS_SERVICE_TOKEN` with `CARLOS_CONSOLE`.

One door stays shut to every role: `carlos instances enable`, which writes the
manifest bounding which domain, pool and regions an instance may be created
in — and, with `--private-storage`, whether each instance gets an object store
of its own. A person enables the app once and the credential provisions inside
those bounds afterwards, including minting a tenant's bucket it could never
have created directly.

A manifest's `regions` allow-list compares the home as `""`, so listing the
home's code does not admit the home.

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

`--replication` picks how often the route's database is copied off the box:
`stream` syncs on every change, about once a second; `batched` at most every
five minutes; `daily` at wake and then once a day. The rung you pick is a
trade, and it is the loss window you are trading. `daily` on a box that dies
loses up to a day of writes. What it buys is real money on a large database
that is written rarely — a 600 MB file compacted a few times a day costs the
same in traffic whether or not anything changed, and that traffic was 97% of
one day's replica writes across a whole fleet before anyone could turn it
down.

```sh
carlos route --host hello.example.com --replication batched
```

`--replication -` puts the route back on the default, which behaves exactly
like `stream`. It only applies to routes that hibernate and whose row names a
database: those are the ones the activator replicates, and everything else on
the box is covered by the box's own replicator at its own interval. The
command refuses both cases rather than writing a setting nothing would read —
a route that does not hibernate, and one that hibernates with no `--db` path
on it, which the box replicator cannot tell apart from any other file and so
sweeps up anyway. A change takes effect the next time the instance wakes.

The rung lives only as long as the sleeping does. Stopping a route from
hibernating clears it — with `carlos route --hibernate=false`, and equally
when an instance record turns hibernation off and the box converges — because
from that moment the box replicator owns the database and the rung would name
an interval nothing honours. The command says so when it clears one. Turning
hibernation back on starts from the default again.

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

### carlos proof

Makes and carries the proofs a box can require before it adopts a build. A
proof is signed by a proving deployment (dev, usually) and says it ran these
exact bytes healthily. A box whose proof policy lists an app adopts a new
build of it only with a proof, or when it has run those bytes well itself.

```sh
carlos proof keygen
```

`keygen` runs as root on the proving box. It writes a fresh signing key to
`/etc/carlos/proving.key`, readable by root only (`--out` puts it somewhere
else), and prints the public half. That public half goes into the `require`
entry of each requiring box's `/etc/carlos/proof-policy.json`. It never
overwrites a key that is already there.

```sh
carlos proof get --app console --sha256 <sha256> > proof.json
```

`get` reads a build's proof from the proving deployment's bucket and prints
it. `--sha256` is the build's artifact hash. `--prover` picks whose proof,
when there is more than one. When there is no proof yet, it says how long the
build has been live on the proving box, if it has been seen there.

```sh
carlos proof put --app console proof.json
```

`put` writes that proof into the requiring deployment's bucket, where its
boxes look for it. It checks the proof's shape but not its signature. The
requiring box checks that against the key in its policy. Putting the same
proof twice is fine. A different proof for the same build and prover is
refused.

`get` and `put` work only with `CARLOS_DEPLOYMENT_BUCKET` or
`CARLOS_DEPLOYMENT_DIR` set, because a proof lives only in a bucket.

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
release, tunnel state, memory, load, free disk, and whether its own alerts
have anywhere to go. A box that has stopped reporting shows as UNREACHABLE
with how long it has been dark, and none of its stale readings.

The last column reads `alerts=sns`, `alerts=webhook` or `alerts=webhook+sns`
when a box can deliver its alerts, and `alerts=not-delivered` when it has no
sink configured. `alerts=sns-unavailable` means a topic is set but the box
could not build its SNS client, so nothing is delivered through it. A dash
means the box runs an older binary and did not say.

```sh
carlos status --live
```

`--instances` answers the other question an operator has about a fleet: who is
using what, right now. One row per awake instance across every box, with the
account and app it belongs to and what it is consuming.

```sh
carlos status --instances --account bac
```

It goes through the console rather than the status bucket, so it needs no AWS
credentials — which is the point of it existing. Operator only: a token
without the fleet-operator bit gets the same bare 404 an unknown route gets,
so it learns neither the rows nor whether it holds the bit. The path itself is
not a secret — a wrong-method request gets a 405 from the router, like every
other route here — but the answer is, because it names other people's
accounts.

Two things it cannot see, both printed under the table. A sleeping instance
has no process and so no reading, so it does not appear. And the readings are
fleet-wide while the account each one is attributed to comes from the
console's own box's route registry, so on a multi-box deployment an instance
running elsewhere can show up under `(platform)` rather than under its tenant.

`--layout` shows which layout each instance is on, box by box. `flat` is the
shared `/data` every instance used to live in. `nested` is the instance's own
directory, where it cannot see its neighbours. `fenced` means a move between
the two is in progress or stopped part way, and `conflict` means two routes
claim the same directory; neither wakes until that is resolved. `foreign`
rows have paths the layout pass does not recognise and leaves alone, and
`external` rows are run by another supervisor. Like `--instances`, it goes
through the console and is operator only.

A box that runs `nested` instances beside `flat`, `foreign` or `external`
ones gets a warning after the table. Each of those still shares the agent's
user and view of `/data`, so the nested ones on that box are not isolated
until none remains. An instance that is awake when the layout changes is left
running for up to an hour so it can move while asleep; after that it is
stopped briefly and moved, and wakes nested on its next request. The `REASON`
column says how long it has left. Anything found in an instance's new
directory that the move did not put there is set aside under
`/data/layout/aside/<host>/` and the move goes on; the `REASON` column notes
what was set aside and when. An instance that has been stopped for its move
and then cannot be moved (a file of its has a second name, or its directory
is a symlink) stays stopped and shows as `fenced` with the reason, across
agent restarts, until the reason is cleared or the layout is reverted; it
never goes back to running flat on its own.

```sh
carlos status --layout
```

`--dry-run <dir>` is the self-hoster's leak check. It builds a throwaway fleet
stuffed with fixture secrets, runs it through the real publish path into a
scratch directory, reads every published object back, and fails if any
fixture escaped. Run it before you ever point this binary at a real bucket.
Neither mode publishes anything: the public status page is written by each
box's own agent tick.

### carlos system

Two things that are true of the deployment rather than of one app: the
platform's own release channel, and the deployment-wide settings an operator
owns.

#### The platform's own binary

`update` promotes a public release (or, with `--file`, a binary you built) to
`canary` or `stable`; every box on that channel fetches it through its normal
store, verifies it against the signed pointer, installs it, restarts its edge,
and rolls back to the previous binary if the new one does not come up and stay
up. `status` shows each box's platform, channel, running build, the channel's
target, and the last apply outcome with its reason. `rollback` points a channel
back at the release before this one, and every box on it rolls back the same
way it rolled forward. All three talk to your console. You need to be an owner
of the ops account, or on the console's `CARLOS_SYSTEM_OPERATORS` list. That
list is for people who roll releases without owning the account. It covers
`status`, `update` from a public release, and `rollback`, but not `--file`: the
console signs an uploaded build with the deployment key and every box runs it,
so only an owner can ship one.

A box that has isolated instances refuses to install a platform release from before the instance layout, whether by update or rollback, until its layout has been reverted and every instance reports `flat`. The box judges the candidate by the units it ships and, when the candidate's version is a release number, by that number against the first release on which isolated instances run; a locally built binary named by a commit is judged by its units alone. The console refuses the same move before it reaches a box: `update` to a named release from before the layout, or `rollback` onto one, is refused while any box reports an instance that is `nested`, `fenced` or `conflict`, or has not reported its layout at all.

```sh
carlos system update --channel canary
carlos system status --channel canary
carlos system update --channel stable --spread 10m
carlos system rollback --channel stable
```

#### Instance layout

Every instance the activator runs used to live in one shared directory as one user, where it could read its neighbours' files. `layout migrate` moves them out: each instance gets its own directory and, from its next wake, its own mount and pid namespace, where it sees its own files and nothing else. An instance that is asleep is moved at once; one that is awake is left for up to an hour to go to sleep, then stopped briefly and moved. `--force` skips the hour. `--box` scopes the request to one box, so a fleet moves one box at a time with `carlos status --layout` showing each box's rows turn `nested`. Once a box's layout is `nested`, a newly provisioned instance on it starts out `nested`; it is never created in the shared directory first.

`layout migrate` is refused while any box in scope runs a platform release from before the layout, so a fleet is rolled forward first and migrated second.

You rarely need `migrate` at all. With no intent recorded, a box uses the nested layout by default as soon as its isolation is ready (the probe passes), and moves its instances on its own, with the same hour of grace for an awake one. `carlos status --layout` marks such a box `(nested by default)`, and says why a box the default has not reached is still flat. To keep box-by-box control, record `migrate --box` or `revert` first; a recorded intent always wins. A deployment that is not ready for this at all puts `CARLOS_LAYOUT_DEFAULT=flat` in each box's host.env.

`layout revert` moves them back. The order for rolling the platform back to a release from before the layout is: `layout revert`, wait until `carlos status --layout` shows every instance `flat`, then `system rollback`. The console will not move a channel pointer onto such a release while any box reports otherwise, and a revert is refused while a maintenance worker is attached to a box in scope. `layout status` prints the recorded intent; what each box has done is `carlos status --layout`.

```sh
carlos system layout migrate --box kass-1
carlos status --layout
carlos system layout migrate
carlos system layout revert --force
carlos system layout status
```

Ops account owners and `CARLOS_SYSTEM_OPERATORS`, like `update` and `rollback`.

A box is put on canary with `CARLOS_SYSTEM_CHANNEL=canary` in its host.env, and opts out of the nested instance layout by default with `CARLOS_LAYOUT_DEFAULT=flat` there.
Boxes that have not reported a platform yet count as stable. `carlos system
apply` is the root oneshot behind `carlos-system-update.service`; it is not
for operators. The console is an app — update it with `carlos deploy --app
console`.

#### Host lifecycle guard

`carlos system guard-arm` is a root-only deployment command that installs and
arms the persistent host lifecycle checker. Supply `--policy`, `--identity`
and `--enrollment`; console hosts also supply `--console` with the root-owned
console executable and its `.prev` recovery image in place.

`carlos system guard-exec` is the root service entry point for checking an
image before starting `apply`, `recover`, `edge` or `console`. Once armed,
the local floor remains enforced independently of `CARLOS_HOST_CLAIM`.
The member command remains `carlos ops host resolve`.

#### Deployment-wide object scanning

```sh
carlos system antivirus status
carlos system antivirus enable
carlos system antivirus disable
```

`antivirus status` answers "is object scanning actually working here" without
logging into a box. It reports **wiring** and **policy** separately, because
they fail separately: an engine can be wired with scanning switched off, and
scanning can be switched on with the engine unreachable. It also prints the
signature-database version and warns when it is stale.

`enable` and `disable` are the switch. It lives in a record rather than in the
unit file, so turning scanning on or off takes effect on the next tick with no
restart — and `disable` stops every path, including `carlos store scan sweep`,
not just the hourly pass. `enable` is refused when no engine is wired: a record
claiming enabled with nothing behind it would report health for a deployment
where no scan can run.

Deployment operators only (`CARLOS_STORE_OPERATORS`). Enabling scans nothing by
itself — a member still requests scanning for their app and an operator still
grants it per store.

#### Platform GeoIP

```sh
carlos system geoip publish dbip-city-lite-2026-10.mmdb
carlos system geoip status
carlos system geoip off
```

`publish` sends a MaxMind-format database, DB-IP Lite or GeoLite2, to the
console. The console checks it, stores it in the deployment bucket, and every
edge picks it up within 12 minutes with no restart. From then on, every
request to every app carries the headers described under
[Headers your app receives](#headers-your-app-receives), and analytics count
page views by country. `publish` refuses a file that isn't a valid database,
has no country data, or is a GeoLite2 database already past its 30 days. It
also refuses one with under half the current database's nodes, which usually
means a truncated file. `-force` overrides that last check only.

`status` shows the published database and every box: whether it runs a build
that removes forged geo headers, and whether it has the current database.
Its last line says `ready` only when every box does. Publish a database only
after the whole fleet is ready, and tell apps about the headers only after
that. Until every box has been updated, an older box passes a visitor's
forged headers straight through.

A box that has been retired but still has an edges record keeps `status` from
saying `ready`. Deleting its record (`control/edges/<label>.json`) retires it.

`off` removes the database. Every edge stops sending the headers within 12
minutes.

**Keeping it current.** Set `CONSOLE_GEOIP_FEED` on the console and it fetches each new edition itself, checking once a day. `dbip-city-lite` is the free default and needs nothing else. For MaxMind, also set `CONSOLE_GEOIP_MAXMIND_ACCOUNT` and `CONSOLE_GEOIP_MAXMIND_KEY`: `geolite2-city` is MaxMind's free edition and `geoip2-city` its paid one. Each also comes as a `-country` edition, which is smaller and has no coordinates. MaxMind calls GeoLite2 unsuitable for commercial use, and its licence limits passing the data on, which serving it to apps may count as. Read it before choosing GeoLite2 for a commercial deployment.

**The licence is yours to keep.** DB-IP Lite is licensed under CC BY 4.0
(https://db-ip.com/db/lite.php), so pages that show its data must credit it.
The Analytics tab does this for you, and apps are told to do the same.
GeoLite2 comes under MaxMind's GeoLite EULA
(https://www.maxmind.com/en/geolite/eula), which also requires replacing the
database within 30 days of a newer release. The platform enforces that by
dropping a GeoLite2 database 30 days after it was built. Before you publish
GeoLite2, apply the deployment-buckets module version that expires deleted
GeoIP files after a day; the bucket is versioned, and otherwise old copies
would linger.

Ops account owners and `CARLOS_SYSTEM_OPERATORS`.

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

### carlos instance-control

The root half of isolated exec. `carlos-instance-control.socket` activates
it when the agent connects; it starts, stops and sweeps the
`carlos-instance*@` units for the agent, sets each host's memory tier on
its slice before a start, and runs the isolation probe at start and every
five minutes. It accepts a connection only from the edge unit's own main
process. Not for operators: there is nothing to type.

### carlos instance-exec

The first thing an isolated instance unit runs. It reads the launch file
the agent wrote into the instance's directory and starts the host's live
link with exactly the arguments and environment in it, refusing anything
that is not the platform's own live link. It then stays on as the
instance's first process: it passes stop signals on to the app, cleans up
exited processes, and exits with the app's status, so an app with no
signal handling still stops cleanly. `ExecStart=` of the three instance
templates.

### carlos instance-exit

`ExecStopPost=` of the three instance templates. It leaves an advisory
exit record in the instance's run directory from the four variables
systemd provides; the agent proves termination from the unit's state and
its cgroup, not from this file.

### carlos instance-probe

The isolation probe, run under the same namespace text as the instance
templates. From inside it checks what a tenant would see: only its own
directories, only its own pid, a read-only cgroupfs, no `/etc/carlos`, a
symlink that is not followed, and a metadata service that a packet filter
refuses. It prints a verdict; `carlos-instance-control` reads it and
refuses to start isolated instances until every line passes.

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

`carlos help` belongs to all three roles above.

### carlos help

Prints the command list, grouped the way this page is. It goes to stdout and
exits 0, so `carlos help | less` works. A bare `carlos` with no arguments
prints the same text on stderr and exits 2, because that one is a mistake.

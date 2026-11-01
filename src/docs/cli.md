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

`--analytics` or `--no-analytics` turns analytics on or off for the new app.
Without either, the app follows the account's setting. Only an owner can
choose differently from the account.

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

`carlos apps place` refuses an app whose sealed values were sealed to a different key from the target's, and `carlos apps create --place` does the same for an app that already has config. The message lists the values. Unset them, place the app, then set them again and rotate any credential the console minted.

carlos apps place refuses a rootfs app, whatever the target, because a rootfs app's instances do not move. Give a rootfs app its fleet with --place fleet/<name> when you create it, before its first ship. [Rootfs apps](/docs/rootfs) says why.

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

`carlos apps list` shows each app's own region, the region where its new instances start. For an app with a region, it shows the region set when the app was created or changed later. For an app on a fleet, it shows the fleet instead. Where new instances start can differ from where existing instances run. For a pooled app, the app's Running page in the console shows where its instances start.

`carlos apps region` shows where an app's new instances start, and `--set` changes that default:

```sh
carlos apps region --app hello
carlos apps region --app hello --set uk
```

An app's region sets where its new instances start, except for apps whose instances start in a pool. Those instances start in the home region instead. Changing the region moves nothing: existing instances stay where they are, and only instances created afterwards start in the new region when the app uses its region. Use `carlos move` to move one that exists. The new region must be one the platform offers, able to start instances now, and allowed for this app's instances. An app on a fleet is refused because the fleet decides where its instances run. Use `carlos apps place` instead. The command also refuses an app whose instances start in a pool because the app's region does not decide where its new instances start. It also refuses an app in the Trash. Account owners and deployment operators can change the region with this command. In the console, the Region control is on the app's settings page, which only account members can open. Owners and deployment operators who are members can use the control. A deployment operator who is not a member must use the command. The console records who changed it, from what and to what, in the app's activity. After a change, `carlos deploy --region` must name the app's current region.

`carlos apps set` changes how the app's running instances take a new build:

```sh
carlos apps set hello --swap hold
carlos apps set hello --swap-concurrency 3
```

With `--swap overlap`, the default, the new build starts beside the old one
and takes over once it answers its health check, so no request waits. With
`--swap hold`, the old one stops first, and requests wait until the new one
is up. `--swap-concurrency` is how many instances may swap at once on one
box, after the first one has stayed up for ten seconds; it starts at 1. Any
member of the app can change both, here or on the app's settings page in the
console.

--interactive on lets any member open a terminal session on the app's instances with carlos run -it or carlos console. A session can read and change everything the instance can, so it is off until an owner turns it on. Any member can turn it off.

```sh
carlos apps set shop --interactive on
```

`carlos apps set` also controls the update settings an instance may change:

```sh
carlos apps set shop --instance-control updates,pin --default-updates manual
```

--instance-control names the settings an instance may change itself once instances can act for themselves. --default-updates and --default-major apply wherever an instance has not chosen; --default-channel is the channel new instances are created on.

System operators can also set an app's instance policy: which private addresses its instances may reach and the size each instance runs at. `carlos apps show` reads it back.

```sh
carlos apps set shop --egress-allow 10.0.5.20,fd00:5::20
carlos apps set shop --size large
carlos instances set shop-a.example.com --app shop --size xlarge
carlos apps show shop
```

An instance cannot reach a private address unless its app allows it. `--egress-allow` takes the app's whole list, comma-separated, and replaces the list before it. To drop one address, pass the list without it; `--egress-allow ""` removes them all. Each entry is a single IP address, with no range, port or zone. Public addresses are refused because instances can reach them already, and so are loopback, link-local, multicast and reserved addresses, the cloud metadata service and the NAT64 prefix. An app may allow at most 8.

A change that adds an address is checked against the deployment's boxes. An address that belongs to one of them is refused, and so is any new address while a box does not publish its address list yet. Boxes that publish none at all are named after the change. An allow takes effect only on a box where every instance runs nested (see `carlos status --layout`). It does not take effect while host claims are on. If a box later takes an allowed address, the console sends an alert.

The sizes are `small` (256 MiB of memory), `standard` (512 MiB), `large` (1 GiB) and `xlarge` (2 GiB), with CPU and IO to match. `carlos apps set --size` sets the app's size, and `--size default` goes back to the build's size. `carlos instances set --size` gives one instance a size of its own, and `--size default` makes it follow the app's size again. A size above `standard` is refused when it is more than a quarter of the memory on the smallest box the app can run on, or when one of those boxes reports no memory total.

After a size change, the command prints each box's memory committed to awake instances, out of its total. CPU and IO change at once. A larger size's memory applies when an instance next starts or is deployed. A smaller size applies only when the instance starts cold. Restart it to apply the new memory now. `carlos status --layout` shows the size each instance runs at.

The console records a change, and the app's boxes apply it. A box that follows the deployment's change index does so within seconds; any other box within about 33 minutes. `carlos apps show` prints the egress allow, the app's size, and every instance with a size of its own. A `!` before an address means one of the deployment's boxes now holds it.

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

`--assets` names a folder your build writes its files to, for example `/assets/`. Repeat it for up to 8 folders. Each must start and end with `/`, be at most 128 bytes, and contain none of `%`, `?`, `#`, `*` or `..`. `/` alone is refused, because it would keep copies of every page. No folder may sit inside another. A static site cannot use it, because a static site is already served from every region. The folders belong to the release, so a rollback to an older build uses the folders that build declared.

Files under an asset folder are fetched without the visitor's cookies or login, so put only public files there. Anything that needs to know who is asking belongs outside those folders.

Servers keep a copy only when your app answers with status 200, a `Cache-Control` that allows it (for example `public, max-age=31536000, immutable`), a `Content-Type` that is not HTML, and no `Set-Cookie`. Each response says what happened in a `Carlos-Cache` header: `hit` came from a saved copy, `miss` had no saved copy yet, so the server fetched it and tried to keep one, and `bypass` was fetched without keeping a copy.

--env KEY=VALUE gives every process in the check a variable, such as a placeholder secret or a store setting. The check never reads the app's real config or secrets. It sets CARLOS_SOCKET, CARLOS_DB, CARLOS_HOST and CARLOS_REGION itself, so --env cannot set those.

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

Deploy then watches each box roll the build out. An awake instance counts
once the new build has passed its health check and taken over; on each box
the first one must also stay up for ten seconds before the rest follow. An
asleep instance counts once its box has installed the build, and starts it on
its next request. If the build fails on a box, that box stops rolling it out,
its other instances stay on the build they were serving, and deploy names the
failure and exits with an error.

Where a box does not report its rollout yet, deploy watches the app's URL
instead, and what it watches there is worth knowing, because the two answers
differ. If the app
declares a build probe, deploy asks the app's own process which build it is
running, and `live` means the process cycled. If it does not, deploy watches
the `X-Carlos-Version` header — and the edge stamps that from the route row
the moment adoption moves the symlink, whether or not anything restarted. So
a probe-less deploy can print `live` over a process still running the old
binary, and it says so while it waits. Set one with
[carlos apps build-probe](/docs/cli#carlos-apps); it is a single command per
app.

A host behind a password gate ([carlos gate](/docs/cli#carlos-gate)) is watched like any other. Deploy asks the console for a pass that lasts 15 minutes and checks the version through the gate with it. The console only hands one to someone who could already remove the gate, or to a deploy credential for a host on a channel it can deploy its own build to. Each one is recorded in the app's activity log. If the console refuses a pass for a static site, the host is left unchecked and the deploy still succeeds. Otherwise a deploy without a pass keeps waiting and will likely time out.

```sh
carlos deploy --app hello ./hello
```

`carlos deploy --app hello --env PORT=8080 ./hello` creates the app and its first instance if they are missing, then deploys your built binary and waits for it to serve. Existing instances stay unchanged. Use `--region` to choose a new app’s region; for an existing app, it checks the region.

Repeat `--env KEY=value` to set ordinary variables before shipping. They go into the environment bundle shared by the selected instances. If those instances use different bundles, select one with `--host`. Values are not printed, but remain in shell history; use `carlos secrets set` for secrets.

The console must support instances and provide a platform domain. Trashed apps are not restored. If setup fails partway through, the app, instance or variables already created remain. Fix the reported error and retry.

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

`--swap hold` ships a release that stops each instance before starting the
new build, for a migration the previous build cannot share the database
with. It applies to that release only; `carlos apps set --swap hold` makes it
the rule for the app.

To try a build that failed again, once you have fixed what it depended on,
promote it again with `--retry`. Every box where it failed tries it again:

```sh
carlos promote --app hello --retry a1b2c3d edge
```

Without `--retry`, promoting a build that is already on the channel does
nothing.

When `carlos deploy` creates your first app, it sends your timezone so the
console can pick the region nearest you, and prints the choice. `--region
<code>` chooses instead. On an app that already exists, `--region` must
match the app's region, or deploy stops before shipping anything. That is
the app's current region after any `carlos apps region --set`. If `carlos
deploy --region` names another region, deploy stops before shipping
anything. Deploy never moves an instance to match the app's region.

`carlos deploy` takes the same repeatable `--assets` flag and passes it to the ship. Save the list as `"assets": ["/assets/"]` in `.carlos/config` and a bare `carlos deploy` declares it on every release. A flag on the command line replaces the saved list for that run, and `--no-assets` ships with none. A release that declares no folders gets no copies, so deploying a build without them turns copying off for that build. `--assets` and `--no-assets` cannot be given together.

`--temporary` creates a new app for a static site that cleans up after
itself. It is named `tmp-` plus six random letters and digits, or
`tmp-<name>` with `--app <name>`, and lives 7 days unless `--ttl` says
otherwise (1h to 30d). `--ttl` on its own implies `--temporary`. A temporary
app is served only at its own platform address, so `--host` and
`--kind binary` are refused with it, and an account holds at most 20 of them.

```sh
carlos deploy --temporary --ttl 3d ./dist
```

#### Redirects for a static site

Put a file named `_redirects` at the top of the site directory. It uses the
format Netlify and Cloudflare Pages use: one rule per line, with a source, a
destination and an optional status.

```text
# source           destination              status
/old-page          /new-page                301
/blog/*            /posts/:splat            301
/docs/:slug        /guide/:slug             302
/app/*             /app/index.html          200
https://www.example.com/*  https://example.com/:splat  301!
/*                 /404.html                404
```

- A source is a path, or a URL with a host. A URL source applies only to
  requests for that host, so the last-but-one rule sends `www` to the apex.
- `:name` matches one path segment. A `*` at the end matches the rest of the
  path, and the destination gets it as `:splat`.
- The status is 301 when you leave it out. 302, 303, 307 and 308 are also
  redirects. 200 serves the destination's file at the requested URL, which
  is how a single-page app serves its client-side routes. 404 serves the
  destination's file as the not-found page.
- A 200 or 404 rule takes a path in the same site. A redirect can also go to
  another host.
- A request's query string is kept unless the destination has one of its
  own.
- When a file exists at the requested path, the file wins. Add `!` to the
  status (`301!`) to make the rule win.
- Rules apply in order, and the first rule that matches is used. A line
  starting with `#` is a comment.

`carlos ship` and `carlos deploy` refuse a `_redirects` file with a line they
cannot use, and name the line. Netlify's conditions, such as `Country=`, and
proxying to another host are not supported. A file can have up to 2,000
rules. The edge does not serve the `_redirects` file itself.

A folder requested without its trailing slash, such as `/blog/post`, is
redirected with a 301 to `/blog/post/`, where its `index.html` is served.
Each page then has one address, and relative links in the page resolve
against its own folder. If the site's `_redirects` rules name that path, or
redirect its slash form, the folder is served at the path as asked instead.

#### Response headers for a static site

Put a file named `_headers` at the top of the site directory to set response
headers on the paths you choose. It uses the format Netlify and Cloudflare
Pages use: a path on a line of its own, then the headers for it, each on an
indented line below it.

```text
# Released versions never change.
/1.0.0/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

# The latest 1.x moves with each release.
/1/*
  Cache-Control: public, max-age=300
  Access-Control-Allow-Origin: *
```

`Access-Control-Allow-Origin: *` lets pages on other sites fetch these
files, load them as JavaScript modules and pin them with integrity hashes. A
plain stylesheet or script tag works without it.

- A path works as a `_redirects` source does. `:name` matches one segment, a
  `*` at the end matches the rest of the path, and a URL with a host applies
  only to requests for that host.
- Rules match the address the browser asked for, before any `_redirects`
  rewrite. If `/1/*` is rewritten to `/1.0.0/:splat`, a request for
  `/1/site.css` gets the headers for `/1/*`.
- Every rule that matches applies. When two set the same header, the one
  lower in the file wins, so put general rules first and specific ones after
  them.
- Headers are sent with a file served normally, including its 304 and range
  responses. Redirects, not-found pages and errors don't get them.
- A `Cache-Control` rule replaces the `no-cache` every file gets by default.

These headers can be set:

| Header | Values |
| --- | --- |
| `Cache-Control` | any list of directives, such as `public, max-age=300` |
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Expose-Headers` | a list of header names |
| `Cross-Origin-Resource-Policy` | `same-origin`, `same-site` or `cross-origin` |
| `Timing-Allow-Origin` | `*` |

`carlos ship` and `carlos deploy` refuse a `_headers` file with a line they
cannot use, and name the line. Any other header is refused too. A file can
have up to 100 paths. The edge does not serve the `_headers` file itself.

#### Two builds at once

When a new build reaches an awake instance, it starts beside the old one,
and for a few seconds both run. They share the instance's database and its
scheduled work. The new build's migrations run while the old build is still
serving, so both builds must work with the database in between:

- Add in one release and remove in a later one. A new column, table or index
  goes in one release; dropping the old one waits for the next.
- Keep the names of scheduled work (`carlos schedule`) the same across the
  two builds.

When a release cannot follow these rules, ship it with `--swap hold`, or set
the app to `hold` with `carlos apps set`. Each instance then stops before the
new build starts, and requests wait until it is up.

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

### carlos devbox

Publish a dev server or a folder as an HTTPS link on a shared devbox, for people on eg a tailnet. A live link follows your dev server on 127.0.0.1, so edits show up as you save. A folder link serves a copy of the folder, and sharing it again replaces the copy.

```sh
carlos devbox share --port 5173 shop
carlos devbox share --dir ./dist docs
carlos devbox unshare shop
carlos devbox list
```

If you work through an AI agent, run both the dev server and carlos devbox share outside the agent's sandbox. A dev server started inside the sandbox listens where the devbox cannot reach it, and the sandbox also stops the command from reaching the devbox service.

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

To read the database as it was at an earlier time, add `--at` with a time
in RFC 3339 form, such as `--at 2026-10-07T14:00:00Z`. The copy holds every
change replicated before that time. It can be a little older than the time
you give, never newer, and the command says which transaction it stopped
at. How far back you can go depends on how much history the platform keeps
for the instance. Ask for a time earlier than that and the command names
the oldest time you can use instead.

The copy is read-only. A query that tries to change it fails with SQLite's
own error, `attempt to write a readonly database`. That is on purpose.
Changing a copy would change nothing on the instance, and a command that
seemed to succeed would say otherwise.

If the app has more than one instance, name one with `--instance`. Only instances that sleep have a database copy. An instance on your own fleet or in a pool cannot be read this way, and the command says which.

When an instance keeps its data in a different region from the console's, `carlos db query` runs in that region. A server there restores the copy, runs your query and sends back only the rows. `carlos db pull` fetches the copy's files from there and restores them on your machine. Both are encrypted for your terminal on the way, so nothing in between can read them, and nothing is printed or saved until all of it has arrived and been checked. In that region, a query's copy can be at most 2 GB once restored, the query runs for at most 5 minutes, and the rows can total at most 64 MB. A pull can fetch at most 2 GB.

### carlos run

Runs one command of your app against one instance, as that instance: the same build, user, directories, database and environment it serves with. Output streams back to your terminal about a second behind, and carlos exits with the command's own status.

```sh
carlos run --app shop --instance shop.example.com --file orders.csv -- import orders.csv
```

Any person who is a member of the account can run a command. A service credential cannot. The one exception is a `run` credential, which can run the commands it was minted with. [Runs from a service](#runs-from-a-service) says how.

Each --file is uploaded with the request and placed, under its own name, in the directory CARLOS_RUN_DIR names. Together they can come to 64 MB. The directory is deleted when the run ends.

The command runs for at most 30 minutes unless you pass --timeout, up to 6 hours. Ctrl-C cancels it on the box. A second Ctrl-C stops waiting, and the cancel still happens. If your terminal goes away the run carries on, and carlos run --app <app> --instance <host> --follow <id> picks its output up again. carlos prints that command when the run starts. Output is kept until carlos has read all of it, and for 24 hours at most.

A hibernating instance is woken first. A live one keeps serving, and the command opens the same database beside it. One run at a time per instance. carlos run needs the instance's box on the nested layout, and it is refused while the instance is moving.

For a rootfs app the command after -- runs inside the instance's image and is found on the image's PATH.

On a customer fleet, the instance's box reaches the console for the run itself, so carlos run works there as it does on any other box.

With -it, the command runs in a terminal session instead: what you type goes to it and its screen comes back, so a REPL or a shell works. The app must allow it first, with carlos apps set <app> --interactive on, which only an owner can do. A session ends when the command exits, after 30 minutes without a keystroke, after 6 hours, or soon after your connection drops. A deploy, a restart or a move of the instance ends it too. Ctrl-C and Ctrl-D go to the command. One session at a time per instance, beside any run. Who opened it, where, when it ended and how are in the audit log. What you type and what it prints are not kept.

```sh
carlos run -it --app shop --instance shop.example.com -- bin/rails console
```

carlos run exits with the command's own status, 128 plus the signal number when a signal ended it, 124 when it timed out, 125 when it was interrupted or the instance let go of it without a result, 130 when you cancelled it, 3 when the box refused it or did not pick it up within 60 seconds, and 2 when the console refused it.

A session exits with the command's own status, 124 when it ended for lack of keystrokes or at 6 hours, 125 when it was interrupted or its box's connection dropped, 130 when you cancelled it before it started, 3 when the box refused it or none opened it within 60 seconds, 2 when the console refused it, and 1 when carlos lost its connection to the console.

carlos logs shows when each run started, who asked for it and how it ended. The command's output is not kept there. A service's run reads "started by service ci", with the person it named, if any, marked as the service's statement.

If you cannot tell whether a run started (the connection dropped as you sent it), start it with `--idempotency-key <key>`. The key is a string you choose: 1 to 128 characters of letters, digits, dots, underscores, colons and hyphens. Run the same command again with the same key and the same files, and carlos says `already started: run <id>` and follows that run, instead of starting a second. Each `--file` is hashed first, because a key only matches a request that is the same in every byte. The same key with a different command, timeout or file is refused with `idempotency_key_reused`. A key is yours alone: no other person or service can see it or collide with it. It is honoured for 24 hours, or until you have made 32 newer keyed admissions on that instance, whichever comes first. After that the same key starts a new run. If the run has since finished and its output was read, or has been cleared away, carlos says `run <id> was already started with this key, and its output is no longer kept` and exits 2: the run happened, but there is nothing left to follow.

Arguments are kept in the account's audit log, with who ran them. Never put a secret in an argument. Pass it in a --file, or keep it in the instance's environment.

#### Runs from a service

A server that has no person at a terminal, such as a back office that imports an account's data, can start and follow runs with a `run` credential. The account owner mints it:

```sh
carlos services create --role run --app shop --commands "import classic,import sync" fleet-runs
```

`--app` and `--commands` are both required. A `run` credential starts, follows, cancels, expires and acknowledges runs of its own app's instances, and does nothing else. No other role can run commands, `admin` included: a credential that can provision instances cannot run commands on them unless it was also minted for that.

`--commands` is a comma-separated list of prefixes, and each prefix is its words separated by spaces. A run is allowed when its arguments start with every word of at least one prefix, compared word for word and exactly. With only `import classic` granted, `import classic --slug acme` runs, and `import classical`, `import` and `import sync` are refused. **A prefix also allows every flag and argument after it**, so grant the shortest prefix that names the work you mean, and do not grant `import` when you mean `import classic`. A prefix of no words is refused. A word is valid UTF-8 of 1 to 128 bytes with no spaces, commas or control characters, and a credential may hold up to 32 prefixes. A refused command answers 403 `command_not_granted` before anything is stored.

The list is fixed at mint. `carlos services ls` shows it, rotating a credential keeps it, and there is no way to edit it: mint a new credential to change what it may run. People are not limited by any list.

A service sees and acts on only the runs its own credential started. Another service's run, a person's run and a run of an earlier credential that had the same name all answer `not_found`, as if there were no such run. Members of the account see every run, a service's included. When a service's run holds an instance, a service that did not start it is told that the instance has a run open and nothing more.

A service may say who a run is for, by sending `on_behalf_of` with an email address of at most 254 bytes. It is recorded on the service's word and checked for nothing but its shape, so it grants nothing. Every place a run is shown reads "run by service ci for ada@example.com (as stated by the service)", or "run by service ci (scheduled)" when it names no one. A person's run cannot send it.

#### The run API

`carlos run` is a client of these routes. A service calls them with its credential as a bearer token, and a person with a signed-in token. Under `/api/cli/apps/<account>/<app>/instances/<host>/runs`:

- `POST` creates a run. The body is multipart: a `meta` part first, as JSON (`argv`, `timeout_s`, `files` as a list of `name`, `size` and `sha256`, and `on_behalf_of`), then one `file` part per file, in the order and under the names `meta` gave. It answers `202` with the run's `id`, `host` and `state`.
- `GET /<id>?after=<seq>` pages the run's output from after chunk `seq`, and carries the result once the run has one.
- `POST /<id>/cancel` and `POST /<id>/expire` cancel a run, or give up on one no box has picked up.
- `POST /<id>/ack` with `{"last_seq": n}` says the output has been read, so the console can delete it.
- `GET ?key=<key>` answers `{"run_id": "..."}` for the run a key started, or `404`.

Every refusal a run route makes has a `code` beside its `error` sentence, for a caller that has no person to read the sentence. Not being signed in, a credential of the wrong role and an account the caller is not in are answered as they are on every other route, without a code, and tell themselves apart by status.

- `not_found`: no such instance, or no such run. For a service, also a run it did not start.
- `host_claim`: this console runs with host claims, which cannot yet run commands, so it refuses every run for everyone. The same refusal comes to a `run` credential.
- `rate_limited`: too many run requests. Wait a minute.
- `unavailable`: the console's store is not available. Try again.
- `record_failed`: the console could not record the run or the change. Try again.
- `read_failed`: the console could not read the run. Try again.
- `not_runnable`: the instance is of a kind `carlos run` does not work on.
- `moving`: the instance is moving. Run it once the move has finished.
- `run_open`: the instance already has a run open. A service that did not start it is not told whose it is.
- `malformed`: the request is not shaped as above.
- `invalid_request`: the command, timeout, files or sha256 values in `meta` are not acceptable.
- `files_too_large`: the files come to more than 64 MB.
- `import_uncommitted`: the instance is an import that is not committed yet.
- `command_not_granted`: this credential was not minted for that command.
- `on_behalf_of_invalid`: `on_behalf_of` is not an email address of at most 254 bytes, or a person sent it.
- `run_started`: the run has already started, so it cannot be expired.
- `run_ended`: the run has already ended, so it cannot be cancelled.
- `run_not_finished`: the run has not finished, so it cannot be acknowledged yet.
- `last_seq_mismatch`: the acknowledgement named a chunk other than the run's last.
- `idempotency_key_invalid`: the key is not 1 to 128 characters of letters, digits, dots, underscores, colons and hyphens.
- `idempotency_key_reused`: the key was used for a different request.
- `keys_not_ready`: this console does not take keys yet. See below.
- `file_hash_mismatch`: the bytes of a file are not the sha256 `meta` declared for it. This is a 400.

A create with an `Idempotency-Key` header is admitted at most once. A retry with the same key and the same request answers `202` with the same body and `"replayed": true`, and starts nothing. Keyed creates carry three rules:

- `meta` must declare each file's sha256, in either case. A file whose bytes do not match is refused as `file_hash_mismatch`.
- A refusal is not remembered, and a key is evaluated afresh on each try. A `run_open` that blocked the first try can succeed on the second, once the other run has finished.
- A 4xx on a retry means that attempt admitted nothing. An earlier attempt with the same key may have started the run, so confirm with `GET ?key=` before concluding that it never ran. A 5xx, a timeout or a dropped connection means unknown: retry with the same key.

A key is honoured for 24 hours, or until the same caller has made 32 newer keyed admissions on that instance, whichever comes first. The limit is per caller, so another caller can never evict your key. Do not retry a key past that: it starts a fresh run.

Keyed creates are off until the operator of the console turns them on, with `CARLOS_RUN_KEYS=on`, and answer `503 keys_not_ready` until then. The operator does that only once every box runs a build that keeps them. It is a one-way switch: a box rolled back to an older build afterwards forgets the keys silently, and a retry could then start a second run.

Deleting an instance deletes its keys with it. A retry that arrives after the host was deleted and created again starts a fresh run on the new instance.

### carlos console

Opens the console process your app's manifest declares, in a terminal session, as carlos run -it would. carlos ship fills one in for Rails, Laravel and Django apps when the manifest has none. An app without one is refused, and the message says how to name a command instead.

```sh
carlos console --app shop --instance shop.example.com
```

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

### carlos channels resign

Re-signs a channel's current pointer with the sha256 of each build's manifest, so boxes that insist on digests accept it. It shows every digest first and signs only when you type yes. Use it on a channel nobody has promoted to since digests were turned on. It refuses until `carlos channels digests on` has been run for the account.

```sh
carlos channels resign --app hello stable
```

### carlos channels digests

Shows whether channel pointers carry manifest digests, and lists the channels that still do not. on and off are for platform operators: on tells upgraded writers to sign digests, and off stops them while a writer is being fixed. Turn it on only after every console, CLI and deploy script that promotes has been upgraded.

```sh
carlos channels digests
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

There are two sub-verbs. `carlos releases retention --keep 20` sets an ambient
prune policy, and `--dry-run` shows you what it would remove before you commit
to it. The safety list always wins over the number: channel pointers,
rollback history, tagged releases, anything inside the bake window, and each
box's own adopted versions are never pruned, so nothing promoted or recent
disappears by policy. `--off` goes back to keeping everything.

`carlos releases authorize <app> <version>` is for operators. It shows a build's manifest and file digests and, when you type yes, signs a promotion record for exactly those bytes. Every promotion writes one; this is for a build promoted before records existed, so an instance can be pinned to it or recovered onto it on a box that does not already have it.

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

An environment a team scope owns is different: it is standalone, never
inheriting the default bundle, and the platform mints its mail and relay
credentials for it alone. An account owner marks one with `carlos env adopt
--app hello --environment slice --scope alta` (refused while an instance is
bound to it), clears it with `carlos env release`, or creates one from an
existing environment's own keys with `carlos env fork --app hello --from
lagged --to lagged-team --scope alta`. Fork never copies the default bundle or
a platform-managed key; sealed secrets are copied as they are. A team
credential (see [carlos services](#carlos-services)) reads and writes only the
environments its scope owns, and creates one by writing to a name no instance
references. Binding an instance into an owned environment is a person's
explicit act: `carlos instances create` and `carlos instances set-environment`
take `--scope <name>` for it.

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

A write that reaches a route no pass delivers to says so ("this write did
not reach <host>"), with the two ways out: name the unit that runs the
process on the box, or opt the bundle into file delivery. A stamped route
the root pass will refuse is reported as blocked with the reason.

### carlos secrets

The same shape as `carlos env`, sealed. `list` prints key names and never
values.

```sh
carlos secrets set --app hello STRIPE_KEY=sk_live_example
```

A write that reaches a route no pass delivers to says so ("this write did
not reach <host>"), with the two ways out: name the unit that runs the
process on the box, or opt the bundle into file delivery. A stamped route
the root pass will refuse is reported as blocked with the reason.

Sealing uses a public key; the private half lives on the box that decrypts
them and never leaves it, in either mode. `carlos secrets genkey` mints the
pair, and it is always local to your terminal.

An app placed on a fleet is sealed to the fleet's key, which `carlos secrets set` takes from the console. Leave `CARLOS_SECRETS_PUBKEY` unset in your terminal for it, and use a `carlos` CLI that knows about fleet keys, because the console refuses a secret from an older one.

In direct-bucket mode, `carlos secrets set` refuses for any account that owns a fleet, because it cannot tell which key an app needs. Unset `CARLOS_DEPLOYMENT_BUCKET` and `CARLOS_DEPLOYMENT_DIR`, sign in with `carlos auth login`, and run `carlos secrets set` through the console.

`carlos secrets fingerprint` prints the fingerprint of the `CARLOS_SECRETS_KEY` in `/etc/carlos/host.env`, or in the file you name with `--file`. It runs on your machine, calls no console and never prints the key.

An empty value is refused rather than stored. A command substitution that
produced nothing looks exactly like a real value at the point you type it, and
a stored empty secret usually surfaces much later as a feature quietly not
working. Use `carlos env set` for a value that is meant to be empty.

### carlos instances

In an active high availability region, a non-hibernating binary socket create is refused with status 400 before the instance or its data is created. The refusal does not apply to resident rootfs instances. A binary socket import gets the same refusal before import work begins. A hibernating import keeps the existing status 409 refusal.

If earlier data remains for the address, the create is refused with status 409. The message names only the fixed class of data found: lock, files, replica or other. Choose another address, or ask an operator to purge the old data. If home data cannot be checked, the create is refused with status 503 before any write. Try again. A non-home or pooled high availability data create is refused with status 409 because that data cannot be checked here. Use the console's home region without a pool.

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

The REGION column names where each instance runs, as a place and a code, such as London (UK). While an instance moves, it also says which way.

The `EGRESS` column lists the private addresses the instance may reach, or `-` for none. A word after `!` means the allow is not in force yet: `pending` until the instance next starts, `failing` while its box retries, or `not available` on a box that cannot apply it. The `REASON` column says why, after `egress:`.

`carlos instances list` shows two builds for each instance: the one installed
on its box, and the one serving its requests. They differ while a new build
rolls out, while an asleep instance waits for its next request, and after a
build has failed on that box. The REASON column says which.

`carlos instances retry` clears the failure hold on one instance, so the
build that failed there is tried again, as a canary:

```sh
carlos instances retry --app hello shop-1.hello.example.com
```

When a box refuses an instance's config, REASON in `carlos instances list` says why and what to do. A box without a secrets key needs `CARLOS_SECRETS_KEY` in its `host.env` and a restart with `systemctl restart carlos-edge`. A box that cannot open a secret needs its key compared with the fleet's using `carlos secrets fingerprint` and `carlos fleets ls`. If the keys match, run `carlos secrets set` for the listed values and rotate any credential the console minted.

For a rootfs app, RUNTIME says `rootfs`, or `rootfs, hibernates` for an instance that sleeps when idle. WORKERS counts the instance's running workers out of the ones it declares, and names a worker that keeps crashing. A binary instance shows `binary` and a dash.

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

To start a new instance from a copy of another instance's database, add --from. The copy comes from the source's replica, so the source keeps serving. Both instances belong to the same app and account, and the copy stays in the source's region; run carlos move afterwards to put it somewhere else. The new instance gets its own environment, never the source's, and an empty private store when the app uses one. Add --at with a transaction id to copy an earlier point in the source's history.

```sh
carlos instances create --app shop --host canary.example.com --from www.example.com
carlos instances create --app shop --host canary.example.com --from www.example.com --at 4211
```

carlos instances import moves an instance the platform never ran onto the platform. Stop the old process, take a consistent snapshot of its database (VACUUM INTO works), and run the import with the address of the route it replaces. The console checks the file, the box swaps the route on its next pass, and from then until you commit, the host answers only requests that carry the verify token. With --verify, the CLI requests that path with the token and commits on a 2xx or aborts otherwise. Without it, the CLI prints the token and the two commands to finish by hand. Aborting puts the old route back exactly as it was.

```sh
carlos instances import --app shop --host main.shop.example.com --file main.db --replaces 127.0.0.1:8401 --verify /up
carlos instances import commit --app shop --host main.shop.example.com
carlos instances import abort --app shop --host main.shop.example.com
```

#### What an instance is started with

A hibernating instance is started by the box when a request arrives for it,
as `<your binary> --socket <path> --db <path>`: the unix socket to serve on,
and the SQLite database that is yours. On a box with the nested layout its
working directory is its own data directory, the one the database is in, so
a relative path such as `./data/blobs` lands beside the database and inside
the instance's namespace. (Under the flat layout it was `/`, so the same path
landed in the shared `/data`; `layout migrate` leaves such shared directories
where they are and names them in the agent log for an operator to place.)
Its environment is your app's config bundle, with the instance's own
`<host>.env` layered on top, plus a few variables the platform sets and that
no bundle can override:

| Variable | Value |
|---|---|
| `CARLOS_HOST` | the instance's hostname, exactly as in `carlos instances list`. Read this, never the socket's file name, which says nothing about the host on an isolated box |
| `CARLOS_REGION` | the box's region code, such as `ie` |
| `CARLOS_CONTROL_SOCKET` | the socket the platform listens on for your app's purge and scheduling calls |
| `CARLOS_PURGE` | `header` when the edge honours a `Carlos-Purge` response header |
| `CARLOS_ADMIN_TOKEN` | a secret shared with this one instance: the platform presents it when it calls your app, and your app presents it on `CARLOS_CONTROL_SOCKET` |

The box keeps a sealed copy of each instance's `<host>.env`. It also keeps sealed copies of the `instance.key` and `report.token` files an app keeps at the top of its own directory. These copies are stored in the region's data bucket. Each copy is sealed to the box's secrets key and bound to your app. Only a box that can already read your app's secrets can open it. When a box starts an instance whose `<host>.env` is missing, it puts the sealed copy back first. This keeps the instance's `CARLOS_ADMIN_TOKEN` and `CARLOS_INSTANCE_KEY` instead of giving it new ones. A file that is there is never replaced. You can edit other values in `<host>.env`. The box seals the new contents within a minute. `CARLOS_ADMIN_TOKEN`, `CARLOS_INSTANCE_KEY`, `instance.key` and `report.token` cannot change once sealed. If the box finds a different value, it refuses to start the instance and raises an alert. Deleting the file does not reset it. A box without the secrets key a copy was sealed to will not start that instance. This includes a box whose key was changed. Put the old key back.

A seed (the `--seed` command of `carlos instances enable`) runs with the same
environment, `CARLOS_HOST` included, and no control socket.

A command started with carlos run gets the same environment, without CARLOS_CONTROL_SOCKET or CARLOS_PURGE, and three variables of its own:

| Variable | Value |
|---|---|
| `CARLOS_DB` | the instance's database, the path --db names when the instance starts |
| `CARLOS_RUN_ID` | this run's id |
| `CARLOS_RUN_DIR` | a directory holding the files passed with --file, under their own names. Always set, even with no files. Deleted after the run |

Its arguments are exactly what followed --, after your binary. The platform adds nothing. It runs in the instance's data directory. On a cancel, a timeout or an instance stop it gets SIGTERM, then SIGKILL 20 seconds later.

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

### carlos instances set

Sets how one instance takes new builds: auto or manual updates, the channel, a major version to stay on (stable only), or an exact build to pin. An empty value clears an update setting, so the app's default applies again. System operators can also give the instance its own size with `--size`; `--size default` clears it. See [carlos apps](/docs/cli#carlos-apps).

```sh
carlos instances set a.shop.example.com --updates manual
```

### carlos instances update

Asks the instance's box to install the newest build it considers ready, even with manual updates. The box chooses the build, and it runs on the next start. --fast-track skips the safety delay; only account owners can use it.

```sh
carlos instances update a.shop.example.com
```

### carlos instances set-assets

Turns asset copying on or off for one instance. `off` means requests for its asset files always reach the app, which helps while you are debugging. `on` goes back to following the folders its release declares. An instance follows its release until you set it.

```sh
carlos instances set-assets --app shop a.shop.example.com off
```

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
it back from, so `carlos sidecars ls` shows the build its box last started
for each sidecar, beside the version its channel points at. One that has not
started on any box reads as unknown rather than as current.

A console operator can pause sidecars for every account not named in
`CARLOS_SIDECAR_ACCOUNTS`, a comma-separated list of account sqids. A paused
account gets a 403 with the code `sidecars-paused` from `enable` and
`create`. Its existing sidecars keep running, and `ls`, `wake` and `rm` still
work. Unset, nothing is paused.

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

The REGION column names where each route or box runs, such as London (UK).

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

#### One domain, one instance per region

A regional domain is served in each region by that region's own instance of the app. A request that reaches a server in one region is answered there and never sent to another region. If that region's instance is not running, the request gets a 503.

```sh
carlos domains placements --app shop example.com
carlos domains placements --app shop --set ie=shop-ie.example.net --set uk=shop-uk.example.net example.com
carlos domains placements --app shop --set ie=shop-ie.example.net --set uk=shop-uk.example.net --wildcard --catchall example.com
```

`--set` gives the whole set each time, one `region=instance` per region. Without `--set`, the command shows each region's instance, whether it is ready, and the addresses where its servers answer. Once every region you named is ready, point DNS for the domain at those addresses with latency-based routing.

A regional domain has to be new. A hostname already attached as an ordinary domain is refused, and so is one that a catch-all already covers. To make an attached hostname regional, detach it first, then set its placements again. `--wildcard` and `--catchall` are set when the domain is created and cannot be changed afterwards. To change them, detach it first, then set its placements again.

Each instance stays separate, with its own data, backups and hostname. Path prefixes, static sites and fleet placements are not supported on a regional domain.

When the deployment uses configured regional ingress, set `CONSOLE_REGION_INGRESS` to the complete deployment-wide set of public ingress IP addresses. Keep `PLATFORM_EDGE_IPS` aligned with that same public set. Every `PLATFORM_EDGE_IPS` entry must be a public ingress address. A platform box EIP can qualify if it is public ingress.

Before rolling the console, validate the complete `CONSOLE_REGION_INGRESS` value. Verify that the agents accept the same addresses through `PLATFORM_EDGE_IPS` before setting `CONSOLE_REGION_INGRESS`. Set the console ingress before any group box publishes an edges file.

With configured ingress, DNS guidance uses A records for both apexes and subdomains. `carlos domains placements` refuses configured high availability placements while regional placement readiness is unavailable. The refusal names the configured public ingress addresses and does not list member addresses.

The root CLI help still says that `carlos domains placements` shows the addresses to point DNS at for each region. That help remains unchanged. The configured-ingress refusal limits that promise until regional placement readiness is available.

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

### carlos assets

Throws away or inspects the copies that servers keep of an app's asset files. `carlos assets purge --app shop` makes every instance of the app forget what it has saved, so the next request for each file goes to the app. If it stops part way it names the instances that did not change, and running it again finishes the job. `carlos assets status --app shop` lists each instance with the folders its home server is publishing, whether asset copying is on, and the generation the purge has reached. Copies are only kept for folders the release declares with `--assets`.

A purge reaches every server that can read the platform's storage within a minute. A server that cannot stops serving the app's saved asset files within an hour.

```sh
carlos assets purge --app shop
carlos assets status --app shop
```

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

### carlos ratelimit

```text
usage: carlos ratelimit <show|set|clear> [flags]

  show  -app <a> [-host <h>]
                  the limits on the app's instances (or one host), the
                  plan's ceiling if there is one, and the last day's refusals
  set   -app <a> [-host <h>] [-busy-at N] [-share N] [-rate N] [-burst N]
        [-path /prefix:share=N,rate=N,burst=N]... [-remove-path /prefix]...
                  change only the values you name; the rest stay as they are
  clear -app <a> [-host <h>]
                  go back to the platform's defaults

  -busy-at N      the app counts as busy at N requests in flight (default 64)
  -share N        while busy, each address may have N in flight (default 16)
  -rate N         backstop: N requests a second from one address (default 300)
  -burst N        backstop: bursts of up to N on top of the rate (default 1000)
  -path           different numbers for one path prefix, such as /api/

  -account    <a>       account (sqid or name; default "ops")
  -account-id <id>      account sqid, matched as a sqid ONLY
  -console    <origin>  console to act through (default: the only logged-in one)

Signed-in only (carlos auth login). A quiet app is never limited except by
the backstop, which only a flood from one address reaches. When the app is
busy, the addresses with the most requests in flight are turned away first.
The box picks a change up within seconds of the next converge tick.
```

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

### carlos explain

`carlos explain <code> --app <a>` reads a reference code from a page the platform's edge protection answered. It says which rule fired and when, and shows the request while a record of it is kept, for 7 days.

### carlos protection

```sh
carlos protection [--account a] [--app x] [--record-only on|off]
```

Show or set whether protection only records on this app. When this is on,
protection records what it would have blocked on this app and blocks nothing.
Use it if protection is stopping something real while you fix it.

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
no stored IP. New accounts start with analytics on. Turn it on or off for one
app or for the whole account.

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

##### Request one object

`carlos store scan request` opts a store into scanning. To request a scan for one uploaded object, your app calls the scan API with an app-scoped `service` credential. The account owner creates that credential:

```sh
carlos services create --account example --app hello --role service upload-scanner
```

##### Requesting a scan

Send the credential's bearer token with both requests:

```http
POST /api/cli/apps/{account}/{app}/store/scan/object
{"key":"uploads/report.pdf"}
```

```http
GET /api/cli/apps/{account}/{app}/store/scan/object?key=uploads/report.pdf&wait=30s
```

A separate worker checks for requests every 30 seconds, with a work limit per app. Busy queues can take longer. `carlos store scan status` reports bucket-sweep coverage; use the object endpoint for this upload's result. See [Receiving scan results](/docs/scan-callbacks).

##### Before scanning

The API scans the app's default store. It has no environment-store selector. The store must be provisioned, scanning must be enabled for the deployment, and a member's plaintext request must have been granted by an operator.

##### Callback keys

Polling works without callback keys. For callbacks, set `CARLOS_SCAN_WEBHOOK_KEY` to a newly generated 32-byte secret encoded as hex. The per-app callback secret delivered to your app is also hex-encoded; decode it before verifying signatures.

An operator replaces one app's callback secret with:

```sh
carlos store scan rotate-webhook-key --app hello
```

This changes only `hello`. A scan grant can also deliver a callback secret. Delivering changed config restarts affected apps.

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

### carlos accounts plan

Shows or changes an account's plan. It is a deployment-operator command, and it only works where the console has a plan catalog (see [Plans](plans)).

```sh
carlos accounts plan --account bac
carlos accounts plan --account bac --set personal --pack apps=2 --reason "needs more apps"
carlos accounts plan --account bac --set free --sponsored limits.json --reason "existing account, sponsored"
```

Without `--set` it prints the plan, who set it and why, and every limit the account has. With `--set` it changes the plan and prints the result. `--reason` is required for a change. `--pack` can be repeated. `--sponsored` names a JSON file of limits; each one replaces the plan's limit where it is more generous.

### carlos billing

Lists the billing problems the console could not settle on its own, and closes one once you have dealt with it in the Stripe Dashboard. It is a deployment-operator command, and it only works where the console has billing turned on (see [Plans](plans#billing-operators)).

```sh
carlos billing problems
carlos billing problems -all
carlos billing close -id 12 -note "refunded and cancelled in the dashboard"
carlos billing house -account bac -on -note "our own shop"
carlos billing house -account bac -off -note "now a customer"
```

`problems` prints one line per open problem: its number, the account, the reason, the subscription, when it opened (UTC) and what the console saw. `-all` adds closed problems. `close` needs `-note`. The console refuses to close most problems while Stripe still shows the subscription as live.

`house` marks an account as a house account, whose checkout carries the house coupon and so pays nothing, or clears the mark. It needs `-account` (the account's sqid), exactly one of `-on` and `-off`, and `-note` saying why. The mark applies when the account starts a checkout, and does not change a subscription it already has. It works only against a console. See [Plans](plans#house-accounts).

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
stops it. A box that has ever run an instance is detached only after its
instances have moved and its machine is terminated, as the next section says.

On a fleet with two or more boxes, the console picks the box each instance
runs on. To take a box out, drain it, terminate its machine, then detach it:

```sh
carlos fleets drain acme pi-1
# once its instances have moved, terminate the machine
carlos fleets detach-box --terminated acme pi-1
```

`drain` moves every instance assigned to the box to the fleet's other boxes
and gives the box no new ones. If any instance has nowhere to go, nothing
changes and the command names the affected apps. This happens when no other box
is ready for it, when the platform does not manage its process, or when the
console has not placed it on a box yet. The box keeps its access while its
instances leave, so it can stop them and upload their final writes.

`--terminated` tells the console that the box's machine is gone. The console
cannot check for itself that a box has uploaded everything, so it detaches a
box that has run instances only with this flag. Without it the command refuses
and says to drain first. Drain before you terminate the machine: writes the
box never uploaded are lost with it. A box that has gone silent is detached the
same way once you know its machine is gone. Its instances move to other boxes
on their own. A box that has never run an instance detaches at once, without
the flag. On the fleet page, tick Machine terminated before you press Detach.

In `carlos fleets ls`, a draining box shows `draining` in STATUS. LABELS
PAUSED reads `yes` while a box of the fleet runs a release too old for the
console to move instances between boxes. The console stops moving them and
logs an alert until that box is updated. It reads `unknown` when the console
could not read every box's report, and `-` otherwise.

An app on a fleet cannot hold a secret until the fleet has its own secrets key. The key is a pair. The private half stays on your fleet's boxes and the platform never sees it. The public half goes to the console, which seals every secret and credential for the fleet's apps to it.

Make the pair with `carlos secrets genkey`. Put the private half in `/etc/carlos/host.env` on every box as `CARLOS_SECRETS_KEY`, then restart the agent with `systemctl restart carlos-edge`. Register the public half with `carlos fleets secrets-key <name> <pubkey>`. Only an account owner can do that.

Register it with `carlos fleets secrets-key home <pubkey>`, or pass `--file` with a file that holds a `CARLOS_SECRETS_PUBKEY=` line or the bare key. The command prints the key's fingerprint.

A key belongs to one fleet only, and it cannot be the platform's own. Registering the same key on the same fleet again changes nothing.

If apps on the fleet already hold sealed values, the command lists them. They were sealed to another key, so the fleet's boxes cannot open them. Set each secret again with `carlos secrets set`, and run `carlos store rotate` or `carlos email rotate` for a credential the console minted. The STALE column of `carlos fleets ls` counts what is left.

To check that a box holds the registered key, run `carlos secrets fingerprint` on the box. Its answer should start with the characters in the SECRETS KEY column of `carlos fleets ls`, which shows the first 12 after `sha256:`.

You can replace a fleet's key only while none of its apps holds a sealed value. Unset those apps' secrets, register the new key, set the secrets again and rotate the credentials the console minted. If a key may have leaked, take the box off the fleet first. A box that has never run an instance can be detached at once with `carlos fleets detach-box <fleet> <label>`. Otherwise drain it with `carlos fleets drain <fleet> <label>`, terminate its machine once its instances have moved, then detach it with `carlos fleets detach-box --terminated <fleet> <label>`. Rotate the credentials after detaching. The drain needs the box's current token: rotating first would cut the box off before it sees its instances leave. A detached box stops reading the platform's store.

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

`run` is for a server that starts commands of an app against its instances, and no other role does that. It is minted with `--app` and `--commands`, and it can run only the commands it names. See [Runs from a service](#runs-from-a-service); it also says what a prefix allows.

`team` is for a server that provisions instances for teams inside one app
without reaching the app's own: it is minted with `--app` and `--scope`, and it
reaches only the environments its scope owns (see [carlos env](#carlos-env)),
the instances bound to them, and their hostnames. It creates socket-backed
instances, sets their env and secrets, restarts and deletes them, and attaches
explicit hostnames to them. It never sees the default bundle or an instance on
it, never sets a platform-managed key, and anything outside its scope answers
as if it did not exist. Revoking the credential does not release its
environments; `carlos env release` does.

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
process, which is what lets adoption cycle it and the root pass deliver its
config; it needs `--addr` and neither `--socket` nor `--hibernate`; leave it
off for an ordinary exec child.

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

Naming a unit also hands its config to the root pass: on every config
write the pass renders the route's bundle to `/etc/carlos/apps/<host>.env`,
keeps a drop-in under `/etc/systemd/system/<unit>.d/` that makes the box's
`/etc/carlos/units/<unit>.base.env` (if there is one) and that file the
unit's only `EnvironmentFile=` sources, reloads systemd and restarts the
unit. The box delivers only to a unit that `/etc/carlos/named-units.json`
(a root-owned file written when the box is set up) declares for the route,
with the route's host, account and app, never from the route row alone:

```json
{"schema":1,"units":[
  {"host":"relay.example.com","account":"bab","app":"relay","unit":"relay.service",
   "addr":"127.0.0.1:8451","health":{"path":"/ready"}}
]}
```

Removing a unit's line is what removes its drop-in; changing or removing
the route only stops delivery. The box's own file for the unit,
`/etc/carlos/units/<unit>.base.env`, must be plain ASCII `NAME=value`
lines and `#` comments. A unit that loads any other environment
file, or a variable named in both the base file and the route's config, is
refused and the reason is logged on the box until one of them is changed.
A stamp needs an addr upstream and no hibernation; `--unit` refuses a
socket or hibernating row, `--hibernate` refuses a stamped one, and
`--unit -` always clears.

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

#### carlos proof history

Read or reconstruct a box's root release history. These operator commands use
`CARLOS_DEPLOYMENT_BUCKET` (or `CARLOS_DEPLOYMENT_DIR` for a local store),
`CARLOS_RELEASE_PUBKEY` and the deployment root signing key in
`CARLOS_RELEASE_KEY`. Scoped signing keys cannot authorize this work.

```sh
carlos proof history status --bucket <bucket> --box <box> --enrollment <id> --account <sqid> --app <app> --host <host> --state status.json
```

The command saves its signed request before delivery, then waits up to 30
seconds for a signed response from the enrolled box. The JSON response includes
category completeness, revisions, pending reconstruction and retained recovery
outcomes. A successful status read does not mean migration is complete.

To reconstruct history, prepare a JSON `HistoryReconstruction` decision using
the identity, revision, app revision, bake revision and host sources from that
response. Set `schema` to `1`, `kind` to `carlos-release-history`, a unique
`operation` and the current `issued_at` time. Name every affected host and its
revision and refusals. Explicitly state the historical `production`,
`production_set_at` and `holds` bounds; hold windows use nanoseconds. Review
those decisions before signing. For an interrupted reconstruction, `replaces`
must name the exact `pending_digest`. Root retains the pending decision's denies.

```sh
carlos proof history reconstruct --bucket <bucket> --box <box> --enrollment <id> --account <sqid> --app <app> --host <host> --input decision.json --state reconstruction.json
carlos proof history resume --bucket <bucket> --state reconstruction.json
```

`reconstruct` succeeds only after the box confirms the exact signed decision.
It does not retire independent recovery outcomes or establish a fresh install.
`retire` takes the same flags with a `HistoryRecoveryRetirement` decision:
`schema: 1`, `kind: carlos-release-recovery-retirement`, `identity`, `operation`,
`issued_at`, `binding`, `source`, `attempt_id`, `outcome_digest`, `verified_id`
and `verified_digest`. The witness must be a later root-verified success.
Pending originals and unrelated outcomes remain restrictive.

Use a new `--state` file for each decision. Keep it if the command times out or
is interrupted. `resume` reuses the saved authorization and challenge without
a signing key. It does not refresh their 24-hour validity. `--wait` changes the
readback wait. A delivery acknowledgement alone never reports completion.

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

For the console box, if `CARLOS_ALERT_ENGINE_BEAT` is set in its `host.env`,
the column also shows ` engine-beat=on` while the agent watches the console's
alert engine, or ` engine-beat=off (...)` with the reason. For example,
`engine-beat=off (agent runs as root, so the backstop is off)`. Boxes without
the setting show no additional field.

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

A sleeping instance has no process or reading, so it does not appear. A note
under the table explains this. Each reading belongs to the account whose own
platform domain the instance's hostname is under
(`<name>.<account>.<apps domain>`), wherever the instance runs, or to the
owner its box recorded with the reading. An instance with neither, such as one
on a custom domain, appears as `(unattributed)`. Its usage counts against no
account, including the platform.

`--layout` shows which layout each instance is on, box by box. `flat` is the
shared `/data` every instance used to live in. `nested` is the instance's own
directory, where it cannot see its neighbours. `fenced` means a move between
the two is in progress or stopped part way, and `conflict` means two routes
claim the same directory; neither wakes until that is resolved. `foreign`
rows have paths the layout pass does not recognise and leaves alone, and
`external` rows are run by another supervisor. `alias` rows are platform
addresses that use another instance's process. `REASON` says when the alias
socket does not exist. Requests to that address then fail. Like
`--instances`, it goes through the console and is operator only.

The REGION column names where each route or box runs, such as London (UK).

The `SIZE` column is the size an awake nested instance runs at: `swap` while a deploy is swapping it, `?` when its box could not read it, and `-` for anything else. `standard>large` means it runs at standard and its policy asks for large; a note under the table says when that takes effect. The `EGRESS` column is the instance's egress allow as its box applies it. A `!` before an address means one of the deployment's boxes now holds it. A word after `!` means the allow is not in force: `failing`, `policy unreadable`, `policy unverifiable`, `policy expired`, `box not wholly nested`, `not yet supported under claims`, or `refused` when the box dropped an entry. `REASON` gives the detail after `egress:`.

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
store, verifies it against the signed pointer, installs it, restarts its
instance-control service and then its edge, and rolls back to the previous
binary if the new one does not come up and stay up. `status` shows each box's platform, channel, running build, the channel's
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

#### Cancel an unpublished activation

If an unpublished platform update holds its channel, an ops account owner or
system operator can cancel that reservation:

```sh
carlos system cancel-activation --channel stable --activation ACTIVATION_ID
```

Use the activation ID from the refused update or rollback. The command confirms
before cancelling; use `--yes` for an already reviewed automation. Cancellation
prevents a delayed publication from taking effect. It does not change a box's
release. A published activation stays held until its boxes complete or valid
fencing evidence excludes them.

#### Instance layout

Every instance the activator runs used to live in one shared directory as one user, where it could read its neighbours' files. `layout migrate` moves them out: each instance gets its own directory and, from its next wake, its own mount and pid namespace, where it sees its own files and nothing else. An instance that is asleep is moved at once; one that is awake is left for up to an hour to go to sleep, then stopped briefly and moved. `--force` skips the hour. `--box` scopes the request to one box, so a fleet moves one box at a time with `carlos status --layout` showing each box's rows turn `nested`. Once a box's layout is `nested`, a newly provisioned instance on it starts out `nested`; it is never created in the shared directory first.

`layout migrate` is refused while any box in scope runs a platform release from before the layout, so a fleet is rolled forward first and migrated second.

What moves with an instance is everything in the box's data directory that carries its hostname: its database and the platform's files beside it, and anything the app made for itself under that name, such as a `<host>/` directory holding its keys or a `<host>-blobs` store. They land in the instance's directory under the same names, which is where an app that derives paths from its database path now looks. An entry that cannot be moved safely, such as a file hard-linked from outside the instance's own files, or a symlink, stops the move with its name in the reason, and the instance is held until it is cleared. A directory that carries no hostname, such as a `blobs` directory that several apps wrote into with the working directory `/`, is not moved: the box cannot tell whose it is. The agent log names those once a move has happened; an operator moves what an app owns into that app's instance directory by hand, and it comes along on any later revert or migration. A file named like another instance's platform files (`other.example.com.env`, `other.example.com.db`), including one left by an instance that has since been deleted or moved away, is never taken; the log names it. `revert` brings the same names back. What an app wrote relative to its working directory while nested (a `data/blobs` under its instance directory) is not among them: it stays in the instance's directory, where the flat app does not look, but nothing is lost. An instance that was moved before the platform carried entries along still has them in the shared directory; `carlos status --layout` and the agent log say so on every pass until an operator moves them.

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

#### carlos system named-units

`carlos system named-units install <file>` installs the box's declaration
of named units, `/etc/carlos/named-units.json`, from `<file>`. It runs as
root only. It checks the file first (schema 1, one JSON document, one line
per host and per unit, as shown under `carlos route`), then replaces the
live file in one step while holding the lock the config pass holds, so a
pass never sees half a change. Provisioning writes the file before the
agent starts, or runs this command; editing the file by hand while carlos
runs is not supported, and a pass that sees the file change under it does
nothing and says so.

```sh
carlos system named-units install /root/named-units.json
```

#### carlos system db-worker

`carlos system db-worker` runs on platform boxes only. systemd starts it for each forwarded database query. You never run it yourself.

#### carlos system journal-migrate

Before starting claim-enabled services on a box with legacy journals, stop the edge and agent. Run `carlos system journal-migrate` as root with `CARLOS_HOST_CLAIM=1` and the deployment environment loaded. The command imports journals only when signed root stop evidence verifies them. It leaves the original files in place. After migration, root ignores changed legacy files and logs an alert. Keep the migration marker.

The migration census reads the backfill plan `backfill-collect` wrote. It reports each ordinary instance route on the box as that box's installation, so `backfill-adopt` can give the host to this box. If the window masks units by moving each unit file aside and linking `/dev/null` in its place, pass `--window DIR`, the window's directory, with the originals in `DIR/held`. The census then accepts those masks and no others.

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

##### Deployment-wide callback rotation

After configuring a new `CARLOS_SCAN_WEBHOOK_KEY`, keep the old key in `CARLOS_SCAN_WEBHOOK_KEY_PREVIOUS` during rotation and run:

```sh
carlos system antivirus rotate-webhook-key
```

The CLI delivers secrets in bounded batches until complete. It does not create or change the master key. Apps whose delivered secret changes restart. The current and previous master keys must differ; a previous key without a current key is refused.

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

#### The seeds floor

carlos system seeds-floor publish sets the first release whose boxes can place a seed. Publish it once every box runs that release. Each box arms it within the hour, and from then on a box never recovers to an older build. Until every box in a region has armed it, carlos instances create --from and carlos instances import refuse there.

```sh
carlos system seeds-floor publish --min-release v0.27.0
```

#### Legacy route assignments

carlos system legacy-routes assign says which account and app the routes an operator filed by hand belong to. A route added with carlos add in direct mode is filed under the operator account, so its app name alone does not say whose it is. An import takes over such a route only when an assignment maps its name to the importing app. A name has one assignment, and it cannot change while an import under it is in progress, from when its old process is marked stopped until it is committed or aborted.

```sh
carlos system legacy-routes assign --name shop --to bac/shop
```

#### Instance lifetimes

carlos system lifetimes cutover switches a console without host claims onto instance lifetimes. It is done once per deployment, and it cannot be undone. Every box must run a release that knows about lifetimes first.

Roll the boxes before the console. Until the console rolls, an older console may rewrite an instance record without its sequence field, record_seq. That is the exposure the deployment has today, and it ends when the console rolls.

An older box, one whose release does not publish lifetimes-1, must never be started, restarted or rolled back into the fleet once control/lifetimes-cutover.json exists.

Run it in this order:

1. Stop the old console. An older console must never run beside this one, and must never be started again once the cutover has begun.
2. Start the new console.
3. Run the command, and read its output until it says on.

```sh
carlos system lifetimes cutover
```

The console writes control/lifetimes-cutover.json and at once stops taking changes of every kind. While it switches on instance lifetimes, every change made through the console answers 503 "the console is switching on instance lifetimes. try again in a minute". That covers changes to instances, deploys and promotions, invites and account actions, from the CLI and from the browser. Reads keep working. The refusal lasts at least a minute. It lasts longer while changes the console took before the marker are still finishing, and the command prints how many are left:

```text
instance lifetimes: switching on; 2 unit(s) of earlier work still finishing
```

A minute after the last of that work ends, lifetimes are on:

```text
instance lifetimes: on since 2026-10-22T12:01:30Z
```

The command asks again every 5 seconds until lifetimes are on. Running it again is safe: it only reports how far the console has got. With --no-wait it prints the state once and returns.

While the console starts, until it has read the marker, every page answers 503 "the console is starting. try again in a minute". This is usually over in a moment.

A console that restarts after the cutover waits a minute after its own start before it turns lifetimes on again. A marker written by hand closes the console to changes within 10 seconds. If the marker exists but cannot be read, the command says so; repair control/lifetimes-cutover.json by hand. A console with host claims has no lifetimes, and refuses the command.

Operators only.

#### Box and group roles

carlos system box role says whether new instances may be placed on a box. A box with the default role can take them. A legacy or platform box keeps the instances it has and takes no new ones: no new instance, relocation or move lands on it. carlos system group role sets the role of every box a region's group has enrolled, and of every box it enrolls later. Both work only on a console with region HA on.

Do not set a role until every box and console in the deployment runs a release that knows about roles. A box on an older release cannot read a roster that carries one.

```sh
carlos system box role i-0123456789abcdef0 legacy
carlos system group role ie default
```

Ops account owners and `CARLOS_SYSTEM_OPERATORS`.

#### A box's identity record

carlos system box publish-record publishes the box's identity record to the deployment bucket, at control/boxes/<box>.json, where the host claim's enrollment reads it. The record is the box's EC2 instance identity document and AWS's signature over it, so AWS vouches for the box, not the box itself or you. The agent publishes it by itself only in a region with HA on. Anywhere else, run this once on the box as the agent user, with the box's host.env loaded. This is the only supported way to run it:

```sh
systemd-run --wait --pipe -p EnvironmentFile=/etc/carlos/host.env -p User=carlos /opt/carlos/carlos system box publish-record
```

It refuses to run as root, on a fleet box, and on a box with no S3 deployment bucket. It only ever creates the record, and only an S3 bucket can refuse to overwrite one. If a record is already there, it checks it the way enrollment does: AWS's signature, the account, the region, the instance and the box name. A valid record is kept as it is, even an older one written before the instance was stopped and started, and nothing is written. Any other record is refused, with what is wrong, and left alone. A valid record means only that the evidence is in place. Enrollment still makes its own checks before it accepts the box.

#### Boxes a region's group launches

In a region with HA on, the boxes its Auto Scaling group launches set themselves up with no hand steps. A box's start-up runs two commands as root before it starts the agent.

carlos system host-env write builds /etc/carlos/host.env from the deployment's parameters: SecureStrings in AWS SSM under /carlos/<deployment>/<region>/ and, for the values every region shares, /carlos/<deployment>/shared/. If a required value is missing, it stops and writes nothing.

carlos system install-channel installs the release the box's channel names, as both carlos and carlos.prev, once it passes the published host floor. A box that already runs a release is refused: carlos system update moves it.

With --policy FILE, the armed policy carlos system claims run sign-policy wrote, it installs before the host floor is published. The policy's floor stands in for the published one, and once a floor is published the two must be the same. It also arms a box that carlos system update has already moved to the channel's release: carlos is left as it is, and carlos.prev, the release before, is replaced by it, so guard-arm finds the release in both. A box on another release, or with an armed guard, is still refused.

With --policy, --identity FILE is needed too: the release identity carlos system claims run publish-identity wrote. Before a floor is published, the channel pointer carlos system update writes names no release tag, so the release is found through this file instead. It must be the identity published for its tag, and it must name the release and the artifact the channel names.

```sh
carlos system host-env write --deployment prod --region ie
carlos system install-channel
```

The agent then joins. It publishes the box's identity record and hosts nothing. Once the console has checked with AWS that the new box belongs to the region's group, it invites the box. The box arms its host lifecycle guard, the console checks the group again and enrolls it, and the box restarts as a hosting box. Only then does the load balancer send it traffic.

carlos system host-env seed copies a box's existing host.env into those parameters, once per region. It writes the region's own values and any shared value not yet set. It refuses to change a shared value another region has set.

```sh
carlos system host-env seed --deployment prod --region ie --kms-key alias/carlos-prod-config
```

Seeding needs ssm:GetParametersByPath and ssm:PutParameter on the deployment's two parameter paths, and kms:Encrypt and kms:Decrypt on its configuration key.

### carlos move

Moves into or out of an active high availability region are refused before staging, stopping or other move state is written. Imports into an active high availability region are refused before import data is written. An immutable high availability record remains refused even after the region setting is turned off. Static records are exempt only from this new regional refusal. Existing seed, runtime, shape and immutable-record refusals still apply. Operations that already started can finish or be cleaned up.

Moves one instance to another region. The instance keeps serving while its
data is copied, then goes offline for the cut. If the new region cannot start
it, the move takes it back to where it was, on its own.

Moves are off unless the console runs with `CARLOS_MOVES_PHASE1` on. Against
any other console, `carlos move` sends nothing. Run it as yourself, not as
root.

```sh
carlos move --host <host> --to <region> [--manual-cut] [--no-wait]
carlos move status  --host <host> [--wait]
carlos move cut     --host <host>
carlos move abort   --host <host>
carlos move resolve --host <host> --retry
carlos move resolve --host <host> --declare-lost <box>
```

`carlos move`, `cut`, `abort` and `resolve` wait until the move ends unless
you pass `--no-wait`. `carlos move status` reads the move once; with `--wait`
it waits too, which picks a wait back up after a disconnect. `--manual-cut`
stops once the move is ready, and `carlos move cut` starts the cut.
`--app` and `--account` name the instance's app and account, as for
`carlos instances`.

`--declare-lost <box>` declares the move's target box lost, for a box that
will not come back. It needs the console's host claim. It reads the box
through your own AWS credentials and refuses unless AWS shows it stopped or
terminated. It says what the declaration loses, and you type the host name
to confirm.

| exit code | meaning |
|---|---|
| `0` | the move finished, the console accepted a command given `--no-wait`, or `status` found the move still under way |
| `3` | the move rolled back or was aborted |
| `4` | the move needs an operator: it is stuck, waiting for a box, or ready for a manual cut, or its outcome was not recorded |
| `5` | refused, by the console or before anything was sent |
| `1` | the console could not be reached, or answered with an error |

Operators who are members of the instance's account.

`carlos move offline` moves one instance with planned downtime, one step at a time. It is for operators, works with host claims and Phase 1 moves off, and never acts on its own: each verb does one step and says which verb comes next.

```sh
carlos move offline stage  --host <host> --to <region>
carlos move offline start  --host <host> --to <region>
carlos move offline seal   --host <host>
carlos move offline flip   --host <host>
carlos move offline open   --host <host>
carlos move offline finish --host <host>
carlos move offline abort  --host <host>
carlos move offline status --host <host>
```

The instance is offline from `start` until `open`. Until `open`, `abort` puts it back where it was with nothing lost. After `open`, moving it back is a new move.

`stage` is optional and comes before `start`. It copies the instance's data to the region it moves to while the instance keeps serving, and each time it runs it copies only what is new. The more it has copied, the less is left to copy while the instance is offline. Until `start`, `abort` removes the staged copy and the instance is never offline.

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

It stays up once the first wake has started it, so it has to be restarted
whenever the platform binary changes; `carlos system update` does that, and
a hand roll must too. A box checks both ends: the service refuses to be
ready while the binary it runs is no longer `/opt/carlos/carlos`, and the
agent refuses to wake isolated instances while the service reports another
build than its own, or none. Either way the reason in `carlos logs` ends
with `restart carlos-instance-control.service`.

### carlos instance-exec

The first thing an isolated instance unit runs. It reads the launch file
the agent wrote into the instance's directory and starts the host's live
link with exactly the arguments and environment in it, refusing anything
that is not the platform's own live link. It then stays on as the
instance's first process: it passes stop signals on to the app, cleans up
exited processes, and exits with the app's status, so an app with no
signal handling still stops cleanly.
`ExecStart=` of the four instance templates.

### carlos instance-exit

`ExecStopPost=` of the four instance templates. It leaves an advisory
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

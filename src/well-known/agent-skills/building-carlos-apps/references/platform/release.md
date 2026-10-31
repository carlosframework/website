# 🤖 Releases, canaries and verification

Read only when releasing, reviewing a canary, rolling back or verifying a rollout.

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


## Two builds at once

Since v0.26.0, where the deployment has switched it on (Carloku did on
2026-10-14; the release default is off, and then a build is taken by
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

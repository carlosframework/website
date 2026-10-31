# 🤖 Custom domains and regional placement

Read only when attaching a custom hostname, configuring a wildcard or
per-instance catch-all, or making one domain serve from a different instance
in each region.

## Ordinary domains

Attach, inspect, prove and remove a hostname through the console API-backed
CLI:

```sh
carlos domains attach --app hello www.example.com
carlos domains verify --app hello www.example.com
carlos domains list --app hello
carlos domains detach --app hello www.example.com
```

Use `--route` on attach to choose the target route; it may be omitted when the
app has exactly one instance record. On deployments requiring domain proof,
attach prints the `_carlos-challenge.<hostname>` TXT record and `verify`
completes the claim. An unproved reservation expires after seven days.

An exact claim wins over a catch-all. Attaching `'*.example.com'` gives each
instance of the app `<instance-label>.example.com`; its parent must already
be attached within the same account and wildcard DNS must point at the
deployment. A signed-in person must attach or detach it. Publishing the
`_carlos-catchall.<parent>` TXT record reserves every one-label name rather
than only labels of current instances.

Enable `--wildcard` on the parent claim when one wildcard certificate should
cover its one-label children. Catch-all service requires wildcard capability.
Domain restrictions depend on deployment policy: CARLOS always protects its
own exact console names and other accounts' platform namespaces, while a
hosting deployment may reserve all platform domains.

## One domain, one instance in each region

The regional-domain source in pinned platform commit `a2e23ba0` adds:

```sh
carlos domains placements --app shop example.com
carlos domains placements --app shop \
  --set ie=shop-ie.example.net \
  --set uk=shop-uk.example.net example.com
carlos domains placements --app shop \
  --set ie=shop-ie.example.net \
  --set uk=shop-uk.example.net \
  --wildcard --catchall example.com
```

This source capability must not be read as a statement that Carloku, or any
particular deployment, has released and activated it. The write is gated on
the console and every live server being able to read regional claims; the CLI
will refuse older consoles, incomplete fleet evidence, servers or followed
channels below the required release, and deployments using the incompatible
host-claim mode. Check the target deployment through this command rather than
assuming availability.

Without `--set`, the command is read-only. It shows each region's instance,
readiness and the server addresses that count; point latency-based DNS only at
ready-region addresses. A regional request never backhauls to another region.
If the local region has no bound, running target, CARLOS answers 503.

With `--set`, every invocation replaces the complete placement set. Always
send all desired `region=instance` pairs; omitted regions are removed. There
must be one to eight unique regions and unique targets. Each target must be a
non-replica process instance of this app in the named region. Static routes,
services, TCP-backed instances, fleet placements and path-prefix routing are
not supported. Each regional instance remains independent, including its
data, backups and ordinary hostname.

Regional mode is only created for a new claim. A hostname already attached as
an ordinary domain must be detached first; a hostname covered by a catch-all
is also refused. CARLOS fails closed when it cannot prove fleet state or when
the hostname overlaps an ordinary, wildcard or descendant claim. Domain proof
still applies.

`--wildcard` and `--catchall` are creation-time modes. On later placement
updates they may be omitted, but if supplied they must equal the stored modes.
To change either, detach the regional domain and create it again. `--catchall`
requires `--wildcard`.

Readiness is per region, but a safety hold can keep every region unready while
fleet evidence is incomplete, an ordinary route collision exists, or old
alias state is still settling. Re-run the read-only command until each desired
region reports ready before changing DNS.

## App region and deploy region are defaults, not moves

```sh
carlos apps region --app shop
carlos apps region --app shop --set uk
```

The app region controls where future instances start. Changing it does not
move existing instances. Moving an existing instance is a separately authorized
operator workflow (`carlos move`) where supported; do not treat a region
setting as a move. Fleet
apps and apps whose instances start in a pool refuse this setting because
their placement authority lives elsewhere.

On a new app, `carlos deploy --region uk` chooses its initial app region. On
an existing app it must match the app's current region and deploy stops before
shipping if it does not. Deploy never moves an instance to satisfy
`--region`. Regional custom-domain placements likewise bind existing
instances; they do not create or relocate them.

Sources: `docs/site/cli.md` (`carlos apps`, `carlos deploy`, `carlos domains`);
`domains_cli.go`; `internal/console/apiplacements.go`;
`internal/domains/claims.go`; `internal/edge/regional.go`; pinned platform
source `a2e23ba0` (2026-10-31).

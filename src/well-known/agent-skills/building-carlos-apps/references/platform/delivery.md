# 🤖 Delivery: temporary sites, assets and static-site rules

Read only when creating a disposable static site, distributing public assets
from a process app, or configuring redirects and response headers for a static
site.

Support below is checked against platform source `a2e23ba0`, not a statement
that Carloku or another deployment has rolled it out. Check installed CLI
help and console capability responses before relying on it.

## Disposable static sites

`carlos deploy --temporary` claims, ships and deploys a new static app which
expires automatically:

```sh
carlos deploy --temporary ./dist
carlos deploy --temporary --ttl 3d --app preview ./dist
```

The generated name is `tmp-` plus six random letters and digits. Supplying
`--app preview` makes it `tmp-preview`. The default lifetime is 7 days;
`--ttl` accepts 1 hour through 30 days and implies `--temporary`. An account
may have at most 20 temporary apps.

A temporary app is static and is served only at its platform hostname.
`--host` and `--kind binary` are refused. When its time expires CARLOS moves
it to the Trash. It keeps the instance record there so a restore can restore
the route, but purges the app after 3 days rather than the usual 30.

Change the deadline or convert the app to an ordinary permanent app with:

```sh
carlos apps ttl --app tmp-preview 5d
carlos apps keep --app tmp-preview
```

`apps ttl` sets a new expiry between 1 hour and 30 days from now. `apps keep`
removes the expiry and retains the `tmp-` name.

## Public asset copies for process apps

For a binary/process app, repeat `--assets` to declare release-owned public
folders:

```sh
carlos ship --app shop --assets /assets/ --assets /fonts/ ./shop
carlos deploy --app shop --assets /assets/ ./shop
```

Each path must begin and end with `/`, be at most 128 bytes, and contain none
of `%`, `?`, `#`, `*` or `..`. `/` itself is refused, folders cannot nest,
and one release may declare at most eight. Static sites cannot use this
feature because their whole release is already available at every edge.

Only put public files in these folders. The edge fetches them without visitor
cookies or login. It keeps a response only when it is status 200, has a
cacheable `Cache-Control`, has a non-HTML `Content-Type`, and has no
`Set-Cookie`. `Carlos-Cache` reports `hit`, `miss` or `bypass`.

The folder list belongs to the release, so rollback restores that release's
list. Save it as `"assets": ["/assets/"]` in `.carlos/config` for bare
deploys. Command-line `--assets` replaces the saved list for that run;
`--no-assets` explicitly ships none. The two flags are mutually exclusive,
and a release with no declared folders turns copying off for that release.

Inspect and invalidate the edge copies with:

```sh
carlos assets status --app shop
carlos assets purge --app shop
carlos instances set-assets --app shop a.shop.example.com off
carlos instances set-assets --app shop a.shop.example.com on
```

`status` shows the folders, per-instance enablement and purge generation.
`purge` advances every instance so the next request fetches each file from
the app; retry it if it reports unfinished instances. `set-assets off` is a
per-instance debugging override, while `on` returns that instance to its
release declaration.

## Static redirects

Put `_redirects` at the root of the deployed directory. Each non-comment line
is `source destination [status]`. Rules run in file order and the first match
wins. Sources may use `:name`, a final `*` with `:splat`, or a full URL whose
host limits the match. Redirects default to 301 and may use 302, 303, 307 or
308. Status 200 rewrites to a site file; 404 serves a site file as the
not-found response.

An existing file normally wins over a rule. Add `!` to a redirect status,
such as `301!`, to force the rule to win. Query strings carry through unless
the destination supplies one. CARLOS refuses unsupported lines, conditions
and cross-host proxy rewrites; the limit is 2,000 rules.

A directory path without its trailing slash normally redirects to the slash
form before serving `index.html`. If `_redirects` names the unslashed path or
redirects its slash form, that rule takes precedence and CARLOS serves the
folder at the requested path.

## Static response headers

Put `_headers` at the site root. A source path is followed by indented
`Name: value` lines. Matching uses the browser's original URL, before a
`_redirects` rewrite. Every matching block applies; for a repeated header,
the lower block wins, so put broad rules before narrow ones.

Headers apply to normal file responses, including 304 and range responses,
but not redirects, not-found responses or errors. Supported headers are
`Cache-Control`, `Access-Control-Allow-Origin` (only `*`),
`Access-Control-Expose-Headers`, `Cross-Origin-Resource-Policy`, and
`Timing-Allow-Origin` (only `*`). A `Cache-Control` rule replaces the static
file default of `no-cache`. The limit is 100 path blocks. Neither `_headers`
nor `_redirects` is itself served.

Sources: `docs/site/cli.md` (`carlos apps`, `carlos ship`, `carlos deploy`,
static redirects and headers, `carlos instances set-assets`, `carlos assets`);
`domains_cli.go`; pinned platform source `a2e23ba0` (2026-10-31).

# 🤖 Errors, availability and analytics

Read only when diagnosing errors or downtime, inspecting logs or configuring analytics.

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
daily visitors, bytes served, top pages, top referers —
**no JavaScript, no cookie, no stored IP**, which is why an app on CARLOS
has no business reaching for a third-party analytics script. Visitors are
a sketch, so a multi-day total is daily visitors summed rather than a
deduplicated unique count. The switch is per-app or account-wide.
Where the deployment publishes a GeoIP database, page views are counted
by country too.

Neither replaces `carlos logs`, still the merged app + platform + edge
timeline (`-f`, `--grep`, `--since`, `--stream app`, `--host`) with no
box access.


## Explain a blocked request

When a visitor has an edge-protection reference code, run
`carlos explain <code> --app <app>`. The rule, time and retained request are
available for seven days. Use `carlos logs --field process=web` to select a
rootfs process; `release` and the process names in its manifest are other
values. The platform's process label overrides any app JSON field.

Current source also counts bot names and browser/device dimensions. Do not
promise those columns in the CLI: the API contains them but the current
printer does not show every map. A console UI or API capability is not
necessarily a CLI display capability, and named events are not a guarantee
about the current console. Check the deployed version before relying on a
new diagnostic field.

Sources: platform `docs/site/cli.md`, `analytics_cmd.go`,
`internal/analytics/read.go`, `logs.go` at `a2e23ba0`.

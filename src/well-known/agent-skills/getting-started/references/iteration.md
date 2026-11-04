# 🤖 After the first deployment

## Iterating

| Want | Command |
|---|---|
| Release again | `carlos deploy --message "Fix invoice rounding"` (from the project dir) |
| Config var | `carlos env set --app myapp --message "Update the app setting" KEY=value` (converges in seconds) |
| Secret | `carlos secrets set --app myapp KEY=value` (sealed, never printed) |
| Tail logs | `carlos logs --app myapp -f` |
| Bounce the process | `carlos restart --app myapp --message "Restart after changing configuration"` |
| Undo a release | `carlos rollback --app myapp edge` |
| List releases | `carlos releases --app myapp` |
| Custom domain | `carlos domains attach --app myapp www.example.com` — it tells you the DNS records to create; certs are automatic once DNS points at the platform |
| Review a branch | `carlos canary --app myapp ./myapp-linux-arm64` — a branch-only channel and URL that cannot disturb production. If the app carries config, pass `--environment`, or the canary host serves GETs and fails every form |
| Who is visiting | `carlos analytics --app myapp --range 7d` — counted at the edge: no JavaScript, no cookie, no stored IP, so don't add an analytics script. On by default for new accounts; `--set-count edge` turns it on for an app that has it off |
| What is breaking | `carlos errors --app myapp --since 24h` — your `error` log lines, grouped, no wiring at all. The 502/503/504s the edge saw are `carlos availability --app myapp` |
| Keep it private | `carlos gate set --app myapp` — one shared password in front of the hostname, for a prototype nobody should read yet |
| Feature switch | `carlos features set --app myapp beta-ui=v2` — the platform serves it, only your app reads it, and it lands with no restart |
| Upgrade Rastrillo | `go get amadan.net/rastrillo/rastrillo@<version>`, then follow that release's upgrade steps in its `CHANGELOG.md` (some change behaviour without a compile error), run `rastrillo doctor --fix` at the app's version (`go run amadan.net/rastrillo/rastrillo/cmd/rastrillo doctor --fix`) to refresh the vendored `static/` files, and `make ci` |

On a CARLOS console, everything above is a console-mediated write that
boxes converge within seconds. There is no restart-by-SSH, no cert ceremony, no Litestream
config: routing, TLS, replication, restore drills, hibernation, and
restarts are the platform's job. If you find yourself hand-rolling any
of those on a console, stop — you are rebuilding the platform under
your app. On a plain server those duties are the operator's by choice
(building-carlos-apps, hosting.md).

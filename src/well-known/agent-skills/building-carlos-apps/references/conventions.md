# 🤖 App conventions and adoption

## Quick reference — the shape

| Concern | The CARLOS answer |
|---|---|
| Language | Go, one static binary, `CGO_ENABLED=0`, thin `main.go` dispatch |
| Dependencies | Stdlib first; "adding a dependency is a decision, not a default"; hand-roll small clients over SDKs; a scoped exception is dated and does not extend to its neighbours |
| Storage | `modernc.org/sqlite`, WAL, one DB per instance, additive-only migrations — automatic on rastrillo |
| Quantities | Integer cents, integer grams — "a float never touches an amount" |
| Frontend | Two shapes, chosen deliberately: `server` (server-rendered, zero-JS baseline — the default) or `client` (Woodstar's shape) — see decisions.md §2 |
| JS discipline | 300-line module cap enforced by test, ratchet-down only; VanJS (vendored) the one sanctioned reactive dependency |
| Routing, TLS, replication, hibernation, restarts | The platform's job — see platform.md; hand-rolled only off-platform (blueprint.md) |
| Periodic work | `carlos schedule` — a time and a path; each fire is a POST to a route the app already serves, over its own socket. Never cron, never a second worker. A schedule tighter than the idle window stops the instance hibernating, and that is billed — platform.md |
| Object storage | Once per account, `carlos store apply` and a deployment operator approves; then `carlos store create` declares a bucket and credentials arrive as env; `carlos store scan` is opt-in virus scanning, off by default. It reconciles — it counts the objects it has NOT looked at — so ask for both numbers. Server-blindness wins over it: a client-encrypted store gets no coverage claim, because nothing can read the bytes — platform.md |
| Errors and analytics | `carlos errors` needs no wiring and collects from day one (tagged log lines; edge-seen 5xx are `carlos availability`); `carlos analytics` counts at the edge with no JavaScript, no cookie, no stored IP, and is opt-in per app or account. Do not add a third-party analytics script to a CARLOS app — platform.md |
| Canaries | `carlos canary` — a branch-only channel and hostname, outside every pipeline, seven-day lease. Review there, never on localhost. Pass `--environment` if the app carries config, or every form submission on the canary host fails — platform.md |
| Config environments | `carlos env --environment` writes a named bundle; a route is bound to one via the instance record (`instances set-environment`), then `carlos restart --environment` cycles exactly what reads it — platform.md |
| Feature flags | `carlos features set` — the platform serves them, only the app interprets them, and they land on the instance's next poll with no restart — platform.md |
| Hostname-level password | `carlos gate` — one shared password at the edge in front of an app's hostnames, for a prototype or a private static site. A curtain over a hostname, never a substitute for the app's own accounts — platform.md |
| Outbound email | `carlos email enable` — the platform mints the sending identity, publishes DKIM/SPF/DMARC, delivers SMTP credentials as env; never run an MTA or hold a cloud mail key — platform.md |
| Scheduled work | `carlos schedule set` declares it; the app's part is a POST handler guarded by `carlos.Tick` — the instance is asleep, so never an in-process cron — platform.md |
| Tenancy | The app chooses what one instance is; the declaration (unit, user model, class per workload, residue, benefits, costs) goes in AGENTS.md before code — tenancy.md |
| A customer per instance | The signup app holds an `instance`-role credential (`carlos services create --role instance --app <tenant-app>`) and `POST`s `/api/cli/apps/<account>/<tenant-app>/instances` — customers are instances, never Carloku accounts. The credential is app-wide, so it lives on the signup app only — platform.md "Provisioning instances from your own app" |
| One hostname, many instances | Path routes: the first path segment of a claimed hostname points at another route in the same account, on the same box. One hostname is one origin — platform.md "One hostname, many instances" |
| Central apps (sign-in, directory, home) | Stateless: no SQLite of their own, records in object storage, so they run anywhere and lose nothing when moved |
| WebRTC | `carlos relay enable` — the platform's STUN/TURN, delivered as `CARLOS_RELAY`; never a third-party TURN service — platform.md |
| Hosting | Carloku hosted (default) / customer fleets / self-hosted platform — decisions.md §3 |
| Deploys | `carlos deploy`: ship + promote + watch `X-Carlos-Version` until live; verify against the thing you changed with the binary you built. A static site is the same one command — `--kind static --host <h> <dir>`, which declares the route too — platform.md |
| Activity descriptions | Pass a concise `--message` on supported mutations: say what changes and why. The console records the exact target separately. Agents supply the message even when prompts are disabled — platform.md |
| Identity | "Sign in with Keymail" / passkeys+PRF / magic link+TOTP by trust model — decisions.md §4 |
| Trust | A class per workload, S to C; server-blind by default; every softening named and grep-tested. Placement by class is designed, not enforced — tenancy.md §3, decisions.md §1 |
| UI stance | Hide the machinery: no hostnames, keys, or crypto vocabulary in the default flow — "no nerdspeak"; calm UI, red for danger only, no toasts |
| Process | Code on amadan by default (its agent house rules: `amadan agent skill -install`); worktree per session, branch, regular pushed commits; merge to main (`amadan branch merge`, optionally `-squash`) only when done, approved and CI green (CI green binds once the repo has CI — a new repo's first merges land on done + approved and add CI early); review on a deployed canary, never localhost |
| Authorship | 🤖/👨 markers, `Co-Authored-By: Claude …` trailers, published prompt + carbon ledgers |


## Adopting CARLOS in an existing app (Tito's path)

1. Restate the model in your first commit and at the top of README and
   AGENTS.md.
2. Deploy onto the platform (hosted or self-hosted) rather than porting
   the router/replication machinery — that is what it is for. Only when
   the app must run somewhere the platform can't: take the core into
   `internal/carlos`, kept close to blueprint.md's shape so it can be
   swapped for the platform later.
3. Adopt the conventions alongside (worktrees, PR playbook, canaries,
   additive migrations, zero-JS-first).
4. List every deferred component with its trigger; list every deliberate
   departure with its reason.
5. Fixes you make to shared-shape code are candidates to upstream — record
   them.


## Common mistakes

| Mistake | Reality |
|---|---|
| One shared instance with a `tenant_id` column for many customers | Isolation on CARLOS is a process and a file. A `WHERE` clause gives up per-tenant isolation, erasure, residency and hibernation, and one missed clause leaks everyone. Make the tenant an instance — tenancy.md |
| Starting to code before deciding what one instance is | The unit decides the user model, the trust class's blast radius and which benefits the app can claim. Retrofitting it is a migration across every instance. |
| Adding a framework/bundler "just for this screen" | The no-build-step rule is load-bearing (auditability, longevity). One more ES module, one concern. |
| Choosing the client shape because it feels modern | The client shape is for client-held keys, live channels, and server-blind state — and it must self-impose the discipline the server shape gets free (decisions.md §2). |
| Creating a Carloku account per customer, or signing up customers with a person's CLI login | Accounts are *your* tenancy on the platform; customers are instances of your app. A signup flow holds a service credential (`carlos services`) and calls the instances API — platform.md |
| Giving every tenant its own hostname because "the edge routes by Host only" | It no longer does: path routes split one claimed hostname by its first segment, within one account and one box — platform.md |
| Hand-rolling a router, certs, Litestream, or restart machinery | The platform's job. An app on the platform is a binary on a unix socket (`--socket`/`--db`; there is no `$PORT`). |
| Giving a static site an instance | It has no process to run. The edge serves it off the channel pointer, so `carlos deploy --kind static --host <h> <dir>` is the whole deploy — `instances enable`/`create` is the binary recipe, and following it here builds a route that succeeds at every step and can never wake. |
| Concluding you have no access because the console redirected you | A `curl` of the console 302s to a login page for everyone — a browser session is not what the CLI holds. `carlos auth whoami` is the only thing that answers the question, and it is the first command of any platform task. |
| Guessing a channel name from the ladder in `--help` | Channels belong to the app. A new app has exactly one (`edge`), and `canary → edge → beta → stable` is the frozen legacy ladder for apps that declare no pipeline. `carlos channels` lists this app's; `carlos pipeline` orders them. |
| Growing the biggest file/package | A new concern gets a new small module or package — never more growth of the biggest one. |
| Destructive migration "to clean up" | Migrations are additive-only. New code over an old DB must always be safe. Never delete data to update. |
| Trusting a backup that exists | "A backup you've never restored is a hope, not a backup." (Platform-run for platform apps; your job off-platform.) |
| Verifying a deploy with a 200 | An app-shell route 200s for any build ever shipped. Only `X-Carlos-Version` on the canonical host, after the watch, is proof — and minted alias hosts carry no version header by design. |
| Treating a promote as a deploy | Until the process cycles, the old binary serves. Platform-known units cycle automatically; hibernating tenants wake into the new build; a bespoke unit stays old until something restarts it. |
| Reviewing on localhost | Review happens on a deployed canary, always. Shared hosts only ever run merged main. |
| Skipping the post-deploy browser check | A JS syntax error takes the whole client down and only a real engine sees it (the keymail rule). |
| Treating a day-one absolute as unsatisfiable and quietly skipping it | A gate a brand-new project cannot meet is a gate not written for day one. Name the bootstrap case in the rule and make satisfying it early work — a rule agents learn to step around stops working everywhere. |
| Relitigating a settled decision in a drive-by | Settled decisions change with new facts, dated and attributed — not casually. |
| A retired stack left owning DNS or deploy paths | It can silently undo a cutover (a legacy apply once reverted a live A record). Move the records; delete the verb that can report success while changing nothing. |

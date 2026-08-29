# 🤖 CARLOS technical blueprint

The stack and infrastructure shared by the family. Concrete values (instance
types, timeouts, cap numbers) are the family's defaults — snapshots, not
contracts; the shapes are the contract.

> **Scope (re-drawn 2026-08-17):** this file is the *under-the-hood and
> self-hosting* reference — what the platform does on an app's behalf,
> and the complete recipe for running without it. An app **on** the
> platform (hosted or self-hosted deployment) hand-rolls none of "The
> carlos core", "Replication", the deploy recipe, or config delivery:
> those are driven through the `carlos` CLI — see
> [platform.md](platform.md). Bullets marked **Automatic on rastrillo**
> are enforced by the framework. The Go server, SQLite, frontend, and
> crypto sections bind every app regardless.

## Go server

- One module, one static binary: `CGO_ENABLED=0`, cross-compiled
  (`GOOS=linux GOARCH=arm64`), `-ldflags "-s -w -X main.buildVersion=$(git
  rev-parse --short HEAD)"`. A deploy is one file you scp.
- `main.go` is subcommand dispatch and environment reading only — everything
  real lives in `internal/`, grouped by concern. "A new concern gets a new
  small package, not a new file in the biggest one."
- Subcommands: a platform-deployed rastrillo app needs none — the binary
  speaks `--socket`/`--db` via `rastrillo.Run` and everything operational
  is a `carlos` verb. Self-hosted-without-platform apps grow their own
  (`serve`, `router`, `add`/`remove`/`instances`, `ops …`, `version`);
  ops verbs are code, not runbooks — and delete any ops verb the moment
  it can report success while changing nothing (one did, for weeks).
- HTTP is stdlib: `http.NewServeMux` with method+pattern routes
  (`mux.HandleFunc("GET /api/thing", …)`), `writeJSON`/`httpError` helpers,
  `http.MaxBytesReader` on every body. Wire all routes in one
  `Server.handler()` so httptest exercises the real router.
- Config: flags with `<APP>_*` env fallback. **Secrets are env-only, never
  flags** (argv is visible in `ps`). On the platform they are delivered by
  `carlos env`/`carlos secrets` (sealed, converged in seconds); ssh-stdin
  or 0600 `EnvironmentFile`s is the off-platform form only.
- Dependency floor: `modernc.org/sqlite` + `golang.org/x/crypto` (autocert).
  Everything else earns its place. Hand-roll small API clients (S3 SigV4,
  Stripe form-posts) instead of importing SDKs; if usage grows past a
  handful of calls, swap in the SDK rather than growing the hand-rolled one.

## SQLite rules (hard-won)

- `modernc.org/sqlite` (pure Go — cgo would break the static binary).
- One database file per instance; a separate registry DB for the router.
- **Automatic on rastrillo.** Open with: `busy_timeout` set **before**
  `journal_mode=WAL` (the other order crashes with SQLITE_BUSY under
  concurrent open), then `SetMaxOpenConns(1)`, then migrate.
- **Automatic on rastrillo.** Migrations are idempotent `CREATE TABLE IF
  NOT EXISTS` plus an additive `ALTER` list whose errors are ignored only
  when the message contains "duplicate column". Deploying new code over
  an old DB must always be safe. Never delete data to update.
- Cross-process reads: a long-lived modernc connection can serve a stale WAL
  snapshot of another process's commits — read fleet-visible state (the
  route table) over a fresh connection.
- Registry change detection: poll a SQL fingerprint over a fresh connection
  (`PRAGMA data_version` is blind to cross-process commits), and reload on
  the *first* fingerprint too — baselining it away loses routes added during
  startup.
- Scale by adding instances, not replicas of one. SQLite is not the
  bottleneck you think: 200k attendees measured at 29 MB, FTS5 search <1 ms.
  Don't shard for "performance".

## The carlos core (`internal/carlos`)

**This whole section is the platform's job now** (`carlosframework/platform`,
live), not something an app hand-rolls anymore — regardless of whether it
uses rastrillo. Kept below as the reference for self-hosting outside the
platform, or for understanding what it's doing on an app's behalf.

- **Registry**: SQLite table of `host → unix socket` routes (+ optional
  slug, kind `instance|service`, lifecycle status, version). It doubles as
  the ACME allowlist: a host nobody provisioned never gets a certificate, so
  pointing DNS at the box entitles you to nothing.
- **Router**: the only process bound to :80/:443. Autocert HTTP-01 with
  `HostPolicy` = registry lookup; per-host certs, no wildcards until the
  ~50-certs/week Let's Encrypt budget demands DNS-01. Lazy
  `httputil.ReverseProxy` per socket with a unix `DialContext`; a retrying
  dialer (only `ECONNREFUSED`/`ENOENT`, window sized past the instance drain
  time) masks restarts during deploys; swap the whole route table atomically
  on reload. For streaming responses set `FlushInterval = -1`. The router
  answers `/healthz` and `/api/version` for itself, and **every instance
  must also serve `GET /api/version` reporting its build sha** — deploy
  verification polls all of them.
- **Instances**: systemd template units (`app@<host>.service`), one per
  account, `Restart=always`, socket in a tmpfiles.d-managed dir (or under
  `/data` so a runtime-dir wipe can't yank sockets). Instances survive a
  router restart because they are not its children.
- If the router proxies identity, strip those headers from every inbound
  request before minting them (test that forgery is stripped). Unix socket
  paths must stay under ~104 bytes (`sun_path`) — tests use
  `os.MkdirTemp("", "xx")`, not `t.TempDir()`.
- Provisioning order: make the directory, create the owner, start the
  instance, wait for it to actually answer, and only then publish the route
  — publishing earlier makes the owner's first visit a 502.
- Hibernation (live and default-on for the platform's provisioned
  instances; build it yourself only off-platform): park sleeping
  instances' state in S3 under a single-writer lease (one object that is
  both lock and manifest, expiring, with fenced commit), wake on request,
  sleep via one sweep goroutine — never a timer per instance.

## Replication

**Also the platform's job now**, for the same reason as the carlos core
above — Litestream is configured and run by the platform's host agent,
not by each app.

- **Litestream streams every data-bearing SQLite DB to S3. No exceptions.**
  "A box is disposable; the bucket is not." Adopted family-wide after a real
  data-loss incident.
- The litestream config is *generated* by an ops verb on a timer, never
  hand-edited: litestream accepts a glob in `path` and then silently
  replicates nothing — that exact failure happened on first provision and
  was caught only by checking the bucket.
- Restore drills are automated: a systemd timer on the box (daily) restores
  every replica to a private tmp dir and requires
  `PRAGMA integrity_check = ok` and a non-empty schema. "A backup nobody has
  ever restored is not a backup — it is a folder in a bucket and a feeling."
- The bucket is versioned, private, per-product, with IAM scoped to exactly
  it. Deploys never touch `/data/*.db*`.
- Canaries can restore the prod replica (`--seed-prod`) so review happens on
  real data — for E2EE apps the canary holds ciphertext it cannot read.

## The home vault (single sign-in across instances)

Instance-per-account creates a sign-in problem by construction: a person
with three instances must not need three credentials. This has tripped up
every app in the family; solve it on day one, not after. The answer is
**home** — a small companion service (Eleven's home server, ported whole
into siblings rather than reinvented) giving one passkey sign-in that spans
every instance:

- Home is anonymous and content-blind. It stores credential public keys
  and **one padded, sealed blob per person** — the vault of instance
  addresses and wrapped keys, sealed in the browser — and nothing else.
  Read the schema as the privacy policy.
- Instance addresses ride the URL `#fragment` on the way through home, so
  home's server never learns which instances a person uses.
- When instance hostnames are hidden from users entirely, the app runs on
  home's origin and calls the instance cross-origin with bearer tokens —
  the address bar shows home, the content flows direct. **Home never
  proxies instance traffic**: a proxy would make home load-bearing and
  hand it a durable session→instance join. Where instances are directly
  addressable instead, home is only the vault, not the front door.
- Home is glue (factor XI): thin, blind, replaceable. Losing it costs a
  convenience, never content — the instances still hold everything.
- Passkeys are scoped per relying party, so pick home's hostname
  deliberately and early: renaming an RP later is a multi-phase drill
  (legacy RP accepted for sign-in, never registration, so the crossover
  drains), not an edit. Never share home's origin or cookie domain with
  anything that carries third-party content.
- Server-trust apps (Tito's model) reach the same one-sign-in outcome
  differently: identity lives beside the router on the credential origin
  (the root domain), and reaches instances only as trusted headers the
  router strips from every client request before minting its own.

## Frontend

- **Server-generated markup is the default, not the fallback.** The core
  flow ships with zero JS and must work without it (confirm pages for
  destructive actions, form posts); JS is progressive enhancement on top.
- **Hide the machinery.** Every instance has a URL, a key, a cipher — the
  person sees none of them by default. Instance hostnames are deliberately
  meaningless (sqids, hidden behind home); no nerdspeak in the default
  flow — no "instance", "key", "encrypt", "URL" in member-facing copy
  (enforceable as a word blacklist in the browser drive); never show an
  identifier where a name belongs — prompt for the name instead. The
  scope is the *default flow* only: settings, docs, the self-hosting
  path and the published trade-offs speak plainly — this hides the
  machinery from the person who didn't ask, it never conceals how the
  system works from the person who did.
- When JS is needed: a small self-contained ES module — one file, one
  concern, own state, no globals, no bundler. If a module needs another
  module's internals, that's a server round-trip or a redesign, not an
  import.
- **Automatic on rastrillo** (the same test, carried into `carlos vet`).
  300-line cap per module, enforced by a test; at most one named
  coordinator module (the store/app shell that wires modules together and
  owns no policy of its own) may carry a higher test-enforced cap. Caps
  only ratchet down — raising a number to make a build pass is the exact
  move the test exists to prevent.
- Storage and network are injected, never reached for — unit tests hand in
  fakes; `localStorage` access from a leaf module is a test failure.
- Never `innerHTML` untrusted content — build DOM nodes with a helper whose
  falsy-dropping filter guards the leaked-value bug class.
- When a view genuinely needs reactivity, the family's one sanctioned
  reactive dependency is **VanJS, vendored as readable source**: views
  return `{ el, update }` and build DOM through the same falsy-dropping
  helper — in van bindings too, never bare tags. Anything heavier than
  VanJS is a redesign, not a dependency.
- Assets via `go:embed`, cache-busted by build version (`?v=<sha>` or
  fingerprinted names) so a deploy is never a hard refresh.
- If a JS dependency is truly needed, vendor it as readable source. No font
  CDNs — self-host woff2. No toasts; feedback is inline.

## Crypto and identity defaults

- **Automatic on rastrillo** (`rastrillo/crypto`, opt-in — an app that
  isn't E2EE imports nothing from it). Platform primitives only: WebCrypto
  in the browser, stdlib/x/crypto in Go. One 32-byte seed → HKDF-SHA256
  with domain-separated info strings (`app/purpose/v1`) → purpose keys.
  ECDH P-256 → HKDF → AES-GCM for envelopes; ECIES to wrap per-thread/
  content keys.
- Secrets that must not reach the server ride the URL `#fragment`.
- Identity: passkeys with the WebAuthn PRF extension wrapping the seed
  (possession of the PRF output is the security boundary, not the server) —
  or, for server-trust apps, magic link + mandatory TOTP. Either way: 256-bit
  random tokens, stored only as SHA-256, never logged; rate limits keyed by
  email, IP, and user. **Partial on rastrillo:** `rastrillo/webauthn`
  provides registration/assertion verification primitives (ES256 only, no
  attestation checking); the PRF-extension seed-wrapping and home-vault
  flow described here remain hand-built.
- **Automatic on rastrillo** for the crypto core specifically — the same
  golden-vector CI discipline, promoted to the framework so it protects
  every app that uses it from one shared fixture instead of a private
  copy each. When the protocol exists in two or more languages (Go + JS +
  Swift), golden vectors generated by the Go side are the spec: every
  implementation must reproduce them, CI/`go test` compares the copies,
  and a rule change regenerates the vectors in the same commit. Vectors
  are not snapshots — never update them to make a test pass.
- Enumeration resistance where the domain is sensitive: auth endpoints
  answer identically whatever happened.

## Boxes and deploys (self-hosting outside the platform only)

**On the platform, this whole section is `carlos deploy`** — ship,
promote, watch `X-Carlos-Version` — and box choice, TLS, and systemd
hardening are the platform operator's concern. What follows is the
recipe the platform automated, for running without it.

- One or two tiny ARM boxes: AWS t4g.nano (prod) / t4g.micro (dev) in
  eu-west-1, or a single Hetzner box. Dedicated cloud account per product
  with a named CLI profile — and never another product's profile ("Leave
  woodstar alone!"). A Hetzner box still replicates to an S3 bucket in the
  product's own AWS account — the box choice doesn't change the bucket
  story.
- IaC in OpenTofu: two boxes, DNS, one bucket, IAM. State in a versioned S3
  bucket with `use_lockfile` once more than one machine applies. On
  hand-built boxes: `lifecycle { ignore_changes = [ami, user_data];
  prevent_destroy = true }` — an AMI-drift replacement once deleted root
  volumes. Never `tofu apply` from a checkout older than main: state removal
  destroys resources.
- TLS on-box: autocert inside the router with the registry as allowlist.
  (The static-binary-Caddy-in-front fallback is historical — pre-router
  apps used it; nothing current does.) No load balancer, no CDN, no
  containers.
- systemd hardening on every unit: dedicated user, empty
  `CapabilityBoundingSet` (router alone keeps `CAP_NET_BIND_SERVICE`),
  `NoNewPrivileges`, `ProtectSystem=strict` with narrow `ReadWritePaths`,
  `PrivateTmp`, `MemoryDenyWriteExecute`, `MemoryMax`, `Restart=always`.
- Access: prefer SSM Session Manager with no SSH port at all; on SSH boxes,
  operator accounts over WireGuard, root bootstrap-only, sudoers as a
  committed reviewed allowlist.
- **Deploy = build, install, restart, VERIFY.** Fetch `origin/main`, build
  exactly that commit in a throwaway git worktree (local edits structurally
  cannot ship; there is no way to deploy a branch — that is a feature), scp
  to a uniquely-named staged file, `install -m755`, restart router + all
  instances, then poll `/api/version` until every instance socket reports
  the deployed sha — a healthy service alone is not evidence the build won.
  Dev first; prod after dev verifies.
- After every deploy, run the committed headless-browser console check
  against the live host (see process.md).
- Mail, when needed, is SES with per-sender tenants so one user's bounces
  can't poison everyone's deliverability. Secrets come from a password
  manager (1Password/Bitwarden) at deploy time.

# 🤖 CARLOS technical blueprint

The stack and infrastructure shared by the family. Concrete values (instance
types, timeouts, cap numbers) are the family's defaults — snapshots, not
contracts; the shapes are the contract.

## Go server

- One module, one static binary: `CGO_ENABLED=0`, cross-compiled
  (`GOOS=linux GOARCH=arm64`), `-ldflags "-s -w -X main.buildVersion=$(git
  rev-parse --short HEAD)"`. A deploy is one file you scp.
- `main.go` is subcommand dispatch and environment reading only — everything
  real lives in `internal/`, grouped by concern. "A new concern gets a new
  small package, not a new file in the biggest one."
- Typical subcommands: `serve`, `router`, `add`/`remove`/`instances`, `ops
  …`, `version`. Ops verbs (`ops deploy|doctor|status|litestream|
  restore-verify`) are code, not runbooks.
- HTTP is stdlib: `http.NewServeMux` with method+pattern routes
  (`mux.HandleFunc("GET /api/thing", …)`), `writeJSON`/`httpError` helpers,
  `http.MaxBytesReader` on every body. Wire all routes in one
  `Server.handler()` so httptest exercises the real router.
- Config: flags with `<APP>_*` env fallback. **Secrets are env-only, never
  flags** (argv is visible in `ps`), delivered over ssh stdin or 0600
  `EnvironmentFile`s.
- Dependency floor: `modernc.org/sqlite` + `golang.org/x/crypto` (autocert).
  Everything else earns its place. Hand-roll small API clients (S3 SigV4,
  Stripe form-posts) instead of importing SDKs; if usage grows past a
  handful of calls, swap in the SDK rather than growing the hand-rolled one.

## SQLite rules (hard-won)

- `modernc.org/sqlite` (pure Go — cgo would break the static binary).
- One database file per instance; a separate registry DB for the router.
- Open with: `busy_timeout` set **before** `journal_mode=WAL` (the other
  order crashes with SQLITE_BUSY under concurrent open), then
  `SetMaxOpenConns(1)`, then migrate.
- Migrations are idempotent `CREATE TABLE IF NOT EXISTS` plus an additive
  `ALTER` list whose errors are ignored only when the message contains
  "duplicate column". Deploying new code over an old DB must always be
  safe. Never delete data to update.
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
- Hibernation (when idle economics demand): park sleeping instances' state
  in S3 under a single-writer lease (one object that is both lock and
  manifest, expiring, with fenced commit), wake on request, sleep via one
  sweep goroutine — never a timer per instance.

## Replication

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

## Frontend

- Server-rendered HTML first; the core flow ships with zero JS and must work
  without it (confirm pages for destructive actions, form posts).
- When JS is needed: a small self-contained ES module — one file, one
  concern, own state, no globals, no bundler. If a module needs another
  module's internals, that's a server round-trip or a redesign, not an
  import.
- 300-line cap per module, enforced by a test; at most one named
  coordinator module (the store/app shell that wires modules together and
  owns no policy of its own) may carry a higher test-enforced cap. Caps
  only ratchet down — raising a number to make a build pass is the exact
  move the test exists to prevent.
- Storage and network are injected, never reached for — unit tests hand in
  fakes; `localStorage` access from a leaf module is a test failure.
- Never `innerHTML` untrusted content — build DOM nodes with a helper whose
  falsy-dropping filter guards the leaked-value bug class.
- Assets via `go:embed`, cache-busted by build version (`?v=<sha>` or
  fingerprinted names) so a deploy is never a hard refresh.
- If a JS dependency is truly needed, vendor it as readable source. No font
  CDNs — self-host woff2. No toasts; feedback is inline.

## Crypto and identity defaults

- Platform primitives only: WebCrypto in the browser, stdlib/x/crypto in Go.
  One 32-byte seed → HKDF-SHA256 with domain-separated info strings
  (`app/purpose/v1`) → purpose keys. ECDH P-256 → HKDF → AES-GCM for
  envelopes; ECIES to wrap per-thread/content keys.
- Secrets that must not reach the server ride the URL `#fragment`.
- Identity: passkeys with the WebAuthn PRF extension wrapping the seed
  (possession of the PRF output is the security boundary, not the server) —
  or, for server-trust apps, magic link + mandatory TOTP. Either way: 256-bit
  random tokens, stored only as SHA-256, never logged; rate limits keyed by
  email, IP, and user.
- When the protocol exists in two or more languages (Go + JS + Swift),
  golden vectors generated by the Go side are the spec: every implementation
  must reproduce them, CI/`go test` compares the copies, and a rule change
  regenerates the vectors in the same commit. Vectors are not snapshots —
  never update them to make a test pass.
- Enumeration resistance where the domain is sensitive: auth endpoints
  answer identically whatever happened.

## Boxes and deploys

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
- TLS on-box: the default is autocert inside the router with the registry
  as allowlist. A static-binary Caddy in front (never a distro package) is
  the fallback for apps that haven't grown the router yet — one app process
  behind `127.0.0.1`, per-canary Caddy config blocks validated before
  reload so a bad canary can't take the shared box down. No load balancer,
  no CDN, no containers.
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

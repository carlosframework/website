# 🤖 The decisions — trust, shape, hosting, identity

The four axes every CARLOS app settles on day one. Each section gives the
family's real positions with the reasons their own docs record — offer
these as choices with trade-offs, not as one right answer. Whatever is
chosen: **date it, attribute it, record the rejected alternative, and
publish every deviation.** Retrofitting any of these is a migration, not
an edit.

## 1. Trust model — what can the server read?

The family default is server-blindness ("if the server is compromised,
the attacker gets nothing"), but no shipped app is absolutist. The real
spectrum is defined by **which leaks you name**: every app publishes its
softenings as a list, and enforces the boundary with tests that grep raw
SQLite bytes and bucket objects for plaintext. A "partial" model is
legitimate exactly when the leak is named; it is a violation when hidden.

**The positions, with their recorded reasons:**

- **E2EE content, plaintext routing metadata — Keymail.** Bodies and
  subjects are ciphertext; from/to/date/folder are readable, published
  as a trade-off ("like SMTP envelopes"). Its named softenings show what
  honest partial looks like: inbound ordinary email is plaintext
  *transiently in RAM* at the boundary, then sealed server-side to the
  mailbox's public key (sealing needs only the public half); opt-in
  imports state before running that messages pass through memory; mixed
  sends tell the user what travels unsealed. And a trade *refused*:
  searchable encryption rejected — the client legitimately holds
  plaintext and keys, so the index is client-side and the server learns
  nothing new.
- **E2EE content, blind identity, public reference data — Kass.** A
  training log is medical-adjacent, so user content is sealed — but the
  exercise database is public reference data embedded in the binary,
  deliberately unencrypted, and the identity registry stores email only
  as an HMAC blind index under a pepper (the readable address lives
  solely in unclaimed sign-in links, blanked on claim). The bar its docs
  set: *the schema could be published as the privacy policy* — leak the
  whole registry and the worst anyone learns is roughly how many people
  signed up, and when.
- **Split by content class — Woodstar.** Public posts are plaintext on
  the server (they are public; encrypting them would be theater), DMs
  are sealed end-to-end, and private state — follows, petnames, drafts,
  settings — is server-blind encrypted blobs, so the server never learns
  the social graph. Federation (ActivityPub/Bluesky) is an explicit,
  bounded, opt-in leak of the public class only; DM bridging is a
  permanent non-goal.
- **Sealed single-tenant — Seapointish.** Data encrypted at rest, but
  the instance holds the key in memory because unattended bank syncs
  need plaintext with no human present. The README names the residual
  risk out loud ("a compromised live host can read data") and the copy
  never claims otherwise; the plaintext-grep test still runs, with one
  dated, allowlisted exception. The shape for tools that must act on the
  data autonomously.
- **Server-side trust — Tito.** A ticketing platform holds buyer PII in
  plaintext already; there is no encrypted-blob requirement to inherit,
  and a six-person support team must be able to read an email address
  (Vicky's rule: every decision is weighed by the support load it
  creates). What compensates is **authorization, not decryption** —
  credentials only ever on the root origin, account-authored content
  only on the account's own host, and operator escape hatches (2FA
  reset) that open doors without unlocking data.

**Choosing:** classify the content, not the app. Private between named
parties and the product promise is "we can't read it" → seal it and eat
the costs (no server search, recovery becomes product surface, key loss
is data loss by design). Public or bridged to a public network → sealing
it is theater; spend the effort on the private classes beside it. A
support team that must read it → server trust, argued in writing from
support load, repaid with origin splits and authorization design. An
agent/automation that must act on it unattended → sealed single-tenant,
with the residual risk in the README.

**Whatever you choose:** the merciless grep test from day one, the
deviations list in the README, and — server-blind apps — remember the
bucket: Litestream ships the whole SQLite file to object storage, so a
plaintext column is a plaintext leak. The envelope mechanics for sealed
content (HKDF purpose keys, ECDH → AES-GCM, ECIES-wrapped per-thread/
content keys — which is also how a sealed object gains a second named
reader) are blueprint.md's crypto section; golden vectors pin every
implementation. **Honesty note (2026-08-23): rastrillo does not yet
properly support the E2EE use-case as an app story** — its crypto and
webauthn packages are primitives, and framework-level support is being
worked on now. A server-blind app today hand-builds the app-side flow
on the Keymail/Kass/Woodstar patterns; don't claim the framework does
it.

## 2. App shape — server-rendered or client-owned?

The family recognizes exactly two shapes; the axis is written into the
framework's design (chosen at scaffold time in the rastrillo ui design;
the `server` shape is what `rastrillo new` ships today, the `client`
shape is hand-built on the Woodstar/Eleven pattern until the framework
grows it).

- **`server` (the default): server-rendered HTML, zero-JS baseline as a
  non-negotiable.** Every screen and primary action works with scripts
  stripped; JS is enhancement only, enforceable by a test (fetch the
  page script-stripped, diff for every affordance) rather than a
  browser. Interactive components are real HTML first (a dropdown is
  `<details>/<summary>`). This is Tito, the platform console,
  Seapointish, and every admin/CRUD/dashboard surface in the family.
  It is also what hibernation likes: request/response apps sleep well.
- **`client`: the app runs in the browser and owns its state.** Chosen
  when the product needs what server rendering cannot do: client-held
  keys and client-side crypto (sealing DMs, encrypting blobs, proof-of-
  work — work that must happen where the seed is), live feeds over
  WebSocket/SSE, and reader-owned state the server never learns.
  This is Woodstar: a hand-written no-build-step ES-module SPA, VanJS
  (140 vendored lines) as a thin reactive shell — views return
  `{ el, update }` — with local caches merged against server-blind
  blobs for multi-device continuity. Keymail and Kass are client-shape
  on their sealed surfaces for the same reason: E2EE content forces the
  shape, because sealing must happen where the keys are.

**The client shape's price is discipline it must self-impose**, because
JS owns the paint. The family's evidence for why: Eleven's hand-rolled
shell grew to 8,722 lines with one render function invoked from 31 call
sites — the bug class a reactive binding removes structurally, and the
reason VanJS is the sanctioned default (framework-free remains
legitimate; anything heavier than VanJS is a redesign). Woodstar keeps
the 300-line module cap test-enforced (one coordinator module may carry
a higher cap; caps only ratchet down), builds all DOM through a
falsy-dropping helper (a stray `null` child renders as the literal text
"null" — a real shipped bug), gates first paint so a cold load never
shows the page assembling, and runs three browser drives in CI because
a JS syntax error takes the whole client down and only a real engine
sees it.

**Platform cost differs too.** A server-shape app is one route. A
client-shape product like Woodstar is several cooperating binaries with
in-app path fan-out (the edge routes by Host only), WebSocket upgrades
and SSE proxied through two hops (verify the 101 through the real edge,
never assume it), wildcard customer domains via ACME delegation, and a
held socket that interacts with hibernation. All supported — none free.

**Choosing:** default to `server`. Move to `client` only for a product
that genuinely needs client-side crypto, live channels, or server-blind
reader state — not because a richer client feels more modern. The zero-JS
baseline binds server-shape surfaces; a screen that cannot honor its
promise without JS (sealing in the browser) *is* a client-shape surface,
and the two compose within one product: Woodstar's status page is a
plain static app beside the SPA, and a sealed app's marketing and
settings pages can stay server-shape beside its client-shape editor.

## 3. Hosting — Carloku, your boxes, or your platform

- **Carloku (hosted) — the default.** Zero infra: the getting-started
  path. Pay per app (baseline + instance-hours; hibernating apps cost
  ~the baseline; egress/storage metered separately). Free rungs exist
  (a permanent tiny Try tier; a budget-funded free pool that degrades
  generosity, never availability). Nothing about the other axes locks
  you out of moving later.
- **Customer fleets — your boxes, the hosted control plane.** `carlos
  fleets` attaches boxes you own (a Pi, an office server, edge devices)
  to your account; apps place onto them with `carlos apps place`. Pay
  per box, apps free — the family rule is *you pay per app or per box,
  never both*. The path for hardware you must own without operating a
  whole platform.
- **Self-hosted platform — Tito's path.** Run the platform software
  yourself: own cloud account, own console, own boxes; your members use
  the same `carlos` CLI against your console. Choose it when you must be
  the operator of record (residency, regulation, or the trust model
  itself). The cost is real operations: provisioning, platform rolls,
  the adopt/restart cadence, and being the one who debugs below the API.
- **Hand-rolled (no platform) — the historical path, now a deliberate
  exception.** blueprint.md remains the complete recipe (it is what the
  platform automated), for the app that must run somewhere the platform
  doesn't. Keep the core close to the blueprint's shape so it can be
  swapped for the platform later.

## 4. Identity — how people sign in

Instance-per-account makes single sign-in a day-one problem (three
instances must not mean three credentials). The family's current
positions:

- **"Sign in with Keymail"** — Keymail has become the family's identity
  provider: an anonymous, usernameless passkey vault (the home-vault
  pattern, ported from Eleven's design — content-blind, one padded
  sealed blob per person, the vault *is* the instance list so the
  server can't count your instances). It now also speaks OAuth for
  third-party apps: the `client_id` is the app's origin (no registration
  queue — DNS+TLS already establish what a registry would), PKCE, one
  grant per origin, and an app token authorizes delivery and identity,
  never reading. The hosted consoles authenticate this way, and
  sensitive console actions use passkey step-up that deliberately never
  mints a stronger credential than the caller had.
- **Per-instance passkeys + PRF** (Kass): the WebAuthn PRF output wraps
  the data seed, so possession of the passkey — not the server — is the
  security boundary. Recovery is an explicit table of wrapped seeds:
  losing every row is losing the data, by design and by disclosure.
- **Magic link + mandatory TOTP** (Tito, server-trust): boring, support-
  friendly, with hashed single-use recovery codes and an operator reset
  verb that is safe *because* nothing it unlocks is encrypted under it.
  Identity lives beside the router, outside the per-account blast
  radius, and reaches instances only as **signed** assertions — headers
  are stripped-and-re-minted, and signing (not stripping alone) is what
  stops a peer socket from forging them.

**Choosing:** hosted-platform apps get console sign-in for free and
should reach for `rastrillo/auth` before inventing anything — the
family default: magic-link email that auto-upgrades to "Sign in with
Keymail" when the address has a claimed inbox, so every address works.
`rastrillo/password` is the classic email+password alternative, and
step-up (`sessions.RequireFresh`) is the hardening seam.
Server-blind apps: passkeys + PRF, and treat recovery as product
surface. Server-trust apps: magic link + TOTP. Passkey RPs pin to a
hostname — pick the credential origin deliberately and early (renaming
an RP later is a multi-phase drill), and never share it with an origin
that carries third-party or account-authored content.

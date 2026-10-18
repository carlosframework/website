# 🤖 Tenancy: what one instance is, and what that buys

The first decision for any CARLOS app, before trust model, shape, hosting
or identity (decisions.md). Every other benefit on carlosframework.com
follows from it: isolation, hibernation, residency, erasure, taking the
data home. Settle it on day one and write it down as a **tenancy
declaration** (§6). Changing it later is a data migration across every
instance, not an edit.

Status as of 2026-10-18. Carloku serves platform v0.28.0; rastrillo is
v0.28.0. Where a piece below is designed but not shipped, it says so.

## 1. The boundary: what is one instance?

**The instance boundary is the app's choice** (the family doctrine). No
unit is the default. The gallery at carlosframework.com/apps runs all of
these, and all of them are correct for their app:

| One instance is… | Person : instance | Apps that do it |
|---|---|---|
| a person | 1 : 1 | Kass (a training log; a coach is a *member* of the client's instance), Slopbox (one account), Dineraya (a buyer) |
| a conversation or space | 1 : N | Eleven (one chat) |
| a mailbox | 1 : 1 | Keymail |
| a team | N : 1 | Oficina (one per team, per app: docs, sheets), Correomona, an internal finance ledger |
| a customer organisation | N : 1 | Tito (one per organiser account, plus a sandbox instance each), Dineraya (a merchant), Jelly (designed: one per signup) |
| a community | N : N | Woodstar (a relay: founder plus invited members) |
| a repository | N : N | amadan (one per repo; the hub holds only names and membership) |
| a connection | 1 : 1 | a payments app with one instance per bank connection |
| the whole app | N : 1 | Movement (one sign-up list); a rastrillo app out of the box |
| nothing: no user data | none | static sites (carlosframework.com, carloku.com) |

Most products run **more than one pattern**: a central app plus per-unit
instances (Tito, amadan, Oficina, Slopbox, Eleven), or one
binary in several roles (Dineraya: buyer, merchant, and one shared
dispatcher).

**Choosing the unit.** Ask, in order:

1. **Whose data is it?** The unit is the smallest group that owns data
   together and would be harmed if it leaked to the next group.
2. **What should fail together?** A panic or a runaway query takes down
   one instance. Choose the unit whose outage you can explain to one
   customer.
3. **Who leaves together?** A unit's data is its own database and its
   own objects, so exporting it is copying them and erasing it is a
   bounded list (the platform keeps a deleted instance's data until you
   remove it). Pick the unit a customer would ask to
   export, delete or move to their own boxes.
4. **What crosses units?** Sharing is **membership**, never copying: a
   person joins someone else's instance (a coach in a client's log, a
   member in a team). If a feature needs to *query* across units
   (reporting, search across all customers), the unit is too small or
   that feature belongs in its own app. A central app answers "what
   might I have access to", never "may I have this". A view across
   tenants (a vendor's dashboard, a person's search over their own
   spaces) has its own pattern: §2 "Seeing across tenants".
5. **Does it idle?** Instances that sit idle hibernate and cost nothing.
   Small units that are used in bursts get the most from this.

**The anti-pattern: tenancy by `WHERE` clause.** One instance, a
`tenant_id` column, every customer in one file. It gives up isolation,
per-unit erasure, per-unit residency and per-unit hibernation at once,
and one missed `WHERE` exposes everyone. On CARLOS, isolation is a
process and a file. Use one shared instance only when the whole app
really is one unit (one team, one list).

## 2. How people reach their instance

Four recommended models, from the user-models design (approved
2026-09-28). They are recommendations, not rules: if none fits, choose
your own and record why.

| | Model | You sign in to… | Recommended when | Runs it today |
|---|---|---|---|---|
| A | **One instance, in-app accounts** | the app itself | one team, one household, one list, a personal tool | the internal finance ledger, Movement, the rastrillo default |
| B | **Simple home** | *your* instance | each person or team owns a space that stands alone | Oficina, Kass (in-process), the bank-connection app |
| C | **Hub** | a whole product | people belong to several spaces and move between them all day | Tito (subdomains and a proxy), amadan (path routes) |
| D | **Blind home** | your instances, server-blind | end-to-end encrypted apps where the centre must hold nothing readable | Eleven's home, Slopbox's home; `rastrillo/vault` is the client |

- **A** is the least machinery: rastrillo `auth` or `password`, owner
  scoping, and `idear` for roles and invitations. Its cost is that one
  instance's blast radius is everyone in it, and it never grows into a
  product with many independent customers.
- **B** is a small central app where you sign in, see your instances,
  add one, and open one. Each instance has its own hostname and its own
  sessions, and still accepts ordinary sign-in on its own origin, so it
  works if the home is down. The home hands you in with a signed,
  single-use assertion (rastrillo `assertion`, issuer the home, audience
  the instance), posted in a form, never in a URL. Smallest leak profile
  of the recommended models: the home knows who signed up and which
  instances they own, nothing inside any of them. Cost: no shared chrome;
  moving between spaces goes through the home.
- **C** puts the product on one domain and each tenant under a path
  (`example.com/acme`) via the platform's path routes. One origin, one
  session, one switcher; every tenant still its own process and file.
  Costs: one origin is one browser security boundary, so use C only when
  every tenant runs the app's own code (a product whose tenants publish
  raw HTML their customers wrote needs B's per-tenant hostnames). The
  hub's session-signing key is the product's crown jewel. **Today a path
  target must live on the same box as the hostname**, so a path-routed
  product is one box big.
  How it fits together: the tenant receives `/acme/...` unchanged, so the
  tenant app serves everything (routes, assets, redirects, form actions)
  under its base path, and its own direct hostname redirects to the
  product path. Because hub and tenants share one origin, there is one
  session: the hub mints a short-lived signed cookie (15 minutes, with a
  per-user epoch so "sign out everywhere" works), and tenants hold the
  hub's public key (`carlos env set`) and verify it on every request,
  never minting their own. Ordinary per-tenant rastrillo sessions do not
  work under model C: every tenant would set the same cookie name on the
  same origin and sign the others out. The hub delivers roster changes to the
  instance first, with a signed request, then records its directory
  copy.
- **D** is B's shape for server-blind apps: the home holds credential
  public keys and one sealed blob per person and can read neither.

**Central apps are stateless** (ruled 2026-09-27, a foundational CARLOS
principle). A home, hub, directory or sign-in service keeps no database:
its records are objects in its own store (`carlos store create`), created
with `If-None-Match: *` and updated with `If-Match`, at keys it can
compute (`users/<uid>.json`, `tenants/<slug>.json`). Nothing to
replicate, restore or migrate, and it moves between boxes with nothing
to copy. Anything relational (reporting, search) belongs in an instance.

**Safety invariants, whichever model:**

1. The provisioning credential (`carlos services create --role instance
   --app <tenant-app>`) lives on the central app, never on the tenant app.
   It is app-wide today: it can also delete any sibling instance. Publish
   that as a leak until the platform ships a create-only role. The same
   goes for any `instance`-role token (`CARLOS_INSTANCE_TOKEN`): never put
   one in the tenant app's secrets, whatever the convenience.
2. An instance decides access from its own roster. A signature proves
   who, never what.
3. Handoff tokens never ride in URLs, and the receiver enforces single
   use.
4. Model C only where every tenant runs the app's own code.
5. Every model publishes its leak profile (§3).

**What is real today, and what is not** (2026-10-15):

| Piece | State |
|---|---|
| Instances API, `instance` service role, path routes, `assertion`, `vault`, `idear`, stores | Shipped. Use them. platform.md "Provisioning instances from your own app" |
| Create-only, quota-bounded provisioning role | Not built (platform #185). Use the `instance` role and name the leak |
| Path targets on another box | Not built (platform #186). Model C is one box big |
| rastrillo `objrec`, stateless auth store, signed-cookie sessions, `provision`, base-path serving, `rastrillo new --model home\|hub` | Not released (`objrec` is on a branch). Hand-build on the patterns above, and don't claim the framework does it |

### Seeing across tenants

A vendor wants totals across every customer; a person wants to search
every space they belong to. Tito runs both with one rule: **the centre
reports only what it owns or witnesses. It never opens a tenant's
database.** Four ways data legitimately crosses the boundary, in order of
preference:

1. **Witnessed facts.** Make the number a fact the vendor owns (a fee, a
   charge, usage) and record it where the vendor already sits on the
   path: the proxy, payment egress, mail egress, a payment provider's
   webhook. Tito's staff console gets collections, request timings and
   capacity this way, from facts its router, payment relay and the
   payment provider saw for themselves. Fees *owed* are partly computed
   from facts instances report, which is step 2.
2. **Pushed facts through an outbox.** Where only the instance knows, it
   writes a fixed-shape record (a fee accrual, a ticket count) to an
   outbox table in the same transaction as the work, and a sender
   delivers it to the central side, retrying until accepted. The
   instance is usually asleep, so send at the end of the request that did
   the work, and let anything undelivered go on the next wake or a daily
   `carlos schedule` tick (a tighter schedule keeps the instance awake,
   and that is billed). Retries mean duplicates, so each record carries a
   stable id; the receiver dedupes on it in the same transaction as the
   ledger write, acknowledges only after commit, and refuses a different
   payload under an id it already holds (Tito does all four for fees). The record's
   shape is declared residue, published like any other. The receiver
   files each record under the instance that sent it, so **an instance
   can only speak for itself**. Short self-descriptions (name, region,
   counts) can also ride on responses the centre already proxies.
3. **Browser fan-out for a person's own view.** A search or switcher
   across someone's spaces asks each instance they are a member of,
   from the browser. Every instance answers as it would any other request
   from that person: membership, then their role's capabilities and any
   narrower scope (Tito filters by the events and series a member may
   see), so a result list never shows what the person could not open. No
   central copy; nothing widens the set beyond real memberships. Tito
   does this on one origin (model C), where the one session already
   reaches every tenant. Across per-tenant hostnames (model B) each
   request needs that origin's own session, so there it is usually a
   link per space instead. Every request can wake a sleeping instance,
   so Tito answers typing from a cache the browser built from each
   instance's own answers (refreshed when that account's digest changes),
   and asks the instances live only when the person asks for more
   results, at most four at a time.
4. **One tenant at a time, with consent.** Support access is granted from
   inside the tenant (in Tito, by a member, never above their own role,
   and capped at admin), time-limited, and logged before the first read,
   failing closed if the log write fails. Never aggregation.

**Where the vendor's records live.** Not in the router, hub or home. A
**back office app** with its own instance and database holds the
vendor's ledger, partners and statements, receives the outbox, takes
signed identity like any tenant instance, and asks the central app for
anything else through a narrow API (list accounts, create one). Tito's
console holds these in its router today; its proposed split moves them
into a back office app of this shape.

**Not allowed:** a central app or reporting job opening tenant databases
(`carlos db pull` across every instance is a backup of everyone, not a
report); copying tenant content (buyers, messages, documents) into a
central store; a `tenant_id` warehouse.

**The sender problem (2026-10-16).** Step 2 is only as good as the
receiver's knowledge of which instance sent a record. It must derive
that from a credential bound to the sending instance and verified by the
receiver, never from a name the sender supplies, and never from the
app-wide `instance` token, which every holder can present for any
sibling. Tito today trusts box-local sockets plus a header the instance
sets, so a compromised instance could report as a sibling. The family has
no ready-made per-instance sender credential on Carloku: platform tokens
are app-wide (#155, not built), and even scoped platform tokens would
not by themselves authenticate an instance to *your* receiver. Until a
pattern exists, cross-check pushed facts against what you witnessed
where you can (a fee against the provider's webhook), keep pushed
records to facts a lying instance gains little from, and name the gap as
a leak.

## 3. What the host can see: the trust class

Tenancy says where the walls are; the trust class says what a host can
read inside them. Pick a class per **workload**, not per product: an
end-to-end encrypted app with an automation sidecar is two answers (Eleven
and Kass: instance A2, agent sidecar C). Classes order S ≤ A < B < C; the
A variants are flavours, not grades.

| Class | The host holds | Examples |
|---|---|---|
| **S** stateless | no user data at all | static sites; a central app holding only public keys can be S plus declared residue (Dineraya's dispatcher) |
| **A1** host-blind | ciphertext; only transport shape leaks (who connects when, sizes, timing) | Slopbox (padded blobs, encrypted names) |
| **A2** host-blind, declared residue | ciphertext plus a published list of plaintext metadata | Keymail (routing headers), Kass (log timestamps), Eleven (thread membership), Dineraya buyer |
| **A/pub** public by design | A, plus surfaces that are public on purpose, listed one by one | Woodstar (public posts; DMs and blobs sealed) |
| **B** sealed single-tenant | sealed at rest (parked DB, replica, blobs); the live instance holds a key while awake because unattended work needs plaintext | an internal finance ledger, one instance per team (the defining example); Dineraya merchant |
| **C** host-sighted | plaintext at rest, chosen and written down: support visibility, SQL over personal data, payments | Tito (the defining example) |

Several apps have not published a class letter yet (amadan's is
unresolved; Oficina, Movement and Correomona describe their
posture in words, without a letter). Don't assign one on their behalf.

**The test is the CARLOS one: publish the database and see what leaks.**
A leaks its declared residue and nothing more; B's cold copy leaks
nothing; C leaks the data, and said so up front. Enforce it in CI: push a
marker through the app, then grep the raw SQLite bytes and bucket objects
for it. An undeclared plaintext surface is a class violation whatever the
intent. decisions.md §1 has each app's recorded reasoning.

**Placement follows the class (designed, not yet enforced).** Hosts are
tiered by who controls the box: 0 the operator, 1 a named counterparty
under a data-processing agreement, 2 a stranger. S and A run anywhere, B
never on tier 2, C only on tier 0 or where the agreement names the data.
As of 2026-10-15 the platform does not record or enforce trust classes,
so declare the class in your README and AGENTS.md now; don't tell users
the platform enforces it.

**Two more axes, independent of the class:** a **licence class** (L1
libre, L2 source-available commercial, L3 open with a hosted offering, L4
closed hosted-only, L5 closed hosted and on-prem: Tito, Jelly) and three
**remix flags** (forkable, agent-driveable through typed tools,
agent-rebuildable from a published skill). An L5 app can be class A; an
L1 app can be class C.

## 4. What the choice buys

The benefits on carlosframework.com, each with the mechanism behind it
and what it depends on. State a benefit only with its mechanism, and only
the ones your tenancy actually earns.

| Benefit | Mechanism | Depends on | State on Carloku, 2026-10-15 |
|---|---|---|---|
| **Isolated data per tenant** | each unit is its own process, SQLite file and socket; instances get CPU and IO limits and no loopback or private-network access | a boundary smaller than "the whole app" | live |
| **Blast radius of one** | a panic or runaway query kills one process; the next request restarts it | same | live |
| **A security claim you can falsify** | publish the database and see what leaks; the residue is declared | a declared class plus the CI grep test | yours to write |
| **Multiple trust classes** | one product, a class per workload (instance, sidecar, central app) | splitting workloads that need plaintext from those that don't | declare now; placement enforcement not built |
| **Encryption encouraged** | sealed content (A), sealed at rest (B), keys in browsers | the class you pick | rastrillo `crypto`, `vault`, `webauthn` are primitives; app-level E2EE is hand-built |
| **Continuous security monitoring** | `carlos errors`, `carlos availability`, edge analytics, opt-in virus scanning of stores | nothing | live |
| **Cost/performance efficiency** | idle instances hibernate to the bucket and cost nothing; the fleet is sized to concurrent use, not headcount | units that idle (smaller units idle more) | live |
| **Wake in under 500 ms** | a request for a sleeping instance is held while it wakes | same | live |
| **Replicated from the first byte** | every database streams to object storage; every wake is a restore | an instance with a database (central apps keep records in the store instead) | live |
| **Export and erasure per tenant** | a tenant's data is its own database and its own objects, never rows mixed with others, so export is copying them and erasure is a bounded list | the unit matching who leaves together | export live (`carlos db pull`); erasure is a procedure you write: `instances delete` deliberately keeps the parked database, replica and store objects, so name each and how it goes |
| **Residency per app or per instance** | an instance only wakes on a host in its region | per-unit instances, so each customer can be pinned | released, switched off on Carloku |
| **Self-hostable, first class** | one binary, a bucket and DNS; same binary hosted, on a customer's boxes (`carlos fleets`), or on a self-run platform | nothing; licence class decides what customers may do | live |
| **One codebase, every deployment** (vendors) | one instance per customer means on-prem is a fleet you administer, not a fork | per-customer instances | customer fleets live; Tito self-hosts in three regions |
| **API- and agent-driveable** | actions opt in as tools that reach the same handler a form does | rastrillo `tools` (manifest-generated) | in rastrillo; no app has published tools yet |

What a tenancy choice **costs** belongs in the same declaration:
cross-unit queries are hard by design; a stateless centre makes writes
dearer than a SQLite row; model C is one box big today; class A or B
makes recovery and search product surface; class C puts confidentiality
on operator policy and authorization, not mathematics.

## 5. Worked choices

Short, to show the reasoning. Each still needs its own declaration.

- **A bookkeeping ledger per small business, synced nightly with the
  bank.** One instance per business; model B (a stateless home lists the
  business's ledgers). Class B: sealed at rest, the live instance holds
  the key for the unattended sync, and the README says a live-host
  compromise reads data. Nightly work is `carlos schedule`, so the
  instance sleeps the rest of the day.
- **A forge where people belong to several organisations.** One instance
  per repository (amadan) or per organisation; model C, a stateless hub
  with path routes and one session. Trust is per content tier: public and
  private repos are server-readable (C), end-to-end encrypted repos are A.
  Rendered markdown is the app's own code, so C's one-origin rule holds;
  raw user-hosted HTML (pages) needs its own hostnames. One box big until
  cross-box path targets ship.
- **A support desk sold to companies, whose agents read customer email;
  big customers want on-prem.** One instance per customer company. Class
  C, argued from support load, repaid with origin splits (credentials on
  one origin, customer-authored mail rendered on another). Licence L5 if
  closed. On-prem is a customer fleet or a self-hosted platform following
  your release channel: the same binary, not a fork.
- **Team chat.** One instance per conversation or team; model D, a blind
  home. Class A2 with the residue listed (membership, timestamps).
- **A product site.** No instance at all: `carlos deploy --kind static`.
  Class S.

## 6. The tenancy declaration

Write this into AGENTS.md (and the README's trade-offs) before code. It
is the answer an agent planning a CARLOS app gives first.

```
Tenancy declaration: <app>, <date>, <who decided>
One instance is:      <the unit>  (person : instance = 1:1 | N:1 | 1:N | N:N)
Why this unit:        <whose data; what fails together; who leaves together>
Reached through:      model A | B | C | D, or <own model, and why>
Central app:          none | home | hub; stateless, records in its store
Workloads and class:  instance = <S|A1|A2|A/pub|B|C>; sidecar = <…>; central = <…>
Declared residue:     <every plaintext surface, one per line>
Keys live:            <browsers | instance memory while awake | n/a>
Hosting:              Carloku | customer fleets | self-hosted platform
Licence class:        L1–L5, or "not published yet"
Benefits claimed:     <each with its mechanism, from §4>
Costs accepted:       <each, plainly>
Waiting on:           <unshipped platform or rastrillo pieces relied on, by name>
```

## Common mistakes

| Mistake | Reality |
|---|---|
| A Carloku account per customer | Accounts are the app author's tenancy on the platform. Customers are instances of your app. |
| A `tenant_id` column in one shared instance | Gives up isolation, erasure, residency and hibernation per tenant. Make the tenant an instance. |
| A stateful home or hub with its own SQLite | Central apps are stateless; records are objects in the store. |
| The provisioning credential on the tenant app | Every instance would hold a token that can delete its siblings. It lives on the central app only. |
| Trusting the hub's membership list for access | The instance's own roster decides. The hub's copy is a directory. |
| One class for the whole product | Class is per workload. A sidecar or central app that sees plaintext gets its own letter. |
| Claiming the platform enforces your class or residency | Neither is enforced on Carloku as of 2026-10-15. Declare; don't overclaim. |
| Copying data between instances to share it | Sharing is membership. Data never crosses a boundary. |
| A reporting job that opens every tenant's database | The centre reports what it owns or witnesses; instances push fixed-shape facts through an outbox; a person's cross-space view fans out in the browser — §2 "Seeing across tenants". |

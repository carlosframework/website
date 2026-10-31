# 🤖 Provisioning and path routes

Read only when provisioning tenants or routing one hostname to several instances.

## Provisioning instances from your own app

A product where every customer gets their own instance creates those
instances itself, at signup, through the same console API the CLI uses.
Nothing here needs a box, and nothing here is a workaround:

1. **A person enables the app once** — `carlos instances enable --app
   <tenant-app>`. This writes the manifest that bounds which domain, pool
   and regions any instance may be created in, and no credential can do
   it. Add `--private-storage` and every instance created afterwards
   gets a config environment named after its host's first label with an
   object store bound to it, provisioned by the ordinary create call (the
   account needs an approved `store apply` first, and nothing is torn
   down when an instance is deleted).
2. **Mint the credential** — `carlos services create --role instance --app
   <tenant-app> signup`. Store it with `carlos secrets set` on the app
   that runs signup, **never on the tenant app itself**: every tenant
   instance would then hold a token able to delete its siblings.
3. **Create on signup** — `POST /api/cli/apps/<account>/<tenant-app>/instances`
   with `Authorization: Bearer <credential>` and a JSON body; `host` is
   required (one DNS label plus the manifest's domain), `region`,
   `channel`, `environment` and `message` (the Activity description) are
   optional. The console writes the
   record and announces it, and a box mints the route within seconds.
4. **Wait for the real thing** before sending the person there: poll
   `https://<host>/api/version` for a 200 (a sub-500 answer is not
   evidence), behind a zero-JS "getting your space ready" page that
   refreshes itself.

Give every label a random suffix (`<slug>-<6 random base32 chars>`, the
label being the host's first DNS segment). That makes a collision with
somebody else's instance a first-call event, so the one retry below can
read its 409 without guessing.

The answers to handle, from the apps that run this:

| Status | Meaning | Do |
|---|---|---|
| `201` | Created | Wait for `/api/version`, then hand off |
| `409` | That host already exists (or a sibling app owns the label) | Never treat it as yours: pick a new label. On a *retry of your own timed-out call*, a 409 means the first call worked |
| `429` | The credential's own rate limit (it is separate from any person's, so a signup burst never starves your promotes) | Show a sentence and a retry; never loop |
| `502` / timeout | The console could not complete the write | Retry once with the **same** host |
| `400` | Bad body, or a host that is not one label plus the manifest's domain | A bug on your side; fail loudly |
| `401` / `404` | Bad credential, or the wrong account or app (every miss is the same 404) | A configuration bug; fail loudly |

Also on the same credential: `GET .../instances` (list), `GET`, `PATCH`
(reorder or remove addrs, set the probe — adding an upstream address is
operator-only since v0.25.0) and `DELETE .../instances/<host>`, and
`POST/PUT .../domains` for customer hostnames. **Deleting an instance
removes its record, never its data** — the parked database and blobs are
left in place on purpose, and the call is idempotent.

**The known gap:** the `instance` role is app-wide. One credential can
create, delete or move *every* instance of the app, not only the ones it
made. That is why it lives on the signup app alone, and why a signup app
compromise must be named in your published trade-offs. A narrower,
create-only credential is a filed platform request — do not build your own
token broker around it.


## One hostname, many instances

Path routes let one hostname — your product's own domain — serve each
customer from their own instance, so `example.com/acme` and
`example.com/globex` are two processes and two databases behind one
address. The hostname's own route keeps everything else (`/`, sign-in,
marketing).

- The hostname must be one the app holds: `carlos domains attach --app
  <hub-app> example.com` first.
- The map is written **whole** through the API, by a person or by the
  hub app's `instance`/`publish` credential:
  `PUT /api/cli/apps/<account>/<hub-app>/domains/example.com/paths` with
  `{"paths": {"acme": "acme.<tenant-domain>", "globex": "globex.<tenant-domain>"}}`.
  Keys are one bare path segment (no slash); values are hostnames of
  existing routes. Publish the full map from your own records every time —
  a lost delta desyncs silently, a whole republish repairs. `{"paths": {}}`
  clears it; a body without the `paths` wrapper is refused, so a typo can
  never wipe the map.
- **Targets must belong to the same account** (they may be another app of
  that account — a hub app pointing at tenant-app instances is the
  intended shape).
- **Targets must live on the same box as the hostname's own route.** A
  target homed elsewhere is silently ignored and its prefix falls through
  to the hostname's route. That caps a path-routed product at one box
  today; cross-box path targets are a filed platform request.
- A write goes live in about five seconds. `carlos domains paths --app
  <hub-app> example.com` prints what was published; `carlos routes`
  shows what the box actually applied.
- The upstream receives the original path (`/acme/...`) unchanged, and the
  target route is what is billed, versioned and woken.
- **One hostname is one browser origin.** Cookies, storage and script
  are shared across every prefix, so every tenant's pages can act on the
  hub's session. That is fine while every tenant runs your app's code; if
  tenants serve HTML their own customers wrote, give each tenant its own
  hostname instead.

# 🤖 CARLOS member-owned fleets

Read only when an account is placing an app on boxes it owns, registering the
fleet's secrets key, or diagnosing how a fleet app reaches its public hostname.
Do not load this for ordinary platform-served apps or for deployment-operator
box administration.

This reference describes the pinned platform source. Public forwarding,
WebSockets through the fleet tunnel, release floors, and secrets-key support
depend on the console and relevant boxes running compatible builds. Source
availability is not evidence that a live fleet has been rolled. Use member CLI
output and capability refusals; never inspect or repair the fleet through cloud
or box commands as a substitute.

## Place the app through the console

Create on a fleet, or place an existing movable app:

```sh
carlos apps create --app shop --place fleet/home
carlos apps place --app shop --target fleet/home
carlos apps place --app shop --target ""
```

The empty `--target` explicitly returns an app to platform-served placement.
Omitting `--target` is an error and never means clear.

Placement moves the app's routes and instance records as one console-mediated
operation. It is not a request to SSH into a box or write a route by hand.
Rootfs apps cannot be placed after their runtime is fixed; create them with
`--place fleet/<name>` before the first rootfs ship.

Before moving an app, inspect its sealed config. Placement refuses when values
were sealed to a key different from the target fleet's key and names the stale
values. Unset those values, place the app, set them again through the console,
then rotate any store, email, or relay credential the console minted. Do not
copy ciphertext or private keys between placements.

## Establish the fleet secrets boundary

Generate a keypair locally:

```sh
carlos secrets genkey
```

The private key belongs on every box in that fleet as `CARLOS_SECRETS_KEY` and
must never be sent to the console. Register only the public key:

```sh
carlos fleets secrets-key home <public-key>
carlos fleets secrets-key --file ./fleet-public.env home
```

Only an account owner can register it. A public key belongs to one fleet and
cannot be the platform's own key. Re-registering the same key on the same fleet
is harmless. `carlos fleets ls` shows the registered public-key fingerprint and
a `STALE` count for sealed values the fleet cannot open.

Installing the private key and checking its local fingerprint belong to the
fleet administrator, within the user's authorized infrastructure workflow.
That administrator can compare `carlos secrets fingerprint` on the box with
the registered public fingerprint in `carlos fleets ls`. An app member uses
the console's fleet status; do not make box access part of an ordinary app
release or claim that `fleets ls` alone proves the key is installed.

Replacing a fleet key is refused while fleet apps still hold sealed values.
For planned replacement:

1. unset each affected secret;
2. register the new public key;
3. have the fleet operator install the matching private key through the
   deployment's supported fleet setup workflow;
4. set the secrets again through the console;
5. rotate platform-minted store, email, and relay credentials;
6. confirm `STALE` is zero.

If a box or its private key may be compromised, detach that box first. Rotating
its bearer token does not evict an already connected tunnel, while
`carlos fleets detach-box <fleet> <box>` stops the box from reading the
platform store. Do not use key replacement as a substitute for detachment.

In direct-bucket mode, `carlos secrets set` refuses when the account owns a
fleet because the CLI cannot safely choose a sealing key. Unset
`CARLOS_DEPLOYMENT_BUCKET` and `CARLOS_DEPLOYMENT_DIR`, authenticate with
`carlos auth login`, and set the value through the console.

## Understand public routing

On a compatible deployment, a fleet-placed instance's ordinary public hostname
is forwarded by the platform hub through that fleet's authenticated tunnel to
the assigned box. Nothing runs on the hub for the app. The hub enforces the
app's plan and rate limits once; the fleet box enforces the password gate and
serves the request. Do not add a duplicate hub route or custom proxy.

The source also supports WebSocket upgrades through the fleet tunnel. Treat
that as available only when the console and fleet boxes report compatible
versions. An old live deployment may support ordinary HTTP forwarding without
the later WebSocket path. Do not assume a failed upgrade proves the app is at
fault; inspect `carlos availability`, `carlos logs`, `carlos instances list`,
and the fleet status exposed by the console.

Channel moves and first publication can be refused by a fleet-forward release
floor while any fleet exists. That refusal protects older boxes from receiving
a pointer whose routing contract they cannot uphold. Members must roll the fleet
through the supported platform workflow or choose a compatible release; never
use an operator override or direct-bucket promotion to bypass the floor.

`carlos instances list` is the member view of assignment and serving state. A
fleet report may temporarily make health unknown; stale or absent evidence is
not permission to create a second route. Let convergence settle, then use the
console-visible reason and retry doors.

## Maintenance sources

- `docs/site/cli.md` (`carlos apps`, `carlos secrets`, `carlos fleets`, `carlos instances`)
- `fleets_cli.go`, `apps.go`, `appconfig_cli.go`
- `internal/provision/forward.go`, `internal/registry/forward.go`, `internal/edge/tunnel.go`
- `cmd/console/member.go`, `cmd/console/sidecaraccounts_test.go`

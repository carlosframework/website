# Stateless replicas

A stateless app can run more than one copy of each instance on different boxes in your fleet. If one box stops, the other copies keep serving.

## Before you set copies

Ship with --stateless when your app keeps its data outside its box. The release gets no local database, CARLOS_DB or Litestream. You provide and operate its database and other data services.

More than one copy needs every box of the fleet and the console on platform v0.35.0 or later. While a box's platform update is still finishing, its previous platform build must be v0.35.0 or later too, because a failed update puts that build back. Every platform release channel must also be on v0.35.0 or later.

An app needs at least one instance. Each instance needs one successful deploy of its stateless release before the app can have more than one copy. Deploy once, then set copies. An app with more than one copy cannot add an instance: set copies to 1, create the instance and deploy it once, then raise copies again.

## Setting the count

```sh
carlos apps set shop --copies 2
```

Each instance of shop gets two copies on different eligible fleet boxes. The command refuses a count larger than the eligible fleet.

A box is eligible only if it has room for the instance's size: a size may use at most a quarter of a box's memory, and an app with no size set uses standard. If too few boxes have room, or the box already serving an instance has none, the command says so and changes nothing.

Raising the count adds the new copies one box at a time, on the build the instance already runs. The copy that is already running keeps serving, and the release command does not run again. Once a deploy has finished on all of an instance's copies, copies added later start on that build straight away, without waiting for each other.

More than one copy needs an always-on release. Set --copies 1 and wait for removed copies to stop before selecting a hibernating release or one with a local database. Switching to stateless leaves the old database and replica untouched.

## Deploys

A deploy runs the release command once per instance, then switches its copies one box at a time. Your migrations must allow old and new code to serve together. Each copy runs every declared worker.

When a copy switches, its old build stops once the new one serves. A response still streaming from the old build when it stops is cut, as when a box stops. Websockets on the old build disconnect and their clients reconnect to a healthy copy.

The release command runs only once the instance's configuration is on its box. If you set env or secrets before the instance existed, its first release waits a few seconds for them rather than running without them. If they have not arrived after about three minutes, the release is held as failed without running, and a retry runs it.

If the box running the release command disappears, its result may be unknown. The deploy stops and the previous build keeps serving. Deploying again runs the command again, so release commands must be safe to repeat. Rails migrations record completed migrations in schema_migrations.

A deploy can stop partway. If a copy's switch is not confirmed, or the new build's workers or web process fail on a box after it switched, the deploy stops there. Copies that switched run the new build and the others keep the old one, and the instance's deploy status says where it stopped. Copies stay on different builds until you retry the deploy, deploy a fixed build or roll back.

Deploy your apps one at a time. While a copy switches, its box runs the old and the new build side by side, and the platform does not yet check that a box has room for several apps switching at once.

An app that runs more than one copy of an instance refuses `carlos restart --app` and `--environment`, because every copy would restart at the same time. Deploy a new build instead: its copies switch one box at a time.

`carlos restart --host` restarts a route on the console's own box. Copies never run there, so it refuses an instance with more than one copy. Deploy a new build instead.

## When a box stops

Copies survive the loss of a fleet box. Traffic still enters through one hub, so this version does not survive losing that hub.

Reads can retry on another copy before a response starts. A response already streaming when its box dies is cut. Websockets disconnect and their clients reconnect to a healthy copy.

## Seeing your copies

For an instance with more than one copy, `carlos instances list` prints a second table with one row per copy: its box, build, state, health and workers. The app's overview page counts running copies against the requested total. The [CLI reference](/docs/cli#carlos-instances) has the details.

An instance with more than one copy keeps a separate page cache on each copy's box. A purge clears only the cache of the copy that sent it, so another copy can serve its own saved page until it expires or that copy purges it too.

## What the platform does not prevent

An app that creates its own instance.key or report.token file must take those values from a shared source, its configuration or its environment, or run one copy. The platform gives every copy the same CARLOS_INSTANCE_KEY, but it cannot stop each copy of an app from writing a different file of its own.

The console will not move the platform below v0.35.0 while any app has more than one copy. It cannot stop an operator from putting an older platform build on a box by hand. It also cannot stop a rollback to the previous build after an update finishes. A downgraded box keeps serving, but its copies may switch builds out of order or start again on an older build until the box is updated.

Release note for v0.35.0: once the console is on v0.35.0, a box still on v0.34.x cannot retry a stateless release whose release command failed or whose result is unknown, even with one copy. Ship a new build, or retry after the box is on v0.35.0.

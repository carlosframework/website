# Rootfs apps

A rootfs app is an app shipped as a read-only Linux image instead of a single binary. You build the image on your own machine, from a Dockerfile or anything else that makes an OCI image or a directory, and carlos ship --rootfs uploads it. The platform never builds anything and never pulls from a registry.

A rootfs app runs only on boxes your account owns: a fleet of yours on a deployment that runs apps for other people, or any box of a deployment run for one customer. The box must be on the nested layout, must run overlap deploys and must have passed its rootfs check. The console refuses anywhere else, and so does the box.

A fleet app's secrets and its store credential are sealed to the fleet's own secrets key, so register one before the app needs a secret. [carlos fleets](/docs/cli#carlos-fleets) explains how.

## What fixes an app's kind

An app's first release makes it a binary app or a rootfs app, and it stays that kind. A release of the other kind is refused when you ship it. To change kinds, create a new app.

Each instance takes its hibernation setting from the release it is created with, and keeps it. A rootfs app is always on unless that release was shipped with carlos ship --hibernate. A later release that asks for the other setting is refused when you ship it.

## Processes

The JSON file you pass to carlos ship --processes names the commands the image runs. Each is an argv array, either an absolute path or a name found on the image's PATH, with an optional env of plain values (never secrets) and an optional working_dir.

```json
{
  "web":     {"command": ["bundle", "exec", "puma", "-C", "config/puma.rb"]},
  "worker":  {"command": ["/rails/bin/jobs"]},
  "release": {"command": ["/rails/bin/rails", "db:migrate"]},
  "console": {"command": ["/rails/bin/rails", "console"]}
}
```

- web is required, exactly one. It serves HTTP on CARLOS_SOCKET.

- release is optional, at most one. It runs on every deploy, the first included, before the new web starts. It may run for ten minutes unless it sets timeout_sec.

- console is optional, at most one. It is the command an interactive session starts. The platform never starts it on its own.

- Any other name is a worker, up to four of them. A name is lowercase letters, digits and hyphens, starts with a letter, and is at most 16 characters long.

Commands are not run through a shell, so a $CARLOS_SOCKET written in a command is passed as it is. Read the variable in your server's config file instead, or run the command with sh -c if your image has a shell.

## What every process gets

Every process of the instance gets the same environment: web, the workers and release alike. That is the app's config bundle, the instance's own variables and secrets, its store's coordinates, and these:

- CARLOS_SOCKET is the unix socket web serves HTTP on.

- CARLOS_DB is the instance's SQLite database, the one file the platform replicates. An app that keeps its data somewhere else can ignore it.

- CARLOS_HOST, CARLOS_REGION, CARLOS_CONTROL_SOCKET and CARLOS_PURGE mean what they mean for a binary instance, as [What an instance is started with](/docs/cli#what-an-instance-is-started-with) says.

- HOME is /tmp unless the image or the app sets it.

## Health

web must answer GET / on CARLOS_SOCKET with a status below 500 within 120 seconds of starting. Until it does, the instance does not serve and its workers do not start.

## What it can write

The image is the instance's root filesystem, and it is read-only. An instance writes in two places: the directory CARLOS_DB is in, which is kept across restarts and deploys, and /tmp, which is empty at every start. /tmp is held in memory, so what is in it counts against the instance's memory.

## Memory and CPU

All of an instance's processes share one memory and CPU limit, the same tiers a binary instance gets, 1 GB by default. A process that goes over it is stopped and started again.

## JIT compilers

Memory is never writable and executable at once, unless the release is shipped with carlos ship --jit. A JIT compiler needs that: Node, Bun and Deno, the JVM, Ruby's YJIT and PHP's opcache JIT. Ruby, PHP and Python run well without one.

A release shipped with --jit has jit set in its manifest, and every process of its instances runs with that protection off: web, the workers and release. Nothing else about the instance changes. The setting belongs to the release, so a later release can turn it on or off.

Node stops at start without --jit. node --jitless does run, but only as an interpreter and without WebAssembly, which makes most apps much slower. Ship a Node app with --jit instead.

carlos ship --check warns when a process runs Node, Bun or Deno and the release is not shipped with --jit, because the check passes on your machine and the box then stops the process at start.

## Network

An instance can reach public addresses, such as an object store or a managed database's public endpoint. It cannot reach a private address unless a system operator allows it for the app with carlos apps set --egress-allow, and it never reaches the box it runs on or the cloud's metadata service.

## Deployments run for one customer

A deployment whose boxes all belong to one customer says so with CARLOS_DEPLOYMENT_SINGLE_TENANT=1, in the console's environment and in every box's host.env. A rootfs app can then run on any of its boxes, not only on a fleet. Leave it unset on a deployment that runs apps for other people. The console does not start if the value is anything but 0 or 1.

```ini
CARLOS_DEPLOYMENT_SINGLE_TENANT=1
```

Dedicated pools do not count as a customer's own boxes yet, because nothing ties a pool to one account. On a deployment that runs apps for other people, a rootfs app cannot run in one.

## Not in this version

More than one copy of an app across boxes, more than one SQLite database per instance, moving a rootfs instance to another fleet or region, and starting a new rootfs instance from a copy of another database.

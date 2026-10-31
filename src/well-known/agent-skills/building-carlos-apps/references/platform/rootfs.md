# 🤖 CARLOS rootfs apps

Read only when an app must ship a Linux filesystem instead of CARLOS's normal
single-binary or static-site release. Do not load this for an ordinary binary,
static site, or container platform comparison.

This reference describes support in the pinned platform source. It does not
prove that the console or every box in a live deployment has been rolled to a
build that supports rootfs apps. Let the member command's capability checks
decide. Never work around a refusal with box access or a direct infrastructure
change.

## Choose rootfs deliberately

A rootfs release is a read-only Linux filesystem built on the member's machine
from an OCI image, OCI archive, or directory. CARLOS does not build it and does
not pull it from a registry. Use it when the app needs an ordinary Linux userspace
or several supervised processes. Prefer the normal binary release when one
executable satisfies the platform contract.

A rootfs app runs only on boxes the account owns: its own fleet, or a deployment
whose boxes belong to one customer. The target boxes must pass the platform's
rootfs and nested-layout checks. A member cannot waive those checks.

The app's runtime kind is fixed by its first release. Create and place a fleet
app before that first rootfs ship:

```sh
carlos apps create --app shop --place fleet/home
```

Afterwards, `carlos apps place` and instance moves refuse the rootfs app. Choose
the fleet and region before shipping.

## Validate, then ship

Prepare a process file and validate locally before publishing:

```sh
carlos ship --rootfs ./image --processes processes.json --check
carlos ship --rootfs ./image --processes processes.json --check \
  --env DATABASE_URL=placeholder
```

`--check` ships nothing. Its `--env KEY=VALUE` values are test substitutes; it
never reads the app's live config or secrets. Do not put real secrets on the
command line.

Publish through the console with the app named:

```sh
carlos ship --app shop --rootfs ./image --processes processes.json
carlos promote --app shop <version>
```

The exact supported ship shape is:

```text
carlos ship --app <app> --rootfs <image-or-dir> --processes <file.json>
  [--hibernate] [--jit] [--version <sha>] [--label <one line>]
  [--notes <text> | --notes-file <file>] [--swap hold]
```

Use `carlos ship --check` again after changing the image, process declarations,
architecture, mounts, or JIT setting.

## Declare processes and isolation

The process JSON starts with `web`. It may also name `release` and up to four
workers. Commands are argv arrays, not shell strings. Each may set plain image
environment and a working directory. Platform config and secrets arrive at
runtime for every process; keep them out of the image and process file.

`web` listens on `CARLOS_SOCKET` and must answer `GET /` with a status below 500
within 120 seconds. Workers start only after that health check passes. `release`
runs before a new web generation and must finish successfully (a ten-minute
default timeout). `console` is reserved and is never started by the platform.

The filesystem is read-only except for the directory containing `CARLOS_DB`
and `/tmp`. The former survives restarts and deploys; `/tmp` is emptied at
each start and counts against memory. Private-network egress requires an
operator allow; a rootfs image cannot grant it to itself.
All processes in one instance share its memory and CPU tier. A process exceeding
the shared memory ceiling is stopped and restarted.

Rootfs memory is non-writable-and-executable by default. Add `--jit` for Node,
Bun, Deno, JVM JITs, Ruby YJIT, or PHP's JIT. The switch affects every process
in that release. Do not add it to apps that do not need a JIT.

Rootfs instances are always awake by default. `--hibernate` on the creating
release makes a new instance hibernate. That choice belongs to the instance and
cannot be flipped by a later release.

## Current bounds

Do not design around capabilities the source explicitly excludes:

- no moving a rootfs instance to another fleet or region;
- no starting a rootfs instance as a copy of another instance's database;
- no more than one SQLite database per instance;
- no multi-box copies of one rootfs app in the current contract.

Use `carlos instances list`, `carlos logs`, and `carlos run` through the console
for supported inspection and one-off work. A rootfs log line may be filtered by
its platform process field (`web`, `release`, or a worker name). Never replace
these member doors with SSH, SSM, container-runtime commands, or box-local file
inspection.

## Maintenance sources

- `docs/site/rootfs.md`
- `docs/site/cli.md` (`carlos apps`, `carlos ship`, `carlos instances`, `carlos run`)
- `ship_rootfs.go`, `ship_check.go`, `ship_runtime.go`
- `instances_rootfs.go`, `run.go`

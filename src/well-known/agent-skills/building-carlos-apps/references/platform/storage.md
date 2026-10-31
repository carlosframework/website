# 🤖 CARLOS object storage and scanning

Read only when an app needs an object store, per-environment or per-instance
storage, credential rotation, or a virus-scan result for an upload.

This describes the pinned platform source, not proof that a live console has a
storage backend or scanner. Use `carlos store status` and API refusals as the
capability answer. Never create cloud buckets, IAM users, scanner resources, or
approvals outside CARLOS to make a member command work.

## Approve the account, then create stores

An account owner applies once:

```sh
carlos store apply --account bac --note "uploads for the service"
```

A deployment operator separately approves or declines it. Member authorization
does not include `store approvals`, `approve`, `decline`, or `grant`; do not infer
approval from the application or working cloud credentials. Once approved:

```sh
carlos store create --app hello
carlos store status --app hello
```

`create` declares and provisions through the console; repeat it to resume a
partial provision. `status` shows declaration, provisioning, config drift, and
a daily rather than live size measurement. A decline deletes nothing already
provisioned.

## Scope storage

The default store is shared by the app. A named environment gets its own bucket
and credential, delivered only to that config bundle:

```sh
carlos store create --app hello --environment acme
carlos store status --app hello --environment acme
```

`create`, `status`, and `rotate` accept `--environment`. Instances on the same
environment share its store. Unused environments and deleted instances leave
their buckets and billing in place; unscoped `status` lists those stores.

For one store per future instance, a signed-in person enables the policy:

```sh
carlos instances enable --app jam --private-storage
carlos instances create --app jam --host acme.jam.bab.oncarlos.com
```

The host's first label becomes the environment name: lowercase letters, digits,
or hyphens, at most 32 characters, and not `default`. The account must be
approved and the backend configured. A service credential cannot enable the
policy, though an `instance` credential may create inside it.
`--private-storage=false` affects only later instances.

## Rotate in two phases

```sh
carlos store rotate --app hello
carlos store rotate --finish --app hello
```

Add `--environment <name>` for one environment store. The first command keeps
the old credential live; after the app uses the new config, `--finish` retires
it. `status` reports an unfinished rotation.

## Request scanning honestly

Scanning is separately opt-in. A member must attest the storage form:

```sh
carlos store scan request --app hello --plaintext
carlos store scan request --app hello --client-encrypted
carlos store scan status --app hello
```

There is no default. A scanner cannot inspect client-encrypted bytes; that
attestation records scanning as not applicable and runs no sweep. Plaintext
scanning still needs an operator grant. `grant`, `revoke`, `sweep`, and `enforce
on|off` are operator controls. Enabled scanning does not imply enforcement:
infected objects remain readable unless enforcement is on.

Only `clean` and `infected` are verdicts. `skipped`, `failed`, `denied`,
`pending`, `gone`, and `unavailable` are not safe. Coverage counts are not
complements; unfinished sweeps and old signatures weaken the claim.

## Scan one object asynchronously

After plaintext scanning is requested and granted, mint an app-scoped service
credential:

```sh
carlos services create --account bac --app hello --role service upload-scanner
```

Use it as bearer token against the default store only:

```http
POST /api/cli/apps/{account}/{app}/store/scan/object
{"key":"uploads/report.pdf","callback_path":"/hooks/scan"}

GET /api/cli/apps/{account}/{app}/store/scan/object?key=uploads/report.pdf&wait=30s
```

POST queues and answers pending. GET long-polls at most 30 seconds. There is no
environment-store selector. Prefer `wait` to a tight loop.

`callback_path` is a path on the ready platform host, never a URL or custom
domain. Invalid paths are rejected; no ready host returns 409, so omit it and
poll. Delivery is best effort and can duplicate or be lost. Poll as backstop;
make handling idempotent on `(account, app, key, etag, verdict)`. Match ETag as
well as key, and serve the path directly because redirects fail delivery.

## Verify callback signatures

Hex-decode `*_SCAN_CALLBACK_SECRET` to 32 raw bytes. For
`Carlos-Signature: t=<unix>,v1=<key-id>:<hex-mac>`, compute HMAC-SHA256 over the
ASCII timestamp, `.`, and raw body. Constant-time compare recognized `v1`
values; rotation can include two. Ignore unknown fields, reject timestamps over
five minutes away, and parse JSON only after verification.

Only `clean` and `infected` describe content. `recorded:false` means the verdict
was not written to the object, so platform enforcement does not protect reads.
The body's `signature` is the scanner database version, not the request MAC.

Callback-key configuration and `carlos store scan rotate-webhook-key` are
operator responsibilities. Polling needs no callback key.

## Maintenance sources

- `docs/site/cli.md` (`carlos instances` private storage and `carlos store`)
- `docs/site/scan-callbacks.md`
- `store.go`, `scan.go`
- `internal/console/apiscan.go`, `internal/console/apiscanstatus.go`
- `internal/console/scandeliver.go`, `internal/console/scansign.go`

# 🤖 CARLOS runtime authority and controls

Read only when a task needs a one-off command, a regional database copy, scoped
automation for one app's tenants, or member-controlled request limits. This
reference contains the authority and safety rules needed for those tasks.

This reference describes the pinned platform source. A live console can have a
feature switched off or can be older than the CLI. Treat an explicit console
refusal as the capability answer; do not fall through to box or cloud access.

## Run an app command with bounded authority

A person in the account can run one of the app's commands as an instance:

```sh
carlos run --app shop --instance shop.example.com --file orders.csv -- import orders.csv
```

The run uses that instance's build, environment, data, user, and directories.
Files named with repeatable `--file` are uploaded into `CARLOS_RUN_DIR`; the
combined limit is 64 MB. The default timeout is 30 minutes and `--timeout` may
raise it to six hours. One run is open per instance. A sleeping instance wakes;
the serving process remains live beside a run. Arguments are audited, so never
put a secret in them.

For server automation, mint the dedicated role:

```sh
carlos services create --role run --app shop \
  --commands "import classic,import sync" importer
```

`--app` and `--commands` are required. No broader service role, including
`admin`, inherits run authority. Each comma-separated grant is an exact argv
word prefix. `import classic` permits `import classic --slug acme`, including
every flag and argument after that prefix. That prefix alone does not permit
`import`, `import classical`, or `import sync`. Grant the most specific prefix
that names the intended job, never a broader one such as `import`. At most 32 prefixes are accepted; an empty prefix is
refused. The list is fixed at mint; replace the credential to change it.

Use an idempotency key when an uncertain connection must not start the command
twice within the key retention window:

```sh
carlos run --app shop --instance shop.example.com \
  --idempotency-key import-2026-10-31-acme --file acme.csv -- import classic acme.csv
```

Keys work only after the console operator enables keyed runs. Until then the
console answers `keys_not_ready`; do not silently retry without a key. A key is
honoured for 24 hours or until that caller has made 32 newer keyed admissions
on the instance. The same key must carry byte-identical command, timeout, and
files.

A 4xx on a retry means that retry admitted nothing. It does not prove an earlier
attempt failed to start. Query the run by key before deciding to submit new work;
a timeout, connection loss, or 5xx is also an unknown outcome and must be retried
with the same key while it is retained. After 24 hours or 32 newer keyed
admissions, the key may start a fresh run: investigate instead of retrying
blindly.

Within the retention window, rerunning the same CLI command with the same
key and files follows the existing run instead of starting another. If that
run's output was read or cleared, the CLI reports that it already started
and exits 2. That exit is evidence the run happened, not a reason to submit
under a fresh key. Boxes rolled back to builds predating keyed runs can lose
keys; an operator must preserve compatible box versions after enabling them.

For a service client, inspect the existing admission through the console API:
`GET /api/cli/apps/<account>/<app>/instances/<host>/runs?key=<key>` with its
bearer credential. A retained admission returns `{"run_id":"..."}`; a 404
means no retained mapping, not proof an expired run never happened. With a
known run id, `carlos run --app <app> --instance <host> --follow <id>` resumes
output. Never put the bearer credential in a URL or command argument.

## Read database copies across regions

Both database verbs remain read-only member operations:

```sh
carlos db query --app shop --instance shop.example.com --sql "select count(*) from orders"
carlos db pull --app shop --instance shop.example.com --out shop.db
```

When the data lives in another supported region, `query` restores and executes
there and returns only rows. `pull` fetches authenticated encrypted pieces and
restores them locally. The regional query copy is bounded to 2 GB restored, five
minutes, and 64 MB of returned rows; a pull is bounded to 2 GB. The output path
must not exist. Neither command touches the live database.

A replica snapshot can lag a busy instance. Fleet and pool instances have no
such copy in this contract. Treat a pulled `.db` as tenant data: keep it in
protected task storage and remove it when finished.

Regional forwarding can be disabled or unavailable on a console. Do not replace
it with direct object-store reads. If the command refuses a fleet, pool, or
instance shape, report that supported boundary.

## Give tenant automation its own environment

A `team` credential controls only environments owned by one scope inside one app:

```sh
carlos services create --role team --app shop --scope alta alta-provisioner
```

An account owner prepares or changes ownership:

```sh
carlos env adopt --app shop --environment alta-prod --scope alta
carlos env fork --app shop --from template --to alta-prod --scope alta
carlos env release --app shop --environment alta-prod
```

`env fork` copies sealed secrets unchanged. Fork only from an environment
whose secrets the destination team is authorized to hold.

An owned environment is standalone: it never inherits the app's default bundle.
It receives its own platform-managed mail and relay identities. The team
credential can read and write only environments its scope owns, provision their
instances, attach their explicit hostnames, and restart or delete them. Outside
the scope, resources appear absent.

Only a person explicitly binds an instance into an owned environment. Supply
the matching scope with `carlos instances create` or `carlos instances
set-environment`. Adoption is refused while an instance is already bound. A
credential revocation does not release owned environments; use `carlos env
release` deliberately.

## Set per-instance request limits

Inspect first, then change only named values:

```sh
carlos ratelimit show --app shop
carlos ratelimit show --app shop --host shop.example.com
carlos ratelimit set --app shop --host shop.example.com \
  --busy-at 64 --share 16 --rate 300 --burst 1000
carlos ratelimit set --app shop --path /api/:share=4,rate=20,burst=40
carlos ratelimit set --app shop --remove-path /api/
carlos ratelimit clear --app shop --host shop.example.com
```

`clear` returns the selected instances to platform defaults. `--busy-at` is the
in-flight point at which fair sharing starts; `--share` is one client address's
in-flight share while busy. `--rate` and `--burst` are the per-address backstop
that can apply while quiet. Path prefixes override the general values.

These settings are signed-in console operations. `show` also reports the
account plan's ceiling when one exists. A member setting cannot raise or bypass
that ceiling, and plan enforcement can impose stricter throttling. Use limits
to protect an app, never as an authorization boundary or identity system.

## Maintenance sources

- `docs/site/cli.md` (`carlos run`, `carlos db`, `carlos env`, `carlos services`, `carlos ratelimit`)
- `run.go`, `services.go`, `ratelimit_cli.go`
- `db.go`, `dbforward_e2e_test.go`
- `appconfig_cli.go`, `internal/console/teamscope.go`, `internal/console/teamdoors.go`

# 🤖 First deployment and verification

## Step 3 — first deploy

This deploys to a CARLOS console: Carloku, or a self-hosted platform
with its own platform domain. For a plain server, see
[Hosting](../../building-carlos-apps/references/hosting.md).

Claim the app with its build probe, build a release stamped with the
version deploy will look for, then deploy it:

```sh
carlos apps create --app myapp --build-probe /api/version
V=$(git describe --always --dirty --exclude='*')   # short sha, never a tag
make release VERSION=$V            # refuses a -dirty version: commit first
carlos deploy --app myapp --version $V \
  --env MYAPP_ORIGIN=https://myapp.<sqid>.oncarlos.com \
  --message "Publish the first working app" releases/myapp-linux-arm64
```

One version for both: `make release` alone stamps `git describe`, which
on a tagged commit is the tag, while deploy defaults to the short sha
and would wait for a build that never reports. `--dirty` keeps the
guard: an uncommitted tree gets a `-dirty` version, which `make release`
refuses. `MYAPP_ORIGIN` (the
scaffold's package name in capitals) is the public origin the app's
CSRF check and emailed sign-in links use; unset, it defaults to
`http://localhost:8080`. The host shown is Carloku's shape (`carlos
auth whoami` prints the sqid); on another console use its platform
domain, or the custom domain once attached.

`carlos deploy` creates the app's first instance (and the app itself,
if you skipped `apps create`) when they are missing (with `--region` to choose a new app's region; otherwise the
console picks one), then ships, promotes and waits for the build to
serve, printing `live https://…`. Add `--env KEY=value` for ordinary
variables; secrets go through `carlos secrets set`. If setup fails
partway, what was created stays: fix the reported error and rerun.
The longer path, `carlos instances enable` and `instances create
--host …`, still works when you need to name the host yourself.

Agents pass `--message` on deploys and other mutations that support it. Describe
what is being changed in one concise sentence; the Activity entry records the
version and target separately. Do not wait for the interactive prompt during an
automated run. See [Activity descriptions](../../building-carlos-apps/references/platform.md#describe-changes-in-activity).

Carloku's boxes are **linux/arm64**, which `make release` and `carlos
deploy` both assume by default. A box of your own or another console's
may be amd64: check the target, then change both, `make release
RELEASE_GOARCH=amd64 VERSION=$V` and `carlos deploy --target
linux-amd64 … releases/myapp-linux-amd64`. Always
static (`CGO_ENABLED=0`, which the target sets; cgo is why the
framework uses `modernc.org/sqlite`).

The build probe is set at claim time, as above, so the very first
deploy asks the process which build it runs: the `X-Carlos-Version`
header is stamped by the edge when adoption lands, whether or not the
process restarted. For an app claimed earlier, run `carlos apps
build-probe --app myapp /api/version` before deploying. On first
run deploy offers to remember the artifact path in `.carlos/config`
(commit that file); after that, releasing is the same `V=…`, `make
release VERSION=$V` and `carlos deploy --version $V`.

### The static path

No instance, no binary — deploy the directory:

```sh
carlos deploy --app myapp --kind static --host myapp.<sqid>.oncarlos.com ./public   # Carloku hostname shape
```

Pass `--host` on the first static deploy for a custom hostname.
Without it, a claimed app with a channel gets its platform host minted
for it; with no channel to mint onto, the deploy refuses and names
`--host`. Afterwards `carlos deploy` from the project dir resolves host
and channel on its own.

**Do not run `carlos instances enable` or `create` here.** "No instance"
is literal: a static site is served by the edge straight off the channel
pointer, with no process to start and nothing to wake. Step 3's recipe is
for binaries, and following it for a site builds a route that succeeds at
every step and then fails every wake. This one command is the whole
deploy.


## Step 4 — verify like the family does

The deploy's own `live` line is the primary proof. To re-verify by hand:

```sh
curl -s https://myapp.<sqid>.oncarlos.com/api/version   # Carloku's hostname shape
carlos channels --app myapp     # what each channel currently serves
carlos logs --app myapp -f      # merged app + platform timeline, no box access
```

Two traps, both paid for:

- **A 200 is not a verification.** An app-shell route happily serves any
  build ever shipped, and the `X-Carlos-Version` header proves only that
  adoption landed. The build probe (`/api/version`) is what the running
  process reports. Verify against the thing you changed, with the binary
  you built.
- **Hibernation is the story, not a bug.** Idle instances doze; the first
  request wakes them. An awake instance starts the new build within
  seconds under the default overlap swap.

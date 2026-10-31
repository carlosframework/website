# 🤖 First deployment and verification

## Step 3 — first deploy

Provision the instance (once), build for the boxes, deploy:

```sh
carlos instances enable --app myapp          # opt-in; console pins your <sqid> domain
carlos instances create --app myapp --host myapp.<sqid>.oncarlos.com --channel edge
# substitute your real sqid (carlos auth whoami shows it) — the host is typed in full.
# --channel is optional since 2026-08-31 (a first instance follows the app's pipeline
# entry, not stable), and naming it explicitly is never wrong.

GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build \
  -ldflags "-X amadan.net/rastrillo/rastrillo.BuildVersion=$(git rev-parse --short HEAD)" \
  -o myapp-linux-arm64 ./cmd/myapp

carlos deploy --app myapp --message "Publish the first working app" ./myapp-linux-arm64
```

Agents pass `--message` on deploys and other mutations that support it. Describe
what is being changed in one concise sentence; the Activity entry records the
version and target separately. Do not wait for the interactive prompt during an
automated run. See [Activity descriptions](../../building-carlos-apps/references/platform.md#describe-changes-in-activity).

The platform's boxes are **linux/arm64** — build exactly that, statically
(`CGO_ENABLED=0`; cgo is why the framework uses `modernc.org/sqlite`).

`carlos deploy` is ship + promote + watch in one motion: it uploads an
immutable release, promotes it to your app's entry channel (`edge` —
for a fresh app, edge is production; the old three-rung ladder is now
an opt-in pipeline), then follows the rollout box by box (on Carloku;
elsewhere it watches the URL) until the new build serves, and prints `live https://…`. Set `carlos apps build-probe
--app myapp /api/version` once so it asks the process which build it
runs rather than trusting the `X-Carlos-Version` header. On first
run it offers to remember the artifact path in `.carlos/config`
(commit that file); after that, releasing is just `carlos deploy`, no
arguments.

### The static path

No instance, no binary — deploy the directory:

```sh
carlos deploy --app myapp --kind static --host myapp.<sqid>.oncarlos.com ./public
```

`--host` is required on the **first** static deploy and only that one: a
static app has no instance record yet, so there is nothing to resolve the
host and channel from. That deploy attaches the host and writes the
record; afterwards `carlos deploy` from the project dir resolves both on
its own. Omitting `--host` on a first deploy is a refusal, not a default.

**Do not run `carlos instances enable` or `create` here.** "No instance"
is literal: a static site is served by the edge straight off the channel
pointer, with no process to start and nothing to wake. Step 3's recipe is
for binaries, and following it for a site builds a route that succeeds at
every step and then fails every wake. This one command is the whole
deploy.


## Step 4 — verify like the family does

The deploy's own `live` line is the primary proof. To re-verify by hand:

```sh
curl -sI https://myapp.<sqid>.oncarlos.com | grep -i x-carlos-version
carlos channels --app myapp     # what each channel currently serves
carlos logs --app myapp -f      # merged app + platform timeline, no box access
```

Two traps, both paid for:

- **A 200 is not a verification.** An app-shell route happily serves any
  build ever shipped; only the `X-Carlos-Version` header (stamped after
  the instance actually restarted) is proof. Verify against the thing you
  changed, with the binary you built.
- **Hibernation is the story, not a bug.** Idle instances doze; the first
  request wakes them. A session in flight keeps the old binary until its
  instance idles — that is the bake working, not a deploy that failed.

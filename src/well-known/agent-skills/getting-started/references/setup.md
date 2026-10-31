# 🤖 Carloku access and app setup

## What the person does, once

An agent can do everything below except these. Ask for them up front, in
one message, rather than discovering them one at a time:

1. **A Keymail identity** (keymail.dev). Carloku and amadan both sign in
   through it; there are no passwords.
2. **Sign in to the Carloku console** (`https://console.carloku.com`).
   That first sign-in is the account.
3. **Approve the `carlos auth login` code** in that browser (Step 0).
4. **On amadan:** sign in on the web and claim a namespace, log the CLI
   in (`amadan auth login -hub https://amadan.net`), then create the
   agent's account, give it the namespace and mint its token: `amadan
   agent create <name>`, `amadan agent grant <name> <ns>`, `amadan agent
   token create <name>` (amadan.net/docs/agents). The token is shown
   once; the operator configures it into the agent's own amadan home
   (`AMADAN_HOME`). amadan's docs don't yet say how that file is laid
   out, so if `AMADAN_HOME=<dir> amadan auth whoami` doesn't answer with
   the agent's `<name>~<keymail>` identity, stop and ask rather than
   working as the operator.
5. **Run an amadan CI runner** for the repo (amadan runs none itself).
   A bare `amadan runner` serves every repo its identity can reach and
   runs each job **as that user with no sandbox**, so recommend a
   dedicated machine or OS account with its own runner identity (an
   agent account granted only the runner role: `amadan agent grant
   <runner> <ns> -role runner`, with its own `AMADAN_HOME`), scoped and
   isolated: `amadan runner -repo <ns>/myapp -isolate bwrap` (Linux,
   bubblewrap installed). Start it once the repo exists (Step 2), since a
   `-repo` runner only learns names at start. Anyone who can push to the repo can run code there; never
   point a runner at a repo whose writers you wouldn't hand a shell. The
   machine needs Go and network access: the scaffold's `make ci` fetches
   its pinned tools with `go run` (amadan.net/docs/ci).
6. **DNS**, only for a custom domain: the record `carlos domains attach`
   prints.
7. **Approve anything billable.** There is no public Carloku price list
   yet (2026-10-18), so check with the person before object storage,
   email sending, or a schedule that keeps an instance awake.

And ask, in the same message, the questions that change the build:

- **One place, or a product many sign up to?** One gym, one club, one
  team is this recipe. A product where each customer gets their own
  space is building-carlos-apps' tenancy chapter first.
- **How do people sign in?** The default is a magic link by email,
  which needs email sending on a live app (Step 2). Email and password
  is the alternative that needs no email.
- **Does anything happen on a clock** (reminders, a nightly job)? That
  is `carlos schedule` (building-carlos-apps, platform.md).
- **Does it take money?** Payments are not in this recipe; stop and
  read building-carlos-apps.
- **Names:** the app name, the amadan namespace and repo, and any
  custom domain.


## Step 0 — install and sign in

Go **1.25 or newer** (rastrillo's `go.mod` says `go 1.25.0`). Then the
three CLIs:

```sh
brew install carlosframework/tap/carlos
# no brew (Linux): one pinned release, installed only if its sum checks out
V=$(curl -fsSLI -o /dev/null -w '%{url_effective}' \
      https://github.com/carlosframework/releases/releases/latest | sed 's#.*/##')
B=carlos-linux-amd64   # or carlos-linux-arm64; macOS: carlos-darwin-<arch>
U=https://github.com/carlosframework/releases/releases/download/$V
curl -fsSLO "$U/$B" && curl -fsSLO "$U/SHA256SUMS.txt" \
  && sha256sum --ignore-missing -c SHA256SUMS.txt \
  && install -m 0755 "$B" ~/.local/bin/carlos     # any dir on PATH; no sudo

go install amadan.net/rastrillo/rastrillo/cmd/rastrillo@latest
go install amadan.net/amadan/amadan/cmd/amadan@latest
```

Keep `carlos` fresh with `carlos update` (it needs a terminal; otherwise
repeat the download).

Create an account at `https://console.carloku.com` (passkey sign-in
through Keymail — no password), then connect the terminal:

```sh
carlos auth login --console https://console.carloku.com
```

Flags are written `--flag` (`-a`, `-c`, `-e`, `-v` are the short forms);
the single-dash spellings still parse. The CLI prints a short code;
approve it in the signed-in browser. Skip
this and nothing breaks — the first command that needs a login offers to
run it right there. `carlos auth whoami` shows who you are and your
account's **sqid** (a short public id like `bdf` — it appears in your
app's hostname; it is not a secret).


## Step 1 — claim the app

```sh
carlos apps create --app myapp
```

App names are unique per account, not globally. With exactly one app in
the account, later commands infer `--app`; passing it explicitly is never
wrong.

**Static site?** You are nearly done — read [the static path](deploy.md#the-static-path).

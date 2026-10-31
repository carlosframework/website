---
name: getting-started
description: Build a first CARLOS app with Rastrillo, then deploy it to Carloku. Start with the local build; load setup, deployment and service guidance only when the task reaches them. For tenancy, trust or hosting choices, use building-carlos-apps.
---

# 🤖 Getting started on CARLOS

Read only this entrypoint initially. **Do not follow links or read every
reference in advance.** Open a topic when the current step needs it, then
return to the task. A request to build locally needs no platform login.

## First build: read this, then build

For a new Rastrillo app, get the local build working before reading the
platform setup reference. Carloku login, repo hosting and platform services
are not prerequisites for that first build.

Several users sharing one group's workspace fits the simple default; do not
open the tenancy reference merely because the app has sign-in.

If the app holds private personal content or gives separate customers,
teams or people their own data spaces, first read the trust and tenancy
guidance in [building-carlos-apps](../building-carlos-apps/SKILL.md). Choose those boundaries before
writing app code.

1. Scaffold with the framework's own tool; do not hand-write its wiring:

   ```sh
   go install amadan.net/rastrillo/rastrillo/cmd/rastrillo@latest
   rastrillo new myapp
   cd myapp
   go mod tidy
   ```

   If people sign in, use `rastrillo new --auth=magic myapp` instead.

2. Read the generated `AGENTS.md` and the framework's `SKILL.md` at the
   version this app uses:

   ```sh
   cat "$(go list -m -f '{{.Dir}}' amadan.net/rastrillo/rastrillo)/SKILL.md"
   ```

   Follow its topic index for the work at hand. Use Rastrillo's UI and
   tokens with a thin app CSS layer.

3. Build the app and run its scaffolded gate:

   ```sh
   CGO_ENABLED=0 go build ./...
   make ci
   ```

**Stop reading here for a first build.** Write the app using the framework
guidance. If the request includes deployment, return to the setup and deploy
references after the build; this reading boundary does not end the task.

## Defaults to keep while building

Start with one instance for the whole app, server-rendered HTML and Rastrillo's
SQLite support. Declare server-readable data as trust class C in the README;
a static site is class S and needs no instance. Private personal data or
separate customers' data requires the tenancy/trust decision above first.
Follow the project's AGENTS.md and scaffolded checks; do not hand-roll the
platform's socket contract, auth or owner scoping.

## Open only for the current step

| When you need to… | Read |
|---|---|
| Check the first-app defaults or trust declaration | [Defaults](references/defaults.md) |
| Set up Carloku access and claim the app | [Setup](references/setup.md) |
| Revisit framework integration or put code and CI on amadan | [App and repository setup](references/app.md) |
| Deploy the built app or a static site, then verify it | [Deployment](references/deploy.md) after setup; do not repeat completed provisioning |
| Commit, review or troubleshoot a first app | [Workflow](references/workflow.md) |
| Release again or make a routine change | [Iteration](references/iteration.md) |
| Add a platform capability, diagnose an app, or inspect costs | [Platform topic index](../building-carlos-apps/references/platform.md); choose one relevant topic |

Use the `carlos` CLI and console API for platform work. A step needing SSH,
AWS access or an on-box command is a product gap, not part of this recipe.
Do not enable billable services or change production infrastructure merely
because they appear in a reference; follow the user's authorized scope.

---
name: getting-started
description: Start a CARLOS app, new or ported from another stack, from the first conversation with the operator to a polished first slice and, when they want it, a deploy. Begins with an interview; load setup, deployment and service guidance only when the task reaches them. For tenancy, trust or hosting detail, use building-carlos-apps.
---

# 🤖 Getting started on CARLOS

Read only this entrypoint initially. **Do not follow links or read every
reference in advance.** Open a topic when the current step needs it, then
return to the task. A local build needs no platform login and no host.

## 1. Interview the operator first

Before any code, send the operator one message that asks the questions
below. Ask them together, plainly, and say why each matters in a few
words. Keep working on whatever does not depend on the answers.

1. **What do they hope to achieve?** Who uses the app, the one flow that
   must feel great, and why CARLOS: values (owning their stack, leaving
   a vendor), speed, cost, privacy, or something else. Take the reason
   as given; it steers every later choice.
2. **New, or a port?** For a port: the current stack, and **how much
   they are willing to replace** to get CARLOS's benefits: the
   database, the sign-in provider, the hosting, the UI framework, the
   data model's tenancy. Before they answer, show them the gains they
   may not have counted: one database per customer, so a forgotten
   tenant filter cannot leak data; a customer's data is one file to
   export or delete; idle instances add no instance-hours; customers
   move one at a time; fast first loads held by the framework's gate;
   no Node build; an API and MCP server from the same operations; no
   lock-in, since the app is one process any server can run. Rastrillo's
   skill/port.md has the full list and the objections it answers.
3. **Who owns separate data, and how private is it?** One club, team or
   company, or many customers who each get their own space; and whether
   it holds private personal content (messages, health, anything a
   person would call theirs). Either of the latter is a tenancy and
   trust decision (building-carlos-apps) before code.
4. **How polished should the first slice be, and what personality
   should it have?** A logo, brand colours, typefaces, three words for
   the feel, and a screenshot of one key flow as they want it to work.
   Without a screenshot, offer a base theme and shell
   (rastrillo.org/design-system) and two or three quick mockups of the
   key screen to choose from. Rastrillo's skill/screens.md, "Before the
   first screen", has the full question and the practices to offer.
5. **Where do they want to host it?** Set out the options in a line
   each and ask; do not assume one. Carloku is the hosted, zero-ops
   option, a convenience running CARLOS Platform, an open-source stack
   built for these apps, and it includes a lot: zero-downtime deploys,
   instances per customer, sleep and wake, continuous backups, uploads,
   email, schedules, TLS and logs, with nothing to set up; they can also self-host that platform, join
   their own boxes, use a host they already have an account with (Fly,
   Render, Railway, Miren), deploy to their Kubernetes cluster, or run
   the binary on any server. Ask what they already run: anything that
   runs one container with a persistent volume can host it.
   [Hosting](../building-carlos-apps/references/hosting.md) has the
   detail. "Decide later" is a fine answer: the first slice runs
   locally.

Rastrillo's skill (SKILL.md and skill/*.md) can be read before any app
exists, from the module's directory:
`go mod download -json amadan.net/rastrillo/rastrillo@latest` prints it
as `Dir`.

## 2. Aim for a first slice that feels finished

A first slice is the one key flow, end to end, built to the polish and
personality the operator chose, not every screen built plain. It should
look and behave like the product they described: their colours and
type over the design system's base, the shipped practices that fit
(empty states, inline errors, searchable selects, busy buttons, flash
notices, transitions), and scripts that make it richer where the flow
needs it. If the operator has not answered yet, propose a personality
from what the product is for, build to ready-for-customers, and tell
them what you chose.

## 3. Build locally

1. Scaffold with the framework's own tool; do not hand-write its wiring:

   ```sh
   go install amadan.net/rastrillo/rastrillo/cmd/rastrillo@latest
   rastrillo new --auth=magic --theme=<base> --shell=<base> myapp
   cd myapp
   go mod tidy
   ```

   Drop `--auth=magic` if nobody signs in.

2. Read the generated `AGENTS.md` and the framework's `SKILL.md` at the
   version this app uses, then follow its topic index for the work at
   hand:

   ```sh
   cat "$(go list -m -f '{{.Dir}}' amadan.net/rastrillo/rastrillo)/SKILL.md"
   ```

3. Build the app and run its scaffolded gate:

   ```sh
   CGO_ENABLED=0 go build ./...
   make ci
   ```

Show the operator the running slice (a screenshot or a link they can
reach) before moving on to the next flow or to hosting.

## Defaults to keep while building

One instance for the whole app, trust class C, unless question 3 of
the interview called for the tenancy and trust decision; server-rendered HTML, links and forms first, enhanced with
vanilla scripts; Rastrillo's SQLite support. Declare server-readable
data as trust class C in the README; a static site is class S and
needs no instance. Follow the project's AGENTS.md and scaffolded
checks; do not hand-roll the platform's socket contract, auth or owner
scoping.

## Open only for the current step

| When you need to… | Read |
|---|---|
| Check the first-app defaults or trust declaration | [Defaults](references/defaults.md) |
| Lay out hosting options, or run off the platform | [Hosting](../building-carlos-apps/references/hosting.md) |
| Set up access to Carloku or a self-hosted console, and claim the app | [Setup](references/setup.md) |
| Revisit framework integration or put code and CI on amadan | [App and repository setup](references/app.md) |
| Deploy the built app or a static site to a CARLOS console, then verify it | [Deployment](references/deploy.md) after setup |
| Commit, review or troubleshoot a first app | [Workflow](references/workflow.md) |
| Release again or make a routine change | [Iteration](references/iteration.md) |
| Add a platform capability, diagnose an app, or inspect costs | [Platform topic index](../building-carlos-apps/references/platform.md); choose one relevant topic |

On a CARLOS console, use the `carlos` CLI and console API for platform
work; a step needing SSH, AWS access or an on-box command is a product
gap. Do not enable billable services or change production
infrastructure merely because they appear in a reference; follow the
operator's authorized scope.

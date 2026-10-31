---
name: building-carlos-apps
description: "Design or adapt a CARLOS app: choose tenant boundaries, trust, app shape and hosting, or find the platform capability for the current task. Read task-specific references only when needed. For a first local app and deploy recipe, use getting-started."
---

# 🤖 Building CARLOS apps

CARLOS runs isolated instances: each tenant gets its own process, SQLite file
and socket, with replication and hibernation managed by the platform.

**Read this index first. Do not follow every link, prefetch references, or
load the whole skill directory.** Choose the topic needed for the current
step. Read another only when the task reaches it. Existing projects' AGENTS.md
and the user's explicit decisions take precedence.

## Before new app code: tenancy, then trust

Record in AGENTS.md what one instance represents, how people reach it, and
what the host can see. Choose the smallest unit that owns data, fails and
leaves together. Use separate instances for separate tenants; a `tenant_id`
column in one shared database is not the CARLOS isolation boundary. A shared
app may deliberately have one instance. A static site has none.

Choose a trust class per workload: S (no user data), A1/A2/A-pub (host-blind,
with declared residue or public surfaces), B (sealed at rest, readable while
awake), or C (server-readable, explicitly declared). Name the benefits the
chosen design earns and the leaks it accepts. Read [tenancy and trust](references/tenancy.md)
when making these decisions; an already settled decision needs no reread.
For the simple first-app defaults, use [getting-started](../getting-started/SKILL.md).

## Rules for implementation

- Use Rastrillo's scaffold and the framework skill at the app's installed
  version. Default to its UI components and tokens, with thin app CSS;
  respect an established design system or explicit design brief.
- Keep migrations compatible with the builds that may run together. Prefer
  server-rendered HTML with a working zero-JavaScript baseline; choose another
  shape deliberately. Read [app choices](references/decisions.md) for that choice.
- Use the platform for routing, TLS, replication, hibernation and process
  control. Before implementing another platform capability, select the relevant
  topic below. Day-to-day operations use `carlos` and the console API, never
  SSH, direct AWS access or on-box verbs.
- A capability being documented is not authorization to enable it. Keep
  production changes and billable services within the user's approved scope.

## Open only for the current task

| Task | Reference |
|---|---|
| Choose instance boundaries, home/hub shape, trust or per-tenant reporting | [Tenancy](references/tenancy.md) |
| Choose encryption, app shape, hosting or identity | [Decisions](references/decisions.md) |
| Implement Rastrillo handlers, models or UI | [Framework](references/rastrillo.md); then the installed framework skill and its relevant topic |
| Deploy, operate, add a platform service, debug or inspect costs | [Platform topic index](references/platform.md); open only the matching topic |
| Set project rules or assess a departure from CARLOS principles | [Principles](references/principles.md) |
| Adopt CARLOS in an existing app or check app conventions | [Conventions](references/conventions.md) |
| Work on commits, tests, review or canaries | [Process](references/process.md) |
| Implement infrastructure outside the platform | [Blueprint](references/blueprint.md), only when that is the chosen hosting model |
| Understand the family and historical context | [Orientation](references/orientation.md), optional background |

Return to implementation once the relevant question is answered. Reference
links are conditional reading, not a checklist to complete.

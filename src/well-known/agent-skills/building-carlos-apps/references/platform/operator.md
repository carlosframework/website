# 🤖 Platform availability and operation

Read only when operating a deployment is explicitly in scope.

## Switched off, or not released

A flag in the CLI or a feature in current source does not establish that
its console or boxes support it. Earlier notes recorded residency, moves,
temporary apps and seeded instances as switched off on Carloku; those were
historical observations. Inspect current help, console responses and rollout
state rather than carrying those observations forward as live facts.

Some operations remain gated by deployment settings or box versions. Refusal
is a reason to check availability, not permission to bypass the API or enable
an operator switch. Do not invent an app-side replacement for a platform
capability that is unavailable on this deployment.

## Self-hosting the platform

The platform is the same software members deploy onto: a self-hosted
deployment (Tito's path) runs its own console, boxes, and bucket in its
own cloud account, and its members use the identical `carlos` CLI pointed
at that console. Operating it is real work — box provisioning, the
adopt/restart cadence, platform rolls — and it is the one context where
box verbs and cloud access are legitimate. Commit a `.carlos/config`
naming the deployment's console so sessions cannot fall back to the wrong
one; the CLI's account default is not your account (never assume the default account owns the app).

The deployment's own binary is a channel like any app's:
`carlos system update --channel canary|stable` promotes a release, and
every box on that channel fetches it, verifies it against the signed
pointer, installs it, restarts its edge, and rolls itself back if the new
one does not come up and stay up. `carlos system status` shows each box's
running build and last apply outcome; `carlos system rollback` undoes it;
`--spread 10m` staggers a stable roll. The console is an app — update it
with `carlos deploy --app console`. Owner of the ops account only.

For the underlying machinery — registry, router, replication, hibernation
internals — see [blueprint](../blueprint.md), which is the reference for what the
platform does on your behalf and for hand-rolling outside it.

## Operator-only capabilities

Read the platform's CLI documentation and deployment runbook only for the
operation you are authorized to perform. These are not app setup steps:

- `carlos accounts plan` inspects or sets plans and sponsored limits.
  `carlos billing problems`, `close` and `house` manage deployment billing
  exceptions; billing must be enabled. Do not offer them as member commands.
- `carlos proof` manages signed build-adoption proofs. Inspect its `history`
  for adoption evidence; keys and proof policy belong to the deployment.
- `carlos system` includes platform rolls, box identities, group roles,
  lifecycle and layout maintenance, scanners, GeoIP and seed settings.
  `carlos move` and host-local `edge`, `agent`, `adopt`, `ops` and
  `instance-*` verbs likewise require operator context.
- `carlos economics` and `status` inspect deployment state. Customer-owned
  fleet operations have their own [fleet guidance](fleets.md).

Before creating or changing production infrastructure, obtain the user's
scoped authorization unless an established preauthorized workflow covers it.
Specify resources, permissions, traffic, cost, duration and cleanup. Merely
reading this topic or having credentials does not grant that authorization.

Source: platform `docs/site/cli.md` and `main.go` at `a2e23ba0`.

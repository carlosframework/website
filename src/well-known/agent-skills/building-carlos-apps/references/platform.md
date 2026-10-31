# 🤖 Platform topic index

Read this index, then **only the topic needed for the current task**. Do not
read the command map or every reference as onboarding. For a local first
build, return to the framework; no platform topic is required yet.

Use the console API and `carlos` CLI, with no infrastructure access. Before
an operation, run `carlos auth whoami` and inspect project `.carlos/config`.
For exact flags, use `carlos <verb> --help`. An installed CLI may be newer
than its console; a feature in source does not prove it is enabled there.

Capability coverage checked against platform source `a2e23ba0` on 2026-10-31.
Existing release dates describe historical rollouts, not a guarantee about
a particular deployment. Check the console response and the app's own channels.

| Current task | Open |
|---|---|
| Authenticate, select a destination or describe a mutation | [Access](platform/access.md) |
| Understand accounts, channels, environments or service credentials | [Concepts](platform/concepts.md) |
| Find the command when its name is unknown | [Command map](platform/commands.md); search it for the capability |
| Provision tenants or route one hostname by path | [Instances and path routes](platform/instances.md) |
| Deploy, canary, roll back or diagnose rollout | [Releases](platform/release.md) |
| Investigate errors, downtime, logs or analytics | [Observability](platform/observe.md) |
| Store uploaded objects, rotate store credentials or request malware scans/callbacks | [Storage and scanning](platform/storage.md) |
| Send mail or configure a sending domain | [Email](platform/email.md) |
| Run recurring or one-off scheduled work | [Schedules](platform/schedule.md) |
| Ship a root filesystem or a non-Go runtime on an owned fleet | [Rootfs apps](platform/rootfs.md) |
| Share a temporary static site, set response headers or cache public assets at edges | [Static delivery and assets](platform/delivery.md) |
| Attach domains, use regional placements or choose a default region | [Domains and regions](platform/domains.md) |
| Run an app command, query data, scope team credentials or tune request limits | [Runtime and authority](platform/runtime.md) |
| Place apps on an account-owned fleet or configure its secret key | [Fleets](platform/fleets.md) |
| Share a local server or folder privately on a devbox | [Devbox](platform/devbox.md), not a public deployment |
| Use visitor location | [Location](platform/location.md) |
| Operate or self-host the platform | [Operator boundary](platform/operator.md); only when operating the deployment is in scope |

## Existing section links

These headings retain earlier links. Follow only the one your task needs.

## Start with `carlos auth whoami`

Read [this topic](platform/access.md#start-with-carlos-auth-whoami) when needed.

## Describe changes in Activity

Read [this topic](platform/access.md#describe-changes-in-activity) when needed.

## What the platform owns (never hand-roll these)

Read [this topic](platform/concepts.md#what-the-platform-owns-never-hand-roll-these) when needed.

## Concepts

Read [this topic](platform/concepts.md#concepts) when needed.

## The member CLI

Read [this topic](platform/commands.md#the-member-cli) when needed.

## Provisioning instances from your own app

Read [this topic](platform/instances.md#provisioning-instances-from-your-own-app) when needed.

## One hostname, many instances

Read [this topic](platform/instances.md#one-hostname-many-instances) when needed.

## Deploying a static site

Read [this topic](platform/release.md#deploying-a-static-site) when needed.

## Standing a canary beside production

Read [this topic](platform/release.md#standing-a-canary-beside-production) when needed.

## Two builds at once

Read [this topic](platform/release.md#two-builds-at-once) when needed.

## Deploy truths (each paid for at least once)

Read [this topic](platform/release.md#deploy-truths-each-paid-for-at-least-once) when needed.

## Watching an app: errors, availability and analytics

Read [this topic](platform/observe.md#watching-an-app-errors-availability-and-analytics) when needed.

## Sending email

Read [this topic](platform/email.md#sending-email) when needed.

## Scheduled work

Read [this topic](platform/schedule.md#scheduled-work) when needed.

## Visitor location headers

Read [this topic](platform/location.md#visitor-location-headers) when needed.

## Switched off, or not released

Read [this topic](platform/operator.md#switched-off-or-not-released) when needed.

## Self-hosting the platform

Read [this topic](platform/operator.md#self-hosting-the-platform) when needed.

# Apps with one instance per customer

When an app gives every customer their own instance, each customer’s data can live in its own SQLite database, idle customers sleep, and a busy one can get a bigger size. A few things span customers: signing in once, shared data, a shared API key, background work and reports. Put those in a second, small app beside it, called a hub here.

This guide uses `shop`, with one instance per customer, and its hub, `shop-hub`.

## The two apps

`shop` has one instance per customer, each with that customer’s database and settings. `shop-hub` has one instance. It signs people in, keeps shared data and keys, and creates customer instances.

Turn on provisioning once:

```sh
carlos instances enable --app shop
```

Create a credential for the hub. This credential can manage instances of `shop` only:

```sh
carlos services create --role instance --app shop shop-signup
```

The command prints the secret once. Store it on the hub:

```sh
carlos secrets set --app shop-hub CARLOS_SERVICE_TOKEN=<secret>
```

At signup, the hub runs `carlos instances create --app shop` with that credential. The public HTTP API is still being designed ([API reference](/docs/api)).

Give each customer their own settings in a named bundle. Write the bundle, then create the instance on it:

```sh
carlos env set --app shop --environment <name> CUSTOMER_NAME=<value>
carlos secrets set --app shop --environment <name> CUSTOMER_SECRET=<value>
carlos instances create --app shop --host <customer-host> --environment <name>
```

The bundle is layered on top of the app’s default config.

## Sign in once

People sign in at `shop-hub` only. The hub keeps each person’s profile and which customers they belong to, with their role at each.

When someone opens a customer, the hub gives the browser a short-lived signed pass: for example, a token signed with the hub’s private key, valid for a minute, naming the person, the customer’s host and the role.

Each `shop` instance checks the pass with the hub’s public key. Put that key in the app-wide configuration:

```sh
carlos env set --app shop HUB_PUBLIC_KEY=<public-key>
```

The instance then starts its own session.

When an instance needs profile data, such as an address or a phone number, it asks the hub. The hub records the grant, and the person can revoke it there.

Don’t build passwords. Email sign-in links or an OAuth provider at the hub cover sign-in.

## Shared data

Instances never open a shared database. Choose where shared data lives based on how it changes.

Data that changes with your code, such as lookup tables or tax rates, ships inside the release as an embedded file or SQLite database. Every instance has it after a deploy.

Small settings and keys go in the app’s default config, which every instance receives:

```sh
carlos env set --app shop TAX_RATE=20
```

Data people edit while the app runs belongs to `shop-hub`. Instances read it over HTTPS and cache it.

## A shared third-party API

If an API you share across customers has a request or cost limit, keep its key on `shop-hub`:

```sh
carlos secrets set --app shop-hub THIRD_PARTY_API_KEY=<key>
```

Each `shop` instance calls the hub. The hub calls the third-party API, enforces the limit and counts use for each customer.

The hub has to know which customer is calling. When it creates an instance, it puts a token of that instance’s own in the instance’s bundle and keeps the matching value itself.

A sidecar won’t do this job: it belongs to one instance, and nothing can call it.

Some shared services come with the platform: `carlos email`, [PDF rendering](/docs/pdfs), `carlos store` and `carlos schedule`.

## Background work

None of this needs an instance that stays awake.

For work a request causes, write an outbox row in the same transaction, send it at the end of the request, and retry what’s left on the next wake.

For regular work on every customer, add a schedule:

```sh
carlos schedule set --app shop --name sync --every 1h --path /jobs/sync
```

Each instance fires at its own point in the hour, so a hundred instances wake about one every 36 seconds, never all at once. A tick doesn’t keep an instance awake.

For work at a known time, set a one-shot timer: the app asks the platform on `CARLOS_CONTROL_SOCKET`, with its `CARLOS_ADMIN_TOKEN`, and the platform wakes that instance and POSTs to the path at that time. Only instances with work wake.

For one job across the whole app, such as a nightly roll-up, schedule it on `shop-hub`. It has one instance, so the job runs once.

## Reports across customers

Don’t query every customer when someone opens a report. Each `shop` instance sends the facts reports need, such as orders and refunds, to the hub through its outbox as they happen. The hub keeps the reporting tables and knows which customers belong together.

For a one-off check, read a copy of one instance’s database on your own machine:

```sh
carlos db query --app shop --instance <host> --sql "SELECT count(*) FROM orders"
```

The copy is read-only, and the live instance is untouched.

## When one customer gets busy

An operator can give that one instance a bigger size: `small` (256 MiB), `standard` (512 MiB), `large` (1 GiB) or `xlarge` (2 GiB). See [carlos apps](/docs/cli#carlos-apps).

To give customers machines of your own, place the app on your own fleet when you create it (`--place fleet/<name>`).

If `shop` keeps no local database, an instance can run as several copies across a fleet. See [Stateless replicas](/docs/stateless-replicas).

## Gaps today

- A hub and a customer instance that land on the same box can’t reach each other through the edge yet.
- The platform doesn’t yet issue an identity an instance can show the hub, so the per-instance token is yours to manage.
- One instance can’t yet be moved onto a box of its own.

# Plans

A deployment can give each account a plan. A plan sets limits: how many apps and instances an account runs, how soon its apps sleep, how much disk, storage, email and bandwidth it gets, and whether it can use custom domains or its own boxes. Packs raise some of those limits.

Plans are off unless you turn them on. A deployment with no plan catalog has no limits, which is how every deployment has run until now.

## Turning plans on

Write a catalog file and point the console at it:

```sh
CARLOS_PLAN_CATALOG=/etc/carlos/plans.json
```

The console reads the file when it starts. If the file is missing or wrong, the console refuses to start rather than run with no limits.

## The catalog

```json
{
  "version": "2026-10-20-v1",
  "default_plan": "free",
  "free_accounts_per_person": 1,
  "plans": {
    "free": {"paid": false, "limits": {"running_things": 3, "idle_seconds": 90, "memory_tier": "small"}},
    "personal": {"paid": true, "limits": {"running_things": 25, "idle_seconds": 900}, "packs": ["apps"]}
  },
  "packs": {
    "apps": {"adds": {"running_things": 5}, "max_quantity": 20}
  },
  "ceilings": {"running_things": 200}
}
```

Every account without a plan of its own is on `default_plan`. Packs may only raise counts and sizes: apps and instances, disk, storage, email and bandwidth. A ceiling is the most any plan with packs can reach.

Change `version` whenever you change the file. The console notices an edit that kept the old version and treats it as a new catalog anyway, so every account's limits are written again.

## Assigning a plan

```sh
carlos accounts plan --account bac --set personal --reason "upgraded"
```

The console writes each account's limits to `accounts/<sqid>/limits.json` in the deployment bucket, and the boxes read them from there. A change reaches the bucket straight away, or within a minute if the bucket was unavailable.

## Sponsored accounts

A sponsored account keeps its plan but gets limits of its own where those are more generous, for example the usage it already had when plans were turned on:

```sh
carlos accounts plan --account bac --set free --sponsored limits.json --reason "existing account"
```

`limits.json` holds any of the limit names from the catalog. A sponsored limit can go above a ceiling: that is a decision you made for that account.

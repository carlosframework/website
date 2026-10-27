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

## Rate limit ceilings

A plan can cap how far an account may raise an instance's rate limits, with `rate_client_share`, `rate_per_second` and `rate_burst` in its limits or in `ceilings`. Leave one out and that number has no ceiling. Packs cannot raise them. A `rate_per_second` below 300 or a `rate_burst` below 1000 is refused when the catalog loads, because a plan may never make limits stricter than the platform's defaults. See [Rate limits](rate-limits.md).

## Warnings and grace

Once an hour the console compares each account's usage with its limits, for five caps:

- apps and instances running;
- object storage;
- emails sent today;
- bandwidth this month;
- awake hours this month.

The figures come from what the console already records: its own app list, the monthly usage statements, the daily storage sweep and the mail counts. A cap whose limit is 0 is skipped.

At 80% of a limit, the account's owners get an email, and a banner appears on every account page. A `carlos` command run against the account prints a line starting `warning:`, from a CLI new enough to print it.

Going over the limit starts a grace period:
- 7 days for apps and instances, and for storage;
- the rest of the UTC day for email;
- the rest of the UTC month for bandwidth and awake hours.

While an account is over, its owners get one reminder a day, saying when grace ends and how to get back under: buy a pack, move to a bigger plan, or clean up.

After grace, only the capped action is refused, and each refusal lifts by itself:

- **Email.** When an account has sent twice its daily limit, every sender of every app is paused until midnight UTC. This does not wait for notice, because sending reputation is shared by every tenant. The catalog's email ceiling caps it.
- **Storage.** New uploads to the account's stores are refused once grace has ended and an owner has had notice for 3 days, or straight away at twice the limit. Downloads, listing and deletes keep working, so the account can clean up. Uploads come back once usage is under the limit or the limit is raised.

- **Bandwidth.** At twice the month's limit, the account's apps are served more slowly until the month ends or the plan grows: one shared allowance of 5 requests a second, with bursts up to 30, across all its instances. This does not wait for notice, because twice the limit is bandwidth's hard ceiling.
- **Awake hours.** At twice the month's limit, once an owner has had notice for 3 days, the apps are slowed the same way. Open live connections (WebSockets) are closed, new ones are refused, and each instance is put to sleep after 15 minutes awake. It wakes on its next request.

The slowdown is a plan stage, not abuse protection, so it applies whatever `CARLOS_RATE_LIMIT` says. `CARLOS_PLAN_LIMITS=off` on a box turns it off with every other plan limit. Each box drops a throttle at the start of the next month even if it can't reach the console.

The account banner and the CLI warning line say which stage is in force.

The console also records when an owner actually received notice: an email that was accepted for delivery, an owner viewing an account page with the banner, or an owner's CLI printing the warning. Apart from the ceilings above (email, storage and bandwidth at twice their limits), whatever acts after grace starts only once grace has ended and an owner received notice at least 3 days earlier. So an account nobody has heard from is never cut off for anything short of a ceiling.

## When a plan lapses

When a paid account's limits fall, what the smaller plan no longer covers is turned off after a grace period. This happens when a plan change moves an account from a paid plan, or from any pack, to limits that are lower for apps and instances running, workers per app, custom domains, fleets or the shortest schedule. A downgrade, a lapsed subscription and a pack taken away all count. Two things never start it:

- an account that never paid, even if it is over its limits. It gets the warnings above and new apps are refused, and nothing is turned off;
- a sponsored account. Making an account sponsored turns back on anything a lapse turned off.

Editing the catalog so a plan gets smaller does not start a lapse either. Change the accounts you mean one at a time.

Each fall starts 7 days of grace, with the same notice rule as above: nothing is turned off until grace has ended and an owner received notice at least 3 days earlier. During grace everything keeps working. After it, these are turned off:

- apps and instances beyond the plan's count, newest first, unless an owner chose which stay. Turning an app off turns off all its instances and workers;
- workers beyond the per-app count, newest first within each app;
- every custom domain, on a plan without custom domains. The platform address of an instance that is still covered keeps working.

Turned-off apps and instances still count toward the plan's limit, so new ones stay refused until the account deletes something or the plan grows. Deleting something brings the next turned-off thing back on within the hour.

A visitor to a turned-off site gets a plain page with a 503 status, marked not to be indexed. It says the site is not available and that the owner can sign in to find out why. It says nothing about plans or payment. A turned-off instance or worker is never woken: not by a request, a schedule or a scheduled run. One that was running stops at the next check. A move between regions still works.

Settings and data are kept. A custom domain stays attached, so nobody else can claim it, and its certificate keeps renewing. `carlos db pull` and `carlos db query` still work on a turned-off instance, because they read the copy the platform keeps, not the instance itself. The copy is as recent as the instance's last sync before it stopped.

Owners choose which apps, instances and workers stay on the account's keep page, `/a/<account>/plan/keep`, linked from the banner. Keeping an instance keeps its app, and the choice can be changed at any time. A change takes effect at once: whatever it turns back on, and whatever it now turns off if grace is over.

The account's owners get one email when something is turned off and then one a week, listing what is off and linking the keep page. The banner and the CLI warning line say the same.

Paying again turns everything back on straight away. The console records the change in the same request, and each box picks it up on its next check, within about five minutes. A further fall while things are off keeps what is already off and gives anything new its own 7 days.

`CARLOS_PLAN_LIMITS=off` on a box turns this off there, with every other plan limit: that box serves everything it hosts. So does a box that has never read the account's limits.

## Billing (operators)

Billing keeps each paying account's plan in step with its subscription at Stripe. When a subscription is paid, the account is on the plan and packs it bought. When the subscription ends, the account goes back to the default plan, and a fall from a paid plan or pack starts a lapse exactly as described above. Owners buy and change plans on the account's billing page, described in [Billing (owners)](#billing-owners) below. Billing is dormant until an operator sets it up, and this section is for that operator.

Billing is off unless you turn it on, and it needs plans: `CARLOS_BILLING` without `CARLOS_PLAN_CATALOG` stops the console at start. Nothing switches billing on by itself.

### Turning it on

Every billing setting lives in the console's EnvironmentFile. None of them is a flag, a file in the bucket or a `carlos secrets` value, and the console never logs the key.

| Variable | What it holds |
| --- | --- |
| `CARLOS_BILLING` | `off`, `test` or `live`. Unset is `off`. |
| `CARLOS_PLAN_CATALOG` | The plan catalog. Billing needs one, as above. |
| `CARLOS_PRICE_BOOK` | The path to the price book file. |
| `CARLOS_BILLING_PRICES` | A JSON object from each price key to its Stripe price id. |
| `CARLOS_STRIPE_SECRET_KEY` | A restricted key: `rk_test_` in test mode, `rk_live_` in live mode. |
| `CARLOS_STRIPE_ACCOUNT` | The Stripe account the key belongs to (`acct_`). |
| `CARLOS_STRIPE_WEBHOOK_SECRET` | The webhook signing secret (`whsec_`). |
| `CARLOS_STRIPE_PREVIOUS_WEBHOOK_SECRETS` | Optional. Up to two older signing secrets, comma separated, while you rotate. |
| `CARLOS_STRIPE_PORTAL_CONFIGURATION` | Required with billing on. The id (`bpc_`) of a Stripe customer portal configuration that allows cards and invoice history and nothing else. |
| `CARLOS_STRIPE_HOUSE_COUPON` | Optional. The id of the coupon that makes a house account's checkout free. |

If any of them is wrong, the console refuses to start and names the variable, never its value.

Point Stripe's webhook at `https://<console>/billing/webhook`. When the console starts, it checks the account, every price in the book, the portal configuration and the house coupon (if you set one) against Stripe before it accepts a webhook. Until that check passes, the webhook answers 503 and Stripe tries again later, so a console that starts while Stripe is unreachable catches up by itself.

### The portal and the house coupon

Owners reach Stripe's customer portal from the billing page, to update a card or read an invoice. In the Stripe Dashboard, make a portal configuration that allows payment method updates and invoice history, and turns off plan changes and cancellation. Put its id in `CARLOS_STRIPE_PORTAL_CONFIGURATION`. The console refuses to start with billing on if the variable is missing, and the start-up check refuses a configuration that lets customers change or cancel a subscription, because those changes would bypass the console.

The house coupon is a coupon you create in Stripe: 100% off, forever, for all products, with no redemption limit and no deadline. The start-up check refuses any other coupon. Without `CARLOS_STRIPE_HOUSE_COUPON`, you can still mark house accounts, but their checkout is refused.

### The price book

The price book is a file beside the catalog. It gives one yearly price for each paid plan and each pack, in each currency you sell (`usd`, `eur` and `gbp`), and names the catalog version it prices. Its status is `draft` or `approved`. Test mode accepts a draft. Live mode refuses one.

The price keys in `CARLOS_BILLING_PRICES` are `<book>/<plan>/<currency>` for a plan and `<book>/pack/<pack>/<currency>` for a pack, for example `2026-11-01-v1/personal/usd`. Give each Stripe price the same key in its `price_key` metadata. The start-up check compares them, so two prices can't be swapped by mistake. Stripe price ids never go in the book.

A book is never edited. To change a price, or to approve a draft, write a new book with a new version. The console remembers each version it has started with, and refuses to start if a version's content has changed.

### Billing problems

When the console sees something about a subscription it can't settle on its own, it leaves the plan alone and opens a billing problem. List them, and close one once you've dealt with it in the Stripe Dashboard:

```sh
carlos billing problems          # open problems
carlos billing problems -all     # closed ones too
carlos billing close -id 12 -note "refunded and cancelled in the dashboard"
```

The console can't close most problems while Stripe can still charge the subscription, an unpaid one included, and it can't see refunds, so your note is the record of what you did. The last four reasons in the table are about a subscription that is live, so they close while it is.

| Reason | What it means | What to do in Stripe |
| --- | --- | --- |
| `unrecognised` | A paid subscription whose prices aren't a purchase the console sells: an unknown price, mixed currencies, a second plan. | Refund the payment and cancel the subscription. |
| `second_subscription` | The account already has a live subscription and another one appeared. | Refund and cancel the newer one. |
| `not_billing_owned` | A paid subscription on an account whose plan an operator set or sponsored. Billing never overwrites those. | Refund and cancel, or move the account back to the default plan first if it should be billed. |
| `unknown_customer` | A subscription on a Stripe customer the console never created. | Find out where it came from, then refund and cancel. |
| `account_mismatch` | The subscription's metadata names a different account from its customer's. | Check both accounts, then refund and cancel. |
| `mode_mismatch` | A test-mode subscription reached a live console, or the other way round. | Check the webhook endpoints in each mode. |
| `discovery_failing` | For a day, the console has failed to read the subscriptions of a customer whose purchase it may have missed. It keeps trying every hour, and closes the problem itself once a read succeeds. | Check the customer in Stripe. If a subscription is paid, find out why the console can't read it. |
| `subscription_missing` | Stripe has no record of the account's current subscription. The account keeps its paid limits while the problem is open. | Find out what happened to it. Closing the problem while Stripe still has no such subscription ends it in the console and moves the account to the default plan. |
| `seats_unpaid` | A team account has more members than the seats it has paid for this year. The owners' billing page says so and asks them to remove members or ask an operator. | Nothing needs doing in Stripe. Ask the owners to remove members. The console closes the problem itself once the members are at or below the paid seats. Closing it by hand works only then too, and is refused while the account is still over. |
| `operation_unresolved` | The console sent Stripe a change (a pack, an upgrade, a seat, or a renewal switch) and never learned whether it happened. It will not send it again, because that could charge twice. The owners' billing page says the change is being checked. | Open the Dashboard's request log and find the request. Its idempotency key is `op:` followed by the operation id in the problem's detail. Close the problem with a note that starts with `executed` or `not-executed`, then what you saw. If the subscription already shows the change, the close just goes ahead. With `executed`, the close is refused until the subscription really shows it: put it right in the Dashboard first. With `not-executed`, the console drops the change and the owners can ask again. |
| `restore_after_renewal` | An account took a pack or seat back up to what it had paid for, but Stripe applied it after the renewal that should have billed it. The subscription holds more than the renewal charged for. | Compare the subscription with the renewal invoice. Either charge the difference or put the quantity back, then close the problem with a note. |
| `restore_check_stalled` | The console has not been able to check that renewal against the subscription for seven days. | Do the same comparison by hand, then close the problem with a note. |

### House accounts

A house account is one you run yourself. Its checkout carries the house coupon, so it pays nothing. Mark and clear one from the CLI, as an operator:

```sh
carlos billing house -account bac -on -note "our own shop"
carlos billing house -account bac -off -note "now a customer"
```

Give `-account` the account's sqid, exactly one of `-on` and `-off`, and a `-note` saying why. The note is kept with who set it and is written to the console log. The mark applies when the account starts a checkout. It does not change a subscription the account already has. Clearing an account that isn't marked is not an error. This command works only against a console, not a bucket, and only for operators.

## Billing (owners)

Where billing is on, an account's owners buy and change their plan on the account's Billing page, at `/a/<account>/billing`. Members can open the page and read it, but only an owner can change anything. If an operator set the account's plan, there is nothing to buy.

### Buying a plan

Under **Choose a plan**, pick a currency (`usd`, `eur` or `gbp`), a plan, and any packs, then press **Continue to payment**. You go to Stripe to pay. When you come back, the page shows your new plan as soon as the payment is confirmed. Prices are for a year, and tax is added where it applies.

The currency is fixed by the first purchase. After that the page says which currency the account pays in, and changing it means asking an operator.

### Packs

A pack raises one limit, such as apps or storage. Each pack has a number box and a **Change** button.

- **Raising** a pack charges you now, for the rest of the year, plus any tax. Before anything is charged, you see a page headed **Pay for this change?** with the estimate. **Pay now** charges your card and the new limit applies at once. You may be asked to sign in again first.
- **Lowering** a pack charges nothing and refunds nothing. The pack keeps its limits until the plan renews, and the next renewal bills the smaller amount.
- **Buying back** a pack you lowered, up to what you already paid for this year, costs nothing more. It is refused within a day of renewal, because the renewal is about to bill the lower amount. Try again after it renews, and the pack is then an ordinary purchase.
- **Upgrade to** a bigger plan charges the difference for the rest of the year, the same way.

Only one change runs at a time. If you start another while one is being confirmed or paid for, the page asks you to finish or wait.

### Members and seats on team plans

A team plan is priced per member a year, with a minimum number of members. You pay for one seat per member, or the minimum if that is higher.

- **Inviting** someone who would need a new paid seat shows what the seat will cost: "When *name* joins, the account pays about *amount* now for the rest of the year, plus any tax." Confirming the invite authorises that one seat. Nothing is charged until the person joins.
- **Joining** uses a seat the account has already paid for first. A new seat is paid for with the invite's authorisation. If the payment doesn't go through, the join waits: the person sees a page saying the account can't add them yet, and the owners see why on their billing page. The person can open the same link again later.
- **Removing** a member lowers the seats from the next renewal, with no refund. If that didn't go through, the page says "Your next renewal bills 12 seats for 10 members." and offers **Match seats to members**, which lowers the seats to the members now.
- If the account ever has more members than seats, the page says "This account has more members than it pays for." Remove members, or ask an operator.

### Confirm now

If the page says it couldn't confirm a change or a payment page, it offers **Confirm now**. Pressing it asks Stripe what happened and shows the result. It never charges anything again. If that still can't settle it, the console opens a billing problem for an operator, and the page says someone is checking.

### Continue to payment and Start over

If you leave Stripe's payment page without paying, the Billing page says "Your payment page is still open." **Continue to payment** takes you back to it. **Start over** throws it away and begins a new purchase, with the plan and packs you chose. A payment page that has expired says so and asks you to start again.

### Stopping and resuming renewal

**Stop renewal** keeps the plan until the paid year ends and then moves the account to the free plan. The page says "Your plan ends on *date*." Anything the free plan doesn't cover is handled as described in [When a plan lapses](#when-a-plan-lapses). **Turn renewal back on** undoes it any time before then. Neither charges anything.

### Deleting a paid account

An account can't be deleted while it is still set to renew, or while a payment is being collected or a change is being confirmed. Stop renewal first, settle any payment under Payment and invoices, then delete the account. Deleting an account that never bought anything works as it always has.

### Payment and invoices

**Payment and invoices** opens Stripe's page for the account's cards and invoices. It does nothing else: you can't change the plan, a pack or the renewal there. Use it to update a card when the page says your last payment didn't go through (your plan stays while Stripe retries), or to pay a change that is waiting for payment, which is dropped after a day if nobody pays it. It shows once the account has bought something, and you may be asked to sign in again before it opens.

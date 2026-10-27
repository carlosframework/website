# Rate limits

The platform stops one visitor from taking over an instance. It does this at the edge, so a refused request never reaches the app and never wakes a sleeping one.

A quiet instance is never limited except by the backstop, which only a flood from one address reaches. The other limits only start when the instance is busy, and then the visitors with the most requests in flight are turned away first. Everyone else carries on as normal, including many people sharing one address, like an office or a phone network.

## What a refused visitor sees

A `429 Too Many Requests` answer with a `Retry-After` header and a one-line plain-text body. Browsers and scripts both handle it.

## The four numbers

Each instance has four numbers. You only set the ones you want to change; the rest keep the platform's defaults.

| Setting | Default | What it does |
| --- | --- | --- |
| busy at | 64 | The instance counts as busy when this many requests are in flight at once. |
| share | 16 | While the instance is busy, one address may have this many requests in flight. A request over its share is refused. |
| rate | 300 | The backstop: requests a second from one address, busy or not. Only a flood reaches it. |
| burst | 1000 | How far over the rate one address can go in a short burst. |

An address is one IPv4 address, or one IPv6 /64.

## Different numbers for one path

An API is usually called harder than a page is browsed. You can give a path prefix, such as `/api/`, its own share, rate and burst. Requests under that prefix count against those numbers only, so heavy API use does not use up a visitor's allowance for pages. An instance can have up to 8 of these.

## Setting them

```sh
carlos ratelimit show -app shop
carlos ratelimit set -app shop -host shop.example.com -rate 500 -burst 2000
carlos ratelimit set -app shop -path /api/:share=32,rate=1000
carlos ratelimit clear -app shop -host shop.example.com
```

Leave out `-host` to change every instance of the app. The box picks up a change within seconds. The four main numbers can also be set on the app's Settings page in the console.

`show` also prints how many requests each instance turned away in the last 24 hours, split into those turned away while busy and those over the backstop. The first is the limit doing its job. If the second shows up on real customers' traffic, the backstop is too low for them.

## Plans

On a deployment with a plan catalog, a plan can set the most an account may raise the share, rate and burst to. See [Plans](plans.md). A self-hosted deployment with no catalog has no such ceiling.

## For operators: turning it on

Each box reads `CARLOS_RATE_LIMIT`:

| Value | What happens |
| --- | --- |
| `observe` (the default) | Count and log what would be refused, but refuse nothing. |
| `enforce` | Refuse. |
| `off` | Do nothing. |

Start in `observe`, read the counts for a few days, then switch to `enforce`, dev boxes first.

Instances on a fleet behind a tunnel are limited on the hub that faces the internet, not on the fleet box.

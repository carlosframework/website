# Enable domain buying

Configure the console to register domains through Openprovider and serve their
DNS from Route 53. Start on dev with an Openprovider sandbox account. Production
needs a membership, a funded registrar balance and working branded nameservers.

## Prepare the registrar and nameservers

Activate your Openprovider membership and fund its prepaid balance before
accepting purchases. A purchase is refused when the balance cannot cover the
registrar's cost. Choose catalog prices and cost ceilings for your membership's
rates. Use the sandbox host from your sandbox account's documentation; set it
through `CARLOS_OPENPROVIDER_URL`. The production API base is
[https://api.openprovider.eu/v1](https://api.openprovider.eu/v1).

Choose a nameserver domain separate from your console and apps domains. The
examples below use `dns.example`, with `ns1` through `ns4` beneath it. Replace
these reserved names with your own domain.

Follow AWS's white-label procedure:

1. Create a reusable delegation set in the AWS account that will own bought
   zones. Save its ID and four assigned nameservers. Create the nameserver
   domain's hosted zone on that set; an existing zone needs recreation.
2. Preserve existing records and delegation details. For bring-up, set NS TTL,
   SOA minimum (the last SOA field), and nameserver address TTLs to 60 seconds
   or less. Allow earlier cached TTLs to expire before switching delegation.
3. Resolve A and AAAA for each assigned server. In the nameserver domain's
   zone, map each of `ns1` through `ns4` to one assigned server's IPv4 and IPv6
   addresses, using eight simple records.
4. Replace the zone's NS values with the four branded names. Change the SOA's
   first field to `ns1.dns.example.` and preserve its other fields.
5. At the nameserver domain's registrar, register all four names with matching
   IPv4 and IPv6 glue. Then delegate that domain to them.
6. Verify answers and monitor traffic. Keep the previous delegation for rollback.
   Once stable, restore NS TTL to `172800`, SOA minimum to `900`, and address
   TTLs to your normal values.

The complete procedure is at
[https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/white-label-name-servers.html](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/white-label-name-servers.html).

For location-based routing, tell large public resolvers that support EDNS Client
Subnet (ECS) about your branded nameservers. ECS supplies the approximate client
location used for routing; white-label names may need recognition by the resolver.
AWS includes this operator step in the procedure above.

## Configure the console

Set all eight variables together. If any is empty or whitespace-only, domain
buying stays off and one startup log line lists the missing variable names.
A malformed `CARLOS_DOMAIN_CATALOG` stays fatal (operator config error, same as
`CARLOS_PLAN_CATALOG`); a registrar or zone-host constructor failure logs one line
and leaves the buy door off. Error messages omit configuration values and
underlying provider errors.

| Variable | Value |
| --- | --- |
| `CARLOS_OPENPROVIDER_URL` | Production API base above, or the sandbox account's documented API base. |
| `CARLOS_OPENPROVIDER_USERNAME` | Username for that Openprovider account. |
| `CARLOS_OPENPROVIDER_PASSWORD` | Its password, supplied only through the console service's protected `EnvironmentFile`. |
| `CARLOS_DOMAIN_DELEGATION_SET_ID` | ID of the reusable delegation set. |
| `CARLOS_DOMAIN_AWS_ACCESS_KEY_ID` | Access key ID for the deployment's dedicated zone-host IAM user. |
| `CARLOS_DOMAIN_AWS_SECRET_ACCESS_KEY` | Its secret access key, supplied only through the console service's protected `EnvironmentFile`. |
| `CARLOS_DOMAIN_NAMESERVERS` | Four distinct comma-separated names, for example `ns1.dns.example,ns2.dns.example,ns3.dns.example,ns4.dns.example`. Spaces around entries are accepted. |
| `CARLOS_DOMAIN_CATALOG` | Absolute path to the catalog JSON file below, readable by the console. |

Keep the registrar password and AWS keys out of command arguments, shell history,
unit-file `Environment=` entries and source control. Store them only in the
console service's `EnvironmentFile`, owned by root with mode `0600`. Restart the
console after changing its environment or catalog.

The console also needs its existing billing provider and plan configuration;
backend settings alone do not enable purchases. See [Plans](/docs/plans).
Create a dedicated IAM user per deployment for the zone host. Give it only this
policy, replacing `<the deployment's set id>` with your reusable delegation set ID:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:CreateHostedZone",
        "route53:ListHostedZones",
        "route53:ListHostedZonesByName",
        "route53:GetChange"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "route53:GetReusableDelegationSet",
      "Resource": "arn:aws:route53:::delegationset/<the deployment's set id>"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:GetHostedZone",
        "route53:DeleteHostedZone",
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/*"
    }
  ]
}
```

Create its access key outside tofu with `aws iam create-access-key`, so the secret
never enters tofu state. Put the returned key ID and secret in
`CARLOS_DOMAIN_AWS_ACCESS_KEY_ID` and `CARLOS_DOMAIN_AWS_SECRET_ACCESS_KEY` in the
console's protected environment file. The zone host uses only these credentials
and never falls back to the box role. Leave `AWS_PROFILE` and `AWS_DEFAULT_PROFILE`
unset for the console; the static loader refuses shared profiles. `AWS_REGION` or
`AWS_DEFAULT_REGION` selects the signing region, defaulting to `us-east-1` when
neither is set.

With a valid `CARLOS_STEERING_ZONE_ID` and `PLATFORM_APPS_DOMAIN`, the console
copies the latency A records and health-check IDs from
`edge.<PLATFORM_APPS_DOMAIN>` in that zone, using the same dedicated credentials.
The policy above includes read access to that zone.
Without a steering hostname, bought zones use the IPv4 addresses in the existing
comma-separated `PLATFORM_EDGE_IPS` setting. Configure working edge addresses
before buying on a deployment without steering.

## Set prices and verify

The catalog may list only TLDs that allow WHOIS privacy. A TLD without it is
unbuyable until removed from the catalog.

Save a catalog such as this at the path in `CARLOS_DOMAIN_CATALOG`. These are
example prices, not a price recommendation:

```json
{
  "version": "2026-11-01",
  "daily_cap": 10,
  "tlds": {
    "com": {
      "register": {"eur": 1800, "gbp": 1500},
      "renew": {"eur": 1900, "gbp": 1600},
      "max_cost": {"currency": "eur", "minor": 1200}
    }
  }
}
```

Keys under `tlds` are offered suffixes without a leading dot. `register` and
`renew` map lowercase three-letter currency codes to positive prices in minor
units for one year: `1800` EUR means €18.00. Both maps are required. `max_cost`
sets a non-negative registrar-cost ceiling in its stated currency; purchases
are refused above it or when the cost currency differs. `daily_cap` limits
purchases per account per UTC day; `0` disables new buying. Use a positive cap
when enabling the feature. Change `version` when you change prices. The loader
rejects unknown fields, invalid entries and trailing JSON. Renewal prices are
required by the catalog format; automatic renewal is outside this buy-only plan.

During nameserver setup, query every assigned Route 53 server's A and AAAA
records and compare them with its branded name. Then query each branded server
directly. Replace the example names before running:

```sh
dig +trace dns.example NS
for ns in ns1.dns.example ns2.dns.example ns3.dns.example ns4.dns.example; do
  dig "$ns" A +short
  dig "$ns" AAAA +short
  dig @"$ns" dns.example NS +norecurse
  dig @"$ns" dns.example SOA +norecurse
done
```

Check the parent's referral and glue in the trace. Each direct answer must be
authoritative (`aa`), name the four branded servers, and have the expected SOA.
After restoring TTLs, inspect full answers to confirm NS `172800` and the SOA's
last field `900`.

After a sandbox purchase has completed, inspect its managed records. Here
`shop.example` stands for the purchased sandbox domain:

```sh
dig +trace shop.example NS
dig @ns1.dns.example shop.example A +norecurse
dig @ns1.dns.example www.shop.example A +norecurse
dig shop.example A
dig www.shop.example A
```

Repeat the direct queries against all four nameservers. The apex should return
a configured edge address and `www` should resolve through its alias. DNS
answers alone cannot prove a Route 53 health-check ID: compare the bought zone's
latency record configuration with the steering zone as well. A sandbox that
does not publish public delegations cannot pass the public trace; record that
limit and verify the authoritative zone directly. Verify public delegation and
HTTPS separately when switching on production.

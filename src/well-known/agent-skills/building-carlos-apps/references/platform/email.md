# 🤖 Sending email

Read only when the app needs to send email.

## Sending email

The platform issues SMTP credentials. An app declares that it sends, the
console provisions an SES identity for a domain, publishes the DNS records
where it controls the zone, and delivers working credentials as config. The
app never holds a cloud key and nobody runs an MTA.

One command does the whole walk — declare, provision the domain, wait for
verification, deliver:

```
carlos email enable --app <app>
```

The identity defaults to the app's **own host**
(`<app>.<sqid>.oncarlos.com`), so the signing domain matches the domain of
the links inside the mail. Credentials arrive as env —
`CARLOS_SMTP_HOST`, `_PORT`, `_USER`, `_PASS`, `_FROM`. Transport is
submission on 587 with STARTTLS. `--env-prefix MAILER` renames the whole set
to `MAILER_HOST`, `MAILER_PORT`, and so on, for an app that already reads
its own names.

For a customer's own domain:

```
carlos email enable --app <app> --domain mail.example.com
```

On the platform domain CARLOS publishes the records itself and verification
is usually seconds. On a custom domain it prints the record set for the
zone's owner to publish, then polls until SES confirms it (`--timeout`,
default 10m; a gave-up wait exits non-zero and names what SES is still
waiting for). `carlos email domains add` is the same provisioning step on
its own, for adding a second sending domain to an app that already sends.

The record set a customer has to publish is always these five, for
`<domain>` and the region the identity was first verified in:

| Name | Type | Value |
|---|---|---|
| `<token>._domainkey.<domain>` × 3 | CNAME | `<token>.dkim.amazonses.com` |
| `mail-<region>.<domain>` | MX | `10 feedback-smtp.<region>.amazonses.com` |
| `mail-<region>.<domain>` | TXT | `v=spf1 include:amazonses.com ~all` |
| `_dmarc.<domain>` | TXT | `v=DMARC1; p=none; adkim=s; aspf=s` (plus `rua=` if the deployment sets one) |

The SPF record sits on the MAIL FROM subdomain rather than the identity
domain because that is the domain SPF is checked against.

**The published DMARC policy is `p=none`**, deliberately: a tenant whose
very first send is rejected by its own DMARC record learns nothing useful
from the failure. There is no `carlos email` verb that changes it. On a
custom domain the zone is the customer's, so they can tighten it themselves
whenever they choose — read the DKIM note below first.

Then:

| Verb | What it does |
|---|---|
| `carlos email status --app <app>` | What is declared, which domains verified, what was delivered |
| `carlos email test --app <app> --to me@example.com` | Sends a REAL message through a throwaway credential, then revokes it |
| `carlos email credentials create\|list\|revoke` | Standalone credentials for something not running on CARLOS; the password is shown **once** |
| `carlos email rotate --app <app> [--finish]` | Two-phase key rotation — new key delivered, then the old one retired |

### Three things that will bite

- **A freshly minted credential does not work for the first minute or
  two.** SES's SMTP endpoint does not see a new IAM access key
  immediately, and the symptom is `535 Authentication Credentials Invalid`
  — which reads exactly like a wrong password and is not one. Wait and
  retry. An app's first sends straight after `enable` hit this too, so do
  not diagnose a broken credential from the first minute of logs.
  **A 535 that outlasts a few minutes is a different problem** and is worth
  treating as real: check the key is still `Active` and not paused
  (`carlos email status`), and that the password was derived for the same
  region as the SMTP host — the derivation is region-scoped, so a
  credential minted for one region never authenticates against another's
  endpoint.
- **DMARC alignment rests on DKIM alone.** Records are published with
  `adkim=s; aspf=s`, and that strictness is what stops one tenant's
  signature authenticating another tenant's From address on a shared
  domain. SPF authenticates but does **not** align: the envelope sender is
  a region-qualified subdomain (`mail-<region>.<domain>`), which strict
  alignment treats as a different domain. DMARC therefore passes on the
  DKIM rail only. That is normal for SES — but it means DKIM is the single
  rail, so never turn off DKIM signing on a sending identity. If a customer
  tightens their own zone to `p=reject`, that is safe but unforgiving: a
  DKIM CNAME later dropped from their zone stops being a downgrade and
  becomes total delivery failure.
- **The MAIL FROM subdomain carries its region forever.** It is fixed at
  the first verification (`mail-eu-west-1.<domain>`). On a custom domain
  that record lives in the customer's zone — the one record CARLOS cannot
  republish for them — so moving regions later means going back to the
  customer for a DNS change.

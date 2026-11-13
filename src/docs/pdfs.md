# PDFs

Your app can turn an HTML invoice into a PDF with one request. The platform
runs Gotenberg for you. You can also convert Office documents, merge PDFs
and use the other routes listed below.

## Creating a credential

Create a Service credential for your app and save the returned secret:

```sh
carlos services create --role service --app shop pdf
carlos secrets set --app shop CARLOS_SERVICE_TOKEN=<secret>
```

Replace `<secret>` with the secret from the first command. Your app reads it
from `CARLOS_SERVICE_TOKEN`. If your app already has a Service credential
for scanning, you can use that one.

The credential must belong to the account in the URL and cover your app.
An app-bound credential reaches only that app. An account-wide Service
credential can reach the account's apps.

## Rendering an invoice

Have your app render the invoice as HTML and save it as `index.html`.
For a page behind a login, send the HTML rather than its URL.

The endpoint is:

```http
POST /api/cli/apps/{account}/{app}/pdf/forms/chromium/convert/html
Authorization: Bearer <service token>
```

For `shop`, with your console at [https://example.com](https://example.com),
run this where `CARLOS_SERVICE_TOKEN` holds the secret. Replace `{account}`
with your account ID:

```sh
curl --fail-with-body \
  --header "Authorization: Bearer $CARLOS_SERVICE_TOKEN" \
  --form 'files=@index.html' \
  --output invoice.pdf \
  'https://example.com/api/cli/apps/{account}/shop/pdf/forms/chromium/convert/html'
```

`files` is Gotenberg's multipart form field. Keep the HTML filename
`index.html`. You can add images and stylesheets as more `files` fields.
Public URLs can supply fonts, images and stylesheets. The engine cannot
fetch private addresses or cloud instance metadata.

Your app receives the PDF in the response body. Gotenberg's status code,
`Content-Type`, `Content-Disposition` and `Gotenberg-Trace` pass through.
Check the status before serving the file to a customer.

## Attaching the PDF to an email

Attach `invoice.pdf` with your app's mail library and send it through the
SMTP credentials delivered to your app. See [the email docs](/docs/cli#carlos-email)
for setup. Your app builds the message and its attachments.

## Using a Gotenberg client

Set your client's base URL to
[https://example.com/api/cli/apps/{account}/shop/pdf](https://example.com/api/cli/apps/{account}/shop/pdf),
using your console origin and account ID. Set this header on each request:

```http
Authorization: Bearer <service token>
```

Keep the client's Gotenberg routes and form fields. For example, appending
`/forms/chromium/convert/html` to that base reaches the invoice endpoint.
Your app can use the console origin you configured.

`Gotenberg-Output-Filename` and `Gotenberg-Trace` request headers pass
through. Webhook headers are refused. Other `Gotenberg-*` request headers
are stripped. Rendering is synchronous: your app waits for the response.

## Routes

Each route below accepts `POST` under `/api/cli/apps/{account}/{app}/pdf/`:

```text
forms/chromium/convert/html
forms/chromium/convert/url
forms/chromium/convert/markdown
forms/chromium/screenshot/html
forms/chromium/screenshot/url
forms/chromium/screenshot/markdown
forms/libreoffice/convert
forms/pdfengines/merge
forms/pdfengines/split
forms/pdfengines/flatten
forms/pdfengines/convert
forms/pdfengines/metadata/read
forms/pdfengines/metadata/write
forms/pdfengines/encrypt
forms/pdfengines/embed
```

URL rendering works for public pages. `downloadFrom` form fields are also
allowed. The same private-address restrictions apply to both.

Other routes return `404`. Your app cannot use this endpoint to reach the
engine's `/health`, `/version`, `/prometheus/metrics` or `/debug` routes.

## Limits

Fair-use limits apply on every deployment. If your deployment has a plan
catalog, your account's monthly PDF allowance also applies. Your apps share
the account limits.

The fair-use defaults are:

- Up to 4 requests running at once per account.
- 60 requests a minute per account, with a burst of 20.
- Up to 16 requests running at once across the deployment.

Your operator can change these defaults. When a rate or concurrency limit
refuses a request, wait for the number of seconds in `Retry-After` before
retrying. The default concurrency wait is 2 seconds.

The request body can be at most 32 MiB. A response over 64 MiB is cut off,
so do not use a partial file. The console waits up to 60 seconds for the
engine's response headers. A stalled transfer can also be cut off.

One completed request with a `2xx` engine response counts toward your
monthly allowance. Engine errors, console refusals and aborted transfers
do not count. At twice your allowance, new requests are refused until the
1st of the UTC month or until you move to a larger plan. See [Plans](/docs/plans).
With no plan catalog, only fair-use limits apply.

These are the PDF refusal messages. `%d` stands for a count filled in by
the console. In the monthly refusal, the counts are your usage and your
monthly limit, in that order.

| Status | Message |
| --- | --- |
| `400` | `webhooks are not available here. send the PDF request without a webhook header` |
| `402` | `this account has rendered %d PDFs this month, twice its monthly limit of %d. rendering starts again on the 1st of the UTC month, or move to a larger plan` |
| `404` | `that is not a PDF route. the PDFs docs page lists the routes this door carries` |
| `413` | `the request is over 32 MiB. send a smaller request` |
| `429` | `this account already has %d PDFs rendering. wait for one to finish and try again` |
| `429` | `this account has asked for more than %d PDFs in a minute. try again in a moment` |
| `502` | `the PDF engine did not answer. try again shortly` |
| `502` | `could not check this account's plan. Try again` |
| `503` | `no PDF engine is configured for this deployment (CARLOS_PDF_ADDR)` |
| `503` | `the PDF engine is busy. try again in a few seconds` |
| `504` | `the PDF engine took more than 60 seconds and was stopped. try again` |

If no engine is configured, your operator needs to configure one before
your app can render PDFs. Gotenberg can also return its own errors for the
files or form fields you send.

# 🤖 PDFs

Read only when an app has to produce a PDF, convert an Office document, or
merge, split or fill PDFs.

First decide whether you need a service at all. A simple document
(headings, paragraphs, tables, an invoice laid out in Go) can be written
by Rastrillo's own `pdf` package with the standard library alone and no
service (`docs/site/reference/pdf.md` in the installed module). Reach for
the platform's service when the PDF should look like an HTML page the
app already renders, or when the input is an Office document.

## The platform's PDF service

A deployment whose operator has configured a PDF engine runs Gotenberg
for its apps; without one, the endpoint answers `503` (no engine
configured). An app calls it with a `service`-role credential that
covers the app:

```sh
carlos services create --role service --app shop pdf
carlos secrets set --app shop CARLOS_SERVICE_TOKEN=<secret>
```

An app that already holds a service credential for store scanning can
use that one. Then the app posts to its console:

```http
POST <console>/api/cli/apps/{account}/{app}/pdf/forms/chromium/convert/html
Authorization: Bearer <service token>
```

with Gotenberg's multipart form: the page as a `files` field named
`index.html`, plus any images and stylesheets as more `files` fields. The
PDF comes back in the response body; check the status before serving it.
Any Gotenberg client works with its base URL set to
`<console>/api/cli/apps/{account}/{app}/pdf`. For a page behind sign-in,
send the HTML, not its URL. The engine fetches public URLs only, never
private addresses or cloud metadata.

Supported: Chromium HTML, URL and Markdown conversion and screenshots,
LibreOffice conversion, and the PDF engine routes (merge, split, flatten,
convert, metadata, encrypt, embed). Webhooks are refused, and rendering is
synchronous.

## Limits

Fair-use limits apply on every deployment: a few requests at once per
account, a per-minute rate, a 32 MiB request body, a 64 MiB response and a
60-second wait for the engine. A refusal carries `Retry-After`; wait that
long. Where the deployment runs plans, the account also has a monthly PDF
allowance its apps share (concepts.md, "Plans and limits"). Read the
numbers from the deployment's own docs rather than promising them.

To mail the PDF, attach it in the app's own mail code and send through the
SMTP credentials `carlos email enable` delivers ([email](email.md)).

Source: platform `docs/site/pdfs.md` and `docs/site/plans.md` at v0.34.1;
Rastrillo `docs/site/reference/pdf.md`.

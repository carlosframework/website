# 🤖 Visitor location

Read only when the app needs visitor location.

## Visitor location headers

On a deployment that publishes a GeoIP database (since v0.25.1),
every request the edge passes to an app carries the visitor's rough
location: `X-Carlos-Geo-Country` (ISO 3166-1, `IE`),
`X-Carlos-Geo-Subdivision` (ISO 3166-2, only some databases),
`X-Carlos-Geo-Lat` / `-Lon` (two decimals: an area, not a position) and
`X-Carlos-Geo-Source` (which database answered). Any of them can be
missing: treat that as unknown, never as an error. The edge strips any a
visitor sends, so the values are always the platform's. A cached page
that differs by country sends `Vary: X-Carlos-Geo-Country`; never vary on
the coordinates.

**An app that shows a visitor anything worked out from these headers
must credit the database `X-Carlos-Geo-Source` names** — `DBIP-…`:
"IP Geolocation by DB-IP", linked to https://db-ip.com; `GeoLite2-…`:
"This product includes GeoLite2 data created by MaxMind, available from
https://www.maxmind.com". For an address that is not the current
request (a log line, a webhook), `carlos geo <address> --app <a>`, or
from an app `GET /api/cli/apps/<account>/<app>/geo?ip=<address>`, at
most 60 a minute. That call needs an `instance`-role token, which is
app-wide (it can also create, repoint and delete every sibling
instance), so make it only from a central app that already holds one;
never deliver that token to a tenant app's instances just to look up an
address. Tenant instances use the request headers.

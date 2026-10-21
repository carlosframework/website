# Receiving scan results

Your app accepted an upload and needs to know whether the file is safe before
it serves it. Two endpoints answer that, and a callback can save you the poll.

This assumes your app's store already has virus scanning granted. If it does
not, see `carlos store scan` in [the CLI page](/docs/cli#carlos-store-scan).

## Asking for a scan

Both endpoints take a Service-role credential and reach only your own app.

```http
POST /api/cli/apps/{account}/{app}/store/scan/object
{"key": "uploads/x.pdf", "callback_path": "/hooks/scan"}
```

`callback_path` is optional. You get back `202` and `{"state":"pending"}`. The
scan is queued, so there is no verdict in that response.

```http
GET /api/cli/apps/{account}/{app}/store/scan/object?key=uploads/x.pdf&wait=15s
```

This reads what is known about one object. `wait` long-polls: the request holds
open until the state changes or `wait` elapses, capped at 30 seconds. Ask for
longer and you get 30 seconds. Leave `wait` off and you get an immediate answer.

## The states

```text
{"state":"clean"}
{"state":"infected"}
{"state":"skipped"}
{"state":"failed"}
{"state":"denied"}
{"state":"pending"}
{"state":"gone"}
{"state":"unavailable","reason":"...","error":"..."}
```

Only `clean` and `infected` are verdicts on the contents. The rest mean
something else:

- `skipped`: the scanner did not judge the object’s contents, for example because the object exceeds the scan size limit.
- `failed`: the engine read the file and could not reach a verdict.
- `denied`: the console could not read the object.
- `pending`: no answer yet. Ask again, or wait longer.
- `gone`: there is no object at this key.
- `unavailable`: scanning is not available for this store right now. `reason`
  is one of `not_granted`, `not_requested`, `encrypted`, `not_enabled`,
  `disabled`, `no_engine`, `callbacks_not_configured`. `error` is a sentence
  for whoever reads the log.

If your app treats `skipped` or `gone` as safe to serve, it is claiming
coverage it does not have.

## Callbacks take a path

`callback_path` is a path on your app's ready, platform-assigned host. This is usually `<app>.<account>.<apps-domain>`, but an app may already have a different platform-assigned host. The console uses that route; it does not send callbacks to a custom domain.

The rules are checked when you enqueue, so a bad value comes back as a `400`
and is never stored: one leading slash, no `//`, no backslash, no `#`, no `..`
segment, no `;`, no `@`, printable ASCII only, and 1KB at most. A query string
is fine and is preserved.

A request with `callback_path` is refused with HTTP 409 when the app has no ready platform host. Omit `callback_path` and poll scan status, or wait for a ready host and retry.

## Verifying the signature

Every callback carries a header:

```http
Carlos-Signature: t=1800000000,v1=ccd4f98ffb69f5dd:1c24c96520fc34a1...
```

`t` is the send time in unix seconds. Each `v1=` field is
`<key-id>:<hex-mac>`, and there can be two of them during a key rotation, one
under the old key and one under the new. Verify against each and accept the
callback if any checks out. Ignore key ids you do not recognise, and ignore
fields you do not recognise, because the platform may add more later and your
verifier should survive that.

The MAC is HMAC-SHA256 over `t`, then a literal `.`, then the raw request body.
Verify the bytes as they arrived. If you parse the JSON and re-serialise it
first you get a different byte string, and a genuine callback will not verify.
Compare in constant time, and reject the callback if `t` is more than five
minutes from your own clock in either direction.

### The hex trap

This one is boring but read it before you write the verifier.

Your app receives its callback secret in an environment variable named
`<YOUR_PREFIX>_SCAN_CALLBACK_SECRET`. That value is hex-encoded text. The
signing key is the 32 raw bytes it decodes to, not the string itself.

Hand the environment variable straight to your HMAC function and every callback
fails to verify, which looks exactly like a platform fault. It is usually this
one line:

```python
key = bytes.fromhex(secret_env_var)   # not secret_env_var.encode()
```

### Go

```go
func verify(secretHex string, header string, body []byte) error {
    key, err := hex.DecodeString(secretHex)
    if err != nil {
        return fmt.Errorf("callback secret is not valid hex: %w", err)
    }

    var timestamp string
    var macs [][]byte
    for _, field := range strings.Split(header, ",") {
        switch {
        case strings.HasPrefix(field, "t="):
            timestamp = field[2:]
        case strings.HasPrefix(field, "v1="):
            parts := strings.SplitN(field[3:], ":", 2)
            if len(parts) != 2 {
                continue
            }
            mac, err := hex.DecodeString(parts[1])
            if err == nil {
                macs = append(macs, mac)
            }
        }
    }
    if timestamp == "" || len(macs) == 0 {
        return errors.New("missing t or v1")
    }

    unix, err := strconv.ParseInt(timestamp, 10, 64)
    if err != nil {
        return errors.New("bad timestamp")
    }
    if age := time.Since(time.Unix(unix, 0)); age < -5*time.Minute || age > 5*time.Minute {
        return errors.New("timestamp outside five-minute window")
    }

    h := hmac.New(sha256.New, key)
    h.Write([]byte(timestamp))
    h.Write([]byte{'.'})
    h.Write(body)
    want := h.Sum(nil)

    for _, got := range macs {
        if hmac.Equal(got, want) {
            return nil
        }
    }
    return errors.New("signature does not verify")
}
```

### Python

```python
import hashlib
import hmac
import time

def verify(secret_hex: str, header: str, body: bytes) -> bool:
    key = bytes.fromhex(secret_hex)  # the hex trap: decode before using

    timestamp = None
    macs = []
    for field in header.split(","):
        if field.startswith("t="):
            timestamp = field[2:]
        elif field.startswith("v1="):
            _, _, mac_hex = field.partition(":")
            try:
                macs.append(bytes.fromhex(mac_hex))
            except ValueError:
                continue

    if timestamp is None or not macs:
        return False
    if abs(time.time() - int(timestamp)) > 300:
        return False

    want = hmac.new(key, timestamp.encode() + b"." + body, hashlib.sha256).digest()
    return any(hmac.compare_digest(mac, want) for mac in macs)
```

In both examples, `body` is the raw bytes read off the request before any JSON
parsing touches them.

## The callback body

```json
{"account":"bab","app":"titogo","key":"uploads/x.pdf","etag":"...",
 "verdict":"clean","recorded":true,"engine":"clamav","signature":"..."}
```

Match a callback to your own upload on `etag`, the bare ETag your `PUT`
returned, and not on the key alone: the same key can be overwritten. There is
no version token in the body. The platform's internal version format is not
something your app should compare against, and getting that comparison wrong is
a security bug.

### Provenance

`signature` is the scanner's signature-database version. It is separate from the request signature in the `Carlos-Signature` header. `engine` and `signature` can be empty when a verdict came from an existing object tag: the platform does not know which engine database produced it.

Watch `recorded`. When it is `false` the verdict could not be written onto the
object itself, so an `infected` object with `recorded: false` is not covered by
the platform's enforcement deny. Nothing is blocking reads of that file. Your
app decides what to do about it.

## Delivery

Callback delivery is best effort. A restart or a full delivery queue can lose a notification, and retries can produce duplicates. Make your handler idempotent on `(account, app, key, etag, verdict)`. If no callback arrives within your timeout, poll the `GET` endpoint.

`GET` can answer `pending`. A verdict that could not be tagged onto the object is kept separately and expires, so polling does not guarantee a retained answer indefinitely.

The console POSTs with `Content-Type: application/json`, and any `2xx` counts
as delivered. A redirect is a refusal and is not retried, so answer at
`/hooks/scan` directly instead of redirecting to `/hooks/scan/`. A `4xx` is not
retried either. A `5xx`, a `429` or a timeout is retried three times, at 1
second, 4 seconds and 16 seconds. The console reads at most 4KB of your
response and ignores it.

## Rate limits

Both endpoints share your app's write budget, about 120 requests a minute. A
long-poll `GET` costs two of those a minute for as long as it is open. Polling
in a tight loop with no `wait` will meet the limit, so use `wait` and keep
polling as the backstop.

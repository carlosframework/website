# High availability

High availability runs your app on one server at a time, with a second server in the same region ready to take it over.

You choose it when you create the app. Tick **High availability** on Create an app, or add `--ha`:

```sh
carlos apps create --app hello --region us --ha
```

Then deploy as usual.

It is only for accounts that have it, and only in regions that offer it. On Carloku that is US today. If your account doesn't have it, you won't see the checkbox and the CLI refuses `--ha`. `--ha` needs `--region`.

An existing app can't be switched to high availability yet, so create a new app. Once it is on, the app's region can't be changed, and deploys swap one instance at a time. The app's database is copied to storage continuously, as writes happen.

## Releases and maintenance

During a release or server maintenance, most requests wait a few seconds and then succeed. Some get a `503` with `Retry-After: 10` during those seconds:

- requests with a body over 64 KiB, or of unknown length
- requests another server already forwarded, which includes most requests from another region
- tunnel requests
- requests that arrive after the server starts closing connections

Keep-alive connections close and event streams reconnect. WebSockets open for more than 60 seconds close. Always-on workers pause for a few minutes.

## When something fails

| What fails | What happens |
| --- | --- |
| A server fails without warning | Requests get `503` with `Retry-After` until another server takes over, which can take up to 15 minutes. Writes from about the last second can be lost. |
| A server loses its connection to storage while the app is writing | About 30 seconds after its writes stop reaching storage, the app refuses new requests with `503` and `Retry-After: 10`, then stops. Up to about a minute of writes can be lost: those from the 30 seconds or so before it stopped, and those of requests that were still running. The app comes back by itself about 15 minutes after storage returns. |
| A server loses its connection to storage while the app is idle | Nothing is lost. The app keeps answering until the server can no longer confirm it is the one running the app, within about 5 minutes, then answers `503` with `Retry-After`. The app comes back by itself about 15 minutes after storage returns. |
| Storage is unreachable for less than 30 seconds | Nothing changes and nothing is lost. |
| The whole region fails | Not covered. |

If storage never comes back to a server, an operator replaces that server.

The [CLI reference](/docs/cli#carlos-apps) has the details of `carlos apps create`.

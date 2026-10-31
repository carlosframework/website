# 🤖 Scheduled work

Read only when work must run on a schedule or at a specific future time.

## Scheduled work

The platform keeps the clock. A hibernating instance cannot run an
in-process timer, so recurring work is declared from outside the app and
delivered as a **tick**: a `POST` to a path you declared, at the time it
is due, waking the instance first and holding it awake while your handler
runs. Nothing else crosses the boundary — no payload, no job state, no
queue. Live 2026-08-24.

Declare it with the CLI, not in code:

```
carlos schedule set --app <app> --name sync      --every 6h         --path /jobs/sync
carlos schedule set --app <app> --name reminders --cron "0 8 * * *" --path /jobs/reminders
```

`--every` is a Go duration, whole minutes, 1m to 30d. `--cron` is five UTC
fields (`min hour dom month dow`, with `*`, `n`, `a-b`, `*/n`, `a,b`) —
no names, no `@daily`, no seconds. Names are
`^[a-z0-9][a-z0-9-]{0,31}$`, at most 20 per app. `carlos schedule ls`
prints the declaration and then what each instance reports (`next`,
`last`, `last_status`); `run` requests an out-of-band fire on top of the
normal rhythm; `rm` removes the declaration. The verbs say **recorded**
and **requested**, never "fired": they write one console object, and each
box acts on it within seconds.

The app's whole part is a handler on that path:

```go
// POST /jobs/sync
func handleSync(w http.ResponseWriter, r *http.Request) {
	if !carlos.Tick(r) {           // amadan.net/rastrillo/rastrillo/carlos
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	if occ, ok := carlos.TickOccurrence(r); ok && alreadyDone(occ) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err := syncer.RunOnce(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError) // 5xx = retry
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

`carlos.Tick` is the constant-time compare of the bearer against
`$CARLOS_ADMIN_TOKEN`, which the platform mints into the instance's
environment; use it rather than hand-rolling the check. A tick arrives on
an ordinary public route, so a tick nobody authenticated is an internet
request to that path — and the `X-Carlos-*` headers are not evidence,
anyone can set those. The status is your whole reply: **2xx** done,
**5xx** retry with backoff (five attempts, 1m doubling to 15m, then the
schedule advances), **4xx** don't bother.

One-shots are the app's own call, over the control socket the agent binds
before your process starts:

```go
err := carlos.ScheduleAt(ctx, "remind-"+id, when, "/jobs/remind")  // carlos.ScheduleCancel drops it
```

Same tick, same handler, same name namespace as declared schedules (a
collision returns `ErrDeclaredSchedule`). Up to 400 days ahead, 1000
pending per host. Reach for one only when the work genuinely has a
specific time; a daily schedule whose handler asks its own database
"what falls today?" beats one timer per row.

### Things that bite

- **Do the work inside the request.** The instance is held awake for
  exactly as long as the request is open (30-minute ceiling) and the idle
  clock starts the moment you return. Reply 202 and finish in a goroutine
  and that goroutine gets hibernated mid-job.
- **Dedupe on `X-Carlos-Schedule-At`** — unix seconds, read it with
  `carlos.TickOccurrence`. It is the instant the delivery is *for*, so
  every retry of one failed occurrence carries the same value, as does a
  redelivery after a box crash or a deploy that cut a long job. Never key
  on the wall clock: a retry twenty minutes later is the same occurrence.
  Keep `Tick` as the guard — a request with no occurrence header means
  "no dedupe key, run it", which is what your own "Sync now" button looks
  like.
- **A 4xx is never retried.** A path with no handler, or a handler that
  refuses a token it cannot see, records `app refused` and the schedule
  advances to its next occurrence. That failure is quiet — `next` still
  moves, so `ls` reads like a success. Check `last_status`.
- **An instance running since before the platform roll refuses its own
  ticks.** The token is minted at spawn, so a process older than the roll
  has no `$CARLOS_ADMIN_TOKEN`, `Tick` is always false, and
  `carlos.ScheduleAt` returns `ErrUnauthorized`. `carlos restart` clears
  it; nothing else does.
- **A schedule tighter than the idle window keeps the instance resident,
  and residency is billed.** Since 2026-08-31 a tick no longer stamps
  activity, but the sweeper deliberately will not put a host to sleep
  when its next tick is due sooner than the idle window (15 minutes by
  default) — staying awake is genuinely cheaper than a wake/sleep cycle
  per tick, each of which is a full SQLite checkpoint-and-restore. So a
  5-minute schedule against a 15-minute window never sleeps and accrues
  instance-hours around the clock; an hourly one sleeps about three
  quarters of each hour. `carlos schedule ls` and `set` now say so in one
  line rather than leaving it to be found on a bill. The platform warns
  and never refuses: a tight schedule is a legitimate thing to want.
- **Unit-backed instances are not delivered to** in this release — `ls`
  says `unsupported` against them. Exec-backed instances (the default)
  and sidecars work.
- **Once-timers outlive the process.** They live in the box registry, so
  a restart loses none, and re-asserting them at boot is safe because a
  repeated name replaces rather than adds. Off-platform there is no
  control socket at all: `ScheduleAt` returns `ErrNotOnCarlos`, which
  boot code should treat as "skip", not as a failure.

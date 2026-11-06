#!/bin/sh
# 🤖 Serve the docs site mockup to the tailnet for review, and stop it.
# Binds to this machine's Tailscale address only, never 0.0.0.0.
# Usage: mockups/docs-site/serve.sh start|stop
set -eu
root=$(cd "$(dirname "$0")/../.." && pwd)
state="${TMPDIR:-$HOME/.cache}/docs-mockup"
pidfile="$state/server.pid"
# Fixed on purpose: this is a shared machine, and the review server must
# never bind any other interface (no override, see the plan's constraints).
addr="100.119.180.57"
case "$addr" in 100.*) ;; *) echo "refusing to bind $addr: not a Tailscale address" >&2; exit 2 ;; esac
host="${MOCKUP_HOST:-docs-t1.tail5fd3ba.ts.net}"
case "${1:-}" in
start)
  mkdir -p "$state"
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "already running: $(cat "$state/url")"; exit 0
  fi
  port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("'"$addr"'",0)); print(s.getsockname()[1]); s.close()')
  cd "$root"
  nohup python3 -m http.server "$port" --bind "$addr" >"$state/server.log" 2>&1 &
  echo $! >"$pidfile"
  echo "http://$host:$port/mockups/docs-site/" | tee "$state/url"
  ;;
stop)
  if [ -f "$pidfile" ]; then kill "$(cat "$pidfile")" 2>/dev/null || true; rm -f "$pidfile" "$state/url"; echo stopped; else echo "not running"; fi
  ;;
*) echo "usage: $0 start|stop" >&2; exit 2 ;;
esac

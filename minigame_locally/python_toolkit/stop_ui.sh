#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="$REPO_ROOT/.local/python_toolkit_ui"
PID_FILE="$STATE_DIR/ui.pid"
PORT_FILE="$STATE_DIR/ui.port"

if [ ! -f "$PID_FILE" ]; then
  echo "No tracked Python UI process."
  exit 0
fi

UI_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
UI_PORT="$(cat "$PORT_FILE" 2>/dev/null || true)"

if [ -n "${UI_PID:-}" ] && kill -0 "$UI_PID" >/dev/null 2>&1; then
  kill "$UI_PID" >/dev/null 2>&1 || true
  sleep 0.3
  if kill -0 "$UI_PID" >/dev/null 2>&1; then
    kill -9 "$UI_PID" >/dev/null 2>&1 || true
  fi
  echo "Stopped Feed the Bear Python UI."
  echo "pid=$UI_PID"
  if [ -n "${UI_PORT:-}" ]; then
    echo "port=$UI_PORT"
  fi
else
  echo "Tracked UI process is not running."
fi

rm -f "$PID_FILE" "$PORT_FILE"

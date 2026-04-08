#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOST="${FTB_UI_HOST:-127.0.0.1}"
PORTS=("$@")
BACKGROUND=0
OPEN_BROWSER=0

FILTERED_PORTS=()
for arg in "$@"; do
  case "$arg" in
    --background) BACKGROUND=1 ;;
    --open) OPEN_BROWSER=1 ;;
    *) FILTERED_PORTS+=("$arg") ;;
  esac
done
PORTS=("${FILTERED_PORTS[@]}")

if [ "${#PORTS[@]}" -eq 0 ]; then
  PORTS=(8765 8766 8770 8785 8791 8792 8793 8794 8795 8800)
fi

STATE_DIR="$REPO_ROOT/.local/python_toolkit_ui"
PID_FILE="$STATE_DIR/ui.pid"
PORT_FILE="$STATE_DIR/ui.port"
LOG_FILE="$STATE_DIR/ui.log"
mkdir -p "$STATE_DIR"

is_listening() {
  local port="$1"
  nc -z "$HOST" "$port" >/dev/null 2>&1
}

if [ -f "$PID_FILE" ] && [ -f "$PORT_FILE" ]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  EXISTING_PORT="$(cat "$PORT_FILE" 2>/dev/null || true)"
  if [ -n "${EXISTING_PID:-}" ] && [ -n "${EXISTING_PORT:-}" ] && kill -0 "$EXISTING_PID" >/dev/null 2>&1 && is_listening "$EXISTING_PORT"; then
    echo "Feed the Bear Python UI already running."
    echo "pid=$EXISTING_PID"
    echo "url=http://$HOST:$EXISTING_PORT"
    exit 0
  fi
fi

CHOSEN_PORT=""
for port in "${PORTS[@]}"; do
  if ! is_listening "$port"; then
    CHOSEN_PORT="$port"
    break
  fi
done

if [ -z "$CHOSEN_PORT" ]; then
  echo "No free port found in: ${PORTS[*]}" >&2
  exit 1
fi

cd "$SCRIPT_DIR"

if [ "$BACKGROUND" -eq 1 ]; then
  command nohup /usr/bin/env python3 run_cli.py serve-ui --host "$HOST" --port "$CHOSEN_PORT" >"$LOG_FILE" 2>&1 &
  UI_PID=$!
  echo "$UI_PID" > "$PID_FILE"
  echo "$CHOSEN_PORT" > "$PORT_FILE"

  READY=0
  for _ in {1..50}; do
    if is_listening "$CHOSEN_PORT"; then
      READY=1
      break
    fi
    sleep 0.1
  done

  if [ "$READY" -ne 1 ]; then
    echo "UI process started but port did not become ready." >&2
    echo "pid=$UI_PID" >&2
    echo "log=$LOG_FILE" >&2
    exit 1
  fi

  echo "Feed the Bear Python UI started."
  echo "pid=$UI_PID"
  echo "url=http://$HOST:$CHOSEN_PORT"
  echo "log=$LOG_FILE"
  exit 0
fi

echo "Feed the Bear Python UI"
echo "url=http://$HOST:$CHOSEN_PORT"
echo "Press Ctrl+C to stop."
if [ "$OPEN_BROWSER" -eq 1 ]; then
  (sleep 1; open "http://$HOST:$CHOSEN_PORT" >/dev/null 2>&1 || true) &
fi
exec /usr/bin/env python3 run_cli.py serve-ui --host "$HOST" --port "$CHOSEN_PORT"

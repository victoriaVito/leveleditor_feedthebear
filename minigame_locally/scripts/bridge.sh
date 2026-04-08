#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GUI_SCRIPT="$ROOT_DIR/scripts/bear_reporting_sync_gui.py"
SERVER_URL="${BRIDGE_SERVER_URL:-http://127.0.0.1:8080/?view=editor}"
AUTO_OPEN_BROWSER="${BRIDGE_OPEN_BROWSER:-1}"

if [[ ! -f "$GUI_SCRIPT" ]]; then
  echo "Bridge GUI not found: $GUI_SCRIPT" >&2
  exit 1
fi

if [[ "$AUTO_OPEN_BROWSER" == "1" ]]; then
  open "$SERVER_URL" >/dev/null 2>&1 || true
fi

exec python3 "$GUI_SCRIPT"

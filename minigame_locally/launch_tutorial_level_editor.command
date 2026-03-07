#!/bin/zsh
set -euo pipefail

ROOT="/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally"
WEB_DIR="$ROOT/level_toolkit_web"
URL="http://127.0.0.1:8080/?autoload=tutorial&play=1"
LOG_DIR="$ROOT/artifacts"
PID_FILE="$LOG_DIR/tutorial_server.pid"
SERVER_LOG="$LOG_DIR/tutorial_server.log"

mkdir -p "$LOG_DIR"

if ! curl -fsS "http://127.0.0.1:8080/" >/dev/null 2>&1; then
  cd "$WEB_DIR"
  nohup python3 -m http.server 8080 >"$SERVER_LOG" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1
fi

open "$URL"

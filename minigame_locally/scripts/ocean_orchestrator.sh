#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/.pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

MODELS_DEFAULT="gemini-2.5-flash,gpt-4o-mini,claude-haiku-3-5-20241022"
MODELS="${ORCH_MODELS:-${SHIP_TODAY_MODELS:-$MODELS_DEFAULT}}"
PROMPT_DEFAULT="You are part of a same-day delivery squad for Feed the Bear Python UI v4. Return exactly 6 concise bullets: highest impact tasks, strict order, risks, acceptance checks, cut line, and next command."
PROMPT="${ORCH_PROMPT:-${SHIP_TODAY_PROMPT:-$PROMPT_DEFAULT}}"

SERVICE_NAMES=(webhook router paraclau learning docs)
SERVICE_PORT_webhook=3000
SERVICE_PORT_router=3001
SERVICE_CMD_webhook="env -u npm_config_prefix node scripts/zapier-webhook-receiver.mjs"
SERVICE_CMD_router="env -u npm_config_prefix node scripts/task-router-server.mjs"
SERVICE_CMD_paraclau="env -u npm_config_prefix node scripts/paraclau-watcher-zapier.js"
SERVICE_CMD_learning="env -u npm_config_prefix node scripts/learning-batch-processor.mjs"
SERVICE_CMD_docs="env -u npm_config_prefix node scripts/doc-publisher-zapier.mjs"

info() { printf "[INFO] %s\n" "$*"; }
warn() { printf "[WARN] %s\n" "$*"; }
err() { printf "[ERROR] %s\n" "$*" >&2; }

pid_file() { echo "$PID_DIR/ocean_$1.pid"; }
log_file() { echo "$LOG_DIR/ocean_$1.log"; }

is_running() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  local pid
  pid="$(cat "$f")"
  kill -0 "$pid" 2>/dev/null
}

ensure_deps() {
  if [[ -d node_modules ]]; then
    info "node_modules already present"
  else
    info "Installing npm dependencies"
    npm install
  fi
}

validate_env() {
  info "Validating env profile: full"
  if npm run -s validate:env:full; then
    info "Full env validation OK"
  else
    warn "Full env failed; falling back to local"
    npm run -s validate:env:local
  fi
}

start_one() {
  local name="$1"
  local pidf
  pidf="$(pid_file "$name")"
  local logf
  logf="$(log_file "$name")"
  local cmd_var="SERVICE_CMD_$name"
  local cmd="${!cmd_var}"

  if is_running "$pidf"; then
    info "$name already running (PID $(cat "$pidf"))"
    return 0
  fi

  info "Starting $name"
  nohup bash -lc "$cmd" >> "$logf" 2>&1 &
  local pid=$!
  echo "$pid" > "$pidf"
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    info "$name started (PID $pid)"
  else
    err "$name failed to start. Log: $logf"
    return 1
  fi
}

stop_one() {
  local name="$1"
  local pidf
  pidf="$(pid_file "$name")"
  if ! [[ -f "$pidf" ]]; then
    info "$name not running"
    return 0
  fi
  local pid
  pid="$(cat "$pidf")"
  if kill -0 "$pid" 2>/dev/null; then
    info "Stopping $name (PID $pid)"
    kill "$pid" || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      warn "$name force stop"
      kill -9 "$pid" || true
    fi
  fi
  rm -f "$pidf"
}

healthcheck() {
  local code=0
  for name in webhook router; do
    local port_var="SERVICE_PORT_$name"
    local port="${!port_var}"
    if curl -fsS "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
      info "$name health OK ($port)"
    else
      warn "$name health NOT READY ($port)"
      code=1
    fi
  done
  return "$code"
}

sync_round() {
  local sync_log="$LOG_DIR/ocean_sync_apis.log"
  info "Running model sync"
  info "Models: $MODELS"
  IFS=',' read -r -a model_array <<< "$MODELS"
  node -e "import('./scripts/sync_apis_parallel.mjs').then(async m=>{const prompt=process.argv[1];const models=process.argv.slice(2);const res=await m.syncAPIsInParallel(prompt,models);console.log('JSON_RESULTS_START');console.log(JSON.stringify(res,null,2));console.log('JSON_RESULTS_END');}).catch(e=>{console.error(e);process.exit(1);});" "$PROMPT" "${model_array[@]}" | tee "$sync_log"
  info "Sync log: $sync_log"
}

start_core() {
  start_one webhook
  start_one router
  healthcheck || true
}

start_all_services() {
  for s in "${SERVICE_NAMES[@]}"; do
    start_one "$s"
  done
  healthcheck || true
}

stop_core() {
  stop_one router
  stop_one webhook
}

stop_all_services() {
  for s in "${SERVICE_NAMES[@]}"; do
    stop_one "$s"
  done
}

status_all() {
  for s in "${SERVICE_NAMES[@]}"; do
    local f
    f="$(pid_file "$s")"
    if is_running "$f"; then
      info "$s running (PID $(cat "$f"))"
    else
      info "$s stopped"
    fi
  done
  healthcheck || true
  info "Logs dir: $LOG_DIR"
}

usage() {
  cat <<USAGE
Usage: $(basename "$0") <command>

Commands:
  run           deps + validate + start core(webhook/router) + sync
  run-all       deps + validate + start all services + sync
  up            start core services
  up-all        start all services
  sync          run model sync only
  status        show process status + health
  down          stop core services
  down-all      stop all services
  help          show this help

Env overrides:
  ORCH_MODELS / SHIP_TODAY_MODELS   comma-separated model list
  ORCH_PROMPT / SHIP_TODAY_PROMPT   custom sync prompt
USAGE
}

cmd="${1:-run}"
case "$cmd" in
  run)
    ensure_deps
    validate_env
    start_core
    sync_round
    ;;
  run-all)
    ensure_deps
    validate_env
    start_all_services
    sync_round
    ;;
  up) start_core ;;
  up-all) start_all_services ;;
  sync)
    ensure_deps
    sync_round
    ;;
  status) status_all ;;
  down) stop_core ;;
  down-all) stop_all_services ;;
  help|-h|--help) usage ;;
  *)
    err "Unknown command: $cmd"
    usage
    exit 1
    ;;
esac

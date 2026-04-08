#!/bin/bash
# Startup wrapper for Zapier automation services
# 
# Usage:
#   bash scripts/startup.sh start        # Start all services
#   bash scripts/startup.sh stop         # Stop all services
#   bash scripts/startup.sh status       # Check service status
#   bash scripts/startup.sh logs         # View logs
# 
# This script can be used with PM2, systemd, or run directly

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES_DIR="$PROJECT_ROOT/scripts"
LOGS_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/.pids"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create directories
mkdir -p "$LOGS_DIR" "$PID_DIR"

# Service definitions
SERVICES=(webhook router paraclau learning docs)

function service_cmd() {
  case "$1" in
    webhook) echo "node $SERVICES_DIR/zapier-webhook-receiver.mjs" ;;
    router) echo "node $SERVICES_DIR/task-router-server.mjs" ;;
    paraclau) echo "node $SERVICES_DIR/paraclau-watcher-zapier.js" ;;
    learning) echo "node $SERVICES_DIR/learning-batch-processor.mjs" ;;
    docs) echo "node $SERVICES_DIR/doc-publisher-zapier.mjs" ;;
    *) return 1 ;;
  esac
}

function service_port() {
  case "$1" in
    webhook) echo "3000" ;;
    router) echo "3001" ;;
    *) echo "" ;;
  esac
}

function log_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

function log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

function log_error() {
  echo -e "${RED}✗${NC} $1"
}

function log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

function validate_env() {
  local profile=${1:-local}
  log_info "Validating environment..."
  node "$SERVICES_DIR/validate-env.mjs" --profile "$profile" > /dev/null 2>&1 || {
    log_error "Environment validation failed"
    log_info "Run: node scripts/validate-env.mjs --profile $profile"
    exit 1
  }
  log_success "Environment validated ($profile profile)"
}

function start_service() {
  local service=$1
  local cmd
  cmd=$(service_cmd "$service") || {
    log_error "Unknown service: $service"
    return 1
  }
  local pid_file="$PID_DIR/$service.pid"
  
  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      log_warning "$service is already running (PID: $pid)"
      return 0
    fi
  fi
  
  log_info "Starting $service..."

  nohup bash -lc "$cmd" >> "$LOGS_DIR/$service.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$pid_file"

  sleep 1

  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    pid=$(cat "$pid_file")
    log_success "$service started (PID: $pid)"
    
    # If service has a port, check it
    local port
    port=$(service_port "$service")
    if [ -n "$port" ]; then
      sleep 1
      if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "$service listening on port $port"
      fi
    fi
    return 0
  else
    log_error "Failed to start $service"
    [ -f "$LOGS_DIR/$service.log" ] && tail -5 "$LOGS_DIR/$service.log"
    return 1
  fi
}

function stop_service() {
  local service=$1
  local pid_file="$PID_DIR/$service.pid"
  
  if [ ! -f "$pid_file" ]; then
    log_warning "$service is not running"
    return 0
  fi
  
  local pid=$(cat "$pid_file")
  
  if kill -0 "$pid" 2>/dev/null; then
    log_info "Stopping $service (PID: $pid)..."
    kill "$pid"
    
    # Wait up to 5 seconds for graceful shutdown
    for i in {1..5}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        rm -f "$pid_file"
        log_success "$service stopped"
        return 0
      fi
      sleep 1
    done
    
    # Force kill if necessary
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$pid_file"
    log_success "$service force-stopped"
  else
    log_warning "$service is not running"
    rm -f "$pid_file"
  fi
  
  return 0
}

function check_service() {
  local service=$1
  local pid_file="$PID_DIR/$service.pid"
  
  if [ ! -f "$pid_file" ]; then
    log_warning "$service: not running"
    return 1
  fi
  
  local pid=$(cat "$pid_file")
  
  if kill -0 "$pid" 2>/dev/null; then
    log_success "$service: running (PID: $pid)"
    return 0
  else
    log_warning "$service: stopped (stale PID file)"
    rm -f "$pid_file"
    return 1
  fi
}

function start_all() {
  log_info "╔════════════════════════════════════════════╗"
  log_info "║ Starting Zapier Automation Services       ║"
  log_info "╚════════════════════════════════════════════╝"
  
  validate_env "local"

  local failed=0
  for service in "${SERVICES[@]}"; do
    start_service "$service" || failed=$((failed + 1))
  done
  
  echo ""
  if [ $failed -eq 0 ]; then
    log_success "All services started successfully!"
  else
    log_error "$failed service(s) failed to start"
    log_info "Check logs: tail -f $LOGS_DIR/*.log"
    exit 1
  fi
  
  log_info ""
  log_info "Service Status:"
  status_all
  
  log_info ""
  log_info "Next steps:"
  log_info "  View logs:        tail -f $LOGS_DIR/*.log"
  log_info "  Check status:     $0 status"
  log_info "  Test endpoint:    curl http://localhost:3001/health"
}

function stop_all() {
  log_info "╔════════════════════════════════════════════╗"
  log_info "║ Stopping Zapier Automation Services       ║"
  log_info "╚════════════════════════════════════════════╝"
  
  for service in "${SERVICES[@]}"; do
    stop_service "$service"
  done
  
  log_success "All services stopped"
}

function status_all() {
  local running=0
  local stopped=0
  
  for service in "${SERVICES[@]}"; do
    if check_service "$service"; then
      running=$((running + 1))
    else
      stopped=$((stopped + 1))
    fi
  done
  
  echo ""
  log_info "Summary: $running running, $stopped stopped"
}

function tail_logs() {
  local n=${1:-50}
  log_info "Showing last $n lines of all logs..."
  echo ""
  tail -f "$LOGS_DIR"/*.log
}

function show_help() {
  cat << EOF
${CYAN}Zapier Automation Services Startup Script${NC}

USAGE:
  $(basename "$0") {start|stop|status|logs|validate}

COMMANDS:
  start      Start all services (webhook, router, paraclau, learning, docs)
  stop       Stop all services gracefully
  status     Check status of all services
  logs       Tail all service logs in real-time
  validate   Validate environment configuration
  
EXAMPLES:
  # Start all services
  bash $(basename "$0") start
  
  # Check status
  bash $(basename "$0") status
  
  # View logs
  bash $(basename "$0") logs
  
  # Stop services
  bash $(basename "$0") stop

SERVICE PORTS:
  Webhook Receiver: 3000
  Task Router:      3001

LOGS LOCATION:
  $LOGS_DIR/

PID FILES:
  $PID_DIR/

EOF
}

# Main
case "${1:-help}" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  status)
    status_all
    ;;
  logs)
    tail_logs "${2:-50}"
    ;;
  validate)
    validate_env "${2:-local}"
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Unknown command: $1"
    show_help
    exit 1
    ;;
esac

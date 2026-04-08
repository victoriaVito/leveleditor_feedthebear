#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_FILE="${HOME}/.zshrc"

cat <<EOF >> "$TARGET_FILE"

# Feed the Bear Apps Script helpers
alias gas-clasp-env='bash "$ROOT_DIR/scripts/clasp_env.sh"'
alias gas-clasp-login='bash "$ROOT_DIR/scripts/clasp_login_no_localhost.sh"'
alias gas-clasp-status='bash "$ROOT_DIR/scripts/clasp_status.sh"'
alias gas-clasp-push='npx @google/clasp push'
alias gas-clasp-pushf='bash "$ROOT_DIR/scripts/clasp_push_force.sh"'
alias gas-clasp-pull='bash "$ROOT_DIR/scripts/clasp_pull.sh"'
EOF

echo "Added clasp aliases to $TARGET_FILE"

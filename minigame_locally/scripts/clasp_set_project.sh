#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCRIPT_ID="${1:-${GAS_SCRIPT_ID:-}}"
ROOT_DIR_VALUE="${2:-apps_script}"

if [ -z "$SCRIPT_ID" ]; then
  echo "Usage: bash scripts/clasp_set_project.sh <SCRIPT_ID> [rootDir]"
  exit 1
fi

cat > .clasp.json <<EOF
{
  "scriptId": "$SCRIPT_ID",
  "rootDir": "$ROOT_DIR_VALUE"
}
EOF

echo "Wrote .clasp.json for Apps Script project $SCRIPT_ID using rootDir=$ROOT_DIR_VALUE"

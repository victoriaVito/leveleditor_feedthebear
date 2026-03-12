#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <SCRIPT_ID>"
  exit 1
fi

SCRIPT_ID="$1"
ROOT_DIR="google_sheets_sync"

cat > .clasp.json <<JSON
{
  "scriptId": "${SCRIPT_ID}",
  "rootDir": "${ROOT_DIR}"
}
JSON

echo "Created .clasp.json for ${ROOT_DIR}"

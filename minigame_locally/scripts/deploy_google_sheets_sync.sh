#!/usr/bin/env bash
set -euo pipefail

if ! command -v clasp >/dev/null 2>&1; then
  echo "clasp not found. Install with: npm install -g @google/clasp"
  exit 1
fi

DESCRIPTION="${1:-Level toolkit spreadsheet sync}"
clasp deploy --description "${DESCRIPTION}"

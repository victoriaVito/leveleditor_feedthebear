#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Apps Script environment check"
echo "Project root: $ROOT_DIR"

command -v node >/dev/null || { echo "Missing node"; exit 1; }
command -v npm >/dev/null || { echo "Missing npm"; exit 1; }

echo "Node: $(node -v)"
echo "NPM: $(npm -v)"
echo "clasp: $(npx @google/clasp --version)"

if [ -f "apps_script/appsscript.json" ]; then
  echo "Apps Script manifest: apps_script/appsscript.json"
else
  echo "Missing apps_script/appsscript.json"
  exit 1
fi

if [ -f ".clasp.json" ]; then
  echo ".clasp.json: present"
else
  echo ".clasp.json: missing"
  echo "Run: bash scripts/clasp_set_project.sh <SCRIPT_ID>"
fi

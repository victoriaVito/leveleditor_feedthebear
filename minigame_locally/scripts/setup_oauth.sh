#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT_JSON="$ROOT_DIR/.local/google_oauth_client.json"

echo "🔐 Google Sheets OAuth Setup"
echo "================================"
echo ""
echo "This repo uses the live OAuth flow in:"
echo "  node scripts/reconnect_google_sheets_loopback.mjs"
echo ""
echo "Expected client file:"
echo "  .local/google_oauth_client.json"
echo ""
echo "Expected token output:"
echo "  .local/google_sheets_token.json"
echo ""

if [ ! -f "$CLIENT_JSON" ]; then
    echo "⚠️  Missing $CLIENT_JSON"
    echo ""
    echo "Create/download a Desktop OAuth client and save it there first."
    exit 1
fi

echo "✅ Found $CLIENT_JSON"
echo ""
echo "Run this command to refresh the token:"
echo "  node scripts/reconnect_google_sheets_loopback.mjs"
echo ""
echo "If 8765 is busy, use another localhost port:"
echo "  GOOGLE_OAUTH_LOOPBACK_PORT=8796 node scripts/reconnect_google_sheets_loopback.mjs"

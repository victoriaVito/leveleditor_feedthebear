#!/bin/bash
set -euo pipefail
mkdir -p .local
read -rp "Paste your Google OAuth client JSON (single line, base64 optional): " client_json
cat <<CLIENT > .local/google_oauth_client.json
$client_json
CLIENT
read -rp "Paste your Drive refresh token JSON: " token_json
cat <<TOKEN > .local/google_drive_token.json
$token_json
TOKEN
echo "Credentials saved."

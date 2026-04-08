#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

node --input-type=module <<'EOF'
import { getGoogleSheetsAuthStatus } from "./google_sheets_api.mjs";

const rootDir = process.cwd();
const credentialsPath = process.env.GOOGLE_OAUTH_CLIENT_PATH || process.argv[2] || ".local/google_oauth_client.json";
const tokenPath = process.env.GOOGLE_SHEETS_TOKEN_PATH || process.argv[3] || ".local/google_sheets_token.json";
const status = await getGoogleSheetsAuthStatus({
  rootDir,
  credentialsPath,
  tokenPath
});

console.log("Google Sheets API status");
console.log(`Credentials: ${status.credentialsConfigured ? "Configured" : "Missing"}`);
console.log(`Token: ${status.tokenConfigured ? "Configured" : "Missing"}`);
console.log(`Connected: ${status.connected ? "Yes" : "No"}`);
console.log(`Auth mode: ${status.authMode || "none"}`);
console.log(`Client JSON: ${status.credentialsPath}`);
console.log(`Token file: ${status.tokenPath}`);
if (status.scope) console.log(`Scope: ${status.scope}`);
if (status.clientId) console.log(`Client ID: ${status.clientId}`);
if (status.error) console.log(`Error: ${status.error}`);
EOF

#!/usr/bin/env node
import path from "node:path";
import { syncDriveFolderImageSheets } from "../google_sheets_api.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const spreadsheetId = process.argv[2] || process.env.GOOGLE_SPREADSHEET_ID || "1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c";
const rootFolderName = process.argv[3] || process.env.GOOGLE_DRIVE_BEAR_FOLDER || "bear";

const result = await syncDriveFolderImageSheets({
  rootDir,
  credentialsPath: process.env.GOOGLE_OAUTH_CLIENT_PATH || ".local/google_oauth_client.json",
  tokenPath: process.env.GOOGLE_SHEETS_TOKEN_PATH || ".local/google_sheets_token.json",
  spreadsheetId,
  rootFolderName
});

console.log(JSON.stringify(result, null, 2));

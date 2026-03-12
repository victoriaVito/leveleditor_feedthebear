# Google Sheets API Sync Plan

Last updated: 2026-03-12

## Goal

Replace Apps Script as the primary remote spreadsheet sync mechanism for the Level Toolkit.

The target model is:

- the toolkit remains the source of truth
- the local workbook mirror remains the first sync target
- Google Sheets becomes a one-way reporting database
- the remote push uses Google Sheets API directly from the local server

## Why this replaces Apps Script

The Apps Script web app approach was blocked by domain authentication and redirect/login policies.

What failed:

- `clasp` setup worked
- Apps Script deployment worked
- local workbook sync worked
- remote POSTs to the deployed web app returned `401 Unauthorized`

That means the issue was not in toolkit serialization or workbook generation. The issue was the deployment/auth model of the web app.

## Chosen architecture

### Source of truth

- [levels](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels)
- [progressions](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions)
- [playtest](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/playtest)

### Local mirror

- [output/spreadsheet/Levels_feed_the_bear_linked.xlsx](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/output/spreadsheet/Levels_feed_the_bear_linked.xlsx)

### Remote push

- `server.mjs` pushes the generated structured payload directly to Google Sheets through the Google Sheets REST API
- OAuth is completed in the browser
- refresh tokens are stored locally and reused by the server

## Local credential files

Default paths:

- OAuth client JSON:
  - `/.local/google_oauth_client.json`
- OAuth token:
  - `/.local/google_sheets_token.json`

These files are local-only and must never be committed.

## OAuth model

The implementation uses a Google OAuth desktop client.

Flow:

1. put the OAuth client JSON file at `/.local/google_oauth_client.json`
2. make sure the OAuth client includes this redirect URI:
   - `http://127.0.0.1:8080/api/google-sheets-auth-callback`
3. in the toolkit Settings, choose:
   - `Google Sync Method = Google Sheets API`
4. click `Connect Google Sheets API`
5. complete the browser OAuth flow
6. the token file is written to `/.local/google_sheets_token.json`
7. subsequent manager syncs can push to the live Google Sheet

## Sync contract

The sync payload includes:

- progression order
- progression labels
- slot-level records
- item-level catalog records
- timestamp
- level references and saved paths
- legacy spreadsheet rows
- structured spreadsheet rows

Tabs maintained remotely:

- `Sheet1`
- `progression all`
- `levels after feedback`
- `extras`
- `level manager db`
- `level manager items`

## Server endpoints

Implemented in [server.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/server.mjs):

- `POST /api/sync-levels-workbook`
- `POST /api/google-sheets-auth-url`
- `POST /api/google-sheets-status`
- `POST /api/google-sheets-disconnect`
- `GET /api/google-sheets-auth-callback`

## UI contract

Implemented in:

- [level_toolkit_web/index.html](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/index.html)
- [level_toolkit_web/app.js](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/app.js)

Settings fields:

- `Workbook Path`
- `Google Sheet ID`
- `Google Sync Method`
- `OAuth Client JSON Path`
- `OAuth Token Path`
- `Apps Script URL (Legacy Fallback)`
- `Auto Sync Sheet DB`

Settings actions:

- `Sync Workbook Now`
- `Connect Google Sheets API`
- `Check Google Sheets API`
- `Disconnect Google Sheets API`

## Implementation status

Implemented:

- local workbook sync
- direct Google Sheets API module
- OAuth connect flow
- token persistence
- remote sheet upsert logic
- UI settings for Sheets API
- legacy Apps Script fallback mode

Pending for a real live push:

- place a valid OAuth client JSON in `/.local/google_oauth_client.json`
- complete OAuth once from the toolkit UI

## Validation plan

### Local

- `node --check server.mjs`
- `node --check level_toolkit_web/app.js`
- `node --check google_sheets_api.mjs`
- `POST /api/google-sheets-status` should return a structured status object
- `POST /api/sync-levels-workbook` should still write the local workbook mirror

### Connected mode

After a valid OAuth client JSON is present:

1. run `Check Google Sheets API`
2. run `Connect Google Sheets API`
3. complete the browser flow
4. run `Sync Workbook Now`
5. verify that all six tabs are updated in the target Google Sheet

## Recommended operating mode

- default editing flow: local workbook mirror + autosave
- reporting flow: one-way push to Google Sheets through Google Sheets API
- fallback only: Apps Script

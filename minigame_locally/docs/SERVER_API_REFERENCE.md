# Server API Reference

This document describes the HTTP surface exposed by `server.mjs`, the toolkit server that serves the web UI and bridges local files, spreadsheet sync, and Google Sheets auth.

## Server Overview

- Entry point: `server.mjs`
- Default port: `8080` unless `PORT` is set
- Bind address: `127.0.0.1`
- Startup message: `Toolkit server running at http://127.0.0.1:<PORT>`
- Primary UI root: `level_toolkit_web/`
- Static asset helper: `serveStatic()` in `server.mjs`
- CORS behavior: every response uses `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Headers: Content-Type`
- `OPTIONS` requests return `204`

The server is intentionally simple:

1. handle API routes first
2. handle Google Sheets auth callback routes
3. fall back to static file serving

## Static File Serving

`serveStatic()` resolves requests like this:

- `/` maps to `/index.html`
- requests under these prefixes are rooted at the matching project directory:
  - `/levels/` -> `levels/`
  - `/screenshots/` -> `screenshots/`
  - `/progressions/` -> `progressions/`
  - `/playtest/` -> `playtest/`
  - `/bundles/` -> `bundles/`
  - `/.local/` -> `.local/`
- all other paths are served from `level_toolkit_web/`
- directory requests recurse to `index.html`
- path traversal is blocked by checking that the normalized path still starts with the chosen base directory
- missing files return `404 Not found`
- unknown extensions fall back to `application/octet-stream`

Known MIME types:

- `.html` -> `text/html; charset=utf-8`
- `.js` -> `application/javascript; charset=utf-8`
- `.css` -> `text/css; charset=utf-8`
- `.json` -> `application/json; charset=utf-8`
- `.png` -> `image/png`
- `.jpg` / `.jpeg` -> `image/jpeg`
- `.svg` -> `image/svg+xml`
- `.txt` -> `text/plain; charset=utf-8`

## Endpoint Table

| Method + Path | Purpose | Request | Response | Side effects |
|---|---|---|---|---|
| `GET /api/file-status` | Check whether a path exists on disk | Query: `relativePath` required, `baseDir` optional | JSON `{ ok, exists, isDirectory, path }` | None |
| `POST /api/local-store/browser-sync` | Persist a browser state bundle for later recovery | JSON body with optional `source`, `reason`, `snapshots` | JSON `{ ok, path, archivePath }` | Writes `.local/browser_state_exports/latest_browser_state_bundle.json` and timestamped archive files |
| `GET /api/local-store/browser-state` | Read the latest saved browser state bundle | Query: repeated `kind` filters snapshots by key | JSON `{ ok, savedAt, snapshots }` | Reads `.local/browser_state_exports/latest_browser_state_bundle.json` if present |
| `POST /api/save-file` | Write plain text content to a local file | JSON body with `baseDir`, `relativePath`, `content` | JSON `{ ok, path }` | Writes the target file |
| `POST /api/save-data-url` | Decode a base64 data URL and save it as binary | JSON body with `baseDir`, `relativePath`, `dataUrl` | JSON `{ ok, path }` | Writes the target binary file |
| `POST /api/append-file` | Append text to a local file | JSON body with `baseDir`, `relativePath`, `content` | JSON `{ ok, path }` | Appends to the target file |
| `POST /api/create-zip` | Build a ZIP archive from in-memory entries | JSON body with `archiveName`, `baseDir`, `relativePath`, `entries[]` | JSON `{ ok, path }` | Creates a temp directory, writes entry files, runs `zip`, removes temp files |
| `POST /api/read-local-file` | Read a local file and return its bytes as base64 | JSON body with `baseDir`, `relativePath` | JSON `{ ok, path, data }` | Reads the target file |
| `POST /api/sync-levels-workbook` | Regenerate the canonical spreadsheet workbook from a snapshot | JSON body with `snapshot`, `baseDir`, `relativePath`, `templatePath`, `googleSyncMethod`, `googleCredentialsPath`, `googleTokenPath`, `spreadsheetId` | JSON `{ ok, path, pushed, pushMode, pushError }` | Runs `scripts/sync_levels_spreadsheet.py`; optionally pushes to Google Sheets |
| `POST /api/apply-sheet-renames` | Apply spreadsheet-staged level renames locally | JSON body with optional `spreadsheetId`, `renameSheetName` | JSON from `scripts/apply_sheet_level_renames.mjs` | Runs the rename script, creates a local backup, and may rewrite canonical level files, screenshots, and bundle references |
| `POST /api/open-bridge` | Launch the bridge UI/process | No body used | JSON `{ ok, pid, script }` | Spawns `scripts/bridge.sh` if present, otherwise `scripts/bear_reporting_sync_gui.py` |
| `POST /api/google-sheets-auth-url` | Start the browser OAuth connect flow | JSON body with `credentialsPath`, `tokenPath`, optional `baseUrl` | JSON `{ ok, authUrl }` | Stores OAuth state in memory and generates a Google auth URL |
| `POST /api/google-sheets-status` | Report current Google Sheets auth status | JSON body with `credentialsPath`, `tokenPath` | JSON `{ ok, status }` | None |
| `POST /api/google-sheets-disconnect` | Remove the stored Google token | JSON body with `tokenPath` | JSON `{ ok, removed }` | Deletes the token file if it exists |
| `POST /api/push-google-sheet` | Forward a payload to an arbitrary URL | JSON body with `url`, `payload` | JSON `{ ok, body }` on success or `{ ok: false, error }` on failure | Makes an outbound `fetch()` POST request |
| `GET /api/action/sync-spreadsheet` | Spreadsheet-link action for canonical regenerate-and-push sync | No query/body contract beyond the action name | HTML success/error page | Rebuilds the canonical workbook/payload from bundles, then pushes the refreshed payload with Google Sheets auth |
| `GET /api/action/generate-payload` | Spreadsheet-link action for rebuilding the canonical workbook and payload locally | No query/body contract beyond the action name | HTML success/error page | Runs `scripts/sync_levels_spreadsheet.py --from-bundles` |
| `GET /api/action/apply-level-renames` | Spreadsheet-link action for applying rename changes | No query/body contract beyond the action name | HTML success/error page | Runs `scripts/apply_sheet_level_renames.mjs` |
| `GET /api/action/materialize-mixes` | Spreadsheet-link action for materializing approved mixes | No query/body contract beyond the action name | HTML success/error page | Runs `scripts/materialize_approved_mixes.mjs` |
| `GET /api/action/open-toolkit` | Redirect back to the toolkit root | No body or query parameters | `302` redirect to `/` | None |
| `GET /api/action/backup-progressions` | Backup original progression bundles | No body or query parameters | HTML success/error page | Copies `bundles/original_*` into `backups/progressions_<timestamp>` |
| `GET /api/action/validate-levels` | Validate bundled level JSON files | No body or query parameters | HTML success/error page with a summary | Scans `bundles/original_*` level JSON files and checks `pairs`, `gridSize`, and `validation.solvable` |
| `GET /api/google-sheets-auth-callback` | Complete the browser OAuth connect flow | Query: `code` and `state` required | HTML success/error page | Exchanges the auth code, saves the token file, and clears the in-memory OAuth state |

## Google OAuth

The Google Sheets auth flow is implemented in `google_sheets_api.mjs` and surfaced through the server endpoints above.

Auth modes:

- `service_account`: no browser flow; the code exchanges a JWT directly for an access token
- `oauth_client`: browser flow with refresh-token storage
- `gcloud`: fallback mode when local Google application-default credentials are available

Browser OAuth flow:

1. `POST /api/google-sheets-auth-url` calls `createGoogleSheetsAuthUrl()`
2. the helper loads `credentialsPath` and verifies the redirect URI
3. the redirect URI is built as `<baseUrl>/api/google-sheets-auth-callback`
4. a random `state` value is stored in memory in `googleAuthStates`
5. Google returns the user to the callback with `code` and `state`
6. `GET /api/google-sheets-auth-callback` calls `completeGoogleSheetsAuth()`
7. the auth code is exchanged for tokens
8. the token is saved to the configured `tokenPath`

Token usage:

- `getGoogleSheetsAuthStatus()` reports whether credentials and tokens exist
- `getGoogleAccessToken()` refreshes expired tokens automatically
- if OAuth cannot be used, the code falls back to `gcloud auth application-default print-access-token`
- `POST /api/google-sheets-disconnect` deletes the saved token file

Important file locations for auth:

- OAuth client JSON: commonly `.local/google_oauth_client.json`
- token JSON: commonly `.local/google_sheets_token.json`

## Error Handling Patterns

The server uses a consistent pattern:

- successful JSON responses return `200` with `{ ok: true, ... }`
- validation failures usually return `400`
- unexpected failures return `500` with `{ ok: false, error: <message> }`
- `GET /api/file-status` returns `200` for both existing and missing files and distinguishes them with `exists`
- `GET /api/local-store/browser-state` also returns `200` when the bundle does not exist yet, with an empty snapshot object
- action endpoints return HTML instead of JSON so spreadsheet users can open them directly in a browser
- `GET /api/google-sheets-auth-callback` returns an HTML success or failure page

## File System Paths

Paths read or written by `server.mjs` itself:

- `level_toolkit_web/` - default static UI root
- `levels/` - static level files
- `screenshots/` - static screenshots
- `progressions/` - static progression files
- `playtest/` - static playtest data
- `bundles/` - static bundle files and level validation input
- `.local/` - static local state exports
- `.local/browser_state_exports/` - browser sync bundle storage
- `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx` - canonical workbook output used by `/api/sync-levels-workbook` and action-based payload generation
- `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync_payload.json` - canonical spreadsheet payload used by action-based sync
- `.local/google_oauth_client.json` - common OAuth client path used by action endpoints
- `.local/google_sheets_token.json` - common OAuth token path used by action endpoints
- `backups/` - progression backup output from `/api/action/backup-progressions`
- `scripts/` - child processes launched for workbook generation, renames, bridge startup, and mix materialization

Temporary paths:

- OS temp directories are used for ZIP creation and workbook sync staging
- temporary directories are deleted after successful work and best-effort cleaned up after failures

## Pending [VERIFY] Flags

- [VERIFY] `app.js` calls `/api/delete-file` (via `deleteRepoFile()` around line 3753), but `server.mjs` does not expose a matching handler in this snapshot. Either the endpoint was removed, lives in a different code path, or the client-side call is dead code. This is a server-client mismatch that should be resolved.

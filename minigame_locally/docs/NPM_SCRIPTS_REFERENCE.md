# NPM Scripts Reference

This file is the canonical reference for the current `npm` commands in this project.

## Environment

- Project root: `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally`
- Node: `>=18`
- Main command runner: `npm run <script>`

## Script List

### `npm run pipeline:procedural`

Runs [scripts/run_procedural_pipeline.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/run_procedural_pipeline.py).

Purpose:

- Regenerates the supported `procedular_reference_large_*.json` pack into `levels/otherLevels/`
- Refreshes the matching screenshots in `levels/screenshots/`
- Syncs `.local/toolkit_state/manager_state.json`, `.local/toolkit_state/workspace_state.json`, `.local/toolkit_state/play_sessions_state.json`, and the canonical manager snapshot files
- Rebuilds `playtest/procedural_100_queue.json`
- Exports the current learning snapshot and emits the audit + scorer replay artifacts
- Validates the active level catalog after the refresh

Outputs:

- `output/procedural/procedural_pipeline_report.json`
- `output/procedural/procedural_learning_snapshot.json`
- `output/procedural/procedural_learning_audit.json`
- `output/procedural/replay_procedural_learning_scorer.json`

Optional direct usage:

```bash
python3 scripts/run_procedural_pipeline.py [--sync-sheets]
```

### `npm run sync:sheets:local`

Runs [scripts/sync_google_sheets_payload.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/sync_google_sheets_payload.mjs).

Purpose:

- Regenerates the canonical workbook and payload from the current bundle/progression state
- Pushes the refreshed canonical payload into Google Sheets
- Uses the local-first Google Sheets API flow
- Can also include procedural learning rows when the snapshot file exists

Inputs:

- default workbook: `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx`
- default payload: `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync_payload.json`
- OAuth client: `.local/google_oauth_client.json`
- OAuth token: `.local/google_sheets_token.json`
- spreadsheet id: `GOOGLE_SPREADSHEET_ID` or built-in default

Direct canonical usage:

```bash
node scripts/sync_google_sheets_payload.mjs --canonical [--workbook PATH] [--payload PATH] [--spreadsheet-id ID]
```

### `npm run sync:sheets:push`

Runs [scripts/sync_google_sheets_payload.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/sync_google_sheets_payload.mjs).

Purpose:

- Pushes an already-generated payload into Google Sheets
- Skips workbook/payload regeneration

Optional direct usage:

```bash
node scripts/sync_google_sheets_payload.mjs [payloadPath] [spreadsheetId]
```

### `npm run coordination:route`

Runs [scripts/paraclau_router.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/paraclau_router.mjs).

Purpose:

- Parses the machine-readable `Router Queue` in `docs/PROJECT_MASTER_HANDOFF.md`
- Applies the shared coordination routing rules
- Emits a JSON snapshot and Markdown report under `output/coordination/`
- Provides a stable handoff surface for dashboards or future transport layers

Outputs:

- `output/coordination/paraclau_router_status.json`
- `output/coordination/paraclau_router_report.md`

Important rule:

- `docs/PROJECT_MASTER_HANDOFF.md` stays the source of truth
- this command generates derived views only

### `npm run apply:sheet-renames`

Runs [scripts/apply_sheet_level_renames.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/apply_sheet_level_renames.mjs).

Purpose:

- Reads staged rename requests from the `Level Renames` tab in Google Sheets
- Renames canonical level JSON files and matching screenshots locally
- Updates bundle copies, bundle CSVs, and JSON reference files that still point to the old filenames
- Regenerates the canonical workbook and payload, then pushes the refreshed state back to Google Sheets
- Creates a timestamped safety backup under `backups/level_renames_<timestamp>/` before changing files

Inputs:

- spreadsheet tab: `Level Renames`
- OAuth client: `.local/google_oauth_client.json`
- OAuth token: `.local/google_sheets_token.json`
- spreadsheet id: `GOOGLE_SPREADSHEET_ID` or built-in default

Important rule:

- the ordinal shown in the sheet is an editorial label only
- the real filename is generated from the staged target name, not from the ordinal

Optional direct usage:

```bash
node scripts/apply_sheet_level_renames.mjs [spreadsheetId] [sheetName]
```

### `npm run materialize:mixes`

Runs [scripts/materialize_approved_mixes.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/materialize_approved_mixes.mjs).

Purpose:

- Reads approved rows from `Mix Planner`
- Creates bundle-style output folders under `bundles/live_ops_mixes`
- Copies level JSONs and screenshots for the approved live ops mix
- Writes a progression CSV and proposal manifest
- Updates the system-managed `Materialized` and `Output Folder` result fields

Inputs:

- spreadsheet tab: `Mix Planner`
- OAuth client: `.local/google_oauth_client.json`
- OAuth token: `.local/google_sheets_token.json`
- spreadsheet id: `GOOGLE_SPREADSHEET_ID` or built-in default

Optional direct usage:

```bash
node scripts/materialize_approved_mixes.mjs [spreadsheetId] [sheetName] [destinationRoot]
```

### `npm run sync:drive-sheets`

Runs [scripts/sync_drive_folder_image_sheets.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/sync_drive_folder_image_sheets.mjs).

Purpose:

- Reads image naming and grouping from Google Drive
- Matches those names against local screenshots
- Pushes the resulting tabs to Google Sheets

Inputs:

- OAuth client: `.local/google_oauth_client.json`
- OAuth token: `.local/google_sheets_token.json`
- spreadsheet id: `GOOGLE_SPREADSHEET_ID` or built-in default
- Drive root folder: `GOOGLE_DRIVE_BEAR_FOLDER` or `bear`

Optional direct usage:

```bash
node scripts/sync_drive_folder_image_sheets.mjs [spreadsheetId] [rootFolderName]
```

### `npm run sync:apis`

Runs [scripts/sync_apis_parallel.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/sync_apis_parallel.mjs).

Purpose:

- Tests or runs parallel AI API calls
- Uses Gemini as the primary route
- Can optionally call OpenAI and Claude if keys are available

Environment variables:

- `GOOGLE_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

Notes:

- This is API orchestration, not spreadsheet sync by itself

### `npm run sync:all`

Runs [scripts/sync_spreadsheet_with_ai.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/sync_spreadsheet_with_ai.mjs).

Purpose:

- Demo pipeline for spreadsheet plus AI enrichment
- Currently uses demo rows, not the canonical local-first sync path

Recommendation:

- Use this only if you explicitly want the AI demo flow
- For the supported spreadsheet pipeline, prefer `sync:sheets:local` or `sync:drive-sheets`

### `npm run colors:update`

Runs [scripts/update_level_colors.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/update_level_colors.mjs).

Purpose:

- Normalizes level JSON files to the canonical fish color system
- Updates pair colors and color metadata
- Rebuilds color manifests
- Stores backups under `levels/.backups`

Optional direct usage:

```bash
node scripts/update_level_colors.mjs [fileOrDirectory...]
```

### `npm run levels:convert`

Runs [scripts/convert_to_developer_format.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/convert_to_developer_format.mjs).

Purpose:

- Converts level JSON files into the developer runtime format
- Writes backups before overwriting files

Optional direct usage:

```bash
node scripts/convert_to_developer_format.mjs [fileOrDirectory...]
```

### `npm run oauth:setup`

Runs [scripts/setup_oauth.sh](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/setup_oauth.sh).

Purpose:

- Prints the OAuth setup steps for Google Sheets and Drive access
- Checks whether `credentials.json` exists

Use this when:

- OAuth is not configured yet
- You need a reminder of the required Google scopes

### `npm run gas:env`

Runs `bash scripts/clasp_env.sh`.

Purpose:

- Verifies the local Apps Script tooling foundation
- Checks `node`, `npm`, `npx @google/clasp`, the Apps Script manifest, and `.clasp.json`

### `npm run gas:login`

Runs `bash scripts/clasp_login_no_localhost.sh`.

Purpose:

- Starts the Google Apps Script login flow through `clasp`
- Uses the no-localhost flow so the repo can be linked without a loopback server dependency

### `npm run gas:set-project -- <SCRIPT_ID>`

Runs `bash scripts/clasp_set_project.sh`.

Purpose:

- Writes `.clasp.json` locally
- Links the repo to a specific Google Apps Script project id
- Points `clasp` at `apps_script/` as the source root

### `npm run gas:status`

Runs `bash scripts/clasp_status.sh`.

Purpose:

- Shows the current `clasp` sync status for the Apps Script project

### `npm run gas:push`

Runs `npx @google/clasp push`.

Purpose:

- Pushes the current `apps_script/` contents to the linked Apps Script project

### `npm run gas:push:force`

Runs `bash scripts/clasp_push_force.sh`.

Purpose:

- Force-pushes the current `apps_script/` contents to the linked Apps Script project
- Useful during early control-panel setup when the remote script is still being standardized

### `npm run gas:pull`

Runs `bash scripts/clasp_pull.sh`.

Purpose:

- Pulls the current remote Apps Script project into the local `apps_script/` root

### `npm run gas:aliases`

Runs `bash scripts/add_clasp_aliases.sh`.

Purpose:

- Appends convenience aliases for the Feed the Bear Apps Script workflow to `~/.zshrc`

### `npm run dev`

Runs:

```bash
NODE_OPTIONS='--watch' node scripts/sync_spreadsheet_with_ai.mjs
```

Purpose:

- Watch mode for the AI demo pipeline

Recommendation:

- This is tied to the demo script, not the canonical toolkit server or the canonical spreadsheet sync route

## Recommended commands

For active spreadsheet work:

- `npm run sync:sheets:local`
- `npm run sync:sheets:push`
- `npm run apply:sheet-renames`
- `npm run materialize:mixes`
- `npm run sync:drive-sheets`

For maintenance:

- `npm run colors:update`
- `npm run levels:convert`
- `npm run oauth:setup`

## Notes

- The supported spreadsheet model is `local-first + Google Sheets API`
- The canonical sync command is `npm run sync:sheets:local`, which rebuilds from bundle state before pushing
- Google Drive is used for naming and grouping support, not as the canonical screenshot source
- Spreadsheet rename staging is allowed, but the actual rename is only committed when `apply:sheet-renames` or the toolkit apply action is run
- `Apply Status`, `Materialized`, and `Output Folder` are system-managed sheet fields and should not be edited manually
- If this file and [package.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/package.json) ever disagree, `package.json` is the executable source of truth

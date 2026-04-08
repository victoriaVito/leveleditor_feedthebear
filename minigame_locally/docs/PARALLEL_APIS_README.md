# Google Sync and Parallel AI Pipelines

## 1. Purpose

This is the canonical documentation for the repo's Google Sheets, Google Drive, and parallel AI enrichment scripts.

It replaces the old split between:

- the Drive-image spreadsheet note
- the parallel API prototype note

## 2. What exists today

The repo currently contains two related but separate flows:

1. a real Google Drive to Google Sheets sync
2. a parallel AI enrichment prototype

They are adjacent workflows, but they are not yet one production-grade end-to-end pipeline.

## 3. Pipeline A: Drive folder images to Sheets

### Goal

Populate Google Sheets using local screenshots as the canonical image source, while using Drive folders only to discover screenshot names and grouping.

- column `A`: file name
- column `B`: screenshot rendered through `=IMAGE(...)`

### Main files

- `google_sheets_api.mjs`
- `scripts/sync_drive_folder_image_sheets.mjs`

### Entry point

```bash
npm run sync:drive-sheets
```

Equivalent direct command:

```bash
node scripts/sync_drive_folder_image_sheets.mjs
```

### Default assumptions

- spreadsheet id: `1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c`
- root Drive folder: `bear`

### Folder traversal rules

1. find the Drive folder named `bear`
2. enumerate each child folder under `bear`
3. for each child folder:
   - if a child subfolder named `screenshots` exists, use that
   - otherwise use the folder itself
4. read the PNG file names from Drive
5. match those names against local repo screenshots
6. upload the local matching images for use in Google Sheets formulas
7. create or update the managed screenshot tab

### Sheet output

Each managed tab contains:

- `Name`
- `Screenshot`

Each PNG row becomes:

- `Name`: a humanized label derived from the file name
- `Screenshot`: `=IMAGE("https://drive.google.com/uc?export=view&id=...")`

Formatting also sets wider columns and taller rows for thumbnails.

Important source-of-truth rule:

- Drive is used for naming and grouping
- local repo files are used for the actual image upload whenever possible
- the supported screenshot path is local-first image upload

## 4. Pipeline B: Parallel AI enrichment

### Purpose

Run multiple AI providers in parallel over level rows or demo rows so enrichment is faster than sequential API calls.

### Key scripts

- `scripts/sync_spreadsheet_with_ai.mjs`
- `scripts/sync_apis_parallel.mjs`

### Entry points

Run the combined prototype:

```bash
npm run sync:all
```

Run only the API prototype:

```bash
npm run sync:apis
```

Watch mode:

```bash
npm run dev
```

### Current behavior

`sync:all` currently:

1. runs the parallel enrichment demo
2. uses demo rows inside `scripts/sync_spreadsheet_with_ai.mjs`
3. does not yet pull live rows from Google Sheets

### Parallel execution model

The core benefit is latency reduction through concurrent requests:

```javascript
Promise.all([
  codex(prompt),
  gemini(prompt),
  claude(prompt),
]);
```

If one provider fails, the workflow can still keep partial results from the others.

## 5. Environment and auth

### Node environment

Install dependencies:

```bash
npm install
```

The repo expects Node `>=18`.

### AI env vars

Create or update your local `.env` with the keys you actually use, such as:

- `OPENAI_API_KEY`
- `GITHUB_TOKEN`
- `GOOGLE_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_SPREADSHEET_ID` or `SPREADSHEET_ID`
- `DRIVE_FOLDER_NAME` when using Drive-name discovery

Security note:

- keep real secrets only in the local `.env`
- never commit `.env`

### Google auth

The current Google auth path uses:

- `.local/google_oauth_client.json`
- `.local/google_sheets_token.json`

Verify readiness with:

```bash
bash scripts/check_google_sheets_env.sh
```

The Drive-folder sync needs these scopes:

- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/drive.readonly`

## 6. Relationship to the managed workbook

The Drive-image pipeline is separate from the main workbook sync logic used elsewhere in the project.

This document only covers:

- folder-to-tab screenshot sync
- parallel AI enrichment experiments

It does not redefine the canonical reporting workbook structure.

## 7. Current limitations

- the AI prototype still runs over demo rows, not live spreadsheet rows
- the Drive-image sync still depends on fresh OAuth scopes
- if a Drive filename has no matching local screenshot, the row will be present but the image can be blank
- the two pipelines are related but not fully unified

## 8. Recommended cleanup direction

To keep this area maintainable:

1. treat this file as the only documentation entry point for Google sync plus AI enrichment
2. keep implementation details in scripts, not in extra Markdown variants
3. document only the real entrypoints that still exist in `package.json`

This file is the canonical guide for this topic going forward.

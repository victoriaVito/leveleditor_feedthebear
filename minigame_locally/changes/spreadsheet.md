# Spreadsheet Changes

## Current source of truth

- local workbook generation in `scripts/sync_levels_spreadsheet.py`
- live sync in `google_sheets_api.mjs`
- canonical local-first sync command in `package.json`: `npm run sync:sheets:local`
- lower-level push-only command in `package.json`: `npm run sync:sheets:push`

## 2026-03-24 — Curve Builder tab

New "Curve Builder" tab added to the spreadsheet for visual difficulty curve design.

- `syncCurveBuilderSheet()` in `google_sheets_api.mjs` creates and syncs the tab
- 11 slots (Tutorial + Slots 1-10) with difficulty dropdowns (ALL/EASY/MEDIUM/HARD)
- Level file dropdowns populated from the full catalog
- Screenshots rendered via Drive `IMAGE()` formulas at 100px
- Conditional formatting: green EASY, yellow MEDIUM, red HARD
- Two action hyperlinks: Random Fill and Materialize
- `scripts/random_fill_curve.mjs` fills empty slots randomly respecting difficulty filters
- `scripts/materialize_curve_builder.mjs` creates a real progression bundle and updates Level Manager state
- Server actions registered as GET at `/api/action/random-fill-curve` and `/api/action/materialize-curve`

## Key decisions

- The supported live path is local-first plus Google Sheets API.
- The canonical sync flow rebuilds workbook and payload from bundle state before pushing to Google Sheets.
- Local screenshots are the canonical image source.
- Drive is used only where naming, grouping, or import support is needed.
- The active spreadsheet workflow is the local-first Google Sheets API route.
- Generated spreadsheet fields should be warning-protected, while only explicit editorial fields remain manually editable.

## Important files

- [google_sheets_api.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/google_sheets_api.mjs)
- [scripts/sync_levels_spreadsheet.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/sync_levels_spreadsheet.py)
- [scripts/sync_google_sheets_payload.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/sync_google_sheets_payload.mjs)
- [scripts/import_excel_into_google_sheet.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/import_excel_into_google_sheet.mjs)
- [PARALLEL_APIS_README.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/PARALLEL_APIS_README.md)

## Recent outcomes

- four-tab consolidated spreadsheet structure
- local screenshot upload path
- direct `.xlsx` import into live Google Sheets
- spreadsheet sync now runs through the local-first Google Sheets API route
- canonical `sync:sheets:local` now regenerates workbook/payload from bundles before push
- generated spreadsheet fields now use warning-only protections and narrower system-owned column rules
- sheet-driven renames now create a timestamped local backup before modifying files

## 2026-03-24

- Fixed live screenshot drift in `google_sheets_api.mjs`: the Drive sync now compares local screenshot bytes with the existing Drive file and patches the Drive asset when the filename stayed the same but the PNG content changed.
- Repaired the live Google Sheet with `npm run sync:sheets:local` after the fix. The `All Progressions` screenshot formulas now resolve to Drive PNGs whose bytes match the canonical local screenshots again.
- Verified the previously duplicated Progression B previews (`07 · progresion2 level7` and `08 · progresion2 level8`) are no longer sharing stale content.
- Replaced the old `Links` tab with a generated `README` tab that explains what each spreadsheet surface does, which tabs are safe to edit, and which local actions are available from the sheet.
- Grouped the spreadsheet tabs visually by color in the canonical sync: blue for read/reference tabs, green for interactive editorial tabs, and orange for generated data tabs that should not be edited manually.
- Established Apps Script as the next spreadsheet priority by adding a tracked `apps_script/` scaffold, local `clasp` helper scripts, package scripts, and a canonical control-panel architecture doc.
- Standardized the Apps Script local setup around `apps_script/`, `.clasp.json` as local-only state, and explicit `gas:*` commands for env check, login, link, push, and pull.

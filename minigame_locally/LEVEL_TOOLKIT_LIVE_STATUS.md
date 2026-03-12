# Level Toolkit Live Status

This document is the ongoing, tool-specific status file for the Feed the Bear web toolkit.

It is intended to be updated continuously as the toolkit changes.

Last updated: 2026-03-12

## Scope

This file focuses on the tool itself:

- current capabilities
- current UX flows
- storage and save behavior
- progression workflow
- review workflow
- active debug and performance helpers
- known limitations

It is not the main product vision document. For broader design thinking, see:

- [LEVEL_TOOLKIT_PRODUCT_NOTES.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/LEVEL_TOOLKIT_PRODUCT_NOTES.md)
- [PROCEDURAL_GENERATION_LOGIC.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/PROCEDURAL_GENERATION_LOGIC.md)

## Current Views

### Procedural

Used for:

- generating one level
- generating a 10-level episode draft
- generating procedural batches
- downloading workshop bundles

### Level Editor + Play

Used for:

- editing a single level
- changing level name
- changing board width and height
- changing difficulty
- changing moves
- toggling `Decal` mode for full-board solutions
- validating a level
- saving changes
- saving as a new level
- placing the level directly into a progression slot
- continuing to the next slot with `Save + New Level`
- playing the level directly in the editor

### Play Sessions

Used for:

- loading review queues
- loading a progression into a play queue
- playtesting levels
- validating levels
- approving and rejecting levels
- sending a level back to the editor for correction

### Level Manager

Used for:

- importing standalone levels and progression files
- building progressions visually
- reordering levels with drag and drop
- locking slots
- clearing slots
- assigning `EASY`, `MEDIUM`, or `HARD` per slot
- exporting progression CSV and images
- downloading a zipped progression package
- syncing structured manager data into the linked spreadsheet workbook
- managing an explicit `Extras` editorial bucket

### Settings

Used for:

- configuring the project save path used by the toolkit
- configuring the linked spreadsheet workbook path
- storing the Google Spreadsheet ID used by the remote spreadsheet target
- choosing the Google sync mode
- configuring the local Google OAuth client JSON path
- configuring the local Google OAuth token path
- enabling or disabling automatic spreadsheet DB sync

## Current Board Support

The toolkit currently supports:

- rectangular boards
- `board_width` and `board_height`
- board sizes from `4x4` up to `8x8`
- up to `5` endpoint pairs in the editor
- blocked cells
- orthogonal paths
- no path crossing

## Current Validation Model

Level validation now focuses on playability first.

The toolkit currently checks:

- the board is structurally valid
- the endpoints and blockers are in bounds
- there is at least one valid solution
- the level is not impossible

The toolkit no longer treats target density matching as a hard validity rule.

### Decal

The editor now includes a `Decal` checkbox.

When `Decal` is enabled:

- the level must still be solvable
- and at least one valid solution must cover every free cell on the board

This is intended for full-coverage layouts where the intended solve uses all non-blocked cells.

## Current Pair Support

The editor currently supports:

- pair `A`
- pair `B`
- pair `C`
- pair `D`
- pair `E`

Current editor palette:

- `A`: blue
- `B`: green
- `C`: orange
- `D`: pink
- `E`: purple

The editor also shows the active pair color in a visible badge next to the pair selector.

## Current Editor Debug Features

The editor currently includes a visual-only debug mode:

- mode: `Debug Mark`
- behavior: mark or unmark any cell on the board for temporary inspection
- persistence: debug marks are not written into level JSON
- reset behavior: debug marks are cleared when loading another level, resetting the level, or changing board size

This exists only to help inspect routes and candidate path lines while editing.

## Current Progression Workflow

Progressions are currently edited in two places:

### In Level Manager

The main progression curation flow supports:

- visual slot ordering
- a fixed tutorial in slot 1 for every progression
- slot locking
- slot clearing
- slot reference targeting from empty slots
- dragging from the unassigned pool
- difficulty labels per slot
- progression export
- sending levels to `Extras`

It also supports a faster assignment flow:

- click `Ref` on an empty slot in a progression
- switch to `All Levels`
- click `Assign Ref` on a level card
- the level is placed directly into that progression slot

### In Level Editor + Play

The fast authoring flow supports:

- choosing a progression
- choosing a slot
- preserving slot 1 as the tutorial slot
- saving directly into that slot
- saving and jumping to the next slot
- continuing progression construction without leaving the editor

## Current Save Model

The toolkit writes inside the project, not to random browser downloads.

Default project save root:

- [minigame_locally](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally)

Typical save outputs:

- `levels/`
- `progressions/manager_state/`
- `progressions/exports/`
- `playtest/`
- `bundles/`

Playtest also writes a unified append-only dataset:

- [playtest/playtest_events.jsonl](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/playtest/playtest_events.jsonl)

This file is intended for future ML and analytics work while the individual JSON session files remain available for manual inspection.

## Current Workspace Resolution

Historical workshop presets now resolve level references in this order:

1. canonical repo storage in `levels/`
2. legacy runtime mirror in `level_toolkit_web/workshop_jsons/`
3. fallback mirror in `level_toolkit_web/workshop_jsons_game_unique/`

The local server also exposes these canonical folders directly:

- `/levels/`
- `/progressions/`
- `/playtest/`
- `/bundles/`

This fixes the workshop preset issue where `Progression A/B/C` could load canonicalized `lvl_*` aliases instead of the original workshop files expected by the presets.

Authoritative workspace preset:

- [progressions/workshop_workspace.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/workshop_workspace.json)

Web runtime copy that must stay aligned:

- [level_toolkit_web/workshop_progressions/workshop_workspace.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/workshop_progressions/workshop_workspace.json)

Current active workshop progression set:

- [progressions/progressionA_after_feedback.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionA_after_feedback.json)
- [progressions/progressionB_after_feedback.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionB_after_feedback.json)
- [progressions/progressionC_after_feedback.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionC_after_feedback.json)

The active `workshop` alias now points to the after-feedback set for both the repo copy and the web runtime copy.

## Current Startup Integrity Audit

The toolkit now runs a startup integrity audit when the page boots.

It checks:

- known workspace presets under `level_toolkit_web/workshop_progressions/`
- every referenced tutorial and level file
- canonical resolution against `levels/` first

Outputs:

- [reports/toolkit_startup_integrity.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/reports/toolkit_startup_integrity.json)
- [reports/toolkit_startup_integrity.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/reports/toolkit_startup_integrity.md)

If required paths are missing, the app shows a warning banner at the top before normal work continues.

## Current Progression Export

The progression export flow currently supports:

- progression CSV
- difficulty curve PNG
- progression layout PNG
- zipped progression package

The ZIP package currently includes:

- one JSON file per level
- one screenshot per level
- progression CSV
- difficulty curve image
- progression layout image

The repository also now contains bundle-style progression folders matching the existing `progression_a` structure:

- [bundles/progression_a](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/bundles/progression_a)
- [bundles/progression_b](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/bundles/progression_b)
- [bundles/progression_c](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/bundles/progression_c)

Recovery files created from screenshot-based progression layouts:

- [progressions/progressiona_recovered_from_screenshots.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressiona_recovered_from_screenshots.json)
- [progressions/progressionb_recovered_from_screenshots.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionb_recovered_from_screenshots.json)
- [progressions/progressionc_recovered_from_screenshots.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionc_recovered_from_screenshots.json)

Recovery notes:

- [reports/screenshot_progression_recovery.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/reports/screenshot_progression_recovery.md)

## Current Persistence

The toolkit currently persists:

- editor state
- current level
- manager items
- progression tabs
- slot order
- slot locks
- slot difficulty labels
- play session queue
- reference selections

Persistence currently uses:

- `localStorage` for workspace restore
- project files for explicit saves and exports
- manager metadata logs for tracking manager state changes
- manager progression materialization into canonical repo files under `progressions/` and `levels/`
- a workbook mirror for spreadsheet-style review and database tabs

The toolkit now separates:

- canonical project save root
- `Level Manager` output root

This means user-facing manager exports such as CSV, PNG, and ZIP can be redirected into a synced editorial folder without changing the canonical level and progression storage.

When the Level Manager changes now:

- assigned slot levels are materialized into the canonical `levels/` catalog
- progression configs are materialized into canonical files under `progressions/`
- this prevents browser-only progression layouts from being lost after a reset or crash

## Current Performance Mitigations

The manager currently includes performance guards for large catalogs:

- manager loading bar
- chunked rendering of many manager cards
- `All Levels` pagination
- no CSV table rendering unless `CSV Review` is open
- no duplicate rendering of the same card in hidden sections
- lazy preview caching in card views
- lighter workspace autosave that no longer serializes the editor through full validation on every manager refresh
- spreadsheet sync moved to a separate debounced path instead of blocking every manager mutation directly

## Current Spreadsheet Workflow

The toolkit now maintains a spreadsheet-oriented mirror for manager data:

- [output/spreadsheet/Levels_feed_the_bear_linked.xlsx](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/output/spreadsheet/Levels_feed_the_bear_linked.xlsx)

The workbook now includes:

- `Sheet1`
  - corrected legacy progression rows
- `progression all`
  - corrected legacy code/image rollup
- `levels after feedback`
  - same legacy-style structure, but populated with the recovered post-feedback A/B/C levels
- `extras`
  - the current extra levels outside the recovered main progressions
- `level manager db`
  - slot-based structured data
- `level manager items`
  - item-based structured data

The workbook generator now uses the active post-feedback progression set as its fallback progression source:

- [progressions/progressionA_after_feedback.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionA_after_feedback.json)
- [progressions/progressionB_after_feedback.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionB_after_feedback.json)
- [progressions/progressionC_after_feedback.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionC_after_feedback.json)

This replaces the older `recovered_from_screenshots` fallback for spreadsheet generation, so `levels after feedback` and the fallback manager database stay aligned with the current reviewed A/B/C set.

The toolkit can now:

- sync the workbook manually from `Level Manager`
- sync it from `Settings`
- auto-sync it after manager changes when enabled
- push the same payload one-way into Google Sheets through `Google Sheets API`
- keep `Apps Script` as a legacy fallback mode
- materialize manager-owned levels into the canonical `levels/` folder before spreadsheet export
- write `Extras` into both the dedicated `extras` tab and the structured `level manager items` tab

Preferred live sync implementation:

- [google_sheets_api.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/google_sheets_api.mjs)
- local OAuth client JSON:
  - `/.local/google_oauth_client.json`
- local OAuth token:
  - `/.local/google_sheets_token.json`
- local callback:
  - `http://127.0.0.1:8080/api/google-sheets-auth-callback`

## Current Improvement Direction

The current improvement direction is formalized in:

- [TOOLKIT_IMPROVEMENT_PLAN.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/TOOLKIT_IMPROVEMENT_PLAN.md)

The recommended order is:

1. Clean up the data contract and identity model
2. Add explicit progression versioning and save-point recovery
3. Harden performance for large catalogs and hidden-view work
4. Add a stronger visual comparison workspace for candidate levels

The immediate implementation priorities are:

- stable `level_id`, `progression_id`, and `slot_id`
- split autosave into lightweight state and heavy materialization
- progression save-point folders under `progressions/versions/`
- startup validation for missing or stale derived assets
- side-by-side compare mode in `Level Manager`

Legacy Apps Script scaffold:

- [google_sheets_sync/Code.gs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/google_sheets_sync/Code.gs)
- helper scripts:
  - [scripts/link_google_sheets_sync.sh](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/link_google_sheets_sync.sh)
- [scripts/push_google_sheets_sync.sh](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/push_google_sheets_sync.sh)
- [scripts/deploy_google_sheets_sync.sh](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/deploy_google_sheets_sync.sh)

`.clasp.json`, `/.local/google_oauth_client.json`, and `/.local/google_sheets_token.json` are local-only and must not be committed.

These changes reduce the UI freeze when many level files exist.

## Current Catalog Recommendation

Canonical active folders:

- standalone levels: [levels](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels)
- progressions: [progressions](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions)
- play sessions: [playtest](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/playtest)

Current dedupe rule:

- compare normalized JSON content within each category
- keep the newest file by filesystem modification time
- write only the kept winner into the canonical folder

Folders that should be treated as derived, archival, or historical rather than primary:

- [archive/catalog_cleanup_20260312](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/archive/catalog_cleanup_20260312)
- [level_toolkit_web/workshop_jsons](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/workshop_jsons)
- [level_toolkit_web/workshop_progressions](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/workshop_progressions)

## 2026-03-12 Catalog Cleanup

- Added [scripts/canonicalize_catalog.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/canonicalize_catalog.mjs)
- Added stable canonical level names:
  - `lvl_XXX_<slug>.json`
- Added indexes:
  - [levels/catalog_index.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/catalog_index.json)
  - [levels/catalog_index.csv](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/catalog_index.csv)
- Added report:
  - [catalog_canonicalization_report.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/reports/catalog_canonicalization_report.md)
- Current canonical counts:
  - levels: `118`
  - progressions: `38`
  - playtests: `23`
- Duplicate files removed from the active source set:
  - levels: `388`
  - progressions: `11`
  - playtests: `29`
- Manager state and logs now save into:
  - `progressions/manager_state/`
- A dedicated skill now exists for this repo's save-point/catalog problem:
  - [level-catalog-savepoints](/Users/victoria.serrano/.codex/skills/level-catalog-savepoints/SKILL.md)

## Known Limitations

- `All Levels` can still feel heavy with a large catalog, even after chunked rendering.
- The repository still contains many historical copies of levels outside the canonical `levels/`, `progressions/`, and `playtest/` folders.
- The procedural system is useful as a candidate generator, but still needs editorial curation.
- Some historic invalid levels still exist for diagnosis and should not be treated as production-ready levels.

## Suggested Next Updates

- add `Clear Debug Marks`
- add pagination or virtualization for `All Levels`
- reduce the remaining dependency on historical folders inside the runtime UI
- keep this document updated whenever a new workflow or save/export path changes

## Confluence / Design Page Status

- The Confluence page `Feed the bear - level design` has an updated lower documentation block covering:
  - `Level manager`
  - `The tool - level editor tool`
  - `Levels`
  - `Extras`
  - `Procedular`
- The page now includes a centered top callout:
  - `-> level design suggestion <--`
- The `Levels` section uses three progression contact sheets generated from the current A/B/C screenshot sets:
  - `output/confluence/progression_a_contact_sheet.png`
  - `output/confluence/progression_b_contact_sheet.png`
  - `output/confluence/progression_c_contact_sheet.png`
- The page hierarchy was then refined to keep more of the earlier content while making the page more presentation-friendly:
  - the top callout `-> level design suggestion <--` remains visible
  - detailed design-framework headings were demoted so the TOC stays readable
  - micro-labels such as `Name: Hungry Bear` are now normal paragraph labels instead of heading entries
- The page has now been extended with a more technical designer-facing documentation layer:
  - a fresh `Level Manager` screenshot
  - a fresh `Level Editor` screenshot
  - technical notes for the manager and editor
  - a `Designer workflow with vibe coding` section
  - a per-tool summary of learnings, mistakes, and resulting improvements
- Confluence attachments used for this pass:
  - `level_manager_overview.png`
  - `level_editor_overview.png`
- The page hierarchy was adjusted again so the editor explanation reads as a coherent block before the designer-workflow section.
- The intended Confluence information architecture is now:
  - product context
  - mechanics
  - level design principles
  - balancing
  - tools and workflow
  - extras
- A dedicated improvement plan now exists at:
  - [TOOLKIT_IMPROVEMENT_PLAN.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/TOOLKIT_IMPROVEMENT_PLAN.md)
- That plan is the current reference for:
  - performance work
  - progression recovery and versioning
  - visual level comparison flows
  - contract cleanup between toolkit data and spreadsheet reporting

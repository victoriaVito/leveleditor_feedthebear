# Feed the Bear Level Toolkit

This repository contains an internal web toolkit used to create, edit, playtest, validate, organize, and export puzzle levels for the Feed the Bear project.

It is not just a level editor. It is a working environment for:

- handcrafting levels
- validating puzzle layouts
- running playtest sessions
- building curated progressions
- separating valid vs discarded content
- generating procedural candidates
- learning from approved, rejected, and corrected levels

## Repository purpose

The project solves one practical problem:

- level design work was spread across many JSON files, screenshots, and ad-hoc review flows

The toolkit centralizes that workflow into one browser app plus one repository structure.

## How to run

Requirements:

- Node.js

Install dependencies:

```bash
npm install
```

Start the local server:

```bash
npm run start:web
```

Open:

- [http://127.0.0.1:8080](http://127.0.0.1:8080)

## Main project structure

### Application

- [level_toolkit_web](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web)
  - browser UI
  - editor, play, play sessions, manager, and procedural logic
- [server.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/server.mjs)
  - local HTTP server
  - static file serving
  - project-save endpoints for JSON and screenshots
- [progress.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progress.md)
  - implementation history and working notes
- [LEVEL_TOOLKIT_PRODUCT_NOTES.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/LEVEL_TOOLKIT_PRODUCT_NOTES.md)
  - product, UX, difficulty, and procedural thinking

### Catalog

- [levels](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels)
  - canonical standalone playable level catalog
- [progressions](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions)
  - canonical progression configs, bundles, and workspace presets
- [playtest](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/playtest)
  - canonical play session wrappers and review files

Recommended source of truth:

- standalone levels: [levels](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels)
- progression files: [progressions](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions)
- playtest/session files: [playtest](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/playtest)

## Level storage rules

The repository now uses a canonical split:

- `levels/`
  - one retained version per standalone level in the active catalog
- `progressions/`
  - one retained version per progression config, bundle, or workspace preset
- `playtest/`
  - one retained version per play session wrapper

Duplicate handling rule:

- duplicates are compared by normalized JSON content
- when duplicates match semantically, the newest file by filesystem modification time is kept in the canonical folder
- older duplicates are left in historical source folders but are no longer the canonical source of truth

Legacy folders are no longer part of the active source of truth.

Current rule:

- canonical source folders are `levels/`, `progressions/`, and `playtest/`
- legacy imports and pre-cleanup copies live under `archive/`
- `level_toolkit_web/workshop_jsons/` and `level_toolkit_web/workshop_progressions/` are runtime mirrors generated from the canonical source folders

## Core game model

The current toolkit models the puzzle with:

- rectangular boards using `board_width` and `board_height`
- board sizes from `4` to `8`
- orthogonal path connections
- blocked cells
- multiple endpoint pairs
- no path crossing
- no overlapping path occupancy
- stored `moves`
- computed `solution_count`
- difficulty labels `EASY`, `MEDIUM`, `HARD`

The toolkit supports both:

- modern JSON with `board_width` / `board_height`
- legacy JSON formats that are normalized on import

## Main views

### Procedural

Purpose:

- generate one candidate level
- generate a 10-level episode draft
- generate procedural batches
- export prepared workshop bundles

This view is about candidate generation, not final editorial approval.

### Level Editor + Play

Purpose:

- import a level
- edit blockers and endpoints
- set level number
- set level name
- set board width and height
- set difficulty and moves
- play the level directly
- validate the level
- save changes back to the linked manager or session item

Important editor behavior:

- level name is editable
- saving with the same name overwrites the managed file
- renaming changes the JSON and screenshot filenames used in project saves

### Play Sessions

Purpose:

- queue levels for review
- play levels in sequence
- validate selected levels
- approve or reject
- fix bad levels by sending them to the editor
- generate learned batches from review history

This is the main playtest flow.

### Level Manager

Purpose:

- import levels and progression configs
- build progressions visually
- reorder slots with drag and drop
- swap levels quickly
- clear slots and replace them from the pool
- lock slots
- assign `EASY`, `MEDIUM`, or `HARD` per slot
- review a CSV-style audit view

This is the main curation flow.

### Settings

Purpose:

- choose the project save path used by the toolkit
- choose the workbook path used for the linked spreadsheet mirror
- store the Google Spreadsheet ID used by the remote sync target
- choose the remote sync mode: `Workbook Only`, `Google Sheets API`, or legacy `Apps Script`
- store the Google OAuth client JSON path used by the Sheets API flow
- store the Google OAuth token path used by the Sheets API flow
- enable or disable automatic spreadsheet database sync

## Saving model

The toolkit separates two different save concepts:

### 1. Save inside the project

The browser app writes managed files into the repository using the local Node server.

Default save root:

- [minigame_locally](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally)

Typical outputs:

- `levels/`
- `progressions/manager_state/`
- `progressions/exports/`
- `playtest/`
- `bundles/`
- `output/spreadsheet/`

This is the default content-production save flow.

Note:

- the active catalog is written into the root canonical folders
- browser/runtime mirrors are regenerated from those canonical folders
- old source folders are archived under [archive](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/archive)

## Canonical naming

Standalone levels are now renamed to a stable canonical scheme:

- `lvl_001_<slug>.json`

The current index lives in:

- [levels/catalog_index.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/catalog_index.json)
- [levels/catalog_index.csv](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/catalog_index.csv)

This index records:

- canonical filename
- original source path
- alias paths
- board size
- pair count
- moves
- difficulty

## Save-point and recovery model

The toolkit now uses a stricter save-point strategy:

- `localStorage` is still used for fast workspace restore
- manager changes are also materialized into repo files
- active progression state is written into `progressions/`
- manager state snapshots and metadata logs are written into `progressions/manager_state/`
- play sessions are written into `playtest/`

## Playtest dataset

Playtest data is now saved in two forms:

- individual JSON session files in [playtest](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/playtest)
- one append-only text dataset for ML and analytics:
  - [playtest/playtest_events.jsonl](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/playtest/playtest_events.jsonl)

`JSONL` is used instead of one giant JSON blob because it is append-friendly, streamable, and easier to process in ML pipelines.

Each line includes:

- save timestamp
- origin
- save reason
- saved path
- solved state
- level name and number
- board size
- pairs
- blockers
- moves
- difficulty
- decal
- validation status
- history length
- per-pair path lengths
- full embedded session payload

This reduces the risk of losing browser-only progression layouts.

## Spreadsheet mirror and database sync

The project now includes a spreadsheet-oriented export pipeline for the Level Manager.

Workbook mirror:

- [output/spreadsheet/Levels_feed_the_bear_linked.xlsx](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/output/spreadsheet/Levels_feed_the_bear_linked.xlsx)

Script used to build or refresh it:

- [scripts/sync_levels_spreadsheet.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/sync_levels_spreadsheet.py)

The workbook currently contains:

- `Sheet1`
  - corrected legacy progression tracking
- `progression all`
  - corrected legacy code/image rollup
- `levels after feedback`
  - the old tab structure populated with the recovered post-feedback levels
- `extras`
  - levels that are not placed in the recovered A/B/C progressions
- `level manager db`
  - slot-oriented structured data for progression storage
- `level manager items`
  - item-oriented structured data for the full manager catalog

`Extras` behavior:

- `All Levels`
  - global pool of levels not currently placed in a main progression
- `Extras`
  - explicit editorial bucket for levels intentionally kept outside the main curves

Google sync behavior:

- workbook mirror is always updated locally
- the preferred remote path is `Google Sheets API`
- if `Google Sheets API` is enabled and connected, the same payload is pushed one-way to Google Sheets from the local server
- `Apps Script` remains available only as a legacy fallback mode
- Google Sheets is not treated as the editing authority
- manager-owned levels are materialized into the canonical `levels/` folder before workbook rows are rebuilt
- `Extras` is written both to the dedicated `extras` tab and to `level manager items` with `progression_key = extras`

Google Sheets API files:

- OAuth client JSON default path:
  - [/.local/google_oauth_client.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/.local/google_oauth_client.json)
- OAuth token default path:
  - [/.local/google_sheets_token.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/.local/google_sheets_token.json)
- API implementation:
  - [google_sheets_api.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/google_sheets_api.mjs)

OAuth callback used by the local server:

- `http://127.0.0.1:8080/api/google-sheets-auth-callback`

Legacy Apps Script scaffold:

- [google_sheets_sync](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/google_sheets_sync)

This scaffold is kept only as a fallback path for environments where Google Sheets API credentials are not available.

Recommended production flow:

1. place a Google OAuth desktop client JSON at `.local/google_oauth_client.json`
2. set `Google Sync Method = Google Sheets API`
3. click `Connect Google Sheets API`
4. complete OAuth in the browser
5. use `Sync Workbook Now` or manager autosync

Important:

- `.clasp.json` is generated locally by the helper workflow and must not be committed with personal or placeholder script IDs
- `.local/google_oauth_client.json` and `.local/google_sheets_token.json` are local-only secrets and must not be committed

### 2. Save to GitHub

Saving inside the project does not automatically publish anything.

GitHub publishing still requires:

- `git add`
- `git commit`
- `git push`

The repository is connected to:

- [https://github.com/victoriaVito/leveleditor_feedthebear.git](https://github.com/victoriaVito/leveleditor_feedthebear.git)

## Persistence behavior

The toolkit persists workspace state in the browser so reloads do not destroy context.

Saved state includes:

- current editor level
- current editor filename
- manager items
- progression order
- slot locks
- per-slot difficulty labels
- play session queue
- review state
- learned memory

Without persistence, the tool becomes too fragile for real level-design work.

## Design rules

These are the main workflow rules encoded into the product:

- keep progression building editorial, not fully automatic
- always keep slot 1 preloaded with the tutorial in every progression
- use `EASY`, `MEDIUM`, `HARD` as the visible difficulty language
- keep invalid levels out of main progressions
- send uncertain or overflow content to extra buckets instead of forcing them into curves
- prefer drag-and-drop curation over form-heavy ordering
- avoid redundant actions across views
- keep one main responsibility per view

## Difficulty thinking

Difficulty is not treated as one raw number.

The toolkit treats it as a combination of:

- board size
- pair count
- blocker count
- path interference
- solution count
- move pressure
- readability
- likelihood of early mistakes

Editorially, the most useful output is still:

- `EASY`
- `MEDIUM`
- `HARD`

Those labels are easier to discuss, assign to slots, and review visually than internal density codes.

## Procedural generation thinking

Procedural generation in this repo is meant to produce useful candidates, not final truth.

The intended loop is:

1. generate candidates
2. review them visually
3. approve, reject, or fix
4. store those outcomes
5. generate again using those outcomes

The strongest learning signals are:

- approved levels
- rejected levels
- corrected versions of rejected levels
- reference-marked levels
- slot difficulty labels
- designer notes

## Important presets

Examples:

- workshop workspace:
  - [http://127.0.0.1:8080/?reset_workspace=1&autoload_workspace=workshop](http://127.0.0.1:8080/?reset_workspace=1&autoload_workspace=workshop)
- `progressionA_afterTewak` workspace:
  - [http://127.0.0.1:8080/?reset_workspace=1&autoload_workspace=progressionA_afterTewak](http://127.0.0.1:8080/?reset_workspace=1&autoload_workspace=progressionA_afterTewak)
- single progression autoload:
  - [http://127.0.0.1:8080/?reset_workspace=1&autoload_progression=progressionA_new_levels_a&view=manager](http://127.0.0.1:8080/?reset_workspace=1&autoload_progression=progressionA_new_levels_a&view=manager)

## Files worth reading first

If someone new joins the project, start here:

- [README.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/README.md)
- [levels/README.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/README.md)
- [LEVEL_TOOLKIT_PRODUCT_NOTES.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/LEVEL_TOOLKIT_PRODUCT_NOTES.md)
- [progress.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progress.md)

## Current limitations

- the procedural generator is useful for candidate generation, but still needs manual curation for high-quality progressions
- some older generated levels remain archived for reference, even if they are not progression-ready
- `level_toolkit_web/workshop_jsons/` and `level_toolkit_web/workshop_progressions/` still exist as web-facing copies for browser import/autoload flows

## Summary

This repository is a level-design workspace.

The main idea is:

- keep all important level data in one place
- make editing and review fast
- preserve state
- separate progression curation from raw level storage
- support procedural generation without giving up designer control

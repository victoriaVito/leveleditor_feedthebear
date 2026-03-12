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

### Settings

Used for:

- configuring the project save path used by the toolkit

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

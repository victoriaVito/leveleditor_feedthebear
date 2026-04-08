# Bundles And Mixes

This document explains how Feed the Bear organizes original progressions, live ops mixes, and bundle exports on disk.

## 1. Concepts

`Original Progressions` are the authored source families. In the GDD they are the stable base curves, currently `Progression A`, `Progression B`, and `Progression C`.

`Live Ops Mixes` are recombined editorial sets built from those original families. They are a separate product from the originals and are meant for event-style or rotation-style content.

`Bundles` are the filesystem packages that hold a progression or mix in export form. A bundle usually groups the level JSON files, screenshots, CSV summary, and generated images that describe the curve.

The current repo snapshot also contains a small manager-state layer:

- `progressions/manager_state/` stores the editorial state for the Level Manager
- `progressions/manager_progressions_live.json` stores the live progression mapping used by the manager
- `bundles/manager/` stores manager-oriented exports and working CSVs

## 2. Directory Structure

### `bundles/`

This is the main bundle output area.

Current contents in the repo snapshot:

- `bundles/original_progression_a/`
- `bundles/original_progression_b/`
- `bundles/original_progression_c/`
- `bundles/original_progression_a.zip`
- `bundles/original_progression_b.zip`
- `bundles/original_progression_c.zip`
- `bundles/progression_a.zip`
- `bundles/progression_b_20260324_011701.zip`
- `bundles/progression_c_20260324_011524.zip`
- `bundles/manager/`

The original progression folders contain canonical progression exports. The root ZIP files are sibling archives for distribution or handoff.

### `bundles/original_progression_*`

Each original progression folder contains:

- `jsons/` for the level JSON files
- `screenshots/` for the PNG previews
- `<bundle>_progression.csv` for the slot summary
- `<bundle>_difficulty_curve.png` for the curve visualization
- `<bundle>_progression_layout.png` for the slot-layout visualization

Example:

- `bundles/original_progression_a/jsons/`
- `bundles/original_progression_a/screenshots/`
- `bundles/original_progression_a/original_progression_a_progression.csv`
- `bundles/original_progression_a/original_progression_a_difficulty_curve.png`
- `bundles/original_progression_a/original_progression_a_progression_layout.png`

### `bundles/manager/`

This folder is the manager-facing export area. In the current snapshot it contains:

- `bundles/manager/manager_levels.csv`
- `bundles/manager/progression_b/`

`manager_levels.csv` is the working summary used by the Level Manager and spreadsheet sync flows. The empty `progression_b/` directory looks like a placeholder or staging folder, but the exact producer is not obvious from the checked-in files alone. [VERIFY: `bundles/manager/progression_b/` is present but empty in this snapshot.]

### `progressions/`

This folder stores progression definitions and manager state.

Current files:

- `progressions/manager_progressions_live.json`
- `progressions/progression_d.json`
- `progressions/progression_e.json`
- `progressions/progression_f.json`
- `progressions/manager_state/level_manager_state.json`
- `progressions/manager_state/level_manager_metadata.json`

The standalone `progression_d/e/f.json` files are lightweight progression definitions with `name`, `tutorial_level_file`, and `slots`.

## 3. Bundle Format

A complete original-progression bundle currently includes:

- `jsons/<level>.json`
- `screenshots/<level>.png`
- `<bundle>_progression.csv`
- `<bundle>_difficulty_curve.png`
- `<bundle>_progression_layout.png`
- `<bundle>.zip` as the packaged archive

The CSVs expose the reviewer-facing summary columns used by the reporting flow, including `slot`, `file`, `saved_path`, `board`, `pairs`, `blockers`, `moves`, `difficulty`, and `status`.

The screenshot folder keeps the same file stem as the JSON, so `progression1_level1.json` maps to `progression1_level1.png`.

The live-ops materialization script also writes an extra manifest:

- `proposal_manifest.json`

That manifest records the spreadsheet proposal ID, folder name, source progression, suggestion text, tutorial file, file list, and materialization timestamp.

## 4. Mix Planner Flow

The mix materialization flow is spreadsheet-driven.

1. A proposal is prepared in the `Mix Planner` sheet.
2. The proposal must be approved and not already materialized.
3. `npm run materialize:mixes` runs `scripts/materialize_approved_mixes.mjs`.
4. The script reads the `Mix Planner` rows through Google Sheets API access.
5. It creates an output folder under `bundles/live_ops_mixes/<mix-folder>/`.
6. It copies the referenced level JSON files from `levels/` into `jsons/`.
7. It copies matching screenshots from `levels/screenshots/` when available.
8. It writes `<mix-folder>_progression.csv` and `proposal_manifest.json`.
9. It updates the `Mix Planner` row by setting `Materialized = TRUE` and filling `Output Folder`.

The current repo snapshot does not contain a `bundles/live_ops_mixes/` directory yet. The script targets that path by default, so the folder is expected to appear when the command is executed. [VERIFY: no live-ops mix output folder exists in the checked-in snapshot.]

## 5. Progression State

The Level Manager keeps its own saved state in `progressions/manager_state/`.

`level_manager_state.json` currently tracks:

- `saved_at`
- `reason`
- `active_tab`
- `selected_id`
- `filters`
- `counts`
- `extra_item_ids`
- `discarded_item_ids`
- `progression_order`
- `progressions`

The `progressions` object stores each progression tab, its lock state, and its slot array. Each slot can carry:

- `slot`
- `item_id`
- `file`
- `level`
- `level_id`
- `level_file`
- `board`
- `pairs`
- `blockers`
- `moves`
- `solutions`
- `difficulty`
- `status`
- `changed`
- `locked`
- `notes`

`level_manager_metadata.json` is a smaller companion file that keeps a subset of the same manager metadata for lightweight restore or indexing use.

`manager_progressions_live.json` holds the live progression definitions that the GUI can read directly. This includes the original progressions and the later manager-defined progression sets.

## 6. Bundle Lifecycle

### Creation

Original progression bundles are created from the canonical level files and screenshots. The reporting scripts and manager tools read those files from `levels/` and `levels/screenshots/`, then write bundle copies, CSV summaries, and ZIP archives.

### Update

When a staged rename is applied, `scripts/apply_sheet_level_renames.mjs` updates:

- canonical level filenames
- screenshot filenames
- bundle JSON and screenshot references
- bundle CSV references
- sibling ZIPs

This keeps bundle mirrors aligned with the renamed canonical files.

### Export

Bundles are exported in two main ways:

- as folder-based bundle trees under `bundles/original_progression_*`
- as ZIP archives at the bundle root

For live ops, the export target is `bundles/live_ops_mixes/` plus the generated CSV and manifest. [VERIFY: live-ops bundle naming may evolve if the spreadsheet columns or script defaults change.]

## Pending [VERIFY] Flags

- `bundles/manager/progression_b/` is present but empty in this snapshot, and its exact producer is not explicit in the checked-in files.
- `bundles/live_ops_mixes/` is the documented output target for `npm run materialize:mixes`, but it does not exist yet in the current snapshot.
- The live-ops bundle naming and folder conventions are driven by `scripts/materialize_approved_mixes.mjs`, so future spreadsheet or script changes could adjust the exact output shape.

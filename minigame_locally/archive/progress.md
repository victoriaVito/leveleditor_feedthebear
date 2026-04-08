# Progress

Original prompt: vete 1 por uno , valid alos moves, y saca screenshoot

- Reviewing imported image-based levels one by one in the web toolkit.
- Current batch under review: image29 to image34.
- Goal: confirm each level loads, compare stored `moves` with editor `Auto Moves` recommendation, and save screenshots.

- 2026-03-06: Loaded `image29` to `image34` in the web editor via Playwright.
- `moves` validation:
  - image29: stored 10, recommended 10
  - image30: stored 8, recommended 8
  - image31: stored 11, recommended 11
  - image32: stored 11, recommended 11
  - image33: stored 17, recommended 17
  - image34: stored 19, recommended 19
- Manager/editor validation:
  - image29 OK
  - image30 OK
  - image31 OK
  - image32 OK
  - image33 INVALID (`solution_count outside target density range`)
  - image34 INVALID (`solution_count outside target density range`)
- Screenshots saved in `artifacts/level_screenshots/`.
- 2026-03-06: Added editable progression proposal in `levels/progressions/progression_assignments_2026-03-06.json`.
- Reserved slot 1 for tutorial in each of `progressionA`, `progressionB`, and `progressionC`.
- Added `progressionExtra` for overflow, ambiguous placement, and invalid/unsolved levels.
- 2026-03-06: Added `levels/standalone/tutorial_level.json` from the tutorial screenshot.
- 2026-03-06: Materialized progression files:
  - `levels/progressions/progressionA_workshop.json`
  - `levels/progressions/progressionB_workshop.json`
  - `levels/progressions/progressionC_workshop.json`
  - `levels/progressions/progressionExtra_workshop.json`
- Moved `image09_level_editor.json` out of the main A/B/C curves into `extra` as the least-fitting single-solution outlier.
- Promoted `image03_level_editor.json` from overflow into `progressionC`.
- 2026-03-06: Built `niveles_workshop/` with:
  - `niveles_workshop/jsons/`
  - `niveles_workshop/screenshots/`
- Imported all `niveles_workshop/jsons/*.json` into the web `Level Manager`.
- Level Manager summary after import:
  - Files: 35
  - Valid: 30
- 2026-03-09: Synced `progressionA_workshop.json` into:
  - `levels/progressions/progressions_only/progressionA_workshop.json`
  - `levels/progressions/progressions_only/progressionA_bundle.json`
  - `level_toolkit_web/workshop_progressions/progressionA_bundle.json`
- 2026-03-09: Added URL bootstrap support in the web toolkit:
  - `?reset_workspace=1` clears saved workspace state while keeping settings
  - `?autoload_progression=progressionA|progressionB|progressionC|progressionExtra` loads a progression bundle into Level Manager
  - `?view=manager` opens the manager directly after autoload
- 2026-03-09: Opened the toolkit with:
  - `http://127.0.0.1:8080/?reset_workspace=1&autoload_progression=progressionA&view=manager`
  so the app starts with the updated Progression A instead of stale checkpoint data.
- 2026-03-09: Added `progressionA_afterTewak` using the current approved Progression A slot order:
  - `levels/progressions/progressionA_afterTewak.json`
  - `levels/progressions/progressions_only/progressionA_afterTewak.json`
  - `levels/progressions/progressions_only/progressionA_afterTewak_bundle.json`
  - `level_toolkit_web/workshop_progressions/progressionA_afterTewak_bundle.json`
- 2026-03-09: Added query autoload support for `progressionA_afterTewak`.
- 2026-03-09: Added minimal workspace preset with only `progressionA_afterTewak` levels:
  - `level_toolkit_web/workshop_progressions/progressionA_afterTewak_workspace.json`
  - URL: `?reset_workspace=1&autoload_workspace=progressionA_afterTewak&autoload_session_progression=progressionA_afterTewak&manager_tab=progressionA_afterTewak&view=manager`
- 2026-03-09: Added editable `Level Name` field in `Level Editor`.
  - The editor now carries the filename when opening a level from manager/session/import.
  - `Save Changes` updates the linked manager/session item filename.
  - Saves now overwrite the same managed project file when the name stays the same.
  - Renaming the level changes the saved JSON/screenshot filename inside the project.
- 2026-03-12: Added `PROCEDURAL_GENERATION_LOGIC.md`.
  - This document deconstructs the current procedural level generator in English.
  - It explains design intention, visual design implications, solver-backed blocker shaping, and the current limits of the generator.
- 2026-03-09: Added `progressionA_new_levels_a` to the toolkit:
  - source config: `levels/progressions/progressionA_new_levels_a.json`
  - progressions copy: `levels/progressions/progressions_only/progressionA_new_levels_a.json`
  - bundle: `levels/progressions/progressions_only/progressionA_new_levels_a_bundle.json`
  - web bundle: `level_toolkit_web/workshop_progressions/progressionA_new_levels_a_bundle.json`
  - copied `new_level1_a.json` ... `new_level10_a.json` into `level_toolkit_web/workshop_jsons/`
  - query autoload key: `autoload_progression=progressionA_new_levels_a`
  - Invalid: 5

- 2026-03-07: Reworked Play Mode input for faster tracing.
- Added pointer-based drag on the canvas, endpoint auto-detection, and touch-action disabling in `level_toolkit_web/app.js` + `level_toolkit_web/styles.css`.
- Goal: make path drawing feel continuous instead of click-by-click.

- 2026-03-07: Added a dedicated `Play Sessions` tab.
- It can import created levels, add the current editor level, validate, approve/reject, export the queue, and generate learned procedural batches.
- `Play Selected` sends the chosen level into the editor with `Play ON` so session review is separate from manual editing.
- 2026-03-07: `Play Sessions` learned generation now retries for valid levels before queueing them.
- 2026-03-07: `Play Sessions` now has its own playable canvas and play controls, without forcing a jump back to the editor.
- 2026-03-07: Session review now auto-advances to the next queued level after validate/approve/reject.

- 2026-03-07: Added correction-learning flow for rejected session levels.
- `Edit Selected` sends a session item to the editor, `Save Fix To Session` stores the correction, records a learned delta, and uses it in future procedural scoring.
- Added a preview mosaic in `Play Sessions` with per-card play/edit/approve/reject actions for batch review.

- 2026-03-08: Rebuilt Level Manager as a visual progression planner.
- Added 10 ordered slots, drag-and-drop reordering/swapping, a lower pool of available levels, and export of the arranged progression.

- 2026-03-08: Added slot locking and visible level-path information to the visual Level Manager.
- 2026-03-09: Hardened JSON imports across editor, sessions, and manager.
- Added import normalization for:
  - canonical level JSON (`board_size`, `pairs`, `blockers`)
  - `gridSize`-based level JSON (`pairs[].a/b`, `blockers`)
  - progression bundles with embedded levels
  - progression configs that point to files exposed in `level_toolkit_web/workshop_jsons`
- Non-square imported levels are padded to the nearest supported square board size when imported into the editor/session flow.
- Added explicit import errors for non-playable JSON instead of vague parse failures.
- 2026-03-09: Reordered Level Manager to show:
  - `Progression Order`
  - `CSV Preview`
  - `All Imported Levels`
- `All Imported Levels` now shows every imported item, not only the unslotted pool.
- Copied `levels/standalone/from_downloads_fixed/*.json` into `level_toolkit_web/workshop_jsons/` so `progressionA_workshop.json` can be expanded correctly inside the browser.
- Verified with Playwright:
  - current level JSON imports into editor and can enter `Play ON`
  - `levels/standalone/1_b_easy.json` imports into editor
  - `levels/progressions/progressionA_workshop.json` imports into Level Manager with 10 rows, 10 slot cards, and 0 parse errors
- 2026-03-09: Reduced redundant UI buttons.
- Removed duplicate or low-signal controls:
  - procedural CSV downloads from the top playground
  - editor `Play Pair` selector
  - editor `Clear Learning`
  - session toolbar duplicates for edit/play/approve/reject

- 2026-03-18: Simplified the active `Procedural` view so it now focuses on `Reference Generator`.
- Archived the removed `Episode Builder`, `Level Generator`, and `Workshop Extras` sections in:
  - `archive/procedural_playground_removed_ui_20260318.md`
- Improved `Reference Generator` visibility:
  - added a persistent base-level preview card
  - added an explicit empty-state message when no variants are present yet
- Follow-up note saved in:
  - `archive/procedural_reference_generator_followup_20260318.md`

- 2026-03-16: Added a reference-driven procedural review flow in the web toolkit.
- `Procedural` now includes a `Reference Generator` block:
  - choose one base level JSON
  - generate 3 reference-driven variants
  - preview each with solution overlay and route text
  - rename, keep, discard, send to editor, or save each candidate
- Learning integration:
  - keep/save -> approved learning memory
  - discard -> rejected learning memory
  - solved play sessions now also feed approved learning memory with session metrics
- Files touched:
  - `level_toolkit_web/index.html`
  - `level_toolkit_web/styles.css`
  - `level_toolkit_web/app.js`
- Validation:
  - `node --check level_toolkit_web/app.js` passes
  - Browser automation could not be completed because Playwright's Chrome session was blocked by an existing persistent Chrome session on this machine.
- 2026-03-17: Tightened the procedural learnings around discard reasons and solution quality.
- New behavior:
  - discarding a procedural variant now prompts for a reason
  - discarding now also prompts for the pair or pairs that feel wrong
  - the reason is stored into learning memory as `reason_text` + `reason_code`
  - affected pairs are stored as `pair_ids`
  - current reason taxonomy includes `paths_cross`, `misleading_solution`, `too_easy`, `too_hard`, `bad_layout`, and `custom_feedback`
- Solver change:
  - generated levels now try to expose `golden_path` from a real solver-backed solution instead of the earlier simple scaffold path
  - reference variants with crossed guide paths are filtered out before being shown
  - learning score now penalizes future candidates that match rejected guide issues such as `paths_cross`
  - pair-specific rejections also add weight against future variants that repeat the same problematic pair patterns
- Validation:
  - `node --check level_toolkit_web/app.js` passes after the discard-reason and solver-path updates
- 2026-03-17: Replaced prompt-based procedural discard with inline UI controls.
- Each procedural candidate card now includes:
  - discard reason select
  - clickable pair chips
  - optional free-text note
  - inline discard action without browser prompts
- Visual check:
  - generated screenshot `tmp/procedural_review/reference-generator-inline-discard.png`
  - layout fits and the inline discard controls render correctly inside the candidate cards

- 2026-03-17: Second-pass procedural + editor quality improvements.
- Procedural quality:
  - Guide validation now checks more than overlaps: endpoint direction, adjacency, bounds, blockers, and foreign endpoints.
  - Reference candidates now filter critical guide issues using `hasCriticalGuideIssue(...)`.
  - Candidate search expanded (adaptive pool target + higher seed budget) to keep quality while still finding enough options.
- Learning quality:
  - Rejection pair feedback is now stored structurally (`pair_feedback`) instead of relying on raw pair IDs only.
  - Scoring now uses pair-feature similarity distance against rejected pair feedback, preventing the over-penalty bug where rejecting pair `A` globally hurt almost all candidates.
  - Discard now validates reason and pair input before committing learning entries.
- Editor usability:
  - Play toggle label now reflects actual state (`Play Mode ON` when off, `Play Mode OFF` when on) through `updatePlayToggleButton()`.
- Validation:
  - `node --check level_toolkit_web/app.js` passes.
  - session `Play Mode ON` toggle in favor of card-driven play
- Kept the meaningful actions and verified key flows still work in Playwright with no runtime errors.
- 2026-03-09: Centralized responsibilities across Level Manager, Level Editor, and Play Sessions.
- New split:
  - Level Manager: order levels, assign difficulty, export, open an item for editing
  - Level Editor + Play: edit, play, validate, export, and save changes back to the linked source
  - Play Sessions: play, validate, approve/reject, and edit via the cards
- Replaced editor density input with difficulty dropdown (`EASY` / `MEDIUM` / `HARD`).
- Added manager difficulty dropdown for the selected item.
- Added explicit save state in the editor:
  - `Unsaved changes` tag when modifying a linked level
  - `Save Changes` persists back to manager/session items
  - standalone save writes the current level to localStorage draft and restores it on reload
- `CSV Review` now shows:
  - screenshot thumbnail
  - difficulty
  - whether the level has been changed
- Verified with Playwright:
  - saving from editor back to a manager item marks `Changed = Yes`
  - saving from editor back to a session item marks the row as `FIXED`
  - CSV review renders screenshots for imported manager rows
- 2026-03-09: Added full workspace checkpoint persistence in localStorage.
- Restored on reload:
  - current editor level + difficulty + moves + link metadata
  - imported Level Manager items, slot order, locks, and selected item
  - Play Sessions queue and selection state
  - generated progression/procedural batches
- Verified with Playwright:
  - imported manager levels survive reload
  - imported session levels survive reload
  - editor returns with the previously edited level and saved metadata
- 2026-03-09: Reworked Level Manager into internal tabs.
- Tabs now:
  - `Progression A`
  - `Progression B`
  - `Progression C`
  - `All Levels` (only levels not assigned to A/B/C)
  - `CSV Review`
- Progression bundle imports for A/B/C now populate their matching tabs.
- Verified with Playwright:
  - `progressionA_workshop.json` fills Progression A
  - `progressionB_workshop.json` fills Progression B
  - a standalone imported level remains visible in `All Levels`
  - `CSV Review` is a separate tab and lists all imported rows
- 2026-03-10: Restyled `Play Sessions` cards to match the review-template mock more closely.
- Changes:
  - preview cards now use a fixed 5-column desktop grid, stronger header/meta hierarchy, and a framed board preview
  - action buttons render in a compact grid matching the card mock
  - session table text columns are left-aligned for `Source` and `File`
  - the session play board moved into a hidden panel and no longer opens automatically when loading a progression
  - approving/rejecting a non-active card now advances selection without forcing the board open
- Verified with Playwright CLI:
  - `?autoload_workspace=workshop&autoload_session_progression=progressionA&view=sessions` renders 10 cards
  - `#session-play-panel` stays hidden until `Play` is pressed
  - screenshot saved to `artifacts/session_templates_after.png`
- 2026-03-10: Added Level Manager filters for search and category-based narrowing.
- New filters:
  - name search
  - dimensions
  - difficulty
  - status
  - level number
  - pairs count
  - blockers count
  - placement
  - changed yes/no
- Behavior:
  - filters apply to the manager pool, `All Levels`, and `CSV Review`
  - filter values persist in workspace state and reset with `Reset Filters`
- Verified with Playwright CLI:
  - filter controls render in `Level Manager`
  - name filtering updates the visible manager cards
  - dimension filtering updates `CSV Review`
  - screenshot saved to `artifacts/manager_filters.png`
- 2026-03-10: Added continuous Level Manager metadata persistence.
- New behavior:
  - debounced autosave of the manager state snapshot to `manager/level_manager_state.json`
  - append-only metadata log to `manager/level_manager_metadata.log.jsonl`
  - metadata includes active tab, selected item, filters, counts, progression slot content, and item summaries
- Added `/api/append-file` in `server.mjs` to support append-only logs from the toolkit.
- Goal: make Level Manager changes recoverable and auditable without relying only on localStorage.
- 2026-03-10: Reworked progression export in Level Manager.
- `Download Progression ZIP` now creates a zipped folder named after the active progression.
- ZIP contents:
  - progression CSV
  - progression difficulty curve PNG
  - progression layout PNG
  - `jsons/` with each level JSON in the progression
  - `screenshots/` with one preview PNG per level
- Added `/api/create-zip` in `server.mjs` so progression bundles are saved inside the project instead of downloading loose files.
2026-03-11: Fixed 5th pair support in Level Editor. loadLevelToEditor() now rebuilds pairs using PAIR_IDS, added explicit pair color badge, and restarted the toolkit server for verification.
2026-03-11: Updated editor pair palette to 5 clearly distinct colors: A blue, B green, C orange, D pink, E purple.
2026-03-11: Added Debug Mark mode to Level Editor. Debug cell marks are visual-only, reset on load/reset, and do not serialize into saved JSON. Added difficulty-based card backgrounds in Level Manager.
2026-03-11: Expanded Settings with theme colors, font, pair colors A-E, active pair count, default board/difficulty, performance profile (low/medium/high), and a clear-cache action. Performance profile now disables several preview surfaces to speed up heavy catalogs.
2026-03-11: Reduced hidden-view work by making restore/bootstrap refresh only the visible view, delayed preview recreation from saved workspace state, created reports/toolkit_file_retention_log.md, and cleaned recoverable temporary artifacts under levels/standalone/toolkit_exports.
2026-03-11: Reworked level validation to focus on solvability instead of density bands. Added `Decal` checkbox to Level Editor; when enabled, validation now requires at least one solution that covers every free cell. Updated level serialization, editor state restore, CSV export fields, and LEVEL_TOOLKIT_LIVE_STATUS.md accordingly.
2026-03-11: Performance audit pass on the toolkit. Main hotspots found in manager/session flows: persistWorkspaceState() serializes levelFromEditor() on many UI updates, updateManagerTable() triggers several full downstream renders on each change, manager/session tables rebuild whole DOM trees repeatedly, preview generation still creates many canvas -> dataURL conversions, and getManagerItemById()/findManagerSlotIndex() remain linear lookups inside render-heavy paths. Recommended next step: decouple autosave from solver, add item/slot indexes, and virtualize or paginate All Levels.
2026-03-11: Added a new local skill at ~/.codex/skills/web-toolkit-performance/SKILL.md for future performance passes. Also added a manager UX shortcut: empty progression slots can now enter a waiting `Ref` state, and a level from `All Levels` can be assigned directly into that slot via the card ref button.
2026-03-11: Implemented the first heavy performance block. Workspace autosave now stores a lightweight editor snapshot instead of recomputing through levelFromEditor(), manager items and slot placement now have in-memory indexes, preview generation is lazier, and All Levels now uses pagination controls instead of trying to render the full catalog at once.
2026-03-11: Enforced a hard tutorial-slot rule across the toolkit. Every progression now preloads `tutorial_level.json` into slot 1, slot 1 cannot be cleared or replaced from Level Manager, and the editor refuses to overwrite slot 1 with a non-tutorial level.
2026-03-11: Reorganized the repository into canonical content folders at the project root:
  - `levels/` for standalone playable levels
  - `progressions/` for progression configs, bundles, and workspace presets
  - `playtest/` for play session wrapper files
- Added `scripts/reorganize_level_assets.mjs` to scan all JSON files, classify them, dedupe them by normalized content, and keep the newest file by filesystem modification time.
- Current canonical catalog summary from `reports/catalog_reorg_report.json`:
  - levels kept: 121
  - progressions kept: 19
  - playtest files kept: 26
  - level duplicates removed from the canonical set: 229
  - progression duplicates removed from the canonical set: 8
- Archived folders such as `levels/standalone/`, `level_toolkit_web/workshop_jsons/`, and `niveles_workshop/` remain on disk for traceability, but the canonical source of truth is now the root-level `levels/`, `progressions/`, and `playtest/` folders.
2026-03-12: Added progression bundle folders for B and C to mirror the existing `bundles/progression_a/` structure.
- New folders:
  - `bundles/progression_b/`
  - `bundles/progression_c/`
- Each folder now contains:
  - `jsons/`
  - `screenshots/`
  - progression CSV
  - difficulty curve PNG
  - progression layout PNG
- Matching ZIPs were also generated:
  - `bundles/progression_b.zip`
  - `bundles/progression_c.zip`
- Added reusable builder script:
  - `scripts/build_progression_folder.py`
2026-03-12: Investigated why screenshot-based A/B/C progression layouts were not preserved.
- Root cause:
  - the cards shown in the screenshots were real UI state, but several slot labels such as `progression_b_slot_7.json` or `progression_c_slot_5.json` were transient browser-session names, not canonical repo files
  - the manager had been saving a technical state snapshot, but not materializing active progression configs and assigned levels into canonical repo files on every manager change
- Fix:
  - Level Manager autosave now materializes assigned levels into `levels/`
  - Level Manager autosave now materializes progression configs into `progressions/`
  - this makes A/B/C layouts survive resets and browser-only session loss
2026-03-12: Completed a full catalog cleanup and naming pass.
- Added `scripts/canonicalize_catalog.mjs` to:
  - scan every JSON candidate in the repo
  - classify levels, progressions, and playtests
  - choose duplicate winners by normalized content plus newest mtime
  - rewrite the canonical source folders
- archive pre-cleanup folders and root JSON files under `archive/catalog_cleanup_20260312/`
- resync `level_toolkit_web/workshop_jsons/` and `level_toolkit_web/workshop_progressions/`
2026-03-12: Added direct Google Sheets API integration as the main live sync path.
- Added [google_sheets_api.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/google_sheets_api.mjs) to handle:
  - OAuth client loading
  - token persistence
  - browser auth URL generation
  - callback code exchange
  - token refresh
  - direct tab upserts into Google Sheets
- Extended [server.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/server.mjs) with:
  - `/api/google-sheets-auth-url`
  - `/api/google-sheets-status`
  - `/api/google-sheets-disconnect`
  - `/api/google-sheets-auth-callback`
  - `googleSyncMethod = sheets_api` support inside `/api/sync-levels-workbook`
- Extended Settings in the web UI with:
  - `Google Sync Method`
  - `OAuth Client JSON Path`
  - `OAuth Token Path`
  - `Connect Google Sheets API`
  - `Check Google Sheets API`
  - `Disconnect Google Sheets API`
2026-03-12: Added a unified playtest dataset log for ML and analytics.
- Play sessions still save as individual JSON files in [playtest](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/playtest).
- The toolkit now also appends every saved session to:
  - `playtest/playtest_events.jsonl`
- The JSONL record includes session metadata, board metadata, difficulty, validation state, path lengths, and the embedded session payload.
- Canonical level files now use `lvl_XXX_<slug>.json`
- Added `levels/catalog_index.json` and `levels/catalog_index.csv`
- Current canonical counts after cleanup:
  - levels: 118
  - progressions: 38
  - playtests: 23
- Added 9 extra canonical levels (`lvl_110` to `lvl_118`) to preserve the previously inferred screenshot-only slots from recovered B/C progressions as real repo files.
- Updated toolkit save paths:
  - manager state/logs now save into `progressions/manager_state/`
  - progression CSV exports now save into `progressions/exports/`
  - play session files now save into `playtest/`
  - default project save root is now the project root instead of `levels/standalone/toolkit_exports`
- Added new local skill:
  - `~/.codex/skills/level-catalog-savepoints/SKILL.md`
  - purpose: canonical catalogs, duplicate cleanup, save-point recovery, and progression materialization

## 2026-03-12 - spreadsheet sync and feedback workbook

- Added a spreadsheet repair and sync pipeline for the level catalog:
  - `scripts/sync_levels_spreadsheet.py`
- Added workbook mirror:
  - `output/spreadsheet/Levels_feed_the_bear_linked.xlsx`
- Fixed the previous workbook mismatch where `Progression B slot 10` pointed to `progressionA_level10_hard.json`.
- Added spreadsheet tabs:
  - `levels after feedback`
  - `extras`
  - `level manager db`
- `base- template`
- `log`
- Added local server endpoint:
  - `/api/sync-levels-workbook`
- Added manager and settings actions to sync the workbook mirror.
- Added `Extras` as a persistent Level Manager bucket, separate from `All Levels`.
- Materialized manager-owned level files into canonical `levels/` before writing workbook rows, so spreadsheet export no longer depends on browser-only names.
- Updated structured spreadsheet export to keep `Extras` data in `level manager db`, which now also tracks the new `log` tab and lets us drop the redundant `level manager items` sheet.

## 2026-03-12 - workshop preset resolution fix

- Fixed the runtime level resolver in `level_toolkit_web/app.js` so workshop references try:
  - `levels/`
  - `level_toolkit_web/workshop_jsons/`
  - `level_toolkit_web/workshop_jsons_game_unique/`
- Extended `server.mjs` to serve canonical repo folders over HTTP:
  - `/levels/`
  - `/progressions/`
  - `/playtest/`
  - `/bundles/`
- Repopulated missing workshop filenames in root `levels/` from the archived catalog so the earlier `A/B/C` preset names resolve again.
- Resynchronized `level_toolkit_web/workshop_progressions/workshop_workspace.json` with `progressions/workshop_workspace.json`.
- Verified in browser that `Progression A` now resolves to the expected workshop names again instead of the accidental `lvl_*` aliases.

## 2026-03-12 - startup integrity logging

- Added a startup integrity audit in `level_toolkit_web/app.js`.
- The audit checks known workspace presets and every referenced level path before normal work continues.
- Added a top-of-page warning banner in `level_toolkit_web/index.html` and `level_toolkit_web/styles.css`.
- The audit writes persistent reports to:
  - `reports/toolkit_startup_integrity.json`
  - `reports/toolkit_startup_integrity.md`
- Missing preset or level references are now surfaced at boot instead of only showing up later as broken progression loads.

## 2026-03-12 - after feedback progression set

- Reconstructed the screenshot-based `A/B/C` set as:
  - `progressions/progressionA_after_feedback.json`
  - `progressions/progressionB_after_feedback.json`
  - `progressions/progressionC_after_feedback.json`
- Materialized the screenshot-visible filenames into root `levels/` so the set no longer depends on archive-only copies.
- Added friendly aliases for the progression C late slots:
  - `levels/progression_level8_Medium.json`
  - `levels/progression_level9_Hard.json`
  - `levels/progression_level10_Hard.json`
- Switched the active `workshop` alias and `workshop_workspace.json` to the after-feedback set.
- Updated the progression bundle builder so mixed canonical and `gridSize`-based JSON levels export correctly.

## 2026-03-12 - ABC design learnings note

- The note emphasizes:
  - design intention
  - visual design
  - layout readability
  - blocker placement
  - path interference
- It is meant as a compact reference for future progression work and procedural design decisions.

## 2026-03-12 - Confluence level design page cleanup

- Cleaned the Confluence page `Feed the bear - level design` in the `Level manager` / `Levels` / `Extras` / `Procedular` area.
- Replaced the broken lower navigation/macros with a cleaner heading structure so the page TOC is easier to follow.
- Added a centered top callout:
  - `-> level design suggestion <--`
- Rewrote the `Level manager` section to explain the toolkit workflow in clearer English.
- Rewrote `The tool - level editor tool` with a more explicit editor/playtest explanation.
- Rebuilt `Levels` as three progression boxes using uploaded contact sheets for:
  - progression A
  - progression B
  - progression C
- Added/used Confluence-ready contact sheets stored locally in:
  - `output/confluence/progression_a_contact_sheet.png`
  - `output/confluence/progression_b_contact_sheet.png`
  - `output/confluence/progression_c_contact_sheet.png`

## 2026-03-12 - Confluence heading hierarchy pass

- Re-read the published `Feed the bear - level design` page and adjusted heading levels conservatively instead of deleting earlier content blocks.
- Reduced TOC noise by:
  - limiting the TOC macro to top-level sections
  - demoting detailed `Level design` craft headings from `H1` to `H3`
  - demoting procedural sub-sections from `H4` to `H3`
  - converting noisy micro-headings like `Name: Hungry Bear` into normal paragraph labels
- Re-added the top callout box so the page still opens with:
  - `-> level design suggestion <--`
- Published the updated page after checking that the TOC now shows a shorter section list.

## 2026-03-12 - Confluence technical documentation pass

- Captured fresh toolkit screenshots from the real local app for documentation:
  - `output/confluence/level_manager_overview.png`
  - `output/confluence/level_editor_overview.png`
- Uploaded both screenshots as Confluence page attachments.
- Extended the page without deleting the earlier design notes.
- Expanded `Level manager` with a technical explanation focused on:
  - editorial sequencing
  - slot identity
  - progression intent
  - visual and data alignment
- Expanded `The tool - level editor tool` with a technical explanation focused on:
  - authorship
  - solvability
  - blocker placement
  - path interference
  - move tuning
- Added a new section:
  - `Designer workflow with vibe coding`
- Added a per-tool summary of:
  - what each tool taught us
  - main mistakes
  - improvements derived from those mistakes
- Kept the page hierarchy presentation-friendly by:
  - preserving the earlier content
  - keeping the new material grouped into top-level sections
  - leaving the TOC readable instead of expanding every micro-subsection

## 2026-03-12 - Confluence hierarchy and structure pass

- Revisited the published `Feed the bear - level design` page after the technical documentation pass.
- Reordered the inserted editor-related content so the `Level editor` explanation and screenshot stay together before the new designer-workflow section.
- Kept the original earlier page text intact and continued to build on top of it instead of replacing it.
- Confirmed the visible top-level TOC is now compact and presentation-friendly, with the main entries:
  - `Mini-game 1`
  - `Feed the bear - game objective`
  - `Mechanics`
  - `Level design`
  - `Balancing strategy - in terms of game design`
  - `Balancing strategy - in terms of level design`
  - `Level manager`
  - `The tool - level editor tool`
  - `Designer workflow with vibe coding`
  - `Extras`
  - `Procedular`
- Defined the recommended editorial structure for the page as:
  - game context
  - mechanics
  - level design principles
  - balancing
  - toolchain (`Level manager`, `Level editor`, `Designer workflow`, `Procedular`)
  - extras / supporting material

## 2026-03-12 - Toolkit improvement plan

- The plan covers:
  - faster large-catalog rendering and less hidden-view work
  - clearer progression versioning and save-point recovery
  - tighter visual comparison flows between candidate levels
  - a cleaner data contract between toolkit state, exports, and spreadsheet sync
- Expanded the plan into a more detailed implementation roadmap with:
  - design principles
  - best-approach rationale for each area
  - implementation phases
  - risks
  - success criteria
  - recommended delivery order
  - milestone breakdown
  - immediate next technical changes worth shipping first

## 2026-03-12 - Spreadsheet switched to after-feedback progressions

- Updated [scripts/sync_levels_spreadsheet.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/sync_levels_spreadsheet.py) so the workbook generator now uses:
  - [progressions/progressionA_after_feedback.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionA_after_feedback.json)
  - [progressions/progressionB_after_feedback.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionB_after_feedback.json)
  - [progressions/progressionC_after_feedback.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions/progressionC_after_feedback.json)
  instead of the older recovered-from-screenshots files.
- Regenerated:
  - [output/spreadsheet/Levels_feed_the_bear_linked.xlsx](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/output/spreadsheet/Levels_feed_the_bear_linked.xlsx)
  - [output/spreadsheet/Levels_feed_the_bear_linked_payload.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/output/spreadsheet/Levels_feed_the_bear_linked_payload.json)
- Verified that `levels after feedback` and the secondary `level manager db` tab now reflect the `A/B/C after feedback` file set (`p_2_a.json`, `p_2_b.json`, `p_2_c.json`, etc.).

## 2026-03-12 - Dedicated Level Manager output path

- Added a separate `Level Manager Output Path` in `Settings`.
- The toolkit now distinguishes between:
  - canonical project save root
  - editorial manager output root
- `Level Manager` exports now write to the dedicated manager output path:
  - manager CSV
  - progression CSV
  - progression curve PNG
  - progression layout PNG
  - progression ZIP
- The intent is to allow the manager outputs to target a synced editorial folder without mixing those artifacts into the canonical level and progression save flow.
- The plan also proposes an implementation order so the next work can be prioritized pragmatically.

## 2026-03-12 - Confluence repository and installation intro

- Updated the Confluence page `Feed the bear - level design`.
- Added a new early section:
  - `Toolkit repository and setup`
- This new section includes:
  - the GitHub repository link
  - a short install and run guide
  - the canonical bundle locations under `bundles/`
  - a reminder that `levels/`, `progressions/`, and `playtest/` are the canonical project folders
- The page was published successfully after the edit.

## 2026-03-12 - New documentation and structure skills

- Added three local Codex skills to support ongoing project documentation work:
  - `documentation-crafting`
  - `confluence-documentation`
  - `information-architecture-docs`
- These skills are intended to improve:
  - English documentation quality
  - Confluence editing and publishing workflows
  - hierarchy, taxonomy, and source-of-truth structure across docs and folders

## 2026-03-12 - New project-specific knowledge skill

- Added a project-specific skill:
  - `level-design-knowledge-system`
- This skill is intended to help maintain coherence across:
  - `levels/`
  - `progressions/`
  - `playtest/`
  - bundle exports
  - spreadsheet reporting
  - Confluence documentation
- It formalizes the distinction between:
  - canonical source files
  - runtime mirrors
  - export artifacts
  - external knowledge surfaces

## 2026-03-12 - New progression recovery skill

- Added a project-operational skill:
  - `progression-recovery-and-sync`
- It is intended to handle:
  - progression reconstruction
  - slot-by-slot validation
  - bundle regeneration
  - workbook/spreadsheet alignment
  - recovery from screenshots, manager state, or partial exports

## 2026-03-12 - New Level Manager contract skill

- Added a data-contract skill:
  - `level-manager-data-contract`
- It is intended to formalize:
  - stable level, progression, slot, item, and savepoint identity
  - canonical-vs-operational-vs-export-vs-reporting layers
  - write order between files, manager state, bundles, and spreadsheet sync

## 2026-03-12 - Confluence levels section completed from Bear drive

- Completed and published the `Level design - the levels` section in Confluence using the shared `bear` drive folders as the editorial source.
- Added slot-by-slot tables for:
  - `Progression A after feedback`
  - `Progression B after feedback`
  - `Progression C after feedback`
- Each table now includes:
  - slot number
  - level filename
  - screenshot filename
  - JSON filename
  - the corresponding progression drive-folder link
- The page remains cumulative:
  - earlier design text was preserved
  - the new progression section was layered into the existing structure instead of replacing older notes

## 2026-03-12 - Dedicated Bear spreadsheet sync wrapper

- Added a dedicated wrapper script:
  - `scripts/sync_bear_after_feedback_spreadsheet.sh`
- Added a matching npm command:
  - `npm run sync:spreadsheet:bear`
- This wrapper regenerates the `Levels - feed the bear` workbook mirror from the current after-feedback progressions plus the latest manager snapshot.
- Output file:
  - `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx`
- The toolkit default workbook target was also updated so the `Level Manager` sync button points to this after-feedback file by default.

## 2026-03-12 - Bear reporting source unified across spreadsheet and Confluence

- Ran the unified reporting command:
  - `npm run sync:reporting:bear`
- Regenerated the local workbook mirror:
  - `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx`
- Regenerated the Confluence source artifacts:
  - `output/confluence/bear_after_feedback_levels.html`
  - `output/confluence/bear_after_feedback_levels.md`
  - `output/confluence/bear_after_feedback_levels.json`
- Replaced the `Level design - the levels` block on the Confluence page `Feed the bear - level design` with the same after-feedback source used for the workbook.
- This makes the spreadsheet mirror and the Confluence progression tables come from the same generated reporting source instead of diverging manually.

## 2026-03-14 - Confluence backup and IA options prepared

- Created a local backup folder for the current Confluence source artifacts:
  - `output/confluence_backups/20260314_194750_generated_source`
- Stored the generated Confluence source bundle before further structural changes.
- Added a new IA note:
  - `CONFLUENCE_INFORMATION_ARCHITECTURE_OPTIONS.md`
- The new note compares three documentation structures:
  - one-page mixed model
  - hub page plus audience pages
  - lifecycle-based knowledge system
- This was prepared to support a safer reflection pass before changing the live Confluence hierarchy again.

## 2026-03-15 - Full English Confluence page outline drafted

- Added a full English page outline ready for Confluence:
  - `CONFLUENCE_PAGE_OUTLINE_FEED_THE_BEAR.md`
- The outline assumes:
  - one main page
  - workflow-based structure
  - internal polished tone
  - navigation cards at the top
- Main section set:
  - `Design intention`
  - `Level creation`
  - `Level review`
  - `Progression curation`
  - `Reporting and sync`
  - `Archive and references`
- Each section now has a consistent intro pattern:
  - `What is in this section`
  - `Who should read it`
  - `When to open it`

## 2026-03-16 - Confluence style guide and canvas-safe reporting note

- Added a dedicated page style guide:
  - `CONFLUENCE_STYLE_GUIDE_FEED_THE_BEAR.md`
- The guide now defines:
  - tone of voice
  - heading hierarchy
  - top navigation behavior
  - audience intro blocks
  - color guidance
  - typography guidance
  - image/canvas rules
- The guide now also defines a fixed component system for the page:
  - framing callout
  - navigation cards
  - section intro block
  - screenshot block
  - reference block
  - reporting block
  - archive block
- Updated `scripts/generate_bear_confluence_source.py` so the generated Confluence block now includes an explicit note that Confluence should use exported PNG assets instead of live canvas rendering.

## 2026-03-16 - Design intention block converted to component format

- Updated `CONFLUENCE_PAGE_OUTLINE_FEED_THE_BEAR.md` so `Design intention` is now written as a component-based section.
- The section now explicitly maps:
  - section intro block
  - framing paragraph
  - main content blocks
  - screenshot block
  - reference block
  - design learnings block

## 2026-03-16 - Full Kingfluence page system and update workflow

- Added a full page-system document:
  - `KINGFLUENCE_PAGE_SYSTEM_FEED_THE_BEAR.md`
- This document defines:
  - the six fixed sections
  - how sections relate to each other
  - the component model for every section
  - the full recommended page assembly
- Added an operational update workflow:
  - `KINGFLUENCE_UPDATE_WORKFLOW.md`
- This workflow clarifies the order:
  - canonical files first
  - reporting outputs second
  - Kingfluence page last

## 2026-03-16 - Full Confluence page draft prepared

- Added a full page draft ready for Kingfluence.
- The draft already applies the fixed section order and component logic across:
  - Design intention
  - Level creation
  - Level review
  - Progression curation
  - Reporting and sync
  - Archive and references

## 2026-03-16 - Kingfluence reporting automation

- Added a dedicated reporting automation skill:
  - `confluence-report-publisher`
- Added a browser automation publisher:
  - `scripts/publish_bear_confluence_report.mjs`
- Added a single wrapper command:
  - `npm run sync:kingfluence:bear`
- That command now performs:
  - workbook regeneration
  - Confluence source regeneration
  - Kingfluence page update
  - post-publish verification of headings, TOC, links, and images

## 2026-03-16 - Confluence system index and TOC verification

- Added a central Confluence system index:
  - `CONFLUENCE_SYSTEM_INDEX.md`
- This groups:
  - Confluence page system docs
  - generated reporting source files
  - publication scripts
  - published knowledge surfaces
- Updated the Kingfluence publish script:
  - `scripts/publish_bear_confluence_report.mjs`
- It now verifies:
  - headings
  - TOC presence and TOC links
  - links
  - images
- Updated the wrapper:
  - `scripts/sync_bear_reporting_to_kingfluence.sh`
- It now forwards flags such as:
  - `--dry-run`

## 2026-03-16 - Kingfluence live publish auth diagnosis

- Ran the full live pipeline:
  - `npm run sync:kingfluence:bear`
- Workbook regeneration and Confluence source regeneration completed correctly.
- The live publish step did not reach the Kingfluence editor.
- Diagnostic result:
  - the copied Chrome profile lands on an Okta sign-in page
  - the failure is an authentication problem, not a missing publish button in Kingfluence
- Updated `scripts/publish_bear_confluence_report.mjs` so it now fails with an explicit auth message when the browser reaches Okta instead of the editor.

## 2026-03-16 - Brave support added to Kingfluence publisher

- Updated `scripts/publish_bear_confluence_report.mjs` to support browser selection through env vars.
- It now supports:
  - `KINGFLUENCE_BROWSER=chrome`
  - `KINGFLUENCE_BROWSER=brave`
- It also now supports connecting to an already open browser session via:
  - `KINGFLUENCE_CDP_URL=http://127.0.0.1:9222`
- Tested Brave profiles:
  - `Default`
  - `Profile 1`
- Result:
  - copied Brave profiles also land on the Okta sign-in page
  - the current blocker is still SSO/session portability, not browser choice

## 2026-03-16 - Native Chrome-session Confluence publish

- Added a live-session publisher for the real Chrome editor:
  - `scripts/publish_bear_confluence_report_live_chrome.mjs`
- This mode no longer depends on copied browser profiles.
- It works by:
  - opening the real Kingfluence edit draft in the signed-in Chrome session
  - targeting the native `innerCell[contenteditable=true]` editor surface
  - replacing the final reporting cell with the Confluence-safe reporting block
  - publishing with the real `Actualizar` button
  - verifying the published page afterwards
- Added a safer Confluence source variant:
  - `output/confluence/bear_after_feedback_levels_confluence_safe.html`
- The stable command for this mode is:
  - `KINGFLUENCE_USE_LIVE_CHROME_SESSION=1 npm run sync:kingfluence:bear`
- Result:
  - workbook regeneration works
  - Confluence source regeneration works
  - native insertion persists in the live Kingfluence page
  - published-page verification confirms the block is present

## 2026-03-16 - Full Kingfluence page restructure applied

- Added a full-page Confluence-safe generator:
  - `scripts/generate_full_confluence_page.py`
- Added a generated full-page source:
  - `output/confluence/feed_the_bear_full_page_confluence_safe.html`
- The spreadsheet/reporting sync now regenerates:
  - the after-feedback workbook
  - the reporting recap source
  - the full-page Confluence-safe source
- Saved a live backup of the editable page before the full replacement:
  - `output/confluence_backups/live_page/feed_the_bear_live_editor_backup_20260316.html`
- The live Chrome-session publisher now:
  - replaces the whole editable page content
  - unchecks `notifyWatchers`
  - publishes the final structure
- Verified result:
  - final section structure is present on the published page
  - utility subheadings like `Screenshot block`, `Reference block`, and `Reporting block` were demoted to reduce TOC noise
  - the published run reported `notifyWatchers: false`

## 2026-03-16 - Kingfluence image verification cleanup

- Re-ran the full live sync through the signed-in Chrome session:
  - `KINGFLUENCE_USE_LIVE_CHROME_SESSION=1 npm run sync:kingfluence:bear`
- Verified published result:
  - `hasBlock: true`
  - `tocPresent: true`
  - `notifyWatchers: false`
  - `images: 16`
  - `brokenImages: 11`
- Inspected the remaining `brokenImages` directly in the published DOM.
- Conclusion:
  - the 11 broken images are not page-content screenshots or attachments
  - they are hidden Kingfluence shell icons rendered as `<img style="display:none;">`
  - examples include wrappers like:
    - `rw_item_icon rw_iconfont_activity`
    - `rw_item_icon rw_header-spaces-link rw_icon`
    - `rw_item_icon rw_no_icon_link`
- The generated full-page source no longer injects broken local screenshot images into the reporting recap tables.
- At content level, the current page is clean; the residual broken-image count comes from the surrounding Kingfluence chrome, not from the published document body we manage.

## 2026-03-16 - Claude handoff bundle

- Added a combined Markdown handoff document for external review:
  - `paraclau_1.md`
- Purpose:
  - provide one single file with the current page information for discussion or review outside the repo.

## 2026-03-17 - Procedural next recommendations (quality + UX)

- Procedural candidate cards now expose a guide trust badge:
  - `Guide HIGH`, `Guide MED`, `Guide LOW` based on critical/non-critical guide issues.
  - badge styles are color-coded and shown next to candidate status.
- Discard feedback UI in the Reference Generator was upgraded:
  - reason chips (clickable) instead of only select-style flow
  - pair chips keep multi-select behavior
  - optional note remains inline
  - new `Clear` action resets draft feedback state
  - `Discard` is disabled until a reason is selected
- Added guardrail tests:
  - `tests/procedural-quality-guardrails.test.ts`
  - ensures the critical guide issue list still contains blocking cases and that candidate generation still uses `hasCriticalGuideIssue(...)`.
- Validation:
  - `node --check level_toolkit_web/app.js` passes
  - `npx vitest run tests/procedural-quality-guardrails.test.ts` passes
- Browser automation note:
  - visual verification through Playwright MCP is still blocked by an existing Chrome persistent session on this machine (`Se está abriendo en una sesión de navegador existente.`).
- 2026-03-18: Added procedural reference intent controls (pairs/blockers/board) to the Reference Generator UI, wired them into workspace persistence, and updated candidate ranking so generated variants respect the requested direction of change.

## 2026-03-25 - Editor visual + guide workflow

- Reworked the `Level Editor + Play` layout so the empty right side now hosts a practical inspector:
  - pair builder summary
  - guide painter actions
  - in-editor variant review panel
- Simplified editor placement behavior:
  - removed the visible start/end selector from normal editing
  - node placement now auto-fills point 1 and then point 2
  - when both points already exist, a new click moves whichever point is nearest
- Added guide capture from play mode:
  - `Mark Selected Pair`
  - `Mark All Paths`
  - `Clear Guides`
- Guide capture now reuses persistent `referenceTrails`, so played paths remain visible after leaving play mode.
- Added `Generate 3 Variants` inside the editor:
  - uses the same reference-intent controls as the procedural generator
  - supports `Open`, `Keep`, and `Discard`
  - keep/discard/open actions send learning events
- Improved editor readability:
  - more separated default pair colors
  - endpoints now share the same visual treatment instead of square-vs-circle emphasis
  - path overlays now draw step badges so route numbering is easier to read
- Validation:
  - `node --check level_toolkit_web/app.js` passes
- Browser automation note:
  - visual verification through Playwright MCP is still blocked by the existing Chrome persistent-session lock on this machine.

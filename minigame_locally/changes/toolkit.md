# Toolkit Changes

## Current source of truth

- web app: `level_toolkit_web/`
- server bridge: `server.mjs`

## Key decisions

- Settings only expose supported sync modes.
- Imported level normalization keeps compatibility, but stale migration markers were removed.
- Procedural and manager UI should favor explicit, local, inspectable state.

## Important files

- [level_toolkit_web/app.js](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/app.js)
- [level_toolkit_web/index.html](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/index.html)
- [level_toolkit_web/styles.css](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/styles.css)
- [server.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/server.mjs)

## Recent outcomes

- UI and server paths now expose only the supported sync modes
- import naming cleaned up from `legacy/fallback` wording to clearer intent-based terms
- `imported_from_legacy` removed from active levels
- `fallback_mutation` renamed to `recovery_mutation`
- editor import, validation, and settings now allow `9x9` boards
- working toolkit state now writes to canonical single files instead of rolling out multiple near-duplicate state files
2026-03-21
- Fixed `9x9` imported playtest flow in the web toolkit.
- `normalizeGridSizeLevel()` now trusts imported metadata (`solutionCount`, `targetDensity`, `goldenPath`, `validation`) when present instead of always recomputing with `countSolutions(...)`.
- `serializePlaySession()` now serializes the current editor level without forcing a full solution recount.
- `buildPlaytestDatasetRecord()` now uses stored validation metadata instead of calling `validateLevel()` again for exported sessions.
- Verified with `procedular_9x9_pairs_09_098.json`: import succeeds, `.local/toolkit_state/editor_state.json` persists a `9x9` / `9` pair board, and playtest export writes `playtest/latest_play_session.json` plus `playtest/playtest_events.jsonl`.

2026-03-21

- Cleaned toolkit startup `404` errors.
- Added `/api/local-store/browser-sync` and `/api/local-store/browser-state` in [server.mjs] to persist and restore browser-only snapshots under `.local/browser_state_exports/`.
- Added client-side repo existence checks in [level_toolkit_web/app.js] before fetching optional workspace presets, catalog aliases, and workshop candidate files.
- Added an inline favicon in [level_toolkit_web/index.html] to avoid the browser's implicit `favicon.ico` 404.
- Verified on `http://127.0.0.1:8090/` with zero console errors and zero missing URLs during toolkit load.

2026-03-23

- Comprehensive UI polish of Level Editor and Level Manager views.
- [level_toolkit_web/styles.css] updated: topbar shadow, sidebar gradient, nav button transitions, view fade-in animation, button hierarchy (`btn-primary`/`btn-muted`), toolbar-group separators, section-header class, editor-status-bar collapsible, canvas-frame wrapper, manager card hover lift, slot difficulty left-borders, insight card headers, progress bar theming, tag pulse animation, focus-visible outlines, typography refinements (labels 12px uppercase, tags 11px bold, headings 22px).
- [level_toolkit_web/index.html] updated: editor toolbars consolidated from 5 to 3 + collapsible status bar, controls grouped with `toolbar-group` spans, button classes applied, both canvases wrapped in `canvas-frame`, manager h3s converted to `section-header`.
- [level_toolkit_web/app.js] updated: added `resizeEditorCanvas()` for responsive canvas sizing (max 640px, debounced), tag pulse trigger in `updateEditorSaveStatus()`, canvas resize called on editor view activation.
- No new files created. All changes in existing canonical toolkit files.

2026-03-24

- Hardened procedural learning writes in [level_toolkit_web/app.js](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/app.js) so stored learning entries now recompute validation and `solution_count` before persistence.
- Added richer learning payload fields including mechanic signals, guide issues, source-family metadata, and auto-recorded markers for later offline analysis.
- Solved-session auto-approvals now skip invalid levels instead of recording them as clean positives in the learning memory.

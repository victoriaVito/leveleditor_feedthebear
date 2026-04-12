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

2026-04-10

- Updated [server.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/server.mjs) so the legacy `/screenshots/` static URL now serves files from canonical `levels/screenshots/` instead of the removed root `screenshots/` folder.
- Simplified [level_toolkit_web/benchmark_compare.html](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/benchmark_compare.html) so benchmark image discovery uses `benchmark_flow_free/screenshots/` plus `levels/screenshots/` instead of probing duplicated benchmark mirror folders.
- Simplified [level_toolkit_web/compare_all.html](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/compare_all.html) so the benchmark extra-image search no longer depends on the removed `levels/benchmark_flow_free/screenshots/` mirror.
- Updated [python_toolkit/src/feed_the_bear_toolkit/ui/native_app.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/python_toolkit/src/feed_the_bear_toolkit/ui/native_app.py) so the native editor now routes editor state through shared pure helpers, reports explicit load/preview/save failures in-session, updates overwrite targets after progression-slot saves, and uses stable normalized source names when opening session items, learned batch items, and procedural variants.
- Expanded [python_toolkit/tests/test_native_app.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/python_toolkit/tests/test_native_app.py) with parity-focused editor coverage for metadata-preserving round-trips, canvas edit loop behavior, standalone save + reopen, and preserved source-path context for session/procedural editor entries.
- Updated [python_toolkit/tests/test_procedural_service.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/python_toolkit/tests/test_procedural_service.py) so the invalid-JSON learning-state regression uses a temporary writable sandbox instead of a repo-mounted output path, making the full toolkit suite portable and green in this environment.
- Rewrote the remaining Python toolkit backlog in [python_toolkit/README.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/python_toolkit/README.md) and [python_toolkit/PARITY_CHECKLIST.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/python_toolkit/PARITY_CHECKLIST.md) into explicit parity targets with a fixed closing order: procedural parity first, then variant review, editor ergonomics, and spreadsheet parity.
- Added a procedural orchestration regression in [python_toolkit/tests/test_procedural_service.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/python_toolkit/tests/test_procedural_service.py) that locks the web-aligned `app.js` behavior where strict generated candidates can fill the full target pool and thereby skip the later relaxed/mutation fallback phases.
- Fixed the real procedural parity gaps in [level_toolkit_web/app.js](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/app.js) based on code audit rather than the earlier blocker-loop hypothesis: `generateLevelRaw()` now rejects unsolved initial scaffolds before continuing, `buildMutatedReferenceCandidate()` validates each structural mutation step with immediate rollback on `0`-solution states, and `countSolutions()` gained an additive `requireFullCoverage = false` option without changing existing callers.
- Mirrored the same parity rules in [python_toolkit/src/feed_the_bear_toolkit/services/procedural.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/python_toolkit/src/feed_the_bear_toolkit/services/procedural.py), including scaffold retries, per-mutation solver rollback, and non-breaking full-coverage counting support so the native/tooling path stays behaviorally aligned with the canonical web logic.
- Expanded [python_toolkit/tests/test_procedural_service.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/python_toolkit/tests/test_procedural_service.py) with regressions for unsolved scaffold retry, invalid mutation rollback, clean rejection when every mutation branch breaks solvability, additive full-coverage counting, and fixed-seed generation smoke coverage; verified with `python3 -m unittest discover -s python_toolkit/tests -p 'test_procedural_service.py' -v` and full `python3 -m unittest discover -s python_toolkit/tests -p 'test_*.py' -v` (`Ran 102 tests ... OK`).
- Re-audited the active canonical level set (`levels/progression_*/*.json`, `levels/tutorial_level.json`, `levels/slot2_*.json`, `levels/procedural_d_slot2.json`) and confirmed that 14 files still recompute to `0` solutions for structural reasons, mostly over-constrained pair layouts and endpoint crowding, while many other previously flagged files are only stale stored-metadata mismatches rather than unsolved boards.
- Closed the full Python parity execution plan end-to-end: checklist gates now marked complete, migration plan status set to completed, runtime status updated to report procedural/spreadsheet/UI slices as `done`, and cutover/rollback contract documented for Python-first operation with web fallback.
- Verified closure with fresh suite evidence in this environment: procedural (`32 OK`), native app (`10 OK`), sessions (`8 OK`), spreadsheet (`12 OK`), and full toolkit (`102 OK`).

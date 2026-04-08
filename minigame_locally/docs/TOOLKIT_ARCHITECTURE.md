# Toolkit Architecture Map

`level_toolkit_web/app.js` is a monolithic client-side application, not a set of ES modules. The file is organized by responsibility: constants and state setup, gameplay math, import/export normalization, procedural generation, persistence, and finally UI wiring.

## Module Map

| Approx. lines | Module | Responsibility | Key functions / objects |
|---|---|---|---|
| 1-212 | Bootstrap constants and defaults | Defines curve presets, fish palette, project paths, performance settings, and default manager/editor state factories. | `curve`, `densityRanges`, `FISH_COLOR_SEQUENCE`, `createDefaultEditorState()`, `createDefaultProceduralReferenceState()`, `createDefaultManagerProgressions()` |
| 212-333 | Global runtime state | Holds the live app state for the procedural playground, editor, manager, sessions, learning, settings, and play mode. Also defines persistence keys and canonical snapshot paths. | `state`, `LOCAL_STORE_SNAPSHOT_MAP`, `CANONICAL_STATE_PATHS`, timers and in-flight flags |
| 333-518 | Low-level helpers and path utilities | Parses imported JSON, resolves repo paths, normalizes filenames, and handles basic coordinate and difficulty helpers. | `parseImportedJson()`, `resolveProjectPath()`, `normalizeLevelFileName()`, `levelWidth()`, `levelHeight()`, `levelTier()`, `levelDifficulty()` |
| 518-1111 | Level serialization and puzzle analysis | Converts between storage formats, builds grids, counts solutions, extracts features, and analyzes golden-path quality. | `serializeLevelToDeveloperFormat()`, `makeGrid()`, `countSolutions()`, `findOneSolutionPaths()`, `hasFullCoverSolution()`, `extractFeatures()`, `analyzeSolutionGuide()` |
| 1111-2140 | Learning, feedback, and manager catalog helpers | Tags human feedback, normalizes learning buckets, classifies discard/keep reasons, and prepares manager filters, tutorial handling, and level comparison helpers. | `classifyDiscardReason()`, `inferLearningTags()`, `normalizeLearningBuckets()`, `validateLevel()`, `captureLockedManagerProgressions()`, `restoreLockedManagerProgressions()`, `applyStaticTooltips()` |
| 2140-3063 | Procedural scoring and reference lab | Scores candidates against learning data, generates procedural levels, and renders the reference-driven procedural playground. | `scoreCandidateWithLearning()`, `learningDrivenGenerationAdjustments()`, `generateLevelRaw()`, `generateLevel()`, `generateProgression()`, `generateProceduralBatch()`, `renderProceduralReferenceLab()` |
| 3073-3688 | Learning, settings, and workspace persistence | Loads/saves learning and UI settings, mirrors browser state into localStorage and repo snapshots, and restores the workspace after reloads. | `saveLearning()`, `loadLearning()`, `restoreLearningFromRepo()`, `loadSettings()`, `saveSettings()`, `pushBrowserStateToLocalStore()`, `hydrateBrowserStateFromLocalStore()`, `persistWorkspaceState()`, `restoreWorkspaceState()` |
| 3708-4040 | Repo and spreadsheet bridge | Wraps the server bridge endpoints for file writes, data-url writes, zip creation, workbook sync, rename application, Google Sheets auth, and the external Drive upload script. | `saveProjectFile()`, `saveManagerOutputFile()`, `saveRepoFile()`, `saveProjectDataUrl()`, `createManagerOutputZip()`, `syncLevelsWorkbook()`, `applySheetLevelRenames()`, `refreshGoogleSheetsApiStatus()`, `openBridgeLauncher()` |
| 4040-4398 | Editor save/export and playtest logging | Saves level artifacts to the project, exports manual save paths, serializes play sessions, and writes playtest records. | `saveLevelArtifactsToProject()`, `promptAndSaveEditorLevel()`, `buildPlaytestDatasetRecord()`, `appendPlaytestDatasetRecord()`, `saveSolvedSession()`, `recordLearningDecision()`, `recordCorrectionLearning()` |
| 4396-5805 | View switching, editor canvas, and preview rendering | Switches between views, updates the editor, manages play interactions, draws board previews, and keeps editor/session links in sync. | `setActiveView()`, `resizeEditorCanvas()`, `drawBoard()`, `loadLevelToEditor()`, `levelFromEditor()`, `bindPlayCanvas()`, `evaluatePlayWin()`, `updateEditorProgressionBuilder()`, `createLevelPreviewDataUrl()` |
| 5805-7565 | Manager and sessions surfaces | Renders the Level Manager planner, pool, and tabs; then renders the Play Sessions preview grid, table, and feedback panel. | `updateManagerTable()`, `updateManagerPlanner()`, `renderManagerTabs()`, `updateSessionPreviewGrid()`, `updateSessionTable()`, `updateSessionFeedbackPanel()`, `loadProgressionIntoSessions()`, `loadProceduralPackIntoSessions()` |
| 7565-8405 | Settings, main workflow, and initialization hooks | Wires settings controls, the procedural main tab, the editor tab, the sessions tab, and manager actions. Also handles autoload flows and startup integrity checks. | `initSettings()`, `initMain()`, `initEditor()`, `initSessions()`, `initManager()`, `autoloadLevelFromQuery()`, `autoloadManagerFromQuery()`, `autoloadWorkspaceFromQuery()`, `runStartupIntegrityAudit()` |
| 8405-9445 | Play-mode interaction and bootstrap | Handles drag/play interactions on the canvases and performs the one true app bootstrap sequence. | `resetPlayState()`, `tryApplyPlayCell()`, `playSessionItem()`, `advanceToNextSessionItem()`, `bootstrap()` |

## Data Flow

```mermaid
graph TD
  A[User action, import, autoload, or generator] --> B[toPlayableLevel / generateLevelRaw / generateLevel]
  B --> C[state.main / state.editor / state.manager / state.sessions]
  C --> D[levelFromEditor / serializeLevelToDeveloperFormat / serializePlaySession]
  D --> E[saveLevelArtifactsToProject / saveSolvedSession / appendPlaytestDatasetRecord]
  E --> F[/api/save-file /api/save-data-url /api/append-file /api/create-zip]
  F --> G[levels/ screenshots/ playtest/ bundles/ progressions/manager_state/]
  C --> H[updateManagerTable / scheduleManagerMetadataSnapshot / materializeManagerProgressionsToRepo]
  H --> I[/api/sync-levels-workbook /api/apply-sheet-renames]
  C --> J[pushBrowserStateToLocalStore / hydrateBrowserStateFromLocalStore]
  J --> K[/api/local-store/browser-sync /api/local-store/browser-state]
  C --> L[fetch static levels / workshop bundles / CSV aliases]
  L --> B
```

The important point is that the app has two parallel persistence paths:

1. Canonical repo outputs such as `levels/`, `screenshots/`, `playtest/`, and `progressions/manager_state/`.
2. Browser-local workspace snapshots in `localStorage` plus `.local/browser_state_exports/`.

## Key State Objects

- `state.main` holds the procedural playground reference level, the current intent adjustments, generated candidates, and the next candidate id.
- `state.editor` holds the live level being edited: board size, filename, pairs, blockers, debug marks, reference trails, progression link, dirty flag, and save timestamps.
- `state.progression` and `state.proceduralBatch` hold generated output lists from the Procedural view. They are derived data, not canonical sources of truth.
- `state.manager` is the editorial catalog. It tracks items, progression tabs, slot order, locks, extra/discarded buckets, filters, selected item, pagination, loading state, and cached indices.
- `state.sessions` is the review queue. It tracks the queue, active item, selected item, edit target, and review-loading state.
- `state.learning` stores approved, rejected, and correction examples used by procedural scoring.
- `state.settings` stores project paths, Google Sheets configuration, UI theme, active pair palette, default board settings, and the performance profile.
- `state.play` stores live play-mode state: whether play is on, selected pair, current paths, occupancy map, move history, color map, and drag tracking.
- Global timers and guards such as `browserSyncTimer`, `workspacePersistTimer`, `managerMetadataSaveTimer`, `canonicalStateSaveTimer`, `isBootstrappingWorkspaceState`, and `isRestoringWorkspaceState` protect autosave and restore flows.

## Entry Points

`bootstrap()` is the only top-level entry point. It runs once at the bottom of the file and performs the startup sequence in this order:

1. Optionally clears workspace state from the query string.
2. Hydrates browser-local state from the server snapshot if available.
3. Loads settings and learning data, then pulls the canonical learning repo copy if local state is empty.
4. Applies tooltips and topbar listeners.
5. Binds view navigation and initializes each tab surface with `initMain()`, `initEditor()`, `initSessions()`, `initManager()`, and `initSettings()`.
6. Runs integrity checks, restores workspace state, and then applies any query-string autoload.
7. Ensures the tutorial is present in all progressions, pushes a browser backup snapshot, and refreshes the active view.

User-triggered entry points are split by surface:

- Sidebar tabs call `setActiveView()` and then rerender the active view.
- Topbar buttons trigger browser sync and workbook sync.
- Editor buttons trigger validation, save, export, screenshot, and play actions.
- Manager buttons mutate progression membership, locks, imports, exports, and spreadsheet sync.
- Session buttons load queues, validate selected levels, and send feedback.

## Integration Points With `server.mjs`

| Client call | Server endpoint / mechanism | Purpose |
|---|---|---|
| `repoFileStatus()` | `GET /api/file-status` | Checks whether optional repo paths exist before fetching them. |
| `pushBrowserStateToLocalStore()` | `POST /api/local-store/browser-sync` | Writes the browser snapshot bundle to `.local/browser_state_exports/`. |
| `hydrateBrowserStateFromLocalStore()` | `GET /api/local-store/browser-state` | Restores browser snapshots into localStorage on startup. |
| `saveProjectFile()` / `saveManagerOutputFile()` / `saveRepoFile()` | `POST /api/save-file` | Writes JSON, CSV, TXT, and similar text artifacts. |
| `saveProjectDataUrl()` / `saveManagerOutputDataUrl()` / `saveRepoDataUrl()` | `POST /api/save-data-url` | Writes PNG screenshots and other base64 assets. |
| `appendProjectFile()` | `POST /api/append-file` | Appends playtest and feedback records. |
| `createProjectZip()` / `createManagerOutputZip()` | `POST /api/create-zip` | Builds progression bundles and export zips. |
| `readManagerOutputFile()` | `POST /api/read-local-file` | Reads bundle bytes back for upload to Drive. |
| `syncLevelsWorkbook()` | `POST /api/sync-levels-workbook` | Regenerates the workbook mirror and optionally pushes Google Sheets. |
| `applySheetLevelRenames()` | `POST /api/apply-sheet-renames` | Applies rename instructions from the `Level Renames` tab. |
| `refreshGoogleSheetsApiStatus()` / `openBridgeLauncher()` | `POST /api/google-sheets-status`, `POST /api/open-bridge` | Checks auth and launches the bridge. |
| OAuth helpers | `POST /api/google-sheets-auth-url`, `POST /api/google-sheets-disconnect` | Starts or tears down Google Sheets API auth. |
| `uploadProgressionBundle()` | external Drive upload script URL | Sends a progression bundle to the reporting/Drive pipeline. |

Static reads also matter here: the app fetches level files, progressions, `levels/catalog_index.csv`, and workshop JSON bundles directly from the server-served static paths.

`[VERIFY: deleteRepoFile() calls /api/delete-file, but the current server.mjs scan did not show a matching handler. The client expects it, but the server surface in this repo snapshot does not expose it.]`

## Navigation Model

The sidebar has five views, and `setActiveView()` is the central switch:

- `Procedural` shows the reference-driven generation lab. It lets the designer choose a base level, set intent for pairs/blockers/board size, and review generated variants before keeping or discarding them.
- `Level Editor + Play` is the manual authoring surface. It combines board editing, validation, play mode, save/export actions, and progression-slot assignment in one screen.
- `Play Sessions` is the review queue. It loads levels from progressions or procedural packs, supports play/validate/approve/reject, and records feedback back into learning.
- `Level Manager` is the editorial planning surface. It manages progressions, slot locks, pool items, references, extras, discarded levels, exports, and spreadsheet sync.
- `Settings` controls project paths, Google Sheets auth, sync behavior, theme, palette, and performance settings.

The editor canvas is resized on view activation and on window resize. `setActiveView("editor")` also forces a redraw so the canvas stays aligned with the visible frame.

## Standalone Comparison Pages

These HTML pages live in `level_toolkit_web/` alongside the main app. They are served statically by `server.mjs` and opened directly in the browser. They do NOT depend on the main `app.js` state — they read JSON data directly.

| File | Purpose | How to open |
|---|---|---|
| `benchmark_compare.html` | Side-by-side: original Flow Free mobile screenshot vs reconstructed JSON board for each of the 16 benchmark levels. Use during editor tweaks to verify endpoint accuracy. | `http://127.0.0.1:8080/benchmark_compare.html` |
| `reconstruction_compare.html` | Side-by-side: original editor/timestamped screenshots vs their reconstructed JSONs (13 levels from image reconstruction pass). | `http://127.0.0.1:8080/reconstruction_compare.html` |
| `compare_all.html` | Full cross-level comparison view driven by `compare_manifest.json` (102 KB pre-built manifest). Covers all tracked levels in one scrollable page. | `http://127.0.0.1:8080/compare_all.html` |
| `progression_analysis_compare.html` | Per-progression analysis view — shows difficulty distribution, solution counts, and coverage stats across progression slots. Useful for progression health review before a Kingfluence publish. | `http://127.0.0.1:8080/progression_analysis_compare.html` |

All four pages require the local server to be running (`node server.mjs`).

## Pending [VERIFY] Flags

- `[VERIFY: boundary unclear around line 518 because the file blends serialization, analysis, and validation helpers in one long section rather than a clean module split.]`
- `[VERIFY: boundary unclear around line 2719 because the procedural playground, candidate rendering, and generation logic are interleaved in a single region.]`
- `[VERIFY: deleteRepoFile() calls /api/delete-file, but the current server.mjs scan did not show a matching handler.]`

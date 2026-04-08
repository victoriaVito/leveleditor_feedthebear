# Python Toolkit Migration Inventory

## Purpose

This document breaks the current web toolkit into migration units so the Python port can proceed by workflow and state slice instead of by line-by-line translation.

It is the implementation companion to [PYTHON_TOOLKIT_MIGRATION_PLAN.md](./PYTHON_TOOLKIT_MIGRATION_PLAN.md).

## Current Source Units

| Source | Role | Notes |
|---|---|---|
| `level_toolkit_web/app.js` | Browser monolith | Main workflow owner for editor, sessions, manager, procedural generation, learning, rendering, and UI wiring. |
| `level_toolkit_web/index.html` | UI shell | Defines controls, view layout, and DOM anchors used by `app.js`. |
| `level_toolkit_web/styles.css` | Visual system | Styling only. Low migration priority until the Python UI shell is chosen. |
| `server.mjs` | Local bridge | Filesystem writes, zips, local-store sync, workbook sync, and auth/open bridge endpoints. |
| `google_sheets_api.mjs` | Spreadsheet adapter | Google Sheets auth and sync behavior used by the bridge. |
| `python_preview_project/` | Existing Python precedent | Current Python-only slice for preview rendering. Useful as environment precedent, not as architecture base. |

## Major App.js Anchors

These are the first functions and objects that define migration boundaries:

| Concern | Current anchor in `app.js` |
|---|---|
| Editor default state | `createDefaultEditorState()` at line 179 |
| Global runtime state | `state` at line 243 |
| Local-store snapshot map | `LOCAL_STORE_SNAPSHOT_MAP` at line 332 |
| Canonical state output paths | `CANONICAL_STATE_PATHS` at line 340 |
| Procedural generation entrypoint | `generateLevel()` at line 3214 |
| Level validation | `validateLevel()` at line 3852 |
| Workbook sync bridge | `syncLevelsWorkbook()` at line 4709 |
| Save level artifacts | `saveLevelArtifactsToProject()` at line 4891 |
| Learning capture | `recordLearningDecision()` at line 5030 |
| View switching | `setActiveView()` at line 5255 |
| Preview image rendering | `createLevelPreviewDataUrl()` at line 6371 |
| Sessions progression load | `loadProgressionIntoSessions()` at line 9001 |
| Full bootstrap | `bootstrap()` at line 11597 |

## Bridge Endpoints in `server.mjs`

These endpoints define the current Node-to-filesystem contract that Python needs to replace or absorb:

| Endpoint | Current line in `server.mjs` | Target Python responsibility |
|---|---|---|
| `GET /api/file-status` | 248 | Repo path probing service |
| `POST /api/local-store/browser-sync` | 338 | Browser/local state snapshot persistence |
| `GET /api/local-store/browser-state` | 363 | Snapshot restore service |
| `POST /api/save-file` | 388 | Text artifact write service |
| `POST /api/save-data-url` | 400 | Binary/data-url artifact write service |
| `POST /api/append-file` | 414 | Append-only log writer |
| `POST /api/create-zip` | 426 | Export bundling service |
| `POST /api/read-local-file` | 456 | Local binary reader |
| `POST /api/sync-levels-workbook` | 472 | Workbook sync orchestrator |
| `POST /api/apply-sheet-renames` | 527 | Rename application service |
| `POST /api/open-bridge` | 553 | External bridge launcher |
| `POST /api/google-sheets-auth-url` | 588 | Google auth bootstrap |
| `POST /api/google-sheets-status` | 604 | Google auth status |
| `POST /api/google-sheets-disconnect` | 618 | Google auth teardown |

## Migration Slices

### Slice 1: Domain Models

Move first because they are independent from UI choice.

Target Python modules:

- `feed_the_bear_toolkit.domain.levels`
- `feed_the_bear_toolkit.domain.progressions`
- `feed_the_bear_toolkit.domain.validation`
- `feed_the_bear_toolkit.domain.learning`
- `feed_the_bear_toolkit.domain.previews`

Includes:

- level parsing and normalization
- board dimensions and coordinate helpers
- level difficulty and tier helpers
- validation result shaping
- playtest record shaping
- learning decision record shaping

Should not include:

- DOM updates
- fetch calls
- canvas drawing primitives tied to browser APIs

### Slice 2: Persistence Services

These replace `server.mjs` responsibilities while keeping repo formats stable.

Target Python modules:

- `feed_the_bear_toolkit.services.repo_io`
- `feed_the_bear_toolkit.services.browser_state`
- `feed_the_bear_toolkit.services.exports`
- `feed_the_bear_toolkit.services.workbook_sync`

Includes:

- file status checks
- save/append/read operations
- zip creation
- local snapshot persistence
- manager/export artifact writes

### Slice 3: Procedural Generation

High-value but higher risk because it depends on both domain rules and learning state.

Target Python modules:

- `feed_the_bear_toolkit.services.procedural.generator`
- `feed_the_bear_toolkit.services.procedural.scoring`

Includes:

- candidate generation
- scoring against learning data
- generation adjustments
- reference-driven batch generation

### Slice 4: Sessions and Playtest Flows

Target Python modules:

- `feed_the_bear_toolkit.services.sessions`
- `feed_the_bear_toolkit.services.playtest`

Includes:

- progression loading
- queue shaping
- review actions
- feedback persistence
- playtest dataset writes

### Slice 5: UI Shell

Do after domain and persistence boundaries exist.

Target Python modules:

- `feed_the_bear_toolkit.ui.app`
- `feed_the_bear_toolkit.ui.routes`
- `feed_the_bear_toolkit.ui.viewmodels`

Initial expectation:

- Python-hosted compatibility UI first
- native desktop shell only after parity evidence exists

## State-to-Module Mapping

| Current state slice | Meaning | Target Python home |
|---|---|---|
| `state.main` | Procedural playground and candidate generation | `services.procedural.*` |
| `state.editor` | Active editable level and save state | `domain.levels` + `ui.viewmodels.editor` |
| `state.progression` | Generated progression outputs | `services.procedural.generator` |
| `state.proceduralBatch` | Procedural batch outputs | `services.procedural.generator` |
| `state.manager` | Editorial catalog and planner state | `services.sessions` + `ui.viewmodels.manager` |
| `state.sessions` | Review queue and active item state | `services.sessions` + `ui.viewmodels.sessions` |
| `state.learning` | Approved/rejected/correction examples | `domain.learning` |
| `state.settings` | Project paths, auth state, UI settings | `services.config` |
| `state.play` | Live play interaction state | later UI shell, not first port target |

## Execution Order

| Order | Deliverable | Why first |
|---|---|---|
| 1 | Python scaffold and CLI entrypoint | Creates the stable home for the migration. |
| 2 | Domain-level serializers and validation | Lowest UI coupling, highest reuse. |
| 3 | Repo I/O services | Needed before save/export parity. |
| 4 | Preview rendering service | Bridges the current Python precedent into the new package. |
| 5 | Read-only UI shell | Safe first UI milestone. |
| 6 | Editor save/load parity | First real production workflow. |
| 7 | Sessions and playtest parity | More stateful, but still bounded. |
| 8 | Procedural and spreadsheet sync parity | Highest integration complexity. |

## Explicit Non-Goals for the First Autopilot Pass

- Rewriting `index.html` into a native Python desktop UI now
- Porting all of `app.js` in one batch
- Removing `server.mjs` during the first Python scaffold pass
- Changing canonical file formats or repo folder layout

## First Code Targets

The first implementation pass after this inventory should touch:

- `python_toolkit/pyproject.toml`
- `python_toolkit/README.md`
- `python_toolkit/src/feed_the_bear_toolkit/cli.py`
- `python_toolkit/src/feed_the_bear_toolkit/domain/`
- `python_toolkit/src/feed_the_bear_toolkit/services/`
- `python_toolkit/src/feed_the_bear_toolkit/ui/`

That pass should produce a runnable Python entrypoint and placeholder package boundaries without yet claiming feature parity.

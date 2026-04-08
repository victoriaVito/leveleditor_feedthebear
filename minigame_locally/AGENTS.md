# Feed the Bear Project Guidelines

## Code Style
- JavaScript: ES5+ (not ES modules in app.js), 2-space indentation, semicolons required
- Python: Standard library only for procedural scripts, follow PEP 8
- Reference: [docs/TOOLKIT_ARCHITECTURE.md](docs/TOOLKIT_ARCHITECTURE.md) for app.js patterns

## Architecture
- Local-first with Google Sheets mirror: Canonical data in `levels/`, `progressions/`, `bundles/`
- Monolithic client (app.js) + stateless server (server.mjs)
- Single file per deliverable: Iterate in place, register in memoria.md
- Reference: [docs/TOOLKIT_ARCHITECTURE.md](docs/TOOLKIT_ARCHITECTURE.md)

## Build and Test
- Start toolkit: `npm run sync:all`
- Validate levels: `node scripts/validate-levels.mjs`
- Sync sheets: `npm run sync:sheets:local`
- Reference: [NPM_SCRIPTS_REFERENCE.md](NPM_SCRIPTS_REFERENCE.md)

## Conventions
- Level naming: `<type>_<progression|description>_level<n>[_v<version>].json`
- Screenshots: Match level filename exactly, .json → .png
- Procedural learning: Tag rejections with specific reasons
- Reference: [docs/LEVEL_JSON_SCHEMA.md](docs/LEVEL_JSON_SCHEMA.md), [PROCEDURAL_ML_DESIGN.md](PROCEDURAL_ML_DESIGN.md)

---

# Workflow Rules

- Reuse the same target file for each document or artifact whenever possible.
- Create a new file only if the required file does not already exist.
- Iterate on the existing file instead of generating versioned copies such as `_v2`, `_final`, `_final2`, or dated duplicates unless the user explicitly asks for a separate version.
- Keep one canonical file per deliverable so the latest state is always clear.
- Register every file creation and every substantive file update in `memoria.md`.
- Each `memoria.md` entry must include:
  - Date
  - File path
  - Action: `created` or `updated`
  - Short reason for the change
- Before creating a new document, check whether a matching canonical file already exists and continue editing that file if it does.

## Coordination: Claude Opus + Codex (2026-03-24)

### What Claude Opus is handling RIGHT NOW

- **Button classification pass**: COMPLETED. All buttons in `index.html` now have `btn-primary` / `btn-muted` / default classification.
- **UI polish finalization**: The 6-step CSS/HTML/JS overhaul from 2026-03-23 is complete.
- Codex can now freely edit any file including `index.html` and `styles.css`.

---

## TASK: Button classification pass (2026-03-23) — DONE

Claude Opus classified all ~50 buttons in `level_toolkit_web/index.html` with `btn-primary` / `btn-muted` classes. Codex can now resume editing `index.html` if needed.

### Available classes

| Class | Look | Use for |
|---|---|---|
| `btn-primary` | Solid accent-blue bg, white text, bold | The 1-2 most important actions per toolbar (save, validate, confirm, generate) |
| `btn-muted` | Transparent bg, muted text, no border | Low-priority or rare actions (clear, reset, send knowledge, disconnect) |
| *(no class)* | Default light bg, dark text | Normal-weight actions (import, export, load, new) |

### Classification guide — every button in index.html

**Topbar (line 17-18)**

- `#reload-page-btn` → `btn-muted` (rare utility)
- `#force-sync-btn` → `btn-muted` (rare utility)

**Procedural view (lines 45-47)**

- `#btn-procedural-base-file` → default (file picker)
- `#btn-procedural-generate-variants` → `btn-primary` (main action)
- `#btn-procedural-clear-variants` → `btn-muted` (destructive/rare)

**Editor view (lines 117-161)** — already done by Claude:

- `#ed-auto-moves` → default
- `#ed-save` → `btn-primary` ✓
- `#ed-save-as-new` → default
- `#ed-validate` → `btn-primary` ✓
- `#ed-import`, `#ed-export`, `#ed-screenshot` → default
- `#ed-send-knowledge`, `#ed-send-antipattern`, `#ed-clear-trails`, `#ed-reset` → `btn-muted` ✓

**Editor play toolbar (line 166-168)**

- `#play-start` → `btn-primary` (main play action)
- `#play-reset` → `btn-muted` (destructive)
- `#play-export-session` → default

**Editor progression strip (line 197-198)**

- `#ed-save-to-progression` → `btn-primary` (save action)
- `#ed-save-new-level` → default

**Sessions view (lines 211-234)**

- `#session-import` → default
- `#session-add-current` → default
- `#session-load-progression` → default
- `#session-load-procedural-100` → default
- `#session-play-next` → `btn-primary` (main action)
- `#session-validate-selected` → `btn-primary` (validation)
- `#session-clear` → `btn-muted` (destructive)
- `#session-generate-learned` → `btn-primary` (generation)
- `#session-export-queue` → default

**Sessions play panel (line 258-259)**

- `#session-play-reset` → `btn-muted` (destructive)
- `#session-play-export` → default

**Sessions feedback (lines 298-300)**

- `#session-feedback-approve` → `btn-primary` (confirmation)
- `#session-feedback-reject` → `btn-muted` (destructive)
- `#session-feedback-send` → `btn-primary` (send action)

**Manager view (lines 315-330)**

- `#mgr-import` → default
- `#mgr-add-progression` → default
- `#mgr-rename-progression` → default
- `#mgr-duplicate-progression` → default
- `#mgr-toggle-liveops-lock` → default
- `#mgr-add-slot` → default
- `#mgr-remove-slot` → `btn-muted` (destructive)
- `#mgr-autofill` → `btn-primary` (main action)
- `#mgr-generate-from-refs` → `btn-primary` (generation)
- `#mgr-clear` → `btn-muted` (destructive)
- `#mgr-export-csv` → default
- `#mgr-export-progression-csv` → default
- `#mgr-export-curve-png` → default
- `#mgr-export-progression-png` → default
- `#mgr-export-progression-json` → default
- `#mgr-sync-spreadsheet` → `btn-primary` (sync action)

**Manager filter (line 379)**

- `#mgr-filter-reset` → `btn-muted` (reset)

**Manager pagination (lines 414-416)**

- `#mgr-page-prev` → default
- `#mgr-page-next` → default

**Settings view (lines 543-548)**

- `#settings-save` → `btn-primary` (save action)
- `#settings-sync-sheet` → default
- `#settings-connect-sheet-api` → `btn-primary` (connect action)
- `#settings-check-sheet-api` → default
- `#settings-disconnect-sheet-api` → `btn-muted` (destructive)
- `#settings-clear-cache` → `btn-muted` (destructive)

### Rules

- Only add `class="btn-primary"` or `class="btn-muted"` — do NOT touch buttons that should stay default
- If a button already has a class, append (e.g. `class="btn-muted"` not replace existing classes)
- Do NOT change button text, IDs, or any JS logic
- Do NOT modify `styles.css` — the CSS classes already exist
- Register the change in `memoria.md`

## Recent UI overhaul (2026-03-23)

Claude Opus performed a comprehensive UI polish of the Level Editor and Level Manager views in the web toolkit. All changes are in the existing three files (`level_toolkit_web/styles.css`, `level_toolkit_web/index.html`, `level_toolkit_web/app.js`). No new files were created.

### What changed

**CSS (`styles.css`)**

- Topbar: replaced border-bottom with subtle box-shadow
- Sidebar: added gradient background, nav buttons with smooth transitions and inset accent on active state
- Views: fade-in animation on view switch, increased padding, refined heading typography (22px, -0.01em tracking)
- Buttons: global transitions on background/border, scale(0.97) on click, focus-visible outlines for accessibility
- New `.btn-primary` class (accent bg, white text) for Update and Validate buttons
- New `.btn-muted` class (transparent, muted text) for Send Knowledge, Anti-Pattern, Clear Trails, Reset
- Tags: 11px bold with letter-spacing, `.tag-updated` pulse animation on status change
- Labels: 12px uppercase with letter-spacing globally
- New `.toolbar-group` class: inline-flex with left border separator for visual grouping within toolbars
- New `.section-header` class: uppercase muted h3 with bottom border for manager sections
- New `.editor-status-bar` class: collapsible `<details>` wrapper for editor status tags
- New `.canvas-frame` class: padded frame with border, gradient background, subtle shadow for canvas elements
- Manager: card hover lift (translateY -1px + shadow), slot left-border colored by difficulty (green/orange/red), difficulty cards with saturated left-border gradients, insight card headers with bottom border, pool grid with subtle gradient background
- Progress bars: styled with accent color, rounded corners
- Log blocks: monospace font, max-height 200px with overflow scroll

**HTML (`index.html`)**

- Editor toolbars: consolidated from 5 flat toolbars into 3 grouped toolbars + 1 collapsible status bar
- Controls grouped with `<span class="toolbar-group">`: properties | toggles | draw tools | primary actions | file actions | advanced
- Added `class="btn-primary"` to Update and Validate buttons
- Added `class="btn-muted"` to Send Knowledge, Send Anti-Pattern, Clear Trails, Reset buttons
- Both canvases (editor + session) wrapped in `<div class="canvas-frame">`
- Manager h3 headings converted to `.section-header` class

**JS (`app.js`)**

- Added `resizeEditorCanvas()` function: dynamically resizes editor canvas to fit available frame width (max 640px), called on view switch and window resize with 150ms debounce
- Added tag pulse animation trigger in `updateEditorSaveStatus()`
- Slot difficulty classes (`slot-easy`, `slot-medium`, `slot-hard`) were already implemented in `updateManagerPlanner()`

## Procedural learning update (2026-03-23)

Analysis of accumulated learning data (10 approved, 23 rejected) revealed:

1. **Meaningless blockers** are the top rejection cause (35%). Blockers placed randomly without interacting with pair paths.
2. **Too easy** is second (39%), often combined with too much space or not enough pairs.
3. **Pair count too low** for board size (13%). Generator caps at 3 pairs even on 8x8.
4. **Spanish feedback not detected** — many rejections had tags=[] because feedback was in Spanish.

Changes made:

- `LEARNING_TEXT_TAG_PATTERNS` in `app.js`: expanded all patterns with Spanish equivalents and added new `meaningless_blockers` tag
- `scoreCandidateWithLearning()`: added `meaningless_blockers` penalty based on `blockerSpread` and `blockerClusterRatio`
- `learningDrivenGenerationAdjustments()`: `meaningless_blockers` count now contributes to `avoidBlockerClusters` and `spreadBlockers`
- Startup: added `normalizeLearningBuckets()` + `saveLearning()` after restore to re-tag existing entries with new patterns
- `PROCEDURAL_ML_DESIGN.md`: updated sections 6, 8.1, 9, and 10 with real data analysis and concrete recommendations

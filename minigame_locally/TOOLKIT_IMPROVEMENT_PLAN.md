# Level Toolkit Improvement Plan

This document proposes the next structural upgrade of the toolkit. The goal is not only to fix isolated pain points, but to make the system easier to trust, easier to recover, and easier to operate as a designer-facing internal tool.

The plan focuses on four areas:

1. Faster large-catalog rendering and less hidden-view work
2. Clearer progression versioning and save-point recovery
3. Tighter visual comparison flows between candidate levels
4. A cleaner data contract between the toolkit, exported files, and spreadsheet reporting

The guiding principle is simple: preserve the current editorial flexibility, but remove ambiguity, unnecessary work, and weak recovery paths.

## Design Principles For The Upgrade

- The visible view should control the work budget.
- File identity must be stable and explainable.
- A progression shown in the UI must always map to a recoverable saved state.
- Candidate comparison should support editorial judgement, not only validation metadata.
- Spreadsheet reporting should be a derived view, not a second source of truth.

## 1. Performance: Large Catalogs and Hidden Views

### Current problem

The toolkit still spends too much time rendering and recomputing information that the user cannot currently see. The largest sources of friction are:

- `All Levels` card rendering across a large catalog
- hidden sections performing updates after unrelated changes
- previews being generated earlier than they are needed
- autosave and sync paths being mixed into normal UI refreshes

### Best implementation approach

The best approach is not one big optimization pass. It is a layered budget model:

1. reduce what is mounted
2. reduce what is recomputed
3. reduce what is serialized
4. instrument the system so slow paths are obvious

This is better than blindly adding more caching, because the current problem is partly over-rendering and partly bad coupling between view updates and save/export work.

### Target architecture

- Visible-view rendering only
- Virtualized or windowed large lists
- Preview generation on demand
- Save and sync jobs decoupled from primary interaction loops
- A small diagnostics layer to explain why the tool is slow when it is slow

### Implementation phases

#### Phase 1: Render budget

- Virtualize `All Levels` so only visible cards are mounted.
- Keep pagination as a fallback for very large catalogs or low-performance profiles.
- Render card chrome immediately but defer screenshots/previews until the card enters the viewport.
- Stop building `CSV Review` rows until the user opens `CSV Review`.
- Stop updating hidden manager subpanels when only the active panel changed.
- Avoid rebuilding the full planner grid when only one slot changed.

#### Phase 2: Save budget

- Split autosave into two lanes:
  - lightweight UI state
  - heavier materialization state
- Only serialize the editor state when the editor changed.
- Only serialize progression state when progression state changed.
- Only trigger spreadsheet sync after stable manager mutations.
- Reduce chained refreshes that currently call:
  - render
  - autosave
  - metadata log
  - workbook sync
  in a single interaction.

#### Phase 3: Performance instrumentation

- Add timing logs for:
  - manager render
  - slot update
  - `All Levels` render
  - preview generation
  - autosave
  - workbook sync
  - Google Sheets sync
- Add a simple `Performance` subsection in `Settings` to display:
  - last render duration
  - last sync duration
  - preview queue size
  - current profile (`Low`, `Medium`, `High`)

### Risks

- Virtualization can break drag-and-drop if implemented too aggressively.
- Lazy previews can create blank-looking cards if the placeholders are poor.
- Too much instrumentation can itself become noise if always visible.

### Success criteria

- `All Levels` stays responsive with a large catalog.
- Switching manager tabs no longer causes visible stalls.
- Autosave no longer feels tied to every click.
- The user can tell when performance degradation comes from rendering, previews, or sync.

## 2. Progression Versioning and Save-Point Recovery

### Current problem

There is still too much ambiguity between:

- browser state
- manager state
- progression JSON files
- exported bundles
- runtime copies
- reconstructed versions after recovery

This makes it too easy to lose confidence in what the current editorial truth actually is.

### Best implementation approach

The right model is a save-point model, not just a snapshot model.

A snapshot says "something was saved." A save-point says:

- what was saved
- when
- why
- from which source
- and how to restore it

This is especially important because the tool is being used in a designer workflow where the visual arrangement of slots is editorially meaningful.

### Target architecture

- Explicit progression versions
- Stable latest working copy
- Named save-points
- Recoverable history from inside the UI
- Slot-by-slot diff visibility

### Implementation phases

#### Phase 1: Stable save-points

- Introduce explicit progression statuses:
  - `Draft`
  - `Reviewed`
  - `Approved`
- Save progression versions under a dedicated structure such as:
  - `progressions/versions/<progression_key>/<timestamp>.json`
- Keep:
  - `latest.json`
  - `last_manual_save.json`
  - `last_exported_bundle.json`
- Materialize the exact slot order, level references, moves, difficulty, notes, and screenshot references.

#### Phase 2: Recovery UI

- Add a `Recovery` panel in `Level Manager`.
- Show:
  - current progression file
  - last manual save
  - last autosave
  - last bundle export
  - last spreadsheet sync
  - missing reference warnings
- Allow:
  - `Restore`
  - `Preview restore`
  - `Diff against current`

#### Phase 3: Diff and traceability

- Add progression diff views by slot:
  - file changed
  - moves changed
  - difficulty changed
  - notes changed
  - screenshot changed
- Track origin metadata:
  - manual save
  - autosave
  - import
  - procedural generation
  - recovery restore
  - spreadsheet pullback prevention marker

### Risks

- Too many versions can create clutter unless retention rules are clear.
- Recovery flows can be dangerous if restore is too easy and not previewed.

### Success criteria

- The progression shown in the UI is always traceable to a file-backed save-point.
- A previous progression state can be restored without guessing filenames.
- Recovery becomes part of the UI, not a forensic exercise in folders.

## 3. Visual Comparison Between Candidate Levels

### Current problem

Candidate review is still too linear and memory-dependent. The tool makes it too easy to inspect one level at a time and too hard to compare alternatives as a designer would compare them.

The main comparison cases are:

- current slot level versus replacement candidate
- rejected level versus corrected level
- multiple procedural candidates for the same role
- same board idea with different move counts or blocker pressure

### Best implementation approach

The right model is a visual comparison workspace, not just a diff button.

The comparison needs to support both technical judgement and design judgement:

- "is this solvable?"
- "is this more readable?"
- "does this create better blocker pressure?"
- "does this fit the rhythm of this progression slot?"

### Target architecture

- Dedicated compare mode
- Side-by-side cards
- Shared metadata bar
- Visual delta cues
- Quick design labels

### Implementation phases

#### Phase 1: Compare mode

- Add a `Compare` action to manager cards.
- Allow pinning:
  - current slot level
  - another level from `All Levels`
  - an `Extras` candidate
  - a playtest-fixed version
- Show two or three levels side by side.

#### Phase 2: Comparison overlays

- Show shared comparison fields:
  - screenshot
  - board size
  - pair count
  - blocker count
  - moves
  - difficulty
  - validation
  - decal
  - notes
- Highlight differences in:
  - moves
  - blocker map
  - dimensions
  - pair layout
  - status

#### Phase 3: Design-facing comparison

- Add quick review tags:
  - `more readable`
  - `more deceptive`
  - `better blocker pressure`
  - `too noisy`
  - `better fit for slot`
  - `better teaching step`
- Store those decisions as structured metadata so they can later inform procedural generation.

### Risks

- If comparison mode becomes too dense, it turns into a spreadsheet instead of a decision surface.
- Too many quick tags can reduce clarity if they are not curated.

### Success criteria

- Two or more candidate levels can be judged visually in one place.
- The designer no longer needs to rely on memory when replacing a slot.
- Comparison metadata becomes reusable for later procedural tuning.

## 4. Cleaner Data Contract

### Current problem

The same level currently exists in multiple representations:

- toolkit in-memory state
- canonical level JSON
- progression slot assignment
- bundle export
- spreadsheet rows
- playtest event records

This creates drift risk and naming confusion, especially when files are renamed, reconstructed, or exported under alternate forms.

### Best implementation approach

The best approach is to define a small set of canonical schemas and derive every other artifact from them. This is better than trying to make every format equally primary.

The primary entities should be:

- level
- progression
- slot assignment
- manager item
- playtest event
- spreadsheet sync payload

### Target architecture

- Canonical schemas
- Stable IDs
- One transformation pipeline
- Explicit derived artifacts

### Implementation phases

#### Phase 1: Canonical schemas

- Define schemas for:
  - level
  - progression
  - manager item
  - playtest event
  - spreadsheet payload
- Document:
  - required fields
  - optional fields
  - derived fields
  - deprecated fields

#### Phase 2: Stable identifiers

- Give every level a stable `level_id`.
- Give every progression a stable `progression_id`.
- Give every slot assignment a stable `slot_id`.
- Treat filenames as delivery surfaces, not identity.
- Treat screenshots as derived assets, not authoritative assets.

#### Phase 3: Single transformation pipeline

- Build exports from canonical inputs only:
  - `levels/`
  - `progressions/`
  - manager materialization
  - playtest JSONL
- Make bundles, workbook rows, and reporting views derived products.
- Prevent spreadsheet sync from inventing identity or becoming the authority.

#### Phase 4: Contract validation

- Add validation checks for:
  - missing referenced levels
  - missing screenshots
  - stale bundle assets
  - slot assignments to unknown files
  - spreadsheet payload rows that do not map back to known levels

### Risks

- Stable IDs require a migration strategy for existing files.
- A stricter contract may expose many old inconsistencies at once.

### Success criteria

- The same level can be tracked reliably across editor, manager, bundles, playtest, and spreadsheet reporting.
- Exports stop depending on stale names or ad hoc recovery logic.

## Recommended Delivery Order

The best order is not the same as the order of pain. The best order is the one that reduces future rework.

### Step 1

Implement the cleaner data contract first.

Why:

- performance work is easier when the data flow is cleaner
- versioning is safer when identity is stable
- spreadsheet sync is more reliable when transformations are explicit

### Step 2

Implement progression versioning and save-point recovery.

Why:

- once identity is stable, recovery and diffing become much easier
- this also reduces the risk of losing editorial layouts during later refactors

### Step 3

Implement performance work.

Why:

- once state and save boundaries are cleaner, performance changes are less risky
- otherwise optimization may preserve the wrong coupling

### Step 4

Implement visual comparison flows.

Why:

- this benefits from the previous steps
- compare mode becomes much more useful if level identity, saves, and previews are already reliable

## Suggested Milestone Breakdown

### Milestone A: Data and recovery foundation

- canonical schema definitions
- stable IDs
- save-point folders
- recovery panel
- contract validation

### Milestone B: Performance hardening

- view-scoped rendering
- virtualization
- deferred preview generation
- sync decoupling
- diagnostics

### Milestone C: Comparison workspace

- compare mode
- pinned candidates
- structured design review tags
- comparison-driven replacement flow

### Milestone D: Spreadsheet and reporting confidence

- fully derived workbook generation
- stricter payload validation
- stale export detection
- manager-to-spreadsheet consistency checks

## Immediate Next Changes Worth Implementing

If the goal is to start immediately with the highest return, these are the first concrete changes worth shipping:

1. define stable `level_id`, `progression_id`, and `slot_id`
2. split autosave into lightweight state and heavy materialization
3. add save-point folders under `progressions/versions/`
4. add missing/stale asset validation to startup integrity checks
5. add `Compare` mode with two-card side-by-side review

## Expected Outcome

After this plan, the toolkit should feel less like a fragile internal editor and more like a reliable editorial system:

- faster to browse
- safer to recover
- easier to compare
- easier to export
- easier to trust

- Generate:
  - bundles
  - spreadsheet rows
  - manager DB rows
  - review exports
from the same normalized source objects.

#### Phase 4: Validation

- Add contract validation before:
  - save
  - export
  - spreadsheet sync
- Fail loudly when required fields are missing.

### Success criteria

- Exports and spreadsheet rows match the same source data.
- File naming changes no longer break reporting.

## Recommended Order

1. Performance and hidden-view work
2. Progression versioning and recovery
3. Data contract cleanup
4. Visual comparison mode

This order is intentional:

- performance affects everything immediately
- save-point recovery reduces current editorial risk
- data-contract cleanup prevents future drift
- comparison mode becomes stronger once the underlying data is stable

## Practical Next Milestone

The best next implementation milestone would be:

- virtualize `All Levels`
- add progression version folders and `latest` aliases
- define the canonical level/progression/manager schemas
- add a first side-by-side comparison view for two level cards

That milestone would improve daily usage without requiring a full rewrite.

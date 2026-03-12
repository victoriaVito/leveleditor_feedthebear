# Web Toolkit Performance and UX Plan

Last updated: 2026-03-11

## Skills To Use

### `develop-web-game`

Use for:

- the editor canvas
- play mode responsiveness
- regression checks after performance changes

### `playwright`

Use for:

- UI-flow verification
- tab-switch checks
- slot assignment checks
- large-catalog smoke tests

### `web-toolkit-performance`

Use for:

- locating hot paths
- reducing hidden-view work
- removing unnecessary autosave cost
- preview and card rendering optimization
- deciding when pagination or virtualization is required

## Current Bottlenecks

### 1. Autosave is too expensive

`persistWorkspaceState()` currently serializes editor state through `levelFromEditor()`, which can trigger solver work indirectly.

Target:

- persist lightweight editor state directly from `state.editor`
- keep solver calls only in validation or explicit recompute paths

### 2. Manager refresh is overloaded

`updateManagerTable()` currently acts as a central dispatcher and triggers multiple downstream refreshes.

Target:

- split table, planner, diff panel, curve, and persistence into separate update paths
- refresh only what actually changed

### 3. Planner rebuilds too much DOM

The manager planner recreates slots, cards, and listeners on each refresh.

Target:

- keep slot shells stable
- patch only changed slot content

### 4. Preview generation is still expensive

Preview generation uses canvas rendering plus `toDataURL()`.

Target:

- lazy-generate previews only for visible cards
- keep export-quality previews only for export flows

### 5. Item lookups are still linear

Repeated `find()` and slot scans occur in render-heavy paths.

Target:

- add `managerItemById`
- add `slotIndexByItemId`

### 6. Session table still rerenders too broadly

Selection changes rebuild the whole session table and persist the full workspace.

Target:

- separate row selection updates from full queue renders

## Implementation Plan

### Phase 1: Safe performance fixes

1. Remove solver-adjacent work from autosave.
2. Add manager item and slot indexes.
3. Stop refreshing hidden panels.
4. Reduce session-table rerenders on selection changes.

### Phase 2: Rendering improvements

1. Make manager slot shells persistent.
2. Lazy-render manager card previews.
3. Add `All Levels` pagination.

### Phase 3: Heavy-catalog mode

1. Add optional virtualization for `All Levels`.
2. Keep `CSV Review` screenshot generation opt-in only.
3. Separate lightweight UI preview mode from export-quality render mode.

## UX Improvement To Apply

### Empty-slot reference assignment

Current problem:

- assigning a level into an empty progression slot is still too manual

Proposed flow:

1. In a progression tab, click an empty slot and press `Ref`.
2. The slot enters a waiting state.
3. Open `All Levels`.
4. Press `Ref` on a level card.
5. That level is assigned directly to the waiting slot.

This should reduce drag-and-drop dependency and make long progression curation faster.

## Success Criteria

- switching to `Level Manager` does not visibly freeze
- `All Levels` opens without long stalls
- selecting a session row is instant
- assigning a level to a progression slot is lightweight
- validation remains correct
- exports still work

# Claude Prompt: Exact Documentation for the Level Editor

Use this prompt in Claude to generate accurate documentation for the `Feed the Bear` level editor from the codebase, not from assumptions.

---

## Prompt

```md
You are documenting the `Level Editor + Play` feature of this project with maximum factual accuracy.

Your job is to read the code first, then write documentation only from what is explicitly implemented.

## Goal

Produce a clear, complete, developer-facing document for the level editor:
- what it does
- how the UI works
- how editing works
- how validation works
- how play mode works
- how import/export works
- how learning feedback works
- what data shape the editor reads/writes
- important limitations and non-obvious behaviors

## Critical rules

1. Do not invent behavior.
2. If something is unclear, say `Not confirmed in code`.
3. Base every important claim on code evidence.
4. Prefer exact names from the UI and source code.
5. Distinguish between:
   - implemented behavior
   - inferred behavior
   - missing validation
   - UX limitations
6. When describing logic, mention the exact file and function names.
7. If the implementation and README differ, prioritize implementation and note the mismatch.
8. Write in professional English.
9. Do not write marketing copy.
10. Keep the output usable as internal product/engineering documentation.

## Files you must inspect first

- `level_toolkit_web/index.html`
- `level_toolkit_web/app.js`
- `level_toolkit_web/README.md`

Also inspect these if needed for context:
- `LEVEL_GENERATOR_SPEC.md`
- `schemas/level-output.schema.json`
- `level_toolkit_py/README.md`
- `level_toolkit_py/level_toolkit/editor.py`

## Minimum implementation details you must capture

### 1. Editor UI structure

Document the controls in the `Level Editor + Play` view, including:
- level input
- board size selector
- density selector
- moves input
- auto moves
- mode selector
- pair selector
- endpoint selector
- validate
- import/export
- screenshot
- reset
- play pair selector
- play mode toggle
- play reset
- approve/reject/clear learning
- log area
- board canvas

### 2. Editing behavior

Explain exactly how board clicks behave in each editor mode:
- `blocker`
- `node`
- `erase`

Document these interaction rules precisely:
- changing board size clears blockers and pair endpoints
- placing a blocker removes any node already in that cell
- placing a node removes any blocker already in that cell
- placing a node also clears an existing node already occupying that cell
- only pairs with both endpoints are considered active
- supported pair IDs are `A`, `B`, `C`, `D`

### 3. Data model

Explain the object produced by the editor, including:
- `level`
- `board_size`
- `grid`
- `pairs`
- `blockers`
- `moves`
- `solution_count`
- `target_density`
- `golden_path`
- `validation`
- `meta`

Call out exact behavior such as:
- `solution_count` is computed with `countSolutions(...)`
- if moves input is `0` or empty, moves fall back to `recommendedMoves()`
- `golden_path` from the editor is only a direct `{ pairId: [start, end] }` mapping, not a full solved route
- `validation.density_match` is hardcoded to `true` in `levelFromEditor()`

### 4. Validation

Document what `validateLevel(level)` actually checks:
- level range
- board size range
- pair count range
- pair coordinates bounds
- node overlap
- blocker bounds
- blocker/node overlap
- solution count against density range
- moves >= 0

Also explicitly list what validation does **not** check if that is true in code.

### 5. Play mode

Explain the actual implemented play loop:
- play mode toggle
- selected play pair
- path initialization from each pair start
- adjacency rule using Manhattan distance
- blockers cannot be crossed
- cells occupied by other pairs cannot be used
- stepping back to previous cell pops the path
- reaching all pair ends marks the board as solved

Be precise about how occupancy is tracked and any caveats.

### 6. Import/export and screenshot

Document:
- import via hidden file input
- JSON parse flow
- export filename format
- screenshot taken from canvas as PNG
- reset behavior

### 7. Learning memory

Explain the approve/reject system exactly as implemented:
- data stored in browser `localStorage`
- key name `ftb_learning_v1`
- approved/rejected arrays
- stored feature fields
- scoring influence during procedural generation

### 8. Constraints and edge cases

Call out non-obvious implementation details, for example:
- board sizes allowed are 4, 5, 6
- validation expects 2 to 4 pairs
- the editor supports four pair slots even if some are unused
- imported files are loaded into editor state without structural normalization beyond field assignment
- play mode is turned off when loading a level
- reset clears layout but does not necessarily restore all toolbar values to defaults

## Required output format

Return the document in this structure:

1. `# Level Editor Documentation`
2. `## Purpose`
3. `## Where It Lives`
4. `## UI Overview`
5. `## Editor State Model`
6. `## Editing Workflow`
7. `## Validation Rules`
8. `## Play Mode Behavior`
9. `## Import, Export, and Screenshot`
10. `## Learning Feedback System`
11. `## Level JSON Produced by the Editor`
12. `## Known Limitations and Implementation Notes`
13. `## Source References`

## Source References section requirements

At the end, include a bullet list of the exact files and functions used as evidence, for example:
- `level_toolkit_web/app.js` -> `initEditor`
- `level_toolkit_web/app.js` -> `levelFromEditor`
- `level_toolkit_web/app.js` -> `validateLevel`
- `level_toolkit_web/app.js` -> `handlePlayClick`
- `level_toolkit_web/app.js` -> `resetPlayState`
- `level_toolkit_web/app.js` -> `loadLevelToEditor`
- `level_toolkit_web/index.html` -> `#view-editor` controls

## Quality bar

The document should be detailed enough that:
- a developer can modify the editor safely
- a QA person can derive test cases from it
- a designer/product person can understand current behavior vs missing behavior

Before writing the final document, first produce a short evidence summary listing:
- key files inspected
- key functions inspected
- any ambiguities or gaps

Then write the documentation.
```

---

## Recommended usage

Paste the prompt above into Claude together with this repo or the relevant files. For the most accurate result, ask Claude to read the files before drafting anything.

Suggested follow-up prompt:

```md
Now turn this into a polished internal Markdown doc and keep every technical claim traceable to the implementation.
```

# Feed the Bear Python Parity Checklist

This file is the operational checklist for closing parity between the native Python toolkit and the legacy web toolkit.

## Closing Order (Executed)

1. Inventariar workflows y fijar contrato de parity
2. Congelar fixtures maestros
3. Mapear y cerrar procedural parity contra app.js
4. Cerrar editor canvas y metadata workflows
5. Cerrar manager/progression planner
6. Cerrar sessions/review/variant workflows
7. Auditar y cerrar spreadsheet parity
8. Hardening: suites, smoke tests, checklist
9. Cutover controlado + rollback

## 2026-04-10 Execution Status

| # | Step | Status |
|---|---|---|
| 1 | Workflow inventory + parity contract | Complete |
| 2 | Master fixtures frozen in tests | Complete |
| 3 | Procedural parity vs `app.js` | Complete |
| 4 | Editor canvas + metadata workflows | Complete |
| 5 | Manager/progression planner parity | Complete |
| 6 | Sessions/review/variants parity | Complete |
| 7 | Spreadsheet parity audit | Complete |
| 8 | Hardening (full suite + docs sync) | Complete |
| 9 | Controlled cutover + rollback contract | Complete |

## 1. Procedural

- [x] `generateLevelRaw` behavior mapped against `level_toolkit_web/app.js` with explicit parity notes in change logs and tests.
- [x] Reference-driven candidate generation uses matching intent semantics for `pairs`, `blockers`, and `board`.
- [x] Mutation/search orchestration has deterministic coverage for recovery mutation, relaxed fallback, and strict-path fill.
- [x] Learning decisions persist with JS-compatible shapes and normalized bucket behavior.
- [x] Learned batch generation validates solved candidates and rejects duplicate gameplay layouts.
- [x] Procedural tests assert parity-critical behavior (selection, dedupe, gating, persistence), not only schema shape.

Evidence:

```bash
python3 -m unittest discover -s python_toolkit/tests -p 'test_procedural*.py' -v
# Ran 32 tests in 78.833s
# OK
```

## 2. Native Editor

- [x] Canvas editing supports the core authoring loop: open, edit, validate, save, reopen.
- [x] Pair endpoints/blockers/moves/difficulty/metadata round-trip without unintended field loss.
- [x] Save flows cover overwrite, progression-slot save, and standalone save with explicit result feedback.
- [x] Validation and preview refresh in-session after edits and saves.
- [x] Procedural variants and session items open directly in editor with stable source metadata.

Evidence:

```bash
python3 -m unittest discover -s python_toolkit/tests -p 'test_native_app.py' -v
# Ran 10 tests in 0.018s
# OK
```

## 3. Manager / Progressions

- [x] Live snapshot load/save works against canonical manager files.
- [x] Progression metadata supports edit/duplicate/validate/export/save with deterministic paths.
- [x] Slot operations (assign/clear/add/remove/open-in-editor) update UI + disk consistently.
- [x] Progression validation reports missing/invalid file paths.
- [x] Editor-to-progression save round-trip preserves expected fields.

Evidence:

```bash
python3 -m unittest discover -s python_toolkit/tests -p 'test_native_app.py' -v
# Includes manager/progression helper coverage
# OK
```

## 4. Sessions / Review

- [x] Play session files can be inspected and opened in editor with selected-item context.
- [x] Queue load/save/summary is deterministic by status.
- [x] Review actions support approve/reject/keep + notes/tags and persist across reload.
- [x] Review feedback writes into learning state from desktop workflow.
- [x] Deterministic pending-item transitions are tested.
- [x] Play session import and queueing flows run without manual JSON edits.

Evidence:

```bash
python3 -m unittest discover -s python_toolkit/tests -p 'test_sessions.py' -v
# Ran 8 tests in 0.029s
# OK
```

## 5. Spreadsheet

- [x] Auth visibility covers credentials path, token path, and connection mode.
- [x] Canonical workbook/payload visibility is exposed in status inspection.
- [x] Recommended spreadsheet actions are selectable/runnable with explicit command result.
- [x] Token disconnect and local cache-clear are available and tested.
- [x] Wrapped command preflight failures are explicit (no silent fail).
- [x] Wrapper vs native ownership is codified in command specs.

Evidence:

```bash
python3 -m unittest discover -s python_toolkit/tests -p 'test_spreadsheet.py' -v
# Ran 12 tests in 0.049s
# OK
```

## 6. Hardening

- [x] Full `python_toolkit/tests` suite is green.
- [x] README reflects Python-first workflow and parity priorities.
- [x] Checklist reflects current runtime/test surface.
- [x] `memoria.md` updated for substantive parity closures.
- [x] Web toolkit documented as fallback path.

Evidence:

```bash
python3 -m unittest discover -s python_toolkit/tests -p 'test_*.py' -v
# Ran 102 tests in 130.214s
# OK
```

## 7. Cutover + Rollback Contract

- [x] Cutover default: Python CLI/native UI for daily authoring, review, procedural, and spreadsheet orchestration.
- [x] Web toolkit remains fallback only for emergency continuity.
- [x] Rollback entrypoints are explicit and reversible.

Cutover commands:

```bash
python3 python_toolkit/run_cli.py ui-status
python3 python_toolkit/run_cli.py native-ui --tab manager
```

Rollback commands:

```bash
npm run sync:all
# fallback web toolkit served by server.mjs/local browser flow
```

Operational rule:

- If Python parity tests regress, pause cutover and temporarily route affected workflow back to the web fallback until parity suite returns green.

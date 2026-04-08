# PLAN: Feed the Bear Python Toolkit Migration
**Date**: 2026-04-07 23:05 CEST
**Status**: EN PROGRESO
**Project**: Feed the Bear local toolkit

---

## 1. Goal

Finish the migration from the current web toolkit (`level_toolkit_web/index.html`, `level_toolkit_web/app.js`, `server.mjs`) to a Python-first toolkit that is usable for daily work before full UI parity exists.

The practical target remains incremental cutover, not a big-bang rewrite:

1. make Python the source of truth for domain and persistence logic
2. make common editorial, QA, and review workflows operable from Python CLI and Python UI
3. keep the current web toolkit alive as fallback until parity is proven per subsystem

## 2. Current State

### Completed

- Migration inventory exists in `docs/PYTHON_TOOLKIT_MIGRATION_INVENTORY.md`
- Python scaffold exists under `python_toolkit/`
- Python domain layer exists for:
  - tolerant level parsing
  - structural + metadata validation
  - pack validation and pack summaries
  - canonical level serialization
  - progression config loading and saving
  - live progression snapshot loading and saving
  - manager metadata loading and saving
  - progression-level referenced-level validation
  - play session parsing and saving
  - play sessions state parsing and saving
  - playtest dataset append flows
- Python persistence layer exists for:
  - file status
  - text writes
  - append-only writes
  - base64 reads
  - data-url writes
  - zip creation
- Python CLI exists for:
  - level inspection, validation, serialization
  - pack validation and summarization
  - repo I/O operations
  - progression inspection, validation, and write round-trips
  - manager metadata inspection and write round-trips
  - live progression inspection, validation, and write round-trips
  - play session and play sessions state inspection and persistence
- Python-hosted local UI shell exists for:
  - overview/status
  - Level Inspector
  - Pack QA
  - Progressions
  - Sessions
- Local test suite exists and is green:
  - current baseline before the next slice: `34` tests

### Still Pending

- deeper canonical serializer parity against JS outputs
- procedural learning/scoring/generation parity
- spreadsheet/Google adapter boundary from Python
- real level editing inside the Python UI shell
- cutover orchestration away from `server.mjs` for compatible flows
- golden parity fixtures against `app.js`-driven outputs

## 3. Self-Critique

- The plan can still overestimate how quickly procedural generation can be ported. The safest near-term target is deterministic scoring and learning normalization, not full generation parity.
- Spreadsheet migration should not attempt to replace OAuth and Google API behavior immediately. A Python wrapper around existing local-first scripts is lower risk.
- The Python UI shell should avoid pretending to be a full canvas editor too early. A mini editor for basic fields and draft validation is a safer milestone than reproducing the current browser editor in one pass.
- The first failure mode is contract drift: Python serializers or adapters could silently diverge from the current repo formats. Every mutating slice needs round-trip tests before it is trusted.
- A new developer should be able to understand the plan without reading the whole repo, so the active execution slices below are intentionally narrow and explicit.

## 4. External Feedback

### Copilot

No disponible. The `consultar-copilot.sh` helper returned exit code `255`, which indicates Copilot CLI was not available or authenticated in this environment.

### Gemini

Pending at plan capture time. If the helper returns feedback later, the canonic local plan should be updated with any material deltas rather than spawning a second competing plan file.

## 5. Consolidated Execution Plan

### Active Slice A — Python UI Shell to Mini Editor
**Priority**: P0
**Goal**: move the current Python shell from inspection-only toward safe editing for common level work

#### A1. Mini editor fields
- Add editable controls for:
  - level path
  - id/name
  - board width/height
  - difficulty tier
  - moves
  - solution count
  - target density
- Keep pair/blocker editing out of the first pass unless it can be done without destabilizing the current shell.

#### A2. Draft validation and serialization
- Add UI actions for:
  - validate edited draft
  - preview canonical JSON for the draft
  - compare the draft against the currently loaded level summary

#### A3. Safe write checkpoint
- Only add save-to-output or save-to-repo when the existing Python serializers can rewrite the draft through a controlled route.

**Exit criteria**
- A user can load a level, adjust basic fields, validate the draft, and preview canonical JSON from the Python shell.

### Active Slice B — Procedural Learning and Scoring Boundary
**Priority**: P0
**Goal**: create the first Python procedural module without claiming full generator parity yet

#### B1. Port learning normalization
- Port `normalizeLearningBuckets()` semantics into a Python procedural module.
- Normalize placeholder values and keep bucket shapes deterministic.

#### B2. Port scoring boundary
- Port the logic around `scoreCandidateWithLearning()` and `learningDrivenGenerationAdjustments()` into Python result models and pure functions.
- Focus on deterministic feature scoring and adjustment hints, not UI wiring.

#### B3. Add tests
- Add representative learning fixtures and candidate fixtures.
- Verify Spanish/English rejection-tag normalization where possible.

**Exit criteria**
- Python can normalize learning buckets, score a candidate, and compute learning-driven adjustments with repeatable test output.

### Active Slice C — Spreadsheet Adapter Boundary
**Priority**: P0
**Goal**: let Python orchestrate current spreadsheet workflows without rewriting the Google integration yet

#### C1. Status and capability model
- Add a Python service that can report:
  - client credentials presence
  - token presence
  - known command availability
  - spreadsheet-related script entrypoints

#### C2. Compatibility command wrappers
- Wrap existing local-first flows behind Python methods for:
  - `sync:sheets:local`
  - `sync:sheets:push`
  - `apply:sheet-renames`
  - OAuth setup / reconnect / env checks

#### C3. Stable result contract
- Return deterministic status/result objects that are usable from both CLI and UI.

**Exit criteria**
- Python can inspect spreadsheet sync readiness and invoke the compatible script wrappers through a stable service boundary.

### Next Slice D — Cutover and Parity Guardrails
**Priority**: P1
**Goal**: avoid silent divergence while Python takes over more flows

#### D1. Golden fixtures
- Add parity fixtures for:
  - level round-trip writes
  - progression round-trip writes
  - play session round-trip writes

#### D2. Status surfacing
- Keep the UI and CLI status surfaces aligned with the real migration state.

#### D3. Controlled migration
- Shift default workflows only when the Python slice has:
  - deterministic output
  - focused tests
  - a clear fallback to the current web toolkit

## 6. Active Ownership Split

| Slice | Owner | Scope |
|---|---|---|
| Procedural parity boundary | Parallel worker | `python_toolkit/src/feed_the_bear_toolkit/domain/procedural.py`, focused tests |
| Spreadsheet adapters | Parallel worker | `python_toolkit/src/feed_the_bear_toolkit/services/spreadsheet.py`, focused tests |
| Python UI mini editor | Parallel worker + mainline integration | `python_toolkit/src/feed_the_bear_toolkit/ui/*`, focused tests |
| Plan consolidation and integration | Mainline | plan docs, integration, verification, canonical status |

## 7. Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Procedural parity gets scope-creep into full generator rewrite | High | High | Keep the first pass limited to learning normalization and scoring/adjustment boundaries |
| Spreadsheet wrapper leaks unstable subprocess details into callers | Medium | High | Return stable Python result models and keep raw script behavior behind the adapter |
| UI mini editor drifts into an unfinished canvas rewrite | Medium | High | Limit first pass to field editing, draft validation, and serialization preview |
| Serializer drift writes incompatible artifacts | Medium | High | Add focused round-trip tests before enabling save flows |
| Competing plan files create confusion | Low | Medium | Keep `docs/PYTHON_TOOLKIT_MIGRATION_PLAN.md` as the repo canonical plan and mirror it to Dropbox |

## 8. Success Criteria

- [ ] Python UI shell supports a safe mini editor flow for basic level fields
- [ ] Python procedural module exists for learning normalization and deterministic candidate scoring
- [ ] Python spreadsheet adapter boundary reports readiness and wraps the current local-first sync flows
- [ ] The active migration status is visible in both repo docs and `app_status()`
- [ ] New slices land with focused stdlib tests and no dependency on replacing the current web toolkit immediately

## 4. Improvements Proposed

These are not optional polish items. They reduce migration risk and should be treated as part of the implementation strategy.

### Improve reliability
- Add one shared error model for parse, validation, path, and persistence failures.
- Keep CLI outputs deterministic and compact so autopilot can parse them safely.
- Prefer stdlib test infrastructure unless a new dependency is clearly justified.

### Improve traceability
- Add round-trip serializer tests for canonical level JSON.
- Add parity fixtures for representative levels and progressions.
- Keep one canonical migration plan and one canonical inventory document only.

### Improve safety
- Keep a strict allowlist for writable repo roots.
- Add dry-run or preview modes before any bulk writes.
- Preserve current repo schemas exactly during early migration phases.

### Improve usability
- Add pack-level validation and summaries before attempting UI parity.
- Make progression health visible from CLI, not only from the browser toolkit.
- Focus on “daily useful” operator flows first, not on final architecture purity.

## 5. Priorities

### Highest Priority Now

1. `validate-levels-under <folder>`
2. `summarize-level-pack <folder>`
3. canonical level serializer
4. progression and manager metadata write path
5. progression health summary command

### Medium Priority

6. sessions/playtest domain
7. playtest persistence
8. learning state models
9. procedural scoring parity

### Lower Priority Until Core Is Stable

10. spreadsheet adapter migration
11. Python-hosted UI shell
12. full cutover from the old toolkit

## 6. Criteria of Done

The Python migration is "usable for real work" when all of the following are true:

- level folders can be validated and summarized from Python
- canonical level JSON can be parsed and rewritten by Python without schema drift
- progression configs and manager metadata can be read and written safely from Python
- review/playtest artifacts can be produced from Python
- common offline QA no longer depends on the browser toolkit

The migration is "operationally complete" only when:

- Python owns domain + persistence + orchestration
- parity fixtures pass for representative workflows
- the web toolkit is fallback-only or retired by subsystem

## 7. Immediate Next Step

The next implementation pass should be:

1. add `validate-levels-under <folder>`
2. add `summarize-level-pack <folder>`
3. add the first canonical level serializer

This is the highest-value next slice because it makes Python useful for real pack-level work immediately and prepares the write path for progressions.

---
*This plan is the current master migration plan. It supersedes the earlier “all pending” version by reflecting the actual state of `python_toolkit/` as of 2026-04-07.*

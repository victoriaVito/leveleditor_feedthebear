# Procedural Changes

## Current source of truth

- [docs/PROCEDURAL_ML_DESIGN.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/docs/PROCEDURAL_ML_DESIGN.md)
- procedural runtime in [level_toolkit_web/app.js](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web/app.js)

## Key decisions

- procedural design, learning, and ML-readiness live in one canonical document
- learning must be inspectable outside the browser
- reference-driven generation is the active procedural workflow

## Important files

- [docs/PROCEDURAL_ML_DESIGN.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/docs/PROCEDURAL_ML_DESIGN.md)
- [scripts/run_procedural_pipeline.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/run_procedural_pipeline.py)
- [scripts/export_procedural_learning_snapshot.py](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/export_procedural_learning_snapshot.py)
- [scripts/audit_procedural_learning.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/audit_procedural_learning.mjs)
- [scripts/replay_procedural_learning_scorer.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/replay_procedural_learning_scorer.mjs)
- [docs/agents/PROCEDURAL_DESIGN_CRITIC.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/docs/agents/PROCEDURAL_DESIGN_CRITIC.md)

## Recent outcomes

- procedural knowledge pipeline folded into canonical design doc
- editor-side knowledge and anti-pattern capture added
- reference generator cleanup and recovery-stage mutations improved
- procedural pack generation now targets the active `levels/otherLevels/` catalog instead of legacy root copies
- the supported pack is now capped by the editor contract (`7x8` max) and no longer advertises itself as unsupported in the web editor
- `npm run pipeline:procedural` now regenerates the pack, previews, manager/workspace state, procedural queue, learning snapshot, audit, replay, and validation artifacts in one pass
- the learning snapshot exporter now prefers `.local/toolkit_state/learning_state.json` over stale SQLite or bundle copies

2026-03-23

- Updated PROCEDURAL_ML_DESIGN.md with actual learning state analysis (10 approved, 23 rejected, 0 corrections)
- Documented four dominant rejection patterns: meaningless blockers (35%), too easy (39%), needs more pairs (13%), bad layout (13%)
- Added `meaningless_blockers` tag to LEARNING_TEXT_TAG_PATTERNS for detecting blocker placement feedback
- Expanded all tag patterns with Spanish equivalents (mas parejas, sin sentido, agrupacion, distribucion rarisima, etc.)
- Added `meaningless_blockers` penalty in `scoreCandidateWithLearning()` and `learningDrivenGenerationAdjustments()`
- On startup, learning data is now re-normalized and saved to apply new tag patterns to existing entries
- Updated recommended next steps based on concrete rejection data analysis

2026-03-24

- Added `scripts/audit_procedural_learning.mjs` to audit duplicates, invalid approvals, source-family mix, feature drift, stale persistence artifacts, and solved-but-invalid playtest signals.
- Added `scripts/replay_procedural_learning_scorer.mjs` to replay the current scorer offline on resolvable historical examples and report score separation plus unresolved coverage gaps.
- Learning writes in `level_toolkit_web/app.js` now recompute validation and `solution_count`, persist richer mechanic signals, and attach `source_family` metadata.
- Solved-session auto-approvals are now blocked when the underlying level is still invalid, so the learning dataset no longer adds those noisy positives automatically.
- Generated canonical procedural audit and scorer-replay reports under `output/procedural/` so the investigation can be re-run and inspected outside the browser.

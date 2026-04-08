# Procedural Generation, Learning, and ML Design

## 1. Purpose

This is the canonical design document for Feed the Bear's procedural system.

It combines three concerns that were previously split across separate notes:

- procedural generation rules
- learning and persistence flow
- ML readiness and evaluator-design questions

The goal is to keep one source of truth for how procedural content is generated, reviewed, stored, and improved.

## 2. System summary

Feed the Bear uses a procedural generator that combines explicit difficulty rules, human feedback, and solution verification.

At a high level, the system:

1. uses the fish color system as the pair palette
2. chooses generation parameters from a per-level difficulty curve
3. builds multiple deterministic candidates from a seeded RNG
4. validates each candidate by counting real solutions
5. scores candidates using hand-tuned heuristics plus accumulated designer knowledge

This document describes what is already true in the current system, what still needs to be formalized as reusable patterns, and what questions must be answered before an ML model is worth building.

## 3. Confirmed building blocks

### 3.1 Fish color system as the piece palette

- `config/fish_colors.json` defines 14 fish identities.
- The 14 entries correspond to 7 species, each with 2 visual variants: solid and striped.
- They are mapped to letters `A` through `N`.
- The generator assigns the first `N` fish in sequence depending on how many pairs the level needs.

This makes the color system a controlled piece vocabulary rather than a cosmetic layer.

### 3.2 Difficulty curve by level

The intended episode curve is expressed through generation parameters, not only through post-hoc scoring.

Updated progression (2026-03-26, informed by Flow Free benchmark analysis):

| Level | Board | Pairs | Blockers | Density |
|-------|-------|-------|----------|---------|
| 1 | 4×4 | 2 | 0 | HIGH |
| 2 | 4×4 | 2–3 | 0–1 | HIGH |
| 3 | 4–5 | 2–3 | 1–2 | MEDIUM-HIGH |
| 4 | 5×5 | 3–4 | 1–2 | MEDIUM |
| 5 | 5–6 | 3–4 | 1–3 | MEDIUM |
| 6 | 6×6 | 4–5 | 2–3 | MEDIUM-LOW |
| 7 | 6–7 | 4–6 | 2–4 | LOW |
| 8 | 7×7 | 5–7 | 2–4 | VERY-LOW |
| 9 | 7×7 | 5–7 | 3–5 | SINGLE |
| 10 | 7×8 | 6–8 | 3–5 | LOW-MEDIUM |

Key changes from previous curve:

- The active board contract now caps the procedural pipeline at `7x8`
- Pair counts scale up to 8 without exceeding the supported editor contract
- Blocker counts reduced relative to board size — quality over quantity
- Solution density still tightens from HIGH to SINGLE

### 3.3 Generation pipeline

> **Visual reference**: `docs/PROCEDURAL_SCORING_FLOW.png` is a rendered diagram of the full pipeline — from difficulty profile load through candidate generation, scoring, designer review, and learning loop. Mermaid source at `docs/PROCEDURAL_SCORING_FLOW.mmd`.

The current generator follows this sequence:

1. seeded RNG for deterministic and reproducible output
2. random pair-node placement with minimum Manhattan distance `3`
3. corner avoidance during pair placement
4. L-shaped routing between pair nodes, currently vertical then horizontal
5. iterative blocker insertion, re-checking the solution count after each change
6. blocker usefulness checks: blockers should stay close to routed lanes, pressure multiple pairs when possible, and avoid dead zones
7. generation of `12` candidates, then selection of the best candidate by score

### 3.4 Learning signals

The generator already learns from production-facing signals:

- levels approved by the designer
- levels rejected by the designer
- manual fixes made in the level editor
- solved play sessions

The current system uses weighted heuristic scoring to move future candidates toward approved patterns and away from rejected ones.

### 3.5 Solution counter

Difficulty is not inferred only from visible layout complexity.

The system uses a depth-first search with memoization to count valid solutions. This matters because it measures actual branching and ambiguity, which is closer to gameplay difficulty than simple visual inspection.

### 3.6 Variant generation

`generateReferenceDrivenCandidates()` mutates existing levels to produce nearby alternatives.

This is useful because it lets the workflow iterate around a promising base design instead of generating every candidate from scratch.

Updated mutation behavior (2026-03-26):

- "More pairs" adds up to 2 pairs per mutation (was 1), capped at `floor(width*height/6)`
- "More blockers" adds clusters of 3 adjacent blockers (was 1 isolated)
- "Bigger board" is capped by the active editor contract, so reference-driven growth can reach `7x8` but not exceed it
- Board, pair, and blocker changes stack, but they must still stay inside the supported `7x8` envelope

### 3.7 Learning-driven adjustments

`learningDrivenGenerationAdjustments()` reads accumulated feedback and adjusts generation parameters:

| Parameter | Range | What drives it |
|-----------|-------|----------------|
| `pairBias` | -1 to +4 | `needs_more_pairs`, `too_easy`, `too_much_space` tags increase; high rejected pair count decreases |
| `boardDelta` | -1 to +2 | `too_easy` increases board size; `too_much_space` decreases |
| `blockerBias` | -2 to +4 | `meaningless_blockers` and `bad_blocker_clustering` tags decrease; `needs_more_blockers` increases |
| `desiredSolutionCap` | 1+ | Converges toward approved solution count mean |
| `desiredMovesFloor` | 0+ | Pushes minimum moves upward based on `too_easy` feedback |
| `maxFreeCellsPerPair` | 4.5+ | Tightens when `too_much_space` or `needs_more_pairs` feedback received |
| `desiredEngagedBlockerRatio` | 0.0 to 0.95 | Requires most blockers to sit near actual routing pressure, especially on mid and hard levels |
| `desiredPairPressureCoverage` | 0.0 to 0.95 | Requires blockers to influence more pair lanes instead of only occupying empty space |
| `desiredMultiPairBlockerRatio` | 0.0 to 0.7 | Prefers blockers that shape more than one pair corridor when the board is large enough |
| `maxDeadBlockerRatio` | 0.08 to 1.0 | Caps blockers that do not interact with any likely route corridor |

### 3.8 Flow Free benchmark integration

16 levels from Flow Free were analyzed as a difficulty and design benchmark. See `docs/FLOW_FREE_BENCHMARK_ANALYSIS.md` for the full analysis.

Key findings applied to the generator:

- 8×8 boards should have 6–8 pairs (FtB was using 3–4)
- The best levels use 0–4 purposeful blockers, not 9–11 random ones
- High coverage (85%+) correlates with perceived difficulty
- Perimeter-wrapping routes create natural "frames" that make interior routing interesting
- Zero-blocker boards with many pairs produce pure path interference difficulty

7 benchmark pattern tags are available for learning:

- `perimeter_wrap_route`
- `zero_blocker_pure_interference`
- `blocker_cluster_chokepoint`
- `high_coverage_difficulty`
- `pair_scaling_benchmark`
- `long_distance_endpoints`
- `nested_route_structure`

Benchmark levels are stored in `levels/benchmark_flow_free/` (16 JSONs).

## 4. Difficulty features

### 4.1 Confirmed features

| Feature | Range | Effect on difficulty |
|---|---|---|
| Grid size | `4x4` to `7x8` | Bigger is harder |
| Pair count | `2` to `N` | More pairs is harder |
| Start-end distance | Manhattan distance per pair | Greater distance is harder |
| Blocker count | `0` to `N` | More blockers is harder |
| Blocker clustering | isolated vs. grouped | Adjacent blockers create diminishing-return difficulty |
| Solution count | `1` to `20+` | Fewer solutions is harder |

### 4.2 Blocker area rule

When blockers are adjacent by edge, they form one area. Difficulty contribution should follow:

```text
difficulty(area of K blockers) > difficulty(1 blocker)
difficulty(area of K blockers) < K x difficulty(1 blocker)
```

Two candidate formulas worth validating:

```text
area_difficulty = 1 + log2(K)
```

```text
area_difficulty = K^0.7
```

The design intent is simple: clustered blockers should matter, but they should not count exactly like the same number of isolated blockers.

### 4.3 Composite difficulty score

```text
D = w1 x grid_area_norm
  + w2 x pair_count_norm
  + w3 x avg_pair_distance_norm
  + w4 x effective_blocker_score_norm
  + w5 x (1 / solution_count_norm)
```

Where `effective_blocker_score` is the sum of `area_difficulty` across connected blocker groups.

All features should be normalized to `[0, 1]`. The weights can eventually be learned from data, but the current dataset is not large enough yet.

## 5. Learning and persistence pipeline

### 5.1 Goal

Good manual levels and reviewed procedural variants should become persistent procedural knowledge instead of staying only in the browser session.

### 5.2 Current capture points

1. `Reference Generator -> Keep`
   Writes an `approve` learning entry with context `reference_keep`.
2. `Reference Generator -> Save`
   Writes an `approve` learning entry with context `reference_save`.
3. `Reference Generator -> Discard`
   Writes a `reject` learning entry with:
   - `reason_code`
   - `reason_text`
   - `pair_ids`
   - `pair_feedback`
   - `reference_intent`
4. `Play session solved`
   Writes an `approve` entry with session-derived path and history metadata.
5. `Level Editor -> Send Knowledge`
   Writes an `approve` entry with context `editor_pattern` and stores:
   - `source_file`
   - `source_link`
   - `source_label`
   - `pattern_origin: editor_manual`
6. `Level Editor -> Send Anti-Pattern`
   Writes a `reject` entry with context `editor_antipattern` and stores:
   - `source_file`
   - `source_link`
   - `source_label`
   - `reason_code: bad_layout`
   - all current pair ids

### 5.3 Persistence path

1. the UI updates `state.learning`
2. `saveLearning()` writes to browser `localStorage`
3. `saveLearning()` also writes the canonical repo file:
   - `.local/toolkit_state/learning_state.json`
4. `queueBrowserStateSync("learning_saved")` triggers the browser-state export path
5. additional persisted copies may live in:
   - `.local/ftb_local_store.db`
   - `.local/browser_state_exports/latest_browser_state_bundle.json`

### 5.4 Inspectable export

Run:

```bash
python3 scripts/export_procedural_learning_snapshot.py
```

This writes:

```text
output/procedural/procedural_learning_snapshot.json
```

The export includes:

- counts
- latest approved patterns
- latest rejected patterns
- latest corrections
- full raw learning payload

Current caveat:

- the exporter now prefers `.local/toolkit_state/learning_state.json`
- stale SQLite or bundle copies can still exist, but they no longer win over the repo learning file during export

### 5.5 How the generator uses knowledge

Approved patterns:

- pull generation toward similar board width and height
- pull generation toward similar pair count
- pull generation toward similar blocker density
- pull generation toward similar move and solution profile

Rejected patterns:

- push generation away from similar feature shapes
- penalize repeated bad pair layouts
- add targeted penalties for reasons such as `paths_cross`

Corrections:

- bias generation toward corrected versions instead of the original bad shape

### 5.6 Current limitations

- startup currently loads `localStorage` first and only restores the repo learning file if the browser bucket is empty
- browser-state sync is best-effort and can miss last-second saves
- the repo file, browser bundle, SQLite snapshot, and exported JSON do not currently arbitrate freshness by timestamp

### 5.7 Next hardening step

The export path now treats `.local/toolkit_state/learning_state.json` as canonical.

The remaining hardening work is in restore arbitration:

- startup still needs explicit timestamp arbitration when browser `localStorage`, the repo file, and browser-state bundles disagree
- stale derived artifacts should continue to lose to the repo learning file by default

### 5.8 Canonical pipeline

Run:

```bash
npm run pipeline:procedural
```

This pipeline now performs the supported procedural refresh end to end:

1. regenerate the procedural pack into `levels/otherLevels/`
2. refresh the matching screenshots
3. sync manager, workspace, and play-session state to the active catalog
4. export `procedural_learning_snapshot.json`
5. emit the audit and scorer-replay JSON artifacts
6. validate the active level catalog

Primary outputs:

- `output/procedural/procedural_pipeline_report.json`
- `output/procedural/procedural_learning_snapshot.json`
- `output/procedural/procedural_learning_audit.json`
- `output/procedural/replay_procedural_learning_scorer.json`

## 6. Current learning-state reality

Updated: 2026-03-28.

- `approved_count = 83`
- `rejected_count = 25`
- `corrections_count = 0`
- freshest inspected source: `.local/toolkit_state/learning_state.json`

### 6.1 Source mix

Current family mix from the audit artifact:

- `editor`: `67` approved, `0` rejected
- `session`: `13` approved, `18` rejected
- `reference`: `3` approved, `7` rejected

The current dataset still mixes authored editor levels, solved play sessions, and reference-review decisions. That means global averages are learning across different level families, not one homogeneous population.

### 6.2 Current replay signal

The scorer replay now resolves `47` of `108` historical entries, with:

- `approvedResolved = 43`
- `rejectedResolved = 4`
- `coverage = 43.5%`
- `pairwiseApprovalWinRate = 77.9%`

This is good enough to keep using the scorer as a diagnostic tool, but not good enough to treat the replay as full historical ground truth because more than half of the entries are still unresolved.

### 6.3 Current data-quality caveats

- the playtest audit currently sees `94` records, `87` solved, and `45` solved records still marked `INVALID`
- `3` approved entries are still invalid approvals in the audit output
- the scorer replay still reports `13` resolved invalid examples and only `47` resolved entries total
- source heterogeneity remains the main reason global averages drift across incompatible level families

These issues make the dataset useful for qualitative diagnosis, but not yet clean enough for weight tuning or supervised learning.

### 6.4 Key insight: blocker intelligence

The clearest design lesson is still that **blockers must interact with pair paths** to be meaningful. The current scorer partially reacts to this through tags and candidate-only mechanic signals, but stored historical examples still do not persist blocker topology richly enough to learn that structure directly.

A good blocker should:

- sit on or adjacent to the shortest path between at least one pair
- force the player to think about an alternative route
- not cluster in areas far from all pair paths

A bad blocker:

- sits in dead space where no pair route would ever go
- clusters with other blockers in a wall that is easy to walk around
- creates a hole pattern that looks random

### 6.5 Key insight: source heterogeneity

The current learning memory is not one kind of example:

- editor patterns include larger authored boards, sometimes up to `8` pairs
- solved-session approvals can include levels that are solved but still invalid by validation rules
- reference-review data comes from a smaller nearby-variant workflow

Because of that mix, global averages and exact-level buckets are only rough guidance.

### 6.6 Practical consequences

1. Clean and reconcile the dataset before tuning weights.
2. Persist richer mechanic features, not only board, pair, blocker, move, and solution counts.
3. Add restore-time freshness arbitration across repo file, browser bundle, SQLite snapshot, and exported JSON.
4. Treat blocker placement intelligence and pair scaling as the next heuristic targets after data cleanup.

## 7. Questions that matter for good patterns

Before building a model, the team needs sharper design answers about what a good procedural pattern actually is.

### 7.1 Quality target

- What defines a good level in this project?
- Is success measured by solve time, number of mistakes, number of restarts, designer approval, or a qualitative "aha" moment?
- Should the system optimize for difficulty, quality, or both as separate outputs?

### 7.2 Blocker intent

- What makes a blocker placement good instead of merely restrictive?
- Should blockers cut the obvious route and create a meaningful rethink?
- Which blocker patterns feel difficult in an interesting way, and which ones feel frustrating or noisy?

### 7.3 Pair interaction

- Do good levels require meaningful interference between pairs?
- Is it better when pairs compete for space, or when each pair remains locally readable?
- Are forced crossings a desirable challenge or usually a sign of bad layout?

### 7.4 Path language

- Are L-shaped paths the intended style, or only the current implementation shortcut?
- Do we want more organic shapes later, or is the design identity based on orthogonal clarity?
- If path style changes, which current difficulty assumptions stop being reliable?

### 7.5 Episode curve

- What should levels `1` through `10` feel like in player terms, not only generator parameters?
- Is the target curve linear, stepped, or more like an S-curve?
- Which levels are supposed to teach, reinforce, surprise, or test mastery?

## 8. Questions that matter for a useful ML model

### 8.1 Data sufficiency

- 25 approved examples and 26 rejected examples exist in the live repo state as of 2026-03-24.
- The dataset is larger than the 2026-03-23 snapshot, but it is not homogeneous enough for a supervised model.
- Duplicate decisions, stale exports, and solved-but-invalid approvals reduce the effective signal quality.
- We still need corrected examples, cleaner play-session telemetry, and stronger source normalization.
- Bilingual feedback extraction helps recall, but tag semantics are still not fully aligned with the UI keep tags.

### 8.2 Problem framing

The easiest useful ML problem is:

- candidate level in
- evaluator score out

The hardest version is:

- generator directly produces good levels

For this project, the evaluator is the sensible first target.

### 8.3 Runtime target

- If the model must run in the browser, it should stay lightweight.
- If it can run server-side, larger models become possible.
- This affects architecture long before model selection.

### 8.4 Prediction target

Useful outputs could include:

- scalar difficulty score
- difficulty bucket
- approve or reject likelihood
- separate quality score
- separate frustration risk score

Difficulty and quality should probably not be collapsed into one number.

## 9. Recommended next steps

1. **Canonicalize persistence and freshness.** Make the repo learning file the winner, or add explicit timestamp arbitration across all learning surfaces.
2. **Clean the current dataset.** Deduplicate repeated decisions, isolate solved-but-invalid positives, and inspect zero-solution approvals before changing weights.
3. **Persist richer features.** Add blocker spread, blocker clustering, path coverage, and free-cells-per-pair style signals to stored learning entries.
4. **Add an offline replay evaluator.** Re-score historical approved and rejected examples to see whether the current heuristic actually separates them.
5. **Then improve blocker placement intelligence and pair scaling.** These are still the clearest heuristic opportunities, but they should be tuned against a cleaned dataset.
6. **Keep the current heuristic scorer as the production baseline** until the cleaned dataset has stable per-source and per-tier coverage.

## 10. Recommendation

Do not build a full ML model yet.

The better near-term investment is:

1. make the learning source canonical or freshness-aware
2. clean the labeled dataset before trusting the current averages
3. persist richer mechanic features so the system can learn more than coarse counts
4. add an offline evaluator before tuning heuristic weights
5. treat ML first as a candidate evaluator, not as a generator

## 11. Source of truth and references

Canonical references for this topic:

- generation logic: `level_toolkit_web/app.js`
- learning snapshot exporter: `scripts/export_procedural_learning_snapshot.py`
- learning storage: `.local/ftb_local_store.db`
- fish palette: `config/fish_colors.json`
- procedural critique prompt: `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`

This file replaces the old split between design notes and the standalone procedural knowledge pipeline note.

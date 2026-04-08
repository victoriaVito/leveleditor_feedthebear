# Playtest System

This document describes how Feed the Bear captures play sessions, stores the latest session snapshot, and turns play data into analysis and learning signals.

The system has two different kinds of artifacts:

1. `playtest/latest_play_session.json` stores the latest full session snapshot.
2. `playtest/playtest_events.jsonl` stores flattened analysis records, one line per saved session.

That distinction matters: the JSONL file is not a generic event stream with a `type` field. The actual interaction events live inside the saved session history.

## 1. System Overview

The playtest flow starts in the toolkit Play Sessions surface.

Users can:

1. load levels from a progression or a procedural pack
2. play the selected level on the editor board
3. validate, approve, or reject the level
4. export the current session state for later review

When a session is saved, the toolkit writes:

- the latest full session snapshot to `playtest/latest_play_session.json`
- one flattened analysis record to `playtest/playtest_events.jsonl`
- a browser-local copy through the generic persistence bridge

The server does not expose a playtest-specific endpoint. The toolkit uses the generic file-write bridge endpoints from `server.mjs`, and `/playtest/` is served as static content.

## 2. Interaction Event Catalog

The inspected `playtest/latest_play_session.json` snapshot contains a `history` array with five interaction event types.

| Event type | Fields | Meaning |
|---|---|---|
| `reset` | `type`, `at` | The play session was reset before a new attempt started. |
| `start_path` | `type`, `pairId`, `cell`, `anchor`, `at` | The player started drawing a route for a pair from the chosen endpoint. |
| `step` | `type`, `pairId`, `cell`, `at` | The player extended the current route by one cell. |
| `reach_end` | `type`, `pairId`, `cell`, `at` | The route reached the opposite endpoint for that pair. |
| `backtrack` | `type`, `pairId`, `cell`, `at` | The player removed part of the current route while undoing progress. |

Observed in the current snapshot:

- `reset`: 1
- `start_path`: 4
- `step`: 33
- `reach_end`: 4
- `backtrack`: 1

The timestamps in `at` are millisecond epoch values.

## 3. Session Structure

The checked-in `playtest/latest_play_session.json` sample has these top-level fields:

- `saved_at`
- `solved`
- `level`
- `selected_pair`
- `paths`
- `history`
- `save_reason`

[VERIFY: `saved_path` is written by the save flow in `app.js`, but it is not present in the checked-in snapshot inspected here.]

The nested `level` object is a playable runtime copy of the level, not just the canonical level file. In the inspected snapshot it includes:

- `level`
- `board_size`
- `board_width`
- `board_height`
- `grid`
- `pairs`
- `blockers`
- `decal`
- `moves`
- `solution_count`
- `target_density`
- `difficulty`
- `golden_path`
- `validation`
- `meta`
- `position`

The runtime-only `position` field stores the session location as `{ progression, slot }`.

The `paths` object stores the drawn route for each pair id. In the inspected snapshot:

- `A` length: 7
- `B` length: 11
- `C` length: 9
- `D` length: 13

## 4. JSONL Analysis Record

`playtest/playtest_events.jsonl` is an append-only line-delimited file.

The first 200 inspected lines all share the same record shape. There is no `type` field. Instead, each line is a flattened summary of a saved session.

| Field | Type | Meaning |
|---|---|---|
| `saved_at` | string | When the summary record was written. |
| `origin` | string | Where the save came from. In the inspected data this is `editor`. |
| `save_reason` | string | Why the session was saved. In the inspected data this is `manual` or `validate`. |
| `saved_path` | string | Where the full session snapshot was saved. |
| `solved` | boolean | Whether the session ended in a solved state. |
| `level_name` | string | Human-readable level label. |
| `level_number` | integer | Level tier number. |
| `board_width` | integer | Level width. |
| `board_height` | integer | Level height. |
| `board` | string | Convenience label such as `7x7`. |
| `pairs` | integer | Pair count. |
| `blockers` | integer | Blocker count. |
| `moves` | integer | Move budget or move count carried by the level. |
| `difficulty` | string | Human-readable difficulty label. |
| `decal` | boolean | Whether the level is decal/full-cover style. |
| `validation_status` | string | Coarse validation result, usually `OK` or `INVALID`. |
| `history_length` | integer | Number of interaction events captured in the session. |
| `path_lengths` | object | Per-pair route lengths, keyed by pair id. |
| `level_file` | string | Source level filename if present. |
| `level_saved_path` | string | Saved canonical path if present. |
| `session` | object | The full nested session payload. |

The inspected JSONL data contains 21 records:

- `origin`: all `editor`
- `save_reason`: 4 `manual`, 17 `validate`
- `validation_status`: 6 `OK`, 15 `INVALID`

In the inspected lines, the nested `session` payload includes `saved_path`, even though the checked-in top-level `latest_play_session.json` snapshot does not show that field.

## 5. Procedural Queue

`playtest/procedural_100_queue.json` is a 100-item queue of procedural review candidates.

Each item has these top-level fields:

- `file`
- `source`
- `review_status`
- `validation_status`
- `level`

The inspected file has:

- `source`: `Procedural 100`
- `review_status`: `PENDING`
- `validation_status`: `OK`

The nested `level` object follows the same runtime level shape used by the toolkit. The inspected sample includes procedural metadata such as:

- `meta.generated_by`
- `meta.generated_at`
- `meta.generator_family`
- `meta.reference_source`
- `meta.reference_transform`
- `meta.learning_feedback_tags`
- `meta.approved_anchor_levels`
- `meta.rejected_sibling_levels`
- `validation.reference_variant`

The Play Sessions UI loads review queues by cloning levels into `state.sessions.queue`. The current implementation has two loaders:

1. `loadProgressionIntoSessions()` for a selected progression tab.
2. `loadProceduralPackIntoSessions()` for the procedural pack currently held in the manager catalog.

[VERIFY: `playtest/procedural_100_queue.json` is a stored queue artifact, but the current Play Sessions loader reads from manager items rather than this file directly.]

## 6. Data Flow

```mermaid
graph TD
  A[Player interaction on the session board] --> B[history event]
  B --> C[serializePlaySession]
  C --> D[playtest/latest_play_session.json]
  C --> E[buildPlaytestDatasetRecord]
  E --> F[playtest/playtest_events.jsonl]
  C --> G[generic file bridge]
  G --> H[/api/save-file /api/append-file]
  H --> I[repo files and reports]
  F --> J[offline analysis]
  D --> K[session resume / latest snapshot]
  J --> L[procedural learning]
  K --> L
```

In the actual code path:

1. The player draws a route in the Play Sessions board.
2. The runtime session accumulates `history` and `paths`.
3. `serializePlaySession()` produces the current snapshot.
4. `saveSolvedSession()` writes the snapshot to `playtest/latest_play_session.json` when the session is solved.
5. `appendPlaytestDatasetRecord()` appends the flattened summary record to `playtest/playtest_events.jsonl`.
6. Session feedback can also be sent to `reports/session_feedback_inbox.ndjson` through the generic append bridge.

## 7. Metrics That Matter

The most useful signals in the current implementation are:

- `solved`: whether the level was completed.
- `validation_status`: whether the level is structurally valid enough to be worth further review.
- `history_length`: how much interaction the player needed to finish or attempt the level.
- `path_lengths`: how long each pair route ended up being.
- `moves`, `pairs`, `blockers`, `board_width`, `board_height`: the structural shape of the level.
- `difficulty`: the designer-facing difficulty label.
- `save_reason`: whether the session was recorded as a normal save or a validation pass.

The `history_length` and `path_lengths` values are especially useful for spotting levels that are solved but feel noisy, overlong, or awkward to route.

[VERIFY: that interpretation is an inference from the capture shape and not a named metric in code.]

## 8. How Playtest Feeds Learning

Playtest contributes to learning in two ways.

### Solved sessions

When `saveSolvedSession()` runs, it writes an `approve` learning entry with context like:

- `${origin}_solved_session`

It also stores:

- `history_length`
- `path_lengths`

This makes solved play sessions part of the procedural knowledge base.

Current caveat:

- the approval is currently gated by solved state, not by validation status
- in the inspected `2026-03-24` dataset, `20` of `21` records are solved, but `15` of those solved records still have `validation_status = INVALID`
- until that gate is tightened, solved-session approvals should be treated as noisy positives rather than clean ground truth

### Session feedback

When a level is approved or rejected in the Play Sessions UI, `applySessionDecision()` writes a learning entry with context like:

- `session:${item.file}`

The decision payload includes feedback details such as:

- `reason_code`
- `reason_text`
- `keep_tags`
- `pair_ids`
- `pair_feedback`
- `note_text`

This is the bridge from human review back into `state.learning`, which the procedural generator uses for future scoring.

The broader procedural design document treats solved play sessions as one of the confirmed learning signals, alongside approved levels, rejected levels, and editor fixes.

## How To Read Results

Use this trust order when you review a playtest outcome:

1. `validation_status`
2. observed player behavior
3. reviewer judgement and notes
4. synthetic summaries such as `VitoBot`

Operational reading rules:

- `solved` is not enough on its own. A solved session can still represent a broken or noisy board.
- `solved + VALID` is the cleanest positive signal, especially when the route history is short and the board does not show extreme ambiguity.
- `solved + INVALID` should be treated as a repair candidate, not as a trustworthy approval.
- Very long histories, repeated restarts, or large path detours usually point to confusion even when the board is technically finishable.
- A rejection with a specific note is often more useful than a silent approval because it tells the generator what to avoid.

In practice, use real player sessions to make design decisions, and use VitoBot to rank which levels deserve attention first.

## 9. VitoBot Synthetic Player

The toolkit now includes a `VitoBot` tab for synthetic play estimation.

This is not a visual bot that drags paths on the canvas cell by cell. It is a Monte Carlo synthetic player simulator with persona-based modelling. It reuses level validation, solution-count data, route-shape analysis, and bounded solution-family sampling to estimate how different player profiles would perform.

Supported sources:

- the current editor level
- the current Play Sessions queue
- the Procedural 100 manager catalog
- a real repo folder scan, filtered by a glob-style filename pattern

User controls:

- player profile: `novice`, `average`, `focused`, `expert`
- behavioural persona: `balanced`, `cautious`, `explorer`, `perfectionist`, `speedrunner`
- intelligence slider
- number of runs per level

Returned signals per level:

- success rate
- abandonment rate
- average solve time
- average session time
- average errors
- average misreads
- average dead ends
- average restarts
- tuning signal such as `Too hard or noisy`, `Error-prone`, `Maybe too easy`, or `Zigzag pressure`

The current default batch mode is useful for comparing many levels quickly, especially procedural packs.

### Simulation Model

VitoBot now works as a persona-weighted Monte Carlo simulator.

Each batch run:

1. builds a static board model from validation, mechanic signals, guide issues, and sampled solution families
2. applies a `profile` layer for raw skill, speed, and base error bias
3. applies a `persona` layer for behavioural taste, such as ambiguity tolerance, restart tolerance, clarity preference, or exploration bias
4. runs many stochastic passes and aggregates the outcome distribution instead of returning one deterministic answer

This matters because designers rarely need one "true" solve time. They need a probability spread:

- what a cautious player is likely to do
- whether an explorer keeps wandering into side routes
- whether a speedrunner finishes quickly but with more mistakes
- whether a perfectionist abandons noisy boards sooner than a balanced player

That makes VitoBot more useful for content triage, because it starts to model human-like differences instead of only one generic synthetic player.

### Solution Sampling

VitoBot now also exposes limited solution sampling per level.

It does not enumerate every possible solution forever. Instead, it captures a small bounded set of sample solutions and reports:

- stored `solution_count`
- sampled solution count
- unique sampled path families
- spread across sampled solutions
- ambiguity score

The detail panel shows sample route summaries such as:

- `A: Right -> Right -> Down`
- `B: Up -> Left -> Left`

That makes it possible to distinguish:

- one clear intended resolution
- several similar resolutions
- many permissive or noisy resolutions

### Current Limitations

- VitoBot is still heuristic. It is not calibrated yet against a large bank of real observed player sessions.
- It is Monte Carlo, but it is not full Monte Carlo Tree Search yet. There is no explicit search tree over route decisions or long-horizon rollout policy.
- Persona modelling is already useful, but the utility weights are still hand-tuned rather than learned from observed clusters of player behaviour.
- Solve time and error counts are estimated, not replayed from actual pointer input.
- Solution sampling is capped on purpose so large procedural batches remain usable.
- The strongest next step is calibration: compare VitoBot output against real `playtest/playtest_events.jsonl` sessions and tune the model until the synthetic metrics match the observed ones more closely.
- After that, the most credible upgrade is a lightweight MCTS-style route search for the highest-ambiguity levels, not a full neural rewrite.

## Pending [VERIFY] Flags

- `[VERIFY: saved_path is written by the save flow in app.js, but it is not present in the checked-in snapshot inspected here.]`
- `[VERIFY: playtest/procedural_100_queue.json is a stored queue artifact, but the current Play Sessions loader reads from manager items rather than this file directly.]`
- `[VERIFY: that interpretation is an inference from the capture shape and not a named metric in code.]`

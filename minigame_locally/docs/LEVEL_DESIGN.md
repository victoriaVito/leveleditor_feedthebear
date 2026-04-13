# Feed the Bear Level Design

This is the practical level-design bible for Feed the Bear. It explains how to make a board feel fair, readable, and intentional for casual mobile players.

The core design goal is still "Lo logre yo": the player should feel that the solution was theirs, not that they survived a system.

## 1. Vocabulary

Use these terms consistently when discussing or building a level.

| Term | Meaning |
|---|---|
| Pair | Two fish endpoints that must be connected by one path. |
| Blocker | A blocked cell that changes route choice and adds pressure. |
| Path | The route the player draws between a pair. |
| Solution | A valid complete way to solve the whole board. |
| Density | How open or constrained the board feels in play. |
| Golden path | The intended solved route stored in the level JSON. |
| `[VERIFY]` | A flag that marks an item that still needs confirmation before it is treated as final. |

Small board sketch:

```text
A . . B
. # . .
. . # .
A . . B
```

In this sketch, `A` is easy to read, `B` has to fight for central space, and the blockers create a real routing decision instead of random clutter.

Golden path sketch:

```text
A -> -> A
.    #  .
.    .  .
B -> -> B
```

The golden path is not just a validation artifact. It is a design clue that tells you what the level is trying to teach.

## 2. Anatomy Of A Good Level

Real examples from `levels/`:

| File | Shape | What it teaches |
|---|---|---|
| `../levels/progression_a/jsons/progression_a_level3.json` | `4x4`, `3` pairs, `1` blocker, `solutionCount: 2`, solvable | Compact pressure. A tiny board can still feel deliberate when one blocker meaningfully changes route order. [VERIFY: re-check metrics after latest schema migration.] |
| `../levels/progression_a/jsons/progression_a_level4.json` | `5x5`, `5` pairs, `3` blockers, `solutionCount: 20`, solvable | Readable pressure. The board is busy, but the player can still parse the lanes and work through them. [VERIFY: re-check metrics after latest schema migration.] |
| `../levels/progression_c/jsons/progression_c_level1.json` | `5x5`, `6` pairs, `3` blockers, `solutionCount: 2`, solvable | Curve caution. It shows how a Tier 1 slot can already feel dense if pair pressure arrives too early. [VERIFY: re-check metrics after latest schema migration.] |
| `../levels/progression_b/jsons/progression_b_level7.json` | `8x9`, `8` pairs, `6` blockers, `solutionCount: 0`, unsolvable | Negative example. It is useful because it shows overload and broken validation, not because it is a board to emulate. [VERIFY: re-check metrics after latest schema migration.] |

### Why `progression_a_level3` works

`progression_a_level3` is a good example of compact tension. The board is only `4x4`, but the single blocker sits where it actually matters, so the player has to notice ordering instead of drawing the first path they see.

### Why `progression_a_level4` works

`progression_a_level4` is useful because it looks busier than it really is. The board stays readable and valid, but the high solution count reminds you that visual load alone does not guarantee real tension.

### Why `progression_c_level1` needs caution

`progression_c_level1` is solvable, but it is dense for a first slot. That makes it a useful teaching example for curve design: a board can be valid and still feel too loaded for where it sits in a progression. [VERIFY: confirm whether `progression_c_level1.json` is still intended to open Progression C in the current editorial curve.]

### Why `progression_b_level7` is still useful to study

`progression_b_level7` is the kind of board a designer should reject quickly. It is unsolvable, overloaded, and a good reminder that more pairs plus more blockers does not automatically produce better tension.

## 3. How To Think About Difficulty

Difficulty is a set of design decisions, not a single number.

- Bigger boards give the player more room, but they also require stronger route pressure to avoid feeling empty.
- More pairs increase memory load and route competition, which makes order matter more.
- Longer start-end distances create more opportunities for conflict and detours.
- More blockers increase friction, but clustered or random blockers only help if they shape real routes.
- Lower solution counts create commitment, which is useful when you want the player to feel ownership over the answer.

Use this rule of thumb:

- Want freedom? Increase solution space and reduce blocker interference.
- Want pressure? Reduce solution space and place blockers where they actually affect routes.

The procedural-learning signal agrees with that lesson: the top rejection families are levels that feel too easy and levels with meaningless or poorly clustered blockers.

## 4. The Most Common Mistakes

The most common rejection families from procedural generation are: levels that feel too easy, meaningless blockers, and bad blocker clustering.

### 4.1 Blockers without purpose

This is the broad blocker-placement problem. Meaningless blockers and bad blocker clustering together form one of the clearest procedural failure families.

A blocker is weak if it sits in dead space, if it never changes the route choice, or if the player can ignore it without thinking.

Fix it by moving blockers onto or near real route pressure, especially where they shape the shortest or most obvious path.

### 4.2 Levels that are too easy

These boards usually have too much open space, too few pairs, or blockers that do not create tradeoffs. The player can solve them, but they do not feel earned.

Fix it by tightening the board, increasing pair competition, or reducing the number of harmless open corridors.

### 4.3 Under-allocating pairs on large boards

A large board with too few pairs feels hollow. The player spends more time reading emptiness than making decisions. This is smaller in the current tagged snapshot than the first two problems, but it still shows up in rejected feedback and it flattens the curve fast when it happens on `7x7` or `8x8`.

Fix it by increasing pair pressure as the board grows, instead of capping the pair count too early.

## 5. Complete Toolkit Workflow

Use the current toolkit surfaces in this order:

1. Open `Level Editor + Play`.
2. Set the board size and place pairs.
3. Add blockers only where they change the routing problem.
4. Run validation before you trust the shape.
5. Play the level in the same view and watch for accidental dead space or confusing crossings.
6. Save the level or save it as a new file.
7. Move to `Level Manager` if the level belongs in a progression slot.
8. Export the progression or bundle from the manager flow.
9. Sync the repo state to Sheets only after the canonical files are correct.

Use `Play Sessions` when you want structured feedback from real play and `Procedural` when you want candidate generation or learned variants.

Do not use the spreadsheet as the authoring source of truth. It is a review and planning surface.

## 6. Working With Procedural Generation

Use procedural generation when you are exploring nearby alternatives, filling curve gaps, or stress-testing a slot.

Do not use it for:

- Tutorial content
- Signature moments
- Any board where the exact feel matters more than speed of generation

How to evaluate a candidate:

- Does the blocker placement affect real routes?
- Does the solution count match the intended density?
- Does the board still read clearly at a glance?
- Does the screenshot communicate the intended puzzle shape?

What feedback to give:

- `Keep` when the route pressure feels intentional.
- `Discard` when the board is noisy, flat, or misleading.
- Add a reason tag so the learning loop can improve the next candidate.

The procedural system is a generator, not an authority. The designer still disposes.

## 7. Working With Live Ops Mixes

`Live Ops Mixes` are recombined editorial sets built from the `Original Progressions`. They are not new authored families; they are editorial products for rotation, events, and content expansion.

Use a mix when you need:

- a new order without new authored content
- a rotation-ready set for an event
- a way to recombine existing curves into a fresh package

Current flow:

`Mix Planner` -> approval -> `npm run materialize:mixes` -> `bundles/live_ops_mixes/`

Verify the output by checking that the bundle folder contains the expected JSON files, screenshots, CSV summary, and manifest. See [Bundles And Mixes](./BUNDLES_AND_MIXES.md) for the exact bundle shape.

## 8. Level Checklist

Before a level ships, check all of these:

- Is it solvable?
- Does the density match the slot?
- Do blockers have a purpose?
- Does the screenshot read clearly?
- Does the solution feel intentional?
- Are there any `[VERIFY]` items still unresolved?

If any answer is weak, the level probably needs another pass.

## Cross References

- [Feed the Bear GDD](../FEED_THE_BEAR_GDD.md)
- [Level JSON Schema](./LEVEL_JSON_SCHEMA.md)
- [Workflows](./WORKFLOWS.md)
- [Bundles And Mixes](./BUNDLES_AND_MIXES.md)
- [Procedural ML Design](../PROCEDURAL_ML_DESIGN.md)
- [Level Design Coordinator](./PROJECT_MASTER_HANDOFF.md)

## Pending [VERIFY] Flags

- [VERIFY: confirm whether `progression_c_level1.json` is still intended to open Progression C in the current editorial curve.]
- [VERIFY: confirm whether the tutorial file should be used as a shipped reference or treated only as a special-case import artifact.]

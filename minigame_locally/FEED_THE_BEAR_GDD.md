# Feed the Bear GDD

## 1. What This Is and Who It Is For

Feed the Bear is a casual mobile puzzle mini-game inside a broader product ecosystem, with delivery targeting Meta.

The player traces paths to connect colored fish pairs on a board while avoiding blockers and preserving the board's readable structure.

The north star is "Lo logre yo": the player should feel that the solution was theirs, not that they merely survived the system.

This document is the canonical high-level design reference for the project. It explains the experience first, then the workflow and data model behind it.

## 2. How It Plays

The core move is simple:

1. Find a pair.
2. Trace a path that connects the two ends.
3. Do not cross another path.
4. Work around blockers.

Example board:

```text
A . . B
. # . .
. . # .
A . . B
```

In this example, pair `A` reads as a short, direct connection, while pair `B` has to fight for the center space. The blockers turn a simple connect-the-dots board into a route-planning puzzle.

The board should communicate its tension quickly. If the player cannot tell where the pressure is, the puzzle feels arbitrary instead of intentional.

### Move Budget and Extra Moves

Each level ships with a **move budget** — the target number of moves the player has to solve the board. This is a *par*, not a hard wall. The move budget is always at least `pairs + 1`.

If the player cannot solve the board within the budget:

1. The level counts as **not won** on the first attempt.
2. The player can **add extra moves** and keep trying.
3. Each retry with extra moves still counts as a play, but the tracking records how many extra moves were needed.

This means **no level is truly stuck** — the player always has a path forward. But the extra-moves metric tells the design team everything it needs to know:

- `0 extra moves` → the budget was right or generous.
- `1–2 extra moves` → tight but playable, good tension.
- `3+ extra moves` → the budget is likely too low, or the level needs redesign.

The feedback template in the playtest spreadsheet tracks `extra_moves_used` per level per tester, so the team can see exactly where budgets need tuning.

## 3. What Makes a Puzzle Good

A good level passes three different checks.

| Layer | Question | Why it matters |
|---|---|---|
| Validation | Is it solvable and internally consistent? | A broken puzzle is not a puzzle. |
| Playtest | Does the route feel intentional in play? | A valid board can still feel awkward or noisy. |
| Design quality | Does it earn the "I did it" feeling? | The solution should feel deserved, not lucky. |

The design principles are consistent across authored and procedural work:

- Readability comes first.
- Blockers must have a purpose.
- Path interference is the real source of tension.
- Crowded is not the same as interesting.
- Visual design and puzzle design are linked.

If a board is dense but does not create tradeoffs, it is usually too flat.

## 4. Difficulty Model

Difficulty is not a single number. It is a combination of interacting decisions that change how the player reads and solves the board.

| Dimension | Player effect | Design interaction |
|---|---|---|
| Board size | Bigger boards give paths more room, but also more places to hide tension. | Bigger boards usually need more pairs or more purposeful blockers to stay interesting. |
| Pair count | More pairs increase route competition and memory load. | Large boards should not be capped too low, or the puzzle turns into empty space with a few endpoints. |
| Start-end distance | Longer spans increase route conflict and make ordering matter more. | Long spans become more powerful when blockers force detours instead of just making the board longer. |
| Blocker count and clustering | More blockers raise friction, but clustered blockers can feel stronger than isolated ones. | Blockers should shape routes, not merely occupy space. |
| Solution count | Fewer solutions create pressure and commitment. | Solution count measures real gameplay ambiguity, not only visual density. |

The current blocker insight is clear: about 35% of procedural rejections cite blockers that make no sense. That means blocker placement is not just a density problem, it is a purpose problem. The generator now penalizes `meaningless_blockers` and `bad_blocker_clustering` feedback tags, and the blocker bias can go negative to actively reduce blocker count.

Working size curve (updated 2026-03-26 based on Flow Free benchmark analysis):

| Board size | Suggested pair range | Suggested blockers | Benchmark reference |
|---|---|---|---|
| `4x4` | `2` pairs | `0-1` | — |
| `5x5` | `2-4` pairs | `1-2` | — |
| `6x6` | `4-5` pairs | `2-3` | — |
| `7x7` | `4-6` pairs | `2-4` | Flow Free uses 6-7 pairs on 8x8 |
| `8x8` | `6-8` pairs | `3-5` | Flow Free uses 6-8 pairs with 0-4 blockers |
| `9x9` | `7-9` pairs | `3-6` | Flow Free nivel 9b: 10 pairs, 0 blockers |

The larger boards are the ones most likely to need more pair pressure, not less. A hard cap of 3 pairs on `8x8` flattens the curve too early. The benchmark confirms that some of the best puzzles have zero blockers and rely entirely on path interference between many pairs.

**Note:** The pair-range table above is orientation, not a hard rule. The real constraint is cognitive load — which depends on the interaction between path length, blocker placement, solution count, and visual density. A board with more pairs than the table suggests can still feel clean if paths are short and blockers are purposeful. Always evaluate the board holistically instead of rejecting it on pair count alone.

## 5. Progression

The `Original Progressions` are authored editorial curves, not just a list of valid boards. The current authored families are `Progression A`, `Progression B`, `Progression C`, `Progression D`, `Progression E`, and `Progression F`.

Each slot has design intent:

- teach
- reinforce
- test
- breathe
- surprise

A practical player-facing curve for levels `1` to `10` should read like this:

| Slot | Editorial job | Target player feeling |
|---|---|---|
| `1` | Teach one clean read with very low ambiguity. | `I understand the rule.` |
| `2` | Reinforce the same read with one extra point of friction. | `I can repeat it on purpose.` |
| `3` | Introduce route ordering as the first meaningful decision. | `I have to think before I draw.` |
| `4` | Deliver the first real test board. | `This is asking something of me now.` |
| `5` | Briefly let the player breathe without becoming trivial. | `I feel confident, not bored.` |
| `6` | Increase pressure through route overlap, not only size. | `There is less room for sloppy play.` |
| `7` | Recombine known ideas in a slightly surprising way. | `I know the pieces, but not this arrangement.` |
| `8` | Reduce redundancy and ask for cleaner commitment. | `I need to read the board properly.` |
| `9` | Push the player into a high-pressure near-climax board. | `One wrong route will cost me.` |
| `10` | Close the arc with a synthesis board that feels earned. | `I solved something meaningful.` |

The curve should step up in pulses, not rise linearly. The lighter slots matter because they make the later tests feel fair instead of merely dense.

`Progression C` still needs one explicit editorial confirmation. If `progression3_level1_v2.json` remains the opening board, then the family is intentionally sharper from slot `1`. If that is not the intent, the opening slot should move to a cleaner board and the current candidate should shift later in the arc.

`Progressions D`, `E`, and `F` extend the same editorial model rather than replacing it. They should be read as additional authored curves in the same family system, with the same slot logic and the same expectation that each slot earns its position through teach / reinforce / test / breathe / surprise rhythm instead of raw difficulty alone.

The `Tutorial` is reserved content. It is handled separately from normal mix logic and should be treated as slot 0 behavior, not as a standard progression slot.

`Live Ops Mixes` are recombined editorial sets built from the original families. They are a separate product from the originals and can rotate order, recombine families, or create event-ready sets without net-new level production.

Current mix flow:

`Mix Planner` sheet -> approval -> `npm run materialize:mixes` -> `bundles/live_ops_mixes/`

That flow is an editorial production path, not a canonical authoring path.

## 6. Visual Language

The fish system is a gameplay vocabulary, not decoration.

The canonical palette defines 14 fish entries, grouped as 7 species with solid and striped variants. The entries are mapped to letters `A` through `N`, which keeps the palette stable for tooling, procedural generation, and review.

Why this matters:

- Players learn stable visual categories.
- Reviewers can compare families consistently.
- Procedural generation can assign colors deterministically.

The canonical source files are `config/fish_colors.json` and `FISH_COLORS_SYSTEM.md`.

## 7. Procedural Generation

The procedural system is meant to extend design judgment, not replace it.

The working philosophy is simple: "The generator proposes, the designer disposes."

What it does:

- Generates 12 candidates per request from a seeded RNG and presents the strongest options.
- Mutates promising references into nearby alternatives.
- Validates candidates by counting real solutions.
- Learns from approvals, rejections, fixes, and anti-patterns.

How the designer uses it:

- Keep or discard reference-driven candidates.
- Approve or reject play-session results.
- Send Knowledge or Send Anti-Pattern from the editor.

What the system learns:

- Approved patterns pull future candidates toward similar shapes.
- Rejected patterns push future candidates away from bad shapes.
- Corrections override broken shapes instead of averaging them in.

The generator is still better at producing valid candidates than at placing intentional blockers with strong spatial tension. The most frequent rejection families so far are levels that feel too easy (excess open space, low pair competition) and levels with meaningless or poorly clustered blockers. The dataset should be cleaned and enriched before anyone tries to jump to a full ML evaluator.

## 8. Technical Appendix

The procedural pipeline is still heuristic, but it is no longer opaque.

High-level generation flow:

1. Seeded RNG chooses board parameters and candidate openings.
2. Pair placement enforces distance and corner-avoidance rules.
3. L-shaped routing creates provisional paths.
4. Blockers are inserted iteratively and scored by how much they affect path pressure.
5. DFS with memoization estimates real solution count.
6. Validation checks solvability, density, and route sanity.

The current scorer combines simple features with mechanic signals:

- board, pairs, blockers, moves, solutions
- free cells per pair
- blocker density
- blocker cluster ratio
- blocker spread
- path coverage

Learning then shifts the score in both directions:

- approved examples pull similar candidates closer
- rejected examples push bad shapes away
- corrected examples act like stronger override signals

Persistence path today:

`state.learning` -> browser storage -> `.local/toolkit_state/learning_state.json` -> optional bundle and database exports

Key functions in `level_toolkit_web/app.js`:

- `generateLevel`
- `generateLevelRaw`
- `generateReferenceDrivenCandidates`
- `scoreCandidateWithLearning`
- `learningDrivenGenerationAdjustments`
- `countSolutions`
- `extractFeatures`
- `extractMechanicSignals`
- `validateLevel`

The composite difficulty model is still hand-tuned. It should be treated as an editorial helper, not as a learned truth.

## 9. Tooling and Workflow

The `toolkit` is the browser surface where manual authoring, validation, playtesting, and editorial planning meet.

Main views:

- `Level Editor + Play` for manual creation, repair, inspection, and explicit knowledge capture.
- `Play Sessions` for batch validation and feedback capture.
- `VitoBot` for persona-based Monte Carlo synthetic player simulation across one level or many levels, including estimated time, error, misread, restart, abandonment, and success-rate signals plus sampled solution families.
- `Level Manager` for progression planning, ordering, and export.
- `Spreadsheet` for review, planning, rename staging, and operational tracking.

The spreadsheet is a review and planning surface, not the canonical authoring source of truth. It can stage changes like `Level Renames`, but staged values do not become canonical filenames until the rename flow applies them.

`VitoBot` is a testing aid, not ground truth. It does not replace real playtest sessions. Its job is to rank likely problem boards faster, expose how ambiguous a level may be, and show whether a puzzle has one clear resolution or many similarly viable ones. The current shipped version is persona-based Monte Carlo, not full MCTS. That is enough to compare likely player behaviours, but not enough yet to claim a full decision-tree player model.

Editorial pipeline in practice:

1. prototype or repair in `Level Editor + Play`
2. validate the board and inspect real solution count
3. run `Play Sessions` for batch review and explicit keep/reject reasoning
4. use `VitoBot` to rank likely outliers faster, not to replace player evidence
5. place accepted boards into `Level Manager`
6. review or stage naming and mix decisions in the spreadsheet
7. materialize approved outputs only after editorial approval

That sequence matters because the project treats design intent as upstream from exports.

The operational details for those surfaces live in the specialist docs, not here.

## 10. Source of Truth

The project uses layered sources of truth so that design intent, runtime state, and exported artifacts do not get mixed together.

Canonical data lives in:

- `levels/`
- `progressions/`
- `playtest/`

Runtime or mirrored state includes:

- browser persistence
- manager snapshots
- local workbook mirrors
- generated review artifacts

Export surfaces include:

- `bundles/`
- screenshots
- ZIPs
- CSVs
- spreadsheet views

Knowledge surfaces include:

- this GDD
- specialist docs
- Kingfluence
- `memoria.md`

The system should not blur those layers. If the spreadsheet disagrees with the repo, the repo wins.

## 11. Open Questions

The main open design question is the emotional curve:

How should levels 1 through 10 feel in player terms - linear, stepped, or S-shaped?

Which levels teach, which reinforce, and which surprise?

Those questions matter more than the raw number ranges, because the player experiences a curve, not a table.

## 12. Related Docs

Read these next:

- `docs/LEVEL_JSON_SCHEMA.md`
- `docs/BUNDLES_AND_MIXES.md`
- `docs/WORKFLOWS.md`
- `docs/PLAYTEST_SYSTEM.md`
- `PROCEDURAL_ML_DESIGN.md`
- `FISH_COLORS_SYSTEM.md`
- `docs/TOOLKIT_ARCHITECTURE.md`
- `docs/SERVER_API_REFERENCE.md`

## Pending [VERIFY] Flags

- [VERIFY: the levels 1 to 10 emotional curve still needs explicit design approval, especially where the curve should step up instead of rise linearly.]

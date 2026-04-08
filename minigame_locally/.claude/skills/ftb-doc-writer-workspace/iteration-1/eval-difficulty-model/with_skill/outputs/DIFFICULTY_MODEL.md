# Feed the Bear Difficulty Model

## Overview

Difficulty in Feed the Bear is not controlled by a single parameter. Instead, it emerges from the interaction of five independent dimensions that work together to shape gameplay challenge.

The difficulty system is used by:

- Manual level designers to balance progression curves
- The procedural generator to select generation parameters for each level slot
- Reviewers to evaluate whether a candidate level fits its intended difficulty tier
- The learning system to understand which features correlate with approved vs. rejected designs

## The Five Difficulty Dimensions

### 1. Board Size (Grid Area)

Board dimensions range from `4x4` (16 cells) to `8x8` (64 cells).

**Effect on difficulty**: Larger boards are harder because they provide more space for paths to diverge, more options for pair placement, and less board coverage density per pair.

**Usage in progression**:

- Early levels (Tutorial and starter slots): `4x4` or `5x5`
- Mid progression: `5x5` or `6x6`
- Later levels: `6x6`, `7x7`, or `8x8`

**Interaction note**: Pair count must scale with board size. A `4x4` board with 2 pairs feels full and constrained. An `8x8` board with 2 pairs feels empty and trivial. See Dimension 2 for scaling rules.

### 2. Pair Count

The number of colored fish pairs on the board ranges from `2` to `5` (or more in exceptional cases).

**Effect on difficulty**: More pairs create more total paths to manage, more opportunities for interference between routes, and more decision points for the player to think through.

**Scaling with board size**:

| Board Size | Suggested Pair Range |
|---|---|
| 4x4 | 2 pairs |
| 5x5 | 2–3 pairs |
| 6x6 | 3 pairs |
| 7x7 | 3–4 pairs |
| 8x8 | 4–5 pairs |

**Design intent**: Pair count should keep the board feeling "full" without becoming chaotic. Larger boards require more pairs to maintain consistent visual density and challenge.

**Learning insight**: The procedural generator previously under-allocated pairs for large boards (creating empty-feeling `8x8` levels with only 3 pairs). The scaling table above corrects this tendency.

### 3. Start-End Distance

The Manhattan distance between the start node and end node of each pair.

**Effect on difficulty**: Greater distances force longer routes, increase the chance of path interference, and make it harder to solve the board efficiently.

**Typical ranges**:

- Easy levels: 3–5 Manhattan distance per pair
- Mid-tier levels: 5–8 Manhattan distance per pair
- Hard levels: 8–12+ Manhattan distance per pair

**Placement constraints**:

- Pairs are placed with minimum Manhattan distance of `3` to prevent trivial overlap
- Corner avoidance is applied during pair placement to keep pairs readable and avoid board-edge clustering
- Route calculation uses L-shaped paths (vertical then horizontal), so the actual playable distance may differ from Manhattan distance

### 4. Blocker Count and Clustering

Blockers are obstacles that interrupt paths and force players to find alternate routes.

**Effect on difficulty**: More blockers create more path constraints. However, the effect is not linear—clustered blockers are less impactful than the same number of isolated blockers.

**Blocker clustering rule**:

When blockers are adjacent by edge, they form a connected area. The difficulty contribution should follow:

```
difficulty(area of K blockers) > difficulty(1 blocker)
difficulty(area of K blockers) < K × difficulty(1 blocker)
```

**Blocker effectiveness formula** (under validation):

For a connected area of `K` blockers, the effective difficulty contribution is approximately:

```
area_difficulty = K^0.7
```

Alternative formula under consideration:

```
area_difficulty = 1 + log2(K)
```

**Typical progression**:

- Tutorial and early levels: 0–2 blockers
- Mid progression: 2–5 blockers
- Hard levels: 5–9 blockers

**Blocker intelligence requirement**:

A meaningful blocker must:

- Sit on or adjacent to the shortest path between at least one pair
- Force the player to think about an alternative route
- Not cluster in dead space where no pair route would pass

A meaningless blocker:

- Sits in empty space away from all pair routes
- Creates isolated walls that are trivial to walk around
- Forms random hole patterns with no path-blocking purpose

**Learning insight**: Procedural generation rejects frequently mention "blockers that make no sense" (original Spanish: "blockers no tienen sentido"). The generator's current algorithm places blockers semi-randomly and checks only that solutions exist. It does not verify that blockers actually constrain interesting routes. Future versions should place blockers preferentially near pair shortest paths.

### 5. Solution Count (Solution Density)

The total number of distinct valid solutions to a level, measured by depth-first search with memoization.

**Effect on difficulty**: Fewer solutions are harder because they reduce player ambiguity. A level with 1 solution (puzzle) is harder than a level with 20 solutions (freedom).

**Solution density categories**:

| Density | Range | Gameplay feel |
|---|---|---|
| HIGH | 6–20+ solutions | Open, forgiving, multiple paths work |
| MEDIUM | 2–6 solutions | Some path constraints, some flexibility |
| SINGLE | 1 solution | Tight puzzle, exact sequence required |

**Progression curve**:

- Early levels: HIGH density (6–20 solutions)
- Mid progression: MEDIUM density (2–6 solutions)
- Hard levels: SINGLE density (1 solution)

**Why solution count matters**:

Solution count is a truer measure of gameplay difficulty than visual board density because it reflects actual branching and ambiguity. A board can look sparse and still have only 1 solution (tight puzzle), or look dense and still have 20 solutions (overbuilt layout).

## Composite Difficulty Scoring

When the procedural generator evaluates a candidate level, it combines all five dimensions into a composite score:

```
D = w1 × grid_area_norm
  + w2 × pair_count_norm
  + w3 × avg_pair_distance_norm
  + w4 × effective_blocker_score_norm
  + w5 × (1 / solution_count_norm)
```

Where:

- All features are normalized to `[0, 1]`
- `effective_blocker_score` is the sum of area difficulty across all connected blocker groups
- The weights (`w1`–`w5`) are currently hand-tuned heuristic values and can eventually be learned from labeled examples

## Progression Model Integration

The difficulty model operates within the broader progression architecture:

- **Original Progressions** (A, B, C) follow intentional difficulty curves across their level slots
- **Live Ops Mixes** recombine levels from Original Progressions while maintaining coherent difficulty progression
- **Tutorial** (slot 0) is reserved content and handled separately from the main progression curve
- Each level slot carries editorial intent about its role in the curve (onboarding escalation, difficulty spike, etc.)

See `FEED_THE_BEAR_GDD.md` for the full progression model.

## Design Principles

All difficulty dimensions serve a few core principles:

1. **Readability comes first**: A level should communicate its structure quickly, even when later levels become denser.
2. **Blockers must have purpose**: Meaningful blockers shape routes or create spatial pressure. Random obstacles reduce clarity.
3. **Path interference is the real tension**: Interesting difficulty comes from routes competing for space, not from visual clutter.
4. **Solution count is the true measure**: A sparse board with 1 solution is harder than a dense board with 20 solutions.

## Learning and Iteration

The procedural system learns from human review:

- **Approved patterns** pull generation toward similar board widths, pair counts, blocker densities, and solution profiles
- **Rejected patterns** push generation away from bad feature shapes and repeated mistakes
- **Manual corrections** bias generation toward corrected versions
- **Feedback tags** (e.g., "too_much_space", "good_blocker_distribution") feed directly into future candidate selection

Current learning state (as of 2026-03-23):

- `approved_count = 10`
- `rejected_count = 23`
- Most rejections cluster around meaningless blockers (35%), levels feeling too easy (39%), and under-allocation of pairs for large boards (13%)

## See Also

- `FEED_THE_BEAR_GDD.md` — High-level game design and progression model
- `PROCEDURAL_ML_DESIGN.md` — Detailed procedural generation, learning pipeline, and ML readiness
- [Notion Level Design](https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728) — Design voice and decision rationale

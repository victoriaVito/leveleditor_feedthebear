# Flow Free Benchmark Analysis

Patterns extracted from 16 Flow Free levels (8x8 and 9x9 boards) for use as design learnings in Feed the Bear procedural generation.

Source: Screenshots from Flow Free mobile app, analyzed 2026-03-26.

## Key Metrics Summary

| Nivel | Grid | Pairs | Blockers | Coverage | Difficulty feel |
|-------|------|-------|----------|----------|-----------------|
| 3 | 8x8 | 6 | ~6 | 84% | MEDIUM — long wrapping routes |
| 4 | 8x8 | 6 | ~4 | 83% | MEDIUM — perimeter wrapping |
| 5 | 8x8 | 6 | ~8 | 78% | HARD — dense blockers force short paths |
| 6 | 8x8 | 7 | ~3 | 89% | HARD — 7 pairs competing, one wraps entire board |
| 7a | 8x8 | 8 | ~4 | 91% | HARD — 8 pairs, massive red route |
| 7b | 8x8 | 8 | ~12 | 0% | HARD — unsolved, 8 pairs + 12 blockers |
| 9a | 8x8 | 7 | ~8 | 68% | HARD — low coverage, blockers create chokepoints |
| 9b | 9x9 | 10 | 0 | 89% | EXTREME — 10 pairs, zero blockers, pure interference |
| 11 | 9x9 | 9 | ~4 | 97% | EXTREME — 98 steps, near-full coverage required |
| 13 | 8x8 | 7 | 0 | 96% | HARD — zero blockers, full coverage through pure routing |
| 15 | 9x9 | 8 | ~5 | 96% | HARD — clustered blockers in center |
| 16 | 8x8 | 6 | ~6 | 71% | MEDIUM — low coverage despite many steps |
| 32 | 8x8 | 7 | ~4 | 79% | HARD — blocker cluster forces routing around corner |
| 34 | 8x8 | 7 | ~4 | 89% | HARD — perimeter route wraps from top |

## Extracted Design Patterns

### Pattern 1: Perimeter Wrapping Routes

**What it is:** One pair's path traces the entire outer edge of the board, creating a frame that constrains all interior routing.

**Seen in:** Levels 4 (cyan), 6 (pink), 7a (red), 11 (blue), 13 (green), 34 (red).

**Why it works:** Forces interior pairs to solve within a reduced space. The perimeter route acts as a soft boundary — the player must figure out the interior routing knowing the edges are claimed.

**FtB learning tag:** `perimeter_wrap_route`

**How to apply:** When placing a pair on a large board (7x7+), consider putting both endpoints near the same corner with enough distance that the optimal path traces 2-3 edges. The pair should claim ~40% of the perimeter cells.

### Pattern 2: Zero-Blocker High-Pair-Count Boards

**What it is:** No blockers at all, but 7-10 pairs creating pure path interference difficulty.

**Seen in:** Levels 9b (10 pairs, 9x9), 13 (7 pairs, 8x8).

**Why it works:** Difficulty comes entirely from route competition. Every cell the player commits to one path removes it from all others. This is the purest form of "path interference = tension" from the FtB design principles.

**FtB learning tag:** `zero_blocker_pure_interference`

**How to apply:** On 8x8+ boards, try generating candidates with 0 blockers and 6-8 pairs. If the solution count is low (1-3), the board is interesting without any blockers. This directly addresses the "meaningless blockers" rejection problem — if blockers aren't needed, don't add them.

### Pattern 3: Blocker Clusters as Chokepoint Creators

**What it is:** 3-5 blockers placed in a tight cluster (adjacent or diagonal) creating a wall or L-shape that forces routes around them.

**Seen in:** Levels 5, 9a, 15, 32.

**Why it works:** Clustered blockers create real spatial pressure because they form a barrier that multiple paths must navigate. Isolated random blockers don't do this — they just eat a cell without changing routing decisions.

**FtB learning tag:** `blocker_cluster_chokepoint`

**How to apply:** Instead of randomly placing N blockers, try placing 2-3 clusters of 2-3 blockers each. A cluster should be near (within 2 cells of) at least 2 different pair endpoints to create route competition around the barrier.

### Pattern 4: Coverage as Difficulty Signal

**What it is:** High-coverage boards (90%+) are harder because paths must fill nearly every cell, leaving no room for inefficient routing.

**Seen in:** Levels 11 (97%), 13 (96%), 15 (96%), 7a (91%).

**Low-coverage boards (68-78%) feel easier even when mechanically complex.**

**Seen in:** Levels 9a (68%), 16 (71%), 5 (78%).

**FtB learning tag:** `high_coverage_difficulty`

**How to apply:** For HARD levels, aim for 85%+ path coverage in the golden path solution. For EASY levels, 60-75% coverage gives the player breathing room. Coverage should be a scoring factor in the procedural generator — not just pair count.

### Pattern 5: Pair Count Scaling with Board Size

**What it is:** The benchmark shows a clear relationship between board size and pair count for interesting puzzles.

| Grid | Pairs observed | Feel |
|------|---------------|------|
| 8x8 | 6-8 | MEDIUM to HARD |
| 9x9 | 8-10 | HARD to EXTREME |

**FtB learning tag:** `pair_scaling_benchmark`

**How to apply:** FtB's current procedural output for 8x8 boards uses 3-4 pairs with 9-11 blockers (progressions D/E/F). The benchmark suggests 8x8 boards can support 6-7 pairs comfortably. Increasing pair count while reducing blocker count could produce more interesting boards.

### Pattern 6: Long-Distance Pair Placement

**What it is:** Endpoints placed on opposite sides of the board (Manhattan distance 10+) creating routes that must cross the entire grid.

**Seen in:** Nearly every level — blue endpoints at top-left + bottom-right, red spanning full width, etc.

**FtB learning tag:** `long_distance_endpoints`

**How to apply:** The procedural generator already enforces Manhattan distance ≥ 3, but the benchmark suggests that on 8x8+ boards, at least 2 pairs should have distance ≥ 6. This creates the "backbone routes" that define the board's structure.

### Pattern 7: Nested Route Structure

**What it is:** Smaller pairs solving entirely inside the space created by a larger wrapping pair.

**Seen in:** Levels 4 (small pairs inside cyan frame), 6 (small pairs inside pink frame), 34 (interior pairs inside red frame).

**FtB learning tag:** `nested_route_structure`

**How to apply:** Generate one "frame pair" with long distance, then place 2-3 shorter pairs inside the frame. The interior pairs compete with each other but are all bounded by the frame route. This creates layered difficulty — first figure out the frame, then solve the interior.

## Aggregate Insights for FtB Procedural Generator

1. **FtB under-uses pair count on large boards.** Current D/E/F progressions use 3-4 pairs on 7x7-8x8. The benchmark shows 6-8 pairs on 8x8 creates better puzzles. This is the single biggest design gap.

2. **35% of FtB procedural rejections cite "meaningless blockers."** The benchmark confirms this: the most interesting levels use 0-4 purposeful blockers, not 9-11 random ones. Pattern 2 (zero-blocker) and Pattern 3 (clusters) are the fix.

3. **Coverage should be a first-class scoring metric.** High-coverage boards feel harder and more satisfying. FtB should target 80%+ coverage for MEDIUM and 90%+ for HARD.

4. **Perimeter-wrapping routes are a design tool, not a bug.** If the generator produces a solution where one pair wraps the board edge, that's a feature — it creates the "frame" that makes interior routing interesting.

5. **The benchmark confirms the GDD's core insight:** path interference is the real difficulty lever, not board density or blocker count.

## Learning Tags for Procedural Import

These tags can be added to the approved pattern library via Send Knowledge in the Level Editor:

```
perimeter_wrap_route
zero_blocker_pure_interference
blocker_cluster_chokepoint
high_coverage_difficulty
pair_scaling_benchmark
long_distance_endpoints
nested_route_structure
```

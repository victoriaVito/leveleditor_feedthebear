# Feed the Bear (Soda) - Procedural Level Generator Spec

This document defines the deterministic procedural generation rules for the 10-level mini-game **Feed the Bear** in **Soda**.

## 1. Scope and Non-Negotiables

- Exactly 10 levels.
- Output is consumed directly by the game engine.
- Determinism and correctness are required.

## 2. Immutable World Rules

| Rule | Value |
|---|---|
| Board shape | `N x N` grid |
| Cell states | `EMPTY`, `BLOCKED`, `OCCUPIED` |
| Movement | `UP`, `DOWN`, `LEFT`, `RIGHT` only |
| Diagonal moves | Not allowed |
| Line crossing | Not allowed |
| Cell sharing | Not allowed (one line per cell) |
| Completion condition | All pairs connected simultaneously |
| In-play randomness | None |
| Player reset | Always allowed |

Definitions:
- Pair: two nodes, start and end (for example `A_start`, `A_end`).
- Line: contiguous path of orthogonally adjacent cells connecting one pair.

## 3. Primary Difficulty Lever: Solution Density

**Solution Density** is the number of valid complete board configurations where all pairs are connected simultaneously without collisions.

This is the primary difficulty control.

### Density Categories

| Label | Valid Configurations |
|---|---|
| `HIGH` | 6+ |
| `MEDIUM-HIGH` | 3-5 |
| `MEDIUM` | 2-4 |
| `MEDIUM-LOW` | 2-3 |
| `LOW` | exactly 2 |
| `VERY-LOW` | exactly 2 with tighter constraints |
| `SINGLE` | exactly 1 |
| `LOW-MEDIUM` | 2-3 |

## 4. Required 10-Level Curve

| Level | Density Target | Board | Pairs | Blockers |
|---|---|---|---|---|
| 1 | `HIGH` | 4x4 | 2 | 0 |
| 2 | `HIGH` | 4x4 | 2 | 0-1 |
| 3 | `MEDIUM-HIGH` | 4x4 | 2-3 | 1 |
| 4 | `MEDIUM` | 4x4 | 3 | 1-2 |
| 5 | `MEDIUM` | 5x5 | 3 | 1-2 |
| 6 | `MEDIUM-LOW` | 5x5 | 3-4 | 2-3 |
| 7 | `LOW` | 5x5 | 3-4 | 3-4 |
| 8 | `VERY-LOW` | 5x5 | 4 | 3-5 |
| 9 | `SINGLE` | 5x5 | 4 | 4-5 |
| 10 | `LOW-MEDIUM` | 5x5 or 6x6 | 3-4 | 2-3 |

Level 10 must not feel harder than Level 9. It should be a controlled step back in difficulty and end on elegance.

## 5. Generation Algorithm (Strict Order)

### Step 1: Input

```ts
level_number: number // 1..10
```

### Step 2: Load Targets

Load from the curve table:
- `board_size`
- `pair_count`
- `blocker_range`
- `target_density`

### Step 3: Initialize Board

Create `N x N` grid with all cells set to `EMPTY`.

### Step 4: Place Pairs (Before Routes)

Placement rules:
- No node in corner cells.
- Minimum Manhattan distance between any two nodes: `3`.
- No duplicate node coordinates.
- Distribute pair nodes across board quadrants.

### Step 5: Build Golden Path

Generate one valid path per pair first (design the solution first).

Rules:
- Paths cannot overlap or cross.
- Combined golden paths must cover at least `60%` of available non-blocked cells.
- Use randomized DFS with backtracking.

### Step 6: Count Initial Solutions

Run the solution counter and store `current_solution_count`.

### Step 7: Add Blockers Iteratively

For each blocker candidate until reaching `blocker_range` max:

```text
a) Pick candidate EMPTY cell (not a node, not on golden path)
b) Temporarily set cell to BLOCKED
c) Re-run solution counter
   - new_count >= 1 and new_count < current_count -> keep blocker
   - new_count == 0 -> reject (unsolvable)
   - new_count == current_count -> reject (no effect)
d) Stop early if current_count is inside target density range
```

### Step 8: Validate

Run all validation checks. If any check fails, discard board and retry from Step 3.

- Max retries: `50`
- If exhausted, log failed check names and reasons.

### Step 9: Output

Return JSON in the exact output schema defined in section 9.

## 6. Solution Counter (Enumeration Required)

Do not estimate. Enumerate solutions with constraint propagation + backtracking.

```ts
function countSolutions(board: Board, pairs: Pair[]): number {
  if (allPairsConnected(pairs)) return 1;

  const pair = pairWithMinRemainingValues(board, pairs); // MRV

  let total = 0;
  for (const nextCell of validNextCells(board, pair)) {
    markOccupied(board, nextCell, pair.id);
    total += countSolutions(board, pairs);
    unmark(board, nextCell);

    if (total >= 20) return 20; // hard cap
  }

  return total;
}
```

Required optimizations:
- Memoize board states (Zobrist hashing recommended).
- Prune branches where any pair has zero valid moves.
- Prune disconnected empty regions that isolate unresolved pair nodes.
- Return `20` when count exceeds `20`.

## 7. Validation Checklist (All Required)

### Check 1: Solvability

`solution_count >= 1`

### Check 2: Density Match

`solution_count` is within the configured density range for the level.

### Check 3: Early Mistake Detection

At around 30% path progress, at least one plausible wrong branch must fail before final move.

- Pass: detectable failure before last move.
- Fail: only detectable on final move.

### Check 4: No Isolated Pair Nodes

Each pair node must have at least 2 valid adjacent cells (excluding its own partner node).

### Check 5: No Late-Only Dead Ends

No valid partial state should satisfy both:
- board fill > 80%, and
- remaining pair has zero moves.

### Check 6: Curve Integrity

- Levels 1-2: `solution_count >= 3`
- Level 9: `solution_count === 1`
- Level 10:
  - `2 <= solution_count <= 4`
  - `solution_count > solution_count(level_9)`
  - Interpretation: Level 10 is intentionally easier than Level 9.

## 8. Forbidden Outputs

Never generate:
- Wrong-move detection only at final cell.
- More than one single-cell bottleneck in Levels 1-5.
- All pairs forced through one central corridor with no alternatives.
- Blockers accepted without re-counting solutions after each blocker.
- `solution_count === 0`.
- Board size larger than `6x6`.
- Symmetric blocker illusions where only one mirrored side is viable.

## 9. Output Schema

```json
{
  "level": 3,
  "board_size": 4,
  "grid": [
    ["EMPTY",   "NODE_A1", "EMPTY",   "EMPTY"  ],
    ["BLOCKED", "EMPTY",   "EMPTY",   "NODE_B1"],
    ["EMPTY",   "EMPTY",   "NODE_A2", "EMPTY"  ],
    ["NODE_B2", "EMPTY",   "EMPTY",   "EMPTY"  ]
  ],
  "pairs": [
    { "id": "A", "start": [0,1], "end": [2,2], "color": "#0EA5E9" },
    { "id": "B", "start": [1,3], "end": [3,0], "color": "#0284C7" }
  ],
  "blockers": [[1,0]],
  "solution_count": 4,
  "target_density": "MEDIUM-HIGH",
  "golden_path": {
    "A": [[0,1],[0,2],[1,2],[2,2]],
    "B": [[1,3],[2,3],[3,3],[3,2],[3,1],[3,0]]
  },
  "validation": {
    "solvable": true,
    "density_match": true,
    "early_mistake_detection": true,
    "no_isolated_pairs": true,
    "no_late_dead_ends": true,
    "curve_integrity": true
  },
  "meta": {
    "generation_attempts": 3,
    "failed_checks": []
  }
}
```

## 10. TypeScript API Requirements

```ts
generateLevel(levelNumber: number): LevelOutput
generateProgression(): LevelOutput[]
```

`generateProgression()` must validate progression-level constraints:
- Levels 1-9 should be monotonic non-increasing in solution count.
- Only allowed exception: Level 10 may increase vs Level 9.
- No generated level can be unsolvable.

## 11. Minimum Tests

```ts
test("Level 1 has high solution density", () => {
  expect(generateLevel(1).solution_count).toBeGreaterThanOrEqual(3);
});

test("Level 9 has exactly one solution", () => {
  expect(generateLevel(9).solution_count).toBe(1);
});

test("Level 10 is not harder than Level 9", () => {
  const l9 = generateLevel(9);
  const l10 = generateLevel(10);
  expect(l10.solution_count).toBeGreaterThanOrEqual(2);
  expect(l10.solution_count).toBeLessThanOrEqual(4);
  expect(l10.solution_count).toBeGreaterThan(l9.solution_count);
});

test("Full progression is monotonically harder through Level 9", () => {
  const levels = generateProgression();
  for (let i = 1; i < 9; i++) {
    expect(levels[i].solution_count).toBeLessThanOrEqual(levels[i - 1].solution_count);
  }
});

test("No level is unsolvable", () => {
  generateProgression().forEach((l) => expect(l.validation.solvable).toBe(true));
});
```

## 12. Engineering Notes

- Implement and benchmark the solution counter first.
- Blocker placement is guided search, not blind random placement.
- Level 10 curve break is intentional design.
- Zobrist hashing is required for practical 5x5+ enumeration performance.
- The 60% path-coverage constraint is a design-pressure requirement.

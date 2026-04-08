# Feed the Bear Difficulty Model

## Overview

Feed the Bear difficulty is shaped through **five interacting dimensions** rather than a single difficulty label. Each dimension contributes to both puzzle complexity and player experience.

The project uses the same balancing logic across manual and procedural work:
- A board should fit a curve role
- Difficulty should escalate intentionally
- Readability should remain intact even when later levels become denser

---

## The Five Difficulty Dimensions

### 1. Board Size

**Definition:** The physical dimensions of the playing grid, measured as columns and rows.

**Range:**
- Columns: `4..9`
- Rows: `4..9`
- Example small board: 4×4 (16 cells)
- Example medium board: 5×5 (25 cells)
- Example large board: 7×7 (49 cells)

**Difficulty Impact:**
- **Smaller boards** are more constrained and reduce absolute routing options. Early-game tutorials and introductory levels use 4×4 or 5×5 grids.
- **Larger boards** provide more space for path interference and strategic positioning. Late-game and procedural packs often feature 7×7 boards.
- Board size interacts heavily with blocker placement and pair count—a 7×7 board with few blockers feels different from a 7×7 board with strategic blockers.

**Design Consideration:**
Board size communicates visual scope at a glance. A smaller grid feels manageable; a larger grid signals complexity without requiring as many pieces to achieve high difficulty.

---

### 2. Pair Count

**Definition:** The number of connected pairs (routes) the player must solve.

**Range:**
- Minimum: 2 pairs
- Maximum: 9 pairs
- Typical progression: 2-3 pairs (early), 4-6 pairs (mid-game), 6-9 pairs (late-game)

**Difficulty Impact:**
- **Fewer pairs (2-3)** allow players to focus on understanding path mechanics and board layout.
- **More pairs (6-9)** force players to juggle multiple competing routes and mental models simultaneously.
- Solution count matters because it reflects actual gameplay ambiguity. Two boards with the same pair count but different solution counts feel very different in practice.

**Design Consideration:**
Adding a single pair can dramatically increase the puzzle's cognitive load, especially if that pair intersects with existing routes. Each additional pair should serve a purpose in escalating difficulty or creating intentional interference.

---

### 3. Blocker Count

**Definition:** The number of blocked cells that restrict routing options.

**Range:**
- Minimum: 0 blockers
- Maximum: Varies by board size and design intent (typically 0-12 blockers)
- Early levels: 1-2 blockers (if any)
- Mid-game: 3-6 blockers
- Late-game: 6-12 blockers

**Difficulty Impact:**
- **Fewer or no blockers** simplify routing and rely on pair placement alone to create interference.
- **Strategic blockers** create meaningful spatial pressure by:
  - Forcing detours
  - Separating competing routes
  - Defining board zones that must be solved in specific orders
  - Creating visual landmarks that aid readability

**Critical Design Principle:**
Blockers must have a purpose. A blocker that does not affect path decisions is not adding value. Meaningless clutter harms readability without adding genuine difficulty.

**Design Consideration:**
Blocker silhouette contributes to visual legibility. The pattern and spacing of blockers should communicate the board's structure quickly.

---

### 4. Path Length and Route Overlap

**Definition:** The distance paths must travel (measured by cell count or moves) and the degree to which multiple routes compete for the same cells.

**Range:**
- **Path length:** Varies from 3-4 cells (simple) to 15+ cells (very complex)
- **Route overlap:** Ranges from minimal (isolated paths) to heavy (many shared cells)
- **Move budget:** Typically `5..19` moves depending on tier and board size

**Difficulty Impact:**
- **Short, isolated paths** are easier to trace and solve independently.
- **Long, overlapping paths** create interesting difficulty because:
  - Players must evaluate tradeoffs in traversal order
  - An error in one path directly blocks progress on others
  - Visual scanning requires more effort
  - The cognitive load of juggling multiple constraints increases

**Design Consideration:**
Path interference is the real source of tension. Difficulty comes from routes wanting the same space, not from artificial crowding. A visually dense board can still be trivial if paths don't actually intersect. A sparse board can be very challenging if the few paths that exist create strong interference.

---

### 5. Endpoint Placement

**Definition:** The strategic positioning of pair endpoints (start and end cells for each route).

**Range:**
- **Tight clusters:** Endpoints grouped in one area, forcing early decisions
- **Distributed placement:** Endpoints spread across the board, requiring more navigation
- **Strategic corners/edges:** Endpoints on board perimeter vs. interior positions

**Difficulty Impact:**
- **Clustered endpoints** in a small region force early commitment and may limit routing options.
- **Distributed endpoints** spread across the board require more planning and longer individual routes.
- **Perimeter vs. interior:** Edge endpoints naturally create shorter paths; interior endpoints allow for longer, more complex routing.
- **Intentional placement** communicates the puzzle's structure to players, making the board "readable" even when complex.

**Design Consideration:**
Pair endpoints should feel intentional, not arbitrary. The placement of endpoints is a primary visual signal—players instantly understand that an endpoint exists and what it represents. Strategic endpoint distribution can guide exploration and scaffold understanding of the solution space.

---

## Integration and Interaction

These five dimensions do not work in isolation. They interact to create the overall difficulty:

### Synergistic Examples

**Easy Level (Tier 1-2):**
- Small board (4×4 or 5×5)
- 2-3 pairs
- 0-2 blockers
- Short paths with minimal overlap
- Clustered endpoints

**Medium Level (Tier 4-5):**
- Medium board (5×5 or 6×6)
- 4-5 pairs
- 3-5 blockers
- Moderate path lengths with some interference
- Distributed endpoints

**Hard Level (Tier 8-10):**
- Large board (7×7)
- 7-9 pairs
- 6-10 blockers
- Long paths with heavy overlap and multiple decision points
- Strategic endpoint placement that requires careful planning

### Difficulty Tier System

Levels are assigned a **numerical difficulty tier from 1-10** that summarizes the combined effect of all five dimensions. This tier is stored in the `difficultyTier` field of each level's JSON file.

The tier is used by:
- The toolkit for manager sorting and visualization
- Progression builders for ensuring intentional curve escalation
- Quality review surfaces for understanding level pacing
- Procedural generation systems for targeting specific difficulty ranges

---

## Quality Principles

When balancing difficulty across these five dimensions, the project maintains these core principles:

### 1. Readability Comes First

A level should communicate its structure quickly. Even when difficulty increases, the board layout should guide player attention to the important tensions and competing paths.

### 2. Blockers Must Have Purpose

Every blocker should either:
- Shape viable routes
- Create competition for space between pairs
- Define meaningful spatial pressure

Decorative blockers harm readability without adding genuine difficulty.

### 3. Path Interference Is Real Difficulty

Interesting difficulty comes from routes wanting the same space and players having to decide traversal order. Crowding without interference is not meaningful difficulty.

### 4. Visual Design Supports Puzzle Design

The fish palette, blocker silhouette, layout, and pair distribution all contribute to how a level is perceived. Visuals and puzzle mechanics are not separate layers.

---

## Measurement and Validation

The project measures difficulty balance through:

### Solution Count
- **Definition:** The number of valid solutions to a puzzle
- **Purpose:** Reflects actual gameplay ambiguity and multiplicity of valid approaches
- **Target Density Labels:**
  - `SINGLE` (1 solution)
  - `LOW` (2-3 solutions)
  - `LOW-MEDIUM` (4-5 solutions)
  - `MEDIUM` (6-8 solutions)
  - `MEDIUM-HIGH` (9-12 solutions)
  - `HIGH` (13+ solutions)

### Move Budget
- **Definition:** The recommended or allowed number of moves to solve
- **Stored as:** `moves` field in level JSON
- **Typical range:** 5-19 moves depending on tier and complexity

### Golden Path
- **Definition:** One verified solution route for each pair
- **Purpose:** Ensures solvability and provides a reference point for difficulty validation
- **Format:** Per-pair arrays of `[row, col]` cells in the level JSON

---

## Practical Application

### For Level Designers

When creating or reviewing a level:
1. **Start with board size** to establish visual scope
2. **Add pairs** considering how many routes the space can support
3. **Place blockers strategically** to create interference without clutter
4. **Design endpoint placement** to communicate structure and guide exploration
5. **Verify path overlap** and interaction to ensure difficulty matches intent
6. **Assign a difficulty tier** that reflects the combined effect

### For Procedural Generation

The procedural system uses these five dimensions as:
- **Generation targets:** "Create a level with a 6×6 board, 5 pairs, and heavy overlap"
- **Validation checks:** Verify solution count, path interference, and blocker purpose
- **Learning signals:** Human feedback on approved/rejected patterns informs future generation across all five dimensions

### For Progression Building

When arranging levels in a progression:
- Use small increases in individual dimensions for steady difficulty escalation
- Balance which dimension increases to maintain visual and puzzle diversity
- Ensure readability at every tier by not increasing all dimensions simultaneously
- Mix progression curves to prevent fatigue (e.g., increase board size, then add pairs, then increase overlap)

---

## Related Documentation

- **FEED_THE_BEAR_GDD.md** — Overall project design and philosophy
- **LEVEL_JSON_SCHEMA.md** — Canonical level file format and validation fields
- **PROCEDURAL_ML_DESIGN.md** — How the procedural system uses these dimensions for generation
- **PLAYTEST_SYSTEM.md** — Measurement and validation during play sessions

---

## Summary

Feed the Bear difficulty is multidimensional by design. Rather than rely on a single "hard" or "easy" label, the project balances **board size, pair count, blocker count, path length and route overlap, and endpoint placement** to create puzzles that are challenging yet readable, complex yet intentional.

These five dimensions interact synergistically. A small change in one dimension (e.g., adding a strategic blocker) can shift the entire puzzle experience. Understanding and balancing all five is key to creating progressive, engaging level design.

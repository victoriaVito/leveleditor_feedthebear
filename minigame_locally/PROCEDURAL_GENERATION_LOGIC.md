# Procedural Generation Logic

This document explains how the Feed the Bear toolkit currently generates levels procedurally.

It is intentionally written as a deconstruction of the existing system, not as an idealized design target.

## Design Intention

The current generator is not a full puzzle designer.

Its role is to produce solvable candidate boards that can later be reviewed, curated, rejected, or improved by a human designer.

The design intention of the system is:

- create a playable board for a given progression slot
- keep at least one valid solution
- shape the number of possible solutions downward until the board lands near a target density
- expose enough structure for later editorial review

This means the generator is better understood as a **candidate shaper** than as a fully intentional handcrafted level designer.

## What Actually Drives Difficulty

At a system level, the generator uses slot configuration, solution count, and blockers to shape a level.

In practice, the most important design signals are:

- layout readability
- blocker placement
- path interference

This matters because raw board size alone does not define the real player experience.

A small board can feel hard if:

- blockers create misleading open space
- pairs compete for the same routing corridor
- the intended routes are visually ambiguous

A larger board can feel easier if:

- endpoints are clearly separated
- blockers create obvious lanes
- path competition is low

## Procedural Pipeline

The generation flow is built around `generateLevelRaw(levelNumber, seedOffset)`.

### 1. Pick the slot configuration

Each progression slot has a curve configuration that defines:

- board size
- pair count range
- blocker count range
- target density label

The generator starts from the progression slot number, not from a generic "difficulty" preset.

So the first design assumption is:

- slot identity matters
- the same generator behaves differently depending on where the level sits in the progression

### 2. Seed the random generator

The generator uses a deterministic seed derived from:

- level number
- candidate offset

This allows the system to:

- generate several candidate variants for the same slot
- keep those variants reproducible

### 3. Choose board size and pair count

The generator reads the slot config and chooses:

- board width and height
- number of pairs
- blocker target

Important limitation:

- the editor supports rectangular boards
- the current procedural generator still works as a square-board generator

So the procedural system is behind the editor in this specific area.

### 4. Choose endpoints

The generator chooses pair endpoints with `chooseNodes(...)`.

The purpose of this step is:

- spread endpoints across the board
- avoid immediately trivial adjacency
- prefer a minimum Manhattan distance before relaxing constraints

This is an early readability control:

- if endpoints are too clustered, the level becomes visually noisy too early
- if endpoints are too isolated, the level may become too easy

### 5. Build a simple "golden path"

For each pair, the generator creates a very simple reference route with `simplePath(...)`.

This path is:

- Manhattan based
- greedy
- vertical first, then horizontal

This is a very important point:

- the generator does **not** start from a rich puzzle topology
- it starts from a simple orthogonal path scaffold

So the system’s procedural intelligence does not come from sophisticated route invention.
It comes from what happens after the scaffold exists.

### 6. Reserve occupied path space

Once the golden paths are built, the generator records:

- path cells
- node cells

These occupied cells define where blockers are **not** allowed to go.

That preserves at least one intended route family before any difficulty shaping begins.

### 7. Build blocker candidates

The generator computes all possible blocker positions that:

- are not pair nodes
- are not part of the golden paths

These cells are shuffled and tested one by one.

This is where the generator begins to shape the level.

### 8. Add blockers only if they improve the puzzle

For each blocker candidate, the generator:

- tries the blocker
- runs the solver again
- compares the new solution count against the previous one

A blocker is only accepted if:

- the board stays solvable
- and the blocker reduces the number of solutions

So blocker placement is not random decoration.

It is the main shaping mechanism used to:

- reduce ambiguity
- increase route competition
- create path interference
- push the puzzle toward the target density band

This is why blocker placement matters more than board size alone.

### 9. Stop when the level reaches the density target

The generator keeps adding accepted blockers until either:

- the target density band is reached
- or it runs out of useful blocker candidates

The density target is not directly "easy / medium / hard" in a human sense.

It is a solution-count band used as a shaping proxy.

This is useful mechanically, but it is only a partial model of true difficulty.

### 10. Set the move budget

The generator derives `moves` from the total step length of the golden paths.

This means the move budget is currently tied to:

- the simple intended path scaffold

It is not derived from:

- observed player struggle
- visual deception
- alternate solution pressure

So move count is still a structural estimate, not an experiential one.

## Candidate Selection

The public generator call is `generateLevel(levelNumber)`.

It does not accept the first board it creates.

Instead it:

- generates multiple raw candidates for the same slot
- scores them using the current learning model
- keeps the best-scoring candidate

This is the current "learning layer".

However, the learning is still coarse:

- it mostly compares aggregate board features
- it does not yet fully understand design intention
- it does not reason deeply about readability or handcrafted visual rhythm

## Progression Generation

`generateProgression()` creates levels slot by slot.

It does:

- generate slot 1 through slot 10 independently
- perform a weak monotonicity check afterward

It does **not** yet do a true closed-loop balancing pass that:

- reorders levels
- regenerates bad jumps
- or tunes a full progression rhythm intentionally

So progression quality still depends heavily on human curation.

## Validation Logic

Validation is now based primarily on solvability.

The toolkit checks:

- board validity
- node and blocker consistency
- at least one valid solution

If `decal` is enabled, validation also checks:

- at least one valid solution must cover every free cell

This is important because the system no longer rejects levels just because they miss a density label.

The current validation philosophy is:

- impossible levels are invalid
- solvable levels are valid
- density is informative, not the final truth

## Real Design Reading

From a design perspective, the current system creates puzzles through:

1. endpoint spacing
2. simple intended routes
3. blocker-based reduction of solution space

So the strongest procedural design lever today is not "generate a clever puzzle from scratch".

It is:

- generate a readable scaffold
- then disturb that scaffold carefully through blockers

That is why the most important human review criteria remain:

- visual design
- layout readability
- blocker placement
- path interference

These are the places where design intention becomes visible to the player.

## Current Limitations

The generator still has important limitations:

- it still thinks mostly in square boards
- golden paths are too simple
- move counts are structural, not behavioral
- learning is feature-based, not intention-based
- progression balancing is only lightly enforced

So the current generator should be treated as:

- a production helper
- a candidate generator
- a review accelerator

not as a replacement for level design craft.

## Practical Conclusion

The procedural generator works best when used with a clear editorial loop:

1. generate candidates
2. validate solvability
3. inspect readability
4. inspect blocker placement
5. inspect path interference
6. curate into a progression
7. revise or replace where design intention is weak

In short:

- the generator creates structure
- the designer creates meaning

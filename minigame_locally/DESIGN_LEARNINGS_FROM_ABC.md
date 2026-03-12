# Design Learnings From A, B, and C

This note captures the strongest design lessons inferred from the curated `A`, `B`, and `C` progression sets.

It focuses on design intention, visual design, and the structural signals that seem to matter most in this project.

## Core Takeaway

The main lesson is that these levels are not primarily defined by raw board size.

Difficulty and quality are shaped more by:

- layout readability
- blocker placement
- path interference
- spatial rhythm
- visual density
- the intended feeling of the solve

In practice, that means a smaller board can feel harder than a larger one if the layout is visually less readable or if the blockers create stronger route ambiguity.

## Design Intention

The strongest signal across the three progressions is intentional authorship.

These levels do not read like generic puzzle outputs. They read like hand-curated beats in a progression.

That implies:

- each slot is carrying a design purpose
- the file identity of the level matters
- progression order is part of the design, not just a storage detail
- replacing a level with a structurally similar one can still break the intended curve

The progression is therefore not only a technical list of valid boards. It is an authored sequence with pacing, teaching, escalation, and contrast.

## Visual Design

Visual design is not secondary here. It is part of the puzzle design.

The player reads the level before solving it. Because of that, visual composition directly affects perceived and actual difficulty.

The most important visual design factors are:

- how quickly the player can read the board
- how obvious or misleading the open space is
- whether blockers create clean structure or visual noise
- whether endpoints feel isolated, paired, crowded, or deceptive

A level can become harder simply because the board looks harder to parse, even if the formal solution space is not drastically different.

## Layout Readability

Layout readability appears to be one of the most important design levers.

Readable layouts tend to:

- make pair relationships legible early
- reveal likely routing zones
- communicate where tension lives on the board

Less readable layouts tend to:

- hide route competition
- create false openness
- delay recognition of the critical choke point

This suggests that progression building should not only track board dimensions and moves. It should also track how quickly a human can visually understand the solve space.

## Blocker Placement

Blocker placement appears to be more important than blocker count.

What matters is not only how many blockers exist, but where they sit relative to:

- endpoints
- the center of the board
- likely path corridors
- route crossings or bottlenecks

Well-placed blockers create intention.

They can:

- frame the puzzle
- guide the player into the intended conflict
- mislead the player in a controlled way
- create escalation without increasing board size

Poor blocker placement just produces clutter. Good blocker placement produces authored tension.

## Path Interference

Path interference is one of the clearest difficulty drivers in these progressions.

The levels feel harder when pairs compete for shared space, timing, or corridor access.

Important interference patterns include:

- central conflict over one route band
- endpoint clusters that create ambiguity
- blockers that split the board but still leave overlapping route pressure
- apparent freedom that collapses once one path is committed

This means a good generator should not only count paths. It should model how much the paths interfere with each other spatially.

## Progression Rhythm

The three progressions also show a rhythm lesson:

- difficulty should rise
- but readability and tension should vary
- the sequence should include contrast, not only monotonic increase

That creates a better player experience because the curve feels authored instead of mechanically scaled.

The progression is therefore a rhythm of:

- teaching
- confidence
- disruption
- recovery
- escalation

## Implications For Procedural Generation

If procedural generation is meant to support this project, it should learn from design intention, not only from metadata.

A useful generator should learn or score for:

- visual readability
- blocker topology
- route competition
- endpoint spacing
- perceived board density
- progression rhythm by slot

It should not assume that bigger board = harder level.

Instead, it should treat raw board size as one variable among many, and often a weaker one than layout readability, blocker placement, and path interference.

## Practical Rule

For this toolkit and level catalog, the safest editorial rule is:

Design quality should be judged first by intention and readability, then by formal metadata.

That means:

- preserve curated slot identity
- preserve progression order
- preserve level names when they carry editorial meaning
- avoid replacing hand-picked levels with generic equivalents just because the numbers match

# Level Toolkit Product Notes

## Purpose

This toolkit is not only a level editor. It is a working environment for:

- creating levels manually
- reviewing and playtesting levels
- building episode progressions
- curating valid vs discarded content
- learning from accepted, rejected, and corrected levels
- generating new procedural candidates from that learning

The product goal is to reduce friction between design intent and playable content.

## Core Mechanics

The current game model assumes:

- square boards from `4x4` to `6x6`
- `2` to `4` pairs
- orthogonal path connections
- blocked cells
- no crossing or overlapping paths
- a move count stored in JSON
- a solution-count based validation model

The toolkit supports three main level states:

- editable design state
- playable review state
- validated/exportable JSON state

## UX Principles

### 1. One main job per view

Each area should have a dominant purpose:

- `Procedural`: generate candidates and bundles
- `Level Editor + Play`: edit one level and test it directly
- `Play Sessions`: play and review queued levels
- `Level Manager`: build and curate progressions

This keeps the interface understandable even when the underlying toolchain is complex.

### 2. Manual control over automation

Automation is useful, but level design is still editorial work.

Because of that:

- auto-fill must be explicit, never implicit
- procedural generation must be triggered by the user
- corrections must be saved deliberately
- progression changes must remain visible and reversible

The designer should feel assisted, not overridden.

### 3. State persistence is mandatory

This workflow becomes frustrating if context is lost.

The toolkit should always preserve:

- the current editor level
- manager progressions
- slot order
- slot locks
- per-slot difficulty labels
- session queue
- review state
- notes
- learning memory

Without persistence, every reload destroys trust in the tool.

### 4. Visual curation over raw tables

Level design is highly visual. Tables are useful for audit, but not ideal for curation.

The primary review surfaces should therefore be:

- cards
- thumbnails
- ordered progression slots
- status chips
- lightweight notes

Tables should remain secondary, mainly for CSV-style review and export.

## UI Principles

### Clarity

Buttons should be named after the real action:

- `Load Progression`
- `Save Changes`
- `Generate From References`
- `Auto-fill Empty Slots`

Avoid vague labels like `Run`, `Apply`, or `Main`.

### Progressive disclosure

High-frequency actions should be visible first.

Examples:

- edit
- play
- validate
- approve
- reject
- note-taking

Lower-frequency actions can live behind secondary buttons or a more advanced workflow.

### Strong status language

The tool should always make state explicit:

- `Saved`
- `Unsaved changes`
- `Locked`
- `Changed`
- `Approved`
- `Rejected`
- `Fixed`
- `Reference`

This lowers ambiguity and reduces review mistakes.

### Direct manipulation

The best progression-building interaction is spatial:

- drag a level into a slot
- swap by dropping onto another slot
- move a level back into the pool
- lock a slot
- assign difficulty per slot

This is better than editing order values in a form.

## Difficulty Design Thinking

Difficulty should not be treated as a single number.

In this project, difficulty is better understood as a blend of:

- board size
- number of pairs
- blocker count
- path interference
- number of valid solutions
- move pressure
- readability of the board
- likelihood of early mistakes

### Practical difficulty labels

For production use, the labels `Easy`, `Medium`, and `Hard` are more useful than raw density names.

They are better because:

- designers reason in player-facing difficulty, not in solver jargon
- progressions are easier to discuss
- episode planning becomes faster
- the labels can still map internally to density targets

### Slot-based difficulty

Difficulty should belong to progression slots as well as to levels.

Why:

- a slot represents intended player experience
- multiple levels may fit the same slot
- replacement should preserve curve intent

This is why per-slot difficulty is useful in the manager.

### Good progression behavior

A good progression usually:

- starts with high readability
- introduces one source of complexity at a time
- avoids sudden spikes unless intentionally dramatic
- keeps late-game challenge earned, not random
- uses tutorial or handcrafted onboarding before abstract difficulty ramps

## Procedural Generation Thinking

Procedural generation here should not aim for infinite novelty. It should aim for curated usefulness.

That means:

- generate candidates, not final truth
- learn from approved levels
- learn from rejected levels
- learn even more from corrected levels

Corrections are especially valuable because they show the gap between:

- what the generator produced
- what the designer actually wanted

### Best learning signals

The strongest learning signals are:

- approved levels
- rejected levels
- fixed versions of rejected levels
- per-slot difficulty labels
- notes left by the designer
- reference-marked levels

### Good procedural workflow

The healthiest pipeline is:

1. generate candidates
2. review them visually
3. approve, reject, or fix
4. store those outcomes
5. generate again using those outcomes

This creates a feedback loop instead of a one-shot generator.

### Reference-based generation

Reference-based generation is especially useful when a designer says:

- “more like this”
- “same slot, cleaner execution”
- “same feeling, different layout”

This should be treated as guided generation, not blind randomness.

## Recommended Product Workflow

### Manual design flow

1. Create or import a level in `Level Editor + Play`
2. Save changes
3. Send it to `Play Sessions` or `Level Manager`
4. Validate and review
5. Add notes if needed

### Progression-building flow

1. Import candidate levels into `Level Manager`
2. Create or duplicate a progression
3. Drag levels into the 10 ordered slots
4. Lock the slots you want to keep
5. Set slot difficulty labels
6. Use manual auto-fill only when helpful
7. Export the progression

### Learning loop flow

1. Load a progression into `Play Sessions`
2. Play through levels in order
3. Approve, reject, or fix
4. Mark strong examples as references
5. Generate new levels from references
6. Re-curate the pool

## What “Good” Looks Like

The toolkit is working well when:

- the designer never has to rebuild state after a refresh
- progressions are understandable at a glance
- the tool exposes change history clearly
- generation is fast but still controllable
- review decisions feed back into generation
- the UI supports judgment instead of hiding it

## Near-Term Product Priorities

Recommended next steps:

1. Add progression rename and duplicate everywhere they are needed
2. Keep notes visible in more review surfaces
3. Expand diff view from summary text into a richer comparison panel
4. Add optional progression-level reports after a full review pass
5. Let procedural generation target open slots based on slot difficulty and locked positions

## Final Product Positioning

This tool should be treated as a hybrid between:

- a level editor
- a review console
- a progression planner
- a learning-assisted procedural design tool

Its value is not just in creating JSON. Its value is in helping a designer build a repeatable, explainable difficulty pipeline.

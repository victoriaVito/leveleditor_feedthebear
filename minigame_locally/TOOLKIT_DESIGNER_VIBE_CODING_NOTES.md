# Level Toolkit Notes for a Designer Using Vibe Coding

This note explains the current toolkit from the perspective of a designer working iteratively with AI-assisted tooling.

It focuses on what each tool is for, what was learned while building them, which mistakes created the most friction, and how those mistakes changed the implementation.

## Why This Matters

This toolkit is not just a technical editor.

It became a design workspace where progression curation, puzzle readability, file identity, screenshots, and reporting all had to stay connected.

That design need is what pushed the tool beyond a simple level editor.

The most important lesson is that a designer using vibe coding still needs:

- stable source of truth
- visible file identity
- recoverable save points
- readable progression structure
- lightweight ways to compare levels visually

Without those pieces, rapid iteration creates confusion instead of momentum.

## Designer Workflow

The intended workflow now is:

1. create or edit a level in `Level Editor + Play`
2. validate that it is solvable
3. tune `moves`, blockers, pairs, difficulty label, and naming
4. save the level into a progression slot or as a new standalone level
5. review progression shape in `Level Manager`
6. move uncertain or non-fitting levels into `Extras`
7. export progression packages and sync structured metadata into the spreadsheet layer

This workflow is still human-led.

The procedural system supports the designer, but does not replace design judgment.

## Tool Summary

### Level Editor + Play

The editor is the place for direct board authorship.

It supports:

- board width and height
- blockers
- up to five pairs
- move tuning
- difficulty labeling
- solvability validation
- `Decal` validation for full free-cell coverage
- debug-only cell marking
- save back into progression slots
- `Save As New`

Design lesson:

- the editor needed to behave like a design surface, not a raw JSON form
- naming, slot identity, and play feel matter as much as pure structure

Mistakes that surfaced:

- browser-only state was too fragile
- hidden metadata was easy to lose
- slot save behaviour was unclear
- move editing was not explicit enough
- pair support was originally too narrow

Improvements made because of those mistakes:

- persistent workspace state
- explicit level naming
- direct `Save Changes`, `Save To Slot`, and `Save As New`
- support for more pairs
- debug-only marking layer

### Level Manager

The manager is the editorial system.

It is used to:

- organize progression slots
- keep slot 1 fixed as tutorial
- assign `EASY / MEDIUM / HARD`
- reorder or replace levels visually
- keep `Extras` separate from the main curves
- export screenshots, CSV, JSON, and progression ZIP packages
- sync structured manager data into a workbook/database layer

Design lesson:

- progression building is an authored sequencing task, not simple file sorting
- the file sitting in a slot is part of the design intention

Mistakes that surfaced:

- too much browser-only state
- too many duplicate files across folders
- unclear distinction between active progressions and overflow levels
- mismatch between what the user saw in the UI and what existed on disk
- heavy rendering and repeated preview generation

Improvements made because of those mistakes:

- canonical folders for levels, progressions, and playtest data
- startup integrity audit
- progression materialization to project files
- `Extras` as a first-class bucket
- filters, pagination, and lighter rendering
- progression exports grouped into consistent bundles

### Play Sessions

Play Sessions is the review and correction layer.

It is used to:

- load a progression or queue of levels
- play them without leaving the review context
- approve or reject quickly
- send a level back to the editor for correction
- learn from corrected versions

Design lesson:

- review needs to be fast and visual
- designers need to keep momentum while judging whether a level belongs in a curve

Mistakes that surfaced:

- too much jumping between views
- redundant controls across tabs
- session corrections did not always flow back into manager data

Improvements made because of those mistakes:

- direct playable session board
- auto-advance review flow
- correction learning
- tighter connection between session changes and manager state

### Procedural

Procedural should be understood as a candidate generator.

It does not replace a designer.

It currently helps with:

- creating candidate levels by slot
- producing batches
- generating episode drafts
- supporting review with structured metadata

Design lesson:

- procedural usefulness depends more on design intention than raw generation speed
- the strongest difficulty signals are often readability, blockers, and path interference rather than board size

Mistakes that surfaced:

- the generator was too easy to over-trust
- it originally leaned too heavily on board size and density proxies
- the outputs felt less authored than curated progressions

Improvements made because of those mistakes:

- stronger emphasis on review and curation
- better documentation of generator limits
- more explicit learning from approved, rejected, and corrected levels

### Settings and Sync

Settings now acts as operational control for:

- save roots
- render profile
- UI colours and font
- pair colours
- default board settings
- spreadsheet sync mode
- cache clearing

Design lesson:

- a tool that supports experimentation needs explicit operational controls

Mistakes that surfaced:

- export behaviour was too browser-driven
- sync expectations were too implicit

Improvements made because of those mistakes:

- project-root saving
- workbook mirror
- Google sync strategy split from local save

## Visual Design Lessons

The toolkit taught the same lesson as the levels themselves:

- visual design is not decoration
- it changes how the system is understood

For levels, this meant:

- layout readability matters
- blocker placement matters more than blocker count
- path interference defines much of the real tension

For the tool, this meant:

- progression cards need to feel readable at a glance
- hierarchy must be obvious
- the difference between active progression slots, pool levels, and extras must be visually clear

## Main Errors and What They Taught

### 1. Treating browser state as if it were enough

This caused lost progressions, missing references, and confusion between what was visible and what was actually stored.

What changed:

- the tool now writes more of its progression state and exports into project files
- manager logs and startup integrity checks exist to catch missing references early

### 2. Allowing file duplication to grow unchecked

This created multiple differently named files that represented the same level.

What changed:

- canonical folders were introduced
- archive/runtime mirrors were separated from source folders
- deduplication and catalog audits became necessary parts of the workflow

### 3. Making the UI technically capable but editorially noisy

A tool can be functional and still be hard to use.

What changed:

- actions were centralized
- redundant controls were removed
- progression and review workflows were made more explicit

### 4. Underestimating screenshot and file identity management

The screenshot attached to a level is part of the design workflow, not a cosmetic add-on.

What changed:

- progression bundles include structured exports
- screenshot organization became part of the documentation and review flow

## What Still Needs Improvement

- stronger save-point strategy beyond browser-local checkpoints
- cleaner canonical naming for all historical levels
- even lighter `Level Manager` rendering for large catalogs
- more reliable end-to-end spreadsheet/database sync
- better distinction between historic progressions and current active progressions
- better procedural scoring for authored-feeling boards

## Practical Conclusion

The toolkit is strongest when used as a designer-facing system with human editorial control.

The best results came from treating vibe coding as:

- fast iteration
- visible correction
- explicit structure
- continuous documentation

not as blind generation.

The key lesson is simple:

good level design tools do not only store levels, they preserve design intention.

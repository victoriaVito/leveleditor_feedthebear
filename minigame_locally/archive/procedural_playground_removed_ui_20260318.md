# Procedural Playground Removed UI

Date: 2026-03-18

This archive document keeps the removed top-level Procedural Playground sections that were taken out of the active toolkit UI to simplify the main workflow.

Removed from the active `Procedural` view:

## Episode Builder

- Purpose: generate a full 10-level episode in memory and export it for review.
- Former buttons:
  - `Generate Episode 1-10`
  - `Download Episode JSON`

## Level Generator

- Purpose: create a single generated level for the editor or produce a procedural batch from the selected range.
- Former buttons:
  - `Generate One Level to Editor`
  - `Generate Procedural Batch`
  - `Download Batch JSON`

## Workshop Extras

- Purpose: download the tutorial and prepared workshop progression bundles.
- Former buttons:
  - `Download Tutorial JSON`
  - `Download Workshop A Bundle`
  - `Download Workshop B Bundle`
  - `Download Workshop C Bundle`
  - `Download Workshop Extra Bundle`

Reason for removal:

- The active procedural workflow is now centered on `Reference Generator`.
- The removed sections made the screen noisy and diluted the main design-review loop.
- The related logic can be recovered later from the codebase and this archive note if needed.

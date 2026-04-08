# Procedural Reference Generator Follow-up

Date: 2026-03-18

This note captures the UI improvement requested after simplifying the Procedural view.

## Problem observed

- The `Reference Generator` area could look empty even when a base level was already loaded.
- The user expectation was to see a visible screenshot/preview immediately, not only after generating variants.

## Applied improvement

- Added a persistent `Base level preview` card to the procedural reference grid.
- Added an explicit empty-state panel when no variants are present yet.
- The empty state now explains what to do next:
  - choose a base JSON first, or
  - click `Generate 3 Variants` after a base is loaded.

## Remaining follow-up ideas

- Add saved screenshot thumbnails when a variant has already been exported to project files.
- Add a “scroll to variants” helper when the grid is below the fold on smaller screens.
- Add a lightweight count badge such as `3 variants ready` once generation succeeds.

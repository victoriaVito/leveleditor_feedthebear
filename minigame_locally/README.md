# Feed the Bear Level Toolkit

This repository contains an internal web toolkit used to create, edit, playtest, validate, organize, and export puzzle levels for the Feed the Bear project.

It is not just a level editor. It is a working environment for:

- handcrafting levels
- validating puzzle layouts
- running playtest sessions
- building curated progressions
- separating valid vs discarded content
- generating procedural candidates
- learning from approved, rejected, and corrected levels

## Repository purpose

The project solves one practical problem:

- level design work was spread across many JSON files, screenshots, and ad-hoc review flows

The toolkit centralizes that workflow into one browser app plus one repository structure.

## How to run

Requirements:

- Node.js

Install dependencies:

```bash
npm install
```

Start the local server:

```bash
npm run start:web
```

Open:

- [http://127.0.0.1:8080](http://127.0.0.1:8080)

## Main project structure

### Application

- [level_toolkit_web](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web)
  - browser UI
  - editor, play, play sessions, manager, and procedural logic
- [server.mjs](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/server.mjs)
  - local HTTP server
  - static file serving
  - project-save endpoints for JSON and screenshots
- [progress.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progress.md)
  - implementation history and working notes
- [LEVEL_TOOLKIT_PRODUCT_NOTES.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/LEVEL_TOOLKIT_PRODUCT_NOTES.md)
  - product, UX, difficulty, and procedural thinking

### Levels

- [levels](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels)
  - unified root for all level JSON work
- [levels/progressions](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/progressions)
  - progression configs
  - progression assignment files
  - import/export ready copies in `progressions_only/`
- [levels/standalone](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/standalone)
  - individual playable levels
  - grouped by source and state

Recommended source of truth:

- progression files: [levels/progressions](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/progressions)
- individual level files: [levels/standalone](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/standalone)

## Level storage rules

The repository now uses a clear split:

- `levels/progressions/`
  - progression JSON files
  - progression bundles
  - progression assignment plans
- `levels/standalone/`
  - raw or playable level JSON files
  - grouped subsets such as:
    - `from_images`
    - `from_downloads_fixed`
    - `new_levels_a`
    - `valid_levels_only`
    - `discarded_levels_only`
    - `generated_large_hard_7x7_8x8`

This structure exists to avoid the old problem of levels being scattered across unrelated folders.

## Core game model

The current toolkit models the puzzle with:

- rectangular boards using `board_width` and `board_height`
- board sizes from `4` to `8`
- orthogonal path connections
- blocked cells
- multiple endpoint pairs
- no path crossing
- no overlapping path occupancy
- stored `moves`
- computed `solution_count`
- difficulty labels `EASY`, `MEDIUM`, `HARD`

The toolkit supports both:

- modern JSON with `board_width` / `board_height`
- legacy JSON formats that are normalized on import

## Main views

### Procedural

Purpose:

- generate one candidate level
- generate a 10-level episode draft
- generate procedural batches
- export prepared workshop bundles

This view is about candidate generation, not final editorial approval.

### Level Editor + Play

Purpose:

- import a level
- edit blockers and endpoints
- set level number
- set level name
- set board width and height
- set difficulty and moves
- play the level directly
- validate the level
- save changes back to the linked manager or session item

Important editor behavior:

- level name is editable
- saving with the same name overwrites the managed file
- renaming changes the JSON and screenshot filenames used in project saves

### Play Sessions

Purpose:

- queue levels for review
- play levels in sequence
- validate selected levels
- approve or reject
- fix bad levels by sending them to the editor
- generate learned batches from review history

This is the main playtest flow.

### Level Manager

Purpose:

- import levels and progression configs
- build progressions visually
- reorder slots with drag and drop
- swap levels quickly
- clear slots and replace them from the pool
- lock slots
- assign `EASY`, `MEDIUM`, or `HARD` per slot
- review a CSV-style audit view

This is the main curation flow.

### Settings

Purpose:

- choose the project save path used by the toolkit

## Saving model

The toolkit separates two different save concepts:

### 1. Save inside the project

The browser app writes managed files into the repository using the local Node server.

Default save root:

- [levels/standalone/toolkit_exports](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/standalone/toolkit_exports)

Typical outputs:

- `levels/`
- `screenshots/`
- `play_sessions/`
- `manager/`
- `procedural/`
- `bundles/`

This is the default content-production save flow.

### 2. Save to GitHub

Saving inside the project does not automatically publish anything.

GitHub publishing still requires:

- `git add`
- `git commit`
- `git push`

The repository is connected to:

- [https://github.com/victoriaVito/leveleditor_feedthebear.git](https://github.com/victoriaVito/leveleditor_feedthebear.git)

## Persistence behavior

The toolkit persists workspace state in the browser so reloads do not destroy context.

Saved state includes:

- current editor level
- current editor filename
- manager items
- progression order
- slot locks
- per-slot difficulty labels
- play session queue
- review state
- learned memory

Without persistence, the tool becomes too fragile for real level-design work.

## Design rules

These are the main workflow rules encoded into the product:

- keep progression building editorial, not fully automatic
- reserve slot 1 for tutorial unless intentionally overridden
- use `EASY`, `MEDIUM`, `HARD` as the visible difficulty language
- keep invalid levels out of main progressions
- send uncertain or overflow content to extra buckets instead of forcing them into curves
- prefer drag-and-drop curation over form-heavy ordering
- avoid redundant actions across views
- keep one main responsibility per view

## Difficulty thinking

Difficulty is not treated as one raw number.

The toolkit treats it as a combination of:

- board size
- pair count
- blocker count
- path interference
- solution count
- move pressure
- readability
- likelihood of early mistakes

Editorially, the most useful output is still:

- `EASY`
- `MEDIUM`
- `HARD`

Those labels are easier to discuss, assign to slots, and review visually than internal density codes.

## Procedural generation thinking

Procedural generation in this repo is meant to produce useful candidates, not final truth.

The intended loop is:

1. generate candidates
2. review them visually
3. approve, reject, or fix
4. store those outcomes
5. generate again using those outcomes

The strongest learning signals are:

- approved levels
- rejected levels
- corrected versions of rejected levels
- reference-marked levels
- slot difficulty labels
- designer notes

## Important presets

Examples:

- workshop workspace:
  - [http://127.0.0.1:8080/?reset_workspace=1&autoload_workspace=workshop](http://127.0.0.1:8080/?reset_workspace=1&autoload_workspace=workshop)
- `progressionA_afterTewak` workspace:
  - [http://127.0.0.1:8080/?reset_workspace=1&autoload_workspace=progressionA_afterTewak](http://127.0.0.1:8080/?reset_workspace=1&autoload_workspace=progressionA_afterTewak)
- single progression autoload:
  - [http://127.0.0.1:8080/?reset_workspace=1&autoload_progression=progressionA_new_levels_a&view=manager](http://127.0.0.1:8080/?reset_workspace=1&autoload_progression=progressionA_new_levels_a&view=manager)

## Files worth reading first

If someone new joins the project, start here:

- [README.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/README.md)
- [levels/README.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/README.md)
- [LEVEL_TOOLKIT_PRODUCT_NOTES.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/LEVEL_TOOLKIT_PRODUCT_NOTES.md)
- [progress.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progress.md)

## Current limitations

- the procedural generator is useful for candidate generation, but still needs manual curation for high-quality progressions
- some older generated levels remain archived for reference, even if they are not progression-ready
- `level_toolkit_web/workshop_jsons/` and `level_toolkit_web/workshop_progressions/` still exist as web-facing copies for browser import/autoload flows

## Summary

This repository is a level-design workspace.

The main idea is:

- keep all important level data in one place
- make editing and review fast
- preserve state
- separate progression curation from raw level storage
- support procedural generation without giving up designer control

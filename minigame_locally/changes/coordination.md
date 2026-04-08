# Coordination Changes

## Current source of truth

- [AGENT_CHEATSHEET.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/AGENT_CHEATSHEET.md)
- [docs/agents/API_GUARDIAN.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/docs/agents/API_GUARDIAN.md)
- [docs/agents/CONTENT_RECOVERY.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/docs/agents/CONTENT_RECOVERY.md)
- [docs/agents/PROCEDURAL_DESIGN_CRITIC.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/docs/agents/PROCEDURAL_DESIGN_CRITIC.md)
- [docs/PROJECT_MASTER_HANDOFF.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/docs/PROJECT_MASTER_HANDOFF.md)

## Key decisions

- coordination files should describe active routes only
- removed routes should not remain in active prompts unless they still matter operationally
- persistence and source-of-truth paths must be explicit

## Recent outcomes

- coordination surfaces now point only to the supported spreadsheet route
- agent prompts aligned with local-first spreadsheet workflow
- quick routing remains in one cheatsheet instead of chat-only context
- helper prompts now require updating both `memoria.md` and the relevant `changes/*.md` file
- repo-level secret hygiene now relies on `.gitignore` and local-only env handling
- helper surfaces now assume test/example artifacts are not part of the maintained workflow
- stateful toolkit surfaces should prefer one canonical file per state category instead of timestamped near-duplicates

## 2026-03-24

- Updated `paraclau_1.md` so the recovery note now distinguishes the repaired spreadsheet screenshot sync from the remaining documentation follow-up work.
- Clarified in the canonical Claude/Codex handoff that `FEED_THE_BEAR_GDD.md` is now rewritten in the approved design-first structure, `docs/LEVEL_DESIGN.md` is still missing, and the Kingfluence generator still reflects older hardcoded copy.
- Updated `paraclau_1.md` again after the documentation pass to mark `docs/LEVEL_DESIGN.md`, `docs/README.md`, and the Kingfluence generator as complete and to record the canonical regeneration command.
- Refreshed the AI-Bridge shared context for Copilot handoff and documented that the local `ZAPIER_*` webhook variables are currently unset, so Copilot coordination in this shell is handoff-only rather than automated.
- Added a Zapier readiness pass: the local stack now has a `local` validation profile, macOS-compatible startup wrapper, current `paraclau_1.md` watcher assumptions, and a working docs watcher path.
- Clarified that full remote automation is still blocked only by the missing Zapier webhook URLs in `.env`, not by local code/runtime issues.
- Added the Copilot multi-model coordination plan to the canonical handoff queue and staged a 19:00 CET follow-up to review whether Claude can finish the unfinished cowork work.
- Added the shared-context note that Apps Script is now spreadsheet priority 1, with a canonical `apps_script/` scaffold and hybrid sidebar model.
- Recorded that there is still no dedicated agent viewer plugin; the recommended path is to build on top of the existing task-router `/tasks` and `/stats` endpoints plus the Zapier/task logs.
- Standardized coordination so `paraclau_1.md` is always the default Claude/Codex handoff surface; the AI-Bridge inbox is now an explicit opt-in transport layer instead of the primary route.
- Added a canonical communication-router design in `docs/COMMUNICATION_ROUTER.md` so task intent, routing rules, queue format, and generated snapshots now have one stable source of truth.
- Added the `Router Queue` section to `paraclau_1.md`, making the coordination file both the canonical handoff and the machine-readable task queue.
- Added shared routing rules in `scripts/lib/coordination_routing.mjs`, reused them from `scripts/task-router-server.mjs`, and created `scripts/paraclau_router.mjs` plus `npm run coordination:route` to emit queue snapshots under `output/coordination/`.

## 2026-03-25

- Updated `paraclau_1.md` to record that the image-to-level reconstruction pass is currently blocked because the user-referenced chat images are not attached in the thread and were not found as new source files in the workspace.
- Added `ROUTE-004` to the canonical router queue with `blocked` status for chat-image reconstruction work, and linked that route to `docs/IMAGE_RECONSTRUCTION_TRACKER.md`.

## 2026-03-31

- Moved the canonical Claude/Codex handoff from the repo root to `docs/PROJECT_MASTER_HANDOFF.md` so the master project context now lives inside the documentation set.
- Updated active coordination docs, prompts, watchers, router code, and test payloads to use `docs/PROJECT_MASTER_HANDOFF.md` as the canonical path.

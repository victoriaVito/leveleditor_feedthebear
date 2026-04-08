# Documentation Changes

## Current source of truth

- one canonical file per topic whenever possible
- `memoria.md` is now a short index, not the raw full log

## Important files

- [memoria.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/memoria.md)
- [changes/README.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/changes/README.md)
- [changes/archive/memoria_full_2026-03-21.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/changes/archive/memoria_full_2026-03-21.md)
- [FISH_COLORS_SYSTEM.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/FISH_COLORS_SYSTEM.md)
- [PARALLEL_APIS_README.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/PARALLEL_APIS_README.md)
- [PROCEDURAL_ML_DESIGN.md](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/PROCEDURAL_ML_DESIGN.md)

## Recent outcomes

- overlapping docs merged into canonical guides
- stale wording around retired paths removed from active docs
- memory system split into short index plus archive
- agent-facing docs now treat `memoria.md` as an index and `changes/*.md` as the maintainable topic logs
- docs now reference only active commands and maintained files
- test/example references removed from active documentation

## 2026-03-24

- Created `docs/TOOLKIT_ARCHITECTURE.md` as the Phase 1 architecture map for the monolithic toolkit app, including module boundaries, state objects, data flow, entry points, and server integration points.
- Created `docs/SERVER_API_REFERENCE.md` as the HTTP reference for `server.mjs`, covering startup, static serving rules, every endpoint, Google OAuth, error handling, and filesystem side effects.
- Created `docs/LEVEL_JSON_SCHEMA.md` as the canonical level-file specification, including the field reference, draft-07 schema, provenance notes, validation rules, and annotated examples.
- Preserved genuine uncertainty instead of filling gaps, including the current `app.js` to `server.mjs` `/api/delete-file` mismatch and schema fields that are code-supported but not present in sampled checked-in levels.
- Created `docs/PLAYTEST_SYSTEM.md` to distinguish saved session snapshots from the flattened JSONL dataset, document the real play interaction event types, and map how session data feeds the learning loop.
- Created `docs/WORKFLOWS.md` as the operational guide for editor save flow, Google Sheets sync, procedural pack generation, Kingfluence publishing, sheet-driven renames, and Live Ops Mix materialization.
- Created `docs/SCREENSHOT_PIPELINE.md` to document browser and Python screenshot generation, canonical storage locations, naming conventions, spreadsheet reuse, and the indirect Confluence screenshot path.
- Created `docs/BUNDLES_AND_MIXES.md` to document original progression bundles, the manager-state layer, live ops mix materialization, bundle lifecycles, and the current `bundles/live_ops_mixes/` target path.
- Created `docs/README.md` as the documentation index, covering the active doc set, change logs, coordination prompts, historical references, and a Vito-approval housekeeping checklist for proposed moves and `.gitignore` additions.
- Updated `FEED_THE_BEAR_GDD.md` so Section 8 now points to the new tooling/workflow docs, Section 9 now points to the level schema and bundle docs, and the specialist-doc list includes the new documentation set.
- Rewrote `FEED_THE_BEAR_GDD.md` in place into the requested design-first structure with the game pitch, progression model, procedural learning summary, and cross-references.
- Updated `docs/LEVEL_DESIGN.md` with verified real examples from `progression1_level3.json`, `progression1_level4.json`, `progression3_level1_v2.json`, and `progresion2_level7.json`, replacing the earlier weaker example set.
- Updated `docs/README.md` to index `docs/LEVEL_DESIGN.md` as the canonical practical level-design guide.
- Refactored `scripts/generate_full_confluence_page.py` so Kingfluence now pulls narrative sections from `FEED_THE_BEAR_GDD.md` and `docs/LEVEL_DESIGN.md`, uses normalized heading matching, and includes the technical appendix and related-doc sections instead of stale hardcoded copy.
- Regenerated `output/confluence/feed_the_bear_full_page_confluence_safe.html` from the canonical docs and verified `markdownlint` passes for `FEED_THE_BEAR_GDD.md`, `docs/LEVEL_DESIGN.md`, and `docs/README.md`.
- Updated `ZAPIER_QUICK_START.md` so the setup instructions now distinguish `local` vs `full` validation, document the agent-assignment webhooks, and reflect the current watched documentation files.

## 2026-03-25

- Created `docs/IMAGE_RECONSTRUCTION_TRACKER.md` as the canonical inventory for image-to-level reconstruction work, including a full audit of the local `screenshots/` folder and an explicit blocker state for chat-only images that are not present in the workspace.
- Updated `docs/README.md` to index the new image reconstruction tracker alongside the active documentation set.

## 2026-03-27

- Created `scripts/generate_reconstruction_confluence_page.py` to convert the localhost-only reconstruction comparison into a static Confluence-safe child-page artifact with embedded screenshots and reconstructed board renders.
- Generated `output/confluence/reconstruction_compare_confluence_safe.html` from canonical level JSON files and screenshot assets so the reconstruction review can live outside the local toolkit server.
- Updated `docs/IMAGE_RECONSTRUCTION_TRACKER.md` to point at the new child-page artifact and its regeneration command.
- Updated `docs/LEVEL_JSON_SCHEMA.md` so the canonical board-size contract now caps width at `7`, height at `8`, and documents `7x8` as the largest supported board.

## 2026-03-31

- Repositioned the project master handoff into `docs/PROJECT_MASTER_HANDOFF.md` instead of relying on scattered conversation threads or a root-level coordination note.
- Added a `Unified Chat Snapshot` to `docs/PROJECT_MASTER_HANDOFF.md` so current priorities, stable state, sources of truth, and resume rules live in one canonical handoff.
- Updated `docs/README.md` to direct collaborators to `docs/PROJECT_MASTER_HANDOFF.md` first when resuming cross-thread project work.
- Created `docs/NOTION_API_REFERENCE.md` as the canonical Notion API guide for agents, covering auth, capabilities, base headers, object model, endpoint families, data source workflows, page/block writes, file uploads, webhooks, limits, and retry/error strategy.
- Updated `docs/README.md` to index `docs/NOTION_API_REFERENCE.md` in the active documentation set.

## 2026-04-02

- Created `docs/agents/CROSS_MODEL_PORTABLE_CORE.md` as the provider-neutral core prompt for running the same Feed the Bear project context across Codex, Copilot, Gemini, or another coding assistant without forking project rules.
- Created thin wrappers at `docs/agents/CODEX_PORTABLE_WRAPPER.md`, `docs/agents/COPILOT_PORTABLE_WRAPPER.md`, and `docs/agents/GEMINI_PORTABLE_WRAPPER.md` so each environment can reuse the same canonical project core with only minimal tool-specific guidance.
- Updated `docs/README.md` and `docs/AGENT_CHEATSHEET.md` to index the new cross-model prompt pack and make it discoverable as the default portability layer for multi-assistant work.

# Project Master Handoff

This file is the single master chat/context for the Feed the Bear project. Consolidate durable decisions here instead of relying on scattered chat history.

Use this file as the default coordination layer between Codex and Claude for documentation, Kingfluence publishing, spreadsheet-structure questions, API/persistence checks, and cross-thread project state.

## Unified Chat Snapshot (2026-03-31)

- Purpose: keep one resumable handoff for the project so new work can start from this file instead of from old chat threads.
- Consolidation rule: if a chat produces a durable decision, workflow rule, blocker, or next-step list, merge the result into this file and update `memoria.md`.
- Start here for: current priorities, blockers, coordination routing, canonical commands, and documentation-state checks.

### Current source of truth

- Design and product intent: `FEED_THE_BEAR_GDD.md`
- Documentation map: `docs/README.md`
- Working-memory index: `memoria.md`
- Coordination master chat: `docs/PROJECT_MASTER_HANDOFF.md`
- Specialist operational docs: `docs/`, especially `docs/WORKFLOWS.md`, `docs/PROCEDURAL_ML_DESIGN.md`, and `docs/COMMUNICATION_ROUTER.md`

### Latest stable project state

- The web toolkit UI overhaul is complete, including toolbar grouping, responsive canvas framing, button hierarchy, and the follow-up button classification pass in `level_toolkit_web/index.html`.
- The procedural workflow is standardized around `npm run pipeline:procedural`, with the active procedural catalog under `levels/otherLevels/` and a canonical maximum board size of `7x8`.
- VitoBot is now persona-based Monte Carlo simulation rather than a flat heuristic pass; the docs and publishable HTML reflect that shipped model accurately.
- Spreadsheet workflow remains local-first with a Google Sheets mirror, and the Apps Script sidebar is still the preferred long-term control surface.
- Kingfluence publishing is generated from the canonical repo docs; if a live re-publish fails, the first recovery check is session/auth state rather than content generation.
- Image-to-level recovery should continue through `docs/IMAGE_RECONSTRUCTION_TRACKER.md`, which remains the canonical blocker and progress tracker for screenshot-driven reconstruction.

### Immediate next actions

- Keep gameplay and solver fixes flowing into `level_toolkit_web/app.js`, especially remaining target-directed DFS follow-ups noted later in this file.
- Continue benchmark-level cleanup in the editor before the next benchmark re-analysis and Kingfluence update.
- Retry live spreadsheet sync only after quota/session blockers have cooled down or been refreshed.
- Route durable documentation changes through the canonical chain: `FEED_THE_BEAR_GDD.md` -> `docs/*.md` -> generated Kingfluence HTML -> this handoff.

## Current Status

- On 2026-03-25 VitoBot was upgraded from a flatter heuristic pass to a persona-based Monte Carlo simulator. The shipped layer now combines skill profile plus behavioural persona (`balanced`, `cautious`, `explorer`, `perfectionist`, `speedrunner`) and reports abandonment plus misread pressure in addition to success, time, errors, dead ends, and restarts.
- The canonical documentation and Kingfluence HTML now explain that VitoBot is Monte Carlo plus hand-tuned personas, not full MCTS yet. The next credible simulation upgrade is lightweight MCTS-style route search on high-ambiguity boards after calibration against real playtest sessions.
- On 2026-03-25 the local Kingfluence integration pass added the explicit player-facing levels `1` to `10` curve, a `How To Read Results` playtest section, a `Current Supported Vs Planned` spreadsheet/App Script section, stronger `VitoBot` framing, and page-level `Expand all` / `Collapse all` controls in the canonical HTML.
- On 2026-03-25 the canonical Kingfluence HTML was regenerated to remove the `Status` column from the `Original Progressions` tables while keeping the separate `Difficulty Curves` section, including `Progression C`.
- On 2026-03-31 the spreadsheet live sync succeeded again with `npm run sync:sheets:local` after the canonical progression reorder. The workbook and payload regenerated cleanly and pushed to spreadsheet `1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c`, refreshing `README`, `All Progressions`, `Level Manager state`, `Level Catalog`, `Procedural learning`, `Mix Planner`, `Level Renames`, and `Curve Builder`.
- On 2026-03-31 the Confluence HTML was regenerated again at `output/confluence/feed_the_bear_full_page_confluence_safe.html`, but the live publish is still blocked locally: `publish_bear_confluence_report_live_chrome.mjs` now has the correct `KINGFLUENCE_PAGE_URL`, yet Chrome is not exposing DevTools on `127.0.0.1:9222`, so the publisher cannot attach to the signed-in session.
- The live re-publish attempt on 2026-03-25 was blocked by an expired Kingfluence/Okta session in Chrome. Next recovery step: sign in to Kingfluence in Chrome and re-run `KINGFLUENCE_PAGE_URL='https://kingfluence.com/display/~victoria.serrano/Feed+the+bear+-+level+design#reporting' node scripts/publish_bear_confluence_report_live_chrome.mjs`.
- Codex attempted the image-to-level reconstruction pass on 2026-03-25. Local `screenshots/` sources are already materialized, but the additional images referenced in chat are currently blocked because they are not attached in this thread and were not found as new source files in the workspace. Canonical tracker: `docs/IMAGE_RECONSTRUCTION_TRACKER.md`.
- Kingfluence follow-up rule: preserve the existing expand/collapse behavior, including the page-level `Expand all` / `Collapse all` controls, in the next structure and publish pass.
- Kingfluence page is publish-ready and already published.
- Kingfluence live page was re-synced on 2026-03-24 after hardening the publisher for pretty `display/...` URLs and TinyMCE-backed edit pages. The live target remains `Feed the bear - level design`.
- Notion was updated on 2026-03-24 in two places: `AI Work Log` received a sync entry, and a dedicated child page `Feed the Bear - Internal Design Reference` now mirrors the live Kingfluence summary plus the current canonical source pointers.
- The dedicated Notion child page was restructured on 2026-03-24 into a wiki-style internal reference with `Overview`, `Sources Of Truth`, `Quality Bar`, `Current Sync Status`, `Tooling`, and `What To Read Next`.
- Confluence HTML regenerated 2026-03-24 from the canonical docs and bundle state, including the game pitch, technical appendix, progression tables + screenshots, difficulty curves, live procedural stats, level-design examples, `Related Docs`, and `Pending [VERIFY] Flags`.
- Regenerate command: `python3 scripts/generate_full_confluence_page.py`
- Spreadsheet live structure is consolidated and should stay aligned with the project source of truth.
- On 2026-03-25 the spreadsheet sync was tuned for faster loading: `All Progressions` keeps inline screenshot previews, while `Mix Planner`, `Level Renames`, `Curve Builder`, and `All screenshots` now use lightweight Drive links instead of `=IMAGE(...)` previews. The local workbook mirrors that choice by keeping embedded screenshots only on `All Progressions`. Canonical workbook and payload were regenerated successfully; the live `npm run sync:sheets:local` push then hit the Google Sheets per-user read quota, so the next recovery step is simply to retry the sync after the quota window cools down.
- Spreadsheet rename planning now lives in `Level Renames`, where target names can be staged, highlighted, and then applied back to canonical files.
- Procedural, Bridge, spreadsheet, and local-persistence work may affect documentation and should be reflected here when relevant.
- Canonical docs are now aligned across `FEED_THE_BEAR_GDD.md`, `docs/LEVEL_DESIGN.md`, and `docs/README.md`.
- Markdown lint passed for `FEED_THE_BEAR_GDD.md`, `docs/LEVEL_DESIGN.md`, and `docs/README.md` on 2026-03-24.
- AI-Bridge shared context is refreshed for Copilot handoff, but local Zapier/Copilot webhooks are not configured in this shell session, so Copilot coordination is currently handoff-based rather than automated.
- The local Zapier stack is now bootable on macOS via `npm run startup:zapier` after fixing the Bash 3 compatibility issue, the missing `express` dependency, and the stale watcher assumptions.
- `npm run validate:env:local` now passes. `npm run validate:env:full` still fails until the remote Zapier webhooks are added to `.env`.
- Apps Script is now priority 1 for the spreadsheet workflow. The repo should converge on one canonical Google Sheets control panel sidebar backed by `apps_script/` plus the local toolkit action endpoints.
- The Apps Script sidebar scaffold now reads progression inventory from `GET /api/progressions`, opens progression ZIP exports through `GET /api/action/export-progression`, and reads live playtest metrics from `GET /api/playtest-summary`.
- There is still no dedicated viewer plugin for agent/subagent activity. The best existing base is the local task-router plus webhook-receiver surfaces (`/tasks`, `/stats`, and task logs), which can be upgraded into a lightweight dashboard later.
- The communication-router MVP now exists: `docs/PROJECT_MASTER_HANDOFF.md` contains the canonical `Router Queue`, shared routing rules live in `scripts/lib/coordination_routing.mjs`, and `npm run coordination:route` generates machine-readable and human-readable queue snapshots under `output/coordination/`.
- Router validation pass completed on 2026-03-24: the documentation lane returned concrete must-add gaps, the validation lane returned concrete level-fix priorities, and the Codex lane is now implementing the gameplay-facing toolkit improvement that makes invalid-but-solved session levels easier to review and reject.

## Recovery Note (2026-03-24)

- Spreadsheet screenshot drift was real. Root cause: `google_sheets_api.mjs` reused existing Drive screenshot files by name without checking whether the local PNG bytes had changed.
- The Drive screenshot sync now replaces an existing Drive file when the local screenshot content changed under the same filename.
- Canonical repair run completed with `npm run sync:sheets:local`, and the live `All Progressions` screenshot cells now match the local canonical screenshot files again.
- The most visible duplicated-preview issue was `07 · progresion2 level7` and `08 · progresion2 level8` in Progression B. Those previews now point to distinct up-to-date PNG content again.
- `FEED_THE_BEAR_GDD.md` has now been rewritten in the approved design-first structure.
- `docs/LEVEL_DESIGN.md` now exists as the canonical practical level-design guide, grounded in real checked-in level examples.
- `scripts/generate_full_confluence_page.py` now reads the canonical docs instead of stale hardcoded copy and reflects the March 24 procedural-learning state (`25 approved / 26 rejected / 0 corrections`).
- The Zapier readiness pass fixed `scripts/startup.sh`, `scripts/validate-env.mjs`, `scripts/doc-publisher-zapier.mjs`, and `scripts/paraclau-watcher-zapier.js` so the local orchestration path matches the current project structure.

## Canonical Files

- Agent cheatsheet: `AGENT_CHEATSHEET.md`
- Publishable HTML: `output/confluence/feed_the_bear_full_page_confluence_safe.html`
- Memory log: `memoria.md`
- Canonical project GDD: `FEED_THE_BEAR_GDD.md`
- Level design bible: `docs/LEVEL_DESIGN.md`
- API / persistence agent prompt: `docs/agents/API_GUARDIAN.md`
- Content recovery agent prompt: `docs/agents/CONTENT_RECOVERY.md`
- Procedural design critic prompt: `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`
- Documentation index: `docs/README.md`
- Design voice (external): [Notion — Level Design](https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728)

## Open layout questions

- **2026-03-24 — Agent prompt relocation (Cowork session, approved by Vito):**
  Moving the three `PROJECT_AGENT_*.md` files from project root to `docs/agents/`. New paths:
  - `docs/agents/API_GUARDIAN.md` → `docs/agents/API_GUARDIAN.md`
  - `docs/agents/CONTENT_RECOVERY.md` → `docs/agents/CONTENT_RECOVERY.md`
  - `docs/agents/PROCEDURAL_DESIGN_CRITIC.md` → `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`
  All references in `docs/PROJECT_MASTER_HANDOFF.md`, `AGENT_CHEATSHEET.md`, and `docs/README.md` are updated accordingly. File content is unchanged — only the location moved. If you were referencing these by old root-level paths, update to the new `docs/agents/` paths.

## Documentation Contract

- `FEED_THE_BEAR_GDD.md` is the canonical high-level project explanation. It should read as a game design document (experience-first), not as a repo map.
- `docs/LEVEL_DESIGN.md` is the canonical level design reference. It should teach how to make a level that feels good, with real examples.
- Claude and Codex should update these files in place instead of creating new overview docs.
- `docs/PROJECT_MASTER_HANDOFF.md` is the single master chat and default coordination surface for Claude/Codex work on this project. Use it first for requests, handoffs, blockers, and documentation-state updates.
- The AI-Bridge inbox should be treated as an optional transport layer only when Vito explicitly asks to use the bridge. It should not replace `docs/PROJECT_MASTER_HANDOFF.md` as the canonical coordination file.
- Operational and technical docs live in `docs/` — see `docs/README.md` for the full index.
- Specialist docs remain valid for their domains:
  - `PROCEDURAL_ML_DESIGN.md`
  - `FISH_COLORS_SYSTEM.md`
  - `PARALLEL_APIS_README.md`
  - `memoria.md`
  - `archive/progress.md` as history, not as the main design doc
- If documentation changes affect spreadsheet, procedural design, or source-of-truth rules, reflect that in the GDD and only then propagate to other surfaces.
- Tone rule: all design docs should explain the "why" (player experience, design intent) before the "what" (parameters, structures, paths). A new team member should understand what makes this game interesting before they understand how the repo is organized.

## Current Project Terms

- `Original Progressions`: the unique authored base families such as A, B, and C.
- `Live Ops Mixes`: recombined editorial sets built by mixing the original progression families with each other.
- `Tutorial`: reserved content, handled separately from normal mix logic.
- Spreadsheet role: review and planning surface, not canonical authoring source.
- Spreadsheet ordinal labels: occurrence context only, not part of the canonical filename.

## Agent cheatsheet

- External systems, sync, Bridge, live verification: `docs/agents/API_GUARDIAN.md`
- Lost state, browser-only content, manifests, restore paths: `docs/agents/CONTENT_RECOVERY.md`
- Procedural quality, discard reasoning, generation critique: `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`
- Documentation and publish coordination: `docs/PROJECT_MASTER_HANDOFF.md`

## Pending publish checks

- `FEED_THE_BEAR_GDD.md` is complete.
- `docs/PLAYTEST_SYSTEM.md` now includes the operational `How To Read Results` section and should stay aligned with the Kingfluence trust caveat.
- `docs/PLAYTEST_SYSTEM.md` also now documents persona-based Monte Carlo simulation, the current behavioural personas, and the explicit boundary between the shipped model and future MCTS work.
- `docs/SPREADSHEET_CONTROL_PANEL.md` now states `Current Supported Vs Planned` explicitly and should be kept honest as the Apps Script rollout advances.
- `docs/LEVEL_DESIGN.md` is complete and indexed in `docs/README.md`.
- `scripts/generate_full_confluence_page.py` has been reworked and the canonical HTML has been regenerated.
- The canonical HTML now groups the long references into collapsible `Level Design Reference` and `Operational Reference` blocks and exposes page-level `Expand all` / `Collapse all` controls.
- `level_toolkit_web/index.html` and `level_toolkit_web/app.js` now expose the new VitoBot persona layer plus the extra synthetic metrics (`misreads`, `abandonment`).
- If any of the canonical docs change again, rerun `python3 scripts/generate_full_confluence_page.py`, then update `memoria.md` and this handoff.
- For full Zapier automation, the remaining blocker is `.env`: add `ZAPIER_PARACLAU_WATCH_WEBHOOK`, `ZAPIER_TASK_ROUTING_WEBHOOK`, `ZAPIER_LEARNING_BATCH_WEBHOOK`, `ZAPIER_DOC_PUBLISH_WEBHOOK`, `ZAPIER_HANDOFF_WEBHOOK`, the three callback URLs, and the three agent-assignment webhooks.
- Apps Script rollout priority:
  - Phase 1: scaffold and link the Google Apps Script project through `clasp`
  - Phase 2: ship the sidebar MVP with `README`, `Links`, `Mix`, `Progression`, and `Playtest` panels
  - Phase 3: add backend actions and canonical playtest summary exports needed by the sidebar

## Router Queue

Use this section as the default machine-readable coordination queue for Claude, Codex, and Copilot work.

One task card per heading:

- `Status`: `pending`, `in_progress`, `blocked`, `done`, or `cancelled`
- `Owner`: `auto`, `claude`, `codex`, or `copilot`
- `Type`: routing type from `docs/COMMUNICATION_ROUTER.md`
- `Priority`: `low`, `normal`, `high`, or `urgent`

### ROUTE-001

- Status: done
- Owner: claude
- Type: documentation
- Priority: high
- Depends On: none
- Source: project_master_handoff
- Title: Audit canonical docs for missing gameplay-facing gaps
- Summary: Review the current canonical docs and identify what is still missing, weak, stale, or worth adding before the focus shifts back to gameplay work.
- Success: Produce a concise audit with must add now, should add soon, and can leave as-is findings, plus any `[VERIFY]` items that should be resolved soon.
- Result: The strongest must-add items are now clear: document the concrete player-facing level-1-to-10 curve in `FEED_THE_BEAR_GDD.md`, add operational "how to read playtest results" decision rules in `docs/PLAYTEST_SYSTEM.md`, and add a current-supported-vs-planned block in `docs/SPREADSHEET_CONTROL_PANEL.md` so the Sheets/App Script doc stops reading ahead of shipped behavior.

### ROUTE-002

- Status: in_progress
- Owner: codex
- Type: code_generation
- Priority: high
- Depends On: none
- Source: project_master_handoff
- Title: Improve the actual gameplay loop based on current playtest and progression signals
- Summary: Use the current canonical level set, playtest summary, and progression understanding to identify one concrete gameplay improvement that should be implemented next in the game or toolkit, then execute it with verification.
- Success: Ship one meaningful gameplay-facing improvement, not just documentation or coordination work, and record the result in the canonical project surfaces.
- Current focus: The route now has three shipped improvements under the same gameplay-quality goal.
  First, the session review flow now surfaces validation status, failure reasons, and review guidance so solved-but-`INVALID` levels stop looking healthy.
  Second, the procedural scorer now explicitly prefers straighter golden paths with fewer excess bends, so candidates with unnecessary zigzag lose priority during generation.
  Third, the toolkit now has a `VitoBot` tab that can batch-simulate synthetic players over folder-based procedural packs, the current editor level, the current session queue, or the Procedural 100 catalog, returning time, error, restart, and success-rate estimates.

### ROUTE-003

- Status: done
- Owner: copilot
- Type: level_validation
- Priority: high
- Depends On: ROUTE-002
- Source: project_master_handoff
- Title: Validate current progression levels and flag the strongest tweak candidates
- Summary: Review the current progression and playtest outputs, identify which checked-in levels are the strongest candidates for tuning, and return a short prioritized list with reasons grounded in validation, readability, or route pressure.
- Success: Produce a concise, prioritized gameplay-tuning list that helps the next design/code pass focus on the right levels first.
- Result: The current fix order is now clear. `progression_3_level3` is the strongest tweak-first candidate because it is repeatedly solved but `INVALID` with very high interaction cost. `progression_3_level7_v2` is the next fix because it stays `INVALID` while its single blocker fails to create meaningful structure. `progression_3_level10_v2` is valid but too open and too permissive for its slot, while `progression3_level1_v2` remains a lower-priority onboarding-density concern.

### ROUTE-004

- Status: done
- Owner: claude
- Type: code_generation
- Priority: normal
- Depends On: none
- Source: user chat images + local screenshots
- Title: Reconstruct new levels from chat-provided images
- Summary: Create canonical level JSON files from the additional images referenced by the user in chat, reusing the existing tracker and canonical file rules.
- Success: Materialize each newly provided image into a validated repo JSON level and log the work in the canonical project surfaces.
- Result: Completed 2026-03-26. 13 levels reconstructed (7 editor images + 6 timestamped variants). 23 after-feedback screenshots mapped to existing canonical JSONs. 3 contact sheets skipped. 0 blocked.
- Tracker: `docs/IMAGE_RECONSTRUCTION_TRACKER.md`

### ROUTE-REGISTRY-001

- Status: done
- Owner: codex
- Type: documentation
- Priority: normal
- Depends On: none
- Source: user request
- Title: Verify agents/skills registry cleanup and canonical sync in sibling workspace
- Summary: Confirm that the `codex_0_AGENTE` cleanup already exists, verify the canonical AGENTS sync source plus the registry/skills inventory files, and record closure in the project coordination surfaces.
- Success: Verify the sibling workspace contents and leave a completed route plus memory note that point to the confirmed paths.
- Result: Verified the sibling workspace exists at `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/codex_0_AGENTE`.
  Confirmed `sync_agents.sh` uses `SRC="$BASE_DIR/AGENTS.md"` and syncs that canonical file into `copilot/copilot_agents.md` and `claude/claude_agents.md`.
  Confirmed the cleanup deliverables exist at `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/codex_0_AGENTE/AGENTS_REGISTRY_GUIDE.md`, `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/codex_0_AGENTE/AGENTS_SKILLS_README.md`, and `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/codex_0_AGENTE/scan_agents_inventory.py`.
  Marked the closure in `docs/PROJECT_MASTER_HANDOFF.md` and `memoria.md` from the `minigame_locally` project side.

### ROUTE-008

- Status: blocked
- Owner: codex
- Type: code_generation
- Priority: urgent
- Depends On: none
- Source: user request
- Title: Make the toolkit load the full A-I progression set directly on bootstrap
- Summary: The current editor/manager bootstrap is not loading the canonical `progression_a` through `progression_i` set directly even though those progression JSON files already exist in `progressions/`.
- Success: On toolkit load, the manager/editor should expose the full progression family without depending on the old A/B/C-only workspace snapshot.
- Diagnosis:
  - `level_toolkit_web/app.js` still defines `defaultManagerProgressions` with only `progressionA`, `progressionB`, and `progressionC`.
  - The canonical saved browser state in `.local/toolkit_state/workspace_state.json` and `.local/toolkit_state/manager_state.json` still uses the old progression-key scheme (`progressionA`, `progressionB`, `progressionC`, plus `progression_4` to `progression_9`) instead of the newer canonical repo files `progression_a` to `progression_i`.
  - `progressions/manager_state/level_manager_state.json` and `progressions/manager_state/level_manager_metadata.json` are aligned to that old snapshot too, so bootstrap restores stale manager structure before any direct canonical progression discovery can happen.
  - `progressions/manager_progressions_live.json` is also stale and still reflects the older manager state instead of the new canonical `A-I` progression set.
- Practical result: the new progressions are present in the repo, but the toolkit does not ingest them automatically because it is restoring a saved manager/workspace snapshot from the old schema rather than rebuilding from the canonical progression files.

## Save Point — Claude Session 2026-03-26

Changes made this session:

1. **DFS Solver Bug Fix (app.js `countSolutions`)**: The `enumeratePairPaths` DFS used direction order `[[1,0],[-1,0],[0,1],[0,-1]]` (DOWN first) with a 200-path cap. This caused false negatives: the DFS filled 200 paths with long winding routes before finding short valid ones. Fixed with target-directed DFS that sorts directions toward the target cell at each step, plus a 5-second time limit. Result: **83 levels recovered** from false `solutionCount=0` across the entire repo.

2. **Manager State Sync**: Updated `manager_state.json` to reflect corrected `solution_count` and `status` for all 77 affected items. Progression A is now 11/11 OK (was 10/11). Procedural 1 is now 11/11 OK (was 8/11 — `slot2_1-4.json` are all solvable).

3. **CSV Bundles Created for All 13 Progressions**: Previously only A, B, C had CSVs. Created bundles for `progression_4` through `progression_13`. CSVs now pull difficulty from manager state (not JSON files, which lack the field).

4. **Spreadsheet Script Updated (`sync_levels_spreadsheet.py`)**: `default_progression_csvs()` now auto-discovers `progression_4` through `progression_19` bundle CSVs, so the spreadsheet includes all 13 progressions (143 levels).

5. **Remaining INVALID levels** (6 total, genuinely `solutionCount=0`):
   - Progression B: slots 4 (`progresion2_level4`), 8 (`progresion2_level8`), 10 (`progresion2_level10`)
   - Progression C: slots 6 (`progression_3_level6`), 7 (`progression_3_level7_v2`), 8 (`progression_3_level_8_v2`)

6. **Levels previously thought unsolvable but now fixed**: `slot2_1` (4 solutions), `slot2_2` (20), `slot2_4` (5), `progression1_level7_v2` (1), `progresion2_level7` (1), `progression_3_level9_v2` (20), `progression_3_level10_v2` (6).

7. **Pending**: Sync updated data to the live Google Sheet (`1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c`). The solver fix needs to be applied to the other 3 `enumeratePairPaths` instances in `app.js` (only `countSolutions` has the target-directed DFS; `findOneSolutionPaths`, `findSampleSolutions`, `hasFullCoverSolution` still have the old direction order).

## Save Point — Claude Session 2026-03-26 (evening)

### What was done

1. **UI Toolkit overhaul** (pasos 1-6): Typography, micro-interactions, toolbar-group, btn-primary/muted, canvas-frame, manager polish, slot difficulty colors. All in styles.css + index.html + app.js.
2. **Kingfluence v63**: Full page rewrite with TOC, nav bar, expand/collapse, status badges, difficulty curves, tracking events, benchmark patterns, reconstruction summary. Chrome CDP + REST API.
3. **Notion synced**: Generator overhaul section, progressions D/E/F, learning stats, Curve Builder.
4. **Spreadsheet**: Benchmark tab created, Curve Builder improved (IMAGE() inline instead of "Open" links, better actions).
5. **Skills created**: `/kingfluence-publish`, `/google-sheets-drive`, `/toolkit-ui-patterns`.
6. **Generator overhaul**: Curve expanded (boards 4-8, pairs 2-8), mutation improved (+2 pairs, +3 clustered blockers, board up to 9x9), learning rebalanced (pairBias [-1,+4], boardDelta [-1,+2], blockerBias [-2,+4] penalizes meaningless_blockers).
7. **Flow Free benchmark**: 16 levels analyzed, 7 patterns extracted, 16 JSONs in `levels/benchmark_flow_free/`, analysis in `docs/FLOW_FREE_BENCHMARK_ANALYSIS.md`.
8. **ROUTE-004 completed**: 13 levels reconstructed from images, 23 mapped to existing JSONs.
9. **22 benchmark screenshots** saved to `levels/benchmark_flow_free/screenshots/` and mapped to JSON names. 6 extra levels discovered (10x12, 12x12 boards).
10. **Comparison page**: `level_toolkit_web/benchmark_compare.html` shows original vs reconstructed side-by-side.
11. **`vito` menu** recreated at `~/Documents/my_scripts/main_menu.py` with FtB tools + utilities.

### What needs to happen next

1. **Victoria will tweak benchmark JSONs in the Level Editor** — the endpoint positions don't match the originals well. Load each `ff_nivel*.json` in the editor, compare with the screenshot, fix positions, and save.
2. **After tweaking**: Re-analyze the corrected levels to verify patterns still hold. Run validation on each.
3. **DFS solver fix**: Apply target-directed DFS to `findOneSolutionPaths`, `findSampleSolutions`, `hasFullCoverSolution` in app.js. Only `countSolutions` has the fix so far.
4. **6 new benchmark levels** need JSONs: `ff_nivel1_10x12`, `ff_nivel4_10x12`, `ff_nivel2_3_12x12`, `ff_nivel3_6_8x8`, `ff_nivel4_6_8x8`, `ff_nivel2_5_9x9`. Screenshots are in `levels/benchmark_flow_free/screenshots/`.
5. **Spreadsheet sync**: Re-run `npm run sync:sheets:local` after the Level Editor tweaks to refresh screenshots and data.
6. **Kingfluence update**: After benchmark levels are corrected, update the Kingfluence page with final benchmark data.

### How to tweak benchmark levels

1. Start server: `node server.mjs` (or use `vito` → Feed the Bear → Start server)
2. Open `http://127.0.0.1:8080`
3. Go to Level Editor
4. Import JSON → pick a file from `levels/benchmark_flow_free/`
5. Open `http://127.0.0.1:8080/benchmark_compare.html` in another tab to see the original side-by-side
6. Move endpoints/blockers to match the original screenshot
7. Click Update to save
8. Repeat for each level

## Current Split By Expertise (2026-03-24)

- Claude lane: documentation audit and decision hygiene. Immediate owned follow-ups are the level-1-to-10 player curve, playtest interpretation rules, and the Spreadsheet/App Script "current vs planned" clarification.
- Codex lane: shipped code and toolkit behavior. Immediate owned work is the session-review improvement for invalid-but-solved levels, then the first level repair pass once the review surface is clearer.
- Copilot lane: validation and tweak prioritization. Immediate owned outputs are already in: fix `progression_3_level3` first, then `progression_3_level7_v2`, then tighten `progression_3_level10_v2`.

## What Remains Right Now

- Gameplay code: finish the session review signal so invalid solved levels stop looking deceptively healthy in the playtest flow.
- Gameplay code: validate the new straightness rule against a few generated outputs and tune its weight if it over-favors trivial layouts.
- Gameplay code: calibrate `VitoBot` against real playtest sessions so its synthetic time/error model stops being purely heuristic and starts matching observed player behavior better.
- Gameplay content: repair `progression_3_level3` and `progression_3_level7_v2`, then do a tightening pass on `progression_3_level10_v2`.
- Gameplay content: resume image-to-level reconstruction only after the missing chat-provided source images are reattached or copied into the workspace; current blocker is tracked in `docs/IMAGE_RECONSTRUCTION_TRACKER.md`.
- Documentation: add the three must-add doc clarifications from `ROUTE-001`, then resolve the highest-value `[VERIFY]` items around early curve, pair ranges, and playtest metric interpretation.

## Coordination TODO (2026-03-24)

- Imported the Copilot coordination roadmap from `~/.copilot/session-state/4267ce1a-25c8-42e0-a41e-e49f888ae0a1/plan.md` into the active handoff queue.
- Keep the Copilot plan as the current reference for multi-model routing until its rules are materialized in a repo-level canonical doc.
- Align the shared routing metadata across Copilot, Codex, and Claude:
  - task type
  - complexity
  - cost tolerance
  - model hint
  - blocker state
- Materialize the multi-model rollout in this order:
  - Phase 1: foundation, routing rules, handoff templates, authoritative plan ownership
  - Phase 2: Haiku integration
  - Phase 3: multi-model testing on real Feed the Bear tasks
  - Phase 4: full automation after the missing Zapier webhooks are configured
- Materialize the `docs/PROJECT_MASTER_HANDOFF.md`-first communication router in this order:
  - Phase 1: canonical router doc, shared routing rules, machine-readable queue, and generated snapshots
  - Phase 2: watcher integration and task-router import from `docs/PROJECT_MASTER_HANDOFF.md`
  - Phase 3: dashboard and callback-based status updates
- 19:00 CET follow-up:
  - review what Claude left unfinished in cowork
  - decide whether Claude should finish it or whether Codex should absorb the remaining work
  - record the result back in `docs/PROJECT_MASTER_HANDOFF.md` and the AI-Bridge shared context
- Documentation audit follow-up:
  - Claude has been asked through the `Router Queue` in this file to audit the current canonical docs for anything still missing, weak, stale, or worth adding before the focus shifts back to gameplay work.
  - The requested audit is explicitly non-rewrite: identify gaps, prioritize them, and point to `[VERIFY]` items that should be resolved soon.

---

## ROUTE-005 — Kingfluence: Replace localhost links with inline tables

- Status: pending
- Owner: codex
- Type: documentation / api_publish
- Priority: urgent
- Depends On: none
- Source: Claude session 2026-03-26 (context overflow — Cowork)

### Goal

The live Kingfluence page (pageId `990479168`) has a section called **"Level Reconstructions"** inside an `expand` macro. That section currently contains two links to `http://127.0.0.1:8080/benchmark_compare.html` and `http://127.0.0.1:8080/reconstruction_compare.html` — localhost URLs that do not work for anyone else.

Replace those links with the full inline data tables already prepared by Claude. No browser needed: use the Confluence REST API directly with a Python script.

### Pre-conditions

- You need a valid Kingfluence session cookie or Personal Access Token (PAT).
  - PAT path: go to `https://kingfluence.com/plugins/servlet/atl.account/tokens` → Create token → copy it.
  - Set env var: `export CONFLUENCE_TOKEN="<your_token>"`
  - Or set both: `export CONFLUENCE_USER="victoria.serrano@king.com"` and `export CONFLUENCE_PASS="<password>"`
- Python 3 + `requests` installed (`pip install requests`).

### Script to run

Script is already in the repo at `scripts/update_kingfluence_recon.py`. Execute with `python3 scripts/update_kingfluence_recon.py`.

```python
#!/usr/bin/env python3
"""
ROUTE-005: Replace Level Reconstructions expand content on Kingfluence page 990479168.
Replaces the two localhost links with inline data tables (benchmark + reconstructions).
Run once. Idempotent: safe to re-run, it will overwrite only the target expand section.
"""

import os
import re
import sys
import json
import requests

# ── Config ───────────────────────────────────────────────────────────────────
BASE_URL   = "https://kingfluence.com"
PAGE_ID    = "990479168"
API_URL    = f"{BASE_URL}/rest/api/content/{PAGE_ID}"
EXPAND_TITLE = "Level Reconstructions"   # exact title of the expand macro to target

# ── Auth ─────────────────────────────────────────────────────────────────────
TOKEN = os.environ.get("CONFLUENCE_TOKEN")
USER  = os.environ.get("CONFLUENCE_USER")
PASS  = os.environ.get("CONFLUENCE_PASS")

if TOKEN:
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {TOKEN}"})
elif USER and PASS:
    session = requests.Session()
    session.auth = (USER, PASS)
else:
    print("ERROR: set CONFLUENCE_TOKEN or CONFLUENCE_USER+CONFLUENCE_PASS env vars.")
    sys.exit(1)

session.headers.update({"Content-Type": "application/json", "X-Atlassian-Token": "no-check"})

# ── New inline content (Confluence storage format) ────────────────────────────
NEW_RECON_BODY = """
<h3>Reconstruction Summary (2026-03-26)</h3>
<p>29 levels reconstructed or mapped from images. All data extracted from canonical JSON files.</p>
<table>
  <tbody>
    <tr><th>Category</th><th>Count</th><th>Action</th><th>Location</th></tr>
    <tr><td>Editor images (image11&#8211;28)</td><td>7</td><td>Reconstructed from screenshots</td><td><code>levels/image*_level_editor.json</code></td></tr>
    <tr><td>Timestamped variants</td><td>6</td><td>Reconstructed from screenshots</td><td><code>levels/p_2_4_new_*.json</code> etc.</td></tr>
    <tr><td>After-feedback aliases</td><td>23</td><td>Mapped to existing canonical JSONs</td><td>No new files &#8212; alias naming only</td></tr>
    <tr><td>Flow Free benchmark</td><td>16</td><td>Reconstructed from mobile screenshots</td><td><code>levels/benchmark_flow_free/ff_nivel*.json</code></td></tr>
    <tr><td>Contact sheets / non-levels</td><td>3</td><td>Skipped</td><td>&#8212;</td></tr>
  </tbody>
</table>

<h3>Editor Image Reconstructions (7 levels)</h3>
<table>
  <tbody>
    <tr><th>File</th><th>Grid</th><th>Pairs</th><th>Blockers</th></tr>
    <tr><td>image11_level_editor</td><td>5&#215;5</td><td>3</td><td>3</td></tr>
    <tr><td>image19_level_editor</td><td>5&#215;5</td><td>3</td><td>1</td></tr>
    <tr><td>image20_level_editor</td><td>5&#215;5</td><td>3</td><td>1</td></tr>
    <tr><td>image21_level_editor</td><td>5&#215;5</td><td>3</td><td>2</td></tr>
    <tr><td>image24_level_editor</td><td>5&#215;5</td><td>3</td><td>2</td></tr>
    <tr><td>image25_level_editor</td><td>5&#215;5</td><td>3</td><td>0</td></tr>
    <tr><td>image28_level_editor</td><td>5&#215;5</td><td>2</td><td>1</td></tr>
  </tbody>
</table>

<h3>Timestamped Variant Reconstructions (6 levels)</h3>
<table>
  <tbody>
    <tr><th>File</th><th>Grid</th><th>Pairs</th><th>Blockers</th></tr>
    <tr><td>p_2_4_new_20260310165931</td><td>6&#215;6</td><td>4</td><td>3</td></tr>
    <tr><td>p_2_5_new_20260310170335</td><td>7&#215;7</td><td>4</td><td>8</td></tr>
    <tr><td>p_2_6_new_20260310170645</td><td>6&#215;6</td><td>3</td><td>3</td></tr>
    <tr><td>p_2_9_new_20260310195328</td><td>8&#215;8</td><td>4</td><td>3</td></tr>
    <tr><td>p_4_c_new_20260311075908</td><td>7&#215;7</td><td>4</td><td>9</td></tr>
    <tr><td>level_2</td><td>5&#215;5</td><td>3</td><td>1</td></tr>
  </tbody>
</table>

<h3>Flow Free Benchmark Levels (16 levels)</h3>
<p>These levels were reconstructed from Flow Free mobile screenshots to establish difficulty benchmarks for FtB board design. All are classified as HARD.</p>
<table>
  <tbody>
    <tr><th>Level</th><th>Grid</th><th>Pairs</th><th>Blockers</th><th>Patterns</th></tr>
    <tr><td>ff_nivel3_8x8</td><td>8&#215;8</td><td>6</td><td>6</td><td>blocker_cluster_chokepoint, high_coverage_difficulty</td></tr>
    <tr><td>ff_nivel4_8x8</td><td>8&#215;8</td><td>6</td><td>4</td><td>long_distance_endpoints, high_coverage_difficulty</td></tr>
    <tr><td>ff_nivel5_8x8</td><td>8&#215;8</td><td>6</td><td>8</td><td>blocker_cluster_chokepoint, high_coverage_difficulty</td></tr>
    <tr><td>ff_nivel5_9x9</td><td>8&#215;9</td><td>8</td><td>0</td><td>zero_blocker_pure_interference, pair_scaling_benchmark</td></tr>
    <tr><td>ff_nivel6_8x8</td><td>8&#215;8</td><td>7</td><td>3</td><td>pair_scaling_benchmark, nested_route_structure</td></tr>
    <tr><td>ff_nivel6v2_8x8</td><td>8&#215;8</td><td>7</td><td>0</td><td>zero_blocker_pure_interference, nested_route_structure</td></tr>
    <tr><td>ff_nivel7a_8x8</td><td>8&#215;8</td><td>8</td><td>4</td><td>pair_scaling_benchmark, nested_route_structure</td></tr>
    <tr><td>ff_nivel7b_8x8</td><td>8&#215;8</td><td>8</td><td>12</td><td>zero_blocker_pure_interference, long_distance_endpoints</td></tr>
    <tr><td>ff_nivel9a_8x8</td><td>8&#215;8</td><td>7</td><td>8</td><td>blocker_cluster_chokepoint, nested_route_structure</td></tr>
    <tr><td>ff_nivel9b_9x9</td><td>9&#215;9</td><td>10</td><td>0</td><td>zero_blocker_pure_interference, pair_scaling_benchmark</td></tr>
    <tr><td>ff_nivel11_9x9</td><td>9&#215;9</td><td>9</td><td>4</td><td>pair_scaling_benchmark, nested_route_structure</td></tr>
    <tr><td>ff_nivel13_8x8</td><td>8&#215;8</td><td>7</td><td>0</td><td>zero_blocker_pure_interference, pair_scaling_benchmark</td></tr>
    <tr><td>ff_nivel15_9x9</td><td>9&#215;9</td><td>8</td><td>5</td><td>blocker_cluster_chokepoint, long_distance_endpoints</td></tr>
    <tr><td>ff_nivel16_8x8</td><td>8&#215;8</td><td>6</td><td>6</td><td>blocker_cluster_chokepoint, perimeter_wrap_route</td></tr>
    <tr><td>ff_nivel32_8x8</td><td>8&#215;8</td><td>7</td><td>4</td><td>long_distance_endpoints, nested_route_structure</td></tr>
    <tr><td>ff_nivel34_8x8</td><td>8&#215;8</td><td>7</td><td>4</td><td>long_distance_endpoints, nested_route_structure</td></tr>
  </tbody>
</table>

<h3>Pattern Glossary</h3>
<table>
  <tbody>
    <tr><th>Pattern</th><th>Description</th></tr>
    <tr><td><strong>blocker_cluster_chokepoint</strong></td><td>Blockers form clusters that create narrow passages, forcing specific route choices</td></tr>
    <tr><td><strong>zero_blocker_pure_interference</strong></td><td>No blockers &#8212; all difficulty comes from path interference between pairs</td></tr>
    <tr><td><strong>pair_scaling_benchmark</strong></td><td>High pair count relative to board size tests scaling behavior</td></tr>
    <tr><td><strong>nested_route_structure</strong></td><td>Solutions require paths that wrap around each other in nested patterns</td></tr>
    <tr><td><strong>long_distance_endpoints</strong></td><td>Pair endpoints placed far apart, forcing long paths that consume board space</td></tr>
    <tr><td><strong>perimeter_wrap_route</strong></td><td>Optimal solutions use board edges, creating wrap-around paths</td></tr>
    <tr><td><strong>high_coverage_difficulty</strong></td><td>Most board cells must be used, leaving minimal free space</td></tr>
  </tbody>
</table>
"""

# ── Fetch current page ────────────────────────────────────────────────────────
print(f"Fetching page {PAGE_ID}...")
r = session.get(API_URL, params={"expand": "body.storage,version"})
r.raise_for_status()
data = r.json()

current_version = data["version"]["number"]
current_title   = data["title"]
body            = data["body"]["storage"]["value"]

print(f"  Title:   {current_title}")
print(f"  Version: {current_version}")
print(f"  Body length: {len(body)} chars")

# ── Find and replace the expand macro ────────────────────────────────────────
# Pattern: ac:structured-macro named "expand" with ac:parameter title="Level Reconstructions"
# We replace the inner ac:rich-text-body content.

MACRO_PATTERN = re.compile(
    r'(<ac:structured-macro[^>]*ac:name="expand"[^>]*>)'   # open tag
    r'(.*?<ac:parameter[^>]*ac:name="title"[^>]*>Level Reconstructions</ac:parameter>.*?)'  # title param
    r'(<ac:rich-text-body>)(.*?)(</ac:rich-text-body>)'    # rich text body
    r'(.*?</ac:structured-macro>)',                         # close tag
    re.DOTALL
)

def replace_body(m):
    return m.group(1) + m.group(2) + m.group(3) + NEW_RECON_BODY + m.group(5) + m.group(6)

new_body, n_replacements = MACRO_PATTERN.subn(replace_body, body)

if n_replacements == 0:
    # Fallback: look for the title text and replace the surrounding expand block
    print("WARNING: regex pattern did not match. Trying fallback search...")
    if "Level Reconstructions" not in body:
        print("ERROR: 'Level Reconstructions' not found in page body. Aborting.")
        sys.exit(1)
    # Print context around match to help debug
    idx = body.index("Level Reconstructions")
    print("  Context around match:")
    print("  " + body[max(0, idx-200):idx+200])
    sys.exit(1)

print(f"  Replaced {n_replacements} expand macro(s). New body length: {len(new_body)} chars")

# ── PUT updated page ──────────────────────────────────────────────────────────
payload = {
    "version": {"number": current_version + 1},
    "title":   current_title,
    "type":    "page",
    "body": {
        "storage": {
            "value":          new_body,
            "representation": "storage"
        }
    }
}

print(f"Publishing version {current_version + 1}...")
r2 = session.put(API_URL, data=json.dumps(payload))

if r2.status_code in (200, 201):
    result = r2.json()
    print(f"SUCCESS. New version: {result['version']['number']}")
    print(f"  URL: {BASE_URL}/pages/viewpage.action?pageId={PAGE_ID}")
else:
    print(f"ERROR {r2.status_code}: {r2.text[:500]}")
    sys.exit(1)
```

### How to run

```bash
# From the project root (minigame_locally/)
export CONFLUENCE_TOKEN="<token from kingfluence.com/plugins/servlet/atl.account/tokens>"
python3 scripts/update_kingfluence_recon.py
```

Or with user/password:

```bash
export CONFLUENCE_USER="victoria.serrano@king.com"
export CONFLUENCE_PASS="<your password>"
python3 scripts/update_kingfluence_recon.py
```

### What it does

1. GETs the current page body from Kingfluence REST API (no browser).
2. Finds the `expand` macro titled "Level Reconstructions" using regex on the Confluence storage XML.
3. Replaces its `<ac:rich-text-body>` content with the inline tables (reconstruction summary, editor images, timestamped variants, Flow Free benchmark, pattern glossary).
4. PUTs the new body back as the next version.

### Success criteria

- Script prints `SUCCESS. New version: X`.
- No `http://127.0.0.1` links remain in the Level Reconstructions section.
- All 5 tables visible on the live page: Summary, Editor Images (7), Timestamped Variants (6), Flow Free Benchmark (16), Pattern Glossary (7 patterns).

### If the regex fails

The expand macro title may differ slightly in the live XML. Run this diagnostic first:

```bash
python3 - <<'EOF'
import os, requests
session = requests.Session()
session.headers.update({"Authorization": f"Bearer {os.environ['CONFLUENCE_TOKEN']}"})
r = session.get("https://kingfluence.com/rest/api/content/990479168", params={"expand": "body.storage"})
body = r.json()["body"]["storage"]["value"]
# Print all expand macro titles present
import re
for m in re.finditer(r'<ac:parameter[^>]*ac:name="title"[^>]*>(.*?)</ac:parameter>', body):
    print("EXPAND TITLE:", m.group(1))
EOF
```

This will list all expand macro titles. Find the exact string used for the "Level Reconstructions" section and update `EXPAND_TITLE` in the script.

---

## 2026-03-24 — DOCUMENTATION REWRITE TASK (approved by Vito)

This is a multi-document rewrite. The goal is to shift all project documentation from a repository-map tone to a game-design-first tone. The documents should explain the experience before the architecture, the "why" before the "what", and use real project data instead of abstract descriptions.

### What to deliver

**1. Rewrite `FEED_THE_BEAR_GDD.md` in place**

The GDD should read like a game design document that a new designer, a producer, or a stakeholder can pick up and understand what makes this game interesting.

New structure:

1. **What is this and who is it for** — Pitch in 3 lines. Audience: casual mobile players. Context: mini-game inside a broader product ecosystem, delivery target Meta. One sentence on the design north star: "Lo logré yo" — the player should feel the solution was theirs, not that they survived a system.

2. **How it plays** — Core mechanic explained conversationally. A board with colored fish pairs. The player traces paths to connect each pair without crossing. Blockers add constraints. Show one example: a 4x4 board with 2 pairs, explaining the tension that makes it a puzzle. ASCII art is fine.

3. **What makes a puzzle good** — The three quality layers: (a) Validation — is it solvable? (b) Playtest — does the route feel intentional? (c) Design quality — does it earn the "I did it" feeling? Then the design principles: readability first, blockers must have purpose, path interference is the real tension, crowded is not the same as interesting.

4. **The difficulty model** — Five dimensions (board size, pair count, start-end distance, blocker count + clustering, solution count). For each one: what it does to the player experience (not just the parameter range), how it interacts with others, and a concrete example. Include the blocker intelligence insight: 35% of all procedural rejections cite "blockers that make no sense". Include the scaling table (board size → suggested pair range).

5. **How progression works** — Original Progressions (A, B, C) as authored editorial curves. Each slot has design intent, not just a difficulty number. Tutorial as reserved slot 0 content.
   Then Live Ops Mixes: what they are (recombinations of original families for event/rotation content), how they differ from originals (editorial product, not unique authored content), the materialization flow (Mix Planner sheet → approval → `npm run materialize:mixes` → bundle output in `bundles/live_ops_mixes/`).
   Explain that mixes can rotate order, recombine across families, or create event-ready sets without net-new level production.

6. **The visual language** — 14-fish palette (7 species × 2 variants: solid + striped), mapped A through N. Why it matters: stable visual categories for players and reviewers, coherent family identity across progressions. Reference `config/fish_colors.json` and `FISH_COLORS_SYSTEM.md`.

7. **Procedural generation** — Written for a designer who will use the system, not for an engineer who will build it. Cover:
   - Philosophy: "The generator proposes, the designer disposes." It accelerates content exploration while keeping human review central.
   - What it does: generates 12 candidates per request, scores them, presents the best. Can also mutate existing levels (reference-driven generation) to explore nearby alternatives.
   - How the designer interacts: Keep/Discard in reference generator, approve/reject in play sessions, Send Knowledge / Send Anti-Pattern from the editor.
   - What the system learns: approved patterns pull generation toward similar features, rejected patterns push it away, corrections override bad shapes. This makes procedural work cumulative.
   - Current learning state (as of 2026-03-24): 25 approved, 26 rejected, 0 corrections. Most common rejection tags: too_easy (13), meaningless_blockers (7), bad_blocker_clustering (3).
   - Honest limitation: the system is good at generating valid candidates but still weak at placing intentional blockers and understanding spatial tension. Do not build a full ML model yet — clean the dataset first, persist richer features, then consider an evaluator model.

8. **Technical appendix: procedural pipeline** — For engineers and advanced designers. Cover:
   - Generation pipeline: seeded RNG → pair placement (Manhattan distance ≥ 3, corner avoidance) → L-shaped routing → iterative blocker insertion (scored by proximity to paths) → solution count by DFS with memoization → density validation.
   - Candidate scoring (`scoreCandidateWithLearning`): extracts features (board, pairs, blockers, moves, solutions) + mechanic signals (freeCellsPerPair, blockerDensity, blockerClusterRatio, blockerSpread, pathCoverage).
     Penalties for rejected-pattern similarity, path crossing, excess free space, insufficient blockers.
     Rewards for good blocker distribution, good flow, good coverage.
     Learning adjustments: approved-level pull (distance × -2.2), rejected-level push (distance × 1.6), approved-global pull (× -0.9), rejected-global push (× 0.55), corrected pull (× -1.25).
   - Learning-driven adjustments (`learningDrivenGenerationAdjustments`): computes blockerBias, pairBias, boardDelta, desiredMovesFloor, desiredSolutionCap, maxFreeCellsPerPair, desiredPathCoverage from approved/rejected/corrected feature means and tag frequencies.
   - Reference-driven generation (`generateReferenceDrivenCandidates`): takes a base level + adjustments (pairs: less/same/more, blockers: less/same/more, board: smaller/same/bigger). Generates candidates from nearby level numbers + mutations. Ranks by similarity to base, learning bias, intent penalty. Returns top N.
   - Persistence: `state.learning` → localStorage + `.local/toolkit_state/learning_state.json` → optional SQLite + browser bundle export. Canonical source should be the repo file (hardening pending).
   - Composite difficulty formula: `D = w1×grid_area + w2×pair_count + w3×avg_distance + w4×effective_blocker_score + w5×(1/solution_count)`, all normalized [0,1], weights hand-tuned (not yet learned).
   - Blocker area rule: `area_difficulty = K^0.7` (candidate formula), intent is diminishing returns for clustered blockers.
   - Key functions in `app.js`: `generateLevel`, `generateLevelRaw`, `generateReferenceDrivenCandidates`, `scoreCandidateWithLearning`, `learningDrivenGenerationAdjustments`, `chooseNodes`, `simplePath`, `countSolutions`, `extractFeatures`, `extractMechanicSignals`, `validateLevel`.

9. **Tooling and workflow** — Keep the current Section 8 content but make it briefer. Point to specialist docs for detail.

10. **Source of truth** — Keep the current layered model (canonical data, runtime state, export surfaces, knowledge surfaces).

11. **Open questions** — Keep current Section 11 + add: "What should levels 1 through 10 feel like in player terms? Is the curve linear, stepped, or S-shaped? Which levels teach, which reinforce, which surprise?"

**2. Create new `docs/LEVEL_DESIGN.md`**

This document does not exist yet. It should be the practical bible for anyone designing levels. Structure:

1. **The vocabulary** — pair, blocker, path, solution, density, golden path, [VERIFY] flag. With ASCII diagrams for each concept on a small board.

2. **Anatomy of a good level** — 3-4 real examples from the project's `levels/` folder. For each: the board layout, why it works (or doesn't), what the path interference looks like, what the blockers do. Use actual level JSON files.

3. **How to think about difficulty** — Not as a table of parameters, but as design decisions. "Want freedom? More solutions, fewer blockers. Want pressure? One solution, strategic blockers." Link to the five dimensions in the GDD.

4. **The three most common mistakes** — Based on real rejection data: (a) blockers without purpose (35% of rejections), (b) levels that are too easy (39%), (c) under-allocation of pairs for large boards (13%). For each: what it looks like, why it happens, how to fix it.

5. **The complete workflow** — From "I open the editor" to "my level is in an exported progression". Step by step with real UI references: Level Editor + Play tab → set board size → place pairs → place blockers → validate → playtest → save → Level Manager → drag to slot → export → sync to sheets.

6. **Working with procedural generation** — When to use it (exploring nearby alternatives, filling gaps), when not to (tutorial levels, signature moments). How to evaluate a candidate: check path interference, check blocker purpose, check solution count vs target density. What feedback to give: Keep/Discard with reason tags.

7. **Working with Live Ops Mixes** — What a mix is (recombined slots from original families), when to create one (event rotation, content expansion), the approval and materialization flow, how to verify the output bundle.

8. **The level checklist** — Is it solvable? Does the density match the slot? Do blockers have purpose? Does the screenshot read well? Are there [VERIFY] flags for anything uncertain?

READ FIRST before writing:

- `FEED_THE_BEAR_GDD.md` (the rewritten version)
- `PROCEDURAL_ML_DESIGN.md`
- `docs/BUNDLES_AND_MIXES.md`
- `docs/LEVEL_JSON_SCHEMA.md`
- `docs/WORKFLOWS.md`
- [Notion — Level Design](https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728)
- 3-4 actual level JSON files from `levels/` for real examples

**3. Regenerate Kingfluence / Confluence page**

After the GDD and Level Design doc are done:

1. Update `scripts/generate_full_confluence_page.py` to include the new content (especially the experiential game description, the mix system, and the procedural learning summary).
2. Regenerate: `python3 scripts/generate_full_confluence_page.py`
3. Verify the output at `output/confluence/feed_the_bear_full_page_confluence_safe.html`
4. The Kingfluence page should reflect the same design-first tone as the rewritten GDD.

### Rules for all three deliverables

- Write in English.
- Use relative paths only — never absolute macOS paths.
- Follow markdown lint rules: blank line before every list, blank line after every heading, blank line around code fences, no double blank lines.
- Use canonical terms: `Original Progressions` (not bare "progressions"), `Live Ops Mixes` (not "mixes" or "remixes"), `Tutorial` (not "intro level"), `toolkit` (for the editor).
- Mark uncertain information with `[VERIFY: description]` flags and collect them in a "Pending [VERIFY] Flags" section at the end.
- Cross-reference related docs at the end of each document.
- Keep the GDD under 400 lines. Keep the Level Design doc under 350 lines.
- Do NOT create new top-level overview documents beyond what is specified here.
- After writing, run `npx markdownlint-cli "FEED_THE_BEAR_GDD.md" "docs/LEVEL_DESIGN.md"` and fix any errors before marking complete.

### Execution order

1. `FEED_THE_BEAR_GDD.md` rewritten in place
2. Create `docs/LEVEL_DESIGN.md`
3. Update `docs/README.md` to include Level Design doc in the index
4. Regenerate Kingfluence
5. Run markdown lint on all changed files
6. Log the work in `memoria.md`

---

## API Guardian Note

If the task touches Google Sheets, Bridge, browser persistence, or sync/publish reliability, also follow:

- `docs/agents/API_GUARDIAN.md`
- `docs/agents/CONTENT_RECOVERY.md`
- `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`

That file is the canonical prompt for the project-side API/persistence guardian role.

## Codex reply

- `docs/PROJECT_MASTER_HANDOFF.md` is restored as the canonical Claude/Codex coordination file.
- Use it for documentation-related questions, layout doubts, and source-of-truth clarifications.
- Use `FEED_THE_BEAR_GDD.md` as the single high-level project doc and extend it in place.
- For API/sync/persistence work, pair it with `docs/agents/API_GUARDIAN.md`.
- For lost state, browser-only content, or recovery work, pair it with `docs/agents/CONTENT_RECOVERY.md`.
- For procedural quality, discard reasoning, and generation critique, pair it with `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`.

## Save Point — Codex Session 2026-03-27 (Confluence skill consolidation)

### What was done

- Reviewed the K15t article about beautiful Confluence pages and extracted the durable rules that should survive beyond one page or one publishing pass.
- Promoted `.codex/skills/confluence-documentation/SKILL.md` into the canonical Confluence skill instead of letting three near-duplicate skills drift independently.
- Added the shared editorial system there:
  - purpose above the fold
  - short summary near the top
  - meaningful TOC behavior
  - strict H2/H3 hierarchy in the page body
  - restrained use of columns, formatting, and macros
  - visuals as explanation anchors, not decoration
  - accessibility rule: do not rely on color alone
- Refactored `.agents/skills/kingfluence-publish/SKILL.md` so it now depends on the shared Confluence editorial rules and only keeps the Kingfluence-specific delta:
  - Chrome CDP session setup
  - cookie extraction
  - storage-format publishing
  - tested macro compatibility
- Refactored `.codex/skills/confluence-report-publisher/SKILL.md` so it now depends on the same shared Confluence editorial rules and only keeps the reporting-specific delta:
  - generated block flow
  - reporting asset rules
  - sync verification
- Net result: there are still three triggers, but only one canonical editorial source. This reduces maintenance cost and prevents rule drift.

### Files changed

- `.codex/skills/confluence-documentation/SKILL.md`
- `.agents/skills/kingfluence-publish/SKILL.md`
- `.codex/skills/confluence-report-publisher/SKILL.md`

### Why this matters

- Before this pass, the Confluence-related skills were converging on the same job but copying rules in parallel.
- After this pass, `confluence-documentation` is the base skill and the other two are wrappers with a narrow operational responsibility.
- This makes future updates safer: if the page-design standard changes, update one place first.

### Thread to pull for the next AI

If another AI wants to implement this skill properly, do this next:

1. Decide whether to keep the current three-name trigger model or rename the family into a clearer set such as `confluence-core`, `confluence-kingfluence`, and `confluence-reporting`.
2. Create one example artifact that proves the system works end to end:
   - one markdown draft
   - one Confluence-oriented structure plan
   - one Kingfluence storage-format example
3. Add a compact macro compatibility table to the shared skill so future agents do not guess which macros are safe in normal Confluence versus Kingfluence.
4. Add a reusable page skeleton for common page types:
   - documentation page
   - report page
   - landing/overview page
5. Add a validation checklist that another AI can execute after publishing:
   - title clarity
   - top-of-page summary
   - TOC usefulness
   - heading hierarchy
   - image context / alt text
   - no over-wide prose blocks
6. If this skill family is moved to another environment, preserve the same architecture:
   - one canonical editorial skill
   - one transport-specific publisher skill
   - one generated-report specialization
7. Update the shared skill first whenever editorial guidance changes. Do not re-copy the same rules into specializations.

### Implementation note for future agents

The important design decision was not "merge everything into one huge skill". The useful structure is:

- one source of truth for editorial rules
- small specialist wrappers for delivery mechanics

That pattern should be preserved if this is ported to Claude, GPT, Gemini, or another Codex environment.

## Save Point — Codex Session 2026-03-27 (Confluence templates, manuals, KB, PDF outputs)

### What was done

- Reviewed four more K15t sources and translated them into reusable skill rules instead of keeping them as one-off references:
  - template best practices in Confluence
  - user manuals from Confluence
  - self-service knowledge bases from Confluence
  - PDF template library / export-oriented documentation
- Extended `.codex/skills/confluence-documentation/SKILL.md` so the shared Confluence skill now covers:
  - when to use or avoid custom templates
  - how to choose global versus space template scope
  - metadata, labels, placeholder text, and template variables
  - internal docs versus knowledge base versus user manual modes
  - single-source publishing across web, PDF, Word, HTML, and embedded help
  - output-aware authoring rules so the source page survives export cleanly
- Added the practical decision point to the workflow: identify the page type and output targets before editing structure.
- Added heuristics so future agents know when to stop polishing a page and instead build a template, improve taxonomy, or stabilize the source structure for export.

### Why this matters

- The previous pass made `confluence-documentation` the canonical editorial source.
- This pass turns that same skill into a broader documentation-product skill, not just a page beautification skill.
- That means another AI can now use one canonical Confluence skill for:
  - single pages
  - repeatable templates
  - knowledge bases
  - user manuals
  - exportable PDF/Word content

### Files changed in this pass

- `.codex/skills/confluence-documentation/SKILL.md`

### Thread to pull for the next AI

If another AI wants to continue this properly, the next useful steps are:

1. Create three concrete starter skeletons inside the Confluence skill or alongside it:
   - template skeleton
   - knowledge-base article skeleton
   - user-manual chapter skeleton
2. Add a small compatibility matrix for authoring features versus outputs:
   - Confluence page only
   - Kingfluence / storage-format page
   - PDF export
   - Word export
   - HTML / site publishing
3. Add example metadata schemes:
   - template metadata
   - knowledge-base article metadata
   - manual / release / audience metadata
4. Add one reusable taxonomy pattern for a self-service knowledge base:
   - category
   - article type
   - audience
   - version
5. Add one reusable page-tree pattern for manuals:
   - overview
   - task guides
   - reference
   - troubleshooting
   - release/version notes
6. If export quality becomes a real workflow requirement, create a specialized wrapper skill for output design instead of bloating the core Confluence skill.

### Implementation note for future agents

The main design move here was to treat Confluence as a content system, not only as a page editor.

Keep these layers distinct:

- core editorial and structural rules in `confluence-documentation`
- transport/publishing mechanics in specialist wrappers
- output-specific or reporting-specific logic only when there is a real workflow behind it

## Save Point — Codex Session 2026-03-27 (Confluence lifecycle, use cases, onboarding)

### What was done

- Reviewed the broader K15t learning hubs:
  - Confluence Cloud Best Practices
  - The Documentation Guide
  - Confluence Use Cases
  - Confluence Tutorials
- Also reviewed the SSRN paper page linked from the earlier K15t article. The useful takeaway for the skill was not the legal-teaching domain itself, but the broader reminder that visual learning matters and that content should support scanning before deep reading.
- Extended `.codex/skills/confluence-documentation/SKILL.md` again so it now captures three layers that were under-specified before:
  - documentation lifecycle and governance
  - contributor onboarding and adoption
  - use-case framing for page type selection
- Added rules so future agents explicitly distinguish between:
  - structure problems
  - findability problems
  - permissions problems
  - onboarding problems
  - page-design problems
- Added guidance that a Confluence space should be treated as a governed content system, not a pile of pages.

### Why this matters

- Earlier passes focused on page quality, templates, manuals, knowledge bases, and output reuse.
- This pass adds the operating model around that content:
  - who writes
  - how they learn the system
  - how pages stay current
  - how page type should follow user intent
- Result: `confluence-documentation` is now closer to a practical documentation-operations skill than just a page-formatting skill.

### Files changed in this pass

- `.codex/skills/confluence-documentation/SKILL.md`

### Thread to pull for the next AI

If another AI wants to keep improving this family of skills, the next strong moves are:

1. Add a space-audit checklist:
   - naming
   - hierarchy
   - labels
   - ownership
   - stale pages
   - permissions
   - template coverage
2. Add an onboarding mini-playbook for new contributors:
   - first 30 minutes
   - where to draft
   - which templates to use
   - what not to publish
3. Add a page-type decision tree:
   - tutorial
   - reference
   - overview
   - knowledge-base article
   - manual chapter
   - report
4. Add a maintenance model:
   - owner
   - review frequency
   - archive rule
   - update trigger
5. If future work needs stronger evidence for scanning behavior, replace the current generic “visual learning” heuristic with tighter HCI or readability references and fold them into the heuristics section.

### Implementation note for future agents

The skill should keep moving in this direction:

- page quality
- content-system quality
- authoring-system quality

Do not stop at “make this page nicer.” The more durable job is to make the documentation environment produce good pages repeatedly.

## Save Point — Codex Session 2026-03-27 (Board-size cleanup + TODO execution)

### Scope requested

- Remove levels bigger than 7x7 / 7x8.
- Execute the pending TODO list as far as possible from CLI automation.

### What was done

1. **Oversize level cleanup completed**
   - Rule applied: remove any level with `gridSize.cols > 7` or `gridSize.rows > 8`.
   - Removed files: **128 JSON levels** under `levels/`.
   - Audit report generated: `docs/REMOVED_OVERSIZE_LEVELS_2026-03-27.md`.

2. **Validation pass executed**
   - Command: `node scripts/validate-levels.mjs`
   - Result: **165 valid / 2 invalid**
   - Remaining invalid files reported by validator:
     - `levels/procedural_1_slot_1.json` (empty pairs)
     - `levels/progression1_level7.json` (corrupted null grid + empty pairs)

3. **Sheets sync attempted (TODO step)**
   - Command: `npm run sync:sheets:local`
   - Status: **blocked**
   - Blocker: Google token revoked/expired (`Token has been expired or revoked`).

4. **Kingfluence source regeneration completed**
   - Command: `npm run confluence:generate`
   - Result: regenerated `output/confluence/feed_the_bear_full_page_confluence_safe.html`.

5. **DFS TODO verification**
   - The target-directed DFS ordering is already present in:
     - `countSolutions`
     - `findOneSolutionPaths`
     - `findSampleSolutions`
     - `hasFullCoverSolution`
   - No extra patch required in this session for that specific item.

### TODO status after this run

- [x] Remove >7x7 / 7x8 levels.
- [ ] Manual benchmark endpoint tweaks in editor (requires visual side-by-side editing).
- [ ] Re-analyze manually tweaked benchmark levels (pending previous item).
- [x] DFS solver follow-up check (already implemented in all 4 target functions).
- [ ] Sheets live sync retry after OAuth token refresh.
- [ ] Kingfluence live publish after final benchmark decisions and active Chrome/Okta session.

### Next concrete actions

1. Refresh Google OAuth token used by `google_sheets_api.mjs`.
2. Re-run `npm run sync:sheets:local`.
3. Optionally repair/delete the two validator-failing files before next export.
4. If you want benchmark comparisons to stay strict, remove remaining benchmark entries over 7x8 from any manifests/screenshots references too.

### Recovery follow-up (same session)

- Ran: `node scripts/auto-recover-corrupted-levels.mjs --auto`
- Result: scanned 167 files, found 2 corrupted, recovered 0.
- Blocker: no backup found for `levels/procedural_1_slot_1.json` and `levels/progression1_level7.json`.

### Final cleanup follow-up (same session)

- Deleted unrecoverable corrupted files:
  - `levels/procedural_1_slot_1.json`
  - `levels/progression1_level7.json`
- Re-ran validator: `node scripts/validate-levels.mjs`
- Final status: **All level files valid** (`Valid: 215`, `Invalid: 0`).

---

## ROUTE-005 — Kingfluence: Replace localhost links with inline tables

- Status: pending
- Owner: codex
- Type: documentation / api_publish
- Priority: urgent
- Source: Cowork session 2026-04-01

### Goal

The live Kingfluence page (`pageId 990479168`) has a "Level Reconstructions" expand macro section that contains two `http://127.0.0.1:8080/` links. Replace them with the inline data tables already built by Claude.

### Script

`scripts/update_kingfluence_recon.py` already exists (created Mar 27). Run it:

```bash
export CONFLUENCE_TOKEN="<token from kingfluence.com/plugins/servlet/atl.account/tokens>"
python3 scripts/update_kingfluence_recon.py
```

No browser needed — pure REST API PUT.

### Content to inject

All 5 inline tables are in the script: reconstruction summary (29 levels), editor images (7), timestamped variants (6), Flow Free benchmark (16 levels + 7 patterns). The script is idempotent — safe to re-run.

### If regex fails

Run the diagnostic in the script comments to list all expand macro titles in the live page body, then update `EXPAND_TITLE` to match exactly.

---

## Save Point — Cowork Session 2026-04-01 (folder audit by Claude)

### What was found reading the folder

1. **`docs/PROCEDURAL_SCORING_FLOW.mmd` + `.png`** (new, Apr 1). Mermaid diagram of the full candidate generation and scoring loop. Documents: load difficulty profile → place endpoints → scaffold routes → iterative blocker insertion → solvability recheck → score all candidates (penalties + rewards + historical comparison) → designer review → store learning data → loop. Add to `docs/README.md` index and reference from `docs/PROCEDURAL_ML_DESIGN.md`.

2. **`scripts/replay_procedural_learning_scorer.mjs`** (updated Apr 1, 62 KB). Replays the learning scorer against historical data — useful for diagnosing candidate ranking. Related to new section 4.3 in `PROCEDURAL_ML_DESIGN.md` (composite difficulty score formula). Add a `npm run` script alias for it in `package.json` so Codex/Copilot can invoke it by name.

3. **`level_toolkit_web/progression_analysis_compare.html`** (new, Mar 31, 40 KB). Progression-level comparison page. Not yet referenced in docs. Add to `docs/TOOLKIT_ARCHITECTURE.md` and `docs/NPM_SCRIPTS_REFERENCE.md`.

4. **`level_toolkit_web/compare_all.html`** (new, Mar 27, 18 KB) + **`compare_manifest.json`** (102 KB). Full cross-level comparison view using a pre-built manifest. Not yet documented. Add reference in `docs/TOOLKIT_ARCHITECTURE.md`.

5. **`docs/BENCHMARK_COMPARE_REGISTRY.md`** (new, Mar 27). Registry of benchmark comparison runs. Missing from `docs/README.md` index.

6. **`docs/ADVANCED_TROUBLESHOOTING.md`** (new, Mar 31, 10 KB). Advanced troubleshooting guide. Missing from `docs/README.md` index.

7. **`docs/NOTION_API_REFERENCE.md`** (new, Mar 31, 17 KB). Notion API reference. Missing from `docs/README.md` index.

8. **`docs/PROCEDURAL_ML_DESIGN.md` section 4.3** (updated Apr 1). New composite difficulty formula:
   `D = w1×grid_area_norm + w2×pair_count_norm + w3×avg_pair_distance_norm + w4×effective_blocker_score_norm + w5×(1/solution_count_norm)`. Weights not yet learned. `effective_blocker_score` = sum of `area_difficulty` across connected blocker groups (`1 + log2(K)` or `K^0.7` — pending validation).

9. **`docs/REMOVED_OVERSIZE_LEVELS_2026-03-27.md`** — exists and documents the 128-level removal pass. Already in `docs/README.md`.

10. **Spreadsheet sync confirmed 2026-03-31** via `npm run sync:sheets:local`. Sheets `README`, `All Progressions`, `Level Manager state`, `Level Catalog`, `Procedural learning`, `Mix Planner`, `Level Renames`, `Curve Builder` are current.

11. **`level_toolkit_web/app.js` updated Apr 1** (492 KB). Most recent toolkit file. Apr 1 changes include scorer improvements and replay integration. Per Mar 27 save point, DFS fix confirmed applied to all 4 `enumeratePairPaths` instances — no further DFS patch needed.

12. **`scripts/update_kingfluence_recon.py` already existed** (Mar 27). The ROUTE-005 above points to this existing file. No new file needed.

### Immediate actions for Codex/Copilot

- **`docs/README.md`**: add `BENCHMARK_COMPARE_REGISTRY.md`, `ADVANCED_TROUBLESHOOTING.md`, `NOTION_API_REFERENCE.md`, `PROCEDURAL_SCORING_FLOW.mmd`.
- **`docs/TOOLKIT_ARCHITECTURE.md`**: add `compare_all.html` and `progression_analysis_compare.html` with descriptions.
- **`package.json`**: add a `replay:scorer` or similar alias for `scripts/replay_procedural_learning_scorer.mjs`.
- **ROUTE-005**: run `scripts/update_kingfluence_recon.py` with a valid `CONFLUENCE_TOKEN` to remove localhost links from live Kingfluence page.
- **`docs/PROCEDURAL_ML_DESIGN.md`**: add a reference to `docs/PROCEDURAL_SCORING_FLOW.png` in section 3.3 or 5.8 so agents know the visual diagram exists.

---

## ROUTE-006 — Doc patch + Kingfluence inline tables (Codex/Copilot)

- Status: pending
- Owner: codex
- Type: documentation + api_publish
- Priority: high
- Source: Cowork 2026-04-01

---

### Part A — Doc fixes (no auth needed, run from repo root)

Three files need edits. All changes are purely additive — no deletions.

#### 1. `docs/README.md` — already done by Claude (2026-04-01)

Entries added to the Specialist Design And Technical Docs table:

- `docs/PROCEDURAL_SCORING_FLOW.mmd` — Mermaid source + rendered PNG of the full generation/scoring loop
- `docs/FLOW_FREE_BENCHMARK_ANALYSIS.md` — 16 Flow Free levels, 7 pattern tags
- `docs/BENCHMARK_COMPARE_REGISTRY.md` — registry of benchmark comparison runs

**Status: done. No further action needed on README.**

#### 2. `docs/TOOLKIT_ARCHITECTURE.md` — already done by Claude (2026-04-01)

New section "Standalone Comparison Pages" added before the Pending VERIFY Flags section. Documents:

- `benchmark_compare.html` — original screenshot vs reconstructed JSON
- `reconstruction_compare.html` — editor/timestamped screenshots vs JSONs
- `compare_all.html` — full cross-level view via pre-built manifest
- `progression_analysis_compare.html` — per-progression difficulty/coverage stats

**Status: done. No further action needed on TOOLKIT_ARCHITECTURE.**

#### 3. `docs/PROCEDURAL_ML_DESIGN.md` — already done by Claude (2026-04-01)

Visual reference callout added to section 3.3 pointing to `docs/PROCEDURAL_SCORING_FLOW.png` and `.mmd`.

**Status: done. No further action needed on PROCEDURAL_ML_DESIGN.**

---

### Part B — Kingfluence inline tables (needs CONFLUENCE_TOKEN)

**Goal:** replace two `http://127.0.0.1:8080/` links in the "Level Reconstructions" expand macro on page `990479168` with inline tables.

**Script:** `scripts/update_kingfluence_recon.py` (already exists, created 2026-03-27)

**Run:**

```bash
# Option 1 — PAT (preferred)
# Get token at: https://kingfluence.com/plugins/servlet/atl.account/tokens
export CONFLUENCE_TOKEN="<paste token here>"
python3 scripts/update_kingfluence_recon.py

# Option 2 — user + password
export CONFLUENCE_USER="victoria.serrano@king.com"
export CONFLUENCE_PASS="<password>"
python3 scripts/update_kingfluence_recon.py

# Option 3 — interactive (script prompts for token if no env vars set)
python3 scripts/update_kingfluence_recon.py
```

**What the script does:**
1. GET current page body from Kingfluence REST API (no browser)
2. Finds expand macro titled "Level Reconstructions" by regex
3. Replaces `<ac:rich-text-body>` with 5 inline tables:
   - Reconstruction summary (29 levels across 4 categories)
   - Editor image reconstructions (7 levels, all 5×5)
   - Timestamped variant reconstructions (6 levels)
   - Flow Free benchmark (16 HARD levels with patterns)
   - Pattern glossary (7 patterns explained)
4. PUT back as next page version
5. Prints `SUCCESS. New version: X` on completion

**If the regex fails** (expand title mismatch in live page), run the diagnostic:

```bash
python3 - <<'EOF'
import os, requests
session = requests.Session()
session.headers.update({"Authorization": f"Bearer {os.environ['CONFLUENCE_TOKEN']}"})
r = session.get("https://kingfluence.com/rest/api/content/990479168",
                params={"expand": "body.storage"})
body = r.json()["body"]["storage"]["value"]
import re
for m in re.finditer(r'<ac:parameter[^>]*ac:name="title"[^>]*>(.*?)</ac:parameter>', body):
    print("EXPAND TITLE:", m.group(1))
EOF
```

Update `EXPAND_TITLE` in the script to match exactly.

**Blocker:** needs a valid Confluence PAT or session from victoria.serrano@king.com (Okta/King SSO). Codex cannot supply this — Vito must generate the token and either pass it as env var or let the script prompt interactively.

---

### Part C — Remaining open code work (from earlier save points)

These were flagged in previous sessions and are not yet confirmed done:

| Task | File | Status |
|---|---|---|
| Repair `progression_3_level3` (solved but INVALID, high interaction cost) | `levels/otherLevels/` | pending |
| Repair `progression_3_level7_v2` (INVALID, single blocker adds no structure) | `levels/otherLevels/` | pending |
| Tighten `progression_3_level10_v2` (valid but too open for its slot) | `levels/otherLevels/` | pending |
| Create 6 missing benchmark JSONs (10x12 and 12x12 boards) | `levels/benchmark_flow_free/` | pending |
| Manually tweak existing benchmark endpoint positions in editor | Level Editor UI | pending (requires Vito) |
| Retry `npm run sync:sheets:local` after OAuth token refresh | — | pending |


---

## ROUTE-007 — Kingfluence Page Template Application (2026-04-02)

**Status:** DONE — both pages updated via REST API from the browser session.

### What was applied

The agreed visual template (dark header panel + Quick Facts sidebar + 2-column layout + status badge row) was applied to both Kingfluence pages in the same browser session, using the AJS token + authenticated fetch() pattern that worked for the localhost fix in the previous session.

| Page | pageId | Version before | Version after | Changes |
|---|---|---|---|---|
| Level design career - the final guide - 2026 | 961710850 | 15 | 17 | Header panel + Quick Facts sidebar + 2-col layout added |
| Feed the bear - level design | 990479168 | 69 | 70 | Header wrapped in consistent panel; layout/expands/badges already in place |

### Career page (961710850) — new structure

Was: flat text wall, 0 panels/layouts/expands, 1 status macro.

Now (v17):
- **Panel header**: "Level Design Career Guide" with dark blue border + light blue bg
- **Status badges**: Active (Green) · Level Design (Blue) · King (Grey) · L8 to L13 (Blue)
- **2-column layout** (`two_left_sidebar`): 30% Quick Facts sidebar + 70% main content
- **Quick Facts sidebar**: Company, Discipline, Levels, Paths, Owner, Status (Active badge), TOC macro
- **Main column**: all original content preserved — AUI horizontal nav tabs for L8–L13, PDP sections, Talent Month, SODA framework, Quick Links

### FtB page (990479168) — what was already there + what changed

Already had (from previous sessions): H1 "Feed the Bear — Level Design", status badges (Active/Level Design/Minigame), 2-col layout with Quick Facts sidebar, 77 status badges for level difficulty, 156 expand sections for level details, 5 panel blocks.

v70 change: the H1 + subtitle + badge row before the layout was wrapped in a matching panel block (same dark blue border/light blue bg, title "Feed the Bear — Level Design") for visual consistency with the career page header treatment.

### Why no gradient

Confluence Server at kingfluence.com strips `style` attributes from raw `<div>` elements. The gradient header approach from `ftb_confluence_restructure_code.html` (which used `div style="background: linear-gradient(...)"`) does not survive the content sanitiser. The `panel` macro with `bgColor` parameter is the correct Confluence-native substitute.

### For Codex

No code changes needed from this session. Both pages are live. If the template needs iteration (e.g. adding expand wrappers around the 6 H2 career ladder sections, or updating "Last updated" dates), the same REST API PUT pattern applies:
1. GET `/rest/api/content/{pageId}?expand=body.storage,version` → read current body + version
2. Build new body string in JS
3. PUT `/rest/api/content/{pageId}` with `{ version: { number: currentVer + 1 }, body: { storage: { value: newBody, representation: 'storage' } } }`
4. Include `X-Atlassian-Token` header (AJS token from `<meta name="ajs-atl-token">`)
5. Include `title` field in payload (required — omitting it causes 400)

### 2026-04-02 follow-up

Codex added `scripts/update_kingfluence_page_templates.mjs` to automate the next template pass for both pages:
- Career page `961710850`: add the L8-L13 badge row in the header panel and wrap the 6 main H2 sections inside expand macros within the second layout cell.
- FtB page `990479168`: optional header date refresh from March 2026 to April 2026.

The script supports:
- `CONFLUENCE_TOKEN` bearer auth when available
- browser-session publishing through Chrome CDP on `http://127.0.0.1:9222`
- local snapshots of the fetched page bodies before each PUT
- `--self-test` to verify the career-page transforms without touching Kingfluence

Live publish status:
- Published successfully on 2026-04-02 using `CONFLUENCE_TOKEN`
- Career page `961710850`: version `20` → `21`
- FtB page `990479168`: already had the April 2026 header date, so no PUT was needed during this run; current version observed was `73`

Verification from the successful run:
- Career page checks passed: header badges present, overview expand present, career-path expand present
- FtB page checks passed: April date present, header panel present

Second visual pass on 2026-04-02:
- Career page `961710850`: version `22` → `23`
- Added icon titles to the main header and Quick Facts panel
- Added a second colored badge row for L8-L13 plus IC/Leadership path badges
- Added a footer note stating that the page was updated with a Codex script and that Victoria Serrano should be contacted for future changes
- FtB page `990479168`: checked again during the same run and left unchanged because the April 2026 date was already present

Third visual pass on 2026-04-02:
- Career page `961710850`: version `23` → `24`
- Added visible emoji prefixes directly into the main H2 section headings so the icons survive Confluence rendering
- Added colored status-badge rows directly under the main sections to improve visual hierarchy without relying on low-contrast text styling
- FtB page `990479168`: checked again and left unchanged

FtB progression expansion pass on 2026-04-02:
- Updated the canonical sources so FtB now documents `Progression A` through `Progression F`, not only `A, B, C`
- `scripts/generate_full_confluence_page.py` now reads the six progression packages from `output/download_ready/*`, maps `D/E/F` to their latest difficulty-curve PNGs, and emits XML-safe `<details open="open">` blocks for REST publishing
- `FEED_THE_BEAR_GDD.md` now describes the authored family set as `A-F` and clarifies that `D/E/F` follow the same editorial slot logic
- Regenerated `output/confluence/feed_the_bear_full_page_confluence_safe.html` and published FtB page `990479168` from version `74` to `75` via REST with `CONFLUENCE_TOKEN`
- Live verification after publish: the page body contains `Progression D`, `Progression E`, `Progression F`, and the updated Level Manager wording `six 11-slot progression curves (A, B, C, D, E, F)`

FtB layout flattening pass on 2026-04-02:
- Refactored the two long reference groups so they no longer nest full `<section>` blocks inside other `<section>` blocks
- `Level Design Reference` and `Operational Reference` now keep the outer collapsible group, but the inner content is emitted as flat subcards with `h3` headings instead of nested section wrappers
- `Tooling Systems` and `Feedback Summary` now also render in embedded mode inside the operational group instead of entering as full standalone sections
- Regenerated the canonical HTML and published FtB page `990479168` from version `75` to `76`
- Practical result: the page is easier to edit and text spacing is more stable because the reference groups now have a flatter hierarchy; note that Kingfluence still sanitizes some inner anchor/id attributes on publish

FtB macro pass on 2026-04-02:
- Replaced the long reference-group internals with native Confluence storage macros instead of relying on nested HTML-only collapsibles
- `scripts/generate_full_confluence_page.py` now emits `expand` macros for the inner FtB reference docs plus `tip`, `info`, and `warning` callouts for the intro guidance blocks
- Regenerated `output/confluence/feed_the_bear_full_page_confluence_safe.html` and published FtB page `990479168` from version `76` to `77`
- Live verification after publish: version `77` contains `15` `expand` macros plus the expected `tip`, `info`, and `warning` macros, and both `Level Design Reference` and `Operational Reference` are present in the body
- Practical result: those sections are now much more stable to edit inside Kingfluence because the collapsible structure is native to Confluence rather than nested custom HTML

FtB information-architecture pass on 2026-04-02:
- Added `scripts/publish_ftb_child_pages.py` to create or update FtB child pages, write a local manifest of page IDs/URLs, regenerate the parent page, and republish the hub in one pass
- Created three specialized child pages under FtB parent `990479168`: `Feed the Bear - Feedback and Playtest` (`990484652`), `Feed the Bear - Level Design Reference` (`990484653`), and `Feed the Bear - Tooling and Workflow` (`990484654`)
- Added `output/confluence/ftb_child_pages_manifest.json` as the canonical local map between the hub and the child pages, then taught `scripts/generate_full_confluence_page.py` to surface those links in a new `Specialized Pages` section
- Regenerated `output/confluence/feed_the_bear_full_page_confluence_safe.html` and published FtB page `990479168` from version `77` to `78`
- Live verification after publish: parent version `78` contains the new `Specialized Pages` section with all three child-page links, and each child page contains `expand` macros plus a backlink to the FtB hub

Cross-model portable prompt pack on 2026-04-02:
- Added `docs/agents/CROSS_MODEL_PORTABLE_CORE.md` as the provider-neutral project core for assistants that need the same Feed the Bear context in multiple environments
- Added thin wrappers for `Codex`, `GitHub Copilot`, and `Gemini` at `docs/agents/CODEX_PORTABLE_WRAPPER.md`, `docs/agents/COPILOT_PORTABLE_WRAPPER.md`, and `docs/agents/GEMINI_PORTABLE_WRAPPER.md`
- Updated `docs/README.md` and `docs/AGENT_CHEATSHEET.md` so the portability layer is indexed as a first-class coordination surface instead of an ad hoc prompt copy
- Practical result: future Anthropic/GitHub/Google agent ideas can now be mapped onto one shared Feed the Bear core prompt without duplicating project rules per provider

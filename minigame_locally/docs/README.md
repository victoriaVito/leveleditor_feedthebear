# Documentation Index

This file is the canonical index of the project's documentation set. It lists the active docs, the supporting change logs, the coordination prompts, and the small number of historical references that still matter.

For a single resumable project context across chat threads, start with `docs/PROJECT_MASTER_HANDOFF.md`.

## External Design Source

- [Notion — Level Design](https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728): Internal design reference with the project's north star ("Lo logré yo"), quality layers (validation → playtest → design quality), difficulty model, progression decisions, and procedural generation philosophy. This page is the authoritative voice for design intent.

## Core Project Docs

| File | Purpose |
|---|---|
| `docs/README.md` | This index of the documentation system and the current housekeeping checklist. |
| `FEED_THE_BEAR_GDD.md` | Canonical high-level game design and source-of-truth model for Original Progressions, Live Ops Mixes, tooling layers, and workflow principles. |
| `docs/LEVEL_DESIGN.md` | Canonical practical level-design guide with vocabulary, real board examples, difficulty heuristics, common mistakes, workflow steps, and review checklist. |
| `docs/TOOLKIT_ARCHITECTURE.md` | Architecture map of the monolithic web toolkit, including module boundaries, state objects, and server integration points. |
| `docs/SERVER_API_REFERENCE.md` | HTTP reference for `server.mjs`, including static serving, endpoints, OAuth handling, and filesystem side effects. |
| `docs/LEVEL_JSON_SCHEMA.md` | Canonical level JSON field reference and draft-07 schema for checked-in level files. |
| `docs/PLAYTEST_SYSTEM.md` | Playtest capture, session snapshot, flattened dataset, queue artifact, learning-loop documentation, and the VitoBot synthetic-player workflow. |
| `docs/SCREENSHOT_PIPELINE.md` | Screenshot generation, storage, naming, spreadsheet reuse, and Kingfluence consumption path. |
| `docs/IMAGE_RECONSTRUCTION_TRACKER.md` | Canonical tracker for image-to-level reconstruction status, local source screenshot audit, and chat-image blockers. |
| `docs/WORKFLOWS.md` | Step-by-step operational workflows for editing, syncing, procedural review, publishing, renames, and mix materialization. |
| `docs/BUNDLES_AND_MIXES.md` | Bundle structure, manager-state layer, Mix Planner materialization flow, and bundle lifecycle. |
| `docs/SPREADSHEET_CONTROL_PANEL.md` | Canonical architecture and phased rollout plan for the Google Sheets Apps Script control panel and sidebar. |
| `docs/CURVE_BUILDER.md` | Curve Builder spreadsheet tab: visual difficulty curve design, random fill, and materialization into real progression bundles. |
| `docs/COMMUNICATION_ROUTER.md` | Canonical design for the `docs/PROJECT_MASTER_HANDOFF.md`-first coordination router, task-card format, routing pipeline, and generated queue snapshots. |
| `docs/NOTION_API_REFERENCE.md` | Canonical agent-facing reference for Notion REST API auth, capabilities, object model, endpoint choices, limits, and practical write/query workflows. |

## Specialist Design And Technical Docs

| File | Purpose |
|---|---|
| `docs/PROCEDURAL_ML_DESIGN.md` | Canonical procedural generation, learning, and ML-readiness document. |
| `docs/PROCEDURAL_SCORING_FLOW.mmd` | Mermaid source for the procedural generation + scoring loop diagram. Rendered PNG at `docs/PROCEDURAL_SCORING_FLOW.png`. |
| `docs/FLOW_FREE_BENCHMARK_ANALYSIS.md` | Analysis of 16 Flow Free levels used as difficulty and design benchmarks. 7 pattern tags extracted and applied to the generator. |
| `docs/BENCHMARK_COMPARE_REGISTRY.md` | Registry of benchmark comparison runs, linking level IDs to screenshot sources and reconstruction status. |
| `docs/FISH_COLORS_SYSTEM.md` | Canonical 14-color fish palette and visual identity rules. |
| `docs/PARALLEL_APIS_README.md` | Google Sheets, Google Drive, and parallel AI pipeline reference. |
| `docs/NPM_SCRIPTS_REFERENCE.md` | Canonical list of supported `npm` scripts and what each one does. |
| `docs/LEVEL_FORMAT_CONVERSION.md` | Old-to-new level format conversion reference and field migration examples. |
| `docs/LEVEL_RECOVERY_GUIDE.md` | Recovery and validation guide for damaged or inconsistent level files. |
| `docs/ADVANCED_TROUBLESHOOTING.md` | Debugging guide for port conflicts, webhook delivery, environment setup, and service management. |
| `python_preview_project/README.md` | Standalone Python preview renderer setup and usage for batch PNG generation. |
| `reports/toolkit_startup_integrity.md` | Point-in-time report about toolkit startup integrity checks and failures. |

## Coordination And Agent Docs

| File | Purpose |
|---|---|
| `AGENTS.md` | Repo-local workflow rules and project instructions for agents working in this codebase. |
| `docs/AGENT_CHEATSHEET.md` | Quick routing guide for which project prompt or skill to use for API, recovery, procedural, or documentation tasks. |
| `docs/PROJECT_MASTER_HANDOFF.md` | Unified cross-chat master handoff for documentation, coordination, blockers, and current project state. Load this first when resuming work. |
| `docs/agents/API_GUARDIAN.md` | Canonical agent prompt for Google Sheets, Bridge, auth, and sync reliability work. |
| `docs/agents/CONTENT_RECOVERY.md` | Canonical agent prompt for missing content, browser-only state, and recovery tasks. |
| `docs/agents/PROCEDURAL_DESIGN_CRITIC.md` | Canonical agent prompt for reviewing procedural level quality and discard reasons. |
| `docs/agents/SUPPLY_CHAIN_GUARDIAN.md` | Canonical agent prompt for dependency security, supply chain integrity, and package auditing. |
| `docs/agents/CROSS_MODEL_PORTABLE_CORE.md` | Provider-neutral core prompt for running the same Feed the Bear project context across Codex, Copilot, Gemini, or another coding assistant. |
| `docs/agents/CODEX_PORTABLE_WRAPPER.md` | Thin Codex-specific wrapper that reuses the cross-model portable core without forking project rules. |
| `docs/agents/COPILOT_PORTABLE_WRAPPER.md` | Thin GitHub Copilot-specific wrapper that reuses the cross-model portable core without forking project rules. |
| `docs/agents/GEMINI_PORTABLE_WRAPPER.md` | Thin Gemini-specific wrapper that reuses the cross-model portable core without forking project rules. |
| `archive/COPILOT_DOC_COMPLETION_2026-03-24.md` | Coordination prompt used for the 2026-03-24 documentation completion pass (archived). |

## Zapier Integration Docs

All Zapier-related documentation lives in `docs/zapier/`.

| File | Purpose |
|---|---|
| `docs/zapier/AGENTS_ZAPIER_INTEGRATION.md` | **Canonical reference.** Complete multi-agent automation architecture, capabilities matrix, 5 core flows, webhook specs, payloads, and environment config. |
| `docs/zapier/ZAPIER_QUICK_START.md` | Entry-point setup guide for 5 production scripts, automation flows, and testing procedures. |
| `docs/zapier/ZAPIER_ZAP_SETUP.md` | Step-by-step guide for creating the 5 Zaps in the Zapier UI. |
| `docs/zapier/ZAPIER_IMPLEMENTATION_SUMMARY.md` | Visual overview of the multi-agent implementation. |
| `docs/zapier/ZAPIER_DOCUMENTATION_INDEX.md` | Navigation hub and quick links across all Zapier docs. |
| `docs/zapier/ZAPIER_AUTOMATION_AUDIT.md` | Audit of active integrations and webhook status. |
| `docs/zapier/ZAPIER_CHEATSHEET.txt` | Quick-reference cheatsheet for common Zapier operations. |

## Change Tracking And Working Memory

| File | Purpose |
|---|---|
| `memoria.md` | Operational log of file creation and substantive file updates. |
| `changes/README.md` | Index of the maintainable topic-based change logs. |
| `changes/toolkit.md` | Toolkit-specific decisions and recent outcomes. |
| `changes/spreadsheet.md` | Spreadsheet workflow decisions and recent outcomes. |
| `changes/procedural.md` | Procedural generation and learning changes. |
| `changes/documentation.md` | Documentation-specific changes and consolidation outcomes. |
| `changes/coordination.md` | Coordination and cross-agent process changes. |
| `changes/archive/memoria_full_2026-03-21.md` | Archived full memory log from before the short-index model. |

## Historical And Archive Docs

| File | Purpose |
|---|---|
| `archive/HANDOFF_2026-03-24.md` | Summary of the 2026-03-24 documentation pass: 7 new docs, 8 gaps closed, 31 VERIFY flags. |
| `archive/progress.md` | Historical implementation narrative; useful as context, but not the canonical project design source of truth. |
| `archive/procedural_playground_removed_ui_20260318.md` | Archived note about removed procedural playground UI. |
| `archive/procedural_reference_generator_followup_20260318.md` | Archived procedural follow-up note from the March 18 cleanup cycle. |

## Housekeeping Proposals

These changes are proposed only. They are not executed by this pass.

- [x] ~~Move `PROJECT_AGENT_API_GUARDIAN.md` to `docs/agents/API_GUARDIAN.md`.~~ Done 2026-03-24. References updated in `AGENT_CHEATSHEET.md`, `docs/PROJECT_MASTER_HANDOFF.md`, and `docs/README.md`.
- [x] ~~Move `PROJECT_AGENT_CONTENT_RECOVERY.md` to `docs/agents/CONTENT_RECOVERY.md`.~~ Done 2026-03-24.
- [x] ~~Move `PROJECT_AGENT_PROCEDURAL_DESIGN_CRITIC.md` to `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`.~~ Done 2026-03-24.
- [x] ~~Move `progress.md` to `archive/progress.md`.~~ Done 2026-03-24. References in `docs/PROJECT_MASTER_HANDOFF.md` updated.
- [x] ~~Add `*.old-format` to `.gitignore`.~~ Done 2026-03-24.
- [x] ~~Add repo-wide `__pycache__/` to `.gitignore`.~~ Done 2026-03-24.

Already covered in `.gitignore`: `.env`, `credentials.json`, `.DS_Store`, `node_modules/`, `.local/`, `tmp/`, `output/`.

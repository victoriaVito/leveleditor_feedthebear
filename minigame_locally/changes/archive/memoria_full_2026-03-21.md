# Memoria

## 2026-03-12

- File: `AGENTS.md`
  - Action: `created`
  - Reason: Added repository workflow rules to keep a single canonical file per deliverable and avoid multiple versioned copies.
- File: `memoria.md`
  - Action: `created`
  - Reason: Added a persistent change log to register file creation and substantive updates.
- File: `codex-questions-mechanics-proposal.md`
  - Action: `created`
  - Reason: Added the mechanics-question handoff document, filled every `[RESPUESTA CODEX]` section from repository evidence, and appended the completion timestamp for Claude handoff.
- File: `scripts/generate_bear_confluence_source.py`
  - Action: `updated`
  - Reason: Reworked the Kingfluence source generator to produce a clearer recap hierarchy and a more polished branded HTML layout from the same canonical progression data.
- File: `output/confluence/bear_after_feedback_levels.md`
  - Action: `updated`
  - Reason: Regenerated the markdown recap with a stronger H1/H2/H3 structure and a cleaner summary-first outline for Kingfluence.
- File: `output/confluence/bear_after_feedback_levels.html`
  - Action: `updated`
  - Reason: Regenerated the HTML recap with new visual styling, summary cards, clearer section hierarchy, and improved scanability for the Kingfluence page.
- File: `output/confluence/bear_after_feedback_levels.json`
  - Action: `updated`
  - Reason: Refreshed the JSON payload to keep the page title metadata aligned with the regenerated Kingfluence recap outputs.
- File: `scripts/generate_bear_confluence_source.py`
  - Action: `updated`
  - Reason: Expanded the Kingfluence recap generator with a reusable Canva intro macro, explicit Version 1 / Version 2 framing, and executive recap sections for What changed, Current risks, Open decisions, and Next actions.
- File: `output/confluence/bear_after_feedback_levels.md`
  - Action: `updated`
  - Reason: Regenerated the recap markdown to include the reusable macro block, version framing placeholders, and executive summary structure ahead of the progression tables.
- File: `output/confluence/bear_after_feedback_levels.html`
  - Action: `updated`
  - Reason: Regenerated the HTML recap with the new macro section, version cards, executive recap cards, and matching visual styling for the updated content structure.
- File: `scripts/generate_bear_confluence_source.py`
  - Action: `updated`
  - Reason: Updated the Kingfluence recap generator to embed real screenshot images inside the screenshot table cells instead of showing only the PNG filenames.
- File: `output/confluence/bear_after_feedback_levels.md`
  - Action: `updated`
  - Reason: Regenerated the markdown recap so the screenshot column references rendered image tags instead of plain screenshot names.
- File: `output/confluence/bear_after_feedback_levels.html`
  - Action: `updated`
  - Reason: Regenerated the HTML recap so the screenshot column renders actual embedded images from `levels/screenshots/` with a fallback when a screenshot is missing.
- File: `scripts/generate_bear_confluence_source.py`
  - Action: `updated`
  - Reason: Tuned the screenshot-cell styling so embedded thumbnails sit more cleanly inside the table with smaller width, lighter padding, top alignment, and softer visual framing.
- File: `output/confluence/bear_after_feedback_levels.html`
  - Action: `updated`
  - Reason: Regenerated the HTML recap after tightening the screenshot thumbnail sizing and table-cell spacing for a cleaner visual fit inside each row.

## 2026-03-13

- File: `scripts/check_spreadsheet_env.sh`
  - Action: `created`
  - Reason: Added a reusable spreadsheet environment health check that verifies Python packages, workbook sync, and render tooling.
- File: `package.json`
  - Action: `updated`
  - Reason: Added an npm shortcut to run the spreadsheet environment health check.
- File: `scripts/bootstrap_google_sheets_local.sh`
  - Action: `created`
  - Reason: Added a local bootstrap helper to prepare Google Sheets OAuth paths and optionally copy the OAuth client JSON into the expected location.
- File: `scripts/check_google_sheets_env.sh`
  - Action: `created`
  - Reason: Added a Google Sheets environment check to validate local secrets setup and auth status before live sync.
- File: `.local/google_oauth_client.json`
  - Action: `restored`
  - Reason: Recovered a local Google OAuth client file from disk into the expected `.local/` path so spreadsheet auth can be repaired without recreating the whole setup from scratch.
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Improved Google Sheets token refresh failures so mismatched OAuth client vs. stored refresh token now surfaces a clear reconnect error instead of a generic Unauthorized response.
- File: `scripts/reconnect_google_sheets_loopback.mjs`
  - Action: `created`
  - Reason: Added a local loopback OAuth reconnection flow that can issue a fresh Google Sheets token from an installed-client JSON and save it into `.local/google_sheets_token.json`.
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Added a persistent `Send Knowledge` button to the Level Editor so useful manual boards can be pushed into procedural learning on demand.
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Added explicit editor-to-learning capture with duplicate protection so the current editor level can be stored as an approved procedural pattern with source metadata.
- File: `scripts/export_procedural_learning_snapshot.py`
  - Action: `created`
  - Reason: Added an export step that materializes the latest procedural learning snapshot outside the browser so approved/rejected patterns can be inspected from disk.
- File: `PROCEDURAL_KNOWLEDGE_PIPELINE.md`
  - Action: `created`
  - Reason: Documented the end-to-end capture and persistence path for procedural knowledge, including the new editor-side `Send Knowledge` action and how learning affects generation.
- File: `SPREADSHEET_DRIVE_IMAGE_PIPELINE.md`
  - Action: `created`
  - Reason: Documented the implemented Drive-folder-to-Google-Sheets image sync pipeline, including folder traversal rules, tab creation, image insertion, and auth requirements.
- File: `package.json`
  - Action: `updated`
  - Reason: Added npm shortcuts for Google Sheets local bootstrap and environment checks.
- File: `GOOGLE_SHEETS_API_SYNC_PLAN.md`
  - Action: `updated`
  - Reason: Added a short canonical quickstart for local Google Sheets bootstrap, environment checks, and the remaining manual auth step.
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Added a Google Sheets auth fallback that uses local gcloud ADC tokens with Sheets scope and quota-project headers for live sync.
- File: `scripts/check_google_sheets_env.sh`
  - Action: `updated`
  - Reason: Updated the Google Sheets environment check so gcloud-based auth is treated as a valid connected mode.
- File: `GOOGLE_SHEETS_API_SYNC_PLAN.md`
  - Action: `updated`
  - Reason: Documented the new gcloud/ADC fallback path for local Google Sheets sync without a separate OAuth client file.
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Changed the default UI sync mode to `Google Sheets API` so the toolkit starts in the live spreadsheet sync configuration.
- File: `scripts/build_drive_folder_excel.py`
  - Action: `created`
  - Reason: Added an interactive exporter that lets the user choose repeated-structure Drive folders and fills an Excel workbook with summary, slot rows, and artifact inventory.
- File: `scripts/build_drive_folder_excel.sh`
  - Action: `created`
  - Reason: Added a small wrapper so the Drive-folder Excel exporter can be launched consistently from npm or shell.
- File: `package.json`
  - Action: `updated`
  - Reason: Added an npm shortcut for the Drive-folder Excel exporter.
  - Reason: Updated the Drive importer instructions to explain the new per-folder Import action in the picker sheet.

## 2026-03-14

- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `created`
  - Reason: Added a local Tkinter reporting-sync tool that stores reusable source/target profiles, tracks imported level artifacts in SQLite, supports local or Drive-synced export folders, and can scan/import only new or changed progression files from the after-feedback set or the Level Manager live export.
- File: `scripts/bridge.sh`
  - Action: `created`
  - Reason: Added a launcher wrapper for the reporting-sync GUI that checks whether the level editor server is listening on `localhost:8080`, offers to start `npm run start:web` if needed, and then opens the Python bridge tool from a single terminal command.
- File: `~/.bridge_aliases.sh`
  - Action: `created`
  - Reason: Added a shared shell helper so the `bridge` command can be sourced consistently across terminal profiles without duplicating the launch logic.
- File: `~/.zshrc`, `~/.bashrc`, `~/.bash_profile`, `~/.profile`
  - Action: `updated`
  - Reason: Wired the shared `bridge` shell helper into the main interactive shell startup files so the command is available in the user's common terminal environments.
- File: `scripts/bridge.sh`
  - Action: `updated`
  - Reason: Extended the bridge launcher so it opens the level editor URL in the browser automatically once the local server is detected or started successfully.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Added a macOS-safe Tk theme configuration and minimum window sizing to avoid the blank popup behavior seen with the default `aqua` ttk theme under the current Python/Tk runtime.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Added bulk export-name renaming controls with persisted per-profile find/replace/prefix/suffix rules that change only the filename stem, preserve extensions, update the target-path preview, and mark rows as pending when the export destination changes.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Extended the export renaming flow with template-based filenames (`{progression}`, `{slot}`, `{stem}`), added an import-selected action for row subsets, and hardened validation so invalid template placeholders surface as a clear UI error instead of breaking the scan.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Added source-file renaming actions that can apply the current naming rule to selected rows or the full scanned set, rename matching screenshots, update progression references for supported source modes, and block duplicate/conflicting destination names before any file move happens.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Expanded the bridge UI with saved rename presets, slot-range targeting (`2,4,7-10`), folder-wide renaming using the active naming rule, and an explicit target-screenshot preview column so naming changes can be reviewed before import or source renames.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Triggered an automatic scan on startup so the reporting table no longer opens empty by default when the configured source files are present.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Replaced the unstable macOS/Tk `ttk`-heavy interface with a classic Tk UI built around standard widgets and a multi-select list view so the reporting tool renders reliably while keeping the same bridge, profile, scan, import, preset, and renaming workflows.
- File: `scripts/bridge.sh`
  - Action: `updated`
  - Reason: Stopped relying on the earlier `python3` from the user's shell PATH and now resolve a modern explicit interpreter for the reporting-sync GUI, avoiding the macOS Python 3.8 runtime that was rendering the window incorrectly.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Reorganized the reporting tool into clear `User` and `Admin` views, added a task-oriented toolkit guide, introduced an explicit new-profile creation flow, and made the progression-file and rename areas easier to understand and operate.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Added a dedicated `Progressions` view that loads a progression JSON directly, lists its slots, previews the selected screenshot, allows in-memory slot reordering with move up/down controls, and saves the new order back to the progression file on demand.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Added drag-and-drop slot reordering inside the `Progressions` view so levels can be reorganized directly with the mouse while keeping the tutorial locked at the top and preserving Save-as-final-write behavior.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Switched the `Progressions` screenshot preview to a fixed-size canvas viewport so previews render inside a stable frame and complete images fit consistently regardless of the original PNG dimensions.
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Changed the web toolkit progression model and UI so the tutorial lives in visible `slot 0`, added a real empty `Level 1` slot after it, expanded progression capacity from 10 to 11 positions, migrated older saved manager states into the new shape, and updated progression import/export, manager labels, editor slot selection, and summaries to match the new numbering.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Fixed the reporting/progression bridge so it recognizes tutorial slots using the new `slot 0`/`reserved` progression format, preserves the tutorial as slot `0` when reindexing reordered progressions, and no longer rewrites saved progression JSON back to the earlier tutorial-in-slot-1 shape.
- File: `levels/workshop_andrea_*.json`, `levels/workshop_karina_*.json`, `levels/workshop_susanne_*.json`, `levels/workshop_chloe_*.json`, `levels/screenshots/workshop_*.png`, `progressions/workshop.json`
  - Action: `created`
  - Reason: Created a new workshop-ready level set by duplicating the current canonical creator groups into a stable naming convention `workshop_<creator>_<n>`, copied matching screenshots, and generated a single `workshop` progression containing 35 slots so the workshop collection is no longer limited by the 10-level progression convention.
- File: `workshop_levels_index.md`
  - Action: `created`
  - Reason: Added a Markdown index with direct links to the `workshop` progression plus every generated workshop JSON and screenshot, grouped by creator so the set is easy to review and share.
- File: `level_toolkit_web/index.html`, `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Added an editor-only `Reference Trail` design mode that lets the user drag a non-blocking visual guide from one endpoint to the other, saves the completed trail as a dashed ghost path for reference, persists those guide trails in workspace state, and adds explicit UI affordances to clear them without resetting the whole level.
- File: `server.mjs`, `level_toolkit_web/index.html`, `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Added real level deletion support for the Level Manager by introducing a file-delete API endpoint and a `Delete Level` action that removes duplicate catalog items plus their saved JSON/PNG files, and added `Add Slot` / `Remove Last Slot` controls with dynamic progression-length support so progressions are no longer locked to the original fixed slot count.
- File: `level_toolkit_web/index.html`, `level_toolkit_web/styles.css`, `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Added a new reference-driven procedural workflow that lets the user import one base level JSON, generate three similar variants, preview each with visible solution paths and route text, rename them, keep or discard them for learning, send them to the editor, and save accepted candidates; also extended learning so solved play sessions feed approved examples back into the procedural scorer.
- File: `progress.md`
  - Action: `updated`
  - Reason: Logged the new procedural reference flow, its learning behavior, and the current validation status so a later agent can continue from the same implementation point.
- File: `/Users/victoria.serrano/Desktop/AI-Bridge/03-codex-response.md`
  - Action: `updated`
  - Reason: Wrote the Codex side of the AI-Bridge handoff, documenting that Claude, the inbox, and shared context are still empty templates and that there is not yet an actionable next step for Codex to execute.
- File: `/Users/victoria.serrano/Desktop/AI-Bridge/03-codex-response.md`
  - Action: `updated`
  - Reason: Refreshed the Codex AI-Bridge handoff using the exact `Done / Output / Blockers / Next step for Claude` structure after confirming that Claude and the bridge context files are still empty templates.
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Added discard-reason capture for procedural variants, stored structured rejection reasons in learning memory, switched generated `golden_path` guidance to use a real solver-backed solution when available, and filtered/penalized candidates with crossed guide paths so future procedural suggestions better reflect the user's visual-quality feedback.
- File: `progress.md`
  - Action: `updated`
  - Reason: Logged the new discard-reason flow, reason taxonomy, and solver-backed guide-path improvements for future agent handoff.
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Extended procedural discard feedback so the user can specify which pair or pairs are wrong, store those pair IDs in rejection learnings, show available pair IDs in the variant cards, and feed pair-specific rejection signals back into future procedural scoring.
- File: `progress.md`
  - Action: `updated`
  - Reason: Added the new pair-specific discard feedback behavior to the running web-game handoff notes.
- File: `level_toolkit_web/app.js`, `level_toolkit_web/styles.css`
  - Action: `updated`
  - Reason: Replaced prompt-based procedural discard with inline card controls for discard reason, affected pair chips, and optional note so learning feedback can be entered visually during candidate review.
- File: `progress.md`
  - Action: `updated`
  - Reason: Logged the new inline procedural discard UI and the visual verification screenshot path.
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Hardened the reporting sync GUI against high-impact UX/runtime failures by validating slot-filter syntax, surfacing template-format errors with actionable messages, making scan failures user-visible instead of crashing, deduplicating import-by-source operations, and preventing conflicting rename plans when the same level appears in multiple slots.
- File: `scripts/bridge.sh`
  - Action: `updated`
  - Reason: Improved bridge launcher stability with safe non-interactive behavior (no blocking read under `set -e`), added environment toggles for auto-start/browser/GUI, and added a `--status` diagnostic mode for fast troubleshooting.
- File: `~/.bridge_aliases.sh`
  - Action: `updated`
  - Reason: Added `bridge_status` as a quick shell helper to run bridge diagnostics without opening browser or GUI.
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Improved procedural guide correctness and editor UX by adding stricter solution-guide validation (endpoints/adjacency/bounds/blockers/foreign endpoints), filtering critical-guide variants, replacing coarse pair-ID penalties with structural pair-feedback scoring, validating discard reason/pair input, and making the play toggle button text match the real play state.
- File: `progress.md`
  - Action: `updated`
  - Reason: Logged the second-pass procedural and level-editor quality improvements for handoff continuity.
- Date: `2026-03-17 15:57:14 CET`
- File: `README.md`
  - Action: `updated`
  - Reason: Documented the new `base- template` and `log` tabs plus the removal of `level manager items` from the google sync mirror.
- Date: `2026-03-17 15:57:14 CET`
- File: `progress.md`
  - Action: `updated`
  - Reason: Captured that `base- template`/`log` are now part of the exported workbook and `level manager items` has been folded into `level manager db`.
- Date: `2026-03-17 15:57:14 CET`
- File: `GOOGLE_SHEETS_API_SYNC_PLAN.md`
  - Action: `updated`
  - Reason: Updated the plan to describe the canonical tabs served to Google Sheets, including the new `base- template` and `log`, and noted the discarded `level manager items` tab.
- Date: `2026-03-17 11:23:31 CET`
- File: `scripts/sync_levels_spreadsheet.py`
  - Action: `updated`
  - Reason: Adapted spreadsheet generation to populate the live `base- template` layout with tutorial-at-position-0 rows, screenshot/code-file columns, and a single consolidated `level manager db` sheet while removing the duplicate `level manager items` export.
- Date: `2026-03-17 11:23:31 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Aligned the Google Sheets API sync path with the new spreadsheet contract by writing `base- template`, dropping the duplicate `level manager items` payload, and deleting the old sheet if it still exists.
- Date: `2026-03-17 12:06:47 CET`
- File: `.local/google_oauth_client.json`
  - Action: `created`
  - Reason: Created the local Google OAuth client placeholder file in the expected path so the credentials can be pasted and the Google Sheets auth flow can be completed.

- Date: `2026-03-17 12:27:56 CET`
- File: `server.mjs`
  - Action: `updated`
  - Reason: Added default Google OAuth client/token paths to the local auth/status/disconnect endpoints so the toolkit can start the Sheets OAuth flow even when the UI does not send explicit credential paths.

- Date: `2026-03-17 12:35:54 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the server-side Google Sheets OAuth default-path hardening and the live spreadsheet sync push attempt after the OAuth token was created.

- Date: `2026-03-17 12:36:33 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the successful live Google Sheets sync and the clean follow-up entry written into the spreadsheet log tab after token-based API access was verified.

- Date: `2026-03-17 12:48:22 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Removed the obsolete Sheet1 tab from the live Google Sheets sync contract and added cleanup of the stale v1_ progressiona,b,c sheet so the spreadsheet stays aligned with the new canonical tabs.
- Date: `2026-03-17 12:48:22 CET`
- File: `scripts/sync_levels_spreadsheet.py`
  - Action: `updated`
  - Reason: Updated the canonical workbook generator to stop rebuilding Sheet1 and to delete that previous tab from the output workbook.
- Date: `2026-03-17 12:48:22 CET`
- File: `README.md`
  - Action: `updated`
  - Reason: Aligned the spreadsheet documentation with the new canonical tab set by removing references to Sheet1 and level manager items as active outputs.

- Date: `2026-03-17 12:59:58 CET`
- File: `scripts/sync_levels_spreadsheet.py`
  - Action: `updated`
  - Reason: Added a canonical `Screenshoot` sheet builder sourced from repo screenshots so spreadsheet sync now includes a clean level-to-screenshot mapping with local file references and existence status.
- Date: `2026-03-17 12:59:58 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Extended the direct Google Sheets sync contract to push the new `Screenshoot` tab alongside the other canonical reporting tabs.

- Date: `2026-03-17 13:10:00 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Added Drive-backed screenshot upload support so spreadsheet sync can place real images inside `Screenshoot` and `base- template` cells via `IMAGE(...)`, with a clear reauthorization error when the current token lacks Drive scope.

- Date: `2026-03-17 15:18:19 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Finished the manager/editor save flow so existing levels overwrite instead of duplicating on rename/save, and added a persistent `Discarded` bucket that keeps levels stored without leaving them in the normal progression flow.

- Date: `2026-03-17 15:18:19 CET`
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Simplified the editor and manager button labels so overwrite, copy, slot save, progression actions, and spreadsheet sync are easier to distinguish in the UI.

- Date: `2026-03-17 15:18:19 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Aligned runtime button text and tooltips with the simplified editor and manager UI labels, including a clearer play-mode toggle.

- Date: `2026-03-17 16:44:40 CET`
- File: `server.mjs`
  - Action: `updated`
  - Reason: Added a local `/api/open-bridge` endpoint so the web toolkit can launch the Bridge helper directly without reopening the editor browser.

- Date: `2026-03-17 16:44:40 CET`
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Added a visible `Open Bridge` button in the toolkit top bar for quick access to the Bridge helper.

- Date: `2026-03-17 16:44:40 CET`
- File: `level_toolkit_web/styles.css`
  - Action: `updated`
  - Reason: Adjusted the top bar layout to support the new Bridge launcher button cleanly.

- Date: `2026-03-17 16:44:40 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Wired the new `Open Bridge` UI button to the local Bridge launcher endpoint and added tooltip/log messaging for the action.

- Date: `2026-03-17 17:16:00 CET`
- File: `scripts/sync_levels_spreadsheet.py`
  - Action: `updated`
  - Reason: Fixed spreadsheet payload generation so after-feedback and base-template rows resolve levels from current repo or archive paths instead of failing on moved level files.

- Date: `2026-03-17 17:16:00 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Fixed Drive screenshot upload updates by avoiding invalid parent rewrites on existing files during spreadsheet image sync.

- Date: `2026-03-17 16:06:02 CET`
- File: `CONFLUENCE_PAGE_DRAFT_FEED_THE_BEAR.md`
  - Action: `updated`
  - Reason: Added missing Confluence draft sections for procedural learning, discarded levels, spreadsheet base-template/screenshots contract, and overwrite-save behavior; also aligned slot logic to tutorial in slot 0 with Level 1 intentionally empty.

- Date: `2026-03-17 16:06:02 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Registered the Confluence draft update requested in task 3 so documentation changes remain traceable in the project memory log.

- Date: `2026-03-17 17:41:40 CET`
- File: `CONFLUENCE_PAGE_DRAFT_FEED_THE_BEAR.md`
  - Action: `updated`
  - Reason: Added a one-page publish-ready executive recap block (What changed, Current risks, Open decisions, Next actions) plus a Confluence publish checklist at the top of the canonical draft.

- Date: `2026-03-17 17:41:40 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the executive recap and publish-checklist enhancement made to the canonical Confluence draft.

- Date: `2026-03-17 18:05:18 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Implemented the procedural next-step UX and quality improvements by adding guide trust badges (`HIGH/MED/LOW`) on candidate cards and replacing discard flow with inline reason chips, pair chips, clear/apply actions, and stricter discard-state handling.

- Date: `2026-03-17 18:05:18 CET`
- File: `level_toolkit_web/styles.css`
  - Action: `updated`
  - Reason: Added styling for the new procedural guide trust badges and the upgraded inline discard controls (reason chips, action row, disabled apply state).

- Date: `2026-03-17 18:05:18 CET`
- File: `tests/procedural-quality-guardrails.test.ts`
  - Action: `created`
  - Reason: Added a guardrail test suite to ensure critical guide issues remain blocked and reference candidate generation keeps the quality-gate call.

- Date: `2026-03-17 18:05:18 CET`
- File: `progress.md`
  - Action: `updated`
  - Reason: Documented the completed procedural next recommendations, validations executed, and the current Playwright visual-check blocker.

- Date: `2026-03-17 18:05:18 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Registered the latest procedural/editor UX and guardrail test changes in the project memory log as required by the workflow.

- Date: `2026-03-17 18:12:00 CET`
- File: `local_knowledge_store.mjs`
  - Action: `created`
  - Reason: Added a local-first persistence layer with SQLite snapshots, event logging, file traceability, process tracking, and browser-state export bundles so learnings no longer depend only on browser storage.

- Date: `2026-03-17 18:12:00 CET`
- File: `server.mjs`
  - Action: `updated`
  - Reason: Wired the toolkit server to the local knowledge store, adding browser snapshot sync/read endpoints plus process, file, and error tracing for key save/sync operations.

- Date: `2026-03-17 18:12:00 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Added local-store hydration and background flush of browser snapshots so settings, learnings, workspace, drafts, and play-session metadata are backed up outside localStorage.

- Date: `2026-03-17 18:12:00 CET`
- File: `LEARNING_SYSTEM_PIPELINE.md`
  - Action: `created`
  - Reason: Documented the canonical local-first learning and traceability pipeline, including storage layers, browser migration rules, file/process tracing, and rollout phases.

- Date: `2026-03-17 18:12:00 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Registered the new local knowledge store, browser-state migration, and learning-system pipeline documentation in the project memory log.

- Date: `2026-03-18 09:18:00 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Fixed startup integrity resolution so workshop presets can resolve legacy level filenames through the canonical catalog alias map instead of flagging valid renamed levels as missing.

- Date: `2026-03-18 09:18:00 CET`
- File: `reports/toolkit_startup_integrity.md`
  - Action: `updated`
  - Reason: Regenerated the startup integrity report after the alias-aware resolver fix; the current audit now reports zero missing references.

- Date: `2026-03-18 09:18:00 CET`
- File: `reports/toolkit_startup_integrity.json`
  - Action: `updated`
  - Reason: Regenerated the startup integrity audit JSON so it matches the current alias-aware resolution results with zero missing references.

- Date: `2026-03-18 09:18:00 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the startup-integrity resolver fix and refreshed audit artifacts in the project memory log.

- Date: `2026-03-18 09:52:00 CET`
- File: `scripts/sync_levels_spreadsheet.py`
  - Action: `updated`
  - Reason: Made spreadsheet payload generation alias-aware so base-template and Screenshoot use canonical screenshot assets even when progression files still reference historical level filenames.

- Date: `2026-03-18 09:52:00 CET`
- File: `scripts/render_level_screenshot.py`
  - Action: `created`
  - Reason: Added a reusable local thumbnail renderer for level JSON files so missing spreadsheet screenshots can be generated deterministically from canonical level data.

- Date: `2026-03-18 09:52:00 CET`
- File: `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx`
  - Action: `updated`
  - Reason: Regenerated the canonical workbook after fixing screenshot alias resolution and generating the missing progression A thumbnails.

- Date: `2026-03-18 09:52:00 CET`
- File: `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync_payload.json`
  - Action: `updated`
  - Reason: Regenerated the live-sync payload so all rows in Screenshoot resolve to existing local screenshot paths and can be pushed as embedded images to Google Sheets.

- Date: `2026-03-18 09:52:00 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged today's spreadsheet-priority changes, including alias-aware screenshot sync, generated thumbnails, and the refreshed workbook payload.

- Date: `2026-03-18 10:08:00 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Extended the live spreadsheet sync contract to publish a dedicated `rename log` tab alongside the canonical screenshot-backed tabs.

- Date: `2026-03-18 10:08:00 CET`
- File: `output/spreadsheet/level_rename_log.csv`
  - Action: `created`
  - Reason: Added a canonical CSV log of level display names, canonical JSON names, aliases, and screenshot file mappings so renames remain traceable outside Google Sheets.

- Date: `2026-03-18 10:08:00 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the new rename-traceability surfaces for the spreadsheet pipeline, including the `rename log` tab and the canonical CSV export.

- Date: `2026-03-18 10:29:04 CET`
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Added visible procedural reference intent controls so the user can choose whether generated variants should aim for more or fewer pairs, blockers, or a bigger or smaller board before generation.

- Date: `2026-03-18 10:29:04 CET`
- File: `level_toolkit_web/styles.css`
  - Action: `updated`
  - Reason: Styled the new procedural reference intent controls so the reference-generator block clearly exposes generation intent instead of hiding it in logs.

- Date: `2026-03-18 10:29:04 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Wired procedural reference intent tags into UI state, workspace persistence, candidate ranking, and learning metadata so reference-driven generation responds to the selected design direction.

- Date: `2026-03-18 10:29:04 CET`
- File: `LEARNING_SYSTEM_PIPELINE.md`
  - Action: `updated`
  - Reason: Added the reference-driven procedural pipeline contract so base-level selection and intent tags are explicitly part of the local-first learning system.

- Date: `2026-03-18 10:29:04 CET`
- File: `progress.md`
  - Action: `updated`
  - Reason: Logged the new procedural reference intent workflow for the ongoing toolkit implementation trail used by follow-up agents.

- Date: `2026-03-18 10:29:04 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the procedural reference-generator upgrade and its connection to the learning-system pipeline.

- Date: `2026-03-18 10:31:22 CET`
- File: `paraclau_1.md`
  - Action: `updated`
  - Reason: Added an explicit Claude/Codex collaboration note so Kingfluence layout and publishing questions can be coordinated in the canonical handoff file.

- Date: `2026-03-18 10:31:22 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the update to the Kingfluence handoff file and its new role as an active coordination channel for layout questions.

- Date: `2026-03-18 11:32:16 CET`
- File: `paraclau_1.md`
  - Action: `updated`
  - Reason: Added explicit Kingfluence checklist blocks for open layout questions and pending publish checks so Claude can leave structured handoff items for Codex.

- Date: `2026-03-18 11:32:16 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the new structured checklist added to the Kingfluence handoff file.

- Date: `2026-03-18 11:58:37 CET`
- File: `scripts/rebuild_playtest_events.py`
  - Action: `created`
  - Reason: Added a canonical rebuild script to materialize `playtest/playtest_events.jsonl` from the historical playtest session JSON files so the documented dataset path is real and recoverable.

- Date: `2026-03-18 11:58:37 CET`
- File: `playtest/playtest_events.jsonl`
  - Action: `created`
  - Reason: Backfilled the aggregated playtest dataset with 26 historical records so Confluence and repo references no longer point to a missing file.

- Date: `2026-03-18 11:58:37 CET`
- File: `paraclau_1.md`
  - Action: `updated`
  - Reason: Resolved Claude's three Kingfluence coordination questions by documenting Codex decisions about standalone source files, the playtest dataset file, and progression-folder clutter.

- Date: `2026-03-18 11:58:37 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the playtest dataset backfill and the updated Codex responses inside the Kingfluence handoff file.

- Date: `2026-03-18 12:04:29 CET`
- File: `paraclau_1.md`
  - Action: `updated`
  - Reason: Added a dedicated Codex reply block so Claude can see the resolved Kingfluence decisions at a glance without scanning the full question history.

- Date: `2026-03-18 12:04:29 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the new Codex reply block added to the Kingfluence coordination file.

- Date: `2026-03-18 12:11:01 CET`
- File: `scripts/render_playtest_confluence_assets.py`
  - Action: `created`
  - Reason: Added a deterministic renderer for Confluence-ready Level Review assets so playtest and reviewed-level screenshots can be regenerated from repo data.

- Date: `2026-03-18 12:11:01 CET`
- File: `output/confluence/level_review_playtest_session.png`
  - Action: `created`
  - Reason: Generated a Confluence-ready screenshot of a real saved playtest session with player paths overlaid for the Level Review section.

- Date: `2026-03-18 12:11:01 CET`
- File: `output/confluence/level_review_reviewed_level.png`
  - Action: `created`
  - Reason: Generated a clean reviewed-level screenshot from the same playtest source level to support the Level Review section in Kingfluence.

- Date: `2026-03-18 12:11:01 CET`
- File: `paraclau_1.md`
  - Action: `updated`
  - Reason: Marked Q4 as resolved and updated the Kingfluence publish checklist now that the missing Level Review screenshots exist in `output/confluence/`.

- Date: `2026-03-18 12:11:01 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the generated Level Review Confluence assets and the updated handoff status for publish readiness.

- Date: `2026-03-18 12:38:36 CET`
- File: `paraclau_1.md`
  - Action: `updated`
  - Reason: Added a new open question for Claude asking for structural advice on the final information architecture of the Kingfluence page and the spreadsheet before publish.

- Date: `2026-03-18 12:38:36 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the new pre-publish architecture review request added to the Kingfluence coordination file.

- Date: `2026-03-18 13:24:07 CET`
- File: `scripts/sync_levels_spreadsheet.py`
  - Action: `updated`
  - Reason: Consolidated the spreadsheet export into four canonical tabs (`After feedback`, `Screenshots`, `Level Manager state`, `Links`) and merged the old after-feedback and base-template data into one primary working view.

- Date: `2026-03-18 13:24:07 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Updated the live Google Sheets sync contract to publish the new four-tab layout, preserve embedded screenshot formulas, reuse existing Drive screenshot IDs, and clean up obsolete tabs.


- Date: `2026-03-18 13:24:07 CET`
- File: `package.json`
  - Action: `updated`
  - Reason: Switched the default spreadsheet sync command to the canonical after-feedback workbook instead of the previous linked workbook.

- Date: `2026-03-18 13:24:07 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Updated the toolkit spreadsheet path so the UI points to the canonical consolidated workbook by default.

- Date: `2026-03-18 13:24:07 CET`
- File: `README.md`
  - Action: `updated`
  - Reason: Rewrote the spreadsheet documentation to describe the new four-tab structure and the separation between editorial view, sync surface, screenshots, and links.

- Date: `2026-03-18 13:24:07 CET`
- File: `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx`
  - Action: `updated`
  - Reason: Regenerated the canonical workbook with the consolidated four-tab structure and updated Links orientation note.

- Date: `2026-03-18 13:24:07 CET`
- File: `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync_payload.json`
  - Action: `updated`
  - Reason: Regenerated the live-sync payload so the Google Sheets sync publishes the consolidated spreadsheet structure and updated Links data.

- Date: `2026-03-18 13:24:07 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the spreadsheet consolidation work, including the live workbook cleanup and the new source-of-truth notes in `Links`.

- Date: `2026-03-18 13:26:44 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Optimized the live spreadsheet sync to reuse existing Drive screenshot IDs and to remove the last residual `Workshop` and `log` tabs so the live workbook matches the intended four-tab structure.


- Date: `2026-03-18 13:26:44 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the final spreadsheet sync optimization and the removal of the last residual tabs from the live workbook.

- Date: `2026-03-18 16:14:04 CET`
- File: `CONFLUENCE_PAGE_DRAFT_FEED_THE_BEAR.md`
  - Action: `updated`
  - Reason: Synced the canonical Confluence draft with the resolved Kingfluence handoff content, replacing old screenshot placeholders and aligning the reporting section with the consolidated four-tab spreadsheet.

- Date: `2026-03-18 16:14:04 CET`
- File: `output/confluence/feed_the_bear_full_page_confluence_safe.html`
  - Action: `updated`
  - Reason: Regenerated the final publishable Kingfluence HTML after updating the canonical Confluence draft.

- Date: `2026-03-18 16:14:04 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the final Confluence draft sync and HTML regeneration before publishing to Kingfluence.

- Date: `2026-03-18 16:17:15 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Fixed the startup integrity audit by awaiting the async workshop level candidate resolver before iterating, removing the runtime error that produced the `startup_audit` warning.

- Date: `2026-03-18 16:17:15 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the startup integrity audit runtime fix in the toolkit.

- Date: `2026-03-18 16:29:33 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Hardened the live spreadsheet sync to rebuild the managed tabs and apply fixed row/column sizes so screenshot formulas render as visible in-cell thumbnails without stale layout residue.

- Date: `2026-03-18 16:29:33 CET`
- File: `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx`
  - Action: `updated`
  - Reason: Regenerated the canonical workbook after tightening the screenshot-sheet sync and layout behavior.

- Date: `2026-03-18 16:29:33 CET`
- File: `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync_payload.json`
  - Action: `updated`
  - Reason: Regenerated the spreadsheet sync payload used for the live workbook rebuild.

- Date: `2026-03-18 16:29:33 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the spreadsheet rendering fix for in-cell screenshots and the regenerated sync artifacts.

- Date: `2026-03-18 16:30:54 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Fixed the managed-sheet rebuild flow so Google Sheets can recreate all canonical tabs safely even when the workbook only contains managed tabs, using a temporary sheet during sync.

- Date: `2026-03-18 16:30:54 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the final Google Sheets rebuild fix that avoids the “cannot remove all sheets” API error.

- Date: `2026-03-18 16:34:27 CET`
- File: `archive/20260318_evening_cleanup/json_move_manifest.csv`
  - Action: `created`
  - Reason: Recorded the full origin-to-destination route map for the conservative JSON cleanup, preserving traceability for every moved non-canonical file.

- Date: `2026-03-18 16:34:27 CET`
- File: `archive/20260318_evening_cleanup/progressions`
  - Action: `created`
  - Reason: Archived non-canonical progression JSON variants, workspace files, bundles, recovered files, and workshop intermediates that were no longer treated as latest active versions.

- Date: `2026-03-18 16:34:27 CET`
- File: `archive/20260318_evening_cleanup/levels`
  - Action: `created`
  - Reason: Archived clearly superseded level JSON variants such as `_new`, `_v2`, and explicit editor variants while keeping active canonical level files in place.

- Date: `2026-03-18 16:34:27 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the evening JSON cleanup, including the archive destination and manifest path for all moved files.

- Date: `2026-03-18 21:46:33 CET`
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Simplified the active Procedural view by removing the Episode Builder, Level Generator, and Workshop Extras blocks so the screen focuses on the reference-driven workflow.

- Date: `2026-03-18 21:46:33 CET`
- File: `level_toolkit_web/styles.css`
  - Action: `updated`
  - Reason: Added visual support for a base-level preview card and an explicit empty state in the procedural reference grid.

- Date: `2026-03-18 21:46:33 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Improved the Reference Generator so it shows the loaded base level preview immediately and displays a clear empty-state message when no variants are present yet.

- Date: `2026-03-18 21:46:33 CET`
- File: `archive/procedural_playground_removed_ui_20260318.md`
  - Action: `created`
  - Reason: Archived the removed Procedural Playground UI blocks and their former actions for recovery if needed later.

- Date: `2026-03-18 21:46:33 CET`
- File: `archive/procedural_reference_generator_followup_20260318.md`
  - Action: `created`
  - Reason: Captured the procedural screenshot/preview issue, the applied improvement, and the remaining follow-up ideas.

- Date: `2026-03-18 21:46:33 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the Procedural view cleanup, the archived recovery notes, and the Reference Generator preview improvement.

- Date: `2026-03-18 21:49:43 CET`
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Removed the obsolete procedural batch controls from the active Reference Generator screen so the UI no longer shows irrelevant `Single Level` and batch inputs.

- Date: `2026-03-18 21:49:43 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Simplified the Reference Generator empty state so a loaded base level shows only its preview card until variants are generated, instead of a large misleading empty panel.

- Date: `2026-03-18 21:49:43 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the procedural UI cleanup that removes the irrelevant bottom controls and the oversized empty placeholder.

- Date: `2026-03-18 21:54:06 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Strengthened procedural reference generation with a three-stage candidate pipeline (strict, relaxed, fallback mutation) and auto-generation on base-level load so the screen no longer stays empty when the strict generator finds no variants.

- Date: `2026-03-18 21:54:06 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the procedural generation fix that prevents empty reference results and makes variant creation start immediately after loading a base JSON.

- Date: `2026-03-18 22:03:40 CET`
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Renamed the editor save buttons so the UI now distinguishes clearly between `Update`, `New`, and `Save...`.

- Date: `2026-03-18 22:03:40 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Split the editor save behaviors so `Update` overwrites the linked source, `New` creates a fresh level copy, and `Save...` prompts for a manual destination path before saving the JSON and screenshot together.

- Date: `2026-03-18 22:03:40 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the editor save-flow change that clarifies overwrite vs new-copy behavior and adds manual path-based saving.

- Date: `2026-03-18 22:08:54 CET`
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Expanded the editor and settings UI so the toolkit can expose up to 9 selectable pairs and color pickers for pairs F through I.

- Date: `2026-03-18 22:08:54 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Extended the pair system from 5 to 9 pairs across editor state, settings persistence, palettes, and imported level handling.

- Date: `2026-03-18 22:08:54 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the pair-capacity expansion so the canonical toolkit now supports up to 9 pairs.

- Date: `2026-03-18 23:16:21 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Fixed procedural reference generation runtime errors so importing a base level no longer fails on stale curve and learning-state assumptions.

- Date: `2026-03-18 23:16:21 CET`
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Extended the Bridge progression editor so levels can be added from JSON files, removed from slots, and then reordered before saving.

- Date: `2026-03-18 23:16:21 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the procedural generation fix and the Bridge progression-editor upgrade for import plus reordering.

- Date: `2026-03-19 00:02:10 CET`
- File: `/Users/victoria.serrano/.codex/skills/feed-the-bear-api-guardian/SKILL.md`
  - Action: `created`
  - Reason: Added a reusable Codex skill focused on APIs, agent coordination, sync workflows, and preventing project state from being lost in the browser.

- Date: `2026-03-19 00:02:10 CET`
- File: `PROJECT_AGENT_API_GUARDIAN.md`
  - Action: `created`
  - Reason: Added the canonical in-repo prompt for helper agents that work on APIs, sync, Bridge, Confluence, and content-preservation tasks.

- Date: `2026-03-19 00:02:10 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the new API/persistence agent artifacts so future work can reuse the same guardrails and source-of-truth paths.

- Date: `2026-03-19 00:10:42 CET`
- File: `paraclau_1.md`
  - Action: `created`
  - Reason: Restored the canonical Claude/Codex coordination file so documentation and publish decisions no longer depend on missing chat-only context.

- Date: `2026-03-19 00:10:42 CET`
- File: `/Users/victoria.serrano/Library/Application Support/AI-Bridge/shared-context.md`
  - Action: `updated`
  - Reason: Added stable project rules, canonical paths, and the new API guardian role so AI-Bridge preserves them across handoffs.

- Date: `2026-03-19 00:10:42 CET`
- File: `PROJECT_AGENT_API_GUARDIAN.md`
  - Action: `updated`
  - Reason: Extended the project agent prompt so it also keeps AI-Bridge shared context aligned for collaboration-safe persistence.

- Date: `2026-03-19 00:10:42 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the restoration of the coordination file and the new AI-Bridge integration for the API guardian role.

- Date: `2026-03-19 00:15:24 CET`
- File: `/Users/victoria.serrano/.codex/skills/feed-the-bear-content-recovery/SKILL.md`
  - Action: `created`
  - Reason: Added a second reusable skill focused on recovery, browser-state export, manifests, and restoring canonical files.

- Date: `2026-03-19 00:15:24 CET`
- File: `PROJECT_AGENT_CONTENT_RECOVERY.md`
  - Action: `created`
  - Reason: Added the canonical in-repo prompt for helper agents that recover lost state, export browser data, and keep file traces explicit.

- Date: `2026-03-19 00:15:24 CET`
- File: `paraclau_1.md`
  - Action: `updated`
  - Reason: Linked the new content-recovery agent so Claude/Codex coordination can route recovery tasks to the right canonical prompt.

- Date: `2026-03-19 00:15:24 CET`
- File: `/Users/victoria.serrano/Library/Application Support/AI-Bridge/shared-context.md`
  - Action: `updated`
  - Reason: Added the content-recovery role to the stable handoff context so browser-state and restore work remain discoverable across sessions.

- Date: `2026-03-19 00:15:24 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the creation of the content-recovery agent artifacts and their integration into coordination surfaces.

- Date: `2026-03-19 00:21:03 CET`
- File: `/Users/victoria.serrano/.codex/skills/feed-the-bear-procedural-design-critic/SKILL.md`
  - Action: `created`
  - Reason: Added a reusable skill focused on procedural level critique, discard reasoning, and generation-quality guidance.

- Date: `2026-03-19 00:21:03 CET`
- File: `PROJECT_AGENT_PROCEDURAL_DESIGN_CRITIC.md`
  - Action: `created`
  - Reason: Added the canonical in-repo prompt for helper agents that critique procedural level quality and improve generation rules.

- Date: `2026-03-19 00:21:03 CET`
- File: `paraclau_1.md`
  - Action: `updated`
  - Reason: Linked the procedural design critic so documentation and coordination can route quality-review questions to the right prompt.

- Date: `2026-03-19 00:21:03 CET`
- File: `/Users/victoria.serrano/Library/Application Support/AI-Bridge/shared-context.md`
  - Action: `updated`
  - Reason: Added the procedural design critic role to stable shared context so quality-review work remains discoverable across sessions.

- Date: `2026-03-19 00:21:03 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the creation and integration of the procedural design critic artifacts.

- Date: `2026-03-19 00:27:18 CET`
- File: `AGENT_CHEATSHEET.md`
  - Action: `created`
  - Reason: Added a quick routing guide so future work can choose the right helper agent without relying on chat memory.

- Date: `2026-03-19 00:27:18 CET`
- File: `paraclau_1.md`
  - Action: `updated`
  - Reason: Added the short agent-routing summary so Claude/Codex coordination can pick the right prompt quickly.

- Date: `2026-03-19 00:27:18 CET`
- File: `/Users/victoria.serrano/Library/Application Support/AI-Bridge/shared-context.md`
  - Action: `updated`
  - Reason: Added the stable agent-routing summary and the cheatsheet path so AI-Bridge remembers which helper prompt to use.

- Date: `2026-03-19 00:27:18 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the creation and propagation of the agent cheatsheet across the project handoff surfaces.

- Date: `2026-03-19 09:53:11 CET`
- File: `scripts/check_google_sheets_env.sh`
  - Action: `created`
  - Reason: Restored a direct environment check for Google Sheets auth so the spreadsheet status can be verified without relying on missing old scripts.

- Date: `2026-03-19 09:53:11 CET`
- File: `scripts/sync_google_sheets_payload.mjs`
  - Action: `created`
  - Reason: Restored a canonical sync entrypoint that pushes the current spreadsheet payload to the live Google Sheet using the surviving API module.

- Date: `2026-03-19 09:53:11 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the rebuilt spreadsheet check and sync tooling for the current workspace state.

- Date: `2026-03-19 10:07:42 CET`
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Added Drive-folder image-sheet sync support so the project can build one spreadsheet tab per Drive folder with file names and inserted image cells.

- Date: `2026-03-19 10:07:42 CET`
- File: `scripts/sync_drive_folder_image_sheets.mjs`
  - Action: `created`
  - Reason: Added a direct sync entrypoint for generating spreadsheet tabs from Drive folder screenshots without depending on the missing old server wiring.

- Date: `2026-03-19 10:07:42 CET`
- File: `memoria.md`
  - Action: `updated`
  - Reason: Logged the new Drive-folder-to-spreadsheet image sync pipeline.

- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Added service-account auth support for Google Sheets/Drive, graceful screenshot-upload fallback when a service account has no Drive quota, and retained the Drive-folder image-sheet sync path for shared folders.
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Cleaned the Drive-folder image-sheet sync so the left column now uses the base image name without the `.png` suffix.

- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Added editorial name formatting for Drive-folder image tabs so level PNG names render as readable labels such as `Progression C · Level 10 · Hard`.
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Added a persistent `Send Anti-Pattern` button to the Level Editor so bad manual boards can be pushed into rejected procedural memory on demand.
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Added explicit editor-to-learning rejection capture so the current editor level can be stored as an anti-pattern the generator should avoid.
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Renamed Drive-folder tabs to human-readable labels and added support for a `Procedural learning` tab in the main Google Sheets sync.
- File: `scripts/sync_google_sheets_payload.mjs`
  - Action: `updated`
  - Reason: Augmented the main spreadsheet sync to include the exported procedural learning snapshot as a dedicated `Procedural learning` tab.
- File: `SPREADSHEET_DRIVE_IMAGE_PIPELINE.md`
  - Action: `updated`
  - Reason: Documented that Drive-folder image tabs now use humanized sheet names and readable level labels instead of raw PNG filenames.
- File: `PROCEDURAL_KNOWLEDGE_PIPELINE.md`
  - Action: `updated`
  - Reason: Documented the new editor-side `Send Anti-Pattern` action as part of the procedural knowledge capture pipeline.
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Confirmed that spreadsheet image cells were populated with formulas but rendered blank because they point to private Drive files; attempted service-account mirroring, then recorded the Drive quota limitation for that approach.

- Date: `2026-03-20 14:12:00 CET`
- File: `scripts/bear_reporting_sync_gui.py`
  - Action: `updated`
  - Reason: Simplified the Bridge user-mode copy and labels so the main export flow is easier to understand, and added a real `Force Drive sync` action that runs the canonical Drive-to-Sheets sync script in the background.

- Date: `2026-03-20 16:05:00 CET`
- File: `PROCEDURAL_ML_DESIGN.md`
  - Action: `updated`
  - Reason: Consolidated procedural generation, learning persistence, and ML-readiness notes into one canonical design document and retired the standalone procedural knowledge pipeline note.
- File: `PROCEDURAL_KNOWLEDGE_PIPELINE.md`
  - Action: `deleted`
  - Reason: Removed the redundant procedural note after merging its content into `PROCEDURAL_ML_DESIGN.md`.
- File: `FISH_COLORS_SYSTEM.md`
  - Action: `updated`
  - Reason: Rewrote the fish-color documentation as the single canonical guide covering model, API surface, migration flow, and commands.
- File: `FISH_COLORS_IMPLEMENTATION.md`
  - Action: `deleted`
  - Reason: Removed the redundant implementation summary after merging the useful content into `FISH_COLORS_SYSTEM.md`.
- File: `FISH_COLORS_QUICK_REF.md`
  - Action: `deleted`
  - Reason: Removed the redundant quick reference after folding its content into the canonical fish-color guide.
- File: `FISH_COLORS_v2_DISTINCT.md`
  - Action: `deleted`
  - Reason: Removed the redundant letter-mapping variant after consolidating the canonical mapping in `FISH_COLORS_SYSTEM.md`.
- File: `PARALLEL_APIS_README.md`
  - Action: `updated`
  - Reason: Rewrote the pipeline documentation into one canonical guide for Google sync and parallel AI enrichment.
- File: `SPREADSHEET_DRIVE_IMAGE_PIPELINE.md`
  - Action: `deleted`
  - Reason: Removed the redundant Drive-image pipeline note after merging it into `PARALLEL_APIS_README.md`.

- Date: `2026-03-20 20:30:00 CET`
- File: `scripts/create_screenshot_workbook.py`
  - Action: `created`
  - Reason: Added a local Excel export script that builds a workbook with embedded screenshots from the repo, avoiding the Google Sheets image-sharing dependency.
- File: `output/spreadsheet/level_screenshots_embedded.xlsx`
  - Action: `created`
  - Reason: Generated a local workbook with 220 embedded screenshots from `levels/screenshots` so the image catalog can be reviewed directly in Excel.
- File: `scripts/import_excel_into_google_sheet.mjs`
  - Action: `created`
  - Reason: Added a direct Drive/Sheets import path that uploads a local `.xlsx`, converts it to Google Sheets, and copies the imported tab into the target spreadsheet.
- File: `https://docs.google.com/spreadsheets/d/1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c`
  - Action: `updated`
  - Reason: Imported `output/spreadsheet/level_screenshots_embedded.xlsx` into the live spreadsheet and created the tab `Excel screenshots` (`sheetId: 1050087569`).
- File: `package.json`
  - Action: `updated`
  - Reason: Added `npm run sync:sheets:local` as the canonical local-first command for pushing spreadsheet content and screenshots.
- File: `google_sheets_api.mjs`
  - Action: `updated`
  - Reason: Switched the Drive-folder screenshot sync to local-first behavior so Drive contributes screenshot names and grouping, while the actual image upload now comes from matching local files in the repo.
- File: `PARALLEL_APIS_README.md`
  - Action: `updated`
  - Reason: Documented the new local-first screenshot model: Drive for naming, local repo files for image upload.
- File: `level_toolkit_web/index.html`
  - Action: `updated`
  - Reason: Reduced the toolkit settings UI to workbook-only and Google Sheets API sync modes.
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Simplified toolkit sync settings and logging to the local-first plus Google Sheets API flow.
- File: `server.mjs`
  - Action: `updated`
  - Reason: Simplified the server-side spreadsheet sync endpoint to the supported local-first plus Google Sheets API flow.
- Date: `2026-03-21 00:28:00 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Stopped tagging imported levels with `meta.imported_from_legacy`, since the marker no longer added value in the active toolkit flow.
- File: `levels/**/*.json`
  - Action: `updated`
  - Reason: Removed the `imported_from_legacy` flag from active canonical level files to reduce stale migration metadata in the current catalog.

- Date: `2026-03-21 00:42:00 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Renamed internal import and generation variables from generic `fallback*` wording to clearer intent-based names such as `paletteIndex`, `sourceLevelNumber`, `defaultLabel`, `defaultActiveTab`, and `suggestedFileName`, without changing runtime behavior.
- File: `progress.md`
  - Action: `updated`
  - Reason: Reworded import and migration notes to prefer neutral terms like `gridSize-based` and `earlier` where the old wording was only editorial, not a technical requirement.
- File: `memoria.md`
  - Action: `updated`
  - Reason: Reworded several audit entries to reduce stale `old` and `fallback` wording where those terms no longer described active behavior.

- Date: `2026-03-21 00:52:00 CET`
- File: `level_toolkit_web/app.js`
  - Action: `updated`
  - Reason: Renamed procedural `fallback_mutation` metadata to `recovery_mutation` so the reference-generator recovery stage uses clearer terminology in code and logs.
- File: `memoria.md`
  - Action: `updated`
  - Reason: Removed remaining non-operative spreadsheet-sync audit entries so the log stays focused on the supported local-first Google Sheets workflow.

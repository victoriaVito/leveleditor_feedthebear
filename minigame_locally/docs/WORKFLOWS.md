# Feed the Bear Workflows

This guide turns the repo's real scripts, server actions, and toolkit flows into step-by-step operations. When a step is UI-only, it is named explicitly; when the repo does not expose a single canonical command, that gap is marked with `[VERIFY]`.

## A. I designed a new level in the editor - now what?

1. Save the level from the Python desktop editor.
   - Launch: `python3 python_toolkit/start_desktop.py --tab editor`
   - Use the `Save` or `Save As New` button in the native editor.
   - The desktop shell writes the level JSON directly to `levels/` and the screenshot to `levels/screenshots/`.
   - Expected result: the editor log shows the saved JSON path and screenshot path.
   - **Fallback only** (if desktop shell unavailable): open `level_toolkit_web/index.html` via `npm run sync:all` — the browser UI writes through `server.mjs`.

2. Verify the files landed in the canonical repo folders.
   - Check that the level file exists under `levels/<name>.json`.
   - Check that the screenshot exists under `levels/screenshots/<name>.png`.
   - Expected result: the level is now part of the local canonical level set.

3. Put the level into the canonical bundle path if it should appear on the spreadsheet.
   - For Original Progressions, use the `Level Manager` UI to place the level in the correct slot and export the progression from the toolkit.
   - For Live Ops Mixes, use the approved mix materialization flow later in this document.
   - [VERIFY: the editor-to-bundle export path for Original Progressions is UI-driven; `package.json` does not expose a dedicated npm wrapper for that export.]

4. Run the canonical spreadsheet sync.

   ```bash
   npm run sync:sheets:local
   ```

   - This rebuilds `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx` and `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync_payload.json` from the current bundle state, then pushes the payload through the local-first Google Sheets API flow.
   - Expected result: the sheet refreshes from the same bundle/progression state that the repo treats as canonical, and procedural learning rows can still be included when the snapshot exists.

5. Verify the level is visible on the spreadsheet side.
   - Check `All Progressions` for the updated row and screenshot after the level has been exported into a canonical progression or mix.
   - Check that the local workbook and payload were refreshed.
   - Expected result: the spreadsheet and local repo now agree on the canonical bundle state.

## B. I want to sync my local levels to Google Sheets

1. Make sure Google auth is available.

   ```bash
   npm run oauth:setup
   ```

   - This prints the setup steps and checks whether `credentials.json` exists.
   - Expected result: you confirm whether the local OAuth files are ready.

2. Run the supported local-first sync command.

   ```bash
   npm run sync:sheets:local
   ```

   - This runs `scripts/sync_google_sheets_payload.mjs`.
   - Input defaults: `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx`, `output/spreadsheet/Levels_feed_the_bear_after_feedback_sync_payload.json`, `.local/google_oauth_client.json`, `.local/google_sheets_token.json`.
   - Expected result: the canonical workbook and payload are rebuilt from bundle state, then the refreshed payload is pushed to Google Sheets.

3. Verify the sync completed cleanly.
   - Check that the command exits without error.
   - Check that the local workbook and payload timestamps changed.
   - Check the live spreadsheet tabs for updated level rows.
   - Check the `README` tab if you need a quick reminder of what each tab does and which tab colors are safe to edit.
   - Green tabs are the interactive editorial surfaces. Blue tabs are reference/read-only guidance. Orange tabs are generated data surfaces and should not be edited manually.
   - Check that the rebuilt local payload file was the one used as input.

4. If you intentionally want to push an already-generated payload without rebuilding first, use the lower-level push command.

   ```bash
   npm run sync:sheets:push
   ```

   - This skips workbook/payload regeneration and only pushes the current payload file.

5. If you need to sync from a different payload file, use the direct command.

   ```bash
   node scripts/sync_google_sheets_payload.mjs [payloadPath] [spreadsheetId]
   ```

   - This is the lower-level push-only entrypoint behind `npm run sync:sheets:push`.

## C. I want to generate a procedural pack

1. Run the canonical procedural pipeline from the repo root.

   ```bash
   npm run pipeline:procedural
   ```

   - This runs `scripts/run_procedural_pipeline.py`.
   - It regenerates the supported procedural pack, refreshes screenshots, syncs manager/workspace/play-session state, exports the learning snapshot, runs the learning audit and scorer replay, and validates the active level catalog.
   - Expected result: the active procedural pack is rewritten in `levels/otherLevels/` with exactly `100` `procedular_reference_large_*.json` levels that all respect the `7x8` contract.

2. Verify the generated files landed in the active catalog.
   - Check `levels/otherLevels/procedular_reference_large_001.json` through `levels/otherLevels/procedular_reference_large_100.json`.
   - Check `levels/screenshots/procedular_reference_large_*.png`.
   - Check `output/procedural/procedural_pipeline_report.json`.
   - Expected result: the active pack, its screenshots, and the pipeline report were all refreshed together.

3. Verify the learning artifacts that the spreadsheet and docs pipeline consume.
   - Check `output/procedural/procedural_learning_snapshot.json`.
   - Check `output/procedural/procedural_learning_audit.json`.
   - Check `output/procedural/replay_procedural_learning_scorer.json`.
   - Expected result: the snapshot, audit, and replay all exist and reflect the current repo learning state.

4. Review the pack in the toolkit before you approve anything.
   - Open the `Procedural` view to inspect generated candidates and learning-driven adjustments.
   - Open `Play Sessions` to validate the generated levels and record feedback.
   - Expected result: you can see whether the pack feels too easy, too open, blocker-heavy, or otherwise off-curve.

5. Approve or reject the generated content in the UI.
   - Use the approval and rejection actions in the relevant toolkit surfaces.
   - Expected result: the canonical learning file updates and future procedural scoring can use the new feedback.

6. Re-run the pipeline after new review input.

   ```bash
   npm run pipeline:procedural
   ```

   - Expected result: the pack, screenshots, manager state, and learning artifacts stay aligned with the latest decisions.

7. If you also want the refreshed procedural learning rows to go to Google Sheets, use the optional Sheets pass.

   ```bash
   python3 scripts/run_procedural_pipeline.py --sync-sheets
   ```

   - This performs the canonical local pipeline first, then runs the local-first Sheets sync.
   - Expected result: the procedural review data becomes visible in the spreadsheet workflow without relying on stale intermediate artifacts.

## D. I want to publish an updated Confluence page

1. Generate the Confluence-safe HTML page.

   ```bash
   python3 scripts/generate_full_confluence_page.py
   ```

   - Default output: `output/confluence/feed_the_bear_full_page_confluence_safe.html`.
   - Expected result: a single self-contained HTML file is produced from repo data.

2. Verify the HTML exists before publishing.
   - Check `output/confluence/feed_the_bear_full_page_confluence_safe.html`.
   - Expected result: the publisher has something to upload.

3. Publish it to Kingfluence with the browser-based publisher.

   ```bash
   node scripts/publish_bear_confluence_report_live_chrome.mjs
   ```

   - Prerequisites from the script:
   - Chrome must be open with remote debugging on port `9222`.
   - You must already be signed into Kingfluence/Confluence in that Chrome session.
   - `KINGFLUENCE_PAGE_URL` must point to the target edit page.

4. Or use the combined shortcut when you want both steps in one command.

   ```bash
   npm run sync:kingfluence:bear
   ```

   - This runs the generator and the publisher back to back.
   - Expected result: the Confluence-safe HTML is regenerated and pushed in one pass.

5. Verify the page after publishing.
   - Check the target Kingfluence page in the browser.
   - Expected result: the page content matches the newly generated HTML.

## E. I want to stage and apply level renames

1. Stage the rename in the `Level Renames` sheet.
   - Edit `Target Name` for the level you want to rename.
   - Expected result: the row highlights when the staged target differs from the current name.

2. Verify the rename is only staged, not applied.
   - The displayed ordinal is editorial context only.
   - The canonical filename is still unchanged at this point.
   - Expected result: you can see the pending rename without touching the repo yet.

3. Apply the staged renames locally.

   ```bash
   npm run apply:sheet-renames
   ```

   - Runs `scripts/apply_sheet_level_renames.mjs`.
   - Reads the `Level Renames` tab.
   - Creates a timestamped local backup under `backups/level_renames_<timestamp>/`.
   - Renames canonical level JSON files and matching screenshots.
   - Updates bundle copies, bundle CSVs, and JSON references.
   - Regenerates the workbook and payload.

4. If you need the lower-level direct command, use the script entrypoint.

   ```bash
   node scripts/apply_sheet_level_renames.mjs [spreadsheetId] [sheetName]
   ```

   - `spreadsheetId` defaults to `GOOGLE_SPREADSHEET_ID` or the built-in value.
   - `sheetName` defaults to `Level Renames`.

5. Verify the rename finished everywhere it should.
   - Check the backup folder under `backups/level_renames_<timestamp>/` if you need to inspect the pre-rename state.
   - Check the level file name in `levels/`.
   - Check the matching screenshot name in `levels/screenshots/`.
   - Check that bundle mirrors and spreadsheet rows point to the new name.
   - Expected result: the old filename is gone from the canonical paths and the staged target is now the source of truth.

## F. I want to materialize a Live Ops Mix from the Mix Planner

1. Prepare the rows in `Mix Planner`.
   - Mark the proposal as approved.
   - Make sure it is not already marked as materialized.
   - Expected result: the row is eligible for export.

2. Run the mix materialization command.

   ```bash
   npm run materialize:mixes
   ```

   - Runs `scripts/materialize_approved_mixes.mjs`.
   - Reads the `Mix Planner` sheet.
   - Writes bundle-style output under `bundles/live_ops_mixes/`.

3. Use the direct command if you need to override the defaults.

   ```bash
   node scripts/materialize_approved_mixes.mjs [spreadsheetId] [sheetName] [destinationRoot]
   ```

   - Defaults:
   - `sheetName` = `Mix Planner`
   - `destinationRoot` = `bundles/live_ops_mixes`

4. Verify the materialized output.
   - Check that the mix folder contains `jsons/`, `screenshots/`, `<mix>_progression.csv`, and `proposal_manifest.json`.
   - Check that the sheet row is marked `Materialized` and that `Output Folder` was filled in by the script.
   - Expected result: the approved mix now exists as a bundle-like folder on disk and is reflected back in the sheet.

## Pending [VERIFY] Flags

- `[VERIFY: the editor-to-bundle export path for Original Progressions is UI-driven; the repo does not expose a dedicated npm wrapper for that export.]`

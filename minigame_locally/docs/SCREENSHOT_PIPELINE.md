# Screenshot Pipeline

This document covers how Feed the Bear generates, stores, and reuses screenshot assets across the toolkit, spreadsheets, bundles, and Confluence publishing.

## 1. Overview

Screenshots are a working asset, not just decoration. They support level review, spreadsheet reading, bundle export, and Kingfluence publishing.

The canonical pipeline is:

1. the web toolkit renders a board preview from the current level state
2. the preview is saved as a PNG next to the level JSON or into a bundle/export folder
3. spreadsheet sync and reporting scripts reuse those PNGs for review surfaces and HTML reports

## 2. Generation Methods

### Browser-based

The web toolkit renders screenshots directly from canvas state in `level_toolkit_web/app.js`.

Relevant code paths:

- `createLevelPreviewDataUrl()` builds a 180x180 PNG data URL from `drawLevelPreviewCanvas()`
- `saveLevelArtifactsToProject()` saves the current editor level JSON plus a screenshot to `levels/` and `levels/screenshots/`
- `promptAndSaveEditorLevel()` lets the user choose a save path and writes the JSON plus matching PNG together
- the `ed-screenshot` button saves the current editor canvas to `levels/screenshots/<stem>.png`
- manager exports also generate PNG previews for difficulty curves and progression layouts

The browser-side preview is the same visual language used for quick review cards and session thumbnails.

### Python-based

The repository also has a small Python prerender path for batch screenshot generation.

Relevant scripts:

- `python_preview_project/render_previews.py`
- `scripts/render_level_preview_images.py`

`render_level_preview_images.py` reads level JSON files, draws a fixed 180x180 preview with Pillow, and writes PNGs to `levels/screenshots/` by default. It uses the fish color palette from `config/fish_colors.json` and preserves the board layout, blockers, and pair endpoints.

There is also a workbook-oriented renderer:

- `scripts/create_screenshot_workbook.py` builds an `.xlsx` file with embedded preview images from a screenshot folder

## 3. Storage And Naming

### Canonical screenshot locations

- `levels/screenshots/` is the main canonical screenshot folder for level PNGs
- `bundles/<bundle_name>/screenshots/` stores the screenshots mirrored into a progression or live ops bundle
- `artifacts/level_screenshots/` contains captured UI screenshots and editor artifacts that are useful for review, but are not the main level-authoring source of truth [VERIFY: this folder is used as a screenshot artifact store, but the exact capture policy is not explicit in code]

### Naming convention

The dominant naming rule is:

- `levels/screenshots/<level-stem>.png`

Examples observed in the repo:

- `levels/screenshots/progression1_level1.png`
- `levels/screenshots/progresion1_level6.png`
- `levels/screenshots/lvl_012_image02_level_editor.png`

Bundle mirrors keep the same stem:

- `bundles/original_progression_a/screenshots/progression1_level1.png`
- `bundles/original_progression_a/screenshots/tutorial_level.png`

The toolkit also derives screenshot paths from the saved JSON stem when saving editor output or renames.

## 4. Spreadsheet Integration

Spreadsheet sync consumes screenshot files from the repo and uses them for review surfaces.

The main touchpoints are:

- `scripts/sync_levels_spreadsheet.py` looks up screenshots from `levels/screenshots/`
- the local workbook export includes screenshot columns and embedded preview images
- `scripts/create_screenshot_workbook.py` can build a dedicated workbook with inline previews from a screenshot directory
- `scripts/import_excel_into_google_sheet.mjs` imports the generated workbook into Google Sheets as a sheet of screenshots

The spreadsheet layer treats screenshots as review evidence. `PARALLEL_APIS_README.md` describes the local-first Google Sheets path, and the spreadsheet docs state that local screenshots are the canonical image source.

## 5. Confluence Integration

The Confluence/Kingfluence report pipeline reads the same screenshot assets and inlines them into a static HTML page.

Relevant scripts:

- `scripts/generate_full_confluence_page.py` reads bundle CSVs and the matching screenshots from each bundle's `screenshots/` directory, then base64-embeds them into the generated HTML
- `scripts/publish_bear_confluence_report_live_chrome.mjs` publishes that generated HTML into Kingfluence [VERIFY: the publish script is explicit, but the screenshot dependency is indirect through the HTML generator]

In practice, this means the Confluence page does not generate screenshots itself. It reuses the screenshots produced earlier in the pipeline.

## 6. Naming Reference

Use this as the quick reference for file placement:

- editor save or "save as new" screenshot: `levels/screenshots/<saved-level-stem>.png`
- browser preview export for a specific level: `levels/screenshots/<stem>.png`
- progression bundle mirror: `bundles/<bundle_name>/screenshots/<stem>.png`
- batch prerender output from Python: `levels/screenshots/<stem>.png`
- workbook preview source: `levels/screenshots/`
- Confluence report input: `bundles/<bundle_name>/screenshots/<stem>.png`
- artifact review captures: `artifacts/level_screenshots/<name>.png` [VERIFY: exact producer varies]

## Pending [VERIFY] Flags

- `artifacts/level_screenshots/` is clearly a screenshot artifact directory, but the exact upstream producer and retention rule are not explicit in the code I reviewed.
- `scripts/publish_bear_confluence_report_live_chrome.mjs` publishes the generated Kingfluence HTML, but the screenshot dependency is indirect through `scripts/generate_full_confluence_page.py` rather than handled inside the publisher itself.

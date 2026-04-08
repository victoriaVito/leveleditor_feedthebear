# Curve Builder

The Curve Builder is a spreadsheet-based tool for designing difficulty curves
visually. It lives in the "Curve Builder" tab of the project Google Sheets and
lets you assign levels to 11 slots (tutorial + 10 progression slots), preview
screenshots, randomize fills, and materialize the result into a real
progression bundle that the toolkit's Level Manager can import.

## How it works

### Tab structure

The Curve Builder tab has 7 rows:

| Row | Purpose | Editable? |
|---|---|---|
| Header | Slot labels: Tutorial, Slot 1–10, Actions | No |
| Progression Name | Name for the curve (used as folder name on materialize) | Yes |
| Difficulty | Dropdown per slot: ALL / EASY / MEDIUM / HARD | Yes |
| Level File | Dropdown with all catalog levels, filtered by difficulty | Yes |
| Screenshot | `IMAGE()` formula showing the selected level's screenshot from Drive | Auto |
| Info | Board size, pairs, blockers, moves metadata | Auto |
| Status | Materialization status | Auto |

### Difficulty filtering

Each slot has a difficulty dropdown. When you select EASY, MEDIUM, or HARD, the
level dropdown for that slot only shows levels matching that difficulty tier.
Select ALL to see every level in the catalog without filtering.

The difficulty cells use conditional formatting:

- Green background for EASY
- Yellow background for MEDIUM
- Red background for HARD

### Screenshots

The screenshot row uses Google Drive `IMAGE()` formulas. When you select a
level, the sync function looks up the matching `.png` file ID in Drive and
generates the formula. Screenshots render at 100px height.

## Actions

The Actions column contains two hyperlink buttons that call server endpoints:

### Random Fill

**Endpoint:** `GET /api/action/random-fill-curve`

**Script:** `scripts/random_fill_curve.mjs`

**What it does:**

1. Reads the current Curve Builder tab from Google Sheets
2. For each empty slot, picks a random level from the catalog that matches
   the slot's difficulty filter
3. Avoids picking the same level twice across slots
4. Writes the selected levels back to the Level File row

**When to use it:** When you want a quick random curve to start from, or when
you want to fill remaining empty slots after placing a few levels manually.

### Materialize

**Endpoint:** `GET /api/action/materialize-curve`

**Script:** `scripts/materialize_curve_builder.mjs`

**What it does:**

1. Reads the current Curve Builder tab from Google Sheets
2. Creates a progression bundle folder at `bundles/original_{name}/`
3. Copies level JSONs to `bundles/original_{name}/jsons/`
4. Copies screenshots to `bundles/original_{name}/screenshots/`
5. Generates a progression CSV at `bundles/original_{name}/{name}_progression.csv`
6. Adds the progression to `progressions/manager_state/level_manager_state.json`
7. Adds the progression to `progressions/manager_progressions_live.json`
8. Updates the Status row in the spreadsheet to "Materialized: TRUE"

After materialization, the new progression appears as a tab in the toolkit's
Level Manager. You can then reorder slots, swap levels, lock slots, and export
from there.

**When to use it:** When you are happy with the curve and want to make it a
real progression that the toolkit can work with.

## Implementation

### Sync function

`syncCurveBuilderSheet()` in `google_sheets_api.mjs` (line 2710):

- Creates the "Curve Builder" sheet if it does not exist
- Preserves existing user edits (difficulty selections, level assignments,
  progression name) across syncs
- Rebuilds data validation dropdowns from the current catalog
- Applies conditional formatting for difficulty colors
- Generates `IMAGE()` formulas for screenshots
- Sets column widths (140px per slot, 100px for labels)
- Adds header styling (dark blue header, light blue label column)

### Server actions

Both actions are registered in `server.mjs` as GET handlers under
`/api/action/`:

- `random-fill-curve` → runs `scripts/random_fill_curve.mjs`
- `materialize-curve` → runs `scripts/materialize_curve_builder.mjs`

Both scripts output JSON to stdout, which the server parses and returns as the
action result.

### Data sources

- **Catalog levels:** read from `progressions/manager_state/level_manager_state.json`
  (the `items` array contains all known levels with difficulty, board size,
  pairs, blockers, and moves metadata)
- **Screenshots:** looked up from the Drive screenshot index built during sync
- **Level files:** read from the `levels/` directory during materialization

## Typical workflow

1. Open the spreadsheet and go to the "Curve Builder" tab
2. Set a progression name in row 2
3. Set difficulty filters for each slot (or leave as ALL)
4. Either pick levels manually from the dropdowns, or click "Random Fill"
5. Review the screenshots and info to check the curve shape
6. Adjust individual slots as needed
7. Click "Materialize" to create the progression bundle
8. Run "Sync Spreadsheet" from Quick Actions to refresh screenshots
9. Open the toolkit's Level Manager to see the new progression tab

## Related docs

- See `docs/BUNDLES_AND_MIXES.md` for the bundle folder structure
- See `docs/WORKFLOWS.md` for the full sync and export workflows
- See `docs/SERVER_API_REFERENCE.md` for the action endpoint reference

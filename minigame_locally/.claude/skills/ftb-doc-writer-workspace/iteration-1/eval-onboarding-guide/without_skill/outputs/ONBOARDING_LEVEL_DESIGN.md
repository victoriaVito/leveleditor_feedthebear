# Level Design Onboarding Guide
## Feed the Bear / Soda Mobile Puzzle Game

Welcome to the Feed the Bear level design team! This guide walks you through the complete workflow for creating a level in the editor, testing it, and adding it to a game progression.

---

## Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Understanding the Basics](#understanding-the-basics)
3. [Part 1: Creating Your Level in the Editor](#part-1-creating-your-level-in-the-editor)
4. [Part 2: Testing Your Level](#part-2-testing-your-level)
5. [Part 3: Saving & Archiving](#part-3-saving--archiving)
6. [Part 4: Adding to a Progression](#part-4-adding-to-a-progression)
7. [Troubleshooting & Tips](#troubleshooting--tips)

---

## Prerequisites & Setup

### What You Need
- Access to the Feed the Bear level toolkit running locally
- Familiarity with the game rules (pair matching, board solving)
- An understanding of difficulty tiers (1–10, from easiest to hardest)

### Starting the Toolkit
The level editor lives in the web interface at `level_toolkit_web/app.js`. To launch it:

1. Open the server in a terminal from the project root:
   ```bash
   npm start
   # or node server.mjs
   ```
2. Navigate to `http://localhost:8080` in your browser.
3. You should see the **Feed the Bear Toolkit** with a left sidebar showing five views: **Procedural**, **Level Editor + Play**, **Play Sessions**, **Level Manager**, and **Settings**.

### Key Files to Know
- **Editor & Logic**: `level_toolkit_web/app.js` (monolithic frontend application)
- **Server**: `server.mjs` (handles file I/O and Google Sheets sync)
- **Level Storage**: `levels/` (canonical JSON files)
- **Screenshots**: `levels/screenshots/` (PNG previews of each level)
- **Progressions**: `progressions/` (definitions of level sequences)
- **Bundles**: `bundles/` (exported progression packages)

### Documentation to Skim
Before you start designing, skim these documents for context:
- `docs/TOOLKIT_ARCHITECTURE.md` — overview of the editor's module structure
- `docs/LEVEL_JSON_SCHEMA.md` — the JSON format your level will use
- `docs/WORKFLOWS.md` — high-level workflow steps (Section A covers your path)
- `docs/BUNDLES_AND_MIXES.md` — how progressions and bundles are organized

---

## Understanding the Basics

### Game Rules (TL;DR)
- **Board**: A grid of colored cells (4×4 to 9×9 cells in Feed the Bear).
- **Pairs**: A set of matching fish pairs (labeled A, B, C, etc.). Each pair has two endpoints on the board.
- **Goal**: Connect each pair of fish in a single unbroken path without overlapping or crossing other paths.
- **Blockers**: Optional locked cells that cannot be traversed.
- **Moves**: The move budget shown to the player (for reference; not enforced by the toolkit).

### Difficulty Tiers & Density
Levels are rated 1–10 by difficulty tier. Each tier suggests:
- **Board size** (4×4 to 6×6 for most tiers)
- **Pair count** (2–4 pairs)
- **Blocker count** (0–5 blockers)
- **Density label** (e.g., HIGH, MEDIUM, LOW) — derived from the number of solutions

| Tier | Density | Examples |
|------|---------|----------|
| 1–2 | HIGH | Many solutions; forgiving for new players |
| 3–4 | MEDIUM-HIGH / MEDIUM | Some solutions; moderate challenge |
| 5–6 | MEDIUM / MEDIUM-LOW | Few solutions; harder |
| 7–8 | LOW / VERY-LOW | Very few solutions; expert |
| 9–10 | SINGLE / LOW-MEDIUM | Tight constraints; highly constrained |

See `LEVEL_JSON_SCHEMA.md` and the curve presets in `app.js` for the canonical tier definitions.

### Level JSON Structure (Quick Reference)
Every level is saved as a JSON file with this core structure:

```json
{
  "id": "my_level_name",
  "difficultyTier": 4,
  "gridSize": { "cols": 6, "rows": 6 },
  "moves": 18,
  "pairs": [
    {
      "type": "blue",
      "a": { "x": 0, "y": 0 },
      "b": { "x": 5, "y": 5 }
    },
    {
      "type": "red_striped",
      "a": { "x": 2, "y": 1 },
      "b": { "x": 4, "y": 4 }
    }
  ],
  "blockers": [
    { "x": 3, "y": 3 }
  ],
  "solutionCount": 3,
  "targetDensity": "MEDIUM",
  "goldenPath": {
    "A": [[0,0], [0,1], [1,1], [1,2], [2,2], [3,2], [4,2], [5,2], [5,3], [5,4], [5,5]],
    "B": [[2,1], [2,2], [3,2], [3,3], [3,4], [4,4]]
  },
  "validation": {
    "solvable": true,
    "density_match": true,
    "decal_required": false,
    "decal_pass": null,
    "early_mistake_detection": true,
    "no_isolated_pairs": true,
    "no_late_dead_ends": true,
    "curve_integrity": true
  },
  "meta": {
    "source_name": "My Level Name",
    "failed_checks": []
  }
}
```

The `goldenPath` object maps each pair letter (A, B, C, etc.) to a list of board cells `[row, col]` that form a valid connecting path.

---

## Part 1: Creating Your Level in the Editor

### Step 1: Navigate to the Editor

1. Click the **Level Editor + Play** tab in the left sidebar.
2. You'll see:
   - A **canvas** where you draw the board and place pairs
   - **Editor controls** on the right (grid size, pair list, blockers list, buttons)
   - A **play mode** toggle and validation status

### Step 2: Set Board Size

1. In the editor controls, find **Grid Size**.
2. Choose your board dimensions:
   - **Width (cols)** and **Height (rows)** between 4 and 9
   - For a beginner-friendly level, start with 5×5 or 6×6
3. You can adjust this later if needed.

### Step 3: Place Your Pairs

1. **Add a pair**: Click the **"+ Add Pair"** button or similar in the editor.
2. **Choose a fish type**: Select from the color palette (red, blue, green, yellow, orange, purple, cyan, with solid and striped variants).
   - The toolkit assigns pair labels (A, B, C, etc.) automatically in order.
3. **Place the first endpoint (a)**:
   - Click on a cell in the board canvas to set the position.
   - The cell will highlight with the pair's color.
4. **Place the second endpoint (b)**:
   - Click on another cell to complete the pair.
   - A dashed line may appear showing the pair is defined.
5. **Repeat** for each pair in your level (typically 2–4 pairs for a solvable level).

### Step 4: Add Blockers (Optional)

1. In the editor controls, find **Blockers** or similar section.
2. Click cells on the canvas to toggle them as blocked.
   - Blocked cells appear darker or with a special marking.
   - Players cannot pass through blocked cells.
3. Start with **0–2 blockers** for easier levels, up to **5 for very hard levels**.

### Step 5: Set Difficulty and Moves

1. **Difficulty Tier**: Select a tier from 1–10.
   - This affects how the level is categorized in progressions.
   - Use the tier definition table as a guide (see above).
2. **Moves**: Enter a move budget for reference.
   - This is shown to the player but not enforced by the game engine.
   - A safe rule: start with `(pairs × 4) + 2` as a baseline.

### Step 6: Review Your Level

1. Look at the **validation status** in the editor.
   - A green checkmark or **"Passes validation"** message is good.
   - Any failures will list the issues (e.g., unsolvable, isolated pairs).
2. Use the **screenshot button** (if available) to capture a PNG preview.
   - This preview will sync with the level JSON when saved.

---

## Part 2: Testing Your Level

### Step 1: Enter Play Mode

1. In the **Level Editor + Play** view, toggle **Play Mode** on.
   - Alternatively, click a **"Play"** button.
2. The board will switch to play mode. You should see:
   - Colored pair endpoints ready to be connected
   - A move counter (if applicable)

### Step 2: Solve Your Level

1. **Click and drag** from one endpoint of a pair to the other endpoint.
   - The path highlights as you drag.
   - The move count decreases with each cell you traverse.
2. **Complete all pairs** without overlapping or crossing paths.
3. **Win condition**: When all pairs are connected without conflicts, the level is solved.

### Step 3: Evaluate Difficulty

1. **Is it too easy?**
   - If you solve it in one or two attempts with little thought, lower the difficulty tier.
   - Consider adding a blocker to increase challenge.
2. **Is it too hard or impossible?**
   - If you cannot find a solution after a few tries, the level may be unsolvable.
   - Check the **validation messages** in the editor for hints.
   - Add paths by removing blockers or adjusting pair positions.
3. **Does the move budget feel right?**
   - Adjust the `moves` field to match your expected solve time.

### Step 4: Iterate

1. Exit play mode and return to editor mode.
2. Adjust pairs, blockers, or grid size as needed.
3. Re-enter play mode to test again.
4. Repeat until the level feels right.

---

## Part 3: Saving & Archiving

### Step 1: Save the Level

1. In the **Level Editor + Play** view, click **Save** or **Save As New**.
   - **Save**: Overwrites the current level file.
   - **Save As New**: Creates a new level with a new filename.
2. The editor will prompt you for a **level name**.
   - Use a descriptive, lowercase name with underscores: `progression_a_level_5`, `tutorial_level_2`, etc.
   - Avoid spaces and special characters (except underscores).
3. Click **Save** to confirm.
   - The file is written to `levels/<name>.json` via the server.
   - A message in the editor log will confirm: `"Saved to levels/<name>.json"`.

### Step 2: Verify the Files

1. Open a terminal and check:
   ```bash
   ls -la levels/<name>.json
   ls -la levels/screenshots/<name>.png
   ```
2. Both files should exist:
   - **JSON file**: Contains your level definition.
   - **PNG screenshot**: A visual preview of the board.

### Step 3: Take a Screenshot (If Not Auto-Generated)

1. If the screenshot does not exist, click the **Screenshot** button in the editor.
2. The server will capture a PNG and save it to `levels/screenshots/<name>.png`.

---

## Part 4: Adding to a Progression

A **progression** is a sequence of levels that players experience in order (e.g., Tutorial, Progression A Levels 1–30, etc.). Once your level is saved, you can add it to a progression.

### Step 1: Navigate to the Level Manager

1. Click the **Level Manager** tab in the left sidebar.
2. You'll see:
   - A **list of progressions** (e.g., Progression A, Progression B, Tutorial)
   - A **grid or table of levels** for the selected progression
   - **Pool, Extra, and Discarded** tabs for organizing levels

### Step 2: Choose or Create a Progression

1. If your progression already exists, click its name to load it.
2. If you need a new progression:
   - Look for an **"Add Progression"** button or similar.
   - Enter a progression name and proceed.

### Step 3: Add Your Level to a Slot

1. Find an empty slot or a slot you want to replace in the progression grid.
2. **Search or browse** for your newly saved level:
   - Use the **search box** to find your level by name.
   - Or browse the **Pool** tab for levels not yet placed.
3. **Drag and drop** your level into the slot, or click to assign it.
   - The slot will update to show your level's name, difficulty, board size, and pair count.

### Step 4: Lock (Optional)

1. If you want to prevent this level from being moved or overwritten:
   - Right-click the slot or find a **"Lock"** button.
   - Mark the slot as locked.
2. Locked slots are protected during future edits.

### Step 5: Export the Progression

1. Find the **Export** button in the Level Manager.
2. The toolkit will:
   - Bundle the progression into a CSV and JSON files.
   - Write the progression definition to `progressions/` (if needed).
   - Create or update the bundle under `bundles/original_progression_<name>/`.
3. Expected files after export:
   - `bundles/original_progression_<name>/jsons/` — level JSON files
   - `bundles/original_progression_<name>/screenshots/` — PNG previews
   - `bundles/original_progression_<name>/original_progression_<name>_progression.csv` — slot summary
   - `bundles/original_progression_<name>/original_progression_<name>_progression_layout.png` — visual layout

### Step 6: Sync to Google Sheets (Optional)

If your team uses Google Sheets for level tracking:

1. In the **Settings** tab, ensure Google Sheets auth is configured.
   - Click **"Setup OAuth"** if needed; follow the on-screen steps.
2. Return to the **Level Manager** and find the **Sync to Sheets** button.
3. The toolkit will:
   - Regenerate the workbook (`output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx`).
   - Push the progression data to Google Sheets via API.
4. Check the live spreadsheet to verify your level appears in the correct slot with a screenshot.

---

## Troubleshooting & Tips

### Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Level is not solvable" | No valid path connects all pairs | Remove blockers or adjust pair positions; use play mode to test |
| "Density does not match tier" | Solution count is off | Adjust blockers or pair positions to increase/decrease solution count |
| "Isolated pair" | One pair has no valid path | Ensure both endpoints are reachable; remove blockers if needed |
| "Late dead end" | A solution path leads to a dead end | Adjust blockers or board size |

### Play Mode Tips

- **Undo not available**: Each play session is independent. If you make a mistake, exit and re-enter play mode.
- **Move counter**: The counter is visual only; it does not block solving. Adjust the `moves` field manually if needed.
- **Path crossing**: Paths cannot cross or overlap. Plan your routes carefully.

### Performance & Settings

If the editor feels slow or laggy:

1. Click **Settings** tab.
2. Find **Performance Profile** and lower it (if available).
3. Reduce the number of undo states or increase canvas resolution if needed.

### Naming Conventions

- Use **lowercase letters and underscores**: `progression_a_level_5`, `tutorial_01`, `challenge_boss_1`.
- Avoid spaces, special characters, and uppercase letters.
- This ensures compatibility with filenames, URLs, and scripts.

### Pair Color Sequence

The toolkit assigns fish colors in order:

A = Red
B = Red Striped
C = Blue
D = Blue Striped
E = Green
F = Green Striped
G = Yellow
H = Yellow Striped
I = Orange

(And stripes continue: Orange Striped, Purple, Purple Striped, Cyan, Cyan Striped)

Use distinct, readable colors in your design. Avoid placing pairs of the same color too close together.

### Workflow Diagram

```
[Create Level in Editor]
    ↓
[Test in Play Mode]
    ↓
[Fix Validation Errors]
    ↓
[Save to levels/]
    ↓
[Verify JSON + PNG Files]
    ↓
[Add to Progression in Level Manager]
    ↓
[Export Progression Bundle]
    ↓
[Sync to Google Sheets] (Optional)
```

---

## Next Steps

Once you're comfortable with this workflow:

1. **Learn procedural generation** (see `docs/WORKFLOWS.md`, Section C).
2. **Explore playtest feedback** (Play Sessions tab) to understand player difficulty perception.
3. **Study existing progressions** in `bundles/` to see how experienced designers structure curves.
4. **Experiment with blockers and board sizes** to find your design style.

---

## Quick Reference: Key Hotkeys & Buttons

| Action | Control |
|--------|---------|
| Add Pair | "+ Add Pair" button in editor |
| Remove Pair | Click pair name, then "Remove" or similar |
| Add Blocker | Click cell on canvas (if in blocker mode) |
| Remove Blocker | Click blocker cell again |
| Toggle Play Mode | "Play" button in editor |
| Save Level | "Save" button (overwrites current) |
| Save As New | "Save As New" button (creates new file) |
| Take Screenshot | "Screenshot" button |
| Validate Level | "Validate" button (if available) |
| Change Grid Size | Grid Size controls in editor |

---

## Getting Help

- **Stuck on level design?** Check `docs/LEVEL_JSON_SCHEMA.md` for detailed field descriptions.
- **Workflow questions?** Refer to `docs/WORKFLOWS.md`, especially Section A ("I designed a new level in the editor—now what?").
- **Architecture questions?** See `docs/TOOLKIT_ARCHITECTURE.md` for a deeper dive into the editor code.
- **Progression & bundles?** See `docs/BUNDLES_AND_MIXES.md` for organizational concepts.

Good luck, and happy level designing!

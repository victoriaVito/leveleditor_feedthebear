# Onboarding Guide: Creating a Level, Testing It, and Adding It to a Progression

Welcome to the Feed the Bear level design workflow! This guide walks you through the complete process: creating a new level in the web toolkit, testing it, and placing it into an Original Progression. The entire workflow lives in the web-based **toolkit** at `level_toolkit_web/app.js`, which connects to a local **server.mjs** for file operations.

## 1. Start the Toolkit

### 1.1 Prerequisites

- Node.js installed
- The project repository cloned locally
- A terminal open in the project root directory

### 1.2 Boot the Server

The server runs on port 3000 and serves both the toolkit UI and file operations.

```bash
npm run dev
```

Expected output: the terminal shows the server listening on `http://localhost:3000`.

### 1.3 Open the Toolkit in Your Browser

Navigate to:

```
http://localhost:3000
```

You should see the toolkit sidebar with five tabs:
- **Procedural** (reference-driven generation lab)
- **Level Editor + Play** (manual authoring)
- **Play Sessions** (review queue)
- **Level Manager** (progression planning)
- **Settings** (configuration)

## 2. Create a New Level in the Editor

### 2.1 Open the Level Editor + Play Tab

Click the **Level Editor + Play** tab in the sidebar. You will see:
- An editing canvas on the left (the game board)
- A play-mode canvas on the right (for testing)
- Controls and buttons above

### 2.2 Set Your Board Size

The board size determines the grid dimensions. Common sizes:
- **8x8** (small, quick)
- **9x9** (medium, standard)
- **10x10** (large, complex)

Look for the board-size control in the editor. Set your desired dimensions before you start placing pieces.

### 2.3 Place Fish Pairs

Fish are the movable pieces in Feed the Bear / Soda. Each level has a certain number of **pairs** (the target count of fish to collect).

To place a pair:

1. Click on the canvas to add a pair.
2. You will see two connected fish appear.
3. Use the color palette to assign colors. The project uses a canonical 14-color fish palette (see `FISH_COLORS_SYSTEM.md` for details).
4. Repeat until you have the target number of pairs for your level.

### 2.4 Place Blockers (Optional)

Blockers are obstacles that block movement. They are optional but add puzzle difficulty.

To place a blocker:

1. Select the blocker tool.
2. Click on the canvas to place it.
3. You can delete blockers by clicking them again if needed.

### 2.5 Validate Your Level

Before saving, validate the level to ensure it has valid solutions.

1. Click the **Validate** button.
2. The editor will analyze the board and report:
   - Whether the level has at least one solution
   - The difficulty tier (1–5)
   - Feature tags (e.g., "forced swap", "wall bounce")
3. Address any validation errors. A level must have at least one solution.

### 2.6 Test Your Level in Play Mode

Before saving, playtest your level to make sure it feels right.

1. Click the **Play** button or switch to the play canvas on the right.
2. Drag fish pairs to move them.
3. Try to reach the goal (collect all pairs).
4. Use the **Reset** button to restart the playtest without saving.

Once you are confident the level plays well, proceed to save.

## 3. Save Your Level to the Project

### 3.1 Generate a Filename

The level will be saved to `levels/<filename>.json`. Choose a descriptive filename that follows the project convention:

Good names:
- `progression_a_level_1.json`
- `original_progression_b_slot_25.json`
- `tutorial_level_intro.json`

Avoid:
- Generic names like `level.json` or `test.json`
- Spaces or special characters (use underscores)
- Absolute paths or paths outside `levels/`

### 3.2 Use Save As New (or Update Existing)

In the editor control panel:

- **Save As New**: creates a new level JSON file in `levels/`. Use this for a fresh level.
- **Save**: overwrites the current loaded level (if one is open). Use this if you are iterating on an existing design.

To save:

1. Enter your desired filename (without the `.json` extension).
2. Click **Save As New** (or **Save** if updating an existing level).
3. Check the editor log for confirmation: you should see a message with the file path, e.g., `Saved to: levels/my_level.json`.

### 3.3 Verify the Files Were Written

After saving:

1. A **level JSON** file is written to `levels/<filename>.json`.
2. A **screenshot PNG** is automatically generated and written to `levels/screenshots/<filename>.png`.

You can verify these files exist by checking the filesystem, or by viewing the editor log.

## 4. Add Your Level to a Progression

An **Original Progression** is one of the three authored level families (Progression A, Progression B, Progression C). A progression is a sequence of slots, each slot containing one level.

### 4.1 Open the Level Manager

Click the **Level Manager** tab in the sidebar. You will see:

- A **Planner** section showing the progression slots and their current level assignments.
- A **Pool** section showing available levels you can drag into slots.
- Tabs for each progression (A, B, C).

### 4.2 Select Your Target Progression

At the top of the Level Manager, click the tab for the progression you want to edit:
- **Progression A**
- **Progression B**
- **Progression C**

### 4.3 Drag Your Level Into a Slot

To place your level in a specific slot:

1. In the **Pool** section, find your newly saved level in the list.
2. Drag it to the **Planner** grid at the desired slot position.
3. You should see the level appear in that slot with its screenshot and metadata.

Alternatively, if you prefer the workflow:

1. Click an empty slot in the Planner.
2. A selector will appear.
3. Search for or select your level from the available levels.
4. Confirm the assignment.

### 4.4 Review the Slot Assignment

Once placed, verify:
- The level appears in the correct slot number.
- The screenshot is visible.
- The difficulty tier and pair count are displayed correctly.

### 4.5 Lock the Slot (Optional)

If you want to prevent accidental changes to this slot, click the **Lock** icon. Locked slots cannot be modified until unlocked.

## 5. Export and Sync Your Progression

After placing your level in the progression, you need to export the progression and sync it with the project's canonical state.

### 5.1 Export the Progression

In the Level Manager toolbar:

1. Click **Export Progression**.
2. The toolkit will bundle the progression into `bundles/original_progression_<letter>/` with the level JSONs, screenshots, CSV summary, and curve visualization.
3. Check the editor log for confirmation.

### 5.2 Verify the Bundle

After export, verify the files:

- Check that `bundles/original_progression_<letter>/jsons/<filename>.json` exists.
- Check that `bundles/original_progression_<letter>/screenshots/<filename>.png` exists.
- Check that `bundles/original_progression_<letter>/original_progression_<letter>_progression.csv` was updated with your new level.

### 5.3 Sync with the Spreadsheet

To sync the progression to Google Sheets and update the canonical workbook:

```bash
npm run sync:sheets:local
```

This command:

1. Rebuilds the canonical workbook from the current bundle state.
2. Pushes the workbook payload to Google Sheets.
3. Refreshes the spreadsheet with the updated progression data.

Expected result: your level now appears on the spreadsheet's "All Progressions" tab with its screenshot, slot, difficulty, and pair count.

## 6. Validate Your Work

### 6.1 Check the Level JSON

Open `levels/<filename>.json` in a text editor to confirm the structure:

```json
{
  "name": "Your Level Name",
  "board": { "width": 9, "height": 9 },
  "pairs": [
    { "x": 2, "y": 3, "color": 0 },
    { "x": 5, "y": 6, "color": 1 }
  ],
  "blockers": [
    { "x": 1, "y": 1 }
  ],
  "moves": 15,
  "difficulty": 2
}
```

For the full level JSON schema, see `docs/LEVEL_JSON_SCHEMA.md`.

### 6.2 Verify the Progression State

In the Level Manager, confirm:
- Your level is in the correct slot.
- The slot displays the correct board size, pair count, and difficulty.
- The progression tab shows all levels in order.

### 6.3 Check the Spreadsheet

After syncing, open the Google Sheets tab called "All Progressions":
- Your level should appear in the correct progression row.
- The row should show your level's filename, screenshot, board size, pair count, difficulty, and status.

## 7. Common Workflows and Troubleshooting

### I saved a level but it is not appearing in the toolkit.

**Solution**: Refresh the browser (F5 or Cmd+R). The toolkit loads the level list on startup.

### The level is in the Pool but I cannot drag it to a slot.

**Solution**: Check that the level has a valid filename and is stored in `levels/`. If needed, click **Reload Levels** in the Settings tab to refresh the pool.

### The spreadsheet still shows the old progression after syncing.

**Solution**: Make sure the sync command completed without errors. Check the terminal for error messages. If needed, manually refresh the spreadsheet tab in the browser.

### My level failed validation.

**Solution**: Reopen the level in the editor and verify:
- It has at least one solution (paths exist from all fish to the goal).
- No pairs are blocked indefinitely by walls or each other.
- Use the **Validate** button again to see the latest error report.

### I placed a level in the wrong slot.

**Solution**: In the Level Manager, drag the level to the correct slot, or click the slot and select a different level from the selector. Changes take effect immediately.

## 8. Next Steps

Now that you have created and placed a level:

1. **Iterate**: load the level into the editor, refine the puzzle, and save your changes. The manager will reflect updates automatically.
2. **Review in Play Sessions**: load your progression into the **Play Sessions** tab to playtest the full sequence and gather feedback.
3. **Adjust Difficulty**: if the level feels too easy or too hard, return to the editor, adjust the pair count or blocker placement, validate, and save. The manager will update.
4. **Explore Procedural Generation**: once you are comfortable with manual authoring, try using the **Procedural** tab to generate and review AI-driven level candidates. You can approve or discard suggestions to build a learning loop.

For operational workflows, see `docs/WORKFLOWS.md`. For the full toolkit architecture, see `docs/TOOLKIT_ARCHITECTURE.md`.

## 9. Key References

| Document | Purpose |
|---|---|
| `docs/TOOLKIT_ARCHITECTURE.md` | In-depth toolkit architecture, state objects, and integration points. |
| `docs/WORKFLOWS.md` | Step-by-step operational workflows for advanced tasks (syncing, renaming, procedural generation). |
| `docs/LEVEL_JSON_SCHEMA.md` | Canonical level JSON field reference and schema. |
| `docs/BUNDLES_AND_MIXES.md` | Bundle structure, progression organization, and export paths. |
| `FISH_COLORS_SYSTEM.md` | Canonical fish color palette and visual identity. |
| `docs/PLAYTEST_SYSTEM.md` | How to record and use playtest feedback. |
| [Notion — Level Design](https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728) | Design voice, quality layers, and difficulty model. |

## 10. Pending [VERIFY] Flags

- `[VERIFY: Board size constraints]` — The toolkit accepts any width/height. Are there minimum or maximum sizes enforced by the game engine?
- `[VERIFY: Blocker placement rules]` — Can blockers be placed on top of fish pairs, or must they be on empty cells?
- `[VERIFY: Tutorial level requirements]` — Does every progression require a Tutorial level in slot 0, and how is it specified in the manager?

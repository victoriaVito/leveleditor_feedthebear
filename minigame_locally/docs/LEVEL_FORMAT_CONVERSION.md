# 📋 Level Format Conversion - Old → New Developer Format

## Transformation Summary

All 39 level files have been successfully converted from the old format to the new developer format.

### Before (Old Format)

```json
{
  "level": 6,
  "board_size": 5,
  "grid": [...],
  "pairs": [
    {
      "id": "A",
      "start": [1, 3],
      "end": [3, 2],
      "color": "#0EA5E9",
      "fish_color_id": "fish_blue",
      "color_letter": "C"
    }
  ],
  "blockers": [[0, 3], [0, 1]],
  "moves": 12,
  "solution_count": 20
}
```

### After (New Developer Format)

```json
{
  "id": "lvl_025_image16_level_editor",
  "difficultyTier": 5,
  "gridSize": {
    "cols": 5,
    "rows": 5
  },
  "moves": 12,
  "pairs": [
    {
      "type": "blue",
      "a": { "x": 1, "y": 3 },
      "b": { "x": 3, "y": 2 }
    },
    {
      "type": "cyan",
      "a": { "x": 1, "y": 1 },
      "b": { "x": 1, "y": 4 }
    },
    {
      "type": "red",
      "a": { "x": 0, "y": 0 },
      "b": { "x": 2, "y": 1 }
    }
  ],
  "blockers": [
    { "x": 0, "y": 3 },
    { "x": 0, "y": 1 }
  ]
}
```

## Key Changes

| Old Field | New Field | Notes |
| --- | --- | --- |
| `level` | `id` | Now uses full filename as ID |
| `board_size` | `gridSize: {cols, rows}` | Explicit columns and rows |
| - | `difficultyTier` | Auto-calculated from grid size |
| `pairs[].start` | `pairs[].a` | Object format `{x, y}` |
| `pairs[].end` | `pairs[].b` | Object format `{x, y}` |
| `pairs[].fish_color_id` | `pairs[].type` | Only the color name (e.g., "red" not "fish_red") |
| `blockers: [[x,y]]` | `blockers: [{x,y}]` | Object format |
| `grid` field | Removed | Not needed in new format |
| `color` (hex) field | Removed | Not needed in new format |
| `color_letter` | Removed | Not needed in new format |

## Fish Type Names

The `type` field uses simplified names without the "fish_" prefix:

```text
"red"              (was fish_red)
"red_striped"      (was fish_red_striped)
"blue"             (was fish_blue)
"blue_striped"     (was fish_blue_striped)
"green"            (was fish_green)
"green_striped"    (was fish_green_striped)
"yellow"           (was fish_yellow)
"yellow_striped"   (was fish_yellow_striped)
"orange"           (was fish_orange)
"orange_striped"   (was fish_orange_striped)
"purple"           (was fish_purple)
"purple_striped"   (was fish_purple_striped)
"cyan"             (was fish_cyan)
"cyan_striped"     (was fish_cyan_striped)
```

## Files Converted

✅ **39/39 level files** successfully converted

### Backups

Old format backups are saved as:

- `levels/.backups/lvl_*.json.old-format`

### Example Converted Files

- [lvl_025_image16_level_editor.json](../levels/lvl_025_image16_level_editor.json)
- [lvl_012_image02_level_editor.json](../levels/lvl_012_image02_level_editor.json)
- [lvl_043_image34_level_editor.json](../levels/lvl_043_image34_level_editor.json)

## Usage in Developer Code

```javascript
// Load level
const level = {
  id: "lvl_025",
  difficultyTier: 5,
  gridSize: { cols: 5, rows: 5 },
  moves: 12,
  pairs: [
    { type: "blue", a: {x: 1, y: 3}, b: {x: 3, y: 2} }
  ]
};

// Access properties
console.log(level.id);             // "lvl_025"
console.log(level.gridSize.cols);  // 5
console.log(level.pairs[0].type);  // "blue"
console.log(level.pairs[0].a.x);   // 1
```

## Additional Fields

Some original fields are preserved if they exist:

- `solutionCount` (from `solution_count`)
- `targetDensity` (from `target_density`)
- `goldenPath` (from `golden_path`)
- `meta` (custom metadata)
- `description` (if present)

## Conversion Command

To run the conversion again (if needed):

```bash
npm run levels:convert
```

---

**Conversion Date:** 2026-03-20
**Format Version:** 2.0 (Developer Format)
**Status:** ✅ Complete

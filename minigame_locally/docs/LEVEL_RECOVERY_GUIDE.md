# Level Recovery & Validation Guide

## Problem History

On **March 23, 2026**, several level files were corrupted during an import operation:

- `progression1_level5.json` through `progression1_level10.json`
- Plus test files: `catalog_index.json`, `play_session_level_9_validate.json`

**Root cause**: Incomplete write during failed import. System wrote template files with `null` values instead of rolling back.

**Resolution**: Restored from backup copies in `levels/progression1/` subfolder.

---

## Recovery Scripts

### 1. Validate All Levels

Checks for structural corruption and data integrity.

```bash
node scripts/validate-levels.mjs
```

**Output**:

- ✓ Lists all valid files
- ✗ Lists corrupted files with specific errors
- Exits with code 0 if all pass, 1 if failures

**Validation Rules**:

- `id` field present and non-empty
- `gridSize.cols` is a number between 4-9
- `gridSize.rows` is a number between 4-9
- `gridSize` does NOT contain null values
- `pairs` array is non-empty with valid objects
- `moves` is a non-negative number

---

### 2. Auto-Recover Corrupted Files

Automatically finds and restores corrupted levels from backups.

```bash
# Interactive mode (3-second countdown before recovery)
node scripts/auto-recover-corrupted-levels.mjs

# Automatic mode (no prompts)
node scripts/auto-recover-corrupted-levels.mjs --auto
```

**Behavior**:

1. Scans `levels/` directory for corrupted files
2. Searches for valid backups in:
   - `levels/progression1/` folder
   - `levels/progression1/progression1_*.json` pattern
   - Handles typos: `progresion_` → `progression_`
3. If backup found:
   - Saves corrupted file as `.corrupted.TIMESTAMP.json`
   - Restores valid version
4. If no backup found:
   - Logs warning
   - Skips file (move to cleanup script)

**Output**: Shows before/after gridSize and pair counts

---

### 3. Cleanup Unrecoverable Files

Removes test/session files that are corrupted and have no valid backups.

```bash
# Dry-run (shows what would be deleted)
node scripts/cleanup-corrupted-levels.mjs --dry-run

# Actual cleanup
node scripts/cleanup-corrupted-levels.mjs
```

**Safety**:

- Only targets known test files:
  - `catalog_index.json`
  - `play_session_*_validate.json`
  - Files matching test patterns
- Verifies file is actually corrupted before deleting
- Does NOT touch playable levels

---

## Complete Recovery Workflow

```bash
# 1. Diagnose current state
node scripts/validate-levels.mjs

# If corrupted files found, proceed to 2-3:

# 2. Attempt automatic recovery
node scripts/auto-recover-corrupted-levels.mjs --auto

# 3. Clean up unrecoverable test files
node scripts/cleanup-corrupted-levels.mjs

# 4. Final validation to verify success
node scripts/validate-levels.mjs
```

Expected result: "All level files valid!"

---

## Backup Strategy

The project uses a **dual-folder architecture**:

- **`levels/`** - Primary location (active, may become corrupted)
- **`levels/progression1/`** - Backup location (preserved copies from initial import)

This proved invaluable for recovery. To maintain this pattern:

1. **Always keep `levels/progression1/` as source of truth** for progression levels
2. **Before major import operations**, validate first:

   ```bash
   node scripts/validate-levels.mjs
   ```

3. **After imports**, validate again:

   ```bash
   node scripts/validate-levels.mjs
   ```

---

## Prevention for Future

### What NOT to do

- ❌ Write `null` values to gridSize fields
- ❌ Create empty `pairs` arrays in actual levels
- ❌ Skip validation before/after imports

### What you SHOULD have

- ✅ Pre-import validation
- ✅ Post-import validation
- ✅ Atomic operations (validate before write, temp file, then move)
- ✅ Backup preservation
- ✅ Error logging

---

## Corrupted Format Reference

**Corrupted Files Look Like:**

```json
{
  "id": "progression1_level5",
  "difficultyTier": null,
  "gridSize": {
    "cols": null,
    "rows": null
  },
  "moves": null,
  "pairs": [],
  "solutionCount": "-",
  "targetDensity": "-"
}
```

**Valid Files Look Like:**

```json
{
  "id": "progression1_level5",
  "difficultyTier": 6,
  "gridSize": {
    "cols": 4,
    "rows": 4
  },
  "moves": 5,
  "pairs": [
    {
      "type": "blue",
      "a": {"x": 1, "y": 1},
      "b": {"x": 2, "y": 2}
    }
  ],
  "solutionCount": 20,
  "targetDensity": "HIGH",
  "goldenPath": { ... },
  "validation": { ... }
}
```

---

## Questions?

- **How do I know if a level is corrupted?**  
  Run `node scripts/validate-levels.mjs` - corrupted files will show ✗ with specific errors

- **Can I recover a single file?**  
  Yes, run with `--auto` and it will attempt recovery for all corrupted files

- **What happens to the corrupted original?**  
  It's saved as `filename.corrupted.TIMESTAMP.json` before restoration

- **Can I use these scripts on other directories?**  
  Yes, edit the `LEVELS_DIR` constant at the top of each script

---

**Last Updated**: March 23, 2026  
**Status**: ✅ All 163 level files validated and healthy

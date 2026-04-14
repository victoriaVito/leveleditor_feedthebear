# Feed the Bear Level JSON Schema

This document defines the canonical on-disk level format used by the checked-in files under `levels/`.

The toolkit can also read legacy/import-time aliases such as `board_width`, `board_height`, `board_size`, `solution_count`, `target_density`, and `golden_path`, but those are runtime compatibility forms handled by `level_toolkit_web/app.js`. They are not part of the canonical file schema described here.

## 1. Field Reference

### Progression Naming Rule (Validated Levels)

For levels assigned to progression slots and marked as validated (that is, not using `_needs_review`):

- Canonical filename must be `progression_<letter>_level<n>.json`
- Canonical `id` must match the filename stem exactly: `progression_<letter>_level<n>`
- Slot index must match `<n>` (for example, `slot: 7` must point to `progression_x_level7.json`)
- Progression letter must match the progression namespace (`progression_b` only uses `progression_b_level<n>.json`)

Conversion helpers used by toolkit rules:

- `a -> 1`, `b -> 2`, ..., `i -> 9` (letter to ordinal)
- `1 -> a`, `2 -> b`, ..., `9 -> i` (ordinal to letter)

`_needs_review` files are treated as non-validated candidates and are excluded from strict slot-equals-level enforcement until promoted to validated canonical naming.

### Grid Structure

| Field | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `id` | string | Yes | Canonical file stem without `.json`. Used as the stable level identifier. | `"progression_a_level3"` |
| `difficultyTier` | integer `1..10` | Yes | Numeric tier used by the toolkit and manager sorting. | `4` |
| `gridSize` | object | Yes | Board dimensions in developer format. | `{ "cols": 7, "rows": 7 }` |
| `gridSize.cols` | integer `4..7` | Yes | Board width in cells. | `7` |
| `gridSize.rows` | integer `4..8` | Yes | Board height in cells. | `7` |
| `moves` | integer `>= 0` | Yes | Move budget or move recommendation stored with the level. | `14` |
| `solutionCount` | integer `>= 0` | Yes | Count of valid solutions used for density checks. | `4` |
| `targetDensity` | string | Yes | Difficulty density label derived from solution count. | `"LOW-MEDIUM"` |
| `goldenPath` | object | Yes | Per-pair solved path map. Keys are pair letters (`A`..`G`); values are arrays of `[row, col]` cells. | `{ "A": [[2,3],[3,3]] }` |
| `decal` | boolean | No | Marks levels that require a full-board cover-style solution. Present in authored and procedural packs, omitted by some image-sourced levels. | `false` |
| `description` | string | No | Freeform note preserved by the serializer if present. [VERIFY: not observed in the checked-in samples.] | `"Tutorial remix"` |

### Fish / Pairs

| Field | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `pairs` | array | Yes | Ordered list of pair endpoints. Pair order defines the `goldenPath` keys. | `[...]` |
| `pairs[].type` | string enum | Yes | Canonical fish type without the `fish_` prefix. | `"blue"` |
| `pairs[].a` | object | Yes | First endpoint, stored as zero-based `{ x, y }` coordinates. `x` is column, `y` is row. | `{ "x": 3, "y": 0 }` |
| `pairs[].b` | object | Yes | Second endpoint, stored as zero-based `{ x, y }` coordinates. | `{ "x": 2, "y": 3 }` |
| `pairs[].a.x` / `pairs[].b.x` | integer `0..6` | Yes | Column coordinate. Must fit inside `gridSize.cols`. | `3` |
| `pairs[].a.y` / `pairs[].b.y` | integer `0..7` | Yes | Row coordinate. Must fit inside `gridSize.rows`. | `0` |

Canonical `pairs[].type` values:

`red`, `blue`, `green`, `yellow`, `orange`, `purple`, `cyan`

### Blockers

| Field | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `blockers` | array | No | Optional blocked cells. Omitted when empty in some checked-in files. | `[{"x": 2, "y": 2}]` |
| `blockers[].x` | integer `0..6` | Yes | Blocker column coordinate. | `2` |
| `blockers[].y` | integer `0..7` | Yes | Blocker row coordinate. | `2` |

### Metadata

| Field | Type | Required | Description | Source notes |
| --- | --- | --- | --- | --- |
| `meta` | object | Yes | Source and generation metadata. The object is intentionally open-ended because procedural packs add extra keys. | Common to all checked sources. |
| `meta.source_name` | string | No | Original file name or editor label. | Observed in authored, procedural, and image-sourced files. |
| `meta.failed_checks` | array of strings | No | Validation or generation checks that failed during creation. | Observed in all sampled sources. |
| `meta.manual_difficulty` | string | No | Human-authored difficulty label. | Observed in authored progression files. |
| `meta.generation_attempts` | integer | No | How many generation attempts were involved. | Observed in procedural and image-sourced files. |
| `meta.generated_at` | string | No | ISO timestamp for generator output. | Procedural-only in the samples. |
| `meta.generated_by` | string | No | Script or tool that produced the file. | Procedural-only in the samples. |
| `meta.generator_family` | string | No | Generator family identifier. | Procedural-only in the samples. |
| `meta.reference_source` | string | No | Base level or source level used for a procedural variant. | Procedural-only in the samples. |
| `meta.reference_transform` | string | No | Transform applied to the reference level. | Procedural-only in the samples. |
| `meta.reference_board_label` | string | No | Human-readable board label for the reference source. | Procedural-only in the samples. |
| `meta.board_label` | string | No | Human-readable label for the generated board. | Procedural-only in the samples. |
| `meta.canonical_id` | string | No | Canonical ID assigned during normalization. | Observed in procedural and image-sourced files. |
| `meta.canonical_file` | string | No | Canonical file name assigned during normalization. | Observed in procedural and image-sourced files. |
| `meta.canonical_slug` | string | No | Canonical slug assigned during normalization. | Observed in procedural and image-sourced files. |
| `meta.canonicalized_at` | string | No | ISO timestamp when the file was normalized into canonical form. | Observed in procedural and image-sourced files. |
| `meta.previous_files` | array of strings | No | Prior file locations that were folded into the canonical file. | Observed in procedural and image-sourced files. |
| `meta.pair_count` | integer | No | Pair count tracked by the procedural pack. | Procedural-only in the samples. |
| `meta.serial` | integer | No | Pack serial number. | Procedural-only in the samples. |
| `meta.learning_feedback_tags` | object | No | Aggregated feedback counts used by the learning loop. | Procedural-only in the samples. |
| `meta.manual_feedback_refresh` | string | No | Human note about procedural retuning. | Procedural-only in the samples. |
| `meta.generated_for_large_board_pack` | boolean | No | Marks large-board procedural packs. | Procedural-only in the samples. |
| `meta.not_supported_in_current_web_editor` | boolean | No | Marks files that the browser editor should not try to author directly. | Procedural-only in the samples. |
| `meta.approved_anchor_levels` | array of strings | No | Approved reference anchors for the generator. | Procedural-only in the samples. |
| `meta.rejected_sibling_levels` | array of strings | No | Rejected sibling variants tracked during tuning. | Procedural-only in the samples. |

### Difficulty And Validation

| Field | Type | Required | Description | Source notes |
| --- | --- | --- | --- | --- |
| `validation` | object | Yes | Validation summary produced by the toolkit or preserved from imported files. | Open-ended because procedural packs add extra checks. |
| `validation.solvable` | boolean | Yes | Whether the level has at least one valid solution. | Common to all sampled sources. |
| `validation.density_match` | boolean | Yes | Whether the solution count matches the target density label. | Common to all sampled sources. |
| `validation.decal_required` | boolean | Yes | Mirrors the level `decal` flag. | Present in authored/procedural files. |
| `validation.decal_pass` | boolean or null | Yes | Result of the decal-specific full-cover check, or `null` when not applicable. | Present in authored/procedural files. |
| `validation.early_mistake_detection` | boolean | Yes | Toolkit validation flag. | Present in authored/procedural files. |
| `validation.no_isolated_pairs` | boolean | Yes | Toolkit validation flag. | Present in authored/procedural files. |
| `validation.no_late_dead_ends` | boolean | Yes | Toolkit validation flag. | Present in authored/procedural files. |
| `validation.curve_integrity` | boolean | Yes | Toolkit validation flag. | Present in authored/procedural files. |
| `validation.reference_variant` | boolean | No | Marks reference-driven procedural variants. | Procedural-only in the samples. |
| `validation.path_coverage` | number `0..1` | No | Coverage score emitted by the generator. [VERIFY: emitted by `generateLevelRaw()` but not seen in the sampled checked-in files.] | Generator-only. |
| `validation.full_path_area` | boolean | No | Convenience flag derived from `path_coverage`. [VERIFY: emitted by `generateLevelRaw()` but not seen in the sampled checked-in files.] | Generator-only. |

## 2. JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Feed the Bear Level",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "id",
    "difficultyTier",
    "gridSize",
    "moves",
    "pairs",
    "solutionCount",
    "targetDensity",
    "goldenPath",
    "meta",
    "validation"
  ],
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "difficultyTier": { "type": "integer", "minimum": 1, "maximum": 10 },
    "gridSize": {
      "type": "object",
      "additionalProperties": false,
      "required": ["cols", "rows"],
      "properties": {
        "cols": { "type": "integer", "minimum": 4, "maximum": 7 },
        "rows": { "type": "integer", "minimum": 4, "maximum": 8 }
      }
    },
    "moves": { "type": "integer", "minimum": 0 },
    "pairs": {
      "type": "array",
      "minItems": 2,
      "maxItems": 9,
      "items": { "$ref": "#/definitions/pair" }
    },
    "blockers": {
      "type": "array",
      "items": { "$ref": "#/definitions/cell" }
    },
    "solutionCount": { "type": "integer", "minimum": 0 },
    "targetDensity": {
      "type": "string",
      "enum": [
        "HIGH",
        "MEDIUM-HIGH",
        "MEDIUM",
        "MEDIUM-LOW",
        "LOW",
        "VERY-LOW",
        "SINGLE",
        "LOW-MEDIUM"
      ]
    },
    "goldenPath": {
      "type": "object",
      "minProperties": 2,
      "additionalProperties": false,
      "patternProperties": {
        "^[A-I]$": { "$ref": "#/definitions/path" }
      }
    },
    "meta": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "source_name": { "type": "string" },
        "failed_checks": {
          "type": "array",
          "items": { "type": "string" }
        },
        "manual_difficulty": { "type": "string" },
        "generation_attempts": { "type": "integer" },
        "generated_at": { "type": "string" },
        "generated_by": { "type": "string" },
        "generator_family": { "type": "string" },
        "reference_source": { "type": "string" },
        "reference_transform": { "type": "string" },
        "reference_board_label": { "type": "string" },
        "board_label": { "type": "string" },
        "canonical_id": { "type": "string" },
        "canonical_file": { "type": "string" },
        "canonical_slug": { "type": "string" },
        "canonicalized_at": { "type": "string" },
        "previous_files": {
          "type": "array",
          "items": { "type": "string" }
        },
        "pair_count": { "type": "integer" },
        "serial": { "type": "integer" },
        "learning_feedback_tags": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "manual_feedback_refresh": { "type": "string" },
        "generated_for_large_board_pack": { "type": "boolean" },
        "not_supported_in_current_web_editor": { "type": "boolean" },
        "approved_anchor_levels": {
          "type": "array",
          "items": { "type": "string" }
        },
        "rejected_sibling_levels": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "validation": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "solvable": { "type": "boolean" },
        "density_match": { "type": "boolean" },
        "decal_required": { "type": "boolean" },
        "decal_pass": { "type": ["boolean", "null"] },
        "early_mistake_detection": { "type": "boolean" },
        "no_isolated_pairs": { "type": "boolean" },
        "no_late_dead_ends": { "type": "boolean" },
        "curve_integrity": { "type": "boolean" },
        "reference_variant": { "type": "boolean" },
        "path_coverage": { "type": "number", "minimum": 0, "maximum": 1 },
        "full_path_area": { "type": "boolean" }
      }
    },
    "decal": { "type": "boolean" },
    "description": { "type": "string" }
  },
  "definitions": {
    "cell": {
      "type": "object",
      "additionalProperties": false,
      "required": ["x", "y"],
      "properties": {
        "x": { "type": "integer", "minimum": 0, "maximum": 6 },
        "y": { "type": "integer", "minimum": 0, "maximum": 7 }
      }
    },
    "pair": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "a", "b"],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "red",
            "blue",
            "green",
            "yellow",
            "orange",
            "purple",
            "cyan"
          ]
        },
        "a": { "$ref": "#/definitions/cell" },
        "b": { "$ref": "#/definitions/cell" }
      }
    },
    "path": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "array",
        "minItems": 2,
        "maxItems": 2,
        "items": [
          { "type": "integer", "minimum": 0, "maximum": 7 },
          { "type": "integer", "minimum": 0, "maximum": 6 }
        ],
        "additionalItems": false
      }
    }
  }
}
```

## 3. Field Provenance

The canonical level files all share the same outer shape, but different parts of the pipeline own different fields.

| Source | Fields it usually owns |
| --- | --- |
| Manual authoring | `id`, `difficultyTier`, `gridSize`, `moves`, `pairs`, `blockers`, `decal`, `meta.source_name`, `meta.manual_difficulty`, `meta.failed_checks`, `goldenPath`, `validation` |
| Procedural generation | `solutionCount`, `targetDensity`, `goldenPath`, `validation.reference_variant`, and the procedural `meta.*` keys such as `generated_at`, `generated_by`, `generator_family`, `reference_source`, `learning_feedback_tags`, and `serial` |
| Image-sourced normalization | The same canonical shape, plus normalization metadata such as `meta.canonical_id`, `meta.canonical_file`, `meta.canonical_slug`, `meta.canonicalized_at`, and `meta.previous_files` |
| Toolkit enrichment | Validation summaries, file-name normalization, and runtime aliases used during import/export. The toolkit can also preserve `description` if it exists. [VERIFY: `description` is supported by the serializer, but no checked-in sample currently includes it.] |

### Runtime aliases handled by `app.js` but not part of the canonical schema

- `level`
- `board_size`
- `board_width`
- `board_height`
- `solution_count`
- `target_density`
- `golden_path`

These aliases exist so the toolkit can import old files and keep internal play/session exports working. Do not write them into canonical `levels/*.json` files.

## 4. Validation Rules Beyond Types

1. `gridSize.cols` must be between `4` and `7`, and `gridSize.rows` must be between `4` and `8`. The largest allowed board is `7x8`.
2. `pairs` must contain at least `2` pairs and at most `7` pairs.
3. `pairs[].type` must be one of the canonical seven colors: `red`, `blue`, `green`, `yellow`, `orange`, `purple`, `cyan`.
4. `pairs[].type` values must be unique inside the same level (no repeated color in one level).
5. Each pair endpoint must fit inside the grid bounds and the two endpoints of one pair must not overlap.
6. No pair endpoint may overlap another pair endpoint or a blocker.
7. `blockers` may be omitted when empty, but if present each blocker must fit inside the grid bounds and not overlap a pair endpoint.
8. `goldenPath` keys must match the pair order. In practice the keys are `A`..`G` and each path is a list of `[row, col]` cells.
9. `goldenPath` paths should contain at least the start and end cells for each pair.
10. `solutionCount` should be consistent with `validation.solvable` and `validation.density_match`.
11. If `decal` is `true`, `validation.decal_required` should also be `true`, and `validation.decal_pass` should be a boolean result rather than `null`.
12. `meta.failed_checks` should stay an array even when it is empty.
13. `validation.path_coverage` and `validation.full_path_area` are generator-derived extras and should be treated as optional, not guaranteed.
14. Canonical active progression files should follow `progression_<letter>_level<n>.json` once validated, and level `id` must match the file stem.
15. For validated progression slots, slot number and filename level number must match (slot `n` -> `progression_<letter>_level<n>.json`).
16. `_needs_review` files are transitional candidates only and must not be used as validated slot files.
17. Legacy or historical level folders should live under `levels/deprecated/` and are not part of the canonical progression validation set.

## 5. Examples

### Minimal canonical level

```jsonc
{
  "id": "tutorial_example_01",
  "difficultyTier": 1,
  "gridSize": { "cols": 4, "rows": 4 },
  "moves": 5,
  "pairs": [
    {
      "type": "blue",
      "a": { "x": 3, "y": 0 },
      "b": { "x": 2, "y": 3 }
    },
    {
      "type": "green",
      "a": { "x": 1, "y": 0 },
      "b": { "x": 0, "y": 2 }
    }
  ],
  "solutionCount": 20,
  "targetDensity": "HIGH",
  "goldenPath": {
    "A": [[0, 3], [3, 2]],
    "B": [[0, 1], [2, 0]]
  },
  "meta": {
    "source_name": "tutorial_example_01.json",
    "failed_checks": []
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
  }
}
```

### Representative procedural level

```jsonc
{
  "id": "procedural_example_004",
  "difficultyTier": 4,
  "gridSize": { "cols": 7, "rows": 7 },
  "moves": 14,
  "pairs": [
    {
      "type": "green",
      "a": { "x": 3, "y": 2 },
      "b": { "x": 0, "y": 3 }
    },
    {
      "type": "yellow",
      "a": { "x": 4, "y": 6 },
      "b": { "x": 6, "y": 1 }
    },
    {
      "type": "yellow",
      "a": { "x": 1, "y": 0 },
      "b": { "x": 0, "y": 2 }
    }
  ],
  "blockers": [
    { "x": 3, "y": 0 },
    { "x": 4, "y": 1 },
    { "x": 5, "y": 2 }
  ],
  "solutionCount": 4,
  "targetDensity": "LOW-MEDIUM",
  "goldenPath": {
    "A": [[2, 3], [3, 3], [3, 2], [3, 1], [3, 0]],
    "B": [[6, 4], [6, 5], [6, 6], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6]],
    "C": [[0, 1], [0, 0], [1, 0], [2, 0]]
  },
  "meta": {
    "generation_attempts": 1,
    "failed_checks": [],
    "generated_for_large_board_pack": true,
    "not_supported_in_current_web_editor": true,
    "canonical_id": "lvl_002",
    "canonical_file": "lvl_002_hard_large_01_7x7.json",
    "canonical_slug": "hard_large_01_7x7",
    "canonicalized_at": "2026-03-12T09:14:58.419Z",
    "previous_files": [
      "level_toolkit_web/workshop_jsons/hard_large_01_7x7.json",
      "levels/standalone/hard_large_01_7x7.json"
    ],
    "generator_family": "procedular_reference_variants_v2",
    "generated_by": "scripts/generate_large_procedular_pack.py",
    "generated_at": "2026-03-22T11:52:09.120558+00:00",
    "reference_source": "lvl_002_hard_large_01_7x7.json",
    "reference_transform": "flip_h",
    "reference_board_label": "7x7",
    "board_label": "7x7",
    "pair_count": 3,
    "serial": 4,
    "learning_feedback_tags": {
      "good_blocker_distribution": 1,
      "too_easy": 6,
      "too_much_space": 2
    },
    "manual_feedback_refresh": "Retuned after review.",
    "approved_anchor_levels": [
      "procedural_example_005",
      "procedural_example_008"
    ],
    "rejected_sibling_levels": [
      "procedural_example_001",
      "procedural_example_002"
    ]
  },
  "validation": {
    "solvable": true,
    "density_match": true,
    "early_mistake_detection": true,
    "no_isolated_pairs": true,
    "no_late_dead_ends": true,
    "curve_integrity": true,
    "reference_variant": true
  },
  "decal": false
}
```

## Pending [VERIFY] Flags

- `description` is preserved by `serializeLevelToDeveloperFormat()`, but no checked-in sample in the inspected sets currently uses it.
- `validation.path_coverage` and `validation.full_path_area` are emitted by `generateLevelRaw()`, but they were not present in the sampled checked-in files.

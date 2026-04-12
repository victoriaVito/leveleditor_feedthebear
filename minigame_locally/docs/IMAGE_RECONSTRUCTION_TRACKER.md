# Image Reconstruction Tracker

This file is the canonical tracker for level reconstruction work from image sources.

Reuse this file for future passes instead of creating dated or versioned copies.

## Purpose

- track which image files still need a level JSON reconstruction
- record which local screenshot sources are already materialized in the repo
- make blockers explicit when an image was shared in chat but is not available on disk

## Status Meanings

| Status | Meaning |
|---|---|
| `Materialized` | A matching repo JSON already exists for this image source. |
| `Pending` | The image exists locally but no matching repo JSON has been found yet. |
| `Blocked` | The image was referenced in conversation, but the source file is not currently available in the workspace. |

## Current Status

As of `2026-03-26`, reconstruction pass completed.

Current result:

- `31` original screenshots already materialized (unchanged)
- `23` after-feedback screenshots mapped to existing canonical JSONs (alias naming)
- `6` timestamped variants reconstructed from images: `p_2_4_new_*`, `p_2_5_new_*`, `p_2_6_new_*`, `p_2_9_new_*`, `p_4_c_new_*`, `level_2`
- `7` editor images reconstructed from screenshots: `image11` through `image28`
- `3` contact sheets / non-level images skipped
- `0` blocked (all images now available locally)
- Confluence child-page artifact can be regenerated at `output/confluence/reconstruction_compare_confluence_safe.html` via `python3 scripts/generate_reconstruction_confluence_page.py`

## Local Screenshot Audit

| Image Stem | Source Image | Matched Repo JSON | Status |
|---|---|---|---|
| `procedural_2_level_1_new_20260322234743` | `levels/screenshots/procedural_2_level_1_new_20260322234743.png` | `levels/progression_b/procedural_2_level_1_new_20260322234743.json` | `Materialized` |
| `procedural_a` | `levels/screenshots/procedural_a.png` | `levels/procedural_a.json` | `Materialized` |
| `progresion1_level2` | `levels/screenshots/progresion1_level2.png` | `levels/progresion1_level2.json` | `Materialized` |
| `progresion1_level6` | `levels/screenshots/progresion1_level6.png` | `levels/progresion1_level6.json` | `Materialized` |
| `progresion2_level1` | `levels/screenshots/progresion2_level1.png` | `levels/progresion2_level1.json` | `Materialized` |
| `progresion2_level10` | `levels/screenshots/progresion2_level10.png` | `levels/progresion2_level10.json` | `Materialized` |
| `progresion2_level2` | `levels/screenshots/progresion2_level2.png` | `levels/progresion2_level2.json` | `Materialized` |
| `progresion2_level3` | `levels/screenshots/progresion2_level3.png` | `levels/progresion2_level3.json` | `Materialized` |
| `progresion2_level4` | `levels/screenshots/progresion2_level4.png` | `levels/progresion2_level4.json` | `Materialized` |
| `progresion2_level5` | `levels/screenshots/progresion2_level5.png` | `levels/progresion2_level5.json` | `Materialized` |
| `progresion2_level6` | `levels/screenshots/progresion2_level6.png` | `levels/progresion2_level6.json` | `Materialized` |
| `progresion2_level7` | `levels/screenshots/progresion2_level7.png` | `levels/progresion2_level7.json` | `Materialized` |
| `progresion2_level8` | `levels/screenshots/progresion2_level8.png` | `levels/progresion2_level8.json` | `Materialized` |
| `progresion2_level9` | `levels/screenshots/progresion2_level9.png` | `levels/progresion2_level9.json` | `Materialized` |
| `progression_3_level3` | `levels/screenshots/progression_3_level3.png` | `levels/progression_c/progression_3_level3.json` | `Materialized` |
| `progression_b_level_2` | `levels/screenshots/progression_b_level_2.png` | `levels/progression_b_level_2.json` | `Materialized` |
| `progression1_level1` | `levels/screenshots/progression1_level1.png` | `levels/progression1_level1.json` | `Materialized` |
| `progression1_level10` | `levels/screenshots/progression1_level10.png` | `levels/progression1_level10.json` | `Materialized` |
| `progression1_level3` | `levels/screenshots/progression1_level3.png` | `levels/progression_a/progression1_level3.json` | `Materialized` |
| `progression1_level4` | `levels/screenshots/progression1_level4.png` | `levels/progression_a/progression1_level4.json` | `Materialized` |
| `progression1_level5` | `levels/screenshots/progression1_level5.png` | `levels/progression_a/progression1_level5.json` | `Materialized` |
| `progression1_level7_v2` | `levels/screenshots/progression1_level7_v2.png` | `levels/progression1_level7_v2.json` | `Materialized` |
| `progression1_level7` | `levels/screenshots/progression1_level7.png` | `levels/progression1_level7.json` | `Materialized` |
| `progression1_level8` | `levels/screenshots/progression1_level8.png` | `levels/progression_a/progression1_level8.json` | `Materialized` |
| `progression1_level9` | `levels/screenshots/progression1_level9.png` | `levels/progression_a/progression1_level9.json` | `Materialized` |
| `progression2_level_1` | `levels/screenshots/progression2_level_1.png` | `levels/progression2_level_1.json` | `Materialized` |
| `progression2_level_2_new_20260323083628` | `levels/screenshots/progression2_level_2_new_20260323083628.png` | `levels/progression2_level_2_new_20260323083628.json` | `Materialized` |
| `progression2_level_2` | `levels/screenshots/progression2_level_2.png` | `levels/progression_b/progression2_level_2.json` | `Materialized` |
| `progression3_2` | `levels/screenshots/progression3_2.png` | `levels/progression3_2.json` | `Materialized` |
| `x_4` | `levels/screenshots/x_4.png` | `levels/progression_b/x_4.json` | `Materialized` |
| `x2_variant_3` | `levels/screenshots/x2_variant_3.png` | `levels/progression_b/x2_variant_3.json` | `Materialized` |

## Blockers

- The images mentioned in chat are not currently attached in this thread and were not found as new unmatched source files in the workspace.
- Reconstruction cannot continue for chat-only images until the source files are available again.

## Next Action

If new images are provided, append them here first and classify them as `Pending` or `Blocked` before creating any new level JSON files.

# Catalog Canonicalization Report

Created: 2026-03-12T09:14:58.520Z

## Summary

- JSON files scanned: 654
- Classified files: 598
- Canonical levels: 118
- Canonical progressions: 38
- Canonical playtests: 23
- Duplicate level files removed from the active catalog: 388
- Duplicate progression files removed from the active catalog: 11
- Duplicate playtest files removed from the active catalog: 29

## Canonical Folders

- `levels/` now contains only canonical playable levels plus catalog indexes.
- `progressions/` now contains canonical progression/workspace files rewritten to the canonical level names.
- `playtest/` now contains canonical session files.

## Archive

- Legacy source folders were moved under `archive/catalog_cleanup_20260312/`.
- Runtime mirrors were resynced into `level_toolkit_web/workshop_jsons/` and `level_toolkit_web/workshop_progressions/`.

## Naming Rule

- Canonical levels use `lvl_XXX_<slug>.json`.
- Winners inside duplicate groups were selected by newest filesystem modification time.


## Post-recovery additions

- Added 9 canonical levels (`lvl_110` to `lvl_118`) to preserve inferred screenshot-based B/C slots as real repo files.

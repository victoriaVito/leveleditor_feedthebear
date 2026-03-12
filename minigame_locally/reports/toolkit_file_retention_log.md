# Toolkit File Retention Log

Last updated: 2026-03-11

## Do not lose

These paths are the current sources of truth or core documentation:

- `levels/progressions/`
- `levels/standalone/game_unique_levels/`
- `levels/standalone/tutorial_level.json`
- `README.md`
- `LEVEL_TOOLKIT_PRODUCT_NOTES.md`
- `LEVEL_TOOLKIT_LIVE_STATUS.md`
- `reports/level_catalog_audit.md`
- `reports/level_catalog_audit.json`

## Derived but useful

These can be regenerated, but may still be useful as diagnostics or history:

- `levels/standalone/imported_from_downloads_clean/`
- `levels/standalone/manager_unique_levels/`
- `levels/standalone/toolkit_exports/manager/`
- `levels/standalone/toolkit_exports/play_sessions/`

## Safe temporary cleanup targets

These are considered recoverable artifacts:

- `.DS_Store` files under `levels/`
- extracted bundle contents under `levels/standalone/toolkit_exports/bundles/progression_a/`
- generated screenshots under `levels/standalone/toolkit_exports/screenshots/`

## Cleanup performed today

- removed all `.DS_Store` files under `levels/`
- removed `levels/standalone/toolkit_exports/bundles/progression_a/`
- removed `levels/standalone/toolkit_exports/screenshots/`


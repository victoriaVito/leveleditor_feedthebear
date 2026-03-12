# Levels Layout

This folder now acts as the canonical standalone level catalog.

- `levels/`
  - one retained version per standalone playable level
  - duplicate winners are kept here
  - winners are chosen by newest filesystem modification time after normalized-content dedupe
  - canonical file names now follow `lvl_XXX_<slug>.json`

Historical content now lives under:

- `archive/catalog_cleanup_20260312/`

Runtime mirrors still exist under:

- `level_toolkit_web/workshop_jsons/`
- `level_toolkit_web/workshop_progressions/`

Those paths should be treated as archive or generated runtime support unless a manual comparison is needed.

Catalog indexes:

- [catalog_index.json](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/catalog_index.json)
- [catalog_index.csv](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/levels/catalog_index.csv)

See also:

- progression catalog: `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/progressions`
- play session catalog: `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/playtest`

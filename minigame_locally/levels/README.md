# Levels Layout

- `progressions/`
  - progression config files
  - progression assignment files
  - `progressions_only/` copies and bundles used for import/export flows

- `standalone/`
  - single playable level JSONs
  - grouped by source (`from_images`, `from_downloads_fixed`, `new_levels_a`, etc.)
  - utility subsets like `valid_levels_only` and `discarded_levels_only`

Recommended source of truth:
- progression configs: `levels/progressions/`
- individual levels: `levels/standalone/`

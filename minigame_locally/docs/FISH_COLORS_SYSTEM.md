# Fish Color System

## 1. Purpose

Canonical fish-color reference for Feed the Bear.

## 2. Canonical model

The system now has **7 canonical colors**. Striped variants were removed.

- `letter` in `config/fish_colors.json` is the canonical entry key and runs `A` to `G`
- Species: `red`, `blue`, `green`, `yellow`, `orange`, `purple`, `cyan`

## 3. Canonical letter mapping

| Letter | Fish ID | Species | Hex |
| --- | --- | --- | --- |
| `A` | `fish_red` | red | `#EF4444` |
| `B` | `fish_blue` | blue | `#0EA5E9` |
| `C` | `fish_green` | green | `#10B981` |
| `D` | `fish_yellow` | yellow | `#FBBF24` |
| `E` | `fish_orange` | orange | `#F97316` |
| `F` | `fish_purple` | purple | `#A855F7` |
| `G` | `fish_cyan` | cyan | `#0891B2` |

## 4. Source files

- `config/fish_colors.json`: canonical palette and maps
- `level_toolkit_web/app.js`: fallback toolkit palette mirror
- `python_toolkit/src/feed_the_bear_toolkit/services/procedural.py`: procedural fallback pair types

## 5. Notes

- Legacy striped hex values are still accepted through `legacyColorMap`, but they resolve to solid canonical fish IDs.
- Canonical level `pairs[].type` values must be one of: `red`, `blue`, `green`, `yellow`, `orange`, `purple`, `cyan`.

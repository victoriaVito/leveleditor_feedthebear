# Fish Color System

## 1. Purpose

This is the canonical documentation for the fish color system used by the minigame and level tooling.

It replaces the older split between:

- implementation summary
- quick reference
- v2 letter-mapping note

## 2. Canonical model

The system defines 14 fish entries grouped into 7 species, with one solid and one striped variant per species.

Important distinction:

- `letter` in `config/fish_colors.json` is the canonical entry key and runs from `A` to `N`
- species are the semantic color families: red, blue, green, yellow, orange, purple, cyan
- older notes that used species initials such as `R`, `B`, or `G` are not canonical anymore

## 3. Canonical letter mapping

| Letter | Fish ID | Species | Variant | Hex |
| --- | --- | --- | --- | --- |
| `A` | `fish_red` | red | solid | `#EF4444` |
| `B` | `fish_red_striped` | red | striped | `#FCA5A5` |
| `C` | `fish_blue` | blue | solid | `#0EA5E9` |
| `D` | `fish_blue_striped` | blue | striped | `#7DD3FC` |
| `E` | `fish_green` | green | solid | `#10B981` |
| `F` | `fish_green_striped` | green | striped | `#A7F3D0` |
| `G` | `fish_yellow` | yellow | solid | `#FBBF24` |
| `H` | `fish_yellow_striped` | yellow | striped | `#FEE2A3` |
| `I` | `fish_orange` | orange | solid | `#F97316` |
| `J` | `fish_orange_striped` | orange | striped | `#FDBA74` |
| `K` | `fish_purple` | purple | solid | `#A855F7` |
| `L` | `fish_purple_striped` | purple | striped | `#D8B4FE` |
| `M` | `fish_cyan` | cyan | solid | `#0891B2` |
| `N` | `fish_cyan_striped` | cyan | striped | `#67E8F9` |

## 4. Source files

Canonical implementation files:

- `config/fish_colors.json`: master configuration
- `scripts/fish_color_utils.mjs`: reusable utility helpers
- `scripts/update_level_colors.mjs`: migration and refresh script

Level-side outputs:

- `levels/lvl_*.json`: updated level files
- `levels/.backups/`: pre-update backups

## 5. API surface

The utility module currently exposes:

- `getAllFishColors()`
- `getFishColorById(colorId)`
- `getColorByLetter(letter)`
- `getColorsBySpecies(species)`
- `getHexColorById(colorId)`
- `getLetterForColor(colorId)`
- `isStripedVariant(colorId)`
- `getSolidVariant(colorId)`
- `getStripedVariant(colorId)`
- `getColorIdByHex(hex)`
- `getColorStats()`
- `generateColorPaletteHTML()`

Example usage:

```javascript
import {
  getFishColorById,
  getColorByLetter,
  getColorsBySpecies,
  getLetterForColor,
} from "./scripts/fish_color_utils.mjs";

const blueFish = getColorByLetter("C");
const redVariants = getColorsBySpecies("red");
const cyanHex = getFishColorById("fish_cyan").hex;
const stripedGreenLetter = getLetterForColor("fish_green_striped");
```

## 6. Level JSON contract

Each pair can now carry canonical fish metadata:

```json
{
  "pairs": [
    {
      "id": "A",
      "start": [0, 3],
      "end": [1, 1],
      "color": "#0EA5E9",
      "fish_color_id": "fish_blue",
      "color_letter": "C"
    }
  ],
  "color_manifest": {
    "#0EA5E9": {
      "fish_color_id": "fish_blue",
      "pairs": ["A"]
    }
  }
}
```

Field meaning:

- `fish_color_id`: stable fish identity such as `fish_blue`
- `color_letter`: canonical entry letter from `A` to `N`
- `color_manifest`: per-level summary of which colors appear and which pair IDs use them

## 7. Migration summary

The implemented migration flow:

1. scan level JSON files
2. map existing hex colors to fish IDs
3. add `fish_color_id` and `color_letter`
4. generate a `color_manifest`
5. write backups before replacing level files

Representative before and after:

Before:

```json
{
  "pairs": [
    {
      "id": "A",
      "color": "#0EA5E9"
    }
  ]
}
```

After:

```json
{
  "pairs": [
    {
      "id": "A",
      "color": "#0EA5E9",
      "fish_color_id": "fish_blue",
      "color_letter": "C"
    }
  ],
  "color_manifest": {
    "#0EA5E9": {
      "fish_color_id": "fish_blue",
      "pairs": ["A"]
    }
  }
}
```

## 8. Commands

Refresh level metadata:

```bash
npm run colors:update
```

Equivalent direct commands:

```bash
node scripts/update_level_colors.mjs
```

## 9. Design notes

- Solid colors are the primary, saturated variants.
- Striped colors are lighter companions for visual distinction.
- The palette follows a stable entry order so procedural generation can assign colors sequentially.
- The color system is a gameplay vocabulary, not just a cosmetic layer.

## 10. Status

Current documented state:

- 14 canonical fish entries
- 7 species
- 2 variants per species
- backward compatibility preserved through existing hex values
- automated update and test scripts present in the repo

This file is the only canonical fish-color guide that should be maintained going forward.

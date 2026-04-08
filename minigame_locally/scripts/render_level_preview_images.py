from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config" / "fish_colors.json"
DEFAULT_OUTPUT_DIR = ROOT / "levels" / "screenshots"
PREVIEW_SIZE = 180
BACKGROUND = "#FFFFFF"
SELECTED_BACKGROUND = "#E0F2FE"
CELL_BACKGROUND = "#F7FBFF"
GRID_STROKE = "#CBD5E1"
BLOCKER_FILL = "#334155"


def load_color_map() -> dict[str, str]:
    data = json.loads(CONFIG_PATH.read_text())
    return {entry["id"].replace("fish_", ""): entry["hex"] for entry in data.get("colors", [])}


COLOR_BY_TYPE = load_color_map()


def level_files_from_args(args: list[str]) -> list[Path]:
    if not args:
      return []
    paths: list[Path] = []
    for raw in args:
        path = (ROOT / raw).resolve() if not raw.startswith("/") else Path(raw)
        if path.is_dir():
            paths.extend(sorted(path.rglob("*.json")))
        elif path.is_file():
            paths.append(path)
    return paths


def load_level(path: Path) -> dict:
    return json.loads(path.read_text())


def output_path_for_level(level_path: Path, output_dir: Path) -> Path:
    stem = level_path.stem
    return output_dir / f"{stem}.png"


def draw_level_preview(level: dict, selected: bool = False) -> Image.Image:
    width = int(level["gridSize"]["cols"])
    height = int(level["gridSize"]["rows"])
    cell = min(PREVIEW_SIZE // max(width, 1), PREVIEW_SIZE // max(height, 1))
    image = Image.new("RGB", (PREVIEW_SIZE, PREVIEW_SIZE), SELECTED_BACKGROUND if selected else BACKGROUND)
    draw = ImageDraw.Draw(image)

    blockers = {(int(b["x"]), int(b["y"])) for b in level.get("blockers", [])}
    for row in range(height):
        for col in range(width):
            x0 = col * cell
            y0 = row * cell
            x1 = x0 + cell
            y1 = y0 + cell
            draw.rectangle([x0, y0, x1, y1], fill=CELL_BACKGROUND, outline=GRID_STROKE, width=1)
            if (col, row) in blockers:
                draw.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=BLOCKER_FILL)

    for index, pair in enumerate(level.get("pairs", [])):
        color = COLOR_BY_TYPE.get(pair.get("type", "red"), list(COLOR_BY_TYPE.values())[index % len(COLOR_BY_TYPE)])
        ax = int(pair["a"]["x"])
        ay = int(pair["a"]["y"])
        bx = int(pair["b"]["x"])
        by = int(pair["b"]["y"])
        start = [ax * cell + 4, ay * cell + 4, (ax + 1) * cell - 4, (ay + 1) * cell - 4]
        end_center_x = bx * cell + cell / 2
        end_center_y = by * cell + cell / 2
        radius = max(6, int(cell / 3))
        end = [
            end_center_x - radius,
            end_center_y - radius,
            end_center_x + radius,
            end_center_y + radius,
        ]
        draw.rectangle(start, fill=color)
        draw.ellipse(end, fill=color)

    return image


def main(argv: list[str]) -> int:
    if not argv:
        print("Usage: python3 scripts/render_level_preview_images.py <file-or-dir> [<file-or-dir> ...]")
        return 1

    output_dir = DEFAULT_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    level_paths = level_files_from_args(argv)
    if not level_paths:
        print("No JSON level files found.")
        return 1

    written = 0
    for level_path in level_paths:
        level = load_level(level_path)
        image = draw_level_preview(level)
        out_path = output_path_for_level(level_path, output_dir)
        image.save(out_path, format="PNG")
        print(out_path.relative_to(ROOT))
        written += 1

    print(f"Rendered {written} preview image(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

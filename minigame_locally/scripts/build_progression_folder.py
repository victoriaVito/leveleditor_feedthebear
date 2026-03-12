#!/usr/bin/env python3
import csv
import json
import math
import re
import shutil
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LEVELS_DIR = ROOT / "levels"
PROGRESSIONS_DIR = ROOT / "progressions"
BUNDLES_DIR = ROOT / "bundles"
WORKSHOP_SCREENSHOTS = ROOT / "niveles_workshop" / "screenshots"

FONT = ImageFont.load_default()


def slugify(name: str) -> str:
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    return value.lower().replace(" ", "_")


def normalize_progression_key(name: str) -> str:
    value = str(name or "").strip()
    value = re.sub(r"^progression([A-Z])$", lambda m: f"progression_{m.group(1).lower()}", value)
    value = re.sub(r"^progression([a-z])$", lambda m: f"progression_{m.group(1)}", value)
    return slugify(value)


def read_json(path: Path):
    return json.loads(path.read_text())


def normalize_level(level: dict, fallback_name: str = "level.json") -> dict:
    if isinstance(level.get("pairs"), list) and level.get("pairs") and "id" in level["pairs"][0]:
        return level

    if "gridSize" not in level or not isinstance(level.get("pairs"), list):
        return level

    color_by_type = {
        "red": "#0EA5E9",
        "blue": "#10B981",
        "green": "#F59E0B",
        "yellow": "#EC4899",
        "pink": "#8B5CF6",
        "purple": "#14B8A6",
        "orange": "#F97316",
    }
    pair_ids = ["A", "B", "C", "D", "E"]
    grid_size = level.get("gridSize") or 0
    if isinstance(grid_size, dict):
        width = int(grid_size.get("cols") or grid_size.get("width") or 0)
        height = int(grid_size.get("rows") or grid_size.get("height") or 0)
        size = max(width, height)
    else:
        size = int(grid_size or 0)
        width = size
        height = size
    blockers = []
    for entry in level.get("blockers", []):
        if isinstance(entry, dict) and "x" in entry and "y" in entry:
            blockers.append([int(entry["y"]), int(entry["x"])])
        elif isinstance(entry, (list, tuple)) and len(entry) >= 2:
            blockers.append([int(entry[0]), int(entry[1])])

    pairs = []
    for index, pair in enumerate(level.get("pairs", [])):
        a = pair.get("a") or {}
        b = pair.get("b") or {}
        pair_type = str(pair.get("type") or "").lower()
        pairs.append(
            {
                "id": pair_ids[index] if index < len(pair_ids) else f"P{index + 1}",
                "start": [int(a.get("y", 0)), int(a.get("x", 0))],
                "end": [int(b.get("y", 0)), int(b.get("x", 0))],
                "color": color_by_type.get(pair_type, "#0EA5E9"),
            }
        )

    return {
        "level": int(level.get("id") or 1),
        "board_size": size,
        "board_width": width,
        "board_height": height,
        "pairs": pairs,
        "blockers": blockers,
        "moves": int(level.get("moves") or 0),
        "solution_count": int(level.get("solution_count") or 0),
        "difficulty": str(level.get("difficultyTier") or level.get("difficulty") or "").upper(),
        "validation": level.get("validation") or {},
        "meta": {
            **(level.get("meta") or {}),
            "source_name": str(level.get("name") or fallback_name),
        },
    }


def resolve_level_path(level_ref: str) -> Path:
    direct = ROOT / level_ref
    if direct.exists():
        return direct

    name = Path(level_ref).name
    candidates = [
        path for path in ROOT.rglob(name)
        if path.is_file()
        and "node_modules" not in path.parts
        and ".git" not in path.parts
        and "bundles" not in path.parts
        and "progressions" not in path.parts
        and path.suffix == ".json"
    ]
    if not candidates:
        raise FileNotFoundError(f"Could not resolve level file: {level_ref}")
    candidates.sort(key=lambda p: (p.stat().st_mtime, str(p)))
    return candidates[-1]


def board_dims(level):
    width = int(level.get("board_width") or level.get("board_size") or level.get("gridSize") or 0)
    height = int(level.get("board_height") or level.get("board_size") or level.get("gridSize") or 0)
    return width, height


def level_status(level):
    validation = level.get("validation") or {}
    if validation.get("is_valid") is True:
        return "OK"
    if validation.get("is_valid") is False:
        return "INVALID"
    return "UNKNOWN"


def level_difficulty(slot_index: int, level: dict):
    if level.get("difficulty"):
        return str(level["difficulty"]).upper()
    if slot_index <= 4:
        return "EASY"
    if slot_index <= 7:
        return "MEDIUM"
    return "HARD"


def copy_or_render_level_screenshot(level_path: Path, out_path: Path):
    screenshot_source = WORKSHOP_SCREENSHOTS / f"{level_path.stem}.png"
    if screenshot_source.exists():
        shutil.copy2(screenshot_source, out_path)
        return

    level = normalize_level(read_json(level_path), level_path.name)
    width, height = board_dims(level)
    cell = 64
    margin = 24
    img = Image.new("RGB", (width * cell + margin * 2, height * cell + margin * 2), "#f5f7fb")
    draw = ImageDraw.Draw(img)

    pair_colors = ["#1d9bf0", "#18a957", "#f59e0b", "#ef5da8", "#8b5cf6"]
    pair_map = {}
    for index, pair in enumerate(level.get("pairs", [])):
        pair_map[pair.get("id", f"P{index + 1}")] = pair.get("color") or pair_colors[index % len(pair_colors)]

    blockers = {tuple(item) for item in level.get("blockers", [])}
    for row in range(height):
        for col in range(width):
            x0 = margin + col * cell
            y0 = margin + row * cell
            x1 = x0 + cell
            y1 = y0 + cell
            fill = "#ffffff"
            if (row, col) in blockers:
                fill = "#334155"
            draw.rectangle([x0, y0, x1, y1], fill=fill, outline="#cbd5e1", width=2)

    for pair in level.get("pairs", []):
        pair_id = pair.get("id", "A")
        color = pair_map.get(pair_id, "#1d9bf0")
        for point in [pair.get("start"), pair.get("end")]:
            if not point:
                continue
            row, col = point
            x0 = margin + col * cell
            y0 = margin + row * cell
            if pair_id == "A":
                draw.rectangle([x0 + 10, y0 + 10, x0 + cell - 10, y0 + cell - 10], fill=color, outline=None)
            else:
                draw.ellipse([x0 + 10, y0 + 10, x0 + cell - 10, y0 + cell - 10], fill=color, outline=None)

    img.save(out_path)


def write_csv(rows, path: Path):
    with path.open("w", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "progression_key",
                "progression_label",
                "slot",
                "file",
                "path",
                "saved_path",
                "level",
                "board",
                "pairs",
                "blockers",
                "moves",
                "solutions",
                "difficulty",
                "status",
                "changed",
                "notes",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def draw_curve(rows, out_path: Path):
    img = Image.new("RGB", (1280, 520), "#f8fafc")
    draw = ImageDraw.Draw(img)
    draw.text((32, 24), "Difficulty Curve", fill="#0f172a", font=FONT)
    baseline = 430
    left = 60
    width = 100
    gap = 18
    heights = {"EASY": 120, "MEDIUM": 220, "HARD": 320}
    colors = {"EASY": "#93c5fd", "MEDIUM": "#60a5fa", "HARD": "#1d4ed8"}

    draw.line((40, baseline, 1240, baseline), fill="#94a3b8", width=2)
    for index, row in enumerate(rows):
        x = left + index * (width + gap)
        difficulty = row["difficulty"]
        bar_height = heights.get(difficulty, 160)
        draw.rounded_rectangle(
            (x, baseline - bar_height, x + width, baseline),
            radius=12,
            fill=colors.get(difficulty, "#cbd5e1"),
            outline="#1e293b",
            width=2,
        )
        draw.text((x + 28, baseline + 12), f"L{row['slot']}", fill="#0f172a", font=FONT)
        draw.text((x + 16, baseline - bar_height - 22), difficulty, fill="#475569", font=FONT)
    img.save(out_path)


def draw_layout(folder_name: str, screenshot_paths, out_path: Path):
    card_w = 230
    card_h = 300
    cols = 5
    rows = math.ceil(len(screenshot_paths) / cols)
    img = Image.new("RGB", (cols * card_w + 40, rows * card_h + 60), "#f8fafc")
    draw = ImageDraw.Draw(img)
    draw.text((20, 16), f"{folder_name} progression layout", fill="#0f172a", font=FONT)

    for index, shot_path in enumerate(screenshot_paths):
        shot = Image.open(shot_path).convert("RGB")
        shot.thumbnail((180, 180))
        row = index // cols
        col = index % cols
        x = 20 + col * card_w
        y = 50 + row * card_h
        draw.rounded_rectangle((x, y, x + card_w - 20, y + card_h - 20), radius=18, fill="#ffffff", outline="#cbd5e1", width=2)
        img.paste(shot, (x + 15, y + 35))
        draw.text((x + 15, y + 12), f"Slot {index + 1}", fill="#0f172a", font=FONT)
        draw.text((x + 15, y + 230), shot_path.stem, fill="#475569", font=FONT)

    img.save(out_path)


def zip_folder(folder: Path, zip_path: Path):
    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as zf:
        for item in sorted(folder.rglob("*")):
            if item.is_file():
                zf.write(item, item.relative_to(folder.parent))


def build(progression_filename: str):
    progression_path = PROGRESSIONS_DIR / progression_filename
    progression = read_json(progression_path)
    key = progression_path.stem.replace("_workshop", "")
    label = key.replace("progression", "Progression ").replace("_", " ")
    folder_name = normalize_progression_key(key)
    bundle_dir = BUNDLES_DIR / folder_name
    json_dir = bundle_dir / "jsons"
    screenshots_dir = bundle_dir / "screenshots"
    shutil.rmtree(bundle_dir, ignore_errors=True)
    json_dir.mkdir(parents=True, exist_ok=True)
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    tutorial_path = ROOT / progression.get("tutorial_level_file", "levels/tutorial_level.json")
    rows = []
    screenshot_paths = []

    for slot in progression["slots"]:
        slot_no = int(slot["slot"])
        level_path = tutorial_path if slot_no == 1 else resolve_level_path(slot["level_file"])
        level = normalize_level(read_json(level_path), level_path.name)
        target_level_path = json_dir / level_path.name
        shutil.copy2(level_path, target_level_path)
        target_shot_path = screenshots_dir / f"{level_path.stem}.png"
        copy_or_render_level_screenshot(level_path, target_shot_path)
        screenshot_paths.append(target_shot_path)
        width, height = board_dims(level)
        rows.append(
            {
                "progression_key": key,
                "progression_label": label,
                "slot": slot_no,
                "file": level_path.name,
                "path": f"levels/{level_path.name}",
                "saved_path": "",
                "level": int(level.get("level") or slot_no),
                "board": f"{width}x{height}",
                "pairs": len(level.get("pairs", [])),
                "blockers": len(level.get("blockers", [])),
                "moves": int(level.get("moves") or 0),
                "solutions": int(level.get("solution_count") or 0),
                "difficulty": level_difficulty(slot_no, level),
                "status": level_status(level),
                "changed": "No",
                "notes": "",
            }
        )

    write_csv(rows, bundle_dir / f"{folder_name}_progression.csv")
    draw_curve(rows, bundle_dir / f"{folder_name}_difficulty_curve.png")
    draw_layout(folder_name, screenshot_paths, bundle_dir / f"{folder_name}_progression_layout.png")
    zip_folder(bundle_dir, BUNDLES_DIR / f"{folder_name}.zip")


if __name__ == "__main__":
    import sys

    filenames = sys.argv[1:] or ["progressionB_workshop.json", "progressionC_workshop.json"]
    for filename in filenames:
        build(filename)

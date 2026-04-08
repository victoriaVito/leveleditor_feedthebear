from __future__ import annotations

import copy
import json
import random
import re
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "levels" / "otherLevels"
LEGACY_OUTPUT_DIR = ROOT / "levels"
CONFIG_PATH = ROOT / "config" / "fish_colors.json"
LEARNING_PATH = ROOT / ".local" / "toolkit_state" / "learning_state.json"
REFERENCE_GLOBS = [
    "levels/lvl/*large*.json",
    "levels/lvl/lvl_108_tune_large_01_7x7.json",
]
TOTAL_LEVELS = 100
TRANSFORMS = ("identity", "rot90", "rot180", "rot270", "flip_h", "flip_v", "transpose", "anti_transpose")
TAG_PATTERNS = {
    "too_easy": [r"too\s*easy", r"facil", r"very\s*easy", r"super\s*easy"],
    "too_much_space": [r"too\s*much\s*space", r"to\s*much\s*space", r"lot\s*of\s*space", r"too\s*open", r"demasiado\s*espacio", r"open\s*board", r"much\s*space"],
    "needs_more_pairs": [r"need[s]?\s*more\s*pairs", r"more\s*pairs", r"introduce\s*more\s*pairs", r"add\s*more\s*pairs", r"few\s*pairs", r"low\s*amount\s*of\s*pairs", r"supper\s*low\s*amount\s*of\s*pairs", r"mas\s*pares"],
    "needs_more_blockers": [r"add\s*more\s*blockers", r"need[s]?\s*more\s*blockers", r"more\s*blockers", r"mas\s*blockers", r"mas\s*bloqueadores"],
    "good_blocker_distribution": [r"good\s*blocker\s*distribution", r"good\s*blockers?", r"nice\s*blocker\s*distribution", r"good\s*distribution\s*of\s*the\s*blockers", r"well\s*distributed\s*blockers?"],
    "bad_blocker_clustering": [r"cluster", r"claster", r"clump", r"grouped\s*too\s*much", r"blockers?\s*too\s*close", r"bad\s*blocker\s*distribution"],
    "good_flow": [r"good\s*flow", r"nice\s*flow", r"good\s*routing", r"good\s*path\s*flow"],
}


def load_pair_types() -> list[str]:
    with CONFIG_PATH.open() as fh:
        data = json.load(fh)
    return [entry["id"].replace("fish_", "") for entry in data.get("colors", [])]


PAIR_TYPES = load_pair_types()


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", text.lower())).strip()


def infer_feedback_tags(entry: dict) -> list[str]:
    tags: set[str] = set(entry.get("feedback_tags") or [])
    reason_code = str(entry.get("reason_code") or "").strip()
    if reason_code and reason_code not in {"custom_feedback", "unspecified"}:
        tags.add(reason_code)
    raw_text = " ".join(str(entry.get(key) or "") for key in ("note_text", "reason_text", "keep_text"))
    text = normalize_text(raw_text)
    for tag, patterns in TAG_PATTERNS.items():
        if any(re.search(pattern, text) for pattern in patterns):
            tags.add(tag)
    return sorted(tags)


def load_learning_tag_counts() -> Counter:
    if not LEARNING_PATH.exists():
        return Counter()
    data = json.loads(LEARNING_PATH.read_text())
    counts: Counter = Counter()
    for bucket in ("approved", "rejected"):
        for entry in data.get(bucket, []):
            for tag in infer_feedback_tags(entry):
                counts[tag] += 1
    return counts


LEARNING_TAG_COUNTS = load_learning_tag_counts()


def load_reference_levels() -> list[tuple[Path, dict]]:
    refs: list[tuple[Path, dict]] = []
    seen: set[Path] = set()
    for pattern in REFERENCE_GLOBS:
        for path in sorted(ROOT.glob(pattern)):
            if path in seen:
                continue
            seen.add(path)
            refs.append((path, json.loads(path.read_text())))
    if not refs:
        raise RuntimeError("No large-board reference levels found.")
    return refs


def level_reference_score(level: dict) -> float:
    return (
        len(level.get("blockers", [])) * 3.2
        + float(level.get("moves", 0)) * 0.35
        - float(level.get("solutionCount", 0)) * 0.4
    )


def ordered_references(references: list[tuple[Path, dict]]) -> list[tuple[Path, dict]]:
    return sorted(references, key=lambda entry: level_reference_score(entry[1]), reverse=True)


def level_file_name(serial: int) -> str:
    return f"procedular_reference_large_{serial:03d}.json"


def transform_point(x: int, y: int, width: int, height: int, kind: str) -> tuple[int, int]:
    if kind == "identity":
        return x, y
    if kind == "rot90":
        return height - 1 - y, x
    if kind == "rot180":
        return width - 1 - x, height - 1 - y
    if kind == "rot270":
        return y, width - 1 - x
    if kind == "flip_h":
        return width - 1 - x, y
    if kind == "flip_v":
        return x, height - 1 - y
    if kind == "transpose":
        return y, x
    if kind == "anti_transpose":
        return height - 1 - y, width - 1 - x
    raise ValueError(f"Unknown transform: {kind}")


def transformed_size(width: int, height: int, kind: str) -> tuple[int, int]:
    if kind in {"rot90", "rot270", "transpose", "anti_transpose"}:
        return height, width
    return width, height


def rotate_pair_types(pairs: list[dict], offset: int) -> list[dict]:
    result = []
    for index, pair in enumerate(pairs):
        next_pair = copy.deepcopy(pair)
        next_pair["type"] = PAIR_TYPES[(offset + index) % len(PAIR_TYPES)]
        result.append(next_pair)
    return result


def cells_from_golden_path(level: dict) -> set[tuple[int, int]]:
    cells: set[tuple[int, int]] = set()
    for path in level.get("goldenPath", {}).values():
        for row, col in path:
            cells.add((col, row))
    return cells


def node_cells(level: dict) -> set[tuple[int, int]]:
    cells: set[tuple[int, int]] = set()
    for pair in level.get("pairs", []):
        cells.add((int(pair["a"]["x"]), int(pair["a"]["y"])))
        cells.add((int(pair["b"]["x"]), int(pair["b"]["y"])))
    return cells


def blocker_cells(level: dict) -> set[tuple[int, int]]:
    return {(int(blocker["x"]), int(blocker["y"])) for blocker in level.get("blockers", [])}


def manhattan(a: tuple[int, int], b: tuple[int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def blocker_target_for_level(level: dict) -> int:
    width = int(level["gridSize"]["cols"])
    height = int(level["gridSize"]["rows"])
    area = width * height
    existing = len(level.get("blockers", []))
    pressure = (
        LEARNING_TAG_COUNTS.get("too_easy", 0)
        + LEARNING_TAG_COUNTS.get("too_much_space", 0)
        + LEARNING_TAG_COUNTS.get("needs_more_blockers", 0)
    )
    pair_pressure = LEARNING_TAG_COUNTS.get("needs_more_pairs", 0)
    base = 5 if area <= 49 else 7
    desired = base + min(4, pressure * 2 + pair_pressure)
    return max(existing, min(11 if area <= 49 else 14, desired))


def blocker_score(cell: tuple[int, int], level: dict, current_blockers: set[tuple[int, int]], rng: random.Random) -> float:
    width = int(level["gridSize"]["cols"])
    height = int(level["gridSize"]["rows"])
    golden = cells_from_golden_path(level)
    nodes = node_cells(level)
    nearest_golden = min((manhattan(cell, other) for other in golden), default=10)
    nearest_node = min((manhattan(cell, other) for other in nodes), default=10)
    adjacency = sum((nx, ny) in current_blockers for nx, ny in (
        (cell[0] + 1, cell[1]),
        (cell[0] - 1, cell[1]),
        (cell[0], cell[1] + 1),
        (cell[0], cell[1] - 1),
    ))
    quadrant = (0 if cell[1] < height / 2 else 1, 0 if cell[0] < width / 2 else 1)
    occupied_quadrants = {(0 if y < height / 2 else 1, 0 if x < width / 2 else 1) for x, y in current_blockers}
    spread_bonus = (6 if quadrant not in occupied_quadrants else 0) + LEARNING_TAG_COUNTS.get("good_blocker_distribution", 0) * 2
    cluster_penalty = adjacency * (3 + LEARNING_TAG_COUNTS.get("bad_blocker_clustering", 0) * 2)
    center_bias = -abs(cell[0] - (width - 1) / 2) - abs(cell[1] - (height - 1) / 2)
    corridor_bias = 12 if 1 <= nearest_golden <= 2 else (5 if nearest_golden == 3 else 0)
    breathing_penalty = 6 if nearest_node <= 1 else 0
    return corridor_bias + spread_bonus + center_bias - cluster_penalty - breathing_penalty + rng.random() * 0.4


def add_pressure_blockers(level: dict, serial: int) -> None:
    rng = random.Random(21_113 + serial * 43)
    target = blocker_target_for_level(level)
    width = int(level["gridSize"]["cols"])
    height = int(level["gridSize"]["rows"])
    golden = cells_from_golden_path(level)
    nodes = node_cells(level)
    current = blocker_cells(level)
    candidates = [
        (x, y)
        for y in range(height)
        for x in range(width)
        if (x, y) not in golden and (x, y) not in nodes and (x, y) not in current
    ]
    while len(current) < target and candidates:
        ranked = sorted(candidates, key=lambda cell: blocker_score(cell, level, current, rng), reverse=True)
        chosen = ranked[0]
        current.add(chosen)
        candidates.remove(chosen)
    level["blockers"] = [{"x": x, "y": y} for x, y in sorted(current, key=lambda item: (item[1], item[0]))]


def contiguous_segments(level: dict) -> list[list[tuple[int, int]]]:
    width = int(level["gridSize"]["cols"])
    height = int(level["gridSize"]["rows"])
    occupied = cells_from_golden_path(level) | node_cells(level) | blocker_cells(level)
    segments: list[list[tuple[int, int]]] = []
    for y in range(height):
        run: list[tuple[int, int]] = []
        for x in range(width):
            if (x, y) in occupied:
                if len(run) >= 3:
                    segments.append(run[:])
                run = []
            else:
                run.append((x, y))
        if len(run) >= 3:
            segments.append(run[:])
    for x in range(width):
        run = []
        for y in range(height):
            if (x, y) in occupied:
                if len(run) >= 3:
                    segments.append(run[:])
                run = []
            else:
                run.append((x, y))
        if len(run) >= 3:
            segments.append(run[:])
    return segments


def maybe_add_extra_pair(level: dict, serial: int) -> None:
    if LEARNING_TAG_COUNTS.get("needs_more_pairs", 0) <= 0:
        return
    if len(level.get("pairs", [])) >= 4:
        return
    if serial % 3 != 0:
        return
    segments = contiguous_segments(level)
    if not segments:
        return
    segment = max(segments, key=len)
    start = segment[0]
    end = segment[-1]
    next_type = PAIR_TYPES[len(level["pairs"]) % len(PAIR_TYPES)]
    next_letter = chr(ord("A") + len(level["pairs"]))
    level["pairs"].append(
        {
            "type": next_type,
            "a": {"x": start[0], "y": start[1]},
            "b": {"x": end[0], "y": end[1]},
        }
    )
    level.setdefault("goldenPath", {})[next_letter] = [[y, x] for x, y in segment]


def recompute_meta(level: dict, reference_path: Path, serial: int, transform: str, original_size: tuple[int, int]) -> None:
    width = int(level["gridSize"]["cols"])
    height = int(level["gridSize"]["rows"])
    level["difficultyTier"] = min(10, max(int(level.get("difficultyTier", 1)), len(level.get("pairs", [])) * 2 + (1 if len(level.get("blockers", [])) >= 7 else 0)))
    level["moves"] = sum(max(0, len(path) - 1) for path in level.get("goldenPath", {}).values())
    level["solutionCount"] = max(0, int(level.get("solutionCount", 0)))
    level["meta"] = {
        **level.get("meta", {}),
        "generated_for_large_board_pack": False,
        "generated_for_supported_reference_pack": True,
        "generator_family": "procedular_reference_variants_v2",
        "generated_by": "scripts/generate_large_procedular_pack.py",
        "generated_at": datetime.now(UTC).isoformat(),
        "reference_source": reference_path.name,
        "reference_transform": transform,
        "reference_board_label": f"{original_size[0]}x{original_size[1]}",
        "board_label": f"{width}x{height}",
        "pair_count": len(level.get("pairs", [])),
        "serial": serial,
        "learning_feedback_tags": dict(LEARNING_TAG_COUNTS),
        "source_name": level_file_name(serial),
        "failed_checks": [],
        "not_supported_in_current_web_editor": False,
    }
    validation = dict(level.get("validation", {}))
    validation["reference_variant"] = True
    level["validation"] = validation


def transform_level(reference_path: Path, reference_level: dict, serial: int) -> dict:
    rng = random.Random(9_731 + serial * 101)
    grid = reference_level["gridSize"]
    width = int(grid["cols"])
    height = int(grid["rows"])
    transform = TRANSFORMS[serial % len(TRANSFORMS)]
    next_width, next_height = transformed_size(width, height, transform)
    type_offset = rng.randint(0, len(PAIR_TYPES) - 1)

    pairs = []
    for pair in rotate_pair_types(reference_level["pairs"], type_offset):
        ax, ay = transform_point(pair["a"]["x"], pair["a"]["y"], width, height, transform)
        bx, by = transform_point(pair["b"]["x"], pair["b"]["y"], width, height, transform)
        pairs.append(
            {
                "type": pair["type"],
                "a": {"x": ax, "y": ay},
                "b": {"x": bx, "y": by},
            }
        )

    blockers = []
    for blocker in reference_level.get("blockers", []):
        bx, by = transform_point(blocker["x"], blocker["y"], width, height, transform)
        blockers.append({"x": bx, "y": by})

    golden_path = {}
    for index, pair in enumerate(reference_level.get("goldenPath", {}).values()):
        pair_id = chr(ord("A") + index)
        golden_path[pair_id] = []
        for x, y in ((cell[1], cell[0]) for cell in pair):
            tx, ty = transform_point(x, y, width, height, transform)
            golden_path[pair_id].append([ty, tx])

    level = {
        "id": level_file_name(serial).removesuffix(".json"),
        "difficultyTier": int(reference_level.get("difficultyTier", min(10, max(1, len(pairs) * 2)))),
        "gridSize": {"cols": next_width, "rows": next_height},
        "moves": int(reference_level.get("moves", 0)),
        "pairs": pairs,
        "blockers": blockers,
        "solutionCount": int(reference_level.get("solutionCount", 0)),
        "targetDensity": reference_level.get("targetDensity", "SINGLE"),
        "goldenPath": golden_path,
        "meta": copy.deepcopy(reference_level.get("meta", {})),
        "validation": copy.deepcopy(reference_level.get("validation", {})),
        "decal": bool(reference_level.get("decal", False)),
    }
    maybe_add_extra_pair(level, serial)
    add_pressure_blockers(level, serial)
    recompute_meta(level, reference_path, serial, transform, (width, height))
    return level


def unique_signature(level: dict) -> str:
    signature = {
        "grid": level["gridSize"],
        "pairs": sorted(
            (
                pair["type"],
                pair["a"]["x"],
                pair["a"]["y"],
                pair["b"]["x"],
                pair["b"]["y"],
            )
            for pair in level["pairs"]
        ),
        "blockers": sorted((blocker["x"], blocker["y"]) for blocker in level.get("blockers", [])),
    }
    return json.dumps(signature, sort_keys=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    LEGACY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    references = ordered_references(load_reference_levels())
    generated: list[tuple[str, dict]] = []
    seen_signatures: set[str] = set()
    serial = 1
    reference_index = 0

    while len(generated) < TOTAL_LEVELS:
        reference_path, reference_level = references[reference_index % len(references)]
        candidate = transform_level(reference_path, reference_level, serial)
        signature = unique_signature(candidate)
        if signature not in seen_signatures:
            seen_signatures.add(signature)
            generated.append((level_file_name(serial), candidate))
        serial += 1
        reference_index += 1

    for existing in OUTPUT_DIR.glob("procedular_reference_large_*.json"):
        existing.unlink()
    for existing in LEGACY_OUTPUT_DIR.glob("procedular_reference_large_*.json"):
        existing.unlink()

    for file_name, level in generated:
        with (OUTPUT_DIR / file_name).open("w") as fh:
            json.dump(level, fh, indent=2)
            fh.write("\n")


if __name__ == "__main__":
    main()

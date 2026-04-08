from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from feed_the_bear_toolkit.domain.models import Cell, Level, LevelPackEntry, LevelPackSummary, Pair, PAIR_IDS
from feed_the_bear_toolkit.domain.validation import validate_level_structure


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)) and int(value) == value:
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped or stripped == "-":
            return None
        try:
            return int(float(stripped))
        except ValueError:
            return None
    return None


def is_placeholder_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() in {"", "-"}
    return False


def slugify_file_part(value: str) -> str:
    cleaned = re.sub(r"\.[^.]+$", "", str(value or "")).lower()
    cleaned = re.sub(r"[^a-z0-9]+", "_", cleaned).strip("_")
    return cleaned or "untitled"


def normalize_level_file_name(value: str, level_number: int = 1) -> str:
    trimmed = str(value or "").strip()
    if not trimmed:
        return f"level_{level_number}.json"
    return trimmed if trimmed.lower().endswith(".json") else f"{trimmed}.json"


def level_width(raw: dict[str, Any]) -> int | None:
    return _as_int(
        raw.get("gridSize", {}).get("cols")
        or raw.get("gridSize", {}).get("width")
        or raw.get("board_width")
        or raw.get("board_size")
        or (len(raw.get("grid", [])[0]) if raw.get("grid") else None)
    )


def level_height(raw: dict[str, Any]) -> int | None:
    return _as_int(
        raw.get("gridSize", {}).get("rows")
        or raw.get("gridSize", {}).get("height")
        or raw.get("board_height")
        or raw.get("board_size")
        or (len(raw.get("grid", [])) if raw.get("grid") else None)
    )


def level_tier(raw: dict[str, Any]) -> int | None:
    explicit_tier = _as_int(raw.get("difficultyTier"))
    if explicit_tier is not None and explicit_tier >= 1:
        return explicit_tier
    explicit_level = _as_int(raw.get("level"))
    if explicit_level is not None and explicit_level >= 1:
        return explicit_level
    return None


def _cell_from_point(point: dict[str, Any] | None) -> Cell | None:
    if not isinstance(point, dict):
        return None
    x = _as_int(point.get("x"))
    y = _as_int(point.get("y"))
    if x is None or y is None:
        return None
    return Cell(x=x, y=y)


def _cell_from_stored(cell: list[Any] | tuple[Any, Any] | None) -> Cell | None:
    if not isinstance(cell, (list, tuple)) or len(cell) != 2:
        return None
    y = _as_int(cell[0])
    x = _as_int(cell[1])
    if x is None or y is None:
        return None
    return Cell(x=x, y=y)


def _pair_from_raw(raw_pair: dict[str, Any], index: int) -> Pair | None:
    if not isinstance(raw_pair, dict):
        return None
    start = _cell_from_point(raw_pair.get("a")) or _cell_from_stored(raw_pair.get("start"))
    end = _cell_from_point(raw_pair.get("b")) or _cell_from_stored(raw_pair.get("end"))
    if start is None or end is None:
        return None
    pair_id = str(raw_pair.get("id") or PAIR_IDS[index] if index < len(PAIR_IDS) else f"P{index + 1}")
    return Pair(
        id=pair_id,
        type=str(raw_pair.get("type") or "").strip(),
        start=start,
        end=end,
    )


def _blocker_from_raw(raw_blocker: Any) -> Cell | None:
    if isinstance(raw_blocker, dict):
        return _cell_from_point(raw_blocker)
    return _cell_from_stored(raw_blocker)


def parse_level_dict(raw: dict[str, Any]) -> Level:
    pairs: list[Pair] = []
    for index, raw_pair in enumerate(raw.get("pairs") or []):
        pair = _pair_from_raw(raw_pair, index)
        if pair is not None:
            pairs.append(pair)

    blockers: list[Cell] = []
    for raw_blocker in raw.get("blockers") or []:
        blocker = _blocker_from_raw(raw_blocker)
        if blocker is not None:
            blockers.append(blocker)

    solution_count = _as_int(raw.get("solutionCount"))
    if solution_count is None:
        solution_count = _as_int(raw.get("solution_count"))

    target_density_raw = raw.get("targetDensity")
    if target_density_raw is None:
        target_density_raw = raw.get("target_density")
    target_density = None
    if not is_placeholder_value(target_density_raw):
        target_density = str(target_density_raw).strip() or None

    golden_path_raw = raw.get("goldenPath")
    if golden_path_raw is None:
        golden_path_raw = raw.get("golden_path")
    golden_path = dict(golden_path_raw) if isinstance(golden_path_raw, dict) else {}

    return Level(
        id=str(raw.get("id") or raw.get("meta", {}).get("source_name") or "").strip(),
        difficulty_tier=level_tier(raw),
        cols=level_width(raw),
        rows=level_height(raw),
        moves=_as_int(raw.get("moves")),
        pairs=pairs,
        blockers=blockers,
        solution_count=solution_count,
        target_density=target_density,
        golden_path=golden_path,
        meta=dict(raw.get("meta") or {}),
        validation=dict(raw.get("validation") or {}),
        decal=bool(raw.get("decal")),
        raw=raw,
    )


def level_id_for_storage(level: Level, preferred_name: str = "") -> str:
    raw = str(level.id or preferred_name or level.meta.get("source_name") or "level_1.json")
    return Path(raw).name.replace(".json", "")


def developer_difficulty_tier_for_level(level: Level) -> int:
    if level.difficulty_tier is not None and level.difficulty_tier >= 1:
        return max(1, min(10, level.difficulty_tier))
    width = level.cols or 0
    height = level.rows or 0
    return max(1, min(10, (width + height + 1) // 2 if width and height else 1))


def serialize_level_to_canonical_dict(level: Level, preferred_name: str = "") -> dict[str, Any]:
    serialized: dict[str, Any] = {
        "id": level_id_for_storage(level, preferred_name),
        "difficultyTier": developer_difficulty_tier_for_level(level),
        "gridSize": {
            "cols": level.cols,
            "rows": level.rows,
        },
        "moves": int(level.moves or 0),
        "pairs": [
            {
                "type": pair.type,
                "a": {"x": pair.start.x, "y": pair.start.y},
                "b": {"x": pair.end.x, "y": pair.end.y},
            }
            for pair in level.pairs
        ],
    }
    if level.blockers:
        serialized["blockers"] = [{"x": cell.x, "y": cell.y} for cell in level.blockers]
    if level.solution_count is not None:
        serialized["solutionCount"] = level.solution_count
    if level.target_density is not None:
        serialized["targetDensity"] = level.target_density
    if level.golden_path:
        serialized["goldenPath"] = level.golden_path
    if level.meta:
        serialized["meta"] = level.meta
    if level.validation:
        serialized["validation"] = level.validation
    if level.decal or "decal" in level.raw:
        serialized["decal"] = level.decal
    if "description" in level.raw:
        serialized["description"] = level.raw["description"]
    return serialized


def serialize_level_to_canonical_json(level: Level, preferred_name: str = "") -> str:
    return json.dumps(serialize_level_to_canonical_dict(level, preferred_name), indent=2, ensure_ascii=False)


def _missing_metadata_fields(level: Level) -> tuple[str, ...]:
    missing: list[str] = []
    if level.solution_count is None:
        missing.append("solutionCount")
    if level.target_density is None:
        missing.append("targetDensity")
    if not level.golden_path:
        missing.append("goldenPath")
    if not level.validation:
        missing.append("validation")
    if not level.meta:
        missing.append("meta")
    return tuple(missing)


def summarize_level_pack(folder: Path) -> LevelPackSummary:
    root = folder.resolve()
    entries: list[LevelPackEntry] = []
    board_counts: dict[str, int] = {}
    pair_counts: dict[str, int] = {}
    missing_metadata_counts: dict[str, int] = {}

    for path in sorted(root.rglob("*.json")):
        level = load_level_file(path)
        result = validate_level_structure(level)
        missing_metadata = _missing_metadata_fields(level)
        board_key = f"{level.cols}x{level.rows}" if level.cols and level.rows else "unknown"
        pair_key = str(len(level.pairs))
        board_counts[board_key] = board_counts.get(board_key, 0) + 1
        pair_counts[pair_key] = pair_counts.get(pair_key, 0) + 1
        for field_name in missing_metadata:
            missing_metadata_counts[field_name] = missing_metadata_counts.get(field_name, 0) + 1
        entries.append(
            LevelPackEntry(
                path=str(path.relative_to(root)),
                valid=result.valid,
                error_count=len(result.errors),
                warning_count=len(result.warnings),
                cols=level.cols,
                rows=level.rows,
                pair_count=len(level.pairs),
                blocker_count=len(level.blockers),
                missing_metadata=missing_metadata,
            )
        )

    valid_count = sum(1 for entry in entries if entry.valid)
    return LevelPackSummary(
        folder=str(root),
        file_count=len(entries),
        valid_count=valid_count,
        invalid_count=len(entries) - valid_count,
        board_counts=board_counts,
        pair_counts=pair_counts,
        missing_metadata_counts=missing_metadata_counts,
        entries=entries,
    )


def load_level_file(path: Path) -> Level:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(raw, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return parse_level_dict(raw)

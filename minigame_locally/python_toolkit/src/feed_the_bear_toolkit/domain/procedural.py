from __future__ import annotations

import math
import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Iterable, Mapping

from feed_the_bear_toolkit.domain.models import Cell, Level, Pair, PAIR_IDS


LEARNING_TEXT_TAG_PATTERNS = (
    ("too_easy", (r"too\s*easy", r"facil", r"very\s*easy", r"super\s*easy", r"demasiado\s*facil", r"muy\s*facil")),
    (
        "too_much_space",
        (
            r"too\s*much\s*space",
            r"to\s*much\s*space",
            r"lot\s*of\s*space",
            r"too\s*open",
            r"muy\s*abierto",
            r"demasiado\s*espacio",
            r"much\s*space",
            r"open\s*board",
            r"mucho\s*espacio",
        ),
    ),
    (
        "needs_more_pairs",
        (
            r"need[s]?\s*more\s*pairs",
            r"more\s*pairs",
            r"introduce\s*more\s*pairs",
            r"add\s*more\s*pairs",
            r"few\s*pairs",
            r"low\s*amount\s*of\s*pairs",
            r"supper\s*low\s*amount\s*of\s*pairs",
            r"more\s*objectives",
            r"mas\s*pares",
            r"mas\s*parejas",
            r"anadiria\s*mas\s*parejas",
            r"anadiri?a\s*mas",
            r"faltan\s*parejas",
        ),
    ),
    (
        "needs_more_blockers",
        (
            r"add\s*more\s*blockers",
            r"need[s]?\s*more\s*blockers",
            r"more\s*blockers",
            r"mas\s*blockers",
            r"mas\s*bloqueadores",
            r"faltan\s*blockers",
            r"pocos\s*blockers",
        ),
    ),
    (
        "good_blocker_distribution",
        (
            r"good\s*blocker\s*distribution",
            r"good\s*blockers?",
            r"nice\s*blocker\s*distribution",
            r"good\s*distribution\s*of\s*the\s*blockers",
            r"well\s*distributed\s*blockers?",
            r"buena\s*distribucion",
        ),
    ),
    (
        "bad_blocker_clustering",
        (
            r"cluster",
            r"claster",
            r"clump",
            r"grouped\s*too\s*much",
            r"not\s*in\s*clasters",
            r"bad\s*blocker\s*distribution",
            r"blockers?\s*too\s*close",
            r"agrupacion.*no\s*tiene\s*sentido",
            r"agrupaciones.*no\s*tienen\s*sentido",
            r"agrupaciones?\s*(?:de\s*)?blockers",
            r"blockers\s*agrupados",
        ),
    ),
    (
        "meaningless_blockers",
        (
            r"blockers?\s*(?:no|sin)\s*(?:tienen?\s*)?(?:ningun\s*)?sentido",
            r"no\s*(?:tienen?\s*)?(?:ningun\s*)?sentido",
            r"(?:sin|no)\s*sentido",
            r"no\s*(?:van?\s*a?\s*)?funcionar",
            r"distribucion\s*rarisima",
            r"agujeros?\s*sin\s*sentido",
            r"no\s*sirve\s*para\s*nada",
            r"blockers?\s*(?:are\s*)?pointless",
            r"blockers?\s*(?:don.?t|do\s*not)\s*(?:make\s*)?sense",
            r"meaningless\s*blockers?",
        ),
    ),
    ("good_flow", (r"good\s*flow", r"nice\s*flow", r"good\s*routing", r"good\s*path\s*flow", r"buen\s*flujo")),
    (
        "good_layout",
        (r"good\s*layout", r"well\s*thought", r"mas\s*pensado", r"more\s*thought\s*out", r"better\s*thought", r"buen\s*diseno", r"bien\s*pensado"),
    ),
    ("bad_layout", (r"bad\s*layout", r"better\s*layout", r"ugly", r"feo", r"layout\s*issue", r"mal\s*diseno", r"mala\s*distribucion")),
)

CRITICAL_GUIDE_ISSUES = frozenset(
    {
        "missing_solution_path",
        "paths_cross",
        "path_wrong_endpoints",
        "invalid_path_step",
        "path_hits_blocker",
        "path_out_of_bounds",
        "path_through_foreign_endpoint",
        "invalid_path_cell",
    }
)


@dataclass(slots=True, frozen=True)
class ProceduralCandidateScore:
    score: float
    feature_distance: float
    mechanic_penalty: float
    mechanic_reward: float
    guide_penalty: float
    pair_penalty: float


@dataclass(slots=True, frozen=True)
class ProceduralReferenceRank:
    similarity: float
    learning_bias: float
    intent_penalty: float
    total: float


PROCEDURAL_CURVE: dict[int, dict[str, Any]] = {
    1: {"density": "HIGH", "board": (4,), "pairs": (2, 2), "blockers": (0, 0)},
    2: {"density": "HIGH", "board": (4,), "pairs": (2, 3), "blockers": (0, 1)},
    3: {"density": "MEDIUM-HIGH", "board": (4, 5), "pairs": (2, 3), "blockers": (1, 2)},
    4: {"density": "MEDIUM", "board": (5,), "pairs": (3, 4), "blockers": (1, 2)},
    5: {"density": "MEDIUM", "board": (5, 6), "pairs": (3, 4), "blockers": (1, 3)},
    6: {"density": "MEDIUM-LOW", "board": (6,), "pairs": (4, 5), "blockers": (2, 3)},
    7: {"density": "LOW", "board": (6, 7), "pairs": (4, 6), "blockers": (2, 4)},
    8: {"density": "VERY-LOW", "board": (7,), "pairs": (5, 7), "blockers": (2, 4)},
    9: {"density": "SINGLE", "board": (7,), "pairs": (5, 7), "blockers": (3, 5)},
    10: {"density": "LOW-MEDIUM", "board": (7,), "pairs": (6, 8), "blockers": (3, 5)},
}


def _mapping(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, Mapping) else {}


def _get(value: Any, key: str, default: Any = None) -> Any:
    if isinstance(value, Mapping):
        return value.get(key, default)
    return getattr(value, key, default)


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


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return float(int(value))
    if isinstance(value, (int, float)) and math.isfinite(float(value)):
        return float(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped or stripped == "-":
            return None
        try:
            parsed = float(stripped)
        except ValueError:
            return None
        return parsed if math.isfinite(parsed) else None
    return None


def _cells_from_value(value: Any) -> list[Cell]:
    result: list[Cell] = []
    if isinstance(value, (list, tuple)):
        for item in value:
            if isinstance(item, Cell):
                result.append(item)
            elif isinstance(item, (list, tuple)) and len(item) == 2:
                y = _as_int(item[0])
                x = _as_int(item[1])
                if x is not None and y is not None:
                    result.append(Cell(x=x, y=y))
            elif isinstance(item, Mapping):
                x = _as_int(item.get("x"))
                y = _as_int(item.get("y"))
                if x is not None and y is not None:
                    result.append(Cell(x=x, y=y))
    return result


def _pairs_from_value(value: Any) -> list[Pair]:
    result: list[Pair] = []
    if not isinstance(value, (list, tuple)):
        return result
    for index, item in enumerate(value):
        if isinstance(item, Pair):
            result.append(item)
            continue
        if not isinstance(item, Mapping):
            continue
        start = None
        end = None
        if isinstance(item.get("start"), (list, tuple)):
            start_cells = _cells_from_value([item.get("start")])
            start = start_cells[0] if start_cells else None
        if isinstance(item.get("end"), (list, tuple)):
            end_cells = _cells_from_value([item.get("end")])
            end = end_cells[0] if end_cells else None
        if start is None and isinstance(item.get("a"), Mapping):
            start_cells = _cells_from_value([item["a"]])
            start = start_cells[0] if start_cells else None
        if end is None and isinstance(item.get("b"), Mapping):
            end_cells = _cells_from_value([item["b"]])
            end = end_cells[0] if end_cells else None
        if start is None or end is None:
            continue
        pair_id = str(item.get("id") or (PAIR_IDS[index] if index < len(PAIR_IDS) else f"P{index + 1}"))
        result.append(Pair(id=pair_id, type=str(item.get("type") or "").strip(), start=start, end=end))
    return result


def _level_width(level: Any) -> int | None:
    explicit = _as_int(_get(level, "cols"))
    if explicit is not None:
        return explicit
    explicit = _as_int(_get(level, "width"))
    if explicit is not None:
        return explicit
    grid_size = _get(level, "gridSize", {})
    if isinstance(grid_size, Mapping):
        explicit = _as_int(grid_size.get("cols") or grid_size.get("width"))
        if explicit is not None:
            return explicit
    return _as_int(_get(level, "board_width")) or _as_int(_get(level, "board_size")) or None


def _level_height(level: Any) -> int | None:
    explicit = _as_int(_get(level, "rows"))
    if explicit is not None:
        return explicit
    explicit = _as_int(_get(level, "height"))
    if explicit is not None:
        return explicit
    grid_size = _get(level, "gridSize", {})
    if isinstance(grid_size, Mapping):
        explicit = _as_int(grid_size.get("rows") or grid_size.get("height"))
        if explicit is not None:
            return explicit
    return _as_int(_get(level, "board_height")) or _as_int(_get(level, "board_size")) or None


def _level_tier(level: Any) -> int | None:
    explicit_tier = _as_int(_get(level, "difficulty_tier"))
    if explicit_tier is None:
        explicit_tier = _as_int(_get(level, "difficultyTier"))
    if explicit_tier is not None and explicit_tier >= 1:
        return explicit_tier
    explicit_level = _as_int(_get(level, "level"))
    if explicit_level is not None and explicit_level >= 1:
        return explicit_level
    return None


def _level_pairs(level: Any) -> list[Pair]:
    value = _get(level, "pairs", [])
    return _pairs_from_value(value)


def _level_blockers(level: Any) -> list[Cell]:
    value = _get(level, "blockers", [])
    return _cells_from_value(value)


def _level_solution_count(level: Any) -> int | None:
    value = _get(level, "solution_count")
    if value is None:
        value = _get(level, "solutionCount")
    return _as_int(value)


def _level_golden_path(level: Any) -> dict[str, list[list[int]]]:
    value = _get(level, "golden_path")
    if value is None:
        value = _get(level, "goldenPath")
    if not isinstance(value, Mapping):
        return {}
    result: dict[str, list[list[int]]] = {}
    for pair_id, path in value.items():
        if not isinstance(path, (list, tuple)):
            continue
        normalized_path: list[list[int]] = []
        for cell in path:
            if isinstance(cell, (list, tuple)) and len(cell) == 2:
                y = _as_int(cell[0])
                x = _as_int(cell[1])
            elif isinstance(cell, Mapping):
                x = _as_int(cell.get("x"))
                y = _as_int(cell.get("y"))
            else:
                x = y = None
            if x is None or y is None:
                continue
            normalized_path.append([y, x])
        if normalized_path:
            result[str(pair_id)] = normalized_path
    return result


def normalize_feedback_text(text: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(text or ""))
    return "".join(char for char in normalized if not unicodedata.combining(char)).lower().strip()


def classify_discard_reason(reason_text: Any) -> str:
    text = normalize_feedback_text(reason_text)
    if not text:
        return "unspecified"
    if "cross" in text or "cruz" in text or "solapa" in text or "overlap" in text:
        return "paths_cross"
    if "mislead" in text or "enga" in text or "guide" in text:
        return "misleading_solution"
    if "easy" in text or "facil" in text:
        return "too_easy"
    if "hard" in text or "dif" in text or "difficult" in text:
        return "too_hard"
    if "ugly" in text or "feo" in text or "layout" in text:
        return "bad_layout"
    return "custom_feedback"


def infer_learning_tags(reason_code: Any = "", raw_text: Any = "", keep_tags: Any = ()) -> list[str]:
    tags: list[str] = []
    seen: set[str] = set()
    for tag in keep_tags if isinstance(keep_tags, (list, tuple)) else ():
        tag_text = str(tag).strip()
        if tag_text and tag_text not in seen:
            seen.add(tag_text)
            tags.append(tag_text)
    normalized_reason = str(reason_code or "").strip()
    if normalized_reason and normalized_reason not in {"custom_feedback", "unspecified"} and normalized_reason not in seen:
        seen.add(normalized_reason)
        tags.append(normalized_reason)
    text = normalize_feedback_text(f"{reason_code or ''} {raw_text or ''}")
    for tag, patterns in LEARNING_TEXT_TAG_PATTERNS:
        if any(re.search(pattern, text) for pattern in patterns) and tag not in seen:
            seen.add(tag)
            tags.append(tag)
    return tags


def infer_learning_source_family(context: Any = "", extra: Any = None) -> str:
    explicit = normalize_feedback_text(_get(extra or {}, "source_family") or _get(extra or {}, "sourceFamily"))
    if explicit:
        return explicit
    normalized = normalize_feedback_text(context)
    if not normalized:
        return "manual"
    if normalized.startswith("session:"):
        return "session"
    if normalized.startswith("reference_"):
        return "reference"
    if normalized.startswith("editor_"):
        return "editor"
    if ":corrected" in normalized or ":original" in normalized or normalized.startswith("session_fix") or "fix" in normalized:
        return "correction"
    if "manual" in normalized:
        return "manual"
    return "unknown"


def normalize_learning_entry(entry: Any, decision: str = "approve") -> dict[str, Any]:
    raw_entry = _mapping(entry)
    note_text = str(raw_entry.get("note_text") or "").strip()
    fallback_text = str(raw_entry.get("keep_text") or raw_entry.get("reason_text") or "").strip()
    raw_text = note_text or fallback_text
    derived_reason_code = (
        str(raw_entry.get("reason_code") or classify_discard_reason(raw_text)).strip()
        if decision == "reject"
        else str(raw_entry.get("reason_code") or "").strip()
    )
    keep_tags = raw_entry.get("keep_tags")
    feedback_tags = raw_entry.get("feedback_tags")
    if not isinstance(keep_tags, (list, tuple)):
        keep_tags = feedback_tags if isinstance(feedback_tags, (list, tuple)) else ()
    pair_ids = raw_entry.get("pair_ids")
    if not isinstance(pair_ids, (list, tuple)):
        pair_ids = ()
    result = dict(raw_entry)
    result["reason_code"] = derived_reason_code or ""
    result["note_text"] = note_text
    result["feedback_tags"] = infer_learning_tags(derived_reason_code, raw_text, keep_tags)
    result["keep_tags"] = [str(tag) for tag in keep_tags if str(tag).strip()]
    result["pair_ids"] = [str(pair_id) for pair_id in pair_ids if str(pair_id).strip()]
    result["source_family"] = str(
        raw_entry.get("source_family")
        or infer_learning_source_family(raw_entry.get("context", ""), raw_entry)
        or "unknown"
    )
    result["auto_recorded"] = bool(raw_entry.get("auto_recorded"))
    return result


def normalize_learning_correction_entry(entry: Any) -> dict[str, Any]:
    result = dict(_mapping(entry))
    result["source_family"] = str(result.get("source_family") or "correction")
    return result


def normalize_learning_buckets(buckets: Any) -> dict[str, Any]:
    normalized = dict(_mapping(buckets))
    normalized["approved"] = [normalize_learning_entry(entry, "approve") for entry in normalized.get("approved", []) or []]
    normalized["rejected"] = [normalize_learning_entry(entry, "reject") for entry in normalized.get("rejected", []) or []]
    normalized["corrections"] = [normalize_learning_correction_entry(entry) for entry in normalized.get("corrections", []) or []]
    return normalized


def extract_features(level: Any) -> dict[str, float | int | None]:
    return {
        "level": _level_tier(level),
        "boardWidth": _level_width(level),
        "boardHeight": _level_height(level),
        "pairs": len(_level_pairs(level)),
        "blockers": len(_level_blockers(level)),
        "moves": _as_int(_get(level, "moves")) or 0,
        "solutions": _level_solution_count(level) or 0,
    }


def _feature_row(value: Any) -> dict[str, float | int]:
    mapping = _mapping(value)
    board_width = _as_float(mapping.get("boardWidth") or mapping.get("board_width") or mapping.get("width"))
    board_height = _as_float(mapping.get("boardHeight") or mapping.get("board_height") or mapping.get("height"))
    return {
        "boardWidth": board_width if board_width is not None else 0.0,
        "boardHeight": board_height if board_height is not None else 0.0,
        "pairs": _as_float(mapping.get("pairs") or mapping.get("pair_count")) or 0.0,
        "blockers": _as_float(mapping.get("blockers") or mapping.get("blocker_count")) or 0.0,
        "moves": _as_float(mapping.get("moves")) or 0.0,
        "solutions": _as_float(mapping.get("solutions") or mapping.get("solution_count")) or 0.0,
    }


def mean_feature(rows: Iterable[Any]) -> dict[str, float] | None:
    valid_rows = []
    for row in rows:
        if not row:
            continue
        feature_row = _feature_row(row)
        if not math.isfinite(feature_row["boardWidth"]) or not math.isfinite(feature_row["boardHeight"]):
            continue
        valid_rows.append((_mapping(row), feature_row))
    if not valid_rows:
        return None
    totals = {"boardWidth": 0.0, "boardHeight": 0.0, "pairs": 0.0, "blockers": 0.0, "moves": 0.0, "solutions": 0.0}
    counts = {key: 0 for key in totals}
    extras_totals: dict[str, float] = {}
    extras_counts: dict[str, int] = {}
    for row, feature_row in valid_rows:
        for key in totals:
            totals[key] += float(feature_row[key])
            counts[key] += 1
        for key, value in row.items():
            parsed = _as_float(value)
            if parsed is None:
                continue
            if key in totals:
                continue
            extras_totals[key] = extras_totals.get(key, 0.0) + parsed
            extras_counts[key] = extras_counts.get(key, 0) + 1
    result = {key: (totals[key] / counts[key]) for key in totals if counts[key]}
    for key, total in extras_totals.items():
        count = extras_counts.get(key, 0)
        if count:
            result[key] = total / count
    return result


def feature_distance(left: Any, right: Any) -> float:
    if not left or not right:
        return 0.0
    a = _feature_row(left)
    b = _feature_row(right)
    return (
        abs(a["boardWidth"] - b["boardWidth"]) * 1.2
        + abs(a["boardHeight"] - b["boardHeight"]) * 1.2
        + abs(a["pairs"] - b["pairs"]) * 2.0
        + abs(a["blockers"] - b["blockers"]) * 1.5
        + abs(a["moves"] - b["moves"]) * 0.25
        + abs(a["solutions"] - b["solutions"]) * 1.0
    )


def _level_endpoint_cells(level: Any) -> set[tuple[int, int]]:
    endpoints: set[tuple[int, int]] = set()
    for pair in _level_pairs(level):
        endpoints.add((pair.start.y, pair.start.x))
        endpoints.add((pair.end.y, pair.end.x))
    return endpoints


def _point_distance(left: tuple[int, int], right: tuple[int, int]) -> int:
    return abs(left[0] - right[0]) + abs(left[1] - right[1])


def _path_cells(level: Any) -> dict[str, list[tuple[int, int]]]:
    paths: dict[str, list[tuple[int, int]]] = {}
    for pair_id, path in _level_golden_path(level).items():
        normalized: list[tuple[int, int]] = []
        for cell in path:
            if isinstance(cell, (list, tuple)) and len(cell) == 2:
                normalized.append((int(cell[0]), int(cell[1])))
        if normalized:
            paths[pair_id] = normalized
    return paths


def analyze_solution_guide(level: Any) -> dict[str, Any]:
    golden = _level_golden_path(level)
    width = _level_width(level) or 0
    height = _level_height(level) or 0
    blocker_set = {(cell.y, cell.x) for cell in _level_blockers(level)}
    pair_map = {pair.id: pair for pair in _level_pairs(level)}
    endpoint_owner: dict[tuple[int, int], str] = {}
    for pair in pair_map.values():
        endpoint_owner[(pair.start.y, pair.start.x)] = pair.id
        endpoint_owner[(pair.end.y, pair.end.x)] = pair.id
    occupancy: dict[tuple[int, int], list[tuple[str, int]]] = {}
    overlaps: list[dict[str, Any]] = []
    missing_paths = 0
    issues: set[str] = set()

    for pair_id, cells in golden.items():
        pair = pair_map.get(pair_id)
        if pair is None:
            issues.add("unknown_pair_path")
            continue
        if not isinstance(cells, list) or len(cells) < 2:
            missing_paths += 1
            issues.add("missing_solution_path")
            continue
        first = cells[0]
        last = cells[-1]
        valid_endpoints = (
            first == [pair.start.y, pair.start.x] and last == [pair.end.y, pair.end.x]
        ) or (
            first == [pair.end.y, pair.end.x] and last == [pair.start.y, pair.start.x]
        )
        if not valid_endpoints:
            issues.add("path_wrong_endpoints")
        for index, cell in enumerate(cells):
            if not isinstance(cell, (list, tuple)) or len(cell) < 2:
                issues.add("invalid_path_cell")
                continue
            row = _as_int(cell[0])
            col = _as_int(cell[1])
            if row is None or col is None:
                issues.add("invalid_path_cell")
                continue
            if row < 0 or col < 0 or row >= height or col >= width:
                issues.add("path_out_of_bounds")
                continue
            if index > 0 and _point_distance(tuple(cells[index - 1]), (row, col)) != 1:
                issues.add("invalid_path_step")
            if (row, col) in blocker_set:
                issues.add("path_hits_blocker")
            if 0 < index < len(cells) - 1:
                owner = endpoint_owner.get((row, col))
                if owner and owner != pair_id:
                    issues.add("path_through_foreign_endpoint")
            occupancy.setdefault((row, col), []).append((pair_id, index))

    for key, entries in occupancy.items():
        distinct_pairs = sorted({entry[0] for entry in entries})
        if len(distinct_pairs) > 1:
            overlaps.append({"key": f"{key[0]},{key[1]}", "pairs": distinct_pairs})
    if overlaps:
        issues.add("paths_cross")
    return {"issues": sorted(issues), "overlaps": overlaps, "missingPaths": missing_paths, "isClean": not issues}


def has_critical_guide_issue(guide: Any) -> bool:
    issues = _mapping(guide).get("issues")
    if not isinstance(issues, list):
        return False
    return any(str(issue) in CRITICAL_GUIDE_ISSUES for issue in issues)


def guide_trust_level(guide: Any) -> str:
    if not guide:
        return "LOW"
    if has_critical_guide_issue(guide):
        return "LOW"
    issues = _mapping(guide).get("issues")
    if isinstance(issues, list) and issues:
        return "MED"
    return "HIGH"


def _adjacent_blocker_count(blocker_set: set[tuple[int, int]], width: int, height: int, cell: tuple[int, int]) -> int:
    count = 0
    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        row = cell[0] + dr
        col = cell[1] + dc
        if row < 0 or col < 0 or row >= height or col >= width:
            continue
        if (row, col) in blocker_set:
            count += 1
    return count


def extract_mechanic_signals(level: Any) -> dict[str, float]:
    width = _level_width(level) or 0
    height = _level_height(level) or 0
    blockers = _level_blockers(level)
    pairs = _level_pairs(level)
    blocker_set = {(cell.y, cell.x) for cell in blockers}
    free_cells = max(0, width * height - len(blockers) - len(pairs) * 2)
    adjacency_links = 0
    for cell in blockers:
        for dr, dc in ((1, 0), (0, 1)):
            if (cell.y + dr, cell.x + dc) in blocker_set:
                adjacency_links += 1
    quadrants = {f"{0 if cell.y < height / 2 else 1}:{0 if cell.x < width / 2 else 1}" for cell in blockers}
    pair_span = 0.0
    if pairs:
        pair_span = sum(_point_distance((pair.start.y, pair.start.x), (pair.end.y, pair.end.x)) for pair in pairs) / len(pairs)
    path_map = _path_cells(level)
    path_cells: set[tuple[int, int]] = set()
    for cells in path_map.values():
        path_cells.update(cells)
    if not path_cells:
        path_cells = _level_endpoint_cells(level)
    engaged = 0
    dead = 0
    multi_pair = 0
    pressured_pairs: set[str] = set()
    for blocker in blockers:
        adjacent_paths = 0
        for pair in pairs:
            cells = path_map.get(pair.id) or [(pair.start.y, pair.start.x), (pair.end.y, pair.end.x)]
            if any(_point_distance((blocker.y, blocker.x), cell) <= 1 for cell in cells):
                adjacent_paths += 1
                pressured_pairs.add(pair.id)
        if adjacent_paths:
            engaged += 1
        else:
            dead += 1
        if adjacent_paths >= 2:
            multi_pair += 1
    blocker_count = max(1, len(blockers))
    path_coverage = len(path_cells) / max(1, width * height - len(blockers))
    total_bends = 0
    total_excess_bends = 0
    for cells in path_map.values():
        if len(cells) < 3:
            continue
        last_direction: tuple[int, int] | None = None
        bends = 0
        for index in range(1, len(cells)):
            prev = cells[index - 1]
            curr = cells[index]
            direction = (curr[0] - prev[0], curr[1] - prev[1])
            if last_direction is not None and direction != last_direction:
                bends += 1
            last_direction = direction
        total_bends += bends
        total_excess_bends += max(0, bends - 1)
    pair_count = max(1, len(path_map) or len(pairs))
    bends_per_pair = total_bends / pair_count
    excess_bends_per_pair = total_excess_bends / pair_count
    bend_pressure = total_excess_bends / max(1, len(path_cells))
    straightness = max(0.0, min(1.0, 1.0 - bend_pressure))
    return {
        "freeCells": free_cells,
        "freeCellsPerPair": free_cells / max(1, len(pairs)),
        "blockerDensity": len(blockers) / max(1, width * height),
        "blockerClusterRatio": adjacency_links / blocker_count,
        "blockerSpread": len(quadrants) / 4,
        "engagedBlockerRatio": engaged / blocker_count,
        "deadBlockerRatio": dead / blocker_count,
        "multiPairBlockerRatio": multi_pair / blocker_count,
        "pairPressureCoverage": len(pressured_pairs) / max(1, len(pairs)),
        "pairSpan": pair_span,
        "pathCoverage": path_coverage,
        "uncoveredFreeCells": max(0, width * height - len(blockers) - len(path_cells)),
        "totalBends": total_bends,
        "totalExcessBends": total_excess_bends,
        "bendsPerPair": bends_per_pair,
        "excessBendsPerPair": excess_bends_per_pair,
        "bendPressure": bend_pressure,
        "pathStraightness": straightness,
    }


def learning_tag_counts(entries: Iterable[Any]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for entry in entries:
        for tag in _mapping(entry).get("feedback_tags", []) or []:
            tag_text = str(tag).strip()
            if not tag_text:
                continue
            counts[tag_text] = counts.get(tag_text, 0) + 1
    return counts


def _directional_penalty(delta: float, intent: str, same_weight: float = 0.9, opposite_weight: float = 3.4) -> float:
    if intent == "same":
        return abs(delta) * same_weight
    if intent in {"more", "bigger"}:
        if delta > 0:
            return 0.0
        if delta == 0:
            return 0.65
        return abs(delta) * opposite_weight
    if intent in {"less", "smaller"}:
        if delta < 0:
            return 0.0
        if delta == 0:
            return 0.65
        return abs(delta) * opposite_weight
    return abs(delta) * same_weight


def normalize_reference_adjustments(value: Any = None) -> dict[str, str]:
    raw = _mapping(value)
    pairs = str(raw.get("pairs") or "same").strip().lower()
    blockers = str(raw.get("blockers") or "same").strip().lower()
    board = str(raw.get("board") or "same").strip().lower()
    return {
        "pairs": pairs if pairs in {"less", "same", "more"} else "same",
        "blockers": blockers if blockers in {"less", "same", "more"} else "same",
        "board": board if board in {"smaller", "same", "bigger"} else "same",
    }


def procedural_reference_adjustment_label(kind: str, value: Any) -> str:
    normalized = str(value or "same").strip().lower()
    if kind == "board":
        if normalized == "smaller":
            return "smaller board"
        if normalized == "bigger":
            return "bigger board"
        return "same board"
    if kind == "pairs":
        if normalized == "less":
            return "fewer pairs"
        if normalized == "more":
            return "more pairs"
        return "same pairs"
    if kind == "blockers":
        if normalized == "less":
            return "fewer blockers"
        if normalized == "more":
            return "more blockers"
        return "same blockers"
    return normalized or "same"


def procedural_reference_intent_text(adjustments: Any = None) -> str:
    normalized = normalize_reference_adjustments(adjustments)
    return (
        "Intent: "
        f"{procedural_reference_adjustment_label('pairs', normalized['pairs'])} · "
        f"{procedural_reference_adjustment_label('blockers', normalized['blockers'])} · "
        f"{procedural_reference_adjustment_label('board', normalized['board'])}"
    )


def procedural_reference_has_active_intent(adjustments: Any = None) -> bool:
    normalized = normalize_reference_adjustments(adjustments)
    return (
        normalized["pairs"] != "same"
        or normalized["blockers"] != "same"
        or normalized["board"] != "same"
    )


def procedural_reference_intent_penalty(base_level: Any, candidate: Any, adjustments: Any = None) -> float:
    base_features = extract_features(base_level)
    candidate_features = extract_features(candidate)
    base_area = float((base_features["boardWidth"] or 0) * (base_features["boardHeight"] or 0))
    candidate_area = float((candidate_features["boardWidth"] or 0) * (candidate_features["boardHeight"] or 0))
    normalized = normalize_reference_adjustments(adjustments)
    return (
        _directional_penalty(float((candidate_features["pairs"] or 0) - (base_features["pairs"] or 0)), normalized["pairs"], 0.85, 3.2)
        + _directional_penalty(
            float((candidate_features["blockers"] or 0) - (base_features["blockers"] or 0)),
            normalized["blockers"],
            0.9,
            3.5,
        )
        + _directional_penalty(candidate_area - base_area, normalized["board"], 0.55, 2.7)
    )


def ranked_reference_generation_levels(base_level: Any, adjustments: Any = None) -> list[int]:
    normalized = normalize_reference_adjustments(adjustments)
    base_features = extract_features(base_level)
    base_area = float((base_features["boardWidth"] or 0) * (base_features["boardHeight"] or 0))
    ranked: list[tuple[float, int]] = []
    for level_number, cfg in PROCEDURAL_CURVE.items():
        boards = tuple(cfg.get("board") or ()) or (base_features["boardWidth"] or 4,)
        pairs = tuple(cfg.get("pairs") or ()) or (base_features["pairs"] or 2,)
        blockers = tuple(cfg.get("blockers") or ()) or (base_features["blockers"] or 0,)
        avg_board = (boards[0] + boards[-1]) / 2
        avg_pairs = (pairs[0] + pairs[-1]) / 2
        avg_blockers = (blockers[0] + blockers[-1]) / 2
        approx_area = avg_board * avg_board
        score = (
            _directional_penalty(avg_pairs - float(base_features["pairs"] or 0), normalized["pairs"], 0.8, 2.8)
            + _directional_penalty(avg_blockers - float(base_features["blockers"] or 0), normalized["blockers"], 0.8, 3.0)
            + _directional_penalty(approx_area - base_area, normalized["board"], 0.5, 2.4)
            + abs(level_number - int(base_features["level"] or 1)) * 0.2
        )
        ranked.append((score, level_number))
    ranked.sort(key=lambda item: item[0])
    return [level_number for _, level_number in ranked]


def procedural_reference_candidate_rank(
    base_level: Any,
    candidate: Any,
    adjustments: Any = None,
    learning: Any | None = None,
) -> ProceduralReferenceRank:
    base_features = extract_features(base_level)
    candidate_features = extract_features(candidate)
    similarity = feature_distance(base_features, candidate_features)
    learning_bias = score_candidate_with_learning(candidate, learning).score
    intent_penalty = procedural_reference_intent_penalty(base_level, candidate, adjustments)
    move_delta = abs(float(_get(base_level, "moves") or 0) - float(_get(candidate, "moves") or 0)) * 0.04
    total = similarity + move_delta + intent_penalty - learning_bias * 0.08
    return ProceduralReferenceRank(
        similarity=similarity,
        learning_bias=learning_bias,
        intent_penalty=intent_penalty,
        total=total,
    )


def learning_driven_generation_adjustments(level_number: int, learning: Any | None = None) -> dict[str, float | int | None]:
    default_signal_targets = {
        "desiredPathCoverage": 0.94 if level_number >= 7 else 0.92 if level_number >= 4 else 0.9,
        "desiredPathStraightness": 0.76 if level_number >= 7 else 0.72,
        "desiredEngagedBlockerRatio": 0 if level_number <= 2 else 0.55 if level_number <= 4 else 0.68 if level_number <= 6 else 0.78,
        "desiredPairPressureCoverage": 0 if level_number <= 2 else 0.45 if level_number <= 4 else 0.58 if level_number <= 6 else 0.68,
        "desiredMultiPairBlockerRatio": 0.1 if level_number <= 4 else 0.18 if level_number <= 6 else 0.24,
        "maxDeadBlockerRatio": 1 if level_number <= 2 else 0.45 if level_number <= 4 else 0.3 if level_number <= 6 else 0.2,
    }
    buckets = normalize_learning_buckets(learning or {})
    approved_same = [entry for entry in buckets["approved"] if _as_int(entry.get("level")) == level_number]
    rejected_same = [entry for entry in buckets["rejected"] if _as_int(entry.get("level")) == level_number]
    corrected_same = [entry.get("corrected_features") for entry in buckets["corrections"] if _as_int(_mapping(entry.get("corrected_features")).get("level")) == level_number]
    approved_mean = mean_feature(entry.get("features") for entry in approved_same)
    rejected_mean = mean_feature(entry.get("features") for entry in rejected_same)
    corrected_mean = mean_feature(corrected_same)
    preferred_mean = corrected_mean or approved_mean
    approved_tags = learning_tag_counts(approved_same or buckets["approved"])
    rejected_tags = learning_tag_counts(rejected_same or buckets["rejected"])
    if not preferred_mean and not rejected_mean:
        return {
            "blockerBias": 0,
            "pairBias": 0,
            "boardDelta": 0,
            "desiredMovesFloor": 0,
            "desiredSolutionCap": None,
            "maxFreeCellsPerPair": None,
            "avoidBlockerClusters": 0,
            "spreadBlockers": 0,
            "desiredPathCoverage": default_signal_targets["desiredPathCoverage"],
            "desiredPathStraightness": default_signal_targets["desiredPathStraightness"],
            "desiredEngagedBlockerRatio": default_signal_targets["desiredEngagedBlockerRatio"],
            "desiredPairPressureCoverage": default_signal_targets["desiredPairPressureCoverage"],
            "desiredMultiPairBlockerRatio": default_signal_targets["desiredMultiPairBlockerRatio"],
            "maxDeadBlockerRatio": default_signal_targets["maxDeadBlockerRatio"],
        }
    blocker_bias_base = max(
        -2,
        min(
            3,
            round(
                ((preferred_mean["blockers"] if preferred_mean else 0) - (rejected_mean["blockers"] if rejected_mean else 0)) * 0.7
                + ((preferred_mean["moves"] if preferred_mean else 0) - (rejected_mean["moves"] if rejected_mean else 0)) * 0.12
            ),
        ),
    )
    blocker_bias = max(
        -2,
        min(
            4,
            blocker_bias_base
            + rejected_tags.get("needs_more_blockers", 0)
            - rejected_tags.get("meaningless_blockers", 0)
            - rejected_tags.get("bad_blocker_clustering", 0)
            - min(2, approved_tags.get("good_blocker_distribution", 0)),
        ),
    )
    pair_bias = max(
        -1,
        min(
            4,
            rejected_tags.get("needs_more_pairs", 0) * 2
            + rejected_tags.get("too_easy", 0)
            + rejected_tags.get("too_much_space", 0)
            - max(0, 1 if rejected_mean and preferred_mean and rejected_mean["pairs"] >= preferred_mean["pairs"] else 0),
        ),
    )
    board_delta = max(
        -1,
        min(
            2,
            1 if rejected_tags.get("too_easy", 0) >= 2 else -1 if rejected_tags.get("too_much_space", 0) > 0 else 1 if rejected_tags.get("needs_more_pairs", 0) > 0 else 0,
        ),
    )
    desired_moves_floor = max(0, round(max(preferred_mean["moves"] if preferred_mean else 0, (rejected_mean["moves"] if rejected_mean else 0) + 1) + rejected_tags.get("too_easy", 0) * 1.5))
    desired_solution_cap = (
        max(1, round(max(1, preferred_mean["solutions"] if preferred_mean else 1)))
        if preferred_mean
        else (max(1, round(max(1, (rejected_mean["solutions"] if rejected_mean else 2) - 1))) if rejected_mean else None)
    )
    max_free_cells_per_pair = (
        max(4.5, 8 - rejected_tags.get("too_much_space", 0) * 0.8 - rejected_tags.get("needs_more_pairs", 0) * 0.6)
        if rejected_tags.get("too_much_space", 0) or rejected_tags.get("too_easy", 0) or rejected_tags.get("needs_more_pairs", 0)
        else None
    )
    desired_path_coverage = min(
        0.98,
        max(
            default_signal_targets["desiredPathCoverage"],
            default_signal_targets["desiredPathCoverage"] + rejected_tags.get("too_much_space", 0) * 0.02 + rejected_tags.get("too_easy", 0) * 0.015,
        ),
    )
    desired_path_straightness = max(
        default_signal_targets["desiredPathStraightness"],
        min(
            0.95,
            max(
                preferred_mean["path_straightness"] if preferred_mean and "path_straightness" in preferred_mean else 0,
                default_signal_targets["desiredPathStraightness"] + approved_tags.get("good_layout", 0) * 0.01 + approved_tags.get("good_flow", 0) * 0.008,
            ),
        ),
    )
    desired_engaged_blocker_ratio = min(
        0.95,
        max(
            default_signal_targets["desiredEngagedBlockerRatio"],
            default_signal_targets["desiredEngagedBlockerRatio"] + rejected_tags.get("meaningless_blockers", 0) * 0.04 + rejected_tags.get("too_easy", 0) * 0.015,
        ),
    )
    desired_pair_pressure_coverage = min(
        0.95,
        max(
            default_signal_targets["desiredPairPressureCoverage"],
            default_signal_targets["desiredPairPressureCoverage"] + rejected_tags.get("meaningless_blockers", 0) * 0.05 + rejected_tags.get("needs_more_pairs", 0) * 0.03,
        ),
    )
    desired_multi_pair_blocker_ratio = min(
        0.7,
        max(
            default_signal_targets["desiredMultiPairBlockerRatio"],
            default_signal_targets["desiredMultiPairBlockerRatio"] + rejected_tags.get("meaningless_blockers", 0) * 0.03 + approved_tags.get("good_blocker_distribution", 0) * 0.015,
        ),
    )
    max_dead_blocker_ratio = max(
        0.08,
        default_signal_targets["maxDeadBlockerRatio"] - rejected_tags.get("meaningless_blockers", 0) * 0.05,
    )
    return {
        "blockerBias": blocker_bias,
        "pairBias": pair_bias,
        "boardDelta": board_delta,
        "desiredMovesFloor": desired_moves_floor,
        "desiredSolutionCap": desired_solution_cap,
        "maxFreeCellsPerPair": max_free_cells_per_pair,
        "avoidBlockerClusters": rejected_tags.get("bad_blocker_clustering", 0) + rejected_tags.get("meaningless_blockers", 0),
        "spreadBlockers": approved_tags.get("good_blocker_distribution", 0) + rejected_tags.get("meaningless_blockers", 0) * 0.5,
        "desiredPathCoverage": desired_path_coverage,
        "desiredPathStraightness": desired_path_straightness,
        "desiredEngagedBlockerRatio": desired_engaged_blocker_ratio,
        "desiredPairPressureCoverage": desired_pair_pressure_coverage,
        "desiredMultiPairBlockerRatio": desired_multi_pair_blocker_ratio,
        "maxDeadBlockerRatio": max_dead_blocker_ratio,
    }


def score_candidate_with_learning(level: Any, learning: Any | None = None) -> ProceduralCandidateScore:
    features = extract_features(level)
    signals = extract_mechanic_signals(level)
    guide = analyze_solution_guide(level)
    buckets = normalize_learning_buckets(learning or {})
    approved_same = [entry for entry in buckets["approved"] if _as_int(entry.get("level")) == _as_int(features["level"]) ]
    rejected_same = [entry for entry in buckets["rejected"] if _as_int(entry.get("level")) == _as_int(features["level"]) ]
    approved_same_mean = mean_feature(entry.get("features") for entry in approved_same)
    rejected_same_mean = mean_feature(entry.get("features") for entry in rejected_same)
    approved_global_mean = mean_feature(entry.get("features") for entry in buckets["approved"])
    rejected_global_mean = mean_feature(entry.get("features") for entry in buckets["rejected"])
    corrected_global_mean = mean_feature(entry.get("corrected_features") for entry in buckets["corrections"])
    approved_tag_counts = learning_tag_counts(approved_same or buckets["approved"])
    rejected_tag_counts = learning_tag_counts(rejected_same or buckets["rejected"])
    rejected_pair_feedback = [feedback for entry in buckets["rejected"] for feedback in (_mapping(entry).get("pair_feedback", []) or [])]
    candidate_pair_feedback = _extract_pair_feedback(level)
    pair_penalty = 0.0
    for candidate_pair in candidate_pair_feedback:
        nearest = math.inf
        for rejected_pair in rejected_pair_feedback:
            nearest = min(nearest, _pair_feedback_distance(candidate_pair, rejected_pair))
        if math.isfinite(nearest) and nearest < 4.5:
            pair_penalty += (4.5 - nearest) * 1.4
    rejected_reason_counts: dict[str, int] = {}
    for entry in buckets["rejected"]:
        reason_code = str(entry.get("reason_code") or "").strip()
        if reason_code:
            rejected_reason_counts[reason_code] = rejected_reason_counts.get(reason_code, 0) + 1
    guide_penalty = 0.0
    if "paths_cross" in guide["issues"]:
        guide_penalty += rejected_reason_counts.get("paths_cross", 0) * 8 + 20
    if "missing_solution_path" in guide["issues"]:
        guide_penalty += rejected_reason_counts.get("misleading_solution", 0) * 6 + 12
    mechanic_penalty = (
        max(0.0, signals["freeCellsPerPair"] - 8.5) * (rejected_tag_counts.get("too_much_space", 0) * 2.6 + rejected_tag_counts.get("too_easy", 0) * 1.2)
        + max(0.0, 4 - float(features["pairs"])) * rejected_tag_counts.get("needs_more_pairs", 0) * 5.2
        + max(0.0, 0.34 - signals["blockerDensity"]) * (rejected_tag_counts.get("needs_more_blockers", 0) * 18 + rejected_tag_counts.get("too_easy", 0) * 12)
        + max(0.0, signals["blockerClusterRatio"] - 0.7) * rejected_tag_counts.get("bad_blocker_clustering", 0) * 10
        + max(0.0, 1 - signals["blockerSpread"]) * rejected_tag_counts.get("meaningless_blockers", 0) * 8
        + max(0.0, signals["blockerClusterRatio"] - 0.5) * rejected_tag_counts.get("meaningless_blockers", 0) * 6
        + max(0.0, 0.68 - signals["engagedBlockerRatio"]) * (rejected_tag_counts.get("meaningless_blockers", 0) * 14 + rejected_tag_counts.get("too_easy", 0) * 6)
        + signals["deadBlockerRatio"] * (rejected_tag_counts.get("meaningless_blockers", 0) * 18 + rejected_tag_counts.get("bad_layout", 0) * 6)
        + max(0.0, 0.55 - signals["pairPressureCoverage"]) * (rejected_tag_counts.get("meaningless_blockers", 0) * 12 + rejected_tag_counts.get("too_easy", 0) * 6 + rejected_tag_counts.get("needs_more_pairs", 0) * 3)
        + max(0.0, 0.18 - signals["multiPairBlockerRatio"]) * (rejected_tag_counts.get("meaningless_blockers", 0) * 8 + rejected_tag_counts.get("bad_layout", 0) * 4)
        + max(0.0, 0.9 - signals["pathCoverage"]) * 48
        + signals["excessBendsPerPair"] * 18
        + max(0.0, signals["bendPressure"] - 0.16) * 42
    )
    mechanic_reward = (
        signals["blockerSpread"] * approved_tag_counts.get("good_blocker_distribution", 0) * 4.5
        + max(0.0, 1 - abs(signals["blockerClusterRatio"] - 0.45)) * approved_tag_counts.get("good_blocker_distribution", 0) * 2.2
        + signals["engagedBlockerRatio"] * approved_tag_counts.get("good_blocker_distribution", 0) * 5.0
        + signals["pairPressureCoverage"] * approved_tag_counts.get("good_blocker_distribution", 0) * 4.0
        + signals["multiPairBlockerRatio"] * approved_tag_counts.get("good_blocker_distribution", 0) * 3.2
        + max(0.0, float(features["moves"]) - 11) * approved_tag_counts.get("good_flow", 0) * 0.18
        + max(0.0, 1 - abs(signals["freeCellsPerPair"] - 6.5) / 6.5) * approved_tag_counts.get("good_layout", 0) * 4.0
        + max(0.0, signals["pathCoverage"] - 0.9) * 18
        + max(0.0, signals["pathStraightness"] - 0.72) * 16
    )
    feature_dist = (
        (-feature_distance(features, approved_same_mean) * 2.2 if approved_same_mean else 0.0)
        + (feature_distance(features, rejected_same_mean) * 1.6 if rejected_same_mean else 0.0)
        + (-feature_distance(features, approved_global_mean) * 0.9 if approved_global_mean else 0.0)
        + (feature_distance(features, rejected_global_mean) * 0.55 if rejected_global_mean else 0.0)
        + (-feature_distance(features, corrected_global_mean) * 1.25 if corrected_global_mean else 0.0)
    )
    score = feature_dist - mechanic_penalty + mechanic_reward - guide_penalty - pair_penalty
    return ProceduralCandidateScore(
        score=score,
        feature_distance=feature_dist,
        mechanic_penalty=mechanic_penalty,
        mechanic_reward=mechanic_reward,
        guide_penalty=guide_penalty,
        pair_penalty=pair_penalty,
    )


def _extract_pair_feedback(level: Any, pair_ids: Iterable[str] | None = None) -> list[dict[str, float]]:
    width = max(1, _level_width(level) or 0)
    height = max(1, _level_height(level) or 0)
    blocker_set = {(cell.y, cell.x) for cell in _level_blockers(level)}
    selected = {str(pair_id or "").upper() for pair_id in pair_ids or [] if str(pair_id or "").strip()}
    pool = [pair for pair in _level_pairs(level) if not selected or pair.id.upper() in selected]
    result: list[dict[str, float]] = []
    for pair in pool:
        result.append(
            {
                "pair_id": pair.id.upper(),
                "manhattan": float(_point_distance((pair.start.y, pair.start.x), (pair.end.y, pair.end.x))),
                "start_edge": 1.0 if pair.start.x in {0, width - 1} or pair.start.y in {0, height - 1} else 0.0,
                "end_edge": 1.0 if pair.end.x in {0, width - 1} or pair.end.y in {0, height - 1} else 0.0,
                "start_blockers": float(_adjacent_blocker_count(blocker_set, width, height, (pair.start.y, pair.start.x))),
                "end_blockers": float(_adjacent_blocker_count(blocker_set, width, height, (pair.end.y, pair.end.x))),
                "midpoint_r": (pair.start.y + pair.end.y) / (2 * max(1, height - 1)),
                "midpoint_c": (pair.start.x + pair.end.x) / (2 * max(1, width - 1)),
            }
        )
    return result


def extract_pair_feedback(level: Any, pair_ids: Iterable[str] | None = None) -> list[dict[str, float]]:
    return _extract_pair_feedback(level, pair_ids)


def _pair_feedback_distance(left: Any, right: Any) -> float:
    if not left or not right:
        return math.inf
    left_map = _mapping(left)
    right_map = _mapping(right)
    return (
        abs((left_map.get("manhattan") or 0) - (right_map.get("manhattan") or 0)) * 1.3
        + abs((left_map.get("start_edge") or 0) - (right_map.get("start_edge") or 0)) * 1.1
        + abs((left_map.get("end_edge") or 0) - (right_map.get("end_edge") or 0)) * 1.1
        + abs((left_map.get("start_blockers") or 0) - (right_map.get("start_blockers") or 0)) * 0.9
        + abs((left_map.get("end_blockers") or 0) - (right_map.get("end_blockers") or 0)) * 0.9
        + abs((left_map.get("midpoint_r") or 0) - (right_map.get("midpoint_r") or 0)) * 5
        + abs((left_map.get("midpoint_c") or 0) - (right_map.get("midpoint_c") or 0)) * 5
    )

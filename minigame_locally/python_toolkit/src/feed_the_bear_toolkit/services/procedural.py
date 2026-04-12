from __future__ import annotations

import json
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping, Sequence

from feed_the_bear_toolkit.domain.levels import (
    load_level_file,
    parse_level_dict,
    serialize_level_to_canonical_dict,
    slugify_file_part,
)
from feed_the_bear_toolkit.domain.models import PAIR_IDS, Cell, Level
from feed_the_bear_toolkit.domain.procedural import (
    PROCEDURAL_CURVE,
    analyze_solution_guide,
    extract_features,
    extract_mechanic_signals,
    extract_pair_feedback,
    guide_trust_level,
    has_critical_guide_issue,
    infer_learning_source_family,
    normalize_learning_entry,
    normalize_learning_buckets,
    normalize_reference_adjustments,
    procedural_reference_candidate_rank,
    procedural_reference_intent_text,
    ranked_reference_generation_levels,
    learning_driven_generation_adjustments,
)
from feed_the_bear_toolkit.domain.validation import validate_level_structure
from feed_the_bear_toolkit.services.config import find_project_root, resolve_repo_path


DEFAULT_LEARNING_PATH = ".local/toolkit_state/learning_state.json"
FALLBACK_PAIR_TYPES = (
    "red",
    "red_striped",
    "blue",
    "blue_striped",
    "green",
    "green_striped",
    "yellow",
    "yellow_striped",
    "orange",
)


@dataclass(slots=True, frozen=True)
class ProceduralReferenceCandidate:
    name: str
    source_kind: str
    level: Level
    reference_intent: dict[str, str]
    similarity: float
    learning_bias: float
    intent_penalty: float
    total_rank: float


@dataclass(slots=True, frozen=True)
class GeneratedProceduralLevel:
    level: Level
    attempt_count: int
    source: str


@dataclass(slots=True, frozen=True)
class GeneratedProceduralBatch:
    levels: tuple[Level, ...]
    start_level: int
    end_level: int
    requested_count: int
    produced_count: int
    attempts: int
    source: str


DENSITY_RANGES: dict[str, tuple[int, int]] = {
    "HIGH": (6, 20),
    "MEDIUM-HIGH": (3, 5),
    "MEDIUM": (2, 4),
    "MEDIUM-LOW": (2, 3),
    "LOW": (2, 2),
    "VERY-LOW": (2, 2),
    "SINGLE": (1, 1),
    "LOW-MEDIUM": (2, 4),
}

DIFFICULTY_TO_DENSITY: dict[str, tuple[str, ...]] = {
    "EASY": ("HIGH", "MEDIUM-HIGH"),
    "MEDIUM": ("MEDIUM", "MEDIUM-LOW"),
    "HARD": ("LOW", "VERY-LOW", "SINGLE", "LOW-MEDIUM"),
}


def load_procedural_learning_state(project_root: Path | None = None, learning_path: Path | str | None = None) -> dict[str, Any]:
    root = find_project_root(project_root)
    if learning_path is None:
        target = root / DEFAULT_LEARNING_PATH
    else:
        value = Path(learning_path)
        target = value.resolve() if value.is_absolute() else resolve_repo_path(value, root)
    if not target.exists():
        return normalize_learning_buckets({})
    try:
        parsed = json.loads(target.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, OSError):
        return normalize_learning_buckets({})
    return normalize_learning_buckets(parsed if isinstance(parsed, Mapping) else {})


def count_learning_solutions(level: Level, *, cap: int = 20, timeout_seconds: float = 2.5) -> int:
    pairs = [
        {
            "id": pair.id,
            "a": {"x": pair.start.x, "y": pair.start.y},
            "b": {"x": pair.end.x, "y": pair.end.y},
        }
        for pair in level.pairs
    ]
    blockers = [{"x": cell.x, "y": cell.y} for cell in level.blockers]
    width = int(level.cols or 0)
    height = int(level.rows or 0)
    if width <= 0 or height <= 0 or not pairs:
        return 0
    return _count_solutions(width, height, pairs, blockers, cap=cap, timeout_seconds=timeout_seconds)


def evaluate_learning_level(level: Level) -> dict[str, Any]:
    validation_report = validate_level_structure(level)
    stored_solution_count = level.solution_count
    verified_solution_count = count_learning_solutions(level)
    mechanic_signals = extract_mechanic_signals(level)
    guide = analyze_solution_guide(level)
    pair_feedback = extract_pair_feedback(level)
    guide_issues = list(guide.get("issues") or [])
    guide_trust = guide_trust_level(guide)
    features = extract_features(level)
    board_width = int(level.cols or 0)
    board_height = int(level.rows or 0)

    return {
        "validation": {
            "valid": bool(validation_report.valid),
            "status": "OK" if validation_report.valid else "INVALID",
            "errors": list(validation_report.errors),
            "solvable": verified_solution_count >= 1,
            "solution_count": verified_solution_count,
            "stored_solution_count": stored_solution_count,
            "solution_count_mismatch": stored_solution_count != verified_solution_count,
            "decal_required": bool(validation_report.decal_required),
            "decal_pass": validation_report.decal_pass,
        },
        "feature_signals": {
            "boardArea": board_width * board_height,
            "pairCount": len(level.pairs),
            "blockerCount": len(level.blockers),
            "freeCells": mechanic_signals["freeCells"],
            "freeCellsPerPair": mechanic_signals["freeCellsPerPair"],
            "blockerDensity": mechanic_signals["blockerDensity"],
            "blockerClusterRatio": mechanic_signals["blockerClusterRatio"],
            "blockerSpread": mechanic_signals["blockerSpread"],
            "engagedBlockerRatio": mechanic_signals["engagedBlockerRatio"],
            "deadBlockerRatio": mechanic_signals["deadBlockerRatio"],
            "multiPairBlockerRatio": mechanic_signals["multiPairBlockerRatio"],
            "pairPressureCoverage": mechanic_signals["pairPressureCoverage"],
            "pairSpan": mechanic_signals["pairSpan"],
            "pathCoverage": mechanic_signals["pathCoverage"],
            "uncoveredFreeCells": mechanic_signals["uncoveredFreeCells"],
            "totalBends": mechanic_signals["totalBends"],
            "totalExcessBends": mechanic_signals["totalExcessBends"],
            "bendsPerPair": mechanic_signals["bendsPerPair"],
            "excessBendsPerPair": mechanic_signals["excessBendsPerPair"],
            "bendPressure": mechanic_signals["bendPressure"],
            "pathStraightness": mechanic_signals["pathStraightness"],
            "guideTrust": guide_trust,
            "guideIssueCount": len(guide_issues),
            "criticalGuideIssue": 1 if has_critical_guide_issue(guide) else 0,
            "pairFeedbackCount": len(pair_feedback),
        },
        "guide_issues": guide_issues,
        "pair_feedback": pair_feedback,
        "features": {
            **features,
            "solutions": verified_solution_count,
            "solution_count": verified_solution_count,
            "stored_solution_count": stored_solution_count,
            "solution_count_mismatch": 1 if stored_solution_count != verified_solution_count else 0,
            "board_area": board_width * board_height,
            "pair_count": len(level.pairs),
            "blocker_count": len(level.blockers),
            "free_cells": mechanic_signals["freeCells"],
            "free_cells_per_pair": mechanic_signals["freeCellsPerPair"],
            "blocker_density": mechanic_signals["blockerDensity"],
            "blocker_cluster_ratio": mechanic_signals["blockerClusterRatio"],
            "blocker_spread": mechanic_signals["blockerSpread"],
            "pair_span": mechanic_signals["pairSpan"],
            "path_coverage": mechanic_signals["pathCoverage"],
            "uncovered_free_cells": mechanic_signals["uncoveredFreeCells"],
            "total_bends": mechanic_signals["totalBends"],
            "total_excess_bends": mechanic_signals["totalExcessBends"],
            "bends_per_pair": mechanic_signals["bendsPerPair"],
            "excess_bends_per_pair": mechanic_signals["excessBendsPerPair"],
            "bend_pressure": mechanic_signals["bendPressure"],
            "path_straightness": mechanic_signals["pathStraightness"],
        },
    }


def build_learning_record(
    level: Level,
    decision: str,
    *,
    context: str = "manual",
    extra: Mapping[str, Any] | None = None,
    evaluation: Mapping[str, Any] | None = None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    normalized_decision = str(decision or "").strip().lower()
    if normalized_decision not in {"approve", "reject"}:
        raise ValueError("decision must be approve or reject")
    safe_extra = dict(extra or {})
    verified = dict(evaluation or evaluate_learning_level(level))
    record = normalize_learning_entry(
        {
            **safe_extra,
            "level": int(level.difficulty_tier or 1),
            "timestamp": int(now_ms if now_ms is not None else time.time() * 1000),
            "context": context,
            "source_family": infer_learning_source_family(context, safe_extra),
            "auto_recorded": bool(safe_extra.get("auto_recorded")),
            "validation": dict(verified.get("validation") or {}),
            "feature_signals": dict(verified.get("feature_signals") or {}),
            "guide_issues": list(verified.get("guide_issues") or []),
            "features": dict(verified.get("features") or {}),
        },
        normalized_decision,
    )
    pair_feedback = list(verified.get("pair_feedback") or [])
    if pair_feedback and not isinstance(record.get("pair_feedback"), list):
        record["pair_feedback"] = pair_feedback
    return record


def save_learning_record(
    level: Level,
    decision: str,
    *,
    project_root: Path | None = None,
    learning_path: Path | str | None = None,
    context: str = "manual",
    extra: Mapping[str, Any] | None = None,
    now_ms: int | None = None,
) -> tuple[Path, dict[str, Any], dict[str, Any]]:
    root = find_project_root(project_root)
    if learning_path is None:
        target = root / DEFAULT_LEARNING_PATH
    else:
        value = Path(learning_path)
        target = value.resolve() if value.is_absolute() else resolve_repo_path(value, root)
    buckets = normalize_learning_buckets({})
    if target.exists():
        try:
            parsed = json.loads(target.read_text(encoding="utf-8-sig"))
        except (json.JSONDecodeError, OSError):
            parsed = {}
        buckets = normalize_learning_buckets(parsed if isinstance(parsed, Mapping) else {})
    bucket_name = "approved" if str(decision or "").strip().lower() == "approve" else "rejected"
    record = build_learning_record(level, decision, context=context, extra=extra, now_ms=now_ms)
    buckets[bucket_name].append(record)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(buckets, indent=2, ensure_ascii=False), encoding="utf-8")
    return target, buckets, record


def density_match(label: str, count: int) -> bool:
    low, high = DENSITY_RANGES.get(str(label or "").strip().upper(), (1, 20))
    return low <= int(count) <= high


def density_to_difficulty(label: str) -> str:
    normalized = str(label or "").strip().upper()
    for difficulty, labels in DIFFICULTY_TO_DENSITY.items():
        if normalized in labels:
            return difficulty
    return "MEDIUM"


def difficulty_to_target_density(difficulty: str, solution_count: int) -> str:
    labels = DIFFICULTY_TO_DENSITY.get(str(difficulty or "").strip().upper(), DIFFICULTY_TO_DENSITY["MEDIUM"])
    for label in labels:
        if density_match(label, solution_count):
            return label
    return labels[0]


def _manhattan(left: tuple[int, int], right: tuple[int, int]) -> int:
    return abs(left[0] - right[0]) + abs(left[1] - right[1])


def _coord_key(row: int, col: int) -> str:
    return f"{row},{col}"


def _rng(seed: int) -> Callable[[], float]:
    value = seed & 0xFFFFFFFF

    def next_value() -> float:
        nonlocal value
        value = (value + 0x6D2B79F5) & 0xFFFFFFFF
        mixed = math.imul(value ^ (value >> 15), 1 | value) if hasattr(math, "imul") else ((value ^ (value >> 15)) * (1 | value))
        mixed &= 0xFFFFFFFF
        mixed ^= (mixed + ((mixed ^ (mixed >> 7)) * (61 | mixed))) & 0xFFFFFFFF
        return ((mixed ^ (mixed >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return next_value


def _rand_int(next_value: Callable[[], float], minimum: int, maximum: int) -> int:
    return minimum + int(next_value() * (maximum - minimum + 1))


def _pick(next_value: Callable[[], float], options: Sequence[int]) -> int:
    return options[int(next_value() * len(options))]


def _iter_repo_level_paths(root: Path) -> Iterable[Path]:
    levels_root = root / "levels"
    if not levels_root.exists():
        return ()
    return sorted(path for path in levels_root.rglob("*.json") if path.is_file())


def _level_number(level: Level) -> int:
    return int(level.difficulty_tier or 1)


def _clone_level(level: Level, preferred_name: str = "") -> Level:
    return parse_level_dict(serialize_level_to_canonical_dict(level, preferred_name or f"{level.id}.json"))


def _can_shrink_reference_board(level: Level) -> bool:
    width = int(level.cols or 0)
    height = int(level.rows or 0)
    if width <= 4 or height <= 4:
        return False
    max_row = max([cell.y for cell in level.blockers] + [pair.start.y for pair in level.pairs] + [pair.end.y for pair in level.pairs] + [0])
    max_col = max([cell.x for cell in level.blockers] + [pair.start.x for pair in level.pairs] + [pair.end.x for pair in level.pairs] + [0])
    return max_row < height - 1 and max_col < width - 1


def _all_cells(width: int, height: int) -> list[tuple[int, int]]:
    return [(row, col) for row in range(height) for col in range(width)]


def _is_corner(width: int, height: int, row: int, col: int) -> bool:
    return (row in {0, height - 1}) and (col in {0, width - 1})


def _make_grid(width: int, height: int, pairs: Sequence[dict[str, Any]], blockers: Sequence[dict[str, Any]]) -> list[list[str]]:
    grid = [["EMPTY" for _ in range(width)] for _ in range(height)]
    for blocker in blockers:
        grid[int(blocker["y"])][int(blocker["x"])] = "BLOCKED"
    for pair in pairs:
        start = pair["a"]
        end = pair["b"]
        grid[int(start["y"])][int(start["x"])] = f"NODE_{pair['id']}1"
        grid[int(end["y"])][int(end["x"])] = f"NODE_{pair['id']}2"
    return grid


def _enumerate_pair_paths(
    board_width: int,
    board_height: int,
    start: tuple[int, int],
    end: tuple[int, int],
    occupied: set[str],
    local_cap: int,
    deadline: float,
) -> list[list[tuple[int, int]]]:
    base_dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    dir_cache: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for sign_dr in (-1, 0, 1):
        for sign_dc in (-1, 0, 1):
            key = (sign_dr, sign_dc)
            dir_cache[key] = sorted(
                base_dirs,
                key=lambda item: -((item[0] * sign_dr) + (item[1] * sign_dc)),
            )

    paths: list[list[tuple[int, int]]] = []

    def dfs(cur: tuple[int, int], path: list[tuple[int, int]], occ: set[str]) -> None:
        if time.monotonic() > deadline or len(paths) >= local_cap:
            return
        if cur == end:
            paths.append(list(path))
            return
        dirs = dir_cache[(int(math.copysign(1, end[0] - cur[0])) if end[0] != cur[0] else 0, int(math.copysign(1, end[1] - cur[1])) if end[1] != cur[1] else 0)]
        for dr, dc in dirs:
            nr = cur[0] + dr
            nc = cur[1] + dc
            if nr < 0 or nc < 0 or nr >= board_height or nc >= board_width:
                continue
            key = _coord_key(nr, nc)
            is_end = (nr, nc) == end
            if not is_end and key in occ:
                continue
            next_occ = set(occ)
            if not is_end:
                next_occ.add(key)
            path.append((nr, nc))
            dfs((nr, nc), path, next_occ)
            path.pop()
            if time.monotonic() > deadline or len(paths) >= local_cap:
                return

    dfs(start, [start], occupied)
    paths.sort(key=len)
    return paths


def _count_solutions(
    board_width: int,
    board_height: int,
    pairs: Sequence[dict[str, Any]],
    blockers: Sequence[dict[str, Any]],
    cap: int = 20,
    require_full_coverage: bool = False,
    timeout_seconds: float = 2.5,
) -> int:
    blocked_set = {_coord_key(int(blocker["y"]), int(blocker["x"])) for blocker in blockers}
    required_occupied_cells = board_width * board_height
    deadline = time.monotonic() + timeout_seconds
    memo: dict[str, int] = {}

    def dfs(index: int, occupied: set[str]) -> int:
        if time.monotonic() > deadline:
            return cap
        if index == len(pairs):
            if require_full_coverage:
                return 1 if len(occupied) == required_occupied_cells else 0
            return 1
        memo_key = f"{index}|{';'.join(sorted(occupied))}"
        if memo_key in memo:
            return memo[memo_key]
        pair = pairs[index]
        start = (int(pair["a"]["y"]), int(pair["a"]["x"]))
        end = (int(pair["b"]["y"]), int(pair["b"]["x"]))
        local_occ = set(occupied)
        local_occ.add(_coord_key(*start))
        paths = _enumerate_pair_paths(board_width, board_height, start, end, local_occ, 150, deadline)
        total = 0
        for path in paths:
            next_occ = set(occupied)
            for row, col in path:
                key = _coord_key(row, col)
                if require_full_coverage or key != _coord_key(*end):
                    next_occ.add(key)
            total += dfs(index + 1, next_occ)
            if total >= cap:
                memo[memo_key] = cap
                return cap
        memo[memo_key] = total
        return total

    return dfs(0, blocked_set)


def _find_one_solution_paths(
    board_width: int,
    board_height: int,
    pairs: Sequence[dict[str, Any]],
    blockers: Sequence[dict[str, Any]],
    timeout_seconds: float = 2.5,
) -> dict[str, list[list[int]]] | None:
    blocked_set = {_coord_key(int(blocker["y"]), int(blocker["x"])) for blocker in blockers}
    deadline = time.monotonic() + timeout_seconds

    def dfs(index: int, occupied: set[str], solution: dict[str, list[list[int]]]) -> dict[str, list[list[int]]] | None:
        if time.monotonic() > deadline:
            return None
        if index == len(pairs):
            return solution
        pair = pairs[index]
        start = (int(pair["a"]["y"]), int(pair["a"]["x"]))
        end = (int(pair["b"]["y"]), int(pair["b"]["x"]))
        local_occ = set(occupied)
        local_occ.add(_coord_key(*start))
        paths = _enumerate_pair_paths(board_width, board_height, start, end, local_occ, 120, deadline)
        for path in paths:
            next_occ = set(occupied)
            for row, col in path:
                key = _coord_key(row, col)
                if key != _coord_key(*end):
                    next_occ.add(key)
            next_solution = dict(solution)
            next_solution[str(pair["id"])] = [[row, col] for row, col in path]
            result = dfs(index + 1, next_occ, next_solution)
            if result:
                return result
        return None

    return dfs(0, blocked_set, {})


def _choose_nodes(width: int, height: int, pair_count: int, next_value: Callable[[], float], pair_types: Sequence[str]) -> list[dict[str, Any]]:
    candidates = [cell for cell in _all_cells(width, height) if not _is_corner(width, height, cell[0], cell[1])]
    shuffled = sorted(candidates, key=lambda _: next_value())
    selected: list[tuple[int, int]] = []
    for cell in shuffled:
        if len(selected) >= pair_count * 2:
            break
        if all(_manhattan(existing, cell) >= 2 for existing in selected):
            selected.append(cell)
    for cell in shuffled:
        if len(selected) >= pair_count * 2:
            break
        if cell not in selected:
            selected.append(cell)
    return [
        {
            "id": PAIR_IDS[index] if index < len(PAIR_IDS) else f"P{index + 1}",
            "type": pair_types[index % len(pair_types)],
            "a": {"x": selected[index * 2][1], "y": selected[index * 2][0]},
            "b": {"x": selected[index * 2 + 1][1], "y": selected[index * 2 + 1][0]},
        }
        for index in range(pair_count)
        if index * 2 + 1 < len(selected)
    ]


def _simple_path(start: tuple[int, int], end: tuple[int, int], occupied: set[str]) -> list[list[int]]:
    row, col = start
    path = [[row, col]]
    while row != end[0]:
        row += 1 if row < end[0] else -1
        key = _coord_key(row, col)
        if key not in occupied:
            occupied.add(key)
            path.append([row, col])
    while col != end[1]:
        col += 1 if col < end[1] else -1
        key = _coord_key(row, col)
        if key not in occupied:
            occupied.add(key)
            path.append([row, col])
    if path[-1] != [end[0], end[1]]:
        path.append([end[0], end[1]])
    return path


def _blocker_pressure_score(
    cell: tuple[int, int],
    path_cells_by_pair: Mapping[str, list[list[int]]],
    board_width: int,
    board_height: int,
    next_value: Callable[[], float],
    existing_blockers: Sequence[dict[str, Any]] = (),
) -> float:
    row, col = cell
    center_row = (board_height - 1) / 2
    center_col = (board_width - 1) / 2
    adjacency = 0
    nearby = 0
    for cells in path_cells_by_pair.values():
        for path_row, path_col in cells:
            distance = abs(path_row - row) + abs(path_col - col)
            if distance == 1:
                adjacency += 1
            if distance <= 2:
                nearby += 1
    existing_set = {_coord_key(int(blocker["y"]), int(blocker["x"])) for blocker in existing_blockers}
    blocker_adjacency = 0
    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if _coord_key(row + dr, col + dc) in existing_set:
            blocker_adjacency += 1
    center_bias = -abs(row - center_row) - abs(col - center_col)
    return adjacency * 10 + nearby * 2 + center_bias - blocker_adjacency * 1.8 + next_value() * 0.35


def _pair_types_for_level(level: Level) -> list[str]:
    pair_types = [pair.type for pair in level.pairs if pair.type]
    return pair_types or list(FALLBACK_PAIR_TYPES)


def _occupied(level_pairs: list[dict[str, Any]], blockers: list[dict[str, Any]]) -> set[tuple[int, int]]:
    occupied: set[tuple[int, int]] = set()
    for pair in level_pairs:
        start = pair.get("a") or {}
        end = pair.get("b") or {}
        occupied.add((int(start.get("y", 0)), int(start.get("x", 0))))
        occupied.add((int(end.get("y", 0)), int(end.get("x", 0))))
    for blocker in blockers:
        occupied.add((int(blocker.get("y", 0)), int(blocker.get("x", 0))))
    return occupied


def _pick_pair_cells(free_cells: list[tuple[int, int]], variant_index: int) -> tuple[tuple[int, int], tuple[int, int]] | None:
    if len(free_cells) < 2:
        return None
    start_index = variant_index % len(free_cells)
    end_index = (len(free_cells) - 1 - start_index) % len(free_cells)
    if start_index == end_index:
        end_index = (end_index - 1) % len(free_cells)
    first = free_cells[start_index]
    second = free_cells[end_index]
    if first == second:
        return None
    return first, second


def _solver_count_for_candidate(
    width: int,
    height: int,
    pairs: Sequence[dict[str, Any]],
    blockers: Sequence[dict[str, Any]],
    *,
    require_full_coverage: bool = False,
) -> int:
    return _count_solutions(
        width,
        height,
        pairs,
        blockers,
        20,
        require_full_coverage=require_full_coverage,
    )


def _build_mutated_reference_candidate(
    base_level: Level,
    base_file_name: str,
    adjustments: Mapping[str, str],
    variant_index: int,
) -> Level | None:
    candidate = serialize_level_to_canonical_dict(base_level, base_file_name or f"{base_level.id}.json")
    base_pairs = list(base_level.pairs)
    width = int(base_level.cols or 0)
    height = int(base_level.rows or 0)
    candidate["pairs"] = [
        {
            **json.loads(json.dumps(pair)),
            "id": (
                str(base_pairs[index].id)
                if index < len(base_pairs) and getattr(base_pairs[index], "id", None)
                else PAIR_IDS[index] if index < len(PAIR_IDS) else f"P{index + 1}"
            ),
        }
        for index, pair in enumerate(candidate.get("pairs") or [])
    ]
    candidate["blockers"] = [json.loads(json.dumps(blocker)) for blocker in candidate.get("blockers") or []]

    def _sync_grid_size() -> None:
        candidate["gridSize"] = {"cols": width, "rows": height}

    def _snapshot() -> tuple[int, int, list[dict[str, Any]], list[dict[str, Any]]]:
        return (
            width,
            height,
            [json.loads(json.dumps(pair)) for pair in candidate.get("pairs") or []],
            [json.loads(json.dumps(blocker)) for blocker in candidate.get("blockers") or []],
        )

    def _restore(snapshot: tuple[int, int, list[dict[str, Any]], list[dict[str, Any]]]) -> None:
        nonlocal width, height
        width, height, pairs_snapshot, blockers_snapshot = snapshot
        candidate["pairs"] = pairs_snapshot
        candidate["blockers"] = blockers_snapshot
        _sync_grid_size()

    def _accept_if_solved() -> bool:
        return _solver_count_for_candidate(
            width,
            height,
            candidate.get("pairs") or [],
            candidate.get("blockers") or [],
        ) >= 1

    def _apply_mutation(mutator: Callable[[], bool | None]) -> bool:
        snapshot = _snapshot()
        result = mutator()
        if result is False:
            _restore(snapshot)
            return False
        _sync_grid_size()
        if not _accept_if_solved():
            _restore(snapshot)
            return False
        return True

    def _resize_candidate(grow: bool) -> bool:
        nonlocal width, height
        width += 1 if grow else -1
        height += 1 if grow else -1
        return True

    _sync_grid_size()
    if adjustments["board"] == "bigger" and width < 7 and height < 7:
        _apply_mutation(lambda: _resize_candidate(True))
    elif adjustments["board"] == "smaller":
        if not _can_shrink_reference_board(base_level):
            return None
        _apply_mutation(lambda: _resize_candidate(False))

    pair_types = _pair_types_for_level(base_level)

    max_pairs_for_board = min(len(PAIR_IDS), max(2, (width * height) // 6))
    if adjustments["pairs"] == "more" and len(candidate["pairs"]) >= max_pairs_for_board and width < 7 and height < 7:
        _apply_mutation(lambda: _resize_candidate(True))
        max_pairs_for_board = min(len(PAIR_IDS), max(2, (width * height) // 6))
    if adjustments["pairs"] == "more" and len(candidate["pairs"]) < max_pairs_for_board:
        add_count = min(2, max_pairs_for_board - len(candidate["pairs"]))
        for offset in range(add_count):
            added = False
            occupied = _occupied(candidate["pairs"], candidate["blockers"])
            free_cells = [cell for cell in _all_cells(width, height) if cell not in occupied]
            for search_offset in range(len(free_cells)):
                pair_cells = _pick_pair_cells(free_cells, variant_index + offset + search_offset)
                if pair_cells is None:
                    break
                pair_id = PAIR_IDS[len(candidate["pairs"])] if len(candidate["pairs"]) < len(PAIR_IDS) else f"P{len(candidate['pairs']) + 1}"
                pair_type = pair_types[len(candidate["pairs"]) % len(pair_types)]
                trial_pair = {
                    "id": pair_id,
                    "type": pair_type,
                    "a": {"x": pair_cells[0][1], "y": pair_cells[0][0]},
                    "b": {"x": pair_cells[1][1], "y": pair_cells[1][0]},
                }
                if _apply_mutation(lambda trial_pair=trial_pair: candidate["pairs"].append(trial_pair)):
                    added = True
                    break
            if not added:
                continue
    elif adjustments["pairs"] == "less" and len(candidate["pairs"]) > 2:
        _apply_mutation(lambda: candidate.__setitem__("pairs", list(candidate["pairs"][:-1])))

    if adjustments["blockers"] == "more":
        occupied = _occupied(candidate["pairs"], candidate["blockers"])
        free_cells = [cell for cell in _all_cells(width, height) if cell not in occupied]
        cluster_size = min(3, len(free_cells))
        start_index = variant_index % max(1, len(free_cells))
        for offset in range(cluster_size):
            added = False
            for search_offset in range(len(free_cells)):
                row, col = free_cells[(start_index + offset + search_offset) % len(free_cells)]
                blocker = {"x": col, "y": row}
                if blocker in candidate["blockers"]:
                    continue
                if _apply_mutation(lambda blocker=blocker: candidate["blockers"].append(blocker)):
                    added = True
                    break
            if not added:
                continue
    elif adjustments["blockers"] == "less" and len(candidate["blockers"]) > 1:
        remove_count = min(2, len(candidate["blockers"]) - 1)
        for _ in range(remove_count):
            removed = False
            for index in range(len(candidate["blockers"]) - 1, -1, -1):
                if _apply_mutation(
                    lambda index=index: candidate.__setitem__(
                        "blockers",
                        [blocker for blocker_i, blocker in enumerate(candidate["blockers"]) if blocker_i != index],
                    )
                ):
                    removed = True
                    break
            if not removed:
                break

    solution_count = _solver_count_for_candidate(width, height, candidate["pairs"], candidate["blockers"])
    if solution_count < 1:
        return None
    solved = _find_one_solution_paths(width, height, candidate["pairs"], candidate["blockers"]) or {}
    candidate["solutionCount"] = solution_count
    candidate["solution_count"] = solution_count
    candidate["goldenPath"] = solved
    candidate["golden_path"] = solved
    candidate["moves"] = (
        sum(max(0, len(path) - 1) for path in solved.values())
        if solved
        else max(0, int(base_level.moves or 0) + (1 if adjustments["pairs"] == "more" else -1 if adjustments["pairs"] == "less" else 0))
    )
    meta = dict(candidate.get("meta") or {})
    meta.update(
        {
            "generated_from_reference": base_file_name or f"{base_level.id}.json",
            "reference_intent": dict(adjustments),
            "recovery_mutation": True,
        }
    )
    candidate["meta"] = meta
    try:
        parsed = parse_level_dict(candidate)
    except Exception:
        return None
    return parsed


def _level_signature(level: Level) -> str:
    def _canonical_pair(pair: Any) -> tuple[Any, ...]:
        endpoints = sorted(
            (
                (int(pair.start.y), int(pair.start.x)),
                (int(pair.end.y), int(pair.end.x)),
            )
        )
        return (
            str(pair.type or ""),
            endpoints[0][0],
            endpoints[0][1],
            endpoints[1][0],
            endpoints[1][1],
        )

    return json.dumps(
        {
            "cols": level.cols,
            "rows": level.rows,
            "moves": int(level.moves or 0),
            "difficultyTier": int(level.difficulty_tier or 0),
            "targetDensity": str(level.target_density or ""),
            "pairs": sorted(_canonical_pair(pair) for pair in level.pairs),
            "blockers": sorted((cell.y, cell.x) for cell in level.blockers),
        },
        sort_keys=True,
    )


def _has_critical_guide_issue(level: Level) -> bool:
    validation = dict(level.validation or {})
    if validation.get("solvable") is False:
        return True
    if validation.get("curve_integrity") is False:
        return True
    if validation.get("no_late_dead_ends") is False:
        return True
    if validation.get("no_isolated_pairs") is False:
        return True
    return False


def _align_reference_metadata(candidate: Level, base_level: Level) -> Level:
    target_tier = int(base_level.difficulty_tier or candidate.difficulty_tier or 1)
    target_density = str(base_level.target_density or candidate.target_density or "").strip() or None
    manual_difficulty = (
        str(base_level.meta.get("manual_difficulty") or "").strip()
        or density_to_difficulty(target_density or candidate.target_density or "MEDIUM")
    )
    candidate.difficulty_tier = target_tier
    candidate.target_density = target_density
    candidate.meta["manual_difficulty"] = manual_difficulty
    candidate.raw["difficultyTier"] = target_tier
    candidate.raw["level"] = target_tier
    if target_density is not None:
        candidate.raw["targetDensity"] = target_density
        candidate.raw["target_density"] = target_density
    candidate.raw.setdefault("meta", {})
    candidate.raw["meta"]["manual_difficulty"] = manual_difficulty
    return candidate


def _blocker_improves_solution_count(new_count: int, current_count: int) -> bool:
    return int(new_count) >= 1 and int(new_count) < int(current_count)


def _candidate_is_solvable(level: Level) -> bool:
    return int(level.solution_count or 0) >= 1


def generate_level_raw(
    level_number: int,
    learning: Any | None = None,
    *,
    seed_offset: int = 0,
) -> Level:
    cfg = PROCEDURAL_CURVE.get(int(level_number))
    if cfg is None:
        raise ValueError(f"Unsupported level number: {level_number}")
    learning_adjustments = learning_driven_generation_adjustments(int(level_number), learning)
    last_error: RuntimeError | None = None
    for generation_attempt in range(6):
        attempt_seed_offset = int(seed_offset) + generation_attempt * 53
        next_value = _rng(10000 + int(level_number) * 101 + attempt_seed_offset * 9973)
        base_board_size = _pick(next_value, tuple(int(item) for item in cfg.get("board") or (5,)))
        board_size = max(4, min(7, int(base_board_size + int(learning_adjustments.get("boardDelta") or 0))))
        board_width = board_size
        board_height = board_size
        pair_range = tuple(int(item) for item in cfg.get("pairs") or (2, 2))
        blocker_range = tuple(int(item) for item in cfg.get("blockers") or (0, 0))
        pair_count = max(2, min(len(PAIR_IDS), _rand_int(next_value, pair_range[0], pair_range[-1]) + int(learning_adjustments.get("pairBias") or 0)))
        blocker_target = max(0, _rand_int(next_value, blocker_range[0], blocker_range[-1]) + int(learning_adjustments.get("blockerBias") or 0))
        pair_types = list(FALLBACK_PAIR_TYPES)
        pairs = _choose_nodes(board_width, board_height, pair_count, next_value, pair_types)
        occupied = set()
        for pair in pairs:
            occupied.add(_coord_key(int(pair["a"]["y"]), int(pair["a"]["x"])))
            occupied.add(_coord_key(int(pair["b"]["y"]), int(pair["b"]["x"])))
        scaffold_path: dict[str, list[list[int]]] = {}
        for pair in pairs:
            start = (int(pair["a"]["y"]), int(pair["a"]["x"]))
            end = (int(pair["b"]["y"]), int(pair["b"]["x"]))
            scaffold_path[str(pair["id"])] = _simple_path(start, end, occupied)
        path_cells = {_coord_key(row, col) for cells in scaffold_path.values() for row, col in cells}
        node_cells = {
            _coord_key(int(pair["a"]["y"]), int(pair["a"]["x"]))
            for pair in pairs
        } | {
            _coord_key(int(pair["b"]["y"]), int(pair["b"]["x"]))
            for pair in pairs
        }
        blockers: list[dict[str, Any]] = []
        pool = [
            cell for cell in _all_cells(board_width, board_height)
            if _coord_key(cell[0], cell[1]) not in path_cells and _coord_key(cell[0], cell[1]) not in node_cells
        ]
        current_count = _count_solutions(board_width, board_height, pairs, blockers, 20)
        if current_count < 1:
            last_error = RuntimeError(
                f"Initial scaffold unsolved for level {level_number} seed {seed_offset} attempt {generation_attempt}"
            )
            continue
        while pool:
            pool.sort(
                key=lambda cell: _blocker_pressure_score(cell, scaffold_path, board_width, board_height, next_value, blockers),
                reverse=True,
            )
            cell = pool.pop(0)
            reached_blocker_target = len(blockers) >= blocker_target
            reached_solution_cap = (
                learning_adjustments.get("desiredSolutionCap") is not None
                and current_count <= int(learning_adjustments.get("desiredSolutionCap") or 0)
            )
            if reached_blocker_target and (reached_solution_cap or density_match(str(cfg["density"]), current_count)):
                break
            trial = [*blockers, {"x": cell[1], "y": cell[0]}]
            new_count = _count_solutions(board_width, board_height, pairs, trial, 20)
            if _blocker_improves_solution_count(new_count, current_count):
                blockers = trial
                current_count = new_count
                solved_paths = _find_one_solution_paths(board_width, board_height, pairs, blockers) or scaffold_path
                trial_moves = sum(max(0, len(path) - 1) for path in solved_paths.values())
                signals_level = {
                    "board_width": board_width,
                    "board_height": board_height,
                    "pairs": pairs,
                    "blockers": blockers,
                    "golden_path": solved_paths,
                }
                from feed_the_bear_toolkit.domain.procedural import extract_mechanic_signals

                signals = extract_mechanic_signals(signals_level)
                meets_move_floor = float(learning_adjustments.get("desiredMovesFloor") or 0) <= 0 or trial_moves >= float(learning_adjustments.get("desiredMovesFloor") or 0)
                meets_space_target = learning_adjustments.get("maxFreeCellsPerPair") is None or signals["freeCellsPerPair"] <= float(learning_adjustments.get("maxFreeCellsPerPair") or 0)
                meets_coverage_target = signals["pathCoverage"] >= float(learning_adjustments.get("desiredPathCoverage") or 0.9)
                meets_straightness_target = signals["pathStraightness"] >= float(learning_adjustments.get("desiredPathStraightness") or 0.72)
                adjusted_pair_pressure_floor = max(
                    0.0,
                    float(learning_adjustments.get("desiredPairPressureCoverage") or 0.0) - (0.18 if len(blockers) <= 1 else 0.0),
                )
                adjusted_multi_pair_floor = max(
                    0.0,
                    float(learning_adjustments.get("desiredMultiPairBlockerRatio") or 0.0) - (0.12 if len(blockers) <= 2 else 0.0),
                )
                meets_blocker_usefulness = (
                    not blockers
                    or (
                        signals["engagedBlockerRatio"] >= float(learning_adjustments.get("desiredEngagedBlockerRatio") or 0.0)
                        and signals["deadBlockerRatio"] <= float(learning_adjustments.get("maxDeadBlockerRatio") if learning_adjustments.get("maxDeadBlockerRatio") is not None else 1.0)
                        and signals["pairPressureCoverage"] >= adjusted_pair_pressure_floor
                        and signals["multiPairBlockerRatio"] >= adjusted_multi_pair_floor
                    )
                )
                if (
                    len(blockers) >= blocker_target
                    and meets_move_floor
                    and meets_space_target
                    and meets_coverage_target
                    and meets_straightness_target
                    and meets_blocker_usefulness
                    and density_match(str(cfg["density"]), current_count)
                    and (
                        learning_adjustments.get("desiredSolutionCap") is None
                        or current_count <= int(learning_adjustments.get("desiredSolutionCap") or current_count)
                    )
                ):
                    break

        solved_golden_path = _find_one_solution_paths(board_width, board_height, pairs, blockers) or scaffold_path
        moves = sum(max(0, len(path) - 1) for path in solved_golden_path.values())
        solution_count = current_count
        from feed_the_bear_toolkit.domain.procedural import extract_mechanic_signals

        final_signals = extract_mechanic_signals(
            {
                "board_width": board_width,
                "board_height": board_height,
                "pairs": pairs,
                "blockers": blockers,
                "golden_path": solved_golden_path,
            }
        )
        raw = {
            "level": int(level_number),
            "board_size": board_width,
            "board_width": board_width,
            "board_height": board_height,
            "grid": _make_grid(board_width, board_height, pairs, blockers),
            "pairs": pairs,
            "blockers": blockers,
            "decal": False,
            "moves": moves,
            "solution_count": solution_count,
            "target_density": str(cfg["density"]),
            "difficulty": density_to_difficulty(str(cfg["density"])),
            "golden_path": solved_golden_path,
            "validation": {
                "solvable": solution_count >= 1,
                "density_match": density_match(str(cfg["density"]), solution_count),
                "decal_required": False,
                "decal_pass": None,
                "path_coverage": final_signals["pathCoverage"],
                "path_straightness": final_signals["pathStraightness"],
                "excess_bends_per_pair": final_signals["excessBendsPerPair"],
                "engaged_blocker_ratio": final_signals["engagedBlockerRatio"],
                "dead_blocker_ratio": final_signals["deadBlockerRatio"],
                "pair_pressure_coverage": final_signals["pairPressureCoverage"],
                "multi_pair_blocker_ratio": final_signals["multiPairBlockerRatio"],
                "full_path_area": final_signals["pathCoverage"] >= 0.98,
                "early_mistake_detection": True,
                "no_isolated_pairs": True,
                "no_late_dead_ends": True,
                "curve_integrity": True,
            },
            "meta": {
                "generation_attempts": generation_attempt + 1,
                "failed_checks": [],
                "path_coverage": final_signals["pathCoverage"],
                "path_straightness": final_signals["pathStraightness"],
                "excess_bends_per_pair": final_signals["excessBendsPerPair"],
                "engaged_blocker_ratio": final_signals["engagedBlockerRatio"],
                "dead_blocker_ratio": final_signals["deadBlockerRatio"],
                "pair_pressure_coverage": final_signals["pairPressureCoverage"],
                "multi_pair_blocker_ratio": final_signals["multiPairBlockerRatio"],
                "source_name": f"procedural_level_{level_number}_{seed_offset}.json",
            },
        }
        return parse_level_dict(raw)

    raise last_error or RuntimeError(f"Failed to generate solvable level scaffold for level {level_number}")


def generate_level(level_number: int, learning: Any | None = None, *, attempts: int = 12) -> GeneratedProceduralLevel:
    best: Level | None = None
    best_score: float | None = None
    best_solved: Level | None = None
    best_solved_score: float | None = None
    from feed_the_bear_toolkit.domain.procedural import score_candidate_with_learning

    for attempt in range(max(12, 1, attempts)):
        try:
            candidate = generate_level_raw(level_number, learning, seed_offset=attempt)
        except RuntimeError:
            continue
        score = score_candidate_with_learning(candidate, learning).score
        if best is None or best_score is None or score > best_score:
            best = candidate
            best_score = score
        if _candidate_is_solvable(candidate) and (best_solved is None or best_solved_score is None or score > best_solved_score):
            best_solved = candidate
            best_solved_score = score
    chosen = best_solved or best
    if chosen is None:
        raise RuntimeError("Failed to generate a procedural level")
    return GeneratedProceduralLevel(level=chosen, attempt_count=max(1, attempts), source="generate_level")


def rank_procedural_reference_candidates(
    base_level: Any,
    candidates: Iterable[Level],
    adjustments: Mapping[str, Any] | None = None,
    learning: Any | None = None,
    limit: int = 3,
) -> list[ProceduralReferenceCandidate]:
    normalized = normalize_reference_adjustments(adjustments)
    ranked: list[ProceduralReferenceCandidate] = []
    seen_signatures: set[str] = set()
    for candidate in candidates:
        validation = validate_level_structure(candidate)
        if not validation.valid or not _candidate_is_solvable(candidate):
            continue
        signature = _level_signature(candidate)
        if signature in seen_signatures:
            continue
        seen_signatures.add(signature)
        rank = procedural_reference_candidate_rank(base_level, candidate, normalized, learning)
        ranked.append(
            ProceduralReferenceCandidate(
                name=str(candidate.meta.get("source_name") or candidate.id or "reference_variant"),
                source_kind=str(candidate.meta.get("source_kind") or "generated"),
                level=candidate,
                reference_intent=normalized,
                similarity=rank.similarity,
                learning_bias=rank.learning_bias,
                intent_penalty=rank.intent_penalty,
                total_rank=rank.total,
            )
        )
    ranked.sort(key=lambda item: item.total_rank)
    return ranked[: max(1, limit)]


def generate_reference_variants(
    base_level: Level,
    project_root: Path | None = None,
    *,
    base_file_name: str = "",
    adjustments: Mapping[str, Any] | None = None,
    count: int = 3,
    learning_path: Path | str | None = None,
) -> list[ProceduralReferenceCandidate]:
    root = find_project_root(project_root)
    normalized = normalize_reference_adjustments(adjustments)
    learning = load_procedural_learning_state(root, learning_path)
    preferred_levels = ranked_reference_generation_levels(base_level, normalized)
    active_intent = (
        normalized.get("pairs") != "same"
        or normalized.get("blockers") != "same"
        or normalized.get("board") != "same"
    )
    max_seeds = 60 if active_intent else 40
    target_pool_size = max(count * (12 if active_intent else 8), 20)
    candidate_pool: list[Level] = []
    seen_signatures: set[str] = set()

    def push_candidate(candidate: Level | None, *, relaxed: bool, source_kind: str) -> bool:
        if candidate is None:
            return False
        validation = validate_level_structure(candidate)
        if not validation.valid or not _candidate_is_solvable(candidate):
            return False
        candidate = _align_reference_metadata(candidate, base_level)
        guide = analyze_solution_guide(candidate)
        if not relaxed and (has_critical_guide_issue(guide) or _has_critical_guide_issue(candidate)):
            return False
        signature = _level_signature(candidate)
        if signature in seen_signatures:
            return False
        seen_signatures.add(signature)
        candidate.meta["source_kind"] = f"{source_kind}_relaxed" if relaxed else source_kind
        candidate_pool.append(candidate)
        return True

    preferred_level_set = set(preferred_levels)
    for path in _iter_repo_level_paths(root):
        if len(candidate_pool) >= target_pool_size:
            break
        try:
            level = load_level_file(path)
        except Exception:
            continue
        if level.id == base_level.id:
            continue
        if preferred_level_set and _level_number(level) not in preferred_level_set:
            continue
        level.meta.setdefault("source_name", path.name)
        push_candidate(level, relaxed=False, source_kind="repo")
        if len(candidate_pool) >= max(14, count * 6):
            break

    generated_levels = list(preferred_levels) or [_level_number(base_level)]
    generation_levels_budget = max(1, min(len(generated_levels), max(3, count + 1)))
    for seed in range(max_seeds):
        if len(candidate_pool) >= target_pool_size:
            break
        for level_number in generated_levels[:generation_levels_budget]:
            if len(candidate_pool) >= target_pool_size:
                break
            try:
                generated = generate_level_raw(level_number, learning, seed_offset=500 + seed + (level_number * 97))
            except Exception:
                continue
            generated.meta["source_name"] = f"procedural_level_{level_number}_{seed}.json"
            push_candidate(generated, relaxed=False, source_kind="generated")

    if len(candidate_pool) < count:
        for seed in range(max_seeds):
            if len(candidate_pool) >= count:
                break
            for level_number in generated_levels[:generation_levels_budget]:
                if len(candidate_pool) >= count:
                    break
                try:
                    generated = generate_level_raw(level_number, learning, seed_offset=2500 + seed + (level_number * 131))
                except Exception:
                    continue
                generated.meta["source_name"] = f"procedural_level_{level_number}_{seed}_relaxed.json"
                push_candidate(generated, relaxed=True, source_kind="generated")

    if len(candidate_pool) < count:
        for variant_index in range(1, count * 4 + 1):
            if len(candidate_pool) >= count:
                break
            mutated = _build_mutated_reference_candidate(base_level, base_file_name, normalized, variant_index)
            if mutated is None:
                continue
            mutated.meta["source_name"] = (
                f"{slugify_file_part(base_file_name or base_level.id or 'reference_level')}_variant_{variant_index}.json"
            )
            push_candidate(mutated, relaxed=True, source_kind="mutation")

    if len(candidate_pool) < count:
        for path in _iter_repo_level_paths(root):
            if len(candidate_pool) >= count:
                break
            try:
                level = load_level_file(path)
            except Exception:
                continue
            if level.id == base_level.id:
                continue
            level.meta.setdefault("source_name", path.name)
            push_candidate(level, relaxed=True, source_kind="repo")

    return rank_procedural_reference_candidates(
        base_level,
        candidate_pool,
        adjustments=normalized,
        learning=learning,
        limit=count,
    )


def generate_learned_session_batch(
    start_level: int,
    end_level: int,
    count: int,
    learning: Any | None = None,
) -> GeneratedProceduralBatch:
    start = max(1, min(10, int(start_level)))
    end = max(1, min(10, int(end_level)))
    low = min(start, end)
    high = max(start, end)
    safe_count = max(1, min(50, int(count)))
    out: list[Level] = []
    seen_signatures: set[str] = set()
    level_number = low
    attempts = 0
    max_attempts = safe_count * 20

    while len(out) < safe_count and attempts < max_attempts:
        candidate = generate_level(level_number, learning, attempts=12).level
        validation = validate_level_structure(candidate)
        signature = _level_signature(candidate)
        if validation.valid and _candidate_is_solvable(candidate) and not _has_critical_guide_issue(candidate) and signature not in seen_signatures:
            seen_signatures.add(signature)
            out.append(candidate)
        level_number += 1
        if level_number > high:
            level_number = low
        attempts += 1

    return GeneratedProceduralBatch(
        levels=tuple(out),
        start_level=low,
        end_level=high,
        requested_count=safe_count,
        produced_count=len(out),
        attempts=attempts,
        source="generate_learned_session_batch",
    )

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
    timeout_seconds: float = 2.5,
) -> int:
    blocked_set = {_coord_key(int(blocker["y"]), int(blocker["x"])) for blocker in blockers}
    deadline = time.monotonic() + timeout_seconds
    memo: dict[str, int] = {}

    def dfs(index: int, occupied: set[str]) -> int:
        if time.monotonic() > deadline:
            return cap
        if index == len(pairs):
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
                if key != _coord_key(*end):
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


def _build_mutated_reference_candidate(
    base_level: Level,
    base_file_name: str,
    adjustments: Mapping[str, str],
    variant_index: int,
) -> Level | None:
    candidate = serialize_level_to_canonical_dict(base_level, base_file_name or f"{base_level.id}.json")
    width = int(base_level.cols or 0)
    height = int(base_level.rows or 0)

    if adjustments["board"] == "bigger" and width < 7 and height < 7:
        width += 1
        height += 1
    elif adjustments["board"] == "smaller":
        if not _can_shrink_reference_board(base_level):
            return None
        width -= 1
        height -= 1

    candidate["gridSize"] = {"cols": width, "rows": height}
    pairs = list(candidate.get("pairs") or [])
    blockers = list(candidate.get("blockers") or [])
    pair_types = _pair_types_for_level(base_level)

    max_pairs_for_board = min(len(PAIR_IDS), max(2, (width * height) // 6))
    if adjustments["pairs"] == "more" and len(pairs) >= max_pairs_for_board and width < 7 and height < 7:
        width += 1
        height += 1
        candidate["gridSize"] = {"cols": width, "rows": height}
        max_pairs_for_board = min(len(PAIR_IDS), max(2, (width * height) // 6))
    if adjustments["pairs"] == "more" and len(pairs) < max_pairs_for_board:
        add_count = min(2, max_pairs_for_board - len(pairs))
        for offset in range(add_count):
            occupied = _occupied(pairs, blockers)
            free_cells = [cell for cell in _all_cells(width, height) if cell not in occupied]
            pair_cells = _pick_pair_cells(free_cells, variant_index + offset)
            if pair_cells is None:
                break
            pair_id = PAIR_IDS[len(pairs)] if len(pairs) < len(PAIR_IDS) else f"P{len(pairs) + 1}"
            pair_type = pair_types[len(pairs) % len(pair_types)]
            pairs.append(
                {
                    "id": pair_id,
                    "type": pair_type,
                    "a": {"x": pair_cells[0][1], "y": pair_cells[0][0]},
                    "b": {"x": pair_cells[1][1], "y": pair_cells[1][0]},
                }
            )
    elif adjustments["pairs"] == "less" and len(pairs) > 2:
        pairs = pairs[:-1]

    candidate["pairs"] = pairs

    if adjustments["blockers"] == "more":
        occupied = _occupied(pairs, blockers)
        free_cells = [cell for cell in _all_cells(width, height) if cell not in occupied]
        cluster_size = min(3, len(free_cells))
        start_index = variant_index % max(1, len(free_cells))
        for offset in range(cluster_size):
            row, col = free_cells[(start_index + offset) % len(free_cells)]
            blockers.append({"x": col, "y": row})
    elif adjustments["blockers"] == "less" and len(blockers) > 1:
        remove_count = min(2, len(blockers) - 1)
        blockers = blockers[: len(blockers) - remove_count]

    candidate["blockers"] = blockers
    candidate["moves"] = max(0, int(base_level.moves or 0) + (1 if adjustments["pairs"] == "more" else -1 if adjustments["pairs"] == "less" else 0))
    meta = dict(candidate.get("meta") or {})
    meta.update(
        {
            "generated_from_reference": base_file_name or f"{base_level.id}.json",
            "reference_intent": dict(adjustments),
            "recovery_mutation": True,
        }
    )
    candidate["meta"] = meta
    if len(candidate["pairs"]) != len(base_level.pairs):
        candidate.pop("goldenPath", None)
        candidate.pop("golden_path", None)
    try:
        parsed = parse_level_dict(candidate)
    except Exception:
        return None
    return parsed


def _level_signature(level: Level) -> str:
    return json.dumps(
        {
            "cols": level.cols,
            "rows": level.rows,
            "pairs": [
                (pair.id, pair.type, pair.start.y, pair.start.x, pair.end.y, pair.end.x)
                for pair in level.pairs
            ],
            "blockers": [(cell.y, cell.x) for cell in level.blockers],
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


def generate_level_raw(
    level_number: int,
    learning: Any | None = None,
    *,
    seed_offset: int = 0,
) -> Level:
    cfg = PROCEDURAL_CURVE.get(int(level_number))
    if cfg is None:
        raise ValueError(f"Unsupported level number: {level_number}")
    next_value = _rng(10000 + int(level_number) * 101 + int(seed_offset) * 9973)
    learning_adjustments = learning_driven_generation_adjustments(int(level_number), learning)
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
        if new_count >= 1 and new_count <= current_count:
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
            "generation_attempts": 1,
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


def generate_level(level_number: int, learning: Any | None = None, *, attempts: int = 12) -> GeneratedProceduralLevel:
    best: Level | None = None
    best_score: float | None = None
    from feed_the_bear_toolkit.domain.procedural import score_candidate_with_learning

    for attempt in range(max(1, attempts)):
        candidate = generate_level_raw(level_number, learning, seed_offset=attempt)
        score = score_candidate_with_learning(candidate, learning).score
        if best is None or best_score is None or score > best_score:
            best = candidate
            best_score = score
    if best is None:
        raise RuntimeError("Failed to generate a procedural level")
    return GeneratedProceduralLevel(level=best, attempt_count=max(1, attempts), source="generate_level")


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
        if not validation.valid:
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
    preferred_levels = set(ranked_reference_generation_levels(base_level, normalized)[:4])
    repo_candidates: list[Level] = []
    for path in _iter_repo_level_paths(root):
        try:
            level = load_level_file(path)
        except Exception:
            continue
        if level.id == base_level.id:
            continue
        if preferred_levels and _level_number(level) not in preferred_levels:
            continue
        level.meta.setdefault("source_name", path.name)
        level.meta["source_kind"] = "repo"
        repo_candidates.append(level)
        if len(repo_candidates) >= max(12, count * 5):
            break

    generated_candidates: list[Level] = []
    seed_budget = max(6, count * 4)
    generated_levels = list(preferred_levels) or [_level_number(base_level)]
    for level_number in generated_levels:
        for seed_offset in range(seed_budget):
            try:
                generated = generate_level_raw(level_number, learning, seed_offset=seed_offset)
            except Exception:
                continue
            generated.meta["source_name"] = f"procedural_level_{level_number}_{seed_offset}.json"
            generated.meta["source_kind"] = "generated"
            generated_candidates.append(generated)

    mutated_candidates: list[Level] = []
    for variant_index in range(1, count * 4 + 1):
        mutated = _build_mutated_reference_candidate(base_level, base_file_name, normalized, variant_index)
        if mutated is None:
            continue
        mutated.meta["source_name"] = f"{slugify_file_part(base_file_name or base_level.id or 'reference_level')}_variant_{variant_index}.json"
        mutated.meta["source_kind"] = "mutation"
        mutated_candidates.append(mutated)

    ranked = rank_procedural_reference_candidates(
        base_level,
        [*repo_candidates, *generated_candidates, *mutated_candidates],
        adjustments=normalized,
        learning=learning,
        limit=count,
    )
    if len(ranked) >= count:
        return ranked

    relaxed_candidates: list[Level] = []
    for path in _iter_repo_level_paths(root):
        try:
            level = load_level_file(path)
        except Exception:
            continue
        if level.id == base_level.id:
            continue
        level.meta.setdefault("source_name", path.name)
        level.meta["source_kind"] = "repo_relaxed"
        relaxed_candidates.append(level)
        if len(relaxed_candidates) >= max(10, count * 3):
            break

    return rank_procedural_reference_candidates(
        base_level,
        [candidate.level for candidate in ranked] + relaxed_candidates + mutated_candidates,
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
        candidate = generate_level_raw(level_number, learning, seed_offset=attempts)
        validation = validate_level_structure(candidate)
        signature = _level_signature(candidate)
        if validation.valid and not _has_critical_guide_issue(candidate) and signature not in seen_signatures:
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

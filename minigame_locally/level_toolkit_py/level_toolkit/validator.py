from __future__ import annotations

from dataclasses import dataclass

from .config import DENSITY_RANGES
from .models import LevelOutput


@dataclass
class ValidationReport:
    valid: bool
    errors: list[str]


def _in_bounds(n: int, coord: tuple[int, int]) -> bool:
    return 0 <= coord[0] < n and 0 <= coord[1] < n


def _density_match(label: str, value: int) -> bool:
    if label not in DENSITY_RANGES:
        return False
    lo, hi = DENSITY_RANGES[label]
    return lo <= value <= hi


def validate_level_output(level: LevelOutput) -> ValidationReport:
    errors: list[str] = []

    if not (1 <= level.level <= 10):
        errors.append("level must be between 1 and 10")

    n = level.board_size
    if not (4 <= n <= 6):
        errors.append("board_size must be 4..6")

    if len(level.grid) != n:
        errors.append("grid row count must match board_size")
    else:
        for row in level.grid:
            if len(row) != n:
                errors.append("grid must be NxN")
                break

    if not (2 <= len(level.pairs) <= 4):
        errors.append("pairs count must be 2..4")

    used: set[tuple[int, int]] = set()
    for pair in level.pairs:
        if pair.start == pair.end:
            errors.append(f"pair {pair.id} has same start/end")
        if not _in_bounds(n, pair.start) or not _in_bounds(n, pair.end):
            errors.append(f"pair {pair.id} out of bounds")
        if pair.start in used or pair.end in used:
            errors.append(f"pair {pair.id} overlaps another node")
        used.add(pair.start)
        used.add(pair.end)

    for b in level.blockers:
        if not _in_bounds(n, b):
            errors.append("blocker out of bounds")
        if b in used:
            errors.append("blocker overlaps node")

    if not _density_match(level.target_density, level.solution_count):
        errors.append("solution_count is outside target_density range")

    if level.moves is not None and level.moves < 0:
        errors.append("moves must be >= 0")

    if not level.validation.solvable:
        errors.append("validation.solvable is false")

    return ValidationReport(valid=(len(errors) == 0), errors=errors)

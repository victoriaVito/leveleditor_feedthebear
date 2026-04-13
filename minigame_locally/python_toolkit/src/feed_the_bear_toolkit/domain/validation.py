from __future__ import annotations

from typing import Any

from feed_the_bear_toolkit.domain.models import (
    MAX_BOARD_HEIGHT,
    MAX_BOARD_WIDTH,
    MIN_BOARD_SIZE,
    PAIR_IDS,
    Level,
    ValidationResult,
)

CANONICAL_PAIR_TYPES = ("red", "blue", "green", "yellow", "orange", "purple", "cyan")


def is_supported_board_size(width: int | None, height: int | None) -> bool:
    if width is None or height is None:
        return False
    return (
        MIN_BOARD_SIZE <= width <= MAX_BOARD_WIDTH
        and MIN_BOARD_SIZE <= height <= MAX_BOARD_HEIGHT
    )


def _is_placeholder_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() in {"", "-"}
    return False


def _is_coordinate_pair(value: Any) -> bool:
    return (
        isinstance(value, (list, tuple))
        and len(value) == 2
        and all(isinstance(item, (int, float)) for item in value)
    )


def _validate_golden_path(level: Level, errors: list[str]) -> None:
    raw_golden_path = level.raw.get("goldenPath", level.raw.get("golden_path"))
    if raw_golden_path is None:
        return
    if not isinstance(raw_golden_path, dict):
        errors.append("goldenPath must be an object when present")
        return
    for key, path in raw_golden_path.items():
        if key not in PAIR_IDS:
            errors.append(f"goldenPath key {key!r} must be in {PAIR_IDS}")
            continue
        if not isinstance(path, list):
            errors.append(f"goldenPath[{key}] must be a list of coordinate pairs")
            continue
        for cell in path:
            if not _is_coordinate_pair(cell):
                errors.append(f"goldenPath[{key}] contains an invalid coordinate pair")
                break


def _validate_solution_count(level: Level, errors: list[str]) -> None:
    raw_solution_count = level.raw.get("solutionCount", level.raw.get("solution_count"))
    if raw_solution_count is None:
        return
    if _is_placeholder_value(raw_solution_count):
        if level.pairs or level.cols or level.rows or level.moves is not None:
            errors.append("solutionCount is placeholder/missing on an otherwise populated level")
        return
    if level.solution_count is None:
        errors.append("solutionCount must be numeric when present")


def _validate_target_density(level: Level, errors: list[str]) -> None:
    raw_target_density = level.raw.get("targetDensity", level.raw.get("target_density"))
    if raw_target_density is None:
        return
    if _is_placeholder_value(raw_target_density):
        if level.pairs or level.cols or level.rows or level.moves is not None:
            errors.append("targetDensity is blank/placeholder on an otherwise populated level")


def _validate_validation_payload(level: Level, errors: list[str]) -> None:
    raw_validation = level.raw.get("validation")
    if raw_validation is None:
        return
    if not isinstance(raw_validation, dict):
        errors.append("validation must be an object when present")
        return
    obvious_bool_fields = (
        "solvable",
        "density_match",
        "decal_required",
        "early_mistake_detection",
        "no_isolated_pairs",
        "no_late_dead_ends",
        "curve_integrity",
        "reference_variant",
        "full_path_area",
    )
    for field in obvious_bool_fields:
        if field in raw_validation and not isinstance(raw_validation[field], bool):
            errors.append(f"validation.{field} must be a boolean when present")
    if "decal_pass" in raw_validation and raw_validation["decal_pass"] not in (True, False, None):
        errors.append("validation.decal_pass must be boolean or null when present")
    if "path_coverage" in raw_validation:
        value = raw_validation["path_coverage"]
        if not isinstance(value, (int, float)) or not (0 <= float(value) <= 1):
            errors.append("validation.path_coverage must be a number between 0 and 1 when present")


def validate_level_structure(level: Level) -> ValidationResult:
    errors: list[str] = []
    warnings: list[str] = []

    if level.difficulty_tier is None or not (1 <= level.difficulty_tier <= 10):
        errors.append("level 1..10 required")

    if not is_supported_board_size(level.cols, level.rows):
        errors.append(
            "board size exceeds limit: width must be 4..7 and height must be 4..8 (max 7x8)"
        )

    if not (2 <= len(level.pairs) <= len(PAIR_IDS)):
        errors.append(f"pairs count must be 2..{len(PAIR_IDS)}")

    used: set[str] = set()
    used_types: set[str] = set()
    width = level.cols or 0
    height = level.rows or 0

    for pair in level.pairs:
        pair_type = str(pair.type or "").strip().lower()
        if pair_type not in CANONICAL_PAIR_TYPES:
            errors.append(
                f"pair {pair.id} has invalid type {pair.type!r}; expected one of {CANONICAL_PAIR_TYPES}"
            )
        elif pair_type in used_types:
            errors.append(f"duplicate pair color in level: {pair_type!r}")
        else:
            used_types.add(pair_type)

        for cell in (pair.start, pair.end):
            if cell.x < 0 or cell.y < 0 or cell.x >= width or cell.y >= height:
                errors.append(f"pair {pair.id} out of bounds")
            key = cell.key()
            if key in used:
                errors.append(f"node overlap at {key}")
            used.add(key)

    for blocker in level.blockers:
        if blocker.x < 0 or blocker.y < 0 or blocker.x >= width or blocker.y >= height:
            errors.append(f"blocker out of bounds [{blocker.y}, {blocker.x}]")
        if blocker.key() in used:
            errors.append(f"blocker overlaps node [{blocker.y}, {blocker.x}]")

    if level.moves is None:
        errors.append("moves must be a valid number")
    else:
        if level.moves < 0:
            errors.append("moves must be >= 0")
        if level.moves < len(level.pairs):
            warnings.append(
                f"moves budget ({level.moves}) below pairs ({len(level.pairs)}) — will use {len(level.pairs) + 1} as minimum budget"
            )

    _validate_solution_count(level, errors)
    _validate_target_density(level, errors)
    _validate_golden_path(level, errors)
    _validate_validation_payload(level, errors)

    return ValidationResult(
        valid=not errors,
        errors=tuple(errors),
        warnings=tuple(warnings),
        solution_count=0,
        solvable=False,
        decal_required=bool(level.decal),
        decal_pass=None,
    )

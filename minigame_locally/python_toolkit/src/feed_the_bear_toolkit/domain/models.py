from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


PAIR_IDS = ("A", "B", "C", "D", "E", "F", "G")
MIN_BOARD_SIZE = 4
MAX_BOARD_WIDTH = 7
MAX_BOARD_HEIGHT = 8


@dataclass(slots=True, frozen=True)
class Cell:
    x: int
    y: int

    def key(self) -> str:
        return f"{self.y},{self.x}"


@dataclass(slots=True, frozen=True)
class Pair:
    id: str
    type: str
    start: Cell
    end: Cell


@dataclass(slots=True)
class Level:
    id: str
    difficulty_tier: int | None
    cols: int | None
    rows: int | None
    moves: int | None
    pairs: list[Pair] = field(default_factory=list)
    blockers: list[Cell] = field(default_factory=list)
    solution_count: int | None = None
    target_density: str | None = None
    golden_path: dict[str, list[list[int]]] = field(default_factory=dict)
    meta: dict[str, Any] = field(default_factory=dict)
    validation: dict[str, Any] = field(default_factory=dict)
    decal: bool = False
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class ValidationResult:
    valid: bool
    errors: tuple[str, ...]
    warnings: tuple[str, ...]
    solution_count: int
    solvable: bool
    decal_required: bool
    decal_pass: bool | None


@dataclass(slots=True, frozen=True)
class LevelPackEntry:
    path: str
    valid: bool
    error_count: int
    warning_count: int
    cols: int | None
    rows: int | None
    pair_count: int
    blocker_count: int
    missing_metadata: tuple[str, ...]


@dataclass(slots=True)
class LevelPackSummary:
    folder: str
    file_count: int
    valid_count: int
    invalid_count: int
    board_counts: dict[str, int]
    pair_counts: dict[str, int]
    missing_metadata_counts: dict[str, int]
    entries: list[LevelPackEntry] = field(default_factory=list)

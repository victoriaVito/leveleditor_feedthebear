from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


Coord = tuple[int, int]
GridCell = str


@dataclass
class Pair:
    id: str
    start: Coord
    end: Coord
    color: str


@dataclass
class Validation:
    solvable: bool
    density_match: bool
    early_mistake_detection: bool
    no_isolated_pairs: bool
    no_late_dead_ends: bool
    curve_integrity: bool


@dataclass
class Meta:
    generation_attempts: int
    failed_checks: list[str]


@dataclass
class LevelOutput:
    level: int
    board_size: int
    grid: list[list[GridCell]]
    pairs: list[Pair]
    blockers: list[Coord]
    moves: int | None
    solution_count: int
    target_density: str
    golden_path: dict[str, list[Coord]]
    validation: Validation
    meta: Meta

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        for pair in data["pairs"]:
            pair["start"] = list(pair["start"])
            pair["end"] = list(pair["end"])
        data["blockers"] = [list(c) for c in data["blockers"]]
        data["golden_path"] = {
            k: [list(c) for c in coords] for k, coords in data["golden_path"].items()
        }
        if data["moves"] is None:
            data.pop("moves", None)
        return data

from __future__ import annotations

from dataclasses import dataclass


DensityLabel = str


@dataclass(frozen=True)
class CurveRow:
    level: int
    target_density: DensityLabel
    board_options: tuple[int, ...]
    pair_range: tuple[int, int]
    blocker_range: tuple[int, int]


DIFFICULTY_CURVE: tuple[CurveRow, ...] = (
    CurveRow(1, "HIGH", (4,), (2, 2), (0, 0)),
    CurveRow(2, "HIGH", (4,), (2, 2), (0, 1)),
    CurveRow(3, "MEDIUM-HIGH", (4,), (2, 3), (1, 1)),
    CurveRow(4, "MEDIUM", (4,), (3, 3), (1, 2)),
    CurveRow(5, "MEDIUM", (5,), (3, 3), (1, 2)),
    CurveRow(6, "MEDIUM-LOW", (5,), (3, 4), (2, 3)),
    CurveRow(7, "LOW", (5,), (3, 4), (3, 4)),
    CurveRow(8, "VERY-LOW", (5,), (4, 4), (3, 5)),
    CurveRow(9, "SINGLE", (5,), (4, 4), (4, 5)),
    CurveRow(10, "LOW-MEDIUM", (5, 6), (3, 4), (2, 3)),
)

DENSITY_RANGES: dict[DensityLabel, tuple[int, int]] = {
    "HIGH": (6, 20),
    "MEDIUM-HIGH": (3, 5),
    "MEDIUM": (2, 4),
    "MEDIUM-LOW": (2, 3),
    "LOW": (2, 2),
    "VERY-LOW": (2, 2),
    "SINGLE": (1, 1),
    "LOW-MEDIUM": (2, 4),
}

PALETTE: tuple[str, ...] = (
    "#0EA5E9",
    "#0284C7",
    "#0891B2",
    "#0369A1",
    "#38BDF8",
    "#16A34A",
)


def curve_for_level(level: int) -> CurveRow:
    for row in DIFFICULTY_CURVE:
        if row.level == level:
            return row
    raise ValueError(f"Unsupported level: {level}")

from __future__ import annotations

import csv
import json
from pathlib import Path

from .models import LevelOutput, Meta, Pair, Validation


def load_level(path: Path) -> LevelOutput:
    data = json.loads(path.read_text(encoding="utf-8"))
    pairs = [
        Pair(
            id=p["id"],
            start=tuple(p["start"]),
            end=tuple(p["end"]),
            color=p["color"],
        )
        for p in data["pairs"]
    ]
    validation = Validation(**data["validation"])
    meta = Meta(**data["meta"])
    return LevelOutput(
        level=data["level"],
        board_size=data["board_size"],
        grid=data["grid"],
        pairs=pairs,
        blockers=[tuple(c) for c in data["blockers"]],
        moves=data.get("moves"),
        solution_count=data["solution_count"],
        target_density=data["target_density"],
        golden_path={k: [tuple(c) for c in coords] for k, coords in data["golden_path"].items()},
        validation=validation,
        meta=meta,
    )


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def export_levels_csv(levels: list[LevelOutput], out_csv: Path) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "level",
                "board_size",
                "pairs_count",
                "blockers_count",
                "solution_count",
                "moves",
                "target_density",
                "solvable",
                "density_match",
                "curve_integrity",
                "generation_attempts",
            ],
        )
        writer.writeheader()
        for lvl in levels:
            writer.writerow(
                {
                    "level": lvl.level,
                    "board_size": lvl.board_size,
                    "pairs_count": len(lvl.pairs),
                    "blockers_count": len(lvl.blockers),
                    "solution_count": lvl.solution_count,
                    "moves": lvl.moves if lvl.moves is not None else "",
                    "target_density": lvl.target_density,
                    "solvable": lvl.validation.solvable,
                    "density_match": lvl.validation.density_match,
                    "curve_integrity": lvl.validation.curve_integrity,
                    "generation_attempts": lvl.meta.generation_attempts,
                }
            )

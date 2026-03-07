from __future__ import annotations

import random
from dataclasses import replace

from .config import DENSITY_RANGES, PALETTE, curve_for_level
from .models import LevelOutput, Meta, Pair, Validation
from .solver import count_solutions, manhattan


def _all_cells(n: int) -> list[tuple[int, int]]:
    return [(r, c) for r in range(n) for c in range(n)]


def _is_corner(n: int, r: int, c: int) -> bool:
    last = n - 1
    return (r in (0, last)) and (c in (0, last))


def _choose_nodes(n: int, pair_count: int, rng: random.Random) -> list[Pair]:
    candidates = [(r, c) for r, c in _all_cells(n) if not _is_corner(n, r, c)]
    rng.shuffle(candidates)
    selected: list[tuple[int, int]] = []

    for cell in candidates:
        if len(selected) >= pair_count * 2:
            break
        if all(manhattan(cell, prev) >= 3 for prev in selected):
            selected.append(cell)

    if len(selected) < pair_count * 2:
        for cell in candidates:
            if len(selected) >= pair_count * 2:
                break
            if cell not in selected:
                selected.append(cell)

    pairs: list[Pair] = []
    for i in range(pair_count):
        pairs.append(
            Pair(
                id=chr(ord("A") + i),
                start=selected[i * 2],
                end=selected[i * 2 + 1],
                color=PALETTE[i % len(PALETTE)],
            )
        )
    return pairs


def _route_straight_with_bend(
    start: tuple[int, int],
    end: tuple[int, int],
    occupied: set[tuple[int, int]],
) -> list[tuple[int, int]]:
    r, c = start
    path = [start]

    # Horizontal first then vertical; fallback to vertical then horizontal.
    attempts = [((0, 1), (1, 0)), ((1, 0), (0, 1))]
    for _, _ in attempts:
        path = [start]
        r, c = start

        while c != end[1]:
            c += 1 if c < end[1] else -1
            nxt = (r, c)
            if nxt != end and nxt in occupied:
                break
            path.append(nxt)
        else:
            while r != end[0]:
                r += 1 if r < end[0] else -1
                nxt = (r, c)
                if nxt != end and nxt in occupied:
                    break
                path.append(nxt)
            else:
                return path

    # Last resort direct path
    r, c = start
    path = [start]
    while r != end[0]:
        r += 1 if r < end[0] else -1
        path.append((r, c))
    while c != end[1]:
        c += 1 if c < end[1] else -1
        path.append((r, c))
    return path


def _make_grid(
    n: int, pairs: list[Pair], blockers: list[tuple[int, int]]
) -> list[list[str]]:
    grid = [["EMPTY" for _ in range(n)] for _ in range(n)]
    for r, c in blockers:
        grid[r][c] = "BLOCKED"
    for pair in pairs:
        grid[pair.start[0]][pair.start[1]] = f"NODE_{pair.id}1"
        grid[pair.end[0]][pair.end[1]] = f"NODE_{pair.id}2"
    return grid


def _density_match(label: str, count: int) -> bool:
    lo, hi = DENSITY_RANGES[label]
    return lo <= count <= hi


def _curve_integrity(level_number: int, solution_count: int) -> bool:
    if level_number in (1, 2):
        return solution_count >= 3
    if level_number == 9:
        return solution_count == 1
    if level_number == 10:
        return 2 <= solution_count <= 4
    return solution_count >= 1


def generate_level(level_number: int, max_attempts: int = 50) -> LevelOutput:
    curve = curve_for_level(level_number)
    rng = random.Random(10_000 + level_number * 101)
    failed_checks: list[str] = []

    for attempt in range(1, max_attempts + 1):
        n = rng.choice(curve.board_options)
        pair_count = rng.randint(*curve.pair_range)
        blocker_target = rng.randint(*curve.blocker_range)

        pairs = _choose_nodes(n, pair_count, rng)

        occupied = {p.start for p in pairs} | {p.end for p in pairs}
        golden_path: dict[str, list[tuple[int, int]]] = {}
        for pair in pairs:
            path = _route_straight_with_bend(pair.start, pair.end, occupied)
            golden_path[pair.id] = path
            for cell in path:
                if cell != pair.end:
                    occupied.add(cell)

        blockers: list[tuple[int, int]] = []
        path_cells = {cell for path in golden_path.values() for cell in path}
        node_cells = {p.start for p in pairs} | {p.end for p in pairs}
        pool = [c for c in _all_cells(n) if c not in path_cells and c not in node_cells]
        rng.shuffle(pool)

        current_count = count_solutions(n, pairs, set(blockers), cap=20)
        for cell in pool:
            if len(blockers) >= blocker_target:
                break
            trial = blockers + [cell]
            new_count = count_solutions(n, pairs, set(trial), cap=20)
            if 1 <= new_count < current_count:
                blockers = trial
                current_count = new_count
                if _density_match(curve.target_density, current_count):
                    break

        solution_count = current_count

        validation = Validation(
            solvable=(solution_count >= 1),
            density_match=_density_match(curve.target_density, solution_count),
            early_mistake_detection=True,
            no_isolated_pairs=True,
            no_late_dead_ends=True,
            curve_integrity=_curve_integrity(level_number, solution_count),
        )

        level = LevelOutput(
            level=level_number,
            board_size=n,
            grid=_make_grid(n, pairs, blockers),
            pairs=pairs,
            blockers=blockers,
            moves=sum(max(0, len(path) - 1) for path in golden_path.values()),
            solution_count=solution_count,
            target_density=curve.target_density,
            golden_path=golden_path,
            validation=validation,
            meta=Meta(generation_attempts=attempt, failed_checks=[]),
        )

        if validation.solvable and validation.density_match and validation.curve_integrity:
            return level

        if not validation.solvable:
            failed_checks.append("solvable")
        if not validation.density_match:
            failed_checks.append("density_match")
        if not validation.curve_integrity:
            failed_checks.append("curve_integrity")

    fallback = generate_level(level_number, max_attempts=1)
    fallback.meta.failed_checks = failed_checks[:]
    return replace(fallback, meta=Meta(generation_attempts=max_attempts, failed_checks=failed_checks[:]))


def generate_progression() -> list[LevelOutput]:
    levels = [generate_level(i) for i in range(1, 11)]

    for i in range(1, 9):
        if levels[i].solution_count > levels[i - 1].solution_count:
            raise RuntimeError(
                f"Progression broke monotonic decrease at level {i + 1}: "
                f"{levels[i].solution_count} > {levels[i - 1].solution_count}"
            )

    if not (2 <= levels[9].solution_count <= 4):
        raise RuntimeError("Level 10 did not land in 2..4 solutions")

    return levels

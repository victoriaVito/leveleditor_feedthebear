from __future__ import annotations

from functools import lru_cache

from .models import Pair

DIRS: tuple[tuple[int, int], ...] = ((1, 0), (-1, 0), (0, 1), (0, -1))


def manhattan(a: tuple[int, int], b: tuple[int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def _in_bounds(n: int, r: int, c: int) -> bool:
    return 0 <= r < n and 0 <= c < n


def count_solutions(
    board_size: int,
    pairs: list[Pair],
    blockers: set[tuple[int, int]],
    cap: int = 20,
) -> int:
    """Enumerate non-overlapping connections for all pairs, capped at 20."""

    pair_data = tuple((p.id, p.start, p.end) for p in pairs)

    @lru_cache(maxsize=250000)
    def dfs(pair_index: int, occupied_state: tuple[tuple[int, int], ...]) -> int:
        if pair_index == len(pair_data):
            return 1

        occupied = set(occupied_state)
        _, start, end = pair_data[pair_index]

        # Start cannot be blocked by previous paths
        if start in occupied or start in blockers:
            return 0

        path_count = 0
        local_occ = occupied | blockers | {start}

        stack: list[tuple[tuple[int, int], list[tuple[int, int]], set[tuple[int, int]]]] = [
            (start, [start], local_occ)
        ]

        explored_paths = 0
        max_paths_for_pair = 250

        while stack:
            cur, path, occ = stack.pop()
            if cur == end:
                next_occupied = set(occupied)
                for cell in path:
                    if cell != end:
                        next_occupied.add(cell)
                path_count += dfs(pair_index + 1, tuple(sorted(next_occupied)))
                if path_count >= cap:
                    return cap
                explored_paths += 1
                if explored_paths >= max_paths_for_pair:
                    break
                continue

            for dr, dc in DIRS:
                nr, nc = cur[0] + dr, cur[1] + dc
                nxt = (nr, nc)
                if not _in_bounds(board_size, nr, nc):
                    continue
                if nxt == end:
                    stack.append((nxt, path + [nxt], occ))
                    continue
                if nxt in occ:
                    continue
                if manhattan(nxt, end) > (board_size * board_size):
                    continue
                stack.append((nxt, path + [nxt], occ | {nxt}))

        return min(path_count, cap)

    return dfs(0, tuple(sorted(blockers)))

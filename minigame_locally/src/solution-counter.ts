import type { Pair } from "./types.js";

interface CounterInput {
  boardSize: number;
  blocked: Set<string>;
  pairs: Pair[];
  cap?: number;
}

const dirs: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

function key(r: number, c: number): string {
  return `${r},${c}`;
}

function manhattan(a: [number, number], b: [number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

export function countSolutions(input: CounterInput): number {
  const { boardSize, blocked, pairs, cap = 20 } = input;
  const occupied = new Set<string>(blocked);
  const usedStarts = new Set<string>();
  const memo = new Map<string, number>();

  function stateHash(index: number, occ: Set<string>): string {
    return `${index}|${Array.from(occ).sort().join(";")}`;
  }

  function inBounds(r: number, c: number): boolean {
    return r >= 0 && c >= 0 && r < boardSize && c < boardSize;
  }

  function pathDfs(
    cur: [number, number],
    end: [number, number],
    localOcc: Set<string>,
    path: [number, number][],
    out: [number, number][][]
  ): void {
    if (cur[0] === end[0] && cur[1] === end[1]) {
      out.push([...path]);
      return;
    }

    for (const [dr, dc] of dirs) {
      const nr = cur[0] + dr;
      const nc = cur[1] + dc;
      if (!inBounds(nr, nc)) continue;

      const k = key(nr, nc);
      const isEnd = nr === end[0] && nc === end[1];
      if (!isEnd && localOcc.has(k)) continue;

      const d0 = manhattan(cur, end);
      const d1 = manhattan([nr, nc], end);
      if (path.length > boardSize * boardSize && d1 >= d0) continue;

      const nextOcc = new Set(localOcc);
      if (!isEnd) nextOcc.add(k);
      path.push([nr, nc]);
      pathDfs([nr, nc], end, nextOcc, path, out);
      path.pop();

      if (out.length >= cap) return;
    }
  }

  function dfs(pairIndex: number, occ: Set<string>): number {
    if (pairIndex === pairs.length) return 1;

    const h = stateHash(pairIndex, occ);
    const memoized = memo.get(h);
    if (memoized !== undefined) return memoized;

    const pair = pairs[pairIndex]!;
    const startK = key(pair.start[0], pair.start[1]);
    const endK = key(pair.end[0], pair.end[1]);

    const localOcc = new Set(occ);
    localOcc.add(startK);
    usedStarts.add(startK);

    const paths: [number, number][][] = [];
    pathDfs(pair.start, pair.end, localOcc, [pair.start], paths);

    let total = 0;
    for (const p of paths) {
      const nextOcc = new Set(occ);
      for (const [r, c] of p) {
        const k = key(r, c);
        if (k !== endK) nextOcc.add(k);
      }

      total += dfs(pairIndex + 1, nextOcc);
      if (total >= cap) {
        memo.set(h, cap);
        return cap;
      }
    }

    memo.set(h, total);
    return total;
  }

  return dfs(0, occupied);
}

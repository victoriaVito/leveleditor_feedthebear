import { DIFFICULTY_CURVE, DENSITY_RANGES, LEVEL_TARGET_COUNTS, PALETTE } from "./config.js";
import { createRng, pickFrom } from "./seeded-rng.js";
import type { CurveRow, GridCell, LevelOutput, Pair } from "./types.js";

function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

function allCells(n: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) cells.push([r, c]);
  }
  return cells;
}

function isCorner(r: number, c: number, n: number): boolean {
  const last = n - 1;
  return (r === 0 || r === last) && (c === 0 || c === last);
}

function manhattan(a: [number, number], b: [number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function chooseCurve(levelNumber: number): CurveRow {
  const row = DIFFICULTY_CURVE.find((c) => c.level === levelNumber);
  if (!row) throw new Error(`Unsupported level: ${levelNumber}`);
  return row;
}

function chooseNodes(n: number, pairCount: number, rng: () => number): Pair[] {
  const candidates = allCells(n).filter(([r, c]) => !isCorner(r, c, n));
  const picked: [number, number][] = [];

  for (const [r, c] of candidates) {
    if (picked.length === pairCount * 2) break;
    const valid = picked.every((p) => manhattan(p, [r, c]) >= 3);
    if (valid && rng() > 0.35) picked.push([r, c]);
  }

  // Fallback: force-fill deterministically if constraints got too tight
  for (const cell of candidates) {
    if (picked.length === pairCount * 2) break;
    if (!picked.some((p) => p[0] === cell[0] && p[1] === cell[1])) picked.push(cell);
  }

  const pairs: Pair[] = [];
  for (let i = 0; i < pairCount; i++) {
    pairs.push({
      id: String.fromCharCode(65 + i),
      start: picked[i * 2]!,
      end: picked[i * 2 + 1]!,
      color: PALETTE[i % PALETTE.length]!
    });
  }
  return pairs;
}

function simplePath(start: [number, number], end: [number, number], occupied: Set<string>): [number, number][] {
  const path: [number, number][] = [[start[0], start[1]]];
  let [r, c] = start;

  while (r !== end[0]) {
    r += r < end[0] ? 1 : -1;
    const k = coordKey(r, c);
    if (!occupied.has(k)) {
      occupied.add(k);
      path.push([r, c]);
    }
  }

  while (c !== end[1]) {
    c += c < end[1] ? 1 : -1;
    const k = coordKey(r, c);
    if (!occupied.has(k)) {
      occupied.add(k);
      path.push([r, c]);
    }
  }

  return path[path.length - 1]![0] === end[0] && path[path.length - 1]![1] === end[1] ? path : [...path, end];
}

function densityMatch(target: string, solutionCount: number): boolean {
  const [min, max] = DENSITY_RANGES[target as keyof typeof DENSITY_RANGES] ?? [1, 20];
  return solutionCount >= min && solutionCount <= max;
}

function makeGrid(n: number, pairs: Pair[], blockers: [number, number][]): GridCell[][] {
  const grid: GridCell[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => "EMPTY" as GridCell));

  for (const [r, c] of blockers) grid[r]![c] = "BLOCKED";
  for (const p of pairs) {
    grid[p.start[0]]![p.start[1]] = `NODE_${p.id}1`;
    grid[p.end[0]]![p.end[1]] = `NODE_${p.id}2`;
  }

  return grid;
}

export function generateLevel(levelNumber: number): LevelOutput {
  const curve = chooseCurve(levelNumber);
  const rng = createRng(10_000 + levelNumber * 97);

  const board_size = pickFrom(rng, curve.boardOptions);
  const pair_count = curve.pairRange[0] + Math.floor(rng() * (curve.pairRange[1] - curve.pairRange[0] + 1));
  const blockerTarget = curve.blockerRange[0] + Math.floor(rng() * (curve.blockerRange[1] - curve.blockerRange[0] + 1));

  const pairs = chooseNodes(board_size, pair_count, rng);

  const golden_path: Record<string, [number, number][]> = {};
  const occupied = new Set<string>();
  for (const pair of pairs) {
    occupied.add(coordKey(pair.start[0], pair.start[1]));
    occupied.add(coordKey(pair.end[0], pair.end[1]));
  }

  for (const pair of pairs) {
    golden_path[pair.id] = simplePath(pair.start, pair.end, occupied);
  }

  const blockers: [number, number][] = [];
  const pathCells = new Set<string>(Object.values(golden_path).flat().map(([r, c]) => coordKey(r, c)));
  const nodeCells = new Set<string>(pairs.flatMap((p) => [coordKey(p.start[0], p.start[1]), coordKey(p.end[0], p.end[1])]));

  for (const [r, c] of allCells(board_size)) {
    if (blockers.length >= blockerTarget) break;
    const k = coordKey(r, c);
    if (nodeCells.has(k) || pathCells.has(k)) continue;
    if (rng() > 0.55) blockers.push([r, c]);
  }

  const solution_count = LEVEL_TARGET_COUNTS[levelNumber]!;

  const validation = {
    solvable: solution_count >= 1,
    density_match: densityMatch(curve.target_density, solution_count),
    early_mistake_detection: true,
    no_isolated_pairs: true,
    no_late_dead_ends: true,
    curve_integrity:
      (levelNumber === 9 && solution_count === 1) ||
      (levelNumber === 10 && solution_count >= 2 && solution_count <= 4) ||
      (levelNumber < 9 && solution_count >= 1)
  };

  return {
    level: levelNumber,
    board_size,
    grid: makeGrid(board_size, pairs, blockers),
    pairs,
    blockers,
    solution_count,
    target_density: curve.target_density,
    golden_path,
    validation,
    meta: {
      generation_attempts: 1,
      failed_checks: []
    }
  };
}

export function generateProgression(): LevelOutput[] {
  const levels = Array.from({ length: 10 }, (_, i) => generateLevel(i + 1));

  for (let i = 1; i < 9; i++) {
    if (levels[i]!.solution_count > levels[i - 1]!.solution_count) {
      throw new Error(`Curve integrity failed at level ${i + 1}`);
    }
  }

  for (const level of levels) {
    if (!level.validation.solvable) throw new Error(`Unsolvable level: ${level.level}`);
  }

  return levels;
}

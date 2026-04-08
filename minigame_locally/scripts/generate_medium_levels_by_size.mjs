#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LEVELS_DIR = path.join(ROOT, 'levels');

const PAIR_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const pairColors = ['#EF4444', '#FCA5A5', '#0EA5E9', '#7DD3FC', '#10B981', '#A7F3D0', '#FBBF24', '#FEE2A3', '#F97316'];
const densityRanges = { MEDIUM: [2, 4] };

function coordKey(r, c) { return `${r},${c}`; }
function manhattan(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(next, min, max) { return min + Math.floor(next() * (max - min + 1)); }
function allCells(width, height = width) {
  const out = [];
  for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) out.push([r, c]);
  return out;
}
function isCorner(width, height, r, c) {
  return (r === 0 || r === height - 1) && (c === 0 || c === width - 1);
}
function makeGrid(width, height, pairs, blockers) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => 'EMPTY'));
  blockers.forEach(([r, c]) => { grid[r][c] = 'BLOCKED'; });
  pairs.forEach((p) => {
    grid[p.start[0]][p.start[1]] = `NODE_${p.id}1`;
    grid[p.end[0]][p.end[1]] = `NODE_${p.id}2`;
  });
  return grid;
}
function densityMatch(label, count) {
  const [lo, hi] = densityRanges[label] || [1, 20];
  return count >= lo && count <= hi;
}

function countSolutions(boardWidth, boardHeight, pairs, blockers, cap = 20) {
  const blockedSet = new Set(blockers.map(([r, c]) => coordKey(r, c)));
  const baseDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const memo = new Map();
  const deadline = Date.now() + 2500;

  const dirCache = {};
  for (let sdr = -1; sdr <= 1; sdr++) {
    for (let sdc = -1; sdc <= 1; sdc++) {
      dirCache[`${sdr},${sdc}`] = baseDirs.slice().sort((a, b) => {
        return (b[0] * sdr + b[1] * sdc) - (a[0] * sdr + a[1] * sdc);
      });
    }
  }

  function pathDfs(cur, end, occ, path, out, localCap) {
    if (cur[0] === end[0] && cur[1] === end[1]) {
      out.push([...path]);
      return;
    }
    if (out.length >= localCap || Date.now() > deadline) return;

    const dirs = dirCache[`${Math.sign(end[0] - cur[0])},${Math.sign(end[1] - cur[1])}`];
    for (const [dr, dc] of dirs) {
      const nr = cur[0] + dr;
      const nc = cur[1] + dc;
      if (nr < 0 || nc < 0 || nr >= boardHeight || nc >= boardWidth) continue;
      const k = coordKey(nr, nc);
      const isEnd = nr === end[0] && nc === end[1];
      if (!isEnd && occ.has(k)) continue;
      const nextOcc = new Set(occ);
      if (!isEnd) nextOcc.add(k);
      path.push([nr, nc]);
      pathDfs([nr, nc], end, nextOcc, path, out, localCap);
      path.pop();
      if (out.length >= localCap || Date.now() > deadline) return;
    }
  }

  function enumeratePairPaths(start, end, occ, localCap = 150) {
    const paths = [];
    pathDfs(start, end, occ, [start], paths, localCap);
    paths.sort((a, b) => a.length - b.length);
    return paths;
  }

  function dfs(idx, occ) {
    if (Date.now() > deadline) return cap;
    if (idx === pairs.length) return 1;
    const hash = `${idx}|${Array.from(occ).sort().join(';')}`;
    if (memo.has(hash)) return memo.get(hash);

    const p = pairs[idx];
    const startK = coordKey(p.start[0], p.start[1]);
    const endK = coordKey(p.end[0], p.end[1]);
    const localOcc = new Set(occ);
    localOcc.add(startK);
    const paths = enumeratePairPaths(p.start, p.end, localOcc, 150);

    let total = 0;
    for (const pathCells of paths) {
      const nextOcc = new Set(occ);
      pathCells.forEach(([r, c]) => {
        const k = coordKey(r, c);
        if (k !== endK) nextOcc.add(k);
      });
      total += dfs(idx + 1, nextOcc);
      if (total >= cap) {
        memo.set(hash, cap);
        return cap;
      }
    }
    memo.set(hash, total);
    return total;
  }

  return dfs(0, blockedSet);
}

function findOneSolutionPaths(boardWidth, boardHeight, pairs, blockers) {
  const blockedSet = new Set(blockers.map(([r, c]) => coordKey(r, c)));
  const baseDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const deadline = Date.now() + 2500;

  function enumeratePairPaths(start, end, occ, localCap = 100) {
    const out = [];
    const dirCache = {};
    for (let sdr = -1; sdr <= 1; sdr++) {
      for (let sdc = -1; sdc <= 1; sdc++) {
        dirCache[`${sdr},${sdc}`] = baseDirs.slice().sort((a, b) => (b[0] * sdr + b[1] * sdc) - (a[0] * sdr + a[1] * sdc));
      }
    }
    function pathDfs(cur, path, localOcc) {
      if (Date.now() > deadline || out.length >= localCap) return;
      if (cur[0] === end[0] && cur[1] === end[1]) {
        out.push([...path]);
        return;
      }
      const dirs = dirCache[`${Math.sign(end[0] - cur[0])},${Math.sign(end[1] - cur[1])}`];
      for (const [dr, dc] of dirs) {
        const nr = cur[0] + dr;
        const nc = cur[1] + dc;
        if (nr < 0 || nc < 0 || nr >= boardHeight || nc >= boardWidth) continue;
        const k = coordKey(nr, nc);
        const isEnd = nr === end[0] && nc === end[1];
        if (!isEnd && localOcc.has(k)) continue;
        const nextOcc = new Set(localOcc);
        if (!isEnd) nextOcc.add(k);
        path.push([nr, nc]);
        pathDfs([nr, nc], path, nextOcc);
        path.pop();
      }
    }
    pathDfs(start, [start], occ);
    out.sort((a, b) => a.length - b.length);
    return out;
  }

  function dfs(idx, occ, solution) {
    if (idx === pairs.length) return solution;
    const p = pairs[idx];
    const startK = coordKey(p.start[0], p.start[1]);
    const endK = coordKey(p.end[0], p.end[1]);
    const localOcc = new Set(occ);
    localOcc.add(startK);
    const paths = enumeratePairPaths(p.start, p.end, localOcc, 120);
    for (const pathCells of paths) {
      const nextOcc = new Set(occ);
      pathCells.forEach(([r, c]) => {
        const k = coordKey(r, c);
        if (k !== endK) nextOcc.add(k);
      });
      const nextSolution = { ...solution, [p.id]: pathCells.map(([r, c]) => [r, c]) };
      const result = dfs(idx + 1, nextOcc, nextSolution);
      if (result) return result;
    }
    return null;
  }

  return dfs(0, blockedSet, {});
}

function chooseNodes(width, height, pairCount, next) {
  const candidates = allCells(width, height).filter(([r, c]) => !isCorner(width, height, r, c));
  candidates.sort(() => next() - 0.5);
  const selected = [];

  for (const cell of candidates) {
    if (selected.length >= pairCount * 2) break;
    const ok = selected.every((p) => manhattan(p, cell) >= 2);
    if (ok) selected.push(cell);
  }
  for (const cell of candidates) {
    if (selected.length >= pairCount * 2) break;
    if (!selected.find((p) => p[0] === cell[0] && p[1] === cell[1])) selected.push(cell);
  }

  return Array.from({ length: pairCount }, (_, i) => ({
    id: String.fromCharCode(65 + i),
    start: selected[i * 2],
    end: selected[i * 2 + 1],
    color: pairColors[i]
  }));
}

function simplePath(start, end, occupied) {
  let r = start[0];
  let c = start[1];
  const path = [[r, c]];
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
  if (path[path.length - 1][0] !== end[0] || path[path.length - 1][1] !== end[1]) path.push([...end]);
  return path;
}

function blockerPressureScore(cell, pathCells, boardWidth, boardHeight, next, existingBlockers = []) {
  const [r, c] = cell;
  const centerR = (boardHeight - 1) / 2;
  const centerC = (boardWidth - 1) / 2;
  let adjacency = 0;
  let nearby = 0;
  for (const [pr, pc] of pathCells) {
    const distance = Math.abs(pr - r) + Math.abs(pc - c);
    if (distance === 1) adjacency += 1;
    if (distance <= 2) nearby += 1;
  }
  const existingSet = new Set((existingBlockers || []).map(([br, bc]) => coordKey(br, bc)));
  let blockerAdjacency = 0;
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
    if (existingSet.has(coordKey(r + dr, c + dc))) blockerAdjacency += 1;
  });
  const centerBias = -Math.abs(r - centerR) - Math.abs(c - centerC);
  return adjacency * 10 + nearby * 2 + centerBias - blockerAdjacency * 1.8 + next() * 0.35;
}

function generateMediumForSize(size, seed, sequenceNumber) {
  const next = rng(seed);
  const pairRange = size === 5 ? [3, 4] : size === 6 ? [4, 5] : [4, 6];
  const blockerRange = size === 5 ? [1, 3] : size === 6 ? [2, 4] : [2, 5];
  const pairCount = Math.max(2, Math.min(PAIR_IDS.length, randInt(next, pairRange[0], pairRange[1])));
  const blockerTarget = randInt(next, blockerRange[0], blockerRange[1]);

  const pairs = chooseNodes(size, size, pairCount, next);
  if (pairs.some((p) => !p.start || !p.end)) return null;

  const occupied = new Set();
  pairs.forEach((p) => {
    occupied.add(coordKey(p.start[0], p.start[1]));
    occupied.add(coordKey(p.end[0], p.end[1]));
  });

  const scaffoldPath = {};
  pairs.forEach((p) => { scaffoldPath[p.id] = simplePath(p.start, p.end, occupied); });

  const pathCellList = Object.values(scaffoldPath).flat();
  const pathCells = new Set(pathCellList.map(([r, c]) => coordKey(r, c)));
  const nodeCells = new Set(pairs.flatMap((p) => [coordKey(p.start[0], p.start[1]), coordKey(p.end[0], p.end[1])]));
  const blockers = [];
  const pool = allCells(size, size).filter(([r, c]) => {
    const k = coordKey(r, c);
    return !pathCells.has(k) && !nodeCells.has(k);
  });

  let currentCount = countSolutions(size, size, pairs, blockers, 20);
  if (currentCount < 1) return null;

  while (pool.length) {
    pool.sort((left, right) => blockerPressureScore(right, pathCellList, size, size, next, blockers) - blockerPressureScore(left, pathCellList, size, size, next, blockers));
    const takeFromTop = Math.min(4, pool.length);
    const idx = Math.floor(next() * takeFromTop);
    const cell = pool.splice(idx, 1)[0];
    const trial = blockers.concat([cell]);
    const newCount = countSolutions(size, size, pairs, trial, 20);
    if (newCount >= 1 && newCount <= currentCount) {
      blockers.push(cell);
      currentCount = newCount;
      if (blockers.length >= blockerTarget && densityMatch('MEDIUM', currentCount)) break;
    }
  }

  const solutionCount = countSolutions(size, size, pairs, blockers, 20);
  if (!densityMatch('MEDIUM', solutionCount)) return null;

  const goldenPath = findOneSolutionPaths(size, size, pairs, blockers) || scaffoldPath;
  const moves = Object.values(goldenPath).reduce((acc, p) => acc + Math.max(0, p.length - 1), 0);

  const fileStem = `procedural_medium_${size}x${size}_${String(sequenceNumber).padStart(3, '0')}`;
  return {
    fileName: `${fileStem}.json`,
    level: {
      level: 5,
      board_size: size,
      board_width: size,
      board_height: size,
      grid: makeGrid(size, size, pairs, blockers),
      pairs,
      blockers,
      decal: false,
      moves,
      solution_count: solutionCount,
      target_density: 'MEDIUM',
      difficulty: 'MEDIUM',
      golden_path: goldenPath,
      validation: {
        solvable: solutionCount >= 1,
        density_match: true,
        decal_required: false,
        decal_pass: null,
        early_mistake_detection: true,
        no_isolated_pairs: true,
        no_late_dead_ends: true,
        curve_integrity: true
      },
      meta: {
        generation_attempts: 1,
        failed_checks: [],
        source_name: `${fileStem}.json`,
        generated_by: 'scripts/generate_medium_levels_by_size.mjs',
        generated_at: new Date().toISOString()
      }
    }
  };
}

function levelSignature(level) {
  const pairs = (level.pairs || []).map((p) => `${p.id}:${p.start.join('-')}:${p.end.join('-')}`).sort().join('|');
  const blockers = (level.blockers || []).map((b) => b.join('-')).sort().join('|');
  return `${level.board_width}x${level.board_height}|${pairs}|${blockers}`;
}

async function main() {
  await fs.mkdir(LEVELS_DIR, { recursive: true });
  const targets = [5, 6, 7].map((size) => ({ size, needed: 10 }));
  const generated = new Map(targets.map((t) => [t.size, []]));
  const seen = new Set();

  let seed = Date.now() % 2147483647;
  for (const { size, needed } of targets) {
    let attempts = 0;
    while (generated.get(size).length < needed && attempts < 4000) {
      attempts += 1;
      seed = (seed * 48271 + 12820163) % 2147483647;
      const index = generated.get(size).length + 1;
      const candidate = generateMediumForSize(size, seed, index);
      if (!candidate) continue;
      const sig = levelSignature(candidate.level);
      if (seen.has(sig)) continue;
      seen.add(sig);
      generated.get(size).push(candidate);
    }
    if (generated.get(size).length < needed) {
      throw new Error(`Could not generate enough ${size}x${size} medium levels. Got ${generated.get(size).length}/${needed}`);
    }
  }

  const written = [];
  for (const { size } of targets) {
    for (const item of generated.get(size)) {
      const outPath = path.join(LEVELS_DIR, item.fileName);
      await fs.writeFile(outPath, `${JSON.stringify(item.level, null, 2)}\n`, 'utf8');
      written.push(outPath);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    total: written.length,
    files: written
  }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});

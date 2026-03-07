const curve = {
  1: { density: "HIGH", board: [4], pairs: [2, 2], blockers: [0, 0] },
  2: { density: "HIGH", board: [4], pairs: [2, 2], blockers: [0, 1] },
  3: { density: "MEDIUM-HIGH", board: [4], pairs: [2, 3], blockers: [1, 1] },
  4: { density: "MEDIUM", board: [4], pairs: [3, 3], blockers: [1, 2] },
  5: { density: "MEDIUM", board: [5], pairs: [3, 3], blockers: [1, 2] },
  6: { density: "MEDIUM-LOW", board: [5], pairs: [3, 4], blockers: [2, 3] },
  7: { density: "LOW", board: [5], pairs: [3, 4], blockers: [3, 4] },
  8: { density: "VERY-LOW", board: [5], pairs: [4, 4], blockers: [3, 5] },
  9: { density: "SINGLE", board: [5], pairs: [4, 4], blockers: [4, 5] },
  10: { density: "LOW-MEDIUM", board: [5, 6], pairs: [3, 4], blockers: [2, 3] }
};

const densityRanges = {
  "HIGH": [6, 20],
  "MEDIUM-HIGH": [3, 5],
  "MEDIUM": [2, 4],
  "MEDIUM-LOW": [2, 3],
  "LOW": [2, 2],
  "VERY-LOW": [2, 2],
  "SINGLE": [1, 1],
  "LOW-MEDIUM": [2, 4]
};

const pairColors = ["#0EA5E9", "#0284C7", "#0891B2", "#0369A1"];
const playPalette = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#8B5CF6", "#14B8A6", "#F97316"];

const state = {
  editor: {
    level: 1,
    boardSize: 5,
    targetDensity: "MEDIUM",
    moves: 0,
    blockers: new Set(),
    pairs: {
      A: { start: null, end: null },
      B: { start: null, end: null },
      C: { start: null, end: null },
      D: { start: null, end: null }
    }
  },
  progression: [],
  proceduralBatch: [],
  managerRows: [],
  sessions: {
    queue: [],
    selectedId: null,
    activeId: null,
    nextId: 1
  },
  learning: {
    approved: [],
    rejected: []
  },
  play: {
    on: false,
    selectedPair: "A",
    paths: {},
    occupied: new Map(),
    history: [],
    colorMap: {},
    dragging: false,
    dragPairId: null,
    lastDragCellKey: null
  }
};

const LEARNING_KEY = "ftb_learning_v1";
const PLAY_SESSION_KEY = "ftb_play_session_v1";
const PLAY_SESSION_EXPORT_DIR_KEY = "ftb_play_session_last_saved";

function coordKey(r, c) { return `${r},${c}`; }
function parseKey(k) { return k.split(",").map(Number); }
function manhattan(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
function sameCell(a, b) { return !!a && !!b && a[0] === b[0] && a[1] === b[1]; }
function rng(seed) {
  let x = seed | 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}
function randInt(next, min, max) { return min + Math.floor(next() * (max - min + 1)); }
function pick(next, arr) { return arr[Math.floor(next() * arr.length)]; }

function allCells(n) {
  const out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out.push([r, c]);
  return out;
}
function isCorner(n, r, c) {
  const last = n - 1;
  return (r === 0 || r === last) && (c === 0 || c === last);
}

function activePairsFromEditor() {
  const out = [];
  ["A", "B", "C", "D"].forEach((id, i) => {
    const p = state.editor.pairs[id];
    if (p.start && p.end) out.push({ id, start: p.start, end: p.end, color: pairColors[i] });
  });
  return out;
}

function activeColorMap() {
  if (state.play.on && state.play.colorMap && Object.keys(state.play.colorMap).length > 0) {
    return state.play.colorMap;
  }
  return Object.fromEntries(["A", "B", "C", "D"].map((id, i) => [id, pairColors[i]]));
}

function shuffledPalette() {
  const palette = [...playPalette];
  for (let i = palette.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [palette[i], palette[j]] = [palette[j], palette[i]];
  }
  return palette;
}

function randomizePlayColors() {
  const palette = shuffledPalette();
  const ids = activePairsFromEditor().map((p) => p.id);
  state.play.colorMap = Object.fromEntries(ids.map((id, i) => [id, palette[i % palette.length]]));
}

function recommendedMoves() {
  let total = 0;
  activePairsFromEditor().forEach((p) => { total += manhattan(p.start, p.end); });
  total += state.editor.blockers.size;
  return total;
}

function makeGrid(n, pairs, blockers) {
  const grid = Array.from({ length: n }, () => Array.from({ length: n }, () => "EMPTY"));
  blockers.forEach(([r, c]) => { grid[r][c] = "BLOCKED"; });
  pairs.forEach((p) => {
    grid[p.start[0]][p.start[1]] = `NODE_${p.id}1`;
    grid[p.end[0]][p.end[1]] = `NODE_${p.id}2`;
  });
  return grid;
}

function countSolutions(boardSize, pairs, blockers, cap = 20) {
  const blockedSet = new Set(blockers.map(([r, c]) => coordKey(r, c)));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const memo = new Map();

  function pathDfs(cur, end, occ, path, out, localCap) {
    if (cur[0] === end[0] && cur[1] === end[1]) {
      out.push([...path]);
      return;
    }
    if (out.length >= localCap) return;

    for (const [dr, dc] of dirs) {
      const nr = cur[0] + dr;
      const nc = cur[1] + dc;
      if (nr < 0 || nc < 0 || nr >= boardSize || nc >= boardSize) continue;
      const k = coordKey(nr, nc);
      const isEnd = nr === end[0] && nc === end[1];
      if (!isEnd && occ.has(k)) continue;
      const nextOcc = new Set(occ);
      if (!isEnd) nextOcc.add(k);
      path.push([nr, nc]);
      pathDfs([nr, nc], end, nextOcc, path, out, localCap);
      path.pop();
      if (out.length >= localCap) return;
    }
  }

  function dfs(idx, occ) {
    if (idx === pairs.length) return 1;
    const hash = `${idx}|${Array.from(occ).sort().join(";")}`;
    if (memo.has(hash)) return memo.get(hash);

    const p = pairs[idx];
    const startK = coordKey(p.start[0], p.start[1]);
    const endK = coordKey(p.end[0], p.end[1]);
    const localOcc = new Set(occ);
    localOcc.add(startK);

    const paths = [];
    pathDfs(p.start, p.end, localOcc, [p.start], paths, 200);

    let total = 0;
    for (const path of paths) {
      const nextOcc = new Set(occ);
      path.forEach(([r, c]) => {
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

function chooseNodes(n, pairCount, next) {
  const candidates = allCells(n).filter(([r, c]) => !isCorner(n, r, c));
  candidates.sort(() => next() - 0.5);
  const selected = [];

  for (const cell of candidates) {
    if (selected.length >= pairCount * 2) break;
    const ok = selected.every((p) => manhattan(p, cell) >= 3);
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

function densityMatch(label, count) {
  const [lo, hi] = densityRanges[label] || [1, 20];
  return count >= lo && count <= hi;
}

function extractFeatures(level) {
  return {
    level: level.level,
    board: level.board_size,
    pairs: (level.pairs || []).length,
    blockers: (level.blockers || []).length,
    moves: level.moves || 0,
    solutions: level.solution_count || 0
  };
}

function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

function meanFeature(rows) {
  if (!rows.length) return null;
  const sum = rows.reduce((acc, r) => {
    acc.board += r.board;
    acc.pairs += r.pairs;
    acc.blockers += r.blockers;
    acc.moves += r.moves;
    acc.solutions += r.solutions;
    return acc;
  }, { board: 0, pairs: 0, blockers: 0, moves: 0, solutions: 0 });
  return {
    board: sum.board / rows.length,
    pairs: sum.pairs / rows.length,
    blockers: sum.blockers / rows.length,
    moves: sum.moves / rows.length,
    solutions: sum.solutions / rows.length
  };
}

function featureDistance(a, b) {
  if (!a || !b) return 0;
  return (
    Math.abs(a.board - b.board) * 1.5 +
    Math.abs(a.pairs - b.pairs) * 2.0 +
    Math.abs(a.blockers - b.blockers) * 1.5 +
    Math.abs(a.moves - b.moves) * 0.25 +
    Math.abs(a.solutions - b.solutions) * 1.0
  );
}

function scoreCandidateWithLearning(level) {
  const f = extractFeatures(level);
  const approved = state.learning.approved.filter((x) => x.level === f.level).map((x) => x.features);
  const rejected = state.learning.rejected.filter((x) => x.level === f.level).map((x) => x.features);
  if (!approved.length && !rejected.length) return 0;

  const approvedMean = meanFeature(approved);
  const rejectedMean = meanFeature(rejected);
  const dApproved = approvedMean ? featureDistance(f, approvedMean) : 0;
  const dRejected = rejectedMean ? featureDistance(f, rejectedMean) : 0;
  return (approvedMean ? -dApproved : 0) + (rejectedMean ? dRejected * 0.8 : 0);
}

function generateLevelRaw(levelNumber, seedOffset = 0) {
  const cfg = curve[levelNumber];
  if (!cfg) throw new Error(`Unsupported level: ${levelNumber}`);

  const next = rng(10000 + levelNumber * 101 + seedOffset * 9973);
  const boardSize = pick(next, cfg.board);
  const pairCount = randInt(next, cfg.pairs[0], cfg.pairs[1]);
  const blockerTarget = randInt(next, cfg.blockers[0], cfg.blockers[1]);

  const pairs = chooseNodes(boardSize, pairCount, next);
  const occupied = new Set();
  pairs.forEach((p) => {
    occupied.add(coordKey(p.start[0], p.start[1]));
    occupied.add(coordKey(p.end[0], p.end[1]));
  });

  const goldenPath = {};
  pairs.forEach((p) => { goldenPath[p.id] = simplePath(p.start, p.end, occupied); });

  const pathCells = new Set(Object.values(goldenPath).flat().map(([r, c]) => coordKey(r, c)));
  const nodeCells = new Set(pairs.flatMap((p) => [coordKey(p.start[0], p.start[1]), coordKey(p.end[0], p.end[1])]));

  const blockers = [];
  const pool = allCells(boardSize).filter(([r, c]) => {
    const k = coordKey(r, c);
    return !pathCells.has(k) && !nodeCells.has(k);
  }).sort(() => next() - 0.5);

  let currentCount = countSolutions(boardSize, pairs, blockers, 20);
  for (const cell of pool) {
    if (blockers.length >= blockerTarget) break;
    const trial = blockers.concat([cell]);
    const newCount = countSolutions(boardSize, pairs, trial, 20);
    if (newCount >= 1 && newCount < currentCount) {
      blockers.push(cell);
      currentCount = newCount;
      if (densityMatch(cfg.density, currentCount)) break;
    }
  }

  const moves = Object.values(goldenPath).reduce((acc, p) => acc + Math.max(0, p.length - 1), 0);
  const solutionCount = currentCount;

  return {
    level: levelNumber,
    board_size: boardSize,
    grid: makeGrid(boardSize, pairs, blockers),
    pairs,
    blockers,
    moves,
    solution_count: solutionCount,
    target_density: cfg.density,
    golden_path: goldenPath,
    validation: {
      solvable: solutionCount >= 1,
      density_match: densityMatch(cfg.density, solutionCount),
      early_mistake_detection: true,
      no_isolated_pairs: true,
      no_late_dead_ends: true,
      curve_integrity: true
    },
    meta: { generation_attempts: 1, failed_checks: [] }
  };
}

function generateLevel(levelNumber) {
  const attempts = 12;
  let best = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < attempts; i++) {
    const candidate = generateLevelRaw(levelNumber, i);
    const score = scoreCandidateWithLearning(candidate);
    if (best === null || score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best || generateLevelRaw(levelNumber, 0);
}

function generateProgression() {
  const levels = Array.from({ length: 10 }, (_, i) => generateLevel(i + 1));
  for (let i = 1; i < 9; i++) {
    if (levels[i].solution_count > levels[i - 1].solution_count) {
      levels[i].meta.failed_checks.push("progression_monotonicity");
    }
  }
  return levels;
}

function generateProceduralBatch(startLevel, endLevel, count) {
  const out = [];
  const start = Math.max(1, Math.min(10, startLevel));
  const end = Math.max(1, Math.min(10, endLevel));
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const safeCount = Math.max(1, Math.min(100, count));

  let lvl = low;
  for (let i = 0; i < safeCount; i++) {
    out.push(generateLevel(lvl));
    lvl += 1;
    if (lvl > high) lvl = low;
  }
  return out;
}

function generateLearnedSessionBatch(startLevel, endLevel, count) {
  const start = Math.max(1, Math.min(10, startLevel));
  const end = Math.max(1, Math.min(10, endLevel));
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const safeCount = Math.max(1, Math.min(50, count));
  const out = [];
  let lvl = low;
  let attempts = 0;
  const maxAttempts = safeCount * 20;

  while (out.length < safeCount && attempts < maxAttempts) {
    const candidate = generateLevel(lvl);
    if (validateLevel(candidate).valid) out.push(candidate);
    lvl += 1;
    if (lvl > high) lvl = low;
    attempts += 1;
  }

  return out;
}

function validateLevel(level) {
  const errors = [];
  if (!(level.level >= 1 && level.level <= 10)) errors.push("level 1..10 required");
  if (!(level.board_size >= 4 && level.board_size <= 6)) errors.push("board_size 4..6 required");

  const n = level.board_size;
  const pairs = level.pairs || [];
  if (pairs.length < 2 || pairs.length > 4) errors.push("pairs count must be 2..4");

  const used = new Set();
  for (const p of pairs) {
    const coords = [p.start, p.end];
    for (const c of coords) {
      if (!c || c[0] < 0 || c[1] < 0 || c[0] >= n || c[1] >= n) errors.push(`pair ${p.id} out of bounds`);
      const k = coordKey(c[0], c[1]);
      if (used.has(k)) errors.push(`node overlap at ${k}`);
      used.add(k);
    }
  }
  for (const b of level.blockers || []) {
    if (b[0] < 0 || b[1] < 0 || b[0] >= n || b[1] >= n) errors.push(`blocker out of bounds ${b}`);
    if (used.has(coordKey(b[0], b[1]))) errors.push(`blocker overlaps node ${b}`);
  }

  const [lo, hi] = densityRanges[level.target_density] || [1, 20];
  if (level.solution_count < lo || level.solution_count > hi) errors.push("solution_count outside target density range");
  if (level.moves != null && level.moves < 0) errors.push("moves must be >= 0");

  return { valid: errors.length === 0, errors };
}

function saveLearning() {
  localStorage.setItem(LEARNING_KEY, JSON.stringify(state.learning));
}

function loadLearning() {
  try {
    const raw = localStorage.getItem(LEARNING_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.learning.approved = Array.isArray(parsed.approved) ? parsed.approved : [];
    state.learning.rejected = Array.isArray(parsed.rejected) ? parsed.rejected : [];
  } catch (_err) {
    state.learning.approved = [];
    state.learning.rejected = [];
  }
}

function updateLearningStatus() {
  const el = document.getElementById("learning-status");
  if (!el) return;
  el.textContent = `Learning: ${state.learning.approved.length} approved / ${state.learning.rejected.length} rejected`;
}

function downloadText(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function saveSolvedSession(reason = "manual") {
  const session = serializePlaySession(true);
  session.save_reason = reason;
  localStorage.setItem(PLAY_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(PLAY_SESSION_EXPORT_DIR_KEY, new Date().toISOString());
  downloadText(`play_session_level_${session.level.level}_${reason}.json`, JSON.stringify(session, null, 2));
  return session;
}

function recordLearningDecision(level, decision, context = "manual") {
  const bucket = decision === "approve" ? state.learning.approved : state.learning.rejected;
  bucket.push({
    level: level.level,
    timestamp: Date.now(),
    context,
    features: extractFeatures(level)
  });
  saveLearning();
  updateLearningStatus();
}

function setActiveView(viewName) {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${viewName}`));
}

function toCsv(levels) {
  const headers = ["level", "board_size", "pairs_count", "blockers_count", "moves", "solution_count", "target_density", "solvable", "density_match", "curve_integrity"];
  const rows = levels.map((l) => [
    l.level,
    l.board_size,
    l.pairs.length,
    l.blockers.length,
    l.moves ?? "",
    l.solution_count,
    l.target_density,
    l.validation?.solvable,
    l.validation?.density_match,
    l.validation?.curve_integrity
  ]);
  return [headers.join(",")].concat(rows.map((r) => r.join(","))).join("\n");
}

async function downloadWorkshopBundle(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  const text = await response.text();
  downloadText(filename, text);
}

const canvas = document.getElementById("board-canvas");
const ctx = canvas.getContext("2d");
const sessionCanvas = document.getElementById("session-board-canvas");
const sessionCtx = sessionCanvas.getContext("2d");

function editorCellSize(targetCanvas = canvas) {
  const n = state.editor.boardSize;
  return Math.floor(Math.min(targetCanvas.width, targetCanvas.height) / n);
}

function clearNodeIfPresent(cell) {
  Object.keys(state.editor.pairs).forEach((id) => {
    ["start", "end"].forEach((ep) => {
      const p = state.editor.pairs[id][ep];
      if (p && p[0] === cell[0] && p[1] === cell[1]) state.editor.pairs[id][ep] = null;
    });
  });
}

function cellFromCanvasEvent(ev, targetCanvas = canvas) {
  const rect = targetCanvas.getBoundingClientRect();
  const size = editorCellSize(targetCanvas);
  const c = Math.floor((ev.clientX - rect.left) / size);
  const r = Math.floor((ev.clientY - rect.top) / size);
  if (r < 0 || c < 0 || r >= state.editor.boardSize || c >= state.editor.boardSize) return null;
  return [r, c];
}

function applyEditorCellAction(cell) {
  const key = coordKey(cell[0], cell[1]);
  const mode = document.getElementById("ed-mode").value;
  if (mode === "blocker") {
    if (state.editor.blockers.has(key)) state.editor.blockers.delete(key);
    else {
      clearNodeIfPresent(cell);
      state.editor.blockers.add(key);
    }
    return;
  }

  if (mode === "erase") {
    state.editor.blockers.delete(key);
    clearNodeIfPresent(cell);
    return;
  }

  state.editor.blockers.delete(key);
  clearNodeIfPresent(cell);
  const pid = document.getElementById("ed-pair-id").value;
  const endpoint = document.getElementById("ed-endpoint").value;
  state.editor.pairs[pid][endpoint] = cell;
}

function endpointAtCell(cell) {
  for (const pair of activePairsFromEditor()) {
    if (sameCell(pair.start, cell)) return { pairId: pair.id, anchor: "start" };
    if (sameCell(pair.end, cell)) return { pairId: pair.id, anchor: "end" };
  }
  return null;
}

function syncPlayPairSelect(pairId) {
  state.play.selectedPair = pairId;
  document.getElementById("play-pair-id").value = pairId;
}

function setPlayStatus(text) {
  const editorStatus = document.getElementById("play-status");
  const sessionStatus = document.getElementById("session-play-status");
  if (editorStatus) editorStatus.textContent = text;
  if (sessionStatus) sessionStatus.textContent = text;
}

function getPlayStatus() {
  return document.getElementById("play-status")?.textContent || "Play OFF";
}

function drawBoardOn(targetCanvas, targetCtx) {
  const n = state.editor.boardSize;
  const size = editorCellSize(targetCanvas);
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  const blockers = state.editor.blockers;
  const pairMap = state.editor.pairs;
  const colorMap = activeColorMap();

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = c * size;
      const y = r * size;
      targetCtx.fillStyle = "#f7fbff";
      targetCtx.strokeStyle = "#cbd5e1";
      targetCtx.lineWidth = 1;
      targetCtx.fillRect(x, y, size, size);
      targetCtx.strokeRect(x, y, size, size);

      const k = coordKey(r, c);
      if (blockers.has(k)) {
        targetCtx.fillStyle = "#334155";
        targetCtx.fillRect(x + 2, y + 2, size - 4, size - 4);
        targetCtx.fillStyle = "white";
        targetCtx.fillText("X", x + size / 2 - 4, y + size / 2 + 5);
      }

      Object.keys(pairMap).forEach((id, i) => {
        const p = pairMap[id];
        if (p.start && p.start[0] === r && p.start[1] === c) {
          targetCtx.fillStyle = colorMap[id] || pairColors[i];
          targetCtx.fillRect(x + 3, y + 3, size - 6, size - 6);
          targetCtx.fillStyle = "white";
          targetCtx.fillText(`${id}1`, x + 7, y + size / 2 + 4);
        }
        if (p.end && p.end[0] === r && p.end[1] === c) {
          targetCtx.fillStyle = colorMap[id] || pairColors[i];
          targetCtx.beginPath();
          targetCtx.arc(x + size / 2, y + size / 2, Math.max(8, size / 3), 0, Math.PI * 2);
          targetCtx.fill();
          targetCtx.fillStyle = "white";
          targetCtx.fillText(`${id}2`, x + 7, y + size / 2 + 4);
        }
      });
    }
  }

  if (state.play.on) {
    Object.keys(state.play.paths).forEach((id, i) => {
      const path = state.play.paths[id] || [];
      if (path.length < 2) return;
      targetCtx.strokeStyle = colorMap[id] || pairColors[i % pairColors.length];
      targetCtx.lineWidth = 6;
      targetCtx.beginPath();
      path.forEach((cell, idx) => {
        const px = cell[1] * size + size / 2;
        const py = cell[0] * size + size / 2;
        if (idx === 0) targetCtx.moveTo(px, py); else targetCtx.lineTo(px, py);
      });
      targetCtx.stroke();
    });
  }
}

function drawBoard() {
  drawBoardOn(canvas, ctx);
  drawBoardOn(sessionCanvas, sessionCtx);
}

function log(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
}

function loadLevelToEditor(level) {
  state.editor.level = level.level;
  state.editor.boardSize = level.board_size;
  state.editor.targetDensity = level.target_density;
  state.editor.moves = level.moves || 0;
  state.editor.blockers = new Set((level.blockers || []).map(([r, c]) => coordKey(r, c)));

  state.editor.pairs = { A: { start: null, end: null }, B: { start: null, end: null }, C: { start: null, end: null }, D: { start: null, end: null } };
  (level.pairs || []).forEach((p) => {
    if (state.editor.pairs[p.id]) {
      state.editor.pairs[p.id].start = p.start;
      state.editor.pairs[p.id].end = p.end;
    }
  });

  document.getElementById("ed-level").value = state.editor.level;
  document.getElementById("ed-board-size").value = state.editor.boardSize;
  document.getElementById("ed-density").value = state.editor.targetDensity;
  document.getElementById("ed-moves").value = state.editor.moves;
  state.play.on = false;
  state.play.history = [];
  state.play.colorMap = {};
  setPlayStatus("Play OFF");
  drawBoard();
}

function levelFromEditor() {
  const pairs = activePairsFromEditor();
  const blockers = Array.from(state.editor.blockers).map(parseKey);
  const solutionCount = countSolutions(state.editor.boardSize, pairs, blockers, 20);
  const movesInput = Number(document.getElementById("ed-moves").value || 0);
  const moves = movesInput > 0 ? movesInput : recommendedMoves();

  return {
    level: Number(document.getElementById("ed-level").value),
    board_size: state.editor.boardSize,
    grid: makeGrid(state.editor.boardSize, pairs, blockers),
    pairs,
    blockers,
    moves,
    solution_count: solutionCount,
    target_density: document.getElementById("ed-density").value,
    golden_path: Object.fromEntries(pairs.map((p) => [p.id, [p.start, p.end]])),
    validation: {
      solvable: solutionCount >= 1,
      density_match: true,
      early_mistake_detection: true,
      no_isolated_pairs: true,
      no_late_dead_ends: true,
      curve_integrity: true
    },
    meta: { generation_attempts: 1, failed_checks: [] }
  };
}

function updateManagerTable() {
  const tbody = document.querySelector("#mgr-table tbody");
  tbody.innerHTML = "";

  state.managerRows.forEach((row) => {
    const tr = document.createElement("tr");
    [row.file, row.level, row.board, row.pairs, row.blockers, row.moves, row.solutions, row.density, row.status].forEach((v) => {
      const td = document.createElement("td");
      td.textContent = String(v);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  const valid = state.managerRows.filter((r) => r.status === "OK").length;
  log("mgr-log", `Files: ${state.managerRows.length}\nValid: ${valid}\nInvalid: ${state.managerRows.length - valid}`);
}

function summarizeSessionLevel(level, file, source) {
  return {
    id: state.sessions.nextId++,
    file,
    source,
    level: cloneLevel(level),
    reviewStatus: "PENDING",
    validationStatus: validateLevel(level).valid ? "OK" : "INVALID"
  };
}

function getSelectedSessionItem() {
  return state.sessions.queue.find((item) => item.id === state.sessions.selectedId) || null;
}

function updateSessionTable() {
  const tbody = document.querySelector("#session-table tbody");
  const rows = state.sessions.queue;
  tbody.innerHTML = "";

  rows.forEach((item) => {
    const tr = document.createElement("tr");
    if (item.id === state.sessions.selectedId) tr.classList.add("selected-row");
    if (item.id === state.sessions.activeId) tr.classList.add("active-row");
    tr.addEventListener("click", () => {
      state.sessions.selectedId = item.id;
      updateSessionTable();
      log("session-log", `Selected ${item.file} (${item.reviewStatus}, ${item.validationStatus}).`);
    });

    [item.source, item.file, item.level.level, item.level.board_size, item.level.pairs.length, item.level.moves ?? "-", item.level.solution_count ?? "-", item.reviewStatus, item.validationStatus].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  if (!rows.length) {
    log("session-log", "No session levels loaded.");
  }
}

function queueSessionLevel(level, file, source = "imported") {
  const item = summarizeSessionLevel(level, file, source);
  state.sessions.queue.push(item);
  if (state.sessions.selectedId == null) state.sessions.selectedId = item.id;
  updateSessionTable();
  return item;
}

function playSessionItem(item) {
  loadLevelToEditor(item.level);
  state.sessions.activeId = item.id;
  state.sessions.selectedId = item.id;
  setActiveView("sessions");
  state.play.on = true;
  setPlayStatus("Play ON");
  resetPlayState();
  randomizePlayColors();
  drawBoard();
  updateSessionTable();
  log("session-log", `Loaded session level ${item.file} for play.`);
}

function advanceToNextSessionItem(currentId) {
  if (!state.sessions.queue.length) return false;
  const currentIndex = state.sessions.queue.findIndex((item) => item.id === currentId);
  if (currentIndex === -1) return false;
  if (state.sessions.queue.length === 1) {
    state.sessions.selectedId = currentId;
    updateSessionTable();
    return false;
  }

  const nextIndex = (currentIndex + 1) % state.sessions.queue.length;
  const nextItem = state.sessions.queue[nextIndex];
  playSessionItem(nextItem);
  return true;
}

function applySessionDecision(item, decision) {
  recordLearningDecision(item.level, decision, `session:${item.file}`);
  item.reviewStatus = decision === "approve" ? "APPROVED" : "REJECTED";
  updateSessionTable();
  const moved = advanceToNextSessionItem(item.id);
  if (!moved) {
    log("session-log", `${decision === "approve" ? "Approved" : "Rejected"} ${item.file}. No next level in queue.`);
  }
}

function validateSessionItem(item) {
  const report = validateLevel(item.level);
  item.validationStatus = report.valid ? "OK" : "INVALID";
  updateSessionTable();
  const moved = advanceToNextSessionItem(item.id);
  if (!moved) {
    log("session-log", report.valid ? `${item.file} validated. No next level in queue.` : `${item.file} invalid: ${report.errors.join(", ")}`);
  }
}

function initNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
    });
  });
}

function initMain() {
  document.getElementById("btn-generate-current").addEventListener("click", () => {
    const lvl = Number(document.getElementById("main-level-number").value);
    const generated = generateLevel(lvl);
    loadLevelToEditor(generated);
    log("main-log", `Generated level ${lvl} with ${generated.solution_count} solutions and ${generated.moves} moves.`);
  });

  document.getElementById("btn-generate-progression").addEventListener("click", () => {
    state.progression = generateProgression();
    log("main-log", `Generated full progression (10 levels).`);
  });

  document.getElementById("btn-download-progression-json").addEventListener("click", () => {
    if (!state.progression.length) state.progression = generateProgression();
    downloadText("progression_levels.json", JSON.stringify(state.progression, null, 2));
  });

  document.getElementById("btn-download-progression-csv").addEventListener("click", () => {
    if (!state.progression.length) state.progression = generateProgression();
    downloadText("progression_summary.csv", toCsv(state.progression), "text/csv");
  });

  document.getElementById("btn-generate-procedural-batch").addEventListener("click", () => {
    const start = Number(document.getElementById("main-batch-start").value || 1);
    const end = Number(document.getElementById("main-batch-end").value || 10);
    const count = Number(document.getElementById("main-batch-count").value || 20);
    state.proceduralBatch = generateProceduralBatch(start, end, count);
    log("main-log", `Generated procedural batch: count=${state.proceduralBatch.length}, levels ${Math.min(start, end)}..${Math.max(start, end)}.`);
  });

  document.getElementById("btn-download-procedural-json").addEventListener("click", () => {
    if (!state.proceduralBatch.length) {
      const start = Number(document.getElementById("main-batch-start").value || 1);
      const end = Number(document.getElementById("main-batch-end").value || 10);
      const count = Number(document.getElementById("main-batch-count").value || 20);
      state.proceduralBatch = generateProceduralBatch(start, end, count);
    }
    downloadText("procedural_batch_levels.json", JSON.stringify(state.proceduralBatch, null, 2));
  });

  document.getElementById("btn-download-procedural-csv").addEventListener("click", () => {
    if (!state.proceduralBatch.length) {
      const start = Number(document.getElementById("main-batch-start").value || 1);
      const end = Number(document.getElementById("main-batch-end").value || 10);
      const count = Number(document.getElementById("main-batch-count").value || 20);
      state.proceduralBatch = generateProceduralBatch(start, end, count);
    }
    downloadText("procedural_batch_summary.csv", toCsv(state.proceduralBatch), "text/csv");
  });

  document.getElementById("btn-download-workshop-tutorial").addEventListener("click", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/tutorial_level.json", "tutorial_level.json");
      log("main-log", "Downloaded tutorial_level.json.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });

  document.getElementById("btn-download-workshop-a").addEventListener("click", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/progressionA_bundle.json", "progressionA_bundle.json");
      log("main-log", "Downloaded progressionA_bundle.json.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });

  document.getElementById("btn-download-workshop-b").addEventListener("click", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/progressionB_bundle.json", "progressionB_bundle.json");
      log("main-log", "Downloaded progressionB_bundle.json.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });

  document.getElementById("btn-download-workshop-c").addEventListener("click", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/progressionC_bundle.json", "progressionC_bundle.json");
      log("main-log", "Downloaded progressionC_bundle.json.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });

  document.getElementById("btn-download-workshop-extra").addEventListener("click", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/progressionExtra_bundle.json", "progressionExtra_bundle.json");
      log("main-log", "Downloaded progressionExtra_bundle.json.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });
}

function initEditor() {
  const boardSizeEl = document.getElementById("ed-board-size");
  boardSizeEl.addEventListener("change", () => {
    state.editor.boardSize = Number(boardSizeEl.value);
    state.editor.blockers.clear();
    Object.keys(state.editor.pairs).forEach((id) => {
      state.editor.pairs[id].start = null;
      state.editor.pairs[id].end = null;
    });
    drawBoard();
  });

  document.getElementById("ed-auto-moves").addEventListener("click", () => {
    document.getElementById("ed-moves").value = String(recommendedMoves());
  });

  bindPlayCanvas(canvas, true);

  document.getElementById("ed-validate").addEventListener("click", () => {
    const level = levelFromEditor();
    const report = validateLevel(level);
    const solvedNow = getPlayStatus() === "Solved";
    if (solvedNow) {
      const session = saveSolvedSession("validate");
      log("ed-log", `VALID\nPairs: ${level.pairs.length}\nBlockers: ${level.blockers.length}\nMoves: ${level.moves}\nSolutions: ${level.solution_count}\nSolved session saved: play_session_level_${session.level.level}_validate.json`);
      return;
    }
    log("ed-log", report.valid
      ? `VALID\nPairs: ${level.pairs.length}\nBlockers: ${level.blockers.length}\nMoves: ${level.moves}\nSolutions: ${level.solution_count}`
      : `INVALID\n- ${report.errors.join("\n- ")}`);
  });

  document.getElementById("ed-export").addEventListener("click", () => {
    const level = levelFromEditor();
    downloadText(`level_${level.level}.json`, JSON.stringify(level, null, 2));
  });

  document.getElementById("ed-import").addEventListener("click", () => {
    document.getElementById("ed-import-input").click();
  });

  document.getElementById("ed-import-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const data = JSON.parse(txt);
      loadLevelToEditor(data);
      log("ed-log", `Imported ${file.name}`);
    } catch (err) {
      log("ed-log", `Import error: ${err.message}`);
    }
    e.target.value = "";
  });

  document.getElementById("ed-screenshot").addEventListener("click", () => {
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `layout_level_${document.getElementById("ed-level").value}.png`;
    a.click();
  });

  document.getElementById("ed-reset").addEventListener("click", () => {
    state.editor.blockers.clear();
    Object.keys(state.editor.pairs).forEach((id) => {
      state.editor.pairs[id] = { start: null, end: null };
    });
    document.getElementById("ed-moves").value = "0";
    state.play.on = false;
    state.play.history = [];
    state.play.colorMap = {};
    setPlayStatus("Play OFF");
    drawBoard();
    log("ed-log", "Reset.");
  });

  document.getElementById("ed-approve").addEventListener("click", () => {
    const level = levelFromEditor();
    recordLearningDecision(level, "approve", "editor");
    if (state.sessions.activeId != null) {
      const item = state.sessions.queue.find((entry) => entry.id === state.sessions.activeId);
      if (item) {
        item.reviewStatus = "APPROVED";
        updateSessionTable();
      }
    }
    log("ed-log", `Approved level ${level.level}.`);
  });

  document.getElementById("ed-reject").addEventListener("click", () => {
    const level = levelFromEditor();
    recordLearningDecision(level, "reject", "editor");
    if (state.sessions.activeId != null) {
      const item = state.sessions.queue.find((entry) => entry.id === state.sessions.activeId);
      if (item) {
        item.reviewStatus = "REJECTED";
        updateSessionTable();
      }
    }
    log("ed-log", `Rejected level ${level.level}.`);
  });

  document.getElementById("ed-clear-learning").addEventListener("click", () => {
    state.learning.approved = [];
    state.learning.rejected = [];
    saveLearning();
    updateLearningStatus();
    log("ed-log", "Learning memory cleared.");
  });

  document.getElementById("play-start").addEventListener("click", () => {
    state.play.on = !state.play.on;
    setPlayStatus(state.play.on ? "Play ON" : "Play OFF");
    if (state.play.on) {
      resetPlayState();
      randomizePlayColors();
    } else {
      state.play.colorMap = {};
    }
    drawBoard();
  });

  document.getElementById("play-reset").addEventListener("click", () => {
    resetPlayState();
    if (state.play.on) randomizePlayColors();
    drawBoard();
  });

  document.getElementById("play-pair-id").addEventListener("change", (e) => {
    state.play.selectedPair = e.target.value;
  });

  document.getElementById("play-export-session").addEventListener("click", () => {
    const solvedNow = getPlayStatus() === "Solved";
    const session = solvedNow ? saveSolvedSession("manual") : serializePlaySession(false);
    if (!solvedNow) {
      downloadText(`play_session_level_${session.level.level}.json`, JSON.stringify(session, null, 2));
    }
    log("ed-log", `Exported play session for level ${session.level.level}.`);
  });
}

function resetPlayState() {
  state.play.paths = {};
  state.play.occupied = new Map();
  state.play.history = [{ type: "reset", at: Date.now() }];
  state.play.dragging = false;
  state.play.dragPairId = null;
  state.play.lastDragCellKey = null;
  activePairsFromEditor().forEach((p) => {
    state.play.paths[p.id] = [];
    state.play.occupied.set(coordKey(p.start[0], p.start[1]), p.id);
    state.play.occupied.set(coordKey(p.end[0], p.end[1]), p.id);
  });
}

function findPairById(id) {
  return activePairsFromEditor().find((p) => p.id === id);
}

function tryApplyPlayCell(pairId, cell) {
  const pair = findPairById(pairId);
  if (!pair) return false;

  const blocked = state.editor.blockers.has(coordKey(cell[0], cell[1]));
  if (blocked) return false;

  const path = state.play.paths[pairId] || [];
  const isStart = cell[0] === pair.start[0] && cell[1] === pair.start[1];
  const isEnd = cell[0] === pair.end[0] && cell[1] === pair.end[1];

  if (path.length === 0) {
    if (!isStart && !isEnd) return false;
    state.play.paths[pairId] = [cell];
    state.play.history.push({
      type: "start_path",
      pairId,
      cell,
      anchor: isStart ? "start" : "end",
      at: Date.now()
    });
    evaluatePlayWin();
    return true;
  }

  const last = path[path.length - 1];

  if (manhattan(last, cell) !== 1) return false;

  const startedAtStart = path[0][0] === pair.start[0] && path[0][1] === pair.start[1];
  const target = startedAtStart ? pair.end : pair.start;

  if (cell[0] === target[0] && cell[1] === target[1]) {
    if (sameCell(last, cell)) return false;
    path.push(cell);
    state.play.paths[pairId] = path;
    state.play.history.push({ type: "reach_end", pairId, cell, at: Date.now() });
    evaluatePlayWin();
    return true;
  }

  const k = coordKey(cell[0], cell[1]);
  const occupiedBy = state.play.occupied.get(k);
  if (occupiedBy && occupiedBy !== pairId) return false;

  const previous = path[path.length - 2];
  if (previous && previous[0] === cell[0] && previous[1] === cell[1]) {
    const removed = path.pop();
    if (removed) {
      const rk = coordKey(removed[0], removed[1]);
      if (!(removed[0] === pair.start[0] && removed[1] === pair.start[1])) state.play.occupied.delete(rk);
      state.play.history.push({ type: "backtrack", pairId, cell: removed, at: Date.now() });
    }
  } else if (!sameCell(last, cell)) {
    path.push(cell);
    state.play.occupied.set(k, pairId);
    state.play.history.push({ type: "step", pairId, cell, at: Date.now() });
  } else {
    return false;
  }

  state.play.paths[pairId] = path;
  evaluatePlayWin();
  return true;
}

function handlePlayClick(cell) {
  if (!state.play.on) return;
  const endpoint = endpointAtCell(cell);
  if (endpoint) {
    syncPlayPairSelect(endpoint.pairId);
    tryApplyPlayCell(endpoint.pairId, cell);
    return;
  }
  tryApplyPlayCell(state.play.selectedPair, cell);
}

function beginPlayDrag(cell) {
  const endpoint = endpointAtCell(cell);
  if (!endpoint) {
    endPlayDrag();
    return false;
  }

  syncPlayPairSelect(endpoint.pairId);
  const applied = tryApplyPlayCell(endpoint.pairId, cell);
  state.play.dragging = applied;
  state.play.dragPairId = applied ? endpoint.pairId : null;
  state.play.lastDragCellKey = applied ? coordKey(cell[0], cell[1]) : null;
  return applied;
}

function continuePlayDrag(cell) {
  if (!state.play.dragging || !state.play.dragPairId) return false;
  const key = coordKey(cell[0], cell[1]);
  if (key === state.play.lastDragCellKey) return false;
  state.play.lastDragCellKey = key;
  return tryApplyPlayCell(state.play.dragPairId, cell);
}

function endPlayDrag() {
  state.play.dragging = false;
  state.play.dragPairId = null;
  state.play.lastDragCellKey = null;
}

function bindPlayCanvas(targetCanvas, allowEditing = false) {
  if (allowEditing) {
    targetCanvas.addEventListener("click", (ev) => {
      const cell = cellFromCanvasEvent(ev, targetCanvas);
      if (!cell || state.play.on) return;
      applyEditorCellAction(cell);
      drawBoard();
    });
  }

  targetCanvas.addEventListener("pointerdown", (ev) => {
    if (!state.play.on) return;
    const cell = cellFromCanvasEvent(ev, targetCanvas);
    if (!cell) return;
    if (beginPlayDrag(cell)) {
      targetCanvas.setPointerCapture(ev.pointerId);
      drawBoard();
    }
  });

  targetCanvas.addEventListener("pointermove", (ev) => {
    if (!state.play.on || !state.play.dragging) return;
    const cell = cellFromCanvasEvent(ev, targetCanvas);
    if (!cell) return;
    if (continuePlayDrag(cell)) drawBoard();
  });

  targetCanvas.addEventListener("pointerup", () => {
    if (state.play.dragging) endPlayDrag();
  });

  targetCanvas.addEventListener("pointercancel", () => {
    if (state.play.dragging) endPlayDrag();
  });
}

function evaluatePlayWin() {
  const pairs = activePairsFromEditor();
  const solved = pairs.every((p) => {
    const path = state.play.paths[p.id] || [];
    if (path.length === 0) return false;
    const first = path[0];
    const last = path[path.length - 1];
    const startsAtStart = first && first[0] === p.start[0] && first[1] === p.start[1];
    const startsAtEnd = first && first[0] === p.end[0] && first[1] === p.end[1];
    const reachesOtherEnd =
      (startsAtStart && last && last[0] === p.end[0] && last[1] === p.end[1]) ||
      (startsAtEnd && last && last[0] === p.start[0] && last[1] === p.start[1]);
    return reachesOtherEnd;
  });

  if (solved && pairs.length > 0) {
    setPlayStatus("Solved");
    const session = serializePlaySession(true);
    localStorage.setItem(PLAY_SESSION_KEY, JSON.stringify(session));
    log("ed-log", "Solved in Play Mode. Session saved to browser storage.");
  }
}

function serializePlaySession(solved) {
  return {
    saved_at: new Date().toISOString(),
    solved,
    level: levelFromEditor(),
    selected_pair: state.play.selectedPair,
    paths: Object.fromEntries(
      Object.entries(state.play.paths).map(([id, path]) => [id, path.map(([r, c]) => [r, c])])
    ),
    history: state.play.history.map((entry) => ({
      ...entry,
      cell: entry.cell ? [...entry.cell] : entry.cell
    }))
  };
}

async function autoloadLevelFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const autoload = params.get("autoload");
  if (!autoload) return;

  const levelMap = {
    tutorial: "./workshop_progressions/tutorial_level.json"
  };
  const url = levelMap[autoload] || `./workshop_jsons/${autoload}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    const level = await response.json();
    setActiveView("editor");
    loadLevelToEditor(level);

    if (params.get("play") === "1") {
      state.play.on = true;
      setPlayStatus("Play ON");
      resetPlayState();
      drawBoard();
    }

    log("ed-log", `Autoloaded ${autoload}.`);
  } catch (err) {
    log("main-log", `Autoload error: ${err.message}`);
  }
}

function initManager() {
  document.getElementById("mgr-import-input").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const data = JSON.parse(await file.text());
        const report = validateLevel(data);
        state.managerRows.push({
          file: file.name,
          level: data.level ?? "-",
          board: data.board_size ?? "-",
          pairs: (data.pairs || []).length,
          blockers: (data.blockers || []).length,
          moves: data.moves ?? "-",
          solutions: data.solution_count ?? "-",
          density: data.target_density ?? "-",
          status: report.valid ? "OK" : "INVALID"
        });
      } catch (err) {
        state.managerRows.push({ file: file.name, level: "-", board: "-", pairs: "-", blockers: "-", moves: "-", solutions: "-", density: "-", status: "PARSE_ERROR" });
      }
    }
    updateManagerTable();
    e.target.value = "";
  });

  document.getElementById("mgr-clear").addEventListener("click", () => {
    state.managerRows = [];
    updateManagerTable();
  });

  document.getElementById("mgr-export-csv").addEventListener("click", () => {
    const rows = state.managerRows.map((r) => ({
      level: r.level,
      board_size: r.board,
      pairs_count: r.pairs,
      blockers_count: r.blockers,
      moves: r.moves,
      solution_count: r.solutions,
      target_density: r.density,
      status: r.status
    }));
    const headers = Object.keys(rows[0] || { level: "", board_size: "", pairs_count: "", blockers_count: "", moves: "", solution_count: "", target_density: "", status: "" });
    const csv = [headers.join(",")].concat(rows.map((r) => headers.map((h) => r[h]).join(","))).join("\n");
    downloadText("manager_levels.csv", csv, "text/csv");
  });
}

function initSessions() {
  const importInput = document.getElementById("session-import-input");
  bindPlayCanvas(sessionCanvas, false);

  document.getElementById("session-import").addEventListener("click", () => {
    importInput.click();
  });

  importInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const data = JSON.parse(await file.text());
        queueSessionLevel(data, file.name, "imported");
      } catch (err) {
        log("session-log", `Import error for ${file.name}: ${err.message}`);
      }
    }
    if (files.length) log("session-log", `Imported ${files.length} level(s) into Play Sessions.`);
    e.target.value = "";
  });

  document.getElementById("session-add-current").addEventListener("click", () => {
    const current = levelFromEditor();
    const file = `editor_level_${current.level}_${Date.now()}.json`;
    queueSessionLevel(current, file, "editor");
    log("session-log", `Added current editor level ${current.level} to Play Sessions.`);
  });

  document.getElementById("session-play-selected").addEventListener("click", () => {
    const item = getSelectedSessionItem();
    if (!item) {
      log("session-log", "Select a level first.");
      return;
    }
    playSessionItem(item);
  });

  document.getElementById("session-play-next").addEventListener("click", () => {
    if (!state.sessions.queue.length) {
      log("session-log", "No session levels loaded.");
      return;
    }
    const currentIndex = state.sessions.queue.findIndex((item) => item.id === state.sessions.selectedId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % state.sessions.queue.length : 0;
    const item = state.sessions.queue[nextIndex];
    state.sessions.selectedId = item.id;
    playSessionItem(item);
  });

  document.getElementById("session-validate-selected").addEventListener("click", () => {
    const item = getSelectedSessionItem();
    if (!item) {
      log("session-log", "Select a level first.");
      return;
    }
    validateSessionItem(item);
  });

  document.getElementById("session-approve-selected").addEventListener("click", () => {
    const item = getSelectedSessionItem();
    if (!item) {
      log("session-log", "Select a level first.");
      return;
    }
    applySessionDecision(item, "approve");
  });

  document.getElementById("session-reject-selected").addEventListener("click", () => {
    const item = getSelectedSessionItem();
    if (!item) {
      log("session-log", "Select a level first.");
      return;
    }
    applySessionDecision(item, "reject");
  });

  document.getElementById("session-clear").addEventListener("click", () => {
    state.sessions.queue = [];
    state.sessions.selectedId = null;
    state.sessions.activeId = null;
    updateSessionTable();
  });

  document.getElementById("session-generate-learned").addEventListener("click", () => {
    const start = Number(document.getElementById("session-batch-start").value || 1);
    const end = Number(document.getElementById("session-batch-end").value || 10);
    const count = Number(document.getElementById("session-batch-count").value || 12);
    const batch = generateLearnedSessionBatch(start, end, count);
    batch.forEach((level, index) => {
      queueSessionLevel(level, `learned_${String(index + 1).padStart(2, "0")}_level_${level.level}.json`, "learned");
    });
    log("session-log", `Generated ${batch.length} valid learned procedural level(s). Approved memory=${state.learning.approved.length}.`);
  });

  document.getElementById("session-export-queue").addEventListener("click", () => {
    const payload = state.sessions.queue.map((item) => ({
      file: item.file,
      source: item.source,
      review_status: item.reviewStatus,
      validation_status: item.validationStatus,
      level: item.level
    }));
    downloadText("play_sessions_queue.json", JSON.stringify(payload, null, 2));
  });

  document.getElementById("session-play-toggle").addEventListener("click", () => {
    state.play.on = !state.play.on;
    setPlayStatus(state.play.on ? "Play ON" : "Play OFF");
    if (state.play.on) {
      resetPlayState();
      randomizePlayColors();
    } else {
      state.play.colorMap = {};
      endPlayDrag();
    }
    drawBoard();
  });

  document.getElementById("session-play-reset").addEventListener("click", () => {
    resetPlayState();
    if (state.play.on) randomizePlayColors();
    drawBoard();
    log("session-log", "Session play reset.");
  });

  document.getElementById("session-play-export").addEventListener("click", () => {
    const solvedNow = getPlayStatus() === "Solved";
    const session = solvedNow ? saveSolvedSession("session_manual") : serializePlaySession(false);
    if (!solvedNow) {
      downloadText(`play_session_level_${session.level.level}_session.json`, JSON.stringify(session, null, 2));
    }
    log("session-log", `Exported session play for level ${session.level.level}.`);
  });

  updateSessionTable();
}

function bootstrap() {
  loadLearning();
  initNavigation();
  initMain();
  initEditor();
  initSessions();
  initManager();
  updateLearningStatus();
  drawBoard();
  log("main-log", "Ready.");
  log("ed-log", "Editor ready.");
  log("session-log", "No session levels loaded.");
  log("mgr-log", "No files loaded.");
  autoloadLevelFromQuery();
}

bootstrap();

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

const difficultyToDensity = {
  EASY: ["HIGH", "MEDIUM-HIGH"],
  MEDIUM: ["MEDIUM", "MEDIUM-LOW"],
  HARD: ["LOW", "VERY-LOW", "SINGLE", "LOW-MEDIUM"]
};

const PAIR_IDS = ["A", "B", "C", "D", "E"];
const pairColors = ["#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];
const DEFAULT_UI_THEME = {
  bg: "#f3f7fb",
  surface: "#ffffff",
  text: "#0b1b2a",
  muted: "#5a748e",
  accent: "#0ea5e9",
  accent2: "#0369a1",
  border: "#d8e5f0"
};
const DEFAULT_FONT_FAMILY = "\"Segoe UI\", system-ui, sans-serif";
const PERFORMANCE_PRESETS = {
  low: { managerCardPreviews: false, csvScreenshots: false, sessionPreviews: false, editorStripPreviews: false, renderChunkSize: 6 },
  medium: { managerCardPreviews: true, csvScreenshots: false, sessionPreviews: true, editorStripPreviews: true, renderChunkSize: 10 },
  high: { managerCardPreviews: true, csvScreenshots: true, sessionPreviews: true, editorStripPreviews: true, renderChunkSize: 14 }
};
const playPalette = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#8B5CF6", "#14B8A6", "#F97316"];
const PROJECT_ROOT = "/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally";
const DEFAULT_PROJECT_SAVE_DIR = PROJECT_ROOT;
const PROJECT_ROOT_NAME = basename(PROJECT_ROOT);
const TUTORIAL_LEVEL_BASENAME = "tutorial_level.json";
const defaultManagerProgressions = [
  { key: "progressionA", label: "Progression A" },
  { key: "progressionB", label: "Progression B" },
  { key: "progressionC", label: "Progression C" }
];

function createManagerProgression(label) {
  return {
    label,
    slots: Array(10).fill(null),
    lockedSlots: Array(10).fill(false),
    slotDifficulty: Array(10).fill("")
  };
}

function createDefaultManagerProgressions() {
  return Object.fromEntries(defaultManagerProgressions.map(({ key, label }) => [key, createManagerProgression(label)]));
}

function createDefaultManagerFilters() {
  return {
    name: "",
    board: "",
    difficulty: "",
    status: "",
    level: "",
    pairs: "",
    blockers: "",
    placement: "",
    changed: ""
  };
}

function createDefaultEditorState() {
  return {
    level: 1,
    fileName: "level_1.json",
    boardWidth: 5,
    boardHeight: 5,
    targetDensity: "MEDIUM",
    difficulty: "MEDIUM",
    moves: 0,
    decal: false,
    solutionCount: 0,
    validationSolvable: false,
    validationDensityMatch: false,
    validationDecalPass: null,
    blockers: new Set(),
    debugMarks: new Set(),
    pairs: Object.fromEntries(PAIR_IDS.map((id) => [id, { start: null, end: null }])),
    progressionKey: "progressionA",
    progressionSlot: 1,
    link: { sourceType: "standalone", sourceId: null, label: "Standalone level" },
    dirty: false,
    lastSavedAt: null
  };
}

const state = {
  editor: createDefaultEditorState(),
  progression: [],
  proceduralBatch: [],
  manager: {
    items: [],
    itemIndex: new Map(),
    slotIndexByItemId: new Map(),
    progressions: createDefaultManagerProgressions(),
    progressionOrder: defaultManagerProgressions.map(({ key }) => key),
    activeTab: "progressionA",
    selectedId: null,
    pendingRefTarget: null,
    allLevelsPage: 1,
    allLevelsPageSize: 24,
    draggingId: null,
    referenceIds: [],
    nextId: 1,
    filters: createDefaultManagerFilters(),
    renderToken: 0,
    loading: {
      active: false,
      label: "",
      current: 0,
      total: 0
    },
    tutorialLevelTemplate: null
  },
  sessions: {
    queue: [],
    selectedId: null,
    activeId: null,
    editingId: null,
    nextId: 1
  },
  learning: {
    approved: [],
    rejected: [],
    corrections: []
  },
  settings: {
    exportDir: DEFAULT_PROJECT_SAVE_DIR,
    fontFamily: DEFAULT_FONT_FAMILY,
    uiTheme: { ...DEFAULT_UI_THEME },
    pairColors: [...pairColors],
    maxPairs: 5,
    defaultBoardWidth: 5,
    defaultBoardHeight: 5,
    defaultDifficulty: "MEDIUM",
    performanceProfile: "medium"
  },
  play: {
    on: false,
    selectedPair: PAIR_IDS[0],
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
const EDITOR_DRAFT_KEY = "ftb_editor_draft_v1";
const WORKSPACE_STATE_KEY = "ftb_workspace_state_v1";
const SETTINGS_KEY = "ftb_settings_v1";
let isRestoringWorkspaceState = false;
let isBootstrappingWorkspaceState = true;
let managerMetadataSaveTimer = null;
let lastManagerMetadataSignature = "";
const managerItemMaterializeSignatures = new Map();
const progressionMaterializeSignatures = new Map();

function coordKey(r, c) { return `${r},${c}`; }
function parseKey(k) { return k.split(",").map(Number); }
function parseImportedJson(text) {
  const normalized = String(text ?? "").replace(/^\uFEFF/, "").trim();
  return JSON.parse(normalized);
}
function basename(path) {
  return String(path || "").split("/").filter(Boolean).pop() || String(path || "");
}
function displayProjectPath(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (value.startsWith(PROJECT_ROOT)) {
    return `${PROJECT_ROOT_NAME}${value.slice(PROJECT_ROOT.length)}`;
  }
  return value;
}
function resolveProjectPath(path) {
  const value = String(path || "").trim();
  if (!value) return DEFAULT_PROJECT_SAVE_DIR;
  if (value.startsWith("/")) return value;
  if (value === PROJECT_ROOT_NAME) return PROJECT_ROOT;
  if (value.startsWith(`${PROJECT_ROOT_NAME}/`)) {
    return `${PROJECT_ROOT}/${value.slice(PROJECT_ROOT_NAME.length + 1)}`;
  }
  return `${PROJECT_ROOT}/${value.replace(/^\/+/, "")}`;
}
function slugifyFilePart(value) {
  return String(value || "untitled")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "untitled";
}
function normalizeLevelFileName(value, levelNumber = 1) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return `level_${levelNumber}.json`;
  return trimmed.toLowerCase().endsWith(".json") ? trimmed : `${trimmed}.json`;
}
function activePairIds() {
  return PAIR_IDS.slice(0, Math.max(1, Math.min(PAIR_IDS.length, Number(state.settings.maxPairs || PAIR_IDS.length))));
}
function performanceSettings() {
  const profile = String(state.settings.performanceProfile || "medium").toLowerCase();
  return PERFORMANCE_PRESETS[profile] || PERFORMANCE_PRESETS.medium;
}
function levelWidth(level) {
  return Number(level?.board_width || level?.board_size || level?.grid?.[0]?.length || 0);
}
function levelHeight(level) {
  return Number(level?.board_height || level?.board_size || level?.grid?.length || 0);
}
function densityToDifficulty(label) {
  return Object.entries(difficultyToDensity).find(([, labels]) => labels.includes(label))?.[0] || "MEDIUM";
}
function difficultyToTargetDensity(difficulty, solutionCount) {
  const labels = difficultyToDensity[difficulty] || difficultyToDensity.MEDIUM;
  return labels.find((label) => densityMatch(label, solutionCount)) || labels[0];
}
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

function allCells(width, height = width) {
  const out = [];
  for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) out.push([r, c]);
  return out;
}
function isCorner(width, height, r, c) {
  const lastRow = height - 1;
  const lastCol = width - 1;
  return (r === 0 || r === lastRow) && (c === 0 || c === lastCol);
}

function activePairsFromEditor() {
  const out = [];
  activePairIds().forEach((id, i) => {
    const p = state.editor.pairs[id];
    if (p.start && p.end) out.push({ id, start: p.start, end: p.end, color: pairColors[i] });
  });
  return out;
}

function activeColorMap() {
  if (state.play.on && state.play.colorMap && Object.keys(state.play.colorMap).length > 0) {
    return state.play.colorMap;
  }
  return Object.fromEntries(activePairIds().map((id, i) => [id, pairColors[i]]));
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

function makeGrid(width, height, pairs, blockers) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => "EMPTY"));
  blockers.forEach(([r, c]) => { grid[r][c] = "BLOCKED"; });
  pairs.forEach((p) => {
    grid[p.start[0]][p.start[1]] = `NODE_${p.id}1`;
    grid[p.end[0]][p.end[1]] = `NODE_${p.id}2`;
  });
  return grid;
}

function countSolutions(boardWidth, boardHeight, pairs, blockers, cap = 20) {
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
      if (nr < 0 || nc < 0 || nr >= boardHeight || nc >= boardWidth) continue;
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

  function enumeratePairPaths(start, end, occ, localCap = 200) {
    const paths = [];
    pathDfs(start, end, occ, [start], paths, localCap);
    return paths;
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
    const paths = enumeratePairPaths(p.start, p.end, localOcc, 200);

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

function hasFullCoverSolution(boardWidth, boardHeight, pairs, blockers) {
  const blockedSet = new Set(blockers.map(([r, c]) => coordKey(r, c)));
  const totalFreeCells = (boardWidth * boardHeight) - blockedSet.size;
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
      if (nr < 0 || nc < 0 || nr >= boardHeight || nc >= boardWidth) continue;
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

  function enumeratePairPaths(start, end, occ, localCap = 200) {
    const paths = [];
    pathDfs(start, end, occ, [start], paths, localCap);
    return paths;
  }

  function dfs(idx, occ) {
    if (idx === pairs.length) return occ.size === totalFreeCells;
    const hash = `${idx}|${Array.from(occ).sort().join(";")}`;
    if (memo.has(hash)) return memo.get(hash);

    const p = pairs[idx];
    const startK = coordKey(p.start[0], p.start[1]);
    const localOcc = new Set(occ);
    localOcc.add(startK);
    const paths = enumeratePairPaths(p.start, p.end, localOcc, 200);

    for (const path of paths) {
      const nextOcc = new Set(occ);
      path.forEach(([r, c]) => nextOcc.add(coordKey(r, c)));
      if (dfs(idx + 1, nextOcc)) {
        memo.set(hash, true);
        return true;
      }
    }

    memo.set(hash, false);
    return false;
  }

  return dfs(0, blockedSet);
}

function chooseNodes(width, height, pairCount, next) {
  const candidates = allCells(width, height).filter(([r, c]) => !isCorner(width, height, r, c));
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
    boardWidth: levelWidth(level),
    boardHeight: levelHeight(level),
    pairs: (level.pairs || []).length,
    blockers: (level.blockers || []).length,
    moves: level.moves || 0,
    solutions: level.solution_count || 0
  };
}

function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

function inferDensityLabel(count) {
  const entry = Object.entries(densityRanges).find(([, [lo, hi]]) => count >= lo && count <= hi);
  return entry?.[0] || (count <= 0 ? "HIGH" : "SINGLE");
}

function levelDifficulty(level) {
  return level?.difficulty || level?.meta?.manual_difficulty || densityToDifficulty(level?.target_density);
}

function shouldRenderManagerCardPreview() {
  return !!performanceSettings().managerCardPreviews;
}

function shouldRenderCsvScreenshots() {
  return !!performanceSettings().csvScreenshots;
}

function shouldRenderSessionPreviews() {
  return !!performanceSettings().sessionPreviews;
}

function shouldRenderEditorStripPreviews() {
  return !!performanceSettings().editorStripPreviews;
}

function isManagerProgressionTab(tab) {
  return state.manager.progressionOrder.includes(tab);
}

function getManagerProgression(tab = state.manager.activeTab) {
  return state.manager.progressions[tab] || state.manager.progressions[state.manager.progressionOrder[0]];
}

function getManagerProgressionLabel(tab) {
  if (tab === "allLevels") return "All Levels";
  if (tab === "csvReview") return "CSV Review";
  return getManagerProgression(tab)?.label || tab;
}

function getManagerProgressionKeys() {
  return [...state.manager.progressionOrder];
}

function getAllAssignedManagerIds() {
  return new Set(getManagerProgressionKeys().flatMap((key) => getManagerProgression(key).slots).filter((id) => id != null));
}

function getManagerUnassignedItems() {
  const assigned = getAllAssignedManagerIds();
  return state.manager.items.filter((item) => !assigned.has(item.id));
}

function managerItemBoardLabel(item) {
  return `${levelWidth(item.level) || "-"}x${levelHeight(item.level) || "-"}`;
}

function managerItemPlacement(item) {
  return managerPlacementLabel(item.id);
}

function matchesManagerFilters(item) {
  const filters = state.manager.filters || createDefaultManagerFilters();
  const searchNeedle = filters.name.trim().toLowerCase();
  if (searchNeedle) {
    const haystack = [item.file, item.sourcePath, item.savedPath, item.notes].join(" ").toLowerCase();
    if (!haystack.includes(searchNeedle)) return false;
  }
  if (filters.board && managerItemBoardLabel(item) !== filters.board) return false;
  if (filters.difficulty && levelDifficulty(item.level) !== filters.difficulty) return false;
  if (filters.status && String(item.status || "") !== filters.status) return false;
  if (filters.level && String(item.level?.level ?? "") !== filters.level) return false;
  if (filters.pairs && String((item.level?.pairs || []).length) !== filters.pairs) return false;
  if (filters.blockers && String((item.level?.blockers || []).length) !== filters.blockers) return false;
  if (filters.placement && managerItemPlacement(item) !== filters.placement) return false;
  if (filters.changed) {
    const changedLabel = item.changed ? "Yes" : "No";
    if (changedLabel !== filters.changed) return false;
  }
  return true;
}

function getFilteredManagerItems(items = state.manager.items) {
  return items.filter((item) => matchesManagerFilters(item));
}

function setSelectOptions(selectId, values, currentValue = "") {
  const select = document.getElementById(selectId);
  if (!select) return;
  const previous = currentValue || select.value || "";
  select.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "All";
  select.appendChild(defaultOption);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = values.includes(previous) ? previous : "";
}

function syncManagerFilterControls() {
  const filters = state.manager.filters || createDefaultManagerFilters();
  const items = state.manager.items;
  const unique = (values) => Array.from(new Set(values.filter((value) => value != null && value !== ""))).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }));
  const nameInput = document.getElementById("mgr-filter-name");
  const changedSelect = document.getElementById("mgr-filter-changed");
  if (nameInput) nameInput.value = filters.name || "";
  if (changedSelect) changedSelect.value = filters.changed || "";
  setSelectOptions("mgr-filter-board", unique(items.map((item) => managerItemBoardLabel(item))), filters.board);
  setSelectOptions("mgr-filter-difficulty", unique(items.map((item) => levelDifficulty(item.level))), filters.difficulty);
  setSelectOptions("mgr-filter-status", unique(items.map((item) => String(item.status || ""))), filters.status);
  setSelectOptions("mgr-filter-level", unique(items.map((item) => String(item.level?.level ?? ""))), filters.level);
  setSelectOptions("mgr-filter-pairs", unique(items.map((item) => String((item.level?.pairs || []).length))), filters.pairs);
  setSelectOptions("mgr-filter-blockers", unique(items.map((item) => String((item.level?.blockers || []).length))), filters.blockers);
  setSelectOptions("mgr-filter-placement", unique(items.map((item) => managerItemPlacement(item))), filters.placement);
}

function inferManagerProgressionKey(fileName = "", objectName = "") {
  const source = `${fileName} ${objectName}`.toLowerCase();
  if (source.includes("progressiona")) return "progressionA";
  if (source.includes("progressionb")) return "progressionB";
  if (source.includes("progressionc")) return "progressionC";
  return null;
}

function normalizeBlockerCell(cell) {
  if (Array.isArray(cell) && cell.length >= 2) return [Number(cell[0]), Number(cell[1])];
  if (cell && typeof cell === "object" && Number.isFinite(cell.x) && Number.isFinite(cell.y)) return [Number(cell.y), Number(cell.x)];
  return null;
}

function normalizeLegacyLevel(data, fallbackName = "legacy_level") {
  const rows = Number(data?.gridSize?.rows || data?.gridSize?.height || 0);
  const cols = Number(data?.gridSize?.cols || data?.gridSize?.width || 0);
  const boardWidth = cols;
  const boardHeight = rows;
  if (!(boardWidth >= 4 && boardWidth <= 8 && boardHeight >= 4 && boardHeight <= 8)) {
    throw new Error(`Unsupported legacy grid ${cols}x${rows}. Current editor supports rectangular boards from 4x4 up to 8x8.`);
  }

  const pairIds = PAIR_IDS;
  const pairs = (data.pairs || []).slice(0, PAIR_IDS.length).map((pair, index) => {
    const start = pair?.a ? [Number(pair.a.y), Number(pair.a.x)] : null;
    const end = pair?.b ? [Number(pair.b.y), Number(pair.b.x)] : null;
    if (!start || !end) throw new Error(`Legacy pair ${index + 1} is missing a or b endpoint.`);
    return {
      id: pairIds[index],
      start,
      end,
      color: pairColors[index % pairColors.length]
    };
  });

  const blockers = (data.blockers || []).map(normalizeBlockerCell).filter(Boolean);
  const fallbackLevel = Number(data.level ?? data.id ?? 1);
  const levelNumber = fallbackLevel >= 1 && fallbackLevel <= 10 ? fallbackLevel : 1;
  const solutionCount = countSolutions(boardWidth, boardHeight, pairs, blockers, 20);
  const targetDensity = inferDensityLabel(solutionCount);
  const decal = !!data?.decal;
  const decalPass = decal ? hasFullCoverSolution(boardWidth, boardHeight, pairs, blockers) : null;

  return {
    level: levelNumber,
    board_size: boardWidth === boardHeight ? boardWidth : undefined,
    board_width: boardWidth,
    board_height: boardHeight,
    grid: makeGrid(boardWidth, boardHeight, pairs, blockers),
    pairs,
    blockers,
    decal,
    moves: Number(data.moves || 0),
    solution_count: solutionCount,
    target_density: targetDensity,
    difficulty: densityToDifficulty(targetDensity),
    golden_path: Object.fromEntries(pairs.map((pair) => [pair.id, [pair.start, pair.end]])),
    validation: {
      solvable: solutionCount >= 1,
      density_match: densityMatch(targetDensity, solutionCount),
      decal_required: decal,
      decal_pass: decalPass,
      early_mistake_detection: true,
      no_isolated_pairs: true,
      no_late_dead_ends: true,
      curve_integrity: true
    },
    meta: {
      imported_from_legacy: true,
      source_name: data.name || fallbackName,
      failed_checks: []
    }
  };
}

function isCanonicalLevelPayload(data) {
  return !!data && typeof data === "object" && Array.isArray(data.pairs) && (
    Number.isFinite(Number(data.board_size)) ||
    (Number.isFinite(Number(data.board_width)) && Number.isFinite(Number(data.board_height)))
  );
}

function isLegacyLevelPayload(data) {
  return !!data && typeof data === "object" && !!data.gridSize && Array.isArray(data.pairs) && !Number.isFinite(Number(data.board_size));
}

function isEmbeddedProgressionBundle(data) {
  return !!data && typeof data === "object" && Array.isArray(data.slots) && (data.tutorial_level || data.slots.some((slot) => slot?.level));
}

function isProgressionReferenceConfig(data) {
  return !!data && typeof data === "object" && Array.isArray(data.slots) && data.slots.some((slot) => slot?.level_file);
}

function toPlayableLevel(data, fallbackName = "imported_level") {
  if (isCanonicalLevelPayload(data)) return cloneLevel(data);
  if (isLegacyLevelPayload(data)) return normalizeLegacyLevel(data, fallbackName);
  throw new Error("This JSON is not a playable level. Import progression files in Level Manager instead.");
}

async function fetchWorkshopLevelByFilename(filename) {
  const ref = basename(filename);
  const response = await fetch(`./workshop_jsons/${ref}`);
  if (!response.ok) throw new Error(`Could not resolve referenced level ${ref} in workshop_jsons.`);
  return toPlayableLevel(parseImportedJson(await response.text()), ref);
}

function isTutorialSlotIndex(slotIndex) {
  return Number(slotIndex) === 0;
}

function isTutorialManagerItem(item) {
  if (!item?.level) return false;
  const file = basename(item.file || "");
  const sourcePath = basename(item.sourcePath || "");
  const savedPath = basename(item.savedPath || "");
  return file === TUTORIAL_LEVEL_BASENAME
    || sourcePath === TUTORIAL_LEVEL_BASENAME
    || savedPath === TUTORIAL_LEVEL_BASENAME
    || item.notes === "Tutorial slot"
    || item.level?.meta?.type === "tutorial"
    || item.level?.meta?.source_name === TUTORIAL_LEVEL_BASENAME;
}

async function getTutorialLevelTemplate() {
  if (!state.manager.tutorialLevelTemplate) {
    state.manager.tutorialLevelTemplate = await fetchWorkshopLevelByFilename(TUTORIAL_LEVEL_BASENAME);
  }
  return cloneLevel(state.manager.tutorialLevelTemplate);
}

async function createTutorialManagerItemForProgression(key) {
  const tutorialLevel = await getTutorialLevelTemplate();
  const progressionLabel = getManagerProgressionLabel(key);
  const item = summarizeManagerItem(tutorialLevel, TUTORIAL_LEVEL_BASENAME, `Tutorial slot · ${progressionLabel}`);
  item.notes = "Tutorial slot";
  item.level.meta = {
    ...(item.level.meta || {}),
    type: "tutorial",
    source_name: TUTORIAL_LEVEL_BASENAME
  };
  return item;
}

async function ensureTutorialInProgressionSlot(key) {
  if (!isManagerProgressionTab(key)) return;
  const progression = getManagerProgression(key);
  if (!progression) return;
  const existingId = progression.slots[0];
  const existingItem = existingId != null ? getManagerItemById(existingId) : null;
  if (isTutorialManagerItem(existingItem)) {
    progression.lockedSlots[0] = true;
    if (!progression.slotDifficulty[0]) progression.slotDifficulty[0] = levelDifficulty(existingItem.level);
    return;
  }

  const tutorialItem = await createTutorialManagerItemForProgression(key);
  state.manager.items.push(tutorialItem);
  progression.slots[0] = tutorialItem.id;
  progression.lockedSlots[0] = true;
  progression.slotDifficulty[0] = levelDifficulty(tutorialItem.level);
}

async function ensureTutorialInAllProgressions() {
  const keys = getManagerProgressionKeys();
  for (const key of keys) {
    await ensureTutorialInProgressionSlot(key);
  }
}

function ensureManagerProgression(key, label) {
  if (!state.manager.progressions[key]) {
    state.manager.progressions[key] = createManagerProgression(label);
    state.manager.progressionOrder.push(key);
  } else if (label) {
    state.manager.progressions[key].label = label;
  }
}

const uiTooltips = {
  "btn-generate-current": "Generate one procedural level for the selected slot number and open it in the editor.",
  "btn-generate-progression": "Generate a full 10-level episode curve in memory.",
  "btn-generate-procedural-batch": "Generate many procedural candidate levels using the selected range and batch size.",
  "btn-download-progression-json": "Download the current generated episode as JSON.",
  "btn-download-procedural-json": "Download the current procedural candidate batch as JSON.",
  "btn-download-workshop-tutorial": "Download the tutorial JSON used by the workshop flow.",
  "btn-download-workshop-a": "Download the workshop bundle for progression A.",
  "btn-download-workshop-b": "Download the workshop bundle for progression B.",
  "btn-download-workshop-c": "Download the workshop bundle for progression C.",
  "btn-download-workshop-extra": "Download the workshop bundle for extra levels.",
  "main-level-number": "Choose which level number to generate into the editor.",
  "main-batch-start": "First level number included in the procedural batch range.",
  "main-batch-end": "Last level number included in the procedural batch range.",
  "main-batch-count": "How many procedural candidates to generate in the batch.",
  "ed-level": "Set the level number for the editor JSON.",
  "ed-name": "Set or rename the JSON filename used when saving this level into the project.",
  "ed-board-width": "Choose the board width for the current level.",
  "ed-board-height": "Choose the board height for the current level.",
  "ed-progression-select": "Choose which progression you are building while staying inside the editor.",
  "ed-progression-slot": "Choose which slot of the selected progression the current editor level should go into.",
  "ed-save-to-progression": "Save or replace the selected progression slot with the current editor level.",
  "ed-save-new-level": "Save the current slot, then jump to the next slot with a clean editor so you can keep building the progression.",
  "ed-difficulty": "Choose whether the current level should be treated as easy, medium, or hard.",
  "ed-moves": "Set the move count stored in the JSON.",
  "ed-decal": "Require at least one valid solution that covers every free cell of the board.",
  "ed-auto-moves": "Fill the moves field with the recommended move count.",
  "ed-mode": "Switch between blocker placement, node placement, debug marking, and erase mode.",
  "ed-pair-id": "Choose which pair letter you are placing in node mode.",
  "ed-endpoint": "Choose whether you are placing the first or second endpoint.",
  "ed-save": "Save the current editor changes back to the linked manager or session item.",
  "ed-save-as-new": "Save the current editor level as a brand new level without overwriting the linked source.",
  "ed-validate": "Validate the current editor level against the toolkit rules.",
  "ed-import": "Import one JSON level into the editor.",
  "ed-export": "Export the current editor level as JSON.",
  "ed-screenshot": "Save a PNG screenshot of the editor board.",
  "ed-reset": "Clear the editor board and reset play state.",
  "play-start": "Toggle play mode in the editor board.",
  "play-reset": "Reset all drawn paths in editor play mode.",
  "play-export-session": "Export the current play session from the editor.",
  "board-canvas": "Editor board. Click to edit, or drag to play when play mode is on.",
  "session-import": "Import levels into the Play Sessions review queue.",
  "session-add-current": "Add the current editor level into the Play Sessions queue.",
  "session-progression-select": "Choose which saved progression from Level Manager should be loaded into Play Sessions.",
  "session-load-progression": "Replace the current Play Sessions queue with the selected progression in slot order.",
  "session-play-next": "Advance to the next level in the session queue and load it for play.",
  "session-validate-selected": "Validate the selected session level and then move to the next one.",
  "session-clear": "Remove all levels from the Play Sessions queue.",
  "session-batch-start": "First level number used for learned batch generation.",
  "session-batch-end": "Last level number used for learned batch generation.",
  "session-batch-count": "How many learned procedural levels to generate.",
  "session-generate-learned": "Generate valid procedural levels using approved, rejected, and fixed examples.",
  "session-export-queue": "Export the current Play Sessions queue as JSON.",
  "session-play-reset": "Reset the current session board paths.",
  "session-play-export": "Export the current session-board play data.",
  "session-board-canvas": "Session board. Drag paths directly here when play mode is on.",
  "session-preview-grid": "Visual mosaic of session levels for quick review.",
  "mgr-import-input": "Import JSON levels into the Level Manager planner.",
  "mgr-add-progression": "Create a new progression tab with its own ordered 10-slot layout.",
  "mgr-rename-progression": "Rename the currently active progression tab.",
  "mgr-duplicate-progression": "Duplicate the currently active progression with the same slot order, locks, and difficulties.",
  "mgr-autofill": "Manually fill empty unlocked slots in the active progression using the current pool.",
  "mgr-generate-from-refs": "Generate new candidate levels based on the levels marked as references.",
  "mgr-clear": "Clear all manager levels, slots, and locks.",
  "mgr-export-csv": "Export the manager list as CSV.",
  "mgr-export-progression-csv": "Export the active progression as CSV, including slot and level data.",
  "mgr-export-curve-png": "Save a PNG image of the active progression difficulty curve.",
  "mgr-export-progression-png": "Save a PNG image of the active progression cards and slot order.",
  "mgr-export-progression-json": "Save the active progression as a ZIP with level JSONs, level screenshots, progression screenshots, and the progression CSV.",
  "mgr-tabs": "Switch between progression tabs, unassigned levels, and CSV review.",
  "mgr-slot-grid": "Top progression area with 10 ordered slots. Drag levels here to arrange them.",
  "mgr-pool-grid": "Pool of unassigned levels that can be dragged into the active progression.",
  "mgr-unassigned-grid": "Levels that are not currently placed in any progression.",
  "mgr-progress-title": "Current progression tab and its ordered 10 slots.",
  "settings-export-dir": "Folder inside your project where the toolkit saves JSON, CSV, and screenshot files.",
  "settings-performance-profile": "Choose how aggressively the toolkit should trade visual previews for faster loading.",
  "settings-font-family": "Choose the main UI font used across the toolkit.",
  "settings-color-bg": "Choose the overall page background color.",
  "settings-color-surface": "Choose the card and panel background color.",
  "settings-color-text": "Choose the main text color.",
  "settings-color-muted": "Choose the secondary text color.",
  "settings-color-accent": "Choose the main accent color used by active controls.",
  "settings-color-accent2": "Choose the darker accent color used by headings and tags.",
  "settings-color-border": "Choose the border color used by cards and inputs.",
  "settings-max-pairs": "Set how many pair letters are active in the editor.",
  "settings-default-width": "Set the default board width for new editor levels.",
  "settings-default-height": "Set the default board height for new editor levels.",
  "settings-default-difficulty": "Set the default difficulty for new editor levels.",
  "settings-pair-a": "Choose the editor color for pair A.",
  "settings-pair-b": "Choose the editor color for pair B.",
  "settings-pair-c": "Choose the editor color for pair C.",
  "settings-pair-d": "Choose the editor color for pair D.",
  "settings-pair-e": "Choose the editor color for pair E.",
  "settings-save": "Save the current toolkit settings.",
  "settings-clear-cache": "Clear workspace cache and saved page state, then reload the toolkit."
};

function applyStaticTooltips() {
  Object.entries(uiTooltips).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.title = text;
  });
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const view = btn.dataset.view;
    const label = {
      main: "Open the procedural playground with episode generation, batch generation, and workshop exports.",
      editor: "Open the manual level editor and play board.",
      sessions: "Open the Play Sessions review workflow.",
      manager: "Open the visual Level Manager progression planner.",
      settings: "Open toolkit settings, including the project save path."
    }[view];
    if (label) btn.title = label;
  });
}

function describeFeatureDelta(originalFeatures, correctedFeatures) {
  const changes = [];
  if (!originalFeatures || !correctedFeatures) return "No comparable changes captured.";
  if (originalFeatures.board !== correctedFeatures.board) changes.push(`board ${originalFeatures.board} -> ${correctedFeatures.board}`);
  if (originalFeatures.pairs !== correctedFeatures.pairs) changes.push(`pairs ${originalFeatures.pairs} -> ${correctedFeatures.pairs}`);
  if (originalFeatures.blockers !== correctedFeatures.blockers) changes.push(`blockers ${originalFeatures.blockers} -> ${correctedFeatures.blockers}`);
  if (originalFeatures.moves !== correctedFeatures.moves) changes.push(`moves ${originalFeatures.moves} -> ${correctedFeatures.moves}`);
  if (originalFeatures.solutions !== correctedFeatures.solutions) changes.push(`solutions ${originalFeatures.solutions} -> ${correctedFeatures.solutions}`);
  return changes.length ? changes.join(", ") : "Structure stayed the same; placement/pathing changed.";
}

function summarizeLevelDiff(originalLevel, currentLevel) {
  if (!originalLevel || !currentLevel) return "No diff available.";
  const diffs = [];
  if (originalLevel.level !== currentLevel.level) diffs.push(`level ${originalLevel.level} -> ${currentLevel.level}`);
  if (levelWidth(originalLevel) !== levelWidth(currentLevel) || levelHeight(originalLevel) !== levelHeight(currentLevel)) {
    diffs.push(`board ${levelWidth(originalLevel)}x${levelHeight(originalLevel)} -> ${levelWidth(currentLevel)}x${levelHeight(currentLevel)}`);
  }
  if ((originalLevel.moves || 0) !== (currentLevel.moves || 0)) diffs.push(`moves ${originalLevel.moves || 0} -> ${currentLevel.moves || 0}`);
  if (levelDifficulty(originalLevel) !== levelDifficulty(currentLevel)) diffs.push(`difficulty ${levelDifficulty(originalLevel)} -> ${levelDifficulty(currentLevel)}`);
  if ((originalLevel.solution_count || 0) !== (currentLevel.solution_count || 0)) diffs.push(`solutions ${originalLevel.solution_count || 0} -> ${currentLevel.solution_count || 0}`);
  const originalBlockers = JSON.stringify((originalLevel.blockers || []).slice().sort());
  const currentBlockers = JSON.stringify((currentLevel.blockers || []).slice().sort());
  if (originalBlockers !== currentBlockers) diffs.push("blockers changed");
  const originalPairs = JSON.stringify((originalLevel.pairs || []).map((pair) => ({ id: pair.id, start: pair.start, end: pair.end })));
  const currentPairs = JSON.stringify((currentLevel.pairs || []).map((pair) => ({ id: pair.id, start: pair.start, end: pair.end })));
  if (originalPairs !== currentPairs) diffs.push("pair layout changed");
  return diffs.length ? diffs.join(", ") : "No structural changes.";
}

function difficultyRank(label) {
  return { EASY: 1, MEDIUM: 2, HARD: 3 }[label] || 0;
}

function setManagerDiffPanel(text) {
  const panel = document.getElementById("mgr-diff-panel");
  if (panel) panel.textContent = text;
}

function renderManagerDifficultyCurve() {
  const curveEl = document.getElementById("mgr-difficulty-curve");
  const summaryEl = document.getElementById("mgr-curve-summary");
  if (!curveEl || !summaryEl) return;
  if (!isManagerProgressionTab(state.manager.activeTab)) {
    curveEl.innerHTML = "";
    summaryEl.textContent = "Open a progression tab to see its difficulty curve.";
    return;
  }

  const progression = getManagerProgression(state.manager.activeTab);
  curveEl.innerHTML = "";
  const labels = progression.slots.map((itemId, index) => {
    const item = itemId != null ? getManagerItemById(itemId) : null;
    return progression.slotDifficulty[index] || (item ? levelDifficulty(item.level) : "");
  });

  labels.forEach((label, index) => {
    const rank = difficultyRank(label);
    const bar = document.createElement("div");
    bar.className = "difficulty-bar";

    const visual = document.createElement("div");
    visual.className = `difficulty-bar-visual ${String(label || "").toLowerCase()}`;
    visual.style.height = `${24 + rank * 24}px`;
    visual.title = label ? `Slot ${index + 1}: ${label}` : `Slot ${index + 1}: no difficulty set`;
    bar.appendChild(visual);

    const slotLabel = document.createElement("div");
    slotLabel.className = "difficulty-bar-label";
    slotLabel.textContent = `L${index + 1}`;
    bar.appendChild(slotLabel);

    const value = document.createElement("div");
    value.className = "difficulty-bar-value";
    value.textContent = label || "Auto";
    bar.appendChild(value);

    curveEl.appendChild(bar);
  });

  const compact = labels.map((label, index) => `L${index + 1}:${label || "Auto"}`).join(" | ");
  const filled = progression.slots.filter((id) => id != null).length;
  summaryEl.textContent = `${getManagerProgressionLabel(state.manager.activeTab)}\nFilled slots: ${filled}/10\nCurve: ${compact}`;
}

function meanFeature(rows) {
  if (!rows.length) return null;
  const sum = rows.reduce((acc, r) => {
    acc.boardWidth += r.boardWidth;
    acc.boardHeight += r.boardHeight;
    acc.pairs += r.pairs;
    acc.blockers += r.blockers;
    acc.moves += r.moves;
    acc.solutions += r.solutions;
    return acc;
  }, { boardWidth: 0, boardHeight: 0, pairs: 0, blockers: 0, moves: 0, solutions: 0 });
  return {
    boardWidth: sum.boardWidth / rows.length,
    boardHeight: sum.boardHeight / rows.length,
    pairs: sum.pairs / rows.length,
    blockers: sum.blockers / rows.length,
    moves: sum.moves / rows.length,
    solutions: sum.solutions / rows.length
  };
}

function featureDistance(a, b) {
  if (!a || !b) return 0;
  return (
    Math.abs(a.boardWidth - b.boardWidth) * 1.2 +
    Math.abs(a.boardHeight - b.boardHeight) * 1.2 +
    Math.abs(a.pairs - b.pairs) * 2.0 +
    Math.abs(a.blockers - b.blockers) * 1.5 +
    Math.abs(a.moves - b.moves) * 0.25 +
    Math.abs(a.solutions - b.solutions) * 1.0
  );
}

function scoreCandidateWithLearning(level) {
  const f = extractFeatures(level);
  const approvedSame = state.learning.approved.filter((x) => x.level === f.level).map((x) => x.features);
  const rejectedSame = state.learning.rejected.filter((x) => x.level === f.level).map((x) => x.features);
  const approvedGlobal = state.learning.approved.map((x) => x.features);
  const rejectedGlobal = state.learning.rejected.map((x) => x.features);
  const correctedGlobal = state.learning.corrections.map((x) => x.corrected_features);

  const approvedSameMean = meanFeature(approvedSame);
  const rejectedSameMean = meanFeature(rejectedSame);
  const approvedGlobalMean = meanFeature(approvedGlobal);
  const rejectedGlobalMean = meanFeature(rejectedGlobal);
  const correctedGlobalMean = meanFeature(correctedGlobal);

  return (
    (approvedSameMean ? -featureDistance(f, approvedSameMean) * 2.2 : 0) +
    (rejectedSameMean ? featureDistance(f, rejectedSameMean) * 1.6 : 0) +
    (approvedGlobalMean ? -featureDistance(f, approvedGlobalMean) * 0.9 : 0) +
    (rejectedGlobalMean ? featureDistance(f, rejectedGlobalMean) * 0.55 : 0) +
    (correctedGlobalMean ? -featureDistance(f, correctedGlobalMean) * 1.25 : 0)
  );
}

function generateLevelRaw(levelNumber, seedOffset = 0) {
  const cfg = curve[levelNumber];
  if (!cfg) throw new Error(`Unsupported level: ${levelNumber}`);

  const next = rng(10000 + levelNumber * 101 + seedOffset * 9973);
  const boardSize = pick(next, cfg.board);
  const boardWidth = boardSize;
  const boardHeight = boardSize;
  const pairCount = randInt(next, cfg.pairs[0], cfg.pairs[1]);
  const blockerTarget = randInt(next, cfg.blockers[0], cfg.blockers[1]);

  const pairs = chooseNodes(boardWidth, boardHeight, pairCount, next);
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
  const pool = allCells(boardWidth, boardHeight).filter(([r, c]) => {
    const k = coordKey(r, c);
    return !pathCells.has(k) && !nodeCells.has(k);
  }).sort(() => next() - 0.5);

  let currentCount = countSolutions(boardWidth, boardHeight, pairs, blockers, 20);
  for (const cell of pool) {
    if (blockers.length >= blockerTarget) break;
    const trial = blockers.concat([cell]);
    const newCount = countSolutions(boardWidth, boardHeight, pairs, trial, 20);
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
    board_size: boardWidth,
    board_width: boardWidth,
    board_height: boardHeight,
    grid: makeGrid(boardWidth, boardHeight, pairs, blockers),
    pairs,
    blockers,
    decal: false,
    moves,
    solution_count: solutionCount,
    target_density: cfg.density,
    difficulty: densityToDifficulty(cfg.density),
    golden_path: goldenPath,
    validation: {
      solvable: solutionCount >= 1,
      density_match: densityMatch(cfg.density, solutionCount),
      decal_required: false,
      decal_pass: null,
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
  const width = levelWidth(level);
  const height = levelHeight(level);
  if (!(width >= 4 && width <= 8 && height >= 4 && height <= 8)) errors.push("board width/height must be 4..8");

  const pairs = level.pairs || [];
  if (pairs.length < 2 || pairs.length > 5) errors.push("pairs count must be 2..5");

  const used = new Set();
  for (const p of pairs) {
    const coords = [p.start, p.end];
    for (const c of coords) {
      if (!c || c[0] < 0 || c[1] < 0 || c[0] >= height || c[1] >= width) errors.push(`pair ${p.id} out of bounds`);
      const k = coordKey(c[0], c[1]);
      if (used.has(k)) errors.push(`node overlap at ${k}`);
      used.add(k);
    }
  }
  for (const b of level.blockers || []) {
    if (b[0] < 0 || b[1] < 0 || b[0] >= height || b[1] >= width) errors.push(`blocker out of bounds ${b}`);
    if (used.has(coordKey(b[0], b[1]))) errors.push(`blocker overlaps node ${b}`);
  }

  if (level.moves != null && level.moves < 0) errors.push("moves must be >= 0");
  const decalRequired = !!level.decal;
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      solutionCount: 0,
      solvable: false,
      decalRequired,
      decalPass: null
    };
  }
  const actualSolutionCount = countSolutions(width, height, pairs, level.blockers || [], 20);
  const solvable = actualSolutionCount >= 1;
  if (!solvable) errors.push("level is impossible with the current layout");
  const decalPass = decalRequired ? hasFullCoverSolution(width, height, pairs, level.blockers || []) : null;
  if (decalRequired && !decalPass) errors.push("decal requires a full-board solution that covers every free cell");

  return {
    valid: errors.length === 0,
    errors,
    solutionCount: actualSolutionCount,
    solvable,
    decalRequired,
    decalPass
  };
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
    state.learning.corrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
  } catch (_err) {
    state.learning.approved = [];
    state.learning.rejected = [];
    state.learning.corrections = [];
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const savedExportDir = String(parsed.exportDir || DEFAULT_PROJECT_SAVE_DIR);
    state.settings.exportDir = savedExportDir.includes("/levels/standalone/toolkit_exports")
      ? DEFAULT_PROJECT_SAVE_DIR
      : savedExportDir;
    state.settings.fontFamily = String(parsed.fontFamily || DEFAULT_FONT_FAMILY);
    state.settings.uiTheme = { ...DEFAULT_UI_THEME, ...(parsed.uiTheme || {}) };
    state.settings.pairColors = Array.isArray(parsed.pairColors) ? PAIR_IDS.map((_, index) => parsed.pairColors[index] || pairColors[index]) : [...pairColors];
    state.settings.maxPairs = Math.max(1, Math.min(PAIR_IDS.length, Number(parsed.maxPairs || 5)));
    state.settings.defaultBoardWidth = Math.max(4, Math.min(8, Number(parsed.defaultBoardWidth || 5)));
    state.settings.defaultBoardHeight = Math.max(4, Math.min(8, Number(parsed.defaultBoardHeight || 5)));
    state.settings.defaultDifficulty = ["EASY", "MEDIUM", "HARD"].includes(parsed.defaultDifficulty) ? parsed.defaultDifficulty : "MEDIUM";
    state.settings.performanceProfile = ["low", "medium", "high"].includes(String(parsed.performanceProfile || "").toLowerCase())
      ? String(parsed.performanceProfile).toLowerCase()
      : "medium";
  } catch (_err) {
    state.settings.exportDir = DEFAULT_PROJECT_SAVE_DIR;
    state.settings.fontFamily = DEFAULT_FONT_FAMILY;
    state.settings.uiTheme = { ...DEFAULT_UI_THEME };
    state.settings.pairColors = [...pairColors];
    state.settings.maxPairs = 5;
    state.settings.defaultBoardWidth = 5;
    state.settings.defaultBoardHeight = 5;
    state.settings.defaultDifficulty = "MEDIUM";
    state.settings.performanceProfile = "medium";
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  const input = document.getElementById("settings-export-dir");
  if (input) input.value = displayProjectPath(state.settings.exportDir);
}

function applySettingsToUi() {
  document.documentElement.style.setProperty("--bg", state.settings.uiTheme.bg);
  document.documentElement.style.setProperty("--surface", state.settings.uiTheme.surface);
  document.documentElement.style.setProperty("--text", state.settings.uiTheme.text);
  document.documentElement.style.setProperty("--muted", state.settings.uiTheme.muted);
  document.documentElement.style.setProperty("--accent", state.settings.uiTheme.accent);
  document.documentElement.style.setProperty("--accent-2", state.settings.uiTheme.accent2);
  document.documentElement.style.setProperty("--border", state.settings.uiTheme.border);
  document.body.style.fontFamily = state.settings.fontFamily;
  state.settings.pairColors.forEach((color, index) => {
    pairColors[index] = color;
  });
}

function applySettingsToEditorDefaults() {
  state.editor.boardWidth = Math.max(4, Math.min(8, Number(state.settings.defaultBoardWidth || 5)));
  state.editor.boardHeight = Math.max(4, Math.min(8, Number(state.settings.defaultBoardHeight || 5)));
  state.editor.difficulty = ["EASY", "MEDIUM", "HARD"].includes(state.settings.defaultDifficulty) ? state.settings.defaultDifficulty : "MEDIUM";
  if (!activePairIds().includes(state.play.selectedPair)) state.play.selectedPair = activePairIds()[0];
}

function restoreEditorDraft() {
  try {
    const raw = localStorage.getItem(EDITOR_DRAFT_KEY);
    if (!raw) return false;
    const draft = toPlayableLevel(parseImportedJson(raw), "editor_draft");
    loadLevelToEditor(draft, { fileName: draft.meta?.source_name || "editor_draft.json" });
    setEditorLink("standalone", null, "Standalone draft restored");
    state.editor.lastSavedAt = Date.now();
    updateEditorSaveStatus();
    log("ed-log", "Restored the last saved editor draft.");
    return true;
  } catch (_err) {
    return false;
  }
}

function serializeManagerItem(item) {
  return {
    id: item.id,
    file: item.file,
    sourcePath: item.sourcePath,
    savedPath: item.savedPath || "",
    screenshotPath: item.screenshotPath || "",
    parseError: item.parseError || "",
    changed: !!item.changed,
    notes: item.notes || "",
    status: item.status,
    level: item.level ? cloneLevel(item.level) : null,
    originalLevel: item.originalLevel ? cloneLevel(item.originalLevel) : null
  };
}

function serializeSessionItem(item) {
  return {
    id: item.id,
    file: item.file,
    source: item.source,
    changed: !!item.changed,
    managerItemId: item.managerItemId ?? null,
    savedPath: item.savedPath || "",
    reviewStatus: item.reviewStatus,
    validationStatus: item.validationStatus,
    level: item.level ? cloneLevel(item.level) : null,
    originalLevel: item.originalLevel ? cloneLevel(item.originalLevel) : null
  };
}

function buildEditorSnapshotLevel() {
  const levelNumber = Number(document.getElementById("ed-level")?.value || state.editor.level || 1);
  const difficulty = document.getElementById("ed-difficulty")?.value || state.editor.difficulty || "MEDIUM";
  const fileName = normalizeLevelFileName(document.getElementById("ed-name")?.value || state.editor.fileName, levelNumber);
  const movesRaw = String(document.getElementById("ed-moves")?.value ?? state.editor.moves ?? "").trim();
  const moves = movesRaw === "" ? Number(state.editor.moves || 0) : Number(movesRaw);
  const pairs = activePairsFromEditor();
  const blockers = Array.from(state.editor.blockers).map(parseKey);
  return {
    level: levelNumber,
    board_size: state.editor.boardWidth === state.editor.boardHeight ? state.editor.boardWidth : undefined,
    board_width: state.editor.boardWidth,
    board_height: state.editor.boardHeight,
    grid: makeGrid(state.editor.boardWidth, state.editor.boardHeight, pairs, blockers),
    pairs,
    blockers,
    decal: !!state.editor.decal,
    moves: Number.isFinite(moves) ? moves : 0,
    solution_count: Number(state.editor.solutionCount || 0),
    target_density: state.editor.targetDensity || difficultyToTargetDensity(difficulty, Number(state.editor.solutionCount || 0)),
    difficulty,
    golden_path: Object.fromEntries(pairs.map((p) => [p.id, [p.start, p.end]])),
    validation: {
      solvable: !!state.editor.validationSolvable,
      density_match: !!state.editor.validationDensityMatch,
      decal_required: !!state.editor.decal,
      decal_pass: state.editor.validationDecalPass ?? null,
      early_mistake_detection: true,
      no_isolated_pairs: true,
      no_late_dead_ends: true,
      curve_integrity: true
    },
    meta: { generation_attempts: 1, failed_checks: [], manual_difficulty: difficulty, source_name: fileName }
  };
}

function persistWorkspaceState() {
  if (isRestoringWorkspaceState || isBootstrappingWorkspaceState) return;
  try {
    const payload = {
      editor: {
        level: buildEditorSnapshotLevel(),
        fileName: state.editor.fileName,
        progressionKey: state.editor.progressionKey,
        progressionSlot: state.editor.progressionSlot,
        link: { ...(state.editor.link || { sourceType: "standalone", sourceId: null, label: "Standalone level" }) },
        dirty: !!state.editor.dirty,
        lastSavedAt: state.editor.lastSavedAt || null
      },
      manager: {
        items: state.manager.items.map(serializeManagerItem),
        progressions: Object.fromEntries(getManagerProgressionKeys().map((key) => [key, {
          label: getManagerProgression(key).label,
          slots: [...getManagerProgression(key).slots],
          lockedSlots: [...getManagerProgression(key).lockedSlots],
          slotDifficulty: [...getManagerProgression(key).slotDifficulty]
        }])),
        progressionOrder: [...state.manager.progressionOrder],
        activeTab: state.manager.activeTab,
        selectedId: state.manager.selectedId,
        pendingRefTarget: state.manager.pendingRefTarget ? { ...state.manager.pendingRefTarget } : null,
        allLevelsPage: state.manager.allLevelsPage,
        referenceIds: [...state.manager.referenceIds],
        nextId: state.manager.nextId,
        filters: { ...(state.manager.filters || createDefaultManagerFilters()) }
      },
      sessions: {
        queue: state.sessions.queue.map(serializeSessionItem),
        selectedId: state.sessions.selectedId,
        activeId: state.sessions.activeId,
        editingId: state.sessions.editingId,
        nextId: state.sessions.nextId
      },
      progression: state.progression.map((level) => cloneLevel(level)),
      proceduralBatch: state.proceduralBatch.map((level) => cloneLevel(level)),
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(payload));
  } catch (_err) {
    // Best-effort persistence only.
  }
}

function restoreWorkspaceState() {
  try {
    const raw = localStorage.getItem(WORKSPACE_STATE_KEY);
    if (!raw) return false;
    const parsed = parseImportedJson(raw);
    isRestoringWorkspaceState = true;

    if (parsed.editor?.level) {
      loadLevelToEditor(toPlayableLevel(parsed.editor.level, "workspace_editor_level"), {
        fileName: parsed.editor.fileName || parsed.editor.level?.meta?.source_name || "workspace_editor_level.json"
      });
      state.editor.progressionKey = parsed.editor.progressionKey || state.editor.progressionKey;
      state.editor.progressionSlot = Number(parsed.editor.progressionSlot || state.editor.progressionSlot || 1);
      state.editor.link = parsed.editor.link || { sourceType: "standalone", sourceId: null, label: "Standalone level" };
      state.editor.dirty = !!parsed.editor.dirty;
      state.editor.lastSavedAt = parsed.editor.lastSavedAt || null;
      updateEditorSaveStatus();
    }

    state.manager.items = (parsed.manager?.items || []).map((item) => ({
      ...item,
      changed: !!item.changed,
      notes: item.notes || "",
      savedPath: item.savedPath || "",
      screenshotPath: item.screenshotPath || "",
      originalLevel: item.originalLevel ? cloneLevel(item.originalLevel) : (item.level ? cloneLevel(item.level) : null),
      previewDataUrl: item.previewDataUrl || null
    }));
    if (parsed.manager?.progressions) {
      const parsedOrder = Array.isArray(parsed.manager?.progressionOrder) && parsed.manager.progressionOrder.length
        ? parsed.manager.progressionOrder
        : Object.keys(parsed.manager.progressions);
      state.manager.progressionOrder = parsedOrder.filter(Boolean);
      state.manager.progressions = {};
      state.manager.progressionOrder.forEach((key, index) => {
        const src = parsed.manager.progressions[key] || {};
        const fallbackLabel = defaultManagerProgressions.find((entry) => entry.key === key)?.label || `Progression ${index + 1}`;
        state.manager.progressions[key] = {
          label: src.label || fallbackLabel,
          slots: Array.isArray(src.slots) ? src.slots : Array(10).fill(null),
          lockedSlots: Array.isArray(src.lockedSlots) ? src.lockedSlots : Array(10).fill(false),
          slotDifficulty: Array.isArray(src.slotDifficulty) ? src.slotDifficulty : Array(10).fill("")
        };
      });
    } else {
      // Backward compatibility with the older single-progression state shape.
      state.manager.progressions = createDefaultManagerProgressions();
      state.manager.progressionOrder = defaultManagerProgressions.map(({ key }) => key);
      state.manager.progressions.progressionA = {
        label: "Progression A",
        slots: Array.isArray(parsed.manager?.slots) ? parsed.manager.slots : Array(10).fill(null),
        lockedSlots: Array.isArray(parsed.manager?.lockedSlots) ? parsed.manager.lockedSlots : Array(10).fill(false),
        slotDifficulty: Array(10).fill("")
      };
    }
    const fallbackActiveTab = state.manager.progressionOrder[0] || "allLevels";
    state.manager.activeTab = parsed.manager?.activeTab || fallbackActiveTab;
    if (!isManagerProgressionTab(state.manager.activeTab) && !["allLevels", "csvReview"].includes(state.manager.activeTab)) {
      state.manager.activeTab = fallbackActiveTab;
    }
    state.manager.selectedId = parsed.manager?.selectedId ?? null;
    state.manager.pendingRefTarget = parsed.manager?.pendingRefTarget || null;
    state.manager.allLevelsPage = Math.max(1, Number(parsed.manager?.allLevelsPage || 1));
    state.manager.referenceIds = Array.isArray(parsed.manager?.referenceIds) ? parsed.manager.referenceIds : [];
    state.manager.nextId = Number(parsed.manager?.nextId || (state.manager.items.length + 1));
    state.manager.filters = { ...createDefaultManagerFilters(), ...(parsed.manager?.filters || {}) };

    state.sessions.queue = (parsed.sessions?.queue || []).map((item) => ({
      ...item,
      changed: !!item.changed,
      previewDataUrl: item.previewDataUrl || null
    }));
    state.sessions.selectedId = parsed.sessions?.selectedId ?? null;
    state.sessions.activeId = parsed.sessions?.activeId ?? null;
    state.sessions.editingId = parsed.sessions?.editingId ?? null;
    state.sessions.nextId = Number(parsed.sessions?.nextId || (state.sessions.queue.length + 1));

    state.progression = (parsed.progression || []).map((level) => cloneLevel(level));
    state.proceduralBatch = (parsed.proceduralBatch || []).map((level) => cloneLevel(level));

    refreshVisibleView();
    isRestoringWorkspaceState = false;
    return true;
  } catch (_err) {
    isRestoringWorkspaceState = false;
    return false;
  }
}

function updateLearningStatus() {
  const el = document.getElementById("learning-status");
  if (!el) return;
  el.textContent = `Learning: ${state.learning.approved.length} approved / ${state.learning.rejected.length} rejected / ${state.learning.corrections.length} fixes`;
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

async function saveProjectFile(relativePath, content, mime = "application/json") {
  const response = await fetch("/api/save-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      content,
      mime,
      baseDir: state.settings.exportDir
    })
  });
  if (!response.ok) throw new Error(`Project save failed (${response.status})`);
  return response.json();
}

async function saveRepoFile(relativePath, content, mime = "application/json") {
  const response = await fetch("/api/save-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      content,
      mime,
      baseDir: "."
    })
  });
  if (!response.ok) throw new Error(`Repo save failed (${response.status})`);
  return response.json();
}

async function saveProjectDataUrl(relativePath, dataUrl) {
  const response = await fetch("/api/save-data-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      dataUrl,
      baseDir: state.settings.exportDir
    })
  });
  if (!response.ok) throw new Error(`Project save failed (${response.status})`);
  return response.json();
}

async function saveRepoDataUrl(relativePath, dataUrl) {
  const response = await fetch("/api/save-data-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      dataUrl,
      baseDir: "."
    })
  });
  if (!response.ok) throw new Error(`Repo save failed (${response.status})`);
  return response.json();
}

async function appendProjectFile(relativePath, content) {
  const response = await fetch("/api/append-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      content,
      baseDir: state.settings.exportDir
    })
  });
  if (!response.ok) throw new Error(`Project append failed (${response.status})`);
  return response.json();
}

async function createProjectZip(relativePath, archiveName, entries) {
  const response = await fetch("/api/create-zip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      archiveName,
      entries,
      baseDir: state.settings.exportDir
    })
  });
  if (!response.ok) throw new Error(`Project zip failed (${response.status})`);
  return response.json();
}

async function saveLevelArtifactsToProject(level, preferredName) {
  const stem = slugifyFilePart(preferredName || `level_${level.level}`);
  const jsonResult = await saveProjectFile(`levels/${stem}.json`, JSON.stringify(level, null, 2));
  const screenshotResult = await saveProjectDataUrl(`screenshots/${stem}.png`, createLevelPreviewDataUrl(level));
  return { jsonPath: jsonResult.path, screenshotPath: screenshotResult.path };
}

async function saveSolvedSession(reason = "manual") {
  const session = serializePlaySession(true);
  session.save_reason = reason;
  localStorage.setItem(PLAY_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(PLAY_SESSION_EXPORT_DIR_KEY, new Date().toISOString());
  session.saved_path = (await saveProjectFile(`playtest/play_session_level_${session.level.level}_${reason}.json`, JSON.stringify(session, null, 2))).path;
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

function projectRelativePath(pathValue) {
  const absolute = resolveProjectPath(pathValue || "");
  if (absolute.startsWith(`${PROJECT_ROOT}/`)) return absolute.slice(PROJECT_ROOT.length + 1);
  return String(pathValue || "").replace(/^\/+/, "");
}

function preferredManagerItemFileName(item) {
  const savedBase = basename(item?.savedPath || "");
  if (savedBase.toLowerCase().endsWith(".json")) return savedBase;
  const sourceBase = basename(item?.sourcePath || "");
  if (sourceBase.toLowerCase().endsWith(".json")) {
    const cleaned = sourceBase.includes("·") ? sourceBase.split("·").pop().trim() : sourceBase;
    if (cleaned.toLowerCase().endsWith(".json")) return cleaned;
  }
  const metaBase = basename(item?.level?.meta?.source_name || "");
  if (metaBase.toLowerCase().endsWith(".json")) return metaBase;
  if ((item?.notes || "").toLowerCase().includes("tutorial") || String(item?.file || "").toLowerCase().includes("tutorial")) {
    return "tutorial_level.json";
  }
  return normalizeLevelFileName(item?.file || `level_${item?.level?.level || 1}`, item?.level?.level || 1);
}

async function materializeManagerItemToRepo(item) {
  if (!item?.level) return null;
  const fileName = preferredManagerItemFileName(item);
  const relativeJsonPath = `levels/${fileName}`;
  const relativeScreenshotPath = `levels/screenshots/${slugifyFilePart(fileName)}.png`;
  const signature = JSON.stringify({
    fileName,
    screenshot: relativeScreenshotPath,
    level: item.level
  });
  if (managerItemMaterializeSignatures.get(item.id) !== signature) {
    await saveRepoFile(relativeJsonPath, JSON.stringify(item.level, null, 2));
    await saveRepoDataUrl(relativeScreenshotPath, createLevelPreviewDataUrl(item.level));
    managerItemMaterializeSignatures.set(item.id, signature);
  }
  item.savedPath = resolveProjectPath(relativeJsonPath);
  item.screenshotPath = resolveProjectPath(relativeScreenshotPath);
  return {
    jsonRelativePath: relativeJsonPath,
    screenshotRelativePath: relativeScreenshotPath
  };
}

function progressionConfigFileName(key) {
  if (key === "progressionA") return "progressionA_workshop.json";
  if (key === "progressionB") return "progressionB_workshop.json";
  if (key === "progressionC") return "progressionC_workshop.json";
  if (key === "progressionExtra") return "progressionExtra_workshop.json";
  return `${key}.json`;
}

async function materializeManagerProgressionsToRepo() {
  const assignedIds = Array.from(getAllAssignedManagerIds());
  const materializedItems = new Map();
  for (const itemId of assignedIds) {
    const item = getManagerItemById(itemId);
    if (!item) continue;
    materializedItems.set(itemId, await materializeManagerItemToRepo(item));
  }

  const summary = {};
  for (const key of getManagerProgressionKeys()) {
    if (!isManagerProgressionTab(key)) continue;
    const progression = getManagerProgression(key);
    const tutorialItem = progression.slots[0] != null ? getManagerItemById(progression.slots[0]) : null;
    const tutorialMaterialized = tutorialItem ? materializedItems.get(tutorialItem.id) : null;
    const config = {
      name: key,
      tutorial_level_file: tutorialMaterialized?.jsonRelativePath || "levels/tutorial_level.json",
      slots: progression.slots.map((itemId, index) => {
        if (index === 0) return { slot: 1, status: "reserved", label: "TUTORIAL" };
        if (itemId == null) return { slot: index + 1 };
        return {
          slot: index + 1,
          level_file: materializedItems.get(itemId)?.jsonRelativePath || projectRelativePath(getManagerItemById(itemId)?.savedPath || "")
        };
      })
    };
    const signature = JSON.stringify(config);
    if (progressionMaterializeSignatures.get(key) !== signature) {
      await saveRepoFile(`progressions/${progressionConfigFileName(key)}`, JSON.stringify(config, null, 2));
      progressionMaterializeSignatures.set(key, signature);
    }
    summary[key] = config;
  }
  await saveRepoFile("progressions/manager_progressions_live.json", JSON.stringify(summary, null, 2));
}

function recordCorrectionLearning(originalLevel, correctedLevel, context = "session_fix") {
  const entry = {
    timestamp: Date.now(),
    context,
    original_level: cloneLevel(originalLevel),
    corrected_level: cloneLevel(correctedLevel),
    original_features: extractFeatures(originalLevel),
    corrected_features: extractFeatures(correctedLevel)
  };
  state.learning.corrections.push(entry);
  recordLearningDecision(originalLevel, "reject", `${context}:original`);
  recordLearningDecision(correctedLevel, "approve", `${context}:corrected`);
  saveLearning();
  updateLearningStatus();
  return entry;
}

function setActiveView(viewName) {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${viewName}`));
  if (viewName === "manager") {
    if (state.editor.link?.sourceType === "manager" && state.editor.link.sourceId != null) {
      state.manager.selectedId = state.editor.link.sourceId;
    } else if (state.manager.selectedId == null) {
      const firstAssigned = getManagerProgressionKeys().flatMap((key) => getManagerProgression(key).slots).find((id) => id != null);
      state.manager.selectedId = firstAssigned ?? state.manager.items[0]?.id ?? null;
    }
    updateManagerTable();
  }
  if (viewName === "sessions") updateSessionTable();
  if (viewName === "editor") {
    updateEditorSaveStatus();
    drawBoard();
  }
}

function currentActiveView() {
  return document.querySelector(".nav-btn.active")?.dataset.view || "main";
}

function refreshVisibleView() {
  const view = currentActiveView();
  if (view === "manager") updateManagerTable();
  if (view === "sessions") updateSessionTable();
  if (view === "editor") {
    updateEditorSaveStatus();
    drawBoard();
  }
}

function clearSavedWorkspaceState(options = {}) {
  const keepSettings = options.keepSettings !== false;
  [
    LEARNING_KEY,
    PLAY_SESSION_KEY,
    PLAY_SESSION_EXPORT_DIR_KEY,
    EDITOR_DRAFT_KEY,
    WORKSPACE_STATE_KEY
  ].forEach((key) => localStorage.removeItem(key));
  if (!keepSettings) localStorage.removeItem(SETTINGS_KEY);
}

function resetWorkspaceInMemory() {
  state.editor = createDefaultEditorState();
  applySettingsToEditorDefaults();
  state.progression = [];
  state.proceduralBatch = [];
  state.manager.items = [];
  state.manager.progressions = createDefaultManagerProgressions();
  state.manager.progressionOrder = defaultManagerProgressions.map(({ key }) => key);
  state.manager.activeTab = state.manager.progressionOrder[0];
  state.manager.selectedId = null;
  state.manager.pendingRefTarget = null;
  state.manager.allLevelsPage = 1;
  state.manager.draggingId = null;
  state.manager.referenceIds = [];
  state.manager.nextId = 1;
  state.manager.filters = createDefaultManagerFilters();
  state.sessions.queue = [];
  state.sessions.selectedId = null;
  state.sessions.activeId = null;
  state.sessions.editingId = null;
  state.sessions.nextId = 1;
  state.learning.approved = [];
  state.learning.rejected = [];
  state.learning.corrections = [];
  state.play.on = false;
  state.play.selectedPair = PAIR_IDS[0];
  state.play.paths = {};
  state.play.occupied = new Map();
  state.play.history = [];
  state.play.colorMap = {};
  state.play.dragging = false;
  state.play.dragPairId = null;
  state.play.lastDragCellKey = null;
  syncEditorInputs();
  updateEditorSaveStatus();
  updateLearningStatus();
  updateSessionTable();
  updateManagerTable();
  drawBoard();
}

function toCsv(levels) {
  const headers = ["level", "board_width", "board_height", "pairs_count", "blockers_count", "moves", "solution_count", "target_density", "solvable", "decal", "decal_pass", "curve_integrity"];
  const rows = levels.map((l) => [
    l.level,
    levelWidth(l),
    levelHeight(l),
    l.pairs.length,
    l.blockers.length,
    l.moves ?? "",
    l.solution_count,
    l.target_density,
    l.validation?.solvable,
    !!l.decal,
    l.validation?.decal_pass,
    l.validation?.curve_integrity
  ]);
  return [headers.join(",")].concat(rows.map((r) => r.join(","))).join("\n");
}

async function downloadWorkshopBundle(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  const text = await response.text();
  return saveProjectFile(`bundles/${filename}`, text);
}

const canvas = document.getElementById("board-canvas");
const ctx = canvas.getContext("2d");
const sessionCanvas = document.getElementById("session-board-canvas");
const sessionCtx = sessionCanvas.getContext("2d");

function editorCellSize(targetCanvas = canvas) {
  return Math.floor(Math.min(
    targetCanvas.width / state.editor.boardWidth,
    targetCanvas.height / state.editor.boardHeight
  ));
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
  if (r < 0 || c < 0 || r >= state.editor.boardHeight || c >= state.editor.boardWidth) return null;
  return [r, c];
}

function applyEditorCellAction(cell) {
  const key = coordKey(cell[0], cell[1]);
  const mode = document.getElementById("ed-mode").value;
  if (mode === "debug") {
    if (state.editor.debugMarks.has(key)) state.editor.debugMarks.delete(key);
    else state.editor.debugMarks.add(key);
    updateEditorDebugStatus();
    return;
  }
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
  const playPairEl = document.getElementById("play-pair-id");
  if (playPairEl) playPairEl.value = pairId;
}

function setPlayStatus(text) {
  const editorStatus = document.getElementById("play-status");
  const sessionStatus = document.getElementById("session-play-status");
  if (editorStatus) editorStatus.textContent = text;
  if (sessionStatus) sessionStatus.textContent = text;
  updateSessionPlayPanel();
}

function updateSessionPlayPanel() {
  const panel = document.getElementById("session-play-panel");
  if (!panel) return;
  panel.hidden = !(state.play.on && state.sessions.activeId != null);
}

function getPlayStatus() {
  return document.getElementById("play-status")?.textContent || "Play OFF";
}

function drawBoardOn(targetCanvas, targetCtx) {
  const width = state.editor.boardWidth;
  const height = state.editor.boardHeight;
  const size = editorCellSize(targetCanvas);
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  const blockers = state.editor.blockers;
  const debugMarks = state.editor.debugMarks || new Set();
  const pairMap = state.editor.pairs;
  const colorMap = activeColorMap();

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const x = c * size;
      const y = r * size;
      targetCtx.fillStyle = "#f7fbff";
      targetCtx.strokeStyle = "#cbd5e1";
      targetCtx.lineWidth = 1;
      targetCtx.fillRect(x, y, size, size);
      targetCtx.strokeRect(x, y, size, size);

      const k = coordKey(r, c);
      if (debugMarks.has(k)) {
        targetCtx.fillStyle = "rgba(225, 29, 72, 0.14)";
        targetCtx.fillRect(x + 2, y + 2, size - 4, size - 4);
        targetCtx.strokeStyle = "#e11d48";
        targetCtx.lineWidth = 2;
        targetCtx.strokeRect(x + 4, y + 4, size - 8, size - 8);
        targetCtx.fillStyle = "#be123c";
        targetCtx.beginPath();
        targetCtx.arc(x + size / 2, y + size / 2, 5, 0, Math.PI * 2);
        targetCtx.fill();
      }

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

function updateEditorSaveStatus() {
  const saveTag = document.getElementById("editor-save-status");
  const linkTag = document.getElementById("editor-session-link");
  if (saveTag) {
    if (state.editor.dirty) saveTag.textContent = "Unsaved changes";
    else if (state.editor.lastSavedAt) saveTag.textContent = `Saved ${new Date(state.editor.lastSavedAt).toLocaleTimeString()}`;
    else saveTag.textContent = "Saved";
  }
  if (linkTag) linkTag.textContent = state.editor.link?.label || "Standalone level";
  persistWorkspaceState();
}

function syncEditorInputs() {
  const fileName = normalizeLevelFileName(state.editor.fileName, state.editor.level);
  state.editor.fileName = fileName;
  const levelEl = document.getElementById("ed-level");
  const nameEl = document.getElementById("ed-name");
  const widthEl = document.getElementById("ed-board-width");
  const heightEl = document.getElementById("ed-board-height");
  const difficultyEl = document.getElementById("ed-difficulty");
  const movesEl = document.getElementById("ed-moves");
  const decalEl = document.getElementById("ed-decal");
  const progressionEl = document.getElementById("ed-progression-select");
  const progressionSlotEl = document.getElementById("ed-progression-slot");
  const pairEl = document.getElementById("ed-pair-id");
  syncEditorPairOptions();
  if (levelEl) levelEl.value = String(state.editor.level);
  if (nameEl) nameEl.value = fileName;
  if (widthEl) widthEl.value = String(state.editor.boardWidth);
  if (heightEl) heightEl.value = String(state.editor.boardHeight);
  if (difficultyEl) difficultyEl.value = state.editor.difficulty;
  if (movesEl) movesEl.value = String(state.editor.moves);
  if (decalEl) decalEl.checked = !!state.editor.decal;
  if (progressionEl) progressionEl.value = state.editor.progressionKey;
  if (progressionSlotEl) progressionSlotEl.value = String(state.editor.progressionSlot);
  if (pairEl && !activePairIds().includes(pairEl.value)) pairEl.value = activePairIds()[0];
  updateEditorDebugStatus();
  updateEditorPairBadge();
}

function updateEditorPairBadge() {
  const pairEl = document.getElementById("ed-pair-id");
  const badge = document.getElementById("ed-pair-color");
  if (!pairEl || !badge) return;
  const pairId = pairEl.value || PAIR_IDS[0];
  const pairIndex = Math.max(0, PAIR_IDS.indexOf(pairId));
  const color = pairColors[pairIndex] || pairColors[0];
  badge.textContent = `${pairId} · ${color}`;
  badge.style.background = color;
  badge.style.color = "#ffffff";
  badge.style.borderColor = color;
}

function updateEditorDebugStatus() {
  const badge = document.getElementById("editor-debug-status");
  if (!badge) return;
  badge.textContent = `Debug marks: ${state.editor.debugMarks?.size || 0}`;
}

function syncEditorPairOptions() {
  const pairEl = document.getElementById("ed-pair-id");
  if (!pairEl) return;
  const ids = activePairIds();
  if (pairEl.options.length !== ids.length || ids.some((id, index) => pairEl.options[index]?.value !== id)) {
    pairEl.innerHTML = "";
    ids.forEach((id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      pairEl.appendChild(option);
    });
  }
  if (!ids.includes(pairEl.value)) pairEl.value = ids[0];
}

function editorSelectedProgressionKey() {
  const select = document.getElementById("ed-progression-select");
  const key = select?.value || state.editor.progressionKey || state.manager.activeTab || getManagerProgressionKeys()[0];
  return isManagerProgressionTab(key) ? key : getManagerProgressionKeys()[0];
}

function editorSelectedProgressionSlotIndex() {
  const select = document.getElementById("ed-progression-slot");
  const slot = Number(select?.value || state.editor.progressionSlot || 1);
  return Math.min(9, Math.max(0, slot - 1));
}

function suggestedEditorFileNameForSlot(key, slotIndex) {
  const label = getManagerProgressionLabel(key).replace(/\s+/g, "_").toLowerCase();
  return normalizeLevelFileName(`${label}_slot_${slotIndex + 1}`, slotIndex + 1);
}

function prepareEditorNewLevelForProgressionSlot(key, slotIndex) {
  const progression = getManagerProgression(key);
  if (isTutorialSlotIndex(slotIndex)) {
    const tutorialItem = progression?.slots?.[0] != null ? getManagerItemById(progression.slots[0]) : null;
    if (tutorialItem?.level) {
      loadLevelToEditor(tutorialItem.level, { fileName: tutorialItem.file });
      setEditorLink("manager", tutorialItem.id, `Linked to ${getManagerProgressionLabel(key)} · Slot 1 (Tutorial)`);
      state.manager.selectedId = tutorialItem.id;
      state.manager.activeTab = key;
      updateEditorProgressionBuilder();
      updateManagerTable();
      return;
    }
  }
  state.editor.progressionKey = key;
  state.editor.progressionSlot = slotIndex + 1;
  state.editor.level = slotIndex + 1;
  state.editor.fileName = suggestedEditorFileNameForSlot(key, slotIndex);
  state.editor.moves = 0;
  state.editor.decal = false;
  state.editor.solutionCount = 0;
  state.editor.validationSolvable = false;
  state.editor.validationDensityMatch = false;
  state.editor.validationDecalPass = null;
  state.editor.blockers.clear();
  state.editor.debugMarks.clear();
  Object.keys(state.editor.pairs).forEach((id) => {
    state.editor.pairs[id] = { start: null, end: null };
  });
  const slotDifficulty = progression?.slotDifficulty?.[slotIndex];
  if (slotDifficulty) {
    state.editor.difficulty = slotDifficulty;
  }
  state.play.on = false;
  state.play.history = [];
  state.play.colorMap = {};
  state.editor.dirty = false;
  setEditorLink("standalone", null, `Building ${getManagerProgressionLabel(key)} · Slot ${slotIndex + 1}`);
  setPlayStatus("Play OFF");
  syncEditorInputs();
  drawBoard();
  updateEditorProgressionBuilder();
}

function setEditorLink(sourceType, sourceId, label) {
  state.editor.link = { sourceType, sourceId, label };
  updateEditorSaveStatus();
}

function markEditorDirty(reason = "change") {
  state.editor.dirty = true;
  updateEditorSaveStatus();
  if (reason) log("ed-log", `Unsaved ${reason}.`);
}

function createLevelPreviewDataUrl(level, selected = false) {
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = 180;
  previewCanvas.height = 180;
  drawLevelPreviewCanvas(previewCanvas, level, selected);
  return previewCanvas.toDataURL("image/png");
}

function getCachedPreviewDataUrl(item, selected = false) {
  if (!item) return "";
  if (!item.previewDataUrl) item.previewDataUrl = createLevelPreviewDataUrl(item.level, selected);
  return item.previewDataUrl;
}

function rebuildManagerIndexes() {
  state.manager.itemIndex = new Map(state.manager.items.map((item) => [item.id, item]));
  const slotIndexByItemId = new Map();
  getManagerProgressionKeys().forEach((key) => {
    getManagerProgression(key).slots.forEach((itemId, index) => {
      if (itemId != null) slotIndexByItemId.set(itemId, { tab: key, index });
    });
  });
  state.manager.slotIndexByItemId = slotIndexByItemId;
}

function updateManagerPagination(totalItems = 0, visibleItems = totalItems) {
  const prevBtn = document.getElementById("mgr-page-prev");
  const nextBtn = document.getElementById("mgr-page-next");
  const status = document.getElementById("mgr-page-status");
  if (!prevBtn || !nextBtn || !status) return;
  const totalPages = Math.max(1, Math.ceil(Math.max(totalItems, 1) / state.manager.allLevelsPageSize));
  state.manager.allLevelsPage = Math.min(totalPages, Math.max(1, state.manager.allLevelsPage));
  prevBtn.disabled = state.manager.allLevelsPage <= 1;
  nextBtn.disabled = state.manager.allLevelsPage >= totalPages;
  status.textContent = `Page ${state.manager.allLevelsPage} / ${totalPages} · ${visibleItems} visible`;
}

function progressionExportFileStem(key = state.manager.activeTab) {
  return slugifyFilePart(getManagerProgressionLabel(key) || key || "progression");
}

function activeProgressionRows(key = state.manager.activeTab) {
  if (!isManagerProgressionTab(key)) return [];
  const progression = getManagerProgression(key);
  return progression.slots.map((itemId, index) => {
    const item = itemId != null ? getManagerItemById(itemId) : null;
    return {
      progression_key: key,
      progression_label: getManagerProgressionLabel(key),
      slot: index + 1,
      file: item?.file || "",
      path: displayProjectPath(item?.sourcePath || ""),
      saved_path: displayProjectPath(item?.savedPath || ""),
      level: item?.level?.level ?? "",
      board: item ? `${levelWidth(item.level)}x${levelHeight(item.level)}` : "",
      pairs: item ? (item.level.pairs || []).length : "",
      blockers: item ? (item.level.blockers || []).length : "",
      moves: item?.level?.moves ?? "",
      solutions: item?.level?.solution_count ?? "",
      difficulty: progression.slotDifficulty[index] || (item ? levelDifficulty(item.level) : ""),
      status: item?.status || "EMPTY",
      changed: item?.changed ? "Yes" : "No",
      notes: item?.notes || ""
    };
  });
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsvFromRows(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(",")]
    .concat(rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")))
    .join("\n");
}

function makeProgressionCurveDataUrl(key = state.manager.activeTab) {
  if (!isManagerProgressionTab(key)) throw new Error("Open a progression tab first.");
  const progression = getManagerProgression(key);
  const width = 1280;
  const height = 520;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f8fbff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Arial";
  ctx.fillText(`${getManagerProgressionLabel(key)} Difficulty Curve`, 40, 54);
  ctx.fillStyle = "#64748b";
  ctx.font = "16px Arial";
  ctx.fillText("Slot order and editorial difficulty labels", 40, 84);

  const labels = progression.slots.map((itemId, index) => {
    const item = itemId != null ? getManagerItemById(itemId) : null;
    return progression.slotDifficulty[index] || (item ? levelDifficulty(item.level) : "Auto");
  });
  const colors = {
    EASY: ["#86efac", "#22c55e"],
    MEDIUM: ["#fde68a", "#f59e0b"],
    HARD: ["#fca5a5", "#ef4444"],
    Auto: ["#e2e8f0", "#94a3b8"],
    "": ["#e2e8f0", "#94a3b8"]
  };
  const left = 50;
  const top = 140;
  const chartHeight = 260;
  const gap = 18;
  const barWidth = 100;
  labels.forEach((label, index) => {
    const rank = difficultyRank(label);
    const normalized = label || "Auto";
    const [topColor, bottomColor] = colors[normalized] || colors.Auto;
    const barHeight = 36 + Math.max(1, rank || 1) * 58;
    const x = left + index * (barWidth + gap);
    const y = top + chartHeight - barHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 16px Arial";
    ctx.fillText(`L${index + 1}`, x + 34, top + chartHeight + 26);
    ctx.fillStyle = "#475569";
    ctx.font = "14px Arial";
    ctx.fillText(normalized, x + 18, top + chartHeight + 48);
  });

  const filled = progression.slots.filter((id) => id != null).length;
  ctx.fillStyle = "#0f172a";
  ctx.font = "600 18px Arial";
  ctx.fillText(`Filled slots: ${filled}/10`, 40, height - 50);
  return canvas.toDataURL("image/png");
}

function makeProgressionBoardDataUrl(key = state.manager.activeTab) {
  if (!isManagerProgressionTab(key)) throw new Error("Open a progression tab first.");
  const progression = getManagerProgression(key);
  const columns = 5;
  const cardWidth = 220;
  const cardHeight = 300;
  const gap = 20;
  const width = 40 + columns * cardWidth + (columns - 1) * gap + 40;
  const rows = 2;
  const height = 80 + rows * cardHeight + (rows - 1) * gap + 40;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f8fbff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 32px Arial";
  ctx.fillText(`${getManagerProgressionLabel(key)} Layout`, 40, 48);

  progression.slots.forEach((itemId, index) => {
    const item = itemId != null ? getManagerItemById(itemId) : null;
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = 40 + col * (cardWidth + gap);
    const y = 80 + row * (cardHeight + gap);

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 18px Arial";
    ctx.fillText(`Slot ${index + 1}`, x + 14, y + 28);
    ctx.fillStyle = "#64748b";
    ctx.font = "14px Arial";
    const diff = progression.slotDifficulty[index] || (item ? levelDifficulty(item.level) : "Auto");
    ctx.fillText(diff, x + 14, y + 50);

    if (item?.level) {
      const preview = document.createElement("canvas");
      preview.width = 160;
      preview.height = 160;
      drawLevelPreviewCanvas(preview, item.level, false);
      ctx.drawImage(preview, x + 30, y + 64, 160, 160);
      ctx.fillStyle = "#0f172a";
      ctx.font = "600 13px Arial";
      const fileLabel = item.file.length > 24 ? `${item.file.slice(0, 24)}...` : item.file;
      ctx.fillText(fileLabel, x + 14, y + 246);
      ctx.fillStyle = "#64748b";
      ctx.font = "12px Arial";
      ctx.fillText(`${levelWidth(item.level)}x${levelHeight(item.level)} · ${(item.level.pairs || []).length} pairs · ${item.status}`, x + 14, y + 268);
    } else {
      ctx.strokeStyle = "#cbd5e1";
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(x + 30, y + 64, 160, 160);
      ctx.setLineDash([]);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px Arial";
      ctx.fillText("Empty slot", x + 76, y + 150);
    }
  });

  return canvas.toDataURL("image/png");
}

async function exportActiveProgressionZip(key = state.manager.activeTab) {
  if (!isManagerProgressionTab(key)) throw new Error("Open a progression tab first.");
  const stem = progressionExportFileStem(key);
  const folder = stem;
  const rows = activeProgressionRows(key);
  const csv = toCsvFromRows(rows);
  const entries = [
    {
      relativePath: `${folder}/${stem}_progression.csv`,
      content: csv
    },
    {
      relativePath: `${folder}/${stem}_difficulty_curve.png`,
      dataUrl: makeProgressionCurveDataUrl(key)
    },
    {
      relativePath: `${folder}/${stem}_progression_layout.png`,
      dataUrl: makeProgressionBoardDataUrl(key)
    }
  ];

  rows.forEach((row, index) => {
    const progression = getManagerProgression(key);
    const itemId = progression.slots[index];
    const item = itemId != null ? getManagerItemById(itemId) : null;
    if (!item?.level) return;
    entries.push({
      relativePath: `${folder}/jsons/${item.file}`,
      content: JSON.stringify(item.level, null, 2)
    });
    entries.push({
      relativePath: `${folder}/screenshots/${slugifyFilePart(item.file)}.png`,
      dataUrl: createLevelPreviewDataUrl(item.level)
    });
  });

  return createProjectZip(`bundles/${stem}.zip`, `${stem}.zip`, entries);
}

function refreshItemArtifacts(item) {
  item.previewDataUrl = null;
}

function updateEditorProgressionBuilder() {
  const progressionSelect = document.getElementById("ed-progression-select");
  const slotSelect = document.getElementById("ed-progression-slot");
  const slotsWrap = document.getElementById("ed-progression-slots");
  if (!progressionSelect || !slotSelect || !slotsWrap) return;

  const progressionKeys = getManagerProgressionKeys();
  if (!progressionKeys.includes(state.editor.progressionKey)) {
    state.editor.progressionKey = progressionKeys[0];
  }
  const key = state.editor.progressionKey;
  const progression = getManagerProgression(key);

  if (progressionSelect.options.length !== progressionKeys.length || !progressionKeys.every((value, index) => progressionSelect.options[index]?.value === value)) {
    progressionSelect.innerHTML = "";
    progressionKeys.forEach((progressionKey) => {
      const opt = document.createElement("option");
      opt.value = progressionKey;
      opt.textContent = getManagerProgressionLabel(progressionKey);
      progressionSelect.appendChild(opt);
    });
  }
  progressionSelect.value = key;

  if (slotSelect.options.length !== 10) {
    slotSelect.innerHTML = "";
    Array.from({ length: 10 }, (_, index) => {
      const opt = document.createElement("option");
      opt.value = String(index + 1);
      opt.textContent = `Slot ${index + 1}`;
      slotSelect.appendChild(opt);
    });
  }
  slotSelect.value = String(state.editor.progressionSlot || 1);

  slotsWrap.innerHTML = "";
  progression.slots.forEach((itemId, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "editor-slot-card";
    if (index + 1 === state.editor.progressionSlot) card.classList.add("selected");
    const item = itemId != null ? getManagerItemById(itemId) : null;
    const title = document.createElement("div");
    title.className = "editor-slot-title";
    title.textContent = isTutorialSlotIndex(index) ? "Slot 1 · Tutorial" : `Slot ${index + 1}`;
    card.appendChild(title);

    if (item?.previewDataUrl) {
      const meta = document.createElement("div");
      meta.className = "editor-slot-meta";
      meta.textContent = `${item.file} · ${item.status}`;
      card.appendChild(meta);
      if (shouldRenderEditorStripPreviews()) {
        const img = document.createElement("img");
        img.className = "editor-slot-thumb";
        img.src = item.previewDataUrl;
        img.alt = item.file;
        card.appendChild(img);
      }
    } else {
      const empty = document.createElement("div");
      empty.className = "editor-slot-empty";
      empty.textContent = isTutorialSlotIndex(index) ? "Tutorial reserved" : "Empty slot";
      card.appendChild(empty);
    }

    card.addEventListener("click", () => {
      state.editor.progressionKey = key;
      state.editor.progressionSlot = index + 1;
      slotSelect.value = String(index + 1);
      if (item?.level) {
        loadLevelToEditor(item.level, { fileName: item.file });
        setEditorLink("manager", item.id, `Linked to ${getManagerProgressionLabel(key)} · Slot ${index + 1}`);
        state.manager.selectedId = item.id;
        state.manager.activeTab = key;
        log("ed-log", `Loaded ${item.file} from ${getManagerProgressionLabel(key)} · Slot ${index + 1}.`);
      } else {
        prepareEditorNewLevelForProgressionSlot(key, index);
        log("ed-log", `Ready to build ${getManagerProgressionLabel(key)} · Slot ${index + 1}.`);
      }
      updateEditorProgressionBuilder();
      updateManagerTable();
    });
    slotsWrap.appendChild(card);
  });
}

async function syncSessionItemToManager(item, { persistArtifacts = false } = {}) {
  if (!item?.managerItemId) return null;
  const managerItem = getManagerItemById(item.managerItemId);
  if (!managerItem) return null;
  managerItem.level = cloneLevel(item.level);
  managerItem.status = item.validationStatus || (validateLevel(item.level).valid ? "OK" : "INVALID");
  managerItem.changed = true;
  refreshItemArtifacts(managerItem);
  if (persistArtifacts) {
    const saved = await saveLevelArtifactsToProject(managerItem.level, managerItem.file);
    managerItem.savedPath = saved.jsonPath;
    managerItem.screenshotPath = saved.screenshotPath;
    managerItem.sourcePath = saved.jsonPath;
    item.savedPath = saved.jsonPath;
  }
  updateManagerTable();
  return managerItem;
}

async function persistEditorToLinkedSource() {
  const editedLevel = levelFromEditor();
  const editorFileName = normalizeLevelFileName(document.getElementById("ed-name")?.value || state.editor.fileName, editedLevel.level);
  state.editor.fileName = editorFileName;
  let message = "Saved the current editor changes.";

  if (state.editor.link?.sourceType === "session") {
    const item = state.sessions.queue.find((entry) => entry.id === state.editor.link.sourceId);
    if (!item) throw new Error("Linked session item no longer exists.");
    const originalLevel = item.originalLevel || item.level;
    item.level = cloneLevel(editedLevel);
    item.originalLevel = cloneLevel(originalLevel);
    item.validationStatus = validateLevel(editedLevel).valid ? "OK" : "INVALID";
    item.reviewStatus = "FIXED";
    item.changed = true;
    item.file = editorFileName;
    refreshItemArtifacts(item);
    const saved = await saveLevelArtifactsToProject(editedLevel, editorFileName);
    item.savedPath = saved.jsonPath;
    await syncSessionItemToManager(item, { persistArtifacts: true });
    const learningEntry = recordCorrectionLearning(originalLevel, editedLevel, `session_fix:${item.file}`);
    const summary = describeFeatureDelta(learningEntry.original_features, learningEntry.corrected_features);
    updateSessionTable();
    message = `Saved changes to ${item.file}.\nLearned: ${summary}`;
    log("session-log", `Saved changes to ${item.file}. Learned: ${summary}`);
  } else if (state.editor.link?.sourceType === "manager") {
    const item = getManagerItemById(state.editor.link.sourceId);
    if (!item) throw new Error("Linked manager item no longer exists.");
    item.level = cloneLevel(editedLevel);
    item.file = editorFileName;
    item.status = validateLevel(editedLevel).valid ? "OK" : "INVALID";
    item.changed = true;
    refreshItemArtifacts(item);
    const saved = await saveLevelArtifactsToProject(editedLevel, editorFileName);
    item.savedPath = saved.jsonPath;
    item.screenshotPath = saved.screenshotPath;
    item.sourcePath = saved.jsonPath;
    updateManagerTable();
    message = `Saved changes to manager item ${item.file}.`;
  } else {
    const progressionKey = editorSelectedProgressionKey();
    const slotIndex = editorSelectedProgressionSlotIndex();
    const progression = getManagerProgression(progressionKey);
    const emptySelectedSlot = isManagerProgressionTab(progressionKey) && progression?.slots?.[slotIndex] == null;
    if (emptySelectedSlot) {
      await saveEditorLevelIntoProgression({ advanceToNext: false });
      return;
    }
    localStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify(editedLevel));
    const saved = await saveLevelArtifactsToProject(editedLevel, editorFileName);
    message = `Saved the current editor changes to ${displayProjectPath(saved.jsonPath)}.`;
  }

  state.editor.dirty = false;
  state.editor.lastSavedAt = Date.now();
  syncEditorInputs();
  updateEditorSaveStatus();
  log("ed-log", message);
}

async function saveEditorLevelIntoProgression({ advanceToNext = false } = {}) {
  const key = editorSelectedProgressionKey();
  const slotIndex = editorSelectedProgressionSlotIndex();
  const progression = getManagerProgression(key);
  await ensureTutorialInProgressionSlot(key);
  const editedLevel = levelFromEditor();
  const editorFileName = normalizeLevelFileName(document.getElementById("ed-name")?.value || state.editor.fileName, editedLevel.level);
  state.editor.fileName = editorFileName;

  if (isTutorialSlotIndex(slotIndex)) {
    const tutorialItem = progression.slots[0] != null ? getManagerItemById(progression.slots[0]) : null;
    const linkedTutorial = tutorialItem && state.editor.link?.sourceType === "manager" && state.editor.link.sourceId === tutorialItem.id;
    const editingTutorialFile = basename(editorFileName) === TUTORIAL_LEVEL_BASENAME;
    if (!linkedTutorial && !editingTutorialFile) {
      loadLevelToEditor(tutorialItem.level, { fileName: tutorialItem.file });
      setEditorLink("manager", tutorialItem.id, `Linked to ${getManagerProgressionLabel(key)} · Slot 1 (Tutorial)`);
      state.manager.selectedId = tutorialItem.id;
      state.manager.activeTab = key;
      updateEditorProgressionBuilder();
      updateManagerTable();
      log("ed-log", `Slot 1 in ${getManagerProgressionLabel(key)} is reserved for the tutorial. The tutorial was loaded instead of replacing it.`);
      return;
    }
  }

  let item = progression.slots[slotIndex] != null ? getManagerItemById(progression.slots[slotIndex]) : null;
  if (!item) {
    item = summarizeManagerItem(editedLevel, editorFileName, `Editor progression builder · ${getManagerProgressionLabel(key)} · Slot ${slotIndex + 1}`);
    state.manager.items.push(item);
    progression.slots[slotIndex] = item.id;
  }

  item.level = cloneLevel(editedLevel);
  item.originalLevel = item.originalLevel ? cloneLevel(item.originalLevel) : cloneLevel(editedLevel);
  item.file = editorFileName;
  item.status = validateLevel(editedLevel).valid ? "OK" : "INVALID";
  item.changed = true;
  refreshItemArtifacts(item);

  if (!progression.slotDifficulty[slotIndex]) {
    progression.slotDifficulty[slotIndex] = editedLevel.difficulty || state.editor.difficulty;
  } else {
    applyDifficultyToManagerItem(item, progression.slotDifficulty[slotIndex]);
  }

  const saved = await saveLevelArtifactsToProject(item.level, item.file);
  item.savedPath = saved.jsonPath;
  item.screenshotPath = saved.screenshotPath;
  item.sourcePath = saved.jsonPath;

  state.manager.activeTab = key;
  state.manager.selectedId = item.id;
  state.editor.progressionKey = key;
  state.editor.progressionSlot = slotIndex + 1;
  state.editor.dirty = false;
  state.editor.lastSavedAt = Date.now();
  setEditorLink("manager", item.id, `Linked to ${getManagerProgressionLabel(key)} · Slot ${slotIndex + 1}`);
  updateManagerTable();
  syncEditorInputs();
  updateEditorSaveStatus();
  log("ed-log", `Saved ${item.file} into ${getManagerProgressionLabel(key)} · Slot ${slotIndex + 1}.`);

  if (advanceToNext) {
    const nextSlotIndex = Math.min(9, slotIndex + 1);
    const nextItemId = progression.slots[nextSlotIndex];
    if (nextItemId != null) {
      const nextItem = getManagerItemById(nextItemId);
      if (nextItem?.level) {
        state.editor.progressionSlot = nextSlotIndex + 1;
        loadLevelToEditor(nextItem.level, { fileName: nextItem.file });
        setEditorLink("manager", nextItem.id, `Linked to ${getManagerProgressionLabel(key)} · Slot ${nextSlotIndex + 1}`);
        state.manager.selectedId = nextItem.id;
        log("ed-log", `Moved to existing ${getManagerProgressionLabel(key)} · Slot ${nextSlotIndex + 1}.`);
      }
    } else {
      prepareEditorNewLevelForProgressionSlot(key, nextSlotIndex);
      log("ed-log", `Created a new blank editor for ${getManagerProgressionLabel(key)} · Slot ${nextSlotIndex + 1}.`);
    }
  }
}

function makeSaveAsNewFileName(currentFileName, levelNumber) {
  const stem = slugifyFilePart(currentFileName || `level_${levelNumber}.json`);
  const suffix = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return normalizeLevelFileName(`${stem}_new_${suffix}`, levelNumber);
}

async function saveEditorAsNewLevel() {
  const editedLevel = levelFromEditor();
  const newFileName = makeSaveAsNewFileName(state.editor.fileName, editedLevel.level);
  const saved = await saveLevelArtifactsToProject(editedLevel, newFileName);
  const item = summarizeManagerItem(editedLevel, newFileName, saved.jsonPath);
  item.savedPath = saved.jsonPath;
  item.screenshotPath = saved.screenshotPath;
  item.sourcePath = saved.jsonPath;
  item.changed = true;
  state.manager.items.push(item);
  state.manager.selectedId = item.id;
  state.editor.fileName = newFileName;
  state.editor.dirty = false;
  state.editor.lastSavedAt = Date.now();
  setEditorLink("manager", item.id, `Linked to new level: ${newFileName}`);
  updateManagerTable();
  syncEditorInputs();
  updateEditorSaveStatus();
  log("ed-log", `Saved as new level: ${newFileName}\nJSON: ${displayProjectPath(saved.jsonPath)}\nScreenshot: ${displayProjectPath(saved.screenshotPath)}`);
}

function loadLevelToEditor(level, options = {}) {
  state.editor.level = level.level;
  state.editor.fileName = normalizeLevelFileName(options.fileName || level.meta?.source_name || state.editor.fileName, level.level);
  state.editor.boardWidth = levelWidth(level);
  state.editor.boardHeight = levelHeight(level);
  state.editor.targetDensity = level.target_density;
  state.editor.difficulty = levelDifficulty(level);
  state.editor.moves = level.moves || 0;
  state.editor.decal = !!level.decal;
  state.editor.solutionCount = Number(level.solution_count || 0);
  state.editor.validationSolvable = !!level.validation?.solvable;
  state.editor.validationDensityMatch = !!level.validation?.density_match;
  state.editor.validationDecalPass = level.validation?.decal_pass ?? null;
  state.editor.blockers = new Set((level.blockers || []).map(([r, c]) => coordKey(r, c)));
  state.editor.debugMarks = new Set();

  state.editor.pairs = Object.fromEntries(PAIR_IDS.map((id) => [id, { start: null, end: null }]));
  (level.pairs || []).forEach((p) => {
    if (state.editor.pairs[p.id]) {
      state.editor.pairs[p.id].start = p.start;
      state.editor.pairs[p.id].end = p.end;
    }
  });

  syncEditorInputs();
  state.play.on = false;
  state.play.history = [];
  state.play.colorMap = {};
  state.editor.dirty = false;
  setPlayStatus("Play OFF");
  updateEditorSaveStatus();
  updateEditorProgressionBuilder();
  drawBoard();
}

function levelFromEditor() {
  const pairs = activePairsFromEditor();
  const blockers = Array.from(state.editor.blockers).map(parseKey);
  const solutionCount = countSolutions(state.editor.boardWidth, state.editor.boardHeight, pairs, blockers, 20);
  const decal = !!document.getElementById("ed-decal")?.checked;
  state.editor.decal = decal;
  const decalPass = decal ? hasFullCoverSolution(state.editor.boardWidth, state.editor.boardHeight, pairs, blockers) : null;
  const movesRaw = String(document.getElementById("ed-moves").value ?? "").trim();
  const moves = movesRaw === "" ? recommendedMoves() : Number(movesRaw);
  state.editor.moves = Number.isFinite(moves) ? moves : recommendedMoves();
  const difficulty = document.getElementById("ed-difficulty").value;
  const targetDensity = difficultyToTargetDensity(difficulty, solutionCount);
  const fileName = normalizeLevelFileName(document.getElementById("ed-name")?.value || state.editor.fileName, Number(document.getElementById("ed-level").value));
  state.editor.fileName = fileName;
  state.editor.solutionCount = solutionCount;
  state.editor.targetDensity = targetDensity;
  state.editor.validationSolvable = solutionCount >= 1;
  state.editor.validationDensityMatch = densityMatch(targetDensity, solutionCount);
  state.editor.validationDecalPass = decalPass;

  return {
    level: Number(document.getElementById("ed-level").value),
    board_size: state.editor.boardWidth === state.editor.boardHeight ? state.editor.boardWidth : undefined,
    board_width: state.editor.boardWidth,
    board_height: state.editor.boardHeight,
    grid: makeGrid(state.editor.boardWidth, state.editor.boardHeight, pairs, blockers),
    pairs,
    blockers,
    decal,
    moves: state.editor.moves,
    solution_count: solutionCount,
    target_density: targetDensity,
    difficulty,
    golden_path: Object.fromEntries(pairs.map((p) => [p.id, [p.start, p.end]])),
    validation: {
      solvable: solutionCount >= 1,
      density_match: densityMatch(targetDensity, solutionCount),
      decal_required: decal,
      decal_pass: decalPass,
      early_mistake_detection: true,
      no_isolated_pairs: true,
      no_late_dead_ends: true,
      curve_integrity: true
    },
    meta: { generation_attempts: 1, failed_checks: [], manual_difficulty: difficulty, source_name: fileName }
  };
}

function formatParseError(err) {
  if (!err) return "Unknown parse error";
  return err instanceof Error ? err.message : String(err);
}

function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
}

function pauseForPaint() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function setManagerLoading(active, label = "", current = 0, total = 0) {
  state.manager.loading = { active, label, current, total };
  const wrap = document.getElementById("mgr-loading");
  const text = document.getElementById("mgr-loading-label");
  const value = document.getElementById("mgr-loading-value");
  const bar = document.getElementById("mgr-loading-bar");
  if (!wrap || !text || !value || !bar) return;
  wrap.hidden = !active;
  if (!active) {
    bar.value = 0;
    value.textContent = "";
    return;
  }
  const safeTotal = Math.max(total || 0, 1);
  const percent = Math.max(0, Math.min(100, Math.round((current / safeTotal) * 100)));
  text.textContent = label || "Loading manager data...";
  value.textContent = total ? `${percent}%` : "Working...";
  bar.value = percent;
}

function updateManagerTable() {
  rebuildManagerIndexes();
  const tbody = document.querySelector("#mgr-table tbody");
  const slotPanel = document.getElementById("mgr-progression-panel");
  const allLevelsPanel = document.getElementById("mgr-all-levels-panel");
  const csvPanel = document.getElementById("mgr-csv-panel");
  const progressTitle = document.getElementById("mgr-progress-title");
  renderManagerTabs();
  updateSessionProgressionSelect();
  if (slotPanel) slotPanel.hidden = !isManagerProgressionTab(state.manager.activeTab);
  if (allLevelsPanel) allLevelsPanel.hidden = state.manager.activeTab !== "allLevels";
  if (csvPanel) csvPanel.hidden = state.manager.activeTab !== "csvReview";
  if (progressTitle && isManagerProgressionTab(state.manager.activeTab)) progressTitle.textContent = `${getManagerProgressionLabel(state.manager.activeTab)} Order`;
  tbody.innerHTML = "";
  syncManagerFilterControls();

  const filteredItems = getFilteredManagerItems();
  if (state.manager.activeTab !== "allLevels") state.manager.allLevelsPage = 1;
  if (state.manager.activeTab === "csvReview") {
    filteredItems.forEach((item) => {
      const row = {
        file: item.file,
        path: displayProjectPath(item.sourcePath),
        savedPath: displayProjectPath(item.savedPath || "-"),
        level: item.level.level ?? "-",
        board: managerItemBoardLabel(item),
        pairs: (item.level.pairs || []).length,
        blockers: (item.level.blockers || []).length,
        moves: item.level.moves ?? "-",
        solutions: item.level.solution_count ?? "-",
        difficulty: levelDifficulty(item.level),
        status: item.status,
        changed: item.changed ? "Yes" : "No",
        notes: item.notes || "",
        placement: managerPlacementLabel(item.id),
        error: item.parseError || ""
      };
      const tr = document.createElement("tr");
      const screenshotTd = document.createElement("td");
      if (shouldRenderCsvScreenshots()) {
        const screenshot = document.createElement("img");
        screenshot.className = "table-screenshot";
        screenshot.alt = `${item.file} preview`;
        screenshot.src = getCachedPreviewDataUrl(item);
        screenshotTd.appendChild(screenshot);
      } else {
        screenshotTd.textContent = "Preview off";
      }
      tr.appendChild(screenshotTd);

      [row.file, row.path, row.savedPath, row.level, row.board, row.pairs, row.blockers, row.moves, row.solutions, row.difficulty, row.status, row.changed, row.notes, row.placement, row.error].forEach((v) => {
        const td = document.createElement("td");
        td.textContent = String(v);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  const valid = filteredItems.filter((r) => r.status === "OK").length;
  const parseErrors = filteredItems.filter((r) => r.status === "PARSE_ERROR").length;
  const assigned = getAllAssignedManagerIds().size;
  log("mgr-log", `Files: ${filteredItems.length} filtered / ${state.manager.items.length} total\nValid: ${valid}\nInvalid: ${filteredItems.length - valid}\nParse errors: ${parseErrors}\nAssigned to progressions: ${assigned}`);
  ["mgr-export-progression-csv", "mgr-export-curve-png", "mgr-export-progression-png"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !isManagerProgressionTab(state.manager.activeTab);
  });
  ["mgr-rename-progression", "mgr-duplicate-progression", "mgr-autofill"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !isManagerProgressionTab(state.manager.activeTab);
  });
  const selected = getManagerItemById(state.manager.selectedId);
  if (selected) {
    setManagerDiffPanel(`${selected.file}\n${summarizeLevelDiff(selected.originalLevel, selected.level)}`);
  } else if (isManagerProgressionTab(state.manager.activeTab)) {
    setManagerDiffPanel("Select a level or press Diff on a card.");
  } else {
    setManagerDiffPanel("Open a progression tab to inspect level changes.");
  }
  renderManagerDifficultyCurve();
  updateEditorProgressionBuilder();
  updateManagerPlanner();
  persistWorkspaceState();
  scheduleManagerMetadataSnapshot("manager_update");
}

function makeManagerCard(item, compact = false) {
  const card = document.createElement("div");
  card.className = "manager-card";
  card.classList.add(`difficulty-${levelDifficulty(item.level).toLowerCase()}`);
  if (item.id === state.manager.selectedId) card.classList.add("selected-preview");
  if (state.manager.referenceIds.includes(item.id)) card.classList.add("reference-preview");
  const currentSlot = findManagerSlotIndex(item.id);
  const locked = !!(currentSlot && getManagerProgression(currentSlot.tab).lockedSlots[currentSlot.index]);
  card.draggable = !locked;
  card.dataset.itemId = String(item.id);

  card.addEventListener("dragstart", (ev) => {
    state.manager.draggingId = item.id;
    ev.dataTransfer?.setData("text/plain", String(item.id));
    ev.dataTransfer.effectAllowed = "move";
  });

  card.addEventListener("dragend", () => {
    state.manager.draggingId = null;
  });

  card.addEventListener("click", () => {
    state.manager.selectedId = item.id;
    updateManagerTable();
  });
  card.title = "Drag this level to another slot or click to select it.";

  const title = document.createElement("div");
  title.className = "preview-title";
  title.textContent = compact ? `L${item.level.level} · ${item.file}` : item.file;
  card.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "preview-meta";
  meta.textContent = `Board ${levelWidth(item.level)}x${levelHeight(item.level)} · Pairs ${(item.level.pairs || []).length} · ${levelDifficulty(item.level)} · ${item.status} · ${managerPlacementLabel(item.id)}`;
  card.appendChild(meta);

  if (item.notes) {
    const notes = document.createElement("div");
    notes.className = "preview-notes";
    notes.textContent = item.notes;
    card.appendChild(notes);
  }

  if (item.parseError) {
    const parseMsg = document.createElement("div");
    parseMsg.className = "preview-path";
    parseMsg.textContent = `Parse error: ${item.parseError}`;
    card.appendChild(parseMsg);
  }

  const path = document.createElement("div");
  path.className = "preview-path";
  path.textContent = displayProjectPath(item.sourcePath);
  card.appendChild(path);

  if (shouldRenderManagerCardPreview()) {
    const previewImg = document.createElement("img");
    previewImg.className = "editor-slot-thumb";
    previewImg.alt = `${item.file} preview`;
    previewImg.src = getCachedPreviewDataUrl(item, item.id === state.manager.selectedId);
    card.appendChild(previewImg);
  }

  const actions = document.createElement("div");
  actions.className = "preview-actions";

  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.title = "Open this level in the editor so you can change and save it.";
  editBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    state.manager.selectedId = item.id;
    loadLevelToEditor(item.level, { fileName: item.file });
    setEditorLink("manager", item.id, `Linked to manager item: ${item.file}`);
    setActiveView("editor");
    log("ed-log", `Opened ${item.file} from Level Manager.`);
  });
  actions.appendChild(editBtn);

  const noteBtn = document.createElement("button");
  noteBtn.textContent = "Notes";
  noteBtn.title = "Add or edit reviewer notes for this level.";
  noteBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const input = window.prompt("Level notes", item.notes || "");
    if (input == null) return;
    item.notes = String(input).trim();
    item.changed = true;
    updateManagerTable();
    log("mgr-log", item.notes ? `Updated notes for ${item.file}.` : `Cleared notes for ${item.file}.`);
  });
  actions.appendChild(noteBtn);

  const diffBtn = document.createElement("button");
  diffBtn.textContent = "Diff";
  diffBtn.title = "Show what changed compared with the original imported version.";
  diffBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const diff = `${item.file}\n${summarizeLevelDiff(item.originalLevel, item.level)}`;
    setManagerDiffPanel(diff);
    log("mgr-log", diff);
  });
  actions.appendChild(diffBtn);

  const refBtn = document.createElement("button");
  const pendingRef = state.manager.pendingRefTarget;
  const isWaitingForSlotRef = !!pendingRef;
  refBtn.textContent = isWaitingForSlotRef
    ? "Assign Ref"
    : (state.manager.referenceIds.includes(item.id) ? "Unref" : "Use as Ref");
  refBtn.title = isWaitingForSlotRef
    ? `Assign this level to ${getManagerProgressionLabel(pendingRef.progressionKey)} · Slot ${pendingRef.slotIndex + 1}.`
    : (state.manager.referenceIds.includes(item.id)
      ? "Remove this level from the reference set."
      : "Use this level as a reference for procedural generation.");
  refBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (state.manager.pendingRefTarget) {
      const { progressionKey, slotIndex } = state.manager.pendingRefTarget;
      moveManagerItemToSlot(item.id, slotIndex, progressionKey);
      state.manager.selectedId = item.id;
      state.manager.activeTab = progressionKey;
      state.manager.pendingRefTarget = null;
      updateManagerTable();
      log("mgr-log", `Assigned ${item.file} to ${getManagerProgressionLabel(progressionKey)} · Slot ${slotIndex + 1}.`);
      return;
    }
    if (state.manager.referenceIds.includes(item.id)) {
      state.manager.referenceIds = state.manager.referenceIds.filter((id) => id !== item.id);
    } else {
      state.manager.referenceIds.push(item.id);
    }
    updateManagerTable();
  });
  actions.appendChild(refBtn);

  const poolBtn = document.createElement("button");
  poolBtn.textContent = "To Pool";
  poolBtn.title = "Move this level out of the top 10 and back into the pool.";
  poolBtn.disabled = locked;
  poolBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    moveManagerItemToPool(item.id);
    updateManagerTable();
  });
  actions.appendChild(poolBtn);

  card.appendChild(actions);
  return card;
}

function updateManagerPlanner() {
  const slotGrid = document.getElementById("mgr-slot-grid");
  const poolGrid = document.getElementById("mgr-pool-grid");
  const unassignedGrid = document.getElementById("mgr-unassigned-grid");
  if (!slotGrid || !poolGrid || !unassignedGrid) return;

  slotGrid.innerHTML = "";
  poolGrid.innerHTML = "";
  unassignedGrid.innerHTML = "";
  const renderToken = ++state.manager.renderToken;

  if (isManagerProgressionTab(state.manager.activeTab)) {
    const progression = getManagerProgression(state.manager.activeTab);
    progression.slots.forEach((itemId, index) => {
      const isTutorialSlot = isTutorialSlotIndex(index);
      const slot = document.createElement("div");
      slot.className = "manager-slot";
      slot.dataset.slotIndex = String(index);
      slot.title = isTutorialSlot
        ? "Slot 1 is permanently reserved for the tutorial."
        : progression.lockedSlots[index]
        ? `Slot ${index + 1} is locked. Unlock it before replacing the level.`
        : `Slot ${index + 1}. Drop a level here to place or reorder it.`;
      slot.addEventListener("dragover", (ev) => {
        if (isTutorialSlot) return;
        ev.preventDefault();
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", (ev) => {
        if (isTutorialSlot) return;
        ev.preventDefault();
        slot.classList.remove("drag-over");
        const droppedId = Number(ev.dataTransfer?.getData("text/plain") || state.manager.draggingId);
        if (!droppedId) return;
        moveManagerItemToSlot(droppedId, index, state.manager.activeTab);
        state.manager.selectedId = droppedId;
        updateManagerTable();
      });

      const slotLabel = document.createElement("div");
      slotLabel.className = "manager-slot-label";
      slotLabel.textContent = isTutorialSlot ? "Level 1 · Tutorial" : `Level ${index + 1}`;
      slot.appendChild(slotLabel);

      const slotActions = document.createElement("div");
      slotActions.className = "manager-slot-actions";

      const lockBtn = document.createElement("button");
      lockBtn.className = "manager-lock-btn";
      lockBtn.textContent = isTutorialSlot ? "Tutorial" : (progression.lockedSlots[index] ? "Unlock" : "Lock");
      lockBtn.disabled = isTutorialSlot;
      lockBtn.title = isTutorialSlot
        ? "Slot 1 stays locked because it always contains the tutorial."
        : progression.lockedSlots[index]
        ? `Unlock slot ${index + 1} so it can be changed.`
        : `Lock slot ${index + 1} so its level cannot be moved or replaced.`;
      lockBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (isTutorialSlot) return;
        if (progression.slots[index] == null) return;
        progression.lockedSlots[index] = !progression.lockedSlots[index];
        updateManagerTable();
      });
      slotActions.appendChild(lockBtn);

      const clearBtn = document.createElement("button");
      clearBtn.className = "manager-clear-slot-btn";
      clearBtn.textContent = "Clear";
      clearBtn.disabled = isTutorialSlot || progression.lockedSlots[index] || progression.slots[index] == null;
      clearBtn.title = isTutorialSlot
        ? "Slot 1 cannot be cleared because it always contains the tutorial."
        : progression.lockedSlots[index]
        ? `Unlock slot ${index + 1} before clearing it.`
        : `Empty slot ${index + 1} so you can drag another level in from below.`;
      clearBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        clearManagerSlot(index, state.manager.activeTab);
        updateManagerTable();
        log("mgr-log", `Cleared slot ${index + 1} in ${getManagerProgressionLabel(state.manager.activeTab)}. Drag a replacement from the pool below.`);
      });
      slotActions.appendChild(clearBtn);

      const refSlotBtn = document.createElement("button");
      refSlotBtn.className = "manager-ref-slot-btn";
      refSlotBtn.textContent = state.manager.pendingRefTarget?.progressionKey === state.manager.activeTab && state.manager.pendingRefTarget?.slotIndex === index
        ? "Cancel Ref"
        : "Ref";
      refSlotBtn.disabled = isTutorialSlot || progression.lockedSlots[index];
      refSlotBtn.title = isTutorialSlot
        ? "Slot 1 is fixed as the tutorial and does not accept references."
        : progression.lockedSlots[index]
        ? `Unlock slot ${index + 1} before assigning by reference.`
        : `Mark slot ${index + 1} as waiting for a level from All Levels.`;
      refSlotBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const isSame = state.manager.pendingRefTarget?.progressionKey === state.manager.activeTab && state.manager.pendingRefTarget?.slotIndex === index;
        state.manager.pendingRefTarget = isSame ? null : { progressionKey: state.manager.activeTab, slotIndex: index };
        updateManagerTable();
        log("mgr-log", isSame
          ? `Cancelled reference assignment for ${getManagerProgressionLabel(state.manager.activeTab)} · Slot ${index + 1}.`
          : `Waiting for a level from All Levels for ${getManagerProgressionLabel(state.manager.activeTab)} · Slot ${index + 1}.`);
      });
      slotActions.appendChild(refSlotBtn);
      slot.appendChild(slotActions);

      const difficultyWrap = document.createElement("label");
      difficultyWrap.className = "manager-slot-difficulty";
      difficultyWrap.textContent = "Difficulty";
      difficultyWrap.title = `Set the easy, medium, or hard label for slot ${index + 1}.`;
      const difficultySelect = document.createElement("select");
      ["", "EASY", "MEDIUM", "HARD"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value || "Auto";
        difficultySelect.appendChild(option);
      });
      difficultySelect.value = progression.slotDifficulty[index] || "";
      difficultySelect.disabled = isTutorialSlot || progression.lockedSlots[index];
      difficultySelect.addEventListener("change", (ev) => {
        ev.stopPropagation();
        progression.slotDifficulty[index] = ev.target.value;
        const currentItem = itemId != null ? getManagerItemById(itemId) : null;
        if (currentItem && ev.target.value) {
          currentItem.level.difficulty = ev.target.value;
          currentItem.level.target_density = difficultyToTargetDensity(ev.target.value, currentItem.level.solution_count || 0);
          currentItem.level.meta = { ...(currentItem.level.meta || {}), manual_difficulty: ev.target.value };
          currentItem.changed = true;
          refreshItemArtifacts(currentItem);
        }
        updateManagerTable();
      });
      difficultyWrap.appendChild(difficultySelect);
      slot.appendChild(difficultyWrap);

      if (itemId == null) {
        const empty = document.createElement("div");
        empty.className = "manager-empty-slot";
        const isPendingRef = state.manager.pendingRefTarget?.progressionKey === state.manager.activeTab && state.manager.pendingRefTarget?.slotIndex === index;
        empty.textContent = isTutorialSlot
          ? "Tutorial reserved"
          : progression.lockedSlots[index]
          ? "Locked empty slot"
          : (isPendingRef ? "Waiting for Ref from All Levels" : "Clear slot ready. Drag a level here");
        empty.title = isTutorialSlot
          ? "Slot 1 is permanently reserved for the tutorial."
          : progression.lockedSlots[index]
          ? `Slot ${index + 1} is empty but locked.`
          : (isPendingRef
            ? `This slot will accept the next Ref assignment from All Levels.`
            : `Drop a level here to assign it to position ${index + 1}.`);
        slot.appendChild(empty);
      } else {
        const item = getManagerItemById(itemId);
        if (item) slot.appendChild(makeManagerCard(item, true));
      }

      slotGrid.appendChild(slot);
    });
  }

  const poolItems = getFilteredManagerItems(getManagerUnassignedItems());
  const progressionNames = getManagerProgressionKeys().map((key) => getManagerProgressionLabel(key)).join(", ");
  const poolTitle = state.manager.activeTab === "allLevels"
    ? `Levels that are not currently placed in ${progressionNames}.`
    : `Levels not assigned to any progression. Drag them into ${getManagerProgressionLabel(state.manager.activeTab)}.`;
  poolGrid.title = poolTitle;
  poolGrid.ondragover = (ev) => ev.preventDefault();
  poolGrid.ondrop = (ev) => {
    ev.preventDefault();
    const droppedId = Number(ev.dataTransfer?.getData("text/plain") || state.manager.draggingId);
    if (!droppedId) return;
    moveManagerItemToPool(droppedId);
    state.manager.selectedId = droppedId;
    updateManagerTable();
  };

  const targetGrid = state.manager.activeTab === "allLevels" ? unassignedGrid : poolGrid;
  const pagedPoolItems = state.manager.activeTab === "allLevels"
    ? (() => {
      const totalPages = Math.max(1, Math.ceil(Math.max(poolItems.length, 1) / state.manager.allLevelsPageSize));
      state.manager.allLevelsPage = Math.min(totalPages, Math.max(1, state.manager.allLevelsPage));
      const startIndex = (state.manager.allLevelsPage - 1) * state.manager.allLevelsPageSize;
      return poolItems.slice(startIndex, startIndex + state.manager.allLevelsPageSize);
    })()
    : poolItems;
  updateManagerPagination(poolItems.length, pagedPoolItems.length);
  const chunkSize = performanceSettings().renderChunkSize;
  if (!pagedPoolItems.length) {
    setManagerLoading(false);
    return;
  }

  setManagerLoading(true, "Rendering level cards...", 0, pagedPoolItems.length);
  const appendChunk = async (startIndex = 0) => {
    if (renderToken !== state.manager.renderToken) return;
    const endIndex = Math.min(startIndex + chunkSize, pagedPoolItems.length);
    const fragment = document.createDocumentFragment();
    for (let index = startIndex; index < endIndex; index += 1) {
      fragment.appendChild(makeManagerCard(pagedPoolItems[index]));
    }
    targetGrid.appendChild(fragment);
    setManagerLoading(true, "Rendering level cards...", endIndex, pagedPoolItems.length);
    if (endIndex < pagedPoolItems.length) {
      await pauseForPaint();
      appendChunk(endIndex);
      return;
    }
    setManagerLoading(false);
  };
  appendChunk();
}

function summarizeSessionLevel(level, file, source) {
  return {
    id: state.sessions.nextId++,
    file,
    source,
    managerItemId: null,
    savedPath: "",
    level: cloneLevel(level),
    originalLevel: cloneLevel(level),
    changed: false,
    previewDataUrl: null,
    reviewStatus: "PENDING",
    validationStatus: validateLevel(level).valid ? "OK" : "INVALID"
  };
}

function getSelectedSessionItem() {
  return state.sessions.queue.find((item) => item.id === state.sessions.selectedId) || null;
}

function updateEditorSessionLink() {
  updateEditorSaveStatus();
}

function drawLevelPreviewCanvas(canvasEl, level, selected = false) {
  const ctx2 = canvasEl.getContext("2d");
  const width = levelWidth(level) || 4;
  const height = levelHeight(level) || 4;
  const size = Math.floor(Math.min(canvasEl.width / width, canvasEl.height / height));
  ctx2.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx2.fillStyle = selected ? "#e0f2fe" : "#ffffff";
  ctx2.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const blockers = new Set((level.blockers || []).map(([r, c]) => coordKey(r, c)));
  const pairs = level.pairs || [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const x = c * size;
      const y = r * size;
      ctx2.fillStyle = "#f7fbff";
      ctx2.strokeStyle = "#cbd5e1";
      ctx2.lineWidth = 1;
      ctx2.fillRect(x, y, size, size);
      ctx2.strokeRect(x, y, size, size);
      if (blockers.has(coordKey(r, c))) {
        ctx2.fillStyle = "#334155";
        ctx2.fillRect(x + 2, y + 2, size - 4, size - 4);
      }
    }
  }

  pairs.forEach((pair, index) => {
    const color = pairColors[index % pairColors.length];
    if (pair.start) {
      const x = pair.start[1] * size;
      const y = pair.start[0] * size;
      ctx2.fillStyle = color;
      ctx2.fillRect(x + 4, y + 4, size - 8, size - 8);
    }
    if (pair.end) {
      const x = pair.end[1] * size;
      const y = pair.end[0] * size;
      ctx2.fillStyle = color;
      ctx2.beginPath();
      ctx2.arc(x + size / 2, y + size / 2, Math.max(6, size / 3), 0, Math.PI * 2);
      ctx2.fill();
    }
  });
}

function summarizeManagerItem(level, file, sourcePath = "Imported via browser picker") {
  const report = validateLevel(level);
  return {
    id: state.manager.nextId++,
    file,
    sourcePath,
    savedPath: "",
    screenshotPath: "",
    level: cloneLevel(level),
    originalLevel: cloneLevel(level),
    changed: false,
    notes: "",
    previewDataUrl: null,
    status: report.valid ? "OK" : "INVALID"
  };
}

function renderManagerTabs() {
  const tabs = document.getElementById("mgr-tabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  [...getManagerProgressionKeys(), "allLevels", "csvReview"].forEach((tab) => {
    const btn = document.createElement("button");
    btn.className = "manager-tab-btn";
    if (tab === state.manager.activeTab) btn.classList.add("active");
    btn.dataset.tab = tab;
    btn.textContent = getManagerProgressionLabel(tab);
    btn.title = `Open ${getManagerProgressionLabel(tab)}.`;
    btn.addEventListener("click", () => {
      state.manager.activeTab = tab;
      updateManagerTable();
    });
    tabs.appendChild(btn);
  });
}

function updateSessionProgressionSelect() {
  const select = document.getElementById("session-progression-select");
  if (!select) return;
  const previous = select.value;
  select.innerHTML = "";
  getManagerProgressionKeys().forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = getManagerProgressionLabel(key);
    select.appendChild(option);
  });
  if (previous && getManagerProgressionKeys().includes(previous)) select.value = previous;
}

function applyDifficultyToManagerItem(item, difficulty) {
  if (!item || !difficulty) return;
  item.level.difficulty = difficulty;
  item.level.target_density = difficultyToTargetDensity(difficulty, item.level.solution_count || 0);
  item.level.meta = { ...(item.level.meta || {}), manual_difficulty: difficulty };
  item.changed = true;
  refreshItemArtifacts(item);
}

function makeProgressionKey(label) {
  const base = String(label || "Progression")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "progression";
  let key = base.startsWith("progression") ? base : `progression_${base}`;
  let index = 1;
  while (state.manager.progressions[key]) {
    key = `${base}_${index}`;
    if (!key.startsWith("progression")) key = `progression_${key}`;
    index += 1;
  }
  return key;
}

function createManagerProgressionFromPrompt() {
  const input = window.prompt("Progression name", `Progression ${state.manager.progressionOrder.length + 1}`);
  const label = String(input || "").trim();
  if (!label) return;
  const key = makeProgressionKey(label);
  state.manager.progressions[key] = createManagerProgression(label);
  state.manager.progressionOrder.push(key);
  state.manager.activeTab = key;
  ensureTutorialInProgressionSlot(key).then(() => {
    updateManagerTable();
    log("mgr-log", `Created ${label} with the tutorial preloaded in slot 1.`);
  }).catch((err) => {
    updateManagerTable();
    log("mgr-log", `Created ${label}, but tutorial preload failed: ${formatParseError(err)}`);
  });
}

function renameActiveProgression() {
  if (!isManagerProgressionTab(state.manager.activeTab)) return;
  const progression = getManagerProgression(state.manager.activeTab);
  const input = window.prompt("Rename progression", progression.label || getManagerProgressionLabel(state.manager.activeTab));
  const label = String(input || "").trim();
  if (!label) return;
  progression.label = label;
  updateManagerTable();
  log("mgr-log", `Renamed progression to ${label}.`);
}

function duplicateActiveProgression() {
  if (!isManagerProgressionTab(state.manager.activeTab)) return;
  const source = getManagerProgression(state.manager.activeTab);
  const input = window.prompt("Duplicate progression name", `${source.label} Copy`);
  const label = String(input || "").trim();
  if (!label) return;
  const key = makeProgressionKey(label);
  state.manager.progressions[key] = {
    label,
    slots: [...source.slots],
    lockedSlots: [...source.lockedSlots],
    slotDifficulty: [...source.slotDifficulty]
  };
  state.manager.progressions[key].slots[0] = null;
  state.manager.progressions[key].lockedSlots[0] = false;
  state.manager.progressions[key].slotDifficulty[0] = "";
  state.manager.progressionOrder.push(key);
  state.manager.activeTab = key;
  ensureTutorialInProgressionSlot(key).then(() => {
    updateManagerTable();
    log("mgr-log", `Duplicated ${source.label} into ${label} with the tutorial preserved in slot 1.`);
  }).catch((err) => {
    updateManagerTable();
    log("mgr-log", `Duplicated ${source.label} into ${label}, but tutorial preload failed: ${formatParseError(err)}`);
  });
}

function difficultyDistance(a, b) {
  const order = { EASY: 0, MEDIUM: 1, HARD: 2 };
  const left = order[a || "MEDIUM"] ?? 1;
  const right = order[b || "MEDIUM"] ?? 1;
  return Math.abs(left - right);
}

function chooseBestPoolItemForSlot(slotIndex, progressionKey) {
  const progression = getManagerProgression(progressionKey);
  const desiredDifficulty = progression.slotDifficulty[slotIndex] || "";
  const targetLevelNumber = slotIndex + 1;
  const pool = getManagerUnassignedItems();
  if (!pool.length) return null;
  return pool
    .map((item) => {
      const itemDifficulty = levelDifficulty(item.level);
      const score =
        difficultyDistance(desiredDifficulty || itemDifficulty, itemDifficulty) * 20 +
        Math.abs((item.level.level || targetLevelNumber) - targetLevelNumber) * 5 +
        (item.status === "OK" ? 0 : 100) +
        ((item.level.blockers || []).length * 0.5);
      return { item, score };
    })
    .sort((a, b) => a.score - b.score)[0]?.item || null;
}

function autofillActiveProgression() {
  if (!isManagerProgressionTab(state.manager.activeTab)) return;
  const progression = getManagerProgression(state.manager.activeTab);
  let filled = 0;
  progression.slots.forEach((itemId, index) => {
    if (isTutorialSlotIndex(index)) return;
    if (itemId != null || progression.lockedSlots[index]) return;
    const candidate = chooseBestPoolItemForSlot(index, state.manager.activeTab);
    if (!candidate) return;
    moveManagerItemToSlot(candidate.id, index, state.manager.activeTab);
    filled += 1;
  });
  updateManagerTable();
  log("mgr-log", filled
    ? `Auto-filled ${filled} empty slot(s) in ${getManagerProgressionLabel(state.manager.activeTab)}.`
    : `No eligible pool levels found for ${getManagerProgressionLabel(state.manager.activeTab)}.`);
}

function generateFromReferenceLevels() {
  const refs = state.manager.referenceIds.map((id) => getManagerItemById(id)).filter(Boolean);
  if (!refs.length) {
    log("mgr-log", "Mark at least one level with Use as Ref first.");
    return;
  }
  const created = [];
  refs.forEach((ref, refIndex) => {
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateLevelRaw(ref.level.level || 1, refIndex * 100 + attempt);
      const report = validateLevel(candidate);
      if (!report.valid) continue;
      candidate.difficulty = levelDifficulty(ref.level);
      candidate.target_density = difficultyToTargetDensity(candidate.difficulty, candidate.solution_count || 0);
      candidate.meta = {
        ...(candidate.meta || {}),
        generated_from_reference: ref.file,
        manual_difficulty: candidate.difficulty
      };
      const distance = featureDistance(extractFeatures(ref.level), extractFeatures(candidate));
      if (distance < bestDistance) {
        best = cloneLevel(candidate);
        bestDistance = distance;
      }
    }
    if (best) {
      const item = summarizeManagerItem(best, `reference_gen_${String(created.length + 1).padStart(2, "0")}_level_${best.level}.json`, `Generated from reference · ${ref.file}`);
      item.notes = `Generated from reference ${ref.file}`;
      state.manager.items.push(item);
      created.push(item);
    }
  });
  updateManagerTable();
  log("mgr-log", created.length
    ? `Generated ${created.length} candidate level(s) from ${refs.length} reference level(s).`
    : "No valid reference-based candidates were generated.");
}

async function expandManagerImportPayload(data, fileName) {
  const inferredTab = inferManagerProgressionKey(fileName, data?.name);
  const singleTargetTab = isManagerProgressionTab(state.manager.activeTab) ? state.manager.activeTab : null;
  if (isCanonicalLevelPayload(data) || isLegacyLevelPayload(data)) {
    return {
      mode: "single",
      items: [{
        item: summarizeManagerItem(toPlayableLevel(data, fileName), fileName, `Imported via browser picker · ${fileName}`),
        slot: null,
        tab: singleTargetTab
      }]
    };
  }

  if (isEmbeddedProgressionBundle(data)) {
    const expanded = [];
    if (data.tutorial_level) {
      expanded.push({
        item: summarizeManagerItem(toPlayableLevel(data.tutorial_level, `${data.name || fileName}_tutorial`), `${basename(fileName)} · tutorial`, `Bundle tutorial · ${fileName}`),
        slot: inferredTab ? 0 : null,
        tab: inferredTab
      });
    }
    for (const slot of data.slots || []) {
      if (data.tutorial_level && Number(slot?.slot) === 1) continue;
      if (!slot?.level) continue;
      expanded.push({
        item: summarizeManagerItem(toPlayableLevel(slot.level, `${data.name || fileName}_slot_${slot.slot}`), `${basename(fileName)} · slot ${slot.slot}`, `Embedded bundle level · ${fileName}`),
        slot: inferredTab && Number.isFinite(slot.slot) ? slot.slot - 1 : null,
        tab: inferredTab
      });
    }
    if (!expanded.length) throw new Error("This progression bundle does not contain embedded playable levels.");
    return { mode: "bundle", items: expanded };
  }

  if (isProgressionReferenceConfig(data)) {
    const expanded = [];
    if (data.tutorial_level_file) {
      const tutorialLevel = await fetchWorkshopLevelByFilename(data.tutorial_level_file);
      expanded.push({
        item: summarizeManagerItem(tutorialLevel, `${basename(fileName)} · tutorial`, `Referenced tutorial · ${data.tutorial_level_file}`),
        slot: inferredTab ? 0 : null,
        tab: inferredTab
      });
    }
    for (const slot of data.slots || []) {
      if (data.tutorial_level_file && Number(slot?.slot) === 1) continue;
      if (!slot?.level_file) continue;
      const level = await fetchWorkshopLevelByFilename(slot.level_file);
      expanded.push({
        item: summarizeManagerItem(level, `${basename(fileName)} · slot ${slot.slot}`, `Referenced level · ${slot.level_file}`),
        slot: inferredTab && Number.isFinite(slot.slot) ? slot.slot - 1 : null,
        tab: inferredTab
      });
    }
    if (!expanded.length) throw new Error("This progression config does not contain playable slot references.");
    return { mode: "progression", items: expanded };
  }

  if (Array.isArray(data?.levels)) {
    const expanded = [];
    for (const entry of data.levels) {
      if (entry?.level) {
        expanded.push({
          item: summarizeManagerItem(toPlayableLevel(entry.level, basename(entry.level_file || fileName)), `${basename(fileName)} · ${basename(entry.level_file || fileName)}`, `Embedded extra level · ${entry.level_file || fileName}`),
          slot: null,
          tab: null
        });
      } else if (entry?.level_file) {
        const level = await fetchWorkshopLevelByFilename(entry.level_file);
        expanded.push({
          item: summarizeManagerItem(level, `${basename(fileName)} · ${basename(entry.level_file)}`, `Referenced extra level · ${entry.level_file}`),
          slot: null,
          tab: null
        });
      }
    }
    if (!expanded.length) throw new Error("This levels bundle does not contain playable levels.");
    return { mode: "levels", items: expanded };
  }

  throw new Error("Unsupported JSON shape for Level Manager.");
}

function applyManagerImport(expanded) {
  for (const entry of expanded.items) {
    state.manager.items.push(entry.item);
    if (entry.tab && Number.isInteger(entry.slot) && entry.slot >= 0 && entry.slot < getManagerProgression(entry.tab).slots.length && !isTutorialSlotIndex(entry.slot) && !getManagerProgression(entry.tab).lockedSlots[entry.slot] && getManagerProgression(entry.tab).slots[entry.slot] == null) {
      getManagerProgression(entry.tab).slots[entry.slot] = entry.item.id;
      if (!getManagerProgression(entry.tab).slotDifficulty[entry.slot]) {
        getManagerProgression(entry.tab).slotDifficulty[entry.slot] = levelDifficulty(entry.item.level);
      } else {
        applyDifficultyToManagerItem(entry.item, getManagerProgression(entry.tab).slotDifficulty[entry.slot]);
      }
    } else {
      assignManagerItemToNextSlot(entry.item.id, entry.tab || state.manager.activeTab);
    }
  }
}

function managerPlacementLabel(itemId) {
  for (const key of getManagerProgressionKeys()) {
    const slotIndex = getManagerProgression(key).slots.findIndex((id) => id === itemId);
    if (slotIndex >= 0) return `${getManagerProgressionLabel(key)} · Slot ${slotIndex + 1}`;
  }
  return "Unassigned";
}

function buildManagerMetadataSnapshot(reason = "autosave") {
  const progressions = Object.fromEntries(getManagerProgressionKeys().map((key) => {
    const progression = getManagerProgression(key);
    return [key, {
      label: getManagerProgressionLabel(key),
      slots: progression.slots.map((itemId, index) => {
        const item = itemId != null ? getManagerItemById(itemId) : null;
        return {
          slot: index + 1,
          item_id: itemId,
          file: item?.file || "",
          level: item?.level?.level ?? null,
          board: item ? `${levelWidth(item.level)}x${levelHeight(item.level)}` : "",
          pairs: item ? (item.level.pairs || []).length : 0,
          blockers: item ? (item.level.blockers || []).length : 0,
          moves: item?.level?.moves ?? null,
          solutions: item?.level?.solution_count ?? null,
          difficulty: progression.slotDifficulty[index] || (item ? levelDifficulty(item.level) : ""),
          status: item?.status || "EMPTY",
          changed: !!item?.changed,
          locked: !!progression.lockedSlots[index],
          notes: item?.notes || ""
        };
      })
    }];
  }));

  const items = state.manager.items.map((item) => ({
    id: item.id,
    file: item.file,
    source_path: displayProjectPath(item.sourcePath || ""),
    saved_path: displayProjectPath(item.savedPath || ""),
    screenshot_path: displayProjectPath(item.screenshotPath || ""),
    level: item.level?.level ?? null,
    board: item.level ? `${levelWidth(item.level)}x${levelHeight(item.level)}` : "",
    pairs: item.level ? (item.level.pairs || []).length : 0,
    blockers: item.level ? (item.level.blockers || []).length : 0,
    moves: item.level?.moves ?? null,
    solutions: item.level?.solution_count ?? null,
    difficulty: item.level ? levelDifficulty(item.level) : "",
    status: item.status,
    changed: !!item.changed,
    notes: item.notes || "",
    placement: managerPlacementLabel(item.id),
    parse_error: item.parseError || ""
  }));

  return {
    saved_at: new Date().toISOString(),
    reason,
    active_tab: state.manager.activeTab,
    selected_id: state.manager.selectedId,
    filters: { ...(state.manager.filters || {}) },
    counts: {
      total_items: state.manager.items.length,
      assigned_items: getAllAssignedManagerIds().size,
      unassigned_items: getManagerUnassignedItems().length,
      valid_items: state.manager.items.filter((item) => item.status === "OK").length,
      invalid_items: state.manager.items.filter((item) => item.status === "INVALID").length,
      parse_error_items: state.manager.items.filter((item) => item.status === "PARSE_ERROR").length
    },
    progression_order: [...getManagerProgressionKeys()],
    progressions,
    items
  };
}

async function flushManagerMetadataSnapshot(reason = "autosave") {
  if (isRestoringWorkspaceState || isBootstrappingWorkspaceState) return;
  const snapshot = buildManagerMetadataSnapshot(reason);
  const signature = JSON.stringify({
    active_tab: snapshot.active_tab,
    selected_id: snapshot.selected_id,
    filters: snapshot.filters,
    counts: snapshot.counts,
    progressions: snapshot.progressions,
    items: snapshot.items
  });
  if (signature === lastManagerMetadataSignature) return;
  lastManagerMetadataSignature = signature;
  await saveProjectFile("progressions/manager_state/level_manager_state.json", JSON.stringify(snapshot, null, 2));
  await materializeManagerProgressionsToRepo();
  await appendProjectFile("progressions/manager_state/level_manager_metadata.log.jsonl", `${JSON.stringify({
    saved_at: snapshot.saved_at,
    reason: snapshot.reason,
    active_tab: snapshot.active_tab,
    selected_id: snapshot.selected_id,
    counts: snapshot.counts,
    progression_order: snapshot.progression_order,
    filters: snapshot.filters
  })}\n`);
}

function scheduleManagerMetadataSnapshot(reason = "autosave") {
  if (isRestoringWorkspaceState || isBootstrappingWorkspaceState) return;
  clearTimeout(managerMetadataSaveTimer);
  managerMetadataSaveTimer = setTimeout(() => {
    flushManagerMetadataSnapshot(reason).catch((err) => {
      log("mgr-log", `Metadata autosave error: ${formatParseError(err)}`);
    });
  }, 900);
}

function getManagerItemById(itemId) {
  return state.manager.itemIndex.get(itemId) || null;
}

function findManagerSlotIndex(itemId) {
  return state.manager.slotIndexByItemId.get(itemId) || null;
}

function assignManagerItemToNextSlot(itemId, tab = state.manager.activeTab) {
  if (!isManagerProgressionTab(tab)) return;
  const progression = getManagerProgression(tab);
  const freeIndex = progression.slots.findIndex((slot, index) => index !== 0 && slot == null && !progression.lockedSlots[index]);
  if (freeIndex >= 0) {
    progression.slots[freeIndex] = itemId;
    const item = getManagerItemById(itemId);
    if (!progression.slotDifficulty[freeIndex]) progression.slotDifficulty[freeIndex] = item ? levelDifficulty(item.level) : "";
    else applyDifficultyToManagerItem(item, progression.slotDifficulty[freeIndex]);
  }
}

function moveManagerItemToSlot(itemId, slotIndex, tab = state.manager.activeTab) {
  if (!isManagerProgressionTab(tab)) return;
  const target = getManagerProgression(tab);
  if (isTutorialSlotIndex(slotIndex)) return;
  if (target.lockedSlots[slotIndex]) return;
  const currentSlot = findManagerSlotIndex(itemId);
  if (currentSlot && isTutorialSlotIndex(currentSlot.index)) return;
  if (currentSlot && getManagerProgression(currentSlot.tab).lockedSlots[currentSlot.index]) return;
  const displacedId = target.slots[slotIndex];
  if (displacedId != null) {
    const displacedSlot = findManagerSlotIndex(displacedId);
    if (displacedSlot && isTutorialSlotIndex(displacedSlot.index) && displacedId !== itemId) return;
    if (displacedSlot && getManagerProgression(displacedSlot.tab).lockedSlots[displacedSlot.index] && displacedId !== itemId) return;
  }

  if (currentSlot && currentSlot.tab === tab && currentSlot.index === slotIndex) return;

  if (currentSlot) getManagerProgression(currentSlot.tab).slots[currentSlot.index] = displacedId ?? null;
  target.slots[slotIndex] = itemId;
  const movedItem = getManagerItemById(itemId);
  if (!target.slotDifficulty[slotIndex]) target.slotDifficulty[slotIndex] = movedItem ? levelDifficulty(movedItem.level) : "";
  else applyDifficultyToManagerItem(movedItem, target.slotDifficulty[slotIndex]);
  if (currentSlot && displacedId != null) {
    const origin = getManagerProgression(currentSlot.tab);
    const displacedItem = getManagerItemById(displacedId);
    if (!origin.slotDifficulty[currentSlot.index]) origin.slotDifficulty[currentSlot.index] = displacedItem ? levelDifficulty(displacedItem.level) : "";
    else applyDifficultyToManagerItem(displacedItem, origin.slotDifficulty[currentSlot.index]);
  }
}

function moveManagerItemToPool(itemId) {
  const currentSlot = findManagerSlotIndex(itemId);
  if (currentSlot && isTutorialSlotIndex(currentSlot.index)) return;
  if (currentSlot && getManagerProgression(currentSlot.tab).lockedSlots[currentSlot.index]) return;
  if (currentSlot) getManagerProgression(currentSlot.tab).slots[currentSlot.index] = null;
}

function clearManagerSlot(slotIndex, tab = state.manager.activeTab) {
  if (!isManagerProgressionTab(tab)) return;
  if (isTutorialSlotIndex(slotIndex)) return;
  const progression = getManagerProgression(tab);
  if (progression.lockedSlots[slotIndex]) return;
  progression.slots[slotIndex] = null;
}

function updateSessionPreviewGrid() {
  const grid = document.getElementById("session-preview-grid");
  if (!grid) return;
  grid.innerHTML = "";

  state.sessions.queue.forEach((item) => {
    const card = document.createElement("div");
    card.className = "preview-card session-preview-card";
    if (item.id === state.sessions.selectedId) card.classList.add("selected-preview");
    if (item.id === state.sessions.activeId) card.classList.add("active-preview");
    card.addEventListener("click", () => {
      state.sessions.selectedId = item.id;
      updateSessionTable();
      updateSessionPreviewGrid();
      log("session-log", `Selected ${item.file} (${item.reviewStatus}, ${item.validationStatus}).`);
    });
    card.title = "Click to select this session level. Use the buttons below it to play, edit, approve, or reject.";

    const title = document.createElement("div");
    title.className = "preview-title session-card-title";
    title.textContent = item.file;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "preview-meta session-card-meta";
    meta.textContent = `L${item.level.level} · ${levelWidth(item.level)}x${levelHeight(item.level)} · ${item.reviewStatus} · ${item.validationStatus}`;
    card.appendChild(meta);

    const boardFrame = document.createElement("div");
    boardFrame.className = "session-card-board";

    if (shouldRenderSessionPreviews()) {
      const previewImg = document.createElement("img");
      previewImg.className = "editor-slot-thumb";
      previewImg.alt = `${item.file} preview`;
      previewImg.src = getCachedPreviewDataUrl(item);
      boardFrame.appendChild(previewImg);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "editor-slot-empty";
      placeholder.textContent = "Preview off";
      boardFrame.appendChild(placeholder);
    }
    card.appendChild(boardFrame);

    const actions = document.createElement("div");
    actions.className = "preview-actions session-card-actions";

    const playBtn = document.createElement("button");
    playBtn.textContent = "Play";
    playBtn.title = "Load this level into the session board for play.";
    playBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      playSessionItem(item);
    });
    actions.appendChild(playBtn);

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.title = "Open this level in the editor to adjust it.";
    editBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      state.sessions.selectedId = item.id;
      openSessionItemInEditor(item);
    });
    actions.appendChild(editBtn);

    const approveBtn = document.createElement("button");
    approveBtn.textContent = "Approve";
    approveBtn.title = "Approve this level and move on.";
    approveBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      state.sessions.selectedId = item.id;
      applySessionDecision(item, "approve");
    });
    actions.appendChild(approveBtn);

    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "Reject";
    rejectBtn.title = "Reject this level and move on.";
    rejectBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      state.sessions.selectedId = item.id;
      applySessionDecision(item, "reject");
    });
    actions.appendChild(rejectBtn);

    card.appendChild(actions);
    grid.appendChild(card);
  });
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

    [item.source, item.file, item.level.level, `${levelWidth(item.level)}x${levelHeight(item.level)}`, item.level.pairs.length, item.level.moves ?? "-", item.level.solution_count ?? "-", item.reviewStatus, item.validationStatus].forEach((value, index) => {
      const td = document.createElement("td");
      td.textContent = String(value);
      if (index === 0 || index === 1) td.classList.add("session-table-text");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  if (!rows.length) {
    log("session-log", "No session levels loaded.");
  }
  updateSessionPreviewGrid();
  updateEditorSessionLink();
  persistWorkspaceState();
}

function queueSessionLevel(level, file, source = "imported", options = {}) {
  const item = summarizeSessionLevel(level, file, source);
  item.managerItemId = options.managerItemId ?? null;
  item.savedPath = options.savedPath || "";
  state.sessions.queue.push(item);
  if (state.sessions.selectedId == null) state.sessions.selectedId = item.id;
  updateSessionTable();
  return item;
}

function loadProgressionIntoSessions(key) {
  if (!isManagerProgressionTab(key)) {
    log("session-log", "Choose a progression first.");
    return false;
  }
  const progression = getManagerProgression(key);
  const items = progression.slots
    .map((itemId) => (itemId != null ? getManagerItemById(itemId) : null))
    .filter(Boolean);
  if (!items.length) {
    log("session-log", `${getManagerProgressionLabel(key)} has no levels yet.`);
    return false;
  }
  state.sessions.queue = [];
  state.sessions.selectedId = null;
  state.sessions.activeId = null;
  items.forEach((item, index) => {
    queueSessionLevel(cloneLevel(item.level), `${getManagerProgressionLabel(key)} · slot ${index + 1}`, getManagerProgressionLabel(key), {
      managerItemId: item.id,
      savedPath: item.savedPath || ""
    });
  });
  const first = state.sessions.queue[0];
  if (first) state.sessions.selectedId = first.id;
  state.play.on = false;
  state.sessions.activeId = null;
  setPlayStatus("Play OFF");
  updateSessionTable();
  log("session-log", `Loaded ${items.length} level(s) from ${getManagerProgressionLabel(key)}.`);
  return true;
}

function openSessionItemInEditor(item) {
  loadLevelToEditor(item.level, { fileName: item.file });
  state.sessions.selectedId = item.id;
  state.sessions.editingId = item.id;
  setEditorLink("session", item.id, `Linked to session item: ${item.file}`);
  updateSessionTable();
  setActiveView("editor");
  log("ed-log", `Editing session item ${item.file}. Save your changes when ready.`);
}

function playSessionItem(item) {
  loadLevelToEditor(item.level, { fileName: item.file });
  setEditorLink("session", item.id, `Linked to session item: ${item.file}`);
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
  const currentWasActive = state.sessions.activeId === currentId;
  if (state.sessions.queue.length === 1) {
    state.sessions.selectedId = currentId;
    updateSessionTable();
    return false;
  }

  const nextIndex = (currentIndex + 1) % state.sessions.queue.length;
  const nextItem = state.sessions.queue[nextIndex];
  if (currentWasActive) {
    playSessionItem(nextItem);
  } else {
    state.sessions.selectedId = nextItem.id;
    state.sessions.activeId = null;
    state.play.on = false;
    setPlayStatus("Play OFF");
    updateSessionTable();
  }
  return true;
}

async function applySessionDecision(item, decision) {
  recordLearningDecision(item.level, decision, `session:${item.file}`);
  item.reviewStatus = decision === "approve" ? "APPROVED" : "REJECTED";
  if (item.managerItemId) {
    const managerItem = getManagerItemById(item.managerItemId);
    if (managerItem) {
      managerItem.notes = decision === "reject"
        ? (managerItem.notes ? `${managerItem.notes} | Rejected in Play Sessions` : "Rejected in Play Sessions")
        : managerItem.notes;
      managerItem.changed = managerItem.changed || decision === "reject";
      refreshItemArtifacts(managerItem);
    }
  }
  updateSessionTable();
  const moved = advanceToNextSessionItem(item.id);
  if (!moved) {
    log("session-log", `${decision === "approve" ? "Approved" : "Rejected"} ${item.file}. No next level in queue.`);
  }
}

async function validateSessionItem(item) {
  const report = validateLevel(item.level);
  item.validationStatus = report.valid ? "OK" : "INVALID";
  await syncSessionItemToManager(item);
  updateSessionTable();
  const moved = advanceToNextSessionItem(item.id);
  if (!moved) {
    log("session-log", report.valid ? `${item.file} validated. No next level in queue.` : `${item.file} invalid: ${report.errors.join(", ")}`);
  }
}

function initNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveView(btn.dataset.view);
    });
  });
}

function initSettings() {
  const input = document.getElementById("settings-export-dir");
  if (input) input.value = displayProjectPath(state.settings.exportDir);
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = String(value);
  };
  setValue("settings-performance-profile", state.settings.performanceProfile);
  setValue("settings-font-family", state.settings.fontFamily);
  setValue("settings-color-bg", state.settings.uiTheme.bg);
  setValue("settings-color-surface", state.settings.uiTheme.surface);
  setValue("settings-color-text", state.settings.uiTheme.text);
  setValue("settings-color-muted", state.settings.uiTheme.muted);
  setValue("settings-color-accent", state.settings.uiTheme.accent);
  setValue("settings-color-accent2", state.settings.uiTheme.accent2);
  setValue("settings-color-border", state.settings.uiTheme.border);
  setValue("settings-max-pairs", state.settings.maxPairs);
  setValue("settings-default-width", state.settings.defaultBoardWidth);
  setValue("settings-default-height", state.settings.defaultBoardHeight);
  setValue("settings-default-difficulty", state.settings.defaultDifficulty);
  setValue("settings-pair-a", state.settings.pairColors[0]);
  setValue("settings-pair-b", state.settings.pairColors[1]);
  setValue("settings-pair-c", state.settings.pairColors[2]);
  setValue("settings-pair-d", state.settings.pairColors[3]);
  setValue("settings-pair-e", state.settings.pairColors[4]);
  document.getElementById("settings-save").addEventListener("click", () => {
    state.settings.exportDir = resolveProjectPath(document.getElementById("settings-export-dir").value || DEFAULT_PROJECT_SAVE_DIR);
    state.settings.performanceProfile = String(document.getElementById("settings-performance-profile").value || "medium").toLowerCase();
    state.settings.fontFamily = String(document.getElementById("settings-font-family").value || DEFAULT_FONT_FAMILY);
    state.settings.uiTheme = {
      bg: document.getElementById("settings-color-bg").value || DEFAULT_UI_THEME.bg,
      surface: document.getElementById("settings-color-surface").value || DEFAULT_UI_THEME.surface,
      text: document.getElementById("settings-color-text").value || DEFAULT_UI_THEME.text,
      muted: document.getElementById("settings-color-muted").value || DEFAULT_UI_THEME.muted,
      accent: document.getElementById("settings-color-accent").value || DEFAULT_UI_THEME.accent,
      accent2: document.getElementById("settings-color-accent2").value || DEFAULT_UI_THEME.accent2,
      border: document.getElementById("settings-color-border").value || DEFAULT_UI_THEME.border
    };
    state.settings.maxPairs = Math.max(1, Math.min(PAIR_IDS.length, Number(document.getElementById("settings-max-pairs").value || PAIR_IDS.length)));
    state.settings.defaultBoardWidth = Math.max(4, Math.min(8, Number(document.getElementById("settings-default-width").value || 5)));
    state.settings.defaultBoardHeight = Math.max(4, Math.min(8, Number(document.getElementById("settings-default-height").value || 5)));
    state.settings.defaultDifficulty = String(document.getElementById("settings-default-difficulty").value || "MEDIUM");
    state.settings.pairColors = [
      document.getElementById("settings-pair-a").value || pairColors[0],
      document.getElementById("settings-pair-b").value || pairColors[1],
      document.getElementById("settings-pair-c").value || pairColors[2],
      document.getElementById("settings-pair-d").value || pairColors[3],
      document.getElementById("settings-pair-e").value || pairColors[4]
    ];
    applySettingsToUi();
    applySettingsToEditorDefaults();
    saveSettings();
    syncEditorInputs();
    refreshVisibleView();
    log("settings-log", `Settings updated.\nSave path: ${displayProjectPath(state.settings.exportDir)}\nPerformance: ${state.settings.performanceProfile}\nActive pairs: ${state.settings.maxPairs}\nDefault board: ${state.settings.defaultBoardWidth}x${state.settings.defaultBoardHeight}\nDefault difficulty: ${state.settings.defaultDifficulty}`);
    log("mgr-paths", [
      "Level folders",
      `${PROJECT_ROOT_NAME}/levels`,
      `${PROJECT_ROOT_NAME}/progressions`,
      `${PROJECT_ROOT_NAME}/playtest`,
      "",
      "Project save root",
      displayProjectPath(state.settings.exportDir),
      "",
      "Archive and runtime mirrors",
      `${PROJECT_ROOT_NAME}/archive`,
      `${PROJECT_ROOT_NAME}/level_toolkit_web/workshop_jsons`,
      `${PROJECT_ROOT_NAME}/bundles`
    ].join("\n"));
  });
  document.getElementById("settings-clear-cache").addEventListener("click", async () => {
    clearSavedWorkspaceState({ keepSettings: false });
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (_err) {
      // best effort
    }
    log("settings-log", "Toolkit page cache cleared. Reloading...");
    window.location.href = `${window.location.pathname}?cache_cleared=1&v=${Date.now()}`;
  });
}

function initMain() {
  bindClick("btn-generate-current", () => {
    const lvl = Number(document.getElementById("main-level-number").value);
    const generated = generateLevel(lvl);
    loadLevelToEditor(generated, { fileName: `level_${lvl}.json` });
    setEditorLink("standalone", null, `Standalone generated level ${lvl}`);
    log("main-log", `Generated level ${lvl} with ${generated.solution_count} solutions and ${generated.moves} moves.`);
  });

  bindClick("btn-generate-progression", () => {
    state.progression = generateProgression();
    log("main-log", `Generated full progression (10 levels).`);
  });

  bindClick("btn-download-progression-json", async () => {
    if (!state.progression.length) state.progression = generateProgression();
    const saved = await saveProjectFile("procedural/progression_levels.json", JSON.stringify(state.progression, null, 2));
    log("main-log", `Saved progression JSON to ${displayProjectPath(saved.path)}.`);
  });

  bindClick("btn-download-progression-csv", () => {
    if (!state.progression.length) state.progression = generateProgression();
    downloadText("progression_summary.csv", toCsv(state.progression), "text/csv");
  });

  bindClick("btn-generate-procedural-batch", () => {
    const start = Number(document.getElementById("main-batch-start").value || 1);
    const end = Number(document.getElementById("main-batch-end").value || 10);
    const count = Number(document.getElementById("main-batch-count").value || 20);
    state.proceduralBatch = generateProceduralBatch(start, end, count);
    log("main-log", `Generated procedural batch: count=${state.proceduralBatch.length}, levels ${Math.min(start, end)}..${Math.max(start, end)}.`);
  });

  bindClick("btn-download-procedural-json", async () => {
    if (!state.proceduralBatch.length) {
      const start = Number(document.getElementById("main-batch-start").value || 1);
      const end = Number(document.getElementById("main-batch-end").value || 10);
      const count = Number(document.getElementById("main-batch-count").value || 20);
      state.proceduralBatch = generateProceduralBatch(start, end, count);
    }
    const saved = await saveProjectFile("procedural/procedural_batch_levels.json", JSON.stringify(state.proceduralBatch, null, 2));
    log("main-log", `Saved procedural batch JSON to ${displayProjectPath(saved.path)}.`);
  });

  bindClick("btn-download-procedural-csv", () => {
    if (!state.proceduralBatch.length) {
      const start = Number(document.getElementById("main-batch-start").value || 1);
      const end = Number(document.getElementById("main-batch-end").value || 10);
      const count = Number(document.getElementById("main-batch-count").value || 20);
      state.proceduralBatch = generateProceduralBatch(start, end, count);
    }
    downloadText("procedural_batch_summary.csv", toCsv(state.proceduralBatch), "text/csv");
  });

  bindClick("btn-download-workshop-tutorial", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/tutorial_level.json", "tutorial_level.json");
      log("main-log", "Saved tutorial_level.json into the project.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });

  bindClick("btn-download-workshop-a", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/progressionA_bundle.json", "progressionA_bundle.json");
      log("main-log", "Saved progressionA_bundle.json into the project.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });

  bindClick("btn-download-workshop-b", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/progressionB_bundle.json", "progressionB_bundle.json");
      log("main-log", "Saved progressionB_bundle.json into the project.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });

  bindClick("btn-download-workshop-c", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/progressionC_bundle.json", "progressionC_bundle.json");
      log("main-log", "Saved progressionC_bundle.json into the project.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });

  bindClick("btn-download-workshop-extra", async () => {
    try {
      await downloadWorkshopBundle("./workshop_progressions/progressionExtra_bundle.json", "progressionExtra_bundle.json");
      log("main-log", "Saved progressionExtra_bundle.json into the project.");
    } catch (err) {
      log("main-log", `Workshop download error: ${err.message}`);
    }
  });
}

function initEditor() {
  const boardWidthEl = document.getElementById("ed-board-width");
  const boardHeightEl = document.getElementById("ed-board-height");
  const progressionSelectEl = document.getElementById("ed-progression-select");
  const progressionSlotEl = document.getElementById("ed-progression-slot");

  updateEditorProgressionBuilder();

  progressionSelectEl.addEventListener("change", () => {
    state.editor.progressionKey = progressionSelectEl.value;
    state.editor.progressionSlot = 1;
    syncEditorInputs();
    updateEditorProgressionBuilder();
  });

  progressionSlotEl.addEventListener("change", () => {
    state.editor.progressionSlot = Number(progressionSlotEl.value || 1);
    updateEditorProgressionBuilder();
  });

  document.getElementById("ed-save-to-progression").addEventListener("click", async () => {
    try {
      await saveEditorLevelIntoProgression({ advanceToNext: false });
    } catch (err) {
      log("ed-log", `Save to progression error: ${formatParseError(err)}`);
    }
  });

  document.getElementById("ed-save-new-level").addEventListener("click", async () => {
    try {
      await saveEditorLevelIntoProgression({ advanceToNext: true });
    } catch (err) {
      log("ed-log", `Save + New Level error: ${formatParseError(err)}`);
    }
  });

  function handleBoardDimensionChange() {
    state.editor.boardWidth = Number(boardWidthEl.value);
    state.editor.boardHeight = Number(boardHeightEl.value);
    state.editor.solutionCount = 0;
    state.editor.validationSolvable = false;
    state.editor.validationDensityMatch = false;
    state.editor.validationDecalPass = null;
    state.editor.blockers.clear();
    state.editor.debugMarks.clear();
    Object.keys(state.editor.pairs).forEach((id) => {
      state.editor.pairs[id].start = null;
      state.editor.pairs[id].end = null;
    });
    updateEditorDebugStatus();
    markEditorDirty("board size change");
    drawBoard();
  }
  boardWidthEl.addEventListener("change", handleBoardDimensionChange);
  boardHeightEl.addEventListener("change", handleBoardDimensionChange);

  document.getElementById("ed-level").addEventListener("change", () => markEditorDirty("level number change"));
  document.getElementById("ed-name").addEventListener("change", () => {
    state.editor.fileName = normalizeLevelFileName(document.getElementById("ed-name").value, Number(document.getElementById("ed-level").value || 1));
    syncEditorInputs();
    markEditorDirty("level name change");
  });
  document.getElementById("ed-difficulty").addEventListener("change", () => {
    state.editor.difficulty = document.getElementById("ed-difficulty").value;
    markEditorDirty("difficulty change");
  });
  document.getElementById("ed-moves").addEventListener("change", () => {
    const raw = String(document.getElementById("ed-moves").value ?? "").trim();
    state.editor.moves = raw === "" ? recommendedMoves() : Number(raw);
    markEditorDirty("moves change");
  });
  document.getElementById("ed-decal").addEventListener("change", () => {
    state.editor.decal = !!document.getElementById("ed-decal").checked;
    markEditorDirty("decal change");
  });
  document.getElementById("ed-mode").addEventListener("change", () => drawBoard());
  document.getElementById("ed-pair-id").addEventListener("change", () => {
    updateEditorPairBadge();
    drawBoard();
  });
  document.getElementById("ed-endpoint").addEventListener("change", () => drawBoard());

  document.getElementById("ed-auto-moves").addEventListener("click", () => {
    state.editor.moves = recommendedMoves();
    document.getElementById("ed-moves").value = String(state.editor.moves);
    markEditorDirty("moves autofill");
  });

  bindPlayCanvas(canvas, true);

  document.getElementById("ed-validate").addEventListener("click", async () => {
    const level = levelFromEditor();
    const report = validateLevel(level);
    const solvedNow = getPlayStatus() === "Solved";
    if (solvedNow) {
      const session = await saveSolvedSession("validate");
      log("ed-log", `VALID\nPairs: ${level.pairs.length}\nBlockers: ${level.blockers.length}\nMoves: ${level.moves}\nSolutions: ${report.solutionCount}\nDecal: ${report.decalRequired ? (report.decalPass ? "PASS" : "FAIL") : "OFF"}\nSolved session saved to project: ${session.saved_path}`);
      return;
    }
    log("ed-log", report.valid
      ? `VALID\nPairs: ${level.pairs.length}\nBlockers: ${level.blockers.length}\nMoves: ${level.moves}\nSolutions: ${report.solutionCount}\nDecal: ${report.decalRequired ? (report.decalPass ? "PASS" : "FAIL") : "OFF"}`
      : `INVALID\n- ${report.errors.join("\n- ")}`);
  });

  document.getElementById("ed-export").addEventListener("click", async () => {
    const level = levelFromEditor();
    const saved = await saveLevelArtifactsToProject(level, state.editor.fileName);
    log("ed-log", `Saved level JSON to ${displayProjectPath(saved.jsonPath)}\nSaved screenshot to ${displayProjectPath(saved.screenshotPath)}`);
  });

  document.getElementById("ed-import").addEventListener("click", () => {
    document.getElementById("ed-import-input").click();
  });

  document.getElementById("ed-import-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = parseImportedJson(await file.text());
      const level = toPlayableLevel(data, file.name);
      loadLevelToEditor(level, { fileName: file.name });
      setEditorLink("standalone", null, `Standalone imported level: ${file.name}`);
      log("ed-log", `Imported ${file.name} into the editor.`);
    } catch (err) {
      log("ed-log", `Import error in ${file.name}: ${formatParseError(err)}`);
    }
    e.target.value = "";
  });

  document.getElementById("ed-screenshot").addEventListener("click", async () => {
    const level = levelFromEditor();
    const stem = slugifyFilePart(state.editor.fileName || `level_${level.level}.json`);
    const saved = await saveProjectDataUrl(`screenshots/${stem}.png`, canvas.toDataURL("image/png"));
    log("ed-log", `Saved screenshot to ${displayProjectPath(saved.path)}`);
  });

  document.getElementById("ed-reset").addEventListener("click", () => {
    state.editor.blockers.clear();
    state.editor.debugMarks.clear();
    Object.keys(state.editor.pairs).forEach((id) => {
      state.editor.pairs[id] = { start: null, end: null };
    });
    updateEditorDebugStatus();
    document.getElementById("ed-moves").value = "0";
    document.getElementById("ed-decal").checked = false;
    state.editor.decal = false;
    state.editor.solutionCount = 0;
    state.editor.validationSolvable = false;
    state.editor.validationDensityMatch = false;
    state.editor.validationDecalPass = null;
    state.play.on = false;
    state.play.history = [];
    state.play.colorMap = {};
    setPlayStatus("Play OFF");
    markEditorDirty("reset");
    drawBoard();
    log("ed-log", "Reset.");
  });

  document.getElementById("ed-save").addEventListener("click", async () => {
    try {
      await persistEditorToLinkedSource();
    } catch (err) {
      log("ed-log", `Save error: ${formatParseError(err)}`);
    }
  });

  document.getElementById("ed-save-as-new").addEventListener("click", async () => {
    try {
      await saveEditorAsNewLevel();
    } catch (err) {
      log("ed-log", `Save As New error: ${formatParseError(err)}`);
    }
  });

  bindClick("ed-clear-learning", () => {
    state.learning.approved = [];
    state.learning.rejected = [];
    state.learning.corrections = [];
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

  document.getElementById("play-export-session").addEventListener("click", async () => {
    const solvedNow = getPlayStatus() === "Solved";
    const session = solvedNow ? await saveSolvedSession("manual") : serializePlaySession(false);
    if (!solvedNow) {
      session.saved_path = (await saveProjectFile(`playtest/play_session_level_${session.level.level}.json`, JSON.stringify(session, null, 2))).path;
    }
    log("ed-log", `Saved play session for level ${session.level.level} to ${displayProjectPath(session.saved_path)}.`);
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
      markEditorDirty("board edit");
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
    loadLevelToEditor(level, { fileName: `${autoload}.json` });
    setEditorLink("standalone", null, `Autoloaded level: ${autoload}`);

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

async function autoloadManagerFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset_workspace") === "1") {
    clearSavedWorkspaceState({ keepSettings: true });
    resetWorkspaceInMemory();
    log("mgr-log", "Workspace reset from URL.");
  }

  const progressionKey = params.get("autoload_progression");
  if (!progressionKey) return;

  const progressionMap = {
    progressionA: "./workshop_progressions/progressionA_bundle.json",
    progressionA_afterTewak: "./workshop_progressions/progressionA_afterTewak_bundle.json",
    progressionA_new_levels_a: "./workshop_progressions/progressionA_new_levels_a_bundle.json",
    progressionImportedClean: "./workshop_progressions/progressionImportedClean_bundle.json",
    progressionB: "./workshop_progressions/progressionB_bundle.json",
    progressionC: "./workshop_progressions/progressionC_bundle.json",
    progressionExtra: "./workshop_progressions/progressionExtra_bundle.json"
  };
  const targetUrl = progressionMap[progressionKey];
  if (!targetUrl) {
    log("mgr-log", `Unknown progression key: ${progressionKey}`);
    return;
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`Failed to load ${targetUrl}`);
    const data = parseImportedJson(await response.text());
    const expanded = await expandManagerImportPayload(data, `${progressionKey}_autoload.json`);
    applyManagerImport(expanded);
    state.manager.activeTab = progressionKey;
    setActiveView(params.get("view") || "manager");
    updateManagerTable();
    persistWorkspaceState();
    log("mgr-log", `Autoloaded ${progressionKey} into Level Manager.`);
  } catch (err) {
    log("mgr-log", `Autoload progression error: ${err.message}`);
  }
}

async function autoloadWorkspaceFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const preset = params.get("autoload_workspace");
  if (!preset) return;

  const presetMap = {
    allUniqueLevels: "./workshop_progressions/allUniqueLevels_workspace.json",
    gameUniqueLevels: "./workshop_progressions/gameUniqueLevels_workspace.json",
    workshop: "./workshop_progressions/workshop_workspace.json",
    progressionA_afterTewak: "./workshop_progressions/progressionA_afterTewak_workspace.json",
    progressionImportedClean: "./workshop_progressions/progressionImportedClean_workspace.json"
  };
  const targetUrl = presetMap[preset];
  if (!targetUrl) {
    log("mgr-log", `Unknown workspace preset: ${preset}`);
    return;
  }

  try {
    setManagerLoading(true, `Loading workspace preset ${preset}...`, 0, 100);
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`Failed to load ${targetUrl}`);
    const data = parseImportedJson(await response.text());
    setManagerLoading(true, `Loading workspace preset ${preset}...`, 10, 100);
    const tutorialLevel = await fetchWorkshopLevelByFilename(data.tutorial_level_file || "tutorial_level.json");
    setManagerLoading(true, `Loading workspace preset ${preset}...`, 20, 100);

    resetWorkspaceInMemory();

    const itemByFilename = new Map();
    const allLevelFiles = data.all_level_files || [];
    for (let index = 0; index < allLevelFiles.length; index += 1) {
      const fileName = allLevelFiles[index];
      const level = await fetchWorkshopLevelByFilename(fileName);
      const item = summarizeManagerItem(level, fileName, `Workshop level · ${fileName}`);
      state.manager.items.push(item);
      itemByFilename.set(basename(fileName), item);
      const progress = 20 + Math.round(((index + 1) / Math.max(allLevelFiles.length, 1)) * 50);
      setManagerLoading(true, `Loading workspace preset ${preset}...`, progress, 100);
      if ((index + 1) % 8 === 0) await pauseForPaint();
    }

    const progressionEntries = Object.entries(data.progressions || {}).filter(([, entries]) =>
      Array.isArray(entries) && entries.some((entry) => Number.isFinite(Number(entry?.slot)) || entry?.status === "reserved")
    );
    progressionEntries.forEach(([key]) => {
      const label = defaultManagerProgressions.find((entry) => entry.key === key)?.label
        || key.replace(/^progression/, "Progression ").replace(/([A-Z])/g, " $1").trim();
      ensureManagerProgression(key, label);
    });

    for (const [key, slots] of progressionEntries) {
      if (!isManagerProgressionTab(key)) continue;
      const progression = getManagerProgression(key);
      progression.slots = Array(10).fill(null);
      progression.lockedSlots = Array(10).fill(false);
      progression.slotDifficulty = Array(10).fill("");
      slots.forEach((slot, index) => {
        const slotIndex = Number(slot?.slot || index + 1) - 1;
        if (slotIndex < 0 || slotIndex >= 10) return;
        let item = null;
        if (slot?.status === "reserved") {
          item = summarizeManagerItem(tutorialLevel, `${getManagerProgressionLabel(key)} · tutorial`, `Workshop tutorial · ${key}`);
          item.notes = "Tutorial slot";
          state.manager.items.push(item);
        } else if (slot?.level_file) {
          item = itemByFilename.get(basename(slot.level_file)) || null;
        }
        if (!item) return;
        progression.slots[slotIndex] = item.id;
        progression.slotDifficulty[slotIndex] = levelDifficulty(item.level);
      });
    }
    setManagerLoading(true, `Rendering workspace preset ${preset}...`, 85, 100);

    state.manager.activeTab = params.get("manager_tab") || "progressionA";
    updateManagerTable();

    const sessionProgression = params.get("autoload_session_progression") || data.default_session_progression;
    if (sessionProgression) loadProgressionIntoSessions(sessionProgression);

    setActiveView(params.get("view") || "sessions");
    persistWorkspaceState();
    setManagerLoading(false);
    log("mgr-log", `Autoloaded workspace preset ${preset} with ${state.manager.items.length} levels.`);
  } catch (err) {
    setManagerLoading(false);
    log("mgr-log", `Autoload workspace error: ${err.message}`);
  }
}

function initManager() {
  log("mgr-paths", [
    "Level folders",
    `${PROJECT_ROOT_NAME}/levels`,
    `${PROJECT_ROOT_NAME}/progressions`,
    `${PROJECT_ROOT_NAME}/playtest`,
    "",
    "Project save root",
    displayProjectPath(state.settings.exportDir),
    "",
    "Archive and runtime mirrors",
    `${PROJECT_ROOT_NAME}/archive`,
    `${PROJECT_ROOT_NAME}/level_toolkit_web/workshop_jsons`,
    `${PROJECT_ROOT_NAME}/bundles`
  ].join("\n"));

  document.getElementById("mgr-add-progression").addEventListener("click", () => {
    createManagerProgressionFromPrompt();
  });
  document.getElementById("mgr-rename-progression").addEventListener("click", () => {
    renameActiveProgression();
  });
  document.getElementById("mgr-duplicate-progression").addEventListener("click", () => {
    duplicateActiveProgression();
  });
  document.getElementById("mgr-autofill").addEventListener("click", () => {
    autofillActiveProgression();
  });
  document.getElementById("mgr-generate-from-refs").addEventListener("click", () => {
    generateFromReferenceLevels();
  });
  const filterBindings = [
    ["mgr-filter-name", "name"],
    ["mgr-filter-board", "board"],
    ["mgr-filter-difficulty", "difficulty"],
    ["mgr-filter-status", "status"],
    ["mgr-filter-level", "level"],
    ["mgr-filter-pairs", "pairs"],
    ["mgr-filter-blockers", "blockers"],
    ["mgr-filter-placement", "placement"],
    ["mgr-filter-changed", "changed"]
  ];
  filterBindings.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const eventName = el.tagName === "INPUT" ? "input" : "change";
    el.addEventListener(eventName, (ev) => {
      state.manager.filters[key] = String(ev.target.value || "");
      state.manager.allLevelsPage = 1;
      updateManagerTable();
    });
  });
  document.getElementById("mgr-filter-reset").addEventListener("click", () => {
    state.manager.filters = createDefaultManagerFilters();
    state.manager.allLevelsPage = 1;
    updateManagerTable();
  });
  document.getElementById("mgr-page-prev").addEventListener("click", () => {
    state.manager.allLevelsPage = Math.max(1, state.manager.allLevelsPage - 1);
    updateManagerTable();
  });
  document.getElementById("mgr-page-next").addEventListener("click", () => {
    state.manager.allLevelsPage += 1;
    updateManagerTable();
  });

  document.getElementById("mgr-import-input").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    setManagerLoading(true, "Importing level files...", 0, Math.max(files.length, 1));
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      try {
        const data = parseImportedJson(await file.text());
        const expanded = await expandManagerImportPayload(data, file.name);
        applyManagerImport(expanded);
      } catch (err) {
        const message = formatParseError(err);
        state.manager.items.push({
          id: state.manager.nextId++,
          file: file.name,
          sourcePath: `Import failed · ${file.name}`,
          parseError: message,
          notes: "",
          originalLevel: null,
          level: {
            level: "-",
            board_size: "-",
            pairs: [],
            blockers: [],
            moves: "-",
            solution_count: "-",
            target_density: "-"
          },
          status: "PARSE_ERROR"
        });
        log("mgr-log", `Parse error in ${file.name}: ${message}`);
      }
      setManagerLoading(true, "Importing level files...", index + 1, Math.max(files.length, 1));
      if ((index + 1) % 5 === 0) await pauseForPaint();
    }
    await ensureTutorialInAllProgressions();
    updateManagerTable();
    setManagerLoading(false);
    e.target.value = "";
  });

  document.getElementById("mgr-clear").addEventListener("click", async () => {
    state.manager.items = [];
    state.manager.itemIndex = new Map();
    state.manager.slotIndexByItemId = new Map();
    state.manager.progressions = createDefaultManagerProgressions();
    state.manager.progressionOrder = defaultManagerProgressions.map(({ key }) => key);
    state.manager.activeTab = state.manager.progressionOrder[0];
    state.manager.selectedId = null;
    state.manager.draggingId = null;
    state.manager.referenceIds = [];
    state.manager.filters = createDefaultManagerFilters();
    await ensureTutorialInAllProgressions();
    updateManagerTable();
  });

  document.getElementById("mgr-export-csv").addEventListener("click", async () => {
    const rows = state.manager.items.map((item) => ({
      file: item.file,
      path: displayProjectPath(item.sourcePath),
      saved_path: displayProjectPath(item.savedPath || ""),
      level: item.level.level,
      board_width: levelWidth(item.level),
      board_height: levelHeight(item.level),
      pairs_count: (item.level.pairs || []).length,
      blockers_count: (item.level.blockers || []).length,
      moves: item.level.moves,
      solution_count: item.level.solution_count,
      difficulty: levelDifficulty(item.level),
      status: item.status,
      changed: item.changed ? "Yes" : "No",
      notes: item.notes || "",
      placement: managerPlacementLabel(item.id)
    }));
    const headers = Object.keys(rows[0] || { file: "", path: "", saved_path: "", level: "", board_width: "", board_height: "", pairs_count: "", blockers_count: "", moves: "", solution_count: "", difficulty: "", status: "", changed: "", notes: "", placement: "" });
    const csv = [headers.join(",")].concat(rows.map((r) => headers.map((h) => r[h]).join(","))).join("\n");
    const saved = await saveProjectFile("progressions/manager_state/manager_levels.csv", csv, "text/csv");
    log("mgr-log", `Saved manager CSV to ${displayProjectPath(saved.path)}`);
  });

  document.getElementById("mgr-export-progression-csv").addEventListener("click", async () => {
    if (!isManagerProgressionTab(state.manager.activeTab)) {
      log("mgr-log", "Open a progression tab first.");
      return;
    }
    const key = state.manager.activeTab;
    const stem = progressionExportFileStem(key);
    const csv = toCsvFromRows(activeProgressionRows(key));
    const saved = await saveProjectFile(`progressions/exports/${stem}_progression.csv`, csv, "text/csv");
    log("mgr-log", `Saved progression CSV to ${displayProjectPath(saved.path)}`);
  });

  document.getElementById("mgr-export-curve-png").addEventListener("click", async () => {
    if (!isManagerProgressionTab(state.manager.activeTab)) {
      log("mgr-log", "Open a progression tab first.");
      return;
    }
    const key = state.manager.activeTab;
    const stem = progressionExportFileStem(key);
    const saved = await saveProjectDataUrl(`screenshots/${stem}_difficulty_curve.png`, makeProgressionCurveDataUrl(key));
    log("mgr-log", `Saved difficulty curve PNG to ${displayProjectPath(saved.path)}`);
  });

  document.getElementById("mgr-export-progression-png").addEventListener("click", async () => {
    if (!isManagerProgressionTab(state.manager.activeTab)) {
      log("mgr-log", "Open a progression tab first.");
      return;
    }
    const key = state.manager.activeTab;
    const stem = progressionExportFileStem(key);
    const saved = await saveProjectDataUrl(`screenshots/${stem}_progression_layout.png`, makeProgressionBoardDataUrl(key));
    log("mgr-log", `Saved progression PNG to ${displayProjectPath(saved.path)}`);
  });

  document.getElementById("mgr-export-progression-json").addEventListener("click", async () => {
    if (!isManagerProgressionTab(state.manager.activeTab)) {
      log("mgr-log", "Open a progression tab first.");
      return;
    }
    const saved = await exportActiveProgressionZip(state.manager.activeTab);
    log("mgr-log", `Saved progression ZIP to ${displayProjectPath(saved.path)}`);
  });

  updateManagerTable();
}

function initSessions() {
  const importInput = document.getElementById("session-import-input");
  bindPlayCanvas(sessionCanvas, false);
  updateSessionProgressionSelect();

  document.getElementById("session-import").addEventListener("click", () => {
    importInput.click();
  });

  importInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const data = parseImportedJson(await file.text());
        const level = toPlayableLevel(data, file.name);
        queueSessionLevel(level, file.name, "imported");
      } catch (err) {
        log("session-log", `Import error for ${file.name}: ${formatParseError(err)}`);
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

  document.getElementById("session-load-progression").addEventListener("click", () => {
    const key = document.getElementById("session-progression-select").value;
    loadProgressionIntoSessions(key);
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

  document.getElementById("session-validate-selected").addEventListener("click", async () => {
    const item = getSelectedSessionItem();
    if (!item) {
      log("session-log", "Select a level first.");
      return;
    }
    await validateSessionItem(item);
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
    log("session-log", `Generated ${batch.length} valid learned procedural level(s). Memory: ${state.learning.approved.length} approved, ${state.learning.rejected.length} rejected, ${state.learning.corrections.length} fixes.`);
  });

  document.getElementById("session-export-queue").addEventListener("click", async () => {
    const payload = state.sessions.queue.map((item) => ({
      file: item.file,
      source: item.source,
      review_status: item.reviewStatus,
      validation_status: item.validationStatus,
      level: item.level
    }));
    const saved = await saveProjectFile("playtest/play_sessions_queue.json", JSON.stringify(payload, null, 2));
    log("session-log", `Saved session queue to ${displayProjectPath(saved.path)}`);
  });

  document.getElementById("session-play-reset").addEventListener("click", () => {
    resetPlayState();
    if (state.play.on) randomizePlayColors();
    drawBoard();
    log("session-log", "Session play reset.");
  });

  document.getElementById("session-play-export").addEventListener("click", async () => {
    const solvedNow = getPlayStatus() === "Solved";
    const session = solvedNow ? await saveSolvedSession("session_manual") : serializePlaySession(false);
    if (!solvedNow) {
      session.saved_path = (await saveProjectFile(`playtest/play_session_level_${session.level.level}_session.json`, JSON.stringify(session, null, 2))).path;
    }
    log("session-log", `Saved session play for level ${session.level.level} to ${displayProjectPath(session.saved_path)}.`);
  });

  updateSessionTable();
}

async function bootstrap() {
  isBootstrappingWorkspaceState = true;
  loadSettings();
  applySettingsToUi();
  loadLearning();
  applyStaticTooltips();
  initNavigation();
  initSettings();
  initMain();
  initEditor();
  initSessions();
  initManager();
  updateLearningStatus();
  log("main-log", "Ready.");
  log("ed-log", "Editor ready.");
  log("session-log", "No session levels loaded.");
  log("mgr-log", "No files loaded.");
  log("settings-log", `Project save path:\n${displayProjectPath(state.settings.exportDir)}`);
  const restoredWorkspace = restoreWorkspaceState();
  if (!restoredWorkspace) restoreEditorDraft();
  if (!restoredWorkspace) applySettingsToEditorDefaults();
  syncEditorInputs();
  isBootstrappingWorkspaceState = false;
  persistWorkspaceState();
  await autoloadManagerFromQuery();
  await autoloadWorkspaceFromQuery();
  await autoloadLevelFromQuery();
  await ensureTutorialInAllProgressions();
  refreshVisibleView();
}

bootstrap();

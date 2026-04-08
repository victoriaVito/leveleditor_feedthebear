const curve = {
  1: { density: "HIGH", board: [4], pairs: [2, 2], blockers: [0, 0] },
  2: { density: "HIGH", board: [4], pairs: [2, 3], blockers: [0, 1] },
  3: { density: "MEDIUM-HIGH", board: [4, 5], pairs: [2, 3], blockers: [1, 2] },
  4: { density: "MEDIUM", board: [5], pairs: [3, 4], blockers: [1, 2] },
  5: { density: "MEDIUM", board: [5, 6], pairs: [3, 4], blockers: [1, 3] },
  6: { density: "MEDIUM-LOW", board: [6], pairs: [4, 5], blockers: [2, 3] },
  7: { density: "LOW", board: [6, 7], pairs: [4, 6], blockers: [2, 4] },
  8: { density: "VERY-LOW", board: [7], pairs: [5, 7], blockers: [2, 4] },
  9: { density: "SINGLE", board: [7], pairs: [5, 7], blockers: [3, 5] },
  10: { density: "LOW-MEDIUM", board: [7], pairs: [6, 8], blockers: [3, 5] }
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

const FISH_COLOR_SEQUENCE = [
  { letter: "A", id: "fish_red", hex: "#EF4444" },
  { letter: "B", id: "fish_red_striped", hex: "#FCA5A5" },
  { letter: "C", id: "fish_blue", hex: "#0EA5E9" },
  { letter: "D", id: "fish_blue_striped", hex: "#7DD3FC" },
  { letter: "E", id: "fish_green", hex: "#10B981" },
  { letter: "F", id: "fish_green_striped", hex: "#A7F3D0" },
  { letter: "G", id: "fish_yellow", hex: "#FBBF24" },
  { letter: "H", id: "fish_yellow_striped", hex: "#FEE2A3" },
  { letter: "I", id: "fish_orange", hex: "#F97316" },
  { letter: "J", id: "fish_orange_striped", hex: "#FDBA74" },
  { letter: "K", id: "fish_purple", hex: "#A855F7" },
  { letter: "L", id: "fish_purple_striped", hex: "#D8B4FE" },
  { letter: "M", id: "fish_cyan", hex: "#0891B2" },
  { letter: "N", id: "fish_cyan_striped", hex: "#67E8F9" }
];
const FISH_COLOR_BY_ID = Object.fromEntries(FISH_COLOR_SEQUENCE.map((entry) => [entry.id, entry]));
const FISH_COLOR_BY_TYPE = Object.fromEntries(FISH_COLOR_SEQUENCE.map((entry) => [entry.id.replace("fish_", ""), entry]));
const FISH_COLOR_BY_HEX = Object.fromEntries(FISH_COLOR_SEQUENCE.map((entry) => [entry.hex.toUpperCase(), entry]));
const PAIR_IDS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const pairColors = FISH_COLOR_SEQUENCE.slice(0, PAIR_IDS.length).map((entry) => entry.hex);
const MIN_BOARD_SIZE = 4;
const MAX_BOARD_WIDTH = 7;
const MAX_BOARD_HEIGHT = 8;
const MAX_SQUARE_BOARD_SIZE = 7;
const BOARD_SIZE_LIMIT_TEXT = "4x4 up to 7x7, with 7x8 as the largest supported rectangle";
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
const playPalette = FISH_COLOR_SEQUENCE.map((entry) => entry.hex);
const PROJECT_ROOT = "/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally";
const DEFAULT_PROJECT_SAVE_DIR = PROJECT_ROOT;
const DEFAULT_MANAGER_OUTPUT_DIR = `${PROJECT_ROOT}/bundles`;
const DEFAULT_SPREADSHEET_WORKBOOK_PATH = `${PROJECT_ROOT}/output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx`;
const DEFAULT_GOOGLE_SPREADSHEET_ID = "1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c";
const DEFAULT_SPREADSHEET_WEB_APP_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_GOOGLE_SPREADSHEET_ID}/pubhtml?widget=true&headers=false`;
const DEFAULT_GOOGLE_SYNC_METHOD = "sheets_api";
const DEFAULT_GOOGLE_CLIENT_PATH = `${PROJECT_ROOT}/.local/google_oauth_client.json`;
const DEFAULT_GOOGLE_TOKEN_PATH = `${PROJECT_ROOT}/.local/google_sheets_token.json`;
const PROJECT_ROOT_NAME = basename(PROJECT_ROOT);
const TUTORIAL_LEVEL_BASENAME = "tutorial_level.json";
const MANAGER_SLOT_COUNT = 11;
const FIRST_PLAYABLE_SLOT_INDEX = 1;
const MAX_PLAYABLE_SLOT_INDEX = MANAGER_SLOT_COUNT - 1;
const PLAYABLE_LEVEL_COUNT = MANAGER_SLOT_COUNT - 1;
const defaultManagerProgressions = [
  { key: "progressionA", label: "Progression A" },
  { key: "progressionB", label: "Progression B" },
  { key: "progressionC", label: "Progression C" }
];

function isSupportedBoardSize(width, height) {
  return width >= MIN_BOARD_SIZE && width <= MAX_BOARD_WIDTH && height >= MIN_BOARD_SIZE && height <= MAX_BOARD_HEIGHT;
}

function createManagerProgression(label) {
  return {
    label,
    slots: Array(MANAGER_SLOT_COUNT).fill(null),
    lockedSlots: Array(MANAGER_SLOT_COUNT).fill(false),
    slotDifficulty: Array(MANAGER_SLOT_COUNT).fill(""),
    locked: false
  };
}

function progressionConfigEntryIsTutorial(slot) {
  return !!slot && (slot.status === "reserved" || slot.label === "TUTORIAL" || Number(slot.slot) === 0);
}

function slotNumberFromIndex(slotIndex) {
  return isTutorialSlotIndex(slotIndex) ? 0 : slotIndex;
}

function displaySlotLabel(slotIndex) {
  return isTutorialSlotIndex(slotIndex) ? "Slot 0 · Tutorial" : `Level ${slotIndex}`;
}

function normalizeManagerSlotArray(values, fillValue = null) {
  const list = Array.isArray(values) ? [...values] : [];
  if (list.length >= MANAGER_SLOT_COUNT) return list;
  if (list.length === MANAGER_SLOT_COUNT - 1) {
    return [list[0] ?? fillValue, fillValue, ...list.slice(1), ...Array(Math.max(0, MANAGER_SLOT_COUNT - (list.length + 1))).fill(fillValue)];
  }
  return [...list, ...Array(Math.max(0, MANAGER_SLOT_COUNT - list.length)).fill(fillValue)];
}

function createDefaultManagerProgressions() {
  return Object.fromEntries(defaultManagerProgressions.map(({ key, label }) => [key, createManagerProgression(label)]));
}

function isManagerProgressionLocked(key) {
  return !!getManagerProgression(key)?.locked;
}

function logManagerProgressionLocked(key = state.manager.activeTab, logId = "mgr-log") {
  if (!isManagerProgressionTab(key)) return;
  log(logId, [
    "Locked liveops",
    `${getManagerProgressionLabel(key)} is locked.`,
    "Unlock it before changing slots, saving editor levels into it, or clearing it."
  ]);
}

function ensureManagerProgressionUnlocked(key = state.manager.activeTab, logId = "mgr-log") {
  if (!isManagerProgressionTab(key)) return true;
  if (!isManagerProgressionLocked(key)) return true;
  logManagerProgressionLocked(key, logId);
  return false;
}

function hydrateManagerItems(items = []) {
  return (items || []).map((item) => ({
    ...item,
    changed: !!item.changed,
    notes: item.notes || "",
    savedPath: item.savedPath || "",
    screenshotPath: item.screenshotPath || "",
    originalLevel: item.originalLevel ? cloneLevel(item.originalLevel) : (item.level ? cloneLevel(item.level) : null),
    previewDataUrl: item.previewDataUrl || null
  }));
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
    referenceTrails: Object.fromEntries(PAIR_IDS.map((id) => [id, []])),
    traceDraft: null,
    pairs: Object.fromEntries(PAIR_IDS.map((id) => [id, { start: null, end: null }])),
    variantAdjustments: {
      pairs: "same",
      blockers: "same",
      board: "same"
    },
    variantCandidates: [],
    progressionKey: "progressionA",
    progressionSlot: 1,
    link: { sourceType: "standalone", sourceId: null, label: "Standalone level" },
    dirty: false,
    lastSavedAt: null
  };
}

function createDefaultProceduralReferenceState() {
  return {
    baseLevel: null,
    baseFileName: "",
    adjustments: {
      pairs: "same",
      blockers: "same",
      board: "same"
    },
    candidates: [],
    nextCandidateId: 1
  };
}

function createDefaultVitoBotState() {
  return {
    source: "folder",
    folder: "levels/otherLevels",
    pattern: "procedular_reference_large_*.json",
    profile: "average",
    persona: "balanced",
    intelligence: 55,
    runs: 25,
    running: false,
    selectedResultLabel: "",
    loadedLevels: [],
    results: [],
    summary: null
  };
}

const state = {
  main: createDefaultProceduralReferenceState(),
  vitobot: createDefaultVitoBotState(),
  editor: createDefaultEditorState(),
  progression: [],
  proceduralBatch: [],
  manager: {
    items: [],
    itemIndex: new Map(),
    slotIndexByItemId: new Map(),
    extraIds: [],
    discardedIds: [],
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
    nextId: 1,
    loading: {
      active: false,
      label: "",
      current: 0,
      total: 0
    }
  },
  learning: {
    approved: [],
    rejected: [],
    corrections: []
  },
  settings: {
    exportDir: DEFAULT_PROJECT_SAVE_DIR,
    managerOutputDir: DEFAULT_MANAGER_OUTPUT_DIR,
    spreadsheetWorkbookPath: DEFAULT_SPREADSHEET_WORKBOOK_PATH,
    spreadsheetId: DEFAULT_GOOGLE_SPREADSHEET_ID,
    googleSyncMethod: DEFAULT_GOOGLE_SYNC_METHOD,
    googleClientPath: DEFAULT_GOOGLE_CLIENT_PATH,
    googleTokenPath: DEFAULT_GOOGLE_TOKEN_PATH,
    spreadsheetWebAppUrl: DEFAULT_SPREADSHEET_WEB_APP_URL,
    autoSyncSheetDb: true,
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
const MAX_BROWSER_BACKUP_SNAPSHOT_BYTES = 600_000;
const LOCAL_STORE_SNAPSHOT_MAP = {
  learning: LEARNING_KEY,
  play_session: PLAY_SESSION_KEY,
  play_session_export_dir: PLAY_SESSION_EXPORT_DIR_KEY,
  editor_draft: EDITOR_DRAFT_KEY,
  workspace_state: WORKSPACE_STATE_KEY,
  settings: SETTINGS_KEY
};
const CANONICAL_STATE_PATHS = {
  workspace: ".local/toolkit_state/workspace_state.json",
  learning: ".local/toolkit_state/learning_state.json",
  editor: ".local/toolkit_state/editor_state.json",
  editorDraft: ".local/toolkit_state/editor_draft.json",
  manager: ".local/toolkit_state/manager_state.json",
  sessions: ".local/toolkit_state/play_sessions_state.json",
  latestPlaytest: "playtest/latest_play_session.json",
  managerMetadata: "progressions/manager_state/level_manager_metadata.json"
};
let browserSyncTimer = null;
let browserSyncInFlight = false;
let isRestoringWorkspaceState = false;
let isBootstrappingWorkspaceState = true;
let workspacePersistTimer = null;
let managerMetadataSaveTimer = null;
let canonicalStateSaveTimer = null;
let canonicalStateInFlight = false;
let pendingCanonicalStatePayload = null;
let lastCanonicalStateSignature = "";
let lastManagerMetadataSignature = "";
let lastSessionProgressionSelectSignature = "";
const managerItemMaterializeSignatures = new Map();
const progressionMaterializeSignatures = new Map();

function coordKey(r, c) { return `${r},${c}`; }
function parseKey(k) { return k.split(",").map(Number); }
function createEmptyReferenceTrails() {
  return Object.fromEntries(PAIR_IDS.map((id) => [id, []]));
}
function normalizeReferenceTrails(raw) {
  const next = createEmptyReferenceTrails();
  if (!raw || typeof raw !== "object") return next;
  PAIR_IDS.forEach((id) => {
    const cells = Array.isArray(raw[id]) ? raw[id] : [];
    next[id] = cells
      .filter((cell) => Array.isArray(cell) && cell.length === 2 && Number.isFinite(Number(cell[0])) && Number.isFinite(Number(cell[1])))
      .map(([r, c]) => [Number(r), Number(c)]);
  });
  return next;
}
function parseImportedJson(text) {
  const normalized = String(text ?? "").replace(/^\uFEFF/, "").trim();
  return JSON.parse(normalized);
}
async function repoFileStatus(relativePath, baseDir = ".") {
  const params = new URLSearchParams({
    relativePath: String(relativePath || "").replace(/^\.\/+/, ""),
    baseDir
  });
  const response = await fetch(`/api/file-status?${params.toString()}`);
  if (!response.ok) throw new Error(`Repo file status failed (${response.status})`);
  return response.json();
}
async function repoUrlExists(url) {
  const normalized = String(url || "").trim();
  if (!normalized.startsWith("./")) return true;
  try {
    const status = await repoFileStatus(normalized.slice(2), ".");
    return !!status.exists;
  } catch (_err) {
    return false;
  }
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
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  return Number(level?.gridSize?.cols || level?.gridSize?.width || level?.board_width || level?.board_size || level?.grid?.[0]?.length || 0);
}
function levelHeight(level) {
  return Number(level?.gridSize?.rows || level?.gridSize?.height || level?.board_height || level?.board_size || level?.grid?.length || 0);
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

function getFishEntryById(colorId) {
  return FISH_COLOR_BY_ID[colorId] || null;
}

function getFishEntryByType(type, paletteIndex = 0) {
  return FISH_COLOR_BY_TYPE[type] || FISH_COLOR_SEQUENCE[paletteIndex % FISH_COLOR_SEQUENCE.length];
}

function getFishEntryByHex(hex, paletteIndex = 0) {
  return FISH_COLOR_BY_HEX[String(hex || "").trim().toUpperCase()] || FISH_COLOR_SEQUENCE[paletteIndex % FISH_COLOR_SEQUENCE.length];
}

function inferFishEntryFromPair(pair, paletteIndex = 0) {
  if (pair?.fish_color_id && getFishEntryById(pair.fish_color_id)) return getFishEntryById(pair.fish_color_id);
  if (pair?.type) return getFishEntryByType(pair.type, paletteIndex);
  if (pair?.color) return getFishEntryByHex(pair.color, paletteIndex);
  return FISH_COLOR_SEQUENCE[paletteIndex % FISH_COLOR_SEQUENCE.length];
}

function pairTypeForImportedPair(pair, index = 0) {
  return inferFishEntryFromPair(pair, index).id.replace("fish_", "");
}

function developerPointFromStoredCell(cell) {
  return { x: Number(cell?.[1] || 0), y: Number(cell?.[0] || 0) };
}

function storedCellFromDeveloperPoint(point) {
  return [Number(point?.y || 0), Number(point?.x || 0)];
}

function developerDifficultyTierForLevel(level) {
  const explicitTier = Number(level?.difficultyTier);
  if (Number.isFinite(explicitTier) && explicitTier >= 1) return Math.min(10, Math.max(1, explicitTier));
  const explicitLevel = Number(level?.level);
  if (Number.isFinite(explicitLevel) && explicitLevel >= 1) return Math.min(10, Math.max(1, explicitLevel));
  const width = levelWidth(level);
  const height = levelHeight(level);
  return Math.min(10, Math.max(1, Math.ceil((width + height) / 2)));
}

function levelIdForStorage(level, preferredName = "") {
  const raw = String(level?.id || preferredName || level?.meta?.source_name || `level_${level?.level || 1}.json`);
  return basename(raw).replace(/\.json$/i, "");
}

function levelTier(level) {
  const explicitTier = Number(level?.difficultyTier);
  if (Number.isFinite(explicitTier) && explicitTier >= 1) return explicitTier;
  const explicitLevel = Number(level?.level);
  if (Number.isFinite(explicitLevel) && explicitLevel >= 1) return explicitLevel;
  return developerDifficultyTierForLevel(level);
}

function levelLabel(level, preferredName = "") {
  const id = String(level?.id || "").trim();
  if (id) return id;
  return levelIdForStorage(level, preferredName);
}

function levelSolutionCount(level) {
  const camel = Number(level?.solutionCount);
  if (Number.isFinite(camel)) return camel;
  const snake = Number(level?.solution_count);
  return Number.isFinite(snake) ? snake : 0;
}

function levelGoldenPath(level) {
  return level?.goldenPath || level?.golden_path || {};
}

function serializeLevelToDeveloperFormat(level, preferredName = "") {
  const id = levelIdForStorage(level, preferredName);
  const pairs = (level?.pairs || []).map((pair, index) => ({
    type: pairTypeForImportedPair(pair, index),
    a: developerPointFromStoredCell(pair.start),
    b: developerPointFromStoredCell(pair.end),
  }));
  const blockers = (level?.blockers || []).map((cell) => developerPointFromStoredCell(cell));
  const serialized = {
    id,
    difficultyTier: developerDifficultyTierForLevel(level),
    gridSize: {
      cols: levelWidth(level),
      rows: levelHeight(level),
    },
    moves: Number(level?.moves || 0),
    pairs,
  };
  if (blockers.length) serialized.blockers = blockers;
  if (level?.solution_count !== undefined) serialized.solutionCount = level.solution_count;
  if (level?.target_density !== undefined) serialized.targetDensity = level.target_density;
  if (level?.golden_path !== undefined) serialized.goldenPath = level.golden_path;
  if (level?.meta !== undefined) serialized.meta = level.meta;
  if (level?.description !== undefined) serialized.description = level.description;
  if (level?.validation !== undefined) serialized.validation = level.validation;
  if (level?.decal !== undefined) serialized.decal = level.decal;
  return serialized;
}

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
    if (p.start && p.end) {
      const fishEntry = getFishEntryByHex(pairColors[i], i);
      out.push({
        id,
        start: p.start,
        end: p.end,
        color: fishEntry.hex,
        fish_color_id: fishEntry.id,
        color_letter: fishEntry.letter
      });
    }
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

function normalizeHexColor(value, fallback = "#0b1b2a") {
  const hex = String(value || "").trim().replace("#", "");
  if (hex.length === 3) {
    return `#${hex.split("").map((part) => `${part}${part}`).join("")}`;
  }
  if (hex.length === 6) return `#${hex}`;
  return fallback;
}

function colorLuminance(value) {
  const hex = normalizeHexColor(value).replace("#", "");
  const channels = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const normalized = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return normalized[0] * 0.2126 + normalized[1] * 0.7152 + normalized[2] * 0.0722;
}

function readableTextColor(value) {
  return colorLuminance(value) > 0.42 ? "#0b1b2a" : "#ffffff";
}

function edgeLabelColor(value) {
  return colorLuminance(value) > 0.55 ? "rgba(11, 27, 42, 0.82)" : "rgba(255, 255, 255, 0.96)";
}

function colorWithAlpha(value, alpha = 1) {
  const hex = normalizeHexColor(value).replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function selectedEditorPairId() {
  return document.getElementById("ed-pair-id")?.value || PAIR_IDS[0];
}

function editorPairPointCount(pairId) {
  const pair = state.editor.pairs?.[pairId];
  if (!pair) return 0;
  let count = 0;
  if (pair.start) count += 1;
  if (pair.end) count += 1;
  return count;
}

function cloneVariantCandidate(candidate) {
  return {
    ...candidate,
    level: cloneLevel(candidate.level),
    referenceIntent: normalizeProceduralReferenceAdjustments(candidate.referenceIntent),
    discardDraftPairs: Array.isArray(candidate.discardDraftPairs) ? [...candidate.discardDraftPairs] : [],
    discardPairIds: Array.isArray(candidate.discardPairIds) ? [...candidate.discardPairIds] : []
  };
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
  const baseDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const memo = new Map();
  const deadline = Date.now() + 5000; // 5 s time-limit to avoid browser hang

  // Precomputed direction tables: for each (sign_dr, sign_dc) pair, store
  // the base directions sorted so moves toward the target are tried first.
  // This makes the DFS find shorter paths earlier, which is critical for
  // avoiding false-negative 0-solution results on tight boards.
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
    if (out.length >= localCap) return;
    if (Date.now() > deadline) return;

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
      if (out.length >= localCap) return;
      if (Date.now() > deadline) return;
    }
  }

  function enumeratePairPaths(start, end, occ, localCap = 200) {
    const paths = [];
    pathDfs(start, end, occ, [start], paths, localCap);
    paths.sort((a, b) => a.length - b.length);
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

function findOneSolutionPaths(boardWidth, boardHeight, pairs, blockers) {
  const blockedSet = new Set(blockers.map(([r, c]) => coordKey(r, c)));
  const baseDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const deadline = Date.now() + 5000;

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
    if (out.length >= localCap) return;
    if (Date.now() > deadline) return;

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
      if (out.length >= localCap) return;
    }
  }

  function enumeratePairPaths(start, end, occ, localCap = 200) {
    const paths = [];
    pathDfs(start, end, occ, [start], paths, localCap);
    paths.sort((a, b) => a.length - b.length);
    return paths;
  }

  function dfs(idx, occ, solution) {
    if (idx === pairs.length) return solution;
    const p = pairs[idx];
    const startK = coordKey(p.start[0], p.start[1]);
    const endK = coordKey(p.end[0], p.end[1]);
    const localOcc = new Set(occ);
    localOcc.add(startK);
    const paths = enumeratePairPaths(p.start, p.end, localOcc, 200);

    for (const path of paths) {
      const nextOcc = new Set(occ);
      path.forEach(([r, c]) => {
        const k = coordKey(r, c);
        if (k !== endK) nextOcc.add(k);
      });
      const nextSolution = { ...solution, [p.id]: path.map(([r, c]) => [r, c]) };
      const result = dfs(idx + 1, nextOcc, nextSolution);
      if (result) return result;
    }
    return null;
  }

  return dfs(0, blockedSet, {});
}

function findSampleSolutions(boardWidth, boardHeight, pairs, blockers, cap = 4) {
  const blockedSet = new Set(blockers.map(([r, c]) => coordKey(r, c)));
  const baseDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const solutions = [];
  const deadline = Date.now() + 5000;

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
    if (out.length >= localCap) return;
    if (Date.now() > deadline) return;

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
      if (out.length >= localCap) return;
    }
  }

  function enumeratePairPaths(start, end, occ, localCap = 60) {
    const paths = [];
    pathDfs(start, end, occ, [start], paths, localCap);
    paths.sort((a, b) => a.length - b.length);
    return paths;
  }

  function dfs(idx, occ, solution) {
    if (solutions.length >= cap) return;
    if (idx === pairs.length) {
      solutions.push(solution);
      return;
    }
    const pair = pairs[idx];
    const startK = coordKey(pair.start[0], pair.start[1]);
    const endK = coordKey(pair.end[0], pair.end[1]);
    const localOcc = new Set(occ);
    localOcc.add(startK);
    const paths = enumeratePairPaths(pair.start, pair.end, localOcc, 60);

    for (const path of paths) {
      const nextOcc = new Set(occ);
      path.forEach(([r, c]) => {
        const k = coordKey(r, c);
        if (k !== endK) nextOcc.add(k);
      });
      dfs(idx + 1, nextOcc, { ...solution, [pair.id]: path.map(([r, c]) => [r, c]) });
      if (solutions.length >= cap) return;
    }
  }

  dfs(0, blockedSet, {});
  return solutions;
}

function hasFullCoverSolution(boardWidth, boardHeight, pairs, blockers) {
  const blockedSet = new Set(blockers.map(([r, c]) => coordKey(r, c)));
  const totalFreeCells = (boardWidth * boardHeight) - blockedSet.size;
  const baseDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const memo = new Map();
  const deadline = Date.now() + 5000;

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
    if (out.length >= localCap) return;
    if (Date.now() > deadline) return;

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
      if (out.length >= localCap) return;
    }
  }

  function enumeratePairPaths(start, end, occ, localCap = 200) {
    const paths = [];
    pathDfs(start, end, occ, [start], paths, localCap);
    paths.sort((a, b) => a.length - b.length);
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
    level: levelTier(level),
    boardWidth: levelWidth(level),
    boardHeight: levelHeight(level),
    pairs: (level.pairs || []).length,
    blockers: (level.blockers || []).length,
    moves: level.moves || 0,
    solutions: levelSolutionCount(level)
  };
}

function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

function levelSnapshotsMatch(left, right) {
  if (!left || !right) return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch (_err) {
    return false;
  }
}

function candidateNameStem(value, defaultStem = "generated_variant") {
  const normalized = normalizeLevelFileName(value || defaultStem).replace(/\.json$/i, "");
  const safe = slugifyFilePart(normalized);
  return safe || slugifyFilePart(defaultStem) || "generated_variant";
}

function levelFeatureSummary(level) {
  return `${levelWidth(level)}x${levelHeight(level)} · ${(level.pairs || []).length} pairs · ${(level.blockers || []).length} blockers · ${levelSolutionCount(level)} solutions · ${level.moves || 0} moves`;
}

function normalizeProceduralReferenceAdjustments(value) {
  const raw = value && typeof value === "object" ? value : {};
  const pairs = ["less", "same", "more"].includes(raw.pairs) ? raw.pairs : "same";
  const blockers = ["less", "same", "more"].includes(raw.blockers) ? raw.blockers : "same";
  const board = ["smaller", "same", "bigger"].includes(raw.board) ? raw.board : "same";
  return { pairs, blockers, board };
}

function proceduralReferenceAdjustmentLabel(kind, value) {
  if (kind === "board") {
    if (value === "smaller") return "smaller board";
    if (value === "bigger") return "bigger board";
    return "same board";
  }
  if (kind === "pairs") {
    if (value === "less") return "fewer pairs";
    if (value === "more") return "more pairs";
    return "same pairs";
  }
  if (kind === "blockers") {
    if (value === "less") return "fewer blockers";
    if (value === "more") return "more blockers";
    return "same blockers";
  }
  return String(value || "same");
}

function proceduralReferenceIntentText(adjustments) {
  const normalized = normalizeProceduralReferenceAdjustments(adjustments);
  return `Intent: ${proceduralReferenceAdjustmentLabel("pairs", normalized.pairs)} · ${proceduralReferenceAdjustmentLabel("blockers", normalized.blockers)} · ${proceduralReferenceAdjustmentLabel("board", normalized.board)}`;
}

function proceduralReferenceHasActiveIntent(adjustments) {
  const normalized = normalizeProceduralReferenceAdjustments(adjustments);
  return normalized.pairs !== "same" || normalized.blockers !== "same" || normalized.board !== "same";
}

function directionalPenalty(delta, intent, sameWeight = 0.9, oppositeWeight = 3.4) {
  if (intent === "same") return Math.abs(delta) * sameWeight;
  if (intent === "more" || intent === "bigger") {
    if (delta > 0) return 0;
    if (delta === 0) return 0.65;
    return Math.abs(delta) * oppositeWeight;
  }
  if (intent === "less" || intent === "smaller") {
    if (delta < 0) return 0;
    if (delta === 0) return 0.65;
    return Math.abs(delta) * oppositeWeight;
  }
  return Math.abs(delta) * sameWeight;
}

function proceduralReferenceIntentPenalty(baseLevel, candidate, adjustments) {
  const baseFeatures = extractFeatures(baseLevel);
  const candidateFeatures = extractFeatures(candidate);
  const baseArea = baseFeatures.boardWidth * baseFeatures.boardHeight;
  const candidateArea = candidateFeatures.boardWidth * candidateFeatures.boardHeight;
  const normalized = normalizeProceduralReferenceAdjustments(adjustments);
  return (
    directionalPenalty(candidateFeatures.pairs - baseFeatures.pairs, normalized.pairs, 0.85, 3.2) +
    directionalPenalty(candidateFeatures.blockers - baseFeatures.blockers, normalized.blockers, 0.9, 3.5) +
    directionalPenalty(candidateArea - baseArea, normalized.board, 0.55, 2.7)
  );
}

function rankedReferenceGenerationLevels(baseLevel, adjustments) {
  const normalized = normalizeProceduralReferenceAdjustments(adjustments);
  const baseFeatures = extractFeatures(baseLevel);
  const baseArea = baseFeatures.boardWidth * baseFeatures.boardHeight;
  return Object.entries(curve).map(([key, cfg]) => {
    const levelNumber = Number(key);
    const avgBoard = ((cfg.board?.[0] || baseFeatures.boardWidth) + (cfg.board?.[1] || cfg.board?.[0] || baseFeatures.boardWidth)) / 2;
    const avgPairs = ((cfg.pairs?.[0] || baseFeatures.pairs) + (cfg.pairs?.[1] || cfg.pairs?.[0] || baseFeatures.pairs)) / 2;
    const avgBlockers = ((cfg.blockers?.[0] || baseFeatures.blockers) + (cfg.blockers?.[1] || cfg.blockers?.[0] || baseFeatures.blockers)) / 2;
    const approxArea = avgBoard * avgBoard;
    const score =
      directionalPenalty(avgPairs - baseFeatures.pairs, normalized.pairs, 0.8, 2.8) +
      directionalPenalty(avgBlockers - baseFeatures.blockers, normalized.blockers, 0.8, 3.0) +
      directionalPenalty(approxArea - baseArea, normalized.board, 0.5, 2.4) +
      Math.abs(levelNumber - Number(baseFeatures.level || 1)) * 0.2;
    return { levelNumber, score };
  }).sort((left, right) => left.score - right.score).map((entry) => entry.levelNumber);
}

function levelPathDirections(cells) {
  if (!Array.isArray(cells) || cells.length < 2) return "No route";
  const names = [];
  for (let i = 1; i < cells.length; i++) {
    const [prevR, prevC] = cells[i - 1];
    const [nextR, nextC] = cells[i];
    if (nextR === prevR && nextC === prevC + 1) names.push("Right");
    else if (nextR === prevR && nextC === prevC - 1) names.push("Left");
    else if (nextR === prevR + 1 && nextC === prevC) names.push("Down");
    else if (nextR === prevR - 1 && nextC === prevC) names.push("Up");
  }
  return names.join(" -> ");
}

function levelGoldenPathSummary(level) {
  const lines = [];
  const golden = level?.golden_path || {};
  Object.entries(golden).forEach(([pairId, cells]) => {
    lines.push(`${pairId}: ${levelPathDirections(cells)}`);
  });
  return lines.join("\n");
}

function levelGoldenPathCellCount(level) {
  const golden = level?.golden_path || level?.goldenPath || {};
  const occupied = new Set();
  Object.values(golden).forEach((cells) => {
    if (!Array.isArray(cells)) return;
    cells.forEach((cell) => {
      if (!Array.isArray(cell) || cell.length < 2) return;
      occupied.add(coordKey(cell[0], cell[1]));
    });
  });
  return occupied.size;
}

function levelPathCoverageRatio(level) {
  const width = levelWidth(level);
  const height = levelHeight(level);
  const blockers = level?.blockers || [];
  const freeCells = Math.max(1, width * height - blockers.length);
  return levelGoldenPathCellCount(level) / freeCells;
}

function pathBendCount(cells) {
  if (!Array.isArray(cells) || cells.length < 3) return 0;
  let bends = 0;
  for (let i = 2; i < cells.length; i++) {
    const [r0, c0] = cells[i - 2];
    const [r1, c1] = cells[i - 1];
    const [r2, c2] = cells[i];
    const dirA = [r1 - r0, c1 - c0];
    const dirB = [r2 - r1, c2 - c1];
    if (dirA[0] !== dirB[0] || dirA[1] !== dirB[1]) bends += 1;
  }
  return bends;
}

function pathMinimumBendsForPair(pair) {
  if (!pair?.start || !pair?.end) return 0;
  return pair.start[0] === pair.end[0] || pair.start[1] === pair.end[1] ? 0 : 1;
}

function levelPathStraightnessSignals(level) {
  const golden = level?.golden_path || level?.goldenPath || {};
  const pairMap = new Map((level?.pairs || []).map((pair) => [pair.id, pair]));
  let totalSteps = 0;
  let totalBends = 0;
  let totalExcessBends = 0;
  let routedPairs = 0;

  Object.entries(golden).forEach(([pairId, cells]) => {
    if (!Array.isArray(cells) || cells.length < 2) return;
    const pair = pairMap.get(pairId);
    const steps = Math.max(0, cells.length - 1);
    const bends = pathBendCount(cells);
    const excessBends = Math.max(0, bends - pathMinimumBendsForPair(pair));
    totalSteps += steps;
    totalBends += bends;
    totalExcessBends += excessBends;
    routedPairs += 1;
  });

  const bendPressure = totalExcessBends / Math.max(1, totalSteps);
  const straightness = Math.max(0, 1 - bendPressure * 2.5);

  return {
    routedPairs,
    totalSteps,
    totalBends,
    totalExcessBends,
    bendsPerPair: totalBends / Math.max(1, routedPairs),
    excessBendsPerPair: totalExcessBends / Math.max(1, routedPairs),
    bendPressure,
    straightness
  };
}

function blockerUsefulnessSignals(level, width, height, pairs, blockers) {
  const golden = level?.golden_path || level?.goldenPath || {};
  const normalizedPairs = Array.isArray(pairs) ? pairs : [];
  const pairPaths = normalizedPairs.map((pair) => ({
    id: pair.id,
    cells: Array.isArray(golden[pair.id]) ? golden[pair.id] : []
  }));
  if (!blockers.length) {
    return {
      engagedBlockerRatio: 1,
      deadBlockerRatio: 0,
      multiPairBlockerRatio: 0,
      pairPressureCoverage: 0
    };
  }

  let engagedBlockers = 0;
  let deadBlockers = 0;
  let multiPairBlockers = 0;
  const pressuredPairs = new Set();

  blockers.forEach(([r, c]) => {
    let nearestDistance = Number.POSITIVE_INFINITY;
    let pressuredPairCount = 0;
    pairPaths.forEach((entry) => {
      let pairNearest = Number.POSITIVE_INFINITY;
      entry.cells.forEach((cell) => {
        if (!Array.isArray(cell) || cell.length < 2) return;
        const distance = Math.abs(cell[0] - r) + Math.abs(cell[1] - c);
        pairNearest = Math.min(pairNearest, distance);
        nearestDistance = Math.min(nearestDistance, distance);
      });
      if (pairNearest <= 2) {
        pressuredPairCount += 1;
        pressuredPairs.add(entry.id);
      }
    });
    if (nearestDistance <= 2) engagedBlockers += 1;
    if (nearestDistance > 2) deadBlockers += 1;
    if (pressuredPairCount >= 2) multiPairBlockers += 1;
  });

  return {
    engagedBlockerRatio: engagedBlockers / Math.max(1, blockers.length),
    deadBlockerRatio: deadBlockers / Math.max(1, blockers.length),
    multiPairBlockerRatio: multiPairBlockers / Math.max(1, blockers.length),
    pairPressureCoverage: pressuredPairs.size / Math.max(1, pairPaths.length)
  };
}

function isEdgeCell(width, height, cell) {
  if (!Array.isArray(cell) || cell.length < 2) return false;
  return cell[0] === 0 || cell[1] === 0 || cell[0] === (height - 1) || cell[1] === (width - 1);
}

function adjacentBlockerCount(blockerSet, width, height, cell) {
  if (!Array.isArray(cell) || cell.length < 2) return 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let count = 0;
  dirs.forEach(([dr, dc]) => {
    const nr = cell[0] + dr;
    const nc = cell[1] + dc;
    if (nr < 0 || nc < 0 || nr >= height || nc >= width) return;
    if (blockerSet.has(coordKey(nr, nc))) count += 1;
  });
  return count;
}

function analyzeSolutionGuide(level) {
  const golden = level?.golden_path || {};
  const width = levelWidth(level);
  const height = levelHeight(level);
  const blockerSet = new Set((level?.blockers || []).map(([r, c]) => coordKey(r, c)));
  const pairMap = Object.fromEntries((level?.pairs || []).map((pair) => [pair.id, pair]));
  const endpointOwner = new Map();
  (level?.pairs || []).forEach((pair) => {
    endpointOwner.set(coordKey(pair.start[0], pair.start[1]), pair.id);
    endpointOwner.set(coordKey(pair.end[0], pair.end[1]), pair.id);
  });
  const occupancy = new Map();
  const overlaps = [];
  let missingPaths = 0;
  const issues = new Set();

  Object.entries(golden).forEach(([pairId, cells]) => {
    const pair = pairMap[pairId];
    if (!pair) {
      issues.add("unknown_pair_path");
      return;
    }
    if (!Array.isArray(cells) || cells.length < 2) {
      missingPaths += 1;
      issues.add("missing_solution_path");
      return;
    }
    const first = cells[0];
    const last = cells[cells.length - 1];
    const validEndpoints =
      (sameCell(first, pair.start) && sameCell(last, pair.end)) ||
      (sameCell(first, pair.end) && sameCell(last, pair.start));
    if (!validEndpoints) issues.add("path_wrong_endpoints");

    cells.forEach((cell, index, list) => {
      if (!Array.isArray(cell) || cell.length < 2) {
        issues.add("invalid_path_cell");
        return;
      }
      if (cell[0] < 0 || cell[1] < 0 || cell[0] >= height || cell[1] >= width) {
        issues.add("path_out_of_bounds");
        return;
      }
      if (index > 0 && manhattan(list[index - 1], cell) !== 1) {
        issues.add("invalid_path_step");
      }
      if (blockerSet.has(coordKey(cell[0], cell[1]))) {
        issues.add("path_hits_blocker");
      }
      if (index > 0 && index < list.length - 1) {
        const owner = endpointOwner.get(coordKey(cell[0], cell[1]));
        if (owner && owner !== pairId) issues.add("path_through_foreign_endpoint");
      }
      const key = coordKey(cell[0], cell[1]);
      const existing = occupancy.get(key) || [];
      existing.push({ pairId, index });
      occupancy.set(key, existing);
    });
  });

  occupancy.forEach((entries, key) => {
    const distinctPairs = [...new Set(entries.map((entry) => entry.pairId))];
    if (distinctPairs.length > 1) overlaps.push({ key, pairs: distinctPairs });
  });

  if (overlaps.length > 0) issues.add("paths_cross");

  return {
    issues: [...issues],
    overlaps,
    missingPaths,
    isClean: issues.size === 0
  };
}

function classifyDiscardReason(reasonText) {
  const text = String(reasonText || "").trim().toLowerCase();
  if (!text) return "unspecified";
  if (text.includes("cross") || text.includes("cruz") || text.includes("solapa") || text.includes("overlap")) return "paths_cross";
  if (text.includes("mislead") || text.includes("enga") || text.includes("guide")) return "misleading_solution";
  if (text.includes("easy") || text.includes("facil")) return "too_easy";
  if (text.includes("hard") || text.includes("dif") || text.includes("difficult")) return "too_hard";
  if (text.includes("ugly") || text.includes("feo") || text.includes("layout")) return "bad_layout";
  return "custom_feedback";
}

const LEARNING_TEXT_TAG_PATTERNS = [
  { tag: "too_easy", patterns: [/too\s*easy/, /facil/, /very\s*easy/, /super\s*easy/, /demasiado\s*facil/, /muy\s*facil/] },
  { tag: "too_much_space", patterns: [/too\s*much\s*space/, /to\s*much\s*space/, /lot\s*of\s*space/, /too\s*open/, /muy\s*abierto/, /demasiado\s*espacio/, /much\s*space/, /open\s*board/, /mucho\s*espacio/] },
  { tag: "needs_more_pairs", patterns: [/need[s]?\s*more\s*pairs/, /more\s*pairs/, /introduce\s*more\s*pairs/, /add\s*more\s*pairs/, /few\s*pairs/, /low\s*amount\s*of\s*pairs/, /supper\s*low\s*amount\s*of\s*pairs/, /more\s*objectives/, /mas\s*pares/, /mas\s*parejas/, /anadiria\s*mas\s*parejas/, /anadiri?a\s*mas/, /faltan\s*parejas/] },
  { tag: "needs_more_blockers", patterns: [/add\s*more\s*blockers/, /need[s]?\s*more\s*blockers/, /more\s*blockers/, /mas\s*blockers/, /mas\s*bloqueadores/, /faltan\s*blockers/, /pocos\s*blockers/] },
  { tag: "good_blocker_distribution", patterns: [/good\s*blocker\s*distribution/, /good\s*blockers?/, /nice\s*blocker\s*distribution/, /good\s*distribution\s*of\s*the\s*blockers/, /well\s*distributed\s*blockers?/, /buena\s*distribucion/] },
  { tag: "bad_blocker_clustering", patterns: [/cluster/, /claster/, /clump/, /grouped\s*too\s*much/, /not\s*in\s*clasters/, /bad\s*blocker\s*distribution/, /blockers?\s*too\s*close/, /agrupacion.*no\s*tiene\s*sentido/, /agrupaciones.*no\s*tienen\s*sentido/, /agrupaciones?\s*(?:de\s*)?blockers/, /blockers\s*agrupados/] },
  { tag: "meaningless_blockers", patterns: [/blockers?\s*(?:no|sin)\s*(?:tienen?\s*)?(?:ningun\s*)?sentido/, /no\s*(?:tienen?\s*)?(?:ningun\s*)?sentido/, /(?:sin|no)\s*sentido/, /no\s*(?:van?\s*a?\s*)?funcionar/, /distribucion\s*rarisima/, /agujeros?\s*sin\s*sentido/, /no\s*sirve\s*para\s*nada/, /blockers?\s*(?:are\s*)?pointless/, /blockers?\s*(?:don.?t|do\s*not)\s*(?:make\s*)?sense/, /meaningless\s*blockers?/] },
  { tag: "good_flow", patterns: [/good\s*flow/, /nice\s*flow/, /good\s*routing/, /good\s*path\s*flow/, /buen\s*flujo/] },
  { tag: "good_layout", patterns: [/good\s*layout/, /well\s*thought/, /mas\s*pensado/, /more\s*thought\s*out/, /better\s*thought/, /buen\s*diseno/, /bien\s*pensado/] },
  { tag: "bad_layout", patterns: [/bad\s*layout/, /better\s*layout/, /ugly/, /feo/, /layout\s*issue/, /mal\s*diseno/, /mala\s*distribucion/] }
];

function normalizeFeedbackText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferLearningTags(reasonCode = "", rawText = "", keepTags = []) {
  const tags = new Set(Array.isArray(keepTags) ? keepTags.filter(Boolean) : []);
  const normalizedReasonCode = String(reasonCode || "").trim();
  const text = normalizeFeedbackText(`${reasonCode || ""} ${rawText || ""}`);
  if (normalizedReasonCode && normalizedReasonCode !== "custom_feedback" && normalizedReasonCode !== "unspecified") {
    tags.add(normalizedReasonCode);
  }
  LEARNING_TEXT_TAG_PATTERNS.forEach(({ tag, patterns }) => {
    if (patterns.some((pattern) => pattern.test(text))) tags.add(tag);
  });
  return [...tags];
}

function normalizeLearningEntry(entry, decision = "approve") {
  const noteText = String(entry?.note_text || "").trim();
  const fallbackText = String(entry?.keep_text || entry?.reason_text || "").trim();
  const rawText = noteText || fallbackText;
  const derivedReasonCode = decision === "reject"
    ? (entry?.reason_code || classifyDiscardReason(rawText))
    : String(entry?.reason_code || "");
  return {
    ...entry,
    reason_code: derivedReasonCode || "",
    note_text: noteText,
    feedback_tags: inferLearningTags(derivedReasonCode, rawText, entry?.keep_tags || entry?.feedback_tags || []),
    keep_tags: Array.isArray(entry?.keep_tags) ? [...entry.keep_tags] : [],
    pair_ids: Array.isArray(entry?.pair_ids) ? [...entry.pair_ids] : [],
    source_family: String(entry?.source_family || inferLearningSourceFamily(entry?.context || "", entry) || "unknown"),
    auto_recorded: !!entry?.auto_recorded
  };
}

function normalizeLearningCorrectionEntry(entry) {
  return {
    ...entry,
    source_family: String(entry?.source_family || "correction")
  };
}

function normalizeLearningBuckets() {
  state.learning.approved = (state.learning.approved || []).map((entry) => normalizeLearningEntry(entry, "approve"));
  state.learning.rejected = (state.learning.rejected || []).map((entry) => normalizeLearningEntry(entry, "reject"));
  state.learning.corrections = (Array.isArray(state.learning.corrections) ? state.learning.corrections : []).map(normalizeLearningCorrectionEntry);
}

function inferLearningSourceFamily(context = "", extra = {}) {
  const explicit = String(extra?.source_family || extra?.sourceFamily || "").trim().toLowerCase();
  if (explicit) return explicit;
  const normalized = String(context || "").trim().toLowerCase();
  if (!normalized) return "manual";
  if (normalized.startsWith("session:")) return "session";
  if (normalized.startsWith("reference_")) return "reference";
  if (normalized.startsWith("editor_")) return "editor";
  if (normalized.includes(":corrected") || normalized.includes(":original") || normalized.startsWith("session_fix") || normalized.includes("fix")) return "correction";
  if (normalized.includes("manual")) return "manual";
  return "unknown";
}

function safeCountLearningSolutions(level) {
  try {
    const width = levelWidth(level);
    const height = levelHeight(level);
    const pairs = Array.isArray(level?.pairs) ? level.pairs : [];
    const blockers = Array.isArray(level?.blockers) ? level.blockers : [];
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 0;
    if (pairs.some((pair) => !pair || !Array.isArray(pair.start) || !Array.isArray(pair.end))) return 0;
    if (blockers.some((cell) => !Array.isArray(cell) || cell.length < 2)) return 0;
    return countSolutions(width, height, pairs, blockers, 20);
  } catch (_err) {
    return 0;
  }
}

function safeExtractMechanicSignals(level) {
  try {
    return extractMechanicSignals(level);
  } catch (_err) {
    return {
      freeCells: 0,
      freeCellsPerPair: 0,
      blockerDensity: 0,
      blockerClusterRatio: 0,
      blockerSpread: 0,
      pairSpan: 0,
      pathCoverage: 0,
      uncoveredFreeCells: 0,
      totalBends: 0,
      totalExcessBends: 0,
      bendsPerPair: 0,
      excessBendsPerPair: 0,
      bendPressure: 0,
      pathStraightness: 0
    };
  }
}

function safeAnalyzeSolutionGuide(level) {
  try {
    return analyzeSolutionGuide(level);
  } catch (_err) {
    return {
      issues: [],
      overlaps: [],
      missingPaths: 0,
      isClean: false
    };
  }
}

function safeExtractPairFeedback(level, pairIds = []) {
  try {
    return extractPairFeedback(level, pairIds);
  } catch (_err) {
    return [];
  }
}

function evaluateLearningLevel(level) {
  const width = levelWidth(level);
  const height = levelHeight(level);
  const pairs = Array.isArray(level?.pairs) ? level.pairs : [];
  const blockers = Array.isArray(level?.blockers) ? level.blockers : [];
  const validationReport = validateLevel(level);
  const storedSolutionCount = levelSolutionCount(level);
  const verifiedSolutionCount = safeCountLearningSolutions(level);
  const mechanicSignals = safeExtractMechanicSignals(level);
  const guide = safeAnalyzeSolutionGuide(level);
  const pairFeedback = safeExtractPairFeedback(level);
  const guideIssues = Array.isArray(guide.issues) ? [...guide.issues] : [];
  const guideTrust = guideTrustLevel(guide);

  return {
    validation: {
      valid: !!validationReport.valid,
      status: validationReport.valid ? "OK" : "INVALID",
      errors: Array.isArray(validationReport.errors) ? [...validationReport.errors] : [],
      solvable: verifiedSolutionCount >= 1,
      solution_count: verifiedSolutionCount,
      stored_solution_count: storedSolutionCount,
      solution_count_mismatch: storedSolutionCount !== verifiedSolutionCount,
      decal_required: !!validationReport.decalRequired,
      decal_pass: validationReport.decalPass == null ? null : !!validationReport.decalPass
    },
    feature_signals: {
      boardArea: width * height,
      pairCount: pairs.length,
      blockerCount: blockers.length,
      freeCells: mechanicSignals.freeCells,
      freeCellsPerPair: mechanicSignals.freeCellsPerPair,
      blockerDensity: mechanicSignals.blockerDensity,
      blockerClusterRatio: mechanicSignals.blockerClusterRatio,
      blockerSpread: mechanicSignals.blockerSpread,
      pairSpan: mechanicSignals.pairSpan,
      pathCoverage: mechanicSignals.pathCoverage,
      uncoveredFreeCells: mechanicSignals.uncoveredFreeCells,
      totalBends: mechanicSignals.totalBends,
      totalExcessBends: mechanicSignals.totalExcessBends,
      bendsPerPair: mechanicSignals.bendsPerPair,
      excessBendsPerPair: mechanicSignals.excessBendsPerPair,
      bendPressure: mechanicSignals.bendPressure,
      pathStraightness: mechanicSignals.pathStraightness,
      guideTrust,
      guideIssueCount: guideIssues.length,
      criticalGuideIssue: hasCriticalGuideIssue(guide) ? 1 : 0,
      pairFeedbackCount: pairFeedback.length
    },
    guide_issues: guideIssues,
    pair_feedback: pairFeedback
  };
}

function buildLearningRecord(level, decision, context = "manual", extra = {}, evaluation = null) {
  const verified = evaluation || evaluateLearningLevel(level);
  const features = {
    ...extractFeatures(level),
    solutions: verified.validation.solution_count,
    solution_count: verified.validation.solution_count,
    stored_solution_count: verified.validation.stored_solution_count,
    solution_count_mismatch: verified.validation.solution_count_mismatch ? 1 : 0,
    board_area: verified.feature_signals.boardArea,
    pair_count: verified.feature_signals.pairCount,
    blocker_count: verified.feature_signals.blockerCount,
    free_cells: verified.feature_signals.freeCells,
    free_cells_per_pair: verified.feature_signals.freeCellsPerPair,
    blocker_density: verified.feature_signals.blockerDensity,
    blocker_cluster_ratio: verified.feature_signals.blockerClusterRatio,
    blocker_spread: verified.feature_signals.blockerSpread,
    pair_span: verified.feature_signals.pairSpan,
    path_coverage: verified.feature_signals.pathCoverage,
    uncovered_free_cells: verified.feature_signals.uncoveredFreeCells,
    total_bends: verified.feature_signals.totalBends,
    total_excess_bends: verified.feature_signals.totalExcessBends,
    bends_per_pair: verified.feature_signals.bendsPerPair,
    excess_bends_per_pair: verified.feature_signals.excessBendsPerPair,
    bend_pressure: verified.feature_signals.bendPressure,
    path_straightness: verified.feature_signals.pathStraightness
  };
  const record = normalizeLearningEntry({
    ...extra,
    level: levelTier(level),
    timestamp: Date.now(),
    context,
    source_family: inferLearningSourceFamily(context, extra),
    auto_recorded: !!extra?.auto_recorded,
    validation: verified.validation,
    feature_signals: verified.feature_signals,
    guide_issues: verified.guide_issues,
    features
  }, decision);
  if (Array.isArray(verified.pair_feedback) && verified.pair_feedback.length && !Array.isArray(record.pair_feedback)) {
    record.pair_feedback = verified.pair_feedback;
  }
  return record;
}

function normalizeDiscardPairIds(rawValue, level) {
  const validPairIds = new Set((level?.pairs || []).map((pair) => String(pair.id || "").toUpperCase()).filter(Boolean));
  return String(rawValue || "")
    .split(/[,\s/;+]+/)
    .map((value) => value.trim().toUpperCase())
    .filter((value, index, list) => value && validPairIds.has(value) && list.indexOf(value) === index);
}

const DISCARD_REASON_OPTIONS = [
  { value: "", label: "Select discard reason" },
  { value: "paths_cross", label: "Paths cross" },
  { value: "misleading_solution", label: "Misleading solution" },
  { value: "too_easy", label: "Too easy" },
  { value: "too_hard", label: "Too hard" },
  { value: "bad_layout", label: "Bad layout" },
  { value: "custom_feedback", label: "Custom feedback" }
];

const KEEP_REASON_OPTIONS = [
  { value: "good_layout", label: "Good layout" },
  { value: "good_blockers", label: "Good blockers" },
  { value: "good_flow", label: "Good flow" },
  { value: "good_difficulty", label: "Good difficulty" },
  { value: "progression_fit", label: "Fits progression" }
];

function discardReasonDisplayLabel(reasonCode) {
  return DISCARD_REASON_OPTIONS.find((option) => option.value === reasonCode)?.label || reasonCode || "Unspecified";
}

function keepReasonDisplayLabel(reasonCode) {
  return KEEP_REASON_OPTIONS.find((option) => option.value === reasonCode)?.label || reasonCode || "Unspecified";
}

function composeDiscardReasonText(reasonCode, noteText = "") {
  const note = String(noteText || "").trim();
  const label = discardReasonDisplayLabel(reasonCode);
  if (!reasonCode) return note;
  return note ? `${label}: ${note}` : label;
}

function composeKeepReasonText(reasonCodes = [], noteText = "") {
  const labels = (Array.isArray(reasonCodes) ? reasonCodes : [])
    .map((reasonCode) => keepReasonDisplayLabel(reasonCode))
    .filter(Boolean);
  const note = String(noteText || "").trim();
  const base = labels.join(", ");
  if (!base) return note;
  return note ? `${base}: ${note}` : base;
}

function toggleDiscardDraftPair(candidate, pairId) {
  const current = Array.isArray(candidate.discardDraftPairs) ? [...candidate.discardDraftPairs] : [];
  const normalized = String(pairId || "").toUpperCase();
  if (!normalized) return;
  candidate.discardDraftPairs = current.includes(normalized)
    ? current.filter((value) => value !== normalized)
    : [...current, normalized];
}

function extractPairFeedback(level, pairIds = []) {
  const width = Math.max(1, levelWidth(level));
  const height = Math.max(1, levelHeight(level));
  const blockerSet = new Set((level?.blockers || []).map(([r, c]) => coordKey(r, c)));
  const selected = new Set(pairIds.map((pairId) => String(pairId || "").toUpperCase()).filter(Boolean));
  const pool = (level?.pairs || []).filter((pair) => selected.size === 0 || selected.has(String(pair.id || "").toUpperCase()));
  return pool.map((pair) => {
    const start = pair.start;
    const end = pair.end;
    return {
      pair_id: String(pair.id || "").toUpperCase(),
      manhattan: manhattan(start, end),
      start_edge: isEdgeCell(width, height, start) ? 1 : 0,
      end_edge: isEdgeCell(width, height, end) ? 1 : 0,
      start_blockers: adjacentBlockerCount(blockerSet, width, height, start),
      end_blockers: adjacentBlockerCount(blockerSet, width, height, end),
      midpoint_r: (start[0] + end[0]) / (2 * Math.max(1, height - 1)),
      midpoint_c: (start[1] + end[1]) / (2 * Math.max(1, width - 1))
    };
  });
}

function pairFeedbackDistance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return (
    Math.abs((a.manhattan || 0) - (b.manhattan || 0)) * 1.3 +
    Math.abs((a.start_edge || 0) - (b.start_edge || 0)) * 1.1 +
    Math.abs((a.end_edge || 0) - (b.end_edge || 0)) * 1.1 +
    Math.abs((a.start_blockers || 0) - (b.start_blockers || 0)) * 0.9 +
    Math.abs((a.end_blockers || 0) - (b.end_blockers || 0)) * 0.9 +
    Math.abs((a.midpoint_r || 0) - (b.midpoint_r || 0)) * 5 +
    Math.abs((a.midpoint_c || 0) - (b.midpoint_c || 0)) * 5
  );
}

function hasCriticalGuideIssue(guide) {
  const critical = new Set([
    "missing_solution_path",
    "paths_cross",
    "path_wrong_endpoints",
    "invalid_path_step",
    "path_hits_blocker",
    "path_out_of_bounds",
    "path_through_foreign_endpoint",
    "invalid_path_cell"
  ]);
  return (guide?.issues || []).some((issue) => critical.has(issue));
}

function guideTrustLevel(guide) {
  if (!guide) return "LOW";
  if (hasCriticalGuideIssue(guide)) return "LOW";
  if (Array.isArray(guide.issues) && guide.issues.length > 0) return "MED";
  return "HIGH";
}

function inferDensityLabel(count) {
  const entry = Object.entries(densityRanges).find(([, [lo, hi]]) => count >= lo && count <= hi);
  return entry?.[0] || (count <= 0 ? "HIGH" : "SINGLE");
}

function levelDifficulty(level) {
  return level?.difficulty || level?.meta?.manual_difficulty || densityToDifficulty(level?.target_density) || `T${levelTier(level)}`;
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

function progressionPlayableLevelCount(progression) {
  return Math.max(0, (progression?.slots?.length || MANAGER_SLOT_COUNT) - 1);
}

function progressionMaxPlayableSlotIndex(progression) {
  return Math.max(FIRST_PLAYABLE_SLOT_INDEX, (progression?.slots?.length || MANAGER_SLOT_COUNT) - 1);
}

function getManagerProgressionLabel(tab) {
  if (tab === "allLevels") return "All Levels";
  if (tab === "extras") return "Extras";
  if (tab === "discarded") return "Discarded";
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
  const extraIds = getManagerExtraIds();
  const discardedIds = getManagerDiscardedIds();
  return state.manager.items.filter((item) => !assigned.has(item.id) && !extraIds.has(item.id) && !discardedIds.has(item.id));
}

function getManagerExtraIds() {
  return new Set(Array.isArray(state.manager.extraIds) ? state.manager.extraIds : []);
}

function getManagerDiscardedIds() {
  return new Set(Array.isArray(state.manager.discardedIds) ? state.manager.discardedIds : []);
}

function isManagerExtraItem(itemId) {
  return getManagerExtraIds().has(itemId);
}

function isManagerDiscardedItem(itemId) {
  return getManagerDiscardedIds().has(itemId);
}

function getManagerExtraItems() {
  const extraIds = getManagerExtraIds();
  return state.manager.items.filter((item) => extraIds.has(item.id));
}

function getManagerDiscardedItems() {
  const discardedIds = getManagerDiscardedIds();
  return state.manager.items.filter((item) => discardedIds.has(item.id));
}

function addManagerItemToExtras(itemId) {
  const next = new Set(getManagerExtraIds());
  next.add(itemId);
  state.manager.extraIds = [...next];
  removeManagerItemFromDiscarded(itemId);
}

function removeManagerItemFromExtras(itemId) {
  state.manager.extraIds = (state.manager.extraIds || []).filter((id) => id !== itemId);
}

function addManagerItemToDiscarded(itemId) {
  const next = new Set(getManagerDiscardedIds());
  next.add(itemId);
  state.manager.discardedIds = [...next];
  removeManagerItemFromExtras(itemId);
  state.manager.referenceIds = state.manager.referenceIds.filter((id) => id !== itemId);
}

function removeManagerItemFromDiscarded(itemId) {
  state.manager.discardedIds = (state.manager.discardedIds || []).filter((id) => id !== itemId);
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

function normalizeImportedGoldenPath(rawGoldenPath, pairs) {
  const fallback = Object.fromEntries((pairs || []).map((pair) => [pair.id, [pair.start, pair.end]]));
  if (!rawGoldenPath || typeof rawGoldenPath !== "object") return fallback;
  const normalized = {};
  (pairs || []).forEach((pair) => {
    const cells = Array.isArray(rawGoldenPath[pair.id]) ? rawGoldenPath[pair.id] : null;
    if (!cells || cells.length < 2) {
      normalized[pair.id] = fallback[pair.id];
      return;
    }
    const nextCells = cells
      .map((cell) => {
        if (Array.isArray(cell) && cell.length >= 2) return [Number(cell[0]), Number(cell[1])];
        if (cell && typeof cell === "object" && Number.isFinite(cell.x) && Number.isFinite(cell.y)) {
          return [Number(cell.y), Number(cell.x)];
        }
        return null;
      })
      .filter((cell) => Array.isArray(cell) && Number.isFinite(cell[0]) && Number.isFinite(cell[1]));
    normalized[pair.id] = nextCells.length >= 2 ? nextCells : fallback[pair.id];
  });
  return normalized;
}

function normalizeGridSizeLevel(data, fallbackName = "imported_level") {
  const rows = Number(data?.gridSize?.rows || data?.gridSize?.height || 0);
  const cols = Number(data?.gridSize?.cols || data?.gridSize?.width || 0);
  const boardWidth = cols;
  const boardHeight = rows;
  if (!isSupportedBoardSize(boardWidth, boardHeight)) {
    throw new Error(`Unsupported grid ${cols}x${rows}. Current editor supports ${BOARD_SIZE_LIMIT_TEXT}.`);
  }

  const pairIds = PAIR_IDS;
  const pairs = (data.pairs || []).slice(0, PAIR_IDS.length).map((pair, index) => {
    const start = pair?.a ? storedCellFromDeveloperPoint(pair.a) : null;
    const end = pair?.b ? storedCellFromDeveloperPoint(pair.b) : null;
    if (!start || !end) throw new Error(`Imported pair ${index + 1} is missing a or b endpoint.`);
    const fishEntry = inferFishEntryFromPair(pair, index);
    return {
      id: pairIds[index],
      start,
      end,
      color: fishEntry.hex,
      fish_color_id: fishEntry.id,
      color_letter: fishEntry.letter
    };
  });

  const blockers = (data.blockers || []).map(normalizeBlockerCell).filter(Boolean);
  const sourceLevelNumber = Number(data.level ?? data.id ?? 1);
  const levelNumber = sourceLevelNumber >= 1 && sourceLevelNumber <= 10 ? sourceLevelNumber : 1;
  const providedSolutionCount = Number(data.solutionCount ?? data.solution_count);
  const solutionCount = Number.isFinite(providedSolutionCount)
    ? Math.max(0, providedSolutionCount)
    : countSolutions(boardWidth, boardHeight, pairs, blockers, 20);
  const targetDensity = String(data.targetDensity || data.target_density || inferDensityLabel(solutionCount)).toUpperCase();
  const decal = !!data?.decal;
  const decalPass = data?.validation && Object.prototype.hasOwnProperty.call(data.validation, "decal_pass")
    ? data.validation.decal_pass
    : (decal ? hasFullCoverSolution(boardWidth, boardHeight, pairs, blockers) : null);
  const goldenPath = normalizeImportedGoldenPath(data.goldenPath || data.golden_path, pairs);
  const providedDifficulty = String(data.difficulty || data.difficultyTier || "").toUpperCase();
  const difficulty = ["EASY", "MEDIUM", "HARD"].includes(providedDifficulty)
    ? providedDifficulty
    : densityToDifficulty(targetDensity);
  const providedValidation = data?.validation && typeof data.validation === "object" ? data.validation : {};

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
    difficulty,
    golden_path: goldenPath,
    validation: {
      solvable: typeof providedValidation.solvable === "boolean" ? providedValidation.solvable : solutionCount >= 1,
      density_match: typeof providedValidation.density_match === "boolean" ? providedValidation.density_match : densityMatch(targetDensity, solutionCount),
      decal_required: decal,
      decal_pass: decalPass,
      early_mistake_detection: typeof providedValidation.early_mistake_detection === "boolean" ? providedValidation.early_mistake_detection : true,
      no_isolated_pairs: typeof providedValidation.no_isolated_pairs === "boolean" ? providedValidation.no_isolated_pairs : true,
      no_late_dead_ends: typeof providedValidation.no_late_dead_ends === "boolean" ? providedValidation.no_late_dead_ends : true,
      curve_integrity: typeof providedValidation.curve_integrity === "boolean" ? providedValidation.curve_integrity : true
    },
    meta: {
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

function isGridSizeLevelPayload(data) {
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
  if (isGridSizeLevelPayload(data)) return normalizeGridSizeLevel(data, fallbackName);
  throw new Error("This JSON is not a playable level. Import progression files in Level Manager instead.");
}

async function fetchWorkshopLevelByFilename(filename) {
  const ref = basename(filename);
  const candidateUrls = await workshopLevelCandidateUrls(ref);
  for (const url of candidateUrls) {
    if (!(await repoUrlExists(url))) continue;
    const response = await fetch(url);
    if (!response.ok) continue;
    return toPlayableLevel(parseImportedJson(await response.text()), ref);
  }
  throw new Error(`Could not resolve referenced level ${ref} in levels, workshop_jsons, or workshop_jsons_game_unique.`);
}

let workshopCatalogAliasCache = null;

function parseCatalogCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

async function loadWorkshopCatalogAliases() {
  if (workshopCatalogAliasCache) return workshopCatalogAliasCache;
  try {
    if (!(await repoUrlExists("./levels/catalog_index.csv"))) {
      workshopCatalogAliasCache = new Map();
      return workshopCatalogAliasCache;
    }
    const response = await fetch("./levels/catalog_index.csv");
    if (!response.ok) {
      workshopCatalogAliasCache = new Map();
      return workshopCatalogAliasCache;
    }
    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const aliasMap = new Map();
    lines.slice(1).forEach((line) => {
      const [canonicalId, canonicalFile, sourceFile, _board, _pairs, _moves, _difficulty, aliases] = parseCatalogCsvLine(line);
      if (!canonicalFile) return;
      const targets = [
        `./levels/${canonicalFile}`,
        `./workshop_jsons/${canonicalFile}`,
        `./workshop_jsons_game_unique/${canonicalFile}`
      ];
      const keys = new Set([
        basename(canonicalFile),
        basename(sourceFile || "")
      ]);
      String(aliases || "")
        .split(" | ")
        .map((entry) => basename(entry.trim()))
        .filter(Boolean)
        .forEach((entry) => keys.add(entry));
      keys.forEach((key) => {
        if (!aliasMap.has(key)) aliasMap.set(key, []);
        const existing = aliasMap.get(key);
        targets.forEach((target) => {
          if (!existing.includes(target)) existing.push(target);
        });
      });
    });
    workshopCatalogAliasCache = aliasMap;
    return aliasMap;
  } catch (_err) {
    workshopCatalogAliasCache = new Map();
    return workshopCatalogAliasCache;
  }
}

async function workshopLevelCandidateUrls(filename) {
  const ref = basename(filename);
  const directCandidates = [
    `./levels/${ref}`,
    `./workshop_jsons/${ref}`,
    `./workshop_jsons_game_unique/${ref}`
  ];
  const aliasMap = await loadWorkshopCatalogAliases();
  const aliasCandidates = aliasMap.get(ref) || [];
  return [...new Set([...directCandidates, ...aliasCandidates])];
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

function normalizeTutorialManagerItem(item, sourcePath = "Tutorial slot") {
  if (!item) return null;
  item.file = TUTORIAL_LEVEL_BASENAME;
  item.sourcePath = item.sourcePath || sourcePath;
  item.notes = "Tutorial slot";
  item.level.meta = {
    ...(item.level.meta || {}),
    type: "tutorial",
    source_name: TUTORIAL_LEVEL_BASENAME
  };
  item.originalLevel = cloneLevel(item.level);
  item.status = validateLevel(item.level).valid ? "OK" : "INVALID";
  return item;
}

function getCanonicalTutorialManagerItem() {
  return state.manager.items.find((item) => isTutorialManagerItem(item)) || null;
}

async function ensureCanonicalTutorialManagerItem(levelOverride = null, sourcePath = "Tutorial slot") {
  if (levelOverride) {
    state.manager.tutorialLevelTemplate = cloneLevel(levelOverride);
  }
  const existing = getCanonicalTutorialManagerItem();
  if (existing) {
    if (levelOverride) {
      existing.level = cloneLevel(levelOverride);
      existing.originalLevel = cloneLevel(levelOverride);
    }
    return normalizeTutorialManagerItem(existing, sourcePath);
  }
  const tutorialLevel = levelOverride ? cloneLevel(levelOverride) : await getTutorialLevelTemplate();
  const item = normalizeTutorialManagerItem(
    summarizeManagerItem(tutorialLevel, TUTORIAL_LEVEL_BASENAME, sourcePath),
    sourcePath
  );
  state.manager.items.push(item);
  return item;
}

function dedupeTutorialManagerItems() {
  const tutorialItems = state.manager.items.filter((item) => isTutorialManagerItem(item));
  if (!tutorialItems.length) return null;
  const canonical = normalizeTutorialManagerItem(tutorialItems[0]);
  const duplicateIds = new Set(tutorialItems.slice(1).map((item) => item.id));
  for (const key of getManagerProgressionKeys()) {
    const progression = getManagerProgression(key);
    progression.slots = progression.slots.map((itemId, index) => {
      if (!isTutorialSlotIndex(index)) return duplicateIds.has(itemId) ? canonical.id : itemId;
      return canonical.id;
    });
    progression.lockedSlots[0] = true;
    progression.slotDifficulty[0] = levelDifficulty(canonical.level);
  }
  state.manager.extraIds = (state.manager.extraIds || []).filter((id) => !duplicateIds.has(id));
  state.manager.discardedIds = (state.manager.discardedIds || []).filter((id) => !duplicateIds.has(id));
  state.manager.referenceIds = (state.manager.referenceIds || []).filter((id) => !duplicateIds.has(id));
  if (duplicateIds.has(state.manager.selectedId)) state.manager.selectedId = canonical.id;
  if (duplicateIds.has(state.editor.link?.sourceId)) {
    setEditorLink("manager", canonical.id, state.editor.link?.label || "Tutorial slot");
  }
  state.manager.items = state.manager.items.filter((item) => !duplicateIds.has(item.id));
  return canonical;
}

function managerItemStableKey(item) {
  if (!item) return "";
  const savedPath = String(item.savedPath || "").trim();
  if (savedPath) return `saved:${projectRelativePath(savedPath).toLowerCase()}`;
  const fileName = basename(preferredManagerItemFileName(item)).toLowerCase();
  return fileName ? `file:${fileName}` : "";
}

function managerItemRecoveryScore(item) {
  let score = 0;
  const status = String(item?.status || "");
  if (status === "OK") score += 400;
  else if (status === "INVALID") score += 250;
  if (item?.changed) score += 40;
  if (item?.savedPath) score += 25;
  if (item?.screenshotPath) score += 10;
  if (levelWidth(item?.level) >= MIN_BOARD_SIZE && levelHeight(item?.level) >= MIN_BOARD_SIZE) score += 20;
  score += Math.min(20, (item?.level?.pairs || []).length * 4);
  if (String(item?.sourcePath || "").startsWith("Import failed ·")) score -= 20;
  return score;
}

function managerItemIsReferenced(itemId) {
  if (itemId == null) return false;
  if (state.manager.selectedId === itemId) return true;
  if ((state.manager.extraIds || []).includes(itemId)) return true;
  if ((state.manager.discardedIds || []).includes(itemId)) return true;
  if ((state.manager.referenceIds || []).includes(itemId)) return true;
  if (state.editor.link?.sourceType === "manager" && state.editor.link?.sourceId === itemId) return true;
  if ((state.sessions.queue || []).some((entry) => entry.managerItemId === itemId)) return true;
  return getManagerProgressionKeys().some((key) => getManagerProgression(key).slots.includes(itemId));
}

function pruneStaleUnassignedManagerParseErrors() {
  const groups = new Map();
  state.manager.items.forEach((item) => {
    if (!item || isTutorialManagerItem(item)) return;
    const key = managerItemStableKey(item);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const duplicateIds = [];
  const replacements = new Map();
  const files = new Set();

  groups.forEach((items) => {
    const recoveredItems = items.filter((item) => String(item?.status || "") !== "PARSE_ERROR");
    if (!recoveredItems.length) return;
    const canonical = [...recoveredItems].sort((a, b) => (
      managerItemRecoveryScore(b) - managerItemRecoveryScore(a)
    ) || (Number(a.id) - Number(b.id)))[0];

    items.forEach((item) => {
      if (item.id === canonical.id) return;
      if (String(item?.status || "") !== "PARSE_ERROR") return;
      if (managerItemIsReferenced(item.id)) return;
      duplicateIds.push(item.id);
      replacements.set(item.id, canonical.id);
      files.add(preferredManagerItemFileName(item));
    });
  });

  if (!duplicateIds.length) return { changed: false, removedCount: 0, files: [] };

  if (replacements.has(state.manager.selectedId)) {
    state.manager.selectedId = replacements.get(state.manager.selectedId) ?? null;
  }
  if (state.editor.link?.sourceType === "manager" && replacements.has(state.editor.link.sourceId)) {
    setEditorLink("manager", replacements.get(state.editor.link.sourceId), state.editor.link?.label || "Manager level");
  }
  state.sessions.queue = state.sessions.queue.map((entry) => (
    replacements.has(entry.managerItemId)
      ? { ...entry, managerItemId: replacements.get(entry.managerItemId) }
      : entry
  ));

  const duplicateIdSet = new Set(duplicateIds);
  state.manager.items = state.manager.items.filter((item) => !duplicateIdSet.has(item.id));
  return { changed: true, removedCount: duplicateIds.length, files: [...files].sort() };
}

function logManagerParseErrorRecovery(result, logTarget = "mgr-log") {
  if (!result?.changed) return;
  log(logTarget, [
    "Recovered manager state",
    `Removed ${result.removedCount} stale PARSE_ERROR duplicate(s).`,
    result.files.length ? `Files: ${result.files.join(", ")}` : ""
  ].filter(Boolean));
}

function captureLockedManagerProgressions() {
  const lockedKeys = getManagerProgressionKeys().filter((key) => isManagerProgressionLocked(key));
  if (!lockedKeys.length) return null;
  const keptItemIds = new Set();
  lockedKeys.forEach((key) => {
    getManagerProgression(key).slots.forEach((itemId) => {
      if (itemId != null) keptItemIds.add(itemId);
    });
  });
  const maxItemId = state.manager.items.reduce((max, item) => Math.max(max, Number(item?.id || 0)), 0);
  return {
    lockedKeys,
    items: state.manager.items
      .filter((item) => keptItemIds.has(item.id))
      .map((item) => ({
        ...serializeManagerItem(item),
        previewDataUrl: item.previewDataUrl || null
      })),
    progressions: Object.fromEntries(lockedKeys.map((key) => {
      const progression = getManagerProgression(key);
      return [key, {
        label: progression.label,
        slots: [...progression.slots],
        lockedSlots: [...progression.lockedSlots],
        slotDifficulty: [...progression.slotDifficulty],
        locked: true
      }];
    })),
    progressionOrder: state.manager.progressionOrder.filter((key) => lockedKeys.includes(key)),
    activeTab: lockedKeys.includes(state.manager.activeTab) ? state.manager.activeTab : lockedKeys[0],
    selectedId: keptItemIds.has(state.manager.selectedId) ? state.manager.selectedId : null,
    nextId: Math.max(Number(state.manager.nextId || 1), maxItemId + 1)
  };
}

function restoreLockedManagerProgressions(snapshot) {
  if (!snapshot?.lockedKeys?.length) return false;
  state.manager.items = hydrateManagerItems(snapshot.items);
  state.manager.itemIndex = new Map();
  state.manager.slotIndexByItemId = new Map();
  state.manager.extraIds = [];
  state.manager.discardedIds = [];
  state.manager.progressions = createDefaultManagerProgressions();
  state.manager.progressionOrder = defaultManagerProgressions.map(({ key }) => key);
  snapshot.lockedKeys.forEach((key, index) => {
    const src = snapshot.progressions[key] || {};
    const defaultLabel = defaultManagerProgressions.find((entry) => entry.key === key)?.label || `Progression ${index + 1}`;
    state.manager.progressions[key] = {
      label: src.label || defaultLabel,
      slots: normalizeManagerSlotArray(src.slots, null),
      lockedSlots: normalizeManagerSlotArray(src.lockedSlots, false),
      slotDifficulty: normalizeManagerSlotArray(src.slotDifficulty, ""),
      locked: true
    };
    if (!state.manager.progressionOrder.includes(key)) state.manager.progressionOrder.push(key);
  });
  state.manager.activeTab = snapshot.activeTab && state.manager.progressions[snapshot.activeTab]
    ? snapshot.activeTab
    : (snapshot.lockedKeys[0] || state.manager.progressionOrder[0]);
  state.manager.selectedId = state.manager.items.some((item) => item.id === snapshot.selectedId) ? snapshot.selectedId : null;
  state.manager.pendingRefTarget = null;
  state.manager.allLevelsPage = 1;
  state.manager.draggingId = null;
  state.manager.referenceIds = [];
  state.manager.nextId = Math.max(
    Number(snapshot.nextId || 1),
    state.manager.items.reduce((max, item) => Math.max(max, Number(item?.id || 0)), 0) + 1
  );
  state.manager.filters = createDefaultManagerFilters();
  dedupeTutorialManagerItems();
  return true;
}

async function ensureTutorialInProgressionSlot(key) {
  if (!isManagerProgressionTab(key)) return;
  const progression = getManagerProgression(key);
  if (!progression) return;
  const tutorialItem = await ensureCanonicalTutorialManagerItem();
  progression.slots[0] = tutorialItem.id;
  progression.lockedSlots[0] = true;
  progression.slotDifficulty[0] = levelDifficulty(tutorialItem.level);
  dedupeTutorialManagerItems();
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
  "ed-save-new-level": "Save the current slot, then jump to the next slot so you can keep building the progression.",
  "ed-difficulty": "Choose whether the current level should be treated as easy, medium, or hard.",
  "ed-moves": "Set the move count stored in the JSON.",
  "ed-decal": "Require at least one valid solution that covers every free cell of the board.",
  "ed-auto-moves": "Fill the moves field with the recommended move count.",
  "ed-mode": "Switch between blocker placement, node placement, debug marking, and erase mode.",
  "ed-pair-id": "Choose which pair letter you are placing in node mode.",
  "ed-pair-placement": "The editor auto-places point 1, then point 2, and later moves whichever point is nearest.",
  "ed-save": "Overwrite the currently linked manager or session level with the editor changes.",
  "ed-save-as-new": "Create a brand new level copy without overwriting the currently linked source.",
  "ed-send-knowledge": "Store the current editor level as a good pattern for future procedural generation.",
  "ed-send-antipattern": "Store the current editor level as an anti-pattern the generator should avoid.",
  "ed-validate": "Validate the current editor level against the toolkit rules.",
  "ed-import": "Import one JSON level into the editor.",
  "ed-export": "Choose where to save the current editor level and its screenshot.",
  "ed-screenshot": "Save a PNG screenshot of the editor board.",
  "ed-reset": "Clear the editor board and reset play state.",
  "play-start": "Start or exit play mode in the editor board.",
  "play-reset": "Reset all drawn paths in editor play mode.",
  "play-mark-selected": "Copy the currently selected played route into the persistent editor guides.",
  "play-mark-all": "Copy every played route into the persistent editor guides.",
  "play-clear-guides": "Remove every painted guide from the editor board.",
  "play-export-session": "Export the current play session from the editor.",
  "ed-generate-variants": "Generate 3 reference-driven variants from the current editor level.",
  "ed-clear-variants": "Clear the current editor-side variant review queue.",
  "board-canvas": "Editor board. Click to edit, or drag to play when play mode is on.",
  "session-import": "Import levels into the Play Sessions review queue.",
  "session-add-current": "Add the current editor level into the Play Sessions queue.",
  "session-progression-select": "Choose which saved progression from Level Manager should be loaded into Play Sessions.",
  "session-load-progression": "Replace the current Play Sessions queue with the selected progression in slot order.",
  "session-load-procedural-100": "Load the full 100-level procedural pack into Play Sessions for a long review pass.",
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
  "session-board-canvas": "Session board for play review only. Drag paths here when play mode is on, or use Edit if you need to change the level.",
  "session-feedback-send": "Save the current feedback into the feedback inbox so it can be reviewed outside the current session.",
  "session-preview-grid": "Visual mosaic of session levels for quick review.",
  "vitobot-source": "Choose whether VitoBot should simulate the current editor level, the current session queue, a folder scan, or the Procedural 100 catalog.",
  "vitobot-folder": "Relative folder inside the repo to scan when Folder mode is active.",
  "vitobot-pattern": "Glob-style pattern used to filter JSON level files inside the selected folder.",
  "vitobot-profile": "Choose the synthetic player archetype: novice, average, focused, or expert.",
  "vitobot-persona": "Choose the behavioural persona: balanced, cautious, explorer, perfectionist, or speedrunner.",
  "vitobot-intelligence": "Adjust how sharp the synthetic player should be, independent from the base profile.",
  "vitobot-runs": "How many simulated runs should be executed per level before aggregating results.",
  "vitobot-load": "Load levels into VitoBot from the selected source.",
  "vitobot-run": "Run the synthetic player simulation across all loaded levels.",
  "vitobot-clear": "Clear loaded VitoBot levels and aggregated results.",
  "mgr-import-input": "Import JSON levels into the Level Manager planner.",
  "mgr-add-progression": "Create a new progression tab with its own ordered 10-slot layout.",
  "mgr-rename-progression": "Rename the currently active progression tab.",
  "mgr-duplicate-progression": "Duplicate the currently active progression with the same slot order, locks, and difficulties.",
  "mgr-toggle-liveops-lock": "Lock or unlock the active liveops progression. Locked liveops survive manager clears and workspace resets.",
  "mgr-autofill": "Fill empty unlocked slots in the active progression using the current pool.",
  "mgr-generate-from-refs": "Generate new candidate levels based on the levels marked as references.",
  "mgr-clear": "Clear unlocked manager levels and slots. Locked liveops stay preserved.",
  "mgr-export-csv": "Export the full manager catalog as CSV.",
  "mgr-export-progression-csv": "Export the active progression as CSV, including slot and level data.",
  "mgr-export-curve-png": "Save a PNG image of the active progression difficulty curve.",
  "mgr-export-progression-png": "Save a PNG image of the active progression cards and slot order.",
  "mgr-export-progression-json": "Save the active progression as a ZIP with level JSONs, screenshots, and progression exports.",
  "mgr-sync-spreadsheet": "Sync the current manager state into the linked spreadsheet tabs.",
  "mgr-apply-sheet-renames": "Read pending renames from the Level Renames spreadsheet tab, apply the real file renames locally, and refresh the canonical sheet.",
  "mgr-tabs": "Switch between progression tabs, unassigned levels, and CSV review.",
  "mgr-slot-grid": "Top progression area with 10 ordered slots. Drag levels here to arrange them.",
  "mgr-pool-grid": "Pool of unassigned levels that can be dragged into the active progression.",
  "mgr-unassigned-grid": "Levels that are not currently placed in any progression.",
  "mgr-progress-title": "Current progression tab and its ordered 10 slots.",
  "settings-export-dir": "Folder inside your project where the toolkit saves JSON, CSV, and screenshot files.",
  "settings-workbook-path": "Workbook file used as the linked spreadsheet mirror for level-manager data.",
  "settings-spreadsheet-id": "Google Sheets document ID used by the local-first Google Sheets sync.",
  "settings-google-sync-method": "Choose whether the toolkit only updates the local workbook mirror or syncs through the Google Sheets API.",
  "settings-google-client-path": "Path to the Google OAuth client JSON used for direct Google Sheets API access.",
  "settings-google-token-path": "Path where the toolkit stores the Google Sheets OAuth token.",
  "settings-auto-sync-sheet": "Automatically refresh the linked spreadsheet workbook after manager changes.",
  "settings-spreadsheet-web-url": "An online spreadsheet URL that supports embedding (Google Sheets publish URL or Office embed link). Used only for the Level Manager embedded view.",
  "settings-sync-sheet": "Run a workbook sync now using the current manager state.",
  "settings-connect-sheet-api": "Open the Google OAuth flow and connect this toolkit to the Google Sheets API.",
  "settings-check-sheet-api": "Check the current Google Sheets API authentication status.",
  "settings-disconnect-sheet-api": "Delete the saved Google Sheets API token for this toolkit.",
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
      vitobot: "Open the synthetic player simulator to estimate time, errors, and success rate across many levels.",
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

function updateSelectedManagerDiffPanel() {
  const selected = getManagerItemById(state.manager.selectedId);
  if (selected) {
    setManagerDiffPanel(`${selected.file}\n${summarizeLevelDiff(selected.originalLevel, selected.level)}`);
    return;
  }
  if (isManagerProgressionTab(state.manager.activeTab)) {
    setManagerDiffPanel("Select a level or press Diff on a card.");
    return;
  }
  setManagerDiffPanel("Open a progression tab to inspect level changes.");
}

function refreshManagerCardSelectionStates() {
  document.querySelectorAll(".manager-card[data-item-id]").forEach((card) => {
    const itemId = Number(card.dataset.itemId);
    card.classList.toggle("selected-preview", itemId === state.manager.selectedId);
  });
  updateSelectedManagerDiffPanel();
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
    visual.title = label ? `${displaySlotLabel(index)}: ${label}` : `${displaySlotLabel(index)}: no difficulty set`;
    bar.appendChild(visual);

    const slotLabel = document.createElement("div");
    slotLabel.className = "difficulty-bar-label";
    slotLabel.textContent = isTutorialSlotIndex(index) ? "T" : `L${index}`;
    bar.appendChild(slotLabel);

    const value = document.createElement("div");
    value.className = "difficulty-bar-value";
    value.textContent = label || "Auto";
    bar.appendChild(value);

    curveEl.appendChild(bar);
  });

  const compact = labels.map((label, index) => `${isTutorialSlotIndex(index) ? "T" : `L${index}`}:${label || "Auto"}`).join(" | ");
  const filled = progression.slots.filter((id, index) => index !== 0 && id != null).length;
  summaryEl.textContent = `${getManagerProgressionLabel(state.manager.activeTab)}\nFilled levels: ${filled}/${progressionPlayableLevelCount(progression)}\nTutorial: slot 0\nCurve: ${compact}`;
}

function meanFeature(rows) {
  const validRows = (rows || []).filter((r) => r && Number.isFinite(r.boardWidth) && Number.isFinite(r.boardHeight));
  if (!validRows.length) return null;
  const sum = validRows.reduce((acc, r) => {
    acc.boardWidth += r.boardWidth;
    acc.boardHeight += r.boardHeight;
    acc.pairs += r.pairs;
    acc.blockers += r.blockers;
    acc.moves += r.moves;
    acc.solutions += r.solutions;
    return acc;
  }, { boardWidth: 0, boardHeight: 0, pairs: 0, blockers: 0, moves: 0, solutions: 0 });
  return {
    boardWidth: sum.boardWidth / validRows.length,
    boardHeight: sum.boardHeight / validRows.length,
    pairs: sum.pairs / validRows.length,
    blockers: sum.blockers / validRows.length,
    moves: sum.moves / validRows.length,
    solutions: sum.solutions / validRows.length
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

function extractMechanicSignals(level) {
  const width = levelWidth(level);
  const height = levelHeight(level);
  const blockers = level?.blockers || [];
  const pairs = level?.pairs || [];
  const blockerSet = new Set(blockers.map(([r, c]) => coordKey(r, c)));
  const freeCells = Math.max(0, width * height - blockers.length - pairs.length * 2);
  let adjacencyLinks = 0;
  blockers.forEach(([r, c]) => {
    [[1, 0], [0, 1]].forEach(([dr, dc]) => {
      if (blockerSet.has(coordKey(r + dr, c + dc))) adjacencyLinks += 1;
    });
  });
  const quadrants = new Set();
  blockers.forEach(([r, c]) => {
    const qr = r < height / 2 ? 0 : 1;
    const qc = c < width / 2 ? 0 : 1;
    quadrants.add(`${qr}:${qc}`);
  });
  const pairSpan = pairs.reduce((acc, pair) => acc + manhattan(pair.start, pair.end), 0) / Math.max(1, pairs.length);
  const pathCoverage = levelPathCoverageRatio(level);
  const pathSignals = levelPathStraightnessSignals(level);
  const blockerSignals = blockerUsefulnessSignals(level, width, height, pairs, blockers);
  return {
    freeCells,
    freeCellsPerPair: freeCells / Math.max(1, pairs.length),
    blockerDensity: blockers.length / Math.max(1, width * height),
    blockerClusterRatio: adjacencyLinks / Math.max(1, blockers.length),
    blockerSpread: quadrants.size / 4,
    engagedBlockerRatio: blockerSignals.engagedBlockerRatio,
    deadBlockerRatio: blockerSignals.deadBlockerRatio,
    multiPairBlockerRatio: blockerSignals.multiPairBlockerRatio,
    pairPressureCoverage: blockerSignals.pairPressureCoverage,
    pairSpan,
    pathCoverage,
    uncoveredFreeCells: Math.max(0, (width * height - blockers.length) - levelGoldenPathCellCount(level)),
    totalBends: pathSignals.totalBends,
    totalExcessBends: pathSignals.totalExcessBends,
    bendsPerPair: pathSignals.bendsPerPair,
    excessBendsPerPair: pathSignals.excessBendsPerPair,
    bendPressure: pathSignals.bendPressure,
    pathStraightness: pathSignals.straightness
  };
}

function learningTagCounts(entries) {
  return (entries || []).reduce((acc, entry) => {
    (entry?.feedback_tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});
}

function scoreCandidateWithLearning(level) {
  const f = extractFeatures(level);
  const signals = extractMechanicSignals(level);
  const guide = analyzeSolutionGuide(level);
  const approvedEntriesSame = state.learning.approved.filter((x) => x.level === f.level);
  const rejectedEntriesSame = state.learning.rejected.filter((x) => x.level === f.level);
  const approvedSame = approvedEntriesSame.map((x) => x.features).filter(Boolean);
  const rejectedSame = rejectedEntriesSame.map((x) => x.features).filter(Boolean);
  const approvedGlobal = state.learning.approved.map((x) => x.features).filter(Boolean);
  const rejectedGlobal = state.learning.rejected.map((x) => x.features).filter(Boolean);
  const correctedGlobal = state.learning.corrections.map((x) => x.corrected_features).filter(Boolean);
  const rejectedPairFeedback = state.learning.rejected.flatMap((entry) => (
    Array.isArray(entry.pair_feedback) ? entry.pair_feedback : []
  ));
  const rejectedReasonCounts = state.learning.rejected.reduce((acc, entry) => {
    const reasonCode = String(entry.reason_code || "");
    if (!reasonCode) return acc;
    acc[reasonCode] = (acc[reasonCode] || 0) + 1;
    return acc;
  }, {});

  const approvedSameMean = meanFeature(approvedSame);
  const rejectedSameMean = meanFeature(rejectedSame);
  const approvedGlobalMean = meanFeature(approvedGlobal);
  const rejectedGlobalMean = meanFeature(rejectedGlobal);
  const correctedGlobalMean = meanFeature(correctedGlobal);
  const approvedTagCounts = learningTagCounts(approvedEntriesSame.length ? approvedEntriesSame : state.learning.approved);
  const rejectedTagCounts = learningTagCounts(rejectedEntriesSame.length ? rejectedEntriesSame : state.learning.rejected);
  const candidatePairFeedback = extractPairFeedback(level);
  let pairPenalty = 0;
  candidatePairFeedback.forEach((candidatePair) => {
    let nearest = Number.POSITIVE_INFINITY;
    rejectedPairFeedback.forEach((rejectedPair) => {
      nearest = Math.min(nearest, pairFeedbackDistance(candidatePair, rejectedPair));
    });
    if (Number.isFinite(nearest) && nearest < 4.5) {
      pairPenalty += (4.5 - nearest) * 1.4;
    }
  });
  const guidePenalty =
    (guide.issues.includes("paths_cross") ? ((rejectedReasonCounts.paths_cross || 0) * 8 + 20) : 0) +
    (guide.issues.includes("missing_solution_path") ? ((rejectedReasonCounts.misleading_solution || 0) * 6 + 12) : 0);
  const mechanicPenalty =
    Math.max(0, signals.freeCellsPerPair - 8.5) * ((rejectedTagCounts.too_much_space || 0) * 2.6 + (rejectedTagCounts.too_easy || 0) * 1.2) +
    Math.max(0, 4 - f.pairs) * (rejectedTagCounts.needs_more_pairs || 0) * 5.2 +
    Math.max(0, 0.34 - signals.blockerDensity) * ((rejectedTagCounts.needs_more_blockers || 0) * 18 + (rejectedTagCounts.too_easy || 0) * 12) +
    Math.max(0, signals.blockerClusterRatio - 0.7) * (rejectedTagCounts.bad_blocker_clustering || 0) * 10 +
    Math.max(0, 1 - signals.blockerSpread) * (rejectedTagCounts.meaningless_blockers || 0) * 8 +
    Math.max(0, signals.blockerClusterRatio - 0.5) * (rejectedTagCounts.meaningless_blockers || 0) * 6 +
    Math.max(0, 0.68 - signals.engagedBlockerRatio) * ((rejectedTagCounts.meaningless_blockers || 0) * 14 + (rejectedTagCounts.too_easy || 0) * 6) +
    signals.deadBlockerRatio * ((rejectedTagCounts.meaningless_blockers || 0) * 18 + (rejectedTagCounts.bad_layout || 0) * 6) +
    Math.max(0, 0.55 - signals.pairPressureCoverage) * ((rejectedTagCounts.meaningless_blockers || 0) * 12 + (rejectedTagCounts.too_easy || 0) * 6 + (rejectedTagCounts.needs_more_pairs || 0) * 3) +
    Math.max(0, 0.18 - signals.multiPairBlockerRatio) * ((rejectedTagCounts.meaningless_blockers || 0) * 8 + (rejectedTagCounts.bad_layout || 0) * 4) +
    Math.max(0, 0.9 - signals.pathCoverage) * 48 +
    signals.excessBendsPerPair * 18 +
    Math.max(0, signals.bendPressure - 0.16) * 42;
  const mechanicReward =
    signals.blockerSpread * (approvedTagCounts.good_blocker_distribution || 0) * 4.5 +
    Math.max(0, 1 - Math.abs(signals.blockerClusterRatio - 0.45)) * (approvedTagCounts.good_blocker_distribution || 0) * 2.2 +
    signals.engagedBlockerRatio * (approvedTagCounts.good_blocker_distribution || 0) * 5.0 +
    signals.pairPressureCoverage * (approvedTagCounts.good_blocker_distribution || 0) * 4.0 +
    signals.multiPairBlockerRatio * (approvedTagCounts.good_blocker_distribution || 0) * 3.2 +
    Math.max(0, f.moves - 11) * (approvedTagCounts.good_flow || 0) * 0.18 +
    Math.max(0, 1 - Math.abs(signals.freeCellsPerPair - 6.5) / 6.5) * (approvedTagCounts.good_layout || 0) * 4.0 +
    Math.max(0, signals.pathCoverage - 0.9) * 18 +
    Math.max(0, signals.pathStraightness - 0.72) * 16;

  return (
    (approvedSameMean ? -featureDistance(f, approvedSameMean) * 2.2 : 0) +
    (rejectedSameMean ? featureDistance(f, rejectedSameMean) * 1.6 : 0) +
    (approvedGlobalMean ? -featureDistance(f, approvedGlobalMean) * 0.9 : 0) +
    (rejectedGlobalMean ? featureDistance(f, rejectedGlobalMean) * 0.55 : 0) +
    (correctedGlobalMean ? -featureDistance(f, correctedGlobalMean) * 1.25 : 0) -
    mechanicPenalty +
    mechanicReward -
    guidePenalty -
    pairPenalty
  );
}

function learningDrivenGenerationAdjustments(levelNumber) {
  const defaultSignalTargets = {
    desiredPathCoverage: levelNumber >= 7 ? 0.94 : levelNumber >= 4 ? 0.92 : 0.9,
    desiredPathStraightness: levelNumber >= 7 ? 0.76 : 0.72,
    desiredEngagedBlockerRatio: levelNumber <= 2 ? 0 : levelNumber <= 4 ? 0.55 : levelNumber <= 6 ? 0.68 : 0.78,
    desiredPairPressureCoverage: levelNumber <= 2 ? 0 : levelNumber <= 4 ? 0.45 : levelNumber <= 6 ? 0.58 : 0.68,
    desiredMultiPairBlockerRatio: levelNumber <= 4 ? 0.1 : levelNumber <= 6 ? 0.18 : 0.24,
    maxDeadBlockerRatio: levelNumber <= 2 ? 1 : levelNumber <= 4 ? 0.45 : levelNumber <= 6 ? 0.3 : 0.2
  };
  const approvedEntriesSame = state.learning.approved.filter((entry) => entry.level === levelNumber);
  const rejectedEntriesSame = state.learning.rejected.filter((entry) => entry.level === levelNumber);
  const approvedSame = approvedEntriesSame.map((entry) => entry.features).filter(Boolean);
  const rejectedSame = rejectedEntriesSame.map((entry) => entry.features).filter(Boolean);
  const correctedSame = state.learning.corrections
    .map((entry) => entry.corrected_features)
    .filter((features) => features && features.level === levelNumber);

  const approvedMean = meanFeature(approvedSame);
  const rejectedMean = meanFeature(rejectedSame);
  const correctedMean = meanFeature(correctedSame);
  const preferredMean = correctedMean || approvedMean;
  const approvedTags = learningTagCounts(approvedEntriesSame.length ? approvedEntriesSame : state.learning.approved);
  const rejectedTags = learningTagCounts(rejectedEntriesSame.length ? rejectedEntriesSame : state.learning.rejected);
  if (!preferredMean && !rejectedMean) {
    return {
      blockerBias: 0,
      pairBias: 0,
      boardDelta: 0,
      desiredMovesFloor: 0,
      desiredSolutionCap: null,
      maxFreeCellsPerPair: null,
      avoidBlockerClusters: 0,
      spreadBlockers: 0,
      desiredPathCoverage: defaultSignalTargets.desiredPathCoverage,
      desiredPathStraightness: defaultSignalTargets.desiredPathStraightness,
      desiredEngagedBlockerRatio: defaultSignalTargets.desiredEngagedBlockerRatio,
      desiredPairPressureCoverage: defaultSignalTargets.desiredPairPressureCoverage,
      desiredMultiPairBlockerRatio: defaultSignalTargets.desiredMultiPairBlockerRatio,
      maxDeadBlockerRatio: defaultSignalTargets.maxDeadBlockerRatio
    };
  }

  const blockerBiasBase = Math.max(-2, Math.min(3, Math.round(
    ((preferredMean?.blockers || 0) - (rejectedMean?.blockers || 0)) * 0.7 +
    ((preferredMean?.moves || 0) - (rejectedMean?.moves || 0)) * 0.12
  )));
  const blockerBias = Math.max(-2, Math.min(4, blockerBiasBase
    + (rejectedTags.needs_more_blockers || 0)
    - (rejectedTags.meaningless_blockers || 0)
    - (rejectedTags.bad_blocker_clustering || 0)
    - Math.min(2, approvedTags.good_blocker_distribution || 0)));
  const pairBias = Math.max(-1, Math.min(4,
    (rejectedTags.needs_more_pairs || 0) * 2
    + (rejectedTags.too_easy || 0)
    + (rejectedTags.too_much_space || 0)
    - Math.max(0, (rejectedMean?.pairs || 0) >= (preferredMean?.pairs || 0) ? 1 : 0)
  ));
  const boardDelta = Math.max(-1, Math.min(2,
    (rejectedTags.too_easy || 0) >= 2 ? 1 :
    (rejectedTags.too_much_space || 0) > 0 ? -1 :
    (rejectedTags.needs_more_pairs || 0) > 0 ? 1 : 0
  ));
  const desiredMovesFloor = Math.max(
    0,
    Math.round(Math.max(preferredMean?.moves || 0, (rejectedMean?.moves || 0) + 1) + (rejectedTags.too_easy || 0) * 1.5)
  );
  const desiredSolutionCap = preferredMean
    ? Math.max(1, Math.round(Math.max(1, preferredMean.solutions || 1)))
    : (rejectedMean ? Math.max(1, Math.round(Math.max(1, (rejectedMean.solutions || 2) - 1))) : null);
  const maxFreeCellsPerPair = (rejectedTags.too_much_space || rejectedTags.too_easy || rejectedTags.needs_more_pairs)
    ? Math.max(4.5, 8 - (rejectedTags.too_much_space || 0) * 0.8 - (rejectedTags.needs_more_pairs || 0) * 0.6)
    : null;
  const desiredPathCoverage = Math.min(
    0.98,
    Math.max(
      defaultSignalTargets.desiredPathCoverage,
      defaultSignalTargets.desiredPathCoverage + (rejectedTags.too_much_space || 0) * 0.02 + (rejectedTags.too_easy || 0) * 0.015
    )
  );
  const desiredPathStraightness = Math.max(
    defaultSignalTargets.desiredPathStraightness,
    Math.min(
      0.95,
      Math.max(
        preferredMean?.path_straightness || 0,
        defaultSignalTargets.desiredPathStraightness + (approvedTags.good_layout || 0) * 0.01 + (approvedTags.good_flow || 0) * 0.008
      )
    )
  );
  const desiredEngagedBlockerRatio = Math.min(
    0.95,
    Math.max(
      defaultSignalTargets.desiredEngagedBlockerRatio,
      defaultSignalTargets.desiredEngagedBlockerRatio + (rejectedTags.meaningless_blockers || 0) * 0.04 + (rejectedTags.too_easy || 0) * 0.015
    )
  );
  const desiredPairPressureCoverage = Math.min(
    0.95,
    Math.max(
      defaultSignalTargets.desiredPairPressureCoverage,
      defaultSignalTargets.desiredPairPressureCoverage + (rejectedTags.meaningless_blockers || 0) * 0.05 + (rejectedTags.needs_more_pairs || 0) * 0.03
    )
  );
  const desiredMultiPairBlockerRatio = Math.min(
    0.7,
    Math.max(
      defaultSignalTargets.desiredMultiPairBlockerRatio,
      defaultSignalTargets.desiredMultiPairBlockerRatio + (rejectedTags.meaningless_blockers || 0) * 0.03 + (approvedTags.good_blocker_distribution || 0) * 0.015
    )
  );
  const maxDeadBlockerRatio = Math.max(
    0.08,
    defaultSignalTargets.maxDeadBlockerRatio - (rejectedTags.meaningless_blockers || 0) * 0.05
  );

  return {
    blockerBias,
    pairBias,
    boardDelta,
    desiredMovesFloor,
    desiredSolutionCap,
    maxFreeCellsPerPair,
    avoidBlockerClusters: (rejectedTags.bad_blocker_clustering || 0) + (rejectedTags.meaningless_blockers || 0),
    spreadBlockers: (approvedTags.good_blocker_distribution || 0) + (rejectedTags.meaningless_blockers || 0) * 0.5,
    desiredPathCoverage,
    desiredPathStraightness,
    desiredEngagedBlockerRatio,
    desiredPairPressureCoverage,
    desiredMultiPairBlockerRatio,
    maxDeadBlockerRatio
  };
}

function blockerPressureScore(cell, pathCellsByPair, boardWidth, boardHeight, next, existingBlockers = [], adjustments = {}) {
  const [r, c] = cell;
  const centerR = (boardHeight - 1) / 2;
  const centerC = (boardWidth - 1) / 2;
  let adjacency = 0;
  let nearby = 0;
  let nearestPathDistance = Number.POSITIVE_INFINITY;
  let pressuredPairs = 0;
  const pairEntries = Array.isArray(pathCellsByPair)
    ? [{ id: "all", cells: pathCellsByPair }]
    : Object.entries(pathCellsByPair || {}).map(([pairId, cells]) => ({ id: pairId, cells }));
  pairEntries.forEach((entry) => {
    let pairNearest = Number.POSITIVE_INFINITY;
    (entry.cells || []).forEach(([pathRow, pathCol]) => {
      const distance = Math.abs(pathRow - r) + Math.abs(pathCol - c);
      nearestPathDistance = Math.min(nearestPathDistance, distance);
      pairNearest = Math.min(pairNearest, distance);
      if (distance === 1) adjacency += 1;
      if (distance <= 2) nearby += 1;
    });
    if (pairNearest <= 2) pressuredPairs += 1;
  });
  const existingSet = new Set((existingBlockers || []).map(([br, bc]) => coordKey(br, bc)));
  let blockerAdjacency = 0;
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
    if (existingSet.has(coordKey(r + dr, c + dc))) blockerAdjacency += 1;
  });
  const qr = r < boardHeight / 2 ? 0 : 1;
  const qc = c < boardWidth / 2 ? 0 : 1;
  const quadrantKey = `${qr}:${qc}`;
  const occupiedQuadrants = new Set((existingBlockers || []).map(([br, bc]) => `${br < boardHeight / 2 ? 0 : 1}:${bc < boardWidth / 2 ? 0 : 1}`));
  const spreadBoost = occupiedQuadrants.has(quadrantKey) ? 0 : 4 + (adjustments.spreadBlockers || 0) * 2;
  const antiClusterPenalty = blockerAdjacency * (adjustments.avoidBlockerClusters || 0) * 2.6;
  const centerBias = -Math.abs(r - centerR) - Math.abs(c - centerC);
  const multiPairBoost = pressuredPairs >= 2 ? 5 + pressuredPairs * 2.2 : pressuredPairs * 1.5;
  const deadZonePenalty = nearestPathDistance > 2 ? 8 + nearestPathDistance : 0;
  return adjacency * 10 + nearby * 2 + centerBias + spreadBoost + multiPairBoost - deadZonePenalty - antiClusterPenalty - blockerAdjacency * 1.8 + next() * 0.35;
}

function generateLevelRaw(levelNumber, seedOffset = 0) {
  const cfg = curve[levelNumber];
  if (!cfg) throw new Error(`Unsupported level: ${levelNumber}`);

  const next = rng(10000 + levelNumber * 101 + seedOffset * 9973);
  const learningAdjustments = learningDrivenGenerationAdjustments(levelNumber);
  const baseBoardSize = pick(next, cfg.board);
  const boardSize = Math.max(MIN_BOARD_SIZE, Math.min(MAX_SQUARE_BOARD_SIZE, baseBoardSize + (learningAdjustments.boardDelta || 0)));
  const boardWidth = boardSize;
  const boardHeight = boardSize;
  const pairCount = Math.max(2, Math.min(PAIR_IDS.length, randInt(next, cfg.pairs[0], cfg.pairs[1]) + (learningAdjustments.pairBias || 0)));
  const blockerTarget = randInt(next, cfg.blockers[0], cfg.blockers[1]) + learningAdjustments.blockerBias;

  const pairs = chooseNodes(boardWidth, boardHeight, pairCount, next);
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
  const pool = allCells(boardWidth, boardHeight).filter(([r, c]) => {
    const k = coordKey(r, c);
    return !pathCells.has(k) && !nodeCells.has(k);
  });

  let currentCount = countSolutions(boardWidth, boardHeight, pairs, blockers, 20);
  while (pool.length) {
    pool.sort((left, right) => blockerPressureScore(right, scaffoldPath, boardWidth, boardHeight, next, blockers, learningAdjustments) - blockerPressureScore(left, scaffoldPath, boardWidth, boardHeight, next, blockers, learningAdjustments));
    const cell = pool.shift();
    if (!cell) break;
    const reachedBlockerTarget = blockers.length >= blockerTarget;
    const reachedSolutionCap = learningAdjustments.desiredSolutionCap != null && currentCount <= learningAdjustments.desiredSolutionCap;
    if (reachedBlockerTarget && (reachedSolutionCap || densityMatch(cfg.density, currentCount))) break;
    const trial = blockers.concat([cell]);
    const newCount = countSolutions(boardWidth, boardHeight, pairs, trial, 20);
    if (newCount >= 1 && newCount < currentCount) {
      blockers.push(cell);
      currentCount = newCount;
      const solvedPaths = findOneSolutionPaths(boardWidth, boardHeight, pairs, blockers) || scaffoldPath;
      const trialMoves = Object.values(solvedPaths).reduce((acc, path) => acc + Math.max(0, path.length - 1), 0);
      const meetsMoveFloor = learningAdjustments.desiredMovesFloor <= 0 || trialMoves >= learningAdjustments.desiredMovesFloor;
      const trialSignals = extractMechanicSignals({
        board_width: boardWidth,
        board_height: boardHeight,
        pairs,
        blockers,
        golden_path: solvedPaths
      });
      const meetsSpaceTarget = learningAdjustments.maxFreeCellsPerPair == null || trialSignals.freeCellsPerPair <= learningAdjustments.maxFreeCellsPerPair;
      const meetsCoverageTarget = trialSignals.pathCoverage >= (learningAdjustments.desiredPathCoverage || 0.9);
      const meetsStraightnessTarget = trialSignals.pathStraightness >= (learningAdjustments.desiredPathStraightness || 0.72);
      const adjustedPairPressureFloor = blockers.length <= 1
        ? Math.max(0, (learningAdjustments.desiredPairPressureCoverage || 0) - 0.18)
        : (learningAdjustments.desiredPairPressureCoverage || 0);
      const adjustedMultiPairFloor = blockers.length <= 2
        ? Math.max(0, (learningAdjustments.desiredMultiPairBlockerRatio || 0) - 0.12)
        : (learningAdjustments.desiredMultiPairBlockerRatio || 0);
      const meetsBlockerUsefulness =
        blockers.length === 0 ||
        (
          trialSignals.engagedBlockerRatio >= (learningAdjustments.desiredEngagedBlockerRatio || 0) &&
          trialSignals.deadBlockerRatio <= (learningAdjustments.maxDeadBlockerRatio == null ? 1 : learningAdjustments.maxDeadBlockerRatio) &&
          trialSignals.pairPressureCoverage >= adjustedPairPressureFloor &&
          trialSignals.multiPairBlockerRatio >= adjustedMultiPairFloor
        );
      if (blockers.length >= blockerTarget && meetsMoveFloor && meetsSpaceTarget && meetsCoverageTarget && meetsStraightnessTarget && meetsBlockerUsefulness && densityMatch(cfg.density, currentCount) && (learningAdjustments.desiredSolutionCap == null || currentCount <= learningAdjustments.desiredSolutionCap)) break;
    }
  }

  const solvedGoldenPath = findOneSolutionPaths(boardWidth, boardHeight, pairs, blockers) || scaffoldPath;
  const moves = Object.values(solvedGoldenPath).reduce((acc, p) => acc + Math.max(0, p.length - 1), 0);
  const solutionCount = currentCount;
  const finalSignals = extractMechanicSignals({
    board_width: boardWidth,
    board_height: boardHeight,
    pairs,
    blockers,
    golden_path: solvedGoldenPath
  });

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
    golden_path: solvedGoldenPath,
    validation: {
      solvable: solutionCount >= 1,
      density_match: densityMatch(cfg.density, solutionCount),
      decal_required: false,
      decal_pass: null,
      path_coverage: finalSignals.pathCoverage,
      path_straightness: finalSignals.pathStraightness,
      excess_bends_per_pair: finalSignals.excessBendsPerPair,
      engaged_blocker_ratio: finalSignals.engagedBlockerRatio,
      dead_blocker_ratio: finalSignals.deadBlockerRatio,
      pair_pressure_coverage: finalSignals.pairPressureCoverage,
      multi_pair_blocker_ratio: finalSignals.multiPairBlockerRatio,
      full_path_area: finalSignals.pathCoverage >= 0.98,
      early_mistake_detection: true,
      no_isolated_pairs: true,
      no_late_dead_ends: true,
      curve_integrity: true
    },
    meta: {
      generation_attempts: 1,
      failed_checks: [],
      path_coverage: finalSignals.pathCoverage,
      path_straightness: finalSignals.pathStraightness,
      excess_bends_per_pair: finalSignals.excessBendsPerPair,
      engaged_blocker_ratio: finalSignals.engagedBlockerRatio,
      dead_blocker_ratio: finalSignals.deadBlockerRatio,
      pair_pressure_coverage: finalSignals.pairPressureCoverage,
      multi_pair_blocker_ratio: finalSignals.multiPairBlockerRatio
    }
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

function proceduralReferenceCandidateRank(baseLevel, candidate, adjustments) {
  const baseFeatures = extractFeatures(baseLevel);
  const candidateFeatures = extractFeatures(candidate);
  const similarity = featureDistance(baseFeatures, candidateFeatures);
  const learningBias = scoreCandidateWithLearning(candidate);
  const intentPenalty = proceduralReferenceIntentPenalty(baseLevel, candidate, adjustments);
  const moveDelta = Math.abs((baseLevel.moves || 0) - (candidate.moves || 0)) * 0.04;
  return {
    similarity,
    learningBias,
    intentPenalty,
    total: similarity + moveDelta + intentPenalty - learningBias * 0.08
  };
}

function buildReferenceVariantName(baseFileName, variantIndex) {
  const stem = candidateNameStem(baseFileName || "reference_level");
  return `${stem}_variant_${variantIndex}.json`;
}

function clonePair(pair) {
  return {
    ...pair,
    start: Array.isArray(pair?.start) ? [...pair.start] : pair?.start,
    end: Array.isArray(pair?.end) ? [...pair.end] : pair?.end
  };
}

function canShrinkReferenceBoard(level) {
  const width = levelWidth(level);
  const height = levelHeight(level);
  if (width <= 4 || height <= 4) return false;
  const maxRow = Math.max(
    ...((level.pairs || []).flatMap((pair) => [pair.start?.[0] ?? 0, pair.end?.[0] ?? 0])),
    ...((level.blockers || []).map((cell) => cell?.[0] ?? 0)),
    0
  );
  const maxCol = Math.max(
    ...((level.pairs || []).flatMap((pair) => [pair.start?.[1] ?? 0, pair.end?.[1] ?? 0])),
    ...((level.blockers || []).map((cell) => cell?.[1] ?? 0)),
    0
  );
  return maxRow < height - 1 && maxCol < width - 1;
}

function buildMutatedReferenceCandidate(baseLevel, baseFileName, adjustments, variantIndex) {
  const normalized = normalizeProceduralReferenceAdjustments(adjustments);
  const candidate = cloneLevel(baseLevel);
  candidate.pairs = (candidate.pairs || []).map((pair) => clonePair(pair));
  candidate.blockers = (candidate.blockers || []).map((cell) => [...cell]);

  let width = levelWidth(candidate);
  let height = levelHeight(candidate);

  if (normalized.board === "bigger" && width < 9 && height < 9) {
    width += 1;
    height += 1;
  } else if (normalized.board === "smaller" && canShrinkReferenceBoard(candidate)) {
    width -= 1;
    height -= 1;
  }

  candidate.board_size = width;
  candidate.board_width = width;
  candidate.board_height = height;

  const occupied = new Set();
  (candidate.pairs || []).forEach((pair) => {
    occupied.add(coordKey(pair.start[0], pair.start[1]));
    occupied.add(coordKey(pair.end[0], pair.end[1]));
  });

  const maxPairsForBoard = Math.min(PAIR_IDS.length, Math.floor(width * height / 6));
  if (normalized.pairs === "more" && (candidate.pairs || []).length < maxPairsForBoard) {
    const addCount = Math.min(2, maxPairsForBoard - candidate.pairs.length);
    for (let a = 0; a < addCount; a++) {
      const next = rng(7000 + variantIndex * 101 + a * 37);
      const newPairId = String.fromCharCode(65 + candidate.pairs.length);
      const nodes = chooseNodes(width, height, 1, next);
      if (nodes[0]) {
        candidate.pairs.push({ id: newPairId, start: nodes[0].start, end: nodes[0].end });
        occupied.add(coordKey(nodes[0].start[0], nodes[0].start[1]));
        occupied.add(coordKey(nodes[0].end[0], nodes[0].end[1]));
      }
    }
  } else if (normalized.pairs === "less" && (candidate.pairs || []).length > 2) {
    candidate.pairs = candidate.pairs.slice(0, candidate.pairs.length - 1);
  }

  const blockerSet = new Set((candidate.blockers || []).map(([r, c]) => coordKey(r, c)));
  const freeCells = allCells(width, height).filter(([r, c]) => !occupied.has(coordKey(r, c)) && !blockerSet.has(coordKey(r, c)));
  if (normalized.blockers === "more" && freeCells.length > 2) {
    const clusterSize = Math.min(3, freeCells.length);
    const startIdx = variantIndex % freeCells.length;
    for (let b = 0; b < clusterSize; b++) {
      const idx = (startIdx + b) % freeCells.length;
      candidate.blockers.push(freeCells[idx]);
    }
  } else if (normalized.blockers === "less" && candidate.blockers.length > 1) {
    const removeCount = Math.min(2, candidate.blockers.length - 1);
    candidate.blockers = candidate.blockers.slice(0, candidate.blockers.length - removeCount);
  }

  const solved = findOneSolutionPaths(width, height, candidate.pairs || [], candidate.blockers || []);
  candidate.golden_path = solved || candidate.golden_path || {};
  candidate.solution_count = countSolutions(width, height, candidate.pairs || [], candidate.blockers || [], 20);
  candidate.moves = solved
    ? Object.values(solved).reduce((acc, path) => acc + Math.max(0, (path || []).length - 1), 0)
    : Number(candidate.moves || 0);
  candidate.difficulty = levelDifficulty(baseLevel);
  candidate.target_density = difficultyToTargetDensity(candidate.difficulty, candidate.solution_count || 0);
  candidate.meta = {
    ...(candidate.meta || {}),
    generated_from_reference: baseFileName || "reference_level.json",
    reference_intent: normalized,
    recovery_mutation: true
  };
  return candidate;
}

function generateReferenceDrivenCandidates(baseLevel, baseFileName, adjustments, count = 3) {
  const desiredDifficulty = levelDifficulty(baseLevel);
  const normalizedAdjustments = normalizeProceduralReferenceAdjustments(adjustments);
  const preferredLevels = rankedReferenceGenerationLevels(baseLevel, normalizedAdjustments);
  const pool = [];
  const seen = new Set();
  const maxSeeds = proceduralReferenceHasActiveIntent(normalizedAdjustments) ? 220 : 180;
  const targetPoolSize = Math.max(count * (proceduralReferenceHasActiveIntent(normalizedAdjustments) ? 12 : 8), 20);

  function pushCandidate(candidate, relaxed = false) {
    if (!candidate) return;
    const report = validateLevel(candidate);
    if (!report.valid) return;
    candidate.difficulty = desiredDifficulty;
    candidate.target_density = difficultyToTargetDensity(desiredDifficulty, candidate.solution_count || 0);
    candidate.meta = {
      ...(candidate.meta || {}),
      generated_from_reference: baseFileName || "reference_level.json",
      reference_intent: normalizedAdjustments,
      manual_difficulty: desiredDifficulty,
      relaxed_reference_generation: !!relaxed
    };
    const guide = analyzeSolutionGuide(candidate);
    if (!relaxed && hasCriticalGuideIssue(guide)) return;
    const signature = JSON.stringify({
      boardWidth: levelWidth(candidate),
      boardHeight: levelHeight(candidate),
      pairs: candidate.pairs,
      blockers: candidate.blockers
    });
    if (seen.has(signature)) return;
    seen.add(signature);
    const rank = proceduralReferenceCandidateRank(baseLevel, candidate, normalizedAdjustments);
    pool.push({ level: cloneLevel(candidate), rank });
  }

  for (let seed = 0; seed < maxSeeds && pool.length < targetPoolSize; seed++) {
    for (const levelNumber of preferredLevels) {
      if (pool.length >= targetPoolSize) break;
      pushCandidate(generateLevelRaw(levelNumber, 500 + seed + (levelNumber * 97)), false);
    }
  }

  if (pool.length < count) {
    for (let seed = 0; seed < maxSeeds && pool.length < count; seed++) {
      for (const levelNumber of preferredLevels) {
        if (pool.length >= count) break;
        pushCandidate(generateLevelRaw(levelNumber, 2500 + seed + (levelNumber * 131)), true);
      }
    }
  }

  if (pool.length < count) {
    for (let i = 0; i < count * 3 && pool.length < count; i++) {
      pushCandidate(buildMutatedReferenceCandidate(baseLevel, baseFileName, normalizedAdjustments, i + 1), true);
    }
  }

  pool.sort((left, right) => left.rank.total - right.rank.total);
  return pool.slice(0, count).map((entry, index) => ({
    id: state.main.nextCandidateId++,
    name: buildReferenceVariantName(baseFileName, index + 1),
    level: entry.level,
    similarity: entry.rank.similarity,
    learningBias: entry.rank.learningBias,
    intentPenalty: entry.rank.intentPenalty,
    status: "pending",
    savedPath: "",
    screenshotPath: "",
    showSolution: true,
    referenceIntent: normalizedAdjustments
  }));
}

function renderProceduralReferenceLab() {
  const fileTag = document.getElementById("main-reference-file");
  const statsTag = document.getElementById("main-reference-stats");
  const intentTag = document.getElementById("main-reference-intent");
  const learningTag = document.getElementById("main-reference-learning");
  const grid = document.getElementById("main-reference-grid");
  if (!fileTag || !statsTag || !intentTag || !learningTag || !grid) return;

  if (state.main.baseLevel) {
    fileTag.textContent = `Loaded base: ${state.main.baseFileName || state.main.baseLevel.meta?.source_name || "reference_level.json"}`;
    statsTag.textContent = levelFeatureSummary(state.main.baseLevel);
  } else {
    fileTag.textContent = "No base level selected";
    statsTag.textContent = "Pick a JSON to start.";
  }
  intentTag.textContent = proceduralReferenceIntentText(state.main.adjustments);
  learningTag.textContent = `Learning memory: ${state.learning.approved.length} approved · ${state.learning.rejected.length} rejected · ${state.learning.corrections.length} fixes`;

  grid.innerHTML = "";
  if (state.main.baseLevel) {
    const baseCard = document.createElement("article");
    baseCard.className = "procedural-reference-card base-preview";

    const baseHead = document.createElement("div");
    baseHead.className = "procedural-reference-head";

    const baseTitle = document.createElement("div");
    baseTitle.className = "procedural-reference-title";
    baseTitle.textContent = "Base level preview";
    baseHead.appendChild(baseTitle);

    const baseBadgeWrap = document.createElement("div");
    baseBadgeWrap.className = "procedural-reference-badges";
    const baseBadge = document.createElement("div");
    baseBadge.className = "procedural-reference-status";
    baseBadge.textContent = "REFERENCE";
    baseBadgeWrap.appendChild(baseBadge);
    baseHead.appendChild(baseBadgeWrap);
    baseCard.appendChild(baseHead);

    const basePreview = document.createElement("canvas");
    basePreview.width = 220;
    basePreview.height = 220;
    drawLevelPreviewCanvas(basePreview, state.main.baseLevel, false, { showSolution: false });
    baseCard.appendChild(basePreview);

    const baseMeta = document.createElement("div");
    baseMeta.className = "procedural-reference-meta";
    baseMeta.textContent = `${levelFeatureSummary(state.main.baseLevel)}\nPairs: ${(state.main.baseLevel.pairs || []).map((pair) => pair.id).join(", ")}\nUse this board as the visual reference for the next generation pass.`;
    baseCard.appendChild(baseMeta);
    grid.appendChild(baseCard);
  }

  if (!state.main.candidates.length) {
    if (!state.main.baseLevel) {
      const empty = document.createElement("div");
      empty.className = "procedural-reference-empty";
      empty.textContent = "Choose a base JSON first. The loaded level preview and generated variant previews will appear here.";
      grid.appendChild(empty);
    }
    return;
  }

  state.main.candidates.forEach((candidate, index) => {
    const guide = analyzeSolutionGuide(candidate.level);
    const guideTrust = guideTrustLevel(guide);
    const card = document.createElement("article");
    card.className = `procedural-reference-card ${candidate.status}`;

    const head = document.createElement("div");
    head.className = "procedural-reference-head";

    const title = document.createElement("div");
    title.className = "procedural-reference-title";
    title.textContent = `Variant ${index + 1}`;
    head.appendChild(title);

    const badges = document.createElement("div");
    badges.className = "procedural-reference-badges";

    const status = document.createElement("div");
    status.className = "procedural-reference-status";
    status.textContent = candidate.status.toUpperCase();
    badges.appendChild(status);

    const trust = document.createElement("div");
    trust.className = `procedural-guide-trust trust-${guideTrust.toLowerCase()}`;
    trust.textContent = `Guide ${guideTrust}`;
    trust.title = guide.isClean ? "Guide check passed without issues." : `Guide issues: ${guide.issues.join(", ")}`;
    badges.appendChild(trust);

    head.appendChild(badges);
    card.appendChild(head);

    const preview = document.createElement("canvas");
    preview.width = 220;
    preview.height = 220;
    drawLevelPreviewCanvas(preview, candidate.level, false, { showSolution: candidate.showSolution });
    card.appendChild(preview);

    const nameInput = document.createElement("input");
    nameInput.className = "procedural-reference-name";
    nameInput.type = "text";
    nameInput.value = candidate.name;
    nameInput.placeholder = "File name";
    nameInput.addEventListener("change", () => {
      candidate.name = normalizeLevelFileName(nameInput.value || candidate.name || `variant_${candidate.id}`);
      nameInput.value = candidate.name;
      persistWorkspaceState();
    });
    card.appendChild(nameInput);

    const meta = document.createElement("div");
    meta.className = "procedural-reference-meta";
    const discardSummary = candidate.discardReasonCode || candidate.discardReason
      ? `\nLast discard: ${composeDiscardReasonText(candidate.discardReasonCode || classifyDiscardReason(candidate.discardReason || ""), candidate.discardNote || "")}${Array.isArray(candidate.discardPairIds) && candidate.discardPairIds.length ? ` (pairs: ${candidate.discardPairIds.join(", ")})` : ""}`
      : "";
    meta.textContent = `${levelFeatureSummary(candidate.level)}\nPairs: ${(candidate.level.pairs || []).map((pair) => pair.id).join(", ")}\nIntent: ${proceduralReferenceIntentText(candidate.referenceIntent || state.main.adjustments).replace(/^Intent:\s*/, "")}\nSimilarity to base: ${candidate.similarity.toFixed(2)}\nIntent penalty: ${(candidate.intentPenalty || 0).toFixed(2)}\nLearning bias: ${candidate.learningBias.toFixed(2)}\nGuide trust: ${guideTrust}${guide.isClean ? " (clean)" : ` (${guide.issues.join(", ")})`}${discardSummary}`;
    card.appendChild(meta);

    const solution = document.createElement("div");
    solution.className = "procedural-reference-solution";
    solution.textContent = `How to solve\n${levelGoldenPathSummary(candidate.level) || "No golden path available."}`;
    card.appendChild(solution);

    const actions = document.createElement("div");
    actions.className = "procedural-reference-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = candidate.showSolution ? "Hide Solution" : "Show Solution";
    toggleBtn.addEventListener("click", () => {
      candidate.showSolution = !candidate.showSolution;
      renderProceduralReferenceLab();
      persistWorkspaceState();
    });
    actions.appendChild(toggleBtn);

    const editorBtn = document.createElement("button");
    editorBtn.textContent = "To Editor";
    editorBtn.addEventListener("click", () => {
      loadLevelToEditor(candidate.level, { fileName: candidate.name });
      setEditorLink("standalone", null, `Reference variant ${index + 1}`);
      setActiveView("editor");
      log("main-log", `Opened ${candidate.name} in the editor.`);
    });
    actions.appendChild(editorBtn);

    const keepBtn = document.createElement("button");
    keepBtn.textContent = "Keep";
    keepBtn.addEventListener("click", () => {
      if (candidate.status !== "kept" && candidate.status !== "saved") {
        recordLearningDecision(candidate.level, "approve", "reference_keep", {
          base_file: state.main.baseFileName || "",
          candidate_name: candidate.name,
          reference_intent: normalizeProceduralReferenceAdjustments(candidate.referenceIntent || state.main.adjustments)
        });
      }
      candidate.status = "kept";
      renderProceduralReferenceLab();
      persistWorkspaceState();
      log("main-log", `Kept ${candidate.name} for future procedural learning.`);
    });
    actions.appendChild(keepBtn);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", async () => {
      try {
        const saved = await saveLevelArtifactsToProject(candidate.level, candidate.name);
        candidate.status = "saved";
        candidate.savedPath = saved.jsonPath;
        candidate.screenshotPath = saved.screenshotPath;
        recordLearningDecision(candidate.level, "approve", "reference_save", {
          base_file: state.main.baseFileName || "",
          candidate_name: candidate.name,
          saved_path: saved.jsonPath,
          reference_intent: normalizeProceduralReferenceAdjustments(candidate.referenceIntent || state.main.adjustments)
        });
        renderProceduralReferenceLab();
        persistWorkspaceState();
        log("main-log", `Saved ${candidate.name} to ${displayProjectPath(saved.jsonPath)}.`);
      } catch (err) {
        log("main-log", `Could not save ${candidate.name}: ${formatParseError(err)}`);
      }
    });
    actions.appendChild(saveBtn);

    card.appendChild(actions);

    if (!candidate.discardDraftReason && guide.issues.includes("paths_cross")) candidate.discardDraftReason = "paths_cross";
    if (!Array.isArray(candidate.discardDraftPairs)) candidate.discardDraftPairs = Array.isArray(candidate.discardPairIds) ? [...candidate.discardPairIds] : [];
    if (candidate.discardDraftNote == null) candidate.discardDraftNote = candidate.discardNote || "";

    const discardPanel = document.createElement("div");
    discardPanel.className = "procedural-discard-panel";

    const discardTitle = document.createElement("div");
    discardTitle.className = "procedural-discard-title";
    discardTitle.textContent = "Discard feedback";
    discardPanel.appendChild(discardTitle);

    const discardHint = document.createElement("div");
    discardHint.className = "procedural-discard-hint";
    discardHint.textContent = "Pick one reason, then mark the pair(s) that caused the issue.";
    discardPanel.appendChild(discardHint);

    const discardReasonChips = document.createElement("div");
    discardReasonChips.className = "procedural-discard-reasons";
    const reasonButtons = [];
    DISCARD_REASON_OPTIONS.filter((option) => option.value).forEach((option) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "procedural-discard-reason-chip";
      chip.dataset.reason = option.value;
      chip.textContent = option.label;
      chip.addEventListener("click", () => {
        candidate.discardDraftReason = option.value;
        refreshDiscardPanelUi();
        persistWorkspaceState();
      });
      reasonButtons.push(chip);
      discardReasonChips.appendChild(chip);
    });
    discardPanel.appendChild(discardReasonChips);

    const pairChips = document.createElement("div");
    pairChips.className = "procedural-discard-pairs";
    const pairButtons = [];
    (candidate.level.pairs || []).forEach((pair) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "procedural-pair-chip";
      chip.textContent = pair.id;
      chip.addEventListener("click", () => {
        toggleDiscardDraftPair(candidate, pair.id);
        refreshDiscardPanelUi();
        persistWorkspaceState();
      });
      pairButtons.push(chip);
      pairChips.appendChild(chip);
    });
    discardPanel.appendChild(pairChips);

    const discardNote = document.createElement("textarea");
    discardNote.className = "procedural-discard-note";
    discardNote.rows = 2;
    discardNote.placeholder = "Optional note";
    discardNote.value = candidate.discardDraftNote || "";
    discardNote.addEventListener("input", () => {
      candidate.discardDraftNote = discardNote.value;
      persistWorkspaceState();
    });
    discardPanel.appendChild(discardNote);

    const discardActions = document.createElement("div");
    discardActions.className = "procedural-discard-actions";

    const discardBtn = document.createElement("button");
    discardBtn.type = "button";
    discardBtn.className = "procedural-discard-apply";
    discardBtn.textContent = "Discard";
    discardBtn.addEventListener("click", () => {
      const reasonCode = String(candidate.discardDraftReason || "").trim();
      if (!reasonCode) {
        log("main-log", "Discard cancelled: choose a discard reason first.");
        return;
      }
      const normalizedPairIds = normalizeDiscardPairIds((candidate.discardDraftPairs || []).join(","), candidate.level);
      const pairFeedback = extractPairFeedback(candidate.level, normalizedPairIds);
      const reasonText = composeDiscardReasonText(reasonCode, candidate.discardDraftNote || "");
      const previousPairs = Array.isArray(candidate.discardPairIds) ? candidate.discardPairIds : [];
      const samePairs = JSON.stringify(previousPairs) === JSON.stringify(normalizedPairIds);
      const sameReason = candidate.discardReasonCode === reasonCode && String(candidate.discardNote || "") === String(candidate.discardDraftNote || "");
      if (candidate.status !== "discarded" || !samePairs || !sameReason) {
        recordLearningDecision(candidate.level, "reject", "reference_discard", {
          base_file: state.main.baseFileName || "",
          candidate_name: candidate.name,
          reason_text: reasonText,
          reason_code: reasonCode,
          pair_ids: normalizedPairIds,
          pair_feedback: pairFeedback,
          note_text: String(candidate.discardDraftNote || "").trim(),
          reference_intent: normalizeProceduralReferenceAdjustments(candidate.referenceIntent || state.main.adjustments)
        });
      }
      candidate.status = "discarded";
      candidate.discardReason = reasonText;
      candidate.discardReasonCode = reasonCode;
      candidate.discardNote = String(candidate.discardDraftNote || "").trim();
      candidate.discardPairIds = normalizedPairIds;
      renderProceduralReferenceLab();
      persistWorkspaceState();
      log("main-log", `Discarded ${candidate.name} · reason: ${reasonText || reasonCode}${normalizedPairIds.length ? ` · pairs: ${normalizedPairIds.join(", ")}` : ""}.`);
    });
    discardActions.appendChild(discardBtn);

    const clearDiscardBtn = document.createElement("button");
    clearDiscardBtn.type = "button";
    clearDiscardBtn.textContent = "Clear";
    clearDiscardBtn.addEventListener("click", () => {
      candidate.discardDraftReason = "";
      candidate.discardDraftPairs = [];
      candidate.discardDraftNote = "";
      discardNote.value = "";
      refreshDiscardPanelUi();
      persistWorkspaceState();
    });
    discardActions.appendChild(clearDiscardBtn);

    const refreshDiscardPanelUi = () => {
      const currentReason = String(candidate.discardDraftReason || "");
      const activePairs = new Set((candidate.discardDraftPairs || []).map((pairId) => String(pairId || "").toUpperCase()));
      reasonButtons.forEach((button) => {
        const selected = button.dataset.reason === currentReason;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      pairButtons.forEach((button) => {
        const selected = activePairs.has(String(button.textContent || "").toUpperCase());
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      discardBtn.disabled = !currentReason;
    };

    refreshDiscardPanelUi();
    discardPanel.appendChild(discardActions);

    card.appendChild(discardPanel);
    grid.appendChild(card);
  });
}

function regenerateReferenceCandidates(logTarget = "main-log") {
  if (!state.main.baseLevel) {
    log(logTarget, "Choose a base level JSON first.");
    return 0;
  }
  state.main.candidates = generateReferenceDrivenCandidates(
    state.main.baseLevel,
    state.main.baseFileName || state.main.baseLevel.meta?.source_name || "reference_level.json",
    state.main.adjustments,
    3
  );
  renderProceduralReferenceLab();
  persistWorkspaceState();
  const recoveryCount = state.main.candidates.filter((candidate) => candidate.level?.meta?.recovery_mutation).length;
  log(
    logTarget,
    `Generated ${state.main.candidates.length} reference-driven variant(s) from ${state.main.baseFileName || "selected level"}. ${proceduralReferenceIntentText(state.main.adjustments)}.${recoveryCount ? ` Recovery mutations used: ${recoveryCount}.` : ""}`
  );
  return state.main.candidates.length;
}

function regenerateEditorVariantCandidates(logTarget = "ed-log") {
  const baseLevel = levelFromEditor();
  if (!baseLevel.pairs?.length) {
    log(logTarget, "Add at least one complete pair before generating editor variants.");
    return 0;
  }
  state.editor.variantAdjustments = normalizeProceduralReferenceAdjustments(state.editor.variantAdjustments);
  state.editor.variantCandidates = generateReferenceDrivenCandidates(
    baseLevel,
    state.editor.fileName || baseLevel.meta?.source_name || "editor_level.json",
    state.editor.variantAdjustments,
    3
  ).map((candidate) => ({
    ...candidate,
    status: "pending",
    showSolution: true
  }));
  renderEditorVariantLab();
  persistWorkspaceState();
  log(
    logTarget,
    `Generated ${state.editor.variantCandidates.length} editor variant(s). ${proceduralReferenceIntentText(state.editor.variantAdjustments)}.`
  );
  return state.editor.variantCandidates.length;
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
  if (!(levelTier(level) >= 1 && levelTier(level) <= 10)) errors.push("level 1..10 required");
  const width = levelWidth(level);
  const height = levelHeight(level);
  if (!isSupportedBoardSize(width, height)) errors.push("board size exceeds limit: width must be 4..7 and height must be 4..8 (max 7x8)");

  const pairs = level.pairs || [];
  if (pairs.length < 2 || pairs.length > PAIR_IDS.length) errors.push(`pairs count must be 2..${PAIR_IDS.length}`);

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

  const moves = Number(level?.moves);
  const warnings = [];
  if (!Number.isFinite(moves)) {
    errors.push("moves must be a valid number");
  } else {
    if (moves < 0) errors.push("moves must be >= 0");
    if (moves < pairs.length) {
      // Moves below pair count is a budget warning, not a blocking error.
      // Players can add extra moves at runtime. Auto-fix to pairs + 1.
      warnings.push(`moves budget (${moves}) below pairs (${pairs.length}) — will use ${pairs.length + 1} as minimum budget`);
      level.moves = pairs.length + 1;
    }
  }
  const decalRequired = !!level.decal;
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
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
    warnings,
    solutionCount: actualSolutionCount,
    solvable,
    decalRequired,
    decalPass
  };
}

function saveBlockingErrorForLevel(level) {
  const moves = Number(level?.moves);
  if (!Number.isFinite(moves)) return "Cannot save level: moves must be a valid number.";
  if (moves < 0) return "Cannot save level: moves must be >= 0.";
  // moves < pairs is no longer a blocking error — it auto-corrects to pairs + 1 at validation time
  return "";
}

function assertLevelCanBeSaved(level) {
  const message = saveBlockingErrorForLevel(level);
  if (message) throw new Error(message);
}

function saveLearning() {
  localStorage.setItem(LEARNING_KEY, JSON.stringify(state.learning));
  saveRepoFile(CANONICAL_STATE_PATHS.learning, JSON.stringify(state.learning, null, 2)).catch(() => {});
  queueBrowserStateSync("learning_saved");
}

function loadLearning() {
  try {
    const raw = localStorage.getItem(LEARNING_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.learning.approved = Array.isArray(parsed.approved) ? parsed.approved : [];
    state.learning.rejected = Array.isArray(parsed.rejected) ? parsed.rejected : [];
    state.learning.corrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
    normalizeLearningBuckets();
  } catch (_err) {
    state.learning.approved = [];
    state.learning.rejected = [];
    state.learning.corrections = [];
  }
}

async function restoreLearningFromRepo() {
  try {
    if (state.learning.approved.length || state.learning.rejected.length || state.learning.corrections.length) return false;
    const parsed = await fetchJsonIfAvailable(`/${CANONICAL_STATE_PATHS.learning.replace(/^\.?\/+/, "")}`);
    if (!parsed) return false;
    state.learning.approved = Array.isArray(parsed.approved) ? parsed.approved : [];
    state.learning.rejected = Array.isArray(parsed.rejected) ? parsed.rejected : [];
    state.learning.corrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
    normalizeLearningBuckets();
    return true;
  } catch (_err) {
    return false;
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
    state.settings.managerOutputDir = resolveProjectPath(String(parsed.managerOutputDir || DEFAULT_MANAGER_OUTPUT_DIR));
    state.settings.spreadsheetWorkbookPath = String(parsed.spreadsheetWorkbookPath || DEFAULT_SPREADSHEET_WORKBOOK_PATH);
    state.settings.spreadsheetId = String(parsed.spreadsheetId || DEFAULT_GOOGLE_SPREADSHEET_ID);
    state.settings.googleSyncMethod = ["workbook_only", "sheets_api"].includes(String(parsed.googleSyncMethod || ""))
      ? String(parsed.googleSyncMethod)
      : DEFAULT_GOOGLE_SYNC_METHOD;
    state.settings.googleClientPath = String(parsed.googleClientPath || DEFAULT_GOOGLE_CLIENT_PATH);
    state.settings.googleTokenPath = String(parsed.googleTokenPath || DEFAULT_GOOGLE_TOKEN_PATH);
    state.settings.spreadsheetWebAppUrl = String(parsed.spreadsheetWebAppUrl || "").trim()
      || `https://docs.google.com/spreadsheets/d/${state.settings.spreadsheetId}/edit`;
    state.settings.autoSyncSheetDb = parsed.autoSyncSheetDb !== false;
    state.settings.fontFamily = String(parsed.fontFamily || DEFAULT_FONT_FAMILY);
    state.settings.uiTheme = { ...DEFAULT_UI_THEME, ...(parsed.uiTheme || {}) };
    state.settings.pairColors = Array.isArray(parsed.pairColors) ? PAIR_IDS.map((_, index) => parsed.pairColors[index] || pairColors[index]) : [...pairColors];
    state.settings.maxPairs = Math.max(1, Math.min(PAIR_IDS.length, Number(parsed.maxPairs || 5)));
    state.settings.defaultBoardWidth = Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_WIDTH, Number(parsed.defaultBoardWidth || 5)));
    state.settings.defaultBoardHeight = Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_HEIGHT, Number(parsed.defaultBoardHeight || 5)));
    state.settings.defaultDifficulty = ["EASY", "MEDIUM", "HARD"].includes(parsed.defaultDifficulty) ? parsed.defaultDifficulty : "MEDIUM";
    state.settings.performanceProfile = ["low", "medium", "high"].includes(String(parsed.performanceProfile || "").toLowerCase())
      ? String(parsed.performanceProfile).toLowerCase()
      : "medium";
  } catch (_err) {
    state.settings.exportDir = DEFAULT_PROJECT_SAVE_DIR;
    state.settings.managerOutputDir = DEFAULT_MANAGER_OUTPUT_DIR;
    state.settings.spreadsheetWorkbookPath = DEFAULT_SPREADSHEET_WORKBOOK_PATH;
    state.settings.spreadsheetId = DEFAULT_GOOGLE_SPREADSHEET_ID;
    state.settings.googleSyncMethod = DEFAULT_GOOGLE_SYNC_METHOD;
    state.settings.googleClientPath = DEFAULT_GOOGLE_CLIENT_PATH;
    state.settings.googleTokenPath = DEFAULT_GOOGLE_TOKEN_PATH;
    state.settings.spreadsheetWebAppUrl = DEFAULT_SPREADSHEET_WEB_APP_URL;
    state.settings.autoSyncSheetDb = true;
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
  queueBrowserStateSync("settings_saved");
  const input = document.getElementById("settings-export-dir");
  if (input) input.value = displayProjectPath(state.settings.exportDir);
  const managerOutputInput = document.getElementById("settings-manager-output-dir");
  if (managerOutputInput) managerOutputInput.value = displayProjectPath(state.settings.managerOutputDir);
  const workbookInput = document.getElementById("settings-workbook-path");
  if (workbookInput) workbookInput.value = displayProjectPath(state.settings.spreadsheetWorkbookPath);
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
  state.editor.boardWidth = Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_WIDTH, Number(state.settings.defaultBoardWidth || 5)));
  state.editor.boardHeight = Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_HEIGHT, Number(state.settings.defaultBoardHeight || 5)));
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

function buildBrowserSnapshotPayload() {
  const snapshots = {};
  Object.entries(LOCAL_STORE_SNAPSHOT_MAP).forEach(([kind, storageKey]) => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    if (kind === "workspace_state" && raw.length > MAX_BROWSER_BACKUP_SNAPSHOT_BYTES) return;
    try {
      snapshots[kind] = {
        storageKey,
        payload: JSON.parse(raw)
      };
    } catch (_err) {
      snapshots[kind] = {
        storageKey,
        payload: raw
      };
    }
  });
  return snapshots;
}

async function pushBrowserStateToLocalStore(reason = "manual_sync") {
  const snapshots = buildBrowserSnapshotPayload();
  if (!Object.keys(snapshots).length) return { ok: true, skipped: true, reason: "no_snapshots" };
  const response = await fetch("/api/local-store/browser-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      source: "toolkit_web",
      reason,
      snapshots
    })
  });
  if (!response.ok) throw new Error(`Browser state sync failed (${response.status})`);
  return response.json();
}

function queueBrowserStateSync(reason = "state_changed", delayMs = 350) {
  if (browserSyncTimer) clearTimeout(browserSyncTimer);
  browserSyncTimer = setTimeout(async () => {
    browserSyncTimer = null;
    if (browserSyncInFlight) return;
    browserSyncInFlight = true;
    try {
      await pushBrowserStateToLocalStore(reason);
    } catch (_err) {
      // Best-effort backup only.
    } finally {
      browserSyncInFlight = false;
    }
  }, delayMs);
}

async function flushBrowserStateSync(reason = "manual_flush") {
  if (browserSyncTimer) {
    clearTimeout(browserSyncTimer);
    browserSyncTimer = null;
  }
  if (browserSyncInFlight) return;
  browserSyncInFlight = true;
  try {
    await pushBrowserStateToLocalStore(reason);
  } catch (_err) {
    // Best-effort backup only.
  } finally {
    browserSyncInFlight = false;
  }
}

function scheduleWorkspaceStatePersist(delayMs = 250) {
  if (isRestoringWorkspaceState || isBootstrappingWorkspaceState) return;
  if (workspacePersistTimer) clearTimeout(workspacePersistTimer);
  workspacePersistTimer = setTimeout(() => {
    workspacePersistTimer = null;
    persistWorkspaceState();
  }, delayMs);
}

async function hydrateBrowserStateFromLocalStore() {
  try {
    const kinds = Object.keys(LOCAL_STORE_SNAPSHOT_MAP);
    const params = new URLSearchParams();
    kinds.forEach((kind) => params.append("kind", kind));
    const response = await fetch(`/api/local-store/browser-state?${params.toString()}`);
    if (!response.ok) return false;
    const payload = await response.json();
    const snapshots = payload.snapshots || {};
    let restoredAny = false;
    Object.entries(snapshots).forEach(([kind, snapshot]) => {
      const storageKey = LOCAL_STORE_SNAPSHOT_MAP[kind] || snapshot.storageKey;
      if (!storageKey) return;
      const existing = localStorage.getItem(storageKey);
      if (existing) return;
      const rawValue = storageKey === PLAY_SESSION_EXPORT_DIR_KEY && typeof snapshot.payload === "string"
        ? snapshot.payload
        : JSON.stringify(snapshot.payload);
      localStorage.setItem(storageKey, rawValue);
      restoredAny = true;
    });
    return restoredAny;
  } catch (_err) {
    return false;
  }
}

function serializeManagerItem(item) {
  const originalLevel = item.originalLevel && !levelSnapshotsMatch(item.originalLevel, item.level)
    ? cloneLevel(item.originalLevel)
    : null;
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
    originalLevel
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
    screenshotPath: item.screenshotPath || "",
    reviewStatus: item.reviewStatus,
    validationStatus: item.validationStatus,
    feedbackDecision: item.feedbackDecision || "",
    feedbackReasonCode: item.feedbackReasonCode || "",
    feedbackKeepTags: Array.isArray(item.feedbackKeepTags) ? [...item.feedbackKeepTags] : [],
    feedbackPairIds: Array.isArray(item.feedbackPairIds) ? [...item.feedbackPairIds] : [],
    feedbackNote: item.feedbackNote || "",
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

async function persistCanonicalStateFiles(payload) {
  await Promise.all([
    saveRepoFile(CANONICAL_STATE_PATHS.workspace, JSON.stringify(payload, null, 2)),
    saveRepoFile(CANONICAL_STATE_PATHS.editor, JSON.stringify(payload.editor || {}, null, 2)),
    saveRepoFile(CANONICAL_STATE_PATHS.manager, JSON.stringify(payload.manager || {}, null, 2)),
    saveRepoFile(CANONICAL_STATE_PATHS.sessions, JSON.stringify(payload.sessions || {}, null, 2))
  ]);
}

function queueCanonicalStateSave(payload, delayMs = 350) {
  pendingCanonicalStatePayload = payload;
  if (canonicalStateSaveTimer) clearTimeout(canonicalStateSaveTimer);
  canonicalStateSaveTimer = setTimeout(async () => {
    canonicalStateSaveTimer = null;
    if (canonicalStateInFlight || !pendingCanonicalStatePayload) return;
    const nextPayload = pendingCanonicalStatePayload;
    const signature = JSON.stringify({
      editor: nextPayload.editor,
      manager: nextPayload.manager,
      sessions: nextPayload.sessions,
      progression: nextPayload.progression,
      proceduralBatch: nextPayload.proceduralBatch
    });
    if (signature === lastCanonicalStateSignature) return;
    canonicalStateInFlight = true;
    try {
      await persistCanonicalStateFiles(nextPayload);
      lastCanonicalStateSignature = signature;
    } catch (_err) {
      // Best-effort repo persistence only.
    } finally {
      canonicalStateInFlight = false;
    }
  }, delayMs);
}

function saveCanonicalEditorDraft(level) {
  return saveRepoFile(CANONICAL_STATE_PATHS.editorDraft, JSON.stringify(serializeLevelToDeveloperFormat(level), null, 2));
}

function persistWorkspaceState() {
  if (isRestoringWorkspaceState || isBootstrappingWorkspaceState) return;
  if (workspacePersistTimer) {
    clearTimeout(workspacePersistTimer);
    workspacePersistTimer = null;
  }

  let payload = null;
  try {
    payload = {
      main: {
        baseLevel: state.main.baseLevel ? cloneLevel(state.main.baseLevel) : null,
        baseFileName: state.main.baseFileName || "",
        adjustments: normalizeProceduralReferenceAdjustments(state.main.adjustments),
        candidates: state.main.candidates.map((candidate) => ({
          ...candidate,
          level: cloneLevel(candidate.level)
        })),
        nextCandidateId: state.main.nextCandidateId
      },
      vitobot: {
        source: state.vitobot.source,
        folder: state.vitobot.folder,
        pattern: state.vitobot.pattern,
        profile: state.vitobot.profile,
        intelligence: state.vitobot.intelligence,
        runs: state.vitobot.runs,
        running: false,
        selectedResultLabel: state.vitobot.selectedResultLabel || "",
        results: state.vitobot.results,
        summary: state.vitobot.summary
      },
      editor: {
        level: buildEditorSnapshotLevel(),
        fileName: state.editor.fileName,
        progressionKey: state.editor.progressionKey,
        progressionSlot: state.editor.progressionSlot,
        referenceTrails: Object.fromEntries(Object.entries(state.editor.referenceTrails || {}).map(([id, cells]) => [id, (cells || []).map(([r, c]) => [r, c])])),
        variantAdjustments: normalizeProceduralReferenceAdjustments(state.editor.variantAdjustments),
        variantCandidates: (state.editor.variantCandidates || []).map((candidate) => cloneVariantCandidate(candidate)),
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
          slotDifficulty: [...getManagerProgression(key).slotDifficulty],
          locked: !!getManagerProgression(key).locked
        }])),
        progressionOrder: [...state.manager.progressionOrder],
        extraIds: [...(state.manager.extraIds || [])],
        discardedIds: [...(state.manager.discardedIds || [])],
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
  } catch (_err) {
    return;
  }

  // Persist the canonical state to disk even if the browser cannot store a full snapshot.
  try {
    queueCanonicalStateSave(payload);
  } catch (_err) {
    // Best-effort repo persistence only.
  }

  // Best-effort local backup (can fail if the payload exceeds browser storage quota).
  let wroteLocal = false;
  try {
    localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(payload));
    wroteLocal = true;
  } catch (err) {
    try {
      console.warn("[workspace] localStorage persist failed; canonical state should still be saved to disk.", err);
    } catch (_err) {
      // ignore
    }
  }

  queueBrowserStateSync(wroteLocal ? "workspace_persisted" : "workspace_persist_failed");
}

function restoreWorkspaceState(payload = null) {
  try {
    const parsed = payload || (() => {
      const raw = localStorage.getItem(WORKSPACE_STATE_KEY);
      if (!raw) return null;
      return parseImportedJson(raw);
    })();
    if (!parsed) return false;
    isRestoringWorkspaceState = true;

    state.main = createDefaultProceduralReferenceState();
    state.main.adjustments = normalizeProceduralReferenceAdjustments(parsed.main?.adjustments);
    if (parsed.main?.baseLevel) {
      state.main.baseLevel = cloneLevel(parsed.main.baseLevel);
      state.main.baseFileName = parsed.main.baseFileName || parsed.main.baseLevel?.meta?.source_name || "";
      state.main.candidates = Array.isArray(parsed.main.candidates)
        ? parsed.main.candidates.map((candidate) => ({
          ...candidate,
          level: cloneLevel(candidate.level),
          referenceIntent: normalizeProceduralReferenceAdjustments(candidate.referenceIntent || parsed.main?.adjustments)
        }))
        : [];
      state.main.nextCandidateId = Number(parsed.main.nextCandidateId || (state.main.candidates.length + 1));
    }

    state.vitobot = {
      ...createDefaultVitoBotState(),
      ...(parsed.vitobot || {}),
      loadedLevels: []
    };

    if (parsed.editor?.level) {
      loadLevelToEditor(toPlayableLevel(parsed.editor.level, "workspace_editor_level"), {
        fileName: parsed.editor.fileName || parsed.editor.level?.meta?.source_name || "workspace_editor_level.json"
      });
      state.editor.progressionKey = parsed.editor.progressionKey || state.editor.progressionKey;
      state.editor.progressionSlot = Number(parsed.editor.progressionSlot || state.editor.progressionSlot || 1);
      state.editor.referenceTrails = normalizeReferenceTrails(parsed.editor.referenceTrails);
      state.editor.variantAdjustments = normalizeProceduralReferenceAdjustments(parsed.editor.variantAdjustments);
      state.editor.variantCandidates = Array.isArray(parsed.editor.variantCandidates)
        ? parsed.editor.variantCandidates.map((candidate) => cloneVariantCandidate(candidate))
        : [];
      state.editor.traceDraft = null;
      state.editor.link = parsed.editor.link || { sourceType: "standalone", sourceId: null, label: "Standalone level" };
      state.editor.dirty = !!parsed.editor.dirty;
      state.editor.lastSavedAt = parsed.editor.lastSavedAt || null;
      updateEditorSaveStatus();
    }

    state.manager.items = hydrateManagerItems(parsed.manager?.items || []);
    if (parsed.manager?.progressions) {
      const parsedOrder = Array.isArray(parsed.manager?.progressionOrder) && parsed.manager.progressionOrder.length
        ? parsed.manager.progressionOrder
        : Object.keys(parsed.manager.progressions);
      state.manager.progressionOrder = parsedOrder.filter(Boolean);
      state.manager.progressions = {};
      state.manager.progressionOrder.forEach((key, index) => {
        const src = parsed.manager.progressions[key] || {};
        const defaultLabel = defaultManagerProgressions.find((entry) => entry.key === key)?.label || `Progression ${index + 1}`;
        state.manager.progressions[key] = {
          label: src.label || defaultLabel,
          slots: normalizeManagerSlotArray(src.slots, null),
          lockedSlots: normalizeManagerSlotArray(src.lockedSlots, false),
          slotDifficulty: normalizeManagerSlotArray(src.slotDifficulty, ""),
          locked: !!src.locked
        };
      });
    } else {
      // Backward compatibility with the older single-progression state shape.
      state.manager.progressions = createDefaultManagerProgressions();
      state.manager.progressionOrder = defaultManagerProgressions.map(({ key }) => key);
      state.manager.progressions.progressionA = {
        label: "Progression A",
        slots: normalizeManagerSlotArray(parsed.manager?.slots, null),
        lockedSlots: normalizeManagerSlotArray(parsed.manager?.lockedSlots, false),
        slotDifficulty: normalizeManagerSlotArray([], ""),
        locked: false
      };
    }
    const defaultActiveTab = state.manager.progressionOrder[0] || "allLevels";
    state.manager.activeTab = parsed.manager?.activeTab || defaultActiveTab;
    if (!isManagerProgressionTab(state.manager.activeTab) && !["allLevels", "extras", "discarded", "csvReview"].includes(state.manager.activeTab)) {
      state.manager.activeTab = defaultActiveTab;
    }
    state.manager.selectedId = parsed.manager?.selectedId ?? null;
    state.manager.extraIds = Array.isArray(parsed.manager?.extraIds) ? parsed.manager.extraIds : [];
    state.manager.discardedIds = Array.isArray(parsed.manager?.discardedIds) ? parsed.manager.discardedIds : [];
    state.manager.pendingRefTarget = parsed.manager?.pendingRefTarget || null;
    state.manager.allLevelsPage = Math.max(1, Number(parsed.manager?.allLevelsPage || 1));
    state.manager.referenceIds = Array.isArray(parsed.manager?.referenceIds) ? parsed.manager.referenceIds : [];
    state.manager.nextId = Number(parsed.manager?.nextId || (state.manager.items.length + 1));
    state.manager.filters = { ...createDefaultManagerFilters(), ...(parsed.manager?.filters || {}) };
    dedupeTutorialManagerItems();

    state.sessions.queue = (parsed.sessions?.queue || []).map((item) => ({
      ...item,
      changed: !!item.changed,
      screenshotPath: item.screenshotPath || "",
      previewDataUrl: item.previewDataUrl || null,
      feedbackDecision: item.feedbackDecision || "",
      feedbackReasonCode: item.feedbackReasonCode || "",
      feedbackKeepTags: Array.isArray(item.feedbackKeepTags) ? [...item.feedbackKeepTags] : [],
      feedbackPairIds: Array.isArray(item.feedbackPairIds) ? [...item.feedbackPairIds] : [],
      feedbackNote: item.feedbackNote || ""
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

async function restoreWorkspaceStateFromRepo() {
  try {
    const parsed = await fetchJsonIfAvailable(`/${CANONICAL_STATE_PATHS.workspace.replace(/^\.?\/+/, "")}`);
    if (!parsed) return false;
    try {
      localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(parsed));
    } catch (_err) {
      // If browser storage is full, still restore from the parsed payload directly.
    }
    return restoreWorkspaceState(parsed);
  } catch (_err) {
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

async function saveManagerOutputFile(relativePath, content, mime = "application/json") {
  const response = await fetch("/api/save-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      content,
      mime,
      baseDir: state.settings.managerOutputDir || state.settings.exportDir
    })
  });
  if (!response.ok) throw new Error(`Manager output save failed (${response.status})`);
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

async function deleteRepoFile(relativePath) {
  const response = await fetch("/api/delete-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      baseDir: "."
    })
  });
  if (!response.ok) throw new Error(`Repo delete failed (${response.status})`);
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

async function saveManagerOutputDataUrl(relativePath, dataUrl) {
  const response = await fetch("/api/save-data-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      dataUrl,
      baseDir: state.settings.managerOutputDir || state.settings.exportDir
    })
  });
  if (!response.ok) throw new Error(`Manager output save failed (${response.status})`);
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

async function createManagerOutputZip(relativePath, archiveName, entries) {
  const response = await fetch("/api/create-zip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relativePath,
      archiveName,
      entries,
      baseDir: state.settings.managerOutputDir || state.settings.exportDir
    })
  });
  if (!response.ok) throw new Error(`Manager output zip failed (${response.status})`);
  return response.json();
}

function splitAbsolutePath(pathValue) {
  const resolved = resolveProjectPath(pathValue || DEFAULT_PROJECT_SAVE_DIR);
  const lastSlash = resolved.lastIndexOf("/");
  if (lastSlash <= 0) return { baseDir: PROJECT_ROOT, relativePath: "output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx" };
  return {
    baseDir: resolved.slice(0, lastSlash),
    relativePath: resolved.slice(lastSlash + 1)
  };
}

function managerSpreadsheetSyncPayload(reason = "manual") {
  const snapshot = buildManagerMetadataSnapshot(reason);
  return snapshot;
}

let spreadsheetSyncTimer = null;
let lastSpreadsheetSyncSignature = "";
let spreadsheetSyncInFlight = false;
const DRIVE_UPLOAD_SCRIPT_URL = "https://script.google.com/a/macros/king.com/s/AKfycbwyBDc1vKyYD3gt69a9QnUOYjEL55CecWZh6yA0z83GNb4A6pKZyvJnwmI0T4qnAHw/exec";

async function syncLevelsWorkbook(reason = "manual") {
  const snapshot = managerSpreadsheetSyncPayload(reason);
  const signature = JSON.stringify({
    progressions: snapshot.progressions,
    items: snapshot.items
  });
  if (reason !== "manual" && signature === lastSpreadsheetSyncSignature) {
    return { ok: true, path: state.settings.spreadsheetWorkbookPath, skipped: true };
  }
  if (spreadsheetSyncInFlight) {
    return { ok: true, path: state.settings.spreadsheetWorkbookPath, skipped: true };
  }
  spreadsheetSyncInFlight = true;
  try {
    const target = splitAbsolutePath(state.settings.spreadsheetWorkbookPath);
    const response = await fetch("/api/sync-levels-workbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseDir: target.baseDir,
        relativePath: target.relativePath,
        templatePath: "/Users/victoria.serrano/Downloads/Levels - feed the bear (1).xlsx",
        snapshot,
        spreadsheetId: state.settings.spreadsheetId,
        googleSyncMethod: state.settings.googleSyncMethod,
        googleCredentialsPath: state.settings.googleClientPath,
        googleTokenPath: state.settings.googleTokenPath
      })
    });
    if (!response.ok) throw new Error(`Spreadsheet sync failed (${response.status})`);
    const result = await response.json();
    lastSpreadsheetSyncSignature = signature;
    return result;
  } finally {
    spreadsheetSyncInFlight = false;
  }
}

async function applySheetLevelRenames() {
  const response = await fetch("/api/apply-sheet-renames", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spreadsheetId: state.settings.spreadsheetId,
      renameSheetName: "Level Renames"
    })
  });
  if (!response.ok) throw new Error(`Apply sheet renames failed (${response.status})`);
  return response.json();
}

function managerOutputRelativePath(absolutePath) {
  const baseDir = state.settings.managerOutputDir || state.settings.exportDir;
  const resolvedBase = resolveProjectPath(baseDir);
  if (absolutePath.startsWith(`${resolvedBase}/`)) return absolutePath.slice(resolvedBase.length + 1);
  return absolutePath.replace(/^\/+/, "");
}

async function readManagerOutputFile(relativePath) {
  const response = await fetch("/api/read-local-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      baseDir: state.settings.managerOutputDir || state.settings.exportDir,
      relativePath
    })
  });
  if (!response.ok) throw new Error(`Read manager output file failed (${response.status})`);
  return response.json();
}

async function uploadProgressionBundle(key) {
  const saved = await exportActiveProgressionZip(key);
  const relativePath = managerOutputRelativePath(saved.path);
  const filePayload = await readManagerOutputFile(relativePath);
  if (!filePayload.ok) throw new Error(`Failed to read bundle data for ${relativePath}`);
  const payload = {
    progression: key,
    bundleName: basename(saved.path),
    bundlePath: relativePath,
    bundleTimestamp: new Date().toISOString(),
    bundleBase64: filePayload.data,
    metadata: {
      spreadsheet: state.settings.spreadsheetWorkbookPath,
      spreadsheetId: state.settings.spreadsheetId
    }
  };
  const response = await fetch(DRIVE_UPLOAD_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Drive upload script failed (${response.status})`);
  return response.json();
}

async function uploadProgressionsAfterSync() {
  const keys = ["progressionA", "progressionB"];
  const results = [];
  for (const key of keys) {
    if (!state.manager.progressions[key]) continue;
    try {
      const result = await uploadProgressionBundle(key);
      log("mgr-log", `Drive upload response for ${key}: ${JSON.stringify(result)}`);
      results.push({ key, ok: true, result });
    } catch (err) {
      log("mgr-log", `Drive upload failed for ${key}: ${formatParseError(err)}`);
      results.push({ key, ok: false, error: err.message });
    }
  }
  return results;
}

async function fetchGoogleSheetsApiStatus() {
  const response = await fetch("/api/google-sheets-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      credentialsPath: state.settings.googleClientPath,
      tokenPath: state.settings.googleTokenPath
    })
  });
  if (!response.ok) throw new Error(`Google Sheets API status failed (${response.status})`);
  return response.json();
}

async function refreshGoogleSheetsApiStatus(logTarget = "settings-log") {
  const statusTag = document.getElementById("settings-status");
  try {
    const result = await fetchGoogleSheetsApiStatus();
    const status = result.status || {};
    if (statusTag) {
      statusTag.textContent = status.connected
        ? "Google Sheets API connected"
        : status.credentialsConfigured
          ? "Google Sheets API ready for auth"
          : "Google Sheets API not configured";
    }
    log(logTarget, [
      "Google Sheets API status",
      `Credentials: ${status.credentialsConfigured ? "OK" : "Missing"}`,
      `Token: ${status.tokenConfigured ? "OK" : "Missing"}`,
      `Connected: ${status.connected ? "Yes" : "No"}`,
      status.credentialsPath ? `Client JSON: ${displayProjectPath(status.credentialsPath)}` : "",
      status.tokenPath ? `Token file: ${displayProjectPath(status.tokenPath)}` : "",
      status.error ? `Error: ${status.error}` : ""
    ].filter(Boolean).join("\n"));
  } catch (err) {
    if (statusTag) statusTag.textContent = "Google Sheets API check failed";
    log(logTarget, `Google Sheets API status failed: ${formatParseError(err)}`);
  }
}

async function openBridgeLauncher(logTarget = "settings-log") {
  try {
    const response = await fetch("/api/open-bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    if (!response.ok) throw new Error(`Bridge launch failed (${response.status})`);
    const result = await response.json();
    log(logTarget, `Bridge launch requested${result.pid ? ` (pid ${result.pid})` : ""}.`);
  } catch (err) {
    log(logTarget, `Bridge launch failed: ${formatParseError(err)}`);
  }
}

function scheduleSpreadsheetSync(reason = "autosave") {
  if (!state.settings.autoSyncSheetDb || isRestoringWorkspaceState || isBootstrappingWorkspaceState) return;
  clearTimeout(spreadsheetSyncTimer);
  spreadsheetSyncTimer = setTimeout(() => {
    syncLevelsWorkbook(reason).then((result) => {
      if (result && !result.skipped) {
        log("mgr-log", `Spreadsheet DB synced to ${displayProjectPath(result.path)}${result.pushed ? " and pushed to Google Sheets" : ""}`);
      }
    }).catch((err) => {
      log("mgr-log", `Spreadsheet DB sync error: ${formatParseError(err)}`);
    });
  }, 2500);
}

async function saveLevelArtifactsToProject(level, preferredName) {
  assertLevelCanBeSaved(level);
  const stem = slugifyFilePart(preferredName || `level_${level.level}`);
  const serializedLevel = serializeLevelToDeveloperFormat(level, preferredName || `${stem}.json`);
  const jsonResult = await saveProjectFile(`levels/${stem}.json`, JSON.stringify(serializedLevel, null, 2));
  const screenshotResult = await saveProjectDataUrl(`levels/screenshots/${stem}.png`, createLevelPreviewDataUrl(level));
  return { jsonPath: jsonResult.path, screenshotPath: screenshotResult.path };
}

function toProjectRelativePath(value, baseDir = state.settings.exportDir) {
  const normalized = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "";
  const absoluteCandidate = resolveProjectPath(normalized);
  const resolvedBaseDir = resolveProjectPath(baseDir || DEFAULT_PROJECT_SAVE_DIR);
  if (absoluteCandidate.startsWith(`${resolvedBaseDir}/`)) {
    return absoluteCandidate.slice(resolvedBaseDir.length + 1);
  }
  if (absoluteCandidate === resolvedBaseDir) {
    return "";
  }
  return normalized;
}

function buildManualEditorSavePaths(rawValue, suggestedFileName, levelNumber) {
  const normalizedInput = toProjectRelativePath(rawValue);
  if (!normalizedInput) return null;

  let jsonRelativePath = normalizedInput;
  const normalizedSuggestedFile = normalizeLevelFileName(suggestedFileName, levelNumber);
  if (/[\/]$/.test(String(rawValue || "").trim())) {
    jsonRelativePath = `${normalizedInput.replace(/\/+$/, "")}/${normalizedSuggestedFile}`;
  } else if (!/\.json$/i.test(jsonRelativePath)) {
    jsonRelativePath = `${jsonRelativePath}.json`;
  }

  const screenshotRelativePath = jsonRelativePath.replace(/\.json$/i, ".png");
  return { jsonRelativePath, screenshotRelativePath };
}

async function promptAndSaveEditorLevel() {
  const editedLevel = levelFromEditor();
  assertLevelCanBeSaved(editedLevel);
  const currentFileName = normalizeLevelFileName(document.getElementById("ed-name")?.value || state.editor.fileName, editedLevel.level);
  const suggestedPath = `levels/${basename(currentFileName)}`;
  const rawValue = window.prompt(
    `Save path relative to ${displayProjectPath(state.settings.exportDir)}.\nExamples:\n- levels/my_level.json\n- review/my_level\n- review/\n\nJSON and screenshot will be saved together in the chosen folder.`,
    suggestedPath
  );
  if (rawValue == null) {
    log("ed-log", "Save cancelled.");
    return;
  }
  const savePaths = buildManualEditorSavePaths(rawValue, currentFileName, editedLevel.level);
  if (!savePaths) {
    log("ed-log", "Save cancelled.");
    return;
  }

  const serializedLevel = serializeLevelToDeveloperFormat(editedLevel, basename(savePaths.jsonRelativePath));
  const jsonResult = await saveProjectFile(savePaths.jsonRelativePath, JSON.stringify(serializedLevel, null, 2));
  const screenshotResult = await saveProjectDataUrl(savePaths.screenshotRelativePath, createLevelPreviewDataUrl(editedLevel));
  state.editor.fileName = basename(savePaths.jsonRelativePath);
  state.editor.dirty = false;
  state.editor.lastSavedAt = Date.now();
  syncEditorInputs();
  updateEditorSaveStatus();
  log(
    "ed-log",
    `Saved level JSON to ${displayProjectPath(jsonResult.path)}\nSaved screenshot to ${displayProjectPath(screenshotResult.path)}`
  );
}

function buildPlaytestDatasetRecord(session, origin = "editor") {
  const level = session.level || {};
  const boardWidth = levelWidth(level);
  const boardHeight = levelHeight(level);
  const pairs = Array.isArray(level.pairs) ? level.pairs.length : 0;
  const blockers = Array.isArray(level.blockers) ? level.blockers.length : 0;
  const hasBoardShape = isSupportedBoardSize(boardWidth, boardHeight);
  const validationStatus = hasBoardShape && level?.validation?.solvable !== false ? "OK" : "INVALID";
  return {
    saved_at: new Date().toISOString(),
    origin,
    save_reason: session.save_reason || "manual",
    saved_path: session.saved_path || "",
    solved: !!session.solved,
    level_name: level.name || levelLabel(level),
    level_number: levelTier(level),
    board_width: boardWidth,
    board_height: boardHeight,
    board: boardWidth && boardHeight ? `${boardWidth}x${boardHeight}` : "",
    pairs,
    blockers,
    moves: Number(level.moves || 0),
    difficulty: levelDifficulty(level),
    decal: !!level.decal,
    validation_status: validationStatus,
    history_length: Array.isArray(session.history) ? session.history.length : 0,
    path_lengths: Array.isArray(level.pairs)
      ? Object.fromEntries(level.pairs.map((pair) => [pair.id, Array.isArray(session.paths?.[pair.id]) ? session.paths[pair.id].length : 0]))
      : {},
    level_file: level._filename || "",
    level_saved_path: level.saved_path || "",
    session
  };
}

async function appendPlaytestDatasetRecord(session, origin = "editor") {
  const record = buildPlaytestDatasetRecord(session, origin);
  await appendProjectFile("playtest/playtest_events.jsonl", `${JSON.stringify(record)}\n`);
  return record;
}

async function saveSolvedSession(reason = "manual", origin = "editor") {
  const session = serializePlaySession(true);
  session.save_reason = reason;
  localStorage.setItem(PLAY_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(PLAY_SESSION_EXPORT_DIR_KEY, new Date().toISOString());
  queueBrowserStateSync("play_session_saved");
  session.saved_path = (await saveRepoFile(CANONICAL_STATE_PATHS.latestPlaytest, JSON.stringify(session, null, 2))).path;
  await appendPlaytestDatasetRecord(session, origin);
  if (session.level) {
    const evaluation = evaluateLearningLevel(session.level);
    const historyLength = Array.isArray(session.history) ? session.history.length : 0;
    const pathLengths = Object.fromEntries(Object.entries(session.paths || {}).map(([pairId, cells]) => [pairId, Array.isArray(cells) ? cells.length : 0]));
    if (evaluation.validation.valid) {
      recordLearningDecision(session.level, "approve", `${origin}_solved_session`, {
        history_length: historyLength,
        path_lengths: pathLengths,
        auto_recorded: true,
        source_family: "session"
      }, evaluation);
    } else {
      log("session-log", `Skipped auto-approval for ${levelLabel(session.level)} because validation is invalid.`);
    }
  }
  return session;
}

function recordLearningDecision(level, decision, context = "manual", extra = {}, evaluation = null) {
  const bucket = decision === "approve" ? state.learning.approved : state.learning.rejected;
  bucket.push(buildLearningRecord(level, decision, context, extra, evaluation));
  saveLearning();
  updateLearningStatus();
  renderProceduralReferenceLab();
}

function sendCurrentEditorLevelToKnowledge() {
  const level = levelFromEditor();
  const sourceFile = basename(normalizeLevelFileName(state.editor.fileName || level.meta?.source_name || `${levelLabel(level)}.json`, levelTier(level)));
  const features = extractFeatures(level);
  const duplicate = state.learning.approved.some((entry) => (
    String(entry.context || "") === "editor_pattern"
    && String(entry.source_file || "") === sourceFile
    && JSON.stringify(entry.features || null) === JSON.stringify(features)
  ));
  if (duplicate) {
    log("ed-log", `Knowledge unchanged: ${sourceFile} is already in learning memory.`);
    return;
  }
  recordLearningDecision(level, "approve", "editor_pattern", {
    source_file: sourceFile,
    source_link: state.editor.sourceType || "standalone",
    source_label: state.editor.sourceLabel || "Standalone level",
    pattern_origin: "editor_manual"
  });
  log("ed-log", `Added ${sourceFile} to learning memory as an approved editor pattern.`);
}

function sendCurrentEditorLevelToAntiPattern() {
  const level = levelFromEditor();
  const sourceFile = basename(normalizeLevelFileName(state.editor.fileName || level.meta?.source_name || `${levelLabel(level)}.json`, levelTier(level)));
  const features = extractFeatures(level);
  const duplicate = state.learning.rejected.some((entry) => (
    String(entry.context || "") === "editor_antipattern"
    && String(entry.source_file || "") === sourceFile
    && JSON.stringify(entry.features || null) === JSON.stringify(features)
  ));
  if (duplicate) {
    log("ed-log", `Anti-pattern unchanged: ${sourceFile} is already in rejected learning memory.`);
    return;
  }
  recordLearningDecision(level, "reject", "editor_antipattern", {
    source_file: sourceFile,
    source_link: state.editor.sourceType || "standalone",
    source_label: state.editor.sourceLabel || "Standalone level",
    reason_code: "bad_layout",
    reason_text: "Manual anti-pattern from editor",
    pair_ids: (level.pairs || []).map((pair) => pair.id),
    pattern_origin: "editor_manual"
  });
  log("ed-log", `Added ${sourceFile} to rejected learning memory as an anti-pattern.`);
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

function findManagerItemByFileName(fileName, excludeItemId = null) {
  const normalized = basename(normalizeLevelFileName(fileName || "", 1));
  return state.manager.items.find((item) => item.id !== excludeItemId && basename(preferredManagerItemFileName(item)) === normalized) || null;
}

function canDeleteArtifactPath(pathValue, excludeItemId = null) {
  const absolute = resolveProjectPath(pathValue || "");
  if (!absolute.startsWith(`${PROJECT_ROOT}/`)) return false;
  const usedByManager = state.manager.items.some((item) => item.id !== excludeItemId && [item.savedPath, item.screenshotPath, item.sourcePath].some((entry) => resolveProjectPath(entry || "") === absolute));
  if (usedByManager) return false;
  const usedBySessions = state.sessions.queue.some((item) => [item.savedPath].some((entry) => resolveProjectPath(entry || "") === absolute));
  return !usedBySessions;
}

async function cleanupRenamedArtifacts({ excludeItemId = null, oldJsonPath = "", oldScreenshotPath = "", newJsonPath = "", newScreenshotPath = "" } = {}) {
  const removals = [];
  if (oldJsonPath && resolveProjectPath(oldJsonPath) !== resolveProjectPath(newJsonPath) && canDeleteArtifactPath(oldJsonPath, excludeItemId)) {
    removals.push(projectRelativePath(oldJsonPath));
  }
  if (oldScreenshotPath && resolveProjectPath(oldScreenshotPath) !== resolveProjectPath(newScreenshotPath) && canDeleteArtifactPath(oldScreenshotPath, excludeItemId)) {
    removals.push(projectRelativePath(oldScreenshotPath));
  }
  for (const relativePath of removals) {
    try {
      await deleteRepoFile(relativePath);
    } catch (_err) {
      // best-effort cleanup only
    }
  }
}

async function materializeManagerItemToRepo(item) {
  if (!item?.level) return null;
  const fileName = preferredManagerItemFileName(item);
  const relativeJsonPath = `levels/${fileName}`;
  const relativeScreenshotPath = `levels/screenshots/${slugifyFilePart(fileName)}.png`;
  const serializedLevel = serializeLevelToDeveloperFormat(item.level, fileName);
  const signature = JSON.stringify({
    fileName,
    screenshot: relativeScreenshotPath,
    level: serializedLevel
  });
  if (managerItemMaterializeSignatures.get(item.id) !== signature) {
    await saveRepoFile(relativeJsonPath, JSON.stringify(serializedLevel, null, 2));
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

async function materializeManagerProgressionsToRepo() {
  const materializableItems = state.manager.items.filter((item) => item?.level);
  const materializedItems = new Map();
  for (const item of materializableItems) {
    materializedItems.set(item.id, await materializeManagerItemToRepo(item));
  }

  const summary = {};
  for (const key of getManagerProgressionKeys()) {
    if (!isManagerProgressionTab(key)) continue;
    const progression = getManagerProgression(key);
    const tutorialItem = progression.slots[0] != null ? getManagerItemById(progression.slots[0]) : null;
    const tutorialMaterialized = tutorialItem ? materializedItems.get(tutorialItem.id) : null;
    const config = {
      name: key,
      locked: !!progression.locked,
      tutorial_level_file: tutorialMaterialized?.jsonRelativePath || "levels/tutorial_level.json",
      slots: progression.slots.map((itemId, index) => {
        if (index === 0) return { slot: 0, status: "reserved", label: "TUTORIAL" };
        if (itemId == null) return { slot: index };
        return {
          slot: index,
          level_file: materializedItems.get(itemId)?.jsonRelativePath || projectRelativePath(getManagerItemById(itemId)?.savedPath || "")
        };
      })
    };
    progressionMaterializeSignatures.set(key, JSON.stringify(config));
    summary[key] = config;
  }
  summary.extras = getManagerExtraItems().map((item) => ({
    item_id: item.id,
    file: item.file,
    level_file: materializedItems.get(item.id)?.jsonRelativePath || projectRelativePath(item.savedPath || ""),
    difficulty: levelDifficulty(item.level),
    status: item.status,
    changed: !!item.changed
  }));
  summary.discarded = getManagerDiscardedItems().map((item) => ({
    item_id: item.id,
    file: item.file,
    level_file: materializedItems.get(item.id)?.jsonRelativePath || projectRelativePath(item.savedPath || ""),
    difficulty: levelDifficulty(item.level),
    status: item.status,
    changed: !!item.changed
  }));
  summary.all_levels = getManagerUnassignedItems()
    .map((item) => ({
      item_id: item.id,
      file: item.file,
      level_file: materializedItems.get(item.id)?.jsonRelativePath || projectRelativePath(item.savedPath || ""),
      difficulty: levelDifficulty(item.level),
      status: item.status,
      changed: !!item.changed
    }));
  await saveRepoFile("progressions/manager_progressions_live.json", JSON.stringify(summary, null, 2));
}

function recordCorrectionLearning(originalLevel, correctedLevel, context = "session_fix") {
  const originalEvaluation = evaluateLearningLevel(originalLevel);
  const correctedEvaluation = evaluateLearningLevel(correctedLevel);
  const entry = {
    timestamp: Date.now(),
    context,
    source_family: "correction",
    original_level: cloneLevel(originalLevel),
    corrected_level: cloneLevel(correctedLevel),
    original_features: {
      ...extractFeatures(originalLevel),
      solutions: originalEvaluation.validation.solution_count,
      solution_count: originalEvaluation.validation.solution_count,
      stored_solution_count: originalEvaluation.validation.stored_solution_count,
      solution_count_mismatch: originalEvaluation.validation.solution_count_mismatch ? 1 : 0
    },
    corrected_features: {
      ...extractFeatures(correctedLevel),
      solutions: correctedEvaluation.validation.solution_count,
      solution_count: correctedEvaluation.validation.solution_count,
      stored_solution_count: correctedEvaluation.validation.stored_solution_count,
      solution_count_mismatch: correctedEvaluation.validation.solution_count_mismatch ? 1 : 0
    },
    original_validation: originalEvaluation.validation,
    corrected_validation: correctedEvaluation.validation,
    original_feature_signals: originalEvaluation.feature_signals,
    corrected_feature_signals: correctedEvaluation.feature_signals
  };
  state.learning.corrections.push(entry);
  recordLearningDecision(originalLevel, "reject", `${context}:original`, { source_family: "correction" }, originalEvaluation);
  recordLearningDecision(correctedLevel, "approve", `${context}:corrected`, { source_family: "correction" }, correctedEvaluation);
  saveLearning();
  updateLearningStatus();
  return entry;
}

function setActiveView(viewName) {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${viewName}`));
  if (viewName === "main") renderProceduralReferenceLab();
  if (viewName === "manager") {
    if (state.editor.link?.sourceType === "manager" && state.editor.link.sourceId != null) {
      state.manager.selectedId = state.editor.link.sourceId;
    } else if (state.manager.selectedId == null) {
      const firstAssigned = getManagerProgressionKeys().flatMap((key) => getManagerProgression(key).slots).find((id) => id != null);
      state.manager.selectedId = firstAssigned ?? state.manager.items[0]?.id ?? null;
    }
    updateManagerTable({ persistWorkspace: false, scheduleMetadata: false });
  }
  if (viewName === "sessions") {
    updateSessionTable();
    if (!resizeEditorCanvas()) drawBoard();
  }
  if (viewName === "vitobot") renderVitoBot();
  if (viewName === "editor") {
    updateEditorSaveStatus();
    if (!resizeEditorCanvas()) drawBoard();
  }
}

function currentActiveView() {
  return document.querySelector(".nav-btn.active")?.dataset.view || "main";
}

function refreshVisibleView() {
  const view = currentActiveView();
  if (view === "main") renderProceduralReferenceLab();
  if (view === "manager") updateManagerTable({ persistWorkspace: false, scheduleMetadata: false });
  if (view === "sessions") {
    updateSessionTable();
    if (!resizeEditorCanvas()) drawBoard();
  }
  if (view === "vitobot") renderVitoBot();
  if (view === "editor") {
    updateEditorSaveStatus();
    if (!resizeEditorCanvas()) drawBoard();
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
  queueBrowserStateSync("workspace_cleared");
}

function resetWorkspaceInMemory(options = {}) {
  const preserveLockedProgressions = options.preserveLockedProgressions !== false;
  const lockedSnapshot = preserveLockedProgressions ? captureLockedManagerProgressions() : null;
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
  state.manager.extraIds = [];
  state.manager.discardedIds = [];
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
  if (lockedSnapshot) restoreLockedManagerProgressions(lockedSnapshot);
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

let _resizeTimer = null;
function resizeBoardCanvas(targetCanvas) {
  const frame = targetCanvas?.parentElement;
  if (!frame) return false;
  const availableEdge = Math.min(640, frame.clientWidth - 32);
  if (availableEdge <= 0) return false;
  const boardWidth = Math.max(1, Number(state.editor.boardWidth || MIN_BOARD_SIZE));
  const boardHeight = Math.max(1, Number(state.editor.boardHeight || MIN_BOARD_SIZE));
  const cellSize = Math.max(1, Math.floor(availableEdge / Math.max(boardWidth, boardHeight)));
  const nextWidth = cellSize * boardWidth;
  const nextHeight = cellSize * boardHeight;
  if (targetCanvas.width === nextWidth && targetCanvas.height === nextHeight) return false;
  targetCanvas.width = nextWidth;
  targetCanvas.height = nextHeight;
  return true;
}

function resizeEditorCanvas() {
  const editorChanged = resizeBoardCanvas(canvas);
  const sessionChanged = resizeBoardCanvas(sessionCanvas);
  const changed = editorChanged || sessionChanged;
  if (changed) drawBoard();
  return changed;
}
window.addEventListener("resize", () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(resizeEditorCanvas, 150);
});

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

function assignEditorPairCell(pairId, cell) {
  const pair = state.editor.pairs?.[pairId];
  if (!pair) return { changed: false, label: "" };
  if (sameCell(pair.start, cell) || sameCell(pair.end, cell)) {
    return { changed: false, label: "Point already placed" };
  }
  clearNodeIfPresent(cell);
  state.editor.blockers.delete(coordKey(cell[0], cell[1]));
  if (!pair.start) {
    pair.start = cell;
    return { changed: true, label: "Placed point 1" };
  }
  if (!pair.end) {
    pair.end = cell;
    return { changed: true, label: "Placed point 2" };
  }
  const replaceStart = manhattan(pair.start, cell) <= manhattan(pair.end, cell);
  if (replaceStart) pair.start = cell;
  else pair.end = cell;
  return { changed: true, label: replaceStart ? "Moved point 1" : "Moved point 2" };
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

  const pid = selectedEditorPairId();
  assignEditorPairCell(pid, cell);
}

function editorMode() {
  return document.getElementById("ed-mode")?.value || "blocker";
}

function selectedEditorPair() {
  const pairId = document.getElementById("ed-pair-id")?.value || PAIR_IDS[0];
  return activePairsFromEditor().find((pair) => pair.id === pairId) || null;
}

function clearEditorReferenceTrails() {
  state.editor.referenceTrails = createEmptyReferenceTrails();
  state.editor.traceDraft = null;
  updateEditorReferenceStatus();
}

function updateEditorReferenceStatus() {
  const badge = document.getElementById("editor-reference-status");
  if (!badge) return;
  const complete = Object.values(state.editor.referenceTrails || {}).filter((cells) => Array.isArray(cells) && cells.length > 1).length;
  const drafting = state.editor.traceDraft?.cells?.length > 1 ? " + draft" : "";
  badge.textContent = `Reference trails: ${complete}${drafting}`;
  updateEditorPlaySummary();
  renderEditorPairList();
}

function capturePlayPathsAsGuides(scope = "all") {
  const pairIds = scope === "selected" ? [selectedEditorPairId()] : activePairIds();
  let captured = 0;
  pairIds.forEach((pairId) => {
    const path = state.play.paths?.[pairId] || [];
    if (path.length > 1) {
      state.editor.referenceTrails[pairId] = path.map(([r, c]) => [r, c]);
      captured += 1;
    }
  });
  if (!captured) {
    log("ed-log", "No playable route found yet. Draw a path first, then mark it as guide.");
    return;
  }
  updateEditorReferenceStatus();
  markEditorDirty(scope === "selected" ? "selected play guide captured" : "play guides captured");
  recordLearningDecision(levelFromEditor(), "approve", scope === "selected" ? "editor_play_guide_selected" : "editor_play_guide_all", {
    captured_pairs: captured,
    source_link: state.editor.link?.sourceType || "standalone",
    selected_pair: scope === "selected" ? selectedEditorPairId() : "all"
  });
  drawBoard();
  log("ed-log", `Captured ${captured} play ${captured === 1 ? "path" : "paths"} as editor guides.`);
}

function updateEditorSlotInfo() {
  const slotInfo = document.getElementById("editor-slot-info");
  if (!slotInfo) return;
  const progressionKey = editorSelectedProgressionKey();
  const progression = getManagerProgression(progressionKey);
  const progressionSlot = Math.max(0, Number(state.editor.progressionSlot || FIRST_PLAYABLE_SLOT_INDEX));

  if (!progression) {
    slotInfo.textContent = "Slot: (no progression selected)";
    return;
  }

  const slotLabel = progressionSlot === 0 ? "Tutorial" : `Level ${progressionSlot}`;
  const slotStatus = progression.slots && progression.slots[progressionSlot] ? "occupied" : "empty";
  slotInfo.textContent = `${progressionKey} → Slot ${progressionSlot} (${slotLabel}) · ${slotStatus}`;
}

function cellIsBlockedForReference(pairId, cell) {
  if (state.editor.blockers.has(coordKey(cell[0], cell[1]))) return true;
  const endpoint = endpointAtCell(cell);
  return !!(endpoint && endpoint.pairId !== pairId);
}

function beginReferenceTrail(cell) {
  const pair = selectedEditorPair();
  if (!pair?.start || !pair?.end) {
    log("ed-log", "Reference trail needs both endpoints placed first.");
    return false;
  }
  const isStart = sameCell(pair.start, cell);
  const isEnd = sameCell(pair.end, cell);
  if (!isStart && !isEnd) return false;
  state.editor.traceDraft = {
    pairId: pair.id,
    target: isStart ? [...pair.end] : [...pair.start],
    cells: [[cell[0], cell[1]]]
  };
  updateEditorReferenceStatus();
  return true;
}

function continueReferenceTrail(cell) {
  const draft = state.editor.traceDraft;
  if (!draft) return false;
  const { pairId, target, cells } = draft;
  const last = cells[cells.length - 1];
  if (sameCell(last, cell)) return false;
  if (manhattan(last, cell) !== 1) return false;
  const previous = cells[cells.length - 2];
  if (previous && sameCell(previous, cell)) {
    cells.pop();
    updateEditorReferenceStatus();
    return true;
  }
  if (cellIsBlockedForReference(pairId, cell)) return false;
  cells.push([cell[0], cell[1]]);
  if (sameCell(cell, target)) {
    state.editor.referenceTrails[pairId] = cells.map(([r, c]) => [r, c]);
    state.editor.traceDraft = null;
    updateEditorReferenceStatus();
    markEditorDirty(`reference trail ${pairId}`);
    log("ed-log", `Reference trail saved for pair ${pairId}.`);
  } else {
    updateEditorReferenceStatus();
  }
  return true;
}

function endReferenceTrail(commit = false) {
  if (!state.editor.traceDraft) return;
  if (!commit) log("ed-log", "Reference trail cancelled before reaching the other endpoint.");
  state.editor.traceDraft = null;
  updateEditorReferenceStatus();
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

function updatePlayToggleButton() {
  const toggle = document.getElementById("play-start");
  if (!toggle) return;
  toggle.textContent = state.play.on ? "Exit Play" : "Start Play";
}

function setPlayStatus(text) {
  const editorStatus = document.getElementById("play-status");
  const sessionStatus = document.getElementById("session-play-status");
  if (editorStatus) editorStatus.textContent = text;
  if (sessionStatus) sessionStatus.textContent = text;
  updatePlayToggleButton();
  updateSessionPlayPanel();
  updateEditorPlaySummary();
}

function updateSessionPlayPanel() {
  const panel = document.getElementById("session-play-panel");
  if (!panel) return;
  panel.hidden = !(state.play.on && state.sessions.activeId != null);
  updateSessionFeedbackPanel();
}

function getPlayStatus() {
  return document.getElementById("play-status")?.textContent || "Play OFF";
}

function drawRoundedRect(targetCtx, x, y, width, height, radius) {
  const safe = Math.max(0, Math.min(radius, width / 2, height / 2));
  targetCtx.beginPath();
  targetCtx.moveTo(x + safe, y);
  targetCtx.lineTo(x + width - safe, y);
  targetCtx.quadraticCurveTo(x + width, y, x + width, y + safe);
  targetCtx.lineTo(x + width, y + height - safe);
  targetCtx.quadraticCurveTo(x + width, y + height, x + width - safe, y + height);
  targetCtx.lineTo(x + safe, y + height);
  targetCtx.quadraticCurveTo(x, y + height, x, y + height - safe);
  targetCtx.lineTo(x, y + safe);
  targetCtx.quadraticCurveTo(x, y, x + safe, y);
  targetCtx.closePath();
}

function drawTrailStepBadge(targetCtx, cell, size, label, color, options = {}) {
  const radius = Math.max(10, Math.min(15, size * 0.18));
  const x = cell[1] * size + size / 2;
  const y = cell[0] * size + size / 2;
  targetCtx.save();
  targetCtx.fillStyle = options.background || colorWithAlpha(color, 0.95);
  targetCtx.strokeStyle = options.stroke || edgeLabelColor(color);
  targetCtx.lineWidth = 2;
  targetCtx.beginPath();
  targetCtx.arc(x, y, radius, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.stroke();
  targetCtx.fillStyle = options.textColor || readableTextColor(color);
  targetCtx.font = `700 ${Math.max(10, radius)}px ${DEFAULT_FONT_FAMILY}`;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.fillText(String(label), x, y + 0.5);
  targetCtx.restore();
}

function drawTrailPath(targetCtx, path, size, color, options = {}) {
  if (!Array.isArray(path) || path.length < 2) return;
  const alpha = Number(options.alpha ?? 1);
  const mainWidth = Math.max(5, Math.round(size * (options.widthScale || 0.11)));
  const outlineWidth = mainWidth + 4;
  const outlineColor = colorLuminance(color) > 0.55 ? "rgba(11, 27, 42, 0.18)" : "rgba(255, 255, 255, 0.72)";
  targetCtx.save();
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  targetCtx.strokeStyle = outlineColor;
  targetCtx.lineWidth = outlineWidth;
  if (options.dashed) targetCtx.setLineDash([Math.max(6, size * 0.22), Math.max(4, size * 0.12)]);
  targetCtx.beginPath();
  path.forEach((cell, index) => {
    const px = cell[1] * size + size / 2;
    const py = cell[0] * size + size / 2;
    if (index === 0) targetCtx.moveTo(px, py);
    else targetCtx.lineTo(px, py);
  });
  targetCtx.stroke();
  targetCtx.strokeStyle = colorWithAlpha(color, alpha);
  targetCtx.lineWidth = mainWidth;
  targetCtx.beginPath();
  path.forEach((cell, index) => {
    const px = cell[1] * size + size / 2;
    const py = cell[0] * size + size / 2;
    if (index === 0) targetCtx.moveTo(px, py);
    else targetCtx.lineTo(px, py);
  });
  targetCtx.stroke();
  targetCtx.restore();

  if (options.showSteps) {
    path.slice(1, -1).forEach((cell, index) => {
      drawTrailStepBadge(targetCtx, cell, size, index + 2, color, {
        background: colorWithAlpha(color, options.stepAlpha ?? 0.94),
        stroke: outlineColor
      });
    });
  }
}

function drawEndpointNode(targetCtx, cell, size, color, pairId, pointIndex) {
  const x = cell[1] * size;
  const y = cell[0] * size;
  const inset = Math.max(4, size * 0.08);
  const width = size - inset * 2;
  const height = size - inset * 2;
  const radius = Math.max(10, size * 0.22);
  const labelColor = readableTextColor(color);
  const edgeColor = edgeLabelColor(color);
  targetCtx.save();
  targetCtx.fillStyle = color;
  targetCtx.strokeStyle = edgeColor;
  targetCtx.lineWidth = 2;
  drawRoundedRect(targetCtx, x + inset, y + inset, width, height, radius);
  targetCtx.fill();
  targetCtx.stroke();
  targetCtx.fillStyle = labelColor;
  targetCtx.font = `700 ${Math.max(14, size * 0.26)}px ${DEFAULT_FONT_FAMILY}`;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.fillText(pairId, x + size / 2, y + size / 2 + 1);

  const badgeRadius = Math.max(9, Math.min(13, size * 0.16));
  const badgeX = x + size - inset - badgeRadius;
  const badgeY = y + inset + badgeRadius;
  targetCtx.fillStyle = colorWithAlpha(labelColor === "#ffffff" ? "#0b1b2a" : "#ffffff", 0.92);
  targetCtx.beginPath();
  targetCtx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.fillStyle = labelColor === "#ffffff" ? "#ffffff" : "#0b1b2a";
  targetCtx.font = `700 ${Math.max(10, badgeRadius)}px ${DEFAULT_FONT_FAMILY}`;
  targetCtx.fillText(String(pointIndex), badgeX, badgeY + 0.5);
  targetCtx.restore();
}

function drawBoardOn(targetCanvas, targetCtx) {
  const width = state.editor.boardWidth;
  const height = state.editor.boardHeight;
  const size = editorCellSize(targetCanvas);
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetCtx.font = `700 ${Math.max(12, size * 0.24)}px ${DEFAULT_FONT_FAMILY}`;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";

  const blockers = state.editor.blockers;
  const debugMarks = state.editor.debugMarks || new Set();
  const referenceTrails = state.editor.referenceTrails || createEmptyReferenceTrails();
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
        targetCtx.fillText("X", x + size / 2, y + size / 2 + 1);
      }

      Object.keys(pairMap).forEach((id, i) => {
        const p = pairMap[id];
        if (p.start && p.start[0] === r && p.start[1] === c) {
          drawEndpointNode(targetCtx, p.start, size, colorMap[id] || pairColors[i], id, 1);
        }
        if (p.end && p.end[0] === r && p.end[1] === c) {
          drawEndpointNode(targetCtx, p.end, size, colorMap[id] || pairColors[i], id, 2);
        }
      });
    }
  }

  Object.keys(referenceTrails).forEach((id, i) => {
    const trail = referenceTrails[id] || [];
    if (trail.length < 2) return;
    drawTrailPath(targetCtx, trail, size, colorMap[id] || pairColors[i % pairColors.length], {
      dashed: true,
      alpha: 0.62,
      widthScale: 0.1,
      showSteps: true,
      stepAlpha: 0.9
    });
  });

  const draft = state.editor.traceDraft;
  if (draft?.cells?.length > 1) {
    const pairIndex = Math.max(0, PAIR_IDS.indexOf(draft.pairId));
    drawTrailPath(targetCtx, draft.cells, size, colorMap[draft.pairId] || pairColors[pairIndex], {
      dashed: true,
      alpha: 0.9,
      widthScale: 0.11,
      showSteps: true
    });
  }

  if (state.play.on) {
    Object.keys(state.play.paths).forEach((id, i) => {
      const path = state.play.paths[id] || [];
      if (path.length < 2) return;
      drawTrailPath(targetCtx, path, size, colorMap[id] || pairColors[i % pairColors.length], {
        alpha: 1,
        widthScale: 0.13,
        showSteps: true
      });
    });
  }
}

function drawBoard() {
  drawBoardOn(canvas, ctx);
  drawBoardOn(sessionCanvas, sessionCtx);
  updateEditorPairBadge();
  updateEditorPlaySummary();
  renderEditorPairList();
}

function log(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
}

function logSessionPerf(label, startedAt, details = "", options = {}) {
  const duration = performance.now() - startedAt;
  const thresholdMs = Number(options.thresholdMs ?? 120);
  const force = options.force === true;
  if (!force && duration < thresholdMs) return duration;
  const suffix = details ? ` · ${details}` : "";
  log("session-log", `[perf] ${label}: ${duration.toFixed(1)}ms${suffix}`);
  return duration;
}

function updateEditorSaveStatus() {
  const saveTag = document.getElementById("editor-save-status");
  const linkTag = document.getElementById("editor-session-link");
  if (saveTag) {
    if (state.editor.dirty) saveTag.textContent = "Unsaved changes";
    else if (state.editor.lastSavedAt) saveTag.textContent = `Saved ${new Date(state.editor.lastSavedAt).toLocaleTimeString()}`;
    else saveTag.textContent = "Saved";
    saveTag.classList.remove("tag-updated"); void saveTag.offsetWidth; saveTag.classList.add("tag-updated");
  }
  if (linkTag) linkTag.textContent = state.editor.link?.label || "Standalone level";
  scheduleWorkspaceStatePersist();
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
  const variantPairsIntentEl = document.getElementById("ed-reference-pairs-intent");
  const variantBlockersIntentEl = document.getElementById("ed-reference-blockers-intent");
  const variantBoardIntentEl = document.getElementById("ed-reference-board-intent");
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
  if (variantPairsIntentEl) variantPairsIntentEl.value = normalizeProceduralReferenceAdjustments(state.editor.variantAdjustments).pairs;
  if (variantBlockersIntentEl) variantBlockersIntentEl.value = normalizeProceduralReferenceAdjustments(state.editor.variantAdjustments).blockers;
  if (variantBoardIntentEl) variantBoardIntentEl.value = normalizeProceduralReferenceAdjustments(state.editor.variantAdjustments).board;
  updateEditorDebugStatus();
  updateEditorReferenceStatus();
  updateEditorSlotInfo();
  updateEditorPairBadge();
  updateEditorPlaySummary();
  renderEditorPairList();
  renderEditorVariantLab();
}

function updateEditorPairBadge() {
  const pairEl = document.getElementById("ed-pair-id");
  const badge = document.getElementById("ed-pair-color");
  const placementBadge = document.getElementById("ed-pair-placement");
  const summaryBadge = document.getElementById("editor-pair-summary");
  if (!pairEl || !badge) return;
  const pairId = pairEl.value || PAIR_IDS[0];
  const pairIndex = Math.max(0, PAIR_IDS.indexOf(pairId));
  const color = pairColors[pairIndex] || pairColors[0];
  const pointCount = editorPairPointCount(pairId);
  const placementText = pointCount === 0
    ? "Next click places point 1"
    : pointCount === 1
      ? "Next click auto-places point 2"
      : "Both points placed. Click again to move the nearest point";
  badge.textContent = `${pairId} · ready`;
  badge.style.background = color;
  badge.style.color = readableTextColor(color);
  badge.style.borderColor = color;
  if (placementBadge) placementBadge.textContent = placementText;
  if (summaryBadge) summaryBadge.textContent = `Pair ${pairId} · ${pointCount}/2 points`;
}

function updateEditorPlaySummary() {
  const summary = document.getElementById("editor-play-summary");
  const selectedBtn = document.getElementById("play-mark-selected");
  const allBtn = document.getElementById("play-mark-all");
  const clearBtn = document.getElementById("play-clear-guides");
  const selectedPairId = selectedEditorPairId();
  const playPath = state.play.paths?.[selectedPairId] || [];
  const playSteps = Math.max(0, playPath.length - 1);
  const guidePath = state.editor.referenceTrails?.[selectedPairId] || [];
  const guideSteps = Math.max(0, guidePath.length - 1);
  const hasAnyPlayPath = Object.values(state.play.paths || {}).some((path) => Array.isArray(path) && path.length > 1);
  const hasAnyGuide = Object.values(state.editor.referenceTrails || {}).some((path) => Array.isArray(path) && path.length > 1);
  if (summary) {
    summary.textContent = state.play.on
      ? `${selectedPairId}: ${playSteps} play steps · ${guideSteps} guide steps`
      : `${selectedPairId}: ${guideSteps} saved guide steps`;
  }
  if (selectedBtn) selectedBtn.disabled = playPath.length <= 1;
  if (allBtn) allBtn.disabled = !hasAnyPlayPath;
  if (clearBtn) clearBtn.disabled = !hasAnyGuide;
}

function renderEditorPairList() {
  const container = document.getElementById("editor-pair-list");
  if (!container) return;
  container.innerHTML = "";
  activePairIds().forEach((pairId, index) => {
    const pair = state.editor.pairs[pairId] || { start: null, end: null };
    const button = document.createElement("button");
    button.type = "button";
    button.className = `editor-pair-tile${pairId === selectedEditorPairId() ? " active" : ""}`;
    button.addEventListener("click", () => {
      const pairEl = document.getElementById("ed-pair-id");
      if (pairEl) pairEl.value = pairId;
      updateEditorPairBadge();
      updateEditorPlaySummary();
      renderEditorPairList();
      drawBoard();
    });

    const swatch = document.createElement("span");
    swatch.className = "editor-pair-swatch";
    swatch.style.background = pairColors[index] || pairColors[0];
    button.appendChild(swatch);

    const copy = document.createElement("span");
    copy.className = "editor-pair-copy";
    const name = document.createElement("span");
    name.className = "editor-pair-name";
    name.textContent = `Pair ${pairId}`;
    copy.appendChild(name);
    const meta = document.createElement("span");
    meta.className = "editor-pair-meta";
    const pointText = pair.start && pair.end
      ? "2 points placed"
      : pair.start || pair.end
        ? "1 point placed"
        : "empty pair";
    const playSteps = Math.max(0, (state.play.paths?.[pairId] || []).length - 1);
    meta.textContent = `${pointText} · ${playSteps} play steps`;
    copy.appendChild(meta);
    button.appendChild(copy);

    const guide = document.createElement("span");
    guide.className = "editor-pair-guide";
    const guideSteps = Math.max(0, (state.editor.referenceTrails?.[pairId] || []).length - 1);
    guide.textContent = guideSteps ? `${guideSteps} guide` : "no guide";
    button.appendChild(guide);

    container.appendChild(button);
  });
}

function renderEditorVariantLab() {
  const container = document.getElementById("editor-variant-grid");
  const intentTag = document.getElementById("editor-variant-intent");
  if (intentTag) intentTag.textContent = proceduralReferenceIntentText(state.editor.variantAdjustments);
  if (!container) return;
  container.innerHTML = "";
  if (!state.editor.variantCandidates?.length) {
    const empty = document.createElement("div");
    empty.className = "procedural-reference-empty";
    empty.textContent = "No editor variants yet. Generate 3 options from the current level to review them here.";
    container.appendChild(empty);
    return;
  }

  state.editor.variantCandidates.forEach((candidate, index) => {
    const guide = analyzeSolutionGuide(candidate.level);
    const guideTrust = guideTrustLevel(guide);
    const similarity = Number(candidate.similarity || 0);
    const learningBias = Number(candidate.learningBias || 0);
    const card = document.createElement("article");
    card.className = `editor-variant-card ${candidate.status || "pending"}`;

    const head = document.createElement("div");
    head.className = "procedural-reference-head";
    const title = document.createElement("div");
    title.className = "procedural-reference-title";
    title.textContent = `Variant ${index + 1}`;
    head.appendChild(title);
    const badges = document.createElement("div");
    badges.className = "procedural-reference-badges";
    const status = document.createElement("div");
    status.className = "procedural-reference-status";
    status.textContent = String(candidate.status || "pending").toUpperCase();
    badges.appendChild(status);
    const trust = document.createElement("div");
    trust.className = `procedural-guide-trust trust-${guideTrust.toLowerCase()}`;
    trust.textContent = `Guide ${guideTrust}`;
    badges.appendChild(trust);
    head.appendChild(badges);
    card.appendChild(head);

    const preview = document.createElement("canvas");
    preview.width = 220;
    preview.height = 220;
    drawLevelPreviewCanvas(preview, candidate.level, false, { showSolution: candidate.showSolution !== false });
    card.appendChild(preview);

    const nameInput = document.createElement("input");
    nameInput.className = "procedural-reference-name";
    nameInput.type = "text";
    nameInput.value = candidate.name;
    nameInput.addEventListener("change", () => {
      candidate.name = normalizeLevelFileName(nameInput.value || candidate.name || `editor_variant_${candidate.id}`);
      nameInput.value = candidate.name;
      persistWorkspaceState();
    });
    card.appendChild(nameInput);

    const meta = document.createElement("div");
    meta.className = "procedural-reference-meta";
    meta.textContent = `${levelFeatureSummary(candidate.level)}\nIntent: ${proceduralReferenceIntentText(candidate.referenceIntent || state.editor.variantAdjustments).replace(/^Intent:\s*/, "")}\nSimilarity to base: ${similarity.toFixed(2)}\nLearning bias: ${learningBias.toFixed(2)}\nGuide trust: ${guideTrust}${guide.isClean ? " (clean)" : ` (${guide.issues.join(", ")})`}`;
    card.appendChild(meta);

    const solution = document.createElement("div");
    solution.className = "procedural-reference-solution";
    solution.textContent = `How to solve\n${levelGoldenPathSummary(candidate.level) || "No golden path available."}`;
    card.appendChild(solution);

    const actions = document.createElement("div");
    actions.className = "procedural-reference-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = candidate.showSolution === false ? "Show Solution" : "Hide Solution";
    toggleBtn.addEventListener("click", () => {
      candidate.showSolution = candidate.showSolution === false;
      renderEditorVariantLab();
      persistWorkspaceState();
    });
    actions.appendChild(toggleBtn);

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", () => {
      recordLearningDecision(candidate.level, "approve", "editor_variant_open", {
        base_file: state.editor.fileName || "",
        candidate_name: candidate.name,
        reference_intent: normalizeProceduralReferenceAdjustments(candidate.referenceIntent || state.editor.variantAdjustments)
      });
      loadLevelToEditor(candidate.level, { fileName: candidate.name, keepVariantLab: true });
      setEditorLink("standalone", null, `Editor variant ${index + 1}`);
      log("ed-log", `Loaded ${candidate.name} into the editor.`);
    });
    actions.appendChild(openBtn);

    const keepBtn = document.createElement("button");
    keepBtn.type = "button";
    keepBtn.textContent = "Keep";
    keepBtn.addEventListener("click", () => {
      if (candidate.status !== "kept") {
        recordLearningDecision(candidate.level, "approve", "editor_variant_keep", {
          base_file: state.editor.fileName || "",
          candidate_name: candidate.name,
          reference_intent: normalizeProceduralReferenceAdjustments(candidate.referenceIntent || state.editor.variantAdjustments)
        });
      }
      candidate.status = "kept";
      renderEditorVariantLab();
      persistWorkspaceState();
      log("ed-log", `Kept ${candidate.name} as a learned editor variant.`);
    });
    actions.appendChild(keepBtn);

    const discardPanel = document.createElement("div");
    discardPanel.className = "procedural-discard-panel";
    const discardTitle = document.createElement("div");
    discardTitle.className = "procedural-discard-title";
    discardTitle.textContent = "Discard feedback";
    discardPanel.appendChild(discardTitle);
    const discardHint = document.createElement("div");
    discardHint.className = "procedural-discard-hint";
    discardHint.textContent = "Choose one reason, then mark the pair or pairs behind the problem.";
    discardPanel.appendChild(discardHint);

    if (!candidate.discardDraftReason && guide.issues.includes("paths_cross")) candidate.discardDraftReason = "paths_cross";
    if (!Array.isArray(candidate.discardDraftPairs)) candidate.discardDraftPairs = Array.isArray(candidate.discardPairIds) ? [...candidate.discardPairIds] : [];
    if (candidate.discardDraftNote == null) candidate.discardDraftNote = candidate.discardNote || "";

    const reasonButtons = [];
    const reasonWrap = document.createElement("div");
    reasonWrap.className = "procedural-discard-reasons";
    DISCARD_REASON_OPTIONS.filter((option) => option.value).forEach((option) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "procedural-discard-reason-chip";
      chip.textContent = option.label;
      chip.addEventListener("click", () => {
        candidate.discardDraftReason = option.value;
        refreshDiscardUi();
        persistWorkspaceState();
      });
      reasonButtons.push({ option, chip });
      reasonWrap.appendChild(chip);
    });
    discardPanel.appendChild(reasonWrap);

    const pairButtons = [];
    const pairWrap = document.createElement("div");
    pairWrap.className = "procedural-discard-pairs";
    (candidate.level.pairs || []).forEach((pair) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "procedural-pair-chip";
      chip.textContent = pair.id;
      chip.addEventListener("click", () => {
        toggleDiscardDraftPair(candidate, pair.id);
        refreshDiscardUi();
        persistWorkspaceState();
      });
      pairButtons.push({ pairId: pair.id, chip });
      pairWrap.appendChild(chip);
    });
    discardPanel.appendChild(pairWrap);

    const note = document.createElement("textarea");
    note.className = "procedural-discard-note";
    note.rows = 2;
    note.placeholder = "Optional note";
    note.value = candidate.discardDraftNote || "";
    note.addEventListener("input", () => {
      candidate.discardDraftNote = note.value;
      persistWorkspaceState();
    });
    discardPanel.appendChild(note);

    const discardActions = document.createElement("div");
    discardActions.className = "procedural-discard-actions";
    const discardBtn = document.createElement("button");
    discardBtn.type = "button";
    discardBtn.className = "procedural-discard-apply";
    discardBtn.textContent = "Discard";
    discardBtn.addEventListener("click", () => {
      const reasonCode = String(candidate.discardDraftReason || "").trim();
      if (!reasonCode) {
        log("ed-log", "Discard cancelled: choose a discard reason first.");
        return;
      }
      const normalizedPairIds = normalizeDiscardPairIds((candidate.discardDraftPairs || []).join(","), candidate.level);
      const pairFeedback = extractPairFeedback(candidate.level, normalizedPairIds);
      const reasonText = composeDiscardReasonText(reasonCode, candidate.discardDraftNote || "");
      recordLearningDecision(candidate.level, "reject", "editor_variant_discard", {
        base_file: state.editor.fileName || "",
        candidate_name: candidate.name,
        reason_code: reasonCode,
        reason_text: reasonText,
        pair_ids: normalizedPairIds,
        pair_feedback: pairFeedback,
        reference_intent: normalizeProceduralReferenceAdjustments(candidate.referenceIntent || state.editor.variantAdjustments)
      });
      candidate.status = "discarded";
      candidate.discardReasonCode = reasonCode;
      candidate.discardReason = reasonText;
      candidate.discardNote = String(candidate.discardDraftNote || "").trim();
      candidate.discardPairIds = normalizedPairIds;
      renderEditorVariantLab();
      persistWorkspaceState();
      log("ed-log", `Discarded ${candidate.name}.`);
    });
    discardActions.appendChild(discardBtn);
    const clearDiscardBtn = document.createElement("button");
    clearDiscardBtn.type = "button";
    clearDiscardBtn.textContent = "Clear";
    clearDiscardBtn.addEventListener("click", () => {
      candidate.discardDraftReason = "";
      candidate.discardDraftPairs = [];
      candidate.discardDraftNote = "";
      note.value = "";
      refreshDiscardUi();
      persistWorkspaceState();
    });
    discardActions.appendChild(clearDiscardBtn);
    discardPanel.appendChild(discardActions);

    function refreshDiscardUi() {
      reasonButtons.forEach(({ option, chip }) => {
        chip.classList.toggle("active", candidate.discardDraftReason === option.value);
      });
      pairButtons.forEach(({ pairId, chip }) => {
        chip.classList.toggle("active", (candidate.discardDraftPairs || []).includes(pairId));
      });
    }

    refreshDiscardUi();
    card.appendChild(actions);
    card.appendChild(discardPanel);
    container.appendChild(card);
  });
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
  const progression = getManagerProgression(editorSelectedProgressionKey());
  return Math.min(progressionMaxPlayableSlotIndex(progression), Math.max(0, slot));
}

function suggestedEditorFileNameForSlot(key, slotIndex) {
  const label = getManagerProgressionLabel(key).replace(/\s+/g, "_").toLowerCase();
  return normalizeLevelFileName(`${label}_slot_${slotNumberFromIndex(slotIndex)}`, Math.max(1, slotNumberFromIndex(slotIndex)));
}

function prepareEditorNewLevelForProgressionSlot(key, slotIndex) {
  const progression = getManagerProgression(key);
  if (isTutorialSlotIndex(slotIndex)) {
    const tutorialItem = progression?.slots?.[0] != null ? getManagerItemById(progression.slots[0]) : null;
    if (tutorialItem?.level) {
      loadLevelToEditor(tutorialItem.level, { fileName: tutorialItem.file });
      setEditorLink("manager", tutorialItem.id, `Linked to ${getManagerProgressionLabel(key)} · Slot 0 (Tutorial)`);
      state.manager.selectedId = tutorialItem.id;
      state.manager.activeTab = key;
      updateEditorProgressionBuilder();
      updateManagerTable();
      return;
    }
  }
  state.editor.progressionKey = key;
  state.editor.progressionSlot = slotNumberFromIndex(slotIndex);
  state.editor.level = Math.max(1, slotNumberFromIndex(slotIndex));
  state.editor.fileName = suggestedEditorFileNameForSlot(key, slotIndex);
  state.editor.moves = 0;
  state.editor.decal = false;
  state.editor.solutionCount = 0;
  state.editor.validationSolvable = false;
  state.editor.validationDensityMatch = false;
  state.editor.validationDecalPass = null;
  state.editor.blockers.clear();
  state.editor.debugMarks.clear();
  clearEditorReferenceTrails();
  state.editor.variantCandidates = [];
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
  setEditorLink("standalone", null, `Building ${getManagerProgressionLabel(key)} · ${displaySlotLabel(slotIndex)}`);
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

function createLevelPreviewCanvasNode(level, selected = false, options = {}) {
  const previewCanvas = document.createElement("canvas");
  const size = Math.max(96, Number(options.size || 180));
  previewCanvas.width = size;
  previewCanvas.height = size;
  previewCanvas.className = options.className || "editor-slot-thumb";
  previewCanvas.setAttribute("aria-label", options.ariaLabel || "Level preview");
  drawLevelPreviewCanvas(previewCanvas, level, selected, options);
  return previewCanvas;
}

function previewAssetUrlForItem(item) {
  const relativePath = projectRelativePath(item?.screenshotPath || "");
  if (!relativePath || !relativePath.toLowerCase().endsWith(".png")) return "";
  return `/${relativePath.replace(/^\/+/, "")}`;
}

function createLevelPreviewNode(item, selected = false, options = {}) {
  const assetUrl = previewAssetUrlForItem(item);
  if (assetUrl) {
    const previewImg = document.createElement("img");
    previewImg.className = options.className || "editor-slot-thumb";
    previewImg.alt = options.ariaLabel || `${item?.file || "level"} preview`;
    previewImg.loading = "lazy";
    previewImg.decoding = "async";
    previewImg.src = assetUrl;
    return previewImg;
  }
  return createLevelPreviewCanvasNode(item.level, selected, options);
}

function createDeferredPreviewMount(item, selected = false, options = {}) {
  const host = document.createElement("div");
  host.className = options.mountClassName || "deferred-preview";
  const placeholder = document.createElement("div");
  placeholder.className = options.placeholderClassName || "editor-slot-empty";
  placeholder.textContent = options.placeholderText || "Preview loading...";
  host.appendChild(placeholder);

  const mountPreview = () => {
    if (host.dataset.loaded === "1") return;
    host.dataset.loaded = "1";
    host.innerHTML = "";
    host.appendChild(createLevelPreviewNode(item, selected, options));
  };

  if (typeof IntersectionObserver !== "function") {
    mountPreview();
    return host;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.disconnect();
      mountPreview();
      break;
    }
  }, { rootMargin: "160px 0px" });
  observer.observe(host);
  return host;
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

function exportTimestamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function progressionExportOutputStem(key = state.manager.activeTab) {
  return `${progressionExportFileStem(key)}_${exportTimestamp()}`;
}

function activeProgressionRows(key = state.manager.activeTab) {
  if (!isManagerProgressionTab(key)) return [];
  const progression = getManagerProgression(key);
  return progression.slots.map((itemId, index) => {
    const item = itemId != null ? getManagerItemById(itemId) : null;
    return {
      progression_key: key,
      progression_label: getManagerProgressionLabel(key),
      slot: slotNumberFromIndex(index),
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
  const barWidth = 100;
  const gap = 18;
  const width = Math.max(1280, 80 + progression.slots.length * (barWidth + gap));
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
    ctx.fillText(isTutorialSlotIndex(index) ? "T" : `L${index}`, x + 34, top + chartHeight + 26);
    ctx.fillStyle = "#475569";
    ctx.font = "14px Arial";
    ctx.fillText(normalized, x + 18, top + chartHeight + 48);
  });

  const filled = progression.slots.filter((id, index) => index !== 0 && id != null).length;
  ctx.fillStyle = "#0f172a";
  ctx.font = "600 18px Arial";
  ctx.fillText(`Filled levels: ${filled}/${progressionPlayableLevelCount(progression)}`, 40, height - 50);
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
  const rows = Math.ceil(progression.slots.length / columns);
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
    ctx.fillText(displaySlotLabel(index), x + 14, y + 28);
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
  const stem = progressionExportOutputStem(key);
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

  return createManagerOutputZip(`${stem}.zip`, `${stem}.zip`, entries);
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

  if (slotSelect.options.length !== progression.slots.length) {
    slotSelect.innerHTML = "";
    Array.from({ length: progression.slots.length }, (_, index) => {
      const opt = document.createElement("option");
      opt.value = String(slotNumberFromIndex(index));
      opt.textContent = displaySlotLabel(index);
      slotSelect.appendChild(opt);
    });
  }
  state.editor.progressionSlot = Math.min(
    progressionMaxPlayableSlotIndex(progression),
    Math.max(0, Number(state.editor.progressionSlot || FIRST_PLAYABLE_SLOT_INDEX))
  );
  slotSelect.value = String(state.editor.progressionSlot);

  slotsWrap.innerHTML = "";
  progression.slots.forEach((itemId, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "editor-slot-card";
    if (slotNumberFromIndex(index) === state.editor.progressionSlot) card.classList.add("selected");
    const item = itemId != null ? getManagerItemById(itemId) : null;
    const title = document.createElement("div");
    title.className = "editor-slot-title";
    title.textContent = displaySlotLabel(index);
    card.appendChild(title);

    if (item?.level) {
      const meta = document.createElement("div");
      meta.className = "editor-slot-meta";
      meta.textContent = `${item.file} · ${item.status}`;
      card.appendChild(meta);
      if (shouldRenderEditorStripPreviews()) {
        card.appendChild(createDeferredPreviewMount(item, false, {
          className: "editor-slot-thumb",
          mountClassName: "editor-slot-thumb-wrap",
          ariaLabel: item.file,
          size: 180,
          placeholderText: "Preview"
        }));
      }
    } else {
      const empty = document.createElement("div");
      empty.className = "editor-slot-empty";
      empty.textContent = isTutorialSlotIndex(index) ? "Tutorial reserved" : `Empty Level ${index}`;
      card.appendChild(empty);
    }

    card.addEventListener("click", () => {
      state.editor.progressionKey = key;
      state.editor.progressionSlot = slotNumberFromIndex(index);
      slotSelect.value = String(slotNumberFromIndex(index));
      if (item?.level) {
        loadLevelToEditor(item.level, { fileName: item.file });
        setEditorLink("manager", item.id, `Linked to ${getManagerProgressionLabel(key)} · ${displaySlotLabel(index)}`);
        state.manager.selectedId = item.id;
        state.manager.activeTab = key;
        log("ed-log", `Loaded ${item.file} from ${getManagerProgressionLabel(key)} · ${displaySlotLabel(index)}.`);
      } else {
        prepareEditorNewLevelForProgressionSlot(key, index);
        log("ed-log", `Ready to build ${getManagerProgressionLabel(key)} · ${displaySlotLabel(index)}.`);
      }
      updateEditorProgressionBuilder();
      updateManagerTable({ persistWorkspace: false, scheduleMetadata: false });
    });
    slotsWrap.appendChild(card);
  });
}

async function syncSessionItemToManager(item, { persistArtifacts = false } = {}) {
  if (!item?.managerItemId) return null;
  const managerItem = getManagerItemById(item.managerItemId);
  if (!managerItem) return null;
  const currentSlot = findManagerSlotIndex(managerItem.id);
  if (currentSlot && isManagerProgressionLocked(currentSlot.tab)) {
    throw new Error(`${getManagerProgressionLabel(currentSlot.tab)} is locked.`);
  }
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
  assertLevelCanBeSaved(editedLevel);
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
    const currentSlot = findManagerSlotIndex(item.id);
    if (currentSlot && isManagerProgressionLocked(currentSlot.tab)) {
      throw new Error(`${getManagerProgressionLabel(currentSlot.tab)} is locked. Unlock it before editing linked liveops levels.`);
    }
    const conflictingItem = findManagerItemByFileName(editorFileName, item.id);
    if (conflictingItem) throw new Error(`File name already belongs to another level: ${conflictingItem.file}`);
    const previousJsonPath = item.savedPath;
    const previousScreenshotPath = item.screenshotPath;
    item.level = cloneLevel(editedLevel);
    item.file = editorFileName;
    item.status = validateLevel(editedLevel).valid ? "OK" : "INVALID";
    item.changed = true;
    refreshItemArtifacts(item);
    const saved = await saveLevelArtifactsToProject(editedLevel, editorFileName);
    item.savedPath = saved.jsonPath;
    item.screenshotPath = saved.screenshotPath;
    item.sourcePath = saved.jsonPath;
    await cleanupRenamedArtifacts({
      excludeItemId: item.id,
      oldJsonPath: previousJsonPath,
      oldScreenshotPath: previousScreenshotPath,
      newJsonPath: saved.jsonPath,
      newScreenshotPath: saved.screenshotPath
    });
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
    saveCanonicalEditorDraft(editedLevel).catch(() => {});
    queueBrowserStateSync("editor_draft_saved");
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
  if (!ensureManagerProgressionUnlocked(key, "ed-log")) {
    state.manager.activeTab = key;
    updateManagerTable({ persistWorkspace: false, scheduleMetadata: false });
    return;
  }
  await ensureTutorialInProgressionSlot(key);
  const editedLevel = levelFromEditor();
  assertLevelCanBeSaved(editedLevel);
  const editorFileName = normalizeLevelFileName(document.getElementById("ed-name")?.value || state.editor.fileName, editedLevel.level);
  state.editor.fileName = editorFileName;

  if (isTutorialSlotIndex(slotIndex)) {
    const tutorialItem = progression.slots[0] != null ? getManagerItemById(progression.slots[0]) : null;
    const linkedTutorial = tutorialItem && state.editor.link?.sourceType === "manager" && state.editor.link.sourceId === tutorialItem.id;
    const editingTutorialFile = basename(editorFileName) === TUTORIAL_LEVEL_BASENAME;
    if (!linkedTutorial && !editingTutorialFile) {
      loadLevelToEditor(tutorialItem.level, { fileName: tutorialItem.file });
      setEditorLink("manager", tutorialItem.id, `Linked to ${getManagerProgressionLabel(key)} · Slot 0 (Tutorial)`);
      state.manager.selectedId = tutorialItem.id;
      state.manager.activeTab = key;
      updateEditorProgressionBuilder();
      updateManagerTable({ persistWorkspace: false, scheduleMetadata: false });
      log("ed-log", `Slot 0 in ${getManagerProgressionLabel(key)} is reserved for the tutorial. The tutorial was loaded instead of replacing it.`);
      return;
    }
  }

  let item = progression.slots[slotIndex] != null ? getManagerItemById(progression.slots[slotIndex]) : null;
  if (!item) {
    const existingItem = findManagerItemByFileName(editorFileName);
    if (existingItem) {
      item = existingItem;
      moveManagerItemToSlot(item.id, slotIndex, key);
    } else {
      item = summarizeManagerItem(editedLevel, editorFileName, `Editor progression builder · ${getManagerProgressionLabel(key)} · ${displaySlotLabel(slotIndex)}`);
      state.manager.items.push(item);
      progression.slots[slotIndex] = item.id;
    }
  }

  const conflictingItem = findManagerItemByFileName(editorFileName, item.id);
  if (conflictingItem) throw new Error(`File name already belongs to another level: ${conflictingItem.file}`);
  const previousJsonPath = item.savedPath;
  const previousScreenshotPath = item.screenshotPath;
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

  editedLevel.position = {
    progression: key,
    slot: slotNumberFromIndex(slotIndex)
  };
  item.level.position = editedLevel.position;
  const saved = await saveLevelArtifactsToProject(item.level, item.file);
  item.savedPath = saved.jsonPath;
  item.screenshotPath = saved.screenshotPath;
  item.sourcePath = saved.jsonPath;
  state.editor.linkedProgression = key;
  state.editor.linkedSlot = slotNumberFromIndex(slotIndex);
  await cleanupRenamedArtifacts({
    excludeItemId: item.id,
    oldJsonPath: previousJsonPath,
    oldScreenshotPath: previousScreenshotPath,
    newJsonPath: saved.jsonPath,
    newScreenshotPath: saved.screenshotPath
  });

  state.manager.activeTab = key;
  state.manager.selectedId = item.id;
  state.editor.progressionKey = key;
  state.editor.progressionSlot = slotNumberFromIndex(slotIndex);
  state.editor.dirty = false;
  state.editor.lastSavedAt = Date.now();
  setEditorLink("manager", item.id, `Linked to ${getManagerProgressionLabel(key)} · ${displaySlotLabel(slotIndex)}`);
  updateManagerTable();
  syncEditorInputs();
  updateEditorSaveStatus();
  log("ed-log", `Saved ${item.file} into ${getManagerProgressionLabel(key)} · ${displaySlotLabel(slotIndex)}.`);

  if (advanceToNext) {
    const nextSlotIndex = Math.min(progressionMaxPlayableSlotIndex(progression), slotIndex + 1);
    const nextItemId = progression.slots[nextSlotIndex];
    if (nextItemId != null) {
      const nextItem = getManagerItemById(nextItemId);
      if (nextItem?.level) {
        state.editor.progressionSlot = slotNumberFromIndex(nextSlotIndex);
        loadLevelToEditor(nextItem.level, { fileName: nextItem.file });
        setEditorLink("manager", nextItem.id, `Linked to ${getManagerProgressionLabel(key)} · ${displaySlotLabel(nextSlotIndex)}`);
        state.manager.selectedId = nextItem.id;
        log("ed-log", `Moved to existing ${getManagerProgressionLabel(key)} · ${displaySlotLabel(nextSlotIndex)}.`);
      }
    } else {
      prepareEditorNewLevelForProgressionSlot(key, nextSlotIndex);
      log("ed-log", `Created a new blank editor for ${getManagerProgressionLabel(key)} · ${displaySlotLabel(nextSlotIndex)}.`);
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
  assertLevelCanBeSaved(editedLevel);
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
  const loadedPairCount = Math.max(1, Math.min(PAIR_IDS.length, Number((level.pairs || []).length || 1)));
  if (loadedPairCount > Number(state.settings.maxPairs || 0)) {
    state.settings.maxPairs = loadedPairCount;
  }
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
  state.editor.referenceTrails = createEmptyReferenceTrails();
  state.editor.traceDraft = null;
  if (!options.keepVariantLab) state.editor.variantCandidates = [];
  state.editor.linkedProgression = level.position?.progression || null;
  state.editor.linkedSlot = level.position?.slot || null;

  state.editor.pairs = Object.fromEntries(PAIR_IDS.map((id) => [id, { start: null, end: null }]));
  (level.pairs || []).forEach((p) => {
    const pairIndex = PAIR_IDS.indexOf(p.id);
    if (pairIndex >= 0 && p.color) {
      pairColors[pairIndex] = p.color;
      state.settings.pairColors[pairIndex] = p.color;
    }
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
  if (!resizeEditorCanvas()) drawBoard();
}

function levelFromEditor(options = {}) {
  const recomputeAnalysis = options.recomputeAnalysis !== false;
  const pairs = activePairsFromEditor();
  const blockers = Array.from(state.editor.blockers).map(parseKey);
  const decal = !!document.getElementById("ed-decal")?.checked;
  state.editor.decal = decal;
  const solutionCount = recomputeAnalysis
    ? countSolutions(state.editor.boardWidth, state.editor.boardHeight, pairs, blockers, 20)
    : Number(state.editor.solutionCount || 0);
  const decalPass = recomputeAnalysis
    ? (decal ? hasFullCoverSolution(state.editor.boardWidth, state.editor.boardHeight, pairs, blockers) : null)
    : (state.editor.validationDecalPass ?? null);
  const movesRaw = String(document.getElementById("ed-moves").value ?? "").trim();
  const moves = movesRaw === "" ? recommendedMoves() : Number(movesRaw);
  state.editor.moves = Number.isFinite(moves) ? moves : recommendedMoves();
  const difficulty = document.getElementById("ed-difficulty").value;
  const targetDensity = recomputeAnalysis
    ? difficultyToTargetDensity(difficulty, solutionCount)
    : (state.editor.targetDensity || difficultyToTargetDensity(difficulty, solutionCount));
  const fileName = normalizeLevelFileName(document.getElementById("ed-name")?.value || state.editor.fileName, state.editor.level);
  state.editor.fileName = fileName;
  state.editor.solutionCount = solutionCount;
  state.editor.targetDensity = targetDensity;
  state.editor.validationSolvable = recomputeAnalysis ? solutionCount >= 1 : !!state.editor.validationSolvable;
  state.editor.validationDensityMatch = recomputeAnalysis ? densityMatch(targetDensity, solutionCount) : !!state.editor.validationDensityMatch;
  state.editor.validationDecalPass = decalPass;

  return {
    level: state.editor.level,
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
    position: {
      progression: state.editor.progressionKey || null,
      slot: state.editor.progressionSlot || null
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

function setSessionLoading(active, label = "", current = 0, total = 0) {
  state.sessions.loading = { active, label, current, total };
  const wrap = document.getElementById("session-loading");
  const text = document.getElementById("session-loading-label");
  const value = document.getElementById("session-loading-value");
  const bar = document.getElementById("session-loading-bar");
  if (!wrap || !text || !value || !bar) return;
  wrap.hidden = !active;
  if (!active) {
    bar.value = 0;
    value.textContent = "";
    return;
  }
  const safeTotal = Math.max(total || 0, 1);
  const percent = Math.max(0, Math.min(100, Math.round((current / safeTotal) * 100)));
  text.textContent = label || "Loading play sessions...";
  value.textContent = total ? `${percent}%` : "Working...";
  bar.value = percent;
}

function updateManagerTable(options = {}) {
  const persistWorkspace = options.persistWorkspace !== false;
  const scheduleMetadata = options.scheduleMetadata !== false;
  const metadataReason = options.metadataReason || "manager_update";
  const renderCurve = options.renderCurve !== false;
  const renderEditorBuilder = options.renderEditorBuilder !== false;
  const plannerMode = options.plannerMode || "full";
  rebuildManagerIndexes();
  const tbody = document.querySelector("#mgr-table tbody");
  const slotPanel = document.getElementById("mgr-progression-panel");
  const allLevelsPanel = document.getElementById("mgr-all-levels-panel");
  const csvPanel = document.getElementById("mgr-csv-panel");
  const progressTitle = document.getElementById("mgr-progress-title");
  const listTitle = document.getElementById("mgr-list-title");
  const listCopy = document.getElementById("mgr-list-copy");
  renderManagerTabs();
  updateSessionProgressionSelect();
  if (slotPanel) slotPanel.hidden = !isManagerProgressionTab(state.manager.activeTab);
  if (allLevelsPanel) allLevelsPanel.hidden = !["allLevels", "extras", "discarded"].includes(state.manager.activeTab);
  if (csvPanel) csvPanel.hidden = state.manager.activeTab !== "csvReview";
  if (progressTitle && isManagerProgressionTab(state.manager.activeTab)) progressTitle.textContent = `${getManagerProgressionLabel(state.manager.activeTab)} Order`;
  if (listTitle) listTitle.textContent = state.manager.activeTab === "extras"
    ? "Extras"
    : state.manager.activeTab === "discarded"
    ? "Discarded Levels"
    : "All Levels";
  if (listCopy) listCopy.textContent = state.manager.activeTab === "extras"
    ? "Editorial bucket for levels intentionally kept outside the main curves."
    : state.manager.activeTab === "discarded"
    ? "Levels kept in the catalog but intentionally excluded from the normal progression flow."
    : "Levels that are not currently placed in any progression.";
  tbody.innerHTML = "";
  syncManagerFilterControls();

  const filteredItems = getFilteredManagerItems();
  if (!["allLevels", "extras", "discarded"].includes(state.manager.activeTab)) state.manager.allLevelsPage = 1;
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
  const activeProgressionLocked = isManagerProgressionTab(state.manager.activeTab) && isManagerProgressionLocked(state.manager.activeTab);
  const liveopsLockBtn = document.getElementById("mgr-toggle-liveops-lock");
  if (liveopsLockBtn) {
    liveopsLockBtn.disabled = !isManagerProgressionTab(state.manager.activeTab);
    liveopsLockBtn.textContent = activeProgressionLocked ? "Unlock Active LiveOps" : "Lock Active LiveOps";
    liveopsLockBtn.title = !isManagerProgressionTab(state.manager.activeTab)
      ? "Open a progression tab first."
      : activeProgressionLocked
      ? `Unlock ${getManagerProgressionLabel(state.manager.activeTab)} so it can be edited again.`
      : `Lock ${getManagerProgressionLabel(state.manager.activeTab)} so resets and clear actions cannot wipe it.`;
  }
  ["mgr-export-progression-csv", "mgr-export-curve-png", "mgr-export-progression-png"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !isManagerProgressionTab(state.manager.activeTab);
  });
  ["mgr-duplicate-progression"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !isManagerProgressionTab(state.manager.activeTab);
  });
  ["mgr-rename-progression", "mgr-add-slot", "mgr-remove-slot", "mgr-autofill"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !isManagerProgressionTab(state.manager.activeTab) || activeProgressionLocked;
  });
  updateSelectedManagerDiffPanel();
  if (renderCurve) renderManagerDifficultyCurve();
  if (renderEditorBuilder) updateEditorProgressionBuilder();
  if (plannerMode !== "none") updateManagerPlanner(plannerMode);
  updateManagerSpreadsheetEmbed();
  if (persistWorkspace) scheduleWorkspaceStatePersist();
  if (scheduleMetadata) scheduleManagerMetadataSnapshot(metadataReason);
}

function updateManagerSpreadsheetEmbed(options = {}) {
  const panel = document.getElementById("mgr-sheet-embed-panel");
  const iframe = document.getElementById("mgr-sheet-embed");
  const note = document.getElementById("mgr-sheet-embed-note");
  const openBtn = document.getElementById("mgr-sheet-open");
  if (!panel || !iframe || !note) return;

  const url = normalizeSpreadsheetEmbedUrl(state.settings.spreadsheetWebAppUrl, state.settings.spreadsheetId);
  if (!url) {
    panel.hidden = true;
    if (openBtn) openBtn.disabled = true;
    return;
  }

  panel.hidden = false;
  if (openBtn) openBtn.disabled = false;
  note.textContent = "If this is blank, Google Sheets likely needs File → Share → Publish to the web (embed). Use Open Spreadsheet as fallback.";

  const desired = url;
  const current = String(iframe.dataset.src || "");
  const forceReload = options.forceReload === true;
  if (forceReload || current !== desired) {
    iframe.dataset.src = desired;
    iframe.src = desired;
  }
}

function normalizeSpreadsheetEmbedUrl(rawUrl, spreadsheetId) {
  const url = String(rawUrl || "").trim();
  const id = String(spreadsheetId || "").trim();

  if (!url) {
    if (!id) return "";
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/pubhtml?widget=true&headers=false`;
  }

  // If user pasted a Google edit/share link, convert it to an embed-friendly `pubhtml` URL.
  if (url.includes("docs.google.com") && url.includes("/spreadsheets/")) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const extractedId = match?.[1] || id || "";
    const gidMatch = url.match(/[?#&]gid=([0-9]+)/);
    const gid = gidMatch?.[1] || "";
    if (!extractedId) return url;
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(extractedId)}/pubhtml?widget=true&headers=false${gid ? `&gid=${encodeURIComponent(gid)}` : ""}`;
  }

  return url;
}

function normalizeSpreadsheetOpenUrl(rawUrl, spreadsheetId) {
  const url = String(rawUrl || "").trim();
  const id = String(spreadsheetId || "").trim();

  if (url.includes("docs.google.com") && url.includes("/spreadsheets/")) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const extractedId = match?.[1] || id || "";
    const gidMatch = url.match(/[?#&]gid=([0-9]+)/);
    const gid = gidMatch?.[1] || "";
    if (!extractedId) return url;
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(extractedId)}/edit${gid ? `#gid=${encodeURIComponent(gid)}` : ""}`;
  }

  if (!url && id) return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/edit`;
  return url;
}

function makeManagerCard(item, compact = false, { slotDifficulty } = {}) {
  const effectiveDifficulty = slotDifficulty || levelDifficulty(item.level);
  const card = document.createElement("div");
  card.className = "manager-card";
  card.classList.add(`difficulty-${effectiveDifficulty.toLowerCase()}`);
  if (item.id === state.manager.selectedId) card.classList.add("selected-preview");
  if (state.manager.referenceIds.includes(item.id)) card.classList.add("reference-preview");
  const currentSlot = findManagerSlotIndex(item.id);
  const locked = !!(currentSlot && (
    getManagerProgression(currentSlot.tab).locked
    || getManagerProgression(currentSlot.tab).lockedSlots[currentSlot.index]
  ));
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
    if (state.manager.selectedId === item.id) return;
    state.manager.selectedId = item.id;
    refreshManagerCardSelectionStates();
  });
  card.title = "Drag this level to another slot or click to select it.";

  const title = document.createElement("div");
  title.className = "preview-title";
  title.textContent = compact ? `${levelLabel(item.level)} · ${item.file}` : item.file;
  card.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "preview-meta";
  meta.innerHTML = `
    <div class="meta-tag">
      <span class="meta-label">Grid</span>
      <span class="meta-value">${levelWidth(item.level)}×${levelHeight(item.level)}</span>
    </div>
    <div class="meta-tag">
      <span class="meta-label">Pairs</span>
      <span class="meta-value">${(item.level.pairs || []).length}</span>
    </div>
    <div class="meta-tag">
      <span class="meta-label">Moves</span>
      <span class="meta-value">${item.level.moves || "-"}</span>
    </div>
    <div class="meta-tag">
      <span class="meta-label">Difficulty</span>
      <span class="meta-value">${effectiveDifficulty}</span>
    </div>
    <div class="meta-tag">
      <span class="meta-label">Status</span>
      <span class="meta-value">${item.status}</span>
    </div>
    ${managerPlacementLabel(item.id) ? `<div class="meta-tag">
      <span class="meta-label">Slot</span>
      <span class="meta-value">${managerPlacementLabel(item.id)}</span>
    </div>` : ""}
  `;
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
    card.appendChild(createDeferredPreviewMount(item, item.id === state.manager.selectedId, {
      className: "editor-slot-thumb",
      mountClassName: "editor-slot-thumb-wrap",
      ariaLabel: `${item.file} preview`,
      size: 180,
      placeholderText: "Preview"
    }));
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
    ? `Assign this level to ${getManagerProgressionLabel(pendingRef.progressionKey)} · ${displaySlotLabel(pendingRef.slotIndex)}.`
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
      log("mgr-log", `Assigned ${item.file} to ${getManagerProgressionLabel(progressionKey)} · ${displaySlotLabel(slotIndex)}.`);
      return;
    }
    if (state.manager.referenceIds.includes(item.id)) {
      state.manager.referenceIds = state.manager.referenceIds.filter((id) => id !== item.id);
    } else {
      state.manager.referenceIds.push(item.id);
    }
    updateManagerTable({ persistWorkspace: false, scheduleMetadata: false });
  });
  actions.appendChild(refBtn);

  const discardBtn = document.createElement("button");
  if (isManagerDiscardedItem(item.id)) {
    discardBtn.textContent = "Restore";
    discardBtn.title = "Return this level from Discarded back to the normal pool without deleting it.";
    discardBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      removeManagerItemFromDiscarded(item.id);
      updateManagerTable();
      log("mgr-log", `Restored ${item.file} from Discarded.`);
    });
  } else {
    discardBtn.textContent = "Discard";
    discardBtn.title = "Keep this level saved in the catalog, but remove it from the normal progression flow.";
    discardBtn.disabled = locked || isTutorialManagerItem(item);
    discardBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      moveManagerItemToDiscarded(item.id);
      updateManagerTable();
      log("mgr-log", `Moved ${item.file} to Discarded.`);
    });
  }
  actions.appendChild(discardBtn);

  const poolBtn = document.createElement("button");
  if (isManagerExtraItem(item.id)) {
    poolBtn.textContent = "Remove Extra";
    poolBtn.title = "Remove this level from the Extras bucket and return it to the general pool.";
    poolBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      removeManagerItemFromExtras(item.id);
      updateManagerTable();
    });
  } else {
    poolBtn.textContent = "To Extras";
    poolBtn.title = "Move this level out of the main progression flow and into Extras.";
    poolBtn.disabled = locked;
    poolBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      moveManagerItemToExtras(item.id);
      updateManagerTable();
    });
  }
  actions.appendChild(poolBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete Level";
  deleteBtn.title = "Remove this level from the manager catalog and delete its saved JSON and screenshot when they exist.";
  deleteBtn.disabled = isTutorialManagerItem(item) || locked;
  deleteBtn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    const confirmed = window.confirm(`Delete ${item.file} from the catalog and remove its saved files?`);
    if (!confirmed) return;
    await deleteManagerItem(item.id);
  });
  actions.appendChild(deleteBtn);

  card.appendChild(actions);
  return card;
}

function updateManagerPlanner(mode = "full") {
  const slotGrid = document.getElementById("mgr-slot-grid");
  const poolGrid = document.getElementById("mgr-pool-grid");
  const unassignedGrid = document.getElementById("mgr-unassigned-grid");
  if (!slotGrid || !poolGrid || !unassignedGrid) return;
  const renderSlots = mode !== "pool";
  const renderPool = mode !== "slots";

  if (renderSlots) slotGrid.innerHTML = "";
  if (renderPool) {
    poolGrid.innerHTML = "";
    unassignedGrid.innerHTML = "";
  }
  const renderToken = ++state.manager.renderToken;

  if (renderSlots && isManagerProgressionTab(state.manager.activeTab)) {
    const progression = getManagerProgression(state.manager.activeTab);
    progression.slots.forEach((itemId, index) => {
      const isTutorialSlot = isTutorialSlotIndex(index);
      const slot = document.createElement("div");
      slot.className = "manager-slot";
      const slotDiff = progression.slotDifficulty[index] || (itemId != null ? levelDifficulty((getManagerItemById(itemId) || {}).level) : "");
      if (slotDiff) slot.classList.add("slot-" + slotDiff.toLowerCase());
      slot.dataset.slotIndex = String(index);
      slot.title = isTutorialSlot
        ? "Slot 0 is permanently reserved for the tutorial."
        : progression.locked
        ? `${getManagerProgressionLabel(state.manager.activeTab)} is locked. Unlock it before editing this liveops.`
        : progression.lockedSlots[index]
        ? `Level ${index} is locked. Unlock it before replacing the level.`
        : `Level ${index}. Drop a level here to place or reorder it.`;
      slot.addEventListener("dragover", (ev) => {
        if (isTutorialSlot || progression.locked) return;
        ev.preventDefault();
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", (ev) => {
        if (isTutorialSlot || progression.locked) return;
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
      slotLabel.textContent = displaySlotLabel(index);
      slot.appendChild(slotLabel);

      const slotActions = document.createElement("div");
      slotActions.className = "manager-slot-actions";

      const lockBtn = document.createElement("button");
      lockBtn.className = "manager-lock-btn";
      lockBtn.textContent = isTutorialSlot ? "Tutorial" : (progression.lockedSlots[index] ? "Unlock" : "Lock");
      lockBtn.disabled = isTutorialSlot || progression.locked;
      lockBtn.title = isTutorialSlot
        ? "Slot 0 stays locked because it always contains the tutorial."
        : progression.locked
        ? `Unlock ${getManagerProgressionLabel(state.manager.activeTab)} before changing slot locks.`
        : progression.lockedSlots[index]
        ? `Unlock level ${index} so it can be changed.`
        : `Lock level ${index} so its level cannot be moved or replaced.`;
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
      clearBtn.disabled = isTutorialSlot || progression.locked || progression.lockedSlots[index] || progression.slots[index] == null;
      clearBtn.title = isTutorialSlot
        ? "Slot 0 cannot be cleared because it always contains the tutorial."
        : progression.locked
        ? `Unlock ${getManagerProgressionLabel(state.manager.activeTab)} before clearing slots.`
        : progression.lockedSlots[index]
        ? `Unlock level ${index} before clearing it.`
        : `Empty level ${index} so you can drag another level in from below.`;
      clearBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        clearManagerSlot(index, state.manager.activeTab);
        updateManagerTable();
        log("mgr-log", `Cleared ${displaySlotLabel(index)} in ${getManagerProgressionLabel(state.manager.activeTab)}. Drag a replacement from the pool below.`);
      });
      slotActions.appendChild(clearBtn);

      const refSlotBtn = document.createElement("button");
      refSlotBtn.className = "manager-ref-slot-btn";
      refSlotBtn.textContent = state.manager.pendingRefTarget?.progressionKey === state.manager.activeTab && state.manager.pendingRefTarget?.slotIndex === index
        ? "Cancel Ref"
        : "Ref";
      refSlotBtn.disabled = isTutorialSlot || progression.locked || progression.lockedSlots[index];
      refSlotBtn.title = isTutorialSlot
        ? "Slot 0 is fixed as the tutorial and does not accept references."
        : progression.locked
        ? `Unlock ${getManagerProgressionLabel(state.manager.activeTab)} before assigning references.`
        : progression.lockedSlots[index]
        ? `Unlock level ${index} before assigning by reference.`
        : `Mark level ${index} as waiting for a level from All Levels.`;
      refSlotBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const isSame = state.manager.pendingRefTarget?.progressionKey === state.manager.activeTab && state.manager.pendingRefTarget?.slotIndex === index;
        state.manager.pendingRefTarget = isSame ? null : { progressionKey: state.manager.activeTab, slotIndex: index };
        updateManagerTable({ persistWorkspace: false, scheduleMetadata: false });
        log("mgr-log", isSame
          ? `Cancelled reference assignment for ${getManagerProgressionLabel(state.manager.activeTab)} · ${displaySlotLabel(index)}.`
          : `Waiting for a level from All Levels for ${getManagerProgressionLabel(state.manager.activeTab)} · ${displaySlotLabel(index)}.`);
      });
      slotActions.appendChild(refSlotBtn);
      slot.appendChild(slotActions);

      const difficultyWrap = document.createElement("label");
      difficultyWrap.className = "manager-slot-difficulty";
      difficultyWrap.textContent = "Difficulty";
      difficultyWrap.title = `Set the easy, medium, or hard label for ${displaySlotLabel(index)}.`;
      const difficultySelect = document.createElement("select");
      ["", "EASY", "MEDIUM", "HARD"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value || "Auto";
        difficultySelect.appendChild(option);
      });
      difficultySelect.value = progression.slotDifficulty[index] || "";
      difficultySelect.disabled = isTutorialSlot || progression.locked || progression.lockedSlots[index];
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
          : progression.locked
          ? `${getManagerProgressionLabel(state.manager.activeTab)} locked`
          : progression.lockedSlots[index]
          ? `Locked empty ${displaySlotLabel(index)}`
          : (isPendingRef ? "Waiting for Ref from All Levels" : `Empty ${displaySlotLabel(index)}. Drag a level here`);
        empty.title = isTutorialSlot
          ? "Slot 0 is permanently reserved for the tutorial."
          : progression.locked
          ? `${getManagerProgressionLabel(state.manager.activeTab)} is locked.`
          : progression.lockedSlots[index]
          ? `Level ${index} is empty but locked.`
          : (isPendingRef
            ? `This slot will accept the next Ref assignment from All Levels.`
            : `Drop a level here to assign it to ${displaySlotLabel(index)}.`);
        slot.appendChild(empty);
      } else {
        const item = getManagerItemById(itemId);
        if (item) slot.appendChild(makeManagerCard(item, true, { slotDifficulty: progression.slotDifficulty[index] }));
      }

      slotGrid.appendChild(slot);
    });
  }

  if (!renderPool) return;

  const basePoolItems = state.manager.activeTab === "extras"
    ? getManagerExtraItems()
    : state.manager.activeTab === "discarded"
    ? getManagerDiscardedItems()
    : getManagerUnassignedItems().filter((item) => !isManagerExtraItem(item.id) && !isManagerDiscardedItem(item.id));
  const poolItems = getFilteredManagerItems(basePoolItems);
  const progressionNames = getManagerProgressionKeys().map((key) => getManagerProgressionLabel(key)).join(", ");
  const poolTitle = state.manager.activeTab === "allLevels"
    ? `Levels that are not currently placed in ${progressionNames}.`
    : state.manager.activeTab === "extras"
    ? "Levels intentionally placed into Extras instead of the main progression curves."
    : state.manager.activeTab === "discarded"
    ? "Levels intentionally kept out of the progression flow without deleting them."
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

  const targetGrid = ["allLevels", "extras", "discarded"].includes(state.manager.activeTab) ? unassignedGrid : poolGrid;
  const pagedPoolItems = ["allLevels", "extras", "discarded"].includes(state.manager.activeTab)
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
    screenshotPath: "",
    level: cloneLevel(level),
    originalLevel: cloneLevel(level),
    changed: false,
    previewDataUrl: null,
    reviewStatus: "PENDING",
    validationStatus: validateLevel(level).valid ? "OK" : "INVALID",
    feedbackDecision: "",
    feedbackReasonCode: "",
    feedbackKeepTags: [],
    feedbackPairIds: [],
    feedbackNote: ""
  };
}

function getSelectedSessionItem() {
  return state.sessions.queue.find((item) => item.id === state.sessions.selectedId) || null;
}

function getSessionFeedbackItem() {
  return getSelectedSessionItem() || state.sessions.queue.find((item) => item.id === state.sessions.activeId) || null;
}

function sessionReviewSignalSummary(report) {
  if (!report?.valid) {
    return report?.solvable
      ? "Solved play is possible, but the board still fails validation."
      : "The board fails validation before quality review even begins.";
  }
  if (report.solutionCount <= 1) return "Valid board with a very tight solution space.";
  if (report.solutionCount <= 4) return "Valid board with controlled route pressure.";
  return "Valid board, but the solution space is comparatively open.";
}

function sessionReviewSignalGuidance(report) {
  if (!report?.valid) {
    return "Reject or edit before shipping. A solved run does not outweigh broken validation rules or layout issues.";
  }
  if (report.solutionCount >= 10) {
    return "Treat this as a tweak candidate if the slot should feel intentional or decisive. The board may be too permissive.";
  }
  if (report.solutionCount <= 1) {
    return "Check readability before keeping it. Tight boards can still feel unfair if the first read is noisy.";
  }
  return "Use readability, blocker purpose, and pair interference to decide whether this belongs in the progression.";
}

function renderSessionReviewSignal(root, item) {
  if (!root) return;
  if (!item) {
    root.className = "session-feedback-signal session-feedback-placeholder";
    root.textContent = "Select a session level to inspect validation, solution pressure, and the recommended review action.";
    return;
  }

  const report = validateLevel(item.level);
  const statusClass = report.valid ? "ok" : "invalid";
  const statusLabel = report.valid ? "OK" : "INVALID";
  const metrics = [
    `${levelWidth(item.level)}x${levelHeight(item.level)}`,
    `${(item.level?.pairs || []).length} pairs`,
    `${(item.level?.blockers || []).length} blockers`,
    `${Number(item.level?.moves ?? 0)} moves`,
    `${report.solutionCount} solutions`
  ].map((label) => `<span class="session-feedback-signal-chip">${escapeHtml(label)}</span>`).join("");
  const errorList = !report.valid && Array.isArray(report.errors) && report.errors.length
    ? `<ul class="session-feedback-signal-errors">${report.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`
    : "";

  root.className = "session-feedback-signal";
  root.innerHTML = `
    <div class="session-feedback-signal-head">
      <span class="session-feedback-signal-status ${statusClass}">${statusLabel}</span>
      <span class="session-feedback-signal-summary">${escapeHtml(sessionReviewSignalSummary(report))}</span>
    </div>
    <div class="session-feedback-signal-copy">${escapeHtml(sessionReviewSignalGuidance(report))}</div>
    <div class="session-feedback-signal-metrics">${metrics}</div>
    ${errorList}
  `;
}

function toggleSessionKeepTag(item, tag) {
  if (!item) return;
  const current = Array.isArray(item.feedbackKeepTags) ? [...item.feedbackKeepTags] : [];
  item.feedbackKeepTags = current.includes(tag)
    ? current.filter((value) => value !== tag)
    : [...current, tag];
}

function toggleSessionPairTag(item, pairId) {
  if (!item) return;
  const current = Array.isArray(item.feedbackPairIds) ? [...item.feedbackPairIds] : [];
  const normalized = String(pairId || "").toUpperCase();
  if (!normalized) return;
  item.feedbackPairIds = current.includes(normalized)
    ? current.filter((value) => value !== normalized)
    : [...current, normalized];
}

function sessionDecisionSummary(item) {
  if (!item) return "No level selected";
  if (item.feedbackDecision === "approve") {
    return item.feedbackKeepTags.length
      ? `Keep · ${item.feedbackKeepTags.map((tag) => keepReasonDisplayLabel(tag)).join(", ")}`
      : "Keep · no tags yet";
  }
  if (item.feedbackDecision === "reject") {
    return item.feedbackReasonCode
      ? `Reject · ${discardReasonDisplayLabel(item.feedbackReasonCode)}`
      : "Reject · no reason yet";
  }
  return item.reviewStatus || "PENDING";
}

function updateSessionFeedbackPanel() {
  const item = getSessionFeedbackItem();
  const target = document.getElementById("session-feedback-target");
  const signalRoot = document.getElementById("session-feedback-signal");
  const keepRoot = document.getElementById("session-keep-tags");
  const rejectRoot = document.getElementById("session-reject-tags");
  const pairsRoot = document.getElementById("session-feedback-pairs");
  const noteEl = document.getElementById("session-feedback-note");
  const approveBtn = document.getElementById("session-feedback-approve");
  const rejectBtn = document.getElementById("session-feedback-reject");
  if (!target || !signalRoot || !keepRoot || !rejectRoot || !pairsRoot || !noteEl || !approveBtn || !rejectBtn) return;

  keepRoot.innerHTML = "";
  rejectRoot.innerHTML = "";
  pairsRoot.innerHTML = "";

  if (!item) {
    target.textContent = "No level selected";
    renderSessionReviewSignal(signalRoot, null);
    noteEl.value = "";
    noteEl.disabled = true;
    approveBtn.disabled = true;
    rejectBtn.disabled = true;
    approveBtn.textContent = "Keep Level";
    rejectBtn.textContent = "Reject Level";
    const placeholder = document.createElement("div");
    placeholder.className = "session-feedback-placeholder";
    placeholder.textContent = "Select a session level to tag it.";
    keepRoot.appendChild(placeholder.cloneNode(true));
    rejectRoot.appendChild(placeholder.cloneNode(true));
    pairsRoot.appendChild(placeholder);
    return;
  }

  const report = validateLevel(item.level);
  target.textContent = `${item.file} · ${sessionDecisionSummary(item)}`;
  renderSessionReviewSignal(signalRoot, item);
  noteEl.disabled = false;
  noteEl.value = item.feedbackNote || "";
  approveBtn.disabled = false;
  rejectBtn.disabled = false;
  approveBtn.textContent = report.valid ? "Keep Level" : "Keep Anyway";
  rejectBtn.textContent = report.valid ? "Reject Level" : "Reject / Fix";

  KEEP_REASON_OPTIONS.forEach((option) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "procedural-discard-reason-chip";
    if ((item.feedbackKeepTags || []).includes(option.value)) chip.classList.add("keep-active");
    chip.textContent = option.label;
    chip.addEventListener("click", () => {
      item.feedbackDecision = "approve";
      item.feedbackReasonCode = "";
      toggleSessionKeepTag(item, option.value);
      updateSessionFeedbackPanel();
      persistWorkspaceState();
    });
    keepRoot.appendChild(chip);
  });

  DISCARD_REASON_OPTIONS.filter((option) => option.value).forEach((option) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "procedural-discard-reason-chip";
    if (item.feedbackDecision === "reject" && item.feedbackReasonCode === option.value) chip.classList.add("active");
    chip.textContent = option.label;
    chip.addEventListener("click", () => {
      item.feedbackDecision = "reject";
      item.feedbackReasonCode = option.value;
      item.feedbackKeepTags = [];
      updateSessionFeedbackPanel();
      persistWorkspaceState();
    });
    rejectRoot.appendChild(chip);
  });

  (item.level?.pairs || []).forEach((pair) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "procedural-pair-chip";
    if ((item.feedbackPairIds || []).includes(pair.id)) chip.classList.add("active");
    chip.textContent = pair.id;
    chip.addEventListener("click", () => {
      toggleSessionPairTag(item, pair.id);
      updateSessionFeedbackPanel();
      persistWorkspaceState();
    });
    pairsRoot.appendChild(chip);
  });
}

function updateEditorSessionLink() {
  updateEditorSaveStatus();
}

function drawLevelPreviewSolutionOverlay(ctx2, level, size) {
  const golden = level?.golden_path || {};
  Object.entries(golden).forEach(([pairId, cells]) => {
    if (!Array.isArray(cells) || cells.length < 2) return;
    const pairIndex = Math.max(0, PAIR_IDS.indexOf(pairId));
    ctx2.save();
    ctx2.strokeStyle = pairColors[pairIndex % pairColors.length];
    ctx2.lineWidth = Math.max(4, Math.round(size * 0.16));
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    ctx2.globalAlpha = 0.42;
    ctx2.setLineDash([Math.max(8, size * 0.18), Math.max(5, size * 0.1)]);
    ctx2.beginPath();
    cells.forEach((cell, index) => {
      const px = cell[1] * size + size / 2;
      const py = cell[0] * size + size / 2;
      if (index === 0) ctx2.moveTo(px, py); else ctx2.lineTo(px, py);
    });
    ctx2.stroke();
    ctx2.restore();
  });
}

function drawLevelPreviewCanvas(canvasEl, level, selected = false, options = {}) {
  const ctx2 = canvasEl.getContext("2d");
  const width = levelWidth(level) || 4;
  const height = levelHeight(level) || 4;
  const size = Math.floor(Math.min(canvasEl.width / width, canvasEl.height / height));
  const showSolution = options.showSolution === true;
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

  if (showSolution) drawLevelPreviewSolutionOverlay(ctx2, level, size);

  pairs.forEach((pair, index) => {
    const color = pair?.color || pairColors[index % pairColors.length];
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
  [...getManagerProgressionKeys(), "allLevels", "extras", "discarded", "csvReview"].forEach((tab) => {
    const btn = document.createElement("button");
    btn.className = "manager-tab-btn";
    if (tab === state.manager.activeTab) btn.classList.add("active");
    btn.dataset.tab = tab;
    const progression = isManagerProgressionTab(tab) ? getManagerProgression(tab) : null;
    const lockIcon = progression?.locked ? " 🔒" : "";
    btn.textContent = getManagerProgressionLabel(tab) + lockIcon;
    btn.title = `Open ${getManagerProgressionLabel(tab)}.${progression?.locked ? " (LOCKED)" : ""}`;
    btn.addEventListener("click", () => {
      state.manager.activeTab = tab;
      updateManagerTable({ persistWorkspace: false, scheduleMetadata: false });
    });
    tabs.appendChild(btn);
  });
}

function toggleActiveLiveopsLock() {
  if (!isManagerProgressionTab(state.manager.activeTab)) return;
  const progression = getManagerProgression(state.manager.activeTab);
  progression.locked = !progression.locked;
  if (progression.locked) state.manager.pendingRefTarget = null;
  updateManagerTable();
  log("mgr-log", progression.locked
    ? `Locked ${getManagerProgressionLabel(state.manager.activeTab)}. Manager clear and workspace reset will preserve this liveops.`
    : `Unlocked ${getManagerProgressionLabel(state.manager.activeTab)}. You can edit this liveops again.`);
}

function setStartupIntegrityBanner(result) {
  const root = document.getElementById("startup-integrity-banner");
  const title = document.getElementById("startup-integrity-title");
  const body = document.getElementById("startup-integrity-body");
  if (!root || !title || !body) return;
  if (!result) {
    root.hidden = true;
    root.classList.remove("warning", "ok");
    body.innerHTML = "";
    return;
  }
  root.hidden = false;
  root.classList.remove("warning", "ok");
  root.classList.add(result.missingCount > 0 ? "warning" : "ok");
  title.textContent = result.missingCount > 0 ? "Startup integrity warning" : "Startup integrity OK";
  if (result.missingCount > 0) {
    const preview = result.missing.slice(0, 8).map((entry) =>
      `<li><code>${escapeHtml(entry.path)}</code> <span>(${escapeHtml(entry.reason)})</span></li>`
    ).join("");
    body.innerHTML = `
      <div>${result.missingCount} required path(s) are missing from the current toolkit runtime. The full audit was saved to <code>${escapeHtml(displayProjectPath(result.reportPath || "reports/toolkit_startup_integrity.md"))}</code>.</div>
      <ul>${preview}</ul>
    `;
  } else {
    body.innerHTML = `<div>All checked presets and referenced level files resolved correctly. Audit saved to <code>${escapeHtml(displayProjectPath(result.reportPath || "reports/toolkit_startup_integrity.md"))}</code>.</div>`;
  }
}

function updateSessionProgressionSelect() {
  const select = document.getElementById("session-progression-select");
  if (!select) return;
  const progressionKeys = getManagerProgressionKeys();
  const signature = JSON.stringify(progressionKeys.map((key) => [key, getManagerProgressionLabel(key)]));
  const previous = select.value;
  if (signature !== lastSessionProgressionSelectSignature) {
    select.innerHTML = "";
    progressionKeys.forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = getManagerProgressionLabel(key);
      select.appendChild(option);
    });
    lastSessionProgressionSelectSignature = signature;
  }
  if (previous && progressionKeys.includes(previous)) select.value = previous;
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
    log("mgr-log", `Created ${label} with the tutorial preloaded in slot 0.`);
  }).catch((err) => {
    updateManagerTable();
    log("mgr-log", `Created ${label}, but tutorial preload failed: ${formatParseError(err)}`);
  });
}

function renameActiveProgression() {
  if (!isManagerProgressionTab(state.manager.activeTab)) return;
  if (!ensureManagerProgressionUnlocked(state.manager.activeTab)) return;
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
    slotDifficulty: [...source.slotDifficulty],
    locked: false
  };
  state.manager.progressions[key].slots[0] = null;
  state.manager.progressions[key].lockedSlots[0] = false;
  state.manager.progressions[key].slotDifficulty[0] = "";
  state.manager.progressionOrder.push(key);
  state.manager.activeTab = key;
  ensureTutorialInProgressionSlot(key).then(() => {
    updateManagerTable();
    log("mgr-log", `Duplicated ${source.label} into ${label} with the tutorial preserved in slot 0.`);
  }).catch((err) => {
    updateManagerTable();
    log("mgr-log", `Duplicated ${source.label} into ${label}, but tutorial preload failed: ${formatParseError(err)}`);
  });
}

function addSlotToActiveProgression() {
  if (!isManagerProgressionTab(state.manager.activeTab)) return;
  if (!ensureManagerProgressionUnlocked(state.manager.activeTab)) return;
  const progression = getManagerProgression(state.manager.activeTab);
  progression.slots.push(null);
  progression.lockedSlots.push(false);
  progression.slotDifficulty.push("");
  updateManagerTable();
  updateEditorProgressionBuilder();
  log("mgr-log", `Added ${displaySlotLabel(progression.slots.length - 1)} to ${getManagerProgressionLabel(state.manager.activeTab)}.`);
}

function removeLastSlotFromActiveProgression() {
  if (!isManagerProgressionTab(state.manager.activeTab)) return;
  if (!ensureManagerProgressionUnlocked(state.manager.activeTab)) return;
  const progression = getManagerProgression(state.manager.activeTab);
  if (progression.slots.length <= MANAGER_SLOT_COUNT) {
    log("mgr-log", `Cannot remove slots below the default ${MANAGER_SLOT_COUNT}-slot layout.`);
    return;
  }
  const slotIndex = progression.slots.length - 1;
  const displacedId = progression.slots[slotIndex];
  if (displacedId != null) moveManagerItemToPool(displacedId);
  progression.slots.pop();
  progression.lockedSlots.pop();
  progression.slotDifficulty.pop();
  if (state.editor.progressionKey === state.manager.activeTab) {
    state.editor.progressionSlot = Math.min(state.editor.progressionSlot || FIRST_PLAYABLE_SLOT_INDEX, progressionMaxPlayableSlotIndex(progression));
  }
  updateManagerTable();
  updateEditorProgressionBuilder();
  log("mgr-log", `Removed ${displaySlotLabel(slotIndex)} from ${getManagerProgressionLabel(state.manager.activeTab)}.`);
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
  const targetLevelNumber = slotNumberFromIndex(slotIndex);
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
  if (!ensureManagerProgressionUnlocked(state.manager.activeTab)) return;
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
  if (isCanonicalLevelPayload(data) || isGridSizeLevelPayload(data)) {
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
      const tutorialItem = normalizeTutorialManagerItem(
        summarizeManagerItem(toPlayableLevel(data.tutorial_level, `${data.name || fileName}_tutorial`), TUTORIAL_LEVEL_BASENAME, `Bundle tutorial · ${fileName}`),
        `Bundle tutorial · ${fileName}`
      );
      expanded.push({
        item: tutorialItem,
        slot: inferredTab ? 0 : null,
        tab: inferredTab
      });
    }
    for (const slot of data.slots || []) {
      if (progressionConfigEntryIsTutorial(slot)) continue;
      if (!slot?.level) continue;
      expanded.push({
        item: summarizeManagerItem(toPlayableLevel(slot.level, `${data.name || fileName}_slot_${slot.slot}`), `${basename(fileName)} · slot ${slot.slot}`, `Embedded bundle level · ${fileName}`),
        slot: inferredTab && Number.isFinite(slot.slot) ? Number(slot.slot) : null,
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
      const tutorialItem = normalizeTutorialManagerItem(
        summarizeManagerItem(tutorialLevel, TUTORIAL_LEVEL_BASENAME, `Referenced tutorial · ${data.tutorial_level_file}`),
        `Referenced tutorial · ${data.tutorial_level_file}`
      );
      expanded.push({
        item: tutorialItem,
        slot: inferredTab ? 0 : null,
        tab: inferredTab
      });
    }
    for (const slot of data.slots || []) {
      if (progressionConfigEntryIsTutorial(slot)) continue;
      if (!slot?.level_file) continue;
      const level = await fetchWorkshopLevelByFilename(slot.level_file);
      expanded.push({
        item: summarizeManagerItem(level, `${basename(fileName)} · slot ${slot.slot}`, `Referenced level · ${slot.level_file}`),
        slot: inferredTab && Number.isFinite(slot.slot) ? Number(slot.slot) : null,
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
    let item = entry.item;
    if (isTutorialManagerItem(item)) {
      item = normalizeTutorialManagerItem(item, item.sourcePath || "Tutorial slot");
      const existing = getCanonicalTutorialManagerItem();
      if (existing) {
        existing.level = cloneLevel(item.level);
        existing.originalLevel = cloneLevel(item.originalLevel || item.level);
        normalizeTutorialManagerItem(existing, item.sourcePath || "Tutorial slot");
        item = existing;
      } else {
        state.manager.items.push(item);
      }
    } else {
      state.manager.items.push(item);
    }
    const targetProgression = entry.tab ? getManagerProgression(entry.tab) : null;
    if (targetProgression?.locked) continue;
    if (entry.tab && Number.isInteger(entry.slot) && entry.slot >= 0 && entry.slot < getManagerProgression(entry.tab).slots.length && isTutorialSlotIndex(entry.slot) && isTutorialManagerItem(item)) {
      getManagerProgression(entry.tab).slots[entry.slot] = item.id;
      getManagerProgression(entry.tab).lockedSlots[entry.slot] = true;
      getManagerProgression(entry.tab).slotDifficulty[entry.slot] = levelDifficulty(item.level);
    } else if (entry.tab && Number.isInteger(entry.slot) && entry.slot >= 0 && entry.slot < getManagerProgression(entry.tab).slots.length && !isTutorialSlotIndex(entry.slot) && !getManagerProgression(entry.tab).lockedSlots[entry.slot] && getManagerProgression(entry.tab).slots[entry.slot] == null) {
      getManagerProgression(entry.tab).slots[entry.slot] = item.id;
      if (!getManagerProgression(entry.tab).slotDifficulty[entry.slot]) {
        getManagerProgression(entry.tab).slotDifficulty[entry.slot] = levelDifficulty(item.level);
      } else {
        applyDifficultyToManagerItem(item, getManagerProgression(entry.tab).slotDifficulty[entry.slot]);
      }
    } else {
      assignManagerItemToNextSlot(item.id, entry.tab || state.manager.activeTab);
    }
  }
  dedupeTutorialManagerItems();
}

function managerPlacementLabel(itemId) {
  if (isManagerDiscardedItem(itemId)) return "Discarded";
  if (isManagerExtraItem(itemId)) return "Extras";
  for (const key of getManagerProgressionKeys()) {
    const slotIndex = getManagerProgression(key).slots.findIndex((id) => id === itemId);
    if (slotIndex >= 0) return `${getManagerProgressionLabel(key)} · ${displaySlotLabel(slotIndex)}`;
  }
  return "Unassigned";
}

function buildManagerMetadataSnapshot(reason = "autosave") {
  const progressions = Object.fromEntries(getManagerProgressionKeys().map((key) => {
    const progression = getManagerProgression(key);
    return [key, {
      label: getManagerProgressionLabel(key),
      progression_locked: !!progression.locked,
      slots: progression.slots.map((itemId, index) => {
        const item = itemId != null ? getManagerItemById(itemId) : null;
        return {
          slot: slotNumberFromIndex(index),
          item_id: itemId,
          file: item?.file || "",
          level: item ? levelTier(item.level) : null,
          level_id: item?.level ? levelLabel(item.level, item.file || "") : "",
          level_file: item?.savedPath ? projectRelativePath(item.savedPath) : "",
          board: item ? `${levelWidth(item.level)}x${levelHeight(item.level)}` : "",
          pairs: item ? (item.level.pairs || []).length : 0,
          blockers: item ? (item.level.blockers || []).length : 0,
          moves: item?.level?.moves ?? null,
          solutions: item?.level ? levelSolutionCount(item.level) : null,
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
    level: item.level ? levelTier(item.level) : null,
    level_id: item.level ? levelLabel(item.level, item.file || "") : "",
    level_file: item.savedPath ? projectRelativePath(item.savedPath) : "",
    board: item.level ? `${levelWidth(item.level)}x${levelHeight(item.level)}` : "",
    pairs: item.level ? (item.level.pairs || []).length : 0,
    blockers: item.level ? (item.level.blockers || []).length : 0,
    moves: item.level?.moves ?? null,
    solutions: item.level ? levelSolutionCount(item.level) : null,
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
      extra_items: getManagerExtraItems().length,
      discarded_items: getManagerDiscardedItems().length,
      valid_items: state.manager.items.filter((item) => item.status === "OK").length,
      invalid_items: state.manager.items.filter((item) => item.status === "INVALID").length,
      parse_error_items: state.manager.items.filter((item) => item.status === "PARSE_ERROR").length
    },
    extra_item_ids: [...(state.manager.extraIds || [])],
    discarded_item_ids: [...(state.manager.discardedIds || [])],
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
    extra_item_ids: snapshot.extra_item_ids,
    progressions: snapshot.progressions,
    items: snapshot.items
  });
  if (signature === lastManagerMetadataSignature) return;
  lastManagerMetadataSignature = signature;
  await saveRepoFile("progressions/manager_state/level_manager_state.json", JSON.stringify(snapshot, null, 2));
  await materializeManagerProgressionsToRepo();
  await saveRepoFile(CANONICAL_STATE_PATHS.managerMetadata, JSON.stringify({
    saved_at: snapshot.saved_at,
    reason: snapshot.reason,
    active_tab: snapshot.active_tab,
    selected_id: snapshot.selected_id,
    counts: snapshot.counts,
    progression_order: snapshot.progression_order,
    filters: snapshot.filters
  }, null, 2));
  scheduleSpreadsheetSync(reason);
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
  if (progression?.locked) return;
  const freeIndex = progression.slots.findIndex((slot, index) => index >= FIRST_PLAYABLE_SLOT_INDEX && slot == null && !progression.lockedSlots[index]);
  if (freeIndex >= 0) {
    removeManagerItemFromExtras(itemId);
    removeManagerItemFromDiscarded(itemId);
    progression.slots[freeIndex] = itemId;
    const item = getManagerItemById(itemId);
    if (!progression.slotDifficulty[freeIndex]) progression.slotDifficulty[freeIndex] = item ? levelDifficulty(item.level) : "";
    else applyDifficultyToManagerItem(item, progression.slotDifficulty[freeIndex]);
  }
}

function moveManagerItemToSlot(itemId, slotIndex, tab = state.manager.activeTab) {
  const progression = getManagerProgression(tab);
  if (progression?.locked) {
    logManagerProgressionLocked(tab);
    return;
  }
  if (!isManagerProgressionTab(tab)) return;
  const target = getManagerProgression(tab);
  if (slotIndex < 0 || slotIndex >= target.slots.length) return;
  if (isTutorialSlotIndex(slotIndex)) return;
  if (target.lockedSlots[slotIndex]) return;
  const currentSlot = findManagerSlotIndex(itemId);
  if (currentSlot && isTutorialSlotIndex(currentSlot.index)) return;
  if (currentSlot && isManagerProgressionLocked(currentSlot.tab)) {
    logManagerProgressionLocked(currentSlot.tab);
    return;
  }
  if (currentSlot && getManagerProgression(currentSlot.tab).lockedSlots[currentSlot.index]) return;
  const displacedId = target.slots[slotIndex];
  if (displacedId != null) {
    const displacedSlot = findManagerSlotIndex(displacedId);
    if (displacedSlot && isTutorialSlotIndex(displacedSlot.index) && displacedId !== itemId) return;
    if (displacedSlot && getManagerProgression(displacedSlot.tab).lockedSlots[displacedSlot.index] && displacedId !== itemId) return;
  }

  if (currentSlot && currentSlot.tab === tab && currentSlot.index === slotIndex) return;

  removeManagerItemFromExtras(itemId);
  removeManagerItemFromDiscarded(itemId);
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
  if (currentSlot && isManagerProgressionLocked(currentSlot.tab)) {
    logManagerProgressionLocked(currentSlot.tab);
    return;
  }
  if (currentSlot && getManagerProgression(currentSlot.tab).lockedSlots[currentSlot.index]) return;
  if (currentSlot) getManagerProgression(currentSlot.tab).slots[currentSlot.index] = null;
  removeManagerItemFromExtras(itemId);
  removeManagerItemFromDiscarded(itemId);
}

function moveManagerItemToExtras(itemId) {
  moveManagerItemToPool(itemId);
  addManagerItemToExtras(itemId);
}

function moveManagerItemToDiscarded(itemId) {
  moveManagerItemToPool(itemId);
  addManagerItemToDiscarded(itemId);
}

function clearManagerSlot(slotIndex, tab = state.manager.activeTab) {
  if (!isManagerProgressionTab(tab)) return;
  if (isTutorialSlotIndex(slotIndex)) return;
  const progression = getManagerProgression(tab);
  if (progression.locked) {
    logManagerProgressionLocked(tab);
    return;
  }
  if (slotIndex < 0 || slotIndex >= progression.slots.length) return;
  if (progression.lockedSlots[slotIndex]) return;
  progression.slots[slotIndex] = null;
}

async function deleteManagerItem(itemId) {
  const item = getManagerItemById(itemId);
  if (!item) return;
  if (isTutorialManagerItem(item)) {
    log("mgr-log", "Tutorial items cannot be deleted.");
    return;
  }
  const currentSlot = findManagerSlotIndex(itemId);
  if (currentSlot && isManagerProgressionLocked(currentSlot.tab)) {
    logManagerProgressionLocked(currentSlot.tab);
    return;
  }
  if (currentSlot && getManagerProgression(currentSlot.tab).lockedSlots[currentSlot.index]) {
    log("mgr-log", "Locked slot item cannot be deleted.");
    return;
  }
  const filesToDelete = new Set();
  [item.savedPath, item.screenshotPath, item.sourcePath].forEach((value) => {
    const text = String(value || "").trim();
    if (!text || !text.startsWith(PROJECT_ROOT)) return;
    filesToDelete.add(projectRelativePath(text));
  });
  for (const key of getManagerProgressionKeys()) {
    const progression = getManagerProgression(key);
    progression.slots = progression.slots.map((id) => (id === itemId ? null : id));
  }
  removeManagerItemFromExtras(itemId);
  removeManagerItemFromDiscarded(itemId);
  state.manager.referenceIds = state.manager.referenceIds.filter((id) => id !== itemId);
  state.manager.items = state.manager.items.filter((entry) => entry.id !== itemId);
  if (state.manager.selectedId === itemId) state.manager.selectedId = null;
  if (state.editor.link?.sourceType === "manager" && state.editor.link.sourceId === itemId) {
    setEditorLink("standalone", null, "Standalone level");
  }
  for (const relativePath of filesToDelete) {
    try {
      await deleteRepoFile(relativePath);
    } catch (err) {
      log("mgr-log", `Deleted level from catalog, but file delete failed for ${relativePath}: ${formatParseError(err)}`);
    }
  }
  updateManagerTable();
  updateEditorProgressionBuilder();
  log("mgr-log", `Deleted ${item.file} from the manager catalog${filesToDelete.size ? " and removed its saved files" : ""}.`);
}

function updateSessionPreviewGrid() {
  const startedAt = performance.now();
  const grid = document.getElementById("session-preview-grid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!state.sessions.queue.length) {
    setSessionLoading(false);
    logSessionPerf("updateSessionPreviewGrid", startedAt, "empty queue", { force: true });
    return;
  }

  setSessionLoading(true, "Rendering play session previews...", 0, state.sessions.queue.length);

  state.sessions.queue.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "preview-card session-preview-card";
    if (item.id === state.sessions.selectedId) card.classList.add("selected-preview");
    if (item.id === state.sessions.activeId) card.classList.add("active-preview");
    card.addEventListener("click", () => {
      state.sessions.selectedId = item.id;
      updateSessionTable();
      log("session-log", `Selected ${item.file} (${item.reviewStatus}, ${item.validationStatus}).`);
    });
    card.title = "Click to select this session level. Use the buttons below it to play, edit, approve, or reject.";

    const title = document.createElement("div");
    title.className = "preview-title session-card-title";
    title.textContent = item.file;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "preview-meta session-card-meta";
    meta.textContent = `${levelLabel(item.level)} · ${levelWidth(item.level)}x${levelHeight(item.level)} · ${item.reviewStatus} · ${item.validationStatus}`;
    card.appendChild(meta);

    const boardFrame = document.createElement("div");
    boardFrame.className = "session-card-board";

    if (shouldRenderSessionPreviews()) {
      boardFrame.appendChild(createDeferredPreviewMount(item, item.id === state.sessions.selectedId, {
        className: "editor-slot-thumb",
        mountClassName: "editor-slot-thumb-wrap",
        ariaLabel: `${item.file} preview`,
        size: 180,
        placeholderText: "Preview"
      }));
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
    setSessionLoading(true, "Rendering play session previews...", index + 1, state.sessions.queue.length);
  });
  setSessionLoading(false);
  logSessionPerf("updateSessionPreviewGrid", startedAt, `${state.sessions.queue.length} cards`);
}

function updateSessionTable() {
  const startedAt = performance.now();
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

    [item.source, item.file, levelLabel(item.level), `${levelWidth(item.level)}x${levelHeight(item.level)}`, item.level.pairs.length, item.level.moves ?? "-", levelSolutionCount(item.level), item.reviewStatus, item.validationStatus].forEach((value, index) => {
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
  updateSessionFeedbackPanel();
  updateEditorSessionLink();
  persistWorkspaceState();
  logSessionPerf("updateSessionTable", startedAt, `${rows.length} rows`);
}

function queueSessionLevel(level, file, source = "imported", options = {}) {
  const item = summarizeSessionLevel(level, file, source);
  item.managerItemId = options.managerItemId ?? null;
  item.savedPath = options.savedPath || "";
  item.screenshotPath = options.screenshotPath || "";
  state.sessions.queue.push(item);
  if (state.sessions.selectedId == null) state.sessions.selectedId = item.id;
  if (!options.deferRender) updateSessionTable();
  return item;
}

function sortedProceduralManagerItems() {
  return state.manager.items
    .filter((item) => /^procedular_reference_large_\d+\.json$/i.test(String(item.file || "")))
    .slice()
    .sort((left, right) => {
      const leftNum = Number((String(left.file || "").match(/(\d+)\.json$/) || [0, 0])[1]);
      const rightNum = Number((String(right.file || "").match(/(\d+)\.json$/) || [0, 0])[1]);
      return leftNum - rightNum;
    });
}

function loadProgressionIntoSessions(key) {
  const startedAt = performance.now();
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
  setSessionLoading(true, `Loading ${getManagerProgressionLabel(key)} into Play Sessions...`, 0, items.length);
  state.sessions.queue = [];
  state.sessions.selectedId = null;
  state.sessions.activeId = null;
  items.forEach((item, index) => {
    queueSessionLevel(cloneLevel(item.level), `${getManagerProgressionLabel(key)} · ${displaySlotLabel(index)}`, getManagerProgressionLabel(key), {
      managerItemId: item.id,
      savedPath: item.savedPath || "",
      screenshotPath: item.screenshotPath || "",
      deferRender: true
    });
    setSessionLoading(true, `Loading ${getManagerProgressionLabel(key)} into Play Sessions...`, index + 1, items.length);
  });
  const first = state.sessions.queue[0];
  if (first) state.sessions.selectedId = first.id;
  state.play.on = false;
  state.sessions.activeId = null;
  setPlayStatus("Play OFF");
  updateSessionTable();
  setSessionLoading(false);
  const duration = logSessionPerf("loadProgressionIntoSessions", startedAt, `${items.length} levels from ${getManagerProgressionLabel(key)}`, { force: true });
  log("session-log", `Loaded ${items.length} level(s) from ${getManagerProgressionLabel(key)} in ${duration.toFixed(1)}ms.`);
  return true;
}

function loadProceduralPackIntoSessions() {
  const startedAt = performance.now();
  const items = sortedProceduralManagerItems();
  if (!items.length) {
    log("session-log", "No procedural levels found in the manager catalog.");
    return false;
  }
  setSessionLoading(true, "Loading Procedural 100 into Play Sessions...", 0, items.length);
  state.sessions.queue = [];
  state.sessions.selectedId = null;
  state.sessions.activeId = null;
  state.sessions.editingId = null;
  items.forEach((item, index) => {
    const serial = Number((String(item.file || "").match(/(\d+)\.json$/) || [0, index + 1])[1]);
    queueSessionLevel(cloneLevel(item.level), `Procedural 100 · Level ${serial}`, "Procedural 100", {
      managerItemId: item.id,
      savedPath: item.savedPath || "",
      screenshotPath: item.screenshotPath || "",
      deferRender: true
    });
    setSessionLoading(true, "Loading Procedural 100 into Play Sessions...", index + 1, items.length);
  });
  const first = state.sessions.queue[0];
  if (first) state.sessions.selectedId = first.id;
  state.play.on = false;
  state.sessions.activeId = null;
  setPlayStatus("Play OFF");
  updateSessionTable();
  setSessionLoading(false);
  const duration = logSessionPerf("loadProceduralPackIntoSessions", startedAt, `${items.length} levels`, { force: true });
  log("session-log", `Loaded ${items.length} procedural level(s) into Play Sessions in ${duration.toFixed(1)}ms.`);
  return true;
}

function buildSessionFeedbackPayload(item) {
  const normalizedPairIds = normalizeDiscardPairIds((item.feedbackPairIds || []).join(","), item.level);
  const noteText = String(item.feedbackNote || "").trim();
  return {
    sent_at: new Date().toISOString(),
    source: item.source || "",
    file: item.file || "",
    manager_item_id: item.managerItemId ?? null,
    saved_path: item.savedPath || "",
    screenshot_path: item.screenshotPath || "",
    review_status: item.reviewStatus || "PENDING",
    validation_status: item.validationStatus || "",
    decision: item.feedbackDecision || "",
    reason_code: item.feedbackReasonCode || "",
    keep_tags: Array.isArray(item.feedbackKeepTags) ? [...item.feedbackKeepTags] : [],
    pair_ids: normalizedPairIds,
    note_text: noteText,
    inferred_tags: inferLearningTags(item.feedbackReasonCode || "", noteText, item.feedbackKeepTags || []),
    level_id: levelLabel(item.level, item.file || ""),
    level_number: levelTier(item.level),
    board: `${levelWidth(item.level)}x${levelHeight(item.level)}`,
    pairs: (item.level?.pairs || []).length,
    blockers: (item.level?.blockers || []).length,
    moves: Number(item.level?.moves || 0),
    solutions: levelSolutionCount(item.level)
  };
}

async function sendSessionFeedback(item) {
  if (!item) {
    log("session-log", "Select a level first.");
    return false;
  }
  const payload = buildSessionFeedbackPayload(item);
  try {
    const response = await fetch("/api/append-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        relativePath: "reports/session_feedback_inbox.ndjson",
        content: `${JSON.stringify(payload)}\n`
      })
    });
    const result = await response.json();
    if (!result.ok) {
      log("session-log", `Error sending feedback: ${result.error}`);
      return false;
    }
  } catch (err) {
    log("session-log", `Error sending feedback: ${err.message}`);
    return false;
  }
  const lastSent = document.getElementById("session-feedback-last-sent");
  if (lastSent) lastSent.textContent = `Sent ${payload.file} at ${new Date(payload.sent_at).toLocaleTimeString()}.`;
  persistWorkspaceState();
  log("session-log", `Sent feedback for ${item.file}.`);
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
  const startedAt = performance.now();
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
  const duration = logSessionPerf("playSessionItem", startedAt, item.file, { force: true });
  log("session-log", `Loaded session level ${item.file} for play in ${duration.toFixed(1)}ms.`);
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
  const normalizedPairIds = normalizeDiscardPairIds((item.feedbackPairIds || []).join(","), item.level);
  const feedbackNote = String(item.feedbackNote || "").trim();
  const extra = decision === "reject"
    ? {
      reason_code: item.feedbackReasonCode || classifyDiscardReason(feedbackNote),
      reason_text: composeDiscardReasonText(item.feedbackReasonCode || classifyDiscardReason(feedbackNote), feedbackNote),
      pair_ids: normalizedPairIds,
      pair_feedback: extractPairFeedback(item.level, normalizedPairIds),
      note_text: feedbackNote
    }
    : {
      keep_tags: Array.isArray(item.feedbackKeepTags) ? [...item.feedbackKeepTags] : [],
      keep_text: composeKeepReasonText(item.feedbackKeepTags, feedbackNote),
      pair_ids: normalizedPairIds,
      pair_feedback: extractPairFeedback(item.level, normalizedPairIds),
      note_text: feedbackNote
    };
  recordLearningDecision(item.level, decision, `session:${item.file}`, extra);
  item.feedbackDecision = decision;
  if (decision === "reject" && !item.feedbackReasonCode) item.feedbackReasonCode = extra.reason_code;
  if (decision === "approve") item.feedbackReasonCode = "";
  item.reviewStatus = decision === "approve" ? "APPROVED" : "REJECTED";
  if (item.managerItemId) {
    const managerItem = getManagerItemById(item.managerItemId);
    if (managerItem) {
      managerItem.notes = decision === "reject"
        ? (managerItem.notes ? `${managerItem.notes} | Rejected in Play Sessions: ${extra.reason_text || extra.reason_code || "feedback added"}` : `Rejected in Play Sessions: ${extra.reason_text || extra.reason_code || "feedback added"}`)
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

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashStringSeed(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function formatDurationSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "n/a";
  if (seconds >= 90) return `${(seconds / 60).toFixed(1)}m`;
  return `${seconds.toFixed(1)}s`;
}

function solutionSignature(solution) {
  return Object.entries(solution || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([pairId, cells]) => `${pairId}:${levelPathDirections(cells)}`)
    .join(" | ");
}

function summarizeSolutionSamples(level, cap = 4) {
  const width = levelWidth(level);
  const height = levelHeight(level);
  const pairs = Array.isArray(level?.pairs) ? level.pairs : [];
  const blockers = Array.isArray(level?.blockers) ? level.blockers : [];
  const sampleSolutions = findSampleSolutions(width, height, pairs, blockers, cap);
  const signatures = sampleSolutions.map((solution) => solutionSignature(solution));
  const uniqueSignatures = new Set(signatures);
  const shapeSummaries = sampleSolutions.map((solution, index) => {
    const tempLevel = { ...level, golden_path: solution };
    const signals = levelPathStraightnessSignals(tempLevel);
    const byPair = Object.entries(solution)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([pairId, cells]) => `${pairId}: ${levelPathDirections(cells)}`)
      .join("\n");
    return {
      label: `Solution ${index + 1}`,
      signature: signatures[index],
      straightness: signals.straightness,
      excessBendsPerPair: signals.excessBendsPerPair,
      text: byPair
    };
  });
  const diversity = sampleSolutions.length
    ? uniqueSignatures.size / sampleSolutions.length
    : 0;
  const ambiguityScore = clampNumber(
    ((Math.min(12, levelSolutionCount(level)) / 12) * 0.65) + (diversity * 0.35),
    0,
    1
  );
  return {
    sampleCount: sampleSolutions.length,
    uniqueSampleCount: uniqueSignatures.size,
    diversity,
    ambiguityScore,
    shapeSummaries
  };
}

function vitoBotProfileConfig(profile, intelligence) {
  const normalizedIntel = clampNumber(Number(intelligence || 55), 5, 95);
  const base = {
    novice: { skillBase: 28, speedFactor: 1.35, errorBias: 2.7 },
    average: { skillBase: 50, speedFactor: 1.0, errorBias: 1.6 },
    focused: { skillBase: 63, speedFactor: 0.92, errorBias: 1.0 },
    expert: { skillBase: 78, speedFactor: 0.82, errorBias: 0.5 }
  }[String(profile || "average")] || { skillBase: 50, speedFactor: 1.0, errorBias: 1.6 };
  return {
    ...base,
    skill: clampNumber(base.skillBase + (normalizedIntel - 50) * 0.7, 10, 99)
  };
}

function vitoBotPersonaConfig(persona) {
  return {
    balanced: {
      key: "balanced",
      label: "Balanced",
      clarityWeight: 1.0,
      ambiguityTolerance: 0.55,
      invalidSensitivity: 1.0,
      restartTolerance: 1.0,
      explorationBias: 0.55,
      speedModifier: 1.0
    },
    cautious: {
      key: "cautious",
      label: "Cautious",
      clarityWeight: 1.18,
      ambiguityTolerance: 0.22,
      invalidSensitivity: 1.28,
      restartTolerance: 0.72,
      explorationBias: 0.28,
      speedModifier: 1.08
    },
    explorer: {
      key: "explorer",
      label: "Explorer",
      clarityWeight: 0.92,
      ambiguityTolerance: 0.9,
      invalidSensitivity: 0.88,
      restartTolerance: 1.2,
      explorationBias: 1.18,
      speedModifier: 1.12
    },
    perfectionist: {
      key: "perfectionist",
      label: "Perfectionist",
      clarityWeight: 1.26,
      ambiguityTolerance: 0.3,
      invalidSensitivity: 1.12,
      restartTolerance: 0.84,
      explorationBias: 0.35,
      speedModifier: 0.96
    },
    speedrunner: {
      key: "speedrunner",
      label: "Speedrunner",
      clarityWeight: 0.86,
      ambiguityTolerance: 0.48,
      invalidSensitivity: 0.92,
      restartTolerance: 0.7,
      explorationBias: 0.26,
      speedModifier: 0.82
    }
  }[String(persona || "balanced")] || {
    key: "balanced",
    label: "Balanced",
    clarityWeight: 1.0,
    ambiguityTolerance: 0.55,
    invalidSensitivity: 1.0,
    restartTolerance: 1.0,
    explorationBias: 0.55,
    speedModifier: 1.0
  };
}

function buildVitoBotLevelModel(level) {
  const report = validateLevel(level);
  const signals = extractMechanicSignals(level);
  const guide = analyzeSolutionGuide(level);
  const solutionSummary = summarizeSolutionSamples(level, 4);
  return {
    level,
    report,
    signals,
    guide,
    solutionSummary,
    boardArea: levelWidth(level) * levelHeight(level),
    pairCount: Array.isArray(level?.pairs) ? level.pairs.length : 0,
    blockerCount: Array.isArray(level?.blockers) ? level.blockers.length : 0
  };
}

function vitoBotDominantStyle(styleCounts) {
  const entries = Object.entries(styleCounts || {}).sort((left, right) => right[1] - left[1]);
  return entries[0]?.[0] || "Mixed";
}

async function listLevelFilesFromFolder(dir, pattern) {
  const params = new URLSearchParams({
    dir: String(dir || "levels").trim() || "levels",
    pattern: String(pattern || "*.json").trim() || "*.json"
  });
  const response = await fetch(`/api/list-level-files?${params.toString()}`);
  if (!response.ok) throw new Error(`Folder scan failed (${response.status})`);
  const data = await response.json();
  if (!data?.ok) throw new Error(data?.error || "Folder scan failed.");
  return Array.isArray(data.files) ? data.files : [];
}

function estimateVitoBotDifficulty(model, profile, persona) {
  const { report, signals, guide, solutionSummary, boardArea, pairCount, blockerCount } = model;
  const scarcityPenalty = report.solutionCount <= 0
    ? 18
    : Math.max(0, 10 - Math.min(10, report.solutionCount)) * 1.8;
  const straightnessPenalty = Math.max(0, 0.82 - (signals.pathStraightness || 0)) * (24 + persona.clarityWeight * 10);
  const ambiguityPenalty = (solutionSummary?.ambiguityScore || 0) * (8 + (1 - persona.ambiguityTolerance) * 12);
  const invalidPenalty = report.valid ? 0 : 10 * persona.invalidSensitivity;
  const guidePenalty = (guide?.issues?.length || 0) * 3.6;
  const spacePenalty = Math.max(0, (signals.freeCellsPerPair || 0) - 8.5) * 1.2;
  return (
    boardArea * 0.42 +
    pairCount * 5.8 +
    blockerCount * 1.4 +
    scarcityPenalty +
    ambiguityPenalty +
    (signals.excessBendsPerPair || 0) * 10 +
    straightnessPenalty +
    guidePenalty +
    spacePenalty +
    invalidPenalty -
    profile.skill * 0.035
  );
}

function simulateVitoBotRun(model, options, runIndex = 0, label = "") {
  const { level, report, signals, guide, solutionSummary } = model;
  const profile = vitoBotProfileConfig(options.profile, options.intelligence);
  const persona = vitoBotPersonaConfig(options.persona);
  const difficulty = estimateVitoBotDifficulty(model, profile, persona);
  const skillGap = profile.skill - difficulty;
  const clarityBonus = clampNumber(
    ((signals.pathStraightness || 0.7) - 0.7) * persona.clarityWeight
      + (1 - (solutionSummary?.ambiguityScore || 0)) * 0.18
      - (guide?.issues?.length || 0) * 0.025,
    -0.26,
    0.22
  );
  const solveChance = report.solvable
    ? clampNumber(
      0.5
      + skillGap / 82
      + clarityBonus
      + persona.ambiguityTolerance * (solutionSummary?.ambiguityScore || 0) * 0.08
      - (report.valid ? 0 : 0.13 * persona.invalidSensitivity),
      0.03,
      0.987
    )
    : 0;
  const next = rng(hashStringSeed(`${label}|${levelLabel(level)}|${runIndex}|${options.profile}|${options.persona}|${options.intelligence}|${options.runs}`));
  const misreadPressure = (
    (solutionSummary?.ambiguityScore || 0) * (1.55 - persona.ambiguityTolerance) +
    Math.max(0, 0.74 - (signals.pathStraightness || 0)) * 1.3 +
    (guide?.issues?.length || 0) * 0.22 +
    (report.valid ? 0 : 0.4 * persona.invalidSensitivity)
  );
  const misreads = Math.max(0, Math.round(misreadPressure * 2 + next() * 1.8 + persona.explorationBias * 0.5 - profile.skill / 76));
  const abandonChance = report.solvable
    ? clampNumber(
      (1 - solveChance) * 0.52 +
      (report.valid ? 0 : 0.16 * persona.invalidSensitivity) +
      Math.max(0, misreads - persona.restartTolerance * 1.4) * 0.045 -
      persona.restartTolerance * 0.05,
      0.01,
      0.9
    )
    : clampNumber(0.52 + next() * 0.2, 0.28, 0.97);
  const abandoned = next() < abandonChance;
  const solved = !abandoned && next() < solveChance;
  const deadEnds = Math.max(0, Math.round(
    ((1 - solveChance) * 2.1) +
    difficulty / 45 +
    persona.explorationBias * 0.9 +
    next() * 1.8 -
    profile.skill / 88
  ));
  const errors = Math.max(0, Math.round(
    profile.errorBias +
    misreads * 0.9 +
    difficulty / 22 +
    deadEnds * 0.55 +
    (solved ? 0 : 1.15) +
    next() * 1.9 -
    profile.skill / 40
  ));
  const restarts = solved
    ? Math.max(0, Math.round((1 - solveChance) * 1.35 + next() * 1.1 - persona.restartTolerance * 0.28))
    : abandoned
    ? Math.max(0, Math.round(next() * 1.4 + persona.restartTolerance * 0.5))
    : Math.max(1, Math.round(1 + next() * 2.3 + difficulty / 58 + persona.explorationBias * 0.4));
  const baseSeconds = 8
    + levelWidth(level) * levelHeight(level) * 0.72
    + ((level?.pairs || []).length * 6.1)
    + ((level?.blockers || []).length * 1.25)
    + (signals.excessBendsPerPair || 0) * 10
    + deadEnds * 4.8
    + errors * 6.5
    + misreads * 3.8;
  const sessionSeconds = Math.max(6, baseSeconds * profile.speedFactor * persona.speedModifier * (0.86 + next() * 0.32));
  const solveSeconds = solved ? Math.max(5, sessionSeconds * (0.7 + next() * 0.18)) : null;
  let style = "Committed";
  if (abandoned) style = "Abandoned";
  else if (persona.key === "speedrunner" && errors >= misreads) style = "Rushed";
  else if (persona.key === "explorer" && deadEnds >= 2) style = "Exploratory";
  else if (misreads >= 2) style = "Hesitant";
  else if ((signals.pathStraightness || 0) >= 0.8 && solved) style = "Clean";
  return {
    solved,
    abandoned,
    solveChance,
    solveSeconds,
    sessionSeconds,
    errors,
    misreads,
    deadEnds,
    restarts,
    style,
    persona: persona.label,
    validity: report.valid ? "OK" : "INVALID",
    solutionCount: report.solutionCount
  };
}

function summarizeVitoBotLevel(item, runs, options) {
  const samples = [];
  const model = buildVitoBotLevelModel(item.level);
  const solutionSummary = model.solutionSummary;
  for (let index = 0; index < runs; index++) {
    samples.push(simulateVitoBotRun(model, options, index, item.label));
  }
  const solvedSamples = samples.filter((entry) => entry.solved);
  const average = (selector, rows = samples) => rows.length
    ? rows.reduce((sum, row) => sum + selector(row), 0) / rows.length
    : 0;
  const abandonRate = samples.filter((entry) => entry.abandoned).length / Math.max(1, samples.length);
  const styleCounts = samples.reduce((acc, sample) => {
    acc[sample.style] = (acc[sample.style] || 0) + 1;
    return acc;
  }, {});
  const successRate = solvedSamples.length / Math.max(1, samples.length);
  const signals = model.signals;
  let tuningSignal = "Healthy";
  if (abandonRate > 0.36) tuningSignal = "High abandonment risk";
  else if (successRate < 0.35) tuningSignal = "Too hard or noisy";
  else if (average((row) => row.misreads) > 3.2) tuningSignal = "Misread-prone";
  else if (average((row) => row.errors) > 4.5) tuningSignal = "Error-prone";
  else if (average((row) => row.deadEnds) > 2.5) tuningSignal = "Too many dead ends";
  else if (successRate > 0.88 && average((row) => row.solveSeconds || 0, solvedSamples) < 25) tuningSignal = "Maybe too easy";
  else if ((signals.pathStraightness || 0) < 0.68) tuningSignal = "Zigzag pressure";
  return {
    label: item.label,
    source: item.source,
    runs: samples.length,
    persona: vitoBotPersonaConfig(options.persona).label,
    solutionCount: levelSolutionCount(item.level),
    ambiguityScore: solutionSummary.ambiguityScore,
    solutionSummary,
    successRate,
    abandonRate,
    avgSolveSeconds: average((row) => row.solveSeconds || 0, solvedSamples),
    avgSessionSeconds: average((row) => row.sessionSeconds),
    avgErrors: average((row) => row.errors),
    avgMisreads: average((row) => row.misreads),
    avgDeadEnds: average((row) => row.deadEnds),
    avgRestarts: average((row) => row.restarts),
    dominantStyle: vitoBotDominantStyle(styleCounts),
    validity: samples[0]?.validity || "UNKNOWN",
    tuningSignal
  };
}

async function loadVitoBotSource() {
  const source = String(state.vitobot.source || "folder");
  const items = [];
  if (source === "editor") {
    const level = levelFromEditor();
    items.push({ label: state.editor.fileName || `${levelLabel(level)}.json`, source: "Current Editor", level: cloneLevel(level) });
  } else if (source === "sessions") {
    state.sessions.queue.forEach((item) => {
      items.push({ label: item.file || levelLabel(item.level), source: item.source || "Play Sessions", level: cloneLevel(item.level) });
    });
  } else if (source === "procedural_manager") {
    sortedProceduralManagerItems().forEach((item) => {
      items.push({ label: item.file || levelLabel(item.level), source: "Procedural 100", level: cloneLevel(item.level) });
    });
  } else {
    const files = await listLevelFilesFromFolder(state.vitobot.folder, state.vitobot.pattern);
    for (const file of files) {
      const parsed = await fetchJsonIfAvailable(`/${file.relativePath.replace(/^\/+/, "")}`);
      if (!parsed) continue;
      try {
        items.push({
          label: file.name,
          source: displayProjectPath(file.relativePath),
          level: toPlayableLevel(parsed, file.name)
        });
      } catch (err) {
        log("vitobot-log", `Skipped ${file.name}: ${formatParseError(err)}`);
      }
    }
  }
  state.vitobot.loadedLevels = items;
  state.vitobot.results = [];
  state.vitobot.summary = null;
  state.vitobot.running = false;
  state.vitobot.selectedResultLabel = "";
  persistWorkspaceState();
  renderVitoBot();
  log("vitobot-log", `Loaded ${items.length} level(s) for VitoBot from ${source}.`);
  return items;
}

function renderVitoBot() {
  const sourceEl = document.getElementById("vitobot-source");
  const folderEl = document.getElementById("vitobot-folder");
  const patternEl = document.getElementById("vitobot-pattern");
  const profileEl = document.getElementById("vitobot-profile");
  const personaEl = document.getElementById("vitobot-persona");
  const intelligenceEl = document.getElementById("vitobot-intelligence");
  const intelligenceValueEl = document.getElementById("vitobot-intelligence-value");
  const runsEl = document.getElementById("vitobot-runs");
  const hintEl = document.getElementById("vitobot-source-hint");
  const loadedSummaryEl = document.getElementById("vitobot-loaded-summary");
  const runSummaryEl = document.getElementById("vitobot-run-summary");
  const tuningSummaryEl = document.getElementById("vitobot-tuning-summary");
  const detailSummaryEl = document.getElementById("vitobot-detail-summary");
  const detailSolutionsEl = document.getElementById("vitobot-detail-solutions");
  const tbody = document.querySelector("#vitobot-table tbody");
  const loadBtn = document.getElementById("vitobot-load");
  const runBtn = document.getElementById("vitobot-run");
  const clearBtn = document.getElementById("vitobot-clear");
  if (!sourceEl || !folderEl || !patternEl || !profileEl || !personaEl || !intelligenceEl || !intelligenceValueEl || !runsEl || !hintEl || !loadedSummaryEl || !runSummaryEl || !tuningSummaryEl || !detailSummaryEl || !detailSolutionsEl || !tbody || !loadBtn || !runBtn || !clearBtn) return;
  const loadedLevelMap = new Map((state.vitobot.loadedLevels || []).map((item) => [item.label, item.level]));
  const normalizedResults = (state.vitobot.results || []).map((result) => {
    const withDefaults = {
      avgMisreads: Number.isFinite(result.avgMisreads) ? result.avgMisreads : 0,
      abandonRate: Number.isFinite(result.abandonRate) ? result.abandonRate : 0,
      dominantStyle: result.dominantStyle || "Mixed",
      persona: result.persona || vitoBotPersonaConfig(state.vitobot.persona || "balanced").label
    };
    if (Number.isFinite(result.solutionCount) && Number.isFinite(result.ambiguityScore) && result.solutionSummary) {
      return {
        ...result,
        ...withDefaults
      };
    }
    const level = loadedLevelMap.get(result.label);
    if (!level) {
      return {
        ...result,
        ...withDefaults,
        solutionCount: Number.isFinite(result.solutionCount) ? result.solutionCount : 0,
        ambiguityScore: Number.isFinite(result.ambiguityScore) ? result.ambiguityScore : 0,
        solutionSummary: result.solutionSummary || { sampleCount: 0, uniqueSampleCount: 0, diversity: 0, ambiguityScore: 0, shapeSummaries: [] }
      };
    }
    const solutionSummary = summarizeSolutionSamples(level, 4);
    return {
      ...result,
      ...withDefaults,
      solutionCount: levelSolutionCount(level),
      ambiguityScore: solutionSummary.ambiguityScore,
      solutionSummary
    };
  });
  state.vitobot.results = normalizedResults;

  sourceEl.value = state.vitobot.source;
  folderEl.value = state.vitobot.folder;
  patternEl.value = state.vitobot.pattern;
  profileEl.value = state.vitobot.profile;
  personaEl.value = state.vitobot.persona || "balanced";
  intelligenceEl.value = String(state.vitobot.intelligence);
  intelligenceValueEl.textContent = String(state.vitobot.intelligence);
  runsEl.value = String(state.vitobot.runs);

  const folderMode = state.vitobot.source === "folder";
  folderEl.disabled = !folderMode;
  patternEl.disabled = !folderMode;
  sourceEl.disabled = state.vitobot.running;
  profileEl.disabled = state.vitobot.running;
  personaEl.disabled = state.vitobot.running;
  intelligenceEl.disabled = state.vitobot.running;
  runsEl.disabled = state.vitobot.running;
  loadBtn.disabled = state.vitobot.running;
  runBtn.disabled = state.vitobot.running;
  clearBtn.disabled = state.vitobot.running;
  hintEl.innerHTML = folderMode
    ? `Current folder scan: <code>${escapeHtml(state.vitobot.folder)}</code> filtered by <code>${escapeHtml(state.vitobot.pattern)}</code>.`
    : "Non-folder source selected. Folder and pattern are ignored until you switch back to Folder mode.";

  const loadedCount = state.vitobot.loadedLevels.length;
  const restoredCount = normalizedResults.length;
  loadedSummaryEl.textContent = state.vitobot.running
    ? `Running VitoBot on ${loadedCount} levels...`
    : loadedCount
    ? `${loadedCount} levels loaded from ${state.vitobot.source}.`
    : restoredCount
    ? `${restoredCount} restored results from the previous run. Reload the source to inspect the live pack again.`
    : "0 levels loaded";

  if (state.vitobot.summary) {
    const summaryPersona = state.vitobot.summary.persona || vitoBotPersonaConfig(state.vitobot.persona || "balanced").label;
    const summaryAbandonRate = Number.isFinite(state.vitobot.summary.abandonRate) ? state.vitobot.summary.abandonRate : 0;
    runSummaryEl.textContent = [
      `${state.vitobot.summary.totalLevels} levels`,
      `${state.vitobot.summary.totalRuns} total runs`,
      `${summaryPersona}`,
      `${(state.vitobot.summary.successRate * 100).toFixed(1)}% success`,
      `${(summaryAbandonRate * 100).toFixed(1)}% abandon`,
      `${formatDurationSeconds(state.vitobot.summary.avgSolveSeconds)} avg solve`,
      `${state.vitobot.summary.avgErrors.toFixed(1)} avg errors`
    ].join(" · ");
    tuningSummaryEl.textContent = state.vitobot.summary.topSignals.length
      ? state.vitobot.summary.topSignals.join(" | ")
      : "No strong signal yet.";
  } else {
    runSummaryEl.textContent = "No runs yet.";
    tuningSummaryEl.textContent = "Run a batch to see the hardest or noisiest levels first.";
  }

  tbody.innerHTML = "";
  const selectedResult = normalizedResults.find((result) => result.label === state.vitobot.selectedResultLabel)
    || normalizedResults[0]
    || null;
  if (selectedResult && state.vitobot.selectedResultLabel !== selectedResult.label) {
    state.vitobot.selectedResultLabel = selectedResult.label;
  }
  normalizedResults.forEach((result) => {
    const tr = document.createElement("tr");
    if (selectedResult && result.label === selectedResult.label) tr.classList.add("selected");
    [
      result.label,
      result.source,
      result.runs,
      result.solutionCount,
      `${Math.round(result.ambiguityScore * 100)}%`,
      `${(result.successRate * 100).toFixed(1)}%`,
      formatDurationSeconds(result.avgSolveSeconds),
      formatDurationSeconds(result.avgSessionSeconds),
      result.avgErrors.toFixed(1),
      result.avgMisreads.toFixed(1),
      result.avgDeadEnds.toFixed(1),
      result.avgRestarts.toFixed(1),
      `${(result.abandonRate * 100).toFixed(1)}%`,
      `${result.tuningSignal}${result.validity === "INVALID" ? " · INVALID" : ""}`
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    });
    tr.addEventListener("click", () => {
      state.vitobot.selectedResultLabel = result.label;
      renderVitoBot();
    });
    tbody.appendChild(tr);
  });

  if (!selectedResult) {
    detailSummaryEl.textContent = "Select a row to inspect sample puzzle solutions and ambiguity.";
    detailSolutionsEl.textContent = "No sample solutions loaded yet.";
    return;
  }

  const solutionSummary = selectedResult.solutionSummary || { sampleCount: 0, uniqueSampleCount: 0, diversity: 0, ambiguityScore: 0, shapeSummaries: [] };
  detailSummaryEl.textContent = [
    `${selectedResult.label}`,
    `${selectedResult.persona}`,
    `${selectedResult.dominantStyle} style`,
    `${selectedResult.solutionCount} stored solutions`,
    `${solutionSummary.sampleCount} sampled`,
    `${solutionSummary.uniqueSampleCount} unique path families`,
    `${Math.round(solutionSummary.diversity * 100)}% spread`,
    `${Math.round(solutionSummary.ambiguityScore * 100)}% ambiguity`
  ].join(" · ");
  detailSolutionsEl.textContent = solutionSummary.shapeSummaries.length
    ? solutionSummary.shapeSummaries.map((entry) => (
      `${entry.label}\nStraightness: ${Math.round(entry.straightness * 100)}% · Excess bends/pair: ${entry.excessBendsPerPair.toFixed(2)}\n${entry.text}`
    )).join("\n\n")
    : "No sample solutions found for this level.";
}

async function runVitoBotBatch() {
  const items = state.vitobot.loadedLevels.length ? state.vitobot.loadedLevels : await loadVitoBotSource();
  if (!items.length) {
    log("vitobot-log", "No levels loaded for VitoBot.");
    return;
  }
  const options = {
    profile: state.vitobot.profile,
    persona: state.vitobot.persona || "balanced",
    intelligence: state.vitobot.intelligence,
    runs: state.vitobot.runs
  };
  const runs = clampNumber(Number(state.vitobot.runs || 25), 1, 500);
  state.vitobot.running = true;
  renderVitoBot();
  try {
    const results = [];
    for (let index = 0; index < items.length; index++) {
      results.push(summarizeVitoBotLevel(items[index], runs, options));
      if ((index + 1) % 6 === 0) {
        const loadedSummaryEl = document.getElementById("vitobot-loaded-summary");
        if (loadedSummaryEl) loadedSummaryEl.textContent = `Running VitoBot on ${items.length} levels... ${index + 1}/${items.length}`;
        await pauseForPaint();
      }
    }
    const average = (selector) => results.length ? results.reduce((sum, row) => sum + selector(row), 0) / results.length : 0;
    const topSignals = results
      .filter((row) => row.tuningSignal !== "Healthy")
      .sort((left, right) => (right.avgErrors + (1 - right.successRate) * 6) - (left.avgErrors + (1 - left.successRate) * 6))
      .slice(0, 3)
      .map((row) => `${row.label}: ${row.tuningSignal}`);
    state.vitobot.results = results;
    state.vitobot.summary = {
      totalLevels: results.length,
      totalRuns: results.length * runs,
      persona: vitoBotPersonaConfig(options.persona).label,
      successRate: average((row) => row.successRate),
      abandonRate: average((row) => row.abandonRate),
      avgSolveSeconds: average((row) => row.avgSolveSeconds),
      avgErrors: average((row) => row.avgErrors),
      topSignals
    };
    state.vitobot.selectedResultLabel = results[0]?.label || "";
    persistWorkspaceState();
    renderVitoBot();
    log("vitobot-log", `Ran ${runs} simulated pass(es) across ${results.length} level(s) with profile=${options.profile} persona=${options.persona} intelligence=${options.intelligence}.`);
  } finally {
    state.vitobot.running = false;
    renderVitoBot();
  }
}

function initVitoBot() {
  const sourceEl = document.getElementById("vitobot-source");
  const folderEl = document.getElementById("vitobot-folder");
  const patternEl = document.getElementById("vitobot-pattern");
  const profileEl = document.getElementById("vitobot-profile");
  const personaEl = document.getElementById("vitobot-persona");
  const intelligenceEl = document.getElementById("vitobot-intelligence");
  const runsEl = document.getElementById("vitobot-runs");
  if (!sourceEl || !folderEl || !patternEl || !profileEl || !personaEl || !intelligenceEl || !runsEl) return;

  sourceEl.addEventListener("change", (event) => {
    state.vitobot.source = event.target.value;
    persistWorkspaceState();
    renderVitoBot();
  });
  folderEl.addEventListener("input", (event) => {
    state.vitobot.folder = event.target.value;
    persistWorkspaceState();
  });
  patternEl.addEventListener("input", (event) => {
    state.vitobot.pattern = event.target.value;
    persistWorkspaceState();
  });
  profileEl.addEventListener("change", (event) => {
    state.vitobot.profile = event.target.value;
    persistWorkspaceState();
  });
  personaEl.addEventListener("change", (event) => {
    state.vitobot.persona = event.target.value;
    persistWorkspaceState();
    renderVitoBot();
  });
  intelligenceEl.addEventListener("input", (event) => {
    state.vitobot.intelligence = clampNumber(Number(event.target.value || 55), 5, 95);
    persistWorkspaceState();
    renderVitoBot();
  });
  runsEl.addEventListener("input", (event) => {
    state.vitobot.runs = clampNumber(Number(event.target.value || 25), 1, 500);
    persistWorkspaceState();
  });

  bindClick("vitobot-load", async () => {
    try {
      await loadVitoBotSource();
    } catch (err) {
      log("vitobot-log", `VitoBot load failed: ${formatParseError(err)}`);
    }
  });
  bindClick("vitobot-run", async () => {
    try {
      await runVitoBotBatch();
    } catch (err) {
      log("vitobot-log", `VitoBot run failed: ${formatParseError(err)}`);
    }
  });
  bindClick("vitobot-clear", () => {
    state.vitobot.loadedLevels = [];
    state.vitobot.results = [];
    state.vitobot.summary = null;
    state.vitobot.running = false;
    state.vitobot.selectedResultLabel = "";
    persistWorkspaceState();
    renderVitoBot();
    log("vitobot-log", "Cleared VitoBot results.");
  });

  renderVitoBot();
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
  const managerOutputInput = document.getElementById("settings-manager-output-dir");
  if (managerOutputInput) managerOutputInput.value = displayProjectPath(state.settings.managerOutputDir);
  const workbookInput = document.getElementById("settings-workbook-path");
  if (workbookInput) workbookInput.value = displayProjectPath(state.settings.spreadsheetWorkbookPath);
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
  setValue("settings-spreadsheet-id", state.settings.spreadsheetId);
  setValue("settings-spreadsheet-web-url", state.settings.spreadsheetWebAppUrl || "");
  setValue("settings-google-sync-method", state.settings.googleSyncMethod);
  setValue("settings-google-client-path", displayProjectPath(state.settings.googleClientPath));
  setValue("settings-google-token-path", displayProjectPath(state.settings.googleTokenPath));
  setValue("settings-pair-a", state.settings.pairColors[0]);
  setValue("settings-pair-b", state.settings.pairColors[1]);
  setValue("settings-pair-c", state.settings.pairColors[2]);
  setValue("settings-pair-d", state.settings.pairColors[3]);
  setValue("settings-pair-e", state.settings.pairColors[4]);
  setValue("settings-pair-f", state.settings.pairColors[5]);
  setValue("settings-pair-g", state.settings.pairColors[6]);
  setValue("settings-pair-h", state.settings.pairColors[7]);
  setValue("settings-pair-i", state.settings.pairColors[8]);
  const autoSyncCheckbox = document.getElementById("settings-auto-sync-sheet");
  if (autoSyncCheckbox) autoSyncCheckbox.checked = !!state.settings.autoSyncSheetDb;
  document.getElementById("settings-save").addEventListener("click", () => {
    state.settings.exportDir = resolveProjectPath(document.getElementById("settings-export-dir").value || DEFAULT_PROJECT_SAVE_DIR);
    state.settings.managerOutputDir = resolveProjectPath(document.getElementById("settings-manager-output-dir").value || DEFAULT_MANAGER_OUTPUT_DIR);
    state.settings.spreadsheetWorkbookPath = resolveProjectPath(document.getElementById("settings-workbook-path").value || DEFAULT_SPREADSHEET_WORKBOOK_PATH);
    state.settings.spreadsheetId = String(document.getElementById("settings-spreadsheet-id").value || DEFAULT_GOOGLE_SPREADSHEET_ID).trim();
    state.settings.googleSyncMethod = String(document.getElementById("settings-google-sync-method").value || DEFAULT_GOOGLE_SYNC_METHOD);
    state.settings.googleClientPath = resolveProjectPath(document.getElementById("settings-google-client-path").value || DEFAULT_GOOGLE_CLIENT_PATH);
    state.settings.googleTokenPath = resolveProjectPath(document.getElementById("settings-google-token-path").value || DEFAULT_GOOGLE_TOKEN_PATH);
    state.settings.spreadsheetWebAppUrl = String(document.getElementById("settings-spreadsheet-web-url")?.value || "").trim();
    state.settings.autoSyncSheetDb = !!document.getElementById("settings-auto-sync-sheet").checked;
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
    state.settings.defaultBoardWidth = Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_WIDTH, Number(document.getElementById("settings-default-width").value || 5)));
    state.settings.defaultBoardHeight = Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_HEIGHT, Number(document.getElementById("settings-default-height").value || 5)));
    state.settings.defaultDifficulty = String(document.getElementById("settings-default-difficulty").value || "MEDIUM");
    state.settings.pairColors = PAIR_IDS.map((id, index) => {
      const input = document.getElementById(`settings-pair-${id.toLowerCase()}`);
      return input?.value || pairColors[index];
    });
    applySettingsToUi();
    applySettingsToEditorDefaults();
    saveSettings();
    syncEditorInputs();
    refreshVisibleView();
    log("settings-log", `Settings updated.\nSave path: ${displayProjectPath(state.settings.exportDir)}\nLevel Manager output: ${displayProjectPath(state.settings.managerOutputDir)}\nWorkbook: ${displayProjectPath(state.settings.spreadsheetWorkbookPath)}\nSpreadsheet ID: ${state.settings.spreadsheetId}\nSpreadsheet embed: ${state.settings.spreadsheetWebAppUrl ? "ON" : "OFF"}\nGoogle sync method: ${state.settings.googleSyncMethod}\nGoogle OAuth client: ${displayProjectPath(state.settings.googleClientPath)}\nGoogle OAuth token: ${displayProjectPath(state.settings.googleTokenPath)}\nAuto sync sheet DB: ${state.settings.autoSyncSheetDb ? "ON" : "OFF"}\nPerformance: ${state.settings.performanceProfile}\nActive pairs: ${state.settings.maxPairs}\nDefault board: ${state.settings.defaultBoardWidth}x${state.settings.defaultBoardHeight}\nDefault difficulty: ${state.settings.defaultDifficulty}`);
    log("mgr-paths", [
      "Level folders",
      `${PROJECT_ROOT_NAME}/levels`,
      `${PROJECT_ROOT_NAME}/progressions`,
      `${PROJECT_ROOT_NAME}/playtest`,
      "",
      "Project save root",
      displayProjectPath(state.settings.exportDir),
      "",
      "Level Manager output root",
      displayProjectPath(state.settings.managerOutputDir),
      "",
      "Workbook mirror",
      displayProjectPath(state.settings.spreadsheetWorkbookPath),
      "",
      "Spreadsheet embed (optional)",
      state.settings.spreadsheetWebAppUrl || "(disabled)",
      "",
      "Google Sheets API",
      `Method: ${state.settings.googleSyncMethod}`,
      displayProjectPath(state.settings.googleClientPath),
      displayProjectPath(state.settings.googleTokenPath),
      "",
      "Archive and runtime mirrors",
      `${PROJECT_ROOT_NAME}/archive`,
      `${PROJECT_ROOT_NAME}/level_toolkit_web/workshop_jsons`,
      `${PROJECT_ROOT_NAME}/bundles`
    ].join("\n"));
    refreshGoogleSheetsApiStatus("settings-log");
  });
  document.getElementById("settings-sync-sheet").addEventListener("click", async () => {
    try {
      const saved = await syncLevelsWorkbook("manual_settings_sync");
      log("settings-log", `Workbook sync completed: ${displayProjectPath(saved.path)}${saved.pushed ? ` and pushed via ${saved.pushMode || "remote sync"}` : ""}${saved.pushError ? `\nRemote sync warning: ${saved.pushError}` : ""}`);
    } catch (err) {
      log("settings-log", `Workbook sync failed: ${formatParseError(err)}`);
    }
  });
  document.getElementById("settings-connect-sheet-api").addEventListener("click", async () => {
    try {
      const response = await fetch("/api/google-sheets-auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialsPath: state.settings.googleClientPath,
          tokenPath: state.settings.googleTokenPath,
          baseUrl: window.location.origin
        })
      });
      if (!response.ok) throw new Error(`Google auth start failed (${response.status})`);
      const data = await response.json();
      window.open(data.authUrl, "_blank", "noopener,noreferrer");
      log("settings-log", "Opened Google OAuth flow for Google Sheets API.");
    } catch (err) {
      log("settings-log", `Google Sheets API connect failed: ${formatParseError(err)}`);
    }
  });
  document.getElementById("settings-check-sheet-api").addEventListener("click", async () => {
    await refreshGoogleSheetsApiStatus("settings-log");
  });
  document.getElementById("settings-disconnect-sheet-api").addEventListener("click", async () => {
    try {
      const response = await fetch("/api/google-sheets-disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenPath: state.settings.googleTokenPath })
      });
      if (!response.ok) throw new Error(`Google Sheets API disconnect failed (${response.status})`);
      await refreshGoogleSheetsApiStatus("settings-log");
      log("settings-log", "Removed the saved Google Sheets API token.");
    } catch (err) {
      log("settings-log", `Google Sheets API disconnect failed: ${formatParseError(err)}`);
    }
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
  refreshGoogleSheetsApiStatus("settings-log");
}

function initMain() {
  const referenceInput = document.getElementById("procedural-base-input");
  const pairsIntentEl = document.getElementById("main-reference-pairs-intent");
  const blockersIntentEl = document.getElementById("main-reference-blockers-intent");
  const boardIntentEl = document.getElementById("main-reference-board-intent");

  const syncReferenceIntentControls = () => {
    const adjustments = normalizeProceduralReferenceAdjustments(state.main.adjustments);
    if (pairsIntentEl) pairsIntentEl.value = adjustments.pairs;
    if (blockersIntentEl) blockersIntentEl.value = adjustments.blockers;
    if (boardIntentEl) boardIntentEl.value = adjustments.board;
  };

  const handleReferenceIntentChange = () => {
    state.main.adjustments = normalizeProceduralReferenceAdjustments({
      pairs: pairsIntentEl?.value,
      blockers: blockersIntentEl?.value,
      board: boardIntentEl?.value
    });
    renderProceduralReferenceLab();
    persistWorkspaceState();
    log("main-log", `Updated reference intent. ${proceduralReferenceIntentText(state.main.adjustments)}.`);
  };

  syncReferenceIntentControls();
  renderProceduralReferenceLab();

  pairsIntentEl?.addEventListener("change", handleReferenceIntentChange);
  blockersIntentEl?.addEventListener("change", handleReferenceIntentChange);
  boardIntentEl?.addEventListener("change", handleReferenceIntentChange);

  referenceInput?.addEventListener("change", async () => {
    const file = referenceInput.files?.[0];
    if (!file) return;
    try {
      const level = toPlayableLevel(parseImportedJson(await file.text()), file.name);
      state.main.baseLevel = cloneLevel(level);
      state.main.baseFileName = file.name;
      state.main.candidates = [];
      renderProceduralReferenceLab();
      persistWorkspaceState();
      log("main-log", `Loaded reference level ${file.name}. ${levelFeatureSummary(level)}.`);
      regenerateReferenceCandidates("main-log");
    } catch (err) {
      log("main-log", `Reference import error: ${formatParseError(err)}`);
    } finally {
      referenceInput.value = "";
    }
  });

  bindClick("btn-procedural-base-file", () => {
    referenceInput?.click();
  });

  bindClick("btn-procedural-generate-variants", () => {
    regenerateReferenceCandidates("main-log");
  });

  bindClick("btn-procedural-clear-variants", () => {
    state.main.candidates = [];
    renderProceduralReferenceLab();
    persistWorkspaceState();
    log("main-log", "Cleared the current reference-driven variants.");
  });

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
  const variantPairsIntentEl = document.getElementById("ed-reference-pairs-intent");
  const variantBlockersIntentEl = document.getElementById("ed-reference-blockers-intent");
  const variantBoardIntentEl = document.getElementById("ed-reference-board-intent");

  const syncEditorVariantIntentControls = () => {
    const adjustments = normalizeProceduralReferenceAdjustments(state.editor.variantAdjustments);
    if (variantPairsIntentEl) variantPairsIntentEl.value = adjustments.pairs;
    if (variantBlockersIntentEl) variantBlockersIntentEl.value = adjustments.blockers;
    if (variantBoardIntentEl) variantBoardIntentEl.value = adjustments.board;
  };

  const handleEditorVariantIntentChange = () => {
    state.editor.variantAdjustments = normalizeProceduralReferenceAdjustments({
      pairs: variantPairsIntentEl?.value,
      blockers: variantBlockersIntentEl?.value,
      board: variantBoardIntentEl?.value
    });
    renderEditorVariantLab();
    persistWorkspaceState();
    log("ed-log", `Updated editor variant intent. ${proceduralReferenceIntentText(state.editor.variantAdjustments)}.`);
  };

  updateEditorProgressionBuilder();
  syncEditorVariantIntentControls();
  renderEditorVariantLab();
  renderEditorPairList();
  updateEditorPlaySummary();

  variantPairsIntentEl?.addEventListener("change", handleEditorVariantIntentChange);
  variantBlockersIntentEl?.addEventListener("change", handleEditorVariantIntentChange);
  variantBoardIntentEl?.addEventListener("change", handleEditorVariantIntentChange);

  progressionSelectEl.addEventListener("change", () => {
    state.editor.progressionKey = progressionSelectEl.value;
    state.editor.progressionSlot = FIRST_PLAYABLE_SLOT_INDEX;
    syncEditorInputs();
    updateEditorProgressionBuilder();
  });

  progressionSlotEl.addEventListener("change", () => {
    state.editor.progressionSlot = Number(progressionSlotEl.value || FIRST_PLAYABLE_SLOT_INDEX);
    updateEditorSlotInfo();
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
    const newWidth = Number(boardWidthEl.value);
    const newHeight = Number(boardHeightEl.value);
    const oldWidth = state.editor.boardWidth;
    const oldHeight = state.editor.boardHeight;
    
    state.editor.boardWidth = newWidth;
    state.editor.boardHeight = newHeight;
    state.editor.solutionCount = 0;
    state.editor.validationSolvable = false;
    state.editor.validationDensityMatch = false;
    state.editor.validationDecalPass = null;
    
    // Preserve blockers that are within the new board bounds
    const preservedBlockers = new Set();
    state.editor.blockers.forEach((cell) => {
      const [r, c] = cell.split(",").map(Number);
      if (r < newHeight && c < newWidth) {
        preservedBlockers.add(cell);
      }
    });
    state.editor.blockers = preservedBlockers;
    
    // Preserve debug marks that are within the new board bounds
    const preservedMarks = new Set();
    state.editor.debugMarks.forEach((cell) => {
      const [r, c] = cell.split(",").map(Number);
      if (r < newHeight && c < newWidth) {
        preservedMarks.add(cell);
      }
    });
    state.editor.debugMarks = preservedMarks;
    
    clearEditorReferenceTrails();
    
    // Preserve pair positions that are within the new board bounds
    Object.keys(state.editor.pairs).forEach((id) => {
      const pair = state.editor.pairs[id];
      if (pair.start) {
        const [sr, sc] = pair.start;
        if (sr >= newHeight || sc >= newWidth) {
          pair.start = null;
        }
      }
      if (pair.end) {
        const [er, ec] = pair.end;
        if (er >= newHeight || ec >= newWidth) {
          pair.end = null;
        }
      }
    });
    
    updateEditorDebugStatus();
    markEditorDirty("board size change");
    if (!resizeEditorCanvas()) drawBoard();
  }
  boardWidthEl.addEventListener("change", handleBoardDimensionChange);
  boardHeightEl.addEventListener("change", handleBoardDimensionChange);

  document.getElementById("ed-level").addEventListener("change", () => {
    state.editor.level = Math.max(1, Number(document.getElementById("ed-level").value || 1));
    updateEditorSlotInfo();
    markEditorDirty("level number change");
  });
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
  document.getElementById("ed-mode").addEventListener("change", () => {
    if (editorMode() !== "trace" && state.editor.traceDraft) endReferenceTrail(false);
    drawBoard();
  });
  document.getElementById("ed-pair-id").addEventListener("change", () => {
    updateEditorPairBadge();
    updateEditorPlaySummary();
    renderEditorPairList();
    drawBoard();
  });
  document.getElementById("ed-clear-trails").addEventListener("click", () => {
    clearEditorReferenceTrails();
    markEditorDirty("reference trails cleared");
    drawBoard();
    log("ed-log", "Reference trails cleared.");
  });

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
    try {
      await promptAndSaveEditorLevel();
    } catch (err) {
      log("ed-log", `Save error: ${formatParseError(err)}`);
    }
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
    const saved = await saveProjectDataUrl(`levels/screenshots/${stem}.png`, canvas.toDataURL("image/png"));
    log("ed-log", `Saved screenshot to ${displayProjectPath(saved.path)}`);
  });

  document.getElementById("ed-reset").addEventListener("click", () => {
    state.editor.blockers.clear();
    state.editor.debugMarks.clear();
    clearEditorReferenceTrails();
    state.editor.variantCandidates = [];
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
    state.play.paths = {};
    state.play.colorMap = {};
    setPlayStatus("Play OFF");
    renderEditorVariantLab();
    markEditorDirty("reset");
    drawBoard();
    log("ed-log", "Reset.");
  });

  document.getElementById("ed-save").addEventListener("click", async () => {
    try {
      await persistEditorToLinkedSource();
    } catch (err) {
      log("ed-log", `Update error: ${formatParseError(err)}`);
    }
  });

  document.getElementById("ed-save-as-new").addEventListener("click", async () => {
    try {
      await saveEditorAsNewLevel();
    } catch (err) {
      log("ed-log", `New error: ${formatParseError(err)}`);
    }
  });

  bindClick("ed-send-knowledge", () => {
    sendCurrentEditorLevelToKnowledge();
  });

  bindClick("ed-send-antipattern", () => {
    sendCurrentEditorLevelToAntiPattern();
  });

  bindClick("ed-generate-variants", () => {
    regenerateEditorVariantCandidates("ed-log");
  });

  bindClick("ed-clear-variants", () => {
    state.editor.variantCandidates = [];
    renderEditorVariantLab();
    persistWorkspaceState();
    log("ed-log", "Cleared the current editor variants.");
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
    updateEditorPlaySummary();
    drawBoard();
  });

  document.getElementById("play-reset").addEventListener("click", () => {
    resetPlayState();
    if (state.play.on) randomizePlayColors();
    updateEditorPlaySummary();
    drawBoard();
  });

  document.getElementById("play-mark-selected").addEventListener("click", () => {
    capturePlayPathsAsGuides("selected");
  });

  document.getElementById("play-mark-all").addEventListener("click", () => {
    capturePlayPathsAsGuides("all");
  });

  document.getElementById("play-clear-guides").addEventListener("click", () => {
    clearEditorReferenceTrails();
    markEditorDirty("play guides cleared");
    drawBoard();
    log("ed-log", "Cleared the painted guides.");
  });

  document.getElementById("play-export-session").addEventListener("click", async () => {
    try {
      const solvedNow = getPlayStatus() === "Solved";
      const session = solvedNow ? await saveSolvedSession("manual", "editor") : serializePlaySession(false);
      if (!solvedNow) {
        const result = await saveRepoFile(CANONICAL_STATE_PATHS.latestPlaytest, JSON.stringify(session, null, 2));
        session.saved_path = result.path;
        await appendPlaytestDatasetRecord(session, "editor");
      }
      log("ed-log", ["✓ Play session exported successfully", `Level: ${levelLabel(session.level)}`, `Saved to: ${displayProjectPath(session.saved_path)}`, `Status: ${solvedNow ? "Solved" : "In progress"}`]);
    } catch (err) {
      log("ed-log", ["✗ Play session export failed", `Error: ${formatParseError(err)}`]);
    }
  });

  updatePlayToggleButton();
  updateEditorPlaySummary();
  renderEditorPairList();
  renderEditorVariantLab();
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
      if (editorMode() === "trace") return;
      applyEditorCellAction(cell);
      markEditorDirty("board edit");
      drawBoard();
    });
  }

  targetCanvas.addEventListener("pointerdown", (ev) => {
    if (!state.play.on) {
      if (!allowEditing || editorMode() !== "trace") return;
      const cell = cellFromCanvasEvent(ev, targetCanvas);
      if (!cell) return;
      if (beginReferenceTrail(cell)) {
        targetCanvas.setPointerCapture(ev.pointerId);
        drawBoard();
      }
      return;
    }
    const cell = cellFromCanvasEvent(ev, targetCanvas);
    if (!cell) return;
    if (beginPlayDrag(cell)) {
      targetCanvas.setPointerCapture(ev.pointerId);
      drawBoard();
    }
  });

  targetCanvas.addEventListener("pointermove", (ev) => {
    if (!state.play.on) {
      if (!allowEditing || editorMode() !== "trace" || !state.editor.traceDraft) return;
      const cell = cellFromCanvasEvent(ev, targetCanvas);
      if (!cell) return;
      if (continueReferenceTrail(cell)) drawBoard();
      return;
    }
    if (!state.play.dragging) return;
    const cell = cellFromCanvasEvent(ev, targetCanvas);
    if (!cell) return;
    if (continuePlayDrag(cell)) drawBoard();
  });

  targetCanvas.addEventListener("pointerup", () => {
    if (state.play.on) {
      if (state.play.dragging) endPlayDrag();
      return;
    }
    if (editorMode() === "trace" && state.editor.traceDraft) {
      endReferenceTrail(false);
      drawBoard();
    }
  });

  targetCanvas.addEventListener("pointercancel", () => {
    if (state.play.on) {
      if (state.play.dragging) endPlayDrag();
      return;
    }
    if (editorMode() === "trace" && state.editor.traceDraft) {
      endReferenceTrail(false);
      drawBoard();
    }
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
    saveRepoFile(CANONICAL_STATE_PATHS.latestPlaytest, JSON.stringify(session, null, 2)).catch(() => {});
    queueBrowserStateSync("play_session_saved");
    log("ed-log", "Solved in Play Mode. Session saved to browser storage.");
  }
}

function serializePlaySession(solved) {
  return {
    saved_at: new Date().toISOString(),
    solved,
    level: levelFromEditor({ recomputeAnalysis: false }),
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

async function fetchJsonIfAvailable(url) {
  if (!(await repoUrlExists(url))) return null;
  const response = await fetch(url);
  if (!response.ok) return null;
  return parseImportedJson(await response.text());
}

async function resolveExistingWorkshopLevelUrl(filename) {
  const candidateUrls = await workshopLevelCandidateUrls(filename);
  for (const url of candidateUrls) {
    if (await repoUrlExists(url)) return url;
  }
  return null;
}

function startupIntegrityMarkdown(result) {
  const lines = [
    "# Toolkit Startup Integrity Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Checked presets: ${result.checkedPresets.length}`,
    `Skipped optional presets: ${(result.skippedOptionalPresets || []).length}`,
    `Checked level references: ${result.checkedLevelRefs}`,
    `Missing references: ${result.missingCount}`,
    ""
  ];
  if (result.checkedPresets.length) {
    lines.push("## Presets", "");
    result.checkedPresets.forEach((preset) => lines.push(`- ${preset.key}: ${preset.path}`));
    lines.push("");
  }
  if ((result.skippedOptionalPresets || []).length) {
    lines.push("## Skipped Optional Presets", "");
    result.skippedOptionalPresets.forEach((preset) => lines.push(`- ${preset.key}: ${preset.path}`));
    lines.push("");
  }
  if (result.missing.length) {
    lines.push("## Missing", "");
    result.missing.forEach((entry) => lines.push(`- ${entry.path} (${entry.reason})`));
    lines.push("");
  } else {
    lines.push("## Result", "", "- No missing preset or level references found.", "");
  }
  return lines.join("\n");
}

async function runStartupIntegrityAudit() {
  const presetDefs = [
    { key: "workshop", url: "./workshop_progressions/workshop_workspace.json", optional: true },
    { key: "allUniqueLevels", url: "./workshop_progressions/allUniqueLevels_workspace.json", optional: true },
    { key: "gameUniqueLevels", url: "./workshop_progressions/gameUniqueLevels_workspace.json", optional: true },
    { key: "progressionA_afterTewak", url: "./workshop_progressions/progressionA_afterTewak_workspace.json", optional: true },
    { key: "progressionImportedClean", url: "./workshop_progressions/progressionImportedClean_workspace.json", optional: true }
  ];
  const result = {
    generatedAt: new Date().toISOString(),
    checkedPresets: [],
    skippedOptionalPresets: [],
    checkedLevelRefs: 0,
    missingCount: 0,
    missing: [],
    reportPath: `${PROJECT_ROOT}/reports/toolkit_startup_integrity.md`,
    jsonPath: `${PROJECT_ROOT}/reports/toolkit_startup_integrity.json`
  };
  const seenLevelRefs = new Set();
  try {
    for (const preset of presetDefs) {
      const data = await fetchJsonIfAvailable(preset.url);
      if (!data) {
        if (preset.optional) {
          result.skippedOptionalPresets.push({ key: preset.key, path: preset.url });
        } else {
          result.missing.push({ path: preset.url, reason: "preset_missing" });
        }
        continue;
      }
      result.checkedPresets.push({ key: preset.key, path: preset.url });
      const refs = new Set();
      if (data.tutorial_level_file) refs.add(data.tutorial_level_file);
      (data.all_level_files || []).forEach((fileName) => refs.add(fileName));
      Object.values(data.progressions || {}).forEach((entries) => {
        (entries || []).forEach((entry) => {
          if (entry?.level_file) refs.add(entry.level_file);
        });
      });
      for (const ref of refs) {
        const base = basename(ref);
        if (seenLevelRefs.has(base)) continue;
        seenLevelRefs.add(base);
        result.checkedLevelRefs += 1;
        const resolvedUrl = await resolveExistingWorkshopLevelUrl(base);
        if (!resolvedUrl) result.missing.push({ path: base, reason: "level_reference_missing" });
      }
    }
    result.missingCount = result.missing.length;
    await saveRepoFile("reports/toolkit_startup_integrity.json", JSON.stringify(result, null, 2));
    await saveRepoFile("reports/toolkit_startup_integrity.md", startupIntegrityMarkdown(result), "text/markdown");
    setStartupIntegrityBanner(result);
    if (result.missingCount > 0) {
      log("mgr-log", `Startup integrity warning: ${result.missingCount} missing path(s). See ${displayProjectPath(result.reportPath)}.`);
      log("settings-log", `Startup integrity warning: ${result.missingCount} missing path(s).`);
    } else {
      log("settings-log", `Startup integrity OK. Audit saved to ${displayProjectPath(result.reportPath)}.`);
    }
  } catch (err) {
    const failure = `Startup integrity audit failed: ${formatParseError(err)}`;
    setStartupIntegrityBanner({
      missingCount: 1,
      missing: [{ path: "startup_audit", reason: failure }],
      reportPath: "reports/toolkit_startup_integrity.md"
    });
    log("settings-log", failure);
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
    await ensureCanonicalTutorialManagerItem(tutorialLevel, `Workspace tutorial · ${preset}`);

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
      if (progression?.locked) {
        log("mgr-log", `Skipped preset overwrite for locked liveops ${getManagerProgressionLabel(key)}.`);
        continue;
      }
      const sharedTutorialItem = getCanonicalTutorialManagerItem();
      const highestSlot = slots.reduce((max, slot, index) => {
        const explicitSlot = Number(slot?.slot);
        const normalized = progressionConfigEntryIsTutorial(slot) ? 0 : (Number.isFinite(explicitSlot) ? explicitSlot : index + 1);
        return Math.max(max, normalized);
      }, MANAGER_SLOT_COUNT - 1);
      const slotCount = Math.max(MANAGER_SLOT_COUNT, highestSlot + 1);
      progression.slots = Array(slotCount).fill(null);
      progression.lockedSlots = Array(slotCount).fill(false);
      progression.slotDifficulty = Array(slotCount).fill("");
      slots.forEach((slot, index) => {
        const explicitSlot = Number(slot?.slot);
        const slotIndex = progressionConfigEntryIsTutorial(slot)
          ? 0
          : (Number.isFinite(explicitSlot) ? explicitSlot : index + 1);
        if (slotIndex < 0 || slotIndex >= progression.slots.length) return;
        let item = null;
        if (progressionConfigEntryIsTutorial(slot)) {
          item = sharedTutorialItem;
        } else if (slot?.level_file) {
          item = itemByFilename.get(basename(slot.level_file)) || null;
        }
        if (!item) return;
        progression.slots[slotIndex] = item.id;
        progression.slotDifficulty[slotIndex] = levelDifficulty(item.level);
      });
    }
    dedupeTutorialManagerItems();
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

  bindClick("mgr-sheet-open", () => {
    const url = normalizeSpreadsheetOpenUrl(state.settings.spreadsheetWebAppUrl, state.settings.spreadsheetId);
    if (!url) {
      log("mgr-log", "Spreadsheet embed URL is empty. Set it in Settings → Spreadsheet Embed URL.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  });
  bindClick("mgr-sheet-reload", () => {
    updateManagerSpreadsheetEmbed({ forceReload: true });
  });

  document.getElementById("mgr-add-progression").addEventListener("click", () => {
    createManagerProgressionFromPrompt();
  });
  document.getElementById("mgr-rename-progression").addEventListener("click", () => {
    renameActiveProgression();
  });
  document.getElementById("mgr-duplicate-progression").addEventListener("click", () => {
    duplicateActiveProgression();
  });
  document.getElementById("mgr-toggle-liveops-lock").addEventListener("click", () => {
    toggleActiveLiveopsLock();
  });
  document.getElementById("mgr-add-slot").addEventListener("click", () => {
    addSlotToActiveProgression();
  });
  document.getElementById("mgr-remove-slot").addEventListener("click", () => {
    removeLastSlotFromActiveProgression();
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
      updateManagerTable({
        persistWorkspace: false,
        scheduleMetadata: false,
        plannerMode: "pool",
        renderCurve: false,
        renderEditorBuilder: false
      });
    });
  });
  document.getElementById("mgr-filter-reset").addEventListener("click", () => {
    state.manager.filters = createDefaultManagerFilters();
    state.manager.allLevelsPage = 1;
    updateManagerTable({
      persistWorkspace: false,
      scheduleMetadata: false,
      plannerMode: "pool",
      renderCurve: false,
      renderEditorBuilder: false
    });
  });
  document.getElementById("mgr-page-prev").addEventListener("click", () => {
    state.manager.allLevelsPage = Math.max(1, state.manager.allLevelsPage - 1);
    updateManagerTable({
      persistWorkspace: false,
      scheduleMetadata: false,
      plannerMode: "pool",
      renderCurve: false,
      renderEditorBuilder: false
    });
  });
  document.getElementById("mgr-page-next").addEventListener("click", () => {
    state.manager.allLevelsPage += 1;
    updateManagerTable({
      persistWorkspace: false,
      scheduleMetadata: false,
      plannerMode: "pool",
      renderCurve: false,
      renderEditorBuilder: false
    });
  });

  const managerImportInput = document.getElementById("mgr-import-input");
  document.getElementById("mgr-import").addEventListener("click", () => {
    managerImportInput.click();
  });

  managerImportInput.addEventListener("change", async (e) => {
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
    logManagerParseErrorRecovery(pruneStaleUnassignedManagerParseErrors());
    await ensureTutorialInAllProgressions();
    updateManagerTable();
    setManagerLoading(false);
    e.target.value = "";
  });

  document.getElementById("mgr-clear").addEventListener("click", async () => {
    const lockedSnapshot = captureLockedManagerProgressions();
    state.manager.items = [];
    state.manager.itemIndex = new Map();
    state.manager.slotIndexByItemId = new Map();
    state.manager.extraIds = [];
    state.manager.discardedIds = [];
    state.manager.progressions = createDefaultManagerProgressions();
    state.manager.progressionOrder = defaultManagerProgressions.map(({ key }) => key);
    state.manager.activeTab = state.manager.progressionOrder[0];
    state.manager.selectedId = null;
    state.manager.draggingId = null;
    state.manager.referenceIds = [];
    state.manager.filters = createDefaultManagerFilters();
    if (lockedSnapshot) {
      restoreLockedManagerProgressions(lockedSnapshot);
    }
    await ensureTutorialInAllProgressions();
    updateManagerTable();
    if (lockedSnapshot) {
      log("mgr-log", `Cleared unlocked manager content. Preserved ${lockedSnapshot.lockedKeys.length} locked liveops.`);
    }
  });

  document.getElementById("mgr-export-csv").addEventListener("click", async () => {
    try {
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
      const saved = await saveManagerOutputFile("manager/manager_levels.csv", csv, "text/csv");
      log("mgr-log", ["✓ Manager CSV exported successfully", `Saved to: ${displayProjectPath(saved.path)}`, `Items exported: ${rows.length}`]);
    } catch (err) {
      log("mgr-log", ["✗ Export failed", `Error: ${formatParseError(err)}`]);
    }
  });

  document.getElementById("mgr-export-progression-csv").addEventListener("click", async () => {
    try {
      if (!isManagerProgressionTab(state.manager.activeTab)) {
        log("mgr-log", "Open a progression tab first.");
        return;
      }
      const key = state.manager.activeTab;
      const stem = progressionExportOutputStem(key);
      const csv = toCsvFromRows(activeProgressionRows(key));
      const saved = await saveManagerOutputFile(`${stem}/${stem}_progression.csv`, csv, "text/csv");
      log("mgr-log", ["✓ Progression CSV exported successfully", `Progression: ${key}`, `Saved to: ${displayProjectPath(saved.path)}`]);
    } catch (err) {
      log("mgr-log", ["✗ Progression CSV export failed", `Error: ${formatParseError(err)}`]);
    }
  });

  document.getElementById("mgr-export-curve-png").addEventListener("click", async () => {
    try {
      if (!isManagerProgressionTab(state.manager.activeTab)) {
        log("mgr-log", "Open a progression tab first.");
        return;
      }
      const key = state.manager.activeTab;
      const stem = progressionExportOutputStem(key);
      const saved = await saveManagerOutputDataUrl(`${stem}/${stem}_difficulty_curve.png`, makeProgressionCurveDataUrl(key));
      log("mgr-log", ["✓ Difficulty curve PNG exported successfully", `Progression: ${key}`, `Saved to: ${displayProjectPath(saved.path)}`]);
    } catch (err) {
      log("mgr-log", ["✗ Difficulty curve export failed", `Error: ${formatParseError(err)}`]);
    }
  });

  document.getElementById("mgr-export-progression-png").addEventListener("click", async () => {
    try {
      if (!isManagerProgressionTab(state.manager.activeTab)) {
        log("mgr-log", "Open a progression tab first.");
        return;
      }
      const key = state.manager.activeTab;
      const stem = progressionExportOutputStem(key);
      const saved = await saveManagerOutputDataUrl(`${stem}/${stem}_progression_layout.png`, makeProgressionBoardDataUrl(key));
      log("mgr-log", ["✓ Progression layout PNG exported successfully", `Progression: ${key}`, `Saved to: ${displayProjectPath(saved.path)}`]);
    } catch (err) {
      log("mgr-log", ["✗ Progression layout export failed", `Error: ${formatParseError(err)}`]);
    }
  });

  document.getElementById("mgr-export-progression-json").addEventListener("click", async () => {
    try {
      if (!isManagerProgressionTab(state.manager.activeTab)) {
        log("mgr-log", "Open a progression tab first.");
        return;
      }
      const saved = await exportActiveProgressionZip(state.manager.activeTab);
      log("mgr-log", ["✓ Progression ZIP exported successfully", `Progression: ${state.manager.activeTab}`, `Saved to: ${displayProjectPath(saved.path)}`, `Full path: ${saved.path}`]);
    } catch (err) {
      log("mgr-log", ["✗ Progression ZIP export failed", `Error: ${formatParseError(err)}`]);
    }
  });

  document.getElementById("mgr-sync-spreadsheet").addEventListener("click", async () => {
    try {
      const saved = await syncLevelsWorkbook("manual_manager_sync");
      log("mgr-log", `Spreadsheet DB synced to ${displayProjectPath(saved.path)}${saved.pushed ? " and pushed to Google Sheets" : ""}`);
      await uploadProgressionsAfterSync();
    } catch (err) {
      log("mgr-log", `Spreadsheet DB sync failed: ${formatParseError(err)}`);
    }
  });
  document.getElementById("mgr-apply-sheet-renames").addEventListener("click", async () => {
    try {
      const result = await applySheetLevelRenames();
      const appliedCount = Array.isArray(result.applied) ? result.applied.length : 0;
      const skipped = Array.isArray(result.skipped) ? result.skipped : [];
      const skippedCount = skipped.length;
      const noPending = skipped.some((entry) => String(entry?.reason || "") === "no_pending_renames");
      if (noPending && appliedCount === 0) {
        log("mgr-log", "No pending renames were found in the Level Renames spreadsheet tab.");
        return;
      }
      const lines = [
        "✓ Sheet-driven renames applied",
        `Renamed files: ${appliedCount}`,
        `Skipped items: ${skippedCount}`,
        `Updated bundle CSVs: ${Number(result.updatedCsvs || 0)}`,
        `Updated JSON refs: ${Number(result.updatedJsonRefs || 0)}`
      ];
      if (result.syncOk) {
        lines.push("Spreadsheet refreshed from canonical bundles.");
      } else if (!result.syncSkipped) {
        lines.push(`Spreadsheet refresh warning: ${result.syncError || "unknown error"}`);
      }
      lines.push("Reload the toolkit if you want the current in-memory manager list to reflect the new filenames immediately.");
      log("mgr-log", lines);
    } catch (err) {
      log("mgr-log", `Apply sheet renames failed: ${formatParseError(err)}`);
    }
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

  document.getElementById("session-load-procedural-100").addEventListener("click", () => {
    loadProceduralPackIntoSessions();
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
      queueSessionLevel(level, `learned_${String(index + 1).padStart(2, "0")}_${levelLabel(level)}.json`, "learned");
    });
    log("session-log", `Generated ${batch.length} valid learned procedural level(s). Memory: ${state.learning.approved.length} approved, ${state.learning.rejected.length} rejected, ${state.learning.corrections.length} fixes.`);
  });

  document.getElementById("session-export-queue").addEventListener("click", async () => {
    try {
      const payload = state.sessions.queue.map((item) => ({
        file: item.file,
        source: item.source,
        review_status: item.reviewStatus,
        validation_status: item.validationStatus,
        feedback_decision: item.feedbackDecision || "",
        feedback_reason_code: item.feedbackReasonCode || "",
        feedback_keep_tags: Array.isArray(item.feedbackKeepTags) ? [...item.feedbackKeepTags] : [],
        feedback_pair_ids: Array.isArray(item.feedbackPairIds) ? [...item.feedbackPairIds] : [],
        feedback_note: item.feedbackNote || "",
        level: item.level
      }));
      const saved = await saveRepoFile("playtest/play_sessions_queue.json", JSON.stringify(payload, null, 2));
      log("session-log", ["✓ Session queue exported successfully", `Items exported: ${payload.length}`, `Saved to: ${displayProjectPath(saved.path)}`, `Full path: ${saved.path}`]);
    } catch (err) {
      log("session-log", ["✗ Session queue export failed", `Error: ${formatParseError(err)}`]);
    }
  });

  document.getElementById("session-play-reset").addEventListener("click", () => {
    resetPlayState();
    if (state.play.on) randomizePlayColors();
    drawBoard();
    log("session-log", "Session play reset.");
  });

  document.getElementById("session-play-export").addEventListener("click", async () => {
    const solvedNow = getPlayStatus() === "Solved";
    const session = solvedNow ? await saveSolvedSession("session_manual", "play_sessions") : serializePlaySession(false);
    if (!solvedNow) {
      session.saved_path = (await saveRepoFile(CANONICAL_STATE_PATHS.latestPlaytest, JSON.stringify(session, null, 2))).path;
      await appendPlaytestDatasetRecord(session, "play_sessions");
    }
    log("session-log", `Saved session play for ${levelLabel(session.level)} to ${displayProjectPath(session.saved_path)}.`);
  });

  document.getElementById("session-feedback-note").addEventListener("input", (ev) => {
    const item = getSessionFeedbackItem();
    if (!item) return;
    item.feedbackNote = ev.target.value;
    persistWorkspaceState();
  });

  document.getElementById("session-feedback-approve").addEventListener("click", () => {
    const item = getSessionFeedbackItem();
    if (!item) {
      log("session-log", "Select a level first.");
      return;
    }
    applySessionDecision(item, "approve");
  });

  document.getElementById("session-feedback-reject").addEventListener("click", () => {
    const item = getSessionFeedbackItem();
    if (!item) {
      log("session-log", "Select a level first.");
      return;
    }
    if (!item.feedbackReasonCode && !String(item.feedbackNote || "").trim()) {
      log("session-log", "Choose a reject reason or write a note first.");
      return;
    }
    applySessionDecision(item, "reject");
  });

  document.getElementById("session-feedback-send").addEventListener("click", async () => {
    const item = getSessionFeedbackItem();
    if (!item) {
      log("session-log", "Select a level first.");
      return;
    }
    try {
      await sendSessionFeedback(item);
    } catch (err) {
      log("session-log", `Could not send feedback: ${formatParseError(err)}`);
    }
  });

  updateSessionTable();
}

async function bootstrap() {
  isBootstrappingWorkspaceState = true;
  const params = new URLSearchParams(window.location.search);
  const resetWorkspaceFromUrl = params.get("reset_workspace") === "1";
  if (resetWorkspaceFromUrl) {
    [
      LEARNING_KEY,
      PLAY_SESSION_KEY,
      PLAY_SESSION_EXPORT_DIR_KEY,
      EDITOR_DRAFT_KEY,
      WORKSPACE_STATE_KEY
    ].forEach((key) => localStorage.removeItem(key));
  } else {
    await hydrateBrowserStateFromLocalStore();
  }
  loadSettings();
  applySettingsToUi();
  loadLearning();
  await restoreLearningFromRepo();
  normalizeLearningBuckets();
  saveLearning();
  applyStaticTooltips();
  window.addEventListener("beforeunload", () => {
    flushBrowserStateSync("beforeunload");
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushBrowserStateSync("page_hidden");
  });
  document.getElementById("reload-page-btn")?.addEventListener("click", () => {
    location.reload();
  });
  document.getElementById("force-sync-btn")?.addEventListener("click", async () => {
    try {
      await flushBrowserStateSync("topbar_force_sync");
      await syncLevelsWorkbook("topbar_force_sync");
      refreshVisibleView();
    } catch (err) {
      log("mgr-log", ["Force sync error", formatParseError(err)]);
    }
  });
  initNavigation();
  initSettings();
  initMain();
  initEditor();
  initSessions();
  initVitoBot();
  initManager();
  updateLearningStatus();
  log("main-log", "Ready.");
  log("ed-log", "Editor ready.");
  log("session-log", "No session levels loaded.");
  log("vitobot-log", "Choose a source, set the player profile, and run VitoBot.");
  log("mgr-log", "No files loaded.");
  log("settings-log", `Project save path:\n${displayProjectPath(state.settings.exportDir)}\n\nLevel Manager output path:\n${displayProjectPath(state.settings.managerOutputDir)}`);
  if (resetWorkspaceFromUrl) log("mgr-log", "Workspace reset from URL.");
  runStartupIntegrityAudit();
  let restoredWorkspace = restoreWorkspaceState();
  if (!restoredWorkspace) restoredWorkspace = await restoreWorkspaceStateFromRepo();
  if (!restoredWorkspace) restoreEditorDraft();
  if (!restoredWorkspace) applySettingsToEditorDefaults();
  logManagerParseErrorRecovery(pruneStaleUnassignedManagerParseErrors());
  syncEditorInputs();
  isBootstrappingWorkspaceState = false;
  persistWorkspaceState();
  await autoloadManagerFromQuery();
  await autoloadWorkspaceFromQuery();
  await autoloadLevelFromQuery();
  await ensureTutorialInAllProgressions();
  await pushBrowserStateToLocalStore("bootstrap_snapshot").catch(() => {});
  refreshVisibleView();
}

bootstrap();

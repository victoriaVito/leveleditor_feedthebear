#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PAIR_IDS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const MIN_BOARD_SIZE = 4;
const MAX_BOARD_WIDTH = 7;
const MAX_BOARD_HEIGHT = 8;

const densityRanges = {
  HIGH: [6, 20],
  "MEDIUM-HIGH": [3, 5],
  MEDIUM: [2, 4],
  "MEDIUM-LOW": [2, 3],
  LOW: [2, 2],
  "VERY-LOW": [2, 2],
  SINGLE: [1, 1],
  "LOW-MEDIUM": [2, 4],
};

const difficultyToDensity = {
  EASY: ["HIGH", "MEDIUM-HIGH"],
  MEDIUM: ["MEDIUM", "MEDIUM-LOW"],
  HARD: ["LOW", "VERY-LOW", "SINGLE", "LOW-MEDIUM"],
};

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
  { tag: "bad_layout", patterns: [/bad\s*layout/, /better\s*layout/, /ugly/, /feo/, /layout\s*issue/, /mal\s*diseno/, /mala\s*distribucion/] },
];

function parseArgs(argv) {
  const out = {
    jsonPath: null,
    limit: Infinity,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (arg === "--json") {
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        out.jsonPath = next;
        i += 1;
      } else {
        out.jsonPath = path.join(ROOT, "output", "procedural", "replay_procedural_learning_scorer.json");
      }
      continue;
    }
    if (arg.startsWith("--json=")) {
      out.jsonPath = arg.slice("--json=".length) || path.join(ROOT, "output", "procedural", "replay_procedural_learning_scorer.json");
      continue;
    }
    if (arg === "--limit") {
      const next = Number(argv[i + 1]);
      if (Number.isFinite(next) && next > 0) {
        out.limit = Math.floor(next);
        i += 1;
      }
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const next = Number(arg.slice("--limit=".length));
      if (Number.isFinite(next) && next > 0) out.limit = Math.floor(next);
      continue;
    }
  }

  return out;
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/replay_procedural_learning_scorer.mjs [--json [path]] [--limit N]",
    "",
    "What it does:",
    "  - loads the current learning memory",
    "  - resolves historical examples to full level objects when possible",
    "  - replays the current procedural scorer",
    "  - reports coverage, drift, and score separation",
  ].join("\n"));
}

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { __error: error };
  }
}

function walkJsonFiles(rootDir) {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;

  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
        out.push(full);
      }
    }
  }
  return out;
}

function displayPath(filePath) {
  return path.relative(ROOT, filePath) || path.basename(filePath);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function coordKey(r, c) {
  return `${r},${c}`;
}

function sameCell(a, b) {
  return !!a && !!b && a[0] === b[0] && a[1] === b[1];
}

function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function densityMatch(label, count) {
  const [lo, hi] = densityRanges[label] || [1, 20];
  return count >= lo && count <= hi;
}

function levelWidth(level) {
  return Number(level?.gridSize?.cols || level?.gridSize?.width || level?.board_width || level?.board_size || level?.grid?.[0]?.length || 0);
}

function levelHeight(level) {
  return Number(level?.gridSize?.rows || level?.gridSize?.height || level?.board_height || level?.board_size || level?.grid?.length || 0);
}

function levelTier(level) {
  const explicitTier = Number(level?.difficultyTier);
  if (Number.isFinite(explicitTier) && explicitTier >= 1) return explicitTier;
  const explicitLevel = Number(level?.level);
  if (Number.isFinite(explicitLevel) && explicitLevel >= 1) return explicitLevel;
  const width = levelWidth(level);
  const height = levelHeight(level);
  return Math.min(10, Math.max(1, Math.ceil((width + height) / 2) || 1));
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

function normalizeCell(value) {
  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
    return null;
  }
  if (value && typeof value === "object") {
    const x = Number(value.x ?? value.row ?? value.r ?? value[0]);
    const y = Number(value.y ?? value.col ?? value.c ?? value[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
  }
  return null;
}

function normalizeCellList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((cell) => normalizeCell(cell)).filter(Boolean);
}

function normalizeBlockers(value) {
  if (Array.isArray(value)) return normalizeCellList(value);
  if (value && typeof value === "object") {
    if (Array.isArray(value.cells)) return normalizeCellList(value.cells);
    if (Array.isArray(value.positions)) return normalizeCellList(value.positions);
    if (Array.isArray(value.items)) return normalizeCellList(value.items);
  }
  return [];
}

function normalizePairs(level) {
  const rawPairs = Array.isArray(level?.pairs) ? level.pairs : [];
  const goldenKeys = Object.keys(levelGoldenPath(level));
  return rawPairs.map((pair, index) => {
    const start = normalizeCell(pair?.start ?? pair?.a ?? pair?.from ?? pair?.begin ?? pair?.nodeA ?? pair?.pointA);
    const end = normalizeCell(pair?.end ?? pair?.b ?? pair?.to ?? pair?.finish ?? pair?.nodeB ?? pair?.pointB);
    const fallbackId = goldenKeys[index] || String.fromCharCode(65 + index);
    const id = String(pair?.id || pair?.pair_id || pair?.key || fallbackId).trim().toUpperCase() || fallbackId;
    return { ...pair, id, start, end };
  }).filter((pair) => Array.isArray(pair.start) && Array.isArray(pair.end));
}

function normalizeGoldenPath(value) {
  const out = {};
  if (!value || typeof value !== "object") return out;
  Object.entries(value).forEach(([key, cells]) => {
    out[String(key)] = normalizeCellList(cells);
  });
  return out;
}

function normalizeLevelData(level) {
  if (!level || typeof level !== "object") return level;
  const normalizedGoldenPath = normalizeGoldenPath(levelGoldenPath(level));
  return {
    ...level,
    pairs: normalizePairs({ ...level, goldenPath: normalizedGoldenPath, golden_path: normalizedGoldenPath }),
    blockers: normalizeBlockers(level.blockers),
    goldenPath: normalizedGoldenPath,
    golden_path: normalizedGoldenPath,
  };
}

function levelLabel(level, preferredName = "") {
  const id = String(level?.id || "").trim();
  if (id) return id;
  return String(preferredName || level?.meta?.source_name || `level_${level?.level || 1}.json`);
}

function extractFeatures(level) {
  const normalizedBlockers = normalizeBlockers(level?.blockers);
  return {
    level: levelTier(level),
    boardWidth: levelWidth(level),
    boardHeight: levelHeight(level),
    pairs: Array.isArray(level?.pairs) ? level.pairs.length : 0,
    blockers: normalizedBlockers.length,
    moves: Number(level?.moves || 0),
    solutions: levelSolutionCount(level),
  };
}

function featureSignature(features) {
  return JSON.stringify({
    level: Number(features?.level || 0),
    boardWidth: Number(features?.boardWidth || 0),
    boardHeight: Number(features?.boardHeight || 0),
    pairs: Number(features?.pairs || 0),
    blockers: Number(features?.blockers || 0),
    moves: Number(features?.moves || 0),
    solutions: Number(features?.solutions || 0),
  });
}

function levelSignature(level) {
  return featureSignature(extractFeatures(level));
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

function isEdgeCell(width, height, cell) {
  if (!Array.isArray(cell) || cell.length < 2) return false;
  return cell[0] === 0 || cell[1] === 0 || cell[0] === (height - 1) || cell[1] === (width - 1);
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
  const blockers = normalizeBlockers(level?.blockers);
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
  const pairMap = new Map(normalizePairs(level).map((pair) => [pair.id, pair]));
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
  const pairPaths = pairs.map((pair) => ({
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

function extractMechanicSignals(level) {
  const width = levelWidth(level);
  const height = levelHeight(level);
  const blockers = normalizeBlockers(level?.blockers);
  const pairs = normalizePairs(level);
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

  const pairSpan = pairs.reduce((acc, pair) => {
    if (!Array.isArray(pair?.start) || !Array.isArray(pair?.end)) return acc;
    return acc + manhattan(pair.start, pair.end);
  }, 0) / Math.max(1, pairs.length);
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
    pathCoverage: levelPathCoverageRatio(level),
    uncoveredFreeCells: Math.max(0, (width * height - blockers.length) - levelGoldenPathCellCount(level)),
    totalBends: pathSignals.totalBends,
    totalExcessBends: pathSignals.totalExcessBends,
    bendsPerPair: pathSignals.bendsPerPair,
    excessBendsPerPair: pathSignals.excessBendsPerPair,
    bendPressure: pathSignals.bendPressure,
    pathStraightness: pathSignals.straightness
  };
}

function analyzeSolutionGuide(level) {
  const golden = level?.golden_path || level?.goldenPath || {};
  const width = levelWidth(level);
  const height = levelHeight(level);
  const blockerSet = new Set(normalizeBlockers(level?.blockers).map(([r, c]) => coordKey(r, c)));
  const normalizedPairs = normalizePairs(level);
  const pairMap = Object.fromEntries(normalizedPairs.filter((pair) => pair && pair.id).map((pair) => [pair.id, pair]));
  const endpointOwner = new Map();

  normalizedPairs.forEach((pair) => {
    if (!Array.isArray(pair?.start) || !Array.isArray(pair?.end)) return;
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
    isClean: issues.size === 0,
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

function inferLearningTags(reasonCode = "", rawText = "", keepTags = []) {
  const tags = new Set(Array.isArray(keepTags) ? keepTags.filter(Boolean) : []);
  const normalizedReasonCode = String(reasonCode || "").trim();
  const text = normalizeText(`${reasonCode || ""} ${rawText || ""}`);
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
  };
}

function loadLearningState() {
  const primary = path.join(ROOT, ".local", "toolkit_state", "learning_state.json");
  const bundle = path.join(ROOT, ".local", "browser_state_exports", "latest_browser_state_bundle.json");

  const fromRepo = readJsonIfExists(primary);
  if (fromRepo && !fromRepo.__error) {
    return {
      source: "repo_learning_state",
      path: primary,
      payload: fromRepo,
    };
  }

  const bundleData = readJsonIfExists(bundle);
  if (bundleData && !bundleData.__error) {
    const snapshot = (((bundleData || {}).snapshots || {}).learning || {});
    const payload = snapshot.payload;
    if (payload && typeof payload === "object") {
      return {
        source: "browser_state_bundle",
        path: bundle,
        payload,
      };
    }
  }

  throw new Error("No procedural learning snapshot found in repo state or browser bundle.");
}

function loadLearningBuckets() {
  const loaded = loadLearningState();
  const payload = loaded.payload || {};
  return {
    source: loaded.source,
    path: loaded.path,
    approved: (Array.isArray(payload.approved) ? payload.approved : []).map((entry) => normalizeLearningEntry(entry, "approve")),
    rejected: (Array.isArray(payload.rejected) ? payload.rejected : []).map((entry) => normalizeLearningEntry(entry, "reject")),
    corrections: Array.isArray(payload.corrections) ? payload.corrections : [],
  };
}

function isLevelLike(value) {
  return !!value
    && typeof value === "object"
    && Array.isArray(value.pairs)
    && Array.isArray(value.blockers)
    && (
      value.gridSize
      || value.board_width !== undefined
      || value.board_height !== undefined
      || value.board_size !== undefined
      || Array.isArray(value.grid)
    );
}

function scoreCandidateWithLearning(level, learning) {
  const f = extractFeatures(level);
  const signals = extractMechanicSignals(level);
  const guide = analyzeSolutionGuide(level);
  const approvedEntriesSame = learning.approved.filter((x) => x.level === f.level);
  const rejectedEntriesSame = learning.rejected.filter((x) => x.level === f.level);
  const approvedSame = approvedEntriesSame.map((x) => x.features).filter(Boolean);
  const rejectedSame = rejectedEntriesSame.map((x) => x.features).filter(Boolean);
  const approvedGlobal = learning.approved.map((x) => x.features).filter(Boolean);
  const rejectedGlobal = learning.rejected.map((x) => x.features).filter(Boolean);
  const correctedGlobal = learning.corrections.map((x) => x.corrected_features).filter(Boolean);
  const rejectedPairFeedback = learning.rejected.flatMap((entry) => (Array.isArray(entry.pair_feedback) ? entry.pair_feedback : []));
  const rejectedReasonCounts = learning.rejected.reduce((acc, entry) => {
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
  const approvedTagCounts = learningTagCounts(approvedEntriesSame.length ? approvedEntriesSame : learning.approved);
  const rejectedTagCounts = learningTagCounts(rejectedEntriesSame.length ? rejectedEntriesSame : learning.rejected);
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
    solutions: sum.solutions / validRows.length,
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

function learningTagCounts(entries) {
  return (entries || []).reduce((acc, entry) => {
    (entry?.feedback_tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});
}

function extractPairFeedback(level, pairIds = []) {
  const width = Math.max(1, levelWidth(level));
  const height = Math.max(1, levelHeight(level));
  const blockerSet = new Set(normalizeBlockers(level?.blockers).map(([r, c]) => coordKey(r, c)));
  const selected = new Set(pairIds.map((pairId) => String(pairId || "").toUpperCase()).filter(Boolean));
  const pool = normalizePairs(level).filter((pair) => selected.size === 0 || selected.has(String(pair.id || "").toUpperCase()));
  return pool.map((pair) => {
    const start = pair.start;
    const end = pair.end;
    return {
      pair_id: String(pair.id || "").toUpperCase(),
      manhattan: Array.isArray(start) && Array.isArray(end) ? manhattan(start, end) : 0,
      start_edge: isEdgeCell(width, height, start) ? 1 : 0,
      end_edge: isEdgeCell(width, height, end) ? 1 : 0,
      start_blockers: adjacentBlockerCount(blockerSet, width, height, start),
      end_blockers: adjacentBlockerCount(blockerSet, width, height, end),
      midpoint_r: Array.isArray(start) && Array.isArray(end) ? (start[0] + end[0]) / (2 * Math.max(1, height - 1)) : 0,
      midpoint_c: Array.isArray(start) && Array.isArray(end) ? (start[1] + end[1]) / (2 * Math.max(1, width - 1)) : 0,
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

function countSolutions(boardWidth, boardHeight, pairs, blockers, cap = 20) {
  const safePairs = Array.isArray(pairs) ? pairs.filter((pair) => Array.isArray(pair?.start) && Array.isArray(pair?.end)) : [];
  const blockedSet = new Set(normalizeBlockers(blockers).map(([r, c]) => coordKey(r, c)));
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
    if (idx === safePairs.length) return 1;
    const hash = `${idx}|${Array.from(occ).sort().join(";")}`;
    if (memo.has(hash)) return memo.get(hash);

    const p = safePairs[idx];
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
  const safePairs = Array.isArray(pairs) ? pairs.filter((pair) => Array.isArray(pair?.start) && Array.isArray(pair?.end)) : [];
  const blockedSet = new Set(normalizeBlockers(blockers).map(([r, c]) => coordKey(r, c)));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

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

  function dfs(idx, occ, solution) {
    if (idx === safePairs.length) return solution;
    const p = safePairs[idx];
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

function hasFullCoverSolution(boardWidth, boardHeight, pairs, blockers) {
  const safePairs = Array.isArray(pairs) ? pairs.filter((pair) => Array.isArray(pair?.start) && Array.isArray(pair?.end)) : [];
  const blockedSet = new Set(normalizeBlockers(blockers).map(([r, c]) => coordKey(r, c)));
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

  function dfs(idx, occ, occupiedFreeCells) {
    if (occupiedFreeCells >= totalFreeCells) return true;
    if (idx === safePairs.length) return occupiedFreeCells >= totalFreeCells;
    const hash = `${idx}|${occupiedFreeCells}|${Array.from(occ).sort().join(";")}`;
    if (memo.has(hash)) return memo.get(hash);

    const p = safePairs[idx];
    const startK = coordKey(p.start[0], p.start[1]);
    const endK = coordKey(p.end[0], p.end[1]);
    const localOcc = new Set(occ);
    localOcc.add(startK);
    const paths = enumeratePairPaths(p.start, p.end, localOcc, 200);

    for (const path of paths) {
      const nextOcc = new Set(occ);
      let nextOccupiedFreeCells = occupiedFreeCells;
      path.forEach(([r, c]) => {
        const k = coordKey(r, c);
        if (k !== endK && !nextOcc.has(k)) {
          nextOcc.add(k);
          nextOccupiedFreeCells += 1;
        }
      });
      if (dfs(idx + 1, nextOcc, nextOccupiedFreeCells)) {
        memo.set(hash, true);
        return true;
      }
    }

    memo.set(hash, false);
    return false;
  }

  return dfs(0, blockedSet, blockedSet.size);
}

function validateLevel(level) {
  const errors = [];
  if (!(levelTier(level) >= 1 && levelTier(level) <= 10)) errors.push("level 1..10 required");
  const width = levelWidth(level);
  const height = levelHeight(level);
  if (!(width >= MIN_BOARD_SIZE && width <= MAX_BOARD_WIDTH && height >= MIN_BOARD_SIZE && height <= MAX_BOARD_HEIGHT)) {
    errors.push("board size exceeds limit: width must be 4..7 and height must be 4..8 (max 7x8)");
  }

  const pairs = normalizePairs(level);
  if (pairs.length < 2 || pairs.length > PAIR_IDS.length) errors.push(`pairs count must be 2..${PAIR_IDS.length}`);

  const used = new Set();
  for (const p of pairs) {
    if (!p || !p.id || !Array.isArray(p.start) || !Array.isArray(p.end)) {
      errors.push("invalid pair definition");
      continue;
    }
    const coords = [p.start, p.end];
    for (const c of coords) {
      if (!c || c[0] < 0 || c[1] < 0 || c[0] >= height || c[1] >= width) errors.push(`pair ${p.id} out of bounds`);
      const k = coordKey(c[0], c[1]);
      if (used.has(k)) errors.push(`node overlap at ${k}`);
      used.add(k);
    }
  }
  for (const b of normalizeBlockers(level?.blockers)) {
    if (!Array.isArray(b) || b.length < 2) {
      errors.push("invalid blocker definition");
      continue;
    }
    if (b[0] < 0 || b[1] < 0 || b[0] >= height || b[1] >= width) errors.push(`blocker out of bounds ${b}`);
    if (used.has(coordKey(b[0], b[1]))) errors.push(`blocker overlaps node ${b}`);
  }

  const moves = Number(level?.moves);
  if (!Number.isFinite(moves)) {
    errors.push("moves must be a valid number");
  } else {
    if (moves < 0) errors.push("moves must be >= 0");
    if (moves < pairs.length) {
      errors.push(`moves must be >= active pairs count (${pairs.length}); current moves: ${moves}`);
    }
  }

  const storedValidation = level?.validation && typeof level.validation === "object" ? level.validation : {};
  const storedSolutionCount = Number(level?.solutionCount ?? level?.solution_count);
  const actualSolutionCount = Number.isFinite(storedSolutionCount) && storedSolutionCount >= 0
    ? storedSolutionCount
    : countSolutions(width, height, pairs, level?.blockers || [], 20);
  const solvable = typeof storedValidation.solvable === "boolean" ? storedValidation.solvable : actualSolutionCount >= 1;
  if (!solvable) errors.push("level is impossible with the current layout");
  const decalRequired = !!level?.decal;
  const decalPass = decalRequired
    ? (typeof storedValidation.decal_pass === "boolean"
      ? storedValidation.decal_pass
      : hasFullCoverSolution(width, height, pairs, level?.blockers || []))
    : null;
  if (decalRequired && !decalPass) errors.push("decal requires a full-board solution that covers every free cell");

  return {
    valid: errors.length === 0,
    errors,
    solutionCount: actualSolutionCount,
    solvable,
    decalRequired,
    decalPass,
  };
}

function collectLearningSourceMix(learning) {
  const counts = new Map();
  const rows = [...learning.approved.map((entry) => ({ bucket: "approved", entry })), ...learning.rejected.map((entry) => ({ bucket: "rejected", entry }))];
  rows.forEach(({ entry }) => {
    const family = sourceFamily(entry);
    counts.set(family, (counts.get(family) || 0) + 1);
  });
  return counts;
}

function sourceFamily(entry) {
  const context = String(entry?.context || "");
  if (context.startsWith("session:")) return "session";
  if (context === "editor_pattern") return "editor_pattern";
  if (context === "editor_solved_session") return "editor_solved_session";
  if (context === "reference_save") return "reference_save";
  if (context === "reference_discard") return "reference_discard";
  if (context.includes("corrected")) return "correction";
  return "other";
}

function artifactSurface(artifact) {
  const rel = displayPath(artifact.path || "");
  if (rel.startsWith("playtest/")) return "playtest";
  if (rel.startsWith("levels/")) return "levels";
  if (rel.startsWith("bundles/")) return "bundles";
  if (rel.startsWith("archive/")) return "archive";
  return "other";
}

function pathRank(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized.startsWith("levels/") && !normalized.includes("/.backups/")) return 0;
  if (normalized.startsWith("bundles/")) return 1;
  if (normalized.startsWith("playtest/")) return 2;
  if (normalized.startsWith("archive/")) return 3;
  if (normalized.includes("/.backups/")) return 4;
  return 5;
}

function buildArtifactIndex() {
  const roots = [
    path.join(ROOT, "levels"),
    path.join(ROOT, "bundles"),
    path.join(ROOT, "archive"),
  ];
  const artifacts = [];

  for (const root of roots) {
    for (const filePath of walkJsonFiles(root)) {
      const parsed = readJsonIfExists(filePath);
      if (!parsed || parsed.__error || !isLevelLike(parsed)) continue;
      const normalized = normalizeLevelData(parsed);
      const artifact = {
        path: filePath,
        data: normalized,
        name: path.basename(filePath),
        signature: levelSignature(normalized),
        features: extractFeatures(normalized),
        label: levelLabel(normalized, path.basename(filePath)),
        surface: artifactSurface({ path: filePath }),
        rank: pathRank(displayPath(filePath)),
      };
      artifacts.push(artifact);
    }
  }

  const playtestLatestPath = path.join(ROOT, "playtest", "latest_play_session.json");
  const latest = readJsonIfExists(playtestLatestPath);
  if (latest && !latest.__error && isLevelLike(latest.level)) {
    const normalizedLevel = normalizeLevelData(latest.level);
    const artifact = {
      path: `${playtestLatestPath}#session`,
      data: normalizedLevel,
      name: path.basename(playtestLatestPath),
      signature: levelSignature(normalizedLevel),
      features: extractFeatures(normalizedLevel),
      label: normalizedLevel.id || normalizedLevel.meta?.source_name || path.basename(playtestLatestPath),
      surface: "playtest",
      rank: 2,
    };
    artifacts.push(artifact);
  }

  const playtestJsonlPath = path.join(ROOT, "playtest", "playtest_events.jsonl");
  if (fs.existsSync(playtestJsonlPath)) {
    const lines = fs.readFileSync(playtestJsonlPath, "utf8").split(/\n+/);
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      try {
        const row = JSON.parse(line);
        const level = row?.session?.level;
        if (!isLevelLike(level)) return;
        const normalizedLevel = normalizeLevelData(level);
        const artifact = {
          path: `${playtestJsonlPath}#${index + 1}`,
          data: normalizedLevel,
          name: row.level_name || normalizedLevel.id || `playtest_line_${index + 1}`,
          signature: levelSignature(normalizedLevel),
          features: extractFeatures(normalizedLevel),
          label: row.level_name || normalizedLevel.id || `playtest_line_${index + 1}`,
          surface: "playtest",
          rank: 2,
        };
        artifacts.push(artifact);
      } catch (_error) {
        // Ignore malformed lines so the script stays resilient.
      }
    });
  }

  const byPath = new Map();
  const byBaseName = new Map();
  const bySignature = new Map();

  artifacts.forEach((artifact) => {
    const rel = displayPath(artifact.path);
    byPath.set(rel, artifact);
    byPath.set(path.resolve(artifact.path), artifact);
    const base = path.basename(rel).toLowerCase();
    if (!byBaseName.has(base)) byBaseName.set(base, []);
    byBaseName.get(base).push(artifact);
    if (!bySignature.has(artifact.signature)) bySignature.set(artifact.signature, []);
    bySignature.get(artifact.signature).push(artifact);
  });

  return {
    artifacts,
    byPath,
    byBaseName,
    bySignature,
  };
}

function normalizePathCandidate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (path.isAbsolute(trimmed)) return trimmed;
  return path.resolve(ROOT, trimmed.replace(/^\.\/+/, ""));
}

function maybeDirectArtifactCandidate(rawPath, index) {
  const absolute = normalizePathCandidate(rawPath);
  if (!absolute) return null;
  if (fs.existsSync(absolute)) {
    const parsed = readJsonIfExists(absolute);
    if (parsed && !parsed.__error && isLevelLike(parsed)) {
      const normalized = normalizeLevelData(parsed);
      return {
        artifact: {
          path: absolute,
          data: normalized,
          name: path.basename(absolute),
          signature: levelSignature(normalized),
          features: extractFeatures(normalized),
          label: levelLabel(normalized, path.basename(absolute)),
          surface: artifactSurface({ path: absolute }),
          rank: pathRank(displayPath(absolute)),
        },
        reason: "direct_path",
      };
    }
  }

  const rel = displayPath(absolute);
  const exact = index.byPath.get(rel) || index.byPath.get(absolute) || null;
  if (exact) {
    return { artifact: exact, reason: "indexed_path" };
  }
  return null;
}

function resolveLevelArtifact(entry, index) {
  const reasons = [];
  const candidates = [];

  const directPathFields = [entry?.saved_path, entry?.source_file];
  for (const field of directPathFields) {
    const direct = maybeDirectArtifactCandidate(field, index);
    if (direct) {
      candidates.push({ artifact: direct.artifact, reason: direct.reason, confidence: 100 });
      reasons.push(direct.reason);
    }
  }

  if (!candidates.length && entry?.source_file) {
    const base = path.basename(String(entry.source_file)).toLowerCase();
    const baseCandidates = index.byBaseName.get(base) || [];
    if (baseCandidates.length === 1) {
      candidates.push({ artifact: baseCandidates[0], reason: "basename_unique", confidence: 90 });
      reasons.push("basename_unique");
    } else if (baseCandidates.length > 1) {
      const exactFeatureMatches = baseCandidates.filter((artifact) => artifact.signature === featureSignature(entry.features));
      if (exactFeatureMatches.length === 1) {
        candidates.push({ artifact: exactFeatureMatches[0], reason: "basename_feature_unique", confidence: 85 });
        reasons.push("basename_feature_unique");
      } else {
        reasons.push(`basename_ambiguous:${baseCandidates.length}`);
      }
    }
  }

  if (!candidates.length) {
    const signature = featureSignature(entry.features);
    const sigCandidates = index.bySignature.get(signature) || [];
    if (sigCandidates.length === 1) {
      candidates.push({ artifact: sigCandidates[0], reason: "feature_signature_unique", confidence: 80 });
      reasons.push("feature_signature_unique");
    } else if (sigCandidates.length > 1) {
      const sorted = [...sigCandidates].sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path));
      const best = sorted[0];
      const sameRank = sorted.filter((artifact) => artifact.rank === best.rank);
      if (sameRank.length === 1) {
        candidates.push({ artifact: best, reason: "feature_signature_ranked", confidence: 70 });
        reasons.push("feature_signature_ranked");
      } else {
        reasons.push(`feature_signature_ambiguous:${sigCandidates.length}`);
      }
    }
  }

  if (!candidates.length) {
    return { resolved: null, reasons };
  }

  const chosen = candidates[0];
  const level = chosen.artifact.data;
  const currentFeatures = extractFeatures(level);
  const drift = featureDistance(entry.features, currentFeatures);
  const validation = validateLevel(level);

  return {
    resolved: {
      level,
      artifact: chosen.artifact,
      resolutionReason: chosen.reason,
      resolutionConfidence: chosen.confidence,
      resolvedFeatures: currentFeatures,
      drift,
      validation,
      sourceSurface: chosen.artifact.surface,
    },
    reasons,
  };
}

function cloneStatsSeed() {
  return {
    count: 0,
    approved: 0,
    rejected: 0,
    unresolved: 0,
    invalid: 0,
    driftTotal: 0,
    driftMax: 0,
    scoreTotal: 0,
    scoreMin: Number.POSITIVE_INFINITY,
    scoreMax: Number.NEGATIVE_INFINITY,
    scores: [],
  };
}

function accumulateStats(stats, item) {
  stats.count += 1;
  if (item.bucket === "approved") stats.approved += 1;
  if (item.bucket === "rejected") stats.rejected += 1;
  if (!item.resolved) stats.unresolved += 1;
  if (item.validation && !item.validation.valid) stats.invalid += 1;
  if (Number.isFinite(item.drift)) {
    stats.driftTotal += item.drift;
    stats.driftMax = Math.max(stats.driftMax, item.drift);
  }
  if (Number.isFinite(item.score)) {
    stats.scoreTotal += item.score;
    stats.scoreMin = Math.min(stats.scoreMin, item.score);
    stats.scoreMax = Math.max(stats.scoreMax, item.score);
    stats.scores.push(item.score);
  }
}

function finalizeStats(stats) {
  const meanScore = stats.scores.length ? stats.scoreTotal / stats.scores.length : null;
  return {
    count: stats.count,
    approved: stats.approved,
    rejected: stats.rejected,
    unresolved: stats.unresolved,
    invalid: stats.invalid,
    meanDrift: stats.count - stats.unresolved ? stats.driftTotal / Math.max(1, stats.count - stats.unresolved) : null,
    maxDrift: stats.driftMax || null,
    meanScore,
    minScore: stats.scoreMin === Number.POSITIVE_INFINITY ? null : stats.scoreMin,
    maxScore: stats.scoreMax === Number.NEGATIVE_INFINITY ? null : stats.scoreMax,
  };
}

function median(values) {
  const filtered = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!filtered.length) return null;
  const mid = Math.floor(filtered.length / 2);
  return filtered.length % 2 === 0 ? (filtered[mid - 1] + filtered[mid]) / 2 : filtered[mid];
}

function mean(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return null;
  return filtered.reduce((acc, value) => acc + value, 0) / filtered.length;
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return "n/a";
  return value.toFixed(digits);
}

function buildReplayReport() {
  const learning = loadLearningBuckets();
  const artifactIndex = buildArtifactIndex();
  const allEntries = [
    ...learning.approved.map((entry) => ({ bucket: "approved", entry })),
    ...learning.rejected.map((entry) => ({ bucket: "rejected", entry })),
  ];

  const resolvedRows = [];
  const unresolvedRows = [];
  const familyMix = new Map();
  const duplicateSignatures = new Map();

  allEntries.forEach(({ bucket, entry }, index) => {
    const family = sourceFamily(entry);
    const driftKey = `${bucket}|${family}|${featureSignature(entry.features)}`;
    duplicateSignatures.set(driftKey, (duplicateSignatures.get(driftKey) || 0) + 1);

    const resolution = resolveLevelArtifact(entry, artifactIndex);
    if (!resolution.resolved) {
      unresolvedRows.push({
        index,
        bucket,
        family,
        context: entry.context,
        reasons: resolution.reasons,
        features: entry.features,
      });
      return;
    }

    const level = resolution.resolved.level;
    const score = scoreCandidateWithLearning(level, learning);
    const validation = resolution.resolved.validation;
    const resolvedFeatures = resolution.resolved.resolvedFeatures;
    const storedFeatures = entry.features || null;
    const drift = Number.isFinite(storedFeatures ? featureDistance(storedFeatures, resolvedFeatures) : NaN)
      ? featureDistance(storedFeatures, resolvedFeatures)
      : null;
    const featureMismatch = storedFeatures ? JSON.stringify(storedFeatures) !== JSON.stringify(resolvedFeatures) : false;

    const row = {
      index,
      bucket,
      family,
      context: entry.context,
      sourceFile: entry.source_file || "",
      savedPath: entry.saved_path || "",
      resolutionReason: resolution.resolved.resolutionReason,
      sourceSurface: resolution.resolved.sourceSurface,
      artifactPath: displayPath(resolution.resolved.artifact.path),
      score,
      drift,
      validation,
      featureMismatch,
      storedFeatures,
      resolvedFeatures,
    };
    resolvedRows.push(row);

    if (!familyMix.has(family)) familyMix.set(family, cloneStatsSeed());
    accumulateStats(familyMix.get(family), row);
  });

  const approvedRows = resolvedRows.filter((row) => row.bucket === "approved");
  const rejectedRows = resolvedRows.filter((row) => row.bucket === "rejected");
  const approvedScores = approvedRows.map((row) => row.score);
  const rejectedScores = rejectedRows.map((row) => row.score);
  const approvedDrifts = approvedRows.map((row) => row.drift);
  const rejectedDrifts = rejectedRows.map((row) => row.drift);
  const pairwiseComparisons = [];
  let approvedWins = 0;
  let totalPairs = 0;
  for (const approved of approvedRows) {
    for (const rejected of rejectedRows) {
      totalPairs += 1;
      const win = approved.score > rejected.score;
      if (win) approvedWins += 1;
      pairwiseComparisons.push(approved.score - rejected.score);
    }
  }

  const familyStats = Object.fromEntries(
    [...familyMix.entries()].map(([family, stats]) => [family, finalizeStats(stats)])
  );

  const duplicateFamilies = [...duplicateSignatures.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([signature, count]) => ({ signature, count }));

  const validationMismatches = resolvedRows.filter((row) => row.validation && !row.validation.valid);
  const solutionCountDrift = resolvedRows.filter((row) => row.storedFeatures && row.resolvedFeatures && row.storedFeatures.solutions !== row.resolvedFeatures.solutions);

  const overall = {
    source: learning.source,
    learningPath: learning.path,
    totalEntries: allEntries.length,
    approvedEntries: learning.approved.length,
    rejectedEntries: learning.rejected.length,
    correctionsEntries: learning.corrections.length,
    resolvedEntries: resolvedRows.length,
    unresolvedEntries: unresolvedRows.length,
    coverage: allEntries.length ? resolvedRows.length / allEntries.length : 0,
    approvedResolved: approvedRows.length,
    rejectedResolved: rejectedRows.length,
    resolvedInvalid: validationMismatches.length,
    resolvedSolutionCountDrift: solutionCountDrift.length,
    pairwiseApprovalWinRate: totalPairs ? approvedWins / totalPairs : null,
    approvedScoreMean: mean(approvedScores),
    rejectedScoreMean: mean(rejectedScores),
    approvedScoreMedian: median(approvedScores),
    rejectedScoreMedian: median(rejectedScores),
    approvedScoreMin: approvedScores.length ? Math.min(...approvedScores) : null,
    approvedScoreMax: approvedScores.length ? Math.max(...approvedScores) : null,
    rejectedScoreMin: rejectedScores.length ? Math.min(...rejectedScores) : null,
    rejectedScoreMax: rejectedScores.length ? Math.max(...rejectedScores) : null,
    approvedDriftMean: mean(approvedDrifts),
    rejectedDriftMean: mean(rejectedDrifts),
    approvedDriftMedian: median(approvedDrifts),
    rejectedDriftMedian: median(rejectedDrifts),
  };

  return {
    overall,
    familyStats,
    sourceMix: Object.fromEntries([...collectLearningSourceMix(learning).entries()].sort((a, b) => b[1] - a[1])),
    duplicates: duplicateFamilies,
    unresolved: unresolvedRows,
    resolvedSamples: resolvedRows
      .slice()
      .sort((a, b) => Math.abs((b.drift || 0)) - Math.abs((a.drift || 0)))
      .slice(0, 12),
    replayRows: resolvedRows,
    pairwiseComparisons,
  };
}

function printReport(report) {
  const { overall, familyStats, sourceMix, duplicates, unresolved, resolvedSamples } = report;
  console.log("Procedural learning scorer replay");
  console.log(`Learning source: ${overall.source} (${displayPath(overall.learningPath)})`);
  console.log(`Entries: ${overall.totalEntries} total, ${overall.resolvedEntries} resolved, ${overall.unresolvedEntries} unresolved, coverage ${formatNumber(overall.coverage * 100, 1)}%`);
  console.log(`Buckets: ${overall.approvedEntries} approved, ${overall.rejectedEntries} rejected, ${overall.correctionsEntries} corrections`);
  console.log(`Replay: ${overall.approvedResolved} approved resolved, ${overall.rejectedResolved} rejected resolved, pairwise approval win rate ${formatNumber((overall.pairwiseApprovalWinRate || 0) * 100, 1)}%`);
  console.log(`Scores: approved mean ${formatNumber(overall.approvedScoreMean)}, rejected mean ${formatNumber(overall.rejectedScoreMean)}, median gap ${formatNumber((overall.approvedScoreMedian || 0) - (overall.rejectedScoreMedian || 0))}`);
  console.log(`Drift: approved mean ${formatNumber(overall.approvedDriftMean)}, rejected mean ${formatNumber(overall.rejectedDriftMean)}, invalid resolved ${overall.resolvedInvalid}, solution-count drift ${overall.resolvedSolutionCountDrift}`);

  console.log("");
  console.log("Source mix");
  for (const [family, count] of Object.entries(sourceMix)) {
    console.log(`  ${family}: ${count}`);
  }

  console.log("");
  console.log("Family replay stats");
  for (const [family, stats] of Object.entries(familyStats)) {
    console.log(`  ${family}: count ${stats.count}, approved ${stats.approved}, rejected ${stats.rejected}, unresolved ${stats.unresolved}, invalid ${stats.invalid}, mean score ${formatNumber(stats.meanScore)}, mean drift ${formatNumber(stats.meanDrift)}`);
  }

  if (duplicates.length) {
    console.log("");
    console.log("Duplicate learning signatures");
    duplicates.slice(0, 10).forEach((entry) => {
      console.log(`  ${entry.count}x ${entry.signature}`);
    });
  }

  if (unresolved.length) {
    console.log("");
    console.log("Unresolved examples");
    unresolved.slice(0, 12).forEach((row) => {
      const reason = row.reasons.length ? row.reasons.join(", ") : "unknown";
      console.log(`  [${row.bucket}] ${row.family} :: ${row.context} :: ${reason}`);
    });
  }

  if (resolvedSamples.length) {
    console.log("");
    console.log("Largest drift samples");
    resolvedSamples.slice(0, 8).forEach((row) => {
      console.log(`  [${row.bucket}] ${row.family} score ${formatNumber(row.score)} drift ${formatNumber(row.drift)} :: ${row.context} :: ${row.artifactPath}`);
    });
  }
}

function writeJsonOutput(jsonPath, report) {
  if (!jsonPath) return;
  const target = path.isAbsolute(jsonPath) ? jsonPath : path.resolve(ROOT, jsonPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(report, null, 2), "utf8");
  console.log(`JSON written to ${displayPath(target)}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const report = buildReplayReport();
  printReport(report);
  if (args.jsonPath) {
    writeJsonOutput(args.jsonPath, report);
  }
}

main();

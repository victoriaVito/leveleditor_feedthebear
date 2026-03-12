import fs from "fs";
import path from "path";
import crypto from "crypto";

const root = process.cwd();
const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

const EXCLUDED_PREFIXES = [
  ".git",
  "node_modules",
  "output",
  "artifacts",
  "archive",
  "level_toolkit_py/.venv-build",
  "level_toolkit_py/build",
  "level_toolkit_py/dist",
  "level_toolkit_py/release",
  "level_toolkit_web/release"
];

const LEGACY_DIRS_TO_ARCHIVE = [
  "jsons",
  "niveles_workshop",
  "levels/standalone"
];

const targetDirs = {
  levels: path.join(root, "levels"),
  progressions: path.join(root, "progressions"),
  playtest: path.join(root, "playtest"),
  workshopJsons: path.join(root, "level_toolkit_web", "workshop_jsons"),
  workshopProgressions: path.join(root, "level_toolkit_web", "workshop_progressions"),
  reports: path.join(root, "reports"),
  archive: path.join(root, "archive", `catalog_cleanup_${today}`)
};

function normalizeRel(p) {
  return p.replace(/\\/g, "/");
}

function shouldSkip(relPath) {
  return EXCLUDED_PREFIXES.some((prefix) => relPath === prefix || relPath.startsWith(`${prefix}/`));
}

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = normalizeRel(path.relative(root, abs));
    if (shouldSkip(rel)) continue;
    if (entry.isDirectory()) {
      walk(abs, results);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      results.push({ abs, rel });
    }
  }
  return results;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stableSort(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function hashObject(obj) {
  return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex");
}

function basenameNoExt(value) {
  return path.basename(String(value || ""), path.extname(String(value || "")));
}

function sanitizeSlug(value) {
  return String(value || "")
    .replace(/^Imported via browser picker\s*[·-]\s*/i, "")
    .replace(/\.(json|png|csv)$/i, "")
    .replace(/\s*\((\d+)\)\s*/g, "_$1_")
    .replace(/\bcopia\b/gi, "copy")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function bestLevelSlug(item) {
  const metaSource = item.data?.meta?.source_name ? basenameNoExt(item.data.meta.source_name) : "";
  const direct = basenameNoExt(item.rel);
  const candidates = [metaSource, direct, `level_${item.data?.level || "x"}`]
    .map(sanitizeSlug)
    .filter(Boolean);
  return candidates[0] || "level";
}

function pickNewest(items) {
  return items.slice().sort((a, b) => {
    const aTime = fs.statSync(a.abs).mtimeMs;
    const bTime = fs.statSync(b.abs).mtimeMs;
    if (bTime !== aTime) return bTime - aTime;
    return a.rel.localeCompare(b.rel);
  })[0];
}

function uniqueName(baseName, used) {
  const parsed = path.parse(baseName);
  let candidate = `${parsed.name}${parsed.ext}`;
  let index = 1;
  while (used.has(candidate)) {
    candidate = `${parsed.name}_${index}${parsed.ext}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function isPlaySession(data) {
  return !!data && typeof data === "object" && !!data.level && (data.paths || data.history || Object.prototype.hasOwnProperty.call(data, "solved"));
}

function isProgression(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.slots)) return true;
  if (Array.isArray(data.levels)) return true;
  if (data.tutorial_level || data.tutorial_level_file || Array.isArray(data.all_level_files)) return true;
  return !!data.progressions && typeof data.progressions === "object";
}

function isPlayableLevel(data) {
  return !!data && typeof data === "object" && (
    Array.isArray(data.pairs) ||
    (Number.isFinite(Number(data.gridSize)) && Array.isArray(data.pairs))
  ) && (
    Number.isFinite(Number(data.board_size)) ||
    (Number.isFinite(Number(data.board_width)) && Number.isFinite(Number(data.board_height))) ||
    Number.isFinite(Number(data.gridSize))
  );
}

function normalizeLevel(data) {
  if (Number.isFinite(Number(data.gridSize)) && !Number.isFinite(Number(data.board_size))) {
    return stableSort({
      gridSize: Number(data.gridSize),
      type: data.type || "",
      pairs: (data.pairs || []).map((pair) => ({
        a: pair?.a ? { x: Number(pair.a.x), y: Number(pair.a.y) } : null,
        b: pair?.b ? { x: Number(pair.b.x), y: Number(pair.b.y) } : null
      })),
      moves: Number(data.moves || 0)
    });
  }
  return stableSort({
    board_size: Number(data.board_size || 0),
    board_width: Number(data.board_width || 0),
    board_height: Number(data.board_height || 0),
    grid: data.grid || [],
    pairs: (data.pairs || []).map((pair) => ({
      id: pair.id,
      start: pair.start,
      end: pair.end
    })),
    blockers: data.blockers || [],
    decal: !!data.decal,
    moves: Number(data.moves || 0)
  });
}

function normalizeProgression(data) {
  return stableSort(data);
}

function normalizePlaySession(data) {
  return stableSort({
    level: data.level,
    paths: data.paths || {},
    solved: !!data.solved,
    save_reason: data.save_reason || "",
    history: data.history || []
  });
}

function classify(entry) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(entry.abs, "utf8"));
  } catch {
    return null;
  }
  const base = path.basename(entry.rel);
  if ([
    "catalog_index.json",
    "catalog_index.csv",
    "manifest.json",
    "all_unique_levels.json",
    "game_unique_levels_manifest.json",
    "level_manager_state.json",
    "manager_progressions.json",
    "manager_progressions_live.json"
  ].includes(base)) return null;
  if (isPlaySession(data)) return { ...entry, kind: "playtest", data, hash: hashObject(normalizePlaySession(data)) };
  if (isPlayableLevel(data)) return { ...entry, kind: "level", data, hash: hashObject(normalizeLevel(data)) };
  if (isProgression(data)) return { ...entry, kind: "progression", data, hash: hashObject(normalizeProgression(data)) };
  return null;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${text.endsWith("\n") ? text : `${text}\n`}`);
}

function cleanJsonFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(abs, { recursive: true, force: true });
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      fs.rmSync(abs, { force: true });
    }
  }
}

function archiveJsonFilesInDir(dir, archiveLabel) {
  if (!fs.existsSync(dir)) return [];
  const moved = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue;
    const destination = path.join(targetDirs.archive, archiveLabel, entry.name);
    ensureDir(path.dirname(destination));
    fs.renameSync(abs, destination);
    moved.push({
      from: normalizeRel(path.relative(root, abs)),
      to: normalizeRel(path.relative(root, destination))
    });
  }
  return moved;
}

function copyCanonicalJsons(sourceDir, destDir) {
  ensureDir(destDir);
  cleanJsonFiles(destDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const abs = path.join(sourceDir, entry.name);
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue;
    fs.copyFileSync(abs, path.join(destDir, entry.name));
  }
}

function movePathIfExists(relPath) {
  const from = path.join(root, relPath);
  if (!fs.existsSync(from)) return null;
  const to = path.join(targetDirs.archive, relPath.replace(/\//g, "__"));
  ensureDir(path.dirname(to));
  fs.renameSync(from, to);
  return normalizeRel(path.relative(root, to));
}

function progressionOutputName(item, used) {
  const preferred = sanitizeSlug(item.data?.name || basenameNoExt(item.rel)) || "progression";
  return uniqueName(`${preferred}.json`, used);
}

function playtestOutputName(item, index, used) {
  const slug = sanitizeSlug(basenameNoExt(item.rel)) || `playtest_${index}`;
  return uniqueName(`play_${String(index).padStart(3, "0")}_${slug}.json`, used);
}

const allJson = walk(root);
const classified = allJson.map(classify).filter(Boolean);

const groups = {
  level: new Map(),
  progression: new Map(),
  playtest: new Map()
};

for (const item of classified) {
  if (!groups[item.kind].has(item.hash)) groups[item.kind].set(item.hash, []);
  groups[item.kind].get(item.hash).push(item);
}

const kept = { level: [], progression: [], playtest: [] };
const removed = { level: [], progression: [], playtest: [] };

for (const kind of Object.keys(groups)) {
  for (const items of groups[kind].values()) {
    const chosen = pickNewest(items);
    kept[kind].push({ chosen, items });
    removed[kind].push(...items.filter((item) => item !== chosen));
  }
}

const archivedPaths = [];
ensureDir(targetDirs.archive);
for (const relPath of LEGACY_DIRS_TO_ARCHIVE) {
  const moved = movePathIfExists(relPath);
  if (moved) archivedPaths.push({ from: relPath, to: moved });
}

archivedPaths.push(...archiveJsonFilesInDir(targetDirs.levels, "precleanup_levels"));
archivedPaths.push(...archiveJsonFilesInDir(targetDirs.progressions, "precleanup_progressions"));
archivedPaths.push(...archiveJsonFilesInDir(targetDirs.playtest, "precleanup_playtest"));

// Clean canonical target folders so the rewritten catalog is the only source of truth.
cleanJsonFiles(targetDirs.levels);
cleanJsonFiles(targetDirs.progressions);
cleanJsonFiles(targetDirs.playtest);

const canonicalLevelMap = new Map();
const levelCatalog = [];
const usedLevelNames = new Set(["README.md", "catalog_index.json", "catalog_index.csv"]);

kept.level
  .sort((a, b) => bestLevelSlug(a.chosen).localeCompare(bestLevelSlug(b.chosen)) || a.chosen.rel.localeCompare(b.chosen.rel))
  .forEach(({ chosen, items }, index) => {
    const slug = bestLevelSlug(chosen);
    const fileName = uniqueName(`lvl_${String(index + 1).padStart(3, "0")}_${slug}.json`, usedLevelNames);
    const outputRel = normalizeRel(path.join("levels", fileName));
    const outputAbs = path.join(root, outputRel);
    const levelData = clone(chosen.data);
    levelData.meta = {
      ...(levelData.meta || {}),
      canonical_id: `lvl_${String(index + 1).padStart(3, "0")}`,
      canonical_file: fileName,
      canonical_slug: slug,
      canonicalized_at: new Date().toISOString(),
      previous_files: items.map((item) => item.rel).sort()
    };
    writeJson(outputAbs, levelData);
    for (const item of items) {
      canonicalLevelMap.set(path.basename(item.rel), outputRel);
      if (item.data?.meta?.source_name) {
        canonicalLevelMap.set(path.basename(String(item.data.meta.source_name)), outputRel);
      }
    }
    levelCatalog.push({
      canonical_id: levelData.meta.canonical_id,
      canonical_file: fileName,
      source_file: chosen.rel,
      aliases: items.map((item) => item.rel).sort(),
      board: `${Number(levelData.board_width || levelData.board_size || levelData.gridSize || 0)}x${Number(levelData.board_height || levelData.board_size || levelData.gridSize || 0)}`,
      pairs: Array.isArray(levelData.pairs) ? levelData.pairs.length : 0,
      moves: Number(levelData.moves || 0),
      difficulty: levelData.difficulty || "",
      hash: chosen.hash
    });
  });

function remapLevelRef(value) {
  const base = path.basename(String(value || ""));
  return canonicalLevelMap.get(base) || normalizeRel(path.join("levels", base));
}

function rewriteProgressionData(data) {
  const cloneData = clone(data);
  if (cloneData.tutorial_level_file) cloneData.tutorial_level_file = remapLevelRef(cloneData.tutorial_level_file);
  if (cloneData.tutorial_level) cloneData.tutorial_level = remapLevelRef(cloneData.tutorial_level);
  if (Array.isArray(cloneData.slots)) {
    cloneData.slots = cloneData.slots.map((slot) => slot?.level_file ? { ...slot, level_file: remapLevelRef(slot.level_file) } : slot);
  }
  if (Array.isArray(cloneData.levels)) {
    cloneData.levels = cloneData.levels.map((slot) => slot?.level_file ? { ...slot, level_file: remapLevelRef(slot.level_file) } : slot);
  }
  if (Array.isArray(cloneData.all_level_files)) {
    cloneData.all_level_files = cloneData.all_level_files
      .map((value) => path.basename(remapLevelRef(value)))
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .sort();
  }
  if (cloneData.progressions && typeof cloneData.progressions === "object") {
    for (const key of Object.keys(cloneData.progressions)) {
      const slots = cloneData.progressions[key];
      if (!Array.isArray(slots)) continue;
      cloneData.progressions[key] = slots.map((slot) => {
        if (slot?.level_file) return { ...slot, level_file: remapLevelRef(slot.level_file) };
        return slot;
      });
    }
  }
  return cloneData;
}

const usedProgressionNames = new Set();
const progressionCatalog = [];
kept.progression
  .sort((a, b) => a.chosen.rel.localeCompare(b.chosen.rel))
  .forEach(({ chosen, items }) => {
    const fileName = progressionOutputName(chosen, usedProgressionNames);
    const outputRel = normalizeRel(path.join("progressions", fileName));
    const outputAbs = path.join(root, outputRel);
    const progressionData = rewriteProgressionData(chosen.data);
    writeJson(outputAbs, progressionData);
    progressionCatalog.push({
      canonical_file: fileName,
      source_file: chosen.rel,
      aliases: items.map((item) => item.rel).sort(),
      hash: chosen.hash
    });
  });

const usedPlaytestNames = new Set();
const playtestCatalog = [];
kept.playtest
  .sort((a, b) => a.chosen.rel.localeCompare(b.chosen.rel))
  .forEach(({ chosen, items }, index) => {
    const fileName = playtestOutputName(chosen, index + 1, usedPlaytestNames);
    const outputRel = normalizeRel(path.join("playtest", fileName));
    const outputAbs = path.join(root, outputRel);
    writeJson(outputAbs, chosen.data);
    playtestCatalog.push({
      canonical_file: fileName,
      source_file: chosen.rel,
      aliases: items.map((item) => item.rel).sort(),
      hash: chosen.hash
    });
  });

// Sync runtime workshop mirrors from the canonical source-of-truth.
copyCanonicalJsons(targetDirs.levels, targetDirs.workshopJsons);
copyCanonicalJsons(targetDirs.progressions, targetDirs.workshopProgressions);

const levelCsv = [
  ["canonical_id", "canonical_file", "source_file", "board", "pairs", "moves", "difficulty", "aliases"].join(","),
  ...levelCatalog.map((row) => [
    row.canonical_id,
    row.canonical_file,
    row.source_file,
    row.board,
    row.pairs,
    row.moves,
    row.difficulty,
    `"${row.aliases.join(" | ")}"`
  ].join(","))
].join("\n");

writeJson(path.join(targetDirs.levels, "catalog_index.json"), {
  created_at: new Date().toISOString(),
  total_levels: levelCatalog.length,
  levels: levelCatalog
});
writeText(path.join(targetDirs.levels, "catalog_index.csv"), levelCsv);

writeJson(path.join(targetDirs.progressions, "catalog_index.json"), {
  created_at: new Date().toISOString(),
  total_progressions: progressionCatalog.length,
  progressions: progressionCatalog
});

writeJson(path.join(targetDirs.playtest, "catalog_index.json"), {
  created_at: new Date().toISOString(),
  total_playtests: playtestCatalog.length,
  playtests: playtestCatalog
});

const summary = {
  created_at: new Date().toISOString(),
  scanned_json_files: allJson.length,
  classified_json_files: classified.length,
  kept: {
    levels: levelCatalog.length,
    progressions: progressionCatalog.length,
    playtests: playtestCatalog.length
  },
  duplicates_archived: {
    levels: removed.level.length,
    progressions: removed.progression.length,
    playtests: removed.playtest.length
  },
  archived_legacy_paths: archivedPaths,
  canonical_dirs: {
    levels: "levels/",
    progressions: "progressions/",
    playtest: "playtest/"
  }
};

writeJson(path.join(targetDirs.reports, "catalog_canonicalization_report.json"), summary);
writeText(path.join(targetDirs.reports, "catalog_canonicalization_report.md"), [
  "# Catalog Canonicalization Report",
  "",
  `Created: ${summary.created_at}`,
  "",
  "## Summary",
  "",
  `- JSON files scanned: ${summary.scanned_json_files}`,
  `- Classified files: ${summary.classified_json_files}`,
  `- Canonical levels: ${summary.kept.levels}`,
  `- Canonical progressions: ${summary.kept.progressions}`,
  `- Canonical playtests: ${summary.kept.playtests}`,
  `- Duplicate level files removed from the active catalog: ${summary.duplicates_archived.levels}`,
  `- Duplicate progression files removed from the active catalog: ${summary.duplicates_archived.progressions}`,
  `- Duplicate playtest files removed from the active catalog: ${summary.duplicates_archived.playtests}`,
  "",
  "## Canonical Folders",
  "",
  "- `levels/` now contains only canonical playable levels plus catalog indexes.",
  "- `progressions/` now contains canonical progression/workspace files rewritten to the canonical level names.",
  "- `playtest/` now contains canonical session files.",
  "",
  "## Archive",
  "",
  `- Legacy source folders were moved under \`archive/catalog_cleanup_${today}/\`.`,
  "- Runtime mirrors were resynced into `level_toolkit_web/workshop_jsons/` and `level_toolkit_web/workshop_progressions/`.",
  "",
  "## Naming Rule",
  "",
  "- Canonical levels use `lvl_XXX_<slug>.json`.",
  "- Winners inside duplicate groups were selected by newest filesystem modification time."
].join("\n"));

console.log(JSON.stringify(summary, null, 2));

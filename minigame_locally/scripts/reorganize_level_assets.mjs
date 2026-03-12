import fs from "fs";
import path from "path";
import crypto from "crypto";

const root = process.cwd();

const EXCLUDED_SEGMENTS = [
  "node_modules",
  ".git",
  "level_toolkit_py/.venv-build",
  "level_toolkit_py/build",
  "level_toolkit_py/dist",
  "level_toolkit_py/release",
  "level_toolkit_web/release",
  "output",
  "artifacts"
];

const targets = {
  levels: path.join(root, "levels"),
  progressions: path.join(root, "progressions"),
  playtest: path.join(root, "playtest"),
  reportDir: path.join(root, "reports")
};

function isCanonicalOutput(relPath) {
  if (relPath === "levels" || relPath === "levels/standalone") return false;
  if (relPath.startsWith("progressions/")) return true;
  if (relPath.startsWith("playtest/")) return true;
  if (relPath === "levels/README.md" || relPath === "levels/.DS_Store") return false;
  if (relPath.startsWith("levels/standalone/")) return false;
  return relPath.startsWith("levels/");
}

function shouldSkip(relPath) {
  return isCanonicalOutput(relPath) || EXCLUDED_SEGMENTS.some((segment) => relPath === segment || relPath.startsWith(`${segment}/`));
}

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).replace(/\\/g, "/");
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

function isPlaySession(data) {
  return !!data && typeof data === "object" && !!data.level && (data.paths || data.history || Object.prototype.hasOwnProperty.call(data, "solved"));
}

function isProgression(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.slots)) return true;
  if (Array.isArray(data.levels)) return true;
  if (data.tutorial_level || data.tutorial_level_file || Array.isArray(data.all_level_files)) return true;
  if (data.progressions && typeof data.progressions === "object") {
    return Object.values(data.progressions).some((value) => Array.isArray(value));
  }
  return false;
}

function isPlayableLevel(data) {
  return !!data && typeof data === "object" && Array.isArray(data.pairs) && (
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
    level: Number(data.level || 0),
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
    moves: Number(data.moves || 0),
    solution_count: Number(data.solution_count || 0),
    target_density: data.target_density || "",
    difficulty: data.difficulty || ""
  });
}

function normalizeProgression(data) {
  return stableSort(data);
}

function normalizePlaySession(data) {
  return stableSort(data);
}

function hashObject(obj) {
  return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex");
}

function classify(entry) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(entry.abs, "utf8"));
  } catch {
    return null;
  }
  const base = path.basename(entry.rel);
  if (base === "level_manager_state.json" || base === "manager_progressions.json" || base === "manifest.json" || base === "all_unique_levels.json" || base === "game_unique_levels_manifest.json") {
    return null;
  }
  if (isPlaySession(data)) {
    return {
      ...entry,
      kind: "playtest",
      data,
      hash: hashObject(normalizePlaySession(data))
    };
  }
  if (isPlayableLevel(data)) {
    return {
      ...entry,
      kind: "level",
      data,
      hash: hashObject(normalizeLevel(data))
    };
  }
  if (isProgression(data)) {
    return {
      ...entry,
      kind: "progression",
      data,
      hash: hashObject(normalizeProgression(data))
    };
  }
  return null;
}

function pickNewest(items) {
  return items.slice().sort((a, b) => {
    const aTime = fs.statSync(a.abs).mtimeMs;
    const bTime = fs.statSync(b.abs).mtimeMs;
    if (bTime !== aTime) return bTime - aTime;
    return a.rel.localeCompare(b.rel);
  })[0];
}

function uniqueFileName(baseName, used) {
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

function rewriteProgressionPaths(data, availableLevelFiles) {
  const clone = JSON.parse(JSON.stringify(data));
  const remap = (value) => {
    const base = path.basename(String(value || ""));
    return availableLevelFiles.get(base) || `levels/${base}`;
  };
  if (clone.tutorial_level_file) clone.tutorial_level_file = remap(clone.tutorial_level_file);
  if (Array.isArray(clone.slots)) {
    clone.slots = clone.slots.map((slot) => {
      if (slot?.level_file) return { ...slot, level_file: remap(slot.level_file) };
      return slot;
    });
  }
  if (Array.isArray(clone.levels)) {
    clone.levels = clone.levels.map((item) => {
      if (item?.level_file) return { ...item, level_file: remap(item.level_file) };
      return item;
    });
  }
  if (clone.progressions && typeof clone.progressions === "object") {
    for (const key of Object.keys(clone.progressions)) {
      const value = clone.progressions[key];
      if (!Array.isArray(value)) continue;
      clone.progressions[key] = value.map((slot) => {
        if (slot?.level_file) return { ...slot, level_file: remap(slot.level_file) };
        if (slot?.tutorial_level_file) return { ...slot, tutorial_level_file: remap(slot.tutorial_level_file) };
        return slot;
      });
    }
  }
  return clone;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(dest, data) {
  fs.writeFileSync(dest, `${JSON.stringify(data, null, 2)}\n`);
}

ensureDir(targets.levels);
ensureDir(targets.progressions);
ensureDir(targets.playtest);
ensureDir(targets.reportDir);

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
    kept[kind].push(chosen);
    removed[kind].push(...items.filter((item) => item !== chosen));
  }
}

const usedLevelNames = new Set(["README.md"]);
const availableLevelFiles = new Map();

for (const item of kept.level.sort((a, b) => a.rel.localeCompare(b.rel))) {
  const fileName = uniqueFileName(path.basename(item.rel), usedLevelNames);
  const targetPath = path.join(targets.levels, fileName);
  writeJson(targetPath, item.data);
  availableLevelFiles.set(path.basename(item.rel), `levels/${fileName}`);
  item.output = path.relative(root, targetPath).replace(/\\/g, "/");
}

const usedProgressionNames = new Set();
for (const item of kept.progression.sort((a, b) => a.rel.localeCompare(b.rel))) {
  const fileName = uniqueFileName(path.basename(item.rel), usedProgressionNames);
  const targetPath = path.join(targets.progressions, fileName);
  writeJson(targetPath, rewriteProgressionPaths(item.data, availableLevelFiles));
  item.output = path.relative(root, targetPath).replace(/\\/g, "/");
}

const usedPlaytestNames = new Set();
for (const item of kept.playtest.sort((a, b) => a.rel.localeCompare(b.rel))) {
  const fileName = uniqueFileName(path.basename(item.rel), usedPlaytestNames);
  const targetPath = path.join(targets.playtest, fileName);
  writeJson(targetPath, item.data);
  item.output = path.relative(root, targetPath).replace(/\\/g, "/");
}

const summary = {
  created_at: new Date().toISOString(),
  source_scanned: allJson.length,
  classified: classified.length,
  kept: {
    levels: kept.level.length,
    progressions: kept.progression.length,
    playtest: kept.playtest.length
  },
  removed_duplicates: {
    levels: removed.level.length,
    progressions: removed.progression.length,
    playtest: removed.playtest.length
  },
  kept_files: {
    levels: kept.level.map(({ rel, output }) => ({ source: rel, output })),
    progressions: kept.progression.map(({ rel, output }) => ({ source: rel, output })),
    playtest: kept.playtest.map(({ rel, output }) => ({ source: rel, output }))
  },
  removed_files: {
    levels: removed.level.map(({ rel }) => rel),
    progressions: removed.progression.map(({ rel }) => rel),
    playtest: removed.playtest.map(({ rel }) => rel)
  }
};

writeJson(path.join(targets.reportDir, "catalog_reorg_report.json"), summary);

const md = [
  "# Catalog Reorganization Report",
  "",
  `Created: ${summary.created_at}`,
  "",
  "## Summary",
  "",
  `- JSON files scanned: ${summary.source_scanned}`,
  `- Classified JSON files: ${summary.classified}`,
  `- Levels kept: ${summary.kept.levels}`,
  `- Progressions kept: ${summary.kept.progressions}`,
  `- Playtest files kept: ${summary.kept.playtest}`,
  `- Level duplicates removed: ${summary.removed_duplicates.levels}`,
  `- Progression duplicates removed: ${summary.removed_duplicates.progressions}`,
  `- Playtest duplicates removed: ${summary.removed_duplicates.playtest}`,
  "",
  "## Canonical Folders",
  "",
  "- `levels/`",
  "- `progressions/`",
  "- `playtest/`",
  "",
  "## Notes",
  "",
  "- Duplicate winners were chosen by newest filesystem modification time.",
  "- Progression level references were rewritten to point at files inside `levels/` when the basename existed in the canonical level catalog."
].join("\n");

fs.writeFileSync(path.join(targets.reportDir, "catalog_reorg_report.md"), `${md}\n`);

console.log(JSON.stringify(summary, null, 2));

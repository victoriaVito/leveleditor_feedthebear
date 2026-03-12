import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const PROJECT_ROOT = process.cwd();
const LEVELS_ROOT = path.join(PROJECT_ROOT, "levels");
const REPORT_JSON = path.join(PROJECT_ROOT, "reports", "level_catalog_audit.json");
const REPORT_MD = path.join(PROJECT_ROOT, "reports", "level_catalog_audit.md");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function rel(absPath) {
  return path.relative(PROJECT_ROOT, absPath).replaceAll(path.sep, "/");
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(abs)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) results.push(abs);
  }
  return results;
}

function isProgressionConfig(json) {
  return !!json && typeof json === "object" && Array.isArray(json.slots);
}

function isPlaySession(json) {
  return !!json && typeof json === "object" && json.level && Array.isArray(json.paths);
}

function isPlayableLevel(json) {
  return !!json && typeof json === "object" && Array.isArray(json.grid) && Array.isArray(json.pairs) && Array.isArray(json.blockers);
}

function levelDims(level) {
  const height = level.board_height || level.boardHeight || level.grid?.length || level.board_size || 0;
  const width = level.board_width || level.boardWidth || level.grid?.[0]?.length || level.board_size || 0;
  return { width, height };
}

function sortCoords(coords = []) {
  return [...coords].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
}

function normalizePairs(level) {
  return [...(level.pairs || [])]
    .map((pair) => ({
      id: pair.id,
      start: pair.start,
      end: pair.end
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function levelSemanticShape(level) {
  const dims = levelDims(level);
  return {
    width: dims.width,
    height: dims.height,
    grid: level.grid,
    pairs: normalizePairs(level),
    blockers: sortCoords(level.blockers || [])
  };
}

function levelGameplayShape(level) {
  return {
    ...levelSemanticShape(level),
    moves: level.moves ?? null,
    difficulty: level.difficulty || null,
    target_density: level.target_density || null,
    solution_count: level.solution_count ?? null
  };
}

function chooseCanonical(items) {
  const ranked = [...items].sort((a, b) => {
    const scoreA = canonicalScore(a.relativePath);
    const scoreB = canonicalScore(b.relativePath);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.relativePath.localeCompare(b.relativePath);
  });
  return ranked[0];
}

function varyingTopLevelFields(items) {
  const keys = new Set(items.flatMap((item) => Object.keys(item.level || {})));
  return [...keys].sort().filter((key) => {
    const values = new Set(items.map((item) => JSON.stringify(stable(item.level?.[key] ?? null))));
    return values.size > 1;
  });
}

function fieldMatrix(items, fields) {
  return items.map((item) => ({
    file: item.relativePath,
    fields: Object.fromEntries(fields.map((field) => [field, item.level?.[field] ?? null]))
  }));
}

function canonicalScore(relativePath) {
  if (relativePath.includes("/game_unique_levels/")) return 100;
  if (relativePath.includes("/from_images/")) return 90;
  if (relativePath.includes("/from_downloads_fixed/")) return 85;
  if (relativePath.includes("/new_levels_a/")) return 80;
  if (relativePath.includes("/valid_levels_only/")) return 40;
  if (relativePath.includes("/toolkit_exports/")) return 10;
  if (relativePath.includes("/imported_from_downloads_clean/")) return 5;
  return 50;
}

function markdownList(items) {
  return items.map((item) => `- \`${item}\``).join("\n");
}

const allJsonFiles = await walk(LEVELS_ROOT);
const entries = [];

for (const absPath of allJsonFiles) {
  try {
    const raw = await readFile(absPath, "utf8");
    const json = JSON.parse(raw);
    const relativePath = rel(absPath);
    const base = {
      absolutePath: absPath,
      relativePath,
      fullHash: sha(json),
      kind: "other"
    };
    if (isPlayableLevel(json)) {
      entries.push({
        ...base,
        kind: "level",
        file: path.basename(absPath),
        level: json,
        semanticHash: sha(levelSemanticShape(json)),
        gameplayHash: sha(levelGameplayShape(json))
      });
    } else if (isPlaySession(json)) {
      entries.push({ ...base, kind: "play_session", file: path.basename(absPath) });
    } else if (isProgressionConfig(json)) {
      entries.push({ ...base, kind: "progression", file: path.basename(absPath) });
    } else {
      entries.push({ ...base, file: path.basename(absPath) });
    }
  } catch (error) {
    entries.push({
      absolutePath: absPath,
      relativePath: rel(absPath),
      file: path.basename(absPath),
      kind: "parse_error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

const levelEntries = entries.filter((entry) => entry.kind === "level");
const exactGroups = Object.values(Object.groupBy(levelEntries, (entry) => entry.fullHash)).filter((group) => group.length > 1);
const semanticGroups = Object.values(Object.groupBy(levelEntries, (entry) => entry.semanticHash))
  .filter((group) => group.length > 1)
  .filter((group) => new Set(group.map((entry) => entry.fullHash)).size > 1);
const gameplayGroups = Object.values(Object.groupBy(levelEntries, (entry) => entry.gameplayHash))
  .filter((group) => group.length > 1)
  .filter((group) => new Set(group.map((entry) => entry.fullHash)).size > 1);

const canonicalLevels = Object.values(Object.groupBy(levelEntries, (entry) => entry.fullHash)).map((group) => chooseCanonical(group));

const countsByFolder = Object.entries(
  levelEntries.reduce((acc, entry) => {
    const folder = entry.relativePath.split("/").slice(0, -1).join("/");
    acc[folder] = (acc[folder] || 0) + 1;
    return acc;
  }, {})
).sort((a, b) => b[1] - a[1]);

const report = {
  scanned_json_files: entries.length,
  playable_levels: levelEntries.length,
  play_sessions: entries.filter((entry) => entry.kind === "play_session").length,
  progression_configs: entries.filter((entry) => entry.kind === "progression").length,
  parse_errors: entries.filter((entry) => entry.kind === "parse_error").length,
  exact_duplicate_groups: exactGroups.map((group) => ({
    canonical: chooseCanonical(group).relativePath,
    files: group.map((entry) => entry.relativePath).sort()
  })),
  same_structure_different_metadata_groups: semanticGroups.map((group) => {
    const varyingFields = varyingTopLevelFields(group);
    return {
      representative: chooseCanonical(group).relativePath,
      files: group.map((entry) => entry.relativePath).sort(),
      varying_fields: varyingFields,
      field_matrix: fieldMatrix(group, varyingFields)
    };
  }),
  same_gameplay_shape_different_metadata_groups: gameplayGroups.map((group) => {
    const varyingFields = varyingTopLevelFields(group);
    return {
      representative: chooseCanonical(group).relativePath,
      files: group.map((entry) => entry.relativePath).sort(),
      varying_fields: varyingFields,
      field_matrix: fieldMatrix(group, varyingFields)
    };
  }),
  recommended_source_of_truth: {
    levels: "levels/standalone/game_unique_levels",
    progressions: "levels/progressions",
    generated_or_runtime_outputs: "levels/standalone/toolkit_exports",
    archival_imports: "levels/standalone/imported_from_downloads_clean"
  },
  canonical_unique_levels: canonicalLevels.map((entry) => entry.relativePath).sort(),
  counts_by_folder: countsByFolder.map(([folder, count]) => ({ folder, count }))
};

const md = `# Level Catalog Audit

## Summary
- Scanned JSON files: ${report.scanned_json_files}
- Playable levels: ${report.playable_levels}
- Play sessions: ${report.play_sessions}
- Progression configs: ${report.progression_configs}
- Parse errors: ${report.parse_errors}
- Exact duplicate groups: ${report.exact_duplicate_groups.length}
- Same structure but different metadata groups: ${report.same_structure_different_metadata_groups.length}
- Same gameplay shape but different metadata groups: ${report.same_gameplay_shape_different_metadata_groups.length}
- Canonical unique levels if you keep one per exact duplicate group: ${report.canonical_unique_levels.length}

## Recommended Source Of Truth
- Levels: \`${report.recommended_source_of_truth.levels}\`
- Progressions: \`${report.recommended_source_of_truth.progressions}\`
- Generated/runtime outputs: \`${report.recommended_source_of_truth.generated_or_runtime_outputs}\`
- Archival imports: \`${report.recommended_source_of_truth.archival_imports}\`

## Why the repo feels crowded
- There are multiple derived copies of the same levels across import folders, validation folders, canonical game folders, and runtime export folders.
- The active catalog should not read from every folder at once.
- The cleanest approach is to treat \`game_unique_levels\` as the active playable catalog and everything else as source/import/archive.

## Folder counts
${markdownList(report.counts_by_folder.map(({ folder, count }) => `${folder}: ${count}`))}

## Exact duplicate groups
${report.exact_duplicate_groups.length
    ? report.exact_duplicate_groups.map((group, index) => `### Group ${index + 1}\n- Canonical: \`${group.canonical}\`\n${markdownList(group.files)}`).join("\n\n")
    : "- None"}

## Same structure, different metadata
${report.same_structure_different_metadata_groups.length
    ? report.same_structure_different_metadata_groups.map((group, index) => `### Group ${index + 1}\n- Representative: \`${group.representative}\`\n- Varying fields: ${group.varying_fields.map((field) => `\`${field}\``).join(", ")}\n${markdownList(group.files)}`).join("\n\n")
    : "- None"}

## Same gameplay shape, different metadata
${report.same_gameplay_shape_different_metadata_groups.length
    ? report.same_gameplay_shape_different_metadata_groups.map((group, index) => `### Group ${index + 1}\n- Representative: \`${group.representative}\`\n- Varying fields: ${group.varying_fields.map((field) => `\`${field}\``).join(", ")}\n${markdownList(group.files)}`).join("\n\n")
    : "- None"}
`;

await writeFile(REPORT_JSON, JSON.stringify(report, null, 2));
await writeFile(REPORT_MD, md);

console.log(JSON.stringify({
  report_json: rel(REPORT_JSON),
  report_md: rel(REPORT_MD),
  playable_levels: report.playable_levels,
  exact_duplicate_groups: report.exact_duplicate_groups.length,
  canonical_unique_levels: report.canonical_unique_levels.length
}, null, 2));

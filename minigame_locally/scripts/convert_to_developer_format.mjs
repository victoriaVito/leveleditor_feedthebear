/**
 * Convert level JSON files to the developer format used by the game runtime.
 *
 * Target format:
 * {
 *   "id": "A_level1",
 *   "difficultyTier": 1,
 *   "gridSize": { "cols": 6, "rows": 6 },
 *   "moves": 8,
 *   "pairs": [
 *     { "type": "red", "a": { "x": 0, "y": 0 }, "b": { "x": 5, "y": 2 } }
 *   ],
 *   "blockers": [{ "x": 2, "y": 0 }]
 * }
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { getCanonicalColorByHex, getFishColorById } from './fish_color_utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEVELS_DIR = path.join(__dirname, '../levels');
const BACKUP_DIR = path.join(LEVELS_DIR, '.backups');
const SKIP_DIRS = new Set(['.backups', 'screenshots']);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function* walkLevelFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.backups') continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walkLevelFiles(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) yield fullPath;
  }
}

function resolveInputTargets(args) {
  if (!args.length) return [...walkLevelFiles(LEVELS_DIR)];
  const targets = [];
  for (const arg of args) {
    const resolved = path.resolve(process.cwd(), arg);
    if (!fs.existsSync(resolved)) {
      console.log(`WARN ${arg} - path does not exist`);
      continue;
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) targets.push(...walkLevelFiles(resolved));
    else if (stat.isFile() && resolved.endsWith('.json')) targets.push(resolved);
  }
  return [...new Set(targets)];
}

function readJsonText(filePath) {
  return execFileSync('cat', [filePath], {
    encoding: 'utf8',
    timeout: 3000,
    maxBuffer: 1024 * 1024 * 8,
  });
}

function buildBackupPath(filePath) {
  const relativePath = path.relative(LEVELS_DIR, filePath);
  return path.join(BACKUP_DIR, `${relativePath}.old-format`);
}

function isDeveloperLevel(level) {
  return !!level && typeof level === 'object' && typeof level.id === 'string' && !!level.gridSize && Array.isArray(level.pairs);
}

function levelIdFromPath(level, filePath) {
  return String(level?.id || path.basename(filePath, '.json'));
}

function difficultyTierForLevel(level, cols, rows) {
  const explicitTier = Number(level?.difficultyTier);
  if (Number.isFinite(explicitTier) && explicitTier >= 1) return Math.min(10, Math.max(1, explicitTier));
  const explicitLevel = Number(level?.level);
  if (Number.isFinite(explicitLevel) && explicitLevel >= 1) return Math.min(10, Math.max(1, explicitLevel));
  return Math.min(10, Math.max(1, Math.ceil((cols + rows) / 2)));
}

function fishTypeFromPair(pair, index = 0) {
  if (pair?.type) return String(pair.type);
  if (pair?.fish_color_id) {
    const color = getFishColorById(pair.fish_color_id);
    if (color) return color.id.replace('fish_', '');
  }
  if (pair?.color) {
    const color = getCanonicalColorByHex(pair.color);
    if (color) return color.id.replace('fish_', '');
  }
  const fallback = ['red', 'green', 'yellow', 'orange', 'purple', 'cyan', 'blue'];
  return fallback[index % fallback.length];
}

function developerPointFromLegacyCell(cell) {
  return { x: Number(cell?.[1] || 0), y: Number(cell?.[0] || 0) };
}

function developerPoint(point) {
  return { x: Number(point?.x || 0), y: Number(point?.y || 0) };
}

function convertLegacyLevelToDeveloper(level, filePath) {
  const cols = Number(level?.board_width || level?.board_size || level?.gridSize?.cols || 4);
  const rows = Number(level?.board_height || level?.board_size || level?.gridSize?.rows || 4);
  const pairs = (level?.pairs || []).map((pair, index) => ({
    type: fishTypeFromPair(pair, index),
    a: pair?.a ? developerPoint(pair.a) : developerPointFromLegacyCell(pair.start),
    b: pair?.b ? developerPoint(pair.b) : developerPointFromLegacyCell(pair.end),
  }));
  const blockers = (level?.blockers || []).map((blocker) => (
    Array.isArray(blocker) ? developerPointFromLegacyCell(blocker) : developerPoint(blocker)
  ));
  const converted = {
    id: levelIdFromPath(level, filePath),
    difficultyTier: difficultyTierForLevel(level, cols, rows),
    gridSize: { cols, rows },
    moves: Number(level?.moves || 0),
    pairs,
  };
  if (blockers.length) converted.blockers = blockers;
  if (level?.solutionCount !== undefined) converted.solutionCount = level.solutionCount;
  if (level?.solution_count !== undefined) converted.solutionCount = level.solution_count;
  if (level?.targetDensity !== undefined) converted.targetDensity = level.targetDensity;
  if (level?.target_density !== undefined) converted.targetDensity = level.target_density;
  if (level?.goldenPath !== undefined) converted.goldenPath = level.goldenPath;
  if (level?.golden_path !== undefined) converted.goldenPath = level.golden_path;
  if (level?.meta !== undefined) converted.meta = level.meta;
  if (level?.description !== undefined) converted.description = level.description;
  if (level?.validation !== undefined) converted.validation = level.validation;
  if (level?.decal !== undefined) converted.decal = level.decal;
  return converted;
}

function normalizeDeveloperLevel(level, filePath) {
  const cols = Number(level?.gridSize?.cols || level?.gridSize?.width || 4);
  const rows = Number(level?.gridSize?.rows || level?.gridSize?.height || 4);
  return {
    ...convertLegacyLevelToDeveloper(level, filePath),
    id: levelIdFromPath(level, filePath),
    difficultyTier: difficultyTierForLevel(level, cols, rows),
    gridSize: { cols, rows },
    pairs: (level?.pairs || []).map((pair, index) => ({
      type: fishTypeFromPair(pair, index),
      a: developerPoint(pair.a),
      b: developerPoint(pair.b),
    })),
    blockers: (level?.blockers || []).map((blocker) => developerPoint(blocker)),
  };
}

function processLevelFile(filePath) {
  try {
    const raw = readJsonText(filePath);
    const level = JSON.parse(raw);
    const backupPath = buildBackupPath(filePath);
    ensureDir(path.dirname(backupPath));

    const converted = isDeveloperLevel(level)
      ? normalizeDeveloperLevel(level, filePath)
      : convertLegacyLevelToDeveloper(level, filePath);

    fs.writeFileSync(backupPath, raw);
    fs.writeFileSync(filePath, JSON.stringify(converted, null, 2) + '\n');

    return {
      success: true,
      file: path.relative(LEVELS_DIR, filePath),
      convertedPairs: converted.pairs.length,
      skipped: false,
      alreadyDeveloper: isDeveloperLevel(level),
    };
  } catch (error) {
    return {
      success: false,
      file: path.relative(LEVELS_DIR, filePath),
      error: error.message,
    };
  }
}

async function convertAllLevels() {
  console.log('Converting level files to developer format\n');
  console.log('='.repeat(60));

  const files = resolveInputTargets(process.argv.slice(2));
  console.log(`\nFound ${files.length} JSON files to process\n`);

  let processed = 0;
  let successful = 0;
  let failed = 0;
  let normalizedDeveloper = 0;

  for (const filePath of files) {
    const result = processLevelFile(filePath);
    processed += 1;
    if (!result.success) {
      console.log(`FAIL ${result.file} - ${result.error}`);
      failed += 1;
      continue;
    }
    if (result.alreadyDeveloper) normalizedDeveloper += 1;
    console.log(`OK ${result.file} - ${result.convertedPairs} pairs${result.alreadyDeveloper ? ' (normalized developer)' : ''}`);
    successful += 1;
  }

  console.log('\n' + '='.repeat(60));
  console.log('\nSummary:');
  console.log(`  Total processed: ${processed}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Already developer: ${normalizedDeveloper}`);
  console.log(`  Backups saved to: ${BACKUP_DIR}\n`);
}

convertAllLevels().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

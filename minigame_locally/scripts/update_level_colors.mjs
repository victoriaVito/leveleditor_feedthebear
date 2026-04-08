/**
 * Normalize level JSON files to the canonical fish color system.
 *
 * This script walks the whole levels tree, excluding backups/screenshots, and:
 * 1. Normalizes pair.color to one of the 14 supported fish colors
 * 2. Adds pair.fish_color_id and pair.color_letter
 * 3. Rebuilds level.color_manifest with canonical colors
 * 4. Stores a backup alongside the relative level path under levels/.backups
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  getCanonicalColorByHex,
  normalizeHexColor,
} from './fish_color_utils.mjs';

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
    if (entry.isFile() && entry.name.endsWith('.json')) {
      yield fullPath;
    }
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
    if (stat.isDirectory()) {
      targets.push(...walkLevelFiles(resolved));
    } else if (stat.isFile() && resolved.endsWith('.json')) {
      targets.push(resolved);
    }
  }
  return [...new Set(targets)];
}

function shouldProcessLevel(level) {
  return level && Array.isArray(level.pairs);
}

function buildBackupPath(filePath) {
  const relativePath = path.relative(LEVELS_DIR, filePath);
  return path.join(BACKUP_DIR, relativePath);
}

function readJsonText(filePath) {
  return execFileSync('cat', [filePath], {
    encoding: 'utf8',
    timeout: 3000,
    maxBuffer: 1024 * 1024 * 8,
  });
}

function normalizePair(pair) {
  if (!pair || !pair.color) return { updated: false, pair, canonicalColor: null };
  const canonicalColor = getCanonicalColorByHex(pair.color);
  if (!canonicalColor) {
    return { updated: false, pair, canonicalColor: null };
  }

  pair.color = canonicalColor.hex;
  pair.fish_color_id = canonicalColor.id;
  pair.color_letter = canonicalColor.letter;
  return { updated: true, pair, canonicalColor };
}

function rebuildColorManifest(pairs) {
  const manifest = {};
  for (const pair of pairs) {
    const canonicalColor = getCanonicalColorByHex(pair?.color);
    if (!canonicalColor) continue;
    const key = canonicalColor.hex;
    if (!manifest[key]) {
      manifest[key] = {
        fish_color_id: canonicalColor.id,
        color_letter: canonicalColor.letter,
        pairs: [],
      };
    }
    manifest[key].pairs.push(pair.id);
  }
  return manifest;
}

function processLevelFile(filePath) {
  try {
    const raw = readJsonText(filePath);
    const level = JSON.parse(raw);
    if (!shouldProcessLevel(level)) {
      return { success: true, skipped: true, file: path.relative(LEVELS_DIR, filePath) };
    }

    const backupPath = buildBackupPath(filePath);
    ensureDir(path.dirname(backupPath));
    fs.writeFileSync(backupPath, raw);

    let normalizedPairs = 0;
    let unknownColors = 0;
    for (const pair of level.pairs) {
      const before = normalizeHexColor(pair?.color);
      const { updated } = normalizePair(pair);
      if (updated) {
        if (before !== pair.color) normalizedPairs += 1;
      } else if (before) {
        unknownColors += 1;
      }
    }

    const colorManifest = rebuildColorManifest(level.pairs);
    if (Object.keys(colorManifest).length > 0) {
      level.color_manifest = colorManifest;
    } else {
      delete level.color_manifest;
    }

    fs.writeFileSync(filePath, JSON.stringify(level, null, 2) + '\n');
    return {
      success: true,
      skipped: false,
      file: path.relative(LEVELS_DIR, filePath),
      normalizedPairs,
      unknownColors,
      pairCount: level.pairs.length,
    };
  } catch (error) {
    return {
      success: false,
      file: path.relative(LEVELS_DIR, filePath),
      error: error.message,
    };
  }
}

async function updateAllLevelFiles() {
  console.log('Fish Color Mapping - Level File Update\n');
  console.log('='.repeat(50));

  const files = resolveInputTargets(process.argv.slice(2));
  console.log(`\nFound ${files.length} JSON files under levels/\n`);

  let processed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  let normalizedPairs = 0;
  let unknownColors = 0;

  for (const filePath of files) {
    const result = processLevelFile(filePath);
    processed += 1;

    if (!result.success) {
      console.log(`FAIL ${result.file} - ${result.error}`);
      failed += 1;
      continue;
    }

    if (result.skipped) {
      skipped += 1;
      continue;
    }

    successful += 1;
    normalizedPairs += result.normalizedPairs;
    unknownColors += result.unknownColors;
    console.log(
      `OK ${result.file} - ${result.pairCount} pairs, ${result.normalizedPairs} normalized, ${result.unknownColors} unknown`
    );
  }

  console.log('\n' + '='.repeat(50));
  console.log('\nSummary:');
  console.log(`  Total processed: ${processed}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Pair colors normalized: ${normalizedPairs}`);
  console.log(`  Unknown colors left untouched: ${unknownColors}`);
  console.log(`  Backups saved to: ${BACKUP_DIR}\n`);
}

updateAllLevelFiles().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

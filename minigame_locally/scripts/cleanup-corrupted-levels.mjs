#!/usr/bin/env node

/**
 * Cleanup: Remove Unrecoverable Corrupted Files
 * 
 * Removes level files that are:
 * - Structurally corrupted (null gridSize)
 * - Have no valid backups
 * - Are not actual playable levels (test/session files)
 * 
 * Usage:
 *   node scripts/cleanup-corrupted-levels.mjs [--dry-run]
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LEVELS_DIR = path.join(ROOT, "levels");
const DRY_RUN = process.argv.includes("--dry-run");

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m"
};

console.log(`\n${colors.cyan}═══ Corrupted Level File Cleanup ═══${colors.reset}\n`);

if (DRY_RUN) {
  console.log(`${colors.yellow}DRY RUN MODE - No files will be deleted${colors.reset}\n`);
}

/**
 * Check if file is a test/session file (not a real level)
 */
function isTestFile(filename) {
  const testPatterns = [
    /catalog_index/,
    /play_session/,
    /validate/,
    /test_/
  ];
  return testPatterns.some(p => p.test(filename));
}

async function cleanup() {
  // List of files to remove (without backups and detected as corrupted)
  const filesToRemove = [
    "catalog_index.json",           // Test/system file, no valid backup
    "play_session_level_9_validate.json"  // Test/session file, no valid backup
  ];

  let removed = 0;
  let skipped = 0;

  for (const filename of filesToRemove) {
    const filePath = path.join(LEVELS_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      console.log(`⏭️  ${filename} - already absent`);
      continue;
    }

    // Verify it's actually a test file and corrupted
    try {
      const content = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(content);
      
      const isCorrupted = data.gridSize?.cols === null && data.gridSize?.rows === null;
      const isTest = isTestFile(filename);
      
      if (!isCorrupted) {
        console.log(`⚠️  ${filename} - appears valid, skipping`);
        skipped++;
        continue;
      }

      if (!isTest) {
        console.log(`⚠️  ${filename} - not identified as test file, skipping`);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`🗑️  [DRY RUN] Would delete: ${filename}`);
      } else {
        await fs.unlink(filePath);
        console.log(`${colors.green}✓${colors.reset} Deleted: ${filename}`);
        removed++;
      }
    } catch (err) {
      console.log(`${colors.red}✗${colors.reset} Error processing ${filename}: ${err.message}`);
    }
  }

  console.log(`\n${colors.cyan}═══ Summary ═══${colors.reset}`);
  if (DRY_RUN) {
    console.log(`${colors.yellow}Would delete: ${removed}${colors.reset}`);
  } else {
    console.log(`${colors.green}Deleted: ${removed}${colors.reset}`);
  }
  if (skipped > 0) {
    console.log(`Skipped: ${skipped}`);
  }
  console.log();
}

cleanup().catch((err) => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Auto-Recovery Script for Corrupted Level Files
 * 
 * Detects and restores level files with invalid gridSize (null values)
 * by copying from backup locations or progressions subfolders.
 * 
 * Usage:
 *   node scripts/auto-recover-corrupted-levels.mjs [--auto]
 * 
 * --auto: Automatically restore without confirmation prompts
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LEVELS_DIR = path.join(ROOT, "levels");
const AUTO_MODE = process.argv.includes("--auto");

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

function log(type, message) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`,
    recovered: `${colors.cyan}🔧${colors.reset}`
  }[type] || "•";
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Check if a level file has valid gridSize
 */
function isValidLevel(data) {
  const cols = data?.gridSize?.cols;
  const rows = data?.gridSize?.rows;
  const pairs = data?.pairs?.length ?? 0;
  const moves = data?.moves;
  
  return (
    typeof cols === "number" && cols > 0 &&
    typeof rows === "number" && rows > 0 &&
    pairs > 0 &&
    typeof moves === "number" && moves >= 0
  );
}

/**
 * Find a valid backup copy of a level file
 */
async function findBackup(filename) {
  const name = path.basename(filename, ".json");
  
  // Backup locations to check (in order of preference)
  const backupLocations = [
    path.join(LEVELS_DIR, "progression1", filename),
    path.join(LEVELS_DIR, "progression1", name + ".json"),
    // Handle potential typo: progresion vs progression
    path.join(LEVELS_DIR, "progression1", "progres" + name.slice(10) + ".json"),
  ];

  for (const backupPath of backupLocations) {
    try {
      const content = await fs.readFile(backupPath, "utf8");
      const data = JSON.parse(content);
      
      if (isValidLevel(data)) {
        return { path: backupPath, data };
      }
    } catch (err) {
      // File doesn't exist or is invalid, try next location
    }
  }

  return null;
}

/**
 * Main recovery operation
 */
async function performRecovery(corruptedPath, backup) {
  try {
    // Create backup of corrupted file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const corruptedBackup = corruptedPath.replace(
      /\.json$/,
      `.corrupted.${timestamp}.json`
    );
    await fs.copyFile(corruptedPath, corruptedBackup);
    log("info", `Saved corrupted version: ${path.basename(corruptedBackup)}`);

    // Restore from backup
    await fs.writeFile(corruptedPath, JSON.stringify(backup.data, null, 2) + "\n");
    log("recovered", `Restored from: ${path.basename(backup.path)}`);
    
    return true;
  } catch (err) {
    log("error", `Failed to recover: ${err.message}`);
    return false;
  }
}

/**
 * Scan all level files and detect corruption
 */
async function scanForCorruption() {
  log("info", `Scanning ${LEVELS_DIR} for corrupted level files...`);
  
  const files = await fs.readdir(LEVELS_DIR);
  const corrupted = [];
  let checked = 0;

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    if (file.startsWith(".")) continue;
    
    const filePath = path.join(LEVELS_DIR, file);
    const stat = await fs.stat(filePath);
    
    // Skip directories
    if (stat.isDirectory()) continue;
    
    try {
      const content = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(content);
      
      if (!isValidLevel(data)) {
        corrupted.push({
          file,
          path: filePath,
          data,
          gridSize: data?.gridSize || { cols: null, rows: null },
          pairs: data?.pairs?.length ?? 0
        });
      }
      checked++;
    } catch (err) {
      log("warning", `Failed to parse ${file}: ${err.message}`);
    }
  }

  log("info", `Checked ${checked} files, found ${corrupted.length} corrupted`);
  return corrupted;
}

/**
 * Interactive confirmation prompt
 */
async function askConfirm(message) {
  if (AUTO_MODE) return true;
  
  console.log(`\n${colors.yellow}${message}${colors.reset}`);
  console.log("Recovering in 3 seconds... (Ctrl+C to cancel)\n");
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 3000);
  });
}

/**
 * Main workflow
 */
async function main() {
  console.log(`\n${colors.cyan}═══ Level File Auto-Recovery System ═══${colors.reset}\n`);
  
  const corrupted = await scanForCorruption();
  
  if (corrupted.length === 0) {
    log("success", "No corrupted level files detected. All systems nominal.");
    console.log();
    return;
  }

  log("warning", `Found ${corrupted.length} corrupted level file(s):`);
  console.log();

  let recovered = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of corrupted) {
    console.log(`  📄 ${colors.red}${item.file}${colors.reset}`);
    console.log(`     gridSize: ${item.gridSize.cols}x${item.gridSize.rows}, pairs: ${item.pairs}`);

    const backup = await findBackup(item.file);
    
    if (!backup) {
      log("error", `No backup found for ${item.file}`);
      skipped++;
      console.log();
      continue;
    }

    console.log(`     💾 Backup found: ${path.basename(backup.path)}`);
    console.log(`        gridSize: ${backup.data.gridSize.cols}x${backup.data.gridSize.rows}, pairs: ${backup.data.pairs.length}`);

    const shouldRecover = await askConfirm(
      AUTO_MODE 
        ? "AUTO MODE: Recovering..."
        : `Recover from backup?`
    );

    if (shouldRecover) {
      const success = await performRecovery(item.path, backup);
      if (success) {
        recovered++;
      } else {
        failed++;
      }
    } else {
      log("info", "Skipped by user");
      skipped++;
    }
    
    console.log();
  }

  // Summary
  console.log(`${colors.cyan}═══ Recovery Summary ═══${colors.reset}`);
  log("success", `Recovered: ${recovered}`);
  if (failed > 0) log("error", `Failed: ${failed}`);
  if (skipped > 0) log("warning", `Skipped: ${skipped}`);
  console.log();
}

main().catch((err) => {
  log("error", `Fatal error: ${err.message}`);
  process.exit(1);
});

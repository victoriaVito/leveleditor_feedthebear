#!/usr/bin/env node

/**
 * Level File Validator & Watchdog
 * 
 * Validates all level files for structural integrity and catches corruption early.
 * Can be run:
 * - Manually: node scripts/validate-levels.mjs
 * - As a pre-commit hook
 * - As a periodic health check
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LEVELS_DIR = path.join(ROOT, "levels");
const MIN_BOARD_SIZE = 4;
const MAX_BOARD_WIDTH = 7;
const MAX_BOARD_HEIGHT = 8;

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

/**
 * Validation rules for level structure
 */
const RULES = {
  hasId: (data) => ({
    pass: typeof data.id === "string" && data.id.length > 0,
    msg: "Missing or invalid 'id'"
  }),
  
  hasGridSize: (data) => ({
    pass: data.gridSize && typeof data.gridSize === "object",
    msg: "Missing 'gridSize' object"
  }),
  
  gridSizeHasCols: (data) => ({
    pass: typeof data.gridSize?.cols === "number" && data.gridSize.cols > 0,
    msg: `Invalid gridSize.cols: "${data.gridSize?.cols}" (must be number > 0)`
  }),
  
  gridSizeHasRows: (data) => ({
    pass: typeof data.gridSize?.rows === "number" && data.gridSize.rows > 0,
    msg: `Invalid gridSize.rows: "${data.gridSize?.rows}" (must be number > 0)`
  }),
  
  gridSizeInRange: (data) => ({
    pass: data.gridSize?.cols >= MIN_BOARD_SIZE && data.gridSize?.cols <= MAX_BOARD_WIDTH &&
          data.gridSize?.rows >= MIN_BOARD_SIZE && data.gridSize?.rows <= MAX_BOARD_HEIGHT,
    msg: `Grid out of range: ${data.gridSize?.cols}x${data.gridSize?.rows} (width must be 4..7, height must be 4..8, max 7x8)`
  }),
  
  hasPairs: (data) => ({
    pass: Array.isArray(data.pairs) && data.pairs.length > 0,
    msg: `Invalid pairs: ${Array.isArray(data.pairs) ? "empty array" : "not an array"}`
  }),
  
  pairsValid: (data) => ({
    pass: data.pairs?.every(p => 
      p.type && 
      p.a?.x !== undefined && p.a?.y !== undefined &&
      p.b?.x !== undefined && p.b?.y !== undefined
    ),
    msg: "One or more pairs missing required fields (type, a, b with x,y)"
  }),
  
  hasMoves: (data) => ({
    pass: typeof data.moves === "number" && data.moves >= 0,
    msg: `Invalid moves: "${data.moves}" (must be non-negative number)`
  }),
  
  noNullGridSize: (data) => ({
    pass: data.gridSize?.cols !== null && data.gridSize?.rows !== null,
    msg: "⚠️ CORRUPTION DETECTED: gridSize contains null values!"
  })
};

function validateLevel(data) {
  const rules = Object.values(RULES);
  const failures = [];

  for (const rule of rules) {
    const result = rule(data);
    if (!result.pass) {
      failures.push(result.msg);
    }
  }

  return failures;
}

function formatErrors(failures) {
  return failures.map((msg, i) => `    ${i + 1}. ${msg}`).join("\n");
}

async function validateAllLevels() {
  console.log(`\n${colors.cyan}${colors.bold}═══ Level File Validator ═══${colors.reset}\n`);
  
  async function collectJsonFiles(dir) {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip screenshots folder (PNG-only in this repo).
        if (entry.name === "screenshots") continue;
        const nested = await collectJsonFiles(fullPath);
        out.push(...nested);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".json")) continue;
      out.push(fullPath);
    }
    return out;
  }

  const files = await collectJsonFiles(LEVELS_DIR);
  let valid = 0;
  let invalid = 0;
  let errors = [];

  for (const filePath of files) {
    const rel = path.relative(LEVELS_DIR, filePath);

    try {
      const content = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(content);
      const failures = validateLevel(data);

      if (failures.length === 0) {
        console.log(`${colors.green}✓${colors.reset} ${rel}`);
        valid++;
      } else {
        console.log(`${colors.red}✗${colors.reset} ${rel}`);
        console.log(formatErrors(failures));
        console.log();
        invalid++;
        errors.push({ file: rel, failures });
      }
    } catch (err) {
      console.log(`${colors.red}✗${colors.reset} ${rel}`);
      console.log(`    ${colors.red}Parse error:${colors.reset} ${err.message}`);
      console.log();
      invalid++;
      errors.push({ file: rel, failures: [err.message] });
    }
  }

  // Summary
  console.log(`\n${colors.cyan}${colors.bold}═══ Summary ═══${colors.reset}`);
  console.log(`${colors.green}✓ Valid: ${valid}${colors.reset}`);
  if (invalid > 0) {
    console.log(`${colors.red}✗ Invalid: ${invalid}${colors.reset}`);
  }
  console.log();

  // Detailed error report if any
  if (errors.length > 0) {
    console.log(`${colors.red}${colors.bold}VALIDATION FAILED${colors.reset}`);
    console.log(`Run: ${colors.cyan}node scripts/auto-recover-corrupted-levels.mjs --auto${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}All level files valid!${colors.reset}\n`);
    process.exit(0);
  }
}

validateAllLevels().catch((err) => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});

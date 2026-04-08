#!/usr/bin/env node
/**
 * materialize_curve_builder.mjs — Reads the Curve Builder tab from Google Sheets,
 * creates a real progression bundle (JSONs + screenshots + CSV), and updates
 * the Level Manager state so it appears as a new progression tab.
 */
import path from "node:path";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { readGoogleSheetValues, updateGoogleSheetRange } from "../google_sheets_api.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || process.env.SPREADSHEET_ID || "";
const credentialsPath = process.env.GOOGLE_OAUTH_CLIENT_PATH || ".local/google_oauth_client.json";
const tokenPath = process.env.GOOGLE_SHEETS_TOKEN_PATH || ".local/google_sheets_token.json";
const SHEET_NAME = "Curve Builder";
const SLOT_COUNT = 11;

function safeName(value, fallback = "curve") {
  return String(value || "").trim().toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || fallback;
}

async function tryReadJson(filePath) {
  try { return JSON.parse(await readFile(filePath, "utf8")); }
  catch { return null; }
}

async function tryCopy(src, dest) {
  try { await copyFile(src, dest); return true; }
  catch { return false; }
}

async function main() {
  if (!spreadsheetId) {
    console.log(JSON.stringify({ ok: false, error: "GOOGLE_SPREADSHEET_ID not set" }));
    return;
  }

  const values = await readGoogleSheetValues({
    rootDir, credentialsPath, tokenPath, spreadsheetId,
    range: `${SHEET_NAME}!A1:Z10`
  });

  if (!values || values.length < 4) {
    console.log(JSON.stringify({ ok: false, error: "Curve Builder tab empty or missing" }));
    return;
  }

  const nameRow = values[1] || [];
  const diffRow = values[2] || [];
  const levelRow = values[3] || [];

  const progName = safeName(nameRow[1], "curve_" + Date.now());
  const progKey = progName;

  const slots = [];
  for (let c = 1; c <= SLOT_COUNT; c++) {
    const file = String(levelRow[c] || "").trim();
    const diff = String(diffRow[c] || "").toUpperCase().trim();
    if (!file) {
      slots.push({ slot: c - 1, file: "", difficulty: diff });
    } else {
      slots.push({ slot: c - 1, file, difficulty: diff });
    }
  }

  const filledSlots = slots.filter((s) => s.file);
  if (filledSlots.length === 0) {
    console.log(JSON.stringify({ ok: false, error: "No levels assigned to any slot" }));
    return;
  }

  const bundleDir = path.join(rootDir, "bundles", `original_${progName}`);
  const jsonsDir = path.join(bundleDir, "jsons");
  const screenshotsDir = path.join(bundleDir, "screenshots");
  await mkdir(jsonsDir, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });

  const csvLines = ["Slot,File,Board,Pairs,Blockers,Moves,Difficulty"];
  const managerSlots = [];

  for (const slot of slots) {
    if (!slot.file) {
      managerSlots.push({ slot: slot.slot, file: "", level_id: "", level_file: "", board: "", pairs: 0, blockers: 0, moves: 0, difficulty: slot.difficulty || "EASY", solutions: 0 });
      continue;
    }

    const levelPath = path.join(rootDir, "levels", slot.file);
    const level = await tryReadJson(levelPath);
    const stem = slot.file.replace(/\.json$/, "");

    await tryCopy(levelPath, path.join(jsonsDir, slot.file));

    for (const screenshotDir of ["levels/screenshots", "screenshots"]) {
      const src = path.join(rootDir, screenshotDir, `${stem}.png`);
      if (await tryCopy(src, path.join(screenshotsDir, `${stem}.png`))) break;
    }

    const grid = level?.gridSize || {};
    const board = `${grid.cols || "?"}x${grid.rows || "?"}`;
    const pairs = Array.isArray(level?.pairs) ? level.pairs.length : 0;
    const blockers = Array.isArray(level?.blockers) ? level.blockers.length : 0;
    const moves = Number(level?.moves || 0);
    const difficulty = slot.difficulty || String(level?.difficultyTier || level?.difficulty || "EASY").toUpperCase();

    csvLines.push(`${slot.slot},${slot.file},${board},${pairs},${blockers},${moves},${difficulty}`);

    managerSlots.push({
      slot: slot.slot,
      file: slot.file,
      level_id: stem,
      level_file: `levels/${slot.file}`,
      board,
      pairs,
      blockers,
      moves,
      difficulty,
      solutions: Number(level?.solutionCount || 0),
      item_id: 0
    });
  }

  await writeFile(path.join(bundleDir, `${progName}_progression.csv`), csvLines.join("\n"), "utf8");

  const statePath = path.join(rootDir, "progressions", "manager_state", "level_manager_state.json");
  let state;
  try {
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    state = { progressions: {}, progression_order: [], items: [] };
  }

  if (!state.progressions) state.progressions = {};
  if (!state.progression_order) state.progression_order = [];

  state.progressions[progKey] = { slots: managerSlots };

  if (!state.progression_order.includes(progKey)) {
    state.progression_order.push(progKey);
  }

  await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");

  const livePath = path.join(rootDir, "progressions", "manager_progressions_live.json");
  let live;
  try {
    live = JSON.parse(await readFile(livePath, "utf8"));
  } catch {
    live = {};
  }
  live[progKey] = { bundle: `bundles/original_${progName}`, slots: filledSlots.length };
  await writeFile(livePath, JSON.stringify(live, null, 2), "utf8");

  const endCol = String.fromCharCode(65 + SLOT_COUNT);
  await updateGoogleSheetRange({
    rootDir, credentialsPath, tokenPath, spreadsheetId,
    range: `${SHEET_NAME}!B7:${endCol}7`,
    values: [["Materialized: TRUE", ...Array(SLOT_COUNT - 1).fill("")]]
  });

  console.log(JSON.stringify({
    ok: true,
    message: `Progression "${progName}" materialized with ${filledSlots.length} levels`,
    progression: progKey,
    bundle: `bundles/original_${progName}`,
    slots: filledSlots.length
  }));
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: String(err.message || err) }));
  process.exit(1);
});

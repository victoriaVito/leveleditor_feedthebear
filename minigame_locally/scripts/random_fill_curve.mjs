#!/usr/bin/env node
/**
 * random_fill_curve.mjs — Reads the Curve Builder tab from Google Sheets,
 * fills empty slots randomly respecting difficulty filters, and writes back.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { readGoogleSheetValues, updateGoogleSheetRange } from "../google_sheets_api.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || process.env.SPREADSHEET_ID || "";
const credentialsPath = process.env.GOOGLE_OAUTH_CLIENT_PATH || ".local/google_oauth_client.json";
const tokenPath = process.env.GOOGLE_SHEETS_TOKEN_PATH || ".local/google_sheets_token.json";
const SHEET_NAME = "Curve Builder";
const SLOT_COUNT = 11;

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

  const diffRow = values[2] || [];
  const levelRow = values[3] || [];

  const statePath = path.join(rootDir, "progressions", "manager_state", "level_manager_state.json");
  let state;
  try {
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    console.log(JSON.stringify({ ok: false, error: "Cannot read level_manager_state.json" }));
    return;
  }

  const allItems = state.items || [];
  const levelsByDifficulty = { ALL: [], EASY: [], MEDIUM: [], HARD: [] };
  for (const item of allItems) {
    const file = String(item.file || "").trim();
    const diff = String(item.difficulty || "").toUpperCase().trim();
    if (!file) continue;
    levelsByDifficulty.ALL.push(file);
    if (levelsByDifficulty[diff]) levelsByDifficulty[diff].push(file);
  }

  const usedFiles = new Set();
  for (let c = 1; c <= SLOT_COUNT; c++) {
    const existing = String(levelRow[c] || "").trim();
    if (existing) usedFiles.add(existing);
  }

  const newLevelRow = [...levelRow];
  let filled = 0;

  for (let c = 1; c <= SLOT_COUNT; c++) {
    const existing = String(newLevelRow[c] || "").trim();
    if (existing) continue;

    const filter = String(diffRow[c] || "ALL").toUpperCase().trim();
    const pool = (levelsByDifficulty[filter] || levelsByDifficulty.ALL)
      .filter((f) => !usedFiles.has(f));

    if (!pool.length) continue;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    newLevelRow[c] = pick;
    usedFiles.add(pick);
    filled++;
  }

  if (filled === 0) {
    console.log(JSON.stringify({ ok: true, message: "All slots already filled", filled: 0 }));
    return;
  }

  const startCol = "B";
  const endCol = String.fromCharCode(65 + SLOT_COUNT);
  await updateGoogleSheetRange({
    rootDir, credentialsPath, tokenPath, spreadsheetId,
    range: `${SHEET_NAME}!${startCol}4:${endCol}4`,
    values: [newLevelRow.slice(1, SLOT_COUNT + 1)]
  });

  console.log(JSON.stringify({ ok: true, message: `Filled ${filled} slots randomly`, filled }));
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: String(err.message || err) }));
  process.exit(1);
});

#!/usr/bin/env node
import path from "node:path";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { readGoogleSheetValues, updateGoogleSheetRange } from "../google_sheets_api.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const spreadsheetId = process.argv[2] || process.env.GOOGLE_SPREADSHEET_ID || "1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c";
const plannerSheetName = process.argv[3] || "Mix Planner";
const destinationRoot = process.argv[4]
  ? path.resolve(process.argv[4])
  : path.join(rootDir, "bundles", "live_ops_mixes");
const credentialsPath = process.env.GOOGLE_OAUTH_CLIENT_PATH || ".local/google_oauth_client.json";
const tokenPath = process.env.GOOGLE_SHEETS_TOKEN_PATH || ".local/google_sheets_token.json";

function columnNumberToA1(value) {
  let num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return "A";
  let out = "";
  while (num > 0) {
    const rem = (num - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    num = Math.floor((num - 1) / 26);
  }
  return out;
}

function boolish(value) {
  return /^(true|1|yes|y)$/i.test(String(value || "").trim());
}

function safeFolderName(value, fallback = "mix") {
  const normalized = String(value || "").trim().toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function rowToObject(headers, row = []) {
  const out = {};
  headers.forEach((header, index) => {
    out[header] = row[index] ?? "";
  });
  return out;
}

function levelDimensions(level) {
  const width = Number(level.board_width || level.boardWidth || level.board_size || level.grid_size || 0);
  const height = Number(level.board_height || level.boardHeight || level.board_size || level.grid_size || width || 0);
  if (width > 0 && height > 0) return { width, height };
  const points = [];
  for (const pair of level.pairs || []) {
    if (Array.isArray(pair.start)) points.push(pair.start);
    if (Array.isArray(pair.end)) points.push(pair.end);
  }
  for (const blocker of level.blockers || []) {
    if (Array.isArray(blocker)) points.push(blocker);
  }
  const maxRow = points.reduce((max, point) => Math.max(max, Number(point[0] || 0)), 0);
  const maxCol = points.reduce((max, point) => Math.max(max, Number(point[1] || 0)), 0);
  return { width: maxCol + 1, height: maxRow + 1 };
}

function difficultyLabel(level) {
  return String(level.difficulty || level.meta?.manual_difficulty || "").trim().toUpperCase() || "UNKNOWN";
}

function levelSummary(slot, fileName, level) {
  const { width, height } = levelDimensions(level);
  return {
    slot,
    file: fileName,
    saved_path: `levels/${fileName}`,
    board: width && height ? `${width}x${height}` : "",
    pairs: Array.isArray(level.pairs) ? level.pairs.length : 0,
    blockers: Array.isArray(level.blockers) ? level.blockers.length : 0,
    moves: Number(level.moves || 0),
    difficulty: difficultyLabel(level),
    status: "COPIED"
  };
}

async function ensureFileExists(filePath) {
  await stat(filePath);
  return filePath;
}

async function materializeRow(row, headers) {
  const proposalId = String(row["Proposal ID"] || "").trim();
  const folderName = safeFolderName(row["Folder Name"] || proposalId, proposalId || "mix");
  const outDir = path.join(destinationRoot, folderName);
  const jsonDir = path.join(outDir, "jsons");
  const screenshotDir = path.join(outDir, "screenshots");
  await mkdir(jsonDir, { recursive: true });
  await mkdir(screenshotDir, { recursive: true });

  const tutorialFile = String(row["Tutorial File"] || "").trim();
  const slotFiles = headers
    .filter((header) => /^Slot \d+$/.test(header))
    .map((header) => String(row[header] || "").trim())
    .filter(Boolean);
  const allFiles = [tutorialFile, ...slotFiles].filter(Boolean);
  if (!allFiles.length) {
    throw new Error(`Proposal ${proposalId || folderName} has no level files.`);
  }

  const summaries = [];
  for (const [index, fileName] of allFiles.entries()) {
    const sourceJson = await ensureFileExists(path.join(rootDir, "levels", fileName));
    const screenshotName = `${path.parse(fileName).name}.png`;
    const sourcePng = path.join(rootDir, "levels", "screenshots", screenshotName);
    const targetJson = path.join(jsonDir, fileName);
    const targetPng = path.join(screenshotDir, screenshotName);
    await copyFile(sourceJson, targetJson);
    try {
      await copyFile(await ensureFileExists(sourcePng), targetPng);
    } catch (_err) {
      // Screenshot is optional for materialization; keep going with JSON copy.
    }
    const level = JSON.parse(await readFile(sourceJson, "utf8"));
    summaries.push(levelSummary(index, fileName, level));
  }

  const csvHeaders = ["slot", "file", "saved_path", "board", "pairs", "blockers", "moves", "difficulty", "status"];
  const csvRows = [
    csvHeaders.join(","),
    ...summaries.map((summary) => csvHeaders.map((header) => JSON.stringify(summary[header] ?? "")).join(","))
  ];
  await writeFile(path.join(outDir, `${folderName}_progression.csv`), `${csvRows.join("\n")}\n`, "utf8");
  await writeFile(path.join(outDir, "proposal_manifest.json"), JSON.stringify({
    proposal_id: proposalId,
    folder_name: folderName,
    source_progression: row["Source Progression"] || "",
    suggestion: row["Suggestion"] || "",
    tutorial_file: tutorialFile,
    files: allFiles,
    materialized_at: new Date().toISOString()
  }, null, 2), "utf8");

  return {
    folderName,
    relativeOutput: path.relative(rootDir, outDir),
    fileCount: allFiles.length
  };
}

async function main() {
  const values = await readGoogleSheetValues({
    rootDir,
    credentialsPath,
    tokenPath,
    spreadsheetId,
    range: `${plannerSheetName}!A:ZZ`
  });
  const headers = values[0] || [];
  const materializedCol = headers.indexOf("Materialized") + 1;
  const outputFolderCol = headers.indexOf("Output Folder") + 1;
  if (!headers.length || materializedCol <= 0 || outputFolderCol <= 0) {
    throw new Error(`Planner sheet "${plannerSheetName}" is missing required headers.`);
  }

  const summary = {
    ok: true,
    spreadsheetId,
    plannerSheetName,
    destinationRoot,
    materialized: [],
    skipped: [],
    failed: []
  };

  for (let index = 1; index < values.length; index += 1) {
    const rowNumber = index + 1;
    const row = rowToObject(headers, values[index]);
    const rawProposalId = String(row["Proposal ID"] || "").trim();
    if (!rawProposalId) continue;
    const approved = boolish(row["Approved"]);
    const alreadyMaterialized = boolish(row["Materialized"]);
    const proposalId = String(rawProposalId || row["Folder Name"] || `row_${rowNumber}`).trim();
    if (!approved) {
      summary.skipped.push({ proposalId, reason: "not_approved" });
      continue;
    }
    if (alreadyMaterialized) {
      summary.skipped.push({ proposalId, reason: "already_materialized" });
      continue;
    }
    try {
      const result = await materializeRow(row, headers);
      await updateGoogleSheetRange({
        rootDir,
        credentialsPath,
        tokenPath,
        spreadsheetId,
        range: `${plannerSheetName}!${columnNumberToA1(materializedCol)}${rowNumber}:${columnNumberToA1(outputFolderCol)}${rowNumber}`,
        values: [["TRUE", result.relativeOutput]],
        valueInputOption: "USER_ENTERED"
      });
      summary.materialized.push({ proposalId, ...result });
    } catch (err) {
      summary.failed.push({ proposalId, error: String(err.message || err) });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err.message || err) }, null, 2));
  process.exit(1);
});

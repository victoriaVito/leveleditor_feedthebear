#!/usr/bin/env node
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFile, cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { readGoogleSheetValues, updateGoogleSheetRange } from "../google_sheets_api.mjs";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const rootName = path.basename(rootDir);
const spreadsheetId = process.argv[2] || process.env.GOOGLE_SPREADSHEET_ID || "1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c";
const renameSheetName = process.argv[3] || "Level Renames";
const credentialsPath = process.env.GOOGLE_OAUTH_CLIENT_PATH || ".local/google_oauth_client.json";
const tokenPath = process.env.GOOGLE_SHEETS_TOKEN_PATH || ".local/google_sheets_token.json";
const workbookPath = path.join(rootDir, "output", "spreadsheet", "Levels_feed_the_bear_after_feedback_sync.xlsx");
const payloadPath = path.join(rootDir, "output", "spreadsheet", "Levels_feed_the_bear_after_feedback_sync_payload.json");

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

function rowToObject(headers, row = []) {
  const out = {};
  headers.forEach((header, index) => {
    out[header] = row[index] ?? "";
  });
  return out;
}

function safeSlug(value) {
  const normalized = String(value || "untitled")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "untitled";
}

function normalizeSeparators(value) {
  return String(value || "").replace(/\\/g, "/");
}

function resolveProjectPath(pathValue, fallback = "") {
  const raw = String(pathValue || "").trim();
  const value = raw || String(fallback || "").trim();
  if (!value) return "";
  if (path.isAbsolute(value)) return path.normalize(value);
  if (value.startsWith(`${rootName}/`)) {
    return path.normalize(path.join(path.dirname(rootDir), value));
  }
  return path.normalize(path.join(rootDir, value.replace(/^\/+/, "")));
}

function timestampLabel() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function timestampFileSafe(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, "-");
}

async function pathExists(targetPath) {
  if (!targetPath) return false;
  try {
    await stat(targetPath);
    return true;
  } catch (_err) {
    return false;
  }
}

async function walkFiles(startDir) {
  const files = [];
  if (!await pathExists(startDir)) return files;
  const entries = await readdir(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(absolutePath));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
  return files;
}

function parseCsvText(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === "\"") {
        if (text[index + 1] === "\"") {
          currentValue += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
      continue;
    }
    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      currentRow.push(currentValue);
      currentValue = "";
    } else if (char === "\n") {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
    } else if (char !== "\r") {
      currentValue += char;
    }
  }
  if (currentValue.length || currentRow.length) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }
  return rows;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

function serializeCsvRows(rows) {
  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function applyStringReplacements(value, replacements) {
  let text = String(value ?? "");
  for (const [fromValue, toValue] of replacements) {
    if (!fromValue || fromValue === toValue || !text.includes(fromValue)) continue;
    text = text.split(fromValue).join(toValue);
  }
  return text;
}

function replaceJsonStrings(value, replacements) {
  if (typeof value === "string") return applyStringReplacements(value, replacements);
  if (Array.isArray(value)) return value.map((entry) => replaceJsonStrings(entry, replacements));
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      next[key] = replaceJsonStrings(entry, replacements);
    }
    return next;
  }
  return value;
}

async function updateCsvReferenceFile(filePath, replacements) {
  const original = await readFile(filePath, "utf8");
  const parsed = parseCsvText(original);
  const updated = parsed.map((row) => row.map((value) => applyStringReplacements(value, replacements)));
  const nextText = serializeCsvRows(updated);
  if (nextText === original) return false;
  await writeFile(filePath, nextText, "utf8");
  return true;
}

async function updateJsonReferenceFile(filePath, replacements) {
  const originalText = await readFile(filePath, "utf8");
  const original = JSON.parse(originalText);
  const updated = replaceJsonStrings(original, replacements);
  const nextText = `${JSON.stringify(updated, null, 2)}\n`;
  if (nextText === originalText) return false;
  await writeFile(filePath, nextText, "utf8");
  return true;
}

function buildReplacementEntries(mapping) {
  return [...mapping.entries()]
    .filter(([fromValue, toValue]) => fromValue && toValue && fromValue !== toValue)
    .sort((left, right) => right[0].length - left[0].length);
}

function buildReplacementMap(plans) {
  const replacements = new Map();
  for (const plan of plans) {
    replacements.set(plan.sourceFileName, plan.targetFileName);
    replacements.set(normalizeSeparators(path.join("levels", plan.sourceFileName)), normalizeSeparators(path.join("levels", plan.targetFileName)));
    replacements.set(normalizeSeparators(path.relative(rootDir, plan.sourceLevelPath)), normalizeSeparators(path.relative(rootDir, plan.targetLevelPath)));
    replacements.set(normalizeSeparators(path.join(rootName, path.relative(rootDir, plan.sourceLevelPath))), normalizeSeparators(path.join(rootName, path.relative(rootDir, plan.targetLevelPath))));
    replacements.set(normalizeSeparators(plan.sourceLevelPath), normalizeSeparators(plan.targetLevelPath));
    if (plan.sourceScreenshotName && plan.targetScreenshotName) {
      replacements.set(plan.sourceScreenshotName, plan.targetScreenshotName);
      replacements.set(normalizeSeparators(path.join("levels", "screenshots", plan.sourceScreenshotName)), normalizeSeparators(path.join("levels", "screenshots", plan.targetScreenshotName)));
      replacements.set(normalizeSeparators(path.relative(rootDir, plan.sourceScreenshotPath)), normalizeSeparators(path.relative(rootDir, plan.targetScreenshotPath)));
      replacements.set(normalizeSeparators(path.join(rootName, path.relative(rootDir, plan.sourceScreenshotPath))), normalizeSeparators(path.join(rootName, path.relative(rootDir, plan.targetScreenshotPath))));
      replacements.set(normalizeSeparators(plan.sourceScreenshotPath), normalizeSeparators(plan.targetScreenshotPath));
    }
  }
  return buildReplacementEntries(replacements);
}

function bundleFolderFromArtifact(filePath) {
  const parts = filePath.split(path.sep);
  const jsonsIndex = parts.lastIndexOf("jsons");
  if (jsonsIndex > 0) return parts.slice(0, jsonsIndex).join(path.sep);
  const screenshotsIndex = parts.lastIndexOf("screenshots");
  if (screenshotsIndex > 0) return parts.slice(0, screenshotsIndex).join(path.sep);
  return path.dirname(filePath);
}

async function collectBundleArtifacts(plans) {
  const bundleFiles = await walkFiles(path.join(rootDir, "bundles"));
  const jsonMoves = [];
  const screenshotMoves = [];
  const csvPaths = new Set();
  const touchedBundleFolders = new Set();
  for (const filePath of bundleFiles) {
    if (filePath.endsWith("_progression.csv")) csvPaths.add(filePath);
  }
  for (const plan of plans) {
    for (const filePath of bundleFiles) {
      if (path.basename(filePath) === plan.sourceFileName && filePath.includes(`${path.sep}jsons${path.sep}`)) {
        const destination = path.join(path.dirname(filePath), plan.targetFileName);
        jsonMoves.push([filePath, destination]);
        touchedBundleFolders.add(bundleFolderFromArtifact(filePath));
      }
      if (plan.sourceScreenshotName && path.basename(filePath) === plan.sourceScreenshotName && filePath.includes(`${path.sep}screenshots${path.sep}`)) {
        const destination = path.join(path.dirname(filePath), plan.targetScreenshotName);
        screenshotMoves.push([filePath, destination]);
        touchedBundleFolders.add(bundleFolderFromArtifact(filePath));
      }
    }
  }
  return {
    jsonMoves,
    screenshotMoves,
    csvPaths: [...csvPaths],
    touchedBundleFolders: [...touchedBundleFolders]
  };
}

async function validateMoveSet(moves, label) {
  const destinationMap = new Map();
  for (const [sourcePath, destinationPath] of moves) {
    if (sourcePath === destinationPath) continue;
    if (!await pathExists(sourcePath)) throw new Error(`${label} source not found: ${sourcePath}`);
    const existingDestination = destinationMap.get(destinationPath);
    if (existingDestination && existingDestination !== sourcePath) {
      throw new Error(`${label} destination collision: ${destinationPath}`);
    }
    destinationMap.set(destinationPath, sourcePath);
    if (await pathExists(destinationPath) && destinationPath !== sourcePath && !moves.some(([candidateSource]) => candidateSource === destinationPath)) {
      throw new Error(`${label} destination already exists: ${destinationPath}`);
    }
  }
}

async function applyMovesWithTemps(moves) {
  const actionable = moves.filter(([sourcePath, destinationPath]) => sourcePath && destinationPath && sourcePath !== destinationPath);
  const staged = [];
  for (const [sourcePath, destinationPath] of actionable) {
    const tempPath = `${sourcePath}.codex_rename_tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    await rename(sourcePath, tempPath);
    staged.push([tempPath, destinationPath]);
  }
  for (const [tempPath, destinationPath] of staged) {
    await rename(tempPath, destinationPath);
  }
}

async function rebuildSiblingZip(bundleFolder) {
  const zipPath = `${bundleFolder}.zip`;
  if (!await pathExists(zipPath)) return false;
  const parentDir = path.dirname(bundleFolder);
  const folderName = path.basename(bundleFolder);
  await rm(zipPath, { force: true });
  await execFileAsync("zip", ["-rq", zipPath, folderName], { cwd: parentDir });
  return true;
}

async function collectReferenceJsonFiles() {
  const candidates = [];
  for (const directory of [
    path.join(rootDir, "progressions"),
    path.join(rootDir, ".local", "toolkit_state"),
    path.join(rootDir, ".local", "browser_state_exports")
  ]) {
    const files = await walkFiles(directory);
    candidates.push(...files.filter((filePath) => filePath.toLowerCase().endsWith(".json")));
  }
  const bundleFiles = await walkFiles(path.join(rootDir, "bundles"));
  candidates.push(...bundleFiles.filter((filePath) => path.basename(filePath) === "proposal_manifest.json"));
  return [...new Set(candidates)];
}

async function syncCanonicalSpreadsheet() {
  const { stdout } = await execFileAsync("node", [
    path.join(rootDir, "scripts", "sync_google_sheets_payload.mjs"),
    "--canonical",
    "--workbook",
    workbookPath,
    "--payload",
    payloadPath,
    "--spreadsheet-id",
    spreadsheetId
  ], { cwd: rootDir, env: { ...process.env } });
  return stdout;
}

function backupRelativePath(sourcePath) {
  const relative = path.relative(rootDir, sourcePath);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) return relative;
  return path.join("_external", path.basename(sourcePath));
}

async function copyPathToBackup(sourcePath, backupDir) {
  const targetPath = path.join(backupDir, backupRelativePath(sourcePath));
  const sourceStat = await stat(sourcePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  if (sourceStat.isDirectory()) {
    await cp(sourcePath, targetPath, { recursive: true });
  } else {
    await copyFile(sourcePath, targetPath);
  }
  return targetPath;
}

async function createRenameBackup({ actionablePlans, bundleArtifacts, referenceJsonPaths }) {
  const backupDir = path.join(rootDir, "backups", `level_renames_${timestampFileSafe()}`);
  const sources = new Set();
  for (const plan of actionablePlans) {
    sources.add(plan.sourceLevelPath);
    if (plan.sourceScreenshotPath) sources.add(plan.sourceScreenshotPath);
  }
  for (const bundleFolder of bundleArtifacts.touchedBundleFolders) {
    sources.add(bundleFolder);
    sources.add(`${bundleFolder}.zip`);
  }
  referenceJsonPaths.forEach((filePath) => sources.add(filePath));
  const copied = [];
  for (const sourcePath of sources) {
    if (!sourcePath || !await pathExists(sourcePath)) continue;
    copied.push({
      sourcePath,
      backupPath: await copyPathToBackup(sourcePath, backupDir)
    });
  }
  return {
    backupDir,
    copiedCount: copied.length
  };
}

async function updateSheetStatuses({ rowStatuses, sheetHeaders }) {
  const statusColumn = sheetHeaders.indexOf("Apply Status") + 1;
  if (statusColumn <= 0) return;
  for (const [rowNumber, status] of rowStatuses.entries()) {
    await updateGoogleSheetRange({
      rootDir,
      credentialsPath,
      tokenPath,
      spreadsheetId,
      range: `${renameSheetName}!${columnNumberToA1(statusColumn)}${rowNumber}`,
      values: [[status]],
      valueInputOption: "USER_ENTERED"
    });
  }
}

function buildPlanFromSheet(values) {
  const headers = values[0] || [];
  const rows = values.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    row: rowToObject(headers, row)
  }));
  const grouped = new Map();
  for (const entry of rows) {
    const codeFile = String(entry.row["Code File"] || "").trim();
    const currentName = String(entry.row["Current Name"] || "").trim();
    const targetName = String(entry.row["Target Name"] || "").trim();
    if (!codeFile || !targetName || targetName === currentName) continue;
    const levelPath = resolveProjectPath(entry.row["Level Path"], path.join("levels", codeFile));
    const screenshotFile = String(entry.row["Screenshot File"] || "").trim() || `${path.parse(codeFile).name}.png`;
    const screenshotPath = resolveProjectPath(entry.row["Screenshot Path"], path.join("levels", "screenshots", screenshotFile));
    const key = levelPath;
    if (!grouped.has(key)) {
      grouped.set(key, {
        sourceLevelPath: levelPath,
        sourceFileName: path.basename(levelPath) || codeFile,
        sourceScreenshotPath: screenshotPath,
        sourceScreenshotName: screenshotFile,
        currentName,
        targetNames: new Set(),
        occurrences: []
      });
    }
    const group = grouped.get(key);
    group.targetNames.add(targetName);
    group.occurrences.push(entry);
  }

  const plans = [];
  const rowStatuses = new Map();
  for (const group of grouped.values()) {
    if (group.targetNames.size > 1) {
      const status = "CONFLICT: shared file has different target names";
      group.occurrences.forEach((entry) => rowStatuses.set(entry.rowNumber, status));
      continue;
    }
    const targetName = [...group.targetNames][0];
    const targetStem = safeSlug(targetName);
    const sourceExt = path.extname(group.sourceFileName) || ".json";
    const targetFileName = `${targetStem}${sourceExt}`;
    const targetLevelPath = path.join(path.dirname(group.sourceLevelPath), targetFileName);
    if (targetLevelPath === group.sourceLevelPath) {
      group.occurrences.forEach((entry) => rowStatuses.set(entry.rowNumber, "ERROR: target keeps the same file slug"));
      continue;
    }
    const screenshotExt = path.extname(group.sourceScreenshotName) || ".png";
    const targetScreenshotName = `${targetStem}${screenshotExt}`;
    const targetScreenshotPath = path.join(path.dirname(group.sourceScreenshotPath), targetScreenshotName);
    plans.push({
      targetName,
      targetFileName,
      targetLevelPath,
      targetScreenshotName,
      targetScreenshotPath,
      ...group
    });
  }
  return { headers, plans, rowStatuses };
}

async function main() {
  const values = await readGoogleSheetValues({
    rootDir,
    credentialsPath,
    tokenPath,
    spreadsheetId,
    range: `${renameSheetName}!A:ZZ`
  });
  const { headers, plans, rowStatuses } = buildPlanFromSheet(values);
  const summary = {
    ok: true,
    spreadsheetId,
    renameSheetName,
    workbookPath,
    payloadPath,
    backupDir: "",
    backupEntries: 0,
    applied: [],
    skipped: [],
    updatedCsvs: 0,
    updatedJsonRefs: 0,
    rebuiltZips: 0,
    syncOk: false,
    syncSkipped: false,
    syncOutput: ""
  };

  if (!headers.length) {
    throw new Error(`Rename sheet "${renameSheetName}" is missing or empty.`);
  }

  if (!plans.length) {
    summary.syncSkipped = true;
    summary.skipped.push({ reason: "no_pending_renames" });
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  for (const plan of plans) {
    if (!await pathExists(plan.sourceLevelPath)) {
      plan.occurrences.forEach((entry) => rowStatuses.set(entry.rowNumber, `ERROR: source file not found (${plan.sourceFileName})`));
      continue;
    }
    if (await pathExists(plan.targetLevelPath) && plan.targetLevelPath !== plan.sourceLevelPath && !plans.some((candidate) => candidate.sourceLevelPath === plan.targetLevelPath)) {
      plan.occurrences.forEach((entry) => rowStatuses.set(entry.rowNumber, `CONFLICT: destination already exists (${plan.targetFileName})`));
      continue;
    }
    summary.applied.push({
      source: plan.sourceFileName,
      target: plan.targetFileName
    });
  }

  const actionablePlans = plans.filter((plan) => ![...plan.occurrences].some((entry) => rowStatuses.has(entry.rowNumber)));
  const actualLevelMoves = actionablePlans.map((plan) => [plan.sourceLevelPath, plan.targetLevelPath]);
  const actualScreenshotMoves = [];
  for (const plan of actionablePlans) {
    if (await pathExists(plan.sourceScreenshotPath)) {
      actualScreenshotMoves.push([plan.sourceScreenshotPath, plan.targetScreenshotPath]);
    }
  }
  const bundleArtifacts = await collectBundleArtifacts(actionablePlans);
  const referenceJsonPaths = await collectReferenceJsonFiles();
  await validateMoveSet(actualLevelMoves, "Level rename");
  await validateMoveSet(actualScreenshotMoves, "Screenshot rename");
  await validateMoveSet(bundleArtifacts.jsonMoves, "Bundle JSON rename");
  await validateMoveSet(bundleArtifacts.screenshotMoves, "Bundle screenshot rename");

  if (actionablePlans.length) {
    const backup = await createRenameBackup({
      actionablePlans,
      bundleArtifacts,
      referenceJsonPaths
    });
    summary.backupDir = backup.backupDir;
    summary.backupEntries = backup.copiedCount;
  }

  await applyMovesWithTemps(actualLevelMoves);
  await applyMovesWithTemps(actualScreenshotMoves);
  await applyMovesWithTemps(bundleArtifacts.jsonMoves);
  await applyMovesWithTemps(bundleArtifacts.screenshotMoves);

  const replacementEntries = buildReplacementMap(actionablePlans);
  for (const csvPath of bundleArtifacts.csvPaths) {
    if (await updateCsvReferenceFile(csvPath, replacementEntries)) summary.updatedCsvs += 1;
  }
  for (const jsonPath of referenceJsonPaths) {
    if (await updateJsonReferenceFile(jsonPath, replacementEntries)) summary.updatedJsonRefs += 1;
  }
  for (const bundleFolder of bundleArtifacts.touchedBundleFolders) {
    if (await rebuildSiblingZip(bundleFolder)) summary.rebuiltZips += 1;
  }

  const appliedStatus = `APPLIED ${timestampLabel()}`;
  for (const plan of actionablePlans) {
    plan.occurrences.forEach((entry) => rowStatuses.set(entry.rowNumber, appliedStatus));
  }
  await updateSheetStatuses({ rowStatuses, sheetHeaders: headers });

  if (!actionablePlans.length) {
    summary.syncSkipped = true;
    summary.skipped.push({ reason: "no_actionable_renames" });
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  try {
    summary.syncOutput = await syncCanonicalSpreadsheet();
    summary.syncOk = true;
  } catch (err) {
    summary.ok = false;
    summary.syncError = String(err.message || err);
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err.message || err) }, null, 2));
  process.exit(1);
});

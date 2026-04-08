#!/usr/bin/env node
import fs from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { syncGoogleSheetsTabs } from "../google_sheets_api.mjs";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DEFAULT_WORKBOOK_PATH = path.join(rootDir, "output", "spreadsheet", "Levels_feed_the_bear_after_feedback_sync.xlsx");
const DEFAULT_PAYLOAD_PATH = path.join(rootDir, "output", "spreadsheet", "Levels_feed_the_bear_after_feedback_sync_payload.json");
const DEFAULT_SPREADSHEET_ID = "1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c";

function printUsage() {
  console.log([
    "Usage:",
    "  node scripts/sync_google_sheets_payload.mjs [payloadPath] [spreadsheetId]",
    "  node scripts/sync_google_sheets_payload.mjs --canonical [--workbook PATH] [--payload PATH] [--spreadsheet-id ID]",
    "",
    "Options:",
    "  --canonical          Regenerate the canonical workbook and payload from bundles before pushing.",
    "  --payload PATH       Use a specific payload path.",
    "  --workbook PATH      Use a specific workbook output path when --canonical is enabled.",
    "  --spreadsheet-id ID  Override GOOGLE_SPREADSHEET_ID.",
    "  --help               Show this help message."
  ].join("\n"));
}

function takeOptionValue(argv, index, label) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${label}.`);
  }
  return value;
}

function parseArgs(argv) {
  const options = {
    canonical: false,
    payloadPath: "",
    workbookPath: DEFAULT_WORKBOOK_PATH,
    spreadsheetId: "",
    help: false
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--canonical") {
      options.canonical = true;
      continue;
    }
    if (arg === "--payload") {
      options.payloadPath = path.resolve(takeOptionValue(argv, index, "--payload"));
      index += 1;
      continue;
    }
    if (arg.startsWith("--payload=")) {
      options.payloadPath = path.resolve(arg.slice("--payload=".length));
      continue;
    }
    if (arg === "--workbook") {
      options.workbookPath = path.resolve(takeOptionValue(argv, index, "--workbook"));
      index += 1;
      continue;
    }
    if (arg.startsWith("--workbook=")) {
      options.workbookPath = path.resolve(arg.slice("--workbook=".length));
      continue;
    }
    if (arg === "--spreadsheet-id") {
      options.spreadsheetId = takeOptionValue(argv, index, "--spreadsheet-id").trim();
      index += 1;
      continue;
    }
    if (arg.startsWith("--spreadsheet-id=")) {
      options.spreadsheetId = arg.slice("--spreadsheet-id=".length).trim();
      continue;
    }
    positional.push(arg);
  }

  if (!options.payloadPath && positional.length) {
    options.payloadPath = path.resolve(positional.shift());
  }
  if (!options.spreadsheetId && positional.length) {
    options.spreadsheetId = positional.shift().trim();
  }

  return {
    ...options,
    payloadPath: options.payloadPath || DEFAULT_PAYLOAD_PATH,
    spreadsheetId: options.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID
  };
}

async function regenerateCanonicalArtifacts({ workbookPath, payloadPath }) {
  await execFileAsync("python3", [
    path.join(rootDir, "scripts", "sync_levels_spreadsheet.py"),
    "--from-bundles",
    "--output",
    workbookPath,
    "--payload-output",
    payloadPath
  ], { cwd: rootDir });
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printUsage();
  process.exit(0);
}

if (options.canonical) {
  await regenerateCanonicalArtifacts({
    workbookPath: options.workbookPath,
    payloadPath: options.payloadPath
  });
}

if (!fs.existsSync(options.payloadPath)) {
  console.error(`Payload not found: ${options.payloadPath}`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(options.payloadPath, "utf8"));
const proceduralPath = path.join(rootDir, "output", "procedural", "procedural_learning_snapshot.json");

function resolveProceduralFeatures(entry = {}) {
  return entry.corrected_features || entry.features || {};
}

function proceduralFeedback(entry = {}) {
  return entry.feedback || entry.reason || entry.note || "";
}

function proceduralTags(entry = {}) {
  if (Array.isArray(entry.tags)) return entry.tags.join(", ");
  return entry.tags || "";
}

function formatProceduralTimestamp(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const date = new Date(numeric);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function proceduralRow(bucket, entry = {}) {
  const features = resolveProceduralFeatures(entry);
  return [
    bucket,
    entry.level ?? features.level ?? "",
    entry.context || "",
    entry.source_file || "",
    features.boardWidth && features.boardHeight ? `${features.boardWidth}x${features.boardHeight}` : "",
    features.pairs ?? "",
    features.blockers ?? "",
    features.moves ?? "",
    features.solutions ?? "",
    proceduralFeedback(entry),
    proceduralTags(entry),
    formatProceduralTimestamp(entry.timestamp)
  ];
}

if (fs.existsSync(proceduralPath)) {
  const procedural = JSON.parse(fs.readFileSync(proceduralPath, "utf8"));
  const approved = procedural.latest_approved || [];
  const rejected = procedural.latest_rejected || [];
  const corrections = procedural.latest_corrections || [];
  payload.proceduralHeaders = ["Bucket", "Level", "Context", "Source File", "Board", "Pairs", "Blockers", "Moves", "Solutions", "Feedback", "Tags", "Timestamp"];
  payload.proceduralRows = [
    ...approved.map((entry) => proceduralRow("Approved", entry)),
    ...rejected.map((entry) => proceduralRow("Rejected", entry)),
    ...corrections.map((entry) => proceduralRow("Correction", entry))
  ];
}
const result = await syncGoogleSheetsTabs({
  rootDir,
  credentialsPath: process.env.GOOGLE_OAUTH_CLIENT_PATH || ".local/google_oauth_client.json",
  tokenPath: process.env.GOOGLE_SHEETS_TOKEN_PATH || ".local/google_sheets_token.json",
  spreadsheetId: options.spreadsheetId,
  payload
});

console.log(JSON.stringify({
  ok: true,
  mode: options.canonical ? "canonical_regenerate_and_push" : "push_existing_payload",
  regenerated: options.canonical,
  spreadsheetId: options.spreadsheetId,
  workbookPath: options.canonical ? options.workbookPath : "",
  payloadPath: options.payloadPath,
  tabs: result.tabs || [],
  screenshotWarning: result.screenshotWarning || ""
}, null, 2));

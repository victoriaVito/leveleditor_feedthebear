import "dotenv/config";
import http from "node:http";
import { readFile, writeFile, mkdir, stat, appendFile, mkdtemp, rm, readdir } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  completeGoogleSheetsAuth,
  createGoogleSheetsAuthUrl,
  disconnectGoogleSheetsAuth,
  getGoogleSheetsAuthStatus,
  syncGoogleSheetsTabs,
  syncFeedbackSheets,
  pullFeedbackFromSheet
} from "./google_sheets_api.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

// ── Map .env SPREADSHEET_ID → GOOGLE_SPREADSHEET_ID if needed ──
if (!process.env.GOOGLE_SPREADSHEET_ID && process.env.SPREADSHEET_ID) {
  process.env.GOOGLE_SPREADSHEET_ID = process.env.SPREADSHEET_ID;
}
const WEB_DIR = path.join(ROOT_DIR, "level_toolkit_web");
const PORT = Number(process.env.PORT || 8080);
const execFileAsync = promisify(execFile);
const googleAuthStates = new Map();
const LOCAL_STORE_EXPORT_DIR = path.join(ROOT_DIR, ".local", "browser_state_exports");
const LATEST_BROWSER_STATE_BUNDLE = path.join(LOCAL_STORE_EXPORT_DIR, "latest_browser_state_bundle.json");
const MAX_BROWSER_STATE_ARCHIVES = 10;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}

function resolveOutputPath(baseDir, relativePath) {
  const base = path.isAbsolute(baseDir) ? baseDir : path.join(ROOT_DIR, baseDir);
  return path.normalize(path.join(base, relativePath));
}

function globToRegExp(pattern) {
  const source = String(pattern || "*")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${source}$`, "i");
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function timestampFileSafe(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, "-");
}

async function pruneBrowserStateArchives() {
  try {
    const entries = await readdir(LOCAL_STORE_EXPORT_DIR, { withFileTypes: true });
    const archives = entries
      .filter((entry) => entry.isFile() && /^browser_state_bundle_.*\.json$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    const excess = Math.max(0, archives.length - MAX_BROWSER_STATE_ARCHIVES);
    for (const name of archives.slice(0, excess)) {
      await rm(path.join(LOCAL_STORE_EXPORT_DIR, name), { force: true });
    }
  } catch (_err) {
    // Best-effort pruning only.
  }
}

async function appendRepoFile(relativePath, content) {
  try {
    const targetPath = resolveOutputPath(ROOT_DIR, relativePath);
    // Ensure directory exists
    const dir = path.dirname(targetPath);
    await mkdir(dir, { recursive: true });
    // Append content to file
    await appendFile(targetPath, content, "utf8");
    return { ok: true, path: targetPath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function safeProgressionName(value) {
  return String(value || "").trim().replace(/\.json$/i, "");
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch (_err) {
    return false;
  }
}

async function collectProgressionIntrospection() {
  const progressionsDir = path.join(ROOT_DIR, "progressions");
  let entries = [];
  try {
    entries = await readdir(progressionsDir, { withFileTypes: true });
  } catch (_err) {
    entries = [];
  }
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .filter((name) => !["manager_progressions_live.json", "level_manager_state.json", "level_manager_metadata.json"].includes(name))
    .sort((left, right) => left.localeCompare(right));

  const result = [];
  for (const fileName of jsonFiles) {
    const jsonPath = path.join(progressionsDir, fileName);
    let parsed = null;
    try {
      parsed = JSON.parse(await readFile(jsonPath, "utf8"));
    } catch (_err) {
      parsed = null;
    }
    const stem = path.parse(fileName).name;
    const bundleFolderPath = path.join(ROOT_DIR, "bundles", stem);
    const bundleZipPath = `${bundleFolderPath}.zip`;
    const bundleFolderExists = await pathExists(bundleFolderPath);
    const bundleZipExists = await pathExists(bundleZipPath);
    const slots = Array.isArray(parsed?.slots) ? parsed.slots.length : null;
    result.push({
      name: parsed?.name || stem,
      fileName,
      jsonPath: path.relative(ROOT_DIR, jsonPath),
      slotCount: slots,
      tutorialLevelFile: parsed?.tutorial_level_file || "",
      bundleFolderPath: path.relative(ROOT_DIR, bundleFolderPath),
      bundleFolderExists,
      bundleZipPath: path.relative(ROOT_DIR, bundleZipPath),
      bundleZipExists
    });
  }

  const bundleEntries = [];
  let bundleNames = [];
  try {
    bundleNames = (await readdir(path.join(ROOT_DIR, "bundles"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (_err) {
    bundleNames = [];
  }
  for (const name of bundleNames) {
    const folderPath = path.join(ROOT_DIR, "bundles", name);
    const zipPath = `${folderPath}.zip`;
    bundleEntries.push({
      name,
      folderPath: path.relative(ROOT_DIR, folderPath),
      folderExists: true,
      zipPath: path.relative(ROOT_DIR, zipPath),
      zipExists: await pathExists(zipPath)
    });
  }

  return {
    ok: true,
    progressions: result,
    bundles: bundleEntries
  };
}

async function runCanonicalSpreadsheetSync(spreadsheetId) {
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID env var not set.");
  const { stdout } = await execFileAsync("node", [
    path.join(ROOT_DIR, "scripts", "sync_google_sheets_payload.mjs"),
    "--canonical",
    "--spreadsheet-id",
    spreadsheetId
  ], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      GOOGLE_SPREADSHEET_ID: spreadsheetId
    }
  });
  return JSON.parse(String(stdout || "{}").trim() || "{}");
}

async function serveStatic(req, res) {
  const reqPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const staticRoots = [
    { prefix: "/levels/", dir: path.join(ROOT_DIR, "levels") },
    { prefix: "/benchmark_flow_free/", dir: path.join(ROOT_DIR, "benchmark_flow_free") },
    { prefix: "/screenshots/", dir: path.join(ROOT_DIR, "levels", "screenshots") },
    { prefix: "/progressions/", dir: path.join(ROOT_DIR, "progressions") },
    { prefix: "/playtest/", dir: path.join(ROOT_DIR, "playtest") },
    { prefix: "/bundles/", dir: path.join(ROOT_DIR, "bundles") },
    { prefix: "/.local/", dir: path.join(ROOT_DIR, ".local") }
  ];
  const matchedRoot = staticRoots.find((entry) => reqPath.startsWith(entry.prefix));
  const baseDir = matchedRoot ? matchedRoot.dir : WEB_DIR;
  const relativeReqPath = matchedRoot
    ? reqPath.slice(matchedRoot.prefix.length)
    : reqPath.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(baseDir, relativeReqPath || "index.html"));
  if (!filePath.startsWith(baseDir)) return send(res, 403, "Forbidden");
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      const nextUrl = matchedRoot
        ? `${matchedRoot.prefix}${path.posix.join(relativeReqPath, "index.html")}`
        : path.posix.join(reqPath, "index.html");
      return serveStatic({ ...req, url: nextUrl }, res);
    }
    const ext = path.extname(filePath).toLowerCase();
    const content = await readFile(filePath);
    return send(res, 200, content, mimeTypes[ext] || "application/octet-stream");
  } catch (_err) {
    return send(res, 404, "Not found");
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, "");

  if (req.method === "GET" && req.url.startsWith("/api/file-status")) {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const relativePath = String(url.searchParams.get("relativePath") || "").replace(/^\/+/, "");
      const baseDir = url.searchParams.get("baseDir") || ROOT_DIR;
      if (!relativePath) {
        return send(res, 400, JSON.stringify({ ok: false, error: "Missing relativePath" }), "application/json; charset=utf-8");
      }
      const targetPath = resolveOutputPath(baseDir, relativePath);
      try {
        const fileStat = await stat(targetPath);
        return send(
          res,
          200,
          JSON.stringify({ ok: true, exists: true, isDirectory: fileStat.isDirectory(), path: targetPath }),
          "application/json; charset=utf-8"
        );
      } catch (_err) {
        return send(
          res,
          200,
          JSON.stringify({ ok: true, exists: false, isDirectory: false, path: targetPath }),
          "application/json; charset=utf-8"
        );
      }
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "GET" && req.url.startsWith("/api/progressions")) {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const name = safeProgressionName(url.searchParams.get("name"));
      const summary = await collectProgressionIntrospection();
      if (!name) {
        return send(res, 200, JSON.stringify(summary), "application/json; charset=utf-8");
      }
      const progression = summary.progressions.find((entry) => safeProgressionName(entry.fileName) === name || safeProgressionName(entry.name) === name);
      if (!progression) {
        return send(res, 404, JSON.stringify({ ok: false, error: `Unknown progression: ${name}` }), "application/json; charset=utf-8");
      }
      return send(res, 200, JSON.stringify({ ok: true, progression }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "GET" && req.url.startsWith("/api/list-level-files")) {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const dir = String(url.searchParams.get("dir") || "levels").replace(/^\/+/, "");
      const pattern = String(url.searchParams.get("pattern") || "*.json").trim() || "*.json";
      const maxFiles = Math.max(1, Math.min(500, Number(url.searchParams.get("maxFiles") || 250)));
      const targetDir = resolveOutputPath(ROOT_DIR, dir);
      if (!targetDir.startsWith(ROOT_DIR)) {
        return send(res, 403, JSON.stringify({ ok: false, error: "Forbidden" }), "application/json; charset=utf-8");
      }
      const matcher = globToRegExp(pattern);
      const entries = await readdir(targetDir, { withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile() && matcher.test(entry.name))
        .map((entry) => ({
          name: entry.name,
          relativePath: path.relative(ROOT_DIR, path.join(targetDir, entry.name))
        }))
        .sort((left, right) => left.name.localeCompare(right.name))
        .slice(0, maxFiles);
      return send(
        res,
        200,
        JSON.stringify({ ok: true, dir, pattern, files }),
        "application/json; charset=utf-8"
      );
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "GET" && req.url.startsWith("/api/playtest-summary")) {
    try {
      const summaryPath = path.join(ROOT_DIR, "output", "playtest", "playtest_summary.json");
      const raw = await readFile(summaryPath, "utf8");
      const parsed = JSON.parse(raw);
      return send(res, 200, JSON.stringify({ ok: true, summary: parsed }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 200, JSON.stringify({ ok: false, error: err.message, summary: null }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/local-store/browser-sync") {
    try {
      const payload = JSON.parse(await readBody(req));
      const snapshot = {
        source: payload.source || "toolkit_web",
        reason: payload.reason || "manual_sync",
        savedAt: new Date().toISOString(),
        snapshots: payload.snapshots || {}
      };
      await mkdir(LOCAL_STORE_EXPORT_DIR, { recursive: true });
      await writeFile(LATEST_BROWSER_STATE_BUNDLE, JSON.stringify(snapshot, null, 2), "utf8");
      const archivePath = path.join(LOCAL_STORE_EXPORT_DIR, `browser_state_bundle_${timestampFileSafe()}.json`);
      await writeFile(archivePath, JSON.stringify(snapshot, null, 2), "utf8");
      await pruneBrowserStateArchives();
      return send(
        res,
        200,
        JSON.stringify({ ok: true, path: LATEST_BROWSER_STATE_BUNDLE, archivePath }),
        "application/json; charset=utf-8"
      );
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "GET" && req.url.startsWith("/api/local-store/browser-state")) {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const requestedKinds = url.searchParams.getAll("kind");
      try {
        const raw = await readFile(LATEST_BROWSER_STATE_BUNDLE, "utf8");
        const bundle = JSON.parse(raw);
        const allSnapshots = bundle.snapshots || {};
        const snapshots = requestedKinds.length
          ? Object.fromEntries(requestedKinds.filter((kind) => Object.prototype.hasOwnProperty.call(allSnapshots, kind)).map((kind) => [kind, allSnapshots[kind]]))
          : allSnapshots;
        return send(
          res,
          200,
          JSON.stringify({ ok: true, savedAt: bundle.savedAt || null, snapshots }),
          "application/json; charset=utf-8"
        );
      } catch (_err) {
        return send(res, 200, JSON.stringify({ ok: true, savedAt: null, snapshots: {} }), "application/json; charset=utf-8");
      }
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/save-file") {
    try {
      const payload = JSON.parse(await readBody(req));
      const targetPath = resolveOutputPath(payload.baseDir || ROOT_DIR, payload.relativePath || "output.txt");
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, payload.content || "", "utf8");
      return send(res, 200, JSON.stringify({ ok: true, path: targetPath }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/save-data-url") {
    try {
      const payload = JSON.parse(await readBody(req));
      const match = String(payload.dataUrl || "").match(/^data:(.+);base64,(.+)$/);
      if (!match) return send(res, 400, JSON.stringify({ ok: false, error: "Invalid data URL" }), "application/json; charset=utf-8");
      const targetPath = resolveOutputPath(payload.baseDir || ROOT_DIR, payload.relativePath || "image.png");
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, Buffer.from(match[2], "base64"));
      return send(res, 200, JSON.stringify({ ok: true, path: targetPath }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/append-file") {
    try {
      const payload = JSON.parse(await readBody(req));
      const targetPath = resolveOutputPath(payload.baseDir || ROOT_DIR, payload.relativePath || "append.log");
      await mkdir(path.dirname(targetPath), { recursive: true });
      await appendFile(targetPath, payload.content || "", "utf8");
      return send(res, 200, JSON.stringify({ ok: true, path: targetPath }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/create-zip") {
    let tempDir = null;
    try {
      const payload = JSON.parse(await readBody(req));
      const archiveName = String(payload.archiveName || "bundle.zip").replace(/[^a-zA-Z0-9._-]+/g, "_");
      const targetPath = resolveOutputPath(payload.baseDir || ROOT_DIR, payload.relativePath || `bundles/${archiveName}`);
      tempDir = await mkdtemp(path.join(os.tmpdir(), "ftb-zip-"));
      for (const entry of payload.entries || []) {
        const relativePath = String(entry.relativePath || "").replace(/^\/+/, "");
        if (!relativePath) continue;
        const outPath = path.join(tempDir, relativePath);
        await mkdir(path.dirname(outPath), { recursive: true });
        if (entry.dataUrl) {
          const match = String(entry.dataUrl).match(/^data:(.+);base64,(.+)$/);
          if (!match) throw new Error(`Invalid data URL for ${relativePath}`);
          await writeFile(outPath, Buffer.from(match[2], "base64"));
        } else {
          await writeFile(outPath, entry.content || "", "utf8");
        }
      }
      await mkdir(path.dirname(targetPath), { recursive: true });
      await execFileAsync("zip", ["-rq", targetPath, "."], { cwd: tempDir });
      await rm(tempDir, { recursive: true, force: true });
      return send(res, 200, JSON.stringify({ ok: true, path: targetPath }), "application/json; charset=utf-8");
    } catch (err) {
      if (tempDir) await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/read-local-file") {
    try {
      const payload = JSON.parse(await readBody(req));
      const targetPath = resolveOutputPath(payload.baseDir || ROOT_DIR, payload.relativePath || "");
      const fileData = await readFile(targetPath);
      return send(
        res,
        200,
        JSON.stringify({ ok: true, path: targetPath, data: fileData.toString("base64") }),
        "application/json; charset=utf-8"
      );
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/sync-levels-workbook") {
    let tempDir = null;
    try {
      const payload = JSON.parse(await readBody(req));
      tempDir = await mkdtemp(path.join(os.tmpdir(), "ftb-sheet-sync-"));
      const payloadPath = path.join(tempDir, "payload.json");
      await writeFile(payloadPath, JSON.stringify(payload.snapshot || {}, null, 2), "utf8");
      const syncPayloadPath = path.join(tempDir, "sync_payload.json");
      const workbookPath = resolveOutputPath(payload.baseDir || ROOT_DIR, payload.relativePath || "output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx");
      const templatePath = String(payload.templatePath || "");
      await mkdir(path.dirname(workbookPath), { recursive: true });
      const args = [
        path.join(ROOT_DIR, "scripts", "sync_levels_spreadsheet.py"),
        "--output",
        workbookPath,
        "--snapshot",
        payloadPath,
        "--payload-output",
        syncPayloadPath
      ];
      if (templatePath) {
        args.push("--template", templatePath);
      }
      await execFileAsync("python3", args, { cwd: ROOT_DIR });
      let pushed = false;
      let pushMode = "none";
      let pushError = "";
      const syncMode = String(payload.googleSyncMethod || "workbook_only");
      if (syncMode === "sheets_api") {
        try {
          if (!payload.googleCredentialsPath || !payload.googleTokenPath || !payload.spreadsheetId) {
            throw new Error("Google Sheets API sync requires a spreadsheet ID, OAuth client path, and token path.");
          }
          const syncPayload = JSON.parse(await readFile(syncPayloadPath, "utf8"));
          await syncGoogleSheetsTabs({
            rootDir: ROOT_DIR,
            credentialsPath: payload.googleCredentialsPath,
            tokenPath: payload.googleTokenPath,
            spreadsheetId: payload.spreadsheetId,
            payload: syncPayload
          });
          pushed = true;
          pushMode = "sheets_api";
        } catch (err) {
          pushError = String(err.message || err);
        }
      }
      await rm(tempDir, { recursive: true, force: true });
      return send(res, 200, JSON.stringify({ ok: true, path: workbookPath, pushed, pushMode, pushError }), "application/json; charset=utf-8");
    } catch (err) {
      if (tempDir) await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/apply-sheet-renames") {
    try {
      const payload = JSON.parse(await readBody(req));
      const spreadsheetId = String(payload.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID || "").trim();
      const renameSheetName = String(payload.renameSheetName || "Level Renames").trim() || "Level Renames";
      if (!spreadsheetId) {
        throw new Error("Spreadsheet ID is required to apply sheet-driven renames.");
      }
      const { stdout } = await execFileAsync("node", [
        path.join(ROOT_DIR, "scripts", "apply_sheet_level_renames.mjs"),
        spreadsheetId,
        renameSheetName
      ], {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          GOOGLE_SPREADSHEET_ID: spreadsheetId
        }
      });
      const result = JSON.parse(String(stdout || "{}").trim() || "{}");
      return send(res, result.ok ? 200 : 500, JSON.stringify(result), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/open-bridge") {
    try {
      const scriptPath = path.join(ROOT_DIR, "scripts", "bridge.sh");
      const guiPath = path.join(ROOT_DIR, "scripts", "bear_reporting_sync_gui.py");
      let child;
      try {
        await stat(scriptPath);
        child = spawn("bash", [scriptPath], {
          cwd: ROOT_DIR,
          detached: true,
          stdio: "ignore",
          env: {
            ...process.env,
            BRIDGE_AUTO_START_SERVER: "0",
            BRIDGE_OPEN_BROWSER: "0"
          }
        });
      } catch (_missingScript) {
        await stat(guiPath);
        child = spawn("python3", [guiPath], {
          cwd: ROOT_DIR,
          detached: true,
          stdio: "ignore",
          env: {
            ...process.env
          }
        });
      }
      child.unref();
      return send(res, 200, JSON.stringify({ ok: true, pid: child.pid, script: scriptPath }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/google-sheets-auth-url") {
    try {
      const payload = JSON.parse(await readBody(req));
      const { authUrl } = await createGoogleSheetsAuthUrl({
        rootDir: ROOT_DIR,
        credentialsPath: payload.credentialsPath,
        tokenPath: payload.tokenPath,
        baseUrl: payload.baseUrl || `http://127.0.0.1:${PORT}`,
        stateStore: googleAuthStates
      });
      return send(res, 200, JSON.stringify({ ok: true, authUrl }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/google-sheets-status") {
    try {
      const payload = JSON.parse(await readBody(req));
      const status = await getGoogleSheetsAuthStatus({
        rootDir: ROOT_DIR,
        credentialsPath: payload.credentialsPath,
        tokenPath: payload.tokenPath
      });
      return send(res, 200, JSON.stringify({ ok: true, status }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/google-sheets-disconnect") {
    try {
      const payload = JSON.parse(await readBody(req));
      const result = await disconnectGoogleSheetsAuth({
        rootDir: ROOT_DIR,
        tokenPath: payload.tokenPath
      });
      return send(res, 200, JSON.stringify({ ok: true, ...result }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  if (req.method === "POST" && req.url === "/api/push-google-sheet") {
    try {
      const payload = JSON.parse(await readBody(req));
      const response = await fetch(String(payload.url || ""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.payload || {})
      });
      const text = await response.text();
      if (!response.ok) {
        return send(res, response.status, JSON.stringify({ ok: false, error: text || `Push failed (${response.status})` }), "application/json; charset=utf-8");
      }
      return send(res, 200, JSON.stringify({ ok: true, body: text }), "application/json; charset=utf-8");
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message }), "application/json; charset=utf-8");
    }
  }

  // ── Action endpoints (triggered from spreadsheet links) ──────────────
  if (req.method === "GET" && req.url.startsWith("/api/action/")) {
    const actionName = req.url.replace(/^\/api\/action\//, "").split("?")[0];
    const actionResult = (ok, data) =>
      send(
        res,
        ok ? 200 : 500,
        `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:24px;max-width:640px">` +
          `<h2 style="color:${ok ? "#16a34a" : "#dc2626"}">${ok ? "Done" : "Error"}</h2>` +
          `<p><strong>${actionName}</strong></p>` +
          `<pre style="background:#f1f5f9;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px">${
            typeof data === "string" ? data : JSON.stringify(data, null, 2)
          }</pre>` +
          `<p style="color:#64748b;font-size:13px">You can close this tab.</p></body></html>`,
        "text/html; charset=utf-8"
      );

    try {
      if (actionName === "sync-spreadsheet") {
        const parsed = await runCanonicalSpreadsheetSync(process.env.GOOGLE_SPREADSHEET_ID || "");
        return actionResult(parsed.ok !== false, parsed);
      }

      if (actionName === "force-sync") {
        const parsed = await runCanonicalSpreadsheetSync(process.env.GOOGLE_SPREADSHEET_ID || "");
        return actionResult(parsed.ok !== false, parsed);
      }

      if (actionName === "sync-feedback") {
        const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || "";
        if (!spreadsheetId) return actionResult(false, "GOOGLE_SPREADSHEET_ID env var not set.");
        const payloadPath = path.join(ROOT_DIR, "output", "spreadsheet", "Levels_feed_the_bear_after_feedback_sync_payload.json");
        let payload = {};
        try {
          payload = JSON.parse(await readFile(payloadPath, "utf8"));
        } catch (err) {
          return actionResult(false, `Could not read payload: ${err.message}\nRun generate-payload first.`);
        }
        const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
        const testerNames = (url.searchParams.get("testers") || "").split(",").map((s) => s.trim()).filter(Boolean);
        const result = await syncFeedbackSheets({
          rootDir: ROOT_DIR,
          spreadsheetId,
          payload,
          testerNames
        });
        return actionResult(result.ok !== false, result);
      }

      if (actionName === "pull-feedback") {
        const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || "";
        if (!spreadsheetId) return actionResult(false, "GOOGLE_SPREADSHEET_ID env var not set.");
        const result = await pullFeedbackFromSheet({
          rootDir: ROOT_DIR,
          spreadsheetId
        });
        return actionResult(result.ok !== false, result);
      }

      if (actionName === "regenerate-confluence") {
        const { stdout, stderr } = await execFileAsync("python3", [
          path.join(ROOT_DIR, "scripts", "generate_full_confluence_page.py")
        ], { cwd: ROOT_DIR });
        return actionResult(true, stdout || stderr || "Confluence page regenerated.");
      }

      if (actionName === "generate-payload") {
        const workbookPath = path.join(ROOT_DIR, "output", "spreadsheet", "Levels_feed_the_bear_after_feedback_sync.xlsx");
        const payloadPath = path.join(ROOT_DIR, "output", "spreadsheet", "Levels_feed_the_bear_after_feedback_sync_payload.json");
        await execFileAsync("python3", [
          path.join(ROOT_DIR, "scripts", "sync_levels_spreadsheet.py"),
          "--from-bundles",
          "--output", workbookPath,
          "--payload-output", payloadPath
        ], { cwd: ROOT_DIR });
        return actionResult(true, `Payload regenerated.\nWorkbook: ${workbookPath}\nPayload: ${payloadPath}`);
      }

      if (actionName === "apply-level-renames") {
        const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || "";
        if (!spreadsheetId) return actionResult(false, "GOOGLE_SPREADSHEET_ID env var not set.");
        const { stdout } = await execFileAsync("node", [
          path.join(ROOT_DIR, "scripts", "apply_sheet_level_renames.mjs"),
          spreadsheetId,
          "Level Renames"
        ], {
          cwd: ROOT_DIR,
          env: {
            ...process.env,
            GOOGLE_SPREADSHEET_ID: spreadsheetId
          }
        });
        const parsed = JSON.parse(String(stdout || "{}").trim() || "{}");
        return actionResult(parsed.ok !== false, parsed);
      }

      if (actionName === "materialize-mixes") {
        const { stdout } = await execFileAsync("node", [
          path.join(ROOT_DIR, "scripts", "materialize_approved_mixes.mjs")
        ], { cwd: ROOT_DIR, env: { ...process.env } });
        return actionResult(true, stdout || "Materialization complete.");
      }

      if (actionName === "random-fill-curve") {
        const { stdout } = await execFileAsync("node", [
          path.join(ROOT_DIR, "scripts", "random_fill_curve.mjs")
        ], { cwd: ROOT_DIR, env: { ...process.env } });
        const parsed = JSON.parse(String(stdout || "{}").trim() || "{}");
        return actionResult(parsed.ok !== false, parsed);
      }

      if (actionName === "materialize-curve") {
        const { stdout } = await execFileAsync("node", [
          path.join(ROOT_DIR, "scripts", "materialize_curve_builder.mjs")
        ], { cwd: ROOT_DIR, env: { ...process.env } });
        const parsed = JSON.parse(String(stdout || "{}").trim() || "{}");
        return actionResult(parsed.ok !== false, parsed);
      }

      if (actionName === "open-toolkit") {
        res.writeHead(302, { Location: `http://127.0.0.1:${PORT}/` });
        res.end();
        return;
      }

      if (actionName === "backup-progressions") {
        const ts = timestampFileSafe();
        const backupDir = path.join(ROOT_DIR, "backups", `progressions_${ts}`);
        await mkdir(backupDir, { recursive: true });
        const bundlesDir = path.join(ROOT_DIR, "bundles");
        const entries = await readdir(bundlesDir, { withFileTypes: true });
        const folders = entries.filter((e) => e.isDirectory() && e.name.startsWith("original_"));
        let copied = 0;
        for (const folder of folders) {
          const src = path.join(bundlesDir, folder.name);
          const dest = path.join(backupDir, folder.name);
          await execFileAsync("cp", ["-R", src, dest]);
          copied++;
        }
        return actionResult(true, `Backed up ${copied} progression folders to:\n${backupDir}`);
      }

      if (actionName === "validate-levels") {
        const bundlesDir = path.join(ROOT_DIR, "bundles");
        const entries = await readdir(bundlesDir, { withFileTypes: true });
        const folders = entries.filter((e) => e.isDirectory() && e.name.startsWith("original_"));
        const issues = [];
        let total = 0;
        for (const folder of folders) {
          const jsonsDir = path.join(bundlesDir, folder.name, "jsons");
          let files;
          try { files = await readdir(jsonsDir); } catch { continue; }
          for (const file of files.filter((f) => f.endsWith(".json"))) {
            total++;
            try {
              const level = JSON.parse(await readFile(path.join(jsonsDir, file), "utf8"));
              if (!level.pairs || level.pairs.length === 0) issues.push(`${folder.name}/${file}: no pairs`);
              if (!level.gridSize) issues.push(`${folder.name}/${file}: no gridSize`);
              if (level.validation && !level.validation.solvable) issues.push(`${folder.name}/${file}: marked unsolvable`);
            } catch (err) {
              issues.push(`${folder.name}/${file}: ${err.message}`);
            }
          }
        }
        const summary = issues.length
          ? `${total} levels checked, ${issues.length} issues:\n\n${issues.join("\n")}`
          : `${total} levels checked, all OK.`;
        return actionResult(issues.length === 0, summary);
      }

      if (actionName === "export-progression") {
        const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
        const progressionName = safeProgressionName(url.searchParams.get("name") || url.searchParams.get("progression"));
        if (!progressionName) {
          return actionResult(false, "Missing progression name.");
        }
        const { stdout } = await execFileAsync("node", [
          path.join(ROOT_DIR, "scripts", "export_progression_artifact.mjs"),
          progressionName
        ], { cwd: ROOT_DIR, env: { ...process.env } });
        const parsed = JSON.parse(String(stdout || "{}").trim() || "{}");
        return actionResult(parsed.ok !== false, parsed);
      }

      return actionResult(false, `Unknown action: ${actionName}`);
    } catch (err) {
      return actionResult(false, err.message);
    }
  }

  if (req.method === "GET" && req.url.startsWith("/api/google-sheets-auth-callback")) {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) throw new Error("Missing OAuth callback code or state.");
      const result = await completeGoogleSheetsAuth({
        rootDir: ROOT_DIR,
        code,
        state,
        stateStore: googleAuthStates
      });
      const html = `<!doctype html><html><body style="font-family: sans-serif; padding: 24px;"><h2>Google Sheets API connected</h2><p>Token saved to:</p><pre>${result.tokenFile}</pre><p>You can close this tab and return to the toolkit.</p></body></html>`;
      return send(res, 200, html, "text/html; charset=utf-8");
    } catch (err) {
      const html = `<!doctype html><html><body style="font-family: sans-serif; padding: 24px;"><h2>Google Sheets API connection failed</h2><pre>${err.message}</pre></body></html>`;
      return send(res, 500, html, "text/html; charset=utf-8");
    }
  }

  return serveStatic(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Toolkit server running at http://127.0.0.1:${PORT}`);
});

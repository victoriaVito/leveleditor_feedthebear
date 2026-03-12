import http from "node:http";
import { readFile, writeFile, mkdir, stat, appendFile, mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  completeGoogleSheetsAuth,
  createGoogleSheetsAuthUrl,
  disconnectGoogleSheetsAuth,
  getGoogleSheetsAuthStatus,
  syncGoogleSheetsTabs
} from "./google_sheets_api.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const WEB_DIR = path.join(ROOT_DIR, "level_toolkit_web");
const PORT = Number(process.env.PORT || 8080);
const execFileAsync = promisify(execFile);
const googleAuthStates = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
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

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(req, res) {
  const reqPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const staticRoots = [
    { prefix: "/levels/", dir: path.join(ROOT_DIR, "levels") },
    { prefix: "/progressions/", dir: path.join(ROOT_DIR, "progressions") },
    { prefix: "/playtest/", dir: path.join(ROOT_DIR, "playtest") },
    { prefix: "/bundles/", dir: path.join(ROOT_DIR, "bundles") }
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

  if (req.method === "POST" && req.url === "/api/sync-levels-workbook") {
    let tempDir = null;
    try {
      const payload = JSON.parse(await readBody(req));
      tempDir = await mkdtemp(path.join(os.tmpdir(), "ftb-sheet-sync-"));
      const payloadPath = path.join(tempDir, "payload.json");
      await writeFile(payloadPath, JSON.stringify(payload.snapshot || {}, null, 2), "utf8");
      const syncPayloadPath = path.join(tempDir, "sync_payload.json");
      const workbookPath = resolveOutputPath(payload.baseDir || ROOT_DIR, payload.relativePath || "output/spreadsheet/Levels_feed_the_bear_linked.xlsx");
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
      } else if (syncMode === "apps_script") {
        try {
          if (!payload.googleWebAppUrl) {
            throw new Error("Apps Script sync requires a web app URL.");
          }
          const syncPayload = JSON.parse(await readFile(syncPayloadPath, "utf8"));
          const response = await fetch(String(payload.googleWebAppUrl), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              spreadsheetId: payload.spreadsheetId || "",
              ...syncPayload
            })
          });
          if (!response.ok) {
            throw new Error(`Google Sheet push failed (${response.status})`);
          }
          pushed = true;
          pushMode = "apps_script";
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

import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const WEB_DIR = path.join(ROOT_DIR, "level_toolkit_web");
const PORT = Number(process.env.PORT || 8080);

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
  const filePath = path.normalize(path.join(WEB_DIR, reqPath));
  if (!filePath.startsWith(WEB_DIR)) return send(res, 403, "Forbidden");
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) return serveStatic({ ...req, url: path.join(reqPath, "index.html") }, res);
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

  return serveStatic(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Toolkit server running at http://127.0.0.1:${PORT}`);
});

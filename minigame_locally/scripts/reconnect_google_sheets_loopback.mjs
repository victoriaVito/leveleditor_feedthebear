#!/usr/bin/env node
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const credentialsPath = path.join(rootDir, ".local/google_oauth_client.json");
const tokenPath = path.join(rootDir, ".local/google_sheets_token.json");
const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly"
];

function parseScopeInput(input) {
  return String(input || "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const envScopes = parseScopeInput(process.env.GOOGLE_OAUTH_SCOPES);
const scope = (envScopes.length ? envScopes : DEFAULT_SCOPES).join(" ");

function parseOAuthClient(credentials) {
  const block = credentials.installed || credentials.web || credentials;
  if (!block?.client_id || !block?.client_secret) {
    throw new Error("Google OAuth client JSON must include client_id and client_secret.");
  }
  return {
    clientId: block.client_id,
    clientSecret: block.client_secret,
    authUri: block.auth_uri || "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUri: block.token_uri || "https://oauth2.googleapis.com/token",
    redirectUris: Array.isArray(block.redirect_uris) ? block.redirect_uris : []
  };
}

function buildLoopbackRedirect(oauth, port) {
  const base = oauth.redirectUris.find((uri) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(uri || ""));
  if (!base) {
    throw new Error("OAuth client does not include a localhost redirect URI, so loopback auth cannot start.");
  }
  const url = new URL(base);
  const pathname = url.pathname === "/" ? "" : url.pathname;
  return `http://localhost:${port}${pathname}`;
}

async function openInBrowser(url) {
  const profileDir = String(process.env.GOOGLE_CHROME_PROFILE_DIR || "").trim();
  try {
    if (profileDir) {
      await execFileAsync("open", [
        "-na",
        "Google Chrome",
        "--args",
        `--profile-directory=${profileDir}`,
        url
      ]);
    } else {
      await execFileAsync("open", [url]);
    }
    return true;
  } catch (_err) {
    return false;
  }
}

async function exchangeAuthorizationCode({ oauth, code, redirectUri }) {
  const form = new URLSearchParams({
    code,
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });
  const response = await fetch(oauth.tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_err) {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(body.error_description || body.error?.message || body.error || `Token exchange failed (${response.status})`);
  }
  return body;
}

const oauth = parseOAuthClient(JSON.parse(await readFile(credentialsPath, "utf8")));
const requestedPort = Number(process.env.GOOGLE_OAUTH_LOOPBACK_PORT || process.argv[2] || "8765");
const port = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 8765;
const redirectUri = buildLoopbackRedirect(oauth, port);
const state = crypto.randomUUID();

const callbackResult = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    server.close(() => reject(new Error("Timed out waiting for the Google OAuth callback.")));
  }, 180_000);

  const server = http.createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", redirectUri);
      if (requestUrl.pathname !== new URL(redirectUri).pathname) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found.");
        return;
      }
      const returnedState = requestUrl.searchParams.get("state") || "";
      const code = requestUrl.searchParams.get("code") || "";
      const error = requestUrl.searchParams.get("error") || "";
      if (error) {
        clearTimeout(timeout);
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`OAuth failed: ${error}. You can close this tab.`);
        server.close(() => reject(new Error(`Google OAuth failed: ${error}`)));
        return;
      }
      if (!code || returnedState !== state) {
        clearTimeout(timeout);
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Invalid OAuth callback. You can close this tab.");
        server.close(() => reject(new Error("OAuth callback was missing code or had an invalid state.")));
        return;
      }
      clearTimeout(timeout);
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Google Sheets auth completed. You can close this tab and return to the toolkit.");
      server.close(() => resolve({ code }));
    } catch (err) {
      clearTimeout(timeout);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Unexpected OAuth error. You can close this tab.");
      server.close(() => reject(err));
    }
  });

  server.on("error", reject);
  server.listen(port, "127.0.0.1", async () => {
    const params = new URLSearchParams({
      client_id: oauth.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      access_type: "offline",
      prompt: "consent",
      state
    });
    const authUrl = `${oauth.authUri}?${params.toString()}`;
    console.log(`AUTH_URL=${authUrl}`);
    const opened = await openInBrowser(authUrl);
    if (!opened) {
      console.log(authUrl);
    }
  });
});

const tokenResponse = await exchangeAuthorizationCode({
  oauth,
  code: callbackResult.code,
  redirectUri
});

const savedToken = {
  ...tokenResponse,
  expiry_date: tokenResponse.expires_in ? Date.now() + (Number(tokenResponse.expires_in) * 1000) : null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

await mkdir(path.dirname(tokenPath), { recursive: true });
await writeFile(tokenPath, JSON.stringify(savedToken, null, 2), "utf8");

console.log(JSON.stringify({
  ok: true,
  credentialsPath,
  tokenPath,
  redirectUri,
  scope
}, null, 2));

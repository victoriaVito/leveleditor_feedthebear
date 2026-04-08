import crypto from "node:crypto";
import path from "node:path";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const GOOGLE_SHEETS_SCOPE = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly"
].join(" ");
const GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API_URI = "https://www.googleapis.com/drive/v3/files";
const GOOGLE_DRIVE_UPLOAD_URI = "https://www.googleapis.com/upload/drive/v3/files";
const execFileAsync = promisify(execFile);
const GOOGLE_QUOTA_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "";
const DEFAULT_SCREENSHOT_DRIVE_FOLDER_ID = "1FZElFsSSblwStZVci1SsnpsSuZEvcBKT";
const DEFAULT_SCREENSHOT_DRIVE_FOLDER_NAME = "feed-the-bear-screenshots";
const DEFAULT_SHEETS_IMAGE_SIZE = 120;
const DEFAULT_DRIVE_SCREENSHOT_SHEET = "All screenshots";
const README_SHEET_NAME = "README";
const DEFAULT_PRIMARY_SHEET_NAME = "All Progressions";
const LEVEL_CATALOG_SHEET_NAME = "Level Catalog";
const PLANNER_SHEET_NAME = "Mix Planner";
const RENAME_SHEET_NAME = "Level Renames";
const CURVE_BUILDER_SHEET_NAME = "Curve Builder";
const FEEDBACK_TEMPLATE_SHEET_NAME = "Feedback TEMPLATE";
const FEEDBACK_MASTER_SHEET_NAME = "Feedback Master";
const FEEDBACK_TRACKING_SHEET_NAME = "Feedback Tracking";
const FEEDBACK_CHANGELOG_SHEET_NAME = "Feedback Changelog";
const FEEDBACK_SHEET_NAMES = [
  FEEDBACK_TEMPLATE_SHEET_NAME,
  FEEDBACK_MASTER_SHEET_NAME,
  FEEDBACK_TRACKING_SHEET_NAME,
  FEEDBACK_CHANGELOG_SHEET_NAME
];
const FEEDBACK_QUESTIONS = [
  "Easy?", "Hard?", "Fun?", "Boring?",
  "Beat first try?", "Would drop?", "Would change?"
];
const FEEDBACK_PRIORITY_WEIGHTS = { "Would drop?": 3, "Easy?": 1, "Hard?": 2, "Boring?": 2, "Fun?": -2 };
const LEGACY_PLANNER_SHEET_NAMES = ["Permutation Planner"];
const PLANNER_SLOT_HEADERS = Array.from({ length: 10 }, (_value, index) => `Slot ${index + 1}`);
const PLANNER_TUTORIAL_HEADER = "Tutorial File";
const PLANNER_ROW_BLOCK_SIZE = 3;
const PLANNER_META_HEADERS = ["Proposal ID", "Folder Name", "Approved", "Materialized", "Source Progression", "Suggestion"];
const PLANNER_EDITABLE_HEADERS = new Set([
  "Folder Name",
  "Approved",
  PLANNER_TUTORIAL_HEADER,
  ...PLANNER_SLOT_HEADERS,
  "Notes"
]);
const PLANNER_PRESERVED_HEADERS = new Set([
  "Materialized",
  "Output Folder"
]);
const RENAME_EDITABLE_HEADERS = new Set([
  "Target Name",
  "Notes"
]);
const RENAME_PRESERVED_HEADERS = new Set([
  "Apply Status"
]);
const PRIMARY_EDITABLE_HEADERS = new Set([
  "Need fixes",
  "Feedback",
  "Feedback Owner",
  "Playtest difficulty"
]);
const MANAGED_SHEET_ORDER = [README_SHEET_NAME, DEFAULT_PRIMARY_SHEET_NAME, "Level Manager state", LEVEL_CATALOG_SHEET_NAME, "Procedural learning"];
const LOCAL_SCREENSHOT_DIRS = ["levels/screenshots", "screenshots"];
const MANAGED_PROTECTION_PREFIX = "Codex managed: ";
const TAB_GROUP_COLORS = {
  read: "#4E79A7",
  interactive: "#59A14F",
  data: "#F28E2B"
};

function normalizePath(rootDir, targetPath) {
  if (!targetPath) return "";
  return path.isAbsolute(targetPath) ? targetPath : path.join(rootDir, targetPath);
}

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

function parseOAuthClient(credentials) {
  if (credentials?.type === "service_account") {
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("Google service account JSON must include client_email and private_key.");
    }
    return {
      authType: "service_account",
      clientEmail: credentials.client_email,
      privateKey: credentials.private_key,
      tokenUri: credentials.token_uri || GOOGLE_TOKEN_URI,
      projectId: credentials.project_id || ""
    };
  }
  const block = credentials.installed || credentials.web || credentials;
  if (!block?.client_id || !block?.client_secret) {
    throw new Error("Google OAuth client JSON must include client_id and client_secret.");
  }
  return {
    authType: "oauth_client",
    clientId: block.client_id,
    clientSecret: block.client_secret,
    authUri: block.auth_uri || GOOGLE_AUTH_URI,
    tokenUri: block.token_uri || GOOGLE_TOKEN_URI,
    redirectUris: Array.isArray(block.redirect_uris) ? block.redirect_uris : []
  };
}

function isAllowedOauthRedirectUri(registeredUris, desiredUri) {
  if (!Array.isArray(registeredUris) || registeredUris.length === 0) return true;
  if (registeredUris.includes(desiredUri)) return true;

  // Desktop/installed OAuth clients often ship with redirect_uris like "http://localhost".
  // Google loopback redirect URIs allow choosing a localhost port at runtime, so we accept
  // any loopback host/port/path as long as a loopback redirect base is registered.
  let desired;
  try {
    desired = new URL(desiredUri);
  } catch (_err) {
    return false;
  }

  const desiredHost = desired.hostname;
  const desiredProtocol = desired.protocol;
  const desiredIsLoopback = desiredHost === "localhost" || desiredHost === "127.0.0.1";
  if (!desiredIsLoopback) return false;

  for (const candidate of registeredUris) {
    try {
      const reg = new URL(candidate);
      const regHost = reg.hostname;
      const regIsLoopback = regHost === "localhost" || regHost === "127.0.0.1";
      if (reg.protocol !== desiredProtocol) continue;
      if (!regIsLoopback) continue;

      // Registered as "http://localhost" (no port/path): allow any loopback port/path.
      if (!reg.port && (reg.pathname === "/" || !reg.pathname)) return true;

      // Registered as "http://localhost:PORT": allow that port (any path).
      if (reg.port && reg.port === desired.port) return true;
    } catch (_err) {
      // ignore malformed entries
    }
  }

  return false;
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadOAuthConfig(rootDir, credentialsPath) {
  const resolved = normalizePath(rootDir, credentialsPath);
  if (!resolved) throw new Error("Google OAuth client path is not configured.");
  const credentials = await readJsonFile(resolved);
  return { resolved, ...parseOAuthClient(credentials) };
}

async function loadToken(rootDir, tokenPath) {
  const resolved = normalizePath(rootDir, tokenPath);
  if (!resolved) return null;
  try {
    return { resolved, token: await readJsonFile(resolved) };
  } catch (_err) {
    return null;
  }
}

async function saveToken(rootDir, tokenPath, token) {
  const resolved = normalizePath(rootDir, tokenPath);
  if (!resolved) throw new Error("Google token path is not configured.");
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, JSON.stringify(token, null, 2), "utf8");
  return resolved;
}

async function getGcloudAccessToken() {
  try {
    const { stdout } = await execFileAsync("gcloud", [
      "auth",
      "application-default",
      "print-access-token",
      "--scopes=https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/cloud-platform"
    ]);
    const token = String(stdout || "").trim();
    if (!token) throw new Error("gcloud returned an empty access token.");
    return token;
  } catch (err) {
    throw new Error(`gcloud auth is not available: ${String(err.message || err)}`);
  }
}

async function hasGcloudAuth() {
  try {
    await getGcloudAccessToken();
    return true;
  } catch (_err) {
    return false;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_err) {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(body.error_description || body.error?.message || body.error || `Request failed (${response.status})`);
  }
  return body;
}

async function driveApiJson(url, accessToken, options = {}) {
  return requestJson(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });
}

function makeDriveImageFormula(fileId, size = DEFAULT_SHEETS_IMAGE_SIZE) {
  if (!fileId) return "";
  return `=IMAGE("https://drive.google.com/uc?export=view&id=${fileId}",4,${size},${size})`;
}

function makeDriveFileUrl(fileId) {
  if (!fileId) return "";
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function makeDriveLinkFormula(fileId, label = "Open") {
  if (!fileId) return "";
  const safeLabel = String(label || "Open").replace(/"/g, "\"\"");
  return `=HYPERLINK("${makeDriveFileUrl(fileId)}","${safeLabel}")`;
}

function displayStemFromImageName(fileName) {
  const stem = String(fileName || "").replace(/\.[^.]+$/, "");
  const levelMatch = stem.match(/^progression[_ ]?([abc])[_ ]?level[_ ]?(\d+)[_ ]?([a-z]+)$/i)
    || stem.match(/^progression([ABC])_level(\d+)_([A-Za-z]+)$/)
    || stem.match(/^progression([123])_level(\d+)_([A-Za-z]+)$/i);
  if (levelMatch) {
    const progressionCode = String(levelMatch[1] || "").toUpperCase();
    const levelNumber = String(levelMatch[2] || "");
    const difficulty = String(levelMatch[3] || "").replace(/_/g, " ");
    const progressionLabel = /^[123]$/.test(progressionCode) ? `Progression ${progressionCode}` : `Progression ${progressionCode}`;
    return `${progressionLabel} · Level ${levelNumber} · ${difficulty}`;
  }
  const workshopMatch = stem.match(/^workshop[_ ]?([a-z]+)[_ ]?(\d+)$/i);
  if (workshopMatch) {
    const author = String(workshopMatch[1] || "").replace(/^./, (m) => m.toUpperCase());
    return `Workshop · ${author} · Level ${workshopMatch[2]}`;
  }
  return stem
    .replace(/^progression[_ ]?([abc123])[_ ]?/i, (_m, code) => `Progression ${String(code).toUpperCase()} · `)
    .replace(/^feed-the-bear-/i, "")
    .replace(/^workshop[_ ]?/i, "Workshop · ")
    .replace(/[_-]+/g, " ")
    .replace(/\b(afterfeedback)\b/i, "after feedback")
    .replace(/\bjsons\b/i, "jsons")
    .replace(/\bscreenshots\b/i, "screenshots")
    .replace(/\s+/g, " ")
    .trim();
}

function humanizeDriveSheetName(name) {
  const raw = String(name || "").trim();
  if (!raw) return raw;
  if (/^progression[_ ]?([abc])[_ ]?afterfeedback$/i.test(raw)) {
    const code = raw.match(/^progression[_ ]?([abc])[_ ]?afterfeedback$/i)?.[1]?.toUpperCase() || "";
    return `Progression ${code} after feedback`;
  }
  if (/^progression([123])$/i.test(raw)) {
    const code = raw.match(/^progression([123])$/i)?.[1] || "";
    return `Progression ${code}`;
  }
  if (/^feed-the-bear-screenshots$/i.test(raw)) return "All screenshots";
  return raw
    .replace(/^progression[_ ]?([abc123])[_ ]?/i, (_m, code) => `Progression ${String(code).toUpperCase()} `)
    .replace(/afterfeedback/ig, "after feedback")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "").trim();
  if (normalized.length !== 6) return { red: 1, green: 1, blue: 1 };
  const value = Number.parseInt(normalized, 16);
  return {
    red: ((value >> 16) & 255) / 255,
    green: ((value >> 8) & 255) / 255,
    blue: (value & 255) / 255
  };
}

function spreadsheetTabGroup(sheetName, {
  primarySheetName = DEFAULT_PRIMARY_SHEET_NAME,
  catalogSheetName = LEVEL_CATALOG_SHEET_NAME,
  plannerSheetName = PLANNER_SHEET_NAME,
  renameSheetName = RENAME_SHEET_NAME
} = {}) {
  if (sheetName === README_SHEET_NAME) return "read";
  if ([primarySheetName, plannerSheetName, renameSheetName, CURVE_BUILDER_SHEET_NAME].includes(sheetName)) return "interactive";
  if (FEEDBACK_SHEET_NAMES.includes(sheetName)) return "interactive";
  if (sheetName === BENCHMARK_SHEET_NAME) return "read";
  if ([catalogSheetName, "Level Manager state", "Procedural learning", DEFAULT_DRIVE_SCREENSHOT_SHEET].includes(sheetName)) return "data";
  return "data";
}

function buildSpreadsheetTabPresentationPlan({
  primarySheetName = DEFAULT_PRIMARY_SHEET_NAME,
  catalogSheetName = LEVEL_CATALOG_SHEET_NAME,
  plannerSheetName = PLANNER_SHEET_NAME,
  renameSheetName = RENAME_SHEET_NAME
} = {}) {
  const orderedNames = [
    README_SHEET_NAME,
    primarySheetName,
    plannerSheetName,
    renameSheetName,
    CURVE_BUILDER_SHEET_NAME,
    BENCHMARK_SHEET_NAME,
    FEEDBACK_TEMPLATE_SHEET_NAME,
    FEEDBACK_MASTER_SHEET_NAME,
    FEEDBACK_TRACKING_SHEET_NAME,
    FEEDBACK_CHANGELOG_SHEET_NAME,
    catalogSheetName,
    "Level Manager state",
    "Procedural learning",
    DEFAULT_DRIVE_SCREENSHOT_SHEET
  ].filter((value, index, values) => value && values.indexOf(value) === index);
  return orderedNames.map((title, index) => ({
    title,
    index,
    tabColor: hexToRgb(TAB_GROUP_COLORS[spreadsheetTabGroup(title, {
      primarySheetName,
      catalogSheetName,
      plannerSheetName,
      renameSheetName
    })] || TAB_GROUP_COLORS.data)
  }));
}

function interpolateColor(startHex, endHex, ratio) {
  const t = Math.min(1, Math.max(0, Number(ratio || 0)));
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  return {
    red: start.red + ((end.red - start.red) * t),
    green: start.green + ((end.green - start.green) * t),
    blue: start.blue + ((end.blue - start.blue) * t)
  };
}

function plannerThemeKeyForRow(row, headers) {
  const proposalIndex = headers.indexOf("Proposal ID");
  const sourceIndex = headers.indexOf("Source Progression");
  const proposalId = String((proposalIndex >= 0 ? row[proposalIndex] : "") || "").trim().toLowerCase();
  const source = String((sourceIndex >= 0 ? row[sourceIndex] : "") || "").trim().toLowerCase();
  if (proposalId.startsWith("original_a_") || source.includes("original progression a")) return "original_a";
  if (proposalId.startsWith("original_b_") || source.includes("original progression b")) return "original_b";
  if (proposalId.startsWith("original_c_") || source.includes("original progression c")) return "original_c";
  if (proposalId.startsWith("liveops_mix_") || source.includes("live ops mix")) return "live_ops_mix";
  return "live_ops_mix";
}

function plannerThemePalette(themeKey) {
  switch (themeKey) {
    case "original_a":
      return {
        main: "#EEF6FC",
        screen: "#F8FBFE",
        slotStart: "#F8FCFF",
        slotEnd: "#D5E8F8",
        accent: "#DDECF9"
      };
    case "original_b":
      return {
        main: "#EEF7F1",
        screen: "#F8FCF9",
        slotStart: "#F8FDF9",
        slotEnd: "#D7EEDB",
        accent: "#E1F1E4"
      };
    case "original_c":
      return {
        main: "#FBF1E7",
        screen: "#FEFAF5",
        slotStart: "#FFFDFC",
        slotEnd: "#F3DECB",
        accent: "#F8E8D8"
      };
    default:
      return {
        main: "#F0F4F6",
        screen: "#F8FAFB",
        slotStart: "#FCFDFD",
        slotEnd: "#DEE6EB",
        accent: "#E7EDF1"
      };
  }
}

function difficultyCellPalette(value) {
  const normalized = String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "easy":
      return { background: "#DFF3E4", text: "#245C3B" };
    case "medium":
      return { background: "#FFF1CC", text: "#8A5A00" };
    case "hard":
      return { background: "#F8D7DA", text: "#8A1F2D" };
    default:
      return { background: "#E7EDF1", text: "#4E5D6C" };
  }
}

function recognizedDifficultyPalette(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (!["easy", "medium", "hard"].includes(normalized)) return null;
  return difficultyCellPalette(normalized);
}

function proceduralBucketPalette(value) {
  const normalized = String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "approved":
      return { background: "#DFF3E4", text: "#245C3B" };
    case "rejected":
      return { background: "#F8D7DA", text: "#8A1F2D" };
    case "correction":
      return { background: "#DCEAF7", text: "#1E4E73" };
    default:
      return null;
  }
}

async function exchangeAuthorizationCode({ clientId, clientSecret, tokenUri, code, redirectUri }) {
  const form = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });
  return requestJson(tokenUri || GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
}

function toBase64Url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function exchangeServiceAccountJwt({ clientEmail, privateKey, tokenUri, scope }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope,
    aud: tokenUri || GOOGLE_TOKEN_URI,
    exp: now + 3600,
    iat: now
  };
  const unsigned = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(claimSet))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const assertion = `${unsigned}.${signature}`;
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  return requestJson(tokenUri || GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
}

async function refreshAccessToken({ clientId, clientSecret, tokenUri, refreshToken }) {
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  return requestJson(tokenUri || GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
}

export async function getGoogleSheetsAuthStatus({ rootDir, credentialsPath, tokenPath }) {
  const result = {
    credentialsConfigured: false,
    tokenConfigured: false,
    connected: false,
    gcloudAuthAvailable: false,
    credentialsPath: normalizePath(rootDir, credentialsPath),
    tokenPath: normalizePath(rootDir, tokenPath)
  };
  result.gcloudAuthAvailable = await hasGcloudAuth();
  try {
    const oauth = await loadOAuthConfig(rootDir, credentialsPath);
    result.credentialsConfigured = true;
    result.authMode = oauth.authType === "service_account" ? "service_account" : "oauth_client";
    if (oauth.authType === "service_account") {
      result.clientEmail = oauth.clientEmail;
      result.projectId = oauth.projectId || "";
    } else {
      result.clientId = oauth.clientId;
    }
  } catch (err) {
    result.error = String(err.message || err);
    result.connected = result.gcloudAuthAvailable;
    result.authMode = result.gcloudAuthAvailable ? "gcloud" : "none";
    return result;
  }
  if (result.authMode === "service_account") {
    result.tokenConfigured = true;
    result.connected = true;
    result.scope = GOOGLE_SHEETS_SCOPE;
    return result;
  }
  const tokenInfo = await loadToken(rootDir, tokenPath);
  result.tokenConfigured = !!tokenInfo?.token;
  result.connected = !!tokenInfo?.token?.refresh_token || result.gcloudAuthAvailable;
  result.authMode = tokenInfo?.token?.refresh_token ? "oauth_token" : (result.gcloudAuthAvailable ? "gcloud" : "none");
  if (tokenInfo?.token?.scope) result.scope = tokenInfo.token.scope;
  return result;
}

export async function createGoogleSheetsAuthUrl({ rootDir, credentialsPath, tokenPath, baseUrl, stateStore }) {
  const oauth = await loadOAuthConfig(rootDir, credentialsPath);
  if (oauth.authType === "service_account") {
    throw new Error("This credential is a service account, so there is no browser OAuth connect flow. Share the spreadsheet/folders with the service account and use direct sync.");
  }
  const redirectUri = `${baseUrl.replace(/\/+$/, "")}/api/google-sheets-auth-callback`;
  if (oauth.redirectUris.length && !isAllowedOauthRedirectUri(oauth.redirectUris, redirectUri)) {
    throw new Error(`OAuth client does not allow redirect URI ${redirectUri}. Add it in Google Cloud Console.`);
  }
  const state = crypto.randomUUID();
  stateStore.set(state, {
    credentialsPath,
    tokenPath,
    redirectUri,
    createdAt: Date.now()
  });
  const params = new URLSearchParams({
    client_id: oauth.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SHEETS_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state
  });
  return {
    authUrl: `${oauth.authUri || GOOGLE_AUTH_URI}?${params.toString()}`,
    state
  };
}

export async function completeGoogleSheetsAuth({ rootDir, code, state, stateStore }) {
  const session = stateStore.get(state);
  if (!session) throw new Error("OAuth session expired or was not found.");
  stateStore.delete(state);
  const oauth = await loadOAuthConfig(rootDir, session.credentialsPath);
  const tokenResponse = await exchangeAuthorizationCode({
    clientId: oauth.clientId,
    clientSecret: oauth.clientSecret,
    tokenUri: oauth.tokenUri,
    code,
    redirectUri: session.redirectUri
  });
  const savedToken = {
    ...tokenResponse,
    expiry_date: tokenResponse.expires_in ? Date.now() + (Number(tokenResponse.expires_in) * 1000) : null,
    created_at: new Date().toISOString()
  };
  const tokenFile = await saveToken(rootDir, session.tokenPath, savedToken);
  return { tokenFile, token: savedToken };
}

export async function disconnectGoogleSheetsAuth({ rootDir, tokenPath }) {
  const resolved = normalizePath(rootDir, tokenPath);
  if (!resolved) return { ok: true, removed: false };
  await rm(resolved, { force: true });
  return { ok: true, removed: true };
}

export async function getGoogleAccessToken({ rootDir, credentialsPath, tokenPath }) {
  try {
    const oauth = await loadOAuthConfig(rootDir, credentialsPath);
    if (oauth.authType === "service_account") {
      const serviceToken = await exchangeServiceAccountJwt({
        clientEmail: oauth.clientEmail,
        privateKey: oauth.privateKey,
        tokenUri: oauth.tokenUri,
        scope: GOOGLE_SHEETS_SCOPE
      });
      return serviceToken.access_token;
    }
    const tokenInfo = await loadToken(rootDir, tokenPath);
    if (!tokenInfo?.token?.refresh_token) {
      throw new Error("Google Sheets API is not connected. Run the OAuth connect flow first.");
    }
    const token = tokenInfo.token;
    const now = Date.now();
    if (token.access_token && token.expiry_date && Number(token.expiry_date) - now > 60_000) {
      return token.access_token;
    }
    let refreshed;
    try {
      refreshed = await refreshAccessToken({
        clientId: oauth.clientId,
        clientSecret: oauth.clientSecret,
        tokenUri: oauth.tokenUri,
        refreshToken: token.refresh_token
      });
    } catch (refreshErr) {
      const message = String(refreshErr?.message || refreshErr || "");
      if (/unauthorized|invalid_client|invalid_grant/i.test(message)) {
        throw new Error("Stored Google Sheets token does not match the current OAuth client. Reconnect Google Sheets auth to issue a new token.");
      }
      throw refreshErr;
    }
    const merged = {
      ...token,
      ...refreshed,
      refresh_token: token.refresh_token,
      expiry_date: refreshed.expires_in ? Date.now() + (Number(refreshed.expires_in) * 1000) : token.expiry_date,
      updated_at: new Date().toISOString()
    };
    await saveToken(rootDir, tokenPath, merged);
    return merged.access_token;
  } catch (oauthErr) {
    try {
      return await getGcloudAccessToken();
    } catch (_gcloudErr) {
      throw oauthErr;
    }
  }
}

async function googleApiJson(url, accessToken, options = {}) {
  return requestJson(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(GOOGLE_QUOTA_PROJECT ? { "X-Goog-User-Project": GOOGLE_QUOTA_PROJECT } : {}),
      ...(options.headers || {})
    }
  });
}

function rowArrayToObject(headers, row = []) {
  const out = {};
  headers.forEach((header, index) => {
    out[header] = row[index] ?? "";
  });
  return out;
}

function rowObjectToArray(headers, row = {}) {
  return headers.map((header) => row[header] ?? "");
}

function fullRange({ sheetId, rowCount, columnCount }) {
  return {
    sheetId,
    startRowIndex: 0,
    endRowIndex: Math.max(rowCount, 1),
    startColumnIndex: 0,
    endColumnIndex: Math.max(columnCount, 1)
  };
}

function buildPlannerCurveFormula({ rowNumber, headers, catalogSheetName = LEVEL_CATALOG_SHEET_NAME }) {
  const lookupParts = PLANNER_SLOT_HEADERS.map((header) => {
    const columnIndex = headers.indexOf(header) + 1;
    const a1 = `${columnNumberToA1(columnIndex)}${rowNumber}`;
    return `IFERROR(VLOOKUP(${a1},'${catalogSheetName}'!A:E,5,FALSE),0)`;
  });
  return `=SPARKLINE({${lookupParts.join(",")}},{"charttype","line";"linewidth",2;"empty","zero"})`;
}

function plannerMainRowNumber(index) {
  return 2 + (index * PLANNER_ROW_BLOCK_SIZE);
}

function normalizeBooleanCell(value, fallback = "FALSE") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return /^(true|1|yes|y)$/i.test(text) ? "TRUE" : "FALSE";
}

function primaryOccurrenceKeyFromRow(row = {}) {
  const progression = String(row["Progression"] || "").trim();
  const position = String(row["Position in Progression"] || "").trim();
  if (!progression || !position) return "";
  return `${progression}::${position}`;
}

function primaryStrongKeyFromRow(row = {}) {
  const occurrence = primaryOccurrenceKeyFromRow(row);
  const codeFile = String(row["Code File"] || "").trim();
  if (!occurrence || !codeFile) return "";
  return `${occurrence}::${codeFile}`;
}

function mergePrimaryRows({ headers, existingValues = [], incomingRows = [] }) {
  const existingHeaders = existingValues[0] || [];
  const existingObjects = existingHeaders.length
    ? existingValues.slice(1).map((row) => rowArrayToObject(existingHeaders, row)).filter((row) => primaryOccurrenceKeyFromRow(row))
    : [];
  const existingByStrong = new Map();
  const existingByOccurrence = new Map();
  existingObjects.forEach((row) => {
    const strongKey = primaryStrongKeyFromRow(row);
    const occurrenceKey = primaryOccurrenceKeyFromRow(row);
    if (strongKey && !existingByStrong.has(strongKey)) existingByStrong.set(strongKey, row);
    if (occurrenceKey && !existingByOccurrence.has(occurrenceKey)) existingByOccurrence.set(occurrenceKey, row);
  });
  return incomingRows.map((incomingRow) => {
    const incoming = rowArrayToObject(headers, incomingRow);
    const existing = existingByStrong.get(primaryStrongKeyFromRow(incoming)) || existingByOccurrence.get(primaryOccurrenceKeyFromRow(incoming));
    const next = { ...incoming };
    if (existing) {
      headers.forEach((header) => {
        if (PRIMARY_EDITABLE_HEADERS.has(header)) {
          next[header] = existing[header] ?? next[header] ?? "";
        }
      });
    }
    next["Need fixes"] = normalizeBooleanCell(next["Need fixes"], "FALSE");
    return rowObjectToArray(headers, next);
  });
}

function mergePlannerRows({ headers, existingValues = [], incomingRows = [] }) {
  const existingHeaders = existingValues[0] || [];
  const existingObjects = existingHeaders.length
    ? existingValues.slice(1).map((row) => rowArrayToObject(existingHeaders, row)).filter((row) => String(row["Proposal ID"] || "").trim())
    : [];
  const existingById = new Map();
  existingObjects.forEach((row) => {
    const id = String(row["Proposal ID"] || "").trim();
    if (id) existingById.set(id, row);
  });
  const shouldKeepLegacyRow = (row) => {
    const approved = /^(true|1|yes|y)$/i.test(String(row["Approved"] || "").trim());
    const materialized = /^(true|1|yes|y)$/i.test(String(row["Materialized"] || "").trim());
    const notes = String(row["Notes"] || "").trim();
    const outputFolder = String(row["Output Folder"] || "").trim();
    const suggestion = String(row["Suggestion"] || "").trim().toLowerCase();
    if (approved || materialized || notes || outputFolder) return true;
    if (suggestion.includes("manual") || suggestion.includes("custom")) return true;
    return false;
  };
  const seenIds = new Set();
  const merged = incomingRows.map((incomingRow) => {
    const incoming = rowArrayToObject(headers, incomingRow);
    const id = String(incoming["Proposal ID"] || "").trim();
    const existing = existingById.get(id);
    if (id) seenIds.add(id);
    if (!existing) return incoming;
    const row = { ...incoming };
    headers.forEach((header) => {
      if (PLANNER_EDITABLE_HEADERS.has(header) || PLANNER_PRESERVED_HEADERS.has(header)) {
        row[header] = existing[header] ?? row[header] ?? "";
      }
    });
    return row;
  });
  existingObjects.forEach((row) => {
    const id = String(row["Proposal ID"] || "").trim();
    if (id && seenIds.has(id)) return;
    if (!shouldKeepLegacyRow(row)) return;
    merged.push(rowArrayToObject(headers, rowObjectToArray(headers, row)));
  });
  return merged.map((row, index) => {
    const next = { ...row };
    next["Curve"] = buildPlannerCurveFormula({ rowNumber: plannerMainRowNumber(index), headers });
    if (!String(next["Approved"] || "").trim()) next["Approved"] = "FALSE";
    if (!String(next["Materialized"] || "").trim()) next["Materialized"] = "FALSE";
    return rowObjectToArray(headers, next);
  });
}

function buildRenamePreviewFormula({ rowNumber, headers }) {
  const positionA1 = `${columnNumberToA1(headers.indexOf("Position") + 1)}${rowNumber}`;
  const currentA1 = `${columnNumberToA1(headers.indexOf("Current Name") + 1)}${rowNumber}`;
  const targetA1 = `${columnNumberToA1(headers.indexOf("Target Name") + 1)}${rowNumber}`;
  return `=TEXT(VALUE(${positionA1}),"00")&" · "&IF(LEN(TRIM(${targetA1}))>0,TRIM(${targetA1}),${currentA1})`;
}

function buildRenamePlannedFileFormula({ rowNumber, headers }) {
  const targetA1 = `${columnNumberToA1(headers.indexOf("Target Name") + 1)}${rowNumber}`;
  const currentFileA1 = `${columnNumberToA1(headers.indexOf("Code File") + 1)}${rowNumber}`;
  return `=IF(LEN(TRIM(${targetA1}))>0,LOWER(REGEXREPLACE(TRIM(${targetA1}),"[^A-Za-z0-9]+","_"))&".json",${currentFileA1})`;
}

function buildRenamePendingFormula({ rowNumber, headers }) {
  const currentA1 = `${columnNumberToA1(headers.indexOf("Current Name") + 1)}${rowNumber}`;
  const targetA1 = `${columnNumberToA1(headers.indexOf("Target Name") + 1)}${rowNumber}`;
  return `=AND(LEN(TRIM(${targetA1}))>0,TRIM(${targetA1})<>${currentA1})`;
}

function mergeRenameRows({ headers, existingValues = [], incomingRows = [] }) {
  const existingHeaders = existingValues[0] || [];
  const existingObjects = existingHeaders.length
    ? existingValues.slice(1).map((row) => rowArrayToObject(existingHeaders, row)).filter((row) => String(row["Occurrence ID"] || "").trim())
    : [];
  const existingById = new Map();
  existingObjects.forEach((row) => {
    const occurrenceId = String(row["Occurrence ID"] || "").trim();
    if (occurrenceId) existingById.set(occurrenceId, row);
  });
  return incomingRows.map((incomingRow, index) => {
    const incoming = rowArrayToObject(headers, incomingRow);
    const occurrenceId = String(incoming["Occurrence ID"] || "").trim();
    const existing = existingById.get(occurrenceId);
    const next = { ...incoming };
    if (existing) {
      headers.forEach((header) => {
        if (RENAME_EDITABLE_HEADERS.has(header) || RENAME_PRESERVED_HEADERS.has(header)) {
          next[header] = existing[header] ?? next[header] ?? "";
        }
      });
    }
    const targetName = String(next["Target Name"] || "").trim();
    const currentName = String(next["Current Name"] || "").trim();
    if (targetName && targetName !== currentName) {
      next["Apply Status"] = "";
    }
    next["Preview Label"] = buildRenamePreviewFormula({ rowNumber: index + 2, headers });
    next["Planned File"] = buildRenamePlannedFileFormula({ rowNumber: index + 2, headers });
    next["Rename Pending"] = buildRenamePendingFormula({ rowNumber: index + 2, headers });
    return rowObjectToArray(headers, next);
  });
}

function renameThemeKeyForRow(row, headers) {
  const progressionIndex = headers.indexOf("Progression");
  const progression = String((progressionIndex >= 0 ? row[progressionIndex] : "") || "").trim().toLowerCase();
  if (progression.includes("progression a")) return "original_a";
  if (progression.includes("progression b")) return "original_b";
  if (progression.includes("progression c")) return "original_c";
  if (progression.includes("live ops")) return "live_ops_mix";
  return "live_ops_mix";
}

function plannerScreenshotLookupFromPayload(payload) {
  const lookup = new Map();
  const catalogHeaders = payload.catalogHeaders || [];
  const fileIndex = catalogHeaders.indexOf("File");
  const screenshotIndex = catalogHeaders.indexOf("Screenshot");
  if (fileIndex >= 0 && screenshotIndex >= 0) {
    for (const row of payload.catalogRows || []) {
      const fileName = String(row[fileIndex] || "").trim();
      const screenshotName = String(row[screenshotIndex] || "").trim();
      if (fileName && screenshotName) lookup.set(fileName, screenshotName);
    }
  }
  const screenshotRows = screenshotRowsFromPayload(payload);
  for (const row of screenshotRows) {
    const fileName = String(row[2] || "").trim();
    const screenshotName = String(row[1] || "").trim();
    if (fileName && screenshotName && !lookup.has(fileName)) lookup.set(fileName, screenshotName);
  }
  return lookup;
}

function plannerDifficultyLookupFromPayload(payload) {
  const lookup = new Map();
  const catalogHeaders = payload.catalogHeaders || [];
  const fileIndex = catalogHeaders.indexOf("File");
  const difficultyIndex = catalogHeaders.indexOf("Difficulty");
  if (fileIndex >= 0 && difficultyIndex >= 0) {
    for (const row of payload.catalogRows || []) {
      const fileName = String(row[fileIndex] || "").trim();
      const difficulty = String(row[difficultyIndex] || "").trim();
      if (fileName && difficulty) lookup.set(fileName, difficulty);
    }
  }
  return lookup;
}

function expandPlannerRowsForDisplay({ headers, rows, screenshotIds, screenshotLookup, difficultyLookup }) {
  const tutorialIndex = headers.indexOf(PLANNER_TUTORIAL_HEADER);
  const suggestionIndex = headers.indexOf("Suggestion");
  const curveIndex = headers.indexOf("Curve");
  const displayRows = [];
  for (const row of rows) {
    displayRows.push(row);
    const screenshotRow = Array(headers.length).fill("");
    if (suggestionIndex >= 0) screenshotRow[suggestionIndex] = "Screens";
    if (tutorialIndex >= 0) {
      const tutorialFile = String(row[tutorialIndex] || "").trim();
      const screenshotName = screenshotLookup.get(tutorialFile) || (tutorialFile ? `${path.parse(tutorialFile).name}.png` : "");
      screenshotRow[tutorialIndex] = makeDriveLinkFormula(screenshotIds.get(screenshotName) || "");
    }
    for (const header of PLANNER_SLOT_HEADERS) {
      const columnIndex = headers.indexOf(header);
      if (columnIndex < 0) continue;
      const fileName = String(row[columnIndex] || "").trim();
      const screenshotName = screenshotLookup.get(fileName) || (fileName ? `${path.parse(fileName).name}.png` : "");
      screenshotRow[columnIndex] = makeDriveLinkFormula(screenshotIds.get(screenshotName) || "");
    }
    if (curveIndex >= 0) screenshotRow[curveIndex] = "";
    displayRows.push(screenshotRow);
    const difficultyRow = Array(headers.length).fill("");
    if (suggestionIndex >= 0) difficultyRow[suggestionIndex] = "Difficulty";
    if (tutorialIndex >= 0) {
      const tutorialFile = String(row[tutorialIndex] || "").trim();
      difficultyRow[tutorialIndex] = difficultyLookup.get(tutorialFile) || "";
    }
    for (const header of PLANNER_SLOT_HEADERS) {
      const columnIndex = headers.indexOf(header);
      if (columnIndex < 0) continue;
      const fileName = String(row[columnIndex] || "").trim();
      difficultyRow[columnIndex] = difficultyLookup.get(fileName) || "";
    }
    if (curveIndex >= 0) difficultyRow[curveIndex] = "";
    displayRows.push(difficultyRow);
  }
  return displayRows;
}

async function ensureDriveFolder({ accessToken, parentId, folderName }) {
  const q = [
    `mimeType = 'application/vnd.google-apps.folder'`,
    `name = '${String(folderName).replace(/'/g, "\\'")}'`,
    "trashed = false",
    parentId ? `'${parentId}' in parents` : null
  ].filter(Boolean).join(" and ");
  const existing = await driveApiJson(`${GOOGLE_DRIVE_API_URI}?q=${encodeURIComponent(q)}&fields=files(id,name)`, accessToken);
  if (existing.files?.length) return existing.files[0].id;
  const created = await driveApiJson(GOOGLE_DRIVE_API_URI, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {})
    })
  });
  return created.id;
}

async function ensureDriveFolderWithFallback({ accessToken, parentId, folderName }) {
  try {
    return await ensureDriveFolder({ accessToken, parentId, folderName });
  } catch (err) {
    const message = String(err?.message || err || "");
    if (parentId && /file not found|not found|insufficient|permission/i.test(message)) {
      return ensureDriveFolder({ accessToken, parentId: "", folderName });
    }
    throw err;
  }
}

async function findDriveFileByName({ accessToken, parentId, fileName }) {
  const q = [
    `name = '${String(fileName).replace(/'/g, "\\'")}'`,
    "trashed = false",
    parentId ? `'${parentId}' in parents` : null
  ].filter(Boolean).join(" and ");
  const result = await driveApiJson(`${GOOGLE_DRIVE_API_URI}?q=${encodeURIComponent(q)}&fields=files(id,name)`, accessToken);
  return result.files?.[0] || null;
}

async function findDriveFolderByName({ accessToken, parentId = "", folderName }) {
  const q = [
    `mimeType = 'application/vnd.google-apps.folder'`,
    `name = '${String(folderName).replace(/'/g, "\\'")}'`,
    "trashed = false",
    parentId ? `'${parentId}' in parents` : null
  ].filter(Boolean).join(" and ");
  const result = await driveApiJson(`${GOOGLE_DRIVE_API_URI}?q=${encodeURIComponent(q)}&fields=files(id,name)`, accessToken);
  return result.files?.[0] || null;
}

async function listDriveChildren({ accessToken, parentId, mimeType = "", fields = "files(id,name,mimeType)" }) {
  const q = [
    `'${parentId}' in parents`,
    "trashed = false",
    mimeType ? `mimeType = '${mimeType}'` : null
  ].filter(Boolean).join(" and ");
  const result = await driveApiJson(`${GOOGLE_DRIVE_API_URI}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=1000`, accessToken);
  return result.files || [];
}

async function uploadDriveFile({ accessToken, parentId, fileName, mimeType, content, existingFileId = "" }) {
  const boundary = `codex-${Math.random().toString(16).slice(2)}`;
  const metadata = JSON.stringify({
    name: fileName,
    ...(!existingFileId && parentId ? { parents: [parentId] } : {})
  });
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    "utf8"
  );
  const closing = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([preamble, content, closing]);
  const url = existingFileId
    ? `${GOOGLE_DRIVE_UPLOAD_URI}/${existingFileId}?uploadType=multipart&fields=id,name`
    : `${GOOGLE_DRIVE_UPLOAD_URI}?uploadType=multipart&fields=id,name`;
  return driveApiJson(url, accessToken, {
    method: existingFileId ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
}

async function buildLocalScreenshotIndex(rootDir, relativeDirs = LOCAL_SCREENSHOT_DIRS) {
  const index = new Map();
  for (const relativeDir of relativeDirs) {
    const absoluteDir = normalizePath(rootDir, relativeDir);
    try {
      const entries = await readdir(absoluteDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fileName = String(entry.name || "").trim();
        if (!/\.(png|jpg|jpeg)$/i.test(fileName)) continue;
        if (!index.has(fileName)) {
          index.set(fileName, path.join(absoluteDir, fileName));
        }
      }
    } catch (_err) {
      // Ignore missing local screenshot directories so the caller can decide whether the index is sufficient.
    }
  }
  return index;
}

async function downloadDriveFileContent({ accessToken, fileId }) {
  const response = await fetch(`${GOOGLE_DRIVE_API_URI}/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(GOOGLE_QUOTA_PROJECT ? { "X-Goog-User-Project": GOOGLE_QUOTA_PROJECT } : {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not download Drive file ${fileId}: ${text || response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function ensureDriveFileAnyoneReadable({ accessToken, fileId }) {
  const metadata = await driveApiJson(
    `${GOOGLE_DRIVE_API_URI}/${fileId}?fields=id,permissions(id,type,role,allowFileDiscovery)`,
    accessToken
  );
  const hasAnyoneReader = (metadata.permissions || []).some((permission) => (
    permission.type === "anyone" && permission.role === "reader"
  ));
  if (hasAnyoneReader) return;
  try {
    await driveApiJson(`${GOOGLE_DRIVE_API_URI}/${fileId}/permissions`, accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "anyone",
        role: "reader",
        allowFileDiscovery: false
      })
    });
  } catch (err) {
    const message = String(err?.message || err || "");
    if (/already exists/i.test(message)) return;
    throw err;
  }
}

async function syncDriveFileByName({ accessToken, parentId, fileName, mimeType, content }) {
  const existing = await findDriveFileByName({ accessToken, parentId, fileName });
  if (existing?.id) {
    let currentContent = null;
    try {
      currentContent = await downloadDriveFileContent({ accessToken, fileId: existing.id });
    } catch (_err) {
      currentContent = null;
    }
    const fileRef = currentContent && currentContent.equals(content)
      ? existing
      : await uploadDriveFile({
        accessToken,
        parentId,
        fileName,
        mimeType,
        content,
        existingFileId: existing.id
      });
    await ensureDriveFileAnyoneReadable({ accessToken, fileId: fileRef.id });
    return fileRef.id;
  }
  const uploaded = await uploadDriveFile({
    accessToken,
    parentId,
    fileName,
    mimeType,
    content,
    existingFileId: ""
  });
  await ensureDriveFileAnyoneReadable({ accessToken, fileId: uploaded.id });
  return uploaded.id;
}

async function syncScreenshotAssets({ accessToken, rootDir, screenshootRows }) {
  const folderId = await ensureDriveFolderWithFallback({
    accessToken,
    parentId: DEFAULT_SCREENSHOT_DRIVE_FOLDER_ID,
    folderName: DEFAULT_SCREENSHOT_DRIVE_FOLDER_NAME
  });
  const fileIds = new Map();
  for (const row of screenshootRows || []) {
    const screenshotFileName = String(row[1] || "").trim();
    const localPath = String(row[3] || "").trim();
    if (!screenshotFileName || !localPath) continue;
    const absolutePath = path.isAbsolute(localPath) ? localPath : path.join(rootDir, localPath);
    let content;
    try {
      content = await readFile(absolutePath);
    } catch (_err) {
      continue;
    }
    const fileId = await syncDriveFileByName({
      accessToken,
      parentId: folderId,
      fileName: screenshotFileName,
      mimeType: "image/png",
      content
    });
    fileIds.set(screenshotFileName, fileId);
  }
  return fileIds;
}

async function syncScreenshotAssetsByName({ accessToken, rootDir, screenshotNames }) {
  const folderId = await ensureDriveFolderWithFallback({
    accessToken,
    parentId: DEFAULT_SCREENSHOT_DRIVE_FOLDER_ID,
    folderName: DEFAULT_SCREENSHOT_DRIVE_FOLDER_NAME
  });
  const localIndex = await buildLocalScreenshotIndex(rootDir);
  const fileIds = new Map();
  for (const screenshotName of screenshotNames || []) {
    const normalizedName = String(screenshotName || "").trim();
    if (!normalizedName) continue;
    const localPath = localIndex.get(normalizedName);
    if (!localPath) continue;
    const content = await readFile(localPath);
    const fileId = await syncDriveFileByName({
      accessToken,
      parentId: folderId,
      fileName: normalizedName,
      mimeType: normalizedName.toLowerCase().endsWith(".jpg") || normalizedName.toLowerCase().endsWith(".jpeg")
        ? "image/jpeg"
        : "image/png",
      content
    });
    fileIds.set(normalizedName, fileId);
  }
  return fileIds;
}

function screenshotRowsFromPayload(payload) {
  return payload.screenshotRows || payload.screenshootRows || [];
}

async function ensureSheetsExist({ spreadsheetId, accessToken, sheetNames }) {
  const metadata = await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, accessToken);
  const sheets = metadata.sheets || [];
  const existing = new Map(sheets.map((sheet) => [sheet.properties.title, sheet.properties.sheetId]));
  const existingLower = new Map(sheets.map((sheet) => [String(sheet.properties.title || "").toLowerCase(), { title: sheet.properties.title, sheetId: sheet.properties.sheetId }]));
  const addRequests = sheetNames
    .filter((name) => !existing.has(name) && !existingLower.has(String(name || "").toLowerCase()))
    .map((name) => ({ addSheet: { properties: { title: name } } }));
  if (addRequests.length) {
    await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests: addRequests })
    });
  }
  const renameRequests = [];
  for (const name of sheetNames) {
    const lower = existingLower.get(String(name || "").toLowerCase());
    if (lower && lower.title !== name) {
      renameRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: lower.sheetId,
            title: name
          },
          fields: "title"
        }
      });
    }
  }
  if (renameRequests.length) {
    await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests: renameRequests })
    });
  }
  const refreshed = await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, accessToken);
  return new Map((refreshed.sheets || []).map((sheet) => [sheet.properties.title, sheet.properties.sheetId]));
}

async function syncSheetPresentation({ spreadsheetId, accessToken, presentationPlan = [] }) {
  if (!presentationPlan.length) return;
  const metadata = await googleApiJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title,index,tabColor))`,
    accessToken
  );
  const existingByTitle = new Map((metadata.sheets || []).map((sheet) => [sheet?.properties?.title, sheet?.properties]));
  const requests = [];
  for (const item of presentationPlan) {
    const properties = existingByTitle.get(item.title);
    if (!properties?.sheetId && properties?.sheetId !== 0) continue;
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: properties.sheetId,
          index: item.index,
          tabColor: item.tabColor
        },
        fields: "index,tabColor"
      }
    });
  }
  if (!requests.length) return;
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests })
  });
}

async function rebuildManagedSheets({ spreadsheetId, accessToken, sheetNames }) {
  const metadata = await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title,index))`, accessToken);
  const sheets = metadata.sheets || [];
  const toDelete = [];
  const existingTitles = new Set();
  for (const sheet of sheets) {
    const title = String(sheet?.properties?.title || "");
    existingTitles.add(title);
    if (sheetNames.includes(title) && sheet?.properties?.sheetId != null) {
      toDelete.push(sheet.properties.sheetId);
    }
  }
  const tempSheetName = "__codex_sync_tmp__";
  let createdTemp = false;
  if (toDelete.length && !existingTitles.has(tempSheetName)) {
    await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: { title: tempSheetName }
          }
        }]
      })
    });
    createdTemp = true;
  }
  if (toDelete.length) {
    await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        requests: toDelete.map((sheetId) => ({
          deleteSheet: { sheetId }
        }))
      })
    });
  }
  const ids = await ensureSheetsExist({ spreadsheetId, accessToken, sheetNames });
  if (createdTemp) {
    await deleteSheetIfExists({ spreadsheetId, accessToken, sheetName: tempSheetName });
  }
  return ids;
}

async function ensureTemporarySheetForDeletion({ spreadsheetId, accessToken, tempSheetName = "__codex_sync_tmp__" }) {
  const metadata = await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, accessToken);
  const sheets = metadata.sheets || [];
  const tempSheet = sheets.find((entry) => entry?.properties?.title === tempSheetName);
  if (tempSheet?.properties?.sheetId != null) {
    return { created: false, tempSheetName };
  }
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        addSheet: {
          properties: { title: tempSheetName }
        }
      }]
    })
  });
  return { created: true, tempSheetName };
}

async function upsertSheetValues({ spreadsheetId, accessToken, sheetName, rows, sheetId, valueInputOption = "RAW" }) {
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A:ZZ")}:clear`, accessToken, {
    method: "POST",
    body: JSON.stringify({})
  });
  if (rows.length) {
    await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A1")}?valueInputOption=${encodeURIComponent(valueInputOption)}`, accessToken, {
      method: "PUT",
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: rows
      })
    });
  }
  if (sheetId != null) {
    await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        requests: [{
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: rows.length ? 1 : 0 }
            },
            fields: "gridProperties.frozenRowCount"
          }
        }]
      })
    });
  }
}

async function readSheetValues({ spreadsheetId, accessToken, range }) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(GOOGLE_QUOTA_PROJECT ? { "X-Goog-User-Project": GOOGLE_QUOTA_PROJECT } : {})
    }
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_err) {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(body.error?.message || body.error || `Request failed (${response.status})`);
  }
  return body.values || [];
}

async function clearConditionalFormatRules({ spreadsheetId, accessToken, sheetId }) {
  if (sheetId == null) return;
  const metadata = await googleApiJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title),conditionalFormats)`,
    accessToken
  );
  const targetSheet = (metadata.sheets || []).find((sheet) => Number(sheet?.properties?.sheetId) === Number(sheetId));
  const ruleCount = Array.isArray(targetSheet?.conditionalFormats) ? targetSheet.conditionalFormats.length : 0;
  if (!ruleCount) return;
  const requests = [];
  for (let index = ruleCount - 1; index >= 0; index -= 1) {
    requests.push({
      deleteConditionalFormatRule: {
        sheetId,
        index
      }
    });
  }
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests })
  });
}

async function clearManagedProtectedRanges({ spreadsheetId, accessToken, sheetId }) {
  if (sheetId == null) return;
  const metadata = await googleApiJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId),protectedRanges(protectedRangeId,description))`,
    accessToken
  );
  const targetSheet = (metadata.sheets || []).find((sheet) => Number(sheet?.properties?.sheetId) === Number(sheetId));
  const protectedRangeIds = (targetSheet?.protectedRanges || [])
    .filter((entry) => String(entry?.description || "").startsWith(MANAGED_PROTECTION_PREFIX))
    .map((entry) => entry?.protectedRangeId)
    .filter((entry) => Number.isFinite(Number(entry)));
  if (!protectedRangeIds.length) return;
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      requests: protectedRangeIds.map((protectedRangeId) => ({
        deleteProtectedRange: { protectedRangeId }
      }))
    })
  });
}

async function syncManagedProtectedRanges({ spreadsheetId, accessToken, sheetId, protections = [] }) {
  if (sheetId == null) return;
  const normalized = protections
    .map((entry) => ({
      ...entry,
      startRowIndex: Math.max(0, Number(entry?.startRowIndex ?? 0)),
      endRowIndex: Math.max(0, Number(entry?.endRowIndex ?? 0)),
      startColumnIndex: Math.max(0, Number(entry?.startColumnIndex ?? 0)),
      endColumnIndex: Math.max(0, Number(entry?.endColumnIndex ?? 0))
    }))
    .filter((entry) => entry.endRowIndex > entry.startRowIndex && entry.endColumnIndex > entry.startColumnIndex);
  await clearManagedProtectedRanges({ spreadsheetId, accessToken, sheetId });
  if (!normalized.length) return;
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      requests: normalized.map((entry) => ({
        addProtectedRange: {
          protectedRange: {
            description: `${MANAGED_PROTECTION_PREFIX}${entry.description}`,
            warningOnly: true,
            range: {
              sheetId,
              startRowIndex: entry.startRowIndex,
              endRowIndex: entry.endRowIndex,
              startColumnIndex: entry.startColumnIndex,
              endColumnIndex: entry.endColumnIndex
            }
          }
        }
      }))
    })
  });
}

function columnProtectionSpecs({ headers = [], editableHeaders = new Set(), rowCount, descriptionPrefix }) {
  return headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => !editableHeaders.has(header))
    .map(({ header, index }) => ({
      description: `${descriptionPrefix}: ${header}`,
      startRowIndex: 0,
      endRowIndex: Math.max(rowCount, 1),
      startColumnIndex: index,
      endColumnIndex: index + 1
    }));
}

async function formatManagedSheet({ spreadsheetId, accessToken, sheetName, sheetId, rowCount, columnCount, headers = [], rows = [] }) {
  if (sheetId == null) return;
  const safeColumnCount = Math.max(Number(columnCount || 0), 1);
  const setColumnWidthByHeader = (header, pixelSize) => {
    const columnIndex = headers.indexOf(header);
    if (columnIndex < 0) return;
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: columnIndex, endIndex: columnIndex + 1 },
        properties: { pixelSize },
        fields: "pixelSize"
      }
    });
  };
  const requests = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            hideGridlines: true,
            frozenRowCount: rowCount ? 1 : 0
          }
        },
        fields: "gridProperties.hideGridlines,gridProperties.frozenRowCount"
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: safeColumnCount },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.11, green: 0.18, blue: 0.24 },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10
            }
          }
        },
        fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)"
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 34 },
        fields: "pixelSize"
      }
    }
  ];
  if (rowCount > 1) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: safeColumnCount },
        cell: {
          userEnteredFormat: {
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            textFormat: {
              fontSize: 10,
              foregroundColor: { red: 0.16, green: 0.16, blue: 0.16 }
            }
          }
        },
        fields: "userEnteredFormat(verticalAlignment,wrapStrategy,textFormat)"
      }
    });
  }
  if (sheetName === "All Progressions") {
    setColumnWidthByHeader("Position in Progression", 96);
    setColumnWidthByHeader("Level ID", 84);
    setColumnWidthByHeader("Name/Title", 220);
    setColumnWidthByHeader("Progression", 160);
    setColumnWidthByHeader("Difficulty", 108);
    setColumnWidthByHeader("Screenshot", 150);
    setColumnWidthByHeader("Code File", 210);
    setColumnWidthByHeader("Need tweak", 106);
    setColumnWidthByHeader("Need fixes", 106);
    setColumnWidthByHeader("Feedback", 320);
    setColumnWidthByHeader("Feedback Owner", 170);
    setColumnWidthByHeader("Playtest difficulty", 150);
    setColumnWidthByHeader("Notes", 260);
    if (rowCount > 1) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: rowCount },
          properties: { pixelSize: 130 },
          fields: "pixelSize"
        }
      });
    }
  } else if (sheetName === LEVEL_CATALOG_SHEET_NAME) {
    requests.push(
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: Math.min(1, safeColumnCount) },
          properties: { pixelSize: 170 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: Math.min(1, safeColumnCount), endIndex: Math.min(2, safeColumnCount) },
          properties: { pixelSize: 110 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: Math.min(2, safeColumnCount), endIndex: Math.min(5, safeColumnCount) },
          properties: { pixelSize: 96 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: Math.min(5, safeColumnCount), endIndex: Math.min(6, safeColumnCount) },
          properties: { pixelSize: 124 },
          fields: "pixelSize"
        }
      }
    );
  } else if (sheetName === README_SHEET_NAME) {
    requests.push(
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: Math.min(1, safeColumnCount) },
          properties: { pixelSize: 110 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: Math.min(1, safeColumnCount), endIndex: Math.min(2, safeColumnCount) },
          properties: { pixelSize: 180 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: Math.min(2, safeColumnCount), endIndex: Math.min(3, safeColumnCount) },
          properties: { pixelSize: 360 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: Math.min(3, safeColumnCount), endIndex: Math.min(4, safeColumnCount) },
          properties: { pixelSize: 280 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: Math.min(4, safeColumnCount), endIndex: Math.min(5, safeColumnCount) },
          properties: { pixelSize: 240 },
          fields: "pixelSize"
        }
      }
    );
  } else if (sheetName === "Procedural learning") {
    setColumnWidthByHeader("Bucket", 118);
    setColumnWidthByHeader("Level", 84);
    setColumnWidthByHeader("Context", 220);
    setColumnWidthByHeader("Source File", 220);
    setColumnWidthByHeader("Board", 84);
    setColumnWidthByHeader("Pairs", 84);
    setColumnWidthByHeader("Blockers", 84);
    setColumnWidthByHeader("Moves", 84);
    setColumnWidthByHeader("Solutions", 92);
    setColumnWidthByHeader("Feedback", 280);
    setColumnWidthByHeader("Tags", 180);
    setColumnWidthByHeader("Timestamp", 170);
  } else {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: safeColumnCount },
        properties: { pixelSize: 150 },
        fields: "pixelSize"
      }
    });
  }
  if (rowCount > 1 && sheetName !== README_SHEET_NAME) {
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: safeColumnCount
          }
        }
      }
    });
  }
  const difficultyHeaders = ["Difficulty", "Playtest difficulty"];
  for (const header of difficultyHeaders) {
    const columnIndex = headers.indexOf(header);
    if (columnIndex < 0) continue;
    rows.forEach((row, index) => {
      const palette = recognizedDifficultyPalette(row[columnIndex]);
      if (!palette) return;
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: index + 1,
            endRowIndex: index + 2,
            startColumnIndex: columnIndex,
            endColumnIndex: columnIndex + 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: hexToRgb(palette.background),
              horizontalAlignment: "CENTER",
              textFormat: {
                bold: true,
                foregroundColor: hexToRgb(palette.text)
              }
            }
          },
          fields: "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat.bold,textFormat.foregroundColor)"
        }
      });
    });
  }
  const needFixesIndex = headers.indexOf("Need fixes");
  if (needFixesIndex >= 0 && rowCount > 1) {
    requests.push(
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: needFixesIndex, endColumnIndex: needFixesIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: hexToRgb("#FDEBEC"),
              horizontalAlignment: "CENTER"
            }
          },
          fields: "userEnteredFormat(backgroundColor,horizontalAlignment)"
        }
      },
      {
        setDataValidation: {
          range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: needFixesIndex, endColumnIndex: needFixesIndex + 1 },
          rule: {
            condition: { type: "BOOLEAN" },
            strict: false,
            showCustomUi: true
          }
        }
      }
    );
  }
  if (sheetName === "Procedural learning") {
    const bucketIndex = headers.indexOf("Bucket");
    if (bucketIndex >= 0) {
      rows.forEach((row, index) => {
        const palette = proceduralBucketPalette(row[bucketIndex]);
        if (!palette) return;
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: index + 1,
              endRowIndex: index + 2,
              startColumnIndex: bucketIndex,
              endColumnIndex: bucketIndex + 1
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: hexToRgb(palette.background),
                horizontalAlignment: "CENTER",
                textFormat: {
                  bold: true,
                  foregroundColor: hexToRgb(palette.text)
                }
              }
            },
            fields: "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat.bold,textFormat.foregroundColor)"
          }
        });
      });
    }
  }
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests })
  });
  const protections = [];
  if (sheetName === "All Progressions") {
    protections.push(...columnProtectionSpecs({
      headers,
      editableHeaders: PRIMARY_EDITABLE_HEADERS,
      rowCount,
      descriptionPrefix: "All Progressions generated column"
    }));
  } else if (["Level Manager state", LEVEL_CATALOG_SHEET_NAME, README_SHEET_NAME, "Procedural learning"].includes(sheetName)) {
    protections.push({
      description: `${sheetName} generated range`,
      ...fullRange({ sheetId, rowCount, columnCount })
    });
  }
  await syncManagedProtectedRanges({
    spreadsheetId,
    accessToken,
    sheetId,
    protections
  });
}

async function formatPlannerSheet({ spreadsheetId, accessToken, sheetId, rowCount, headers, rows = [] }) {
  if (sheetId == null) return;
  const approvedIndex = headers.indexOf("Approved");
  const materializedIndex = headers.indexOf("Materialized");
  const tutorialIndex = headers.indexOf(PLANNER_TUTORIAL_HEADER);
  const curveIndex = headers.indexOf("Curve");
  const notesIndex = headers.indexOf("Notes");
  const outputIndex = headers.indexOf("Output Folder");
  const slotIndexes = PLANNER_SLOT_HEADERS.map((header) => headers.indexOf(header)).filter((value) => value >= 0);
  const requests = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            hideGridlines: true,
            frozenRowCount: rowCount ? 1 : 0
          }
        },
        fields: "gridProperties.hideGridlines,gridProperties.frozenRowCount"
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.1, green: 0.16, blue: 0.21 },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10
            }
          }
        },
        fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)"
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 38 },
        fields: "pixelSize"
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: Math.max(rowCount, 2), startColumnIndex: 0, endColumnIndex: headers.length },
        cell: {
          userEnteredFormat: {
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            textFormat: {
              fontSize: 10,
              foregroundColor: { red: 0.16, green: 0.16, blue: 0.16 }
            }
          }
        },
        fields: "userEnteredFormat(verticalAlignment,wrapStrategy,textFormat)"
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: Math.min(2, headers.length) },
        properties: { pixelSize: 160 },
        fields: "pixelSize"
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: Math.min(2, headers.length), endIndex: Math.min(4, headers.length) },
        properties: { pixelSize: 98 },
        fields: "pixelSize"
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: Math.min(4, headers.length), endIndex: Math.min(6, headers.length) },
        properties: { pixelSize: 145 },
        fields: "pixelSize"
      }
    }
  ];
  if (tutorialIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: tutorialIndex, endIndex: tutorialIndex + 1 },
        properties: { pixelSize: 120 },
        fields: "pixelSize"
      }
    });
  }
  for (const header of PLANNER_SLOT_HEADERS) {
    const index = headers.indexOf(header);
    if (index < 0) continue;
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: index, endIndex: index + 1 },
        properties: { pixelSize: 120 },
        fields: "pixelSize"
      }
    });
  }
  if (curveIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: curveIndex, endIndex: curveIndex + 1 },
        properties: { pixelSize: 170 },
        fields: "pixelSize"
      }
    });
  }
  if (notesIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: notesIndex, endIndex: notesIndex + 1 },
        properties: { pixelSize: 240 },
        fields: "pixelSize"
      }
    });
  }
  if (outputIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: outputIndex, endIndex: outputIndex + 1 },
        properties: { pixelSize: 240 },
        fields: "pixelSize"
      }
    });
  }
  const reservedTutorialMain = hexToRgb("#F8F1DA");
  const reservedTutorialScreen = hexToRgb("#FCF8EC");
  const reservedTutorialDifficulty = hexToRgb("#F6E8C5");
  const approvedCellColor = hexToRgb("#E5F4E8");
  const materializedCellColor = hexToRgb("#E5EEF8");
  for (let rowIndex = 1; rowIndex < rowCount; rowIndex += PLANNER_ROW_BLOCK_SIZE) {
    const mainRow = rows[rowIndex - 1] || [];
    const difficultyRow = rows[rowIndex + 1] || [];
    const theme = plannerThemePalette(plannerThemeKeyForRow(mainRow, headers));
    const mainColor = hexToRgb(theme.main);
    const screenColor = hexToRgb(theme.screen);
    const difficultyColor = hexToRgb(theme.accent);
    requests.push(
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: Math.min(rowIndex + 1, rowCount) },
          properties: { pixelSize: 30 },
          fields: "pixelSize"
        }
      },
      {
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: Math.min(rowIndex + 1, rowCount), startColumnIndex: 0, endColumnIndex: headers.length },
          cell: {
            userEnteredFormat: {
              backgroundColor: mainColor
            }
          },
          fields: "userEnteredFormat.backgroundColor"
        }
      }
    );
    if (rowIndex + 1 < rowCount) {
      requests.push(
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "ROWS", startIndex: rowIndex + 1, endIndex: rowIndex + 2 },
            properties: { pixelSize: 96 },
            fields: "pixelSize"
          }
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: rowIndex + 1, endRowIndex: rowIndex + 2, startColumnIndex: 0, endColumnIndex: headers.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: screenColor
              }
            },
            fields: "userEnteredFormat.backgroundColor"
          }
        }
      );
    }
    if (rowIndex + 2 < rowCount) {
      requests.push(
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "ROWS", startIndex: rowIndex + 2, endIndex: rowIndex + 3 },
            properties: { pixelSize: 30 },
            fields: "pixelSize"
          }
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: rowIndex + 2, endRowIndex: rowIndex + 3, startColumnIndex: 0, endColumnIndex: headers.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: difficultyColor
              }
            },
            fields: "userEnteredFormat.backgroundColor"
          }
        }
      );
    }
    if (tutorialIndex >= 0) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: Math.min(rowIndex + 1, rowCount), startColumnIndex: tutorialIndex, endColumnIndex: tutorialIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: reservedTutorialMain
            }
          },
          fields: "userEnteredFormat.backgroundColor"
        }
      });
      if (rowIndex + 1 < rowCount) {
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: rowIndex + 1, endRowIndex: rowIndex + 2, startColumnIndex: tutorialIndex, endColumnIndex: tutorialIndex + 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: reservedTutorialScreen
              }
            },
            fields: "userEnteredFormat.backgroundColor"
          }
        });
      }
      if (rowIndex + 2 < rowCount) {
        const tutorialDifficulty = tutorialIndex >= 0 ? String(difficultyRow[tutorialIndex] || "").trim() : "";
        const tutorialDifficultyPalette = difficultyCellPalette(tutorialDifficulty || "tutorial");
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: rowIndex + 2, endRowIndex: rowIndex + 3, startColumnIndex: tutorialIndex, endColumnIndex: tutorialIndex + 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: tutorialDifficulty ? hexToRgb(tutorialDifficultyPalette.background) : reservedTutorialDifficulty,
                horizontalAlignment: "CENTER",
                textFormat: {
                  bold: true,
                  foregroundColor: hexToRgb(tutorialDifficultyPalette.text)
                }
              }
            },
            fields: "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat.bold,textFormat.foregroundColor)"
          }
        });
      }
    }
    slotIndexes.forEach((columnIndex, slotOrder) => {
      const mainSlotColor = interpolateColor(theme.slotStart, theme.slotEnd, slotIndexes.length > 1 ? slotOrder / (slotIndexes.length - 1) : 0);
      const screenSlotColor = interpolateColor(theme.slotStart, theme.slotEnd, slotIndexes.length > 1 ? Math.max(0, (slotOrder - 0.5)) / (slotIndexes.length - 1) : 0);
      const difficultySlotColor = interpolateColor(theme.slotStart, theme.slotEnd, slotIndexes.length > 1 ? slotOrder / (slotIndexes.length - 1) : 0);
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: Math.min(rowIndex + 1, rowCount), startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: mainSlotColor
            }
          },
          fields: "userEnteredFormat.backgroundColor"
        }
      });
      if (rowIndex + 1 < rowCount) {
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: rowIndex + 1, endRowIndex: rowIndex + 2, startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: screenSlotColor
              }
            },
            fields: "userEnteredFormat.backgroundColor"
          }
        });
      }
      if (rowIndex + 2 < rowCount) {
        const difficultyValue = String(difficultyRow[columnIndex] || "").trim();
        const difficultyPalette = difficultyCellPalette(difficultyValue);
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: rowIndex + 2, endRowIndex: rowIndex + 3, startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: hexToRgb(difficultyPalette.background),
                horizontalAlignment: "CENTER",
                textFormat: {
                  bold: true,
                  foregroundColor: hexToRgb(difficultyPalette.text)
                }
              }
            },
            fields: "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat.bold,textFormat.foregroundColor)"
          }
        });
      }
    });
    if (approvedIndex >= 0) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: Math.min(rowIndex + 1, rowCount), startColumnIndex: approvedIndex, endColumnIndex: approvedIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: approvedCellColor,
              horizontalAlignment: "CENTER"
            }
          },
          fields: "userEnteredFormat(backgroundColor,horizontalAlignment)"
        }
      });
    }
    if (materializedIndex >= 0) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: Math.min(rowIndex + 1, rowCount), startColumnIndex: materializedIndex, endColumnIndex: materializedIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: materializedCellColor,
              horizontalAlignment: "CENTER"
            }
          },
          fields: "userEnteredFormat(backgroundColor,horizontalAlignment)"
        }
      });
    }
  }
  if (approvedIndex >= 0) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: Math.max(rowCount, 2), startColumnIndex: approvedIndex, endColumnIndex: approvedIndex + 1 },
        cell: { dataValidation: null },
        fields: "dataValidation"
      }
    });
  }
  if (materializedIndex >= 0) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: Math.max(rowCount, 2), startColumnIndex: materializedIndex, endColumnIndex: materializedIndex + 1 },
        cell: { dataValidation: null },
        fields: "dataValidation"
      }
    });
  }
  if (rowCount > 1) {
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: headers.length
          }
        }
      }
    });
  }
  for (let rowIndex = 1; rowIndex < rowCount; rowIndex += PLANNER_ROW_BLOCK_SIZE) {
    if (approvedIndex >= 0) {
      requests.push({
        setDataValidation: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: Math.min(rowIndex + 1, rowCount), startColumnIndex: approvedIndex, endColumnIndex: approvedIndex + 1 },
          rule: {
            condition: { type: "BOOLEAN" },
            strict: false,
            showCustomUi: true
          }
        }
      });
    }
    if (materializedIndex >= 0) {
      requests.push({
        setDataValidation: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: Math.min(rowIndex + 1, rowCount), startColumnIndex: materializedIndex, endColumnIndex: materializedIndex + 1 },
          rule: {
            condition: { type: "BOOLEAN" },
            strict: false,
            showCustomUi: true
          }
        }
      });
    }
  }
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests })
  });
  const protections = columnProtectionSpecs({
    headers,
    editableHeaders: PLANNER_EDITABLE_HEADERS,
    rowCount,
    descriptionPrefix: "Mix Planner generated column"
  });
  for (let rowIndex = 1; rowIndex < rowCount; rowIndex += PLANNER_ROW_BLOCK_SIZE) {
    if (rowIndex + 1 < rowCount) {
      protections.push({
        description: `Mix Planner screenshot row ${rowIndex + 2}`,
        startRowIndex: rowIndex + 1,
        endRowIndex: rowIndex + 2,
        startColumnIndex: 0,
        endColumnIndex: headers.length
      });
    }
    if (rowIndex + 2 < rowCount) {
      protections.push({
        description: `Mix Planner difficulty row ${rowIndex + 3}`,
        startRowIndex: rowIndex + 2,
        endRowIndex: rowIndex + 3,
        startColumnIndex: 0,
        endColumnIndex: headers.length
      });
    }
  }
  await syncManagedProtectedRanges({
    spreadsheetId,
    accessToken,
    sheetId,
    protections
  });
}

async function formatRenameSheet({ spreadsheetId, accessToken, sheetId, rowCount, headers, rows = [] }) {
  if (sheetId == null) return;
  const screenshotIndex = headers.indexOf("Screenshot");
  const positionIndex = headers.indexOf("Position");
  const ordinalIndex = headers.indexOf("Ordinal");
  const targetIndex = headers.indexOf("Target Name");
  const previewIndex = headers.indexOf("Preview Label");
  const pendingIndex = headers.indexOf("Rename Pending");
  const statusIndex = headers.indexOf("Apply Status");
  const notesIndex = headers.indexOf("Notes");
  const levelPathIndex = headers.indexOf("Level Path");
  const screenshotPathIndex = headers.indexOf("Screenshot Path");
  const plannedIndex = headers.indexOf("Planned File");
  const requests = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            hideGridlines: true,
            frozenRowCount: rowCount ? 1 : 0
          }
        },
        fields: "gridProperties.hideGridlines,gridProperties.frozenRowCount"
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.1, green: 0.16, blue: 0.21 },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10
            }
          }
        },
        fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)"
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 38 },
        fields: "pixelSize"
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: Math.max(rowCount, 2), startColumnIndex: 0, endColumnIndex: headers.length },
        cell: {
          userEnteredFormat: {
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            textFormat: {
              fontSize: 10,
              foregroundColor: { red: 0.16, green: 0.16, blue: 0.16 }
            }
          }
        },
        fields: "userEnteredFormat(verticalAlignment,wrapStrategy,textFormat)"
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: Math.max(rowCount, 2) },
        properties: { pixelSize: 104 },
        fields: "pixelSize"
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: Math.min(4, headers.length) },
        properties: { pixelSize: 96 },
        fields: "pixelSize"
      }
    }
  ];
  if (screenshotIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: screenshotIndex, endIndex: screenshotIndex + 1 },
        properties: { pixelSize: 132 },
        fields: "pixelSize"
      }
    });
  }
  if (targetIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: targetIndex, endIndex: targetIndex + 1 },
        properties: { pixelSize: 190 },
        fields: "pixelSize"
      }
    });
  }
  if (previewIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: previewIndex, endIndex: previewIndex + 1 },
        properties: { pixelSize: 220 },
        fields: "pixelSize"
      }
    });
  }
  if (levelPathIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: levelPathIndex, endIndex: levelPathIndex + 1 },
        properties: { pixelSize: 260 },
        fields: "pixelSize"
      }
    });
  }
  if (screenshotPathIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: screenshotPathIndex, endIndex: screenshotPathIndex + 1 },
        properties: { pixelSize: 260 },
        fields: "pixelSize"
      }
    });
  }
  if (plannedIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: plannedIndex, endIndex: plannedIndex + 1 },
        properties: { pixelSize: 170 },
        fields: "pixelSize"
      }
    });
  }
  if (statusIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: statusIndex, endIndex: statusIndex + 1 },
        properties: { pixelSize: 210 },
        fields: "pixelSize"
      }
    });
  }
  if (notesIndex >= 0) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: notesIndex, endIndex: notesIndex + 1 },
        properties: { pixelSize: 180 },
        fields: "pixelSize"
      }
    });
  }
  const positionColor = hexToRgb("#EEF1F4");
  const targetColor = hexToRgb("#FFF6E4");
  const previewColor = hexToRgb("#F2F7FB");
  const pendingCellColor = hexToRgb("#F9E7BF");
  const statusColor = hexToRgb("#EEF2F5");
  for (let rowIndex = 1; rowIndex < rowCount; rowIndex += 1) {
    const row = rows[rowIndex - 1] || [];
    const theme = plannerThemePalette(renameThemeKeyForRow(row, headers));
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: headers.length },
        cell: {
          userEnteredFormat: {
            backgroundColor: hexToRgb(theme.main)
          }
        },
        fields: "userEnteredFormat.backgroundColor"
      }
    });
    if (positionIndex >= 0) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: positionIndex, endColumnIndex: positionIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: positionColor,
              horizontalAlignment: "CENTER"
            }
          },
          fields: "userEnteredFormat(backgroundColor,horizontalAlignment)"
        }
      });
    }
    if (ordinalIndex >= 0) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: ordinalIndex, endColumnIndex: ordinalIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: positionColor,
              horizontalAlignment: "CENTER",
              textFormat: { bold: true }
            }
          },
          fields: "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat.bold)"
        }
      });
    }
    if (targetIndex >= 0) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: targetIndex, endColumnIndex: targetIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: targetColor
            }
          },
          fields: "userEnteredFormat.backgroundColor"
        }
      });
    }
    if (previewIndex >= 0) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: previewIndex, endColumnIndex: previewIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: previewColor,
              textFormat: { bold: true }
            }
          },
          fields: "userEnteredFormat(backgroundColor,textFormat.bold)"
        }
      });
    }
    if (pendingIndex >= 0) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: pendingIndex, endColumnIndex: pendingIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: pendingCellColor,
              horizontalAlignment: "CENTER"
            }
          },
          fields: "userEnteredFormat(backgroundColor,horizontalAlignment)"
        }
      });
    }
    if (statusIndex >= 0) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: statusIndex, endColumnIndex: statusIndex + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: statusColor
            }
          },
          fields: "userEnteredFormat.backgroundColor"
        }
      });
    }
  }
  if (rowCount > 1) {
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: headers.length
          }
        }
      }
    });
  }
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests })
  });

  await clearConditionalFormatRules({ spreadsheetId, accessToken, sheetId });
  if (pendingIndex < 0 || statusIndex < 0 || rowCount <= 1) return;
  const pendingColumn = columnNumberToA1(pendingIndex + 1);
  const targetColumn = columnNumberToA1(targetIndex + 1);
  const statusColumn = columnNumberToA1(statusIndex + 1);
  const conditionalRequests = [
    {
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: headers.length }],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: `=$${pendingColumn}2=TRUE` }]
            },
            format: {
              backgroundColor: hexToRgb("#FFF0DB")
            }
          }
        }
      }
    },
    {
      addConditionalFormatRule: {
        index: 1,
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: targetIndex, endColumnIndex: targetIndex + 1 }],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: `=$${pendingColumn}2=TRUE` }]
            },
            format: {
              backgroundColor: hexToRgb("#F9DCA5"),
              textFormat: {
                bold: true
              }
            }
          }
        }
      }
    },
    {
      addConditionalFormatRule: {
        index: 2,
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: statusIndex, endColumnIndex: statusIndex + 1 }],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: `=REGEXMATCH($${statusColumn}2,"^APPLIED")` }]
            },
            format: {
              backgroundColor: hexToRgb("#E4F3E7")
            }
          }
        }
      }
    },
    {
      addConditionalFormatRule: {
        index: 3,
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: statusIndex, endColumnIndex: statusIndex + 1 }],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: `=REGEXMATCH($${statusColumn}2,"^(CONFLICT|ERROR)")` }]
            },
            format: {
              backgroundColor: hexToRgb("#F8E5E7")
            }
          }
        }
      }
    }
  ];
  if (targetIndex >= 0) {
    conditionalRequests.push({
      addConditionalFormatRule: {
        index: 4,
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: previewIndex, endColumnIndex: previewIndex + 1 }],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: `=LEN(TRIM($${targetColumn}2))>0` }]
            },
            format: {
              textFormat: {
                bold: true
              }
            }
          }
        }
      }
    });
  }
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests: conditionalRequests })
  });
  await syncManagedProtectedRanges({
    spreadsheetId,
    accessToken,
    sheetId,
    protections: columnProtectionSpecs({
      headers,
      editableHeaders: RENAME_EDITABLE_HEADERS,
      rowCount,
      descriptionPrefix: "Level Renames generated column"
    })
  });
}

async function syncLevelRenameSheet({ spreadsheetId, accessToken, renameSheetName, renameHeaders, renameRows, screenshotIds = new Map() }) {
  if (!renameHeaders.length) return;
  let existingValues = [];
  try {
    existingValues = await readSheetValues({
      spreadsheetId,
      accessToken,
      range: `${renameSheetName}!A:ZZ`
    });
  } catch (_err) {
    existingValues = [];
  }
  const ids = await ensureSheetsExist({ spreadsheetId, accessToken, sheetNames: [renameSheetName] });
  const mergedRows = mergeRenameRows({
    headers: renameHeaders,
    existingValues,
    incomingRows: renameRows
  });
  const screenshotIndex = renameHeaders.indexOf("Screenshot");
  const screenshotFileIndex = renameHeaders.indexOf("Screenshot File");
  const displayRows = mergedRows.map((row) => {
    const next = [...row];
    if (screenshotIndex >= 0 && screenshotFileIndex >= 0) {
      const screenshotName = String(next[screenshotFileIndex] || "").trim();
      next[screenshotIndex] = makeDriveLinkFormula(screenshotIds.get(screenshotName) || "");
    }
    return next;
  });
  const allRows = [renameHeaders, ...displayRows];
  await upsertSheetValues({
    spreadsheetId,
    accessToken,
    sheetName: renameSheetName,
    rows: allRows,
    sheetId: ids.get(renameSheetName),
    valueInputOption: "USER_ENTERED"
  });
  await formatRenameSheet({
    spreadsheetId,
    accessToken,
    sheetId: ids.get(renameSheetName),
    rowCount: allRows.length,
    headers: renameHeaders,
    rows: displayRows
  });
}

async function syncPermutationPlannerSheet({ spreadsheetId, accessToken, plannerSheetName, plannerHeaders, plannerRows, screenshotIds = new Map(), payload = {} }) {
  if (!plannerHeaders.length) return;
  let existingValues = [];
  try {
    existingValues = await readSheetValues({
      spreadsheetId,
      accessToken,
      range: `${plannerSheetName}!A:ZZ`
    });
  } catch (_err) {
    existingValues = [];
  }
  if (existingValues.length <= 1) {
    for (const legacySheetName of LEGACY_PLANNER_SHEET_NAMES) {
      if (!legacySheetName || legacySheetName === plannerSheetName) continue;
      try {
        const legacyValues = await readSheetValues({
          spreadsheetId,
          accessToken,
          range: `${legacySheetName}!A:ZZ`
        });
        if (legacyValues.length > 1) {
          existingValues = legacyValues;
          break;
        }
      } catch (_err) {
        // Ignore missing legacy sheet names.
      }
    }
  }
  const ids = await ensureSheetsExist({ spreadsheetId, accessToken, sheetNames: [plannerSheetName] });
  const mergedRows = mergePlannerRows({
    headers: plannerHeaders,
    existingValues,
    incomingRows: plannerRows
  });
  const screenshotLookup = plannerScreenshotLookupFromPayload(payload);
  const difficultyLookup = plannerDifficultyLookupFromPayload(payload);
  const displayRows = expandPlannerRowsForDisplay({
    headers: plannerHeaders,
    rows: mergedRows,
    screenshotIds,
    screenshotLookup,
    difficultyLookup
  });
  const allRows = [plannerHeaders, ...displayRows];
  await upsertSheetValues({
    spreadsheetId,
    accessToken,
    sheetName: plannerSheetName,
    rows: allRows,
    sheetId: ids.get(plannerSheetName),
    valueInputOption: "USER_ENTERED"
  });
  await formatPlannerSheet({
    spreadsheetId,
    accessToken,
    sheetId: ids.get(plannerSheetName),
    rowCount: allRows.length,
    headers: plannerHeaders,
    rows: displayRows
  });
}

async function formatDriveImageSheet({ spreadsheetId, accessToken, sheetId, rowCount }) {
  if (sheetId == null) return;
  const requests = [
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 260 },
        fields: "pixelSize"
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 160 },
        fields: "pixelSize"
      }
    }
  ];
  if (rowCount > 1) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: rowCount },
        properties: { pixelSize: 130 },
        fields: "pixelSize"
      }
    });
  }
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests })
  });
}

function decorateReadmeRows(headers, rows) {
  const linkIndex = headers.indexOf("Link");
  const labelIndex = headers.indexOf("Tab / Surface");
  if (linkIndex < 0) return rows;
  return rows.map((row) => {
    const next = [...row];
    const value = String(next[linkIndex] || "");
    if (!value.startsWith("http")) return next;
    const displayLabel = String(next[labelIndex] || value).replace(/"/g, "\"\"");
    next[linkIndex] = `=HYPERLINK("${value}","${displayLabel}")`;
    return next;
  });
}

async function syncCurveBuilderSheet({ spreadsheetId, accessToken, catalogRows = [], catalogHeaders = [], screenshotIds = new Map() }) {
  const sheetName = CURVE_BUILDER_SHEET_NAME;
  const ids = await ensureSheetsExist({ spreadsheetId, accessToken, sheetNames: [sheetName] });
  const sheetId = ids.get(sheetName);

  let existingValues = [];
  try {
    existingValues = await readSheetValues({ spreadsheetId, accessToken, range: `${sheetName}!A:ZZ` });
  } catch (_err) { existingValues = []; }

  const SLOT_COUNT = 11;
  const fileIdx = catalogHeaders.indexOf("File");
  const diffIdx = catalogHeaders.indexOf("Difficulty");
  const boardIdx = catalogHeaders.indexOf("Board");
  const pairsIdx = catalogHeaders.indexOf("Pairs");
  const blockersIdx = catalogHeaders.indexOf("Blockers");
  const movesIdx = catalogHeaders.indexOf("Moves");

  const levelsByDifficulty = { ALL: [], EASY: [], MEDIUM: [], HARD: [] };
  for (const row of catalogRows) {
    const file = String(row[fileIdx] || "").trim();
    const diff = String(row[diffIdx] || "").toUpperCase().trim();
    if (!file) continue;
    levelsByDifficulty.ALL.push(file);
    if (levelsByDifficulty[diff]) levelsByDifficulty[diff].push(file);
  }
  const allLevelFiles = levelsByDifficulty.ALL;

  const levelMeta = new Map();
  for (const row of catalogRows) {
    const file = String(row[fileIdx] || "").trim();
    if (!file) continue;
    levelMeta.set(file, {
      board: String(row[boardIdx] || ""),
      pairs: String(row[pairsIdx] || ""),
      blockers: String(row[blockersIdx] || ""),
      moves: String(row[movesIdx] || ""),
      difficulty: String(row[diffIdx] || "").toUpperCase()
    });
  }

  const existingDifficulty = [];
  const existingLevels = [];
  const existingName = [];
  if (existingValues.length > 2) {
    const diffRow = existingValues[2] || [];
    const levelRow = existingValues[3] || [];
    const nameRow = existingValues[1] || [];
    for (let c = 1; c <= SLOT_COUNT; c++) {
      existingDifficulty.push(String(diffRow[c] || "").trim());
      existingLevels.push(String(levelRow[c] || "").trim());
    }
    existingName.push(String(nameRow[1] || "").trim());
  }
  const progName = existingName[0] || "new_curve";

  const headerRow = [""];
  const slotLabelRow = ["Progression"];
  const diffRow = ["Difficulty"];
  const levelRow = ["Level File"];
  const screenshotRow = ["Screenshot"];
  const infoRow = ["Info"];
  const statusRow = ["Actions"];

  for (let s = 0; s < SLOT_COUNT; s++) {
    const label = s === 0 ? "Tutorial" : `Slot ${s}`;
    headerRow.push(label);
    slotLabelRow.push(s === 0 ? progName : "");

    const diff = existingDifficulty[s] || (s === 0 ? "EASY" : "ALL");
    diffRow.push(diff);

    const level = existingLevels[s] || (s === 0 ? "tutorial_level.json" : "");
    levelRow.push(level);

    const stem = level.replace(/\.json$/, "");
    const screenshotName = stem ? `${stem}.png` : "";
    const driveId = screenshotIds.get(screenshotName) || "";
    screenshotRow.push(driveId ? makeDriveImageFormula(driveId, 120) : "");

    const meta = levelMeta.get(level);
    infoRow.push(meta ? `${meta.board}, ${meta.pairs}p ${meta.blockers}b ${meta.moves}m` : "");
    statusRow.push("");
  }

  headerRow.push("Actions");
  slotLabelRow.push("");
  diffRow.push('=HYPERLINK("http://127.0.0.1:8080/api/action/random-fill-curve","⚡ Random Fill")');
  levelRow.push('=HYPERLINK("http://127.0.0.1:8080/api/action/materialize-curve","📦 Materialize")');
  screenshotRow.push('=HYPERLINK("http://127.0.0.1:8080/api/action/sync-sheets","🔄 Sync Sheets")');
  infoRow.push('=HYPERLINK("http://127.0.0.1:8080","🌐 Open Toolkit")');
  statusRow.push("");

  const rows = [headerRow, slotLabelRow, diffRow, levelRow, screenshotRow, infoRow, statusRow];

  await upsertSheetValues({
    spreadsheetId, accessToken, sheetName,
    rows, sheetId, valueInputOption: "USER_ENTERED"
  });

  const requests = [];
  const colCount = SLOT_COUNT + 3;

  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1, frozenColumnCount: 1 } },
      fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount"
    }
  });

  // Screenshot row height (row index 4 = "Screenshot")
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: "ROWS", startIndex: 4, endIndex: 5 },
      properties: { pixelSize: 130 },
      fields: "pixelSize"
    }
  });
  // Column width for slots — wider to fit screenshots
  for (let c = 1; c <= SLOT_COUNT; c++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: c, endIndex: c + 1 },
        properties: { pixelSize: 160 },
        fields: "pixelSize"
      }
    });
  }

  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 100 },
      fields: "pixelSize"
    }
  });

  for (let c = 1; c <= SLOT_COUNT; c++) {
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: c, endColumnIndex: c + 1 },
        rule: {
          condition: { type: "ONE_OF_LIST", values: [
            { userEnteredValue: "ALL" }, { userEnteredValue: "EASY" },
            { userEnteredValue: "MEDIUM" }, { userEnteredValue: "HARD" }
          ]},
          showCustomUi: true, strict: true
        }
      }
    });

    const levelValidation = allLevelFiles.slice(0, 500).map((f) => ({ userEnteredValue: f }));
    if (levelValidation.length) {
      requests.push({
        setDataValidation: {
          range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: c, endColumnIndex: c + 1 },
          rule: {
            condition: { type: "ONE_OF_LIST", values: levelValidation },
            showCustomUi: true, strict: false
          }
        }
      });
    }
  }

  const headerBg = hexToRgb("#0369a1");
  const headerFg = { red: 1, green: 1, blue: 1 };
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount },
      cell: {
        userEnteredFormat: {
          backgroundColor: headerBg,
          textFormat: { bold: true, foregroundColor: headerFg, fontSize: 11 },
          horizontalAlignment: "CENTER"
        }
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
    }
  });

  const labelBg = hexToRgb("#f0f6fc");
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: labelBg,
          textFormat: { bold: true, fontSize: 10 }
        }
      },
      fields: "userEnteredFormat(backgroundColor,textFormat)"
    }
  });

  const easyBg = hexToRgb("#dcfce7");
  const medBg = hexToRgb("#fef3c7");
  const hardBg = hexToRgb("#fecaca");
  for (let c = 1; c <= SLOT_COUNT; c++) {
    for (const [value, bg] of [["EASY", easyBg], ["MEDIUM", medBg], ["HARD", hardBg]]) {
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: c, endColumnIndex: c + 1 }],
            booleanRule: {
              condition: { type: "TEXT_EQ", values: [{ userEnteredValue: value }] },
              format: { backgroundColor: bg }
            }
          },
          index: 0
        }
      });
    }
  }

  await googleApiJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    accessToken,
    { method: "POST", body: JSON.stringify({ requests }) }
  );
}

// ── Benchmark sheet ──────────────────────────────────────────────────
const BENCHMARK_SHEET_NAME = "Benchmark";

async function syncBenchmarkSheet({ spreadsheetId, accessToken }) {
  const sheetName = BENCHMARK_SHEET_NAME;
  const ids = await ensureSheetsExist({ spreadsheetId, accessToken, sheetNames: [sheetName] });
  const sheetId = ids.get(sheetName);

  const headers = ["Source", "Level", "Grid", "Pairs", "Blockers", "Coverage%", "Difficulty", "Patterns", "Insight"];
  const benchmarkData = [
    ["Flow Free", "nivel 3", "8x8", "6", "6", "84%", "MEDIUM", "blocker_cluster_chokepoint", "Long wrapping routes define board structure"],
    ["Flow Free", "nivel 4", "8x8", "6", "4", "83%", "MEDIUM", "perimeter_wrap_route", "Cyan wraps perimeter, constraining interior"],
    ["Flow Free", "nivel 5", "8x8", "6", "8", "78%", "HARD", "blocker_cluster_chokepoint", "Dense blockers force short constrained paths"],
    ["Flow Free", "nivel 6", "8x8", "7", "3", "89%", "HARD", "nested_route_structure", "Pink frame with interior pairs competing"],
    ["Flow Free", "nivel 7a", "8x8", "8", "4", "91%", "HARD", "pair_scaling_benchmark", "8 pairs! Red covers massive area"],
    ["Flow Free", "nivel 7b", "8x8", "8", "12", "0%", "HARD", "blocker_cluster_chokepoint", "Unsolved: 8 pairs + 12 blockers"],
    ["Flow Free", "nivel 9a", "8x8", "7", "8", "68%", "HARD", "blocker_cluster_chokepoint", "Low coverage despite many blockers"],
    ["Flow Free", "nivel 9b", "9x9", "10", "0", "89%", "EXTREME", "zero_blocker_pure_interference", "10 pairs, 0 blockers = pure interference"],
    ["Flow Free", "nivel 11", "9x9", "9", "4", "97%", "EXTREME", "high_coverage_difficulty", "98 steps! Near full-board coverage"],
    ["Flow Free", "nivel 13", "8x8", "7", "0", "96%", "HARD", "zero_blocker_pure_interference", "Zero blockers, full coverage through routing"],
    ["Flow Free", "nivel 15", "9x9", "8", "5", "96%", "HARD", "long_distance_endpoints", "Clustered blockers in center"],
    ["Flow Free", "nivel 16", "8x8", "6", "6", "71%", "MEDIUM", "perimeter_wrap_route", "Low coverage but 27 steps"],
    ["Flow Free", "nivel 32", "8x8", "7", "4", "79%", "HARD", "nested_route_structure", "Blocker cluster forces corner routing"],
    ["Flow Free", "nivel 34", "8x8", "7", "4", "89%", "HARD", "perimeter_wrap_route", "Red wraps from top creating frame"],
    ["", "", "", "", "", "", "", "", ""],
    ["INSIGHT", "FtB Gap", "", "", "", "", "", "", "FtB uses 3-4 pairs on 8x8. Benchmark uses 6-8. Increase pairs, reduce blockers."],
    ["INSIGHT", "Blocker quality", "", "", "", "", "", "", "35% of FtB rejections = meaningless blockers. Use clusters, not random placement."],
    ["INSIGHT", "Coverage target", "", "", "", "", "", "", "HARD levels should aim for 85%+ coverage. EASY levels: 60-75%."],
    ["INSIGHT", "Zero-blocker boards", "", "", "", "", "", "", "Some of the best boards have 0 blockers and rely on pure path interference."],
  ];

  const rows = [headers, ...benchmarkData];
  await upsertSheetValues({ spreadsheetId, accessToken, sheetName, rows, sheetId, valueInputOption: "RAW" });

  const requests = [];
  const colCount = headers.length;

  // Freeze header
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: "gridProperties.frozenRowCount"
    }
  });

  // Header styling
  const headerBg = hexToRgb("#0f172a");
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount },
      cell: {
        userEnteredFormat: {
          backgroundColor: headerBg,
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 11 },
          horizontalAlignment: "CENTER"
        }
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
    }
  });

  // Difficulty conditional formatting
  for (const [value, bg] of [["MEDIUM", hexToRgb("#fef3c7")], ["HARD", hexToRgb("#fecaca")], ["EXTREME", hexToRgb("#e9d5ff")]]) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rows.length, startColumnIndex: 6, endColumnIndex: 7 }],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: value }] },
            format: { backgroundColor: bg }
          }
        },
        index: 0
      }
    });
  }

  // Insight rows background
  const insightBg = hexToRgb("#eff6ff");
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: rows.length - 4, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: colCount },
      cell: { userEnteredFormat: { backgroundColor: insightBg, textFormat: { bold: true, fontSize: 10 } } },
      fields: "userEnteredFormat(backgroundColor,textFormat)"
    }
  });

  // Column widths
  const widths = [80, 100, 60, 50, 60, 70, 80, 200, 350];
  widths.forEach((w, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: "pixelSize"
      }
    });
  });

  await googleApiJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    accessToken,
    { method: "POST", body: JSON.stringify({ requests }) }
  );
}

// ── Feedback sheets ───────────────────────────────────────────────────
// Creates/updates 4 tabs: TEMPLATE (duplicable per tester), Master
// (auto-aggregation with COUNTIF formulas), Tracking (level versions),
// and Changelog (audit log of tweaks).

function buildFeedbackLevelRows(payload) {
  const primaryHeaders = payload.primaryHeaders || [];
  const primaryRows = payload.primaryRows || [];
  const nameIdx = primaryHeaders.indexOf("Level Name");
  const progIdx = primaryHeaders.indexOf("Progression");
  const slotIdx = primaryHeaders.indexOf("Slot");
  const movesIdx = primaryHeaders.indexOf("Moves");
  const levels = [];
  for (const row of primaryRows) {
    const name = String(row[nameIdx >= 0 ? nameIdx : 0] || "").trim();
    const progression = String(row[progIdx >= 0 ? progIdx : 1] || "").trim();
    const slot = String(row[slotIdx >= 0 ? slotIdx : 2] || "").trim();
    const moves = movesIdx >= 0 ? String(row[movesIdx] || "").trim() : "";
    if (name) levels.push({ name, progression, slot, moves });
  }
  return levels;
}

function buildTemplateSheet(levels) {
  const headers = ["#", "Progression", "Slot", "Level Name", "Move Budget", ...FEEDBACK_QUESTIONS, "Extra Moves Used", "General Feedback"];
  const rows = levels.map((lvl, i) => [
    i + 1,
    lvl.progression,
    lvl.slot,
    lvl.name,
    lvl.moves || "",
    ...FEEDBACK_QUESTIONS.map(() => ""),
    "",  // Extra Moves Used — tester fills in how many extra moves needed (0 = solved within budget)
    ""
  ]);
  return { headers, rows };
}

function buildMasterSheet(levels, testerSheetNames) {
  const questionCount = FEEDBACK_QUESTIONS.length;
  // Template columns: #, Progression, Slot, Level Name, Move Budget, [7 questions], Extra Moves Used, General Feedback
  // Extra Moves Used is at column index: 5 (Move Budget) + 7 (questions) + 1 = column 13 (1-based), letter M
  const extraMovesTemplateCol = columnNumberToA1(5 + questionCount + 1);  // column after last question in template

  const headers = [
    "#", "Level Name", "Move Budget",
    ...FEEDBACK_QUESTIONS.flatMap((q) => [`${q} YES`, `${q} NO`, `${q} %YES`]),
    "Avg Extra Moves",
    "Priority Score",
    "Total Responses"
  ];
  const rows = levels.map((lvl, i) => {
    const rowNum = i + 2;
    const cells = [i + 1, lvl.name, lvl.moves || ""];
    const questionCols = [];
    for (let q = 0; q < questionCount; q++) {
      const colLetter = columnNumberToA1(6 + q);  // template: col 6 onwards are the YES/NO questions
      const yesFormula = testerSheetNames.length
        ? `=SUMPRODUCT(${testerSheetNames.map((s) => `COUNTIF(INDIRECT("'${s}'!${colLetter}${rowNum}"), "YES")`).join(",")})`
        : `=0`;
      const noFormula = testerSheetNames.length
        ? `=SUMPRODUCT(${testerSheetNames.map((s) => `COUNTIF(INDIRECT("'${s}'!${colLetter}${rowNum}"), "NO")`).join(",")})`
        : `=0`;
      const yesCol = columnNumberToA1(cells.length + 1);
      const noCol = columnNumberToA1(cells.length + 2);
      const pctFormula = `=IFERROR(${yesCol}${rowNum}/(${yesCol}${rowNum}+${noCol}${rowNum}), 0)`;
      cells.push(yesFormula, noFormula, pctFormula);
      questionCols.push({ question: FEEDBACK_QUESTIONS[q], yesCol, noCol });
    }
    // Avg Extra Moves — average of Extra Moves Used across all tester sheets
    const avgExtraMovesFormula = testerSheetNames.length
      ? `=IFERROR(AVERAGE(${testerSheetNames.map((s) => `INDIRECT("'${s}'!${extraMovesTemplateCol}${rowNum}")`).join(",")}), "")`
      : `=""`;
    cells.push(avgExtraMovesFormula);

    const priorityParts = [];
    for (const qc of questionCols) {
      const weight = FEEDBACK_PRIORITY_WEIGHTS[qc.question];
      if (weight) {
        priorityParts.push(`(${qc.yesCol}${rowNum}*${weight})`);
      }
    }
    const priorityFormula = priorityParts.length
      ? `=${priorityParts.join("+")}`
      : `=0`;
    const totalFormula = testerSheetNames.length
      ? `=${testerSheetNames.length}`
      : `=0`;
    cells.push(priorityFormula, totalFormula);
    return cells;
  });
  return { headers, rows };
}

function buildTrackingSheet(levels) {
  const headers = ["Level Name", "Current Version", "Last Changed", "Change Type", "Changed By", "Notes"];
  const rows = levels.map((lvl) => [
    lvl.name,
    "v1.0",
    new Date().toISOString().slice(0, 10),
    "Initial",
    "",
    ""
  ]);
  return { headers, rows };
}

function buildChangelogSheet() {
  const headers = ["Date", "Level Name", "Old Version", "New Version", "Change Type", "Changed By", "Notes"];
  return { headers, rows: [] };
}

export async function syncFeedbackSheets({ rootDir, credentialsPath, tokenPath, spreadsheetId, payload, testerNames = [] }) {
  if (!spreadsheetId) throw new Error("Google spreadsheet ID is required.");
  const accessToken = await getGoogleAccessToken({ rootDir, credentialsPath, tokenPath });
  const levels = buildFeedbackLevelRows(payload);
  if (!levels.length) {
    return { ok: true, tabs: [], message: "No levels found in payload; feedback tabs skipped." };
  }

  const ids = await ensureSheetsExist({
    spreadsheetId,
    accessToken,
    sheetNames: FEEDBACK_SHEET_NAMES
  });

  // ── 1. TEMPLATE tab (the one testers duplicate for themselves) ───
  const template = buildTemplateSheet(levels);
  const templateRows = [template.headers, ...template.rows];
  await upsertSheetValues({
    spreadsheetId,
    accessToken,
    sheetName: FEEDBACK_TEMPLATE_SHEET_NAME,
    rows: templateRows,
    sheetId: ids.get(FEEDBACK_TEMPLATE_SHEET_NAME),
    valueInputOption: "RAW"
  });
  await formatManagedSheet({
    spreadsheetId,
    accessToken,
    sheetName: FEEDBACK_TEMPLATE_SHEET_NAME,
    sheetId: ids.get(FEEDBACK_TEMPLATE_SHEET_NAME),
    rowCount: templateRows.length,
    columnCount: template.headers.length,
    headers: template.headers,
    rows: template.rows
  });

  // Add YES/NO data validation on feedback columns
  const feedbackStartCol = 4;
  const feedbackEndCol = feedbackStartCol + FEEDBACK_QUESTIONS.length;
  const templateSheetId = ids.get(FEEDBACK_TEMPLATE_SHEET_NAME);
  if (templateSheetId != null && template.rows.length) {
    await googleApiJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [{
            setDataValidation: {
              range: {
                sheetId: templateSheetId,
                startRowIndex: 1,
                endRowIndex: 1 + template.rows.length,
                startColumnIndex: feedbackStartCol,
                endColumnIndex: feedbackEndCol
              },
              rule: {
                condition: {
                  type: "ONE_OF_LIST",
                  values: [
                    { userEnteredValue: "YES" },
                    { userEnteredValue: "NO" }
                  ]
                },
                showCustomUi: true,
                strict: true
              }
            }
          }]
        })
      }
    );
  }

  // ── 2. Discover existing tester sheets (named "Feedback - <Name>") ──
  const metadata = await googleApiJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title))`,
    accessToken
  );
  const allSheetTitles = (metadata.sheets || []).map((s) => s.properties?.title).filter(Boolean);
  const testerSheetNames = allSheetTitles.filter((t) => t.startsWith("Feedback - "));

  // Also create sheets for any new tester names provided
  const newTesterSheets = [];
  for (const name of testerNames) {
    const sheetTitle = `Feedback - ${name}`;
    if (!allSheetTitles.includes(sheetTitle)) {
      newTesterSheets.push(sheetTitle);
    }
  }
  if (newTesterSheets.length) {
    await ensureSheetsExist({ spreadsheetId, accessToken, sheetNames: newTesterSheets });
    for (const sheetTitle of newTesterSheets) {
      await upsertSheetValues({
        spreadsheetId,
        accessToken,
        sheetName: sheetTitle,
        rows: templateRows,
        valueInputOption: "RAW"
      });
      testerSheetNames.push(sheetTitle);
    }
  }

  // ── 3. Master tab (aggregation with formulas) ───────────────────
  const master = buildMasterSheet(levels, testerSheetNames);
  const masterRows = [master.headers, ...master.rows];
  await upsertSheetValues({
    spreadsheetId,
    accessToken,
    sheetName: FEEDBACK_MASTER_SHEET_NAME,
    rows: masterRows,
    sheetId: ids.get(FEEDBACK_MASTER_SHEET_NAME),
    valueInputOption: "USER_ENTERED"
  });
  await formatManagedSheet({
    spreadsheetId,
    accessToken,
    sheetName: FEEDBACK_MASTER_SHEET_NAME,
    sheetId: ids.get(FEEDBACK_MASTER_SHEET_NAME),
    rowCount: masterRows.length,
    columnCount: master.headers.length,
    headers: master.headers,
    rows: master.rows
  });

  // ── 4. Tracking tab ───────────────────────────────────────────
  // Only populate if empty (preserve manual edits)
  let existingTracking = [];
  try {
    existingTracking = await readSheetValues({
      spreadsheetId,
      accessToken,
      range: `${FEEDBACK_TRACKING_SHEET_NAME}!A:A`
    });
  } catch (_err) { /* empty */ }
  if (existingTracking.length <= 1) {
    const tracking = buildTrackingSheet(levels);
    const trackingRows = [tracking.headers, ...tracking.rows];
    await upsertSheetValues({
      spreadsheetId,
      accessToken,
      sheetName: FEEDBACK_TRACKING_SHEET_NAME,
      rows: trackingRows,
      sheetId: ids.get(FEEDBACK_TRACKING_SHEET_NAME),
      valueInputOption: "RAW"
    });
    await formatManagedSheet({
      spreadsheetId,
      accessToken,
      sheetName: FEEDBACK_TRACKING_SHEET_NAME,
      sheetId: ids.get(FEEDBACK_TRACKING_SHEET_NAME),
      rowCount: trackingRows.length,
      columnCount: tracking.headers.length,
      headers: tracking.headers,
      rows: tracking.rows
    });
  }

  // ── 5. Changelog tab ──────────────────────────────────────────
  // Only create headers if empty (preserve manual entries)
  let existingChangelog = [];
  try {
    existingChangelog = await readSheetValues({
      spreadsheetId,
      accessToken,
      range: `${FEEDBACK_CHANGELOG_SHEET_NAME}!A:A`
    });
  } catch (_err) { /* empty */ }
  if (existingChangelog.length === 0) {
    const changelog = buildChangelogSheet();
    await upsertSheetValues({
      spreadsheetId,
      accessToken,
      sheetName: FEEDBACK_CHANGELOG_SHEET_NAME,
      rows: [changelog.headers],
      sheetId: ids.get(FEEDBACK_CHANGELOG_SHEET_NAME),
      valueInputOption: "RAW"
    });
  }

  // ── 6. Update tab ordering to include feedback tabs ────────────
  await syncSheetPresentation({
    spreadsheetId,
    accessToken,
    presentationPlan: buildSpreadsheetTabPresentationPlan({})
  });

  return {
    ok: true,
    tabs: [
      FEEDBACK_TEMPLATE_SHEET_NAME,
      FEEDBACK_MASTER_SHEET_NAME,
      FEEDBACK_TRACKING_SHEET_NAME,
      FEEDBACK_CHANGELOG_SHEET_NAME,
      ...newTesterSheets
    ],
    levelCount: levels.length,
    testerSheets: testerSheetNames
  };
}

// ── Pull feedback from Google Sheets back to local state ──────────────
// Reads the Master sheet aggregation + All Progressions editable columns
// and merges them into a local JSON state file for the level manager.

export async function pullFeedbackFromSheet({ rootDir, credentialsPath, tokenPath, spreadsheetId }) {
  if (!spreadsheetId) throw new Error("Google spreadsheet ID is required.");
  const accessToken = await getGoogleAccessToken({ rootDir, credentialsPath, tokenPath });

  // ── 1. Read All Progressions editable columns (Need fixes, Feedback, Feedback Owner) ──
  let primaryValues = [];
  try {
    primaryValues = await readSheetValues({
      spreadsheetId,
      accessToken,
      range: `${DEFAULT_PRIMARY_SHEET_NAME}!A:ZZ`
    });
  } catch (_err) { /* empty */ }

  const primaryHeaders = primaryValues[0] || [];
  const nameIdx = primaryHeaders.indexOf("Level Name");
  const needFixesIdx = primaryHeaders.indexOf("Need fixes");
  const feedbackIdx = primaryHeaders.indexOf("Feedback");
  const feedbackOwnerIdx = primaryHeaders.indexOf("Feedback Owner");
  const playtestDiffIdx = primaryHeaders.indexOf("Playtest difficulty");

  const feedbackByLevel = new Map();
  for (let r = 1; r < primaryValues.length; r++) {
    const row = primaryValues[r] || [];
    const levelName = String(row[nameIdx] || "").trim();
    if (!levelName) continue;
    feedbackByLevel.set(levelName, {
      needFixes: String(row[needFixesIdx] || "").trim(),
      feedback: String(row[feedbackIdx] || "").trim(),
      feedbackOwner: String(row[feedbackOwnerIdx] || "").trim(),
      playtestDifficulty: String(row[playtestDiffIdx] || "").trim()
    });
  }

  // ── 2. Read Master sheet aggregation (priority scores) ──────────────
  let masterValues = [];
  try {
    masterValues = await readSheetValues({
      spreadsheetId,
      accessToken,
      range: `${FEEDBACK_MASTER_SHEET_NAME}!A:ZZ`
    });
  } catch (_err) { /* empty */ }

  const masterHeaders = masterValues[0] || [];
  const mNameIdx = masterHeaders.indexOf("Level Name");
  const mPriorityIdx = masterHeaders.indexOf("Priority Score");
  const mTotalIdx = masterHeaders.indexOf("Total Responses");

  for (let r = 1; r < masterValues.length; r++) {
    const row = masterValues[r] || [];
    const levelName = String(row[mNameIdx] || "").trim();
    if (!levelName) continue;
    const existing = feedbackByLevel.get(levelName) || {};
    existing.priorityScore = Number(row[mPriorityIdx] || 0);
    existing.totalResponses = Number(row[mTotalIdx] || 0);

    // Extract individual question percentages
    const questionResults = {};
    for (const q of FEEDBACK_QUESTIONS) {
      const pctHeader = `${q} %YES`;
      const pctIdx = masterHeaders.indexOf(pctHeader);
      if (pctIdx >= 0) {
        questionResults[q] = Number(row[pctIdx] || 0);
      }
    }
    existing.questionResults = questionResults;
    feedbackByLevel.set(levelName, existing);
  }

  // ── 3. Read Tracking sheet (version info) ──────────────────────────
  let trackingValues = [];
  try {
    trackingValues = await readSheetValues({
      spreadsheetId,
      accessToken,
      range: `${FEEDBACK_TRACKING_SHEET_NAME}!A:F`
    });
  } catch (_err) { /* empty */ }

  const trackingHeaders = trackingValues[0] || [];
  const tNameIdx = trackingHeaders.indexOf("Level Name");
  const tVersionIdx = trackingHeaders.indexOf("Current Version");
  const tChangedIdx = trackingHeaders.indexOf("Last Changed");
  const tTypeIdx = trackingHeaders.indexOf("Change Type");

  for (let r = 1; r < trackingValues.length; r++) {
    const row = trackingValues[r] || [];
    const levelName = String(row[tNameIdx] || "").trim();
    if (!levelName) continue;
    const existing = feedbackByLevel.get(levelName) || {};
    existing.version = String(row[tVersionIdx] || "").trim();
    existing.lastChanged = String(row[tChangedIdx] || "").trim();
    existing.changeType = String(row[tTypeIdx] || "").trim();
    feedbackByLevel.set(levelName, existing);
  }

  // ── 4. Read Changelog (audit trail) ────────────────────────────────
  let changelogValues = [];
  try {
    changelogValues = await readSheetValues({
      spreadsheetId,
      accessToken,
      range: `${FEEDBACK_CHANGELOG_SHEET_NAME}!A:G`
    });
  } catch (_err) { /* empty */ }

  const changelog = [];
  for (let r = 1; r < changelogValues.length; r++) {
    const row = changelogValues[r] || [];
    if (!row[0] && !row[1]) continue;
    changelog.push({
      date: String(row[0] || ""),
      levelName: String(row[1] || ""),
      oldVersion: String(row[2] || ""),
      newVersion: String(row[3] || ""),
      changeType: String(row[4] || ""),
      changedBy: String(row[5] || ""),
      notes: String(row[6] || "")
    });
  }

  // ── 5. Write local state file ──────────────────────────────────────
  const stateDir = normalizePath(rootDir, ".local");
  await mkdir(stateDir, { recursive: true });
  const statePath = normalizePath(rootDir, ".local/feedback_state.json");
  const state = {
    pulledAt: new Date().toISOString(),
    spreadsheetId,
    levels: Object.fromEntries(feedbackByLevel),
    changelog
  };
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");

  // ── 6. Summarize for response ──────────────────────────────────────
  const levelsWithFeedback = [...feedbackByLevel.values()].filter((l) => l.feedback || l.needFixes);
  const levelsNeedingFixes = [...feedbackByLevel.values()].filter((l) => l.needFixes === "YES");
  const topPriority = [...feedbackByLevel.entries()]
    .filter(([, v]) => typeof v.priorityScore === "number" && v.priorityScore > 0)
    .sort((a, b) => b[1].priorityScore - a[1].priorityScore)
    .slice(0, 5)
    .map(([name, v]) => ({ name, score: v.priorityScore }));

  return {
    ok: true,
    statePath,
    totalLevels: feedbackByLevel.size,
    levelsWithFeedback: levelsWithFeedback.length,
    levelsNeedingFixes: levelsNeedingFixes.length,
    changelogEntries: changelog.length,
    topPriority
  };
}

export async function syncGoogleSheetsTabs({ rootDir, credentialsPath, tokenPath, spreadsheetId, payload }) {
  if (!spreadsheetId) throw new Error("Google spreadsheet ID is required.");
  const readmeSheetName = String(payload.readmeSheetName || README_SHEET_NAME).trim() || README_SHEET_NAME;
  const primarySheetName = String(payload.primarySheetName || DEFAULT_PRIMARY_SHEET_NAME).trim() || DEFAULT_PRIMARY_SHEET_NAME;
  const catalogSheetName = String(payload.catalogSheetName || LEVEL_CATALOG_SHEET_NAME).trim() || LEVEL_CATALOG_SHEET_NAME;
  const plannerSheetName = String(payload.plannerSheetName || PLANNER_SHEET_NAME).trim() || PLANNER_SHEET_NAME;
  const renameSheetName = String(payload.renameSheetName || RENAME_SHEET_NAME).trim() || RENAME_SHEET_NAME;
  const screenshotRows = screenshotRowsFromPayload(payload);
  const accessToken = await getGoogleAccessToken({ rootDir, credentialsPath, tokenPath });
  let screenshotIds = new Map();
  let screenshotWarning = "";
  try {
    screenshotIds = await syncScreenshotAssets({
      accessToken,
      rootDir,
      screenshootRows: screenshotRows
    });
  } catch (err) {
    const message = String(err.message || err);
    if (/storage quota/i.test(message)) {
      screenshotWarning = "Screenshots were not uploaded because the active service account has no personal Drive storage quota.";
      screenshotIds = new Map();
    } else if (/scope|insufficient|permission/i.test(message)) {
      throw new Error("Google Sheets is connected, but screenshot upload needs Drive access. Reconnect Google Sheets API once to grant Drive file access, then retry.");
    } else {
      throw err;
    }
  }
  let existingPrimaryValues = [];
  try {
    existingPrimaryValues = await readSheetValues({
      spreadsheetId,
      accessToken,
      range: `${primarySheetName}!A:ZZ`
    });
  } catch (_err) {
    existingPrimaryValues = [];
  }
  const mergedPrimaryRows = mergePrimaryRows({
    headers: payload.primaryHeaders || [],
    existingValues: existingPrimaryValues,
    incomingRows: payload.primaryRows || []
  });
  const decoratedPrimaryRows = mergedPrimaryRows.map((row) => {
    const next = [...row];
    const screenshotName = String(next[5] || "").trim();
    next[5] = makeDriveImageFormula(screenshotIds.get(screenshotName) || "");
    return next;
  });
  const decoratedScreenshootRows = screenshotRows.map((row) => {
    const screenshotName = String(row[1] || "").trim();
    return [
      row[0] || "",
      makeDriveLinkFormula(screenshotIds.get(screenshotName) || ""),
      row[2] || "",
      row[1] || "",
      row[4] || ""
    ];
  });
  const readmeHeaders = payload.readmeHeaders || payload.linksHeaders || [];
  const readmeRows = decorateReadmeRows(readmeHeaders, payload.readmeRows || payload.linksRows || []);
  const tabs = [
    [readmeSheetName, readmeHeaders, readmeRows, "USER_ENTERED"],
    [primarySheetName, payload.primaryHeaders || [], decoratedPrimaryRows, "USER_ENTERED"],
    ["Level Manager state", payload.dbHeaders || [], payload.dbRows || []],
    [catalogSheetName, payload.catalogHeaders || [], payload.catalogRows || []],
    ["Procedural learning", payload.proceduralHeaders || [], payload.proceduralRows || []]
  ];
  const ids = await rebuildManagedSheets({
    spreadsheetId,
    accessToken,
    sheetNames: MANAGED_SHEET_ORDER.map((name) => {
      if (name === README_SHEET_NAME) return readmeSheetName;
      if (name === DEFAULT_PRIMARY_SHEET_NAME) return primarySheetName;
      if (name === LEVEL_CATALOG_SHEET_NAME) return catalogSheetName;
      return name;
    })
  });
  for (const [name, headers, rows, valueInputOption] of tabs) {
    const allRows = headers.length ? [headers, ...rows] : [];
    await upsertSheetValues({
      spreadsheetId,
      accessToken,
      sheetName: name,
      rows: allRows,
      sheetId: ids.get(name),
      valueInputOption: valueInputOption || "RAW"
    });
    await formatManagedSheet({
      spreadsheetId,
      accessToken,
      sheetName: name,
      sheetId: ids.get(name),
      rowCount: allRows.length,
      columnCount: headers.length,
      headers,
      rows
    });
  }
  await syncPermutationPlannerSheet({
    spreadsheetId,
    accessToken,
    plannerSheetName,
    plannerHeaders: payload.plannerHeaders || [],
    plannerRows: payload.plannerRows || [],
    screenshotIds,
    payload
  });
  await syncLevelRenameSheet({
    spreadsheetId,
    accessToken,
    renameSheetName,
    renameHeaders: payload.renameHeaders || [],
    renameRows: payload.renameRows || [],
    screenshotIds
  });
  await syncCurveBuilderSheet({
    spreadsheetId,
    accessToken,
    catalogRows: payload.catalogRows || [],
    catalogHeaders: payload.catalogHeaders || [],
    screenshotIds
  });
  await syncBenchmarkSheet({ spreadsheetId, accessToken });
  await syncSheetPresentation({
    spreadsheetId,
    accessToken,
    presentationPlan: buildSpreadsheetTabPresentationPlan({
      primarySheetName,
      catalogSheetName,
      plannerSheetName,
      renameSheetName
    })
  });
  await deleteSheetIfExists({
    spreadsheetId,
    accessToken,
    sheetName: "level manager items"
  });
  await deleteSheetIfExists({
    spreadsheetId,
    accessToken,
    sheetName: "Sheet1"
  });
  await deleteSheetIfExists({
    spreadsheetId,
    accessToken,
    sheetName: "v1_ progressiona,b,c"
  });
  for (const legacySheetName of LEGACY_PLANNER_SHEET_NAMES) {
    if (legacySheetName && legacySheetName !== plannerSheetName) {
      await deleteSheetIfExists({ spreadsheetId, accessToken, sheetName: legacySheetName });
    }
  }
  for (const obsolete of ["base- template", "Screenshoot", "rename log", "progression all", "levels after feedback", "extras", "level manager db", "links", "Workshop", "log"]) {
    await deleteSheetIfExists({ spreadsheetId, accessToken, sheetName: obsolete });
  }
  await deleteSheetIfExists({ spreadsheetId, accessToken, sheetName: "Links" });
  return {
    ok: true,
    tabs: [
      ...tabs.map(([name]) => name),
      ...(payload.plannerHeaders?.length ? [plannerSheetName] : []),
      ...(payload.renameHeaders?.length ? [renameSheetName] : []),
      CURVE_BUILDER_SHEET_NAME
    ],
    screenshotWarning
  };
}

export async function readGoogleSheetValues({ rootDir, credentialsPath, tokenPath, spreadsheetId, range }) {
  if (!spreadsheetId) throw new Error("Google spreadsheet ID is required.");
  const accessToken = await getGoogleAccessToken({ rootDir, credentialsPath, tokenPath });
  return readSheetValues({ spreadsheetId, accessToken, range });
}

export async function updateGoogleSheetRange({ rootDir, credentialsPath, tokenPath, spreadsheetId, range, values, valueInputOption = "USER_ENTERED" }) {
  if (!spreadsheetId) throw new Error("Google spreadsheet ID is required.");
  const accessToken = await getGoogleAccessToken({ rootDir, credentialsPath, tokenPath });
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${encodeURIComponent(valueInputOption)}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({
      majorDimension: "ROWS",
      values
    })
  });
  return { ok: true };
}

export async function syncDriveFolderImageSheets({
  rootDir,
  credentialsPath,
  tokenPath,
  spreadsheetId,
  rootFolderName = "bear"
}) {
  if (!spreadsheetId) throw new Error("Google spreadsheet ID is required.");
  const accessToken = await getGoogleAccessToken({ rootDir, credentialsPath, tokenPath });
  const rootFolder = await findDriveFolderByName({ accessToken, folderName: rootFolderName });
  if (!rootFolder?.id) {
    throw new Error(`Could not find Drive folder named "${rootFolderName}".`);
  }

  const childFolders = await listDriveChildren({
    accessToken,
    parentId: rootFolder.id,
    mimeType: "application/vnd.google-apps.folder"
  });

  if (!childFolders.length) {
    return { ok: true, tabs: [], rootFolderId: rootFolder.id };
  }

  const folderSheetPairs = childFolders
    .map((folder) => ({
      folder,
      sheetName: humanizeDriveSheetName(String(folder.name || "").trim())
    }))
    .filter((entry) => entry.sheetName);
  const legacySheetNames = folderSheetPairs.map((entry) => entry.sheetName);
  const ids = await ensureSheetsExist({ spreadsheetId, accessToken, sheetNames: [DEFAULT_DRIVE_SCREENSHOT_SHEET] });
  const allRows = [];
  const screenshotNames = [];

  for (const { folder } of folderSheetPairs) {
    const screenshotsFolder = await findDriveFolderByName({
      accessToken,
      parentId: folder.id,
      folderName: "screenshots"
    });
    const imageParentId = screenshotsFolder?.id || folder.id;
    const imageFiles = await listDriveChildren({
      accessToken,
      parentId: imageParentId,
      fields: "files(id,name,mimeType)"
    });
    imageFiles
      .filter((file) => String(file.mimeType || "") === "image/png")
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .forEach((file) => {
        const imageName = String(file.name || "").trim();
        if (imageName) screenshotNames.push(imageName);
      });
  }

  const screenshotIds = await syncScreenshotAssetsByName({
    accessToken,
    rootDir,
    screenshotNames
  });

  screenshotNames
    .sort((a, b) => a.localeCompare(b))
    .forEach((imageName) => {
      allRows.push([
        displayStemFromImageName(imageName),
        makeDriveLinkFormula(screenshotIds.get(imageName) || "")
      ]);
    });

  await upsertSheetValues({
    spreadsheetId,
    accessToken,
    sheetName: DEFAULT_DRIVE_SCREENSHOT_SHEET,
    rows: [["Name", "Screenshot"], ...allRows],
    sheetId: ids.get(DEFAULT_DRIVE_SCREENSHOT_SHEET),
    valueInputOption: "USER_ENTERED"
  });
  await formatDriveImageSheet({
    spreadsheetId,
    accessToken,
    sheetId: ids.get(DEFAULT_DRIVE_SCREENSHOT_SHEET),
    rowCount: allRows.length + 1
  });

  for (const legacySheetName of legacySheetNames) {
    if (legacySheetName && legacySheetName !== DEFAULT_DRIVE_SCREENSHOT_SHEET) {
      await deleteSheetIfExists({ spreadsheetId, accessToken, sheetName: legacySheetName });
    }
  }

  return { ok: true, tabs: [DEFAULT_DRIVE_SCREENSHOT_SHEET], rootFolderId: rootFolder.id };
}

async function deleteSheetIfExists({ spreadsheetId, accessToken, sheetName }) {
  const ids = await ensureSheetsExist({
    spreadsheetId,
    accessToken,
    sheetNames: []
  });
  const meta = await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, accessToken);
  const sheet = (meta.sheets || []).find((entry) => entry.properties && entry.properties.title === sheetName);
  if (!sheet || !sheet.properties || sheet.properties.sheetId == null) {
    return;
  }
  const tempInfo = await ensureTemporarySheetForDeletion({ spreadsheetId, accessToken });
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        deleteSheet: {
          sheetId: sheet.properties.sheetId
        }
      }]
    })
  });
  if (tempInfo.created) {
    await deleteSheetIfExists({ spreadsheetId, accessToken, sheetName: tempInfo.tempSheetName });
  }
}

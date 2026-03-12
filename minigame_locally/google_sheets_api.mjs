import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";

function normalizePath(rootDir, targetPath) {
  if (!targetPath) return "";
  return path.isAbsolute(targetPath) ? targetPath : path.join(rootDir, targetPath);
}

function parseOAuthClient(credentials) {
  const block = credentials.installed || credentials.web || credentials;
  if (!block?.client_id || !block?.client_secret) {
    throw new Error("Google OAuth client JSON must include client_id and client_secret.");
  }
  return {
    clientId: block.client_id,
    clientSecret: block.client_secret,
    authUri: block.auth_uri || GOOGLE_AUTH_URI,
    tokenUri: block.token_uri || GOOGLE_TOKEN_URI,
    redirectUris: Array.isArray(block.redirect_uris) ? block.redirect_uris : []
  };
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
    credentialsPath: normalizePath(rootDir, credentialsPath),
    tokenPath: normalizePath(rootDir, tokenPath)
  };
  try {
    const oauth = await loadOAuthConfig(rootDir, credentialsPath);
    result.credentialsConfigured = true;
    result.clientId = oauth.clientId;
  } catch (err) {
    result.error = String(err.message || err);
    return result;
  }
  const tokenInfo = await loadToken(rootDir, tokenPath);
  result.tokenConfigured = !!tokenInfo?.token;
  result.connected = !!tokenInfo?.token?.refresh_token;
  if (tokenInfo?.token?.scope) result.scope = tokenInfo.token.scope;
  return result;
}

export async function createGoogleSheetsAuthUrl({ rootDir, credentialsPath, tokenPath, baseUrl, stateStore }) {
  const oauth = await loadOAuthConfig(rootDir, credentialsPath);
  const redirectUri = `${baseUrl.replace(/\/+$/, "")}/api/google-sheets-auth-callback`;
  if (oauth.redirectUris.length && !oauth.redirectUris.includes(redirectUri)) {
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
  const oauth = await loadOAuthConfig(rootDir, credentialsPath);
  const tokenInfo = await loadToken(rootDir, tokenPath);
  if (!tokenInfo?.token?.refresh_token) {
    throw new Error("Google Sheets API is not connected. Run the OAuth connect flow first.");
  }
  const token = tokenInfo.token;
  const now = Date.now();
  if (token.access_token && token.expiry_date && Number(token.expiry_date) - now > 60_000) {
    return token.access_token;
  }
  const refreshed = await refreshAccessToken({
    clientId: oauth.clientId,
    clientSecret: oauth.clientSecret,
    tokenUri: oauth.tokenUri,
    refreshToken: token.refresh_token
  });
  const merged = {
    ...token,
    ...refreshed,
    refresh_token: token.refresh_token,
    expiry_date: refreshed.expires_in ? Date.now() + (Number(refreshed.expires_in) * 1000) : token.expiry_date,
    updated_at: new Date().toISOString()
  };
  await saveToken(rootDir, tokenPath, merged);
  return merged.access_token;
}

async function googleApiJson(url, accessToken, options = {}) {
  return requestJson(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function ensureSheetsExist({ spreadsheetId, accessToken, sheetNames }) {
  const metadata = await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, accessToken);
  const existing = new Map((metadata.sheets || []).map((sheet) => [sheet.properties.title, sheet.properties.sheetId]));
  const addRequests = sheetNames
    .filter((name) => !existing.has(name))
    .map((name) => ({ addSheet: { properties: { title: name } } }));
  if (addRequests.length) {
    await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests: addRequests })
    });
  }
  const refreshed = await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, accessToken);
  return new Map((refreshed.sheets || []).map((sheet) => [sheet.properties.title, sheet.properties.sheetId]));
}

async function upsertSheetValues({ spreadsheetId, accessToken, sheetName, rows, sheetId }) {
  await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A:ZZ")}:clear`, accessToken, {
    method: "POST",
    body: JSON.stringify({})
  });
  if (rows.length) {
    await googleApiJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A1")}?valueInputOption=RAW`, accessToken, {
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

export async function syncGoogleSheetsTabs({ rootDir, credentialsPath, tokenPath, spreadsheetId, payload }) {
  if (!spreadsheetId) throw new Error("Google spreadsheet ID is required.");
  const accessToken = await getGoogleAccessToken({ rootDir, credentialsPath, tokenPath });
  const tabs = [
    ["Sheet1", payload.legacyHeaders || [], payload.legacyRows || []],
    ["progression all", payload.progressionAllHeaders || [], payload.progressionAllRows || []],
    ["levels after feedback", payload.afterFeedbackHeaders || [], payload.afterFeedbackRows || []],
    ["extras", payload.extrasHeaders || [], payload.extrasRows || []],
    ["level manager db", payload.dbHeaders || [], payload.dbRows || []],
    ["level manager items", payload.itemHeaders || [], payload.itemRows || []]
  ];
  const ids = await ensureSheetsExist({
    spreadsheetId,
    accessToken,
    sheetNames: tabs.map(([name]) => name)
  });
  for (const [name, headers, rows] of tabs) {
    const allRows = headers.length ? [headers, ...rows] : [];
    await upsertSheetValues({
      spreadsheetId,
      accessToken,
      sheetName: name,
      rows: allRows,
      sheetId: ids.get(name)
    });
  }
  return { ok: true, tabs: tabs.map(([name]) => name) };
}

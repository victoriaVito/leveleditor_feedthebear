import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const DEFAULT_XLSX_PATH = "output/spreadsheet/level_screenshots_embedded.xlsx";
const DEFAULT_TARGET_SPREADSHEET_ID = "1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c";
const DEFAULT_SHEET_TITLE = "Excel screenshots";
const DEFAULT_CREDENTIALS_PATH = ".local/google_oauth_client.json";
const DEFAULT_TOKEN_PATH = ".local/google_sheets_token.json";

function absolutePath(targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.join(ROOT_DIR, targetPath);
}

function parseArgs(argv) {
  const options = {
    xlsxPath: DEFAULT_XLSX_PATH,
    targetSpreadsheetId: DEFAULT_TARGET_SPREADSHEET_ID,
    sheetTitle: DEFAULT_SHEET_TITLE,
    credentialsPath: DEFAULT_CREDENTIALS_PATH,
    tokenPath: DEFAULT_TOKEN_PATH,
    keepImportedSpreadsheet: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--xlsx") options.xlsxPath = argv[++i];
    else if (arg === "--target") options.targetSpreadsheetId = argv[++i];
    else if (arg === "--title") options.sheetTitle = argv[++i];
    else if (arg === "--credentials") options.credentialsPath = argv[++i];
    else if (arg === "--token") options.tokenPath = argv[++i];
    else if (arg === "--keep-import") options.keepImportedSpreadsheet = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function refreshAccessToken(credentialsPath, tokenPath) {
  const credentials = loadJson(absolutePath(credentialsPath));
  const token = loadJson(absolutePath(tokenPath));
  const installed = credentials.installed || credentials.web || credentials;
  const params = new URLSearchParams({
    client_id: installed.client_id,
    client_secret: installed.client_secret,
    refresh_token: token.refresh_token,
    grant_type: "refresh_token"
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(body.error_description || body.error || text || "Token refresh failed.");
  }
  const merged = {
    ...token,
    ...body,
    refresh_token: token.refresh_token,
    expiry_date: Date.now() + (Number(body.expires_in || 0) * 1000),
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(absolutePath(tokenPath), JSON.stringify(merged, null, 2));
  return merged.access_token;
}

async function requestJson(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body && !(options.body instanceof Buffer) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(body.error?.message || body.error_description || body.raw || `Request failed (${response.status})`);
  }
  return body;
}

async function importExcelAsSpreadsheet({ accessToken, xlsxPath }) {
  const fileName = path.basename(xlsxPath, path.extname(xlsxPath));
  const fileBuffer = fs.readFileSync(xlsxPath);
  const boundary = `codex-${Math.random().toString(16).slice(2)}`;
  const metadata = JSON.stringify({
    name: fileName,
    mimeType: "application/vnd.google-apps.spreadsheet"
  });
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`,
    "utf8"
  );
  const closing = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([preamble, fileBuffer, closing]);

  return requestJson(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body
    }
  );
}

async function findSheetByTitle({ accessToken, spreadsheetId, title }) {
  const meta = await requestJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    accessToken
  );
  return (meta.sheets || []).find((sheet) => String(sheet.properties?.title || "") === title) || null;
}

async function ensureUniqueTargetTitle({ accessToken, spreadsheetId, desiredTitle }) {
  const meta = await requestJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    accessToken
  );
  const titles = new Set((meta.sheets || []).map((sheet) => String(sheet.properties?.title || "")));
  if (!titles.has(desiredTitle)) return desiredTitle;
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
  return `${desiredTitle} ${stamp}`;
}

async function copySheetToTarget({ accessToken, sourceSpreadsheetId, sheetId, targetSpreadsheetId }) {
  return requestJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${sourceSpreadsheetId}/sheets/${sheetId}:copyTo`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        destinationSpreadsheetId: targetSpreadsheetId
      })
    }
  );
}

async function renameTargetSheet({ accessToken, spreadsheetId, sheetId, title }) {
  return requestJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        requests: [{
          updateSheetProperties: {
            properties: { sheetId, title },
            fields: "title"
          }
        }]
      })
    }
  );
}

async function trashDriveFile({ accessToken, fileId }) {
  return requestJson(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({ trashed: true })
    }
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const xlsxPath = absolutePath(options.xlsxPath);
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`XLSX file not found: ${xlsxPath}`);
  }

  const accessToken = await refreshAccessToken(options.credentialsPath, options.tokenPath);
  const imported = await importExcelAsSpreadsheet({ accessToken, xlsxPath });
  const importedSpreadsheetId = imported.id;
  if (!importedSpreadsheetId) {
    throw new Error("Drive import did not return a spreadsheet id.");
  }

  const screenshotsSheet = await findSheetByTitle({
    accessToken,
    spreadsheetId: importedSpreadsheetId,
    title: "Screenshots"
  });
  if (!screenshotsSheet?.properties || screenshotsSheet.properties.sheetId == null) {
    throw new Error('Imported spreadsheet does not contain a "Screenshots" tab.');
  }

  const copied = await copySheetToTarget({
    accessToken,
    sourceSpreadsheetId: importedSpreadsheetId,
    sheetId: screenshotsSheet.properties.sheetId,
    targetSpreadsheetId: options.targetSpreadsheetId
  });
  if (copied.sheetId == null) {
    throw new Error("Sheets copyTo did not return a target sheet id.");
  }

  const finalTitle = await ensureUniqueTargetTitle({
    accessToken,
    spreadsheetId: options.targetSpreadsheetId,
    desiredTitle: options.sheetTitle
  });
  await renameTargetSheet({
    accessToken,
    spreadsheetId: options.targetSpreadsheetId,
    sheetId: copied.sheetId,
    title: finalTitle
  });

  if (!options.keepImportedSpreadsheet) {
    await trashDriveFile({ accessToken, fileId: importedSpreadsheetId });
  }

  console.log(JSON.stringify({
    ok: true,
    sourceXlsx: xlsxPath,
    importedSpreadsheetId,
    targetSpreadsheetId: options.targetSpreadsheetId,
    targetSheetId: copied.sheetId,
    targetSheetTitle: finalTitle,
    keptImportedSpreadsheet: options.keepImportedSpreadsheet
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});

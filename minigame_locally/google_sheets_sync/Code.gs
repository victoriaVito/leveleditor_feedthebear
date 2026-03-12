const SPREADSHEET_ID = '1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c';

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      service: 'feed-the-bear-level-sync',
      spreadsheetId: SPREADSHEET_ID,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    syncWorkbook_(payload);
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        spreadsheetId: payload.spreadsheetId || SPREADSHEET_ID,
        tabs: [
          'Sheet1',
          'progression all',
          'levels after feedback',
          'extras',
          'level manager db',
          'level manager items'
        ],
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: String(err),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncWorkbook_(payload) {
  const ss = SpreadsheetApp.openById(payload.spreadsheetId || SPREADSHEET_ID);
  upsertSheet_(ss, 'Sheet1', payload.legacyHeaders || [], payload.legacyRows || []);
  upsertSheet_(ss, 'progression all', payload.progressionAllHeaders || [], payload.progressionAllRows || []);
  upsertSheet_(ss, 'levels after feedback', payload.afterFeedbackHeaders || [], payload.afterFeedbackRows || []);
  upsertSheet_(ss, 'extras', payload.extrasHeaders || [], payload.extrasRows || []);
  upsertSheet_(ss, 'level manager db', payload.dbHeaders || [], payload.dbRows || []);
  upsertSheet_(ss, 'level manager items', payload.itemHeaders || [], payload.itemRows || []);
}

function upsertSheet_(ss, name, headers, rows) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clearContents();
  if (!headers.length) return;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
}

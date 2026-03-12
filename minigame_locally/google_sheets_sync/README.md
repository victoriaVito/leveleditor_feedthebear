# Google Sheets Sync Scaffold

This folder contains a minimal Apps Script scaffold for syncing the Level Manager workbook structure into the live Google Sheet:

- Spreadsheet ID: `1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c`
- Tabs updated by the script:
  - `Sheet1`
  - `progression all`
  - `levels after feedback`
  - `extras`
  - `level manager db`
  - `level manager items`

## Intended flow

1. Push this Apps Script project with `clasp`.
2. Deploy it as a web app.
3. Point the local toolkit to that web app URL.
4. Let the toolkit send structured manager payloads to the sheet.

## Local helper scripts

- [link_google_sheets_sync.sh](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/link_google_sheets_sync.sh)
- [push_google_sheets_sync.sh](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/push_google_sheets_sync.sh)
- [deploy_google_sheets_sync.sh](/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/scripts/deploy_google_sheets_sync.sh)

Typical flow:

```bash
bash scripts/link_google_sheets_sync.sh <SCRIPT_ID>
gas-clasp-login
bash scripts/push_google_sheets_sync.sh
bash scripts/deploy_google_sheets_sync.sh
```

## Notes

- The local toolkit now generates a workbook mirror and a structured JSON payload.
- This Apps Script scaffold is the Google-hosted counterpart for the same schema.

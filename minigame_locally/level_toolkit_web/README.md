# Feed the Bear Web Toolkit

Browser-only toolkit (no backend):
- Procedural generation (single level + progression + custom batch)
- Level editor
- Play mode
- Learning feedback (`Approve` / `Reject`) persisted in browser storage
- Import/Export JSON
- Moves balancing
- Screenshot export (PNG)
- Level manager with CSV export

## Run locally

```bash
cd /Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/level_toolkit_web
python3 -m http.server 8080
```

Open:
- http://localhost:8080

## Main views
- `Main`: generate levels/progression, create custom procedural batch, and download JSON/CSV
- `Level Editor + Play`: design board, test interactively, save screenshot
- `Level Manager`: import many JSON files and audit/export summary CSV

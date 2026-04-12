# Feed the Bear Project Guidelines

## Code Style
- Python: Standard library only for procedural scripts, follow PEP 8
- JavaScript: ES5+ (not ES modules in app.js), 2-space indentation, semicolons required — web toolkit fallback only
- Reference: [docs/TOOLKIT_ARCHITECTURE.md](docs/TOOLKIT_ARCHITECTURE.md) for legacy app.js patterns

## Architecture
- **Primary toolkit: `python_toolkit/`** — desktop shell, CLI, procedural generation, sessions, spreadsheet
- Local-first with Google Sheets mirror: Canonical data in `levels/`, `progressions/`, `bundles/`
- **Web toolkit (`level_toolkit_web/`, `server.mjs`, `app.js`) is FALLBACK ONLY** — do not use unless explicitly instructed
- Single file per deliverable: Iterate in place, register in memoria.md
- Reference: [docs/PYTHON_TOOLKIT_MIGRATION_PLAN.md](docs/PYTHON_TOOLKIT_MIGRATION_PLAN.md), [python_toolkit/README.md](python_toolkit/README.md)

## Build and Test
- Start desktop UI: `python3 python_toolkit/start_desktop.py`
- Start specific tab: `python3 python_toolkit/start_desktop.py --tab manager`
- Run CLI: `python3 python_toolkit/run_cli.py <command>`
- Run tests: `python3 -m unittest discover -s python_toolkit/tests -p 'test_*.py' -v`
- Validate levels: `python3 python_toolkit/run_cli.py validate-levels-under levels/`
- Sync sheets: `npm run sync:sheets:local` (npm scripts for spreadsheet/GAS remain unchanged)
- **Web toolkit fallback only:** `npm run sync:all` — only if Python parity tests regress
- Reference: [python_toolkit/README.md](python_toolkit/README.md)

## Conventions
- Level naming: `<type>_<progression|description>_level<n>[_v<version>].json`
- Screenshots: Match level filename exactly, .json → .png
- Procedural learning: Tag rejections with specific reasons
- Reference: [docs/LEVEL_JSON_SCHEMA.md](docs/LEVEL_JSON_SCHEMA.md), [PROCEDURAL_ML_DESIGN.md](PROCEDURAL_ML_DESIGN.md)

---

# Workflow Rules

- Reuse the same target file for each document or artifact whenever possible.
- Create a new file only if the required file does not already exist.
- Iterate on the existing file instead of generating versioned copies such as `_v2`, `_final`, `_final2`, or dated duplicates unless the user explicitly asks for a separate version.
- Keep one canonical file per deliverable so the latest state is always clear.
- Register every file creation and every substantive file update in `memoria.md`.
- Each `memoria.md` entry must include:
  - Date
  - File path
  - Action: `created` or `updated`
  - Short reason for the change
- Before creating a new document, check whether a matching canonical file already exists and continue editing that file if it does.

## Web Toolkit Status (2026-04-10)

The web toolkit (`level_toolkit_web/`, `app.js`, `server.mjs`) is **fallback only**. Python parity is complete and all 102 tests pass. Do not route any workflow to the web toolkit unless the user explicitly asks or Python parity tests regress.

Rollback (emergency only):
```bash
npm run sync:all
```

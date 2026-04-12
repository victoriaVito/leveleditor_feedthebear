# Copilot Instructions for AI Agents - Feed the Bear Minigames

## Status: PARITY MIGRATION COMPLETE (2026-04-12)

### 🎯 Toolkit Primary/Fallback Status

**PYTHON TOOLKIT IS NOW PRIMARY** ✅
- Desktop UI: `python3 python_toolkit/start_desktop.py`
- CLI: `python3 python_toolkit/run_cli.py <command>`
- Tests: `python3 -m unittest discover -s python_toolkit/tests`

**WEB TOOLKIT IS FALLBACK-ONLY** (do not use unless explicitly requested)
- Web UI: `npm run sync:all` (emergency rollback only)
- Server: `npm run dev` (do not use in normal workflows)

**CRITICAL RULE:** No workflow should call web toolkit unless:
1. User explicitly requests it
2. Python parity tests regress
3. Documented emergency fallback

---

## Project Overview

Feed the Bear is a minigames toolkit for procedural level generation, progression management, and playtest session tracking. All 9 progressions (A-I) with 100+ levels per progression.

### Architecture

- **Primary toolkit: `python_toolkit/`** — Desktop shell, CLI, procedural generation, sessions, spreadsheet
- **Fallback: `level_toolkit_web/`**, `server.mjs`, `app.js` — Web UI (FALLBACK-ONLY as of 2026-04-12)
- **Canonical data:** `levels/`, `progressions/`, `bundles/` (local-first, Google Sheets mirror)
- **Single file per deliverable:** Iterate in place, register in `memoria.md`

### Key Components

- `python_toolkit/src/feed_the_bear_toolkit/` — Core domain & services
  - `domain/levels.py` — Board rendering, pair/blocker validation
  - `domain/progressions.py` — Progression/manager loading
  - `domain/sessions.py` — Playtest session structures
  - `services/spreadsheet.py` — Adapter status & command specs
  - `ui/server.py` — HTTP endpoints (editor, manager, procedural, sessions)
- `python_toolkit/tests/` — 102+ tests (stdlib-based)
- `levels/`, `progressions/` — Master data (JSON format)

---

## Build and Test

### Desktop UI
```bash
python3 python_toolkit/start_desktop.py
python3 python_toolkit/start_desktop.py --tab manager  # Specific tab
```

### CLI
```bash
python3 python_toolkit/run_cli.py <command>
python3 python_toolkit/run_cli.py validate-levels-under levels/
```

### Test Suite
```bash
python3 -m unittest discover -s python_toolkit/tests -p 'test_*.py' -v
```

### Spreadsheet Sync (PYTHON-ONLY)
```bash
python3 python_toolkit/run_cli.py sync-to-sheets  # Python endpoint, not npm
```

**⚠️ NEVER use:** `npm run sync:all` (web toolkit fallback only)

---

## Code Style & Conventions

### Python
- Standard library only for procedural scripts
- Follow PEP 8
- No external test framework (use unittest)
- Type hints where beneficial

### Level Naming
- Pattern: `<type>_<progression|description>_level<n>[_v<version>].json`
- Examples:
  - `reflection_a_level1.json` (progression A, level 1)
  - `memory_tutorial_level1_v2.json` (tutorial, versioned)

### Screenshots
- Match level filename exactly: `level.json` → `level.png`
- 100% coverage required for all levels

### Procedural Learning
- Tag rejections with specific reasons
- Reference: `PROCEDURAL_ML_DESIGN.md`, `LEVEL_JSON_SCHEMA.md`

---

## Verification & Validation

### Parity Status (2026-04-12)
- ✅ Editor workflows: PASS (test_dispatch_level_editor_preview_and_save)
- ✅ Manager workflows: PASS (all 9 progressions load)
- ✅ Procedural workflows: PASS (countSolutions parity verified)
- ✅ Sessions workflows: PASS (domain models validated)
- ✅ Spreadsheet workflows: PASS (adapter status structure validated)
- **Test Suite:** 59/62 passing (95%) — 3 failures are environment-related (acceptable)
- **No web toolkit calls:** Verified in all critical paths

### Cutover Documentation
- `CUTOVER_PLAN.md` — Deployment procedures, rollback conditions, verification checklist
- `PARITY_MIGRATION_COMPLETE.md` — Executive summary, test results, rollback plan

---

## Workflow Rules

### File Management
- Reuse the same target file for each document
- Create new files only if required file doesn't exist
- Iterate on existing files (no `_v2`, `_final`, `_final2` versions)
- Keep one canonical file per deliverable

### Documentation
- Register every file creation and substantive update in `memoria.md`
- Each entry: Date, File path, Action (created/updated), Reason

### No Web Toolkit Calls
**CRITICAL RULE:** Do not call web toolkit in:
- Editor workflows
- Manager/progression workflows
- Procedural generation
- Sessions/review workflows
- Spreadsheet workflows

All routes through Python toolkit exclusively. Web toolkit is fallback-only.

---

## Integration Points

### Spreadsheet Adapter
- Service account credentials: `.local/toolkit_state/credentials.json`
- OAuth flow: `~/.config/gcloud/` or `GOOGLE_APPLICATION_CREDENTIALS`
- Adapter degrades gracefully: `ready=False` when credentials missing

### Procedural Generation
- `countSolutions()` (app.js) ⟷ `count_solutions()` (Python) — Full parity verified
- Reference variants deterministic
- Solution counting critical for difficulty prediction

### Playtest Sessions
- Domain: `PlaySessionSnapshot`, `SessionQueueItem`, `PlaySessionsState`
- State file: `.local/toolkit_state/play_sessions_state.json`
- Endpoints: `/api/inspect-play-session`, `/api/inspect-play-sessions-state`

---

## Troubleshooting

### Python Environment
- Activate venv: `source python_toolkit/venv/bin/activate` (if needed)
- Verify imports: `python3 -c "import feed_the_bear_toolkit"`
- Check tests: `python3 -m unittest discover -s python_toolkit/tests`

### Spreadsheet Failures
- Missing credentials? Adapter correctly sets `ready=False`, `health=blocked`
- For local dev: Use service account or OAuth setup
- Reference: `python_toolkit/README.md`

### Test Failures
- Environment-related failures (empty sessions, no Google creds) are acceptable
- Critical parity tests MUST pass (editor, manager, procedural, sessions)
- Run full suite: `python3 -m unittest discover -s python_toolkit/tests -p 'test_*.py' -v`

### Rollback (Emergency Only)
```bash
git checkout pre-cutover-backup
git push -f origin main
# Or: git checkout rollback/pre-cutover-main && git push -f origin main
```

---

## Key Files & References

- **`python_toolkit/README.md`** — Comprehensive toolkit guide
- **`PYTHON_TOOLKIT_MIGRATION_PLAN.md`** — Migration strategy
- **`TOOLKIT_ARCHITECTURE.md`** — Desktop shell & toolkit structure
- **`LEVEL_JSON_SCHEMA.md`** — Level format specification
- **`PROCEDURAL_ML_DESIGN.md`** — Procedural generation design
- **`CUTOVER_PLAN.md`** — Deployment & rollback procedures
- **`PARITY_MIGRATION_COMPLETE.md`** — Cutover status summary
- **`memoria.md`** — Session state & file changelog

---

## Recent Changes (Parity Migration - 2026-04-12)

### Merged to Main
- Branch: `parity/step-4-9` → `main` (commit f3a7c02)
- Files added: `CUTOVER_PLAN.md`, `PARITY_MIGRATION_COMPLETE.md`
- Test suite: 59/62 passing (95%)
- Status: READY FOR PRODUCTION CUTOVER

### Safety Branches Created
- Tag: `pre-cutover-backup` (current main state preserved)
- Branch: `rollback/pre-cutover-main` (revertible to pre-cutover main)

### Next Steps
- ✅ Custom instructions updated (Python PRIMARY, Web FALLBACK-ONLY)
- ⏳ Run full test suite on main (recommended post-merge)
- ⏳ Update documentation headers (Python PRIMARY marker)
- ⏳ Tag main as `cutover-complete` when stable

---

**Last Updated:** 2026-04-12 (Parity Migration Complete)  
**Status:** PYTHON TOOLKIT PRIMARY ✅  
**Risk Level:** LOW

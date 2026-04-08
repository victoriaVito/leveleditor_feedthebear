# Feed the Bear Python Toolkit

This package is the Python-first migration target for the current web toolkit.

The initial goal is not feature parity in one shot. The goal is to create the stable Python home where domain logic, persistence services, and the future UI shell will move incrementally.

## Initial Structure

- `src/feed_the_bear_toolkit/cli.py`: main entrypoint for autopilot and local runs
- `src/feed_the_bear_toolkit/domain/`: level, progression, validation, and learning models
- `src/feed_the_bear_toolkit/services/`: repo I/O, exports, sync, and procedural services
- `src/feed_the_bear_toolkit/ui/`: future Python UI shell
- `tests/`: parity and regression tests

## Local Setup

```bash
cd python_toolkit
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
python -m feed_the_bear_toolkit.cli status
```

For a no-install local check during migration:

```bash
cd python_toolkit
python3 run_cli.py status
```

For an automatic UI launcher that picks a free port for you:

```bash
cd /Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally
python_toolkit/start_ui.sh
```

To stop the tracked UI process later:

```bash
cd /Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally
python_toolkit/stop_ui.sh
```

## Current Status

The toolkit now exposes:

- tolerant level parsing for canonical and legacy JSON
- structural plus metadata validation
- recursive pack validation and summary commands
- safe repo I/O helpers for reads, writes, append, and zip creation
- progression and manager metadata read/write serializers
- play session and playtest dataset persistence
- play sessions queue state read/write support
- a first procedural boundary for learning normalization, guide analysis, scoring, and generation-adjustment hints
- a deeper procedural reference slice with intent normalization, ranked curve targeting, repo-backed candidate ranking, and deterministic reference mutations
- a first solver-backed `generateLevelRaw` / `generateLevel` Python port for procedural generation
- a learned-session batch generator that mirrors the web toolkit's range-based batch flow
- a spreadsheet adapter boundary that reports readiness and wraps the current local-first sync commands
- spreadsheet command execution that now forwards the active credentials/token paths into the underlying scripts
- local spreadsheet hygiene actions for token disconnect and Python UI cache cleanup
- a Python-hosted web shell with Overview, Level Inspector, Mini Editor, Pack QA, Progressions, Procedural + Spreadsheet, and Sessions views
- visual board rendering inside the Level Inspector plus table-based pack QA results
- procedural reference-variant generation, learned-session batch generation, and spreadsheet disconnect/clear-cache actions exposed in the Python UI shell
- an interactive board editor inside the Python shell with clickable node/blocker editing and direct load-from-variant flows
- richer variant review cards with open/keep/save/discard actions for procedural and learned batch candidates
- stdlib regression coverage for the migrated slices

Useful commands:

```bash
cd python_toolkit
python3 run_cli.py validate-levels-under 'levels/progression_g'
python3 run_cli.py validate-progression 'progressions/progression_g.json'
python3 run_cli.py procedural-score-level 'levels/Progression B · Level 2.json' --learning-path '.local/toolkit_state/learning_state.json'
python3 run_cli.py procedural-adjustments 4 --learning-path '.local/toolkit_state/learning_state.json'
python3 run_cli.py procedural-reference-variants 'levels/Progression B · Level 2.json' --pairs more --blockers same --board same --count 3 --learning-path '.local/toolkit_state/learning_state.json'
python3 run_cli.py procedural-generate-raw 4 --seed-offset 0 --learning-path '.local/toolkit_state/learning_state.json'
python3 run_cli.py procedural-generate-level 4 --attempts 12 --learning-path '.local/toolkit_state/learning_state.json'
python3 run_cli.py procedural-generate-batch 3 4 --count 6 --learning-path '.local/toolkit_state/learning_state.json'
python3 run_cli.py spreadsheet-status --credentials-path '.local/google_oauth_client.json' --token-path '.local/google_sheets_token.json'
python3 run_cli.py spreadsheet-disconnect --token-path '.local/google_sheets_token.json'
python3 run_cli.py spreadsheet-clear-cache
python3 run_cli.py ui-status
python3 run_cli.py serve-ui --host 127.0.0.1 --port 8765
python3 start_ui.py --open
python3 start_ui.py --background --open
python3 run_cli.py inspect-play-session
python3 run_cli.py inspect-play-sessions-state
python3 run_cli.py save-live-progressions --output 'output/python_toolkit_checks/manager_progressions_live_roundtrip.json'
```

Still pending:

- deeper mutation/search orchestration parity against the full `app.js` procedural pipeline
- stronger variant review workflows beyond load-into-editor cards
- broader spreadsheet parity beyond the current wrappers and hygiene actions
- richer canvas/editor ergonomics beyond the current clickable board editor

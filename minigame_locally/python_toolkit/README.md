# Feed the Bear Python Toolkit

Python-first toolkit for Feed the Bear level design, validation, procedural generation, and playtest session management. Replaces the previous web-only toolkit with a native desktop shell and optional browser UI, so daily design work no longer depends on `localhost`.

## Quick Start

```bash
cd python_toolkit
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
python3 run_cli.py status
```

## Project Structure

```
src/feed_the_bear_toolkit/
  cli.py                  # CLI entrypoint (autopilot, local runs)
  domain/
    levels.py             # Tolerant level parsing (canonical + legacy JSON)
    validation.py         # Structural + metadata validation
    models.py             # Shared data models
    progressions.py       # Progression and manager metadata
    sessions.py           # Play session and playtest dataset models
    procedural.py         # Learning normalization, scoring, generation hints
  services/
    repo_io.py            # Safe repo I/O (read, write, append, zip)
    procedural.py         # Solver-backed generation, reference variants, batch flow
    spreadsheet.py        # Spreadsheet sync, credentials forwarding, cache hygiene
    config.py             # Paths and environment config
  ui/
    native_app.py         # tkinter desktop shell
    app.py                # Web shell (Overview, Inspector, Editor, Pack QA, etc.)
    server.py             # Python-hosted web server
tests/
  test_cli.py             test_procedural.py
  test_level_packs.py     test_procedural_service.py
  test_native_app.py      test_progressions.py
  test_repo_io.py         test_sessions.py
  test_spreadsheet.py     test_ui_server.py
```

## Usage

All commands run from the repo root unless noted otherwise.

### Validation

```bash
python3 python_toolkit/run_cli.py validate-levels-under 'levels/progression_g'
python3 python_toolkit/run_cli.py validate-progression 'progressions/progression_g.json'
```

### Procedural Generation

```bash
# Score an existing level against learning state
python3 python_toolkit/run_cli.py procedural-score-level 'levels/Progression B · Level 2.json' \
  --learning-path '.local/toolkit_state/learning_state.json'

# Get adjustment hints for a target difficulty
python3 python_toolkit/run_cli.py procedural-adjustments 4 \
  --learning-path '.local/toolkit_state/learning_state.json'

# Generate reference variants from an existing level
python3 python_toolkit/run_cli.py procedural-reference-variants 'levels/Progression B · Level 2.json' \
  --pairs more --blockers same --board same --count 3 \
  --learning-path '.local/toolkit_state/learning_state.json'

# Generate a raw level, a validated level, or a batch
python3 python_toolkit/run_cli.py procedural-generate-raw 4 --seed-offset 0 \
  --learning-path '.local/toolkit_state/learning_state.json'
python3 python_toolkit/run_cli.py procedural-generate-level 4 --attempts 12 \
  --learning-path '.local/toolkit_state/learning_state.json'
python3 python_toolkit/run_cli.py procedural-generate-batch 3 4 --count 6 \
  --learning-path '.local/toolkit_state/learning_state.json'
```

### Spreadsheet

```bash
python3 python_toolkit/run_cli.py spreadsheet-status \
  --credentials-path '.local/google_oauth_client.json' \
  --token-path '.local/google_sheets_token.json'
python3 python_toolkit/run_cli.py spreadsheet-disconnect \
  --token-path '.local/google_sheets_token.json'
python3 python_toolkit/run_cli.py spreadsheet-clear-cache
```

### Play Sessions

```bash
python3 python_toolkit/run_cli.py inspect-play-session
python3 python_toolkit/run_cli.py inspect-play-sessions-state
python3 python_toolkit/run_cli.py sessions-ui
```

### Progressions

```bash
python3 python_toolkit/run_cli.py save-live-progressions \
  --output 'output/python_toolkit_checks/manager_progressions_live_roundtrip.json'
```

## Desktop UI (native tkinter)

No server needed. Launch directly:

```bash
python3 python_toolkit/start_desktop.py
python3 python_toolkit/run_cli.py native-ui
```

Open a specific tab or file on launch:

```bash
python3 python_toolkit/start_desktop.py --tab manager
python3 python_toolkit/start_desktop.py --tab editor --level-path 'levels/Progression B · Level 2.json'
python3 python_toolkit/start_desktop.py --tab pack --pack-folder levels/progression_g
python3 python_toolkit/start_desktop.py --tab sessions --play-session-path playtest/latest_play_session.json
python3 python_toolkit/start_desktop.py --tab spreadsheet
```

The desktop shell supports: manager/progression workspace, canvas editor with cell editing, Pack QA, session review (load/approve/reject/promote), procedural variant generation with keep/discard, learned batch generation, and progression slot browsing with direct editor launch.

## Web Shell (browser alternative)

```bash
# Auto-launcher (picks a free port)
python_toolkit/start_ui.sh

# Or manually
python3 python_toolkit/start_ui.py --open
python3 python_toolkit/run_cli.py serve-ui --host 127.0.0.1 --port 8765

# Stop
python_toolkit/stop_ui.sh
```

Views: Overview, Level Inspector, Mini Editor, Pack QA, Progressions, Procedural + Spreadsheet, Sessions.

## Parity Status

Migration priority order against the web toolkit:

| Priority | Area | Target |
|----------|------|--------|
| 1 | Procedural | Match mutation/search intent, candidate gating, fallback behavior, ranking shape, and duplicate rejection for fixed fixtures and seeds. Document intentional divergence. |
| 2 | Variant review | Same keep/discard/open/promote loop as web, with stable review state and continuation into editor or queue. |
| 3 | Editor ergonomics | Same daily authoring loop with lower friction: clear tool state, repeatable save/validate/reopen, progression/session-aware editing. |
| 4 | Spreadsheet | Same operational control surface. Document which commands remain wrappers vs. native Python. |

Definition of done:

- Every target is backed by a test, fixture, or deterministic command
- `PARITY_CHECKLIST.md` is updated with evidence, not vague status
- All tests pass: `python3 -m unittest discover -s python_toolkit/tests -p 'test_*.py' -v`

## Testing

```bash
cd python_toolkit
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

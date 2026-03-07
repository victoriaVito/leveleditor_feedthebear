# Feed the Bear - Python Level Toolkit

Portable toolkit (single folder) to:
- generate procedural levels,
- validate levels,
- export JSON output,
- edit levels with a GUI editor.

## Requirements
- Python 3.10+
- No third-party dependencies (uses standard library only).

## Quick start

```bash
cd level_toolkit_py
python3 run_toolkit.py generate --level 3 --out ./out/level3.json
python3 run_toolkit.py validate --input ./out/level3.json
python3 run_toolkit.py generate-progression --outdir ./out/progression --csv
python3 run_toolkit.py editor
python3 run_toolkit.py main
```

## Commands

- `generate`: create one deterministic level for level 1..10.
- `generate-progression`: create levels 1..10 and enforce progression checks (`--csv` optional).
- `validate`: validate one JSON level file against the toolkit rules.
- `audit`: validate all `.json` files in a folder and write a markdown report.
- `editor`: open a Tkinter level editor and export JSON.
- `editor`: open a Tkinter level editor with `Import JSON`, `Export JSON`, `Moves` balancing, and `Screenshot`.
- `main`: open a main GUI with buttons for editor, manager, and progression bundle export.

## Build executables (macOS/Linux/Windows)

Build native binaries on each operating system:

```bash
cd level_toolkit_py
python3 -m pip install -r requirements-build.txt
```

- macOS:
```bash
bash packaging/build_mac.sh
```

- Linux:
```bash
bash packaging/build_linux.sh
```

- Windows (Command Prompt):
```bat
packaging\\build_windows.bat
```

Artifacts are copied to `release/`:
- `release/macos/FeedTheBearToolkit.app`
- `release/linux/FeedTheBearToolkit`
- `release/windows/FeedTheBearToolkit.exe`
- `release/checksums.txt`

Editor notes:
- `Moves` can be set manually or auto-calculated via `Auto Moves`.
- `Screenshot` saves PNG in builds (Pillow included in build deps).

## Output format
Generated/exported files follow the target shape used by your game engine:
- `level`, `board_size`, `grid`, `pairs`, `blockers`, `solution_count`,
- `target_density`, `golden_path`, `validation`, `meta`.

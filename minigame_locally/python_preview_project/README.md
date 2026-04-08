# Python Preview Project

Small standalone Python project for prerendering level preview PNGs outside the web toolkit.

## Purpose

- generate preview images ahead of time
- reduce browser-side canvas work
- keep a simple Python-only entrypoint for batch rendering

## Setup

```bash
cd python_preview_project
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

Render one folder of level JSON files into the shared screenshot output:

```bash
python render_previews.py ../levels/8x8-9x9-procedular
```

By default images are written to `../levels/screenshots/`.

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 -m venv .venv-build
source .venv-build/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-build.txt

python -m PyInstaller --noconfirm --clean \
  --name FeedTheBearToolkit \
  --windowed \
  --onedir \
  main_gui.py

mkdir -p release/macos
cp -R dist/FeedTheBearToolkit.app release/macos/

shasum -a 256 release/macos/FeedTheBearToolkit.app/Contents/MacOS/FeedTheBearToolkit > release/checksums.txt
echo "macOS build ready: release/macos/FeedTheBearToolkit.app"

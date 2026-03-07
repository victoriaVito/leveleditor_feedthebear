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
  --onefile \
  main_gui.py

mkdir -p release/linux
cp dist/FeedTheBearToolkit release/linux/

sha256sum release/linux/FeedTheBearToolkit > release/checksums.txt
echo "Linux build ready: release/linux/FeedTheBearToolkit"

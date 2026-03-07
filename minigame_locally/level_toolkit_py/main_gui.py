#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from level_toolkit.main_app import launch_main_app  # noqa: E402


if __name__ == "__main__":
    launch_main_app()

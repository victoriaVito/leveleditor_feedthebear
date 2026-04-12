from __future__ import annotations

import sys

from feed_the_bear_toolkit.cli import main


if __name__ == "__main__":
    raise SystemExit(main(["native-ui", "--tab", "manager", *sys.argv[1:]]))

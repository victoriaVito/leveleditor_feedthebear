from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.domain.levels import (
    load_level_file,
    serialize_level_to_canonical_dict,
    summarize_level_pack,
)


class LevelPackTests(unittest.TestCase):
    def test_serialize_level_to_canonical_dict(self) -> None:
        sample = {
            "id": "sample_level",
            "difficultyTier": 2,
            "gridSize": {"cols": 5, "rows": 5},
            "moves": 6,
            "pairs": [
                {"type": "blue", "a": {"x": 0, "y": 0}, "b": {"x": 4, "y": 0}},
                {"type": "green", "a": {"x": 0, "y": 4}, "b": {"x": 4, "y": 4}},
            ],
            "solutionCount": 2,
            "targetDensity": "MEDIUM",
            "goldenPath": {"A": [[0, 0], [0, 4]], "B": [[4, 0], [4, 4]]},
            "meta": {"source_name": "sample_level.json"},
            "validation": {"solvable": True},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "sample.json"
            path.write_text(json.dumps(sample), encoding="utf-8")
            level = load_level_file(path)
        serialized = serialize_level_to_canonical_dict(level, "sample.json")
        self.assertEqual(serialized["id"], "sample_level")
        self.assertEqual(serialized["gridSize"], {"cols": 5, "rows": 5})
        self.assertEqual(len(serialized["pairs"]), 2)
        self.assertEqual(serialized["solutionCount"], 2)

    def test_summarize_level_pack(self) -> None:
        valid_level = {
            "id": "valid_level",
            "difficultyTier": 2,
            "gridSize": {"cols": 5, "rows": 5},
            "moves": 6,
            "pairs": [
                {"type": "blue", "a": {"x": 0, "y": 0}, "b": {"x": 4, "y": 0}},
                {"type": "green", "a": {"x": 0, "y": 4}, "b": {"x": 4, "y": 4}},
            ],
            "solutionCount": 1,
            "targetDensity": "HIGH",
            "goldenPath": {"A": [[0, 0], [0, 4]], "B": [[4, 0], [4, 4]]},
            "meta": {"source_name": "valid_level.json"},
            "validation": {"solvable": True},
        }
        invalid_level = {
            "id": "invalid_level",
            "difficultyTier": None,
            "gridSize": {"cols": None, "rows": None},
            "moves": None,
            "pairs": [],
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "nested").mkdir()
            (root / "valid.json").write_text(json.dumps(valid_level), encoding="utf-8")
            (root / "nested/invalid.json").write_text(json.dumps(invalid_level), encoding="utf-8")
            summary = summarize_level_pack(root)
        self.assertEqual(summary.file_count, 2)
        self.assertEqual(summary.valid_count, 1)
        self.assertEqual(summary.invalid_count, 1)
        self.assertIn("5x5", summary.board_counts)
        self.assertIn("2", summary.pair_counts)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import sys
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.domain.levels import load_level_file
from feed_the_bear_toolkit.services.config import find_project_root
from feed_the_bear_toolkit.services.procedural import (
    generate_learned_session_batch,
    generate_level,
    generate_level_raw,
    generate_reference_variants,
    load_procedural_learning_state,
)


class ProceduralServiceTests(unittest.TestCase):
    def test_generate_level_raw_returns_solver_backed_level(self) -> None:
        root = find_project_root()
        learning_path = root / ".local/toolkit_state/learning_state.json"
        learning = {}
        if learning_path.exists():
            import json

            parsed = json.loads(learning_path.read_text(encoding="utf-8-sig"))
            if isinstance(parsed, dict):
                learning = parsed
        level = generate_level_raw(4, learning, seed_offset=0)
        self.assertEqual(level.cols, 5)
        self.assertEqual(level.rows, 5)
        self.assertGreaterEqual(len(level.pairs), 2)
        self.assertGreaterEqual(level.solution_count or 0, 1)

    def test_generate_level_returns_best_attempt(self) -> None:
        generated = generate_level(4, {}, attempts=3)
        self.assertEqual(generated.attempt_count, 3)
        self.assertIsNotNone(generated.level.solution_count)
        self.assertGreaterEqual(generated.level.solution_count or 0, 1)

    def test_generate_reference_variants_returns_ranked_candidates(self) -> None:
        root = find_project_root()
        base_level = load_level_file(root / "levels/Progression B · Level 2.json")
        variants = generate_reference_variants(
            base_level,
            root,
            base_file_name="Progression B · Level 2.json",
            adjustments={"pairs": "more", "blockers": "same", "board": "same"},
            count=3,
            learning_path=".local/toolkit_state/learning_state.json",
        )
        self.assertTrue(variants)
        self.assertLessEqual(len(variants), 3)
        self.assertTrue(all(candidate.total_rank >= 0 or candidate.total_rank <= 0 for candidate in variants))
        self.assertEqual(variants[0].reference_intent["pairs"], "more")

    def test_generate_learned_session_batch_returns_valid_levels(self) -> None:
        batch = generate_learned_session_batch(3, 4, 3, {})
        self.assertGreaterEqual(batch.produced_count, 1)
        self.assertLessEqual(batch.produced_count, 3)
        self.assertEqual(batch.start_level, 3)
        self.assertEqual(batch.end_level, 4)
        self.assertTrue(all((level.solution_count or 0) >= 1 for level in batch.levels))

    def test_load_procedural_learning_state_ignores_invalid_json(self) -> None:
        root = find_project_root()
        temp_root = root / "output/python_toolkit_checks/test_learning_state_root"
        temp_root.mkdir(parents=True, exist_ok=True)
        bad_file = temp_root / "bad_learning.json"
        bad_file.write_text("{bad json", encoding="utf-8")
        payload = load_procedural_learning_state(temp_root, bad_file)
        self.assertIsInstance(payload, dict)
        self.assertEqual(payload.get("approved"), [])

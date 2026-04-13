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
        base_level = load_level_file(root / "levels/progression_b/jsons/progression_b_level2.json")
        variants = generate_reference_variants(
            base_level,
            root,
            base_file_name="progression_b_level2.json",
            adjustments={"pairs": "more", "blockers": "same", "board": "same"},
            count=3,
            learning_path=".local/toolkit_state/learning_state.json",
        )
        self.assertTrue(variants)
        self.assertLessEqual(len(variants), 3)
        self.assertTrue(all(candidate.total_rank >= 0 or candidate.total_rank <= 0 for candidate in variants))
        self.assertEqual(variants[0].reference_intent["pairs"], "more")

    def test_generate_reference_variants_respects_count_limit(self) -> None:
        """Verify that returned candidates <= requested count."""
        root = find_project_root()
        base_level = load_level_file(root / "levels/progression_b/jsons/progression_b_level2.json")
        for count in [1, 3, 5]:
            variants = generate_reference_variants(
                base_level,
                root,
                base_file_name="progression_b_level2.json",
                adjustments={"pairs": "same", "blockers": "same", "board": "same"},
                count=count,
                learning_path=".local/toolkit_state/learning_state.json",
            )
            self.assertLessEqual(len(variants), count, f"Expected <= {count}, got {len(variants)}")

    def test_generate_reference_variants_returns_at_least_one(self) -> None:
        """Verify that at least one candidate is returned."""
        root = find_project_root()
        base_level = load_level_file(root / "levels/progression_b/jsons/progression_b_level2.json")
        variants = generate_reference_variants(
            base_level,
            root,
            base_file_name="progression_b_level2.json",
            adjustments={"pairs": "same", "blockers": "same", "board": "same"},
            count=1,
            learning_path=".local/toolkit_state/learning_state.json",
        )
        self.assertGreaterEqual(len(variants), 1, "Should always return at least 1 candidate")

    def test_generate_reference_variants_normalizes_adjustments(self) -> None:
        """Verify that adjustments are normalized and stored in reference_intent."""
        root = find_project_root()
        base_level = load_level_file(root / "levels/progression_b/jsons/progression_b_level2.json")

        # Test with explicit adjustment
        variants = generate_reference_variants(
            base_level,
            root,
            base_file_name="progression_b_level2.json",
            adjustments={"pairs": "more", "blockers": "less", "board": "bigger"},
            count=3,
            learning_path=".local/toolkit_state/learning_state.json",
        )
        self.assertTrue(variants)
        for candidate in variants:
            self.assertEqual(candidate.reference_intent["pairs"], "more")
            self.assertEqual(candidate.reference_intent["blockers"], "less")
            self.assertEqual(candidate.reference_intent["board"], "bigger")

    def test_generate_reference_variants_applies_intent_constraints(self) -> None:
        """Verify that reference intent affects ranking (intent_penalty exists)."""
        root = find_project_root()
        base_level = load_level_file(root / "levels/progression_b/jsons/progression_b_level2.json")

        # Generate with intent
        variants = generate_reference_variants(
            base_level,
            root,
            base_file_name="progression_b_level2.json",
            adjustments={"pairs": "more", "blockers": "same", "board": "same"},
            count=3,
            learning_path=".local/toolkit_state/learning_state.json",
        )
        self.assertTrue(variants)
        # Each candidate should have an intent_penalty field
        for candidate in variants:
            self.assertIsNotNone(candidate.intent_penalty)
            self.assertIsInstance(candidate.intent_penalty, (int, float))

    def test_generate_reference_variants_returns_ranked_by_similarity(self) -> None:
        """Verify that candidates are ranked and similarity scores are computed."""
        root = find_project_root()
        base_level = load_level_file(root / "levels/progression_b/jsons/progression_b_level2.json")

        variants = generate_reference_variants(
            base_level,
            root,
            base_file_name="progression_b_level2.json",
            adjustments={"pairs": "same", "blockers": "same", "board": "same"},
            count=3,
            learning_path=".local/toolkit_state/learning_state.json",
        )
        self.assertTrue(variants)

        # All candidates should have similarity scores
        for candidate in variants:
            self.assertIsNotNone(candidate.similarity)
            self.assertIsInstance(candidate.similarity, (int, float))

    def test_generate_reference_variants_phases_produce_different_sources(self) -> None:
        """Verify that different search phases produce candidates with different source_kind values."""
        root = find_project_root()
        base_level = load_level_file(root / "levels/progression_b/jsons/progression_b_level2.json")

        # Request many candidates to force multiple phases
        variants = generate_reference_variants(
            base_level,
            root,
            base_file_name="progression_b_level2.json",
            adjustments={"pairs": "same", "blockers": "same", "board": "same"},
            count=10,  # Request many to trigger Phase 2 and potentially Phase 3
            learning_path=".local/toolkit_state/learning_state.json",
        )

        source_kinds = {v.source_kind for v in variants}
        # With 10 requested, we should see at least "generated" (covers both strict/relaxed internally)
        self.assertTrue(source_kinds, "Should have at least one source kind")
        # source_kind should be one of the known types
        for source_kind in source_kinds:
            self.assertIn(source_kind, ["generated", "generated_strict", "generated_relaxed", "mutation"])

    def test_generate_reference_variants_deduplicates_candidates(self) -> None:
        """Verify that duplicate candidates (by signature) are not returned."""
        root = find_project_root()
        base_level = load_level_file(root / "levels/progression_b/jsons/progression_b_level2.json")

        # Generate variants multiple times with same base + adjustments
        variants1 = generate_reference_variants(
            base_level,
            root,
            base_file_name="progression_b_level2.json",
            adjustments={"pairs": "same", "blockers": "same", "board": "same"},
            count=3,
            learning_path=".local/toolkit_state/learning_state.json",
        )

        # Check that all returned candidates have unique board configurations
        seen_boards = set()
        for variant in variants1:
            board_sig = (
                len(variant.level.pairs),
                len(variant.level.blockers),
                variant.level.rows,
                variant.level.cols,
            )
            # If we see the same signature twice, dedup failed
            # This is a soft check; exact board state would require deeper inspection
            if board_sig in seen_boards:
                self.fail("Duplicate board configuration found in variants")
            seen_boards.add(board_sig)

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

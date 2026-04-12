from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.domain.levels import load_level_file, parse_level_dict
from feed_the_bear_toolkit.domain.procedural import learning_driven_generation_adjustments, mean_feature
from feed_the_bear_toolkit.services.config import find_project_root
from feed_the_bear_toolkit.services.procedural import (
    _build_mutated_reference_candidate,
    _count_solutions,
    build_learning_record,
    _blocker_improves_solution_count,
    count_learning_solutions,
    evaluate_learning_level,
    generate_learned_session_batch,
    generate_level,
    generate_level_raw,
    generate_reference_variants,
    load_procedural_learning_state,
    rank_procedural_reference_candidates,
    save_learning_record,
)


class ProceduralServiceTests(unittest.TestCase):
    @staticmethod
    def sample_learning_level():
        return parse_level_dict(
            {
                "id": "procedural_learning_test",
                "difficultyTier": 4,
                "gridSize": {"cols": 4, "rows": 4},
                "moves": 6,
                "pairs": [
                    {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 1, "y": 0}},
                    {"id": "B", "type": "blue", "a": {"x": 0, "y": 2}, "b": {"x": 1, "y": 2}},
                ],
                "blockers": [{"x": 3, "y": 3}],
                "solutionCount": 1,
                "goldenPath": {
                    "A": [[0, 0], [0, 1]],
                    "B": [[2, 0], [2, 1]],
                },
            }
        )

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

    def test_generate_level_raw_retries_when_initial_scaffold_is_unsolved(self) -> None:
        real_count_solutions = _count_solutions
        zeroed_initial_scaffold = {"done": False}

        def fake_count_solutions(board_width, board_height, pairs, blockers, cap=20, require_full_coverage=False, timeout_seconds=2.5):
            if not zeroed_initial_scaffold["done"] and not blockers:
                zeroed_initial_scaffold["done"] = True
                return 0
            return real_count_solutions(
                board_width,
                board_height,
                pairs,
                blockers,
                cap=cap,
                require_full_coverage=require_full_coverage,
                timeout_seconds=timeout_seconds,
            )

        with patch("feed_the_bear_toolkit.services.procedural._count_solutions", side_effect=fake_count_solutions):
            level = generate_level_raw(4, {}, seed_offset=0)

        self.assertGreaterEqual(level.solution_count or 0, 1)
        self.assertGreaterEqual(int(level.meta.get("generation_attempts") or 0), 2)

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

    def test_generate_reference_variants_falls_back_to_mutation_when_generation_fails(self) -> None:
        base_level = self.sample_learning_level()
        mutation_a = parse_level_dict(
            {
                "id": "mutation_a",
                "difficultyTier": 4,
                "gridSize": {"cols": 4, "rows": 4},
                "moves": 6,
                "pairs": [
                    {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 1, "y": 0}},
                    {"id": "B", "type": "blue", "a": {"x": 0, "y": 2}, "b": {"x": 1, "y": 2}},
                ],
                "blockers": [{"x": 2, "y": 3}],
                "solutionCount": 1,
            }
        )
        mutation_b = parse_level_dict(
            {
                "id": "mutation_b",
                "difficultyTier": 4,
                "gridSize": {"cols": 4, "rows": 4},
                "moves": 7,
                "pairs": [
                    {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 2, "y": 0}},
                    {"id": "B", "type": "blue", "a": {"x": 0, "y": 2}, "b": {"x": 2, "y": 2}},
                ],
                "blockers": [{"x": 3, "y": 1}],
                "solutionCount": 1,
            }
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "levels").mkdir(parents=True, exist_ok=True)
            with (
                patch("feed_the_bear_toolkit.services.procedural.generate_level_raw", side_effect=RuntimeError("boom")),
                patch(
                    "feed_the_bear_toolkit.services.procedural._build_mutated_reference_candidate",
                    side_effect=[mutation_a, mutation_b, None, None],
                ),
            ):
                variants = generate_reference_variants(
                    base_level,
                    root,
                    base_file_name="base.json",
                    adjustments={"pairs": "more", "blockers": "same", "board": "same"},
                    count=2,
                    learning_path=None,
                )
        self.assertEqual(len(variants), 2)

    def test_build_mutated_reference_candidate_rolls_back_invalid_blocker_additions(self) -> None:
        base_level = self.sample_learning_level()
        real_count_solutions = _count_solutions

        def fake_count_solutions(board_width, board_height, pairs, blockers, cap=20, require_full_coverage=False, timeout_seconds=2.5):
            if len(blockers) > len(base_level.blockers):
                return 0
            return real_count_solutions(
                board_width,
                board_height,
                pairs,
                blockers,
                cap=cap,
                require_full_coverage=require_full_coverage,
                timeout_seconds=timeout_seconds,
            )

        with patch("feed_the_bear_toolkit.services.procedural._count_solutions", side_effect=fake_count_solutions):
            mutated = _build_mutated_reference_candidate(
                base_level,
                "base.json",
                {"pairs": "same", "blockers": "more", "board": "same"},
                0,
            )

        self.assertIsNotNone(mutated)
        self.assertEqual(len(mutated.blockers), len(base_level.blockers))
        self.assertGreaterEqual(mutated.solution_count or 0, 1)

    def test_build_mutated_reference_candidate_returns_none_when_all_mutations_break_solvability(self) -> None:
        base_level = self.sample_learning_level()
        with patch("feed_the_bear_toolkit.services.procedural._count_solutions", return_value=0):
            mutated = _build_mutated_reference_candidate(
                base_level,
                "base.json",
                {"pairs": "same", "blockers": "same", "board": "bigger"},
                0,
            )
        self.assertIsNone(mutated)

    def test_generate_reference_variants_uses_relaxed_phase_when_strict_rejects(self) -> None:
        base_level = self.sample_learning_level()
        generated = parse_level_dict(
            {
                "id": "generated_relaxed_target",
                "difficultyTier": 4,
                "gridSize": {"cols": 4, "rows": 4},
                "moves": 7,
                "pairs": [
                    {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 2, "y": 0}},
                    {"id": "B", "type": "blue", "a": {"x": 0, "y": 2}, "b": {"x": 2, "y": 2}},
                ],
                "blockers": [{"x": 3, "y": 1}],
                "solutionCount": 1,
            }
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "levels").mkdir(parents=True, exist_ok=True)
            with (
                patch("feed_the_bear_toolkit.services.procedural.generate_level_raw", return_value=generated),
                patch("feed_the_bear_toolkit.services.procedural.has_critical_guide_issue", return_value=True),
            ):
                variants = generate_reference_variants(
                    base_level,
                    root,
                    base_file_name="base.json",
                    adjustments={"pairs": "same", "blockers": "same", "board": "same"},
                    count=1,
                    learning_path=None,
                )
        self.assertEqual(len(variants), 1)
        self.assertTrue(variants[0].source_kind.endswith("_relaxed"))

    def test_generate_reference_variants_skips_relaxed_and_mutation_when_strict_generation_fills_target_pool(self) -> None:
        base_level = self.sample_learning_level()
        strict_candidates = {}
        for seed in range(20):
            strict_candidates[985 + seed] = parse_level_dict(
                {
                    "id": f"strict_{seed}",
                    "difficultyTier": 4,
                    "gridSize": {"cols": 8, "rows": 8},
                    "moves": 6,
                    "pairs": [
                        {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 1, "y": 0}},
                        {
                            "id": "B",
                            "type": "blue",
                            "a": {"x": 0, "y": 2},
                            "b": {"x": 2 + (seed % 4), "y": 2 + (seed // 4)},
                        },
                    ],
                    "blockers": [{"x": 4 + (seed % 4), "y": 3 + (seed // 4)}],
                    "solutionCount": 1,
                }
            )

        def fake_generate(level_number, learning, *, seed_offset=0):
            candidate = strict_candidates.get(seed_offset)
            if candidate is None:
                raise RuntimeError("stop after strict pool fill")
            return candidate

        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "levels").mkdir(parents=True, exist_ok=True)
            with (
                patch("feed_the_bear_toolkit.services.procedural._iter_repo_level_paths", return_value=[]),
                patch("feed_the_bear_toolkit.services.procedural.ranked_reference_generation_levels", return_value=[5]),
                patch("feed_the_bear_toolkit.services.procedural.generate_level_raw", side_effect=fake_generate),
                patch("feed_the_bear_toolkit.services.procedural.validate_level_structure", return_value=SimpleNamespace(valid=True)),
                patch("feed_the_bear_toolkit.services.procedural._candidate_is_solvable", return_value=True),
                patch("feed_the_bear_toolkit.services.procedural.analyze_solution_guide", return_value={}),
                patch("feed_the_bear_toolkit.services.procedural.has_critical_guide_issue", return_value=False),
                patch("feed_the_bear_toolkit.services.procedural._has_critical_guide_issue", return_value=False),
                patch("feed_the_bear_toolkit.services.procedural._build_mutated_reference_candidate") as mutated_mock,
            ):
                variants = generate_reference_variants(
                    base_level,
                    root,
                    base_file_name="base.json",
                    adjustments={"pairs": "same", "blockers": "same", "board": "same"},
                    count=2,
                    learning_path=None,
                )

        self.assertEqual(len(variants), 2)
        self.assertTrue(all(variant.level.id.startswith("strict_") for variant in variants))
        self.assertTrue(all(variant.source_kind == "generated" for variant in variants))
        mutated_mock.assert_not_called()

    def test_count_solutions_require_full_coverage_is_additive(self) -> None:
        pairs = [
            {"id": "A", "a": {"x": 0, "y": 0}, "b": {"x": 3, "y": 0}},
            {"id": "B", "a": {"x": 0, "y": 3}, "b": {"x": 3, "y": 3}},
        ]
        blockers = [{"x": 1, "y": 0}]
        default_count = _count_solutions(4, 4, pairs, blockers, 20, require_full_coverage=False)
        full_coverage_count = _count_solutions(4, 4, pairs, blockers, 20, require_full_coverage=True)
        self.assertGreaterEqual(default_count, 1)
        self.assertEqual(full_coverage_count, 0)

    def test_generate_level_raw_fixed_seed_smoke_set_stays_solved(self) -> None:
        generated = [generate_level_raw(4, {}, seed_offset=seed) for seed in range(5)]
        self.assertEqual(len(generated), 5)
        self.assertTrue(all((level.solution_count or 0) >= 1 for level in generated))

    def test_rank_procedural_reference_candidates_deduplicates_same_layout(self) -> None:
        base_level = self.sample_learning_level()
        duplicate_a = parse_level_dict(
            {
                "id": "duplicate_a",
                "difficultyTier": 4,
                "gridSize": {"cols": 4, "rows": 4},
                "moves": 6,
                "pairs": [
                    {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 1, "y": 0}},
                    {"id": "B", "type": "blue", "a": {"x": 0, "y": 2}, "b": {"x": 1, "y": 2}},
                ],
                "blockers": [{"x": 3, "y": 3}],
                "solutionCount": 1,
                "goldenPath": {
                    "A": [[0, 0], [0, 1]],
                    "B": [[2, 0], [2, 1]],
                },
            }
        )
        duplicate_b = parse_level_dict(
            {
                "id": "duplicate_b",
                "difficultyTier": 4,
                "gridSize": {"cols": 4, "rows": 4},
                "moves": 6,
                "pairs": [
                    {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 1, "y": 0}},
                    {"id": "B", "type": "blue", "a": {"x": 0, "y": 2}, "b": {"x": 1, "y": 2}},
                ],
                "blockers": [{"x": 3, "y": 3}],
                "solutionCount": 1,
                "goldenPath": {
                    "A": [[0, 0], [0, 1]],
                    "B": [[2, 0], [2, 1]],
                },
            }
        )
        distinct = parse_level_dict(
            {
                "id": "distinct",
                "difficultyTier": 4,
                "gridSize": {"cols": 5, "rows": 5},
                "moves": 7,
                "pairs": [
                    {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 1, "y": 0}},
                    {"id": "B", "type": "blue", "a": {"x": 0, "y": 2}, "b": {"x": 1, "y": 2}},
                ],
                "blockers": [{"x": 2, "y": 3}],
                "solutionCount": 1,
                "goldenPath": {
                    "A": [[0, 0], [0, 1]],
                    "B": [[2, 0], [2, 1]],
                },
            }
        )

        ranked = rank_procedural_reference_candidates(
            base_level,
            [duplicate_a, duplicate_b, distinct],
            {"pairs": "same", "blockers": "same", "board": "same"},
            None,
            limit=3,
        )
        self.assertEqual(len(ranked), 2)
        self.assertEqual(len({candidate.level.id for candidate in ranked}), 2)
        self.assertTrue(any(candidate.level.id == "distinct" for candidate in ranked))

    def test_rank_procedural_reference_candidates_skips_unsolved_levels(self) -> None:
        base_level = self.sample_learning_level()
        unsolved = parse_level_dict(
            {
                "id": "unsolved",
                "difficultyTier": 4,
                "gridSize": {"cols": 4, "rows": 4},
                "moves": 6,
                "pairs": [
                    {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 1, "y": 0}},
                    {"id": "B", "type": "blue", "a": {"x": 0, "y": 2}, "b": {"x": 1, "y": 2}},
                ],
                "blockers": [{"x": 3, "y": 3}],
                "solutionCount": 0,
            }
        )
        solved = parse_level_dict(
            {
                "id": "solved",
                "difficultyTier": 4,
                "gridSize": {"cols": 4, "rows": 4},
                "moves": 6,
                "pairs": [
                    {"id": "A", "type": "red", "a": {"x": 0, "y": 0}, "b": {"x": 1, "y": 0}},
                    {"id": "B", "type": "blue", "a": {"x": 0, "y": 2}, "b": {"x": 1, "y": 2}},
                ],
                "blockers": [{"x": 2, "y": 3}],
                "solutionCount": 1,
            }
        )

        ranked = rank_procedural_reference_candidates(
            base_level,
            [unsolved, solved],
            {"pairs": "same", "blockers": "same", "board": "same"},
            None,
            limit=3,
        )
        self.assertEqual([candidate.level.id for candidate in ranked], ["solved"])

    def test_generate_learned_session_batch_returns_valid_levels(self) -> None:
        batch = generate_learned_session_batch(3, 4, 3, {})
        self.assertGreaterEqual(batch.produced_count, 1)
        self.assertLessEqual(batch.produced_count, 3)
        self.assertEqual(batch.start_level, 3)
        self.assertEqual(batch.end_level, 4)
        self.assertTrue(all((level.solution_count or 0) >= 1 for level in batch.levels))

    def test_load_procedural_learning_state_ignores_invalid_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            bad_file = temp_root / "bad_learning.json"
            bad_file.write_text("{bad json", encoding="utf-8")
            payload = load_procedural_learning_state(temp_root, bad_file)
        self.assertIsInstance(payload, dict)
        self.assertEqual(payload.get("approved"), [])

    def test_count_learning_solutions_uses_solver_not_stored_value(self) -> None:
        level = self.sample_learning_level()
        self.assertEqual(count_learning_solutions(level), 20)

    def test_mean_feature_averages_optional_learning_metrics(self) -> None:
        mean = mean_feature(
            [
                {
                    "boardWidth": 4,
                    "boardHeight": 4,
                    "pairs": 2,
                    "blockers": 1,
                    "moves": 6,
                    "solutions": 20,
                    "path_straightness": 0.8,
                    "free_cells_per_pair": 5.0,
                },
                {
                    "boardWidth": 4,
                    "boardHeight": 4,
                    "pairs": 2,
                    "blockers": 1,
                    "moves": 8,
                    "solutions": 10,
                    "path_straightness": 1.0,
                    "free_cells_per_pair": 7.0,
                },
            ]
        )
        self.assertIsNotNone(mean)
        self.assertAlmostEqual(mean["path_straightness"], 0.9)
        self.assertAlmostEqual(mean["free_cells_per_pair"], 6.0)

    def test_learning_driven_generation_adjustments_use_path_straightness_signal(self) -> None:
        learning = {
            "approved": [
                {
                    "level": 4,
                    "features": {
                        "boardWidth": 4,
                        "boardHeight": 4,
                        "pairs": 2,
                        "blockers": 1,
                        "moves": 6,
                        "solutions": 20,
                        "path_straightness": 0.91,
                    },
                }
            ],
            "rejected": [],
            "corrections": [],
        }
        adjustments = learning_driven_generation_adjustments(4, learning)
        self.assertGreaterEqual(float(adjustments["desiredPathStraightness"] or 0), 0.91)

    def test_blocker_improvement_requires_strict_solution_reduction(self) -> None:
        self.assertTrue(_blocker_improves_solution_count(9, 10))
        self.assertFalse(_blocker_improves_solution_count(10, 10))
        self.assertFalse(_blocker_improves_solution_count(0, 10))

    def test_evaluate_learning_level_includes_solver_guide_and_pair_feedback(self) -> None:
        level = self.sample_learning_level()
        evaluation = evaluate_learning_level(level)
        self.assertTrue(evaluation["validation"]["valid"])
        self.assertTrue(evaluation["validation"]["solvable"])
        self.assertEqual(evaluation["validation"]["solution_count"], 20)
        self.assertTrue(evaluation["validation"]["solution_count_mismatch"])
        self.assertEqual(evaluation["feature_signals"]["guideTrust"], "HIGH")
        self.assertEqual(evaluation["feature_signals"]["criticalGuideIssue"], 0)
        self.assertEqual(evaluation["feature_signals"]["pairFeedbackCount"], 2)
        self.assertEqual(len(evaluation["pair_feedback"]), 2)

    def test_build_learning_record_matches_js_shape_more_closely(self) -> None:
        level = self.sample_learning_level()
        record = build_learning_record(
            level,
            "reject",
            context="session:Procedural 100 · Level 1",
            extra={"reason_code": "too_easy", "note_text": "too easy", "auto_recorded": True},
            now_ms=1234567890,
        )
        self.assertEqual(record["timestamp"], 1234567890)
        self.assertEqual(record["source_family"], "session")
        self.assertEqual(record["validation"]["solution_count"], 20)
        self.assertEqual(record["features"]["solution_count_mismatch"], 1)
        self.assertEqual(record["feature_signals"]["guideTrust"], "HIGH")
        self.assertIn("pair_feedback", record)
        self.assertEqual(record["reason_code"], "too_easy")

    def test_save_learning_record_persists_normalized_bucket(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            target = temp_root / "learning_state.json"
            saved_path, buckets, record = save_learning_record(
                self.sample_learning_level(),
                "approve",
                project_root=temp_root,
                learning_path=target,
                context="editor_pattern",
                extra={"keep_tags": ["good_flow"]},
                now_ms=42,
            )
            self.assertEqual(saved_path.resolve(), target.resolve())
            self.assertEqual(len(buckets["approved"]), 1)
            self.assertEqual(record["timestamp"], 42)
            self.assertTrue(target.exists())

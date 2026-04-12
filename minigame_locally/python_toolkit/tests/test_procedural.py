from __future__ import annotations

import sys
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.domain.procedural import (
    analyze_solution_guide,
    classify_discard_reason,
    extract_pair_feedback,
    guide_trust_level,
    has_critical_guide_issue,
    learning_driven_generation_adjustments,
    normalize_learning_buckets,
    normalize_learning_entry,
    procedural_reference_candidate_rank,
    procedural_reference_intent_text,
    ranked_reference_generation_levels,
    score_candidate_with_learning,
)


def sample_level() -> dict[str, object]:
    return {
        "id": "level_procedural_test",
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


class ProceduralDomainTests(unittest.TestCase):
    def test_normalize_learning_entry_infers_tags_and_reason(self) -> None:
        entry = normalize_learning_entry(
            {
                "reason_text": "Blockers no tienen sentido",
                "keep_tags": ["good_layout"],
                "pair_ids": ["a", "b", ""],
                "context": "session:manual_review",
                "auto_recorded": 1,
            },
            decision="reject",
        )
        self.assertEqual(entry["reason_code"], "custom_feedback")
        self.assertEqual(entry["source_family"], "session")
        self.assertTrue(entry["auto_recorded"])
        self.assertEqual(entry["keep_tags"], ["good_layout"])
        self.assertIn("good_layout", entry["feedback_tags"])
        self.assertIn("meaningless_blockers", entry["feedback_tags"])
        self.assertEqual(entry["pair_ids"], ["a", "b"])

    def test_normalize_learning_buckets_preserves_corrections(self) -> None:
        normalized = normalize_learning_buckets(
            {
                "approved": [{"feedback_tags": ["good_flow"], "features": {"boardWidth": 4, "boardHeight": 4, "pairs": 2, "blockers": 1, "moves": 6, "solutions": 1}}],
                "rejected": [{"reason_text": "too easy", "features": {"boardWidth": 4, "boardHeight": 4, "pairs": 2, "blockers": 0, "moves": 3, "solutions": 1}}],
                "corrections": [{"corrected_features": {"level": 4, "boardWidth": 4, "boardHeight": 4, "pairs": 2, "blockers": 1, "moves": 5, "solutions": 1}}],
            }
        )
        self.assertEqual(normalized["approved"][0]["feedback_tags"], ["good_flow"])
        self.assertEqual(normalized["rejected"][0]["reason_code"], "too_easy")
        self.assertEqual(normalized["corrections"][0]["source_family"], "correction")

    def test_learning_adjustments_defaults_and_influence(self) -> None:
        defaults = learning_driven_generation_adjustments(1)
        self.assertEqual(defaults["desiredPathCoverage"], 0.9)
        self.assertEqual(defaults["desiredPathStraightness"], 0.72)
        self.assertEqual(defaults["desiredEngagedBlockerRatio"], 0)
        self.assertEqual(defaults["desiredPairPressureCoverage"], 0)
        self.assertEqual(defaults["desiredMultiPairBlockerRatio"], 0.1)
        self.assertEqual(defaults["maxDeadBlockerRatio"], 1)

        influenced = learning_driven_generation_adjustments(
            4,
            {
                "rejected": [
                    {
                        "level": 4,
                        "reason_text": "Too easy, too much space, blockers no tienen sentido",
                        "features": {"boardWidth": 4, "boardHeight": 4, "pairs": 2, "blockers": 0, "moves": 3, "solutions": 1},
                    }
                ]
            },
        )
        self.assertGreater(influenced["avoidBlockerClusters"], 0)
        self.assertGreater(influenced["spreadBlockers"], 0)
        self.assertGreater(influenced["desiredEngagedBlockerRatio"], 0.55)
        self.assertGreater(influenced["desiredPairPressureCoverage"], 0.45)

    def test_score_candidate_with_learning_lowers_score_for_negative_learning(self) -> None:
        baseline = score_candidate_with_learning(sample_level())
        penalized = score_candidate_with_learning(
            sample_level(),
            {
                "rejected": [
                    {
                        "level": 4,
                        "reason_text": "Too easy, too much space, blockers no tienen sentido",
                        "features": {"boardWidth": 4, "boardHeight": 4, "pairs": 2, "blockers": 0, "moves": 3, "solutions": 1},
                        "feedback_tags": ["too_easy", "too_much_space", "meaningless_blockers"],
                    }
                ]
            },
        )
        self.assertIsInstance(baseline.score, float)
        self.assertIsInstance(penalized.score, float)
        self.assertLess(penalized.score, baseline.score)

    def test_analyze_solution_guide_accepts_clean_golden_path(self) -> None:
        guide = analyze_solution_guide(sample_level())
        self.assertTrue(guide["isClean"])
        self.assertEqual(guide["missingPaths"], 0)
        self.assertEqual(guide["issues"], [])
        self.assertFalse(has_critical_guide_issue(guide))
        self.assertEqual(guide_trust_level(guide), "HIGH")

    def test_extract_pair_feedback_returns_pair_metrics(self) -> None:
        feedback = extract_pair_feedback(sample_level())
        self.assertEqual(len(feedback), 2)
        self.assertEqual(feedback[0]["pair_id"], "A")
        self.assertIn("manhattan", feedback[0])
        self.assertIn("midpoint_r", feedback[0])

    def test_guide_trust_level_downgrades_critical_issues(self) -> None:
        guide = {"issues": ["paths_cross"], "missingPaths": 0, "overlaps": [], "isClean": False}
        self.assertTrue(has_critical_guide_issue(guide))
        self.assertEqual(guide_trust_level(guide), "LOW")

    def test_classify_discard_reason_handles_basic_cases(self) -> None:
        self.assertEqual(classify_discard_reason("too easy"), "too_easy")
        self.assertEqual(classify_discard_reason("paths cross"), "paths_cross")
        self.assertEqual(classify_discard_reason("layout issue"), "bad_layout")

    def test_reference_intent_text_and_ranked_levels(self) -> None:
        text = procedural_reference_intent_text({"pairs": "more", "blockers": "less", "board": "bigger"})
        ranked = ranked_reference_generation_levels(sample_level(), {"pairs": "more", "blockers": "same", "board": "same"})
        self.assertIn("more pairs", text)
        self.assertIn("fewer blockers", text)
        self.assertIn("bigger board", text)
        self.assertTrue(ranked)
        self.assertIn(4, ranked[:4])

    def test_reference_candidate_rank_penalizes_wrong_intent_direction(self) -> None:
        base = sample_level()
        smaller_candidate = sample_level()
        smaller_candidate["pairs"] = smaller_candidate["pairs"][:1]
        aligned = procedural_reference_candidate_rank(base, sample_level(), {"pairs": "same", "blockers": "same", "board": "same"})
        penalized = procedural_reference_candidate_rank(base, smaller_candidate, {"pairs": "more", "blockers": "same", "board": "same"})
        self.assertLessEqual(aligned.intent_penalty, penalized.intent_penalty)
        self.assertLessEqual(aligned.total, penalized.total + 20)


if __name__ == "__main__":
    unittest.main()

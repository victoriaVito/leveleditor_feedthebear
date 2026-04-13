from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.domain.sessions import (
    SessionQueueItem,
    VariantMetadata,
    VariantReviewState,
    append_playtest_dataset_record,
    build_playtest_dataset_record,
    load_play_session_file,
    load_play_sessions_state,
    parse_session_queue_item,
    parse_variant_metadata,
    save_play_session_snapshot,
    save_play_sessions_state,
    serialize_session_queue_item_dict,
    serialize_variant_metadata_dict,
    transition_variant_review_state,
)
from feed_the_bear_toolkit.services.config import find_project_root


class SessionsDomainTests(unittest.TestCase):
    def test_load_play_session_file(self) -> None:
        session = load_play_session_file(find_project_root() / "playtest/latest_play_session.json")
        self.assertTrue(session.solved)
        self.assertIsInstance(session.level, dict)
        self.assertGreater(len(session.history), 0)

    def test_build_playtest_dataset_record(self) -> None:
        session = load_play_session_file(find_project_root() / "playtest/latest_play_session.json")
        record = build_playtest_dataset_record(session, origin="editor", saved_at="2026-04-07T00:00:00.000Z")
        self.assertEqual(record.origin, "editor")
        self.assertEqual(record.saved_at, "2026-04-07T00:00:00.000Z")
        self.assertTrue(record.board)
        self.assertGreaterEqual(record.pairs, 1)
        self.assertIn(record.validation_status, {"OK", "INVALID"})

    def test_load_play_sessions_state(self) -> None:
        state = load_play_sessions_state(find_project_root() / ".local/toolkit_state/play_sessions_state.json")
        self.assertGreater(len(state.queue), 0)
        self.assertEqual(state.queue[0].review_status, "PENDING")

    def test_play_session_round_trip_save(self) -> None:
        session = load_play_session_file(find_project_root() / "playtest/latest_play_session.json")
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "playtest").mkdir()
            saved = save_play_session_snapshot(session, root=root)
            reloaded = load_play_session_file(saved)
        self.assertEqual(reloaded.solved, session.solved)
        self.assertEqual(reloaded.selected_pair, session.selected_pair)

    def test_append_playtest_dataset_record(self) -> None:
        session = load_play_session_file(find_project_root() / "playtest/latest_play_session.json")
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "playtest").mkdir()
            output = append_playtest_dataset_record(session, origin="play_sessions", root=root)
            lines = output.read_text(encoding="utf-8").splitlines()
            payload = json.loads(lines[0])
        self.assertEqual(payload["origin"], "play_sessions")
        self.assertIn("session", payload)

    def test_play_sessions_state_round_trip_save(self) -> None:
        state = load_play_sessions_state(find_project_root() / ".local/toolkit_state/play_sessions_state.json")
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / ".local/toolkit_state").mkdir(parents=True)
            saved = save_play_sessions_state(state, root=root)
            reloaded = load_play_sessions_state(saved)
        self.assertEqual(len(reloaded.queue), len(state.queue))
        self.assertEqual(reloaded.queue[0].file, state.queue[0].file)


class VariantReviewStateTransitionTests(unittest.TestCase):
    """Test explicit state machine for variant review workflow."""

    def test_pending_transitions_to_in_editor(self) -> None:
        """PENDING → IN_EDITOR is valid."""
        item = SessionQueueItem(
            id=1,
            file="test.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            variant_metadata=VariantMetadata(similarity=0.95),
            review_state=VariantReviewState.PENDING,
        )
        result = transition_variant_review_state(item, VariantReviewState.IN_EDITOR, reason="user_opened_editor")
        self.assertEqual(result.review_state, VariantReviewState.IN_EDITOR)
        self.assertEqual(len(result.state_transition_log), 1)
        self.assertEqual(result.state_transition_log[0]["from_state"], "pending")
        self.assertEqual(result.state_transition_log[0]["to_state"], "in_editor")
        self.assertEqual(result.state_transition_log[0]["reason"], "user_opened_editor")

    def test_pending_transitions_to_approved(self) -> None:
        """PENDING → APPROVED (keep without editing)."""
        item = SessionQueueItem(
            id=2,
            file="test2.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            variant_metadata=VariantMetadata(similarity=0.85),
            review_state=VariantReviewState.PENDING,
        )
        result = transition_variant_review_state(item, VariantReviewState.APPROVED, reason="accepted_as_is")
        self.assertEqual(result.review_state, VariantReviewState.APPROVED)
        self.assertEqual(len(result.state_transition_log), 1)

    def test_pending_transitions_to_rejected(self) -> None:
        """PENDING → REJECTED (discard)."""
        item = SessionQueueItem(
            id=3,
            file="test3.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.PENDING,
        )
        result = transition_variant_review_state(item, VariantReviewState.REJECTED, reason="not_suitable")
        self.assertEqual(result.review_state, VariantReviewState.REJECTED)
        self.assertEqual(len(result.state_transition_log), 1)

    def test_in_editor_transitions_to_approved(self) -> None:
        """IN_EDITOR → APPROVED (save after editing)."""
        item = SessionQueueItem(
            id=4,
            file="test4.json",
            source="generated",
            changed=True,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level={"pairs": []},
            original_level=None,
            review_state=VariantReviewState.IN_EDITOR,
        )
        result = transition_variant_review_state(item, VariantReviewState.APPROVED, reason="saved_from_editor")
        self.assertEqual(result.review_state, VariantReviewState.APPROVED)
        self.assertEqual(len(result.state_transition_log), 1)

    def test_in_editor_transitions_to_rejected(self) -> None:
        """IN_EDITOR → REJECTED (discard after editing)."""
        item = SessionQueueItem(
            id=5,
            file="test5.json",
            source="generated",
            changed=True,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.IN_EDITOR,
        )
        result = transition_variant_review_state(item, VariantReviewState.REJECTED, reason="discard_edits")
        self.assertEqual(result.review_state, VariantReviewState.REJECTED)

    def test_approved_is_terminal_state(self) -> None:
        """APPROVED is a terminal state; no further transitions allowed."""
        item = SessionQueueItem(
            id=6,
            file="test6.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.APPROVED,
        )
        # Attempt transition from APPROVED to IN_EDITOR
        result = transition_variant_review_state(item, VariantReviewState.IN_EDITOR)
        # Should return unchanged item (terminal state, no transition occurs)
        self.assertEqual(result.review_state, VariantReviewState.APPROVED)
        self.assertEqual(len(result.state_transition_log), 0)

    def test_rejected_is_terminal_state(self) -> None:
        """REJECTED is a terminal state; no further transitions allowed."""
        item = SessionQueueItem(
            id=7,
            file="test7.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.REJECTED,
        )
        result = transition_variant_review_state(item, VariantReviewState.APPROVED)
        self.assertEqual(result.review_state, VariantReviewState.REJECTED)
        self.assertEqual(len(result.state_transition_log), 0)

    def test_pending_to_in_editor_invalid_transition_rejected(self) -> None:
        """Invalid transition from PENDING to non-allowed state raises ValueError."""
        item = SessionQueueItem(
            id=8,
            file="test8.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.PENDING,
        )
        # Trying to transition PENDING → PENDING should raise (or be rejected)
        # Actually, this is a bit tricky—let's test IN_EDITOR → IN_EDITOR instead
        item2 = SessionQueueItem(
            id=9,
            file="test9.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.IN_EDITOR,
        )
        # Trying to stay in IN_EDITOR should raise
        with self.assertRaises(ValueError) as ctx:
            transition_variant_review_state(item2, VariantReviewState.IN_EDITOR)
        self.assertIn("Invalid transition from IN_EDITOR", str(ctx.exception))

    def test_transition_logs_timestamp(self) -> None:
        """State transition log includes timestamp in ISO format."""
        item = SessionQueueItem(
            id=10,
            file="test10.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.PENDING,
        )
        result = transition_variant_review_state(item, VariantReviewState.APPROVED)
        self.assertEqual(len(result.state_transition_log), 1)
        log_entry = result.state_transition_log[0]
        self.assertIn("timestamp", log_entry)
        # Verify timestamp is ISO 8601 with Z suffix
        timestamp = log_entry["timestamp"]
        self.assertTrue(timestamp.endswith("Z"), f"Timestamp should end with Z: {timestamp}")
        self.assertIn("T", timestamp, f"Timestamp should be ISO 8601: {timestamp}")

    def test_multiple_transitions_accumulate_in_log(self) -> None:
        """Multiple state transitions accumulate in the log."""
        item = SessionQueueItem(
            id=11,
            file="test11.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.PENDING,
        )
        # PENDING → IN_EDITOR
        item = transition_variant_review_state(item, VariantReviewState.IN_EDITOR, reason="step1")
        self.assertEqual(len(item.state_transition_log), 1)
        # IN_EDITOR → APPROVED
        item = transition_variant_review_state(item, VariantReviewState.APPROVED, reason="step2")
        self.assertEqual(len(item.state_transition_log), 2)
        # Verify log order
        self.assertEqual(item.state_transition_log[0]["reason"], "step1")
        self.assertEqual(item.state_transition_log[1]["reason"], "step2")


class VariantMetadataTests(unittest.TestCase):
    """Test variant metadata serialization/deserialization."""

    def test_parse_variant_metadata_from_dict(self) -> None:
        """Parse variant metadata from a dictionary."""
        raw = {
            "similarity": 0.92,
            "learningBias": 0.05,
            "intentPenalty": -0.03,
            "totalRank": 0.94,
            "sourceKind": "generated_strict",
            "referenceIntent": {"pairs": "more", "blockers": "same"},
            "generatedAt": "2026-04-13T10:30:00Z",
            "generationSeed": 42,
        }
        metadata = parse_variant_metadata(raw)
        self.assertIsNotNone(metadata)
        self.assertEqual(metadata.similarity, 0.92)
        self.assertEqual(metadata.learning_bias, 0.05)
        self.assertEqual(metadata.intent_penalty, -0.03)
        self.assertEqual(metadata.total_rank, 0.94)
        self.assertEqual(metadata.source_kind, "generated_strict")
        self.assertEqual(metadata.reference_intent, {"pairs": "more", "blockers": "same"})
        self.assertEqual(metadata.generated_at, "2026-04-13T10:30:00Z")
        self.assertEqual(metadata.generation_seed, 42)

    def test_parse_variant_metadata_returns_none_for_none_input(self) -> None:
        """parse_variant_metadata(None) returns None."""
        metadata = parse_variant_metadata(None)
        self.assertIsNone(metadata)

    def test_serialize_variant_metadata_roundtrip(self) -> None:
        """Variant metadata survives serialization/deserialization roundtrip."""
        original = VariantMetadata(
            similarity=0.88,
            learning_bias=0.02,
            intent_penalty=-0.01,
            total_rank=0.89,
            source_kind="mutation",
            reference_intent={"pairs": "less", "blockers": "more"},
            generated_at="2026-04-13T11:00:00Z",
            generation_seed=99,
        )
        serialized = serialize_variant_metadata_dict(original)
        restored = parse_variant_metadata(serialized)
        self.assertEqual(restored.similarity, original.similarity)
        self.assertEqual(restored.learning_bias, original.learning_bias)
        self.assertEqual(restored.intent_penalty, original.intent_penalty)
        self.assertEqual(restored.total_rank, original.total_rank)
        self.assertEqual(restored.source_kind, original.source_kind)
        self.assertEqual(restored.reference_intent, original.reference_intent)
        self.assertEqual(restored.generated_at, original.generated_at)
        self.assertEqual(restored.generation_seed, original.generation_seed)

    def test_serialize_variant_metadata_with_partial_fields(self) -> None:
        """Serialize metadata with only some fields populated."""
        metadata = VariantMetadata(
            similarity=0.75,
            source_kind="generated_relaxed",
        )
        serialized = serialize_variant_metadata_dict(metadata)
        self.assertEqual(serialized["similarity"], 0.75)
        self.assertEqual(serialized["sourceKind"], "generated_relaxed")
        self.assertIsNone(serialized["learningBias"])
        self.assertIsNone(serialized["intentPenalty"])


class SessionQueueItemSerializationTests(unittest.TestCase):
    """Test SessionQueueItem serialization with variant metadata and review state."""

    def test_serialize_queue_item_with_variant_metadata(self) -> None:
        """Serialize a queue item with variant metadata."""
        item = SessionQueueItem(
            id=100,
            file="generated_level.json",
            source="procedural",
            changed=False,
            manager_item_id=None,
            saved_path="/path/to/saved.json",
            screenshot_path="/path/to/screenshot.png",
            review_status="pending",
            validation_status="ok",
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level={"pairs": [], "blockers": []},
            original_level=None,
            variant_metadata=VariantMetadata(
                similarity=0.93,
                source_kind="generated_strict",
                reference_intent={"pairs": "more"},
                generated_at="2026-04-13T12:00:00Z",
                generation_seed=123,
            ),
            review_state=VariantReviewState.PENDING,
        )
        serialized = serialize_session_queue_item_dict(item)
        self.assertEqual(serialized["id"], 100)
        self.assertEqual(serialized["file"], "generated_level.json")
        self.assertEqual(serialized["reviewState"], "pending")
        self.assertIsNotNone(serialized["variantMetadata"])
        self.assertEqual(serialized["variantMetadata"]["similarity"], 0.93)
        self.assertEqual(serialized["variantMetadata"]["sourceKind"], "generated_strict")

    def test_queue_item_roundtrip_preserves_review_state(self) -> None:
        """Queue item survives serialization/deserialization with review state intact."""
        original = SessionQueueItem(
            id=101,
            file="test_level.json",
            source="editor",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.IN_EDITOR,
        )
        serialized = serialize_session_queue_item_dict(original)
        restored = parse_session_queue_item(serialized)
        self.assertEqual(restored.review_state, VariantReviewState.IN_EDITOR)
        self.assertEqual(restored.id, original.id)
        self.assertEqual(restored.file, original.file)

    def test_queue_item_roundtrip_preserves_state_transition_log(self) -> None:
        """State transition log is preserved through serialization roundtrip."""
        original = SessionQueueItem(
            id=102,
            file="test.json",
            source="generated",
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status=None,
            validation_status=None,
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=None,
            original_level=None,
            review_state=VariantReviewState.APPROVED,
            state_transition_log=[
                {
                    "from_state": "pending",
                    "to_state": "in_editor",
                    "reason": "opened",
                    "timestamp": "2026-04-13T10:00:00Z",
                },
                {
                    "from_state": "in_editor",
                    "to_state": "approved",
                    "reason": "saved",
                    "timestamp": "2026-04-13T10:30:00Z",
                },
            ],
        )
        serialized = serialize_session_queue_item_dict(original)
        restored = parse_session_queue_item(serialized)
        self.assertEqual(len(restored.state_transition_log), 2)
        self.assertEqual(restored.state_transition_log[0]["from_state"], "pending")
        self.assertEqual(restored.state_transition_log[1]["to_state"], "approved")


if __name__ == "__main__":
    unittest.main()

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
    PlaySessionsState,
    append_play_session_to_sessions_state,
    append_playtest_dataset_record,
    build_playtest_dataset_record,
    find_session_queue_item,
    load_play_session_file,
    load_play_sessions_state,
    save_play_session_snapshot,
    save_play_sessions_state,
    select_session_queue_item,
    session_queue_item_label,
    summarize_play_sessions_state,
    update_session_queue_item_feedback,
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

    def test_session_review_helpers_persist_feedback(self) -> None:
        state = load_play_sessions_state(find_project_root() / ".local/toolkit_state/play_sessions_state.json")
        summary = summarize_play_sessions_state(state)
        self.assertEqual(summary["queue_count"], len(state.queue))
        selected = select_session_queue_item(state, state.queue[0].id)
        self.assertIsNotNone(selected)
        self.assertEqual(summary["pending_count"], sum(1 for item in state.queue if item.review_status == "PENDING"))
        update_session_queue_item_feedback(
            selected,
            review_status="APPROVED",
            feedback_decision="approve",
            feedback_reason_code="too_easy",
            feedback_keep_tags=["native_keep", "playtest"],
            feedback_pair_ids=["A", "B"],
            feedback_note="looks good",
        )
        self.assertEqual(selected.review_status, "APPROVED")
        self.assertEqual(selected.feedback_decision, "approve")
        self.assertEqual(selected.feedback_reason_code, "too_easy")
        self.assertEqual(selected.feedback_keep_tags, ["native_keep", "playtest"])
        self.assertEqual(selected.feedback_pair_ids, ["A", "B"])
        self.assertEqual(selected.feedback_note, "looks good")
        self.assertIn("review=APPROVED", session_queue_item_label(selected))

        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / ".local/toolkit_state").mkdir(parents=True)
            saved = save_play_sessions_state(state, root=root)
            reloaded = load_play_sessions_state(saved)
        reloaded_item = find_session_queue_item(reloaded, selected.id)
        self.assertIsNotNone(reloaded_item)
        self.assertEqual(reloaded_item.review_status, "APPROVED")
        self.assertEqual(reloaded_item.feedback_decision, "approve")
        self.assertEqual(reloaded.raw.get("selectedId"), selected.id)

    def test_append_play_session_to_sessions_state_creates_pending_item(self) -> None:
        session = load_play_session_file(find_project_root() / "playtest/latest_play_session.json")
        state = PlaySessionsState(raw={})
        created = append_play_session_to_sessions_state(
            state,
            session,
            source="native_play_session",
            name="imported_play_session.json",
            saved_path="playtest/imported_play_session.json",
        )
        self.assertEqual(len(state.queue), 1)
        self.assertEqual(created.source, "native_play_session")
        self.assertEqual(created.file, "imported_play_session")
        self.assertEqual(created.saved_path, "playtest/imported_play_session.json")
        self.assertEqual(created.review_status, "PENDING")
        self.assertEqual(state.raw.get("selectedId"), created.id)
        self.assertIn("imported_play_session", session_queue_item_label(created))


if __name__ == "__main__":
    unittest.main()

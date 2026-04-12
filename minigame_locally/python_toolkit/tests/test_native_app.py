from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.domain.levels import load_level_file
from feed_the_bear_toolkit.domain.levels import serialize_level_to_canonical_dict
from feed_the_bear_toolkit.domain.levels import serialize_level_to_canonical_json
from feed_the_bear_toolkit.domain.progressions import ManagerMetadata, ProgressionConfig, ProgressionSlot
from feed_the_bear_toolkit.domain.sessions import PlaySessionsState, SessionQueueItem
from feed_the_bear_toolkit.services.config import find_project_root
from feed_the_bear_toolkit.services.repo_io import save_text_file
from feed_the_bear_toolkit.ui.native_app import (
    add_manager_progression,
    apply_editor_cell_action,
    batch_queueable_indices,
    batch_review_session_items,
    build_editor_level_state,
    create_manager_progression,
    editor_level_state_to_level,
    editor_source_path_for_session_item,
    normalized_editor_source_name,
    ordered_manager_progression_keys,
    remove_manager_progression,
    rename_manager_progression,
    save_level_to_progression_slot,
    save_session_review_learning_feedback,
    update_batch_review_state,
)


class NativeAppParityTests(unittest.TestCase):
    def test_editor_roundtrip_preserves_metadata_except_edited_fields(self) -> None:
        root = find_project_root()
        level = load_level_file(root / "levels/Progression B · Level 2.json")
        baseline = serialize_level_to_canonical_dict(level, "Progression B · Level 2.json")

        editor_state = build_editor_level_state(level)
        editor_state["moves"] = int(editor_state["moves"]) + 2
        editor_state["difficultyTier"] = int(editor_state["difficultyTier"]) + 1
        editor_state["targetDensity"] = "HIGH"
        apply_editor_cell_action(
            editor_state,
            row=0,
            col=0,
            mode="blocker",
            selected_pair_id="A",
            pair_type="blue",
        )

        updated = editor_level_state_to_level(editor_state)
        updated_raw = serialize_level_to_canonical_dict(updated, "Progression B · Level 2.json")

        self.assertEqual(updated_raw["id"], baseline["id"])
        self.assertEqual(updated_raw["gridSize"], baseline["gridSize"])
        self.assertEqual(updated_raw["pairs"], baseline["pairs"])
        self.assertEqual(updated_raw.get("meta"), baseline.get("meta"))
        self.assertEqual(updated_raw.get("validation"), baseline.get("validation"))
        self.assertEqual(updated_raw.get("goldenPath"), baseline.get("goldenPath"))
        self.assertEqual(updated_raw["moves"], baseline["moves"] + 2)
        self.assertEqual(updated_raw["difficultyTier"], baseline["difficultyTier"] + 1)
        self.assertEqual(updated_raw["targetDensity"], "HIGH")
        self.assertEqual(len(updated_raw.get("blockers", [])), len(baseline.get("blockers", [])) + 1)

    def test_editor_canvas_actions_support_place_block_and_erase_loop(self) -> None:
        root = find_project_root()
        level = load_level_file(root / "levels/Progression B · Level 2.json")
        editor_state = build_editor_level_state(level)

        apply_editor_cell_action(
            editor_state,
            row=1,
            col=1,
            mode="start",
            selected_pair_id="A",
            pair_type="cyan",
        )
        apply_editor_cell_action(
            editor_state,
            row=1,
            col=2,
            mode="end",
            selected_pair_id="A",
            pair_type="cyan",
        )
        apply_editor_cell_action(
            editor_state,
            row=2,
            col=2,
            mode="blocker",
            selected_pair_id="A",
            pair_type="cyan",
        )
        apply_editor_cell_action(
            editor_state,
            row=2,
            col=2,
            mode="erase",
            selected_pair_id="A",
            pair_type="cyan",
        )

        updated = editor_level_state_to_level(editor_state)
        pair_a = next(pair for pair in updated.pairs if pair.id == "A")
        self.assertEqual((pair_a.start.y, pair_a.start.x), (1, 1))
        self.assertEqual((pair_a.end.y, pair_a.end.x), (1, 2))
        self.assertEqual(pair_a.type, "cyan")
        self.assertFalse(any(cell.y == 2 and cell.x == 2 for cell in updated.blockers))

    def test_standalone_save_reopen_keeps_edited_fields(self) -> None:
        root = find_project_root()
        level = load_level_file(root / "levels/Progression B · Level 2.json")
        editor_state = build_editor_level_state(level)
        editor_state["moves"] = 13
        editor_state["targetDensity"] = "LOW"
        apply_editor_cell_action(
            editor_state,
            row=0,
            col=0,
            mode="blocker",
            selected_pair_id="A",
            pair_type="blue",
        )

        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            payload_level = editor_level_state_to_level(editor_state)
            save_text_file(
                "output/python_toolkit_checks/edited_level.json",
                serialize_level_to_canonical_json(payload_level, "edited_level.json"),
                temp_root,
            )
            reopened = load_level_file(temp_root / "output/python_toolkit_checks/edited_level.json")

        self.assertEqual(reopened.moves, 13)
        self.assertEqual(reopened.target_density, "LOW")
        self.assertEqual(len(reopened.blockers), len(level.blockers) + 1)

    def test_opened_session_and_procedural_sources_keep_stable_editor_paths(self) -> None:
        session_item = SessionQueueItem(
            id=7,
            file="queued_from_session.json",
            source="test",
            changed=False,
            manager_item_id=None,
            saved_path="levels/progression_a/slot_2.json",
            screenshot_path="",
            review_status="PENDING",
            validation_status="OK",
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level={"id": "session_level", "board_width": 5, "board_height": 5, "pairs": [], "blockers": []},
            original_level=None,
            raw={},
        )
        self.assertEqual(editor_source_path_for_session_item(session_item), "levels/progression_a/slot_2.json")
        self.assertEqual(normalized_editor_source_name("variant_alpha", "fallback.json"), "variant_alpha.json")
        self.assertEqual(normalized_editor_source_name("learned_batch_01.json", "fallback.json"), "learned_batch_01.json")
        variant = SimpleNamespace(name="variant_keep", level=None)
        self.assertEqual(normalized_editor_source_name(variant.name, "procedural_variant.json"), "variant_keep.json")

    def test_batch_review_state_helpers_mark_queueable_items(self) -> None:
        states: dict[int, dict[str, str]] = {}
        states = update_batch_review_state(states, 0, status="pending")
        states = update_batch_review_state(states, 1, status="kept", saved_path="output/a.json")
        states = update_batch_review_state(states, 2, status="discarded", reason_code="too_easy")
        self.assertEqual(states[1]["status"], "kept")
        self.assertEqual(states[1]["saved_path"], "output/a.json")
        self.assertEqual(states[2]["reason_code"], "too_easy")
        self.assertEqual(batch_queueable_indices(4, states), [0, 1, 3])

    def test_create_add_rename_remove_manager_progression_helpers(self) -> None:
        created = create_manager_progression("progression_test", tutorial_level_file="levels/tutorial_level.json")
        self.assertEqual(created.name, "progression_test")
        self.assertEqual(len(created.slots), 2)
        self.assertEqual(created.slots[0].slot, 0)
        self.assertEqual(created.slots[0].status, "reserved")
        self.assertEqual(created.slots[1].slot, 1)
        self.assertEqual(created.slots[1].status, "empty")

        live: dict[str, ProgressionConfig] = {}
        order: list[str] = []
        key = add_manager_progression(live, order, "progression_a")
        self.assertEqual(key, "progression_a")
        self.assertIn("progression_a", live)
        self.assertEqual(order, ["progression_a"])

        renamed = rename_manager_progression(
            live,
            order,
            current_name="progression_a",
            target_name="progression_alpha",
        )
        self.assertEqual(renamed, "progression_alpha")
        self.assertIn("progression_alpha", live)
        self.assertNotIn("progression_a", live)
        self.assertEqual(order, ["progression_alpha"])

        removed = remove_manager_progression(live, order, "progression_alpha")
        self.assertEqual(removed, "progression_alpha")
        self.assertEqual(live, {})
        self.assertEqual(order, [])

    def test_batch_review_session_items_updates_pending_and_keeps_non_pending(self) -> None:
        state = PlaySessionsState(
            queue=[
                SessionQueueItem(
                    id=101,
                    file="a",
                    source="test",
                    changed=False,
                    manager_item_id=None,
                    saved_path="",
                    screenshot_path="",
                    review_status="PENDING",
                    validation_status="OK",
                    feedback_decision="",
                    feedback_reason_code="",
                    feedback_keep_tags=[],
                    feedback_pair_ids=[],
                    feedback_note="",
                    level={"id": "L1", "board_width": 5, "board_height": 5, "pairs": [], "blockers": []},
                    original_level=None,
                    raw={},
                ),
                SessionQueueItem(
                    id=102,
                    file="b",
                    source="test",
                    changed=False,
                    manager_item_id=None,
                    saved_path="",
                    screenshot_path="",
                    review_status="APPROVED",
                    validation_status="OK",
                    feedback_decision="approve",
                    feedback_reason_code="",
                    feedback_keep_tags=[],
                    feedback_pair_ids=[],
                    feedback_note="",
                    level={"id": "L2", "board_width": 5, "board_height": 5, "pairs": [], "blockers": []},
                    original_level=None,
                    raw={},
                ),
            ],
            raw={},
        )
        result = batch_review_session_items(
            state,
            review_status="REJECTED",
            feedback_decision="reject",
            reason_code="too_easy",
            keep_tags=["native_keep"],
            pair_ids=["A"],
            note="batch decision",
            only_pending=True,
        )
        self.assertEqual(result["updated_count"], 1)
        self.assertEqual(result["queue_count"], 2)
        pending = state.queue[0]
        approved = state.queue[1]
        self.assertEqual(pending.review_status, "REJECTED")
        self.assertEqual(pending.feedback_decision, "reject")
        self.assertEqual(pending.feedback_reason_code, "too_easy")
        self.assertEqual(pending.feedback_keep_tags, ["native_keep"])
        self.assertEqual(pending.feedback_pair_ids, ["A"])
        self.assertEqual(pending.feedback_note, "batch decision")
        self.assertEqual(approved.review_status, "APPROVED")
        self.assertEqual(state.raw.get("selectedId"), 101)

    def test_ordered_manager_progression_keys_uses_metadata_order(self) -> None:
        live = {
            "progressionC": ProgressionConfig(name="progressionC", locked=False, tutorial_level_file=None, slots=[]),
            "progressionA": ProgressionConfig(name="progressionA", locked=False, tutorial_level_file=None, slots=[]),
            "progressionB": ProgressionConfig(name="progressionB", locked=False, tutorial_level_file=None, slots=[]),
        }
        metadata = ManagerMetadata(
            saved_at=None,
            reason=None,
            active_tab="manager",
            selected_id=None,
            counts={},
            progression_order=["progressionB", "progressionA"],
            filters={},
            raw={},
        )
        self.assertEqual(
            ordered_manager_progression_keys(live, metadata),
            ["progressionB", "progressionA", "progressionC"],
        )

    def test_save_level_to_progression_slot_updates_slot_and_writes_file(self) -> None:
        root = find_project_root()
        level = load_level_file(root / "levels/Progression B · Level 2.json")
        progression = ProgressionConfig(
            name="progression_x",
            locked=False,
            tutorial_level_file=None,
            slots=[
                ProgressionSlot(slot=0, level_file="levels/tutorial_level.json", status="reserved", label="TUTORIAL"),
                ProgressionSlot(slot=1, level_file=None, status="empty", label=None),
            ],
            raw={},
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            saved = save_level_to_progression_slot(
                level,
                progression,
                1,
                project_root=temp_root,
                output_path="levels/progression_x/slot_1.json",
            )
            self.assertEqual(saved.resolve(), (temp_root / "levels/progression_x/slot_1.json").resolve())
            self.assertTrue(saved.exists())
            self.assertEqual(progression.slots[1].level_file, "levels/progression_x/slot_1.json")
            self.assertEqual(progression.slots[1].status, "assigned")

    def test_save_session_review_learning_feedback_persists_learning_record(self) -> None:
        root = find_project_root()
        level = load_level_file(root / "levels/Progression B · Level 2.json")
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            learning_path = temp_root / ".local/toolkit_state/native_session_learning.json"
            saved_path, buckets, record = save_session_review_learning_feedback(
                level,
                decision="reject",
                project_root=temp_root,
                learning_path=learning_path,
                reason_code="too_easy",
                keep_tags=["native_keep", "playtest"],
                pair_ids=["A", "B"],
                note="looks good",
            )
            self.assertEqual(saved_path.resolve(), learning_path.resolve())
            self.assertEqual(len(buckets["rejected"]), 1)
            self.assertEqual(record["reason_code"], "too_easy")
            self.assertEqual(record["keep_tags"], ["native_keep", "playtest"])
            self.assertEqual(record["pair_ids"], ["A", "B"])
            self.assertEqual(record["note_text"], "looks good")
            self.assertIn("too_easy", record["feedback_tags"])


if __name__ == "__main__":
    unittest.main()

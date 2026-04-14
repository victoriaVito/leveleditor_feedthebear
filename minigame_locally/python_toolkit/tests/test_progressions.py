from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.domain.progressions import (
    default_progression_paths,
    expected_slot_from_level_file,
    load_live_progressions,
    load_manager_metadata,
    load_progression_file,
    parse_progression_level_file_name,
    progression_letter_to_number,
    progression_number_to_letter,
    save_live_progressions,
    save_manager_metadata,
    save_progression_file,
    validate_progression_levels,
)
from feed_the_bear_toolkit.services.config import find_project_root


class ProgressionDomainTests(unittest.TestCase):
    def test_load_progression_file(self) -> None:
        progression = load_progression_file(find_project_root() / "progressions/progression_g.json")
        self.assertEqual(progression.name, "progression_g")
        self.assertTrue(progression.locked)
        self.assertEqual(len(progression.slots), 11)
        self.assertEqual(progression.assigned_slots, 10)
        self.assertTrue(progression.slots[0].is_tutorial)

    def test_load_manager_metadata(self) -> None:
        metadata = load_manager_metadata(find_project_root() / "progressions/manager_state/level_manager_metadata.json")
        self.assertEqual(metadata.reason, "manager_update")
        self.assertIn("progression_9", metadata.progression_order)
        self.assertIn("total_items", metadata.counts)
        self.assertIn("name", metadata.filters)

    def test_load_live_progressions(self) -> None:
        live = load_live_progressions(find_project_root() / "progressions/manager_progressions_live.json")
        self.assertIn("progressionA", live)
        self.assertIn("progression_9", live)
        self.assertTrue(live["progressionA"].slots[0].is_tutorial)

    def test_default_progression_paths(self) -> None:
        paths = default_progression_paths(find_project_root())
        self.assertTrue(paths["live"].exists())
        self.assertTrue(paths["metadata"].exists())

    def test_load_progression_from_temp_file(self) -> None:
        sample = {
            "name": "progression_x",
            "locked": False,
            "tutorial_level_file": "levels/tutorial_level.json",
            "slots": [
                {"slot": 0, "status": "reserved", "label": "TUTORIAL"},
                {"slot": 1, "level_file": "levels/foo.json"},
            ],
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "progression_x.json"
            path.write_text(json.dumps(sample), encoding="utf-8")
            loaded = load_progression_file(path)
        self.assertEqual(loaded.name, "progression_x")
        self.assertEqual(loaded.assigned_slots, 1)

    def test_validate_progression_levels_detects_missing_level(self) -> None:
        sample = {
            "name": "progression_x",
            "locked": False,
            "tutorial_level_file": "levels/tutorial_level.json",
            "slots": [
                {"slot": 0, "status": "reserved", "label": "TUTORIAL"},
                {"slot": 1, "level_file": "levels/progression_x_level1.json"},
            ],
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "levels").mkdir()
            path = root / "progression_x.json"
            path.write_text(json.dumps(sample), encoding="utf-8")
            loaded = load_progression_file(path)
            summary = validate_progression_levels(loaded, root)
        self.assertEqual(summary.checked_levels, 1)
        self.assertEqual(summary.missing_levels, 1)
        self.assertEqual(summary.invalid_levels, 0)

    def test_progression_letter_number_conversion(self) -> None:
        self.assertEqual(progression_letter_to_number("a"), 1)
        self.assertEqual(progression_letter_to_number("i"), 9)
        self.assertEqual(progression_number_to_letter(1), "a")
        self.assertEqual(progression_number_to_letter(9), "i")

    def test_parse_progression_level_file_name(self) -> None:
        parsed = parse_progression_level_file_name("levels/progression_b/jsons/progression_b_level2.json")
        self.assertEqual(parsed, ("b", 2, False))
        parsed_review = parse_progression_level_file_name("progression_c_level7_needs_review.json")
        self.assertEqual(parsed_review, ("c", 7, True))
        self.assertIsNone(parse_progression_level_file_name("legacy_c_7.json"))

    def test_expected_slot_from_level_file(self) -> None:
        self.assertEqual(expected_slot_from_level_file("levels/progression_b/jsons/progression_b_level2.json"), 2)
        self.assertIsNone(expected_slot_from_level_file("progression_b_level2_needs_review.json"))

    def test_validate_progression_levels_detects_slot_mismatch_for_validated_name(self) -> None:
        sample = {
            "name": "progression_b",
            "locked": False,
            "tutorial_level_file": "levels/tutorial_level.json",
            "slots": [
                {"slot": 0, "status": "reserved", "label": "TUTORIAL"},
                {"slot": 5, "level_file": "levels/progression_b/jsons/progression_b_level2.json"},
            ],
        }
        progression = load_progression_file(find_project_root() / "progressions/progression_g.json")
        progression.name = sample["name"]
        progression.locked = sample["locked"]
        progression.tutorial_level_file = sample["tutorial_level_file"]
        progression.slots = [
            progression.slots[0],
            type(progression.slots[0])(slot=5, level_file="levels/progression_b/jsons/progression_b_level2.json"),
        ]
        summary = validate_progression_levels(progression, find_project_root())
        self.assertEqual(summary.checked_levels, 1)
        self.assertEqual(summary.invalid_levels, 1)
        self.assertIn("validated level slot mismatch", summary.entries[0].load_error or "")

    def test_validate_progression_levels_detects_progression_letter_mismatch(self) -> None:
        progression = load_progression_file(find_project_root() / "progressions/progression_g.json")
        progression.name = "progression_c"
        progression.slots = [
            progression.slots[0],
            type(progression.slots[0])(slot=2, level_file="levels/progression_b/jsons/progression_b_level2.json"),
        ]
        summary = validate_progression_levels(progression, find_project_root())
        self.assertEqual(summary.checked_levels, 1)
        self.assertEqual(summary.invalid_levels, 1)
        self.assertIn("level file letter mismatch", summary.entries[0].load_error or "")

    def test_progression_round_trip_save(self) -> None:
        progression = load_progression_file(find_project_root() / "progressions/progression_g.json")
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "progressions").mkdir()
            saved = save_progression_file(progression, "progressions/progression_g.json", root)
            reloaded = load_progression_file(saved)
        self.assertEqual(reloaded.name, progression.name)
        self.assertEqual(len(reloaded.slots), len(progression.slots))

    def test_manager_and_live_round_trip_save(self) -> None:
        metadata = load_manager_metadata(find_project_root() / "progressions/manager_state/level_manager_metadata.json")
        live = load_live_progressions(find_project_root() / "progressions/manager_progressions_live.json")
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "progressions/manager_state").mkdir(parents=True)
            saved_metadata = save_manager_metadata(metadata, root=root)
            saved_live = save_live_progressions(live, root=root)
            reloaded_metadata = load_manager_metadata(saved_metadata)
            reloaded_live = load_live_progressions(saved_live)
        self.assertEqual(reloaded_metadata.active_tab, metadata.active_tab)
        self.assertEqual(sorted(reloaded_live), sorted(live))


if __name__ == "__main__":
    unittest.main()

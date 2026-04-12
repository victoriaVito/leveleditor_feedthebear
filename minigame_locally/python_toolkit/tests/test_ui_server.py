from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.services.config import find_project_root
from feed_the_bear_toolkit.ui.app import app_status, build_app_snapshot, render_app_html
from feed_the_bear_toolkit.ui.server import dispatch_request


class UiServerTests(unittest.TestCase):
    def test_app_status_and_rendered_shell(self) -> None:
        status = app_status()
        snapshot = build_app_snapshot(find_project_root())
        html = render_app_html(snapshot)
        self.assertIn("Level Inspector", html)
        self.assertIn("Mini Editor", html)
        self.assertIn("/api/preview-level-edit", html)
        self.assertIn("editor-pair-id", html)
        self.assertIn("session-generate-learned-btn", html)
        self.assertIn("Pack QA + Progressions", html)
        self.assertIn("Procedural + Spreadsheet", html)
        self.assertIn("procedural-score-btn", html)
        self.assertIn("procedural-reference-btn", html)
        self.assertIn("data-save-variant", html)
        self.assertIn("spreadsheet-status-btn", html)
        self.assertIn("spreadsheet-disconnect-btn", html)
        self.assertIn("Sessions", html)
        self.assertIn("Python UI shell", status)

    def test_dispatch_level_inspector_and_pack_summary(self) -> None:
        root = find_project_root()
        level_status, level_payload = dispatch_request(
            "GET",
            "/api/inspect-level",
            query={"path": "levels/Progression B · Level 2.json"},
            root=root,
        )
        pack_status, pack_payload = dispatch_request(
            "GET",
            "/api/summarize-level-pack",
            query={"folder": "levels/progression_g"},
            root=root,
        )
        progression_status, progression_payload = dispatch_request(
            "GET",
            "/api/validate-progression",
            query={"path": "progressions/progression_g.json"},
            root=root,
        )
        procedural_status, procedural_payload = dispatch_request(
            "GET",
            "/api/procedural-score-level",
            query={
                "path": "levels/Progression B · Level 2.json",
                "learning_path": ".local/toolkit_state/learning_state.json",
            },
            root=root,
        )
        spreadsheet_status, spreadsheet_payload = dispatch_request(
            "GET",
            "/api/spreadsheet-status",
            query={
                "credentials_path": ".local/google_oauth_client.json",
                "token_path": ".local/google_sheets_token.json",
            },
            root=root,
        )
        reference_status, reference_payload = dispatch_request(
            "GET",
            "/api/procedural-reference-variants",
            query={
                "path": "levels/Progression B · Level 2.json",
                "learning_path": ".local/toolkit_state/learning_state.json",
                "pairs": "more",
                "blockers": "same",
                "board": "same",
                "count": "2",
            },
            root=root,
        )
        self.assertEqual(level_status, 200)
        self.assertTrue(level_payload["ok"])
        self.assertEqual(level_payload["level"]["cols"], 5)
        self.assertEqual(len(level_payload["level"]["cells"]), 5)
        self.assertEqual(len(level_payload["level"]["blockers"]), 1)
        self.assertEqual(pack_status, 200)
        self.assertTrue(pack_payload["ok"])
        self.assertGreaterEqual(pack_payload["summary"]["file_count"], 1)
        self.assertEqual(progression_status, 200)
        self.assertTrue(progression_payload["ok"])
        self.assertGreaterEqual(progression_payload["summary"]["checked_levels"], 1)
        self.assertEqual(procedural_status, 200)
        self.assertTrue(procedural_payload["ok"])
        self.assertIn("score", procedural_payload)
        self.assertEqual(spreadsheet_status, 200)
        self.assertTrue(spreadsheet_payload["ok"])
        self.assertTrue(spreadsheet_payload["status"]["ready"])
        self.assertEqual(reference_status, 200)
        self.assertTrue(reference_payload["ok"])
        self.assertLessEqual(len(reference_payload["variants"]), 2)
        generated_raw_status, generated_raw_payload = dispatch_request(
            "GET",
            "/api/procedural-generate-raw",
            query={"level_number": "4", "seed_offset": "0", "learning_path": ".local/toolkit_state/learning_state.json"},
            root=root,
        )
        generated_best_status, generated_best_payload = dispatch_request(
            "GET",
            "/api/procedural-generate-level",
            query={"level_number": "4", "attempts": "3", "learning_path": ".local/toolkit_state/learning_state.json"},
            root=root,
        )
        generated_batch_status, generated_batch_payload = dispatch_request(
            "GET",
            "/api/procedural-generate-batch",
            query={"start_level": "3", "end_level": "4", "count": "3", "learning_path": ".local/toolkit_state/learning_state.json"},
            root=root,
        )
        self.assertEqual(generated_raw_status, 200)
        self.assertTrue(generated_raw_payload["ok"])
        self.assertEqual(generated_best_status, 200)
        self.assertTrue(generated_best_payload["ok"])
        self.assertEqual(generated_batch_status, 200)
        self.assertTrue(generated_batch_payload["ok"])
        self.assertGreaterEqual(generated_batch_payload["produced_count"], 1)

    def test_dispatch_level_editor_preview_and_save(self) -> None:
        root = find_project_root()
        preview_status, preview_payload = dispatch_request(
            "POST",
            "/api/preview-level-edit",
            payload={
                "source_path": "levels/Progression B · Level 2.json",
                "id": "edited_preview_level",
                "difficulty_tier": "4",
                "cols": "5",
                "rows": "5",
                "moves": "8",
                "solution_count": "2",
                "target_density": "MEDIUM",
                "decal": "false",
                "pairs_json": json.dumps(
                    [
                        {"id": "A", "type": "blue", "start": [0, 0], "end": [0, 4]},
                        {"id": "B", "type": "green", "start": [4, 0], "end": [4, 4]},
                    ]
                ),
                "blockers_json": json.dumps([[2, 2]]),
                "golden_path_json": json.dumps({"A": [[0, 0], [0, 1], [0, 4]]}),
                "validation_json": json.dumps({"solvable": True, "curve_integrity": True}),
                "meta_json": json.dumps({"source_name": "edited_preview_level.json", "manual_difficulty": "MEDIUM"}),
            },
            root=root,
        )
        self.assertEqual(preview_status, 200)
        self.assertTrue(preview_payload["ok"])
        self.assertEqual(preview_payload["level"]["id"], "edited_preview_level")
        self.assertIn('"difficultyTier": 4', preview_payload["canonical_json"])
        self.assertIn('"goldenPath"', preview_payload["canonical_json"])
        self.assertIn('"manual_difficulty": "MEDIUM"', preview_payload["canonical_json"])

        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            (temp_root / "levels").mkdir(parents=True)
            source_target = temp_root / "levels/base.json"
            source_target.write_text(
                (root / "levels/Progression B · Level 2.json").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            save_status, save_payload = dispatch_request(
                "POST",
                "/api/save-level-edit",
                payload={
                    "source_path": "levels/base.json",
                    "id": "saved_preview_level",
                    "difficulty_tier": "5",
                    "cols": "5",
                    "rows": "5",
                    "moves": "9",
                    "solution_count": "3",
                    "target_density": "HIGH",
                    "decal": "true",
                    "pairs_json": json.dumps(
                        [
                            {"id": "A", "type": "blue", "start": [0, 0], "end": [0, 4]},
                            {"id": "B", "type": "green", "start": [4, 0], "end": [4, 4]},
                        ]
                    ),
                    "blockers_json": json.dumps([[2, 2]]),
                    "golden_path_json": json.dumps({"A": [[0, 0], [0, 1], [0, 4]]}),
                    "validation_json": json.dumps({"solvable": True, "curve_integrity": True}),
                    "meta_json": json.dumps({"source_name": "saved_preview_level.json", "manual_difficulty": "HARD"}),
                    "output": "output/edited_level.json",
                },
                root=temp_root,
            )
            self.assertEqual(save_status, 200)
            self.assertTrue(save_payload["ok"])
            self.assertEqual(save_payload["level"]["id"], "saved_preview_level")
            written = temp_root / "output/edited_level.json"
            self.assertTrue(written.exists())
            saved_text = written.read_text(encoding="utf-8")
            self.assertIn('"id": "saved_preview_level"', saved_text)
            self.assertIn('"goldenPath"', saved_text)
            self.assertIn('"manual_difficulty": "HARD"', saved_text)

    def test_dispatch_save_procedural_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            status, payload = dispatch_request(
                "POST",
                "/api/save-procedural-candidate",
                payload={"output": "output/candidate.json", "canonical_json": '{"id":"candidate"}'},
                root=temp_root,
            )
            self.assertEqual(status, 200)
            self.assertTrue(payload["ok"])
            self.assertTrue((temp_root / "output/candidate.json").exists())

    def test_dispatch_learning_record_and_generated_batch_import(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            canonical_json = json.dumps(
                {
                    "id": "learned_batch_test",
                    "difficultyTier": 4,
                    "gridSize": {"cols": 5, "rows": 5},
                    "moves": 8,
                    "pairs": [
                        {"id": "A", "type": "blue", "a": {"x": 0, "y": 0}, "b": {"x": 4, "y": 0}},
                        {"id": "B", "type": "green", "a": {"x": 0, "y": 4}, "b": {"x": 4, "y": 4}},
                    ],
                    "blockers": [{"x": 2, "y": 2}],
                    "solutionCount": 1,
                    "targetDensity": "MEDIUM",
                    "goldenPath": {"A": [[0, 0], [0, 1], [0, 4]]},
                    "validation": {"solvable": True, "curve_integrity": True},
                    "meta": {"source_name": "learned_batch_test.json"},
                }
            )
            learning_status, learning_payload = dispatch_request(
                "POST",
                "/api/procedural-learning-record",
                payload={
                    "decision": "reject",
                    "context": "python_ui_reference_discard",
                    "canonical_json": canonical_json,
                    "reason_code": "paths_cross",
                    "note_text": "crosses in the middle",
                    "pair_ids": ["A"],
                },
                root=temp_root,
            )
            self.assertEqual(learning_status, 200)
            self.assertTrue(learning_payload["ok"])
            self.assertEqual(learning_payload["decision"], "reject")
            self.assertEqual(learning_payload["rejected_count"], 1)
            learning_file = temp_root / ".local/toolkit_state/learning_state.json"
            self.assertTrue(learning_file.exists())
            learning_saved = json.loads(learning_file.read_text(encoding="utf-8"))
            self.assertEqual(len(learning_saved["rejected"]), 1)
            self.assertEqual(learning_saved["rejected"][0]["reason_code"], "paths_cross")

            batch_status, batch_payload = dispatch_request(
                "POST",
                "/api/session-import-generated-batch",
                payload={
                    "source": "learned",
                    "levels": [{"name": "learned_batch_01.json", "canonical_json": canonical_json}],
                },
                root=temp_root,
            )
            self.assertEqual(batch_status, 200)
            self.assertTrue(batch_payload["ok"])
            self.assertEqual(batch_payload["imported_count"], 1)
            sessions_file = temp_root / ".local/toolkit_state/play_sessions_state.json"
            self.assertTrue(sessions_file.exists())
            sessions_saved = json.loads(sessions_file.read_text(encoding="utf-8"))
            self.assertEqual(len(sessions_saved["queue"]), 1)
            self.assertEqual(sessions_saved["queue"][0]["source"], "learned")
            self.assertEqual(sessions_saved["queue"][0]["validationStatus"], "OK")

    def test_build_snapshot_tolerates_invalid_learning_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            local_dir = temp_root / ".local/toolkit_state"
            local_dir.mkdir(parents=True, exist_ok=True)
            (local_dir / "learning_state.json").write_text("{bad json", encoding="utf-8")
            snapshot = build_app_snapshot(temp_root)
            self.assertEqual(snapshot["procedural"]["approved_count"], 0)

    @patch("feed_the_bear_toolkit.ui.server.run_spreadsheet_command")
    def test_dispatch_spreadsheet_run_route_uses_wrapper(self, mock_run) -> None:
        from feed_the_bear_toolkit.services.spreadsheet import SpreadsheetCommandResult

        root = find_project_root()
        mock_run.return_value = SpreadsheetCommandResult(
            key="check_env",
            command=("bash", "scripts/check_google_sheets_env.sh"),
            cwd=root,
            ok=True,
            returncode=0,
            stdout="env ok\n",
        )
        status, payload = dispatch_request(
            "POST",
            "/api/spreadsheet-run",
            payload={"key": "check_env"},
            root=root,
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        mock_run.assert_called_once()

    @patch("feed_the_bear_toolkit.ui.server.clear_spreadsheet_ui_cache")
    @patch("feed_the_bear_toolkit.ui.server.disconnect_spreadsheet_token")
    def test_dispatch_spreadsheet_local_actions(self, mock_disconnect, mock_clear_cache) -> None:
        from feed_the_bear_toolkit.services.spreadsheet import SpreadsheetLocalActionResult

        root = find_project_root()
        mock_disconnect.return_value = SpreadsheetLocalActionResult(
            key="disconnect",
            ok=True,
            target=root / ".local/google_sheets_token.json",
            deleted=True,
            message="Removed the saved Google Sheets API token.",
        )
        mock_clear_cache.return_value = SpreadsheetLocalActionResult(
            key="clear_cache",
            ok=True,
            target=root / ".local/python_toolkit_ui",
            deleted=True,
            message="Removed the Python UI cache directory.",
        )

        disconnect_status, disconnect_payload = dispatch_request(
            "POST",
            "/api/spreadsheet-disconnect",
            payload={"token_path": ".local/google_sheets_token.json"},
            root=root,
        )
        clear_status, clear_payload = dispatch_request(
            "POST",
            "/api/spreadsheet-clear-cache",
            payload={},
            root=root,
        )
        self.assertEqual(disconnect_status, 200)
        self.assertTrue(disconnect_payload["ok"])
        self.assertEqual(clear_status, 200)
        self.assertTrue(clear_payload["ok"])


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.cli import main
from feed_the_bear_toolkit.domain.levels import load_level_file
from feed_the_bear_toolkit.domain.validation import validate_level_structure
from feed_the_bear_toolkit.services.config import find_project_root, resolve_repo_path


class ToolkitCliTests(unittest.TestCase):
    def test_status_command_runs(self) -> None:
        with redirect_stdout(StringIO()):
            self.assertEqual(main(["status"]), 0)

    def test_level_validation_passes_for_valid_shape(self) -> None:
        sample = {
            "id": "sample_level",
            "difficultyTier": 2,
            "gridSize": {"cols": 5, "rows": 5},
            "moves": 6,
            "pairs": [
                {"type": "blue", "a": {"x": 0, "y": 0}, "b": {"x": 4, "y": 0}},
                {"type": "green", "a": {"x": 0, "y": 4}, "b": {"x": 4, "y": 4}},
            ],
            "blockers": [{"x": 2, "y": 2}],
        }
        with temporary_level_file(sample) as path:
            level = load_level_file(path)
            result = validate_level_structure(level)

        self.assertTrue(result.valid)
        self.assertEqual(result.errors, ())

    def test_legacy_aliases_parse_successfully(self) -> None:
        sample = {
            "id": "legacy_level",
            "board_width": 5,
            "board_height": 6,
            "level": 3,
            "moves": "7",
            "pairs": [
                {"type": "blue", "start": [0, 0], "end": [0, 4]},
                {"type": "green", "start": [5, 0], "end": [5, 4]},
            ],
            "blockers": [[2, 2]],
            "solution_count": "2",
            "target_density": "MEDIUM",
            "golden_path": {"A": [[0, 0], [0, 4]], "B": [[5, 0], [5, 4]]},
        }
        with temporary_level_file(sample) as path:
            level = load_level_file(path)

        self.assertEqual(level.cols, 5)
        self.assertEqual(level.rows, 6)
        self.assertEqual(level.difficulty_tier, 3)
        self.assertEqual(level.solution_count, 2)
        self.assertEqual(level.target_density, "MEDIUM")
        self.assertEqual(len(level.blockers), 1)

    def test_incomplete_level_parses_but_fails_validation(self) -> None:
        sample = {
            "id": "broken_level",
            "difficultyTier": None,
            "gridSize": {"cols": None, "rows": None},
            "moves": None,
            "pairs": [],
            "solutionCount": "-",
            "targetDensity": "-",
        }
        with temporary_level_file(sample) as path:
            level = load_level_file(path)
            result = validate_level_structure(level)

        self.assertEqual(level.id, "broken_level")
        self.assertFalse(result.valid)
        self.assertIn("level 1..10 required", result.errors)
        self.assertIn("moves must be a valid number", result.errors)

    def test_repo_relative_resolution_works_from_python_toolkit(self) -> None:
        resolved = resolve_repo_path(Path("levels/Progression B · Level 2.json"))
        self.assertTrue(resolved.exists())
        self.assertEqual(resolved.name, "Progression B · Level 2.json")
        self.assertEqual(resolved.parent, find_project_root() / "levels")

    def test_moves_below_pairs_produces_warning(self) -> None:
        sample = {
            "id": "warning_level",
            "difficultyTier": 2,
            "gridSize": {"cols": 5, "rows": 5},
            "moves": 1,
            "pairs": [
                {"type": "blue", "a": {"x": 0, "y": 0}, "b": {"x": 4, "y": 0}},
                {"type": "green", "a": {"x": 0, "y": 4}, "b": {"x": 4, "y": 4}},
            ],
        }
        with temporary_level_file(sample) as path:
            result = validate_level_structure(load_level_file(path))

        self.assertTrue(result.valid)
        self.assertTrue(result.warnings)
        self.assertIn("moves budget (1) below pairs (2)", result.warnings[0])

    def test_invalid_golden_path_shape_fails_validation(self) -> None:
        sample = {
            "id": "golden_path_level",
            "difficultyTier": 2,
            "gridSize": {"cols": 5, "rows": 5},
            "moves": 6,
            "pairs": [
                {"type": "blue", "a": {"x": 0, "y": 0}, "b": {"x": 4, "y": 0}},
                {"type": "green", "a": {"x": 0, "y": 4}, "b": {"x": 4, "y": 4}},
            ],
            "goldenPath": {"A": [["bad", 0]], "Z": [[0, 0], [0, 1]]},
        }
        with temporary_level_file(sample) as path:
            result = validate_level_structure(load_level_file(path))

        self.assertFalse(result.valid)
        self.assertIn("goldenPath[A] contains an invalid coordinate pair", result.errors)
        self.assertTrue(any("goldenPath key 'Z' must be in" in error for error in result.errors))

    def test_placeholder_solution_and_density_fail_on_populated_level(self) -> None:
        sample = {
            "id": "placeholder_level",
            "difficultyTier": 2,
            "gridSize": {"cols": 5, "rows": 5},
            "moves": 6,
            "pairs": [
                {"type": "blue", "a": {"x": 0, "y": 0}, "b": {"x": 4, "y": 0}},
                {"type": "green", "a": {"x": 0, "y": 4}, "b": {"x": 4, "y": 4}},
            ],
            "solutionCount": "-",
            "targetDensity": "-",
        }
        with temporary_level_file(sample) as path:
            result = validate_level_structure(load_level_file(path))

        self.assertFalse(result.valid)
        self.assertIn(
            "solutionCount is placeholder/missing on an otherwise populated level",
            result.errors,
        )
        self.assertIn(
            "targetDensity is blank/placeholder on an otherwise populated level",
            result.errors,
        )

    def test_cli_file_status_and_progression_inspection(self) -> None:
        with redirect_stdout(StringIO()):
            self.assertEqual(main(["file-status", "levels/Progression B · Level 2.json"]), 0)
            self.assertEqual(main(["serialize-level", "levels/Progression B · Level 2.json"]), 0)
            self.assertEqual(main(["inspect-progression", "progressions/progression_g.json"]), 0)
            self.assertEqual(main(["validate-progression", "progressions/progression_g.json"]), 0)
            self.assertEqual(main(["inspect-manager-metadata"]), 0)
            self.assertEqual(main(["inspect-live-progressions"]), 0)
            self.assertEqual(main(["inspect-play-session"]), 0)
            self.assertEqual(main(["inspect-play-sessions-state"]), 0)
            self.assertEqual(main(["procedural-score-level", "levels/Progression B · Level 2.json", "--learning-path", ".local/toolkit_state/learning_state.json"]), 0)
            self.assertIn(
                main(["spreadsheet-status", "--credentials-path", ".local/google_oauth_client.json", "--token-path", ".local/google_sheets_token.json"]),
                (0, 1),
            )

    @patch("feed_the_bear_toolkit.cli.launch_native_app")
    def test_sessions_ui_command_launches_native_app_on_sessions_tab(self, mock_launch) -> None:
        mock_launch.return_value = 0
        with redirect_stdout(StringIO()):
            self.assertEqual(main(["sessions-ui", "--play-session-path", "playtest/latest_play_session.json"]), 0)
        mock_launch.assert_called_once()
        args, kwargs = mock_launch.call_args
        self.assertEqual(kwargs["initial_tab"], "sessions")
        self.assertEqual(kwargs["play_session_path"], "playtest/latest_play_session.json")
        self.assertEqual(kwargs["sessions_state_path"], ".local/toolkit_state/play_sessions_state.json")

    @patch("feed_the_bear_toolkit.cli.launch_native_app")
    def test_spreadsheet_ui_command_launches_native_app_on_spreadsheet_tab(self, mock_launch) -> None:
        mock_launch.return_value = 0
        with redirect_stdout(StringIO()):
            self.assertEqual(main(["spreadsheet-ui"]), 0)
        mock_launch.assert_called_once()
        args, kwargs = mock_launch.call_args
        self.assertEqual(kwargs["initial_tab"], "spreadsheet")

    def test_cli_mutating_commands_run_in_temp_repo(self) -> None:
        actual_root = find_project_root()
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_root = Path(tmp_dir)
            self._copy_fixture(
                actual_root / "progressions/progression_g.json",
                temp_root / "progressions/progression_g.json",
            )
            self._copy_fixture(
                actual_root / "progressions/manager_state/level_manager_metadata.json",
                temp_root / "progressions/manager_state/level_manager_metadata.json",
            )
            self._copy_fixture(
                actual_root / "progressions/manager_progressions_live.json",
                temp_root / "progressions/manager_progressions_live.json",
            )
            self._copy_fixture(
                actual_root / "playtest/latest_play_session.json",
                temp_root / "playtest/latest_play_session.json",
            )
            self._copy_fixture(
                actual_root / ".local/toolkit_state/play_sessions_state.json",
                temp_root / ".local/toolkit_state/play_sessions_state.json",
            )
            with patch("feed_the_bear_toolkit.cli.find_project_root", return_value=temp_root):
                with redirect_stdout(StringIO()):
                    self.assertEqual(main(["save-progression", "progressions/progression_g.json", "--output", "progressions/test_progression_roundtrip.json"]), 0)
                    self.assertEqual(main(["save-manager-metadata", "--output", "progressions/manager_state/test_level_manager_metadata.json"]), 0)
                    self.assertEqual(main(["save-live-progressions", "--output", "progressions/test_manager_progressions_live.json"]), 0)
                    self.assertEqual(main(["append-playtest-record", "playtest/latest_play_session.json", "--origin", "editor"]), 0)
                    self.assertEqual(main(["save-play-session", "playtest/latest_play_session.json", "--output", "playtest/test_latest_play_session.json"]), 0)
                    self.assertEqual(main(["save-play-sessions-state", ".local/toolkit_state/play_sessions_state.json", "--output", ".local/toolkit_state/test_play_sessions_state.json"]), 0)
            self.assertTrue((temp_root / "progressions/test_progression_roundtrip.json").exists())
            self.assertTrue((temp_root / "progressions/manager_state/test_level_manager_metadata.json").exists())
            self.assertTrue((temp_root / "progressions/test_manager_progressions_live.json").exists())
            self.assertTrue((temp_root / "playtest/playtest_events.jsonl").exists())
            self.assertTrue((temp_root / "playtest/test_latest_play_session.json").exists())
            self.assertTrue((temp_root / ".local/toolkit_state/test_play_sessions_state.json").exists())

    @patch("feed_the_bear_toolkit.cli.run_spreadsheet_command")
    def test_cli_spreadsheet_run_command_uses_wrapper(self, mock_run) -> None:
        from feed_the_bear_toolkit.services.spreadsheet import SpreadsheetCommandResult

        mock_run.return_value = SpreadsheetCommandResult(
            key="check_env",
            command=("bash", "scripts/check_google_sheets_env.sh"),
            cwd=find_project_root(),
            ok=True,
            returncode=0,
            stdout="env ok\n",
        )
        with redirect_stdout(StringIO()):
            self.assertEqual(
                main(
                    [
                        "spreadsheet-run",
                        "check_env",
                        "--credentials-path",
                        ".local/custom_client.json",
                        "--token-path",
                        ".local/custom_token.json",
                    ]
                ),
                0,
            )
        mock_run.assert_called_once()
        _args, kwargs = mock_run.call_args
        self.assertEqual(kwargs["credentials_path"], ".local/custom_client.json")
        self.assertEqual(kwargs["token_path"], ".local/custom_token.json")

    @patch("feed_the_bear_toolkit.cli.create_server")
    def test_serve_ui_command_creates_server_once(self, mock_create_server) -> None:
        class StubServer:
            server_address = ("127.0.0.1", 8765)

            def __init__(self) -> None:
                self.forever_called = 0
                self.close_called = 0

            def serve_forever(self) -> None:
                self.forever_called += 1

            def server_close(self) -> None:
                self.close_called += 1

        server = StubServer()
        mock_create_server.return_value = server
        with redirect_stdout(StringIO()):
            self.assertEqual(main(["serve-ui", "--host", "127.0.0.1", "--port", "8765"]), 0)
        mock_create_server.assert_called_once()
        self.assertEqual(server.forever_called, 1)
        self.assertEqual(server.close_called, 1)

    @patch("feed_the_bear_toolkit.cli.launch_native_app")
    def test_native_ui_command_launches_native_app(self, mock_launch_native_app) -> None:
        mock_launch_native_app.return_value = 0
        with redirect_stdout(StringIO()):
            self.assertEqual(
                main(
                    [
                        "native-ui",
                        "--tab",
                        "pack",
                        "--level-path",
                        "levels/Progression B · Level 2.json",
                        "--progression-path",
                        "progressions/progression_g.json",
                        "--pack-folder",
                        "levels/progression_g",
                        "--play-session-path",
                        "playtest/latest_play_session.json",
                        "--sessions-state-path",
                        ".local/toolkit_state/play_sessions_state.json",
                    ]
                ),
                0,
            )
        mock_launch_native_app.assert_called_once_with(
            find_project_root(),
            initial_tab="pack",
            level_path="levels/Progression B · Level 2.json",
            progression_path="progressions/progression_g.json",
            pack_folder="levels/progression_g",
            play_session_path="playtest/latest_play_session.json",
            sessions_state_path=".local/toolkit_state/play_sessions_state.json",
        )

    @patch("feed_the_bear_toolkit.cli.launch_native_app")
    def test_native_ui_manager_tab_launches_native_app(self, mock_launch_native_app) -> None:
        mock_launch_native_app.return_value = 0
        with redirect_stdout(StringIO()):
            self.assertEqual(main(["native-ui", "--tab", "manager"]), 0)
        mock_launch_native_app.assert_called_once_with(
            find_project_root(),
            initial_tab="manager",
            level_path=None,
            progression_path=None,
            pack_folder=None,
            play_session_path=None,
            sessions_state_path=None,
        )

    def _copy_fixture(self, source: Path, target: Path) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")


class temporary_level_file:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.temp_dir: tempfile.TemporaryDirectory[str] | None = None
        self.path: Path | None = None

    def __enter__(self) -> Path:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.path = Path(self.temp_dir.name) / "level.json"
        self.path.write_text(json.dumps(self.payload), encoding="utf-8")
        return self.path

    def __exit__(self, exc_type, exc, tb) -> None:
        if self.temp_dir is not None:
            self.temp_dir.cleanup()


if __name__ == "__main__":
    unittest.main()

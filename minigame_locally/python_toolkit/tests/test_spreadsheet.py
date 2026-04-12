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

from feed_the_bear_toolkit.services.spreadsheet import (
    SpreadsheetAdapterStatus,
    SpreadsheetAuthStatus,
    SpreadsheetCommandResult,
    SpreadsheetToolchainStatus,
    GOOGLE_SHEETS_SCOPE,
    build_spreadsheet_command_specs,
    clear_spreadsheet_ui_cache,
    disconnect_spreadsheet_token,
    format_spreadsheet_rename_plan,
    format_spreadsheet_command_help,
    format_spreadsheet_status,
    inspect_spreadsheet_auth,
    inspect_spreadsheet_rename_plan,
    inspect_spreadsheet_status,
    recommend_spreadsheet_action_keys,
    run_spreadsheet_command,
    spreadsheet_command_choices,
)


class SpreadsheetServiceTests(unittest.TestCase):
    def test_command_specs_include_requested_wrappers(self) -> None:
        specs = build_spreadsheet_command_specs(Path.cwd())
        keys = [spec.key for spec in specs]

        self.assertEqual(
            keys,
            [
                "sync_local",
                "sync_push",
                "sync_all",
                "sync_drive_sheets",
                "sync_apis",
                "apply_sheet_renames",
                "oauth_setup",
                "check_env",
                "validate_env_local",
            ],
        )
        self.assertEqual(specs[0].command, ("npm", "run", "sync:sheets:local"))
        self.assertEqual(specs[1].command, ("npm", "run", "sync:sheets:push"))
        self.assertEqual(specs[2].command, ("npm", "run", "sync:all"))
        self.assertEqual(specs[3].command, ("npm", "run", "sync:drive-sheets"))
        self.assertEqual(specs[4].command, ("npm", "run", "sync:apis"))
        self.assertEqual(specs[5].command, ("npm", "run", "apply:sheet-renames"))
        self.assertEqual(specs[6].command, ("npm", "run", "oauth:setup"))
        self.assertEqual(specs[7].command, ("bash", "scripts/check_google_sheets_env.sh"))
        self.assertEqual(specs[8].command, ("npm", "run", "validate:env:local"))

    def test_command_choices_and_help_follow_specs(self) -> None:
        specs = build_spreadsheet_command_specs(Path.cwd())
        self.assertEqual(spreadsheet_command_choices(Path.cwd()), tuple(spec.key for spec in specs))
        rendered = format_spreadsheet_command_help(Path.cwd())
        self.assertIn("Spreadsheet commands:", rendered)
        self.assertIn("- sync_local", rendered)

    def test_auth_status_detects_oauth_client_and_token(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            local_dir = root / ".local"
            local_dir.mkdir()
            (local_dir / "google_oauth_client.json").write_text(
                json.dumps({"installed": {"client_id": "client-123"}}),
                encoding="utf-8",
            )
            (local_dir / "google_sheets_token.json").write_text(
                json.dumps({"refresh_token": "refresh-abc", "scope": "scope-1"}),
                encoding="utf-8",
            )

            with patch("feed_the_bear_toolkit.services.spreadsheet.find_project_root", return_value=root):
                auth = inspect_spreadsheet_auth(root)

            self.assertTrue(auth.credentials_exists)
            self.assertTrue(auth.token_exists)
            self.assertTrue(auth.credentials_configured)
            self.assertTrue(auth.token_configured)
            self.assertTrue(auth.connected)
            self.assertEqual(auth.auth_mode, "oauth_client")
            self.assertEqual(auth.client_id, "client-123")
            self.assertEqual(auth.scope, GOOGLE_SHEETS_SCOPE)

    def test_auth_status_detects_service_account(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            local_dir = root / ".local"
            local_dir.mkdir()
            (local_dir / "google_oauth_client.json").write_text(
                json.dumps({
                    "type": "service_account",
                    "client_email": "svc@example.com",
                    "project_id": "proj-1",
                }),
                encoding="utf-8",
            )

            with patch("feed_the_bear_toolkit.services.spreadsheet.find_project_root", return_value=root):
                auth = inspect_spreadsheet_auth(root)

            self.assertEqual(auth.auth_mode, "service_account")
            self.assertTrue(auth.connected)
            self.assertTrue(auth.token_configured)
            self.assertEqual(auth.client_email, "svc@example.com")
            self.assertEqual(auth.project_id, "proj-1")

    @patch("feed_the_bear_toolkit.services.spreadsheet.subprocess.run")
    @patch("feed_the_bear_toolkit.services.spreadsheet.shutil.which", side_effect=lambda name: "/usr/bin/" + name)
    def test_run_spreadsheet_command_uses_subprocess_with_root_cwd(self, _mock_which, mock_run) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "package.json").write_text(
                json.dumps({"scripts": {"sync:sheets:local": "node scripts/sync_google_sheets_payload.mjs --canonical"}}),
                encoding="utf-8",
            )
            mock_run.return_value = __import__("subprocess").CompletedProcess(
                args=["npm", "run", "sync:sheets:local"],
                returncode=0,
                stdout="ok\n",
                stderr="",
            )

            with patch("feed_the_bear_toolkit.services.spreadsheet.find_project_root", return_value=root):
                result = run_spreadsheet_command("sync_local", root)

            self.assertTrue(result.ok)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stdout, "ok\n")
            mock_run.assert_called_once()
            called_args, called_kwargs = mock_run.call_args
            self.assertEqual(called_args[0], ["npm", "run", "sync:sheets:local"])
            self.assertEqual(called_kwargs["cwd"], root)
            self.assertFalse(called_kwargs["check"])
            self.assertTrue(called_kwargs["capture_output"])
            self.assertTrue(called_kwargs["text"])
            self.assertEqual(called_kwargs["env"]["GOOGLE_OAUTH_CLIENT_PATH"], str((root / ".local/google_oauth_client.json").resolve()))
            self.assertEqual(called_kwargs["env"]["GOOGLE_SHEETS_TOKEN_PATH"], str((root / ".local/google_sheets_token.json").resolve()))

    def test_status_render_includes_commands_and_health(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            auth = SpreadsheetAuthStatus(
                root=root,
                credentials_path=root / ".local/google_oauth_client.json",
                token_path=root / ".local/google_sheets_token.json",
                credentials_exists=False,
                token_exists=False,
                credentials_configured=False,
                token_configured=False,
                connected=False,
                auth_mode="none",
                messages=("Missing credentials file",),
            )
            status = SpreadsheetAdapterStatus(
                root=root,
                auth=auth,
                toolchain=SpreadsheetToolchainStatus(
                    node_available=False,
                    npm_available=False,
                    bash_available=False,
                    clasp_available=False,
                    issues=("node is not available",),
                ),
                commands=build_spreadsheet_command_specs(root),
                workbook_path=root / "output/spreadsheet/Levels_feed_the_bear_after_feedback_sync.xlsx",
                workbook_exists=False,
                payload_path=root / "output/spreadsheet/Levels_feed_the_bear_after_feedback_sync_payload.json",
                payload_exists=False,
                ready=False,
                health="blocked",
                messages=("Missing credentials file", "node is not available"),
            )

            rendered = format_spreadsheet_status(status)

            self.assertIn("Google Sheets adapter boundary", rendered)
            self.assertIn("Health: blocked", rendered)
            self.assertIn("sync_local: npm run sync:sheets:local [available]", rendered)
            self.assertIn("Workbook: missing", rendered)

    def test_inspect_status_combines_auth_and_toolchain(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            local_dir = root / ".local"
            local_dir.mkdir()
            output_dir = root / "output" / "spreadsheet"
            output_dir.mkdir(parents=True)
            (local_dir / "google_oauth_client.json").write_text(
                json.dumps({"installed": {"client_id": "client-123"}}),
                encoding="utf-8",
            )
            (local_dir / "google_sheets_token.json").write_text(
                json.dumps({"refresh_token": "refresh-abc"}),
                encoding="utf-8",
            )
            (root / "package.json").write_text(
                json.dumps(
                    {
                        "scripts": {
                            "sync:sheets:local": "node scripts/sync_google_sheets_payload.mjs --canonical",
                            "sync:sheets:push": "node scripts/sync_google_sheets_payload.mjs",
                            "sync:all": "node scripts/sync_spreadsheet_with_ai.mjs",
                            "sync:drive-sheets": "node scripts/sync_drive_folder_image_sheets.mjs",
                            "sync:apis": "node scripts/sync_apis_parallel.mjs",
                            "apply:sheet-renames": "node scripts/apply_sheet_level_renames.mjs",
                            "oauth:setup": "node scripts/reconnect_google_sheets_loopback.mjs",
                            "validate:env:local": "node scripts/validate-env.mjs --profile local",
                        }
                    }
                ),
                encoding="utf-8",
            )
            scripts_dir = root / "scripts"
            scripts_dir.mkdir()
            (scripts_dir / "check_google_sheets_env.sh").write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
            (output_dir / "Levels_feed_the_bear_after_feedback_sync.xlsx").write_text("xlsx", encoding="utf-8")
            (output_dir / "Levels_feed_the_bear_after_feedback_sync_payload.json").write_text("{}", encoding="utf-8")

            with patch("feed_the_bear_toolkit.services.spreadsheet.find_project_root", return_value=root):
                with patch("feed_the_bear_toolkit.services.spreadsheet.shutil.which", side_effect=lambda name: "/usr/bin/" + name):
                    status = inspect_spreadsheet_status(root)

            self.assertTrue(status.ready)
            self.assertEqual(status.health, "ready")
            self.assertTrue(status.auth.connected)
            self.assertTrue(status.toolchain.node_available)
            self.assertGreaterEqual(len(status.commands), 5)
            self.assertTrue(status.workbook_exists)
            self.assertTrue(status.payload_exists)

    def test_status_recommends_operational_next_steps_when_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            scripts_dir = root / "scripts"
            scripts_dir.mkdir()
            (root / "package.json").write_text(
                json.dumps(
                    {
                        "scripts": {
                            "sync:sheets:local": "node scripts/sync_google_sheets_payload.mjs --canonical",
                            "sync:sheets:push": "node scripts/sync_google_sheets_payload.mjs",
                            "sync:all": "node scripts/sync_spreadsheet_with_ai.mjs",
                            "sync:drive-sheets": "node scripts/sync_drive_folder_image_sheets.mjs",
                            "sync:apis": "node scripts/sync_apis_parallel.mjs",
                            "apply:sheet-renames": "node scripts/apply_sheet_level_renames.mjs",
                            "oauth:setup": "node scripts/reconnect_google_sheets_loopback.mjs",
                            "validate:env:local": "node scripts/validate-env.mjs --profile local",
                        }
                    }
                ),
                encoding="utf-8",
            )
            (scripts_dir / "check_google_sheets_env.sh").write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")

            with patch("feed_the_bear_toolkit.services.spreadsheet.find_project_root", return_value=root):
                with patch("feed_the_bear_toolkit.services.spreadsheet.shutil.which", side_effect=lambda name: "/usr/bin/" + name):
                    status = inspect_spreadsheet_status(root)

            recommendations = recommend_spreadsheet_action_keys(status)
            rendered = format_spreadsheet_status(status)

            self.assertFalse(status.ready)
            self.assertEqual(recommendations[:3], ("oauth_setup", "sync_local", "check_env"))
            self.assertIn("validate_env_local", recommendations)
            self.assertIn("Recommended actions:", rendered)
            self.assertIn("oauth_setup: oauth:setup", rendered)

    def test_run_spreadsheet_command_reports_missing_command(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            with self.assertRaises(KeyError):
                run_spreadsheet_command("unknown", root)

    @patch("feed_the_bear_toolkit.services.spreadsheet.shutil.which", return_value="/usr/bin/npm")
    def test_run_spreadsheet_command_fails_preflight_when_package_script_missing(self, _mock_which) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "package.json").write_text(json.dumps({"scripts": {}}), encoding="utf-8")

            with patch("feed_the_bear_toolkit.services.spreadsheet.find_project_root", return_value=root):
                result = run_spreadsheet_command("sync_local", root)

        self.assertFalse(result.ok)
        self.assertEqual(result.returncode, -1)
        self.assertIn("package.json missing script: sync:sheets:local", result.error)

    def test_disconnect_and_clear_cache_local_actions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            local_dir = root / ".local"
            local_dir.mkdir()
            token_file = local_dir / "google_sheets_token.json"
            token_file.write_text("{}", encoding="utf-8")
            cache_dir = local_dir / "python_toolkit_ui"
            cache_dir.mkdir()
            (cache_dir / "ui.pid").write_text("123", encoding="utf-8")

            with patch("feed_the_bear_toolkit.services.spreadsheet.find_project_root", return_value=root):
                disconnect_result = disconnect_spreadsheet_token(root)
                clear_result = clear_spreadsheet_ui_cache(root)

            self.assertTrue(disconnect_result.ok)
            self.assertTrue(disconnect_result.deleted)
            self.assertFalse(token_file.exists())
            self.assertTrue(clear_result.ok)
            self.assertTrue(clear_result.deleted)
            self.assertFalse(cache_dir.exists())

    def test_inspect_spreadsheet_rename_plan_parses_pending_applied_and_filter(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            payload_dir = root / "output" / "spreadsheet"
            payload_dir.mkdir(parents=True, exist_ok=True)
            payload = {
                "renameHeaders": [
                    "Occurrence ID",
                    "Progression",
                    "Current Name",
                    "Target Name",
                    "Planned File",
                    "Rename Pending",
                    "Apply Status",
                    "Notes",
                ],
                "renameRows": [
                    ["pA:01", "Progression A", "a_01", "a_01_new", "a_01_new.json", "TRUE", "", ""],
                    ["pA:02", "Progression A", "a_02", "a_02", "a_02.json", "FALSE", "APPLIED", ""],
                    ["pB:01", "Progression B", "b_01", "b_01_new", "b_01_new.json", "FALSE", "ERROR", "collision"],
                ],
            }
            (payload_dir / "Levels_feed_the_bear_after_feedback_sync_payload.json").write_text(
                json.dumps(payload),
                encoding="utf-8",
            )
            with patch("feed_the_bear_toolkit.services.spreadsheet.find_project_root", return_value=root):
                plan = inspect_spreadsheet_rename_plan(root)
                self.assertTrue(plan.payload_exists)
                self.assertEqual(plan.total_rows, 3)
                self.assertEqual(plan.pending_count, 1)
                self.assertEqual(plan.applied_count, 1)
                self.assertEqual(plan.error_count, 1)
                filtered = inspect_spreadsheet_rename_plan(root, progression_filter="Progression A")
                self.assertEqual(filtered.total_rows, 2)
                self.assertEqual(filtered.pending_count, 1)
                rendered = format_spreadsheet_rename_plan(plan, limit=2)
                self.assertIn("Spreadsheet rename plan", rendered)
                self.assertIn("Pending: 1", rendered)


if __name__ == "__main__":
    unittest.main()

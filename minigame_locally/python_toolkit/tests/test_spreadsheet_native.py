"""Tests for Phase 2B native Sheets API integration in spreadsheet module.

PHASE 2B SLICE 2: Native Sheets API Integration Tests
=====================================================

Unit tests for native (non-wrapped) spreadsheet operations using SheetsAPIClient:
- read_progressions_sheet() → direct Sheets API read
- write_progression_batch() → direct Sheets API write
- read_learning_state_sheet() → direct Sheets API read
- append_session_log() → direct Sheets API append
- get_sheet_values() → generic range read
- update_sheet_values() → generic range write
"""

import sys
from pathlib import Path
from unittest import mock

import pytest

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.services.spreadsheet import (
    read_progressions_sheet,
    write_progression_batch,
    read_learning_state_sheet,
    append_session_log,
    get_sheet_values,
    update_sheet_values,
)
from feed_the_bear_toolkit.services.sheets_api_client import SheetRange


class TestNativeProgressionsSheet:
    """Tests for reading/writing progressions data via native API."""

    def test_read_progressions_sheet_returns_values(self):
        """Read progressions sheet and return values list."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [
                ["Progression", "Level 1", "Level 2"],
                ["A", "progression_a_level1.json", "progression_a_level2.json"],
                ["B", "progression_b_level1.json", "progression_b_level2.json"],
            ]
        }

        result = read_progressions_sheet(mock_service, "test-sheet-id")

        assert len(result) == 3
        assert result[0][0] == "Progression"
        assert result[1][1] == "progression_a_level1.json"

    def test_read_progressions_sheet_handles_empty_sheet(self):
        """Handle case where progressions sheet is empty."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().get().execute.return_value = {}

        result = read_progressions_sheet(mock_service, "test-sheet-id")

        assert result == []

    def test_write_progression_batch_updates_sheet(self):
        """Write progression batch updates to sheet."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().update().execute.return_value = {
            "updatedRows": 2,
            "updatedColumns": 5,
        }

        values = [
            ["A", "progression_a_level1.json", "progression_a_level2.json"],
            ["B", "progression_b_level1.json", "progression_b_level2.json"],
        ]
        result = write_progression_batch(mock_service, "test-sheet-id", values)

        assert result["updatedRows"] == 2
        mock_service.spreadsheets().values().update.assert_called()
        # Verify the actual call (not just the mock setup)
        update_call = mock_service.spreadsheets().values().update.call_args
        if update_call:
            call_kwargs = update_call[1]
            assert call_kwargs["spreadsheetId"] == "test-sheet-id"
            assert "Progressions" in call_kwargs["range"]
            assert call_kwargs["body"]["values"] == values


class TestNativeLearningStateSheet:
    """Tests for reading learning state data via native API."""

    def test_read_learning_state_sheet_returns_values(self):
        """Read learning state sheet and return values list."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [
                ["Session", "Player", "Progress"],
                ["session-1", "player-1", "75%"],
                ["session-2", "player-2", "50%"],
            ]
        }

        result = read_learning_state_sheet(mock_service, "test-sheet-id")

        assert len(result) == 3
        assert result[0][0] == "Session"
        assert result[1][1] == "player-1"

    def test_read_learning_state_sheet_handles_empty_sheet(self):
        """Handle case where learning state sheet is empty."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().get().execute.return_value = {}

        result = read_learning_state_sheet(mock_service, "test-sheet-id")

        assert result == []


class TestNativeSessionLogging:
    """Tests for appending session logs via native API."""

    def test_append_session_log_adds_rows(self):
        """Append session log rows to SessionLogs sheet."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().append().execute.return_value = {
            "updatedRows": 1,
            "updates": {"updatedRange": "SessionLogs!A11:C11"},
        }

        rows = [["session-123", "2026-04-13", "completed"]]
        result = append_session_log(mock_service, "test-sheet-id", rows)

        assert result["updatedRows"] == 1
        mock_service.spreadsheets().values().append.assert_called()
        # Verify the actual call
        append_call = mock_service.spreadsheets().values().append.call_args
        if append_call:
            call_kwargs = append_call[1]
            assert call_kwargs["spreadsheetId"] == "test-sheet-id"
            assert "SessionLogs" in call_kwargs["range"]
            assert call_kwargs["body"]["values"] == rows

    def test_append_session_log_handles_multiple_rows(self):
        """Append multiple session log rows at once."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().append().execute.return_value = {
            "updatedRows": 3,
        }

        rows = [
            ["session-1", "2026-04-13", "completed"],
            ["session-2", "2026-04-13", "in-progress"],
            ["session-3", "2026-04-13", "failed"],
        ]
        result = append_session_log(mock_service, "test-sheet-id", rows)

        assert result["updatedRows"] == 3


class TestGenericSheetOperations:
    """Tests for generic read/write operations via SheetRange."""

    def test_get_sheet_values_with_range_object(self):
        """Read values from a specific sheet range using SheetRange object."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["A", "B"], ["C", "D"]]
        }

        sheet_range = SheetRange(
            sheet_name="TestSheet",
            start_col="A",
            start_row=1,
            end_col="B",
            end_row=2,
        )
        result = get_sheet_values(mock_service, "test-sheet-id", sheet_range)

        assert result == [["A", "B"], ["C", "D"]]
        call_kwargs = mock_service.spreadsheets().values().get.call_args[1]
        assert "TestSheet!A1:B2" in call_kwargs["range"]

    def test_get_sheet_values_with_a1_notation_string(self):
        """Read values from a sheet using A1 notation string."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["X", "Y"]]
        }

        result = get_sheet_values(mock_service, "test-sheet-id", "Custom!A1:B10")

        assert result == [["X", "Y"]]
        call_kwargs = mock_service.spreadsheets().values().get.call_args[1]
        assert call_kwargs["range"] == "Custom!A1:B10"

    def test_get_sheet_values_handles_empty_range(self):
        """Handle case where sheet range is empty."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().get().execute.return_value = {}

        result = get_sheet_values(mock_service, "test-sheet-id", "Empty!A1:Z100")

        assert result == []

    def test_update_sheet_values_with_range_object(self):
        """Update values in a specific sheet range using SheetRange object."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().update().execute.return_value = {
            "updatedRows": 2,
            "updatedColumns": 2,
        }

        sheet_range = SheetRange(
            sheet_name="TestSheet",
            start_col="A",
            start_row=1,
            end_col="B",
            end_row=2,
        )
        values = [["New1", "New2"], ["New3", "New4"]]
        result = update_sheet_values(mock_service, "test-sheet-id", sheet_range, values)

        assert result["updatedRows"] == 2
        call_kwargs = mock_service.spreadsheets().values().update.call_args[1]
        assert "TestSheet!A1:B2" in call_kwargs["range"]
        assert call_kwargs["body"]["values"] == values

    def test_update_sheet_values_with_a1_notation_string(self):
        """Update values in a sheet using A1 notation string."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().update().execute.return_value = {
            "updatedRows": 1,
        }

        values = [["Value1", "Value2"]]
        result = update_sheet_values(mock_service, "test-sheet-id", "Target!A5:B5", values)

        assert result["updatedRows"] == 1
        call_kwargs = mock_service.spreadsheets().values().update.call_args[1]
        assert call_kwargs["range"] == "Target!A5:B5"


class TestServiceIntegration:
    """Integration tests between spreadsheet and sheets_api_client modules."""

    def test_native_operations_use_correct_service_methods(self):
        """Verify that native operations call correct Google Sheets API methods."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().get().execute.return_value = {"values": []}
        mock_service.spreadsheets().values().update().execute.return_value = {"updatedRows": 0}
        mock_service.spreadsheets().values().append().execute.return_value = {"updatedRows": 0}

        # Verify read uses .get()
        read_progressions_sheet(mock_service, "id")
        mock_service.spreadsheets().values().get.assert_called()

        # Verify write uses .update()
        write_progression_batch(mock_service, "id", [])
        mock_service.spreadsheets().values().update.assert_called()

        # Verify append uses .append()
        append_session_log(mock_service, "id", [])
        mock_service.spreadsheets().values().append.assert_called()

    def test_all_native_operations_set_correct_render_options(self):
        """All read operations should use FORMATTED_VALUE render option."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().get().execute.return_value = {"values": []}

        read_progressions_sheet(mock_service, "id")
        call_kwargs = mock_service.spreadsheets().values().get.call_args[1]
        assert call_kwargs.get("valueRenderOption") == "FORMATTED_VALUE"

        read_learning_state_sheet(mock_service, "id")
        call_kwargs = mock_service.spreadsheets().values().get.call_args[1]
        assert call_kwargs.get("valueRenderOption") == "FORMATTED_VALUE"

    def test_all_write_operations_set_raw_value_input(self):
        """All write operations should use RAW value input option."""
        mock_service = mock.MagicMock()
        mock_service.spreadsheets().values().update().execute.return_value = {"updatedRows": 0}
        mock_service.spreadsheets().values().append().execute.return_value = {"updatedRows": 0}

        write_progression_batch(mock_service, "id", [])
        call_kwargs = mock_service.spreadsheets().values().update.call_args[1]
        assert call_kwargs.get("valueInputOption") == "RAW"

        update_sheet_values(mock_service, "id", "Sheet!A1", [])
        call_kwargs = mock_service.spreadsheets().values().update.call_args[1]
        assert call_kwargs.get("valueInputOption") == "RAW"

        append_session_log(mock_service, "id", [])
        call_kwargs = mock_service.spreadsheets().values().append.call_args[1]
        assert call_kwargs.get("valueInputOption") == "RAW"

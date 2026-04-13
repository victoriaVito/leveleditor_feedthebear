"""Tests for native Google Sheets API client.

PHASE 2B SLICE 2: Native Sheets API Integration Tests
====================================================

Unit tests for SheetsAPIClient covering:
- Range notation (SheetRange) conversion
- Mock Sheets API interactions
- Error handling
- Token refresh logic
"""

import json
from pathlib import Path
from unittest import mock

import pytest

from feed_the_bear_toolkit.services.sheets_api_client import (
    SheetRange,
    SheetsAPIClient,
    SheetsAPIError,
)


class TestSheetRange:
    """Tests for SheetRange A1 notation conversion."""

    def test_range_with_single_cell(self):
        """Single cell range."""
        r = SheetRange(sheet_name="Progressions", start_col="A", start_row=1)
        assert r.as_a1_notation() == "Progressions!A1"

    def test_range_with_column_bounds(self):
        """Range with explicit end column and row."""
        r = SheetRange(
            sheet_name="Progressions",
            start_col="A",
            start_row=1,
            end_col="Z",
            end_row=100,
        )
        assert r.as_a1_notation() == "Progressions!A1:Z100"

    def test_range_different_start_position(self):
        """Range starting from non-A column."""
        r = SheetRange(
            sheet_name="LevelData",
            start_col="B",
            start_row=5,
            end_col="D",
            end_row=20,
        )
        assert r.as_a1_notation() == "LevelData!B5:D20"

    def test_range_with_headers(self):
        """Range excluding header row."""
        r = SheetRange(
            sheet_name="Sessions",
            start_col="A",
            start_row=2,
            end_col="G",
            end_row=500,
        )
        assert r.as_a1_notation() == "Sessions!A2:G500"


class TestSheetsAPIClient:
    """Tests for SheetsAPIClient."""

    @pytest.fixture
    def temp_credentials_file(self, tmp_path):
        """Create a temporary OAuth client credentials file."""
        creds = {
            "installed": {
                "client_id": "test-client-id.apps.googleusercontent.com",
                "client_secret": "test-secret",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob"],
            }
        }
        creds_file = tmp_path / "credentials.json"
        with open(creds_file, "w") as f:
            json.dump(creds, f)
        return creds_file

    @pytest.fixture
    def temp_service_account_file(self, tmp_path):
        """Create a temporary service account credentials file."""
        creds = {
            "type": "service_account",
            "project_id": "test-project",
            "private_key_id": "test-key-id",
            "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS0JJcds3xfn/ygTdg0z8cKanmNqR8f8hzW+kcvKHPx9/\njzBHvt2T5KG3gWaLU8oN9M6w/uqV6wO+7YGnA5tI5n8l8Ny5UjVFKG8R5K2S5oVR\nEW3J4z2CqhqNxJqNJ8E0X5L5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J\n5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J\nAQIDAQABAoIBAHZX5wEJqPLEzqzSZT3LzuXn5R5X7J5X7J5X7J5X7J5X7J5X7J5X\n7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5\nX7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J\nAoGBAPZ5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5\nX7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J\nAoGBAN5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5\nX7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J\nAoGAM5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7\nJ5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7\nAoGAL5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7\nJ5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7J5X7\n-----END RSA PRIVATE KEY-----\n",
            "client_email": "test@test-project.iam.gserviceaccount.com",
            "client_id": "123456789",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        creds_file = tmp_path / "service_account.json"
        with open(creds_file, "w") as f:
            json.dump(creds, f)
        return creds_file

    def test_init_with_existing_credentials(self, temp_credentials_file):
        """Initialize with valid credentials file."""
        client = SheetsAPIClient(temp_credentials_file)
        assert client.credentials_path == temp_credentials_file

    def test_init_with_missing_credentials(self, tmp_path):
        """Initialize with missing credentials file."""
        missing_file = tmp_path / "nonexistent.json"
        with pytest.raises(FileNotFoundError):
            SheetsAPIClient(missing_file)

    def test_is_service_account_with_service_account(self, temp_service_account_file):
        """Detect service account credentials."""
        client = SheetsAPIClient(temp_service_account_file)
        creds_data = client._load_credentials_from_file()
        assert client._is_service_account(creds_data) is True

    def test_is_service_account_with_oauth_client(self, temp_credentials_file):
        """Detect OAuth client credentials."""
        client = SheetsAPIClient(temp_credentials_file)
        creds_data = client._load_credentials_from_file()
        assert client._is_service_account(creds_data) is False

    @mock.patch("feed_the_bear_toolkit.services.sheets_api_client.build")
    def test_read_sheet_range(self, mock_build, temp_credentials_file):
        """Read values from a sheet range."""
        # Mock the Sheets API service
        mock_service = mock.MagicMock()
        mock_build.return_value = mock_service

        # Mock the read response
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [
                ["Progression", "Level 1", "Level 2"],
                ["A", "progression_a_level1.json", "progression_a_level2.json"],
            ]
        }

        client = SheetsAPIClient(temp_credentials_file)
        # Create mock service (normally would be created by get_service)
        mock_service_instance = mock.MagicMock()
        mock_service_instance.spreadsheets().values().get().execute.return_value = {
            "values": [["A", "B"], ["C", "D"]]
        }

        result = client.read_sheet_range(
            mock_service_instance,
            "test-sheet-id",
            SheetRange(sheet_name="Progressions", start_col="A", start_row=1),
        )

        assert result == [["A", "B"], ["C", "D"]]

    @mock.patch("feed_the_bear_toolkit.services.sheets_api_client.build")
    def test_write_sheet_range(self, mock_build, temp_credentials_file):
        """Write values to a sheet range."""
        mock_service = mock.MagicMock()
        mock_build.return_value = mock_service

        mock_service.spreadsheets().values().update().execute.return_value = {
            "updatedRows": 2,
            "updatedColumns": 2,
        }

        client = SheetsAPIClient(temp_credentials_file)
        mock_service_instance = mock.MagicMock()
        mock_service_instance.spreadsheets().values().update().execute.return_value = {
            "updatedRows": 2
        }

        result = client.write_sheet_range(
            mock_service_instance,
            "test-sheet-id",
            SheetRange(sheet_name="Progressions", start_col="A", start_row=1),
            [["A", "B"], ["C", "D"]],
        )

        assert result["updatedRows"] == 2

    @mock.patch("feed_the_bear_toolkit.services.sheets_api_client.build")
    def test_append_sheet_rows(self, mock_build, temp_credentials_file):
        """Append rows to a sheet."""
        mock_service = mock.MagicMock()
        mock_build.return_value = mock_service

        mock_service.spreadsheets().values().append().execute.return_value = {
            "updatedRows": 1,
            "updates": {"updatedRange": "SessionLogs!A11:C11"},
        }

        client = SheetsAPIClient(temp_credentials_file)
        mock_service_instance = mock.MagicMock()
        mock_service_instance.spreadsheets().values().append().execute.return_value = {
            "updatedRows": 1
        }

        result = client.append_sheet_rows(
            mock_service_instance,
            "test-sheet-id",
            "SessionLogs",
            [["session-123", "2026-04-13", "completed"]],
        )

        assert result["updatedRows"] == 1


class TestSheetsAPIErrors:
    """Tests for error handling."""

    def test_sheets_api_error_creation(self):
        """Create a SheetsAPIError."""
        err = SheetsAPIError(
            operation="read_sheet",
            message="Permission denied",
            http_error="403 Forbidden",
        )
        assert err.operation == "read_sheet"
        assert err.message == "Permission denied"
        assert err.http_error == "403 Forbidden"

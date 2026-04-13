"""Native Google Sheets API client for direct Python ↔ Sheets integration.

PHASE 2B SLICE 2: Native Sheets API Integration
==============================================

This module provides native Python access to Google Sheets using google-api-python-client,
replacing the wrapped shell-based approach used in Phase 2A.

ARCHITECTURE:
=============
- SheetsAPIClient: Main class wrapping google-api-python-client
- Supports both OAuth token and service account flows
- Methods for reading/writing progression data, learning state, session logs
- Handles token refresh and retry logic

API SURFACE:
============
- get_sheets_service(): Build authenticated Sheets API service
- read_progressions_sheet(service, spreadsheet_id) -> dict of progression data
- write_progression_batch(service, spreadsheet_id, data) -> update result
- read_learning_state_sheet(service, spreadsheet_id) -> learning state records
- append_session_log(service, spreadsheet_id, rows) -> append result
- get_sheet_values(service, spreadsheet_id, range) -> raw values
- update_sheet_values(service, spreadsheet_id, range, values) -> update result

RATIONALE:
==========
- Phase 2A boundary enforcement: Spreadsheet I/O was wrapped via npm scripts
- Phase 2B enables: Direct Python orchestration without subprocess overhead
- Benefits: Async-capable, faster iteration, better error handling, smaller surface area
- Fallback: Wrapped npm scripts still available if needed during transition
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SheetRange:
    """Represents a named range on a sheet."""
    sheet_name: str
    start_col: str = "A"
    start_row: int = 1
    end_col: str | None = None
    end_row: int | None = None

    def as_a1_notation(self) -> str:
        """Convert to A1 notation (e.g., 'Progressions!A1:Z100')."""
        start = f"{self.start_col}{self.start_row}"
        if self.end_col and self.end_row:
            end = f"{self.end_col}{self.end_row}"
            return f"{self.sheet_name}!{start}:{end}"
        return f"{self.sheet_name}!{start}"


@dataclass(frozen=True)
class SheetsAPIError(Exception):
    """Error from Sheets API operation."""
    operation: str
    message: str
    http_error: str | None = None


class SheetsAPIClient:
    """Native Google Sheets API client."""

    SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"

    def __init__(self, credentials_path: Path | str):
        """Initialize with path to credentials file.

        Args:
            credentials_path: Path to OAuth client credentials or service account JSON.
        """
        self.credentials_path = Path(credentials_path)
        if not self.credentials_path.exists():
            raise FileNotFoundError(f"Credentials file not found: {credentials_path}")

    def _load_credentials_from_file(self) -> dict[str, Any]:
        """Load and parse credentials JSON."""
        with open(self.credentials_path) as f:
            return json.load(f)

    def _is_service_account(self, creds_data: dict[str, Any]) -> bool:
        """Determine if credentials are service account or OAuth client."""
        return creds_data.get("type") == "service_account"

    def get_service(self, token_path: Path | str | None = None):
        """Build and return authenticated Sheets API service.

        Args:
            token_path: Path to saved OAuth token (required for OAuth client credentials).
                       Not needed for service account credentials.

        Returns:
            Authenticated Sheets API service object.
        """
        creds_data = self._load_credentials_from_file()

        if self._is_service_account(creds_data):
            # Service account: direct authentication
            creds = ServiceAccountCredentials.from_service_account_file(
                str(self.credentials_path),
                scopes=[self.SHEETS_SCOPE]
            )
        else:
            # OAuth client: use saved token
            if not token_path:
                raise ValueError("token_path required for OAuth client credentials")

            token_file = Path(token_path)
            creds = None

            if token_file.exists():
                with open(token_file) as f:
                    token_data = json.load(f)
                creds = Credentials.from_authorized_user_info(token_data, scopes=[self.SHEETS_SCOPE])

            # Refresh if needed
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())

        return build("sheets", "v4", credentials=creds)

    def read_sheet_range(
        self,
        service: Any,
        spreadsheet_id: str,
        sheet_range: SheetRange | str,
    ) -> list[list[str]]:
        """Read values from a sheet range.

        Args:
            service: Authenticated Sheets API service.
            spreadsheet_id: ID of the Google Sheet.
            sheet_range: SheetRange object or A1 notation string.

        Returns:
            List of rows (each row is a list of column values).
        """
        range_notation = sheet_range.as_a1_notation() if isinstance(sheet_range, SheetRange) else sheet_range

        try:
            result = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_notation,
                valueRenderOption="FORMATTED_VALUE",
            ).execute()
            return result.get("values", [])
        except HttpError as e:
            raise SheetsAPIError(
                operation="read_sheet_range",
                message=f"Failed to read {range_notation}",
                http_error=str(e),
            )

    def write_sheet_range(
        self,
        service: Any,
        spreadsheet_id: str,
        sheet_range: SheetRange | str,
        values: list[list[str]],
    ) -> dict[str, Any]:
        """Write values to a sheet range.

        Args:
            service: Authenticated Sheets API service.
            spreadsheet_id: ID of the Google Sheet.
            sheet_range: SheetRange object or A1 notation string.
            values: List of rows to write.

        Returns:
            API response from write operation.
        """
        range_notation = sheet_range.as_a1_notation() if isinstance(sheet_range, SheetRange) else sheet_range

        try:
            result = service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_notation,
                valueInputOption="RAW",
                body={"values": values},
            ).execute()
            return result
        except HttpError as e:
            raise SheetsAPIError(
                operation="write_sheet_range",
                message=f"Failed to write {range_notation}",
                http_error=str(e),
            )

    def append_sheet_rows(
        self,
        service: Any,
        spreadsheet_id: str,
        sheet_name: str,
        values: list[list[str]],
    ) -> dict[str, Any]:
        """Append rows to the end of a sheet.

        Args:
            service: Authenticated Sheets API service.
            spreadsheet_id: ID of the Google Sheet.
            sheet_name: Name of the sheet (e.g., "SessionLogs").
            values: List of rows to append.

        Returns:
            API response from append operation.
        """
        range_notation = f"{sheet_name}!A:Z"

        try:
            result = service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=range_notation,
                valueInputOption="RAW",
                body={"values": values},
            ).execute()
            return result
        except HttpError as e:
            raise SheetsAPIError(
                operation="append_sheet_rows",
                message=f"Failed to append to {sheet_name}",
                http_error=str(e),
            )

    def get_sheet_metadata(
        self,
        service: Any,
        spreadsheet_id: str,
    ) -> dict[str, Any]:
        """Get metadata for all sheets in the spreadsheet.

        Args:
            service: Authenticated Sheets API service.
            spreadsheet_id: ID of the Google Sheet.

        Returns:
            Spreadsheet metadata (title, sheets, properties).
        """
        try:
            result = service.spreadsheets().get(
                spreadsheetId=spreadsheet_id,
                fields="spreadsheetId,properties,sheets",
            ).execute()
            return result
        except HttpError as e:
            raise SheetsAPIError(
                operation="get_sheet_metadata",
                message="Failed to get spreadsheet metadata",
                http_error=str(e),
            )

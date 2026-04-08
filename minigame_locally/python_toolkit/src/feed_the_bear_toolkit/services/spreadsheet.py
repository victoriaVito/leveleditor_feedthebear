from __future__ import annotations

import json
import os
import subprocess
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from feed_the_bear_toolkit.services.config import find_project_root


GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
DEFAULT_GOOGLE_CLIENT_PATH = ".local/google_oauth_client.json"
DEFAULT_GOOGLE_TOKEN_PATH = ".local/google_sheets_token.json"


@dataclass(frozen=True)
class SpreadsheetCommandSpec:
    key: str
    label: str
    command: tuple[str, ...]
    description: str
    interactive: bool = False


@dataclass(frozen=True)
class SpreadsheetCommandResult:
    key: str
    command: tuple[str, ...]
    cwd: Path
    ok: bool
    returncode: int
    stdout: str = ""
    stderr: str = ""
    error: str = ""
    timed_out: bool = False


@dataclass(frozen=True)
class SpreadsheetToolchainStatus:
    node_available: bool
    npm_available: bool
    bash_available: bool
    clasp_available: bool
    issues: tuple[str, ...] = ()


@dataclass(frozen=True)
class SpreadsheetAuthStatus:
    root: Path
    credentials_path: Path
    token_path: Path
    credentials_exists: bool
    token_exists: bool
    credentials_configured: bool
    token_configured: bool
    connected: bool
    auth_mode: str
    gcloud_auth_available: bool = False
    client_id: str = ""
    client_email: str = ""
    project_id: str = ""
    scope: str = ""
    error: str = ""
    messages: tuple[str, ...] = ()


@dataclass(frozen=True)
class SpreadsheetAdapterStatus:
    root: Path
    auth: SpreadsheetAuthStatus
    toolchain: SpreadsheetToolchainStatus
    commands: tuple[SpreadsheetCommandSpec, ...]
    ready: bool
    health: str
    messages: tuple[str, ...] = ()


@dataclass(frozen=True)
class SpreadsheetLocalActionResult:
    key: str
    ok: bool
    target: Path
    deleted: bool
    message: str = ""


def _load_json_file(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        parsed = json.load(handle)
    if not isinstance(parsed, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return parsed


def _credential_payload(payload: dict[str, object]) -> tuple[str, str, str, str]:
    if payload.get("type") == "service_account" or "private_key" in payload:
        return (
            "service_account",
            str(payload.get("client_email") or ""),
            str(payload.get("project_id") or ""),
            str(payload.get("scope") or GOOGLE_SHEETS_SCOPE),
        )

    installed = payload.get("installed")
    if isinstance(installed, dict):
        return (
            "oauth_client",
            str(installed.get("client_id") or ""),
            "",
            GOOGLE_SHEETS_SCOPE,
        )

    web = payload.get("web")
    if isinstance(web, dict):
        return (
            "oauth_client",
            str(web.get("client_id") or ""),
            "",
            GOOGLE_SHEETS_SCOPE,
        )

    raise ValueError("Unrecognized Google OAuth client JSON shape")


def inspect_spreadsheet_auth(
    root: Path | None = None,
    credentials_path: str | Path = DEFAULT_GOOGLE_CLIENT_PATH,
    token_path: str | Path = DEFAULT_GOOGLE_TOKEN_PATH,
) -> SpreadsheetAuthStatus:
    root_path = find_project_root(root)
    credentials_file = (root_path / Path(credentials_path)).resolve() if not Path(credentials_path).is_absolute() else Path(credentials_path).resolve()
    token_file = (root_path / Path(token_path)).resolve() if not Path(token_path).is_absolute() else Path(token_path).resolve()

    credentials_exists = credentials_file.exists()
    token_exists = token_file.exists()
    messages: list[str] = []
    error = ""
    auth_mode = "none"
    client_id = ""
    client_email = ""
    project_id = ""
    scope = ""
    connected = False

    if not credentials_exists:
        messages.append(f"Missing credentials file: {credentials_file}")
    else:
        try:
            credentials_payload = _load_json_file(credentials_file)
            auth_mode, parsed_client, parsed_project, parsed_scope = _credential_payload(credentials_payload)
            if auth_mode == "service_account":
                client_email = parsed_client
                project_id = parsed_project
                scope = parsed_scope
                connected = True
                messages.append("Service account credentials configured.")
            else:
                client_id = parsed_client
                scope = parsed_scope
                messages.append("OAuth client credentials configured.")
        except Exception as exc:  # pragma: no cover - defensive branch
            error = str(exc)
            messages.append(f"Credentials parse error: {error}")

    token_configured = False
    if token_exists:
        try:
            token_payload = _load_json_file(token_file)
            token_value = token_payload.get("token") if isinstance(token_payload.get("token"), dict) else token_payload
            if isinstance(token_value, dict):
                token_configured = bool(token_value.get("refresh_token") or token_value.get("access_token"))
                if not scope:
                    scope = str(token_value.get("scope") or "")
                if token_value.get("refresh_token") and auth_mode == "oauth_client":
                    connected = True
                    messages.append("OAuth token configured.")
                elif auth_mode == "oauth_client":
                    messages.append("Token file exists but has no refresh token.")
            else:
                messages.append("Token file shape is not a JSON object.")
        except Exception as exc:  # pragma: no cover - defensive branch
            error = error or str(exc)
            messages.append(f"Token parse error: {exc}")
    else:
        messages.append(f"Missing token file: {token_file}")

    if auth_mode == "oauth_client" and not token_configured and not error:
        messages.append("OAuth client configured but not connected yet.")
    if auth_mode == "none" and credentials_exists and not error:
        messages.append("Credentials file did not map to a supported auth shape.")

    if auth_mode == "service_account":
        token_configured = True

    gcloud_auth_available = shutil.which("gcloud") is not None
    if not connected and gcloud_auth_available:
        messages.append("gcloud is available as a fallback auth path.")

    return SpreadsheetAuthStatus(
        root=root_path,
        credentials_path=credentials_file,
        token_path=token_file,
        credentials_exists=credentials_exists,
        token_exists=token_exists,
        credentials_configured=credentials_exists and not bool(error and not token_exists),
        token_configured=token_configured,
        connected=connected,
        auth_mode=auth_mode,
        gcloud_auth_available=gcloud_auth_available,
        client_id=client_id,
        client_email=client_email,
        project_id=project_id,
        scope=scope,
        error=error,
        messages=tuple(messages),
    )


def build_spreadsheet_command_specs(root: Path | None = None) -> tuple[SpreadsheetCommandSpec, ...]:
    _ = find_project_root(root)
    return (
        SpreadsheetCommandSpec(
            key="sync_local",
            label="sync:sheets:local",
            command=("npm", "run", "sync:sheets:local"),
            description="Regenerate the canonical workbook and payload from bundles, then prepare a local sync payload.",
        ),
        SpreadsheetCommandSpec(
            key="sync_push",
            label="sync:sheets:push",
            command=("npm", "run", "sync:sheets:push"),
            description="Push an existing payload to Google Sheets.",
        ),
        SpreadsheetCommandSpec(
            key="sync_all",
            label="sync:all",
            command=("npm", "run", "sync:all"),
            description="Run the top-level spreadsheet-and-AI orchestration pipeline.",
        ),
        SpreadsheetCommandSpec(
            key="sync_drive_sheets",
            label="sync:drive-sheets",
            command=("npm", "run", "sync:drive-sheets"),
            description="Sync the drive-folder image sheet workflow.",
        ),
        SpreadsheetCommandSpec(
            key="sync_apis",
            label="sync:apis",
            command=("npm", "run", "sync:apis"),
            description="Run the spreadsheet-adjacent API sync orchestrator.",
        ),
        SpreadsheetCommandSpec(
            key="apply_sheet_renames",
            label="apply:sheet-renames",
            command=("npm", "run", "apply:sheet-renames"),
            description="Apply staged sheet rename rows back to the repository files.",
        ),
        SpreadsheetCommandSpec(
            key="oauth_setup",
            label="oauth:setup",
            command=("npm", "run", "oauth:setup"),
            description="Open the interactive Google OAuth setup flow.",
            interactive=True,
        ),
        SpreadsheetCommandSpec(
            key="check_env",
            label="check_google_sheets_env",
            command=("bash", "scripts/check_google_sheets_env.sh"),
            description="Inspect Google Sheets auth state and related environment markers.",
        ),
        SpreadsheetCommandSpec(
            key="validate_env_local",
            label="validate:env:local",
            command=("npm", "run", "validate:env:local"),
            description="Validate the local runtime environment required by the toolkit.",
        ),
    )


def disconnect_spreadsheet_token(
    root: Path | None = None,
    token_path: str | Path = DEFAULT_GOOGLE_TOKEN_PATH,
) -> SpreadsheetLocalActionResult:
    root_path = find_project_root(root)
    token_file = (root_path / Path(token_path)).resolve() if not Path(token_path).is_absolute() else Path(token_path).resolve()
    if token_file.exists():
        token_file.unlink()
        return SpreadsheetLocalActionResult(
            key="disconnect",
            ok=True,
            target=token_file,
            deleted=True,
            message="Removed the saved Google Sheets API token.",
        )
    return SpreadsheetLocalActionResult(
        key="disconnect",
        ok=True,
        target=token_file,
        deleted=False,
        message="Token file was already missing.",
    )


def clear_spreadsheet_ui_cache(root: Path | None = None) -> SpreadsheetLocalActionResult:
    root_path = find_project_root(root)
    cache_dir = root_path / ".local" / "python_toolkit_ui"
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
        return SpreadsheetLocalActionResult(
            key="clear_cache",
            ok=True,
            target=cache_dir,
            deleted=True,
            message="Removed the Python UI cache directory.",
        )
    return SpreadsheetLocalActionResult(
        key="clear_cache",
        ok=True,
        target=cache_dir,
        deleted=False,
        message="Python UI cache directory was already absent.",
    )


def inspect_spreadsheet_toolchain() -> SpreadsheetToolchainStatus:
    node_available = shutil.which("node") is not None
    npm_available = shutil.which("npm") is not None
    bash_available = shutil.which("bash") is not None
    clasp_available = shutil.which("npx") is not None
    issues: list[str] = []
    if not node_available:
        issues.append("node is not available")
    if not npm_available:
        issues.append("npm is not available")
    if not bash_available:
        issues.append("bash is not available")
    if not clasp_available:
        issues.append("npx is not available for clasp commands")
    return SpreadsheetToolchainStatus(
        node_available=node_available,
        npm_available=npm_available,
        bash_available=bash_available,
        clasp_available=clasp_available,
        issues=tuple(issues),
    )


def inspect_spreadsheet_status(
    root: Path | None = None,
    credentials_path: str | Path = DEFAULT_GOOGLE_CLIENT_PATH,
    token_path: str | Path = DEFAULT_GOOGLE_TOKEN_PATH,
) -> SpreadsheetAdapterStatus:
    root_path = find_project_root(root)
    auth = inspect_spreadsheet_auth(root_path, credentials_path=credentials_path, token_path=token_path)
    toolchain = inspect_spreadsheet_toolchain()
    commands = build_spreadsheet_command_specs(root_path)
    messages = list(auth.messages) + list(toolchain.issues)
    ready = auth.connected and toolchain.node_available and toolchain.npm_available and toolchain.bash_available
    if ready:
        health = "ready"
    elif auth.connected or auth.credentials_exists or auth.token_exists:
        health = "degraded"
    else:
        health = "blocked"
    if not ready and not messages:
        messages.append("Spreadsheet sync is not ready yet.")
    return SpreadsheetAdapterStatus(
        root=root_path,
        auth=auth,
        toolchain=toolchain,
        commands=commands,
        ready=ready,
        health=health,
        messages=tuple(messages),
    )


def build_spreadsheet_command_env(
    root: Path | None = None,
    *,
    credentials_path: str | Path = DEFAULT_GOOGLE_CLIENT_PATH,
    token_path: str | Path = DEFAULT_GOOGLE_TOKEN_PATH,
    extra_env: dict[str, str] | None = None,
) -> dict[str, str]:
    root_path = find_project_root(root)
    credentials_file = (root_path / Path(credentials_path)).resolve() if not Path(credentials_path).is_absolute() else Path(credentials_path).resolve()
    token_file = (root_path / Path(token_path)).resolve() if not Path(token_path).is_absolute() else Path(token_path).resolve()
    env = dict(extra_env or {})
    env.update(
        {
            "GOOGLE_OAUTH_CLIENT_PATH": str(credentials_file),
            "GOOGLE_SHEETS_TOKEN_PATH": str(token_file),
        }
    )
    return env


def run_spreadsheet_command(
    key: str,
    root: Path | None = None,
    args: Sequence[str] | None = None,
    *,
    timeout: float | None = None,
    credentials_path: str | Path = DEFAULT_GOOGLE_CLIENT_PATH,
    token_path: str | Path = DEFAULT_GOOGLE_TOKEN_PATH,
    env: dict[str, str] | None = None,
) -> SpreadsheetCommandResult:
    root_path = find_project_root(root)
    spec_map = {spec.key: spec for spec in build_spreadsheet_command_specs(root_path)}
    if key not in spec_map:
        raise KeyError(f"Unknown spreadsheet command: {key}")
    spec = spec_map[key]
    command = (*spec.command, *(tuple(args) if args else ()))
    merged_env = dict(os.environ)
    merged_env.update(
        build_spreadsheet_command_env(
            root_path,
            credentials_path=credentials_path,
            token_path=token_path,
            extra_env=env,
        )
    )
    try:
        completed = subprocess.run(  # nosec B603 - commands are fixed wrappers around repo scripts
            list(command),
            cwd=root_path,
            env=merged_env,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return SpreadsheetCommandResult(
            key=key,
            command=command,
            cwd=root_path,
            ok=completed.returncode == 0,
            returncode=completed.returncode,
            stdout=completed.stdout or "",
            stderr=completed.stderr or "",
        )
    except subprocess.TimeoutExpired as exc:
        return SpreadsheetCommandResult(
            key=key,
            command=command,
            cwd=root_path,
            ok=False,
            returncode=-1,
            stdout=str(getattr(exc, "stdout", "") or ""),
            stderr=str(getattr(exc, "stderr", "") or ""),
            error=f"Timed out after {timeout} seconds",
            timed_out=True,
        )
    except Exception as exc:  # pragma: no cover - defensive branch
        return SpreadsheetCommandResult(
            key=key,
            command=command,
            cwd=root_path,
            ok=False,
            returncode=-1,
            error=str(exc),
        )


def format_spreadsheet_status(status: SpreadsheetAdapterStatus) -> str:
    lines = [
        "Google Sheets adapter boundary",
        f"Root: {status.root}",
        f"Health: {status.health}",
        f"Ready: {'yes' if status.ready else 'no'}",
        f"Auth mode: {status.auth.auth_mode}",
        f"Credentials: {'configured' if status.auth.credentials_configured else 'missing'}",
        f"Token: {'configured' if status.auth.token_configured else 'missing'}",
        f"Connected: {'yes' if status.auth.connected else 'no'}",
        f"Client JSON: {status.auth.credentials_path}",
        f"Token file: {status.auth.token_path}",
    ]
    if status.auth.client_id:
        lines.append(f"Client ID: {status.auth.client_id}")
    if status.auth.client_email:
        lines.append(f"Client email: {status.auth.client_email}")
    if status.auth.project_id:
        lines.append(f"Project ID: {status.auth.project_id}")
    if status.auth.scope:
        lines.append(f"Scope: {status.auth.scope}")
    if status.messages:
        lines.append("Messages:")
        lines.extend(f"- {message}" for message in status.messages)
    lines.append("Commands:")
    for spec in status.commands:
        lines.append(f"- {spec.key}: {' '.join(spec.command)}")
    return "\n".join(lines)

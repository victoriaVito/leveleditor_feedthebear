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
    available: bool = True
    issues: tuple[str, ...] = ()


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
    workbook_path: Path
    workbook_exists: bool
    payload_path: Path
    payload_exists: bool
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


@dataclass(frozen=True)
class SpreadsheetRenameRow:
    occurrence_id: str
    progression: str
    current_name: str
    target_name: str
    planned_file: str
    rename_pending: bool
    apply_status: str
    notes: str


@dataclass(frozen=True)
class SpreadsheetRenamePlan:
    payload_path: Path
    payload_exists: bool
    headers: tuple[str, ...]
    rows: tuple[SpreadsheetRenameRow, ...]
    total_rows: int
    pending_count: int
    applied_count: int
    error_count: int


def _resolve_root_path(root: Path, path_text: str | Path) -> Path:
    path = Path(path_text)
    return (root / path).resolve() if not path.is_absolute() else path.resolve()


def _load_package_scripts(root: Path) -> dict[str, str]:
    package_json = root / "package.json"
    if not package_json.exists():
        return {}
    try:
        payload = json.loads(package_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    scripts = payload.get("scripts")
    if not isinstance(scripts, dict):
        return {}
    return {str(key): str(value) for key, value in scripts.items()}


def _command_issues(spec: SpreadsheetCommandSpec, root: Path, package_scripts: dict[str, str]) -> tuple[str, ...]:
    issues: list[str] = []
    command = spec.command
    executable = command[0]
    if shutil.which(executable) is None:
        issues.append(f"missing executable: {executable}")
        return tuple(issues)

    if command[:2] == ("npm", "run") and len(command) >= 3:
        script_name = command[2]
        if script_name not in package_scripts:
            issues.append(f"package.json missing script: {script_name}")
    elif executable == "bash" and len(command) >= 2:
        script_path = _resolve_root_path(root, command[1])
        if not script_path.exists():
            issues.append(f"missing script: {script_path}")

    return tuple(issues)


def _load_json_file(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        parsed = json.load(handle)
    if not isinstance(parsed, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return parsed


def _truthy(value: object) -> bool:
    text = str(value or "").strip().lower()
    return text in {"1", "true", "yes", "y", "pending", "x"}


def _normalize_apply_status(value: object) -> str:
    return str(value or "").strip().upper()


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
    credentials_file = _resolve_root_path(root_path, credentials_path)
    token_file = _resolve_root_path(root_path, token_path)

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
    root_path = find_project_root(root)
    package_scripts = _load_package_scripts(root_path)
    raw_specs = (
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
    return tuple(
        SpreadsheetCommandSpec(
            key=spec.key,
            label=spec.label,
            command=spec.command,
            description=spec.description,
            interactive=spec.interactive,
            available=not bool(_command_issues(spec, root_path, package_scripts)),
            issues=_command_issues(spec, root_path, package_scripts),
        )
        for spec in raw_specs
    )


def spreadsheet_command_choices(root: Path | None = None) -> tuple[str, ...]:
    return tuple(spec.key for spec in build_spreadsheet_command_specs(root))


def format_spreadsheet_command_help(root: Path | None = None) -> str:
    lines = ["Spreadsheet commands:"]
    for spec in build_spreadsheet_command_specs(root):
        availability = "available" if spec.available else "blocked"
        lines.append(f"- {spec.key} [{availability}] :: {spec.description}")
        for issue in spec.issues:
            lines.append(f"  issue: {issue}")
    return "\n".join(lines)


def recommend_spreadsheet_action_keys(status: SpreadsheetAdapterStatus) -> tuple[str, ...]:
    command_map = {spec.key: spec for spec in status.commands if spec.available}
    recommendations: list[str] = []

    def add(key: str) -> None:
        if key in command_map and key not in recommendations:
            recommendations.append(key)

    if not status.auth.connected:
        add("oauth_setup")
    if not status.workbook_exists or not status.payload_exists:
        add("sync_local")
    if not status.ready:
        add("check_env")
    if status.ready:
        add("sync_push")
        add("apply_sheet_renames")
        add("sync_all")
    add("validate_env_local")
    add("sync_drive_sheets")
    add("sync_apis")
    return tuple(recommendations)


def disconnect_spreadsheet_token(
    root: Path | None = None,
    token_path: str | Path = DEFAULT_GOOGLE_TOKEN_PATH,
) -> SpreadsheetLocalActionResult:
    root_path = find_project_root(root)
    token_file = _resolve_root_path(root_path, token_path)
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
    workbook_path = root_path / "output" / "spreadsheet" / "Levels_feed_the_bear_after_feedback_sync.xlsx"
    payload_path = root_path / "output" / "spreadsheet" / "Levels_feed_the_bear_after_feedback_sync_payload.json"
    workbook_exists = workbook_path.exists()
    payload_exists = payload_path.exists()
    command_map = {spec.key: spec for spec in commands}
    required_command_keys = ("sync_local", "sync_push", "check_env", "validate_env_local")
    commands_ready = all(command_map[key].available for key in required_command_keys if key in command_map)
    messages = list(auth.messages) + list(toolchain.issues)
    messages.extend(f"{spec.key}: {issue}" for spec in commands for issue in spec.issues)
    if not workbook_exists:
        messages.append(f"Missing canonical workbook: {workbook_path}")
    if not payload_exists:
        messages.append(f"Missing canonical sync payload: {payload_path}")
    ready = (
        auth.connected
        and toolchain.node_available
        and toolchain.npm_available
        and toolchain.bash_available
        and commands_ready
    )
    if ready:
        health = "ready"
    elif auth.connected or auth.credentials_exists or auth.token_exists or workbook_exists or payload_exists:
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
        workbook_path=workbook_path,
        workbook_exists=workbook_exists,
        payload_path=payload_path,
        payload_exists=payload_exists,
        ready=ready,
        health=health,
        messages=tuple(messages),
    )


def inspect_spreadsheet_rename_plan(
    root: Path | None = None,
    payload_path: str | Path | None = None,
    *,
    progression_filter: str = "",
) -> SpreadsheetRenamePlan:
    root_path = find_project_root(root)
    resolved_payload = (
        _resolve_root_path(root_path, payload_path)
        if payload_path is not None
        else root_path / "output" / "spreadsheet" / "Levels_feed_the_bear_after_feedback_sync_payload.json"
    )
    if not resolved_payload.exists():
        return SpreadsheetRenamePlan(
            payload_path=resolved_payload,
            payload_exists=False,
            headers=(),
            rows=(),
            total_rows=0,
            pending_count=0,
            applied_count=0,
            error_count=0,
        )
    try:
        payload = _load_json_file(resolved_payload)
    except Exception:
        return SpreadsheetRenamePlan(
            payload_path=resolved_payload,
            payload_exists=True,
            headers=(),
            rows=(),
            total_rows=0,
            pending_count=0,
            applied_count=0,
            error_count=0,
        )
    headers = tuple(str(item) for item in (payload.get("renameHeaders") or []) if str(item).strip())
    source_rows = payload.get("renameRows") or []
    if not isinstance(source_rows, list):
        source_rows = []
    progression_filter_text = str(progression_filter or "").strip().lower()
    parsed_rows: list[SpreadsheetRenameRow] = []
    for raw_row in source_rows:
        if not isinstance(raw_row, list):
            continue
        row_values = [str(item or "") for item in raw_row]
        row_by_header = {
            headers[index]: row_values[index] if index < len(row_values) else ""
            for index in range(len(headers))
        }
        progression_name = str(row_by_header.get("Progression") or "").strip()
        if progression_filter_text and progression_filter_text not in progression_name.lower():
            continue
        current_name = str(row_by_header.get("Current Name") or "").strip()
        target_name = str(row_by_header.get("Target Name") or "").strip()
        apply_status = _normalize_apply_status(row_by_header.get("Apply Status"))
        explicit_pending = _truthy(row_by_header.get("Rename Pending"))
        inferred_pending = (
            bool(target_name)
            and target_name != current_name
            and apply_status not in {"APPLIED", "DONE", "RENAMED", "ERROR", "FAILED", "CONFLICT"}
        )
        rename_pending = explicit_pending or inferred_pending
        parsed_rows.append(
            SpreadsheetRenameRow(
                occurrence_id=str(row_by_header.get("Occurrence ID") or "").strip(),
                progression=progression_name,
                current_name=current_name,
                target_name=target_name,
                planned_file=str(row_by_header.get("Planned File") or "").strip(),
                rename_pending=rename_pending,
                apply_status=apply_status,
                notes=str(row_by_header.get("Notes") or "").strip(),
            )
        )
    pending_count = sum(1 for row in parsed_rows if row.rename_pending)
    applied_count = sum(1 for row in parsed_rows if row.apply_status in {"APPLIED", "DONE", "RENAMED"})
    error_count = sum(1 for row in parsed_rows if row.apply_status in {"ERROR", "FAILED", "CONFLICT"})
    return SpreadsheetRenamePlan(
        payload_path=resolved_payload,
        payload_exists=True,
        headers=headers,
        rows=tuple(parsed_rows),
        total_rows=len(parsed_rows),
        pending_count=pending_count,
        applied_count=applied_count,
        error_count=error_count,
    )


def format_spreadsheet_rename_plan(
    plan: SpreadsheetRenamePlan,
    *,
    limit: int = 30,
) -> str:
    lines = [
        "Spreadsheet rename plan",
        f"Payload: {plan.payload_path}",
        f"Payload exists: {'yes' if plan.payload_exists else 'no'}",
        f"Rows: {plan.total_rows}",
        f"Pending: {plan.pending_count}",
        f"Applied: {plan.applied_count}",
        f"Errors: {plan.error_count}",
    ]
    if not plan.rows:
        lines.append("No rename rows available.")
        return "\n".join(lines)
    lines.append("")
    lines.append("Top rows:")
    for row in plan.rows[: max(1, limit)]:
        lines.append(
            " - "
            f"{row.occurrence_id or '-'} | {row.progression or '-'} | "
            f"{row.current_name or '-'} -> {row.target_name or '-'} | "
            f"pending={'yes' if row.rename_pending else 'no'} | "
            f"status={row.apply_status or '-'}"
        )
    hidden = max(0, len(plan.rows) - max(1, limit))
    if hidden > 0:
        lines.append(f"... ({hidden} more row(s))")
    return "\n".join(lines)


def build_spreadsheet_command_env(
    root: Path | None = None,
    *,
    credentials_path: str | Path = DEFAULT_GOOGLE_CLIENT_PATH,
    token_path: str | Path = DEFAULT_GOOGLE_TOKEN_PATH,
    extra_env: dict[str, str] | None = None,
) -> dict[str, str]:
    root_path = find_project_root(root)
    credentials_file = _resolve_root_path(root_path, credentials_path)
    token_file = _resolve_root_path(root_path, token_path)
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
    if not spec.available:
        return SpreadsheetCommandResult(
            key=key,
            command=spec.command,
            cwd=root_path,
            ok=False,
            returncode=-1,
            error="; ".join(spec.issues),
        )
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
    recommendations = recommend_spreadsheet_action_keys(status)
    command_map = {spec.key: spec for spec in status.commands}
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
        f"Workbook: {'present' if status.workbook_exists else 'missing'}",
        f"Workbook path: {status.workbook_path}",
        f"Payload: {'present' if status.payload_exists else 'missing'}",
        f"Payload path: {status.payload_path}",
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
    if recommendations:
        lines.append("Recommended actions:")
        for key in recommendations:
            spec = command_map.get(key)
            if spec is None:
                continue
            lines.append(f"- {spec.key}: {spec.label} — {spec.description}")
    lines.append("Commands:")
    for spec in status.commands:
        availability = "available" if spec.available else "blocked"
        lines.append(f"- {spec.key}: {' '.join(spec.command)} [{availability}]")
        for issue in spec.issues:
            lines.append(f"  issue: {issue}")
    return "\n".join(lines)

from __future__ import annotations

import argparse
import json
from pathlib import Path

from feed_the_bear_toolkit.domain.levels import (
    load_level_file,
    serialize_level_to_canonical_json,
    summarize_level_pack,
)
from feed_the_bear_toolkit.domain.procedural import (
    learning_driven_generation_adjustments,
    normalize_learning_buckets,
    procedural_reference_intent_text,
    score_candidate_with_learning,
)
from feed_the_bear_toolkit.domain.progressions import (
    default_progression_paths,
    load_live_progressions,
    load_manager_metadata,
    load_progression_file,
    save_live_progressions,
    save_manager_metadata,
    save_progression_file,
    validate_progression_levels,
)
from feed_the_bear_toolkit.domain.sessions import (
    append_playtest_dataset_record,
    default_session_paths,
    load_play_session_file,
    load_play_sessions_state,
    save_play_session_snapshot,
    save_play_sessions_state,
)
from feed_the_bear_toolkit.domain.validation import validate_level_structure
from feed_the_bear_toolkit.services.config import canonical_repo_paths, find_project_root, resolve_repo_path
from feed_the_bear_toolkit.services.repo_io import (
    append_text_file,
    create_zip_archive,
    file_status,
    read_file_base64,
    save_data_url_file,
    save_text_file,
)
from feed_the_bear_toolkit.services.procedural import (
    generate_learned_session_batch,
    generate_level,
    generate_level_raw,
    generate_reference_variants,
)
from feed_the_bear_toolkit.services.spreadsheet import (
    format_spreadsheet_status,
    clear_spreadsheet_ui_cache,
    disconnect_spreadsheet_token,
    inspect_spreadsheet_status,
    run_spreadsheet_command,
)
from feed_the_bear_toolkit.ui.app import app_status
from feed_the_bear_toolkit.ui.server import create_server


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ftb-toolkit",
        description="Python-first toolkit scaffold for Feed the Bear",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("status", help="Show scaffold status")
    subparsers.add_parser("ui-status", help="Show Python UI shell status")
    serve_ui_parser = subparsers.add_parser("serve-ui", help="Run the Python-hosted local UI shell")
    serve_ui_parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    serve_ui_parser.add_argument("--port", default=8765, type=int, help="Bind port")
    paths_parser = subparsers.add_parser("paths", help="Show key project paths")
    paths_parser.add_argument(
        "--root",
        default=Path(__file__).resolve().parents[3],
        type=Path,
        help="Project root to inspect",
    )
    inspect_parser = subparsers.add_parser("inspect-level", help="Inspect a level JSON file")
    inspect_parser.add_argument("path", type=Path, help="Path to the level JSON file")
    validate_parser = subparsers.add_parser("validate-level", help="Run structural validation on a level JSON file")
    validate_parser.add_argument("path", type=Path, help="Path to the level JSON file")
    serialize_parser = subparsers.add_parser("serialize-level", help="Print canonical JSON for a level file")
    serialize_parser.add_argument("path", type=Path, help="Path to the level JSON file")
    validate_under_parser = subparsers.add_parser("validate-levels-under", help="Validate all level JSON files under a folder")
    validate_under_parser.add_argument("folder", type=Path, help="Folder to scan recursively")
    summarize_pack_parser = subparsers.add_parser("summarize-level-pack", help="Summarize a level folder recursively")
    summarize_pack_parser.add_argument("folder", type=Path, help="Folder to scan recursively")
    status_parser = subparsers.add_parser("file-status", help="Check repo file status")
    status_parser.add_argument("relative_path", help="Repo-relative path to inspect")
    save_parser = subparsers.add_parser("save-file", help="Write text content into an allowed repo path")
    save_parser.add_argument("relative_path", help="Repo-relative output path")
    save_parser.add_argument("content", help="Text content to write")
    append_parser = subparsers.add_parser("append-file", help="Append text content into an allowed repo path")
    append_parser.add_argument("relative_path", help="Repo-relative output path")
    append_parser.add_argument("content", help="Text content to append")
    read_parser = subparsers.add_parser("read-file", help="Read a repo file and return base64 metadata")
    read_parser.add_argument("relative_path", help="Repo-relative file path")
    data_url_parser = subparsers.add_parser("save-data-url", help="Write a base64 data URL into an allowed repo path")
    data_url_parser.add_argument("relative_path", help="Repo-relative output path")
    data_url_parser.add_argument("data_url", help="data: URL payload")
    zip_parser = subparsers.add_parser("create-zip", help="Create a zip archive from inline entries")
    zip_parser.add_argument("relative_path", help="Repo-relative zip output path")
    zip_parser.add_argument("entries_json", help="JSON array of {relativePath, content|dataUrl}")
    inspect_progression_parser = subparsers.add_parser("inspect-progression", help="Inspect a progression config JSON file")
    inspect_progression_parser.add_argument("path", type=Path, help="Path to the progression JSON file")
    validate_progression_parser = subparsers.add_parser("validate-progression", help="Validate all referenced level files in a progression")
    validate_progression_parser.add_argument("path", type=Path, help="Path to the progression JSON file")
    save_progression_parser = subparsers.add_parser("save-progression", help="Rewrite a progression JSON file via the Python serializer")
    save_progression_parser.add_argument("path", type=Path, help="Source progression JSON path")
    save_progression_parser.add_argument(
        "--output",
        default=None,
        help="Repo-relative output path; defaults to the input repo-relative path",
    )
    inspect_manager_parser = subparsers.add_parser("inspect-manager-metadata", help="Inspect manager metadata JSON")
    inspect_manager_parser.add_argument(
        "path",
        nargs="?",
        default=Path("progressions/manager_state/level_manager_metadata.json"),
        type=Path,
        help="Path to manager metadata JSON",
    )
    save_manager_parser = subparsers.add_parser("save-manager-metadata", help="Rewrite manager metadata JSON via the Python serializer")
    save_manager_parser.add_argument(
        "path",
        nargs="?",
        default=Path("progressions/manager_state/level_manager_metadata.json"),
        type=Path,
        help="Path to manager metadata JSON",
    )
    save_manager_parser.add_argument(
        "--output",
        default="progressions/manager_state/level_manager_metadata.json",
        help="Repo-relative output path",
    )
    inspect_live_parser = subparsers.add_parser("inspect-live-progressions", help="Inspect live manager progression snapshot")
    inspect_live_parser.add_argument(
        "path",
        nargs="?",
        default=Path("progressions/manager_progressions_live.json"),
        type=Path,
        help="Path to live progressions JSON",
    )
    validate_live_parser = subparsers.add_parser("validate-live-progressions", help="Validate all referenced levels in the live progression snapshot")
    validate_live_parser.add_argument(
        "path",
        nargs="?",
        default=Path("progressions/manager_progressions_live.json"),
        type=Path,
        help="Path to live progressions JSON",
    )
    save_live_parser = subparsers.add_parser("save-live-progressions", help="Rewrite live progression snapshot via the Python serializer")
    save_live_parser.add_argument(
        "path",
        nargs="?",
        default=Path("progressions/manager_progressions_live.json"),
        type=Path,
        help="Path to live progressions JSON",
    )
    save_live_parser.add_argument(
        "--output",
        default="progressions/manager_progressions_live.json",
        help="Repo-relative output path",
    )
    inspect_play_session_parser = subparsers.add_parser("inspect-play-session", help="Inspect a saved play session snapshot")
    inspect_play_session_parser.add_argument(
        "path",
        nargs="?",
        default=Path("playtest/latest_play_session.json"),
        type=Path,
        help="Path to play session JSON",
    )
    append_playtest_parser = subparsers.add_parser("append-playtest-record", help="Append a JSONL playtest dataset row from a play session")
    append_playtest_parser.add_argument(
        "path",
        nargs="?",
        default=Path("playtest/latest_play_session.json"),
        type=Path,
        help="Path to play session JSON",
    )
    append_playtest_parser.add_argument(
        "--origin",
        default="editor",
        help="Origin tag for the dataset record",
    )
    save_play_session_parser = subparsers.add_parser("save-play-session", help="Rewrite a play session JSON via the Python serializer")
    save_play_session_parser.add_argument(
        "path",
        nargs="?",
        default=Path("playtest/latest_play_session.json"),
        type=Path,
        help="Path to play session JSON",
    )
    save_play_session_parser.add_argument(
        "--output",
        default="playtest/latest_play_session.json",
        help="Repo-relative output path",
    )
    inspect_sessions_state_parser = subparsers.add_parser("inspect-play-sessions-state", help="Inspect the saved play sessions queue state")
    inspect_sessions_state_parser.add_argument(
        "path",
        nargs="?",
        default=Path(".local/toolkit_state/play_sessions_state.json"),
        type=Path,
        help="Path to play sessions state JSON",
    )
    save_sessions_state_parser = subparsers.add_parser("save-play-sessions-state", help="Rewrite play sessions state JSON via the Python serializer")
    save_sessions_state_parser.add_argument(
        "path",
        nargs="?",
        default=Path(".local/toolkit_state/play_sessions_state.json"),
        type=Path,
        help="Path to play sessions state JSON",
    )
    save_sessions_state_parser.add_argument(
        "--output",
        default=".local/toolkit_state/play_sessions_state.json",
        help="Repo-relative output path",
    )
    spreadsheet_status_parser = subparsers.add_parser("spreadsheet-status", help="Inspect spreadsheet adapter readiness and wrapped commands")
    spreadsheet_status_parser.add_argument(
        "--credentials-path",
        default=".local/google_oauth_client.json",
        help="Repo-relative or absolute credentials JSON path",
    )
    spreadsheet_status_parser.add_argument(
        "--token-path",
        default=".local/google_sheets_token.json",
        help="Repo-relative or absolute token JSON path",
    )
    spreadsheet_run_parser = subparsers.add_parser("spreadsheet-run", help="Run a wrapped spreadsheet command")
    spreadsheet_run_parser.add_argument(
        "key",
        help="Spreadsheet command key such as sync_local, sync_push, apply_sheet_renames, oauth_setup, check_env, validate_env_local",
    )
    spreadsheet_run_parser.add_argument(
        "args",
        nargs="*",
        help="Optional extra arguments appended to the wrapped command",
    )
    spreadsheet_run_parser.add_argument(
        "--timeout",
        type=float,
        default=None,
        help="Optional timeout in seconds",
    )
    spreadsheet_disconnect_parser = subparsers.add_parser("spreadsheet-disconnect", help="Remove the saved Google Sheets API token")
    spreadsheet_disconnect_parser.add_argument(
        "--token-path",
        default=".local/google_sheets_token.json",
        help="Repo-relative or absolute token JSON path",
    )
    spreadsheet_clear_parser = subparsers.add_parser("spreadsheet-clear-cache", help="Clear the Python UI cache used by the local shell")
    procedural_score_parser = subparsers.add_parser("procedural-score-level", help="Score a level candidate with the Python procedural boundary")
    procedural_score_parser.add_argument("path", type=Path, help="Repo-relative or absolute level JSON path")
    procedural_score_parser.add_argument(
        "--learning-path",
        default=".local/toolkit_state/learning_state.json",
        help="Repo-relative or absolute learning-state JSON path",
    )
    procedural_adjustments_parser = subparsers.add_parser("procedural-adjustments", help="Compute learning-driven procedural adjustments for one level number")
    procedural_adjustments_parser.add_argument("level_number", type=int, help="Difficulty level number")
    procedural_adjustments_parser.add_argument(
        "--learning-path",
        default=".local/toolkit_state/learning_state.json",
        help="Repo-relative or absolute learning-state JSON path",
    )
    procedural_variants_parser = subparsers.add_parser(
        "procedural-reference-variants",
        help="Generate and rank reference-driven procedural variants for one base level",
    )
    procedural_variants_parser.add_argument("path", type=Path, help="Repo-relative or absolute base level JSON path")
    procedural_variants_parser.add_argument("--count", type=int, default=3, help="Number of ranked variants to return")
    procedural_variants_parser.add_argument("--pairs", default="same", help="Intent for pair count: less|same|more")
    procedural_variants_parser.add_argument("--blockers", default="same", help="Intent for blockers: less|same|more")
    procedural_variants_parser.add_argument("--board", default="same", help="Intent for board size: smaller|same|bigger")
    procedural_variants_parser.add_argument(
        "--learning-path",
        default=".local/toolkit_state/learning_state.json",
        help="Repo-relative or absolute learning-state JSON path",
    )
    procedural_generate_raw_parser = subparsers.add_parser(
        "procedural-generate-raw",
        help="Generate one solver-backed procedural level using the Python port",
    )
    procedural_generate_raw_parser.add_argument("level_number", type=int, help="Difficulty level number")
    procedural_generate_raw_parser.add_argument("--seed-offset", type=int, default=0, help="Seed offset for deterministic variation")
    procedural_generate_raw_parser.add_argument(
        "--learning-path",
        default=".local/toolkit_state/learning_state.json",
        help="Repo-relative or absolute learning-state JSON path",
    )
    procedural_generate_parser = subparsers.add_parser(
        "procedural-generate-level",
        help="Generate and score multiple attempts, returning the best procedural level",
    )
    procedural_generate_parser.add_argument("level_number", type=int, help="Difficulty level number")
    procedural_generate_parser.add_argument("--attempts", type=int, default=12, help="Number of attempts to score")
    procedural_generate_parser.add_argument(
        "--learning-path",
        default=".local/toolkit_state/learning_state.json",
        help="Repo-relative or absolute learning-state JSON path",
    )
    procedural_batch_parser = subparsers.add_parser(
        "procedural-generate-batch",
        help="Generate a learned procedural batch across a level range",
    )
    procedural_batch_parser.add_argument("start_level", type=int, help="Lowest level number in the range")
    procedural_batch_parser.add_argument("end_level", type=int, help="Highest level number in the range")
    procedural_batch_parser.add_argument("--count", type=int, default=12, help="How many valid levels to return")
    procedural_batch_parser.add_argument(
        "--learning-path",
        default=".local/toolkit_state/learning_state.json",
        help="Repo-relative or absolute learning-state JSON path",
    )
    return parser


def handle_status() -> int:
    print("Feed the Bear Python toolkit scaffold is installed.")
    print("Status: domain, pack QA, repo I/O, progression read/write, playtest/session persistence, procedural scoring boundary, and spreadsheet adapter boundary are available.")
    print("Next target: wire procedural and spreadsheet flows deeper into the Python UI shell and push parity further against the web toolkit.")
    return 0


def handle_ui_status() -> int:
    print(app_status())
    return 0


def handle_serve_ui(host: str, port: int) -> int:
    print(f"Serving Feed the Bear Python UI on http://{host}:{port}")
    serve_ui(host=host, port=port, root=find_project_root())
    return 0


def handle_paths(root: Path) -> int:
    root = root.resolve()
    print(f"root={root}")
    repo_paths = canonical_repo_paths(root)
    print(f"levels={repo_paths['levels']}")
    print(f"progressions={repo_paths['progressions']}")
    print(f"bundles={repo_paths['bundles']}")
    print(f"screenshots={repo_paths['screenshots']}")
    print(f"playtest={repo_paths['playtest']}")
    return 0


def handle_inspect_level(path: Path) -> int:
    resolved_path = resolve_input_path(path)
    level = load_level_file(resolved_path)
    print(f"id={level.id}")
    print(f"grid={level.cols}x{level.rows}")
    print(f"difficulty_tier={level.difficulty_tier}")
    print(f"moves={level.moves}")
    print(f"pairs={len(level.pairs)}")
    print(f"blockers={len(level.blockers)}")
    print(f"solution_count={level.solution_count}")
    print(f"target_density={level.target_density}")
    return 0


def handle_validate_level(path: Path) -> int:
    resolved_path = resolve_input_path(path)
    level = load_level_file(resolved_path)
    result = validate_level_structure(level)
    print(f"valid={str(result.valid).lower()}")
    print(f"errors={len(result.errors)}")
    for error in result.errors:
        print(f"error: {error}")
    print(f"warnings={len(result.warnings)}")
    for warning in result.warnings:
        print(f"warning: {warning}")
    return 0 if result.valid else 1


def handle_serialize_level(path: Path) -> int:
    resolved_path = resolve_input_path(path)
    level = load_level_file(resolved_path)
    print(serialize_level_to_canonical_json(level, resolved_path.name))
    return 0


def handle_validate_levels_under(folder: Path) -> int:
    resolved_folder = resolve_input_path(folder)
    summary = summarize_level_pack(resolved_folder)
    print(f"folder={summary.folder}")
    print(f"file_count={summary.file_count}")
    print(f"valid_count={summary.valid_count}")
    print(f"invalid_count={summary.invalid_count}")
    for entry in summary.entries:
        state = "valid" if entry.valid else "invalid"
        print(
            f"path={entry.path} state={state} errors={entry.error_count} "
            f"warnings={entry.warning_count} board={entry.cols}x{entry.rows} pairs={entry.pair_count}"
        )
    return 0 if summary.invalid_count == 0 else 1


def handle_summarize_level_pack(folder: Path) -> int:
    resolved_folder = resolve_input_path(folder)
    summary = summarize_level_pack(resolved_folder)
    print(f"folder={summary.folder}")
    print(f"file_count={summary.file_count}")
    print(f"valid_count={summary.valid_count}")
    print(f"invalid_count={summary.invalid_count}")
    print(
        "board_counts="
        + ",".join(f"{key}:{summary.board_counts[key]}" for key in sorted(summary.board_counts))
    )
    print(
        "pair_counts="
        + ",".join(f"{key}:{summary.pair_counts[key]}" for key in sorted(summary.pair_counts, key=lambda item: int(item) if item.isdigit() else item))
    )
    print(
        "missing_metadata_counts="
        + ",".join(f"{key}:{summary.missing_metadata_counts[key]}" for key in sorted(summary.missing_metadata_counts))
    )
    return 0


def handle_file_status(relative_path: str) -> int:
    result = file_status(relative_path, find_project_root())
    print(f"ok={str(result.ok).lower()}")
    print(f"exists={str(result.exists).lower()}")
    print(f"path={result.path}")
    return 0


def handle_save_file(relative_path: str, content: str) -> int:
    result = save_text_file(relative_path, content, find_project_root())
    print(f"ok={str(result.ok).lower()}")
    print(f"path={result.path}")
    print(f"bytes_written={result.bytes_written}")
    return 0


def handle_append_file(relative_path: str, content: str) -> int:
    result = append_text_file(relative_path, content, find_project_root())
    print(f"ok={str(result.ok).lower()}")
    print(f"path={result.path}")
    print(f"bytes_written={result.bytes_written}")
    return 0


def handle_read_file(relative_path: str) -> int:
    result = read_file_base64(relative_path, find_project_root())
    print(f"ok={str(result.ok).lower()}")
    print(f"path={result.path}")
    print(f"bytes_read={result.bytes_read}")
    print(f"data_base64={result.data_base64}")
    return 0


def handle_save_data_url(relative_path: str, data_url: str) -> int:
    result = save_data_url_file(relative_path, data_url, find_project_root())
    print(f"ok={str(result.ok).lower()}")
    print(f"path={result.path}")
    print(f"bytes_written={result.bytes_written}")
    return 0


def handle_create_zip(relative_path: str, entries_json: str) -> int:
    entries = json.loads(entries_json)
    if not isinstance(entries, list):
        raise ValueError("entries_json must decode to a list")
    result = create_zip_archive(relative_path, entries, find_project_root())
    print(f"ok={str(result.ok).lower()}")
    print(f"path={result.path}")
    print(f"bytes_written={result.bytes_written}")
    return 0


def handle_inspect_progression(path: Path) -> int:
    progression = load_progression_file(resolve_input_path(path))
    print(f"name={progression.name}")
    print(f"locked={str(progression.locked).lower()}")
    print(f"tutorial_level_file={progression.tutorial_level_file}")
    print(f"slots={len(progression.slots)}")
    print(f"assigned_slots={progression.assigned_slots}")
    tutorial_slots = sum(1 for slot in progression.slots if slot.is_tutorial)
    print(f"tutorial_slots={tutorial_slots}")
    return 0


def handle_validate_progression(path: Path) -> int:
    progression = load_progression_file(resolve_input_path(path))
    summary = validate_progression_levels(progression, find_project_root())
    print(f"name={summary.name}")
    print(f"total_slots={summary.total_slots}")
    print(f"assigned_slots={summary.assigned_slots}")
    print(f"checked_levels={summary.checked_levels}")
    print(f"valid_levels={summary.valid_levels}")
    print(f"invalid_levels={summary.invalid_levels}")
    print(f"missing_levels={summary.missing_levels}")
    for entry in summary.entries:
        state = "valid" if entry.valid else ("missing" if not entry.exists else "invalid")
        print(
            f"slot={entry.slot} state={state} file={entry.level_file} "
            f"errors={entry.error_count} warnings={entry.warning_count}"
        )
    return 0 if summary.invalid_levels == 0 and summary.missing_levels == 0 else 1


def handle_save_progression(path: Path, output: str | None) -> int:
    resolved_path = resolve_input_path(path)
    progression = load_progression_file(resolved_path)
    target = output or str(path).replace("\\", "/")
    saved_path = save_progression_file(progression, target, find_project_root())
    print(f"ok=true")
    print(f"path={saved_path}")
    return 0


def handle_inspect_manager_metadata(path: Path) -> int:
    metadata = load_manager_metadata(resolve_input_path(path))
    print(f"saved_at={metadata.saved_at}")
    print(f"reason={metadata.reason}")
    print(f"active_tab={metadata.active_tab}")
    print(f"selected_id={metadata.selected_id}")
    print(f"progression_order={','.join(metadata.progression_order)}")
    print(f"count_keys={','.join(sorted(metadata.counts))}")
    print(f"filter_keys={','.join(sorted(metadata.filters))}")
    return 0


def handle_save_manager_metadata(path: Path, output: str) -> int:
    metadata = load_manager_metadata(resolve_input_path(path))
    saved_path = save_manager_metadata(metadata, output, find_project_root())
    print("ok=true")
    print(f"path={saved_path}")
    return 0


def handle_inspect_live_progressions(path: Path) -> int:
    live = load_live_progressions(resolve_input_path(path))
    defaults = default_progression_paths(find_project_root())
    print(f"count={len(live)}")
    print(f"default_live_path={defaults['live']}")
    print(f"default_metadata_path={defaults['metadata']}")
    print(f"keys={','.join(sorted(live))}")
    return 0


def handle_save_live_progressions(path: Path, output: str) -> int:
    live = load_live_progressions(resolve_input_path(path))
    saved_path = save_live_progressions(live, output, find_project_root())
    print("ok=true")
    print(f"path={saved_path}")
    print(f"count={len(live)}")
    return 0


def handle_validate_live_progressions(path: Path) -> int:
    live = load_live_progressions(resolve_input_path(path))
    failures = 0
    for key in sorted(live):
        summary = validate_progression_levels(live[key], find_project_root())
        print(
            f"name={summary.name} checked={summary.checked_levels} "
            f"valid={summary.valid_levels} invalid={summary.invalid_levels} missing={summary.missing_levels}"
        )
        failures += summary.invalid_levels + summary.missing_levels
    return 0 if failures == 0 else 1


def handle_inspect_play_session(path: Path) -> int:
    session = load_play_session_file(resolve_input_path(path))
    paths = default_session_paths(find_project_root())
    print(f"default_latest_playtest={paths['latest_playtest']}")
    print(f"default_playtest_events={paths['playtest_events']}")
    print(f"saved_at={session.saved_at}")
    print(f"solved={str(session.solved).lower()}")
    print(f"selected_pair={session.selected_pair}")
    print(f"history_length={len(session.history)}")
    print(f"path_count={len(session.paths)}")
    print(f"level_name={session.level.get('name') or session.level.get('id') or session.level.get('meta', {}).get('source_name')}")
    print(f"board={session.level.get('board_width')}x{session.level.get('board_height')}")
    return 0


def handle_append_playtest_record(path: Path, origin: str) -> int:
    session = load_play_session_file(resolve_input_path(path))
    output = append_playtest_dataset_record(session, origin=origin, root=find_project_root())
    print("ok=true")
    print(f"path={output}")
    print(f"origin={origin}")
    return 0


def handle_save_play_session(path: Path, output: str) -> int:
    session = load_play_session_file(resolve_input_path(path))
    saved_path = save_play_session_snapshot(session, output, find_project_root())
    print("ok=true")
    print(f"path={saved_path}")
    return 0


def handle_inspect_play_sessions_state(path: Path) -> int:
    state = load_play_sessions_state(resolve_input_path(path))
    paths = default_session_paths(find_project_root())
    print(f"default_sessions_state={paths['sessions_state']}")
    print(f"queue_count={len(state.queue)}")
    pending = sum(1 for item in state.queue if item.review_status == "PENDING")
    changed = sum(1 for item in state.queue if item.changed)
    print(f"pending_count={pending}")
    print(f"changed_count={changed}")
    return 0


def handle_save_play_sessions_state(path: Path, output: str) -> int:
    state = load_play_sessions_state(resolve_input_path(path))
    saved_path = save_play_sessions_state(state, output, find_project_root())
    print("ok=true")
    print(f"path={saved_path}")
    print(f"queue_count={len(state.queue)}")
    return 0


def load_optional_json(path_text: str) -> dict[str, object]:
    path = resolve_input_path(Path(path_text))
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, OSError):
        return {}
    if not isinstance(payload, dict):
        return {}
    return payload


def handle_spreadsheet_status(credentials_path: str, token_path: str) -> int:
    status = inspect_spreadsheet_status(
        find_project_root(),
        credentials_path=credentials_path,
        token_path=token_path,
    )
    print(format_spreadsheet_status(status))
    return 0 if status.ready else 1


def handle_spreadsheet_run(key: str, args: list[str], timeout: float | None) -> int:
    result = run_spreadsheet_command(key, find_project_root(), args=args, timeout=timeout)
    print(f"ok={str(result.ok).lower()}")
    print(f"key={result.key}")
    print(f"command={' '.join(result.command)}")
    print(f"cwd={result.cwd}")
    print(f"returncode={result.returncode}")
    if result.error:
        print(f"error={result.error}")
    if result.stdout:
        print("stdout:")
        print(result.stdout.rstrip())
    if result.stderr:
        print("stderr:")
        print(result.stderr.rstrip())
    return 0 if result.ok else 1


def handle_spreadsheet_disconnect(token_path: str) -> int:
    result = disconnect_spreadsheet_token(find_project_root(), token_path=token_path)
    print(f"ok={str(result.ok).lower()}")
    print(f"path={result.target}")
    print(f"deleted={str(result.deleted).lower()}")
    if result.message:
        print(f"message={result.message}")
    return 0 if result.ok else 1


def handle_spreadsheet_clear_cache() -> int:
    result = clear_spreadsheet_ui_cache(find_project_root())
    print(f"ok={str(result.ok).lower()}")
    print(f"path={result.target}")
    print(f"deleted={str(result.deleted).lower()}")
    if result.message:
        print(f"message={result.message}")
    return 0 if result.ok else 1


def handle_procedural_score_level(path: Path, learning_path: str) -> int:
    level = load_level_file(resolve_input_path(path))
    learning = normalize_learning_buckets(load_optional_json(learning_path))
    score = score_candidate_with_learning(level, learning)
    print(f"path={resolve_input_path(path)}")
    print(f"score={score.score}")
    print(f"feature_distance={score.feature_distance}")
    print(f"mechanic_penalty={score.mechanic_penalty}")
    print(f"mechanic_reward={score.mechanic_reward}")
    print(f"guide_penalty={score.guide_penalty}")
    print(f"pair_penalty={score.pair_penalty}")
    return 0


def handle_procedural_adjustments(level_number: int, learning_path: str) -> int:
    learning = normalize_learning_buckets(load_optional_json(learning_path))
    adjustments = learning_driven_generation_adjustments(level_number, learning)
    print(f"level_number={level_number}")
    for key in sorted(adjustments):
        print(f"{key}={adjustments[key]}")
    return 0


def handle_procedural_reference_variants(
    path: Path,
    count: int,
    pairs: str,
    blockers: str,
    board: str,
    learning_path: str,
) -> int:
    level_path = resolve_input_path(path)
    base_level = load_level_file(level_path)
    adjustments = {"pairs": pairs, "blockers": blockers, "board": board}
    variants = generate_reference_variants(
        base_level,
        find_project_root(),
        base_file_name=level_path.name,
        adjustments=adjustments,
        count=count,
        learning_path=learning_path,
    )
    print(f"path={level_path}")
    print(procedural_reference_intent_text(adjustments))
    print(f"count={len(variants)}")
    for index, candidate in enumerate(variants, start=1):
        print(
            f"variant={index} name={candidate.name} source={candidate.source_kind} "
            f"board={candidate.level.cols}x{candidate.level.rows} pairs={len(candidate.level.pairs)} "
            f"blockers={len(candidate.level.blockers)} total_rank={candidate.total_rank}"
        )
    print(
        json.dumps(
            [
                {
                    "name": candidate.name,
                    "source_kind": candidate.source_kind,
                    "reference_intent": candidate.reference_intent,
                    "similarity": candidate.similarity,
                    "learning_bias": candidate.learning_bias,
                    "intent_penalty": candidate.intent_penalty,
                    "total_rank": candidate.total_rank,
                    "level": serialize_level_to_canonical_json(candidate.level, candidate.name),
                }
                for candidate in variants
            ],
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


def handle_procedural_generate_raw(level_number: int, seed_offset: int, learning_path: str) -> int:
    learning = normalize_learning_buckets(load_optional_json(learning_path))
    generated = generate_level_raw(level_number, learning, seed_offset=seed_offset)
    print(f"level_number={level_number}")
    print(f"seed_offset={seed_offset}")
    print(serialize_level_to_canonical_json(generated, f"procedural_level_{level_number}_{seed_offset}.json"))
    return 0


def handle_procedural_generate_level(level_number: int, attempts: int, learning_path: str) -> int:
    learning = normalize_learning_buckets(load_optional_json(learning_path))
    generated = generate_level(level_number, learning, attempts=attempts)
    print(f"level_number={level_number}")
    print(f"attempts={generated.attempt_count}")
    print(f"source={generated.source}")
    print(serialize_level_to_canonical_json(generated.level, f"procedural_level_{level_number}.json"))
    return 0


def handle_procedural_generate_batch(start_level: int, end_level: int, count: int, learning_path: str) -> int:
    learning = normalize_learning_buckets(load_optional_json(learning_path))
    batch = generate_learned_session_batch(start_level, end_level, count, learning)
    print(f"start_level={batch.start_level}")
    print(f"end_level={batch.end_level}")
    print(f"requested_count={batch.requested_count}")
    print(f"produced_count={batch.produced_count}")
    print(f"attempts={batch.attempts}")
    print(f"source={batch.source}")
    print(
        json.dumps(
            [
                json.loads(serialize_level_to_canonical_json(level, f"learned_batch_{index + 1:02d}.json"))
                for index, level in enumerate(batch.levels)
            ],
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


def handle_serve_ui(host: str, port: int) -> int:
    server = create_server(host=host, port=port, root=find_project_root())
    actual_host, actual_port = server.server_address
    print(f"Feed the Bear Python UI running at http://{actual_host}:{actual_port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


def resolve_input_path(path: Path) -> Path:
    return resolve_repo_path(path, find_project_root())


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "status":
        return handle_status()
    if args.command == "ui-status":
        return handle_ui_status()
    if args.command == "serve-ui":
        return handle_serve_ui(args.host, args.port)
    if args.command == "paths":
        return handle_paths(args.root)
    if args.command == "inspect-level":
        return handle_inspect_level(args.path)
    if args.command == "validate-level":
        return handle_validate_level(args.path)
    if args.command == "serialize-level":
        return handle_serialize_level(args.path)
    if args.command == "validate-levels-under":
        return handle_validate_levels_under(args.folder)
    if args.command == "summarize-level-pack":
        return handle_summarize_level_pack(args.folder)
    if args.command == "file-status":
        return handle_file_status(args.relative_path)
    if args.command == "save-file":
        return handle_save_file(args.relative_path, args.content)
    if args.command == "append-file":
        return handle_append_file(args.relative_path, args.content)
    if args.command == "read-file":
        return handle_read_file(args.relative_path)
    if args.command == "save-data-url":
        return handle_save_data_url(args.relative_path, args.data_url)
    if args.command == "create-zip":
        return handle_create_zip(args.relative_path, args.entries_json)
    if args.command == "inspect-progression":
        return handle_inspect_progression(args.path)
    if args.command == "validate-progression":
        return handle_validate_progression(args.path)
    if args.command == "save-progression":
        return handle_save_progression(args.path, args.output)
    if args.command == "inspect-manager-metadata":
        return handle_inspect_manager_metadata(args.path)
    if args.command == "save-manager-metadata":
        return handle_save_manager_metadata(args.path, args.output)
    if args.command == "inspect-live-progressions":
        return handle_inspect_live_progressions(args.path)
    if args.command == "validate-live-progressions":
        return handle_validate_live_progressions(args.path)
    if args.command == "save-live-progressions":
        return handle_save_live_progressions(args.path, args.output)
    if args.command == "inspect-play-session":
        return handle_inspect_play_session(args.path)
    if args.command == "append-playtest-record":
        return handle_append_playtest_record(args.path, args.origin)
    if args.command == "save-play-session":
        return handle_save_play_session(args.path, args.output)
    if args.command == "inspect-play-sessions-state":
        return handle_inspect_play_sessions_state(args.path)
    if args.command == "save-play-sessions-state":
        return handle_save_play_sessions_state(args.path, args.output)
    if args.command == "spreadsheet-status":
        return handle_spreadsheet_status(args.credentials_path, args.token_path)
    if args.command == "spreadsheet-run":
        return handle_spreadsheet_run(args.key, args.args, args.timeout)
    if args.command == "spreadsheet-disconnect":
        return handle_spreadsheet_disconnect(args.token_path)
    if args.command == "spreadsheet-clear-cache":
        return handle_spreadsheet_clear_cache()
    if args.command == "procedural-score-level":
        return handle_procedural_score_level(args.path, args.learning_path)
    if args.command == "procedural-adjustments":
        return handle_procedural_adjustments(args.level_number, args.learning_path)
    if args.command == "procedural-reference-variants":
        return handle_procedural_reference_variants(
            args.path,
            args.count,
            args.pairs,
            args.blockers,
            args.board,
            args.learning_path,
        )
    if args.command == "procedural-generate-raw":
        return handle_procedural_generate_raw(args.level_number, args.seed_offset, args.learning_path)
    if args.command == "procedural-generate-level":
        return handle_procedural_generate_level(args.level_number, args.attempts, args.learning_path)
    if args.command == "procedural-generate-batch":
        return handle_procedural_generate_batch(args.start_level, args.end_level, args.count, args.learning_path)
    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

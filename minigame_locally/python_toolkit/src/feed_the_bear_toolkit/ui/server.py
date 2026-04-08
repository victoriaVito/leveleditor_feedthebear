from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from feed_the_bear_toolkit.domain.levels import (
    load_level_file,
    parse_level_dict,
    serialize_level_to_canonical_dict,
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
    load_play_session_file,
    load_play_sessions_state,
    save_play_session_snapshot,
    save_play_sessions_state,
)
from feed_the_bear_toolkit.domain.validation import validate_level_structure
from feed_the_bear_toolkit.services.config import find_project_root, resolve_repo_path
from feed_the_bear_toolkit.services.procedural import (
    generate_learned_session_batch,
    generate_level,
    generate_level_raw,
    generate_reference_variants,
)
from feed_the_bear_toolkit.services.spreadsheet import (
    clear_spreadsheet_ui_cache,
    disconnect_spreadsheet_token,
    inspect_spreadsheet_status,
    run_spreadsheet_command,
)
from feed_the_bear_toolkit.services.repo_io import save_text_file
from feed_the_bear_toolkit.ui.app import (
    app_status,
    build_app_snapshot,
    build_status_snapshot,
    render_app_html,
)


def _jsonify(value: Any) -> Any:
    if is_dataclass(value):
        return {key: _jsonify(val) for key, val in asdict(value).items()}
    if isinstance(value, dict):
        return {str(key): _jsonify(val) for key, val in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonify(item) for item in value]
    if isinstance(value, Path):
        return str(value)
    return value


def _level_details(path: Path) -> dict[str, Any]:
    level = load_level_file(path)
    validation = validate_level_structure(level)
    cells = []
    for row in range(level.rows or 0):
        row_cells = []
        for col in range(level.cols or 0):
            label = ""
            kind = "empty"
            for pair in level.pairs:
                if pair.start.y == row and pair.start.x == col:
                    label = f"{pair.id}1"
                    kind = "node"
                    break
                if pair.end.y == row and pair.end.x == col:
                    label = f"{pair.id}2"
                    kind = "node"
                    break
            if kind == "empty":
                for blocker in level.blockers:
                    if blocker.y == row and blocker.x == col:
                        label = "X"
                        kind = "blocker"
                        break
            row_cells.append({"row": row, "col": col, "label": label, "kind": kind})
        cells.append(row_cells)
    return {
        "level": {
            "id": level.id,
            "difficulty_tier": level.difficulty_tier,
            "cols": level.cols,
            "rows": level.rows,
            "moves": level.moves,
            "pair_count": len(level.pairs),
            "blocker_count": len(level.blockers),
            "solution_count": level.solution_count,
            "target_density": level.target_density,
            "blockers": [[cell.y, cell.x] for cell in level.blockers],
            "cells": cells,
            "pairs": [
                {
                    "id": pair.id,
                    "type": pair.type,
                    "start": [pair.start.y, pair.start.x],
                    "end": [pair.end.y, pair.end.x],
                }
                for pair in level.pairs
            ],
        },
        "validation": _jsonify(validation),
        "canonical_json": serialize_level_to_canonical_json(level, path.name),
    }


def _parse_json_text(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, (list, dict)):
        return value
    text = str(value).strip()
    if not text:
        return fallback
    return json.loads(text)


def _load_optional_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        loaded = json.loads(path.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, OSError):
        return {}
    return loaded if isinstance(loaded, dict) else {}


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float) and int(value) == value:
        return int(value)
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _editor_preview(payload: dict[str, Any], root: Path) -> dict[str, Any]:
    source_path_text = str(payload.get("source_path") or payload.get("path") or "").strip()
    base_raw: dict[str, Any] = {}
    preferred_name = "edited_level.json"
    if source_path_text:
        source_candidate = Path(source_path_text)
        source_path = source_candidate if source_candidate.is_absolute() else (root / source_candidate).resolve()
        base_loaded = json.loads(source_path.read_text(encoding="utf-8-sig"))
        if isinstance(base_loaded, dict):
            base_raw = dict(base_loaded)
            preferred_name = source_path.name

    level_id = str(payload.get("id") or base_raw.get("id") or preferred_name.replace(".json", "")).strip()
    difficulty_tier = _as_int(payload.get("difficulty_tier"))
    cols = _as_int(payload.get("cols"))
    rows = _as_int(payload.get("rows"))
    moves = _as_int(payload.get("moves"))
    solution_count = _as_int(payload.get("solution_count"))
    target_density = str(payload.get("target_density") or "").strip() or None
    pairs = _parse_json_text(payload.get("pairs_json"), base_raw.get("pairs") or [])
    blockers = _parse_json_text(payload.get("blockers_json"), base_raw.get("blockers") or [])

    raw = dict(base_raw)
    raw["id"] = level_id
    raw["difficultyTier"] = difficulty_tier
    raw["gridSize"] = {"cols": cols, "rows": rows}
    raw["moves"] = moves
    raw["pairs"] = pairs
    raw["blockers"] = blockers
    raw["decal"] = _as_bool(payload.get("decal", raw.get("decal")))
    if solution_count is None:
        raw.pop("solutionCount", None)
    else:
        raw["solutionCount"] = solution_count
    if target_density is None:
        raw.pop("targetDensity", None)
    else:
        raw["targetDensity"] = target_density

    level = parse_level_dict(raw)
    canonical_dict = serialize_level_to_canonical_dict(level, preferred_name)
    canonical_json = json.dumps(canonical_dict, indent=2, ensure_ascii=False)
    validation = validate_level_structure(level)
    details = _level_details_from_level(level)
    return {
        "source_path": source_path_text or None,
        "level": details,
        "validation": _jsonify(validation),
        "canonical_json": canonical_json,
        "canonical_dict": canonical_dict,
    }


def _level_details_from_level(level: Any) -> dict[str, Any]:
    cells = []
    for row in range(level.rows or 0):
        row_cells = []
        for col in range(level.cols or 0):
            label = ""
            kind = "empty"
            for pair in level.pairs:
                if pair.start.y == row and pair.start.x == col:
                    label = f"{pair.id}1"
                    kind = "node"
                    break
                if pair.end.y == row and pair.end.x == col:
                    label = f"{pair.id}2"
                    kind = "node"
                    break
            if kind == "empty":
                for blocker in level.blockers:
                    if blocker.y == row and blocker.x == col:
                        label = "X"
                        kind = "blocker"
                        break
            row_cells.append({"row": row, "col": col, "label": label, "kind": kind})
        cells.append(row_cells)
    return {
        "id": level.id,
        "difficulty_tier": level.difficulty_tier,
        "cols": level.cols,
        "rows": level.rows,
        "moves": level.moves,
        "decal": level.decal,
        "pair_count": len(level.pairs),
        "blocker_count": len(level.blockers),
        "solution_count": level.solution_count,
        "target_density": level.target_density,
        "blockers": [[cell.y, cell.x] for cell in level.blockers],
        "cells": cells,
        "pairs": [
            {
                "id": pair.id,
                "type": pair.type,
                "start": [pair.start.y, pair.start.x],
                "end": [pair.end.y, pair.end.x],
            }
            for pair in level.pairs
        ],
    }


def _play_session_summary() -> dict[str, Any]:
    session = load_play_session_file(resolve_repo_path(Path("playtest/latest_play_session.json")))
    return {
        "saved_at": session.saved_at,
        "solved": session.solved,
        "selected_pair": session.selected_pair,
        "history_length": len(session.history),
        "path_count": len(session.paths),
        "board_width": session.level.get("board_width"),
        "board_height": session.level.get("board_height"),
        "level_name": session.level.get("name") or session.level.get("id") or dict(session.level.get("meta") or {}).get("source_name"),
    }


def _sessions_state_summary() -> dict[str, Any]:
    state = load_play_sessions_state(resolve_repo_path(Path(".local/toolkit_state/play_sessions_state.json")))
    return {
        "queue_count": len(state.queue),
        "pending_count": sum(1 for item in state.queue if item.review_status == "PENDING"),
        "changed_count": sum(1 for item in state.queue if item.changed),
    }


def dispatch_request(
    method: str,
    path: str,
    query: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
    root: Path | None = None,
) -> tuple[int, dict[str, Any]]:
    project_root = root.resolve() if root is not None else find_project_root()
    query = query or {}
    payload = payload or {}

    try:
        if method == "GET" and path == "/api/status":
            return HTTPStatus.OK, {"ok": True, **build_status_snapshot(project_root)}
        if method == "GET" and path == "/api/snapshot":
            return HTTPStatus.OK, {"ok": True, "snapshot": build_app_snapshot(project_root)}
        if method == "GET" and path == "/api/inspect-level":
            target = resolve_repo_path(Path(query.get("path", "levels/Progression B · Level 2.json")), project_root)
            return HTTPStatus.OK, {"ok": True, **_level_details(target)}
        if method == "GET" and path == "/api/validate-level":
            target = resolve_repo_path(Path(query.get("path", "levels/Progression B · Level 2.json")), project_root)
            level = load_level_file(target)
            return HTTPStatus.OK, {"ok": True, "result": _jsonify(validate_level_structure(level))}
        if method == "GET" and path == "/api/serialize-level":
            target = resolve_repo_path(Path(query.get("path", "levels/Progression B · Level 2.json")), project_root)
            level = load_level_file(target)
            return HTTPStatus.OK, {"ok": True, "canonical_json": serialize_level_to_canonical_json(level, target.name)}
        if method == "GET" and path == "/api/summarize-level-pack":
            folder = resolve_repo_path(Path(query.get("folder", "levels/progression_g")), project_root)
            return HTTPStatus.OK, {"ok": True, "summary": _jsonify(summarize_level_pack(folder))}
        if method == "GET" and path == "/api/validate-levels-under":
            folder = resolve_repo_path(Path(query.get("folder", "levels/progression_g")), project_root)
            return HTTPStatus.OK, {"ok": True, "summary": _jsonify(summarize_level_pack(folder))}
        if method == "GET" and path == "/api/inspect-progression":
            target = resolve_repo_path(Path(query.get("path", "progressions/progression_g.json")), project_root)
            progression = load_progression_file(target)
            return HTTPStatus.OK, {
                "ok": True,
                "progression": {
                    "name": progression.name,
                    "locked": progression.locked,
                    "tutorial_level_file": progression.tutorial_level_file,
                    "slot_count": len(progression.slots),
                    "assigned_slots": progression.assigned_slots,
                    "slots": _jsonify(progression.slots),
                },
            }
        if method == "GET" and path == "/api/validate-progression":
            target = resolve_repo_path(Path(query.get("path", "progressions/progression_g.json")), project_root)
            progression = load_progression_file(target)
            return HTTPStatus.OK, {"ok": True, "summary": _jsonify(validate_progression_levels(progression, project_root))}
        if method == "GET" and path == "/api/inspect-manager-metadata":
            metadata = load_manager_metadata(resolve_repo_path(Path("progressions/manager_state/level_manager_metadata.json"), project_root))
            return HTTPStatus.OK, {"ok": True, "metadata": _jsonify(metadata)}
        if method == "GET" and path == "/api/inspect-live-progressions":
            live = load_live_progressions(resolve_repo_path(Path("progressions/manager_progressions_live.json"), project_root))
            return HTTPStatus.OK, {"ok": True, "keys": sorted(live), "count": len(live), "live": _jsonify(live)}
        if method == "GET" and path == "/api/inspect-play-session":
            return HTTPStatus.OK, {"ok": True, "session": _play_session_summary()}
        if method == "GET" and path == "/api/inspect-play-sessions-state":
            return HTTPStatus.OK, {"ok": True, "state": _sessions_state_summary()}
        if method == "GET" and path == "/api/procedural-score-level":
            level_path = resolve_repo_path(Path(query.get("path", "levels/Progression B · Level 2.json")), project_root)
            learning_path = resolve_repo_path(Path(query.get("learning_path", ".local/toolkit_state/learning_state.json")), project_root)
            level = load_level_file(level_path)
            learning = normalize_learning_buckets(_load_optional_json(learning_path))
            score = score_candidate_with_learning(level, learning)
            return HTTPStatus.OK, {
                "ok": True,
                "path": str(level_path),
                "learning_path": str(learning_path),
                "score": _jsonify(score),
            }
        if method == "GET" and path == "/api/procedural-adjustments":
            learning_path = resolve_repo_path(Path(query.get("learning_path", ".local/toolkit_state/learning_state.json")), project_root)
            level_number = _as_int(query.get("level_number")) or 1
            learning = normalize_learning_buckets(_load_optional_json(learning_path))
            adjustments = learning_driven_generation_adjustments(level_number, learning)
            return HTTPStatus.OK, {
                "ok": True,
                "level_number": level_number,
                "learning_path": str(learning_path),
                "adjustments": _jsonify(adjustments),
            }
        if method == "GET" and path == "/api/procedural-reference-variants":
            level_path = resolve_repo_path(Path(query.get("path", "levels/Progression B · Level 2.json")), project_root)
            learning_path = resolve_repo_path(Path(query.get("learning_path", ".local/toolkit_state/learning_state.json")), project_root)
            count = _as_int(query.get("count")) or 3
            adjustments = {
                "pairs": query.get("pairs", "same"),
                "blockers": query.get("blockers", "same"),
                "board": query.get("board", "same"),
            }
            base_level = load_level_file(level_path)
            variants = generate_reference_variants(
                base_level,
                project_root,
                base_file_name=level_path.name,
                adjustments=adjustments,
                count=count,
                learning_path=learning_path,
            )
            return HTTPStatus.OK, {
                "ok": True,
                "path": str(level_path),
                "learning_path": str(learning_path),
                "intent_text": procedural_reference_intent_text(adjustments),
                "variants": [
                    {
                        **_jsonify(variant),
                        "level": _level_details_from_level(variant.level),
                        "canonical_json": serialize_level_to_canonical_json(variant.level, variant.name),
                    }
                    for variant in variants
                ],
            }
        if method == "GET" and path == "/api/procedural-generate-raw":
            learning_path = resolve_repo_path(Path(query.get("learning_path", ".local/toolkit_state/learning_state.json")), project_root)
            level_number = _as_int(query.get("level_number")) or 1
            seed_offset = _as_int(query.get("seed_offset")) or 0
            learning = normalize_learning_buckets(_load_optional_json(learning_path))
            level = generate_level_raw(level_number, learning, seed_offset=seed_offset)
            return HTTPStatus.OK, {
                "ok": True,
                "level_number": level_number,
                "seed_offset": seed_offset,
                "learning_path": str(learning_path),
                "level": _level_details_from_level(level),
                "canonical_json": serialize_level_to_canonical_json(level, f"procedural_level_{level_number}_{seed_offset}.json"),
            }
        if method == "GET" and path == "/api/procedural-generate-level":
            learning_path = resolve_repo_path(Path(query.get("learning_path", ".local/toolkit_state/learning_state.json")), project_root)
            level_number = _as_int(query.get("level_number")) or 1
            attempts = _as_int(query.get("attempts")) or 12
            learning = normalize_learning_buckets(_load_optional_json(learning_path))
            generated = generate_level(level_number, learning, attempts=attempts)
            return HTTPStatus.OK, {
                "ok": True,
                "level_number": level_number,
                "attempts": attempts,
                "learning_path": str(learning_path),
                "source": generated.source,
                "level": _level_details_from_level(generated.level),
                "canonical_json": serialize_level_to_canonical_json(generated.level, f"procedural_level_{level_number}.json"),
            }
        if method == "GET" and path == "/api/procedural-generate-batch":
            learning_path = resolve_repo_path(Path(query.get("learning_path", ".local/toolkit_state/learning_state.json")), project_root)
            start_level = _as_int(query.get("start_level")) or 1
            end_level = _as_int(query.get("end_level")) or 10
            count = _as_int(query.get("count")) or 12
            learning = normalize_learning_buckets(_load_optional_json(learning_path))
            batch = generate_learned_session_batch(start_level, end_level, count, learning)
            return HTTPStatus.OK, {
                "ok": True,
                "learning_path": str(learning_path),
                "start_level": batch.start_level,
                "end_level": batch.end_level,
                "requested_count": batch.requested_count,
                "produced_count": batch.produced_count,
                "attempts": batch.attempts,
                "source": batch.source,
                "levels": [
                    {
                        "name": f"learned_batch_{index + 1:02d}.json",
                        "level": _level_details_from_level(level),
                        "canonical_json": serialize_level_to_canonical_json(level, f"learned_batch_{index + 1:02d}.json"),
                    }
                    for index, level in enumerate(batch.levels)
                ],
            }
        if method == "GET" and path == "/api/spreadsheet-status":
            status = inspect_spreadsheet_status(
                project_root,
                credentials_path=query.get("credentials_path", ".local/google_oauth_client.json"),
                token_path=query.get("token_path", ".local/google_sheets_token.json"),
            )
            return HTTPStatus.OK, {"ok": True, "status": _jsonify(status)}
        if method == "POST" and path == "/api/save-progression":
            source = resolve_repo_path(Path(str(payload.get("path", "progressions/progression_g.json"))), project_root)
            output = str(payload.get("output", "output/python_toolkit_checks/progression_g_roundtrip.json"))
            progression = load_progression_file(source)
            saved = save_progression_file(progression, output, project_root)
            return HTTPStatus.OK, {"ok": True, "path": str(saved)}
        if method == "POST" and path == "/api/save-live-progressions":
            output = str(payload.get("output", "output/python_toolkit_checks/manager_progressions_live_roundtrip.json"))
            live = load_live_progressions(resolve_repo_path(Path("progressions/manager_progressions_live.json"), project_root))
            saved = save_live_progressions(live, output, project_root)
            return HTTPStatus.OK, {"ok": True, "path": str(saved), "count": len(live)}
        if method == "POST" and path == "/api/save-manager-metadata":
            output = str(payload.get("output", "output/python_toolkit_checks/level_manager_metadata_roundtrip.json"))
            metadata = load_manager_metadata(resolve_repo_path(Path("progressions/manager_state/level_manager_metadata.json"), project_root))
            saved = save_manager_metadata(metadata, output, project_root)
            return HTTPStatus.OK, {"ok": True, "path": str(saved)}
        if method == "POST" and path == "/api/save-play-session":
            output = str(payload.get("output", "output/python_toolkit_checks/latest_play_session_roundtrip.json"))
            session = load_play_session_file(resolve_repo_path(Path("playtest/latest_play_session.json"), project_root))
            saved = save_play_session_snapshot(session, output, project_root)
            return HTTPStatus.OK, {"ok": True, "path": str(saved)}
        if method == "POST" and path == "/api/save-play-sessions-state":
            output = str(payload.get("output", "output/python_toolkit_checks/play_sessions_state_roundtrip.json"))
            state = load_play_sessions_state(resolve_repo_path(Path(".local/toolkit_state/play_sessions_state.json"), project_root))
            saved = save_play_sessions_state(state, output, project_root)
            return HTTPStatus.OK, {"ok": True, "path": str(saved), "queue_count": len(state.queue)}
        if method == "POST" and path == "/api/append-playtest-record":
            origin = str(payload.get("origin", "python_ui"))
            session = load_play_session_file(resolve_repo_path(Path("playtest/latest_play_session.json"), project_root))
            saved = append_playtest_dataset_record(session, origin=origin, root=project_root)
            return HTTPStatus.OK, {"ok": True, "path": str(saved), "origin": origin}
        if method == "POST" and path == "/api/spreadsheet-run":
            key = str(payload.get("key") or "").strip()
            args = payload.get("args") or []
            timeout = payload.get("timeout")
            credentials_path = str(payload.get("credentials_path") or ".local/google_oauth_client.json")
            token_path = str(payload.get("token_path") or ".local/google_sheets_token.json")
            if not isinstance(args, list):
                raise ValueError("spreadsheet args must be a JSON list")
            result = run_spreadsheet_command(
                key,
                project_root,
                args=[str(arg) for arg in args],
                timeout=float(timeout) if timeout is not None else None,
                credentials_path=credentials_path,
                token_path=token_path,
            )
            return HTTPStatus.OK, {"ok": result.ok, "result": _jsonify(result)}
        if method == "POST" and path == "/api/save-procedural-candidate":
            output = str(payload.get("output") or "").strip()
            canonical_json = str(payload.get("canonical_json") or "")
            if not output:
                raise ValueError("Missing output path for procedural candidate save")
            saved = save_text_file(output, canonical_json, project_root)
            return HTTPStatus.OK, {"ok": True, "path": str(saved.path), "bytes_written": saved.bytes_written}
        if method == "POST" and path == "/api/spreadsheet-disconnect":
            result = disconnect_spreadsheet_token(
                project_root,
                token_path=str(payload.get("token_path") or ".local/google_sheets_token.json"),
            )
            return HTTPStatus.OK, {"ok": result.ok, "result": _jsonify(result)}
        if method == "POST" and path == "/api/spreadsheet-clear-cache":
            result = clear_spreadsheet_ui_cache(project_root)
            return HTTPStatus.OK, {"ok": result.ok, "result": _jsonify(result)}
        if method == "POST" and path == "/api/preview-level-edit":
            preview = _editor_preview(payload, project_root)
            return HTTPStatus.OK, {"ok": True, **preview}
        if method == "POST" and path == "/api/save-level-edit":
            preview = _editor_preview(payload, project_root)
            output = str(payload.get("output") or "output/python_toolkit_checks/edited_level.json")
            saved = save_text_file(output, preview["canonical_json"], project_root)
            return HTTPStatus.OK, {
                "ok": True,
                "path": str(saved.path),
                "bytes_written": saved.bytes_written,
                "level": preview["level"],
                "canonical_json": preview["canonical_json"],
                "validation": preview["validation"],
            }
        return HTTPStatus.NOT_FOUND, {"ok": False, "error": f"Unknown route: {path}"}
    except Exception as err:
        return HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(err)}


class ToolkitUiServer(ThreadingHTTPServer):
    def __init__(self, server_address: tuple[str, int], root: Path | None = None):
        self.project_root = root.resolve() if root is not None else find_project_root()
        super().__init__(server_address, ToolkitRequestHandler)


class ToolkitRequestHandler(BaseHTTPRequestHandler):
    server: ToolkitUiServer

    def log_message(self, format: str, *args: Any) -> None:
        return

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/":
            snapshot = build_app_snapshot(self.server.project_root)
            self._respond_html(render_app_html(snapshot))
            return
        query = {key: values[-1] for key, values in parse_qs(parsed.query, keep_blank_values=True).items() if values}
        status, payload = dispatch_request("GET", parsed.path, query=query, root=self.server.project_root)
        self._respond_json(payload, status=HTTPStatus(status))

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        payload = json.loads(raw.decode("utf-8") or "{}")
        if not isinstance(payload, dict):
            self._respond_json({"ok": False, "error": "JSON body must be an object"}, status=HTTPStatus.BAD_REQUEST)
            return
        status, response = dispatch_request("POST", parsed.path, payload=payload, root=self.server.project_root)
        self._respond_json(response, status=HTTPStatus(status))

    def _respond_html(self, body: str, status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _respond_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def create_server(host: str = "127.0.0.1", port: int = 8765, root: Path | None = None) -> ToolkitUiServer:
    return ToolkitUiServer((host, port), root=root)


def serve_ui(host: str = "127.0.0.1", port: int = 8765, root: Path | None = None) -> ToolkitUiServer:
    server = create_server(host=host, port=port, root=root)
    try:
        server.serve_forever()
    finally:
        server.server_close()
    return server

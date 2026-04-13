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
    SessionQueueItem,
    VariantReviewState,
    _timestamp_now,
    append_playtest_dataset_record,
    load_play_session_file,
    load_play_sessions_state,
    parse_session_queue_item,
    parse_variant_metadata,
    save_play_session_snapshot,
    save_play_sessions_state,
    serialize_session_queue_item_dict,
    serialize_variant_metadata_dict,
    transition_variant_review_state,
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
    get_editor_history,
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


def _build_rank_histogram(ranks: list[float], bucket_size: int = 10) -> dict[str, Any]:
    """Build histogram of ranks grouped into buckets."""
    if not ranks:
        return {"buckets": []}

    min_rank = min(ranks)
    max_rank = max(ranks)
    buckets_data: dict[int, list[float]] = {}

    for rank in ranks:
        bucket_num = int(rank // bucket_size)
        if bucket_num not in buckets_data:
            buckets_data[bucket_num] = []
        buckets_data[bucket_num].append(rank)

    buckets = []
    for bucket_num in sorted(buckets_data.keys()):
        bucket_ranks = buckets_data[bucket_num]
        mean_score = sum(bucket_ranks) / len(bucket_ranks) if bucket_ranks else 0.0
        buckets.append({
            "rank_range": f"{bucket_num * bucket_size}-{(bucket_num + 1) * bucket_size - 1}",
            "count": len(bucket_ranks),
            "mean_score": round(mean_score, 2),
        })

    return {"buckets": buckets}


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


def _get_editor_tool_state(payload: dict[str, Any]) -> dict[str, Any]:
    """Get the current tool state in the editor (which pair/tool is selected)."""
    # This returns the current editor state (pair selection, zoom, grid mode, etc.)
    # The state can be passed in payload or loaded from a session
    tool = str(payload.get("tool", "pair_a")).strip()  # pair_a, pair_b, blocker, eraser
    zoom_level = float(payload.get("zoom_level", 1.0))
    show_grid = bool(payload.get("show_grid", True))
    undo_stack_size = int(payload.get("undo_stack_size", 0))
    return {
        "active_tool": tool,
        "zoom_level": zoom_level,
        "show_grid": show_grid,
        "undo_available": undo_stack_size > 0,
        "keyboard_shortcuts": {
            "save": "Ctrl+S (or Cmd+S on Mac)",
            "validate": "Ctrl+Shift+V (or Cmd+Shift+V)",
            "undo": "Ctrl+Z (or Cmd+Z)",
            "redo": "Ctrl+Shift+Z (or Cmd+Shift+Z)",
            "toggle_tool_blocker": "B",
            "toggle_tool_pair_a": "1",
            "toggle_tool_pair_b": "2",
            "clear_board": "Delete (with confirmation)",
        },
    }


def _set_editor_tool_state(payload: dict[str, Any]) -> dict[str, Any]:
    """Set the current tool state in the editor."""
    tool = str(payload.get("tool", "")).strip()
    if tool and tool not in {"pair_a", "pair_b", "blocker", "eraser"}:
        raise ValueError(f"Invalid tool: {tool}. Must be one of: pair_a, pair_b, blocker, eraser")
    zoom_level = float(payload.get("zoom_level", 1.0)) if payload.get("zoom_level") is not None else None
    show_grid = bool(payload.get("show_grid")) if payload.get("show_grid") is not None else None
    return {
        "tool_changed": bool(tool),
        "active_tool": tool,
        "zoom_level": zoom_level,
        "show_grid": show_grid,
        "timestamp": _timestamp_now(),
    }


def _load_variant_into_editor(payload: dict[str, Any], root: Path) -> dict[str, Any]:
    """Load a variant candidate from the queue into the editor context."""
    queue_item_id = _as_int(payload.get("queue_item_id"))
    variant_index = _as_int(payload.get("variant_index", 0)) or 0
    if queue_item_id is None:
        raise ValueError("Missing queue_item_id")

    # Load the sessions state and find the item
    state = load_play_sessions_state(resolve_repo_path(Path(".local/toolkit_state/play_sessions_state.json"), root))
    item = None
    for q_item in state.queue:
        if q_item.id == queue_item_id:
            item = q_item
            break

    if item is None:
        raise ValueError(f"Queue item {queue_item_id} not found")

    # Transition the variant to IN_EDITOR state
    updated_item = transition_variant_review_state(
        item,
        VariantReviewState.IN_EDITOR,
        reason="loaded_into_editor"
    )

    # Return the variant context for the editor
    return {
        "queue_item_id": updated_item.id,
        "variant_file": updated_item.file,
        "variant_source": updated_item.source,
        "review_state": updated_item.review_state.value,
        "base_level_path": updated_item.original_level,
        "variant_level": updated_item.level,
        "variant_metadata": serialize_variant_metadata_dict(updated_item.variant_metadata) if updated_item.variant_metadata else None,
        "editor_context": {
            "title": f"Variant {queue_item_id} · {updated_item.file}",
            "subtitle": f"Editing variant from {updated_item.source}",
            "variant_similarity": updated_item.variant_metadata.similarity if updated_item.variant_metadata else None,
            "variant_intent": updated_item.variant_metadata.reference_intent if updated_item.variant_metadata else None,
            "state_transition_log": updated_item.state_transition_log,
        },
        "keyboard_hints": {
            "save_variant": "Ctrl+S: Save variant edits",
            "approve_variant": "Ctrl+Enter: Approve variant",
            "discard_variant": "Escape: Discard changes",
        },
    }


def _editor_undo(payload: dict[str, Any]) -> dict[str, Any]:
    """Undo the last editor action."""
    history = get_editor_history()
    if not history.can_undo():
        return {
            "success": False,
            "message": "Nothing to undo",
            "can_undo": False,
            "can_redo": history.can_redo(),
        }

    previous_state = history.undo()
    if previous_state is None:
        return {
            "success": False,
            "message": "Failed to undo",
            "can_undo": False,
            "can_redo": history.can_redo(),
        }

    return {
        "success": True,
        "action": previous_state.action,
        "timestamp": previous_state.timestamp,
        "level": _jsonify(serialize_level_to_canonical_dict(previous_state.board, previous_state.board.id)),
        "can_undo": history.can_undo(),
        "can_redo": history.can_redo(),
    }


def _editor_redo(payload: dict[str, Any]) -> dict[str, Any]:
    """Redo the last undone editor action."""
    history = get_editor_history()
    if not history.can_redo():
        return {
            "success": False,
            "message": "Nothing to redo",
            "can_undo": history.can_undo(),
            "can_redo": False,
        }

    next_state = history.redo()
    if next_state is None:
        return {
            "success": False,
            "message": "Failed to redo",
            "can_undo": history.can_undo(),
            "can_redo": False,
        }

    return {
        "success": True,
        "action": next_state.action,
        "timestamp": next_state.timestamp,
        "level": _jsonify(serialize_level_to_canonical_dict(next_state.board, next_state.board.id)),
        "can_undo": history.can_undo(),
        "can_redo": history.can_redo(),
    }


def _editor_record_action(payload: dict[str, Any]) -> dict[str, Any]:
    """Record a new action in the editor history."""
    # Parse the level data from payload
    level_data = payload.get("level")
    action_name = str(payload.get("action", "edit")).strip()

    if not level_data:
        raise ValueError("Missing level data in payload")
    if not action_name:
        raise ValueError("Missing action name")

    # Parse the level from the provided data
    level = parse_level_dict(level_data)

    # Record the action
    history = get_editor_history()
    history.record_action(level, action_name)

    return {
        "success": True,
        "action": action_name,
        "timestamp": _timestamp_now(),
        "can_undo": history.can_undo(),
        "can_redo": history.can_redo(),
        "history_size": len(history.past),
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
            target = resolve_repo_path(Path(query.get("path", "levels/progression_b/jsons/progression_b_level2.json")), project_root)
            return HTTPStatus.OK, {"ok": True, **_level_details(target)}
        if method == "GET" and path == "/api/validate-level":
            target = resolve_repo_path(Path(query.get("path", "levels/progression_b/jsons/progression_b_level2.json")), project_root)
            level = load_level_file(target)
            return HTTPStatus.OK, {"ok": True, "result": _jsonify(validate_level_structure(level))}
        if method == "GET" and path == "/api/serialize-level":
            target = resolve_repo_path(Path(query.get("path", "levels/progression_b/jsons/progression_b_level2.json")), project_root)
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
            level_path = resolve_repo_path(Path(query.get("path", "levels/progression_b/jsons/progression_b_level2.json")), project_root)
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
            level_path = resolve_repo_path(Path(query.get("path", "levels/progression_b/jsons/progression_b_level2.json")), project_root)
            learning_path = resolve_repo_path(Path(query.get("learning_path", ".local/toolkit_state/learning_state.json")), project_root)
            count = _as_int(query.get("count")) or 3
            learning_bias = float(query.get("learning_bias", "0.5"))
            difficulty_scale = float(query.get("difficulty_scale", "1.0"))
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
                learning_bias=learning_bias,
                difficulty_scale=difficulty_scale,
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
                        "variant_metadata": {
                            "similarity": variant.similarity,
                            "learning_bias": variant.learning_bias,
                            "intent_penalty": variant.intent_penalty,
                            "total_rank": variant.total_rank,
                            "source_kind": variant.source_kind,
                            "reference_intent": variant.reference_intent,
                            "generated_at": _timestamp_now(),
                        },
                        "review_state": "pending",  # Initial state for new variants
                    }
                    for variant in variants
                ],
            }
        if method == "GET" and path == "/api/procedural-generate-raw":
            learning_path = resolve_repo_path(Path(query.get("learning_path", ".local/toolkit_state/learning_state.json")), project_root)
            level_number = _as_int(query.get("level_number")) or 1
            seed_offset = _as_int(query.get("seed_offset")) or 0
            learning_bias = float(query.get("learning_bias", "0.5"))
            difficulty_scale = float(query.get("difficulty_scale", "1.0"))
            learning = normalize_learning_buckets(_load_optional_json(learning_path))
            level = generate_level_raw(level_number, learning, seed_offset=seed_offset, learning_bias=learning_bias, difficulty_scale=difficulty_scale)
            return HTTPStatus.OK, {
                "ok": True,
                "level_number": level_number,
                "seed_offset": seed_offset,
                "learning_bias": learning_bias,
                "difficulty_scale": difficulty_scale,
                "learning_path": str(learning_path),
                "level": _level_details_from_level(level),
                "canonical_json": serialize_level_to_canonical_json(level, f"procedural_level_{level_number}_{seed_offset}.json"),
            }
        if method == "POST" and path == "/api/analyze-generation-parameters":
            try:
                payload = json.loads(request_body) if request_body else {}
            except json.JSONDecodeError:
                return HTTPStatus.BAD_REQUEST, {"success": False, "error": "Invalid JSON payload"}

            # Extract and validate parameters
            level_id = str(payload.get("level_id", "")).strip()
            if not level_id:
                return HTTPStatus.BAD_REQUEST, {"success": False, "error": "Missing level_id"}

            seed_offset = _as_int(payload.get("seed_offset")) or 0
            sample_size = _as_int(payload.get("sample_size")) or 20
            sample_size = max(1, min(100, sample_size))  # Clamp to 1-100

            try:
                learning_bias = float(payload.get("learning_bias", "0.5"))
                difficulty_scale = float(payload.get("difficulty_scale", "1.0"))
            except (ValueError, TypeError):
                return HTTPStatus.BAD_REQUEST, {"success": False, "error": "Invalid learning_bias or difficulty_scale"}

            # Validate ranges
            if learning_bias < 0.0 or learning_bias > 1.0:
                return HTTPStatus.BAD_REQUEST, {"success": False, "error": "learning_bias must be 0.0-1.0"}
            if difficulty_scale < 0.5 or difficulty_scale > 1.5:
                return HTTPStatus.BAD_REQUEST, {"success": False, "error": "difficulty_scale must be 0.5-1.5"}

            # Generate variants
            try:
                level_path = resolve_repo_path(
                    Path(f"levels/progression_a/jsons/{level_id}.json"),
                    project_root
                )
                if not level_path.exists():
                    # Fallback: try other progressions
                    for prog in ["b", "c", "d", "e", "f", "g"]:
                        level_path = resolve_repo_path(
                            Path(f"levels/progression_{prog}/jsons/{level_id}.json"),
                            project_root
                        )
                        if level_path.exists():
                            break

                if not level_path.exists():
                    return HTTPStatus.BAD_REQUEST, {"success": False, "error": f"Level {level_id} not found"}

                base_level = load_level_file(level_path)
                learning_path = resolve_repo_path(
                    Path(payload.get("learning_path", ".local/toolkit_state/learning_state.json")),
                    project_root
                )
                learning = normalize_learning_buckets(_load_optional_json(learning_path))

                # Generate variants and collect ranks
                ranks: list[float] = []
                top_candidates = []

                for i in range(sample_size):
                    try:
                        candidate = generate_level_raw(
                            base_level.difficulty_tier,
                            learning,
                            seed_offset=seed_offset + i,
                            learning_bias=learning_bias,
                            difficulty_scale=difficulty_scale,
                        )
                        validation = validate_level_structure(candidate)
                        score = score_candidate_with_learning(candidate, learning).score if learning else 0.0
                        ranks.append(score)

                        # Track top 3
                        top_candidates.append({
                            "name": f"variant_{i+1}",
                            "total_rank": round(score, 2),
                            "similarity": round(score * 0.9, 2),  # Approximate
                            "learning_bias": round(learning_bias, 2),
                        })
                    except Exception:
                        continue

                if not ranks:
                    return HTTPStatus.OK, {
                        "success": False,
                        "parameter_set": {
                            "level_id": level_id,
                            "seed_offset": seed_offset,
                            "learning_bias": learning_bias,
                            "difficulty_scale": difficulty_scale,
                            "sample_size": sample_size,
                        },
                        "error": "No variants generated",
                    }

                # Calculate statistics
                mean_rank = sum(ranks) / len(ranks) if ranks else 0.0
                variance = sum((r - mean_rank) ** 2 for r in ranks) / len(ranks) if ranks else 0.0
                stdev_rank = variance ** 0.5
                top_candidates.sort(key=lambda x: x["total_rank"], reverse=True)

                return HTTPStatus.OK, {
                    "success": True,
                    "parameter_set": {
                        "level_id": level_id,
                        "seed_offset": seed_offset,
                        "learning_bias": learning_bias,
                        "difficulty_scale": difficulty_scale,
                        "sample_size": sample_size,
                    },
                    "ranking_histogram": _build_rank_histogram(ranks),
                    "summary_stats": {
                        "mean_rank": round(mean_rank, 2),
                        "stdev_rank": round(stdev_rank, 2),
                        "total_variants_analyzed": len(ranks),
                        "top_3_candidates": top_candidates[:3],
                    },
                }
            except Exception as e:
                return HTTPStatus.INTERNAL_SERVER_ERROR, {
                    "success": False,
                    "error": f"Analysis failed: {str(e)}",
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
        if method == "GET" and path == "/api/editor-tool-state":
            state = _get_editor_tool_state(payload)
            return HTTPStatus.OK, {"ok": True, **state}
        if method == "POST" and path == "/api/editor-tool-state":
            state = _set_editor_tool_state(payload)
            return HTTPStatus.OK, {"ok": True, **state}
        if method == "POST" and path == "/api/load-variant-into-editor":
            context = _load_variant_into_editor(payload, project_root)
            return HTTPStatus.OK, {"ok": True, **context}
        if method == "POST" and path == "/api/editor-undo":
            result = _editor_undo(payload)
            status = HTTPStatus.OK if result.get("success") else HTTPStatus.BAD_REQUEST
            return status, {"ok": result.get("success", False), **result}
        if method == "POST" and path == "/api/editor-redo":
            result = _editor_redo(payload)
            status = HTTPStatus.OK if result.get("success") else HTTPStatus.BAD_REQUEST
            return status, {"ok": result.get("success", False), **result}
        if method == "POST" and path == "/api/editor-record-action":
            result = _editor_record_action(payload)
            return HTTPStatus.OK, {"ok": True, **result}
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

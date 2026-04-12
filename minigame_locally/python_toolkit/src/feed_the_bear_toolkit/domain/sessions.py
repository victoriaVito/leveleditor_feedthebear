from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from feed_the_bear_toolkit.domain.levels import level_height, level_tier, level_width, parse_level_dict
from feed_the_bear_toolkit.domain.models import MAX_BOARD_HEIGHT, MAX_BOARD_WIDTH, MIN_BOARD_SIZE
from feed_the_bear_toolkit.domain.validation import validate_level_structure
from feed_the_bear_toolkit.services.config import find_project_root, resolve_repo_path
from feed_the_bear_toolkit.services.repo_io import append_text_file, save_text_file


def _timestamp_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=3).isoformat().replace("+00:00", "Z")


def _clone_json(value: Any) -> Any:
    return json.loads(json.dumps(value))


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float) and int(value) == value:
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return int(float(stripped))
        except ValueError:
            return None
    return None


def _supported_board_size(width: int | None, height: int | None) -> bool:
    if width is None or height is None:
        return False
    return MIN_BOARD_SIZE <= width <= MAX_BOARD_WIDTH and MIN_BOARD_SIZE <= height <= MAX_BOARD_HEIGHT


def _level_label(level: dict[str, Any]) -> str:
    for candidate in (
        level.get("name"),
        level.get("id"),
        dict(level.get("meta") or {}).get("source_name"),
        level.get("_filename"),
    ):
        if isinstance(candidate, str) and candidate.strip():
            return Path(candidate).stem
    return "unnamed_level"


def _level_difficulty(level: dict[str, Any]) -> str:
    raw = level.get("difficulty")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    tier = level_tier(level)
    if tier is None:
        return ""
    if tier <= 3:
        return "EASY"
    if tier <= 7:
        return "MEDIUM"
    return "HARD"


def _pair_color(index: int) -> str:
    palette = (
        "#0EA5E9",
        "#0284C7",
        "#0891B2",
        "#06B6D4",
        "#10B981",
        "#84CC16",
        "#EAB308",
        "#F97316",
        "#EF4444",
    )
    return palette[index % len(palette)]


def _build_runtime_grid(level: dict[str, Any]) -> list[list[str]]:
    width = level_width(level) or 0
    height = level_height(level) or 0
    grid = [["EMPTY" for _ in range(width)] for _ in range(height)]
    blockers = level.get("blockers") or []
    for blocker in blockers:
        if isinstance(blocker, (list, tuple)) and len(blocker) == 2:
            row = _as_int(blocker[0])
            col = _as_int(blocker[1])
            if row is not None and col is not None and 0 <= row < height and 0 <= col < width:
                grid[row][col] = "BLOCKED"
    for pair in level.get("pairs") or []:
        if not isinstance(pair, dict):
            continue
        pair_id = str(pair.get("id") or "").strip() or "A"
        for suffix, key in (("1", "start"), ("2", "end")):
            cell = pair.get(key)
            if isinstance(cell, (list, tuple)) and len(cell) == 2:
                row = _as_int(cell[0])
                col = _as_int(cell[1])
                if row is not None and col is not None and 0 <= row < height and 0 <= col < width:
                    grid[row][col] = f"NODE_{pair_id}{suffix}"
    return grid


def level_to_session_level_dict(level: dict[str, Any], preferred_name: str = "") -> dict[str, Any]:
    normalized = _clone_json(level)
    width = level_width(normalized)
    height = level_height(normalized)
    pairs: list[dict[str, Any]] = []
    for index, raw_pair in enumerate(list(normalized.get("pairs") or [])):
        if not isinstance(raw_pair, dict):
            continue
        pair_id = str(raw_pair.get("id") or "").strip() or chr(65 + index)
        start = raw_pair.get("start")
        end = raw_pair.get("end")
        if not isinstance(start, (list, tuple)) and isinstance(raw_pair.get("a"), dict):
            start = [raw_pair["a"].get("y"), raw_pair["a"].get("x")]
        if not isinstance(end, (list, tuple)) and isinstance(raw_pair.get("b"), dict):
            end = [raw_pair["b"].get("y"), raw_pair["b"].get("x")]
        pairs.append(
            {
                "id": pair_id,
                "start": [int(_as_int(start[0]) or 0), int(_as_int(start[1]) or 0)] if isinstance(start, (list, tuple)) and len(start) == 2 else [0, 0],
                "end": [int(_as_int(end[0]) or 0), int(_as_int(end[1]) or 0)] if isinstance(end, (list, tuple)) and len(end) == 2 else [0, 0],
                "color": raw_pair.get("color") or _pair_color(index),
                "type": str(raw_pair.get("type") or "").strip(),
            }
        )
    blockers: list[list[int]] = []
    for raw_blocker in list(normalized.get("blockers") or []):
        if isinstance(raw_blocker, dict):
            row = _as_int(raw_blocker.get("y"))
            col = _as_int(raw_blocker.get("x"))
        elif isinstance(raw_blocker, (list, tuple)) and len(raw_blocker) == 2:
            row = _as_int(raw_blocker[0])
            col = _as_int(raw_blocker[1])
        else:
            continue
        if row is None or col is None:
            continue
        blockers.append([row, col])

    runtime = normalized
    runtime["level"] = _as_int(runtime.get("level")) or _as_int(runtime.get("difficultyTier")) or 1
    runtime["board_size"] = width
    runtime["board_width"] = width
    runtime["board_height"] = height
    runtime["pairs"] = pairs
    runtime["blockers"] = blockers
    runtime["grid"] = runtime.get("grid") if isinstance(runtime.get("grid"), list) else _build_runtime_grid(runtime)
    runtime["moves"] = _as_int(runtime.get("moves")) or 0
    solution_count = _as_int(runtime.get("solution_count"))
    if solution_count is None:
        solution_count = _as_int(runtime.get("solutionCount"))
    runtime["solution_count"] = solution_count or 0
    target_density = runtime.get("target_density")
    if target_density in {None, ""}:
        target_density = runtime.get("targetDensity")
    if isinstance(target_density, str):
        runtime["target_density"] = target_density
    runtime["difficulty"] = _level_difficulty(runtime)
    golden_path = runtime.get("golden_path")
    if not isinstance(golden_path, dict):
        golden_path = runtime.get("goldenPath")
    runtime["golden_path"] = _clone_json(golden_path) if isinstance(golden_path, dict) else {}
    runtime["validation"] = dict(runtime.get("validation") or {})
    runtime["meta"] = dict(runtime.get("meta") or {})
    if preferred_name:
        runtime["meta"].setdefault("source_name", preferred_name)
        runtime.setdefault("name", Path(preferred_name).stem)
    if runtime.get("id"):
        runtime.setdefault("name", str(runtime["id"]))
    return runtime


@dataclass(slots=True)
class PlaySessionSnapshot:
    saved_at: str | None
    solved: bool
    level: dict[str, Any]
    selected_pair: str | None
    paths: dict[str, list[list[int]]]
    history: list[dict[str, Any]]
    save_reason: str | None = None
    saved_path: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class PlaytestDatasetRecord:
    saved_at: str
    origin: str
    save_reason: str
    saved_path: str
    solved: bool
    level_name: str
    level_number: int | None
    board_width: int | None
    board_height: int | None
    board: str
    pairs: int
    blockers: int
    moves: int
    difficulty: str
    decal: bool
    validation_status: str
    history_length: int
    path_lengths: dict[str, int]
    level_file: str
    level_saved_path: str
    session: dict[str, Any]


@dataclass(slots=True)
class SessionQueueItem:
    id: int | None
    file: str
    source: str
    changed: bool
    manager_item_id: int | None
    saved_path: str
    screenshot_path: str
    review_status: str | None
    validation_status: str | None
    feedback_decision: str
    feedback_reason_code: str
    feedback_keep_tags: list[str]
    feedback_pair_ids: list[str]
    feedback_note: str
    level: dict[str, Any] | None
    original_level: dict[str, Any] | None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class PlaySessionsState:
    queue: list[SessionQueueItem] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


SESSION_REVIEW_STATUSES = ("PENDING", "APPROVED", "REJECTED")


def _normalize_text_list(values: Iterable[Any] | None) -> list[str]:
    normalized: list[str] = []
    for item in list(values or []):
        text = str(item).strip()
        if text:
            normalized.append(text)
    return normalized


def find_session_queue_item(state: PlaySessionsState, item_id: int | str | None) -> SessionQueueItem | None:
    target = _as_int(item_id)
    if target is None:
        return None
    for item in state.queue:
        if item.id == target:
            return item
    return None


def session_queue_item_label(item: SessionQueueItem) -> str:
    return (
        f"id={item.id if item.id is not None else '-'}"
        f" | file={item.file or 'unnamed'}"
        f" | source={item.source or 'unknown'}"
        f" | review={item.review_status or 'PENDING'}"
        f" | validation={item.validation_status or 'UNKNOWN'}"
        f" | changed={'yes' if item.changed else 'no'}"
    )


def summarize_play_sessions_state(state: PlaySessionsState) -> dict[str, Any]:
    review_counts = {status: 0 for status in SESSION_REVIEW_STATUSES}
    for item in state.queue:
        status = (item.review_status or "PENDING").strip().upper()
        if status not in review_counts:
            review_counts[status] = 0
        review_counts[status] += 1
    selected_id = _as_int(state.raw.get("selectedId"))
    selected_item = find_session_queue_item(state, selected_id)
    active_id = _as_int(state.raw.get("activeId"))
    editing_id = _as_int(state.raw.get("editingId"))
    return {
        "queue_count": len(state.queue),
        "pending_count": review_counts.get("PENDING", 0),
        "approved_count": review_counts.get("APPROVED", 0),
        "rejected_count": review_counts.get("REJECTED", 0),
        "changed_count": sum(1 for item in state.queue if item.changed),
        "selected_id": selected_id,
        "selected_label": session_queue_item_label(selected_item) if selected_item else "",
        "active_id": active_id,
        "editing_id": editing_id,
        "review_counts": review_counts,
    }


def select_session_queue_item(state: PlaySessionsState, item_id: int | str | None) -> SessionQueueItem | None:
    item = find_session_queue_item(state, item_id)
    if item is None:
        if item_id is None:
            state.raw["selectedId"] = None
            state.raw["activeId"] = None
            state.raw["editingId"] = None
        return None
    state.raw["selectedId"] = item.id
    state.raw["activeId"] = item.id
    state.raw["editingId"] = item.id
    return item


def update_session_queue_item_feedback(
    item: SessionQueueItem,
    *,
    review_status: str | None = None,
    feedback_decision: str | None = None,
    feedback_reason_code: str | None = None,
    feedback_keep_tags: Iterable[Any] | None = None,
    feedback_pair_ids: Iterable[Any] | None = None,
    feedback_note: str | None = None,
    changed: bool = True,
) -> SessionQueueItem:
    normalized_status = str(review_status or "").strip().upper()
    normalized_decision = str(feedback_decision or "").strip().lower()
    if normalized_status:
        item.review_status = normalized_status
    elif normalized_decision in {"approve", "reject"}:
        item.review_status = "APPROVED" if normalized_decision == "approve" else "REJECTED"
    item.feedback_decision = normalized_decision
    item.feedback_reason_code = str(feedback_reason_code or "").strip()
    item.feedback_keep_tags = _normalize_text_list(feedback_keep_tags)
    item.feedback_pair_ids = _normalize_text_list(feedback_pair_ids)
    item.feedback_note = str(feedback_note or "").strip()
    item.changed = changed
    return item


def parse_play_session_dict(raw: dict[str, Any]) -> PlaySessionSnapshot:
    level = raw.get("level")
    level_dict = dict(level) if isinstance(level, dict) else {}
    paths: dict[str, list[list[int]]] = {}
    for key, value in dict(raw.get("paths") or {}).items():
        if isinstance(value, list):
            normalized_path = []
            for cell in value:
                if isinstance(cell, (list, tuple)) and len(cell) == 2:
                    y = _as_int(cell[0])
                    x = _as_int(cell[1])
                    if y is not None and x is not None:
                        normalized_path.append([y, x])
            paths[str(key)] = normalized_path
    history = [dict(item) for item in list(raw.get("history") or []) if isinstance(item, dict)]
    return PlaySessionSnapshot(
        saved_at=str(raw.get("saved_at") or "").strip() or None,
        solved=bool(raw.get("solved")),
        level=level_dict,
        selected_pair=str(raw.get("selected_pair") or "").strip() or None,
        paths=paths,
        history=history,
        save_reason=str(raw.get("save_reason") or "").strip() or None,
        saved_path=str(raw.get("saved_path") or "").strip() or None,
        raw=raw,
    )


def serialize_play_session_dict(session: PlaySessionSnapshot) -> dict[str, Any]:
    serialized = dict(session.raw) if session.raw else {}
    serialized["saved_at"] = session.saved_at
    serialized["solved"] = session.solved
    serialized["level"] = _clone_json(session.level)
    serialized["selected_pair"] = session.selected_pair
    serialized["paths"] = _clone_json(session.paths)
    serialized["history"] = _clone_json(session.history)
    if session.save_reason is not None:
        serialized["save_reason"] = session.save_reason
    if session.saved_path is not None:
        serialized["saved_path"] = session.saved_path
    return serialized


def serialize_play_session_json(session: PlaySessionSnapshot) -> str:
    return json.dumps(serialize_play_session_dict(session), indent=2, ensure_ascii=False)


def load_play_session_file(path: Path) -> PlaySessionSnapshot:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(raw, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return parse_play_session_dict(raw)


def build_playtest_dataset_record(
    session: PlaySessionSnapshot,
    origin: str = "editor",
    saved_at: str | None = None,
) -> PlaytestDatasetRecord:
    level = session.level or {}
    board_width = level_width(level)
    board_height = level_height(level)
    pair_count = len(level.get("pairs") or []) if isinstance(level.get("pairs"), list) else 0
    blocker_count = len(level.get("blockers") or []) if isinstance(level.get("blockers"), list) else 0
    has_board_shape = _supported_board_size(board_width, board_height)
    validation_status = "OK" if has_board_shape and dict(level.get("validation") or {}).get("solvable") is not False else "INVALID"
    path_lengths = {
        str(pair.get("id")): len(session.paths.get(str(pair.get("id")), []))
        for pair in (level.get("pairs") or [])
        if isinstance(pair, dict) and pair.get("id") is not None
    }
    return PlaytestDatasetRecord(
        saved_at=saved_at or _timestamp_now(),
        origin=origin,
        save_reason=session.save_reason or "manual",
        saved_path=session.saved_path or "",
        solved=session.solved,
        level_name=_level_label(level),
        level_number=level_tier(level),
        board_width=board_width,
        board_height=board_height,
        board=f"{board_width}x{board_height}" if board_width and board_height else "",
        pairs=pair_count,
        blockers=blocker_count,
        moves=_as_int(level.get("moves")) or 0,
        difficulty=_level_difficulty(level),
        decal=bool(level.get("decal")),
        validation_status=validation_status,
        history_length=len(session.history),
        path_lengths=path_lengths,
        level_file=str(level.get("_filename") or ""),
        level_saved_path=str(level.get("saved_path") or ""),
        session=serialize_play_session_dict(session),
    )


def serialize_playtest_record_dict(record: PlaytestDatasetRecord) -> dict[str, Any]:
    return {
        "saved_at": record.saved_at,
        "origin": record.origin,
        "save_reason": record.save_reason,
        "saved_path": record.saved_path,
        "solved": record.solved,
        "level_name": record.level_name,
        "level_number": record.level_number,
        "board_width": record.board_width,
        "board_height": record.board_height,
        "board": record.board,
        "pairs": record.pairs,
        "blockers": record.blockers,
        "moves": record.moves,
        "difficulty": record.difficulty,
        "decal": record.decal,
        "validation_status": record.validation_status,
        "history_length": record.history_length,
        "path_lengths": record.path_lengths,
        "level_file": record.level_file,
        "level_saved_path": record.level_saved_path,
        "session": record.session,
    }


def parse_session_queue_item(raw: dict[str, Any]) -> SessionQueueItem:
    return SessionQueueItem(
        id=_as_int(raw.get("id")),
        file=str(raw.get("file") or ""),
        source=str(raw.get("source") or ""),
        changed=bool(raw.get("changed")),
        manager_item_id=_as_int(raw.get("managerItemId")),
        saved_path=str(raw.get("savedPath") or ""),
        screenshot_path=str(raw.get("screenshotPath") or ""),
        review_status=str(raw.get("reviewStatus") or "").strip().upper() or None,
        validation_status=str(raw.get("validationStatus") or "").strip() or None,
        feedback_decision=str(raw.get("feedbackDecision") or "").strip().lower(),
        feedback_reason_code=str(raw.get("feedbackReasonCode") or ""),
        feedback_keep_tags=[str(item) for item in list(raw.get("feedbackKeepTags") or [])],
        feedback_pair_ids=[str(item) for item in list(raw.get("feedbackPairIds") or [])],
        feedback_note=str(raw.get("feedbackNote") or ""),
        level=dict(raw.get("level") or {}) if isinstance(raw.get("level"), dict) else None,
        original_level=dict(raw.get("originalLevel") or {}) if isinstance(raw.get("originalLevel"), dict) else None,
        raw=raw,
    )


def serialize_session_queue_item_dict(item: SessionQueueItem) -> dict[str, Any]:
    serialized = dict(item.raw) if item.raw else {}
    serialized["id"] = item.id
    serialized["file"] = item.file
    serialized["source"] = item.source
    serialized["changed"] = item.changed
    serialized["managerItemId"] = item.manager_item_id
    serialized["savedPath"] = item.saved_path
    serialized["screenshotPath"] = item.screenshot_path
    serialized["reviewStatus"] = item.review_status
    serialized["validationStatus"] = item.validation_status
    serialized["feedbackDecision"] = item.feedback_decision
    serialized["feedbackReasonCode"] = item.feedback_reason_code
    serialized["feedbackKeepTags"] = list(item.feedback_keep_tags)
    serialized["feedbackPairIds"] = list(item.feedback_pair_ids)
    serialized["feedbackNote"] = item.feedback_note
    serialized["level"] = _clone_json(item.level) if item.level is not None else None
    serialized["originalLevel"] = _clone_json(item.original_level) if item.original_level is not None else None
    return serialized


def load_play_sessions_state(path: Path) -> PlaySessionsState:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(raw, dict):
        raise ValueError(f"Expected JSON object in {path}")
    queue = [
        parse_session_queue_item(item)
        for item in list(raw.get("queue") or [])
        if isinstance(item, dict)
    ]
    return PlaySessionsState(queue=queue, raw=raw)


def serialize_play_sessions_state_dict(state: PlaySessionsState) -> dict[str, Any]:
    serialized = dict(state.raw) if state.raw else {}
    serialized["queue"] = [serialize_session_queue_item_dict(item) for item in state.queue]
    return serialized


def serialize_play_sessions_state_json(state: PlaySessionsState) -> str:
    return json.dumps(serialize_play_sessions_state_dict(state), indent=2, ensure_ascii=False)


def default_session_paths(root: Path | None = None) -> dict[str, Path]:
    project_root = root.resolve() if root is not None else find_project_root()
    return {
        "latest_playtest": resolve_repo_path(Path("playtest/latest_play_session.json"), project_root),
        "playtest_events": resolve_repo_path(Path("playtest/playtest_events.jsonl"), project_root),
        "sessions_state": resolve_repo_path(Path(".local/toolkit_state/play_sessions_state.json"), project_root),
    }


def save_play_session_snapshot(
    session: PlaySessionSnapshot,
    relative_path: str = "playtest/latest_play_session.json",
    root: Path | None = None,
) -> Path:
    project_root = root.resolve() if root is not None else find_project_root()
    result = save_text_file(relative_path, serialize_play_session_json(session), project_root)
    return result.path


def append_playtest_dataset_record(
    session: PlaySessionSnapshot,
    origin: str = "editor",
    relative_path: str = "playtest/playtest_events.jsonl",
    root: Path | None = None,
) -> Path:
    record = build_playtest_dataset_record(session, origin=origin)
    payload = json.dumps(serialize_playtest_record_dict(record), ensure_ascii=False) + "\n"
    project_root = root.resolve() if root is not None else find_project_root()
    result = append_text_file(relative_path, payload, project_root)
    return result.path


def save_play_sessions_state(
    state: PlaySessionsState,
    relative_path: str = ".local/toolkit_state/play_sessions_state.json",
    root: Path | None = None,
) -> Path:
    project_root = root.resolve() if root is not None else find_project_root()
    result = save_text_file(relative_path, serialize_play_sessions_state_json(state), project_root)
    return result.path


def append_generated_levels_to_sessions_state(
    state: PlaySessionsState,
    entries: Iterable[tuple[str, dict[str, Any]]],
    *,
    source: str = "learned",
) -> list[SessionQueueItem]:
    next_id = _as_int(state.raw.get("nextId")) or max((item.id or 0 for item in state.queue), default=0) + 1
    created: list[SessionQueueItem] = []
    for name, level in entries:
        runtime_level = level_to_session_level_dict(level, name)
        validation = validate_level_structure(parse_level_dict(_clone_json(level)))
        item = SessionQueueItem(
            id=next_id,
            file=Path(name).stem or name,
            source=source,
            changed=False,
            manager_item_id=None,
            saved_path="",
            screenshot_path="",
            review_status="PENDING",
            validation_status="OK" if validation.valid else "INVALID",
            feedback_decision="",
            feedback_reason_code="",
            feedback_keep_tags=[],
            feedback_pair_ids=[],
            feedback_note="",
            level=runtime_level,
            original_level=_clone_json(runtime_level),
            raw={},
        )
        state.queue.append(item)
        created.append(item)
        next_id += 1
    if created and state.raw.get("selectedId") is None:
        select_session_queue_item(state, created[0].id)
    state.raw["nextId"] = next_id
    return created


def append_play_session_to_sessions_state(
    state: PlaySessionsState,
    session: PlaySessionSnapshot,
    *,
    source: str = "play_session",
    name: str = "latest_play_session.json",
    saved_path: str = "playtest/latest_play_session.json",
) -> SessionQueueItem:
    created = append_generated_levels_to_sessions_state(
        state,
        [
            (
                name,
                _clone_json(session.level),
            )
        ],
        source=source,
    )
    item = created[0]
    item.saved_path = saved_path
    item.raw["saved_path"] = saved_path
    if session.saved_at:
        item.raw["session_saved_at"] = session.saved_at
    return item

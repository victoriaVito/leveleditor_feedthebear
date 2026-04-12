from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping

from feed_the_bear_toolkit.domain.levels import (
    load_level_file,
    parse_level_dict,
    serialize_level_to_canonical_dict,
    serialize_level_to_canonical_json,
    summarize_level_pack,
)
from feed_the_bear_toolkit.domain.models import PAIR_IDS, Level
from feed_the_bear_toolkit.domain.procedural import normalize_learning_buckets
from feed_the_bear_toolkit.domain.progressions import (
    ManagerMetadata,
    ProgressionConfig,
    ProgressionSlot,
    load_live_progressions,
    load_manager_metadata,
    load_progression_file,
    save_live_progressions,
    save_manager_metadata,
    save_progression_file,
    validate_progression_levels,
)
from feed_the_bear_toolkit.domain.sessions import (
    PlaySessionsState,
    SessionQueueItem,
    append_generated_levels_to_sessions_state,
    append_play_session_to_sessions_state,
    find_session_queue_item,
    load_play_session_file,
    load_play_sessions_state,
    save_play_sessions_state,
    select_session_queue_item,
    session_queue_item_label,
    summarize_play_sessions_state,
    update_session_queue_item_feedback,
)
from feed_the_bear_toolkit.domain.validation import validate_level_structure
from feed_the_bear_toolkit.services.config import find_project_root, resolve_repo_path
from feed_the_bear_toolkit.services.procedural import (
    generate_learned_session_batch,
    generate_level,
    generate_reference_variants,
    save_learning_record,
)
from feed_the_bear_toolkit.services.repo_io import save_text_file
from feed_the_bear_toolkit.services.spreadsheet import (
    build_spreadsheet_command_specs,
    clear_spreadsheet_ui_cache,
    disconnect_spreadsheet_token,
    format_spreadsheet_rename_plan,
    format_spreadsheet_status,
    inspect_spreadsheet_rename_plan,
    inspect_spreadsheet_status,
    recommend_spreadsheet_action_keys,
    run_spreadsheet_command,
)
from feed_the_bear_toolkit.ui.app import app_status, build_app_snapshot


def ordered_manager_progression_keys(
    live_progressions: Mapping[str, ProgressionConfig],
    metadata: ManagerMetadata | None = None,
) -> list[str]:
    if metadata is None or not metadata.progression_order:
        return sorted(live_progressions)
    ordered = [key for key in metadata.progression_order if key in live_progressions]
    ordered.extend(key for key in sorted(live_progressions) if key not in ordered)
    return ordered


def save_level_to_progression_slot(
    level: Level,
    progression: ProgressionConfig,
    slot_number: int,
    *,
    project_root: Path,
    output_path: str | None = None,
) -> Path:
    target_slot = next((slot for slot in progression.slots if slot.slot == slot_number), None)
    if target_slot is None:
        raise ValueError(f"Progression slot {slot_number} does not exist")
    relative_path = (
        str(target_slot.level_file or "").strip()
        or str(output_path or "").strip()
        or (str(progression.tutorial_level_file).strip() if slot_number == 0 and progression.tutorial_level_file else "")
    )
    if not relative_path:
        relative_path = f"levels/{Path(level.id or 'edited_level').stem}.json"
    saved = save_text_file(
        relative_path,
        serialize_level_to_canonical_json(level, Path(relative_path).name),
        project_root,
    )
    target_status = target_slot.status or ""
    if target_status.strip().lower() in {"", "empty"}:
        target_status = "reserved" if target_slot.is_tutorial else "assigned"
    updated_slot = ProgressionSlot(
        slot=target_slot.slot,
        level_file=relative_path,
        status=target_status,
        label=target_slot.label,
    )
    progression.slots = [updated_slot if slot.slot == slot_number else slot for slot in progression.slots]
    return saved.path


def build_editor_level_state(level: Level) -> dict[str, Any]:
    state = {
        **serialize_level_to_canonical_dict(level, f"{level.id or 'edited_level'}.json"),
    }
    state["pairs"] = [
        {
            "id": pair.id,
            "type": pair.type,
            "start": [pair.start.y, pair.start.x],
            "end": [pair.end.y, pair.end.x],
        }
        for pair in level.pairs
    ]
    state["blockers"] = [[cell.y, cell.x] for cell in level.blockers]
    return state


def editor_level_state_to_level(editor_level: Mapping[str, Any]) -> Level:
    raw = dict(editor_level)
    raw["pairs"] = [
        {
            "id": pair.get("id"),
            "type": pair.get("type"),
            "start": pair.get("start"),
            "end": pair.get("end"),
        }
        for pair in raw.get("pairs", [])
    ]
    return parse_level_dict(raw)


def apply_editor_cell_action(
    editor_level: dict[str, Any],
    *,
    row: int,
    col: int,
    mode: str,
    selected_pair_id: str,
    pair_type: str,
) -> dict[str, Any]:
    blockers = [list(item) for item in editor_level.get("blockers", [])]

    if mode == "blocker":
        if [row, col] not in blockers:
            blockers.append([row, col])
        editor_level["blockers"] = blockers
        return editor_level

    if mode == "erase":
        editor_level["blockers"] = [item for item in blockers if item != [row, col]]
        for pair in editor_level.get("pairs", []):
            if pair.get("start") == [row, col]:
                pair["start"] = [-1, -1]
            if pair.get("end") == [row, col]:
                pair["end"] = [-1, -1]
        return editor_level

    editor_level["blockers"] = [item for item in blockers if item != [row, col]]
    for pair in editor_level.get("pairs", []):
        if pair.get("id") == selected_pair_id:
            pair["type"] = pair_type.strip() or pair.get("type") or "blue"
            pair[mode] = [row, col]
            break
    return editor_level


def editor_source_path_for_session_item(item: SessionQueueItem) -> str:
    return item.saved_path or item.file or f"session_{item.id}.json"


def normalized_editor_source_name(value: str, fallback: str) -> str:
    candidate = str(value or "").strip() or fallback
    return candidate if candidate.lower().endswith(".json") else f"{candidate}.json"


def save_session_review_learning_feedback(
    level: Level,
    *,
    decision: str,
    project_root: Path,
    learning_path: str | Path,
    reason_code: str | None = None,
    keep_tags: Iterable[str] | None = None,
    pair_ids: Iterable[str] | None = None,
    note: str | None = None,
) -> tuple[Path, dict[str, Any], dict[str, Any]]:
    extra = {
        "reason_code": reason_code or "",
        "note_text": note or "",
        "keep_tags": [str(item).strip() for item in list(keep_tags or []) if str(item).strip()],
        "pair_ids": [str(item).strip() for item in list(pair_ids or []) if str(item).strip()],
        "auto_recorded": True,
    }
    return save_learning_record(
        level,
        decision,
        project_root=project_root,
        learning_path=learning_path,
        context="native_desktop_session_review",
        extra=extra,
    )


def create_manager_progression(
    name: str,
    *,
    tutorial_level_file: str = "levels/tutorial_level.json",
) -> ProgressionConfig:
    key = str(name or "").strip()
    if not key:
        raise ValueError("Progression name cannot be empty.")
    return ProgressionConfig(
        name=key,
        locked=False,
        tutorial_level_file=tutorial_level_file.strip() or None,
        slots=[
            ProgressionSlot(slot=0, level_file=tutorial_level_file.strip() or None, status="reserved", label="TUTORIAL"),
            ProgressionSlot(slot=1, level_file=None, status="empty", label=None),
        ],
        raw={},
    )


def add_manager_progression(
    live_progressions: dict[str, ProgressionConfig],
    progression_order: list[str],
    name: str,
    *,
    tutorial_level_file: str = "levels/tutorial_level.json",
) -> str:
    key = str(name or "").strip()
    if not key:
        raise ValueError("Progression name cannot be empty.")
    if key in live_progressions:
        raise ValueError(f"Progression '{key}' already exists.")
    live_progressions[key] = create_manager_progression(key, tutorial_level_file=tutorial_level_file)
    if key not in progression_order:
        progression_order.append(key)
    return key


def rename_manager_progression(
    live_progressions: dict[str, ProgressionConfig],
    progression_order: list[str],
    *,
    current_name: str,
    target_name: str,
) -> str:
    source = str(current_name or "").strip()
    target = str(target_name or "").strip()
    if not source:
        raise ValueError("Current progression name cannot be empty.")
    if not target:
        raise ValueError("Target progression name cannot be empty.")
    if source not in live_progressions:
        raise ValueError(f"Progression '{source}' does not exist.")
    if source == target:
        return source
    if target in live_progressions:
        raise ValueError(f"Progression '{target}' already exists.")
    progression = live_progressions.pop(source)
    progression.name = target
    live_progressions[target] = progression
    for index, key in enumerate(list(progression_order)):
        if key == source:
            progression_order[index] = target
    return target


def remove_manager_progression(
    live_progressions: dict[str, ProgressionConfig],
    progression_order: list[str],
    name: str,
) -> str:
    key = str(name or "").strip()
    if not key:
        raise ValueError("Progression name cannot be empty.")
    if key not in live_progressions:
        raise ValueError(f"Progression '{key}' does not exist.")
    live_progressions.pop(key)
    progression_order[:] = [item for item in progression_order if item != key]
    return key


def batch_review_session_items(
    state: PlaySessionsState,
    *,
    review_status: str,
    feedback_decision: str,
    reason_code: str = "",
    keep_tags: Iterable[str] | None = None,
    pair_ids: Iterable[str] | None = None,
    note: str = "",
    only_pending: bool = True,
) -> dict[str, int]:
    normalized_status = str(review_status or "").strip().upper() or "PENDING"
    normalized_decision = str(feedback_decision or "").strip().lower()
    eligible = []
    for item in state.queue:
        current_status = str(item.review_status or "PENDING").strip().upper()
        if only_pending and current_status != "PENDING":
            continue
        eligible.append(item)
    for item in eligible:
        update_session_queue_item_feedback(
            item,
            review_status=normalized_status,
            feedback_decision=normalized_decision,
            feedback_reason_code=reason_code,
            feedback_keep_tags=keep_tags,
            feedback_pair_ids=pair_ids,
            feedback_note=note,
        )
    if eligible:
        select_session_queue_item(state, eligible[0].id)
    return {
        "updated_count": len(eligible),
        "queue_count": len(state.queue),
        "updated_ids": [int(item.id or 0) for item in eligible if item.id is not None],
    }


def update_batch_review_state(
    states: dict[int, dict[str, str]],
    index: int,
    *,
    status: str,
    saved_path: str = "",
    reason_code: str = "",
    note: str = "",
) -> dict[int, dict[str, str]]:
    normalized_status = str(status or "").strip().lower() or "pending"
    if normalized_status not in {"pending", "kept", "discarded"}:
        normalized_status = "pending"
    next_states = dict(states)
    next_states[int(index)] = {
        "status": normalized_status,
        "saved_path": str(saved_path or "").strip(),
        "reason_code": str(reason_code or "").strip(),
        "note": str(note or "").strip(),
    }
    return next_states


def batch_queueable_indices(level_count: int, states: dict[int, dict[str, str]]) -> list[int]:
    out: list[int] = []
    for index in range(max(0, int(level_count))):
        status = str((states.get(index) or {}).get("status") or "pending").strip().lower()
        if status != "discarded":
            out.append(index)
    return out


class NativeToolkitApp:
    def __init__(
        self,
        project_root: Path | None = None,
        *,
        initial_tab: str = "status",
        level_path: str | None = None,
        progression_path: str | None = None,
        pack_folder: str | None = None,
        play_session_path: str | None = None,
        sessions_state_path: str | None = None,
    ) -> None:
        self.project_root = project_root.resolve() if project_root is not None else find_project_root()

        import tkinter as tk
        from tkinter import filedialog, messagebox, scrolledtext, ttk

        self._tk = tk
        self._ttk = ttk
        self._scrolledtext = scrolledtext
        self._filedialog = filedialog
        self._messagebox = messagebox

        self.root = tk.Tk()
        self.root.title("Feed the Bear Toolkit · Native Python")
        self.root.geometry("1360x920")
        self.root.minsize(1120, 760)

        self.level_path_var = tk.StringVar(value=level_path or "levels/Progression B · Level 2.json")
        self.progression_path_var = tk.StringVar(value=progression_path or "progressions/progression_g.json")
        self.manager_live_path_var = tk.StringVar(value="progressions/manager_progressions_live.json")
        self.manager_metadata_path_var = tk.StringVar(value="progressions/manager_state/level_manager_metadata.json")
        self.pack_folder_var = tk.StringVar(value=pack_folder or "levels/progression_g")
        self.play_session_path_var = tk.StringVar(value=play_session_path or "playtest/latest_play_session.json")
        self.sessions_state_path_var = tk.StringVar(
            value=sessions_state_path or ".local/toolkit_state/play_sessions_state.json"
        )
        self.learning_path_var = tk.StringVar(value=".local/toolkit_state/learning_state.json")
        self.level_number_var = tk.IntVar(value=4)
        self.attempts_var = tk.IntVar(value=12)
        self.credentials_path_var = tk.StringVar(value=".local/google_oauth_client.json")
        self.token_path_var = tk.StringVar(value=".local/google_sheets_token.json")
        self.sheet_command_var = tk.StringVar(value="check_env")
        self.footer_var = tk.StringVar(value="Ready.")
        self.initial_tab = initial_tab

        self.editor_source_path_var = tk.StringVar(value=self.level_path_var.get())
        self.editor_output_path_var = tk.StringVar(value="output/python_toolkit_checks/edited_level.json")
        self.editor_id_var = tk.StringVar(value="")
        self.editor_difficulty_var = tk.IntVar(value=1)
        self.editor_cols_var = tk.IntVar(value=5)
        self.editor_rows_var = tk.IntVar(value=5)
        self.editor_moves_var = tk.IntVar(value=6)
        self.editor_solution_count_var = tk.IntVar(value=1)
        self.editor_target_density_var = tk.StringVar(value="MEDIUM")
        self.editor_mode_var = tk.StringVar(value="start")
        self.editor_pair_var = tk.StringVar(value="A")
        self.editor_pair_type_var = tk.StringVar(value="blue")
        self.editor_progression_key_var = tk.StringVar(value="")
        self.editor_progression_slot_var = tk.IntVar(value=1)

        self.manager_selected_key_var = tk.StringVar(value="")
        self.manager_selected_slot_var = tk.IntVar(value=1)
        self.manager_selected_slot_path_var = tk.StringVar(value="")
        self.manager_selected_slot_label_var = tk.StringVar(value="")
        self.manager_selected_slot_status_var = tk.StringVar(value="")
        self.manager_selected_lock_var = tk.BooleanVar(value=False)
        self.manager_tutorial_path_var = tk.StringVar(value="levels/tutorial_level.json")
        self.manager_rename_key_var = tk.StringVar(value="")
        self.manager_export_path_var = tk.StringVar(value="output/python_toolkit_checks/selected_live_progression.json")
        self.manager_sheet_filter_var = tk.StringVar(value="")
        self.manager_sheet_summary_var = tk.StringVar(value="Spreadsheet workflow: not inspected yet.")

        self.batch_start_var = tk.IntVar(value=3)
        self.batch_end_var = tk.IntVar(value=4)
        self.batch_count_var = tk.IntVar(value=6)
        self.batch_output_path_var = tk.StringVar(value="output/python_toolkit_checks/learned_batch_item.json")
        self.batch_discard_reason_var = tk.StringVar(value="too_easy")
        self.batch_note_var = tk.StringVar(value="")

        self.variant_count_var = tk.IntVar(value=4)
        self.variant_pairs_var = tk.StringVar(value="same")
        self.variant_blockers_var = tk.StringVar(value="same")
        self.variant_board_var = tk.StringVar(value="same")
        self.variant_output_path_var = tk.StringVar(value="output/python_toolkit_checks/variant_keep.json")
        self.variant_discard_reason_var = tk.StringVar(value="too_easy")
        self.variant_note_var = tk.StringVar(value="")
        self.session_review_status_var = tk.StringVar(value="PENDING")
        self.session_feedback_decision_var = tk.StringVar(value="")
        self.session_feedback_reason_var = tk.StringVar(value="")
        self.session_feedback_tags_var = tk.StringVar(value="")
        self.session_feedback_pairs_var = tk.StringVar(value="")
        self.session_feedback_note_var = tk.StringVar(value="")
        self.session_feedback_last_sent_var = tk.StringVar(value="Nothing sent yet.")
        self.session_export_path_var = tk.StringVar(value="output/python_toolkit_checks/session_selected_level.json")
        self.session_auto_feedback_var = tk.BooleanVar(value=True)
        self.spreadsheet_summary_var = tk.StringVar(value="Spreadsheet status not loaded yet.")

        self.editor_level: dict[str, Any] | None = None
        self._current_progression: ProgressionConfig | None = None
        self._live_progressions: dict[str, ProgressionConfig] = {}
        self._manager_metadata: Any | None = None
        self._sessions_state: PlaySessionsState | None = None
        self.editor_cell_size = 56
        self._canvas_cells: dict[tuple[int, int], tuple[int, int]] = {}
        self._progression_entries: list[Any] = []
        self._manager_progression_keys: list[str] = []
        self._manager_slot_entries: list[ProgressionSlot] = []
        self._procedural_variants: list[Any] = []
        self._procedural_batch: list[Any] = []
        self._procedural_batch_review: dict[int, dict[str, str]] = {}
        self._sessions_queue_items: list[SessionQueueItem] = []
        self._sessions_selected_id: int | None = None
        self._spreadsheet_status: Any | None = None
        self._spreadsheet_command_specs: list[Any] = []
        self._spreadsheet_command_labels: list[str] = []
        self._manager_sheet_plan: Any | None = None

        self._build_layout()
        self.refresh_status()
        self._select_initial_tab()

    def _build_layout(self) -> None:
        root = self.root
        ttk = self._ttk
        scrolledtext = self._scrolledtext

        style = ttk.Style()
        if "clam" in style.theme_names():
            style.theme_use("clam")

        root.columnconfigure(0, weight=1)
        root.rowconfigure(1, weight=1)

        header = ttk.Frame(root, padding=14)
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(1, weight=1)

        ttk.Label(header, text="Feed the Bear Toolkit", font=("Helvetica", 20, "bold")).grid(
            row=0, column=0, sticky="w"
        )
        ttk.Label(
            header,
            text="Native Python shell. No localhost server required.",
            font=("Helvetica", 10),
        ).grid(row=1, column=0, sticky="w", pady=(4, 0))

        actions = ttk.Frame(header)
        actions.grid(row=0, column=2, rowspan=2, sticky="e")
        ttk.Button(actions, text="Refresh", command=self.refresh_status).pack(side="left")
        ttk.Button(actions, text="Editor", command=lambda: self._select_tab("editor")).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="Pack QA", command=lambda: self._select_tab("pack")).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="Sessions", command=lambda: self._select_tab("sessions")).pack(side="left", padx=(8, 0))

        self.notebook = ttk.Notebook(root)
        self.notebook.grid(row=1, column=0, sticky="nsew", padx=12, pady=(0, 0))

        self.status_tab = ttk.Frame(self.notebook, padding=12)
        self.editor_tab = ttk.Frame(self.notebook, padding=12)
        self.progression_tab = ttk.Frame(self.notebook, padding=12)
        self.pack_tab = ttk.Frame(self.notebook, padding=12)
        self.sessions_tab = ttk.Frame(self.notebook, padding=12)
        self.procedural_tab = ttk.Frame(self.notebook, padding=12)
        self.spreadsheet_tab = ttk.Frame(self.notebook, padding=12)

        self._tab_order = {
            "status": self.status_tab,
            "editor": self.editor_tab,
            "levels": self.editor_tab,
            "manager": self.progression_tab,
            "progressions": self.progression_tab,
            "pack": self.pack_tab,
            "sessions": self.sessions_tab,
            "procedural": self.procedural_tab,
            "spreadsheet": self.spreadsheet_tab,
        }

        self.notebook.add(self.status_tab, text="Status")
        self.notebook.add(self.editor_tab, text="Editor")
        self.notebook.add(self.progression_tab, text="Manager")
        self.notebook.add(self.pack_tab, text="Pack QA")
        self.notebook.add(self.sessions_tab, text="Sessions")
        self.notebook.add(self.procedural_tab, text="Procedural")
        self.notebook.add(self.spreadsheet_tab, text="Spreadsheet")

        self.status_text = scrolledtext.ScrolledText(self.status_tab, wrap="word", font=("Menlo", 11))
        self.status_text.pack(fill="both", expand=True)

        self._build_editor_tab()
        self._build_progression_tab()
        self._build_pack_tab()
        self._build_sessions_tab()
        self._build_procedural_tab()
        self._build_spreadsheet_tab()

        footer = ttk.Frame(root, padding=(12, 8))
        footer.grid(row=2, column=0, sticky="ew")
        footer.columnconfigure(0, weight=1)
        ttk.Label(footer, textvariable=self.footer_var).grid(row=0, column=0, sticky="w")

    def _build_editor_tab(self) -> None:
        ttk = self._ttk
        scrolledtext = self._scrolledtext

        frame = self.editor_tab
        frame.columnconfigure(0, weight=0)
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(3, weight=1)

        source_row = ttk.Frame(frame)
        source_row.grid(row=0, column=0, columnspan=2, sticky="ew")
        source_row.columnconfigure(1, weight=1)
        ttk.Label(source_row, text="Source level").grid(row=0, column=0, sticky="w")
        ttk.Entry(source_row, textvariable=self.editor_source_path_var).grid(row=0, column=1, sticky="ew", padx=(8, 8))
        ttk.Button(source_row, text="Browse", command=lambda: self._browse_file(self.editor_source_path_var, [("JSON files", "*.json")])).grid(row=0, column=2, sticky="e")
        ttk.Button(source_row, text="Load into editor", command=self.load_editor_level).grid(row=0, column=3, sticky="e", padx=(8, 0))

        toolbar = ttk.LabelFrame(frame, text="Level metadata", padding=10)
        toolbar.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(10, 10))
        for index in range(10):
            toolbar.columnconfigure(index, weight=1 if index in {1, 3, 5, 7, 9} else 0)
        ttk.Label(toolbar, text="Id").grid(row=0, column=0, sticky="w")
        ttk.Entry(toolbar, textvariable=self.editor_id_var, width=18).grid(row=0, column=1, sticky="ew", padx=(6, 12))
        ttk.Label(toolbar, text="Tier").grid(row=0, column=2, sticky="w")
        ttk.Spinbox(toolbar, from_=1, to=10, textvariable=self.editor_difficulty_var, width=6).grid(row=0, column=3, sticky="w", padx=(6, 12))
        ttk.Label(toolbar, text="Board").grid(row=0, column=4, sticky="w")
        board_group = ttk.Frame(toolbar)
        board_group.grid(row=0, column=5, sticky="w")
        ttk.Spinbox(board_group, from_=4, to=7, textvariable=self.editor_cols_var, width=4, command=self._resize_editor_level).pack(side="left")
        ttk.Label(board_group, text="x").pack(side="left", padx=4)
        ttk.Spinbox(board_group, from_=4, to=8, textvariable=self.editor_rows_var, width=4, command=self._resize_editor_level).pack(side="left")
        ttk.Label(toolbar, text="Moves").grid(row=0, column=6, sticky="w")
        ttk.Spinbox(toolbar, from_=0, to=40, textvariable=self.editor_moves_var, width=6).grid(row=0, column=7, sticky="w", padx=(6, 12))
        ttk.Label(toolbar, text="Solutions").grid(row=0, column=8, sticky="w")
        ttk.Spinbox(toolbar, from_=0, to=40, textvariable=self.editor_solution_count_var, width=6).grid(row=0, column=9, sticky="w", padx=(6, 0))

        ttk.Label(toolbar, text="Target density").grid(row=1, column=0, sticky="w", pady=(10, 0))
        ttk.Combobox(
            toolbar,
            textvariable=self.editor_target_density_var,
            values=("LOW", "MEDIUM", "MEDIUM-HIGH", "HIGH"),
            state="readonly",
            width=16,
        ).grid(row=1, column=1, sticky="w", padx=(6, 12), pady=(10, 0))
        ttk.Label(toolbar, text="Selected pair").grid(row=1, column=2, sticky="w", pady=(10, 0))
        self.editor_pair_combo = ttk.Combobox(toolbar, textvariable=self.editor_pair_var, state="readonly", width=8)
        self.editor_pair_combo.grid(row=1, column=3, sticky="w", padx=(6, 12), pady=(10, 0))
        self.editor_pair_combo.bind("<<ComboboxSelected>>", lambda _event: self._refresh_editor_canvas())
        ttk.Label(toolbar, text="Pair type").grid(row=1, column=4, sticky="w", pady=(10, 0))
        ttk.Entry(toolbar, textvariable=self.editor_pair_type_var, width=14).grid(row=1, column=5, sticky="w", padx=(6, 12), pady=(10, 0))
        ttk.Label(toolbar, text="Mode").grid(row=1, column=6, sticky="w", pady=(10, 0))
        ttk.Combobox(
            toolbar,
            textvariable=self.editor_mode_var,
            values=("start", "end", "blocker", "erase"),
            state="readonly",
            width=10,
        ).grid(row=1, column=7, sticky="w", padx=(6, 12), pady=(10, 0))

        button_bar = ttk.Frame(toolbar)
        button_bar.grid(row=1, column=8, columnspan=2, sticky="e", pady=(10, 0))
        ttk.Button(button_bar, text="Add pair", command=self._add_editor_pair).pack(side="left")
        ttk.Button(button_bar, text="Remove pair", command=self._remove_editor_pair).pack(side="left", padx=(8, 0))
        ttk.Button(button_bar, text="Preview", command=self.preview_editor_level).pack(side="left", padx=(8, 0))
        ttk.Button(button_bar, text="Save", command=self.save_editor_level).pack(side="left", padx=(8, 0))

        progression = ttk.LabelFrame(frame, text="Save to progression", padding=10)
        progression.grid(row=2, column=0, columnspan=2, sticky="ew")
        progression.columnconfigure(1, weight=1)
        ttk.Label(progression, text="Progression").grid(row=0, column=0, sticky="w")
        self.editor_progression_combo = ttk.Combobox(progression, textvariable=self.editor_progression_key_var, state="readonly")
        self.editor_progression_combo.grid(row=0, column=1, sticky="ew", padx=(6, 12))
        self.editor_progression_combo.bind("<<ComboboxSelected>>", lambda _event: self._sync_editor_progression_target_from_choice())
        ttk.Label(progression, text="Slot").grid(row=0, column=2, sticky="w")
        ttk.Spinbox(progression, from_=0, to=40, textvariable=self.editor_progression_slot_var, width=8).grid(row=0, column=3, sticky="w", padx=(6, 12))
        ttk.Button(progression, text="Save To This Slot", command=self.save_editor_level_to_progression_slot).grid(row=0, column=4, sticky="e")

        main = ttk.Panedwindow(frame, orient="horizontal")
        main.grid(row=3, column=0, columnspan=2, sticky="nsew")

        left = ttk.Frame(main, padding=(0, 0, 8, 0))
        left.columnconfigure(0, weight=1)
        left.rowconfigure(1, weight=1)
        ttk.Label(left, text="Interactive board").grid(row=0, column=0, sticky="w", pady=(0, 6))
        self.editor_canvas = self._tk.Canvas(left, background="#ffffff", highlightthickness=1, highlightbackground="#c7d9e5")
        self.editor_canvas.grid(row=1, column=0, sticky="nsew")
        self.editor_canvas.bind("<Button-1>", self._handle_editor_canvas_click)
        ttk.Label(left, text="Click cells to place start/end points, blockers, or erase.").grid(row=2, column=0, sticky="w", pady=(8, 0))

        right = ttk.Frame(main)
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=1)
        right.rowconfigure(3, weight=1)
        right.rowconfigure(5, weight=1)
        ttk.Label(right, text="Summary").grid(row=0, column=0, sticky="w", pady=(0, 6))
        self.editor_summary = scrolledtext.ScrolledText(right, wrap="word", font=("Menlo", 10), height=10)
        self.editor_summary.grid(row=1, column=0, sticky="nsew")
        output_row = ttk.Frame(right)
        output_row.grid(row=2, column=0, sticky="ew", pady=(10, 6))
        output_row.columnconfigure(1, weight=1)
        ttk.Label(output_row, text="Save path").grid(row=0, column=0, sticky="w")
        ttk.Entry(output_row, textvariable=self.editor_output_path_var).grid(row=0, column=1, sticky="ew", padx=(8, 0))
        ttk.Label(right, text="Canonical JSON preview").grid(row=3, column=0, sticky="w", pady=(6, 6))
        self.editor_json = scrolledtext.ScrolledText(right, wrap="word", font=("Menlo", 10), height=16)
        self.editor_json.grid(row=4, column=0, sticky="nsew")
        ttk.Label(right, text="Validation / issues").grid(row=5, column=0, sticky="w", pady=(10, 6))
        self.editor_issues = scrolledtext.ScrolledText(right, wrap="word", font=("Menlo", 10), height=10)
        self.editor_issues.grid(row=6, column=0, sticky="nsew")

        main.add(left, weight=3)
        main.add(right, weight=2)

    def _build_progression_tab(self) -> None:
        ttk = self._ttk
        scrolledtext = self._scrolledtext

        frame = self.progression_tab
        frame.columnconfigure(0, weight=0)
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(2, weight=1)
        frame.rowconfigure(3, weight=0)

        header = ttk.Frame(frame)
        header.grid(row=0, column=0, columnspan=2, sticky="ew")
        header.columnconfigure(1, weight=1)
        ttk.Label(header, text="Progression path").grid(row=0, column=0, sticky="w")
        ttk.Entry(header, textvariable=self.progression_path_var).grid(row=0, column=1, sticky="ew", padx=(8, 8))
        buttons = ttk.Frame(header)
        buttons.grid(row=0, column=2, sticky="e")
        ttk.Button(buttons, text="Browse", command=lambda: self._browse_file(self.progression_path_var, [("JSON files", "*.json")])).pack(side="left")
        ttk.Button(buttons, text="Validate", command=self.inspect_progression).pack(side="left", padx=(8, 0))
        ttk.Button(buttons, text="Open slot in editor", command=self.open_selected_progression_slot).pack(side="left", padx=(8, 0))
        ttk.Button(buttons, text="Save file", command=self.save_inspected_progression).pack(side="left", padx=(8, 0))

        manager_header = ttk.LabelFrame(frame, text="Manager snapshot", padding=10)
        manager_header.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(10, 10))
        manager_header.columnconfigure(1, weight=1)
        manager_header.columnconfigure(3, weight=1)
        ttk.Label(manager_header, text="Live path").grid(row=0, column=0, sticky="w")
        ttk.Entry(manager_header, textvariable=self.manager_live_path_var).grid(row=0, column=1, sticky="ew", padx=(6, 12))
        ttk.Label(manager_header, text="Metadata path").grid(row=0, column=2, sticky="w")
        ttk.Entry(manager_header, textvariable=self.manager_metadata_path_var).grid(row=0, column=3, sticky="ew", padx=(6, 12))
        manager_buttons = ttk.Frame(manager_header)
        manager_buttons.grid(row=0, column=4, sticky="e")
        ttk.Button(manager_buttons, text="Load snapshot", command=self.load_manager_snapshot).pack(side="left")
        ttk.Button(manager_buttons, text="Save snapshot", command=self.save_manager_snapshot).pack(side="left", padx=(8, 0))
        ttk.Button(manager_buttons, text="Add progression", command=self.add_new_manager_progression).pack(side="left", padx=(8, 0))
        ttk.Button(manager_buttons, text="Rename selected", command=self.rename_selected_manager_progression).pack(side="left", padx=(8, 0))
        ttk.Button(manager_buttons, text="Remove selected", command=self.remove_selected_manager_progression).pack(side="left", padx=(8, 0))
        ttk.Button(manager_buttons, text="Duplicate selected", command=self.duplicate_selected_manager_progression).pack(side="left", padx=(8, 0))
        ttk.Button(manager_buttons, text="Validate selected", command=self.validate_selected_manager_progression).pack(side="left", padx=(8, 0))

        sheet_workflow = ttk.Frame(manager_header)
        sheet_workflow.grid(row=1, column=0, columnspan=5, sticky="ew", pady=(8, 0))
        sheet_workflow.columnconfigure(1, weight=1)
        ttk.Label(sheet_workflow, text="Sheet filter").grid(row=0, column=0, sticky="w")
        ttk.Entry(sheet_workflow, textvariable=self.manager_sheet_filter_var).grid(row=0, column=1, sticky="ew", padx=(6, 12))
        sheet_actions = ttk.Frame(sheet_workflow)
        sheet_actions.grid(row=0, column=2, sticky="e")
        ttk.Button(sheet_actions, text="Inspect sheet plan", command=self.inspect_manager_spreadsheet_workflow).pack(side="left")
        ttk.Button(sheet_actions, text="Sync local + inspect", command=self.sync_manager_from_sheet_local).pack(side="left", padx=(8, 0))
        ttk.Button(sheet_actions, text="Apply staged renames", command=self.apply_manager_sheet_renames).pack(side="left", padx=(8, 0))
        ttk.Button(sheet_actions, text="Sync+apply+reload", command=self.run_manager_sheet_pipeline).pack(side="left", padx=(8, 0))
        ttk.Label(manager_header, textvariable=self.manager_sheet_summary_var).grid(row=2, column=0, columnspan=5, sticky="w", pady=(6, 0))

        left = ttk.Frame(frame)
        left.grid(row=2, column=0, sticky="nsew", padx=(0, 10))
        left.columnconfigure(0, weight=1)
        left.rowconfigure(1, weight=1)
        ttk.Label(left, text="Progression summary").grid(row=0, column=0, sticky="w", pady=(12, 6))
        self.progression_output = scrolledtext.ScrolledText(left, wrap="word", font=("Menlo", 10))
        self.progression_output.grid(row=1, column=0, sticky="nsew")

        right = ttk.Frame(frame)
        right.grid(row=2, column=1, sticky="nsew")
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=1)
        right.rowconfigure(3, weight=1)

        live_keys = ttk.LabelFrame(right, text="Live progressions", padding=10)
        live_keys.grid(row=0, column=0, sticky="nsew", pady=(12, 8))
        live_keys.columnconfigure(0, weight=1)
        live_keys.rowconfigure(1, weight=1)
        self.manager_progression_keys = self._tk.Listbox(live_keys, exportselection=False)
        self.manager_progression_keys.grid(row=1, column=0, sticky="nsew")
        self.manager_progression_keys.bind("<<ListboxSelect>>", lambda _event: self._select_manager_progression_from_list())

        slots_frame = ttk.LabelFrame(right, text="Selected progression slots", padding=10)
        slots_frame.grid(row=2, column=0, sticky="nsew", pady=(0, 8))
        slots_frame.columnconfigure(0, weight=1)
        slots_frame.rowconfigure(1, weight=1)
        self.manager_slots_listbox = self._tk.Listbox(slots_frame, exportselection=False)
        self.manager_slots_listbox.grid(row=1, column=0, sticky="nsew")
        self.manager_slots_listbox.bind("<<ListboxSelect>>", lambda _event: self._select_manager_slot_from_list())
        self.manager_slots_listbox.bind("<Double-Button-1>", lambda _event: self.open_selected_manager_slot())

        file_slots = ttk.LabelFrame(right, text="Inspected file slots", padding=10)
        file_slots.grid(row=3, column=0, sticky="nsew")
        file_slots.columnconfigure(0, weight=1)
        file_slots.rowconfigure(1, weight=1)
        ttk.Label(file_slots, text="Current progression file slots").grid(row=0, column=0, sticky="w")
        self.progression_slots = self._tk.Listbox(file_slots, exportselection=False)
        self.progression_slots.grid(row=1, column=0, sticky="nsew")
        self.progression_slots.bind("<Double-Button-1>", lambda _event: self.open_selected_progression_slot())

        editor = ttk.LabelFrame(frame, text="Selected progression editor", padding=10)
        editor.grid(row=3, column=0, columnspan=2, sticky="ew")
        for index in range(8):
            editor.columnconfigure(index, weight=1 if index in {1, 3, 5, 7} else 0)
        ttk.Label(editor, text="Selected key").grid(row=0, column=0, sticky="w")
        ttk.Entry(editor, textvariable=self.manager_selected_key_var, width=18).grid(row=0, column=1, sticky="ew", padx=(6, 12))
        ttk.Label(editor, text="Rename to").grid(row=0, column=2, sticky="w")
        ttk.Entry(editor, textvariable=self.manager_rename_key_var, width=18).grid(row=0, column=3, sticky="ew", padx=(6, 12))
        ttk.Label(editor, text="Tutorial").grid(row=0, column=4, sticky="w")
        ttk.Entry(editor, textvariable=self.manager_tutorial_path_var).grid(row=0, column=5, sticky="ew", padx=(6, 12))
        ttk.Checkbutton(editor, text="Locked", variable=self.manager_selected_lock_var).grid(row=0, column=6, sticky="w")
        ttk.Button(editor, text="Apply meta", command=self.apply_selected_manager_progression_meta).grid(row=0, column=7, sticky="e")

        ttk.Label(editor, text="Slot").grid(row=1, column=0, sticky="w", pady=(10, 0))
        ttk.Spinbox(editor, from_=0, to=40, textvariable=self.manager_selected_slot_var, width=8).grid(row=1, column=1, sticky="w", padx=(6, 12), pady=(10, 0))
        ttk.Label(editor, text="Level file").grid(row=1, column=2, sticky="w", pady=(10, 0))
        ttk.Entry(editor, textvariable=self.manager_selected_slot_path_var).grid(row=1, column=3, columnspan=3, sticky="ew", padx=(6, 12), pady=(10, 0))
        ttk.Label(editor, text="Label").grid(row=1, column=6, sticky="w", pady=(10, 0))
        ttk.Entry(editor, textvariable=self.manager_selected_slot_label_var, width=12).grid(row=1, column=7, sticky="ew", padx=(6, 0), pady=(10, 0))

        ttk.Label(editor, text="Status").grid(row=2, column=0, sticky="w", pady=(10, 0))
        ttk.Entry(editor, textvariable=self.manager_selected_slot_status_var, width=16).grid(row=2, column=1, sticky="w", padx=(6, 12), pady=(10, 0))
        ttk.Label(editor, text="Export path").grid(row=2, column=2, sticky="w", pady=(10, 0))
        ttk.Entry(editor, textvariable=self.manager_export_path_var).grid(row=2, column=3, columnspan=3, sticky="ew", padx=(6, 12), pady=(10, 0))
        editor_actions = ttk.Frame(editor)
        editor_actions.grid(row=2, column=6, columnspan=2, sticky="e", pady=(10, 0))
        ttk.Button(editor_actions, text="Load selected slot", command=self.open_selected_manager_slot).pack(side="left")
        ttk.Button(editor_actions, text="Use editor file", command=self.assign_editor_file_to_selected_slot).pack(side="left", padx=(8, 0))
        ttk.Button(editor_actions, text="Clear slot", command=self.clear_selected_manager_slot).pack(side="left", padx=(8, 0))
        ttk.Button(editor_actions, text="Add slot", command=self.add_manager_slot).pack(side="left", padx=(8, 0))
        ttk.Button(editor_actions, text="Remove slot", command=self.remove_selected_manager_slot).pack(side="left", padx=(8, 0))
        ttk.Button(editor_actions, text="Save selected", command=self.save_selected_manager_progression).pack(side="left", padx=(8, 0))
        ttk.Button(editor_actions, text="Export selected", command=self.export_selected_manager_progression).pack(side="left", padx=(8, 0))

    def _build_pack_tab(self) -> None:
        ttk = self._ttk
        scrolledtext = self._scrolledtext

        frame = self.pack_tab
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(2, weight=1)

        ttk.Label(frame, text="Pack folder").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.pack_folder_var).grid(row=0, column=1, sticky="ew", padx=(8, 8))
        actions = ttk.Frame(frame)
        actions.grid(row=0, column=2, sticky="e")
        ttk.Button(actions, text="Browse", command=lambda: self._browse_directory(self.pack_folder_var)).pack(side="left")
        ttk.Button(actions, text="Summarize", command=self.summarize_pack).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="Validate", command=lambda: self.summarize_pack(validate_only=True)).pack(side="left", padx=(8, 0))

        ttk.Label(frame, text="Pack summary and per-file health").grid(row=1, column=0, columnspan=3, sticky="w", pady=(12, 6))
        self.pack_output = scrolledtext.ScrolledText(frame, wrap="word", font=("Menlo", 10))
        self.pack_output.grid(row=2, column=0, columnspan=3, sticky="nsew")

    def _build_sessions_tab(self) -> None:
        ttk = self._ttk
        scrolledtext = self._scrolledtext

        frame = self.sessions_tab
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(3, weight=1)
        frame.rowconfigure(4, weight=1)
        frame.rowconfigure(5, weight=1)

        ttk.Label(frame, text="Play session path").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.play_session_path_var).grid(row=0, column=1, sticky="ew", padx=(8, 8))
        play_actions = ttk.Frame(frame)
        play_actions.grid(row=0, column=2, sticky="e")
        ttk.Button(play_actions, text="Browse", command=lambda: self._browse_file(self.play_session_path_var, [("JSON files", "*.json")])).pack(side="left")
        ttk.Button(play_actions, text="Inspect play session", command=self.inspect_play_session).pack(side="left", padx=(8, 0))
        ttk.Button(play_actions, text="Load session into editor", command=self.open_play_session_in_editor).pack(side="left", padx=(8, 0))

        ttk.Label(frame, text="Sessions state path").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(frame, textvariable=self.sessions_state_path_var).grid(row=1, column=1, sticky="ew", padx=(8, 8), pady=(8, 0))
        state_actions = ttk.Frame(frame)
        state_actions.grid(row=1, column=2, sticky="e", pady=(8, 0))
        ttk.Button(state_actions, text="Browse", command=lambda: self._browse_file(self.sessions_state_path_var, [("JSON files", "*.json")])).pack(side="left")
        ttk.Button(state_actions, text="Load queue", command=self.load_sessions_state).pack(side="left", padx=(8, 0))
        ttk.Button(state_actions, text="Inspect queue state", command=self.inspect_sessions_state).pack(side="left", padx=(8, 0))
        ttk.Button(state_actions, text="Save queue state", command=self.save_sessions_state).pack(side="left", padx=(8, 0))
        ttk.Button(state_actions, text="Queue play session", command=self.queue_play_session_to_sessions).pack(side="left", padx=(8, 0))
        ttk.Button(state_actions, text="Queue editor level", command=self.queue_editor_level_to_sessions).pack(side="left", padx=(8, 0))

        quick_actions = ttk.Frame(frame)
        quick_actions.grid(row=2, column=0, columnspan=3, sticky="w", pady=(12, 0))
        ttk.Button(quick_actions, text="Refresh status", command=self.refresh_status).pack(side="left")
        ttk.Button(quick_actions, text="Jump to Editor", command=lambda: self._select_tab("editor")).pack(side="left", padx=(8, 0))
        ttk.Button(quick_actions, text="Jump to Procedural", command=lambda: self._select_tab("procedural")).pack(side="left", padx=(8, 0))
        ttk.Button(quick_actions, text="Load next pending", command=self.select_next_pending_session).pack(side="left", padx=(8, 0))
        ttk.Button(quick_actions, text="Queue inspected progression", command=self.queue_inspected_progression_to_sessions).pack(side="left", padx=(8, 0))

        self.sessions_summary = ttk.Label(frame, text="No queue loaded yet.")
        self.sessions_summary.grid(row=3, column=0, columnspan=3, sticky="w", pady=(12, 6))

        queue_split = ttk.Panedwindow(frame, orient="horizontal")
        queue_split.grid(row=4, column=0, columnspan=3, sticky="nsew")

        left = ttk.Frame(queue_split, padding=(0, 0, 8, 0))
        left.columnconfigure(0, weight=1)
        left.rowconfigure(1, weight=1)
        ttk.Label(left, text="Review queue").grid(row=0, column=0, sticky="w", pady=(0, 6))
        self.sessions_queue_list = self._tk.Listbox(left, exportselection=False)
        self.sessions_queue_list.grid(row=1, column=0, sticky="nsew")
        self.sessions_queue_list.bind("<<ListboxSelect>>", lambda _event: self._on_sessions_queue_select())
        self.sessions_queue_list.bind("<Double-Button-1>", lambda _event: self.open_selected_session_in_editor())

        right = ttk.Frame(queue_split)
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=1)
        ttk.Label(right, text="Selected item details").grid(row=0, column=0, sticky="w", pady=(0, 6))
        self.sessions_detail = scrolledtext.ScrolledText(right, wrap="word", font=("Menlo", 10), height=12)
        self.sessions_detail.grid(row=1, column=0, sticky="nsew")

        review = ttk.LabelFrame(right, text="Review controls", padding=10)
        review.grid(row=2, column=0, sticky="ew", pady=(10, 0))
        review.columnconfigure(1, weight=1)
        review.columnconfigure(3, weight=1)
        ttk.Label(review, text="Review status").grid(row=0, column=0, sticky="w")
        ttk.Combobox(
            review,
            textvariable=self.session_review_status_var,
            values=("PENDING", "APPROVED", "REJECTED"),
            state="readonly",
            width=14,
        ).grid(row=0, column=1, sticky="ew", padx=(6, 12))
        ttk.Label(review, text="Decision").grid(row=0, column=2, sticky="w")
        ttk.Combobox(
            review,
            textvariable=self.session_feedback_decision_var,
            values=("", "approve", "reject"),
            state="readonly",
            width=14,
        ).grid(row=0, column=3, sticky="ew", padx=(6, 0))

        ttk.Label(review, text="Reason code").grid(row=1, column=0, sticky="w", pady=(10, 0))
        ttk.Entry(review, textvariable=self.session_feedback_reason_var).grid(row=1, column=1, sticky="ew", padx=(6, 12), pady=(10, 0))
        ttk.Label(review, text="Keep tags").grid(row=1, column=2, sticky="w", pady=(10, 0))
        ttk.Entry(review, textvariable=self.session_feedback_tags_var).grid(row=1, column=3, sticky="ew", padx=(6, 0), pady=(10, 0))

        ttk.Label(review, text="Pair ids").grid(row=2, column=0, sticky="w", pady=(10, 0))
        ttk.Entry(review, textvariable=self.session_feedback_pairs_var).grid(row=2, column=1, sticky="ew", padx=(6, 12), pady=(10, 0))
        ttk.Label(review, text="Note").grid(row=2, column=2, sticky="w", pady=(10, 0))
        ttk.Entry(review, textvariable=self.session_feedback_note_var).grid(row=2, column=3, sticky="ew", padx=(6, 0), pady=(10, 0))
        ttk.Label(review, text="Export path").grid(row=3, column=0, sticky="w", pady=(10, 0))
        ttk.Entry(review, textvariable=self.session_export_path_var).grid(row=3, column=1, sticky="ew", padx=(6, 12), pady=(10, 0))
        ttk.Checkbutton(review, text="Auto-send feedback on approve/reject", variable=self.session_auto_feedback_var).grid(row=3, column=2, columnspan=2, sticky="w", pady=(10, 0))

        review_actions = ttk.Frame(review)
        review_actions.grid(row=4, column=0, columnspan=4, sticky="ew", pady=(10, 0))
        ttk.Button(review_actions, text="Open in editor", command=self.open_selected_session_in_editor).pack(side="left")
        ttk.Button(review_actions, text="Validate selected", command=self.validate_selected_session_item).pack(side="left", padx=(8, 0))
        ttk.Button(review_actions, text="Export selected", command=self.export_selected_session_item).pack(side="left", padx=(8, 0))
        ttk.Button(review_actions, text="Apply review", command=self.apply_selected_session_review).pack(side="left", padx=(8, 0))
        ttk.Button(review_actions, text="Approve", command=self.approve_selected_session).pack(side="left", padx=(8, 0))
        ttk.Button(review_actions, text="Reject", command=self.reject_selected_session).pack(side="left", padx=(8, 0))
        ttk.Button(review_actions, text="Approve pending all", command=self.approve_all_pending_sessions).pack(side="left", padx=(8, 0))
        ttk.Button(review_actions, text="Reject pending all", command=self.reject_all_pending_sessions).pack(side="left", padx=(8, 0))
        ttk.Button(review_actions, text="Send feedback", command=self.send_selected_session_feedback).pack(side="left", padx=(8, 0))
        ttk.Button(review_actions, text="Send reviewed feedback", command=self.send_reviewed_sessions_feedback).pack(side="left", padx=(8, 0))
        ttk.Button(review_actions, text="Save queue", command=self.save_sessions_state).pack(side="left", padx=(8, 0))
        ttk.Label(review, textvariable=self.session_feedback_last_sent_var).grid(row=5, column=0, columnspan=4, sticky="w", pady=(10, 0))

        queue_split.add(left, weight=3)
        queue_split.add(right, weight=4)

        ttk.Label(frame, text="Session and queue inspection").grid(row=3, column=0, columnspan=3, sticky="w", pady=(12, 6))
        self.sessions_output = scrolledtext.ScrolledText(frame, wrap="word", font=("Menlo", 10))
        self.sessions_output.grid(row=5, column=0, columnspan=3, sticky="nsew")

    def _build_procedural_tab(self) -> None:
        ttk = self._ttk
        scrolledtext = self._scrolledtext

        frame = self.procedural_tab
        frame.columnconfigure(0, weight=0)
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(3, weight=1)
        frame.rowconfigure(4, weight=1)
        frame.rowconfigure(5, weight=1)

        top = ttk.LabelFrame(frame, text="Generate level", padding=10)
        top.grid(row=0, column=0, columnspan=2, sticky="ew")
        for index in range(8):
            top.columnconfigure(index, weight=1 if index in {1, 3, 5} else 0)
        ttk.Label(top, text="Level").grid(row=0, column=0, sticky="w")
        ttk.Spinbox(top, from_=1, to=10, textvariable=self.level_number_var, width=8).grid(row=0, column=1, sticky="w", padx=(6, 12))
        ttk.Label(top, text="Attempts").grid(row=0, column=2, sticky="w")
        ttk.Spinbox(top, from_=1, to=50, textvariable=self.attempts_var, width=8).grid(row=0, column=3, sticky="w", padx=(6, 12))
        ttk.Label(top, text="Learning").grid(row=0, column=4, sticky="w")
        ttk.Entry(top, textvariable=self.learning_path_var).grid(row=0, column=5, sticky="ew", padx=(6, 12))
        ttk.Button(top, text="Browse", command=lambda: self._browse_file(self.learning_path_var, [("JSON files", "*.json")])).grid(row=0, column=6, sticky="e")
        ttk.Button(top, text="Generate", command=self.generate_procedural_level).grid(row=0, column=7, sticky="e", padx=(8, 0))

        ttk.Label(frame, text="Generated canonical level").grid(row=1, column=0, columnspan=2, sticky="w", pady=(12, 6))
        self.procedural_output = scrolledtext.ScrolledText(frame, wrap="word", font=("Menlo", 10), height=14)
        self.procedural_output.grid(row=2, column=0, columnspan=2, sticky="nsew")

        variants = ttk.LabelFrame(frame, text="Reference variants", padding=10)
        variants.grid(row=3, column=0, columnspan=2, sticky="nsew", pady=(12, 0))
        variants.columnconfigure(1, weight=1)
        variants.rowconfigure(2, weight=1)
        ttk.Label(variants, text="Pairs").grid(row=0, column=0, sticky="w")
        ttk.Combobox(variants, textvariable=self.variant_pairs_var, values=("same", "less", "more"), state="readonly", width=10).grid(row=0, column=1, sticky="w", padx=(6, 12))
        ttk.Label(variants, text="Blockers").grid(row=0, column=2, sticky="w")
        ttk.Combobox(variants, textvariable=self.variant_blockers_var, values=("same", "less", "more"), state="readonly", width=10).grid(row=0, column=3, sticky="w", padx=(6, 12))
        ttk.Label(variants, text="Board").grid(row=0, column=4, sticky="w")
        ttk.Combobox(variants, textvariable=self.variant_board_var, values=("same", "smaller", "bigger"), state="readonly", width=10).grid(row=0, column=5, sticky="w", padx=(6, 12))
        ttk.Label(variants, text="Count").grid(row=0, column=6, sticky="w")
        ttk.Spinbox(variants, from_=1, to=12, textvariable=self.variant_count_var, width=6).grid(row=0, column=7, sticky="w", padx=(6, 12))
        ttk.Button(variants, text="Generate variants", command=self.generate_procedural_variants).grid(row=0, column=8, sticky="e")

        ttk.Label(variants, text="Keep/save path").grid(row=1, column=0, sticky="w", pady=(10, 0))
        ttk.Entry(variants, textvariable=self.variant_output_path_var).grid(row=1, column=1, columnspan=3, sticky="ew", padx=(6, 12), pady=(10, 0))
        ttk.Label(variants, text="Discard reason").grid(row=1, column=4, sticky="w", pady=(10, 0))
        ttk.Entry(variants, textvariable=self.variant_discard_reason_var, width=16).grid(row=1, column=5, sticky="w", padx=(6, 12), pady=(10, 0))
        ttk.Label(variants, text="Note").grid(row=1, column=6, sticky="w", pady=(10, 0))
        ttk.Entry(variants, textvariable=self.variant_note_var).grid(row=1, column=7, columnspan=2, sticky="ew", pady=(10, 0))

        self.variants_list = self._tk.Listbox(variants, exportselection=False)
        self.variants_list.grid(row=2, column=0, columnspan=7, sticky="nsew", pady=(12, 0))
        self.variants_list.bind("<Double-Button-1>", lambda _event: self.open_selected_variant())
        variant_actions = ttk.Frame(variants)
        variant_actions.grid(row=2, column=7, columnspan=2, sticky="ne", pady=(12, 0))
        ttk.Button(variant_actions, text="Open in editor", command=self.open_selected_variant).pack(fill="x")
        ttk.Button(variant_actions, text="Keep + save", command=self.keep_selected_variant).pack(fill="x", pady=(8, 0))
        ttk.Button(variant_actions, text="Discard + learn", command=self.discard_selected_variant).pack(fill="x", pady=(8, 0))

        batch = ttk.LabelFrame(frame, text="Learned batch", padding=10)
        batch.grid(row=4, column=0, columnspan=2, sticky="nsew", pady=(12, 0))
        batch.columnconfigure(1, weight=1)
        batch.rowconfigure(2, weight=1)
        ttk.Label(batch, text="Start").grid(row=0, column=0, sticky="w")
        ttk.Spinbox(batch, from_=1, to=10, textvariable=self.batch_start_var, width=6).grid(row=0, column=1, sticky="w", padx=(6, 12))
        ttk.Label(batch, text="End").grid(row=0, column=2, sticky="w")
        ttk.Spinbox(batch, from_=1, to=10, textvariable=self.batch_end_var, width=6).grid(row=0, column=3, sticky="w", padx=(6, 12))
        ttk.Label(batch, text="Count").grid(row=0, column=4, sticky="w")
        ttk.Spinbox(batch, from_=1, to=24, textvariable=self.batch_count_var, width=6).grid(row=0, column=5, sticky="w", padx=(6, 12))
        batch_actions = ttk.Frame(batch)
        batch_actions.grid(row=0, column=6, sticky="e")
        ttk.Button(batch_actions, text="Generate batch", command=self.generate_procedural_batch).pack(side="left")
        ttk.Button(batch_actions, text="Queue batch", command=self.queue_procedural_batch_to_sessions).pack(side="left", padx=(8, 0))
        ttk.Button(batch_actions, text="Queue kept only", command=lambda: self.queue_procedural_batch_to_sessions(kept_only=True)).pack(side="left", padx=(8, 0))
        ttk.Button(batch_actions, text="Open item", command=self.open_selected_batch_item).pack(side="left", padx=(8, 0))

        ttk.Label(batch, text="Keep/save path").grid(row=1, column=0, sticky="w", pady=(10, 0))
        ttk.Entry(batch, textvariable=self.batch_output_path_var).grid(row=1, column=1, columnspan=2, sticky="ew", padx=(6, 12), pady=(10, 0))
        ttk.Label(batch, text="Discard reason").grid(row=1, column=3, sticky="w", pady=(10, 0))
        ttk.Entry(batch, textvariable=self.batch_discard_reason_var, width=16).grid(row=1, column=4, sticky="w", padx=(6, 12), pady=(10, 0))
        ttk.Label(batch, text="Note").grid(row=1, column=5, sticky="w", pady=(10, 0))
        ttk.Entry(batch, textvariable=self.batch_note_var).grid(row=1, column=6, sticky="ew", padx=(6, 0), pady=(10, 0))

        self.procedural_batch_list = self._tk.Listbox(batch, exportselection=False)
        self.procedural_batch_list.grid(row=2, column=0, columnspan=6, sticky="nsew", pady=(12, 0))
        self.procedural_batch_list.bind("<<ListboxSelect>>", lambda _event: self._on_batch_item_select())
        self.procedural_batch_list.bind("<Double-Button-1>", lambda _event: self.open_selected_batch_item())
        batch_item_actions = ttk.Frame(batch)
        batch_item_actions.grid(row=2, column=6, sticky="ne", pady=(12, 0))
        ttk.Button(batch_item_actions, text="Keep + save", command=self.keep_selected_batch_item).pack(fill="x")
        ttk.Button(batch_item_actions, text="Discard + learn", command=self.discard_selected_batch_item).pack(fill="x", pady=(8, 0))
        ttk.Button(batch_item_actions, text="Reset review", command=self.reset_selected_batch_item_review).pack(fill="x", pady=(8, 0))

    def _build_spreadsheet_tab(self) -> None:
        ttk = self._ttk
        scrolledtext = self._scrolledtext

        frame = self.spreadsheet_tab
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(5, weight=1)
        frame.rowconfigure(6, weight=1)
        frame.rowconfigure(8, weight=1)

        ttk.Label(frame, text="Credentials path").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.credentials_path_var).grid(row=0, column=1, sticky="ew", padx=(8, 8))
        ttk.Label(frame, text="Token path").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(frame, textvariable=self.token_path_var).grid(row=1, column=1, sticky="ew", padx=(8, 8), pady=(8, 0))
        ttk.Label(frame, text="Command").grid(row=2, column=0, sticky="w", pady=(8, 0))
        self.spreadsheet_command_combo = ttk.Combobox(frame, textvariable=self.sheet_command_var, state="readonly")
        self.spreadsheet_command_combo.grid(row=2, column=1, sticky="ew", padx=(8, 8), pady=(8, 0))
        self.spreadsheet_command_combo.bind("<<ComboboxSelected>>", lambda _event: self._sync_spreadsheet_command_selection())

        button_row = ttk.Frame(frame)
        button_row.grid(row=3, column=0, columnspan=2, sticky="ew", pady=(10, 0))
        ttk.Button(button_row, text="Inspect status", command=self.inspect_spreadsheet).pack(side="left")
        ttk.Button(button_row, text="Run selected", command=self.run_spreadsheet).pack(side="left", padx=(8, 0))
        ttk.Button(button_row, text="Sync local", command=lambda: self.run_spreadsheet_command_key("sync_local")).pack(side="left", padx=(8, 0))
        ttk.Button(button_row, text="Sync push", command=lambda: self.run_spreadsheet_command_key("sync_push")).pack(side="left", padx=(8, 0))
        ttk.Button(button_row, text="Sync all", command=lambda: self.run_spreadsheet_command_key("sync_all")).pack(side="left", padx=(8, 0))
        ttk.Button(button_row, text="Apply renames", command=lambda: self.run_spreadsheet_command_key("apply_sheet_renames")).pack(side="left", padx=(8, 0))

        utility_row = ttk.Frame(frame)
        utility_row.grid(row=4, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        ttk.Button(utility_row, text="OAuth setup", command=lambda: self.run_spreadsheet_command_key("oauth_setup")).pack(side="left")
        ttk.Button(utility_row, text="Validate env", command=lambda: self.run_spreadsheet_command_key("validate_env_local")).pack(side="left", padx=(8, 0))
        ttk.Button(utility_row, text="Disconnect token", command=self.disconnect_spreadsheet_token_action).pack(side="left", padx=(8, 0))
        ttk.Button(utility_row, text="Clear cache", command=self.clear_spreadsheet_cache_action).pack(side="left", padx=(8, 0))

        ttk.Label(frame, textvariable=self.spreadsheet_summary_var).grid(row=5, column=0, columnspan=2, sticky="w", pady=(12, 6))
        self.spreadsheet_command_list = self._tk.Listbox(frame, exportselection=False, height=8)
        self.spreadsheet_command_list.grid(row=6, column=0, columnspan=2, sticky="ew")
        self.spreadsheet_command_list.bind("<<ListboxSelect>>", lambda _event: self._on_spreadsheet_command_select())
        self.spreadsheet_command_list.bind("<Double-Button-1>", lambda _event: self.run_spreadsheet())

        ttk.Label(frame, text="Spreadsheet output").grid(row=7, column=0, columnspan=2, sticky="w", pady=(12, 6))
        self.spreadsheet_output = scrolledtext.ScrolledText(frame, wrap="word", font=("Menlo", 10))
        self.spreadsheet_output.grid(row=8, column=0, columnspan=2, sticky="nsew")

    def _browse_file(self, variable: Any, filetypes: list[tuple[str, str]] | None = None) -> None:
        selected = self._filedialog.askopenfilename(initialdir=str(self.project_root), filetypes=filetypes or [])
        if selected:
            variable.set(self._display_path(Path(selected)))
            self.footer_var.set(f"Selected {self._display_path(Path(selected))}.")

    def _browse_directory(self, variable: Any) -> None:
        selected = self._filedialog.askdirectory(initialdir=str(self.project_root))
        if selected:
            variable.set(self._display_path(Path(selected)))
            self.footer_var.set(f"Selected {self._display_path(Path(selected))}.")

    def _display_path(self, path: Path) -> str:
        resolved = path.resolve()
        try:
            return str(resolved.relative_to(self.project_root))
        except ValueError:
            return str(resolved)

    def _select_tab(self, key: str) -> None:
        tab = self._tab_order.get(key)
        if tab is not None:
            self.notebook.select(tab)
            if key == "sessions":
                if self._sessions_state is None:
                    self.inspect_sessions_state()
                else:
                    self._refresh_sessions_queue_view()
            elif key == "spreadsheet":
                self.inspect_spreadsheet()

    def _select_initial_tab(self) -> None:
        self._select_tab(str(self.initial_tab or "status").strip().lower())

    def _resolve_repo_path(self, path_text: str) -> Path:
        return resolve_repo_path(Path(path_text), self.project_root)

    def _set_output(self, widget: Any, text: str) -> None:
        widget.delete("1.0", self._tk.END)
        widget.insert("1.0", text)

    def _load_learning(self) -> dict[str, Any]:
        path = self._resolve_repo_path(self.learning_path_var.get())
        if not path.exists():
            return {}
        try:
            payload = json.loads(path.read_text(encoding="utf-8-sig"))
        except (json.JSONDecodeError, OSError):
            return {}
        return normalize_learning_buckets(payload if isinstance(payload, dict) else {})

    def refresh_status(self) -> None:
        snapshot = build_app_snapshot(self.project_root)
        lines = [app_status(), "", f"root={snapshot['root']}"]
        lines.append("")
        lines.append("Live progressions: " + ", ".join(snapshot["live_progressions"]["keys"]))
        lines.append(
            "Sessions queue: "
            f"{snapshot['sessions_state']['queue_count']} "
            f"(pending={snapshot['sessions_state']['pending_count']}, changed={snapshot['sessions_state']['changed_count']})"
        )
        lines.append(
            "Procedural learning: "
            f"approved={snapshot['procedural']['approved_count']} "
            f"rejected={snapshot['procedural']['rejected_count']} "
            f"corrections={snapshot['procedural']['corrections_count']}"
        )
        lines.append(
            "Spreadsheet: "
            f"{snapshot['spreadsheet']['health']} "
            f"(ready={snapshot['spreadsheet']['ready']}, auth={snapshot['spreadsheet']['auth_mode']})"
        )
        self._set_output(self.status_text, "\n".join(lines))
        self.footer_var.set("Status refreshed.")

    def _editor_model(self) -> dict[str, Any]:
        if self.editor_level is None:
            self.editor_level = {
                "id": self.editor_id_var.get() or "edited_level",
                "difficultyTier": self.editor_difficulty_var.get(),
                "gridSize": {"cols": self.editor_cols_var.get(), "rows": self.editor_rows_var.get()},
                "moves": self.editor_moves_var.get(),
                "pairs": [],
                "blockers": [],
                "solutionCount": self.editor_solution_count_var.get(),
                "targetDensity": self.editor_target_density_var.get(),
            }
        self.editor_level["id"] = self.editor_id_var.get().strip() or "edited_level"
        self.editor_level["difficultyTier"] = int(self.editor_difficulty_var.get())
        self.editor_level["gridSize"] = {"cols": int(self.editor_cols_var.get()), "rows": int(self.editor_rows_var.get())}
        self.editor_level["moves"] = int(self.editor_moves_var.get())
        self.editor_level["solutionCount"] = int(self.editor_solution_count_var.get())
        self.editor_level["targetDensity"] = self.editor_target_density_var.get().strip() or None
        self.editor_level.setdefault("pairs", [])
        self.editor_level.setdefault("blockers", [])
        return self.editor_level

    def _pair_ids(self) -> list[str]:
        level = self._editor_model()
        ids = [str(pair.get("id") or "") for pair in level.get("pairs", []) if str(pair.get("id") or "")]
        return ids or ["A"]

    def _sync_pair_controls(self) -> None:
        ids = self._pair_ids()
        self.editor_pair_combo["values"] = ids
        if self.editor_pair_var.get() not in ids:
            self.editor_pair_var.set(ids[0])
        selected = next((pair for pair in self._editor_model().get("pairs", []) if pair.get("id") == self.editor_pair_var.get()), None)
        if selected:
            self.editor_pair_type_var.set(str(selected.get("type") or "blue"))

    def _render_editor_canvas(self) -> None:
        level = self._editor_model()
        cols = max(1, int(level["gridSize"]["cols"]))
        rows = max(1, int(level["gridSize"]["rows"]))
        size = self.editor_cell_size
        canvas = self.editor_canvas
        canvas.delete("all")
        canvas.config(width=cols * size + 2, height=rows * size + 2)
        self._canvas_cells.clear()

        pair_lookup: dict[tuple[int, int], str] = {}
        pair_fill: dict[tuple[int, int], str] = {}
        selected_id = self.editor_pair_var.get()
        for pair in level.get("pairs", []):
            for key_name, suffix in (("start", "1"), ("end", "2")):
                point = pair.get(key_name) or [-1, -1]
                if isinstance(point, (list, tuple)) and len(point) == 2 and point[0] >= 0 and point[1] >= 0:
                    cell = (int(point[0]), int(point[1]))
                    pair_lookup[cell] = f"{pair.get('id', '?')}{suffix}"
                    pair_fill[cell] = "#d7ecf7" if pair.get("id") != selected_id else "#b9e1f2"

        blocker_lookup = {
            (int(item[0]), int(item[1]))
            for item in level.get("blockers", [])
            if isinstance(item, (list, tuple)) and len(item) == 2
        }
        for row in range(rows):
            for col in range(cols):
                x1 = col * size + 1
                y1 = row * size + 1
                x2 = x1 + size
                y2 = y1 + size
                fill = "#ffffff"
                text = ""
                if (row, col) in blocker_lookup:
                    fill = "#f7d9d4"
                    text = "X"
                elif (row, col) in pair_lookup:
                    fill = pair_fill[(row, col)]
                    text = pair_lookup[(row, col)]
                rect = canvas.create_rectangle(x1, y1, x2, y2, fill=fill, outline="#b6cad6", width=1)
                text_id = canvas.create_text((x1 + x2) / 2, (y1 + y2) / 2, text=text, font=("Helvetica", 12, "bold"))
                self._canvas_cells[(row, col)] = (rect, text_id)

    def _editor_level_to_level(self) -> Level:
        return editor_level_state_to_level(self._editor_model())

    def _refresh_editor_summary(self, *, canonical_json: str | None = None, issues_text: str | None = None) -> None:
        level = self._editor_level_to_level()
        validation = validate_level_structure(level)
        summary = [
            f"id={level.id}",
            f"board={level.cols}x{level.rows}",
            f"pairs={len(level.pairs)}",
            f"blockers={len(level.blockers)}",
            f"moves={level.moves}",
            f"solutionCount={level.solution_count}",
            f"targetDensity={level.target_density}",
            f"valid={validation.valid}",
        ]
        self._set_output(self.editor_summary, "\n".join(summary))
        if canonical_json is None:
            canonical_json = serialize_level_to_canonical_json(level, f"{level.id or 'edited_level'}.json")
        self._set_output(self.editor_json, canonical_json)
        if issues_text is None:
            lines = []
            if validation.errors:
                lines.append("errors:")
                lines.extend(f"- {item}" for item in validation.errors)
            if validation.warnings:
                if lines:
                    lines.append("")
                lines.append("warnings:")
                lines.extend(f"- {item}" for item in validation.warnings)
            issues_text = "\n".join(lines) if lines else "No validation issues."
        self._set_output(self.editor_issues, issues_text)
        self._sync_pair_controls()
        self._render_editor_canvas()

    def _load_level_into_editor(self, level: Level, source_path: str | None = None) -> None:
        self.editor_level = build_editor_level_state(level)
        self.editor_id_var.set(level.id or "edited_level")
        self.editor_difficulty_var.set(int(level.difficulty_tier or 1))
        self.editor_cols_var.set(int(level.cols or 5))
        self.editor_rows_var.set(int(level.rows or 5))
        self.editor_moves_var.set(int(level.moves or 0))
        self.editor_solution_count_var.set(int(level.solution_count or 0))
        self.editor_target_density_var.set(level.target_density or "MEDIUM")
        if source_path:
            self.editor_source_path_var.set(source_path)
            self.level_path_var.set(source_path)
        self.editor_pair_var.set(self._pair_ids()[0])
        self._refresh_editor_summary()
        self._select_tab("editor")

    def load_editor_level(self) -> None:
        path = self._resolve_repo_path(self.editor_source_path_var.get())
        try:
            level = load_level_file(path)
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            self.footer_var.set(f"Failed to load editor source: {exc}")
            return
        self._load_level_into_editor(level, self._display_path(path))
        self.footer_var.set(f"Loaded {self._display_path(path)} into the editor.")

    def _resize_editor_level(self) -> None:
        level = self._editor_model()
        cols = int(self.editor_cols_var.get())
        rows = int(self.editor_rows_var.get())
        level["gridSize"] = {"cols": cols, "rows": rows}
        valid_cells = {(row, col) for row in range(rows) for col in range(cols)}
        level["blockers"] = [item for item in level.get("blockers", []) if tuple(item) in valid_cells]
        for pair in level.get("pairs", []):
            for key in ("start", "end"):
                point = pair.get(key) or [-1, -1]
                if tuple(point) not in valid_cells:
                    pair[key] = [-1, -1]
        self._refresh_editor_summary()

    def _next_pair_id(self) -> str:
        existing = set(self._pair_ids())
        for value in PAIR_IDS:
            if value not in existing:
                return value
        return f"P{len(existing) + 1}"

    def _add_editor_pair(self) -> None:
        level = self._editor_model()
        pair_id = self._next_pair_id()
        level["pairs"].append({"id": pair_id, "type": "blue", "start": [-1, -1], "end": [-1, -1]})
        self.editor_pair_var.set(pair_id)
        self.editor_pair_type_var.set("blue")
        self._refresh_editor_summary()
        self.footer_var.set(f"Added pair {pair_id}.")

    def _remove_editor_pair(self) -> None:
        level = self._editor_model()
        selected = self.editor_pair_var.get()
        level["pairs"] = [pair for pair in level.get("pairs", []) if pair.get("id") != selected]
        next_ids = self._pair_ids()
        self.editor_pair_var.set(next_ids[0])
        self._refresh_editor_summary()
        self.footer_var.set(f"Removed pair {selected}.")

    def _handle_editor_canvas_click(self, event: Any) -> None:
        level = self._editor_model()
        cols = int(level["gridSize"]["cols"])
        rows = int(level["gridSize"]["rows"])
        size = self.editor_cell_size
        col = max(0, min(cols - 1, int(event.x // size)))
        row = max(0, min(rows - 1, int(event.y // size)))
        apply_editor_cell_action(
            level,
            row=row,
            col=col,
            mode=self.editor_mode_var.get(),
            selected_pair_id=self.editor_pair_var.get(),
            pair_type=self.editor_pair_type_var.get(),
        )
        self._refresh_editor_summary()

    def preview_editor_level(self) -> None:
        try:
            level = self._editor_level_to_level()
            canonical_json = serialize_level_to_canonical_json(level, f"{level.id or 'edited_level'}.json")
        except ValueError as exc:
            self.footer_var.set(f"Preview failed: {exc}")
            return
        self._refresh_editor_summary(canonical_json=canonical_json)
        self.footer_var.set("Editor preview refreshed.")

    def save_editor_level(self) -> None:
        try:
            level = self._editor_level_to_level()
            relative_path = self.editor_output_path_var.get().strip() or "output/python_toolkit_checks/edited_level.json"
            payload = serialize_level_to_canonical_json(level, Path(relative_path).name)
            result = save_text_file(relative_path, payload, self.project_root)
        except (OSError, ValueError) as exc:
            self.footer_var.set(f"Save failed: {exc}")
            return
        self._refresh_editor_summary(canonical_json=payload)
        self.footer_var.set(f"Saved editor level to {self._display_path(result.path)}.")

    def inspect_progression(self) -> None:
        path = self._resolve_repo_path(self.progression_path_var.get())
        progression = load_progression_file(path)
        self._current_progression = progression
        summary = validate_progression_levels(progression, self.project_root)
        self._progression_entries = list(summary.entries)
        self.progression_slots.delete(0, self._tk.END)
        for entry in summary.entries:
            state = "valid" if entry.valid else ("missing" if not entry.exists else "invalid")
            self.progression_slots.insert(self._tk.END, f"slot {entry.slot}: {state} · {entry.level_file}")

        lines = [
            f"path={path}",
            f"name={summary.name}",
            f"total_slots={summary.total_slots}",
            f"assigned_slots={summary.assigned_slots}",
            f"checked_levels={summary.checked_levels}",
            f"valid_levels={summary.valid_levels}",
            f"invalid_levels={summary.invalid_levels}",
            f"missing_levels={summary.missing_levels}",
            "",
        ]
        for entry in summary.entries:
            state = "valid" if entry.valid else ("missing" if not entry.exists else "invalid")
            lines.append(
                f"slot={entry.slot} state={state} file={entry.level_file} "
                f"errors={entry.error_count} warnings={entry.warning_count}"
            )
        self._set_output(self.progression_output, "\n".join(lines))
        self.footer_var.set(f"Validated {self._display_path(path)}.")

    def open_selected_progression_slot(self) -> None:
        if not self._progression_entries:
            self.inspect_progression()
        selection = self.progression_slots.curselection()
        if not selection:
            self.footer_var.set("No progression slot selected.")
            return
        entry = self._progression_entries[selection[0]]
        if not entry.exists:
            self.footer_var.set(f"Selected slot {entry.slot} is missing.")
            return
        path = self._resolve_repo_path(str(entry.level_file))
        level = load_level_file(path)
        self._load_level_into_editor(level, str(entry.level_file))
        self.footer_var.set(f"Opened slot {entry.slot} in the editor.")

    def _selected_manager_key(self) -> str | None:
        if not hasattr(self, "manager_progression_keys"):
            return None
        selection = self.manager_progression_keys.curselection()
        if not selection:
            return None
        index = selection[0]
        if index < 0 or index >= len(self._manager_progression_keys):
            return None
        return self._manager_progression_keys[index]

    def _selected_manager_progression(self) -> ProgressionConfig | None:
        key = self._selected_manager_key() or self.manager_selected_key_var.get().strip()
        if not key:
            return None
        return self._live_progressions.get(key)

    def _selected_manager_slot(self) -> ProgressionSlot | None:
        progression = self._selected_manager_progression()
        if progression is None:
            return None
        selection = self.manager_slots_listbox.curselection()
        if not selection:
            slot_number = int(self.manager_selected_slot_var.get())
        else:
            index = selection[0]
            if index < 0 or index >= len(self._manager_slot_entries):
                return None
            slot_number = self._manager_slot_entries[index].slot
        for slot in progression.slots:
            if slot.slot == slot_number:
                return slot
        return None

    def _sync_manager_form_from_progression(
        self,
        key: str,
        progression: ProgressionConfig,
        *,
        preferred_slot: int | None = None,
    ) -> None:
        self.manager_selected_key_var.set(key)
        self.manager_rename_key_var.set(key)
        self.manager_selected_lock_var.set(bool(progression.locked))
        self.manager_tutorial_path_var.set(progression.tutorial_level_file or "levels/tutorial_level.json")
        self._manager_slot_entries = list(progression.slots)
        self.manager_slots_listbox.delete(0, self._tk.END)
        for slot in progression.slots:
            if slot.slot == 0:
                label = f"slot {slot.slot}: {slot.label or 'TUTORIAL'}"
            else:
                label = f"slot {slot.slot}: {slot.level_file or '[empty]'}"
            if slot.status:
                label += f" | {slot.status}"
            self.manager_slots_listbox.insert(self._tk.END, label)
        if progression.slots:
            initial = next((slot for slot in progression.slots if slot.slot == preferred_slot), None)
            if initial is None:
                initial = next((slot for slot in progression.slots if slot.slot != 0), progression.slots[0])
            self.manager_selected_slot_var.set(initial.slot)
            self.manager_selected_slot_path_var.set(initial.level_file or "")
            self.manager_selected_slot_label_var.set(initial.label or "")
            self.manager_selected_slot_status_var.set(initial.status or "")
            try:
                slot_index = next(index for index, slot in enumerate(progression.slots) if slot.slot == initial.slot)
            except StopIteration:
                slot_index = None
            if slot_index is not None:
                self.manager_slots_listbox.selection_clear(0, self._tk.END)
                self.manager_slots_listbox.selection_set(slot_index)
                self.manager_slots_listbox.see(slot_index)
        self.manager_progression_keys.selection_clear(0, self._tk.END)
        try:
            key_index = self._manager_progression_keys.index(key)
        except ValueError:
            key_index = None
        if key_index is not None:
            self.manager_progression_keys.selection_set(key_index)
            self.manager_progression_keys.see(key_index)

    def _refresh_manager_output(self) -> None:
        lines = [
            f"live_path={self._display_path(self._resolve_repo_path(self.manager_live_path_var.get()))}",
            f"metadata_path={self._display_path(self._resolve_repo_path(self.manager_metadata_path_var.get()))}",
            f"live_count={len(self._live_progressions)}",
            f"selected_key={self.manager_selected_key_var.get().strip() or '-'}",
        ]
        if self._manager_metadata is not None:
            lines.extend(
                [
                    f"metadata.saved_at={self._manager_metadata.saved_at or '-'}",
                    f"metadata.reason={self._manager_metadata.reason or '-'}",
                    f"metadata.active_tab={self._manager_metadata.active_tab or '-'}",
                    f"metadata.selected_id={self._manager_metadata.selected_id if self._manager_metadata.selected_id is not None else '-'}",
                    f"metadata.progression_order={', '.join(self._manager_metadata.progression_order) if self._manager_metadata.progression_order else '-'}",
                ]
            )
        current = self._selected_manager_progression()
        if current is not None:
            lines.extend(
                [
                    "",
                    f"progression={current.name}",
                    f"locked={current.locked}",
                    f"tutorial={current.tutorial_level_file or '-'}",
                    f"assigned_slots={current.assigned_slots}",
                ]
            )
        self._set_output(self.progression_output, "\n".join(lines))

    def _render_spreadsheet_command_result(self, result: Any) -> None:
        lines = [
            f"ok={result.ok}",
            f"key={result.key}",
            f"command={' '.join(result.command)}",
            f"cwd={result.cwd}",
            f"returncode={result.returncode}",
        ]
        if result.error:
            lines.append(f"error={result.error}")
        if result.stdout:
            lines.append("")
            lines.append("stdout:")
            lines.append(result.stdout.rstrip())
        if result.stderr:
            lines.append("")
            lines.append("stderr:")
            lines.append(result.stderr.rstrip())
        self._set_output(self.spreadsheet_output, "\n".join(lines))

    def _run_spreadsheet_command_internal(self, key: str) -> Any:
        result = run_spreadsheet_command(
            key,
            self.project_root,
            args=[],
            timeout=None,
            credentials_path=self.credentials_path_var.get(),
            token_path=self.token_path_var.get(),
        )
        self._render_spreadsheet_command_result(result)
        status = inspect_spreadsheet_status(
            self.project_root,
            credentials_path=self.credentials_path_var.get(),
            token_path=self.token_path_var.get(),
        )
        self._refresh_spreadsheet_commands_view(status)
        return result

    def _render_manager_progression_keys(self) -> None:
        if not hasattr(self, "manager_progression_keys"):
            return
        self.manager_progression_keys.delete(0, self._tk.END)
        for key in self._manager_progression_keys:
            progression = self._live_progressions.get(key)
            suffix = f" | locked" if progression and progression.locked else ""
            self.manager_progression_keys.insert(self._tk.END, f"{key}{suffix}")

    def load_manager_snapshot(self) -> None:
        live_path = self._resolve_repo_path(self.manager_live_path_var.get())
        metadata_path = self._resolve_repo_path(self.manager_metadata_path_var.get())
        self._live_progressions = load_live_progressions(live_path) if live_path.exists() else {}
        self._manager_metadata = load_manager_metadata(metadata_path) if metadata_path.exists() else None
        self._manager_progression_keys = ordered_manager_progression_keys(self._live_progressions, self._manager_metadata)
        if not self._manager_progression_keys:
            self._render_manager_progression_keys()
            self.manager_slots_listbox.delete(0, self._tk.END)
            self.manager_selected_key_var.set("")
            self.manager_rename_key_var.set("")
            self.manager_selected_slot_path_var.set("")
            self.manager_selected_slot_label_var.set("")
            self.manager_selected_slot_status_var.set("")
            self._sync_editor_progression_choices()
            self._refresh_manager_output()
            self.footer_var.set("No live manager snapshot found.")
            return
        self._render_manager_progression_keys()
        first_key = self.manager_selected_key_var.get().strip()
        if first_key not in self._live_progressions:
            first_key = self._manager_progression_keys[0]
        self._sync_manager_form_from_progression(first_key, self._live_progressions[first_key])
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        if not self.manager_sheet_filter_var.get().strip():
            self.manager_sheet_filter_var.set(first_key)
        self.footer_var.set("Loaded live manager snapshot.")

    def save_manager_snapshot(self) -> None:
        if not self._live_progressions:
            self.load_manager_snapshot()
        if not self._live_progressions:
            self.footer_var.set("No live progressions available to save.")
            return
        self.apply_selected_manager_progression_meta()
        if self._manager_metadata is None:
            self._manager_metadata = ManagerMetadata(
                saved_at=None,
                reason="native_ui_save",
                active_tab="manager",
                selected_id=None,
                counts={},
                progression_order=[],
                filters={},
                raw={},
            )
        self._manager_metadata.saved_at = datetime.now(timezone.utc).replace(microsecond=3).isoformat().replace("+00:00", "Z")
        self._manager_metadata.reason = self._manager_metadata.reason or "native_ui_save"
        self._manager_metadata.active_tab = "manager"
        self._manager_metadata.progression_order = list(
            self._manager_progression_keys or ordered_manager_progression_keys(self._live_progressions, self._manager_metadata)
        )
        selected_key = self.manager_selected_key_var.get().strip()
        self._manager_metadata.selected_id = int(self.manager_selected_slot_var.get()) if selected_key else self._manager_metadata.selected_id
        save_live_progressions(self._live_progressions, self.manager_live_path_var.get().strip(), self.project_root)
        save_manager_metadata(self._manager_metadata, self.manager_metadata_path_var.get().strip(), self.project_root)
        self._refresh_manager_output()
        self.footer_var.set("Saved manager snapshot.")

    def duplicate_selected_manager_progression(self) -> None:
        progression = self._selected_manager_progression()
        key = self._selected_manager_key() or self.manager_selected_key_var.get().strip()
        if progression is None or not key:
            self.footer_var.set("No live progression selected.")
            return
        base_name = self.manager_rename_key_var.get().strip() or f"{key}_copy"
        duplicate_key = base_name
        suffix = 2
        while duplicate_key in self._live_progressions:
            duplicate_key = f"{base_name}_{suffix}"
            suffix += 1
        self._live_progressions[duplicate_key] = ProgressionConfig(
            name=duplicate_key,
            locked=False,
            tutorial_level_file=progression.tutorial_level_file,
            slots=[
                ProgressionSlot(
                    slot=slot.slot,
                    level_file=slot.level_file,
                    status=slot.status,
                    label=slot.label,
                )
                for slot in progression.slots
            ],
            raw={},
        )
        self._manager_progression_keys.append(duplicate_key)
        self._render_manager_progression_keys()
        self._sync_manager_form_from_progression(duplicate_key, self._live_progressions[duplicate_key])
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Duplicated live progression {key} into {duplicate_key}.")

    def add_new_manager_progression(self) -> None:
        if not self._live_progressions:
            self.load_manager_snapshot()
        key = (self.manager_rename_key_var.get().strip() or self.manager_selected_key_var.get().strip() or "").strip()
        if not key:
            key = f"progression_{len(self._live_progressions) + 1}"
        try:
            created_key = add_manager_progression(
                self._live_progressions,
                self._manager_progression_keys,
                key,
                tutorial_level_file=self.manager_tutorial_path_var.get().strip() or "levels/tutorial_level.json",
            )
        except ValueError as exc:
            self.footer_var.set(str(exc))
            return
        self._render_manager_progression_keys()
        self._sync_manager_form_from_progression(created_key, self._live_progressions[created_key])
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Added progression {created_key}.")

    def rename_selected_manager_progression(self) -> None:
        progression = self._selected_manager_progression()
        if progression is None:
            self.footer_var.set("No live progression selected.")
            return
        current_key = self.manager_selected_key_var.get().strip() or progression.name
        target_key = self.manager_rename_key_var.get().strip()
        try:
            renamed_key = rename_manager_progression(
                self._live_progressions,
                self._manager_progression_keys,
                current_name=current_key,
                target_name=target_key,
            )
        except ValueError as exc:
            self.footer_var.set(str(exc))
            return
        self._render_manager_progression_keys()
        self._sync_manager_form_from_progression(renamed_key, self._live_progressions[renamed_key])
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Renamed progression {current_key} to {renamed_key}.")

    def remove_selected_manager_progression(self) -> None:
        key = self.manager_selected_key_var.get().strip() or (self._selected_manager_key() or "")
        if not key:
            self.footer_var.set("No live progression selected.")
            return
        try:
            removed_key = remove_manager_progression(
                self._live_progressions,
                self._manager_progression_keys,
                key,
            )
        except ValueError as exc:
            self.footer_var.set(str(exc))
            return
        self._render_manager_progression_keys()
        if self._manager_progression_keys:
            next_key = self._manager_progression_keys[0]
            self._sync_manager_form_from_progression(next_key, self._live_progressions[next_key])
        else:
            self.manager_slots_listbox.delete(0, self._tk.END)
            self.manager_selected_key_var.set("")
            self.manager_rename_key_var.set("")
            self.manager_selected_slot_path_var.set("")
            self.manager_selected_slot_label_var.set("")
            self.manager_selected_slot_status_var.set("")
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Removed progression {removed_key}.")

    def apply_selected_manager_progression_meta(self) -> None:
        progression = self._selected_manager_progression()
        if progression is None:
            self.footer_var.set("No live progression selected.")
            return
        selected_key = self.manager_selected_key_var.get().strip() or progression.name
        rename_to = self.manager_rename_key_var.get().strip()
        if rename_to and rename_to != selected_key:
            old_key = selected_key
            self._live_progressions[rename_to] = self._live_progressions.pop(old_key)
            progression = self._live_progressions[rename_to]
            selected_key = rename_to
            self._manager_progression_keys = [rename_to if key == old_key else key for key in self._manager_progression_keys]
        progression.name = selected_key
        progression.locked = bool(self.manager_selected_lock_var.get())
        progression.tutorial_level_file = self.manager_tutorial_path_var.get().strip() or None
        self.manager_selected_key_var.set(selected_key)
        self._render_manager_progression_keys()
        self._sync_manager_form_from_progression(selected_key, progression)
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Updated progression metadata for {selected_key}.")

    def validate_selected_manager_progression(self) -> None:
        progression = self._selected_manager_progression()
        if progression is None:
            self.footer_var.set("No live progression selected.")
            return
        summary = validate_progression_levels(progression, self.project_root)
        lines = [
            f"name={summary.name}",
            f"total_slots={summary.total_slots}",
            f"assigned_slots={summary.assigned_slots}",
            f"tutorial_slots={summary.tutorial_slots}",
            f"checked_levels={summary.checked_levels}",
            f"valid_levels={summary.valid_levels}",
            f"invalid_levels={summary.invalid_levels}",
            f"missing_levels={summary.missing_levels}",
            "",
            "entries:",
        ]
        for entry in summary.entries:
            lines.append(
                f"- slot={entry.slot} file={entry.level_file} exists={entry.exists} "
                f"valid={entry.valid} errors={entry.error_count} warnings={entry.warning_count}"
                + (f" load_error={entry.load_error}" if entry.load_error else "")
            )
        self._set_output(self.progression_output, "\n".join(lines))
        self.footer_var.set(f"Validated live progression {progression.name}.")

    def _select_manager_progression_from_list(self) -> None:
        key = self._selected_manager_key()
        if key is None:
            return
        progression = self._live_progressions.get(key)
        if progression is None:
            return
        if not self.manager_sheet_filter_var.get().strip():
            self.manager_sheet_filter_var.set(key)
        self._sync_manager_form_from_progression(key, progression)
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Selected live progression {key}.")

    def _select_manager_slot_from_list(self) -> None:
        slot = self._selected_manager_slot()
        if slot is None:
            return
        self.manager_selected_slot_var.set(slot.slot)
        self.manager_selected_slot_path_var.set(slot.level_file or "")
        self.manager_selected_slot_label_var.set(slot.label or "")
        self.manager_selected_slot_status_var.set(slot.status or "")
        self.footer_var.set(f"Selected slot {slot.slot}.")

    def open_selected_manager_slot(self) -> None:
        slot = self._selected_manager_slot()
        if slot is None:
            self.footer_var.set("No live progression slot selected.")
            return
        if not slot.level_file:
            self.footer_var.set(f"Selected slot {slot.slot} is empty.")
            return
        path = self._resolve_repo_path(slot.level_file)
        if not path.exists():
            self.footer_var.set(f"Missing level file for slot {slot.slot}: {slot.level_file}")
            return
        level = load_level_file(path)
        self._load_level_into_editor(level, slot.level_file)
        self.footer_var.set(f"Opened live progression slot {slot.slot} in the editor.")

    def assign_editor_file_to_selected_slot(self) -> None:
        slot = self._selected_manager_slot()
        progression = self._selected_manager_progression()
        if slot is None or progression is None:
            self.footer_var.set("No live progression slot selected.")
            return
        source = self.editor_source_path_var.get().strip() or self.level_path_var.get().strip()
        if not source:
            self.footer_var.set("No editor file selected.")
            return
        updated_slot = ProgressionSlot(
            slot=slot.slot,
            level_file=source,
            status=slot.status if str(slot.status or "").strip().lower() not in {"", "empty"} else "assigned",
            label=slot.label,
        )
        progression.slots = [updated_slot if item.slot == slot.slot else item for item in progression.slots]
        self._sync_manager_form_from_progression(progression.name, progression, preferred_slot=slot.slot)
        self.manager_selected_slot_var.set(slot.slot)
        self.manager_selected_slot_path_var.set(source)
        self.manager_selected_slot_label_var.set(updated_slot.label or "")
        self.manager_selected_slot_status_var.set(updated_slot.status or "")
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Assigned {source} to slot {slot.slot}.")

    def clear_selected_manager_slot(self) -> None:
        slot = self._selected_manager_slot()
        if slot is None:
            self.footer_var.set("No live progression slot selected.")
            return
        if slot.slot == 0:
            self.footer_var.set("Tutorial slot cannot be cleared.")
            return
        cleared_slot = ProgressionSlot(slot=slot.slot, level_file=None, status=None, label=None)
        progression = self._selected_manager_progression()
        if progression is not None:
            progression.slots = [cleared_slot if item.slot == slot.slot else item for item in progression.slots]
            self._sync_manager_form_from_progression(progression.name, progression, preferred_slot=slot.slot)
        self.manager_selected_slot_path_var.set("")
        self.manager_selected_slot_label_var.set("")
        self.manager_selected_slot_status_var.set("")
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Cleared slot {slot.slot}.")

    def add_manager_slot(self) -> None:
        progression = self._selected_manager_progression()
        if progression is None:
            self.footer_var.set("No live progression selected.")
            return
        next_slot = max((slot.slot for slot in progression.slots), default=0) + 1
        slot = ProgressionSlot(slot=next_slot, level_file=None, status="empty", label=None)
        progression.slots.append(slot)
        self._manager_slot_entries = list(progression.slots)
        self.manager_selected_slot_var.set(slot.slot)
        self.manager_slots_listbox.insert(self._tk.END, f"slot {slot.slot}: [empty] | empty")
        self.manager_slots_listbox.selection_clear(0, self._tk.END)
        self.manager_slots_listbox.selection_set(self.manager_slots_listbox.size() - 1)
        self._select_manager_slot_from_list()
        self._refresh_manager_output()
        self.footer_var.set(f"Added slot {slot.slot}.")

    def remove_selected_manager_slot(self) -> None:
        progression = self._selected_manager_progression()
        slot = self._selected_manager_slot()
        if progression is None or slot is None:
            self.footer_var.set("No live progression slot selected.")
            return
        if slot.slot == 0:
            self.footer_var.set("Tutorial slot cannot be removed.")
            return
        progression.slots = [item for item in progression.slots if item.slot != slot.slot]
        self._manager_slot_entries = list(progression.slots)
        self._sync_manager_form_from_progression(self.manager_selected_key_var.get().strip() or progression.name, progression)
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Removed slot {slot.slot}.")

    def save_selected_manager_progression(self) -> None:
        progression = self._selected_manager_progression()
        if progression is None:
            self.footer_var.set("No live progression selected.")
            return
        self.apply_selected_manager_progression_meta()
        save_live_progressions(self._live_progressions, self.manager_live_path_var.get().strip(), self.project_root)
        self._refresh_manager_output()
        self.footer_var.set(f"Saved live progression {progression.name}.")

    def export_selected_manager_progression(self) -> None:
        progression = self._selected_manager_progression()
        if progression is None:
            self.footer_var.set("No live progression selected.")
            return
        output = self.manager_export_path_var.get().strip() or "output/python_toolkit_checks/selected_live_progression.json"
        saved = save_progression_file(progression, output, self.project_root)
        self.footer_var.set(f"Exported live progression {progression.name} to {self._display_path(saved)}.")

    def _sync_editor_progression_choices(self) -> None:
        if not hasattr(self, "editor_progression_combo"):
            return
        keys = list(self._manager_progression_keys or ordered_manager_progression_keys(self._live_progressions, self._manager_metadata))
        self.editor_progression_combo["values"] = keys
        current = self.editor_progression_key_var.get().strip()
        if current not in keys:
            current = self.manager_selected_key_var.get().strip() or (keys[0] if keys else "")
        self.editor_progression_key_var.set(current)
        progression = self._live_progressions.get(current) if current else None
        if progression is not None and progression.slots:
            active_slot = self.editor_progression_slot_var.get()
            slot_numbers = {slot.slot for slot in progression.slots}
            if active_slot not in slot_numbers:
                first_playable = next((slot.slot for slot in progression.slots if slot.slot != 0), progression.slots[0].slot)
                self.editor_progression_slot_var.set(first_playable)

    def _sync_editor_progression_target_from_choice(self) -> None:
        key = self.editor_progression_key_var.get().strip()
        progression = self._live_progressions.get(key)
        if progression is None or not progression.slots:
            return
        selected_slot = next((slot.slot for slot in progression.slots if slot.slot != 0), progression.slots[0].slot)
        self.editor_progression_slot_var.set(selected_slot)

    def save_editor_level_to_progression_slot(self) -> None:
        level = self._editor_level_to_level()
        if not self._live_progressions:
            self.load_manager_snapshot()
        progression_key = self.editor_progression_key_var.get().strip() or self.manager_selected_key_var.get().strip()
        if not progression_key:
            self.footer_var.set("No progression selected.")
            return
        progression = self._live_progressions.get(progression_key)
        if progression is None:
            self.footer_var.set(f"Unknown progression {progression_key}.")
            return
        if progression.locked:
            self.footer_var.set(f"Progression {progression_key} is locked.")
            return
        try:
            saved_path = save_level_to_progression_slot(
                level,
                progression,
                int(self.editor_progression_slot_var.get()),
                project_root=self.project_root,
                output_path=self.editor_output_path_var.get().strip(),
            )
        except (OSError, ValueError) as exc:
            self.footer_var.set(f"Progression slot save failed: {exc}")
            return
        save_live_progressions(self._live_progressions, self.manager_live_path_var.get().strip(), self.project_root)
        saved_display = self._display_path(saved_path)
        self.editor_source_path_var.set(saved_display)
        self.editor_output_path_var.set(saved_display)
        self.level_path_var.set(saved_display)
        self._sync_manager_form_from_progression(progression_key, progression)
        self._sync_editor_progression_choices()
        self._refresh_manager_output()
        self.footer_var.set(f"Saved editor level to {saved_display} in {progression_key}.")

    def save_inspected_progression(self) -> None:
        if self._current_progression is None:
            self.inspect_progression()
        if self._current_progression is None:
            self.footer_var.set("No inspected progression available.")
            return
        save_progression_file(self._current_progression, self.progression_path_var.get().strip(), self.project_root)
        self.footer_var.set(f"Saved inspected progression to {self.progression_path_var.get().strip()}.")

    def summarize_pack(self, validate_only: bool = False) -> None:
        folder = self._resolve_repo_path(self.pack_folder_var.get())
        summary = summarize_level_pack(folder)
        lines = [
            f"folder={folder}",
            f"file_count={summary.file_count}",
            f"valid_count={summary.valid_count}",
            f"invalid_count={summary.invalid_count}",
            "",
            "board_counts:",
        ]
        lines.extend(f"- {key}: {value}" for key, value in sorted(summary.board_counts.items()))
        lines.append("")
        lines.append("pair_counts:")
        lines.extend(f"- {key}: {value}" for key, value in sorted(summary.pair_counts.items()))
        if summary.missing_metadata_counts:
            lines.append("")
            lines.append("missing_metadata_counts:")
            lines.extend(f"- {key}: {value}" for key, value in sorted(summary.missing_metadata_counts.items()))
        lines.append("")
        lines.append("entries:")
        for entry in summary.entries:
            state = "valid" if entry.valid else "invalid"
            lines.append(
                f"- {entry.path} | {state} | board={entry.cols}x{entry.rows} | "
                f"pairs={entry.pair_count} | blockers={entry.blocker_count} | "
                f"errors={entry.error_count} | warnings={entry.warning_count}"
            )
        self._set_output(self.pack_output, "\n".join(lines))
        verb = "Validated" if validate_only else "Summarized"
        self.footer_var.set(f"{verb} {self._display_path(folder)}.")

    def inspect_play_session(self) -> None:
        path = self._resolve_repo_path(self.play_session_path_var.get())
        try:
            session = load_play_session_file(path)
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            self._set_output(self.sessions_output, f"path={path}\nerror={exc}")
            self.footer_var.set(f"Could not inspect {self._display_path(path)}.")
            return
        lines = [
            f"path={path}",
            f"saved_at={session.saved_at}",
            f"solved={session.solved}",
            f"selected_pair={session.selected_pair}",
            f"history_length={len(session.history)}",
            f"path_count={len(session.paths)}",
            f"level_name={session.level.get('name') or session.level.get('id') or session.level.get('meta', {}).get('source_name')}",
            f"board={session.level.get('board_width')}x{session.level.get('board_height')}",
        ]
        self._set_output(self.sessions_output, "\n".join(lines))
        self.footer_var.set(f"Inspected {self._display_path(path)}.")

    def inspect_sessions_state(self) -> None:
        path = self._resolve_repo_path(self.sessions_state_path_var.get())
        state = self._load_sessions_state(path)
        self._sessions_state = state
        self._sessions_queue_items = list(state.queue)
        summary = summarize_play_sessions_state(state)
        lines = [
            f"path={path}",
            f"queue_count={summary['queue_count']}",
            f"pending_count={summary['pending_count']}",
            f"approved_count={summary['approved_count']}",
            f"rejected_count={summary['rejected_count']}",
            f"changed_count={summary['changed_count']}",
            f"selected_id={summary['selected_id']}",
            f"active_id={summary['active_id']}",
            f"editing_id={summary['editing_id']}",
            "",
            "queue_preview:",
        ]
        for item in state.queue[:20]:
            lines.append(f"- {session_queue_item_label(item)}")
        if len(state.queue) > 20:
            lines.append(f"... {len(state.queue) - 20} more entries")
        self._set_output(self.sessions_output, "\n".join(lines))
        self._refresh_sessions_queue_view()
        self.footer_var.set(f"Loaded queue state from {self._display_path(path)}.")

    def load_sessions_state(self) -> None:
        self.inspect_sessions_state()

    def _queue_level_into_sessions(
        self,
        level: Level,
        *,
        name: str,
        source: str,
        saved_path: str = "",
    ) -> SessionQueueItem:
        state = self._sessions_state or self._load_sessions_state()
        self._sessions_state = state
        created = append_generated_levels_to_sessions_state(
            state,
            [
                (
                    name,
                    json.loads(serialize_level_to_canonical_json(level, name)),
                )
            ],
            source=source,
        )[0]
        if saved_path:
            created.saved_path = saved_path
            created.raw["saved_path"] = saved_path
        self._save_sessions_state()
        self._refresh_sessions_queue_view()
        return created

    def _load_sessions_state(self, path: Path | None = None) -> PlaySessionsState:
        target = path or self._resolve_repo_path(self.sessions_state_path_var.get())
        if not target.exists():
            return PlaySessionsState(raw={})
        try:
            return load_play_sessions_state(target)
        except (OSError, json.JSONDecodeError, ValueError):
            return PlaySessionsState(raw={})

    def _selected_session_item(self) -> SessionQueueItem | None:
        if self._sessions_state is None:
            return None
        selected_id = self._sessions_selected_id
        if selected_id is None:
            selected_id = self._sessions_state.raw.get("selectedId")
        return find_session_queue_item(self._sessions_state, selected_id)

    def _sessions_queue_selected_index(self) -> int | None:
        item = self._selected_session_item()
        if item is None:
            return None
        for index, candidate in enumerate(self._sessions_queue_items):
            if candidate.id == item.id:
                return index
        return None

    def _render_session_detail_text(self, item: SessionQueueItem) -> str:
        level = item.level or {}
        summary = [
            session_queue_item_label(item),
            f"saved_path={item.saved_path or '-'}",
            f"screenshot_path={item.screenshot_path or '-'}",
            f"manager_item_id={item.manager_item_id if item.manager_item_id is not None else '-'}",
            f"review_status={item.review_status or 'PENDING'}",
            f"validation_status={item.validation_status or 'UNKNOWN'}",
            f"feedback_decision={item.feedback_decision or '-'}",
            f"feedback_reason_code={item.feedback_reason_code or '-'}",
            f"feedback_keep_tags={', '.join(item.feedback_keep_tags) if item.feedback_keep_tags else '-'}",
            f"feedback_pair_ids={', '.join(item.feedback_pair_ids) if item.feedback_pair_ids else '-'}",
            f"feedback_note={item.feedback_note or '-'}",
            "",
            f"level_id={level.get('id') or level.get('name') or '-'}",
            f"board={level.get('board_width')}x{level.get('board_height')}",
            f"moves={level.get('moves')}",
            f"pairs={len(level.get('pairs') or [])}",
            f"blockers={len(level.get('blockers') or [])}",
            f"solution_count={level.get('solution_count') or level.get('solutionCount')}",
            f"target_density={level.get('target_density') or level.get('targetDensity')}",
        ]
        return "\n".join(summary)

    def _sync_sessions_form_from_item(self, item: SessionQueueItem) -> None:
        self._sessions_selected_id = item.id
        self.session_review_status_var.set((item.review_status or "PENDING").upper())
        self.session_feedback_decision_var.set(item.feedback_decision or "")
        self.session_feedback_reason_var.set(item.feedback_reason_code or "")
        self.session_feedback_tags_var.set(", ".join(item.feedback_keep_tags))
        self.session_feedback_pairs_var.set(", ".join(item.feedback_pair_ids))
        self.session_feedback_note_var.set(item.feedback_note or "")
        self._set_output(self.sessions_detail, self._render_session_detail_text(item))

    def _refresh_sessions_queue_view(self) -> None:
        if not hasattr(self, "sessions_queue_list"):
            return
        self.sessions_queue_list.delete(0, self._tk.END)
        for item in self._sessions_queue_items:
            self.sessions_queue_list.insert(self._tk.END, session_queue_item_label(item))
        selected_index = self._sessions_queue_selected_index()
        if selected_index is None and self._sessions_queue_items:
            pending = next((item for item in self._sessions_queue_items if (item.review_status or "PENDING").upper() == "PENDING"), self._sessions_queue_items[0])
            select_session_queue_item(self._sessions_state or PlaySessionsState(raw={}), pending.id)
            self._sessions_selected_id = pending.id
            selected_index = self._sessions_queue_selected_index()
        if selected_index is not None:
            self.sessions_queue_list.selection_clear(0, self._tk.END)
            self.sessions_queue_list.selection_set(selected_index)
            self.sessions_queue_list.see(selected_index)
            selected_item = self._selected_session_item()
            if selected_item is not None:
                self._sync_sessions_form_from_item(selected_item)
        else:
            self._set_output(self.sessions_detail, "No queue item selected.")
        if self._sessions_state is not None:
            summary = summarize_play_sessions_state(self._sessions_state)
            self.sessions_summary.configure(
                text=(
                    f"Queue {summary['queue_count']} items | "
                    f"pending {summary['pending_count']} | "
                    f"approved {summary['approved_count']} | "
                    f"rejected {summary['rejected_count']} | "
                    f"changed {summary['changed_count']}"
                )
            )

    def _save_sessions_state(self) -> Path | None:
        if self._sessions_state is None:
            return None
        path = save_play_sessions_state(
            self._sessions_state,
            self.sessions_state_path_var.get().strip() or ".local/toolkit_state/play_sessions_state.json",
            self.project_root,
        )
        return path

    def save_sessions_state(self) -> None:
        if self._sessions_state is None:
            self._sessions_state = self._load_sessions_state()
        if self._sessions_state is None:
            self.footer_var.set("No sessions state available to save.")
            return
        saved = self._save_sessions_state()
        if saved is None:
            self.footer_var.set("No sessions state available to save.")
            return
        self.footer_var.set(f"Saved sessions state to {self._display_path(saved)}.")

    def _update_selected_session_review(self, review_status: str, feedback_decision: str | None = None) -> None:
        state = self._sessions_state or self._load_sessions_state()
        self._sessions_state = state
        if not state.queue:
            self.footer_var.set("No queue items available.")
            return
        item = self._selected_session_item()
        if item is None:
            self.footer_var.set("No queue item selected.")
            return
        normalized_status = str(review_status or "").strip().upper() or "PENDING"
        normalized_decision = str(feedback_decision or self.session_feedback_decision_var.get() or "").strip().lower()
        if normalized_status == "PENDING" and normalized_decision in {"approve", "reject"}:
            normalized_status = "APPROVED" if normalized_decision == "approve" else "REJECTED"
            self.session_review_status_var.set(normalized_status)
        item = update_session_queue_item_feedback(
            item,
            review_status=normalized_status,
            feedback_decision=normalized_decision,
            feedback_reason_code=self.session_feedback_reason_var.get(),
            feedback_keep_tags=[part.strip() for part in self.session_feedback_tags_var.get().split(",") if part.strip()],
            feedback_pair_ids=[part.strip() for part in self.session_feedback_pairs_var.get().split(",") if part.strip()],
            feedback_note=self.session_feedback_note_var.get(),
        )
        select_session_queue_item(state, item.id)
        self._sessions_selected_id = item.id
        self._save_sessions_state()
        self._refresh_sessions_queue_view()
        if self.session_auto_feedback_var.get():
            self._send_learning_for_session_item(item)

    def apply_selected_session_review(self) -> None:
        self._update_selected_session_review(self.session_review_status_var.get().strip() or "PENDING")
        self.footer_var.set("Applied selected session review.")

    def approve_selected_session(self) -> None:
        self.session_review_status_var.set("APPROVED")
        self.session_feedback_decision_var.set("approve")
        self._update_selected_session_review("APPROVED", "approve")
        self.select_next_pending_session()
        self.footer_var.set("Approved selected session and advanced to the next pending item.")

    def reject_selected_session(self) -> None:
        self.session_review_status_var.set("REJECTED")
        self.session_feedback_decision_var.set("reject")
        self._update_selected_session_review("REJECTED", "reject")
        self.select_next_pending_session()
        self.footer_var.set("Rejected selected session and advanced to the next pending item.")

    def approve_all_pending_sessions(self) -> None:
        state = self._sessions_state or self._load_sessions_state()
        self._sessions_state = state
        result = batch_review_session_items(
            state,
            review_status="APPROVED",
            feedback_decision="approve",
            reason_code=self.session_feedback_reason_var.get(),
            keep_tags=[part.strip() for part in self.session_feedback_tags_var.get().split(",") if part.strip()],
            pair_ids=[part.strip() for part in self.session_feedback_pairs_var.get().split(",") if part.strip()],
            note=self.session_feedback_note_var.get(),
            only_pending=True,
        )
        self._save_sessions_state()
        self._refresh_sessions_queue_view()
        self.footer_var.set(
            f"Approved {result['updated_count']} pending session item(s)."
        )
        if self.session_auto_feedback_var.get() and result.get("updated_ids"):
            sent = 0
            for item_id in result.get("updated_ids", []):
                item = find_session_queue_item(state, item_id)
                if item is not None and self._send_learning_for_session_item(item):
                    sent += 1
            if sent:
                self.session_feedback_last_sent_var.set(f"Last sent: batch {sent} approved item(s).")

    def reject_all_pending_sessions(self) -> None:
        state = self._sessions_state or self._load_sessions_state()
        self._sessions_state = state
        result = batch_review_session_items(
            state,
            review_status="REJECTED",
            feedback_decision="reject",
            reason_code=self.session_feedback_reason_var.get() or "too_easy",
            keep_tags=[part.strip() for part in self.session_feedback_tags_var.get().split(",") if part.strip()],
            pair_ids=[part.strip() for part in self.session_feedback_pairs_var.get().split(",") if part.strip()],
            note=self.session_feedback_note_var.get(),
            only_pending=True,
        )
        self._save_sessions_state()
        self._refresh_sessions_queue_view()
        self.footer_var.set(
            f"Rejected {result['updated_count']} pending session item(s)."
        )
        if self.session_auto_feedback_var.get() and result.get("updated_ids"):
            sent = 0
            for item_id in result.get("updated_ids", []):
                item = find_session_queue_item(state, item_id)
                if item is not None and self._send_learning_for_session_item(item):
                    sent += 1
            if sent:
                self.session_feedback_last_sent_var.set(f"Last sent: batch {sent} rejected item(s).")

    def _send_learning_for_session_item(self, item: SessionQueueItem) -> bool:
        if not item.level:
            return False
        decision = str(item.feedback_decision or "").strip().lower()
        status = str(item.review_status or "").strip().upper()
        if decision not in {"approve", "reject"}:
            if status == "APPROVED":
                decision = "approve"
            elif status == "REJECTED":
                decision = "reject"
        if decision not in {"approve", "reject"}:
            return False
        level = parse_level_dict(json.loads(json.dumps(item.level)))
        saved_path, buckets, record = save_session_review_learning_feedback(
            level,
            decision=decision,
            project_root=self.project_root,
            learning_path=self.learning_path_var.get(),
            reason_code=item.feedback_reason_code,
            keep_tags=item.feedback_keep_tags,
            pair_ids=item.feedback_pair_ids,
            note=item.feedback_note,
        )
        self.session_feedback_last_sent_var.set(
            f"Last sent: {record.get('decision', decision)} -> {self._display_path(saved_path)}"
        )
        self._set_output(
            self.sessions_output,
            "\n".join(
                [
                    f"saved_path={saved_path}",
                    f"decision={record.get('decision', decision)}",
                    f"approved_count={len(buckets.get('approved', []))}",
                    f"rejected_count={len(buckets.get('rejected', []))}",
                    f"reason_code={record.get('reason_code', '-')}",
                ]
            ),
        )
        return True

    def send_selected_session_feedback(self) -> None:
        item = self._selected_session_item()
        if item is None or not item.level:
            self.footer_var.set("No queue item selected.")
            return
        decision = str(self.session_feedback_decision_var.get() or "").strip().lower()
        if decision not in {"approve", "reject"}:
            review_status = str(self.session_review_status_var.get() or "").strip().upper()
            if review_status == "APPROVED":
                decision = "approve"
            elif review_status == "REJECTED":
                decision = "reject"
            else:
                self.footer_var.set("Pick approve or reject before sending feedback.")
                return
        update_session_queue_item_feedback(
            item,
            review_status=self.session_review_status_var.get().strip(),
            feedback_decision=decision,
            feedback_reason_code=self.session_feedback_reason_var.get(),
            feedback_keep_tags=[part.strip() for part in self.session_feedback_tags_var.get().split(",") if part.strip()],
            feedback_pair_ids=[part.strip() for part in self.session_feedback_pairs_var.get().split(",") if part.strip()],
            feedback_note=self.session_feedback_note_var.get(),
        )
        self._send_learning_for_session_item(item)
        self.footer_var.set("Sent session feedback into the learning state.")

    def send_reviewed_sessions_feedback(self) -> None:
        state = self._sessions_state or self._load_sessions_state()
        self._sessions_state = state
        reviewed_items = []
        for item in state.queue:
            status = str(item.review_status or "").strip().upper()
            if status not in {"APPROVED", "REJECTED"}:
                continue
            decision = str(item.feedback_decision or "").strip().lower()
            if decision not in {"approve", "reject"}:
                decision = "approve" if status == "APPROVED" else "reject"
            if not item.level:
                continue
            reviewed_items.append((item, decision))
        if not reviewed_items:
            self.footer_var.set("No reviewed sessions with a decision to send.")
            return
        sent = 0
        for item, decision in reviewed_items:
            level = parse_level_dict(json.loads(json.dumps(item.level)))
            save_session_review_learning_feedback(
                level,
                decision=decision,
                project_root=self.project_root,
                learning_path=self.learning_path_var.get(),
                reason_code=item.feedback_reason_code,
                keep_tags=item.feedback_keep_tags,
                pair_ids=item.feedback_pair_ids,
                note=item.feedback_note,
            )
            sent += 1
        self.session_feedback_last_sent_var.set(
            f"Last sent: batch {sent} reviewed item(s)."
        )
        self._set_output(
            self.sessions_output,
            "\n".join(
                [
                    f"batch_sent={sent}",
                    f"reviewed_candidates={len(reviewed_items)}",
                    f"learning_path={self.learning_path_var.get()}",
                ]
            ),
        )
        self.footer_var.set(f"Sent feedback for {sent} reviewed session item(s).")

    def _on_sessions_queue_select(self) -> None:
        if self._sessions_state is None:
            return
        selection = self.sessions_queue_list.curselection()
        if not selection:
            return
        item = self._sessions_queue_items[selection[0]]
        select_session_queue_item(self._sessions_state, item.id)
        self._sessions_selected_id = item.id
        self._sync_sessions_form_from_item(item)

    def open_selected_session_in_editor(self) -> None:
        item = self._selected_session_item()
        if item is None or not item.level:
            self.footer_var.set("No queue item selected.")
            return
        level = parse_level_dict(json.loads(json.dumps(item.level)))
        source_path = editor_source_path_for_session_item(item)
        self._load_level_into_editor(level, source_path)
        self.footer_var.set(f"Opened session queue item {item.id} in the editor.")

    def open_play_session_in_editor(self) -> None:
        path = self._resolve_repo_path(self.play_session_path_var.get())
        try:
            session = load_play_session_file(path)
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            self.footer_var.set(f"Could not load play session: {exc}")
            return
        level = parse_level_dict(json.loads(json.dumps(session.level)))
        self._load_level_into_editor(level, self._display_path(path))
        self.footer_var.set(f"Opened play session {self._display_path(path)} in the editor.")

    def queue_play_session_to_sessions(self) -> None:
        path = self._resolve_repo_path(self.play_session_path_var.get())
        try:
            session = load_play_session_file(path)
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            self.footer_var.set(f"Could not queue play session: {exc}")
            return
        state = self._sessions_state or self._load_sessions_state()
        self._sessions_state = state
        created = append_play_session_to_sessions_state(
            state,
            session,
            source="native_play_session_import",
            name=path.name,
            saved_path=self._display_path(path),
        )
        self._save_sessions_state()
        self._refresh_sessions_queue_view()
        self.footer_var.set(f"Queued play session {created.file} into the review queue.")

    def queue_editor_level_to_sessions(self) -> None:
        if self.editor_level is None:
            self.footer_var.set("No editor level available to queue.")
            return
        level = self._editor_level_to_level()
        source_path = self.editor_source_path_var.get().strip() or self.level_path_var.get().strip() or "editor_level.json"
        created = self._queue_level_into_sessions(
            level,
            name=Path(source_path).name,
            source="native_editor_queue",
            saved_path=source_path,
        )
        self.footer_var.set(f"Queued editor level {created.file} into the review queue.")

    def queue_inspected_progression_to_sessions(self) -> None:
        if self._current_progression is None:
            self.inspect_progression()
        if self._current_progression is None:
            self.footer_var.set("No inspected progression available.")
            return
        entries: list[tuple[str, dict[str, Any]]] = []
        for slot in self._current_progression.slots:
            if not slot.level_file:
                continue
            level_path = self._resolve_repo_path(slot.level_file)
            if not level_path.exists():
                continue
            try:
                level = load_level_file(level_path)
            except Exception:
                continue
            entries.append((level_path.name, json.loads(serialize_level_to_canonical_json(level, level_path.name))))
        if not entries:
            self.footer_var.set("No progression slots with loadable levels.")
            return
        state = self._sessions_state or self._load_sessions_state()
        self._sessions_state = state
        created = append_generated_levels_to_sessions_state(
            state,
            entries,
            source="native_progression_import",
        )
        self._save_sessions_state()
        self._refresh_sessions_queue_view()
        self.footer_var.set(f"Queued {len(created)} progression slot level(s) into sessions.")

    def validate_selected_session_item(self) -> None:
        item = self._selected_session_item()
        if item is None or not item.level:
            self.footer_var.set("No queue item selected.")
            return
        try:
            level = parse_level_dict(json.loads(json.dumps(item.level)))
        except Exception as exc:
            self.footer_var.set(f"Invalid selected level payload: {exc}")
            return
        report = validate_level_structure(level)
        item.validation_status = "OK" if report.valid else "INVALID"
        item.changed = True
        self._save_sessions_state()
        self._refresh_sessions_queue_view()
        lines = [f"selected_id={item.id}", f"validation_status={item.validation_status}"]
        if report.errors:
            lines.append("errors:")
            lines.extend(f"- {error}" for error in report.errors)
        if report.warnings:
            lines.append("warnings:")
            lines.extend(f"- {warning}" for warning in report.warnings)
        self._set_output(self.sessions_output, "\n".join(lines))
        self.footer_var.set(f"Validated queue item {item.id} as {item.validation_status}.")

    def export_selected_session_item(self) -> None:
        item = self._selected_session_item()
        if item is None or not item.level:
            self.footer_var.set("No queue item selected.")
            return
        export_path = self.session_export_path_var.get().strip() or "output/python_toolkit_checks/session_selected_level.json"
        level = parse_level_dict(json.loads(json.dumps(item.level)))
        payload = serialize_level_to_canonical_json(level, Path(export_path).name)
        result = save_text_file(export_path, payload, self.project_root)
        item.saved_path = export_path
        item.raw["saved_path"] = export_path
        item.changed = True
        self._save_sessions_state()
        self._refresh_sessions_queue_view()
        self.footer_var.set(f"Exported selected session level to {self._display_path(result.path)}.")

    def select_next_pending_session(self) -> None:
        if self._sessions_state is None:
            self._sessions_state = self._load_sessions_state()
        if self._sessions_state is None or not self._sessions_state.queue:
            self.footer_var.set("No queue items available.")
            return
        current_index = self._sessions_queue_selected_index()
        start = current_index + 1 if current_index is not None else 0
        pending_item = None
        for index in range(start, len(self._sessions_queue_items)):
            candidate = self._sessions_queue_items[index]
            if (candidate.review_status or "PENDING").strip().upper() == "PENDING":
                pending_item = candidate
                break
        if pending_item is None:
            for candidate in self._sessions_queue_items[:start]:
                if (candidate.review_status or "PENDING").strip().upper() == "PENDING":
                    pending_item = candidate
                    break
        if pending_item is None:
            self.footer_var.set("No pending session review items left.")
            return
        select_session_queue_item(self._sessions_state, pending_item.id)
        self._sessions_selected_id = pending_item.id
        self._refresh_sessions_queue_view()
        self.footer_var.set(f"Selected next pending session {pending_item.id}.")

    def generate_procedural_level(self) -> None:
        learning = self._load_learning()
        generated = generate_level(
            self.level_number_var.get(),
            learning,
            attempts=self.attempts_var.get(),
        )
        lines = [
            f"level_number={self.level_number_var.get()}",
            f"attempts={generated.attempt_count}",
            f"source={generated.source}",
            "",
            serialize_level_to_canonical_json(
                generated.level,
                f"procedural_level_{self.level_number_var.get()}.json",
            ),
        ]
        self._set_output(self.procedural_output, "\n".join(lines))
        self._load_level_into_editor(generated.level, f"procedural_level_{self.level_number_var.get()}.json")
        self.footer_var.set(f"Generated procedural level {self.level_number_var.get()} and opened it in the editor.")

    def _base_level_for_variants(self) -> tuple[Level, str]:
        if self.editor_level is not None:
            return self._editor_level_to_level(), self.editor_source_path_var.get().strip()
        path = self._resolve_repo_path(self.level_path_var.get())
        return load_level_file(path), self._display_path(path)

    def generate_procedural_variants(self) -> None:
        base_level, base_name = self._base_level_for_variants()
        variants = generate_reference_variants(
            base_level,
            self.project_root,
            base_file_name=Path(base_name or "reference_level.json").name,
            adjustments={
                "pairs": self.variant_pairs_var.get(),
                "blockers": self.variant_blockers_var.get(),
                "board": self.variant_board_var.get(),
            },
            count=int(self.variant_count_var.get()),
            learning_path=self.learning_path_var.get(),
        )
        self._procedural_variants = list(variants)
        self.variants_list.delete(0, self._tk.END)
        for index, variant in enumerate(variants, start=1):
            self.variants_list.insert(
                self._tk.END,
                f"{index}. {variant.name} | {variant.source_kind} | rank={variant.total_rank:.3f} | board={variant.level.cols}x{variant.level.rows} | pairs={len(variant.level.pairs)}",
            )
        payload = [
            {
                "name": item.name,
                "source_kind": item.source_kind,
                "total_rank": item.total_rank,
                "intent": item.reference_intent,
                "level": serialize_level_to_canonical_dict(item.level, item.name),
            }
            for item in variants
        ]
        self._set_output(self.procedural_output, json.dumps(payload, indent=2, ensure_ascii=False))
        self.footer_var.set(f"Generated {len(variants)} procedural variants.")

    def generate_procedural_batch(self) -> None:
        learning = self._load_learning()
        batch = generate_learned_session_batch(
            self.batch_start_var.get(),
            self.batch_end_var.get(),
            self.batch_count_var.get(),
            learning,
        )
        self._procedural_batch = list(batch.levels)
        self._procedural_batch_review = {}
        self._refresh_procedural_batch_view()
        summary = [
            f"start_level={batch.start_level}",
            f"end_level={batch.end_level}",
            f"requested_count={batch.requested_count}",
            f"produced_count={batch.produced_count}",
            f"attempts={batch.attempts}",
            f"source={batch.source}",
            "",
            json.dumps(
                [
                    json.loads(serialize_level_to_canonical_json(level, f"learned_batch_{index + 1:02d}.json"))
                    for index, level in enumerate(self._procedural_batch)
                ],
                indent=2,
                ensure_ascii=False,
            ),
        ]
        self._set_output(self.procedural_output, "\n".join(summary))
        self.footer_var.set(f"Generated learned batch with {len(self._procedural_batch)} levels.")

    def _refresh_procedural_batch_view(self) -> None:
        if not hasattr(self, "procedural_batch_list"):
            return
        self.procedural_batch_list.delete(0, self._tk.END)
        for index, level in enumerate(self._procedural_batch, start=1):
            review = self._procedural_batch_review.get(index - 1) or {}
            status = str(review.get("status") or "pending").strip().lower()
            marker = {
                "pending": "PENDING",
                "kept": "KEPT",
                "discarded": "DISCARDED",
            }.get(status, "PENDING")
            self.procedural_batch_list.insert(
                self._tk.END,
                f"{index}. [{marker}] {level.id or 'procedural_level'} | board={level.cols}x{level.rows} | pairs={len(level.pairs)} | blockers={len(level.blockers)}",
            )

    def _selected_batch_index_level(self) -> tuple[int, Level] | None:
        if not hasattr(self, "procedural_batch_list"):
            return None
        selection = self.procedural_batch_list.curselection()
        if not selection:
            return None
        index = selection[0]
        if index < 0 or index >= len(self._procedural_batch):
            return None
        return index, self._procedural_batch[index]

    def _selected_batch_level(self) -> Level | None:
        selected = self._selected_batch_index_level()
        if selected is None:
            return None
        return selected[1]

    def _on_batch_item_select(self) -> None:
        selected = self._selected_batch_index_level()
        if selected is None:
            return
        index, _level = selected
        review = self._procedural_batch_review.get(index) or {}
        self.batch_output_path_var.set(
            review.get("saved_path")
            or f"output/python_toolkit_checks/learned_batch_{index + 1:02d}.json"
        )
        self.batch_discard_reason_var.set(review.get("reason_code") or "too_easy")
        self.batch_note_var.set(review.get("note") or "")

    def open_selected_batch_item(self) -> None:
        selected = self._selected_batch_index_level()
        if selected is None:
            self.footer_var.set("No batch item selected.")
            return
        index, level = selected
        source_name = normalized_editor_source_name(level.id or "", f"learned_batch_{index + 1:02d}.json")
        self._load_level_into_editor(level, source_name)
        self.footer_var.set(f"Opened batch item {level.id or f'learned_batch_{index + 1:02d}'} in the editor.")

    def keep_selected_batch_item(self) -> None:
        selected = self._selected_batch_index_level()
        if selected is None:
            self.footer_var.set("No batch item selected.")
            return
        index, level = selected
        output_path = (
            self.batch_output_path_var.get().strip()
            or f"output/python_toolkit_checks/learned_batch_{index + 1:02d}.json"
        )
        payload = serialize_level_to_canonical_json(level, Path(output_path).name)
        result = save_text_file(output_path, payload, self.project_root)
        save_learning_record(
            level,
            "approve",
            project_root=self.project_root,
            learning_path=self.learning_path_var.get(),
            context="native_ui_batch_keep",
            extra={"keep_tags": ["native_batch_keep"], "auto_recorded": True},
        )
        self._procedural_batch_review = update_batch_review_state(
            self._procedural_batch_review,
            index,
            status="kept",
            saved_path=output_path,
            note=self.batch_note_var.get(),
        )
        self._refresh_procedural_batch_view()
        self.footer_var.set(f"Kept batch item {index + 1} and saved to {self._display_path(result.path)}.")

    def discard_selected_batch_item(self) -> None:
        selected = self._selected_batch_index_level()
        if selected is None:
            self.footer_var.set("No batch item selected.")
            return
        index, level = selected
        reason = self.batch_discard_reason_var.get().strip() or "too_easy"
        note = self.batch_note_var.get().strip()
        save_learning_record(
            level,
            "reject",
            project_root=self.project_root,
            learning_path=self.learning_path_var.get(),
            context="native_ui_batch_discard",
            extra={
                "reason_code": reason,
                "note_text": note,
                "auto_recorded": True,
            },
        )
        self._procedural_batch_review = update_batch_review_state(
            self._procedural_batch_review,
            index,
            status="discarded",
            reason_code=reason,
            note=note,
        )
        self._refresh_procedural_batch_view()
        self.footer_var.set(f"Discarded batch item {index + 1} and persisted learning feedback.")

    def reset_selected_batch_item_review(self) -> None:
        selected = self._selected_batch_index_level()
        if selected is None:
            self.footer_var.set("No batch item selected.")
            return
        index, _level = selected
        self._procedural_batch_review = update_batch_review_state(
            self._procedural_batch_review,
            index,
            status="pending",
            saved_path="",
            reason_code="",
            note="",
        )
        self._refresh_procedural_batch_view()
        self.footer_var.set(f"Reset review state for batch item {index + 1}.")

    def queue_procedural_batch_to_sessions(self, *, kept_only: bool = False) -> None:
        if not self._procedural_batch:
            self.footer_var.set("No learned batch available to queue.")
            return
        if kept_only:
            indices = [
                index for index in range(len(self._procedural_batch))
                if str((self._procedural_batch_review.get(index) or {}).get("status") or "pending").strip().lower() == "kept"
            ]
        else:
            indices = batch_queueable_indices(len(self._procedural_batch), self._procedural_batch_review)
        if not indices:
            self.footer_var.set("No batch items eligible to queue.")
            return
        state = self._sessions_state or self._load_sessions_state()
        self._sessions_state = state
        created = append_generated_levels_to_sessions_state(
            state,
            [
                (
                    f"learned_batch_{index + 1:02d}.json",
                    json.loads(serialize_level_to_canonical_json(self._procedural_batch[index], f"learned_batch_{index + 1:02d}.json")),
                )
                for index in indices
            ],
            source="native_desktop_batch",
        )
        self._save_sessions_state()
        self._refresh_sessions_queue_view()
        mode = "kept-only" if kept_only else "review-filtered"
        self.footer_var.set(f"Queued {len(created)} learned batch levels into sessions ({mode}).")

    def _selected_variant(self) -> Any | None:
        selection = self.variants_list.curselection()
        if not selection:
            return None
        return self._procedural_variants[selection[0]]

    def open_selected_variant(self) -> None:
        variant = self._selected_variant()
        if variant is None:
            self.footer_var.set("No procedural variant selected.")
            return
        self._load_level_into_editor(
            variant.level,
            normalized_editor_source_name(getattr(variant, "name", ""), "procedural_variant.json"),
        )
        self.footer_var.set(f"Opened variant {variant.name} in the editor.")

    def keep_selected_variant(self) -> None:
        variant = self._selected_variant()
        if variant is None:
            self.footer_var.set("No procedural variant selected.")
            return
        output_path = self.variant_output_path_var.get().strip() or "output/python_toolkit_checks/variant_keep.json"
        payload = serialize_level_to_canonical_json(variant.level, Path(output_path).name)
        save_text_file(output_path, payload, self.project_root)
        save_learning_record(
            variant.level,
            "approve",
            project_root=self.project_root,
            learning_path=self.learning_path_var.get(),
            context="native_ui_variant_keep",
            extra={"keep_tags": ["native_keep"], "auto_recorded": True},
        )
        self.footer_var.set(f"Kept variant {variant.name} and saved it to {output_path}.")

    def discard_selected_variant(self) -> None:
        variant = self._selected_variant()
        if variant is None:
            self.footer_var.set("No procedural variant selected.")
            return
        save_learning_record(
            variant.level,
            "reject",
            project_root=self.project_root,
            learning_path=self.learning_path_var.get(),
            context="native_ui_variant_discard",
            extra={
                "reason_code": self.variant_discard_reason_var.get().strip() or "too_easy",
                "note_text": self.variant_note_var.get().strip(),
                "auto_recorded": True,
            },
        )
        self.footer_var.set(f"Discarded variant {variant.name} and persisted learning feedback.")

    def _refresh_spreadsheet_commands_view(self, status: Any) -> None:
        self._spreadsheet_status = status
        self._spreadsheet_command_specs = list(status.commands)
        self._spreadsheet_command_labels = []
        command_map = {spec.key: spec for spec in self._spreadsheet_command_specs}
        recommendations = recommend_spreadsheet_action_keys(status)
        self.spreadsheet_command_list.delete(0, self._tk.END)
        for spec in self._spreadsheet_command_specs:
            availability = "ready" if spec.available else "blocked"
            label = f"{spec.key} | {spec.label} | {availability}"
            if spec.issues:
                label += f" | {'; '.join(spec.issues)}"
            self._spreadsheet_command_labels.append(spec.key)
            self.spreadsheet_command_list.insert(self._tk.END, label)
        self.spreadsheet_command_combo["values"] = tuple(self._spreadsheet_command_labels)
        current_key = self.sheet_command_var.get().strip()
        if current_key not in command_map:
            current_key = recommendations[0] if recommendations else (self._spreadsheet_command_specs[0].key if self._spreadsheet_command_specs else "check_env")
        self.sheet_command_var.set(current_key)
        self._sync_spreadsheet_command_selection()
        recommended_text = ", ".join(recommendations) if recommendations else "none"
        self.spreadsheet_summary_var.set(
            f"Health {status.health} | ready={'yes' if status.ready else 'no'} | recommended: {recommended_text}"
        )

    def _on_spreadsheet_command_select(self) -> None:
        if not hasattr(self, "spreadsheet_command_list"):
            return
        selection = self.spreadsheet_command_list.curselection()
        if not selection:
            return
        index = selection[0]
        if index < 0 or index >= len(self._spreadsheet_command_labels):
            return
        self.sheet_command_var.set(self._spreadsheet_command_labels[index])

    def _sync_spreadsheet_command_selection(self) -> None:
        if not hasattr(self, "spreadsheet_command_list"):
            return
        key = self.sheet_command_var.get().strip()
        if not key:
            return
        try:
            selected_index = self._spreadsheet_command_labels.index(key)
        except ValueError:
            return
        self.spreadsheet_command_list.selection_clear(0, self._tk.END)
        self.spreadsheet_command_list.selection_set(selected_index)
        self.spreadsheet_command_list.see(selected_index)

    def run_spreadsheet_command_key(self, key: str) -> None:
        self.sheet_command_var.set(key)
        self._sync_spreadsheet_command_selection()
        self.run_spreadsheet()

    def disconnect_spreadsheet_token_action(self) -> None:
        result = disconnect_spreadsheet_token(self.project_root, token_path=self.token_path_var.get())
        self.inspect_spreadsheet()
        self._set_output(
            self.spreadsheet_output,
            "\n".join(
                [
                    f"ok={result.ok}",
                    f"key={result.key}",
                    f"target={result.target}",
                    f"deleted={result.deleted}",
                    result.message,
                ]
            ),
        )
        self.footer_var.set(result.message)

    def clear_spreadsheet_cache_action(self) -> None:
        result = clear_spreadsheet_ui_cache(self.project_root)
        self._set_output(
            self.spreadsheet_output,
            "\n".join(
                [
                    f"ok={result.ok}",
                    f"key={result.key}",
                    f"target={result.target}",
                    f"deleted={result.deleted}",
                    result.message,
                ]
            ),
        )
        self.footer_var.set(result.message)

    def inspect_spreadsheet(self) -> None:
        status = inspect_spreadsheet_status(
            self.project_root,
            credentials_path=self.credentials_path_var.get(),
            token_path=self.token_path_var.get(),
        )
        self._refresh_spreadsheet_commands_view(status)
        self._set_output(self.spreadsheet_output, format_spreadsheet_status(status))
        self.footer_var.set("Spreadsheet status inspected.")

    def run_spreadsheet(self) -> None:
        result = self._run_spreadsheet_command_internal(self.sheet_command_var.get().strip())
        self.footer_var.set(f"Spreadsheet command '{result.key}' finished with ok={result.ok}.")

    def inspect_manager_spreadsheet_workflow(self) -> None:
        selected_key = self.manager_selected_key_var.get().strip() or (self._selected_manager_key() or "")
        filter_value = self.manager_sheet_filter_var.get().strip()
        selected_filter = filter_value or selected_key
        global_plan = inspect_spreadsheet_rename_plan(self.project_root, progression_filter="")
        selected_plan = inspect_spreadsheet_rename_plan(self.project_root, progression_filter=selected_filter) if selected_filter else global_plan
        self._manager_sheet_plan = selected_plan
        self.manager_sheet_summary_var.set(
            "Spreadsheet workflow: "
            f"pending_total={global_plan.pending_count}, "
            f"pending_selected={selected_plan.pending_count}, "
            f"applied={global_plan.applied_count}, "
            f"errors={global_plan.error_count}"
        )
        status = inspect_spreadsheet_status(
            self.project_root,
            credentials_path=self.credentials_path_var.get(),
            token_path=self.token_path_var.get(),
        )
        self._refresh_spreadsheet_commands_view(status)
        lines = [
            self.manager_sheet_summary_var.get(),
            "",
            "== Global rename plan ==",
            format_spreadsheet_rename_plan(global_plan, limit=25),
        ]
        if selected_filter:
            lines.extend(
                [
                    "",
                    f"== Filtered rename plan: {selected_filter} ==",
                    format_spreadsheet_rename_plan(selected_plan, limit=25),
                ]
            )
        self._set_output(self.progression_output, "\n".join(lines))
        self.footer_var.set("Inspected manager spreadsheet workflow.")

    def sync_manager_from_sheet_local(self) -> None:
        result = self._run_spreadsheet_command_internal("sync_local")
        if not result.ok:
            self.footer_var.set("sync_local failed; manager snapshot not refreshed.")
            return
        self.load_manager_snapshot()
        self.inspect_manager_spreadsheet_workflow()
        self.footer_var.set("sync_local completed and manager workflow reloaded.")

    def apply_manager_sheet_renames(self) -> None:
        result = self._run_spreadsheet_command_internal("apply_sheet_renames")
        if not result.ok:
            self.footer_var.set("apply_sheet_renames failed; manager snapshot not refreshed.")
            return
        self.load_manager_snapshot()
        self.inspect_manager_spreadsheet_workflow()
        self.footer_var.set("Applied staged sheet renames and reloaded manager snapshot.")

    def run_manager_sheet_pipeline(self) -> None:
        first = self._run_spreadsheet_command_internal("sync_local")
        if not first.ok:
            self.footer_var.set("Pipeline stopped at sync_local.")
            return
        second = self._run_spreadsheet_command_internal("apply_sheet_renames")
        if not second.ok:
            self.footer_var.set("Pipeline stopped at apply_sheet_renames.")
            return
        self.load_manager_snapshot()
        self.inspect_manager_spreadsheet_workflow()
        self.footer_var.set("Spreadsheet->manager pipeline completed (sync_local + apply_sheet_renames + reload).")

    def run(self) -> int:
        return_code = 0
        self.root.mainloop()
        return return_code


def launch_native_app(
    project_root: Path | None = None,
    *,
    initial_tab: str = "status",
    level_path: str | None = None,
    progression_path: str | None = None,
    pack_folder: str | None = None,
    play_session_path: str | None = None,
    sessions_state_path: str | None = None,
) -> int:
    app = NativeToolkitApp(
        project_root,
        initial_tab=initial_tab,
        level_path=level_path,
        progression_path=progression_path,
        pack_folder=pack_folder,
        play_session_path=play_session_path,
        sessions_state_path=sessions_state_path,
    )
    return app.run()

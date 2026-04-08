#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import shutil
import sqlite3
import threading
import time
import webbrowser
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
import tkinter as tk
from tkinter import filedialog, messagebox


ROOT = Path(__file__).resolve().parents[1]
DB_DIR = ROOT / ".local"
DB_PATH = DB_DIR / "bear_reporting_sync.db"
DEFAULT_TARGET_DIR = ROOT / "output" / "reporting_sync_exports"
AFTER_FEEDBACK_FILES = [
    ROOT / "progressions" / "progressionA_after_feedback.json",
    ROOT / "progressions" / "progressionB_after_feedback.json",
    ROOT / "progressions" / "progressionC_after_feedback.json",
]
MANAGER_LIVE_FILE = ROOT / "progressions" / "manager_progressions_live.json"
PROGRESSION_EDITOR_FILES = AFTER_FEEDBACK_FILES[:]
PREVIEW_MAX_WIDTH = 420
PREVIEW_MAX_HEIGHT = 320


@dataclass
class SyncItem:
    progression: str
    slot: int
    json_path: Path
    screenshot_path: Path | None

    @property
    def json_name(self) -> str:
        return self.json_path.name

    @property
    def screenshot_name(self) -> str:
        return self.screenshot_path.name if self.screenshot_path else ""

    @property
    def source_key(self) -> str:
        try:
            return str(self.json_path.relative_to(ROOT))
        except ValueError:
            return str(self.json_path)

    @property
    def signature(self) -> str:
        stat = self.json_path.stat()
        shot_sig = ""
        if self.screenshot_path and self.screenshot_path.exists():
            shot_stat = self.screenshot_path.stat()
            shot_sig = f"|{shot_stat.st_mtime_ns}:{shot_stat.st_size}"
        return f"{stat.st_mtime_ns}:{stat.st_size}{shot_sig}"


def ensure_db() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS profiles (
            name TEXT PRIMARY KEY,
            source_mode TEXT NOT NULL,
            progression_path TEXT,
            target_mode TEXT NOT NULL,
            target_dir TEXT NOT NULL,
            drive_folder_url TEXT,
            spreadsheet_url TEXT,
            slot_filter TEXT,
            rename_template TEXT,
            rename_find TEXT,
            rename_replace TEXT,
            rename_prefix TEXT,
            rename_suffix TEXT,
            updated_at REAL NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS imported_files (
            profile_name TEXT NOT NULL,
            source_key TEXT NOT NULL,
            signature TEXT NOT NULL,
            target_json_path TEXT,
            target_screenshot_path TEXT,
            imported_at REAL NOT NULL,
            PRIMARY KEY (profile_name, source_key)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rename_presets (
            name TEXT PRIMARY KEY,
            rename_template TEXT,
            rename_find TEXT,
            rename_replace TEXT,
            rename_prefix TEXT,
            rename_suffix TEXT,
            updated_at REAL NOT NULL
        )
        """
    )
    profile_columns = {row[1] for row in conn.execute("PRAGMA table_info(profiles)")}
    for column in ("slot_filter", "rename_template", "rename_find", "rename_replace", "rename_prefix", "rename_suffix"):
        if column not in profile_columns:
            conn.execute(f"ALTER TABLE profiles ADD COLUMN {column} TEXT")
    conn.commit()
    return conn


def slugify(value: str) -> str:
    clean = "".join(ch.lower() if ch.isalnum() else "_" for ch in str(value or "").strip())
    while "__" in clean:
        clean = clean.replace("__", "_")
    return clean.strip("_") or "untitled"


def screenshot_for_json(json_path: Path) -> Path | None:
    shot = ROOT / "levels" / "screenshots" / f"{json_path.stem}.png"
    return shot if shot.exists() else None


def progression_slot_is_tutorial(slot: dict) -> bool:
    slot_num = int(slot.get("slot") or 0)
    return slot_num == 0 or slot.get("status") == "reserved" or slot.get("label") == "TUTORIAL"


def parse_slot_filter(raw_value: str) -> set[int] | None:
    text = raw_value.strip()
    if not text:
        return None
    values: set[int] = set()
    for chunk in text.split(","):
        part = chunk.strip()
        if not part:
            continue
        if "-" in part:
            start_text, end_text = part.split("-", 1)
            start = int(start_text.strip())
            end = int(end_text.strip())
            if start > end:
                start, end = end, start
            values.update(range(start, end + 1))
        else:
            values.add(int(part))
    return values


def read_progression_file(path: Path) -> list[SyncItem]:
    data = json.loads(path.read_text())
    progression = data.get("name") or path.stem
    tutorial = ROOT / (data.get("tutorial_level_file") or "levels/tutorial_level.json")
    items: list[SyncItem] = []
    for slot in data.get("slots", []):
        slot_num = int(slot.get("slot") or 0)
        if progression_slot_is_tutorial(slot):
            json_path = tutorial
        else:
            ref = slot.get("level_file")
            if not ref:
                continue
            json_path = ROOT / ref
        if json_path.exists():
            items.append(SyncItem(progression, slot_num, json_path, screenshot_for_json(json_path)))
    return items


def read_manager_live(path: Path) -> list[SyncItem]:
    data = json.loads(path.read_text())
    items: list[SyncItem] = []
    for key, payload in data.items():
        if not isinstance(payload, dict) or "slots" not in payload:
            continue
        progression = payload.get("name") or key
        tutorial = ROOT / (payload.get("tutorial_level_file") or "levels/tutorial_level.json")
        for slot in payload.get("slots", []):
            slot_num = int(slot.get("slot") or 0)
            if progression_slot_is_tutorial(slot):
                json_path = tutorial
            else:
                ref = slot.get("level_file")
                if not ref:
                    continue
                json_path = ROOT / ref
            if json_path.exists():
                items.append(SyncItem(progression, slot_num, json_path, screenshot_for_json(json_path)))
    return items


def update_progression_references(path: Path, replacements: dict[str, str]) -> bool:
    data = json.loads(path.read_text())
    changed = False
    if isinstance(data, dict):
        tutorial = data.get("tutorial_level_file")
        if isinstance(tutorial, str) and tutorial in replacements:
            data["tutorial_level_file"] = replacements[tutorial]
            changed = True
        for slot in data.get("slots", []):
            level_ref = slot.get("level_file")
            if isinstance(level_ref, str) and level_ref in replacements:
                slot["level_file"] = replacements[level_ref]
                changed = True
        for value in data.values():
            if isinstance(value, dict):
                tutorial = value.get("tutorial_level_file")
                if isinstance(tutorial, str) and tutorial in replacements:
                    value["tutorial_level_file"] = replacements[tutorial]
                    changed = True
                for slot in value.get("slots", []):
                    level_ref = slot.get("level_file")
                    if isinstance(level_ref, str) and level_ref in replacements:
                        slot["level_file"] = replacements[level_ref]
                        changed = True
    if changed:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n")
    return changed


class BearReportingSyncApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Feed the Bear - Reporting Sync")
        self.root.configure(bg="#f3f3f3")
        self.conn = ensure_db()
        self.scan_results: list[dict] = []

        self.profile_var = tk.StringVar(value="default")
        self.new_profile_var = tk.StringVar(value="")
        self.view_mode_var = tk.StringVar(value="user")
        self.progression_choice_var = tk.StringVar(value="")
        self.progression_editor_path_var = tk.StringVar(value="")
        self.source_mode_var = tk.StringVar(value="after_feedback")
        self.progression_path_var = tk.StringVar(value="")
        self.target_mode_var = tk.StringVar(value="local")
        self.target_dir_var = tk.StringVar(value=str(DEFAULT_TARGET_DIR))
        self.drive_folder_url_var = tk.StringVar(value="")
        self.spreadsheet_url_var = tk.StringVar(value="")
        self.slot_filter_var = tk.StringVar(value="")
        self.preset_var = tk.StringVar(value="")
        self.rename_template_var = tk.StringVar(value="")
        self.rename_find_var = tk.StringVar(value="")
        self.rename_replace_var = tk.StringVar(value="")
        self.rename_prefix_var = tk.StringVar(value="")
        self.rename_suffix_var = tk.StringVar(value="")
        self.status_var = tk.StringVar(value="Ready.")
        self.toolkit_text_var = tk.StringVar(value="")
        self.progression_editor_data: dict | None = None
        self.progression_editor_slots: list[dict] = []
        self.progression_preview_image: tk.PhotoImage | None = None
        self.progression_drag_index: int | None = None
        self.current_task_label: str | None = None

        self._build_ui()
        self._reload_profiles()
        self._reload_presets()
        self._load_profile("default")
        self.root.after(100, self.scan)

    def _build_ui(self) -> None:
        self.root.grid_rowconfigure(5, weight=1)
        self.root.grid_columnconfigure(0, weight=1)

        tabs = tk.Frame(self.root, bg="#f3f3f3")
        tabs.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 6))
        tk.Button(tabs, text="User", command=lambda: self._set_view_mode("user"), width=16).pack(side=tk.LEFT, padx=(0, 6))
        tk.Button(tabs, text="Admin", command=lambda: self._set_view_mode("admin"), width=16).pack(side=tk.LEFT)
        tk.Button(tabs, text="Progressions", command=lambda: self._set_view_mode("progressions"), width=16).pack(side=tk.LEFT, padx=(6, 0))

        toolkit = tk.LabelFrame(self.root, text="Toolkit", bg="#f3f3f3", padx=10, pady=8)
        toolkit.grid(row=1, column=0, sticky="ew", padx=10, pady=6)
        tk.Label(
            toolkit,
            textvariable=self.toolkit_text_var,
            justify="left",
            anchor="w",
            bg="#f3f3f3",
            font=("Helvetica", 12),
        ).pack(fill="x")

        self.user_frame = tk.LabelFrame(self.root, text="User", bg="#f3f3f3", padx=8, pady=8)
        self.user_frame.grid(row=2, column=0, sticky="ew", padx=10, pady=6)
        self.user_frame.grid_columnconfigure(1, weight=1)
        tk.Label(self.user_frame, text="What to do here", bg="#f3f3f3", font=("Helvetica", 12, "bold")).grid(row=0, column=0, sticky="w")
        tk.Label(
            self.user_frame,
            text=(
                "Quick flow:\n"
                "1. Pick what you want to read.\n"
                "2. Press Scan to see what will be exported.\n"
                "3. Press Import pending to copy JSON + screenshots.\n"
                "4. Use Force Drive sync when you need Google Sheets to refresh from Drive now."
            ),
            justify="left",
            bg="#f3f3f3",
        ).grid(row=1, column=0, columnspan=3, sticky="w", pady=(0, 8))
        tk.Label(self.user_frame, text="Read from", bg="#f3f3f3").grid(row=2, column=0, sticky="w")
        tk.OptionMenu(self.user_frame, self.source_mode_var, "after_feedback", "manager_live", "custom_progression", command=lambda _v: self._update_source_state()).grid(row=2, column=1, sticky="w", padx=6)
        tk.Label(self.user_frame, text="Custom progression file", bg="#f3f3f3").grid(row=3, column=0, sticky="w")
        self.user_progression_entry = tk.Entry(self.user_frame, textvariable=self.progression_path_var)
        self.user_progression_entry.grid(row=3, column=1, sticky="ew", padx=6)
        self.user_progression_browse = tk.Button(self.user_frame, text="Browse", command=self._browse_progression)
        self.user_progression_browse.grid(row=3, column=2, padx=4)
        tk.Label(self.user_frame, text="Save exports in", bg="#f3f3f3").grid(row=4, column=0, sticky="w")
        tk.Entry(self.user_frame, textvariable=self.target_dir_var).grid(row=4, column=1, sticky="ew", padx=6)
        tk.Button(self.user_frame, text="Browse", command=self._browse_target).grid(row=4, column=2, padx=4)
        tk.Label(self.user_frame, text="Only these slots (optional)", bg="#f3f3f3").grid(row=5, column=0, sticky="w")
        tk.Entry(self.user_frame, textvariable=self.slot_filter_var).grid(row=5, column=1, sticky="ew", padx=6)
        user_actions = tk.Frame(self.user_frame, bg="#f3f3f3")
        user_actions.grid(row=6, column=0, columnspan=3, sticky="w", pady=(8, 0))
        for label, command in [
            ("Scan", self.scan),
            ("Import pending", self.import_pending),
            ("Import selected", lambda: self.import_pending(selected_only=True)),
            ("Force Drive sync", self.force_drive_sync),
            ("Open Drive", lambda: self._open_url(self.drive_folder_url_var.get())),
            ("Open Sheet", lambda: self._open_url(self.spreadsheet_url_var.get())),
        ]:
            tk.Button(user_actions, text=label, command=command).pack(side=tk.LEFT, padx=(0, 6))

        self.admin_frame = tk.LabelFrame(self.root, text="Admin", bg="#f3f3f3", padx=8, pady=8)
        self.admin_frame.grid(row=3, column=0, sticky="ew", padx=10, pady=6)
        self.admin_frame.grid_columnconfigure(0, weight=1)

        self.progressions_frame = tk.LabelFrame(self.root, text="Progressions", bg="#f3f3f3", padx=8, pady=8)
        self.progressions_frame.grid(row=4, column=0, sticky="nsew", padx=10, pady=6)
        self.progressions_frame.grid_columnconfigure(0, weight=1)
        self.progressions_frame.grid_columnconfigure(1, weight=1)
        self.progressions_frame.grid_rowconfigure(2, weight=1)

        prog_top = tk.LabelFrame(self.progressions_frame, text="Choose progression", bg="#f3f3f3", padx=8, pady=8)
        prog_top.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 6))
        prog_top.grid_columnconfigure(1, weight=1)
        tk.Label(
            prog_top,
            text="Use this tab to inspect one progression, preview screenshots and reorganize the slot order.",
            justify="left",
            bg="#f3f3f3",
        ).grid(row=0, column=0, columnspan=5, sticky="w", pady=(0, 8))
        tk.Label(prog_top, text="Known progression", bg="#f3f3f3").grid(row=1, column=0, sticky="w")
        self.progression_choice_menu = tk.OptionMenu(prog_top, self.progression_choice_var, "")
        self.progression_choice_menu.grid(row=1, column=1, sticky="ew", padx=6)
        tk.Button(prog_top, text="Load selected", command=self.load_progression_editor).grid(row=1, column=2, padx=4)
        tk.Button(prog_top, text="Browse...", command=self._browse_progression_editor_file).grid(row=1, column=3, padx=4)
        tk.Label(prog_top, text="Current file", bg="#f3f3f3").grid(row=2, column=0, sticky="w")
        tk.Entry(prog_top, textvariable=self.progression_editor_path_var).grid(row=2, column=1, columnspan=3, sticky="ew", padx=6)

        prog_left = tk.LabelFrame(self.progressions_frame, text="Slots", bg="#f3f3f3", padx=8, pady=8)
        prog_left.grid(row=2, column=0, sticky="nsew", padx=(0, 6))
        prog_left.grid_rowconfigure(1, weight=1)
        prog_left.grid_columnconfigure(0, weight=1)
        tk.Label(
            prog_left,
            text="Select a slot to preview it. Drag and drop to reorder, or use Move up / Move down. Save progression writes the new order back to the JSON file.",
            justify="left",
            bg="#f3f3f3",
        ).grid(row=0, column=0, sticky="w", pady=(0, 8))
        self.progression_listbox = tk.Listbox(prog_left, font=("Menlo", 11), activestyle="none", exportselection=False)
        self.progression_listbox.grid(row=1, column=0, sticky="nsew")
        self.progression_listbox.bind("<<ListboxSelect>>", lambda _e: self._update_progression_preview())
        self.progression_listbox.bind("<ButtonPress-1>", self._start_progression_drag)
        self.progression_listbox.bind("<B1-Motion>", self._drag_progression_slot)
        self.progression_listbox.bind("<ButtonRelease-1>", self._end_progression_drag)
        prog_scroll = tk.Scrollbar(prog_left, orient=tk.VERTICAL, command=self.progression_listbox.yview)
        prog_scroll.grid(row=1, column=1, sticky="ns")
        self.progression_listbox.configure(yscrollcommand=prog_scroll.set)
        prog_buttons = tk.Frame(prog_left, bg="#f3f3f3")
        prog_buttons.grid(row=2, column=0, sticky="w", pady=(8, 0))
        tk.Button(prog_buttons, text="Add level JSONs...", command=self._add_progression_levels).pack(side=tk.LEFT, padx=(0, 6))
        tk.Button(prog_buttons, text="Remove selected", command=self._remove_progression_slot).pack(side=tk.LEFT, padx=(0, 6))
        tk.Button(prog_buttons, text="Move up", command=lambda: self._move_progression_slot(-1)).pack(side=tk.LEFT, padx=(0, 6))
        tk.Button(prog_buttons, text="Move down", command=lambda: self._move_progression_slot(1)).pack(side=tk.LEFT, padx=(0, 6))
        tk.Button(prog_buttons, text="Save progression", command=self.save_progression_editor).pack(side=tk.LEFT, padx=(0, 6))
        tk.Button(prog_buttons, text="Reload", command=self.load_progression_editor).pack(side=tk.LEFT)

        prog_right = tk.LabelFrame(self.progressions_frame, text="Preview", bg="#f3f3f3", padx=8, pady=8)
        prog_right.grid(row=2, column=1, sticky="nsew")
        prog_right.grid_columnconfigure(0, weight=1)
        self.progression_preview_title = tk.Label(prog_right, text="No slot selected", bg="#f3f3f3", font=("Helvetica", 12, "bold"))
        self.progression_preview_title.grid(row=0, column=0, sticky="w")
        self.progression_preview_meta = tk.Label(prog_right, text="", bg="#f3f3f3", justify="left", anchor="w")
        self.progression_preview_meta.grid(row=1, column=0, sticky="w", pady=(4, 8))
        self.progression_preview_canvas = tk.Canvas(
            prog_right,
            width=PREVIEW_MAX_WIDTH,
            height=PREVIEW_MAX_HEIGHT,
            bg="#d9d9d9",
            highlightthickness=1,
            highlightbackground="#8a8a8a",
        )
        self.progression_preview_canvas.grid(row=2, column=0, sticky="w")

        profile = tk.LabelFrame(self.admin_frame, text="Profiles", bg="#f3f3f3", padx=8, pady=8)
        profile.grid(row=0, column=0, sticky="ew", pady=(0, 6))
        profile.grid_columnconfigure(1, weight=1)
        tk.Label(profile, text="Current profile", bg="#f3f3f3").grid(row=0, column=0, sticky="w")
        self.profile_menu = tk.OptionMenu(profile, self.profile_var, "default")
        self.profile_menu.grid(row=0, column=1, sticky="ew", padx=6)
        tk.Button(profile, text="Load", command=lambda: self._load_profile(self.profile_var.get())).grid(row=0, column=2, padx=4)
        tk.Button(profile, text="Save current", command=self._save_profile).grid(row=0, column=3, padx=4)
        tk.Button(profile, text="Delete", command=self._delete_profile).grid(row=0, column=4, padx=4)
        tk.Label(profile, text="New profile name", bg="#f3f3f3").grid(row=1, column=0, sticky="w")
        tk.Entry(profile, textvariable=self.new_profile_var).grid(row=1, column=1, sticky="ew", padx=6)
        tk.Button(profile, text="Create new profile", command=self._create_profile).grid(row=1, column=2, columnspan=2, padx=4, sticky="w")
        tk.Label(
            profile,
            text="Use profiles to save a full setup: source, destination, URLs, slot filter and rename rules.",
            justify="left",
            bg="#f3f3f3",
        ).grid(row=2, column=0, columnspan=5, sticky="w", pady=(6, 0))

        source = tk.LabelFrame(self.admin_frame, text="Source + Target", bg="#f3f3f3", padx=8, pady=8)
        source.grid(row=1, column=0, sticky="ew", pady=(0, 6))
        source.grid_columnconfigure(1, weight=1)
        tk.Label(source, text="Source mode", bg="#f3f3f3").grid(row=0, column=0, sticky="w")
        tk.OptionMenu(source, self.source_mode_var, "after_feedback", "manager_live", "custom_progression", command=lambda _v: self._update_source_state()).grid(row=0, column=1, sticky="w", padx=6)
        tk.Label(source, text="Progression file", bg="#f3f3f3").grid(row=1, column=0, sticky="w")
        self.progression_entry = tk.Entry(source, textvariable=self.progression_path_var)
        self.progression_entry.grid(row=1, column=1, sticky="ew", padx=6)
        self.progression_browse = tk.Button(source, text="Browse", command=self._browse_progression)
        self.progression_browse.grid(row=1, column=2, padx=4)
        tk.Label(source, text="Target mode", bg="#f3f3f3").grid(row=2, column=0, sticky="w")
        tk.OptionMenu(source, self.target_mode_var, "local", "drive_synced").grid(row=2, column=1, sticky="w", padx=6)
        tk.Label(source, text="Target folder", bg="#f3f3f3").grid(row=3, column=0, sticky="w")
        tk.Entry(source, textvariable=self.target_dir_var).grid(row=3, column=1, sticky="ew", padx=6)
        tk.Button(source, text="Browse", command=self._browse_target).grid(row=3, column=2, padx=4)
        tk.Label(source, text="Drive URL", bg="#f3f3f3").grid(row=4, column=0, sticky="w")
        tk.Entry(source, textvariable=self.drive_folder_url_var).grid(row=4, column=1, sticky="ew", padx=6)
        tk.Button(source, text="Open Drive", command=lambda: self._open_url(self.drive_folder_url_var.get())).grid(row=4, column=2, padx=4)
        tk.Label(source, text="Sheet URL", bg="#f3f3f3").grid(row=5, column=0, sticky="w")
        tk.Entry(source, textvariable=self.spreadsheet_url_var).grid(row=5, column=1, sticky="ew", padx=6)
        tk.Button(source, text="Open Sheet", command=lambda: self._open_url(self.spreadsheet_url_var.get())).grid(row=5, column=2, padx=4)

        rename = tk.LabelFrame(self.admin_frame, text="Rename toolkit", bg="#f3f3f3", padx=8, pady=8)
        rename.grid(row=2, column=0, sticky="ew", pady=(0, 6))
        rename.grid_columnconfigure(1, weight=1)
        rename.grid_columnconfigure(3, weight=1)
        tk.Label(
            rename,
            text="Use one of these approaches:\n- Template: full naming pattern.\n- Find/Replace: small cleanup.\n- Prefix/Suffix: add markers.\nTemplate wins if it is filled.",
            justify="left",
            bg="#f3f3f3",
        ).grid(row=0, column=0, columnspan=5, sticky="w", pady=(0, 8))
        tk.Label(rename, text="Preset", bg="#f3f3f3").grid(row=1, column=0, sticky="w")
        self.preset_menu = tk.OptionMenu(rename, self.preset_var, "")
        self.preset_menu.grid(row=1, column=1, sticky="w", padx=6)
        tk.Button(rename, text="Load", command=lambda: self._apply_preset(self.preset_var.get())).grid(row=1, column=2, padx=4)
        tk.Button(rename, text="Save preset", command=self._save_preset).grid(row=1, column=3, padx=4)
        tk.Button(rename, text="Delete preset", command=self._delete_preset).grid(row=1, column=4, padx=4)
        tk.Label(rename, text="Slots", bg="#f3f3f3").grid(row=2, column=0, sticky="w")
        tk.Entry(rename, textvariable=self.slot_filter_var).grid(row=2, column=1, sticky="ew", padx=6)
        tk.Label(rename, text="Template", bg="#f3f3f3").grid(row=2, column=2, sticky="w")
        tk.Entry(rename, textvariable=self.rename_template_var).grid(row=2, column=3, sticky="ew", padx=6)
        tk.Label(rename, text="Find", bg="#f3f3f3").grid(row=3, column=0, sticky="w")
        tk.Entry(rename, textvariable=self.rename_find_var).grid(row=3, column=1, sticky="ew", padx=6)
        tk.Label(rename, text="Replace", bg="#f3f3f3").grid(row=3, column=2, sticky="w")
        tk.Entry(rename, textvariable=self.rename_replace_var).grid(row=3, column=3, sticky="ew", padx=6)
        tk.Label(rename, text="Prefix", bg="#f3f3f3").grid(row=4, column=0, sticky="w")
        tk.Entry(rename, textvariable=self.rename_prefix_var).grid(row=4, column=1, sticky="ew", padx=6)
        tk.Label(rename, text="Suffix", bg="#f3f3f3").grid(row=4, column=2, sticky="w")
        tk.Entry(rename, textvariable=self.rename_suffix_var).grid(row=4, column=3, sticky="ew", padx=6)
        tk.Label(
            rename,
            text="Example template: {progression}_slot_{slot}_{stem}",
            justify="left",
            bg="#f3f3f3",
        ).grid(row=5, column=0, columnspan=5, sticky="w", pady=(6, 0))

        actions = tk.LabelFrame(self.admin_frame, text="Admin actions", bg="#f3f3f3", padx=8, pady=8)
        actions.grid(row=3, column=0, sticky="ew")
        tk.Label(
            actions,
            text="Scan reads the source. Import writes exports. Rename source changes original level files. Rename folder applies the rule to a chosen folder.",
            justify="left",
            bg="#f3f3f3",
        ).pack(anchor="w", pady=(0, 8))
        row = tk.Frame(actions, bg="#f3f3f3")
        row.pack(anchor="w")
        for label, command in [
            ("Scan", self.scan),
            ("Import pending", self.import_pending),
            ("Import selected", lambda: self.import_pending(selected_only=True)),
            ("Rename source selected", lambda: self.rename_source_files(selected_only=True)),
            ("Rename source all", lambda: self.rename_source_files(selected_only=False)),
            ("Rename folder...", self.rename_folder_files),
        ]:
            tk.Button(row, text=label, command=command).pack(side=tk.LEFT, padx=(0, 6))

        table_frame = tk.Frame(self.root, bg="#f3f3f3")
        table_frame.grid(row=5, column=0, sticky="nsew", padx=10, pady=6)
        table_frame.grid_rowconfigure(1, weight=1)
        table_frame.grid_columnconfigure(0, weight=1)
        header = "STATE | PROGRESSION | SLOT | JSON | SHOT | TARGET JSON | TARGET SHOT | LAST IMPORT"
        tk.Label(table_frame, text=header, bg="#ddd", anchor="w", font=("Menlo", 11, "bold")).grid(row=0, column=0, sticky="ew")
        self.listbox = tk.Listbox(
            table_frame,
            selectmode=tk.EXTENDED,
            font=("Menlo", 11),
            activestyle="none",
        )
        self.listbox.grid(row=1, column=0, sticky="nsew")
        scroll = tk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.listbox.yview)
        scroll.grid(row=1, column=1, sticky="ns")
        self.listbox.configure(yscrollcommand=scroll.set)

        status = tk.Label(self.root, textvariable=self.status_var, bg="#f3f3f3", anchor="w")
        status.grid(row=6, column=0, sticky="ew", padx=10, pady=(0, 10))

        self._set_view_mode("user")
        self._update_source_state()

    def _query(self, sql: str, params: tuple = ()) -> list[tuple]:
        return self.conn.execute(sql, params).fetchall()

    def _set_option_menu_values(self, menu_button: tk.OptionMenu, variable: tk.StringVar, values: list[str]) -> None:
        menu = menu_button["menu"]
        menu.delete(0, "end")
        for value in values:
            menu.add_command(label=value, command=lambda v=value: variable.set(v))

    def _reload_profiles(self) -> None:
        names = [row[0] for row in self._query("SELECT name FROM profiles ORDER BY name")]
        if "default" not in names:
            names.insert(0, "default")
        self._set_option_menu_values(self.profile_menu, self.profile_var, names)
        self._reload_progression_choices()

    def _set_view_mode(self, mode: str) -> None:
        self.view_mode_var.set(mode)
        if mode == "admin":
            self.user_frame.grid_remove()
            self.progressions_frame.grid_remove()
            self.admin_frame.grid()
        elif mode == "progressions":
            self.user_frame.grid_remove()
            self.admin_frame.grid_remove()
            self.progressions_frame.grid()
        else:
            self.admin_frame.grid_remove()
            self.progressions_frame.grid_remove()
            self.user_frame.grid()
        self.toolkit_text_var.set(self._toolkit_text(mode))

    def _toolkit_text(self, mode: str) -> str:
        if mode == "admin":
            return (
                "Admin mode:\n"
                "1. Create or load a profile to save a full setup.\n"
                "2. Configure source, target, Drive URL and Sheet URL.\n"
                "3. Use Rename toolkit only if you want to change export names or source filenames.\n"
                "4. Scan first, then import or rename.\n"
                "5. Use source rename carefully: it changes original level files."
            )
        if mode == "progressions":
            return (
                "Progressions mode:\n"
                "1. Load one progression file.\n"
                "2. Select a slot to inspect its JSON and screenshot.\n"
                "3. Move slots up or down to reorganize the order.\n"
                "4. Save progression to write the new slot order back to the progression JSON."
            )
        return (
            "User mode:\n"
            "1. Pick what to read.\n"
            "2. Press Scan.\n"
            "3. Press Import pending to copy files.\n"
            "4. Press Force Drive sync to refresh the Google Sheet from Drive right now."
        )

    def _run_command_async(self, label: str, command: list[str], on_success=None) -> None:
        if self.current_task_label:
            messagebox.showinfo("Busy", f"Wait until '{self.current_task_label}' finishes.")
            return
        self.current_task_label = label
        self.status_var.set(f"{label}...")

        def worker() -> None:
            try:
                result = subprocess.run(
                    command,
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    check=True,
                )
                stdout = (result.stdout or "").strip()
                payload = None
                if stdout:
                    try:
                        payload = json.loads(stdout)
                    except json.JSONDecodeError:
                        payload = {"raw": stdout}
                def done() -> None:
                    self.current_task_label = None
                    if on_success:
                        on_success(payload or {})
                    else:
                        self.status_var.set(f"{label} completed.")
                self.root.after(0, done)
            except subprocess.CalledProcessError as err:
                stdout = (err.stdout or "").strip()
                stderr = (err.stderr or "").strip()
                detail = stderr or stdout or str(err)
                def fail() -> None:
                    self.current_task_label = None
                    self.status_var.set(f"{label} failed.")
                    messagebox.showerror(label, detail)
                self.root.after(0, fail)

        threading.Thread(target=worker, daemon=True).start()

    def force_drive_sync(self) -> None:
        def on_success(payload: dict) -> None:
            tabs = payload.get("tabs") or []
            summary = ", ".join(tabs) if tabs else "No tabs updated"
            self.status_var.set(f"Drive sync completed. Updated: {summary}")
        self._run_command_async(
            "Force Drive sync",
            ["node", "scripts/sync_drive_folder_image_sheets.mjs"],
            on_success=on_success,
        )

    def _reload_presets(self) -> None:
        names = [row[0] for row in self._query("SELECT name FROM rename_presets ORDER BY name")]
        self._set_option_menu_values(self.preset_menu, self.preset_var, names or [""])

    def _reload_progression_choices(self) -> None:
        values = [str(path) for path in PROGRESSION_EDITOR_FILES if path.exists()]
        custom = self.progression_path_var.get().strip()
        if custom:
            custom_path = Path(custom)
            if not custom_path.is_absolute():
                custom_path = ROOT / custom_path
            if custom_path.exists():
                values.append(str(custom_path))
        if not values:
            values = [""]
        self._set_option_menu_values(self.progression_choice_menu, self.progression_choice_var, values)
        if not self.progression_choice_var.get().strip():
            self.progression_choice_var.set(values[0])

    def _apply_preset(self, name: str) -> None:
        rows = self._query(
            "SELECT rename_template, rename_find, rename_replace, rename_prefix, rename_suffix FROM rename_presets WHERE name = ?",
            ((name or "").strip(),),
        )
        if not rows:
            return
        template, find, replace, prefix, suffix = rows[0]
        self.rename_template_var.set(template or "")
        self.rename_find_var.set(find or "")
        self.rename_replace_var.set(replace or "")
        self.rename_prefix_var.set(prefix or "")
        self.rename_suffix_var.set(suffix or "")
        self.status_var.set(f"Preset loaded: {name}")

    def _save_preset(self) -> None:
        name = (self.preset_var.get() or "").strip()
        if not name:
            messagebox.showinfo("Preset", "Write a preset name first.")
            return
        self.conn.execute(
            """
            INSERT INTO rename_presets (name, rename_template, rename_find, rename_replace, rename_prefix, rename_suffix, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
              rename_template = excluded.rename_template,
              rename_find = excluded.rename_find,
              rename_replace = excluded.rename_replace,
              rename_prefix = excluded.rename_prefix,
              rename_suffix = excluded.rename_suffix,
              updated_at = excluded.updated_at
            """,
            (
                name,
                self.rename_template_var.get(),
                self.rename_find_var.get(),
                self.rename_replace_var.get(),
                self.rename_prefix_var.get(),
                self.rename_suffix_var.get(),
                time.time(),
            ),
        )
        self.conn.commit()
        self._reload_presets()
        self.preset_var.set(name)
        self.status_var.set(f"Preset saved: {name}")

    def _delete_preset(self) -> None:
        name = (self.preset_var.get() or "").strip()
        if not name:
            return
        self.conn.execute("DELETE FROM rename_presets WHERE name = ?", (name,))
        self.conn.commit()
        self._reload_presets()
        self.preset_var.set("")

    def _create_profile(self) -> None:
        name = (self.new_profile_var.get() or "").strip()
        if not name:
            messagebox.showinfo("Profile", "Write a new profile name first.")
            return
        self.profile_var.set(name)
        self._save_profile()
        self.new_profile_var.set("")

    def _load_profile(self, name: str) -> None:
        rows = self._query(
            """
            SELECT source_mode, progression_path, target_mode, target_dir, drive_folder_url, spreadsheet_url,
                   slot_filter, rename_template, rename_find, rename_replace, rename_prefix, rename_suffix
            FROM profiles WHERE name = ?
            """,
            ((name or "default").strip(),),
        )
        if rows:
            source_mode, progression_path, target_mode, target_dir, drive_url, sheet_url, slot_filter, rename_template, rename_find, rename_replace, rename_prefix, rename_suffix = rows[0]
            self.source_mode_var.set(source_mode)
            self.progression_path_var.set(progression_path or "")
            self.target_mode_var.set(target_mode)
            self.target_dir_var.set(target_dir)
            self.drive_folder_url_var.set(drive_url or "")
            self.spreadsheet_url_var.set(sheet_url or "")
            self.slot_filter_var.set(slot_filter or "")
            self.rename_template_var.set(rename_template or "")
            self.rename_find_var.set(rename_find or "")
            self.rename_replace_var.set(rename_replace or "")
            self.rename_prefix_var.set(rename_prefix or "")
            self.rename_suffix_var.set(rename_suffix or "")
        else:
            self.source_mode_var.set("after_feedback")
            self.progression_path_var.set("")
            self.target_mode_var.set("local")
            self.target_dir_var.set(str(DEFAULT_TARGET_DIR))
            self.drive_folder_url_var.set("")
            self.spreadsheet_url_var.set("")
            self.slot_filter_var.set("")
            self.rename_template_var.set("")
            self.rename_find_var.set("")
            self.rename_replace_var.set("")
            self.rename_prefix_var.set("")
            self.rename_suffix_var.set("")
        self._reload_progression_choices()
        self._update_source_state()
        self.status_var.set(f"Profile loaded: {name}")

    def _save_profile(self) -> None:
        name = (self.profile_var.get() or "default").strip() or "default"
        self.conn.execute(
            """
            INSERT INTO profiles (
              name, source_mode, progression_path, target_mode, target_dir, drive_folder_url, spreadsheet_url,
              slot_filter, rename_template, rename_find, rename_replace, rename_prefix, rename_suffix, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
              source_mode = excluded.source_mode,
              progression_path = excluded.progression_path,
              target_mode = excluded.target_mode,
              target_dir = excluded.target_dir,
              drive_folder_url = excluded.drive_folder_url,
              spreadsheet_url = excluded.spreadsheet_url,
              slot_filter = excluded.slot_filter,
              rename_template = excluded.rename_template,
              rename_find = excluded.rename_find,
              rename_replace = excluded.rename_replace,
              rename_prefix = excluded.rename_prefix,
              rename_suffix = excluded.rename_suffix,
              updated_at = excluded.updated_at
            """,
            (
                name,
                self.source_mode_var.get(),
                self.progression_path_var.get().strip(),
                self.target_mode_var.get(),
                self.target_dir_var.get().strip(),
                self.drive_folder_url_var.get().strip(),
                self.spreadsheet_url_var.get().strip(),
                self.slot_filter_var.get().strip(),
                self.rename_template_var.get(),
                self.rename_find_var.get(),
                self.rename_replace_var.get(),
                self.rename_prefix_var.get(),
                self.rename_suffix_var.get(),
                time.time(),
            ),
        )
        self.conn.commit()
        self._reload_profiles()
        self.profile_var.set(name)
        self.status_var.set(f"Profile saved: {name}")

    def _delete_profile(self) -> None:
        name = (self.profile_var.get() or "").strip()
        if not name or name == "default":
            return
        self.conn.execute("DELETE FROM profiles WHERE name = ?", (name,))
        self.conn.execute("DELETE FROM imported_files WHERE profile_name = ?", (name,))
        self.conn.commit()
        self.profile_var.set("default")
        self._reload_profiles()
        self._load_profile("default")

    def _browse_progression(self) -> None:
        selected = filedialog.askopenfilename(initialdir=str(ROOT / "progressions"), filetypes=[("JSON", "*.json")])
        if selected:
            self.progression_path_var.set(selected)
            self._reload_progression_choices()

    def _browse_target(self) -> None:
        selected = filedialog.askdirectory(initialdir=self.target_dir_var.get() or str(ROOT))
        if selected:
            self.target_dir_var.set(selected)

    def _open_url(self, url: str) -> None:
        if (url or "").strip():
            webbrowser.open(url.strip())

    def _browse_progression_editor_file(self) -> None:
        selected = filedialog.askopenfilename(initialdir=str(ROOT / "progressions"), filetypes=[("JSON", "*.json")])
        if selected:
            self.progression_choice_var.set(selected)
            self.load_progression_editor()

    def _update_source_state(self) -> None:
        custom = self.source_mode_var.get() == "custom_progression"
        state = "normal" if custom else "disabled"
        for widget in (self.progression_entry, self.progression_browse, self.user_progression_entry, self.user_progression_browse):
            widget.configure(state=state)

    def _load_source_items(self) -> list[SyncItem]:
        mode = self.source_mode_var.get()
        if mode == "after_feedback":
            items: list[SyncItem] = []
            for path in AFTER_FEEDBACK_FILES:
                if path.exists():
                    items.extend(read_progression_file(path))
            return items
        if mode == "manager_live":
            return read_manager_live(MANAGER_LIVE_FILE)
        path = Path(self.progression_path_var.get().strip())
        if not path:
            raise FileNotFoundError("Choose a progression JSON first.")
        if not path.is_absolute():
            path = ROOT / path
        return read_progression_file(path)

    def _progression_editor_path(self) -> Path | None:
        raw = (self.progression_choice_var.get() or self.progression_editor_path_var.get()).strip()
        if not raw:
            return None
        path = Path(raw)
        if not path.is_absolute():
            path = ROOT / path
        return path

    def _source_reference_files(self) -> list[Path]:
        mode = self.source_mode_var.get()
        if mode == "after_feedback":
            return [path for path in AFTER_FEEDBACK_FILES if path.exists()]
        if mode == "custom_progression":
            path = Path(self.progression_path_var.get().strip())
            if path and not path.is_absolute():
                path = ROOT / path
            return [path] if path and path.exists() else []
        return []

    def _filtered_rows(self, rows: Iterable[dict]) -> list[dict]:
        raw_filter = self.slot_filter_var.get().strip()
        if not raw_filter:
            return list(rows)
        try:
            allowed = parse_slot_filter(raw_filter)
        except Exception as err:
            messagebox.showerror("Invalid slot filter", f"Use values like 2,4,7-10.\n\nError: {err}")
            self.status_var.set("Invalid slot filter.")
            return []
        return [row for row in rows if row["item"].slot in (allowed or set())]

    def _selected_scan_rows(self, selected_only: bool) -> list[dict]:
        if not self.scan_results:
            self.scan()
        if not selected_only:
            return self._filtered_rows(self.scan_results)
        selected_indices = set(self.listbox.curselection())
        if not selected_indices:
            messagebox.showinfo("Select rows", "Select one or more rows first.")
            return []
        return self._filtered_rows([row for index, row in enumerate(self.scan_results) if index in selected_indices])

    def _renamed_name(self, item: SyncItem, file_name: str) -> str:
        path = Path(file_name)
        stem = path.stem
        template = self.rename_template_var.get().strip()
        if template:
            try:
                stem = template.format(progression=slugify(item.progression), slot=item.slot, stem=stem)
            except Exception as err:
                raise ValueError(
                    "Invalid template. Use only {progression}, {slot}, {stem}."
                ) from err
        else:
            find = self.rename_find_var.get()
            if find:
                stem = stem.replace(find, self.rename_replace_var.get())
            stem = f"{self.rename_prefix_var.get()}{stem}{self.rename_suffix_var.get()}".strip() or path.stem
        return f"{stem}{path.suffix}"

    def _target_json_path(self, item: SyncItem) -> str:
        base = Path(self.target_dir_var.get().strip() or DEFAULT_TARGET_DIR)
        return str(base / slugify(item.progression) / "jsons" / self._renamed_name(item, item.json_name))

    def _target_screenshot_path(self, item: SyncItem) -> str:
        base = Path(self.target_dir_var.get().strip() or DEFAULT_TARGET_DIR)
        shot_name = item.screenshot_name or f"{item.json_path.stem}.png"
        return str(base / slugify(item.progression) / "screenshots" / self._renamed_name(item, shot_name))

    def load_progression_editor(self) -> None:
        path = self._progression_editor_path()
        if not path or not path.exists():
            messagebox.showinfo("Progression", "Choose a progression JSON file first.")
            return
        data = json.loads(path.read_text())
        if "slots" not in data:
            messagebox.showinfo("Progression", "This view supports direct progression files with a top-level slots array.")
            return
        self.progression_editor_data = data
        self.progression_editor_slots = list(data.get("slots", []))
        self.progression_editor_path_var.set(str(path))
        self.progression_choice_var.set(str(path))
        self._render_progression_editor()
        self.status_var.set(f"Loaded progression editor: {path.name}")

    def _render_progression_editor(self) -> None:
        if not self.progression_editor_data:
            return
        path = Path(self.progression_editor_path_var.get())
        self.progression_listbox.delete(0, tk.END)
        name = self.progression_editor_data.get("name") or path.stem
        tutorial_ref = self.progression_editor_data.get("tutorial_level_file") or "levels/tutorial_level.json"
        for slot in self.progression_editor_slots:
            slot_num = int(slot.get("slot") or 0)
            if progression_slot_is_tutorial(slot):
                level_ref = tutorial_ref
            else:
                level_ref = slot.get("level_file") or "-"
            self.progression_listbox.insert(tk.END, f"Slot {slot_num:>2} | {Path(level_ref).name}")
        self.progression_preview_title.configure(text=f"{name}")
        self.progression_preview_meta.configure(text=f"File: {path}")
        if self.progression_editor_slots:
            self.progression_listbox.selection_clear(0, tk.END)
            self.progression_listbox.selection_set(0)
            self._update_progression_preview()

    def _progression_item_for_slot(self, slot: dict) -> SyncItem:
        assert self.progression_editor_data is not None
        path = Path(self.progression_editor_path_var.get())
        progression_name = self.progression_editor_data.get("name") or path.stem
        tutorial_ref = self.progression_editor_data.get("tutorial_level_file") or "levels/tutorial_level.json"
        slot_num = int(slot.get("slot") or 0)
        if progression_slot_is_tutorial(slot):
            json_path = ROOT / tutorial_ref
        else:
            json_path = ROOT / (slot.get("level_file") or tutorial_ref)
        return SyncItem(progression_name, slot_num, json_path, screenshot_for_json(json_path))

    def _update_progression_preview(self) -> None:
        if not self.progression_editor_slots:
            return
        selected = self.progression_listbox.curselection()
        if not selected:
            return
        index = selected[0]
        slot = self.progression_editor_slots[index]
        item = self._progression_item_for_slot(slot)
        self.progression_preview_title.configure(text=f"Slot {item.slot} | {item.json_name}")
        self.progression_preview_meta.configure(
            text=f"Progression: {item.progression}\nJSON: {item.json_path}\nScreenshot: {item.screenshot_path or 'None'}"
        )
        self.progression_preview_canvas.delete("all")
        self.progression_preview_image = None
        if item.screenshot_path and item.screenshot_path.exists():
            try:
                image = tk.PhotoImage(file=str(item.screenshot_path))
                shrink = max(
                    (image.width() + PREVIEW_MAX_WIDTH - 1) // PREVIEW_MAX_WIDTH,
                    (image.height() + PREVIEW_MAX_HEIGHT - 1) // PREVIEW_MAX_HEIGHT,
                    1,
                )
                if shrink > 1:
                    image = image.subsample(shrink, shrink)
                self.progression_preview_image = image
                self.progression_preview_canvas.create_image(
                    PREVIEW_MAX_WIDTH // 2,
                    PREVIEW_MAX_HEIGHT // 2,
                    image=image,
                    anchor="center",
                )
            except Exception:
                self.progression_preview_canvas.create_text(
                    PREVIEW_MAX_WIDTH // 2,
                    PREVIEW_MAX_HEIGHT // 2,
                    text=f"Preview failed:\n{item.screenshot_path.name}",
                    justify="center",
                )
        else:
            self.progression_preview_canvas.create_text(
                PREVIEW_MAX_WIDTH // 2,
                PREVIEW_MAX_HEIGHT // 2,
                text="No screenshot",
                justify="center",
            )

    def _reindex_progression_slots(self) -> None:
        for pos, slot in enumerate(self.progression_editor_slots):
            if pos == 0 and progression_slot_is_tutorial(slot):
                slot["slot"] = 0
                slot["status"] = "reserved"
                slot["label"] = "TUTORIAL"
            else:
                slot["slot"] = pos
        if self.progression_editor_data is not None:
            self.progression_editor_data["slots"] = self.progression_editor_slots

    def _start_progression_drag(self, event: tk.Event) -> None:
        if not self.progression_editor_slots:
            return
        index = self.progression_listbox.nearest(event.y)
        if index <= 0:
            self.progression_drag_index = None
            return
        self.progression_drag_index = index

    def _drag_progression_slot(self, event: tk.Event) -> None:
        if self.progression_drag_index is None:
            return
        target = self.progression_listbox.nearest(event.y)
        if target <= 0 or target >= len(self.progression_editor_slots):
            return
        if target == self.progression_drag_index:
            return
        item = self.progression_editor_slots.pop(self.progression_drag_index)
        self.progression_editor_slots.insert(target, item)
        self._reindex_progression_slots()
        self._render_progression_editor()
        self.progression_drag_index = target
        self.progression_listbox.selection_clear(0, tk.END)
        self.progression_listbox.selection_set(target)
        self._update_progression_preview()

    def _end_progression_drag(self, _event: tk.Event) -> None:
        self.progression_drag_index = None

    def _move_progression_slot(self, direction: int) -> None:
        if not self.progression_editor_slots:
            return
        selected = self.progression_listbox.curselection()
        if not selected:
            messagebox.showinfo("Progression", "Select a slot first.")
            return
        index = selected[0]
        target = index + direction
        if target < 0 or target >= len(self.progression_editor_slots):
            return
        if index == 0 or target == 0:
            messagebox.showinfo("Progression", "Tutorial slot stays at the top.")
            return
        self.progression_editor_slots[index], self.progression_editor_slots[target] = self.progression_editor_slots[target], self.progression_editor_slots[index]
        self._reindex_progression_slots()
        self._render_progression_editor()
        self.progression_listbox.selection_clear(0, tk.END)
        self.progression_listbox.selection_set(target)
        self._update_progression_preview()

    def _add_progression_levels(self) -> None:
        if not self.progression_editor_data:
            messagebox.showinfo("Progression", "Load a progression first.")
            return
        file_texts = filedialog.askopenfilenames(
            initialdir=str(ROOT / "levels"),
            title="Choose level JSON files",
            filetypes=[("JSON files", "*.json")],
        )
        if not file_texts:
            return
        added = 0
        for file_text in file_texts:
            json_path = Path(file_text)
            try:
                relative = json_path.relative_to(ROOT)
            except ValueError:
                messagebox.showerror("Outside project", f"Only levels inside the project can be added.\n\n{json_path}")
                return
            if json_path.suffix.lower() != ".json":
                continue
            self.progression_editor_slots.append({"slot": len(self.progression_editor_slots), "level_file": str(relative)})
            added += 1
        if not added:
            return
        self._reindex_progression_slots()
        self._render_progression_editor()
        target_index = max(0, len(self.progression_editor_slots) - 1)
        self.progression_listbox.selection_clear(0, tk.END)
        self.progression_listbox.selection_set(target_index)
        self._update_progression_preview()
        self.status_var.set(f"Added {added} level(s) to the progression editor.")

    def _remove_progression_slot(self) -> None:
        if not self.progression_editor_slots:
            return
        selected = self.progression_listbox.curselection()
        if not selected:
            messagebox.showinfo("Progression", "Select a slot first.")
            return
        index = selected[0]
        if index == 0:
            messagebox.showinfo("Progression", "Tutorial slot stays at the top.")
            return
        removed = self.progression_editor_slots.pop(index)
        self._reindex_progression_slots()
        self._render_progression_editor()
        if self.progression_editor_slots:
            next_index = min(index, len(self.progression_editor_slots) - 1)
            self.progression_listbox.selection_clear(0, tk.END)
            self.progression_listbox.selection_set(next_index)
            self._update_progression_preview()
        level_ref = Path(removed.get("level_file") or "-").name
        self.status_var.set(f"Removed {level_ref} from the progression editor.")

    def save_progression_editor(self) -> None:
        path = self._progression_editor_path()
        if not path or not self.progression_editor_data:
            messagebox.showinfo("Progression", "Load a progression first.")
            return
        self.progression_editor_data["slots"] = self.progression_editor_slots
        path.write_text(json.dumps(self.progression_editor_data, indent=2, ensure_ascii=True) + "\n")
        self.status_var.set(f"Saved progression order: {path.name}")

    def scan(self) -> None:
        try:
            items = self._load_source_items()
        except Exception as err:
            messagebox.showerror("Scan error", str(err))
            return
        imported_map = {
            row[0]: {"signature": row[1], "target_json": row[2] or "", "target_screenshot": row[3] or "", "imported_at": row[4]}
            for row in self._query(
                "SELECT source_key, signature, target_json_path, target_screenshot_path, imported_at FROM imported_files WHERE profile_name = ?",
                ((self.profile_var.get() or "default").strip(),),
            )
        }
        self.scan_results.clear()
        self.listbox.delete(0, tk.END)
        pending = 0
        try:
            for item in items:
                expected_target_json = self._target_json_path(item)
                expected_target_screenshot = self._target_screenshot_path(item) if item.screenshot_path else ""
                record = imported_map.get(item.source_key)
                if not record:
                    state = "NEW"
                    pending += 1
                elif record["signature"] != item.signature or record["target_json"] != expected_target_json or record["target_screenshot"] != expected_target_screenshot:
                    state = "UPDATED"
                    pending += 1
                else:
                    state = "IMPORTED"
                imported_at = time.strftime("%Y-%m-%d %H:%M", time.localtime(record["imported_at"])) if record else ""
                row = {
                    "item": item,
                    "state": state,
                    "target_json": expected_target_json,
                    "target_screenshot": expected_target_screenshot,
                    "imported_at": imported_at,
                }
                self.scan_results.append(row)
                line = " | ".join([
                    state.ljust(8),
                    item.progression[:16].ljust(16),
                    str(item.slot).rjust(2),
                    item.json_name[:24].ljust(24),
                    (item.screenshot_name or "-")[:20].ljust(20),
                    Path(expected_target_json).name[:24].ljust(24),
                    (Path(expected_target_screenshot).name if expected_target_screenshot else "-")[:24].ljust(24),
                    imported_at or "-",
                ])
                self.listbox.insert(tk.END, line)
        except Exception as err:
            messagebox.showerror("Scan error", str(err))
            self.status_var.set("Scan failed.")
            return
        self.status_var.set(f"Scan complete. items={len(items)} pending={pending} profile={(self.profile_var.get() or 'default').strip()}")

    def import_pending(self, selected_only: bool = False) -> None:
        rows = self._selected_scan_rows(selected_only)
        if not rows:
            return
        profile_name = (self.profile_var.get() or "default").strip()
        imported = 0
        seen_source_keys: set[str] = set()
        for row in rows:
            if row["state"] not in {"NEW", "UPDATED"}:
                continue
            item: SyncItem = row["item"]
            if item.source_key in seen_source_keys:
                continue
            seen_source_keys.add(item.source_key)
            json_target = Path(self._target_json_path(item))
            json_target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item.json_path, json_target)
            target_screenshot = ""
            if item.screenshot_path and item.screenshot_path.exists():
                shot_target = Path(self._target_screenshot_path(item))
                shot_target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item.screenshot_path, shot_target)
                target_screenshot = str(shot_target)
            self.conn.execute(
                """
                INSERT INTO imported_files (profile_name, source_key, signature, target_json_path, target_screenshot_path, imported_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(profile_name, source_key) DO UPDATE SET
                  signature = excluded.signature,
                  target_json_path = excluded.target_json_path,
                  target_screenshot_path = excluded.target_screenshot_path,
                  imported_at = excluded.imported_at
                """,
                (profile_name, item.source_key, item.signature, str(json_target), target_screenshot, time.time()),
            )
            imported += 1
        self.conn.commit()
        self.scan()
        self.status_var.set(f"Imported {imported} item(s).")

    def _rename_plan(self, rows_to_rename: list[dict]) -> tuple[dict[str, str], list[tuple[Path, Path]], list[tuple[Path, Path]], list[str]]:
        replacements: dict[str, str] = {}
        file_move_map: dict[Path, Path] = {}
        screenshot_move_map: dict[Path, Path] = {}
        preview_lines: list[str] = []
        for row in rows_to_rename:
            item: SyncItem = row["item"]
            new_json_path = item.json_path.with_name(self._renamed_name(item, item.json_name))
            if new_json_path != item.json_path:
                replacements[item.source_key] = str(new_json_path.relative_to(ROOT)) if str(new_json_path).startswith(str(ROOT)) else str(new_json_path)
                prev_dst = file_move_map.get(item.json_path)
                if prev_dst and prev_dst != new_json_path:
                    raise ValueError(f"Conflicting rename for {item.json_path.name}: {prev_dst.name} vs {new_json_path.name}")
                file_move_map[item.json_path] = new_json_path
                preview_lines.append(f"{item.json_path.name} -> {new_json_path.name}")
            if item.screenshot_path and item.screenshot_path.exists():
                new_shot = item.screenshot_path.with_name(self._renamed_name(item, item.screenshot_path.name))
                if new_shot != item.screenshot_path:
                    prev_shot_dst = screenshot_move_map.get(item.screenshot_path)
                    if prev_shot_dst and prev_shot_dst != new_shot:
                        raise ValueError(f"Conflicting screenshot rename for {item.screenshot_path.name}: {prev_shot_dst.name} vs {new_shot.name}")
                    screenshot_move_map[item.screenshot_path] = new_shot
        file_moves = list(file_move_map.items())
        screenshot_moves = list(screenshot_move_map.items())
        return replacements, file_moves, screenshot_moves, preview_lines

    def _validate_moves(self, moves: list[tuple[Path, Path]]) -> str | None:
        seen: set[Path] = set()
        for src, dst in moves:
            if not src.exists():
                return f"Source file not found: {src}"
            if dst in seen:
                return f"Duplicate destination: {dst}"
            seen.add(dst)
            if dst.exists() and dst != src:
                return f"Destination already exists: {dst}"
        return None

    def rename_source_files(self, selected_only: bool = False) -> None:
        if self.source_mode_var.get() not in {"after_feedback", "custom_progression"}:
            messagebox.showinfo("Unsupported", "Source rename is only enabled for after_feedback and custom_progression.")
            return
        rows = self._selected_scan_rows(selected_only)
        if not rows:
            return
        try:
            replacements, file_moves, screenshot_moves, preview_lines = self._rename_plan(rows)
        except Exception as err:
            messagebox.showerror("Rename blocked", str(err))
            return
        if not file_moves and not screenshot_moves:
            messagebox.showinfo("No changes", "Current naming rule does not change selected files.")
            return
        err = self._validate_moves(file_moves + screenshot_moves)
        if err:
            messagebox.showerror("Rename blocked", err)
            return
        preview = "\n".join(preview_lines[:12])
        if not messagebox.askyesno("Confirm rename", f"{preview}\n\nRename source files?"):
            return
        for src, dst in file_moves:
            src.rename(dst)
        for src, dst in screenshot_moves:
            src.rename(dst)
        updated_refs = 0
        for path in self._source_reference_files():
            if update_progression_references(path, replacements):
                updated_refs += 1
        profile_name = (self.profile_var.get() or "default").strip()
        old_keys = [str(src.relative_to(ROOT)) for src, _ in file_moves if str(src).startswith(str(ROOT))]
        if old_keys:
            placeholders = ",".join("?" for _ in old_keys)
            self.conn.execute(f"DELETE FROM imported_files WHERE profile_name = ? AND source_key IN ({placeholders})", (profile_name, *old_keys))
            self.conn.commit()
        self.scan()
        self.status_var.set(f"Renamed {len(file_moves)} source file(s), {len(screenshot_moves)} screenshot(s), updated {updated_refs} progression file(s).")

    def rename_folder_files(self) -> None:
        folder_text = filedialog.askdirectory(initialdir=str(ROOT / "levels"), title="Choose folder to rename")
        if not folder_text:
            return
        folder = Path(folder_text)
        paths = sorted(path for path in folder.iterdir() if path.is_file() and path.suffix.lower() in {".json", ".png"})
        rows = []
        for index, path in enumerate(paths, start=1):
            screenshot_path = None
            if path.suffix.lower() == ".json":
                candidate = folder / f"{path.stem}.png"
                screenshot_path = candidate if candidate.exists() else None
            rows.append({"item": SyncItem(folder.name, index, path, screenshot_path), "state": "FOLDER"})
        rows = self._filtered_rows(rows)
        if not rows:
            return
        try:
            _replacements, file_moves, screenshot_moves, preview_lines = self._rename_plan(rows)
        except Exception as err:
            messagebox.showerror("Rename blocked", str(err))
            return
        if not file_moves and not screenshot_moves:
            messagebox.showinfo("No changes", "Current naming rule does not change any file in that folder.")
            return
        err = self._validate_moves(file_moves + screenshot_moves)
        if err:
            messagebox.showerror("Rename blocked", err)
            return
        preview = "\n".join(preview_lines[:12])
        if not messagebox.askyesno("Confirm folder rename", f"{preview}\n\nRename files in that folder?"):
            return
        for src, dst in file_moves:
            src.rename(dst)
        for src, dst in screenshot_moves:
            src.rename(dst)
        self.status_var.set(f"Renamed {len(file_moves)} file(s) and {len(screenshot_moves)} screenshot(s) in {folder.name}.")


def main() -> int:
    root = tk.Tk()
    root.geometry("1600x900")
    root.minsize(1200, 700)
    app = BearReportingSyncApp(root)
    try:
        root.mainloop()
    finally:
        app.conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

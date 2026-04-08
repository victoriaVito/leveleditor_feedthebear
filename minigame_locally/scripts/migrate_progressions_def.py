#!/usr/bin/env python3
"""
Migrate Level Manager progressions to a simpler structure:

- Keep only: progression_4_1, progression_5_1, progression_6_1
- Rename them to: progression_d, progression_e, progression_f
- Create: otherLevels (everything else)
- Organize level JSON files under levels/:
  - levels/progression_d/
  - levels/progression_e/
  - levels/progression_f/
  - levels/otherLevels/  (best-effort; only moves files that live directly under levels/)

This script updates:
- .local/toolkit_state/manager_state.json
- .local/toolkit_state/workspace_state.json
- progressions/manager_state/level_manager_state.json
- progressions/manager_state/level_manager_metadata.json
- progressions/manager_progressions_live.json

It is intended to be run from repo root:
  python3 scripts/migrate_progressions_def.py
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


ROOT = Path(__file__).resolve().parents[1]

KEEP_RENAME = {
    "progression_4_1": "progression_d",
    "progression_5_1": "progression_e",
    "progression_6_1": "progression_f",
}

LABELS = {
    "progression_d": "Progression D",
    "progression_e": "Progression E",
    "progression_f": "Progression F",
}

LEVELS_DIR = ROOT / "levels"
OTHER_LEVELS_DIR = LEVELS_DIR / "otherLevels"
OTHER_LEVELS_KEY = "otherLevels"
OTHER_LEVELS_LABEL = "Other Levels"

MANAGER_STATE_PATH = ROOT / ".local" / "toolkit_state" / "manager_state.json"
WORKSPACE_STATE_PATH = ROOT / ".local" / "toolkit_state" / "workspace_state.json"

MANAGER_SNAPSHOT_PATH = ROOT / "progressions" / "manager_state" / "level_manager_state.json"
MANAGER_METADATA_PATH = ROOT / "progressions" / "manager_state" / "level_manager_metadata.json"
MANAGER_LIVE_EXPORT_PATH = ROOT / "progressions" / "manager_progressions_live.json"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")


def is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def normalize_abs(path_value: str) -> str:
    return str(Path(path_value).expanduser().resolve())


def existing_level_path_for_file(file_name: str, saved_path: str) -> Optional[Path]:
    if saved_path:
        candidate = Path(saved_path)
        if not candidate.is_absolute():
            candidate = (ROOT / saved_path).resolve()
        if candidate.exists():
            return candidate

    # Fast-path common locations.
    candidates = [
        LEVELS_DIR / file_name,
        LEVELS_DIR / "progression_a" / file_name,
        LEVELS_DIR / "progression_b" / file_name,
        LEVELS_DIR / "progression_c" / file_name,
        LEVELS_DIR / "progression_d" / file_name,
        LEVELS_DIR / "progression_e" / file_name,
        LEVELS_DIR / "progression_f" / file_name,
        LEVELS_DIR / "otherLevels" / file_name,
        LEVELS_DIR / "8x8-9x9-procedular" / file_name,
        LEVELS_DIR / "benchmark_flow_free" / file_name,
        LEVELS_DIR / "lvl" / file_name,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    # Slow fallback.
    try:
        for candidate in LEVELS_DIR.rglob(file_name):
            if candidate.is_file():
                return candidate.resolve()
    except Exception:
        return None

    return None


def folder_for_item(item_id: int, item_file: str, slots_by_item: Dict[int, str]) -> str:
    # Tutorial stays at top-level so it is shared across progressions.
    if item_file == "tutorial_level.json":
        return ""
    return slots_by_item.get(item_id, "otherLevels")


def build_slots_by_item(progressions: Dict[str, Any]) -> Dict[int, str]:
    out: Dict[int, str] = {}
    for prog_key, prog in progressions.items():
        slots = prog.get("slots", [])
        if not isinstance(slots, list):
            continue
        for item_id in slots:
            if is_int(item_id):
                out[item_id] = prog_key
    return out


def relpath_posix(path_value: Path) -> str:
    try:
        return path_value.relative_to(ROOT).as_posix()
    except Exception:
        return str(path_value)


def best_existing_level_path(file_name: str, saved_path: str, prefer_dirs: Optional[List[Path]] = None) -> Optional[Path]:
    for pref in (prefer_dirs or []):
        try:
            candidate = (pref / file_name).resolve()
            if candidate.exists() and candidate.is_file():
                return candidate
        except Exception:
            continue
    return existing_level_path_for_file(file_name, saved_path)


def migrate_manager_state(obj: Dict[str, Any]) -> Dict[str, Any]:
    progressions = obj.get("progressions") or {}
    if not isinstance(progressions, dict):
        progressions = {}

    next_progressions: Dict[str, Any] = {}
    next_order: List[str] = []
    for old_key, new_key in KEEP_RENAME.items():
        prog = None
        if old_key in progressions:
            prog = progressions.get(old_key)
        elif new_key in progressions:
            # Idempotent: already migrated.
            prog = progressions.get(new_key)
        if not isinstance(prog, dict):
            continue
        prog = {**prog, "label": LABELS[new_key]}
        next_progressions[new_key] = prog
        next_order.append(new_key)

    if not next_order:
        raise RuntimeError("No source progressions found to keep (expected progression_4_1/5_1/6_1 or progression_d/e/f).")

    # Build Other Levels progression from the remaining items.
    items = obj.get("items") or []
    items_by_id: Dict[int, Dict[str, Any]] = {}
    all_ids: List[int] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        it_id = it.get("id")
        if not is_int(it_id):
            continue
        items_by_id[it_id] = it
        all_ids.append(it_id)

    assigned: Set[int] = set()
    tutorial_id: Optional[int] = None
    for it_id, it in items_by_id.items():
        if str(it.get("file") or "") == "tutorial_level.json":
            tutorial_id = it_id
            break

    for prog in next_progressions.values():
        slots = prog.get("slots") or []
        if not isinstance(slots, list):
            continue
        for it_id in slots:
            if is_int(it_id):
                assigned.add(it_id)

    other_ids: List[int] = []
    for it_id in all_ids:
        if it_id in assigned:
            continue
        if tutorial_id is not None and it_id == tutorial_id:
            continue
        other_ids.append(it_id)

    def difficulty_for_item(it_id: int) -> str:
        it = items_by_id.get(it_id) or {}
        level_obj = it.get("level") or {}
        diff = level_obj.get("difficulty")
        if isinstance(diff, str) and diff:
            return diff
        return "EASY"

    next_progressions[OTHER_LEVELS_KEY] = {
        "label": OTHER_LEVELS_LABEL,
        "slots": other_ids,
        "lockedSlots": [False for _ in other_ids],
        "slotDifficulty": [difficulty_for_item(it_id) for it_id in other_ids],
        "locked": False,
    }
    next_order.append(OTHER_LEVELS_KEY)

    obj["progressions"] = next_progressions
    obj["progressionOrder"] = next_order

    active = obj.get("activeTab") or ""
    if active in KEEP_RENAME:
        obj["activeTab"] = KEEP_RENAME[active]
    elif active not in next_progressions:
        obj["activeTab"] = next_order[0]

    # Cancel pending reference assignment if it points to a removed progression.
    pending = obj.get("pendingRefTarget")
    if isinstance(pending, dict):
        prog = pending.get("progressionKey")
        if prog in KEEP_RENAME:
            pending["progressionKey"] = KEEP_RENAME[prog]
        if pending.get("progressionKey") not in next_progressions:
            obj["pendingRefTarget"] = None

    return obj


def migrate_workspace_state(obj: Dict[str, Any]) -> Dict[str, Any]:
    manager = obj.get("manager")
    if not isinstance(manager, dict):
        return obj
    obj["manager"] = migrate_manager_state(manager)
    return obj


def update_item_paths_in_manager_state(manager_obj: Dict[str, Any]) -> List[Tuple[str, str]]:
    """
    Update .local/toolkit_state/manager_state.json item paths.

    NOTE: We only *move* JSON/PNG files when the source file lives directly under levels/
    to avoid disturbing special folders (benchmarks, backups, etc). For progression_d/e/f we
    also prefer their dedicated folders when the destination already exists.
    """
    moves: List[Tuple[str, str]] = []
    items = manager_obj.get("items") or []
    if not isinstance(items, list):
        return moves

    progressions = manager_obj.get("progressions") or {}
    slots_by_item = build_slots_by_item(progressions)

    OTHER_LEVELS_DIR.mkdir(parents=True, exist_ok=True)
    for key in ("progression_d", "progression_e", "progression_f"):
        (LEVELS_DIR / key).mkdir(parents=True, exist_ok=True)

    def move_if_safe(src: Path, dest: Path) -> Path:
        if src == dest:
            return src
        dest.parent.mkdir(parents=True, exist_ok=True)

        # Prefer existing destination without overwriting.
        if dest.exists():
            try:
                if src.exists() and src.is_file() and src.read_bytes() == dest.read_bytes():
                    src.unlink()
                # Keep dest as canonical.
                return dest
            except Exception:
                return dest

        # Only move files that live directly under levels/ (safe, intentional cleanup).
        if src.parent != LEVELS_DIR:
            return src

        try:
            src.rename(dest)
            moves.append((str(src), str(dest)))
            # Move sidecar PNG if present in the same folder (not screenshots/).
            sidecar_src = src.with_suffix(".png")
            if sidecar_src.exists() and sidecar_src.is_file():
                sidecar_dest = dest.with_suffix(".png")
                try:
                    if not sidecar_dest.exists():
                        sidecar_src.rename(sidecar_dest)
                        moves.append((str(sidecar_src), str(sidecar_dest)))
                except Exception:
                    pass
            return dest
        except Exception:
            return src

    for item in items:
        if not isinstance(item, dict):
            continue
        item_id = item.get("id")
        if not is_int(item_id):
            continue
        file_name = str(item.get("file") or "").strip()
        if not file_name.endswith(".json"):
            continue

        folder = folder_for_item(item_id, file_name, slots_by_item)
        dest = (LEVELS_DIR / file_name) if folder == "" else (LEVELS_DIR / folder / file_name)
        dest = dest.resolve()

        src = existing_level_path_for_file(file_name, str(item.get("savedPath") or ""))
        if not src:
            # If the destination exists already, just point to it.
            if dest.exists():
                item["savedPath"] = str(dest)
            continue

        # If destination already exists, prefer it and optionally delete identical src.
        canonical = dest if dest.exists() else src
        if src != dest:
            canonical = move_if_safe(src, dest)

        item["savedPath"] = str(canonical)
        # Keep "Workshop level · ..." sourcePath if present; otherwise align to canonical.
        source_path = str(item.get("sourcePath") or "")
        if source_path.startswith(str(ROOT)) or source_path.startswith("/"):
            item["sourcePath"] = str(canonical)

    return moves


def migrate_manager_snapshot(obj: Dict[str, Any], id_to_level_file: Dict[int, str]) -> Dict[str, Any]:
    progressions = obj.get("progressions") or {}
    if not isinstance(progressions, dict):
        progressions = {}

    next_progressions: Dict[str, Any] = {}
    next_order: List[str] = []
    for old_key, new_key in KEEP_RENAME.items():
        prog = progressions.get(old_key)
        if not isinstance(prog, dict):
            prog = progressions.get(new_key)  # idempotent
        if not isinstance(prog, dict):
            continue
        next_progressions[new_key] = {**prog, "label": LABELS[new_key]}
        next_order.append(new_key)

    if not next_order:
        raise RuntimeError("No snapshot progressions found to keep (expected progression_4_1/5_1/6_1 or progression_d/e/f).")

    # Align item paths (level_file + saved/source paths) using canonical local paths.
    items = obj.get("items") or []
    items_by_id: Dict[int, Dict[str, Any]] = {}
    all_ids: List[int] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        it_id = it.get("id")
        if not is_int(it_id):
            continue
        items_by_id[it_id] = it
        all_ids.append(it_id)

        canonical = id_to_level_file.get(it_id)
        if isinstance(canonical, str) and canonical.startswith("levels/"):
            it["level_file"] = canonical
            it["saved_path"] = f"minigame_locally/{canonical}"
            it["source_path"] = f"minigame_locally/{canonical}"

    tutorial_id: Optional[int] = None
    for it_id, it in items_by_id.items():
        if str(it.get("file") or "") == "tutorial_level.json":
            tutorial_id = it_id
            break

    assigned: Set[int] = set()
    for prog in next_progressions.values():
        slots = prog.get("slots") or []
        if not isinstance(slots, list):
            continue
        for slot in slots:
            if isinstance(slot, dict) and is_int(slot.get("item_id")):
                assigned.add(slot["item_id"])
                item_id = slot["item_id"]
                canonical = id_to_level_file.get(item_id)
                if isinstance(canonical, str) and canonical.startswith("levels/"):
                    slot["level_file"] = canonical

    other_ids: List[int] = []
    for it_id in all_ids:
        if it_id in assigned:
            continue
        if tutorial_id is not None and it_id == tutorial_id:
            continue
        other_ids.append(it_id)

    other_slots: List[Dict[str, Any]] = []
    for idx, it_id in enumerate(other_ids):
        it = items_by_id.get(it_id) or {}
        other_slots.append({
            "slot": idx,
            "item_id": it_id,
            "file": it.get("file", ""),
            "level": it.get("level", 0),
            "level_id": it.get("level_id", ""),
            "level_file": it.get("level_file", ""),
            "board": it.get("board", ""),
            "pairs": it.get("pairs", 0),
            "blockers": it.get("blockers", 0),
            "moves": it.get("moves", 0),
            "solutions": it.get("solutions", 0),
            "difficulty": it.get("difficulty", "EASY"),
            "status": it.get("status", "OK"),
            "changed": bool(it.get("changed", False)),
            "locked": False,
            "notes": it.get("notes", ""),
        })

    next_progressions[OTHER_LEVELS_KEY] = {
        "label": OTHER_LEVELS_LABEL,
        "progression_locked": False,
        "slots": other_slots,
    }
    next_order.append(OTHER_LEVELS_KEY)

    obj["progressions"] = next_progressions
    obj["progression_order"] = next_order

    active = obj.get("active_tab") or ""
    if active in KEEP_RENAME:
        obj["active_tab"] = KEEP_RENAME[active]
    elif active not in next_progressions:
        obj["active_tab"] = next_order[0]

    # Recompute counts (best-effort).
    items = obj.get("items") or []
    all_ids: Set[int] = set()
    valid = invalid = parse_err = 0
    for it in items:
        if not isinstance(it, dict):
            continue
        if is_int(it.get("id")):
            all_ids.add(it["id"])
        status = it.get("status")
        if status == "OK":
            valid += 1
        elif status == "INVALID":
            invalid += 1
        elif status == "PARSE_ERROR":
            parse_err += 1

    assigned: Set[int] = set()
    for prog in next_progressions.values():
        slots = prog.get("slots") or []
        if not isinstance(slots, list):
            continue
        for slot in slots:
            if isinstance(slot, dict) and is_int(slot.get("item_id")):
                assigned.add(slot["item_id"])

    unassigned = all_ids - assigned
    obj["counts"] = {
        "total_items": len(all_ids),
        "assigned_items": len(assigned),
        "unassigned_items": len(unassigned),
        "extra_items": len(obj.get("extra_item_ids") or []),
        "discarded_items": len(obj.get("discarded_item_ids") or []),
        "valid_items": valid,
        "invalid_items": invalid,
        "parse_error_items": parse_err,
    }

    return obj


def migrate_manager_metadata(obj: Dict[str, Any], progression_order: List[str], active_tab: str, selected_id: Optional[int]) -> Dict[str, Any]:
    obj["progression_order"] = progression_order
    obj["active_tab"] = active_tab
    if selected_id is not None:
        obj["selected_id"] = selected_id
    else:
        obj["selected_id"] = None
    return obj


def migrate_manager_live_export(obj: Dict[str, Any]) -> Dict[str, Any]:
    next_obj: Dict[str, Any] = {}
    for old_key, new_key in KEEP_RENAME.items():
        prog = obj.get(old_key)
        if not isinstance(prog, dict):
            prog = obj.get(new_key)  # idempotent
        if isinstance(prog, dict):
            next_prog = {**prog, "name": new_key}
            # Normalize slot level_file paths by resolving current files on disk.
            slots = next_prog.get("slots") or []
            if isinstance(slots, list):
                prefer_dir = LEVELS_DIR / new_key
                for slot in slots:
                    if not isinstance(slot, dict):
                        continue
                    level_file = slot.get("level_file")
                    if not isinstance(level_file, str) or not level_file:
                        continue
                    file_name = Path(level_file).name
                    if file_name == "tutorial_level.json":
                        slot["level_file"] = "levels/tutorial_level.json"
                        continue
                    resolved = best_existing_level_path(file_name, "", prefer_dirs=[prefer_dir])
                    if resolved and resolved.exists():
                        slot["level_file"] = relpath_posix(resolved)
            next_obj[new_key] = next_prog

    # Build a lightweight Other Levels export (best-effort, derived from all_levels if present).
    all_levels = obj.get("all_levels")
    if isinstance(all_levels, list):
        used_files: Set[str] = set()
        for prog in next_obj.values():
            slots = prog.get("slots") or []
            if not isinstance(slots, list):
                continue
            for slot in slots:
                if isinstance(slot, dict) and isinstance(slot.get("level_file"), str):
                    used_files.add(slot["level_file"])

        other_slots: List[Dict[str, Any]] = []
        for idx, entry in enumerate(all_levels):
            if not isinstance(entry, dict):
                continue
            level_file = entry.get("level_file")
            if not isinstance(level_file, str) or not level_file:
                continue
            if level_file in used_files:
                continue
            other_slots.append({"slot": idx, "level_file": level_file})
        next_obj[OTHER_LEVELS_KEY] = {
            "name": OTHER_LEVELS_KEY,
            "locked": False,
            "tutorial_level_file": "levels/tutorial_level.json",
            "slots": other_slots,
        }

    # Keep buckets for compatibility.
    for key in ("extras", "discarded", "all_levels"):
        if key in obj:
            next_obj[key] = obj[key]
    return next_obj


def main() -> None:
    if not MANAGER_STATE_PATH.exists():
        raise SystemExit(f"Missing: {MANAGER_STATE_PATH}")

    manager_state = load_json(MANAGER_STATE_PATH)
    if not isinstance(manager_state, dict):
        raise SystemExit("manager_state.json is not an object")

    manager_state = migrate_manager_state(manager_state)
    moves = update_item_paths_in_manager_state(manager_state)
    save_json(MANAGER_STATE_PATH, manager_state)

    # Canonical ID -> level_file mapping from local state (post-move).
    id_to_level_file: Dict[int, str] = {}
    for it in manager_state.get("items") or []:
        if not isinstance(it, dict):
            continue
        it_id = it.get("id")
        if not is_int(it_id):
            continue
        saved_path = it.get("savedPath")
        if not isinstance(saved_path, str) or not saved_path:
            continue
        try:
            saved = Path(saved_path).resolve()
        except Exception:
            continue
        if not saved.exists() or not saved.is_file():
            continue
        rel = relpath_posix(saved)
        if rel.startswith("levels/"):
            id_to_level_file[it_id] = rel

    # Workspace snapshot (best-effort).
    if WORKSPACE_STATE_PATH.exists():
        ws = load_json(WORKSPACE_STATE_PATH)
        if isinstance(ws, dict):
            ws = migrate_workspace_state(ws)
            # Align item paths with manager_state (same IDs).
            try:
                ws_mgr = ws.get("manager")
                if isinstance(ws_mgr, dict):
                    ws_mgr["items"] = manager_state.get("items", ws_mgr.get("items", []))
                    ws["manager"] = ws_mgr
            except Exception:
                pass
            save_json(WORKSPACE_STATE_PATH, ws)

    # Manager metadata snapshot files (best-effort, but used by spreadsheet sync).
    active_tab = manager_state.get("activeTab") or "progression_d"
    selected_id = manager_state.get("selectedId")
    order = manager_state.get("progressionOrder") or ["progression_d", "progression_e", "progression_f"]

    if MANAGER_SNAPSHOT_PATH.exists():
        snap = load_json(MANAGER_SNAPSHOT_PATH)
        if isinstance(snap, dict):
            snap = migrate_manager_snapshot(snap, id_to_level_file)
            save_json(MANAGER_SNAPSHOT_PATH, snap)

    if MANAGER_METADATA_PATH.exists():
        meta = load_json(MANAGER_METADATA_PATH)
        if isinstance(meta, dict):
            meta = migrate_manager_metadata(meta, order, active_tab, selected_id if is_int(selected_id) else None)
            save_json(MANAGER_METADATA_PATH, meta)

    if MANAGER_LIVE_EXPORT_PATH.exists():
        live = load_json(MANAGER_LIVE_EXPORT_PATH)
        if isinstance(live, dict):
            live = migrate_manager_live_export(live)
            save_json(MANAGER_LIVE_EXPORT_PATH, live)

    print("ok: migrated progressions to progression_d/e/f + otherLevels")
    print(f"kept: {', '.join(order)}")
    if moves:
        print(f"moved level json files: {len(moves)}")
        for src, dest in moves[:25]:
            print(f"- {src} -> {dest}")
        if len(moves) > 25:
            print(f"... and {len(moves) - 25} more")


if __name__ == "__main__":
    main()

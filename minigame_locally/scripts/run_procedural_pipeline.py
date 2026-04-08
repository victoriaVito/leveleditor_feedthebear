#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path
import re
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
LEVELS_DIR = ROOT / "levels"
OTHER_LEVELS_DIR = LEVELS_DIR / "otherLevels"
SCREENSHOTS_DIR = LEVELS_DIR / "screenshots"
OUTPUT_DIR = ROOT / "output" / "procedural"
PLAYTEST_DIR = ROOT / "playtest"

MANAGER_STATE_PATH = ROOT / ".local" / "toolkit_state" / "manager_state.json"
WORKSPACE_STATE_PATH = ROOT / ".local" / "toolkit_state" / "workspace_state.json"
PLAY_SESSIONS_STATE_PATH = ROOT / ".local" / "toolkit_state" / "play_sessions_state.json"
MANAGER_SNAPSHOT_PATH = ROOT / "progressions" / "manager_state" / "level_manager_state.json"
MANAGER_METADATA_PATH = ROOT / "progressions" / "manager_state" / "level_manager_metadata.json"
PROCEDURAL_QUEUE_PATH = PLAYTEST_DIR / "procedural_100_queue.json"
PROCEDURAL_REPORT_PATH = OUTPUT_DIR / "procedural_pipeline_report.json"
LEARNING_SNAPSHOT_PATH = OUTPUT_DIR / "procedural_learning_snapshot.json"
LEARNING_AUDIT_PATH = OUTPUT_DIR / "procedural_learning_audit.json"
LEARNING_REPLAY_PATH = OUTPUT_DIR / "replay_procedural_learning_scorer.json"
CONFIG_PATH = ROOT / "config" / "fish_colors.json"

PROCEDURAL_RE = re.compile(r"procedular_reference_large_(\d{3})\.json$")
ROOT_PROCEDURAL_PATH_RE = re.compile(r"/levels/procedular_reference_large_(\d{3})\.json$")

DENSITY_RANGES = {
    "HIGH": (6, 20),
    "MEDIUM-HIGH": (3, 5),
    "MEDIUM": (2, 4),
    "MEDIUM-LOW": (2, 3),
    "LOW": (2, 2),
    "VERY-LOW": (2, 2),
    "SINGLE": (1, 1),
    "LOW-MEDIUM": (2, 4),
}

DIFFICULTY_TO_DENSITY = {
    "EASY": ("HIGH", "MEDIUM-HIGH"),
    "MEDIUM": ("MEDIUM", "MEDIUM-LOW"),
    "HARD": ("LOW", "VERY-LOW", "SINGLE", "LOW-MEDIUM"),
}

PAIR_IDS = list("ABCDEFGHI")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def level_file_name(serial: int) -> str:
    return f"procedular_reference_large_{serial:03d}.json"


def procedural_serial_from_name(name: str) -> int | None:
    match = PROCEDURAL_RE.search(name or "")
    return int(match.group(1)) if match else None


def density_to_difficulty(label: str) -> str:
    target = str(label or "").upper()
    for difficulty, labels in DIFFICULTY_TO_DENSITY.items():
        if target in labels:
            return difficulty
    return "MEDIUM"


def density_match(label: str, count: int) -> bool:
    lo, hi = DENSITY_RANGES.get(str(label or "").upper(), (1, 20))
    return lo <= count <= hi


def to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def supported_board(width: int, height: int) -> bool:
    return 4 <= width <= 7 and 4 <= height <= 8


def project_relative(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def display_project_path(path: Path) -> str:
    return f"minigame_locally/{project_relative(path)}"


def load_fish_catalog() -> tuple[dict[str, dict[str, str]], list[dict[str, str]]]:
    data = load_json(CONFIG_PATH)
    ordered: list[dict[str, str]] = []
    by_pair_type: dict[str, dict[str, str]] = {}
    for index, entry in enumerate(data.get("colors", [])):
        fish_id = str(entry["id"])
        pair_type = fish_id.replace("fish_", "")
        enriched = {
            "id": fish_id,
            "hex": str(entry["hex"]),
            "letter": chr(ord("A") + index),
            "pair_type": pair_type,
        }
        ordered.append(enriched)
        by_pair_type[pair_type] = enriched
    return by_pair_type, ordered


FISH_BY_PAIR_TYPE, FISH_ORDER = load_fish_catalog()


def fish_entry(pair_type: str, index: int) -> dict[str, str]:
    return FISH_BY_PAIR_TYPE.get(str(pair_type or ""), FISH_ORDER[index % len(FISH_ORDER)])


def build_grid(width: int, height: int, pairs: list[dict], blockers: list[list[int]]) -> list[list[str]]:
    grid = [["EMPTY" for _ in range(width)] for _ in range(height)]
    for row, col in blockers:
        grid[row][col] = "BLOCKED"
    for index, pair in enumerate(pairs):
        pair_id = PAIR_IDS[index]
        start_row, start_col = pair["start"]
        end_row, end_col = pair["end"]
        grid[start_row][start_col] = f"NODE_{pair_id}1"
        grid[end_row][end_col] = f"NODE_{pair_id}2"
    return grid


def runtime_level(level: dict, serial: int) -> dict[str, Any]:
    width = int(level["gridSize"]["cols"])
    height = int(level["gridSize"]["rows"])
    if not supported_board(width, height):
        raise ValueError(f"Unsupported board size in generated pack: {width}x{height}")

    pairs: list[dict[str, Any]] = []
    for index, pair in enumerate(level.get("pairs", [])):
        row_a = int(pair["a"]["y"])
        col_a = int(pair["a"]["x"])
        row_b = int(pair["b"]["y"])
        col_b = int(pair["b"]["x"])
        fish = fish_entry(str(pair.get("type", "")), index)
        pairs.append({
            "id": PAIR_IDS[index],
            "start": [row_a, col_a],
            "end": [row_b, col_b],
            "color": fish["hex"],
            "fish_color_id": fish["id"],
            "color_letter": fish["letter"],
        })

    blockers = [[int(blocker["y"]), int(blocker["x"])] for blocker in level.get("blockers", [])]
    solution_count = max(0, int(level.get("solutionCount", 0)))
    target_density = str(level.get("targetDensity", "MEDIUM")).upper()
    difficulty = density_to_difficulty(target_density)
    validation = level.get("validation", {}) if isinstance(level.get("validation"), dict) else {}

    return {
        "level": serial,
        "board_size": width if width == height else None,
        "board_width": width,
        "board_height": height,
        "grid": build_grid(width, height, pairs, blockers),
        "pairs": pairs,
        "blockers": blockers,
        "decal": bool(level.get("decal", False)),
        "moves": int(level.get("moves", 0)),
        "solution_count": solution_count,
        "target_density": target_density,
        "difficulty": difficulty,
        "golden_path": copy.deepcopy(level.get("goldenPath", {})),
        "validation": {
            "solvable": bool(validation.get("solvable", solution_count >= 1)),
            "density_match": bool(validation.get("density_match", density_match(target_density, solution_count))),
            "decal_required": bool(level.get("decal", False)),
            "decal_pass": validation.get("decal_pass", None),
            "early_mistake_detection": bool(validation.get("early_mistake_detection", True)),
            "no_isolated_pairs": bool(validation.get("no_isolated_pairs", True)),
            "no_late_dead_ends": bool(validation.get("no_late_dead_ends", True)),
            "curve_integrity": bool(validation.get("curve_integrity", True)),
        },
        "meta": copy.deepcopy(level.get("meta", {})),
    }


def manager_status(level: dict[str, Any]) -> str:
    width = int(level.get("board_width") or level.get("board_size") or 0)
    height = int(level.get("board_height") or level.get("board_size") or 0)
    if not supported_board(width, height):
        return "INVALID"
    if not level.get("validation", {}).get("solvable", True):
        return "INVALID"
    if not (2 <= len(level.get("pairs", [])) <= len(PAIR_IDS)):
        return "INVALID"
    return "OK"


def procedural_source_label(level_data: dict) -> str:
    ref = str(((level_data.get("meta") or {}).get("reference_source")) or "").strip()
    return f"Reference procedural variant · {ref}" if ref else "Reference procedural variant"


def build_manager_item(level_path: Path, level_data: dict, runtime: dict[str, Any], item_id: int, existing: dict | None) -> dict[str, Any]:
    screenshot_path = SCREENSHOTS_DIR / f"{level_path.stem}.png"
    return {
        "id": item_id,
        "file": level_path.name,
        "sourcePath": procedural_source_label(level_data),
        "savedPath": str(level_path),
        "screenshotPath": str(screenshot_path),
        "parseError": "",
        "changed": bool((existing or {}).get("changed", False)),
        "notes": str((existing or {}).get("notes", "")),
        "status": manager_status(runtime),
        "level": runtime,
    }


def rebuild_other_levels_slots(manager_state: dict[str, Any], procedural_ids: list[int], removed_ids: set[int]) -> None:
    progressions = manager_state.get("progressions") or {}
    valid_item_ids = {int(item["id"]) for item in manager_state.get("items", []) if isinstance(item.get("id"), int)}
    retained_primary: set[int] = set()
    for key, progression in progressions.items():
        if key == "otherLevels":
            continue
        slots = [
            item_id
            for item_id in progression.get("slots", [])
            if item_id in valid_item_ids and item_id not in removed_ids
        ]
        progression["slots"] = slots
        locked_slots = progression.get("lockedSlots") or []
        progression["lockedSlots"] = locked_slots[: len(slots)] + [False] * max(0, len(slots) - len(locked_slots))
        slot_difficulty = progression.get("slotDifficulty") or []
        progression["slotDifficulty"] = slot_difficulty[: len(slots)] + ["MEDIUM"] * max(0, len(slots) - len(slot_difficulty))
        retained_primary.update(slots)

    current_other = progressions.get("otherLevels", {})
    current_slots = [
        item_id
        for item_id in current_other.get("slots", [])
        if item_id in valid_item_ids and item_id not in removed_ids and item_id not in retained_primary
    ]
    procedural_id_set = set(procedural_ids)
    preserved_non_procedural = [item_id for item_id in current_slots if item_id not in procedural_id_set]
    current_other["slots"] = preserved_non_procedural + procedural_ids
    current_other["lockedSlots"] = [False] * len(current_other["slots"])
    current_other["locked"] = False
    progressions["otherLevels"] = current_other
    manager_state["progressions"] = progressions


def compute_counts(manager_state: dict[str, Any]) -> dict[str, int]:
    items = manager_state.get("items", [])
    assigned_ids: set[int] = set()
    for progression in (manager_state.get("progressions") or {}).values():
        assigned_ids.update(item_id for item_id in progression.get("slots", []) if isinstance(item_id, int))
    return {
        "total_items": len(items),
        "assigned_items": len(assigned_ids),
        "unassigned_items": max(0, len(items) - len(assigned_ids)),
        "extra_items": len(manager_state.get("extraIds") or []),
        "discarded_items": len(manager_state.get("discardedIds") or []),
        "valid_items": sum(1 for item in items if item.get("status") == "OK"),
        "invalid_items": sum(1 for item in items if item.get("status") == "INVALID"),
        "parse_error_items": sum(1 for item in items if item.get("status") == "PARSE_ERROR"),
    }


def manager_item_by_id(items: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    return {int(item["id"]): item for item in items if isinstance(item, dict) and isinstance(item.get("id"), int)}


def placement_label(item_id: int, file_name: str, manager_state: dict[str, Any]) -> str:
    progressions = manager_state.get("progressions") or {}
    for key, progression in progressions.items():
        slots = progression.get("slots", []) or []
        if item_id not in slots:
            continue
        index = slots.index(item_id)
        if key == "otherLevels":
            serial = procedural_serial_from_name(file_name)
            if serial is not None:
                bucket = ((serial - 1) // 10) + 1
                level = ((serial - 1) % 10) + 1
                return f"Procedural {bucket} · Level {level}"
            return f"Other Levels · Slot {index + 1}"
        label = str((progression.get("label") or key)).strip() or key
        return f"{label} · Slot {index + 1}"
    return "Unassigned"


def snapshot_item_row(item: dict[str, Any], manager_state: dict[str, Any]) -> dict[str, Any]:
    level = item.get("level") or {}
    width = to_int(level.get("board_width") or level.get("board_size") or 0)
    height = to_int(level.get("board_height") or level.get("board_size") or 0)
    return {
        "id": item["id"],
        "file": item.get("file", ""),
        "source_path": display_project_path(Path(item.get("savedPath", ""))) if item.get("savedPath") else "",
        "saved_path": display_project_path(Path(item.get("savedPath", ""))) if item.get("savedPath") else "",
        "screenshot_path": display_project_path(Path(item.get("screenshotPath", ""))) if item.get("screenshotPath") else "",
        "level": to_int(level.get("level") or 0),
        "level_id": Path(item.get("file", "")).stem,
        "level_file": project_relative(Path(item.get("savedPath", ""))) if item.get("savedPath") else "",
        "board": f"{width}x{height}" if width and height else "",
        "pairs": len(level.get("pairs", [])),
        "blockers": len(level.get("blockers", [])),
        "moves": to_int(level.get("moves", 0)),
        "solutions": to_int(level.get("solution_count", 0)),
        "difficulty": str(level.get("difficulty", "")),
        "status": item.get("status", "OK"),
        "changed": bool(item.get("changed", False)),
        "notes": item.get("notes", ""),
        "placement": placement_label(int(item["id"]), str(item.get("file", "")), manager_state),
        "parse_error": item.get("parseError", ""),
    }


def snapshot_progressions(manager_state: dict[str, Any]) -> dict[str, Any]:
    items_by_id = manager_item_by_id(manager_state.get("items", []))
    out: dict[str, Any] = {}
    for key in manager_state.get("progressionOrder", []):
        progression = (manager_state.get("progressions") or {}).get(key, {})
        slots = progression.get("slots", []) or []
        locked_slots = progression.get("lockedSlots", []) or []
        slot_difficulty = progression.get("slotDifficulty", []) or []
        rows = []
        for index, item_id in enumerate(slots):
            item = items_by_id.get(item_id)
            level = item.get("level", {}) if item else {}
            width = to_int(level.get("board_width") or level.get("board_size") or 0) if item else 0
            height = to_int(level.get("board_height") or level.get("board_size") or 0) if item else 0
            rows.append({
                "slot": index,
                "item_id": item_id,
                "file": item.get("file", "") if item else "",
                "level": to_int(level.get("level") or 0) if item else None,
                "level_id": Path(item.get("file", "")).stem if item else "",
                "level_file": project_relative(Path(item.get("savedPath", ""))) if item and item.get("savedPath") else "",
                "board": f"{width}x{height}" if width and height else "",
                "pairs": len(level.get("pairs", [])) if item else 0,
                "blockers": len(level.get("blockers", [])) if item else 0,
                "moves": to_int(level.get("moves", 0)) if item else None,
                "solutions": to_int(level.get("solution_count", 0)) if item else None,
                "difficulty": slot_difficulty[index] if index < len(slot_difficulty) else (level.get("difficulty", "") if item else ""),
                "status": item.get("status", "EMPTY") if item else "EMPTY",
                "changed": bool(item.get("changed", False)) if item else False,
                "locked": bool(locked_slots[index]) if index < len(locked_slots) else False,
                "notes": item.get("notes", "") if item else "",
            })
        out[key] = {
            "label": progression.get("label", key),
            "progression_locked": bool(progression.get("locked", False)),
            "slots": rows,
        }
    return out


def update_session_paths(entries: list[dict[str, Any]], file_to_id: dict[str, int]) -> int:
    rewritten = 0
    for entry in entries:
        saved_path = str(entry.get("savedPath", ""))
        match = ROOT_PROCEDURAL_PATH_RE.search(saved_path)
        if not match:
            continue
        file_name = level_file_name(int(match.group(1)))
        level_path = OTHER_LEVELS_DIR / file_name
        screenshot_path = SCREENSHOTS_DIR / f"{level_path.stem}.png"
        entry["savedPath"] = str(level_path)
        entry["screenshotPath"] = str(screenshot_path)
        if file_name in file_to_id:
            entry["managerItemId"] = file_to_id[file_name]
        rewritten += 1
    return rewritten


def run_command(name: str, command: list[str], report: dict[str, Any], allow_timeout: bool = False, timeout: int | None = None) -> None:
    started_at = datetime.now(UTC).isoformat()
    try:
        completed = subprocess.run(
            command,
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        report["steps"].append({
            "name": name,
            "command": command,
            "started_at": started_at,
            "returncode": completed.returncode,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
        })
    except subprocess.TimeoutExpired as exc:
        if not allow_timeout:
            raise
        report["warnings"].append(f"{name} timed out after {timeout}s; partial side effects may still have been written.")
        report["steps"].append({
            "name": name,
            "command": command,
            "started_at": started_at,
            "timeout_seconds": timeout,
            "stdout": (exc.stdout or "").strip(),
            "stderr": (exc.stderr or "").strip(),
        })


def procedural_level_paths() -> list[Path]:
    paths = sorted(
        OTHER_LEVELS_DIR.glob("procedular_reference_large_*.json"),
        key=lambda path: procedural_serial_from_name(path.name) or 0,
    )
    if len(paths) != 100:
        raise RuntimeError(f"Expected 100 procedural levels in {OTHER_LEVELS_DIR}, found {len(paths)}")
    return paths


def sync_manager_and_workspace(procedural_paths: list[Path], report: dict[str, Any]) -> None:
    manager_state = load_json(MANAGER_STATE_PATH)
    workspace_state = load_json(WORKSPACE_STATE_PATH)
    play_sessions_state = load_json(PLAY_SESSIONS_STATE_PATH)

    current_manager = workspace_state.get("manager") or manager_state
    existing_procedural = {
        item["file"]: item
        for item in current_manager.get("items", [])
        if procedural_serial_from_name(str(item.get("file", ""))) is not None
    }
    old_procedural_ids = {int(item["id"]) for item in existing_procedural.values()}

    base_items = [
        item
        for item in current_manager.get("items", [])
        if procedural_serial_from_name(str(item.get("file", ""))) is None
    ]
    next_id = max((int(item.get("id", 0)) for item in current_manager.get("items", [])), default=0) + 1

    procedural_items: list[dict[str, Any]] = []
    for path in procedural_paths:
        serial = procedural_serial_from_name(path.name)
        if serial is None:
            continue
        level_data = load_json(path)
        runtime = runtime_level(level_data, serial)
        existing = existing_procedural.get(path.name)
        item_id = int(existing["id"]) if existing else next_id
        if not existing:
            next_id += 1
        procedural_items.append(build_manager_item(path, level_data, runtime, item_id, existing))

    new_manager = copy.deepcopy(current_manager)
    new_manager["items"] = base_items + procedural_items
    new_manager["nextId"] = next_id
    new_manager["referenceIds"] = [item_id for item_id in (new_manager.get("referenceIds") or []) if item_id not in old_procedural_ids]
    new_manager["discardedIds"] = [item_id for item_id in (new_manager.get("discardedIds") or []) if item_id not in old_procedural_ids]
    new_manager["extraIds"] = [item_id for item_id in (new_manager.get("extraIds") or []) if item_id not in old_procedural_ids]

    procedural_ids = [int(item["id"]) for item in procedural_items]
    rebuild_other_levels_slots(new_manager, procedural_ids, old_procedural_ids)
    items_by_id = manager_item_by_id(new_manager["items"])

    for key, progression in (new_manager.get("progressions") or {}).items():
        slot_difficulty = []
        for item_id in progression.get("slots", []):
            item = items_by_id.get(item_id)
            slot_difficulty.append(str((item or {}).get("level", {}).get("difficulty", "MEDIUM")))
        progression["slotDifficulty"] = slot_difficulty

    if new_manager.get("selectedId") not in items_by_id:
        new_manager["selectedId"] = procedural_ids[0] if procedural_ids else (new_manager["items"][0]["id"] if new_manager["items"] else None)
    new_manager["counts"] = compute_counts(new_manager)

    manager_state.clear()
    manager_state.update(copy.deepcopy(new_manager))
    save_json(MANAGER_STATE_PATH, manager_state)

    workspace_state["manager"] = copy.deepcopy(new_manager)
    workspace_state.setdefault("vitobot", {})
    workspace_state["vitobot"]["folder"] = "levels/otherLevels"
    workspace_state["vitobot"]["pattern"] = "procedular_reference_large_*.json"

    file_to_id = {item["file"]: int(item["id"]) for item in procedural_items}
    rewritten_workspace_queue = update_session_paths((workspace_state.get("sessions") or {}).get("queue", []), file_to_id)
    save_json(WORKSPACE_STATE_PATH, workspace_state)

    rewritten_play_sessions = update_session_paths(play_sessions_state.get("queue", []), file_to_id)
    rewritten_play_sessions += update_session_paths(play_sessions_state.get("history", []), file_to_id)
    save_json(PLAY_SESSIONS_STATE_PATH, play_sessions_state)

    snapshot = {
        "saved_at": datetime.now(UTC).isoformat(),
        "reason": "procedural_pipeline_refresh",
        "active_tab": str(new_manager.get("activeTab") or "otherLevels"),
        "selected_id": new_manager.get("selectedId"),
        "filters": copy.deepcopy(new_manager.get("filters") or {}),
        "counts": copy.deepcopy(new_manager["counts"]),
        "extra_item_ids": copy.deepcopy(new_manager.get("extraIds") or []),
        "discarded_item_ids": copy.deepcopy(new_manager.get("discardedIds") or []),
        "progression_order": copy.deepcopy(new_manager.get("progressionOrder") or []),
        "progressions": snapshot_progressions(new_manager),
        "items": [snapshot_item_row(item, new_manager) for item in new_manager["items"]],
    }
    save_json(MANAGER_SNAPSHOT_PATH, snapshot)
    save_json(MANAGER_METADATA_PATH, {
        "saved_at": snapshot["saved_at"],
        "reason": snapshot["reason"],
        "active_tab": snapshot["active_tab"],
        "selected_id": snapshot["selected_id"],
        "counts": snapshot["counts"],
        "progression_order": snapshot["progression_order"],
        "filters": snapshot["filters"],
    })

    procedural_queue = []
    for item in procedural_items:
        serial = procedural_serial_from_name(item["file"])
        procedural_queue.append({
            "file": f"Procedural 100 · Level {serial}",
            "source": "Procedural 100",
            "review_status": "PENDING",
            "validation_status": item["status"],
            "level": item["level"],
        })
    save_json(PROCEDURAL_QUEUE_PATH, procedural_queue)

    report["state_sync"] = {
        "procedural_manager_items": len(procedural_items),
        "manager_next_id": next_id,
        "rewritten_workspace_session_paths": rewritten_workspace_queue,
        "rewritten_play_sessions_paths": rewritten_play_sessions,
        "procedural_queue_items": len(procedural_queue),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the canonical procedural pack pipeline.")
    parser.add_argument("--sync-sheets", action="store_true", help="Run the local Sheets sync as the final optional step.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    report: dict[str, Any] = {
        "started_at": datetime.now(UTC).isoformat(),
        "steps": [],
        "warnings": [],
    }

    run_command("generate_procedural_pack", ["python3", "scripts/generate_large_procedular_pack.py"], report)
    paths = procedural_level_paths()
    run_command(
        "render_procedural_previews",
        ["python3", "scripts/render_level_preview_images.py", *[project_relative(path) for path in paths]],
        report,
    )
    sync_manager_and_workspace(paths, report)
    run_command("export_learning_snapshot", ["python3", "scripts/export_procedural_learning_snapshot.py"], report)
    run_command("audit_learning", ["node", "scripts/audit_procedural_learning.mjs", "--output", project_relative(LEARNING_AUDIT_PATH)], report)
    run_command("replay_learning_scorer", ["node", "scripts/replay_procedural_learning_scorer.mjs", "--json", project_relative(LEARNING_REPLAY_PATH)], report)
    run_command("validate_levels", ["node", "scripts/validate-levels.mjs"], report)
    if args.sync_sheets:
        run_command("sync_sheets_local", ["npm", "run", "sync:sheets:local"], report, allow_timeout=True, timeout=180)

    learning_snapshot = load_json(LEARNING_SNAPSHOT_PATH) if LEARNING_SNAPSHOT_PATH.exists() else {}
    report["finished_at"] = datetime.now(UTC).isoformat()
    report["outputs"] = {
        "procedural_levels": [project_relative(path) for path in paths],
        "learning_snapshot": project_relative(LEARNING_SNAPSHOT_PATH) if LEARNING_SNAPSHOT_PATH.exists() else "",
        "learning_audit": project_relative(LEARNING_AUDIT_PATH) if LEARNING_AUDIT_PATH.exists() else "",
        "learning_replay": project_relative(LEARNING_REPLAY_PATH) if LEARNING_REPLAY_PATH.exists() else "",
        "manager_state": project_relative(MANAGER_STATE_PATH),
        "workspace_state": project_relative(WORKSPACE_STATE_PATH),
        "play_sessions_state": project_relative(PLAY_SESSIONS_STATE_PATH),
        "manager_snapshot": project_relative(MANAGER_SNAPSHOT_PATH),
        "manager_metadata": project_relative(MANAGER_METADATA_PATH),
        "procedural_queue": project_relative(PROCEDURAL_QUEUE_PATH),
    }
    report["learning_counts"] = {
        "approved": int(learning_snapshot.get("approved_count", 0)),
        "rejected": int(learning_snapshot.get("rejected_count", 0)),
        "corrections": int(learning_snapshot.get("corrections_count", 0)),
        "source": learning_snapshot.get("source", ""),
    }
    save_json(PROCEDURAL_REPORT_PATH, report)
    print(project_relative(PROCEDURAL_REPORT_PATH))


if __name__ == "__main__":
    main()

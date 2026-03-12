#!/usr/bin/env python3
import argparse
import json
from copy import copy
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TEMPLATE = Path("/Users/victoria.serrano/Downloads/Levels - feed the bear (1).xlsx")
DEFAULT_OUTPUT = ROOT / "output" / "spreadsheet" / "Levels_feed_the_bear_linked.xlsx"
AFTER_FEEDBACK_KEYS = [
    ("progressionA", "Progression a", ROOT / "progressions" / "progressionA_after_feedback.json"),
    ("progressionB", "Progression b", ROOT / "progressions" / "progressionB_after_feedback.json"),
    ("progressionC", "Progression c", ROOT / "progressions" / "progressionC_after_feedback.json"),
]
LEGACY_HEADERS = [
    "Position in Progression",
    "Level ID",
    "Name/Title",
    "Progression",
    "Difficulty",
    "Screenshot",
    "Code File Attachment",
    "need tweak",
    "Difficulty  playtest",
    "Column 9",
]
PROGRESSION_ALL_HEADERS = [
    "Progression",
    "Type",
    "Preview",
    "Link",
    "Name",
    "moves",
    "numberOfColors",
    "emptyTiles",
]
DB_HEADERS = [
    "saved_at",
    "progression_key",
    "progression_label",
    "slot",
    "level_file",
    "level_name",
    "difficulty",
    "board",
    "pairs",
    "blockers",
    "moves",
    "status",
    "changed",
    "notes",
    "source_path",
    "saved_path",
]
ITEM_HEADERS = [
    "id",
    "file",
    "progression_key",
    "slot",
    "difficulty",
    "board",
    "pairs",
    "blockers",
    "moves",
    "status",
    "changed",
    "notes",
    "source_path",
    "saved_path",
]


def load_json(path: Path):
    return json.loads(path.read_text())


def slug(stem: str) -> str:
    return stem.replace(".json", "").replace(".png", "")


def difficulty_from_level(level: dict) -> str:
    meta = level.get("meta") or {}
    value = (
        level.get("difficulty")
        or meta.get("difficulty")
        or meta.get("editor_difficulty")
        or level.get("difficultyTier")
    )
    if isinstance(value, str):
      return value.upper()
    if value == 1:
        return "EASY"
    if value == 2:
        return "MEDIUM"
    if value == 3:
        return "HARD"
    return ""


def level_dims(level: dict) -> tuple[int | None, int | None]:
    if "board_width" in level or "board_height" in level:
        return level.get("board_width"), level.get("board_height")
    if "board_size" in level:
        return level.get("board_size"), level.get("board_size")
    grid_size = level.get("gridSize") or {}
    if isinstance(grid_size, dict):
        return grid_size.get("cols"), grid_size.get("rows")
    return None, None


def pair_count(level: dict) -> int:
    pairs = level.get("pairs") or []
    if isinstance(pairs, list):
        return len(pairs)
    return 0


def blocker_count(level: dict) -> int:
    return len(level.get("blockers") or [])


def empty_tiles(level: dict) -> int:
    width, height = level_dims(level)
    if not width or not height:
        return blocker_count(level)
    blocked = blocker_count(level)
    occupied = pair_count(level) * 2 + blocked
    return max(width * height - occupied, 0)


def canonical_name(level_file: str, progression_label: str, slot_index: int, difficulty: str) -> str:
    stem = Path(level_file).stem
    clean_progression = progression_label.replace(" ", "")
    suffix = difficulty.title() if difficulty else "Unknown"
    return f"{clean_progression}_level{slot_index}_{suffix}_{stem}"


def find_level_path(file_name: str):
    direct = ROOT / "levels" / file_name
    if direct.exists():
        return direct
    tutorial = ROOT / file_name
    if tutorial.exists():
        return tutorial
    archive_root = ROOT / "archive" / "catalog_cleanup_20260312"
    if archive_root.exists():
        matches = list(archive_root.rglob(file_name))
        if matches:
            return matches[0]
    return None


def ensure_sheet(wb, title: str):
    if title in wb.sheetnames:
        return wb[title]
    return wb.create_sheet(title)


def clear_sheet(ws):
    ws.delete_rows(1, ws.max_row or 1)


def write_table(ws, headers, rows):
    clear_sheet(ws)
    ws.append(headers)
    header_fill = PatternFill("solid", fgColor="DCEAF7")
    for col, value in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col)
        cell.value = value
        cell.font = Font(bold=True)
        cell.fill = header_fill
    for row in rows:
        ws.append([row.get(key, "") for key in headers])
    for column_cells in ws.columns:
        length = max(len(str(cell.value or "")) for cell in column_cells[: min(len(column_cells), 80)])
        ws.column_dimensions[column_cells[0].column_letter].width = min(max(length + 2, 12), 42)
    ws.freeze_panes = "A2"


def preserve_links_sheet(src_wb, dst_wb):
    if "links" not in src_wb.sheetnames:
        return
    src = src_wb["links"]
    if "links" in dst_wb.sheetnames:
        del dst_wb["links"]
    dst = dst_wb.create_sheet("links")
    for row in src.iter_rows():
        for cell in row:
            target = dst[cell.coordinate]
            target.value = cell.value
            if cell.has_style:
                target.font = copy(cell.font)
                target.fill = copy(cell.fill)
                target.border = copy(cell.border)
                target.alignment = copy(cell.alignment)
                target.number_format = cell.number_format
                target.protection = copy(cell.protection)


def load_existing_legacy_sheet(template_wb):
    rows = []
    if "Sheet1" not in template_wb.sheetnames:
        return rows
    ws = template_wb["Sheet1"]
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not any(row[:7]):
            continue
        item = {LEGACY_HEADERS[i]: row[i] if i < len(row) else None for i in range(len(LEGACY_HEADERS))}
        if item["Progression"] == "Progression b" and item["Position in Progression"] == 10 and item["Code File Attachment"] == "progressionA_level10_hard.json":
            item["Code File Attachment"] = "progressionB_level10_hard.json"
        rows.append(item)
    return rows


def progression_all_lookup(template_wb):
    code_rows = {}
    image_rows = {}
    if "progression all" not in template_wb.sheetnames:
        return code_rows, image_rows
    ws = template_wb["progression all"]
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not any(row[:5]):
            continue
        progression, row_type, preview, link, name, moves, colors, empties = row[:8]
        record = {
            "Progression": progression,
            "Type": row_type,
            "Preview": preview,
            "Link": link,
            "Name": name,
            "moves": moves,
            "numberOfColors": colors,
            "emptyTiles": empties,
        }
        key = slug(str(name or ""))
        if row_type == "code":
            code_rows[key] = record
        elif row_type == "image":
            image_rows[key] = record
    return code_rows, image_rows


def build_after_feedback_progression_rows():
    rows = []
    assigned = set()
    seq = 1
    for progression_key, label, path in AFTER_FEEDBACK_KEYS:
        data = load_json(path)
        for slot_index, slot in enumerate(data["slots"], start=1):
            if slot_index == 1:
                tutorial_ref = data.get("tutorial_level_file") or "levels/tutorial_level.json"
                level_file = Path(tutorial_ref).name
                level = load_json(ROOT / tutorial_ref)
            else:
                level_file = Path(slot["level_file"]).name
                level = load_json(ROOT / slot["level_file"])
            assigned.add(level_file)
            difficulty = difficulty_from_level(level) or ["EASY", "MEDIUM", "HARD"][min((slot_index - 1) // 3, 2)]
            rows.append({
                "Position in Progression": slot_index,
                "Level ID": f"{seq:03d}",
                "Name/Title": canonical_name(level_file, label.replace(" ", ""), slot_index, difficulty),
                "Progression": label,
                "Difficulty": difficulty.title(),
                "Screenshot": "",
                "Code File Attachment": level_file,
                "need tweak": "no",
                "Difficulty  playtest": "",
                "Column 9": "",
            })
            seq += 1
    return rows, assigned


def build_extras_rows(assigned):
    catalog = load_json(ROOT / "levels" / "catalog_index.json")
    level_rows = catalog.get("levels", []) if isinstance(catalog, dict) else catalog
    rows = []
    seq = 1
    for item in level_rows:
        file_name = item.get("canonical_file") or item.get("file")
        if file_name in assigned or file_name == "tutorial_level.json":
            continue
        rows.append({
            "Position in Progression": "",
            "Level ID": f"E{seq:03d}",
            "Name/Title": Path(file_name).stem,
            "Progression": "Extras",
            "Difficulty": str(item.get("difficulty", "")).title(),
            "Screenshot": "",
            "Code File Attachment": file_name,
            "need tweak": "",
            "Difficulty  playtest": "",
            "Column 9": item.get("source_file", ""),
        })
        seq += 1
    return rows


def build_extras_rows_from_snapshot(snapshot):
    rows = []
    items = {item["id"]: item for item in snapshot.get("items", [])}
    extra_ids = snapshot.get("extra_item_ids", []) or []
    seq = 1
    for item_id in extra_ids:
      item = items.get(item_id)
      if not item:
          continue
      rows.append({
          "Position in Progression": "",
          "Level ID": f"E{seq:03d}",
          "Name/Title": Path(item.get("file", "")).stem,
          "Progression": "Extras",
          "Difficulty": str(item.get("difficulty", "")).title(),
          "Screenshot": "",
          "Code File Attachment": item.get("file", ""),
          "need tweak": "",
          "Difficulty  playtest": "",
          "Column 9": item.get("source_path", ""),
      })
      seq += 1
    return rows


def build_progression_all_rows(legacy_rows, template_code_lookup, template_image_lookup):
    rows = []
    progression_map = {
        "Progression a": "Progression1",
        "Progression b": "Progression2",
        "Progression c": "Progression3",
    }
    for row in legacy_rows:
        progression_label = row["Progression"]
        progression_key = progression_map.get(progression_label, progression_label)
        code_name = str(row["Code File Attachment"] or "")
        code_key = slug(code_name)
        code_template = template_code_lookup.get(code_key, {})
        image_template = template_image_lookup.get(slug(code_name.replace(".json", ".png")), {})
        level_path = find_level_path(code_name)
        level = load_json(level_path) if level_path else {}
        rows.append({
            "Progression": progression_key,
            "Type": "code",
            "Preview": code_name,
            "Link": "Open",
            "Name": code_name,
            "moves": code_template.get("moves", level.get("moves", "")),
            "numberOfColors": code_template.get("numberOfColors", pair_count(level) or ""),
            "emptyTiles": code_template.get("emptyTiles", empty_tiles(level) if level else ""),
        })
        rows.append({
            "Progression": progression_key,
            "Type": "image",
            "Preview": image_template.get("Preview", ""),
            "Link": "Open",
            "Name": code_name.replace(".json", ".png"),
            "moves": "",
            "numberOfColors": "",
            "emptyTiles": "",
        })
    return rows


def build_manager_db_rows(snapshot):
    rows = []
    saved_at = snapshot.get("saved_at", "")
    items_by_id = {item["id"]: item for item in snapshot.get("items", [])}
    for progression_key in snapshot.get("progression_order", []):
        progression = (snapshot.get("progressions") or {}).get(progression_key) or {}
        label = progression.get("label", progression_key)
        for slot_index, slot_entry in enumerate(progression.get("slots", []), start=1):
            if isinstance(slot_entry, dict):
                item_id = slot_entry.get("item_id")
                file_name = slot_entry.get("file", "")
                difficulty = slot_entry.get("difficulty", "")
                board = slot_entry.get("board", "")
                pairs = slot_entry.get("pairs", "")
                blockers = slot_entry.get("blockers", "")
                moves = slot_entry.get("moves", "")
                status = slot_entry.get("status", "")
                changed = "Yes" if slot_entry.get("changed") else "No"
                locked = slot_entry.get("locked")
                notes = slot_entry.get("notes", "")
                item = items_by_id.get(item_id) or {}
            else:
                item_id = slot_entry
                item = items_by_id.get(item_id) or {}
                file_name = item.get("file", "")
                difficulty = item.get("difficulty", "")
                board = item.get("board", "")
                pairs = item.get("pairs", "")
                blockers = item.get("blockers", "")
                moves = item.get("moves", "")
                status = item.get("status", "")
                changed = "Yes" if item.get("changed") else "No"
                locked = None
                notes = item.get("notes", "")
            if item_id is None and slot_index == 1:
                rows.append({
                    "saved_at": saved_at,
                    "progression_key": progression_key,
                    "progression_label": label,
                    "slot": slot_index,
                    "level_file": "tutorial_level.json",
                    "level_name": "Tutorial",
                    "difficulty": "EASY",
                    "board": "",
                    "pairs": "",
                    "blockers": "",
                    "moves": "",
                    "status": "",
                    "changed": "",
                    "notes": "",
                    "source_path": "",
                    "saved_path": "",
                })
                continue
            rows.append({
                "saved_at": saved_at,
                "progression_key": progression_key,
                "progression_label": label,
                "slot": slot_index,
                "level_file": file_name,
                "level_name": Path(file_name).stem if file_name else "",
                "difficulty": difficulty,
                "board": board,
                "pairs": pairs,
                "blockers": blockers,
                "moves": moves,
                "status": status or ("LOCKED" if locked and not file_name else ""),
                "changed": changed,
                "notes": notes,
                "source_path": item.get("source_path", ""),
                "saved_path": item.get("saved_path", ""),
            })
    return rows


def build_payload(legacy_rows, after_feedback_rows, extras_rows, progression_all_rows, snapshot):
    db_rows = build_manager_db_rows(snapshot)
    item_rows = build_manager_item_rows(snapshot)
    return {
        "afterFeedbackHeaders": LEGACY_HEADERS,
        "afterFeedbackRows": [[row.get(key, "") for key in LEGACY_HEADERS] for row in after_feedback_rows],
        "extrasHeaders": LEGACY_HEADERS,
        "extrasRows": [[row.get(key, "") for key in LEGACY_HEADERS] for row in extras_rows],
        "dbHeaders": DB_HEADERS,
        "dbRows": [[row.get(key, "") for key in DB_HEADERS] for row in db_rows],
        "itemHeaders": ITEM_HEADERS,
        "itemRows": [[row.get(key, "") for key in ITEM_HEADERS] for row in item_rows],
        "legacyHeaders": LEGACY_HEADERS,
        "legacyRows": [[row.get(key, "") for key in LEGACY_HEADERS] for row in legacy_rows],
        "progressionAllHeaders": PROGRESSION_ALL_HEADERS,
        "progressionAllRows": [[row.get(key, "") for key in PROGRESSION_ALL_HEADERS] for row in progression_all_rows],
    }


def build_manager_item_rows(snapshot):
    rows = []
    placement = {}
    extra_ids = set(snapshot.get("extra_item_ids", []) or [])
    for progression_key in snapshot.get("progression_order", []):
        progression = snapshot.get("progressions", {}).get(progression_key, {})
        for slot_index, slot_entry in enumerate(progression.get("slots", []), start=1):
            item_id = slot_entry.get("item_id") if isinstance(slot_entry, dict) else slot_entry
            if item_id is not None:
                placement[item_id] = (progression_key, slot_index)
    for item in snapshot.get("items", []):
        prog_key, slot = placement.get(item["id"], ("extras", "")) if item.get("id") in extra_ids else placement.get(item["id"], ("", ""))
        rows.append({
            "id": item.get("id", ""),
            "file": item.get("file", ""),
            "progression_key": prog_key,
            "slot": slot,
            "difficulty": item.get("difficulty", ""),
            "board": item.get("board", ""),
            "pairs": item.get("pairs", ""),
            "blockers": item.get("blockers", ""),
            "moves": item.get("moves", ""),
            "status": item.get("status", ""),
            "changed": "Yes" if item.get("changed") else "No",
            "notes": item.get("notes", ""),
            "source_path": item.get("source_path", ""),
            "saved_path": item.get("saved_path", ""),
        })
    return rows


def build_fallback_snapshot(after_feedback_rows, extras_rows):
    progressions = {}
    items = []
    item_id = 1
    item_lookup = {}
    for key, label, _ in AFTER_FEEDBACK_KEYS:
        progressions[key] = {"label": label.replace(" a", " A").replace(" b", " B").replace(" c", " C"), "slots": [None] * 10}
    for row in after_feedback_rows:
        progression_label = row["Progression"]
        key = {"Progression a": "progressionA", "Progression b": "progressionB", "Progression c": "progressionC"}[progression_label]
        slot = int(row["Position in Progression"])
        file_name = row["Code File Attachment"]
        level = load_json(ROOT / "levels" / file_name)
        level_w, level_h = level_dims(level)
        item = {
            "id": item_id,
            "file": file_name,
            "difficulty": row["Difficulty"].upper(),
            "board": f"{level_w}x{level_h}",
            "pairs": pair_count(level),
            "blockers": blocker_count(level),
            "moves": level.get("moves", ""),
            "status": "UNKNOWN",
            "changed": False,
            "notes": "",
            "source_path": f"levels/{file_name}",
            "saved_path": f"levels/{file_name}",
        }
        item_lookup[file_name] = item_id
        items.append(item)
        progressions[key]["slots"][slot - 1] = item_id
        item_id += 1
    for row in extras_rows:
        file_name = row["Code File Attachment"]
        level = load_json(ROOT / "levels" / file_name)
        level_w, level_h = level_dims(level)
        items.append({
            "id": item_id,
            "file": file_name,
            "difficulty": row["Difficulty"].upper(),
            "board": f"{level_w}x{level_h}",
            "pairs": pair_count(level),
            "blockers": blocker_count(level),
            "moves": level.get("moves", ""),
            "status": "UNKNOWN",
            "changed": False,
            "notes": "",
            "source_path": f"levels/{file_name}",
            "saved_path": f"levels/{file_name}",
        })
        item_id += 1
    return {
        "saved_at": "",
        "progression_order": ["progressionA", "progressionB", "progressionC"],
        "progressions": progressions,
        "items": items,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--template", default=str(DEFAULT_TEMPLATE))
    parser.add_argument("--snapshot")
    parser.add_argument("--payload-output")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    template_wb = load_workbook(args.template) if Path(args.template).exists() else Workbook()
    wb = load_workbook(args.template) if Path(args.template).exists() else Workbook()
    if "Sheet" in wb.sheetnames and wb["Sheet"].max_row == 1 and wb["Sheet"].max_column == 1 and wb["Sheet"]["A1"].value is None:
        del wb["Sheet"]

    legacy_rows = load_existing_legacy_sheet(template_wb)
    template_code, template_image = progression_all_lookup(template_wb)
    after_feedback_rows, assigned = build_after_feedback_progression_rows()
    extras_rows = build_extras_rows(assigned)
    progression_all_rows = build_progression_all_rows(legacy_rows, template_code, template_image)

    snapshot = None
    if args.snapshot and Path(args.snapshot).exists():
        snapshot = load_json(Path(args.snapshot))
    if not snapshot:
        snapshot = build_fallback_snapshot(after_feedback_rows, extras_rows)
    if snapshot.get("extra_item_ids"):
        extras_rows = build_extras_rows_from_snapshot(snapshot)

    write_table(ensure_sheet(wb, "Sheet1"), LEGACY_HEADERS, legacy_rows)
    write_table(ensure_sheet(wb, "progression all"), PROGRESSION_ALL_HEADERS, progression_all_rows)
    write_table(ensure_sheet(wb, "levels after feedback"), LEGACY_HEADERS, after_feedback_rows)
    write_table(ensure_sheet(wb, "extras"), LEGACY_HEADERS, extras_rows)
    write_table(ensure_sheet(wb, "level manager db"), DB_HEADERS, build_manager_db_rows(snapshot))
    write_table(ensure_sheet(wb, "level manager items"), ITEM_HEADERS, build_manager_item_rows(snapshot))
    preserve_links_sheet(template_wb, wb)
    wb.save(output_path)
    if args.payload_output:
        payload = build_payload(legacy_rows, after_feedback_rows, extras_rows, progression_all_rows, snapshot)
        Path(args.payload_output).write_text(json.dumps(payload, indent=2))
    print(output_path)


if __name__ == "__main__":
    main()

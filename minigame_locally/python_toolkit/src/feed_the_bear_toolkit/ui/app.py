from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any

from feed_the_bear_toolkit.domain.procedural import normalize_learning_buckets
from feed_the_bear_toolkit.domain.progressions import (
    default_progression_paths,
    load_live_progressions,
    load_manager_metadata,
)
from feed_the_bear_toolkit.domain.sessions import (
    default_session_paths,
    load_play_session_file,
    load_play_sessions_state,
)
from feed_the_bear_toolkit.services.config import canonical_repo_paths, find_project_root
from feed_the_bear_toolkit.services.spreadsheet import inspect_spreadsheet_status


PROGRESS_STEPS = (
    ("levels + validation", "done"),
    ("pack QA + serializer", "done"),
    ("repo I/O", "done"),
    ("progressions read/write", "done"),
    ("sessions + playtest", "done"),
    ("procedural parity", "in_progress"),
    ("spreadsheet adapters", "in_progress"),
    ("Python UI shell", "in_progress"),
)


def app_status() -> str:
    lines = ["Feed the Bear Python toolkit status"]
    for index, (label, state) in enumerate(PROGRESS_STEPS, start=1):
        lines.append(f"[{index}] {label:<28} {state}")
    return "\n".join(lines)


def build_status_snapshot(root: Path | None = None) -> dict[str, Any]:
    snapshot = build_app_snapshot(root)
    completed = sum(1 for item in snapshot["progress"] if item["state"] == "done")
    return {
        "title": "Feed the Bear Python toolkit status",
        "completed": completed,
        "total": len(snapshot["progress"]),
        "items": snapshot["progress"],
        "paths": snapshot["repo_paths"],
    }


def build_app_snapshot(root: Path | None = None) -> dict[str, Any]:
    project_root = root.resolve() if root is not None else find_project_root()
    repo_paths = canonical_repo_paths(project_root)
    progression_paths = default_progression_paths(project_root)
    session_paths = default_session_paths(project_root)

    live = load_live_progressions(progression_paths["live"]) if progression_paths["live"].exists() else {}
    metadata = load_manager_metadata(progression_paths["metadata"]) if progression_paths["metadata"].exists() else None
    play_session = load_play_session_file(session_paths["latest_playtest"]) if session_paths["latest_playtest"].exists() else None
    sessions_state = load_play_sessions_state(session_paths["sessions_state"]) if session_paths["sessions_state"].exists() else None
    learning_path = project_root / ".local" / "toolkit_state" / "learning_state.json"
    learning_payload: dict[str, Any] = {}
    if learning_path.exists():
        try:
            parsed_learning = json.loads(learning_path.read_text(encoding="utf-8-sig"))
        except (json.JSONDecodeError, OSError):
            parsed_learning = {}
        if isinstance(parsed_learning, dict):
            learning_payload = normalize_learning_buckets(parsed_learning)
    spreadsheet_status = inspect_spreadsheet_status(project_root)

    return {
        "root": str(project_root),
        "repo_paths": {key: str(value) for key, value in repo_paths.items()},
        "progress": [{"label": label, "state": state} for label, state in PROGRESS_STEPS],
        "live_progressions": {
            "count": len(live),
            "keys": sorted(live),
        },
        "manager_metadata": {
            "active_tab": metadata.active_tab if metadata else None,
            "selected_id": metadata.selected_id if metadata else None,
            "progression_order": metadata.progression_order if metadata else [],
            "counts": metadata.counts if metadata else {},
        },
        "play_session": {
            "saved_at": play_session.saved_at if play_session else None,
            "solved": play_session.solved if play_session else None,
            "selected_pair": play_session.selected_pair if play_session else None,
            "history_length": len(play_session.history) if play_session else 0,
            "path_count": len(play_session.paths) if play_session else 0,
            "board_width": play_session.level.get("board_width") if play_session else None,
            "board_height": play_session.level.get("board_height") if play_session else None,
            "level_name": (
                play_session.level.get("name")
                or play_session.level.get("id")
                or play_session.level.get("meta", {}).get("source_name")
                if play_session
                else None
            ),
        },
        "sessions_state": {
            "queue_count": len(sessions_state.queue) if sessions_state else 0,
            "pending_count": sum(1 for item in sessions_state.queue if item.review_status == "PENDING") if sessions_state else 0,
            "changed_count": sum(1 for item in sessions_state.queue if item.changed) if sessions_state else 0,
        },
        "procedural": {
            "learning_path": str(learning_path),
            "approved_count": len(learning_payload.get("approved") or []),
            "rejected_count": len(learning_payload.get("rejected") or []),
            "corrections_count": len(learning_payload.get("corrections") or []),
        },
        "spreadsheet": {
            "health": spreadsheet_status.health,
            "ready": spreadsheet_status.ready,
            "auth_mode": spreadsheet_status.auth.auth_mode,
            "credentials_exists": spreadsheet_status.auth.credentials_exists,
            "token_exists": spreadsheet_status.auth.token_exists,
            "command_keys": [spec.key for spec in spreadsheet_status.commands],
            "messages": list(spreadsheet_status.messages),
        },
        "defaults": {
            "inspect_level_path": "levels/Progression B · Level 2.json",
            "editor_output": "output/python_toolkit_checks/edited_level.json",
            "pack_folder": "levels/progression_g",
            "progression_path": "progressions/progression_g.json",
            "procedural_level_path": "levels/Progression B · Level 2.json",
            "procedural_level_number": 4,
            "procedural_reference_count": 3,
            "procedural_reference_pairs": "same",
            "procedural_reference_blockers": "same",
            "procedural_reference_board": "same",
            "session_batch_start": 1,
            "session_batch_end": 10,
            "session_batch_count": 12,
            "spreadsheet_credentials_path": ".local/google_oauth_client.json",
            "spreadsheet_token_path": ".local/google_sheets_token.json",
            "save_progression_output": "output/python_toolkit_checks/progression_g_roundtrip.json",
            "save_live_output": "output/python_toolkit_checks/manager_progressions_live_roundtrip.json",
            "save_metadata_output": "output/python_toolkit_checks/level_manager_metadata_roundtrip.json",
            "save_play_session_output": "output/python_toolkit_checks/latest_play_session_roundtrip.json",
            "save_sessions_state_output": "output/python_toolkit_checks/play_sessions_state_roundtrip.json",
            "learning_path": ".local/toolkit_state/learning_state.json",
            "spreadsheet_command": "sync_local",
        },
    }


def _json_for_html(value: Any) -> str:
    return html.escape(json.dumps(value, ensure_ascii=False))


def render_app_html(snapshot: dict[str, Any]) -> str:
    progress_html = "".join(
        f"<div class='progress-row'><span>{html.escape(item['label'])}</span><strong class='state {html.escape(item['state'])}'>{html.escape(item['state'])}</strong></div>"
        for item in snapshot["progress"]
    )
    defaults = snapshot["defaults"]
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Feed the Bear · Python UI</title>
  <style>
    :root {{
      --bg: #ecf2f8;
      --bg-2: #dfe9f4;
      --surface: #ffffff;
      --surface-2: #f4f8fc;
      --surface-3: #eef5fb;
      --text: #13273a;
      --muted: #5f768a;
      --line: #d3e0ec;
      --line-2: #c2d4e4;
      --accent: #0f7fae;
      --accent-strong: #0a5e87;
      --accent-soft: #d8eef7;
      --good: #1c8b58;
      --pending: #687482;
      --bad: #b33f27;
      --bad-soft: #fbe9e4;
      --warning: #99610b;
      --warning-soft: #fff3de;
      --sidebar-text: #e8f4ff;
      --sidebar-muted: #b6d4e8;
      --radius-lg: 20px;
      --radius-md: 14px;
      --radius-sm: 10px;
      --shadow-card: 0 18px 34px rgba(24, 64, 97, 0.1);
      --shadow-soft: 0 8px 18px rgba(15, 66, 102, 0.08);
    }}
    body[data-theme="dark"] {{
      --bg: #0f1720;
      --bg-2: #0b1118;
      --surface: #111d2a;
      --surface-2: #162635;
      --surface-3: #0f1d2b;
      --text: #e5f0f8;
      --muted: #9ab0c2;
      --line: #23384c;
      --line-2: #2d4760;
      --accent: #52b7e8;
      --accent-strong: #88d4f7;
      --accent-soft: #193347;
      --good: #66d39e;
      --pending: #9aa9b6;
      --bad: #f07f67;
      --bad-soft: #3b2020;
      --warning: #f0c06a;
      --warning-soft: #3c3017;
      --sidebar-text: #f2f8ff;
      --sidebar-muted: #a9c7db;
      --shadow-card: 0 18px 34px rgba(0, 0, 0, 0.35);
      --shadow-soft: 0 8px 18px rgba(0, 0, 0, 0.28);
    }}
    * {{ box-sizing: border-box; }}
    html, body {{ height: 100%; }}
    body {{
      margin: 0;
      font-family: "Avenir Next", "Sofia Pro", "Trebuchet MS", "Segoe UI", sans-serif;
      color: var(--text);
      background:
        radial-gradient(1200px 420px at 0% -10%, rgba(28, 139, 178, 0.22), transparent 55%),
        radial-gradient(900px 320px at 100% -8%, rgba(82, 167, 118, 0.18), transparent 55%),
        linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%);
      line-height: 1.35;
    }}
    .shell {{
      min-height: 100vh;
      display: grid;
      grid-template-columns: 300px minmax(0, 1fr);
      gap: 20px;
      padding: 20px;
    }}
    .panel {{
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
    }}
    .sidebar {{
      padding: 24px 20px;
      position: sticky;
      top: 20px;
      height: calc(100vh - 40px);
      overflow: auto;
      background:
        radial-gradient(420px 240px at 100% 0, rgba(126, 206, 245, 0.22), transparent 60%),
        linear-gradient(180deg, #0f3f5d 0%, #0a2f46 100%);
      border-color: rgba(159, 204, 231, 0.26);
    }}
    .sidebar h1 {{
      margin: 0 0 8px;
      color: #ffffff;
      font-size: 28px;
      line-height: 1.05;
      letter-spacing: -0.03em;
    }}
    .sidebar p {{
      margin: 0 0 18px;
      color: var(--sidebar-muted);
      line-height: 1.45;
      font-size: 14px;
    }}
    .progress-list {{
      display: grid;
      gap: 9px;
      margin-bottom: 20px;
    }}
    .progress-row {{
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(196, 229, 248, 0.16);
      color: var(--sidebar-text);
      font-size: 13px;
    }}
    .state {{
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
    }}
    .state.done {{ color: #84f3bd; }}
    .state.pending {{ color: #d5e7f6; }}
    .state.in_progress {{ color: #9fe6ff; }}
    .main {{
      display: grid;
      gap: 20px;
      align-content: start;
      min-width: 0;
    }}
    .hero {{
      padding: 26px 28px;
      color: white;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(460px 260px at 80% -12%, rgba(155, 230, 255, 0.24), transparent 62%),
        linear-gradient(135deg, #0c4c72 0%, #0e6f98 48%, #0d8a76 100%);
    }}
    .hero::after {{
      content: "";
      position: absolute;
      right: -54px;
      bottom: -74px;
      width: 260px;
      height: 260px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.24), transparent 72%);
      pointer-events: none;
    }}
    .hero h2 {{
      margin: 0 0 8px;
      font-size: 34px;
      line-height: 1.02;
      letter-spacing: -0.03em;
    }}
    .hero p {{
      margin: 0;
      max-width: 900px;
      color: rgba(236, 248, 255, 0.92);
      line-height: 1.5;
      font-size: 15px;
    }}
    .experience-controls {{
      margin-top: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }}
    .experience-toggle {{
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.35);
      color: #f7fcff;
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.03em;
      backdrop-filter: blur(4px);
    }}
    .experience-toggle:hover {{
      background: rgba(255, 255, 255, 0.24);
      border-color: rgba(255, 255, 255, 0.55);
      box-shadow: none;
      transform: translateY(0);
    }}
    .view-nav {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 14px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-3);
      border-top-left-radius: var(--radius-lg);
      border-top-right-radius: var(--radius-lg);
    }}
    .quickbar-wrap {{
      position: sticky;
      top: 10px;
      z-index: 12;
      margin: 10px 14px 0;
    }}
    .quickbar {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--surface) 90%, #ffffff 10%);
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(8px);
    }}
    .quickbar-group {{
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }}
    .quickbar-label {{
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 700;
      margin-right: 2px;
    }}
    .quick-btn {{
      padding: 8px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }}
    .nav-btn,
    button {{
      font: inherit;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line-2);
      background: #ffffff;
      color: var(--text);
      cursor: pointer;
      padding: 10px 12px;
      transition: 140ms ease;
      transition-property: transform, box-shadow, border-color, background, color;
    }}
    .nav-btn:hover,
    button:hover {{
      transform: translateY(-1px);
      border-color: #95bdd7;
      box-shadow: var(--shadow-soft);
    }}
    .nav-btn.active {{
      border-color: #6ab5d8;
      background: linear-gradient(180deg, #f0fbff 0%, #daf2fc 100%);
      color: #0a5f84;
      box-shadow: inset 3px 0 0 #2f9cca;
      font-weight: 700;
    }}
    button.primary {{
      border-color: #0f7fae;
      background: linear-gradient(180deg, #188cc0 0%, #0f6d9b 100%);
      color: #ffffff;
    }}
    button.primary:hover {{
      border-color: #0a628b;
      box-shadow: 0 10px 20px rgba(15, 127, 174, 0.28);
    }}
    button.secondary {{
      background: #ffffff;
      color: #13405a;
    }}
    .toolbar {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }}
    .stats {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }}
    .stat-card {{
      padding: 16px 18px;
      border-radius: var(--radius-md);
      background: linear-gradient(180deg, #ffffff 0%, #f8fcff 100%);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-soft);
    }}
    .stat-card strong {{
      display: block;
      font-size: 30px;
      margin-bottom: 4px;
      line-height: 1;
      letter-spacing: -0.04em;
    }}
    .stat-card span {{
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-weight: 700;
    }}
    .view {{
      display: none;
      padding: 18px;
    }}
    .view.active {{
      display: block;
      animation: fadeInUp 180ms ease;
    }}
    @keyframes fadeInUp {{
      from {{ opacity: 0; transform: translateY(4px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 18px;
    }}
    body[data-active-view="overview"] .view {{
      --view-gap: 18px;
    }}
    body[data-active-view="inspector"] .view {{
      --view-gap: 14px;
    }}
    body[data-active-view="packs"] .view {{
      --view-gap: 14px;
    }}
    body[data-active-view="automation"] .view {{
      --view-gap: 12px;
    }}
    body[data-active-view="sessions"] .view {{
      --view-gap: 12px;
    }}
    .view .grid,
    .view .split,
    .view .split-board {{
      gap: var(--view-gap, 18px);
    }}
    .card {{
      padding: 18px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-soft);
      min-width: 0;
    }}
    body.compact-ui .view {{ padding: 14px; }}
    body.compact-ui .card {{ padding: 14px; }}
    body.compact-ui .stats {{ gap: 8px; }}
    body.compact-ui .stat-card {{ padding: 12px 14px; }}
    body.compact-ui .stat-card strong {{ font-size: 24px; }}
    body.compact-ui .toolbar {{ margin-bottom: 8px; gap: 6px; }}
    body.compact-ui input,
    body.compact-ui textarea,
    body.compact-ui select {{ padding: 9px 10px; }}
    .card h3 {{
      margin: 0 0 8px;
      font-size: 20px;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }}
    .card p {{
      margin: 0 0 14px;
      color: var(--muted);
      line-height: 1.45;
      font-size: 14px;
    }}
    form {{
      display: grid;
      gap: 10px;
      margin-bottom: 12px;
    }}
    label {{
      display: grid;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }}
    input,
    textarea,
    select {{
      width: 100%;
      padding: 11px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: var(--surface-2);
      color: var(--text);
      font: inherit;
      min-width: 0;
      outline: none;
      transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
    }}
    input:focus,
    textarea:focus,
    select:focus {{
      border-color: #78b9d9;
      box-shadow: 0 0 0 3px rgba(16, 133, 181, 0.16);
      background: #ffffff;
    }}
    textarea {{
      min-height: 120px;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
      resize: vertical;
    }}
    .info-list {{
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }}
    .info-list li {{
      display: grid;
      gap: 4px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: var(--surface-2);
    }}
    .chips {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }}
    .chip {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: #ffffff;
      font-size: 12px;
      color: #143752;
      font-weight: 600;
    }}
    pre {{
      margin: 0;
      padding: 13px;
      border-radius: var(--radius-sm);
      border: 1px solid #163246;
      background: #071c2c;
      color: #d9eefc;
      overflow: auto;
      min-height: 150px;
      white-space: pre-wrap;
      word-break: break-word;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      font-size: 12px;
      line-height: 1.48;
      font-variant-numeric: tabular-nums;
    }}
    .pair-list {{
      display: grid;
      gap: 8px;
    }}
    .pair-list.table-like {{
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: #ffffff;
    }}
    .pair-row {{
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: #ffffff;
      font-size: 13px;
    }}
    .pair-list.table-like .pair-row {{
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
    }}
    .pair-list.table-like .pair-row:last-child {{
      border-bottom: 0;
    }}
    .board-shell {{
      display: grid;
      gap: 10px;
    }}
    .board-grid {{
      display: grid;
      gap: 6px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: linear-gradient(180deg, #fcfeff 0%, #f2f8fd 100%);
      align-self: start;
    }}
    .board-cell {{
      min-height: 44px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      display: grid;
      place-items: center;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.02em;
      background: #ffffff;
      color: var(--muted);
    }}
    .board-cell.node {{
      background: linear-gradient(180deg, #e2f4ff 0%, #cfe9f8 100%);
      color: var(--accent-strong);
      border-color: #a7cae2;
    }}
    .board-cell.blocker {{
      background: linear-gradient(180deg, #fcebe7 0%, #f6d8cf 100%);
      color: var(--bad);
      border-color: #edc2b5;
    }}
    .board-cell.clickable {{
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    }}
    .board-cell.clickable:hover {{
      transform: translateY(-1px);
      border-color: #7ab2d0;
      box-shadow: 0 8px 20px rgba(18, 112, 156, 0.15);
    }}
    .board-cell.selected {{
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }}
    .board-legend {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }}
    .split-board {{
      display: grid;
      gap: 18px;
      grid-template-columns: minmax(0, 1.1fr) minmax(290px, 0.9fr);
      align-items: start;
    }}
    .variant-list {{
      display: grid;
      gap: 12px;
    }}
    .variant-card {{
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: #ffffff;
      padding: 12px;
      display: grid;
      gap: 10px;
    }}
    .variant-head {{
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }}
    .variant-meta {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }}
    .issue-list {{
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }}
    .issue {{
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: #ffffff;
      font-size: 13px;
    }}
    .issue.error {{
      background: var(--bad-soft);
      border-color: #f0beb4;
      color: var(--bad);
    }}
    .issue.warning {{
      background: var(--warning-soft);
      border-color: #efd5a2;
      color: var(--warning);
    }}
    .table-wrap {{
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      overflow: auto;
      background: #ffffff;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      min-width: 640px;
    }}
    th, td {{
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      font-size: 12px;
      line-height: 1.45;
      font-variant-numeric: tabular-nums;
      vertical-align: top;
    }}
    thead th {{
      background: #f2f8fd;
      color: #20435d;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}
    tbody tr:hover {{
      background: #f8fcff;
    }}
    .split {{
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 18px;
      min-width: 0;
    }}
    body[data-active-view="automation"] .card p,
    body[data-active-view="sessions"] .card p {{
      font-size: 13px;
      line-height: 1.4;
    }}
    body[data-active-view="automation"] .chip,
    body[data-active-view="sessions"] .chip {{
      font-size: 11px;
    }}
    .editor-grid {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }}
    .editor-grid .full {{
      grid-column: 1 / -1;
    }}
    code {{
      background: #edf4fb;
      border: 1px solid #d3e2ef;
      border-radius: 8px;
      padding: 2px 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      color: #15324a;
    }}
    @media (max-width: 1200px) {{
      .shell {{ grid-template-columns: 1fr; }}
      .sidebar {{
        position: static;
        height: auto;
      }}
      .split {{ grid-template-columns: 1fr; }}
      .split-board {{ grid-template-columns: 1fr; }}
      .editor-grid {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar panel">
      <h1>Feed the Bear</h1>
      <p>Python-hosted toolkit shell for validation, inspection, progression QA, playtest persistence, procedural scoring, and spreadsheet orchestration.</p>
      <div class="progress-list">{''.join(f"<div class='progress-row'><span>{html.escape(item['label'])}</span><strong class='state {html.escape(item['state'])}'>{html.escape(item['state'])}</strong></div>" for item in snapshot['progress'])}</div>
    </aside>

    <main class="main">
      <section class="hero panel">
        <h2>Python UI Shell</h2>
        <p>This shell now focuses on the slices that are already ported in Python: interactive level inspection, pack QA, progression validation, and safe round-trip persistence.</p>
        <div class="experience-controls">
          <button type="button" id="theme-toggle" class="experience-toggle">Theme: Light</button>
          <button type="button" id="density-toggle" class="experience-toggle">Density: Comfort</button>
        </div>
      </section>

      <section class="stats">
        <article class="stat-card"><strong>{snapshot['live_progressions']['count']}</strong><span>Live progressions</span></article>
        <article class="stat-card"><strong>{snapshot['manager_metadata']['counts'].get('total_items', 0)}</strong><span>Manager items</span></article>
        <article class="stat-card"><strong>{snapshot['sessions_state']['queue_count']}</strong><span>Queued sessions</span></article>
        <article class="stat-card"><strong>{snapshot['play_session']['history_length']}</strong><span>Last history length</span></article>
        <article class="stat-card"><strong>{snapshot['procedural']['approved_count']}/{snapshot['procedural']['rejected_count']}</strong><span>Learning approved/rejected</span></article>
        <article class="stat-card"><strong>{html.escape(snapshot['spreadsheet']['health'])}</strong><span>Spreadsheet health</span></article>
      </section>

      <section class="panel">
        <div class="view-nav">
          <button class="nav-btn active" data-view="overview">Overview</button>
          <button class="nav-btn" data-view="inspector">Level Inspector</button>
          <button class="nav-btn" data-view="packs">Pack QA + Progressions</button>
          <button class="nav-btn" data-view="automation">Procedural + Spreadsheet</button>
          <button class="nav-btn" data-view="sessions">Sessions</button>
        </div>
        <div class="quickbar-wrap">
          <div class="quickbar">
            <div class="quickbar-group">
              <span class="quickbar-label">Jump</span>
              <button type="button" class="quick-btn" data-quick-nav="inspector">Inspector</button>
              <button type="button" class="quick-btn" data-quick-nav="packs">Packs</button>
              <button type="button" class="quick-btn" data-quick-nav="automation">Automation</button>
              <button type="button" class="quick-btn" data-quick-nav="sessions">Sessions</button>
            </div>
            <div class="quickbar-group">
              <span class="quickbar-label">Quick Actions</span>
              <button type="button" class="quick-btn" data-quick-action="inspect-level-validate">Validate level</button>
              <button type="button" class="quick-btn" data-quick-action="progression-validate-btn">Validate progression</button>
              <button type="button" class="quick-btn" data-quick-action="spreadsheet-status-btn">Spreadsheet status</button>
              <button type="button" class="quick-btn" data-quick-action="inspect-state-btn">Inspect queue</button>
            </div>
          </div>
        </div>

        <section id="view-overview" class="view active">
          <div class="grid">
            <article class="card">
              <h3>Current Snapshot</h3>
              <p>Quick status of the migrated Python slices and the current repo-facing state.</p>
              <pre id="overview-output">{_json_for_html(snapshot)}</pre>
            </article>
            <article class="card">
              <h3>Defaults</h3>
              <p>Starting paths used by the interactive tools below.</p>
              <ul class="info-list">
                <li><code>level</code><span>{html.escape(defaults['inspect_level_path'])}</span></li>
                <li><code>pack</code><span>{html.escape(defaults['pack_folder'])}</span></li>
                <li><code>progression</code><span>{html.escape(defaults['progression_path'])}</span></li>
              </ul>
            </article>
          </div>
        </section>

        <section id="view-inspector" class="view">
          <div class="split">
            <article class="card">
              <h3>Level Inspector</h3>
              <p>Inspect one level deeply: metadata, pairs, blockers, validation, and canonical JSON output.</p>
              <form id="level-inspector-form">
                <label>Level path
                  <input name="path" value="{html.escape(defaults['inspect_level_path'])}">
                </label>
                <div class="toolbar">
                  <button type="submit" class="primary">Inspect level</button>
                  <button type="button" class="secondary" id="inspect-level-validate">Validate only</button>
                  <button type="button" class="secondary" id="inspect-level-serialize">Canonical JSON</button>
                </div>
              </form>
              <div id="level-summary-stats" class="stats"></div>
              <div class="board-shell">
                <div class="board-legend" id="level-board-legend"></div>
                <div id="level-board" class="board-grid"></div>
              </div>
              <div id="level-pairs" class="pair-list table-like"></div>
              <div id="level-issues" class="issue-list"></div>
            </article>
            <article class="card">
              <h3>Mini Editor</h3>
              <p>Edit the board directly, preview validation/serialization, and save a safe round-trip artifact.</p>
              <form id="level-editor-form">
                <div class="editor-grid">
                  <label class="full">Source level path
                    <input name="source_path" value="{html.escape(defaults['inspect_level_path'])}">
                  </label>
                  <label>Id
                    <input name="id" value="">
                  </label>
                  <label>Difficulty tier
                    <input name="difficulty_tier" type="number" min="1" max="10" value="">
                  </label>
                  <label>Cols
                    <input name="cols" type="number" min="4" max="7" value="">
                  </label>
                  <label>Rows
                    <input name="rows" type="number" min="4" max="8" value="">
                  </label>
                  <label>Moves
                    <input name="moves" type="number" min="0" value="">
                  </label>
                  <label>Solution count
                    <input name="solution_count" type="number" min="0" value="">
                  </label>
                  <label>Target density
                    <input name="target_density" value="">
                  </label>
                  <label>Decal
                    <input name="decal" value="false">
                  </label>
                  <label>Selected pair
                    <select id="editor-pair-id"></select>
                  </label>
                  <label>Pair type
                    <input id="editor-pair-type" value="blue">
                  </label>
                  <label>Edit mode
                    <select id="editor-mode">
                      <option value="start">Place start</option>
                      <option value="end">Place end</option>
                      <option value="blocker">Toggle blocker</option>
                      <option value="erase">Erase</option>
                    </select>
                  </label>
                  <label class="full">Pairs JSON
                    <textarea name="pairs_json">[]</textarea>
                  </label>
                  <label class="full">Blockers JSON
                    <textarea name="blockers_json">[]</textarea>
                  </label>
                  <label class="full">Output path
                    <input name="output" value="{html.escape(defaults['editor_output'])}">
                  </label>
                </div>
                <div class="toolbar">
                  <button type="submit" class="primary">Preview edited level</button>
                  <button type="button" class="secondary" id="editor-save-btn">Save edited level</button>
                  <button type="button" class="secondary" id="editor-add-pair-btn">Add pair</button>
                  <button type="button" class="secondary" id="editor-remove-pair-btn">Remove pair</button>
                </div>
              </form>
              <div class="split-board">
                <div class="board-shell">
                  <div class="board-legend" id="editor-board-legend"></div>
                  <div id="editor-board" class="board-grid"></div>
                  <div id="editor-issues" class="issue-list"></div>
                </div>
                <div>
                  <h4>Editor pairs</h4>
                  <div id="editor-pairs" class="pair-list table-like"></div>
                </div>
              </div>
              <div id="editor-summary-stats" class="stats"></div>
              <pre id="level-output">Run the inspector to load level details.</pre>
            </article>
          </div>
        </section>

        <section id="view-packs" class="view">
          <div class="grid">
            <article class="card">
              <h3>Pack QA</h3>
              <p>Summarize a folder of levels and show board/pair distributions plus invalid entries.</p>
              <form id="pack-form">
                <label>Pack folder
                  <input name="folder" value="{html.escape(defaults['pack_folder'])}">
                </label>
                <div class="toolbar">
                  <button type="submit" class="primary">Summarize pack</button>
                  <button type="button" class="secondary" id="pack-validate-btn">Validate pack</button>
                </div>
              </form>
              <div id="pack-summary-stats" class="stats"></div>
              <div id="pack-table" class="table-wrap"></div>
              <pre id="pack-output">Run pack QA to inspect a folder.</pre>
            </article>

            <article class="card">
              <h3>Progressions</h3>
              <p>Inspect and validate one progression, or materialize round-trip outputs under <code>output/</code>.</p>
              <form id="progression-form">
                <label>Progression path
                  <input name="path" value="{html.escape(defaults['progression_path'])}">
                </label>
                <div class="toolbar">
                  <button type="submit" class="primary">Inspect progression</button>
                  <button type="button" class="secondary" id="progression-validate-btn">Validate progression</button>
                  <button type="button" class="secondary" id="progression-save-btn">Round-trip save</button>
                </div>
              </form>
              <div class="toolbar">
                <button type="button" class="secondary" id="manager-metadata-btn">Manager metadata</button>
                <button type="button" class="secondary" id="live-progressions-btn">Live progressions</button>
                <button type="button" class="secondary" id="save-live-progressions-btn">Save live snapshot</button>
              </div>
              <div id="progression-summary-chips" class="chips"></div>
              <pre id="progression-output">Inspect or validate a progression.</pre>
            </article>
          </div>
        </section>

        <section id="view-automation" class="view">
          <div class="grid">
            <article class="card">
              <h3>Procedural Boundary</h3>
              <p>The first Python procedural slice now covers learning normalization, guide analysis, deterministic scoring, and generation-adjustment hints.</p>
              <form id="procedural-form">
                <div class="editor-grid">
                  <label class="full">Level path
                    <input name="path" value="{html.escape(defaults['procedural_level_path'])}">
                  </label>
                  <label>Level number
                    <input name="level_number" type="number" min="1" value="{html.escape(str(defaults['procedural_level_number']))}">
                  </label>
                  <label>Learning path
                    <input name="learning_path" value="{html.escape(defaults['learning_path'])}">
                  </label>
                  <label>Reference count
                    <input name="reference_count" type="number" min="1" max="8" value="{html.escape(str(defaults['procedural_reference_count']))}">
                  </label>
                  <label>Pairs intent
                    <input name="pairs_intent" value="{html.escape(defaults['procedural_reference_pairs'])}">
                  </label>
                  <label>Blockers intent
                    <input name="blockers_intent" value="{html.escape(defaults['procedural_reference_blockers'])}">
                  </label>
                  <label>Board intent
                    <input name="board_intent" value="{html.escape(defaults['procedural_reference_board'])}">
                  </label>
                  <label>Seed offset
                    <input name="seed_offset" type="number" min="0" value="0">
                  </label>
                  <label>Attempt count
                    <input name="attempt_count" type="number" min="1" max="24" value="12">
                  </label>
                </div>
                <div class="toolbar">
                  <button type="button" class="primary" id="procedural-score-btn">Score level</button>
                  <button type="button" class="secondary" id="procedural-adjustments-btn">Adjustments</button>
                  <button type="button" class="secondary" id="procedural-reference-btn">Reference variants</button>
                  <button type="button" class="secondary" id="procedural-generate-raw-btn">Generate raw</button>
                  <button type="button" class="secondary" id="procedural-generate-best-btn">Generate best</button>
                </div>
              </form>
              <ul class="info-list">
                <li><code>learning file</code><span>{html.escape(snapshot['procedural']['learning_path'])}</span></li>
                <li><code>approved</code><span>{snapshot['procedural']['approved_count']}</span></li>
                <li><code>rejected</code><span>{snapshot['procedural']['rejected_count']}</span></li>
                <li><code>corrections</code><span>{snapshot['procedural']['corrections_count']}</span></li>
              </ul>
              <div id="procedural-variant-list" class="variant-list"></div>
              <pre id="procedural-output">{_json_for_html(snapshot['procedural'])}</pre>
            </article>

            <article class="card">
              <h3>Spreadsheet Adapter</h3>
              <p>Python now models spreadsheet readiness and wraps the current local-first sync commands without replacing the Google pipeline yet.</p>
              <form id="spreadsheet-form">
                <div class="editor-grid">
                  <label>Credentials path
                    <input name="credentials_path" value="{html.escape(defaults['spreadsheet_credentials_path'])}">
                  </label>
                  <label>Token path
                    <input name="token_path" value="{html.escape(defaults['spreadsheet_token_path'])}">
                  </label>
                </div>
                <div class="toolbar">
                  <button type="button" class="primary" id="spreadsheet-status-btn">Inspect status</button>
                  <button type="button" class="secondary" id="spreadsheet-sync-local-btn">Sync local</button>
                  <button type="button" class="secondary" id="spreadsheet-sync-push-btn">Sync push</button>
                  <button type="button" class="secondary" id="spreadsheet-sync-all-btn">Sync all</button>
                  <button type="button" class="secondary" id="spreadsheet-sync-drive-btn">Sync drive sheets</button>
                  <button type="button" class="secondary" id="spreadsheet-sync-apis-btn">Sync apis</button>
                  <button type="button" class="secondary" id="spreadsheet-renames-btn">Apply renames</button>
                  <button type="button" class="secondary" id="spreadsheet-check-env-btn">Check env</button>
                  <button type="button" class="secondary" id="spreadsheet-validate-env-btn">Validate env</button>
                  <button type="button" class="secondary" id="spreadsheet-disconnect-btn">Disconnect</button>
                  <button type="button" class="secondary" id="spreadsheet-clear-cache-btn">Clear cache</button>
                </div>
              </form>
              <div class="chips">
                <span class="chip">health: {html.escape(snapshot['spreadsheet']['health'])}</span>
                <span class="chip">ready: {'yes' if snapshot['spreadsheet']['ready'] else 'no'}</span>
                <span class="chip">auth: {html.escape(snapshot['spreadsheet']['auth_mode'] or 'none')}</span>
              </div>
              <ul class="info-list">
                <li><code>credentials</code><span>{'yes' if snapshot['spreadsheet']['credentials_exists'] else 'no'}</span></li>
                <li><code>token</code><span>{'yes' if snapshot['spreadsheet']['token_exists'] else 'no'}</span></li>
                <li><code>commands</code><span>{html.escape(', '.join(snapshot['spreadsheet']['command_keys']))}</span></li>
              </ul>
              <pre id="spreadsheet-output">{_json_for_html(snapshot['spreadsheet'])}</pre>
            </article>
          </div>
        </section>

        <section id="view-sessions" class="view">
          <div class="grid">
            <article class="card">
              <h3>Play Session</h3>
              <p>Inspect the latest saved play session and append dataset records when needed.</p>
              <div class="toolbar">
                <button type="button" class="primary" id="inspect-session-btn">Inspect latest session</button>
                <button type="button" class="secondary" id="save-session-btn">Save session snapshot</button>
                <button type="button" class="secondary" id="append-playtest-btn">Append playtest record</button>
              </div>
              <div id="session-summary-stats" class="stats"></div>
              <pre id="session-output">Inspect the latest play session.</pre>
            </article>

            <article class="card">
              <h3>Play Sessions Queue</h3>
              <p>Inspect the queue snapshot, generate a learned batch, and load candidates into the editor.</p>
              <form id="session-batch-form">
                <div class="editor-grid">
                  <label>Start level
                    <input name="start_level" type="number" min="1" max="10" value="{html.escape(str(defaults['session_batch_start']))}">
                  </label>
                  <label>End level
                    <input name="end_level" type="number" min="1" max="10" value="{html.escape(str(defaults['session_batch_end']))}">
                  </label>
                  <label>Count
                    <input name="count" type="number" min="1" max="50" value="{html.escape(str(defaults['session_batch_count']))}">
                  </label>
                </div>
              </form>
              <div class="toolbar">
                <button type="button" class="primary" id="inspect-state-btn">Inspect queue state</button>
                <button type="button" class="secondary" id="save-state-btn">Save queue state</button>
                <button type="button" class="secondary" id="session-generate-learned-btn">Generate learned batch</button>
              </div>
              <div id="state-summary-stats" class="stats"></div>
              <div id="session-batch-list" class="variant-list"></div>
              <pre id="state-output">Inspect the queue state.</pre>
            </article>
          </div>
        </section>
      </section>
    </main>
  </div>

  <script>
    const THEME_KEY = 'ftb_python_ui_theme';
    const DENSITY_KEY = 'ftb_python_ui_density';

    function setTheme(theme) {{
      const next = theme === 'dark' ? 'dark' : 'light';
      document.body.dataset.theme = next;
      localStorage.setItem(THEME_KEY, next);
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.textContent = `Theme: ${{next === 'dark' ? 'Dark' : 'Light'}}`;
    }}

    function setDensity(mode) {{
      const next = mode === 'compact' ? 'compact' : 'comfort';
      document.body.classList.toggle('compact-ui', next === 'compact');
      localStorage.setItem(DENSITY_KEY, next);
      const btn = document.getElementById('density-toggle');
      if (btn) btn.textContent = `Density: ${{next === 'compact' ? 'Compact' : 'Comfort'}}`;
    }}

    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    const savedDensity = localStorage.getItem(DENSITY_KEY) || 'comfort';
    setTheme(savedTheme);
    setDensity(savedDensity);

    document.getElementById('theme-toggle')?.addEventListener('click', () => {{
      const current = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
      setTheme(current === 'dark' ? 'light' : 'dark');
    }});

    document.getElementById('density-toggle')?.addEventListener('click', () => {{
      const compact = document.body.classList.contains('compact-ui');
      setDensity(compact ? 'comfort' : 'compact');
    }});

    const views = document.querySelectorAll('.view');
    const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    function activateView(viewName) {{
      const nextName = String(viewName || '').trim() || 'overview';
      document.body.dataset.activeView = nextName;
      navButtons.forEach((node) => node.classList.toggle('active', node.dataset.view === nextName));
      views.forEach((view) => view.classList.toggle('active', view.id === `view-${{nextName}}`));
    }}
    navButtons.forEach((button) => {{
      button.addEventListener('click', () => activateView(button.dataset.view));
    }});
    activateView('overview');

    document.querySelectorAll('[data-quick-nav]').forEach((button) => {{
      button.addEventListener('click', () => {{
        activateView(button.dataset.quickNav);
      }});
    }});
    document.querySelectorAll('[data-quick-action]').forEach((button) => {{
      button.addEventListener('click', () => {{
        const targetId = String(button.dataset.quickAction || '');
        const target = targetId ? document.getElementById(targetId) : null;
        if (!target) return;
        if (targetId.startsWith('inspect-level')) activateView('inspector');
        else if (targetId.startsWith('progression-')) activateView('packs');
        else if (targetId.startsWith('spreadsheet-')) activateView('automation');
        else if (targetId.startsWith('inspect-state')) activateView('sessions');
        target.click();
      }});
    }});

    async function requestJson(url, options) {{
      const response = await fetch(url, options);
      const payload = await response.json();
      if (!response.ok || payload.ok === false) {{
        throw new Error(payload.error || 'Request failed');
      }}
      return payload;
    }}

    function renderStats(targetId, items) {{
      const target = document.getElementById(targetId);
      target.innerHTML = items.map((item) => `<article class="stat-card"><strong>${{item.value}}</strong><span>${{item.label}}</span></article>`).join('');
    }}

    function renderPairs(targetId, pairs) {{
      const target = document.getElementById(targetId);
      target.innerHTML = (pairs || []).map((pair) => `
        <div class="pair-row">
          <strong>${{pair.id}}</strong>
          <span>${{pair.type || 'pair'}}</span>
          <span>[${{pair.start[0]}}, ${{pair.start[1]}}] → [${{pair.end[0]}}, ${{pair.end[1]}}]</span>
        </div>
      `).join('');
    }}

    function renderBoard(level) {{
      const host = document.getElementById('level-board');
      const legend = document.getElementById('level-board-legend');
      const cols = level.cols || 0;
      const rows = level.rows || 0;
      host.style.gridTemplateColumns = `repeat(${{cols}}, minmax(44px, 1fr))`;
      const cells = [];
      (level.cells || []).forEach((row) => row.forEach((cell) => cells.push(cell)));
      host.innerHTML = cells.map((cell) => `
        <div class="board-cell ${{cell.kind}}" title="r${{cell.row}} c${{cell.col}}">
          ${{cell.label || '&middot;'}}
        </div>
      `).join('');
      legend.innerHTML = `
        <span class="chip">grid ${{rows}}x${{cols}}</span>
        <span class="chip">nodes ${{(level.pairs || []).length * 2}}</span>
        <span class="chip">blockers ${{(level.blockers || []).length}}</span>
      `;
    }}

    function renderIssuesInto(targetId, validation) {{
      const host = document.getElementById(targetId);
      const errors = (validation?.errors || []).map((item) => `<div class="issue error">${{item}}</div>`);
      const warnings = (validation?.warnings || []).map((item) => `<div class="issue warning">${{item}}</div>`);
      host.innerHTML = [...errors, ...warnings].join('') || '<div class="issue">No validation issues.</div>';
    }}

    function renderIssues(validation) {{
      renderIssuesInto('level-issues', validation);
    }}

    function renderPackTable(entries) {{
      const host = document.getElementById('pack-table');
      if (!entries || !entries.length) {{
        host.innerHTML = '';
        return;
      }}
      host.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Path</th>
              <th>State</th>
              <th>Board</th>
              <th>Pairs</th>
              <th>Errors</th>
              <th>Warnings</th>
            </tr>
          </thead>
          <tbody>
            ${{entries.map((entry) => `
              <tr>
                <td>${{entry.path}}</td>
                <td><span class="chip">${{entry.valid ? 'valid' : 'invalid'}}</span></td>
                <td>${{entry.cols}}x${{entry.rows}}</td>
                <td>${{entry.pair_count}}</td>
                <td>${{entry.error_count}}</td>
                <td>${{entry.warning_count}}</td>
              </tr>
            `).join('')}}
          </tbody>
        </table>
      `;
    }}

    function renderChips(targetId, chips) {{
      const target = document.getElementById(targetId);
      target.innerHTML = (chips || []).map((chip) => `<span class="chip">${{chip}}</span>`).join('');
    }}

    const editorState = {{
      level: null,
      selectedPairId: 'A',
      mode: 'start',
    }};
    let proceduralVariants = [];
    let learnedBatchLevels = [];

    function cloneLevelForEditor(level) {{
      return {{
        id: level.id || '',
        difficulty_tier: Number(level.difficulty_tier || 1),
        cols: Number(level.cols || 5),
        rows: Number(level.rows || 5),
        moves: Number(level.moves || 0),
        solution_count: level.solution_count ?? '',
        target_density: level.target_density || '',
        decal: Boolean(level.decal),
        pairs: (level.pairs || []).map((pair) => ({{
          id: pair.id,
          type: pair.type || 'blue',
          start: [...pair.start],
          end: [...pair.end],
        }})),
        blockers: (level.blockers || []).map((cell) => [...cell]),
      }};
    }}

    function syncFormFromEditorState() {{
      const form = document.getElementById('level-editor-form');
      const level = editorState.level;
      if (!form || !level) return;
      form.elements.id.value = level.id || '';
      form.elements.difficulty_tier.value = level.difficulty_tier ?? '';
      form.elements.cols.value = level.cols ?? '';
      form.elements.rows.value = level.rows ?? '';
      form.elements.moves.value = level.moves ?? '';
      form.elements.solution_count.value = level.solution_count ?? '';
      form.elements.target_density.value = level.target_density ?? '';
      form.elements.decal.value = String(level.decal ?? false);
      form.elements.pairs_json.value = JSON.stringify((level.pairs || []).map((pair) => ({{
        id: pair.id,
        type: pair.type,
        start: pair.start,
        end: pair.end,
      }})), null, 2);
      form.elements.blockers_json.value = JSON.stringify(level.blockers || [], null, 2);
    }}

    function renderEditorPairSelect() {{
      const select = document.getElementById('editor-pair-id');
      if (!select) return;
      const pairs = editorState.level?.pairs || [];
      if (!pairs.length) {{
        select.innerHTML = '<option value="A">A</option>';
        editorState.selectedPairId = 'A';
        return;
      }}
      if (!pairs.some((pair) => pair.id === editorState.selectedPairId)) {{
        editorState.selectedPairId = pairs[0].id;
      }}
      select.innerHTML = pairs.map((pair) => `<option value="${{pair.id}}" ${{pair.id === editorState.selectedPairId ? 'selected' : ''}}>${{pair.id}}</option>`).join('');
      const selected = pairs.find((pair) => pair.id === editorState.selectedPairId);
      document.getElementById('editor-pair-type').value = selected?.type || 'blue';
    }}

    function renderEditorBoard() {{
      const host = document.getElementById('editor-board');
      const legend = document.getElementById('editor-board-legend');
      const level = editorState.level;
      if (!host || !legend || !level) {{
        if (host) host.innerHTML = '';
        if (legend) legend.innerHTML = '';
        return;
      }}
      host.style.gridTemplateColumns = `repeat(${{level.cols}}, minmax(44px, 1fr))`;
      const blockers = new Set((level.blockers || []).map((cell) => `${{cell[0]}},${{cell[1]}}`));
      const selectedPair = (level.pairs || []).find((pair) => pair.id === editorState.selectedPairId);
      const cells = [];
      for (let row = 0; row < level.rows; row += 1) {{
        for (let col = 0; col < level.cols; col += 1) {{
          let kind = 'empty';
          let label = '·';
          let selected = false;
          (level.pairs || []).forEach((pair) => {{
            if (pair.start[0] === row && pair.start[1] === col) {{
              kind = 'node';
              label = `${{pair.id}}1`;
              selected = pair.id === selectedPair?.id;
            }}
            if (pair.end[0] === row && pair.end[1] === col) {{
              kind = 'node';
              label = `${{pair.id}}2`;
              selected = pair.id === selectedPair?.id;
            }}
          }});
          if (kind === 'empty' && blockers.has(`${{row}},${{col}}`)) {{
            kind = 'blocker';
            label = 'X';
          }}
          cells.push(`<button type="button" class="board-cell clickable ${{kind}} ${{selected ? 'selected' : ''}}" data-row="${{row}}" data-col="${{col}}" title="r${{row}} c${{col}}">${{label}}</button>`);
        }}
      }}
      host.innerHTML = cells.join('');
      legend.innerHTML = `
        <span class="chip">grid ${{level.rows}}x${{level.cols}}</span>
        <span class="chip">pairs ${{(level.pairs || []).length}}</span>
        <span class="chip">blockers ${{(level.blockers || []).length}}</span>
        <span class="chip">mode ${{editorState.mode}}</span>
      `;
      renderPairs('editor-pairs', level.pairs || []);
    }}

    function removeEditorBlocker(row, col) {{
      editorState.level.blockers = (editorState.level.blockers || []).filter((cell) => !(cell[0] === row && cell[1] === col));
    }}

    function applyEditorCell(row, col) {{
      const level = editorState.level;
      if (!level) return;
      const selectedId = editorState.selectedPairId;
      const selected = (level.pairs || []).find((pair) => pair.id === selectedId);
      if (editorState.mode === 'blocker') {{
        const exists = (level.blockers || []).some((cell) => cell[0] === row && cell[1] === col);
        const occupiedByNode = (level.pairs || []).some((pair) =>
          (pair.start[0] === row && pair.start[1] === col) ||
          (pair.end[0] === row && pair.end[1] === col)
        );
        if (!occupiedByNode) {{
          level.blockers = exists
            ? level.blockers.filter((cell) => !(cell[0] === row && cell[1] === col))
            : [...(level.blockers || []), [row, col]];
        }}
      }} else if (editorState.mode === 'erase') {{
        removeEditorBlocker(row, col);
        level.pairs = (level.pairs || []).filter((pair) => {{
          const matchStart = pair.start[0] === row && pair.start[1] === col;
          const matchEnd = pair.end[0] === row && pair.end[1] === col;
          if (matchStart) pair.start = [-1, -1];
          if (matchEnd) pair.end = [-1, -1];
          return true;
        }});
      }} else {{
        if (!selected) return;
        removeEditorBlocker(row, col);
        level.pairs = (level.pairs || []).map((pair) => {{
          if (pair.id !== selectedId) return pair;
          const nextPair = {{ ...pair, type: document.getElementById('editor-pair-type').value || pair.type || 'blue' }};
          if (editorState.mode === 'start') nextPair.start = [row, col];
          if (editorState.mode === 'end') nextPair.end = [row, col];
          return nextPair;
        }});
      }}
      syncFormFromEditorState();
      renderEditorBoard();
    }}

    function loadLevelIntoEditor(level, sourcePath = '') {{
      if (!level) return;
      editorState.level = cloneLevelForEditor(level);
      if (sourcePath) {{
        document.getElementById('level-editor-form').elements.source_path.value = sourcePath;
      }}
      renderEditorPairSelect();
      syncFormFromEditorState();
      renderEditorBoard();
    }}

    function setEditorFormFromLevel(level, sourcePath = '') {{
      loadLevelIntoEditor(level, sourcePath || new FormData(document.getElementById('level-inspector-form')).get('path'));
    }}

    function hydrateVariantEntry(entry, sourceKind, index) {{
      return {{
        ...entry,
        sourceKind,
        status: entry.status || 'pending',
        discardReason: entry.discardReason || '',
        discardNote: entry.discardNote || '',
        discardPairs: Array.isArray(entry.discardPairs) ? [...entry.discardPairs] : [],
        output: entry.output || `output/python_toolkit_checks/${{(entry.name || `${{sourceKind}}_${{index + 1}}.json`).replace(/[^a-zA-Z0-9._-]+/g, '_')}}`,
      }};
    }}

    function renderVariantList(targetId, items, sourceKind) {{
      const host = document.getElementById(targetId);
      if (!host) return;
      if (!items || !items.length) {{
        host.innerHTML = '';
        return;
      }}
      host.innerHTML = items.map((item, index) => {{
        const details = item.level || {{}};
        const meta = [
          `board ${{details.cols}}x${{details.rows}}`,
          `pairs ${{details.pair_count ?? (details.pairs || []).length}}`,
          `blockers ${{details.blocker_count ?? (details.blockers || []).length}}`,
        ];
        if (item.total_rank !== undefined) meta.push(`rank ${{Number(item.total_rank).toFixed(3)}}`);
        return `
          <article class="variant-card">
            <div class="variant-head">
              <strong>${{item.name || `${{sourceKind}}_${{index + 1}}`}}</strong>
              <div class="variant-meta">
                <span class="chip">${{item.status || 'pending'}}</span>
                ${{meta.map((entry) => `<span class="chip">${{entry}}</span>`).join('')}}
              </div>
            </div>
            <label>Output path
              <input data-variant-output="${{sourceKind}}" data-index="${{index}}" value="${{item.output || ''}}">
            </label>
            <label>Discard reason
              <select data-variant-reason="${{sourceKind}}" data-index="${{index}}">
                <option value="">Select reason</option>
                <option value="paths_cross" ${{item.discardReason === 'paths_cross' ? 'selected' : ''}}>Paths cross</option>
                <option value="too_easy" ${{item.discardReason === 'too_easy' ? 'selected' : ''}}>Too easy</option>
                <option value="too_much_space" ${{item.discardReason === 'too_much_space' ? 'selected' : ''}}>Too much space</option>
                <option value="bad_layout" ${{item.discardReason === 'bad_layout' ? 'selected' : ''}}>Bad layout</option>
                <option value="meaningless_blockers" ${{item.discardReason === 'meaningless_blockers' ? 'selected' : ''}}>Meaningless blockers</option>
                <option value="custom_feedback" ${{item.discardReason === 'custom_feedback' ? 'selected' : ''}}>Custom feedback</option>
              </select>
            </label>
            <div class="variant-meta">
              ${{((details.pairs || []).map((pair) => `<button type="button" class="secondary" data-variant-pair="${{sourceKind}}" data-index="${{index}}" data-pair-id="${{pair.id}}">${{pair.id}}${{(item.discardPairs || []).includes(pair.id) ? ' *' : ''}}</button>`)).join('')}}
            </div>
            <label>Discard note
              <textarea data-variant-note="${{sourceKind}}" data-index="${{index}}" rows="2">${{item.discardNote || ''}}</textarea>
            </label>
            <div class="toolbar">
              <button type="button" class="secondary" data-load-variant="${{sourceKind}}" data-index="${{index}}">Open</button>
              <button type="button" class="secondary" data-keep-variant="${{sourceKind}}" data-index="${{index}}">Keep</button>
              <button type="button" class="secondary" data-save-variant="${{sourceKind}}" data-index="${{index}}">Save</button>
              <button type="button" class="secondary" data-discard-variant="${{sourceKind}}" data-index="${{index}}">Discard</button>
            </div>
          </article>
        `;
      }}).join('');
    }}

    async function inspectLevel(mode = 'inspect') {{
      const path = new FormData(document.getElementById('level-inspector-form')).get('path');
      const route = mode === 'validate' ? `/api/validate-level?path=${{encodeURIComponent(path)}}`
        : mode === 'serialize' ? `/api/serialize-level?path=${{encodeURIComponent(path)}}`
        : `/api/inspect-level?path=${{encodeURIComponent(path)}}`;
      const payload = await requestJson(route);
      if (mode === 'inspect') {{
        const level = payload.level;
        renderStats('level-summary-stats', [
          {{ label: 'Grid', value: `${{level.cols}}x${{level.rows}}` }},
          {{ label: 'Pairs', value: level.pair_count }},
          {{ label: 'Blockers', value: level.blocker_count }},
          {{ label: 'Tier', value: level.difficulty_tier ?? 'n/a' }},
          {{ label: 'Moves', value: level.moves ?? 'n/a' }},
          {{ label: 'Valid', value: payload.validation.valid ? 'yes' : 'no' }},
        ]);
        renderPairs('level-pairs', level.pairs);
        renderBoard(level);
        renderIssues(payload.validation);
        setEditorFormFromLevel(level, path);
      }} else if (mode === 'validate') {{
        renderIssues(payload.result);
      }}
      document.getElementById('level-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function previewEditedLevel(save = false) {{
      const data = Object.fromEntries(new FormData(document.getElementById('level-editor-form')).entries());
      const route = save ? '/api/save-level-edit' : '/api/preview-level-edit';
      const payload = await requestJson(route, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(data)
      }});
      const level = payload.level || {{}};
      renderStats('editor-summary-stats', [
        {{ label: 'Grid', value: `${{level.cols ?? 'n/a'}}x${{level.rows ?? 'n/a'}}` }},
        {{ label: 'Pairs', value: level.pair_count ?? 'n/a' }},
        {{ label: 'Blockers', value: level.blocker_count ?? 'n/a' }},
        {{ label: 'Tier', value: level.difficulty_tier ?? 'n/a' }},
        {{ label: 'Valid', value: payload.validation?.valid ? 'yes' : 'no' }},
        {{ label: 'Saved', value: save ? 'yes' : 'preview' }},
      ]);
      if (payload.level) {{
        renderPairs('level-pairs', level.pairs || []);
        renderBoard(level);
        renderIssues(payload.validation);
        loadLevelIntoEditor(level, data.source_path || '');
        renderIssuesInto('editor-issues', payload.validation);
      }}
      document.getElementById('level-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function summarizePack(validateOnly = false) {{
      const folder = new FormData(document.getElementById('pack-form')).get('folder');
      const route = validateOnly ? `/api/validate-levels-under?folder=${{encodeURIComponent(folder)}}`
        : `/api/summarize-level-pack?folder=${{encodeURIComponent(folder)}}`;
      const payload = await requestJson(route);
      const summary = payload.summary;
      renderStats('pack-summary-stats', [
        {{ label: 'Files', value: summary.file_count }},
        {{ label: 'Valid', value: summary.valid_count }},
        {{ label: 'Invalid', value: summary.invalid_count }},
      ]);
      renderPackTable(summary.entries || []);
      document.getElementById('pack-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function inspectProgression(mode = 'inspect') {{
      const path = new FormData(document.getElementById('progression-form')).get('path');
      if (mode === 'save') {{
        const payload = await requestJson('/api/save-progression', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ path, output: {json.dumps(defaults['save_progression_output'])} }})
        }});
        document.getElementById('progression-output').textContent = JSON.stringify(payload, null, 2);
        return;
      }}
      const route = mode === 'validate'
        ? `/api/validate-progression?path=${{encodeURIComponent(path)}}`
        : `/api/inspect-progression?path=${{encodeURIComponent(path)}}`;
      const payload = await requestJson(route);
      if (mode === 'inspect') {{
        renderChips('progression-summary-chips', [
          `name: ${{payload.progression.name}}`,
          `slots: ${{payload.progression.slot_count}}`,
          `assigned: ${{payload.progression.assigned_slots}}`,
          `locked: ${{payload.progression.locked}}`
        ]);
      }} else {{
        renderChips('progression-summary-chips', [
          `checked: ${{payload.summary.checked_levels}}`,
          `valid: ${{payload.summary.valid_levels}}`,
          `invalid: ${{payload.summary.invalid_levels}}`,
          `missing: ${{payload.summary.missing_levels}}`
        ]);
      }}
      document.getElementById('progression-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function loadManager(kind) {{
      const route = kind === 'metadata' ? '/api/inspect-manager-metadata' : '/api/inspect-live-progressions';
      const payload = await requestJson(route);
      if (kind === 'live') {{
        renderChips('progression-summary-chips', (payload.keys || []).map((key) => `live: ${{key}}`));
      }}
      document.getElementById('progression-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function saveManager(kind) {{
      const route = kind === 'live' ? '/api/save-live-progressions' : '/api/save-manager-metadata';
      const output = kind === 'live' ? {json.dumps(defaults['save_live_output'])} : {json.dumps(defaults['save_metadata_output'])};
      const payload = await requestJson(route, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ output }})
      }});
      document.getElementById('progression-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function inspectSession() {{
      const payload = await requestJson('/api/inspect-play-session');
      renderStats('session-summary-stats', [
        {{ label: 'Solved', value: payload.session.solved ? 'yes' : 'no' }},
        {{ label: 'Board', value: `${{payload.session.board_width}}x${{payload.session.board_height}}` }},
        {{ label: 'History', value: payload.session.history_length }},
        {{ label: 'Paths', value: payload.session.path_count }},
      ]);
      document.getElementById('session-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function mutateSession(kind) {{
      const route = kind === 'save' ? '/api/save-play-session' : '/api/append-playtest-record';
      const body = kind === 'save'
        ? {{ output: {json.dumps(defaults['save_play_session_output'])} }}
        : {{ origin: 'python_ui' }};
      const payload = await requestJson(route, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(body)
      }});
      document.getElementById('session-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function inspectState(save = false) {{
      if (save) {{
        const payload = await requestJson('/api/save-play-sessions-state', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ output: {json.dumps(defaults['save_sessions_state_output'])} }})
        }});
        document.getElementById('state-output').textContent = JSON.stringify(payload, null, 2);
        return;
      }}
      const payload = await requestJson('/api/inspect-play-sessions-state');
      renderStats('state-summary-stats', [
        {{ label: 'Queue', value: payload.state.queue_count }},
        {{ label: 'Pending', value: payload.state.pending_count }},
        {{ label: 'Changed', value: payload.state.changed_count }},
      ]);
      document.getElementById('state-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function generateLearnedBatch() {{
      const data = automationFormData('session-batch-form');
      const learningPath = automationFormData('procedural-form').learning_path || {json.dumps(defaults['learning_path'])};
      const payload = await requestJson(`/api/procedural-generate-batch?start_level=${{encodeURIComponent(data.start_level || {json.dumps(defaults['session_batch_start'])})}}&end_level=${{encodeURIComponent(data.end_level || {json.dumps(defaults['session_batch_end'])})}}&count=${{encodeURIComponent(data.count || {json.dumps(defaults['session_batch_count'])})}}&learning_path=${{encodeURIComponent(learningPath)}}`);
      learnedBatchLevels = (payload.levels || []).map((entry, index) => hydrateVariantEntry(entry, 'batch', index));
      renderVariantList('session-batch-list', learnedBatchLevels, 'batch');
      renderStats('state-summary-stats', [
        {{ label: 'Requested', value: payload.requested_count }},
        {{ label: 'Produced', value: payload.produced_count }},
        {{ label: 'Attempts', value: payload.attempts }},
      ]);
      document.getElementById('state-output').textContent = JSON.stringify(payload, null, 2);
    }}

    function automationFormData(formId) {{
      return Object.fromEntries(new FormData(document.getElementById(formId)).entries());
    }}

    async function runProcedural(kind) {{
      const data = automationFormData('procedural-form');
      const path = data.path || {json.dumps(defaults['procedural_level_path'])};
      const learningPath = data.learning_path || {json.dumps(defaults['learning_path'])};
      const route = kind === 'adjustments'
        ? `/api/procedural-adjustments?level_number=${{encodeURIComponent(data.level_number || {json.dumps(defaults['procedural_level_number'])})}}&learning_path=${{encodeURIComponent(learningPath)}}`
        : kind === 'reference'
          ? `/api/procedural-reference-variants?path=${{encodeURIComponent(path)}}&learning_path=${{encodeURIComponent(learningPath)}}&count=${{encodeURIComponent(data.reference_count || {json.dumps(defaults['procedural_reference_count'])})}}&pairs=${{encodeURIComponent(data.pairs_intent || {json.dumps(defaults['procedural_reference_pairs'])})}}&blockers=${{encodeURIComponent(data.blockers_intent || {json.dumps(defaults['procedural_reference_blockers'])})}}&board=${{encodeURIComponent(data.board_intent || {json.dumps(defaults['procedural_reference_board'])})}}`
          : kind === 'generate_raw'
            ? `/api/procedural-generate-raw?level_number=${{encodeURIComponent(data.level_number || {json.dumps(defaults['procedural_level_number'])})}}&seed_offset=${{encodeURIComponent(data.seed_offset || 0)}}&learning_path=${{encodeURIComponent(learningPath)}}`
            : kind === 'generate_best'
              ? `/api/procedural-generate-level?level_number=${{encodeURIComponent(data.level_number || {json.dumps(defaults['procedural_level_number'])})}}&attempts=${{encodeURIComponent(data.attempt_count || 12)}}&learning_path=${{encodeURIComponent(learningPath)}}`
          : `/api/procedural-score-level?path=${{encodeURIComponent(path)}}&learning_path=${{encodeURIComponent(learningPath)}}`;
      const payload = await requestJson(route);
      if (kind === 'reference') {{
        proceduralVariants = (payload.variants || []).map((entry, index) => hydrateVariantEntry(entry, 'procedural', index));
        renderVariantList('procedural-variant-list', proceduralVariants, 'procedural');
      }} else if (kind === 'generate_raw' || kind === 'generate_best') {{
        proceduralVariants = [{{
          name: kind === 'generate_raw' ? `raw_${{payload.level_number}}_${{payload.seed_offset}}.json` : `best_${{payload.level_number}}.json`,
          level: payload.level,
          canonical_json: payload.canonical_json,
          source_kind: kind,
        }}].map((entry, index) => hydrateVariantEntry(entry, 'procedural', index));
        renderVariantList('procedural-variant-list', proceduralVariants, 'procedural');
      }}
      document.getElementById('procedural-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function inspectSpreadsheet() {{
      const data = automationFormData('spreadsheet-form');
      const route = `/api/spreadsheet-status?credentials_path=${{encodeURIComponent(data.credentials_path || {json.dumps(defaults['spreadsheet_credentials_path'])})}}&token_path=${{encodeURIComponent(data.token_path || {json.dumps(defaults['spreadsheet_token_path'])})}}`;
      const payload = await requestJson(route);
      document.getElementById('spreadsheet-output').textContent = JSON.stringify(payload, null, 2);
    }}

    async function runSpreadsheet(key) {{
      const data = automationFormData('spreadsheet-form');
      const payload = await requestJson('/api/spreadsheet-run', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{
          key,
          args: [],
          credentials_path: data.credentials_path || {json.dumps(defaults['spreadsheet_credentials_path'])},
          token_path: data.token_path || {json.dumps(defaults['spreadsheet_token_path'])},
        }})
      }});
      document.getElementById('spreadsheet-output').textContent = JSON.stringify(payload, null, 2);
      if (data.credentials_path || data.token_path) {{
        await inspectSpreadsheet().catch(showError);
      }}
    }}

    async function saveVariant(entry) {{
      const payload = await requestJson('/api/save-procedural-candidate', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{
          output: entry.output,
          canonical_json: entry.canonical_json,
        }})
      }});
      entry.status = 'saved';
      document.getElementById('procedural-output').textContent = JSON.stringify(payload, null, 2);
    }}

    function variantPool(kind) {{
      return kind === 'batch' ? learnedBatchLevels : proceduralVariants;
    }}

    async function spreadsheetLocalAction(kind) {{
      const data = automationFormData('spreadsheet-form');
      const route = kind === 'disconnect' ? '/api/spreadsheet-disconnect' : '/api/spreadsheet-clear-cache';
      const body = kind === 'disconnect'
        ? {{ token_path: data.token_path || {json.dumps(defaults['spreadsheet_token_path'])} }}
        : {{}};
      const payload = await requestJson(route, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(body)
      }});
      document.getElementById('spreadsheet-output').textContent = JSON.stringify(payload, null, 2);
      await inspectSpreadsheet().catch(showError);
    }}

    document.getElementById('level-inspector-form').addEventListener('submit', async (event) => {{ event.preventDefault(); inspectLevel('inspect').catch(showError); }});
    document.getElementById('inspect-level-validate').addEventListener('click', () => inspectLevel('validate').catch(showError));
    document.getElementById('inspect-level-serialize').addEventListener('click', () => inspectLevel('serialize').catch(showError));
    document.getElementById('level-editor-form').addEventListener('submit', async (event) => {{ event.preventDefault(); previewEditedLevel(false).catch(showError); }});
    document.getElementById('editor-save-btn').addEventListener('click', () => previewEditedLevel(true).catch(showError));
    document.getElementById('pack-form').addEventListener('submit', async (event) => {{ event.preventDefault(); summarizePack(false).catch(showError); }});
    document.getElementById('pack-validate-btn').addEventListener('click', () => summarizePack(true).catch(showError));
    document.getElementById('progression-form').addEventListener('submit', async (event) => {{ event.preventDefault(); inspectProgression('inspect').catch(showError); }});
    document.getElementById('progression-validate-btn').addEventListener('click', () => inspectProgression('validate').catch(showError));
    document.getElementById('progression-save-btn').addEventListener('click', () => inspectProgression('save').catch(showError));
    document.getElementById('manager-metadata-btn').addEventListener('click', () => loadManager('metadata').catch(showError));
    document.getElementById('live-progressions-btn').addEventListener('click', () => loadManager('live').catch(showError));
    document.getElementById('save-live-progressions-btn').addEventListener('click', () => saveManager('live').catch(showError));
    document.getElementById('inspect-session-btn').addEventListener('click', () => inspectSession().catch(showError));
    document.getElementById('save-session-btn').addEventListener('click', () => mutateSession('save').catch(showError));
    document.getElementById('append-playtest-btn').addEventListener('click', () => mutateSession('append').catch(showError));
    document.getElementById('inspect-state-btn').addEventListener('click', () => inspectState(false).catch(showError));
    document.getElementById('save-state-btn').addEventListener('click', () => inspectState(true).catch(showError));
    document.getElementById('session-generate-learned-btn').addEventListener('click', () => generateLearnedBatch().catch(showError));
    document.getElementById('procedural-score-btn').addEventListener('click', () => runProcedural('score').catch(showError));
    document.getElementById('procedural-adjustments-btn').addEventListener('click', () => runProcedural('adjustments').catch(showError));
    document.getElementById('procedural-reference-btn').addEventListener('click', () => runProcedural('reference').catch(showError));
    document.getElementById('procedural-generate-raw-btn').addEventListener('click', () => runProcedural('generate_raw').catch(showError));
    document.getElementById('procedural-generate-best-btn').addEventListener('click', () => runProcedural('generate_best').catch(showError));
    document.getElementById('spreadsheet-status-btn').addEventListener('click', () => inspectSpreadsheet().catch(showError));
    document.getElementById('spreadsheet-sync-local-btn').addEventListener('click', () => runSpreadsheet('sync_local').catch(showError));
    document.getElementById('spreadsheet-sync-push-btn').addEventListener('click', () => runSpreadsheet('sync_push').catch(showError));
    document.getElementById('spreadsheet-sync-all-btn').addEventListener('click', () => runSpreadsheet('sync_all').catch(showError));
    document.getElementById('spreadsheet-sync-drive-btn').addEventListener('click', () => runSpreadsheet('sync_drive_sheets').catch(showError));
    document.getElementById('spreadsheet-sync-apis-btn').addEventListener('click', () => runSpreadsheet('sync_apis').catch(showError));
    document.getElementById('spreadsheet-renames-btn').addEventListener('click', () => runSpreadsheet('apply_sheet_renames').catch(showError));
    document.getElementById('spreadsheet-check-env-btn').addEventListener('click', () => runSpreadsheet('check_env').catch(showError));
    document.getElementById('spreadsheet-validate-env-btn').addEventListener('click', () => runSpreadsheet('validate_env_local').catch(showError));
    document.getElementById('spreadsheet-disconnect-btn').addEventListener('click', () => spreadsheetLocalAction('disconnect').catch(showError));
    document.getElementById('spreadsheet-clear-cache-btn').addEventListener('click', () => spreadsheetLocalAction('clear_cache').catch(showError));
    document.getElementById('editor-pair-id').addEventListener('change', (event) => {{
      editorState.selectedPairId = event.target.value;
      renderEditorPairSelect();
      renderEditorBoard();
    }});
    document.getElementById('editor-pair-type').addEventListener('change', (event) => {{
      if (!editorState.level) return;
      editorState.level.pairs = (editorState.level.pairs || []).map((pair) => pair.id === editorState.selectedPairId ? {{ ...pair, type: event.target.value || pair.type }} : pair);
      syncFormFromEditorState();
      renderEditorBoard();
    }});
    document.getElementById('editor-mode').addEventListener('change', (event) => {{
      editorState.mode = event.target.value || 'start';
      renderEditorBoard();
    }});
    document.getElementById('editor-add-pair-btn').addEventListener('click', () => {{
      if (!editorState.level) return;
      const nextCode = String.fromCharCode(65 + (editorState.level.pairs || []).length);
      editorState.level.pairs = [...(editorState.level.pairs || []), {{ id: nextCode, type: 'blue', start: [-1, -1], end: [-1, -1] }}];
      editorState.selectedPairId = nextCode;
      renderEditorPairSelect();
      syncFormFromEditorState();
      renderEditorBoard();
    }});
    document.getElementById('editor-remove-pair-btn').addEventListener('click', () => {{
      if (!editorState.level) return;
      editorState.level.pairs = (editorState.level.pairs || []).filter((pair) => pair.id !== editorState.selectedPairId);
      editorState.selectedPairId = editorState.level.pairs?.[0]?.id || 'A';
      renderEditorPairSelect();
      syncFormFromEditorState();
      renderEditorBoard();
    }});
    document.getElementById('editor-board').addEventListener('click', (event) => {{
      const target = event.target.closest('[data-row][data-col]');
      if (!target) return;
      applyEditorCell(Number(target.dataset.row), Number(target.dataset.col));
    }});
    document.body.addEventListener('click', (event) => {{
      const target = event.target.closest('[data-load-variant]');
      if (!target) return;
      const sourceKind = target.dataset.loadVariant;
      const index = Number(target.dataset.index || 0);
      const pool = sourceKind === 'batch' ? learnedBatchLevels : proceduralVariants;
      const entry = pool[index];
      if (!entry?.level) return;
      loadLevelIntoEditor(entry.level, entry.name || '');
      document.querySelector('[data-view="inspector"]')?.click();
    }});
    document.body.addEventListener('change', (event) => {{
      const outputTarget = event.target.closest('[data-variant-output]');
      if (outputTarget) {{
        const pool = variantPool(outputTarget.dataset.variantOutput);
        const entry = pool[Number(outputTarget.dataset.index || 0)];
        if (entry) entry.output = outputTarget.value;
        return;
      }}
      const reasonTarget = event.target.closest('[data-variant-reason]');
      if (reasonTarget) {{
        const pool = variantPool(reasonTarget.dataset.variantReason);
        const entry = pool[Number(reasonTarget.dataset.index || 0)];
        if (entry) entry.discardReason = reasonTarget.value;
      }}
    }});
    document.body.addEventListener('input', (event) => {{
      const noteTarget = event.target.closest('[data-variant-note]');
      if (!noteTarget) return;
      const pool = variantPool(noteTarget.dataset.variantNote);
      const entry = pool[Number(noteTarget.dataset.index || 0)];
      if (entry) entry.discardNote = noteTarget.value;
    }});
    document.body.addEventListener('click', (event) => {{
      const pairTarget = event.target.closest('[data-variant-pair]');
      if (pairTarget) {{
        const pool = variantPool(pairTarget.dataset.variantPair);
        const entry = pool[Number(pairTarget.dataset.index || 0)];
        if (!entry) return;
        const pairId = pairTarget.dataset.pairId;
        entry.discardPairs = (entry.discardPairs || []).includes(pairId)
          ? entry.discardPairs.filter((item) => item !== pairId)
          : [...(entry.discardPairs || []), pairId];
        renderVariantList(pairTarget.dataset.variantPair === 'batch' ? 'session-batch-list' : 'procedural-variant-list', pool, pairTarget.dataset.variantPair);
        return;
      }}
      const keepTarget = event.target.closest('[data-keep-variant]');
      if (keepTarget) {{
        const pool = variantPool(keepTarget.dataset.keepVariant);
        const entry = pool[Number(keepTarget.dataset.index || 0)];
        if (entry) {{
          entry.status = 'kept';
          renderVariantList(keepTarget.dataset.keepVariant === 'batch' ? 'session-batch-list' : 'procedural-variant-list', pool, keepTarget.dataset.keepVariant);
        }}
        return;
      }}
      const saveTarget = event.target.closest('[data-save-variant]');
      if (saveTarget) {{
        const pool = variantPool(saveTarget.dataset.saveVariant);
        const entry = pool[Number(saveTarget.dataset.index || 0)];
        if (entry) {{
          saveVariant(entry)
            .then(() => renderVariantList(saveTarget.dataset.saveVariant === 'batch' ? 'session-batch-list' : 'procedural-variant-list', pool, saveTarget.dataset.saveVariant))
            .catch(showError);
        }}
        return;
      }}
      const discardTarget = event.target.closest('[data-discard-variant]');
      if (discardTarget) {{
        const pool = variantPool(discardTarget.dataset.discardVariant);
        const entry = pool[Number(discardTarget.dataset.index || 0)];
        if (entry) {{
          entry.status = 'discarded';
          renderVariantList(discardTarget.dataset.discardVariant === 'batch' ? 'session-batch-list' : 'procedural-variant-list', pool, discardTarget.dataset.discardVariant);
          document.getElementById('procedural-output').textContent = JSON.stringify({{
            action: 'discard',
            name: entry.name,
            reason: entry.discardReason,
            note: entry.discardNote,
            pairs: entry.discardPairs,
          }}, null, 2);
        }}
      }}
    }});

    function showError(error) {{
      const text = String(error);
      document.getElementById('level-output').textContent = text;
      document.getElementById('pack-output').textContent = text;
      document.getElementById('progression-output').textContent = text;
      document.getElementById('procedural-output').textContent = text;
      document.getElementById('spreadsheet-output').textContent = text;
      document.getElementById('session-output').textContent = text;
      document.getElementById('state-output').textContent = text;
    }}
    renderEditorPairSelect();
  </script>
</body>
</html>"""

#!/usr/bin/env python3
"""Generate a Confluence-safe HTML page for the Feed the Bear Kingfluence page.

The page pulls its narrative sections from the canonical markdown docs so
Kingfluence stays aligned with the latest design wording instead of drifting on
hardcoded copy inside this script.

Sections generated:
  1. Header with dynamic timestamp
  2. Table of Contents (anchor-linked)
  3. GDD sections (What This Is, How It Plays, Quality, Difficulty, etc.)
  4. Difficulty Curves (embedded PNGs)
  5. Original Progressions (A-F tables with screenshots)
  6. Live Ops Mixes (if bundles/live_ops_mixes/ exists)
  7. Level-design and operational reference groups
  8. Feedback Summary (from .local/feedback_state.json if available)
  9. Source of Truth, Open Questions, Related Docs
  10. Pending [VERIFY] Flags
"""

from __future__ import annotations

import argparse
import base64
import csv
import html
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "output" / "confluence" / "feed_the_bear_full_page_confluence_safe.html"
BUNDLES_DIR = ROOT / "bundles"
GDD_PATH = ROOT / "FEED_THE_BEAR_GDD.md"
LEVEL_DESIGN_PATH = ROOT / "docs" / "LEVEL_DESIGN.md"
PLAYTEST_PATH = ROOT / "docs" / "PLAYTEST_SYSTEM.md"
SPREADSHEET_CONTROL_PANEL_PATH = ROOT / "docs" / "SPREADSHEET_CONTROL_PANEL.md"
FEEDBACK_STATE_PATH = ROOT / ".local" / "feedback_state.json"
CHILD_PAGE_MANIFEST_PATH = ROOT / "output" / "confluence" / "ftb_child_pages_manifest.json"

DIFFICULTY_COLORS = {
    "EASY": "#dcfce7",
    "MEDIUM": "#fef3c7",
    "HARD": "#fecaca",
}
DIFFICULTY_BORDER = {
    "EASY": "#22c55e",
    "MEDIUM": "#f59e0b",
    "HARD": "#ef4444",
}

# Priority score color thresholds
PRIORITY_HIGH = 5
PRIORITY_MED = 2

# ── Deep Ocean Light design system tokens ─────────────────────────────
BRAND_BG = "#f3f7fb"
BRAND_SURFACE = "#ffffff"
BRAND_TEXT = "#0b1b2a"
BRAND_MUTED = "#5a748e"
BRAND_ACCENT = "#2fbb69"
BRAND_ACCENT_2 = "#0369a1"
BRAND_BORDER = "#d8e5f0"
BRAND_HEADER_GRADIENT = "linear-gradient(135deg, #0b1b2a 0%, #0f3460 50%, #0369a1 100%)"
BRAND_SECTION_GRADIENT = "linear-gradient(180deg, #f0f6fc 0%, #e8f0f8 100%)"

SECTION_STYLE = (
    f"margin-top:32px;background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};"
    f"border-radius:12px;padding:20px 24px"
)
SECTION_HEADING_STYLE = (
    f"margin:0 0 12px 0;font-size:18px;color:{BRAND_TEXT};"
    f"border-bottom:2px solid {BRAND_ACCENT};padding-bottom:8px;display:inline-block"
)
PARAGRAPH_STYLE = f"margin:0 0 12px 0;color:{BRAND_TEXT}"
LIST_STYLE = f"margin:0 0 12px 18px;padding:0;color:{BRAND_TEXT}"
CODE_BLOCK_STYLE = (
    f"background:{BRAND_TEXT};color:#e2e8f0;padding:14px 16px;border-radius:10px;"
    "overflow:auto;font-size:12px;line-height:1.6;border:1px solid #1e3a5f"
)
TOC_STYLE = (
    f"background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:12px;"
    f"padding:20px 24px;margin:20px 0 28px 0;box-shadow:0 1px 3px rgba(11,27,42,0.06)"
)
TOC_ITEM_STYLE = (
    f"color:{BRAND_ACCENT_2};text-decoration:none;font-size:13px;font-weight:500;"
    "transition:color 0.15s"
)
TOC_SEPARATOR = f'<span style="color:{BRAND_BORDER};margin:0 6px">·</span>'
BADGE_STYLE = (
    "display:inline-block;padding:3px 10px;border-radius:999px;"
    "font-size:11px;font-weight:700;color:#fff"
)
CALLOUT_BASE_STYLE = (
    f"margin:0 0 16px 0;padding:14px 16px;border-radius:10px;border:1px solid {BRAND_BORDER}"
)
COLLAPSIBLE_SUMMARY_STYLE = (
    f"cursor:pointer;font-size:18px;font-weight:700;color:{BRAND_TEXT};"
    f"list-style:none;border-bottom:2px solid {BRAND_ACCENT};padding-bottom:8px;margin:0 0 10px 0"
)
CONTROL_BUTTON_STYLE = (
    "padding:8px 12px;border-radius:999px;border:1px solid #cbd5e1;background:#ffffff;"
    "font-size:12px;font-weight:600;color:#0b1b2a;cursor:pointer"
)
TABLE_HEADER_STYLE = f"background:{BRAND_SECTION_GRADIENT}"
TABLE_CELL_STYLE = f"padding:10px 12px;border:1px solid {BRAND_BORDER}"
TABLE_HEADER_CELL_STYLE = (
    f"padding:10px 12px;border:1px solid {BRAND_BORDER};"
    f"font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:{BRAND_MUTED}"
)
SUBSECTION_STYLE = (
    f"margin-top:20px;background:{BRAND_BG};border:1px solid {BRAND_BORDER};"
    f"border-radius:10px;padding:18px 20px"
)
SUBSECTION_HEADING_STYLE = (
    f"margin:0 0 10px 0;font-size:16px;color:{BRAND_ACCENT_2};"
    f"font-weight:700"
)


def get_dynamic_timestamp() -> str:
    """Try git log first, fall back to file mod time, then current time."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%ci", "--", str(GDD_PATH), str(LEVEL_DESIGN_PATH)],
            capture_output=True, text=True, cwd=str(ROOT), timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()[:10]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    try:
        gdd_mtime = GDD_PATH.stat().st_mtime if GDD_PATH.exists() else 0
        ld_mtime = LEVEL_DESIGN_PATH.stat().st_mtime if LEVEL_DESIGN_PATH.exists() else 0
        latest = max(gdd_mtime, ld_mtime)
        if latest > 0:
            return datetime.fromtimestamp(latest, tz=timezone.utc).strftime("%Y-%m-%d")
    except OSError:
        pass
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")


def normalize_heading_title(title: str) -> str:
    normalized = re.sub(r"^\d+(?:\.\d+)*\.?\s*", "", title.strip())
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.casefold()


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def read_text(file_path: Path) -> str:
    if not file_path.exists():
        return ""
    return file_path.read_text(encoding="utf-8")


def read_json(file_path: Path) -> dict:
    if not file_path.exists():
        return {}
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def read_csv(csv_path: Path) -> list[dict]:
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(row)
    return rows


def screenshot_to_base64(img_path: Path) -> str:
    if not img_path.exists():
        return ""
    return f"data:image/png;base64,{base64.b64encode(img_path.read_bytes()).decode()}"


LEVELS_DIR = ROOT / "levels"
SCREENSHOTS_DIR = ROOT / "output" / "screenshots"

PROGRESSION_SOURCES = [
    {
        "display_name": "Progression A",
        "csv_path": ROOT / "output" / "download_ready" / "progression_a_20260328_003346" / "progression_a_20260328_003346_progression.csv",
        "screenshots_dir": ROOT / "output" / "download_ready" / "progression_a_20260328_003346" / "screenshots",
        "curve_glob": "bundles/manager/original_progression_a/*_difficulty_curve.png",
    },
    {
        "display_name": "Progression B",
        "csv_path": ROOT / "output" / "download_ready" / "progression_b_20260328_003355" / "progression_b_20260328_003355_progression.csv",
        "screenshots_dir": ROOT / "output" / "download_ready" / "progression_b_20260328_003355" / "screenshots",
        "curve_glob": "bundles/manager/original_progression_b/*_difficulty_curve.png",
    },
    {
        "display_name": "Progression C",
        "csv_path": ROOT / "output" / "download_ready" / "progression_c_20260328_003403" / "progression_c_20260328_003403_progression.csv",
        "screenshots_dir": ROOT / "output" / "download_ready" / "progression_c_20260328_003403" / "screenshots",
        "curve_glob": "bundles/manager/original_progression_c/*_difficulty_curve.png",
    },
    {
        "display_name": "Progression D",
        "csv_path": ROOT / "output" / "download_ready" / "progression_4_20260328_003415" / "progression_4_20260328_003415_progression.csv",
        "screenshots_dir": ROOT / "output" / "download_ready" / "progression_4_20260328_003415" / "screenshots",
        "curve_glob": "bundles/manager/progression_4_*/*_difficulty_curve.png",
    },
    {
        "display_name": "Progression E",
        "csv_path": ROOT / "output" / "download_ready" / "progression_5_20260328_003449" / "progression_5_20260328_003449_progression.csv",
        "screenshots_dir": ROOT / "output" / "download_ready" / "progression_5_20260328_003449" / "screenshots",
        "curve_glob": "bundles/manager/progression_5_*/*_difficulty_curve.png",
    },
    {
        "display_name": "Progression F",
        "csv_path": ROOT / "output" / "download_ready" / "progression_6_20260328_003458" / "progression_6_20260328_003458_progression.csv",
        "screenshots_dir": ROOT / "output" / "download_ready" / "progression_6_20260328_003458" / "screenshots",
        "curve_glob": "bundles/manager/progression_6_*/*_difficulty_curve.png",
    },
]


def embed_screenshot(filename: str, alt: str = "", max_width: int = 800) -> str:
    """Return an <img> tag with base64-embedded screenshot, or empty string if missing."""
    img_path = SCREENSHOTS_DIR / filename
    if not img_path.exists():
        return ""
    b64 = screenshot_to_base64(img_path)
    return (
        f'<div style="margin:12px 0 20px 0;text-align:center">'
        f'<img src="{b64}" alt="{html.escape(alt)}" '
        f'style="max-width:{max_width}px;width:100%;border:1px solid {BRAND_BORDER};'
        f'border-radius:10px;box-shadow:0 2px 8px rgba(11,27,42,0.08)" />'
        f'</div>'
    )


def latest_path_from_glob(pattern: str) -> Path | None:
    matches = sorted(ROOT.glob(pattern))
    if not matches:
        return None
    return matches[-1]


def build_progression_table(name: str, csv_rows: list[dict], screenshots_dir: Path,
                            feedback_levels: dict | None = None) -> str:
    """Build an HTML table for a progression. Optionally annotate with feedback data."""
    has_feedback = feedback_levels and any(
        feedback_levels.get(Path(r.get("file", "")).stem) for r in csv_rows
    )
    extra_headers = ""
    if has_feedback:
        extra_headers = (
            f'<th style="{TABLE_HEADER_CELL_STYLE};text-align:center">Priority</th>'
            f'<th style="{TABLE_HEADER_CELL_STYLE};text-align:center">Version</th>'
        )

    rows_html = []
    for row in csv_rows:
        slot = row.get("slot", "?")
        filename = row.get("file", "")
        board = row.get("board", "")
        pairs = row.get("pairs", "")
        blockers = row.get("blockers", "")
        moves = row.get("moves", "")
        difficulty = row.get("difficulty", "")
        bg = DIFFICULTY_COLORS.get(difficulty, "#ffffff")
        border = DIFFICULTY_BORDER.get(difficulty, "#d8e5f0")
        stem = Path(filename).stem
        img_path = screenshots_dir / f"{stem}.png"
        img_b64 = screenshot_to_base64(img_path)
        img_html = (
            f'<img src="{img_b64}" style="width:80px;height:80px;border-radius:6px;border:1px solid #d8e5f0" />'
            if img_b64
            else '<span style="color:#94a3b8">No screenshot</span>'
        )

        extra_cells = ""
        if has_feedback:
            fb = (feedback_levels or {}).get(stem, {})
            score = fb.get("priorityScore", 0)
            version = fb.get("version", "")
            score_color = "#ef4444" if score >= PRIORITY_HIGH else ("#f59e0b" if score >= PRIORITY_MED else BRAND_ACCENT)
            score_badge = (
                f'<span style="{BADGE_STYLE};background:{score_color}">{score}</span>'
                if score else f'<span style="color:{BRAND_MUTED}">—</span>'
            )
            extra_cells = (
                f'<td style="{TABLE_CELL_STYLE};text-align:center">{score_badge}</td>'
                f'<td style="{TABLE_CELL_STYLE};text-align:center">{html.escape(str(version))}</td>'
            )

        rows_html.append(
            f"""<tr>
  <td style="{TABLE_CELL_STYLE};text-align:center">{html.escape(str(slot))}</td>
  <td style="{TABLE_CELL_STYLE}">{img_html}</td>
  <td style="{TABLE_CELL_STYLE};font-weight:600;color:{BRAND_TEXT}">{html.escape(stem)}</td>
  <td style="{TABLE_CELL_STYLE};text-align:center">{html.escape(board)}</td>
  <td style="{TABLE_CELL_STYLE};text-align:center">{html.escape(pairs)}</td>
  <td style="{TABLE_CELL_STYLE};text-align:center">{html.escape(blockers)}</td>
  <td style="{TABLE_CELL_STYLE};text-align:center">{html.escape(moves)}</td>
  <td style="{TABLE_CELL_STYLE};text-align:center;background:{bg};border-left:3px solid {border};font-weight:600">{html.escape(difficulty)}</td>
  {extra_cells}
</tr>"""
        )
    return f"""<h3 id="{slugify(name)}" style="color:{BRAND_ACCENT_2};font-size:16px;margin:20px 0 10px 0">{html.escape(name)}</h3>
<table style="border-collapse:collapse;width:100%;font-family:system-ui,sans-serif;font-size:13px;margin-bottom:24px;border-radius:8px;overflow:hidden">
<thead>
<tr style="{TABLE_HEADER_STYLE}">
  <th style="{TABLE_HEADER_CELL_STYLE};text-align:center">Slot</th>
  <th style="{TABLE_HEADER_CELL_STYLE}">Screenshot</th>
  <th style="{TABLE_HEADER_CELL_STYLE}">Level</th>
  <th style="{TABLE_HEADER_CELL_STYLE};text-align:center">Board</th>
  <th style="{TABLE_HEADER_CELL_STYLE};text-align:center">Pairs</th>
  <th style="{TABLE_HEADER_CELL_STYLE};text-align:center">Blockers</th>
  <th style="{TABLE_HEADER_CELL_STYLE};text-align:center">Moves</th>
  <th style="{TABLE_HEADER_CELL_STYLE};text-align:center">Difficulty</th>
  {extra_headers}
</tr>
</thead>
<tbody>
{"".join(rows_html)}
</tbody>
</table>"""


def extract_markdown_section(markdown_text: str, heading: str) -> str:
    target = normalize_heading_title(heading)
    lines = markdown_text.splitlines()
    inside = False
    buffer: list[str] = []
    for line in lines:
        if line.startswith("## "):
            if inside:
                break
            inside = normalize_heading_title(line[3:]) == target
            continue
        if inside:
            buffer.append(line)
    return "\n".join(buffer).strip()


def extract_pending_verify_flags(markdown_text: str) -> list[str]:
    section = extract_markdown_section(markdown_text, "Pending [VERIFY] Flags")
    flags = []
    for line in section.splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            flags.append(stripped[2:].strip())
    return flags


def render_inline(text: str) -> str:
    escaped = html.escape(text)

    def link_replacer(match: re.Match[str]) -> str:
        label = html.escape(match.group(1))
        url = html.escape(match.group(2))
        if url.startswith("http://") or url.startswith("https://"):
            return f'<a href="{url}">{label}</a>'
        return label

    escaped = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link_replacer, escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"`([^`]+)`", lambda match: f"<code>{html.escape(match.group(1))}</code>", escaped)
    return escaped


def render_table(block_lines: list[str]) -> str:
    rows = []
    for raw in block_lines:
        stripped = raw.strip()
        if not stripped.startswith("|"):
            continue
        cells = [render_inline(cell.strip()) for cell in stripped.strip("|").split("|")]
        rows.append(cells)
    if len(rows) < 2:
        return ""
    header = rows[0]
    body = rows[2:] if len(rows) > 2 else []
    header_html = "".join(
        f'<th style="{TABLE_HEADER_CELL_STYLE};text-align:left">{cell}</th>'
        for cell in header
    )
    body_html = []
    for row in body:
        body_html.append(
            "<tr>"
            + "".join(f'<td style="{TABLE_CELL_STYLE}">{cell}</td>' for cell in row)
            + "</tr>"
        )
    return (
        f'<table style="border-collapse:collapse;width:100%;font-size:13px;margin:0 0 16px 0;border-radius:8px;overflow:hidden">'
        f'<thead><tr style="{TABLE_HEADER_STYLE}">{header_html}</tr></thead>'
        f'<tbody>{"".join(body_html)}</tbody>'
        "</table>"
    )


def markdown_to_html(markdown_text: str, heading_level_offset: int = 1) -> str:
    lines = markdown_text.splitlines()
    html_parts: list[str] = []
    paragraph: list[str] = []
    table_block: list[str] = []
    list_mode = ""
    list_items: list[str] = []
    in_code = False
    code_lines: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph
        if not paragraph:
            return
        joined = " ".join(part.strip() for part in paragraph if part.strip())
        if joined:
            html_parts.append(f'<p style="{PARAGRAPH_STYLE}">{render_inline(joined)}</p>')
        paragraph = []

    def flush_list() -> None:
        nonlocal list_items, list_mode
        if not list_items:
            return
        tag = "ol" if list_mode == "ordered" else "ul"
        items_html = "".join(f"<li>{item}</li>" for item in list_items)
        html_parts.append(f'<{tag} style="{LIST_STYLE}">{items_html}</{tag}>')
        list_items = []
        list_mode = ""

    def flush_table() -> None:
        nonlocal table_block
        if not table_block:
            return
        table_html = render_table(table_block)
        if table_html:
            html_parts.append(table_html)
        table_block = []

    def _is_board_sketch(lines: list[str]) -> bool:
        """Detect ASCII board sketches (A . . B, ->, #) that don't render well."""
        if not lines:
            return False
        board_chars = 0
        for ln in lines:
            stripped = ln.strip()
            # Board sketches use single-char tokens separated by spaces
            if re.match(r'^[A-I.#\s\->]+$', stripped) and len(stripped) > 2:
                board_chars += 1
        return board_chars >= len(lines) * 0.6

    def flush_code() -> None:
        nonlocal code_lines
        if not code_lines:
            return
        # Skip ASCII board sketches — real level screenshots are used instead
        if _is_board_sketch(code_lines):
            code_lines = []
            return
        code_html = html.escape("\n".join(code_lines))
        html_parts.append(f'<pre style="{CODE_BLOCK_STYLE}"><code>{code_html}</code></pre>')
        code_lines = []

    for line in lines:
        stripped = line.rstrip()
        if stripped.startswith("```"):
            flush_paragraph()
            flush_list()
            flush_table()
            if in_code:
                flush_code()
                in_code = False
            else:
                in_code = True
            continue
        if in_code:
            code_lines.append(stripped)
            continue
        if stripped.startswith("|") and stripped.endswith("|"):
            flush_paragraph()
            flush_list()
            table_block.append(stripped)
            continue
        flush_table()
        if not stripped.strip():
            flush_paragraph()
            flush_list()
            continue
        if stripped.startswith("### "):
            flush_paragraph()
            flush_list()
            title = render_inline(stripped[4:].strip())
            level = min(6, 3 + heading_level_offset)
            html_parts.append(f'<h{level} style="margin:18px 0 8px 0">{title}</h{level}>')
            continue
        ordered_match = re.match(r"^\d+\.\s+(.*)$", stripped.strip())
        if ordered_match:
            flush_paragraph()
            if list_mode not in ("", "ordered"):
                flush_list()
            list_mode = "ordered"
            list_items.append(render_inline(ordered_match.group(1)))
            continue
        if stripped.strip().startswith("- "):
            flush_paragraph()
            if list_mode not in ("", "unordered"):
                flush_list()
            list_mode = "unordered"
            list_items.append(render_inline(stripped.strip()[2:].strip()))
            continue
        paragraph.append(stripped)

    flush_paragraph()
    flush_list()
    flush_table()
    if in_code:
        flush_code()

    # Remove orphaned board-sketch labels (paragraphs that introduced a filtered code block)
    _BOARD_LABEL_RE = re.compile(
        r'<p [^>]*>(?:Example board|Small board sketch|Golden path sketch|Board sketch)[:\s]*</p>',
        re.IGNORECASE
    )
    html_parts = [part for part in html_parts if not _BOARD_LABEL_RE.search(part)]

    return "\n".join(html_parts)


def build_doc_section(title: str, markdown_text: str, section_heading: str,
                      anchor: str | None = None) -> str:
    section = extract_markdown_section(markdown_text, section_heading)
    if not section:
        return ""
    anchor_id = anchor or slugify(title)
    return (
        f'<section id="{anchor_id}" style="{SECTION_STYLE}">'
        f'<h2 style="{SECTION_HEADING_STYLE}">{html.escape(title)}</h2>'
        f'{markdown_to_html(section)}'
        f'</section>'
    )


def build_doc_subsection(title: str, markdown_text: str, section_heading: str,
                         anchor: str | None = None) -> str:
    section = extract_markdown_section(markdown_text, section_heading)
    if not section:
        return ""
    anchor_id = anchor or slugify(title)
    return (
        f'<div id="{anchor_id}" style="{SUBSECTION_STYLE}">'
        f'<h3 style="{SUBSECTION_HEADING_STYLE}">{html.escape(title)}</h3>'
        f'{markdown_to_html(section)}'
        f'</div>'
    )


def build_pending_verify_section(*flag_sets: list[str]) -> str:
    flags: list[str] = []
    seen = set()
    for flag_set in flag_sets:
        for flag in flag_set:
            if flag in seen:
                continue
            seen.add(flag)
            flags.append(flag)
    if not flags:
        return ""
    items = "".join(f"<li>{render_inline(flag)}</li>" for flag in flags)
    return (
        f'<section id="verify-flags" style="{SECTION_STYLE};border-left:4px solid #f59e0b">'
        f'<h2 style="{SECTION_HEADING_STYLE};border-bottom-color:#f59e0b">Pending [VERIFY] Flags</h2>'
        f'<ul style="{LIST_STYLE}">{items}</ul></section>'
    )


def build_callout(title: str, body: str, *, tone: str = "info") -> str:
    macro_name = {
        "info": "info",
        "warning": "warning",
        "success": "tip",
        "note": "note",
    }.get(tone, "info")
    return (
        f'<ac:structured-macro ac:name="{macro_name}">'
        f'<ac:rich-text-body>'
        f'<p><strong>{html.escape(title)}</strong></p>'
        f'<p>{body}</p>'
        f'</ac:rich-text-body>'
        f'</ac:structured-macro>'
    )


def build_expand_macro(title: str, body_html: str) -> str:
    return (
        f'<ac:structured-macro ac:name="expand">'
        f'<ac:parameter ac:name="title">{html.escape(title)}</ac:parameter>'
        f'<ac:rich-text-body>{body_html}</ac:rich-text-body>'
        f'</ac:structured-macro>'
    )


def build_expand_controls() -> str:
    return f"""
<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:12px;padding:14px 16px;margin:0 0 20px 0">
  <p style="margin:0;color:{BRAND_TEXT};font-size:13px"><strong>Reference controls</strong> · Use these controls to expand or collapse the longer documentation blocks without losing the rest of the page structure.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button type="button" onclick="toggleCollapsibleSections(true)" style="{CONTROL_BUTTON_STYLE}">Expand all</button>
    <button type="button" onclick="toggleCollapsibleSections(false)" style="{CONTROL_BUTTON_STYLE}">Collapse all</button>
  </div>
</div>
<script>
function toggleCollapsibleSections(expand) {{
  document.querySelectorAll('details[data-collapsible="true"]').forEach(function(node) {{
    node.open = expand;
  }});
}}
</script>
"""


def build_feedback_section(feedback_state: dict, *, embedded: bool = False) -> str:
    """Build a feedback summary section from .local/feedback_state.json."""
    if not feedback_state:
        return ""
    levels = feedback_state.get("levels", {})
    if not levels:
        return ""

    pulled_at = feedback_state.get("pulledAt", "Unknown")[:10]
    needs_fixes = [name for name, data in levels.items() if data.get("needFixes") == "YES"]
    has_feedback = [name for name, data in levels.items() if data.get("feedback")]
    top_priority = sorted(
        [(name, data.get("priorityScore", 0)) for name, data in levels.items()
         if isinstance(data.get("priorityScore"), (int, float)) and data["priorityScore"] > 0],
        key=lambda x: -x[1]
    )[:10]

    rows_html = []
    for name, score in top_priority:
        data = levels[name]
        color = "#ef4444" if score >= PRIORITY_HIGH else ("#f59e0b" if score >= PRIORITY_MED else "#22c55e")
        feedback_text = html.escape(str(data.get("feedback", "")))[:120]
        version = html.escape(str(data.get("version", "")))
        rows_html.append(
            f'<tr>'
            f'<td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">{html.escape(name)}</td>'
            f'<td style="padding:8px;text-align:center;border:1px solid #e2e8f0">'
            f'<span style="{BADGE_STYLE};background:{color}">{score}</span></td>'
            f'<td style="padding:8px;border:1px solid #e2e8f0">{feedback_text}</td>'
            f'<td style="padding:8px;text-align:center;border:1px solid #e2e8f0">{version}</td>'
            f'</tr>'
        )

    priority_table = ""
    if rows_html:
        priority_table = (
            '<table style="border-collapse:collapse;width:100%;font-size:13px;margin:12px 0">'
            '<thead><tr style="background:#f1f5f9">'
            '<th style="padding:8px;border:1px solid #e2e8f0">Level</th>'
            '<th style="padding:8px;border:1px solid #e2e8f0;text-align:center">Priority</th>'
            '<th style="padding:8px;border:1px solid #e2e8f0">Feedback</th>'
            '<th style="padding:8px;border:1px solid #e2e8f0;text-align:center">Version</th>'
            '</tr></thead>'
            f'<tbody>{"".join(rows_html)}</tbody>'
            '</table>'
        )

    changelog = feedback_state.get("changelog", [])
    changelog_html = ""
    if changelog:
        cl_rows = []
        for entry in changelog[-10:]:
            cl_rows.append(
                f'<tr>'
                f'<td style="padding:6px;border:1px solid #e2e8f0;font-size:12px">{html.escape(str(entry.get("date", "")))}</td>'
                f'<td style="padding:6px;border:1px solid #e2e8f0;font-size:12px">{html.escape(str(entry.get("levelName", "")))}</td>'
                f'<td style="padding:6px;border:1px solid #e2e8f0;font-size:12px">{html.escape(str(entry.get("oldVersion", "")))} → {html.escape(str(entry.get("newVersion", "")))}</td>'
                f'<td style="padding:6px;border:1px solid #e2e8f0;font-size:12px">{html.escape(str(entry.get("notes", "")))}</td>'
                f'</tr>'
            )
        changelog_html = (
            '<h3 style="margin:18px 0 8px 0">Recent Changes</h3>'
            '<table style="border-collapse:collapse;width:100%;font-size:12px;margin:8px 0">'
            '<thead><tr style="background:#f1f5f9">'
            '<th style="padding:6px;border:1px solid #e2e8f0">Date</th>'
            '<th style="padding:6px;border:1px solid #e2e8f0">Level</th>'
            '<th style="padding:6px;border:1px solid #e2e8f0">Version</th>'
            '<th style="padding:6px;border:1px solid #e2e8f0">Notes</th>'
            '</tr></thead>'
            f'<tbody>{"".join(cl_rows)}</tbody>'
            '</table>'
        )

    container_tag = "div" if embedded else "section"
    heading_tag = "h3" if embedded else "h2"
    heading_style = SUBSECTION_HEADING_STYLE if embedded else SECTION_HEADING_STYLE
    container_style = SUBSECTION_STYLE if embedded else SECTION_STYLE
    section_id = ' id="feedback-summary"' if not embedded else ' id="feedback-summary"'
    paragraph_style = f"margin:0 0 12px 0;color:{BRAND_TEXT}" if embedded else PARAGRAPH_STYLE

    return (
        f'<{container_tag}{section_id} style="{container_style}">'
        f'<{heading_tag} style="{heading_style}">Feedback Summary</{heading_tag}>'
        f'<p style="{paragraph_style}">Data pulled from Google Sheets on <strong>{html.escape(pulled_at)}</strong>.</p>'
        f'<div style="display:flex;gap:16px;flex-wrap:wrap;margin:16px 0">'
        f'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;flex:1;min-width:120px">'
        f'<div style="font-size:28px;font-weight:800;color:{BRAND_ACCENT}">{len(levels)}</div>'
        f'<div style="font-size:12px;color:{BRAND_MUTED};font-weight:500">Total levels</div></div>'
        f'<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;flex:1;min-width:120px">'
        f'<div style="font-size:28px;font-weight:800;color:#d97706">{len(has_feedback)}</div>'
        f'<div style="font-size:12px;color:{BRAND_MUTED};font-weight:500">With feedback</div></div>'
        f'<div style="background:#fecaca;border:1px solid #fca5a5;border-radius:10px;padding:16px 20px;flex:1;min-width:120px">'
        f'<div style="font-size:28px;font-weight:800;color:#dc2626">{len(needs_fixes)}</div>'
        f'<div style="font-size:12px;color:{BRAND_MUTED};font-weight:500">Need fixes</div></div>'
        f'</div>'
        f'{priority_table}'
        f'{changelog_html}'
        f'</{container_tag}>'
    )


def build_macro_group_section(anchor_id: str, title: str, intro_html: str, inner_html: str) -> str:
    return (
        f'<section id="{anchor_id}" style="{SECTION_STYLE}">'
        f'<h2 style="{SECTION_HEADING_STYLE}">{html.escape(title)}</h2>'
        f'{intro_html}'
        f'{inner_html}'
        f'</section>'
    )


def build_tooling_section(*, embedded: bool = False) -> str:
    """Build a dedicated section describing the four main tooling systems."""

    card_style = (
        f"background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};"
        f"border-radius:10px;padding:20px 24px;margin-bottom:20px"
    )
    card_heading = (
        f"margin:0 0 10px 0;font-size:16px;color:{BRAND_ACCENT_2};"
        f"font-weight:700;display:flex;align-items:center;gap:8px"
    )
    tag_style = (
        f"display:inline-block;padding:2px 8px;border-radius:999px;"
        f"font-size:10px;font-weight:600;letter-spacing:0.04em;"
        f"text-transform:uppercase"
    )
    detail_style = (
        f"font-size:13px;color:{BRAND_TEXT};line-height:1.7;margin:0 0 10px 0"
    )
    tech_style = (
        f"background:{BRAND_BG};border:1px solid {BRAND_BORDER};"
        f"border-radius:8px;padding:10px 14px;font-size:12px;"
        f"color:{BRAND_MUTED};line-height:1.6;margin:8px 0 0 0"
    )

    level_manager_card = f"""<div style="{card_style}">
  <h3 style="{card_heading}">
    <span style="{tag_style};background:#dbeafe;color:#1d4ed8">STATE</span>
    Level Manager
  </h3>
  <p style="{detail_style}">
    The Level Manager is the central inventory and progression system for all levels in the game.
    It manages <strong>six 11-slot progression curves</strong> (A, B, C, D, E, F), plus a tutorial, extras pool, and discard bin.
    Designers assign levels to slots via <strong>drag-and-drop</strong>, filter by board size, difficulty, pairs, blockers, or status,
    and reorder freely across progressions. The manager also handles import/export of progression bundles as ZIP files
    and syncs with Google Sheets for external review.
  </p>
  <p style="{detail_style}">
    Each level card in the manager shows a <strong>canvas-rendered screenshot</strong>, core metadata (board, pairs, blockers,
    difficulty), and state flags (selected, referenced, discarded). The state is persisted to
    <code>.local/toolkit_state/manager_state.json</code> and synced to the server on every change.
  </p>
  <div style="{tech_style}">
    <strong>Tech:</strong> Pure JavaScript DOM manipulation · Canvas screenshots · State-driven architecture
    (<code>state.manager</code>) · Server actions for ZIP export (<code>/api/action/export-progression</code>,
    <code>/api/create-zip</code>) · Google Sheets sync for external team review
  </div>
</div>"""

    level_editor_card = f"""<div style="{card_style}">
  <h3 style="{card_heading}">
    <span style="{tag_style};background:#dcfce7;color:#15803d">DESIGN</span>
    Level Editor
  </h3>
  <p style="{detail_style}">
    The Level Editor is a visual, grid-based puzzle creation tool. Designers place fish pairs (start/end nodes)
    on configurable boards (4×4 up to 6×6), draw orthogonal L-shaped paths between them, and place blockers on cells.
    The editor provides <strong>real-time validation</strong>: it counts solutions (DFS with memoization, capped at 20),
    checks solvability, and extracts mechanic signals like path coverage, straightness, and bend pressure.
  </p>
  <p style="{detail_style}">
    When a designer approves a level, the editor can <strong>send the pattern to the learning system</strong>,
    which the procedural generator then uses to bias future generation toward similar patterns. Levels are saved as
    structured JSON with full metadata (grid, pairs, blockers, golden path, solution count, validation state).
  </p>
  <div style="{tech_style}">
    <strong>Tech:</strong> HTML5 Canvas rendering · Coordinate system with <code>coordKey(r, c)</code> hashing
    · <code>simplePath()</code> for L-shaped routing · <code>countSolutions()</code> via DFS + memoization
    · <code>extractMechanicSignals()</code> for quality metrics · State in <code>state.editor</code>
  </div>
</div>"""

    vitobot_card = f"""<div style="{card_style}">
  <h3 style="{card_heading}">
    <span style="{tag_style};background:#fef3c7;color:#92400e">SIM</span>
    VitoBot — Synthetic Player Simulator
  </h3>
  <p style="{detail_style}">
    VitoBot is a <strong>persona-based Monte Carlo synthetic player simulator</strong> that estimates difficulty and quality metrics
    by running multiple simulated playthroughs per level. It supports four skill profiles (novice, average, focused, expert)
    plus behavioural personas such as cautious, explorer, perfectionist, or speedrunner. By default it runs
    <strong>25 stochastic samples per level</strong>, producing averages for solve chance, success rate, abandonment,
    misreads, errors, dead ends, restarts, and estimated solve time.
  </p>
  <p style="{detail_style}">
    The bot identifies <strong>tuning signals</strong> like "Too hard", "Misread-prone", "High abandonment risk", or "Zigzag pressure"
    by analyzing the level's validation report, path quality signals, and solution structure.
    It can run against four sources: the current editor level, the play-sessions queue, the procedural catalog (100 levels),
    or a full folder scan. All simulations run <strong>entirely in the browser</strong> with seeded RNG for reproducibility.
  </p>
  <p style="{detail_style}">
    It also reports <strong>sampled solution families</strong>, spread, and ambiguity so reviewers can distinguish
    one clean intended route from a permissive board with many similarly viable resolutions. VitoBot is a prioritization aid,
    not ground truth, and it still needs calibration against a larger bank of real observed sessions. The current shipped model
    is Monte Carlo plus hand-tuned personas, not full Monte Carlo Tree Search yet.
  </p>
  <div style="{tech_style}">
    <strong>Tech:</strong> Browser-based simulation engine · Seeded RNG (<code>hashStringSeed()</code>)
    · Profile archetypes via <code>vitoBotProfileConfig()</code> · Solve chance formula:
    <code>0.58 + (skillGap/75) + clarityBonus - penalties</code>
    · Aggregation via <code>summarizeVitoBotLevel()</code> · No server dependency
  </div>
</div>"""

    procedural_card = f"""<div style="{card_style}">
  <h3 style="{card_heading}">
    <span style="{tag_style};background:#f3e8ff;color:#7c3aed">GEN</span>
    Procedural Generation System
  </h3>
  <p style="{detail_style}">
    The procedural generator creates levels across <strong>10 difficulty tiers</strong> using a combination of explicit
    difficulty curves, seeded randomness, and <strong>learned feedback from designer approvals and rejections</strong>.
    For each tier, it generates 12 candidate levels with different seeds and selects the best one via a composite
    heuristic scoring function that weighs grid area, pair count, average distance, blocker effectiveness, and solution count.
  </p>
  <p style="{detail_style}">
    The generation pipeline places pairs with minimum Manhattan distance 3 (with corner avoidance), generates L-shaped paths,
    then iteratively inserts blockers — re-validating solvability after each insertion. The system also supports
    <strong>reference-driven generation</strong>, which mutates existing approved levels into nearby variants using
    similarity scoring and learning bias.
  </p>
  <p style="{detail_style}">
    The <strong>learning system</strong> stores approved and rejected patterns,
    tagged by source and rejection reason (too_easy, meaningless_blockers, bad_layout, etc.).
    These patterns continuously bias the generator toward producing levels that match what the design team considers good.
  </p>
  <div style="{tech_style}">
    <strong>Tech:</strong> Seeded RNG for deterministic generation · DFS + memoization for solution counting
    · Heuristic scoring: <code>D = w1·area + w2·pairs + w3·avg_dist + w4·blocker_score + w5·(1/solutions)</code>
    · Learning state in <code>.local/toolkit_state/learning_state.json</code>
    · Reference-driven mutation via <code>generateReferenceDrivenCandidates()</code>
    · 12 candidates/tier, 120 total per batch (&lt;1s)
  </div>
</div>"""

    container_tag = "div" if embedded else "section"
    heading_tag = "h3" if embedded else "h2"
    heading_style = SUBSECTION_HEADING_STYLE if embedded else SECTION_HEADING_STYLE
    container_style = SUBSECTION_STYLE if embedded else SECTION_STYLE
    paragraph_style = f"margin:0 0 12px 0;color:{BRAND_TEXT}" if embedded else PARAGRAPH_STYLE
    section_id = ' id="tooling-systems"' if not embedded else ' id="tooling-systems"'

    return (
        f'<{container_tag}{section_id} style="{container_style}">'
        f'<{heading_tag} style="{heading_style}">Tooling Systems</{heading_tag}>'
        f'<p style="{paragraph_style}">Feed the Bear is built on a custom web-based toolkit that covers the full '
        f'level authoring pipeline — from procedural generation through manual editing, synthetic playtesting, '
        f'and progression management. All four systems live in a single-page app served locally, sharing state '
        f'and feeding data into Google Sheets sync and Confluence page generation.</p>'
        f'{level_manager_card}'
        f'{embed_screenshot("tool_level_manager.png", "Level Manager interface")}'
        f'{level_editor_card}'
        f'{embed_screenshot("tool_level_editor.png", "Level Editor interface")}'
        f'{vitobot_card}'
        f'{embed_screenshot("tool_vitobot.png", "VitoBot simulator interface")}'
        f'{procedural_card}'
        f'{embed_screenshot("tool_procedural.png", "Procedural Generation interface")}'
        f'</{container_tag}>'
    )


def build_specialized_pages_section(manifest: dict) -> str:
    pages = manifest.get("pages", []) if isinstance(manifest, dict) else []
    if not pages:
        return ""

    cells = []
    for page in pages:
        title = html.escape(str(page.get("title", "Untitled page")))
        summary = html.escape(str(page.get("summary", "")))
        url = html.escape(str(page.get("url", "")))
        label = html.escape(str(page.get("label", "")))
        badge = (
            f'<p><span style="{BADGE_STYLE};background:{BRAND_ACCENT_2}">{label}</span></p>'
            if label else ""
        )
        link_html = (
            f'<p><a href="{url}" style="color:{BRAND_ACCENT_2};font-weight:700;text-decoration:none">Open page ↗</a></p>'
            if url else ""
        )
        cells.append(
            f'<ac:layout-cell>'
            f'<ac:structured-macro ac:name="panel">'
            f'<ac:parameter ac:name="borderStyle">solid</ac:parameter>'
            f'<ac:parameter ac:name="borderColor">{BRAND_BORDER}</ac:parameter>'
            f'<ac:parameter ac:name="bgColor">#f8fafc</ac:parameter>'
            f'<ac:parameter ac:name="title">{title}</ac:parameter>'
            f'<ac:rich-text-body>'
            f'{badge}'
            f'<p>{summary}</p>'
            f'{link_html}'
            f'</ac:rich-text-body>'
            f'</ac:structured-macro>'
            f'</ac:layout-cell>'
        )

    return (
        f'<section id="specialized-pages" style="{SECTION_STYLE}">'
        f'<h2 style="{SECTION_HEADING_STYLE}">Specialized Pages</h2>'
        f'<p style="{PARAGRAPH_STYLE}">Use the parent page for the big picture and these child pages for deeper editing, review, and sharing on one specific topic.</p>'
        f'<ac:layout><ac:layout-section ac:type="three_equal">{"".join(cells)}</ac:layout-section></ac:layout>'
        f'</section>'
    )


def build_toc(sections: list[tuple[str, str]]) -> str:
    """Build a table of contents from (title, anchor_id) pairs."""
    items = []
    for title, anchor in sections:
        items.append(
            f'<a href="#{anchor}" style="{TOC_ITEM_STYLE}">{html.escape(title)}</a>'
        )
    return (
        f'<nav style="{TOC_STYLE}">'
        f'<p style="font-weight:700;font-size:14px;margin:0 0 10px 0;color:{BRAND_TEXT}">Contents</p>'
        f'<div style="line-height:2">{TOC_SEPARATOR.join(items)}</div>'
        f'</nav>'
    )


def build_page() -> str:
    timestamp = get_dynamic_timestamp()
    gdd_text = read_text(GDD_PATH)
    level_design_text = read_text(LEVEL_DESIGN_PATH)
    playtest_text = read_text(PLAYTEST_PATH)
    spreadsheet_text = read_text(SPREADSHEET_CONTROL_PANEL_PATH)
    feedback_state = read_json(FEEDBACK_STATE_PATH)
    child_page_manifest = read_json(CHILD_PAGE_MANIFEST_PATH)
    feedback_levels = feedback_state.get("levels", {})

    # ── Progressions ──────────────────────────────────────────────────
    progressions_html = []
    curve_images = []
    for source in PROGRESSION_SOURCES:
        csv_path = source["csv_path"]
        screenshots_dir = source["screenshots_dir"]
        display_name = source["display_name"]
        if not csv_path.exists():
            continue
        if not screenshots_dir.exists():
            continue
        csv_rows = read_csv(csv_path)
        progressions_html.append(
            build_progression_table(display_name, csv_rows, screenshots_dir, feedback_levels)
        )
        curve_path = latest_path_from_glob(source["curve_glob"])
        if curve_path:
            b64 = screenshot_to_base64(curve_path)
            if b64:
                curve_images.append(
                    '<div style="text-align:center;margin-bottom:16px">'
                    f'<p style="font-weight:600;margin-bottom:6px">{html.escape(display_name)}</p>'
                    f'<img src="{b64}" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0" />'
                    "</div>"
                )

    # ── Live Ops Mixes ────────────────────────────────────────────────
    live_ops_dir = BUNDLES_DIR / "live_ops_mixes"
    live_ops_html = []
    if live_ops_dir.is_dir():
        for mix_folder in sorted(live_ops_dir.iterdir()):
            if not mix_folder.is_dir():
                continue
            csv_files = list(mix_folder.glob("*_progression.csv"))
            if not csv_files:
                continue
            csv_rows = read_csv(csv_files[0])
            screenshots_dir = mix_folder / "screenshots"
            display_name = mix_folder.name.replace("_", " ").title()
            live_ops_html.append(
                build_progression_table(display_name, csv_rows, screenshots_dir, feedback_levels)
            )

    # ── Verify flags ──────────────────────────────────────────────────
    verify_html = build_pending_verify_section(
        extract_pending_verify_flags(gdd_text),
        extract_pending_verify_flags(level_design_text),
    )

    # ── Feedback ──────────────────────────────────────────────────────
    feedback_html = build_feedback_section(feedback_state)

    # ── Table of Contents ─────────────────────────────────────────────
    toc_entries: list[tuple[str, str]] = [
        ("Game Design", "game-design"),
        ("How It Plays", "how-it-plays"),
        ("Puzzle Quality", "puzzle-quality"),
        ("Difficulty Model", "difficulty-model"),
        ("Progression", "progression"),
        ("Procedural Generation", "procedural-generation"),
        ("Difficulty Curves", "difficulty-curves"),
        ("Original Progressions", "original-progressions"),
    ]
    if live_ops_html:
        toc_entries.append(("Live Ops Mixes", "live-ops-mixes"))
    toc_entries += [
        ("Level Design Reference", "level-design-reference"),
        ("Operational Reference", "operational-reference"),
        ("Open Questions", "open-questions"),
    ]
    if verify_html:
        toc_entries.append(("VERIFY Flags", "verify-flags"))

    toc = build_toc(toc_entries)

    # ── Live Ops section ──────────────────────────────────────────────
    live_ops_section = ""
    if live_ops_html:
        live_ops_section = (
            f'<section id="live-ops-mixes" style="{SECTION_STYLE}">'
            f'<h2 style="{SECTION_HEADING_STYLE}">Live Ops Mixes</h2>'
            f'<p style="{PARAGRAPH_STYLE}">These are recombined editorial sets built from the authored original families. They are useful for release planning and event packaging, but they are not a replacement source for the original progression curve.</p>'
            f'{"".join(live_ops_html)}'
            f'</section>'
        )

    specialized_pages_section = build_specialized_pages_section(child_page_manifest)
    if specialized_pages_section:
        toc_entries.append(("Specialized Pages", "specialized-pages"))

    level_design_reference = build_macro_group_section(
        "level-design-reference",
        "Level Design Reference",
        build_callout(
            "Use this block when you need concrete design examples",
            "These sections are the practical companion to the high-level GDD. They explain the vocabulary, failure modes, and workflow choices that make one board feel authored instead of accidental.",
            tone="success",
        ),
        "".join([
            build_expand_macro("Level Design Vocabulary", build_doc_subsection("Level Design Vocabulary", level_design_text, "1. Vocabulary", "level-design-vocabulary")),
            build_expand_macro("Anatomy Of A Good Level", build_doc_subsection("Anatomy Of A Good Level", level_design_text, "2. Anatomy Of A Good Level", "anatomy-of-a-good-level")),
            build_expand_macro("How To Think About Difficulty", build_doc_subsection("How To Think About Difficulty", level_design_text, "3. How To Think About Difficulty", "how-to-think-about-difficulty")),
            build_expand_macro("Common Mistakes", build_doc_subsection("Common Mistakes", level_design_text, "4. The Most Common Mistakes", "common-mistakes")),
            build_expand_macro("Complete Toolkit Workflow", build_doc_subsection("Complete Toolkit Workflow", level_design_text, "5. Complete Toolkit Workflow", "complete-toolkit-workflow")),
            build_expand_macro("Working With Procedural Generation", build_doc_subsection("Working With Procedural Generation", level_design_text, "6. Working With Procedural Generation", "working-with-procedural-generation")),
            build_expand_macro("Working With Live Ops Mixes", build_doc_subsection("Working With Live Ops Mixes", level_design_text, "7. Working With Live Ops Mixes", "working-with-live-ops-mixes")),
            build_expand_macro("Level Checklist", build_doc_subsection("Level Checklist", level_design_text, "8. Level Checklist", "level-checklist")),
        ]),
    )

    operational_reference = build_macro_group_section(
        "operational-reference",
        "Operational Reference",
        (
            build_callout(
                "Trust rule",
                "A solved session is not automatically a trustworthy positive. Read validation first, real player behaviour second, reviewer notes third, and use VitoBot as a prioritisation aid rather than a substitute for player evidence.",
                tone="warning",
            )
            + build_callout(
                "Spreadsheet and Apps Script scope",
                "The spreadsheet and the control panel are review surfaces. They already support a useful local-first workflow, but they should still be described with a clear line between what is shipped today and what is only planned.",
                tone="info",
            )
        ),
        "".join([
            build_expand_macro("How To Read Playtest Results", build_doc_subsection("How To Read Playtest Results", playtest_text, "How To Read Results", "how-to-read-results")),
            build_expand_macro("Current Supported Vs Planned", build_doc_subsection("Current Supported Vs Planned", spreadsheet_text, "Current Supported Vs Planned", "current-supported-vs-planned")),
            build_expand_macro("Toolkit Workflow", build_doc_subsection("Toolkit Workflow", gdd_text, "Tooling and Workflow", "toolkit-workflow")),
            build_expand_macro("Tooling Systems", build_tooling_section(embedded=True)),
            build_expand_macro("Feedback Summary", build_feedback_section(feedback_state, embedded=True)),
            build_expand_macro("Source of Truth", build_doc_subsection("Source of Truth", gdd_text, "Source of Truth", "source-of-truth")),
            build_expand_macro("Related Docs", build_doc_subsection("Related Docs", gdd_text, "Related Docs", "related-docs")),
        ]),
    )

    # ── Assemble page ─────────────────────────────────────────────────
    return f"""<!DOCTYPE html>
<html>
<body id="page-top" style="font-family:system-ui,'Segoe UI',sans-serif;color:{BRAND_TEXT};max-width:980px;margin:0 auto;padding:0;line-height:1.6;background:{BRAND_BG}">

<div style="background:{BRAND_HEADER_GRADIENT};padding:36px 32px 28px;border-radius:0 0 16px 16px;margin-bottom:24px">
  <h1 style="font-size:32px;margin:0 0 6px 0;color:#ffffff;font-weight:800;letter-spacing:-0.02em">Feed the Bear</h1>
  <p style="color:rgba(255,255,255,0.75);margin:0 0 4px 0;font-size:15px">Path-based puzzle game · Level design, progressions, and tooling overview</p>
  <p style="color:rgba(255,255,255,0.45);font-size:12px;margin:0">Auto-generated from canonical docs and repo state · Last updated: <strong style="color:rgba(255,255,255,0.65)">{html.escape(timestamp)}</strong></p>
</div>

<div style="padding:0 24px">

{toc}

{build_doc_section("What This Is and Who It Is For", gdd_text, "What This Is and Who It Is For", "game-design")}
{build_doc_section("How It Plays", gdd_text, "2. How It Plays", "how-it-plays")}
{build_doc_section("What Makes a Puzzle Good", gdd_text, "3. What Makes a Puzzle Good", "puzzle-quality")}
{build_doc_section("Difficulty Model", gdd_text, "4. Difficulty Model", "difficulty-model")}
{build_doc_section("Progression", gdd_text, "5. Progression", "progression")}
{build_doc_section("Visual Language", gdd_text, "6. Visual Language", "visual-language")}
{build_doc_section("Procedural Generation", gdd_text, "7. Procedural Generation", "procedural-generation")}
{build_doc_section("Technical Appendix", gdd_text, "Technical Appendix", "technical-appendix")}
{specialized_pages_section}

<section id="difficulty-curves" style="{SECTION_STYLE}">
  <h2 style="{SECTION_HEADING_STYLE}">Difficulty Curves</h2>
  {''.join(curve_images) if curve_images else f'<p style="color:{BRAND_MUTED}"><em>No difficulty curve images available.</em></p>'}
</section>

<section id="original-progressions" style="{SECTION_STYLE}">
  <h2 style="{SECTION_HEADING_STYLE}">Original Progressions</h2>
  {"".join(progressions_html) if progressions_html else f'<p style="color:{BRAND_MUTED}"><em>No progression bundles found.</em></p>'}
</section>

{live_ops_section}

{level_design_reference}
{operational_reference}

{build_doc_section("Open Questions", gdd_text, "Open Questions", "open-questions")}
{verify_html}

</div>

<div style="background:{BRAND_TEXT};padding:20px 32px;border-radius:16px 16px 0 0;margin-top:32px;text-align:center">
  <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0">
    Generated from <code style="color:rgba(255,255,255,0.7)">FEED_THE_BEAR_GDD.md</code>,
    <code style="color:rgba(255,255,255,0.7)">docs/LEVEL_DESIGN.md</code>, and bundle repo state
    · <a href="#page-top" style="color:{BRAND_ACCENT};text-decoration:none">↑ Back to top</a>
  </p>
</div>

</body>
</html>"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Feed the Bear Confluence page")
    parser.add_argument("--output", type=str, default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    page_html = build_page()
    output_path.write_text(page_html, encoding="utf-8")
    print(f"Generated: {output_path}")
    print(f"Size: {len(page_html):,} bytes")


if __name__ == "__main__":
    main()

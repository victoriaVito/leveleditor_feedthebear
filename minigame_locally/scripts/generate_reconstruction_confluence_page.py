#!/usr/bin/env python3
"""Generate a Confluence-safe child page for reconstruction comparisons.

This converts the dynamic localhost-only `level_toolkit_web/reconstruction_compare.html`
into a static HTML artifact with embedded screenshots and rendered SVG boards so it can
be pasted into a Confluence child page without relying on JavaScript or localhost assets.
"""

from __future__ import annotations

import base64
import html
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "output" / "confluence" / "reconstruction_compare_confluence_safe.html"
LEVELS_DIR = ROOT / "levels"
SCREENSHOTS_DIR = LEVELS_DIR / "screenshots"

EDITOR_FILES = [
    "image11_level_editor",
    "image19_level_editor",
    "image20_level_editor",
    "image21_level_editor",
    "image24_level_editor",
    "image25_level_editor",
    "image28_level_editor",
]

TIMESTAMPED_FILES = [
    "p_2_4_new_20260310165931",
    "p_2_5_new_20260310170335",
    "p_2_6_new_20260310170645",
    "p_2_9_new_20260310195328",
    "p_4_c_new_20260311075908",
    "level_2",
]

GROUPS = [
    {
        "slug": "editor-images",
        "title": "Editor Image Reconstructions",
        "description": "Screenshots captured from the editor and reconstructed into canonical level JSON files.",
        "files": EDITOR_FILES,
    },
    {
        "slug": "timestamped-variants",
        "title": "Timestamped Variant Reconstructions",
        "description": "One-off screenshot variants recovered and materialized into canonical JSON files.",
        "files": TIMESTAMPED_FILES,
    },
]

COLORS = {
    "blue": "#0EA5E9",
    "green": "#10B981",
    "orange": "#F97316",
    "cyan": "#0891B2",
    "yellow": "#FBBF24",
    "red": "#EF4444",
    "purple": "#A855F7",
    "pink": "#EC4899",
    "maroon": "#9F1239",
    "teal": "#14B8A6",
    "white": "#F8FAFC",
}

BRAND_BG = "#f3f7fb"
BRAND_SURFACE = "#ffffff"
BRAND_TEXT = "#0b1b2a"
BRAND_MUTED = "#5a748e"
BRAND_ACCENT = "#2fbb69"
BRAND_ACCENT_2 = "#0369a1"
BRAND_BORDER = "#d8e5f0"
BRAND_HEADER_GRADIENT = "linear-gradient(135deg, #0b1b2a 0%, #0f3460 50%, #0369a1 100%)"
TABLE_HEADER_GRADIENT = "linear-gradient(180deg, #f0f6fc 0%, #e8f0f8 100%)"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_level_path(stem: str) -> Path:
    preferred = [
        LEVELS_DIR / f"{stem}.json",
        LEVELS_DIR / "progression_" / f"{stem}.json",
        LEVELS_DIR / "backup" / f"{stem}.json",
    ]
    for candidate in preferred:
        if candidate.exists():
            return candidate

    fallback = sorted(
        path for path in LEVELS_DIR.rglob(f"{stem}.json")
        if ".backups" not in path.parts
    )
    if fallback:
        return fallback[0]
    raise FileNotFoundError(f"Could not find canonical JSON for {stem}")


def resolve_screenshot_path(stem: str) -> Path | None:
    candidates = [
        SCREENSHOTS_DIR / f"{stem}.png",
        ROOT / "screenshots" / f"{stem}.png",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def repo_relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def encode_file_data_uri(path: Path, mime_type: str) -> str:
    raw = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{raw}"


def encode_svg_data_uri(svg: str) -> str:
    raw = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{raw}"


def difficulty_label(level: dict) -> str:
    meta = level.get("meta") or {}
    manual = meta.get("manual_difficulty")
    if manual:
        return str(manual).upper()
    tier = level.get("difficultyTier")
    if tier == 1:
        return "EASY"
    if tier == 2:
        return "MEDIUM"
    return "HARD"


def pair_color(pair: dict, index: int) -> str:
    pair_type = pair.get("type")
    if pair_type in COLORS:
        return COLORS[pair_type]
    ordered = list(COLORS.values())
    return ordered[index % len(ordered)]


def render_level_svg(level: dict) -> str:
    cols = int(level["gridSize"]["cols"])
    rows = int(level["gridSize"]["rows"])
    cell = 42
    padding = 10
    width = cols * cell + padding * 2
    height = rows * cell + padding * 2
    pieces = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-label="Rendered reconstructed board">',
        '<rect width="100%" height="100%" fill="#f7fbff" rx="12" ry="12"/>',
    ]

    for x in range(cols + 1):
        x_pos = padding + x * cell
        pieces.append(
            f'<line x1="{x_pos}" y1="{padding}" x2="{x_pos}" y2="{padding + rows * cell}" '
            'stroke="#cbd5e1" stroke-width="1"/>'
        )
    for y in range(rows + 1):
        y_pos = padding + y * cell
        pieces.append(
            f'<line x1="{padding}" y1="{y_pos}" x2="{padding + cols * cell}" y2="{y_pos}" '
            'stroke="#cbd5e1" stroke-width="1"/>'
        )

    for blocker in level.get("blockers") or []:
        x_pos = padding + blocker["x"] * cell + 3
        y_pos = padding + blocker["y"] * cell + 3
        pieces.append(
            f'<rect x="{x_pos}" y="{y_pos}" width="{cell - 6}" height="{cell - 6}" '
            'fill="#334155" rx="4" ry="4"/>'
        )

    radius = cell * 0.31
    label_size = int(cell * 0.32)
    for index, pair in enumerate(level.get("pairs") or []):
        color = pair_color(pair, index)
        label = chr(65 + index)
        ax = padding + pair["a"]["x"] * cell + cell / 2
        ay = padding + pair["a"]["y"] * cell + cell / 2
        bx = padding + pair["b"]["x"] * cell + cell / 2
        by = padding + pair["b"]["y"] * cell + cell / 2
        pieces.append(
            f'<rect x="{ax - radius}" y="{ay - radius}" width="{radius * 2}" height="{radius * 2}" '
            f'fill="{color}" rx="4" ry="4"/>'
        )
        pieces.append(
            f'<circle cx="{bx}" cy="{by}" r="{radius}" fill="{color}"/>'
        )
        pieces.append(
            f'<text x="{ax}" y="{ay}" text-anchor="middle" dominant-baseline="middle" '
            f'font-family="Segoe UI, Arial, sans-serif" font-size="{label_size}" font-weight="700" fill="#ffffff">{label}</text>'
        )
        pieces.append(
            f'<text x="{bx}" y="{by}" text-anchor="middle" dominant-baseline="middle" '
            f'font-family="Segoe UI, Arial, sans-serif" font-size="{label_size}" font-weight="700" fill="#ffffff">{label}</text>'
        )

    pieces.append("</svg>")
    return "".join(pieces)


def original_image_html(stem: str) -> str:
    png_path = resolve_screenshot_path(stem)
    if png_path is None:
        return (
            f'<div style="padding:24px;text-align:center;color:{BRAND_MUTED};'
            f'border:1px dashed {BRAND_BORDER};border-radius:10px">Missing screenshot</div>'
        )
    return (
        f'<img src="{encode_file_data_uri(png_path, "image/png")}" alt="{html.escape(stem)} original screenshot" '
        f'style="display:block;width:100%;max-width:220px;margin:0 auto;border:1px solid {BRAND_BORDER};'
        'border-radius:10px" />'
    )


def reconstructed_image_html(level: dict, stem: str) -> str:
    svg = render_level_svg(level)
    return (
        f'<img src="{encode_svg_data_uri(svg)}" alt="{html.escape(stem)} reconstructed board" '
        f'style="display:block;width:100%;max-width:220px;margin:0 auto;border:1px solid {BRAND_BORDER};'
        'border-radius:10px;background:#f7fbff" />'
    )


def level_row_html(stem: str) -> str:
    level_path = resolve_level_path(stem)
    screenshot_path = resolve_screenshot_path(stem)
    level = read_json(level_path)
    cols = int(level["gridSize"]["cols"])
    rows = int(level["gridSize"]["rows"])
    pair_count = len(level.get("pairs") or [])
    blocker_count = len(level.get("blockers") or [])
    diff = difficulty_label(level)
    screenshot_label = repo_relative(screenshot_path) if screenshot_path else f"missing:{stem}.png"
    return f"""
    <tr>
      <td style="padding:12px;border:1px solid {BRAND_BORDER};vertical-align:top">
        <strong>{html.escape(stem)}</strong><br />
        <span style="color:{BRAND_MUTED};font-size:12px">JSON: <code>{html.escape(repo_relative(level_path))}</code></span><br />
        <span style="color:{BRAND_MUTED};font-size:12px">Screenshot: <code>{html.escape(screenshot_label)}</code></span>
      </td>
      <td style="padding:12px;border:1px solid {BRAND_BORDER};vertical-align:top;text-align:center"><code>{cols}x{rows}</code></td>
      <td style="padding:12px;border:1px solid {BRAND_BORDER};vertical-align:top;text-align:center">{pair_count}</td>
      <td style="padding:12px;border:1px solid {BRAND_BORDER};vertical-align:top;text-align:center">{blocker_count}</td>
      <td style="padding:12px;border:1px solid {BRAND_BORDER};vertical-align:top;text-align:center">{html.escape(diff)}</td>
      <td style="padding:12px;border:1px solid {BRAND_BORDER};vertical-align:middle;text-align:center">{original_image_html(stem)}</td>
      <td style="padding:12px;border:1px solid {BRAND_BORDER};vertical-align:middle;text-align:center">{reconstructed_image_html(level, stem)}</td>
    </tr>
    """


def group_summary_row(group: dict) -> str:
    levels = [read_json(resolve_level_path(stem)) for stem in group["files"]]
    pair_count = sum(len(level.get("pairs") or []) for level in levels)
    blocker_count = sum(len(level.get("blockers") or []) for level in levels)
    return (
        f"<tr>"
        f"<td style=\"padding:10px 12px;border:1px solid {BRAND_BORDER}\"><strong>{html.escape(group['title'])}</strong></td>"
        f"<td style=\"padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center\">{len(group['files'])}</td>"
        f"<td style=\"padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center\">{pair_count}</td>"
        f"<td style=\"padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center\">{blocker_count}</td>"
        f"<td style=\"padding:10px 12px;border:1px solid {BRAND_BORDER}\">{html.escape(group['description'])}</td>"
        f"</tr>"
    )


def build_group_section(group: dict) -> str:
    rows = "".join(level_row_html(stem) for stem in group["files"])
    return f"""
    <section id="{html.escape(group['slug'])}" style="margin-top:32px;background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:12px;padding:20px 24px">
      <h2 style="margin:0 0 12px 0;font-size:20px;color:{BRAND_TEXT};border-bottom:2px solid {BRAND_ACCENT};padding-bottom:8px;display:inline-block">{html.escape(group['title'])}</h2>
      <p style="margin:0 0 16px 0;color:{BRAND_TEXT}">{html.escape(group['description'])}</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;background:{BRAND_SURFACE}">
        <thead>
          <tr style="background:{TABLE_HEADER_GRADIENT}">
            <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:left;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Level</th>
            <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Grid</th>
            <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Pairs</th>
            <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Blockers</th>
            <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Difficulty</th>
            <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Original</th>
            <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Reconstructed</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </section>
    """


def build_html() -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    summary_rows = "".join(group_summary_row(group) for group in GROUPS)
    section_nav = " · ".join(
        f'<a href="#{html.escape(group["slug"])}" style="color:{BRAND_ACCENT_2};text-decoration:none;font-size:13px;font-weight:600">{html.escape(group["title"])}</a>'
        for group in GROUPS
    )
    sections = "".join(build_group_section(group) for group in GROUPS)
    return f"""<!DOCTYPE html>
<html>
<body style="font-family:system-ui,'Segoe UI',sans-serif;color:{BRAND_TEXT};max-width:1180px;margin:0 auto;padding:0;line-height:1.6;background:{BRAND_BG}">

<div style="background:{BRAND_HEADER_GRADIENT};padding:36px 32px 28px;border-radius:0 0 16px 16px;margin-bottom:24px">
  <h1 style="font-size:32px;margin:0 0 6px 0;color:#ffffff;font-weight:800;letter-spacing:-0.02em">Feed the Bear Reconstruction Comparison</h1>
  <p style="color:rgba(255,255,255,0.78);margin:0 0 6px 0;font-size:15px">Child-page-ready visual comparison for reconstructed levels. Original screenshots are shown next to static renders generated from canonical JSON.</p>
  <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0">Generated from repo data · No localhost dependency · Last updated: <strong style="color:rgba(255,255,255,0.72)">{today}</strong></p>
</div>

<div style="padding:0 24px 32px">
  <section style="background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:12px;padding:20px 24px;margin-bottom:20px">
    <h2 style="margin:0 0 12px 0;font-size:20px;color:{BRAND_TEXT};border-bottom:2px solid {BRAND_ACCENT};padding-bottom:8px;display:inline-block">Purpose</h2>
    <p style="margin:0 0 12px 0;color:{BRAND_TEXT}">This page replaces the dynamic <code>reconstruction_compare.html</code> localhost view with a Confluence-safe snapshot. Reviewers can verify board size, endpoint placement, blocker placement, and overall reconstruction fidelity without needing the local toolkit server.</p>
    <p style="margin:0;color:{BRAND_TEXT}"><strong>How to use it:</strong> compare the original screenshot against the reconstructed board for each row. Focus on endpoint count, relative positions, blocker count, and the board dimensions.</p>
  </section>

  <nav style="background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:12px;padding:16px 20px;margin-bottom:20px">
    <p style="margin:0 0 8px 0;font-weight:700;color:{BRAND_TEXT}">Contents</p>
    <div>{section_nav}</div>
  </nav>

  <section style="background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:12px;padding:20px 24px;margin-bottom:20px">
    <h2 style="margin:0 0 12px 0;font-size:20px;color:{BRAND_TEXT};border-bottom:2px solid {BRAND_ACCENT};padding-bottom:8px;display:inline-block">Summary</h2>
    <table style="border-collapse:collapse;width:100%;font-size:13px;background:{BRAND_SURFACE}">
      <thead>
        <tr style="background:{TABLE_HEADER_GRADIENT}">
          <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:left;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Group</th>
          <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Levels</th>
          <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Pairs</th>
          <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:center;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Blockers</th>
          <th style="padding:10px 12px;border:1px solid {BRAND_BORDER};text-align:left;color:{BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.04em">Notes</th>
        </tr>
      </thead>
      <tbody>{summary_rows}</tbody>
    </table>
  </section>

  {sections}
</div>

</body>
</html>
"""


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(build_html(), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

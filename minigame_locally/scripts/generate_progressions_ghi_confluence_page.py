#!/usr/bin/env python3
"""Generate a self-contained HTML page for Progressions G/H/I."""

from __future__ import annotations

import base64
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "output" / "confluence" / "feed_the_bear_progressions_ghi_confluence_safe.html"

PROGRESSIONS = [
    {
        "key": "g",
        "name": "Progression G",
        "slug": "progression-g",
        "curve_title": "Steady ramp",
        "summary": "G grows board size and pair count first, then adds blocker pressure. It is the cleanest of the three curves and works as the most readable bridge after F.",
        "design_note": "Use this when the goal is to keep the player reading structure clearly while still feeling escalation slot by slot.",
        "accent": "#16a34a",
        "soft": "#dcfce7",
    },
    {
        "key": "h",
        "name": "Progression H",
        "slug": "progression-h",
        "curve_title": "Blocker-led curve",
        "summary": "H introduces lane pressure earlier. Its boards rely more on corridor control, constraint shaping, and mid-curve tension than on raw board growth.",
        "design_note": "Use this when the target feeling is tighter routing and earlier commitment, not just more content on a larger board.",
        "accent": "#ea580c",
        "soft": "#ffedd5",
    },
    {
        "key": "i",
        "name": "Progression I",
        "slug": "progression-i",
        "curve_title": "Late-game compression",
        "summary": "I is the most aggressive editorial set. It leans on larger boards, stronger pair interaction, and a compressed hard ending with lower forgiveness.",
        "design_note": "Use this when the set should feel like a late-game package rather than a smooth onboarding curve.",
        "accent": "#2563eb",
        "soft": "#dbeafe",
    },
]

BRAND_BG = "#f3f7fb"
BRAND_SURFACE = "#ffffff"
BRAND_TEXT = "#0b1b2a"
BRAND_MUTED = "#5a748e"
BRAND_BORDER = "#d8e5f0"
BRAND_ACCENT = "#2fbb69"
BRAND_ACCENT_2 = "#0369a1"
BRAND_HEADER = "linear-gradient(135deg, #0b1b2a 0%, #0f3460 50%, #0369a1 100%)"
DIFF_COLORS = {"EASY": "#22c55e", "MEDIUM": "#f59e0b", "HARD": "#ef4444"}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_image_data_url(path: Path) -> str:
    if not path.exists():
        return ""
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def level_sort_key(slot: dict) -> int:
    return int(slot.get("slot", 0))


def difficulty_label(level_data: dict) -> str:
    return str(level_data.get("meta", {}).get("manual_difficulty") or "UNKNOWN").upper()


def board_label(level_data: dict) -> str:
    grid = level_data.get("gridSize", {})
    return f'{grid.get("cols", "?")}x{grid.get("rows", "?")}'


def average(values: list[int]) -> float:
    return round(sum(values) / len(values), 1) if values else 0.0


def build_curve_svg(levels: list[dict], accent: str) -> str:
    width = 720
    height = 160
    left = 34
    top = 18
    chart_width = width - left - 20
    chart_height = height - top - 32
    max_tier = max(max(item["difficultyTier"] for item in levels), 10)
    min_tier = 1
    step_x = chart_width / max(1, len(levels) - 1)
    points = []
    for index, item in enumerate(levels):
        tier = item["difficultyTier"]
        x = left + step_x * index
        ratio = (tier - min_tier) / max(1, (max_tier - min_tier))
        y = top + chart_height - (ratio * chart_height)
        points.append((x, y, item))
    polyline = " ".join(f"{x:.2f},{y:.2f}" for x, y, _item in points)
    circles = []
    labels = []
    for x, y, item in points:
        diff = html.escape(item["manualDifficulty"])
        circles.append(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="5" fill="{accent}" stroke="#ffffff" stroke-width="2"></circle>'
        )
        labels.append(
            f'<text x="{x:.2f}" y="{height - 8}" text-anchor="middle" '
            f'style="font:600 11px system-ui; fill:{BRAND_MUTED}">S{item["slot"]}</text>'
        )
        labels.append(
            f'<text x="{x:.2f}" y="{max(14, y - 10):.2f}" text-anchor="middle" '
            f'style="font:700 10px system-ui; fill:{accent}">{diff}</text>'
        )
    grid_lines = []
    for tier in range(min_tier, max_tier + 1):
        ratio = (tier - min_tier) / max(1, (max_tier - min_tier))
        y = top + chart_height - (ratio * chart_height)
        grid_lines.append(
            f'<line x1="{left}" y1="{y:.2f}" x2="{width - 18}" y2="{y:.2f}" stroke="{BRAND_BORDER}" stroke-dasharray="4 4"></line>'
        )
        grid_lines.append(
            f'<text x="8" y="{y + 4:.2f}" style="font:600 10px system-ui; fill:{BRAND_MUTED}">{tier}</text>'
        )
    return (
        f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="Difficulty curve">'
        f'{"".join(grid_lines)}'
        f'<polyline fill="none" stroke="{accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="{polyline}"></polyline>'
        f'{"".join(circles)}'
        f'{"".join(labels)}'
        f"</svg>"
    )


def build_metric_card(label: str, value: str) -> str:
    return (
        f'<div style="background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:12px;'
        f'padding:14px 16px">'
        f'<div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:{BRAND_MUTED};margin-bottom:4px">{html.escape(label)}</div>'
        f'<div style="font-size:22px;font-weight:800;color:{BRAND_TEXT}">{html.escape(value)}</div>'
        f'</div>'
    )


def build_slot_card(level: dict, accent: str, soft: str) -> str:
    density_ok = level["validation"].get("density_match", True)
    validation_bits = []
    if level["validation"].get("solvable", False):
        validation_bits.append("solvable")
    if density_ok:
        validation_bits.append("density ok")
    else:
        validation_bits.append("density review")
    if level["validation"].get("curve_integrity", False):
        validation_bits.append("curve ok")
    tags = []
    for text in validation_bits:
        bg = "#eef6ff" if text != "density review" else "#fff7ed"
        fg = BRAND_ACCENT_2 if text != "density review" else "#c2410c"
        tags.append(
            f'<span style="display:inline-block;padding:4px 8px;border-radius:999px;'
            f'background:{bg};color:{fg};font-size:11px;font-weight:700">{html.escape(text)}</span>'
        )
    img_html = (
        f'<img src="{level["imageData"]}" alt="{html.escape(level["id"])} screenshot" '
        f'style="display:block;width:100%;height:180px;object-fit:cover;border-radius:10px;'
        f'border:1px solid {BRAND_BORDER};background:#dbe7f2" />'
        if level["imageData"] else
        f'<div style="height:180px;border-radius:10px;border:1px dashed {BRAND_BORDER};'
        f'display:flex;align-items:center;justify-content:center;color:{BRAND_MUTED};font-size:13px">Missing screenshot</div>'
    )
    return (
        f'<article style="background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:16px;overflow:hidden;'
        f'box-shadow:0 1px 3px rgba(11,27,42,0.06)">'
        f'<div style="padding:14px 14px 12px;border-bottom:1px solid {BRAND_BORDER};background:{soft}">'
        f'<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">'
        f'<div><div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:{accent}">Slot {level["slot"]}</div>'
        f'<h3 style="margin:4px 0 0 0;font-size:18px;color:{BRAND_TEXT}">{html.escape(level["id"])}</h3></div>'
        f'<span style="display:inline-block;padding:5px 10px;border-radius:999px;background:#ffffff;'
        f'border:1px solid {accent};font-size:11px;font-weight:800;color:{accent}">{html.escape(level["manualDifficulty"])}</span>'
        f'</div>'
        f'</div>'
        f'<div style="padding:14px">{img_html}</div>'
        f'<div style="padding:0 14px 14px">'
        f'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:13px;color:{BRAND_TEXT};margin-bottom:10px">'
        f'<div><strong>Board:</strong> {html.escape(level["board"])}</div>'
        f'<div><strong>Pairs:</strong> {level["pairs"]}</div>'
        f'<div><strong>Blockers:</strong> {level["blockers"]}</div>'
        f'<div><strong>Moves:</strong> {level["moves"]}</div>'
        f'<div><strong>Solutions:</strong> {level["solutionCount"]}</div>'
        f'<div><strong>Tier:</strong> {level["difficultyTier"]}</div>'
        f'</div>'
        f'<p style="margin:0 0 10px 0;font-size:12px;color:{BRAND_MUTED}"><strong>Source:</strong> {html.escape(level["sourceLevel"])}</p>'
        f'<div style="display:flex;flex-wrap:wrap;gap:6px">{"".join(tags)}</div>'
        f'</div>'
        f'</article>'
    )


def load_progression(config: dict) -> dict:
    progression_path = ROOT / "progressions" / f'progression_{config["key"]}.json'
    progression = read_json(progression_path)
    level_rows = []
    for slot in sorted(progression.get("slots", []), key=level_sort_key):
        if int(slot.get("slot", -1)) <= 0 or "level_file" not in slot:
            continue
        level_path = ROOT / slot["level_file"]
        level_data = read_json(level_path)
        image_path = level_path.with_suffix(".png")
        level_rows.append({
            "slot": int(slot["slot"]),
            "id": level_data.get("id", level_path.stem),
            "board": board_label(level_data),
            "pairs": len(level_data.get("pairs", [])),
            "blockers": len(level_data.get("blockers", [])),
            "moves": int(level_data.get("moves", 0)),
            "solutionCount": int(level_data.get("solutionCount", 0)),
            "difficultyTier": int(level_data.get("difficultyTier", 0)),
            "manualDifficulty": difficulty_label(level_data),
            "sourceLevel": str(level_data.get("meta", {}).get("source_level", "")),
            "validation": level_data.get("validation", {}),
            "imageData": read_image_data_url(image_path),
        })
    difficulties = [item["manualDifficulty"] for item in level_rows]
    density_reviews = sum(1 for item in level_rows if not item["validation"].get("density_match", True))
    config["progressionFile"] = progression_path.relative_to(ROOT).as_posix()
    config["bundleFile"] = f'bundles/progression_{config["key"]}/progression_{config["key"]}_progression.csv'
    config["levels"] = level_rows
    config["curveSvg"] = build_curve_svg(level_rows, config["accent"])
    config["metrics"] = {
        "Boards": f'{level_rows[0]["board"]} → {level_rows[-1]["board"]}',
        "Avg pairs": str(average([item["pairs"] for item in level_rows])),
        "Avg blockers": str(average([item["blockers"] for item in level_rows])),
        "Solutions": f'{min(item["solutionCount"] for item in level_rows)} → {max(item["solutionCount"] for item in level_rows)}',
        "Difficulty mix": f'E{difficulties.count("EASY")} / M{difficulties.count("MEDIUM")} / H{difficulties.count("HARD")}',
        "Flags": "Clean" if density_reviews == 0 else f"{density_reviews} review",
    }
    return config


def build_overview_cards(progressions: list[dict]) -> str:
    cards = []
    for item in progressions:
        cards.append(
            f'<article style="background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:16px;'
            f'padding:18px 20px;box-shadow:0 1px 3px rgba(11,27,42,0.06)">'
            f'<div style="display:inline-block;padding:5px 10px;border-radius:999px;background:{item["soft"]};'
            f'color:{item["accent"]};font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase">{html.escape(item["curve_title"])}</div>'
            f'<h3 style="margin:10px 0 8px 0;font-size:22px;color:{BRAND_TEXT}">{html.escape(item["name"])}</h3>'
            f'<p style="margin:0 0 10px 0;color:{BRAND_TEXT}">{html.escape(item["summary"])}</p>'
            f'<p style="margin:0;color:{BRAND_MUTED};font-size:13px">{html.escape(item["design_note"])}</p>'
            f'</article>'
        )
    return "".join(cards)


def build_progression_section(item: dict) -> str:
    metric_cards = "".join(build_metric_card(label, value) for label, value in item["metrics"].items())
    slot_cards = "".join(build_slot_card(level, item["accent"], item["soft"]) for level in item["levels"])
    return (
        f'<section id="{item["slug"]}" style="margin-top:32px;background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};'
        f'border-radius:16px;padding:22px 24px">'
        f'<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:10px">'
        f'<span style="display:inline-block;padding:5px 10px;border-radius:999px;background:{item["soft"]};'
        f'color:{item["accent"]};font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase">{html.escape(item["curve_title"])}</span>'
        f'<span style="display:inline-block;padding:5px 10px;border-radius:999px;background:#eff6ff;'
        f'color:{BRAND_ACCENT_2};font-size:11px;font-weight:800">10 levels + tutorial</span>'
        f'</div>'
        f'<h2 style="margin:0 0 10px 0;font-size:28px;color:{BRAND_TEXT};letter-spacing:-0.02em">{html.escape(item["name"])}</h2>'
        f'<p style="margin:0 0 8px 0;color:{BRAND_TEXT}">{html.escape(item["summary"])}</p>'
        f'<p style="margin:0 0 16px 0;color:{BRAND_MUTED}">{html.escape(item["design_note"])}</p>'
        f'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:18px">{metric_cards}</div>'
        f'<div style="background:{BRAND_BG};border:1px solid {BRAND_BORDER};border-radius:14px;padding:14px 16px;margin-bottom:16px">'
        f'<div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:{BRAND_MUTED};margin-bottom:8px">Difficulty curve</div>'
        f'{item["curveSvg"]}'
        f'</div>'
        f'<div style="background:{BRAND_BG};border:1px solid {BRAND_BORDER};border-radius:14px;padding:14px 16px;margin-bottom:18px">'
        f'<p style="margin:0 0 8px 0;color:{BRAND_TEXT}"><strong>Canonical progression file:</strong> <code>{html.escape(item["progressionFile"])}</code></p>'
        f'<p style="margin:0;color:{BRAND_TEXT}"><strong>Bundle CSV:</strong> <code>{html.escape(item["bundleFile"])}</code></p>'
        f'</div>'
        f'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">{slot_cards}</div>'
        f'</section>'
    )


def build_html(progressions: list[dict]) -> str:
    sections = "".join(build_progression_section(item) for item in progressions)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Feed the Bear - Progressions G/H/I</title>
</head>
<body style="margin:0;background:{BRAND_BG};font-family:system-ui,'Segoe UI',sans-serif;color:{BRAND_TEXT};line-height:1.6">
  <div style="background:{BRAND_HEADER};padding:36px 32px 28px">
    <div style="max-width:1180px;margin:0 auto">
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
        <span style="display:inline-block;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,0.12);color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase">Progressions</span>
        <span style="display:inline-block;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,0.12);color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase">Curated</span>
        <span style="display:inline-block;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,0.12);color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase">G / H / I</span>
      </div>
      <h1 style="margin:0 0 10px 0;font-size:40px;line-height:1.05;color:#ffffff;letter-spacing:-0.03em">Feed the Bear - Progressions G, H, and I</h1>
      <p style="margin:0;max-width:860px;color:rgba(255,255,255,0.82);font-size:17px">Editorial overview of the new post-F progression sets. This page captures why each curve exists, how the difficulty ramps differ, and what each slot is actually carrying in the canonical repo state.</p>
    </div>
  </div>
  <main style="max-width:1180px;margin:0 auto;padding:24px">
    <nav style="background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:16px;padding:18px 20px;box-shadow:0 1px 3px rgba(11,27,42,0.06)">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:{BRAND_MUTED};margin-bottom:8px">Contents</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px 16px">
        <a href="#overview" style="color:{BRAND_ACCENT_2};text-decoration:none;font-weight:600">Overview</a>
        <a href="#curve-strategy" style="color:{BRAND_ACCENT_2};text-decoration:none;font-weight:600">Curve strategy</a>
        <a href="#progression-g" style="color:{BRAND_ACCENT_2};text-decoration:none;font-weight:600">Progression G</a>
        <a href="#progression-h" style="color:{BRAND_ACCENT_2};text-decoration:none;font-weight:600">Progression H</a>
        <a href="#progression-i" style="color:{BRAND_ACCENT_2};text-decoration:none;font-weight:600">Progression I</a>
      </div>
    </nav>

    <section id="overview" style="margin-top:24px;background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:16px;padding:22px 24px">
      <h2 style="margin:0 0 10px 0;font-size:28px;color:{BRAND_TEXT};letter-spacing:-0.02em">Overview</h2>
      <p style="margin:0 0 12px 0;color:{BRAND_TEXT}">These three progressions were curated as distinct editorial products, not as one repeated template. The source of truth lives in <code>progressions/progression_g.json</code>, <code>progressions/progression_h.json</code>, <code>progressions/progression_i.json</code>, plus their level folders under <code>levels/</code> and bundle CSVs under <code>bundles/</code>.</p>
      <p style="margin:0 0 18px 0;color:{BRAND_TEXT}">They were also included in the canonical spreadsheet rebuild, so this page now matches the same repo and reporting state.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
        {build_overview_cards(progressions)}
      </div>
    </section>

    <section id="curve-strategy" style="margin-top:24px;background:{BRAND_SURFACE};border:1px solid {BRAND_BORDER};border-radius:16px;padding:22px 24px">
      <h2 style="margin:0 0 10px 0;font-size:28px;color:{BRAND_TEXT};letter-spacing:-0.02em">Curve strategy</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
        <div style="background:{BRAND_BG};border:1px solid {BRAND_BORDER};border-radius:14px;padding:16px 18px">
          <h3 style="margin:0 0 8px 0;font-size:17px;color:{BRAND_TEXT}">Variety over repetition</h3>
          <p style="margin:0;color:{BRAND_MUTED}">The three sets avoid repeating the same difficulty shape. One is smoother, one is blocker-driven, and one is intentionally harsher in the back half.</p>
        </div>
        <div style="background:{BRAND_BG};border:1px solid {BRAND_BORDER};border-radius:14px;padding:16px 18px">
          <h3 style="margin:0 0 8px 0;font-size:17px;color:{BRAND_TEXT}">Procedural rules applied</h3>
          <p style="margin:0;color:{BRAND_MUTED}">Board growth, pair pressure, blocker meaning, and slot readability were balanced together instead of treating difficulty as only one number.</p>
        </div>
        <div style="background:{BRAND_BG};border:1px solid {BRAND_BORDER};border-radius:14px;padding:16px 18px">
          <h3 style="margin:0 0 8px 0;font-size:17px;color:{BRAND_TEXT}">Editorial intent stays explicit</h3>
          <p style="margin:0;color:{BRAND_MUTED}">Each slot keeps traceability back to its source file, which matters when a curve later needs swap-outs, review, or live-ops packaging.</p>
        </div>
      </div>
    </section>

    {sections}
  </main>
</body>
</html>
"""


def main() -> None:
    loaded = [load_progression(dict(item)) for item in PROGRESSIONS]
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(build_html(loaded), encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "output": str(OUTPUT_PATH.relative_to(ROOT)),
        "progressions": [item["name"] for item in loaded],
    }, indent=2))


if __name__ == "__main__":
    main()

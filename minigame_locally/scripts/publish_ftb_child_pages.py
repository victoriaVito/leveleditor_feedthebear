#!/usr/bin/env python3
"""Publish specialized Feed the Bear child pages to Kingfluence.

Creates or updates a set of child pages below the main FtB page, writes a local
manifest with their page IDs and URLs, regenerates the parent page so it links
to those specialized pages, and republishes the parent hub.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

import generate_full_confluence_page as gen
BASE_URL = "https://kingfluence.com"
PARENT_PAGE_ID = "990479168"
OUTPUT_DIR = ROOT / "output" / "confluence"
MANIFEST_PATH = OUTPUT_DIR / "ftb_child_pages_manifest.json"
PARENT_OUTPUT = OUTPUT_DIR / "feed_the_bear_full_page_confluence_safe.html"

PLAYTEST_TEXT = gen.read_text(gen.PLAYTEST_PATH)
LEVEL_DESIGN_TEXT = gen.read_text(gen.LEVEL_DESIGN_PATH)
GDD_TEXT = gen.read_text(gen.GDD_PATH)
SPREADSHEET_TEXT = gen.read_text(gen.SPREADSHEET_CONTROL_PANEL_PATH)
FEEDBACK_STATE = gen.read_json(gen.FEEDBACK_STATE_PATH)


def make_status_badge(title: str, colour: str) -> str:
    return (
        f'<ac:structured-macro ac:name="status">'
        f'<ac:parameter ac:name="title">{title}</ac:parameter>'
        f'<ac:parameter ac:name="colour">{colour}</ac:parameter>'
        f'</ac:structured-macro>'
    )


def wrap_preview_html(body: str) -> str:
    return (
        "<!DOCTYPE html><html><body "
        f'style="font-family:system-ui,\'Segoe UI\',sans-serif;color:{gen.BRAND_TEXT};'
        f'max-width:980px;margin:0 auto;padding:0;line-height:1.6;background:{gen.BRAND_BG}">'
        f"{body}</body></html>"
    )


def extract_body_from_html(html_text: str) -> str:
    start = html_text.lower().find("<body")
    if start == -1:
        return html_text.strip()
    start = html_text.find(">", start)
    end = html_text.lower().rfind("</body>")
    if start == -1 or end == -1:
        return html_text.strip()
    return html_text[start + 1:end].strip()


def build_header(title: str, subtitle: str, badges: list[tuple[str, str]]) -> str:
    badge_row = "&#160;".join(make_status_badge(label, colour) for label, colour in badges)
    return (
        f'<div style="background:{gen.BRAND_HEADER_GRADIENT};padding:32px 32px 24px;'
        f'border-radius:0 0 16px 16px;margin-bottom:24px">'
        f'<h1 style="font-size:30px;margin:0 0 8px 0;color:#ffffff;font-weight:800;letter-spacing:-0.02em">{title}</h1>'
        f'<p style="color:rgba(255,255,255,0.75);margin:0 0 8px 0;font-size:15px">{subtitle}</p>'
        f'<p>{badge_row}</p>'
        f'</div>'
    )


def build_shell(title: str, subtitle: str, badges: list[tuple[str, str]],
                toc_entries: list[tuple[str, str]], sections: list[str]) -> str:
    footer = (
        f'<div style="background:{gen.BRAND_TEXT};padding:20px 32px;border-radius:16px 16px 0 0;'
        f'margin-top:32px;text-align:center">'
        f'<p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">'
        f'<a href="{BASE_URL}/pages/viewpage.action?pageId={PARENT_PAGE_ID}" '
        f'style="color:{gen.BRAND_ACCENT};text-decoration:none">↑ Back to Feed the Bear hub</a>'
        f"</p></div>"
    )
    return (
        f"{build_header(title, subtitle, badges)}"
        f'<div style="padding:0 24px">{gen.build_toc(toc_entries)}{"".join(sections)}</div>'
        f"{footer}"
    )


def build_feedback_playtest_body() -> str:
    sections = [
        gen.build_doc_section(
            "System Overview", PLAYTEST_TEXT, "1. System Overview", "system-overview"
        ),
        gen.build_doc_section(
            "Metrics That Matter", PLAYTEST_TEXT, "7. Metrics That Matter", "metrics-that-matter"
        ),
        gen.build_doc_section(
            "How Playtest Feeds Learning", PLAYTEST_TEXT, "8. How Playtest Feeds Learning",
            "how-playtest-feeds-learning"
        ),
        gen.build_doc_section(
            "How To Read Results", PLAYTEST_TEXT, "How To Read Results", "how-to-read-results"
        ),
        gen.build_doc_section(
            "VitoBot Synthetic Player", PLAYTEST_TEXT, "9. VitoBot Synthetic Player",
            "vitobot-synthetic-player"
        ),
    ]
    sections = [
        gen.build_macro_group_section(
            "feedback-review-guide",
            "Feedback and Playtest Guide",
            gen.build_callout(
                "Use this page for review decisions",
                "This page is the focused reference for how playtest signals are captured, how reviewer feedback should be read, and which signals are strong enough to influence learning or level changes.",
                tone="info",
            ) + gen.build_callout(
                "Trust rule",
                "A solved session is not automatically a reliable positive. Read validation first, then behaviour, then reviewer notes, and only then decide whether the level needs a tweak, a reorder, or a full repair.",
                tone="warning",
            ),
            "".join(
                gen.build_expand_macro(strip_first_h2(section), section)
                for section in sections if section
            ),
        )
    ]
    return build_shell(
        "Feed the Bear - Feedback and Playtest",
        "Focused review guidance for session reading, feedback interpretation, and learning signals.",
        [("Feedback", "Yellow"), ("Playtest", "Blue"), ("Review Ops", "Grey")],
        [
            ("Feedback Guide", "feedback-review-guide"),
            ("System Overview", "system-overview"),
            ("Metrics", "metrics-that-matter"),
            ("How To Read Results", "how-to-read-results"),
            ("VitoBot", "vitobot-synthetic-player"),
        ],
        sections,
    )


def build_level_design_reference_body() -> str:
    inner = []
    for title, heading, anchor in [
        ("Vocabulary", "1. Vocabulary", "vocabulary"),
        ("Anatomy Of A Good Level", "2. Anatomy Of A Good Level", "anatomy-of-a-good-level"),
        ("How To Think About Difficulty", "3. How To Think About Difficulty", "how-to-think-about-difficulty"),
        ("Common Mistakes", "4. The Most Common Mistakes", "common-mistakes"),
        ("Working With Procedural Generation", "6. Working With Procedural Generation", "working-with-procedural-generation"),
        ("Working With Live Ops Mixes", "7. Working With Live Ops Mixes", "working-with-live-ops-mixes"),
        ("Level Checklist", "8. Level Checklist", "level-checklist"),
    ]:
        section = gen.build_doc_subsection(title, LEVEL_DESIGN_TEXT, heading, anchor)
        if section:
            inner.append(gen.build_expand_macro(title, section))

    sections = [
        gen.build_macro_group_section(
            "level-design-reference",
            "Level Design Reference",
            gen.build_callout(
                "Use this page when you need board-level craft rules",
                "This is the cleaner reference surface for vocabulary, failure modes, checklist thinking, and the craft rules that sit below the high-level GDD.",
                tone="success",
            ),
            "".join(inner),
        )
    ]
    return build_shell(
        "Feed the Bear - Level Design Reference",
        "Concrete craft guidance for board anatomy, difficulty thinking, common mistakes, and final quality checks.",
        [("Design", "Blue"), ("Craft", "Green"), ("Reference", "Grey")],
        [
            ("Level Design Reference", "level-design-reference"),
            ("Difficulty Thinking", "how-to-think-about-difficulty"),
            ("Common Mistakes", "common-mistakes"),
            ("Checklist", "level-checklist"),
        ],
        sections,
    )


def build_tooling_workflow_body() -> str:
    inner = []
    for title, html_block in [
        ("Toolkit Workflow", gen.build_doc_subsection("Toolkit Workflow", GDD_TEXT, "9. Tooling and Workflow", "toolkit-workflow")),
        ("Tooling Systems", gen.build_tooling_section(embedded=True)),
        ("Current Supported Vs Planned", gen.build_doc_subsection("Current Supported Vs Planned", SPREADSHEET_TEXT, "Current Supported Vs Planned", "current-supported-vs-planned")),
        ("Source of Truth", gen.build_doc_subsection("Source of Truth", GDD_TEXT, "10. Source of Truth", "source-of-truth")),
        ("Related Docs", gen.build_doc_subsection("Related Docs", GDD_TEXT, "12. Related Docs", "related-docs")),
    ]:
        if html_block:
            inner.append(gen.build_expand_macro(title, html_block))

    sections = [
        gen.build_macro_group_section(
            "tooling-and-workflow",
            "Tooling and Workflow",
            gen.build_callout(
                "Operational reading",
                "Use this page when the question is about surfaces, process, ownership, or which system is allowed to change canonical data versus only staging or reviewing it.",
                tone="info",
            ) + gen.build_callout(
                "Source-of-truth rule",
                "If the spreadsheet or a generated export disagrees with the repo, the repo wins. The spreadsheet is a review and planning surface, not the silent owner of canonical level files.",
                tone="warning",
            ),
            "".join(inner),
        )
    ]
    return build_shell(
        "Feed the Bear - Tooling and Workflow",
        "Operational documentation for the toolkit, spreadsheet boundary, workflow order, and source-of-truth rules.",
        [("Workflow", "Blue"), ("Toolkit", "Yellow"), ("Operations", "Grey")],
        [
            ("Tooling and Workflow", "tooling-and-workflow"),
            ("Tooling Systems", "tooling-systems"),
            ("Source of Truth", "source-of-truth"),
            ("Related Docs", "related-docs"),
        ],
        sections,
    )


def strip_first_h2(section_html: str) -> str:
    match = re.search(r"<h2[^>]*>(.*?)</h2>", section_html, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return "Section"
    title = re.sub(r"<[^>]+>", "", match.group(1))
    return re.sub(r"\s+", " ", title).strip()


CHILD_PAGES = [
    {
        "slug": "feedback_playtest",
        "title": "Feed the Bear - Feedback and Playtest",
        "label": "Feedback",
        "summary": "Playtest flow, reading rules, metrics that matter, and how feedback should influence learning or level changes.",
        "output": OUTPUT_DIR / "feed_the_bear_feedback_playtest_confluence_safe.html",
        "builder": build_feedback_playtest_body,
    },
    {
        "slug": "level_design_reference",
        "title": "Feed the Bear - Level Design Reference",
        "label": "Design",
        "summary": "Vocabulary, anatomy of a strong level, difficulty framing, common mistakes, and the checklist for final review.",
        "output": OUTPUT_DIR / "feed_the_bear_level_design_reference_confluence_safe.html",
        "builder": build_level_design_reference_body,
    },
    {
        "slug": "tooling_workflow",
        "title": "Feed the Bear - Tooling and Workflow",
        "label": "Workflow",
        "summary": "Toolkit surfaces, spreadsheet boundaries, source-of-truth rules, and the intended editorial pipeline.",
        "output": OUTPUT_DIR / "feed_the_bear_tooling_workflow_confluence_safe.html",
        "builder": build_tooling_workflow_body,
    },
]


def require_token() -> str:
    token = os.environ.get("CONFLUENCE_TOKEN", "").strip()
    if token:
        return token
    raise SystemExit("Missing CONFLUENCE_TOKEN.")


def confluence_session() -> requests.Session:
    token = require_token()
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Atlassian-Token": "no-check",
    })
    return session


def get_page(session: requests.Session, page_id: str, expand: str = "body.storage,version,title,space") -> dict:
    response = session.get(f"{BASE_URL}/rest/api/content/{page_id}", params={"expand": expand})
    response.raise_for_status()
    return response.json()


def list_child_pages(session: requests.Session) -> dict[str, dict]:
    response = session.get(
        f"{BASE_URL}/rest/api/content/{PARENT_PAGE_ID}/child/page",
        params={"limit": 200, "expand": "version,title"}
    )
    response.raise_for_status()
    data = response.json()
    return {item["title"]: item for item in data.get("results", [])}


def put_page(session: requests.Session, page_id: str, title: str, body: str,
             version_number: int) -> dict:
    payload = {
        "id": page_id,
        "type": "page",
        "title": title,
        "version": {"number": version_number + 1},
        "body": {"storage": {"value": body, "representation": "storage"}},
    }
    response = session.put(f"{BASE_URL}/rest/api/content/{page_id}", json=payload)
    response.raise_for_status()
    return response.json()


def create_child_page(session: requests.Session, parent_space_key: str, title: str, body: str) -> dict:
    payload = {
        "type": "page",
        "title": title,
        "ancestors": [{"id": PARENT_PAGE_ID}],
        "space": {"key": parent_space_key},
        "body": {"storage": {"value": body, "representation": "storage"}},
    }
    response = session.post(f"{BASE_URL}/rest/api/content", json=payload)
    response.raise_for_status()
    return response.json()


def write_preview(output_path: Path, body: str) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(wrap_preview_html(body), encoding="utf-8")


def publish_child_pages() -> list[dict]:
    session = confluence_session()
    parent = get_page(session, PARENT_PAGE_ID, expand="title,space,version")
    parent_space_key = parent["space"]["key"]
    existing_by_title = list_child_pages(session)
    manifest_pages = []

    for config in CHILD_PAGES:
        body = config["builder"]()
        write_preview(config["output"], body)

        existing = existing_by_title.get(config["title"])
        if existing:
            result = put_page(
                session,
                existing["id"],
                config["title"],
                body,
                int(existing.get("version", {}).get("number", 1))
            )
        else:
            result = create_child_page(session, parent_space_key, config["title"], body)

        page_id = str(result["id"])
        manifest_pages.append({
            "slug": config["slug"],
            "title": config["title"],
            "label": config["label"],
            "summary": config["summary"],
            "pageId": page_id,
            "url": f"{BASE_URL}/pages/viewpage.action?pageId={page_id}",
            "outputPath": str(config["output"].relative_to(ROOT)),
            "version": int(result["version"]["number"]),
        })

    manifest = {
        "parentPageId": PARENT_PAGE_ID,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pages": manifest_pages,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest_pages


def regenerate_parent() -> None:
    subprocess.run(
        ["python3", str(ROOT / "scripts" / "generate_full_confluence_page.py")],
        cwd=str(ROOT),
        check=True,
    )


def publish_parent() -> dict:
    session = confluence_session()
    parent = get_page(session, PARENT_PAGE_ID)
    current_version = int(parent["version"]["number"])
    title = parent["title"]
    html_text = PARENT_OUTPUT.read_text(encoding="utf-8")
    body = extract_body_from_html(html_text)
    return put_page(session, PARENT_PAGE_ID, title, body, current_version)


def verify_storage_xml(file_path: Path) -> None:
    from xml.etree import ElementTree as etree

    body = extract_body_from_html(file_path.read_text(encoding="utf-8"))
    etree.fromstring(f'<root xmlns:ac="http://example.com/ac">{body}</root>')


def main() -> None:
    published_pages = publish_child_pages()
    regenerate_parent()

    for config in CHILD_PAGES:
        verify_storage_xml(config["output"])
    verify_storage_xml(PARENT_OUTPUT)

    parent_result = publish_parent()

    print("Published child pages:")
    for page in published_pages:
        print(f"- {page['title']} -> {page['pageId']} (v{page['version']})")
    print(f"Parent page -> {parent_result['id']} (v{parent_result['version']['number']})")
    print(f"Manifest -> {MANIFEST_PATH}")


if __name__ == "__main__":
    main()

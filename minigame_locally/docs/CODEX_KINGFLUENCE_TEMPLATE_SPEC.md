# Codex Task: Kingfluence Page Template Improvements
**Date:** 2026-04-02
**Author:** Claude (Cowork session)
**For:** Codex autonomous implementation
**Pages:** Career page (961710850) + FtB page (990479168)

---

## Context

Both pages are already partially templated (career=v17, FtB=v70). This doc specifies the remaining improvements Codex should implement via the Confluence REST API.

The pages are on Confluence Server at `https://kingfluence.com` authenticated as `victoria.serrano@king.com` (Okta SSO). No PAT token exists — Codex must use the browser session via the existing Python script pattern OR ask Vito to provide a PAT via env var `CONFLUENCE_TOKEN`.

---

## REST API Pattern (already proven working)

```python
import os, requests, json

BASE = "https://kingfluence.com"
TOKEN = os.environ["CONFLUENCE_TOKEN"]  # Vito must supply this

session = requests.Session()
session.headers.update({
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
})

def get_page(page_id):
    r = session.get(f"{BASE}/rest/api/content/{page_id}", params={"expand": "body.storage,version"})
    r.raise_for_status()
    return r.json()

def put_page(page_id, title, new_body, current_version):
    payload = {
        "id": page_id,
        "type": "page",
        "title": title,
        "version": {"number": current_version + 1},
        "body": {"storage": {"value": new_body, "representation": "storage"}}
    }
    r = session.put(f"{BASE}/rest/api/content/{page_id}", json=payload)
    r.raise_for_status()
    new_ver = r.json()["version"]["number"]
    print(f"SUCCESS. New version: {new_ver}")
    return r.json()
```

**Critical rules learned from this session:**
- Always include `title` in the PUT payload — omitting it gives `400 "You need to include the title"`
- Inline `div style="background: linear-gradient(...)"` gets stripped by Confluence Server's content sanitiser. Use `panel` macro with `bgColor` instead.
- `&#160;` for non-breaking spaces works fine in storage XML
- `ac:structured-macro ac:name="status"` works reliably for colored badges

---

## Task 1: Career Page (pageId 961710850) — Add Expand Sections per Level

### What exists now (v17)
- Panel header "Level Design Career Guide" with status badges
- 2-column layout: Quick Facts sidebar (30%) + main content (70%)
- Main content has 6 H2 sections + AUI horizontal nav tabs for each level

### What to add: wrap the 6 H2 sections in expand macros

The main column currently has this structure:
```
<h2>Summary: Your Career Path Is Up to You</h2>
... content ...
<h2>Overview &amp; Philosophy</h2>
... content ...
<h2>Career Path: L8 → L13</h2>
... (auihorizontalnav macro with tabs) ...
<h2>Your PDP — How to Use It</h2>
... content ...
<h2>End of Year &amp; Feedback — Talent Month</h2>
... content ...
<h2>Quick Links &amp; Resources</h2>
... content ...
```

**Transform each H2 section into an expand macro like this:**

```xml
<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">📋 Summary: Your Career Path Is Up to You</ac:parameter>
  <ac:rich-text-body>
    <h2>Summary: Your Career Path Is Up to You</h2>
    ... existing content for this section ...
  </ac:rich-text-body>
</ac:structured-macro>
```

**Emoji prefix per section:**

| H2 Title | Emoji |
|---|---|
| Summary: Your Career Path Is Up to You | 📋 |
| Overview & Philosophy | 🧭 |
| Career Path: L8 → L13 | 🪜 |
| Your PDP — How to Use It | 📈 |
| End of Year & Feedback — Talent Month | 🌟 |
| Quick Links & Resources | 🔗 |

**Implementation approach:**
1. GET page 961710850 body
2. Find the layout's right cell (`<ac:layout-cell>` second occurrence = main content)
3. Use regex to split by `<h2>` tags and wrap each chunk in an expand macro
4. PUT back as next version

**Python regex approach:**
```python
import re

def wrap_h2_sections_in_expands(body):
    emoji_map = {
        "Summary": "📋",
        "Overview": "🧭",
        "Career Path": "🪜",
        "Your PDP": "📈",
        "End of Year": "🌟",
        "Quick Links": "🔗"
    }

    def get_emoji(title):
        for key, emoji in emoji_map.items():
            if key in title:
                return emoji
        return "📄"

    def wrap_in_expand(h2_tag, title_text, content):
        emoji = get_emoji(title_text)
        clean_title = re.sub(r'<[^>]+>', '', title_text).strip()
        return (
            f'<ac:structured-macro ac:name="expand">'
            f'<ac:parameter ac:name="title">{emoji} {clean_title}</ac:parameter>'
            f'<ac:rich-text-body>{h2_tag}{content}</ac:rich-text-body>'
            f'</ac:structured-macro>'
        )

    # Split on <h2> tags, preserving the tag
    parts = re.split(r'(<h2[^>]*>[\s\S]*?</h2>)', body)
    # parts alternates: [pre_first_h2, h2_tag, content, h2_tag, content, ...]
    result = parts[0]  # content before first H2
    i = 1
    while i < len(parts):
        h2_tag = parts[i]
        content = parts[i+1] if i+1 < len(parts) else ""
        title_text = re.sub(r'<[^>]+>', '', h2_tag)
        result += wrap_in_expand(h2_tag, title_text, content)
        i += 2
    return result
```

**Note:** Only apply this transformation inside the second `<ac:layout-cell>` (the main content column), not to the entire body.

---

## Task 2: Career Page — Improve Header Panel Styling

### What exists now
```xml
<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="borderStyle">solid</ac:parameter>
  <ac:parameter ac:name="borderColor">#0f3460</ac:parameter>
  <ac:parameter ac:name="bgColor">#e8f0f8</ac:parameter>
  <ac:parameter ac:name="title">Level Design Career Guide</ac:parameter>
  <ac:rich-text-body>
    <p><strong>Career ladder L8–L13</strong> · Individual Contributor & Leadership paths · Last updated: April 2026</p>
    <p>[status badges: Active, Level Design, King, L8 to L13]</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

### What to change: add level badge row

Add a second paragraph with individual level badges (L8 through L13) using status macros with the same colors used elsewhere in FtB:

```xml
<p>
  <ac:structured-macro ac:name="status"><ac:parameter ac:name="title">L8 Intern</ac:parameter><ac:parameter ac:name="colour">Grey</ac:parameter></ac:structured-macro>&#160;
  <ac:structured-macro ac:name="status"><ac:parameter ac:name="title">L9 Associate</ac:parameter><ac:parameter ac:name="colour">Grey</ac:parameter></ac:structured-macro>&#160;
  <ac:structured-macro ac:name="status"><ac:parameter ac:name="title">L10 Designer</ac:parameter><ac:parameter ac:name="colour">Blue</ac:parameter></ac:structured-macro>&#160;
  <ac:structured-macro ac:name="status"><ac:parameter ac:name="title">L11 Senior</ac:parameter><ac:parameter ac:name="colour">Blue</ac:parameter></ac:structured-macro>&#160;
  <ac:structured-macro ac:name="status"><ac:parameter ac:name="title">L12 Principal / Lead</ac:parameter><ac:parameter ac:name="colour">Yellow</ac:parameter></ac:structured-macro>&#160;
  <ac:structured-macro ac:name="status"><ac:parameter ac:name="title">L13 Sr Principal / Sr Lead</ac:parameter><ac:parameter ac:name="colour">Red</ac:parameter></ac:structured-macro>
</p>
```

---

## Task 3: FtB Page (pageId 990479168) — No Major Changes Needed

The FtB page (v70) is already well structured:
- H1 "Feed the Bear — Level Design" wrapped in a panel header (added in v70)
- Quick Facts sidebar with status badges
- 77 level difficulty status badges (EASY=Green, MEDIUM=Yellow, HARD=Red)
- 156 expand sections for level details
- 5 panel blocks for design dimensions

**Optional improvement only if time permits:** Update "Last updated: March 2026" text inside the panel header to "April 2026". Simple string replace.

```python
body = body.replace("Last updated: March 2026", "Last updated: April 2026")
```

---

## Task 4: Quick Facts — Add "Updated" field to Career Page sidebar

The career page's Quick Facts panel currently has this table:

| Field | Value |
|---|---|
| Company | King |
| Discipline | Level Design |
| Levels | L8–L13 |
| Paths | IC + Leadership |
| Owner | Victoria Serrano |
| Updated | April 2026 |
| Status | [Active badge] |

The "Updated" row is already in the stored XML. No change needed unless the date needs to be refreshed.

---

## Implementation Order

1. **Task 2** (header improvement) — do first, it's just a string insertion
2. **Task 1** (expand wrapping) — do second, more complex regex work
3. **Task 3** (FtB date update) — do last, trivially simple

Both tasks 1+2 can be done in a single PUT to version 18 of the career page.

---

## Page IDs and Current Versions

| Page | pageId | Version at time of writing | URL |
|---|---|---|---|
| Career guide | 961710850 | 17 | `https://kingfluence.com/display/~victoria.serrano/Level+design+career+-+the+final+guide+-+2026` |
| FtB level design | 990479168 | 70 | `https://kingfluence.com/pages/viewpage.action?pageId=990479168` |

**Always re-fetch the current version before PUTting** — don't hard-code version numbers.

---

## Validation After Each PUT

After publishing, verify with a GET:
```python
def verify_page(page_id, checks):
    """checks = dict of {description: lambda body: bool}"""
    page = get_page(page_id)
    body = page["body"]["storage"]["value"]
    ver = page["version"]["number"]
    print(f"Version: {ver}")
    for desc, check_fn in checks.items():
        result = check_fn(body)
        print(f"  {'✅' if result else '❌'} {desc}")

verify_page(961710850, {
    "Has expand macros": lambda b: b.count('ac:name="expand"') >= 6,
    "Has level badges in header": lambda b: "L8 Intern" in b,
    "Has layout": lambda b: "ac:layout" in b,
    "Has Quick Facts": lambda b: "Quick Facts" in b,
})
```

---

## Files to reference

- `docs/PROJECT_MASTER_HANDOFF.md` — full history, ROUTE-005/006/007
- `ftb_confluence_restructure_code.html` — original template visual reference
- `ftb_confluence_layout_guide.html` — before/after visual comparison
- `scripts/update_kingfluence_recon.py` — existing Python script with auth pattern to copy from

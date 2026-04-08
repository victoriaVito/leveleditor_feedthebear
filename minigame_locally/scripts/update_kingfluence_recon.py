#!/usr/bin/env python3
"""
ROUTE-005: Replace Level Reconstructions expand content on Kingfluence page 990479168.
Replaces the two localhost links with inline data tables (benchmark + reconstructions).
Run once. Idempotent: safe to re-run, it will overwrite only the target expand section.
"""

import os
import re
import sys
import json
import getpass
from pathlib import Path
import requests

# ── Config ───────────────────────────────────────────────────────────────────
BASE_URL = "https://kingfluence.com"
PAGE_ID = "990479168"
API_URL = f"{BASE_URL}/rest/api/content/{PAGE_ID}"
EXPAND_TITLE = "Level Reconstructions"  # exact title of the expand macro to target

# ── Auth ─────────────────────────────────────────────────────────────────────
TOKEN = os.environ.get("CONFLUENCE_TOKEN")
USER = os.environ.get("CONFLUENCE_USER")
PASS = os.environ.get("CONFLUENCE_PASS")

def read_dotenv_token():
    repo_root = Path(__file__).resolve().parents[1]
    env_path = repo_root / ".env"
    if not env_path.exists():
        return None
    try:
        content = env_path.read_text("utf-8")
    except Exception:
        return None
    for raw in content.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].strip()
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() != "CONFLUENCE_TOKEN":
            continue
        value = v.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        return value.strip() or None
    return None

if TOKEN:
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {TOKEN}"})
elif USER and PASS:
    session = requests.Session()
    session.auth = (USER, PASS)
else:
    TOKEN = read_dotenv_token() or ""
    if not TOKEN:
        TOKEN = getpass.getpass("CONFLUENCE_TOKEN (PAT): ").strip()
    if not TOKEN:
        print("ERROR: missing CONFLUENCE_TOKEN. Aborting.")
        sys.exit(1)
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {TOKEN}"})

session.headers.update({"Content-Type": "application/json", "X-Atlassian-Token": "no-check"})

# ── New inline content (Confluence storage format) ────────────────────────────
NEW_RECON_BODY = """
<h3>Reconstruction Summary (2026-03-26)</h3>
<p>29 levels reconstructed or mapped from images. All data extracted from canonical JSON files.</p>
<table>
  <tbody>
    <tr><th>Category</th><th>Count</th><th>Action</th><th>Location</th></tr>
    <tr><td>Editor images (image11&#8211;28)</td><td>7</td><td>Reconstructed from screenshots</td><td><code>levels/image*_level_editor.json</code></td></tr>
    <tr><td>Timestamped variants</td><td>6</td><td>Reconstructed from screenshots</td><td><code>levels/p_2_4_new_*.json</code> etc.</td></tr>
    <tr><td>After-feedback aliases</td><td>23</td><td>Mapped to existing canonical JSONs</td><td>No new files &#8212; alias naming only</td></tr>
    <tr><td>Flow Free benchmark</td><td>16</td><td>Reconstructed from mobile screenshots</td><td><code>levels/benchmark_flow_free/ff_nivel*.json</code></td></tr>
    <tr><td>Contact sheets / non-levels</td><td>3</td><td>Skipped</td><td>&#8212;</td></tr>
  </tbody>
</table>

<h3>Editor Image Reconstructions (7 levels)</h3>
<table>
  <tbody>
    <tr><th>File</th><th>Grid</th><th>Pairs</th><th>Blockers</th></tr>
    <tr><td>image11_level_editor</td><td>5&#215;5</td><td>3</td><td>3</td></tr>
    <tr><td>image19_level_editor</td><td>5&#215;5</td><td>3</td><td>1</td></tr>
    <tr><td>image20_level_editor</td><td>5&#215;5</td><td>3</td><td>1</td></tr>
    <tr><td>image21_level_editor</td><td>5&#215;5</td><td>3</td><td>2</td></tr>
    <tr><td>image24_level_editor</td><td>5&#215;5</td><td>3</td><td>2</td></tr>
    <tr><td>image25_level_editor</td><td>5&#215;5</td><td>3</td><td>0</td></tr>
    <tr><td>image28_level_editor</td><td>5&#215;5</td><td>2</td><td>1</td></tr>
  </tbody>
</table>

<h3>Timestamped Variant Reconstructions (6 levels)</h3>
<table>
  <tbody>
    <tr><th>File</th><th>Grid</th><th>Pairs</th><th>Blockers</th></tr>
    <tr><td>p_2_4_new_20260310165931</td><td>6&#215;6</td><td>4</td><td>3</td></tr>
    <tr><td>p_2_5_new_20260310170335</td><td>7&#215;7</td><td>4</td><td>8</td></tr>
    <tr><td>p_2_6_new_20260310170645</td><td>6&#215;6</td><td>3</td><td>3</td></tr>
    <tr><td>p_2_9_new_20260310195328</td><td>8&#215;8</td><td>4</td><td>3</td></tr>
    <tr><td>p_4_c_new_20260311075908</td><td>7&#215;7</td><td>4</td><td>9</td></tr>
    <tr><td>level_2</td><td>5&#215;5</td><td>3</td><td>1</td></tr>
  </tbody>
</table>

<h3>Flow Free Benchmark Levels (16 levels)</h3>
<p>These levels were reconstructed from Flow Free mobile screenshots to establish difficulty benchmarks for FtB board design. All are classified as HARD.</p>
<table>
  <tbody>
    <tr><th>Level</th><th>Grid</th><th>Pairs</th><th>Blockers</th><th>Patterns</th></tr>
    <tr><td>ff_nivel3_8x8</td><td>8&#215;8</td><td>6</td><td>6</td><td>blocker_cluster_chokepoint, high_coverage_difficulty</td></tr>
    <tr><td>ff_nivel4_8x8</td><td>8&#215;8</td><td>6</td><td>4</td><td>long_distance_endpoints, high_coverage_difficulty</td></tr>
    <tr><td>ff_nivel5_8x8</td><td>8&#215;8</td><td>6</td><td>8</td><td>blocker_cluster_chokepoint, high_coverage_difficulty</td></tr>
    <tr><td>ff_nivel5_9x9</td><td>8&#215;9</td><td>8</td><td>0</td><td>zero_blocker_pure_interference, pair_scaling_benchmark</td></tr>
    <tr><td>ff_nivel6_8x8</td><td>8&#215;8</td><td>7</td><td>3</td><td>pair_scaling_benchmark, nested_route_structure</td></tr>
    <tr><td>ff_nivel6v2_8x8</td><td>8&#215;8</td><td>7</td><td>0</td><td>zero_blocker_pure_interference, nested_route_structure</td></tr>
    <tr><td>ff_nivel7a_8x8</td><td>8&#215;8</td><td>8</td><td>4</td><td>pair_scaling_benchmark, nested_route_structure</td></tr>
    <tr><td>ff_nivel7b_8x8</td><td>8&#215;8</td><td>8</td><td>12</td><td>zero_blocker_pure_interference, long_distance_endpoints</td></tr>
    <tr><td>ff_nivel9a_8x8</td><td>8&#215;8</td><td>7</td><td>8</td><td>blocker_cluster_chokepoint, nested_route_structure</td></tr>
    <tr><td>ff_nivel9b_9x9</td><td>9&#215;9</td><td>10</td><td>0</td><td>zero_blocker_pure_interference, pair_scaling_benchmark</td></tr>
    <tr><td>ff_nivel11_9x9</td><td>9&#215;9</td><td>9</td><td>4</td><td>pair_scaling_benchmark, nested_route_structure</td></tr>
    <tr><td>ff_nivel13_8x8</td><td>8&#215;8</td><td>7</td><td>0</td><td>zero_blocker_pure_interference, pair_scaling_benchmark</td></tr>
    <tr><td>ff_nivel15_9x9</td><td>9&#215;9</td><td>8</td><td>5</td><td>blocker_cluster_chokepoint, long_distance_endpoints</td></tr>
    <tr><td>ff_nivel16_8x8</td><td>8&#215;8</td><td>6</td><td>6</td><td>blocker_cluster_chokepoint, perimeter_wrap_route</td></tr>
    <tr><td>ff_nivel32_8x8</td><td>8&#215;8</td><td>7</td><td>4</td><td>long_distance_endpoints, nested_route_structure</td></tr>
    <tr><td>ff_nivel34_8x8</td><td>8&#215;8</td><td>7</td><td>4</td><td>long_distance_endpoints, nested_route_structure</td></tr>
  </tbody>
</table>

<h3>Pattern Glossary</h3>
<table>
  <tbody>
    <tr><th>Pattern</th><th>Description</th></tr>
    <tr><td><strong>blocker_cluster_chokepoint</strong></td><td>Blockers form clusters that create narrow passages, forcing specific route choices</td></tr>
    <tr><td><strong>zero_blocker_pure_interference</strong></td><td>No blockers &#8212; all difficulty comes from path interference between pairs</td></tr>
    <tr><td><strong>pair_scaling_benchmark</strong></td><td>High pair count relative to board size tests scaling behavior</td></tr>
    <tr><td><strong>nested_route_structure</strong></td><td>Solutions require paths that wrap around each other in nested patterns</td></tr>
    <tr><td><strong>long_distance_endpoints</strong></td><td>Pair endpoints placed far apart, forcing long paths that consume board space</td></tr>
    <tr><td><strong>perimeter_wrap_route</strong></td><td>Optimal solutions use board edges, creating wrap-around paths</td></tr>
    <tr><td><strong>high_coverage_difficulty</strong></td><td>Most board cells must be used, leaving minimal free space</td></tr>
  </tbody>
</table>
"""

# ── Fetch current page ────────────────────────────────────────────────────────
print(f"Fetching page {PAGE_ID}...")
r = session.get(API_URL, params={"expand": "body.storage,version"})
r.raise_for_status()
data = r.json()

current_version = data["version"]["number"]
current_title = data["title"]
body = data["body"]["storage"]["value"]

print(f"  Title:   {current_title}")
print(f"  Version: {current_version}")
print(f"  Body length: {len(body)} chars")

# ── Find and replace the expand macro ────────────────────────────────────────
# Pattern: ac:structured-macro named "expand" with ac:parameter title="Level Reconstructions"
# We replace the inner ac:rich-text-body content.

MACRO_PATTERN = re.compile(
    r'(<ac:structured-macro[^>]*ac:name="expand"[^>]*>)'  # open tag
    r'(.*?<ac:parameter[^>]*ac:name="title"[^>]*>Level Reconstructions</ac:parameter>.*?)'  # title param
    r"(<ac:rich-text-body>)(.*?)(</ac:rich-text-body>)"  # rich text body
    r"(.*?</ac:structured-macro>)",  # close tag
    re.DOTALL,
)


def replace_body(m):
    return m.group(1) + m.group(2) + m.group(3) + NEW_RECON_BODY + m.group(5) + m.group(6)


new_body, n_replacements = MACRO_PATTERN.subn(replace_body, body)

if n_replacements == 0:
    # Fallback: look for the title text and replace the surrounding expand block
    print("WARNING: regex pattern did not match. Trying fallback search...")
    if EXPAND_TITLE not in body:
        print(f"ERROR: '{EXPAND_TITLE}' not found in page body. Aborting.")
        sys.exit(1)
    # Print context around match to help debug
    idx = body.index(EXPAND_TITLE)
    print("  Context around match:")
    print("  " + body[max(0, idx - 200) : idx + 200])
    sys.exit(1)

print(f"  Replaced {n_replacements} expand macro(s). New body length: {len(new_body)} chars")

# ── PUT updated page ──────────────────────────────────────────────────────────
payload = {
    "version": {"number": current_version + 1},
    "title": current_title,
    "type": "page",
    "body": {"storage": {"value": new_body, "representation": "storage"}},
}

print(f"Publishing version {current_version + 1}...")
r2 = session.put(API_URL, data=json.dumps(payload))

if r2.status_code in (200, 201):
    result = r2.json()
    print(f"SUCCESS. New version: {result['version']['number']}")
    print(f"  URL: {BASE_URL}/pages/viewpage.action?pageId={PAGE_ID}")
else:
    print(f"ERROR {r2.status_code}: {r2.text[:500]}")
    sys.exit(1)

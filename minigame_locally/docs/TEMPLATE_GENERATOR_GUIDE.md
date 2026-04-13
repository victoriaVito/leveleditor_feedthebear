# Template Generator Guide

**Purpose**: Generate Kingfluence markdown templates from a Google Sheets control panel, eliminating manual document structure work.

---

## Quick Start

### 1. Install Dependencies

```bash
pip install gspread google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### 2. Set Up Google Sheets Credentials

```bash
# Download service account JSON from Google Cloud Console
# Place it in one of these locations:
~/.config/gspread/credentials.json
~/.gspread/credentials.json
.credentials/google-sheets.json

# Or set environment variable:
export GOOGLE_SHEETS_CREDENTIALS=/path/to/credentials.json
```

### 3. Run the Generator

```bash
python3 scripts/generate_template_from_spreadsheet.py \
  --sheet-id <YOUR_GOOGLE_SHEETS_ID> \
  --output-file docs/my_template.md \
  --validate
```

---

## Spreadsheet Structure

Your Google Sheet must have **exactly 4 tabs**:

### Tab 1: **Metadata**
Controls document-level configuration.

| Field | Type | Required | Example |
|---|---|---|---|
| Document Title | Text | ✓ | "Feed the Bear v2.1 Release" |
| Document Type | Text | ✓ | "Release Notes" / "Design Decision" / "Announcement" |
| Owner | Text | ✓ | "Victoria" |
| Target Audience | Text | ✓ | "Internal Team, Stakeholders" |
| Kingfluence Space | Text | ✓ | "Game Design" |
| Parent Page | Text | - | "Releases" (for nesting in Kingfluence) |
| Tags | Text | - | "release, python-toolkit, cutover" (comma-separated) |
| Publishing Gate | Dropdown | ✓ | "Draft" / "Review" / "Published" |

**Single row only** (first row is read as metadata).

---

### Tab 2: **Design**
Typography and color tokens (optional; defaults apply if empty).

| Field | Type | Default | Example |
|---|---|---|---|
| H1 Size | Text | "24px" | "32px" |
| H1 Color | Text | "Primary" | "Accent" |
| H1 Weight | Text | "Bold" | "Bold" |
| H2 Size | Text | "18px" | "20px" |
| H2 Color | Text | "Primary" | "Text-Secondary" |
| H2 Weight | Text | "Bold" | "Semibold" |
| Body Size | Text | "14px" | "14px" |
| Body Color | Text | "Text-Default" | "Text-Default" |
| Body Weight | Text | "Regular" | "Regular" |
| Accent Color | Text | "Accent" | "Highlight" |
| Status Size | Text | "12px" | "12px" |
| Status Weight | Text | "Bold" | "Bold" |

**Single row only**.

---

### Tab 3: **Components**
Selector for which page elements to include.

| Field | Type | Required | Options |
|---|---|---|---|
| Component Type | Text | ✓ | `header`, `status`, `executive_summary`, `expandable_section`, `code_block`, `table`, `related_links`, `changelog`, `divider` |
| Include? | Checkbox/Text | ✓ | `TRUE` / `FALSE` / `✓` / `✗` |
| Variant | Text | - | Component-specific variant (e.g., "2-paragraph" for summary, "Green/Yellow/Red" for status) |
| Custom Notes | Text | - | Internal notes for generator (e.g., "Auto-pull from git log") |

**Multiple rows allowed** (one per component).

Example:
```
Component Type | Include? | Variant | Custom Notes
---|---|---|---
header | TRUE | - | -
status | TRUE | Green | In Progress
executive_summary | TRUE | 2-paragraph | Auto-generated
expandable_section | TRUE | 3 sections | See Content tab
code_block | FALSE | - | -
related_links | TRUE | - | From References tab
changelog | TRUE | Last 5 | Auto-pull from git
```

---

### Tab 4: **Content**
Actual content blocks that populate the template.

| Field | Type | Required | Notes |
|---|---|---|---|
| Section Title | Text | ✓ | "Improvements", "Known Issues", "API Changes" |
| Content | Text/Long Text | ✓ | Body text (supports markdown) |
| Type | Text | ✓ | `text`, `expandable`, `code`, `table` |
| Link/Reference | Text | - | Link to external doc (e.g., "docs/IMPROVEMENTS.md", "jira/KB-123") |

**Multiple rows allowed** (one per content block).

Example:
```
Section Title | Content | Type | Link/Reference
---|---|---|---
Executive Summary | "This release introduces..." | text | -
Improvements | "Performance gains in..." | expandable | docs/IMPROVEMENTS.md
Known Issues | "The following issues..." | expandable | jira/KB-123
API Changes | "def new_function():\n    pass" | code | -
Related Links | (see below) | - | (auto-generated if included)
```

---

## Component Details

### Header
- **What it generates**: H1 title from metadata
- **Variant**: N/A
- **Output**: `# {title}`

### Status
- **What it generates**: Kingfluence status macro
- **Variant**: Color (Green, Yellow, Red, Blue, Purple, Grey)
- **Output**: Kingfluence XML macro with color badge

### Executive Summary
- **What it generates**: Summary section
- **Variant**: "1-paragraph" / "2-paragraph" (informational)
- **Output**: `## Executive Summary\n\n{content}`

### Expandable Section
- **What it generates**: Kingfluence expand macro (collapsible)
- **Variant**: N/A
- **Output**: Kingfluence XML with collapsible content

### Code Block
- **What it generates**: Syntax-highlighted code
- **Variant**: Language (python, bash, javascript, etc.)
- **Output**: Markdown code fence with language

### Table
- **What it generates**: Markdown table
- **Variant**: Table dimensions (informational)
- **Output**: Markdown table

### Related Links
- **What it generates**: Link list section
- **Variant**: N/A
- **Output**: `## Related Links\n\n- [Title](url)`
- **Source**: Reads `Link/Reference` column from Content tab

### Changelog
- **What it generates**: Changelog section (auto-generated from git)
- **Variant**: "Last 5", "Last 10", "This Month"
- **Output**: Auto-pull from git log or manual entries

### Divider
- **What it generates**: Horizontal rule
- **Variant**: N/A
- **Output**: `---`

---

## Usage Examples

### Example 1: Release Notes

```bash
python3 scripts/generate_template_from_spreadsheet.py \
  --sheet-id 1A2B3C4D5E6F7G8H9I0J \
  --output-file docs/release_v2_1.md
```

**Spreadsheet setup:**
- Metadata: Title="Feed the Bear v2.1", Type="Release Notes", Owner="Victoria"
- Components: Header ✓, Status (Green) ✓, Executive Summary ✓, Expandable Sections ✓, Related Links ✓
- Content: Summary, Improvements, Known Issues, Breaking Changes
- Tags: release, python-toolkit, cutover

**Output:** `docs/release_v2_1.md` with Kingfluence-compatible markdown ready to publish.

---

### Example 2: Design Decision Record (ADR)

```bash
python3 scripts/generate_template_from_spreadsheet.py \
  --sheet-id 1A2B3C4D5E6F7G8H9I0J \
  --output-file docs/adr_progression_schema.md \
  --output-json docs/adr_progression_schema.json
```

**Spreadsheet setup:**
- Metadata: Type="Design Decision", Owner="Victoria"
- Components: Header ✓, Status (Yellow) ✓, Executive Summary ✓, Expandable Sections ✓, Code Block ✓, Related Links ✓
- Content: Decision, Rationale, Implications, Examples, Related Decisions
- Tags: design, schema, architecture

---

## Command-Line Options

```
--sheet-id REQUIRED
    Google Sheets ID (extract from share URL)

--output-file
    Output markdown file (default: output.md)

--output-json
    Optional: also export structured JSON

--validate
    Validate data and exit without generating markdown

--credentials
    Path to Google service account JSON
    (optional: auto-discovers if in standard locations)
```

---

## Validation

The script validates:

1. **Metadata**: Required fields (title, owner, doc type)
2. **Components**: At least one component included
3. **Content**: Non-empty section titles and content
4. **Publishing Gate**: Valid value (Draft, Review, Published)

Run validation:

```bash
python3 scripts/generate_template_from_spreadsheet.py \
  --sheet-id <ID> \
  --validate
```

---

## Output Formats

### Markdown (.md)
Kingfluence-compatible markdown with embedded XML macros for status, expandable sections, tables, etc.

```markdown
# Feed the Bear v2.1 Release

<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="title">Release Notes</ac:parameter>
  <ac:parameter ac:name="colour">Green</ac:parameter>
</ac:structured-macro>

## Executive Summary

This release introduces...

<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Improvements</ac:parameter>
  <ac:rich-text-body>
  - Performance gains in procedural generation
  - Schema normalization for levels A-I
  </ac:rich-text-body>
</ac:structured-macro>

...
```

Ready to paste directly into Kingfluence.

### JSON (.json)
Structured data for programmatic use (CI/CD pipelines, automation, etc.).

```json
{
  "metadata": {
    "title": "Feed the Bear v2.1 Release",
    "doc_type": "Release Notes",
    "owner": "Victoria",
    "tags": ["release", "python-toolkit", "cutover"],
    "publishing_gate": "Draft"
  },
  "components": [...],
  "content": [...]
}
```

---

## Workflow Integration

### Step 1: Edit Spreadsheet
Update cells in Google Sheets control panel.

### Step 2: Generate
```bash
python3 scripts/generate_template_from_spreadsheet.py --sheet-id <ID> --validate
```

### Step 3: Review
Open generated `.md` file, verify formatting.

### Step 4: Publish (Manual or Automated)
```bash
# Manual: Copy-paste markdown into Kingfluence UI
# Automated: Use Kingfluence API (future integration)
```

---

## Future Enhancements

- [ ] Direct Kingfluence API publish (auto-create/update pages)
- [ ] HTML preview generation (before publishing to Kingfluence)
- [ ] Template library (release notes, ADRs, announcements, postmortems)
- [ ] CI/CD integration (auto-generate on spreadsheet changes)
- [ ] Slack notification on publish
- [ ] Version history tracking (git + spreadsheet changelog)

---

## Troubleshooting

### "Google Sheets credentials not found"

```bash
# Option 1: Place credentials in standard location
cp ~/Downloads/credentials.json ~/.config/gspread/credentials.json

# Option 2: Specify path
python3 scripts/generate_template_from_spreadsheet.py \
  --sheet-id <ID> \
  --credentials /path/to/credentials.json
```

### "ValidationError: At least one component must be included"

Check the "Components" tab — ensure at least one component has `Include? = TRUE` or `✓`.

### Markdown looks wrong in Kingfluence

Kingfluence XML macros may not render correctly if:
- Indentation is off (check embedded YAML)
- Characters are escaped incorrectly
- Macro names are misspelled

Re-generate and verify output markdown before pasting.

---

## Related Documentation

- [DOCUMENTATION_PATTERNS.md](./DOCUMENTATION_PATTERNS.md)
- [KINGFLUENCE_OPERATIONS.md](./KINGFLUENCE_OPERATIONS.md)
- [DESIGN_DOCUMENTATION_FRAMEWORK.md](./DESIGN_DOCUMENTATION_FRAMEWORK.md)

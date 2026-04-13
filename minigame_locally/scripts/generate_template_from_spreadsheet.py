#!/usr/bin/env python3
"""
Generate Kingfluence markdown templates from Google Sheets control panel.

Usage:
    python3 scripts/generate_template_from_spreadsheet.py \
      --sheet-id <GOOGLE_SHEETS_ID> \
      --output-file docs/output.md \
      --validate \
      --publish (optional: auto-publish to Kingfluence)

Expected Spreadsheet Structure:
    - Tab 1: "Components" - Selector for page elements (Header, Summary, Status, etc.)
    - Tab 2: "Design" - Color, typography, styling system
    - Tab 3: "Content" - Actual content data (titles, descriptions, links)
    - Tab 4: "Metadata" - Document metadata (title, owner, space, tags)
"""

import json
import sys
import argparse
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum

try:
    from google.auth.transport.requests import Request
    from google.oauth2.service_account import Credentials
    import gspread
except ImportError:
    print("ERROR: Google Sheets libraries not installed.")
    print("Install with: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client gspread")
    sys.exit(1)


class ComponentType(Enum):
    """Supported page components."""
    HEADER = "header"
    STATUS = "status"
    EXECUTIVE_SUMMARY = "executive_summary"
    EXPANDABLE_SECTION = "expandable_section"
    CODE_BLOCK = "code_block"
    TABLE = "table"
    RELATED_LINKS = "related_links"
    CHANGELOG = "changelog"
    DIVIDER = "divider"


class KingfluenceColor(Enum):
    """Kingfluence status macro colors."""
    GREEN = "Green"
    YELLOW = "Yellow"
    RED = "Red"
    BLUE = "Blue"
    PURPLE = "Purple"
    GREY = "Grey"


@dataclass
class DesignSystem:
    """Typography and color design tokens."""
    h1_size: str = "24px"
    h1_color: str = "Primary"
    h1_weight: str = "Bold"

    h2_size: str = "18px"
    h2_color: str = "Primary"
    h2_weight: str = "Bold"

    body_size: str = "14px"
    body_color: str = "Text-Default"
    body_weight: str = "Regular"

    accent_color: str = "Accent"
    status_size: str = "12px"
    status_weight: str = "Bold"


@dataclass
class DocumentMetadata:
    """Document metadata and configuration."""
    title: str
    doc_type: str  # "Release Notes", "Design Decision", "Announcement", etc.
    owner: str
    target_audience: str
    kingfluence_space: str
    parent_page: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    publishing_gate: str = "Draft"  # Draft, Review, Published
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class Component:
    """A single page component."""
    component_type: ComponentType
    include: bool
    variant: Optional[str] = None
    custom_notes: Optional[str] = None


@dataclass
class ContentItem:
    """A content block."""
    section_title: str
    content: str
    content_type: str  # "text", "expandable", "table", "code"
    link_reference: Optional[str] = None


class TemplateValidator:
    """Validate spreadsheet data."""

    @staticmethod
    def validate_metadata(meta: DocumentMetadata) -> tuple[bool, List[str]]:
        """Check required metadata fields."""
        errors = []

        if not meta.title or meta.title.strip() == "":
            errors.append("Metadata: Title is required")

        if not meta.owner or meta.owner.strip() == "":
            errors.append("Metadata: Owner is required")

        if meta.publishing_gate not in ["Draft", "Review", "Published"]:
            errors.append(f"Metadata: Invalid publishing_gate '{meta.publishing_gate}'")

        return len(errors) == 0, errors

    @staticmethod
    def validate_components(components: List[Component]) -> tuple[bool, List[str]]:
        """Check that at least one component is included."""
        errors = []
        included = [c for c in components if c.include]

        if not included:
            errors.append("Components: At least one component must be included")

        return len(errors) == 0, errors

    @staticmethod
    def validate_content(content_items: List[ContentItem]) -> tuple[bool, List[str]]:
        """Check content validity."""
        errors = []

        for i, item in enumerate(content_items):
            if not item.section_title or item.section_title.strip() == "":
                errors.append(f"Content[{i}]: Section title is required")

            if not item.content or item.content.strip() == "":
                errors.append(f"Content[{i}]: Content text is required")

        return len(errors) == 0, errors


class KingfluenceMarkdownGenerator:
    """Generate Kingfluence-compatible markdown from structured data."""

    def __init__(self, metadata: DocumentMetadata, design: DesignSystem):
        self.metadata = metadata
        self.design = design

    def generate_title(self) -> str:
        """Generate H1 title."""
        return f"# {self.metadata.title}\n"

    def generate_status_macro(self, status_color: KingfluenceColor = KingfluenceColor.GREEN) -> str:
        """Generate Kingfluence status macro (XML)."""
        return f"""<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="title">{self.metadata.doc_type}</ac:parameter>
  <ac:parameter ac:name="colour">{status_color.value}</ac:parameter>
  <ac:parameter ac:name="subtle">false</ac:parameter>
</ac:structured-macro>

"""

    def generate_executive_summary(self, summary_text: str) -> str:
        """Generate executive summary section."""
        return f"""## Executive Summary

{summary_text}

"""

    def generate_expandable_section(self, title: str, content: str) -> str:
        """Generate Kingfluence expandable macro."""
        return f"""<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">{title}</ac:parameter>
  <ac:rich-text-body>
{self._indent_content(content, 4)}
  </ac:rich-text-body>
</ac:structured-macro>

"""

    def generate_code_block(self, code: str, language: str = "python") -> str:
        """Generate code block."""
        return f"""```{language}
{code}
```

"""

    def generate_table(self, headers: List[str], rows: List[List[str]]) -> str:
        """Generate markdown table."""
        table = "| " + " | ".join(headers) + " |\n"
        table += "| " + " | ".join(["---"] * len(headers)) + " |\n"

        for row in rows:
            table += "| " + " | ".join(row) + " |\n"

        return table + "\n"

    def generate_related_links(self, links: Dict[str, str]) -> str:
        """Generate related links section."""
        link_list = "\n".join([f"- [{title}]({url})" for title, url in links.items()])
        return f"""## Related Links

{link_list}

"""

    def generate_metadata_footer(self) -> str:
        """Generate metadata footer as info section."""
        tags_str = ", ".join(self.metadata.tags) if self.metadata.tags else "none"

        return f"""---

**Document Metadata**
- **Type**: {self.metadata.doc_type}
- **Owner**: {self.metadata.owner}
- **Target Audience**: {self.metadata.target_audience}
- **Space**: {self.metadata.kingfluence_space}
- **Tags**: {tags_str}
- **Status**: {self.metadata.publishing_gate}
- **Created**: {self.metadata.created_at}
"""

    @staticmethod
    def _indent_content(content: str, spaces: int = 4) -> str:
        """Indent content by N spaces (for XML macros)."""
        indent = " " * spaces
        return "\n".join([indent + line for line in content.split("\n")])


class TemplateGenerator:
    """Main orchestrator: read sheet → validate → generate markdown."""

    def __init__(self, sheet_id: str, credentials_file: Optional[str] = None):
        """
        Initialize with Google Sheet ID.

        Args:
            sheet_id: Google Sheets ID
            credentials_file: Path to service account JSON (optional, uses env var if not provided)
        """
        self.sheet_id = sheet_id
        self.credentials_file = credentials_file or self._get_credentials_path()
        self.sheet = None
        self.metadata: Optional[DocumentMetadata] = None
        self.design: Optional[DesignSystem] = None
        self.components: List[Component] = []
        self.content_items: List[ContentItem] = []
        self.validator = TemplateValidator()

    def _get_credentials_path(self) -> str:
        """Get Google Sheets credentials from environment or default location."""
        import os

        # Try common locations
        candidates = [
            os.path.expanduser("~/.config/gspread/credentials.json"),
            os.path.expanduser("~/.gspread/credentials.json"),
            ".credentials/google-sheets.json"
        ]

        for path in candidates:
            if os.path.exists(path):
                return path

        raise FileNotFoundError(
            "Google Sheets credentials not found. "
            "Set GOOGLE_SHEETS_CREDENTIALS env var or place in ~/.config/gspread/credentials.json"
        )

    def connect(self) -> bool:
        """Connect to Google Sheets."""
        try:
            gc = gspread.service_account(filename=self.credentials_file)
            self.sheet = gc.open_by_key(self.sheet_id)
            print(f"✓ Connected to sheet: {self.sheet.title}")
            return True
        except Exception as e:
            print(f"✗ Failed to connect to sheet: {e}")
            return False

    def load_metadata(self) -> bool:
        """Load metadata from 'Metadata' tab."""
        try:
            ws = self.sheet.worksheet("Metadata")
            data = ws.get_all_records()

            if not data:
                print("✗ Metadata tab is empty")
                return False

            meta_dict = data[0]  # First row

            self.metadata = DocumentMetadata(
                title=meta_dict.get("Document Title", ""),
                doc_type=meta_dict.get("Document Type", ""),
                owner=meta_dict.get("Owner", ""),
                target_audience=meta_dict.get("Target Audience", ""),
                kingfluence_space=meta_dict.get("Kingfluence Space", ""),
                parent_page=meta_dict.get("Parent Page"),
                tags=meta_dict.get("Tags", "").split(",") if meta_dict.get("Tags") else [],
                publishing_gate=meta_dict.get("Publishing Gate", "Draft")
            )

            print(f"✓ Loaded metadata: {self.metadata.title}")
            return True
        except Exception as e:
            print(f"✗ Failed to load metadata: {e}")
            return False

    def load_design_system(self) -> bool:
        """Load design system from 'Design' tab."""
        try:
            ws = self.sheet.worksheet("Design")
            data = ws.get_all_records()

            if not data:
                print("⚠ Design tab is empty, using defaults")
                self.design = DesignSystem()
                return True

            design_dict = data[0]

            self.design = DesignSystem(
                h1_size=design_dict.get("H1 Size", "24px"),
                h1_color=design_dict.get("H1 Color", "Primary"),
                h1_weight=design_dict.get("H1 Weight", "Bold"),
                h2_size=design_dict.get("H2 Size", "18px"),
                h2_color=design_dict.get("H2 Color", "Primary"),
                h2_weight=design_dict.get("H2 Weight", "Bold"),
                body_size=design_dict.get("Body Size", "14px"),
                body_color=design_dict.get("Body Color", "Text-Default"),
                body_weight=design_dict.get("Body Weight", "Regular"),
                accent_color=design_dict.get("Accent Color", "Accent"),
                status_size=design_dict.get("Status Size", "12px"),
                status_weight=design_dict.get("Status Weight", "Bold")
            )

            print(f"✓ Loaded design system")
            return True
        except Exception as e:
            print(f"✗ Failed to load design system: {e}")
            self.design = DesignSystem()  # Use defaults
            return True

    def load_components(self) -> bool:
        """Load component selector from 'Components' tab."""
        try:
            ws = self.sheet.worksheet("Components")
            data = ws.get_all_records()

            if not data:
                print("✗ Components tab is empty")
                return False

            for row in data:
                component_name = row.get("Component Type", "").strip()
                if not component_name:
                    continue

                try:
                    comp_type = ComponentType(component_name.lower().replace(" ", "_"))
                    include = row.get("Include?", "").lower() in ["true", "✓", "yes", "1"]

                    self.components.append(Component(
                        component_type=comp_type,
                        include=include,
                        variant=row.get("Variant"),
                        custom_notes=row.get("Custom Notes")
                    ))
                except ValueError:
                    print(f"⚠ Unknown component type: {component_name}")

            print(f"✓ Loaded {len(self.components)} components")
            return True
        except Exception as e:
            print(f"✗ Failed to load components: {e}")
            return False

    def load_content(self) -> bool:
        """Load content from 'Content' tab."""
        try:
            ws = self.sheet.worksheet("Content")
            data = ws.get_all_records()

            if not data:
                print("✗ Content tab is empty")
                return False

            for row in data:
                section_title = row.get("Section Title", "").strip()
                if not section_title:
                    continue

                self.content_items.append(ContentItem(
                    section_title=section_title,
                    content=row.get("Content", ""),
                    content_type=row.get("Type", "text"),
                    link_reference=row.get("Link/Reference")
                ))

            print(f"✓ Loaded {len(self.content_items)} content items")
            return True
        except Exception as e:
            print(f"✗ Failed to load content: {e}")
            return False

    def load_all(self) -> bool:
        """Load all data from sheet."""
        print("\n📋 Loading spreadsheet data...\n")

        success = all([
            self.load_metadata(),
            self.load_design_system(),
            self.load_components(),
            self.load_content()
        ])

        return success

    def validate(self) -> tuple[bool, List[str]]:
        """Validate all loaded data."""
        print("\n✓ Validating...\n")

        all_errors = []

        if self.metadata:
            valid, errors = self.validator.validate_metadata(self.metadata)
            all_errors.extend(errors)

        if self.components:
            valid, errors = self.validator.validate_components(self.components)
            all_errors.extend(errors)

        if self.content_items:
            valid, errors = self.validator.validate_content(self.content_items)
            all_errors.extend(errors)

        if all_errors:
            for error in all_errors:
                print(f"✗ {error}")
            return False, all_errors

        print("✓ All validation checks passed\n")
        return True, []

    def generate_markdown(self) -> str:
        """Generate complete Kingfluence markdown."""
        markdown = ""

        # Title + Status
        markdown += self.metadata.title + "\n\n" if self.metadata else ""

        if self.metadata:
            gen = KingfluenceMarkdownGenerator(self.metadata, self.design)
            markdown += gen.generate_status_macro(KingfluenceColor.GREEN)

        # Content items (in order)
        for item in self.content_items:
            if item.content_type == "expandable":
                markdown += gen.generate_expandable_section(item.section_title, item.content)
            elif item.content_type == "code":
                markdown += gen.generate_code_block(item.content, "python")
            else:
                markdown += f"## {item.section_title}\n\n{item.content}\n\n"

        # Metadata footer
        if self.metadata:
            markdown += gen.generate_metadata_footer()

        return markdown

    def export_markdown(self, output_file: str) -> bool:
        """Write markdown to file."""
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(self.generate_markdown())

            print(f"✓ Exported markdown to {output_file}\n")
            return True
        except Exception as e:
            print(f"✗ Failed to export markdown: {e}")
            return False

    def export_json(self, output_file: str) -> bool:
        """Export data as JSON for programmatic use."""
        try:
            data = {
                "metadata": {
                    "title": self.metadata.title,
                    "doc_type": self.metadata.doc_type,
                    "owner": self.metadata.owner,
                    "tags": self.metadata.tags,
                    "publishing_gate": self.metadata.publishing_gate
                },
                "components": [
                    {
                        "type": c.component_type.value,
                        "include": c.include,
                        "variant": c.variant
                    } for c in self.components
                ],
                "content": [
                    {
                        "section_title": c.section_title,
                        "content_type": c.content_type,
                        "has_content": len(c.content) > 0
                    } for c in self.content_items
                ]
            }

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)

            print(f"✓ Exported JSON to {output_file}\n")
            return True
        except Exception as e:
            print(f"✗ Failed to export JSON: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Generate Kingfluence markdown templates from Google Sheets control panel"
    )
    parser.add_argument("--sheet-id", required=True, help="Google Sheets ID")
    parser.add_argument("--output-file", default="output.md", help="Output markdown file")
    parser.add_argument("--output-json", help="Optional JSON export file")
    parser.add_argument("--validate", action="store_true", help="Validate and exit")
    parser.add_argument("--credentials", help="Path to Google service account JSON")

    args = parser.parse_args()

    # Initialize generator
    gen = TemplateGenerator(args.sheet_id, args.credentials)

    # Connect and load
    if not gen.connect():
        sys.exit(1)

    if not gen.load_all():
        sys.exit(1)

    # Validate
    valid, errors = gen.validate()
    if not valid:
        sys.exit(1)

    if args.validate:
        print("✓ Validation passed, exiting (--validate flag set)")
        sys.exit(0)

    # Generate and export
    if not gen.export_markdown(args.output_file):
        sys.exit(1)

    if args.output_json:
        gen.export_json(args.output_json)

    print(f"✓ Template generation complete!")
    print(f"  Markdown: {args.output_file}")
    if args.output_json:
        print(f"  JSON: {args.output_json}")


if __name__ == "__main__":
    main()

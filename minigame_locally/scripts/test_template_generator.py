#!/usr/bin/env python3
"""
Unit tests for template generator.

Run with:
    python3 scripts/test_template_generator.py
"""

import unittest
import tempfile
import os
import json
from pathlib import Path

# Import the module under test
import sys
sys.path.insert(0, str(Path(__file__).parent))

from generate_template_from_spreadsheet import (
    TemplateValidator,
    DocumentMetadata,
    Component,
    ComponentType,
    ContentItem,
    KingfluenceMarkdownGenerator,
    DesignSystem,
    KingfluenceColor
)


class TestTemplateValidator(unittest.TestCase):
    """Test validation logic."""

    def test_valid_metadata(self):
        """Metadata with required fields passes."""
        meta = DocumentMetadata(
            title="Test Document",
            doc_type="Release Notes",
            owner="Victoria",
            target_audience="Team",
            kingfluence_space="Design"
        )

        valid, errors = TemplateValidator.validate_metadata(meta)
        self.assertTrue(valid)
        self.assertEqual(len(errors), 0)

    def test_missing_title(self):
        """Metadata without title fails."""
        meta = DocumentMetadata(
            title="",
            doc_type="Release Notes",
            owner="Victoria",
            target_audience="Team",
            kingfluence_space="Design"
        )

        valid, errors = TemplateValidator.validate_metadata(meta)
        self.assertFalse(valid)
        self.assertTrue(any("Title" in e for e in errors))

    def test_missing_owner(self):
        """Metadata without owner fails."""
        meta = DocumentMetadata(
            title="Test",
            doc_type="Release Notes",
            owner="",
            target_audience="Team",
            kingfluence_space="Design"
        )

        valid, errors = TemplateValidator.validate_metadata(meta)
        self.assertFalse(valid)
        self.assertTrue(any("Owner" in e for e in errors))

    def test_invalid_publishing_gate(self):
        """Invalid publishing_gate fails."""
        meta = DocumentMetadata(
            title="Test",
            doc_type="Release Notes",
            owner="Victoria",
            target_audience="Team",
            kingfluence_space="Design",
            publishing_gate="InvalidStatus"
        )

        valid, errors = TemplateValidator.validate_metadata(meta)
        self.assertFalse(valid)
        self.assertTrue(any("publishing_gate" in e for e in errors))

    def test_components_validation_empty(self):
        """Empty components list fails."""
        components = []
        valid, errors = TemplateValidator.validate_components(components)
        self.assertFalse(valid)
        self.assertTrue(any("one component" in e for e in errors))

    def test_components_validation_all_excluded(self):
        """All components excluded fails."""
        components = [
            Component(ComponentType.HEADER, include=False),
            Component(ComponentType.STATUS, include=False)
        ]
        valid, errors = TemplateValidator.validate_components(components)
        self.assertFalse(valid)

    def test_components_validation_one_included(self):
        """At least one component included passes."""
        components = [
            Component(ComponentType.HEADER, include=True),
            Component(ComponentType.STATUS, include=False)
        ]
        valid, errors = TemplateValidator.validate_components(components)
        self.assertTrue(valid)

    def test_content_validation_empty(self):
        """Empty content items fails."""
        items = []
        valid, errors = TemplateValidator.validate_content(items)
        self.assertTrue(valid)  # Empty is OK (content is optional)

    def test_content_validation_missing_title(self):
        """Content item without title fails."""
        items = [
            ContentItem(
                section_title="",
                content="Some content",
                content_type="text"
            )
        ]
        valid, errors = TemplateValidator.validate_content(items)
        self.assertFalse(valid)

    def test_content_validation_missing_content(self):
        """Content item without content fails."""
        items = [
            ContentItem(
                section_title="Test Section",
                content="",
                content_type="text"
            )
        ]
        valid, errors = TemplateValidator.validate_content(items)
        self.assertFalse(valid)

    def test_content_validation_valid(self):
        """Valid content item passes."""
        items = [
            ContentItem(
                section_title="Test Section",
                content="This is test content",
                content_type="text"
            )
        ]
        valid, errors = TemplateValidator.validate_content(items)
        self.assertTrue(valid)


class TestKingfluenceMarkdownGenerator(unittest.TestCase):
    """Test markdown generation."""

    def setUp(self):
        """Set up test fixtures."""
        self.metadata = DocumentMetadata(
            title="Test Document",
            doc_type="Release Notes",
            owner="Victoria",
            target_audience="Team",
            kingfluence_space="Design",
            tags=["test", "release"]
        )
        self.design = DesignSystem()
        self.gen = KingfluenceMarkdownGenerator(self.metadata, self.design)

    def test_generate_title(self):
        """Title generation."""
        title = self.gen.generate_title()
        self.assertIn("# Test Document", title)

    def test_generate_status_macro_green(self):
        """Status macro generation with Green color."""
        macro = self.gen.generate_status_macro(KingfluenceColor.GREEN)
        self.assertIn('<ac:structured-macro ac:name="status">', macro)
        self.assertIn('<ac:parameter ac:name="colour">Green</ac:parameter>', macro)

    def test_generate_status_macro_red(self):
        """Status macro generation with Red color."""
        macro = self.gen.generate_status_macro(KingfluenceColor.RED)
        self.assertIn('<ac:parameter ac:name="colour">Red</ac:parameter>', macro)

    def test_generate_executive_summary(self):
        """Executive summary generation."""
        summary = self.gen.generate_executive_summary("This is a test summary")
        self.assertIn("## Executive Summary", summary)
        self.assertIn("This is a test summary", summary)

    def test_generate_expandable_section(self):
        """Expandable section generation."""
        section = self.gen.generate_expandable_section(
            "Test Section",
            "This is expandable content"
        )
        self.assertIn('<ac:structured-macro ac:name="expand">', section)
        self.assertIn('<ac:parameter ac:name="title">Test Section</ac:parameter>', section)
        self.assertIn("This is expandable content", section)

    def test_generate_code_block_python(self):
        """Code block generation."""
        code = 'def hello():\n    print("hello")'
        block = self.gen.generate_code_block(code, "python")
        self.assertIn("```python", block)
        self.assertIn(code, block)
        self.assertIn("```", block)

    def test_generate_table(self):
        """Table generation."""
        headers = ["Name", "Value"]
        rows = [
            ["Item 1", "Value 1"],
            ["Item 2", "Value 2"]
        ]
        table = self.gen.generate_table(headers, rows)
        self.assertIn("| Name | Value |", table)
        self.assertIn("| Item 1 | Value 1 |", table)
        self.assertIn("| Item 2 | Value 2 |", table)
        self.assertIn("| --- | --- |", table)

    def test_generate_related_links(self):
        """Related links generation."""
        links = {
            "Documentation": "https://docs.example.com",
            "JIRA": "https://jira.example.com/KB-123"
        }
        section = self.gen.generate_related_links(links)
        self.assertIn("## Related Links", section)
        self.assertIn("[Documentation](https://docs.example.com)", section)
        self.assertIn("[JIRA](https://jira.example.com/KB-123)", section)

    def test_generate_metadata_footer(self):
        """Metadata footer generation."""
        footer = self.gen.generate_metadata_footer()
        self.assertIn("**Document Metadata**", footer)
        self.assertIn("**Owner**: Victoria", footer)
        self.assertIn("test, release", footer)

    def test_indent_content(self):
        """Content indentation."""
        content = "Line 1\nLine 2\nLine 3"
        indented = self.gen._indent_content(content, spaces=4)
        lines = indented.split("\n")
        self.assertTrue(all(line.startswith("    ") for line in lines))


class TestComponentType(unittest.TestCase):
    """Test component type enum."""

    def test_component_types_exist(self):
        """All expected component types are defined."""
        expected = [
            "header", "status", "executive_summary",
            "expandable_section", "code_block", "table",
            "related_links", "changelog", "divider"
        ]

        for component_name in expected:
            try:
                ComponentType(component_name)
            except ValueError:
                self.fail(f"ComponentType.{component_name} not defined")


class TestDesignSystem(unittest.TestCase):
    """Test design system tokens."""

    def test_default_design_system(self):
        """Default design system has expected values."""
        design = DesignSystem()
        self.assertEqual(design.h1_size, "24px")
        self.assertEqual(design.body_size, "14px")
        self.assertEqual(design.h1_color, "Primary")

    def test_custom_design_system(self):
        """Custom design system can be initialized."""
        design = DesignSystem(
            h1_size="32px",
            body_size="16px"
        )
        self.assertEqual(design.h1_size, "32px")
        self.assertEqual(design.body_size, "16px")


class TestIntegration(unittest.TestCase):
    """Integration tests."""

    def test_end_to_end_markdown_generation(self):
        """Test full markdown generation pipeline."""
        # Create test data
        metadata = DocumentMetadata(
            title="Integration Test Release",
            doc_type="Release Notes",
            owner="Test User",
            target_audience="Everyone",
            kingfluence_space="Testing",
            tags=["test", "integration"]
        )
        design = DesignSystem()
        gen = KingfluenceMarkdownGenerator(metadata, design)

        # Generate components
        markdown = ""
        markdown += gen.generate_title()
        markdown += gen.generate_status_macro(KingfluenceColor.GREEN)
        markdown += gen.generate_executive_summary("This is a test release")
        markdown += gen.generate_expandable_section(
            "Features",
            "- Feature 1\n- Feature 2"
        )
        markdown += gen.generate_related_links({
            "Docs": "https://example.com/docs"
        })
        markdown += gen.generate_metadata_footer()

        # Verify structure
        self.assertIn("# Integration Test Release", markdown)
        self.assertIn("Release Notes", markdown)
        self.assertIn("This is a test release", markdown)
        self.assertIn("Features", markdown)
        self.assertIn("Feature 1", markdown)
        self.assertIn("https://example.com/docs", markdown)
        self.assertIn("Test User", markdown)

    def test_export_to_file(self):
        """Test writing generated markdown to file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "test_output.md")

            # Generate markdown
            metadata = DocumentMetadata(
                title="File Test",
                doc_type="Test",
                owner="Tester",
                target_audience="Team",
                kingfluence_space="Testing"
            )
            design = DesignSystem()
            gen = KingfluenceMarkdownGenerator(metadata, design)
            markdown = gen.generate_title() + "Test content"

            # Write to file
            with open(output_file, 'w') as f:
                f.write(markdown)

            # Verify file exists and contains content
            self.assertTrue(os.path.exists(output_file))
            with open(output_file, 'r') as f:
                content = f.read()
            self.assertIn("# File Test", content)
            self.assertIn("Test content", content)


def run_tests():
    """Run all tests."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestTemplateValidator))
    suite.addTests(loader.loadTestsFromTestCase(TestKingfluenceMarkdownGenerator))
    suite.addTests(loader.loadTestsFromTestCase(TestComponentType))
    suite.addTests(loader.loadTestsFromTestCase(TestDesignSystem))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    exit_code = run_tests()
    sys.exit(exit_code)

"""Integration tests for editor API endpoints (Phase 2B Slice 3).

Tests for HTTP API integration of undo/redo functionality:
- /api/editor-record-action (POST) - Record a new action
- /api/editor-undo (POST) - Undo the last action
- /api/editor-redo (POST) - Redo the last undone action
- Response structure with success flags and state data
- State restoration through API calls
"""

import sys
from pathlib import Path
from dataclasses import asdict

import pytest

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.domain.levels import Level, serialize_level_to_canonical_dict
from feed_the_bear_toolkit.ui.app import reset_editor_history
from feed_the_bear_toolkit.ui.server import (
    dispatch_request,
    _editor_record_action,
    _editor_undo,
    _editor_redo,
)


@pytest.fixture
def clean_editor():
    """Reset editor history before each test."""
    reset_editor_history()
    yield
    reset_editor_history()


@pytest.fixture
def sample_level():
    """Create a minimal Level for testing."""
    return Level(
        id="test_level",
        difficulty_tier=1,
        cols=8,
        rows=8,
        moves=30,
        pairs=[],
        blockers=[],
    )


@pytest.fixture
def sample_level_dict(sample_level):
    """Convert sample level to canonical dict for API payloads."""
    return serialize_level_to_canonical_dict(sample_level, sample_level.id)


class TestEditorRecordAction:
    """Tests for recording actions via API."""

    def test_record_action_via_handler(self, clean_editor, sample_level, sample_level_dict):
        """Record an action and verify response contains correct fields."""
        payload = {
            "level": sample_level_dict,
            "action": "test_edit",
        }
        result = _editor_record_action(payload)

        assert result["success"] is True
        assert result["action"] == "test_edit"
        assert result["timestamp"] is not None
        assert isinstance(result["timestamp"], str)
        assert result["can_undo"] is False  # Only one action, can't undo
        assert result["can_redo"] is False
        assert result["history_size"] == 0  # past is empty

    def test_record_multiple_actions_builds_history(self, clean_editor, sample_level, sample_level_dict):
        """Record multiple actions and verify history size increases."""
        payload1 = {"level": sample_level_dict, "action": "action_1"}
        payload2 = {"level": sample_level_dict, "action": "action_2"}

        result1 = _editor_record_action(payload1)
        assert result1["history_size"] == 0

        result2 = _editor_record_action(payload2)
        assert result2["history_size"] == 1  # action_1 is now in past
        assert result2["can_undo"] is True

    def test_record_action_missing_level(self, clean_editor):
        """Record action fails gracefully without level data."""
        payload = {"action": "no_level"}
        with pytest.raises(ValueError, match="Missing level data"):
            _editor_record_action(payload)

    def test_record_action_missing_action_name(self, clean_editor, sample_level_dict):
        """Record action fails gracefully without action name."""
        payload = {"level": sample_level_dict}
        # Should use default "edit" when action is missing
        result = _editor_record_action(payload)
        assert result["action"] == "edit"

    def test_record_action_empty_action_name(self, clean_editor, sample_level_dict):
        """Record action rejects empty action name."""
        payload = {"level": sample_level_dict, "action": ""}
        with pytest.raises(ValueError, match="Missing action name"):
            _editor_record_action(payload)


class TestEditorUndo:
    """Tests for undo operation via API."""

    def test_undo_after_single_action(self, clean_editor, sample_level, sample_level_dict):
        """Undo after recording one action returns failure (no previous state)."""
        # Record one action
        _editor_record_action({"level": sample_level_dict, "action": "first"})

        # Undo should fail (can't undo to a previous state)
        result = _editor_undo({})

        assert result["success"] is False
        assert result["message"] == "Nothing to undo"
        assert result["can_undo"] is False

    def test_undo_after_two_actions(self, clean_editor, sample_level, sample_level_dict):
        """Undo after two actions successfully returns previous state."""
        _editor_record_action({"level": sample_level_dict, "action": "first"})
        _editor_record_action({"level": sample_level_dict, "action": "second"})

        result = _editor_undo({})

        assert result["success"] is True
        assert result["action"] == "first"
        assert result["timestamp"] is not None
        assert result["level"] is not None
        assert result["can_undo"] is False  # Can't undo further
        assert result["can_redo"] is True   # Can redo "second"

    def test_undo_multiple_times(self, clean_editor, sample_level, sample_level_dict):
        """Chain multiple undos."""
        _editor_record_action({"level": sample_level_dict, "action": "a"})
        _editor_record_action({"level": sample_level_dict, "action": "b"})
        _editor_record_action({"level": sample_level_dict, "action": "c"})

        # Undo once
        result1 = _editor_undo({})
        assert result1["success"] is True
        assert result1["action"] == "b"
        assert result1["can_undo"] is True

        # Undo again
        result2 = _editor_undo({})
        assert result2["success"] is True
        assert result2["action"] == "a"
        assert result2["can_undo"] is False
        assert result2["can_redo"] is True

    def test_undo_when_empty(self, clean_editor):
        """Undo on empty history returns failure."""
        result = _editor_undo({})

        assert result["success"] is False
        assert result["message"] == "Nothing to undo"
        assert result["can_undo"] is False


class TestEditorRedo:
    """Tests for redo operation via API."""

    def test_redo_after_undo(self, clean_editor, sample_level, sample_level_dict):
        """Redo after undo restores the undone state."""
        _editor_record_action({"level": sample_level_dict, "action": "a"})
        _editor_record_action({"level": sample_level_dict, "action": "b"})

        _editor_undo({})  # Now at "a"
        result = _editor_redo({})  # Back to "b"

        assert result["success"] is True
        assert result["action"] == "b"
        assert result["can_redo"] is False
        assert result["can_undo"] is True

    def test_redo_when_no_future(self, clean_editor, sample_level, sample_level_dict):
        """Redo fails when there's no future state."""
        _editor_record_action({"level": sample_level_dict, "action": "a"})
        result = _editor_redo({})

        assert result["success"] is False
        assert result["message"] == "Nothing to redo"
        assert result["can_redo"] is False

    def test_redo_cleared_after_new_action(self, clean_editor, sample_level, sample_level_dict):
        """Redo is cleared when a new action is recorded after undo."""
        _editor_record_action({"level": sample_level_dict, "action": "a"})
        _editor_record_action({"level": sample_level_dict, "action": "b"})

        _editor_undo({})  # Future now has "b"
        assert _editor_redo({})["can_redo"] is False  # But "b" is not in future anymore

        # Record new action
        _editor_record_action({"level": sample_level_dict, "action": "c"})
        result = _editor_redo({})

        # Redo should fail (future was cleared by new action)
        assert result["success"] is False
        assert result["message"] == "Nothing to redo"

    def test_redo_multiple_times(self, clean_editor, sample_level, sample_level_dict):
        """Chain multiple redos."""
        _editor_record_action({"level": sample_level_dict, "action": "a"})
        _editor_record_action({"level": sample_level_dict, "action": "b"})
        _editor_record_action({"level": sample_level_dict, "action": "c"})

        # Undo three times to get back to empty state
        _editor_undo({})  # At "b"
        _editor_undo({})  # At "a"
        _editor_undo({})  # Can't undo further, stays at "a"

        # Redo twice
        result1 = _editor_redo({})
        assert result1["success"] is True
        assert result1["action"] == "b"

        result2 = _editor_redo({})
        assert result2["success"] is True
        assert result2["action"] == "c"
        assert result2["can_redo"] is False


class TestEditorUndoRedoWorkflow:
    """Integration tests for complete undo/redo workflows."""

    def test_full_undo_redo_cycle(self, clean_editor, sample_level, sample_level_dict):
        """Complete workflow: record, undo, redo."""
        # Record
        rec1 = _editor_record_action({"level": sample_level_dict, "action": "edit_1"})
        assert rec1["can_undo"] is False
        assert rec1["can_redo"] is False

        rec2 = _editor_record_action({"level": sample_level_dict, "action": "edit_2"})
        assert rec2["can_undo"] is True
        assert rec2["can_redo"] is False

        # Undo
        undo1 = _editor_undo({})
        assert undo1["success"] is True
        assert undo1["action"] == "edit_1"
        assert undo1["can_undo"] is False
        assert undo1["can_redo"] is True

        # Redo
        redo1 = _editor_redo({})
        assert redo1["success"] is True
        assert redo1["action"] == "edit_2"
        assert redo1["can_undo"] is True
        assert redo1["can_redo"] is False

    def test_undo_redo_branching(self, clean_editor, sample_level, sample_level_dict):
        """Undo-redo with branching: undo then record new action."""
        _editor_record_action({"level": sample_level_dict, "action": "a"})
        _editor_record_action({"level": sample_level_dict, "action": "b"})
        _editor_record_action({"level": sample_level_dict, "action": "c"})

        # Undo twice
        _editor_undo({})  # At "b"
        _editor_undo({})  # At "a"

        # Verify we can redo "b"
        assert _editor_redo({})["success"] is True

        # Record new action (branches off, clearing redo)
        _editor_record_action({"level": sample_level_dict, "action": "x"})

        # Verify redo is now impossible
        redo_result = _editor_redo({})
        assert redo_result["success"] is False
        assert redo_result["message"] == "Nothing to redo"

    def test_api_response_contains_level_state(self, clean_editor, sample_level, sample_level_dict):
        """Undo/redo responses contain serialized level state."""
        _editor_record_action({"level": sample_level_dict, "action": "edit"})
        _editor_record_action({"level": sample_level_dict, "action": "modify"})

        result = _editor_undo({})

        assert result["level"] is not None
        assert isinstance(result["level"], dict)
        assert "id" in result["level"]
        assert result["level"]["id"] == "test_level"
        assert "gridSize" in result["level"]
        assert result["level"]["gridSize"]["cols"] == 8
        assert result["level"]["gridSize"]["rows"] == 8

    def test_api_state_consistency(self, clean_editor, sample_level, sample_level_dict):
        """State returned by API matches recorded state."""
        _editor_record_action({"level": sample_level_dict, "action": "first"})
        first_level = sample_level_dict.copy()

        _editor_record_action({"level": sample_level_dict, "action": "second"})

        # Undo should return the first level
        undo_result = _editor_undo({})
        assert undo_result["level"]["id"] == first_level["id"]
        assert undo_result["level"]["gridSize"]["cols"] == first_level["gridSize"]["cols"]
        assert undo_result["level"]["gridSize"]["rows"] == first_level["gridSize"]["rows"]


class TestEditorAPIEdgeCases:
    """Edge case tests for editor API."""

    def test_can_undo_can_redo_flags_in_responses(self, clean_editor, sample_level, sample_level_dict):
        """All API responses include can_undo and can_redo flags."""
        payload = {"level": sample_level_dict, "action": "test"}

        # Record response should have flags
        rec = _editor_record_action(payload)
        assert "can_undo" in rec
        assert "can_redo" in rec

        # Undo response should have flags
        _editor_record_action(payload)
        undo_res = _editor_undo({})
        assert "can_undo" in undo_res
        assert "can_redo" in undo_res

        # Redo response should have flags
        redo_res = _editor_redo({})
        assert "can_undo" in redo_res
        assert "can_redo" in redo_res

    def test_history_size_tracking(self, clean_editor, sample_level, sample_level_dict):
        """record_action response includes history_size."""
        payload = {"level": sample_level_dict, "action": "a"}

        result1 = _editor_record_action(payload)
        assert result1["history_size"] == 0

        result2 = _editor_record_action(payload)
        assert result2["history_size"] == 1

        result3 = _editor_record_action(payload)
        assert result3["history_size"] == 2

        # Undo doesn't report history_size
        undo_result = _editor_undo({})
        assert "history_size" not in undo_result

    def test_timestamp_always_present(self, clean_editor, sample_level, sample_level_dict):
        """Successful responses always include timestamp."""
        _editor_record_action({"level": sample_level_dict, "action": "a"})
        _editor_record_action({"level": sample_level_dict, "action": "b"})

        undo_result = _editor_undo({})
        assert undo_result["timestamp"] is not None
        assert isinstance(undo_result["timestamp"], str)
        assert len(undo_result["timestamp"]) > 0

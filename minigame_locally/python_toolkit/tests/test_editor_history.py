"""Tests for EditorHistory undo/redo system (Phase 2B Slice 3).

Unit tests for EditorHistory class covering:
- State recording and snapshots
- Undo/redo stack management (past/present/future)
- History size limit enforcement (max 50 actions)
- Edge cases (empty history, future clearing)
- State availability checks (can_undo, can_redo)
"""

import sys
from pathlib import Path

import pytest

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.domain.levels import Level
from feed_the_bear_toolkit.ui.app import EditorHistory, EditorState, get_editor_history, reset_editor_history


@pytest.fixture
def clean_history():
    """Reset editor history before each test."""
    reset_editor_history()
    yield get_editor_history()
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


class TestEditorStateSnapshot:
    """Tests for EditorState dataclass."""

    def test_editor_state_creation(self, sample_level):
        """Create an EditorState snapshot."""
        state = EditorState(
            board=sample_level,
            timestamp="2026-04-13T12:00:00Z",
            action="test_action"
        )
        assert state.board == sample_level
        assert state.timestamp == "2026-04-13T12:00:00Z"
        assert state.action == "test_action"

    def test_editor_state_is_frozen(self, sample_level):
        """EditorState is immutable (frozen)."""
        state = EditorState(
            board=sample_level,
            timestamp="2026-04-13T12:00:00Z",
            action="test"
        )
        with pytest.raises(AttributeError):
            state.action = "modified"


class TestEditorHistoryInitialization:
    """Tests for EditorHistory initialization."""

    def test_history_initializes_empty(self):
        """EditorHistory starts with empty past/future and None present."""
        history = EditorHistory()
        assert history.past == []
        assert history.present is None
        assert history.future == []
        assert history.max_history == 50

    def test_history_custom_max_size(self):
        """EditorHistory respects custom max_history parameter."""
        history = EditorHistory(max_history=100)
        assert history.max_history == 100

    def test_history_zero_max_size(self):
        """EditorHistory allows edge case of max_history=0."""
        history = EditorHistory(max_history=0)
        assert history.max_history == 0


class TestRecordAction:
    """Tests for recording actions in history."""

    def test_record_single_action(self, clean_history, sample_level):
        """Record a single action (no previous state)."""
        clean_history.record_action(sample_level, "create_level")
        assert clean_history.present is not None
        assert clean_history.present.action == "create_level"
        assert clean_history.present.board == sample_level
        assert clean_history.past == []
        assert clean_history.future == []

    def test_record_multiple_actions_in_sequence(self, clean_history, sample_level):
        """Record multiple actions sequentially."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")
        clean_history.record_action(sample_level, "action_3")

        assert clean_history.present.action == "action_3"
        assert len(clean_history.past) == 2
        assert clean_history.past[0].action == "action_1"
        assert clean_history.past[1].action == "action_2"

    def test_record_action_clears_future(self, clean_history, sample_level):
        """Recording new action after undo clears future stack."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")
        clean_history.undo()  # Moves action_2 to future

        assert len(clean_history.future) == 1

        clean_history.record_action(sample_level, "action_3")  # Should clear future
        assert clean_history.future == []
        assert clean_history.present.action == "action_3"

    def test_record_action_timestamp_creation(self, clean_history, sample_level):
        """Record action creates a valid timestamp."""
        clean_history.record_action(sample_level, "timestamped_action")
        assert clean_history.present.timestamp is not None
        assert isinstance(clean_history.present.timestamp, str)
        assert len(clean_history.present.timestamp) > 0


class TestMaxHistoryLimit:
    """Tests for history size limit enforcement."""

    def test_history_respects_max_size(self, sample_level):
        """Past stack is limited to max_history size."""
        history = EditorHistory(max_history=3)

        for i in range(5):
            history.record_action(sample_level, f"action_{i}")

        # With 5 actions and max_history=3:
        # past has 3 items, present is the 5th action
        # When action_4 is recorded, past exceeds limit and action_0 is removed
        assert len(history.past) == 3
        # past should contain action_1, action_2, action_3
        # present is action_4
        assert history.past[0].action == "action_1"
        assert history.past[1].action == "action_2"
        assert history.past[2].action == "action_3"
        assert history.present.action == "action_4"

    def test_history_removes_oldest_when_exceeded(self, sample_level):
        """When history exceeds max, oldest items are removed first."""
        history = EditorHistory(max_history=2)

        history.record_action(sample_level, "first")
        history.record_action(sample_level, "second")
        history.record_action(sample_level, "third")
        history.record_action(sample_level, "fourth")

        # After 4 records with max_history=2:
        # record "first": past=[], present="first"
        # record "second": past=["first"], present="second"
        # record "third": past=["first", "second"], present="third" (len=2, no eviction yet)
        # record "fourth": past=["first", "second", "third"], present="fourth" (len=3 > 2, pop(0))
        # Final: past=["second", "third"], present="fourth"
        assert len(history.past) == 2
        assert history.past[0].action == "second"
        assert history.past[1].action == "third"
        assert history.present.action == "fourth"

    def test_default_max_history_is_50(self, sample_level):
        """Default history limit is 50 actions."""
        history = EditorHistory()

        for i in range(60):
            history.record_action(sample_level, f"action_{i}")

        # With 60 actions and max_history=50:
        # past will have actions 9-58 (50 total)
        # present will be action_59
        assert len(history.past) == 50
        assert history.past[0].action == "action_9"
        assert history.past[-1].action == "action_58"
        assert history.present.action == "action_59"


class TestUndo:
    """Tests for undo operation."""

    def test_undo_single_action(self, clean_history, sample_level):
        """Undo returns to previous state."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")

        previous = clean_history.undo()

        assert previous is not None
        assert previous.action == "action_1"
        assert clean_history.present == previous
        assert len(clean_history.past) == 0  # action_1 was popped from past
        assert len(clean_history.future) == 1  # action_2 moved to future

    def test_undo_when_no_history(self, clean_history):
        """Undo returns None when past is empty."""
        result = clean_history.undo()
        assert result is None
        assert clean_history.present is None

    def test_undo_after_single_action(self, clean_history, sample_level):
        """Undo after single action when no past returns None."""
        clean_history.record_action(sample_level, "only_action")
        result = clean_history.undo()

        assert result is None  # No previous state to undo to
        assert clean_history.present.action == "only_action"  # Present unchanged
        assert len(clean_history.future) == 0  # Future unchanged

    def test_multiple_undos(self, clean_history, sample_level):
        """Chain multiple undos."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")
        clean_history.record_action(sample_level, "action_3")

        clean_history.undo()
        assert clean_history.present.action == "action_2"

        clean_history.undo()
        assert clean_history.present.action == "action_1"

        result = clean_history.undo()
        # Trying to undo when past is empty returns None
        assert result is None
        # Present remains unchanged
        assert clean_history.present.action == "action_1"


class TestRedo:
    """Tests for redo operation."""

    def test_redo_single_action(self, clean_history, sample_level):
        """Redo restores previously undone state."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")

        clean_history.undo()
        result = clean_history.redo()

        assert result is not None
        assert result.action == "action_2"
        assert clean_history.present == result

    def test_redo_when_no_future(self, clean_history, sample_level):
        """Redo returns None when future is empty."""
        clean_history.record_action(sample_level, "action")
        result = clean_history.redo()

        assert result is None
        assert clean_history.present.action == "action"

    def test_redo_after_new_action_clears_future(self, clean_history, sample_level):
        """New action after undo prevents redo."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")

        clean_history.undo()
        assert clean_history.can_redo()

        clean_history.record_action(sample_level, "action_3")

        # Future should be cleared, redo should fail
        assert not clean_history.can_redo()
        result = clean_history.redo()
        assert result is None

    def test_multiple_redos(self, clean_history, sample_level):
        """Chain multiple redos (future stack is LIFO)."""
        for i in range(1, 4):
            clean_history.record_action(sample_level, f"action_{i}")

        clean_history.undo()
        clean_history.undo()
        clean_history.undo()
        # Now: past=[], present=action_1, future=[action_3, action_2] (reversed)

        clean_history.redo()
        # Pop from future gets action_2 (LIFO)
        assert clean_history.present.action == "action_2"

        clean_history.redo()
        # Pop from future gets action_3
        assert clean_history.present.action == "action_3"

        result = clean_history.redo()
        # Future is now empty
        assert result is None
        assert clean_history.present.action == "action_3"


class TestCanUndoCanRedo:
    """Tests for state availability checks."""

    def test_can_undo_on_empty_history(self, clean_history):
        """can_undo is False on empty history."""
        assert not clean_history.can_undo()

    def test_can_undo_after_single_action(self, clean_history, sample_level):
        """can_undo is False after single action (no previous state)."""
        clean_history.record_action(sample_level, "action_1")
        assert not clean_history.can_undo()

    def test_can_undo_after_two_actions(self, clean_history, sample_level):
        """can_undo is True when past is not empty."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")
        assert clean_history.can_undo()

    def test_can_redo_on_empty_history(self, clean_history):
        """can_redo is False on empty history."""
        assert not clean_history.can_redo()

    def test_can_redo_after_undo(self, clean_history, sample_level):
        """can_redo is True after undo operation."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")

        clean_history.undo()
        assert clean_history.can_redo()

    def test_can_redo_false_after_new_action(self, clean_history, sample_level):
        """can_redo becomes False when new action recorded after undo."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")

        clean_history.undo()
        assert clean_history.can_redo()

        clean_history.record_action(sample_level, "action_3")
        assert not clean_history.can_redo()


class TestClear:
    """Tests for clearing history."""

    def test_clear_empties_all_stacks(self, clean_history, sample_level):
        """Clear resets past, present, and future."""
        for i in range(5):
            clean_history.record_action(sample_level, f"action_{i}")
        clean_history.undo()

        clean_history.clear()

        assert clean_history.past == []
        assert clean_history.present is None
        assert clean_history.future == []

    def test_clear_on_empty_history(self, clean_history):
        """Clear on empty history is idempotent."""
        clean_history.clear()

        assert clean_history.past == []
        assert clean_history.present is None
        assert clean_history.future == []

    def test_after_clear_operations_work(self, clean_history, sample_level):
        """After clear, history can be used normally."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.clear()

        assert not clean_history.can_undo()

        clean_history.record_action(sample_level, "action_2")
        assert clean_history.present.action == "action_2"
        assert not clean_history.can_undo()  # Still no previous state


class TestGlobalEditorHistory:
    """Tests for global editor history instance."""

    def test_get_editor_history_returns_instance(self):
        """get_editor_history returns EditorHistory instance."""
        reset_editor_history()
        history = get_editor_history()
        assert isinstance(history, EditorHistory)

    def test_get_editor_history_is_singleton(self):
        """get_editor_history returns same instance on repeated calls."""
        reset_editor_history()
        history1 = get_editor_history()
        history2 = get_editor_history()
        assert history1 is history2

    def test_reset_editor_history_creates_new_instance(self):
        """reset_editor_history creates fresh instance."""
        history1 = get_editor_history()
        reset_editor_history()
        history2 = get_editor_history()
        assert history1 is not history2


class TestUndoRedoIntegration:
    """Integration tests for undo/redo workflows."""

    def test_undo_redo_cycle(self, clean_history, sample_level):
        """Complete undo/redo cycle maintains correct state."""
        clean_history.record_action(sample_level, "action_1")
        clean_history.record_action(sample_level, "action_2")

        initial_present = clean_history.present

        clean_history.undo()
        assert clean_history.present.action == "action_1"

        clean_history.redo()
        assert clean_history.present == initial_present
        assert clean_history.present.action == "action_2"

    def test_undo_redo_with_new_branch(self, clean_history, sample_level):
        """Recording action after undo creates new branch."""
        clean_history.record_action(sample_level, "a")
        clean_history.record_action(sample_level, "b")
        clean_history.record_action(sample_level, "c")

        clean_history.undo()
        clean_history.undo()

        # At this point, present is "a", future is ["b", "c"]
        assert clean_history.present.action == "a"
        assert clean_history.can_redo()

        clean_history.record_action(sample_level, "x")

        # Future should be cleared, redo not possible
        assert not clean_history.can_redo()
        assert clean_history.present.action == "x"
        assert clean_history.past[0].action == "a"

    def test_interleaved_undo_redo_operations(self, clean_history, sample_level):
        """Complex sequence of undo/redo operations."""
        clean_history.record_action(sample_level, "1")
        clean_history.record_action(sample_level, "2")
        clean_history.record_action(sample_level, "3")
        clean_history.record_action(sample_level, "4")

        clean_history.undo()  # present=3, future=[4]
        clean_history.undo()  # present=2, future=[3,4]
        clean_history.redo()  # present=3, future=[4]
        clean_history.redo()  # present=4, future=[]
        clean_history.undo()  # present=3, future=[4]
        clean_history.undo()  # present=2, future=[3,4]
        clean_history.undo()  # present=1, future=[2,3,4]

        assert clean_history.present.action == "1"
        assert len(clean_history.past) == 0
        assert len(clean_history.future) == 3

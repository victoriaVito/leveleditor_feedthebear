from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from feed_the_bear_toolkit.domain.levels import load_level_file
from feed_the_bear_toolkit.domain.validation import validate_level_structure
from feed_the_bear_toolkit.services.config import find_project_root, resolve_repo_path
from feed_the_bear_toolkit.services.repo_io import save_text_file

PROGRESSION_LEVEL_NAME_RE = re.compile(
    r"^progression_([a-z])_level([0-9]+)(?:_needs_review)?\.json$"
)


@dataclass(slots=True, frozen=True)
class ProgressionSlot:
    slot: int
    level_file: str | None = None
    status: str | None = None
    label: str | None = None

    @property
    def is_tutorial(self) -> bool:
        return self.slot == 0 or self.status == "reserved" or self.label == "TUTORIAL"


@dataclass(slots=True)
class ProgressionConfig:
    name: str
    locked: bool
    tutorial_level_file: str | None
    slots: list[ProgressionSlot] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def assigned_slots(self) -> int:
        return sum(1 for slot in self.slots if slot.level_file)


@dataclass(slots=True)
class ManagerMetadata:
    saved_at: str | None
    reason: str | None
    active_tab: str | None
    selected_id: int | None
    counts: dict[str, int]
    progression_order: list[str]
    filters: dict[str, str]
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class ProgressionLevelCheck:
    slot: int
    level_file: str
    exists: bool
    valid: bool
    error_count: int
    warning_count: int
    load_error: str | None = None


@dataclass(slots=True)
class ProgressionValidationSummary:
    name: str
    total_slots: int
    assigned_slots: int
    tutorial_slots: int
    checked_levels: int
    valid_levels: int
    invalid_levels: int
    missing_levels: int
    entries: list[ProgressionLevelCheck] = field(default_factory=list)


def _as_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float) and int(value) == value:
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return int(float(stripped))
        except ValueError:
            return None
    return None


def parse_progression_dict(raw: dict[str, Any]) -> ProgressionConfig:
    slots: list[ProgressionSlot] = []
    for entry in raw.get("slots") or []:
        if not isinstance(entry, dict):
            continue
        slot_number = _as_int(entry.get("slot"))
        if slot_number is None:
            continue
        slots.append(
            ProgressionSlot(
                slot=slot_number,
                level_file=str(entry.get("level_file") or "").strip() or None,
                status=str(entry.get("status") or "").strip() or None,
                label=str(entry.get("label") or "").strip() or None,
            )
        )
    return ProgressionConfig(
        name=str(raw.get("name") or "").strip(),
        locked=bool(raw.get("locked")),
        tutorial_level_file=str(raw.get("tutorial_level_file") or "").strip() or None,
        slots=slots,
        raw=raw,
    )


def load_progression_file(path: Path) -> ProgressionConfig:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(raw, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return parse_progression_dict(raw)


def parse_manager_metadata_dict(raw: dict[str, Any]) -> ManagerMetadata:
    counts = {
        str(key): _as_int(value) or 0
        for key, value in dict(raw.get("counts") or {}).items()
    }
    filters = {
        str(key): str(value)
        for key, value in dict(raw.get("filters") or {}).items()
    }
    return ManagerMetadata(
        saved_at=str(raw.get("saved_at") or "").strip() or None,
        reason=str(raw.get("reason") or "").strip() or None,
        active_tab=str(raw.get("active_tab") or "").strip() or None,
        selected_id=_as_int(raw.get("selected_id")),
        counts=counts,
        progression_order=[str(item) for item in list(raw.get("progression_order") or [])],
        filters=filters,
        raw=raw,
    )


def load_manager_metadata(path: Path) -> ManagerMetadata:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(raw, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return parse_manager_metadata_dict(raw)


def load_live_progressions(path: Path) -> dict[str, ProgressionConfig]:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(raw, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return {
        key: parse_progression_dict(value)
        for key, value in raw.items()
        if isinstance(value, dict)
    }


def serialize_progression_dict(progression: ProgressionConfig) -> dict[str, Any]:
    serialized = dict(progression.raw) if progression.raw else {}
    serialized["name"] = progression.name
    serialized["locked"] = progression.locked
    serialized["tutorial_level_file"] = progression.tutorial_level_file
    serialized["slots"] = []
    for slot in progression.slots:
        slot_payload: dict[str, Any] = {"slot": slot.slot}
        if slot.level_file:
            slot_payload["level_file"] = slot.level_file
        if slot.status:
            slot_payload["status"] = slot.status
        if slot.label:
            slot_payload["label"] = slot.label
        serialized["slots"].append(slot_payload)
    return serialized


def serialize_progression_json(progression: ProgressionConfig) -> str:
    return json.dumps(serialize_progression_dict(progression), indent=2, ensure_ascii=False)


def default_progression_paths(root: Path | None = None) -> dict[str, Path]:
    project_root = root.resolve() if root is not None else find_project_root()
    return {
        "live": resolve_repo_path(Path("progressions/manager_progressions_live.json"), project_root),
        "metadata": resolve_repo_path(Path("progressions/manager_state/level_manager_metadata.json"), project_root),
    }


def serialize_manager_metadata_dict(metadata: ManagerMetadata) -> dict[str, Any]:
    serialized = dict(metadata.raw) if metadata.raw else {}
    serialized["saved_at"] = metadata.saved_at
    serialized["reason"] = metadata.reason
    serialized["active_tab"] = metadata.active_tab
    serialized["selected_id"] = metadata.selected_id
    serialized["counts"] = dict(metadata.counts)
    serialized["progression_order"] = list(metadata.progression_order)
    serialized["filters"] = dict(metadata.filters)
    return serialized


def serialize_manager_metadata_json(metadata: ManagerMetadata) -> str:
    return json.dumps(serialize_manager_metadata_dict(metadata), indent=2, ensure_ascii=False)


def serialize_live_progressions_dict(live: dict[str, ProgressionConfig]) -> dict[str, Any]:
    return {
        key: serialize_progression_dict(live[key])
        for key in sorted(live)
    }


def serialize_live_progressions_json(live: dict[str, ProgressionConfig]) -> str:
    return json.dumps(serialize_live_progressions_dict(live), indent=2, ensure_ascii=False)


def save_progression_file(
    progression: ProgressionConfig,
    relative_path: str,
    root: Path | None = None,
) -> Path:
    project_root = root.resolve() if root is not None else find_project_root()
    result = save_text_file(relative_path, serialize_progression_json(progression), project_root)
    return result.path


def save_manager_metadata(
    metadata: ManagerMetadata,
    relative_path: str = "progressions/manager_state/level_manager_metadata.json",
    root: Path | None = None,
) -> Path:
    project_root = root.resolve() if root is not None else find_project_root()
    result = save_text_file(relative_path, serialize_manager_metadata_json(metadata), project_root)
    return result.path


def save_live_progressions(
    live: dict[str, ProgressionConfig],
    relative_path: str = "progressions/manager_progressions_live.json",
    root: Path | None = None,
) -> Path:
    project_root = root.resolve() if root is not None else find_project_root()
    result = save_text_file(relative_path, serialize_live_progressions_json(live), project_root)
    return result.path


def validate_progression_levels(
    progression: ProgressionConfig,
    root: Path | None = None,
) -> ProgressionValidationSummary:
    project_root = root.resolve() if root is not None else find_project_root()
    entries: list[ProgressionLevelCheck] = []
    assigned_slots = sum(1 for slot in progression.slots if slot.level_file)
    tutorial_slots = sum(1 for slot in progression.slots if slot.is_tutorial)

    for slot in progression.slots:
        if not slot.level_file:
            continue
        file_name = Path(slot.level_file).name
        match = PROGRESSION_LEVEL_NAME_RE.match(file_name)
        if match is None:
            entries.append(
                ProgressionLevelCheck(
                    slot=slot.slot,
                    level_file=slot.level_file,
                    exists=True,
                    valid=False,
                    error_count=1,
                    warning_count=0,
                    load_error=(
                        "invalid level filename; expected "
                        "progression_<letter>_level<n>[_needs_review].json"
                    ),
                )
            )
            continue
        level_path = Path(slot.level_file)
        target = level_path if level_path.is_absolute() else (project_root / level_path).resolve()
        if not target.exists():
            entries.append(
                ProgressionLevelCheck(
                    slot=slot.slot,
                    level_file=slot.level_file,
                    exists=False,
                    valid=False,
                    error_count=1,
                    warning_count=0,
                    load_error="missing level file",
                )
            )
            continue
        try:
            level = load_level_file(target)
            result = validate_level_structure(level)
            id_matches_file = (level.id or "").strip() == Path(slot.level_file).stem
            valid = bool(result.valid and id_matches_file)
            error_count = len(result.errors) + (0 if id_matches_file else 1)
            load_error = None if id_matches_file else "level id must match filename stem"
            entries.append(
                ProgressionLevelCheck(
                    slot=slot.slot,
                    level_file=slot.level_file,
                    exists=True,
                    valid=valid,
                    error_count=error_count,
                    warning_count=len(result.warnings),
                    load_error=load_error,
                )
            )
        except Exception as err:  # pragma: no cover - defensive path
            entries.append(
                ProgressionLevelCheck(
                    slot=slot.slot,
                    level_file=slot.level_file,
                    exists=True,
                    valid=False,
                    error_count=1,
                    warning_count=0,
                    load_error=str(err),
                )
            )

    valid_levels = sum(1 for entry in entries if entry.exists and entry.valid)
    invalid_levels = sum(1 for entry in entries if entry.exists and not entry.valid)
    missing_levels = sum(1 for entry in entries if not entry.exists)
    return ProgressionValidationSummary(
        name=progression.name,
        total_slots=len(progression.slots),
        assigned_slots=assigned_slots,
        tutorial_slots=tutorial_slots,
        checked_levels=len(entries),
        valid_levels=valid_levels,
        invalid_levels=invalid_levels,
        missing_levels=missing_levels,
        entries=entries,
    )

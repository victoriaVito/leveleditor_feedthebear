from __future__ import annotations

from pathlib import Path


CANONICAL_REPO_DIRS = (
    "levels",
    "progressions",
    "bundles",
    "screenshots",
    "playtest",
)


def find_project_root(start: Path | None = None) -> Path:
    current = (start or Path(__file__).resolve()).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "AGENTS.md").exists() and (candidate / "level_toolkit_web").exists():
            return candidate
    return Path(__file__).resolve().parents[4]


def canonical_repo_paths(start: Path | None = None) -> dict[str, Path]:
    root = find_project_root(start)
    return {name: root / name for name in CANONICAL_REPO_DIRS}


def resolve_repo_path(path: Path, start: Path | None = None) -> Path:
    if path.is_absolute():
        return path
    root = find_project_root(start)
    repo_relative = (root / path).resolve()
    if repo_relative.exists():
        return repo_relative
    return path.resolve()

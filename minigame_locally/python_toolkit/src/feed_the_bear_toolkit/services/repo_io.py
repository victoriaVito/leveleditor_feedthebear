from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

from feed_the_bear_toolkit.services.config import find_project_root


ALLOWED_WRITE_ROOTS = frozenset(
    {
        "levels",
        "progressions",
        "bundles",
        "screenshots",
        "playtest",
        ".local",
        "output",
    }
)


class RepoIoError(ValueError):
    """Raised when a repo I/O operation is invalid or unsafe."""


@dataclass(slots=True, frozen=True)
class RepoFileStatus:
    ok: bool
    exists: bool
    path: Path


@dataclass(slots=True, frozen=True)
class RepoWriteResult:
    ok: bool
    path: Path
    bytes_written: int


@dataclass(slots=True, frozen=True)
class RepoReadResult:
    ok: bool
    path: Path
    data_base64: str
    bytes_read: int


def project_path(root: Path, relative_path: str) -> Path:
    return (root / relative_path).resolve()


def _normalize_relative_path(relative_path: str) -> str:
    value = str(relative_path or "").strip().replace("\\", "/")
    value = value.lstrip("/")
    if not value:
        raise RepoIoError("relativePath is required")
    return value


def _root_segment(relative_path: str) -> str:
    return _normalize_relative_path(relative_path).split("/", 1)[0]


def ensure_allowed_relative_path(relative_path: str) -> str:
    normalized = _normalize_relative_path(relative_path)
    root_segment = _root_segment(normalized)
    if root_segment not in ALLOWED_WRITE_ROOTS:
        raise RepoIoError(
            f"Path root {root_segment!r} is not writable; allowed roots: {sorted(ALLOWED_WRITE_ROOTS)}"
        )
    return normalized


def resolve_repo_output_path(relative_path: str, root: Path | None = None) -> Path:
    repo_root = root.resolve() if root is not None else find_project_root()
    normalized = ensure_allowed_relative_path(relative_path)
    target = (repo_root / normalized).resolve()
    if repo_root not in {target, *target.parents}:
        raise RepoIoError("Resolved path escapes the project root")
    return target


def file_status(relative_path: str, root: Path | None = None) -> RepoFileStatus:
    target = resolve_repo_output_path(relative_path, root)
    return RepoFileStatus(ok=True, exists=target.exists(), path=target)


def save_text_file(relative_path: str, content: str, root: Path | None = None) -> RepoWriteResult:
    target = resolve_repo_output_path(relative_path, root)
    text = str(content)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
    return RepoWriteResult(ok=True, path=target, bytes_written=len(text.encode("utf-8")))


def append_text_file(relative_path: str, content: str, root: Path | None = None) -> RepoWriteResult:
    target = resolve_repo_output_path(relative_path, root)
    text = str(content)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("a", encoding="utf-8") as handle:
        handle.write(text)
    return RepoWriteResult(ok=True, path=target, bytes_written=len(text.encode("utf-8")))


def _decode_data_url(data_url: str) -> bytes:
    prefix, marker, payload = str(data_url or "").partition("base64,")
    if not marker or not prefix.startswith("data:"):
        raise RepoIoError("Invalid data URL")
    try:
        return base64.b64decode(payload, validate=True)
    except binascii.Error as err:
        raise RepoIoError("Invalid base64 payload in data URL") from err


def save_data_url_file(relative_path: str, data_url: str, root: Path | None = None) -> RepoWriteResult:
    target = resolve_repo_output_path(relative_path, root)
    payload = _decode_data_url(data_url)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    return RepoWriteResult(ok=True, path=target, bytes_written=len(payload))


def read_file_base64(relative_path: str, root: Path | None = None) -> RepoReadResult:
    target = resolve_repo_output_path(relative_path, root)
    payload = target.read_bytes()
    return RepoReadResult(
        ok=True,
        path=target,
        data_base64=base64.b64encode(payload).decode("ascii"),
        bytes_read=len(payload),
    )


def create_zip_archive(
    relative_path: str,
    entries: list[dict[str, Any]],
    root: Path | None = None,
) -> RepoWriteResult:
    target = resolve_repo_output_path(relative_path, root)
    if target.suffix.lower() != ".zip":
        raise RepoIoError("ZIP output path must end with .zip")
    target.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="ftb-python-zip-") as _temp_dir:
        with ZipFile(target, "w", compression=ZIP_DEFLATED) as archive:
            for entry in entries:
                relative_entry_path = _normalize_relative_path(entry.get("relativePath", ""))
                if entry.get("dataUrl"):
                    payload = _decode_data_url(str(entry["dataUrl"]))
                    archive.writestr(relative_entry_path, payload)
                    continue
                archive.writestr(relative_entry_path, str(entry.get("content", "")))
    return RepoWriteResult(ok=True, path=target, bytes_written=target.stat().st_size)

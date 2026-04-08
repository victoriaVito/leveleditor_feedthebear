#!/usr/bin/env python3
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPO_LEARNING_PATH = ROOT / ".local" / "toolkit_state" / "learning_state.json"
DB_PATH = ROOT / ".local" / "ftb_local_store.db"
BUNDLE_PATH = ROOT / ".local" / "browser_state_exports" / "latest_browser_state_bundle.json"
OUTPUT_PATH = ROOT / "output" / "procedural" / "procedural_learning_snapshot.json"


def load_learning_from_repo_file() -> tuple[dict, str] | tuple[None, None]:
    if not REPO_LEARNING_PATH.exists():
        return None, None
    payload = json.loads(REPO_LEARNING_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        return None, None
    return payload, datetime.fromtimestamp(REPO_LEARNING_PATH.stat().st_mtime, timezone.utc).isoformat()


def load_learning_from_db() -> tuple[dict, str] | tuple[None, None]:
    if not DB_PATH.exists():
        return None, None
    con = sqlite3.connect(DB_PATH)
    try:
        row = con.execute(
            "select payload_json, updated_at from snapshots where kind='learning'"
        ).fetchone()
    finally:
        con.close()
    if not row or not row[0]:
        return None, None
    return json.loads(row[0]), row[1]


def load_learning_from_bundle() -> tuple[dict, str] | tuple[None, None]:
    if not BUNDLE_PATH.exists():
        return None, None
    data = json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))
    snapshot = (((data or {}).get("snapshots") or {}).get("learning") or {})
    payload = snapshot.get("payload")
    if not isinstance(payload, dict):
        return None, None
    return payload, data.get("saved_at")


def trimmed(entries: list[dict], limit: int = 5) -> list[dict]:
    ordered = sorted(entries or [], key=lambda item: item.get("timestamp", 0), reverse=True)
    return ordered[:limit]


def main() -> None:
    learning, updated_at = load_learning_from_repo_file()
    source = "repo_learning_file"
    if learning is None:
        learning, updated_at = load_learning_from_db()
        source = "local_store_db"
    if learning is None:
        learning, updated_at = load_learning_from_bundle()
        source = "browser_state_bundle"
    if learning is None:
        raise SystemExit("No procedural learning snapshot found.")

    approved = learning.get("approved") or []
    rejected = learning.get("rejected") or []
    corrections = learning.get("corrections") or []

    payload = {
      "exported_at": datetime.now(timezone.utc).isoformat(),
      "source": source,
      "source_updated_at": updated_at,
      "approved_count": len(approved),
      "rejected_count": len(rejected),
      "corrections_count": len(corrections),
      "latest_approved": trimmed(approved),
      "latest_rejected": trimmed(rejected),
      "latest_corrections": trimmed(corrections),
      "raw": learning
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(str(OUTPUT_PATH))


if __name__ == "__main__":
    main()

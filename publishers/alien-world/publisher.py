#!/usr/bin/env python3
"""Alien World Publisher — command the Universal Editorial Engine and route output.

Publisher is deliberately network-free and database-read-only. The separate
Data Collector owns source access, enrichment and writes to the SQLite store.
This Publisher reads that store, issues an Engine command, and places only the
Engine's completed deliverables into the Alien World view's public output area.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = Path(__file__).with_name("profile.json")
ENGINE_DIR = ROOT / "editorial-engine"
DB_PATH = ROOT / ".publisher-data" / "alien-world" / "alien-world.sqlite3"
OUTPUT_DIR = ROOT / "published" / "alien-world"


def load_profile() -> dict[str, Any]:
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    if profile.get("schemaVersion") != 1 or profile.get("viewId") != "alien-world":
        raise RuntimeError("Publisher profile failed its schema/view identity check.")
    if profile.get("publisherId") != "alien-world-publisher":
        raise RuntimeError("Publisher profile identity is not the registered Alien World Publisher.")
    return profile


def read_only_connection() -> sqlite3.Connection:
    if not DB_PATH.is_file():
        raise RuntimeError("The Collector database is missing. Run the Data Collection step first.")
    uri = "file:" + quote(DB_PATH.as_posix(), safe="/:") + "?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA query_only=ON")
    return con


def atomic_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".pending")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def route_engine_outputs(result: dict[str, Any], mode: str) -> None:
    """Publish only completed Engine outputs; do not compose or edit their content."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if "feed" in result:
        atomic_json(OUTPUT_DIR / "live-feed.json", result["feed"])
    if "magazine" not in result:
        return

    magazine = result["magazine"]
    issue_record = {
        "issueId": magazine["issueId"],
        "title": magazine["title"],
        "publishedAt": result["generatedAt"],
        "coverageStart": result["coverageStart"],
        "coverageEnd": result["coverageEnd"],
        "windowHours": result["windowHours"],
        "pdfUrl": "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/published/alien-world/"
                  + magazine["relativePath"],
        "pages": magazine["pages"],
        "bytes": magazine["bytes"],
        "sha256": magazine["sha256"],
        "customRequest": magazine["customRequest"],
        "customRequestReceipt": magazine["customRequestReceipt"],
        "storyCount": result["eligibleStoryCount"],
    }
    publication = {
        "schemaVersion": 1,
        "viewId": "alien-world",
        "publisherId": "alien-world-publisher",
        "engine": result["engine"],
        "engineVersion": result["engineVersion"],
        **issue_record,
    }
    atomic_json(OUTPUT_DIR / "latest-publication.json", publication)

    # Keep the existing catalog/issue-retention behaviour unchanged.
    catalog_path = OUTPUT_DIR / "catalog.json"
    if catalog_path.exists():
        try:
            catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        except Exception:
            catalog = {"schemaVersion": 1, "viewId": "alien-world", "issues": []}
    else:
        catalog = {"schemaVersion": 1, "viewId": "alien-world", "issues": []}
    issues = [item for item in catalog.get("issues", []) if item.get("issueId") != magazine["issueId"]]
    issues.insert(0, issue_record)
    issues = issues[:3]
    catalog = {
        "schemaVersion": 1,
        "viewId": "alien-world",
        "generatedAt": result["generatedAt"],
        "latest": issue_record,
        "issues": issues,
    }
    atomic_json(catalog_path, catalog)
    magazine_dir = OUTPUT_DIR / "magazines"
    keep = {item["issueId"] + ".pdf" for item in issues}
    if magazine_dir.exists():
        for old_pdf in magazine_dir.glob("alien-world-*.pdf"):
            if old_pdf.name not in keep:
                old_pdf.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("live", "magazine", "all"),
                        default=os.getenv("PUBLISH_MODE", "live"))
    parser.add_argument("--custom-request", default=os.getenv("CUSTOM_REQUEST", ""))
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    connection: sqlite3.Connection | None = None
    try:
        profile = load_profile()
        connection = read_only_connection()
        command = {
            "commandId": hashlib.sha256(
                f"alien-world:{now.isoformat()}:{args.mode}".encode("utf-8")
            ).hexdigest()[:24],
            "viewId": profile["viewId"],
            "publisherId": profile["publisherId"],
            "issuedAt": now.isoformat(),
            "mode": args.mode,
            "customRequest": args.custom_request or profile.get("editorialProfile", {}).get("defaultCustomRequest", ""),
        }
        sys.path.insert(0, str(ENGINE_DIR))
        from universal_editorial_engine import run_engine

        # Engine receives only a read-only database handle, profile and command.
        result = run_engine(connection, profile, command, OUTPUT_DIR, now)
        connection.close()
        connection = None
        route_engine_outputs(result, args.mode)
        print(json.dumps({
            "status": "published",
            "mode": args.mode,
            "viewId": profile["viewId"],
            "engine": result["engine"],
            "stories": result["eligibleStoryCount"],
            "generatedAt": result["generatedAt"],
            "magazine": result.get("magazine"),
        }, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({
            "status": "skipped",
            "error": str(exc),
            "preservedLastGood": True,
        }, indent=2), file=sys.stderr)
        return 2
    finally:
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    raise SystemExit(main())

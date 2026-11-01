#!/usr/bin/env python3
"""Alien World Live Publisher.

This Publisher has one job: read the Collector-owned database in read-only mode,
ask the shared Universal Editorial Engine for a live feed, and atomically publish
only alien-world/published/live-feed.json. It cannot publish magazines, catalogues,
publication-history metadata, or source records.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = Path(__file__).with_name("profile.json")
ENGINE_DIR = ROOT / "editorial-engine"
DB_PATH = ROOT / ".publisher-data" / "alien-world" / "alien-world.sqlite3"
OUTPUT_DIR = ROOT / "alien-world" / "published"
TEST_FILE = ROOT / "alien-world" / "tests" / "test_alien_world_pipeline.py"


def load_profile() -> dict[str, Any]:
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    if profile.get("schemaVersion") != 1 or profile.get("viewId") != "alien-world":
        raise RuntimeError("Publisher profile failed its schema/view identity check.")
    if profile.get("publisherId") != "alien-world-publisher":
        raise RuntimeError("Publisher profile identity is not the registered Alien World Publisher.")
    output = profile.get("output", {})
    if output.get("publisherNetworkAccess") is not False:
        raise RuntimeError("Publisher network access must remain disabled.")
    if output.get("publisherDatabaseWriteAccess") is not False:
        raise RuntimeError("Publisher database write access must remain disabled.")
    if output.get("liveFeedOnly") is not True or output.get("liveFeed") != "live-feed.json":
        raise RuntimeError("Alien World Publisher must be configured for live-feed-only output.")
    if any(key in output for key in ("catalog", "latestPublication", "magazine", "pdf")):
        raise RuntimeError("Magazine and publication-history outputs are not allowed for Alien World.")
    return profile


def run_contract_tests() -> None:
    """Run deterministic local contract checks before changing the public feed."""
    if not TEST_FILE.is_file():
        raise RuntimeError("Live-feed contract tests are missing; publication is blocked.")
    result = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", str(TEST_FILE.parent),
         "-p", TEST_FILE.name, "-v"],
        cwd=ROOT,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("Alien World live-feed contract tests failed; no publication was changed.")


def read_only_connection() -> sqlite3.Connection:
    if not DB_PATH.is_file():
        raise RuntimeError("The Collector database is missing. Run the Data Collection step first.")
    uri = "file:" + quote(DB_PATH.as_posix(), safe="/:") + "?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only=ON")
    return connection


def atomic_json(path: Path, payload: dict[str, Any]) -> None:
    """Replace one public JSON file atomically; never leave a partial feed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".pending")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def route_engine_outputs(result: dict[str, Any]) -> None:
    """Accept and route a live feed only. Refuse every magazine-shaped result."""
    if not isinstance(result, dict) or "feed" not in result:
        raise RuntimeError("The Editorial Engine did not return a live feed; existing feed is preserved.")
    if "magazine" in result:
        raise RuntimeError("Magazine output is forbidden for the Alien World Live Publisher.")
    feed = result["feed"]
    if not isinstance(feed, dict):
        raise RuntimeError("The Editorial Engine returned an invalid feed payload.")
    if feed.get("schemaVersion") != 1 or feed.get("viewId") != "alien-world":
        raise RuntimeError("The live-feed payload failed its schema/view identity check.")
    if feed.get("publisherId") != "alien-world-publisher":
        raise RuntimeError("The live-feed payload has an unexpected Publisher identity.")
    stories = feed.get("stories")
    if not isinstance(stories, list) or feed.get("storyCount") != len(stories):
        raise RuntimeError("The live-feed payload has an invalid story count.")
    if not isinstance(feed.get("generatedAt"), str) or not feed["generatedAt"].strip():
        raise RuntimeError("The live-feed payload is missing its publication timestamp.")
    if not isinstance(feed.get("windowHours"), int) or feed["windowHours"] < 1:
        raise RuntimeError("The live-feed payload has an invalid rolling window.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    atomic_json(OUTPUT_DIR / "live-feed.json", feed)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mode", choices=("live",), default="live",
        help="Alien World supports live-feed publication only.",
    )
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    connection: sqlite3.Connection | None = None
    try:
        profile = load_profile()
        run_contract_tests()
        connection = read_only_connection()
        command = {
            "commandId": hashlib.sha256(
                f"alien-world:{now.isoformat()}:live".encode("utf-8")
            ).hexdigest()[:24],
            "viewId": profile["viewId"],
            "publisherId": profile["publisherId"],
            "issuedAt": now.isoformat(),
            "mode": "live",
            "customRequest": "",
        }
        sys.path.insert(0, str(ENGINE_DIR))
        from universal_editorial_engine import run_engine

        # The shared Engine receives only the Collector database in read-only mode.
        result = run_engine(connection, profile, command, OUTPUT_DIR, now)
        connection.close()
        connection = None
        route_engine_outputs(result)
        print(json.dumps({
            "status": "published",
            "mode": "live",
            "viewId": profile["viewId"],
            "engine": result["engine"],
            "stories": result["eligibleStoryCount"],
            "generatedAt": result["generatedAt"],
            "output": "alien-world/published/live-feed.json",
        }, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({
            "status": "skipped",
            "error": str(exc),
            "preservedLastGoodLiveFeed": True,
        }, indent=2), file=sys.stderr)
        return 2
    finally:
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    raise SystemExit(main())

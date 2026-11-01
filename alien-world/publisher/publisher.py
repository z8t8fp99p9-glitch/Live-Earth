#!/usr/bin/env python3
"""Alien World Live Publisher; reads its own database and publishes the Live Feed only."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sqlite3
import subprocess
import sys
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlparse

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
    publication = profile.get("publication", {})
    if publication.get("windowMode") != "rolling-hours" or int(publication.get("issueWindowHours", 0)) != 48:
        raise RuntimeError("Alien World must begin its rolling Live Feed search at 48 hours.")
    adaptive = publication.get("adaptiveLookback", {})
    retention_hours = int(profile.get("database", {}).get("retentionDays", 32)) * 24
    stages = adaptive.get("expansionHours", [])
    if not adaptive.get("enabled") or not stages or stages[0] != 48:
        raise RuntimeError("Alien World adaptive lookback configuration is missing or invalid.")
    if stages != sorted(set(stages)) or stages[-1] > retention_hours:
        raise RuntimeError("Alien World adaptive lookback must be ordered and remain within database retention.")
    if int(adaptive.get("targetStories", 0)) != int(publication.get("maximumStories", 10)):
        raise RuntimeError("Alien World adaptive target must match the configured maximum story count.")
    return profile


def run_contract_tests() -> None:
    """Run deterministic local contract checks before changing the public feed."""
    if not TEST_FILE.is_file():
        raise RuntimeError("Live-feed contract tests are missing; publication is blocked.")
    result = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", str(TEST_FILE.parent),
         "-p", TEST_FILE.name, "-v"], cwd=ROOT, check=False,
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


class _BufferedRows:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


def _title_key(value: Any) -> str:
    normalized = unicodedata.normalize("NFKC", str(value or "")).casefold()
    return " ".join(re.findall(r"[^\W_]+", normalized, flags=re.UNICODE))


def _deduplicate_rows(rows):
    """Suppress exact normalized-title/date duplicates even when source URLs differ."""
    selected = []
    seen_urls = set()
    seen_title_days = set()
    for row in rows:
        url = str(row["url"] or "").strip()
        title = _title_key(row["title"])
        try:
            published = datetime.fromtimestamp(float(row["published_at"]), timezone.utc)
        except (TypeError, ValueError, OverflowError, OSError):
            continue
        signature = (title, published.date().isoformat())
        try:
            parsed = urlparse(url)
            safe_url = (parsed.scheme == "https" and bool(parsed.hostname)
                        and not parsed.username and not parsed.password)
        except ValueError:
            safe_url = False
        if not safe_url or url in seen_urls or not title or signature in seen_title_days:
            continue
        seen_urls.add(url)
        seen_title_days.add(signature)
        selected.append(row)
    return selected


class AdaptiveReadOnlyConnection:
    """Read-only query adapter that expands only the requested story lookback."""
    def __init__(self, connection: sqlite3.Connection, now: datetime, lookback_hours: int):
        self._connection = connection
        self._now = now
        self._lookback_hours = lookback_hours

    def execute(self, sql, parameters=()):
        normalized = " ".join(str(sql).lower().split())
        if "from stories where published_at" not in normalized:
            return self._connection.execute(sql, parameters)
        start = (self._now - timedelta(hours=self._lookback_hours)).timestamp()
        end = (self._now + timedelta(hours=2)).timestamp()
        rows = self._connection.execute(sql, (start, end)).fetchall()
        return _BufferedRows(_deduplicate_rows(rows))


def _utc_iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _apply_actual_window(result: dict[str, Any], now: datetime, hours: int) -> None:
    start = now - timedelta(hours=hours)
    result["coverageStart"] = _utc_iso(start)
    result["coverageEnd"] = _utc_iso(now)
    result["windowHours"] = hours
    result["windowLabel"] = f"the previous {hours} hours"
    result["feed"]["windowHours"] = hours


def adaptive_publish(connection: sqlite3.Connection, profile: dict[str, Any], command: dict[str, Any], now: datetime):
    """Try progressively wider windows and stop at 10 unique stories or 32 days."""
    adaptive = profile["publication"]["adaptiveLookback"]
    target = int(adaptive["targetStories"])
    stages = adaptive["expansionHours"]
    sys.path.insert(0, str(ENGINE_DIR))
    from universal_editorial_engine import run_engine

    last_result = None
    for hours in stages:
        # The shared Engine's compatibility guard is 168 hours. The read-only
        # adapter supplies the wider bounded database interval; the Publisher
        # then stamps the true interval into the returned feed contract.
        stage_profile = copy.deepcopy(profile)
        stage_profile["publication"]["issueWindowHours"] = min(int(hours), 168)
        query_connection = AdaptiveReadOnlyConnection(connection, now, int(hours))
        try:
            result = run_engine(query_connection, stage_profile, command, OUTPUT_DIR, now)
        except Exception as exc:
            # An empty early window is an expected reason to expand, not a reason
            # to stop. Every other engine failure still aborts and preserves the feed.
            if exc.__class__.__name__ == "EditorialEngineError" and "No eligible stories are available" in str(exc):
                continue
            raise
        _apply_actual_window(result, now, int(hours))
        last_result = result
        if len(result["feed"]["stories"]) >= target:
            break
    if last_result is None:
        raise RuntimeError("Adaptive lookback did not run any publication window.")
    minimum = int(profile["publication"].get("minimumStories", 2))
    if len(last_result["feed"]["stories"]) < minimum:
        raise RuntimeError(
            f"Only {len(last_result['feed']['stories'])} unique stories remain after the full "
            f"{stages[-1]}-hour lookback; minimum is {minimum}. Last-good feed preserved."
        )
    return last_result


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
    if not isinstance(feed.get("windowHours"), int) or not 1 <= feed["windowHours"] <= 768:
        raise RuntimeError("The live-feed payload has an invalid adaptive rolling window.")
    if len({story.get("url") for story in stories}) != len(stories):
        raise RuntimeError("The live-feed payload contains duplicate source URLs.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    atomic_json(OUTPUT_DIR / "live-feed.json", feed)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("live",), default="live",
                        help="Alien World supports live-feed publication only.")
    parser.parse_args()
    now = datetime.now(timezone.utc)
    connection: sqlite3.Connection | None = None
    try:
        profile = load_profile()
        run_contract_tests()
        connection = read_only_connection()
        command = {
            "commandId": hashlib.sha256(f"alien-world:{now.isoformat()}:live".encode("utf-8")).hexdigest()[:24],
            "viewId": profile["viewId"],
            "publisherId": profile["publisherId"],
            "issuedAt": now.isoformat(),
            "mode": "live",
            "customRequest": "",
        }
        result = adaptive_publish(connection, profile, command, now)
        connection.close()
        connection = None
        route_engine_outputs(result)
        print(json.dumps({
            "status": "published", "mode": "live", "viewId": profile["viewId"],
            "engine": result["engine"], "stories": result["eligibleStoryCount"],
            "generatedAt": result["generatedAt"], "windowHours": result["windowHours"],
            "output": "alien-world/published/live-feed.json",
        }, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"status": "skipped", "error": str(exc),
                          "preservedLastGoodLiveFeed": True}, indent=2), file=sys.stderr)
        return 2
    finally:
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    raise SystemExit(main())

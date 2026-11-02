#!/usr/bin/env python3
"""LIVE // EARTH — single-owner Alien World pipeline.

Runtime adapter for the existing Alien World Collector and Publisher. It keeps
those stable entrypoints and the existing SQLite database, but makes the
Global Checker the only content-rights authority on the active path.

Pipeline:
  Collector -> Global Checker -> Alien World SQLite -> Publisher
  -> Universal Editorial Engine -> Publisher -> Global Checker
  -> Publisher -> alien-world/published/live-feed.json

The adapter intentionally leaves Nature on its existing run_pipeline.py path.
"""
from __future__ import annotations

import argparse
import importlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
from datetime import timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CHECKER_DIR = ROOT / "global-checker"
ENGINE_DIR = ROOT / "editorial-engine"
ALIEN_COLLECTOR = ROOT / "alien-world" / "collector" / "collector.py"
ALIEN_PUBLISHER = ROOT / "alien-world" / "publisher" / "publisher.py"
PROFILE_PATH = ROOT / "alien-world" / "publisher" / "profile.json"

sys.path.insert(0, str(CHECKER_DIR))
import global_checker as checker  # noqa: E402
from run_pipeline import (  # noqa: E402
    CheckedConnection,
    _load_module,
    check_alien_image_candidate,
    filter_sources_for_registry,
)


def _candidate_decision(connection: sqlite3.Connection, candidate: dict[str, Any],
                        article_url: str) -> dict[str, Any]:
    """Send raw item evidence to the Global Checker; make no local rights call.

    The candidate URL is passed as descriptive evidence (not as a decision) so
    the Checker can also detect identifying terms such as NASA insignia/logo.
    """
    raw_descriptor = " ".join(str(candidate.get(key) or "") for key in (
        "url", "caption", "credit", "rightsNotice"
    ))
    checker_descriptor = re.sub(r"[-_/]+", " ", raw_descriptor)
    return check_alien_image_candidate(
        connection, candidate, article_url, checker_descriptor
    )


def _install_collector_checker(module, profile: dict[str, Any]) -> None:
    """Make source/item rights decisions delegate to the Global Checker.

    Transport safety remains in the Collector: bounded HTTPS requests, NASA host
    allowlisting, byte caps, raster MIME checks, image dimensions and decoding.
    Local Collector copyright/third-party/concept-art rules are not used.
    """
    original_open = module.open_writer_db

    def open_checked_writer(profile_arg):
        wrapped = CheckedConnection(original_open(profile_arg), "alien-world", profile_arg)
        module._global_checker_connection = wrapped
        # Re-evaluate retained records through the central policy before cache
        # reuse. A denied record is cleared by CheckedConnection.backfill_existing.
        wrapped.backfill_existing()
        return wrapped

    module.open_writer_db = open_checked_writer

    def checker_image_eligibility(candidate, article_url):
        active = getattr(module, "_global_checker_connection", None)
        if active is None:
            raise checker.GlobalCheckerError(
                "Global Checker database connection is unavailable; image collection is held."
            )
        decision = _candidate_decision(active.raw, dict(candidate), str(article_url))
        if not decision.get("allowed"):
            reasons = "; ".join(decision.get("reasons", []))
            print(
                f"GLOBAL CHECKER IMAGE HOLD [{decision.get('verdict', 'UNKNOWN')}]: "
                f"{article_url} — {reasons}",
                file=sys.stderr,
            )
        return bool(decision.get("allowed"))

    # The original Collector calls these functions, so replace the old local
    # eligibility and image-kind classifiers before collection starts. The
    # first is now a pure Checker delegation; the second is only a neutral
    # label used in the legacy cache marker, not a policy verdict.
    module.image_is_eligible = checker_image_eligibility
    module.has_restrictive_rights_notice = lambda _candidate: False
    def source_notice_label(candidate):
        # Preserve descriptive metadata for the final Checker pass as well as
        # the pre-download decision. Normalize separators so terms embedded in
        # filenames (for example, artist-concept or nasa-logo) remain detectable.
        raw_descriptor = " ".join(str(candidate.get(key) or "") for key in (
            "url", "caption", "credit"
        ))
        descriptor = re.sub(r"[-_/]+", " ", module.clean_html(raw_descriptor, 260))
        notice = module.clean_html(candidate.get("rightsNotice"), 300)
        notice_text = notice or "No explicit rights notice was exposed in the source metadata."
        return f"Source image metadata: {descriptor}. Source rights notice: {notice_text}"[:600]

    module.image_type_label = source_notice_label


def _install_engine_handoff(engine) -> None:
    """Remove the Engine's Alien World rights filter and preserve all evidence.

    The Engine performs deterministic editorial formatting only. It checks
    technical usability of a local asset, passes the evidence fields through,
    and leaves all rights decisions to the final Global Checker gate.
    """
    def read_alien_records(readonly_db: Any, brief: Any, now):
        try:
            readonly_db.execute("PRAGMA query_only = ON")
            meta = readonly_db.execute(
                "SELECT value FROM publisher_meta WHERE key='view_id'"
            ).fetchone()
            if not meta or engine.text(meta[0]) != brief.view_id:
                raise engine.EditorialEngineError(
                    "The database handle is not scoped to the requested view."
                )
            start_ts = brief.coverage_start.timestamp()
            end_ts = (
                brief.coverage_end.timestamp()
                if brief.window_mode == "calendar-month"
                else (now + timedelta(hours=2)).timestamp()
            )
            rows = readonly_db.execute(
                """SELECT story_id, title, url, summary, source_name, source_url,
                          published_at, retrieved_at, image_url, image_local_path,
                          image_caption, image_credit, image_source_url,
                          image_rights_status, image_rights_note
                   FROM stories WHERE published_at >= ? AND published_at < ?
                   ORDER BY published_at DESC LIMIT 500""",
                (start_ts, end_ts),
            ).fetchall()
        except engine.EditorialEngineError:
            raise
        except Exception as exc:
            raise engine.EditorialEngineError(
                f"Could not read the Publisher database: {exc}"
            ) from exc

        records: list[dict[str, Any]] = []
        seen: set[str] = set()
        for row in rows:
            item = dict(row)
            url = engine.text(item.get("url"), 700)
            title = engine.text(item.get("title"), 240)
            published = engine.parse_timestamp(item.get("published_at"))
            if not title or not engine.safe_https_url(url) or not published or url in seen:
                continue
            seen.add(url)
            item["publishedAt"] = engine.utc_iso(published)
            item["publishedDate"] = published.strftime("%d %b %Y")
            item["summary"] = engine.text(item.get("summary"), 12000)
            item["editorialSummary"] = engine._editorial_summary(item)
            item["editorialImageCredit"] = (
                engine._apod_image_credit(item)
                or engine.text(item.get("image_credit"), 200)
            )
            item["id"] = engine.text(item.get("story_id"), 64)

            # This is a transport/file-integrity check only. No status, licence,
            # credit, caption, source-association or copyright decision is made
            # here; those are checked by the Global Checker after formatting.
            local_path = item.get("image_local_path")
            image_ok = bool(
                engine.safe_https_url(item.get("image_url"))
                and local_path
                and Path(str(local_path)).is_file()
            )
            if not image_ok:
                for key in (
                    "image_url", "image_local_path", "image_caption", "image_credit",
                    "image_source_url", "image_rights_status", "image_rights_note",
                ):
                    item[key] = None
            records.append(item)
        return records[:brief.maximum_stories]

    def build_alien_feed(brief, stories, now):
        feed = {
            "schemaVersion": 1,
            "viewId": brief.view_id,
            "publisherId": brief.publisher_id,
            "generatedAt": engine.utc_iso(now),
            "windowHours": brief.issue_window_hours,
            "storyCount": len(stories),
            "stories": [],
        }
        for story in stories:
            image_url = story.get("image_url")
            local_path = story.get("image_local_path")
            # Keep the candidate and its unchanged evidence together. The final
            # Checker decides whether the image can be published.
            media_ok = bool(
                engine.safe_https_url(image_url)
                and local_path
                and Path(str(local_path)).is_file()
            )
            feed["stories"].append({
                "id": story["id"],
                "title": story["title"],
                "summary": story.get("summary", ""),
                "url": story["url"],
                "sourceName": story.get("source_name", "Original source"),
                "sourceUrl": story.get("source_url", ""),
                "publishedAt": story["publishedAt"],
                "imageUrl": image_url if media_ok else None,
                "imageCredit": story.get("image_credit") if media_ok else None,
                "imageSourceUrl": story.get("image_source_url") if media_ok else None,
                "imageCaption": story.get("image_caption") if media_ok else None,
                "imageRightsNote": story.get("image_rights_note") if media_ok else None,
            })
        return feed

    engine.read_view_records = read_alien_records
    engine.build_live_feed = build_alien_feed


def run_pipeline_tests() -> None:
    """Run the small deterministic tests for this Alien World adapter."""
    test_path = CHECKER_DIR / "tests" / "test_alien_world_pipeline.py"
    result = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", str(test_path.parent),
         "-p", test_path.name, "-v"],
        cwd=ROOT, check=False,
    )
    if result.returncode != 0:
        raise checker.GlobalCheckerError("Alien World single-Checker pipeline tests failed.")


def run_collector() -> int:
    run_pipeline_tests()
    module = _load_module("live_earth_alien_collector_single_checker", ALIEN_COLLECTOR)
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    _install_collector_checker(module, profile)

    registry = checker.load_registry()
    permitted, blocked = filter_sources_for_registry(
        "alien-world", profile.get("sources", []), registry
    )
    for source_name in blocked:
        print(
            f"GLOBAL CHECKER SOURCE HOLD [RED/UNKNOWN]: {source_name}",
            file=sys.stderr,
        )
    profile["sources"] = permitted

    with tempfile.TemporaryDirectory(prefix="live-earth-global-checker-alien-profile-") as temp_dir:
        staged_profile = Path(temp_dir) / "alien-world-profile.json"
        staged_profile.write_text(json.dumps(profile, ensure_ascii=False), encoding="utf-8")
        original_profile_path = module.PROFILE_PATH
        module.PROFILE_PATH = staged_profile
        try:
            return int(module.main())
        finally:
            module.PROFILE_PATH = original_profile_path


def run_publisher() -> int:
    run_pipeline_tests()
    # Patch the shared Engine before the Publisher imports and invokes run_engine.
    sys.path.insert(0, str(ENGINE_DIR))
    engine = importlib.import_module("universal_editorial_engine")
    _install_engine_handoff(engine)

    module = _load_module("live_earth_alien_publisher_single_checker", ALIEN_PUBLISHER)
    original_route = module.route_engine_outputs

    def checked_route(result):
        connection = module.read_only_connection()
        try:
            feed = result.get("feed") if isinstance(result, dict) else None
            if not isinstance(feed, dict):
                raise checker.GlobalCheckerError(
                    "Alien World Engine did not return a live feed to check."
                )
            result["feed"] = checker.gate_feed(
                feed, connection, "alien-world", minimum_stories=2
            )
        finally:
            connection.close()
        # Publisher owns the final atomic write, but cannot override the
        # Checker-approved payload or make another content-rights decision.
        return original_route(result)

    module.route_engine_outputs = checked_route
    old_argv = sys.argv[:]
    try:
        sys.argv = [str(ALIEN_PUBLISHER), "--mode", "live"]
        return int(module.main())
    finally:
        sys.argv = old_argv


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("collect", "publish"))
    parser.add_argument("--view", choices=("alien-world",), required=True)
    args = parser.parse_args()
    try:
        if args.phase == "collect":
            return run_collector()
        return run_publisher()
    except Exception as exc:
        print(json.dumps({
            "status": "global_checker_blocked",
            "viewId": "alien-world",
            "phase": args.phase,
            "error": str(exc),
            "lastGoodFeedMustBePreserved": True,
        }, indent=2), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

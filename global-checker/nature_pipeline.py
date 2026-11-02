#!/usr/bin/env python3
"""LIVE // EARTH — single-owner Nature pipeline.

Nature-specific runtime adapter matching the Alien World single-Checker design.
The existing Nature Collector, SQLite database, Editorial Engine and Publisher
remain the component owners. Rights decisions on the active path are delegated
to Global Checker; technical transport, decoding, integrity and atomic-write
checks remain in their owning components.

Pipeline:
  Collector -> Global Checker -> Nature SQLite -> Publisher
  -> Universal Editorial Engine -> Publisher -> Global Checker
  -> Publisher -> nature/published/live-feed.json

Nature's exact Wikimedia Commons file allowlist and attribution requirements
remain unchanged. No substitute or unrelated photographs are introduced.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import importlib
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from datetime import timedelta
from io import BytesIO
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CHECKER_DIR = ROOT / "global-checker"
ENGINE_DIR = ROOT / "editorial-engine"
NATURE_COLLECTOR = ROOT / "nature" / "collector" / "collector.py"
NATURE_PUBLISHER = ROOT / "nature" / "publisher" / "publisher.py"
PROFILE_PATH = ROOT / "nature" / "publisher" / "profile.json"

sys.path.insert(0, str(CHECKER_DIR))
import global_checker as checker  # noqa: E402
from run_pipeline import (  # noqa: E402
    CheckedConnection,
    _atomic_nature_feed_and_manifest,
    _clean_nature_assets,
    _load_module,
    check_nature_image_metadata,
    extract_commons_metadata_for_checker,
    filter_sources_for_registry,
)


def _technical_prepare_photo(module, item: dict[str, Any], profile: dict[str, Any], now):
    """Download and decode an already Checker-approved Commons candidate.

    This function deliberately does not compare creators or decide licences.
    Those are rights decisions owned by Global Checker. Host allowlists, bounded
    downloads, response MIME, image decoding, resizing, hashing and file-size
    checks remain technical safeguards in the Collector.
    """
    metadata = module.commons_metadata(item["fileTitle"])
    maximum_bytes = int(profile["imagePolicy"]["maximumImageBytes"])
    raw, final_url, content_type = module.bounded_get(
        metadata["imageUrl"], module.ALLOWED_MEDIA_HOSTS, maximum_bytes, timeout=30
    )
    if len(raw) > maximum_bytes:
        raise ValueError("Image exceeded the Nature media size budget.")
    response_mime = str(content_type or "").split(";", 1)[0].strip().lower()
    supported_mimes = {"image/jpeg", "image/png", "image/webp"}
    if response_mime not in supported_mimes:
        raise ValueError("Downloaded Commons response is not a supported raster image.")
    if not module.safe_https(final_url, module.ALLOWED_MEDIA_HOSTS):
        raise ValueError("Commons media redirect left the approved upload host.")

    digest = hashlib.sha256(raw).hexdigest()
    module.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    target = module.MEDIA_DIR / (digest + ".jpg")
    with module.Image.open(BytesIO(raw)) as source:
        source.verify()
    with module.Image.open(BytesIO(raw)) as source:
        photo = module.ImageOps.exif_transpose(source).convert("RGB")
        photo.thumbnail(
            (int(profile["imagePolicy"]["maximumImageWidth"]), 1600),
            module.Image.Resampling.LANCZOS,
        )
        photo.save(target, "JPEG", quality=80, optimize=True, progressive=True)
    if not target.is_file() or target.stat().st_size < 1000:
        raise ValueError("Prepared image is unexpectedly small.")

    # These strings are evidence/attribution carried to the Checker, not local
    # pass/fail rules. The Checker re-evaluates the prepared output on DB write.
    license_name = str(metadata.get("licenseName") or item.get("expectedLicenseUrl") or "")
    creator = str(metadata.get("creator") or "")
    credit = f"{creator} · {license_name} · {metadata['descriptionUrl']}"
    caption = module.clean(
        str(item.get("contextCaption") or "") + " " + str(item.get("usageNote") or ""), 500
    )
    return {
        **metadata,
        "localPath": str(target.relative_to(module.ROOT)),
        "publicPath": "nature/published/assets/" + target.name,
        "publishedImageUrl": (
            "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/"
            "nature/published/assets/" + target.name
        ),
        "credit": credit,
        "caption": caption,
        "usageNote": str(item.get("usageNote") or ""),
        "accessedAt": now.isoformat(),
        "modificationNote": (
            "Wikimedia thumbnail/display copy resized to max 1600px and JPEG quality 80; "
            "factual content unchanged. Attribution retained."
        ),
        # A compatibility marker only. It is never used as the rights decision.
        "rightsStatus": module.IMAGE_STATUS,
    }


def _install_collector_checker(module, profile: dict[str, Any]) -> None:
    """Route text and Commons image rights decisions to Global Checker only."""
    original_db_connect = module.db_connect

    def open_checked_nature_db():
        wrapped = CheckedConnection(original_db_connect(), "nature", profile)
        module._global_checker_connection = wrapped
        return wrapped

    module.db_connect = open_checked_nature_db

    original_matches = module.matches_category

    def track_nature_story_match(story, category):
        matched = original_matches(story, category)
        if matched:
            current = dict(story)
            active = getattr(module, "_global_checker_connection", None)
            story_id = current.get("story_id") or current.get("id")
            if active is not None and story_id:
                provenance = active.raw.execute(
                    "SELECT url,source_name,source_url FROM stories "
                    "WHERE story_id=? AND view_id='nature'",
                    (story_id,),
                ).fetchone()
                if provenance:
                    current.update(dict(provenance))
            module._global_checker_current_story = current
        return matched

    def checked_commons_metadata(file_title):
        metadata = extract_commons_metadata_for_checker(module, file_title)
        current_story = getattr(module, "_global_checker_current_story", {})
        allowlist_item = next(
            (item for item in profile.get("imageAllowlist", [])
             if item.get("fileTitle") == file_title),
            {},
        )
        active = getattr(module, "_global_checker_connection", None)
        decision = check_nature_image_metadata(
            active.raw if active is not None else None,
            current_story,
            allowlist_item,
            metadata,
        )
        if not decision.get("allowed"):
            reasons = "; ".join(decision.get("reasons", []))
            print(
                f"GLOBAL CHECKER IMAGE HOLD [{decision.get('verdict', 'UNKNOWN')}]: "
                f"{file_title} — {reasons}",
                file=sys.stderr,
            )
            raise ValueError("Global Checker held this Commons image candidate.")
        return metadata

    module.matches_category = track_nature_story_match
    module.commons_metadata = checked_commons_metadata
    # Remove the Collector's duplicate creator/licence pass/fail checks. The
    # Checker above decides first; this replacement performs technical work only.
    module.prepare_photo = lambda item, profile_arg, now: _technical_prepare_photo(
        module, item, profile_arg, now
    )


def _run_contract_tests() -> None:
    """Run the existing Nature contracts and this single-owner adapter tests."""
    commands = [
        [sys.executable, "-m", "unittest", "discover", "-s", str(ROOT / "nature" / "tests"),
         "-p", "test_*.py", "-v"],
        [sys.executable, "-m", "unittest", "discover", "-s", str(CHECKER_DIR / "tests"),
         "-p", "test_nature_pipeline.py", "-v"],
    ]
    for command in commands:
        result = subprocess.run(command, cwd=ROOT, check=False)
        if result.returncode:
            raise checker.GlobalCheckerError("Nature single-Checker pipeline tests failed.")


def _collector_profile(profile: dict[str, Any]) -> dict[str, Any]:
    """Make allowlisted photo matching cover every configured adaptive stage.

    This changes only the temporary Collector profile used for image matching;
    the saved 48-hour starting window, Publisher expansion stages and 32-day
    retention settings remain unchanged.
    """
    staged = copy.deepcopy(profile)
    publication = staged.get("publication", {})
    adaptive = publication.get("adaptiveLookback", {})
    stages = [int(value) for value in adaptive.get("expansionHours", [])]
    retention_hours = int(staged.get("database", {}).get("retentionDays", 32)) * 24
    if not stages or stages != sorted(set(stages)) or stages[-1] > retention_hours:
        raise checker.GlobalCheckerError("Nature adaptive image-matching window is invalid.")
    publication["issueWindowHours"] = stages[-1]
    return staged


def run_collector() -> int:
    _run_contract_tests()
    module = _load_module("live_earth_nature_collector_single_checker", NATURE_COLLECTOR)
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    _install_collector_checker(module, profile)

    registry = checker.load_registry()
    permitted, blocked = filter_sources_for_registry("nature", profile.get("sources", []), registry)
    for source_name in blocked:
        print(
            f"GLOBAL CHECKER SOURCE HOLD [RED/UNKNOWN]: {source_name}",
            file=sys.stderr,
        )
    profile["sources"] = permitted
    collector_profile = _collector_profile(profile)

    with tempfile.TemporaryDirectory(prefix="live-earth-global-checker-nature-profile-") as temp_dir:
        staged_profile = Path(temp_dir) / "nature-profile.json"
        staged_profile.write_text(json.dumps(collector_profile, ensure_ascii=False), encoding="utf-8")
        original_profile_path = module.PROFILE_PATH
        module.PROFILE_PATH = staged_profile
        try:
            return int(module.collect())
        finally:
            module.PROFILE_PATH = original_profile_path


class _NatureReadOnlyProxy:
    """Read-only DB facade that exposes raw image evidence to the final Checker."""
    def __init__(self, connection):
        self._connection = connection

    def execute(self, sql, parameters=()):
        normalized = " ".join(str(sql).lower().split())
        if "from nature_image_rights r join stories s" in normalized:
            # The legacy Publisher filtered rights/creator/licence evidence here.
            # Return the bounded raw evidence instead; Global Checker evaluates it
            # after the Engine builds the final publication payload.
            query = """SELECT r.story_id,r.file_title,r.source_page,r.creator,r.credit,
                r.license_name,r.license_url,r.caption,r.usage_note,r.modification_note,r.local_path,
                r.public_path,r.image_url,r.rights_status
                FROM nature_image_rights r JOIN stories s ON s.story_id=r.story_id
                WHERE s.view_id='nature' AND s.published_at>=? AND s.published_at<?"""
            return self._connection.execute(query, tuple(parameters[:2]))
        return self._connection.execute(sql, parameters)

    def close(self):
        return self._connection.close()

    def __getattr__(self, name):
        return getattr(self._connection, name)


class _BufferedRows:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


def _technical_image_record(row, record, root: Path) -> bool:
    """Check only file/path/url integrity and exact story-to-record association."""
    if not record:
        return False
    local_path = str(row["image_local_path"] or "")
    image_url = str(row["image_url"] or "")
    if not local_path or local_path != str(record.get("local_path") or ""):
        return False
    if image_url != str(record.get("image_url") or ""):
        return False
    try:
        from urllib.parse import urlsplit
        parsed = urlsplit(image_url)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            return False
    except ValueError:
        return False
    return (root / local_path).is_file()


def _install_engine_handoff(engine) -> None:
    """Make the Engine a deterministic formatter/pass-through, not a rights gate."""
    def read_nature_records(readonly_db: Any, brief: Any, now):
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
                """SELECT story_id,title,url,summary,source_name,source_url,
                          published_at,retrieved_at,image_url,image_local_path,image_caption,
                          image_credit,image_source_url,image_rights_status,image_rights_note
                   FROM stories WHERE published_at>=? AND published_at<?
                   ORDER BY published_at DESC LIMIT 500""",
                (start_ts, end_ts),
            ).fetchall()
        except engine.EditorialEngineError:
            raise
        except Exception as exc:
            raise engine.EditorialEngineError(
                f"Could not read the Nature Publisher database: {exc}"
            ) from exc

        records = []
        seen = set()
        for row in rows:
            item = dict(row)
            url = engine.text(item.get("url"), 1000)
            title = engine.text(item.get("title"), 240)
            published = engine.parse_timestamp(item.get("published_at"))
            if not title or not engine.safe_https_url(url) or not published or url in seen:
                continue
            seen.add(url)
            item["publishedAt"] = engine.utc_iso(published)
            item["publishedDate"] = published.strftime("%d %b %Y")
            item["summary"] = engine.text(item.get("summary"), 12000)
            item["editorialSummary"] = engine._editorial_summary(item)
            item["editorialImageCredit"] = engine.text(item.get("image_credit"), 500)
            item["id"] = engine.text(item.get("story_id"), 64)

            # No local licence, creator, credit, caption or status decision here.
            # The final Checker sees those fields unchanged in the feed. Only the
            # technical existence and HTTPS format of the prepared asset are tested.
            image_ok = bool(
                engine.safe_https_url(item.get("image_url"))
                and item.get("image_local_path")
                and Path(str(item.get("image_local_path"))).is_file()
            )
            if not image_ok:
                for key in (
                    "image_url", "image_local_path", "image_caption", "image_credit",
                    "image_source_url", "image_rights_status", "image_rights_note",
                ):
                    item[key] = None
            records.append(item)
        return records[:brief.maximum_stories]

    def build_nature_feed(brief, stories, now):
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
            media_ok = bool(
                engine.safe_https_url(image_url)
                and local_path
                and Path(str(local_path)).is_file()
            )
            feed["stories"].append({
                "id": story["id"],
                "title": story["title"],
                # Keep the source-approved text byte-for-byte equivalent after
                # Checker normalization; no second summary or rights decision.
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

    engine.read_view_records = read_nature_records
    engine.build_live_feed = build_nature_feed


def _install_readonly_publisher(module) -> None:
    """Bypass Publisher-side rights predicates while retaining media integrity checks."""
    original_open_readonly = module.open_readonly

    def open_readonly_evidence():
        return _NatureReadOnlyProxy(original_open_readonly())

    module.open_readonly = open_readonly_evidence

    class NatureEngineReadOnlyConnection:
        def __init__(self, connection, verified_images, maximum_stories,
                     now=None, lookback_hours=None):
            self._connection = connection
            self._verified_images = verified_images
            self._maximum_stories = maximum_stories
            self._now = now
            self._lookback_hours = lookback_hours
            self.story_selection_applied = False
            self.selected_documentary_images = 0

        def execute(self, sql, parameters=()):
            normalized = " ".join(str(sql).lower().split())
            if "from stories where published_at" not in normalized:
                return self._connection.execute(sql, parameters)
            if self._now is not None and self._lookback_hours is not None:
                params = (
                    (self._now - timedelta(hours=self._lookback_hours)).timestamp(),
                    (self._now + timedelta(hours=2)).timestamp(),
                )
            else:
                params = parameters
            rows = self._connection.execute(sql, params).fetchall()
            rows = module.deduplicate_story_rows(rows)
            preferred = [
                row for row in rows
                if _technical_image_record(
                    row, self._verified_images.get(str(row["story_id"])), module.ROOT
                )
            ]
            selected = preferred[:self._maximum_stories]
            selected_ids = {str(row["story_id"]) for row in selected}
            for row in rows:
                if len(selected) >= self._maximum_stories:
                    break
                story_id = str(row["story_id"])
                if story_id not in selected_ids:
                    selected.append(row)
                    selected_ids.add(story_id)
            selected.sort(key=lambda row: float(row["published_at"] or 0), reverse=True)
            self.story_selection_applied = True
            self.selected_documentary_images = sum(
                1 for row in selected
                if _technical_image_record(
                    row, self._verified_images.get(str(row["story_id"])), module.ROOT
                )
            )
            return _BufferedRows(selected)

    module.NatureEngineReadOnlyConnection = NatureEngineReadOnlyConnection


def run_publisher() -> int:
    _run_contract_tests()
    sys.path.insert(0, str(ENGINE_DIR))
    engine = importlib.import_module("universal_editorial_engine")
    _install_engine_handoff(engine)

    module = _load_module("live_earth_nature_publisher_single_checker", NATURE_PUBLISHER)
    _install_readonly_publisher(module)
    original_atomic_json = module.atomic_json
    pending_manifest: dict[str, Any] | None = None

    def checked_atomic_json(output_path, payload):
        nonlocal pending_manifest
        target = Path(output_path)
        if target.name == "image-rights.json":
            pending_manifest = dict(payload)
            return None
        if target.name == "live-feed.json":
            database = module.open_readonly()
            try:
                approved = checker.gate_feed(payload, database, "nature", minimum_stories=2)
            finally:
                database.close()
            # Mutate the Publisher's in-memory feed too, so its later cleanup
            # uses only Checker-approved assets rather than pre-gate candidates.
            payload.clear()
            payload.update(approved)
            manifest = pending_manifest or {
                "schemaVersion": 1, "viewId": "nature",
                "generatedAt": approved.get("generatedAt", ""), "images": [],
            }
            _clean_nature_assets(approved, module.OUTPUT_DIR, manifest, prune_files=False)
            manifest_path = module.OUTPUT_DIR / "assets" / "image-rights.json"
            _atomic_nature_feed_and_manifest(manifest_path, manifest, target, approved)
            # Remove assets stripped by the final Checker decision. The matched
            # feed/manifest pair is already committed, so cleanup cannot publish
            # an image that the Checker rejected.
            approved_names = {
                Path(str(story["imageUrl"]).split("?")[0]).name
                for story in approved.get("stories", []) if story.get("imageUrl")
            }
            assets_dir = module.OUTPUT_DIR / "assets"
            for old_asset in assets_dir.glob("*.jpg"):
                if old_asset.name not in approved_names:
                    old_asset.unlink(missing_ok=True)
            return None
        return original_atomic_json(output_path, payload)

    module.atomic_json = checked_atomic_json
    module.publish()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("collect", "publish"))
    parser.add_argument("--view", choices=("nature",), required=True)
    args = parser.parse_args()
    try:
        if args.phase == "collect":
            return run_collector()
        return run_publisher()
    except Exception as exc:
        print(json.dumps({
            "status": "global_checker_blocked",
            "viewId": "nature",
            "phase": args.phase,
            "error": str(exc),
            "lastGoodFeedMustBePreserved": True,
        }, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

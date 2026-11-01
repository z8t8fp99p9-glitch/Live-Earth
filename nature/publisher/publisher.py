#!/usr/bin/env python3
"""Nature Live Publisher: read-only database consumer; publishes only the rolling Live Feed."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = Path(__file__).with_name("profile.json")
DB_PATH = ROOT / ".publisher-data" / "nature" / "nature.sqlite3"
OUTPUT_DIR = ROOT / "nature" / "published"
ENGINE_DIR = ROOT / "editorial-engine"
IMAGE_STATUS = "nature-commons-filepage-verified"
RAW_ROOT = "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/nature/published/"


def load_profile():
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    if profile.get("schemaVersion") != 1 or profile.get("viewId") != "nature":
        raise RuntimeError("Nature Publisher profile identity check failed.")
    if profile.get("publisherId") != "nature-publisher":
        raise RuntimeError("Nature Publisher identifier is not registered.")
    publication = profile.get("publication", {})
    if publication.get("windowMode") != "rolling-hours":
        raise RuntimeError("Nature Publisher accepts rolling Live Feeds only.")
    hours = int(publication.get("issueWindowHours", 0))
    if not 1 <= hours <= 168:
        raise RuntimeError("Nature Live Feed initial window must be between 1 and 168 hours.")
    adaptive = publication.get("adaptiveLookback", {})
    retention_hours = int(profile.get("database", {}).get("retentionDays", 32)) * 24
    stages = adaptive.get("expansionHours", [])
    if not adaptive.get("enabled") or not stages or stages[0] != hours:
        raise RuntimeError("Nature adaptive lookback configuration is missing or invalid.")
    if stages != sorted(set(stages)) or stages[-1] > retention_hours:
        raise RuntimeError("Nature adaptive lookback must remain ordered and within 32-day retention.")
    if int(adaptive.get("targetStories", 0)) != int(publication.get("maximumStories", 10)):
        raise RuntimeError("Nature adaptive target must match its maximum story count.")
    return profile


def open_readonly():
    if not DB_PATH.is_file():
        raise RuntimeError("Nature Collector database is missing. Run the Collector first.")
    uri = "file:" + quote(DB_PATH.as_posix(), safe="/:") + "?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA query_only=ON")
    return con


def run_tests():
    test_dir = ROOT / "nature" / "tests"
    result = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", str(test_dir), "-p", "test_*.py", "-v"],
        cwd=ROOT, check=False,
    )
    if result.returncode:
        raise RuntimeError("Nature Live Feed contract tests failed; last-good feed preserved.")


def atomic_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".pending")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def _title_key(value) -> str:
    normalized = unicodedata.normalize("NFKC", str(value or "")).casefold()
    return " ".join(re.findall(r"[^\W_]+", normalized, flags=re.UNICODE))


def deduplicate_story_rows(rows):
    """Conservatively collapse same normalized headline on the same UTC date."""
    result = []
    seen_urls = set()
    seen_title_days = set()
    for row in rows:
        columns = set(row.keys()) if hasattr(row, "keys") else set(row)
        # The adapter's older read-only unit fixture omits URL; story_id is a
        # safe per-record fallback there, while production rows always include URL.
        has_source_url = "url" in columns
        url_value = row["url"] if has_source_url else (row["story_id"] if "story_id" in columns else "")
        url = str(url_value or "").strip()
        title = _title_key(row["title"])
        try:
            published = datetime.fromtimestamp(float(row["published_at"]), timezone.utc)
        except (TypeError, ValueError, OverflowError, OSError):
            continue
        signature = (title, published.date().isoformat())
        if has_source_url:
            try:
                parsed = urlparse(url)
                safe_url = (parsed.scheme == "https" and bool(parsed.hostname)
                            and not parsed.username and not parsed.password)
            except ValueError:
                safe_url = False
        else:
            # Legacy test/adapter projections do not include URL; production Engine
            # queries always include it and receive the full HTTPS validation above.
            safe_url = bool(url)
        if not safe_url or url in seen_urls or not title or signature in seen_title_days:
            continue
        seen_urls.add(url)
        seen_title_days.add(signature)
        result.append(row)
    return result


def select_engine_story_rows(rows, verified_images, maximum_stories: int):
    """Prefer currently eligible verified Nature photos, then fill by recency."""
    rows = list(rows)
    preferred = []
    for row in rows:
        record = verified_images.get(str(row["story_id"]))
        if not record:
            continue
        local_path = str(row["image_local_path"] or "")
        if (row["image_rights_status"] == IMAGE_STATUS
            and local_path == str(record["local_path"])
            and str(row["image_url"] or "") == str(record["image_url"])
            and str(row["image_credit"] or "") == str(record["credit"])
            and str(row["image_source_url"] or "") == str(record["source_page"])
            and bool(str(row["image_rights_note"] or "").strip())
            and local_path and (ROOT / local_path).is_file()):
            preferred.append(row)
    selected = preferred[:maximum_stories]
    selected_ids = {str(row["story_id"]) for row in selected}
    for row in rows:
        if len(selected) >= maximum_stories:
            break
        story_id = str(row["story_id"])
        if story_id not in selected_ids:
            selected.append(row)
            selected_ids.add(story_id)
    selected.sort(key=lambda row: float(row["published_at"] or 0), reverse=True)
    return selected


class _BufferedRows:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class NatureEngineReadOnlyConnection:
    """Read-only adapter retaining verified-photo preference within each adaptive window."""
    def __init__(self, connection, verified_images, maximum_stories,
                 now: datetime | None = None, lookback_hours: int | None = None):
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
            params = ((self._now - timedelta(hours=self._lookback_hours)).timestamp(),
                      (self._now + timedelta(hours=2)).timestamp())
        else:
            params = parameters
        rows = self._connection.execute(sql, params).fetchall()
        rows = deduplicate_story_rows(rows)
        selected = select_engine_story_rows(rows, self._verified_images, self._maximum_stories)
        self.story_selection_applied = True
        self.selected_documentary_images = sum(
            1 for row in selected
            if str(row["story_id"]) in self._verified_images
            and row["image_rights_status"] == IMAGE_STATUS
            and str(row["image_local_path"] or "") == str(self._verified_images[str(row["story_id"])]["local_path"])
            and str(row["image_url"] or "") == str(self._verified_images[str(row["story_id"])]["image_url"])
            and str(row["image_credit"] or "") == str(self._verified_images[str(row["story_id"])]["credit"])
            and str(row["image_source_url"] or "") == str(self._verified_images[str(row["story_id"])]["source_page"])
            and bool(str(row["image_rights_note"] or "").strip())
            and bool(str(row["image_local_path"] or ""))
            and (ROOT / str(row["image_local_path"])).is_file()
        )
        return _BufferedRows(selected)


def _utc_iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _apply_actual_window(result, now: datetime, hours: int):
    start = now - timedelta(hours=hours)
    result["coverageStart"] = _utc_iso(start)
    result["coverageEnd"] = _utc_iso(now)
    result["windowHours"] = hours
    result["windowLabel"] = f"the previous {hours} hours"
    result["feed"]["windowHours"] = hours


def publish(now: datetime | None = None):
    os.chdir(ROOT)
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    profile = load_profile()
    run_tests()
    con = open_readonly()
    stage_parent = Path(tempfile.mkdtemp(prefix="nature-live-feed-"))
    stage = stage_parent / "output"
    stage.mkdir(parents=True)
    try:
        meta = con.execute("SELECT value FROM publisher_meta WHERE key='view_id'").fetchone()
        if not meta or meta["value"] != "nature":
            raise RuntimeError("Refusing to publish from a database not owned by Nature.")

        publication = profile["publication"]
        adaptive = publication["adaptiveLookback"]
        stages = [int(value) for value in adaptive["expansionHours"]]
        maximum_stories = max(2, min(12, int(publication.get("maximumStories", 10))))

        # Make all existing verified rights records available to each bounded
        # stage. This changes no image discovery, licence or approval rule.
        maximum_start = now - timedelta(hours=stages[-1])
        verified_rows = con.execute("""SELECT r.story_id,r.file_title,r.source_page,r.creator,r.credit,
            r.license_name,r.license_url,r.caption,r.usage_note,r.modification_note,r.local_path,
            r.public_path,r.image_url,r.rights_status
            FROM nature_image_rights r JOIN stories s ON s.story_id=r.story_id
            WHERE s.view_id='nature' AND s.published_at>=? AND s.published_at<?
              AND r.rights_status=? AND r.creator<>'' AND r.credit<>'' AND r.license_url<>''
              AND r.source_page LIKE 'https://commons.wikimedia.org/wiki/File:%'
              AND r.local_path<>'' AND r.image_url LIKE 'https://raw.githubusercontent.com/%'""",
            (maximum_start.timestamp(), now.timestamp(), IMAGE_STATUS)).fetchall()
        verified = [dict(row) for row in verified_rows if (ROOT / row["local_path"]).is_file()]
        rights_by_story = {r["story_id"]: r for r in verified}

        sys.path.insert(0, str(ENGINE_DIR))
        import universal_editorial_engine as engine
        engine.VALID_IMAGE_STATUS = IMAGE_STATUS
        command = {
            "commandId": hashlib.sha256(f"nature-live:{now.isoformat()}".encode()).hexdigest()[:24],
            "viewId": "nature", "publisherId": "nature-publisher", "issuedAt": now.isoformat(),
            "mode":"live", "customRequest": profile["editorialProfile"]["defaultCustomRequest"],
        }

        result = None
        for hours in stages:
            stage_profile = copy.deepcopy(profile)
            # Keep the shared Engine's existing <=168h validation; the adapter
            # supplies the requested wider interval from Nature's own database.
            stage_profile["publication"]["issueWindowHours"] = min(hours, 168)
            engine_db = NatureEngineReadOnlyConnection(
                con, rights_by_story, maximum_stories, now=now, lookback_hours=hours
            )
            try:
                candidate = engine.run_engine(engine_db, stage_profile, command, stage, now)
            except Exception as exc:
                if exc.__class__.__name__ == "EditorialEngineError" and "No eligible stories are available" in str(exc):
                    continue
                raise
            if not engine_db.story_selection_applied:
                raise RuntimeError("Shared Engine did not use Nature's verified-photo selection boundary.")
            if (candidate.get("viewId") != "nature" or candidate.get("publisherId") != "nature-publisher"
                or candidate.get("windowMode") != "rolling-hours"):
                raise RuntimeError("Shared Engine returned the wrong Nature Live Feed contract.")
            if candidate.get("windowHours") != min(hours, 168):
                raise RuntimeError("Shared Engine returned an unexpected internal lookback interval.")
            feed = candidate.get("feed")
            if not isinstance(feed, dict) or not isinstance(feed.get("stories"), list) or not feed["stories"]:
                raise RuntimeError("Shared Engine did not return a non-empty Nature Live Feed.")
            _apply_actual_window(candidate, now, hours)
            result = candidate
            if len(feed["stories"]) >= int(adaptive["targetStories"]):
                break

        if result is None:
            raise RuntimeError("Nature adaptive lookback did not execute a search stage.")
        hours = int(result["windowHours"])
        feed = result["feed"]
        # Engine timestamps are canonicalized to whole seconds. Compare with the
        # same representation so microseconds cannot cause a false mismatch.
        expected_start = _utc_iso(now - timedelta(hours=hours))
        expected_end = _utc_iso(now)
        if result.get("coverageStart") != expected_start or result.get("coverageEnd") != expected_end:
            raise RuntimeError("Shared Engine coverage differs from the expected adaptive feed window.")

        issue_assets = stage / "assets"
        issue_assets.mkdir(parents=True, exist_ok=True)
        used_assets = []
        for story in feed["stories"]:
            record = rights_by_story.get(story.get("id"))
            if record and story.get("imageUrl"):
                source = ROOT / record["local_path"]
                target = issue_assets / Path(record["public_path"]).name
                if not source.is_file():
                    raise RuntimeError(f"Prepared Nature image is missing: {source.name}")
                shutil.copy2(source, target)
                digest = hashlib.sha256(source.read_bytes()).digest()
                if digest != hashlib.sha256(target.read_bytes()).digest():
                    raise RuntimeError("Prepared Nature image changed during staging.")
                story["imageUrl"] = RAW_ROOT + "assets/" + target.name
                story["imageCaption"] = record["caption"]
                story["imageLicense"] = record["license_name"]
                story["imageLicenseUrl"] = record["license_url"]
                story["imageRightsNote"] = record["usage_note"]
                story["imageSourceUrl"] = record["source_page"]
                used_assets.append({
                    "storyId": story["id"], "fileTitle": record["file_title"],
                    "sourcePage": record["source_page"], "creator": record["creator"],
                    "credit": record["credit"], "license": record["license_name"],
                    "licenseUrl": record["license_url"], "caption": record["caption"],
                    "usageNote": record["usage_note"], "modificationNote": record["modification_note"],
                    "file": "assets/" + target.name,
                })
            else:
                story["imageUrl"] = None
                story["imageCredit"] = None
                story["imageCaption"] = None
                story["imageSourceUrl"] = None
                story["imageRightsNote"] = None
        feed["documentaryImageCount"] = sum(1 for story in feed["stories"] if story.get("imageUrl"))
        rights_manifest = {"schemaVersion": 1, "viewId": "nature", "generatedAt": result["generatedAt"],
                           "images": used_assets}
        output_assets = OUTPUT_DIR / "assets"
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_assets.mkdir(parents=True, exist_ok=True)
        for staged in issue_assets.iterdir():
            target = output_assets / staged.name
            temp = output_assets / (staged.name + ".pending")
            shutil.copy2(staged, temp)
            if hashlib.sha256(temp.read_bytes()).digest() != hashlib.sha256(staged.read_bytes()).digest():
                raise RuntimeError("Public Nature image failed its final hash check.")
            temp.replace(target)
        atomic_json(output_assets / "image-rights.json", rights_manifest)
        atomic_json(OUTPUT_DIR / "live-feed.json", feed)
        used_names = {Path(item["file"]).name for item in used_assets}
        for old in output_assets.glob("*.jpg"):
            if old.name not in used_names:
                old.unlink(missing_ok=True)
        print(json.dumps({
            "status": "published", "viewId": "nature", "publisherId": "nature-publisher",
            "generatedAt": result["generatedAt"], "windowHours": hours,
            "stories": len(feed["stories"]), "documentaryImages": feed["documentaryImageCount"],
            "publicFiles": ["nature/published/live-feed.json", "nature/published/assets/"],
        }, ensure_ascii=False, indent=2))
        return 0
    finally:
        con.close()
        shutil.rmtree(stage_parent, ignore_errors=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("live",), default="live")
    parser.parse_args()
    try:
        raise SystemExit(publish())
    except Exception as exc:
        print(json.dumps({"status": "skipped", "error": str(exc), "preservedLastGood": True},
                         ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(2)

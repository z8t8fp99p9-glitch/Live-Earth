#!/usr/bin/env python3
"""Run an existing LIVE // EARTH feed Collector/Publisher through Global Checker.

The original view-specific modules remain the owners of their collection and
publication logic. This adapter adds a pre-persistence text gate, item-level
image gate, decision evidence in the view's existing DB, and a final feed gate.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CHECKER_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CHECKER_DIR))
import global_checker as checker


class _NoopCursor:
    rowcount = 0
    lastrowid = None

    def fetchone(self):
        return None

    def fetchall(self):
        return []


class CheckedConnection:
    """SQLite connection proxy applying rights checks before writes."""
    def __init__(self, raw: sqlite3.Connection, view_id: str, profile: dict[str, Any] | None = None):
        self.raw = raw
        self.view_id = view_id
        self.profile = profile or {}
        self.raw.row_factory = sqlite3.Row
        checker.ensure_decision_table(self.raw)

    def __getattr__(self, name):
        return getattr(self.raw, name)

    def execute(self, sql, parameters=()):
        normalized = " ".join(str(sql).lower().split())
        params = tuple(parameters or ())

        if normalized.startswith("insert into stories(") or normalized.startswith("insert into stories "):
            item = self._story_from_insert(params)
            decision = checker.evaluate_text(self.view_id, item)
            checker.record_decision(self.raw, decision)
            if not decision.get("allowed"):
                print(f"GLOBAL CHECKER HOLD [{decision['verdict']}]: {item.get('url','')}", file=sys.stderr)
                return _NoopCursor()
            if not decision.get("summaryAllowed", False):
                mutable = list(params)
                summary_index = 3 if self.view_id == "nature" else 4
                if len(mutable) > summary_index:
                    mutable[summary_index] = ""
                params = tuple(mutable)
            return self.raw.execute(sql, params)

        if self.view_id == "alien-world" and normalized.startswith("update stories set image_url=?"):
            return self._guard_alien_image(sql, params)

        if self.view_id == "nature" and normalized.startswith("insert or replace into nature_image_rights"):
            return self._guard_nature_image(sql, params)

        return self.raw.execute(sql, parameters)

    def _story_from_insert(self, params: tuple[Any, ...]) -> dict[str, Any]:
        if self.view_id == "nature":
            if len(params) < 7:
                raise checker.GlobalCheckerError("Nature story insert did not match the registered schema.")
            story_id, title, url, summary, source_name, source_url = params[:6]
        else:
            if len(params) < 7:
                raise checker.GlobalCheckerError("Alien World story insert did not match the registered schema.")
            story_id, _view, url, title, summary, source_name, source_url = params[:7]
        return {"id": str(story_id), "title": str(title), "url": str(url),
                "summary": str(summary or ""), "sourceName": str(source_name),
                "sourceUrl": str(source_url)}

    def _guard_alien_image(self, sql: str, params: tuple[Any, ...]):
        if len(params) < 9:
            raise checker.GlobalCheckerError("Alien World image update did not match the registered schema.")
        image_url, local_path, caption, credit, source_url, rights_status, rights_note, _checked, story_id = params[:9]
        row = self.raw.execute("SELECT url FROM stories WHERE story_id=? AND view_id=?",
                               (story_id, "alien-world")).fetchone()
        article_url = str(row["url"]) if row else ""
        image = {"url": image_url, "sourcePage": source_url, "caption": caption,
                 "credit": credit, "rightsNotice": rights_note}
        decision = checker.evaluate_image("alien-world", str(story_id), image,
                                          article_url=article_url, source_name="NASA")
        checker.record_decision(self.raw, decision)
        if not decision.get("allowed"):
            if local_path:
                Path(str(local_path)).unlink(missing_ok=True)
            self.raw.execute("""UPDATE stories SET image_url=NULL,image_local_path=NULL,image_caption=NULL,
                image_credit=NULL,image_source_url=NULL,image_rights_status=NULL,image_rights_note=NULL,
                image_checked_at=NULL WHERE story_id=?""", (story_id,))
            print(f"GLOBAL CHECKER IMAGE HOLD [{decision['verdict']}]: {article_url}", file=sys.stderr)
            return _NoopCursor()
        return self.raw.execute(sql, params)

    def _guard_nature_image(self, sql: str, params: tuple[Any, ...]):
        if len(params) < 15:
            raise checker.GlobalCheckerError("Nature image rights record did not match the registered schema.")
        (story_id, file_title, source_page, creator, credit, license_name, license_url,
         _accessed, caption, usage_note, modification_note, local_path, _public_path,
         image_url, _status) = params[:15]
        row = self.raw.execute("SELECT url FROM stories WHERE story_id=? AND view_id='nature'",
                               (story_id,)).fetchone()
        article_url = str(row["url"]) if row else ""
        allowlist = self.profile.get("imageAllowlist", [])
        reviewed = next((x for x in allowlist if x.get("fileTitle") == file_title), {})
        image = {"url": image_url, "sourcePage": source_page, "creator": creator,
                 "credit": credit, "licenseName": license_name, "licenseUrl": license_url,
                 "caption": caption, "rightsNotice": usage_note, "modificationNote": modification_note,
                 "expectedCreator": reviewed.get("expectedCreator", ""),
                 "expectedLicenseUrl": reviewed.get("expectedLicenseUrl", "")}
        decision = checker.evaluate_image("nature", str(story_id), image,
                                          article_url=article_url, source_name="Nature")
        if not decision.get("allowed"):
            # Clear the preceding, still-uncommitted story image UPDATE before
            # the decision write commits anything to the view database.
            self.raw.execute("""UPDATE stories SET image_url=NULL,image_local_path=NULL,image_caption=NULL,
                image_credit=NULL,image_source_url=NULL,image_rights_status=NULL,image_rights_note=NULL
                WHERE story_id=?""", (story_id,))
            Path(str(local_path)).unlink(missing_ok=True)
            checker.record_decision(self.raw, decision)
            print(f"GLOBAL CHECKER IMAGE HOLD [{decision['verdict']}]: {article_url}", file=sys.stderr)
            return _NoopCursor()
        checker.record_decision(self.raw, decision)
        return self.raw.execute(sql, params)

    def backfill_existing(self):
        """Apply decisions to retained records created before this Checker release."""
        if self.view_id == "alien-world":
            rows = self.raw.execute("""SELECT story_id,view_id,url,title,summary,source_name,source_url,
                image_url,image_local_path,image_caption,image_credit,image_source_url,image_rights_note
                FROM stories WHERE view_id='alien-world'""").fetchall()
            for row in rows:
                story = {"id": row["story_id"], "url": row["url"], "title": row["title"],
                         "summary": row["summary"], "sourceName": row["source_name"],
                         "sourceUrl": row["source_url"]}
                decision = checker.evaluate_text(self.view_id, story)
                checker.record_decision(self.raw, decision)
                if not decision.get("allowed"):
                    if row["image_local_path"]:
                        Path(str(row["image_local_path"])).unlink(missing_ok=True)
                    self.raw.execute("DELETE FROM stories WHERE story_id=?", (row["story_id"],))
                    print(f"GLOBAL CHECKER REMOVED UNAPPROVED RETAINED STORY: {row['url']}", file=sys.stderr)
                    continue
                if not decision.get("summaryAllowed", False):
                    self.raw.execute("UPDATE stories SET summary='' WHERE story_id=?", (row["story_id"],))
                if row["image_url"]:
                    image = {"url": row["image_url"], "sourcePage": row["image_source_url"],
                             "caption": row["image_caption"], "credit": row["image_credit"],
                             "rightsNotice": row["image_rights_note"]}
                    image_decision = checker.evaluate_image(self.view_id, row["story_id"], image,
                                                            article_url=row["url"], source_name=row["source_name"])
                    checker.record_decision(self.raw, image_decision)
                    if not image_decision.get("allowed"):
                        if row["image_local_path"]:
                            Path(str(row["image_local_path"])).unlink(missing_ok=True)
                        self.raw.execute("""UPDATE stories SET image_url=NULL,image_local_path=NULL,image_caption=NULL,
                            image_credit=NULL,image_source_url=NULL,image_rights_status=NULL,image_rights_note=NULL
                            WHERE story_id=?""", (row["story_id"],))
        else:
            rows = self.raw.execute("""SELECT s.story_id,s.url,s.title,s.summary,s.source_name,s.source_url
                FROM stories s WHERE s.view_id='nature'""").fetchall()
            for row in rows:
                story = {"id": row["story_id"], "url": row["url"], "title": row["title"],
                         "summary": row["summary"], "sourceName": row["source_name"],
                         "sourceUrl": row["source_url"]}
                decision = checker.evaluate_text(self.view_id, story)
                checker.record_decision(self.raw, decision)
                if not decision.get("allowed"):
                    self.raw.execute("DELETE FROM stories WHERE story_id=?", (row["story_id"],))
                    self.raw.execute("DELETE FROM nature_image_rights WHERE story_id=?", (row["story_id"],))
                    print(f"GLOBAL CHECKER REMOVED UNAPPROVED RETAINED STORY: {row['url']}", file=sys.stderr)
                    continue
                if not decision.get("summaryAllowed", False):
                    self.raw.execute("UPDATE stories SET summary='' WHERE story_id=?", (row["story_id"],))
            images = self.raw.execute("""SELECT r.story_id,r.file_title,r.source_page,r.creator,r.credit,
                r.license_name,r.license_url,r.caption,r.usage_note,r.modification_note,r.local_path,r.image_url,s.url
                FROM nature_image_rights r JOIN stories s ON s.story_id=r.story_id
                WHERE s.view_id='nature'""").fetchall()
            allowlist = self.profile.get("imageAllowlist", [])
            for row in images:
                reviewed = next((x for x in allowlist if x.get("fileTitle") == row["file_title"]), {})
                image = {"url": row["image_url"], "sourcePage": row["source_page"],
                         "creator": row["creator"], "credit": row["credit"],
                         "licenseName": row["license_name"], "licenseUrl": row["license_url"],
                         "caption": row["caption"], "rightsNotice": row["usage_note"],
                         "modificationNote": row["modification_note"],
                         "expectedCreator": reviewed.get("expectedCreator", ""),
                         "expectedLicenseUrl": reviewed.get("expectedLicenseUrl", "")}
                image_decision = checker.evaluate_image(self.view_id, row["story_id"], image,
                                                        article_url=row["url"], source_name="Nature")
                checker.record_decision(self.raw, image_decision)
                if not image_decision.get("allowed"):
                    self.raw.execute("DELETE FROM nature_image_rights WHERE story_id=?", (row["story_id"],))
                    self.raw.execute("""UPDATE stories SET image_url=NULL,image_local_path=NULL,image_caption=NULL,
                        image_credit=NULL,image_source_url=NULL,image_rights_status=NULL,image_rights_note=NULL
                        WHERE story_id=?""", (row["story_id"],))
                    Path(str(row["local_path"])).unlink(missing_ok=True)
        checker.prune_decisions(self.raw, self.view_id, 32)
        self.raw.commit()

    def close(self):
        try:
            self.backfill_existing()
        finally:
            self.raw.close()


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load existing LIVE // EARTH component: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def extract_commons_metadata_for_checker(module, file_title: str) -> dict[str, Any]:
    """Extract Commons evidence without making a local licence/creator verdict.

    The Global Checker evaluates the creator, licence, expected file record,
    contextual caption and modification evidence. The Collector keeps only
    source-page/host/MIME/response-integrity checks needed for safe retrieval.
    """
    query = module.urllib.parse.urlencode({
        "action": "query", "titles": file_title, "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "1600",
        "format": "json", "formatversion": "2",
    })
    payload, _, _ = module.bounded_get(
        "https://commons.wikimedia.org/w/api.php?" + query,
        module.ALLOWED_API_HOSTS, module.MAX_API_BYTES,
    )
    data = json.loads(payload.decode("utf-8"))
    pages = data.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing") is not None:
        raise ValueError("The exact Commons file page is missing.")
    page = pages[0]

    def title_key(value):
        return " ".join(str(value or "").replace("_", " ").split()).casefold()

    if title_key(page.get("title")) != title_key(file_title):
        raise ValueError("Commons returned a different file page than the exact allowlisted title.")
    infos = page.get("imageinfo") or []
    if not infos:
        raise ValueError("Commons file page has no imageinfo record.")
    info = infos[0]
    ext = info.get("extmetadata") or {}

    def meta(key):
        field = ext.get(key) or {}
        value = field.get("value", "") if isinstance(field, dict) else field
        return module.clean(value, 1200)

    description_url = str(info.get("descriptionurl") or "")
    image_url = ""
    media_errors = []
    for candidate in (info.get("thumburl"), info.get("url")):
        if not candidate:
            continue
        try:
            image_url = module.normalize_commons_media_url(str(candidate))
            break
        except ValueError as exc:
            media_errors.append(str(exc))
    if not module.safe_https(description_url, module.ALLOWED_API_HOSTS):
        raise ValueError("Commons description URL is not an HTTPS Commons file page.")
    if not image_url:
        detail = media_errors[-1] if media_errors else "no media URL was supplied"
        raise ValueError(f"Commons did not provide an approved upload.wikimedia.org URL: {detail}")
    copyright_status = meta("Copyrighted").lower()
    if copyright_status not in {"true", "false", ""}:
        raise ValueError("Commons copyright-status metadata is not understood.")
    mime = str(info.get("mime") or "").lower()
    if mime not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValueError("Only verified raster image formats are supported by this Collector.")
    return {
        "fileTitle": str(page.get("title") or file_title),
        "creator": module.clean(meta("Artist") or meta("Credit"), 240),
        "licenseName": meta("LicenseShortName"),
        "licenseUrl": module.normalize_license(meta("LicenseUrl")),
        "descriptionUrl": description_url, "imageUrl": image_url, "mime": mime,
        "width": int(info.get("width") or 0), "height": int(info.get("height") or 0),
    }


def check_nature_image_metadata(connection: sqlite3.Connection | None, story: dict[str, Any],
                                allowlist_item: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    """Check an exact Commons file record before the Collector downloads it."""
    story_id = str(story.get("story_id") or story.get("id") or "")
    article_url = str(story.get("url") or "")
    license_name = str(metadata.get("licenseName") or allowlist_item.get("expectedLicenseUrl") or "")
    creator = str(metadata.get("creator") or "")
    source_page = str(metadata.get("descriptionUrl") or "")
    image_url = str(metadata.get("imageUrl") or "")
    caption = " ".join((str(allowlist_item.get("contextCaption") or ""),
                        str(allowlist_item.get("usageNote") or ""))).strip()
    image = {
        "url": image_url, "sourcePage": source_page, "creator": creator,
        "credit": f"{creator} · {license_name} · {source_page}",
        "licenseName": license_name, "licenseUrl": metadata.get("licenseUrl", ""),
        "caption": caption, "rightsNotice": allowlist_item.get("usageNote", ""),
        "modificationNote": "Wikimedia thumbnail/display copy resized to max 1600px and JPEG quality 80; factual content unchanged. Attribution retained.",
        "expectedCreator": allowlist_item.get("expectedCreator", ""),
        "expectedLicenseUrl": allowlist_item.get("expectedLicenseUrl", ""),
    }
    decision = checker.evaluate_image("nature", story_id, image,
                                      article_url=article_url,
                                      source_name=str(story.get("source_name") or story.get("sourceName") or "Nature"))
    if connection is not None:
        checker.record_decision(connection, decision)
    return decision


def check_alien_image_candidate(connection: sqlite3.Connection | None, candidate: dict[str, Any],
                                article_url: str, kind_label: str) -> dict[str, Any]:
    """Evaluate and retain pre-download image provenance evidence."""
    item = dict(candidate)
    item.setdefault("sourcePage", item.get("source_url") or article_url)
    # NASA may be used as source-level attribution when no separate image
    # credit is published, but an actual descriptive caption is required.
    item.setdefault("credit", "NASA")
    item["kind"] = kind_label
    story_id = hashlib.sha256(str(article_url).encode("utf-8")).hexdigest()[:24]
    decision = checker.evaluate_image(
        "alien-world", story_id, item, article_url=str(article_url), source_name="NASA"
    )
    if connection is not None:
        checker.record_decision(connection, decision)
    return decision


def filter_sources_for_registry(view_id: str, sources: list[dict[str, Any]],
                                registry: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
    """Exclude RED feed routes before the Collector makes a network request."""
    permitted: list[dict[str, Any]] = []
    blocked: list[str] = []
    for source in sources:
        feed_host = checker._domain(source.get("url") or source.get("feedUrl"))
        source_name = str(source.get("name", "")).casefold()
        feed_url = str(source.get("url") or source.get("feedUrl") or "").strip()
        source_policy = next((policy for policy in registry.get("policies", [])
            if view_id in policy.get("views", [])
            and checker._host_matches(feed_host, policy.get("feedDomains", []))
            and (not policy.get("allowedFeedUrls") or feed_url in policy.get("allowedFeedUrls", []))
            and (not policy.get("sourceNameContains") or any(
                str(term).casefold() in source_name for term in policy.get("sourceNameContains", [])))
        ), None)
        if not source_policy or source_policy.get("status") == "RED":
            blocked.append(str(source.get("name", "unnamed")))
            continue
        permitted.append(source)
    return permitted, blocked


def run_collector(view_id: str) -> int:
    if view_id == "nature":
        path = ROOT / "nature" / "collector" / "collector.py"
        module = _load_module("live_earth_nature_collector_global_checker", path)
        profile = json.loads(module.PROFILE_PATH.read_text(encoding="utf-8"))
        original = module.db_connect

        def open_checked_nature_db():
            wrapped = CheckedConnection(original(), "nature", profile)
            module._global_checker_connection = wrapped
            return wrapped

        module.db_connect = open_checked_nature_db

        # The selected Commons asset is checked against the shared registry
        # before its bytes are downloaded. Existing file-page parsing and
        # network/MIME checks remain as additional integrity safeguards.
        original_matches = module.matches_category

        def track_nature_story_match(story, category):
            matched = original_matches(story, category)
            if matched:
                current = dict(story)
                active = getattr(module, "_global_checker_connection", None)
                if active is not None and current.get("story_id"):
                    provenance = active.raw.execute(
                        "SELECT url,source_name,source_url FROM stories WHERE story_id=? AND view_id='nature'",
                        (current["story_id"],),
                    ).fetchone()
                    if provenance:
                        current.update(dict(provenance))
                module._global_checker_current_story = current
            return matched

        def checked_commons_metadata(file_title):
            metadata = extract_commons_metadata_for_checker(module, file_title)
            current_story = getattr(module, "_global_checker_current_story", {})
            allowlist_item = next((item for item in profile.get("imageAllowlist", [])
                                   if item.get("fileTitle") == file_title), {})
            active_connection = getattr(module, "_global_checker_connection", None)
            decision = check_nature_image_metadata(
                active_connection.raw if active_connection is not None else None,
                current_story, allowlist_item, metadata
            )
            if not decision.get("allowed"):
                raise ValueError("Global Checker held the Wikimedia image: " + "; ".join(decision.get("reasons", [])))
            return metadata

        module.matches_category = track_nature_story_match
        module.commons_metadata = checked_commons_metadata

        # Do not even fetch a source route whose current registry status is RED.
        # This is important for publishers whose terms prohibit systematic feed
        # or site-content retrieval for our persistent database workflow.
        registry = checker.load_registry()
        permitted_sources, blocked_sources = filter_sources_for_registry(
            "nature", profile.get("sources", []), registry
        )
        for source_name in blocked_sources:
            print(f"GLOBAL CHECKER SOURCE HOLD [RED]: {source_name}", file=sys.stderr)
        profile["sources"] = permitted_sources
        import tempfile
        with tempfile.TemporaryDirectory(prefix="live-earth-global-checker-profile-") as temp_dir:
            staged_profile = Path(temp_dir) / "nature-profile.json"
            staged_profile.write_text(json.dumps(profile, ensure_ascii=False), encoding="utf-8")
            original_profile_path = module.PROFILE_PATH
            module.PROFILE_PATH = staged_profile
            try:
                result = module.collect()
            finally:
                module.PROFILE_PATH = original_profile_path
        return int(result)
    if view_id == "alien-world":
        path = ROOT / "alien-world" / "collector" / "collector.py"
        module = _load_module("live_earth_alien_collector_global_checker", path)
        profile = json.loads(module.PROFILE_PATH.read_text(encoding="utf-8"))
        original = module.open_writer_db

        def open_checked_writer(profile_arg):
            wrapped = CheckedConnection(original(profile_arg), "alien-world", profile_arg)
            module._global_checker_connection = wrapped
            return wrapped

        module.open_writer_db = open_checked_writer

        # The common Checker, not a second Collector-specific rights rule set,
        # decides image eligibility before download and records that decision
        # in the same Alien World database. The later DB-write gate rechecks the
        # downloaded image and replaces this candidate-only evidence with the
        # final image record.
        def checker_image_eligibility(candidate, article_url):
            active_connection = getattr(module, "_global_checker_connection", None)
            decision = check_alien_image_candidate(
                active_connection.raw if active_connection is not None else None,
                candidate, str(article_url), module.image_type_label(candidate)
            )
            return bool(decision.get("allowed"))

        module.image_is_eligible = checker_image_eligibility

        # Apply the same source registry before any Alien World feed request.
        registry = checker.load_registry()
        permitted_sources, blocked_sources = filter_sources_for_registry(
            "alien-world", profile.get("sources", []), registry
        )
        for source_name in blocked_sources:
            print(f"GLOBAL CHECKER SOURCE HOLD [RED/UNKNOWN]: {source_name}", file=sys.stderr)
        profile["sources"] = permitted_sources
        import tempfile
        with tempfile.TemporaryDirectory(prefix="live-earth-global-checker-alien-profile-") as temp_dir:
            staged_profile = Path(temp_dir) / "alien-world-profile.json"
            staged_profile.write_text(json.dumps(profile, ensure_ascii=False), encoding="utf-8")
            original_profile_path = module.PROFILE_PATH
            module.PROFILE_PATH = staged_profile
            try:
                return int(module.main())
            finally:
                module.PROFILE_PATH = original_profile_path
    raise ValueError("Unknown feed Collector view")


def _clean_nature_assets(feed: dict[str, Any], output_dir: Path,
                         staged_manifest: dict[str, Any] | None = None, *,
                         prune_files: bool = True) -> None:
    keep_names = set()
    keep_ids = set()
    for story in feed.get("stories", []):
        if story.get("imageUrl"):
            keep_names.add(Path(str(story["imageUrl"]).split("?")[0]).name)
            keep_ids.add(story.get("id"))
    assets = output_dir / "assets"
    if prune_files and assets.exists():
        for path in assets.glob("*.jpg"):
            if path.name not in keep_names:
                path.unlink(missing_ok=True)
    manifest_path = assets / "image-rights.json"
    if staged_manifest is not None or manifest_path.is_file():
        try:
            manifest = dict(staged_manifest) if staged_manifest is not None else json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["images"] = [x for x in manifest.get("images", []) if x.get("storyId") in keep_ids]
            if staged_manifest is not None:
                staged_manifest.clear()
                staged_manifest.update(manifest)
            else:
                temp = manifest_path.with_suffix(".json.pending")
                temp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                temp.replace(manifest_path)
        except Exception as exc:
            raise checker.GlobalCheckerError(f"Could not reconcile Nature public image-rights manifest: {exc}") from exc


def _atomic_nature_feed_and_manifest(manifest_path: Path, manifest: dict[str, Any],
                                     feed_path: Path, feed: dict[str, Any]) -> None:
    """Replace Nature's rights manifest/feed as a matched publication pair.

    The manifest is replaced first and rolled back if the final feed replacement
    fails. The feed remains the publication commit point; asset pruning happens
    only after this function returns successfully.
    """
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    feed_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_temp = manifest_path.with_suffix(manifest_path.suffix + ".global-checker-pending")
    feed_temp = feed_path.with_suffix(feed_path.suffix + ".global-checker-pending")
    previous_manifest = manifest_path.read_bytes() if manifest_path.is_file() else None
    manifest_temp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    feed_temp.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    try:
        os.replace(manifest_temp, manifest_path)
        os.replace(feed_temp, feed_path)
    except Exception:
        try:
            if previous_manifest is None:
                manifest_path.unlink(missing_ok=True)
            else:
                restore_temp = manifest_path.with_suffix(manifest_path.suffix + ".restore-pending")
                restore_temp.write_bytes(previous_manifest)
                os.replace(restore_temp, manifest_path)
        finally:
            manifest_temp.unlink(missing_ok=True)
            feed_temp.unlink(missing_ok=True)
        raise


def run_nature_publisher() -> int:
    path = ROOT / "nature" / "publisher" / "publisher.py"
    module = _load_module("live_earth_nature_publisher_global_checker", path)
    original_atomic = module.atomic_json
    pending_manifest: dict[str, Any] | None = None

    def gated_atomic_json(output_path, payload):
        nonlocal pending_manifest
        target = Path(output_path)
        if target.name == "image-rights.json":
            # Hold candidate rights metadata until the matching feed passes.
            pending_manifest = dict(payload)
            return None
        if target.name == "live-feed.json":
            db = module.open_readonly()
            try:
                approved_feed = checker.gate_feed(payload, db, "nature", minimum_stories=2)
            finally:
                db.close()
            _clean_nature_assets(approved_feed, module.OUTPUT_DIR, pending_manifest, prune_files=False)
            manifest_path = module.OUTPUT_DIR / "assets" / "image-rights.json"
            if pending_manifest is not None:
                _atomic_nature_feed_and_manifest(manifest_path, pending_manifest,
                                                 target, approved_feed)
                return None
            return original_atomic(output_path, approved_feed)
        return original_atomic(output_path, payload)

    module.atomic_json = gated_atomic_json
    module.publish()
    return 0


def run_alien_world_publisher() -> int:
    path = ROOT / "alien-world" / "publisher" / "publisher.py"
    module = _load_module("live_earth_alien_publisher_global_checker", path)
    original_route = module.route_engine_outputs

    def gated_route(result):
        connection = module.read_only_connection()
        try:
            feed = result.get("feed") if isinstance(result, dict) else None
            if not isinstance(feed, dict):
                raise checker.GlobalCheckerError("Alien World Engine did not return a feed to check.")
            result["feed"] = checker.gate_feed(feed, connection, "alien-world", minimum_stories=2)
        finally:
            connection.close()
        return original_route(result)

    module.route_engine_outputs = gated_route
    old_argv = sys.argv[:]
    try:
        sys.argv = [str(path), "--mode", "live"]
        return int(module.main())
    finally:
        sys.argv = old_argv


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("collect", "publish", "test"))
    parser.add_argument("--view", choices=("nature", "alien-world"), required=True)
    args = parser.parse_args()
    try:
        if args.phase == "test":
            import subprocess
            return subprocess.call([sys.executable, "-m", "unittest", "discover", "-s",
                                    str(CHECKER_DIR / "tests"), "-p", "test_*.py", "-v"], cwd=ROOT)
        if args.phase == "collect":
            return run_collector(args.view)
        if args.view == "nature":
            return run_nature_publisher()
        return run_alien_world_publisher()
    except Exception as exc:
        print(json.dumps({"status": "global_checker_blocked", "viewId": args.view,
                          "phase": args.phase, "error": str(exc),
                          "lastGoodFeedMustBePreserved": True}, indent=2), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

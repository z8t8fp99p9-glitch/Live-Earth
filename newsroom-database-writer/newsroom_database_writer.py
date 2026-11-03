#!/usr/bin/env python3
"""Persist only Checker-released v2 Editorial stories in the matching View DB.

This is the v2 adapter for the existing View-owned newsroom_approved_stories
 table. It leaves the Collector-owned stories table untouched, adds columns
only when missing, and stores Image Engine files privately under the matching
View cache. It never publishes assets or writes a public feed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import quote, urlsplit

WRITER = "LIVE // EARTH Newsroom Database Writer"
WRITER_VERSION = "2.0.0"
EXPECTED_CHECKER = "LIVE // EARTH Global Content Rights & Provenance Checker"
EXPECTED_HANDOFF = "LIVE // EARTH Global Checker Image Engine Bridge"
EXPECTED_GATE = "LIVE // EARTH Global Checker Post-Editorial Verification"
TABLE = "newsroom_approved_stories"
EDITORIAL_ENGINE = "Universal Editorial Engine"
EDITORIAL_CORE_VERSION = "1.3.0"
EDITORIAL_ADAPTER_VERSION = "2.0.0"
GATE_VERSION = "1.0.0"
MANAGER_FIELDS = (
    "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
    "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
    "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
    "requestWindowHours", "configVersion", "trigger",
)


class NewsroomDatabaseWriterError(RuntimeError):
    """The Checker release or View database did not match the Writer contract."""


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_time(value: Any, label: str) -> datetime:
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value), timezone.utc)
        except (ValueError, OverflowError, OSError) as exc:
            raise NewsroomDatabaseWriterError(f"{label} is not a valid timestamp.") from exc
    if not isinstance(value, str) or not value.strip():
        raise NewsroomDatabaseWriterError(f"{label} is missing.")
    try:
        result = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError as exc:
        raise NewsroomDatabaseWriterError(f"{label} is not a valid ISO-8601 timestamp.") from exc
    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)
    return result.astimezone(timezone.utc)


def _canonical_https(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    try:
        parsed = urlsplit(value.strip())
        if parsed.scheme.lower() != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.port not in (None, 443):
            return ""
        host = parsed.hostname.lower().rstrip(".")
        path = parsed.path or "/"
        query = "&".join(part for part in parsed.query.split("&") if part and not part.split("=", 1)[0].lower().startswith("utm_") and part.split("=", 1)[0].lower() not in {"fbclid", "gclid", "mc_cid", "mc_eid"})
        return f"https://{host}{path}" + (f"?{query}" if query else "")
    except (TypeError, ValueError):
        return ""


def _read_json(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise NewsroomDatabaseWriterError(f"{label} cannot be read: {type(exc).__name__}: {exc}") from exc
    if not isinstance(value, dict):
        raise NewsroomDatabaseWriterError(f"{label} must be a JSON object.")
    return value


def _repository_contract(root: Path, view_id: str, job: dict[str, Any], package: dict[str, Any]) -> tuple[dict[str, Any], Path]:
    profiles_doc = _read_json(root / "global_collection_manager/config/view-collection-profiles.json", "Manager View profiles")
    manager_registry = _read_json(root / "global_collection_manager/config/source-registry.json", "Manager Source Registry")
    checker_registry = _read_json(root / "global-checker/source-registry.json", "Global Checker registry")
    profiles = [x for x in profiles_doc.get("profiles", []) if isinstance(x, dict) and x.get("viewId") == view_id]
    if len(profiles) != 1 or profiles[0].get("enabled") is not True:
        raise NewsroomDatabaseWriterError("View does not resolve to exactly one enabled Manager profile.")
    profile = profiles[0]
    for field, expected in (
        ("profileId", profile.get("profileId")),
        ("destinationDatabaseId", profile.get("destinationDatabaseId")),
        ("destinationDatabasePath", profile.get("destinationDatabasePath")),
    ):
        if job.get(field) != expected:
            raise NewsroomDatabaseWriterError(f"Manager job {field} differs from the active View profile.")
    if package.get("managerRegistryVersion") != manager_registry.get("registryVersion"):
        raise NewsroomDatabaseWriterError("Manager Source Registry changed after Editorial production.")
    if package.get("checkerRegistryVersion") != checker_registry.get("registryVersion"):
        raise NewsroomDatabaseWriterError("Global Checker registry changed after image review.")
    expected = {
        "nature": ("nature-sqlite", ".publisher-data/nature/nature.sqlite3"),
        "alien-world": ("alien-world-sqlite", ".publisher-data/alien-world/alien-world.sqlite3"),
    }
    if view_id not in expected or (profile.get("destinationDatabaseId"), profile.get("destinationDatabasePath")) != expected[view_id]:
        raise NewsroomDatabaseWriterError("View database destination is not its registered isolated database.")
    rel = PurePosixPath(profile["destinationDatabasePath"])
    if rel.is_absolute() or ".." in rel.parts or "\\" in str(rel):
        raise NewsroomDatabaseWriterError("View database destination is not a safe repository-relative path.")
    db_path = (root / Path(*rel.parts)).resolve()
    if root.resolve() not in db_path.parents:
        raise NewsroomDatabaseWriterError("View database path escapes the repository root.")
    return profile, db_path


def _ensure_table(connection: sqlite3.Connection) -> None:
    connection.execute(f"""CREATE TABLE IF NOT EXISTS {TABLE} (
        view_id TEXT NOT NULL,
        story_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_url TEXT NOT NULL,
        published_at REAL NOT NULL,
        retrieved_at REAL NOT NULL,
        image_url TEXT,
        image_local_path TEXT,
        image_caption TEXT,
        image_credit TEXT,
        image_source_url TEXT,
        image_rights_status TEXT,
        image_rights_note TEXT,
        source_policy_ref TEXT NOT NULL,
        global_checker_intake_decision_id TEXT NOT NULL,
        checker_review_id TEXT NOT NULL,
        checker_registry_version TEXT NOT NULL,
        checker_checked_at TEXT NOT NULL,
        editorial_engine_version TEXT NOT NULL,
        editorial_adapter_version TEXT NOT NULL,
        evidence_ledger_json TEXT NOT NULL,
        topic_tags_json TEXT NOT NULL,
        image_rights_json TEXT NOT NULL,
        approved_at TEXT NOT NULL,
        PRIMARY KEY(view_id, story_id),
        UNIQUE(view_id, url),
        CHECK(view_id IN ('nature','alien-world'))
    )""")
    # Additive migration only. Existing rows/tables are never dropped or reset.
    additions = {
        "post_id": "TEXT", "source_id": "TEXT", "media_id": "TEXT",
        "image_stage_path": "TEXT", "image_sha256": "TEXT", "image_mime_type": "TEXT",
        "image_origin_type": "TEXT", "media_metadata_json": "TEXT",
        "manager_lineage_json": "TEXT", "checker_decisions_json": "TEXT",
        "editorial_package_sha256": "TEXT", "verification_gate_version": "TEXT",
    }
    columns = {row[1] for row in connection.execute(f"PRAGMA table_info({TABLE})").fetchall()}
    for column, declaration in additions.items():
        if column not in columns:
            connection.execute(f"ALTER TABLE {TABLE} ADD COLUMN {column} {declaration}")
    connection.execute(f"CREATE INDEX IF NOT EXISTS idx_{TABLE}_published ON {TABLE}(view_id,published_at DESC)")


def _verify_db(connection: sqlite3.Connection, view_id: str, profile: dict[str, Any]) -> None:
    tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "publisher_meta" not in tables or "stories" not in tables:
        raise NewsroomDatabaseWriterError("The matching View Collector database is not initialized.")
    meta = {str(row[0]): str(row[1]) for row in connection.execute("SELECT key,value FROM publisher_meta").fetchall()}
    if meta.get("view_id") != view_id:
        raise NewsroomDatabaseWriterError("Database metadata belongs to a different View.")
    expected_publisher = "nature-publisher" if view_id == "nature" else "alien-world-publisher"
    if meta.get("publisher_id") and meta.get("publisher_id") != expected_publisher:
        raise NewsroomDatabaseWriterError("Database Publisher identity belongs to a different View.")
    if profile.get("viewId") != view_id:
        raise NewsroomDatabaseWriterError("Manager profile View identity mismatch.")


def _safe_private_image(root: Path, view_id: str, story: dict[str, Any]) -> tuple[str, str, str, dict[str, Any]]:
    image = story.get("image")
    if not isinstance(image, dict) or story.get("mediaId") != image.get("mediaId"):
        raise NewsroomDatabaseWriterError("Checker-approved image or mediaId is missing from the Editorial story.")
    if image.get("postId") != story.get("postId") or image.get("viewId") != view_id or image.get("sourceId") != story.get("sourceId"):
        raise NewsroomDatabaseWriterError("Image post/source/View identity differs from its Editorial story.")
    metadata = image.get("metadata") if isinstance(image.get("metadata"), dict) else {}
    if metadata.get("assetPublished") is not False:
        raise NewsroomDatabaseWriterError("Image Engine candidate must remain private until the Publisher copies it.")
    staged = Path(str(metadata.get("stagedPath") or "")).resolve()
    allowed_stage_root = (root / ".image-engine-staging" / view_id).resolve()
    try:
        staged.relative_to(allowed_stage_root)
    except ValueError as exc:
        raise NewsroomDatabaseWriterError("Approved image is outside the private Image Engine staging directory.") from exc
    if not staged.is_file():
        raise NewsroomDatabaseWriterError("Checker-approved staged image is missing.")
    digest = hashlib.sha256(staged.read_bytes()).hexdigest()
    expected = str(metadata.get("sha256") or "")
    if not re.fullmatch(r"[a-f0-9]{64}", expected) or digest != expected:
        raise NewsroomDatabaseWriterError("Checker-approved image SHA-256 does not match the staged file.")
    mime = str(image.get("mimeType") or "").lower()
    if mime != "image/jpeg":
        raise NewsroomDatabaseWriterError("Only the Image Engine's normalized JPEG hand-off is supported by the View Publisher.")
    media_id = str(image.get("mediaId") or "")
    if not re.fullmatch(r"media-[a-f0-9]{24}", media_id):
        raise NewsroomDatabaseWriterError("Image mediaId does not match the registered Media ID format.")
    filename = f"{media_id}-{digest[:16]}.jpg"
    relative = Path(".publisher-data") / view_id / "newsroom-assets" / filename
    destination = (root / relative).resolve()
    if root.resolve() not in destination.parents:
        raise NewsroomDatabaseWriterError("Private image cache path escapes the repository root.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    pending = destination.with_suffix(destination.suffix + ".pending")
    shutil.copy2(staged, pending)
    if hashlib.sha256(pending.read_bytes()).hexdigest() != digest:
        pending.unlink(missing_ok=True)
        raise NewsroomDatabaseWriterError("Private image cache copy failed its SHA-256 check.")
    pending.replace(destination)
    public_metadata = {
        "mediaId": media_id,
        "originType": metadata.get("originType", ""),
        "creator": image.get("creator", ""),
        "credit": image.get("credit", ""),
        "caption": image.get("caption", ""),
        "sourcePage": image.get("sourcePage", ""),
        "licenseName": image.get("licenseName", ""),
        "licenseUrl": image.get("licenseUrl", ""),
        "rightsNotice": image.get("rightsNotice", ""),
        "modificationNote": metadata.get("modificationNote", ""),
        "mimeType": mime,
        "width": image.get("width"),
        "height": image.get("height"),
        "sha256": digest,
    }
    return media_id, relative.as_posix(), digest, public_metadata


def _story_record(root: Path, view_id: str, job: dict[str, Any], story: dict[str, Any],
                  checker_record: dict[str, Any], evidence: dict[str, Any],
                  registry_version: str, package_digest: str, checked_at: str) -> dict[str, Any]:
    post_id = str(story.get("postId") or "")
    if not post_id or story.get("id") != post_id or story.get("viewId") != view_id:
        raise NewsroomDatabaseWriterError("Editorial story postId/ID/View identity is invalid.")
    if story.get("sourceRecord", {}).get("postId") != post_id or story.get("sourceId") != story.get("sourceRecord", {}).get("sourceId"):
        raise NewsroomDatabaseWriterError("Editorial story no longer matches its preserved source record.")
    for field in MANAGER_FIELDS:
        if field not in story or story.get(field) != job.get(field):
            raise NewsroomDatabaseWriterError(f"Editorial story lost Manager lineage field '{field}'.")
    article_url = _canonical_https(story.get("sourceUrl") or story.get("sourceRecord", {}).get("canonicalUrl") or story.get("sourceRecord", {}).get("originalUrl"))
    feed_url = _canonical_https(story.get("sourceFeedUrl"))
    title = re.sub(r"\s+", " ", str(story.get("title") or "")).strip()
    summary = re.sub(r"\s+", " ", str(story.get("summary") or "")).strip()
    source_name = re.sub(r"\s+", " ", str(story.get("sourceName") or "")).strip()
    if not article_url or not feed_url or not source_name or not title or len(summary) < 100 or len(summary.split()) < 16:
        raise NewsroomDatabaseWriterError(f"Story '{post_id}' does not meet the existing Live Feed record contract.")
    text_decision = checker_record.get("text") if isinstance(checker_record.get("text"), dict) else {}
    policy_id = str(text_decision.get("policyId") or "")
    decision_id = str(text_decision.get("decisionId") or "")
    if not policy_id or not decision_id:
        raise NewsroomDatabaseWriterError(f"Story '{post_id}' has no original Checker text decision reference.")
    if evidence.get("postId") != post_id or evidence.get("mediaId") != story.get("mediaId"):
        raise NewsroomDatabaseWriterError(f"Story '{post_id}' has mismatched source evidence identity.")
    source_url = _canonical_https(evidence.get("sourceUrl"))
    source_hash = str(evidence.get("summaryExcerptSha256") or "")
    if source_url != article_url or not re.fullmatch(r"[a-f0-9]{64}", source_hash):
        raise NewsroomDatabaseWriterError(f"Story '{post_id}' has invalid summary evidence provenance.")
    media_id, stage_path, image_digest, media_meta = _safe_private_image(root, view_id, story)
    published = _parse_time(story.get("publishedAt"), f"Story '{post_id}' publication date")
    checked = _parse_time(checked_at, f"Story '{post_id}' Checker timestamp")
    lineage = story.get("managerLineage")
    checker_decisions = story.get("checkerDecisions")
    if not isinstance(lineage, dict) or not isinstance(checker_decisions, dict):
        raise NewsroomDatabaseWriterError(f"Story '{post_id}' is missing preserved internal lineage/Checker decisions.")
    tags = []
    for key in ("topics", "categories", "tags"):
        values = story.get(key) or []
        if isinstance(values, list):
            tags.extend(str(value) for value in values if isinstance(value, str) and str(value).strip())
    tags = list(dict.fromkeys(tags))
    evidence_ledger = [{
        "sourceRecordId": post_id,
        "sourceUrl": article_url,
        "sourcePolicyRef": policy_id,
        "excerptSha256": source_hash,
    }]
    rights = {
        key: media_meta[key] for key in (
            "mediaId", "originType", "creator", "credit", "caption", "sourcePage",
            "licenseName", "licenseUrl", "rightsNotice", "modificationNote", "mimeType", "width", "height", "sha256"
        )
    }
    checker_digest = _sha256(_json(checker_record) + "|" + package_digest + "|" + GATE_VERSION)
    return {
        "view_id": view_id,
        "story_id": post_id,
        "url": article_url,
        "title": title,
        "summary": summary,
        "source_name": source_name,
        "source_url": feed_url,
        "published_at": published.timestamp(),
        "retrieved_at": checked.timestamp(),
        # The shared Engine's legacy row contract expects the image fields to be
        # blank here. The v2 Publisher asset bridge consumes the dedicated v2
        # columns below, so the Collector and core Engine data stay compatible.
        "image_url": None,
        "image_local_path": None,
        "image_caption": None,
        "image_credit": None,
        "image_source_url": None,
        "image_rights_status": None,
        "image_rights_note": None,
        "source_policy_ref": policy_id,
        "global_checker_intake_decision_id": decision_id,
        "checker_review_id": checker_digest,
        "checker_registry_version": registry_version,
        "checker_checked_at": checked.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "editorial_engine_version": EDITORIAL_CORE_VERSION,
        "editorial_adapter_version": EDITORIAL_ADAPTER_VERSION,
        "evidence_ledger_json": _json(evidence_ledger),
        "topic_tags_json": _json(tags),
        "image_rights_json": _json(rights),
        "approved_at": _utc_now(),
        "post_id": post_id,
        "source_id": str(story.get("sourceId") or ""),
        "media_id": media_id,
        "image_stage_path": stage_path,
        "image_sha256": image_digest,
        "image_mime_type": media_meta["mimeType"],
        "image_origin_type": media_meta["originType"],
        "media_metadata_json": _json(media_meta),
        "manager_lineage_json": _json(lineage),
        "checker_decisions_json": _json(checker_decisions),
        "editorial_package_sha256": package_digest,
        "verification_gate_version": GATE_VERSION,
    }


def _persist_one(connection: sqlite3.Connection, record: dict[str, Any]) -> str:
    by_story = connection.execute(f"SELECT url,checker_review_id,checker_checked_at FROM {TABLE} WHERE view_id=? AND story_id=?", (record["view_id"], record["story_id"])).fetchone()
    by_url = connection.execute(f"SELECT story_id FROM {TABLE} WHERE view_id=? AND url=?", (record["view_id"], record["url"])).fetchone()
    if by_url and by_url[0] != record["story_id"]:
        raise NewsroomDatabaseWriterError("Canonical article URL is already assigned to a different postId.")
    if by_story:
        if by_story[0] != record["url"]:
            raise NewsroomDatabaseWriterError("postId is already assigned to a different canonical article URL.")
        if by_story[1] == record["checker_review_id"]:
            return "unchanged"
        if str(record["checker_checked_at"]) < str(by_story[2]):
            return "older_review_ignored"
        columns = [key for key in record if key not in {"view_id", "story_id"}]
        connection.execute(f"UPDATE {TABLE} SET " + ",".join(f"{key}=?" for key in columns) + " WHERE view_id=? AND story_id=?", tuple(record[key] for key in columns) + (record["view_id"], record["story_id"]))
        return "updated"
    columns = list(record)
    connection.execute(f"INSERT INTO {TABLE} (" + ",".join(columns) + ") VALUES (" + ",".join("?" for _ in columns) + ")", tuple(record[key] for key in columns))
    return "inserted"


def write_verified_editorial_stories(checker_handoff: dict[str, Any], editorial_package: dict[str, Any], verification_result: dict[str, Any], *, repository_root: str | Path = ".") -> dict[str, Any]:
    """Persist only postIds explicitly released by the new Checker gate."""
    root = Path(repository_root).resolve()
    if (not isinstance(checker_handoff, dict)
            or checker_handoff.get("schemaVersion") != 1
            or checker_handoff.get("phase") != "checker-image-review-complete"
            or checker_handoff.get("handoff") != EXPECTED_HANDOFF
            or checker_handoff.get("handoffVersion") != "1.0.0"
            or checker_handoff.get("checker") != EXPECTED_CHECKER
            or checker_handoff.get("checkerVersion") != "2.0.0"):
        raise NewsroomDatabaseWriterError("The registered completed Checker image-review hand-off is required.")
    if not isinstance(editorial_package, dict) or editorial_package.get("schemaVersion") != 1 or editorial_package.get("phase") != "editorial-production":
        raise NewsroomDatabaseWriterError("The v2 Universal Editorial Engine package is required.")
    if editorial_package.get("engine") != EDITORIAL_ENGINE or editorial_package.get("coreEngineVersion") != EDITORIAL_CORE_VERSION or editorial_package.get("newsroomAdapterVersion") != EDITORIAL_ADAPTER_VERSION:
        raise NewsroomDatabaseWriterError("Editorial Engine identity/version is not the registered v2 contract.")
    if (not isinstance(verification_result, dict)
            or verification_result.get("schemaVersion") != 1
            or verification_result.get("checker") != EXPECTED_CHECKER
            or verification_result.get("checkerVersion") != "2.0.0"
            or verification_result.get("verificationGate") != EXPECTED_GATE
            or verification_result.get("verificationGateVersion") != GATE_VERSION
            or verification_result.get("phase") != "post-editorial-verification-complete"
            or verification_result.get("reportVisibility") != "INTERNAL_ONLY_NOT_FOR_PUBLICATION"):
        raise NewsroomDatabaseWriterError("The registered post-Editorial Checker verification report is required.")
    if verification_result.get("verdict") not in ("PASS", "PARTIAL") or verification_result.get("releaseForPublisher") is not True:
        raise NewsroomDatabaseWriterError("Checker final verification did not release any story for the Publisher.")
    package_digest = _sha256(_json(editorial_package))
    if verification_result.get("editorialPackageSha256") != package_digest:
        raise NewsroomDatabaseWriterError("Checker verification digest does not match the exact Editorial package.")
    collector_result = checker_handoff.get("collectorResultWithCheckerReviewedImages")
    checker_review = checker_handoff.get("checkerReview")
    if not isinstance(collector_result, dict) or not isinstance(checker_review, dict):
        raise NewsroomDatabaseWriterError("Checker hand-off is missing its original Collector result or Checker report.")
    job = collector_result.get("job")
    if not isinstance(job, dict) or any(job.get(field) in (None, "", []) for field in MANAGER_FIELDS):
        raise NewsroomDatabaseWriterError("Original Manager job envelope is incomplete.")
    view_id = str(job.get("viewId") or "")
    if verification_result.get("viewId") != view_id or verification_result.get("jobId") != job.get("jobId") or editorial_package.get("viewId") != view_id or editorial_package.get("jobId") != job.get("jobId"):
        raise NewsroomDatabaseWriterError("Checker, Editorial and Manager View/job identities do not match.")
    if editorial_package.get("managerJob") != job:
        raise NewsroomDatabaseWriterError("Editorial package did not preserve the exact Manager job.")
    if checker_handoff.get("managerRegistryVersion") != editorial_package.get("managerRegistryVersion") or checker_handoff.get("checkerRegistryVersion") != editorial_package.get("checkerRegistryVersion"):
        raise NewsroomDatabaseWriterError("Checker and Editorial registry versions do not match.")
    profile, db_path = _repository_contract(root, view_id, job, editorial_package)

    approved_ids = verification_result.get("approvedStoryIds")
    posts = verification_result.get("posts")
    stories = editorial_package.get("stories")
    evidence = editorial_package.get("evidence")
    checker_posts = checker_review.get("posts")
    if not all(isinstance(value, list) for value in (approved_ids, posts, stories, evidence, checker_posts)):
        raise NewsroomDatabaseWriterError("Checker approved IDs, reports, Editorial stories and evidence must be arrays.")
    if not approved_ids or len(approved_ids) != len(set(map(str, approved_ids))):
        raise NewsroomDatabaseWriterError("Checker approvedStoryIds must be a non-empty unique list.")
    post_status = {str(item.get("postId")): item for item in posts if isinstance(item, dict)}
    story_by_id = {str(item.get("postId")): item for item in stories if isinstance(item, dict)}
    evidence_by_id = {str(item.get("postId")): item for item in evidence if isinstance(item, dict)}
    checker_by_id = {str(item.get("postId")): item for item in checker_posts if isinstance(item, dict)}
    if len(post_status) != len(posts) or len(story_by_id) != len(stories) or len(evidence_by_id) != len(evidence) or len(checker_by_id) != len(checker_posts):
        raise NewsroomDatabaseWriterError("The incoming batch contains missing or duplicate post IDs.")
    if set(map(str, approved_ids)) - set(story_by_id):
        raise NewsroomDatabaseWriterError("Checker released a post ID that is absent from the Editorial package.")
    expected_pass_ids = {str(item.get("postId")) for item in posts if isinstance(item, dict) and item.get("status") == "PASS"}
    if set(map(str, approved_ids)) != expected_pass_ids:
        raise NewsroomDatabaseWriterError("approvedStoryIds does not match the exact per-story PASS decisions.")
    if not db_path.is_file():
        raise NewsroomDatabaseWriterError(f"The {view_id} Collector database is missing; run its Collector first.")
    prepared = []
    for post_id in map(str, approved_ids):
        decision = post_status.get(post_id)
        if not isinstance(decision, dict) or decision.get("status") != "PASS":
            raise NewsroomDatabaseWriterError(f"Checker did not individually PASS post '{post_id}'.")
        story = story_by_id[post_id]
        checker_record = checker_by_id.get(post_id)
        evidence_record = evidence_by_id.get(post_id)
        if (not isinstance(checker_record, dict) or checker_record.get("status") != "PASS"
                or story.get("checkerRecord") != checker_record or not isinstance(evidence_record, dict)):
            raise NewsroomDatabaseWriterError(f"Original Checker PASS record or evidence is missing or changed for '{post_id}'.")
        prepared.append(_story_record(root, view_id, job, story, checker_record, evidence_record, str(editorial_package.get("checkerRegistryVersion") or ""), package_digest, str(checker_review.get("checkedAt") or editorial_package.get("generatedAt") or _utc_now())))

    uri = "file:" + quote(db_path.as_posix(), safe="/:") + "?mode=rw"
    connection = sqlite3.connect(uri, uri=True, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout=10000")
    try:
        connection.execute("BEGIN IMMEDIATE")
        _verify_db(connection, view_id, profile)
        _ensure_table(connection)
        counts = {"inserted": 0, "updated": 0, "unchanged": 0, "older_review_ignored": 0}
        for record in prepared:
            counts[_persist_one(connection, record)] += 1
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
    return {
        "schemaVersion": 1,
        "writer": WRITER,
        "writerVersion": WRITER_VERSION,
        "phase": "database-write-complete",
        "viewId": view_id,
        "databaseId": profile.get("destinationDatabaseId"),
        "databasePath": profile.get("destinationDatabasePath"),
        "table": TABLE,
        "statistics": {"approvedStoryIdsReceived": len(approved_ids), **counts, "rowsInsertedOrUpdatedThisRun": counts["inserted"] + counts["updated"], "storyCountCap": None},
        "privacy": {"collectorStoriesTableModified": False, "rawSourceTextPersisted": False, "summaryEvidenceTextPersisted": False, "otherViewDatabaseOpened": False, "publicAssetsWritten": False, "publisherOutputWritten": False},
        "retention": {"days": 32, "automaticCountCap": None},
        "nextSystem": "Matching View Publisher v2 adapter",
        "completedAt": _utc_now(),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checker-handoff", required=True)
    parser.add_argument("--editorial-package", required=True)
    parser.add_argument("--verification-result", required=True)
    parser.add_argument("--repository-root", default=".")
    args = parser.parse_args(argv)
    try:
        handoff = json.loads(Path(args.checker_handoff).read_text(encoding="utf-8"))
        package = json.loads(Path(args.editorial_package).read_text(encoding="utf-8"))
        verification = json.loads(Path(args.verification_result).read_text(encoding="utf-8"))
        result = write_verified_editorial_stories(handoff, package, verification, repository_root=args.repository_root)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"writer": WRITER, "writerVersion": WRITER_VERSION, "phase": "database-write-blocked", "databaseWritePerformed": False, "errorType": type(exc).__name__, "message": str(exc)[:700]}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

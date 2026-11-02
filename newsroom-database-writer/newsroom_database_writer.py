#!/usr/bin/env python3
"""LIVE // EARTH View-owned Newsroom Database Writer.

Consumes only the exact GREEN approvedStories returned by the registered
Global Checker final-review adapter and writes them to a dedicated table in
that View's existing Collector-owned SQLite database.

The Writer never resets/replaces the database or modifies Collector-owned
stories. Nature and Alien World remain physically and logically isolated.
Raw source excerpts, claim text, raw article bodies and HTML are not stored.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import quote, urlsplit

WRITER_NAME = "LIVE // EARTH Newsroom Database Writer"
WRITER_VERSION = "1.0.0"
ALLOWED_VIEWS = {"nature", "alien-world"}
EXPECTED_WORKFLOW = "LIVE // EARTH Global Checker"
EXPECTED_WORKFLOW_VERSION = "2.0.0"
EXPECTED_FINAL_REVIEW_ADAPTER = "LIVE // EARTH Global Checker Final Review Adapter"
EXPECTED_FINAL_REVIEW_ADAPTER_VERSION = "1.0.0"
EXPECTED_EDITORIAL_ENGINE = "Universal Editorial Engine"
EXPECTED_EDITORIAL_CORE_VERSION = "1.3.0"
EXPECTED_EDITORIAL_ADAPTER_VERSION = "1.0.0"
APPROVED_TABLE = "newsroom_approved_stories"
REQUIRED_BASE_COLUMNS = {
    "story_id", "title", "url", "summary", "source_name", "source_url",
    "published_at", "retrieved_at", "image_url", "image_local_path",
    "image_caption", "image_credit", "image_source_url",
    "image_rights_status", "image_rights_note", "view_id",
}
RAW_FIELDS = {
    "rawText", "raw_text", "rawArticleBody", "raw_article_body",
    "sourceText", "source_text", "sourceBody", "source_body",
    "fullText", "full_text", "fullArticleText", "full_article_text",
    "rawHtml", "raw_html", "htmlBody", "originalArticleText",
    "excerpt", "claimText", "claim_text",
}


class NewsroomDatabaseWriterError(RuntimeError):
    """A final-review hand-off or database write failed a required guard."""


def _clean(value: Any, limit: int = 4000) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


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
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError as exc:
        raise NewsroomDatabaseWriterError(f"{label} is not a valid ISO-8601 timestamp.") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _canonical_https(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    try:
        parsed = urlsplit(value.strip())
        if (parsed.scheme.lower() != "https" or not parsed.hostname
                or parsed.username or parsed.password
                or parsed.port not in (None, 443)):
            return ""
        host = parsed.hostname.lower().rstrip(".")
        path = parsed.path or "/"
        query = "&".join(
            part for part in parsed.query.split("&")
            if part and not part.split("=", 1)[0].lower().startswith("utm_")
            and part.split("=", 1)[0].lower() not in {"fbclid", "gclid", "mc_cid", "mc_eid"}
        )
        return f"https://{host}{path}" + (f"?{query}" if query else "")
    except (TypeError, ValueError):
        return ""


def _find_raw_field(value: Any, where: str = "story") -> str | None:
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key) in RAW_FIELDS:
                return f"{where}.{key}"
            found = _find_raw_field(child, f"{where}.{key}")
            if found:
                return found
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found = _find_raw_field(child, f"{where}[{index}]")
            if found:
                return found
    return None


def _load_policy_context(repository_root: Path):
    checker_dir = repository_root / "global-checker"
    if not checker_dir.is_dir():
        raise NewsroomDatabaseWriterError("The Global Checker directory is missing.")
    folder = str(checker_dir.resolve())
    if folder not in sys.path:
        sys.path.insert(0, folder)
    try:
        import global_checker_workflow
        context = global_checker_workflow.RepositoryPolicies(repository_root)
    except Exception as exc:
        raise NewsroomDatabaseWriterError(
            f"Current Manager/Checker registries could not be loaded: {type(exc).__name__}: {exc}"
        ) from exc
    return context


def _validate_result(result: dict[str, Any], repository_root: Path, context: Any):
    if not isinstance(result, dict) or result.get("schemaVersion") != 1:
        raise NewsroomDatabaseWriterError("Final-review result schema is invalid.")
    if result.get("phase") != "final-editorial-review":
        raise NewsroomDatabaseWriterError("Writer requires a completed Global Checker final editorial review.")
    view_id = _clean(result.get("viewId"), 80)
    if view_id not in ALLOWED_VIEWS:
        raise NewsroomDatabaseWriterError("Final-review result has an unregistered View ID.")

    if result.get("workflow") != EXPECTED_WORKFLOW or result.get("workflowVersion") != EXPECTED_WORKFLOW_VERSION:
        raise NewsroomDatabaseWriterError("Final review does not identify the registered Global Checker workflow version.")
    if (result.get("finalReviewAdapter") != EXPECTED_FINAL_REVIEW_ADAPTER
            or result.get("finalReviewAdapterVersion") != EXPECTED_FINAL_REVIEW_ADAPTER_VERSION):
        raise NewsroomDatabaseWriterError("Final review was not produced by the registered final-review adapter.")
    editorial = result.get("editorialEngine")
    if not isinstance(editorial, dict) or editorial != {
        "name": EXPECTED_EDITORIAL_ENGINE,
        "coreVersion": EXPECTED_EDITORIAL_CORE_VERSION,
        "newsroomAdapterVersion": EXPECTED_EDITORIAL_ADAPTER_VERSION,
    }:
        raise NewsroomDatabaseWriterError("Final review does not match the registered Universal Editorial Engine versions.")

    profile = context.profiles.get(view_id)
    if not profile or profile.get("enabled") is not True:
        raise NewsroomDatabaseWriterError("The matching View Collection Profile is missing or disabled.")
    if result.get("profileId") != profile.get("profileId"):
        raise NewsroomDatabaseWriterError("Final-review profile ID does not match the active View profile.")

    registry_versions = result.get("inputRegistryVersions")
    if not isinstance(registry_versions, dict):
        raise NewsroomDatabaseWriterError("Final review is missing registry-version provenance.")
    if registry_versions.get("managerSourceRegistryVersion") != context.sources_doc.get("registryVersion"):
        raise NewsroomDatabaseWriterError("Manager Source Registry changed after final review; writing is held.")
    if registry_versions.get("globalCheckerRegistryVersion") != context.checker_registry.get("registryVersion"):
        raise NewsroomDatabaseWriterError("Global Checker Registry changed after final review; writing is held.")

    privacy = result.get("privacy")
    required_false = (
        "rawSourceTextPersisted", "evidenceExcerptsPersisted",
        "databaseOpenedOrWrittenByAdapter", "auditDatabaseWritten",
        "feedOrPdfWritten", "publisherOutputWritten",
        "imageOnlyItemsPromotedToEditorial",
    )
    if not isinstance(privacy, dict) or any(privacy.get(key) is not False for key in required_false):
        raise NewsroomDatabaseWriterError("Final-review privacy/ownership assertions are missing or unsafe.")

    approved = result.get("approvedStories")
    reviews = result.get("reviews")
    if not isinstance(approved, list) or not isinstance(reviews, list):
        raise NewsroomDatabaseWriterError("Final review must contain approvedStories and reviews arrays.")
    stats = result.get("statistics") or {}
    if stats.get("storiesApproved") != len(approved):
        raise NewsroomDatabaseWriterError("Final-review approved-story count does not match its payload.")

    review_by_story: dict[str, dict[str, Any]] = {}
    for review in reviews:
        if not isinstance(review, dict):
            raise NewsroomDatabaseWriterError("Final review contains a malformed decision record.")
        story_id = _clean(review.get("storyId"), 160)
        if not story_id or story_id in review_by_story:
            raise NewsroomDatabaseWriterError("Final-review decision identities are missing or duplicated.")
        review_by_story[story_id] = review

    expected_destinations = {
        "nature": ("nature-sqlite", ".publisher-data/nature/nature.sqlite3"),
        "alien-world": ("alien-world-sqlite", ".publisher-data/alien-world/alien-world.sqlite3"),
    }
    database_id = _clean(profile.get("destinationDatabaseId"), 120)
    relative_db = _clean(profile.get("destinationDatabasePath"), 300)
    if (database_id, relative_db) != expected_destinations[view_id]:
        raise NewsroomDatabaseWriterError("The active View profile database ID/path does not match its registered isolated destination.")
    parts = PurePosixPath(relative_db).parts
    if ("\\" in relative_db or PurePosixPath(relative_db).is_absolute()
            or any(part in ("", ".", "..") for part in parts)):
        raise NewsroomDatabaseWriterError("The active View profile has an unsafe database destination.")

    db_path = (repository_root / Path(*parts)).resolve()
    if repository_root.resolve() not in db_path.parents:
        raise NewsroomDatabaseWriterError("Resolved database path escapes the repository root.")

    return view_id, profile, db_path, approved, review_by_story


def _validate_approved_story(story: Any, view_id: str,
                             review_by_story: dict[str, dict[str, Any]],
                             registry_version: str, context: Any) -> dict[str, Any]:
    if not isinstance(story, dict):
        raise NewsroomDatabaseWriterError("An approvedStories entry is not an object.")
    raw_field = _find_raw_field(story)
    if raw_field:
        raise NewsroomDatabaseWriterError(f"Raw source/evidence text must not be persisted: {raw_field}.")

    story_id = _clean(story.get("id"), 160)
    if not story_id:
        raise NewsroomDatabaseWriterError("An approved story is missing its stable story ID.")
    review = review_by_story.get(story_id)
    if not review:
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' has no matching final-review decision.")
    if (review.get("verdict") != "GREEN"
            or review.get("approvedForStorage") is not True
            or review.get("approvedForPublisher") is not True):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' does not have an exact GREEN storage and Publisher approval.")

    checker = story.get("globalChecker")
    if not isinstance(checker, dict):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' is missing its attached Checker decision.")
    if (checker.get("verdict") != "GREEN"
            or checker.get("reviewId") != review.get("reviewId")
            or checker.get("registryVersion") != registry_version
            or review.get("registryVersion") != registry_version):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' Checker decision does not match its exact GREEN review.")
    if story.get("viewId") != view_id or review.get("viewId") != view_id:
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' crosses a View boundary.")
    if _clean(story.get("sourceRecordId"), 160) != story_id:
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' has a mismatched source-record identity.")
    checks = review.get("checks")
    if not isinstance(checks, dict):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' final review is missing its structured checks.")
    if (checks.get("sourceIdentity", {}).get("status") != "GREEN"
            or checks.get("viewAlignment", {}).get("status") != "GREEN"
            or checks.get("risk", {}).get("status") != "GREEN"
            or checks.get("textPermissions", {}).get("editorialPermissionStatus") != "allowed"):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' does not have GREEN source, View, risk and text-permission checks.")
    claim_traceability = checks.get("claimTraceability")
    if (not isinstance(claim_traceability, list) or not claim_traceability
            or any(item.get("supportStatus") != "TRACEABLE" for item in claim_traceability if isinstance(item, dict))
            or any(not isinstance(item, dict) for item in claim_traceability)):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' material-claim traceability is incomplete.")

    title = _clean(story.get("title"), 200)
    summary = _clean(story.get("summary"), 6000)
    url = _canonical_https(story.get("url"))
    source_name = _clean(story.get("sourceName"), 200)
    source_url = _canonical_https(story.get("sourceUrl"))
    policy_ref = _clean(story.get("sourcePolicyRef"), 160)
    intake_decision_id = _clean(story.get("globalCheckerIntakeDecisionId"), 200)
    if not (12 <= len(title) <= 200):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' has an invalid approved headline.")
    if len(summary) < 100 or len(summary.split()) < 16:
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' has an invalid approved editorial summary.")
    if not url or not source_url or not source_name or not policy_ref or not intake_decision_id:
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' is missing required source provenance.")
    policy = context.policies.get(policy_ref)
    if not policy or view_id not in policy.get("views", []):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' source policy is not registered for this View.")
    registered_source = next((
        source for source in context.sources.values()
        if source.get("sourceStatus") == "enabled"
        and _clean(source.get("sourceName"), 200) == source_name
        and source.get("checkerPolicyRef") == policy_ref
        and source_url in {_canonical_https(item) for item in source.get("feedUrls", [])}
    ), None)
    if not registered_source:
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' source name/feed URL does not match the current Manager Source Registry.")
    published = _parse_time(story.get("publishedAt"), f"Story '{story_id}' publication date")
    checked = _parse_time(review.get("checkedAt"), f"Story '{story_id}' Checker review date")
    if checker.get("checkedAt") != review.get("checkedAt"):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' Checker timestamp does not match its review.")

    # Only metadata/hashes are retained. Claim text and transient evidence
    # excerpts are deliberately omitted from the database record.
    evidence_ledger = story.get("evidenceLedger", [])
    if not isinstance(evidence_ledger, list):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' evidence ledger is malformed.")
    safe_evidence = []
    for item in evidence_ledger:
        if not isinstance(item, dict):
            raise NewsroomDatabaseWriterError(f"Story '{story_id}' has malformed evidence provenance.")
        excerpt_hash = _clean(item.get("excerptSha256"), 64)
        if not re.fullmatch(r"[a-f0-9]{64}", excerpt_hash):
            raise NewsroomDatabaseWriterError(f"Story '{story_id}' contains an invalid evidence hash.")
        evidence_url = _canonical_https(item.get("sourceUrl"))
        evidence_story_id = _clean(item.get("sourceRecordId"), 160)
        if (not evidence_url or evidence_url != url or item.get("sourcePolicyRef") != policy_ref
                or evidence_story_id != story_id):
            raise NewsroomDatabaseWriterError(f"Story '{story_id}' evidence provenance does not match its source record and policy.")
        safe_evidence.append({
            "sourceRecordId": evidence_story_id,
            "sourceUrl": evidence_url,
            "sourcePolicyRef": policy_ref,
            "excerptSha256": excerpt_hash,
            "tokenCoverage": item.get("tokenCoverage"),
        })

    tags = story.get("topicTags", [])
    if not isinstance(tags, list) or any(not isinstance(tag, str) for tag in tags):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' topic tags are malformed.")
    image_rights = story.get("imageRights")
    if image_rights is not None and not isinstance(image_rights, dict):
        raise NewsroomDatabaseWriterError(f"Story '{story_id}' image-rights metadata is malformed.")

    return {
        "story_id": story_id,
        "title": title,
        "url": url,
        "summary": summary,
        "source_name": source_name,
        "source_url": source_url,
        "published_at": published.timestamp(),
        "retrieved_at": checked.timestamp(),
        # The Checker approval object is a rights decision, not a local media
        # asset. Until an approved asset is explicitly handed off, publish text-only.
        "image_url": None,
        "image_local_path": None,
        "image_caption": None,
        "image_credit": None,
        "image_source_url": None,
        "image_rights_status": None,
        "image_rights_note": None,
        "view_id": view_id,
        "source_policy_ref": policy_ref,
        "global_checker_intake_decision_id": intake_decision_id,
        "checker_review_id": _clean(review.get("reviewId"), 120),
        "checker_registry_version": registry_version,
        "checker_checked_at": checked.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "editorial_engine_version": EXPECTED_EDITORIAL_CORE_VERSION,
        "editorial_adapter_version": EXPECTED_EDITORIAL_ADAPTER_VERSION,
        "evidence_ledger_json": json.dumps(safe_evidence, ensure_ascii=False, sort_keys=True),
        "topic_tags_json": json.dumps(tags, ensure_ascii=False),
        "image_rights_json": json.dumps(image_rights or {}, ensure_ascii=False, sort_keys=True),
        "approved_at": _utc_now(),
    }


def _verify_database(connection: sqlite3.Connection, view_id: str, profile: dict[str, Any]) -> None:
    tables = {row[0] for row in connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    if "publisher_meta" not in tables or "stories" not in tables:
        raise NewsroomDatabaseWriterError("The Collector-owned View database schema is missing; run its Collector first.")
    meta = {str(row[0]): str(row[1]) for row in connection.execute(
        "SELECT key,value FROM publisher_meta"
    ).fetchall()}
    if meta.get("view_id") != view_id:
        raise NewsroomDatabaseWriterError("Refusing to write: SQLite metadata does not identify the requested View.")
    expected_publisher = "nature-publisher" if view_id == "nature" else "alien-world-publisher"
    if meta.get("publisher_id") and meta.get("publisher_id") != expected_publisher:
        raise NewsroomDatabaseWriterError("Refusing to write: database Publisher identity belongs to a different View.")

    story_columns = {row[1] for row in connection.execute("PRAGMA table_info(stories)").fetchall()}
    missing = sorted(REQUIRED_BASE_COLUMNS - story_columns)
    if missing:
        raise NewsroomDatabaseWriterError(
            "Collector-owned stories table is not compatible with the registered View schema: " + ", ".join(missing)
        )
    if profile.get("viewId") != view_id:
        raise NewsroomDatabaseWriterError("Active profile View identity mismatch.")


def _ensure_approved_table(connection: sqlite3.Connection) -> None:
    existing = connection.execute(
        "SELECT type FROM sqlite_master WHERE name=?", (APPROVED_TABLE,)
    ).fetchone()
    if existing and existing[0] != "table":
        raise NewsroomDatabaseWriterError("The approved Newsroom destination exists but is not a table.")
    connection.execute(f"""CREATE TABLE IF NOT EXISTS {APPROVED_TABLE} (
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
    columns = {row[1] for row in connection.execute(f"PRAGMA table_info({APPROVED_TABLE})").fetchall()}
    expected = {
        "view_id", "story_id", "url", "title", "summary", "source_name", "source_url",
        "published_at", "retrieved_at", "image_url", "image_local_path", "image_caption",
        "image_credit", "image_source_url", "image_rights_status", "image_rights_note",
        "source_policy_ref", "global_checker_intake_decision_id", "checker_review_id",
        "checker_registry_version", "checker_checked_at", "editorial_engine_version",
        "editorial_adapter_version", "evidence_ledger_json", "topic_tags_json",
        "image_rights_json", "approved_at",
    }
    if not expected.issubset(columns):
        raise NewsroomDatabaseWriterError("Existing approved Newsroom table has an incompatible schema; no automatic reset is allowed.")
    connection.execute(
        f"CREATE INDEX IF NOT EXISTS idx_{APPROVED_TABLE}_published "
        f"ON {APPROVED_TABLE}(view_id, published_at DESC)"
    )


def _persist_one(connection: sqlite3.Connection, record: dict[str, Any]) -> str:
    by_story = connection.execute(
        f"SELECT url,checker_review_id,checker_checked_at FROM {APPROVED_TABLE} WHERE view_id=? AND story_id=?",
        (record["view_id"], record["story_id"]),
    ).fetchone()
    by_url = connection.execute(
        f"SELECT story_id FROM {APPROVED_TABLE} WHERE view_id=? AND url=?",
        (record["view_id"], record["url"]),
    ).fetchone()
    if by_url and by_url[0] != record["story_id"]:
        raise NewsroomDatabaseWriterError("Canonical URL is already assigned to a different approved story identity.")
    if by_story:
        if by_story[0] != record["url"]:
            raise NewsroomDatabaseWriterError("Story ID is already assigned to a different source URL.")
        if by_story[1] == record["checker_review_id"]:
            return "unchanged"
        if str(record["checker_checked_at"]) <= str(by_story[2]):
            return "older_review_ignored"
        assignments = [
            "title", "summary", "source_name", "source_url", "published_at", "retrieved_at",
            "image_url", "image_local_path", "image_caption", "image_credit", "image_source_url",
            "image_rights_status", "image_rights_note", "source_policy_ref",
            "global_checker_intake_decision_id", "checker_review_id", "checker_registry_version",
            "checker_checked_at", "editorial_engine_version", "editorial_adapter_version",
            "evidence_ledger_json", "topic_tags_json", "image_rights_json", "approved_at",
        ]
        connection.execute(
            f"UPDATE {APPROVED_TABLE} SET " + ",".join(f"{column}=?" for column in assignments)
            + " WHERE view_id=? AND story_id=?",
            tuple(record[column] for column in assignments) + (record["view_id"], record["story_id"]),
        )
        return "updated"

    columns = list(record.keys())
    connection.execute(
        f"INSERT INTO {APPROVED_TABLE} (" + ",".join(columns) + ") VALUES ("
        + ",".join("?" for _ in columns) + ")",
        tuple(record[column] for column in columns),
    )
    return "inserted"


def write_approved_stories(final_review: dict[str, Any], *, repository_root: str | Path) -> dict[str, Any]:
    """Validate and write only exact GREEN approvals into the correct View table."""
    root = Path(repository_root).resolve()
    context = _load_policy_context(root)
    view_id, profile, db_path, approved, review_by_story = _validate_result(final_review, root, context)
    registry_version = context.checker_registry.get("registryVersion")

    prepared: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    for story in approved:
        record = _validate_approved_story(story, view_id, review_by_story, registry_version, context)
        if record["story_id"] in seen_ids or record["url"] in seen_urls:
            raise NewsroomDatabaseWriterError("ApprovedStories contains a duplicate story ID or canonical URL.")
        seen_ids.add(record["story_id"])
        seen_urls.add(record["url"])
        prepared.append(record)

    if not db_path.is_file():
        raise NewsroomDatabaseWriterError(
            f"The {view_id} Collector database is not present at its registered path. Run the View Collector first."
        )
    uri = "file:" + quote(db_path.as_posix(), safe="/:") + "?mode=rw"
    connection = sqlite3.connect(uri, uri=True, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout=10000")
    try:
        connection.execute("BEGIN IMMEDIATE")
        _verify_database(connection, view_id, profile)
        _ensure_approved_table(connection)
        counts = {"inserted": 0, "updated": 0, "unchanged": 0, "older_review_ignored": 0}
        for record in prepared:
            outcome = _persist_one(connection, record)
            counts[outcome] += 1
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    return {
        "schemaVersion": 1,
        "writer": WRITER_NAME,
        "writerVersion": WRITER_VERSION,
        "phase": "database-write-complete",
        "viewId": view_id,
        "databaseId": profile.get("destinationDatabaseId"),
        "databasePath": profile.get("destinationDatabasePath"),
        "table": APPROVED_TABLE,
        "statistics": {
            "approvedStoriesReceived": len(approved),
            **counts,
            "rowsInsertedOrUpdatedThisRun": counts["inserted"] + counts["updated"],
        },
        "privacy": {
            "rawSourceTextPersisted": False,
            "evidenceExcerptsPersisted": False,
            "claimTextPersisted": False,
            "collectorStoriesTableModified": False,
            "publisherOutputWritten": False,
            "otherViewDatabaseOpened": False,
        },
        "nextSystem": "Matching View Publisher integration",
        "completedAt": _utc_now(),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--final-review", required=True,
                        help="JSON output from global_checker_final_review.py")
    parser.add_argument("--repository-root", default=".", help="LIVE // EARTH repository root")
    args = parser.parse_args(argv)
    try:
        payload = json.loads(Path(args.final_review).read_text(encoding="utf-8"))
        result = write_approved_stories(payload, repository_root=args.repository_root)
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        json.dump({
            "writer": WRITER_NAME,
            "writerVersion": WRITER_VERSION,
            "phase": "database-write-blocked",
            "databaseWritePerformed": False,
            "errorType": type(exc).__name__,
            "message": str(exc)[:600],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

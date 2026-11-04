#!/usr/bin/env python3
"""LIVE // EARTH independent Global Checker report archive.

Stores completed 13-section reports as immutable, per-run JSON records in a
View-isolated directory. Raw full-article text is replaced by a SHA-256 and
word-count receipt; no View database is opened or modified.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ARCHIVE_VERSION = "1.0.0"
REQUIRED_SECTION_COUNT = 13
VALID_VIEWS = {"nature", "alien-world"}
RAW_TEXT_KEYS = {"text", "fulltext", "fullarticletext", "articletext", "rawtext", "articlebody", "body"}


class CheckerArchiveError(RuntimeError):
    pass


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _safe_component(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "")).strip("-._")
    return cleaned[:100] or fallback


def _section_keys(report: dict[str, Any]) -> list[str]:
    sections = report.get("sections")
    order = report.get("sectionOrder")
    if not isinstance(sections, dict) or not isinstance(order, list):
        raise CheckerArchiveError("Report must contain sections and sectionOrder.")
    if len(order) != REQUIRED_SECTION_COUNT:
        raise CheckerArchiveError(f"Expected exactly 13 section-order entries; received {len(order)}.")
    if len(set(order)) != REQUIRED_SECTION_COUNT:
        raise CheckerArchiveError("Section order contains duplicate entries.")
    missing = [key for key in order if key not in sections]
    if missing:
        raise CheckerArchiveError("Report is missing ordered sections: " + ", ".join(missing))
    if len(sections) != REQUIRED_SECTION_COUNT:
        raise CheckerArchiveError("Report must contain exactly 13 sections; refusing partial or unexpected report.")
    return list(order)


def _redact_full_article(section2: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Remove article-body fields from Section 2 while retaining integrity receipts."""
    safe = copy.deepcopy(section2)
    receipts: list[dict[str, Any]] = []
    posts = safe.get("posts")
    if isinstance(posts, list):
        for index, item in enumerate(posts):
            if not isinstance(item, dict):
                continue
            article = item.get("fullArticle") if isinstance(item.get("fullArticle"), dict) else item
            post_id = str(item.get("postId") or item.get("id") or f"section2-record-{index + 1}")
            for key in list(article.keys()):
                if str(key).casefold() in RAW_TEXT_KEYS:
                    raw = article.pop(key)
                    if isinstance(raw, str) and raw:
                        receipts.append({"postId": post_id, "field": key, "sha256": _sha256_text(raw), "wordCount": len(raw.split())})
    else:
        # Some report versions key Section 2 records by post ID rather than posts[].
        for post_id, item in list(safe.items()):
            if not isinstance(item, dict):
                continue
            article = item.get("fullArticle") if isinstance(item.get("fullArticle"), dict) else item
            for key in list(article.keys()):
                if str(key).casefold() in RAW_TEXT_KEYS:
                    raw = article.pop(key)
                    if isinstance(raw, str) and raw:
                        receipts.append({"postId": str(post_id), "field": key, "sha256": _sha256_text(raw), "wordCount": len(raw.split())})
    return safe, receipts


def _archive_safe_copy(report: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    safe = copy.deepcopy(report)
    sections = safe["sections"]
    section2_key = "fullArticle"
    if section2_key not in sections or not isinstance(sections[section2_key], dict):
        raise CheckerArchiveError("Section 2 fullArticle is missing or malformed.")
    safe_section2, receipts = _redact_full_article(sections[section2_key])
    sections[section2_key] = safe_section2
    # Remove machine-local image staging paths from the durable archive. The
    # approved URL, SHA-256, source and rights evidence remain available.
    def scrub_staging(node: Any) -> None:
        if isinstance(node, dict):
            for key in list(node):
                if key.casefold() in {"stagedpath", "privateprocessingpath", "localtemppath"}:
                    node.pop(key, None)
                else:
                    scrub_staging(node[key])
        elif isinstance(node, list):
            for child in node:
                scrub_staging(child)
    scrub_staging(safe)
    return safe, receipts


def archive_report(report: dict[str, Any], archive_root: str | Path, view: str) -> dict[str, Any]:
    """Validate and atomically archive a complete report. Never writes a View DB."""
    if view not in VALID_VIEWS:
        raise CheckerArchiveError(f"Unsupported View '{view}'.")
    if not isinstance(report, dict):
        raise CheckerArchiveError("Checker report must be an object.")
    section_order = _section_keys(report)
    sections = report["sections"]
    if "liveFeedOutput" not in sections or "postEditorialFinalVerification" not in sections:
        raise CheckerArchiveError("Report must include Editor Section 12 and Checker Section 13.")
    section13 = sections["postEditorialFinalVerification"]
    if not isinstance(section13, dict) or section13.get("section") != 13:
        raise CheckerArchiveError("Section 13 is missing its expected section number.")

    safe_report, source_receipts = _archive_safe_copy(report)
    now = _utc_now()
    job_id = _safe_component(str(report.get("jobId") or "job-unknown"), "job-unknown")
    report_id = _safe_component(str(report.get("reportId") or f"{job_id}-{now.strftime('%Y%m%dT%H%M%SZ')}"), "report")
    record = {
        "archiveSchemaVersion": ARCHIVE_VERSION,
        "recordType": "global-checker-final-report",
        "reportId": report_id,
        "view": view,
        "archivedAt": now.isoformat().replace("+00:00", "Z"),
        "jobId": report.get("jobId", ""),
        "viewId": report.get("viewId", view),
        "checkerVersion": report.get("checkerVersion", ""),
        "sectionCount": REQUIRED_SECTION_COUNT,
        "sectionOrder": section_order,
        "sourceArticleIntegrityReceipts": source_receipts,
        "report": safe_report,
        "archivePolicy": {
            "rawFullArticleTextStored": False,
            "rawArticleTextReplacedWithSha256AndWordCount": True,
            "localImageStagingPathsStored": False,
            "viewDatabaseAccessed": False,
            "viewDatabaseWritten": False,
            "publicationPerformed": False,
            "retentionDays": 32,
        },
    }
    root = Path(archive_root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    destination = root / f"{report_id}.json"
    if destination.exists():
        raise CheckerArchiveError(f"Archive record already exists; refusing overwrite: {destination.name}")
    encoded = json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2).encode("utf-8")
    fd, temporary_name = tempfile.mkstemp(prefix=".pending-", suffix=".json", dir=root)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, destination)
    except Exception:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise
    return {"archived": True, "reportId": report_id, "view": view, "path": str(destination), "bytes": len(encoded), "sourceArticleReceipts": len(source_receipts)}


def prune_archive(archive_root: str | Path, retention_days: int = 32, now: datetime | None = None) -> dict[str, int]:
    """Prune only this archive's own JSON records; never touches DB/media/feed data."""
    if retention_days < 1 or retention_days > 365:
        raise CheckerArchiveError("Retention must be between 1 and 365 days.")
    root = Path(archive_root).resolve()
    if not root.exists():
        return {"scanned": 0, "deleted": 0}
    if root.is_symlink() or not root.is_dir():
        raise CheckerArchiveError("Archive root must be a real directory, not a symlink.")
    cutoff = (now or _utc_now()) - timedelta(days=retention_days)
    scanned = deleted = 0
    for path in root.glob("*.json"):
        scanned += 1
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
            archived_at = datetime.fromisoformat(str(record.get("archivedAt", "")).replace("Z", "+00:00"))
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            # Unknown/corrupt records are preserved for manual recovery.
            continue
        if archived_at.tzinfo is None:
            archived_at = archived_at.replace(tzinfo=timezone.utc)
        if archived_at < cutoff and record.get("recordType") == "global-checker-final-report":
            path.unlink()
            deleted += 1
    return {"scanned": scanned, "deleted": deleted}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--view", choices=sorted(VALID_VIEWS), required=True)
    parser.add_argument("--archive-root", required=True)
    parser.add_argument("--input", required=True, help="Path to a completed 13-section report JSON")
    args = parser.parse_args()
    report = json.loads(Path(args.input).read_text(encoding="utf-8"))
    print(json.dumps(archive_report(report, args.archive_root, args.view), ensure_ascii=False, indent=2))
    print(json.dumps({"retention": prune_archive(args.archive_root, 32)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

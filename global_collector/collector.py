"""Universal collection orchestrator: one engine, one record schema, every View."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
import json

from . import __version__
from .errors import GlobalCollectorError
from .job_contract import JobContract
from .parsers import parse_payload
from .security import fetch
from .universal_post import UNIVERSAL_POST_FIELDS, normalize_post, utc_now

MAX_ARTICLE_PAGE_FETCHES_PER_JOB = 100


def _within_window(value: str, window_hours: int, now: datetime) -> bool:
    """Apply the Manager-requested collection window; unknown dates are retained."""
    if not value:
        return True
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc) >= now - timedelta(hours=window_hours)
    except (ValueError, TypeError):
        return True


def _merge_post(existing: dict[str, Any], incoming: dict[str, Any]) -> None:
    """Merge duplicate discoveries while keeping the universal record shape."""
    for key in ("media", "attachments", "links", "categories", "tags", "topics", "contributors"):
        left = existing.get(key, [])
        right = incoming.get(key, [])
        if isinstance(left, list) and isinstance(right, list):
            seen = {json.dumps(x, sort_keys=True, ensure_ascii=False, default=str) for x in left}
            for value in right:
                marker = json.dumps(value, sort_keys=True, ensure_ascii=False, default=str)
                if marker not in seen:
                    left.append(value)
                    seen.add(marker)
    # Fill missing scalar fields with available metadata; never overwrite populated values.
    for key in UNIVERSAL_POST_FIELDS:
        if key in {"media", "attachments", "links", "categories", "tags", "topics", "contributors", "sourceMetadata", "collectionContext"}:
            continue
        if existing.get(key) in (None, "", {}) and incoming.get(key) not in (None, "", {}):
            existing[key] = incoming[key]
    sources = existing.setdefault("provenance", {})
    incoming_provenance = incoming.get("provenance", {})
    if isinstance(sources, dict) and isinstance(incoming_provenance, dict):
        urls = sources.setdefault("alsoFoundInFeeds", [])
        candidate = incoming_provenance.get("feedUrl")
        if candidate and candidate not in urls:
            urls.append(candidate)
    # Keep every original discovery rather than dropping source-specific metadata.
    raw = existing.setdefault("sourceMetadata", {})
    if not isinstance(raw, dict):
        raw = {"primary": raw}
        existing["sourceMetadata"] = raw
    discoveries = raw.setdefault("additionalDiscoveries", [])
    incoming_raw = incoming.get("sourceMetadata", {})
    if incoming_raw and incoming_raw != raw.get("primary") and incoming_raw not in discoveries:
        discoveries.append(incoming_raw)


def _enrich_from_article_page(item: dict[str, Any], *, cache: dict[str, Any]) -> dict[str, Any]:
    """Collect additional page-level post information without making decisions.

    Feed fields remain the original record. Missing detail is filled from the
    linked public HTTPS page; available full text and media are retained.
    """
    article_url = str(item.get("canonicalUrl") or item.get("url") or item.get("link") or "").strip()
    if not article_url.startswith("https://"):
        return item
    if article_url not in cache and len(cache) >= MAX_ARTICLE_PAGE_FETCHES_PER_JOB:
        return {**item, "articlePageFetch": {"status": "limit-reached", "limit": MAX_ARTICLE_PAGE_FETCHES_PER_JOB}}
    if article_url not in cache:
        try:
            response = fetch(article_url, timeout_seconds=12, max_bytes=2 * 1024 * 1024, retries=0)
            page_items, page_format = parse_payload(response.payload, response.content_type, response.final_url)
            cache[article_url] = (page_items[0] if page_items else {}, {
                "status": "collected", "requestedUrl": response.requested_url,
                "finalUrl": response.final_url, "httpStatus": response.status_code,
                "contentType": response.content_type, "etag": response.headers.get("etag", ""),
                "lastModified": response.headers.get("last-modified", ""),
                "detectedFormat": page_format, "fetchedAt": utc_now(),
            })
        except Exception as exc:
            cache[article_url] = ({}, {"status": "unavailable", "errorType": type(exc).__name__, "message": str(exc)[:300]})
    page_item, evidence = cache[article_url]
    result = dict(item)
    if page_item:
        for field in ("subtitle", "author", "authorName", "authorId", "authorUrl", "publishedAt", "updatedAt", "language", "location", "rightsMetadata"):
            if result.get(field) in (None, "", [], {}):
                if page_item.get(field) not in (None, "", [], {}):
                    result[field] = page_item[field]
        # Page text is a richer representation than an absent/short feed excerpt.
        if page_item.get("fullText"):
            result["fullText"] = page_item["fullText"]
        if page_item.get("fullTextHtml"):
            result["fullTextHtml"] = page_item["fullTextHtml"]
        for field in ("media", "attachments", "links", "categories", "tags", "topics"):
            left = result.setdefault(field, [])
            right = page_item.get(field, [])
            if not isinstance(left, list): left = [left]
            if not isinstance(right, list): right = [right]
            seen = {json.dumps(value, sort_keys=True, ensure_ascii=False, default=str) for value in left}
            for value in right:
                marker = json.dumps(value, sort_keys=True, ensure_ascii=False, default=str)
                if marker not in seen:
                    left.append(value)
                    seen.add(marker)
            result[field] = left
    original_metadata = result.get("sourceMetadata", {})
    result["sourceMetadata"] = {
        "feedRecord": original_metadata,
        "articlePage": page_item.get("sourceMetadata", {}) if page_item else {},
        "articlePageFetch": evidence,
    }
    result["articlePageFetch"] = evidence
    return result


class GlobalCollector:
    """One View-scoped job at a time; implementation is not View-specific."""

    def __init__(self, repository_root: Path):
        self.repository_root = Path(repository_root).resolve()
        self.contract = JobContract(self.repository_root)

    def collect(self, job: dict[str, Any]) -> dict[str, Any]:
        validated = self.contract.validate(job)
        view_id = job["viewId"]
        started_at = utc_now()
        now_dt = datetime.now(timezone.utc)
        collected_at = started_at
        records_by_id: dict[str, dict[str, Any]] = {}
        source_results = []
        errors = []
        article_page_cache: dict[str, Any] = {}

        for feed_url in sorted(job["feedUrls"]):
            source = validated["sourceByFeedUrl"][feed_url]
            assignment = validated["assignmentByFeedUrl"][feed_url]
            result = {
                "sourceId": source["sourceId"],
                "sourceName": source.get("sourceName", ""),
                "assignmentId": assignment["assignmentId"],
                "feedUrl": feed_url,
                "connectorHint": source.get("connectorType", "auto"),
                "detectedFormat": "",
                "status": "pending",
                "attempts": 0,
                "postsDiscovered": 0,
                "postsCollected": 0,
                "articlePagesEnriched": 0,
            }
            try:
                fetched = fetch(feed_url)
                result["attempts"] = fetched.attempts
                items, detected_format = parse_payload(fetched.payload, fetched.content_type, fetched.final_url)
                result["detectedFormat"] = detected_format
                result["postsDiscovered"] = len(items)
                result["httpStatus"] = fetched.status_code
                result["contentType"] = fetched.content_type
                result["finalUrl"] = fetched.final_url
                result["etag"] = fetched.headers.get("etag", "")
                result["lastModified"] = fetched.headers.get("last-modified", "")
                fetch_evidence = {
                    "requestedUrl": fetched.requested_url,
                    "finalUrl": fetched.final_url,
                    "fetchedAt": collected_at,
                    "httpStatus": fetched.status_code,
                    "contentType": fetched.content_type,
                    "etag": fetched.headers.get("etag", ""),
                    "lastModified": fetched.headers.get("last-modified", ""),
                }
                max_items = int((assignment.get("limits") or {}).get("maxItemsPerRun", 0) or 0)
                collected_for_feed = 0
                for raw_item in items:
                    if not isinstance(raw_item, dict):
                        continue
                    # Apply only the Manager's explicit time window and item limit
                    # before doing optional per-post page enrichment.
                    published = raw_item.get("publishedAt") or raw_item.get("published") or raw_item.get("pubDate") or raw_item.get("date_published") or ""
                    if not _within_window(str(published), int(job["requestWindowHours"]), now_dt):
                        continue
                    if max_items > 0 and collected_for_feed >= max_items:
                        break
                    raw_format = (raw_item.get("sourceMetadata") or {}).get("format") if isinstance(raw_item.get("sourceMetadata"), dict) else ""
                    if raw_format != "html":
                        raw_item = _enrich_from_article_page(raw_item, cache=article_page_cache)
                        if raw_item.get("articlePageFetch", {}).get("status") == "collected":
                            result["articlePagesEnriched"] += 1
                    post = normalize_post(
                        raw_item,
                        view_id=view_id,
                        source=source,
                        feed_url=feed_url,
                        job=job,
                        collected_at=collected_at,
                        format_name=detected_format,
                        fetch_evidence=fetch_evidence,
                    )
                    post["provenance"]["assignmentId"] = assignment["assignmentId"]
                    if post["postId"] in records_by_id:
                        _merge_post(records_by_id[post["postId"]], post)
                    else:
                        records_by_id[post["postId"]] = post
                    collected_for_feed += 1
                result["postsCollected"] = collected_for_feed
                result["status"] = "succeeded"
            except Exception as exc:
                result["status"] = "failed"
                result["errorType"] = type(exc).__name__
                result["error"] = str(exc)[:500]
                errors.append({
                    "sourceId": source["sourceId"],
                    "assignmentId": assignment["assignmentId"],
                    "feedUrl": feed_url,
                    "errorType": type(exc).__name__,
                    "message": str(exc)[:500],
                })
            source_results.append(result)

        records = list(records_by_id.values())
        succeeded = sum(1 for item in source_results if item["status"] == "succeeded")
        failed = len(source_results) - succeeded
        if succeeded == len(source_results):
            status = "succeeded"
        elif succeeded:
            status = "partial"
        else:
            status = "failed"

        return {
            "schemaVersion": 1,
            "collector": "LIVE // EARTH Global Collector",
            "collectorVersion": __version__,
            "recordSchema": "LIVE_EARTH_UNIVERSAL_POST_V1",
            "recordFields": list(UNIVERSAL_POST_FIELDS),
            "job": dict(job),
            "routing": {
                "viewId": view_id,
                "profileId": job["profileId"],
                "destinationDatabaseId": job["destinationDatabaseId"],
                "destinationDatabasePath": job["destinationDatabasePath"],
                "collectorEntrypoint": job["collectorEntrypoint"],
                "collectorWorkflow": job["collectorWorkflow"],
            },
            "managerRegistryVersion": validated["managerRegistryVersion"],
            "status": status,
            "startedAt": started_at,
            "finishedAt": utc_now(),
            "statistics": {
                "feedsTotal": len(source_results),
                "feedsSucceeded": succeeded,
                "feedsFailed": failed,
                "postsDiscovered": sum(item["postsDiscovered"] for item in source_results),
                "postsCollected": len(records),
                "articlePagesEnriched": sum(item["articlePagesEnriched"] for item in source_results),
                "mediaItemsCollected": sum(len(item["media"]) + len(item["attachments"]) for item in records),
                "fieldsPerPost": len(UNIVERSAL_POST_FIELDS),
            },
            "sources": source_results,
            "records": records,
            "errors": errors,
            "handoff": {
                "nextSystem": "Global Checker",
                "collectorMakesRightsDecisions": False,
                "collectorMakesEditorialDecisions": False,
                "collectorFiltersContentByRights": False,
                "checkerMustEvaluateDownstream": True,
                "databaseWritesPerformed": False,
                "publicationPerformed": False,
            },
        }

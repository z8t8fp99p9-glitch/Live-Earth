"""Universal collection orchestrator: one engine, one record schema, every View."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
import hashlib
import json
import re

from . import __version__
from .job_contract import JobContract
from .parsers import parse_payload
from .security import fetch
from .universal_post import UNIVERSAL_POST_FIELDS, normalize_post, utc_now

MAX_ARTICLE_PAGE_FETCHES_PER_JOB = 100
MAX_CONTINUATION_PAGES_PER_POST = 5

def _within_window(value: str, window_hours: int, now: datetime) -> bool:
    """Apply the Manager-requested time window; unknown dates are retained."""
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
    for key in ("media", "attachments", "links"):
        existing[key] = _merge_by_url(existing.get(key, []), incoming.get(key, []))
    for key in ("categories", "tags", "topics", "contributors"):
        left = existing.get(key, [])
        right = incoming.get(key, [])
        if isinstance(left, list) and isinstance(right, list):
            seen = {json.dumps(x, sort_keys=True, ensure_ascii=False, default=str) for x in left}
            for value in right:
                marker = json.dumps(value, sort_keys=True, ensure_ascii=False, default=str)
                if marker not in seen:
                    left.append(value)
                    seen.add(marker)
    for key in UNIVERSAL_POST_FIELDS:
        if key in {"media", "attachments", "links", "categories", "tags", "topics", "contributors", "sourceMetadata", "collectionContext", "fullText", "fullTextHtml", "rightsMetadata"}:
            continue
        if existing.get(key) in (None, "", {}) and incoming.get(key) not in (None, "", {}):
            existing[key] = incoming[key]
    existing["fullText"] = _combine_text([existing.get("fullText", ""), incoming.get("fullText", "")])
    existing["fullTextHtml"] = "\n".join(dict.fromkeys(
        value for value in (existing.get("fullTextHtml", ""), incoming.get("fullTextHtml", "")) if value
    ))
    existing_rights = existing.get("rightsMetadata") if isinstance(existing.get("rightsMetadata"), dict) else {}
    incoming_rights = incoming.get("rightsMetadata") if isinstance(incoming.get("rightsMetadata"), dict) else {}
    for key, value in incoming_rights.items():
        if existing_rights.get(key) in (None, "", [], {}) and value not in (None, "", [], {}):
            existing_rights[key] = value
        elif key == "metadata" and isinstance(value, dict) and isinstance(existing_rights.get(key), dict):
            for meta_key, meta_value in value.items():
                if existing_rights[key].get(meta_key) in (None, "", [], {}):
                    existing_rights[key][meta_key] = meta_value
    existing["rightsMetadata"] = existing_rights
    sources = existing.setdefault("provenance", {})
    incoming_provenance = incoming.get("provenance", {})
    if isinstance(sources, dict) and isinstance(incoming_provenance, dict):
        urls = sources.setdefault("alsoFoundInFeeds", [])
        candidate = incoming_provenance.get("feedUrl")
        if candidate and candidate not in urls:
            urls.append(candidate)
    raw = existing.setdefault("sourceMetadata", {})
    if not isinstance(raw, dict):
        raw = {"primary": raw}
        existing["sourceMetadata"] = raw
    discoveries = raw.setdefault("additionalDiscoveries", [])
    incoming_raw = incoming.get("sourceMetadata", {})
    if incoming_raw and incoming_raw != raw.get("primary") and incoming_raw not in discoveries:
        discoveries.append(incoming_raw)


def _article_continuation_count(item: dict[str, Any]) -> int:
    links = item.get("links", [])
    if not isinstance(links, list):
        return 0
    return sum(1 for link in links if isinstance(link, dict)
               and link.get("relation") == "article-continuation-candidate")


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str)


def _sha256(value: Any) -> str:
    return hashlib.sha256(_canonical_json(value).encode("utf-8")).hexdigest()


def _same_source_family(left_url: str, right_url: str) -> bool:
    """Keep continuation traversal on the originating site's host family."""
    from urllib.parse import urlsplit
    left = (urlsplit(left_url).hostname or "").lower().rstrip(".")
    right = (urlsplit(right_url).hostname or "").lower().rstrip(".")
    if not left or not right:
        return False
    if left == right or left.endswith("." + right) or right.endswith("." + left):
        return True
    compound_suffixes = {"co.uk", "org.uk", "com.au", "net.au", "co.nz", "co.jp", "com.br", "co.in"}
    def registrable_hint(host: str) -> str:
        labels = host.split(".")
        suffix = ".".join(labels[-2:]) if len(labels) >= 2 else host
        if suffix in compound_suffixes and len(labels) >= 3:
            return ".".join(labels[-3:])
        return suffix
    return registrable_hint(left) == registrable_hint(right)


def _fetch_article_page(url: str, *, cache: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    if url in cache:
        return cache[url]
    if len(cache) >= MAX_ARTICLE_PAGE_FETCHES_PER_JOB:
        return {}, {"status": "limit-reached", "limit": MAX_ARTICLE_PAGE_FETCHES_PER_JOB,
                    "requestedUrl": url, "fetchedAt": utc_now()}
    try:
        response = fetch(url, timeout_seconds=12, max_bytes=2 * 1024 * 1024, retries=0)
        page_items, page_format = parse_payload(response.payload, response.content_type, response.final_url)
        page_item = page_items[0] if page_items else {}
        evidence = {
            "status": "collected", "requestedUrl": response.requested_url,
            "finalUrl": response.final_url, "httpStatus": response.status_code,
            "contentType": response.content_type, "etag": response.headers.get("etag", ""),
            "lastModified": response.headers.get("last-modified", ""),
            "detectedFormat": page_format, "fetchedAt": utc_now(),
        }
        cache[url] = (page_item, evidence)
    except Exception as exc:
        cache[url] = ({}, {"status": "unavailable", "requestedUrl": url,
                         "errorType": type(exc).__name__, "message": str(exc)[:300],
                         "fetchedAt": utc_now()})
    return cache[url]


def _merge_unique_values(left: Any, right: Any) -> list[Any]:
    left_values = left if isinstance(left, list) else ([left] if left not in (None, "") else [])
    right_values = right if isinstance(right, list) else ([right] if right not in (None, "") else [])
    result = []
    seen = set()
    for value in left_values + right_values:
        marker = _canonical_json(value)
        if marker not in seen:
            result.append(value)
            seen.add(marker)
    return result


def _merge_by_url(left: Any, right: Any) -> list[Any]:
    """Deduplicate media/link records by URL while filling missing evidence."""
    left_values = left if isinstance(left, list) else ([left] if left else [])
    right_values = right if isinstance(right, list) else ([right] if right else [])
    result: list[Any] = []
    positions: dict[str, int] = {}
    for value in left_values + right_values:
        if not isinstance(value, dict):
            key = str(value)
            candidate = {"url": key}
        else:
            candidate = dict(value)
            key = str(candidate.get("url") or candidate.get("href") or candidate.get("finalUrl")
                      or candidate.get("requestedUrl") or _canonical_json(candidate))
        if key not in positions:
            positions[key] = len(result)
            result.append(candidate)
            continue
        prior = result[positions[key]]
        if not isinstance(prior, dict):
            continue
        for field, detail in candidate.items():
            if field == "metadata" and isinstance(detail, dict):
                metadata = prior.setdefault("metadata", {})
                if isinstance(metadata, dict):
                    for meta_key, meta_value in detail.items():
                        if metadata.get(meta_key) in (None, "", [], {}):
                            metadata[meta_key] = meta_value
            elif prior.get(field) in (None, "", [], {}) and detail not in (None, "", [], {}):
                prior[field] = detail
    return result


def _combine_text(values: list[str]) -> str:
    """Join distinct source text segments without duplicating identical page bodies."""
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        text_value = str(value or "").strip()
        if not text_value:
            continue
        marker = " ".join(text_value.casefold().split())
        if marker in seen:
            continue
        # Avoid appending a smaller feed/page excerpt that is already wholly present.
        if any(marker in existing or existing in marker for existing in seen if marker and existing):
            if any(len(existing) >= len(marker) and marker in existing for existing in seen):
                continue
        seen.add(marker)
        result.append(text_value)
    return "\n\n".join(result)


def _page_section(url: str, page_item: dict[str, Any], evidence: dict[str, Any]) -> dict[str, Any]:
    source_meta = page_item.get("sourceMetadata", {})
    return {
        "requestedUrl": evidence.get("requestedUrl", url),
        "finalUrl": evidence.get("finalUrl", url),
        "httpStatus": evidence.get("httpStatus", ""),
        "contentType": evidence.get("contentType", ""),
        "detectedFormat": evidence.get("detectedFormat", ""),
        "fetchedAt": evidence.get("fetchedAt", ""),
        "retrievalStatus": evidence.get("status", "not-fetched"),
        "title": page_item.get("title", ""),
        "subtitle": page_item.get("subtitle", ""),
        "author": page_item.get("author") or page_item.get("authorName", ""),
        "publishedAt": page_item.get("publishedAt", ""),
        "updatedAt": page_item.get("updatedAt", ""),
        "fullText": page_item.get("fullText", ""),
        "fullTextHtml": page_item.get("fullTextHtml", ""),
        "rightsMetadata": page_item.get("rightsMetadata", {}),
        "sourceMetadata": source_meta if isinstance(source_meta, dict) else {"raw": source_meta},
    }


def _enrich_from_article_page(
    item: dict[str, Any], *, cache: dict[str, Any], already_parsed: bool = False
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Fetch the linked article and clearly identified continuation pages.

    No rights or editorial decision is made here. Retrieved article text and all
    provider metadata stay in the in-memory handoff for Global Checker. The
    Checker decides which parts can be processed, transformed, stored or shown.
    """
    article_url = str(item.get("canonicalUrl") or item.get("url") or item.get("link") or "").strip()
    if not article_url.startswith("https://"):
        return item, []

    result = dict(item)
    pages: list[dict[str, Any]] = []
    page_items: list[dict[str, Any]] = []
    if already_parsed:
        main_page = item
        main_evidence = {"status": "provided-in-feed", "requestedUrl": article_url,
                         "finalUrl": article_url, "detectedFormat": "html",
                         "fetchedAt": utc_now()}
    else:
        main_page, main_evidence = _fetch_article_page(article_url, cache=cache)
    if main_page:
        page_items.append(main_page)
    pages.append(_page_section(article_url, main_page, main_evidence))

    # Follow only links explicitly labelled as article continuations or rel=next.
    # Never traverse ordinary related links, embeds, ads or arbitrary page links.
    candidates = []
    for link in list(result.get("links", []) if isinstance(result.get("links"), list) else []) + list(
        main_page.get("links", []) if isinstance(main_page.get("links"), list) else []
    ):
        if not isinstance(link, dict) or link.get("relation") != "article-continuation-candidate":
            continue
        candidate_url = str(link.get("url") or "").strip()
        if (candidate_url.startswith("https://") and candidate_url != article_url
                and _same_source_family(article_url, candidate_url) and candidate_url not in candidates):
            candidates.append(candidate_url)
    continuation_fetches = []
    for continuation_url in candidates[:MAX_CONTINUATION_PAGES_PER_POST]:
        continuation_item, continuation_evidence = _fetch_article_page(continuation_url, cache=cache)
        continuation_fetches.append(continuation_evidence)
        if continuation_item:
            page_items.append(continuation_item)
        pages.append(_page_section(continuation_url, continuation_item, continuation_evidence))

    # Feed-provided values are retained. Page values fill gaps; article bodies
    # are aggregated from every retrieved page rather than overwritten by the last page.
    for page_item in page_items:
        for field in (
            "title", "subtitle", "summary", "excerpt", "author", "authorName",
            "authorId", "authorUrl", "publishedAt", "updatedAt", "language",
            "location", "rightsMetadata",
        ):
            if result.get(field) in (None, "", [], {}) and page_item.get(field) not in (None, "", [], {}):
                result[field] = page_item[field]
        result["media"] = _merge_by_url(result.get("media", []), page_item.get("media", []))
        result["attachments"] = _merge_by_url(result.get("attachments", []), page_item.get("attachments", []))
        result["links"] = _merge_by_url(result.get("links", []), page_item.get("links", []))
        for field in ("categories", "tags", "topics"):
            result[field] = _merge_unique_values(result.get(field, []), page_item.get(field, []))

    article_texts = [page.get("fullText", "") for page in pages if page.get("fullText")]
    if item.get("fullText"):
        article_texts.insert(0, item["fullText"])
    combined_text = _combine_text(article_texts)
    if combined_text:
        result["fullText"] = combined_text
    article_html = [page.get("fullTextHtml", "") for page in pages if page.get("fullTextHtml")]
    if item.get("fullTextHtml"):
        article_html.insert(0, item["fullTextHtml"])
    result["fullTextHtml"] = "\n".join(dict.fromkeys(x for x in article_html if x))

    original_metadata = result.get("sourceMetadata", {})
    page_metadata = [page_item.get("sourceMetadata", {}) for page_item in page_items]
    result["sourceMetadata"] = {
        "feedRecord": original_metadata,
        "articlePages": page_metadata,
        "articlePageFetch": main_evidence,
        "continuationPageFetches": continuation_fetches,
    }
    result["articlePageFetch"] = main_evidence
    result["articleContinuationLinksDiscovered"] = _article_continuation_count(result)
    result["_collectorArticlePages"] = pages
    return result, pages


def _is_image_record(item: dict[str, Any]) -> bool:
    media_type = str(item.get("mediaType") or "").lower()
    mime_type = str(item.get("mimeType") or "").lower()
    url = str(item.get("url") or "")
    return media_type.startswith("image") or mime_type.startswith("image/") or bool(
        re.search(r"\.(jpg|jpeg|png|gif|webp|avif)(?:[?#].*)?$", url, re.I)
    )


def _build_source_rights_evidence(post: dict[str, Any], article_pages: list[dict[str, Any]]) -> dict[str, Any]:
    images = [item for item in post.get("media", []) + post.get("attachments", [])
              if isinstance(item, dict) and _is_image_record(item)]
    return {
        "sourceIdentity": {
            "sourceId": post.get("sourceId", ""),
            "sourceName": post.get("sourceName", ""),
            "sourceWebsiteUrl": post.get("sourceWebsiteUrl", ""),
            "sourceFeedUrl": post.get("sourceFeedUrl", ""),
            "originalArticleUrl": post.get("originalUrl", ""),
            "canonicalArticleUrl": post.get("canonicalUrl", ""),
        },
        "feedRightsMetadata": post.get("rightsMetadata", {}),
        "sourceContext": {
            "authorName": post.get("authorName", ""),
            "authorId": post.get("authorId", ""),
            "authorUrl": post.get("authorUrl", ""),
            "contributors": post.get("contributors", []),
            "publishedAt": post.get("publishedAt", ""),
            "updatedAt": post.get("updatedAt", ""),
            "language": post.get("language", ""),
            "categories": post.get("categories", []),
            "tags": post.get("tags", []),
            "topics": post.get("topics", []),
            "location": post.get("location", {}),
            "engagement": post.get("engagement", {}),
            "attachments": post.get("attachments", []),
        },
        "sourceMetadata": post.get("sourceMetadata", {}),
        "articlePageEvidence": [
            {"url": page.get("finalUrl") or page.get("requestedUrl", ""),
             "retrieval": {key: page.get(key) for key in ("retrievalStatus", "httpStatus", "contentType", "fetchedAt", "detectedFormat")},
             "rightsMetadata": page.get("rightsMetadata", {}),
             "sourceMetadata": page.get("sourceMetadata", {})}
            for page in article_pages
        ],
        "imageRightsEvidence": [
            {key: image.get(key) for key in (
                "mediaId", "url", "originalUrl", "sourcePage", "creator", "credit",
                "caption", "altText", "licenseName", "licenseUrl", "rightsNotice", "mimeType", "metadata"
            )}
            for image in images
        ],
        "sourceLinks": post.get("links", []),
        "retrievalProvenance": post.get("provenance", {}),
    }


def _build_collector_sections(job: dict[str, Any], records: list[dict[str, Any]],
                              article_pages_by_post: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """Build the four source-owned sections; Collector gathers evidence, not decisions."""
    manager_card = json.loads(json.dumps(job, ensure_ascii=False))
    manager_hash = _sha256(manager_card)
    posts = []
    for post in records:
        post_id = str(post.get("postId", ""))
        article_pages = article_pages_by_post.get(post_id, [])
        full_text = str(post.get("fullText") or "")
        full_html = str(post.get("fullTextHtml") or "")
        images = [item for item in post.get("media", []) + post.get("attachments", [])
                  if isinstance(item, dict) and _is_image_record(item)]
        page_statuses = [str(page.get("retrievalStatus", "")) for page in article_pages]
        if full_text or full_html:
            full_status = "collected"
        elif "unavailable" in page_statuses or "limit-reached" in page_statuses:
            full_status = "retrieval-failed-or-limited"
        elif any(value in {"collected", "provided-in-feed"} for value in page_statuses):
            full_status = "page-retrieved-no-article-body"
        else:
            full_status = "not-exposed-by-source"
        posts.append({
            "postId": post_id,
            "managerIdCardSha256": manager_hash,
            "fullArticle": {
                "articleUrl": post.get("canonicalUrl") or post.get("originalUrl", ""),
                "title": post.get("title", ""),
                "subtitle": post.get("subtitle", ""),
                "author": post.get("authorName", ""),
                "publishedAt": post.get("publishedAt", ""),
                "updatedAt": post.get("updatedAt", ""),
                "retrievalStatus": full_status,
                "fullText": full_text,
                "fullTextHtml": full_html,
                "feedSummary": str(post.get("summary") or ""),
                "characterCount": len(full_text),
                "wordCount": len(full_text.split()),
                "pages": article_pages,
            },
            "originalImageRecords": images,
            "sourceRightsEvidence": _build_source_rights_evidence(post, article_pages),
        })
    return {
        "schemaVersion": 1,
        "sectionOrder": ["managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence"],
        "managerIdCard": {
            "payload": manager_card,
            "sha256": manager_hash,
            "integrityRule": "exact-manager-payload-copy; collector-does-not-mutate-or-regenerate",
        },
        "posts": posts,
    }


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
        article_pages_by_post: dict[str, list[dict[str, Any]]] = {}

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
                "articlePagesAttempted": 0,
                "articlePagesFailed": 0,
                "continuationPagesFetched": 0,
                "articleContinuationLinksDiscovered": 0,
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
                    published = raw_item.get("publishedAt") or raw_item.get("published") or raw_item.get("pubDate") or raw_item.get("date_published") or ""
                    if not _within_window(str(published), int(job["requestWindowHours"]), now_dt):
                        continue
                    if max_items > 0 and collected_for_feed >= max_items:
                        break
                    raw_format = (raw_item.get("sourceMetadata") or {}).get("format") if isinstance(raw_item.get("sourceMetadata"), dict) else ""
                    # Collector's responsibility ends at collection. It gathers
                    # linked article and continuation-page material for the
                    # downstream Global Checker hand-off.
                    raw_item, article_pages = _enrich_from_article_page(
                        raw_item, cache=article_page_cache, already_parsed=(raw_format == "html")
                    )
                    result["articlePagesAttempted"] += sum(
                        1 for page in article_pages
                        if page.get("retrievalStatus") in {"collected", "unavailable", "limit-reached"}
                    )
                    result["articlePagesFailed"] += sum(
                        1 for page in article_pages if page.get("retrievalStatus") in {"unavailable", "limit-reached"}
                    )
                    if raw_item.get("articlePageFetch", {}).get("status") == "collected":
                        result["articlePagesEnriched"] += 1
                    result["continuationPagesFetched"] += sum(
                        1 for page in article_pages[1:] if page.get("retrievalStatus") == "collected"
                    )
                    if ((raw_item.get("fullText") or raw_item.get("fullTextHtml"))
                            and not any(page.get("fullText") or page.get("fullTextHtml") for page in article_pages)):
                        article_pages = [{
                            "requestedUrl": raw_item.get("canonicalUrl") or raw_item.get("url", ""),
                            "finalUrl": raw_item.get("canonicalUrl") or raw_item.get("url", ""),
                            "httpStatus": "", "contentType": "feed-entry", "detectedFormat": detected_format,
                            "fetchedAt": collected_at, "retrievalStatus": "provided-in-feed",
                            "title": raw_item.get("title", ""), "subtitle": raw_item.get("subtitle", ""),
                            "author": raw_item.get("author") or raw_item.get("authorName", ""),
                            "publishedAt": raw_item.get("publishedAt", ""), "updatedAt": raw_item.get("updatedAt", ""),
                            "fullText": raw_item.get("fullText", ""), "fullTextHtml": raw_item.get("fullTextHtml", ""),
                            "rightsMetadata": raw_item.get("rightsMetadata", {}),
                            "sourceMetadata": raw_item.get("sourceMetadata", {}),
                        }]
                    result["articleContinuationLinksDiscovered"] += _article_continuation_count(raw_item)
                    raw_item.pop("_collectorArticlePages", None)
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
                        article_pages_by_post[post["postId"]] = _merge_by_url(
                            article_pages_by_post.get(post["postId"], []), article_pages
                        )
                    else:
                        records_by_id[post["postId"]] = post
                        article_pages_by_post[post["postId"]] = article_pages
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
        collector_sections = _build_collector_sections(job, records, article_pages_by_post)
        succeeded = sum(1 for item in source_results if item["status"] == "succeeded")
        failed = len(source_results) - succeeded
        status = "succeeded" if succeeded == len(source_results) else "partial" if succeeded else "failed"
        return {
            "schemaVersion": 1,
            "collector": "LIVE // EARTH Global Collector",
            "collectorVersion": __version__,
            "recordSchema": "LIVE_EARTH_UNIVERSAL_POST_V1",
            "recordFields": list(UNIVERSAL_POST_FIELDS),
            # This is the exact Manager envelope: no IDs, routing fields or values are regenerated.
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
                "articlePagesAttempted": sum(item["articlePagesAttempted"] for item in source_results),
                "articlePagesFailed": sum(item["articlePagesFailed"] for item in source_results),
                "articleContinuationLinksDiscovered": sum(item["articleContinuationLinksDiscovered"] for item in source_results),
                "continuationPagesFetched": sum(item.get("continuationPagesFetched", 0) for item in source_results),
                "fullArticleCharactersCollected": sum(len(str(item.get("fullText") or "")) for item in records),
                "imageCandidatesCollected": sum(len(item.get("originalImageRecords", [])) for item in collector_sections.get("posts", [])),
                "mediaItemsCollected": sum(len(item["media"]) + len(item["attachments"]) for item in records),
                "fieldsPerPost": len(UNIVERSAL_POST_FIELDS),
                "collectorSections": 4,
            },
            "sources": source_results,
            "records": records,
            "collectorSections": collector_sections,
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

"""Read-only website/feed discovery using the existing Global Collector core.

This service does not create Manager jobs, write databases, run Checker policy,
create rights decisions, or publish. It reuses Global Collector transport,
format parsing, article continuation and universal-post normalization helpers.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlsplit
import json
import re
import threading
import time
import xml.etree.ElementTree as ET

from global_collector.collector import (
    _build_source_rights_evidence,
    _enrich_from_article_page,
    _is_image_record,
)
from global_collector.errors import FetchError, ParseError
from global_collector.parsers import parse_payload
from global_collector.security import fetch
from global_collector.universal_post import UNIVERSAL_POST_FIELDS, normalize_post, utc_now

MAX_SITE_BYTES = 2 * 1024 * 1024
MAX_FEED_BYTES = 2 * 1024 * 1024
MAX_FEEDS_PER_SITE = 50
MAX_DISCOVERY_CANDIDATES = 50
MAX_LOOKBACK_DAYS = 365
DEFAULT_LOOKBACK_DAYS = 30
FEED_ACCEPT = "application/atom+xml, application/rss+xml, application/feed+json, application/json, application/xml, text/xml, text/html;q=0.7, */*;q=0.4"


def _validate_url(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        raise ValueError("Enter a public website URL.")
    if not re.match(r"^https?://", raw, re.I):
        raw = "https://" + raw
    parsed = urlsplit(raw)
    if parsed.scheme.lower() != "https":
        raise ValueError("For secure inspection, enter an HTTPS website URL.")
    if not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Enter a valid public HTTPS URL without login credentials.")
    if parsed.port not in (None, 443):
        raise ValueError("Only standard HTTPS website addresses are supported.")
    return raw


def _days(value: Any) -> int:
    try:
        days = int(value)
    except (TypeError, ValueError):
        days = DEFAULT_LOOKBACK_DAYS
    if days not in (1, 3, 7, 10, 14, 30, 60, 90, 180, 365):
        raise ValueError("Choose a supported lookback period: 1, 3, 7, 10, 14, 30, 60, 90, 180 or 365 days.")
    return days


def _local(tag: str) -> str:
    return str(tag).rsplit("}", 1)[-1].split(":")[-1].lower()


class _SiteLinkParser(HTMLParser):
    """Read feed discovery declarations without executing page scripts."""
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.candidates: list[dict[str, str]] = []
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {str(k).lower(): (v or "") for k, v in attrs}
        tag = tag.lower()
        if tag == "title":
            self._in_title = True
        if tag == "link" and data.get("href"):
            rel = {x.lower() for x in data.get("rel", "").split()}
            mime = data.get("type", "").lower().split(";", 1)[0].strip()
            if "alternate" in rel and mime in {
                "application/rss+xml", "application/atom+xml", "application/feed+json",
                "application/json", "application/xml", "text/xml",
            }:
                self.candidates.append({
                    "href": data["href"], "title": data.get("title", ""),
                    "type": mime, "rel": data.get("rel", "alternate"),
                })
        if tag == "a" and data.get("href"):
            href = data["href"].strip()
            label = " ".join((data.get("title", ""), data.get("aria-label", ""), data.get("class", ""))).strip()
            if re.search(r"(?:rss|atom|feed|\.xml|\.json)(?:[?#].*)?$", href, re.I) or re.search(r"\b(?:rss|atom|feed)\b", label, re.I):
                self.candidates.append({"href": href, "title": data.get("title", "") or label, "type": "", "rel": "link"})

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data


def _feed_candidates(html_bytes: bytes, page_url: str) -> tuple[list[dict[str, str]], str]:
    parser = _SiteLinkParser()
    parser.feed(html_bytes.decode("utf-8", errors="replace"))
    seen: set[str] = set()
    output: list[dict[str, str]] = []
    for item in parser.candidates:
        href = item.get("href", "").strip()
        try:
            absolute = urljoin(page_url, href)
            parsed = urlsplit(absolute)
            if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
                continue
            absolute = parsed._replace(fragment="").geturl()
        except ValueError:
            continue
        if absolute not in seen:
            seen.add(absolute)
            output.append({**item, "url": absolute})
    # Common feed paths are probes, not assumptions: a candidate is accepted
    # only after the Global Collector parser recognizes an actual RSS/Atom/JSON feed.
    origin = urlsplit(page_url)
    root = f"{origin.scheme}://{origin.netloc}"
    for path in (
        "/feed", "/feed/", "/rss", "/rss.xml", "/feed.xml", "/atom.xml",
        "/index.xml", "/feed.json", "/feeds/posts/default", "/?feed=rss2",
    ):
        absolute = urljoin(root, path)
        if absolute not in seen:
            seen.add(absolute)
            output.append({"url": absolute, "href": path, "title": "", "type": "", "rel": "common-feed-path"})
    return output[:MAX_DISCOVERY_CANDIDATES], re.sub(r"\s+", " ", parser.title).strip()


def _feed_root_metadata(payload: bytes, content_type: str, feed_url: str, page_title: str = "") -> dict[str, Any]:
    metadata: dict[str, Any] = {"title": page_title, "description": "", "homePageUrl": "", "language": "", "updatedAt": "", "generator": "", "rawMetadata": {}}
    raw = payload.lstrip()
    mime = (content_type or "").split(";", 1)[0].strip().lower()
    if raw.startswith((b"{", b"[")) or "json" in mime:
        try:
            value = json.loads(payload.decode("utf-8-sig"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            value = {}
        if isinstance(value, dict):
            metadata["rawMetadata"] = {key: child for key, child in value.items() if key not in {"items", "posts", "articles", "entries", "results", "records", "news", "data"}}
            for target, keys in {
                "title": ("title", "name"), "description": ("description", "subtitle"),
                "homePageUrl": ("home_page_url", "website", "site_url"),
                "language": ("language",), "updatedAt": ("last_updated", "updated"),
                "generator": ("generator",),
            }.items():
                for key in keys:
                    candidate = value.get(key)
                    if candidate not in (None, "", [], {}):
                        metadata[target] = candidate
                        break
    elif raw.startswith(b"<"):
        try:
            root = ET.fromstring(payload)
            channel = next((node for node in root.iter() if _local(node.tag) in {"channel", "feed"}), root)
            raw_fields: dict[str, Any] = {}
            for node in list(channel):
                name = _local(node.tag)
                text = " ".join("".join(node.itertext()).split())
                raw_value: Any = text or dict(node.attrib)
                if name in raw_fields:
                    if not isinstance(raw_fields[name], list):
                        raw_fields[name] = [raw_fields[name]]
                    raw_fields[name].append(raw_value)
                else:
                    raw_fields[name] = raw_value
                if name == "title" and text:
                    metadata["title"] = text
                elif name in {"description", "subtitle", "tagline"} and text:
                    metadata["description"] = text
                elif name in {"language", "lang"} and text:
                    metadata["language"] = text
                elif name in {"lastbuilddate", "updated", "modified"} and text:
                    metadata["updatedAt"] = text
                elif name == "generator" and text:
                    metadata["generator"] = text
                elif name == "link":
                    href = node.attrib.get("href") or text
                    if href and (node.attrib.get("rel", "alternate") == "alternate"):
                        metadata["homePageUrl"] = urljoin(feed_url, href)
            metadata["rawMetadata"] = raw_fields
        except ET.ParseError:
            pass
    metadata["feedUrl"] = feed_url
    metadata["title"] = str(metadata.get("title") or page_title or urlsplit(feed_url).hostname or "Discovered feed")
    return metadata


def _timestamp(item: dict[str, Any]) -> datetime | None:
    value = next((item.get(key) for key in (
        "publishedAt", "published", "date_published", "pubDate", "datePublished",
        "date", "updatedAt", "updated", "dateModified",
    ) if item.get(key) not in (None, "")), None)
    if not value:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value, timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None
    raw = str(value).strip()
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(raw)
        except (TypeError, ValueError, OverflowError):
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _filter_items(items: list[dict[str, Any]], days: int, now: datetime | None = None) -> tuple[list[dict[str, Any]], int, int]:
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    recent: list[dict[str, Any]] = []
    undated = 0
    for item in items:
        published = _timestamp(item)
        if published is None:
            undated += 1
        elif cutoff <= published <= now + timedelta(days=1):
            recent.append(item)
    return recent, undated, len(items)


def _source_name(metadata: dict[str, Any], feed_url: str) -> str:
    return str(metadata.get("title") or urlsplit(feed_url).hostname or "Public feed")[:500]


def _fetch_parse_feed(feed_url: str) -> tuple[Any, list[dict[str, Any]], str, dict[str, Any]]:
    response = fetch(feed_url, timeout_seconds=12, max_bytes=MAX_FEED_BYTES, retries=0)
    items, detected = parse_payload(response.payload, response.content_type, response.final_url)
    if detected not in {"rss_atom", "json"} or not items:
        raise ParseError("The URL did not return a recognizable RSS, Atom or supported JSON feed with entries.")
    metadata = _feed_root_metadata(response.payload, response.content_type, response.final_url)
    evidence = {
        "requestedUrl": response.requested_url, "finalUrl": response.final_url,
        "httpStatus": response.status_code, "contentType": response.content_type,
        "etag": response.headers.get("etag", ""),
        "lastModified": response.headers.get("last-modified", ""),
        "attempts": response.attempts, "fetchedAt": utc_now(), "detectedFormat": detected,
        "responseBytes": len(response.payload),
    }
    return response, items, detected, {"metadata": metadata, "retrieval": evidence}


def discover_site(payload: dict[str, Any]) -> dict[str, Any]:
    site_url = _validate_url(payload.get("url"))
    days = _days(payload.get("lookbackDays", DEFAULT_LOOKBACK_DAYS))
    page = fetch(site_url, timeout_seconds=12, max_bytes=MAX_SITE_BYTES, retries=0)
    detected_items, page_format = parse_payload(page.payload, page.content_type, page.final_url)
    # A URL may itself be a feed; treat it as the first discovered feed.
    candidates: list[dict[str, str]] = []
    site_title = ""
    if page_format in {"rss_atom", "json"} and detected_items:
        candidates.append({"url": page.final_url, "title": "", "type": page.content_type, "rel": "submitted-url"})
    else:
        candidates, site_title = _feed_candidates(page.payload, page.final_url)
    if not candidates:
        raise ParseError("The website opened, but no declared or standard feed locations were found.")

    def check(candidate: dict[str, str]) -> dict[str, Any] | None:
        try:
            response, items, fmt, evidence = _fetch_parse_feed(candidate["url"])
            metadata = evidence["metadata"]
            recent, undated, total = _filter_items(items, days)
            metadata["title"] = str(metadata.get("title") or candidate.get("title") or site_title or _source_name(metadata, response.final_url))
            newest = max((_timestamp(item) for item in recent if _timestamp(item)), default=None)
            return {
                "feedId": _feed_id(response.final_url), "title": metadata["title"],
                "description": metadata.get("description", ""), "url": response.final_url,
                "format": fmt, "contentType": response.content_type,
                "lookbackDays": days, "entriesInWindow": len(recent),
                "undatedEntries": undated, "entriesTotal": total,
                "newestEntryAt": newest.isoformat().replace("+00:00", "Z") if newest else "",
                "discoveredBy": candidate.get("rel", "feed-link"),
                "discoveryLabel": candidate.get("title", ""),
                "retrieval": evidence["retrieval"],
            }
        except Exception:
            return None

    feeds: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(check, item) for item in candidates]
        for future in as_completed(futures):
            result = future.result()
            if result:
                feeds.append(result)
    unique: dict[str, dict[str, Any]] = {item["url"]: item for item in feeds}
    ordered = sorted(unique.values(), key=lambda item: (-item["entriesInWindow"], item["title"].casefold(), item["url"]))[:MAX_FEEDS_PER_SITE]
    return {
        "schemaVersion": 1, "operation": "discover-site-feeds",
        "site": {"requestedUrl": site_url, "finalUrl": page.final_url,
                 "title": site_title or urlsplit(page.final_url).hostname or "Website",
                 "httpStatus": page.status_code, "contentType": page.content_type,
                 "fetchedAt": utc_now()},
        "lookbackDays": days, "feedsFound": len(ordered), "feeds": ordered,
        "discovery": {"candidateLocationsChecked": len(candidates),
                      "maxFeedResults": MAX_FEEDS_PER_SITE,
                      "note": "Only endpoints parsed as RSS, Atom or supported JSON feeds are listed."},
    }


def _feed_id(url: str) -> str:
    import hashlib
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:20]


def inspect_feed(payload: dict[str, Any]) -> dict[str, Any]:
    feed_url = _validate_url(payload.get("feedUrl"))
    days = _days(payload.get("lookbackDays", DEFAULT_LOOKBACK_DAYS))
    response, items, fmt, evidence = _fetch_parse_feed(feed_url)
    recent, undated, total = _filter_items(items, days)
    metadata = evidence["metadata"]
    source = {
        "sourceId": "", "sourceName": _source_name(metadata, response.final_url),
        "websiteUrl": metadata.get("homePageUrl", ""), "connectorType": fmt,
    }
    job: dict[str, Any] = {}
    def normalize_items(values: list[dict[str, Any]]) -> list[dict[str, Any]]:
        normalized = [normalize_post(
            item, view_id="", source=source, feed_url=response.final_url,
            job=job, collected_at=evidence["retrieval"]["fetchedAt"],
            format_name=fmt, fetch_evidence=evidence["retrieval"],
        ) for item in values]
        normalized.sort(key=lambda record: _timestamp({"publishedAt": record.get("publishedAt")}) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        return normalized

    records = normalize_items(recent)
    undated_items = [item for item in items if _timestamp(item) is None]
    undated_records = normalize_items(undated_items)
    return {
        "schemaVersion": 1, "operation": "inspect-feed",
        "feed": {**metadata, "format": fmt, "requestedUrl": response.requested_url,
                 "finalUrl": response.final_url, "httpStatus": response.status_code,
                 "contentType": response.content_type, "etag": response.headers.get("etag", ""),
                 "lastModified": response.headers.get("last-modified", ""),
                 "responseBytes": len(response.payload), "fetchedAt": evidence["retrieval"]["fetchedAt"]},
        "lookbackDays": days,
        "statistics": {"entriesTotal": total, "entriesInWindow": len(records),
                       "undatedEntries": undated, "fieldsPerEntry": len(UNIVERSAL_POST_FIELDS),
                       "imageReferences": sum(
                           1 for record in records for media in (record.get("media", []) + record.get("attachments", []))
                           if isinstance(media, dict) and _is_image_record(media)
                       )},
        "recordSchema": "LIVE_EARTH_UNIVERSAL_POST_V1",
        "recordFields": list(UNIVERSAL_POST_FIELDS),
        "records": records,
        "undatedRecords": undated_records,
        "lineage": {"managerJob": "not-applicable — direct user inspection",
                    "viewId": "", "databaseWrite": False, "checkerDecision": "not-run",
                    "publication": "not-run"},
    }


def inspect_article(payload: dict[str, Any]) -> dict[str, Any]:
    article_url = _validate_url(payload.get("articleUrl"))
    days = _days(payload.get("lookbackDays", DEFAULT_LOOKBACK_DAYS))
    response = fetch(article_url, timeout_seconds=12, max_bytes=MAX_FEED_BYTES, retries=0)
    items, fmt = parse_payload(response.payload, response.content_type, response.final_url)
    if not items:
        raise ParseError("The article URL did not expose a recognizable article or feed entry.")
    item = dict(items[0])
    if not item.get("url"):
        item["url"] = response.final_url
    if not item.get("canonicalUrl"):
        item["canonicalUrl"] = response.final_url
    item["sourceMetadata"] = item.get("sourceMetadata") or {"format": fmt}
    article_pages: list[dict[str, Any]] = []
    if fmt == "html":
        item, article_pages = _enrich_from_article_page(item, cache={}, already_parsed=True)
    else:
        item, article_pages = _enrich_from_article_page(item, cache={})
    fetched_at = utc_now()
    if fmt == "html" and article_pages:
        # This page was retrieved directly in this request, not merely supplied
        # as feed text; replace the helper's feed-origin status with real evidence.
        article_pages[0].update({
            "requestedUrl": response.requested_url, "finalUrl": response.final_url,
            "httpStatus": response.status_code, "contentType": response.content_type,
            "detectedFormat": fmt, "fetchedAt": fetched_at, "retrievalStatus": "collected",
        })
    retrieval = {"requestedUrl": response.requested_url, "finalUrl": response.final_url,
                 "httpStatus": response.status_code, "contentType": response.content_type,
                 "etag": response.headers.get("etag", ""), "lastModified": response.headers.get("last-modified", ""),
                 "fetchedAt": fetched_at, "detectedFormat": fmt, "responseBytes": len(response.payload)}
    source = {"sourceId": "", "sourceName": urlsplit(response.final_url).hostname or "Public source",
              "websiteUrl": response.final_url, "connectorType": fmt}
    record = normalize_post(item, view_id="", source=source, feed_url=response.final_url,
                             job={}, collected_at=fetched_at, format_name=fmt,
                             fetch_evidence=retrieval)
    pages = article_pages or [{"requestedUrl": response.requested_url, "finalUrl": response.final_url,
                               "httpStatus": response.status_code, "contentType": response.content_type,
                               "detectedFormat": fmt, "retrievalStatus": "collected",
                               "fullText": record.get("fullText", ""), "fullTextHtml": record.get("fullTextHtml", ""),
                               "rightsMetadata": record.get("rightsMetadata", {}),
                               "sourceMetadata": record.get("sourceMetadata", {})}]
    rights_evidence = _build_source_rights_evidence(record, pages)
    return {
        "schemaVersion": 1, "operation": "inspect-article", "lookbackDays": days,
        "retrieval": retrieval, "recordSchema": "LIVE_EARTH_UNIVERSAL_POST_V1",
        "recordFields": list(UNIVERSAL_POST_FIELDS), "record": record,
        "fullArticle": {"articleUrl": record.get("canonicalUrl") or response.final_url,
                        "title": record.get("title", ""), "author": record.get("authorName", ""),
                        "publishedAt": record.get("publishedAt", ""), "updatedAt": record.get("updatedAt", ""),
                        "fullText": record.get("fullText", ""), "fullTextHtml": record.get("fullTextHtml", ""),
                        "wordCount": len(str(record.get("fullText", "")).split()), "pages": pages},
        "originalImageRecords": [item for item in record.get("media", []) + record.get("attachments", []) if _is_image_record(item)],
        "sourceRightsEvidence": rights_evidence,
        "lineage": {"managerJob": "not-applicable — direct user inspection",
                    "viewId": "", "databaseWrite": False, "checkerDecision": "not-run",
                    "publication": "not-run"},
    }

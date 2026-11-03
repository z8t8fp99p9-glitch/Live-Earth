"""One fixed post schema shared by every source and every LIVE // EARTH View."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import hashlib
import json
import re

from . import __version__

# Every record contains every field below. Unknown/unavailable values are empty;
# source-specific extras are retained in sourceMetadata instead of changing schema.
UNIVERSAL_POST_FIELDS = (
    "schemaVersion", "postId", "sourcePostId", "viewId", "sourceId",
    "sourceName", "sourcePlatform", "sourceType", "sourceFeedUrl",
    "sourceWebsiteUrl", "originalUrl", "canonicalUrl", "title", "subtitle",
    "summary", "excerpt", "fullText", "fullTextHtml", "authorName",
    "authorId", "authorUrl", "contributors", "publishedAt", "updatedAt",
    "collectedAt", "language", "categories", "tags", "topics", "location",
    "media", "attachments", "links", "engagement", "rightsMetadata",
    "provenance", "sourceMetadata", "collectionContext",
)

MEDIA_FIELDS = (
    "mediaId", "mediaType", "url", "originalUrl", "thumbnailUrl", "title",
    "caption", "altText", "creator", "credit", "licenseName", "licenseUrl",
    "rightsNotice", "mimeType", "width", "height", "durationSeconds",
    "fileSizeBytes", "sourcePage", "position", "metadata",
    "postId", "viewId", "sourceId", "jobId", "profileId",
    "assignmentIds", "idempotencyKey", "configVersion",
    "destinationDatabaseId", "destinationDatabasePath",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _text(value: Any, limit: int = 20000) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))[:limit]
    return re.sub(r"\s+", " ", str(value)).strip()[:limit]


def _list(value: Any) -> list[Any]:
    if value is None or value == "":
        return []
    return value if isinstance(value, list) else [value]


def _first(item: dict[str, Any], *keys: str, default: Any = "") -> Any:
    for key in keys:
        value = item.get(key)
        if value not in (None, "", [], {}):
            return value
    return default


def _field_text(value: Any, *, plain: bool = False, limit: int = 20000) -> str:
    """Read common CMS/API text objects without dropping their raw source form."""
    if isinstance(value, dict):
        candidate = _first(value, "rendered", "text", "plainText", "plain_text", "html", "value", "name", default=value)
        value = candidate
    result = _text(value, limit)
    if plain:
        result = re.sub(r"(?is)<(script|style)\b[^>]*>.*?</\1>", " ", result)
        result = re.sub(r"(?s)<[^>]+>", " ", result)
        result = re.sub(r"\s+", " ", result).strip()
    return result[:limit]


def _timestamp(value: Any) -> str:
    raw = _text(value, 300)
    if not raw:
        return ""
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    except ValueError:
        return raw


def _safe_raw(value: Any, limit: int = 250000) -> Any:
    try:
        raw = json.dumps(value, ensure_ascii=False, default=str)
        if len(raw) <= limit:
            return json.loads(raw)
        return {"truncated": True, "originalCharacterCount": len(raw), "preview": raw[:limit]}
    except Exception:
        return {"unserializable": True, "preview": str(value)[:4000]}


def _media_item(value: Any, index: int, post_id: str, article_url: str) -> dict[str, Any]:
    item = value if isinstance(value, dict) else {"url": value}
    url = _text(_first(item, "url", "contentUrl", "src", "href", "image", "video"), 4000)
    media_type = _text(_first(item, "mediaType", "type", "mimeType", "medium"), 120).lower()
    if not media_type:
        if "image" in item or re.search(r"\.(jpg|jpeg|png|gif|webp|avif)(?:[?#].*)?$", url, re.I):
            media_type = "image"
        elif "video" in item or re.search(r"\.(mp4|webm|mov|m3u8)(?:[?#].*)?$", url, re.I):
            media_type = "video"
        elif re.search(r"\.(mp3|wav|m4a|ogg)(?:[?#].*)?$", url, re.I):
            media_type = "audio"
        else:
            media_type = "unknown"
    media_id = _text(_first(item, "mediaId", "id", default=""), 200)
    if not media_id:
        media_id = hashlib.sha256(f"{post_id}|{url}|{index}".encode()).hexdigest()[:24]
    result = {
        "mediaId": media_id,
        "mediaType": media_type,
        "url": url,
        "originalUrl": _text(_first(item, "originalUrl", "original_url", default=url), 4000),
        "thumbnailUrl": _text(_first(item, "thumbnailUrl", "thumbnail", "thumb", "previewUrl"), 4000),
        "title": _text(_first(item, "title", "name"), 1000),
        "caption": _text(_first(item, "caption", "description"), 4000),
        "altText": _text(_first(item, "altText", "alt", "alternateName"), 1000),
        "creator": _text(_first(item, "creator", "artist", "author"), 1000),
        "credit": _text(_first(item, "credit", "attribution"), 1200),
        "licenseName": _text(_first(item, "licenseName", "license_name"), 500),
        "licenseUrl": _text(_first(item, "licenseUrl", "license_url", "license"), 2000),
        "rightsNotice": _text(_first(item, "rightsNotice", "copyright", "copyrightNotice", "rights"), 2000),
        "mimeType": _text(_first(item, "mimeType", "contentType", "type"), 200),
        "width": _first(item, "width", "pixelWidth", default=None),
        "height": _first(item, "height", "pixelHeight", default=None),
        "durationSeconds": _first(item, "durationSeconds", "duration", default=None),
        "fileSizeBytes": _first(item, "fileSizeBytes", "length", "size", default=None),
        "sourcePage": _text(_first(item, "sourcePage", "sourceUrl", "pageUrl", default=article_url), 4000),
        "position": _first(item, "position", "index", default=index),
        "metadata": _safe_raw(item, 20000),
    }
    return {field: result.get(field, "") for field in MEDIA_FIELDS}


def normalize_post(item: dict[str, Any], *, view_id: str, source: dict[str, Any],
                   feed_url: str, job: dict[str, Any], collected_at: str,
                   format_name: str, fetch_evidence: dict[str, Any]) -> dict[str, Any]:
    source_id = str(source.get("sourceId", ""))
    original_url = _text(_first(item, "url", "link", "permalink", "canonicalUrl", "external_url"), 4000)
    canonical_url = _text(_first(item, "canonicalUrl", "canonical_url", "url", "link", default=original_url), 4000)
    external_id = _text(_first(item, "sourcePostId", "guid", "id", "uuid", "@id"), 1000)
    identity_material = f"{source_id}|{external_id or canonical_url or json.dumps(item, sort_keys=True, default=str)}"
    post_id = hashlib.sha256(identity_material.encode("utf-8")).hexdigest()[:32]

    media_raw = _list(_first(item, "media", "mediaCandidates", "images", "image", "videos", "video", "enclosures"))
    attachments_raw = _list(_first(item, "attachments", "files", "documents"))
    media = [_media_item(value, i, post_id, canonical_url or original_url) for i, value in enumerate(media_raw)]
    attachments = [_media_item(value, i, post_id, canonical_url or original_url) for i, value in enumerate(attachments_raw)]
    lineage = {
        "postId": post_id,
        "viewId": view_id,
        "sourceId": source_id,
        "jobId": job.get("jobId", ""),
        "profileId": job.get("profileId", ""),
        "assignmentIds": list(job.get("assignmentIds", [])),
        "idempotencyKey": job.get("idempotencyKey", ""),
        "configVersion": job.get("configVersion", ""),
        "destinationDatabaseId": job.get("destinationDatabaseId", ""),
        "destinationDatabasePath": job.get("destinationDatabasePath", ""),
    }
    for media_item in media + attachments:
        media_item.update(lineage)

    contributors = _list(_first(item, "contributors", "authors", "creator"))
    categories = _list(_first(item, "categories", "category"))
    tags = _list(_first(item, "tags", "keywords", "tag"))
    topics = _list(_first(item, "topics", "subjects", "topic"))
    links = _list(_first(item, "links", "relatedLinks"))
    normalized_links = []
    for link in links:
        if isinstance(link, dict):
            normalized_links.append({
                "url": _text(_first(link, "url", "href"), 4000),
                "rel": _text(_first(link, "rel", "relationship"), 200),
                "title": _text(_first(link, "title", "name"), 1000),
                "type": _text(_first(link, "type", "mimeType"), 200),
                "metadata": _safe_raw(link, 10000),
            })
        else:
            normalized_links.append({"url": _text(link, 4000), "rel": "", "title": "", "type": "", "metadata": {}})

    location_raw = _first(item, "location", "place", "geo", default={})
    if not isinstance(location_raw, dict):
        location_raw = {"name": location_raw}
    engagement_raw = _first(item, "engagement", "statistics", "stats", "metrics", default={})
    if not isinstance(engagement_raw, dict):
        engagement_raw = {"value": engagement_raw}
    rights_raw = _first(item, "rightsMetadata", default=None)
    if rights_raw is None:
        rights_raw = {
            "licenseName": _first(item, "licenseName", "license_name", "license", default=""),
            "licenseUrl": _first(item, "licenseUrl", "license_url", default=""),
            "copyrightNotice": _first(item, "copyrightNotice", "copyright", default=""),
            "rightsNotice": _first(item, "rightsNotice", "rights", default=""),
            "credit": _first(item, "credit", "attribution", default=""),
        }
    elif not isinstance(rights_raw, dict):
        rights_raw = {"sourceProvidedValue": rights_raw}

    provenance = {
        "discoveredFrom": format_name,
        "feedUrl": feed_url,
        "requestedUrl": fetch_evidence.get("requestedUrl", feed_url),
        "finalUrl": fetch_evidence.get("finalUrl", feed_url),
        "fetchedAt": fetch_evidence.get("fetchedAt", collected_at),
        "httpStatus": fetch_evidence.get("httpStatus", ""),
        "contentType": fetch_evidence.get("contentType", ""),
        "etag": fetch_evidence.get("etag", ""),
        "lastModified": fetch_evidence.get("lastModified", ""),
        "feedEntryId": _text(_first(item, "feedEntryId", "guid", "id"), 1000),
    }
    author_value = _first(item, "authorName", "author", "authors", "creator", "byline", default="")
    if isinstance(author_value, dict):
        author_value = author_value.get("name", author_value.get("displayName", ""))
    elif isinstance(author_value, list):
        author_value = ", ".join(_text(x.get("name", "") if isinstance(x, dict) else x, 500) for x in author_value)

    content_value = _first(item, "fullText", "contentText", "content_text", "bodyText", "text", "content", default="")
    if isinstance(content_value, dict):
        content_html_value = _first(content_value, "html", "rendered", "contentHtml", default="")
        content_plain_value = _first(content_value, "text", "plainText", "plain_text", default=content_html_value)
    else:
        content_html_value = _first(item, "fullTextHtml", "contentHtml", "content_html", "content:encoded", "html", default="")
        content_plain_value = content_value

    post = {
        "schemaVersion": 1,
        "postId": post_id,
        "sourcePostId": external_id,
        "viewId": view_id,
        "sourceId": source_id,
        "sourceName": _text(source.get("sourceName"), 500),
        "sourcePlatform": _text(_first(item, "sourcePlatform", "platform", default=source.get("sourcePlatform", "")), 200),
        "sourceType": _text(source.get("connectorType", "auto"), 100),
        "sourceFeedUrl": feed_url,
        "sourceWebsiteUrl": _text(_first(item, "sourceWebsiteUrl", "sourceWebsite", default=source.get("websiteUrl", "")), 4000),
        "originalUrl": original_url,
        "canonicalUrl": canonical_url,
        "title": _field_text(_first(item, "title", "headline", "name"), limit=2000),
        "subtitle": _field_text(_first(item, "subtitle", "subheadline", "deck"), limit=2000),
        "summary": _field_text(_first(item, "summary", "description", "abstract", "excerpt"), limit=30000),
        "excerpt": _field_text(_first(item, "excerpt", "teaser", "standfirst"), limit=10000),
        "fullText": _field_text(content_plain_value, plain=True, limit=200000),
        "fullTextHtml": _field_text(content_html_value, limit=250000),
        "authorName": _field_text(author_value, limit=1000),
        "authorId": _text(_first(item, "authorId", "author_id"), 500),
        "authorUrl": _text(_first(item, "authorUrl", "author_url", "authorLink"), 4000),
        "contributors": _safe_raw(contributors, 20000),
        "publishedAt": _timestamp(_first(item, "publishedAt", "published", "pubDate", "datePublished", "date_published", "date")),
        "updatedAt": _timestamp(_first(item, "updatedAt", "updated", "modified", "dateModified", "date_modified")),
        "collectedAt": collected_at,
        "language": _text(_first(item, "language", "inLanguage", "lang"), 100),
        "categories": _safe_raw(categories, 10000),
        "tags": _safe_raw(tags, 10000),
        "topics": _safe_raw(topics, 10000),
        "location": {
            "name": _text(_first(location_raw, "name", "title", "locality"), 1000),
            "address": _text(_first(location_raw, "address", "streetAddress"), 2000),
            "city": _text(_first(location_raw, "city", "locality"), 500),
            "region": _text(_first(location_raw, "region", "state", "province"), 500),
            "country": _text(_first(location_raw, "country", "countryName"), 500),
            "latitude": _first(location_raw, "latitude", "lat", default=None),
            "longitude": _first(location_raw, "longitude", "lon", "lng", default=None),
            "placeId": _text(_first(location_raw, "placeId", "id"), 500),
            "metadata": _safe_raw(location_raw, 12000),
        },
        "media": media,
        "attachments": attachments,
        "links": normalized_links,
        "engagement": {
            "views": _first(engagement_raw, "views", "viewCount", default=None),
            "likes": _first(engagement_raw, "likes", "likeCount", default=None),
            "reactions": _first(engagement_raw, "reactions", "reactionCount", default=None),
            "comments": _first(engagement_raw, "comments", "commentCount", default=None),
            "shares": _first(engagement_raw, "shares", "shareCount", default=None),
            "saves": _first(engagement_raw, "saves", "saveCount", default=None),
            "score": _first(engagement_raw, "score", "rating", default=None),
            "metadata": _safe_raw(engagement_raw, 12000),
        },
        "rightsMetadata": {
            "copyrightNotice": _text(_first(rights_raw, "copyrightNotice", "copyright", "copyrightYear"), 2000),
            "licenseName": _text(_first(rights_raw, "licenseName", "license_name", "name"), 1000),
            "licenseUrl": _text(_first(rights_raw, "licenseUrl", "license_url", "url"), 4000),
            "creator": _text(_first(rights_raw, "creator", "author"), 1000),
            "attribution": _text(_first(rights_raw, "attribution", "credit"), 2000),
            "credit": _text(_first(rights_raw, "credit", "imageCredit"), 2000),
            "rightsNotice": _text(_first(rights_raw, "rightsNotice", "rights", "usageTerms"), 4000),
            "termsUrl": _text(_first(rights_raw, "termsUrl", "termsOfService"), 4000),
            "sourcePage": _text(_first(rights_raw, "sourcePage", "sourceUrl"), 4000),
            "metadata": _safe_raw(rights_raw, 20000),
        },
        "provenance": provenance,
        "sourceMetadata": _safe_raw(item, 250000),
        "collectionContext": {
            "jobId": job.get("jobId", ""),
            "idempotencyKey": job.get("idempotencyKey", ""),
            "viewId": job.get("viewId", view_id),
            "profileId": job.get("profileId", ""),
            "assignmentIds": list(job.get("assignmentIds", [])),
            "sourceIds": list(job.get("sourceIds", [])),
            "feedUrls": list(job.get("feedUrls", [])),
            "collectorEntrypoint": job.get("collectorEntrypoint", ""),
            "collectorWorkflow": job.get("collectorWorkflow", ""),
            "destinationDatabaseId": job.get("destinationDatabaseId", ""),
            "destinationDatabasePath": job.get("destinationDatabasePath", ""),
            "scheduledAt": job.get("scheduledAt", ""),
            "requestWindowHours": job.get("requestWindowHours", ""),
            "configVersion": job.get("configVersion", ""),
            "trigger": job.get("trigger", ""),
            "collectorVersion": __version__,
        },
    }
    # Fixed schema assertion prevents one connector or View adding/removing fields.
    return {field: post.get(field, "") for field in UNIVERSAL_POST_FIELDS}

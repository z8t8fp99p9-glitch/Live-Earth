"""RSS/Atom parsing and metadata-only media-candidate extraction."""
from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from urllib.parse import urljoin
import html
import re
import xml.etree.ElementTree as ET
from typing import Any

from .errors import FeedParseError


def local_name(tag: str) -> str:
    return str(tag).rsplit("}", 1)[-1].split(":")[-1].lower()


def node_text(node: ET.Element | None) -> str:
    if node is None:
        return ""
    return "".join(node.itertext()).strip()


def clean_text(value: Any, limit: int = 12000) -> str:
    raw = html.unescape(str(value or ""))
    raw = re.sub(r"(?is)<(script|style)\b[^>]*>.*?</\1>", " ", raw)
    raw = re.sub(r"(?s)<[^>]+>", " ", raw)
    raw = re.sub(r"\s+", " ", raw).strip()
    return raw[:limit]


def parse_datetime(value: str | None) -> str | None:
    if not value:
        return None
    parsed = None
    try:
        parsed = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(str(value).strip())
        except (TypeError, ValueError, OverflowError):
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _srcset(value: str) -> list[str]:
    candidates = []
    for part in str(value or "").split(","):
        bits = part.strip().split()
        if bits and bits[0]:
            candidates.append(bits[0])
    return candidates


class _ImageHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.images: list[dict[str, str]] = []

    def handle_starttag(self, tag, attrs):
        values = {str(k).lower(): (v or "").strip() for k, v in attrs}
        tag = tag.lower()
        if tag not in {"img", "source"}:
            return
        urls = []
        for key in ("src", "data-src", "data-lazy-src", "data-original", "data-image"):
            if values.get(key):
                urls.append(values[key])
        for key in ("srcset", "data-srcset", "data-lazy-srcset"):
            urls.extend(_srcset(values.get(key, "")))
        for url in urls:
            self.images.append({
                "url": url,
                "caption": values.get("alt") or values.get("title") or "",
                "credit": values.get("data-credit") or "",
                "rightsNotice": values.get("data-rights") or values.get("data-license") or "",
                "discoveredFrom": "feed-html-metadata",
            })


def _candidate(
    url: str, article_url: str, caption: str = "", credit: str = "",
    rights_notice: str = "", media_type: str = "", discovered_from: str = "feed-media-metadata"
) -> dict[str, str]:
    return {
        "url": urljoin(article_url or "", url.strip()),
        "caption": clean_text(caption, 500),
        "credit": clean_text(credit, 300),
        "rightsNotice": clean_text(rights_notice, 500),
        "mediaType": media_type[:100],
        "discoveredFrom": discovered_from,
        "approvalStatus": "PENDING_GLOBAL_CHECKER",
    }


def _media_candidates(entry: ET.Element, article_url: str) -> list[dict[str, str]]:
    candidates = []
    for node in entry.iter():
        name = local_name(node.tag)
        attrs = node.attrib
        if name in {"enclosure", "content", "thumbnail"}:
            url = attrs.get("url") or attrs.get("href") or ""
            media_type = attrs.get("type") or attrs.get("medium") or ""
            is_image = (
                str(media_type).lower().startswith("image/")
                or str(attrs.get("medium", "")).lower() == "image"
                or bool(re.search(r"\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$", url, re.I))
            )
            if url and is_image:
                candidates.append(_candidate(
                    url, article_url,
                    attrs.get("title") or attrs.get("label") or "",
                    attrs.get("credit") or attrs.get("creator") or "",
                    attrs.get("rights") or attrs.get("copyright") or attrs.get("license") or "",
                    media_type,
                ))

        if name in {"description", "summary", "encoded", "content"} and node.text:
            parser = _ImageHTMLParser()
            try:
                parser.feed(html.unescape(node.text))
                parser.close()
            except Exception:
                pass
            for item in parser.images:
                candidates.append(_candidate(
                    item["url"], article_url, item.get("caption", ""),
                    item.get("credit", ""), item.get("rightsNotice", ""),
                    discovered_from=item.get("discoveredFrom", "feed-html-metadata"),
                ))

    unique = {}
    for item in candidates:
        if item["url"]:
            key = item["url"]
            if key not in unique:
                unique[key] = item
            else:
                prior = unique[key]
                for field in ("caption", "credit", "rightsNotice"):
                    if not prior.get(field) and item.get(field):
                        prior[field] = item[field]
    return list(unique.values())


def _field(entry: ET.Element, names: set[str]) -> str:
    for child in list(entry):
        if local_name(child.tag) in names:
            value = node_text(child)
            if value:
                return value
    return ""


def parse_feed(payload: bytes, source_name: str, source_url: str) -> list[dict[str, Any]]:
    if b"<!DOCTYPE" in payload.upper() or b"<!ENTITY" in payload.upper():
        raise FeedParseError("XML document type/entity declarations are not accepted.")
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as exc:
        raise FeedParseError(f"RSS/Atom XML is malformed ({exc}).") from exc

    entries = [node for node in root.iter() if local_name(node.tag) in {"item", "entry"}]
    if not entries:
        raise FeedParseError("The registered feed contains no RSS item or Atom entry elements.")

    records = []
    for entry in entries:
        title = clean_text(_field(entry, {"title"}), 500)
        article_url = ""
        entry_id = ""
        summary_raw = ""
        published_raw = ""
        author = ""

        for child in list(entry):
            name = local_name(child.tag)
            if name == "link":
                href = child.attrib.get("href", "").strip()
                rel = child.attrib.get("rel", "alternate").lower()
                candidate = href or node_text(child)
                if candidate and (rel == "alternate" or not article_url):
                    article_url = candidate
            elif name in {"guid", "id"} and not entry_id:
                entry_id = node_text(child) or child.attrib.get("isPermaLink", "")
            elif name in {"description", "summary", "encoded", "content"} and not summary_raw:
                summary_raw = node_text(child)
            elif name in {"pubdate", "published", "updated", "date"} and not published_raw:
                published_raw = node_text(child)
            elif name in {"author", "creator"} and not author:
                author = node_text(child)

        if not title or not article_url:
            # Incomplete entries are not silently fabricated or assigned guessed URLs.
            continue

        records.append({
            "title": title,
            "url": article_url.strip(),
            "summary": clean_text(summary_raw, 16000),
            "publishedAt": parse_datetime(published_raw),
            "author": clean_text(author, 300),
            "feedEntryId": clean_text(entry_id, 1000),
            "sourceName": source_name,
            "sourceUrl": source_url,
            "mediaCandidates": _media_candidates(entry, article_url),
        })

    if not records:
        raise FeedParseError("The feed parsed, but contained no complete story entries.")
    return records

"""Source-format adapters. All adapters emit the same universal raw-item shape."""
from __future__ import annotations

from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from urllib.parse import urljoin
from datetime import datetime, timezone
from typing import Any
import html
import json
import re
import xml.etree.ElementTree as ET

from .errors import ParseError


ARTICLE_CONTINUATION_RE = re.compile(
    r"\b(?:read\s+more|read\s+the\s+full\s+(?:article|story|report)|"
    r"read\s+full\s+(?:article|story|report)|continue\s+reading|"
    r"continue\s+to\s+(?:the\s+)?article|view\s+(?:the\s+)?full\s+"
    r"(?:article|story|report)|full\s+(?:article|story|report))\b", re.I
)


def _local(tag: str) -> str:
    return str(tag).rsplit("}", 1)[-1].split(":")[-1].lower()


def _clean(value: Any, limit: int = 200000) -> str:
    if value is None:
        return ""
    raw = html.unescape(str(value))
    raw = re.sub(r"(?is)<(script|style|noscript)\b[^>]*>.*?</\1>", " ", raw)
    raw = re.sub(r"(?s)<[^>]+>", " ", raw)
    return re.sub(r"\s+", " ", raw).strip()[:limit]


def _date(value: str) -> str:
    value = str(value or "").strip()
    if not value:
        return ""
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            dt = parsedate_to_datetime(value)
        except (TypeError, ValueError, OverflowError):
            return value
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _text(node: ET.Element | None) -> str:
    return "".join(node.itertext()).strip() if node is not None else ""


def _xml_item(item: ET.Element, feed_url: str) -> dict[str, Any]:
    raw: dict[str, Any] = {}
    media = []
    links = []
    categories = []
    authors = []
    for child in list(item):
        name = _local(child.tag)
        value = _text(child)
        if name == "link":
            href = child.attrib.get("href", "").strip()
            rel = child.attrib.get("rel", "alternate").lower()
            link_value = href or value
            if link_value:
                link_title = child.attrib.get("title", "")
                links.append({"url": urljoin(feed_url, link_value), "rel": rel,
                              "title": link_title, "type": child.attrib.get("type", ""),
                              "text": value, "relation": _link_relation(value, link_title, rel)})
                if rel == "alternate" or not raw.get("url"):
                    raw["url"] = urljoin(feed_url, link_value)
        elif name in {"enclosure", "content", "thumbnail", "image"}:
            url = child.attrib.get("url") or child.attrib.get("href") or value
            if url:
                media.append({
                    "url": urljoin(feed_url, url),
                    "mediaType": child.attrib.get("type") or child.attrib.get("medium") or name,
                    "title": child.attrib.get("title") or child.attrib.get("label", ""),
                    "caption": child.attrib.get("description", ""),
                    "credit": child.attrib.get("credit") or child.attrib.get("creator", ""),
                    "rightsNotice": child.attrib.get("rights") or child.attrib.get("copyright") or child.attrib.get("license", ""),
                    "width": child.attrib.get("width"), "height": child.attrib.get("height"),
                    "metadata": dict(child.attrib),
                })
        elif name in {"category", "subject", "keyword"}:
            term = child.attrib.get("term") or value
            if term:
                categories.append(term)
        elif name in {"author", "creator"}:
            if value:
                authors.append(value)
        elif name in {"description", "summary", "abstract"}:
            raw.setdefault("summary", value)
            raw.setdefault("excerpt", _clean(value, 10000))
        elif name in {"encoded", "content", "contentencoded"}:
            if value:
                raw["fullTextHtml"] = value
                raw["fullText"] = _clean(value)
        elif name in {"pubdate", "published", "updated", "date", "modified"}:
            if name in {"updated", "modified"}:
                raw["updatedAt"] = _date(value)
            else:
                raw.setdefault("publishedAt", _date(value))
        elif name in {"guid", "id"}:
            raw["sourcePostId"] = value or child.attrib.get("isPermaLink", "")
        elif name in {"title", "subtitle", "language", "rights", "copyright", "license", "link", "name"}:
            if value:
                raw.setdefault({"name": "authorName"}.get(name, name), value)
        elif name in {"latitude", "lat", "longitude", "long", "location"}:
            raw.setdefault("location", {})
            if isinstance(raw["location"], dict):
                raw["location"][name] = value
        else:
            if name in raw:
                if not isinstance(raw[name], list):
                    raw[name] = [raw[name]]
                raw[name].append(value or dict(child.attrib))
            else:
                raw[name] = value or (dict(child.attrib) if child.attrib else "")

    if authors:
        raw.setdefault("authorName", authors[0])
    raw["media"] = media
    raw["links"] = links
    raw["categories"] = categories
    raw["contributors"] = authors
    raw["feedEntryId"] = raw.get("sourcePostId", "")
    raw["originalUrl"] = raw.get("url", "")
    raw["rightsMetadata"] = {
        "rightsNotice": raw.get("rights", ""),
        "copyrightNotice": raw.get("copyright", ""),
        "licenseName": raw.get("license", ""),
    }
    raw["sourceMetadata"] = {"format": "rss_atom", "element": _element_to_dict(item)}
    return raw


def _element_to_dict(node: ET.Element) -> dict[str, Any]:
    result: dict[str, Any] = {"name": _local(node.tag)}
    if node.attrib:
        result["attributes"] = dict(node.attrib)
    text_value = (node.text or "").strip()
    if text_value:
        result["text"] = text_value
    children = [_element_to_dict(child) for child in list(node)]
    if children:
        result["children"] = children
    return result


def parse_xml(payload: bytes, feed_url: str) -> tuple[list[dict[str, Any]], str]:
    upper = payload[:20000].upper()
    if b"<!DOCTYPE" in upper or b"<!ENTITY" in upper:
        raise ParseError("XML document type/entity declarations are not accepted.")
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as exc:
        raise ParseError(f"XML source response is malformed: {exc}") from exc
    items = [node for node in root.iter() if _local(node.tag) in {"item", "entry"}]
    if not items:
        raise ParseError("XML response did not contain recognizable RSS/RDF/Atom entries.")
    return [_xml_item(item, feed_url) for item in items], "rss_atom"


def _find_items(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [x for x in value if isinstance(x, dict)]
    if not isinstance(value, dict):
        return []
    if isinstance(value.get("items"), list):
        return [x for x in value["items"] if isinstance(x, dict)]
    for key in ("posts", "articles", "entries", "results", "data", "records", "news"):
        found = _find_items(value.get(key))
        if found:
            return found
    if any(key in value for key in ("title", "headline", "content", "description", "url", "link")):
        return [value]
    return []


def _json_item(item: dict[str, Any], feed_url: str) -> dict[str, Any]:
    result = dict(item)
    for field in ("url", "link", "external_url", "canonicalUrl"):
        if isinstance(result.get(field), str) and result[field]:
            result[field] = urljoin(feed_url, result[field])
    for field in ("image", "banner_image"):
        if isinstance(result.get(field), str) and result[field]:
            result.setdefault("media", []).append({"url": urljoin(feed_url, result[field]), "mediaType": "image"})
    if isinstance(result.get("attachments"), list):
        result["attachments"] = [
            ({**x, "url": urljoin(feed_url, x.get("url", ""))} if isinstance(x, dict) else x)
            for x in result["attachments"]
        ]
    result.setdefault("sourceMetadata", {"format": "json", "record": item})
    return result


def _link_relation(text_value: str, title: str, rel: str) -> str:
    """Describe a likely continuation link without deciding whether it may be fetched."""
    descriptor = " ".join((text_value or "", title or "", rel or "")).strip()
    return "article-continuation-candidate" if ARTICLE_CONTINUATION_RE.search(descriptor) else "related-link"


class _HTMLRecordParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.meta: dict[str, str] = {}
        self.title = ""
        self.in_title = False
        self.in_content = 0
        self.content_parts: list[str] = []
        self.content_html: list[str] = []
        self.images: list[dict[str, Any]] = []
        self.attachments: list[dict[str, Any]] = []
        self.links: list[dict[str, Any]] = []
        self.active_anchor: dict[str, Any] | None = None
        self.language = ""
        self.jsonld: list[Any] = []
        self.in_jsonld = False
        self.jsonld_parts: list[str] = []
        self.content_scope_stack: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = {str(k).lower(): (v or "") for k, v in attrs}
        tag = tag.lower()
        if tag == "html" and a.get("lang"):
            self.language = a["lang"]
        if tag == "title":
            self.in_title = True
        is_content_scope = tag in {"article", "main"} or a.get("role", "").lower() == "main" or "articlebody" in a.get("itemprop", "").lower()
        if is_content_scope:
            self.in_content += 1
            self.content_scope_stack.append(tag)
        if tag == "meta":
            key = (a.get("property") or a.get("name") or a.get("itemprop") or "").lower()
            if key and a.get("content"):
                self.meta[key] = a["content"]
        if tag == "link" and a.get("href"):
            rel = a.get("rel", "")
            self.links.append({"url": urljoin(self.base_url, a["href"]), "rel": rel,
                               "title": a.get("title", ""), "type": a.get("type", ""),
                               "text": "", "relation": "head-link"})
            if rel.lower() == "canonical":
                self.meta["canonical"] = urljoin(self.base_url, a["href"])
        if tag in {"img", "video", "audio", "source", "iframe"}:
            url = a.get("src") or a.get("data-src") or a.get("poster")
            if url:
                media_type = "image" if tag == "img" else "video" if tag == "video" else "audio" if tag == "audio" else "embedded"
                self.images.append({"url": urljoin(self.base_url, url), "mediaType": media_type,
                                    "altText": a.get("alt", ""), "title": a.get("title", ""),
                                    "width": a.get("width"), "height": a.get("height"),
                                    "metadata": {"element": tag, "attributes": a}})
        if tag == "a" and a.get("href"):
            href = urljoin(self.base_url, a["href"])
            link = {"url": href, "rel": a.get("rel", ""), "title": a.get("title", ""),
                    "type": a.get("type", ""), "text": "", "relation": "related-link"}
            self.links.append(link)
            self.active_anchor = link
            if re.search(r"\.(pdf|docx?|xlsx?|pptx?|zip)(?:[?#].*)?$", href, re.I):
                self.attachments.append({"url": href, "mediaType": "document", "title": a.get("download", "") or a.get("title", "")})
        if tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self.in_jsonld = True
            self.jsonld_parts = []
        if self.in_content and tag in {"p", "h1", "h2", "h3", "li", "blockquote"}:
            self.content_html.append(f"<{tag}>")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "title":
            self.in_title = False
        if tag == "a" and self.active_anchor is not None:
            link = self.active_anchor
            link["text"] = re.sub(r"\s+", " ", str(link.get("text", ""))).strip()
            link["relation"] = _link_relation(link["text"], str(link.get("title", "")), str(link.get("rel", "")))
            self.active_anchor = None
        if tag in {"article", "main", "div", "section"} and self.content_scope_stack:
            # Only close a scope if the closing element matches the most recent opener.
            if self.content_scope_stack[-1] == tag:
                self.content_scope_stack.pop()
                self.in_content = max(0, self.in_content - 1)
        if tag in {"p", "h1", "h2", "h3", "li", "blockquote"} and self.content_html:
            self.content_html.append(f"</{tag}>")
        if tag == "script" and self.in_jsonld:
            raw = "".join(self.jsonld_parts).strip()
            if raw:
                try:
                    self.jsonld.append(json.loads(raw))
                except json.JSONDecodeError:
                    pass
            self.in_jsonld = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_content and not self.in_jsonld:
            self.content_parts.append(data)
            self.content_html.append(html.escape(data))
        if self.active_anchor is not None:
            self.active_anchor["text"] = str(self.active_anchor.get("text", "")) + data
        if self.in_jsonld:
            self.jsonld_parts.append(data)


def _jsonld_candidates(objects: list[Any]) -> list[dict[str, Any]]:
    found = []
    def visit(value):
        if isinstance(value, list):
            for x in value:
                visit(x)
        elif isinstance(value, dict):
            typ = value.get("@type", "")
            types = typ if isinstance(typ, list) else [typ]
            if any(str(t).lower() in {"article", "newsarticle", "blogposting", "report", "socialmediaposting"} for t in types):
                found.append(value)
            for key in ("@graph", "mainEntity", "mainEntityOfPage"):
                if key in value:
                    visit(value[key])
    for obj in objects:
        visit(obj)
    return found


def _structured_text(value: Any) -> str:
    if isinstance(value, list):
        return "\n\n".join(_structured_text(item) for item in value if item)
    if isinstance(value, dict):
        value = value.get("text") or value.get("name") or value.get("value") or ""
    return _clean(value, 200000)


def parse_html(payload: bytes, page_url: str) -> tuple[list[dict[str, Any]], str]:
    try:
        source_text = payload.decode("utf-8", errors="replace")
    except Exception as exc:
        raise ParseError(f"HTML response could not be decoded: {exc}") from exc
    parser = _HTMLRecordParser(page_url)
    try:
        parser.feed(source_text)
        parser.close()
    except Exception as exc:
        raise ParseError(f"HTML response could not be parsed: {exc}") from exc
    metas = parser.meta
    jsonld = _jsonld_candidates(parser.jsonld)
    structured = jsonld[0] if jsonld else {}
    title = metas.get("og:title") or metas.get("twitter:title") or structured.get("headline") or parser.title
    description = metas.get("og:description") or metas.get("description") or metas.get("twitter:description") or structured.get("description", "")
    canonical = metas.get("canonical") or metas.get("og:url") or structured.get("url") or page_url
    author = metas.get("author") or metas.get("article:author") or structured.get("author", "")
    if isinstance(author, dict):
        author = author.get("name", "")
    elif isinstance(author, list):
        author = [x.get("name", "") if isinstance(x, dict) else x for x in author]
    image = metas.get("og:image") or metas.get("twitter:image") or structured.get("image", "")
    if isinstance(image, dict):
        image = image.get("url", "")
    if isinstance(image, list):
        image = image[0].get("url", "") if image and isinstance(image[0], dict) else (image[0] if image else "")
    media = list(parser.images)
    if image:
        media.insert(0, {"url": urljoin(page_url, str(image)), "mediaType": "image", "caption": metas.get("og:image:alt", "")})
    visible_article_text = _clean(" ".join(parser.content_parts))
    structured_article_text = _structured_text(structured.get("articleBody", ""))
    full_text = visible_article_text or structured_article_text
    keywords = structured.get("keywords", [])
    if isinstance(keywords, str):
        keywords = [x.strip() for x in re.split(r"[,;]", keywords) if x.strip()]
    item = {
        "title": title,
        "url": canonical,
        "canonicalUrl": canonical,
        "summary": description,
        "excerpt": description,
        "fullText": full_text,
        "fullTextHtml": "".join(parser.content_html),
        "author": author,
        "publishedAt": metas.get("article:published_time") or metas.get("date") or structured.get("datePublished", ""),
        "updatedAt": metas.get("article:modified_time") or structured.get("dateModified", ""),
        "language": parser.language or metas.get("og:locale", ""),
        "categories": keywords if isinstance(keywords, list) else [],
        "media": media,
        "links": parser.links,
        "rightsMetadata": {
            "copyrightNotice": metas.get("copyright", ""),
            "licenseUrl": metas.get("license", ""),
            "rightsNotice": metas.get("rights", ""),
            "termsUrl": metas.get("terms", ""),
            "credit": metas.get("image:credit", ""),
        },
        "sourceMetadata": {"format": "html", "meta": metas, "jsonLd": parser.jsonld,
                           "documentTitle": parser.title, "httpPageUrl": page_url,
                           "articleTextSource": "html-article-scope" if visible_article_text else ("jsonld-articleBody" if structured_article_text else "unavailable"),
                           "rawHtmlPreview": source_text[:250000],
                           "rawHtmlCharacterCount": len(source_text),
                           "rawHtmlTruncated": len(source_text) > 250000},
    }
    if not title and not description and not item["fullText"] and not media:
        raise ParseError("HTML response contained no recognizable post/article information.")
    return [item], "html"


def parse_payload(payload: bytes, content_type: str, source_url: str) -> tuple[list[dict[str, Any]], str]:
    """Autodetect RSS/Atom, JSON Feed/JSON API or a generic HTML post/page."""
    stripped = payload.lstrip()
    mime = (content_type or "").split(";", 1)[0].strip().lower()
    if stripped.startswith(b"{") or stripped.startswith(b"[") or "json" in mime:
        try:
            decoded = json.loads(payload.decode("utf-8-sig"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ParseError(f"JSON source response is malformed: {exc}") from exc
        items = _find_items(decoded)
        if not items:
            raise ParseError("JSON response did not contain a recognizable post, item, entry, article or result collection.")
        return [_json_item(item, source_url) for item in items], "json"
    if stripped.startswith(b"<") and (b"<rss" in stripped[:1000].lower() or b"<feed" in stripped[:1000].lower() or b"<rdf:rdf" in stripped[:1000].lower() or "xml" in mime or "rss" in mime or "atom" in mime):
        return parse_xml(payload, source_url)
    if "xml" in mime or "rss" in mime or "atom" in mime:
        return parse_xml(payload, source_url)
    if "html" in mime or stripped.startswith(b"<!doctype html") or b"<html" in stripped[:1000].lower():
        return parse_html(payload, source_url)
    try:
        decoded = json.loads(payload.decode("utf-8-sig"))
        items = _find_items(decoded)
        if items:
            return [_json_item(item, source_url) for item in items], "json"
    except Exception:
        pass
    try:
        return parse_xml(payload, source_url)
    except ParseError:
        return parse_html(payload, source_url)

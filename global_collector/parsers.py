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
    r"\b(?:read\s+more|read\s+(?:the\s+)?(?:full\s+)?(?:article|story|report)|"
    r"continue\s+reading|continue\s+to\s+(?:the\s+)?article|"
    r"view\s+(?:the\s+)?(?:full\s+)?(?:article|story|report)|"
    r"open\s+(?:the\s+)?(?:full\s+)?(?:article|story|report)|"
    r"full\s+(?:article|story|report))\b", re.I
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

    raw_media = result.get("media")
    raw_media_values = raw_media if isinstance(raw_media, list) else ([raw_media] if raw_media not in (None, "") else [])
    media_values = []
    for candidate in raw_media_values:
        if isinstance(candidate, dict):
            candidate = dict(candidate)
            candidate_url = candidate.get("url") or candidate.get("contentUrl") or candidate.get("src") or candidate.get("href")
            if candidate_url:
                candidate["url"] = urljoin(feed_url, str(candidate_url))
            media_values.append(candidate)
        elif isinstance(candidate, str):
            media_values.append({"url": urljoin(feed_url, candidate)})
    for field in ("image", "banner_image", "thumbnailUrl", "thumbnail_url", "images", "thumbnails"):
        value = result.get(field)
        candidates = value if isinstance(value, list) else [value]
        for candidate in candidates:
            if isinstance(candidate, str) and candidate:
                media_values.append({"url": urljoin(feed_url, candidate), "mediaType": "image"})
            elif isinstance(candidate, dict):
                url = candidate.get("url") or candidate.get("contentUrl") or candidate.get("src") or candidate.get("href")
                if url:
                    media_values.append({**candidate, "url": urljoin(feed_url, str(url)),
                                         "mediaType": candidate.get("mediaType") or candidate.get("type") or "image"})
    result["media"] = _dedupe_media(media_values)

    if isinstance(result.get("attachments"), list):
        result["attachments"] = [
            ({**x, "url": urljoin(feed_url, x.get("url", ""))} if isinstance(x, dict) else x)
            for x in result["attachments"]
        ]

    raw_links = result.get("links") or result.get("relatedLinks") or []
    if isinstance(raw_links, dict):
        expanded = []
        for rel_name, link_value in raw_links.items():
            value = link_value if isinstance(link_value, dict) else {"href": link_value}
            expanded.append({**value, "rel": value.get("rel") or rel_name})
        raw_links = expanded
    if not isinstance(raw_links, list):
        raw_links = [raw_links]
    raw_links = list(raw_links)
    hal_links = result.get("_links")
    if isinstance(hal_links, dict):
        for rel_name, link_value in hal_links.items():
            values = link_value if isinstance(link_value, list) else [link_value]
            for value in values:
                value = value if isinstance(value, dict) else {"href": value}
                raw_links.append({**value, "rel": value.get("rel") or rel_name})
    normalized_links = []
    for link in raw_links:
        if isinstance(link, str):
            link = {"url": link}
        if not isinstance(link, dict):
            continue
        href = link.get("url") or link.get("href") or link.get("uri")
        if not href:
            continue
        link_url = urljoin(feed_url, str(href))
        text_value = link.get("text") or link.get("label") or link.get("anchorText") or link.get("name") or ""
        title_value = " ".join(str(link.get(key) or "") for key in ("title", "ariaLabel", "class", "className"))
        rel_value = str(link.get("rel") or link.get("relationship") or "")
        normalized_links.append({
            **link,
            "url": link_url,
            "text": str(text_value),
            "relation": _link_relation(str(text_value), title_value, rel_value),
        })
    result["links"] = _merge_json_links(normalized_links)
    result.setdefault("sourceMetadata", {"format": "json", "record": item})
    return result


def _merge_json_links(values: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: dict[str, dict[str, Any]] = {}
    for link in values:
        url = str(link.get("url") or "")
        if not url:
            continue
        if url not in unique:
            unique[url] = dict(link)
            continue
        prior = unique[url]
        for key, value in link.items():
            if prior.get(key) in (None, "", [], {}) and value not in (None, "", [], {}):
                prior[key] = value
    return list(unique.values())


def _link_relation(text_value: str, title: str, rel: str) -> str:
    """Identify a likely continuation link from exposed source labels/relations."""
    descriptor = " ".join((text_value or "", title or "", rel or "")).replace("-", " ").replace("_", " ").strip()
    rel_tokens = {token.casefold() for token in re.split(r"\s+", str(rel or ""))}
    if "next" in rel_tokens or ARTICLE_CONTINUATION_RE.search(descriptor):
        return "article-continuation-candidate"
    return "related-link"


class _HTMLRecordParser(HTMLParser):
    """Extract article content, all visible image candidates, links and source evidence."""
    IMAGE_META_KEYS = {
        "og:image", "og:image:url", "og:image:secure_url", "twitter:image",
        "twitter:image:src", "image", "image_src", "thumbnailurl",
    }

    def __init__(self, base_url: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.meta: dict[str, str] = {}
        self.meta_values: dict[str, list[str]] = {}
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

    def _add_image(self, url: str, *, attrs: dict[str, str] | None = None,
                   discovered_from: str = "html-image-element", media_type: str = "image"):
        url = str(url or "").strip()
        if not url:
            return
        attrs = attrs or {}
        self.images.append({
            "url": urljoin(self.base_url, url),
            "mediaType": media_type,
            "altText": attrs.get("alt", "") or attrs.get("aria-label", ""),
            "title": attrs.get("title", ""),
            "caption": attrs.get("data-caption", ""),
            "creator": attrs.get("data-creator", ""),
            "credit": attrs.get("data-credit", "") or attrs.get("data-attribution", ""),
            "rightsNotice": attrs.get("data-rights", "") or attrs.get("data-copyright", ""),
            "licenseUrl": attrs.get("data-license", "") or attrs.get("data-license-url", ""),
            "width": attrs.get("width"),
            "height": attrs.get("height"),
            "sourcePage": self.base_url,
            "discoveredFrom": discovered_from,
            "metadata": {"attributes": dict(attrs)},
        })

    def handle_starttag(self, tag, attrs):
        a = {str(k).lower(): (v or "") for k, v in attrs}
        tag = tag.lower()
        if tag == "html" and a.get("lang"):
            self.language = a["lang"]
        if tag == "title":
            self.in_title = True

        scope_labels = (a.get("class", "") + " " + a.get("id", "")).casefold().replace("_", "-")
        semantic_content_labels = (
            "article-body", "article-content", "story-body", "story-content",
            "entry-content", "post-content", "body-content", "main-content",
        )
        is_content_scope = (
            tag in {"article", "main"}
            or a.get("role", "").lower() == "main"
            or "articlebody" in a.get("itemprop", "").lower()
            or any(label in scope_labels for label in semantic_content_labels)
        )
        if is_content_scope:
            self.in_content += 1
            self.content_scope_stack.append(tag)

        if tag == "meta":
            key = (a.get("property") or a.get("name") or a.get("itemprop") or a.get("http-equiv") or "").lower()
            content = a.get("content", "")
            if key and content:
                self.meta[key] = content
                self.meta_values.setdefault(key, []).append(content)
                if key in self.IMAGE_META_KEYS:
                    self._add_image(content, attrs={"alt": self.meta.get("og:image:alt", "")},
                                    discovered_from="html-image-meta")

        if tag == "link" and a.get("href"):
            rel = a.get("rel", "")
            href = urljoin(self.base_url, a["href"])
            link = {"url": href, "rel": rel, "title": a.get("title", ""),
                    "type": a.get("type", ""), "text": "", "relation": "head-link",
                    "metadata": {"attributes": dict(a)}}
            self.links.append(link)
            if "canonical" in rel.lower().split():
                self.meta["canonical"] = href
            if "image_src" in rel.lower().split():
                self._add_image(href, attrs={"title": a.get("title", "")},
                                discovered_from="html-link-image")
            if "next" in rel.lower().split():
                link["relation"] = "article-continuation-candidate"

        if tag in {"img", "video", "audio", "source", "iframe"}:
            urls = []
            for key in ("src", "data-src", "data-lazy-src", "data-original", "data-image", "data-image-url"):
                if a.get(key):
                    urls.append(a[key])
            for key in ("srcset", "data-srcset", "data-lazy-srcset"):
                for part in str(a.get(key, "")).split(","):
                    bits = part.strip().split()
                    if bits and bits[0]:
                        urls.append(bits[0])
            if tag == "video" and a.get("poster"):
                self._add_image(a["poster"], attrs=a, discovered_from="html-video-poster")
            for url in urls:
                media_type = "image" if tag in {"img", "source"} else "video" if tag == "video" else "audio" if tag == "audio" else "embedded"
                self._add_image(url, attrs=a, media_type=media_type)

        if tag == "a" and a.get("href"):
            href = urljoin(self.base_url, a["href"])
            link = {"url": href, "rel": a.get("rel", ""), "title": a.get("title", ""),
                    "type": a.get("type", ""), "text": "", "relation": "related-link",
                    "metadata": {"attributes": dict(a)}}
            if a.get("aria-label"):
                link["ariaLabel"] = a["aria-label"]
            if a.get("class"):
                link["className"] = a["class"]
            self.links.append(link)
            self.active_anchor = link
            if re.search(r"\.(pdf|docx?|xlsx?|pptx?|zip)(?:[?#].*)?$", href, re.I):
                self.attachments.append({"url": href, "mediaType": "document",
                                         "title": a.get("download", "") or a.get("title", "")})

        if tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self.in_jsonld = True
            self.jsonld_parts = []
        if self.in_content and tag in {"p", "h1", "h2", "h3", "h4", "li", "blockquote"}:
            self.content_html.append(f"<{tag}>")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "title":
            self.in_title = False
        if tag == "a" and self.active_anchor is not None:
            link = self.active_anchor
            link["text"] = re.sub(r"\s+", " ", str(link.get("text", ""))).strip()
            link["relation"] = _link_relation(
                link["text"],
                " ".join((str(link.get("title", "")), str(link.get("ariaLabel", "")), str(link.get("className", "")))),
                str(link.get("rel", "")),
            )
            self.active_anchor = None
        if tag in {"article", "main", "div", "section"} and self.content_scope_stack:
            if self.content_scope_stack[-1] == tag:
                self.content_scope_stack.pop()
                self.in_content = max(0, self.in_content - 1)
        if tag in {"p", "h1", "h2", "h3", "h4", "li", "blockquote"} and self.content_html:
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


def _structured_image_records(value: Any, page_url: str) -> list[dict[str, Any]]:
    values = value if isinstance(value, list) else [value]
    output = []
    for item in values:
        if isinstance(item, str):
            url = item
            details = {}
        elif isinstance(item, dict):
            url = item.get("contentUrl") or item.get("url") or item.get("thumbnailUrl") or ""
            details = item
        else:
            continue
        if not url:
            continue
        creator = details.get("creator") or details.get("author") or ""
        if isinstance(creator, dict):
            creator = creator.get("name", "")
        license_value = details.get("license") or details.get("acquireLicensePage") or ""
        output.append({
            "url": urljoin(page_url, str(url)),
            "mediaType": "image",
            "title": details.get("name", ""),
            "caption": details.get("caption") or details.get("description", ""),
            "altText": details.get("alternateName", ""),
            "creator": creator,
            "credit": details.get("creditText") or details.get("copyrightHolder", ""),
            "rightsNotice": details.get("copyrightNotice", ""),
            "licenseUrl": license_value if isinstance(license_value, str) else "",
            "width": details.get("width"),
            "height": details.get("height"),
            "sourcePage": page_url,
            "discoveredFrom": "jsonld-image-object",
            "metadata": details,
        })
    return output


def _dedupe_media(values: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: dict[str, dict[str, Any]] = {}
    for raw in values:
        if not isinstance(raw, dict) or not raw.get("url"):
            continue
        key = str(raw["url"]).strip()
        if key not in unique:
            unique[key] = dict(raw)
            continue
        prior = unique[key]
        for field, value in raw.items():
            if field == "metadata" and isinstance(value, dict):
                if not isinstance(prior.get("metadata"), dict):
                    prior["metadata"] = {}
                prior["metadata"].update({k: v for k, v in value.items() if k not in prior["metadata"]})
            elif prior.get(field) in (None, "", [], {}) and value not in (None, "", [], {}):
                prior[field] = value
    return list(unique.values())


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
    author = metas.get("author") or metas.get("article:author") or metas.get("dc.creator") or structured.get("author", "")
    if isinstance(author, dict):
        author = author.get("name", "")
    elif isinstance(author, list):
        author = [x.get("name", "") if isinstance(x, dict) else x for x in author]

    media = list(parser.images)
    for key in _HTMLRecordParser.IMAGE_META_KEYS:
        for value in parser.meta_values.get(key, []):
            if value:
                media.append({"url": urljoin(page_url, value), "mediaType": "image",
                              "caption": metas.get("og:image:alt", "") or metas.get("twitter:image:alt", ""),
                              "sourcePage": page_url, "discoveredFrom": "html-image-meta",
                              "metadata": {"metaKey": key}})
    for article in jsonld:
        media.extend(_structured_image_records(article.get("image") or article.get("thumbnailUrl"), page_url))
    media = _dedupe_media(media)
    page_credit = metas.get("image:credit") or metas.get("og:image:credit") or metas.get("twitter:image:credit") or ""
    page_copyright = metas.get("image:copyright") or metas.get("copyright") or metas.get("copyrightnotice") or ""
    page_license = metas.get("image:license") or metas.get("license") or metas.get("dcterms.license") or ""
    for candidate in media:
        candidate.setdefault("sourcePage", page_url)
        if not candidate.get("credit") and page_credit:
            candidate["credit"] = page_credit
        if not candidate.get("rightsNotice") and page_copyright:
            candidate["rightsNotice"] = page_copyright
        if not candidate.get("licenseUrl") and str(page_license).startswith("https://"):
            candidate["licenseUrl"] = page_license
        if not candidate.get("licenseName") and page_license and not str(page_license).startswith("https://"):
            candidate["licenseName"] = page_license

    visible_article_text = _clean(" ".join(parser.content_parts))
    structured_article_text = _structured_text(structured.get("articleBody", ""))
    full_text = visible_article_text or structured_article_text
    keywords = structured.get("keywords", [])
    if isinstance(keywords, str):
        keywords = [x.strip() for x in re.split(r"[,;]", keywords) if x.strip()]

    copyright_notice = (metas.get("copyright") or metas.get("copyrightnotice")
                        or metas.get("dc.rights") or metas.get("dcterms.rights") or "")
    license_value = metas.get("license") or metas.get("dcterms.license") or metas.get("rights:license") or ""
    credit = (metas.get("image:credit") or metas.get("og:image:credit")
              or metas.get("twitter:image:credit") or metas.get("dc.creator") or "")
    rights_notice = metas.get("rights") or metas.get("dcterms.rights") or ""
    rights_metadata = {
        "copyrightNotice": copyright_notice,
        "licenseUrl": license_value if str(license_value).startswith("https://") else "",
        "licenseName": license_value if license_value and not str(license_value).startswith("https://") else "",
        "rightsNotice": rights_notice,
        "termsUrl": metas.get("terms") or metas.get("termsurl") or "",
        "creator": str(author) if isinstance(author, str) else "",
        "attribution": credit,
        "credit": credit,
        "sourcePage": page_url,
        "metadata": {key: values for key, values in parser.meta_values.items()},
    }
    item = {
        "title": title,
        "url": canonical,
        "canonicalUrl": canonical,
        "summary": description,
        "excerpt": description,
        "fullText": full_text,
        "fullTextHtml": "".join(parser.content_html),
        "author": author,
        "publishedAt": metas.get("article:published_time") or metas.get("datepublished") or metas.get("date") or structured.get("datePublished", ""),
        "updatedAt": metas.get("article:modified_time") or metas.get("datemodified") or structured.get("dateModified", ""),
        "language": parser.language or metas.get("og:locale", ""),
        "categories": keywords if isinstance(keywords, list) else [],
        "media": media,
        "attachments": parser.attachments,
        "links": parser.links,
        "rightsMetadata": rights_metadata,
        "sourceMetadata": {
            "format": "html", "meta": metas, "metaValues": parser.meta_values,
            "jsonLd": parser.jsonld, "documentTitle": parser.title,
            "httpPageUrl": page_url,
            "articleTextSource": "html-article-scope" if visible_article_text else ("jsonld-articleBody" if structured_article_text else "unavailable"),
            "rawHtmlPreview": source_text[:250000],
            "rawHtmlCharacterCount": len(source_text),
            "rawHtmlTruncated": len(source_text) > 250000,
        },
    }
    if not title and not description and not item["fullText"] and not media and not item["links"]:
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

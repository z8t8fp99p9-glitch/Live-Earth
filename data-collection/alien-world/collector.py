#!/usr/bin/env python3
"""Alien World Data Collector.

This is the only Alien World component that accesses external sources and writes
source records/media into the Alien World database. It never publishes a feed or
builds a magazine. The Publisher and Universal Editorial Engine remain network-free.

Image policy: prefer the actual image exposed by the original NASA feed/article
(Open Graph/Twitter image, RSS media:content/enclosure, or an article-body image).
Do not search for a merely similar image. If no source-post image can be obtained
from an allowlisted NASA host, the story remains text-only.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import sqlite3
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = ROOT / "publishers" / "alien-world" / "profile.json"
DB_DIR = ROOT / ".publisher-data" / "alien-world"
DB_PATH = DB_DIR / "alien-world.sqlite3"
MEDIA_DIR = DB_DIR / "media"
MAX_FEED_BYTES = 4 * 1024 * 1024
MAX_PAGE_BYTES = 3 * 1024 * 1024
MAX_IMAGE_BYTES = 7 * 1024 * 1024
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 "
    "LIVE-EARTH-AlienWorldDataCollector/1.2"
)
VALID_IMAGE_STATUS = "nasa-guideline-reviewed-exclusion-screened"
THIRD_PARTY_MARKERS = (
    "getty images", "shutterstock", "reuters", "associated press", "ap photo",
    "afp/getty", "esa photo", "© esa", "jaxa photo", "© jaxa", "all rights reserved",
    "dreamstime", "alamy stock", "istock", "depositphotos", "wireimage", "alamy",
)
NON_PHOTOGRAPHIC_MARKERS = (
    "artist concept", "artist's concept", "artist’s concept", "artist impression",
    "artist's impression", "illustration", "illustrative", "simulation", "simulated",
    "rendering", "rendered", "diagram", "infographic", "concept art", "model image",
)
STOP_WORDS = {
    "nasa", "space", "the", "and", "for", "with", "from", "into", "after",
    "before", "about", "mission", "missions", "update", "new", "first", "will",
    "this", "that", "over", "under", "using", "its", "their", "through",
}


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def clean_html(value: str | None, limit: int = 9000) -> str:
    parser = TextExtractor()
    try:
        parser.feed(value or "")
        parser.close()
    except Exception:
        pass
    return re.sub(r"\s+", " ", html.unescape(" ".join(parser.parts))).strip()[:limit]


def parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value.strip())
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        pass
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def allowed_https(url: str, domains: list[str]) -> bool:
    try:
        parsed = urllib.parse.urlparse(str(url).strip())
        host = (parsed.hostname or "").lower().rstrip(".")
        return (
            parsed.scheme.lower() == "https"
            and bool(host)
            and not parsed.username
            and not parsed.password
            and any(host == domain or host.endswith("." + domain) for domain in domains)
        )
    except (TypeError, ValueError):
        return False


def nasa_host_url(url: str) -> bool:
    return allowed_https(url, ["nasa.gov"])


def fetch_bytes(url: str, limit: int, timeout: int = 15, referer: str | None = None) -> bytes:
    """Bounded HTTPS fetch for allowlisted NASA hosts only, including safe redirects."""
    if not nasa_host_url(url):
        raise ValueError("Collector permits only allowlisted HTTPS NASA hosts in this release.")
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8",
        "Cache-Control": "no-cache",
    }
    # NASA's media CDN may apply hotlink controls. Supply the source article as
    # Referer, but never allow a non-NASA URL to enter this header.
    if referer and nasa_host_url(referer):
        headers["Referer"] = referer
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        final_url = response.geturl()
        if not nasa_host_url(final_url):
            raise ValueError("Remote redirect left the approved NASA host family.")
        if response.status >= 400:
            raise ValueError(f"Remote source returned HTTP {response.status}.")
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("Remote item exceeded the configured size limit.")
        if not data:
            raise ValueError("Remote source returned an empty response.")
        return data


def _srcset_urls(value: str) -> list[str]:
    """Return responsive-image candidates, largest declared width first."""
    parsed: list[tuple[int, str]] = []
    for candidate in (value or "").split(","):
        parts = candidate.strip().split()
        if not parts:
            continue
        score = 0
        if len(parts) > 1:
            descriptor = parts[1].lower()
            match = re.fullmatch(r"(\d+(?:\.\d+)?)(w|x)", descriptor)
            if match:
                score = int(float(match.group(1)) * (1000 if match.group(2) == "x" else 1))
        parsed.append((score, parts[0]))
    return [url for _, url in sorted(parsed, key=lambda item: item[0], reverse=True)]


def _srcset_first(value: str) -> str:
    candidates = _srcset_urls(value)
    return candidates[0] if candidates else ""


class ArticleMetadataParser(HTMLParser):
    """Read image/source metadata only; do not scrape article copy."""
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}
        self.images: list[dict[str, str]] = []
        self._jsonld_active = False
        self._jsonld_parts: list[str] = []

    def _add_image(self, url: str, caption: str = "", credit: str = "") -> None:
        value = (url or "").strip()
        if value:
            self.images.append({"url": value, "caption": caption or "", "credit": credit or ""})

    def _add_jsonld_images(self, value: Any, image_context: bool = False) -> None:
        """Extract only JSON-LD image fields; ignore the article's own page URL."""
        if isinstance(value, str):
            if image_context:
                self._add_image(value)
            return
        if isinstance(value, list):
            for item in value:
                self._add_jsonld_images(item, image_context=image_context)
            return
        if not isinstance(value, dict):
            return
        raw_type = value.get("@type", "")
        types = raw_type if isinstance(raw_type, list) else [raw_type]
        is_image_object = image_context or any("imageobject" in str(kind).lower() for kind in types)
        caption = str(value.get("caption") or value.get("name") or "")
        credit = str(value.get("creditText") or value.get("copyrightNotice") or "")
        if is_image_object:
            for key in ("contentUrl", "thumbnailUrl", "url"):
                item = value.get(key)
                if isinstance(item, str):
                    self._add_image(item, caption, credit)
                elif isinstance(item, (dict, list)):
                    self._add_jsonld_images(item, image_context=True)
        # Enter image context only through explicit image-bearing properties.
        for key in ("image", "thumbnail", "associatedMedia"):
            if key in value:
                self._add_jsonld_images(value[key], image_context=True)
        # Schema.org graph containers can contain the Article and ImageObject nodes.
        for key in ("@graph", "mainEntity"):
            if key in value:
                self._add_jsonld_images(value[key], image_context=False)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {str(k).lower(): (v or "").strip() for k, v in attrs}
        tag = tag.lower()
        if tag == "script" and "ld+json" in attr.get("type", "").lower():
            self._jsonld_active = True
            self._jsonld_parts = []
        if tag == "meta":
            key = (attr.get("property") or attr.get("name") or attr.get("itemprop") or "").lower()
            value = attr.get("content", "")
            if key and value:
                self.meta[key] = value
                if key in {"og:image", "og:image:url", "twitter:image", "twitter:image:src", "image"}:
                    self._add_image(value, self.meta.get("og:image:alt") or self.meta.get("twitter:image:alt", ""),
                                    self.meta.get("image:credit") or self.meta.get("og:image:credit", ""))
        elif tag == "link" and ("image" in attr.get("rel", "").lower() or attr.get("itemprop", "").lower() == "image"):
            self._add_image(attr.get("href", ""))
        elif tag in {"img", "source"}:
            # NASA pages use several lazy-loading conventions. Keep the largest
            # source-post candidate first; all are still restricted to nasa.gov.
            keys = ("src", "data-src", "data-lazy-src", "data-original", "data-original-src",
                    "data-image", "data-image-url", "data-full-src", "data-hero-image", "data-background-image")
            found = next((attr.get(key, "") for key in keys if attr.get(key)), "")
            if found:
                self._add_image(found, attr.get("alt") or attr.get("title", ""), attr.get("data-credit", ""))
            for key in ("srcset", "data-srcset", "data-lazy-srcset"):
                for candidate in _srcset_urls(attr.get(key, "")):
                    self._add_image(candidate, attr.get("alt") or attr.get("title", ""), attr.get("data-credit", ""))
        # Some hero images are published as inline background-image declarations.
        style = attr.get("style", "")
        for match in re.findall(r"url\(\s*['\"]?([^'\")]+)", style, flags=re.IGNORECASE):
            self._add_image(match, attr.get("alt") or attr.get("title", ""), attr.get("data-credit", ""))

    def handle_data(self, data: str) -> None:
        if self._jsonld_active:
            self._jsonld_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._jsonld_active:
            raw = "".join(self._jsonld_parts).strip()
            self._jsonld_active = False
            self._jsonld_parts = []
            if raw:
                try:
                    self._add_jsonld_images(json.loads(raw))
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass


def _node_text(node: ET.Element | None) -> str:
    if node is None:
        return ""
    return "".join(node.itertext()).strip()


def _feed_image_candidates(node: ET.Element, article_url: str) -> list[dict[str, str]]:
    candidates: list[dict[str, str]] = []
    for child in node.iter():
        local = child.tag.rsplit("}", 1)[-1].lower()
        attrs = child.attrib
        if local in {"content", "thumbnail", "enclosure"}:
            media_url = attrs.get("url") or attrs.get("href") or ""
            media_type = (attrs.get("type") or "").lower()
            if media_url and (local != "enclosure" or not media_type or media_type.startswith("image/")):
                candidates.append({
                    "url": urllib.parse.urljoin(article_url, media_url),
                    "caption": clean_html(attrs.get("title") or attrs.get("label") or "", 240),
                    "credit": clean_html(attrs.get("credit") or "", 180),
                })
    # RSS content:encoded and Atom content/summary may carry the article's actual
    # lead image. Extract only image references and captions, never article text.
    for child in node.iter():
        local = child.tag.rsplit("}", 1)[-1].lower()
        if local in {"encoded", "description", "content", "summary"} and child.text:
            parser = ArticleMetadataParser()
            try:
                # Atom commonly entity-escapes HTML summaries instead of using
                # CDATA; unescape once so embedded source-post image tags are visible.
                parser.feed(html.unescape(child.text))
                parser.close()
            except Exception:
                pass
            for item in parser.images:
                candidates.append({
                    "url": urllib.parse.urljoin(article_url, item["url"]),
                    "caption": clean_html(item.get("caption"), 240),
                    "credit": clean_html(item.get("credit"), 180),
                })
    unique: dict[str, dict[str, str]] = {}
    for item in candidates:
        url = item.get("url", "").strip()
        if url and url not in unique:
            unique[url] = item
    return list(unique.values())


def parse_feed(payload: bytes, source_name: str, source_url: str) -> list[dict[str, Any]]:
    """Parse RSS or Atom feed entries, including media references where supplied."""
    root = ET.fromstring(payload)
    items: list[dict[str, Any]] = []
    rss_nodes = root.findall(".//item")
    if rss_nodes:
        for node in rss_nodes:
            def child(names: list[str]) -> str:
                for name in names:
                    found = node.find(name)
                    if found is not None:
                        value = _node_text(found)
                        if value:
                            return value
                return ""
            title = clean_html(child(["title"]), 240)
            url = child(["link"])
            summary = clean_html(child([
                "{http://purl.org/rss/1.0/modules/content/}encoded", "description"
            ]), 9000)
            published = child(["pubDate", "{http://purl.org/dc/elements/1.1/}date", "date"])
            items.append({
                "title": title, "url": url, "summary": summary, "published": published,
                "sourceName": source_name, "sourceUrl": source_url,
                "imageCandidates": _feed_image_candidates(node, url),
            })
        return items

    atom = "{http://www.w3.org/2005/Atom}"
    for node in root.findall(".//" + atom + "entry"):
        title_el = node.find(atom + "title")
        title = clean_html(_node_text(title_el), 240)
        url = ""
        for link in node.findall(atom + "link"):
            if link.attrib.get("rel", "alternate") == "alternate":
                url = link.attrib.get("href", "")
                break
        content_el = node.find(atom + "content")
        if content_el is None:
            content_el = node.find(atom + "summary")
        summary = clean_html(_node_text(content_el), 9000)
        date_el = node.find(atom + "published")
        if date_el is None:
            date_el = node.find(atom + "updated")
        published = _node_text(date_el)
        items.append({
            "title": title, "url": url, "summary": summary, "published": published,
            "sourceName": source_name, "sourceUrl": source_url,
            "imageCandidates": _feed_image_candidates(node, url),
        })
    return items


def article_media(
    article_url: str,
    feed_candidates: list[dict[str, str]] | None = None,
    diagnostics: list[str] | None = None,
) -> list[dict[str, str]]:
    """Return images embedded by the original NASA post; never keyword-search pictures."""
    candidates: list[dict[str, str]] = list(feed_candidates or [])
    meta: dict[str, str] = {}
    page_candidate_count = 0
    if nasa_host_url(article_url):
        try:
            page = fetch_bytes(article_url, MAX_PAGE_BYTES, timeout=15).decode("utf-8", errors="replace")
            parser = ArticleMetadataParser()
            parser.feed(page)
            parser.close()
            meta = parser.meta
            page_candidate_count = len(parser.images)
            candidates = parser.images + candidates
        except Exception as exc:
            if diagnostics is not None:
                diagnostics.append(f"Article image metadata fetch failed ({type(exc).__name__}: {str(exc)[:120]}).")
    result: list[dict[str, str]] = []
    seen: set[str] = set()
    rejected_hosts = 0
    for item in candidates:
        raw = str(item.get("url", "")).strip()
        url = urllib.parse.urljoin(article_url, raw)
        if not nasa_host_url(url):
            rejected_hosts += 1
            continue
        if url in seen:
            continue
        seen.add(url)
        path = urllib.parse.urlparse(url).path.lower()
        if path.endswith((".svg", ".gif", ".webm", ".mp4")):
            continue
        result.append({
            "url": url,
            "caption": clean_html(item.get("caption") or meta.get("og:image:alt") or meta.get("og:description") or meta.get("description") or "", 240),
            "credit": clean_html(item.get("credit") or meta.get("image:credit") or meta.get("og:image:credit") or meta.get("author") or "", 180),
        })
    if diagnostics is not None:
        diagnostics.append(
            f"Image candidates for article: feed={len(feed_candidates or [])}, "
            f"page={page_candidate_count}, approved={len(result)}, rejected_non_NASA={rejected_hosts}."
        )
    return result[:16]


def image_descriptors(item: dict[str, str], article_title: str) -> str:
    return " ".join([
        str(item.get("caption", "")), str(item.get("credit", "")),
        str(item.get("url", "")), article_title,
    ]).lower()


def image_is_eligible(item: dict[str, str], article_title: str) -> bool:
    descriptor = image_descriptors(item, article_title)
    if any(marker in descriptor for marker in THIRD_PARTY_MARKERS):
        return False
    # An explicitly labelled NASA illustration can still be shown as an
    # illustration; the rights note below labels it clearly rather than calling
    # it a documentary photograph.
    return nasa_host_url(item.get("url", ""))


def image_type_label(item: dict[str, str]) -> str:
    descriptor = image_descriptors(item, "")
    if any(marker in descriptor for marker in NON_PHOTOGRAPHIC_MARKERS):
        return "NASA source illustration / artist concept (not a documentary photograph)"
    return "Image from the original NASA article/feed; not independently rights-cleared"


def download_article_image(
    candidate: dict[str, str], article_url: str, target: Path,
    byte_limit: int = MAX_IMAGE_BYTES, diagnostics: list[str] | None = None,
) -> dict[str, str] | None:
    """Download and validate one actual source-post image; retain source provenance."""
    url = candidate.get("url", "")
    if not nasa_host_url(url) or not nasa_host_url(article_url):
        if diagnostics is not None:
            diagnostics.append("Image candidate rejected: source or image host is outside NASA.gov.")
        return None
    if not image_is_eligible(candidate, article_url):
        if diagnostics is not None:
            diagnostics.append("Image candidate rejected by the third-party rights exclusion screen.")
        return None
    try:
        raw = fetch_bytes(url, byte_limit, timeout=20, referer=article_url)
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(BytesIO(raw)) as source:
            if source.format not in {"JPEG", "PNG", "WEBP", "TIFF", "AVIF"}:
                raise ValueError(f"Unsupported source image format: {source.format or 'unknown'}")
            if source.width < 160 or source.height < 100:
                raise ValueError(f"Source image is too small ({source.width}×{source.height}).")
            image = ImageOps.exif_transpose(source).convert("RGB")
            try:
                image.thumbnail((1800, 1300), Image.Resampling.LANCZOS)
                saved_size = image.size
                image.save(target, "JPEG", quality=86, optimize=True)
            finally:
                image.close()
        caption = clean_html(candidate.get("caption") or "Image supplied by the original source post", 180)
        credit = clean_html(candidate.get("credit") or "NASA — individual image credit not stated in feed metadata", 180)
        kind = image_type_label(candidate)
        if diagnostics is not None:
            diagnostics.append(f"Source image downloaded and validated ({saved_size[0]}×{saved_size[1]}).")
        return {
            "url": url,
            "caption": caption,
            "credit": credit,
            "source_url": article_url,
            "rights_status": VALID_IMAGE_STATUS,
            "rights_note": f"{kind}. Source attribution is retained; NASA and asset-specific third-party usage terms still apply.",
        }
    except Exception as exc:
        target.unlink(missing_ok=True)
        if diagnostics is not None:
            diagnostics.append(f"Image download/validation failed ({type(exc).__name__}: {str(exc)[:140]}).")
        return None


def open_writer_db(profile: dict[str, Any]) -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=DELETE")
    con.execute("PRAGMA foreign_keys=ON")
    con.execute("""CREATE TABLE IF NOT EXISTS publisher_meta (
        key TEXT PRIMARY KEY, value TEXT NOT NULL)""")
    con.execute("""CREATE TABLE IF NOT EXISTS stories (
        story_id TEXT PRIMARY KEY,
        view_id TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        source_name TEXT NOT NULL,
        source_url TEXT NOT NULL,
        feed_guid TEXT NOT NULL DEFAULT '',
        published_at REAL NOT NULL,
        retrieved_at REAL NOT NULL,
        image_url TEXT,
        image_local_path TEXT,
        image_caption TEXT,
        image_credit TEXT,
        image_source_url TEXT,
        image_rights_status TEXT,
        image_rights_note TEXT,
        image_checked_at REAL
    )""")
    con.execute("CREATE INDEX IF NOT EXISTS idx_aw_story_time ON stories(view_id, published_at DESC)")
    for key, value in (("view_id", profile["viewId"]),
                       ("publisher_id", profile["publisherId"]),
                       ("schema_version", "1")):
        existing = con.execute("SELECT value FROM publisher_meta WHERE key=?", (key,)).fetchone()
        if existing and key in ("view_id", "publisher_id") and existing[0] != value:
            con.close()
            raise RuntimeError(f"Refusing to use a database owned by a different {key}.")
        con.execute("INSERT INTO publisher_meta(key,value) VALUES(?,?) "
                    "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, str(value)))
    con.commit()
    return con


def collect(profile: dict[str, Any], now: datetime, logs: list[str]) -> dict[str, int]:
    domains = profile.get("sourcePolicy", {}).get("allowedArticleDomains", ["nasa.gov"])
    if domains != ["nasa.gov"] and "nasa.gov" not in domains:
        raise RuntimeError("This first Alien World release is restricted to official NASA source domains.")
    cutoff = now - timedelta(days=int(profile.get("database", {}).get("retentionDays", 30)))
    max_feed_bytes = int(profile.get("collection", {}).get("maximumFeedBytes", MAX_FEED_BYTES))
    max_image_bytes = int(profile.get("collection", {}).get("maximumImageBytes", MAX_IMAGE_BYTES))
    if not 1024 <= max_feed_bytes <= 10 * 1024 * 1024 or not 1024 <= max_image_bytes <= 12 * 1024 * 1024:
        raise RuntimeError("Collector byte limits are outside the safe configured range.")
    collected = 0
    pending_media: dict[str, list[dict[str, str]]] = {}
    con = open_writer_db(profile)
    try:
        for source in profile.get("sources", []):
            name, feed_url = str(source.get("name", "")), str(source.get("feedUrl", ""))
            if not name or not nasa_host_url(feed_url):
                logs.append(f"Skipped unapproved source configuration: {name or 'unnamed'}")
                continue
            try:
                items = parse_feed(fetch_bytes(feed_url, max_feed_bytes), name, feed_url)
                logs.append(f"Source collected: {name} ({len(items)} feed entries)")
            except Exception as exc:
                logs.append(f"Source unavailable: {name}: {str(exc)[:140]}")
                continue
            for item in items:
                title = clean_html(item.get("title", ""), 240)
                url = str(item.get("url", "")).strip()
                published = parse_date(item.get("published"))
                if not title or len(title) < 8 or not nasa_host_url(url) or not published:
                    continue
                if published < cutoff or published > now + timedelta(hours=2):
                    continue
                summary = clean_html(item.get("summary", ""), 9000)
                if len(summary) < 35:
                    summary = "The source feed provides no substantial summary. Consult the original report for full detail and limitations."
                story_id = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
                pending = pending_media.setdefault(story_id, [])
                known_urls = {entry.get("url") for entry in pending}
                pending.extend(entry for entry in (item.get("imageCandidates") or [])
                               if entry.get("url") not in known_urls)
                con.execute("""INSERT INTO stories(
                    story_id,view_id,url,title,summary,source_name,source_url,feed_guid,published_at,retrieved_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(url) DO UPDATE SET
                    title=excluded.title,
                    summary=CASE WHEN length(excluded.summary)>length(stories.summary)
                                 THEN excluded.summary ELSE stories.summary END,
                    source_name=excluded.source_name, source_url=excluded.source_url,
                    retrieved_at=excluded.retrieved_at""",
                    (story_id, profile["viewId"], url, title, summary, name, feed_url,
                     story_id, published.timestamp(), now.timestamp()))
                collected += 1
        con.commit()

        # Only enrich the most recent bounded set; media lookup remains Collector-owned.
        max_images = max(0, min(12, int(profile.get("editorialProfile", {}).get("maximumDocumentaryImages", 5))))
        rows = con.execute("""SELECT story_id,title,url,image_local_path,image_checked_at
                            FROM stories WHERE view_id=? ORDER BY published_at DESC LIMIT ?""",
                           (profile["viewId"], max_images)).fetchall()
        prepared = 0
        for row in rows:
            local = Path(row["image_local_path"]) if row["image_local_path"] else None
            if local and local.is_file():
                continue
            # Missing images are retried on each bounded Collector run. Earlier
            # failures must not freeze a story as text-only for seven days after a
            # temporary CDN/WAF/metadata issue. The profile caps this pass at 5.
            story_logs: list[str] = []
            candidates = article_media(
                str(row["url"]), pending_media.get(str(row["story_id"]), []), story_logs
            )
            target = MEDIA_DIR / (str(row["story_id"]) + ".jpg")
            found = None
            for candidate in candidates:
                found = download_article_image(
                    candidate, str(row["url"]), target, max_image_bytes, story_logs
                )
                if found:
                    break
            logs.extend(f"{str(row['title'])[:72]} — {message}" for message in story_logs)
            if found:
                con.execute("""UPDATE stories SET image_url=?,image_local_path=?,image_caption=?,image_credit=?,
                    image_source_url=?,image_rights_status=?,image_rights_note=?,image_checked_at=? WHERE story_id=?""",
                    (found["url"], str(target), found["caption"], found["credit"], found["source_url"],
                     found["rights_status"], found["rights_note"], now.timestamp(), row["story_id"]))
                prepared += 1
            else:
                con.execute("UPDATE stories SET image_checked_at=? WHERE story_id=?",
                            (now.timestamp(), row["story_id"]))
                target.unlink(missing_ok=True)
                if not candidates:
                    logs.append(f"Image not prepared for '{str(row['title'])[:72]}': no approved original-post image candidate; will retry next run.")
                elif not story_logs:
                    logs.append(f"Image not prepared for '{str(row['title'])[:72]}': no approved source image passed validation; will retry next run.")
        con.commit()

        retention_seconds = int(profile.get("database", {}).get("retentionDays", 30)) * 86400
        con.execute("DELETE FROM stories WHERE view_id=? AND published_at < ?",
                    (profile["viewId"], now.timestamp() - retention_seconds))
        cap = max(20, min(2000, int(profile.get("database", {}).get("maximumRecords", 500))))
        con.execute("""DELETE FROM stories WHERE view_id=? AND story_id NOT IN
            (SELECT story_id FROM stories WHERE view_id=? ORDER BY published_at DESC LIMIT ?)""",
            (profile["viewId"], profile["viewId"], cap))
        con.commit()

        retained = {str(row[0]) for row in con.execute(
            "SELECT image_local_path FROM stories WHERE view_id=? AND image_local_path IS NOT NULL",
            (profile["viewId"],)
        ).fetchall()}
        if MEDIA_DIR.exists():
            for image in MEDIA_DIR.glob("*.jpg"):
                if str(image) not in retained:
                    image.unlink(missing_ok=True)

        remaining = con.execute("SELECT COUNT(*) FROM stories WHERE view_id=?", (profile["viewId"],)).fetchone()[0]
        image_count = con.execute("SELECT COUNT(*) FROM stories WHERE view_id=? AND image_local_path IS NOT NULL", (profile["viewId"],)).fetchone()[0]
        return {"collected": collected, "imagesPrepared": prepared, "databaseRecords": int(remaining), "databaseImages": int(image_count)}
    finally:
        con.close()


def main() -> int:
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    if profile.get("viewId") != "alien-world" or profile.get("publisherId") != "alien-world-publisher":
        raise SystemExit("Collector profile identity check failed.")
    if profile.get("collection", {}).get("networkAccessOwner") != "AlienWorldDataCollector":
        raise SystemExit("Collector network/database ownership is not declared in the Publisher profile.")
    now = datetime.now(timezone.utc)
    logs: list[str] = []
    try:
        stats = collect(profile, now, logs)
        print(json.dumps({"status": "collected", "viewId": profile["viewId"],
                          "generatedAt": now.isoformat(), **stats, "logs": logs}, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"status": "collection_failed", "error": str(exc), "logs": logs}, indent=2))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

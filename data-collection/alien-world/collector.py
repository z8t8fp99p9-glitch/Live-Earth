#!/usr/bin/env python3
"""Alien World Data Collector.

The only component in the Alien World pipeline allowed to access external
sources or write the source database. It collects source records and screened
media into the view-scoped SQLite store. It does not publish feeds or PDFs.
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
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = ROOT / "publishers" / "alien-world" / "profile.json"
DB_DIR = ROOT / ".publisher-data" / "alien-world"
DB_PATH = DB_DIR / "alien-world.sqlite3"
MEDIA_DIR = DB_DIR / "media"
NASA_IMAGE_API = "https://images-api.nasa.gov/search"
MAX_FEED_BYTES = 4 * 1024 * 1024
MAX_IMAGE_BYTES = 7 * 1024 * 1024
USER_AGENT = "LIVE-EARTH-AlienWorldDataCollector/1.0"
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
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def clean_html(value: str, limit: int = 9000) -> str:
    parser = TextExtractor()
    try:
        parser.feed(value or "")
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
        parsed = urllib.parse.urlparse(url)
        host = (parsed.hostname or "").lower()
        return parsed.scheme == "https" and bool(host) and any(
            host == domain or host.endswith("." + domain) for domain in domains
        )
    except ValueError:
        return False


def fetch_bytes(url: str, limit: int, timeout: int = 15) -> bytes:
    if not allowed_https(url, ["nasa.gov"]):
        raise ValueError("Collector permits only allowlisted HTTPS NASA hosts in this release.")
    request = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, application/json, image/*, */*",
    })
    with urllib.request.urlopen(request, timeout=timeout) as response:
        if not allowed_https(response.geturl(), ["nasa.gov"]):
            raise ValueError("Remote redirect left the approved NASA host family.")
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("Remote item exceeded the configured size limit.")
        if response.status >= 400:
            raise ValueError(f"Remote source returned HTTP {response.status}.")
        return data


def parse_feed(payload: bytes, source_name: str, source_url: str) -> list[dict[str, str]]:
    root = ET.fromstring(payload)
    items: list[dict[str, str]] = []
    rss_nodes = root.findall(".//item")
    if rss_nodes:
        for node in rss_nodes:
            def child(names: list[str]) -> str:
                for name in names:
                    found = node.find(name)
                    if found is not None and found.text:
                        return found.text.strip()
                return ""
            title = clean_html(child(["title"]), 240)
            url = child(["link"])
            summary = clean_html(child([
                "{http://purl.org/rss/1.0/modules/content/}encoded", "description"
            ]), 9000)
            published = child(["pubDate", "{http://purl.org/dc/elements/1.1/}date", "date"])
            items.append({"title": title, "url": url, "summary": summary,
                          "published": published, "sourceName": source_name,
                          "sourceUrl": source_url})
        return items

    atom = "{http://www.w3.org/2005/Atom}"
    for node in root.findall(".//" + atom + "entry"):
        title_el = node.find(atom + "title")
        title = clean_html(title_el.text if title_el is not None and title_el.text else "", 240)
        url = ""
        for link in node.findall(atom + "link"):
            if link.attrib.get("rel", "alternate") == "alternate":
                url = link.attrib.get("href", "")
                break
        content_el = node.find(atom + "content")
        if content_el is None:
            content_el = node.find(atom + "summary")
        summary = clean_html(content_el.text if content_el is not None and content_el.text else "", 9000)
        date_el = node.find(atom + "published")
        if date_el is None:
            date_el = node.find(atom + "updated")
        published = date_el.text if date_el is not None and date_el.text else ""
        items.append({"title": title, "url": url, "summary": summary,
                      "published": published, "sourceName": source_name,
                      "sourceUrl": source_url})
    return items


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


def image_is_eligible(metadata: dict[str, Any], story_title: str) -> bool:
    descriptors = " ".join(str(metadata.get(key, "")) for key in (
        "title", "description", "photographer", "secondary_creator", "center"
    )).lower()
    if any(marker in descriptors for marker in THIRD_PARTY_MARKERS + NON_PHOTOGRAPHIC_MARKERS):
        return False
    story_terms = {w for w in re.findall(r"[a-z0-9]+", story_title.lower()) if len(w) > 3 and w not in STOP_WORDS}
    image_terms = {w for w in re.findall(r"[a-z0-9]+", descriptors) if len(w) > 3 and w not in STOP_WORDS}
    return bool(story_terms and image_terms and len(story_terms & image_terms) >= min(2, len(story_terms)))


def find_nasa_image(title: str, target: Path) -> dict[str, str] | None:
    query = " ".join(re.findall(r"[A-Za-z0-9]+", title)[:8]) or "space science"
    search_url = NASA_IMAGE_API + "?" + urllib.parse.urlencode({
        "q": query, "media_type": "image", "page_size": 8
    })
    try:
        data = json.loads(fetch_bytes(search_url, 2 * 1024 * 1024, 14))
        candidates = data.get("collection", {}).get("items", [])
    except Exception:
        return None
    from io import BytesIO
    for entry in candidates:
        metadata = (entry.get("data") or [{}])[0]
        if not image_is_eligible(metadata, title):
            continue
        assets = [x.get("href", "") for x in entry.get("links", []) if x.get("render") == "image"]
        assets.extend(x.get("href", "") for x in entry.get("links", []) if x.get("href"))
        asset_url = next((u for u in assets if allowed_https(u, ["images-assets.nasa.gov"])
                          and urllib.parse.urlparse(u).path.lower().endswith((".jpg", ".jpeg", ".png"))), "")
        if not asset_url and entry.get("href"):
            try:
                manifest = json.loads(fetch_bytes(entry["href"], 2 * 1024 * 1024, 12))
                asset_url = next((u for u in manifest.get("items", [])
                                  if allowed_https(u, ["images-assets.nasa.gov"])
                                  and urllib.parse.urlparse(u).path.lower().endswith((".jpg", ".jpeg", ".png"))
                                  and "thumb" not in urllib.parse.urlparse(u).path.lower()), "")
            except Exception:
                asset_url = ""
        if not asset_url:
            continue
        try:
            raw = fetch_bytes(asset_url, MAX_IMAGE_BYTES, 15)
            target.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(BytesIO(raw)) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                im.thumbnail((1800, 1300), Image.Resampling.LANCZOS)
                im.save(target, "JPEG", quality=85, optimize=True)
            nasa_id = str(metadata.get("nasa_id") or "NASA Image Library")
            center = clean_html(str(metadata.get("center") or "NASA"), 100)
            creator = clean_html(str(metadata.get("photographer") or metadata.get("secondary_creator") or "NASA"), 160)
            return {
                "url": asset_url,
                "caption": clean_html(str(metadata.get("title") or title), 180),
                "credit": f"NASA / {center} · {creator}",
                "source_url": "https://images.nasa.gov/details/" + urllib.parse.quote(nasa_id, safe=""),
                "rights_status": "nasa-guideline-reviewed-exclusion-screened",
                "rights_note": "NASA-hosted image screened against common third-party credit and non-photographic markers. NASA media guidance and asset-specific restrictions still apply.",
            }
        except Exception:
            continue
    return None


def collect(profile: dict[str, Any], now: datetime, logs: list[str]) -> dict[str, int]:
    domains = profile.get("sourcePolicy", {}).get("allowedArticleDomains", ["nasa.gov"])
    cutoff = now - timedelta(days=int(profile.get("database", {}).get("retentionDays", 30)))
    collected = 0
    con = open_writer_db(profile)
    try:
        for source in profile.get("sources", []):
            name, feed_url = str(source.get("name", "")), str(source.get("feedUrl", ""))
            if not name or not allowed_https(feed_url, ["nasa.gov"]):
                logs.append(f"Skipped unapproved source configuration: {name or 'unnamed'}")
                continue
            try:
                items = parse_feed(fetch_bytes(feed_url, MAX_FEED_BYTES), name, feed_url)
                logs.append(f"Source collected: {name} ({len(items)} feed entries)")
            except Exception as exc:
                logs.append(f"Source unavailable: {name}: {str(exc)[:140]}")
                continue
            for item in items:
                title = clean_html(item.get("title", ""), 240)
                url = item.get("url", "").strip()
                published = parse_date(item.get("published"))
                if not title or len(title) < 8 or not allowed_https(url, domains) or not published:
                    continue
                if published < cutoff or published > now + timedelta(hours=2):
                    continue
                summary = clean_html(item.get("summary", ""), 9000)
                if len(summary) < 35:
                    summary = "The source feed provides no substantial summary. Consult the original report for full detail and limitations."
                story_id = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
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

        # Documentary-image enrichment stays with the collection layer, never Publisher or Engine.
        max_images = int(profile.get("editorialProfile", {}).get("maximumDocumentaryImages", 5))
        rows = con.execute("""SELECT story_id,title,image_local_path,image_checked_at FROM stories
                            WHERE view_id=? ORDER BY published_at DESC LIMIT ?""",
                           (profile["viewId"], max_images)).fetchall()
        prepared = 0
        MEDIA_DIR.mkdir(parents=True, exist_ok=True)
        for row in rows:
            local = Path(row["image_local_path"]) if row["image_local_path"] else None
            if row["image_checked_at"] and local and local.is_file():
                continue
            if row["image_checked_at"] and now.timestamp() - float(row["image_checked_at"]) < 7 * 86400:
                continue
            target = MEDIA_DIR / (row["story_id"] + ".jpg")
            metadata = find_nasa_image(row["title"], target)
            if metadata:
                con.execute("""UPDATE stories SET image_url=?,image_local_path=?,image_caption=?,image_credit=?,
                    image_source_url=?,image_rights_status=?,image_rights_note=?,image_checked_at=? WHERE story_id=?""",
                    (metadata["url"], str(target), metadata["caption"], metadata["credit"],
                     metadata["source_url"], metadata["rights_status"], metadata["rights_note"],
                     now.timestamp(), row["story_id"]))
                prepared += 1
            else:
                con.execute("UPDATE stories SET image_checked_at=? WHERE story_id=?",
                            (now.timestamp(), row["story_id"]))
        con.commit()

        retention_seconds = int(profile.get("database", {}).get("retentionDays", 30)) * 86400
        con.execute("DELETE FROM stories WHERE view_id=? AND published_at < ?",
                    (profile["viewId"], now.timestamp() - retention_seconds))
        cap = int(profile.get("database", {}).get("maximumRecords", 500))
        con.execute("""DELETE FROM stories WHERE view_id=? AND story_id NOT IN
            (SELECT story_id FROM stories WHERE view_id=? ORDER BY published_at DESC LIMIT ?)""",
            (profile["viewId"], profile["viewId"], cap))
        con.commit()
        remaining = con.execute("SELECT COUNT(*) FROM stories WHERE view_id=?", (profile["viewId"],)).fetchone()[0]
        return {"collected": collected, "imagesPrepared": prepared, "databaseRecords": int(remaining)}
    finally:
        con.close()


def main() -> int:
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    if profile.get("viewId") != "alien-world" or profile.get("publisherId") != "alien-world-publisher":
        raise SystemExit("Collector profile identity check failed.")
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

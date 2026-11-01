#!/usr/bin/env python3
"""Nature Collector: the sole Nature network client and SQLite writer."""
from __future__ import annotations

import hashlib
import html
import json
import re
import sqlite3
import sys
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
PROFILE_PATH = ROOT / "nature" / "publisher" / "profile.json"
DB_DIR = ROOT / ".publisher-data" / "nature"
DB_PATH = DB_DIR / "nature.sqlite3"
MEDIA_DIR = DB_DIR / "media"
USER_AGENT = "LIVE-EARTH-NatureCollector/1.0 (+https://github.com/z8t8fp99p9-glitch/Live-Earth)"
MAX_FEED_BYTES = 5 * 1024 * 1024
MAX_API_BYTES = 2 * 1024 * 1024
MAX_IMAGE_BYTES = 7 * 1024 * 1024
ALLOWED_FEED_HOSTS = {"nature.com", "sciencedaily.com", "phys.org", "news.mongabay.com", "theguardian.com", "wti.org.in"}
ALLOWED_API_HOSTS = {"commons.wikimedia.org"}
ALLOWED_MEDIA_HOSTS = {"upload.wikimedia.org"}
ACCEPTED_LICENSES = {
    "https://creativecommons.org/licenses/by/2.0/",
    "https://creativecommons.org/licenses/by/3.0/",
    "https://creativecommons.org/licenses/by/4.0/",
    "https://creativecommons.org/licenses/by-sa/2.0/",
    "https://creativecommons.org/licenses/by-sa/3.0/",
    "https://creativecommons.org/licenses/by-sa/4.0/",
    "https://creativecommons.org/publicdomain/zero/1.0/",
    "https://creativecommons.org/publicdomain/mark/1.0/",
}
RELEVANCE = re.compile(
    r"\b(nature|wildlife|species|biodiversity|ecology|ecosystem|conservation|"
    r"habitat|forest|ocean|marine|coral|bird|mammal|plant|wetland|river|"
    r"climate|pollution|restoration|protected area|endangered|extinction|"
    r"deep.?sea|freshwater|peatland|soil|reef|sloth bear|tiger|turtle)\b",
    re.I,
)

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
    def handle_data(self, data):
        self.parts.append(data)

def clean(value: Any, limit: int = 2500) -> str:
    parser = PlainText()
    try:
        parser.feed(str(value or ""))
        parser.close()
        raw = " ".join(parser.parts)
    except Exception:
        raw = str(value or "")
    return re.sub(r"\s+", " ", html.unescape(raw)).strip()[:limit]

def normalize_license(value: str) -> str:
    value = html.unescape(clean(value, 500)).strip()
    value = value.rstrip("/")
    if value:
        value += "/"
    return value.lower()

def safe_https(url: str, allowed_hosts: set[str]) -> bool:
    try:
        p = urllib.parse.urlparse(str(url).strip())
        host = (p.hostname or "").lower().rstrip(".")
        return (
            p.scheme == "https" and not p.username and not p.password and
            any(host == d or host.endswith("." + d) for d in allowed_hosts)
        )
    except Exception:
        return False

def bounded_get(url: str, allowed_hosts: set[str], limit: int, timeout: int = 20) -> tuple[bytes, str, str]:
    if not safe_https(url, allowed_hosts):
        raise ValueError(f"URL host is not permitted: {url}")
    request = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, image/*, application/json;q=0.9, */*;q=0.5",
        "Accept-Language": "en-US,en;q=0.8",
    })
    with urllib.request.urlopen(request, timeout=timeout) as response:
        final_url = response.geturl()
        if not safe_https(final_url, allowed_hosts):
            raise ValueError("Redirect left the approved source-host list.")
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("Remote response exceeded configured byte limit.")
        if not data:
            raise ValueError("Remote response was empty.")
        return data, final_url, response.headers.get("Content-Type", "")

def parse_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        dt = parsedate_to_datetime(value.strip())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass
    try:
        dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    except Exception:
        return None

def node_text(node: ET.Element | None) -> str:
    return "" if node is None else "".join(node.itertext()).strip()

def parse_feed(payload: bytes, source_name: str, source_url: str) -> list[dict[str, Any]]:
    root = ET.fromstring(payload)
    items: list[dict[str, Any]] = []
    rss_nodes = root.findall(".//item")
    if rss_nodes:
        for node in rss_nodes:
            def first(names):
                for name in names:
                    found = node.find(name)
                    if found is not None and node_text(found):
                        return node_text(found)
                return ""
            title = clean(first(["title"]), 240)
            url = first(["link"])
            summary = clean(first(["{http://purl.org/rss/1.0/modules/content/}encoded", "description", "summary"]), 2200)
            published = first(["pubDate", "{http://purl.org/dc/elements/1.1/}date", "date", "published"])
            if title and url and summary and RELEVANCE.search(title + " " + summary):
                items.append({"title": title, "url": url.strip(), "summary": summary,
                              "published": published, "sourceName": source_name, "sourceUrl": source_url})
        return items

    atom_ns = "{http://www.w3.org/2005/Atom}"
    for node in root.findall(".//" + atom_ns + "entry"):
        title = clean(node_text(node.find(atom_ns + "title")), 240)
        url = ""
        for link in node.findall(atom_ns + "link"):
            if link.attrib.get("rel", "alternate") == "alternate":
                url = link.attrib.get("href", "")
                break
        summary_node = node.find(atom_ns + "summary")
        if summary_node is None:
            summary_node = node.find(atom_ns + "content")
        summary = clean(node_text(summary_node), 2200)
        date_node = node.find(atom_ns + "published")
        if date_node is None:
            date_node = node.find(atom_ns + "updated")
        published = node_text(date_node)
        if title and url and summary and RELEVANCE.search(title + " " + summary):
            items.append({"title": title, "url": url.strip(), "summary": summary,
                          "published": published, "sourceName": source_name, "sourceUrl": source_url})
    return items

def db_connect() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript("""
      CREATE TABLE IF NOT EXISTS publisher_meta(
        key TEXT PRIMARY KEY, value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS stories(
        story_id TEXT PRIMARY KEY, title TEXT NOT NULL, url TEXT NOT NULL UNIQUE,
        summary TEXT NOT NULL, source_name TEXT NOT NULL, source_url TEXT NOT NULL,
        published_at REAL NOT NULL, retrieved_at REAL NOT NULL,
        image_url TEXT, image_local_path TEXT, image_caption TEXT, image_credit TEXT,
        image_source_url TEXT, image_rights_status TEXT, image_rights_note TEXT,
        view_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS nature_image_rights(
        story_id TEXT PRIMARY KEY, file_title TEXT NOT NULL, source_page TEXT NOT NULL,
        creator TEXT NOT NULL, credit TEXT NOT NULL, license_name TEXT NOT NULL,
        license_url TEXT NOT NULL, accessed_at TEXT NOT NULL, caption TEXT NOT NULL,
        usage_note TEXT NOT NULL, modification_note TEXT NOT NULL,
        local_path TEXT NOT NULL, public_path TEXT NOT NULL, image_url TEXT NOT NULL,
        rights_status TEXT NOT NULL,
        FOREIGN KEY(story_id) REFERENCES stories(story_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_nature_stories_date ON stories(published_at);
    """)
    con.execute("INSERT OR REPLACE INTO publisher_meta(key,value) VALUES('view_id','nature')")
    con.execute("PRAGMA user_version=1")
    return con

def upsert_story(con: sqlite3.Connection, item: dict[str, Any], now: datetime) -> str:
    published = parse_date(item["published"])
    if not published:
        raise ValueError("Source item has no parseable publication date.")
    url = urllib.parse.urljoin(item["sourceUrl"], item["url"])
    if not safe_https(url, ALLOWED_FEED_HOSTS):
        raise ValueError("Story URL is outside the approved Nature source hosts.")
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    con.execute("""
      INSERT INTO stories(story_id,title,url,summary,source_name,source_url,published_at,
                          retrieved_at,view_id)
      VALUES(?,?,?,?,?,?,?,?, 'nature')
      ON CONFLICT(url) DO UPDATE SET
        title=excluded.title, summary=excluded.summary, source_name=excluded.source_name,
        source_url=excluded.source_url, published_at=excluded.published_at,
        retrieved_at=excluded.retrieved_at, view_id='nature'
    """, (digest, item["title"], url, item["summary"], item["sourceName"], item["sourceUrl"],
          published.timestamp(), now.timestamp()))
    row = con.execute("SELECT story_id FROM stories WHERE url=?", (url,)).fetchone()
    return str(row["story_id"])

def commons_metadata(file_title: str) -> dict[str, Any]:
    query = urllib.parse.urlencode({
        "action": "query", "titles": file_title, "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "1600",
        "format": "json", "formatversion": "2"
    })
    payload, _, _ = bounded_get("https://commons.wikimedia.org/w/api.php?" + query,
                                ALLOWED_API_HOSTS, MAX_API_BYTES)
    data = json.loads(payload.decode("utf-8"))
    pages = data.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing") is not None:
        raise ValueError("The allowlisted Commons file page is missing.")
    page = pages[0]
    def title_key(value):
        value = str(value or "").replace("_", " ").strip().casefold()
        return re.sub(r"\s+", " ", value)
    if title_key(page.get("title")) != title_key(file_title):
        raise ValueError("Commons returned a different file page than the exact allowlisted title.")
    infos = page.get("imageinfo") or []
    if not infos:
        raise ValueError("Commons file page has no imageinfo record.")
    info = infos[0]
    ext = info.get("extmetadata") or {}
    def meta(key):
        field = ext.get(key) or {}
        return clean(field.get("value", "") if isinstance(field, dict) else field, 1200)
    description_url = str(info.get("descriptionurl") or "")
    image_url = str(info.get("thumburl") or info.get("url") or "")
    creator_raw = meta("Artist") or meta("Credit")
    creator = clean(creator_raw, 240)
    license_name = meta("LicenseShortName")
    license_url = normalize_license(meta("LicenseUrl"))
    # Commons' Copyrighted flag can be True for a normal CC-licensed work:
    # it identifies that copyright exists, not that reuse is prohibited.
    # The exact licence URL, creator and source file page are the eligibility gates.
    copyright = meta("Copyrighted").lower()
    if not safe_https(description_url, ALLOWED_API_HOSTS):
        raise ValueError("Commons description URL is not an HTTPS Commons file page.")
    if not safe_https(image_url, ALLOWED_MEDIA_HOSTS):
        raise ValueError("Commons image URL is outside upload.wikimedia.org.")
    if license_url not in ACCEPTED_LICENSES:
        raise ValueError(f"Licence is not on the approved list: {license_name or 'not supplied'}")
    if copyright not in {"true", "false", ""}:
        raise ValueError("Commons copyright-status metadata is not understood.")
    if not creator:
        raise ValueError("Commons original page does not provide a creator/credit.")
    mime = str(info.get("mime") or "").lower()
    if mime not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValueError("Only verified raster documentary photographs are accepted.")
    return {
        "fileTitle": str(page.get("title") or file_title),
        "creator": creator,
        "licenseName": license_name,
        "licenseUrl": license_url,
        "descriptionUrl": description_url,
        "imageUrl": image_url,
        "mime": mime,
        "width": int(info.get("width") or 0),
        "height": int(info.get("height") or 0),
    }

def matches_category(story: dict[str, Any], category: str) -> bool:
    haystack = (story["title"] + " " + story["summary"]).lower()
    terms = {
        "tiger": ("tiger", "wildlife recovery"),
        "deep-sea": ("deep-sea", "deep sea", "sea cucumber", "submarine canyon", "new marine species"),
        "nameri": ("nameri", "pakke", "protected landscape", "protected area"),
        "indian-birds": ("bird", "avian", "red list"),
        "sloth-bear": ("sloth bear",),
        "arabian-desert": ("rub' al khali", "rub al khali", "arabian desert", "desert archaeology"),
    }
    return any(term in haystack for term in terms.get(category, ()))

def prepare_photo(item: dict[str, Any], profile: dict[str, Any], now: datetime) -> dict[str, Any]:
    metadata = commons_metadata(item["fileTitle"])
    expected_creator = item["expectedCreator"].lower()
    if expected_creator not in metadata["creator"].lower():
        raise ValueError("Original Commons file page creator does not match the reviewed record.")
    expected_license = normalize_license(item["expectedLicenseUrl"])
    if metadata["licenseUrl"] != expected_license:
        raise ValueError("Original Commons file page licence changed since review.")
    raw, _, content_type = bounded_get(
        metadata["imageUrl"], ALLOWED_MEDIA_HOSTS,
        int(profile["imagePolicy"]["maximumImageBytes"]), timeout=30
    )
    if len(raw) > int(profile["imagePolicy"]["maximumImageBytes"]):
        raise ValueError("Image exceeded the Nature media size budget.")
    digest = hashlib.sha256(raw).hexdigest()
    target = MEDIA_DIR / (digest + ".jpg")
    try:
        from io import BytesIO
        with Image.open(BytesIO(raw)) as source:
            source.verify()
        with Image.open(BytesIO(raw)) as source:
            photo = ImageOps.exif_transpose(source).convert("RGB")
            photo.thumbnail((int(profile["imagePolicy"]["maximumImageWidth"]), 1600), Image.Resampling.LANCZOS)
            photo.save(target, "JPEG", quality=80, optimize=True, progressive=True)
    except Exception as exc:
        raise ValueError(f"Downloaded Commons file is not a decodable photograph: {exc}") from exc
    if not target.is_file() or target.stat().st_size < 1000:
        raise ValueError("Prepared image is unexpectedly small.")
    license_name = metadata["licenseName"] or item["expectedLicenseUrl"]
    credit = f"{metadata['creator']} · {license_name} · {metadata['descriptionUrl']}"
    return {
        **metadata,
        "localPath": str(target.relative_to(ROOT)),
        "publicPath": "nature/published/assets/" + target.name,
        "publishedImageUrl": "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/nature/published/assets/" + target.name,
        "credit": credit,
        "caption": clean(item["contextCaption"] + " " + item["usageNote"], 500),
        "usageNote": item["usageNote"],
        "accessedAt": now.isoformat(),
        "modificationNote": "Wikimedia thumbnail/display copy resized to max 1600px and JPEG quality 80; factual content unchanged. Attribution retained.",
        "rightsStatus": "nature-commons-filepage-verified"
    }

def attach_verified_images(con: sqlite3.Connection, profile: dict[str, Any], now: datetime) -> dict[str, int]:
    # Re-screen every allowlisted Commons page on each Collector run. Clear all image
    # associations first so stale/changed rights cannot survive a failed page check.
    con.execute("""UPDATE stories SET image_url=NULL,image_local_path=NULL,image_caption=NULL,
                   image_credit=NULL,image_source_url=NULL,image_rights_status=NULL,image_rights_note=NULL""")
    con.execute("DELETE FROM nature_image_rights")
    month_end = now.astimezone(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_start = (month_end.replace(year=month_end.year - 1, month=12)
                   if month_end.month == 1 else month_end.replace(month=month_end.month - 1))
    stories = [dict(r) for r in con.execute(
        """SELECT story_id,title,summary FROM stories
           WHERE view_id='nature' AND published_at>=? AND published_at<?
           ORDER BY published_at DESC""",
        (month_start.timestamp(), month_end.timestamp())
    ).fetchall()]
    stats = {"allowlisted": len(profile.get("imageAllowlist", [])), "verified": 0, "attached": 0, "rejected": 0}
    used_story_ids = set()
    for item in profile.get("imageAllowlist", []):
        try:
            photo = prepare_photo(item, profile, now)
            stats["verified"] += 1
            candidate = next((s for s in stories
                              if s["story_id"] not in used_story_ids and matches_category(s, item["category"])), None)
            if not candidate:
                continue
            used_story_ids.add(candidate["story_id"])
            con.execute("""
              UPDATE stories SET image_url=?,image_local_path=?,image_caption=?,image_credit=?,
                image_source_url=?,image_rights_status=?,image_rights_note=?
              WHERE story_id=?
            """, (photo["publishedImageUrl"], photo["localPath"], photo["caption"], photo["credit"],
                  photo["descriptionUrl"], photo["rightsStatus"],
                  photo["licenseName"] + " · " + photo["licenseUrl"] + " · " + photo["usageNote"],
                  candidate["story_id"]))
            con.execute("""
              INSERT OR REPLACE INTO nature_image_rights(
                story_id,file_title,source_page,creator,credit,license_name,license_url,
                accessed_at,caption,usage_note,modification_note,local_path,public_path,
                image_url,rights_status
              ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (candidate["story_id"], photo["fileTitle"], photo["descriptionUrl"],
                  photo["creator"], photo["credit"], photo["licenseName"], photo["licenseUrl"],
                  photo["accessedAt"], photo["caption"], photo["usageNote"],
                  photo["modificationNote"], photo["localPath"], photo["publicPath"],
                  photo["publishedImageUrl"], photo["rightsStatus"]))
            stats["attached"] += 1
        except Exception as exc:
            stats["rejected"] += 1
            print(f"PHOTO REJECTED: {item.get('fileTitle')}: {exc}", file=sys.stderr)
    return stats


def import_initial_october_seed(con: sqlite3.Connection, now: datetime) -> int:
    # Preserve the eight already-curated October project stories for the first issue.
    # Import once, and only during November 2026; normal RSS collection continues afterward.
    start = datetime(2026, 11, 1, tzinfo=timezone.utc)
    end = datetime(2026, 12, 1, tzinfo=timezone.utc)
    if not (start <= now < end):
        return 0
    key = "seed:nature-initial-october-2026"
    if con.execute("SELECT 1 FROM publisher_meta WHERE key=?", (key,)).fetchone():
        return 0
    seed_path = ROOT / "nature" / "collector" / "initial-october-seed.json"
    if not seed_path.is_file():
        raise RuntimeError("The curated October Nature seed is missing; first issue is blocked.")
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    imported = 0
    for record in seed.get("stories", []):
        item = {
            "title": clean(record.get("title"), 240),
            "url": record.get("url", ""),
            "summary": clean(record.get("summary"), 2200),
            "sourceName": clean(record.get("sourceName"), 160),
            "sourceUrl": record.get("sourceUrl", ""),
            "published": record.get("publishedAt", "")
        }
        if con.execute("SELECT 1 FROM stories WHERE url=?", (item["url"],)).fetchone():
            continue  # A fresher RSS record already exists; the seed never overwrites it.
        upsert_story(con, item, now)
        imported += 1
    con.execute("INSERT OR REPLACE INTO publisher_meta(key,value) VALUES(?,?)",
                (key, json.dumps({"imported": imported, "seedId": seed.get("seedId"), "importedAt": now.isoformat()})))
    con.commit()
    return imported


def collect() -> int:
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc)
    con = db_connect()
    total = 0
    errors = []
    try:
        seed_count = 0
        for source in profile["sources"]:
            domain = source["domain"]
            if not any(domain == d or domain.endswith("." + d) for d in ALLOWED_FEED_HOSTS):
                errors.append(f"{source['name']}: profile host not approved")
                continue
            try:
                payload, _, _ = bounded_get(source["url"], ALLOWED_FEED_HOSTS, MAX_FEED_BYTES)
                items = parse_feed(payload, source["name"], source["url"])
                for item in items:
                    published = parse_date(item["published"])
                    if not published or published < now - timedelta(days=int(profile["publication"]["maximumSourceAgeDays"])):
                        continue
                    try:
                        upsert_story(con, item, now)
                        total += 1
                    except Exception as exc:
                        errors.append(f"{source['name']} item rejected: {exc}")
                con.commit()
                print(f"COLLECTED {source['name']}: {len(items)} relevant feed items")
            except Exception as exc:
                errors.append(f"{source['name']}: {exc}")
                print(f"SOURCE UNAVAILABLE {source['name']}: {exc}", file=sys.stderr)
        # Import after RSS so the earlier reviewed summaries remain the preferred
        # copy for these exact October stories if a feed also returns them.
        seed_count = import_initial_october_seed(con, now)
        if seed_count:
            print(f"IMPORTED {seed_count} curated October 2026 Nature summaries from the existing project fixture.")
        photo_stats = attach_verified_images(con, profile, now)
        con.commit()
        # Keep only prepared files still referenced by a currently eligible,
        # re-screened image record. This bounds the per-view media cache.
        active_media = {
            Path(str(row[0])).name for row in
            con.execute("SELECT image_local_path FROM stories WHERE view_id='nature' AND image_local_path IS NOT NULL").fetchall()
        }
        for cached in MEDIA_DIR.glob("*.jpg"):
            if cached.name not in active_media:
                cached.unlink(missing_ok=True)
        cutoff = (now - timedelta(days=240)).timestamp()
        con.execute("DELETE FROM stories WHERE published_at < ?", (cutoff,))
        con.commit()
        count = con.execute("SELECT COUNT(*) FROM stories WHERE view_id='nature'").fetchone()[0]
        result = {
            "status": "collected" if count else "no-eligible-stories",
            "storiesUpserted": total,
            "initialSeedStories": seed_count,
            "databaseStories": count,
            "photos": photo_stats,
            "databasePath": ".publisher-data/nature/nature.sqlite3",
            "sourceErrors": errors
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        # A feed outage is non-fatal when some other source is usable; zero usable
        # records is a hard failure and the next scheduled run may retry.
        return 0 if count else 2
    finally:
        con.close()

if __name__ == "__main__":
    raise SystemExit(collect())

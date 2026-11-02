#!/usr/bin/env python3
"""Nature Collector: the only Nature component with source-network and DB-write access."""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = ROOT / "nature" / "publisher" / "profile.json"
DB_PATH = ROOT / ".publisher-data" / "nature" / "nature.sqlite3"
MEDIA_DIR = ROOT / ".publisher-data" / "nature" / "media"
MAX_FEED_BYTES = 4 * 1024 * 1024
MAX_API_BYTES = 2 * 1024 * 1024
ALLOWED_FEED_HOSTS = {"nature.com", "sciencedaily.com", "news.mongabay.com", "mongabay.com", "theguardian.com", "wti.org.in"}
ALLOWED_API_HOSTS = {"commons.wikimedia.org"}
ALLOWED_MEDIA_HOSTS = {"upload.wikimedia.org"}
ACCEPTED_LICENSES = {
    "https://creativecommons.org/publicdomain/zero/1.0/",
    "https://creativecommons.org/licenses/by/4.0/",
    "https://creativecommons.org/licenses/by-sa/4.0/",
}
IMAGE_STATUS = "nature-commons-filepage-verified"


def clean(value: Any, limit: int = 4000) -> str:
    value = re.sub(r"<[^>]+>", " ", str(value or ""))
    value = re.sub(r"\s+", " ", value).strip()
    return value[:limit]


def safe_https(url: str, allowed_hosts: set[str]) -> bool:
    try:
        parsed = urllib.parse.urlsplit(str(url))
        host = (parsed.hostname or "").lower()
        return parsed.scheme == "https" and not parsed.username and not parsed.password and any(
            host == domain or host.endswith("." + domain) for domain in allowed_hosts
        )
    except Exception:
        return False


def bounded_get(url: str, allowed_hosts: set[str], max_bytes: int, timeout: int = 20):
    if not safe_https(url, allowed_hosts):
        raise ValueError("URL host or scheme is not on the approved list.")
    request = urllib.request.Request(url, headers={"User-Agent": "LIVE-EARTH-Nature-Collector/1.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        final_url = response.geturl()
        content_type = response.headers.get("Content-Type", "")
        if not safe_https(final_url, allowed_hosts):
            raise ValueError("Redirect left the approved host list.")
        data = response.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ValueError("Source response exceeded its size limit.")
        return data, final_url, content_type


def normalize_license(value: str) -> str:
    value = str(value or "").strip()
    return value if value.endswith("/") else value + "/" if value else ""


def normalize_commons_media_url(value: str) -> str:
    value = str(value or "").strip()
    if value.startswith("//"):
        value = "https:" + value
    if value.startswith("http://"):
        value = "https://" + value[len("http://"):]
    if not safe_https(value, ALLOWED_MEDIA_HOSTS):
        raise ValueError("Commons media URL is not on the exact approved upload host.")
    return value


def parse_date(value: str):
    if not value:
        return None
    from email.utils import parsedate_to_datetime
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        try:
            result = parsedate_to_datetime(value)
        except Exception:
            return None
    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)
    return result.astimezone(timezone.utc)


def parse_feed(payload: bytes, source_name: str, source_url: str) -> list[dict[str, str]]:
    import xml.etree.ElementTree as ET
    root = ET.fromstring(payload)
    result = []
    for item in root.iter():
        tag = item.tag.rsplit("}", 1)[-1].lower()
        if tag not in {"item", "entry"}:
            continue
        fields = {}
        for child in list(item):
            key = child.tag.rsplit("}", 1)[-1].lower()
            if key == "link":
                fields[key] = child.attrib.get("href") or clean(child.text, 1000)
            elif key in {"title", "description", "summary", "content", "pubdate", "published", "updated"}:
                fields[key] = clean(" ".join(child.itertext()), 6000)
        title = fields.get("title", "")
        url = fields.get("link", "")
        summary = fields.get("description") or fields.get("summary") or fields.get("content") or ""
        published = fields.get("pubdate") or fields.get("published") or fields.get("updated") or ""
        if not title or not safe_https(url, ALLOWED_FEED_HOSTS):
            continue
        haystack = (title + " " + summary).lower()
        nature_terms = ("nature", "wildlife", "species", "forest", "ocean", "marine", "ecology", "conservation", "biodiversity", "climate", "habitat", "bird", "animal", "plant", "reef", "river", "pollution", "deforestation", "restoration", "environment", "ecosystem", "tiger", "coral", "deep sea")
        if not any(term in haystack for term in nature_terms):
            continue
        result.append({"title": title[:240], "url": url, "summary": summary[:2200], "sourceName": source_name, "sourceUrl": source_url, "published": published})
    return result


def db_connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=5000")
    con.executescript("""
      CREATE TABLE IF NOT EXISTS publisher_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS stories(
        story_id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT NOT NULL UNIQUE,
        summary TEXT NOT NULL,source_name TEXT NOT NULL,source_url TEXT NOT NULL,
        published_at REAL NOT NULL,retrieved_at REAL NOT NULL,image_url TEXT,
        image_local_path TEXT,image_caption TEXT,image_credit TEXT,image_source_url TEXT,
        image_rights_status TEXT,image_rights_note TEXT,view_id TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS nature_stories_date ON stories(view_id,published_at DESC);
      CREATE TABLE IF NOT EXISTS nature_image_rights(
        story_id TEXT PRIMARY KEY,file_title TEXT NOT NULL,source_page TEXT NOT NULL,
        creator TEXT NOT NULL,credit TEXT NOT NULL,license_name TEXT NOT NULL,
        license_url TEXT NOT NULL,accessed_at TEXT NOT NULL,caption TEXT NOT NULL,
        usage_note TEXT NOT NULL,modification_note TEXT NOT NULL,local_path TEXT NOT NULL,
        public_path TEXT NOT NULL,image_url TEXT NOT NULL,rights_status TEXT NOT NULL);
    """)
    con.execute("INSERT OR REPLACE INTO publisher_meta(key,value) VALUES('view_id','nature')")
    con.commit()
    return con


def upsert_story(con: sqlite3.Connection, item: dict[str, str], now: datetime) -> None:
    published = parse_date(item.get("published", "")) or now
    story_id = hashlib.sha256(item["url"].encode("utf-8")).hexdigest()[:32]
    con.execute("""INSERT INTO stories(
        story_id,title,url,summary,source_name,source_url,published_at,retrieved_at,view_id)
        VALUES(?,?,?,?,?,?,?,?, 'nature')
        ON CONFLICT(url) DO UPDATE SET title=excluded.title,summary=excluded.summary,
        source_name=excluded.source_name,source_url=excluded.source_url,
        retrieved_at=excluded.retrieved_at""",
        (story_id,item["title"],item["url"],item["summary"],item["sourceName"],item["sourceUrl"],published.timestamp(),now.timestamp()))


def commons_metadata(file_title: str) -> dict[str, Any]:
    query = urllib.parse.urlencode({"action":"query","titles":file_title,"prop":"imageinfo","iiprop":"url|size|mime|extmetadata","iiurlwidth":"1600","format":"json","formatversion":"2"})
    payload, _, _ = bounded_get("https://commons.wikimedia.org/w/api.php?" + query, ALLOWED_API_HOSTS, MAX_API_BYTES)
    data = json.loads(payload.decode("utf-8"))
    pages = data.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing") is not None:
        raise ValueError("The allowlisted Commons file page is missing.")
    page = pages[0]
    def title_key(value):
        return re.sub(r"\s+", " ", str(value or "").replace("_", " ").strip().casefold())
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
    image_url = ""
    media_errors = []
    for media_candidate in (info.get("thumburl"), info.get("url")):
        if not media_candidate:
            continue
        try:
            image_url = normalize_commons_media_url(str(media_candidate))
            break
        except ValueError as exc:
            media_errors.append(str(exc))
    creator = clean(meta("Artist") or meta("Credit"), 240)
    license_name = meta("LicenseShortName")
    license_url = normalize_license(meta("LicenseUrl"))
    copyright = meta("Copyrighted").lower()
    if not safe_https(description_url, ALLOWED_API_HOSTS):
        raise ValueError("Commons description URL is not an HTTPS Commons file page.")
    if not image_url:
        detail = media_errors[-1] if media_errors else "no media URL was supplied"
        raise ValueError(f"Commons did not provide an approved upload.wikimedia.org URL: {detail}")
    if license_url not in ACCEPTED_LICENSES:
        raise ValueError(f"Licence is not on the approved list: {license_name or 'not supplied'}")
    if copyright not in {"true", "false", ""}:
        raise ValueError("Commons copyright-status metadata is not understood.")
    if not creator:
        raise ValueError("Commons original page does not provide a creator/credit.")
    mime = str(info.get("mime") or "").lower()
    if mime not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValueError("Only verified raster documentary photographs are accepted.")
    return {"fileTitle":str(page.get("title") or file_title),"creator":creator,"licenseName":license_name,"licenseUrl":license_url,"descriptionUrl":description_url,"imageUrl":image_url,"mime":mime,"width":int(info.get("width") or 0),"height":int(info.get("height") or 0)}


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
    if item["expectedCreator"].lower() not in metadata["creator"].lower():
        raise ValueError("Original Commons file page creator does not match the reviewed record.")
    if metadata["licenseUrl"] != normalize_license(item["expectedLicenseUrl"]):
        raise ValueError("Original Commons file page licence changed since review.")
    raw, _, _ = bounded_get(metadata["imageUrl"], ALLOWED_MEDIA_HOSTS, int(profile["imagePolicy"]["maximumImageBytes"]), timeout=30)
    if len(raw) > int(profile["imagePolicy"]["maximumImageBytes"]):
        raise ValueError("Image exceeded the Nature media size budget.")
    digest = hashlib.sha256(raw).hexdigest()
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    target = MEDIA_DIR / (digest + ".jpg")
    from io import BytesIO
    with Image.open(BytesIO(raw)) as source:
        source.verify()
    with Image.open(BytesIO(raw)) as source:
        photo = ImageOps.exif_transpose(source).convert("RGB")
        photo.thumbnail((int(profile["imagePolicy"]["maximumImageWidth"]),1600), Image.Resampling.LANCZOS)
        photo.save(target,"JPEG",quality=80,optimize=True,progressive=True)
    if not target.is_file() or target.stat().st_size < 1000:
        raise ValueError("Prepared image is unexpectedly small.")
    license_name = metadata["licenseName"] or item["expectedLicenseUrl"]
    credit = f"{metadata['creator']} · {license_name} · {metadata['descriptionUrl']}"
    return {**metadata,"localPath":str(target.relative_to(ROOT)),"publicPath":"nature/published/assets/"+target.name,"publishedImageUrl":"https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/nature/published/assets/"+target.name,"credit":credit,"caption":clean(item["contextCaption"]+" "+item["usageNote"],500),"usageNote":item["usageNote"],"accessedAt":now.isoformat(),"modificationNote":"Wikimedia thumbnail/display copy resized to max 1600px and JPEG quality 80; factual content unchanged. Attribution retained.","rightsStatus":IMAGE_STATUS}


def attach_verified_images(con: sqlite3.Connection, profile: dict[str, Any], now: datetime) -> dict[str, int]:
    """Attach only exact, re-screened contextual photos to stories in the live window."""
    con.execute("""UPDATE stories SET image_url=NULL,image_local_path=NULL,image_caption=NULL,
                   image_credit=NULL,image_source_url=NULL,image_rights_status=NULL,image_rights_note=NULL
                   WHERE view_id='nature'""")
    con.execute("DELETE FROM nature_image_rights")
    window_hours = int(profile["publication"]["issueWindowHours"])
    window_start = now - timedelta(hours=window_hours)
    stories = [dict(r) for r in con.execute(
        """SELECT story_id,title,summary FROM stories WHERE view_id='nature'
           AND published_at>=? AND published_at<? ORDER BY published_at DESC""",
        (window_start.timestamp(), now.timestamp())
    ).fetchall()]
    stats = {"allowlisted":len(profile.get("imageAllowlist",[])),"verified":0,"attached":0,"rejected":0}
    used_story_ids = set()
    for item in profile.get("imageAllowlist", []):
        candidate = next((s for s in stories if s["story_id"] not in used_story_ids and matches_category(s,item["category"])),None)
        if not candidate:
            continue
        try:
            photo = prepare_photo(item,profile,now)
            stats["verified"] += 1
            used_story_ids.add(candidate["story_id"])
            con.execute("""UPDATE stories SET image_url=?,image_local_path=?,image_caption=?,image_credit=?,
                image_source_url=?,image_rights_status=?,image_rights_note=? WHERE story_id=?""",
                (photo["publishedImageUrl"],photo["localPath"],photo["caption"],photo["credit"],photo["descriptionUrl"],photo["rightsStatus"],photo["licenseName"]+" · "+photo["licenseUrl"]+" · "+photo["usageNote"],candidate["story_id"]))
            con.execute("""INSERT OR REPLACE INTO nature_image_rights(
                story_id,file_title,source_page,creator,credit,license_name,license_url,accessed_at,
                caption,usage_note,modification_note,local_path,public_path,image_url,rights_status)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (candidate["story_id"],photo["fileTitle"],photo["descriptionUrl"],photo["creator"],photo["credit"],photo["licenseName"],photo["licenseUrl"],photo["accessedAt"],photo["caption"],photo["usageNote"],photo["modificationNote"],photo["localPath"],photo["publicPath"],photo["publishedImageUrl"],photo["rightsStatus"]))
            stats["attached"] += 1
        except Exception as exc:
            stats["rejected"] += 1
            print(f"PHOTO REJECTED: {item.get('fileTitle')}: {exc}",file=sys.stderr)
    return stats


def collect() -> int:
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc)
    con = db_connect()
    total = 0
    errors = []
    try:
        for source in profile["sources"]:
            domain = source["domain"]
            if not any(domain == d or domain.endswith("."+d) for d in ALLOWED_FEED_HOSTS):
                errors.append(f"{source['name']}: profile host not approved")
                continue
            try:
                payload, _, _ = bounded_get(source["url"],ALLOWED_FEED_HOSTS,MAX_FEED_BYTES)
                items = parse_feed(payload,source["name"],source["url"])
                for item in items:
                    published = parse_date(item["published"])
                    if not published or published < now-timedelta(days=int(profile["publication"]["maximumSourceAgeDays"])):
                        continue
                    try:
                        upsert_story(con,item,now); total += 1
                    except Exception as exc:
                        errors.append(f"{source['name']} item rejected: {exc}")
                con.commit()
                print(f"COLLECTED {source['name']}: {len(items)} relevant feed items")
            except Exception as exc:
                errors.append(f"{source['name']}: {exc}")
                print(f"SOURCE UNAVAILABLE {source['name']}: {exc}",file=sys.stderr)
        photo_stats = attach_verified_images(con,profile,now)
        con.commit()
        retention_days = int(profile.get("database", {}).get("retentionDays", 32))
        if not 1 <= retention_days <= 365:
            raise RuntimeError("Nature database retention must be between 1 and 365 days.")
        cutoff = (now-timedelta(days=retention_days)).timestamp()
        con.execute("DELETE FROM stories WHERE view_id='nature' AND published_at < ?",(cutoff,))
        con.execute("DELETE FROM nature_image_rights WHERE story_id NOT IN (SELECT story_id FROM stories WHERE view_id='nature')")
        con.commit()
        # Prune prepared media only after expired stories have been removed.
        active_media = {Path(str(row[0])).name for row in con.execute("SELECT image_local_path FROM stories WHERE view_id='nature' AND image_local_path IS NOT NULL").fetchall()}
        if MEDIA_DIR.exists():
            for cached in MEDIA_DIR.glob("*.jpg"):
                if cached.name not in active_media: cached.unlink(missing_ok=True)
        count = con.execute("SELECT COUNT(*) FROM stories WHERE view_id='nature'").fetchone()[0]
        result = {"status":"collected" if count else "no-eligible-stories","storiesUpserted":total,"databaseStories":count,"photos":photo_stats,"databasePath":".publisher-data/nature/nature.sqlite3","sourceErrors":errors}
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return 0 if count else 2
    finally:
        con.close()

if __name__ == "__main__":
    raise SystemExit(collect())

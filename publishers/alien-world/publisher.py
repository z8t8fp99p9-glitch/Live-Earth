#!/usr/bin/env python3
"""Alien World Publisher — view-owned collection, database and schedules.

This is the only component that fetches space sources and writes Alien World's
SQLite store. It then gives the global Engine a separate read-only connection.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import shutil
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
PROFILE_PATH = Path(__file__).with_name("profile.json")
ENGINE_DIR = ROOT / "editorial-engine"
DB_DIR = ROOT / ".publisher-data" / "alien-world"
DB_PATH = DB_DIR / "alien-world.sqlite3"
MEDIA_DIR = DB_DIR / "media"
OUTPUT_DIR = ROOT / "published" / "alien-world"
NASA_IMAGE_API = "https://images-api.nasa.gov/search"
NASA_IMAGE_HOST = "images-assets.nasa.gov"
NASA_POLICY_URL = "https://www.nasa.gov/nasa-brand-center/images-and-media/"
USER_AGENT = "LIVE-EARTH-AlienWorldPublisher/1.0 (source-linked public-interest feed)"
MAX_FEED_BYTES = 4 * 1024 * 1024
MAX_IMAGE_BYTES = 7 * 1024 * 1024
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
IMAGE_STOP_WORDS = {
    "nasa", "space", "the", "and", "for", "with", "from", "into", "after",
    "before", "about", "mission", "missions", "update", "new", "first", "will",
    "this", "that", "over", "under", "using", "its", "their", "through",
}


class HTMLText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts: list[str] = []
    def handle_data(self, data: str) -> None:
        self.parts.append(data)
    def result(self) -> str:
        return re.sub(r"\s+", " ", html.unescape(" ".join(self.parts))).strip()


class ImageTagParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.urls: list[str] = []
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "img":
            values = dict(attrs)
            for key in ("src", "data-src"):
                if values.get(key): self.urls.append(str(values[key]))


def clean_html(value: str, limit: int = 1800) -> str:
    parser = HTMLText()
    try: parser.feed(value or "")
    except Exception: pass
    return parser.result()[:limit]


def parse_date(value: str | None) -> datetime | None:
    if not value: return None
    try:
        dt = parsedate_to_datetime(value.strip())
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception: pass
    try:
        dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def fetch_bytes(url: str, limit: int, timeout: int = 15) -> bytes:
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not host or not (host == "nasa.gov" or host.endswith(".nasa.gov")):
        raise ValueError("Only HTTPS NASA-owned source and media hosts are allowed.")
    request = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, application/json, image/*, */*",
    })
    with urllib.request.urlopen(request, timeout=timeout) as response:
        final = urllib.parse.urlparse(response.geturl())
        final_host = (final.hostname or "").lower()
        if final.scheme != "https" or not (final_host == "nasa.gov" or final_host.endswith(".nasa.gov")):
            raise ValueError("Remote redirect left the NASA-owned HTTPS domain allowlist.")
        data = response.read(limit + 1)
        if len(data) > limit: raise ValueError("Remote item exceeded the configured size limit.")
        if response.status >= 400: raise ValueError(f"Remote source returned HTTP {response.status}.")
        return data


def official_nasa_url(url: str, domains: list[str]) -> bool:
    try:
        p = urllib.parse.urlparse(url)
        host = (p.hostname or "").lower()
        return p.scheme == "https" and any(host == d or host.endswith("." + d) for d in domains)
    except Exception:
        return False


def parse_feed(xml_bytes: bytes, source_name: str, source_url: str) -> list[dict[str, Any]]:
    root = ET.fromstring(xml_bytes)
    output: list[dict[str, Any]] = []
    nodes = root.findall(".//item")
    if nodes:
        for item in nodes:
            def child(names: list[str]) -> str:
                for name in names:
                    found = item.find(name)
                    if found is not None and found.text: return found.text.strip()
                return ""
            title = clean_html(child(["title"]), 220)
            url = child(["link"])
            summary = clean_html(child(["description", "{http://purl.org/rss/1.0/modules/content/}encoded"]), 2000)
            date = child(["pubDate", "{http://purl.org/dc/elements/1.1/}date", "date"])
            media = ""
            for element in list(item):
                if element.tag.lower().endswith(("content", "thumbnail", "enclosure")):
                    media = element.attrib.get("url", "") or media
            if not media and summary:
                parser = ImageTagParser()
                try: parser.feed(summary)
                except Exception: pass
                media = parser.urls[0] if parser.urls else ""
            output.append({"title": title, "url": url, "summary": summary, "published": date,
                           "sourceName": source_name, "sourceUrl": source_url, "mediaCandidate": media})
        return output

    atom = "{http://www.w3.org/2005/Atom}"
    for item in root.findall(".//" + atom + "entry"):
        title_el = item.find(atom + "title")
        title = clean_html(title_el.text if title_el is not None else "", 220)
        url = ""
        for link in item.findall(atom + "link"):
            if link.attrib.get("rel", "alternate") == "alternate":
                url = link.attrib.get("href", ""); break
        summary_el = item.find(atom + "summary")
        if summary_el is None:
            summary_el = item.find(atom + "content")
        summary = clean_html(summary_el.text if summary_el is not None and summary_el.text else "", 2000)
        date_el = item.find(atom + "published")
        if date_el is None:
            date_el = item.find(atom + "updated")
        date = date_el.text if date_el is not None else ""
        output.append({"title": title, "url": url, "summary": summary, "published": date,
                       "sourceName": source_name, "sourceUrl": source_url, "mediaCandidate": ""})
    return output


def load_profile() -> dict[str, Any]:
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    if profile.get("schemaVersion") != 1 or profile.get("viewId") != "alien-world":
        raise RuntimeError("Alien World Publisher profile failed its schema/view identity check.")
    if not profile.get("sources"):
        raise RuntimeError("Alien World Publisher has no configured source feeds.")
    return profile


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
    existing = con.execute("SELECT value FROM publisher_meta WHERE key='view_id'").fetchone()
    if existing and existing[0] != profile["viewId"]:
        raise RuntimeError("Refusing to reuse a database owned by another view.")
    existing_publisher = con.execute("SELECT value FROM publisher_meta WHERE key='publisher_id'").fetchone()
    if existing_publisher and existing_publisher[0] != profile["publisherId"]:
        raise RuntimeError("Refusing to reuse a database owned by another Publisher.")
    for key, value in (("view_id", profile["viewId"]), ("publisher_id", profile["publisherId"]),
                       ("schema_version", "1")):
        con.execute("INSERT INTO publisher_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, str(value)))
    con.commit()
    return con


def collect_sources(con: sqlite3.Connection, profile: dict[str, Any], now: datetime, logs: list[str]) -> int:
    domains = profile.get("sourcePolicy", {}).get("allowedArticleDomains", ["nasa.gov"])
    cutoff = now - timedelta(days=int(profile.get("database", {}).get("retentionDays", 30)))
    collected = 0
    for source in profile["sources"]:
        source_name, feed_url = str(source.get("name", "")), str(source.get("feedUrl", ""))
        try:
            if not source_name or not official_nasa_url(feed_url, ["nasa.gov"]):
                raise ValueError("Feed is outside the official NASA HTTPS source allowlist.")
            items = parse_feed(fetch_bytes(feed_url, MAX_FEED_BYTES, timeout=15), source_name, feed_url)
            logs.append(f"Feed OK: {source_name} ({len(items)} entries)")
        except Exception as exc:
            logs.append(f"Feed unavailable: {source_name}: {str(exc)[:150]}")
            continue
        for item in items:
            title = clean_html(str(item.get("title", "")), 220)
            url = str(item.get("url", "")).strip()
            published = parse_date(item.get("published"))
            if (not title or len(title) < 8 or not official_nasa_url(url, domains) or not published
                    or published < cutoff or published > now + timedelta(hours=2)):
                continue
            summary = clean_html(str(item.get("summary", "")), 2000)
            if len(summary) < 35:
                summary = "Open the original NASA report for the full story, technical context and stated limitations."
            identity = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
            con.execute("""INSERT INTO stories(story_id,view_id,url,title,summary,source_name,source_url,feed_guid,
                         published_at,retrieved_at)
                         VALUES(?,?,?,?,?,?,?,?,?,?)
                         ON CONFLICT(url) DO UPDATE SET
                         title=excluded.title,
                         summary=CASE WHEN length(excluded.summary)>length(stories.summary) THEN excluded.summary ELSE stories.summary END,
                         source_name=excluded.source_name, source_url=excluded.source_url,
                         retrieved_at=excluded.retrieved_at""",
                        (identity, profile["viewId"], url, title, summary, source_name, feed_url,
                         identity, published.timestamp(), now.timestamp()))
            collected += 1
    con.commit()
    retention_seconds = int(profile.get("database", {}).get("retentionDays", 30)) * 86400
    con.execute("DELETE FROM stories WHERE view_id=? AND published_at < ?", (profile["viewId"], now.timestamp() - retention_seconds))
    cap = int(profile.get("database", {}).get("maximumRecords", 500))
    con.execute("""DELETE FROM stories WHERE view_id=? AND story_id NOT IN
                   (SELECT story_id FROM stories WHERE view_id=? ORDER BY published_at DESC LIMIT ?)""",
                (profile["viewId"], profile["viewId"], cap))
    con.commit()
    prune_orphaned_media(con)
    return collected


def prune_orphaned_media(con: sqlite3.Connection) -> int:
    """Remove media files whose source records have left the bounded view database."""
    if not MEDIA_DIR.exists():
        return 0
    rows = con.execute(
        "SELECT image_local_path FROM stories WHERE view_id=? AND image_local_path IS NOT NULL",
        ("alien-world",),
    ).fetchall()
    retained = {Path(row[0]).resolve() for row in rows if row[0]}
    removed = 0
    for candidate in MEDIA_DIR.glob("*.jpg"):
        if candidate.resolve() not in retained:
            candidate.unlink(missing_ok=True)
            removed += 1
    return removed


def image_candidate_is_eligible(metadata: dict[str, Any], story_title: str) -> bool:
    """Conservative photo-only gate: reject concepts and weak title matches."""
    descriptors = " ".join(str(metadata.get(key, "")) for key in (
        "title", "description", "photographer", "secondary_creator", "center"
    )).lower()
    if any(marker in descriptors for marker in THIRD_PARTY_MARKERS + NON_PHOTOGRAPHIC_MARKERS):
        return False
    story_terms = {word for word in re.findall(r"[a-z0-9]+", story_title.lower())
                   if len(word) > 3 and word not in IMAGE_STOP_WORDS}
    media_terms = {word for word in re.findall(r"[a-z0-9]+", descriptors)
                   if len(word) > 3 and word not in IMAGE_STOP_WORDS}
    if not story_terms or not media_terms:
        return False
    overlap = story_terms.intersection(media_terms)
    return len(overlap) >= min(2, len(story_terms))


def find_nasa_image(title: str, destination: Path, logs: list[str]) -> dict[str, str] | None:
    query = " ".join(re.findall(r"[A-Za-z0-9]+", title)[:8]) or "space science"
    search_url = NASA_IMAGE_API + "?" + urllib.parse.urlencode({"q": query, "media_type": "image", "page_size": 8})
    try:
        payload = json.loads(fetch_bytes(search_url, 2 * 1024 * 1024, timeout=14))
        items = payload.get("collection", {}).get("items", [])
    except Exception as exc:
        logs.append(f"NASA image search unavailable: {str(exc)[:100]}"); return None
    for item in items:
        metadata = (item.get("data") or [{}])[0]
        if not image_candidate_is_eligible(metadata, title):
            continue
        candidates = [x.get("href", "") for x in item.get("links", []) if x.get("render") == "image"]
        candidates += [x.get("href", "") for x in item.get("links", []) if x.get("href")]
        asset_url = ""
        for candidate in candidates:
            p = urllib.parse.urlparse(candidate)
            if p.scheme == "https" and p.hostname == NASA_IMAGE_HOST and p.path.lower().endswith((".jpg", ".jpeg", ".png")):
                asset_url = candidate; break
        if not asset_url and item.get("href"):
            try:
                manifest = json.loads(fetch_bytes(item["href"], 2 * 1024 * 1024, timeout=12))
                for candidate in manifest.get("items", []):
                    p = urllib.parse.urlparse(candidate)
                    if p.scheme == "https" and p.hostname == NASA_IMAGE_HOST and p.path.lower().endswith((".jpg", ".jpeg", ".png")) and "thumb" not in p.path.lower():
                        asset_url = candidate; break
            except Exception:
                pass
        if not asset_url:
            continue
        try:
            raw = fetch_bytes(asset_url, MAX_IMAGE_BYTES, timeout=15)
            destination.parent.mkdir(parents=True, exist_ok=True)
            from io import BytesIO
            with Image.open(BytesIO(raw)) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((1800, 1300), Image.Resampling.LANCZOS)
                image.save(destination, "JPEG", quality=85, optimize=True)
            nasa_id = str(metadata.get("nasa_id") or "NASA Image Library")
            centre = clean_html(str(metadata.get("center") or "NASA"), 100)
            creator = clean_html(str(metadata.get("photographer") or metadata.get("secondary_creator") or "NASA"), 160)
            return {
                "url": asset_url,
                "caption": clean_html(str(metadata.get("title") or title), 180),
                "credit": f"NASA / {centre} · {creator}",
                "sourceUrl": "https://images.nasa.gov/details/" + urllib.parse.quote(nasa_id, safe=""),
                "rightsStatus": "nasa-guideline-reviewed-exclusion-screened",
                "rightsNote": "NASA-hosted image selected after screening metadata for common third-party credit markers. NASA Media Usage Guidelines and asset-specific restrictions still apply.",
            }
        except Exception as exc:
            logs.append(f"NASA image asset skipped: {str(exc)[:100]}")
    return None


def prepare_images(con: sqlite3.Connection, profile: dict[str, Any], now: datetime, logs: list[str]) -> int:
    max_images = int(profile.get("editorialProfile", {}).get("maximumDocumentaryImages", 5))
    rows = con.execute("""SELECT story_id,title,image_local_path,image_checked_at FROM stories
                          WHERE view_id=? ORDER BY published_at DESC LIMIT ?""",
                       (profile["viewId"], max_images)).fetchall()
    done = 0
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    for row in rows:
        if row["image_checked_at"] and row["image_local_path"] and Path(row["image_local_path"]).is_file():
            continue
        if row["image_checked_at"] and now.timestamp() - float(row["image_checked_at"]) < 7 * 86400:
            continue
        target = MEDIA_DIR / (row["story_id"] + ".jpg")
        metadata = find_nasa_image(row["title"], target, logs)
        if metadata:
            con.execute("""UPDATE stories SET image_url=?,image_local_path=?,image_caption=?,image_credit=?,
                         image_source_url=?,image_rights_status=?,image_rights_note=?,image_checked_at=? WHERE story_id=?""",
                        (metadata["url"], str(target), metadata["caption"], metadata["credit"], metadata["sourceUrl"],
                         metadata["rightsStatus"], metadata["rightsNote"], now.timestamp(), row["story_id"]))
            done += 1
        else:
            con.execute("UPDATE stories SET image_checked_at=? WHERE story_id=?", (now.timestamp(), row["story_id"]))
    con.commit()
    return done


def atomic_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".pending")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def write_outputs(result: dict[str, Any], mode: str, now: datetime) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if "feed" in result:
        atomic_json(OUTPUT_DIR / "live-feed.json", result["feed"])
    if "magazine" in result:
        mag = result["magazine"]
        pdf_path = ROOT / "published" / "alien-world" / mag["relativePath"]
        issue_record = {
            "issueId": mag["issueId"], "title": mag["title"],
            "publishedAt": result["generatedAt"], "coverageStart": result["coverageStart"],
            "coverageEnd": result["coverageEnd"], "windowHours": result["windowHours"],
            # Read publication artifacts cross-origin from the public repository so
            # the app service worker cannot place story JSON or PDFs into its optional
            # cache. The global PDF Viewer explicitly saves PDFs locally only after
            # the user opens them.
            "pdfUrl": "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/published/alien-world/" + mag["relativePath"],
            "pages": mag["pages"], "bytes": mag["bytes"], "sha256": mag["sha256"],
            "customRequest": mag["customRequest"], "customRequestReceipt": mag["customRequestReceipt"],
            "storyCount": result["eligibleStoryCount"],
        }
        manifest = {"schemaVersion": 1, "viewId": "alien-world", "publisherId": "alien-world-publisher",
                    "engine": result["engine"], "engineVersion": result["engineVersion"], **issue_record}
        atomic_json(OUTPUT_DIR / "latest-publication.json", manifest)
        catalog_path = OUTPUT_DIR / "catalog.json"
        if catalog_path.exists():
            try: catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
            except Exception: catalog = {"schemaVersion": 1, "viewId": "alien-world", "issues": []}
        else:
            catalog = {"schemaVersion": 1, "viewId": "alien-world", "issues": []}
        issues = [x for x in catalog.get("issues", []) if x.get("issueId") != mag["issueId"]]
        issues.insert(0, issue_record)
        issues = issues[:3]
        catalog = {"schemaVersion": 1, "viewId": "alien-world", "generatedAt": result["generatedAt"],
                   "latest": issue_record, "issues": issues}
        atomic_json(catalog_path, catalog)
        mag_dir = OUTPUT_DIR / "magazines"
        keep = {x["issueId"] + ".pdf" for x in issues}
        if mag_dir.exists():
            for old in mag_dir.glob("alien-world-*.pdf"):
                if old.name not in keep: old.unlink(missing_ok=True)


def read_only_connection(profile: dict[str, Any]) -> sqlite3.Connection:
    uri = "file:" + urllib.parse.quote(DB_PATH.as_posix(), safe="/:") + "?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA query_only=ON")
    return con


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("live", "magazine", "all"), default=os.getenv("PUBLISH_MODE", "live"))
    parser.add_argument("--custom-request", default=os.getenv("CUSTOM_REQUEST", ""))
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    logs: list[str] = []
    writer = None
    reader = None
    try:
        profile = load_profile()
        writer = open_writer_db(profile)
        ingested = collect_sources(writer, profile, now, logs)
        # Keep the live feed image-rich as well as the weekly PDF. Each record's
        # image check is throttled for seven days and the view's media folder is
        # pruned whenever records age out of the bounded database.
        prepared = prepare_images(writer, profile, now, logs)
        logs.append(f"Rights-screened NASA image assets prepared: {prepared}")
        writer.close(); writer = None
        reader = read_only_connection(profile)
        # Publisher owns the command; the Engine receives only its declared scope,
        # output mode and editorial request plus the read-only database handle.
        command = {
            "commandId": hashlib.sha256(f"alien-world:{now.isoformat()}:{args.mode}".encode()).hexdigest()[:24],
            "viewId": profile["viewId"], "publisherId": profile["publisherId"],
            "issuedAt": now.isoformat(), "mode": args.mode,
            "customRequest": args.custom_request or profile.get("editorialProfile", {}).get("defaultCustomRequest", ""),
        }
        sys.path.insert(0, str(ENGINE_DIR))
        from universal_editorial_engine import run_engine
        result = run_engine(reader, profile, command, OUTPUT_DIR, now)
        reader.close(); reader = None
        write_outputs(result, args.mode, now)
        print(json.dumps({"status": "published", "mode": args.mode, "ingested": ingested,
                          "stories": result["eligibleStoryCount"], "generatedAt": result["generatedAt"],
                          "magazine": result.get("magazine"), "logs": logs}, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"status": "skipped", "error": str(exc), "logs": logs,
                          "preservedLastGood": True}, indent=2), file=sys.stderr)
        return 2
    finally:
        if reader is not None: reader.close()
        if writer is not None: writer.close()


if __name__ == "__main__":
    raise SystemExit(main())

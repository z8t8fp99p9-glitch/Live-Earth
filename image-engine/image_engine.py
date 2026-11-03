#!/usr/bin/env python3
"""LIVE // EARTH Global Image Engine.

The engine is View-independent. It receives a Checker-issued, rights-limited
image job, prepares exactly one candidate for each post, and returns that
candidate to the Global Checker. It never approves or publishes an image.
"""
from __future__ import annotations

import hashlib
import html
import json
import random
import re
import shutil
import urllib.parse
import urllib.request
import uuid
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ENGINE_NAME = "LIVE // EARTH Global Image Engine"
# Kept at the currently registered Checker-compatible version. The Checker
# policy registry explicitly accepts 0.2.0; a version bump requires a paired
# registry-policy update and must not be done silently.
ENGINE_VERSION = "0.2.0"
PIPELINE_VERSION = "2.0.0"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
COMMONS_PAGE_HOSTS = {"commons.wikimedia.org"}
COMMONS_MEDIA_HOSTS = {"upload.wikimedia.org"}
ACCEPTED_LICENSE_NAMES = {
    "https://creativecommons.org/publicdomain/zero/1.0/": "CC0 1.0",
    "https://creativecommons.org/licenses/by/4.0/": "CC BY 4.0",
    "https://creativecommons.org/licenses/by-sa/4.0/": "CC BY-SA 4.0",
}
IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}
MANAGER_FIELDS = (
    "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
    "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
    "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
    "requestWindowHours", "configVersion", "trigger",
)
MEDIA_LINEAGE_FIELDS = (
    "postId", "viewId", "sourceId", "jobId", "profileId", "assignmentIds",
    "idempotencyKey", "configVersion", "destinationDatabaseId",
    "destinationDatabasePath",
)
RESTRICTIVE_MARKERS = (
    "all rights reserved", "copyright", "©", "permission required",
    "do not reproduce", "not for reuse", "licensed exclusively",
    "used with permission", "third-party content", "third party content",
    "reuters", "associated press", "getty images", "shutterstock", "afp",
    "alamy", "istock", "dreamstime", "depositphotos", "rights managed",
)
GENERATOR_SOURCE_PAGE = (
    "https://github.com/z8t8fp99p9-glitch/Live-Earth/blob/main/"
    "image-engine/image_engine.py"
)


class ImageEngineError(RuntimeError):
    """A bounded, identity, provenance, or image-preparation operation failed."""


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def clean_text(value: Any, limit: int = 1600) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(str(value or ""))
        parser.close()
        value = " ".join(parser.parts)
    except Exception:
        value = str(value or "")
    return re.sub(r"\s+", " ", html.unescape(str(value))).strip()[:limit]


def _https_host(url: Any) -> str:
    try:
        parsed = urllib.parse.urlsplit(str(url or "").strip())
        host = (parsed.hostname or "").lower().rstrip(".")
        if parsed.scheme.lower() != "https" or not host or parsed.username or parsed.password:
            return ""
        if parsed.port not in (None, 443):
            return ""
        return host
    except (TypeError, ValueError):
        return ""


def _host_allowed(url: str, hosts: set[str]) -> bool:
    host = _https_host(url)
    return bool(host) and any(host == item or host.endswith("." + item) for item in hosts)


def _safe_slug(value: Any) -> str:
    text = str(value or "")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", text):
        raise ImageEngineError("Checker supplied an invalid View identifier.")
    return text


def _tokens(value: Any) -> set[str]:
    return {x for x in re.findall(r"[a-z0-9]+", clean_text(value, 2400).casefold()) if len(x) >= 3}


def _same(left: Any, right: Any) -> bool:
    if isinstance(left, list) or isinstance(right, list):
        return isinstance(left, list) and isinstance(right, list) and left == right
    return left == right


def validate_manager_job(job: Any) -> dict[str, Any]:
    if not isinstance(job, dict):
        raise ImageEngineError("The Checker hand-off is missing its Manager job envelope.")
    missing = [field for field in MANAGER_FIELDS if job.get(field) in (None, "", [])]
    if missing:
        raise ImageEngineError("Manager identity/routing fields are missing: " + ", ".join(missing))
    for field in ("assignmentIds", "sourceIds", "feedUrls"):
        if not isinstance(job.get(field), list) or not job[field]:
            raise ImageEngineError(f"Manager field '{field}' must be a non-empty list.")
    if job.get("collectorEntrypoint") != "global_collector":
        raise ImageEngineError("The Manager job does not identify the shared Global Collector.")
    if job.get("trigger") not in {"scheduled", "manual"}:
        raise ImageEngineError("The Manager trigger is invalid.")
    path = str(job.get("destinationDatabasePath") or "")
    if path.startswith("/") or ".." in Path(path).parts or "\\" in path or not path.startswith(".publisher-data/"):
        raise ImageEngineError("The Manager destination database path is unsafe.")
    _safe_slug(job.get("viewId"))
    return dict(job)


def validate_lineage(job: dict[str, Any], entry: dict[str, Any]) -> dict[str, Any]:
    lineage = entry.get("lineage")
    if not isinstance(lineage, dict):
        raise ImageEngineError("Checker image input is missing the post Manager-lineage object.")
    for field in MANAGER_FIELDS:
        if field not in lineage or not _same(lineage.get(field), job.get(field)):
            raise ImageEngineError(f"Checker image input changed or omitted Manager field '{field}'.")
    if entry.get("viewId") != job.get("viewId"):
        raise ImageEngineError("Image input View ID differs from the Manager job.")
    if not entry.get("postId") or not entry.get("sourceId"):
        raise ImageEngineError("Image input must carry postId and sourceId.")
    if entry.get("sourceId") not in job.get("sourceIds", []):
        raise ImageEngineError("Image input sourceId is outside the Manager job.")
    return dict(lineage)


class _AllowlistedRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self, allowed_hosts: set[str]):
        super().__init__()
        self.allowed_hosts = allowed_hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not _host_allowed(newurl, self.allowed_hosts):
            raise ImageEngineError("Image request redirect left its approved HTTPS host boundary.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class ImageEngine:
    def __init__(
        self,
        staging_dir: str | Path,
        *,
        max_download_bytes: int = 7 * 1024 * 1024,
        max_candidates: int = 8,
        max_dimension: int = 1600,
        timeout_seconds: int = 20,
        user_agent: str = "LIVE-EARTH-GlobalImageEngine/0.2 (+https://github.com/z8t8fp99p9-glitch/Live-Earth)",
    ) -> None:
        if max_download_bytes < 1024 or max_candidates < 1 or max_dimension < 256:
            raise ValueError("Image Engine safety bounds are below their minimums.")
        self.staging_dir = Path(staging_dir).resolve()
        self.staging_dir.mkdir(parents=True, exist_ok=True)
        self.max_download_bytes = int(max_download_bytes)
        self.max_candidates = min(int(max_candidates), 12)
        self.max_dimension = int(max_dimension)
        self.timeout_seconds = int(timeout_seconds)
        self.user_agent = user_agent

    def _get_bytes(self, url: str, hosts: set[str], accept: str, limit: int) -> tuple[bytes, str, str]:
        if not _host_allowed(url, hosts):
            raise ImageEngineError("URL is outside the approved HTTPS host boundary.")
        request = urllib.request.Request(url, headers={"User-Agent": self.user_agent, "Accept": accept})
        opener = urllib.request.build_opener(_AllowlistedRedirectHandler(hosts))
        try:
            with opener.open(request, timeout=self.timeout_seconds) as response:
                final_url = response.geturl()
                if not _host_allowed(final_url, hosts):
                    raise ImageEngineError("Final response URL left the approved host boundary.")
                mime = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
                payload = response.read(limit + 1)
        except ImageEngineError:
            raise
        except Exception as exc:
            raise ImageEngineError(f"Bounded image-source request failed: {type(exc).__name__}.") from exc
        if not payload or len(payload) > limit:
            raise ImageEngineError("Image response is empty or exceeds the configured byte limit.")
        return payload, final_url, mime

    def _get_json(self, url: str) -> dict[str, Any]:
        payload, _final_url, mime = self._get_bytes(url, COMMONS_PAGE_HOSTS, "application/json", 2 * 1024 * 1024)
        if mime and "json" not in mime:
            raise ImageEngineError("Commons API did not return JSON.")
        try:
            result = json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ImageEngineError("Commons API returned malformed JSON.") from exc
        if not isinstance(result, dict) or "error" in result:
            raise ImageEngineError("Commons API returned an invalid response.")
        return result

    @staticmethod
    def _metadata_value(ext: dict[str, Any], key: str) -> str:
        value = ext.get(key, "")
        if isinstance(value, dict):
            value = value.get("value", "")
        return clean_text(value, 1600)

    def discover_commons(self, query: str, *, view_id: str, post_id: str,
                         article_url: str, accepted_licenses: list[str], limit: int | None = None) -> list[dict[str, Any]]:
        """Discover Commons image candidates. All results remain unapproved."""
        _safe_slug(view_id)
        if not clean_text(post_id, 160) or not _https_host(article_url):
            raise ImageEngineError("Commons discovery requires postId and an HTTPS article URL.")
        terms = clean_text(query, 300)
        if len(terms) < 3:
            return []
        accepted = set(accepted_licenses) & set(ACCEPTED_LICENSE_NAMES)
        if not accepted:
            return []
        count = min(max(int(limit or self.max_candidates), 1), self.max_candidates)
        params = {
            "action": "query", "format": "json", "formatversion": "2",
            "generator": "search", "gsrsearch": terms + " filetype:bitmap",
            "gsrnamespace": "6", "gsrlimit": str(count),
            "prop": "imageinfo", "iiprop": "url|mime|extmetadata",
            "iiextmetadatafilter": "Artist|Credit|ImageDescription|ObjectName|LicenseShortName|LicenseUrl|Copyrighted|Permission|Attribution",
            "iiurlwidth": str(self.max_dimension),
        }
        data = self._get_json(COMMONS_API + "?" + urllib.parse.urlencode(params))
        pages = data.get("query", {}).get("pages", [])
        if not isinstance(pages, list):
            raise ImageEngineError("Commons API returned an invalid page list.")
        results: list[dict[str, Any]] = []
        query_tokens = _tokens(terms)
        for page in pages:
            if not isinstance(page, dict):
                continue
            title = clean_text(page.get("title"), 300)
            info_list = page.get("imageinfo") or []
            if not title.startswith("File:") or not info_list or not isinstance(info_list[0], dict):
                continue
            info = info_list[0]
            ext = info.get("extmetadata") or {}
            if not isinstance(ext, dict):
                continue
            source_page = clean_text(info.get("descriptionurl"), 1200)
            media_url = clean_text(info.get("thumburl") or info.get("url"), 1200)
            mime = clean_text(info.get("thumbmime") or info.get("mime"), 80).lower()
            creator = self._metadata_value(ext, "Artist")
            credit = self._metadata_value(ext, "Credit") or creator
            caption = (self._metadata_value(ext, "ImageDescription") or
                       self._metadata_value(ext, "ObjectName") or self._metadata_value(ext, "Caption"))
            license_url = self._metadata_value(ext, "LicenseUrl")
            copyrighted = self._metadata_value(ext, "Copyrighted").casefold()
            rights_notice = self._metadata_value(ext, "Permission") or self._metadata_value(ext, "Attribution")
            descriptor = " ".join((title, caption, creator, credit, rights_notice)).casefold()
            if not _host_allowed(source_page, COMMONS_PAGE_HOSTS) or not _host_allowed(media_url, COMMONS_MEDIA_HOSTS):
                continue
            if mime not in IMAGE_MIMES or license_url not in accepted or not creator or not credit or not caption:
                continue
            if copyrighted not in {"", "true", "false"} or any(mark in descriptor for mark in RESTRICTIVE_MARKERS):
                continue
            overlap = query_tokens & _tokens(" ".join((title, caption)))
            if not overlap:
                continue
            results.append({
                "originType": "commons-external-image", "viewId": view_id,
                "postId": post_id, "articleUrl": article_url,
                "fileTitle": title, "sourcePage": source_page,
                "sourceMediaUrl": media_url, "mime": mime,
                "creator": creator, "credit": credit, "caption": caption,
                "licenseName": ACCEPTED_LICENSE_NAMES[license_url],
                "licenseUrl": license_url,
                "rightsNotice": rights_notice or "Commons file metadata supplied no additional restriction notice.",
                "modificationNote": "Pending local normalization; the Global Checker must review the exact source page and licence.",
                "relevanceScore": len(overlap) / max(1, len(query_tokens)),
                "checkerStatus": "pending", "approved": False,
            })
        results.sort(key=lambda item: item["relevanceScore"], reverse=True)
        return results[:count]

    def _normalize_and_stage(self, payload: bytes, *, minimum_width: int = 320,
                             minimum_height: int = 240) -> tuple[Path, str, int, int]:
        from io import BytesIO
        try:
            with Image.open(BytesIO(payload)) as probe:
                if probe.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ImageEngineError("Image format is not an approved raster format.")
                if probe.width < minimum_width or probe.height < minimum_height:
                    raise ImageEngineError("Image dimensions are too small for a Live Feed image.")
                width, height = probe.size
                probe.verify()
            with Image.open(BytesIO(payload)) as source:
                image = source.convert("RGB")
                image.thumbnail((self.max_dimension, self.max_dimension), Image.Resampling.LANCZOS)
                normalized_width, normalized_height = image.size
                target = self.staging_dir / ("prepared-" + hashlib.sha256(payload).hexdigest() + ".jpg")
                image.save(target, "JPEG", quality=86, optimize=True, progressive=True)
        except ImageEngineError:
            raise
        except Exception as exc:
            raise ImageEngineError("Image decode/normalization failed safely.") from exc
        if not target.is_file() or target.stat().st_size < 1000:
            target.unlink(missing_ok=True)
            raise ImageEngineError("Prepared image is unexpectedly small or missing.")
        return target, hashlib.sha256(target.read_bytes()).hexdigest(), normalized_width, normalized_height

    def prepare_commons_candidate(self, candidate: dict[str, Any], *, asset_url_base: str) -> dict[str, Any]:
        if candidate.get("originType") != "commons-external-image":
            raise ImageEngineError("Input is not a Commons candidate created by this engine.")
        if candidate.get("licenseUrl") not in ACCEPTED_LICENSE_NAMES:
            raise ImageEngineError("Commons candidate licence is not in the fixed accepted licence set.")
        if not _host_allowed(candidate.get("sourcePage", ""), COMMONS_PAGE_HOSTS):
            raise ImageEngineError("Commons source page is not an exact HTTPS Commons file page.")
        if not _host_allowed(candidate.get("sourceMediaUrl", ""), COMMONS_MEDIA_HOSTS):
            raise ImageEngineError("Commons media URL is outside the approved media host.")
        payload, final_url, mime = self._get_bytes(candidate["sourceMediaUrl"], COMMONS_MEDIA_HOSTS,
                                                     "image/jpeg,image/png,image/webp", self.max_download_bytes)
        if mime and mime not in IMAGE_MIMES:
            raise ImageEngineError("Image response MIME is not an approved raster format.")
        target, digest, width, height = self._normalize_and_stage(payload)
        result = dict(candidate)
        result.update({
            "sourceMediaUrl": final_url, "stagedPath": str(target),
            "sourceSha256": hashlib.sha256(payload).hexdigest(),
            "sha256": digest, "width": width, "height": height,
            "mime": "image/jpeg",
            "modificationNote": f"Normalized locally to JPEG; longest edge capped at {self.max_dimension}px; original creator and licence retained.",
            "assetUrl": _asset_url(asset_url_base, target.name),
            "checkerStatus": "pending", "approved": False,
        })
        return result

    def create_original_illustration(self, *, post: dict[str, Any], view_id: str,
                                    asset_url_base: str, manager_job: dict[str, Any]) -> dict[str, Any]:
        """Create relevant thematic artwork, explicitly never a photograph."""
        view_id = _safe_slug(view_id)
        title = clean_text(post.get("title"), 240)
        search_text = clean_text(post.get("searchText") or title, 700)
        post_id = clean_text(post.get("postId"), 160)
        article_url = clean_text(post.get("articleUrl"), 1200)
        if not title or not post_id or not _https_host(article_url):
            raise ImageEngineError("Original illustration requires postId, title and an HTTPS article URL.")
        width, height = 1200, 800
        seed = int(hashlib.sha256((post_id + "|" + search_text + "|" + ENGINE_VERSION).encode()).hexdigest()[:8], 16)
        rng = random.Random(seed)
        tokens = _tokens(search_text)
        # A content-driven, View-neutral composition. It never selects a visual
        # treatment by View ID and is always labelled as thematic illustration.
        palettes = [((8, 21, 32), (34, 75, 91)), ((24, 24, 44), (89, 55, 78)),
                    ((19, 38, 31), (60, 91, 61)), ((28, 34, 48), (80, 82, 92))]
        top, bottom = palettes[seed % len(palettes)]
        image = Image.new("RGB", (width, height))
        pixels = image.load()
        for y in range(height):
            t = y / (height - 1)
            color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
            for x in range(width):
                pixels[x, y] = color
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay, "RGBA")
        cx, cy = int(width * .66), int(height * .43)
        if tokens & {"ocean", "sea", "water", "marine", "coral", "oceanic"}:
            for i in range(5):
                y = int(height * (.48 + i * .075))
                draw.arc((-80, y-80, width+100, y+100), 190, 350, fill=(111, 205, 218, 145-i*14), width=7)
            draw.ellipse((cx-130, cy-110, cx+130, cy+150), fill=(73, 157, 183, 105), outline=(180, 229, 234, 170), width=5)
        elif tokens & {"forest", "tree", "wildlife", "animal", "species", "biodiversity", "plant"}:
            for _ in range(55):
                x, y = rng.randint(40, width-40), rng.randint(60, int(height*.76))
                rx, ry = rng.randint(18, 62), rng.randint(24, 85)
                draw.ellipse((x-rx, y-ry, x+rx, y+ry), fill=(88, 160, 112, 85), outline=(186, 218, 166, 65), width=2)
            draw.arc((cx-180, cy-160, cx+180, cy+250), 15, 170, fill=(204, 226, 172, 170), width=5)
        elif tokens & {"planet", "space", "star", "galaxy", "moon", "mars", "orbit", "solar"}:
            glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow, "RGBA")
            gd.ellipse((cx-195, cy-195, cx+195, cy+195), fill=(130, 160, 240, 65))
            glow = glow.filter(ImageFilter.GaussianBlur(40))
            overlay = Image.alpha_composite(overlay, glow)
            draw = ImageDraw.Draw(overlay, "RGBA")
            draw.ellipse((cx-120, cy-120, cx+120, cy+120), fill=(199, 137, 93, 230), outline=(241, 214, 174, 210), width=4)
            draw.arc((cx-230, cy-65, cx+230, cy+100), 185, 355, fill=(203, 216, 255, 200), width=8)
            for _ in range(75):
                x, y = rng.randrange(width), rng.randrange(height)
                r = rng.choice((1, 1, 2, 3))
                draw.ellipse((x-r, y-r, x+r, y+r), fill=(235, 239, 255, rng.randint(90, 220)))
        elif tokens & {"weather", "storm", "cloud", "climate", "rain", "temperature"}:
            for i in range(8):
                x = rng.randint(160, width-100)
                y = rng.randint(120, 470)
                draw.ellipse((x-95, y-45, x+95, y+45), fill=(205, 216, 224, 115))
            for i in range(22):
                x = rng.randint(180, width-100)
                y = rng.randint(400, 650)
                draw.line((x, y, x-22, y+58), fill=(145, 207, 220, 140), width=4)
        else:
            # General research motif: layered circles, arcs and data-like marks.
            for radius in (75, 130, 190):
                draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), outline=(210, 224, 230, 95), width=4)
            for _ in range(35):
                x, y = rng.randint(70, width-70), rng.randint(70, height-130)
                draw.ellipse((x-3, y-3, x+3, y+3), fill=(238, 218, 172, 175))
        image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(image, "RGBA")
        font = ImageFont.load_default(size=28)
        label = title[:76]
        draw.rounded_rectangle((40, 42, 780, 126), radius=20, fill=(3, 8, 17, 150), outline=(245, 245, 245, 65), width=2)
        draw.text((66, 69), label, font=font, fill=(250, 250, 248, 240))
        notice = "ILLUSTRATION  /  NOT A PHOTOGRAPH"
        note_font = ImageFont.load_default(size=23)
        draw.rounded_rectangle((24, height-78, 600, height-22), radius=14, fill=(3, 8, 16, 215), outline=(230, 235, 245, 100), width=2)
        draw.text((44, height-64), notice, font=note_font, fill=(245, 246, 250, 245))
        target = self.staging_dir / ("illustration-" + hashlib.sha256((post_id + str(seed)).encode()).hexdigest() + ".jpg")
        image.save(target, "JPEG", quality=88, optimize=True, progressive=True)
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        caption = (
            "Original thematic illustration created locally for the story. It is not a literal depiction "
            "of the linked report, and is not a documentary photograph or data-accurate scientific visualization."
        )
        return {
            "originType": "local-original-illustration", "viewId": view_id,
            "postId": post_id, "articleUrl": article_url,
            "sourcePage": GENERATOR_SOURCE_PAGE,
            "sourceMediaUrl": "", "creator": ENGINE_NAME,
            "credit": "LIVE // EARTH Global Image Engine (original illustration)",
            "caption": caption,
            "licenseName": "Original LIVE // EARTH artwork", "licenseUrl": "",
            "rightsNotice": "Original procedural illustration generated locally; no third-party image asset was used.",
            "modificationNote": "Created from procedural drawing primitives by the local LIVE // EARTH Image Engine; not derived from or edited from a source photograph.",
            "mime": "image/jpeg", "width": width, "height": height,
            "stagedPath": str(target), "sha256": digest,
            "assetUrl": _asset_url(asset_url_base, target.name),
            "checkerStatus": "pending", "approved": False,
        }


def _asset_url(base: str, filename: str) -> str:
    if not _host_allowed(base, {"raw.githubusercontent.com"}) or not base.endswith("/"):
        raise ImageEngineError("Checker asset destination must be an HTTPS raw GitHub asset directory.")
    parsed = urllib.parse.urlsplit(base)
    if not re.search(r"/[a-z0-9][a-z0-9-]*/published/assets/$", parsed.path):
        raise ImageEngineError("Checker asset destination must target a registered View published/assets folder.")
    return base + urllib.parse.quote(filename)


def media_record(candidate: dict[str, Any], *, job: dict[str, Any], entry: dict[str, Any]) -> dict[str, Any]:
    """Convert one prepared candidate to the strict Universal Media schema."""
    post_id = str(entry["postId"])
    view_id = str(entry["viewId"])
    source_id = str(entry["sourceId"])
    stage = Path(str(candidate.get("stagedPath") or "")).resolve()
    if not stage.is_file():
        raise ImageEngineError("Prepared candidate file is missing from private staging.")
    digest = hashlib.sha256(stage.read_bytes()).hexdigest()
    if digest != candidate.get("sha256"):
        raise ImageEngineError("Prepared candidate hash changed before Checker hand-off.")
    media_id_material = "|".join((str(job["jobId"]), post_id, str(candidate.get("originType")), digest))
    media_id = "media-" + hashlib.sha256(media_id_material.encode()).hexdigest()[:24]
    lineage = entry["lineage"]
    metadata = {
        "originType": candidate.get("originType"),
        "engine": ENGINE_NAME,
        "engineVersion": ENGINE_VERSION,
        "modificationNote": candidate.get("modificationNote", ""),
        "rightsNotice": candidate.get("rightsNotice", ""),
        "sha256": digest,
        "stagedPath": str(stage),
        "assetPublished": False,
        "checkerStatus": "PENDING_CHECKER_REVIEW",
        "sourceMediaUrl": candidate.get("sourceMediaUrl", ""),
        "sourceSha256": candidate.get("sourceSha256", ""),
        "fileTitle": candidate.get("fileTitle", ""),
        "candidateOnly": True,
    }
    result = {
        "mediaId": media_id,
        "mediaType": "image",
        "url": candidate["assetUrl"],
        "originalUrl": candidate.get("sourceMediaUrl", "") or candidate["assetUrl"],
        "thumbnailUrl": candidate["assetUrl"],
        "title": candidate.get("fileTitle") or clean_text(entry.get("title"), 240),
        "caption": candidate.get("caption", ""),
        "altText": candidate.get("caption", ""),
        "creator": candidate.get("creator", ""),
        "credit": candidate.get("credit", ""),
        "licenseName": candidate.get("licenseName", ""),
        "licenseUrl": candidate.get("licenseUrl", ""),
        "rightsNotice": candidate.get("rightsNotice", ""),
        "mimeType": "image/jpeg",
        "width": int(candidate.get("width") or 0),
        "height": int(candidate.get("height") or 0),
        "durationSeconds": None,
        "fileSizeBytes": stage.stat().st_size,
        "sourcePage": candidate.get("sourcePage", ""),
        "position": 0,
        "metadata": metadata,
        "postId": post_id,
        "viewId": view_id,
        "sourceId": source_id,
    }
    for field in MEDIA_LINEAGE_FIELDS:
        if field not in {"postId", "viewId", "sourceId"}:
            result[field] = lineage[field]
    # Validate the complete ID chain on the object returned to the Checker.
    for field in MEDIA_LINEAGE_FIELDS:
        expected = post_id if field == "postId" else view_id if field == "viewId" else source_id if field == "sourceId" else job[field]
        if not _same(result.get(field), expected):
            raise ImageEngineError(f"Generated media lost or altered lineage field '{field}'.")
    return result


def stage_directory(base_dir: str | Path, job_id: str, view_id: str) -> Path:
    """Create an isolated, non-public per-job staging directory."""
    safe_view = _safe_slug(view_id)
    safe_job = hashlib.sha256(str(job_id).encode()).hexdigest()[:20]
    target = Path(base_dir).resolve() / safe_view / (safe_job + "-" + uuid.uuid4().hex[:8])
    target.mkdir(parents=True, exist_ok=False)
    return target

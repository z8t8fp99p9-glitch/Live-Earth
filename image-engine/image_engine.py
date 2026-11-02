#!/usr/bin/env python3
"""LIVE // EARTH Global Image Engine.

Shared, view-aware image discovery and preparation. This module deliberately:
- does not connect to or write to either view database;
- does not make rights decisions or approve its own output;
- stages prepared files until the Global Checker explicitly approves them;
- uses only Wikimedia Commons for external image discovery in this first release;
- creates original procedural illustrations locally with Pillow (no hosted AI).

The caller supplies the Global Checker decision and the final publication URL.
"""
from __future__ import annotations

import hashlib
import html
import json
import os
import random
import re
import shutil
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ENGINE_NAME = "LIVE // EARTH Global Image Engine"
ENGINE_VERSION = "0.2.0"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
COMMONS_FILE_PAGE_HOSTS = {"commons.wikimedia.org"}
COMMONS_MEDIA_HOSTS = {"upload.wikimedia.org"}
ALLOWED_VIEWS = {"nature", "alien-world"}
ACCEPTED_LICENSES = {
    "https://creativecommons.org/publicdomain/zero/1.0/": "CC0 1.0",
    "https://creativecommons.org/licenses/by/4.0/": "CC BY 4.0",
    "https://creativecommons.org/licenses/by-sa/4.0/": "CC BY-SA 4.0",
}
IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}
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
    """A bounded, provenance or image-preparation operation failed."""


class _HTMLText(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def clean_text(value: Any, limit: int = 1200) -> str:
    parser = _HTMLText()
    try:
        parser.feed(str(value or ""))
        parser.close()
        result = " ".join(parser.parts)
    except Exception:
        result = str(value or "")
    return re.sub(r"\s+", " ", html.unescape(result)).strip()[:limit]


def _https_host(url: str) -> str:
    try:
        parsed = urllib.parse.urlsplit(str(url or "").strip())
        host = (parsed.hostname or "").lower().rstrip(".")
        if parsed.scheme.lower() != "https" or not host or parsed.username or parsed.password:
            return ""
        return host
    except (TypeError, ValueError):
        return ""


def _host_allowed(url: str, allowed: set[str]) -> bool:
    host = _https_host(url)
    return bool(host) and any(host == domain or host.endswith("." + domain) for domain in allowed)


class _AllowlistedRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Refuse redirects outside the host allowlist, including downgrade redirects."""
    def __init__(self, allowed_hosts: set[str]):
        super().__init__()
        self.allowed_hosts = allowed_hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not _host_allowed(newurl, self.allowed_hosts):
            raise ImageEngineError("Image request redirect left the approved HTTPS host boundary.")
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
            raise ValueError("Image Engine bounds are below safe minimums.")
        self.staging_dir = Path(staging_dir).resolve()
        self.max_download_bytes = int(max_download_bytes)
        self.max_candidates = min(int(max_candidates), 12)
        self.max_dimension = int(max_dimension)
        self.timeout_seconds = int(timeout_seconds)
        self.user_agent = user_agent
        self.staging_dir.mkdir(parents=True, exist_ok=True)

    def _get_bytes(self, url: str, allowed_hosts: set[str], accept: str, limit: int) -> tuple[bytes, str, str]:
        if not _host_allowed(url, allowed_hosts):
            raise ImageEngineError("URL is outside the approved HTTPS host boundary.")
        request = urllib.request.Request(url, headers={
            "User-Agent": self.user_agent,
            "Accept": accept,
        })
        opener = urllib.request.build_opener(_AllowlistedRedirectHandler(allowed_hosts))
        try:
            with opener.open(request, timeout=self.timeout_seconds) as response:
                final_url = response.geturl()
                if not _host_allowed(final_url, allowed_hosts):
                    raise ImageEngineError("Final response URL left the approved host boundary.")
                content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
                payload = response.read(limit + 1)
        except ImageEngineError:
            raise
        except Exception as exc:
            raise ImageEngineError(f"Bounded image-source request failed: {exc}") from exc
        if not payload:
            raise ImageEngineError("The image source returned an empty response.")
        if len(payload) > limit:
            raise ImageEngineError("The image source exceeded the configured byte limit.")
        return payload, final_url, content_type

    def _get_json(self, url: str) -> dict[str, Any]:
        payload, _final_url, content_type = self._get_bytes(
            url, COMMONS_FILE_PAGE_HOSTS, "application/json", 2 * 1024 * 1024
        )
        if content_type and "json" not in content_type:
            raise ImageEngineError("Commons API did not return JSON content.")
        try:
            data = json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ImageEngineError("Commons API returned malformed JSON.") from exc
        if not isinstance(data, dict) or "error" in data:
            raise ImageEngineError("Commons API response is invalid or contains an error.")
        return data

    @staticmethod
    def _metadata_value(extmetadata: dict[str, Any], key: str) -> str:
        value = extmetadata.get(key, "")
        if isinstance(value, dict):
            value = value.get("value", "")
        return clean_text(value, 1600)

    def _candidate_from_page(self, page: dict[str, Any], *, view_id: str, story_id: str, article_url: str) -> dict[str, Any] | None:
        title = clean_text(page.get("title"), 300)
        info_list = page.get("imageinfo") or []
        if not title.startswith("File:") or not info_list or not isinstance(info_list[0], dict):
            return None
        info = info_list[0]
        ext = info.get("extmetadata") or {}
        if not isinstance(ext, dict):
            return None

        description_url = clean_text(info.get("descriptionurl"), 1200)
        media_url = clean_text(info.get("thumburl") or info.get("url"), 1200)
        mime = clean_text(info.get("thumbmime") or info.get("mime"), 80).lower()
        # Credit can identify an uploader or institution; it is not a safe
        # substitute for a missing original creator field.
        creator = self._metadata_value(ext, "Artist")
        credit = self._metadata_value(ext, "Credit") or creator
        caption = (
            self._metadata_value(ext, "ImageDescription")
            or self._metadata_value(ext, "ObjectName")
            or self._metadata_value(ext, "Caption")
        )
        license_url = self._metadata_value(ext, "LicenseUrl")
        license_name = self._metadata_value(ext, "LicenseShortName") or self._metadata_value(ext, "UsageTerms")
        copyrighted = self._metadata_value(ext, "Copyrighted").casefold()
        rights_notice = self._metadata_value(ext, "Permission") or self._metadata_value(ext, "Attribution")
        descriptor = " ".join((title, caption, creator, credit, rights_notice)).casefold()

        # The Engine screens out incomplete/obviously unsuitable metadata, but
        # the Global Checker remains the only rights authority.
        if not _host_allowed(description_url, COMMONS_FILE_PAGE_HOSTS):
            return None
        if not _host_allowed(media_url, COMMONS_MEDIA_HOSTS):
            return None
        if mime not in IMAGE_MIMES:
            return None
        if license_url not in ACCEPTED_LICENSES:
            return None
        if not creator or not credit or not caption:
            return None
        # Copyright ownership is compatible with a public CC licence. A true
        # Copyrighted flag is not itself a restriction; the exact licence is
        # retained for the Global Checker to assess. Unknown flag values hold.
        if copyrighted not in {"", "true", "false"}:
            return None
        if any(marker in descriptor for marker in RESTRICTIVE_MARKERS):
            return None

        return {
            "engine": ENGINE_NAME,
            "engineVersion": ENGINE_VERSION,
            "originType": "commons-external-image",
            "viewId": view_id,
            "storyId": story_id,
            "articleUrl": article_url,
            "fileTitle": title,
            "sourcePage": description_url,
            "sourceMediaUrl": media_url,
            "mime": mime,
            "creator": creator,
            "credit": credit,
            "caption": caption,
            "licenseName": ACCEPTED_LICENSES[license_url],
            "licenseUrl": license_url,
            "rightsNotice": rights_notice or "Commons file metadata returned no additional restriction notice.",
            "modificationNote": "Pending local preparation; no image pixels have been changed yet.",
            "kind": "documentary-photo-candidate",
            "checkerStatus": "pending",
            "checkerDecision": None,
            "approved": False,
        }

    def discover_commons(self, query: str, *, view_id: str, story_id: str, article_url: str, limit: int | None = None) -> list[dict[str, Any]]:
        """Find Commons files with explicit accepted licence and attribution metadata.

        Results are candidates only. No candidate is approved for publication.
        """
        if view_id not in ALLOWED_VIEWS or not clean_text(story_id, 120) or not _https_host(article_url):
            raise ImageEngineError("Image discovery requires a registered view, story identifier and HTTPS article URL.")
        terms = clean_text(query, 180)
        if len(terms) < 3:
            raise ImageEngineError("Image discovery requires at least three meaningful search characters.")
        count = min(max(int(limit or self.max_candidates), 1), self.max_candidates)
        params = {
            "action": "query", "format": "json", "formatversion": "2",
            "generator": "search", "gsrsearch": terms + " filetype:bitmap",
            "gsrnamespace": "6", "gsrlimit": str(count),
            "prop": "imageinfo", "iiprop": "url|mime|extmetadata",
            "iiextmetadatafilter": "Artist|Credit|ImageDescription|ObjectName|LicenseShortName|LicenseUrl|Copyrighted|Permission|Attribution",
            "iiurlwidth": str(self.max_dimension),
        }
        url = COMMONS_API + "?" + urllib.parse.urlencode(params)
        data = self._get_json(url)
        pages = data.get("query", {}).get("pages", [])
        if not isinstance(pages, list):
            raise ImageEngineError("Commons API did not return a valid file-page list.")
        results = []
        for page in pages:
            if not isinstance(page, dict):
                continue
            try:
                candidate = self._candidate_from_page(page, view_id=view_id, story_id=clean_text(story_id, 120), article_url=clean_text(article_url, 1200))
            except Exception:
                candidate = None
            if candidate:
                results.append(candidate)
        return results[:count]

    def prepare_commons_candidate(
        self,
        candidate: dict[str, Any],
        *,
        published_base_url: str = "",
    ) -> dict[str, Any]:
        """Download, validate, normalize and stage a Commons candidate.

        The staged JPEG is temporary. It is not published until the caller
        attaches a matching GREEN Global Checker decision and calls
        publish_checker_approved().
        """
        if candidate.get("engine") != ENGINE_NAME or candidate.get("originType") != "commons-external-image":
            raise ImageEngineError("Candidate was not produced by this Image Engine.")
        if candidate.get("licenseUrl") not in ACCEPTED_LICENSES or not _host_allowed(candidate.get("sourcePage", ""), COMMONS_FILE_PAGE_HOSTS):
            raise ImageEngineError("Candidate provenance or licence is no longer eligible for preparation.")
        if not _host_allowed(candidate.get("sourceMediaUrl", ""), COMMONS_MEDIA_HOSTS):
            raise ImageEngineError("Candidate media URL is outside the approved Commons media host.")
        payload, final_url, content_type = self._get_bytes(
            candidate["sourceMediaUrl"], COMMONS_MEDIA_HOSTS,
            "image/jpeg,image/png,image/webp", self.max_download_bytes,
        )
        if content_type and content_type not in IMAGE_MIMES:
            raise ImageEngineError("Image response MIME type is not an approved raster format.")
        try:
            from io import BytesIO
            with Image.open(BytesIO(payload)) as probe:
                if probe.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ImageEngineError("Image format is not an approved raster format.")
                if probe.width < 320 or probe.height < 240:
                    raise ImageEngineError("Image dimensions are too small for the Live Feed.")
                probe.verify()
            with Image.open(BytesIO(payload)) as source:
                image = source.convert("RGB")
                image.thumbnail((self.max_dimension, self.max_dimension), Image.Resampling.LANCZOS)
                source_digest = hashlib.sha256(payload).hexdigest()
                target = self.staging_dir / f"prepared-{source_digest}.jpg"
                image.save(target, "JPEG", quality=86, optimize=True, progressive=True)
        except ImageEngineError:
            raise
        except Exception as exc:
            raise ImageEngineError(f"Image could not be safely decoded and normalized: {exc}") from exc
        if not target.is_file() or target.stat().st_size < 1000:
            target.unlink(missing_ok=True)
            raise ImageEngineError("Prepared image is unexpectedly small or missing.")
        result = dict(candidate)
        result.update({
            "sourceMediaUrl": final_url,
            "stagedPath": str(target),
            "sourceSha256": source_digest,
            "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            "mime": "image/jpeg",
            "modificationNote": f"Normalized locally to JPEG, max {self.max_dimension}px on the longest edge; original creator and licence attribution retained.",
            "checkerStatus": "pending",
            "checkerDecision": None,
            "approved": False,
        })
        if published_base_url:
            if not _host_allowed(published_base_url, {"raw.githubusercontent.com"}) or not published_base_url.endswith("/"):
                raise ImageEngineError("Published asset base URL must be an HTTPS raw GitHub directory URL.")
            result["url"] = published_base_url + urllib.parse.quote(target.name)
        else:
            result["url"] = final_url
        result["imageUrl"] = result["url"]
        return result

    def create_original_illustration(
        self,
        story: dict[str, Any],
        view_id: str,
        *,
        published_base_url: str,
        width: int = 1200,
        height: int = 800,
    ) -> dict[str, Any]:
        """Create an original procedural illustration locally; never a photo.

        The illustration is deliberately generic and must not imply that it is
        documentary evidence or a data-accurate scientific visualization.
        """
        if view_id not in ALLOWED_VIEWS:
            raise ImageEngineError("Image Engine view identity is not registered.")
        if not _host_allowed(published_base_url, {"raw.githubusercontent.com"}) or not published_base_url.endswith("/"):
            raise ImageEngineError("Original illustrations require a raw GitHub publication asset directory.")
        if not (640 <= width <= 2000 and 420 <= height <= 1400):
            raise ImageEngineError("Illustration dimensions are outside safe bounds.")
        story_id = clean_text(story.get("id") or story.get("story_id"), 120)
        article_url = clean_text(story.get("url") or story.get("articleUrl"), 1200)
        if not _https_host(article_url):
            raise ImageEngineError("Original illustration requires the originating HTTPS story URL.")
        if not story_id:
            raise ImageEngineError("Original illustration requires a stable story identifier.")
        seed = int(hashlib.sha256((view_id + ":" + story_id).encode()).hexdigest()[:8], 16)
        rng = random.Random(seed)
        image = Image.new("RGB", (width, height))
        pixels = image.load()
        if view_id == "nature":
            top, bottom = (12, 34, 31), (22, 88, 65)
        else:
            top, bottom = (8, 13, 38), (43, 29, 79)
        for y in range(height):
            t = y / max(1, height - 1)
            color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
            for x in range(width):
                pixels[x, y] = color
        draw = ImageDraw.Draw(image, "RGBA")
        if view_id == "nature":
            # Abstract canopy, leaf forms and a horizon: clearly illustrative.
            for i in range(70):
                x, y = rng.randint(-40, width + 40), rng.randint(20, int(height * .78))
                rx, ry = rng.randint(18, 70), rng.randint(28, 100)
                green = rng.choice([(43, 130, 91, 105), (91, 157, 102, 95), (24, 105, 83, 130)])
                draw.ellipse((x-rx, y-ry, x+rx, y+ry), fill=green)
            draw.polygon([(0, int(height*.72)), (int(width*.22), int(height*.59)),
                          (int(width*.45), int(height*.73)), (int(width*.7), int(height*.57)),
                          (width, int(height*.7)), (width, height), (0, height)],
                         fill=(10, 48, 43, 210))
            draw.arc((int(width*.1), int(height*.68), int(width*.9), int(height*1.15)), 180, 350,
                     fill=(105, 190, 151, 170), width=5)
        else:
            # Abstract celestial body and orbit arcs, not a real planet rendering.
            cx, cy = int(width*.63), int(height*.48)
            radius = int(min(width, height)*.22)
            glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow, "RGBA")
            gd.ellipse((cx-radius*1.35, cy-radius*1.35, cx+radius*1.35, cy+radius*1.35), fill=(90, 126, 220, 35))
            glow = glow.filter(ImageFilter.GaussianBlur(28))
            image = Image.alpha_composite(image.convert("RGBA"), glow)
            draw = ImageDraw.Draw(image, "RGBA")
            draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), fill=(199, 115, 73, 235), outline=(255, 213, 155, 200), width=4)
            draw.arc((cx-radius*2, cy-radius//2, cx+radius*2, cy+radius), 190, 350, fill=(191, 204, 255, 190), width=7)
            draw.arc((cx-radius*2, cy-radius//2, cx+radius*2, cy+radius), 10, 170, fill=(191, 204, 255, 130), width=5)
            for _ in range(110):
                x, y = rng.randrange(width), rng.randrange(height)
                r = rng.choice((1, 1, 2, 3))
                draw.ellipse((x-r, y-r, x+r, y+r), fill=(225, 231, 255, rng.randint(80, 220)))
        # Visible label prevents the artwork being mistaken for a photograph.
        label = "ILLUSTRATION  /  NOT A PHOTOGRAPH"
        label_font = ImageFont.load_default(size=24)
        label_box = draw.textbbox((0, 0), label, font=label_font)
        label_width = (label_box[2] - label_box[0]) + 42
        draw.rounded_rectangle((24, height-82, 24+label_width, height-24), radius=16,
                               fill=(3, 8, 16, 205), outline=(230, 235, 245, 105), width=2)
        draw.text((44, height-69), label, font=label_font, fill=(245, 246, 250, 245), stroke_width=0)
        output = image.convert("RGB")
        digest_material = f"{ENGINE_VERSION}|{view_id}|{story_id}|{width}|{height}".encode()
        digest = hashlib.sha256(digest_material).hexdigest()
        target = self.staging_dir / f"illustration-{digest}.jpg"
        output.save(target, "JPEG", quality=88, optimize=True, progressive=True)
        creator = ENGINE_NAME
        caption = (
            "Original thematic digital illustration created locally for the "
            f"{view_id.replace('-', ' ')} view. It is not a literal depiction of the linked report, "
            "and is not a documentary photograph or data-accurate scientific visualization."
        )
        result = {
            "engine": ENGINE_NAME, "engineVersion": ENGINE_VERSION,
            "originType": "local-original-illustration", "viewId": view_id,
            "storyId": story_id, "articleUrl": article_url,
            "url": published_base_url + urllib.parse.quote(target.name),
            "imageUrl": published_base_url + urllib.parse.quote(target.name),
            "sourcePage": GENERATOR_SOURCE_PAGE, "sourceMediaUrl": "",
            "creator": creator, "credit": "LIVE // EARTH Global Image Engine (original illustration)",
            "caption": caption, "licenseName": "Original LIVE // EARTH artwork",
            "licenseUrl": "", "rightsNotice": "Original procedural illustration generated locally; no third-party image asset was used.",
            "modificationNote": "Created from procedural drawing primitives by the local LIVE // EARTH Image Engine; not derived from or edited from a source photograph.",
            "kind": "original-illustration", "mime": "image/jpeg",
            "stagedPath": str(target), "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            "checkerStatus": "pending", "checkerDecision": None, "approved": False,
        }
        return result

    @staticmethod
    def attach_checker_decision(candidate: dict[str, Any], decision: dict[str, Any]) -> dict[str, Any]:
        """Attach a Global Checker verdict; no decision is generated here."""
        if not isinstance(decision, dict):
            raise ImageEngineError("A structured Global Checker decision is required.")
        if candidate.get("engine") != ENGINE_NAME or not candidate.get("stagedPath"):
            raise ImageEngineError("Candidate is not a staged Image Engine output.")
        expected_view = candidate.get("viewId") or decision.get("viewId")
        expected_story = candidate.get("storyId") or candidate.get("id") or candidate.get("story_id")
        ImageEngine._validate_checker_decision(candidate, decision, expected_view, expected_story)
        if decision.get("verdict") != "GREEN" or decision.get("allowed") is not True:
            result = dict(candidate)
            result.update({"checkerStatus": "held", "checkerDecision": decision, "approved": False})
            return result
        result = dict(candidate)
        result.update({"checkerStatus": "approved-by-global-checker", "checkerDecision": decision, "approved": True})
        return result

    @staticmethod
    def _validate_checker_decision(candidate: dict[str, Any], decision: dict[str, Any],
                                   expected_view: str, expected_story: str) -> None:
        if decision.get("checker") != "LIVE // EARTH Global Content Rights & Provenance Checker":
            raise ImageEngineError("Decision was not issued by the registered Global Checker.")
        if not decision.get("decisionId") or not decision.get("policyId") or not decision.get("policyVersion"):
            raise ImageEngineError("Global Checker decision is missing its audit identifiers.")
        if decision.get("contentKind") != "image":
            raise ImageEngineError("Global Checker decision is not for image content.")
        if decision.get("viewId") != expected_view or decision.get("storyId") != expected_story:
            raise ImageEngineError("Global Checker decision does not match this view and story.")
        evidence = decision.get("evidence")
        if not isinstance(evidence, dict):
            raise ImageEngineError("Global Checker decision has no auditable image evidence.")
        expected_evidence = {
            "articleUrl": candidate.get("articleUrl", ""),
            "imageUrl": candidate.get("url") or candidate.get("imageUrl", ""),
            "sourcePage": candidate.get("sourcePage", ""),
            "creator": candidate.get("creator", ""),
            "credit": candidate.get("credit", ""),
            "caption": candidate.get("caption", ""),
            "licenseName": candidate.get("licenseName", ""),
            "licenseUrl": candidate.get("licenseUrl", ""),
            "modificationNote": candidate.get("modificationNote", ""),
            "rightsNotice": candidate.get("rightsNotice", ""),
        }
        for key, expected in expected_evidence.items():
            if evidence.get(key, "") != expected:
                raise ImageEngineError(f"Global Checker evidence does not match candidate field: {key}.")

    def publish_checker_approved(self, candidate: dict[str, Any], output_dir: str | Path) -> Path:
        """Move a staged image to a publication asset folder after Checker approval."""
        if candidate.get("engine") != ENGINE_NAME or candidate.get("approved") is not True:
            raise ImageEngineError("Image is not approved by the Global Checker; publication is blocked.")
        if candidate.get("checkerStatus") != "approved-by-global-checker":
            raise ImageEngineError("A valid Global Checker approval status is required.")
        ImageEngine._validate_checker_decision(
            candidate, candidate.get("checkerDecision") or {},
            candidate.get("viewId") or "", candidate.get("storyId") or "",
        )
        staged = Path(str(candidate.get("stagedPath", ""))).resolve()
        try:
            staged.relative_to(self.staging_dir)
        except ValueError as exc:
            raise ImageEngineError("Staged image path is outside the Image Engine staging folder.") from exc
        if not staged.is_file():
            raise ImageEngineError("Approved staged image is missing.")
        digest = clean_text(candidate.get("sha256"), 64)
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ImageEngineError("Staged image integrity hash is missing or malformed.")
        staged_hash = hashlib.sha256(staged.read_bytes()).hexdigest()
        if staged_hash != digest:
            raise ImageEngineError("Staged image content changed after Checker review.")
        target_dir = Path(output_dir).resolve()
        target_dir.mkdir(parents=True, exist_ok=True)
        filename = staged.name
        target = target_dir / filename
        if target.exists():
            if hashlib.sha256(target.read_bytes()).hexdigest() != hashlib.sha256(staged.read_bytes()).hexdigest():
                raise ImageEngineError("An asset with the same name exists but has different content.")
            staged.unlink(missing_ok=True)
            return target
        temporary = target.with_suffix(target.suffix + ".pending")
        shutil.copy2(staged, temporary)
        os.replace(temporary, target)
        staged.unlink(missing_ok=True)
        return target


def stage_directory(base_dir: str | Path, run_id: str) -> Path:
    """Create a unique, run-scoped staging directory under a caller-owned base."""
    safe = re.sub(r"[^A-Za-z0-9_-]+", "-", clean_text(run_id, 80)).strip("-") or "run"
    target = Path(base_dir).resolve() / safe
    target.mkdir(parents=True, exist_ok=False)
    return target

#!/usr/bin/env python3
"""Global, view-independent LIVE // EARTH Universal Editorial Engine.

The Publisher supplies a read-only connection and its own profile/command.
The Engine never collects external sources, opens a view database itself, or
writes to a view database. It produces validated, self-contained PDFs/feeds.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
from dataclasses import dataclass
from functools import lru_cache
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageOps
from xml.sax.saxutils import escape
from pypdf import PdfReader

ENGINE_NAME = "Universal Editorial Engine"
ENGINE_VERSION = "1.3.0"
VALID_IMAGE_STATUS = "nasa-guideline-reviewed-exclusion-screened"

# Phone-first portrait page: 420 × 912 pt. A PDF page viewed at fit-to-width
# fills a contemporary phone's portrait width without a two-column spread.
PAGE_W, PAGE_H = 420.0, 912.0
MARGIN_X = 30.0
CONTENT_W = PAGE_W - 2 * MARGIN_X
NAVY = colors.HexColor("#081421")
DEEP = colors.HexColor("#030912")
GOLD = colors.HexColor("#C69A62")
PALE = colors.HexColor("#F1EBDD")
PAPER = colors.HexColor("#F7F3EB")
INK = colors.HexColor("#202A32")
MUTED = colors.HexColor("#69737A")
SLATE = colors.HexColor("#AAB5BD")


class EditorialEngineError(RuntimeError):
    pass


@dataclass(frozen=True)
class EditorialBrief:
    view_id: str
    publisher_id: str
    title: str
    issue_window_hours: int
    window_mode: str
    coverage_start: datetime
    coverage_end: datetime
    window_label: str
    minimum_stories: int
    maximum_stories: int
    custom_request: str
    visual_profile: dict[str, Any]


def utc_iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_timestamp(value: Any) -> datetime | None:
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value), timezone.utc)
        except (ValueError, OverflowError, OSError):
            return None
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    except ValueError:
        return None


def safe_https_url(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        p = urlparse(value.strip())
        return p.scheme == "https" and bool(p.hostname) and not p.username and not p.password
    except ValueError:
        return False


def text(value: Any, limit: int = 3000) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()[:limit]


def _pdf_safe(value: Any) -> str:
    """Keep widely supported WinAnsi punctuation without losing source text."""
    raw = text(value, 12000)
    replacements = {
        "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"',
        "\u2013": "-", "\u2014": "-", "\u2212": "-", "\u00a0": " ",
        "\u2026": "...", "\u2022": "-", "\u00d7": "x", "\u00a9": "(c)",
    }
    for old, new in replacements.items():
        raw = raw.replace(old, new)
    return raw


def _editorial_summary(story: dict[str, Any]) -> str:
    """Remove known page chrome from APOD feed text, preserving its story body.

    The original Publisher summary remains untouched for the live feed. This
    magazine-only copy removes APOD navigation labels and the next-image footer
    that some RSS descriptions include around the actual Explanation section.
    """
    raw = _pdf_safe(story.get("summary", ""))
    source = text(story.get("source_name", ""), 100).lower()
    title = text(story.get("title", ""), 240).lower()
    is_apod = "apod" in source or "apod:" in title or "astronomy picture of the day" in raw[:500].lower()
    if is_apod and "Explanation:" in raw:
        raw = raw.split("Explanation:", 1)[1].strip()
        tail_markers = [r"\bTomorrow['’]s picture:", r"\bDate:\s*"]
        positions = [match.start() for marker in tail_markers
                     if (match := re.search(marker, raw, flags=re.I))]
        if positions:
            raw = raw[:min(positions)].strip()
    return re.sub(r"\s+", " ", raw).strip()


def _apod_image_credit(story: dict[str, Any]) -> str:
    """Preserve the photographer credit embedded in APOD source descriptions."""
    source = text(story.get("source_name", ""), 100).lower()
    title = text(story.get("title", ""), 240).lower()
    if "apod" not in source and "apod:" not in title:
        return ""
    raw = _pdf_safe(story.get("summary", ""))
    match = re.search(
        r"Credit\s*&\s*Copyright:\s*(.+?)(?=\s+Authors\s*&\s*editors:|\s+A service of:|$)",
        raw, flags=re.I,
    )
    return text(match.group(1), 200) if match else ""


def _print_image_credit(story: dict[str, Any]) -> str:
    return text(story.get("editorialImageCredit") or story.get("image_credit") or "Not supplied", 200)


def parse_custom_request(request: str, defaults: dict[str, Any]) -> dict[str, Any]:
    """Interpret existing bounded visual directives; never pretend to write copy."""
    raw = text(request, 1200)
    low = raw.lower()
    plan = {
        "palette": str(defaults.get("palette", "cinematic-dark")),
        "photo_led": bool(defaults.get("photoLed", True)),
        "include_timeline": bool(defaults.get("includeTimeline", True)),
        "include_explainer": bool(defaults.get("includeExplainer", True)),
        "page_target": int(defaults.get("pageTarget", 9)),
        "tone": str(defaults.get("tone", "cinematic science journalism")),
        "applied": [], "unmapped_request": [], "original_request": raw,
    }
    if re.search(r"\b(cinematic|dramatic|immersive|dark)\b", low):
        plan["palette"] = "cinematic-dark"
        plan["applied"].append("cinematic dark art direction")
    if re.search(r"\b(minimal|minimalist|clean|light editorial)\b", low):
        plan["palette"] = "minimal-light"
        plan["applied"].append("minimal light editorial palette")
    if re.search(r"\b(image-led|photo-led|large images|more images)\b", low):
        plan["photo_led"] = True
        plan["applied"].append("image-led composition using only Publisher-screened local assets")
    if re.search(r"\b(text-led|no images|without images)\b", low):
        plan["photo_led"] = False
        plan["applied"].append("text-led composition")
    if re.search(r"\btimeline\b", low):
        plan["include_timeline"] = True
        plan["applied"].append("chronological timeline")
    if re.search(r"\b(no timeline|without timeline|omit timeline)\b", low):
        plan["include_timeline"] = False
        plan["applied"].append("timeline omitted")
    if re.search(r"\b(explainer|how it works)\b", low):
        plan["include_explainer"] = True
        plan["applied"].append("editorial context page")
    if re.search(r"\b(no explainer|without explainer|omit explainer)\b", low):
        plan["include_explainer"] = False
        plan["applied"].append("editorial context page omitted")
    page_match = re.search(r"\b(\d{1,2})\s*[- ]?pages?\b", low)
    if page_match:
        requested = max(6, min(18, int(page_match.group(1))))
        plan["page_target"] = requested
        plan["applied"].append(f"nominal page target: {requested} pages; complete stories take priority")

    structural_rules = [
        (r"\b(dramatic cover|cover page|cover)\b", "traditional magazine cover"),
        (r"\b(story hierarchy|clear hierarchy|clear story hierarchy|clear story order)\b", "editorial story hierarchy"),
        (r"\b(source notes|source page|sources and credits|citations)\b", "printed source and image-credit pages"),
        (r"\b(strong closing page|closing page|closing section)\b", "closing page"),
        (r"\b(visible credits|image credits|credits and usage notes)\b", "visible image credits and usage notes"),
        (r"\b(screened images|publisher exclusion screen|rights-screened images|publisher-screened nasa imagery)\b", "Publisher image-screening policy"),
    ]
    for pattern, label in structural_rules:
        if re.search(pattern, low):
            plan["applied"].append(label)

    # The Publisher owns image discovery and rights screening. The Engine only
    # consumes the approved local assets it receives, so that ownership rule is
    # understood without falsely attributing collection work to the Engine.
    if re.search(r"\b(automatically screened|screened nasa source|originating factual stories)\b", low):
        plan["applied"].append("Publisher-supplied source imagery and attribution policy")

    residual = low
    cleanup_patterns = [
        r"\b(cinematic|dramatic|immersive|dark|minimal|minimalist|clean|light editorial)\b",
        r"\b(image-led|photo-led|large images|more images|text-led|no images|without images)\b",
        r"\b(no timeline|without timeline|omit timeline|timeline)\b",
        r"\b(no explainer|without explainer|omit explainer|explainer|how it works)\b",
        r"\b\d{1,2}\s*[- ]?pages?\b",
        r"\b(dramatic cover|cover page|cover|story hierarchy|clear hierarchy|clear story hierarchy|clear story order)\b",
        r"\b(source notes|source page|sources and credits|citations|strong closing page|closing page|closing section)\b",
        r"\b(visible credits|image credits|credits and usage notes|usage notes)\b",
        r"\b(automatically screened|screened nasa source|originating factual stories|publisher exclusion screen|rights-screened images|publisher-screened nasa imagery)\b",
        r"\b(nasa-hosted imagery|nasa imagery|source-post imagery|space journal|editorial structure|magazine structure|edition|editorial|nasa)\b",
        r"\b(please|create|make|use|include|keep|retain|omit|exclude|only|when|it|passes|the|a|an|and|or|with|for|of|to|from|into|on|in|by|as|at|this|that|our|your|my|one|page|pages|beside|its|and|image)\b",
    ]
    for pattern in cleanup_patterns:
        residual = re.sub(pattern, " ", residual, flags=re.I)
    residual_words = [word for word in re.sub(r"[^a-z0-9]+", " ", residual).split() if len(word)>2]
    if residual_words:
        plan["unmapped_request"].append("Unmapped direction: " + " ".join(residual_words)[:220])

    plan["applied"].extend([
        "phone-first single-column portrait composition",
        "book-like fixed-layout PDF with printed page numbers",
        "complete editorial story body preserved; known APOD page chrome excluded; overflow continues onto another page",
        "no embedded clickable navigation; saved PDF is self-contained",
    ])
    return plan


def build_brief(profile: dict[str, Any], command: dict[str, Any], now: datetime | None = None) -> EditorialBrief:
    view_id = text(command.get("viewId"), 80)
    publisher_id = text(command.get("publisherId"), 100)
    if not view_id or view_id != text(profile.get("viewId"), 80):
        raise EditorialEngineError("Publisher command viewId does not match the supplied Publisher profile.")
    if not publisher_id or publisher_id != text(profile.get("publisherId"), 100):
        raise EditorialEngineError("Publisher command publisherId does not match the supplied Publisher profile.")
    now = now or datetime.now(timezone.utc)
    now = now.replace(tzinfo=timezone.utc) if now.tzinfo is None else now.astimezone(timezone.utc)
    publication = profile.get("publication", {})
    window_mode = text(publication.get("windowMode", "rolling-hours"), 40).lower()
    if window_mode == "calendar-month":
        coverage_end = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_month_day = coverage_end - timedelta(days=1)
        coverage_start = previous_month_day.replace(day=1)
        window_hours = int((coverage_end - coverage_start).total_seconds() // 3600)
        window_label = coverage_start.strftime("%B %Y")
    elif window_mode == "rolling-hours":
        window_hours = int(publication.get("issueWindowHours", 48))
        if not 1 <= window_hours <= 768:
            raise EditorialEngineError("Rolling Publisher issue window must be between 1 and 768 hours (32 days).")
        coverage_end = now
        coverage_start = now - timedelta(hours=window_hours)
        window_label = f"the previous {window_hours} hours"
    else:
        raise EditorialEngineError("Publisher windowMode must be rolling-hours or calendar-month.")
    editorial = profile.get("editorialProfile", {})
    custom = text(command.get("customRequest") or editorial.get("defaultCustomRequest", ""), 1200)
    return EditorialBrief(
        view_id=view_id, publisher_id=publisher_id,
        title=text(editorial.get("publicationTitle", "The Journal"), 160),
        issue_window_hours=window_hours, window_mode=window_mode,
        coverage_start=coverage_start, coverage_end=coverage_end, window_label=window_label,
        minimum_stories=max(0, int(publication.get("minimumStories", 5))),
        maximum_stories=(
            0 if int(publication.get("maximumStories", 8) or 0) == 0
            else max(2, min(12, int(publication.get("maximumStories", 8))))
        ),
        custom_request=custom, visual_profile=dict(editorial.get("visualProfile", {})),
    )


def read_view_records(readonly_db: Any, brief: EditorialBrief, now: datetime) -> list[dict[str, Any]]:
    """Read only from the Publisher-provided database handle."""
    try:
        readonly_db.execute("PRAGMA query_only = ON")
        meta = readonly_db.execute("SELECT value FROM publisher_meta WHERE key='view_id'").fetchone()
        if not meta or text(meta[0]) != brief.view_id:
            raise EditorialEngineError("The database handle is not scoped to the requested view.")
        start_ts = brief.coverage_start.timestamp()
        end_ts = brief.coverage_end.timestamp() if brief.window_mode == "calendar-month" else (now + timedelta(hours=2)).timestamp()
        rows = readonly_db.execute(
            """SELECT story_id, title, url, summary, source_name, source_url,
                      published_at, retrieved_at, image_url, image_local_path,
                      image_caption, image_credit, image_source_url, image_rights_status,
                      image_rights_note
               FROM stories WHERE published_at >= ? AND published_at < ?
               ORDER BY published_at DESC""",
            (start_ts, end_ts),
        ).fetchall()
    except EditorialEngineError:
        raise
    except Exception as exc:
        raise EditorialEngineError(f"Could not read the Publisher database: {exc}") from exc

    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in rows:
        item = dict(row)
        url = text(item.get("url"), 700)
        title = text(item.get("title"), 240)
        dt = parse_timestamp(item.get("published_at"))
        if not title or not safe_https_url(url) or not dt or url in seen:
            continue
        seen.add(url)
        item["publishedAt"] = utc_iso(dt)
        item["publishedDate"] = dt.strftime("%d %b %Y")
        item["summary"] = text(item.get("summary"), 12000)
        item["editorialSummary"] = _editorial_summary(item)
        item["editorialImageCredit"] = _apod_image_credit(item) or text(item.get("image_credit"), 200)
        item["id"] = text(item.get("story_id"), 64)
        rights_ok = (
            item.get("image_rights_status") == VALID_IMAGE_STATUS
            and safe_https_url(item.get("image_url"))
            and safe_https_url(item.get("image_source_url"))
            and bool(text(item.get("image_credit"), 240))
            and bool(text(item.get("image_rights_note"), 500))
            and bool(item.get("image_local_path"))
            and Path(str(item.get("image_local_path"))).is_file()
        )
        if not rights_ok:
            for key in ("image_url", "image_local_path", "image_caption", "image_credit",
                        "image_source_url", "image_rights_status", "image_rights_note"):
                item[key] = None
        records.append(item)
    return records if brief.maximum_stories <= 0 else records[:brief.maximum_stories]


def _paragraph(value: Any, font: str, size: float, leading: float, colour,
               *, alignment=TA_LEFT, space_after: float = 0) -> Paragraph:
    style = ParagraphStyle(
        "live-earth", fontName=font, fontSize=size, leading=leading,
        textColor=colour, alignment=alignment, spaceAfter=space_after,
        splitLongWords=1, allowWidows=0, allowOrphans=0,
        wordWrap="LTR", borderPadding=0,
    )
    return Paragraph(escape(_pdf_safe(value)), style)


def _draw_para(c: canvas.Canvas, para: Paragraph, x: float, top: float,
               width: float, max_height: float) -> tuple[float, str]:
    """Draw a complete paragraph or report overflow; never silently truncate."""
    _, height = para.wrap(width, max_height)
    if height > max_height:
        raise EditorialEngineError("Layout overflow: paragraph must flow to a continuation page.")
    para.drawOn(c, x, top - height)
    return top - height, ""


def _background(c: canvas.Canvas, colour) -> None:
    c.setFillColor(colour)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)


def _starfield(c: canvas.Canvas, seed: str, *, y_start: float = 0,
               y_end: float = PAGE_H) -> None:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    for i in range(105):
        x = (digest[i % len(digest)] * (i + 7) * 17) % int(PAGE_W)
        y = y_start + ((digest[(i * 3) % len(digest)] * (i + 13) * 11) % max(1, int(y_end-y_start)))
        c.setFillColor(colors.Color(.72, .81, .89, alpha=.14 + (i % 5) * .12))
        c.circle(x, y, .35 + (i % 4) * .22, stroke=0, fill=1)
    c.setStrokeColor(colors.Color(.55, .66, .77, alpha=.28))
    c.setLineWidth(.6)
    c.ellipse(PAGE_W*.12, y_start+(y_end-y_start)*.18, PAGE_W*.96,
              y_start+(y_end-y_start)*.78, stroke=1, fill=0)


def _footer(c: canvas.Canvas, page: int, section: str, *, light: bool = False) -> None:
    rule = colors.HexColor("#D6CCBD") if light else colors.HexColor("#344452")
    ink = colors.HexColor("#6A747A") if light else colors.HexColor("#AEBBC5")
    c.setStrokeColor(rule); c.setLineWidth(.5)
    c.line(MARGIN_X, 38, PAGE_W-MARGIN_X, 38)
    c.setFillColor(ink); c.setFont("Helvetica", 7.4)
    c.drawString(MARGIN_X, 23, f"LIVE // EARTH   -   {section.upper()[:26]}")
    c.setFont("Times-Roman", 10)
    c.drawCentredString(PAGE_W/2, 20, str(page))


@lru_cache(maxsize=32)
def _optimised_pdf_image(path_string: str, file_size: int, modified_ns: int) -> bytes:
    """Prepare a cached local image for a lightweight, sharp phone PDF."""
    del file_size, modified_ns  # Included in the cache key to detect changed assets.
    with Image.open(path_string) as source:
        image = ImageOps.exif_transpose(source)
        image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        has_alpha = image.mode in ("RGBA", "LA") or "transparency" in image.info
        if has_alpha:
            image.save(output, format="PNG", optimize=True)
        else:
            image.convert("RGB").save(
                output, format="JPEG", quality=86, optimize=True, progressive=True
            )
        return output.getvalue()


def _draw_image(c: canvas.Canvas, path: Any, x: float, top: float,
                width: float, height: float) -> bool:
    if not path or not Path(str(path)).is_file():
        return False
    try:
        file_path = Path(str(path))
        stat = file_path.stat()
        image_data = _optimised_pdf_image(str(file_path), stat.st_size, stat.st_mtime_ns)
        reader = ImageReader(io.BytesIO(image_data))
        iw, ih = reader.getSize()
        scale = min(width / iw, height / ih)
        draw_w, draw_h = iw * scale, ih * scale
        c.drawImage(reader, x + (width-draw_w)/2, top-draw_h,
                    width=draw_w, height=draw_h, mask="auto")
        return True
    except Exception:
        return False


def _cover_teaser(value: Any) -> str:
    """Use a clean editorial deck for the cover without changing story copy."""
    raw = _pdf_safe(value)
    # APOD feed cards can include page navigation before the actual explanation.
    # Use the source's explicit Explanation section for the cover deck; the full
    # original Publisher text remains untouched on the story page.
    marker = "Explanation:"
    if marker in raw:
        raw = raw.split(marker, 1)[1].strip()
    raw = re.sub(r"\s+", " ", raw).strip()
    if len(raw) <= 250:
        return raw
    excerpt = raw[:250].rsplit(" ", 1)[0].rstrip(" ,;:-")
    if "." in excerpt:
        sentence = excerpt.rsplit(".", 1)[0].strip()
        if len(sentence) >= 100:
            excerpt = sentence + "."
        else:
            excerpt += "..."
    else:
        excerpt += "..."
    return excerpt


def _draw_cover(c: canvas.Canvas, brief: EditorialBrief, stories: list[dict[str, Any]],
                issue_date: datetime) -> None:
    lead = stories[0]
    palette = str(brief.visual_profile.get("palette", "cinematic-dark")).lower()
    light_cover = palette in {"minimal-light", "warm-editorial", "lifestyle-light"}
    nature_cover = palette in {"nature-forest", "forest-editorial"}
    cover_bg = colors.HexColor("#10251D") if nature_cover else (PAPER if light_cover else DEEP)
    cover_ink = colors.HexColor("#F2EBDD") if nature_cover else (INK if light_cover else colors.white)
    cover_muted = colors.HexColor("#C5D0BC") if nature_cover else (MUTED if light_cover else colors.HexColor("#D5DDE3"))
    accent = colors.HexColor("#C8B77A") if nature_cover else (colors.HexColor("#A66F43") if light_cover else GOLD)
    _background(c, cover_bg)
    if not light_cover and not nature_cover:
        _starfield(c, lead.get("title", brief.title), y_start=PAGE_H*.25, y_end=PAGE_H)
    image_path = lead.get("image_local_path")
    if _draw_image(c, image_path, 0, PAGE_H*.70, PAGE_W, PAGE_H*.68):
        c.saveState(); c.setFillAlpha(.52); c.setFillColor(DEEP)
        c.rect(0, 0, PAGE_W, PAGE_H*.43, stroke=0, fill=1); c.restoreState()
    c.setFillColor(accent); c.setFont("Helvetica-Bold", 8.5)
    c.drawString(MARGIN_X, PAGE_H-43, "LIVE // EARTH")
    c.setFillColor(MUTED if light_cover else SLATE); c.setFont("Helvetica", 7)
    c.drawRightString(PAGE_W-MARGIN_X, PAGE_H-43, "AN INDEPENDENT DIGITAL JOURNAL")
    c.setFillColor(cover_ink); c.setFont("Times-Bold", 34)
    masthead = brief.title.upper()
    masthead_style = "Times-Bold" if len(masthead) < 22 else "Helvetica-Bold"
    masthead_size = 28 if len(masthead) < 22 else 19
    c.setFont(masthead_style, masthead_size)
    c.drawString(MARGIN_X, PAGE_H-112, masthead)
    c.setFillColor(accent); c.setFont("Helvetica-Bold", 8)
    strapline = ("WILDLIFE  ·  ECOLOGY  ·  CONSERVATION" if nature_cover else
                "A CONSIDERED GUIDE TO EVERYDAY LIFE" if light_cover else
                "AN INDEPENDENT DIGITAL JOURNAL")
    c.drawString(MARGIN_X+2, PAGE_H-132, strapline)
    c.setStrokeColor(accent); c.setLineWidth(.7)
    c.line(MARGIN_X, PAGE_H-149, PAGE_W-MARGIN_X, PAGE_H-149)
    if not (image_path and Path(str(image_path)).is_file()):
        # Category-neutral vector artwork: a botanical-inspired line study for
        # light lifestyle editions, orbital seal for cinematic science editions.
        c.saveState()
        if nature_cover:
            # Original vector field illustration: layered ridgelines, a low sun,
            # and tree silhouettes. No unlicensed or synthetic editorial photos.
            from reportlab.pdfbase.pdfmetrics import stringWidth
            c.setFillColor(colors.HexColor("#D4BE7D")); c.circle(PAGE_W-108, PAGE_H*.585, 42, stroke=0, fill=1)
            for colour, points in [
                ("#355A43", [(0, PAGE_H*.40),(75,PAGE_H*.50),(160,PAGE_H*.43),(250,PAGE_H*.52),(340,PAGE_H*.44),(420,PAGE_H*.49),(420,PAGE_H*.20),(0,PAGE_H*.20)]),
                ("#294737", [(0, PAGE_H*.34),(80,PAGE_H*.40),(170,PAGE_H*.34),(270,PAGE_H*.43),(360,PAGE_H*.35),(420,PAGE_H*.39),(420,PAGE_H*.18),(0,PAGE_H*.18)]),
                ("#1B3529", [(0, PAGE_H*.27),(95,PAGE_H*.33),(180,PAGE_H*.28),(290,PAGE_H*.35),(380,PAGE_H*.28),(420,PAGE_H*.31),(420,PAGE_H*.16),(0,PAGE_H*.16)])]:
                path=c.beginPath(); path.moveTo(*points[0])
                for pt in points[1:]: path.lineTo(*pt)
                path.close(); c.setFillColor(colors.HexColor(colour)); c.drawPath(path,stroke=0,fill=1)
            c.setStrokeColor(colors.HexColor("#8FA078")); c.setLineWidth(1.4)
            for x,base,ht in [(44,.23,70),(75,.24,92),(330,.23,82),(370,.22,110)]:
                y0=PAGE_H*base; y1=y0+ht
                c.line(x,y0,x,y1)
                c.line(x,y1,x-22,y1-30); c.line(x,y1,x+22,y1-30)
                c.line(x,y1-18,x-18,y1-44); c.line(x,y1-18,x+18,y1-44)
        elif light_cover:
            c.setStrokeColor(colors.HexColor("#B98A65")); c.setLineWidth(1.15)
            c.setFillColor(colors.HexColor("#E8DCCB")); c.circle(PAGE_W-100, PAGE_H*.57, 76, stroke=0, fill=1)
            c.setStrokeColor(colors.HexColor("#9D775D")); c.setLineWidth(1.1)
            c.bezier(PAGE_W-152,PAGE_H*.48,PAGE_W-72,PAGE_H*.58,PAGE_W-136,PAGE_H*.68,PAGE_W-84,PAGE_H*.76)
            for x,y,angle in [(PAGE_W-137,PAGE_H*.53,-1),(PAGE_W-105,PAGE_H*.61,1),(PAGE_W-121,PAGE_H*.69,-1),(PAGE_W-91,PAGE_H*.73,1)]:
                c.saveState(); c.translate(x,y); c.rotate(angle*28)
                c.ellipse(-18,-7,18,7,stroke=1,fill=0); c.restoreState()
        else:
            c.setFillColor(colors.HexColor("#10283D")); c.circle(PAGE_W-92, PAGE_H*.57, 78, stroke=0, fill=1)
            c.setStrokeColor(colors.HexColor("#5D7890")); c.setLineWidth(.7)
            c.circle(PAGE_W-92, PAGE_H*.57, 78, stroke=1, fill=0)
            c.setStrokeColor(colors.Color(.77,.61,.39,alpha=.7)); c.setLineWidth(.8)
            c.ellipse(PAGE_W-205, PAGE_H*.57-22, PAGE_W+18, PAGE_H*.57+22, stroke=1, fill=0)
            c.ellipse(PAGE_W-188, PAGE_H*.57-50, PAGE_W+4, PAGE_H*.57+50, stroke=1, fill=0)
            c.setFillColor(GOLD); c.circle(PAGE_W-92, PAGE_H*.57, 2.3, stroke=0, fill=1)
        c.restoreState()
    c.setFillColor(accent); c.setFont("Helvetica-Bold", 7.5)
    if brief.window_mode == "calendar-month":
        edition_label = "THE MONTHLY EDITION  /  "
        edition_date = brief.window_label.upper()
    else:
        edition_label = "THE LIFESTYLE EDITION  /  " if light_cover else "THE 48-HOUR EDITION  /  "
        edition_date = issue_date.strftime("%d %B %Y").upper()
    c.drawString(MARGIN_X, PAGE_H*.395, edition_label + edition_date)
    title = _paragraph(lead.get("title", brief.title), "Times-Bold", 31, 34, cover_ink)
    _, title_h = title.wrap(CONTENT_W, 260)
    if title_h > 260:
        title = _paragraph(lead.get("title", brief.title), "Times-Bold", 26, 29, cover_ink)
        _, title_h = title.wrap(CONTENT_W, 260)
    title.drawOn(c, MARGIN_X, PAGE_H*.375-title_h)
    teaser = _cover_teaser(lead.get("editorialSummary", lead.get("summary", "")))
    teaser_p = _paragraph(teaser, "Helvetica", 11.5, 16, cover_muted)
    _, teaser_h = teaser_p.wrap(CONTENT_W, 105)
    teaser_p.drawOn(c, MARGIN_X, PAGE_H*.205-teaser_h)
    c.setFillColor(accent); c.setFont("Helvetica-Bold", 7)
    c.drawString(MARGIN_X, 52, "A SOURCE-LINKED EDITION")
    c.setFillColor(MUTED if light_cover else SLATE); c.setFont("Helvetica", 7)
    c.drawRightString(PAGE_W-MARGIN_X, 52, "READ OFFLINE  /  KEEP EXPLORING")
    c.showPage()


def _draw_contents(c: canvas.Canvas, stories: list[dict[str, Any]],
                   story_pages: list[tuple[int, int]], section_pages: dict[str, int],
                   total_pages: int, issue_date: datetime) -> None:
    _background(c, PAPER)
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN_X, PAGE_H-56, "THE EDITION")
    heading = _paragraph("Inside this issue", "Times-Bold", 31, 35, INK)
    _, heading_h = heading.wrap(CONTENT_W, 60)
    heading.drawOn(c, MARGIN_X, PAGE_H-104)
    intro = _paragraph(
        f"A considered selection of source-linked reports from {issue_date.strftime('%d %B %Y')}. "
        "Stories retain their original reporting context and source details.",
        "Helvetica", 10.5, 15.5, MUTED)
    _, ih = intro.wrap(CONTENT_W, 75)
    intro.drawOn(c, MARGIN_X, PAGE_H-126-ih)
    y = PAGE_H-232
    c.setStrokeColor(colors.HexColor("#D6CCBD")); c.setLineWidth(.65)
    seen_toc_entries: set[tuple[int, str]] = set()
    for idx, story in enumerate(stories):
        start_page, _end_page = story_pages[idx]
        title_key = re.sub(r"[^a-z0-9]+", "", text(story.get("title", "")).lower())
        entry_key = (start_page, title_key)
        if entry_key in seen_toc_entries:
            continue
        seen_toc_entries.add(entry_key)
        duplicate_count = sum(
            1 for other_index, other in enumerate(stories)
            if story_pages[other_index][0] == start_page
            and re.sub(r"[^a-z0-9]+", "", text(other.get("title", "")).lower()) == title_key
        )
        display_title = text(story.get("title", "Untitled report"), 240)
        if duplicate_count > 1:
            display_title += "  (two source reports)"
        title = _paragraph(display_title, "Times-Bold", 12.3, 15, INK)
        _, th = title.wrap(CONTENT_W-52, 44)
        row_h = max(48, th+17)
        if y-row_h < 74:
            # A contents overflow is a publication error, never cropped.
            raise EditorialEngineError("Contents page overflow; reduce issue size or add a contents continuation.")
        c.line(MARGIN_X, y, PAGE_W-MARGIN_X, y)
        title.drawOn(c, MARGIN_X+2, y-11-th)
        c.setFillColor(GOLD); c.setFont("Times-Roman", 12)
        c.drawRightString(PAGE_W-MARGIN_X-2, y-25, f"{start_page:02d}")
        y -= row_h
    for label, section_page in section_pages.items():
        if y-29 < 132:
            raise EditorialEngineError("Contents page overflow; a contents continuation is required.")
        c.line(MARGIN_X, y, PAGE_W-MARGIN_X, y)
        c.setFillColor(MUTED); c.setFont("Helvetica-Bold", 7.3)
        c.drawString(MARGIN_X+2, y-19, label.upper())
        c.setFillColor(GOLD); c.setFont("Times-Roman", 11)
        c.drawRightString(PAGE_W-MARGIN_X-2, y-20, f"{section_page:02d}")
        y -= 29
    c.line(MARGIN_X, y, PAGE_W-MARGIN_X, y)
    note = _paragraph("A NOTE FROM THE EDITORS", "Helvetica-Bold", 7.2, 9, GOLD)
    _, note_h = note.wrap(CONTENT_W, 16)
    note.drawOn(c, MARGIN_X, 88)
    note_body = _paragraph(
        "This digital edition is composed as a traditional book: one page at a time, "
        "with a quiet reading rhythm, printed page numbers and source notes. "
        "The production technology stays behind the pages.",
        "Times-Italic", 10.2, 14, MUTED)
    _, nh = note_body.wrap(CONTENT_W, 42)
    note_body.drawOn(c, MARGIN_X, 80-nh)
    _footer(c, 2, "CONTENTS", light=True)
    c.showPage()


def _story_flow(story: dict[str, Any], index: int) -> tuple[float, list[Paragraph]]:
    """Return first-page body start and all untruncated Paragraph fragments."""
    y = PAGE_H-76
    title_size = 25 if index == 0 else 22
    title = _paragraph(story.get("title", "Untitled report"), "Times-Bold",
                       title_size, title_size*1.12, INK)
    _, title_h = title.wrap(CONTENT_W, 170)
    if title_h > 170:
        title = _paragraph(story.get("title", "Untitled report"), "Times-Bold", 20, 23, INK)
        _, title_h = title.wrap(CONTENT_W, 170)
    y -= title_h+18
    image_path = story.get("image_local_path")
    if image_path and Path(str(image_path)).is_file():
        # Image is contained, never cropped or stretched. Use a compact image
        # panel so the first page remains readable on a phone.
        y -= 150+14
        cap = text(story.get("image_caption"), 200)
        credit = _print_image_credit(story)
        if cap or credit:
            cp = _paragraph("  /  ".join(x for x in (cap, credit) if x),
                            "Helvetica", 7.2, 9.5, MUTED)
            _, ch = cp.wrap(CONTENT_W, 34)
            y -= ch+12
    y -= 20 + 18  # editorial rule and date line
    available = max(80, y-64)
    body = _paragraph(story.get("editorialSummary", story.get("summary", "")), "Helvetica", 12.2, 17.5, INK)

    # ReportLab may return a remainder Paragraph that still exceeds a full
    # continuation page. Repeatedly split each remainder until every fragment
    # fits its actual frame. This is a lossless pagination loop, not truncation.
    fragments: list[Paragraph] = []
    pending: list[tuple[Paragraph, float]] = [(body, available)]
    continuation_height = PAGE_H - 116 - 64
    split_count = 0
    while pending:
        current, frame_height = pending.pop(0)
        _, measured = current.wrap(CONTENT_W, frame_height)
        if measured <= frame_height:
            fragments.append(current)
            continue
        pieces = current.split(CONTENT_W, frame_height)
        if len(pieces) < 2:
            raise EditorialEngineError("A source paragraph cannot be split without losing text.")
        first_piece, *remainder = pieces
        _, first_height = first_piece.wrap(CONTENT_W, frame_height)
        if first_height > frame_height:
            raise EditorialEngineError("A split paragraph fragment exceeds its page frame.")
        fragments.append(first_piece)
        pending = [(piece, continuation_height) for piece in remainder] + pending
        split_count += 1
        if split_count > 1000 or len(fragments) + len(pending) > 1000:
            raise EditorialEngineError("Story pagination exceeded its safety limit.")
    if not fragments:
        fragments = [body]
    return y, fragments


def _draw_story_page(c: canvas.Canvas, story: dict[str, Any], index: int,
                     page_number: int) -> int:
    light = index % 2 == 0
    bg = PAPER if light else colors.HexColor("#FBF8F2")
    _background(c, bg)
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 7.3)
    label = "LEAD FEATURE" if index == 0 else "FIELD REPORT"
    c.drawString(MARGIN_X, PAGE_H-48,
                 f"{label}   /   {text(story.get('source_name','SOURCE REPORT'),50).upper()}")
    y, parts = _story_flow(story, index)
    # Reconstruct the same first-page title/image layout used during preflight.
    y_title = PAGE_H-76
    title_size = 25 if index == 0 else 22
    title = _paragraph(story.get("title", "Untitled report"), "Times-Bold",
                       title_size, title_size*1.12, INK)
    _, th = title.wrap(CONTENT_W, 170)
    if th > 170:
        title = _paragraph(story.get("title", "Untitled report"), "Times-Bold", 20, 23, INK)
        _, th = title.wrap(CONTENT_W, 170)
    title.drawOn(c, MARGIN_X, y_title-th)
    cursor = y_title-th-18
    image_path = story.get("image_local_path")
    if image_path and Path(str(image_path)).is_file():
        if _draw_image(c, image_path, MARGIN_X, cursor, CONTENT_W, 150):
            cursor -= 164
            caption = text(story.get("image_caption"), 200)
            credit = _print_image_credit(story)
            if caption or credit:
                cap = _paragraph("  /  ".join(x for x in (caption, credit) if x),
                                 "Helvetica", 7.2, 9.5, MUTED)
                _, ch = cap.wrap(CONTENT_W, 34)
                cap.drawOn(c, MARGIN_X, cursor-ch)
                cursor -= ch+12
    c.setStrokeColor(GOLD); c.setLineWidth(.7)
    c.line(MARGIN_X, cursor, MARGIN_X+38, cursor)
    cursor -= 20
    c.setFillColor(MUTED); c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN_X, cursor, text(story.get("publishedDate"),40).upper())
    cursor -= 18
    first = parts[0]
    _, first_h = first.wrap(CONTENT_W, max(80, cursor-64))
    if first_h > cursor-64:
        raise EditorialEngineError("First story page would clip text; safe pagination failed.")
    first.drawOn(c, MARGIN_X, cursor-first_h)
    _footer(c, page_number, "FEATURE" if index == 0 else "REPORT", light=True)
    c.showPage()
    page_number += 1

    # Every remainder fragment receives a continuation page. Nothing is
    # discarded or replaced with an ellipsis when a frame is too short.
    for fragment in parts[1:]:
        _background(c, bg)
        c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 7.3)
        c.drawString(MARGIN_X, PAGE_H-48,
                     f"CONTINUED   /   {text(story.get('source_name','SOURCE REPORT'),50).upper()}")
        continued = _paragraph(story.get("title", "Untitled report"), "Times-Italic", 15, 18, MUTED)
        _, continued_h = continued.wrap(CONTENT_W, 26)
        continued.drawOn(c, MARGIN_X, PAGE_H-82)
        top = PAGE_H-116
        _, h = fragment.wrap(CONTENT_W, top-64)
        if h > top-64:
            raise EditorialEngineError("A story continuation would clip text; safe pagination failed.")
        fragment.drawOn(c, MARGIN_X, top-h)
        _footer(c, page_number, "CONTINUED", light=True)
        c.showPage()
        page_number += 1
    return page_number


def _draw_timeline(c: canvas.Canvas, stories: list[dict[str, Any]], page_number: int) -> None:
    _background(c, PAPER)
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 7.8)
    c.drawString(MARGIN_X, PAGE_H-56, "THE CHRONOLOGY")
    title = _paragraph("Signals across the window", "Times-Bold", 27, 31, INK)
    _, title_h = title.wrap(CONTENT_W, 70)
    title.drawOn(c, MARGIN_X, PAGE_H-102)
    top = PAGE_H-158
    x = MARGIN_X+7
    c.setStrokeColor(colors.HexColor("#B98D59")); c.setLineWidth(1.4)
    c.line(x, top, x, 112)
    row_gap = min(76, (top-126)/max(1,len(stories)))
    for i, story in enumerate(stories):
        y = top-i*row_gap
        c.setFillColor(GOLD); c.circle(x, y, 3.2, stroke=0, fill=1)
        c.setFillColor(MUTED); c.setFont("Helvetica-Bold", 7)
        c.drawString(x+17, y-2, text(story.get("publishedDate"), 28).upper())
        p = _paragraph(story.get("title"), "Times-Bold", 10.5, 13, INK)
        _, h = p.wrap(CONTENT_W-38, row_gap-14)
        p.drawOn(c, x+17, y-10-h)
    _footer(c, page_number, "CHRONOLOGY", light=True)
    c.showPage()


def _draw_context(c: canvas.Canvas, brief: EditorialBrief, stories: list[dict[str, Any]],
                  page_number: int) -> None:
    light = str(brief.visual_profile.get("palette", "cinematic-dark")).lower() in {"minimal-light", "warm-editorial", "lifestyle-light", "nature-forest", "forest-editorial"}
    _background(c, PAPER if light else NAVY)
    if not light:
        _starfield(c, brief.title+" context", y_start=PAGE_H*.44, y_end=PAGE_H)
    c.setFillColor(colors.HexColor("#A66F43") if light else GOLD); c.setFont("Helvetica-Bold", 7.8)
    c.drawString(MARGIN_X, PAGE_H-58, "A NOTE ON THIS EDITION")
    title = _paragraph("A considered collection" if light else "The reporting window", "Times-Bold", 30, 34, INK if light else PALE)
    _, title_h = title.wrap(CONTENT_W, 80)
    title.drawOn(c, MARGIN_X, PAGE_H-110)
    count_label = f"{len(stories)} stories  /  {brief.window_label}"
    count_p = _paragraph(count_label,
                         "Helvetica-Bold", 10.5, 14, colors.HexColor("#A66F43") if light else GOLD)
    _, count_h = count_p.wrap(CONTENT_W, 24)
    count_p.drawOn(c, MARGIN_X, PAGE_H-151)
    body_text = (
        ("This edition brings together selected ideas from the Publisher's approved records. "
         "Each story remains attributed to its originating source. The editorial layout "
         "organises the material for a calm, uninterrupted reading experience; it does "
         "not replace the original reporting or add unverified claims. Source details and "
         "credits are retained in the printed reference pages.") if light else
        ("This issue brings together reports from the Publisher's approved source records. "
         "Each story remains attributed to its originating source. The editorial layout "
         "organises the material for a calm, uninterrupted reading experience; it does "
         "not replace the original reporting or add unverified claims. Image credits and "
         "usage notes are retained with the relevant material and in the printed source pages.")
    )
    body = _paragraph(body_text, "Times-Roman", 13, 19, INK if light else PALE)
    _, h = body.wrap(CONTENT_W, 310)
    body.drawOn(c, MARGIN_X, PAGE_H-204-h)
    if stories:
        c.setStrokeColor(colors.HexColor("#A66F43") if light else GOLD); c.setLineWidth(.7)
        c.line(MARGIN_X, 245, MARGIN_X+48, 245)
        quote = ("Living systems thrive through connection, care and time."
                 if str(brief.visual_profile.get("palette", "")).lower() in {"nature-forest", "forest-editorial"}
                 else "A good life is built from small things, noticed and cared for." if light
                 else "The universe is not short of stories. The task is to give each one the room it deserves.")
        q = _paragraph(quote,
                       "Times-Italic", 16, 21, colors.HexColor("#8A684D") if light else colors.HexColor("#E4D3B8"))
        _, qh = q.wrap(CONTENT_W, 115)
        q.drawOn(c, MARGIN_X, 224-qh)
    _footer(c, page_number, "EDITORIAL NOTE")
    c.showPage()


def _draw_sources(c: canvas.Canvas, stories: list[dict[str, Any]], page_number: int) -> int:
    # Traditional printed bibliography style. URLs are visible text only:
    # no Link annotations, embedded actions, or online dependency.
    _background(c, PAPER)
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 7.8)
    c.drawString(MARGIN_X, PAGE_H-55, "PROVENANCE")
    title = _paragraph("Sources & image credits", "Times-Bold", 27, 31, INK)
    _, title_h = title.wrap(CONTENT_W, 70)
    title.drawOn(c, MARGIN_X, PAGE_H-102)
    y = PAGE_H-142
    page = page_number
    for i, story in enumerate(stories, 1):
        name = _paragraph(f"{i:02d}  /  {story.get('source_name','Original source')}",
                          "Helvetica-Bold", 7.5, 9.5, GOLD)
        _, nh = name.wrap(CONTENT_W, 22)
        title_p = _paragraph(story.get("title"), "Times-Bold", 10.2, 12.5, INK)
        _, th = title_p.wrap(CONTENT_W, 42)
        url = _paragraph(story.get("url"), "Helvetica", 6.8, 9, MUTED)
        _, uh = url.wrap(CONTENT_W, 34)
        credit_text = _print_image_credit(story)
        credit = _paragraph(("IMAGE CREDIT: "+credit_text) if credit_text else "IMAGE CREDIT: Not supplied",
                            "Helvetica", 7, 9, MUTED)
        _, ch = credit.wrap(CONTENT_W, 20)
        block_h = nh+th+uh+ch+19
        if y-block_h < 64:
            _footer(c, page, "SOURCES", light=True); c.showPage(); page += 1
            _background(c, PAPER)
            c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 7.8)
            c.drawString(MARGIN_X, PAGE_H-55, "PROVENANCE  /  CONTINUED")
            y = PAGE_H-90
        name.drawOn(c, MARGIN_X, y-nh); y -= nh+3
        title_p.drawOn(c, MARGIN_X, y-th); y -= th+2
        url.drawOn(c, MARGIN_X, y-uh); y -= uh+2
        credit.drawOn(c, MARGIN_X, y-ch); y -= ch+10
        c.setStrokeColor(colors.HexColor("#D8CEBF")); c.setLineWidth(.45)
        c.line(MARGIN_X, y, PAGE_W-MARGIN_X, y); y -= 11
    _footer(c, page, "SOURCES", light=True); c.showPage()
    return page+1


def _draw_closing(c: canvas.Canvas, brief: EditorialBrief, page_number: int) -> None:
    light = str(brief.visual_profile.get("palette", "cinematic-dark")).lower() in {"minimal-light", "warm-editorial", "lifestyle-light", "nature-forest", "forest-editorial"}
    _background(c, PAPER if light else DEEP)
    if not light:
        _starfield(c, brief.title+" closing", y_start=0, y_end=PAGE_H)
    accent = colors.HexColor("#A66F43") if light else GOLD
    main_ink = INK if light else colors.white
    muted_ink = MUTED if light else colors.HexColor("#C7D0D8")
    c.setFillColor(accent); c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN_X, PAGE_H*.61, "UNTIL NEXT TIME" if light else "KEEP LOOKING UP")
    heading_text = "Make room for what matters." if light else "The next question is waiting."
    heading = _paragraph(heading_text, "Times-Bold", 31, 36, main_ink)
    _, hh = heading.wrap(CONTENT_W, 180)
    heading.drawOn(c, MARGIN_X, PAGE_H*.57-hh)
    body_text = ("A thoughtful life is not assembled all at once. It grows through attention, care and the small choices we make every day." if light else
                 "A source-linked window on the universe. Follow the reporting, question the evidence and keep exploring.")
    body = _paragraph(body_text, "Times-Italic", 13, 19, muted_ink)
    _, bh = body.wrap(CONTENT_W, 100)
    body.drawOn(c, MARGIN_X, PAGE_H*.36-bh)
    c.setFillColor(accent); c.setFont("Helvetica-Bold", 7.2)
    c.drawString(MARGIN_X, 52, f"LIVE // EARTH  /  {brief.title.upper()}")
    c.showPage()


def _story_groups(stories: list[dict[str, Any]]) -> list[list[int]]:
    """Group adjacent short text-only notices into one calm briefing page."""
    groups: list[list[int]] = []
    i = 0
    while i < len(stories):
        current = stories[i]
        current_len = len(_pdf_safe(current.get("editorialSummary", current.get("summary", ""))))
        current_has_image = bool(current.get("image_local_path") and Path(str(current.get("image_local_path"))).is_file())
        if i+1 < len(stories) and current_len <= 850 and not current_has_image:
            nxt = stories[i+1]
            next_len = len(_pdf_safe(nxt.get("editorialSummary", nxt.get("summary", ""))))
            next_has_image = bool(nxt.get("image_local_path") and Path(str(nxt.get("image_local_path"))).is_file())
            if next_len <= 850 and not next_has_image and current_len+next_len <= 1450:
                groups.append([i, i+1])
                i += 2
                continue
        groups.append([i])
        i += 1
    return groups


def _draw_briefing_page(c: canvas.Canvas, group: list[dict[str, Any]],
                        indexes: list[int], page_number: int, palette: str = "") -> None:
    _background(c, PAPER)
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 7.5)
    c.drawString(MARGIN_X, PAGE_H-50, "FIELD NOTES  /  SHORT REPORTS")
    heading_text = "Field notes from the month" if str(palette).lower() in {"nature-forest", "forest-editorial"} else "The smaller signals"
    heading = _paragraph(heading_text, "Times-Bold", 27, 31, INK)
    _, hh = heading.wrap(CONTENT_W, 60)
    heading.drawOn(c, MARGIN_X, PAGE_H-94)
    y = PAGE_H-126
    for pos, story in enumerate(group):
        if pos:
            y -= 17
            c.setStrokeColor(colors.HexColor("#D9CFBF")); c.setLineWidth(.55)
            c.line(MARGIN_X, y, PAGE_W-MARGIN_X, y)
            y -= 20
        label = f"{pos+1:02d}  /  {text(story.get('source_name','SOURCE REPORT'),50).upper()}  /  {text(story.get('publishedDate'),32).upper()}"
        c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 6.8)
        c.drawString(MARGIN_X, y, label[:90])
        y -= 16
        title = _paragraph(story.get("title"), "Times-Bold", 18, 21, INK)
        _, th = title.wrap(CONTENT_W, 76)
        if th > y-92:
            raise EditorialEngineError("Grouped briefing title does not fit safely.")
        title.drawOn(c, MARGIN_X, y-th)
        y -= th+10
        body = _paragraph(story.get("editorialSummary", story.get("summary", "")), "Helvetica", 10.8, 14.8, INK)
        _, bh = body.wrap(CONTENT_W, max(70,y-72))
        if bh > y-72:
            raise EditorialEngineError("Grouped briefing text would overflow; stories must receive separate pages.")
        body.drawOn(c, MARGIN_X, y-bh)
        y -= bh
    _footer(c, page_number, "FIELD NOTES", light=True)
    c.showPage()


def build_magazine_pdf(brief: EditorialBrief, stories: list[dict[str, Any]],
                       output_pdf: Path, command: dict[str, Any], now: datetime) -> dict[str, Any]:
    if len(stories) < brief.minimum_stories:
        raise EditorialEngineError(
            f"Only {len(stories)} eligible stories are inside the {brief.issue_window_hours}-hour window; "
            "at least the configured minimum is required. The previous issue is preserved."
        )
    plan = parse_custom_request(brief.custom_request, brief.visual_profile)
    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    temp_pdf = output_pdf.with_suffix(".pending.pdf")

    # Preflight each story's expected page count at phone-first width. The
    # contents page uses printed page numbers, not clickable PDF navigation.
    story_layouts: list[tuple[int, int]] = [(0, 0) for _ in stories]
    groups = _story_groups(stories)
    next_page = 3
    for group_indexes in groups:
        if len(group_indexes) == 2:
            # Validate grouped composition before writing any PDF pages.
            probe = canvas.Canvas(str(output_pdf.with_suffix(".layout-probe.pdf")), pagesize=(PAGE_W, PAGE_H))
            try:
                _draw_briefing_page(probe, [stories[i] for i in group_indexes], group_indexes, next_page, str(brief.visual_profile.get("palette", "")))
            finally:
                probe.save()
                output_pdf.with_suffix(".layout-probe.pdf").unlink(missing_ok=True)
            pages = 1
        else:
            _body_start, fragments = _story_flow(stories[group_indexes[0]], group_indexes[0])
            pages = max(1, len(fragments))
        for story_index in group_indexes:
            story_layouts[story_index] = (next_page, next_page+pages-1)
        next_page += pages

    story_pages_total = next_page-3
    section_pages: dict[str, int] = {}
    section_cursor = next_page
    if plan["include_timeline"]:
        section_pages["Chronology"] = section_cursor
        section_cursor += 1
    if plan["include_explainer"]:
        section_pages["A note on this edition"] = section_cursor
        section_cursor += 1
    section_pages["Sources & image credits"] = section_cursor
    section_cursor += 1
    section_pages["Closing note"] = section_cursor
    section_cursor += 1
    fixed_after_stories = section_cursor-next_page
    total_pages = 2 + story_pages_total + fixed_after_stories
    if total_pages > 48:
        raise EditorialEngineError("Issue exceeds the 48-page safety limit. Previous issue is preserved.")

    c = canvas.Canvas(str(temp_pdf), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    c.setTitle(brief.title)
    c.setAuthor("LIVE // EARTH - Universal Editorial Engine")
    c.setSubject(f"{brief.window_label} source-linked edition; Publisher {brief.publisher_id}")
    c.setKeywords(f"LIVE EARTH, {brief.view_id}, editorial, offline magazine")
    _draw_cover(c, brief, stories, now)
    _draw_contents(c, stories, story_layouts, section_pages, total_pages, now)
    page_number = 3
    for group_indexes in groups:
        if len(group_indexes) == 2:
            _draw_briefing_page(c, [stories[i] for i in group_indexes], group_indexes, page_number, str(brief.visual_profile.get("palette", "")))
            page_number += 1
        else:
            index = group_indexes[0]
            page_number = _draw_story_page(c, stories[index], index, page_number)
    if plan["include_timeline"]:
        _draw_timeline(c, stories, page_number); page_number += 1
    if plan["include_explainer"]:
        _draw_context(c, brief, stories, page_number); page_number += 1
    page_number = _draw_sources(c, stories, page_number)
    _draw_closing(c, brief, page_number)
    c.save()

    try:
        with temp_pdf.open("rb") as stream:
            reader = PdfReader(stream, strict=True)
            actual_pages = len(reader.pages)
            if actual_pages != total_pages:
                raise EditorialEngineError(f"PDF page-count mismatch: expected {total_pages}, got {actual_pages}.")
            if not reader.pages:
                raise EditorialEngineError("Generated PDF contains no pages.")
            # Verify that navigation remains book-like, not web-like.
            for page in reader.pages:
                if page.get("/Annots"):
                    raise EditorialEngineError("Unexpected interactive PDF annotations detected.")
            if reader.trailer["/Root"].get("/Outlines"):
                raise EditorialEngineError("Unexpected PDF bookmarks detected.")
    except Exception:
        temp_pdf.unlink(missing_ok=True)
        raise
    if temp_pdf.stat().st_size < 12_000:
        temp_pdf.unlink(missing_ok=True)
        raise EditorialEngineError("Generated PDF is unexpectedly small; previous issue is preserved.")
    # Extracted text check: every full story summary must survive the PDF build.
    with temp_pdf.open("rb") as stream:
        reader = PdfReader(stream, strict=True)
        extracted = "\n".join(page.extract_text() or "" for page in reader.pages)
    for story in stories:
        source_text = _pdf_safe(story.get("editorialSummary", story.get("summary", "")))
        normalized_source = re.sub(r"\s+", " ", source_text).strip()
        normalized_extracted = re.sub(r"\s+", " ", extracted).strip()
        if normalized_source and normalized_source[:100] not in normalized_extracted:
            temp_pdf.unlink(missing_ok=True)
            raise EditorialEngineError(f"PDF text verification failed for story: {text(story.get('title'),100)}")
    temp_pdf.replace(output_pdf)
    digest = hashlib.sha256(output_pdf.read_bytes()).hexdigest()
    return {
        "title": brief.title, "path": str(output_pdf), "pages": total_pages,
        "bytes": output_pdf.stat().st_size, "sha256": digest,
        "customRequest": brief.custom_request,
        "customRequestReceipt": {
            "applied": plan["applied"], "unmapped": plan["unmapped_request"],
            "palette": plan["palette"], "photoLed": plan["photo_led"],
            "includeTimeline": plan["include_timeline"],
            "includeExplainer": plan["include_explainer"],
            "requestedPageCount": plan["page_target"],
            "actualPageCount": total_pages,
            "pageFormat": "phone-first portrait 420 × 912 pt",
            "readingLayout": "single-column, one-page-at-a-time editorial composition",
            "navigation": "printed contents and page numbers only; no PDF links, annotations or bookmarks",
            "textPolicy": "complete editorial story body preserved; known APOD page chrome is excluded; overflow continues onto additional pages",
            "note": "Page target is a guide; complete stories, legibility, source notes and book-like pacing take priority.",
            "engineLimitation": "This deterministic build arranges Publisher-supplied copy and screened local imagery. It does not rewrite stories or independently corroborate factual claims.",
        },
    }


def build_live_feed(brief: EditorialBrief, stories: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
    return {
        "schemaVersion": 1, "viewId": brief.view_id, "publisherId": brief.publisher_id,
        "generatedAt": utc_iso(now), "windowHours": brief.issue_window_hours,
        "storyCount": len(stories),
        "stories": [{
            "id": s["id"], "title": s["title"], "summary": s.get("summary", ""),
            "url": s["url"], "sourceName": s.get("source_name", "Original source"),
            "sourceUrl": s.get("source_url", ""), "publishedAt": s["publishedAt"],
            "imageUrl": s.get("image_url") if s.get("image_rights_status") == VALID_IMAGE_STATUS else None,
            "imageCredit": s.get("image_credit") if s.get("image_rights_status") == VALID_IMAGE_STATUS else None,
            "imageSourceUrl": s.get("image_source_url") if s.get("image_rights_status") == VALID_IMAGE_STATUS else None,
            "imageRightsNote": s.get("image_rights_note") if s.get("image_rights_status") == VALID_IMAGE_STATUS else None,
        } for s in stories],
    }


def run_engine(readonly_db: Any, profile: dict[str, Any], command: dict[str, Any],
               output_root: Path, now: datetime | None = None) -> dict[str, Any]:
    """Main shared interface. `readonly_db` is supplied by the view Publisher."""
    now = now or datetime.now(timezone.utc)
    now = now.replace(tzinfo=timezone.utc) if now.tzinfo is None else now.astimezone(timezone.utc)
    brief = build_brief(profile, command, now)
    stories = read_view_records(readonly_db, brief, now)
    mode = text(command.get("mode", "all"), 20)
    result: dict[str, Any] = {
        "engine": ENGINE_NAME, "engineVersion": ENGINE_VERSION,
        "viewId": brief.view_id, "publisherId": brief.publisher_id,
        "generatedAt": utc_iso(now),
        "coverageStart": utc_iso(brief.coverage_start),
        "coverageEnd": utc_iso(brief.coverage_end), "windowHours": brief.issue_window_hours,
        "windowMode": brief.window_mode, "windowLabel": brief.window_label,
        "eligibleStoryCount": len(stories),
    }
    if mode in ("live", "all"):
        if not stories:
            raise EditorialEngineError("No eligible stories are available for a live feed; previous output is preserved.")
        result["feed"] = build_live_feed(brief, stories, now)
    if mode in ("magazine", "all"):
        issue_id = (f"{brief.view_id}-{brief.coverage_start.strftime('%Y%m')}"
                    if brief.window_mode == "calendar-month"
                    else f"{brief.view_id}-{now.strftime('%Y%m%d-%H%M')}")
        relative = Path("magazines")/f"{issue_id}.pdf"
        magazine = build_magazine_pdf(brief, stories, output_root/relative, command, now)
        result["magazine"] = {**magazine, "issueId": issue_id, "relativePath": relative.as_posix()}
    if mode not in ("live", "magazine", "all"):
        raise EditorialEngineError(f"Unsupported publishing mode: {mode}")
    return result

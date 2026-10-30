#!/usr/bin/env python3
"""Global, view-independent LIVE // EARTH Universal Editorial Engine.

This module receives a Publisher-owned, read-only SQLite connection plus a
Publisher profile/command. It does not fetch sources, open databases, or write
back to a view database. It produces validated feed/PDF publication artifacts.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import textwrap
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from xml.sax.saxutils import escape
from pypdf import PdfReader

ENGINE_NAME = "Universal Editorial Engine"
ENGINE_VERSION = "1.0.0"
VALID_IMAGE_STATUS = "nasa-guideline-reviewed-exclusion-screened"
PAGE_W, PAGE_H = A4
NAVY = colors.HexColor("#07111D")
DEEP = colors.HexColor("#030810")
GOLD = colors.HexColor("#D7B17A")
PALE = colors.HexColor("#E9E5DC")
INK = colors.HexColor("#1E2832")
MUTED = colors.HexColor("#77838E")


class EditorialEngineError(RuntimeError):
    pass


@dataclass(frozen=True)
class EditorialBrief:
    view_id: str
    publisher_id: str
    title: str
    issue_window_hours: int
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


def parse_custom_request(request: str, defaults: dict[str, Any]) -> dict[str, Any]:
    """Map supported layout directives and report the rest without overclaiming.

    This first release is deterministic. It applies layout/section directives,
    while source selection and image restrictions remain Publisher-owned.
    Arbitrary copy rewriting, voice imitation and investigative verification
    require a future approved editorial-writing provider and are not simulated.
    """
    raw = text(request, 1200)
    low = raw.lower()
    plan = {
        "palette": str(defaults.get("palette", "cinematic-dark")),
        "photo_led": bool(defaults.get("photoLed", True)),
        "include_timeline": bool(defaults.get("includeTimeline", True)),
        "include_explainer": bool(defaults.get("includeExplainer", True)),
        "page_target": int(defaults.get("pageTarget", 9)),
        "tone": str(defaults.get("tone", "cinematic science journalism")),
        "applied": [],
        "unmapped_request": [],
        "original_request": raw,
    }
    if re.search(r"\b(cinematic|dramatic|immersive|dark)\b", low):
        plan["palette"] = "cinematic-dark"
        plan["applied"].append("cinematic dark art direction")
    if re.search(r"\b(minimal|minimalist|clean|light editorial)\b", low):
        plan["palette"] = "minimal-light"
        plan["applied"].append("minimal light editorial palette")
    if re.search(r"\b(image-led|photo-led|large images|more images)\b", low):
        plan["photo_led"] = True
        plan["applied"].append("image-led feature hierarchy (only Publisher-screened images)")
    if re.search(r"\b(text-led|no images|without images)\b", low):
        plan["photo_led"] = False
        plan["applied"].append("text-led layout; no documentary images")
    if re.search(r"\btimeline\b", low):
        plan["include_timeline"] = True
        plan["applied"].append("timeline page")
    if re.search(r"\b(no timeline|without timeline|omit timeline)\b", low):
        plan["include_timeline"] = False
        plan["applied"].append("timeline omitted")
    if re.search(r"\b(explainer|how it works)\b", low):
        plan["include_explainer"] = True
        plan["applied"].append("explainer page")
    if re.search(r"\b(no explainer|without explainer|omit explainer)\b", low):
        plan["include_explainer"] = False
        plan["applied"].append("explainer omitted")
    page_match = re.search(r"\b(\d{1,2})\s*[- ]?pages?\b", low)
    if page_match:
        requested = max(6, min(14, int(page_match.group(1))))
        plan["page_target"] = requested
        plan["applied"].append(f"target length: {requested} pages")

    # These are fixed structure/policy features of this Engine/Publisher pair.
    structural_rules = [
        (r"\b(dramatic cover|cover page|cover)\b", "built-in magazine cover"),
        (r"\b(story hierarchy|clear hierarchy|clear story hierarchy|clear story order)\b", "built-in title and story hierarchy"),
        (r"\b(source notes|source page|sources and credits|citations)\b", "source and image-credit notes"),
        (r"\b(strong closing page|closing page|closing section)\b", "closing page"),
        (r"\b(visible credits|image credits|credits and usage notes)\b", "visible source/image credits"),
        (r"\b(omit unsuitable images|exclude unsuitable images|screened images|publisher exclusion screen|rights-screened images|publisher-screened nasa imagery)\b", "Publisher image-screening policy"),
        (r"\b(usage notes|media usage notes)\b", "image-usage disclosure"),
    ]
    for pattern, label in structural_rules:
        if re.search(pattern, low):
            plan["applied"].append(label)

    # Remove recognised terms and ordinary instruction grammar. Any meaningful
    # remainder is shown in the receipt as unmapped instead of being claimed as done.
    residual = low
    cleanup_patterns = [
        r"\b(cinematic|dramatic|immersive|dark|minimal|minimalist|clean|light editorial)\b",
        r"\b(image-led|photo-led|large images|more images|text-led|no images|without images)\b",
        r"\b(no timeline|without timeline|omit timeline|timeline)\b",
        r"\b(no explainer|without explainer|omit explainer|explainer|how it works)\b",
        r"\b\d{1,2}\s*[- ]?pages?\b",
        r"\b(dramatic cover|cover page|cover|story hierarchy|clear hierarchy|clear story hierarchy|clear story order)\b",
        r"\b(source notes|source page|sources and credits|citations|strong closing page|closing page|closing section)\b",
        r"\b(visible credits|image credits|credits and usage notes)\b",
        r"\b(omit unsuitable images|exclude unsuitable images|screened images|publisher exclusion screen|rights-screened images|publisher-screened nasa imagery)\b",
        r"\b(usage notes|media usage notes)\b",
        r"\b(nasa-hosted imagery|nasa imagery|space journal|editorial structure|magazine structure|edition)\b",
        r"\b(please|create|make|use|include|keep|retain|omit|exclude|only|when|it|passes|the|a|an|and|or|with|for|of|to|from|into|on|in|by|as|at|this|that|our|your|my|one|page|pages)\b",
    ]
    for pattern in cleanup_patterns:
        residual = re.sub(pattern, " ", residual, flags=re.I)
    residual = re.sub(r"[^a-z0-9]+", " ", residual)
    residual_words = [word for word in residual.split() if len(word) > 2]
    if residual_words:
        remainder = " ".join(residual_words)[:220]
        plan["unmapped_request"].append(f"Unmapped direction: {remainder}")
    if raw and not plan["applied"] and not plan["unmapped_request"]:
        plan["unmapped_request"].append("The request did not contain a supported layout instruction.")
    return plan


def build_brief(profile: dict[str, Any], command: dict[str, Any]) -> EditorialBrief:
    view_id = text(command.get("viewId"), 80)
    publisher_id = text(command.get("publisherId"), 100)
    expected_view = text(profile.get("viewId"), 80)
    expected_publisher = text(profile.get("publisherId"), 100)
    if not view_id or view_id != expected_view:
        raise EditorialEngineError("Publisher command viewId does not match the supplied Publisher profile.")
    if not publisher_id or publisher_id != expected_publisher:
        raise EditorialEngineError("Publisher command publisherId does not match the supplied Publisher profile.")
    window_hours = int(profile.get("publication", {}).get("issueWindowHours", 48))
    if not 1 <= window_hours <= 168:
        raise EditorialEngineError("Publisher issue window must be between 1 and 168 hours.")
    editorial = profile.get("editorialProfile", {})
    custom = text(command.get("customRequest") or editorial.get("defaultCustomRequest", ""), 1200)
    return EditorialBrief(
        view_id=view_id,
        publisher_id=publisher_id,
        title=text(editorial.get("publicationTitle", "The Journal"), 160),
        issue_window_hours=window_hours,
        minimum_stories=max(2, int(profile.get("publication", {}).get("minimumStories", 5))),
        maximum_stories=max(2, min(12, int(profile.get("publication", {}).get("maximumStories", 8)))),
        custom_request=custom,
        visual_profile=dict(editorial.get("visualProfile", {})),
    )


def read_view_records(readonly_db: Any, brief: EditorialBrief, now: datetime) -> list[dict[str, Any]]:
    """Read directly from the Publisher-provided DB connection; never writes."""
    try:
        readonly_db.execute("PRAGMA query_only = ON")
        meta = readonly_db.execute("SELECT value FROM publisher_meta WHERE key='view_id'").fetchone()
        if not meta or text(meta[0]) != brief.view_id:
            raise EditorialEngineError("The database handle is not scoped to the requested view.")
        cutoff = (now - timedelta(hours=brief.issue_window_hours)).timestamp()
        rows = readonly_db.execute(
            """SELECT story_id, title, url, summary, source_name, source_url,
                      published_at, retrieved_at, image_url, image_local_path,
                      image_caption, image_credit, image_source_url, image_rights_status,
                      image_rights_note
               FROM stories WHERE published_at >= ? AND published_at <= ?
               ORDER BY published_at DESC LIMIT 500""",
            (cutoff, (now + timedelta(hours=2)).timestamp()),
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
        if not title or not safe_https_url(url) or not dt:
            continue
        if url in seen:
            continue
        seen.add(url)
        item["publishedAt"] = utc_iso(dt)
        item["publishedDate"] = dt.strftime("%d %b %Y")
        item["summary"] = text(item.get("summary"), 1900)
        item["id"] = text(item.get("story_id"), 64)
        # Documentary imagery is eligible only when the Publisher has supplied
        # a local asset, NASA image detail URL, credit and the approved screen state.
        rights_ok = (item.get("image_rights_status") == VALID_IMAGE_STATUS
                     and safe_https_url(item.get("image_url"))
                     and safe_https_url(item.get("image_source_url"))
                     and bool(text(item.get("image_credit"), 240))
                     and bool(text(item.get("image_rights_note"), 500))
                     and bool(item.get("image_local_path"))
                     and Path(str(item.get("image_local_path"))).is_file())
        if not rights_ok:
            for key in ("image_url", "image_local_path", "image_caption", "image_credit",
                        "image_source_url", "image_rights_status", "image_rights_note"):
                item[key] = None
        records.append(item)
    return records[:brief.maximum_stories]


def _paragraph(c: canvas.Canvas, value: Any, x: float, top: float, width: float,
               *, size: float = 10, leading: float | None = None, color=PALE,
               bold: bool = False, max_height: float = 300) -> float:
    raw = text(value, 4200)
    if not raw:
        return top
    style = ParagraphStyle(
        "engine", fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=size, leading=leading or size * 1.38, textColor=color,
        alignment=TA_LEFT, spaceAfter=0, splitLongWords=1, allowWidows=0, allowOrphans=0,
    )
    p = Paragraph(escape(raw), style)
    _, h = p.wrap(width, max_height)
    if h > max_height:
        words = raw.split()
        while words and h > max_height:
            words = words[:max(1, int(len(words) * .86))]
            p = Paragraph(escape(" ".join(words).rstrip(" ,.;") + " …"), style)
            _, h = p.wrap(width, max_height)
            if len(words) == 1:
                break
    p.drawOn(c, x, top - h)
    return top - h


def _page_footer(c: canvas.Canvas, page: int, total: int, section: str, light: bool = False) -> None:
    col = colors.HexColor("#A8ADB3") if not light else colors.HexColor("#74808A")
    c.setStrokeColor(colors.HexColor("#2D3946") if not light else colors.HexColor("#D8D3CA"))
    c.setLineWidth(.5)
    c.line(38, 34, PAGE_W - 38, 34)
    c.setFillColor(col)
    c.setFont("Helvetica-Bold", 6.8)
    c.drawString(38, 21, f"LIVE // EARTH  ·  {section.upper()[:46]}")
    c.setFont("Helvetica", 7.5)
    c.drawRightString(PAGE_W - 38, 21, f"{page:02d} / {total:02d}")


def _starfield(c: canvas.Canvas, seed: str) -> None:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    c.setFillColor(DEEP)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    for i in range(110):
        x = (digest[i % len(digest)] * (i + 7) * 17) % int(PAGE_W)
        y = (digest[(i * 3) % len(digest)] * (i + 13) * 11) % int(PAGE_H)
        c.setFillColor(colors.Color(.72, .81, .89, alpha=.2 + (i % 5) * .12))
        c.circle(x, y, .45 + (i % 4) * .28, stroke=0, fill=1)
    c.setStrokeColor(colors.Color(.45, .65, .82, alpha=.25))
    c.setLineWidth(.5)
    c.ellipse(PAGE_W * .15, PAGE_H * .53, PAGE_W * .95, PAGE_H * .89, stroke=1, fill=0)


def _draw_cover(c: canvas.Canvas, brief: EditorialBrief, stories: list[dict[str, Any]],
                plan: dict[str, Any], issue_date: datetime, total: int) -> None:
    lead = stories[0]
    image = lead.get("image_local_path") if plan["photo_led"] else None
    _starfield(c, lead.get("title", brief.title))
    if image and Path(image).is_file():
        try:
            c.drawImage(str(image), 0, PAGE_H * .31, PAGE_W, PAGE_H * .69,
                        preserveAspectRatio=True, anchor="c", mask="auto")
            c.saveState(); c.setFillAlpha(.58); c.setFillColor(DEEP)
            c.rect(0, 0, PAGE_W, PAGE_H * .48, stroke=0, fill=1); c.restoreState()
            label = text(lead.get("image_caption"), 180) or "NASA Image Library"
            credit = text(lead.get("image_credit"), 180) or "NASA"
            c.setFillColor(colors.HexColor("#D8DEE5")); c.setFont("Helvetica", 6.5)
            c.drawString(38, PAGE_H * .315, f"IMAGE: {label}  ·  CREDIT: {credit}")
        except Exception:
            image = None
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 8)
    c.drawString(38, PAGE_H - 38, "LIVE // EARTH     ·     SPACE JOURNAL")
    c.setStrokeColor(GOLD); c.setLineWidth(.8); c.line(38, PAGE_H - 48, PAGE_W - 38, PAGE_H - 48)
    c.setFillColor(colors.HexColor("#C7D4E0")); c.setFont("Helvetica-Bold", 8)
    c.drawString(40, PAGE_H * .285, "THE 48-HOUR EDITION")
    _paragraph(c, lead["title"], 40, PAGE_H * .255, PAGE_W - 80,
               size=31, leading=33, color=colors.white, bold=True, max_height=140)
    _paragraph(c, lead.get("summary", "Open the original source for full reporting."),
               40, PAGE_H * .16, PAGE_W - 82, size=10.5, leading=14,
               color=colors.HexColor("#C5D0D9"), max_height=68)
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 7.5)
    c.drawString(40, 38, issue_date.strftime("%d %B %Y").upper())
    c.setFillColor(colors.HexColor("#A9B5C0")); c.setFont("Helvetica", 7)
    c.drawRightString(PAGE_W - 40, 38, "A SOURCE-LINKED EDITION")
    c.showPage()


def _draw_contents(c: canvas.Canvas, stories: list[dict[str, Any]], total: int) -> None:
    c.setFillColor(PALE); c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#94683F")); c.setFont("Helvetica-Bold", 8)
    c.drawString(42, PAGE_H - 54, "THE EDITION")
    _paragraph(c, "Inside the last 48 hours", 42, PAGE_H - 76, PAGE_W - 84,
               size=28, leading=31, color=INK, bold=True, max_height=72)
    _paragraph(c, "Reports are kept close to their original sources. Dates, credits and links are preserved so every reader can follow the evidence.",
               42, PAGE_H - 121, PAGE_W - 84, size=9.5, leading=14, color=MUTED, max_height=52)
    y = PAGE_H - 205
    for idx, story in enumerate(stories, 1):
        c.setStrokeColor(colors.HexColor("#D2C9BD")); c.setLineWidth(.5); c.line(42, y, PAGE_W - 42, y)
        c.setFillColor(colors.HexColor("#9B7048")); c.setFont("Helvetica-Bold", 8)
        c.drawString(44, y - 18, f"{idx:02d}")
        _paragraph(c, story["title"], 78, y - 7, PAGE_W - 150,
                   size=9.8, leading=12, color=INK, bold=True, max_height=34)
        c.setFillColor(MUTED); c.setFont("Helvetica", 7)
        c.drawRightString(PAGE_W - 44, y - 18, story.get("publishedDate", ""))
        y -= 52
    _page_footer(c, 2, total, "CONTENTS", light=True)
    c.showPage()


def _draw_intro(c: canvas.Canvas, brief: EditorialBrief, stories: list[dict[str, Any]],
                plan: dict[str, Any], total: int) -> None:
    light = plan["palette"] == "minimal-light"
    bg = PALE if light else NAVY
    fg = INK if light else PALE
    accent = colors.HexColor("#94683F") if light else GOLD
    c.setFillColor(bg); c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(accent); c.setFont("Helvetica-Bold", 8)
    c.drawString(42, PAGE_H - 58, "EDITOR'S NOTE")
    _paragraph(c, "A short window on a moving universe", 42, PAGE_H - 82,
               PAGE_W - 84, size=25, leading=28, color=fg, bold=True, max_height=84)
    body = (f"This edition gathers {len(stories)} source-linked reports published within the previous "
            f"{brief.issue_window_hours} hours. The Publisher collected the source records; the Universal Editorial Engine "
            "selected the eligible items, preserved their provenance and arranged them using this edition's brief. "
            "The summaries remain source-led. They do not replace the linked reporting, technical detail or stated limitations.")
    y = _paragraph(c, body, 42, PAGE_H - 180, PAGE_W - 84,
                   size=11, leading=17, color=fg, max_height=190)
    if brief.custom_request:
        c.setFillColor(colors.HexColor("#172A3B") if not light else colors.HexColor("#E1D9CC"))
        c.roundRect(42, y - 126, PAGE_W - 84, 108, 9, stroke=0, fill=1)
        label_color = GOLD if not light else colors.HexColor("#94683F")
        body_color = PALE if not light else INK
        c.setFillColor(label_color); c.setFont("Helvetica-Bold", 7.5)
        c.drawString(56, y - 38, "CUSTOM EDITORIAL REQUEST")
        _paragraph(c, brief.custom_request, 56, y - 53, PAGE_W - 112,
                   size=8.5, leading=12, color=body_color, max_height=66)
    _page_footer(c, 3, total, "EDITOR'S NOTE", light=light)
    c.showPage()


def _draw_story(c: canvas.Canvas, story: dict[str, Any], index: int, total: int,
                plan: dict[str, Any], page_num: int, section: str = "FIELD REPORT") -> None:
    light = plan["palette"] == "minimal-light" or (index % 3 == 0 and not plan["photo_led"])
    bg = PALE if light else NAVY
    fg = INK if light else PALE
    accent = colors.HexColor("#94683F") if light else GOLD
    c.setFillColor(bg); c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(accent); c.setFont("Helvetica-Bold", 7.5)
    c.drawString(42, PAGE_H - 48, f"{section}  ·  {story.get('source_name', 'SOURCE REPORT').upper()[:54]}")
    image = story.get("image_local_path") if plan["photo_led"] else None
    y = PAGE_H - 70
    if image and Path(image).is_file():
        try:
            img_h = PAGE_H * .31 if index > 1 else PAGE_H * .25
            c.drawImage(str(image), 42, y - img_h, PAGE_W - 84, img_h,
                        preserveAspectRatio=True, anchor="c", mask="auto")
            y -= img_h + 18
            caption = text(story.get("image_caption"), 180)
            credit = text(story.get("image_credit"), 160)
            c.setFillColor(MUTED if light else colors.HexColor("#AAB7C3")); c.setFont("Helvetica", 6.5)
            c.drawString(42, y + 4, f"{caption}  ·  {credit}"[:150])
            y -= 10
        except Exception:
            pass
    _paragraph(c, story["title"], 42, y, PAGE_W - 84,
               size=21 if index == 1 else 18, leading=22, color=fg, bold=True, max_height=108)
    y -= 112 if index == 1 else 95
    summary = story.get("summary") or "Open the original source for the full report and its technical context."
    _paragraph(c, summary, 42, y, PAGE_W - 84,
               size=9.6, leading=14.5, color=fg, max_height=PAGE_H * .25)
    y -= PAGE_H * .28
    c.setStrokeColor(accent); c.setLineWidth(.7); c.line(42, y, PAGE_W - 42, y)
    c.setFillColor(accent); c.setFont("Helvetica-Bold", 7)
    c.drawString(42, y - 16, f"PUBLISHED {story.get('publishedDate', 'DATE NOT AVAILABLE').upper()}")
    c.setFillColor(MUTED if light else colors.HexColor("#AAB7C3")); c.setFont("Helvetica", 7)
    c.drawString(42, y - 30, text(story.get("source_name", "Original source"), 110))
    _paragraph(c, story.get("url", ""), 42, y - 43, PAGE_W - 84,
               size=6.5, leading=8, color=colors.HexColor("#6D99B8") if light else colors.HexColor("#9FC4DD"),
               max_height=34)
    _page_footer(c, page_num, total, "FEATURE", light=light)
    c.showPage()


def _draw_briefs(c: canvas.Canvas, stories: list[dict[str, Any]], total: int, page_num: int) -> None:
    c.setFillColor(PALE); c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#94683F")); c.setFont("Helvetica-Bold", 8)
    c.drawString(42, PAGE_H - 55, "THE OTHER SIGNALS")
    _paragraph(c, "In brief", 42, PAGE_H - 78, PAGE_W - 84,
               size=26, leading=29, color=INK, bold=True, max_height=70)
    gap_x, gap_y = 14, 13
    cols = 2
    rows = max(1, math.ceil(len(stories) / cols))
    top = PAGE_H - 145
    available_h = top - 70
    card_h = min(146, (available_h - (rows - 1) * gap_y) / rows)
    card_w = (PAGE_W - 84 - gap_x) / 2
    for i, story in enumerate(stories):
        col, row = i % cols, i // cols
        x = 42 + col * (card_w + gap_x)
        y = top - (row + 1) * card_h - row * gap_y
        c.setFillColor(colors.HexColor("#E9E2D8") if i % 2 == 0 else colors.HexColor("#E1E8E8"))
        c.roundRect(x, y, card_w, card_h, 8, stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#A47C50")); c.rect(x, y + card_h - 3, card_w, 3, stroke=0, fill=1)
        _paragraph(c, story["title"], x + 11, y + card_h - 16, card_w - 22,
                   size=8.6, leading=10.6, color=INK, bold=True, max_height=38)
        _paragraph(c, story.get("summary", ""), x + 11, y + card_h - 58, card_w - 22,
                   size=7.1, leading=9.2, color=MUTED, max_height=max(34, card_h - 66))
        c.setFillColor(colors.HexColor("#94683F")); c.setFont("Helvetica-Bold", 6.3)
        c.drawString(x + 11, y + 9, text(story.get("source_name", "SOURCE"), 52).upper())
    _page_footer(c, page_num, total, "IN BRIEF", light=True)
    c.showPage()


def _draw_timeline(c: canvas.Canvas, stories: list[dict[str, Any]], total: int, page_num: int) -> None:
    c.setFillColor(PALE); c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#94683F")); c.setFont("Helvetica-Bold", 8)
    c.drawString(42, PAGE_H - 55, "TIME WINDOW")
    _paragraph(c, "Signals across the window", 42, PAGE_H - 77, PAGE_W - 84,
               size=26, leading=29, color=INK, bold=True, max_height=70)
    x = 66; top = PAGE_H - 170; bottom = max(95, top - (len(stories) * 57))
    c.setStrokeColor(colors.HexColor("#B28A5E")); c.setLineWidth(2); c.line(x, top, x, bottom)
    for i, s in enumerate(stories[:8]):
        y = top - i * 57
        c.setFillColor(colors.HexColor("#B28A5E")); c.circle(x, y, 4, stroke=0, fill=1)
        c.setFillColor(MUTED); c.setFont("Helvetica-Bold", 7)
        c.drawString(x + 18, y - 1, text(s.get("publishedDate", ""), 32))
        _paragraph(c, s["title"], x + 18, y - 12, PAGE_W - x - 58,
                   size=8.3, leading=10.5, color=INK, bold=True, max_height=31)
    _page_footer(c, page_num, total, "TIMELINE", light=True)
    c.showPage()


def _draw_explainer(c: canvas.Canvas, story: dict[str, Any], total: int, page_num: int) -> None:
    c.setFillColor(NAVY); c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 8)
    c.drawString(42, PAGE_H - 58, "EXPLAINER  ·  SOURCE-LED")
    _paragraph(c, "What the source says", 42, PAGE_H - 82, PAGE_W - 84,
               size=25, leading=28, color=PALE, bold=True, max_height=72)
    _paragraph(c, story["title"], 42, PAGE_H - 150, PAGE_W - 84,
               size=13, leading=16, color=GOLD, bold=True, max_height=64)
    _paragraph(c, story.get("summary", ""), 42, PAGE_H - 235, PAGE_W - 84,
               size=10, leading=15, color=PALE, max_height=220)
    c.setFillColor(colors.HexColor("#152A3C")); c.roundRect(42, 72, PAGE_W - 84, 86, 8, stroke=0, fill=1)
    _paragraph(c, "READ THE ORIGINAL REPORT", 56, 139, PAGE_W - 112,
               size=7.5, leading=10, color=GOLD, bold=True, max_height=18)
    _paragraph(c, story.get("url", ""), 56, 120, PAGE_W - 112,
               size=7, leading=9, color=colors.HexColor("#B5D2E7"), max_height=34)
    _page_footer(c, page_num, total, "EXPLAINER")
    c.showPage()


def _draw_sources(c: canvas.Canvas, stories: list[dict[str, Any]], total: int, page_num: int) -> None:
    c.setFillColor(PALE); c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#94683F")); c.setFont("Helvetica-Bold", 8)
    c.drawString(42, PAGE_H - 55, "PROVENANCE")
    _paragraph(c, "Sources and image credits", 42, PAGE_H - 78, PAGE_W - 84,
               size=25, leading=28, color=INK, bold=True, max_height=70)
    y = PAGE_H - 155
    for i, s in enumerate(stories, 1):
        c.setStrokeColor(colors.HexColor("#D3C9BC")); c.setLineWidth(.5); c.line(42, y, PAGE_W - 42, y)
        c.setFillColor(colors.HexColor("#94683F")); c.setFont("Helvetica-Bold", 7.5)
        c.drawString(44, y - 15, f"{i:02d}")
        _paragraph(c, s["title"], 72, y - 5, PAGE_W - 115,
                   size=8, leading=10, color=INK, bold=True, max_height=24)
        _paragraph(c, s["url"], 72, y - 31, PAGE_W - 115,
                   size=6.3, leading=8, color=colors.HexColor("#426D8A"), max_height=25)
        credit = text(s.get("image_credit"), 170)
        if credit:
            c.setFillColor(MUTED); c.setFont("Helvetica", 6.2)
            c.drawString(72, y - 57, f"IMAGE CREDIT: {credit[:130]}")
        y -= 75
        if y < 74:
            break
    _page_footer(c, page_num, total, "SOURCES", light=True)
    c.showPage()


def _draw_closing(c: canvas.Canvas, brief: EditorialBrief, total: int, page_num: int) -> None:
    _starfield(c, brief.title + " closing")
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 8)
    c.drawString(42, PAGE_H * .61, "KEEP LOOKING UP")
    _paragraph(c, "The next question is waiting.", 42, PAGE_H * .57,
               PAGE_W - 84, size=31, leading=34, color=colors.white, bold=True, max_height=120)
    _paragraph(c, "A source-linked window on the universe. Follow the reports, question the evidence and keep exploring.",
               42, PAGE_H * .36, PAGE_W - 84, size=10.5, leading=15,
               color=colors.HexColor("#CED9E2"), max_height=70)
    c.setFillColor(colors.HexColor("#A8B5C0")); c.setFont("Helvetica", 7)
    c.drawString(42, 37, "LIVE // EARTH  ·  SPACE JOURNAL")
    c.drawRightString(PAGE_W - 42, 37, f"{page_num:02d} / {total:02d}")
    c.showPage()


def build_magazine_pdf(brief: EditorialBrief, stories: list[dict[str, Any]],
                       output_pdf: Path, command: dict[str, Any], now: datetime) -> dict[str, Any]:
    if len(stories) < brief.minimum_stories:
        raise EditorialEngineError(
            f"Only {len(stories)} eligible stories are inside the {brief.issue_window_hours}-hour window; "
            f"at least {brief.minimum_stories} are required. The previous issue is preserved."
        )
    plan = parse_custom_request(brief.custom_request, brief.visual_profile)
    # Preserve at least one full story page inside the requested page count.
    # Core structure is cover, contents, editor's note, one lead feature,
    # source notes and closing. Optional sections are fitted around that core.
    target = max(6, min(14, int(plan["page_target"])))
    section_slots = max(0, target - 6)  # one lead feature is always reserved
    if section_slots <= 0:
        if plan["include_explainer"]:
            plan["include_explainer"] = False
            plan["applied"].append("explainer omitted to preserve the requested page count and a full lead feature")
        if plan["include_timeline"]:
            plan["include_timeline"] = False
            plan["applied"].append("timeline omitted to preserve the requested page count and a full lead feature")
    elif plan["include_explainer"] and plan["include_timeline"] and section_slots == 1:
        plan["include_explainer"] = False
        plan["applied"].append("explainer omitted to preserve the requested page count and timeline")
    fixed_pages = 5 + int(plan["include_timeline"]) + int(plan["include_explainer"])
    feature_pages = max(1, target - fixed_pages)
    feature_pages = min(len(stories), feature_pages, 14 - fixed_pages)
    total = fixed_pages + feature_pages
    plan["actual_page_count"] = total
    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    temp_pdf = output_pdf.with_suffix(".pending.pdf")
    c = canvas.Canvas(str(temp_pdf), pagesize=A4, pageCompression=1)
    c.setTitle(brief.title)
    c.setAuthor("LIVE // EARTH — Universal Editorial Engine")
    c.setSubject(f"{brief.issue_window_hours}-hour source-linked edition; Publisher {brief.publisher_id}")
    c.setKeywords("LIVE EARTH, space, science, editorial, source-linked")
    _draw_cover(c, brief, stories, plan, now, total)
    _draw_contents(c, stories, total)
    _draw_intro(c, brief, stories, plan, total)
    page_num = 4
    for idx, story in enumerate(stories[:feature_pages], 1):
        section = "LEAD FEATURE" if idx == 1 else ("PHOTO ESSAY" if story.get("image_local_path") and plan["photo_led"] else "FIELD NOTES")
        _draw_story(c, story, idx, total, plan, page_num, section)
        page_num += 1
    if plan["include_timeline"]:
        _draw_timeline(c, stories, total, page_num); page_num += 1
    if plan["include_explainer"]:
        _draw_explainer(c, stories[0], total, page_num); page_num += 1
    _draw_sources(c, stories, total, page_num); page_num += 1
    _draw_closing(c, brief, total, page_num)
    c.save()
    with temp_pdf.open("rb") as pdf_stream:
        reader = PdfReader(pdf_stream, strict=True)
        actual_pages = len(reader.pages)
    if actual_pages != total:
        temp_pdf.unlink(missing_ok=True)
        raise EditorialEngineError(f"PDF page-count mismatch: expected {total}, got {actual_pages}.")
    if temp_pdf.stat().st_size < 12_000:
        temp_pdf.unlink(missing_ok=True)
        raise EditorialEngineError("Generated PDF is unexpectedly small; previous issue is preserved.")
    # Atomic replace only after structural checks succeed.
    temp_pdf.replace(output_pdf)
    digest = hashlib.sha256(output_pdf.read_bytes()).hexdigest()
    return {
        "title": brief.title,
        "path": str(output_pdf),
        "pages": total,
        "bytes": output_pdf.stat().st_size,
        "sha256": digest,
        "customRequest": brief.custom_request,
        "customRequestReceipt": {
            "applied": plan["applied"],
            "unmapped": plan["unmapped_request"],
            "palette": plan["palette"],
            "photoLed": plan["photo_led"],
            "includeTimeline": plan["include_timeline"],
            "includeExplainer": plan["include_explainer"],
            "requestedPageCount": plan["page_target"],
            "actualPageCount": total,
            "note": "At least one full lead-feature page, source notes and a closing page are preserved. Optional sections may be omitted when needed to meet the requested page count.",
            "engineLimitation": "This no-AI build applies supported layout/section directives only. It does not rewrite story copy in a requested voice or independently corroborate every factual claim; source provenance comes from the Publisher's official-source policy. Unsupported directions are listed above rather than claimed as applied."
        },
    }


def build_live_feed(brief: EditorialBrief, stories: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "viewId": brief.view_id,
        "publisherId": brief.publisher_id,
        "generatedAt": utc_iso(now),
        "windowHours": brief.issue_window_hours,
        "storyCount": len(stories),
        "stories": [
            {
                "id": s["id"], "title": s["title"], "summary": s.get("summary", ""),
                "url": s["url"], "sourceName": s.get("source_name", "Original source"),
                "sourceUrl": s.get("source_url", ""), "publishedAt": s["publishedAt"],
                "imageUrl": s.get("image_url") if s.get("image_rights_status") == VALID_IMAGE_STATUS else None,
                "imageCredit": s.get("image_credit") if s.get("image_rights_status") == VALID_IMAGE_STATUS else None,
                "imageSourceUrl": s.get("image_source_url") if s.get("image_rights_status") == VALID_IMAGE_STATUS else None,
                "imageRightsNote": s.get("image_rights_note") if s.get("image_rights_status") == VALID_IMAGE_STATUS else None,
            } for s in stories
        ],
    }


def run_engine(readonly_db: Any, profile: dict[str, Any], command: dict[str, Any],
               output_root: Path, now: datetime | None = None) -> dict[str, Any]:
    """Main interface. `readonly_db` is supplied by the view's Publisher."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    else:
        now = now.astimezone(timezone.utc)
    brief = build_brief(profile, command)
    stories = read_view_records(readonly_db, brief, now)
    mode = text(command.get("mode", "all"), 20)
    result: dict[str, Any] = {
        "engine": ENGINE_NAME,
        "engineVersion": ENGINE_VERSION,
        "viewId": brief.view_id,
        "publisherId": brief.publisher_id,
        "generatedAt": utc_iso(now),
        "coverageStart": utc_iso(now - timedelta(hours=brief.issue_window_hours)),
        "coverageEnd": utc_iso(now),
        "windowHours": brief.issue_window_hours,
        "eligibleStoryCount": len(stories),
    }
    if mode in ("live", "all"):
        if not stories:
            raise EditorialEngineError("No eligible stories are available for a live feed; previous output is preserved.")
        feed = build_live_feed(brief, stories, now)
        result["feed"] = feed
    if mode in ("magazine", "all"):
        issue_date = now.strftime("%Y%m%d-%H%M")
        issue_id = f"alien-world-{issue_date}"
        pdf_rel = Path("magazines") / f"{issue_id}.pdf"
        pdf_result = build_magazine_pdf(brief, stories, output_root / pdf_rel, command, now)
        result["magazine"] = {**pdf_result, "issueId": issue_id, "relativePath": pdf_rel.as_posix()}
    if mode not in ("live", "magazine", "all"):
        raise EditorialEngineError(f"Unsupported publishing mode: {mode}")
    return result

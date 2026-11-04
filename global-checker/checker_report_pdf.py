#!/usr/bin/env python3
"""Render the completed 13-section Global Checker report as an audit PDF.

This module is a reporting utility only. It does not fetch, check, approve,
write databases, or publish. Raw source article bodies are deliberately
excluded; the PDF preserves every recorded check outcome, reason and safe
evidence reference from the completed report.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, LongTable, TableStyle,
    KeepTogether, PageBreak,
)

REPORT_NAME = "LIVE // EARTH Final Checker Report"
_ALLOWED_RESULTS = {"PASS", "FAIL", "HOLD", "NOT_APPLICABLE", "UNKNOWN"}
_RAW_KEYS = {
    "text", "fulltext", "fulltexthtml", "fullarticletext", "rawtext",
    "articletext", "articlebody", "rawarticlebody", "body", "bodytext",
    "content", "contenttext", "contenthtml", "contentencoded", "feedsummary",
    "summary", "excerpt", "description", "abstract", "standfirst", "teaser",
}
_SECTION_TITLES = {
    "managerIdCard": "Manager ID Card and View Assignment",
    "fullArticle": "Collected Article and Feed Material",
    "originalImageRecords": "Original Image Records",
    "sourceRightsEvidence": "Source and Rights Evidence",
    "imageUrlCheckerAndFinalImage": "Image URL Checker and Selection",
    "allChecks": "Initial Global Checker Checks",
    "textApprovalChecks": "Text Permission and Approval Checks",
    "imageApprovalChecks": "Image Permission and Approval Checks",
    "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission": "Global Image Engine Review and Submission",
    "finalImageVerificationAndApproval": "Final Image Verification and Approval",
    "postEngineAuditAndFinalDecision": "Post-Engine Audit and Decision",
    "liveFeedOutput": "Global Editorial Engine Output",
    "postEditorialFinalVerification": "Final Checker Verification",
}


def _slug(value: Any) -> str:
    text = re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "")).strip("-._")
    return text[:100] or "unknown"


def _plain(value: Any, limit: int = 1200) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list, tuple)):
        try:
            value = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
        except (TypeError, ValueError):
            value = str(value)
    text = str(value).replace("\x00", "")
    if len(text) > limit:
        text = text[:limit] + " ... [truncated]"
    return text


def _safe_evidence(value: Any, key: str = "", depth: int = 0) -> Any:
    """Remove possible source-body/summary copies from report evidence."""
    if depth > 5:
        return "[nested detail omitted]"
    if isinstance(value, dict):
        cleaned = {}
        for child_key, child in value.items():
            normalized = re.sub(r"[^a-z0-9]", "", str(child_key).casefold())
            if normalized in _RAW_KEYS or normalized in {x.replace("_", "") for x in _RAW_KEYS}:
                continue
            cleaned[str(child_key)] = _safe_evidence(child, str(child_key), depth + 1)
        return cleaned
    if isinstance(value, list):
        return [_safe_evidence(item, key, depth + 1) for item in value[:30]]
    if isinstance(value, str):
        # A free-form field with an article-body label is never reproduced.
        normalized_key = re.sub(r"[^a-z0-9]", "", key.casefold())
        if normalized_key in _RAW_KEYS:
            return "[source text omitted]"
        return value[:500] + (" ... [truncated]" if len(value) > 500 else "")
    return value


def _paragraph(value: Any, style: ParagraphStyle, limit: int = 1200) -> Paragraph:
    return Paragraph(escape(_plain(value, limit)).replace("\n", "<br/>"), style)


def _walk_checks(node: Any, section_label: str, inherited_post_id: str,
                 output: list[dict[str, Any]], path: str = "") -> None:
    if isinstance(node, dict):
        post_id = str(node.get("postId") or inherited_post_id or "REPORT-LEVEL")
        check_id = node.get("checkId")
        result = str(node.get("result") or "").upper()
        if check_id and result in _ALLOWED_RESULTS:
            output.append({
                "section": section_label,
                "postId": post_id,
                "checkId": str(check_id),
                "name": str(node.get("checkName") or node.get("name") or "Unnamed check"),
                "result": result,
                "reason": str(node.get("reason") or node.get("description") or ""),
                "evidenceRef": str(node.get("evidenceRef") or node.get("evidenceReference") or ""),
                "expected": _safe_evidence(node.get("expected")),
                "actual": _safe_evidence(node.get("actual")),
                "evidence": _safe_evidence(node.get("evidence")),
                "mandatory": node.get("mandatory"),
                "path": path,
            })
        for key, child in node.items():
            if key in {"reason", "evidence", "expected", "actual"} and check_id:
                continue
            _walk_checks(child, section_label, post_id, output, f"{path}.{key}" if path else str(key))
    elif isinstance(node, list):
        for index, child in enumerate(node):
            _walk_checks(child, section_label, inherited_post_id, output, f"{path}[{index}]")


def _section_counts(section: Any) -> dict[str, Any]:
    if not isinstance(section, dict):
        return {}
    stats = section.get("statistics")
    return stats if isinstance(stats, dict) else {}


def _section_summary(key: str, section: Any) -> str:
    stats = _section_counts(section)
    if stats:
        return ", ".join(f"{name}: {value}" for name, value in stats.items())
    if not isinstance(section, dict):
        return "No section data recorded"
    if key == "managerIdCard":
        payload = section.get("payload", {})
        if isinstance(payload, dict):
            return (f"View: {payload.get('viewId', 'not recorded')}, "
                    f"assigned feeds: {len(payload.get('feedUrls', []))}, "
                    f"assignments: {len(payload.get('assignmentIds', []))}")
    posts = section.get("posts", [])
    if isinstance(posts, list):
        if key == "fullArticle":
            collected = sum(1 for item in posts if isinstance(item, dict)
                            and str((item.get("fullArticle") or {}).get("retrievalStatus", ""))
                            in {"collected", "provided-in-feed"})
            pages = sum(len((item.get("fullArticle") or {}).get("pages", []))
                        for item in posts if isinstance(item, dict)
                        and isinstance((item.get("fullArticle") or {}).get("pages", []), list))
            return f"Post records: {len(posts)}, article material retrieved/provided: {collected}, page records: {pages}"
        if key == "originalImageRecords":
            count = sum(len(item.get("originalImageRecords", [])) for item in posts
                        if isinstance(item, dict) and isinstance(item.get("originalImageRecords", []), list))
            return f"Post records: {len(posts)}, image records: {count}"
        if key == "sourceRightsEvidence":
            image_count = 0
            for item in posts:
                if not isinstance(item, dict):
                    continue
                evidence = item.get("sourceRightsEvidence") or item
                if isinstance(evidence, dict):
                    image_count += len(evidence.get("imageRightsEvidence", []))
            return f"Post records: {len(posts)}, image-rights evidence records: {image_count}"
        return f"Post records: {len(posts)}"
    return "Inputs / evidence recorded"


def _post_context(report: dict[str, Any], post_id: str) -> dict[str, str]:
    found: dict[str, str] = {}
    for section_key in ("fullArticle", "liveFeedOutput"):
        section = (report.get("sections") or {}).get(section_key, {})
        for item in section.get("posts", []) if isinstance(section, dict) else []:
            if not isinstance(item, dict) or str(item.get("postId") or "") != post_id:
                continue
            candidate = item.get("fullArticle") if section_key == "fullArticle" else item.get("liveFeed")
            if not isinstance(candidate, dict):
                candidate = item
            for target, keys in {
                "title": ("title", "headline"),
                "source": ("sourceName", "source", "publisher"),
                "url": ("articleUrl", "sourceUrl", "url", "canonicalUrl"),
            }.items():
                if not found.get(target):
                    found[target] = next((str(candidate.get(key)) for key in keys if candidate.get(key)), "")
    # Top-level source/story metadata can contain a clearer title or URL.
    for item in report.get("posts", []) if isinstance(report.get("posts"), list) else []:
        if isinstance(item, dict) and str(item.get("postId") or "") == post_id:
            for target, keys in {
                "title": ("title", "headline"),
                "source": ("sourceName", "source"),
                "url": ("canonicalUrl", "originalUrl", "url"),
            }.items():
                if not found.get(target):
                    found[target] = next((str(item.get(key)) for key in keys if item.get(key)), "")
    return found


def _collect_checks(report: dict[str, Any]) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    top_posts = report.get("posts", [])
    # Sections 5-8 are attached to each original Checker post.
    if isinstance(top_posts, list):
        section_parts = (
            ("section5", "Section 5 - Image URL Review"),
            ("section6", "Section 6 - Consolidated Checks"),
            ("section7", "Section 7 - Text Review"),
            ("section8", "Section 8 - Image Rights Review"),
        )
        for post in top_posts:
            if not isinstance(post, dict):
                continue
            post_id = str(post.get("postId") or "REPORT-LEVEL")
            for key, label in section_parts:
                if key in post:
                    _walk_checks(post[key], label, post_id, checks, key)

    # Sections 9-13 are the subsequent Image Engine, Editor and Final Checker cards.
    sections = report.get("sections", {})
    order = report.get("sectionOrder", [])
    if isinstance(sections, dict) and isinstance(order, list):
        for key in order[8:13]:
            card = sections.get(key)
            if card is not None:
                label = f"Section {order.index(key) + 1} - {_SECTION_TITLES.get(key, key)}"
                _walk_checks(card, label, "REPORT-LEVEL", checks, key)

    # De-duplicate identical records caused by a check being mirrored in a summary card.
    deduped: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str, str]] = set()
    for item in checks:
        marker = (item["section"], item["postId"], item["checkId"], item["result"], item["name"])
        if marker not in seen:
            seen.add(marker)
            deduped.append(item)
    return deduped


def _overall_status(section13: dict[str, Any]) -> str:
    stats = _section_counts(section13)
    integrity = stats.get("reportIntegrityChecks", {})
    if isinstance(integrity, dict) and int(integrity.get("failed", 0) or 0) > 0:
        return "FAILED - REPORT INTEGRITY"
    total = int(stats.get("postsReceived", 0) or 0)
    approved = int(stats.get("approvedForDatabase", 0) or 0)
    held = int(stats.get("held", max(0, total - approved)) or 0)
    if total == 0:
        return "COMPLETED - NO POSTS RECEIVED"
    if held == 0 and approved == total:
        return "PASSED - ALL POSTS APPROVED"
    if approved > 0:
        return "PARTIAL - SOME POSTS HELD"
    return "NOT PASSED - NO POSTS APPROVED"


def create_final_checker_pdf(
    report: dict[str, Any], output_path: str | Path,
    *, collection: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a full per-run PDF from the completed Section 13 and Collector reports."""
    if not isinstance(report, dict):
        raise TypeError("Final Checker report must be an object.")
    order = report.get("sectionOrder")
    sections = report.get("sections")
    if not isinstance(order, list) or len(order) != 13 or not isinstance(sections, dict):
        raise ValueError("A complete 13-section report is required before PDF creation.")
    section13 = sections.get("postEditorialFinalVerification")
    if not isinstance(section13, dict) or section13.get("section") != 13:
        raise ValueError("Section 13 Final Checker results are missing.")

    destination = Path(output_path).resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    job_id = str(report.get("jobId") or "job-unknown")
    view_id = str(report.get("viewId") or "view-unknown")
    checker_version = str(report.get("checkerVersion") or "unknown")
    generated_at = str(section13.get("createdAt") or report.get("checkedAt") or "not recorded")
    section13_stats = _section_counts(section13)
    posts_received = int(section13_stats.get("postsReceived", 0) or 0)
    approved = int(section13_stats.get("approvedForDatabase", 0) or 0)
    held = int(section13_stats.get("held", max(0, posts_received - approved)) or 0)
    all_checks = _collect_checks(report)
    result_counts = {result: sum(item["result"] == result for item in all_checks)
                     for result in ("PASS", "FAIL", "HOLD", "NOT_APPLICABLE", "UNKNOWN")}
    raw_json = json.dumps(report, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")
    fingerprint = hashlib.sha256(raw_json).hexdigest()

    # Use a Unicode-capable system font when available so multilingual story
    # titles and source names do not break PDF creation on Linux runners.
    regular_font = "Helvetica"
    bold_font = "Helvetica-Bold"
    font_candidates = (
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"),
    )
    for regular_path, bold_path in font_candidates:
        if Path(regular_path).is_file() and Path(bold_path).is_file():
            try:
                pdfmetrics.registerFont(TTFont("LiveEarthUnicode", regular_path))
                pdfmetrics.registerFont(TTFont("LiveEarthUnicode-Bold", bold_path))
                regular_font = "LiveEarthUnicode"
                bold_font = "LiveEarthUnicode-Bold"
                break
            except Exception:
                continue

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], fontName=bold_font,
                              fontSize=20, leading=24, alignment=TA_LEFT, spaceAfter=5))
    styles.add(ParagraphStyle(name="SubTitle", parent=styles["Normal"], fontSize=9, leading=12,
                              textColor=colors.HexColor("#4b5563"), spaceAfter=4))
    styles.add(ParagraphStyle(name="SectionTitle", parent=styles["Heading2"], fontName=bold_font,
                              fontSize=12, leading=15, spaceBefore=10, spaceAfter=5))
    styles.add(ParagraphStyle(name="PostTitle", parent=styles["Heading3"], fontName=bold_font,
                              fontSize=9, leading=12, spaceBefore=7, spaceAfter=3))
    styles.add(ParagraphStyle(name="BodySmall", parent=styles["BodyText"], fontSize=7.5, leading=9.5,
                              spaceAfter=2))
    styles.add(ParagraphStyle(name="Tiny", parent=styles["BodyText"], fontSize=6.5, leading=8))
    styles.add(ParagraphStyle(name="Cell", parent=styles["BodyText"], fontSize=6.5, leading=8,
                              wordWrap="CJK"))
    styles.add(ParagraphStyle(name="Status", parent=styles["Normal"], fontName=bold_font,
                              fontSize=12, leading=15, spaceBefore=4, spaceAfter=8))

    page_size = landscape(A4)
    margin = 13 * mm
    doc = SimpleDocTemplate(str(destination), pagesize=page_size,
                            rightMargin=margin, leftMargin=margin,
                            topMargin=16 * mm, bottomMargin=16 * mm,
                            title=f"{REPORT_NAME} - {view_id} - {job_id}",
                            author="LIVE // EARTH Global Checker Reporting")

    def draw_page(canvas, document):
        canvas.saveState()
        width, height = page_size
        canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
        canvas.setLineWidth(0.5)
        canvas.line(margin, 11 * mm, width - margin, 11 * mm)
        canvas.setFont(regular_font, 7)
        canvas.setFillColor(colors.HexColor("#475569"))
        canvas.drawString(margin, 7 * mm, f"LIVE // EARTH | {view_id} | Job {job_id}")
        canvas.drawRightString(width - margin, 7 * mm, f"Final Checker Report | Page {document.page}")
        canvas.restoreState()

    story = []
    story.append(Paragraph(REPORT_NAME, styles["ReportTitle"]))
    story.append(Paragraph("Complete per-run audit record - generated only after Section 13 Final Checker", styles["SubTitle"]))
    story.append(Paragraph(f"FINAL STATUS: {escape(_overall_status(section13))}", styles["Status"]))
    meta_rows = [
        ["View", view_id, "Job ID", job_id],
        ["Checker version", checker_version, "Generated (UTC)", generated_at],
        ["Posts reviewed", str(posts_received), "Approved for database", str(approved)],
        ["Posts held", str(held), "Check records listed", str(len(all_checks))],
        ["PASS", str(result_counts["PASS"]), "FAIL / HOLD", f"{result_counts['FAIL']} / {result_counts['HOLD']}"],
        ["N/A / Unknown", f"{result_counts['NOT_APPLICABLE']} / {result_counts['UNKNOWN']}", "Report SHA-256", fingerprint[:32] + "..."],
    ]
    meta_table = Table(meta_rows, colWidths=[31*mm, 66*mm, 39*mm, 113*mm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f1f5f9")),
        ("BACKGROUND", (2,0), (2,-1), colors.HexColor("#f1f5f9")),
        ("TEXTCOLOR", (0,0), (0,-1), colors.HexColor("#334155")),
        ("TEXTCOLOR", (2,0), (2,-1), colors.HexColor("#334155")),
        ("FONTNAME", (0,0), (0,-1), bold_font),
        ("FONTNAME", (2,0), (2,-1), bold_font),
        ("FONTSIZE", (0,0), (-1,-1), 7),
        ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 5),
        ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    story.extend([meta_table, Spacer(1, 6*mm)])
    story.append(Paragraph("Section-by-section overview", styles["SectionTitle"]))
    overview_rows = [["Section", "Component / responsibility", "Recorded totals"]]
    for index, key in enumerate(order, 1):
        card = sections.get(key, {})
        title = _SECTION_TITLES.get(key, key)
        owner = card.get("owner", "") if isinstance(card, dict) else ""
        stats = _section_counts(card)
        stat_text = _section_summary(key, card)
        overview_rows.append([
            _paragraph(index, styles["Cell"], 20),
            _paragraph(f"{title}" + (f" ({owner})" if owner else ""), styles["Cell"], 500),
            _paragraph(stat_text, styles["Cell"], 1800),
        ])
    overview = LongTable(overview_rows, colWidths=[18*mm, 95*mm, 136*mm], repeatRows=1)
    overview.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ("FONTNAME", (0,0), (-1,0), bold_font),
        ("FONTSIZE", (0,0), (-1,-1), 6.6),
        ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    story.extend([overview, Spacer(1, 4*mm)])

    collection_stats = collection.get("statistics", {}) if isinstance(collection, dict) else {}
    collection_sources = collection.get("sources", []) if isinstance(collection, dict) else []
    if collection_stats:
        story.append(Paragraph("Global Collector run summary", styles["SectionTitle"]))
        stat_rows = [["Collector metric", "Recorded value"]]
        for key, value in collection_stats.items():
            stat_rows.append([_paragraph(key, styles["Cell"], 200), _paragraph(value, styles["Cell"], 300)])
        stat_table = LongTable(stat_rows, colWidths=[75*mm, 196*mm], repeatRows=1)
        stat_table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e2e8f0")),
            ("FONTNAME", (0,0), (-1,0), bold_font),
            ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING", (0,0), (-1,-1), 4),
            ("RIGHTPADDING", (0,0), (-1,-1), 4),
            ("TOPPADDING", (0,0), (-1,-1), 3),
            ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ]))
        story.extend([stat_table, Spacer(1, 3*mm)])

    if collection_sources:
        story.append(Paragraph("Feed-by-feed collection results", styles["SectionTitle"]))
        source_rows = [[
            _paragraph("Source / ID", styles["Cell"], 100),
            _paragraph("Feed URL", styles["Cell"], 100),
            _paragraph("Result", styles["Cell"], 100),
            _paragraph("Found", styles["Cell"], 100),
            _paragraph("Saved", styles["Cell"], 100),
            _paragraph("Article pages\nattempted / enriched / failed", styles["Cell"], 160),
            _paragraph("Feed error", styles["Cell"], 100),
        ]]
        for source in collection_sources:
            if not isinstance(source, dict):
                continue
            source_rows.append([
                _paragraph(f"{source.get('sourceName', '')} / {source.get('sourceId', '')}", styles["Tiny"], 220),
                _paragraph(source.get("feedUrl", ""), styles["Tiny"], 450),
                _paragraph(source.get("status", ""), styles["Tiny"], 60),
                _paragraph(source.get("postsDiscovered", 0), styles["Tiny"], 40),
                _paragraph(source.get("postsCollected", 0), styles["Tiny"], 40),
                _paragraph(f"{source.get('articlePagesAttempted', 0)} / {source.get('articlePagesEnriched', 0)} / {source.get('articlePagesFailed', 0)}", styles["Tiny"], 80),
                _paragraph((f"{source.get('errorType', '')}: {source.get('error', '')}"
                            if source.get("errorType") or source.get("error") else "-"), styles["Tiny"], 400),
            ])
        source_table = LongTable(source_rows, colWidths=[42*mm, 75*mm, 20*mm, 17*mm, 17*mm, 38*mm, 62*mm], repeatRows=1)
        source_table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e2e8f0")),
            ("FONTNAME", (0,0), (-1,0), bold_font),
            ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING", (0,0), (-1,-1), 3),
            ("RIGHTPADDING", (0,0), (-1,-1), 3),
            ("TOPPADDING", (0,0), (-1,-1), 3),
            ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ]))
        story.extend([source_table, Spacer(1, 3*mm)])

    story.append(Paragraph("Individual post decisions and check evidence", styles["SectionTitle"]))
    story.append(Paragraph(
        "Every recorded check is listed below with its result, reason and available evidence reference. "
        "Raw article bodies and feed summaries are excluded from this PDF; source text is not reproduced in the audit report.",
        styles["BodySmall"]))

    by_section: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in all_checks:
        by_section[item["section"]].append(item)

    section_names = []
    for item in all_checks:
        if item["section"] not in section_names:
            section_names.append(item["section"])
    for section_label in section_names:
        story.append(Paragraph(escape(section_label), styles["SectionTitle"]))
        groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for item in by_section[section_label]:
            groups[item["postId"]].append(item)
        for post_id in sorted(groups):
            context = _post_context(report, post_id) if post_id != "REPORT-LEVEL" else {}
            title = ("(report-level integrity check)" if post_id == "REPORT-LEVEL"
                     else context.get("title") or "(title not present in Checker output)")
            lines = [f"Post ID: {post_id}", f"Title: {title}"]
            if context.get("source"):
                lines.append(f"Source: {context['source']}")
            if context.get("url"):
                lines.append(f"Source URL: {context['url']}")
            final_posts = section13.get("posts", [])
            final_decision = next((str(p.get("decision")) for p in final_posts
                                   if isinstance(p, dict) and str(p.get("postId")) == post_id), "")
            if final_decision:
                lines.append(f"Section 13 decision: {final_decision}")
            story.append(KeepTogether([Paragraph(escape(" | ".join(lines)), styles["PostTitle"])]))
            rows = [["Check ID", "Result", "Check", "Reason / evidence"]]
            for check in groups[post_id]:
                reason = check.get("reason") or "No reason text recorded."
                evidence_parts = []
                if check.get("evidenceRef"):
                    evidence_parts.append("Reference: " + check["evidenceRef"])
                for label in ("expected", "actual", "evidence"):
                    value = check.get(label)
                    if value not in (None, "", {}, []):
                        evidence_parts.append(label.title() + ": " + _plain(value, 650))
                details = reason
                if evidence_parts:
                    details += "\n" + "\n".join(evidence_parts)
                rows.append([
                    _paragraph(check["checkId"], styles["Tiny"], 100),
                    _paragraph(check["result"], styles["Tiny"], 40),
                    _paragraph(check["name"], styles["Cell"], 500),
                    _paragraph(details, styles["Cell"], 1800),
                ])
            check_table = LongTable(rows, colWidths=[23*mm, 22*mm, 72*mm, 132*mm], repeatRows=1)
            table_style = [
                ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e2e8f0")),
                ("FONTNAME", (0,0), (-1,0), bold_font),
                ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0,0), (-1,-1), "TOP"),
                ("LEFTPADDING", (0,0), (-1,-1), 4),
                ("RIGHTPADDING", (0,0), (-1,-1), 4),
                ("TOPPADDING", (0,0), (-1,-1), 3),
                ("BOTTOMPADDING", (0,0), (-1,-1), 3),
                ("FONTSIZE", (0,0), (-1,-1), 6.5),
            ]
            for row_index, check in enumerate(groups[post_id], 1):
                if check["result"] in {"FAIL", "HOLD", "UNKNOWN"}:
                    table_style.append(("BACKGROUND", (0,row_index), (1,row_index), colors.HexColor("#f1f5f9")))
            check_table.setStyle(TableStyle(table_style))
            story.extend([check_table, Spacer(1, 3*mm)])

    if not all_checks:
        story.append(Paragraph("No individual check records were present in the supplied report.", styles["BodySmall"]))
    temp_fd, temp_name = tempfile.mkstemp(prefix=".checker-report-", suffix=".pdf", dir=destination.parent)
    os.close(temp_fd)
    try:
        doc = SimpleDocTemplate(str(temp_name), pagesize=page_size,
                                rightMargin=margin, leftMargin=margin,
                                topMargin=16*mm, bottomMargin=16*mm,
                                title=f"{REPORT_NAME} - {view_id} - {job_id}",
                                author="LIVE // EARTH Global Checker Reporting")
        doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
        os.replace(temp_name, destination)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise

    return {
        "created": True,
        "path": str(destination),
        "bytes": destination.stat().st_size,
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "postsReviewed": posts_received,
        "postsApproved": approved,
        "postsHeld": held,
        "checksRecorded": len(all_checks),
        "resultCounts": result_counts,
        "overallStatus": _overall_status(section13),
    }


def create_execution_failure_pdf(
    *, view_id: str, output_path: str | Path, error_type: str, message: str,
    stage: str = "Newsroom orchestration",
) -> dict[str, Any]:
    """Create an explicit diagnostic PDF when the 13-section report cannot complete."""
    from datetime import datetime, timezone

    destination = Path(output_path).resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    styles = getSampleStyleSheet()
    regular_font, bold_font = "Helvetica", "Helvetica-Bold"
    for regular_path, bold_path in (
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"),
    ):
        if Path(regular_path).is_file() and Path(bold_path).is_file():
            try:
                pdfmetrics.registerFont(TTFont("LiveEarthFailureUnicode", regular_path))
                pdfmetrics.registerFont(TTFont("LiveEarthFailureUnicode-Bold", bold_path))
                regular_font, bold_font = "LiveEarthFailureUnicode", "LiveEarthFailureUnicode-Bold"
                break
            except Exception:
                continue
    styles.add(ParagraphStyle(name="FailureTitle", parent=styles["Title"], fontName=bold_font,
                              fontSize=19, leading=23, alignment=TA_LEFT, spaceAfter=8))
    styles.add(ParagraphStyle(name="FailureBody", parent=styles["BodyText"], fontName=regular_font,
                              fontSize=9, leading=13, spaceAfter=8))
    styles.add(ParagraphStyle(name="FailureLabel", parent=styles["BodyText"], fontName=bold_font,
                              fontSize=8, leading=11, spaceAfter=2))
    page_size = A4
    margin = 20 * mm
    doc = SimpleDocTemplate(str(destination), pagesize=page_size,
                            rightMargin=margin, leftMargin=margin,
                            topMargin=20*mm, bottomMargin=20*mm,
                            title=f"LIVE // EARTH Run Failure Report - {view_id}",
                            author="LIVE // EARTH Global Newsroom")
    story = [
        Paragraph("LIVE // EARTH Run Failure Report", styles["FailureTitle"]),
        Paragraph("RUN FAILED - A complete Section 13 report was not produced", styles["FailureTitle"]),
        Paragraph("This is an execution-failure notice, not a completed Checker approval report. No PASS decision is implied.", styles["FailureBody"]),
    ]
    rows = [
        ["View", _paragraph(view_id, styles["FailureBody"], 200)],
        ["Generated (UTC)", _paragraph(generated_at, styles["FailureBody"], 200)],
        ["Stage", _paragraph(stage, styles["FailureBody"], 500)],
        ["Error type", _paragraph(error_type, styles["FailureBody"], 200)],
        ["Failure details", _paragraph(message, styles["FailureBody"], 2500)],
        ["Database write", _paragraph("Not attempted by the Newsroom Orchestrator after this failure.", styles["FailureBody"], 300)],
        ["Publication", _paragraph("Not performed by the Newsroom Orchestrator after this failure.", styles["FailureBody"], 300)],
    ]
    table = Table(rows, colWidths=[45*mm, 125*mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f1f5f9")),
        ("FONTNAME", (0,0), (0,-1), bold_font),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(table)
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        "When the Final Checker completes successfully, the normal full report includes all 13 sections, "
        "individual post decisions, every recorded check result and reasons, plus feed-by-feed collection outcomes.",
        styles["FailureBody"]))
    temp_fd, temp_name = tempfile.mkstemp(prefix=".checker-failure-", suffix=".pdf", dir=destination.parent)
    os.close(temp_fd)
    try:
        def draw_page(canvas, document):
            canvas.saveState()
            canvas.setFont(regular_font, 7)
            canvas.setFillColor(colors.HexColor("#475569"))
            canvas.drawString(margin, 9*mm, f"LIVE // EARTH | {view_id} | Execution failure report")
            canvas.drawRightString(page_size[0]-margin, 9*mm, f"Page {document.page}")
            canvas.restoreState()
        doc = SimpleDocTemplate(str(temp_name), pagesize=page_size,
                                rightMargin=margin, leftMargin=margin,
                                topMargin=20*mm, bottomMargin=20*mm,
                                title=f"LIVE // EARTH Run Failure Report - {view_id}",
                                author="LIVE // EARTH Global Newsroom")
        doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
        os.replace(temp_name, destination)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise
    return {
        "created": True,
        "path": str(destination),
        "bytes": destination.stat().st_size,
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "reportType": "execution-failure-diagnostic",
        "overallStatus": "FAILED BEFORE SECTION 13 COMPLETED",
    }

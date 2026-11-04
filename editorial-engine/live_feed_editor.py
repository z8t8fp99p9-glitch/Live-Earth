#!/usr/bin/env python3
"""LIVE // EARTH Live Feed Editor — append-only Section 12.

Consumes the completed Global Checker v2.1.1 report containing immutable
Sections 1–11. It uses Section 11's releaseToEditorial decision as the sole
eligibility gate, takes the permitted full article from Section 2, and carries
the exact final image selected/verified by Sections 9–10 into one Live Feed
output card. It does not repeat Checker decisions, fetch sources, select or
replace images, write databases, or publish.

The report is deep-copied. Sections 1–11, the existing per-post report, and all
other existing report fields are preserved. Only Section 12 and its section
order entry are added.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import editorial_text_intelligence as text_intelligence
except ImportError:  # pragma: no cover - exercised by CLI from repository root
    _HERE = Path(__file__).resolve().parent
    if str(_HERE) not in sys.path:
        sys.path.insert(0, str(_HERE))
    import editorial_text_intelligence as text_intelligence

EDITOR_NAME = "LIVE // EARTH Live Feed Editor"
EDITOR_VERSION = "1.0.0"
CHECKER_VERSION = "2.1.1"
SECTION_KEY = "liveFeedOutput"
SECTION_NUMBER = 12
SUMMARY_PREFERRED_MIN = 120
SUMMARY_PREFERRED_MAX = 130
SUMMARY_MIN = 100
SUMMARY_MAX = 150

REQUIRED_SECTIONS = (
    "managerIdCard",
    "fullArticle",
    "originalImageRecords",
    "sourceRightsEvidence",
    "imageUrlCheckerAndFinalImage",
    "allChecks",
    "textApprovalChecks",
    "imageApprovalChecks",
    "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission",
    "finalImageVerificationAndApproval",
    "postEngineAuditAndFinalDecision",
)


class LiveFeedEditorError(RuntimeError):
    """The final Checker report cannot safely be used by the Live Editor."""


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _text(value: Any, limit: int = 30000) -> str:
    return text_intelligence._clean(value, limit)


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _posts_by_id(section: dict[str, Any]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in _list(section.get("posts")):
        if not isinstance(item, dict):
            continue
        post_id = str(item.get("postId") or "").strip()
        if post_id:
            if post_id in result:
                raise LiveFeedEditorError(f"Duplicate postId '{post_id}' in a Checker section.")
            result[post_id] = item
    return result


def _full_article(section: dict[str, Any], post_id: str) -> dict[str, Any]:
    item = _posts_by_id(section).get(post_id)
    if not item:
        return {}
    nested = _dict(item.get("fullArticle"))
    return nested if nested else item


def _make_live_summary(source_text: str, headline: str) -> dict[str, Any]:
    """Create a verbatim, source-ordered 100–150 word Live summary.

    Inputs at or below 150 words are preserved (after the established safe
    whitespace/HTML cleanup and near-duplicate removal). Longer inputs use the
    existing local TF-IDF/TextRank/MMR sentence-ranking implementation with a
    Live-specific 120–150 word target. No sentence is paraphrased, reordered,
    padded, or cut in the middle.
    """
    source = _text(source_text)
    if not source:
        raise LiveFeedEditorError("Section 2 contains no permitted full-article text.")

    original_sentences = text_intelligence._split_sentences(source)
    distinct_sentences = text_intelligence._remove_near_duplicate_sentences(original_sentences)
    if not distinct_sentences:
        raise LiveFeedEditorError("Section 2 contains no usable complete source sentences.")

    if len(source.split()) <= SUMMARY_MAX:
        summary = " ".join(distinct_sentences)
        method = "source-preserved-no-padding"
        trace_sentences = distinct_sentences
        status = (
            "SOURCE_SHORT_NO_PADDING" if len(summary.split()) < SUMMARY_MIN
            else "SOURCE_PRESERVED_WITHIN_LIVE_RANGE"
        )
    else:
        scores = text_intelligence._sentence_scores(distinct_sentences, _text(headline, 500))
        selected_indices = text_intelligence._select_mmr(
            distinct_sentences,
            scores,
            target_min=SUMMARY_PREFERRED_MIN,
            target_max=SUMMARY_MAX,
        )
        if not selected_indices:
            raise LiveFeedEditorError(
                "The existing extractive selector could not assemble complete source sentences within 150 words."
            )
        trace_sentences = [distinct_sentences[index] for index in selected_indices]
        summary = text_intelligence._compose_long_source(source, headline, trace_sentences)
        method = "textrank-mmr-extractive-v2-live"
        count = len(summary.split())
        if count > SUMMARY_MAX:
            raise LiveFeedEditorError("Extractive summary exceeded the 150-word Live maximum.")
        if count < SUMMARY_MIN:
            # Never cut a sentence or pad with invented material to satisfy the
            # lower bound. Preserve this as a blocked output for human review.
            raise LiveFeedEditorError(
                f"Complete source sentences total only {count} words; no safe 100-word Live summary can be assembled."
            )
        status = "WITHIN_PREFERRED_RANGE" if SUMMARY_PREFERRED_MIN <= count <= SUMMARY_PREFERRED_MAX else "WITHIN_ALLOWED_RANGE"

    count = len(summary.split())
    if count > SUMMARY_MAX:
        raise LiveFeedEditorError("Live summary exceeded the 150-word maximum.")
    if len(source.split()) > SUMMARY_MAX and count < SUMMARY_MIN:
        raise LiveFeedEditorError("Live summary is shorter than 100 words despite a longer source.")

    source_sentences = text_intelligence._split_sentences(source)
    cursor = 0
    trace = []
    for sentence in trace_sentences:
        try:
            source_index = source_sentences.index(sentence, cursor)
        except ValueError as exc:
            raise LiveFeedEditorError("Summary sentence could not be traced to the exact source article order.") from exc
        cursor = source_index + 1
        trace.append({
            "sourceSentenceIndex": source_index,
            "sentenceSha256": _sha256(sentence),
            "numericAnchors": text_intelligence._NUMBER_OR_MEASUREMENT.findall(sentence),
            "quotedText": text_intelligence._QUOTED.findall(sentence),
            "negationMarkers": text_intelligence._NEGATION.findall(sentence),
            "uncertaintyMarkers": text_intelligence._UNCERTAINTY.findall(sentence),
        })

    return {
        "text": summary,
        "wordCount": count,
        "status": status,
        "method": method,
        "sourceSha256": _sha256(source),
        "summarySha256": _sha256(summary),
        "sentenceTrace": trace,
        "allSentencesVerbatim": True,
        "sourceOrderPreserved": True,
        "unsupportedClaimsAdded": 0,
    }


def _image_for_live(
    section9_post: dict[str, Any],
    section10_post: dict[str, Any],
    section8_post: dict[str, Any],
) -> dict[str, Any]:
    """Carry the exact Section 10-approved candidate and Section 9 metadata."""
    final_image = _dict(section9_post.get("finalImage"))
    approved_url = _text(section10_post.get("candidateUrl"), 4000)
    approved_hash = _text(section10_post.get("candidateSha256"), 128).lower()
    section9_url = _text(final_image.get("sourceImageUrl") or final_image.get("imageUrl"), 4000)
    section9_hash = _text(final_image.get("sha256"), 128).lower()

    # This is a join/identity requirement for assembling the handoff, not a new
    # rights or image approval check. Section 11 already owns that decision.
    if not approved_url or not approved_hash or approved_url != section9_url or approved_hash != section9_hash:
        raise LiveFeedEditorError("Section 10 approval reference does not identify the exact Section 9 final image.")

    rights = _dict(section8_post.get("rightsEvidence"))
    image = {
        "mediaId": final_image.get("mediaId") or final_image.get("candidateId") or "",
        "candidateId": final_image.get("candidateId") or "",
        "url": approved_url,
        "sha256": approved_hash,
        "mimeType": final_image.get("mimeType") or "",
        "width": final_image.get("width"),
        "height": final_image.get("height"),
        "altText": final_image.get("altText") or final_image.get("caption") or "",
        "caption": final_image.get("caption") or "",
        "credit": final_image.get("credit") or rights.get("credit") or final_image.get("creator") or rights.get("creator") or "",
        "creator": final_image.get("creator") or rights.get("creator") or "",
        "sourcePage": final_image.get("sourcePage") or "",
        "licenseName": final_image.get("licenseName") or rights.get("licenseName") or rights.get("rightsBasis") or "",
        "licenseUrl": final_image.get("licenseUrl") or rights.get("licenseUrl") or "",
        "originType": final_image.get("originType") or "",
    }
    # Private processing locator stays outside the public liveFeed object.
    private_processing = {
        "stagedPath": final_image.get("stagedPath") or "",
        "fileSizeBytes": final_image.get("fileSizeBytes"),
        "candidateId": final_image.get("candidateId") or "",
    }
    return {"public": image, "privateProcessing": private_processing}


def append_live_feed_output(checker_report: dict[str, Any]) -> dict[str, Any]:
    """Append Section 12 to a completed Global Checker v2.1.1 report.

    The input is not mutated. Existing Sections 1–11 and every other pre-existing
    report field retain their JSON values. Section 11 is the sole eligibility
    authority; Editor does not re-run its checks.
    """
    if not isinstance(checker_report, dict):
        raise LiveFeedEditorError("Global Checker report must be a JSON object.")
    if checker_report.get("schemaVersion") != 2:
        raise LiveFeedEditorError("Live Editor requires Global Checker report schemaVersion 2.")
    if checker_report.get("checkerVersion") != CHECKER_VERSION:
        raise LiveFeedEditorError(f"Live Editor requires Global Checker version {CHECKER_VERSION}.")

    sections = _dict(checker_report.get("sections"))
    missing = [key for key in REQUIRED_SECTIONS if key not in sections]
    if missing:
        raise LiveFeedEditorError("The completed 11-section Checker report is missing: " + ", ".join(missing))
    if SECTION_KEY in sections or SECTION_KEY in _list(checker_report.get("sectionOrder")):
        raise LiveFeedEditorError("Section 12 already exists; the Editor will not overwrite an existing card.")
    order = _list(checker_report.get("sectionOrder"))
    if len(order) < 11 or any(key not in order for key in REQUIRED_SECTIONS):
        raise LiveFeedEditorError("Checker sectionOrder does not contain all 11 original cards.")

    section2 = _dict(sections.get("fullArticle"))
    section4 = _posts_by_id(_dict(sections.get("sourceRightsEvidence")))
    section8 = _posts_by_id(_dict(sections.get("imageApprovalChecks")))
    section9 = _posts_by_id(_dict(sections.get("imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission")))
    section10 = _posts_by_id(_dict(sections.get("finalImageVerificationAndApproval")))
    section11 = _posts_by_id(_dict(sections.get("postEngineAuditAndFinalDecision")))

    if not section11:
        raise LiveFeedEditorError("Section 11 has no per-post final editorial decisions.")

    output_posts = []
    ready_count = 0
    held_count = 0
    for post_id, final_decision in section11.items():
        if final_decision.get("releaseToEditorial") is not True or final_decision.get("editorialEligibility") != "EDITORIAL_READY":
            output_posts.append({
                "section": SECTION_NUMBER,
                "postId": post_id,
                "status": "HOLD",
                "reason": "Section 11 did not release this post to Editorial.",
                "liveFeed": None,
            })
            held_count += 1
            continue

        article = _full_article(section2, post_id)
        headline = _text(article.get("title") or article.get("headline"), 500)
        article_text = _text(article.get("fullText") or article.get("fullArticleText") or article.get("text"))
        article_url = _text(article.get("articleUrl") or article.get("canonicalUrl") or article.get("url"), 4000)
        if not article_text or not headline or not article_url:
            output_posts.append({
                "section": SECTION_NUMBER,
                "postId": post_id,
                "status": "HOLD",
                "reason": "Section 2 is missing the permitted full-article text, headline, or article URL.",
                "liveFeed": None,
            })
            held_count += 1
            continue

        sec4_item = section4.get(post_id, {})
        sec4_source = _dict(sec4_item.get("sourceRightsEvidence")) or sec4_item
        source_identity = _dict(sec4_source.get("sourceIdentity"))
        sec9 = section9.get(post_id)
        sec10 = section10.get(post_id)
        sec8 = section8.get(post_id, {})
        if not sec9 or not sec10:
            output_posts.append({
                "section": SECTION_NUMBER,
                "postId": post_id,
                "status": "HOLD",
                "reason": "The Section 9 image candidate or Section 10 approval reference is missing.",
                "liveFeed": None,
            })
            held_count += 1
            continue

        try:
            summary = _make_live_summary(article_text, headline)
            image_result = _image_for_live(sec9, sec10, sec8)
        except LiveFeedEditorError as exc:
            output_posts.append({
                "section": SECTION_NUMBER,
                "postId": post_id,
                "status": "HOLD",
                "reason": str(exc),
                "liveFeed": None,
            })
            held_count += 1
            continue

        public_image = image_result["public"]
        live_feed = {
            "title": headline,
            "summary": summary["text"],
            "image": public_image,
            "sourceUrl": article_url,
            "sourceName": _text(article.get("sourceName") or article.get("publisher") or source_identity.get("sourceName") or source_identity.get("name") or "", 240),
            "sourceFeedUrl": _text(article.get("sourceFeedUrl") or source_identity.get("sourceFeedUrl") or source_identity.get("feedUrl") or "", 4000),
            "publishedAt": article.get("publishedAt") or "",
        }
        output_posts.append({
            "section": SECTION_NUMBER,
            "postId": post_id,
            "status": "READY",
            "headline": headline,
            "summary": summary["text"],
            "summaryWordCount": summary["wordCount"],
            "summaryStatus": summary["status"],
            "summaryMethod": summary["method"],
            "summarySourceSha256": summary["sourceSha256"],
            "summarySha256": summary["summarySha256"],
            "sentenceTrace": summary["sentenceTrace"],
            "image": public_image,
            "privateImageProcessing": image_result["privateProcessing"],
            "sourceUrl": article_url,
            "liveFeed": live_feed,
            "inputReferences": {
                "section2": "fullArticle",
                "section8": "imageApprovalChecks",
                "section9": "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission",
                "section10": "finalImageVerificationAndApproval",
                "section11": "postEngineAuditAndFinalDecision",
            },
        })
        ready_count += 1

    result = copy.deepcopy(checker_report)
    result["sections"][SECTION_KEY] = {
        "section": SECTION_NUMBER,
        "title": "Live Feed Output",
        "owner": EDITOR_NAME,
        "editorVersion": EDITOR_VERSION,
        "createdAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "summaryWordRange": {
            "minimum": SUMMARY_MIN,
            "maximum": SUMMARY_MAX,
            "preferredMinimum": SUMMARY_PREFERRED_MIN,
            "preferredMaximum": SUMMARY_PREFERRED_MAX,
            "shortSourceRule": "Preserve shorter permitted source text without padding.",
        },
        "posts": output_posts,
        "statistics": {
            "checkerPostsReceived": len(section11),
            "liveFeedPackagesReady": ready_count,
            "postsHeld": held_count,
        },
        "ownership": {
            "checkerSections1To11Modified": False,
            "originalCheckerPostRecordsModified": False,
            "checkerDecisionsRecreatedOrChanged": False,
            "imageRightsRecheckedOrChanged": False,
            "imageSelectedOrReplaced": False,
            "sourceWebsitesFetched": False,
            "rawArticleTextPersistedInSection12": False,
            "viewDatabaseOpenedOrWritten": False,
            "publicationPerformed": False,
        },
        "nextSystem": "Live Feed Publisher / matching View database writer",
    }
    result["sectionOrder"] = list(order) + [SECTION_KEY]

    # Enforce the append-only promise against the returned package.
    for key in REQUIRED_SECTIONS:
        if result["sections"].get(key) != sections.get(key):
            raise LiveFeedEditorError(f"Append-only contract failed: Checker section '{key}' changed.")
    if result.get("posts") != checker_report.get("posts"):
        raise LiveFeedEditorError("Append-only contract failed: original Checker post records changed.")
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="live-earth-live-feed-editor",
        description="Append one Live Feed Output card to a completed Global Checker 11-section report.",
    )
    parser.add_argument("--checker-report-file", required=True, help="Completed Global Checker v2.1.1 JSON report.")
    parser.add_argument("--output-file", help="Optional destination JSON file; defaults to standard output.")
    args = parser.parse_args(argv)
    try:
        report_path = Path(args.checker_report_file)
        checker_report = json.loads(report_path.read_text(encoding="utf-8"))
        result = append_live_feed_output(checker_report)
        payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        if args.output_file:
            Path(args.output_file).write_text(payload, encoding="utf-8")
        else:
            sys.stdout.write(payload)
        return 0
    except Exception as exc:
        json.dump({
            "editor": EDITOR_NAME,
            "editorVersion": EDITOR_VERSION,
            "phase": "live-feed-editing-blocked",
            "checkerReportModified": False,
            "databaseWriteAttempted": False,
            "publicationPerformed": False,
            "errorType": type(exc).__name__,
            "message": str(exc)[:700],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""LIVE // EARTH Global Checker — append-only Section 13.

This is a continuation module for the existing GlobalChecker v2.1.1 identity,
not a second Checker. It appends Section 13 after Live Feed Editor Section 12,
using the same CHECKER_NAME and CHECKER_VERSION. It never writes a database,
archives a report, fetches a website, downloads an image, or publishes content.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, parse_qsl, urlencode, urlunsplit

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
_EDITORIAL = _ROOT / "editorial-engine"
for _path in (_HERE, _EDITORIAL):
    if str(_path) not in sys.path:
        sys.path.insert(0, str(_path))

from global_checker_v2 import (  # same Checker identity and canonical hashing
    CHECKER_NAME,
    CHECKER_VERSION,
    GlobalChecker,
    _canonical_hash,
    _d,
    _l,
    _s,
)
import live_feed_editor as _editor

_PII_EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_PII_PHONE = re.compile(r"(?<!\w)(?:\+?\d{1,3}[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}(?!\w)")

SECTION_KEY = "postEditorialFinalVerification"
SECTION_NUMBER = 13
SECTION12_KEY = "liveFeedOutput"
REQUIRED_SECTION_KEYS = (
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
    SECTION12_KEY,
)
EXPECTED_ORDER = list(REQUIRED_SECTION_KEYS) + [SECTION_KEY]
WRITER_MANAGER_FIELDS = (
    "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
    "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
    "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
    "requestWindowHours", "configVersion", "trigger",
)


class Section13Error(RuntimeError):
    """Section 13 could not safely append a final verification report."""


def _sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _posts_by_id(section: dict[str, Any], label: str) -> dict[str, dict[str, Any]]:
    found: dict[str, dict[str, Any]] = {}
    for item in _l(section.get("posts")):
        if not isinstance(item, dict):
            continue
        post_id = _s(item.get("postId"), 200)
        if not post_id:
            continue
        if post_id in found:
            raise Section13Error(f"Duplicate postId '{post_id}' in {label}.")
        found[post_id] = item
    return found


def _article_for(section2: dict[str, Any], post_id: str) -> dict[str, Any]:
    for item in _l(section2.get("posts")):
        if isinstance(item, dict) and _s(item.get("postId"), 200) == post_id:
            nested = _d(item.get("fullArticle"))
            return {**item, **nested} if nested else dict(item)
    direct = _d(section2.get(post_id))
    nested = _d(direct.get("fullArticle"))
    return {**direct, **nested} if nested else direct


def _check(
    check_id: str,
    name: str,
    result: str,
    expected: Any,
    actual: Any,
    evidence_ref: str,
    reason: str,
    *,
    mandatory: bool = True,
) -> dict[str, Any]:
    if result not in {"PASS", "FAIL", "HOLD", "NOT_APPLICABLE"}:
        raise ValueError(f"Unsupported Section 13 check result: {result}")
    return {
        "checkId": check_id,
        "checkName": name,
        "evidenceRef": evidence_ref,
        "expected": expected,
        "actual": actual,
        "result": result,
        "mandatory": mandatory,
        "reason": reason,
    }


def _check_bool(check_id: str, name: str, condition: bool, expected: Any, actual: Any,
                evidence_ref: str, failed_reason: str) -> dict[str, Any]:
    return _check(
        check_id, name, "PASS" if condition else "FAIL", expected, actual,
        evidence_ref, "Verified." if condition else failed_reason,
    )


def _url_key(value: Any) -> str:
    try:
        parsed = urlsplit(str(value or "").strip())
        if parsed.scheme.lower() != "https" or not parsed.hostname or parsed.username or parsed.password:
            return ""
        host = parsed.hostname.lower().rstrip(".")
        port = f":{parsed.port}" if parsed.port and parsed.port != 443 else ""
        query = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
                 if not k.lower().startswith("utm_") and k.lower() not in {"fbclid", "gclid", "mc_cid", "mc_eid"}]
        return urlunsplit(("https", host + port, parsed.path or "/", urlencode(query, doseq=True), ""))
    except (TypeError, ValueError):
        return ""


def _risk_flags(*nodes: Any) -> list[dict[str, Any]]:
    """Find explicit machine-readable risk flags; do not claim semantic review."""
    flag_keys = {
        "unsafe", "safetyhold", "safetyissue", "privacyissue", "piidetected",
        "personaldataflag", "restrictedcontent", "policyviolation", "rightsviolation",
        "copyrightviolation", "legalhold", "blocked", "disallowed", "harmfulcontent",
    }
    bad_values = {"true", "yes", "fail", "failed", "hold", "blocked", "unsafe", "detected"}
    matches: list[dict[str, Any]] = []

    def walk(node: Any, path: str = "") -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                key_norm = re.sub(r"[^a-z]", "", str(key).casefold())
                location = f"{path}.{key}" if path else str(key)
                if key_norm in flag_keys:
                    if value is True or (isinstance(value, str) and value.strip().casefold() in bad_values):
                        matches.append({"field": location, "value": value})
                walk(value, location)
        elif isinstance(node, list):
            for index, value in enumerate(node):
                walk(value, f"{path}[{index}]")

    for index, node in enumerate(nodes):
        walk(node, f"input[{index}]")
    return matches


def _section10_all_pass(sec10: dict[str, Any]) -> tuple[bool, dict[str, int]]:
    checks = [item for item in _l(sec10.get("checks")) if isinstance(item, dict)]
    counts = {
        "executed": len(checks),
        "passed": sum(item.get("result") == "PASS" and item.get("executed") == "YES" for item in checks),
        "failed": sum(item.get("result") == "FAIL" for item in checks),
        "unknown": sum(item.get("result") == "UNKNOWN" for item in checks),
    }
    summary = _d(sec10.get("checksSummary"))
    consistent = (
        bool(checks)
        and counts["passed"] == counts["executed"]
        and counts["failed"] == 0
        and counts["unknown"] == 0
        and summary.get("executed") == counts["executed"]
        and summary.get("passed") == counts["passed"]
        and summary.get("failed") == 0
        and summary.get("unknown") == 0
        and summary.get("allExecuted") is True
    )
    return consistent, counts


def _manager_context(report: dict[str, Any], sections: dict[str, Any]) -> tuple[dict[str, Any], bool, list[str]]:
    card = _d(sections.get("managerIdCard"))
    payload = _d(card.get("payload"))
    digest = _s(card.get("sha256"), 128).lower()
    missing = [key for key in WRITER_MANAGER_FIELDS if payload.get(key) in (None, "", [], {})]
    digest_ok = bool(digest and re.fullmatch(r"[a-f0-9]{64}", digest) and _canonical_hash(payload) == digest)
    identity_ok = bool(
        payload
        and payload.get("jobId") == report.get("jobId")
        and payload.get("viewId") == report.get("viewId")
    )
    destination = str(payload.get("destinationDatabasePath") or "")
    view_id = str(payload.get("viewId") or "")
    path_parts = destination.replace("\\", "/").split("/")
    path_ok = bool(
        view_id in {"nature", "alien-world"}
        and len(path_parts) >= 3
        and path_parts[0] == ".publisher-data"
        and path_parts[1] == view_id
        and ".." not in path_parts
        and not destination.startswith("/")
        and "\\" not in destination
    )
    if not path_ok:
        missing.append("destinationDatabasePath (must remain isolated under .publisher-data/<viewId>/)")

    # Bind the hashed Manager envelope to the currently registered View profile.
    # This is a configuration read only; Section 13 never opens the View DB.
    profile_ok = False
    try:
        profile_path = _ROOT / "global_collection_manager" / "config" / "view-collection-profiles.json"
        profiles_doc = json.loads(profile_path.read_text(encoding="utf-8"))
        profiles = [item for item in _l(profiles_doc.get("profiles"))
                    if isinstance(item, dict) and item.get("viewId") == view_id and item.get("enabled") is True]
        profile_ok = (
            len(profiles) == 1
            and payload.get("profileId") == profiles[0].get("profileId")
            and payload.get("destinationDatabaseId") == profiles[0].get("destinationDatabaseId")
            and payload.get("destinationDatabasePath") == profiles[0].get("destinationDatabasePath")
            and payload.get("collectorEntrypoint") == profiles[0].get("collectorEntrypoint")
            and payload.get("collectorWorkflow") == profiles[0].get("collectorWorkflow")
        )
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        profile_ok = False
    if not profile_ok:
        missing.append("Manager envelope does not match the enabled registered View profile")
    return payload, not missing and digest_ok and identity_ok and path_ok and profile_ok, missing


def _verify_one(
    report: dict[str, Any],
    sections: dict[str, Any],
    post_id: str,
    original_post: dict[str, Any],
    section11: dict[str, Any],
    section12: dict[str, Any],
    manager_job: dict[str, Any],
    manager_ok: bool,
    manager_missing: list[str],
    prior_hashes_ok: bool,
) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    sec9_map = _posts_by_id(_d(sections.get("imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission")), "Section 9")
    sec10_map = _posts_by_id(_d(sections.get("finalImageVerificationAndApproval")), "Section 10")
    sec8_map = _posts_by_id(_d(sections.get("imageApprovalChecks")), "Section 8")
    sec7_map = _posts_by_id(_d(sections.get("textApprovalChecks")), "Section 7")
    sec4_map = _posts_by_id(_d(sections.get("sourceRightsEvidence")), "Section 4")
    sec9 = sec9_map.get(post_id, {})
    sec10 = sec10_map.get(post_id, {})
    sec8 = sec8_map.get(post_id, {})
    sec7 = sec7_map.get(post_id, {})
    sec4_item = sec4_map.get(post_id, {})
    article = _article_for(_d(sections.get("fullArticle")), post_id)
    article_title = _editor._text(article.get("title") or article.get("headline"), 500)
    article_text = _editor._text(article.get("fullText") or article.get("fullArticleText") or article.get("text"))
    article_url = _editor._text(article.get("articleUrl") or article.get("canonicalUrl") or article.get("url"), 4000)

    eligible = (
        section11.get("releaseToEditorial") is True
        and section11.get("decision") == "APPROVE_FOR_EDITORIAL"
        and section11.get("editorialEligibility") == "EDITORIAL_READY"
    )
    correctly_held = (
        section11.get("releaseToEditorial") is not True
        and section11.get("decision") == "HOLD"
        and section11.get("editorialEligibility") == "HOLD"
        and section12.get("status") == "HOLD"
        and section12.get("liveFeed") is None
    )
    section11_checks = [x for x in _l(section11.get("checks")) if isinstance(x, dict)]
    section11_by_id = {str(x.get("checkId")): x for x in section11_checks}
    required_n11 = {f"N11-0{index}" for index in range(1, 7)}
    section11_checks_pass = (
        required_n11.issubset(section11_by_id)
        and all(
            section11_by_id[check_id].get("executed") == "YES"
            and section11_by_id[check_id].get("result") == "PASS"
            for check_id in required_n11
        )
        and all(x.get("executed") == "YES" and x.get("result") == "PASS" for x in section11_checks)
    )
    section11_audit = _d(section11.get("auditContinuation"))
    original_post_hash_ok = (
        bool(section11_audit.get("originalPostRecordSha256"))
        and section11_audit.get("originalPostRecordSha256") == _canonical_hash(original_post)
        and section11_audit.get("noPriorSectionRewritten") is True
        and section11_audit.get("originalPostRecordsUnchanged") is True
    )
    gate_consistent = original_post_hash_ok and (eligible and section11_checks_pass or correctly_held)
    checks.append(_check_bool(
        "C13-01", "Section 11 eligibility decision is preserved without promotion",
        gate_consistent,
        {"approved": "Section 11 release + all required checks PASS", "held": "Section 12 HOLD with no Live Feed object"},
        {"releaseToEditorial": section11.get("releaseToEditorial"), "decision": section11.get("decision"), "editorialEligibility": section11.get("editorialEligibility"), "checksPass": section11_checks_pass, "correctlyHeld": correctly_held, "originalPostHashMatches": original_post_hash_ok},
        "sections.postEngineAuditAndFinalDecision.posts[postId] + sections.liveFeedOutput.posts[postId]",
        "Section 11 status, check evidence, original post hash and Section 12 outcome are inconsistent.",
    ))

    if not eligible:
        checks.append(_check_bool(
            "C13-02", "A Section 11 held post remains blocked in Section 12",
            section12.get("status") == "HOLD" and section12.get("liveFeed") is None,
            {"status": "HOLD", "liveFeed": None},
            {"status": section12.get("status"), "liveFeedPresent": section12.get("liveFeed") is not None},
            "sections.liveFeedOutput.posts[postId]",
            "A held post may not be promoted by the Editor or later hand-off.",
        ))
        upstream_reasons = [
            {"checkId": item.get("checkId"), "result": item.get("result"), "reason": item.get("reason")}
            for item in _l(section11.get("reasons")) if isinstance(item, dict)
        ]
        checks.append(_check(
            "C13-UPSTREAM-HOLD", "Section 11 hold is carried forward without promotion",
            "HOLD", "post remains ineligible for database", upstream_reasons,
            "sections.postEngineAuditAndFinalDecision.posts[postId].reasons",
            "Section 11 did not release this post; it remains blocked regardless of downstream content.",
        ))
        return {
            "section": SECTION_NUMBER,
            "postId": post_id,
            "decision": "HOLD",
            "checks": checks,
            "upstreamHoldReasons": upstream_reasons,
            "reasons": [x["reason"] for x in checks if x["result"] != "PASS"] + [x.get("reason", "") for x in upstream_reasons],
            "checkSummary": {
                "total": len(checks),
                "passed": sum(x["result"] == "PASS" for x in checks),
                "failed": sum(x["result"] == "FAIL" for x in checks),
                "held": sum(x["result"] == "HOLD" for x in checks),
                "notApplicable": sum(x["result"] == "NOT_APPLICABLE" for x in checks),
                "mandatoryPassed": sum(x["mandatory"] and x["result"] == "PASS" for x in checks),
                "mandatoryTotal": sum(x["mandatory"] for x in checks),
            },
        }

    checks.append(_check_bool(
        "C13-02", "Section 12 produced one READY card for the approved post",
        section12.get("status") == "READY" and section12.get("section") == 12 and section12.get("postId") == post_id and isinstance(section12.get("liveFeed"), dict),
        {"section": 12, "postId": post_id, "status": "READY", "liveFeed": "object"},
        {"section": section12.get("section"), "postId": section12.get("postId"), "status": section12.get("status"), "liveFeedType": type(section12.get("liveFeed")).__name__},
        "sections.liveFeedOutput.posts[postId]",
        "The Editor output must match this exact approved post and be READY.",
    ))

    checks.append(_check_bool(
        "C13-03", "Section 2 permitted article and canonical source identity are present",
        bool(article_text and article_title and _url_key(article_url)),
        {"fullArticleText": "present", "headline": "present", "canonicalHTTPSUrl": "present"},
        {"fullArticleText": bool(article_text), "headline": article_title, "articleUrl": article_url},
        "sections.fullArticle.posts[postId]",
        "Section 2 must provide the permitted article text, original headline and valid HTTPS article URL.",
    ))

    section7_checks = [x for x in _l(sec7.get("checks")) if isinstance(x, dict)]
    section7_t09 = next((x for x in section7_checks if x.get("checkId") == "T09"), None)
    section7_article_permission_ok = bool(
        sec7.get("decision") == "YES"
        and sec7.get("approved") is True
        and section7_t09
        and section7_t09.get("executed") == "YES"
        and section7_t09.get("result") == "PASS"
        and all(x.get("executed") == "YES" and x.get("result") == "PASS" for x in section7_checks)
    )
    checks.append(_check_bool(
        "C13-18", "Section 7 explicitly approved full-article use and all text-rights checks passed",
        section7_article_permission_ok,
        {"decision": "YES", "fullArticlePermissionCheck": "T09 PASS", "allTextChecks": "PASS"},
        {"decision": sec7.get("decision"), "approved": sec7.get("approved"), "T09": section7_t09.get("result") if section7_t09 else "MISSING", "checksExecuted": len(section7_checks)},
        "sections.textApprovalChecks.posts[postId].checks[T09]",
        "Summary/feed permission does not substitute for explicit full-article processing permission.",
    ))

    live_headline = _editor._text(section12.get("headline"), 500)
    live_summary = _editor._text(section12.get("summary"))
    summary_recomputed = None
    summary_error = ""
    if article_text:
        try:
            summary_recomputed = _editor._make_live_summary(article_text, article_title)
        except Exception as exc:  # fail closed, retain reason in report
            summary_error = f"{type(exc).__name__}: {exc}"
    summary_exact = bool(summary_recomputed) and (
        live_summary == summary_recomputed.get("text")
        and section12.get("summarySha256") == _sha(live_summary)
        and section12.get("summarySha256") == summary_recomputed.get("summarySha256")
        and section12.get("summarySourceSha256") == summary_recomputed.get("sourceSha256")
        and section12.get("summaryWordCount") == len(live_summary.split())
        and section12.get("summaryWordCount") == summary_recomputed.get("wordCount")
        and section12.get("sentenceTrace") == summary_recomputed.get("sentenceTrace")
        and section12.get("summaryStatus") == summary_recomputed.get("status")
        and section12.get("summaryMethod") == summary_recomputed.get("method")
    )
    short_source_exception = bool(
        summary_recomputed
        and len(article_text.split()) <= _editor.SUMMARY_MAX
        and len(live_summary.split()) < _editor.SUMMARY_MIN
        and section12.get("summaryStatus") == "SOURCE_SHORT_NO_PADDING"
    )
    summary_range_ok = bool(
        summary_recomputed
        and 1 <= len(live_summary.split()) <= _editor.SUMMARY_MAX
        and (len(article_text.split()) <= _editor.SUMMARY_MAX or len(live_summary.split()) >= _editor.SUMMARY_MIN)
        and (not short_source_exception or live_summary == summary_recomputed.get("text"))
    )
    checks.append(_check_bool(
        "C13-04", "Summary is exact, source-ordered and hash-verifiable",
        summary_exact,
        {"verbatimSourceSentences": True, "originalOrder": True, "summarySha256": "matches", "sourceSha256": "matches", "sentenceTrace": "exact"},
        {"summaryExact": summary_exact, "recomputeError": summary_error, "summarySha256": section12.get("summarySha256"), "sourceSha256": section12.get("summarySourceSha256"), "traceEntries": len(_l(section12.get("sentenceTrace")))},
        "sections.liveFeedOutput.posts[postId].sentenceTrace",
        "Summary differs from the deterministic source-locked Editor output or its sentence trace/hash is incomplete.",
    ))
    checks.append(_check_bool(
        "C13-05", "Summary word count follows the Live Feed limits and short-source exception",
        summary_range_ok,
        {"minimum": 100, "maximum": 150, "shortSource": "preserve without padding"},
        {"sourceWords": len(article_text.split()), "summaryWords": len(live_summary.split()), "shortSourceException": short_source_exception, "status": section12.get("summaryStatus")},
        "sections.liveFeedOutput.posts[postId].summaryWordCount",
        "Long sources require 100–150 words; short permitted sources must remain unpadded and source-locked.",
    ))
    checks.append(_check_bool(
        "C13-06", "Original headline and canonical article URL are preserved",
        live_headline == article_title and section12.get("sourceUrl") == article_url,
        {"headline": article_title, "sourceUrl": article_url},
        {"headline": live_headline, "sourceUrl": section12.get("sourceUrl")},
        "sections.liveFeedOutput.posts[postId]",
        "The Live Feed headline or source URL differs from Section 2.",
    ))

    sec10_pass, sec10_counts = _section10_all_pass(sec10)
    sec9_final = _d(sec9.get("finalImage"))
    expected_image_url = _editor._text(sec9_final.get("sourceImageUrl") or sec9_final.get("imageUrl"), 4000)
    expected_image_hash = _editor._text(sec9_final.get("sha256"), 128).lower()
    image_url_match = bool(
        sec10.get("decision") == "YES"
        and sec10.get("approved") is True
        and sec10.get("candidateUrl") == expected_image_url
        and sec10.get("candidateSha256") == expected_image_hash
        and re.fullmatch(r"[a-f0-9]{64}", expected_image_hash)
    )
    checks.append(_check_bool(
        "C13-07", "Section 10 approves the exact Section 9 final image URL and SHA-256",
        image_url_match and sec10_pass,
        {"decision": "YES", "approved": True, "candidateUrl": expected_image_url, "candidateSha256": expected_image_hash, "allChecks": "PASS"},
        {"decision": sec10.get("decision"), "approved": sec10.get("approved"), "candidateUrl": sec10.get("candidateUrl"), "candidateSha256": sec10.get("candidateSha256"), "allChecksPass": sec10_pass, "checkCounts": sec10_counts},
        "sections.finalImageVerificationAndApproval.posts[postId]",
        "Section 10 must pass every recorded check and approve the exact Section 9 final image bytes and URL.",
    ))

    expected_image: dict[str, Any] | None = None
    expected_private: dict[str, Any] | None = None
    image_error = ""
    try:
        assembled = _editor._image_for_live(sec9, sec10, sec8)
        expected_image = assembled["public"]
        expected_private = assembled["privateProcessing"]
    except Exception as exc:
        image_error = f"{type(exc).__name__}: {exc}"
    image_exact = bool(expected_image is not None) and (
        section12.get("image") == expected_image
        and section12.get("privateImageProcessing") == expected_private
        and _d(_d(section12.get("liveFeed")).get("image")) == expected_image
    )
    image_obj = _d(section12.get("image"))
    image_metadata_complete = bool(
        image_obj.get("mediaId")
        and image_obj.get("url") == expected_image_url
        and image_obj.get("sha256") == expected_image_hash
        and image_obj.get("creator")
        and image_obj.get("credit")
        and (image_obj.get("caption") or image_obj.get("altText"))
        and (image_obj.get("licenseName") or image_obj.get("licenseUrl"))
        and image_obj.get("sourcePage")
    )
    checks.append(_check_bool(
        "C13-08", "Section 12 carries the exact approved image and unchanged metadata",
        image_exact,
        {"image": "exact Section 9/10 public image object", "privateProcessing": "unchanged Section 9 staged reference"},
        {"imageExact": image_exact, "imageError": image_error, "imageUrl": image_obj.get("url"), "imageSha256": image_obj.get("sha256")},
        "sections.liveFeedOutput.posts[postId].image",
        "Image URL, hash, candidate identity, metadata or staged reference changed between Sections 9–12.",
    ))
    checks.append(_check_bool(
        "C13-09", "Image creator, credit, caption/alt text, rights basis and source page are present",
        image_metadata_complete and sec8.get("decision") == "YES" and sec8.get("approved") is True,
        {"creator": "present", "credit": "present", "captionOrAltText": "present", "license": "present", "sourcePage": "present", "section8": "YES"},
        {"creator": bool(image_obj.get("creator")), "credit": bool(image_obj.get("credit")), "caption": bool(image_obj.get("caption")), "altText": bool(image_obj.get("altText")), "license": bool(image_obj.get("licenseName") or image_obj.get("licenseUrl")), "sourcePage": bool(image_obj.get("sourcePage")), "section8Decision": sec8.get("decision")},
        "sections.imageApprovalChecks.posts[postId] + sections.liveFeedOutput.posts[postId].image",
        "Image rights approval or required creator/credit/caption/accessibility/licence/source attribution is missing.",
    ))

    section4_rights = _d(sec4_item.get("sourceRightsEvidence")) or sec4_item
    rights_rows = [x for x in _l(section4_rights.get("imageRightsEvidence")) if isinstance(x, dict)]
    image_id = _s(expected_image.get("mediaId") if expected_image else "")
    rights_match = any(
        (expected_image_url and _s(x.get("originalUrl") or x.get("url")) == expected_image_url)
        or (image_id and _s(x.get("mediaId")) == image_id)
        for x in rights_rows
    )
    checks.append(_check_bool(
        "C13-10", "Section 4 image rights evidence is linked to the exact final candidate",
        rights_match,
        {"exactImageUrlOrMediaIdMatch": True},
        {"matched": rights_match, "candidateUrl": expected_image_url, "mediaId": image_id, "evidenceRecords": len(rights_rows)},
        "sections.sourceRightsEvidence.posts[postId].imageRightsEvidence",
        "No Section 4 rights evidence is linked to this exact selected image URL or mediaId.",
    ))

    sec9_lineage = _d(sec9.get("lineage"))
    section4_source = _d(sec4_item.get("sourceRightsEvidence")) or sec4_item
    source_identity = _d(section4_source.get("sourceIdentity"))
    original_source_id = _s(original_post.get("sourceId"), 160)
    section4_source_id = _s(source_identity.get("sourceId") or section4_source.get("sourceId"), 160)
    image_lineage_source_id = _s(sec9_lineage.get("sourceId"), 160)
    manager_source_ids = {_s(value, 160) for value in _l(manager_job.get("sourceIds"))}
    source_lineage_ok = bool(
        original_source_id
        and original_source_id == section4_source_id == image_lineage_source_id
        and original_source_id in manager_source_ids
    )
    lineage_ok = (
        sec9_lineage.get("postId") == post_id
        and sec9_lineage.get("jobId") == report.get("jobId")
        and sec9_lineage.get("viewId") == report.get("viewId")
        and _d(sec9_lineage.get("managerJob")) == manager_job
        and source_lineage_ok
    )
    checks.append(_check_bool(
        "C13-11", "Manager job, View, source and image lineage remain consistent",
        lineage_ok and manager_ok and prior_hashes_ok and original_post_hash_ok,
        {"jobId": report.get("jobId"), "viewId": report.get("viewId"), "postId": post_id, "sourceId": "matches Collector, Section 4, Section 9 and Manager sourceIds", "managerEnvelope": "matches active profile and hash", "Section1To9Hashes": "match"},
        {"jobId": sec9_lineage.get("jobId"), "viewId": sec9_lineage.get("viewId"), "postId": sec9_lineage.get("postId"), "sourceId": {"collector": original_source_id, "section4": section4_source_id, "section9": image_lineage_source_id, "managerContainsSource": original_source_id in manager_source_ids}, "managerEnvelopeMatches": _d(sec9_lineage.get("managerJob")) == manager_job, "managerMissingFields": manager_missing, "priorSectionHashesMatch": prior_hashes_ok, "originalPostHashMatches": original_post_hash_ok},
        "sections.managerIdCard + sections.postEngineAuditAndFinalDecision.posts[postId].auditContinuation + sections.imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission.posts[postId].lineage",
        "Manager identity, post lineage, or immutable Section 1–9 audit hash does not match.",
    ))

    live_feed = _d(section12.get("liveFeed"))
    writer_fields = {
        "title": bool(live_feed.get("title")),
        "summary": bool(live_feed.get("summary")),
        "sourceUrl": bool(_url_key(live_feed.get("sourceUrl"))),
        "sourceName": bool(live_feed.get("sourceName")),
        "image": bool(image_obj.get("url") and image_obj.get("sha256")),
        "managerEnvelope": manager_ok,
    }
    writer_fields_ok = all(writer_fields.values())
    checks.append(_check_bool(
        "C13-12", "Minimum story hand-off fields and View destination identity are present",
        writer_fields_ok,
        {"allFields": "present", "managerDestination": "valid and View-isolated"},
        {"fields": writer_fields, "destinationDatabaseId": manager_job.get("destinationDatabaseId"), "destinationDatabasePath": manager_job.get("destinationDatabasePath")},
        "Section1 Manager ID Card + Section12 Live Feed card",
        "A minimum story field or matching View destination identity is missing; the separate legacy Writer adapter is still required.",
    ))

    live_feed_consistency = (
        live_feed.get("title") == section12.get("headline")
        and live_feed.get("summary") == section12.get("summary")
        and live_feed.get("sourceUrl") == section12.get("sourceUrl")
        and _d(live_feed.get("image")) == image_obj
    )
    expected_references = {
        "section2": "fullArticle",
        "section8": "imageApprovalChecks",
        "section9": "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission",
        "section10": "finalImageVerificationAndApproval",
        "section11": "postEngineAuditAndFinalDecision",
    }
    refs_ok = section12.get("inputReferences") == expected_references
    checks.append(_check_bool(
        "C13-13", "Public Live Feed object agrees with the verified Section 12 fields and input lineage",
        live_feed_consistency and refs_ok,
        {"titleSummarySourceImage": "identical", "inputReferences": expected_references},
        {"consistent": live_feed_consistency, "inputReferencesMatch": refs_ok},
        "sections.liveFeedOutput.posts[postId].liveFeed",
        "The nested Live Feed object differs from the verified Section 12 fields.",
    ))

    risk_flags = _risk_flags(original_post, section11, section12, article)
    checks.append(_check_bool(
        "C13-14", "No explicit safety, privacy, rights or policy hold flag is present",
        not risk_flags,
        {"explicitRiskFlags": 0},
        {"explicitRiskFlags": risk_flags},
        "original Checker post + Sections 2, 11 and 12",
        "An upstream safety/privacy/rights/policy flag requires human review; post is held.",
    ))

    raw_text_keys = {"text", "fulltext", "fullarticletext", "articletext", "rawtext", "articlebody", "body"}
    raw_text_fields: list[str] = []
    def scan_raw_fields(node: Any, prefix: str = "section12") -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                key_norm = re.sub(r"[^a-z]", "", str(key).casefold())
                location = f"{prefix}.{key}"
                if key_norm in raw_text_keys and isinstance(value, str) and value.strip():
                    raw_text_fields.append(location)
                scan_raw_fields(value, location)
        elif isinstance(node, list):
            for index, value in enumerate(node):
                scan_raw_fields(value, f"{prefix}[{index}]")
    scan_raw_fields(section12)
    checks.append(_check_bool(
        "C13-17", "Section 12 contains no raw full-article body leakage",
        not raw_text_fields,
        {"rawArticleBodyFields": 0},
        {"rawArticleBodyFields": raw_text_fields},
        "sections.liveFeedOutput.posts[postId]",
        "Raw source article body fields must remain in the permitted Checker hand-off and not leak into Section 12.",
    ))

    pii_material = " ".join((live_headline, live_summary, _editor._text(image_obj.get("altText")), _editor._text(image_obj.get("caption"))))
    possible_pii = {
        "emailAddresses": _PII_EMAIL.findall(pii_material),
        "phoneNumbers": _PII_PHONE.findall(pii_material),
    }
    pii_clear = not any(possible_pii.values())
    checks.append(_check_bool(
        "C13-19", "Live summary contains no obvious personal email address or phone number",
        pii_clear,
        {"emailAddresses": 0, "phoneNumbers": 0},
        {"emailAddresses": len(possible_pii["emailAddresses"]), "phoneNumbers": len(possible_pii["phoneNumbers"])},
        "sections.liveFeedOutput.posts[postId].summary",
        "Possible personal contact information requires human review before database release.",
    ))

    checks.append(_check(
        "C13-15", "Independent semantic fact-check of the underlying source claims",
        "NOT_APPLICABLE",
        "No independent semantic fact-check is claimed by this deterministic verifier.",
        {"performed": False, "summaryMethod": section12.get("summaryMethod")},
        "Section 13 capability boundary",
        "The verifier checks exact source provenance and does not represent source claims as independently proven.",
        mandatory=False,
    ))

    decision = "APPROVE_FOR_DATABASE" if all(
        item.get("result") == "PASS" for item in checks if item.get("mandatory") is True
    ) and all(item.get("result") not in {"FAIL", "HOLD"} for item in checks) else "HOLD"
    return {
        "section": SECTION_NUMBER,
        "postId": post_id,
        "decision": decision,
        "checks": checks,
        "checkSummary": {
            "total": len(checks),
            "passed": sum(x["result"] == "PASS" for x in checks),
            "failed": sum(x["result"] == "FAIL" for x in checks),
            "held": sum(x["result"] == "HOLD" for x in checks),
            "notApplicable": sum(x["result"] == "NOT_APPLICABLE" for x in checks),
            "mandatoryPassed": sum(x["mandatory"] and x["result"] == "PASS" for x in checks),
            "mandatoryTotal": sum(x["mandatory"] for x in checks),
        },
        "reasons": [
            {"checkId": x["checkId"], "result": x["result"], "reason": x["reason"]}
            for x in checks if x["result"] != "PASS"
        ],
    }


def finalize_post_editorial_review(checker_report: dict[str, Any]) -> dict[str, Any]:
    """Append Section 13 to the same Global Checker report after Section 12.

    Existing Sections 1–12, original post records, and other pre-existing report
    fields are deep-copied and compared before return. No source object is
    mutated, and Section 13 itself never calls the Writer or Publisher.
    """
    if not isinstance(checker_report, dict):
        raise Section13Error("Global Checker report must be an object.")
    if checker_report.get("schemaVersion") != 2:
        raise Section13Error("Section 13 requires Global Checker schemaVersion 2.")
    if checker_report.get("checker") != CHECKER_NAME or checker_report.get("checkerVersion") != CHECKER_VERSION:
        raise Section13Error("Section 13 must continue the existing Global Checker v2.1.1 identity.")
    sections_in = checker_report.get("sections")
    order_in = checker_report.get("sectionOrder")
    if not isinstance(sections_in, dict) or not isinstance(order_in, list):
        raise Section13Error("Sections and sectionOrder must be present.")
    if SECTION_KEY in sections_in or SECTION_KEY in order_in:
        raise Section13Error("Section 13 already exists; overwrite is prohibited.")
    missing = [key for key in REQUIRED_SECTION_KEYS if key not in sections_in]
    if missing:
        raise Section13Error("Completed Sections 1–12 are required: " + ", ".join(missing))
    if list(order_in) != list(REQUIRED_SECTION_KEYS):
        raise Section13Error("Section order must contain Sections 1–12 exactly once and in order.")
    if len(sections_in) != 12:
        raise Section13Error("Section 13 requires exactly 12 existing section cards; unexpected cards are not accepted.")

    frozen_sections = copy.deepcopy(sections_in)
    frozen_posts = copy.deepcopy(_l(checker_report.get("posts")))
    frozen_other = {k: copy.deepcopy(v) for k, v in checker_report.items() if k not in {"sections", "sectionOrder"}}

    manager_job, manager_ok, manager_missing = _manager_context(checker_report, sections_in)
    section11_card = _d(sections_in.get("postEngineAuditAndFinalDecision"))
    section12_card = _d(sections_in.get(SECTION12_KEY))
    section11_map = _posts_by_id(section11_card, "Section 11")
    section12_map = _posts_by_id(section12_card, "Section 12")
    report_posts = [_s(_d(item).get("postId"), 200) for item in frozen_posts]
    if any(not item for item in report_posts) or len(report_posts) != len(set(report_posts)):
        raise Section13Error("Original Checker posts must have unique, non-empty postId values.")
    if set(report_posts) != set(section11_map) or set(report_posts) != set(section12_map):
        raise Section13Error("Sections 11 and 12 must contain exactly the original Checker post identities.")
    if section11_card.get("section") != 11 or section12_card.get("section") != 12:
        raise Section13Error("Section 11 and Section 12 cards must retain their registered section numbers.")

    section12_ready = sum(item.get("status") == "READY" for item in section12_map.values())
    section12_held = sum(item.get("status") == "HOLD" for item in section12_map.values())
    section11_approved = sum(item.get("releaseToEditorial") is True for item in section11_map.values())
    section11_held = len(section11_map) - section11_approved
    sec11_stats = _d(section11_card.get("statistics"))
    sec12_stats = _d(section12_card.get("statistics"))
    section_stats_match = (
        sec11_stats.get("postsReviewed") == len(section11_map)
        and sec11_stats.get("approvedForEditorial") == section11_approved
        and sec11_stats.get("held") == section11_held
        and sec12_stats.get("checkerPostsReceived") == len(section12_map)
        and sec12_stats.get("liveFeedPackagesReady") == section12_ready
        and sec12_stats.get("postsHeld") == section12_held
        and section12_ready + section12_held == len(section12_map)
        and section12_ready <= section11_approved
        and section12_held >= section11_held
    )

    # Verify Section 1–9 hashes preserved by each Section 11 continuation.
    prior_keys = REQUIRED_SECTION_KEYS[:9]
    expected_hashes = {key: _canonical_hash(sections_in[key]) for key in prior_keys}
    prior_hashes_ok_by_post: dict[str, bool] = {}
    for post_id, section11_post in section11_map.items():
        recorded = _d(_d(section11_post.get("auditContinuation")).get("priorSectionHashes"))
        prior_hashes_ok_by_post[post_id] = bool(recorded) and all(
            recorded.get(key) == expected_hashes[key] for key in prior_keys
        )

    # Canonical duplicate article URLs are blocked before any item is released.
    url_to_posts: dict[str, list[str]] = {}
    for post_id, item in section12_map.items():
        key = _url_key(item.get("sourceUrl"))
        if key:
            url_to_posts.setdefault(key, []).append(post_id)
    duplicate_urls = {url: ids for url, ids in url_to_posts.items() if len(ids) > 1}
    duplicate_posts = {post_id for ids in duplicate_urls.values() for post_id in ids}

    final_posts = []
    for post_id in report_posts:
        verified = _verify_one(
            checker_report,
            sections_in,
            post_id,
            next(item for item in frozen_posts if _s(_d(item).get("postId"), 200) == post_id),
            section11_map[post_id],
            section12_map[post_id],
            manager_job,
            manager_ok,
            manager_missing,
            prior_hashes_ok_by_post.get(post_id, False),
        )
        duplicate_check = _check_bool(
            "C13-16", "Post ID and canonical article URL are unique within this batch",
            post_id not in duplicate_posts,
            "one post per canonical article URL",
            {"postId": post_id, "duplicateCanonicalUrls": duplicate_urls},
            "original Checker posts + Section 12 sourceUrl",
            "Two posts in the same batch resolve to the same canonical article URL.",
        )
        verified["checks"].append(duplicate_check)
        if duplicate_check["result"] != "PASS":
            verified["decision"] = "HOLD"
            verified["reasons"].append({"checkId": duplicate_check["checkId"], "result": duplicate_check["result"], "reason": duplicate_check["reason"]})
        def _check_sort_key(item: dict[str, Any]) -> tuple[int, int, str]:
            match = re.fullmatch(r"C13-(\d+)", str(item.get("checkId") or ""))
            if match:
                return (0, int(match.group(1)), "")
            return (1, 0, str(item.get("checkId") or ""))

        verified["checks"].sort(key=_check_sort_key)
        verified["checkSummary"] = {
            "total": len(verified["checks"]),
            "passed": sum(x["result"] == "PASS" for x in verified["checks"]),
            "failed": sum(x["result"] == "FAIL" for x in verified["checks"]),
            "held": sum(x["result"] == "HOLD" for x in verified["checks"]),
            "notApplicable": sum(x["result"] == "NOT_APPLICABLE" for x in verified["checks"]),
            "mandatoryPassed": sum(x["mandatory"] and x["result"] == "PASS" for x in verified["checks"]),
            "mandatoryTotal": sum(x["mandatory"] for x in verified["checks"]),
        }
        final_posts.append(verified)

    approved = sum(x.get("decision") == "APPROVE_FOR_DATABASE" for x in final_posts)
    held = len(final_posts) - approved
    check_counts = {
        result: sum(check.get("result") == result for post in final_posts for check in _l(post.get("checks")))
        for result in ("PASS", "FAIL", "HOLD", "NOT_APPLICABLE")
    }
    output = copy.deepcopy(checker_report)
    output["sections"][SECTION_KEY] = {
        "section": SECTION_NUMBER,
        "title": "Post-Editorial Final Verification",
        "owner": CHECKER_NAME,
        "checkerVersion": CHECKER_VERSION,
        "createdAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "posts": final_posts,
        "statistics": {
            "postsReceived": len(final_posts),
            "approvedForDatabase": approved,
            "held": held,
            "checks": check_counts,
        },
        "managerWriterContract": {
            "requiredManagerFields": list(WRITER_MANAGER_FIELDS),
            "managerEnvelopeCompleteAndHashed": manager_ok,
            "missingManagerFields": manager_missing,
        },
        "ownership": {
            "sections1To12Modified": False,
            "originalCheckerPostRecordsModified": False,
            "databaseOpenedOrWritten": False,
            "archiveWritten": False,
            "publicationPerformed": False,
            "sourceWebsitesFetched": False,
            "imagesDownloadedOrReplaced": False,
            "semanticFactCheckingClaimed": False,
        },
        "releaseRule": "APPROVE_FOR_DATABASE only when every mandatory check is PASS and no check is FAIL or HOLD; all other posts remain HOLD.",
        "nextSystem": "View-isolated Writer adapter (must enforce Section 13 decisions)",
    }
    output["sectionOrder"] = list(order_in) + [SECTION_KEY]

    sections_unchanged = all(output["sections"].get(key) == frozen_sections[key] for key in REQUIRED_SECTION_KEYS)
    posts_unchanged = output.get("posts") == frozen_posts
    other_unchanged = all(output.get(key) == value for key, value in frozen_other.items())
    if not (sections_unchanged and posts_unchanged and other_unchanged):
        raise Section13Error("Append-only integrity guard failed; Sections 1–12 and prior report fields must remain unchanged.")
    output["sections"][SECTION_KEY]["integrityChecks"] = [
        _check_bool("C13-G01", "Sections 1–12 remain unchanged", sections_unchanged,
                    "identical pre/post JSON values", sections_unchanged,
                    "Sections 1–12 snapshot", "A prior section changed during Section 13 append."),
        _check_bool("C13-G02", "Original Checker post records remain unchanged", posts_unchanged,
                    "identical pre/post JSON values", posts_unchanged,
                    "original Checker posts snapshot", "An original Checker post record changed during Section 13 append."),
        _check_bool("C13-G03", "Prior report metadata remains unchanged", other_unchanged,
                    "identical pre/post JSON values", other_unchanged,
                    "top-level report snapshot", "A pre-existing top-level report field changed during Section 13 append."),
        _check_bool("C13-G04", "Section 11 and 12 aggregate statistics reconcile", section_stats_match,
                    {"section11Approved": section11_approved, "section11Held": section11_held,
                     "section12Ready": section12_ready, "section12Held": section12_held},
                    {"section11Statistics": sec11_stats, "section12Statistics": sec12_stats},
                    "Sections 11 and 12 aggregate statistics", "Section-level counts do not reconcile with their itemised post records."),
    ]
    global_failed = any(x["result"] != "PASS" for x in output["sections"][SECTION_KEY]["integrityChecks"])
    output["sections"][SECTION_KEY]["statistics"]["reportIntegrityChecks"] = {
        "passed": sum(x["result"] == "PASS" for x in output["sections"][SECTION_KEY]["integrityChecks"]),
        "failed": sum(x["result"] != "PASS" for x in output["sections"][SECTION_KEY]["integrityChecks"]),
    }
    if global_failed:
        for item in output["sections"][SECTION_KEY]["posts"]:
            item["decision"] = "HOLD"
            item.setdefault("checks", []).append(_check_bool(
                "C13-GLOBAL", "Report-level Section 11/12 statistics reconcile",
                False, "all aggregate counts reconcile", section_stats_match,
                "Sections 11 and 12 aggregate statistics",
                "A report-level integrity/statistics check failed; all posts are held.",
            ))
            item.setdefault("reasons", []).append({"checkId": "C13-GLOBAL", "result": "FAIL", "reason": "A report-level integrity/statistics check failed."})
            item["checks"].sort(key=lambda entry: (0, int(re.fullmatch(r"C13-(\d+)", str(entry.get("checkId") or "")).group(1)), "") if re.fullmatch(r"C13-(\d+)", str(entry.get("checkId") or "")) else (1, 0, str(entry.get("checkId") or "")))
            item["checkSummary"] = {
                "total": len(item["checks"]),
                "passed": sum(x["result"] == "PASS" for x in item["checks"]),
                "failed": sum(x["result"] == "FAIL" for x in item["checks"]),
                "held": sum(x["result"] == "HOLD" for x in item["checks"]),
                "notApplicable": sum(x["result"] == "NOT_APPLICABLE" for x in item["checks"]),
                "mandatoryPassed": sum(x["mandatory"] and x["result"] == "PASS" for x in item["checks"]),
                "mandatoryTotal": sum(x["mandatory"] for x in item["checks"]),
            }
        output["sections"][SECTION_KEY]["statistics"]["approvedForDatabase"] = 0
        output["sections"][SECTION_KEY]["statistics"]["held"] = len(final_posts)
        output["sections"][SECTION_KEY]["statistics"]["checks"] = {
            result: sum(check.get("result") == result for post in output["sections"][SECTION_KEY]["posts"] for check in post.get("checks", []))
            for result in ("PASS", "FAIL", "HOLD", "NOT_APPLICABLE")
        }

    # A report-level append integrity failure must block every story.
    if not (sections_unchanged and posts_unchanged and other_unchanged):  # pragma: no cover - defensive
        for item in output["sections"][SECTION_KEY]["posts"]:
            item["decision"] = "HOLD"
    return output


def _global_checker_section13_method(self: GlobalChecker, checker_report: dict[str, Any]) -> dict[str, Any]:
    """Runtime continuation method attached to the existing GlobalChecker class."""
    return finalize_post_editorial_review(checker_report)


def register_section13_continuation() -> None:
    """Attach Section 13 to the existing Checker class without creating a new Checker."""
    setattr(GlobalChecker, "finalize_post_editorial_review", _global_checker_section13_method)


# Importing this continuation makes the method available on the registered
# GlobalChecker class used for Sections 1–11. The same class/identity owns 13.
register_section13_continuation()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checker-report-file", required=True, help="Completed 12-section Checker + Live Feed Editor report.")
    parser.add_argument("--output-file", help="Optional output JSON; defaults to standard output.")
    args = parser.parse_args(argv)
    try:
        source = json.loads(Path(args.checker_report_file).read_text(encoding="utf-8"))
        result = finalize_post_editorial_review(source)
        payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        if args.output_file:
            Path(args.output_file).write_text(payload, encoding="utf-8")
        else:
            sys.stdout.write(payload)
        return 0
    except Exception as exc:
        json.dump({
            "checker": CHECKER_NAME,
            "checkerVersion": CHECKER_VERSION,
            "phase": "post-editorial-final-verification-blocked",
            "databaseWriteAttempted": False,
            "publicationPerformed": False,
            "errorType": type(exc).__name__,
            "message": str(exc)[:900],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

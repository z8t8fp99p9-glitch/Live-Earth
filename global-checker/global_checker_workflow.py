#!/usr/bin/env python3
"""Additive intake and editorial-review workflow for LIVE // EARTH Global Checker.

This module extends the existing global_checker.py authority. It is not a
second Checker and defines no source rights. All source, text and image policy
decisions continue to come from global-checker/source-registry.json.

No network fetching, source collection, editorial writing, image generation,
Publisher output, database discovery or independent database opening occurs.
A caller supplies the one View-owned SQLite connection when audit persistence
is required.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from pathlib import Path, PurePosixPath
from typing import Any, Iterable
from urllib.parse import urlsplit
import hashlib
import json
import re
import sqlite3
import uuid

import global_checker as checker
import global_checker_policy_engine

global_checker_policy_engine.install(checker)

WORKFLOW_NAME = "LIVE // EARTH Global Checker"
WORKFLOW_VERSION = "2.0.0"
AUDIT_TABLE = "global_checker_workflow_reviews"

PERMISSION_NAMES = (
    "temporaryProcessing",
    "transformation",
    "derivedOutputStorage",
    "derivedOutputDisplay",
    "rawTextStorage",
    "headingLinkUse",
)
PERMISSION_STATES = {"allowed", "prohibited", "conditional", "unknown"}
EDITORIAL_REQUIRED_PERMISSIONS = (
    "temporaryProcessing",
    "transformation",
    "derivedOutputStorage",
    "derivedOutputDisplay",
)

STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "being", "by", "for",
    "from", "has", "have", "in", "into", "is", "it", "its", "of", "on", "or",
    "that", "the", "their", "this", "to", "was", "were", "will", "with",
    "according", "reported", "reports", "says", "said", "new", "latest",
}
RAW_TEXT_FIELDS = {
    "rawText", "raw_text", "rawArticleBody", "raw_article_body",
    "sourceText", "source_text", "fullArticleText", "full_article_text",
}


class GlobalCheckerWorkflowError(RuntimeError):
    """The Checker could not safely validate a collection or editorial package."""


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _clean(value: Any, limit: int = 6000) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def _read_json(path: Path, label: str) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise GlobalCheckerWorkflowError(f"{label} could not be read: {exc}") from exc
    if not isinstance(data, dict):
        raise GlobalCheckerWorkflowError(f"{label} must contain a JSON object.")
    return data


def _hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _canonical_url(value: Any) -> str:
    try:
        parsed = urlsplit(str(value or "").strip())
        if (
            parsed.scheme.lower() != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.port not in (None, 443)
        ):
            return ""
        host = parsed.hostname.lower().rstrip(".")
        path = parsed.path or "/"
        query = "&".join(
            part for part in parsed.query.split("&")
            if part and not part.split("=", 1)[0].lower().startswith("utm_")
            and part.split("=", 1)[0].lower() not in {"fbclid", "gclid", "mc_cid", "mc_eid"}
        )
        return f"https://{host}{path}" + (f"?{query}" if query else "")
    except (TypeError, ValueError):
        return ""


def _tokens(value: Any) -> set[str]:
    return {
        token for token in re.findall(r"[a-z0-9]+", _clean(value, 12000).casefold())
        if len(token) > 1 and token not in STOP_WORDS
    }


def _title_similarity(left: str, right: str) -> float:
    a, b = _tokens(left), _tokens(right)
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _permission_state(value: Any) -> str:
    if isinstance(value, bool):
        return "allowed" if value else "prohibited"
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "allow": "allowed", "yes": "allowed", "true": "allowed",
        "deny": "prohibited", "denied": "prohibited", "no": "prohibited",
        "false": "prohibited", "pending": "unknown", "not_reviewed": "unknown",
        "unknown": "unknown", "conditional": "conditional",
        "allowed": "allowed", "prohibited": "prohibited",
    }
    return aliases.get(text, "unknown")


def resolve_text_permissions(policy: dict[str, Any]) -> dict[str, Any]:
    """Read the exact permission dimensions; never infer missing rights.

    Existing allowTransform is an explicit transformation permission and is
    retained for backward compatibility. The older allowStorage and
    allowDisplay fields are intentionally NOT translated into the distinct
    derived-output/raw-text permissions required by the Newsroom blueprint.
    """
    text_policy = policy.get("text", {})
    declared = text_policy.get("usePermissions", {})
    if not isinstance(declared, dict):
        declared = {}

    result = {
        name: _permission_state(declared.get(name))
        for name in PERMISSION_NAMES
    }

    if "transformation" not in declared and isinstance(text_policy.get("allowTransform"), bool):
        result["transformation"] = _permission_state(text_policy["allowTransform"])

    if (
        "headingLinkUse" not in declared
        and text_policy.get("mode") == "headline-link-only"
    ):
        result["headingLinkUse"] = "allowed"

    required = [result[name] for name in EDITORIAL_REQUIRED_PERMISSIONS]
    if "prohibited" in required:
        overall = "prohibited"
    elif "conditional" in required:
        overall = "conditional"
    elif all(value == "allowed" for value in required):
        overall = "allowed"
    else:
        overall = "unknown"

    return {
        **result,
        "editorialPermissionStatus": overall,
        "rawTextRetentionByGlobalChecker": "never",
        "sourcePermissionRecord": "global-checker/source-registry.json",
        "notes": [
            "Missing permission dimensions remain UNKNOWN.",
            "Legacy allowStorage/allowDisplay do not automatically grant derived-output or raw-text storage permission.",
            "Raw source text is not persisted by this Checker workflow.",
        ],
    }


class RepositoryPolicies:
    """Read-only cross-reference to Manager subscriptions and Checker permissions."""

    def __init__(self, repository_root: Path):
        self.root = Path(repository_root).resolve()
        manager = self.root / "global_collection_manager" / "config"
        self.sources_doc = _read_json(manager / "source-registry.json", "Manager Source Registry")
        self.profiles_doc = _read_json(manager / "view-collection-profiles.json", "Manager View Collection Profiles")
        self.assignments_doc = _read_json(manager / "source-view-assignments.json", "Manager Source-View Assignments")
        self.checker_registry = checker.load_registry()

        if self.sources_doc.get("schemaVersion") != 1:
            raise GlobalCheckerWorkflowError("Manager Source Registry schema is unsupported.")
        if self.profiles_doc.get("schemaVersion") != 1:
            raise GlobalCheckerWorkflowError("Manager View Collection Profiles schema is unsupported.")
        if self.assignments_doc.get("schemaVersion") != 1:
            raise GlobalCheckerWorkflowError("Manager Source-View Assignments schema is unsupported.")

        self.sources = {item["sourceId"]: item for item in self.sources_doc.get("sources", [])}
        self.profiles = {item["viewId"]: item for item in self.profiles_doc.get("profiles", [])}
        self.assignments = self.assignments_doc.get("assignments", [])
        self.policies = {
            item["policyId"]: item for item in self.checker_registry.get("policies", [])
        }

        if not self.sources or not self.profiles or not self.policies:
            raise GlobalCheckerWorkflowError("One or more central registries are empty or incomplete.")


def _job_assignments(job: dict[str, Any], context: RepositoryPolicies) -> tuple[dict[str, Any], dict[str, Any]]:
    view_id = _clean(job.get("viewId"), 100)
    profile = context.profiles.get(view_id)
    if not profile or profile.get("enabled") is not True:
        raise GlobalCheckerWorkflowError(f"No enabled Collection Profile exists for View '{view_id}'.")
    if job.get("profileId") != profile.get("profileId"):
        raise GlobalCheckerWorkflowError("Manager job profile ID does not match the registered View profile.")
    if job.get("collectorEntrypoint") != profile.get("collectorEntrypoint"):
        raise GlobalCheckerWorkflowError("Manager job Collector entry point does not match the View profile.")
    if job.get("collectorWorkflow") != profile.get("collectorWorkflow"):
        raise GlobalCheckerWorkflowError("Manager job workflow does not match the View profile.")
    if job.get("destinationDatabaseId") != profile.get("destinationDatabaseId"):
        raise GlobalCheckerWorkflowError("Manager job database identity does not match the View profile.")
    expected_db = str(profile.get("destinationDatabasePath", ""))
    received_db = str(job.get("destinationDatabasePath", ""))
    db_parts = PurePosixPath(received_db).parts
    if (
        received_db != expected_db
        or "\\" in received_db
        or PurePosixPath(received_db).is_absolute()
        or any(part in ("", ".", "..") for part in db_parts)
        or len(db_parts) < 3
        or db_parts[0] != ".publisher-data"
        or db_parts[1] != view_id
    ):
        raise GlobalCheckerWorkflowError("Manager job destination is not the exact View-owned database path.")

    enabled = {
        item["assignmentId"]: item
        for item in context.assignments
        if item.get("viewId") == view_id and item.get("enabled") is True
    }
    job_assignment_ids = sorted(set(job.get("assignmentIds") or []))
    if not job_assignment_ids or job_assignment_ids != sorted(enabled):
        raise GlobalCheckerWorkflowError("Job assignments do not match the View's active Source-View Assignments.")

    expected_sources = set()
    expected_feeds = set()
    feed_to_assignment = {}
    for assignment_id in job_assignment_ids:
        assignment = enabled[assignment_id]
        source_id = assignment.get("sourceId")
        source = context.sources.get(source_id)
        if not source or source.get("sourceStatus") != "enabled":
            raise GlobalCheckerWorkflowError(f"Assignment '{assignment_id}' has no enabled Source Registry entry.")
        policy_ref = source.get("checkerPolicyRef")
        policy = context.policies.get(policy_ref)
        if not policy or view_id not in policy.get("views", []):
            raise GlobalCheckerWorkflowError(
                f"Source '{source_id}' has no matching Global Checker policy for View '{view_id}'."
            )
        expected_sources.add(source_id)
        catalogue_urls = set(source.get("feedUrls", []))
        for feed_url in assignment.get("feedUrls", []):
            if feed_url not in catalogue_urls:
                raise GlobalCheckerWorkflowError(
                    f"Assignment '{assignment_id}' includes a feed absent from its Source Registry entry."
                )
            if feed_url not in set(policy.get("allowedFeedUrls", [])):
                raise GlobalCheckerWorkflowError(
                    f"Feed URL is not explicitly registered in Global Checker policy '{policy_ref}'."
                )
            expected_feeds.add(feed_url)
            feed_to_assignment[feed_url] = assignment

    if sorted(expected_sources) != sorted(set(job.get("sourceIds") or [])):
        raise GlobalCheckerWorkflowError("Job source IDs do not match the registered View assignments.")
    if sorted(expected_feeds) != sorted(set(job.get("feedUrls") or [])):
        raise GlobalCheckerWorkflowError("Job feed URLs do not match the registered View assignments.")

    return profile, feed_to_assignment


def _record_source_review(record: dict[str, Any], job: dict[str, Any],
                          context: RepositoryPolicies, feed_to_assignment: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    view_id = job["viewId"]
    if record.get("viewId") != view_id:
        raise GlobalCheckerWorkflowError("A record in the collection batch belongs to a different View.")
    source_id = _clean(record.get("sourceId"), 100)
    if source_id not in set(job.get("sourceIds") or []):
        raise GlobalCheckerWorkflowError("Record source ID is outside this Manager job.")
    source = context.sources.get(source_id)
    if not source or source.get("sourceStatus") != "enabled":
        raise GlobalCheckerWorkflowError("Record source is missing or disabled in the Manager Source Registry.")
    if _clean(record.get("sourceName"), 200) != _clean(source.get("sourceName"), 200):
        raise GlobalCheckerWorkflowError("Record source name does not match the registered source identity.")
    if _clean(record.get("sourcePolicyRef"), 160) != _clean(source.get("checkerPolicyRef"), 160):
        raise GlobalCheckerWorkflowError("Record policy reference does not match the Manager Source Registry.")

    feed_url = _clean(record.get("sourceUrl"), 1200)
    assignment = feed_to_assignment.get(feed_url)
    if not assignment or assignment.get("sourceId") != source_id:
        raise GlobalCheckerWorkflowError("Record feed URL is not assigned to this source and View.")
    policy = context.policies.get(source.get("checkerPolicyRef"))
    if not policy or view_id not in policy.get("views", []):
        raise GlobalCheckerWorkflowError("Global Checker has no active policy for this record's View.")

    resolved_policy = checker._policy_for_story(view_id, record)
    if not resolved_policy or resolved_policy.get("policyId") != policy.get("policyId"):
        raise GlobalCheckerWorkflowError("Article and feed provenance do not resolve to the registered Checker policy.")
    return source, policy, assignment


def _view_alignment(record: dict[str, Any], profile: dict[str, Any],
                    assignment: dict[str, Any] | None = None) -> dict[str, Any]:
    allowed_topics = list(profile.get("topicsAndCategories", []))
    if assignment:
        allowed_topics.extend(assignment.get("topicFilters", []))
    text = " ".join([
        _clean(record.get("title"), 500),
        _clean(record.get("summary"), 12000),
        " ".join(str(x) for x in record.get("topicTags", []) if x),
    ]).casefold()

    matched = []
    for topic in allowed_topics:
        term = _clean(topic, 120).casefold()
        if term and term in text:
            matched.append(topic)
    exclusions = [
        _clean(value, 120) for value in profile.get("exclusions", [])
        if _clean(value, 120) and _clean(value, 120).casefold() in text
    ]
    if exclusions:
        return {
            "status": "RED",
            "matchedTopics": matched,
            "exclusions": exclusions,
            "reasons": ["The record matches an explicit View exclusion."],
        }
    if matched:
        return {
            "status": "GREEN",
            "matchedTopics": matched,
            "exclusions": [],
            "reasons": ["The record has a match in the registered View topics or assignment filters."],
        }
    return {
        "status": "UNKNOWN",
        "matchedTopics": [],
        "exclusions": [],
        "reasons": ["No explicit topic match was established; do not guess the View assignment."],
    }


def _quality_intake(record: dict[str, Any]) -> dict[str, Any]:
    title = _clean(record.get("title"), 500)
    article_url = _canonical_url(record.get("url"))
    published = _clean(record.get("publishedAt"), 80)
    checks = {
        "titlePresent": bool(title),
        "titleLength": 12 <= len(title) <= 240,
        "canonicalHttpsArticleUrl": bool(article_url),
        "publicationDatePresent": bool(published),
    }
    passed = all(checks.values())
    return {
        "status": "GREEN" if passed else "UNKNOWN",
        "checks": checks,
        "reasons": [] if passed else ["One or more required source-intake quality fields are missing or malformed."],
    }


def _risk_intake(record: dict[str, Any], text_decision: dict[str, Any]) -> dict[str, Any]:
    flags = record.get("riskFlags", [])
    if not isinstance(flags, list):
        return {"status": "UNKNOWN", "flags": [], "reasons": ["Risk flag payload is malformed."]}
    severe = [
        item for item in flags if isinstance(item, dict)
        and str(item.get("severity", "")).lower() in {"high", "critical"}
        and item.get("resolved") is not True
    ]
    if severe:
        return {"status": "RED", "flags": severe, "reasons": ["Unresolved high/critical risk flag requires a hold."]}
    if any(not isinstance(item, dict) for item in flags):
        return {"status": "UNKNOWN", "flags": [], "reasons": ["Risk flags must use structured records."]}
    return {
        "status": "GREEN",
        "flags": flags,
        "reasons": [
            "No unresolved high/critical risk flags were supplied.",
            "Rights/provenance is evaluated separately; this is not a factual truth guarantee.",
        ],
    }


def _duplicate_review(record: dict[str, Any], others: Iterable[dict[str, Any]]) -> dict[str, Any]:
    url = _canonical_url(record.get("url"))
    title = _clean(record.get("title"), 500)
    date = _clean(record.get("publishedAt"), 80)[:10]
    related = []
    exact = []
    for other in others:
        if not isinstance(other, dict) or other.get("viewId", record.get("viewId")) != record.get("viewId"):
            continue
        other_url = _canonical_url(other.get("url"))
        if url and other_url == url:
            exact.append(_clean(other.get("id") or other.get("story_id"), 120))
            continue
        other_date = _clean(other.get("publishedAt") or other.get("published_at"), 80)[:10]
        similarity = _title_similarity(title, _clean(other.get("title"), 500))
        if similarity >= 0.82 and (not date or not other_date or date == other_date):
            related.append({
                "storyId": _clean(other.get("id") or other.get("story_id"), 120),
                "titleSimilarity": round(similarity, 3),
            })
    if exact:
        return {
            "status": "RED", "duplicate": True, "related": related,
            "matches": sorted(set(exact)),
            "reasons": ["The canonical article URL already exists in this View's review batch or retained records."],
        }
    if related:
        return {
            "status": "AMBER", "duplicate": False, "related": related,
            "matches": [],
            "reasons": ["A highly similar same-period headline was found; flag for editorial review and do not auto-merge."],
        }
    return {"status": "GREEN", "duplicate": False, "related": [], "matches": [], "reasons": []}


def review_collection_batch(
    batch: dict[str, Any],
    *,
    repository_root: Path,
    retained_records: Iterable[dict[str, Any]] = (),
) -> dict[str, Any]:
    """Review Global Collector output before Image Engine or Global Editor.

    Input is transient. This function does not store the collection batch or its
    raw summaries. Any source item lacking explicit permissions remains held.
    """
    if not isinstance(batch, dict) or batch.get("schemaVersion") != 1:
        raise GlobalCheckerWorkflowError("Global Collector batch schema is invalid.")
    if batch.get("collector") != "LIVE // EARTH Global Collector":
        raise GlobalCheckerWorkflowError("Batch did not originate from the registered Global Collector.")
    job = batch.get("job")
    records = batch.get("records")
    if not isinstance(job, dict) or not isinstance(records, list):
        raise GlobalCheckerWorkflowError("Global Collector batch is missing its job or records array.")
    view_id = _clean(job.get("viewId"), 100)
    if not view_id or any(not isinstance(item, dict) for item in records):
        raise GlobalCheckerWorkflowError("Batch View ID or record structure is invalid.")

    context = RepositoryPolicies(Path(repository_root))
    profile, feed_to_assignment = _job_assignments(job, context)
    if batch.get("registries", {}).get("managerSourceRegistryVersion") != context.sources_doc.get("registryVersion"):
        raise GlobalCheckerWorkflowError("Manager Source Registry changed after the collection job was created.")
    if batch.get("registries", {}).get("globalCheckerRegistryVersion") != context.checker_registry.get("registryVersion"):
        raise GlobalCheckerWorkflowError("Global Checker registry changed after the collection job was created.")

    retained = list(retained_records)
    results = []
    editorial_inputs = []
    image_engine_inputs = []
    held = []

    all_candidates = list(records)
    for record in all_candidates:
        story_id = _clean(record.get("id") or record.get("story_id"), 160)
        try:
            source, policy, assignment = _record_source_review(record, job, context, feed_to_assignment)
            decision = checker.evaluate_text(view_id, record)
            permissions = resolve_text_permissions(policy)
            quality = _quality_intake(record)
            alignment = _view_alignment(record, profile, assignment)
            duplicates = _duplicate_review(record, [x for x in all_candidates + retained if x.get("id") != story_id])
            risk = _risk_intake(record, decision)

            # Check every original documentary candidate independently from
            # text. The parent article URL is used as the source-page link only
            # when the Global Collector identified the candidate as attached
            # feed metadata; the existing policy still decides whether that
            # exact image/source pair is permitted.
            image_reviews = []
            approved_original_images = []
            for candidate in record.get("mediaCandidates", []) if isinstance(record.get("mediaCandidates", []), list) else []:
                if not isinstance(candidate, dict):
                    continue
                image_record = dict(candidate)
                if (
                    not image_record.get("sourcePage")
                    and image_record.get("discoveredFrom") in {"feed-media-metadata", "feed-html-metadata"}
                ):
                    image_record["sourcePage"] = record.get("url", "")
                image_decision = checker.evaluate_image(
                    view_id, story_id, image_record,
                    article_url=record.get("url", ""),
                    source_name=record.get("sourceName", ""),
                )
                image_review = {
                    "candidateId": image_record.get("candidateId", ""),
                    "verdict": image_decision.get("verdict", "UNKNOWN"),
                    "allowed": bool(image_decision.get("allowed")),
                    "decision": image_decision,
                }
                image_reviews.append(image_review)
                if image_decision.get("allowed") and image_decision.get("verdict") == "GREEN":
                    approved_original_images.append(image_record)

            rights_ok = bool(decision.get("allowed")) and decision.get("verdict") in checker.PUBLISHABLE_VERDICTS
            source_ok = True
            no_duplicate = not duplicates.get("duplicate")
            no_severe_risk = risk.get("status") != "RED"
            can_process = permissions["temporaryProcessing"] == "allowed"
            can_transform = permissions["transformation"] == "allowed"
            can_store_derived = permissions["derivedOutputStorage"] == "allowed"
            can_display_derived = permissions["derivedOutputDisplay"] == "allowed"
            editor_allowed = (
                rights_ok and source_ok and quality["status"] == "GREEN"
                and alignment["status"] == "GREEN" and no_duplicate and no_severe_risk
                and can_process and can_transform and can_store_derived and can_display_derived
            )
            image_context_allowed = (
                rights_ok and source_ok and quality["status"] == "GREEN"
                and no_duplicate and no_severe_risk and can_process
            )

            summary = _clean(record.get("summary"), 16000)
            review_item = {
                "storyId": story_id,
                "viewId": view_id,
                "sourceId": source["sourceId"],
                "sourcePolicyRef": policy["policyId"],
                "articleUrl": _canonical_url(record.get("url")),
                "feedUrl": record.get("sourceUrl"),
                "sourceDecision": decision,
                "sourceSummarySha256": hashlib.sha256(summary.encode("utf-8")).hexdigest(),
                "permissions": permissions,
                "sourceIdentity": {"status": "GREEN", "sourceName": source["sourceName"]},
                "quality": quality,
                "viewAlignment": alignment,
                "duplicateReview": duplicates,
                "riskReview": risk,
                "imageReviews": image_reviews,
                "approvedOriginalImages": approved_original_images,
                "eligibleForImageEngine": image_context_allowed and not approved_original_images,
                "eligibleForGlobalEditor": editor_allowed,
                "rawSourceTextStored": False,
            }
            results.append(review_item)

            if editor_allowed:
                editorial_record = dict(record)
                editorial_record["summary"] = summary if can_process and can_transform else ""
                editorial_record["globalCheckerIntakeDecisionId"] = decision.get("decisionId")
                editorial_record["globalCheckerPermissionMatrix"] = permissions
                editorial_record["approvedOriginalImages"] = approved_original_images
                editorial_record["rawSourceTextPersistence"] = "PROHIBITED_BY_THIS_WORKFLOW"
                editorial_inputs.append(editorial_record)
            elif image_context_allowed:
                image_engine_inputs.append({
                    "storyId": story_id,
                    "viewId": view_id,
                    "sourceId": source["sourceId"],
                    "sourceName": source["sourceName"],
                    "sourcePolicyRef": policy["policyId"],
                    "articleUrl": _canonical_url(record.get("url")),
                    "headline": _clean(record.get("title"), 500)
                        if permissions["headingLinkUse"] == "allowed" else "",
                    "publishedAt": record.get("publishedAt"),
                    "contextUse": "approved source metadata only; no source summary",
                    "permissions": permissions,
                    "checkerDecisionId": decision.get("decisionId"),
                })
            else:
                held.append({
                    "storyId": story_id,
                    "status": "held",
                    "reasons": (
                        list(decision.get("reasons", []))
                        + permissions["notes"]
                        + quality["reasons"]
                        + alignment["reasons"]
                        + duplicates["reasons"]
                        + risk["reasons"]
                    ),
                })
        except Exception as exc:
            review_item = {
                "storyId": story_id or "missing-story-id",
                "viewId": view_id,
                "status": "UNKNOWN",
                "eligibleForImageEngine": False,
                "eligibleForGlobalEditor": False,
                "reasons": [f"{type(exc).__name__}: {str(exc)[:300]}"],
                "rawSourceTextStored": False,
            }
            results.append(review_item)
            held.append({"storyId": review_item["storyId"], "status": "held", "reasons": review_item["reasons"]})

    return {
        "schemaVersion": 1,
        "workflow": WORKFLOW_NAME,
        "workflowVersion": WORKFLOW_VERSION,
        "phase": "collection-intake",
        "viewId": view_id,
        "jobId": job.get("jobId"),
        "managerRegistryVersion": context.sources_doc.get("registryVersion"),
        "checkerRegistryVersion": context.checker_registry.get("registryVersion"),
        "reviewedAt": _utc_now(),
        "statistics": {
            "recordsReceived": len(records),
            "recordsReviewed": len(results),
            "editorialInputsApproved": len(editorial_inputs),
            "imageEngineInputsApproved": len(image_engine_inputs),
            "recordsHeld": len(held),
        },
        "reviews": results,
        "editorialInputs": editorial_inputs,
        "imageEngineInputs": image_engine_inputs,
        "held": held,
        "privacy": {
            "rawSourceTextStored": False,
            "sharedStoryDatabaseOpened": False,
            "natureAndAlienWorldCombined": False,
            "networkRequestsMadeByChecker": False,
        },
        "nextSystem": "Global Image Engine / Global Editor only for items explicitly marked eligible",
    }


def _material_claim_support(claim: dict[str, Any], evidence_by_id: dict[str, dict[str, Any]],
                            intake_by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    claim_text = _clean(claim.get("text"), 2000)
    evidence_ids = claim.get("evidenceIds")
    if not claim_text or not isinstance(evidence_ids, list) or not evidence_ids:
        return {"status": "UNKNOWN", "reasons": ["Material claim has no text or evidence references."]}

    matched_evidence = []
    for evidence_id in evidence_ids:
        evidence = evidence_by_id.get(str(evidence_id))
        if not evidence:
            continue
        source_record_id = str(evidence.get("sourceRecordId") or "")
        intake = intake_by_id.get(source_record_id)
        if not intake or not intake.get("eligibleForGlobalEditor"):
            continue
        if _canonical_url(evidence.get("sourceUrl")) != intake.get("articleUrl"):
            continue
        if evidence.get("sourcePolicyRef") != intake.get("sourcePolicyRef"):
            continue
        if evidence.get("sourceDecisionId") != intake.get("sourceDecision", {}).get("decisionId"):
            continue
        excerpt = _clean(evidence.get("excerpt"), 5000)
        if not excerpt:
            continue
        claim_tokens = _tokens(claim_text)
        excerpt_tokens = _tokens(excerpt)
        overlap = (len(claim_tokens & excerpt_tokens) / len(claim_tokens)) if claim_tokens else 0.0
        claim_numbers = set(re.findall(r"\b\d+(?:[.,]\d+)?%?\b", claim_text))
        excerpt_numbers = set(re.findall(r"\b\d+(?:[.,]\d+)?%?\b", excerpt))
        missing_numbers = sorted(claim_numbers - excerpt_numbers)
        negation_words = {"not", "no", "never", "without", "failed", "false"}
        claim_negated = bool(_tokens(claim_text) & negation_words)
        excerpt_negated = bool(_tokens(excerpt) & negation_words)
        negation_mismatch = claim_negated != excerpt_negated
        if overlap >= 0.35 and not missing_numbers and not negation_mismatch:
            matched_evidence.append({
                "evidenceId": str(evidence_id),
                "sourceRecordId": source_record_id,
                "sourceUrl": intake["articleUrl"],
                "sourcePolicyRef": intake["sourcePolicyRef"],
                "excerptSha256": hashlib.sha256(excerpt.encode("utf-8")).hexdigest(),
                "tokenCoverage": round(overlap, 3),
            })

    if not matched_evidence:
        return {
            "status": "UNKNOWN",
            "reasons": [
                "No linked permitted evidence excerpt provides sufficient deterministic support.",
                "This is a traceability check, not an independent scientific or journalistic fact-check.",
            ],
        }
    return {
        "status": "TRACEABLE",
        "evidence": matched_evidence,
        "reasons": ["At least one permitted source record supports the claim under deterministic text/number checks."],
    }


def _risk_review_final(story: dict[str, Any]) -> dict[str, Any]:
    assessment = story.get("riskAssessment")
    if not isinstance(assessment, dict) or not isinstance(assessment.get("flags"), list):
        return {"status": "UNKNOWN", "reasons": ["Global Editor must provide a structured riskAssessment.flags list."]}
    flags = assessment["flags"]
    invalid = [item for item in flags if not isinstance(item, dict) or not item.get("riskCode")]
    unresolved = [
        item for item in flags if isinstance(item, dict)
        and str(item.get("severity", "")).lower() in {"high", "critical"}
        and item.get("resolved") is not True
    ]
    moderate = [
        item for item in flags if isinstance(item, dict)
        and str(item.get("severity", "")).lower() in {"medium"}
        and item.get("resolved") is not True
    ]
    if invalid:
        return {"status": "UNKNOWN", "reasons": ["Risk flags are not in the required structured format."]}
    if unresolved:
        return {"status": "RED", "flags": unresolved, "reasons": ["Unresolved high/critical risk requires a hold."]}
    if moderate:
        return {"status": "AMBER", "flags": moderate, "reasons": ["Unresolved medium risk requires an editorial hold/review."]}
    return {"status": "GREEN", "flags": flags, "reasons": ["No unresolved risk flags were reported."]}


def _view_alignment_final(story: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    tags = story.get("topicTags", [])
    if not isinstance(tags, list):
        return {"status": "UNKNOWN", "reasons": ["topicTags must be an array."]}
    allowed = list(profile.get("topicsAndCategories", []))
    exclusions = list(profile.get("exclusions", []))
    text = " ".join([
        _clean(story.get("title"), 500),
        _clean(story.get("summary"), 6000),
        " ".join(str(item) for item in tags),
    ]).casefold()
    explicit_exclusions = [x for x in exclusions if _clean(x).casefold() in text]
    matches = [x for x in allowed if _clean(x).casefold() in text]
    if explicit_exclusions:
        return {"status": "RED", "matches": matches, "exclusions": explicit_exclusions,
                "reasons": ["The final story matches an explicit View exclusion."]}
    if matches:
        return {"status": "GREEN", "matches": matches, "exclusions": [],
                "reasons": ["The story aligns with the registered View Collection Profile."]}
    return {"status": "UNKNOWN", "matches": [], "exclusions": [],
            "reasons": ["No explicit match with the View topics/categories was established."]}


def review_editorial_package(
    package: dict[str, Any],
    intake_review: dict[str, Any],
    *,
    repository_root: Path,
    retained_records: Iterable[dict[str, Any]] = (),
) -> dict[str, Any]:
    """Review a Global Editor package before the correct View database is written.

    Factual checks are limited to deterministic evidence traceability and
    consistency against permitted source excerpts included transiently by the
    Editor. The Checker never writes or rewrites headlines/summaries.
    """
    if not isinstance(package, dict) or package.get("schemaVersion") != 1:
        raise GlobalCheckerWorkflowError("Global Editor package schema is invalid.")
    if not isinstance(intake_review, dict) or intake_review.get("phase") != "collection-intake":
        raise GlobalCheckerWorkflowError("A completed Global Checker intake review is required.")
    view_id = _clean(package.get("viewId"), 100)
    if view_id != intake_review.get("viewId"):
        raise GlobalCheckerWorkflowError("Global Editor package and intake review belong to different Views.")

    context = RepositoryPolicies(Path(repository_root))
    profile = context.profiles.get(view_id)
    if not profile:
        raise GlobalCheckerWorkflowError("No Collection Profile exists for this editorial View.")
    if package.get("profileId") and package.get("profileId") != profile.get("profileId"):
        raise GlobalCheckerWorkflowError("Global Editor package profile ID does not match this View.")

    intake_by_id = {
        item.get("storyId"): item for item in intake_review.get("reviews", [])
        if item.get("storyId")
    }
    stories = package.get("stories")
    if not isinstance(stories, list):
        raise GlobalCheckerWorkflowError("Global Editor package has no stories array.")
    evidence_records = package.get("evidence", [])
    if not isinstance(evidence_records, list):
        raise GlobalCheckerWorkflowError("Global Editor evidence must be an array.")
    evidence_by_id = {
        str(item.get("evidenceId")): item for item in evidence_records
        if isinstance(item, dict) and item.get("evidenceId")
    }

    prior = list(retained_records)
    approved = []
    held = []
    reviews = []
    seen_batch: list[dict[str, Any]] = []

    for story in stories:
        if not isinstance(story, dict):
            held.append({"storyId": "invalid-record", "status": "UNKNOWN",
                         "reasons": ["Editorial story is not an object."]})
            continue

        story_id = _clean(story.get("id"), 160)
        source_record_id = _clean(story.get("sourceRecordId") or story_id, 160)
        intake = intake_by_id.get(source_record_id)
        reasons = []
        checks = {}
        verdict = "GREEN"
        image_decision = None

        def fail(status: str, reason: str):
            nonlocal verdict
            reasons.append(reason)
            if status == "RED":
                verdict = "RED"
            elif status == "UNKNOWN" and verdict != "RED":
                verdict = "UNKNOWN"
            elif status == "AMBER" and verdict == "GREEN":
                verdict = "AMBER"

        if not intake or not intake.get("eligibleForGlobalEditor"):
            fail("UNKNOWN", "No eligible Global Checker intake decision exists for this source record.")
        else:
            permissions = intake.get("permissions", {})
            if permissions.get("editorialPermissionStatus") != "allowed":
                fail("UNKNOWN", "The source policy does not explicitly allow every required editorial-use permission.")
            if story.get("globalCheckerIntakeDecisionId") != intake.get("sourceDecision", {}).get("decisionId"):
                fail("RED", "The Global Editor package does not cite the exact approved intake decision.")
            if _canonical_url(story.get("url")) != intake.get("articleUrl"):
                fail("RED", "The final story URL differs from the checked source article URL.")
            if story.get("sourcePolicyRef") != intake.get("sourcePolicyRef"):
                fail("RED", "The final story source-policy identity differs from the intake decision.")

        forbidden_fields = sorted(key for key in story if key in RAW_TEXT_FIELDS)
        if forbidden_fields:
            fail("RED", "The final story contains raw-source text fields that must not be persisted.")

        title = _clean(story.get("title"), 500)
        summary = _clean(story.get("summary"), 6000)
        if not (12 <= len(title) <= 200):
            fail("UNKNOWN", "Final headline is missing or outside the accepted length range.")
        if not summary or len(summary) < 100 or len(summary.split()) < 16:
            fail("UNKNOWN", "Final editorial summary is missing or too short for meaningful publication.")

        if intake and summary:
            final_digest = hashlib.sha256(summary.encode("utf-8")).hexdigest()
            if final_digest == intake.get("sourceSummarySha256"):
                fail("RED", "Final summary is an unchanged copy of the original source excerpt, not original editorial work.")

        claims = story.get("claims")
        if not isinstance(claims, list) or not claims:
            fail("UNKNOWN", "Global Editor must provide material claims and their evidence references.")
            claims = []
        claim_ledger = []
        for claim in claims:
            if not isinstance(claim, dict):
                fail("UNKNOWN", "A material claim is malformed.")
                continue
            if claim.get("material") is False:
                continue
            support = _material_claim_support(claim, evidence_by_id, intake_by_id)
            claim_ledger.append({
                "claimId": _clean(claim.get("claimId"), 100),
                "supportStatus": support["status"],
                "evidence": support.get("evidence", []),
                "reasons": support.get("reasons", []),
            })
            if support["status"] != "TRACEABLE":
                fail("UNKNOWN", f"Material claim '{_clean(claim.get('claimId'), 100)}' lacks traceable permitted evidence.")

        risk = _risk_review_final(story)
        checks["risk"] = risk
        if risk["status"] in {"RED", "UNKNOWN", "AMBER"}:
            fail(risk["status"], "Risk/compliance review requires a hold or further assessment.")

        alignment = _view_alignment_final(story, profile)
        checks["viewAlignment"] = alignment
        if alignment["status"] != "GREEN":
            fail(alignment["status"], "The final package has not passed View-alignment review.")

        duplicates = _duplicate_review(
            {**story, "viewId": view_id},
            prior + seen_batch,
        )
        checks["duplicateReview"] = duplicates
        if duplicates["status"] in {"RED", "AMBER"}:
            fail(duplicates["status"], "Duplicate/related-story review requires resolution; no automatic merge is performed.")

        # Image rights are independently evaluated by the existing central
        # Checker. An Image Engine status/claim is never accepted as approval.
        image_candidate = story.get("imageCandidate") or story.get("image")
        if image_candidate:
            if not isinstance(image_candidate, dict):
                checks["image"] = {"status": "UNKNOWN", "reasons": ["Image candidate is malformed."]}
            else:
                image_decision = checker.evaluate_image(
                    view_id, story_id, image_candidate,
                    article_url=intake.get("articleUrl") if intake else _clean(story.get("url"), 1200),
                    source_name=intake.get("sourceName", "") if intake else _clean(story.get("sourceName"), 200),
                )
                checks["image"] = {
                    "status": "GREEN" if image_decision.get("allowed") and image_decision.get("verdict") == "GREEN" else "UNKNOWN",
                    "decision": image_decision,
                }
                if not image_decision.get("allowed"):
                    # Image denial is independent: eligible text can continue text-only.
                    reasons.extend(image_decision.get("reasons", []))
                else:
                    story["imageRightsDecisionId"] = image_decision.get("decisionId")
                    story["imageRights"] = {
                        "checker": checker.CHECKER_NAME,
                        "verdict": image_decision.get("verdict"),
                        "policyId": image_decision.get("policyId"),
                        "policyVersion": image_decision.get("policyVersion"),
                        "decisionId": image_decision.get("decisionId"),
                        "checkedAt": image_decision.get("checkedAt"),
                        "allowedUse": image_decision.get("allowedUse"),
                        "attribution": image_decision.get("attribution", ""),
                        "sourcePage": image_decision.get("evidence", {}).get("sourcePage", ""),
                        "licenseUrl": image_decision.get("evidence", {}).get("licenseUrl", ""),
                        "modificationNote": image_decision.get("evidence", {}).get("modificationNote", ""),
                        "originType": image_decision.get("evidence", {}).get("originType", ""),
                    }
        else:
            checks["image"] = {"status": "TEXT_ONLY", "reasons": ["No image candidate supplied; eligible text may proceed text-only."]}

        checks["sourceIdentity"] = {
            "status": "GREEN" if intake and intake.get("sourceDecision", {}).get("allowed") else "UNKNOWN",
            "sourceRecordId": source_record_id,
        }
        checks["textPermissions"] = intake.get("permissions", {}) if intake else {}
        checks["claimTraceability"] = claim_ledger

        review_id = "gcr-" + uuid.uuid4().hex[:20]
        review = {
            "reviewId": review_id,
            "storyId": story_id,
            "viewId": view_id,
            "verdict": verdict,
            "approvedForStorage": verdict == "GREEN",
            "approvedForPublisher": verdict == "GREEN",
            "checkedAt": _utc_now(),
            "registryVersion": context.checker_registry.get("registryVersion"),
            "checks": checks,
            "reasons": reasons,
        }
        reviews.append(review)

        if verdict == "GREEN":
            clean_story = dict(story)
            # Evidence excerpts are transient inputs only. Persist source IDs,
            # source links and excerpt hashes; never persist raw source excerpts.
            clean_story["evidenceLedger"] = [
                item for claim in claim_ledger for item in claim.get("evidence", [])
            ]
            clean_story["globalChecker"] = {
                "name": WORKFLOW_NAME,
                "version": WORKFLOW_VERSION,
                "reviewId": review_id,
                "verdict": verdict,
                "checkedAt": review["checkedAt"],
                "registryVersion": review["registryVersion"],
                "claimTraceability": "passed-deterministic-source-reference-and-consistency-checks",
            }
            clean_story.pop("imageCandidate", None)
            clean_story.pop("rawText", None)
            clean_story.pop("sourceText", None)
            approved.append(clean_story)
        else:
            held.append({"storyId": story_id, "status": verdict, "reasons": reasons})

        seen_batch.append({
            "id": story_id, "viewId": view_id, "url": story.get("url"),
            "title": story.get("title"), "publishedAt": story.get("publishedAt"),
        })

    return {
        "schemaVersion": 1,
        "workflow": WORKFLOW_NAME,
        "workflowVersion": WORKFLOW_VERSION,
        "phase": "final-editorial-review",
        "viewId": view_id,
        "profileId": profile.get("profileId"),
        "reviewedAt": _utc_now(),
        "statistics": {
            "storiesReceived": len(stories),
            "storiesApproved": len(approved),
            "storiesHeld": len(held),
        },
        "approvedStories": approved,
        "reviews": reviews,
        "held": held,
        "privacy": {
            "rawSourceTextPersisted": False,
            "evidenceExcerptsPersisted": False,
            "databaseOpenedByChecker": False,
            "publicationPerformed": False,
            "imageEngineSelfApprovalAccepted": False,
        },
        "nextSystem": "Correct View-owned database writer, then View Publisher",
    }


def ensure_workflow_audit_table(connection: sqlite3.Connection) -> None:
    """Add an audit table only to the caller-supplied View-owned database."""
    connection.execute(f"""CREATE TABLE IF NOT EXISTS {AUDIT_TABLE} (
        view_id TEXT NOT NULL,
        story_id TEXT NOT NULL,
        review_id TEXT NOT NULL,
        phase TEXT NOT NULL CHECK(phase IN ('collection-intake','final-editorial-review')),
        verdict TEXT NOT NULL CHECK(verdict IN ('GREEN','AMBER','RED','UNKNOWN')),
        registry_version TEXT NOT NULL,
        checked_at TEXT NOT NULL,
        review_json TEXT NOT NULL,
        PRIMARY KEY(view_id,story_id,review_id)
    )""")
    connection.execute(
        f"CREATE INDEX IF NOT EXISTS idx_{AUDIT_TABLE}_view_checked "
        f"ON {AUDIT_TABLE}(view_id,checked_at)"
    )
    connection.commit()


def record_workflow_reviews(connection: sqlite3.Connection, result: dict[str, Any]) -> int:
    """Store review metadata, not raw source text, in the supplied View database."""
    if not isinstance(result, dict) or result.get("viewId") not in {"nature", "alien-world"}:
        raise GlobalCheckerWorkflowError("Audit result has an invalid View identity.")
    phase = result.get("phase")
    if phase not in {"collection-intake", "final-editorial-review"}:
        raise GlobalCheckerWorkflowError("Audit result phase is not supported.")
    ensure_workflow_audit_table(connection)
    registry_version = _clean(result.get("checkerRegistryVersion") or
                              next((x.get("registryVersion") for x in result.get("reviews", [])
                                    if isinstance(x, dict) and x.get("registryVersion")), ""), 80)
    inserted = 0
    for item in result.get("reviews", []):
        if not isinstance(item, dict):
            continue
        story_id = _clean(item.get("storyId"), 160)
        review_id = _clean(item.get("reviewId") or item.get("sourceDecision", {}).get("decisionId"), 120)
        verdict = item.get("verdict") or item.get("sourceDecision", {}).get("verdict") or "UNKNOWN"
        if not story_id or not review_id or verdict not in checker.ALLOWED_VERDICTS:
            continue
        # This payload intentionally stores only review metadata and hashes.
        safe_item = {
            key: value for key, value in item.items()
            if key not in {"record", "summary", "excerpt", "sourceText", "rawText"}
        }
        cursor = connection.execute(
            f"""INSERT OR IGNORE INTO {AUDIT_TABLE}(
                view_id,story_id,review_id,phase,verdict,registry_version,checked_at,review_json
            ) VALUES(?,?,?,?,?,?,?,?)""",
            (
                result["viewId"], story_id, review_id, phase, verdict,
                registry_version or _clean(result.get("checkerRegistryVersion"), 80) or "unknown",
                _clean(item.get("checkedAt") or result.get("reviewedAt"), 80) or _utc_now(),
                json.dumps(safe_item, ensure_ascii=False, sort_keys=True),
            ),
        )
        inserted += max(0, int(cursor.rowcount or 0))
    connection.commit()
    return inserted


def prune_workflow_reviews(connection: sqlite3.Connection, view_id: str, retention_days: int = 32) -> int:
    """Retain Checker workflow audit entries for the View's bounded horizon."""
    if view_id not in {"nature", "alien-world"}:
        raise GlobalCheckerWorkflowError("Only an explicitly registered View ID may be pruned.")
    retention_days = max(1, min(365, int(retention_days)))
    cutoff = (datetime.now(timezone.utc) - timedelta(days=retention_days)).replace(
        microsecond=0
    ).isoformat().replace("+00:00", "Z")
    cursor = connection.execute(
        f"DELETE FROM {AUDIT_TABLE} WHERE view_id=? AND checked_at < ?",
        (view_id, cutoff),
    )
    connection.commit()
    return max(0, int(cursor.rowcount or 0))

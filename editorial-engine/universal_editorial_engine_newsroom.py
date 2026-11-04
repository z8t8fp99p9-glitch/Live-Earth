#!/usr/bin/env python3
"""Global Newsroom adapter for the LIVE // EARTH Universal Editorial Engine.

The only input is the completed hand-off issued by Global Checker after it has
reviewed both text and image. The Engine prepares extractive text summaries
and one-image layouts for Live Feeds and Magazines, while preserving the
complete Checker-cleared source record and its Manager lineage.

Text intelligence is implemented locally in editorial_text_intelligence.py.
This adapter does not collect, fetch, authorize, judge, rank, moderate, or
publish. It does not open or write a View database.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

ENGINE_NAME = "Universal Editorial Engine"
CORE_ENGINE_VERSION = "1.3.0"
NEWSROOM_ADAPTER_VERSION = "2.0.0"
CHECKER_HANDOFF_NAME = "LIVE // EARTH Global Checker Image Engine Bridge"
CHECKER_HANDOFF_VERSION = "1.0.0"
CHECKER_NAME = "LIVE // EARTH Global Content Rights & Provenance Checker"
CHECKER_VERSION = "2.0.0"
SUMMARY_MIN_WORDS = 200
SUMMARY_MAX_WORDS = 500


class UniversalEditorialNewsroomError(RuntimeError):
    """The Checker-to-Editorial hand-off is malformed or incomplete."""


def _clean(value: Any, limit: int = 20000) -> str:
    if value is None:
        return ""
    import html
    import re
    raw = str(value).replace("\u00a0", " ")
    raw = re.sub(r"<\s*br\s*/?\s*>", " ", raw, flags=re.I)
    raw = re.sub(r"</\s*(p|div|li|h[1-6])\s*>", " ", raw, flags=re.I)
    raw = re.sub(r"<[^>]*>", " ", raw)
    raw = html.unescape(raw)
    return re.sub(r"\s+", " ", raw).strip()[:limit]


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _read_json(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise UniversalEditorialNewsroomError(
            f"{label} could not be read: {type(exc).__name__}: {exc}"
        ) from exc
    if not isinstance(value, dict):
        raise UniversalEditorialNewsroomError(f"{label} must contain a JSON object.")
    return value


def _load_contract(repository_root: Path, view_id: str, job: dict[str, Any]) -> dict[str, Any]:
    """Load the View profile as data; no View IDs are hard-coded in Python."""
    root = Path(repository_root).resolve()
    profiles_doc = _read_json(
        root / "global_collection_manager" / "config" / "view-collection-profiles.json",
        "Manager View Collection Profiles",
    )
    manager_registry = _read_json(
        root / "global_collection_manager" / "config" / "source-registry.json",
        "Manager Source Registry",
    )
    checker_registry = _read_json(
        root / "global-checker" / "source-registry.json",
        "Global Checker Source & Rights Registry",
    )
    if profiles_doc.get("schemaVersion") != 1 or not isinstance(profiles_doc.get("profiles"), list):
        raise UniversalEditorialNewsroomError("Manager View Collection Profiles schema is invalid.")
    matches = [item for item in profiles_doc["profiles"] if isinstance(item, dict) and item.get("viewId") == view_id]
    if len(matches) != 1:
        raise UniversalEditorialNewsroomError("The Checker View ID does not resolve to exactly one Manager profile.")
    profile = matches[0]
    if profile.get("enabled") is not True:
        raise UniversalEditorialNewsroomError("The Checker View profile is disabled.")
    if job.get("profileId") != profile.get("profileId"):
        raise UniversalEditorialNewsroomError("Manager job profileId differs from the registered View profile.")
    if job.get("destinationDatabaseId") != profile.get("destinationDatabaseId"):
        raise UniversalEditorialNewsroomError("Manager job database ID differs from the registered View profile.")
    if job.get("destinationDatabasePath") != profile.get("destinationDatabasePath"):
        raise UniversalEditorialNewsroomError("Manager job database path differs from the registered View profile.")
    if not manager_registry.get("registryVersion") or not checker_registry.get("registryVersion"):
        raise UniversalEditorialNewsroomError("Manager or Checker registry version is missing.")
    return {
        "profile": profile,
        "managerRegistryVersion": manager_registry["registryVersion"],
        "checkerRegistryVersion": checker_registry["registryVersion"],
    }


def _checker_clearance(check: dict[str, Any], post_id: str) -> None:
    """Assert the Checker-issued eligibility contract; do not re-evaluate rights."""
    if check.get("postId") != post_id:
        raise UniversalEditorialNewsroomError(f"Checker post identity mismatch for '{post_id}'.")
    if check.get("status") != "PASS":
        raise UniversalEditorialNewsroomError(f"Checker did not clear post '{post_id}'.")
    text_decision = check.get("text")
    image_decision = check.get("image")
    if not isinstance(text_decision, dict) or text_decision.get("allowed") is not True:
        raise UniversalEditorialNewsroomError(f"Checker did not clear the text for '{post_id}'.")
    if text_decision.get("summaryAllowed") is not True:
        raise UniversalEditorialNewsroomError(f"Checker did not permit summarisation for '{post_id}'.")
    if not isinstance(image_decision, dict) or image_decision.get("allowed") is not True:
        raise UniversalEditorialNewsroomError(f"Checker did not clear an image for '{post_id}'.")
    # Field restrictions are field-scoped. Editorial consumes only the
    # Checker-approved summary and selected image, never restricted raw fields.
    if check.get("lineage", {}).get("passed") is not True:
        raise UniversalEditorialNewsroomError(f"Checker did not clear Manager lineage for '{post_id}'.")


def build_editorial_summary(source_summary: str, source_title: str = "") -> dict[str, Any]:
    """Delegate to the local Text Intelligence module; retain the adapter API."""
    try:
        from editorial_text_intelligence import build_editorial_summary as build_local_summary
    except Exception as exc:
        raise UniversalEditorialNewsroomError(
            f"Local Editorial Text Intelligence module could not be loaded: {type(exc).__name__}: {exc}"
        ) from exc
    try:
        return build_local_summary(source_summary, source_title)
    except ValueError as exc:
        raise UniversalEditorialNewsroomError(str(exc)) from exc


def _image_for_post(post: dict[str, Any], check: dict[str, Any], job: dict[str, Any]) -> dict[str, Any]:
    media_id = str(check.get("image", {}).get("mediaId") or "")
    if not media_id:
        raise UniversalEditorialNewsroomError(f"Global Checker did not identify an approved image for '{post.get('postId')}'.")
    matches: list[dict[str, Any]] = []
    for field in ("media", "attachments"):
        values = post.get(field) or []
        if not isinstance(values, list):
            raise UniversalEditorialNewsroomError(f"Post '{post.get('postId')}' {field} must be an array.")
        for item in values:
            if isinstance(item, dict) and str(item.get("mediaId") or "") == media_id:
                matches.append(item)
    if len(matches) != 1:
        raise UniversalEditorialNewsroomError(
            f"Checker-approved mediaId '{media_id}' must match exactly one original Collector media record; found {len(matches)}."
        )
    image = matches[0]
    post_id = str(post.get("postId") or "")
    if image.get("postId") != post_id or image.get("viewId") != post.get("viewId"):
        raise UniversalEditorialNewsroomError("Checker-cleared image is not attached to its exact parent post and View.")
    if not image.get("mediaId") or image.get("sourceId") != post.get("sourceId"):
        raise UniversalEditorialNewsroomError("Checker-cleared image is missing its own mediaId or matching sourceId.")
    metadata = image.get("metadata") if isinstance(image.get("metadata"), dict) else {}
    if metadata.get("checkerStatus") not in (None, "PENDING_CHECKER_REVIEW", "APPROVED_BY_GLOBAL_CHECKER"):
        raise UniversalEditorialNewsroomError("Image metadata contains an unrecognized Checker status.")
    from universal_checker import MEDIA_LINEAGE_FIELDS, _same
    context = post.get("collectionContext")
    if not isinstance(context, dict):
        raise UniversalEditorialNewsroomError("Post collectionContext is missing.")
    expected = {"postId": post_id, "viewId": post.get("viewId"),
                "sourceId": post.get("sourceId"),
                **{field: job.get(field) for field in job}}
    for field in MEDIA_LINEAGE_FIELDS:
        if field not in image or not _same(image.get(field), expected.get(field)):
            raise UniversalEditorialNewsroomError(f"Image lineage field '{field}' differs from the Checker source post.")
    return image


def _load_contract_checker(root: Path):
    checker_dir = root / "global-checker"
    if not checker_dir.is_dir():
        raise UniversalEditorialNewsroomError("The Global Checker directory is missing.")
    if str(checker_dir) not in sys.path:
        sys.path.insert(0, str(checker_dir))
    try:
        import universal_checker
        return universal_checker
    except Exception as exc:
        raise UniversalEditorialNewsroomError(
            f"Universal Global Checker contract could not be loaded: {type(exc).__name__}: {exc}"
        ) from exc


def produce_editorial_package(
    checker_handoff: dict[str, Any],
    *,
    repository_root: str | Path,
) -> dict[str, Any]:
    """Prepare summaries and layouts from the exact completed Checker hand-off."""
    if not isinstance(checker_handoff, dict) or checker_handoff.get("schemaVersion") != 1:
        raise UniversalEditorialNewsroomError("Checker editorial hand-off schema must be version 1.")
    if checker_handoff.get("handoff") != CHECKER_HANDOFF_NAME or checker_handoff.get("handoffVersion") != CHECKER_HANDOFF_VERSION:
        raise UniversalEditorialNewsroomError("Input was not produced by the registered Global Checker image bridge.")
    if checker_handoff.get("phase") != "checker-image-review-complete":
        raise UniversalEditorialNewsroomError("Editorial requires the completed Checker text-and-image review phase.")
    if checker_handoff.get("checker") != CHECKER_NAME or checker_handoff.get("checkerVersion") != CHECKER_VERSION:
        raise UniversalEditorialNewsroomError("Checker identity/version is not approved for Editorial hand-off.")

    root = Path(repository_root).resolve()
    checker_module = _load_contract_checker(root)
    collector_result = checker_handoff.get("collectorResultWithCheckerReviewedImages")
    checker_review = checker_handoff.get("checkerReview")
    if not isinstance(collector_result, dict) or not isinstance(checker_review, dict):
        raise UniversalEditorialNewsroomError("Checker hand-off must include the post records and exact Checker review.")
    if collector_result.get("recordSchema") != checker_module.UNIVERSAL_RECORD_SCHEMA:
        raise UniversalEditorialNewsroomError("Checker hand-off does not contain the Universal Collector record schema.")
    if collector_result.get("schemaVersion") != 1:
        raise UniversalEditorialNewsroomError("Collector result schema is unsupported.")
    job = collector_result.get("job")
    if not isinstance(job, dict) or checker_module._manager_job_errors(job):
        raise UniversalEditorialNewsroomError("Checker hand-off has a missing or invalid Manager job envelope.")
    view_id = str(job.get("viewId") or "")
    if checker_handoff.get("viewId") != view_id or checker_handoff.get("jobId") != job.get("jobId"):
        raise UniversalEditorialNewsroomError("Checker hand-off View/job IDs differ from the original Manager job.")
    if checker_review.get("viewId") != view_id or checker_review.get("jobId") != job.get("jobId"):
        raise UniversalEditorialNewsroomError("Completed Checker review belongs to a different View/job.")
    if checker_review.get("checkerMode") != "universal-view-independent" or checker_review.get("checkerVersion") != CHECKER_VERSION:
        raise UniversalEditorialNewsroomError("Nested review is not from the approved Universal Global Checker.")

    contract = _load_contract(root, view_id, job)
    if checker_handoff.get("managerRegistryVersion") != contract["managerRegistryVersion"]:
        raise UniversalEditorialNewsroomError("Manager Source Registry changed after Checker review; Editorial is held.")
    if checker_handoff.get("checkerRegistryVersion") != contract["checkerRegistryVersion"]:
        raise UniversalEditorialNewsroomError("Global Checker rights registry changed after image review; Editorial is held.")
    if checker_handoff.get("managerRegistryVersion") != collector_result.get("managerRegistryVersion"):
        raise UniversalEditorialNewsroomError("Checker hand-off Manager registry version differs from collection.")
    if checker_handoff.get("managerRegistryVersion") != checker_review.get("managerRegistryVersion"):
        raise UniversalEditorialNewsroomError("Checker review Manager registry version differs from collection.")
    if checker_handoff.get("managerRegistryVersion") != collector_result.get("managerRegistryVersion"):
        raise UniversalEditorialNewsroomError("Manager registry version mismatch.")
    if checker_handoff.get("checkerReview", {}).get("reportVisibility") != "INTERNAL_ONLY_NOT_FOR_PUBLICATION":
        raise UniversalEditorialNewsroomError("Checker decision report must retain its internal-only designation.")
    if checker_review.get("checkerVersion") != CHECKER_VERSION:
        raise UniversalEditorialNewsroomError("Checker review version mismatch.")

    records = collector_result.get("records")
    checks = checker_review.get("posts")
    if not isinstance(records, list) or not isinstance(checks, list):
        raise UniversalEditorialNewsroomError("Collector records and Checker post decisions must be arrays.")
    by_post = {str(item.get("postId")): item for item in records if isinstance(item, dict) and item.get("postId")}
    check_by_post = {str(item.get("postId")): item for item in checks if isinstance(item, dict) and item.get("postId")}
    if len(by_post) != len(records) or len(check_by_post) != len(checks) or set(by_post) != set(check_by_post):
        raise UniversalEditorialNewsroomError("Checker post identities do not exactly match the collected records.")

    eligible_ids = checker_handoff.get("editorialEligiblePostIds")
    if not isinstance(eligible_ids, list) or len(eligible_ids) != len(set(map(str, eligible_ids))):
        raise UniversalEditorialNewsroomError("Checker editorialEligiblePostIds must be a unique array.")
    if not eligible_ids:
        raise UniversalEditorialNewsroomError("Checker did not release any text-and-image eligible posts to Editorial.")

    stories: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    seen_media_ids: set[str] = set()
    for raw_post_id in eligible_ids:
        post_id = str(raw_post_id)
        post = by_post.get(post_id)
        check = check_by_post.get(post_id)
        if post is None or check is None:
            raise UniversalEditorialNewsroomError(f"Checker released unknown postId '{post_id}'.")
        _checker_clearance(check, post_id)
        if post.get("viewId") != view_id:
            raise UniversalEditorialNewsroomError(f"Post '{post_id}' crosses the Manager View boundary.")
        context = post.get("collectionContext")
        if not isinstance(context, dict):
            raise UniversalEditorialNewsroomError(f"Post '{post_id}' has no Manager lineage context.")
        for field in checker_module.MANAGER_FIELDS:
            if field not in context or not checker_module._same(context.get(field), job.get(field)):
                raise UniversalEditorialNewsroomError(f"Post '{post_id}' Manager ID/context differs at '{field}'.")
        summary_input = _clean(post.get("summary"), 30000)
        summary = build_editorial_summary(summary_input, _clean(post.get("title"), 500))
        image = _image_for_post(post, check, job)
        media_id = str(image["mediaId"])
        if media_id in seen_media_ids:
            raise UniversalEditorialNewsroomError("A mediaId is reused across different posts.")
        seen_media_ids.add(media_id)

        source_title = _clean(post.get("title"), 500)
        source_name = _clean(post.get("sourceName"), 240)
        source_url = _clean(post.get("sourceFeedUrl"), 1200)
        article_url = _clean(post.get("canonicalUrl") or post.get("originalUrl"), 1400)
        source_digest = _sha256(summary_input)
        # The complete source record is retained without field deletion or ID
        # rewriting. The summary is a separate output, not a replacement.
        source_record = copy.deepcopy(post)
        lineage = copy.deepcopy(context)
        checker_decisions = {
            "text": copy.deepcopy(check.get("text")),
            "image": copy.deepcopy(check.get("image")),
            "lineage": copy.deepcopy(check.get("lineage")),
        }
        story = {
            "id": post_id,
            "postId": post_id,
            "mediaId": media_id,
            "viewId": view_id,
            "sourceId": post.get("sourceId"),
            "jobId": job.get("jobId"),
            "idempotencyKey": job.get("idempotencyKey"),
            "profileId": job.get("profileId"),
            "assignmentIds": copy.deepcopy(job.get("assignmentIds")),
            "sourceIds": copy.deepcopy(job.get("sourceIds")),
            "feedUrls": copy.deepcopy(job.get("feedUrls")),
            "collectorEntrypoint": job.get("collectorEntrypoint"),
            "collectorWorkflow": job.get("collectorWorkflow"),
            "destinationDatabaseId": job.get("destinationDatabaseId"),
            "destinationDatabasePath": job.get("destinationDatabasePath"),
            "scheduledAt": job.get("scheduledAt"),
            "requestWindowHours": job.get("requestWindowHours"),
            "configVersion": job.get("configVersion"),
            "trigger": job.get("trigger"),
            "sourceTitle": source_title,
            "title": source_title,
            "sourceName": source_name,
            "sourceFeedUrl": source_url,
            "sourceUrl": article_url,
            "publishedAt": post.get("publishedAt"),
            "updatedAt": post.get("updatedAt"),
            "language": post.get("language"),
            "categories": copy.deepcopy(post.get("categories", [])),
            "tags": copy.deepcopy(post.get("tags", [])),
            "topics": copy.deepcopy(post.get("topics", [])),
            "location": copy.deepcopy(post.get("location")),
            "sourceSummarySha256": source_digest,
            "summary": summary["text"],
            "summaryWordCount": summary["wordCount"],
            "summaryStatus": summary["status"],
            "summaryMethod": summary["method"],
            "summaryBasisSha256": summary["sourceSha256"],
            "image": copy.deepcopy(image),
            "imageCredit": image.get("credit", ""),
            "imageCaption": image.get("caption", ""),
            "imageSourcePage": image.get("sourcePage", ""),
            "imageRightsNotice": image.get("rightsNotice", ""),
            "imageLicenseName": image.get("licenseName", ""),
            "imageLicenseUrl": image.get("licenseUrl", ""),
            "sourceRecord": source_record,
            "managerLineage": lineage,
            "checkerDecisions": checker_decisions,
            "checkerRecord": copy.deepcopy(check),
            "checkerReportVisibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION",
            "layout": {
                "imageCount": 1,
                "imageMediaId": media_id,
                "imagePlacement": "lead-image",
                "liveFeed": {"title": source_title, "summary": summary["text"], "imageMediaId": media_id},
                "magazine": {"headline": source_title, "body": summary["text"], "imageMediaId": media_id},
            },
        }
        stories.append(story)
        evidence.append({
            "evidenceId": f"{post_id}-source-summary-{source_digest[:16]}",
            "postId": post_id,
            "mediaId": media_id,
            "sourceUrl": article_url,
            "sourcePolicyId": check.get("text", {}).get("policyId", ""),
            "sourceDecisionId": check.get("text", {}).get("decisionId", ""),
            "summaryExcerpt": summary_input,
            "summaryExcerptSha256": source_digest,
            "generatedSummarySha256": _sha256(summary["text"]),
            "visibility": "TRANSIENT_CHECKER_EVIDENCE_ONLY",
        })

    return {
        "schemaVersion": 1,
        "engine": ENGINE_NAME,
        "coreEngineVersion": CORE_ENGINE_VERSION,
        "newsroomAdapterVersion": NEWSROOM_ADAPTER_VERSION,
        "phase": "editorial-production",
        "inputAuthority": "Global Checker only",
        "inputHandoff": CHECKER_HANDOFF_NAME,
        "viewId": view_id,
        "profileId": contract["profile"]["profileId"],
        "viewName": contract["profile"].get("viewName") or view_id,
        "jobId": job.get("jobId"),
        "managerJob": copy.deepcopy(job),
        "managerRegistryVersion": contract["managerRegistryVersion"],
        "checkerRegistryVersion": contract["checkerRegistryVersion"],
        "generatedAt": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "publicationModes": ["live-feed", "magazine"],
        "summaryWordRange": {"minimum": SUMMARY_MIN_WORDS, "maximum": SUMMARY_MAX_WORDS},
        "statistics": {
            "checkerEligiblePostsReceived": len(eligible_ids),
            "storiesPrepared": len(stories),
            "sourceRecordsPreserved": len(stories),
            "imagesAttached": len(stories),
            "summariesWithin200To500Words": sum(1 for item in stories if SUMMARY_MIN_WORDS <= item["summaryWordCount"] <= SUMMARY_MAX_WORDS),
            "sourceSummariesUnder200Words": sum(
                1 for item in stories
                if len(_clean(item["sourceRecord"].get("summary"), 30000).split()) < SUMMARY_MIN_WORDS
            ),
        },
        "stories": stories,
        "evidence": evidence,
        "privacyAndOwnership": {
            "sourceWebsitesFetched": False,
            "hostedAIOrInferenceUsed": False,
            "sourceRecordsModified": False,
            "sourceRecordsDiscarded": False,
            "sourceTextPersisted": False,
            "checkerDecisionsCreatedOrChanged": False,
            "rightsOrEligibilityJudgedByEditorial": False,
            "viewDatabaseOpenedOrWritten": False,
            "feedOrPdfWritten": False,
            "publicationPerformed": False,
            "viewDatabasesMixed": False,
        },
        "nextSystem": "Configured View Publisher / output renderer",
        "handoffNote": (
            "The complete Checker-cleared source record, all Manager IDs, Checker decisions, "
            "and exactly one approved image remain attached. Live Feed and Magazine layouts "
            "are alternate presentations of the same preserved editorial story."
        ),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="live-earth-universal-editorial-engine",
        description="Prepare extractive summaries and one-image layouts from a Global Checker hand-off.",
    )
    parser.add_argument("--checker-handoff-file", required=True,
                        help="Completed checker-image-review-complete JSON from Global Checker.")
    parser.add_argument("--repository-root", default=".")
    args = parser.parse_args(argv)
    try:
        handoff = json.loads(Path(args.checker_handoff_file).read_text(encoding="utf-8"))
        package = produce_editorial_package(handoff, repository_root=args.repository_root)
        json.dump(package, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        json.dump({
            "engine": ENGINE_NAME,
            "newsroomAdapterVersion": NEWSROOM_ADAPTER_VERSION,
            "phase": "editorial-production-blocked",
            "viewDatabaseOpenedOrWritten": False,
            "publicationPerformed": False,
            "errorType": type(exc).__name__,
            "message": str(exc)[:700],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

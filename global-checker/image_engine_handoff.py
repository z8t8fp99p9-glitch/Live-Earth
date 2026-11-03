#!/usr/bin/env python3
"""Checker-owned bridge for the Global Image Engine.

This adapter converts the Universal Global Checker's initial review into a
rights-limited Image Engine job, then rechecks returned image candidates with
the same Universal Checker before any editorial hand-off. It does not edit,
summarize, or publish posts.
"""
from __future__ import annotations

import copy
import hashlib
import importlib
import json
import re
import sys
from pathlib import Path
from typing import Any

CHECKER_DIRECTORY = Path(__file__).resolve().parent
if str(CHECKER_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(CHECKER_DIRECTORY))

from universal_checker import (  # noqa: E402
    MANAGER_FIELDS, MEDIA_LINEAGE_FIELDS, UNIVERSAL_MEDIA_FIELDS,
    _is_image_item, _manager_job_errors, _same,
)

HANDOFF_NAME = "LIVE // EARTH Global Checker Image Engine Bridge"
HANDOFF_VERSION = "1.0.0"
ENGINE_VERSION = "0.2.0"  # Must match image-engine/source-registry registration.
REPOSITORY_RAW_ROOT = "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main"


class ImageEngineHandoffError(RuntimeError):
    """A Checker-to-Image-Engine or return hand-off failed validation."""


def _load_checker_registry() -> dict[str, Any]:
    import global_checker as core
    return core.load_registry()


def _safe_asset_path(view_id: str, relative: Any) -> str:
    text = str(relative or "").strip()
    parts = Path(text).parts
    if (
        not text.endswith("/published/assets/")
        or text.startswith("/")
        or ".." in parts
        or "\\" in text
        or not text.startswith(view_id + "/")
    ):
        raise ImageEngineHandoffError("Checker image policy has no safe asset path for this View.")
    return text


def build_image_engine_intake(
    collector_result: dict[str, Any],
    checker_result: dict[str, Any],
    *,
    repository_root: str | Path,
) -> dict[str, Any]:
    """Create a Checker-issued, minimally sufficient image search/generation job.

    Only posts with valid Manager lineage, an allowed text decision, no field
    restrictions, and no already-approved image are routed to Image Engine.
    Summary text is included in searchText only when the Checker permits it.
    """
    root = Path(repository_root).resolve()
    if not isinstance(collector_result, dict) or not isinstance(checker_result, dict):
        raise ImageEngineHandoffError("Collector and Checker results must both be JSON objects.")
    job = collector_result.get("job")
    errors = _manager_job_errors(job)
    if errors:
        raise ImageEngineHandoffError("Manager job is invalid: " + " ".join(errors))
    if checker_result.get("checkerMode") != "universal-view-independent":
        raise ImageEngineHandoffError("Only the Universal Global Checker can issue this Image Engine job.")
    if checker_result.get("viewId") != job.get("viewId") or checker_result.get("jobId") != job.get("jobId"):
        raise ImageEngineHandoffError("Collector and Checker report refer to different View/job identities.")
    if checker_result.get("managerRegistryVersion") != collector_result.get("managerRegistryVersion"):
        raise ImageEngineHandoffError("Manager registry version changed between collection and Checker review.")
    if checker_result.get("checkerVersion") != "2.0.0":
        raise ImageEngineHandoffError("Universal Global Checker version is not approved for this hand-off.")

    records = collector_result.get("records")
    checks = checker_result.get("posts")
    if not isinstance(records, list) or not isinstance(checks, list):
        raise ImageEngineHandoffError("Collector records or Checker post decisions are missing.")
    record_by_id = {str(p.get("postId")): p for p in records if isinstance(p, dict) and p.get("postId")}
    check_by_id = {str(c.get("postId")): c for c in checks if isinstance(c, dict) and c.get("postId")}
    if len(record_by_id) != len(records) or len(check_by_id) != len(checks):
        raise ImageEngineHandoffError("Collector/Checker post identities are missing or duplicated.")
    if set(record_by_id) != set(check_by_id):
        raise ImageEngineHandoffError("Checker review does not contain the exact Collector post identity set.")

    registry = _load_checker_registry()
    image_policies = registry.get("imagePolicies", {})
    commons_policy = image_policies.get("wikimediaCommons", {})
    illustration_policy = image_policies.get("imageEngineOriginalIllustration", {})
    inputs: list[dict[str, Any]] = []
    for post_id, post in record_by_id.items():
        check = check_by_id[post_id]
        if check.get("lineage", {}).get("passed") is not True:
            continue
        if check.get("text", {}).get("allowed") is not True:
            continue
        if check.get("image", {}).get("allowed") is True:
            continue
        context = post.get("collectionContext")
        if not isinstance(context, dict):
            continue
        for field in MANAGER_FIELDS:
            if field not in context or not _same(context.get(field), job.get(field)):
                raise ImageEngineHandoffError(f"Post '{post_id}' Manager lineage differs at '{field}'.")
        source_id = str(post.get("sourceId") or "")
        if source_id not in job.get("sourceIds", []):
            raise ImageEngineHandoffError(f"Post '{post_id}' sourceId is outside the Manager job.")
        title = str(post.get("title") or "").strip()
        article_url = str(post.get("canonicalUrl") or post.get("originalUrl") or "").strip()
        if not title or not article_url.startswith("https://"):
            continue

        # Summary is passed only if the Checker decision explicitly permits it.
        query_parts = [title]
        restricted_fields = {str(item.get("field", "")) for item in check.get("fieldRestrictions", []) if isinstance(item, dict)}
        if "title" in restricted_fields or "canonicalUrl" in restricted_fields or "originalUrl" in restricted_fields:
            continue
        summary_allowed = (
            check.get("text", {}).get("summaryAllowed") is True
            and "summary" not in restricted_fields
        )
        if summary_allowed and post.get("summary"):
            query_parts.append(str(post["summary"]))
        view_id = str(job["viewId"])
        relative = illustration_policy.get("views", {}).get(view_id)
        illustration_enabled = (
            illustration_policy.get("status") == "GREEN"
            and ENGINE_VERSION in [str(v) for v in illustration_policy.get("acceptedEngineVersions", [])]
            and isinstance(illustration_policy.get("views"), dict)
            and bool(relative)
        )
        asset_relative = _safe_asset_path(view_id, relative) if illustration_enabled else ""
        if asset_relative:
            asset_url_base = REPOSITORY_RAW_ROOT + "/" + asset_relative
        else:
            # Commons candidates are staged under the same Publisher-owned
            # View asset folder; without a registered path there is no route.
            asset_url_base = ""
        commons_licenses = [str(x) for x in commons_policy.get("acceptedLicenses", [])
                            if str(x) in {
                                "https://creativecommons.org/publicdomain/zero/1.0/",
                                "https://creativecommons.org/licenses/by/4.0/",
                                "https://creativecommons.org/licenses/by-sa/4.0/",
                            }]
        # The same registered View asset destination is required for Commons.
        commons_enabled = bool(commons_licenses and asset_relative)
        if not commons_enabled and not illustration_enabled:
            continue
        inputs.append({
            "postId": post_id,
            "viewId": view_id,
            "sourceId": source_id,
            "sourceName": str(post.get("sourceName") or ""),
            "sourceFeedUrl": str(post.get("sourceFeedUrl") or ""),
            "articleUrl": article_url,
            "title": title,
            "searchText": " ".join(query_parts)[:1000],
            "sourcePolicyId": check.get("text", {}).get("policyId", ""),
            "textDecisionId": check.get("text", {}).get("decisionId", ""),
            "summaryAllowed": summary_allowed,
            "eligibleForImageEngine": True,
            "lineage": copy.deepcopy(context),
            "imagePolicy": {
                "assetRelativePath": asset_relative,
                "assetUrlBase": asset_url_base,
                "wikimediaCommons": {
                    "enabled": commons_enabled,
                    "acceptedLicenses": commons_licenses,
                    "policyVersion": str(commons_policy.get("policyVersion", "1")),
                },
                "imageEngineOriginalIllustration": {
                    "enabled": illustration_enabled,
                    "policyId": illustration_policy.get("policyId", ""),
                    "policyVersion": str(illustration_policy.get("policyVersion", "1")),
                },
            },
        })

    return {
        "schemaVersion": 1,
        "handoff": HANDOFF_NAME,
        "handoffVersion": HANDOFF_VERSION,
        "checker": checker_result.get("checker"),
        "checkerVersion": checker_result.get("checkerVersion"),
        "phase": "image-engine-intake",
        "viewId": job["viewId"],
        "jobId": job["jobId"],
        "managerJob": copy.deepcopy(job),
        "managerRegistryVersion": collector_result.get("managerRegistryVersion"),
        "checkerRegistryVersion": registry.get("registryVersion"),
        "imageEngineInputs": inputs,
        "statistics": {"postsChecked": len(checks), "imageEngineInputs": len(inputs)},
        "privacy": {
            "rawSourceBodyPassed": False,
            "summaryPassedOnlyWhenCheckerAllows": True,
            "viewDatabaseOpenedOrWritten": False,
            "editorialWorkPerformed": False,
            "publicationPerformed": False,
        },
    }


def _verify_staged_media(media: dict[str, Any], staging_directory: str) -> None:
    if set(media) != set(UNIVERSAL_MEDIA_FIELDS):
        missing = sorted(set(UNIVERSAL_MEDIA_FIELDS) - set(media))
        extra = sorted(set(media) - set(UNIVERSAL_MEDIA_FIELDS))
        raise ImageEngineHandoffError(f"Image media schema mismatch; missing={missing}, extra={extra}.")
    metadata = media.get("metadata")
    if not isinstance(metadata, dict) or metadata.get("assetPublished") is not False:
        raise ImageEngineHandoffError("Candidate media must be staged and unpublished.")
    staged = Path(str(metadata.get("stagedPath") or "")).resolve()
    stage_root = Path(staging_directory).resolve()
    try:
        staged.relative_to(stage_root)
    except ValueError as exc:
        raise ImageEngineHandoffError("Candidate stagedPath is outside the declared run directory.") from exc
    if not staged.is_file():
        raise ImageEngineHandoffError("Candidate staged image is missing.")
    digest = hashlib.sha256(staged.read_bytes()).hexdigest()
    if digest != metadata.get("sha256"):
        raise ImageEngineHandoffError("Candidate staged image hash does not match its Checker metadata.")


def review_image_engine_handoff(
    collector_result: dict[str, Any],
    initial_checker_result: dict[str, Any],
    image_engine_result: dict[str, Any],
    *,
    audit_connection=None,
) -> dict[str, Any]:
    """Merge candidate media by postId, then re-run the Universal Checker.

    Only the Checker output determines whether the post and its image may
    proceed. The Image Engine's status is never treated as approval.
    """
    if image_engine_result.get("phase") != "checker-image-candidate-return":
        raise ImageEngineHandoffError("Image Engine did not return the required candidate phase.")
    if not isinstance(initial_checker_result, dict):
        raise ImageEngineHandoffError("The exact initial Global Checker report is required.")
    if (initial_checker_result.get("checkerMode") != "universal-view-independent"
            or initial_checker_result.get("checkerVersion") != "2.0.0"):
        raise ImageEngineHandoffError("The initial report is not from the approved Universal Global Checker.")
    job = collector_result.get("job") if isinstance(collector_result, dict) else None
    errors = _manager_job_errors(job)
    if errors:
        raise ImageEngineHandoffError("Manager job is invalid: " + " ".join(errors))
    for field, expected in (("jobId", job.get("jobId")), ("viewId", job.get("viewId")),
                            ("idempotencyKey", job.get("idempotencyKey")),
                            ("configVersion", job.get("configVersion")),
                            ("managerRegistryVersion", collector_result.get("managerRegistryVersion"))):
        if image_engine_result.get(field) != expected:
            raise ImageEngineHandoffError(f"Image Engine return changed Manager/registry field '{field}'.")
    returned_job = image_engine_result.get("managerJob")
    if not isinstance(returned_job, dict) or any(
        field not in returned_job or not _same(returned_job.get(field), job.get(field))
        for field in MANAGER_FIELDS
    ):
        raise ImageEngineHandoffError("Image Engine return does not preserve the complete Manager job envelope.")
    if initial_checker_result.get("jobId") != job.get("jobId") or initial_checker_result.get("viewId") != job.get("viewId"):
        raise ImageEngineHandoffError("Initial Checker report does not match the Collector Manager job.")
    if initial_checker_result.get("managerRegistryVersion") != collector_result.get("managerRegistryVersion"):
        raise ImageEngineHandoffError("Initial Checker report has a different Manager registry version.")
    if image_engine_result.get("checkerRegistryVersion") != _load_checker_registry().get("registryVersion"):
        raise ImageEngineHandoffError("Checker registry changed during Image Engine processing.")

    original = copy.deepcopy(collector_result)
    records = original.get("records", [])
    initial_checks = initial_checker_result.get("posts", [])
    by_post = {str(p.get("postId")): p for p in records if isinstance(p, dict) and p.get("postId")}
    initial_by_post = {str(p.get("postId")): p for p in initial_checks if isinstance(p, dict) and p.get("postId")}
    if len(by_post) != len(records) or len(initial_by_post) != len(initial_checks) or set(by_post) != set(initial_by_post):
        raise ImageEngineHandoffError("Initial Checker report does not contain the exact Collector post identity set.")
    handoff_items = image_engine_result.get("checkerHandoff")
    if not isinstance(handoff_items, list):
        raise ImageEngineHandoffError("Image Engine return is missing checkerHandoff.")
    seen: set[str] = set()
    seen_media_ids: set[str] = set()
    for item in handoff_items:
        if not isinstance(item, dict):
            raise ImageEngineHandoffError("Image Engine checkerHandoff contains a malformed item.")
        post_id = str(item.get("postId") or "")
        if not post_id or post_id in seen or post_id not in by_post:
            raise ImageEngineHandoffError("Image Engine returned a missing, repeated, or unknown postId.")
        seen.add(post_id)
        post = by_post[post_id]
        initial_check = initial_by_post[post_id]
        if initial_check.get("lineage", {}).get("passed") is not True:
            raise ImageEngineHandoffError(f"Image candidate for '{post_id}' was not released by initial Checker lineage review.")
        if initial_check.get("text", {}).get("allowed") is not True:
            raise ImageEngineHandoffError(f"Image candidate for '{post_id}' has no initial Checker text-use clearance.")
        if initial_check.get("image", {}).get("allowed") is True:
            raise ImageEngineHandoffError(f"Image Engine must not replace the already-approved image for '{post_id}'.")
        media = item.get("media")
        if not isinstance(media, dict) or media.get("postId") != post_id:
            raise ImageEngineHandoffError(f"Candidate for '{post_id}' has mismatched parent post identity.")
        media_id = str(media.get("mediaId") or "")
        if not media_id or media_id in seen_media_ids:
            raise ImageEngineHandoffError("Image Engine returned a missing or repeated mediaId.")
        seen_media_ids.add(media_id)
        if item.get("viewId") != job.get("viewId") or media.get("viewId") != job.get("viewId"):
            raise ImageEngineHandoffError(f"Candidate for '{post_id}' crosses a View boundary.")
        if media.get("sourceId") != post.get("sourceId"):
            raise ImageEngineHandoffError(f"Candidate for '{post_id}' has a mismatched sourceId.")
        expected_lineage = {
            "postId": post.get("postId"), "viewId": post.get("viewId"),
            "sourceId": post.get("sourceId"),
            **{field: job.get(field) for field in MANAGER_FIELDS if field != "viewId"},
        }
        for field in MEDIA_LINEAGE_FIELDS:
            if field not in media or not _same(media.get(field), expected_lineage.get(field)):
                raise ImageEngineHandoffError(f"Candidate for '{post_id}' changed media lineage field '{field}'.")
        _verify_staged_media(media, image_engine_result.get("stagingDirectory", ""))
        # Replace only the post's unapproved image candidates. Non-image media
        # and all post/Manager IDs remain unchanged. The initial Checker report
        # retains the first image decision and its evidence.
        for field in ("media", "attachments"):
            existing = post.get(field) or []
            if not isinstance(existing, list):
                raise ImageEngineHandoffError(f"Collector post '{post_id}' has an invalid {field} list.")
            post[field] = [m for m in existing if not isinstance(m, dict) or not _is_image_item(m)]
        post.setdefault("media", []).append(copy.deepcopy(media))

    # A new complete Universal Checker pass validates the new image and the
    # text/lineage again. This is the only approval source for Editorial.
    from universal_checker import UniversalGlobalChecker
    review = UniversalGlobalChecker(audit_connection=audit_connection).check_batch(original)
    editorial_ids = [
        item["postId"] for item in review.get("posts", [])
        if item.get("status") == "PASS"
        and item.get("text", {}).get("allowed") is True
        and item.get("text", {}).get("summaryAllowed") is True
        and item.get("image", {}).get("allowed") is True
    ]
    return {
        "schemaVersion": 1,
        "handoff": HANDOFF_NAME,
        "handoffVersion": HANDOFF_VERSION,
        "phase": "checker-image-review-complete",
        "checker": review.get("checker"),
        "checkerVersion": review.get("checkerVersion"),
        "jobId": review.get("jobId"),
        "viewId": review.get("viewId"),
        "managerRegistryVersion": review.get("managerRegistryVersion"),
        "checkerRegistryVersion": _load_checker_registry().get("registryVersion"),
        "checkerReview": review,
        "collectorResultWithCheckerReviewedImages": original,
        "editorialEligiblePostIds": editorial_ids,
        "statistics": {
            "imageCandidatesReturned": len(handoff_items),
            "checkerApprovedImages": sum(1 for item in review.get("posts", []) if item.get("image", {}).get("allowed")),
            "editorialEligiblePosts": len(editorial_ids),
        },
        "editorialHandoffRule": "Only editorialEligiblePostIds may be sent onward; the matching Collector post and Checker decisions travel together.",
        "databaseOpenedOrWritten": False,
        "publicationPerformed": False,
        "editorialChangesPerformed": False,
    }

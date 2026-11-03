#!/usr/bin/env python3
"""Checker-owned post-Editorial integrity gate for LIVE // EARTH.

This stage verifies the exact v2.0 Universal Editorial Engine package against
its original completed Checker -> Image Engine -> Checker hand-off. It is an
integrity/contract check only: it does not make new rights decisions, edit,
summarize, rank, moderate, publish, fetch, or write databases.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from typing import Any

CHECKER_DIR = Path(__file__).resolve().parent
if str(CHECKER_DIR) not in sys.path:
    sys.path.insert(0, str(CHECKER_DIR))

try:
    from universal_checker import (  # type: ignore
        MANAGER_FIELDS,
        MEDIA_LINEAGE_FIELDS,
        UNIVERSAL_POST_FIELDS,
        UNIVERSAL_MEDIA_FIELDS,
        UNIVERSAL_RECORD_SCHEMA,
        _manager_job_errors,
        _same,
    )
except Exception as exc:  # pragma: no cover - exercised by deployment/import test
    raise RuntimeError(
        "The registered Universal Global Checker contract could not be loaded: "
        f"{type(exc).__name__}: {exc}"
    ) from exc

GATE_NAME = "LIVE // EARTH Global Checker Post-Editorial Verification"
GATE_VERSION = "1.0.0"
CHECKER_NAME = "LIVE // EARTH Global Content Rights & Provenance Checker"
CHECKER_VERSION = "2.0.0"
HANDOFF_NAME = "LIVE // EARTH Global Checker Image Engine Bridge"
HANDOFF_VERSION = "1.0.0"
EDITORIAL_ENGINE_NAME = "Universal Editorial Engine"
EDITORIAL_CORE_VERSION = "1.3.0"
EDITORIAL_ADAPTER_VERSION = "2.0.0"
SUMMARY_MIN_WORDS = 200
SUMMARY_MAX_WORDS = 500


class PostEditorialVerificationError(RuntimeError):
    """A post-Editorial package failed a required integrity check."""


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _clean(value: Any, limit: int = 30000) -> str:
    if value is None:
        return ""
    raw = str(value).replace("\u00a0", " ")
    raw = re.sub(r"<\s*br\s*/?\s*>", " ", raw, flags=re.I)
    raw = re.sub(r"</\s*(p|div|li|h[1-6])\s*>", " ", raw, flags=re.I)
    raw = re.sub(r"<[^>]*>", " ", raw)
    raw = html.unescape(raw)
    return re.sub(r"\s+", " ", raw).strip()[:limit]


def _sentences(value: str) -> list[str]:
    pieces = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'‘“(])", value)
    return [piece.strip() for piece in pieces if piece.strip()]


def _load_registry_contract(repository_root: Path, view_id: str, job: dict[str, Any]) -> dict[str, Any]:
    root = Path(repository_root).resolve()

    def read(path: Path, label: str) -> dict[str, Any]:
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise PostEditorialVerificationError(
                f"{label} could not be read: {type(exc).__name__}: {exc}"
            ) from exc
        if not isinstance(value, dict):
            raise PostEditorialVerificationError(f"{label} must contain a JSON object.")
        return value

    profiles_doc = read(
        root / "global_collection_manager" / "config" / "view-collection-profiles.json",
        "Manager View Collection Profiles",
    )
    manager_registry = read(
        root / "global_collection_manager" / "config" / "source-registry.json",
        "Manager Source Registry",
    )
    checker_registry = read(
        root / "global-checker" / "source-registry.json",
        "Global Checker Source & Rights Registry",
    )
    if profiles_doc.get("schemaVersion") != 1 or not isinstance(profiles_doc.get("profiles"), list):
        raise PostEditorialVerificationError("Manager View Collection Profiles schema is invalid.")
    matches = [p for p in profiles_doc["profiles"] if isinstance(p, dict) and p.get("viewId") == view_id]
    if len(matches) != 1:
        raise PostEditorialVerificationError("View ID does not resolve to exactly one Manager profile.")
    profile = matches[0]
    if profile.get("enabled") is not True:
        raise PostEditorialVerificationError("The Manager View profile is disabled.")
    if job.get("profileId") != profile.get("profileId"):
        raise PostEditorialVerificationError("Manager job profileId differs from the registered View profile.")
    if job.get("destinationDatabaseId") != profile.get("destinationDatabaseId"):
        raise PostEditorialVerificationError("Manager destination database ID differs from the registered View profile.")
    if job.get("destinationDatabasePath") != profile.get("destinationDatabasePath"):
        raise PostEditorialVerificationError("Manager destination database path differs from the registered View profile.")
    manager_version = manager_registry.get("registryVersion")
    checker_version = checker_registry.get("registryVersion")
    if not manager_version or not checker_version:
        raise PostEditorialVerificationError("Manager or Checker registry version is missing.")
    return {
        "profile": profile,
        "managerRegistryVersion": manager_version,
        "checkerRegistryVersion": checker_version,
    }


def _fail(message: str) -> None:
    raise PostEditorialVerificationError(message)


def _verify_summary(story: dict[str, Any], source_post: dict[str, Any]) -> None:
    source = _clean(source_post.get("summary"), 30000)
    summary = story.get("summary")
    if not source:
        _fail("Checker-cleared source summary is empty; no editorial summary can be verified.")
    if not isinstance(summary, str) or not summary.strip():
        _fail("Editorial summary is missing.")
    summary = _clean(summary, 30000)
    actual_count = len(summary.split())
    if story.get("summaryWordCount") != actual_count:
        _fail("summaryWordCount does not match the actual editorial summary.")
    if story.get("summaryBasisSha256") != _sha256(source):
        _fail("summaryBasisSha256 does not match the Checker-cleared source summary.")
    if story.get("sourceSummarySha256") != _sha256(source):
        _fail("sourceSummarySha256 does not match the preserved source summary.")

    source_count = len(source.split())
    if source_count <= SUMMARY_MAX_WORDS:
        expected_status = "WITHIN_TARGET" if source_count >= SUMMARY_MIN_WORDS else "SOURCE_UNDER_200_WORDS"
        if summary != source:
            _fail("Source summary of 500 words or fewer must be preserved exactly; do not rewrite or pad it.")
        if story.get("summaryStatus") != expected_status:
            _fail("summaryStatus does not correctly describe the unchanged source summary.")
        expected_method = "source-preserved-within-target" if expected_status == "WITHIN_TARGET" else "source-preserved-no-padding"
        if story.get("summaryMethod") != expected_method:
            _fail("summaryMethod does not match the unchanged-source rule.")
        return

    if not SUMMARY_MIN_WORDS <= actual_count <= SUMMARY_MAX_WORDS:
        _fail("A source longer than 500 words must produce a 200–500-word extractive summary.")
    method = story.get("summaryMethod")
    if story.get("summaryStatus") == "EXTRACTED_BOUNDARY_FALLBACK":
        if method != "deterministic-extractive-v1":
            _fail("Boundary fallback uses an unapproved summary method.")
        source_tokens = source.split()
        if summary.split() != source_tokens[:actual_count]:
            _fail("Boundary fallback is not an unchanged source prefix.")
    elif method == "deterministic-extractive-v1":
        source_sentences = _sentences(source)
        summary_sentences = _sentences(summary)
        # Every selected sentence must be an exact source sentence and retain
        # its original order. This prevents invented or paraphrased wording.
        cursor = 0
        for sentence in summary_sentences:
            try:
                found = source_sentences.index(sentence, cursor)
            except ValueError:
                _fail("Editorial summary contains wording that is not an exact ordered source sentence.")
            cursor = found + 1
        if not summary_sentences:
            _fail("Extractive summary contains no verifiable source sentences.")
    else:
        _fail("Summary method is not an approved extractive method for this adapter version.")
    if story.get("summaryStatus") not in ("WITHIN_TARGET", "EXTRACTED_BOUNDARY_FALLBACK"):
        _fail("summaryStatus is inconsistent with a long-source extractive summary.")


def _verify_story(
    story: dict[str, Any],
    source_post: dict[str, Any],
    checker_record: dict[str, Any],
    job: dict[str, Any],
    view_id: str,
) -> dict[str, Any]:
    post_id = str(source_post.get("postId") or "")
    if not isinstance(story, dict):
        _fail("Editorial story is not an object.")
    if story.get("id") != post_id or story.get("postId") != post_id:
        _fail("Editorial story id/postId differs from the original Collector postId.")
    if story.get("viewId") != view_id or source_post.get("viewId") != view_id:
        _fail("Story crosses the Manager View boundary.")
    if story.get("sourceId") != source_post.get("sourceId"):
        _fail("Editorial story changed sourceId.")
    if story.get("sourceRecord") != source_post:
        _fail("Complete sourceRecord is not data-for-data identical to the Checker-cleared Collector record.")
    if story.get("managerLineage") != source_post.get("collectionContext"):
        _fail("Manager lineage object differs from the original Collector collectionContext.")

    for field in MANAGER_FIELDS:
        expected = job.get(field)
        if field not in story or not _same(story.get(field), expected):
            _fail(f"Manager lineage field '{field}' changed or is missing in the editorial story.")
        if field not in story.get("managerLineage", {}) or not _same(story["managerLineage"].get(field), expected):
            _fail(f"Manager lineage field '{field}' changed in managerLineage.")
        if field not in source_post.get("collectionContext", {}) or not _same(source_post["collectionContext"].get(field), expected):
            _fail(f"Original Collector record does not match Manager job field '{field}'.")

    if story.get("managerJob") is not None and story.get("managerJob") != job:
        _fail("Editorial package managerJob differs from the original Manager job.")
    expected_source_title = _clean(source_post.get("title"), 500)
    if story.get("sourceTitle") != expected_source_title:
        _fail("Editorial Engine did not preserve the original source title in sourceTitle.")
    if not isinstance(story.get("title"), str) or not story.get("title", "").strip():
        _fail("Editorial Engine output title is missing.")
    if story.get("publishedAt") != source_post.get("publishedAt") or story.get("updatedAt") != source_post.get("updatedAt"):
        _fail("Editorial Engine changed source publication timestamps.")
    if story.get("language") != source_post.get("language"):
        _fail("Editorial Engine changed the source language.")
    if story.get("sourceName") != _clean(source_post.get("sourceName"), 240):
        _fail("Editorial Engine changed the source publisher identity.")
    if story.get("sourceFeedUrl") != _clean(source_post.get("sourceFeedUrl"), 1200):
        _fail("Editorial Engine changed the source feed URL.")
    if story.get("sourceUrl") != _clean(source_post.get("canonicalUrl") or source_post.get("originalUrl"), 1400):
        _fail("Editorial Engine changed the canonical source article URL.")
    for field in ("categories", "tags", "topics", "location"):
        if story.get(field) != source_post.get(field):
            _fail(f"Editorial Engine changed source metadata field '{field}'.")

    if checker_record.get("postId") != post_id or checker_record.get("status") != "PASS":
        _fail("Original Checker post decision is not a matching PASS decision.")
    if checker_record.get("viewId") != view_id or checker_record.get("sourceId") != source_post.get("sourceId"):
        _fail("Original Checker decision View/source identity differs from the Collector post.")
    if checker_record.get("text", {}).get("allowed") is not True or checker_record.get("text", {}).get("summaryAllowed") is not True:
        _fail("Original Checker did not permit text use and summarisation.")
    if checker_record.get("image", {}).get("allowed") is not True:
        _fail("Original Checker did not approve an image.")
    # Field restrictions are scoped to their named source fields. The exact
    # permitted editorial summary and approved mediaId are verified below.
    if checker_record.get("lineage", {}).get("passed") is not True:
        _fail("Original Checker did not pass Manager lineage.")
    if story.get("checkerRecord") != checker_record:
        _fail("Full original Checker decision was altered or lost.")
    if story.get("checkerDecisions") != {
        "text": checker_record.get("text"),
        "image": checker_record.get("image"),
        "lineage": checker_record.get("lineage"),
    }:
        _fail("Editorial checkerDecisions do not exactly match the original Checker decisions.")
    if story.get("checkerReportVisibility") != "INTERNAL_ONLY_NOT_FOR_PUBLICATION":
        _fail("Checker report is missing its internal-only designation.")

    images: list[dict[str, Any]] = []
    if set(source_post) != set(UNIVERSAL_POST_FIELDS):
        _fail("Source post fields do not match the fixed Universal Collector record schema.")
    for field in ("media", "attachments"):
        media_values = source_post.get(field) or []
        if not isinstance(media_values, list):
            _fail(f"Source post {field} must be an array.")
        for index, item in enumerate(media_values):
            if not isinstance(item, dict) or set(item) != set(UNIVERSAL_MEDIA_FIELDS):
                _fail(f"Source post {field}[{index}] does not match the fixed Universal Media schema.")
            if (
                str(item.get("mediaType") or "").lower().startswith("image")
                or str(item.get("mimeType") or "").lower().startswith("image/")
            ):
                images.append(item)
    media_id = str(checker_record.get("image", {}).get("mediaId") or "")
    selected = [item for item in images if str(item.get("mediaId") or "") == media_id]
    if not media_id or len(selected) != 1:
        _fail(f"Checker-approved mediaId must identify exactly one original image candidate; found {len(selected)}.")
    image = selected[0]
    if story.get("mediaId") != media_id or story.get("image") != image:
        _fail("Editorial Engine changed or detached the Checker-approved image.")
    expected_image_fields = {
        "imageCredit": image.get("credit", ""),
        "imageCaption": image.get("caption", ""),
        "imageSourcePage": image.get("sourcePage", ""),
        "imageRightsNotice": image.get("rightsNotice", ""),
        "imageLicenseName": image.get("licenseName", ""),
        "imageLicenseUrl": image.get("licenseUrl", ""),
    }
    if any(story.get(key) != value for key, value in expected_image_fields.items()):
        _fail("Editorial Engine changed approved image caption, credit, source or licence metadata.")
    if image.get("postId") != post_id or image.get("sourceId") != source_post.get("sourceId") or image.get("viewId") != view_id:
        _fail("Image parent post/source/View identity changed.")
    for field in MEDIA_LINEAGE_FIELDS:
        expected = {
            "postId": post_id,
            "viewId": view_id,
            "sourceId": source_post.get("sourceId"),
            **{key: job.get(key) for key in MANAGER_FIELDS if key != "viewId"},
        }.get(field)
        if field not in image or not _same(image.get(field), expected):
            _fail(f"Checker-approved media lineage field '{field}' changed or is missing.")

    _verify_summary(story, source_post)
    layout = story.get("layout")
    if not isinstance(layout, dict) or layout.get("imageCount") != 1 or layout.get("imageMediaId") != media_id:
        _fail("Editorial layout does not represent exactly one approved image.")
    for layout_name, text_key in (("liveFeed", "summary"), ("magazine", "body")):
        view_layout = layout.get(layout_name)
        if not isinstance(view_layout, dict):
            _fail(f"Editorial package is missing the {layout_name} layout.")
        if view_layout.get("imageMediaId") != media_id:
            _fail(f"{layout_name} layout references a different image.")
        if view_layout.get(text_key) != story.get("summary"):
            _fail(f"{layout_name} layout text differs from the verified editorial summary.")
        if view_layout.get("title", view_layout.get("headline")) != story.get("title"):
            _fail(f"{layout_name} layout title differs from the Editorial Engine output title.")

    return {
        "postId": post_id,
        "mediaId": media_id,
        "status": "PASS",
        "reasons": [],
        "summaryWordCount": story.get("summaryWordCount"),
        "summaryStatus": story.get("summaryStatus"),
    }


def review_editorial_package(
    checker_handoff: dict[str, Any],
    editorial_package: dict[str, Any],
    *,
    repository_root: str | Path,
) -> dict[str, Any]:
    """Return a fail-closed PASS/HOLD report without modifying either input."""
    started_inputs = {
        "checkerHandoff": copy.deepcopy(checker_handoff),
        "editorialPackage": copy.deepcopy(editorial_package),
    }
    global_reasons: list[str] = []
    post_results: list[dict[str, Any]] = []
    view_id = ""
    job_id = ""
    package_digest = ""
    try:
        if not isinstance(checker_handoff, dict) or checker_handoff.get("schemaVersion") != 1:
            _fail("Completed Checker image-review hand-off schema is invalid.")
        if checker_handoff.get("handoff") != HANDOFF_NAME or checker_handoff.get("handoffVersion") != HANDOFF_VERSION:
            _fail("Input was not issued by the registered Global Checker Image Engine bridge.")
        if checker_handoff.get("phase") != "checker-image-review-complete":
            _fail("Final verification requires the completed Checker image-review phase.")
        if checker_handoff.get("checker") != CHECKER_NAME or checker_handoff.get("checkerVersion") != CHECKER_VERSION:
            _fail("Checker identity/version is not approved for this post-Editorial contract.")

        collector_result = checker_handoff.get("collectorResultWithCheckerReviewedImages")
        checker_review = checker_handoff.get("checkerReview")
        if not isinstance(collector_result, dict) or not isinstance(checker_review, dict):
            _fail("Original Collector result or Checker review is missing from the hand-off.")
        if collector_result.get("schemaVersion") != 1 or collector_result.get("recordSchema") != UNIVERSAL_RECORD_SCHEMA:
            _fail("Original Collector record schema is not the registered Universal Post V1 format.")
        if collector_result.get("recordFields") != list(UNIVERSAL_POST_FIELDS):
            _fail("Original Collector record field list differs from the registered universal schema.")
        job = collector_result.get("job")
        job_errors = _manager_job_errors(job)
        if job_errors:
            _fail("Original Manager job is invalid: " + " ".join(job_errors))
        view_id = str(job.get("viewId") or "")
        job_id = str(job.get("jobId") or "")
        if checker_handoff.get("viewId") != view_id or checker_handoff.get("jobId") != job_id:
            _fail("Checker hand-off View/job IDs differ from the original Manager job.")
        if checker_review.get("viewId") != view_id or checker_review.get("jobId") != job_id:
            _fail("Nested Checker review belongs to a different View/job.")
        if checker_review.get("checker") != CHECKER_NAME or checker_review.get("checkerVersion") != CHECKER_VERSION:
            _fail("Nested Checker review identity/version is invalid.")
        if checker_review.get("checkerMode") != "universal-view-independent":
            _fail("Nested Checker review is not from the view-independent Global Checker.")
        if checker_review.get("configVersion") != job.get("configVersion"):
            _fail("Nested Checker review configVersion differs from the original Manager job.")
        if checker_review.get("reportVisibility") != "INTERNAL_ONLY_NOT_FOR_PUBLICATION":
            _fail("Nested Checker report is missing its internal-only designation.")
        if checker_review.get("contentMutationPerformed") is not False or checker_review.get("editorialChangesPerformed") is not False:
            _fail("Nested Checker report does not confirm that Checker did not alter content.")

        contract = _load_registry_contract(Path(repository_root), view_id, job)
        for label, actual, expected in (
            ("Manager Source Registry", checker_handoff.get("managerRegistryVersion"), contract["managerRegistryVersion"]),
            ("Checker Rights Registry", checker_handoff.get("checkerRegistryVersion"), contract["checkerRegistryVersion"]),
            ("Collector Manager Registry", collector_result.get("managerRegistryVersion"), contract["managerRegistryVersion"]),
            ("Checker review Manager Registry", checker_review.get("managerRegistryVersion"), contract["managerRegistryVersion"]),
        ):
            if actual != expected:
                _fail(f"{label} changed or does not match the current registered version.")

        if not isinstance(editorial_package, dict) or editorial_package.get("schemaVersion") != 1:
            _fail("Editorial package schema is invalid.")
        if editorial_package.get("engine") != EDITORIAL_ENGINE_NAME:
            _fail("Editorial package does not identify the registered Universal Editorial Engine.")
        if editorial_package.get("coreEngineVersion") != EDITORIAL_CORE_VERSION:
            _fail("Editorial core Engine version is not approved.")
        if editorial_package.get("newsroomAdapterVersion") != EDITORIAL_ADAPTER_VERSION:
            _fail("Editorial Newsroom adapter version is not approved.")
        if editorial_package.get("phase") != "editorial-production" or editorial_package.get("inputAuthority") != "Global Checker only":
            _fail("Editorial package phase or input authority is invalid.")
        if editorial_package.get("viewId") != view_id or editorial_package.get("jobId") != job_id:
            _fail("Editorial package View/job identity differs from the original Manager job.")
        if editorial_package.get("profileId") != contract["profile"].get("profileId"):
            _fail("Editorial package profileId differs from the registered Manager profile.")
        if editorial_package.get("managerJob") != job:
            _fail("Editorial package did not preserve the complete Manager job envelope.")
        if editorial_package.get("managerRegistryVersion") != contract["managerRegistryVersion"]:
            _fail("Editorial package Manager registry version is stale.")
        if editorial_package.get("checkerRegistryVersion") != contract["checkerRegistryVersion"]:
            _fail("Editorial package Checker registry version is stale.")
        # The Editor's self-reported runtime/privacy flags are not treated as
        # proof. The gate checks the concrete data and role-boundary effects
        # that are observable in these input packages instead.

        records = collector_result.get("records")
        checks = checker_review.get("posts")
        eligible_ids = checker_handoff.get("editorialEligiblePostIds")
        stories = editorial_package.get("stories")
        evidence = editorial_package.get("evidence")
        if not all(isinstance(x, list) for x in (records, checks, eligible_ids, stories, evidence)):
            _fail("Collector records, Checker posts, eligible IDs, stories and evidence must all be arrays.")
        if not eligible_ids or len(eligible_ids) != len(set(map(str, eligible_ids))):
            _fail("Checker editorialEligiblePostIds must be a non-empty unique list.")
        for index, record in enumerate(records):
            if not isinstance(record, dict) or set(record) != set(UNIVERSAL_POST_FIELDS):
                _fail(f"Collector record {index} does not match the fixed Universal Post schema.")
            for media_field in ("media", "attachments"):
                media_values = record.get(media_field) or []
                if not isinstance(media_values, list):
                    _fail(f"Collector record {index} {media_field} is not an array.")
                for media_index, media_record in enumerate(media_values):
                    if not isinstance(media_record, dict) or set(media_record) != set(UNIVERSAL_MEDIA_FIELDS):
                        _fail(f"Collector record {index} {media_field}[{media_index}] does not match the Universal Media schema.")
        post_map = {str(x.get("postId")): x for x in records if isinstance(x, dict) and x.get("postId")}
        check_map = {str(x.get("postId")): x for x in checks if isinstance(x, dict) and x.get("postId")}
        story_map = {str(x.get("postId")): x for x in stories if isinstance(x, dict) and x.get("postId")}
        if len(post_map) != len(records) or len(check_map) != len(checks) or len(story_map) != len(stories):
            _fail("Collector, Checker or Editorial batch contains a missing or duplicate postId.")
        if set(post_map) != set(check_map):
            _fail("Checker post identities do not exactly match the Collector records.")
        expected_ids = set(map(str, eligible_ids))
        if expected_ids != set(story_map):
            _fail("Editorial story identities do not exactly match Checker editorialEligiblePostIds.")
        if not stories:
            _fail("Editorial package contains no stories.")

        # Evidence is internal-only and must have a one-to-one mapping to the
        # same story/source/image. It is never a Publisher content source.
        evidence_map: dict[str, dict[str, Any]] = {}
        for item in evidence:
            if not isinstance(item, dict):
                _fail("Editorial evidence contains a malformed entry.")
            evidence_post = str(item.get("postId") or "")
            if not evidence_post or evidence_post in evidence_map:
                _fail("Editorial evidence post IDs are missing or duplicated.")
            evidence_map[evidence_post] = item
        if set(evidence_map) != expected_ids:
            _fail("Editorial evidence identities do not exactly match the eligible story identities.")

        seen_verified_media_ids: set[str] = set()
        for post_id in map(str, eligible_ids):
            post = post_map.get(post_id)
            check = check_map.get(post_id)
            story = story_map.get(post_id)
            try:
                if post is None or check is None or story is None:
                    _fail(f"Eligible post '{post_id}' is missing from one or more pipeline stages.")
                ev = evidence_map[post_id]
                if ev.get("visibility") != "TRANSIENT_CHECKER_EVIDENCE_ONLY":
                    _fail("Summary evidence is missing its Checker-only visibility marker.")
                source_summary = _clean(post.get("summary"), 30000)
                if ev.get("summaryExcerpt") != source_summary or ev.get("summaryExcerptSha256") != _sha256(source_summary):
                    _fail("Editorial evidence does not preserve the exact Checker-cleared source summary and digest.")
                if ev.get("postId") != post_id or ev.get("mediaId") != check.get("image", {}).get("mediaId"):
                    _fail("Editorial evidence post/media identity differs from the Checker decision.")
                if ev.get("generatedSummarySha256") != _sha256(str(story.get("summary") or "")):
                    _fail("Editorial evidence digest does not match the generated summary.")
                result = _verify_story(story, post, check, job, view_id)
                if result["mediaId"] in seen_verified_media_ids:
                    _fail("A mediaId is reused across multiple editorial stories.")
                seen_verified_media_ids.add(result["mediaId"])
                post_results.append(result)
            except PostEditorialVerificationError as exc:
                post_results.append({
                    "postId": post_id,
                    "mediaId": story.get("mediaId") if isinstance(story, dict) else None,
                    "status": "HOLD",
                    "reasons": [str(exc)],
                })

        package_digest = _sha256(json.dumps(editorial_package, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str))
    except Exception as exc:
        global_reasons.append(str(exc)[:900])

    # Ensure no verifier function changed either submitted input.
    inputs_unchanged = (
        started_inputs["checkerHandoff"] == checker_handoff
        and started_inputs["editorialPackage"] == editorial_package
    )
    if not inputs_unchanged:
        global_reasons.append("Verification implementation unexpectedly mutated an input package.")

    passed_count = sum(1 for item in post_results if item.get("status") == "PASS")
    held_count = sum(1 for item in post_results if item.get("status") != "PASS")
    release_for_publisher = not global_reasons and passed_count > 0
    if not release_for_publisher:
        verdict = "HOLD"
    elif held_count:
        verdict = "PARTIAL"
    else:
        verdict = "PASS"
    return {
        "schemaVersion": 1,
        "checker": CHECKER_NAME,
        "checkerVersion": CHECKER_VERSION,
        "verificationGate": GATE_NAME,
        "verificationGateVersion": GATE_VERSION,
        "phase": "post-editorial-verification-complete" if release_for_publisher else "post-editorial-verification-held",
        "verdict": verdict,
        "releaseForPublisher": bool(release_for_publisher),
        "viewId": view_id,
        "jobId": job_id,
        "editorialPackageSha256": package_digest,
        "globalReasons": global_reasons,
        "posts": post_results,
        "approvedStoryIds": [item["postId"] for item in post_results if item.get("status") == "PASS"] if release_for_publisher else [],
        "statistics": {
            "storiesReceived": len(post_results),
            "storiesPassed": sum(1 for item in post_results if item.get("status") == "PASS"),
            "storiesHeld": held_count,
        },
        "decisionBoundary": {
            "priorCheckerRightsAndEligibilityDecisionsRemainAuthoritative": True,
            "newRightsOrCopyrightDecisionCreated": False,
            "newImageApprovalCreated": False,
            "editorialTextRewritten": False,
            "summaryGeneratedOrChanged": False,
            "rankingOrModerationPerformed": False,
            "publisherOrDatabaseWritePerformed": False,
            "publisherMustUseApprovedStoryIds": True,
            "publisherMustExcludeInternalEvidenceFields": True,
            "internalOnlyFields": ["sourceRecord", "managerLineage", "checkerDecisions", "checkerRecord", "checkerReportVisibility", "evidence"],
        },
        "privacy": {
            "sourceWebsitesFetched": False,
            "rawSourceTextPersisted": False,
            "evidencePersisted": False,
            "viewDatabaseOpenedOrWritten": False,
            "feedOrPdfWritten": False,
            "publicationPerformed": False,
            "inputPackagesMutated": not inputs_unchanged,
        },
        "inputPackagesUnchanged": inputs_unchanged,
        "reportVisibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION",
        "nextSystem": "Configured View Publisher (approvedStoryIds only)" if release_for_publisher else "HOLD — no Publisher release",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checker-handoff-file", required=True)
    parser.add_argument("--editorial-package-file", required=True)
    parser.add_argument("--repository-root", default=".")
    args = parser.parse_args(argv)
    try:
        handoff = json.loads(Path(args.checker_handoff_file).read_text(encoding="utf-8"))
        package = json.loads(Path(args.editorial_package_file).read_text(encoding="utf-8"))
        result = review_editorial_package(handoff, package, repository_root=args.repository_root)
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0 if result.get("verdict") in ("PASS", "PARTIAL") else 2
    except Exception as exc:
        json.dump({
            "checker": CHECKER_NAME,
            "verificationGate": GATE_NAME,
            "verificationGateVersion": GATE_VERSION,
            "phase": "post-editorial-verification-held",
            "verdict": "HOLD",
            "releaseForPublisher": False,
            "reportVisibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION",
            "errorType": type(exc).__name__,
            "message": str(exc)[:900],
        }, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

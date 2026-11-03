#!/usr/bin/env python3
"""Global Image Engine Newsroom adapter.

Input is an explicit hand-off issued by the Universal Global Checker. The
adapter creates at most one image candidate per post and returns it to the
Checker for an independent image-rights decision. It never approves,
publishes, edits text, or writes to a View database.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from image_engine import (
    ENGINE_NAME, ENGINE_VERSION, PIPELINE_VERSION, ImageEngine, ImageEngineError,
    clean_text, media_record, stage_directory, validate_lineage, validate_manager_job,
)

PIPELINE_NAME = "LIVE // EARTH Global Image Engine Newsroom Handoff"
REQUIRED_CHECKER = "LIVE // EARTH Global Content Rights & Provenance Checker"
RAW_ASSET_ROOT = "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main"


class ImageEnginePipelineError(RuntimeError):
    """A Checker-to-Image-Engine hand-off could not be completed safely."""


def _validate_checker_input(data: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    if not isinstance(data, dict) or data.get("schemaVersion") != 1:
        raise ImageEnginePipelineError("Checker image-engine input schema must be version 1.")
    if data.get("phase") != "image-engine-intake":
        raise ImageEnginePipelineError("A Global Checker image-engine-intake hand-off is required.")
    if data.get("checker") != REQUIRED_CHECKER:
        raise ImageEnginePipelineError("Input was not issued by the registered Global Checker.")
    if data.get("checkerVersion") != "2.0.0":
        raise ImageEnginePipelineError("Universal Global Checker version is not approved for this hand-off.")
    if not data.get("checkerRegistryVersion") or not data.get("managerRegistryVersion"):
        raise ImageEnginePipelineError("Checker and Manager registry versions are required.")
    job = validate_manager_job(data.get("managerJob"))
    if data.get("viewId") != job.get("viewId") or data.get("jobId") != job.get("jobId"):
        raise ImageEnginePipelineError("Top-level View/job identity differs from the Manager job.")
    entries = data.get("imageEngineInputs")
    if not isinstance(entries, list):
        raise ImageEnginePipelineError("Checker hand-off has no imageEngineInputs list.")
    seen: set[str] = set()
    clean_entries = []
    for entry in entries:
        if not isinstance(entry, dict):
            raise ImageEnginePipelineError("Checker imageEngineInputs contains a non-object entry.")
        post_id = clean_text(entry.get("postId"), 160)
        if not post_id or post_id in seen:
            raise ImageEnginePipelineError("Checker imageEngineInputs contains a missing or repeated postId.")
        seen.add(post_id)
        validate_lineage(job, entry)
        if entry.get("eligibleForImageEngine") is not True:
            raise ImageEnginePipelineError(f"Post '{post_id}' is not explicitly eligible for Image Engine processing.")
        if not clean_text(entry.get("title"), 240) or not str(entry.get("articleUrl") or "").startswith("https://"):
            raise ImageEnginePipelineError(f"Post '{post_id}' has no permitted title or HTTPS article URL.")
        policy = entry.get("imagePolicy")
        if not isinstance(policy, dict):
            raise ImageEnginePipelineError(f"Post '{post_id}' has no Checker-supplied image policy configuration.")
        clean_entries.append(entry)
    return job, clean_entries


def _commons_candidate(engine: ImageEngine, entry: dict[str, Any]) -> dict[str, Any] | None:
    policy = entry["imagePolicy"].get("wikimediaCommons", {})
    if not isinstance(policy, dict) or policy.get("enabled") is not True:
        return None
    accepted = policy.get("acceptedLicenses")
    if not isinstance(accepted, list) or not accepted:
        return None
    query = clean_text(entry.get("searchText") or entry.get("title"), 500)
    try:
        found = engine.discover_commons(
            query,
            view_id=entry["viewId"],
            post_id=entry["postId"],
            article_url=entry["articleUrl"],
            accepted_licenses=accepted,
        )
    except Exception:
        return None
    if not found:
        return None
    selected = found[0]
    rights_notice = clean_text(selected.get("rightsNotice"), 700)
    selected["rightsNotice"] = " ".join(x for x in (
        rights_notice,
        "Contextual Commons image candidate; not represented as the original image from the linked report.",
    ) if x)
    return engine.prepare_commons_candidate(selected, asset_url_base=entry["imagePolicy"]["assetUrlBase"])


def _illustration_candidate(engine: ImageEngine, entry: dict[str, Any], job: dict[str, Any]) -> dict[str, Any] | None:
    policy = entry["imagePolicy"].get("imageEngineOriginalIllustration", {})
    if not isinstance(policy, dict) or policy.get("enabled") is not True:
        return None
    return engine.create_original_illustration(
        post={
            "postId": entry["postId"],
            "title": entry["title"],
            "searchText": entry.get("searchText") or entry["title"],
            "articleUrl": entry["articleUrl"],
        },
        view_id=entry["viewId"],
        asset_url_base=entry["imagePolicy"]["assetUrlBase"],
        manager_job=job,
    )


def process_checker_intake(
    intake_review: dict[str, Any],
    *,
    repository_root: str | Path,
    staging_root: str | Path | None = None,
) -> dict[str, Any]:
    """Prepare at most one image candidate per Checker-cleared post.

    The candidate is returned to the Checker with its full Manager/post
    lineage. The staged file remains private; this function cannot publish it.
    """
    root = Path(repository_root).resolve()
    job, entries = _validate_checker_input(intake_review)
    stage_base = Path(staging_root).resolve() if staging_root else root / ".image-engine-staging"
    run_dir = stage_directory(stage_base, str(job["jobId"]), str(job["viewId"]))
    engine = ImageEngine(run_dir)
    results: list[dict[str, Any]] = []
    checker_handoff: list[dict[str, Any]] = []
    try:
        for entry in entries:
            candidate = None
            route = "none"
            try:
                candidate = _commons_candidate(engine, entry)
                if candidate:
                    route = "wikimedia-commons"
            except Exception:
                candidate = None
            if candidate is None:
                try:
                    candidate = _illustration_candidate(engine, entry, job)
                    if candidate:
                        route = "local-original-illustration"
                except Exception:
                    candidate = None
            if candidate is None:
                results.append({
                    "postId": entry["postId"],
                    "viewId": entry["viewId"],
                    "sourceId": entry["sourceId"],
                    "status": "NO_IMAGE_CANDIDATE",
                    "route": "none",
                    "media": None,
                    "checkerDecisionRequired": False,
                })
                continue
            media = media_record(candidate, job=job, entry=entry)
            checker_handoff.append({
                "postId": entry["postId"],
                "viewId": entry["viewId"],
                "sourceId": entry["sourceId"],
                "media": media,
            })
            results.append({
                "postId": entry["postId"],
                "viewId": entry["viewId"],
                "sourceId": entry["sourceId"],
                "status": "PENDING_CHECKER_REVIEW",
                "route": route,
                "mediaId": media["mediaId"],
                "media": media,
                "checkerDecisionRequired": True,
            })
    except Exception:
        # Failed runs do not leak staged assets into a later job.
        shutil.rmtree(run_dir, ignore_errors=True)
        raise

    pending = sum(1 for item in results if item["status"] == "PENDING_CHECKER_REVIEW")
    none = len(results) - pending
    return {
        "schemaVersion": 1,
        "pipeline": PIPELINE_NAME,
        "pipelineVersion": PIPELINE_VERSION,
        "imageEngine": ENGINE_NAME,
        "imageEngineVersion": ENGINE_VERSION,
        "phase": "checker-image-candidate-return",
        "viewId": job["viewId"],
        "jobId": job["jobId"],
        "idempotencyKey": job["idempotencyKey"],
        "configVersion": job["configVersion"],
        "managerRegistryVersion": intake_review["managerRegistryVersion"],
        "checkerRegistryVersion": intake_review["checkerRegistryVersion"],
        "managerJob": job,
        "processedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "statistics": {
            "postsReceived": len(entries),
            "imageCandidatesReturned": pending,
            "postsWithoutImageCandidate": none,
            "imagesPublished": 0,
        },
        "results": results,
        "checkerHandoff": checker_handoff,
        "stagingDirectory": str(run_dir),
        "privacyAndOwnership": {
            "sourceWebsitesFetched": False,
            "rawSourceBodyRead": False,
            "hostedImageGenerationUsed": False,
            "viewDatabaseOpenedOrWritten": False,
            "imageRightsApprovedByImageEngine": False,
            "checkerDecisionCreatedByImageEngine": False,
            "publicAssetsWritten": False,
            "publicationPerformed": False,
            "viewDatabasesMixed": False,
            "oneImageMaximumPerPost": True,
            "allManagerLineagePreserved": True,
        },
        "nextSystem": "LIVE // EARTH Global Checker",
        "handoffNote": (
            "The Checker must independently evaluate every candidate in checkerHandoff. "
            "Only Checker-cleared text and image data may then be sent together to the Global Editorial Engine. "
            "The stagedPath and SHA-256 in media.metadata are private processing evidence, not public feed fields."
        ),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="live-earth-global-image-engine")
    parser.add_argument("--intake-file", required=True, help="Checker-issued image-engine-intake JSON.")
    parser.add_argument("--repository-root", default=".")
    parser.add_argument("--staging-root")
    args = parser.parse_args(argv)
    try:
        data = json.loads(Path(args.intake_file).read_text(encoding="utf-8"))
        result = process_checker_intake(data, repository_root=args.repository_root, staging_root=args.staging_root)
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        json.dump({
            "pipeline": PIPELINE_NAME,
            "phase": "image-engine-blocked",
            "publicAssetsWritten": False,
            "errorType": type(exc).__name__,
            "message": str(exc)[:600],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

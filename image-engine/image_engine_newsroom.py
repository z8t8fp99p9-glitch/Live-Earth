#!/usr/bin/env python3
"""LIVE // EARTH Image Engine — Global Newsroom hand-off.

Consumes only the sanitized `imageEngineInputs` produced by
Global Checker collection intake. It may discover a rights-verifiable Commons
candidate where the current Checker policy permits it, otherwise creates an
original local procedural illustration.

Every candidate is evaluated by the existing Global Checker. This module
cannot approve images, write story databases, edit stories, or publish feeds.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any
import argparse
import hashlib
import importlib
import json
import re
import shutil
import sys
import uuid


PIPELINE_NAME = "LIVE // EARTH Image Engine Newsroom Handoff"
PIPELINE_VERSION = "1.0.0"
ALLOWED_VIEWS = {"nature", "alien-world"}
RAW_ASSET_ROOT = (
    "https://raw.githubusercontent.com/z8t8fp99p9-glitch/"
    "Live-Earth/main"
)
STOP_WORDS = {
    "about", "after", "also", "among", "and", "are", "around", "because",
    "been", "before", "being", "could", "from", "have", "into", "more",
    "most", "near", "over", "said", "says", "that", "their", "there",
    "these", "they", "this", "through", "under", "using", "were", "what",
    "when", "where", "which", "while", "with", "would", "year", "years",
    "new", "latest", "update", "report", "study", "research",
}


class ImageEnginePipelineError(RuntimeError):
    """A safe Image Engine hand-off could not be completed."""


def _clean(value: Any, limit: int = 1200) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def _tokens(value: Any) -> set[str]:
    return {
        token for token in re.findall(r"[a-z0-9]+", _clean(value, 800).casefold())
        if len(token) >= 3 and token not in STOP_WORDS
    }


def _candidate_relevance(query: str, candidate: dict[str, Any]) -> bool:
    query_tokens = _tokens(query)
    if not query_tokens:
        return False
    candidate_tokens = _tokens(
        " ".join([
            _clean(candidate.get("fileTitle"), 500),
            _clean(candidate.get("caption"), 900),
            _clean(candidate.get("credit"), 200),
        ])
    )
    overlap = len(query_tokens & candidate_tokens)
    required = 1 if len(query_tokens) <= 3 else 2
    return overlap >= required


def _load_components(repository_root: Path):
    root = Path(repository_root).resolve()
    checker_dir = root / "global-checker"
    image_dir = root / "image-engine"
    if not checker_dir.is_dir() or not image_dir.is_dir():
        raise ImageEnginePipelineError("Global Checker or Image Engine directory is missing.")

    for folder in (str(checker_dir), str(image_dir)):
        if folder not in sys.path:
            sys.path.insert(0, folder)

    try:
        checker = importlib.import_module("global_checker")
        policy_engine = importlib.import_module("global_checker_policy_engine")
        engine_module = importlib.import_module("image_engine")
        policy_engine.install(checker)
    except Exception as exc:
        raise ImageEnginePipelineError(
            f"Existing Global Checker / Image Engine could not be loaded: {type(exc).__name__}: {exc}"
        ) from exc

    return checker, engine_module


def _validate_intake(intake_review: dict[str, Any], repository_root: Path,
                     checker: Any) -> tuple[str, list[dict[str, Any]], dict[str, Any]]:
    if not isinstance(intake_review, dict) or intake_review.get("schemaVersion") != 1:
        raise ImageEnginePipelineError("Global Checker intake review has an unsupported schema.")
    if intake_review.get("phase") != "collection-intake":
        raise ImageEnginePipelineError("Image Engine requires a completed Global Checker collection-intake review.")
    view_id = intake_review.get("viewId")
    if view_id not in ALLOWED_VIEWS:
        raise ImageEnginePipelineError("Image Engine received an unregistered View.")
    registry = checker.load_registry()
    if intake_review.get("checkerRegistryVersion") != registry.get("registryVersion"):
        raise ImageEnginePipelineError("Global Checker registry changed after intake; image work is held.")

    reviews = {
        item.get("storyId"): item
        for item in intake_review.get("reviews", [])
        if isinstance(item, dict) and item.get("storyId")
    }
    inputs = intake_review.get("imageEngineInputs")
    if not isinstance(inputs, list):
        raise ImageEnginePipelineError("Global Checker intake has no imageEngineInputs array.")

    accepted = []
    seen = set()
    for item in inputs:
        if not isinstance(item, dict):
            continue
        story_id = _clean(item.get("storyId"), 160)
        review = reviews.get(story_id)
        if not story_id or story_id in seen:
            continue
        seen.add(story_id)
        if item.get("viewId") != view_id:
            raise ImageEnginePipelineError("Image Engine input crosses a View boundary.")
        if not review or review.get("eligibleForImageEngine") is not True:
            raise ImageEnginePipelineError(
                f"Story '{story_id}' does not have an explicit Global Checker Image Engine hand-off."
            )
        permissions = review.get("permissions", {})
        if permissions.get("temporaryProcessing") != "allowed":
            continue
        decision = review.get("sourceDecision", {})
        if (
            decision.get("allowed") is not True
            or decision.get("verdict") not in {"GREEN", "AMBER"}
            or decision.get("registryVersion") != registry.get("registryVersion")
        ):
            continue
        article_url = _clean(item.get("articleUrl"), 1400)
        if not article_url.startswith("https://"):
            continue
        source_id = _clean(item.get("sourceId"), 120)
        source_name = _clean(item.get("sourceName"), 200)
        source_policy_ref = _clean(item.get("sourcePolicyRef"), 160)
        source_decision_id = _clean(decision.get("decisionId"), 120)
        if (
            not source_id or not source_name or not source_policy_ref
            or item.get("sourceId") != review.get("sourceId")
            or item.get("sourcePolicyRef") != review.get("sourcePolicyRef")
            or _clean(item.get("articleUrl"), 1400) != _clean(review.get("articleUrl"), 1400)
            or _clean(item.get("checkerDecisionId"), 120) != source_decision_id
        ):
            raise ImageEnginePipelineError(
                f"Image Engine hand-off for story '{story_id}' does not match its exact Checker intake review."
            )
        # Only the explicitly permitted headline and structural metadata may
        # leave the Checker. Never read or request the original source summary.
        headline = ""
        if permissions.get("headingLinkUse") == "allowed":
            headline = _clean(item.get("headline"), 500)
        accepted.append({
            "storyId": story_id,
            "viewId": view_id,
            "sourceId": source_id,
            "sourceName": source_name,
            "sourcePolicyRef": source_policy_ref,
            "articleUrl": article_url,
            "headline": headline,
            "publishedAt": _clean(item.get("publishedAt"), 80),
            "checkerDecisionId": _clean(item.get("checkerDecisionId"), 120),
            "intakeDecisionId": source_decision_id,
            "permissions": permissions,
        })
    return view_id, accepted, registry


def _published_paths(root: Path, view_id: str) -> tuple[Path, str]:
    output = (root / view_id / "published" / "assets").resolve()
    expected = (root / view_id / "published" / "assets").resolve()
    if output != expected:
        raise ImageEnginePipelineError("Image publication directory failed its View path check.")
    raw = f"{RAW_ASSET_ROOT}/{view_id}/published/assets/"
    return output, raw


def _record_metadata(candidate: dict[str, Any], checker_decision: dict[str, Any],
                     published_path: Path, repository_root: Path,
                     image_type: str) -> dict[str, Any]:
    root = Path(repository_root).resolve()
    try:
        relative = published_path.resolve().relative_to(root).as_posix()
    except ValueError as exc:
        raise ImageEnginePipelineError("Approved image path is outside the repository.") from exc
    digest = hashlib.sha256(published_path.read_bytes()).hexdigest()
    if digest != candidate.get("sha256"):
        raise ImageEnginePipelineError("Published image hash differs from the staged Checker-reviewed image.")

    return {
        "storyId": candidate["storyId"],
        "viewId": candidate["viewId"],
        "imageUrl": candidate.get("imageUrl") or candidate.get("url"),
        "imageCredit": candidate.get("credit", ""),
        "imageSourceUrl": candidate.get("sourcePage", ""),
        "imageCaption": candidate.get("caption", ""),
        "imageRightsNote": candidate.get("rightsNotice", ""),
        "imageLicense": candidate.get("licenseName", ""),
        "imageLicenseUrl": candidate.get("licenseUrl", ""),
        "imageOriginType": candidate.get("originType", ""),
        "imageEngine": candidate.get("engine", ""),
        "imageEngineVersion": candidate.get("engineVersion", ""),
        "imageType": image_type,
        "file": relative,
        "sha256": digest,
        "checkerDecision": checker_decision,
        "checkerDecisionId": checker_decision.get("decisionId"),
        "checkerPolicyId": checker_decision.get("policyId"),
        "checkerPolicyVersion": checker_decision.get("policyVersion"),
        "approved": True,
    }


def _try_commons(
    engine: Any,
    checker: Any,
    item: dict[str, Any],
    *,
    repository_root: Path,
    output_dir: Path,
    raw_asset_base_url: str,
    staging_root: Path,
) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    """Nature-only Commons route. Global Checker must return exact GREEN."""
    query = item.get("headline", "")
    if item["viewId"] != "nature" or not query:
        return None, []

    registry = checker.load_registry()
    commons_policy = registry.get("imagePolicies", {}).get("wikimediaCommons", {})
    accepted = set(commons_policy.get("acceptedLicenses", []))
    if not accepted:
        return None, []

    try:
        found = engine.discover_commons(
            query,
            view_id=item["viewId"],
            story_id=item["storyId"],
            article_url=item["articleUrl"],
            limit=engine.max_candidates,
        )
    except Exception:
        return None, []

    decisions = []
    run_dir = staging_root / ("commons-" + uuid.uuid4().hex[:12])
    run_dir.mkdir(parents=True, exist_ok=False)
    try:
        for discovered in found:
            if discovered.get("licenseUrl") not in accepted:
                continue
            if not _candidate_relevance(query, discovered):
                continue
            candidate = dict(discovered)
            existing_notice = _clean(candidate.get("rightsNotice"), 600)
            context_notice = (
                "Contextual Wikimedia Commons image. It is not represented as the "
                "original image from the linked report. The exact file-page creator, "
                "licence and attribution are retained for Global Checker review."
            )
            candidate["rightsNotice"] = " ".join(x for x in (existing_notice, context_notice) if x)
            try:
                prepared = engine.prepare_commons_candidate(
                    candidate,
                    published_base_url=raw_asset_base_url,
                )
                decision = checker.evaluate_image(
                    item["viewId"], item["storyId"], prepared,
                    article_url=item["articleUrl"], source_name=item["sourceName"],
                )
                decisions.append(decision)
                attached = engine.attach_checker_decision(prepared, decision)
                if not attached.get("approved"):
                    continue
                published = engine.publish_checker_approved(attached, output_dir)
                metadata = _record_metadata(
                    attached, decision, published, repository_root,
                    "Wikimedia Commons contextual image",
                )
                return metadata, decisions
            except Exception:
                # Every denied, mismatched or failed candidate is discarded.
                # Continue only to another separately checked Commons result.
                continue
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)
    return None, decisions


def _try_original_illustration(
    engine: Any,
    checker: Any,
    item: dict[str, Any],
    *,
    repository_root: Path,
    output_dir: Path,
    raw_asset_base_url: str,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """Create a local non-documentary image and request a new Checker decision."""
    title = item["headline"] or (
        "Nature story" if item["viewId"] == "nature" else "Space science story"
    )
    candidate = engine.create_original_illustration(
        {
            "id": item["storyId"],
            "url": item["articleUrl"],
            "title": title,
        },
        item["viewId"],
        published_base_url=raw_asset_base_url,
    )
    decision = checker.evaluate_image(
        item["viewId"], item["storyId"], candidate,
        article_url=item["articleUrl"], source_name=item["sourceName"],
    )
    attached = engine.attach_checker_decision(candidate, decision)
    if not attached.get("approved"):
        return None, decision
    published = engine.publish_checker_approved(attached, output_dir)
    metadata = _record_metadata(
        attached, decision, published, repository_root,
        "Original local procedural illustration — not a photograph",
    )
    return metadata, decision


def process_checker_intake(
    intake_review: dict[str, Any],
    *,
    repository_root: str | Path,
) -> dict[str, Any]:
    """Create, re-check and stage approved image replacements for one View.

    `intake_review` must be the output of
    `global_checker_workflow.review_collection_batch(...)`.
    This function writes assets only after an exact GREEN Checker decision.
    It never opens or writes the View's story database and does not publish any
    Live Feed or Magazine output.
    """
    root = Path(repository_root).resolve()
    checker, engine_module = _load_components(root)
    view_id, items, registry = _validate_intake(intake_review, root, checker)
    output_dir, raw_asset_base_url = _published_paths(root, view_id)
    staging_base = root / ".image-engine-staging" / view_id
    staging_base.mkdir(parents=True, exist_ok=True)
    run_dir = staging_base / uuid.uuid4().hex
    run_dir.mkdir(parents=True, exist_ok=False)
    engine = engine_module.ImageEngine(run_dir)

    outputs = []
    checker_decisions = []
    try:
        for item in items:
            image = None
            selected_decision = None
            route = "none"

            # The current Global Checker registry accepts Commons contextual
            # images for Nature only. Alien World remains on its NASA-origin
            # documentary route and local original-illustration fallback.
            if view_id == "nature":
                image, commons_decisions = _try_commons(
                    engine, checker, item,
                    repository_root=root,
                    output_dir=output_dir,
                    raw_asset_base_url=raw_asset_base_url,
                    staging_root=run_dir,
                )
                checker_decisions.extend(commons_decisions)
                if image:
                    selected_decision = image.get("checkerDecision")
                    route = "approved-free-image"

            if not image:
                image, fallback_decision = _try_original_illustration(
                    engine, checker, item,
                    repository_root=root,
                    output_dir=output_dir,
                    raw_asset_base_url=raw_asset_base_url,
                )
                if fallback_decision:
                    checker_decisions.append(fallback_decision)
                if image:
                    selected_decision = fallback_decision
                    route = "approved-local-illustration"

            if image and selected_decision:
                outputs.append({
                    "storyId": item["storyId"],
                    "viewId": view_id,
                    "status": "approved",
                    "route": route,
                    "image": image,
                    "checkerDecisionId": selected_decision.get("decisionId"),
                    "textOnlyAllowedIfImageNotUsed": True,
                })
            else:
                outputs.append({
                    "storyId": item["storyId"],
                    "viewId": view_id,
                    "status": "text-only",
                    "route": "no-approved-image",
                    "image": None,
                    "checkerDecisionId": None,
                    "textOnlyAllowedIfImageNotUsed": True,
                    "note": "No replacement passed the Global Checker; eligible text remains independently usable.",
                })
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)

    approved = [item for item in outputs if item["status"] == "approved"]
    text_only = [item for item in outputs if item["status"] == "text-only"]
    return {
        "schemaVersion": 1,
        "pipeline": PIPELINE_NAME,
        "pipelineVersion": PIPELINE_VERSION,
        "imageEngine": engine_module.ENGINE_NAME,
        "imageEngineVersion": engine_module.ENGINE_VERSION,
        "phase": "checker-approved-image-fallback",
        "viewId": view_id,
        "checkerRegistryVersion": registry.get("registryVersion"),
        "processedAt": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "statistics": {
            "imageRequestsReceived": len(items),
            "imagesApproved": len(approved),
            "textOnlyContinuations": len(text_only),
        },
        "results": outputs,
        "checkerDecisions": checker_decisions,
        "privacyAndOwnership": {
            "rawSourceTextRead": False,
            "sourceWebsitesFetched": False,
            "approvedMediaSourcesUsed": ["Wikimedia Commons"] if view_id == "nature" else [],
            "hostedImageGenerationUsed": False,
            "databaseOpenedOrWritten": False,
            "natureAndAlienWorldAssetsMixed": False,
            "arbitraryImageHostsAccepted": False,
            "imageEngineSelfApproval": False,
            "publisherOutputWritten": False,
        },
        "nextSystem": "Universal Editorial Engine",
        "handoffNote": (
            "Attach each approved image to the matching story by storyId. "
            "Carry the exact Checker decision and metadata forward for final Checker review."
        ),
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="live-earth-image-engine",
        description="Create replacement image candidates from a Global Checker intake hand-off.",
    )
    parser.add_argument("--intake-file", required=True, help="Global Checker collection-intake JSON.")
    parser.add_argument("--repository-root", default=".", help="LIVE // EARTH repository root.")
    args = parser.parse_args(argv)
    try:
        intake = json.loads(Path(args.intake_file).read_text(encoding="utf-8"))
        result = process_checker_intake(intake, repository_root=args.repository_root)
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        json.dump({
            "pipeline": PIPELINE_NAME,
            "status": "blocked",
            "databaseOpenedOrWritten": False,
            "errorType": type(exc).__name__,
            "message": str(exc)[:500],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

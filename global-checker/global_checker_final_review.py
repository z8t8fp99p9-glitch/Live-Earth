#!/usr/bin/env python3
"""Guarded Newsroom hand-off to the existing LIVE // EARTH Global Checker.

This is an additive adapter, not a second Checker. It validates that a package
came from the registered Universal Editorial Engine Newsroom adapter and that
all stories came from the exact editorialInputs released by the collection
intake review. It then delegates the actual review to
 global_checker_workflow.review_editorial_package(...).

The adapter does not fetch sources, write databases, persist audit records,
write feeds/PDFs, or publish. Evidence excerpts are transient review inputs.
"""
from __future__ import annotations

import argparse
import copy
import importlib
import json
import sys
from pathlib import Path
from typing import Any, Iterable

ADAPTER_NAME = "LIVE // EARTH Global Checker Final Review Adapter"
ADAPTER_VERSION = "1.0.0"
EXPECTED_EDITORIAL_ENGINE = "Universal Editorial Engine"
EXPECTED_CORE_ENGINE_VERSION = "1.3.0"
EXPECTED_EDITORIAL_ADAPTER_VERSION = "1.0.0"
ALLOWED_VIEWS = {"nature", "alien-world"}
RAW_SOURCE_FIELDS = {
    "rawText", "raw_text", "rawArticleBody", "raw_article_body",
    "sourceText", "source_text", "sourceBody", "source_body",
    "fullText", "full_text", "fullArticleText", "full_article_text",
    "rawHtml", "raw_html", "htmlBody", "originalArticleText",
}
REQUIRED_EDITORIAL_PRIVACY = {
    "sourceWebsitesFetched": False,
    "hostedAIOrInferenceUsed": False,
    "paidServiceUsed": False,
    "rawArticleBodyRead": False,
    "rawSourceTextPersisted": False,
    "viewDatabaseOpenedOrWritten": False,
    "feedOrPDFWritten": False,
    "publicationPerformed": False,
    "viewDatabasesMixed": False,
    "checkerDecisionsCreatedOrSelfApproved": False,
    "evidenceExcerptsAreTransientForCheckerOnly": True,
}
REQUIRED_INTAKE_PRIVACY = {
    "rawSourceTextStored": False,
    "sharedStoryDatabaseOpened": False,
    "natureAndAlienWorldCombined": False,
    "networkRequestsMadeByChecker": False,
}


class GlobalCheckerFinalReviewError(RuntimeError):
    """A final-review hand-off failed a required provenance or safety check."""


def _clean(value: Any, limit: int = 2000) -> str:
    return " ".join(str(value or "").split())[:limit]


def _load_workflow(repository_root: Path):
    root = Path(repository_root).resolve()
    checker_dir = root / "global-checker"
    if not checker_dir.is_dir():
        raise GlobalCheckerFinalReviewError("The Global Checker directory is missing.")
    folder = str(checker_dir)
    if folder not in sys.path:
        sys.path.insert(0, folder)
    try:
        workflow = importlib.import_module("global_checker_workflow")
        context = workflow.RepositoryPolicies(root)
    except Exception as exc:
        raise GlobalCheckerFinalReviewError(
            f"The registered Global Checker workflow could not be loaded: {type(exc).__name__}: {exc}"
        ) from exc
    return workflow, context


def _contains_raw_source_field(value: Any, path: str = "root") -> str | None:
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key) in RAW_SOURCE_FIELDS:
                return f"{path}.{key}"
            found = _contains_raw_source_field(child, f"{path}.{key}")
            if found:
                return found
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found = _contains_raw_source_field(child, f"{path}[{index}]")
            if found:
                return found
    return None


def _validate_intake(intake: dict[str, Any], context: Any) -> tuple[str, dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    if not isinstance(intake, dict) or intake.get("schemaVersion") != 1:
        raise GlobalCheckerFinalReviewError("Global Checker intake schema is invalid.")
    if intake.get("phase") != "collection-intake":
        raise GlobalCheckerFinalReviewError("A completed collection-intake review is required.")
    view_id = _clean(intake.get("viewId"), 80)
    if view_id not in ALLOWED_VIEWS:
        raise GlobalCheckerFinalReviewError("The intake review has an unregistered View ID.")

    if intake.get("checkerRegistryVersion") != context.checker_registry.get("registryVersion"):
        raise GlobalCheckerFinalReviewError("Global Checker policy registry changed after intake; final review is held.")
    if intake.get("managerRegistryVersion") != context.sources_doc.get("registryVersion"):
        raise GlobalCheckerFinalReviewError("Manager Source Registry changed after intake; final review is held.")

    privacy = intake.get("privacy")
    if not isinstance(privacy, dict) or any(privacy.get(k) is not v for k, v in REQUIRED_INTAKE_PRIVACY.items()):
        raise GlobalCheckerFinalReviewError("The intake privacy/ownership assertions are missing or do not match the contract.")

    reviews_raw = intake.get("reviews")
    editorial_raw = intake.get("editorialInputs")
    image_raw = intake.get("imageEngineInputs")
    if not isinstance(reviews_raw, list) or not isinstance(editorial_raw, list) or not isinstance(image_raw, list):
        raise GlobalCheckerFinalReviewError("The intake review must include reviews, editorialInputs and imageEngineInputs arrays.")

    reviews: dict[str, dict[str, Any]] = {}
    for item in reviews_raw:
        if not isinstance(item, dict):
            continue
        story_id = _clean(item.get("storyId"), 160)
        if not story_id:
            continue
        if story_id in reviews:
            raise GlobalCheckerFinalReviewError(f"The intake contains a repeated review identity: {story_id}.")
        reviews[story_id] = item

    editorial: dict[str, dict[str, Any]] = {}
    for record in editorial_raw:
        if not isinstance(record, dict):
            raise GlobalCheckerFinalReviewError("An editorialInputs entry is not an object.")
        story_id = _clean(record.get("id") or record.get("story_id"), 160)
        if not story_id or story_id in editorial:
            raise GlobalCheckerFinalReviewError("The editorialInputs array contains a missing or repeated story identity.")
        review = reviews.get(story_id)
        if not review or review.get("eligibleForGlobalEditor") is not True:
            raise GlobalCheckerFinalReviewError(f"Story '{story_id}' has no matching explicit editorial eligibility decision.")
        if record.get("globalCheckerIntakeDecisionId") != review.get("sourceDecision", {}).get("decisionId"):
            raise GlobalCheckerFinalReviewError(f"Story '{story_id}' does not carry its exact intake decision ID.")
        if record.get("globalCheckerPermissionMatrix") != review.get("permissions"):
            raise GlobalCheckerFinalReviewError(f"Story '{story_id}' permission matrix differs from the Checker review.")
        if record.get("rawSourceTextPersistence") != "PROHIBITED_BY_THIS_WORKFLOW":
            raise GlobalCheckerFinalReviewError(f"Story '{story_id}' is missing the raw-text non-persistence marker.")
        if record.get("viewId") not in (None, view_id):
            raise GlobalCheckerFinalReviewError(f"Story '{story_id}' crosses a View boundary.")
        editorial[story_id] = record

    image_ids = {
        _clean(item.get("storyId"), 160)
        for item in image_raw if isinstance(item, dict) and _clean(item.get("storyId"), 160)
    }
    if set(editorial) & image_ids:
        # One record may not be simultaneously routed through both branches.
        raise GlobalCheckerFinalReviewError("An intake story appears in both the editorial and Image Engine branches.")

    return view_id, reviews, editorial


def _validate_editorial_package(
    package: dict[str, Any],
    view_id: str,
    reviews: dict[str, dict[str, Any]],
    editorial_inputs: dict[str, dict[str, Any]],
    context: Any,
) -> None:
    if not isinstance(package, dict) or package.get("schemaVersion") != 1:
        raise GlobalCheckerFinalReviewError("Universal Editorial Engine package schema is invalid.")
    if package.get("engine") != EXPECTED_EDITORIAL_ENGINE:
        raise GlobalCheckerFinalReviewError("The package did not identify the registered Universal Editorial Engine.")
    if package.get("coreEngineVersion") != EXPECTED_CORE_ENGINE_VERSION:
        raise GlobalCheckerFinalReviewError("The Universal Editorial Engine core version is not the approved version.")
    if package.get("newsroomAdapterVersion") != EXPECTED_EDITORIAL_ADAPTER_VERSION:
        raise GlobalCheckerFinalReviewError("The Universal Editorial Engine Newsroom adapter version is not approved.")
    if package.get("phase") != "editorial-production":
        raise GlobalCheckerFinalReviewError("The package is not in the editorial-production phase.")
    if package.get("viewId") != view_id:
        raise GlobalCheckerFinalReviewError("Editorial package and intake review belong to different Views.")

    profile = context.profiles.get(view_id)
    if not profile or profile.get("enabled") is not True:
        raise GlobalCheckerFinalReviewError("The matching View Collection Profile is missing or disabled.")
    if package.get("profileId") != profile.get("profileId"):
        raise GlobalCheckerFinalReviewError("Editorial package profile ID does not match the registered View profile.")

    privacy = package.get("privacyAndOwnership")
    if not isinstance(privacy, dict) or any(privacy.get(k) is not v for k, v in REQUIRED_EDITORIAL_PRIVACY.items()):
        raise GlobalCheckerFinalReviewError("The Editorial Engine privacy/ownership assertions are missing or do not match the contract.")

    stories = package.get("stories")
    evidence = package.get("evidence")
    if not isinstance(stories, list) or not isinstance(evidence, list):
        raise GlobalCheckerFinalReviewError("Editorial package must contain stories and evidence arrays.")

    seen_story_ids: set[str] = set()
    for story in stories:
        if not isinstance(story, dict):
            raise GlobalCheckerFinalReviewError("Editorial package contains a malformed story entry.")
        story_id = _clean(story.get("id"), 160)
        source_record_id = _clean(story.get("sourceRecordId") or story_id, 160)
        if not story_id or story_id in seen_story_ids:
            raise GlobalCheckerFinalReviewError("Editorial package contains a missing or repeated story identity.")
        seen_story_ids.add(story_id)
        if source_record_id not in editorial_inputs:
            if source_record_id in {
                _clean(item.get("storyId"), 160)
                for item in reviews.values() if item.get("eligibleForImageEngine") is True
            }:
                raise GlobalCheckerFinalReviewError(
                    f"Image-only eligible story '{source_record_id}' cannot be promoted into editorial production."
                )
            raise GlobalCheckerFinalReviewError(f"Story '{source_record_id}' was not released in editorialInputs.")
        intake_item = reviews.get(source_record_id)
        source_record = editorial_inputs[source_record_id]
        if not intake_item or intake_item.get("eligibleForGlobalEditor") is not True:
            raise GlobalCheckerFinalReviewError(f"Story '{source_record_id}' has no explicit Global Editor eligibility.")
        if story.get("viewId") != view_id:
            raise GlobalCheckerFinalReviewError(f"Story '{story_id}' has a mismatched View ID.")
        if story.get("globalCheckerIntakeDecisionId") != source_record.get("globalCheckerIntakeDecisionId"):
            raise GlobalCheckerFinalReviewError(f"Story '{story_id}' cites a different intake decision from its source record.")
        if story.get("sourcePolicyRef") != intake_item.get("sourcePolicyRef"):
            raise GlobalCheckerFinalReviewError(f"Story '{story_id}' has a mismatched source policy reference.")
        if story.get("url") != source_record.get("url") and story.get("url") != intake_item.get("articleUrl"):
            raise GlobalCheckerFinalReviewError(f"Story '{story_id}' has a mismatched source article URL.")
        raw_field = _contains_raw_source_field(story, f"story[{story_id}]")
        if raw_field:
            raise GlobalCheckerFinalReviewError(f"Raw source body field is forbidden in the editorial package: {raw_field}.")

    seen_evidence_ids: set[str] = set()
    for item in evidence:
        if not isinstance(item, dict):
            raise GlobalCheckerFinalReviewError("Editorial package contains a malformed evidence entry.")
        evidence_id = _clean(item.get("evidenceId"), 200)
        source_record_id = _clean(item.get("sourceRecordId"), 160)
        if not evidence_id or evidence_id in seen_evidence_ids:
            raise GlobalCheckerFinalReviewError("Evidence IDs must be present and unique within the editorial package.")
        seen_evidence_ids.add(evidence_id)
        if source_record_id not in seen_story_ids or source_record_id not in editorial_inputs:
            raise GlobalCheckerFinalReviewError("Evidence references a story outside this eligible editorial package.")
        intake_item = reviews.get(source_record_id)
        if not intake_item:
            raise GlobalCheckerFinalReviewError("Evidence has no matching Global Checker intake record.")
        if item.get("sourcePolicyRef") != intake_item.get("sourcePolicyRef"):
            raise GlobalCheckerFinalReviewError("Evidence source policy reference does not match the intake review.")
        if item.get("sourceDecisionId") != intake_item.get("sourceDecision", {}).get("decisionId"):
            raise GlobalCheckerFinalReviewError("Evidence source decision ID does not match the intake review.")
        excerpt = item.get("excerpt")
        if not isinstance(excerpt, str) or not excerpt.strip():
            raise GlobalCheckerFinalReviewError("Evidence excerpt is missing; claims cannot be reviewed.")


def review_editorial_package(
    package: dict[str, Any],
    intake_review: dict[str, Any],
    *,
    repository_root: str | Path,
    retained_records: Iterable[dict[str, Any]] = (),
) -> dict[str, Any]:
    """Validate provenance, then invoke the existing central Checker review.

    Returns Checker-approved stories and per-story decisions. Does not open a
    database, persist excerpts/audit logs, write publication assets, or publish.
    """
    root = Path(repository_root).resolve()
    workflow, context = _load_workflow(root)
    view_id, reviews, editorial_inputs = _validate_intake(intake_review, context)
    _validate_editorial_package(package, view_id, reviews, editorial_inputs, context)

    # Work on private copies because the underlying review adds rights metadata
    # to story dictionaries. The source package remains unchanged for the caller.
    checker_result = workflow.review_editorial_package(
        copy.deepcopy(package),
        copy.deepcopy(intake_review),
        repository_root=root,
        retained_records=copy.deepcopy(list(retained_records)),
    )

    checker_result["finalReviewAdapter"] = ADAPTER_NAME
    checker_result["finalReviewAdapterVersion"] = ADAPTER_VERSION
    checker_result["editorialEngine"] = {
        "name": EXPECTED_EDITORIAL_ENGINE,
        "coreVersion": EXPECTED_CORE_ENGINE_VERSION,
        "newsroomAdapterVersion": EXPECTED_EDITORIAL_ADAPTER_VERSION,
    }
    checker_result["inputRegistryVersions"] = {
        "managerSourceRegistryVersion": intake_review.get("managerRegistryVersion"),
        "globalCheckerRegistryVersion": intake_review.get("checkerRegistryVersion"),
    }
    checker_result["statistics"]["editorialAdapterHeld"] = 0
    checker_result["privacy"] = {
        **checker_result.get("privacy", {}),
        "databaseOpenedOrWrittenByAdapter": False,
        "auditDatabaseWritten": False,
        "rawSourceTextPersisted": False,
        "evidenceExcerptsPersisted": False,
        "feedOrPdfWritten": False,
        "publisherOutputWritten": False,
        "imageOnlyItemsPromotedToEditorial": False,
    }
    checker_result["nextSystem"] = "Correct View-owned database writer, then View Publisher"
    return checker_result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="live-earth-global-checker-final-review",
        description="Run the existing Global Checker final editorial review on a guarded Editorial Engine package.",
    )
    parser.add_argument("--editorial-package", required=True, help="JSON output from Universal Editorial Engine Newsroom adapter.")
    parser.add_argument("--intake-review", required=True, help="Exact JSON output from Global Checker collection intake.")
    parser.add_argument("--repository-root", default=".", help="LIVE // EARTH repository root.")
    parser.add_argument("--retained-records", help="Optional JSON array of same-View retained stories for duplicate review.")
    args = parser.parse_args(argv)
    try:
        package = json.loads(Path(args.editorial_package).read_text(encoding="utf-8"))
        intake = json.loads(Path(args.intake_review).read_text(encoding="utf-8"))
        retained = []
        if args.retained_records:
            retained = json.loads(Path(args.retained_records).read_text(encoding="utf-8"))
            if not isinstance(retained, list):
                raise GlobalCheckerFinalReviewError("Retained records file must contain a JSON array.")
        result = review_editorial_package(
            package, intake,
            repository_root=args.repository_root,
            retained_records=retained,
        )
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        json.dump({
            "adapter": ADAPTER_NAME,
            "adapterVersion": ADAPTER_VERSION,
            "phase": "final-editorial-review-blocked",
            "databaseOpenedOrWritten": False,
            "publisherOutputWritten": False,
            "errorType": type(exc).__name__,
            "message": str(exc)[:600],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

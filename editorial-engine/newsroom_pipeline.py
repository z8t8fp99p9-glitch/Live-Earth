#!/usr/bin/env python3
"""Run one View's complete transient Newsroom editorial pipeline.

Order: Manager -> Global Collector -> Global Checker intake -> Image Engine's
separate image-only branch -> Universal Editorial Engine -> Global Checker
final review -> View-owned Newsroom Database Writer.

Only approved derived stories are persisted. Source material and evidence stay
in memory for this run and are never written to temporary JSON files.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import sys
from pathlib import Path
from typing import Any

ALLOWED_VIEWS = {"nature", "alien-world"}
PIPELINE_NAME = "LIVE // EARTH Global Newsroom Pipeline"
PIPELINE_VERSION = "1.0.0"


class NewsroomPipelineError(RuntimeError):
    """A Newsroom stage failed or returned an invalid hand-off."""


def _load_modules(root: Path) -> dict[str, Any]:
    for folder in (
        root,
        root / "global-checker",
        root / "editorial-engine",
        root / "image-engine",
        root / "newsroom-database-writer",
    ):
        if not folder.is_dir():
            raise NewsroomPipelineError(f"Required Newsroom component directory is missing: {folder.name}")
        value = str(folder)
        if value not in sys.path:
            sys.path.insert(0, value)

    try:
        manager = importlib.import_module("global_collection_manager.manager")
        collector = importlib.import_module("global_collector.collector")
        checker = importlib.import_module("global_checker_workflow")
        editorial = importlib.import_module("universal_editorial_engine_newsroom")
        final_review = importlib.import_module("global_checker_final_review")
        writer = importlib.import_module("newsroom_database_writer")
        image = importlib.import_module("image_engine_newsroom")
    except Exception as exc:
        raise NewsroomPipelineError(
            f"A registered Newsroom component could not be loaded: {type(exc).__name__}: {exc}"
        ) from exc
    return {
        "manager": manager,
        "collector": collector,
        "checker": checker,
        "editorial": editorial,
        "final_review": final_review,
        "writer": writer,
        "image": image,
    }


def _source_material_contract(intake: dict[str, Any], repository_root: Path,
                              workflow: Any) -> dict[str, int]:
    """Pass original material to the Engine without editing or summarising it.

    Current Global Collector records carry RSS/Atom feed summaries. The
    contract also recognises a future typed full-article hand-off, but accepts
    one only after that exact source policy explicitly changes its
    fullArticleTemporaryProcessing permission to 'allowed'. No article-page
    fetching is enabled by this adapter itself.
    """
    context = workflow.RepositoryPolicies(repository_root)
    counts = {"feedSummary": 0, "fullArticle": 0}
    records = intake.get("editorialInputs", [])
    for record in records:
        if not isinstance(record, dict):
            raise NewsroomPipelineError("Checker released a malformed editorial input.")
        policy_ref = record.get("sourcePolicyRef")
        policy = context.policies.get(policy_ref)
        if not policy:
            raise NewsroomPipelineError("An editorial input references an unregistered source policy.")
        text_policy = policy.get("text", {})
        source_permissions = text_policy.get("sourceMaterialPermissions", {})
        material = record.get("sourceMaterial")

        if isinstance(material, dict):
            kind = material.get("type")
            material_text = material.get("text")
            if not isinstance(material_text, str) or not material_text.strip():
                raise NewsroomPipelineError("A typed source-material hand-off has no original text.")
            if kind == "full-article":
                if source_permissions.get("fullArticleTemporaryProcessing") != "allowed":
                    raise NewsroomPipelineError(
                        "Full-article text was held: this source policy has not explicitly allowed temporary full-article processing."
                    )
                # The current final-review adapter still asserts that no full
                # article body was read. Keep this route closed until that
                # provenance/privacy contract is upgraded together with the
                # bounded article-fetch stage. Permission alone is not enough.
                raise NewsroomPipelineError(
                    "Full-article text is not yet enabled end to end; the source permission is necessary but the Engine/Checker privacy contract must also be upgraded."
                )
            elif kind == "feed-summary":
                if source_permissions.get("feedSummaryTemporaryProcessing") != "allowed":
                    raise NewsroomPipelineError(
                        "Feed summary was held: this source policy has not explicitly allowed temporary feed-summary processing."
                    )
                counts["feedSummary"] += 1
            else:
                raise NewsroomPipelineError("Source-material type must be feed-summary or full-article.")
        else:
            material_text = record.get("summary")
            if not isinstance(material_text, str) or not material_text.strip():
                raise NewsroomPipelineError("Checker released an editorial input without source material.")
            if source_permissions.get("feedSummaryTemporaryProcessing") != "allowed":
                raise NewsroomPipelineError(
                    "The source policy does not permit temporary processing of this feed summary."
                )
            material = {
                "type": "feed-summary",
                "text": material_text,
                "sha256": hashlib.sha256(material_text.encode("utf-8")).hexdigest(),
            }
            record["sourceMaterial"] = material
            counts["feedSummary"] += 1

        # Compatibility alias for the current Editor adapter. This is an exact
        # pass-through of original source material, not an upstream summary.
        # The Universal Editorial Engine remains the sole editorial writer.
        record["summary"] = material_text
        record["sourceMaterialType"] = material.get("type")
        record["sourceMaterialSha256"] = hashlib.sha256(
            material_text.encode("utf-8")
        ).hexdigest()
    return counts


def run(view_id: str, repository_root: str | Path = ".") -> dict[str, Any]:
    if view_id not in ALLOWED_VIEWS:
        raise NewsroomPipelineError("Only Nature or Alien World may run as a single-View Newsroom job.")
    root = Path(repository_root).resolve()
    modules = _load_modules(root)

    # The Manager creates exactly one immutable View job. It does not write a
    # story database and does not dispatch a second collection schedule.
    _registry, _profiles, _assignments, _scheduler, dispatcher, _audit = modules["manager"].build_manager()
    job = dispatcher.create_job(view_id, trigger="scheduled")
    job_payload = job.to_dict()
    if job_payload.get("viewId") != view_id:
        raise NewsroomPipelineError("Manager job escaped the requested View boundary.")

    batch = modules["collector"].GlobalCollector(root).collect(job_payload)
    if batch.get("status") not in {"succeeded", "partial"}:
        raise NewsroomPipelineError("Global Collector did not complete any registered source feed.")

    intake = modules["checker"].review_collection_batch(
        batch, repository_root=root, retained_records=[]
    )
    if intake.get("viewId") != view_id or intake.get("phase") != "collection-intake":
        raise NewsroomPipelineError("Global Checker intake returned an invalid View or phase.")

    # Image Engine's image-only route remains separate. It never creates text
    # eligibility or sends an image-only record to the Editorial Engine.
    image_result: dict[str, Any] | None = None
    if intake.get("imageEngineInputs"):
        try:
            image_result = modules["image"].process_checker_intake(
                intake, repository_root=root
            )
        except Exception as exc:
            # An image-only branch failure must not rewrite or block otherwise
            # GREEN-eligible editorial text. No image is attached on failure.
            image_result = {
                "phase": "image-branch-held",
                "viewId": view_id,
                "errorType": type(exc).__name__,
                "message": str(exc)[:400],
            }

    if not intake.get("editorialInputs"):
        raise NewsroomPipelineError(
            "No source item passed Global Checker editorial intake. No Newsroom database write was attempted."
        )

    source_material_counts = _source_material_contract(
        intake, root, modules["checker"]
    )
    package = modules["editorial"].produce_editorial_package(
        intake, repository_root=root
    )
    if package.get("viewId") != view_id or package.get("phase") != "editorial-production":
        raise NewsroomPipelineError("Universal Editorial Engine returned an invalid package.")
    if not package.get("stories"):
        reasons = [item.get("reason", "held") for item in package.get("held", [])[:8]]
        raise NewsroomPipelineError(
            "Universal Editorial Engine produced no stories. " + "; ".join(str(x) for x in reasons)
        )

    reviewed = modules["final_review"].review_editorial_package(
        package, intake, repository_root=root, retained_records=[]
    )
    if reviewed.get("viewId") != view_id or reviewed.get("phase") != "final-editorial-review":
        raise NewsroomPipelineError("Global Checker final review returned an invalid View or phase.")
    if not reviewed.get("approvedStories"):
        reasons = [item.get("reasons", []) for item in reviewed.get("held", [])[:8]]
        raise NewsroomPipelineError(
            "Global Checker final review approved no stories. " + json.dumps(reasons, ensure_ascii=False)[:1200]
        )

    write_result = modules["writer"].write_approved_stories(
        reviewed, repository_root=root
    )
    if write_result.get("viewId") != view_id or write_result.get("phase") != "database-write-complete":
        raise NewsroomPipelineError("Newsroom Database Writer did not complete the requested View write.")

    return {
        "schemaVersion": 1,
        "pipeline": PIPELINE_NAME,
        "pipelineVersion": PIPELINE_VERSION,
        "phase": "newsroom-write-complete",
        "viewId": view_id,
        "jobId": job_payload.get("jobId"),
        "sourceCollection": batch.get("statistics", {}),
        "checkerIntake": intake.get("statistics", {}),
        "sourceMaterial": source_material_counts,
        "editorialEngine": package.get("statistics", {}),
        "finalChecker": reviewed.get("statistics", {}),
        "imageBranch": image_result.get("phase") if image_result else "not-needed",
        "databaseWriter": write_result.get("statistics", {}),
        "privacy": {
            "rawSourceTextPersisted": False,
            "evidenceExcerptsPersisted": False,
            "rawHtmlPersisted": False,
            "sharedStoryDatabaseOpened": False,
            "otherViewDatabaseOpened": False,
            "viewDatabasesMixed": False,
            "feedOrPublisherOutputWritten": False,
            "publisherOutputWritten": False,
        },
        "nextSystem": "Matching View Publisher",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--view", required=True, choices=sorted(ALLOWED_VIEWS))
    parser.add_argument("--repository-root", default=".")
    args = parser.parse_args(argv)
    try:
        result = run(args.view, args.repository_root)
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        json.dump({
            "pipeline": PIPELINE_NAME,
            "pipelineVersion": PIPELINE_VERSION,
            "phase": "newsroom-pipeline-blocked",
            "viewId": args.view,
            "databaseWriteAttempted": False,
            "publisherOutputWritten": False,
            "rawSourceTextPersisted": False,
            "errorType": type(exc).__name__,
            "message": str(exc)[:1200],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

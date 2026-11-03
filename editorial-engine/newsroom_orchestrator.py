#!/usr/bin/env python3
"""Run the v2 LIVE // EARTH Newsroom path for one View.

The existing View Collector must be run first by its scheduled workflow. This
orchestrator then runs the Manager, transient Global Collector, Global Checker,
Image Engine, Checker image review, Editorial Engine, post-Editorial Checker,
and the matching View-owned Newsroom Database Writer. Public feed publication
is deliberately left to the corresponding View Publisher wrapper.

All hand-offs remain in memory. The script never writes temporary source,
Checker, Editorial, or verification JSON files to disk.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

PIPELINE_NAME = "LIVE // EARTH Global Newsroom Orchestrator"
PIPELINE_VERSION = "2.0.0"
ALLOWED_VIEWS = {"nature", "alien-world"}


class NewsroomOrchestratorError(RuntimeError):
    """A Newsroom stage failed or violated its registered hand-off contract."""


def _prepare_import_paths(root: Path) -> None:
    required = (
        root,
        root / "global-checker",
        root / "image-engine",
        root / "editorial-engine",
        root / "newsroom-database-writer",
    )
    for directory in required:
        if not directory.is_dir():
            raise NewsroomOrchestratorError(
                f"Required Newsroom component directory is missing: {directory.name}"
            )
    # Insert from lowest to highest precedence so each registered package is
    # importable without changing any repository files or installing packages.
    for directory in required:
        value = str(directory)
        if value in sys.path:
            sys.path.remove(value)
        sys.path.insert(0, value)


def _load_components() -> dict[str, Any]:
    try:
        from global_collection_manager.manager import build_manager
        from global_collector.collector import GlobalCollector
        from universal_checker import UniversalGlobalChecker
        from image_engine_handoff import (
            build_image_engine_intake,
            review_image_engine_handoff,
        )
        from image_engine_newsroom import process_checker_intake
        from universal_editorial_engine_newsroom import produce_editorial_package
        from post_editorial_verification import review_editorial_package
        from newsroom_database_writer import write_verified_editorial_stories
    except Exception as exc:
        raise NewsroomOrchestratorError(
            "A required v2 Newsroom component could not be imported: "
            f"{type(exc).__name__}: {exc}"
        ) from exc
    return {
        "build_manager": build_manager,
        "GlobalCollector": GlobalCollector,
        "UniversalGlobalChecker": UniversalGlobalChecker,
        "build_image_engine_intake": build_image_engine_intake,
        "process_checker_intake": process_checker_intake,
        "review_image_engine_handoff": review_image_engine_handoff,
        "produce_editorial_package": produce_editorial_package,
        "review_editorial_package": review_editorial_package,
        "write_verified_editorial_stories": write_verified_editorial_stories,
    }


def _result(
    *,
    view_id: str,
    phase: str,
    job_id: str | None = None,
    collection: dict[str, Any] | None = None,
    initial_checker: dict[str, Any] | None = None,
    image_handoff: dict[str, Any] | None = None,
    editorial: dict[str, Any] | None = None,
    verification: dict[str, Any] | None = None,
    writer: dict[str, Any] | None = None,
    no_op_reason: str | None = None,
) -> dict[str, Any]:
    """Return operational counts only; never expose transient story content."""
    return {
        "schemaVersion": 1,
        "pipeline": PIPELINE_NAME,
        "pipelineVersion": PIPELINE_VERSION,
        "phase": phase,
        "viewId": view_id,
        "jobId": job_id,
        "noOpReason": no_op_reason,
        "collection": (collection or {}).get("statistics", {}),
        "initialChecker": (initial_checker or {}).get("statistics", {}),
        "imageReview": (image_handoff or {}).get("statistics", {}),
        "editorial": (editorial or {}).get("statistics", {}),
        "postEditorialChecker": (verification or {}).get("statistics", {}),
        "databaseWriter": (writer or {}).get("statistics", {}),
        "privacyAndOwnership": {
            "sourceMaterialHandedOffInMemory": True,
            "transientHandOffFilesWritten": False,
            "rawSourceTextPersisted": False,
            "evidenceExcerptsPersisted": False,
            "rawHtmlPersisted": False,
            "collectorStoriesTableModified": False,
            "otherViewDatabaseOpened": False,
            "viewDatabasesMixed": False,
            "publicAssetsWrittenByOrchestrator": False,
            "feedOrPdfWrittenByOrchestrator": False,
            "publicationPerformedByOrchestrator": False,
        },
        "nextSystem": "Matching View Newsroom Publisher",
    }


def run(view_id: str, repository_root: str | Path = ".") -> dict[str, Any]:
    """Run the complete v2 Newsroom pipeline for exactly one registered View."""
    if view_id not in ALLOWED_VIEWS:
        raise NewsroomOrchestratorError(
            "Only the registered Nature or Alien World View may run as a single-View job."
        )
    root = Path(repository_root).resolve()
    _prepare_import_paths(root)
    modules = _load_components()

    # Use the active repository profiles/registries and keep Manager audit
    # state inside the repository's existing local runtime area.
    manager_parts = modules["build_manager"](
        config_dir=root / "global_collection_manager" / "config",
        state_dir=root / ".manager-state",
    )
    if not isinstance(manager_parts, tuple) or len(manager_parts) != 6:
        raise NewsroomOrchestratorError("Global Collection Manager returned an unexpected component set.")
    dispatcher = manager_parts[4]
    job = dispatcher.create_job(view_id, trigger="scheduled")
    if not hasattr(job, "to_dict"):
        raise NewsroomOrchestratorError("Manager did not return its registered immutable job envelope.")
    job_payload = job.to_dict()
    if not isinstance(job_payload, dict) or job_payload.get("viewId") != view_id:
        raise NewsroomOrchestratorError("Manager job does not match the requested View.")

    # The View-specific Collector has already run in the workflow and owns the
    # existing SQLite database. Global Collector is a transient, shared intake.
    collection = modules["GlobalCollector"](root).collect(job_payload)
    if not isinstance(collection, dict) or collection.get("job") != job_payload:
        raise NewsroomOrchestratorError("Global Collector returned a malformed or mismatched Manager job.")
    if collection.get("status") not in {"succeeded", "partial"}:
        raise NewsroomOrchestratorError("Global Collector failed; the Newsroom pipeline is stopped.")
    records = collection.get("records")
    if not isinstance(records, list):
        raise NewsroomOrchestratorError("Global Collector did not return a records array.")

    initial_checker = modules["UniversalGlobalChecker"]().check_batch(collection)
    if not isinstance(initial_checker, dict):
        raise NewsroomOrchestratorError("Global Checker returned an invalid initial review.")
    if (
        initial_checker.get("checkerMode") != "universal-view-independent"
        or initial_checker.get("checkerVersion") != "2.0.0"
        or initial_checker.get("viewId") != view_id
        or initial_checker.get("jobId") != job_payload.get("jobId")
    ):
        raise NewsroomOrchestratorError("Initial Global Checker identity or View/job contract failed.")

    # Image Engine receives only the Checker-issued image-intake object. Its
    # return is re-evaluated by Checker; the Image Engine never approves media.
    image_intake = modules["build_image_engine_intake"](
        collection, initial_checker, repository_root=root
    )
    image_result = modules["process_checker_intake"](
        image_intake, repository_root=root
    )
    checker_handoff = modules["review_image_engine_handoff"](
        collection, initial_checker, image_result
    )
    if not isinstance(checker_handoff, dict):
        raise NewsroomOrchestratorError("Checker did not return the completed image-review hand-off.")
    if (
        checker_handoff.get("phase") != "checker-image-review-complete"
        or checker_handoff.get("viewId") != view_id
        or checker_handoff.get("jobId") != job_payload.get("jobId")
    ):
        raise NewsroomOrchestratorError("Completed Checker image-review hand-off failed its View/job contract.")

    eligible_ids = checker_handoff.get("editorialEligiblePostIds")
    if not isinstance(eligible_ids, list):
        raise NewsroomOrchestratorError("Checker did not return editorialEligiblePostIds as an array.")
    if not eligible_ids:
        return _result(
            view_id=view_id,
            phase="newsroom-no-approved-stories",
            job_id=str(job_payload.get("jobId")),
            collection=collection,
            initial_checker=initial_checker,
            image_handoff=checker_handoff,
            no_op_reason="Global Checker released no text-and-image eligible posts; no database write was attempted.",
        )

    editorial_package = modules["produce_editorial_package"](
        checker_handoff, repository_root=root
    )
    if (
        not isinstance(editorial_package, dict)
        or editorial_package.get("phase") != "editorial-production"
        or editorial_package.get("viewId") != view_id
        or editorial_package.get("jobId") != job_payload.get("jobId")
    ):
        raise NewsroomOrchestratorError("Universal Editorial Engine returned an invalid or mismatched package.")

    verification = modules["review_editorial_package"](
        checker_handoff, editorial_package, repository_root=root
    )
    if (
        not isinstance(verification, dict)
        or verification.get("checker") != "LIVE // EARTH Global Content Rights & Provenance Checker"
        or verification.get("verificationGate") != "LIVE // EARTH Global Checker Post-Editorial Verification"
        or verification.get("viewId") != view_id
        or verification.get("jobId") != job_payload.get("jobId")
        or verification.get("reportVisibility") != "INTERNAL_ONLY_NOT_FOR_PUBLICATION"
    ):
        raise NewsroomOrchestratorError("Post-Editorial Checker returned an invalid verification report.")

    verdict = verification.get("verdict")
    release = verification.get("releaseForPublisher") is True
    approved_ids = verification.get("approvedStoryIds")
    global_reasons = verification.get("globalReasons")
    if global_reasons:
        raise NewsroomOrchestratorError(
            "Post-Editorial Checker raised a global contract hold; publication is blocked: "
            + "; ".join(str(reason) for reason in global_reasons[:4])
        )
    if verdict == "HOLD" and not release:
        # A content-level all-held outcome is a safe no-op. The workflow may
        # still republish existing previously-approved rows in the rolling feed.
        return _result(
            view_id=view_id,
            phase="newsroom-all-stories-held",
            job_id=str(job_payload.get("jobId")),
            collection=collection,
            initial_checker=initial_checker,
            image_handoff=checker_handoff,
            editorial=editorial_package,
            verification=verification,
            no_op_reason="Post-Editorial Checker released no stories; no database write was attempted.",
        )
    if verdict not in {"PASS", "PARTIAL"} or not release:
        raise NewsroomOrchestratorError("Post-Editorial Checker did not release the package for publication.")
    if not isinstance(approved_ids, list) or not approved_ids:
        raise NewsroomOrchestratorError("Post-Editorial Checker release has no approvedStoryIds.")

    # Give Writer the exact untouched original Checker hand-off, exact Editor
    # package, and exact Checker verification report. The Writer independently
    # verifies their hashes, identities, lineage, individual PASS decisions,
    # and the selected View's pre-existing database before writing.
    write_result = modules["write_verified_editorial_stories"](
        checker_handoff,
        editorial_package,
        verification,
        repository_root=root,
    )
    if (
        not isinstance(write_result, dict)
        or write_result.get("phase") != "database-write-complete"
        or write_result.get("viewId") != view_id
    ):
        raise NewsroomOrchestratorError("Newsroom Database Writer did not complete the matching View write.")

    return _result(
        view_id=view_id,
        phase="newsroom-database-write-complete",
        job_id=str(job_payload.get("jobId")),
        collection=collection,
        initial_checker=initial_checker,
        image_handoff=checker_handoff,
        editorial=editorial_package,
        verification=verification,
        writer=write_result,
    )


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
        json.dump(
            {
                "pipeline": PIPELINE_NAME,
                "pipelineVersion": PIPELINE_VERSION,
                "phase": "newsroom-orchestration-blocked",
                "viewId": args.view,
                "databaseWriteAttempted": False,
                "publicationPerformed": False,
                "errorType": type(exc).__name__,
                "message": str(exc)[:900],
            },
            sys.stderr,
            ensure_ascii=False,
            indent=2,
        )
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

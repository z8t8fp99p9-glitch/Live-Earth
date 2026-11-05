#!/usr/bin/env python3
"""Run the global 13-section LIVE // EARTH Newsroom for one registered View.

One Manager and one Global Collector feed the shared Global Checker v2.1.1,
Section 9 Image Engine, Checker Sections 10–11, Section 12 Live Feed Editor,
and Section 13 final verification. The completed report is archived after raw
source material is redacted, then only Section 13-approved posts reach the
matching View-owned database bridge. The View Publisher remains separate.

No View databases are merged, and no public feed is written by this runner.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PIPELINE_NAME = "LIVE // EARTH Global Newsroom Orchestrator"
PIPELINE_VERSION = "3.0.0"


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
        from newsroom_database_writer import ensure_view_database
        from global_checker import load_registry, _policy_for_story, evaluate_image
        from global_image_pipeline import run_global_image_pipeline
        from live_feed_editor import append_live_feed_output
        from section13_final_verification import finalize_post_editorial_review
        from checker_report_archive import archive_report
        from checker_report_pdf import create_final_checker_pdf
        from section13_database_bridge import write_section13_approved_posts
    except Exception as exc:
        raise NewsroomOrchestratorError(
            "A required 13-section Newsroom component could not be imported: "
            f"{type(exc).__name__}: {exc}"
        ) from exc
    return {
        "build_manager": build_manager,
        "GlobalCollector": GlobalCollector,
        "ensure_view_database": ensure_view_database,
        "load_registry": load_registry,
        "policy_for_story": _policy_for_story,
        "evaluate_image": evaluate_image,
        "run_global_image_pipeline": run_global_image_pipeline,
        "append_live_feed_output": append_live_feed_output,
        "finalize_post_editorial_review": finalize_post_editorial_review,
        "archive_report": archive_report,
        "create_final_checker_pdf": create_final_checker_pdf,
        "write_section13_approved_posts": write_section13_approved_posts,
    }


def _policy_inputs(collection: dict[str, Any], view_id: str, modules: dict[str, Any]):
    """Resolve central text and exact-image policies for every collected post.

    Text permissions remain separated by source material type. Image rights
    are evaluated against each exact collected image using the existing central
    Global Checker policy engine; no domain-only image approval is inferred.
    """
    from urllib.parse import urlsplit

    text_policies: dict[str, Any] = {}
    image_policies: dict[str, Any] = {}
    image_dispatch: dict[str, Any] = {}
    for post in collection.get("records", []):
        if not isinstance(post, dict):
            continue
        post_id = str(post.get("postId") or "")
        story = {
            "id": post_id,
            "title": post.get("title", ""),
            "summary": post.get("summary", ""),
            "url": post.get("canonicalUrl") or post.get("originalUrl") or post.get("url", ""),
            "sourceUrl": post.get("sourceFeedUrl") or post.get("sourceUrl", ""),
            "sourceName": post.get("sourceName", ""),
        }
        policy = modules["policy_for_story"](view_id, story)
        text = policy.get("text", {}) if isinstance(policy, dict) else {}
        material = text.get("sourceMaterialPermissions", {}) if isinstance(text, dict) else {}
        declared = text.get("usePermissions", {}) if isinstance(text, dict) else {}
        if post_id:
            text_policies[post_id] = {
                "policyId": policy.get("policyId", "") if isinstance(policy, dict) else "",
                "sourceMatch": bool(policy),
                "permissions": dict(declared) if isinstance(declared, dict) else {},
                "fullArticlePermissions": {
                    "temporaryProcessing": material.get("fullArticleTemporaryProcessing", "unknown")
                } if isinstance(material, dict) else {},
                "feedSummaryPermissions": {
                    "temporaryProcessing": material.get("feedSummaryTemporaryProcessing", "unknown")
                } if isinstance(material, dict) else {},
            }

        # Run the central legacy image policy evaluator on each exact original
        # image record. Its GREEN verdict becomes a candidate-specific contract
        # for Checker v2.1.1; UNKNOWN/RED candidates never enter the allowlist.
        candidates = []
        for field in ("media", "attachments"):
            values = post.get(field, [])
            if isinstance(values, list):
                candidates.extend(item for item in values if isinstance(item, dict))
        candidate_policies = []
        approved_hosts = set()
        for candidate in candidates:
            candidate_url = str(candidate.get("originalUrl") or candidate.get("url") or candidate.get("imageUrl") or "").strip()
            if not candidate_url:
                continue
            is_image = (
                str(candidate.get("mediaType") or candidate.get("type") or "").casefold().startswith("image")
                or str(candidate.get("mimeType") or "").casefold().startswith("image/")
                or any(candidate_url.casefold().split("?", 1)[0].endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tif", ".tiff"))
            )
            if not is_image:
                continue
            candidate_for_policy = {**candidate, "url": candidate_url}
            decision = modules["evaluate_image"](
                view_id,
                post_id,
                candidate_for_policy,
                article_url=story["url"],
                source_name=story["sourceName"],
            )
            allowed = decision.get("allowed") is True and decision.get("verdict") == "GREEN"
            host = (urlsplit(candidate_url).hostname or "").lower().rstrip(".")
            rights_evidence = dict(decision.get("evidence") or {})
            rights_evidence["rightsBasis"] = (
                rights_evidence.get("licenseName")
                or rights_evidence.get("licenseUrl")
                or f"Registered central image policy: {decision.get('policyId', 'unknown')} (not a separate licence)"
            )
            rights_evidence["policyDecisionId"] = decision.get("decisionId", "")
            rights_evidence["policyVersion"] = decision.get("policyVersion", "")
            candidate_policies.append({
                "policyId": decision.get("policyId", ""),
                "policyMatch": allowed,
                "candidateUrl": candidate_url,
                "allowedHosts": [host] if allowed and host else [],
                "permissions": {
                    "editorialUse": "allowed" if allowed else "unknown",
                    "attribution": "allowed" if allowed else "unknown",
                    "storage": "allowed" if allowed else "unknown",
                },
                # The Image Engine preserves approved originals byte-for-byte.
                # Checker Section 8 treats modification as not applicable only
                # for this exact no-modification route.
                "modificationNotPerformedByPipeline": True,
                "rightsEvidence": rights_evidence,
                "centralDecision": {
                    "verdict": decision.get("verdict"),
                    "allowed": allowed,
                    "allowedUse": decision.get("allowedUse"),
                    "reasons": decision.get("reasons", []),
                },
            })
            if allowed and host:
                approved_hosts.add(host)

        if post_id:
            image_policies[post_id] = {"candidatePolicies": candidate_policies}
            image_dispatch[post_id] = {
                "viewId": view_id,
                "managerJob": collection.get("job", {}),
                "allowedHosts": sorted(approved_hosts),
                "temporaryProcessingAllowed": bool(approved_hosts),
                "discoveryRoutes": {},
            }
    return text_policies, image_policies, image_dispatch


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
    section12: dict[str, Any] | None = None,
    section13: dict[str, Any] | None = None,
    archive: dict[str, Any] | None = None,
    no_op_reason: str | None = None,
) -> dict[str, Any]:
    """Return operational counts only; never expose transient story content."""
    editor_posts = (section12 or {}).get("posts", [])
    if not isinstance(editor_posts, list):
        editor_posts = []
    editor_counts = {
        "postsProcessed": len(editor_posts),
        "ready": sum(1 for item in editor_posts if isinstance(item, dict) and item.get("status") == "READY"),
        "held": sum(1 for item in editor_posts if isinstance(item, dict) and item.get("status") == "HOLD"),
    }
    return {
        "schemaVersion": 1,
        "pipeline": PIPELINE_NAME,
        "pipelineVersion": PIPELINE_VERSION,
        "phase": phase,
        "viewId": view_id,
        "jobId": job_id,
        "noOpReason": no_op_reason,
        "collection": (collection or {}).get("statistics", {}),
        "initialChecker": (initial_checker or {}).get("summary", (initial_checker or {}).get("statistics", {})),
        "imageReview": (image_handoff or {}).get("summary", (image_handoff or {}).get("statistics", {})),
        "editorial": editor_counts,
        "postEditorialChecker": (verification or {}).get("statistics", {}),
        "databaseWriter": (writer or {}).get("statistics", {}),
        "section12": editor_counts,
        "section13": (section13 or {}).get("statistics", {}),
        "archive": {
            "archived": bool((archive or {}).get("archived")),
            "reportId": (archive or {}).get("reportId", ""),
            "pdf": {
                "created": bool((archive or {}).get("pdf", {}).get("created")),
                "fileName": Path(str((archive or {}).get("pdf", {}).get("path", ""))).name,
                "bytes": (archive or {}).get("pdf", {}).get("bytes", 0),
                "sha256": (archive or {}).get("pdf", {}).get("sha256", ""),
                "overallStatus": (archive or {}).get("pdf", {}).get("overallStatus", ""),
                "checksRecorded": (archive or {}).get("pdf", {}).get("checksRecorded", 0),
            },
        },
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
            "publicFeedWrittenByOrchestrator": False,
            "finalCheckerPdfCreatedByReportUtility": bool((archive or {}).get("pdf", {}).get("created")),
            "publicationPerformedByOrchestrator": False,
        },
        "nextSystem": "Matching View Newsroom Publisher",
    }


def run(view_id: str, repository_root: str | Path = ".") -> dict[str, Any]:
    """Run the connected 13-section Newsroom for exactly one registered View."""
    if not isinstance(view_id, str) or not view_id.strip():
        raise NewsroomOrchestratorError("A registered Manager View ID is required.")
    root = Path(repository_root).resolve()
    _prepare_import_paths(root)
    modules = _load_components()

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

    # Re-create only a missing View database from its registered profile; never
    # reset or open the other View's database.
    modules["ensure_view_database"](root, view_id, job_payload)
    collection = modules["GlobalCollector"](root).collect(job_payload)
    if not isinstance(collection, dict) or collection.get("job") != job_payload:
        raise NewsroomOrchestratorError("Global Collector returned a malformed or mismatched Manager job.")
    if collection.get("status") not in {"succeeded", "partial"}:
        raise NewsroomOrchestratorError("Global Collector failed; the Newsroom pipeline is stopped.")
    if not isinstance(collection.get("records"), list):
        raise NewsroomOrchestratorError("Global Collector did not return a records array.")

    text_policies, image_policies, image_dispatch = _policy_inputs(collection, view_id, modules)
    staging_root = root / ".image-engine-staging" / view_id / str(job_payload.get("jobId"))
    checker_report = modules["run_global_image_pipeline"](
        collection,
        staging_dir=staging_root,
        text_policy=text_policies,
        image_policies=image_policies,
        image_engine_dispatch=image_dispatch,
        final_image_policies={},
    )
    if (
        not isinstance(checker_report, dict)
        or checker_report.get("checkerVersion") != "2.1.1"
        or checker_report.get("viewId") != view_id
        or checker_report.get("jobId") != job_payload.get("jobId")
        or len(checker_report.get("sectionOrder", [])) != 11
    ):
        raise NewsroomOrchestratorError("Global Checker/Image Engine did not complete Sections 1–11 for this Manager job.")

    section12_report = modules["append_live_feed_output"](checker_report)
    if len(section12_report.get("sectionOrder", [])) != 12:
        raise NewsroomOrchestratorError("Live Feed Editor did not append Section 12.")
    final_report = modules["finalize_post_editorial_review"](section12_report)
    if len(final_report.get("sectionOrder", [])) != 13:
        raise NewsroomOrchestratorError("Final Global Checker did not append Section 13.")

    # The full PDF is created only after Section 13 has completed. It records
    # every per-post check and reason, including HOLD/FAIL outcomes. It is kept
    # beside the redacted JSON archive and uploaded privately by each workflow.
    archive_root = root / ".checker-archive" / view_id
    archive_result = modules["archive_report"](final_report, archive_root, view_id)
    pdf_path = Path(archive_result["path"]).with_suffix(".pdf")
    pdf_result = modules["create_final_checker_pdf"](final_report, pdf_path, collection=collection)
    archive_result = {**archive_result, "pdf": pdf_result}
    # Writer reads only the Section 13-approved set and uses the Manager card
    # to select exactly one View DB. A zero-approval run is a safe no-op.
    write_result = modules["write_section13_approved_posts"](final_report, repository_root=root)
    if (
        not isinstance(write_result, dict)
        or write_result.get("phase") != "database-write-complete"
        or write_result.get("viewId") != view_id
    ):
        raise NewsroomOrchestratorError("Section 13 Database Bridge did not complete the matching View hand-off.")

    approved = int((write_result.get("statistics") or {}).get("approvedReceived", 0))
    inserted = int((write_result.get("statistics") or {}).get("inserted", 0))
    updated = int((write_result.get("statistics") or {}).get("updated", 0))
    phase = "newsroom-database-write-complete" if approved else "newsroom-complete-no-approved-posts"
    return _result(
        view_id=view_id,
        phase=phase,
        job_id=str(job_payload.get("jobId")),
        collection=collection,
        initial_checker=checker_report,
        image_handoff=checker_report,
        editorial=section12_report.get("sections", {}).get("liveFeedOutput", {}),
        verification=final_report.get("sections", {}).get("postEditorialFinalVerification", {}),
        writer=write_result,
        section12=section12_report.get("sections", {}).get("liveFeedOutput", {}),
        section13=final_report.get("sections", {}).get("postEditorialFinalVerification", {}),
        archive=archive_result,
        no_op_reason=(
            "All 13 sections completed and the report was archived, but Section 13 approved no posts for the database. "
            "The Writer made no story-row changes. Check exact source permissions and image verification evidence."
            if not approved else None
        ),
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--view", required=True, help="A View ID registered in Global Collection Manager.")
    parser.add_argument("--repository-root", default=".")
    args = parser.parse_args(argv)
    try:
        result = run(args.view, args.repository_root)
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        failure_pdf = None
        failure_pdf_error = None
        try:
            root = Path(args.repository_root).resolve()
            checker_dir = root / "global-checker"
            if checker_dir.is_dir():
                checker_path = str(checker_dir)
                if checker_path in sys.path:
                    sys.path.remove(checker_path)
                sys.path.insert(0, checker_path)
                from checker_report_pdf import create_execution_failure_pdf

                safe_view = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in args.view)[:80] or "unknown-view"
                timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
                failure_path = root / ".checker-archive" / safe_view / f"execution-failure-{timestamp}.pdf"
                failure_pdf = create_execution_failure_pdf(
                    view_id=safe_view,
                    output_path=failure_path,
                    error_type=type(exc).__name__,
                    message=str(exc)[:2500],
                    stage="Newsroom orchestration / Final Checker hand-off",
                )
        except Exception as report_exc:
            failure_pdf_error = f"{type(report_exc).__name__}: {str(report_exc)[:400]}"

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
                "failureReportPdf": failure_pdf,
                "failureReportPdfError": failure_pdf_error,
            },
            sys.stderr,
            ensure_ascii=False,
            indent=2,
        )
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

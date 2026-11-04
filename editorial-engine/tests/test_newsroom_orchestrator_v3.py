from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "editorial-engine") not in sys.path:
    sys.path.insert(0, str(ROOT / "editorial-engine"))

import newsroom_orchestrator as orchestrator


def test_loader_imports_the_shared_13_section_components():
    orchestrator._prepare_import_paths(ROOT)
    components = orchestrator._load_components()
    assert {
        "build_manager",
        "GlobalCollector",
        "run_global_image_pipeline",
        "append_live_feed_output",
        "finalize_post_editorial_review",
        "archive_report",
        "create_final_checker_pdf",
        "write_section13_approved_posts",
    }.issubset(components)


def test_policy_inputs_keeps_feed_summary_and_full_article_permissions_separate():
    def resolver(view_id, story):
        assert view_id == "nature"
        assert story["url"] == "https://science.nasa.gov/news/example/"
        return {
            "policyId": "nasa-test-policy",
            "text": {
                "usePermissions": {
                    "temporaryProcessing": "allowed",
                    "transformation": "allowed",
                    "derivedOutputStorage": "allowed",
                    "derivedOutputDisplay": "allowed",
                },
                "sourceMaterialPermissions": {
                    "feedSummaryTemporaryProcessing": "allowed",
                    "fullArticleTemporaryProcessing": "unknown",
                    "fullArticleRetrieval": "disabled-until-item-and-policy-review",
                },
            },
        }

    collection = {
        "job": {"jobId": "job-nature", "viewId": "nature"},
        "records": [{
            "postId": "post-1",
            "sourceName": "NASA",
            "sourceFeedUrl": "https://science.nasa.gov/feed/",
            "canonicalUrl": "https://science.nasa.gov/news/example/",
            "summary": "A feed summary.",
        }],
    }
    text, image, dispatch = orchestrator._policy_inputs(
        collection, "nature", {"policy_for_story": resolver}
    )
    assert text["post-1"]["sourceMatch"] is True
    assert text["post-1"]["feedSummaryPermissions"]["temporaryProcessing"] == "allowed"
    assert text["post-1"]["fullArticlePermissions"]["temporaryProcessing"] == "unknown"
    assert image["post-1"]["candidatePolicies"] == []
    assert dispatch["post-1"]["temporaryProcessingAllowed"] is False
    assert dispatch["post-1"]["allowedHosts"] == []


def test_operational_result_reports_checker_summary_counts():
    result = orchestrator._result(
        view_id="nature",
        phase="newsroom-complete-no-approved-posts",
        initial_checker={"summary": {"postsReceived": 4, "textApproved": 3}},
        image_handoff={"summary": {"imagesSelected": 2, "imagesApproved": 0}},
    )
    assert result["initialChecker"] == {"postsReceived": 4, "textApproved": 3}
    assert result["imageReview"] == {"imagesSelected": 2, "imagesApproved": 0}
    assert result["privacyAndOwnership"]["viewDatabasesMixed"] is False


def test_policy_inputs_uses_central_evaluator_for_exact_original_images():
    seen = []

    def resolver(view_id, story):
        return {
            "policyId": "nasa-text",
            "text": {
                "usePermissions": {"temporaryProcessing": "allowed"},
                "sourceMaterialPermissions": {
                    "feedSummaryTemporaryProcessing": "allowed",
                    "fullArticleTemporaryProcessing": "unknown",
                },
            },
        }

    def evaluate_image(view_id, post_id, candidate, *, article_url, source_name):
        seen.append((view_id, post_id, candidate["url"], article_url, source_name))
        return {
            "allowed": True,
            "verdict": "GREEN",
            "policyId": "nasa-media-guidelines-item-screen-v2",
            "policyVersion": "2",
            "decisionId": "decision-123",
            "allowedUse": "factual-context-only",
            "evidence": {
                "imageUrl": candidate["url"],
                "sourcePage": candidate["sourcePage"],
                "creator": candidate["creator"],
                "credit": candidate["credit"],
                "caption": candidate["caption"],
            },
            "reasons": ["exact registered policy passed"],
        }

    collection = {
        "job": {"jobId": "job-alien", "viewId": "alien-world"},
        "records": [{
            "postId": "nasa-post-1",
            "sourceName": "NASA",
            "sourceFeedUrl": "https://science.nasa.gov/feed/",
            "canonicalUrl": "https://science.nasa.gov/news/example/",
            "media": [{
                "mediaType": "image", "mimeType": "image/jpeg",
                "url": "https://images.nasa.gov/original.jpg",
                "originalUrl": "https://images.nasa.gov/original.jpg",
                "sourcePage": "https://science.nasa.gov/news/example/",
                "creator": "NASA", "credit": "NASA/JPL-Caltech",
                "caption": "Mars rover in the landscape",
            }],
        }],
    }
    text, images, dispatch = orchestrator._policy_inputs(
        collection, "alien-world", {
            "policy_for_story": resolver,
            "evaluate_image": evaluate_image,
        }
    )
    assert seen == [(
        "alien-world", "nasa-post-1", "https://images.nasa.gov/original.jpg",
        "https://science.nasa.gov/news/example/", "NASA",
    )]
    policy = images["nasa-post-1"]["candidatePolicies"][0]
    assert policy["policyMatch"] is True
    assert policy["candidateUrl"] == "https://images.nasa.gov/original.jpg"
    assert policy["permissions"]["editorialUse"] == "allowed"
    assert policy["modificationNotPerformedByPipeline"] is True
    assert dispatch["nasa-post-1"]["allowedHosts"] == ["images.nasa.gov"]
    assert dispatch["nasa-post-1"]["temporaryProcessingAllowed"] is True


def test_operational_result_counts_section12_ready_and_held_cards():
    result = orchestrator._result(
        view_id="alien-world",
        phase="newsroom-complete-no-approved-posts",
        section12={"posts": [
            {"postId": "a", "status": "READY"},
            {"postId": "b", "status": "HOLD"},
        ]},
    )
    assert result["section12"] == {"postsProcessed": 2, "ready": 1, "held": 1}


def test_operational_result_exposes_final_checker_pdf_receipt():
    result = orchestrator._result(
        view_id="nature",
        phase="newsroom-complete-no-approved-posts",
        archive={
            "archived": True,
            "reportId": "job-nature-20261105",
            "pdf": {
                "created": True,
                "path": "/workspace/.checker-archive/nature/job-nature.pdf",
                "bytes": 4096,
                "sha256": "a" * 64,
                "overallStatus": "NOT PASSED - NO POSTS APPROVED",
                "checksRecorded": 48,
            },
        },
    )
    assert result["archive"]["pdf"]["created"] is True
    assert result["archive"]["pdf"]["fileName"] == "job-nature.pdf"
    assert result["archive"]["pdf"]["checksRecorded"] == 48
    assert result["privacyAndOwnership"]["finalCheckerPdfCreatedByReportUtility"] is True


def test_pdf_is_built_after_section13_and_before_database_writer(tmp_path):
    for directory in ("global-checker", "image-engine", "editorial-engine", "newsroom-database-writer"):
        (tmp_path / directory).mkdir(parents=True, exist_ok=True)
    events = []
    job_payload = {
        "jobId": "job-pdf-order", "viewId": "nature", "profileId": "nature-profile",
        "assignmentIds": ["assignment-1"], "sourceIds": ["source-1"],
        "feedUrls": ["https://example.org/feed.xml"],
        "destinationDatabaseId": "nature-db",
        "destinationDatabasePath": ".publisher-data/nature/nature.sqlite3",
        "collectorEntrypoint": "global_collector", "collectorWorkflow": ".github/workflows/nature-publisher.yml",
        "scheduledAt": "2026-11-05T00:00:00Z", "requestWindowHours": 768,
        "configVersion": "cfg-1", "trigger": "scheduled", "idempotencyKey": "idem-1",
    }

    class Job:
        def to_dict(self):
            return dict(job_payload)

    dispatcher = type("Dispatcher", (), {"create_job": lambda self, view_id, trigger: Job()})()
    collection = {
        "job": job_payload, "status": "succeeded", "records": [{"postId": "post-1"}],
        "statistics": {"feedsTotal": 1, "postsCollected": 1},
    }
    initial = {"checkerVersion": "2.1.1", "viewId": "nature", "jobId": "job-pdf-order",
               "sectionOrder": [f"s{i}" for i in range(1, 12)], "sections": {}}
    section12 = {**initial, "sectionOrder": [f"s{i}" for i in range(1, 13)],
                 "sections": {"liveFeedOutput": {"posts": []}}}
    final = {**section12, "sectionOrder": [f"s{i}" for i in range(1, 14)],
             "sections": {"postEditorialFinalVerification": {"statistics": {"postsReceived": 0}}}}

    modules = {
        "build_manager": lambda **kwargs: (None, None, None, None, dispatcher, None),
        "GlobalCollector": lambda root: type("Collector", (), {"collect": lambda self, job: collection})(),
        "ensure_view_database": lambda *args: None,
        "policy_for_story": lambda view, story: {"policyId": "test-policy", "text": {"usePermissions": {}, "sourceMaterialPermissions": {}}},
        "evaluate_image": lambda *args, **kwargs: {"allowed": False, "verdict": "UNKNOWN", "evidence": {}},
        "run_global_image_pipeline": lambda *args, **kwargs: (events.append("checker-1-11") or initial),
        "append_live_feed_output": lambda *args: (events.append("editor-12") or section12),
        "finalize_post_editorial_review": lambda *args: (events.append("final-checker-13") or final),
        "archive_report": lambda *args: {"archived": True, "reportId": "report-1", "path": str(tmp_path / "report-1.json")},
        "create_final_checker_pdf": lambda report, path, **kwargs: (
            events.append("pdf") or {"created": True, "path": str(path), "bytes": 1024, "sha256": "a" * 64,
                                    "overallStatus": "COMPLETED - NO POSTS RECEIVED", "checksRecorded": 0}
        ),
        "write_section13_approved_posts": lambda *args, **kwargs: (
            events.append("writer") or {"phase": "database-write-complete", "viewId": "nature", "statistics": {"approvedReceived": 0}}
        ),
    }
    from unittest.mock import patch
    with patch.object(orchestrator, "_load_components", return_value=modules):
        result = orchestrator.run("nature", tmp_path)

    assert events == ["checker-1-11", "editor-12", "final-checker-13", "pdf", "writer"]
    assert result["archive"]["pdf"]["created"] is True
    assert result["archive"]["pdf"]["fileName"] == "report-1.pdf"


def test_orchestration_failure_also_leaves_a_diagnostic_pdf(tmp_path, capsys):
    (tmp_path / "global-checker").mkdir(parents=True)
    checker_path = str(ROOT / "global-checker")
    if checker_path in sys.path:
        sys.path.remove(checker_path)
    sys.path.insert(0, checker_path)

    exit_code = orchestrator.main(["--view", "nature", "--repository-root", str(tmp_path)])
    assert exit_code == 2
    reports = list((tmp_path / ".checker-archive" / "nature").glob("execution-failure-*.pdf"))
    assert len(reports) == 1
    from pypdf import PdfReader
    extracted = "\n".join(page.extract_text() or "" for page in PdfReader(str(reports[0])).pages)
    assert "RUN FAILED" in extracted
    assert "Required Newsroom component directory is missing" in extracted
    assert "No PASS decision is" in extracted

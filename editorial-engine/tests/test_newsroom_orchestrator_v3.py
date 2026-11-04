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

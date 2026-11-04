from __future__ import annotations

import sys
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "global-checker") not in sys.path:
    sys.path.insert(0, str(ROOT / "global-checker"))

from checker_report_pdf import create_final_checker_pdf


def test_pdf_contains_every_check_outcome_and_reason_but_not_raw_article_text(tmp_path):
    order = [f"section-{index}" for index in range(1, 13)] + ["postEditorialFinalVerification"]
    sections = {key: {"section": index, "owner": f"Owner {index}", "statistics": {"posts": 1}}
                for index, key in enumerate(order, 1)}
    sections["fullArticle"] = {
        "section": 2,
        "posts": [{"postId": "post-1", "fullArticle": {
            "title": "Sample story title", "articleUrl": "https://example.org/story"
        }}],
    }
    sections["liveFeedOutput"] = {
        "section": 12,
        "posts": [{"postId": "post-1", "liveFeed": {
            "title": "Sample story title", "sourceUrl": "https://example.org/story"
        }}],
    }
    sections["postEditorialFinalVerification"] = {
        "section": 13,
        "createdAt": "2026-11-05T00:00:00Z",
        "statistics": {"postsReceived": 1, "approvedForDatabase": 0, "held": 1,
                       "reportIntegrityChecks": {"passed": 4, "failed": 0}},
        "posts": [{
            "postId": "post-1", "decision": "HOLD",
            "checks": [{"checkId": "C13-01", "checkName": "Example final check",
                        "result": "HOLD", "mandatory": True,
                        "reason": "The source evidence is incomplete."}],
        }],
        "integrityChecks": [{"checkId": "C13-G01", "checkName": "Sections remain unchanged",
                             "result": "PASS", "reason": "All prior sections match."}],
    }
    report = {
        "schemaVersion": 2, "checker": "LIVE // EARTH Global Checker",
        "checkerVersion": "2.1.1", "viewId": "nature", "jobId": "job-test-123",
        "checkedAt": "2026-11-05T00:00:00Z", "sectionOrder": order,
        "sections": sections,
        "posts": [{"postId": "post-1", "section5": {"checks": [{
            "checkId": "I05-01", "checkName": "Image URL is HTTPS", "result": "PASS",
            "reason": "The original URL uses HTTPS.",
            "evidence": {"url": "https://example.org/image.jpg", "fullArticleText": "DO NOT PRINT THIS RAW ARTICLE BODY"},
        }]}}],
    }
    output = tmp_path / "nature-job-test-final-checker-report.pdf"
    result = create_final_checker_pdf(report, output, collection={
        "statistics": {"feedsTotal": 1, "postsCollected": 1, "articlePagesEnriched": 1},
        "sources": [{"sourceName": "Test Source", "sourceId": "source-1",
                     "feedUrl": "https://example.org/feed.xml", "status": "succeeded",
                     "postsDiscovered": 2, "postsCollected": 1,
                     "articlePagesAttempted": 1, "articlePagesEnriched": 1,
                     "articlePagesFailed": 0}],
    })

    assert result["created"] is True
    assert result["postsReviewed"] == 1
    assert result["postsHeld"] == 1
    assert result["checksRecorded"] == 3
    assert output.is_file() and output.stat().st_size > 1000
    extracted = "\n".join(page.extract_text() or "" for page in PdfReader(str(output)).pages)
    assert "NOT PASSED - NO POSTS APPROVED" in extracted
    assert "I05-01" in extracted
    assert "C13-01" in extracted
    assert "C13-G01" in extracted
    assert "The source evidence is incomplete." in extracted
    assert "Feed-by-feed collection results" in extracted
    assert "Test Source" in extracted
    assert "DO NOT PRINT THIS RAW ARTICLE BODY" not in extracted


def test_pdf_supports_zero_posts_and_zero_checks(tmp_path):
    order = [f"s{i}" for i in range(1, 13)] + ["postEditorialFinalVerification"]
    sections = {key: {"section": i, "statistics": {}} for i, key in enumerate(order, 1)}
    sections["postEditorialFinalVerification"] = {
        "section": 13, "statistics": {"postsReceived": 0, "approvedForDatabase": 0, "held": 0},
        "posts": [],
    }
    report = {"viewId": "alien-world", "jobId": "empty-job", "checkerVersion": "2.1.1",
              "sectionOrder": order, "sections": sections, "posts": []}
    output = tmp_path / "empty-report.pdf"
    result = create_final_checker_pdf(report, output)
    assert result["postsReviewed"] == 0
    assert result["checksRecorded"] == 0
    assert PdfReader(str(output)).pages


def test_execution_failure_still_produces_a_clearly_labelled_failure_pdf(tmp_path):
    from checker_report_pdf import create_execution_failure_pdf

    output = tmp_path / "execution-failure.pdf"
    result = create_execution_failure_pdf(
        view_id="nature", output_path=output,
        error_type="Section13Error",
        message="Final Checker could not reconcile the Section 11 and 12 totals.",
    )
    assert result["created"] is True
    assert result["reportType"] == "execution-failure-diagnostic"
    extracted = "\n".join(page.extract_text() or "" for page in PdfReader(str(output)).pages)
    assert "RUN FAILED" in extracted
    assert "Section13Error" in extracted
    assert "could not reconcile" in extracted
    assert "No PASS decision is" in extracted and "implied." in extracted
